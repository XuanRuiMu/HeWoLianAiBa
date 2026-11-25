import { describe, expect, it } from 'vitest'
import { gouZaoHuiXiangChaXun } from '../历史回想'

function quBianHao(yuJu: string): number[] {
  return [...yuJu.matchAll(/\$(\d+)/g)].map((piPei) => Number(piPei[1]))
}

describe('历史回想检索语句（FP-F 契约）', () => {
  it('用户与角色条件固定为 $1/$2，不硬编码已撤回过滤', () => {
    const { yuJu } = gouZaoHuiXiangChaXun('u-1', 'j-1', ['火锅', '麻辣'])
    expect(yuJu).toContain('"用户ID" = $1')
    expect(yuJu).toContain('"角色ID" = $2')
    expect(yuJu).not.toMatch(/已撤回\s*=\s*false/i)
    expect(yuJu).not.toContain('$3 = ')
  })

  it('每个关键词各占一个参数位且不重复；最后一个参数是返回上限', () => {
    const ciZu = ['火锅', '麻辣', '喜欢']
    const { yuJu, canShu } = gouZaoHuiXiangChaXun('u-1', 'j-1', ciZu)

    for (const [xuHao, ci] of ciZu.entries()) {
      const zhanWei = xuHao + 3
      const ciShu = (yuJu.match(new RegExp(`ILIKE \\$${zhanWei}\\b`, 'g')) || []).length
      expect(ciShu, `关键词${ci}应使用参数$${zhanWei}，并在过滤与评分中各用2次`).toBe(4)
    }
    const zuiDaBianHao = Math.max(...quBianHao(yuJu))
    expect(canShu).toHaveLength(zuiDaBianHao)
    expect(canShu[0]).toBe('u-1')
    expect(canShu[1]).toBe('j-1')
    expect(canShu.slice(2, 2 + ciZu.length)).toEqual(ciZu.map((ci) => `%${ci}%`))
  })

  it('每关键词都进入条件，临时位次与最终条数是连续编号的整数参数', () => {
    const { yuJu, canShu } = gouZaoHuiXiangChaXun('u-1', 'j-1', ['火锅', '麻辣'])
    const bianHao = quBianHao(yuJu)
    const zuiDa = Math.max(...bianHao)
    expect(canShu.length).toBe(zuiDa)
    const moLiang = canShu.slice(-2)
    expect(moLiang.every((zhi) => Number.isInteger(zhi))).toBe(true)
  })

  it('无关键词时退化为只用用户角色条件查最近，无游离占位符', () => {
    const { yuJu, canShu } = gouZaoHuiXiangChaXun('u-1', 'j-1', [])
    expect(canShu[0]).toBe('u-1')
    expect(canShu[1]).toBe('j-1')
    expect(canShu.slice(2).every((zhi) => Number.isInteger(zhi))).toBe(true)
    const zuiDa = Math.max(...quBianHao(yuJu))
    expect(canShu.length).toBe(zuiDa)
  })

  it('语句本身不含 5000 条硬上限， LIMIT 使用配置而非字面量', () => {
    const { yuJu } = gouZaoHuiXiangChaXun('u-1', 'j-1', ['周五', '海边'])
    expect(yuJu).not.toMatch(/LIMIT\s+5000\b/i)
    expect(yuJu).toMatch(/LIMIT\s+\$\d+/i)
  })
})
