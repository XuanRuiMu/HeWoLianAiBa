import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * FP-08c（用户反馈第 5 条「严重 bug」）后端消费侧：
 * ① 复盘的第二份消息渲染器必须删除、收敛到 services/对话渲染 那一份入口；
 * ② 军师 / 军事分析（Director·Writer 战术链）/ 复盘 三条送给模型的文本内必须出现被引用消息原文，
 *    断言一律走「对模型调用层做桩、抓真实发出的 prompt 字符串」，不看函数返回值。
 *
 * 引用段形态（唯一真源，定义见 services/对话渲染.ts 的 YIN_YONG_ZHAN_SHI_QIAN_ZHUI 注释）：
 *   引用[发送者]: 原文  ← 独占一行，排在本条正文之前
 */

vi.mock('../../redis', () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() },
}))
vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuJunShiQiuZhu: vi.fn(),
}))
vi.mock('../战绩', () => ({ gengXinFuPanNeiRong: vi.fn(async () => undefined) }))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => null),
  huoQuJieDuanMing: vi.fn(() => ''),
  gengXinHaoGanDu: vi.fn(),
}))

/** 复盘/军师共用的消息列表出口（FP-08a 的出参形态，含 bei_yong_xiao_xi_id） */
const 列表状态: { xiaoXi: unknown[] } = { xiaoXi: [] }

vi.mock('../消息', async (yuanHang) => {
  const shiJi = await yuanHang<typeof import('../消息')>()
  return {
    ...shiJi,
    huoQuXiaoXiLieBiao: vi.fn(async () => ({
      lie_biao: 列表状态.xiaoXi,
      zong_shu: 列表状态.xiaoXi.length,
    })),
    huoQuJiaoSeSuoYouZhe: vi.fn(async () => ({
      yong_hu_id: 'yong-hu-1',
      shi_fou_feng_cun: false,
      ke_ji_xu_liao_tian: true,
      jie_ju_zhuang_tai: '',
      shi_fou_zha_xing: false,
    })),
  }
})

vi.mock('../军师缓存', async (yuanHang) => {
  const shiJi = await yuanHang<typeof import('../军师缓存')>()
  return {
    ...shiJi,
    huoQuJunShiZhiDaoZhuangTai: vi.fn(async () => null),
    sheZhiJunShiZhiDaoZhuangTai: vi.fn(async () => undefined),
    shanChuJunShiZhiDaoZhuangTai: vi.fn(async () => undefined),
    jianChaJunShiChongFu: vi.fn(async () => false),
    baoCunJunShiHaXi: vi.fn(async () => undefined),
    baoCunJunShiJiLu: vi.fn(async () => undefined),
    huoQuJunShiJiLuLieBiao: vi.fn(async () => []),
  }
})

const 角色信息 = {
  id: 'jiao-se-1',
  ming_zi: '小美',
  wei_xin_ming: '小美',
  xing_bie: 'nv',
  mbti_lei_xing: '',
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
  qing_gan_jing_li: '',
  shi_fou_zha_xing: false,
  shi_jie_xin_xi: {},
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '',
    yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '',
  },
}

// AI输入准备 只桩掉「取角色」（要一大坨列），huoQuZuiJinDuiHuaLiShi 保持真实实现走下面的 DB 桩
vi.mock('../AI输入准备', async (yuanHang) => {
  const shiJi = await yuanHang<typeof import('../AI输入准备')>()
  return { ...shiJi, huoQuAIJiaoSeXinXi: vi.fn(async () => 角色信息) }
})

/** 主聊天历史取数（huoQuZuiJinDuiHuaLiShi）用到的原始行，DB 层桩 */
const 原始消息行: Array<Record<string, unknown>> = []

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string) => {
      if (文本.includes('FROM "消息" m LEFT JOIN')) {
        return { rows: [...原始消息行].reverse(), rowCount: 原始消息行.length }
      }
      return { rows: [], rowCount: 0 }
    },
    connect: async () => ({
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => undefined,
    }),
  },
}))

const 调用记录: Array<{ 配置键: string; 消息列表: Array<{ jiaoSe: string; neiRong: unknown }> }> = []

