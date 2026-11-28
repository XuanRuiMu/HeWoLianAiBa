import { AI配置 } from '../config/AI配置'
import { peiZhi } from '../config'
import { 按配置调用 } from '../utils/通用模型调用'
import { 内部转展示, type 性别内部形态 } from '../utils/性别'
import type { MBTI类型 } from '../config/角色配置'
import type { 参数上下文 } from '../config/AI参数策略'
import {
  CuoWuDaiMa,
  JiaoSeShengChengCuoWu,
} from '../config/错误码注册表'

export interface KaiChangBaiShengChengCanShu {
  mbti_lei_xing: MBTI类型
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
  biao_qian: string[]
}

export interface KaiChangBaiShengChengJieGuo {
  zhu_dong_dang_wei: string
  zhu_dong_kai_kou_gai_lv: number
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
    '你现在要替 TA 做三件事，顺序是：先判断 TA 会不会主动开口，再决定说几条，最后写说什么。',
    '第一步，判断 TA 属于哪种主动倾向。四个档位选一个，只能填档位名本身，不要自创：',
    '「主动型」：热情外向、话多、自来熟，加了好友多半会自己先发消息找话题。',
    '「中间型」：不算主动也不算被动，想起什么说什么，没话题就先等着。',
    '「被动型」：慢热、内向、怕打扰别人、觉得先说显得太热情，多半等对方开口。',
    '「极被动型」：极度被动、社恐、或者有过主动联系别人却被无视的经历，基本上不会自己先发消息。',
    '判断依据（按权重从高到低）：说话风格里的主动性、性格里的主动程度、热身类型的快热慢热、MBTI 的 E/I、情感经历里有没有被人放过鸽子、家庭背景里的性格成因。',
    '注意：不要因为"主动一点更好"就往高档位选。性格被动的人就是不主动，这是真实的人，不是缺陷。',
    '第二步，决定条数：假设 TA 真的开口了，会发几条。性格被动、社恐、或者刚加好友实在没话题的，可以一条都不发，xiao_xi_lie_biao 给空数组；外向热情的发 1~2 条；特别有话说的最多 3 条。不要机械按 MBTI 决定条数。',
    '第三步，写内容：写 TA 主动发出去的那几条消息；如果决定不发，xiao_xi_lie_biao 就是空数组。',
    '下面是角色资料，不是让你把这些都写进开场白，只挑一个自然的点。',
    '角色真实画像：',
    `MBTI：${canShu.mbti_lei_xing}（首字母 ${canShu.ie_lei_xing} 仅供参考，不要据此机械决定），热身类型：${canShu.re_shen_lei_xing}，性别：${xingBieMiaoShu}。`,
    `性格：${canShu.xing_ge}`,
    `说话风格：${canShu.yan_yu_feng_ge}`,
    `喜欢的类型：${canShu.xi_huan_de_lei_xing}`,
    `背景故事：${canShu.bei_jing_gu_shi}`,
    `情感经历：${canShu.qing_gan_jing_li}`,
    `家庭背景：${canShu.jia_ting_bei_jing}`,
    `标签：${canShu.biao_qian.join('、')}`,
    canShu.shi_fou_zha_xing ? '这人设带点渣，会更主动，但也不要因此塞爆信息量。' : '',
    '',
    '数量要求：消息 0~3 条。性格被动、社恐、刚加好友没话题的，可以一条都不发，xiao_xi_lie_biao 返回空数组；外向热情的发 1~2 条；特别有话题的最多 3 条。不要机械按 MBTI 决定条数。',
    '请按这个角色真实身份的微信聊天风格生成（学生就学生气，上班族就带点上班族的气息），保留真人味，不要为了礼貌写得像客服。',
    '',
    '克制要求：',
    '1. 最多 1~2 条，特别热情最多 3 条；每条只说一件事，不要把多件事挤在一条里。',
    '2. 最多一个问号，且不要在下一句继续追问；对方还没回，不追问第二句。',
    '3. 不要替对方下结论，不要推断对方在哪、在干嘛、是什么样的人，也不要编造对方的信息。',
    '4. 不要调侃或催促对方回消息，不要显得急着要回复。',
    '5. 礼貌一点，但别端着，保留真人味。',
    '',
    '内容要求：',
    '1. 像这个身份的真人微信聊天，简短自然，不要长篇大论。',
    '2. 只挑一个自然的点顺嘴说一句，比如刚下课、今天冷、看到个什么；不用把性格、风格、经历、标签全塞进来。',
    '3. 不要自我介绍姓名、年级、专业这类信息，那是别人问了你才说。',
    '4. 每条消息独立一行，不超过 100 字。',
    '5. 内容必须是 TA 主动发起的，不能假设对方已经说话。',
    '',
    '按这个 JSON 格式输出，别加别的：',
    '决定不发时输出：{"主动程度": "被动型", "xiao_xi_lie_biao": []}；决定发时输出：{"主动程度": "中间型", "xiao_xi_lie_biao": ["一句话"]}',
  ].filter(Boolean).join('\n')
}

