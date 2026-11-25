import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIYinQingShuRu, AIYinQingShuChu, DirectorCeLue } from '../../types'

const directorMock = vi.hoisted(() => vi.fn())
const writerMock = vi.hoisted(() => vi.fn())
const huiXiangMock = vi.hoisted(() => vi.fn())

vi.mock('../Director', () => ({
  shengChengDirectorCeLue: (...c: unknown[]) => directorMock(...c),
}))
vi.mock('../Writer', () => ({
  shengChengWriterHuiFu: (...c: unknown[]) => writerMock(...c),
}))
vi.mock('../历史回想', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../历史回想')>()
  return {
    ...shiJi,
    huiXiangLiShiYuanWen: (...c: unknown[]) => huiXiangMock(...c),
  }
})
vi.mock('../../redis', () => ({
  redis: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1), incr: vi.fn(async () => 1), expire: vi.fn(async () => 1) },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { yunXingAIYinQing } from '../AI引擎'

function zuZhuangShuRu(eWai: Partial<AIYinQingShuRu> = {}): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      id: 'j-1',
      ming_zi: '陈雨桐',
      wei_xin_ming: '小懒猫',
      xing_bie: 'nv',
      mbti_lei_xing: 'INFP',
      ie_lei_xing: 'I',
      re_shen_lei_xing: '慢热',
      nian_ling: 20,
      shen_fen: '大学生',
      wai_mao: '长发温柔',
      xing_ge: '安静内向',
      bei_jing_gu_shi: '来自杭州的大学生',
      xi_hao: ['阅读'],
      yan_yu_feng_ge: '轻声细语',
      xing_wei_te_dian: '',
      tou_xiang: '🌙',
      xi_huan_de_lei_xing: '温柔的人',
      jia_ting_bei_jing: '独生女',
      qing_gan_jing_li: '没谈过恋爱',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: { cheng_shi: '杭州' },
      ba_da_mo_kuai: {
        ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '',
      },
    },
    hao_gan_du: { xin_ren_du: 100, qin_mi_du: 100, qu_wei_du: 100, guan_huai_du: 100, zong_fen: 400, guan_xi_jie_duan: 'renShi' },
    dui_hua_li_shi: [
      { id: 'm-1', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '今天好累啊', shi_jian: '12:00', yi_che_hui: false },
    ],
    yong_hu_xin_xiao_xi: '今天好累啊',
    shi_fou_di_yi_lun: false,
    ...eWai,
  } as AIYinQingShuRu
}

function zaoCeLue(needRecall: boolean): DirectorCeLue & { need_recall?: boolean } {
  return {
    yong_hu_yi_tu: 'unknown',
    qing_gan_fen_xi: 'unknown',
    hui_fu_ce_lue: '轻轻接住',
    shi_fou_hui_fu: true,
    hui_fu_tiao_shu: 1,
    shi_jian_qing_xu: '平静',
    shi_fou_che_hui: false,
    ...(needRecall ? { need_recall: true } : {}),
  }
}

beforeEach(() => {
  directorMock.mockReset()
  writerMock.mockReset()
  huiXiangMock.mockReset()
})

describe('need_recall 强制历史回想（W3-E）', () => {
  it('need_recall=true 且正则未命中时强制检索一次，命中注入后 Writer 重答一轮', async () => {
    directorMock.mockResolvedValue({ cheng_gong: true, ce_lue: zaoCeLue(true), yuan_wen: '' })
    writerMock
      .mockResolvedValueOnce({ xiao_xi_lie_biao: ['第一次回复'], yuan_wen: '' })
      .mockResolvedValueOnce({ xiao_xi_lie_biao: ['回想后回复'], yuan_wen: '' })
    huiXiangMock.mockResolvedValue({
      zhaoDao: true,
      yuanWen: ['TA: 我们约好的那个周五去的地方是海边'],
      buZu: false,
      shuangFang: true,
      duanLuo: [],
    })

    const jieGuo = await yunXingAIYinQing(zuZhuangShuRu())

    expect(huiXiangMock).toHaveBeenCalledTimes(1)
    expect(huiXiangMock).toHaveBeenCalledWith('u-1', 'j-1', '今天好累啊')
    expect(writerMock).toHaveBeenCalledTimes(2)
    const chongDaShuRu = writerMock.mock.calls[1][0] as AIYinQingShuRu
    expect(chongDaShuRu.huiXiangTiShi).toContain('【历史回想】')
    expect(chongDaShuRu.huiXiangTiShi).toContain('我们约好的那个周五去的地方是海边')
    expect(chongDaShuRu.benLunYiHuiXiang).toBe(true)
    expect((jieGuo as AIYinQingShuChu).xiao_xi_lie_biao).toEqual(['回想后回复'])
  })

  it('need_recall=false 时不强制检索，维持单次回答', async () => {
    directorMock.mockResolvedValue({ cheng_gong: true, ce_lue: zaoCeLue(false), yuan_wen: '' })
    writerMock.mockResolvedValueOnce({ xiao_xi_lie_biao: ['普通回复'], yuan_wen: '' })

    await yunXingAIYinQing(zuZhuangShuRu())

    expect(huiXiangMock).not.toHaveBeenCalled()
    expect(writerMock).toHaveBeenCalledTimes(1)
  })

  it('轮内去重：正则快车道已检索过（benLunYiHuiXiang=true）时不重复检索', async () => {
    directorMock.mockResolvedValue({ cheng_gong: true, ce_lue: zaoCeLue(true), yuan_wen: '' })
    writerMock.mockResolvedValueOnce({ xiao_xi_lie_biao: ['已带回想的回复'], yuan_wen: '' })

    await yunXingAIYinQing(zuZhuangShuRu({ benLunYiHuiXiang: true }))

    expect(huiXiangMock).not.toHaveBeenCalled()
    expect(writerMock).toHaveBeenCalledTimes(1)
  })

  it('强制检索为空时维持第一次回答，不重答', async () => {
    directorMock.mockResolvedValue({ cheng_gong: true, ce_lue: zaoCeLue(true), yuan_wen: '' })
    writerMock.mockResolvedValueOnce({ xiao_xi_lie_biao: ['第一次回复'], yuan_wen: '' })
    huiXiangMock.mockResolvedValue({ zhaoDao: false, yuanWen: [], buZu: true, shuangFang: false, duanLuo: [] })

    const jieGuo = await yunXingAIYinQing(zuZhuangShuRu())

    expect(huiXiangMock).toHaveBeenCalledTimes(1)
    expect(writerMock).toHaveBeenCalledTimes(1)
    expect((jieGuo as AIYinQingShuChu).xiao_xi_lie_biao).toEqual(['第一次回复'])
  })
})