vi.mock('../../utils/DeepSeek客户端', () => ({
  genJuPeiZhiTiaoYong: async (
    配置键: string,
    消息列表: Array<{ jiaoSe: string; neiRong: unknown }>,
  ) => {
    调用记录.push({ 配置键, 消息列表 })
    return {
      neiRong: JSON.stringify({
        pi_zhu: [], zong_jie: '复盘结论', zha_dian_ti_shi: '',
        事件列表: [], 关键事件: [],
        用户意图: '闲聊', 情感分析: '平静', 回复策略: '自然回', 是否回复: true, 回复条数: 1,
        时间情绪: '平常', 是否撤回: false, 是否主动表白: false, 是否表白: false,
        表白类型: '非表白', 表白确信度: 0, 是否互删: false, 互删确信度: 0,
        是否识破: false, 识破确信度: 0, 是否神经病: false, 神经病确信度: 0,
        是否接受: false, 确信度: 0, 是否模糊回复: false, 理由: '测试',
        当前局面: 'a', 下一步怎么会: 'b', 为什么这么聊: 'c', 鼓励: 'd',
      }),
      siKaoNeiRong: '',
      yuanShuJu: {},
      xinXi: { role: 'assistant', content: '' },
    }
  },
}))

import { zhanShiLiShiWenBen, zhanShiXiaoXiZhengWen, gouJianYinYongChaXun } from '../对话渲染'
import { shengChengFuPan } from '../复盘'
import { qingQiuJunShiZhiDao } from '../军师'
import { shengChengDirectorCeLue } from '../Director'
import { jianCeSiLianHeYi } from '../胜利失败条件'
import { huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'
import { huoQuFanYi } from '../../config/translations'
import type { XiaoXiXinXi } from '../消息'
import type { DuiHuaLiShiXiang } from '../../types'

/** FP-26：撤回行的唯一形态 = 既有撤回占位（翻译文件真源，不硬编码文案） */
const 撤回占位文案 = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')

const CHUANG_JIAN_JI = 1700000000000

/** 出参列表条目（FP-08a 的 XiaoXiXinXi 形态） */
function 列表项(
  id: string,
  发送者: 'yonghu' | 'jiaose',
  正文: string,
  补充: Partial<XiaoXiXinXi> = {},
): XiaoXiXinXi {
  return {
    id,
    hui_hua_id: 'jiao-se-1',
    fa_song_zhe_id: 发送者 === 'jiaose' ? 'jiao-se-1' : 'yong-hu-1',
    fa_song_zhe_lei_xing: 发送者,
    ai_biao_shi: 发送者 === 'jiaose',
    nei_rong: 正文,
    lei_xing: 'wenben',
    shi_jian_chuo: CHUANG_JIAN_JI,
    yi_du: true,
    ...补充,
  }
}

/** 原始行（huoQuZuiJinDuiHuaLiShi 的 DB 形态，倒序入桩、正向读出） */
function 原始行(
  id: string,
  发送者: 'yonghu' | 'jiaose',
  正文: string,
  补充: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ID: id,
    发送者,
    内容: 正文,
    微信昵称: '小美',
    创建时间: new Date(CHUANG_JIAN_JI).toISOString(),
    已撤回: false,
    原始内容: null,
    类型: 'wenben',
    媒体ID: null,
    内容块: null,
    被引用消息ID: null,
    对话总条数: 1,
    ...补充,
  }
}

/** 改前复盘的第二份渲染器（逐字搬自 2026-09-22 的 services/复盘.ts，仅用于差异对照） */
function 旧复盘正文(项: {
  nei_rong: string
  yi_che_hui?: boolean
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}): string {
  const 占位 = 旧媒体占位(项.mei_ti_lei_bie, {
    yiCheHui: 项.yi_che_hui,
    shiChangHaoMiao: 项.mei_ti_shi_chang_hao_miao,
    yuanShiWenJianMing: 项.mei_ti_yuan_shi_wen_jian_ming,
  })
  return 占位 || 项.nei_rong
}

