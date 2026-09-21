import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../媒体存储', () => ({
  huoQuBenDiLuJing: (sha: string) => `mock://${sha}`,
}))
vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: async (路径: unknown) => Buffer.from(String(路径)),
    },
  },
}))
vi.mock('../../数据库', () => ({
  数据库: {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => undefined }),
  },
}))
vi.mock('../../redis', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn(), lpush: vi.fn(), ltrim: vi.fn(), lrange: vi.fn(), expireAt: vi.fn() },
}))
vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuJunShiQiuZhu: vi.fn(),
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))
vi.mock('../../config/AI参数策略', () => ({
  gouJianJiaoSeShangXiaWen: vi.fn(),
  jiSuanAIChanShu: vi.fn(),
}))
vi.mock('../AI输入准备', () => ({ huoQuAIJiaoSeXinXi: vi.fn(), baoCunJiaoSeXiaoXi: vi.fn() }))
vi.mock('../好感度', () => ({ huoQuWanZhengHaoGanDu: vi.fn(), gengXinHaoGanDu: vi.fn() }))
vi.mock('../消息', () => ({
  huoQuXiaoXiLieBiao: vi.fn(),
  huoQuJiaoSeSuoYouZhe: vi.fn(),
}))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn() }))
vi.mock('../军师缓存')

const 军师调用记录: Array<{ 配置键: string; 消息列表: Array<{ jiaoSe: string; neiRong: string }> }> = []
let 模型下一次响应: { neiRong?: string; 抛错?: boolean } = { neiRong: '' }

vi.mock('../../utils/DeepSeek客户端', () => ({
  genJuPeiZhiTiaoYong: async (
    配置键: string,
    消息列表: Array<{ jiaoSe: string; neiRong: string }>,
  ) => {
    军师调用记录.push({ 配置键, 消息列表 })
    if (模型下一次响应.抛错) {
      throw new Error('模拟外呼失败')
    }
    return {
      neiRong: 模型下一次响应.neiRong ?? '',
      siKaoNeiRong: '',
      yuanShuJu: {},
      xinXi: { role: 'assistant', content: '' },
    }
  },
}))

import { huoQuFanYi } from '../../config/translations'
import { AI_PEI_ZHI } from '../../config/AI配置'
import { JUN_SHI_PEI_ZHI, JUN_SHI_ZHI_DAO_DUAN_DING_YI } from '../../config/军师配置'
import {
  gouJianJunShiQiuZhuPrompt,
  junShiShuChuYaoQiuBuFen,
} from '../Prompt构建器'
import {
  jieXiJunShiFenDuan,
  pinJieJunShiFenDuan,
  shengChengJunShiZhiDao,
} from '../军师求助'
import { huoQuJunShiJiLu } from '../军师'
import * as 军师缓存模块 from '../军师缓存'
import type { HaoGanDuXinXi } from '../../types'

const haoGanDu: HaoGanDuXinXi = {
  xin_ren_du: 12,
  qin_mi_du: 8,
  qu_wei_du: 5,
  guan_huai_du: 3,
  zong_fen: 28,
  guan_xi_jie_duan: 'chuJian',
}

const 完整响应 = {
  当前局面: '她回得慢但没结束，还在观望',
  下一步怎么回: '那我先不打扰你啦，你忙完喊我一声',
  为什么这么聊: '她上一条说在加班，追着发只会掉分',
  鼓励: '你这节奏比上周稳多了',
}

