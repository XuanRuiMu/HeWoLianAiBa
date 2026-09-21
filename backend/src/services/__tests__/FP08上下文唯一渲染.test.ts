import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    query: async (文本: string) => {
      if (文本.includes('FROM "关键事件"')) {
        return {
          rows: [{ 事件类型: '其他', 描述: '对方爱发狗头表情包' }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    },
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => undefined }),
  },
}))
vi.mock('../../redis', () => ({ redis: { set: vi.fn(), get: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() } }))
vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: vi.fn() }))
vi.mock('../AI输入准备', () => ({ baoCunJiaoSeXiaoXi: vi.fn() }))
vi.mock('../好感度', () => ({ gengXinHaoGanDu: vi.fn(), huoQuWanZhengHaoGanDu: vi.fn() }))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn() }))

const 调用记录: Array<{ 配置键: string; 消息列表: Array<{ jiaoSe: string; neiRong: unknown }> }> = []

vi.mock('../../utils/DeepSeek客户端', () => ({
  genJuPeiZhiTiaoYong: async (配置键: string, 消息列表: Array<{ jiaoSe: string; neiRong: unknown }>) => {
    调用记录.push({ 配置键, 消息列表 })
    return {
      neiRong: JSON.stringify({
        是否表白: false,
        表白类型: '非表白',
        表白确信度: 0,
        是否互删: false,
        互删确信度: 0,
        是否识破: false,
        识破确信度: 0,
        是否神经病: false,
        神经病确信度: 0,
        是否接受: false,
        确信度: 0,
        是否模糊回复: true,
        理由: '测试',
        用户意图: '闲聊',
        情感分析: '平静',
        回复策略: '自然回',
        是否回复: true,
        回复条数: 1,
        时间情绪: '平常',
        是否撤回: false,
        是否主动表白: false,
      }),
      siKaoNeiRong: '',
      yuanShuJu: {},
      xinXi: { role: 'assistant', content: '' },
    }
  },
}))

import {
  baoZhuangYongHuNeiRong,
  gouJianDirectorPrompt,
  gouJianGuanJianShiJianPrompt,
  gouJianJiYiZhaiYaoPrompt,
  gouJianWriterPrompt,
  geShiHuaJunShiLiShi,
} from '../Prompt构建器'
import { gouJianZhaiYaoZhuRuWenBen } from '../对话摘要'
import { duQuGuanJianShiJianZhuRu } from '../关键事件提取'
import {
  fenGeZuiXinYongHuXiaoXi,
  quBenLunDengDaiHuiFuXiang,
  quZuiXinYongHuXiaoXiXiang,
  zhanShiLiShiWenBen,
  zhanShiXiaoXiZhengWen,
  zhuRuBenLunTuXiangKuai,
} from '../对话渲染'
import { shengChengWriterHuiFu } from '../Writer'
import { shengChengDirectorCeLue } from '../Director'
import { chuLiYongHuJuJueAIHuoJieShou, jianCeSiLianHeYi } from '../胜利失败条件'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang, HaoGanDuXinXi } from '../../types'

const 角色: AIJiaoSeXinXi = {
  id: 'jiao-se-1',
  ming_zi: '小美',
  wei_xin_ming: '小美',
  xing_bie: 'nv',
  mbti_lei_xing: 'INFP',
  ie_lei_xing: 'I',
  re_shen_lei_xing: '慢热',
  nian_ling: 20,
  shen_fen: '',
  wai_mao: '普通',
  xing_ge: '安静',
  bei_jing_gu_shi: '在校生',
  xi_hao: [],
  yan_yu_feng_ge: '口语',
  xing_wei_te_dian: '',
  tou_xiang: '',
  xi_huan_de_lei_xing: '真诚的人',
  jia_ting_bei_jing: '普通家庭',
  qing_gan_jing_li: '谈过一次',
  shi_fou_zha_xing: false,
  shi_jie_xin_xi: {},
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '小美，女，20岁',
    wai_mao: '普通',
    xing_ge: '安静',
    bei_jing: '在校生',
    yan_yu: '口语',
    xing_wei: '',
    guan_xi: '喜欢的类型：真诚的人',
    xi_tong_ti_shi: '',
  },
}

const 好感度: HaoGanDuXinXi = {
  xin_ren_du: 30,
  qin_mi_du: 20,
  qu_wei_du: 15,
  guan_huai_du: 10,
  zong_fen: 75,
  guan_xi_jie_duan: 'renShi',
}

function 文本消息(发送者: 'yonghu' | 'jiaose', 正文: string, 时间 = '10:00'): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: 发送者,
    fa_song_zhe_ming: 发送者 === 'jiaose' ? '小美' : '对方',
    nei_rong: 正文,
    shi_jian: 时间,
  }
}