/** 改前 AI视觉辅助::meiTiZhanShiWenBen 的等价复刻（复盘旧实现不传 mime） */
function 旧媒体占位(
  类别: string | null | undefined,
  选项?: { yiCheHui?: boolean; shiShiPinMIME?: string | null; yuanShiWenJianMing?: string | null },
): string | null {
  if (!类别) return null
  const 撤回 = Boolean(选项?.yiCheHui)
  switch (类别) {
    case 'tupian': return 撤回 ? '[用户撤回了一张图片]' : '[图片]'
    case 'biaoqingshu': return 撤回 ? '[用户撤回了一个表情包]' : '[表情包]'
    case 'yuyin': {
      if (撤回) return '[用户撤回了一条语音]'
      const haoMiao = 选项?.shiChangHaoMiao
      if (haoMiao == null || !Number.isFinite(Number(haoMiao))) return '[语音]'
      return `[语音(${Math.round(Number(haoMiao) / 1000)}秒)]`
    }
    case 'wenjian': {
      const ming = String(选项?.yuanShiWenJianMing || '').toLowerCase()
      const shiShiPin = ming.endsWith('.mp4') || ming.endsWith('.mov') || ming.endsWith('.webm') || ming.endsWith('.m4v')
      if (撤回) return shiShiPin ? '[用户撤回了一个视频]' : '[用户撤回了一个文件]'
      if (shiShiPin) return '[视频]'
      return `[文件:${选项?.yuanShiWenJianMing || ''}]`
    }
    default: return null
  }
}

function 旧复盘行(项: Parameters<typeof 旧复盘正文>[0] & { shi_jian: string; fa_song_zhe: string; yuan_shi_nei_rong?: string | null }, 序号?: number): string {
  const qianZhui = 序号 ? `${序号}. ` : ''
  const houZhui = 项.yi_che_hui && 项.yuan_shi_nei_rong ? `（已撤回，原始内容：${项.yuan_shi_nei_rong}）` : ''
  return `${qianZhui}[${项.shi_jian}] ${项.fa_song_zhe}: ${旧复盘正文(项)}${houZhui}`
}

function 取Prompt(配置键: string): string {
  const 调用 = [...调用记录].reverse().find((项) => 项.配置键 === 配置键)
  const 用户消息 = 调用?.消息列表.find((项) => 项.jiaoSe === 'user')
  const 内容 = 用户消息?.neiRong
  if (typeof 内容 === 'string') return 内容
  const 数组 = (内容 ?? []) as Array<Record<string, unknown>>
  return 数组.filter((块) => 块.type === 'input_text').map((块) => String(块.text)).join('\n')
}

function 出现次数(文本: string, 片段: string): number {
  return 文本.split(片段).length - 1
}

beforeEach(() => {
  调用记录.length = 0
  列表状态.xiaoXi = []
  原始消息行.length = 0
})

