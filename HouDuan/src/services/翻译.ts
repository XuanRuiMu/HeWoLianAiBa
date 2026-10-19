import { huoQuFanYi } from '../config/translations'
import { tiaoYongDeepSeek } from '../utils/DeepSeek客户端'
import { debug日志 } from '../utils/debug日志'

export interface FanYiJieGuo {
  cheng_gong: boolean
  fan_yi?: string
  ti_shi?: string
}

export const FAN_YI_ZHI_CHI_YU_YAN = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'] as const

export type FanYiYuYan = (typeof FAN_YI_ZHI_CHI_YU_YAN)[number] | 'auto'

function guiFanYuYan(zhi: unknown, moRen: FanYiYuYan): FanYiYuYan {
  if (typeof zhi !== 'string') return moRen
  const qingLi = zhi.trim().toLowerCase()
  if (qingLi === '' || qingLi === 'auto' || qingLi === '自动') return 'auto'
  const yingShe: Record<string, FanYiYuYan> = {
    zh: 'zh', cn: 'zh', zhongwen: 'zh', '中文': 'zh',
    en: 'en', english: 'en', '英文': 'en',
    ja: 'ja', japanese: 'ja', '日文': 'ja', '日语': 'ja',
    ko: 'ko', korean: 'ko', '韩文': 'ko', '韩语': 'ko',
    fr: 'fr', french: 'fr', '法文': 'fr', '法语': 'fr',
    de: 'de', german: 'de', '德文': 'de', '德语': 'de',
    es: 'es', spanish: 'es', '西班牙文': 'es', '西班牙语': 'es',
    ru: 'ru', russian: 'ru', '俄文': 'ru', '俄语': 'ru',
  }
  return yingShe[qingLi] ?? moRen
}

const YU_YAN_MING: Record<string, string> = {
  zh: '中文', en: '英文', ja: '日文', ko: '韩文', fr: '法文', de: '德文', es: '西班牙文', ru: '俄文',
}

export async function fanYiWenBen(
  neiRong: string,
  yuanYu?: unknown,
  muBiaoYu?: unknown,
): Promise<FanYiJieGuo> {
  const yuan = (neiRong || '').trim()
  if (!yuan) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong') }
  }
  if (yuan.length > 500) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang') }
  }
  const yuanYuGuiFan = guiFanYuYan(yuanYu, 'auto')
  const muBiaoYuGuiFan = guiFanYuYan(muBiaoYu, 'zh')
  const muBiaoMing = YU_YAN_MING[muBiaoYuGuiFan] ?? '中文'
  const yuanShuoMing = yuanYuGuiFan === 'auto' ? '原文（可能为混合语言）' : YU_YAN_MING[yuanYuGuiFan] ?? '原文'
  try {
    const xiangYing = await tiaoYongDeepSeek(
      {
        xiaoXi: [
          {
            jiaoSe: 'system',
            neiRong: `你是翻译助手。将${yuanShuoMing}翻译为${muBiaoMing}。只输出译文，不要解释，不要加引号。`,
          },
          { jiaoSe: 'user', neiRong: yuan },
        ],
        wenDu: 0.1,
        siKaoMoShi: 'disabled',
        xiangYingGeShi: { type: 'text' },
      },
      'wenBenFanYi',
    )
    const yiWen = (xiangYing.neiRong || '').trim()
    if (!yiWen) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'fanYiShiBai') }
    }
    return { cheng_gong: true, fan_yi: yiWen }
  } catch (cuoWu) {
    debug日志.error('文本翻译', '翻译失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'fanYiShiBai') }
  }
}