describe('FP-11 军师指导提示词结构化守卫', () => {
  it('junShiQiuZhu 响应格式为 json_object', () => {
    expect(AI_PEI_ZHI.moXing.junShiQiuZhu.xiangYingGeShi).toEqual({ type: 'json_object' })
  })

  it('分区定义为四段、键唯一且覆盖结构字段', () => {
    expect(JUN_SHI_ZHI_DAO_DUAN_DING_YI.map((duan) => duan.ziDuan)).toEqual([
      'dangQianJuMian',
      'xiaYiBuZenMeHui',
      'weiShenMeZheMeLiao',
      'guLi',
    ])
    expect(new Set(JUN_SHI_ZHI_DAO_DUAN_DING_YI.map((duan) => duan.moXingJian)).size).toBe(4)
    for (const duan of JUN_SHI_ZHI_DAO_DUAN_DING_YI) {
      expect(duan.zuiDaZiShu).toBeGreaterThan(0)
      expect(duan.yaoQiu.length).toBeGreaterThan(0)
    }
  })

  it('user 段提示词含四段段名与逐段字数上限', () => {
    const tishi = gouJianJunShiQiuZhuPrompt('用户: 在吗', '小甜心', haoGanDu)
    for (const duan of JUN_SHI_ZHI_DAO_DUAN_DING_YI) {
      expect(tishi).toContain(duan.moXingJian)
      expect(tishi).toContain(`不超过 ${duan.zuiDaZiShu} 字`)
      expect(tishi).toContain(duan.yaoQiu)
    }
    expect(tishi).toContain('JSON')
    expect(tishi).toContain('聊天对象：小甜心')
  })

  it('user 段提示词不再含「混在一起说/别列一二三/别写小论文」等自相矛盾约束', () => {
    const tishi = gouJianJunShiQiuZhuPrompt('用户: 在吗', '小甜心', haoGanDu)
    for (const buKeHan of [
      '别列一二三',
      '混在一起说',
      '小论文',
      '6层意思',
      '碎碎念',
      '先损两句',
    ]) {
      expect(tishi).not.toContain(buKeHan)
    }
  })

  it('system 段提示词要求 JSON 分区且不再要求融合 6 层意思', () => {
    const xiTong = JUN_SHI_PEI_ZHI.xuanRuiMu.xiTongTiShi
    expect(xiTong).toContain('JSON')
    expect(xiTong).toContain('下一步怎么回')
    expect(xiTong).toContain('字数上限')
    expect(xiTong).not.toContain('6层意思')
    expect(xiTong).not.toContain('写长论文')
    expect(xiTong).not.toContain('别列一二三')
  })

  it('全部军师配置共用同一套结构化系统提示', () => {
    const xiTong = JUN_SHI_PEI_ZHI.xuanRuiMu.xiTongTiShi
    for (const peiZhi of Object.values(JUN_SHI_PEI_ZHI)) {
      expect(peiZhi.xiTongTiShi).toBe(xiTong)
    }
  })

  it('输出要求块内嵌 JSON 键模板，且与提示词同源', () => {
    const buFen = junShiShuChuYaoQiuBuFen()
    expect(buFen[0]).toBe('【输出要求】')
    const jianPan = buFen.find((hang) => hang.trimStart().startsWith('{'))
    expect(jianPan).toBeTruthy()
    for (const duan of JUN_SHI_ZHI_DAO_DUAN_DING_YI) {
      expect(jianPan).toContain(`"${duan.moXingJian}"`)
    }
    const tishi = gouJianJunShiQiuZhuPrompt('用户: 在吗', '小甜心', haoGanDu)
    expect(tishi).toContain(buFen.join('\n'))
  })

  it('提示词仍禁止向用户复述后台分数与维度名', () => {
    const tishi = gouJianJunShiQiuZhuPrompt('用户: 在吗', '小甜心', haoGanDu)
    expect(tishi).toContain('别跟朋友报具体分数')
    expect(tishi).toContain('后台数据（绝对不能跟朋友说）')
  })
})

