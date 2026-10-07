import { AI_PEI_ZHI } from '../config/AI配置'
import { peiZhi } from '../config'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { 内部转展示, type 性别内部形态 } from '../utils/性别'
import type { MBTILeiXing } from '../config/角色配置'
import type { CanShuShangXiaWen } from '../config/AI参数策略'
import {
  CUO_WU_DAI_MA,
  JiaoSeShengChengCuoWu,
} from '../config/错误码注册表'

export interface KaiChangBaiShengChengCanShu {
  mbti_lei_xing: MBTILeiXing
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: '慢热' | '快热'
  shi_fou_zha_xing: boolean
  xing_ge: string
  yan_yu_feng_ge: string
  xi_huan_de_lei_xing: string
  xing_bie: 性别内部形态
  ming_zi: string
  bei_jing_gu_shi: string
  qing_gan_jing_li: string
  jia_ting_bei_jing: string
  tou_xiang: string
  biao_qian: string[]
}

export interface KaiChangBaiShengChengJieGuo {
  xiao_xi_lie_biao: string[]
}

let kaiChangBaiMock: ((canShu: KaiChangBaiShengChengCanShu) => KaiChangBaiShengChengJieGuo) | null = null

export function sheZhiKaiChangBaiMock(
  mock: ((canShu: KaiChangBaiShengChengCanShu) => KaiChangBaiShengChengJieGuo) | null,
): void {
  kaiChangBaiMock = mock
}

export function huoQuKaiChangBaiMock(): ((canShu: KaiChangBaiShengChengCanShu) => KaiChangBaiShengChengJieGuo) | null {
  return kaiChangBaiMock
}

function gouJianKaiChangBaiTiShi(canShu: KaiChangBaiShengChengCanShu): string {
  const xingBieMiaoShu = `${内部转展示(canShu.xing_bie)}生`
  return [
    '想象一下：这个角色刚在微信上加了对方（一个刚认识的同学/朋友介绍的人），对方还没说话。',
    'TA 已经决定要主动发起开场白（发不发已由概率门控决定）。请让 TA 主动发送 1~5 条开场白，说什么由你根据 TA 的完整人物画像深度思考后决定。',
    '千万不要套用任何“外向就一定多说、内向就一定少说”的刻板规则——条数由你综合画像判断，但必须在 1~5 条之间。',
    '角色真实画像：',
    `MBTI：${canShu.mbti_lei_xing}（首字母 ${canShu.ie_lei_xing} 仅供参考，不要据此机械决定），热身类型：${canShu.re_shen_lei_xing}，性别：${xingBieMiaoShu}。`,
    `性格：${canShu.xing_ge}`,
    `说话风格：${canShu.yan_yu_feng_ge}`,
    `喜欢的类型：${canShu.xi_huan_de_lei_xing}`,
    `背景故事：${canShu.bei_jing_gu_shi}`,
    `情感经历：${canShu.qing_gan_jing_li}`,
    `家庭背景：${canShu.jia_ting_bei_jing}`,
    `头像：${canShu.tou_xiang}`,
    `标签：${canShu.biao_qian.join('、')}`,
    canShu.shi_fou_zha_xing ? '这人设带点渣，往往会更主动地撩。' : '',
    '',
    '数量要求：必须发送 1~5 条（含 1 和 5），不要发 0 条。',
    '角色越热情/开朗/快热/渣型，越可以发到 3~5 条；越害羞/慢热/高冷，发 1~2 条即可。',
    '请按真实中国大学生微信聊天的风格生成。',
    '',
'内容要求：',
    '1. 像真实大学生微信聊天：可以有表情、简短问候、找话题、俏皮话、emoji，不要长篇大论。',
    '2. 说点你自己的事。真人加好友后第一条消息往往不是「在吗」，而是顺嘴说一句自己那边怎么样——在干嘛、刚下课、今天冷死了、看到个什么。',
    '3. 不要自我介绍姓名、年级、专业这类信息，那是别人问了你才说。',
    '4. 每条消息独立一行，不超过 100 字。',
    '5. 内容必须是 TA 主动发起的，不能假设对方已经说话。',
    '',
    '按这个 JSON 格式输出，别加别的：',
    '{"xiao_xi_lie_biao": ["消息1", "消息2"]}',
  ].filter(Boolean).join('\n')
}

