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
    '想象一下，这个角色刚加上对方微信，对方还没说话。',
    `角色：MBTI ${canShu.mbti_lei_xing}，${canShu.ie_lei_xing} 型，${canShu.re_shen_lei_xing}，${xingBieMiaoShu}。`,
    `性格：${canShu.xing_ge}`,
    `说话风格：${canShu.yan_yu_feng_ge}`,
    `喜欢的类型：${canShu.xi_huan_de_lei_xing}`,
    canShu.shi_fou_zha_xing ? '这人设带点渣，更可能主动撩。' : '',
    '',
    '看看 TA 会主动发第一条消息吗？发几条、发什么？',
    '参考：',
    '1. 内向（I）+ 慢热：大概率不发，也可能只发 1 条试探。',
    '2. 外向（E）+ 快热：可能连发 2~5 条。',
    '3. 外向（E）+ 慢热：可能发 1~3 条。',
    '4. 内向（I）+ 快热：可能发 0~2 条。',
    '5. 渣型变体会更主动，条数可上浮 1 条。',
    '6. 内容要像真实大学生微信聊天：表情、简短问候、找话题都行。',
    '7. 别出现姓名、家乡、学校、专业、年级、班级、学号、手机号、微信号等个人信息。',
    '8. 别提“开场白”“让我想想怎么开场”这种自说自话。',
    '9. 每条消息独立一行，别超过 100 字。',
    '',
    '按这个 JSON 格式输出，别加别的：',
    '{"xiao_xi_lie_biao": ["消息1", "消息2"]}',
  ].filter(Boolean).join('\n')
}

function anQuanGuoLvXiaoXi(neiRong: string): string | null {
  const qingLi = neiRong.trim()
  if (!qingLi) return null
  const jinCi = ['我叫', '我是', '来自', '家乡', '学校', '大学', '学院', '专业', '年级', '班级', '学号', '电话', '手机', '微信号']
  for (const ci of jinCi) {
    if (qingLi.includes(ci)) return null
  }
  return qingLi
}

function jieXiJSONNeiRong(neiRong: string): string[] {
  try {
    const jieGuo = JSON.parse(neiRong)
    if (Array.isArray(jieGuo.xiao_xi_lie_biao)) {
      return jieGuo.xiao_xi_lie_biao
        .map((x: unknown) => (typeof x === 'string' ? anQuanGuoLvXiaoXi(x) : null))
        .filter((x: string | null): x is string => x !== null)
        .slice(0, 5)
    }
  } catch {
    return []
  }
  return []
}

export function genJuRenSheJueDingKaiChangBaiTiaoShu(canShu: KaiChangBaiShengChengCanShu): { zuiXiao: number; zuiDa: number } {
  let zuiXiao = 0
  let zuiDa = 0
  if (canShu.ie_lei_xing === 'E') {
    if (canShu.re_shen_lei_xing === '快热') {
      zuiXiao = 2
      zuiDa = 5
    } else {
      zuiXiao = 1
      zuiDa = 3
    }
  } else {
    if (canShu.re_shen_lei_xing === '快热') {
      zuiXiao = 0
      zuiDa = 2
    } else {
      zuiXiao = 0
      zuiDa = 1
    }
  }

  if (canShu.shi_fou_zha_xing) {
    zuiDa = Math.min(5, zuiDa + 1)
    if (zuiXiao === 0) {
      zuiXiao = 1
    }
  }

  return { zuiXiao, zuiDa }
}

function jiangJiKaiChangBai(canShu: KaiChangBaiShengChengCanShu): KaiChangBaiShengChengJieGuo {
  const { zuiXiao, zuiDa } = genJuRenSheJueDingKaiChangBaiTiaoShu(canShu)
  if (zuiDa <= 0 || (zuiXiao === 0 && Math.random() > 0.3)) {
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
  if (kaiChangBaiMock) {
    return kaiChangBaiMock(canShu)
  }

  const { zuiXiao, zuiDa } = genJuRenSheJueDingKaiChangBaiTiaoShu(canShu)
  if (zuiDa <= 0) {
    return { xiao_xi_lie_biao: [] }
  }

  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  if (!apiMiYao || process.env.VITEST === 'true') {
    return jiangJiKaiChangBai(canShu)
  }

  try {
    const xiangYing = await genJuPeiZhiTiaoYong('kaiChangBai' as keyof typeof AI_PEI_ZHI.moXing, [
      { jiaoSe: 'system', neiRong: '你正在帮一个刚加上微信的中国大学生想开场消息。' },
      { jiaoSe: 'user', neiRong: gouJianKaiChangBaiTiShi(canShu) },
    ])
    const xiaoXiLieBiao = jieXiJSONNeiRong(xiangYing.neiRong)
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