const ShouJiHaoRe = /1[3-9]\d{9}/
const WeiXinHaoRe = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/

function anQuanGuoLvXiaoXi(neiRong: string, mingZi?: string): string | null {
  const qingLi = neiRong.trim()
  if (!qingLi) return null
  if (ShouJiHaoRe.test(qingLi)) return null
  const tokens = qingLi.split(/[\s,，。.!！?？:：;；]+/).filter(Boolean)
  for (const token of tokens) {
    if (WeiXinHaoRe.test(token)) return null
  }
  if (/qq|扣/i.test(qingLi) && /(?:^|\s)[1-9]\d{4,11}(?:\s|$)/.test(qingLi)) return null
  if (/\d+\s*(?:栋|单元|室|号楼|楼|门)/.test(qingLi)) return null
  if (mingZi && mingZi.length > 0 && qingLi.includes(mingZi)) return null
  return qingLi
}

export function jieXiJSONNeiRong(
  neiRong: unknown,
  mingZi?: string,
): { dang_wei: string; gai_lv: number; xiao_xi_lie_biao: string[] } {
  if (typeof neiRong !== 'string') {
    throw new JiaoSeShengChengCuoWu(CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID)
  }
  const kaiShi = neiRong.indexOf('{')
  const jieShu = neiRong.lastIndexOf('}')
  if (kaiShi < 0 || jieShu <= kaiShi) {
    throw new JiaoSeShengChengCuoWu(CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID)
  }
  let jieGuo: unknown
  try {
    jieGuo = JSON.parse(neiRong.slice(kaiShi, jieShu + 1))
  } catch (cuoWu) {
    throw new JiaoSeShengChengCuoWu(CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID, cuoWu)
  }
  if (!jieGuo || typeof jieGuo !== 'object' || !Array.isArray((jieGuo as { xiao_xi_lie_biao?: unknown }).xiao_xi_lie_biao)) {
    throw new JiaoSeShengChengCuoWu(CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID)
  }
  const yuanLieBiao = (jieGuo as { xiao_xi_lie_biao: unknown[] }).xiao_xi_lie_biao
  if (yuanLieBiao.length === 0) {
    const dangWeiKong = jieXiZhuDongDangWei((jieGuo as { 主动程度?: unknown })['主动程度'])
    return { dang_wei: dangWeiKong, gai_lv: dangWeiZhuanGaiLv(dangWeiKong), xiao_xi_lie_biao: [] }
  }
  const xiaoXiLieBiao = yuanLieBiao
    .map((x: unknown) => (typeof x === 'string' ? anQuanGuoLvXiaoXi(x, mingZi) : null))
    .filter((x: string | null): x is string => x !== null)
    .slice(0, 5)
  if (xiaoXiLieBiao.length === 0) {
    throw new JiaoSeShengChengCuoWu(CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID)
  }
  const dangWei = jieXiZhuDongDangWei((jieGuo as { 主动程度?: unknown })['主动程度'])
  return { dang_wei: dangWei, gai_lv: dangWeiZhuanGaiLv(dangWei), xiao_xi_lie_biao: xiaoXiLieBiao }
}

export function jieXiZhuDongDangWei(zhi: unknown): string {
  const biao = AI配置.prompt.kaiChangBaiZhuDongDangWei
  const wenBen = typeof zhi === 'string' ? zhi.trim() : ''
  if (wenBen && Object.prototype.hasOwnProperty.call(biao, wenBen)) return wenBen
  for (const dangWei of Object.keys(biao)) {
    if (wenBen.includes(dangWei)) return dangWei
  }
  return AI配置.prompt.kaiChangBaiMoRenZhuDongDangWei
}