// ⚠️ 旧的个人信息禁词表已**整体删除**（第十五轮实测）。
//   它把「宿舍 / 学校 / 大学 / 专业 / 年级 / 楼号 / 岁 / 我是 / 我叫 / 老家」等全列禁词，
//   且逐条 return null **整条丢弃**。后果是把真人最自然的开场白内容整类消灭：
//   第十五轮 15 轮实测里 AI 说得最多的就是自己的日常
//     （`我这边刚放下画笔` / `在宿舍画稿，手都冻僵了` / `昨晚还弄到两点多来着` / `我上学期也这样`）。
//   一个刚加好友的人不会自我介绍姓名学校，但**会说自己昨晚几点睡、今天在干什么**。
//   禁掉这些 => 开场白只剩「嗨」「在吗」这类空洞招呼 => 违背根本目的（100% 模拟真人）。
//
// 现在只保留**联络信息外泄**一类硬约束 —— 有现实与隐私依据，不是风格偏好。
// 手机号正则（11位中国手机号）
const SHOU_JI_HAO_RE = /1[3-9]\d{9}/
// 微信号正则（字母开头，6-20位字母数字下划线减号）
const WEI_XIN_HAO_RE = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/

function anQuanGuoLvXiaoXi(neiRong: string, mingZi?: string): string | null {
  const qingLi = neiRong.trim()
  if (!qingLi) return null
  // 手机号
  if (SHOU_JI_HAO_RE.test(qingLi)) return null
  // 微信号（独立 token 形式）
  const tokens = qingLi.split(/[\s,，。.!！?？:：;；]+/).filter(Boolean)
  for (const token of tokens) {
    if (WEI_XIN_HAO_RE.test(token)) return null
  }
  // QQ 号（出现 qq/扣 字样时的纯数字串）
  if (/qq|扣/i.test(qingLi) && /(?:^|\s)[1-9]\d{4,11}(?:\s|$)/.test(qingLi)) return null
  // 门牌 / 住址
  if (/\d+\s*(?:栋|单元|室|号楼|楼|门)/.test(qingLi)) return null
  // 包含角色真实姓名（数据库里的真名，说出来会破坏角色一致性）
  if (mingZi && mingZi.length > 0 && qingLi.includes(mingZi)) return null
  return qingLi
}

function jieXiJSONNeiRong(neiRong: unknown, mingZi?: string): string[] {
  if (typeof neiRong !== 'string') {
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID)
  }
  const kaiShi = neiRong.indexOf('{')
  const jieShu = neiRong.lastIndexOf('}')
  if (kaiShi < 0 || jieShu <= kaiShi) {
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID)
  }
  let jieGuo: unknown
  try {
    jieGuo = JSON.parse(neiRong.slice(kaiShi, jieShu + 1))
  } catch (cuoWu) {
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID, cuoWu)
  }
  if (!jieGuo || typeof jieGuo !== 'object' || !Array.isArray((jieGuo as { xiao_xi_lie_biao?: unknown }).xiao_xi_lie_biao)) {
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID)
  }
  const xiaoXiLieBiao = (jieGuo as { xiao_xi_lie_biao: unknown[] }).xiao_xi_lie_biao
    .map((x: unknown) => (typeof x === 'string' ? anQuanGuoLvXiaoXi(x, mingZi) : null))
    .filter((x: string | null): x is string => x !== null)
    .slice(0, 5)
  if (xiaoXiLieBiao.length === 0) {
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID)
  }
  return xiaoXiLieBiao
}

