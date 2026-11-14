import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIYinQingShuRu } from '../../types'

vi.mock('../Director', () => ({
  shengChengDirectorCeLue: vi.fn(async () => ({
    cheng_gong: true,
    ce_lue: {
      yong_hu_yi_tu: '闲聊',
      qing_gan_fen_xi: '平静',
      hui_fu_ce_lue: '接话',
      shi_fou_hui_fu: true,
      hui_fu_tiao_shu: 1,
      shi_jian_qing_xu: '平静',
      shi_fou_che_hui: false,
      shi_fou_zhu_dong_biao_bai: false,
      biao_qing_yi_tu: null,
    },
  })),
}))

vi.mock('../Writer', () => ({ shengChengWriterHuiFu: vi.fn() }))

vi.mock('../通用知识检索', () => ({
  检索通用知识: vi.fn(() => ({ mingZhong: [], wenBen: '' })),
  提取必答事实: vi.fn(() => null),
  构建通用知识层: vi.fn(() => ''),
}))

vi.mock('../../redis', () => ({
  redis: {
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    set: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
  },
}))

vi.mock('../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

import { yunXingAIYinQing } from '../AI引擎'
import { shengChengWriterHuiFu } from '../Writer'
import { peiZhi } from '../../config'

const MinGanCi = peiZhi.shuChuWeiJinCiLieBiao[0] || '自杀教程'

function 造输入(): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: { jiao_se_id: 'j-1', wei_xin_ming: '糖糖', bei_jing_gu_shi: '', xing_wei_te_dian: '' },
    hao_gan_du: {
      xin_ren_du: 40,
      qin_mi_du: 40,
      qu_wei_du: 40,
      guan_huai_du: 40,
      zong_fen: 400,
      guan_xi_jie_duan: 'reLian',
    },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '在吗',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
  } as unknown as AIYinQingShuRu
}

function 设定写手输出(lieBiao: string[]): void {
  vi.mocked(shengChengWriterHuiFu).mockResolvedValue({
    xiao_xi_lie_biao: lieBiao,
    yuan_wen: lieBiao.join('\n'),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('违禁词兜底不误伤贴纸标记', () => {
  it('敏感字只出现在贴纸短名里时不再拦掉整轮回复', async () => {
    设定写手输出([`原来[贴纸:熊猫头${MinGanCi}]是这样`])

    const jieGuo = await yunXingAIYinQing(造输入())

    expect(jieGuo.shi_fou_hui_fu).toBe(true)
    expect(jieGuo.xiao_xi_lie_biao).toEqual([`原来[贴纸:熊猫头${MinGanCi}]是这样`])
  })

  it('正文里真的出现违禁词时仍然整轮拦截', async () => {
    设定写手输出([`这里有${MinGanCi}的完整步骤`])

    const jieGuo = await yunXingAIYinQing(造输入())

    expect(jieGuo.shi_fou_hui_fu).toBe(false)
    expect(jieGuo.xiao_xi_lie_biao).toEqual([])
  })
})
