import { describe, expect, it } from 'vitest'
import { HAO_YOU_YU_JU } from '../../routes/好友'

describe('好友消息分页语句', () => {
  it('更早消息用创建时间与 ID 的键集游标，且全部走参数占位', () => {
    const yuJu = HAO_YOU_YU_JU.查更早消息
    expect(yuJu).toContain('(m."创建时间", m."ID") < ($4::timestamptz, $5::uuid)')
    expect(yuJu).toContain('ORDER BY m."创建时间" DESC, m."ID" DESC')
    expect(yuJu).toContain('LIMIT $3')
    expect(yuJu).not.toMatch(/\$\{/)
  })

  it('首屏语句不带游标条件，仍取最新一页', () => {
    const yuJu = HAO_YOU_YU_JU.查消息列表
    expect(yuJu).not.toContain('you_biao')
    expect(yuJu).toContain('ORDER BY m."创建时间" DESC LIMIT $3')
  })

  it('两条语句的双方会话过滤条件一致', () => {
    const guoLü = (yuJu: string) =>
      /WHERE \(\(m\."发送者ID" = \$1 AND m\."接收者ID" = \$2\)\s+OR \(m\."发送者ID" = \$2 AND m\."接收者ID" = \$1\)\)/.test(
        yuJu,
      )
    expect(guoLü(HAO_YOU_YU_JU.查消息列表)).toBe(true)
    expect(guoLü(HAO_YOU_YU_JU.查更早消息)).toBe(true)
  })
})