function 表情包消息(sha = 'bao-zhi-1', 时间 = '10:05'): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: 'yonghu',
    fa_song_zhe_ming: '对方',
    nei_rong: '',
    shi_jian: 时间,
    meiTiLeiBie: 'biaoqingshu',
    meiTiSha256: sha,
    meiTiMIME: 'image/png',
  }
}

function 图片消息(sha: string, 时间: string): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: 'yonghu',
    fa_song_zhe_ming: '对方',
    nei_rong: '',
    shi_jian: 时间,
    meiTiLeiBie: 'tupian',
    meiTiSha256: sha,
    meiTiMIME: 'image/png',
  }
}

function 构输入(历史: DuiHuaLiShiXiang[], 最新消息: string, 记忆?: string): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-1',
    jiao_se_id: 'jiao-se-1',
    jiao_se: 角色,
    hao_gan_du: 好感度,
    dui_hua_li_shi: 历史,
    yong_hu_xin_xiao_xi: 最新消息,
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
    ji_yi_zhai_yao: 记忆,
  }
}

function 出现次数(文本: string, 片段: string): number {
  return 文本.split(片段).length - 1
}

/** 从图块里还原被注入的图片标识（mock 的 readFile 原样回吐路径） */
function 注入的图片标识(块列表: Array<Record<string, unknown>>): string[] {
  return 块列表
    .filter((块) => 块.type === 'input_image')
    .map((块) => Buffer.from(String(块.image_url).split(',')[1] ?? '', 'base64').toString())
}

function 取用户内容块(配置键: string): { 文本: string; 图片: string[] } {
  const 调用 = [...调用记录].reverse().find((项) => 项.配置键 === 配置键)
  const 用户消息 = 调用?.消息列表.find((项) => 项.jiaoSe === 'user')
  const 内容 = 用户消息?.neiRong
  if (typeof 内容 === 'string') return { 文本: 内容, 图片: [] }
  const 数组 = (内容 ?? []) as Array<Record<string, unknown>>
  return {
    文本: 数组
      .filter((块) => 块.type === 'input_text')
      .map((块) => String(块.text))
      .join('\n'),
    图片: 注入的图片标识(数组),
  }
}

beforeEach(() => {
  调用记录.length = 0
})

describe('FP-08 同一条用户消息在同一轮 prompt 内只出现一次', () => {
  const 历史 = [
    文本消息('yonghu', '在吗', '09:50'),
    文本消息('jiaose', '在呀', '09:52'),
    文本消息('yonghu', '今天好累', '09:55'),
    表情包消息(),
  ]

  it('Writer prompt 里表情包占位符恰好出现 1 次', () => {
    const prompt = gouJianWriterPrompt(构输入(历史, '[表情包]'))
    expect(出现次数(prompt, '[表情包]')).toBe(1)
  })

  it('Director prompt 里表情包占位符恰好出现 1 次', () => {
    const prompt = gouJianDirectorPrompt(构输入(历史, '[表情包]'))
    expect(出现次数(prompt, '[表情包]')).toBe(1)
  })

  it('文本消息同样只出现一次（第五层与第六层不重叠）', () => {
    const prompt = gouJianWriterPrompt(构输入([文本消息('yonghu', '今晚月色真好')], '今晚月色真好'))
    expect(出现次数(prompt, '今晚月色真好')).toBe(1)
    expect(出现次数(prompt, '对方刚发给你的消息：')).toBe(1)
  })

  it('连发多条时每条都仍在 prompt 中出现一次', () => {
    const 连发 = [
      文本消息('jiaose', '刚下课', '10:00'),
      文本消息('yonghu', '第一条', '10:01'),
      文本消息('yonghu', '第二条', '10:02'),
      文本消息('yonghu', '第三条', '10:03'),
    ]
    const prompt = gouJianWriterPrompt(构输入(连发, '第三条'))
    expect(出现次数(prompt, '第一条')).toBe(1)
    expect(出现次数(prompt, '第二条')).toBe(1)
    expect(出现次数(prompt, '第三条')).toBe(1)
  })

  it('无图会话的 prompt 不含任何载体占位符', () => {
    const 纯文本 = 构输入(
      [文本消息('yonghu', '哈喽'), 文本消息('jiaose', '哈喽呀'), 文本消息('yonghu', '吃了吗')],
      '吃了吗',
    )
    const prompt = `${gouJianWriterPrompt(纯文本)}\n${gouJianDirectorPrompt(纯文本)}`
    expect(prompt).not.toContain('[图片]')
    expect(prompt).not.toContain('[表情包]')
    expect(prompt).not.toContain('用户发来一个表情包')
  })

  it('第五层与第六层对同一条历史只渲染一次（切分互斥且并集完整）', () => {
    const 切分 = fenGeZuiXinYongHuXiaoXi(历史)
    expect(切分.焦点).toBe(历史[历史.length - 1])
    expect(切分.背景).toEqual(历史.slice(0, -1))
    expect(切分.背景).not.toContain(切分.焦点)
    expect(quZuiXinYongHuXiaoXiXiang(历史)).toBe(切分.焦点)
  })

  it('语音转写与撤回语义仍走同一渲染入口', () => {
    const 语音: DuiHuaLiShiXiang = {
      fa_song_zhe_lei_xing: 'yonghu',
      fa_song_zhe_ming: '对方',
      nei_rong: '<dog> 汪 晚安',
      shi_jian: '10:06',
      meiTiLeiBie: 'yuyin',
      meiTiShiChangHaoMiao: 3000,
    }
    expect(zhanShiXiaoXiZhengWen(语音)).toContain('语音转写')
    expect(zhanShiXiaoXiZhengWen({ ...表情包消息(), yi_che_hui: true, yuan_shi_nei_rong: null })).toBe(
      '[用户撤回了一个表情包]',
    )
    expect(出现次数(gouJianWriterPrompt(构输入([语音], zhanShiXiaoXiZhengWen(语音))), '语音转写')).toBe(1)
  })
})

