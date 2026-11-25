import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 档案详情, 军师记录, 计数, 生成 } = vi.hoisted(() => ({
  档案详情: vi.fn(),
  军师记录: vi.fn(async () => []),
  计数: vi.fn(),
  生成: vi.fn(),
}))

const { 生成去重 } = vi.hoisted(() => ({ 生成去重: vi.fn() }))
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
    未生成: 'wei_sheng_cheng',
    生成失败: 'sheng_cheng_shi_bai',
  },
  huoQuFuPanYouXiaoXiaoXiShu: 计数,
    qiDongFuPanShengCheng: 生成去重,
  guoLvFuPanChuCan: (x: unknown) => x,
  huoQuFuPanShiBaiBiaoJi: () => null,
}))
vi.mock('../../services/战绩', async () => {
  const yuan = await vi.importActual<typeof import('../../services/战绩')>('../../services/战绩')
  return { ...yuan, huoQu档案详情: 档案详情 }
})

import luYou from '../战绩'

const YongHu = '11111111-1111-4111-8111-111111111111'
const JiaoSe = '22222222-2222-4222-8222-222222222222'
const DangAn = '33333333-3333-4333-8333-333333333333'

function chuangJianYingYong() {
  const yingYong = express()
  yingYong.use(express.json())
  yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
    ;(qingQiu as unknown as { yong_hu: { 用户ID: string } }).yong_hu = { 用户ID: YongHu }
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
    id: DangAn,
    yong_hu_id: YongHu,
    jiao_se_id: JiaoSe,
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
  生成去重.mockReset()
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

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DangAn}`)

    expect(xiangYing.status, JSON.stringify(xiangYing.body)).toBe(200)
    expect(xiangYing.body.shu_ju).toEqual({
      fu_pan_nei_rong: null,
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: null,
      fu_pan_duan: [],
      fu_pan_fen_zu: [],
      fu_pan_hai_you_geng_duo: false,
      fu_pan_zong_duan_shu: 0,
      legacy_pi_zhu: [],
      legacy_pi_zhu_ke_ding_wei: false,
      jun_shi_zhi_dao_ji_lu: [],
      jia_zai_zhong: false,
      fu_pan_zhuang_tai: 'wu_liao_tian_ji_lu',
    })
    expect(计数).toHaveBeenCalledWith(YongHu, JiaoSe)
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

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DangAn}`)

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

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DangAn}`)

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toBe('历史复盘：这段关系里你很真诚')
    expect(xiangYing.body.shu_ju.fu_pan_zhuang_tai).toBe('yi_wan_cheng')
    expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(false)
    expect(生成).not.toHaveBeenCalled()
  })

  it('有有效消息且无复盘时只读返回未生成，不产生模型调用或写库', async () => {
    计数.mockResolvedValue(2)
    档案详情.mockResolvedValue(zaoDangAn())

    const xiangYing = await request(chuangJianYingYong()).get(`/战绩/复盘/${DangAn}`)

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toBeNull()
    expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(false)
    expect(xiangYing.body.shu_ju.fu_pan_zhuang_tai).toBe('wei_sheng_cheng')
    expect(生成).not.toHaveBeenCalled()
    expect(生成去重).not.toHaveBeenCalled()
  })

  it('显式POST生成成功返回段映射', async () => {
    const jieGuo = {
      fu_pan_nei_rong: '用户表现：节奏稳',
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '开场自然', xiao_xi_ids: ['m-1'] }],
      fu_pan_duan: [{ xu_hao: 1, xiao_xi_ids: ['m-1'], pi_zhu: { xu_hao: 1, ping_lun: '开场自然', xiao_xi_ids: ['m-1'] } }],
      fu_pan_fen_zu: [{ id: 'zu-1', duan_lie_biao: [], mo_ren_zhan_kai: true }],
    }
    生成去重.mockResolvedValue(jieGuo)
    计数.mockResolvedValue(2)
    档案详情.mockResolvedValue(zaoDangAn())
    const yingYong = chuangJianYingYong()
    const diYi = await request(yingYong).post(`/战绩/复盘/${DangAn}/生成`)
    expect(diYi.body.shu_ju.fu_pan_zhuang_tai).toBe('yi_wan_cheng')
    expect(diYi.body.shu_ju.fu_pan_duan[0].xiao_xi_ids).toEqual(['m-1'])
    expect(生成去重).toHaveBeenCalledTimes(1)
  })

  it('空回包与解析失败形成明确失败终态，GET读取该状态也不触发模型', async () => {
    生成去重.mockResolvedValue(null)
    计数.mockResolvedValue(1)
    档案详情.mockResolvedValue(zaoDangAn())
    const yingYong = chuangJianYingYong()
    const jieGuo = await request(yingYong).post(`/战绩/复盘/${DangAn}/生成`)
    expect(jieGuo.body.shu_ju).toMatchObject({ jia_zai_zhong: false, fu_pan_zhuang_tai: 'sheng_cheng_shi_bai', fu_pan_nei_rong: null })
    档案详情.mockResolvedValue(zaoDangAn({ fu_pan_zhuang_tai: 'sheng_cheng_shi_bai', fu_pan_nei_rong: '用户表现：保留最后成功结果' }))
    const du = await request(yingYong).get(`/战绩/复盘/${DangAn}`)
    expect(du.body.shu_ju).toMatchObject({ jia_zai_zhong: false, fu_pan_zhuang_tai: 'sheng_cheng_shi_bai', fu_pan_nei_rong: '用户表现：保留最后成功结果' })
    expect(生成).not.toHaveBeenCalled()
  })
})