describe('FP-11 军师输出解析四态', () => {
  it('合法 JSON：四段逐字段精确解析', () => {
    const jieGuo = jieXiJunShiFenDuan(JSON.stringify(完整响应))
    expect(jieGuo).toEqual({
      dangQianJuMian: 完整响应.当前局面,
      xiaYiBuZenMeHui: 完整响应.下一步怎么回,
      weiShenMeZheMeLiao: 完整响应.为什么这么聊,
      guLi: 完整响应.鼓励,
    })
  })

  it('缺字段：缺的段为空串，其余段保留', () => {
    const jieGuo = jieXiJunShiFenDuan(
      JSON.stringify({ 当前局面: 完整响应.当前局面, 下一步怎么回: 完整响应.下一步怎么回 }),
    )
    expect(jieGuo).toEqual({
      dangQianJuMian: 完整响应.当前局面,
      xiaYiBuZenMeHui: 完整响应.下一步怎么回,
      weiShenMeZheMeLiao: '',
      guLi: '',
    })
  })

  it('非法 JSON：返回 null 交由整段兜底，不抛错', () => {
    expect(jieXiJunShiFenDuan('她还在观望，你就回一句「你忙完喊我」')).toBeNull()
    expect(jieXiJunShiFenDuan('{"当前局面":')).toBeNull()
    expect(jieXiJunShiFenDuan('')).toBeNull()
    expect(jieXiJunShiFenDuan('[]')).toBeNull()
    expect(jieXiJunShiFenDuan('"字符串"')).toBeNull()
  })

  it('多余字段：忽略未知键，四段不受影响', () => {
    const jieGuo = jieXiJunShiFenDuan(
      JSON.stringify({ ...完整响应, 额外: '别说', 好感度: 120, 当前局面: 完整响应.当前局面 }),
    )
    expect(jieGuo).toEqual({
      dangQianJuMian: 完整响应.当前局面,
      xiaYiBuZenMeHui: 完整响应.下一步怎么回,
      weiShenMeZheMeLiao: 完整响应.为什么这么聊,
      guLi: 完整响应.鼓励,
    })
    expect(JSON.stringify(jieGuo)).not.toContain('额外')
  })

  it('被代码围栏包裹的 JSON 仍可解析', () => {
    const jieGuo = jieXiJunShiFenDuan(
      '好的，这是结果：\n```json\n' + JSON.stringify(完整响应) + '\n```\n希望有帮助',
    )
    expect(jieGuo?.xiaYiBuZenMeHui).toBe(完整响应.下一步怎么回)
  })

  it('超长段按配置上限钳制，保证界面不出现小作文', () => {
    const changDu = JUN_SHI_ZHI_DAO_DUAN_DING_YI[1].zuiDaZiShu
    const jieGuo = jieXiJunShiFenDuan(
      JSON.stringify({ ...完整响应, 下一步怎么回: '啊'.repeat(changDu + 200) }),
    )
    expect(jieGuo?.xiaYiBuZenMeHui).toHaveLength(changDu)
    expect(jieGuo?.xiaYiBuZenMeHui.endsWith('…')).toBe(true)
    expect(jieGuo?.dangQianJuMian).toBe(完整响应.当前局面)
  })

  it('四段全空视为解析失败', () => {
    expect(jieXiJunShiFenDuan(JSON.stringify({ 当前局面: '  ', 鼓励: '' }))).toBeNull()
    expect(jieXiJunShiFenDuan(JSON.stringify({ 额外: '只有无关键' }))).toBeNull()
  })

  it('整段拼接只含非空段且按定义顺序', () => {
    expect(
      pinJieJunShiFenDuan({
        dangQianJuMian: '甲',
        xiaYiBuZenMeHui: '乙',
        weiShenMeZheMeLiao: '',
        guLi: '丁',
      }),
    ).toBe('甲\n乙\n丁')
  })
})

describe('FP-11 军师指导生成降级', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    军师调用记录.length = 0
    模型下一次响应 = { neiRong: '' }
  })

  const canShu = {
    yong_hu_id: 'u1',
    jiao_se_id: 'r1',
    jiao_se_ming: '小甜心',
    dui_hua_li_shi: [
      {
        fa_song_zhe_lei_xing: 'yonghu' as const,
        fa_song_zhe_ming: '用户',
        nei_rong: '在吗',
        shi_jian: '10:00',
      },
    ],
    hao_gan_du: haoGanDu,
    fu_pan_tiao_mu: [],
    jun_shi_pei_zhi: {
      id: 'xuanRuiMu',
      mingCheng: JUN_SHI_PEI_ZHI.xuanRuiMu.mingCheng,
      xiTongTiShi: JUN_SHI_PEI_ZHI.xuanRuiMu.xiTongTiShi,
    },
  }

  it('合法 JSON：返回结构化四段，整段为拼接文本', async () => {
    模型下一次响应 = { neiRong: JSON.stringify(完整响应) }
    const jieGuo = await shengChengJunShiZhiDao(canShu)
    expect(jieGuo.zhi_dao_fen_duan).toEqual({
      dangQianJuMian: 完整响应.当前局面,
      xiaYiBuZenMeHui: 完整响应.下一步怎么回,
      weiShenMeZheMeLiao: 完整响应.为什么这么聊,
      guLi: 完整响应.鼓励,
    })
    expect(jieGuo.zhi_dao_zheng_duan).toBe(pinJieJunShiFenDuan(jieGuo.zhi_dao_fen_duan!))
    expect(军师调用记录[0].配置键).toBe('junShiQiuZhu')
    expect(军师调用记录[0].消息列表[0].jiaoSe).toBe('system')
    expect(军师调用记录[0].消息列表[0].neiRong).toBe(JUN_SHI_PEI_ZHI.xuanRuiMu.xiTongTiShi)
    expect(军师调用记录[0].消息列表[1].neiRong).toContain('下一步怎么回')
  })

  it('模型不守格式：整段原文兜底且不分段，不抛错', async () => {
    const yuanWen = '你俩现在就是互相试探，别急着表白，先约个饭再说。'
    模型下一次响应 = { neiRong: yuanWen }
    const jieGuo = await shengChengJunShiZhiDao(canShu)
    expect(jieGuo.zhi_dao_fen_duan).toBeNull()
    expect(jieGuo.zhi_dao_zheng_duan).toBe(yuanWen)
  })

  it('外呼异常：兜底文案且分段为空', async () => {
    模型下一次响应 = { 抛错: true }
    const jieGuo = await shengChengJunShiZhiDao(canShu)
    expect(jieGuo.zhi_dao_fen_duan).toBeNull()
    expect(jieGuo.zhi_dao_zheng_duan).toBe(huoQuFanYi('junShi', 'zanShiMeiXiangHao'))
  })

  it('空响应：兜底文案', async () => {
    模型下一次响应 = { neiRong: '   ' }
    const jieGuo = await shengChengJunShiZhiDao(canShu)
    expect(jieGuo.zhi_dao_fen_duan).toBeNull()
    expect(jieGuo.zhi_dao_zheng_duan).toBe(huoQuFanYi('junShi', 'zanShiMeiXiangHao'))
  })
})

