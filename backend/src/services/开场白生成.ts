import { AI_PEI_ZHI } from '../config/AI配置'
import { peiZhi } from '../config'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import type { MBTILeiXing } from '../config/角色配置'

export interface KaiChangBaiShengChengCanShu {
  mbti_lei_xing: MBTILeiXing
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: '慢热' | '快热'
  shi_fou_zha_xing: boolean
  xing_ge: string
  yan_yu_feng_ge: string
  xi_huan_de_lei_xing: string
  xing_bie: 'nan' | 'nv'
  ming_zi: string
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
  const xingBieMiaoShu = canShu.xing_bie === 'nv' ? '女生' : '男生'
  return [
    '想象一下：这个角色刚在微信上加了对方（一个刚认识的同学/朋友介绍的人），对方还没说话，TA 想主动发消息打个招呼。',
    `角色：MBTI ${canShu.mbti_lei_xing}，${canShu.ie_lei_xing} 型，${canShu.re_shen_lei_xing}，${xingBieMiaoShu}。`,
    `性格：${canShu.xing_ge}`,
    `说话风格：${canShu.yan_yu_feng_ge}`,
    `喜欢的类型：${canShu.xi_huan_de_lei_xing}`,
    canShu.shi_fou_zha_xing ? '这人设带点渣，更可能主动撩。' : '',
    '',
    '请按真实中国大学生微信聊天的风格，生成 TA 会主动发的开场消息。',
    '参考条数：',
    '1. 外向（E）+ 快热：通常连发 2~5 条。',
    '2. 外向（E）+ 慢热：通常发 1~3 条。',
    '3. 内向（I）型：本研究中内向型不会主动发开场消息（系统已在外层过滤，AI 无需处理）。',
    '4. 渣型变体会更主动，条数可上浮 1 条，最多 5 条。',
    '',
    '内容要求（必须严格遵守）：',
    '1. 像真实大学生微信聊天：可以用表情、简短问候、找话题、俏皮话、emoji，不要长篇大论。',
    '2. 严禁出现任何个人信息：姓名、名字、叫XX、我是XX、家乡、老家、学校、大学、学院、专业、年级、院系、班级、学号、宿舍、楼号、手机号、微信号、QQ号、生日、年龄、住址。',
    '3. 严禁包含角色真实姓名（系统会自动过滤，但 AI 也不应主动生成）。',
    '4. 严禁自说自话，如“让我想想怎么开场”“先自我介绍一下”等自我陈述话术。',
    '5. 每条消息独立一行，不超过 100 字。',
    '6. 内容必须是 TA 主动发起的，不能假设对方已经说话。',
    '',
    '按这个 JSON 格式输出，别加别的：',
    '{"xiao_xi_lie_biao": ["消息1", "消息2"]}',
  ].filter(Boolean).join('\n')
}

// 个人信息过滤禁词（基于"陌生人不会一上来就给个人信息"的现实逻辑）
const GE_REN_XIN_XI_JIN_CI = [
  // 姓名/名字
  '我叫', '我名', '我姓', '姓名', '名字', '叫我', '叫小', '叫大', '叫阿',
  // 自我介绍式
  '我是', '自我介绍', '介绍一下',
  // 地理
  '来自', '老家', '家乡', '故乡', '住在', '住址', '地址',
  // 学校
  '学校', '大学', '学院', '专业', '年级', '班级', '学号', '院系', '系所', '宿舍',
  // 联系方式
  '电话', '手机', '号码', 'QQ', 'qq', '微信', '昵称', '加我', '扫码',
  // 年龄生日
  '生日', '出生', '今年', '岁',
  // 楼栋门牌
  '号楼', '单元',
]

// 手机号正则（11位中国手机号）
const SHOU_JI_HAO_RE = /1[3-9]\d{9}/
// 微信号正则（字母开头，6-20位字母数字下划线减号）
const WEI_XIN_HAO_RE = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/

function anQuanGuoLvXiaoXi(neiRong: string, mingZi?: string): string | null {
  const qingLi = neiRong.trim()
  if (!qingLi) return null
  // 个人信息禁词
  for (const ci of GE_REN_XIN_XI_JIN_CI) {
    if (qingLi.includes(ci)) return null
  }
  // 手机号
  if (SHOU_JI_HAO_RE.test(qingLi)) return null
  // 微信号（独立 token 形式）
  const tokens = qingLi.split(/[\s,，。.!！?？:：;；]+/).filter(Boolean)
  for (const token of tokens) {
    if (WEI_XIN_HAO_RE.test(token)) return null
  }
  // 包含角色真实姓名
  if (mingZi && mingZi.length > 0 && qingLi.includes(mingZi)) return null
  return qingLi
}

function jieXiJSONNeiRong(neiRong: string, mingZi?: string): string[] {
  try {
    const jieGuo = JSON.parse(neiRong)
    if (Array.isArray(jieGuo.xiao_xi_lie_biao)) {
      return jieGuo.xiao_xi_lie_biao
        .map((x: unknown) => (typeof x === 'string' ? anQuanGuoLvXiaoXi(x, mingZi) : null))
        .filter((x: string | null): x is string => x !== null)
        .slice(0, 5)
    }
  } catch {
    return []
  }
  return []
}

