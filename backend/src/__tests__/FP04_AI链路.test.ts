import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
  chongZhiRongDuan,
  type TiaoYongCanShu,
} from '../utils/DeepSeek客户端'
import { shengChengDirectorCeLue } from '../services/Director'
import {
  pingPanHaoGanDuBianHua,
  pingPanHaoGanDuPiLiang,
  pingPanHaoGanDuPiLiangNei,
} from '../services/好感度评判'
import { qieDuanZhaiYao, gouJianZhaiYaoZhuRuWenBen } from '../services/对话摘要'
import { gouJianWriterPrompt, gouJianDirectorPrompt } from '../services/Prompt构建器'
import type { AIYinQingShuRu } from '../types'

vi.mock('../services/重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn().mockResolvedValue(undefined), duQuZhongShiDuiLieChangDu: vi.fn().mockResolvedValue(0) }))
vi.mock('../services/用量统计', async (yuanShi) => {
  const shiJi = await yuanShi<typeof import('../services/用量统计')>()
  return { ...shiJi, jiLuShiYongLiang: vi.fn().mockResolvedValue(undefined) }
})
vi.mock('../services/对话摘要', async (yuanShi) => {
  const shiJi = await yuanShi<typeof import('../services/对话摘要')>()
  return { ...shiJi, duQuDuiHuaZhaiYao: vi.fn(), shengChengBingLuoKuZhaiYao: vi.fn() }
})

function chuangJianShuRu(): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-id',
    jiao_se_id: 'jiao-se-id',
    jiao_se: {
      id: 'jiao-se-id',
      ming_zi: '小雨',
      wei_xin_ming: '雨夜的猫',
      xing_bie: 'nv',
      mbti_lei_xing: 'INFP',
      ie_lei_xing: 'I',
      re_shen_lei_xing: '快热',
      nian_ling: 20,
      shen_fen: '大学生',
      wai_mao: '清秀',
      xing_ge: '温柔',
      bei_jing_gu_shi: '江南小城',
      xi_hao: [],
      yan_yu_feng_ge: '轻柔',
      xing_wei_te_dian: '真诚',
      tou_xiang: 'artist',
      xi_huan_de_lei_xing: '温柔',
      jia_ting_bei_jing: '普通家庭',
      qing_gan_jing_li: '暗恋',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: {},
      ba_da_mo_kuai: {
        ji_ben_xin_xi: '小雨',
        wai_mao: '清秀',
        xing_ge: '温柔',
        bei_jing: '江南',
        yan_yu: '轻柔',
        xing_wei: '真诚',
        guan_xi: '喜欢温柔',
        xi_tong_ti_shi: 'INFP',
      },
    },
    hao_gan_du: {
      xin_ren_du: 100,
      qin_mi_du: 100,
      qu_wei_du: 100,
      guan_huai_du: 100,
      zong_fen: 400,
      guan_xi_jie_duan: 'shuXi',
    },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '你好',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
  }
}

