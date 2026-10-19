import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 迁移目录安全守卫（P0 事故回归门）。
 *
 * 背景：自动迁移器（scripts/迁移器.ts 与镜像内 scripts/run_migration.js）会把
 * QianYi/migrations 下**所有未登记的 .sql** 按文件名顺序执行一遍，entrypoint.sh 在容器
 * 启动时无条件调用它。历史事故：034_自测提权_全部账号最高权限.sql 曾放在该目录，内容是
 * UPDATE "用户" SET "管理员"/"运营"/"审核员" = TRUE（全库提权）。它一旦在库中未登记时
 * 被 entrypoint 自动执行，全站授权体系即刻失效——管理中心的角色判定只读这三个旗标
 * （见 恋爱吧管理中心/管理后端/src/中间件/管理员.ts 的角色查库语句）。该文件已移出到
 * QianYi/手动脚本（禁止自动迁移）/，本用例把这条边界钉死。
 *
 * 判据只覆盖「自动执行后不可逆地改变授权或清空数据」的语句形态，不做通用 SQL 解析：
 *   - 权限旗标写入：任何把 用户 表的管理员/运营/审核员 三旗标置真或置假的语句；
 *   - TRUNCATE：全表清空，迁移链里没有合法用途；
 *   - DELETE FROM 不带 WHERE：整表删行，同样没有合法用途。
 * 刻意不拦 DROP TABLE / DROP TRIGGER / DROP INDEX：现有的 006/009 等已应用迁移有正当的
 * 死表与触发器清理，把这类语句一律拦下只会制造误报，反而让守卫被绕开或放宽。
 */

const 迁移目录 = resolve(__dirname, '..', '..', 'QianYi', 'migrations')
const 手动目录 = resolve(__dirname, '..', '..', 'QianYi', '手动脚本（禁止自动迁移）')
const 提权脚本文件名 = '034_自测提权_全部账号最高权限.sql'

/** 自动迁移目录内禁止出现的语句形态 */
const JIN_ZHI_YU_JU: ReadonlyArray<{ 名: string; 模式: RegExp }> = [
  {
    名: '用户权限旗标写入',
    模式: /UPDATE\s+"?用户"?[\s\S]{0,600}?"?(管理员|运营|审核员)"?\s*=/,
  },
  { 名: 'TRUNCATE 全表清空', 模式: /\bTRUNCATE\b/i },
  { 名: 'DELETE FROM 无 WHERE 限定', 模式: /\bDELETE\s+FROM\s+[\s\S]*?(?:;|$)/i },
]

/** 去掉 -- 行注释与 /* *\/ 块注释，避免注释里的示例语句造成误报 */
function 去注释(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((行) => {
      const 位置 = 行.indexOf('--')
      return 位置 === -1 ? 行 : 行.slice(0, 位置)
    })
    .join('\n')
}

/** 按分号切出独立语句，并剥掉其中引号内的字符串字面量 */
function 取语句(sql: string): string[] {
  return 去注释(sql)
    .split(';')
    .map((句) => 句.replace(/'[^']*'/g, "''").trim())
    .filter((句) => 句.length > 0)
}

function 迁移文件清单(): string[] {
  return readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql'))
    .sort()
}

describe('自动迁移目录安全守卫', () => {
  it('迁移目录存在且非空', () => {
    expect(迁移文件清单().length).toBeGreaterThan(0)
  })

  it('自动迁移目录内不得出现权限旗标写入、TRUNCATE 或无 WHERE 的整表删除', () => {
    const 违规: string[] = []
    for (const 文件名 of 迁移文件清单()) {
      for (const 语句 of 取语句(readFileSync(resolve(迁移目录, 文件名), 'utf8'))) {
        for (const { 名, 模式 } of JIN_ZHI_YU_JU) {
          if (!模式.test(语句)) continue
          if (名 === 'DELETE FROM 无 WHERE 限定' && /\bWHERE\b/i.test(语句)) continue
          违规.push(`${文件名} 命中[${名}]：${语句.replace(/\s+/g, ' ').slice(0, 120)}`)
        }
      }
    }
    expect(违规).toEqual([])
  })

  it('034 自测提权脚本必须留在手动目录，绝不允许回到自动迁移目录', () => {
    expect(迁移文件清单().filter((名) => 名.startsWith('034_'))).toEqual([])
    expect(existsSync(resolve(手动目录, 提权脚本文件名))).toBe(true)
  })

  it('提权脚本本身仍保留完整回退说明，移出手动目录不等于丢失回退路径', () => {
    const 正文 = readFileSync(resolve(手动目录, 提权脚本文件名), 'utf8')
    expect(正文).toContain('回退方法')
    expect(正文).toContain('严禁用于生产库')
    expect(正文).toMatch(/UPDATE\s+"用户"/)
  })
})
