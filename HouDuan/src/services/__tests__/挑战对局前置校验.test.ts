import { beforeEach, describe, expect, it, vi } from 'vitest'

const { chaXunMock, shunXu, jiaJiaoSe } = vi.hoisted(() => {
  const jiaJiaoSe = {
    id: '00000000-0000-4000-8000-000000000009',
    ming_zi: '内部名',
    wei_xin_ming: '微信名',
    xing_bie: 'nv',
    shi_fou_zha_xing: false,
    hao_gan_du_zong_fen: 0,
  }
  return { chaXunMock: vi.fn(), shunXu: [] as string[], jiaJiaoSe }
})

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (sql: unknown) => {
      const wen = String(sql)
      if (wen.includes('INSERT INTO')) shunXu.push('chaRu')
      else if (wen.includes('"挑战对局"')) shunXu.push('chaXunDuiJu')
      else shunXu.push('qiTa')
      return await chaXunMock()
    },
  },
}))

vi.mock('../角色生成', () => ({
  shengChengJiaoSe: vi.fn(() => {
    shunXu.push('shengCheng')
    return jiaJiaoSe
  }),
  baoCunJiaoSe: vi.fn(async () => {
    shunXu.push('baoCun')
  }),
  touYingWanJiaKeJianJiaoSe: vi.fn((jiaoSe: unknown) => jiaoSe),
}))

import { kaiShiTiaoZhan } from '../挑战积分'

beforeEach(() => {
  shunXu.length = 0
  chaXunMock.mockReset()
  chaXunMock.mockResolvedValue({ rows: [] as unknown[], rowCount: 0 })
})

describe('挑战开局先校验进行中对局再生成角色', () => {
  it('已有进行中对局直接409，不触发生成与落库', async () => {
    chaXunMock.mockResolvedValueOnce({ rows: [{ ID: 'd-1' }], rowCount: 1 })
    await expect(kaiShiTiaoZhan('u-1', 'nv', 'nan')).rejects.toMatchObject({ zhuang_tai_ma: 409 })
    expect(shunXu).toEqual(['chaXunDuiJu'])
  })

  it('无对局时先查询后生成，生成后才落库', async () => {
    chaXunMock.mockResolvedValueOnce({ rows: [], rowCount: 0 }).mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
    })
    const jieGuo = (await kaiShiTiaoZhan('u-1', 'nv', 'nan')) as unknown as Record<string, unknown>
    expect(jieGuo.id).toBe(jiaJiaoSe.id)
    expect(shunXu.indexOf('chaXunDuiJu')).toBeGreaterThanOrEqual(0)
    expect(shunXu.indexOf('chaXunDuiJu')).toBeLessThan(shunXu.indexOf('shengCheng'))
    expect(shunXu.indexOf('shengCheng')).toBeLessThan(shunXu.indexOf('baoCun'))
    expect(shunXu.indexOf('chaRu')).toBeGreaterThan(shunXu.indexOf('baoCun'))
  })

  it('唯一索引兜底23505仍转换为409', async () => {
    chaXunMock.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const chaRuCuoWu = Object.assign(new Error('duplicate key'), { code: '23505' })
    chaXunMock.mockRejectedValueOnce(chaRuCuoWu)
    await expect(kaiShiTiaoZhan('u-1', 'nv', 'nan')).rejects.toMatchObject({ zhuang_tai_ma: 409 })
  })
})
