import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 结局枚举列表 } from '../../src/utils/结局'
import { fanYi } from '../../src/config/translations'

const 迁移目录 = resolve(__dirname, '..', '..', 'QianYi', 'migrations')

function 取出约束键(sql: string): string[] {
  const 位置 = sql.indexOf('ADD CONSTRAINT "ck_游戏结局_结果状态"')
  if (位置 === -1) return []
  const 段 = sql.slice(位置, sql.indexOf('))', 位置))
  return [...段.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
}

const 最新约束 = (): { 文件: string; 键: string[] } => {
  const 文件们 = readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql'))
    .sort()
  let 结果: { 文件: string; 键: string[] } = { 文件: '', 键: [] }
  for (const 名 of 文件们) {
    const 键 = 取出约束键(readFileSync(resolve(迁移目录, 名), 'utf8'))
    if (键.length > 0) 结果 = { 文件: 名, 键 }
  }
  return 结果
}

describe('结局键集合：四份真源必须全等', () => {
  it('数据库 CHECK 放行了每一个运行时结局键', () => {
    const { 文件, 键 } = 最新约束()
    expect(文件, '迁移目录里找不到 ck_游戏结局_结果状态 的定义').not.toBe('')
    expect([...键].sort(), 文件 + ' 与翻译表不一致').toEqual([...结局枚举列表].sort())
  })

  it('翻译标签覆盖每一个结局键（玩家看得到短标签）', () => {
    for (const 枚举 of 结局枚举列表) {
      expect(String(fanYi.jieJu[枚举] || '').trim(), 枚举).not.toBe('')
    }
  })

  it('趣味文案池给每一个结局键都备了至少三句（结算随机抽一句，抽不到就是空结局）', () => {
    const 池 = { ...fanYi.jieGuoTongGuanChi, ...fanYi.jieGuoShiBaiChi } as Record<string, string[]>
    for (const 枚举 of 结局枚举列表) {
      expect((池[枚举] || []).length, 枚举).toBeGreaterThanOrEqual(3)
    }
  })
})
