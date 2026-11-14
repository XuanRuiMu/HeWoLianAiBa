import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { XiaoXiXinXi } from '../消息'

vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn() }))
vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({ jiao_se_id: 'j-1', wei_xin_ming: '糖糖' })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 400 })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))
vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn(async () => null) }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn() }))
vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => null),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => null),
  chuLiYouXiJieShu: vi.fn(),
}))
vi.mock('../系统表情', () => ({ faSongBiaoQingBaoXiaoXi: vi.fn() }))
vi.mock('../对话摘要', () => ({
  duQuTongBuZhaiYao: vi.fn(() => ''),
  duQuDuiHuaZhaiYao: vi.fn(async () => null),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(() => undefined),
}))
vi.mock('../头像生成', () => ({ changShiTouXiangYanHua: vi.fn(async () => undefined) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

import { AI回复调度器 } from '../AI回复调度器'
import { baoCunJiaoSeXiaoXi } from '../AI输入准备'
import { faSongBiaoQingBaoXiaoXi } from '../系统表情'
import { debug日志 } from '../../utils/debug日志'
import { BiaoQingBaoYunXing } from '../../config/表情包配置'
import { burstChangJianGeJiZhunHaoMiao } from '../../config/角色配置'

interface 发射记录 {
  shiJian: string
  fuZai: unknown
}

interface 调度器内部 {
  获取最新用户消息: () => Promise<string>
  等待间隔: (xinHao: AbortSignal) => Promise<void>
  等待贴纸后短间隔: (xinHao: AbortSignal) => Promise<void>
  已送达登记: Map<string, number>
  发送消息列表: (
    lieBiao: string[],
    xinHao: AbortSignal,
    lunCi: { 处理ID: number; 驱动消息ID: string | null },
    jieGuo: { ce_lue?: unknown },
  ) => Promise<void>
}

function 造文本消息(id: string, neiRong: string): XiaoXiXinXi {
  return {
    id,
    hui_hua_id: 'j-1',
    fa_song_zhe_id: 'j-1',
    fa_song_zhe_lei_xing: 'jiaose',
    ai_biao_shi: true,
    nei_rong: neiRong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: false,
  }
}

function 造图片消息(id: string, duanMing: string): XiaoXiXinXi {
  return {
    ...造文本消息(id, `[贴纸:${duanMing}]`),
    lei_xing: 'biaoQingBao',
    nei_rong_kuai: [
      { lei_xing: 'tupian', mei_ti_lei_bie: 'biaoqingshu', duan_ming: duanMing },
    ],
  } as XiaoXiXinXi
}

function 造调度器() {
  const 发射列表: 发射记录[] = []
  const emit = vi.fn((shiJian: string, fuZai: unknown) => {
    发射列表.push({ shiJian, fuZai })
  })
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  const dieDaiQi = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = dieDaiQi as unknown as 调度器内部
  内部.获取最新用户消息 = async () => ''
  内部.等待间隔 = async () => undefined
  内部.等待贴纸后短间隔 = async () => undefined
  const 推送序列 = (): string[] =>
    发射列表
      .filter((tiao) => tiao.shiJian === '角色回复')
      .flatMap((tiao) => (tiao.fuZai as { 消息列表: XiaoXiXinXi[] }).消息列表)
      .map((xiaoXi) => {
        const duanMing = String(xiaoXi.nei_rong_kuai?.[0]?.duan_ming ?? '')
        if (duanMing !== '') return `图:${duanMing}`
        return `文:${xiaoXi.nei_rong}`
      })
  const 运行 = (lieBiao: string[]): Promise<void> =>
    内部.发送消息列表(lieBiao, new AbortController().signal, { 处理ID: 0, 驱动消息ID: null }, {})
  return { 内部, 推送序列, 运行 }
}

beforeEach(() => {
  vi.clearAllMocks()
  let xuHao = 0
  vi.mocked(baoCunJiaoSeXiaoXi).mockImplementation(async (canShu: { nei_rong: string }) => {
    xuHao += 1
    return 造文本消息(`m-${xuHao}`, canShu.nei_rong)
  })
  vi.mocked(faSongBiaoQingBaoXiaoXi).mockImplementation(async (_yongHu: string, _jiaoSe: string, duanMing: string) =>
    造图片消息(`t-${duanMing}`, duanMing),
  )
})

describe('调度器按段发送贴纸', () => {
  it('一行里文字与贴纸交替时按原顺序分段发出，文字段不残留标记', async () => {
    const { 推送序列, 运行 } = 造调度器()

    await 运行(['无语[贴纸:熊猫头无语]我跟你说'])

    expect(推送序列()).toEqual(['文:无语', '图:熊猫头无语', '文:我跟你说'])
    expect(vi.mocked(baoCunJiaoSeXiaoXi).mock.calls.map(([canShu]) => (canShu as { nei_rong: string }).nei_rong)).toEqual([
      '无语',
      '我跟你说',
    ])
    expect(vi.mocked(faSongBiaoQingBaoXiaoXi).mock.calls.map(([, , duanMing]) => duanMing)).toEqual(['熊猫头无语'])
    for (const [canShu] of vi.mocked(baoCunJiaoSeXiaoXi).mock.calls) {
      const wenBen = (canShu as { nei_rong: string }).nei_rong
      expect(wenBen).not.toContain('贴纸')
      expect(wenBen).not.toContain('[')
      expect(wenBen).not.toContain(']')
    }
  })

  it('纯贴纸一行只发一张图，不落文字', async () => {
    const { 推送序列, 运行 } = 造调度器()

    await 运行(['[贴纸:狗头]'])

    expect(推送序列()).toEqual(['图:狗头'])
    expect(baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
  })

  it('超过每轮上限的图段被丢弃，后续文字段照常发出', async () => {
    const { 推送序列, 运行 } = 造调度器()
    const shangXian = BiaoQingBaoYunXing.zuiDaMeiLunZhangShu
    const tieZhi = Array.from({ length: shangXian + 1 }, (_, xu) => `[贴纸:图${xu + 1}]`).join('')

    await 运行([`${tieZhi}收尾话`])

    expect(vi.mocked(faSongBiaoQingBaoXiaoXi).mock.calls).toHaveLength(shangXian)
    const 序列 = 推送序列()
    expect(序列.filter((xiang) => xiang.startsWith('图:'))).toHaveLength(shangXian)
    expect(序列[序列.length - 1]).toBe('文:收尾话')
    expect(
      vi.mocked(debug日志.warn).mock.calls.some(([, xiaoXi]) => String(xiaoXi).includes('上限')),
    ).toBe(true)
  })

  it('图段发送失败时只丢这一段，后续文字段照常发出', async () => {
    const { 推送序列, 运行 } = 造调度器()
    vi.mocked(faSongBiaoQingBaoXiaoXi).mockResolvedValue(null)

    await 运行(['无语[贴纸:熊猫头无语]我跟你说'])

    expect(推送序列()).toEqual(['文:无语', '文:我跟你说'])
    expect(faSongBiaoQingBaoXiaoXi).toHaveBeenCalledTimes(1)
  })

  it('图段与紧随其后的下一段之间走短间隔，其余段走普通间隔', async () => {
    const { 内部, 运行 } = 造调度器()
    const 间隔序列: string[] = []
    内部.等待间隔 = async () => {
      间隔序列.push('普通')
    }
    内部.等待贴纸后短间隔 = async () => {
      间隔序列.push('短')
    }

    await 运行(['无语[贴纸:熊猫头无语]我跟你说'])

    expect(间隔序列).toEqual(['普通', '短'])
    expect(BiaoQingBaoYunXing.tieZhiHouDuanJianGe.jiZhun).toBeLessThan(burstChangJianGeJiZhunHaoMiao.E)
  })

  it('同一文字段重复出现时按去重丢弃，图段不参与文本去重', async () => {
    const { 内部, 推送序列, 运行 } = 造调度器()

    await 运行(['收到', '收到'])
    expect(推送序列()).toEqual(['文:收到'])
    expect([...内部.已送达登记.keys()]).toEqual(['收到'])

    const 第二轮 = 造调度器()
    await 第二轮.运行(['[贴纸:狗头]'])
    expect(第二轮.推送序列()).toEqual(['图:狗头'])
    expect([...第二轮.内部.已送达登记.keys()]).toEqual([])
  })
})