/**
 * 根据人设决定开场消息条数范围。
 *
 * 基于 16personalities "Starting a Relationship" 调研（19,000+ 样本）：
 * 外向型（E）远比内向型（I）更可能主动发起关系（差距可达 40+ 个百分点）。
 * 内向型没有任何类型在主动发起上超过 35%，因此游戏规则简化为：
 *   - I 型：不发开场消息（max=0）
 *   - E 型：根据热身类型在 1~5 条范围
 *
 * @see https://www.16personalities.com/articles/how-different-personality-types-start-relationships-a-study
 */
export function genJuRenSheJueDingKaiChangBaiTiaoShu(canShu: KaiChangBaiShengChengCanShu): { zuiXiao: number; zuiDa: number } {
  // I 型不主动发开场消息
  if (canShu.ie_lei_xing !== 'E') {
    return { zuiXiao: 0, zuiDa: 0 }
  }

  let zuiXiao: number
  let zuiDa: number
  if (canShu.re_shen_lei_xing === '快热') {
    zuiXiao = 2
    zuiDa = 5
  } else {
    // E + 慢热
    zuiXiao = 1
    zuiDa = 3
  }

  if (canShu.shi_fou_zha_xing) {
    zuiDa = Math.min(5, zuiDa + 1)
  }

  return { zuiXiao, zuiDa }
}

function jiangJiKaiChangBai(canShu: KaiChangBaiShengChengCanShu): KaiChangBaiShengChengJieGuo {
  const { zuiXiao, zuiDa } = genJuRenSheJueDingKaiChangBaiTiaoShu(canShu)
  if (zuiDa <= 0) {
    return { xiao_xi_lie_biao: [] }
  }
  const tiaoShu = Math.max(zuiXiao, Math.floor(Math.random() * (zuiDa - zuiXiao + 1)) + zuiXiao)
  const tongYongNeiRong: Record<'nan' | 'nv', string[]> = {
    nan: ['嗨', '在忙吗', '刚加好友，有点紧张', '今天课多吗', '看到朋友圈有点意思'],
    nv: ['嗨', '哈喽', '刚加上，打个招呼', '今天天气好好', '你的头像有点意思'],
  }
  const houXuan = tongYongNeiRong[canShu.xing_bie]
  const jieGuo: string[] = []
  while (jieGuo.length < tiaoShu && jieGuo.length < houXuan.length) {
    const xiang = houXuan[Math.floor(Math.random() * houXuan.length)]
    if (!jieGuo.includes(xiang)) {
      jieGuo.push(xiang)
    }
  }
  return { xiao_xi_lie_biao: jieGuo.slice(0, 5) }
}

export async function shengChengKaiChangBai(
  canShu: KaiChangBaiShengChengCanShu,
): Promise<KaiChangBaiShengChengJieGuo> {
  // 主动型人格过滤：只有 E 型才发开场消息。
  // 此检查在 mock 之前，确保即使测试 mock 也不能让 I 型发送（防止回归）。
  const { zuiXiao, zuiDa } = genJuRenSheJueDingKaiChangBaiTiaoShu(canShu)
  if (zuiDa <= 0) {
    return { xiao_xi_lie_biao: [] }
  }

  if (kaiChangBaiMock) {
    // mock 结果也需经过安全过滤（与真实 AI 输出一致），再按人设条数上限截断。
    // 防止 mock 绕过姓名/手机号/微信号/个人信息禁词过滤。
    const mockJieGuo = kaiChangBaiMock(canShu)
    const guoLvHou = mockJieGuo.xiao_xi_lie_biao
      .map((x) => anQuanGuoLvXiaoXi(x, canShu.ming_zi))
      .filter((x: string | null): x is string => x !== null)
    return { xiao_xi_lie_biao: guoLvHou.slice(0, zuiDa) }
  }

  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  if (!apiMiYao || process.env.VITEST === 'true') {
    return jiangJiKaiChangBai(canShu)
  }

  try {
    const xiangYing = await genJuPeiZhiTiaoYong('kaiChangBai' as keyof typeof AI_PEI_ZHI.moXing, [
      { jiaoSe: 'system', neiRong: '你正在帮一个刚加上微信的中国大学生想主动发出的开场消息。' },
      { jiaoSe: 'user', neiRong: gouJianKaiChangBaiTiShi(canShu) },
    ])
    const xiaoXiLieBiao = jieXiJSONNeiRong(xiangYing.neiRong, canShu.ming_zi)
    if (xiaoXiLieBiao.length === 0) {
      return jiangJiKaiChangBai(canShu)
    }
    if (xiaoXiLieBiao.length < zuiXiao) {
      const jiangJi = jiangJiKaiChangBai(canShu)
      while (xiaoXiLieBiao.length < zuiXiao && jiangJi.xiao_xi_lie_biao.length > 0) {
        const xiang = jiangJi.xiao_xi_lie_biao.shift()
        if (xiang && !xiaoXiLieBiao.includes(xiang)) {
          xiaoXiLieBiao.push(xiang)
        }
      }
    }
    return { xiao_xi_lie_biao: xiaoXiLieBiao.slice(0, 5) }
  } catch {
    return jiangJiKaiChangBai(canShu)
  }
}