describe('FP-08c ① 两份渲染器的差异表（先证明不等价，再收敛）', () => {
  const 语音项 = {
    nei_rong: '语音转写：我今天加班', yi_che_hui: false, mei_ti_lei_bie: 'yuyin',
    mei_ti_shi_chang_hao_miao: 4000, mei_ti_yuan_shi_wen_jian_ming: 'a.m4a',
  }
  const 撤回项 = {
    nei_rong: '对方撤回了一条消息', yi_che_hui: true, yuan_shi_nei_rong: '-secret-原文',
    mei_ti_lei_bie: null, mei_ti_shi_chang_hao_miao: null, mei_ti_yuan_shi_wen_jian_ming: null,
  }
  const 混排项 = {
    nei_rong: '看这张图 [图片] 好看吗', yi_che_hui: false, mei_ti_lei_bie: 'tupian',
    mei_ti_shi_chang_hao_miao: null, mei_ti_yuan_shi_wen_jian_ming: 'p.png',
  }

  it('纯文本 / 图片 / 表情包 / 普通文件：新旧逐字符等值（语料未被悄悄改动）', () => {
    const 不变形态 = [
      { nei_rong: '今晚月色真好', mei_ti_lei_bie: null },
      { nei_rong: '', mei_ti_lei_bie: 'tupian', mei_ti_yuan_shi_wen_jian_ming: 'p.png' },
      { nei_rong: '', mei_ti_lei_bie: 'biaoqingshu' },
      { nei_rong: '报告', mei_ti_lei_bie: 'wenjian', mei_ti_yuan_shi_wen_jian_ming: '报告.pdf' },
      { nei_rong: '转写', mei_ti_lei_bie: 'yuyin', mei_ti_shi_chang_hao_miao: 4000 },
    ]
    for (const 项 of 不变形态) {
      const xiang: DuiHuaLiShiXiang = {
        fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方',
        nei_rong: 项.nei_rong, shi_jian: '10:00',
        yi_che_hui: 项.mei_ti_lei_bie === 'yuyin' ? false : undefined,
        meiTiLeiBie: 项.mei_ti_lei_bie ?? undefined,
        meiTiShiChangHaoMiao: (项 as { mei_ti_shi_chang_hao_miao?: number }).mei_ti_shi_chang_hao_miao ?? null,
        yuanShiWenJianMing: (项 as { mei_ti_yuan_shi_wen_jian_ming?: string }).mei_ti_yuan_shi_wen_jian_ming,
      }
      // 语音在唯一入口里给可读文本，其余四类必须与旧实现逐字符相同
      if (项.mei_ti_lei_bie === 'yuyin') {
        expect(zhanShiXiaoXiZhengWen(xiang)).not.toBe(旧复盘正文(项))
      } else {
        expect(zhanShiXiaoXiZhengWen(xiang)).toBe(旧复盘正文(项))
      }
    }
  })

  it('差异 1：撤回带原文 —— 旧「撤回文案+后缀」→ FP-08c「[已撤回，原始内容：X]」→ FP-26 只出撤回占位', () => {
    // FP-26（用户裁决②）：撤回语义＝原文不再进模型。三段形态逐条钉住，属契约演进（旧→新已写明）。
    const xiang: DuiHuaLiShiXiang = {
      fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '你', nei_rong: 撤回项.nei_rong,
      shi_jian: '10:00', yi_che_hui: true,
    }
    // 旧第二份渲染器（复盘）的形态：占位文案 + 原文后缀
    expect(旧复盘行({ ...撤回项, shi_jian: '10:00', fa_song_zhe: '你' } as never)).toBe(
      '[10:00] 你: 对方撤回了一条消息（已撤回，原始内容：-secret-原文）',
    )
    // 现口径：既有撤回占位，且**不含**原文；`nei_rong` 传什么都不外泄
    expect(zhanShiXiaoXiZhengWen(xiang)).toBe(撤回占位文案)
    expect(zhanShiXiaoXiZhengWen({ ...xiang, nei_rong: '-secret-原文' })).toBe(撤回占位文案)
    expect(zhanShiXiaoXiZhengWen(xiang)).not.toContain('-secret-原文')
    // 撤回原文不再是模型入参可携带的键（类型层收口）
    expect('yuan_shi_nei_rong' in (xiang as Record<string, unknown>)).toBe(false)
  })

  it('差异 2：语音 —— 旧给时长占位符 → 唯一入口给可读转写文本', () => {
    expect(旧复盘正文(语音项)).toBe('[语音(4秒)]')
    const 新 = zhanShiXiaoXiZhengWen({
      fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: 语音项.nei_rong,
      shi_jian: '10:00', meiTiLeiBie: 'yuyin', meiTiShiChangHaoMiao: 4000,
    })
    expect(新).not.toBe('[语音(4秒)]')
    expect(新).toContain('我今天加班')
  })

  it('差异 3：图文混排行 —— 旧实现被单个占位符吞掉正文（消息内容块.ts 的不变式要求让位）', () => {
    expect(旧复盘正文(混排项)).toBe('[图片]')
    const 新 = zhanShiXiaoXiZhengWen({
      fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: 混排项.nei_rong,
      shi_jian: '10:00', meiTiLeiBie: 'tupian', tuWenHunPai: true,
    })
    expect(新).toBe('看这张图 [图片] 好看吗')
  })

  it('收敛后复盘行 == 唯一入口直接渲染结果（同一份实现，不再是第二份）', async () => {
    列表状态.xiaoXi = [
      列表项('m-1', 'jiaose', '今天忙吗'),
      列表项('m-2', 'yonghu', '还行', { bei_yong_xiao_xi_id: 'm-1' }),
    ]
    await shengChengFuPan('yong-hu-1', 'jiao-se-1', 'dang-an-1')
    const prompt = 取Prompt('fuPanShengCheng')
    const 直接 = zhanShiXiaoXiZhengWen(
      {
        id: 'm-2', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '你', nei_rong: '还行',
        shi_jian: '10:00', beiYongXiaoXiId: 'm-1',
      },
      undefined,
      gouJianYinYongChaXun([
        { id: 'm-1', fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '对方', nei_rong: '今天忙吗', shi_jian: '10:00' },
      ]),
    )
    expect(直接).toBe('引用[对方]: 今天忙吗\n还行')
    expect(prompt).toContain(直接)
  })
})

