export interface MoXingCanShu {
  moXing: string
  wenDu: number
  top_p?: number
  zuiDaTokens?: number
  siKaoMoShi?: 'enabled' | 'disabled'
  xiangYingGeShi?: {
    type: 'json_object' | 'text'
  }
}

export const AI_PEI_ZHI = {
  deepSeek: {
    apiMiYao: process.env.DEEPSEEK_API_KEY || '',
    jiChuUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  },

  moXing: {
    // 说明：官方文档规定思考模式下 temperature 等采样参数不生效，
    // 为使各场景温度/采样参数真正生效，全部场景显式关闭思考模式（siKaoMoShi: 'disabled'）。
    director: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.3,
      top_p: 0.4,
      zuiDaTokens: 2000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    writer: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.85,
      top_p: 0.95,
      zuiDaTokens: 2000,
      siKaoMoShi: 'disabled',
    } as MoXingCanShu,

    qingGanFenXi: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.2,
      top_p: 0.2,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    haoGanDuPingPan: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.2,
      top_p: 0.2,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jiYiZhaiYao: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.3,
      top_p: 0.5,
      zuiDaTokens: 1000,
      siKaoMoShi: 'disabled',
    } as MoXingCanShu,

    anQuanShenHe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    guanJianShiJian: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.2,
      top_p: 0.2,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    junShiQiuZhu: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.85,
      top_p: 0.9,
      zuiDaTokens: 1500,
      siKaoMoShi: 'disabled',
    } as MoXingCanShu,

    biaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    huShanJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    shiPoJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jieShouBiaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    shenJingBingJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 500,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    kaiChangBai: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.75,
      top_p: 0.9,
      zuiDaTokens: 1000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    fuPanShengCheng: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.7,
      top_p: 0.85,
      zuiDaTokens: 3000,
      siKaoMoShi: 'disabled',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

  },

  prompt: {
    liShiXiaoXiShuLiang: 20,
    junShiLiShiXiaoXiShuLiang: 10,
    jiaoSeChenJinZhiLing: '【从现在起，你就是TA】',
  },

  haoGanDu: {
    xinRenQuanZhong: 0.35,
    qinMiQuanZhong: 0.25,
    quWeiQuanZhong: 0.2,
    guanHuaiQuanZhong: 0.2,
    zuiDaBianHua: 3,
    zuiXiaoBianHua: -3,
    zongFenShangXian: 1000,
    zongFenXiaXian: 0,
  },

  xiangYingGeShi: {
    wenBen: 'text',
    json: 'json_object',
  },
} as const

export type AIMoXingLeiXing = keyof typeof AI_PEI_ZHI.moXing