describe('FP-08 历史图片不再每轮全量重投', () => {
  const 历史 = [
    图片消息('jiu-tu-1', '09:00'),
    文本消息('jiaose', '收到', '09:01'),
    图片消息('xin-tu-1', '09:02'),
  ]

  it('本轮待回复段只含最后一条角色消息之后的用户消息', () => {
    expect(quBenLunDengDaiHuiFuXiang(历史).map((项) => 项.meiTiSha256)).toEqual(['xin-tu-1'])
  })

  it('图片块注入只包含本轮新增的图，旧图不重投', async () => {
    const 标识 = 注入的图片标识((await zhuRuBenLunTuXiangKuai(历史)) as unknown as Array<Record<string, unknown>>)
    expect(标识).toEqual(['mock://xin-tu-1'])
  })

  it('已撤回的图片不注入', async () => {
    const 撤回历史 = [{ ...图片消息('che-hui-1', '09:02'), yi_che_hui: true }]
    expect(await zhuRuBenLunTuXiangKuai(撤回历史)).toEqual([])
  })

  it('本轮连发大量图片时按配置上限截断', async () => {
    const 一堆 = Array.from({ length: 12 }, (_, 序号) => 图片消息(`lian-fa-${序号}`, '09:30'))
    const 标识 = 注入的图片标识((await zhuRuBenLunTuXiangKuai(一堆)) as unknown as Array<Record<string, unknown>>)
    expect(标识.length).toBeLessThanOrEqual(8)
    expect(标识).toContain('mock://lian-fa-11')
  })

  it('Writer 单次调用内：图块只有新图，且占位符只出现一次', async () => {
    const 历史 = [文本消息('jiaose', '收到', '09:01'), 图片消息('xin-tu-1', '09:02')]
    await shengChengWriterHuiFu(构输入(历史, '[图片]'))
    const { 文本, 图片 } = 取用户内容块('writer')
    expect(图片).toEqual(['mock://xin-tu-1'])
    expect(出现次数(文本, '[图片]')).toBe(1)
  })

  it('Director 单次调用内：图块只有新图，且占位符只出现一次', async () => {
    const 历史 = [文本消息('jiaose', '收到', '09:01'), 图片消息('xin-tu-1', '09:02')]
    await shengChengDirectorCeLue(构输入(历史, '[图片]'))
    const { 文本, 图片 } = 取用户内容块('director')
    expect(图片).toEqual(['mock://xin-tu-1'])
    expect(出现次数(文本, '[图片]')).toBe(1)
  })

  it('图块标题声明与上面那条载体标记同属一条消息', async () => {
    const 块 = (await zhuRuBenLunTuXiangKuai([图片消息('dan-tu-1', '09:00')])) as unknown as Array<Record<string, unknown>>
    const 文本块 = 块.filter((项) => 项.type === 'input_text').map((项) => String(项.text))
    expect(文本块).toEqual(['上面那条图片标记的本体（同一条消息，不是对方另外又发的）'])
  })
})

