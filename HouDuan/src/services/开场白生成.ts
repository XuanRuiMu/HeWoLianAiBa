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
    '第二步，决定条数：假设 TA 真的开口了，会发几条。话多热情的发 3~5 条，话少内向的发 1~2 条。',
    '第三步，写内容：写 TA 主动发出去的那几条消息。',
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
    '数量要求：消息 1~5 条（含 1 和 5），不要发 0 条。条数由 TA 的性格决定：越热情/开朗/快热/渣型，越可以发到 3~5 条；越害羞/慢热/高冷，发 1~2 条即可。',
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
    '{"主动程度": "中间型", "xiao_xi_lie_biao": ["消息1", "消息2"]}',
  ].filter(Boolean).join('\n')
}

const SHOU_JI_HAO_RE = /1[3-9]\d{9}/
const WEI_XIN_HAO_RE = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/

function anQuanGuoLvXiaoXi(neiRong: string, mingZi?: string): string | null {
  const qingLi = neiRong.trim()
  if (!qingLi) return null
  if (SHOU_JI_HAO_RE.test(qingLi)) return null
  const tokens = qingLi.split(/[\s,，。.!！?？:：;；]+/).filter(Boolean)
  for (const token of tokens) {
    if (WEI_XIN_HAO_RE.test(token)) return null
  }
  if (/qq|扣/i.test(qingLi) && /(?:^|\s)[1-9]\d{4,11}(?:\s|$)/.test(qingLi)) return null
  if (/\d+\s*(?:栋|单元|室|号楼|楼|门)/.test(qingLi)) return null
  if (mingZi && mingZi.length > 0 && qingLi.includes(mingZi)) return null
  return qingLi
}

function jieXiJSONNeiRong(
  neiRong: unknown,
  mingZi?: string,
): { dang_wei: string; gai_lv: number; xiao_xi_lie_biao: string[] } {
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
  const dangWei = jieXiZhuDongDangWei((jieGuo as { 主动程度?: unknown })['主动程度'])
  return { dang_wei: dangWei, gai_lv: dangWeiZhuanGaiLv(dangWei), xiao_xi_lie_biao: xiaoXiLieBiao }
}

export function jieXiZhuDongDangWei(zhi: unknown): string {
  const biao = AI_PEI_ZHI.prompt.kaiChangBaiZhuDongDangWei
  const wenBen = typeof zhi === 'string' ? zhi.trim() : ''
  if (wenBen && Object.prototype.hasOwnProperty.call(biao, wenBen)) return wenBen
  for (const dangWei of Object.keys(biao)) {
    if (wenBen.includes(dangWei)) return dangWei
  }
  return AI_PEI_ZHI.prompt.kaiChangBaiMoRenZhuDongDangWei
}

export function dangWeiZhuanGaiLv(dangWei: string): number {
  const biao = AI_PEI_ZHI.prompt.kaiChangBaiZhuDongDangWei
  const zhi = biao[dangWei]
  if (typeof zhi !== 'number' || !Number.isFinite(zhi)) return AI_PEI_ZHI.prompt.kaiChangBaiFaSongGaiLv
  return Math.min(0.95, Math.max(0.02, zhi))
}

function jiangJiKaiChangBai(canShu: KaiChangBaiShengChengCanShu): KaiChangBaiShengChengJieGuo {
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
  return {
    zhu_dong_dang_wei: AI_PEI_ZHI.prompt.kaiChangBaiMoRenZhuDongDangWei,
    zhu_dong_kai_kou_gai_lv: AI_PEI_ZHI.prompt.kaiChangBaiFaSongGaiLv,
    xiao_xi_lie_biao: guoLvHou.slice(0, 5),
  }
}

export async function shengChengKaiChangBai(
  canShu: KaiChangBaiShengChengCanShu,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<KaiChangBaiShengChengJieGuo> {
  if (kaiChangBaiMock) {
    const mockJieGuo = kaiChangBaiMock(canShu)
    const guoLvHou = mockJieGuo.xiao_xi_lie_biao
      .map((x) => anQuanGuoLvXiaoXi(x, canShu.ming_zi))
      .filter((x: string | null): x is string => x !== null)
    return {
      zhu_dong_dang_wei: mockJieGuo.zhu_dong_dang_wei || AI_PEI_ZHI.prompt.kaiChangBaiMoRenZhuDongDangWei,
      zhu_dong_kai_kou_gai_lv:
        typeof mockJieGuo.zhu_dong_kai_kou_gai_lv === 'number'
          ? Math.min(0.95, Math.max(0.03, mockJieGuo.zhu_dong_kai_kou_gai_lv))
          : AI_PEI_ZHI.prompt.kaiChangBaiFaSongGaiLv,
      xiao_xi_lie_biao: guoLvHou.slice(0, 5),
    }
  }

  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  if (!apiMiYao || process.env.VITEST === 'true') {
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

  let xiangYing: Awaited<ReturnType<typeof genJuPeiZhiTiaoYong>>
  try {
    xiangYing = await genJuPeiZhiTiaoYong('kaiChangBai' as keyof typeof AI_PEI_ZHI.moXing, [
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
