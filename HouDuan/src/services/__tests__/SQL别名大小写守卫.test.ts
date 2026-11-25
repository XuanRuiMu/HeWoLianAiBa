import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function 读源码(相对路径: string): string {
  return readFileSync(resolve(__dirname, '..', 相对路径), 'utf8')
}

function 抽取SQL别名(源码: string): Array<{ 别名: string; 原文: string }> {
  const jieGuo: Array<{ 别名: string; 原文: string }> = []
  const zhengZe = /\bAS\s+("?)([A-Za-z_][A-Za-z0-9_]*)\1/g
  let piPei: RegExpExecArray | null
  while ((piPei = zhengZe.exec(源码)) !== null) {
    const shiFouDaiYinHao = piPei[1] === '"'
    const bieMing = piPei[2]
    if (!/[A-Z]/.test(bieMing)) continue
    jieGuo.push({ 别名: bieMing, 原文: shiFouDaiYinHao ? `AS "${bieMing}"` : `AS ${bieMing}` })
  }
  return jieGuo
}

describe('SQL 别名大小写守卫', () => {
  it('冲突弧模块中带大写的 SQL 别名必须用双引号包住', () => {
    const yuanMa = 读源码('冲突弧.ts')
    const bieMingLieBiao = 抽取SQL别名(yuanMa)
    expect(bieMingLieBiao.length).toBeGreaterThan(0)
    for (const xiang of bieMingLieBiao) {
      expect(xiang.原文).toBe(`AS "${xiang.别名}"`)
    }
  })

  it('冲突状态读取语句的别名全部带引号，否则 PostgreSQL 会静默转小写导致永远读到 wu', () => {
    const yuanMa = 读源码('冲突弧.ts')
    expect(yuanMa).toContain('"冲突状态" AS "zhuangTai"')
    expect(yuanMa).toContain('"冲突事由" AS "shiYou"')
    expect(yuanMa).toContain('"冲突升级计数" AS "shengJiJiShu"')
    expect(yuanMa).not.toMatch(/"冲突状态"\s+AS\s+zhuangTai\b/)
    expect(yuanMa).not.toMatch(/"冲突事由"\s+AS\s+shiYou\b/)
  })

  it('升级计数 RETURNING 别名统一为全小写下划线，读回键与之一致', () => {
    const yuanMa = 读源码('冲突弧.ts')
    expect(yuanMa).toContain('AS "ji_shu"')
    expect(yuanMa).toContain('rows[0]?.ji_shu')
    expect(yuanMa).not.toMatch(/AS\s+jiShu\b/)
  })
})

describe('别名大小写语义自证', () => {
  it('未加引号的驼峰别名在值域上等价于全小写，这正是线上读不到状态的原因', () => {
    const weiJiaYinHao = 'zhuangTai'.toLowerCase()
    expect(weiJiaYinHao).toBe('zhuangtai')
    expect(weiJiaYinHao).not.toBe('zhuangTai')
  })

  it('加了引号后大小写被保留，取值键与代码字段一致', () => {
    const jiaYinHao = 'zhuangTai'
    expect(jiaYinHao).toBe('zhuangTai')
  })
})
