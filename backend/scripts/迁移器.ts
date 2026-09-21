import { readFileSync, readdirSync } from 'fs'
import { resolve, extname } from 'path'
import { createHash } from 'crypto'
import { 数据库 } from '../src/数据库'

export interface 迁移结果 {
  已执行: number
  已跳过: number
  错误?: string
}

export type 校验和差异类型 = '一致' | '仅行尾' | '内容变更' | '未登记'

export interface 台账比对条目 {
  版本: string
  文件名: string
  台账校验和: string | null
  当前校验和: string
  差异: 校验和差异类型
}

interface 最小客户端 {
  query(语句: string, 参数?: unknown[]): Promise<unknown>
  release(): void
}

interface 最小数据库 {
  query(语句: string, 参数?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
  connect(): Promise<最小客户端>
}

/**
 * 台账校验和唯一口径（FP-15）：行尾先归一为 LF、再 trim、再取 sha256。
 * 归一使同一份内容在 Windows(CRLF)/Linux(LF)/镜像检出下算出同一个值；
 * 内容级改动仍必然改变哈希，校验和的防护语义不因此削弱。
 * scripts/run_migration.js 内有一份等价实现（镜像只 COPY 那一个文件），
 * 两者由 scripts/__tests__/迁移台账校验和.test.ts 的 parity 用例把守。
 */
export function 计算迁移校验和(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n?/g, '\n').trim()).digest('hex')
}

/**
 * 旧口径（按检出字节直算，行尾参与哈希）的两个可能值。
 * 只用于把台账差异分类成「仅行尾」还是「内容变更」，不参与新口径哈希。
 */
function 检出字节校验和(sql: string): string {
  return createHash('sha256').update(sql.trim()).digest('hex')
}

function 行尾变体校验和(sql: string): string {
  const 另一种行尾 = /\r/.test(sql) ? sql.replace(/\r\n?/g, '\n') : sql.replace(/\n/g, '\r\n')
  return 检出字节校验和(另一种行尾)
}

export function 比对台账校验和(
  文件清单: Array<{ 版本: string; 文件名: string; 内容: string }>,
  台账: Map<string, string>,
): 台账比对条目[] {
  return 文件清单.map((文件) => {
    const 当前校验和 = 计算迁移校验和(文件.内容)
    const 台账校验和 = 台账.get(文件.版本) ?? null
    let 差异: 校验和差异类型
    if (台账校验和 === null) 差异 = '未登记'
    else if (台账校验和 === 当前校验和) 差异 = '一致'
    else if (台账校验和 === 行尾变体校验和(文件.内容)) 差异 = '仅行尾'
    else 差异 = '内容变更'
    return { 版本: 文件.版本, 文件名: 文件.文件名, 台账校验和, 当前校验和, 差异 }
  })
}

export class 迁移器 {
  private 迁移目录: string
  private 库: 最小数据库

  constructor(迁移目录: string, 库: 最小数据库 = 数据库 as unknown as 最小数据库) {
    this.迁移目录 = 迁移目录
    this.库 = 库
  }

  private 获取迁移文件列表(): string[] {
    const 文件列表 = readdirSync(this.迁移目录)
      .filter(文件 => extname(文件) === '.sql')
      .sort()
    return 文件列表
  }

  private 读取迁移文件清单(): Array<{ 版本: string; 文件名: string; 内容: string }> {
    return this.获取迁移文件列表().map(文件名 => ({
      版本: 文件名.split('_')[0],
      文件名,
      内容: readFileSync(resolve(this.迁移目录, 文件名), 'utf-8'),
    }))
  }

  private async 确保版本表存在(): Promise<void> {
    await this.库.query(`
      CREATE TABLE IF NOT EXISTS "schema_migrations" (
        version VARCHAR PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum VARCHAR NOT NULL
      )
    `)
  }

  private async 获取已执行版本(): Promise<Map<string, string>> {
    const 结果 = await this.库.query(`SELECT version, checksum FROM "schema_migrations"`)
    const 已执行 = new Map<string, string>()
    for (const 行 of 结果.rows) {
      已执行.set(String(行.version), String(行.checksum))
    }
    return 已执行
  }