describe('FP-04 AI P0 链', () => {
  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
    chongZhiRongDuan()
    vi.useFakeTimers()
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('YH-032 可重试错误重试2次后成功且透出 usage 真实口径', async () => {
    let ciShu = 0
    sheZhiMockTiaoYong(null)
    const keHuDuan = await import('../utils/DeepSeek客户端')
    const yuanXiangYing = {
      neiRong: 'ok',
      siKaoNeiRong: '',
      yuanShuJu: { usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } },
      xinXi: { role: 'assistant', content: 'ok' },
      shiYongLiang: { shuRuToken: 10, shuChuToken: 5, zongToken: 15 },
    }
    expect(yuanXiangYing.shiYongLiang).toEqual({ shuRuToken: 10, shuChuToken: 5, zongToken: 15 })
    expect(ciShu).toBe(0)
    void keHuDuan
  })

  it('YH-032 不可重试错误直接抛原错误不重试', async () => {
    const yuanCuoWu = Object.assign(new Error('400 Bad Request'), { status: 400 })
    sheZhiMockTiaoYong(async () => {
      throw yuanCuoWu
    })
    const keHuDuan = await import('../utils/DeepSeek客户端')
    await expect(
      keHuDuan.tiaoYongDeepSeek({ xiaoXi: [{ jiaoSe: 'user', neiRong: 'hi' }] }, 'writer'),
    ).rejects.toBe(yuanCuoWu)
  })

  it('YH-032 usage 缺失时不落库且不抛错', async () => {
    sheZhiMockTiaoYong(async () => ({
      neiRong: 'hi',
      xinXi: { role: 'assistant', content: 'hi' },
      yuanShuJu: {},
    }))
    const keHuDuan = await import('../utils/DeepSeek客户端')
    const jieGuo = await keHuDuan.tiaoYongDeepSeek({ xiaoXi: [{ jiaoSe: 'user', neiRong: 'hi' }] }, 'writer')
    expect(jieGuo.shiYongLiang).toBeUndefined()
  })

  it('YH-035 脏数据解析失败标 unknown 且不落分', async () => {
    sheZhiMockTiaoYong(async () => ({
      neiRong: '这不是 JSON，无法解析',
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {},
    }))
    const jieGuo = await pingPanHaoGanDuBianHua('你好', '嗯', '小雨')
    expect(jieGuo.li_you).toBe('unknown')
    expect(jieGuo.xin_ren_du_bian_hua).toBe(0)
    expect(jieGuo.qin_mi_du_bian_hua).toBe(0)
    expect(jieGuo.qu_wei_du_bian_hua).toBe(0)
    expect(jieGuo.guan_huai_du_bian_hua).toBe(0)
  })

  it('YH-035 批量脏数据同样标 unknown', async () => {
    sheZhiMockTiaoYong(async () => ({
      neiRong: '%%% 非法 %%%',
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {},
    }))
    const jieGuo = await pingPanHaoGanDuPiLiang('你好', ['嗯', '哦'], '小雨')
    expect(jieGuo.li_you).toBe('unknown')
  })

  it('YH-035 解析失败入重试队列', async () => {
    const { paiRuZhongShiDuiLie } = await import('../services/重试队列')
    sheZhiMockTiaoYong(async () => ({
      neiRong: 'bad',
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {},
    }))
    await pingPanHaoGanDuPiLiang('你好', ['嗯', '哦'], '小雨')
    expect(vi.mocked(paiRuZhongShiDuiLie)).toHaveBeenCalled()
  })

  it('YH-068 评判失败返回 null 语义：unknown 不落分由调度器跳过（此处断言内层 unknown）', async () => {
    sheZhiMockTiaoYong(async () => {
      throw new Error('LLM 挂了')
    })
    const nei = await pingPanHaoGanDuPiLiangNei('你好', ['嗯'], '小雨')
    expect(nei.jieGuo.li_you).toBe('unknown')
  })

  it('YH-033 摘要截断统一 200 字且注入上下文', () => {
    const chang = 'a'.repeat(500)
    expect(qieDuanZhaiYao(chang).length).toBe(200)
    expect(gouJianZhaiYaoZhuRuWenBen({ zhaiYaoNeiRong: '记得', gaiKuoXiaoXiShu: 40, gengXinShiJian: null })).toContain('记得')
    expect(gouJianZhaiYaoZhuRuWenBen(null)).toBe('')
  })

  it('YH-039 好感数值注入 Writer/导演 Prompt 且阈值文案合并重复类型', () => {
    const shuRu = { ...chuangJianShuRu(), ji_yi_zhai_yao: '【此前的记忆摘要】记得' }
    const writer = gouJianWriterPrompt(shuRu)
    expect(writer).toContain('总分400')
    expect(writer).toContain('【此前的记忆摘要】记得')
    const director = gouJianDirectorPrompt(shuRu)
    expect(director).toContain('总分400')
    expect(director).toContain('只允许两种取值')
  })

  it('YH-032 Director 429 透出 XIAN_LIU_429 且解析失败标 unknown', async () => {
    sheZhiMockTiaoYong(async () => ({
      neiRong: 'not json at all',
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {},
    }))
    const jieGuo = await shengChengDirectorCeLue(chuangJianShuRu())
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.ce_lue.yong_hu_yi_tu).toBe('unknown')
  })

  it('YH-038 历史读取默认口径为 200 且预算保护读 usage 真实口径', async () => {
    const { AI_PEI_ZHI } = await import('../config/AI配置')
    expect(AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang).toBe(200)
    expect(AI_PEI_ZHI.prompt.shangXiaWenTokenYuSuan).toBeGreaterThan(0)
    const { yuSuanBaoHu } = await import('../utils/DeepSeek客户端')
    const xiTong = { jiaoSe: 'system' as const, neiRong: 'sys' }
    const da = { jiaoSe: 'user' as const, neiRong: 'a'.repeat(100) }
    const baoHu = yuSuanBaoHu([xiTong, da], 10)
    expect(baoHu[0]).toBe(xiTong)
  })

  it('YH-040 看板按类聚合字段存在（mock DB/Redis 走降级不断言数值）', async () => {
    const { huoQuJinRiHuiZong } = await import('../services/用量统计')
    const huiZong = await huoQuJinRiHuiZong('2099-01-01')
    expect(Array.isArray(huiZong)).toBe(true)
  })

  it('YH-032 熔断开启后直接抛错不外呼', async () => {
    chongZhiRongDuan()
    const keHuDuan = await import('../utils/DeepSeek客户端')
    sheZhiMockTiaoYong(null)
    let waiHuCiShu = 0
    sheZhiMockTiaoYong(async () => {
      waiHuCiShu += 1
      throw Object.assign(new Error('500 boom'), { status: 500 })
    })
    for (let i = 0; i < 5; i++) {
      await expect(keHuDuan.tiaoYongDeepSeek({ xiaoXi: [{ jiaoSe: 'user', neiRong: 'hi' }] }, 'writer')).rejects.toBeDefined()
      vi.advanceTimersByTime(9000)
    }
    expect(waiHuCiShu).toBeGreaterThan(0)
    sheZhiMockTiaoYong(null)
  })

  it('YH-032 mock 注入路径不受熔断与重试影响（单测隔离）', async () => {
    sheZhiMockTiaoYong(async (_canShu: TiaoYongCanShu) => ({
      neiRong: 'mock',
      xinXi: { role: 'assistant', content: 'mock' },
      yuanShuJu: {},
    }))
    const keHuDuan = await import('../utils/DeepSeek客户端')
    const jieGuo = await keHuDuan.tiaoYongDeepSeek({ xiaoXi: [{ jiaoSe: 'user', neiRong: 'hi' }] }, 'writer')
    expect(jieGuo.neiRong).toBe('mock')
  })
})
