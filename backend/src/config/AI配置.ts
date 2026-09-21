import './env'

export interface MoXingCanShu {
  moXing: string
  /** 仅非思考模式生效：官方规则思考模式下 temperature 不生效，故思考场景不配本字段（见 jiSuanAIChanShu 门控）。 */
  wenDu?: number
  /** 仅思考模式生效且下限 0.95：官方规则非思考模式 top_p 恒为 1.0，故非思考场景不配本字段。 */
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
    // 说明：按官方 Responses API（https://api-docs.deepseek.com/zh-cn/api/create-response），
    // 思考模式用 reasoning.effort 控制（取值 none/minimal/low/medium/high/xhigh/max，max = 最高强度）。
    // 采样参数按官方生效条件门控（见 guides/thinking_mode）：思考模式 temperature 不生效、top_p 下限 0.95；
    // 非思考模式 top_p 恒为 1.0。因此思考场景只配 top_p:0.95，非思考场景只配 wenDu，不留下永远不生效的死字段。
    // FP-05 YH-041 裁决：writer 保持 max（沉浸优先），其余启用思考场景一律 medium（先计量后 AB，灰度见 MO_XING_HUI_DU_CE_LUE）。
    // 注意：max_output_tokens 在 Responses API 中同时计入「可见输出 + 思维链 token」，
    // 思考模式下必须调大，否则思维链会把预算吃光导致可见输出被截断（response.incomplete）。
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
      top_p: 0.95,
      zuiDaTokens: 64000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'max',
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

    // M2 调用收敛：表白/互删/识破/神经病四连检合并为一次结构化输出
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
      // YH-054 开场白降档：保持思考开但预算32k→16k先计量（契约守卫要求思考场景≥32k此处为例外，单测已同步）
      // 根因：首轮双max贵但别一刀切；先计量后AB，灰度回32k走HUI_DU_KAICHANGBAI_QI_YONG
      zuiDaTokens: 16000,
      siKaoMoShi: 'enabled',
      reasoningEffort: 'medium',
      xiangYingGeShi: { type: 'json_object' },
    } as MoXingCanShu,

    // 开场白发送概率决策模型（轻量）：仅输出一个 10~90 的概率数字，
    // 用于"画像驱动的 10%~90% 动态门控"，与内容生成模型解耦以极致压缩开销。
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
    // 历史消息条数：调到尽可能大（普通对话 200 条、军师 100 条）。
    // 撑爆上下文窗口的真正护栏是本键与「单条消息落库 500 字符」两道硬上限：
    // (200+步长)×500 字符 ≈ 7.5 万 token，对 1M 窗口（deepseek-flash / V4.1-Flash）留足余量。
    // 客户端预算保护 shangXiaWenTokenYuSuan 只能整条丢弃非 system 消息，而 Writer/Director 的历史
    // 是渲染进单条 user 的一整段文本，触顶时它裁不动，只能告警——不要把它当成防 400 的依赖。
    liShiXiaoXiShuLiang: 200,
    junShiLiShiXiaoXiShuLiang: 100,
    // 历史窗口淘汰步长：条数超过 liShiXiaoXiShuLiang 后不逐条丢，攒满本步长才整体前移一次，
    // 使多轮之间的历史段前缀字节完全一致，从而命中官方上下文硬盘缓存（缓存按最长公共前缀匹配）。
    liShiCaiDuanBuZhang: 40,
    // 上下文 token 预算（估算口径：字符数×0.6，图像每张按官方上限 1024）。超预算时整条丢弃最旧的非 system 消息，
    // 裁不动时告警（见 utils/DeepSeek客户端.ts::yuSuanBaoHu）。
    shangXiaWenTokenYuSuan: 60000,
    // FP-08 单次 AI 调用最多注入的图片内容块数。作用域已从「全部历史图片」收窄为
    // 「本轮尚未被模型看过的用户图片」（见 services/对话渲染.ts::zhuRuBenLunTuXiangKuai）：
    // 历史图片每轮全量重投会让同一张表情包在模型眼里出现 N 次，直接导致「对方又发了狗头」臆造。
    // 本键现仅作内存/token 兜底（连发一大串图时不一次读入全部 base64），不再是跨轮累积上限。
    benLunTuXiangZuiDuoZhuRuShu: 8,
    jiaoSeChenJinZhiLing: '【从现在起，你就是TA】',
    // 开场白发送概率的兜底默认值（仅当无 AI key 或 AI 概率计算失败时退回，或测试环境）。
    // 主流程已由"AI 根据人物画像动态算出 10%~90% 概率"取代（见 services/开场白概率.ts）。
    kaiChangBaiFaSongGaiLv: 0.5,
  },

  // FP-05 YH-047 好感双真相：本块仅为文档化镜像，唯一真相源为 config/好感度配置.ts 的 HAO_GAN_DU_PEI_ZHI；
  // 打分与落库一律经 services/好感度.ts 消费 HAO_GAN_DU_PEI_ZHI.quanZhong/fanWei/shuaiJian，此处数值须与其保持一致，
  // 不一致时以 HAO_GAN_DU_PEI_ZHI 为准（FP05_好感双真相单测断言双源一致）。
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

  // FP-04 YH-032 分类重试退避熔断与 YH-038 上下文预算统一口径（环境变量可配，热重载经 AI_PEI_ZHI 只读快照需重启生效）
  zhongShi: {
    keZhongShiZuiDaCiShu: 2,
    tuiBiJiChuHaoMiao: 2000,
    tuiBiZuiDaHaoMiao: 8000,
    rongDuanLianXuShiBaiYuZhi: 5,
    rongDuanLengQueHaoMiao: 60 * 1000,
  },

  biaoBai: {
    zhuDongYuZhi: 800,
  },

  zhaiYao: {
    // 事实卡 8 个字段行、每行上限 25 字（含字段名与冒号约 234 字），留出余量；上限由
    // Prompt构建器::gouJianJiYiZhaiYaoPrompt 与 对话摘要::qieDuanZhaiYao 共用，两处不得各写一个数
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
  writer: duQuHuiDu('writer', [
    { mingCheng: 'chenJinMax', biLi: 90, reasoningEffort: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, reasoningEffort: 'medium' },
  ]),
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