describe('FP-08 记忆复读治理', () => {
  it('摘要注入串自带事实性约束', () => {
    const 注入 = gouJianZhaiYaoZhuRuWenBen({
      zhaiYaoNeiRong: '对方很喜欢发狗头表情包',
      gaiKuoXiaoXiShu: 60,
      gengXinShiJian: '2026-09-01 10:00:00',
    })
    expect(注入).toContain('对方很喜欢发狗头表情包')
    expect(注入).toContain('可能已过时')
    expect(注入).toMatch(/不得.*本轮.*事实/)
  })

  it('空摘要不产出注入串', () => {
    expect(gouJianZhaiYaoZhuRuWenBen(null)).toBe('')
  })

  it('关键事件注入串自带事实性约束', async () => {
    const 注入 = await duQuGuanJianShiJianZhuRu('yong-hu-1', 'jiao-se-1')
    expect(注入).toContain('对方爱发狗头表情包')
    expect(注入).toContain('可能已过时')
    expect(注入).toMatch(/不得.*本轮.*事实/)
  })

  it('摘要生成侧禁止写入对用户行为的频次断言', () => {
    const 提示词 = gouJianJiYiZhaiYaoPrompt('1. [用户] [表情包]', '小美')
    expect(提示词).toContain('禁止')
    expect(提示词).toMatch(/总是|频次/)
  })

  it('关键事件生成侧禁止写入对用户行为的频次断言', () => {
    const 提示词 = gouJianGuanJianShiJianPrompt('1. [用户] [表情包]', '小美')
    expect(提示词).toContain('禁止')
    expect(提示词).toMatch(/总是|频次/)
  })

  it('记忆经第五层注入后仍带约束，不会退化成裸自由文本', () => {
    const 记忆 = gouJianZhaiYaoZhuRuWenBen({
      zhaiYaoNeiRong: '对方爱发狗头',
      gaiKuoXiaoXiShu: 60,
      gengXinShiJian: null,
    })
    const prompt = gouJianWriterPrompt(构输入([文本消息('yonghu', '早')], '早', 记忆))
    expect(prompt).toContain('对方爱发狗头')
    expect(prompt).toContain('可能已过时')
  })
})

describe('FP-08 占位符语义在 prompt 中声明', () => {
  it('Writer 与 Director 都说明载体标记只在对方真发来该载体时出现', () => {
    const 输入 = 构输入([表情包消息()], '[表情包]')
    const 写 = gouJianWriterPrompt(输入)
    const 导 = gouJianDirectorPrompt(输入)
    expect(写).toMatch(/方括号|载体/)
    expect(写).toMatch(/只在对方(真的|确实)?发来/)
    expect(导).toMatch(/只在对方(真的|确实)?发来/)
  })

  it('占位符说明本身不引入额外占位符实例', () => {
    const 输入 = 构输入([文本消息('yonghu', '哈喽')], '哈喽')
    const prompt = `${gouJianWriterPrompt(输入)}\n${gouJianDirectorPrompt(输入)}`
    expect(prompt).toContain('语音(N秒)')
    expect(出现次数(prompt, '[语音')).toBe(0)
  })
})

describe('FP-08 同类注入点全部同源', () => {
  it('四联判定 prompt 里表情包只出现一次', async () => {
    await jianCeSiLianHeYi('[表情包]', [文本消息('yonghu', '看这个', '10:04'), 表情包消息()], 角色, true)
    const { 文本, 图片 } = 取用户内容块('siLianJian')
    expect(出现次数(文本, '[表情包]')).toBe(1)
    expect(图片).toEqual(['mock://bao-zhi-1'])
    expect(文本).toContain('[10:04] 用户: 看这个')
  })

  it('接受表白判定 prompt 不重复用户这条回复', async () => {
    await chuLiYongHuJuJueAIHuoJieShou('yong-hu-1', 'jiao-se-1', 角色, '嗯嗯我知道了啦', undefined, [
      文本消息('jiaose', '我喜欢你', '10:00'),
      文本消息('yonghu', '嗯嗯我知道了啦', '10:01'),
    ])
    const { 文本 } = 取用户内容块('jieShouBiaoBaiJianCe')
    expect(出现次数(文本, '嗯嗯我知道了啦')).toBe(1)
    expect(出现次数(文本, '我喜欢你')).toBe(1)
  })

  it('军师历史与 Writer 历史走同一渲染入口', () => {
    const 历史 = [文本消息('jiaose', '在忙', '09:00'), 表情包消息('jun-shi-1', '09:05')]
    const 军师 = geShiHuaJunShiLiShi(历史, '小美')
    expect(军师).toBe('[09:00] 小美: 在忙\n[09:05] 用户: [表情包]')
    expect(军师).toBe(zhanShiLiShiWenBen(历史, { 角色名: '小美', 用户名: '用户', 时间在前: true }))
  })

  it('定界符包裹仍由同一入口产出', () => {
    expect(baoZhuangYongHuNeiRong('[表情包]')).toContain('[表情包]')
  })
})