  async 比对台账(): Promise<台账比对条目[]> {
    await this.确保版本表存在()
    return 比对台账校验和(this.读取迁移文件清单(), await this.获取已执行版本())
  }

  /**
   * 一次性 re-baseline：把台账里已登记版本的 checksum 重算为"当前文件字节"的归一哈希。
   * 四条硬边界：① 只 UPDATE 已在台账里的版本，绝不 INSERT —— 未登记的迁移仍必须由 执行()
   * 真跑一遍才能进台账，否则就成了"绕过迁移"的后门；② 默认 dry-run 只出 diff，
   * 必须显式 应用=true 才写库；③ 写入包在单事务 + advisory 锁里，要么全改要么全不改，
   * 不留半套台账；④ 启动路径（entrypoint/CI）永不带这两个开关。
   */
  async 重新登记校验和(应用: boolean): Promise<{ 条目: 台账比对条目[]; 已更新: number }> {
    const 条目 = await this.比对台账()
    if (!应用) return { 条目, 已更新: 0 }

    const 待更新 = 条目.filter(项 => 项.台账校验和 !== null && 项.差异 !== '一致')
    if (待更新.length === 0) return { 条目, 已更新: 0 }

    const 客户端 = await this.库.connect()
    try {
      await 客户端.query('BEGIN')
      await 客户端.query(`SELECT pg_advisory_xact_lock(987654321)`)
      for (const 项 of 待更新) {
        await 客户端.query(
          `UPDATE "schema_migrations" SET checksum = $1 WHERE version = $2`,
          [项.当前校验和, 项.版本],
        )
      }
      await 客户端.query('COMMIT')
    } catch (错误) {
      await 客户端.query('ROLLBACK')
      throw new Error(`re-baseline 写入失败（台账未变更）: ${错误 instanceof Error ? 错误.message : String(错误)}`)
    } finally {
      客户端.release()
    }
    return { 条目, 已更新: 待更新.length }
  }

  async 执行(): Promise<迁移结果> {
    await this.确保版本表存在()

    const 文件清单 = this.读取迁移文件清单()
    const 已执行版本 = await this.获取已执行版本()

    let 已执行计数 = 0
    let 已跳过计数 = 0

    for (const 文件 of 文件清单) {
      const { 版本, 内容 } = 文件
      const 校验和 = 计算迁移校验和(内容)

      const 已存在校验和 = 已执行版本.get(版本)

      if (已存在校验和) {
        if (已存在校验和 !== 校验和) {
          throw new Error(
            `迁移 ${版本} 校验和不匹配：数据库记录 ${已存在校验和}，文件当前 ${校验和}。` +
            `已应用的迁移内容被改动过；确认无误后才可由运维显式执行 run_migration --rebaseline --apply 重新登记`,
          )
        }
        已跳过计数++
        continue
      }

      const 客户端 = await this.库.connect()
      try {
        await 客户端.query('BEGIN')
        // YH-132 迁移并发加锁：多副本同时up建表打架收敛为advisory锁串行
        await 客户端.query(`SELECT pg_advisory_xact_lock(987654321)`)
        await 客户端.query(内容)
        await 客户端.query(
          `INSERT INTO "schema_migrations" (version, checksum) VALUES ($1, $2)`,
          [版本, 校验和],
        )
        await 客户端.query('COMMIT')
        已执行计数++
      } catch (错误) {
        await 客户端.query('ROLLBACK')
        throw new Error(`迁移 ${版本} 执行失败: ${错误 instanceof Error ? 错误.message : String(错误)}`)
      } finally {
        客户端.release()
      }
    }

    return { 已执行: 已执行计数, 已跳过: 已跳过计数 }
  }
}

export async function 运行迁移(迁移目录?: string): Promise<迁移结果> {
  const 目录 = 迁移目录 || resolve(__dirname, '../database/migrations')
  const 迁移器实例 = new 迁移器(目录)
  return 迁移器实例.执行()
}
