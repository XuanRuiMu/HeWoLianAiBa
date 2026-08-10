export interface MoXingCanShu {
  moXing: string
  wenDu: number
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
    moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  },

  moXing: {
    // 说明：按官方 Responses API（https://api-docs.deepseek.com/zh-cn/api/create-response），
    // 思考模式用 reasoning.effort 控制（取值 none/minimal/low/medium/high/xhigh/max，max = 最高强度）。
    // 思考模式下 temperature/top_p 不生效——这是用户明确要求的取舍（要最高思考强度，放弃温度控制）。
    // 因此全部场景开启思考，且 effort = max（最高思考强度）。
    // 注意：max_output_tokens 在 Responses API 中同时计入「可见输出 + 思维链 token」，
    // 思考模式下必须调大，否则思维链会把预算吃光导致可见输出被截断（response.incomplete）。
    director: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.3,
      top_p: 0.4,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    writer: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.85,
      top_p: 0.95,
      zuiDaTokens: 16000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
    } as MoXingCanShu,

    qingGanFenXi: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.2,
      top_p: 0.2,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    haoGanDuPingPan: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.2,
      top_p: 0.2,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jiYiZhaiYao: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.3,
      top_p: 0.5,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
    } as MoXingCanShu,

    anQuanShenHe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    guanJianShiJian: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.2,
      top_p: 0.2,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    junShiQiuZhu: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.85,
      top_p: 0.9,
      zuiDaTokens: 16000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
    } as MoXingCanShu,

    biaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    huShanJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    shiPoJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    jieShouBiaoBaiJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    shenJingBingJianCe: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.1,
      top_p: 0.1,
      zuiDaTokens: 8000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    kaiChangBai: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.75,
      top_p: 0.9,
      zuiDaTokens: 12000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    fuPanShengCheng: {
      moXing: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      wenDu: 0.7,
      top_p: 0.85,
      zuiDaTokens: 16000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

  },

  prompt: {
    // 历史消息条数：调到尽可能大（普通对话 200 条、军师 100 条）。
    // 配合 shangXiaWenTokenYuSuan 的客户端预算保护，长对话也不会撑爆上下文窗口导致 400。
    liShiXiaoXiShuLiang: 200,
    junShiLiShiXiaoXiShuLiang: 100,
    // 上下文 token 预算（保守估算：字符数/2）。超过时自动丢弃最旧的非系统消息。
    shangXiaWenTokenYuSuan: 60000,
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
