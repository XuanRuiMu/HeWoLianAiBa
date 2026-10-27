import './env'

// Writer 默认走非思考模式。
// 依据一：ACL 2025《Reasoning Does Not Necessarily Improve Role-Playing Ability》
//   实测开 CoT 反而降低角色扮演能力，机制是注意力稀释与风格漂移（推理痕迹写进正文）。
// 依据二：本项目实机实测，Writer 开思考时会把 Director 给的正确策略执行走样——
//   Director 策略是「不追问太多，轻轻接住，问一句是身体累还是心里累」，
//   Writer 却输出「这么晚还没睡……要不要我陪你打会儿语音，不想说也没关系」，
//   正是本项目自己登记的「长篇安慰+给建议+收尾」病灶。
// 依据三：DeepSeek 思考模式下 temperature 不生效，AI参数策略里按人设微调温度的整条链路
//   （E型/快热/渣型/关系阶段/场景）会变成死代码。
// 思考留给 Director：它要做的判断（该不该接、接哪个点、情绪）本来就适合推理；
// Writer 的任务是执行，不是分析。
export const XIE_SHOU_SI_KAO =
  (process.env['WRITER_SI_KAO_QI_YONG'] || 'false').trim().toLowerCase() === 'true'

export const XIE_SHOU_WEN_DU = Math.min(
  2,
  Math.max(0, parseFloat(process.env.WRITER_WENDU || '0.9') || 0.9),
)

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
      zuiDaTokens: 4000,
      siKaoMoShi: XIE_SHOU_SI_KAO ? 'enabled' : 'disabled',
      ...(XIE_SHOU_SI_KAO
        ? { reasoningEffort: process.env['WRITER_SI_KAO_QIANG_DU'] || 'medium' }
        : { wenDu: XIE_SHOU_WEN_DU }),
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
