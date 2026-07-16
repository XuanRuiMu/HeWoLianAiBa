export interface MoXingCanShu {
  moXing: string
  wenDu: number
  zuiDaTokens?: number
  enableThinking?: boolean
  reasoningEffort?: string
  xiangYingGeShi?: {
    type: 'json_object' | 'text'
  }
}

export const AI_PEI_ZHI = {
  deepSeek: {
    apiMiYao: process.env.DEEPSEEK_API_KEY || '',
    jiChuUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    tongYongCanShu: {
      topP: 1,
    },
  },

  moXing: {
    director: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.3,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 2000,
    } as MoXingCanShu,

    writer: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.85,
      enableThinking: true,
      reasoningEffort: 'max',
      zuiDaTokens: 2000,
    } as MoXingCanShu,

    qingGanFenXi: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.2,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    haoGanDuPingPan: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.2,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    jiYiZhaiYao: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.3,
      zuiDaTokens: 1000,
    } as MoXingCanShu,

    anQuanShenHe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.1,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    guanJianShiJian: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.2,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    junShiQiuZhu: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.85,
      zuiDaTokens: 1500,
    } as MoXingCanShu,

    biaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.1,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    huShanJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.1,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    shiPoJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.1,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    jieShouBiaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.1,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    shenJingBingJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.1,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 500,
    } as MoXingCanShu,

    kaiChangBai: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.75,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 1000,
    } as MoXingCanShu,

    fuPanShengCheng: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      wenDu: 0.7,
      xiangYingGeShi: { type: 'json_object' },
      zuiDaTokens: 3000,
    } as MoXingCanShu,

  },

  prompt: {
    liShiXiaoXiShuLiang: 20,
    junShiLiShiXiaoXiShuLiang: 10,
    jiaoSeChenJinZhiLing: '【从现在起，你就是 TA】',
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