function jiangJiKaiChangBai(canShu: KaiChangBaiShengChengCanShu): KaiChangBaiShengChengJieGuo {
  // 无 AI key / AI 失败时的兜底：基于完整画像做简单启发式，生成 1~3 条。
  // 注意：是否"发送开场白"已由 角色生成 的统一概率门控决定（kaiChangBaiFaSongGaiLv），
  // 本函数被调用即表示已决定发送，因此这里不再做"是否主动"的概率判定，
  // 也不按 E/I 等维度机械决定条数——只负责把"要发"这件事落地成 1~3 条自然消息。
  const houXuan: string[] = [
    '嗨', '哈喽', '在忙吗', '刚加好友，有点紧张', '今天课多吗',
    '看到朋友圈有点意思', '今天天气好好', '你的头像有点意思',
  ]
  const zuiDa = 3
  const tiaoShu = Math.max(1, Math.floor(Math.random() * zuiDa) + 1)
  const jieGuo: string[] = []
  const chi = [...houXuan]
  while (jieGuo.length < tiaoShu && chi.length > 0) {
    const xiang = chi.splice(Math.floor(Math.random() * chi.length), 1)[0]
    if (!jieGuo.includes(xiang)) {
      jieGuo.push(xiang)
    }
  }
  const guoLvHou = jieGuo
    .map((x) => anQuanGuoLvXiaoXi(x, canShu.ming_zi))
    .filter((x): x is string => x !== null)
  return { xiao_xi_lie_biao: guoLvHou.slice(0, 5) }
}

export async function shengChengKaiChangBai(
  canShu: KaiChangBaiShengChengCanShu,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<KaiChangBaiShengChengJieGuo> {
  if (kaiChangBaiMock) {
    // mock 结果也需经过安全过滤（与真实 AI 输出一致），再按 5 条上限截断。
    // 防止 mock 绕过姓名/手机号/微信号/个人信息禁词过滤。
    // 是否发送、发几条完全由 mock 决定（含空数组表示不发），不再套用 E/I 硬编码。
    const mockJieGuo = kaiChangBaiMock(canShu)
    const guoLvHou = mockJieGuo.xiao_xi_lie_biao
      .map((x) => anQuanGuoLvXiaoXi(x, canShu.ming_zi))
      .filter((x: string | null): x is string => x !== null)
    return { xiao_xi_lie_biao: guoLvHou.slice(0, 5) }
  }

  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  if (!apiMiYao || process.env.VITEST === 'true') {
    return jiangJiKaiChangBai(canShu)
  }

  // 未显式传入上下文时，用 canShu 已有的人设字段构造 jiaoSe 上下文（向后兼容：无则退回基座）
  const shangXiaWenShiJi = shangXiaWen ?? {
    jiaoSe: {
      ie_lei_xing: canShu.ie_lei_xing,
      re_shen_lei_xing: canShu.re_shen_lei_xing,
      shi_fou_zha_xing: canShu.shi_fou_zha_xing,
      xing_ge: canShu.xing_ge,
      yan_yu_feng_ge: canShu.yan_yu_feng_ge,
    },
  }

  let xiangYing: Awaited<ReturnType<typeof genJuPeiZhiTiaoYong>>
  try {
    xiangYing = await genJuPeiZhiTiaoYong('kaiChangBai' as keyof typeof AI_PEI_ZHI.moXing, [
      { jiaoSe: 'system', neiRong: '你正在帮一个刚加上微信的中国大学生想主动发出的开场消息，是否主动发、发几条、说什么由你根据 TA 的完整画像深度思考决定。' },
      { jiaoSe: 'user', neiRong: gouJianKaiChangBaiTiShi(canShu) },
    ], shangXiaWenShiJi)
  } catch {
    return jiangJiKaiChangBai(canShu)
  }
  try {
    return { xiao_xi_lie_biao: jieXiJSONNeiRong(xiangYing.neiRong, canShu.ming_zi) }
  } catch {
    return jiangJiKaiChangBai(canShu)
  }
}