describe('FP-11 旧 Redis 记录在新契约下的读取', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('旧记录只有 jian_yi 字符串时，分段字段归一为 null 且整段原样透传', async () => {
    vi.mocked(军师缓存模块.huoQuJunShiJiLuLieBiao).mockResolvedValue([
      {
        jian_yi: '老版本整段建议',
        shi_jian: '10:00',
        jiao_se_id: 'r1',
        jiao_se_ming_zi: '小甜心',
        jun_shi_id: 'xuanRuiMu',
        jun_shi_ming_chen: '玄锐暮',
        jun_shi_tou_xiang: '图片/军师头像/军师玄锐暮头像.webp',
        dui_hua_zhai_yao: '摘要',
        liao_tian_ji_lu: [],
        hou_tai_shu_ju: {
          hao_gan_du: {
            zong_fen: 0,
            xin_ren_du: 0,
            qin_mi_du: 0,
            qu_wei_du: 0,
            guan_huai_du: 0,
            guan_xi_jie_duan: 'lengDan',
          },
          fu_pan_tiao_mu: [],
        },
      },
    ] as never)

    const jieGuo = await huoQuJunShiJiLu('u1', 'r1')
    expect(jieGuo.jiLuLieBiao).toHaveLength(1)
    expect(jieGuo.jiLuLieBiao[0].jian_yi).toBe('老版本整段建议')
    expect(jieGuo.jiLuLieBiao[0].jian_yi_fen_duan).toBeNull()
  })

  it('新记录带分段时原样透出四段', async () => {
    vi.mocked(军师缓存模块.huoQuJunShiJiLuLieBiao).mockResolvedValue([
      {
        jian_yi: '甲\n乙',
        jian_yi_fen_duan: {
          dangQianJuMian: '甲',
          xiaYiBuZenMeHui: '乙',
          weiShenMeZheMeLiao: '',
          guLi: '',
        },
        shi_jian: '11:00',
        jiao_se_id: 'r1',
        jiao_se_ming_zi: '小甜心',
        jun_shi_id: 'xuanRuiMu',
        jun_shi_ming_chen: '玄锐暮',
        jun_shi_tou_xiang: '图片/军师头像/军师玄锐暮头像.webp',
        dui_hua_zhai_yao: '摘要',
        liao_tian_ji_lu: [],
        hou_tai_shu_ju: {
          hao_gan_du: {
            zong_fen: 0,
            xin_ren_du: 0,
            qin_mi_du: 0,
            qu_wei_du: 0,
            guan_huai_du: 0,
            guan_xi_jie_duan: 'lengDan',
          },
          fu_pan_tiao_mu: [],
        },
      },
    ] as never)

    const jieGuo = await huoQuJunShiJiLu('u1', 'r1')
    expect(jieGuo.jiLuLieBiao[0].jian_yi_fen_duan).toEqual({
      dangQianJuMian: '甲',
      xiaYiBuZenMeHui: '乙',
      weiShenMeZheMeLiao: '',
      guLi: '',
    })
  })
})