describe('FP-08c ② 复盘送给模型的出参含引用原文', () => {
  it('引用目标在列表内 ⇒ fuPanShengCheng 的 prompt 出现「引用[发送者]: 原文」且带序号行', async () => {
    列表状态.xiaoXi = [
      列表项('m-1', 'jiaose', '我周五晚上有空'),
      列表项('m-2', 'yonghu', '那一起吃饭', { bei_yong_xiao_xi_id: 'm-1' }),
    ]
    const 结果 = await shengChengFuPan('yong-hu-1', 'jiao-se-1', 'dang-an-1')
    expect(结果.fu_pan_nei_rong).toBeTruthy()

    const prompt = 取Prompt('fuPanShengCheng')
    expect(prompt).toContain('引用[对方]: 我周五晚上有空\n那一起吃饭')
    // 行序号仍从 1 起、逐条连续（引用段并进第 2 行内部，不额外占行号）
    expect(prompt).toContain('1. [')
    expect(prompt).toContain('2. [')
    expect(出现次数(prompt, '引用[')).toBe(1)
    // 关键事件抽取那次模型调用的出参同样带引用（复盘链路的第二条送模路径）
    expect(取Prompt('guanJianShiJian')).toContain('引用[对方]: 我周五晚上有空')
  })

  it('被引用消息已撤回 ⇒ 引用段只出撤回占位，原文不因引用而多出一份', async () => {
    列表状态.xiaoXi = [
      列表项('m-1', 'jiaose', '原话', { yi_che_hui: true, yuan_shi_nei_rong: '-chehui-原文-' }),
      列表项('m-2', 'yonghu', '引用你那句', { bei_yong_xiao_xi_id: 'm-1' }),
    ]
    await shengChengFuPan('yong-hu-1', 'jiao-se-1', 'dang-an-1')
    const prompt = 取Prompt('fuPanShengCheng')
    expect(prompt).toContain('引用[对方]: 对方撤回了一条消息')
    // 引用段里没有原文；撤回消息**自身**也不再带原文（FP-26：旧 1 次 → 新 0 次，契约演进）
    expect(prompt).not.toContain('引用[对方]: -chehui-原文-')
    expect(出现次数(prompt, '-chehui-原文-')).toBe(0)
    // 可辨识性不退：撤回那条仍以占位文案出现在历史原位（发送者标签 + 占位）
    expect(prompt).toContain(`对方: ${撤回占位文案}`)
  })

  it('无引用槽 / 引用槽为 NULL ⇒ 不渲染引用且不抛异常', async () => {
    列表状态.xiaoXi = [
      列表项('m-1', 'jiaose', '早'),
      列表项('m-2', 'yonghu', '早呀', { bei_yong_xiao_xi_id: null }),
    ]
    await shengChengFuPan('yong-hu-1', 'jiao-se-1', 'dang-an-1')
    const prompt = 取Prompt('fuPanShengCheng')
    expect(prompt).not.toContain('引用[')
  })

  it('引用槽指向列表外（分页窗口外）⇒ 不渲染引用、不抛异常', async () => {
    列表状态.xiaoXi = [列表项('m-9', 'yonghu', '引用一条没取到的', { bei_yong_xiao_xi_id: 'm-outter' })]
    await expect(shengChengFuPan('yong-hu-1', 'jiao-se-1', 'dang-an-1')).resolves.toBeTruthy()
    expect(取Prompt('fuPanShengCheng')).not.toContain('引用[')
  })
})

