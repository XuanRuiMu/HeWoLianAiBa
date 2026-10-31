import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 档案详情, 军师记录, 计数, 生成 } = vi.hoisted(() => ({
  档案详情: vi.fn(),
  军师记录: vi.fn(async () => []),
  计数: vi.fn(),
  生成: vi.fn(),
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: vi.fn(async () => ({ release: () => undefined, query: vi.fn() })),
  },
}))
vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    status: 'ready',
  },
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
}))
vi.mock('../../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../../middleware/限流', () => ({
  changGuiXianLiu: (_qingQiu: unknown, _xiangYing: unknown, xiaYiBu: () => void) => xiaYiBu(),
}))
vi.mock('../../services/军师缓存', () => ({ huoQuJunShiJiLuLieBiao: 军师记录 }))
vi.mock('../../services/复盘', () => ({
  复盘状态: {
    生成中: 'sheng_cheng_zhong',
    已完成: 'yi_wan_cheng',
    无聊天记录: 'wu_liao_tian_ji_lu',
  },
  huoQuFuPanYouXiaoXiaoXiShu: 计数,
  shengChengFuPan: 生成,
}))
vi.mock('../../services/战绩', async () => {
  const yuan = await vi.importActual<typeof import('../../services/战绩')>('../../services/战绩')
  return { ...yuan, huoQuDangAnXiangQing: 档案详情 }
})

import luYou from '../战绩'

const YONG_HU = '11111111-1111-4111-8111-111111111111'
const JIAO_SE = '22222222-2222-4222-8222-222222222222'
const DANG_AN = '33333333-3333-4333-8333-333333333333'

function chuangJianYingYong() {
  const yingYong = express()
  yingYong.use(express.json())
  yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
    ;(qingQiu as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: YONG_HU }
    xiaYiBu()
  })
  yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  yingYong.use('/战绩', luYou)
  return yingYong
}

function zaoDangAn(fuGai: Record<string, unknown> = {}) {
  return {
    id: DANG_AN,
    yong_hu_id: YONG_HU,
    jiao_se_id: JIAO_SE,
    jiao_se_ming_zi: '小玄',
    tou_xiang_biao_ji: 'pu',
    jie_guo_lei_xing: '在一起了',
    jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
    shi_fou_feng_cun: true,
    liao_tian_tian_shu: 1,
    xiao_xi_zong_shu: 0,
    chuang_jian_shi_jian: '2026-10-28T12:00:00.000Z',
    zui_hou_xiao_xi_shi_jian: null,
    you_xi_jie_shu_shi_jian: '2026-10-28T12:00:00.000Z',
    category_id: '44444444-4444-4444-8444-444444444444',
    sort_order: 0,
    zui_hou_liang_tiao: [],
    fu_pan_shu_ju: [],
    fu_pan_nei_rong: null,
    fu_pan_pi_zhu: null,
    jun_shi_ji_lu: [],
    ...fuGai,
  }
}

beforeEach(() => {
  档案详情.mockReset()
  军师记录.mockReset()
  军师记录.mockResolvedValue([])
  计数.mockReset()
  生成.mockReset()
})

describe('GET /战绩/复盘/:dangAnId 空记录契约', () => {
  it('零有效消息时返回空状态，不调用生成、不返回旧缓存', async () => {
    计数.mockResolvedValue(0)
    档案详情.mockResolvedValue(
      zaoDangAn({
        fu_pan_nei_rong: '旧编造总结',
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '空聊天也会被点评', qing_gan: '消极' }],
      }),
    )

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DANG_AN}`)

    expect(xiangYing.status, JSON.stringify(xiangYing.body)).toBe(200)
    expect(xiangYing.body.shu_ju).toEqual({
      fu_pan_nei_rong: null,
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: null,
      jun_shi_zhi_dao_ji_lu: [],
      jia_zai_zhong: false,
      fu_pan_zhuang_tai: 'wu_liao_tian_ji_lu',
    })
    expect(计数).toHaveBeenCalledWith(YONG_HU, JIAO_SE)
    expect(生成).not.toHaveBeenCalled()
  })

  it('有有效消息且已有复盘时原样返回缓存', async () => {
    计数.mockResolvedValue(3)
    档案详情.mockResolvedValue(
      zaoDangAn({
        xiao_xi_zong_shu: 3,
        fu_pan_nei_rong: '用户表现：节奏稳',
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '开场自然', qing_gan: '积极' }],
      }),
    )

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DANG_AN}`)

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toBe('用户表现：节奏稳')
    expect(xiangYing.body.shu_ju.fu_pan_zhuang_tai).toBe('yi_wan_cheng')
    expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(false)
    expect(生成).not.toHaveBeenCalled()
  })

  it('历史消息已过保留期但档案记录过消息时，仍返回已生成复盘', async () => {
    计数.mockResolvedValue(0)
    档案详情.mockResolvedValue(
      zaoDangAn({
        xiao_xi_zong_shu: 12,
        fu_pan_nei_rong: '历史复盘：这段关系里你很真诚',
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '历史批注', qing_gan: '积极' }],
      }),
    )

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DANG_AN}`)

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toBe('历史复盘：这段关系里你很真诚')
    expect(xiangYing.body.shu_ju.fu_pan_zhuang_tai).toBe('yi_wan_cheng')
    expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(false)
    expect(生成).not.toHaveBeenCalled()
  })

  it('有有效消息且无复盘时进入生成态，状态字段明确', async () => {
    计数.mockResolvedValue(2)
    档案详情.mockResolvedValue(zaoDangAn())

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DANG_AN}`)

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toBeNull()
    expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(true)
    expect(xiangYing.body.shu_ju.fu_pan_zhuang_tai).toBe('sheng_cheng_zhong')
    expect(生成).toHaveBeenCalledTimes(1)
    expect(生成).toHaveBeenCalledWith(YONG_HU, JIAO_SE, DANG_AN)
  })
})
