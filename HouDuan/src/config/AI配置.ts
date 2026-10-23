import './env'

export interface MoXingCanShu {
  moXing: string
  wenDu?: number
  top_p?: number
  zuiDaTokens?: number
  siKaoMoShi?: 'enabled' | 'disabled'
  reasoningEffort?: string
  xiangYingGeShi?: {
    type: 'json_object' | 'text'
  }
}

export const AI_PEI_ZHI = {
  deepSeek: {
    apiMiYao: process.env.DEEPSEEK_API_KEY || '',
    jiChuUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
  },

  moXing: {
    director: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      zuiDaTokens: 32000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'medium',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    writer: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: Math.min(2, Math.max(0, parseFloat(process.env.WRITER_WENDU || '1.0') || 1.0)),
      zuiDaTokens: 4000,
      siKaoMoShi: 'disabled',
    } as MoXingCanShu,

    qingGanFenXi: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.2,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    haoGanDuPingPan: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.2,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jiYiZhaiYao: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      zuiDaTokens: 32000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'medium',
    } as MoXingCanShu,

    anQuanShenHe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    guanJianShiJian: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.2,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    junShiQiuZhu: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      zuiDaTokens: 64000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'medium',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    biaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    huShanJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    shiPoJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jieShouBiaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    shenJingBingJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    tuPianShenHe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    siLianJian: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jiaoSeJingGaoFanYing: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      zuiDaTokens: 32000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    kaiChangBai: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      zuiDaTokens: 16000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'medium',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    kaiChangBaiGaiLv: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0,
      zuiDaTokens: 30,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'text' },
    } as MoXingCanShu,

    fuPanShengCheng: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      zuiDaTokens: 64000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'medium',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

  },

  prompt: {
    liShiXiaoXiShuLiang: 200,
    junShiLiShiXiaoXiShuLiang: 100,
    liShiCaiDuanBuZhang: 40,
    shangXiaWenTokenYuSuan: 60000,
    benLunTuXiangZuiDuoZhuRuShu: 8,
    jiaoSeChenJinZhiLing: '【从现在起，你就是TA】',
    kaiChangBaiFaSongGaiLv: 0.5,
    kaiChangBaiZhuDongDangWei: {
      主动型: 0.85,
      中间型: 0.35,
      被动型: 0.05,
      极被动型: 0.02,
    } as Record<string, number>,
    kaiChangBaiMoRenZhuDongDangWei: '中间型',
  },

  haoGanDu: {
    xinRenQuanZhong: 0.35,
    qinMiQuanZhong: 0.25,
    quWeiQuanZhong: 0.2,
    guanHuaiQuanZhong: 0.2,
    zuiDaBianHua: 60,
    zuiXiaoBianHua: -60,
    zongFenShangXian: 1000,
    zongFenXiaXian: 0,
  },

  zhongShi: {
    keZhongShiZuiDaCiShu: 2,
    tuiBiJiChuHaoMiao: 2000,
    tuiBiZuiDaHaoMiao: 8000,
    rongDuanLianXuShiBaiYuZhi: 5,
    rongDuanLengQueHaoMiao: 60 * 1000,
  },

  kongXiangYing: {
    zuiDaCiShu: 3,
    tuiBiJiChuHaoMiao: 5000,
    tuiBiZuiDaHaoMiao: 20000,
  },

  biaoBai: {
    zhuDongYuZhi: 800,
  },

  zhaiYao: {
    zuiDaZiFu: 300,
    chuFaXiaoXiShu: 40,
    yuanLiaoXiaoXiShu: 60,
    suoTtlMiao: 10 * 60,
  },

  xiangYingGeShi: {
    wenBen: 'text',
    json: 'json_object',
  },
} as const

export interface MoXingHuiDuFenZu {
  mingCheng: string
  biLi: number
  reasoningEffort?: string
}

export interface MoXingHuiDuCeLue {
  qiYong: boolean
  fenZu: MoXingHuiDuFenZu[]
}

function duQuHuiDu(moXingLeiXing: string, moRenFenZu: MoXingHuiDuFenZu[]): MoXingHuiDuCeLue {
  const kaiGuan = (process.env[`HUI_DU_${moXingLeiXing.toUpperCase()}_QI_YONG`] || '').trim().toLowerCase()
  const qiYong = kaiGuan === '1' || kaiGuan === 'true' || kaiGuan === 'yes' || kaiGuan === 'on'
  if (!qiYong) return { qiYong: false, fenZu: moRenFenZu.slice(0, 1) }
  const yuanWen = process.env[`HUI_DU_${moXingLeiXing.toUpperCase()}_FEN_ZU`]
  if (!yuanWen) return { qiYong: true, fenZu: moRenFenZu }
  try {
    const jieXi = JSON.parse(yuanWen) as MoXingHuiDuFenZu[]
    const guoLv = jieXi.filter((zu) => typeof zu.mingCheng === 'string' && typeof zu.biLi === 'number' && zu.biLi > 0)
    if (guoLv.length === 0) return { qiYong: true, fenZu: moRenFenZu }
    return { qiYong: true, fenZu: guoLv }
  } catch {
    return { qiYong: true, fenZu: moRenFenZu }
  }
}

export function xuanZeHuiDuFenZu(
  ceLue: MoXingHuiDuCeLue,
  suiJiShu: number = Math.random(),
): MoXingHuiDuFenZu {
  const zong = ceLue.fenZu.reduce((he, zu) => he + zu.biLi, 0)
  let leiJi = 0
  for (const zu of ceLue.fenZu) {
    leiJi += zu.biLi / zong
    if (suiJiShu < leiJi) return zu
  }
  return ceLue.fenZu[ceLue.fenZu.length - 1]
}

export const MO_XING_HUI_DU_CE_LUE: Record<string, MoXingHuiDuCeLue> = {
  director: duQuHuiDu('director', [
    { mingCheng: 'gaoJingQueMax', biLi: 90, reasoningEffort: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, reasoningEffort: 'medium' },
  ]),
  junShiQiuZhu: duQuHuiDu('junShiQiuZhu', [
    { mingCheng: 'jiZhun', biLi: 100, reasoningEffort: 'medium' },
  ]),
  kaiChangBai: duQuHuiDu('kaiChangBai', [
    { mingCheng: 'chenJinMax', biLi: 80, reasoningEffort: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 20, reasoningEffort: 'medium' },
  ]),
  jiYiZhaiYao: duQuHuiDu('jiYiZhaiYao', [
    { mingCheng: 'wenDingMax', biLi: 90, reasoningEffort: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, reasoningEffort: 'medium' },
  ]),
  fuPanShengCheng: duQuHuiDu('fuPanShengCheng', [
    { mingCheng: 'fuPanMax', biLi: 90, reasoningEffort: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, reasoningEffort: 'medium' },
  ]),
}

export type AIMoXingLeiXing = keyof typeof AI_PEI_ZHI.moXing

export function yingYongHuiDuCanShu(
  moXingLeiXing: string,
  jiChu: MoXingCanShu,
  suiJiShu: number = Math.random(),
): MoXingCanShu {
  const ceLue = MO_XING_HUI_DU_CE_LUE[moXingLeiXing]
  if (!ceLue || !ceLue.qiYong) return jiChu
  const fenZu = xuanZeHuiDuFenZu(ceLue, suiJiShu)
  return {
    ...jiChu,
    reasoningEffort: fenZu.reasoningEffort || jiChu.reasoningEffort,
  }
}