describe('FP-08c ② 军师送给模型的出参含引用原文', () => {
  it('qingQiuJunShiZhiDao ⇒ junShiQiuZhu 的 prompt 出现引用行', async () => {
    列表状态.xiaoXi = [
      列表项('m-1', 'jiaose', '我其实不太想谈恋爱'),
      列表项('m-2', 'yonghu', '那我该怎么回', { bei_yong_xiao_xi_id: 'm-1' }),
    ]
    const 结果 = await qingQiuJunShiZhiDao({ yong_hu_id: 'yong-hu-1', jiao_se_id: 'jiao-se-1' })
    expect(结果.cheng_gong).toBe(true)
    const prompt = 取Prompt('junShiQiuZhu')
    expect(prompt).toContain('用户: 引用[小美]: 我其实不太想谈恋爱\n那我该怎么回')
  })

  it('军师：被引用消息已撤回 ⇒ 引用段只出撤回占位，撤回那条自身的原文也不进语料', async () => {
    列表状态.xiaoXi = [
      列表项('m-1', 'jiaose', '表面话', { yi_che_hui: true, yuan_shi_nei_rong: '-junshi-原文-' }),
      列表项('m-2', 'yonghu', '她这句什么意思', { bei_yong_xiao_xi_id: 'm-1' }),
    ]
    await qingQiuJunShiZhiDao({ yong_hu_id: 'yong-hu-1', jiao_se_id: 'jiao-se-1' })
    const prompt = 取Prompt('junShiQiuZhu')
    expect(prompt).toContain(`引用[小美]: ${撤回占位文案}`)
    expect(prompt).not.toContain('引用[小美]: -junshi-原文-')
    // FP-26 契约演进：撤回那条自身旧形态出现 1 次原文 → 新形态 0 次，只出占位
    expect(出现次数(prompt, '-junshi-原文-')).toBe(0)
    // 撤回行的 `内容` 投影同样不外泄（库里 内容 列不清空，读取侧必须挡住）
    expect(prompt).not.toContain('表面话')
  })
})