export function dangWeiZhuanGaiLv(dangWei: string): number {
  const biao = AI配置.prompt.kaiChangBaiZhuDongDangWei
  const zhi = biao[dangWei]
  if (typeof zhi !== 'number' || !Number.isFinite(zhi)) return AI配置.prompt.kaiChangBaiFaSongGaiLv
  return Math.min(0.95, Math.max(0.02, zhi))
}

function jiangJiKaiChangBai(canShu: KaiChangBaiShengChengCanShu): KaiChangBaiShengChengJieGuo {
  const houXuan: string[] = [
    '嗨', '哈喽', '在忙吗', '刚加好友，有点紧张', '今天课多吗',
    '看到朋友圈有点意思', '今天天气好好', '你的头像有点意思',
  ]
  const zuiDa = 3
  const tiaoShu = Math.floor(Math.random() * (zuiDa + 1))
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
  return {
    zhu_dong_dang_wei: AI配置.prompt.kaiChangBaiMoRenZhuDongDangWei,
    zhu_dong_kai_kou_gai_lv: AI配置.prompt.kaiChangBaiFaSongGaiLv,
    xiao_xi_lie_biao: guoLvHou.slice(0, 5),
  }
}

export async function shengChengKaiChangBai(
  canShu: KaiChangBaiShengChengCanShu,
  shangXiaWen?: 参数上下文,
): Promise<KaiChangBaiShengChengJieGuo> {
  if (kaiChangBaiMock) {
    const mockJieGuo = kaiChangBaiMock(canShu)
    const guoLvHou = mockJieGuo.xiao_xi_lie_biao
      .map((x) => anQuanGuoLvXiaoXi(x, canShu.ming_zi))
      .filter((x: string | null): x is string => x !== null)
    return {
      zhu_dong_dang_wei: mockJieGuo.zhu_dong_dang_wei || AI配置.prompt.kaiChangBaiMoRenZhuDongDangWei,
      zhu_dong_kai_kou_gai_lv:
        typeof mockJieGuo.zhu_dong_kai_kou_gai_lv === 'number'
          ? Math.min(0.95, Math.max(0.03, mockJieGuo.zhu_dong_kai_kou_gai_lv))
          : AI配置.prompt.kaiChangBaiFaSongGaiLv,
      xiao_xi_lie_biao: guoLvHou.slice(0, 5),
    }
  }

  const api密钥 = peiZhi.moRenMoXing.api密钥 || AI配置.moRenMoXing.api密钥
  if (!api密钥 || process.env.VITEST === 'true') {
    return jiangJiKaiChangBai(canShu)
  }

  const shangXiaWenShiJi = shangXiaWen ?? {
    jiaoSe: {
      ie_lei_xing: canShu.ie_lei_xing,
      re_shen_lei_xing: canShu.re_shen_lei_xing,
      shi_fou_zha_xing: canShu.shi_fou_zha_xing,
      xing_ge: canShu.xing_ge,
      yan_yu_feng_ge: canShu.yan_yu_feng_ge,
    },
  }

  let xiangYing: Awaited<ReturnType<typeof 按配置调用>>
  try {
    xiangYing = await 按配置调用('KaiChangBai' as keyof typeof AI配置.模型, [
      { jiaoSe: 'system', neiRong: '你现在就是这个人。刚加了一个刚认识的人，对方还没说话。你先判断自己会不会主动开口、开口发几条、发什么，全部由你自己的性格决定，不要做任何"应该主动一点"的道德判断，性格被动的人就是不主动。' },
      { jiaoSe: 'user', neiRong: gouJianKaiChangBaiTiShi(canShu) },
    ], shangXiaWenShiJi)
  } catch {
    return jiangJiKaiChangBai(canShu)
  }
  try {
    const { dang_wei, gai_lv, xiao_xi_lie_biao } = jieXiJSONNeiRong(xiangYing.neiRong, canShu.ming_zi)
    return { zhu_dong_dang_wei: dang_wei, zhu_dong_kai_kou_gai_lv: gai_lv, xiao_xi_lie_biao }
  } catch {
    return jiangJiKaiChangBai(canShu)
  }
}