describe('FP-08c ② 军事分析（Director 战术链）送给模型的出参含引用原文', () => {
  const 好感度 = { xin_ren_du: 1, qin_mi_du: 1, qu_wei_du: 1, guan_huai_du: 1, zong_fen: 40, guan_xi_jie_duan: 'renShi' }

  it('真实取数 huoQuZuiJinDuiHuaLiShi ⇒ Director 历史层 prompt 含引用行', async () => {
    原始消息行.push(
      原始行('m-1', 'jiaose', '我这两天在想我们的事'),
      原始行('m-2', 'yonghu', '先别急', { 被引用消息ID: 'm-1' }),
      原始行('m-3', 'jiaose', '嗯好'),
      原始行('m-4', 'yonghu', '那行吧'),
    )
    const 历史 = await huoQuZuiJinDuiHuaLiShi('yong-hu-1', 'jiao-se-1')
    expect(历史[1].beiYongXiaoXiId).toBe('m-1')

    await shengChengDirectorCeLue({
      yong_hu_id: 'yong-hu-1', jiao_se_id: 'jiao-se-1', jiao_se: 角色信息,
      hao_gan_du: 好感度, dui_hua_li_shi: 历史, yong_hu_xin_xiao_xi: '那行吧',
      shi_fou_di_yi_lun: false, tu_pian_shou_quan: false,
    })
    const prompt = 取Prompt('director')
    expect(prompt).toContain('引用[小美]: 我这两天在想我们的事\n先别急')
    // 只渲染一段引用；被引用的那条自身仍在历史原位（引用是指针不是搬运，不重复展开第二层）
    expect(出现次数(prompt, '引用[')).toBe(1)
  })

  it('本轮焦点那条自带引用 ⇒ 送模正文（AI回复调度器/结局判定同一入口）含引用行', async () => {
    原始消息行.push(
      原始行('m-1', 'jiaose', '我其实没那么喜欢你'),
      原始行('m-2', 'yonghu', '这话什么意思', { 被引用消息ID: 'm-1' }),
    )
    const 历史 = await huoQuZuiJinDuiHuaLiShi('yong-hu-1', 'jiao-se-1')
    // 焦点=末条用户消息，它会被历史层剔除，只出现在「刚发给你的消息」处；
    // 私恋/互删检测与调度器共用 zhanShiXiaoXiZhengWen 的同一入口渲染它
    await jianCeSiLianHeYi('', 历史, 角色信息, false)
    const prompt = 取Prompt('siLianJian')
    expect(prompt).toContain('引用[小美]: 我其实没那么喜欢你\n这话什么意思')
  })

  it('Director：被引用消息已撤回 ⇒ 引用段只出撤回占位', async () => {
    原始消息行.push(
      原始行('m-1', 'jiaose', '明面话', { 已撤回: true, 原始内容: '-director-原文-' }),
      原始行('m-2', 'yonghu', '这是什么意思', { 被引用消息ID: 'm-1' }),
      原始行('m-3', 'jiaose', '没什么'),
      原始行('m-4', 'yonghu', '哦'),
    )
    const 历史 = await huoQuZuiJinDuiHuaLiShi('yong-hu-1', 'jiao-se-1')
    await shengChengDirectorCeLue({
      yong_hu_id: 'yong-hu-1', jiao_se_id: 'jiao-se-1', jiao_se: 角色信息,
      hao_gan_du: 好感度, dui_hua_li_shi: 历史, yong_hu_xin_xiao_xi: '哦',
      shi_fou_di_yi_lun: false, tu_pian_shou_quan: false,
    })
    const prompt = 取Prompt('director')
    expect(prompt).toContain(`引用[小美]: ${撤回占位文案}`)
    expect(prompt).not.toContain('引用[小美]: -director-原文-')
    // FP-26：走真实取数口（huoQuZuiJinDuiHuaLiShi）时，撤回那条的 `原始内容` 与 `内容` 都不进语料
    expect(出现次数(prompt, '-director-原文-')).toBe(0)
    expect(prompt).not.toContain('明面话')
    // 占位出现两次 = 引用段一次 + 撤回那条自身在历史原位一次（可辨识性保留，原文零次）
    expect(出现次数(prompt, 撤回占位文案)).toBe(2)
  })

  it('唯一入口：引用槽为 NULL / 自引用 / 目标取不到 ⇒ 一律不渲染引用段', () => {
    const 目标外: DuiHuaLiShiXiang = {
      id: 'a', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方',
      nei_rong: '正文', shi_jian: '10:00', beiYongXiaoXiId: 'not-in-list',
    }
    const 自引用: DuiHuaLiShiXiang = { ...目标外, id: 'a', beiYongXiaoXiId: 'a' }
    const 查不到 = gouJianYinYongChaXun([])
    expect(zhanShiXiaoXiZhengWen(目标外, undefined, 查不到)).toBe('正文')
    expect(zhanShiXiaoXiZhengWen(自引用, undefined, gouJianYinYongChaXun([自引用]))).toBe('正文')
    expect(zhanShiXiaoXiZhengWen({ ...目标外, beiYongXiaoXiId: null }, undefined, 查不到)).toBe('正文')
  })

  it('历史文本入口按整份列表建索引：被窗口淘汰的头部消息仍能被引用到', () => {
    const 历史: DuiHuaLiShiXiang[] = [
      { id: 'old-1', fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小美', nei_rong: '很久之前那句', shi_jian: '08:00', duiHuaZongTiaoShu: 260 },
      { id: 'new-1', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '回到那句', shi_jian: '09:00', beiYongXiaoXiId: 'old-1', duiHuaZongTiaoShu: 260 },
    ]
    const 文本 = zhanShiLiShiWenBen(历史, { 角色名: '小美', 用户名: '对方', 最多条数: 1, 时间在前: true })
    expect(文本).toContain('引用[小美]: 很久之前那句\n回到那句')
  })
})
