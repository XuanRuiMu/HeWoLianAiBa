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
export const 写手思考 =
  (process.env['WRITER_SI_KAO_QI_YONG'] || 'false').trim().toLowerCase() === 'true'

export const 写手温度 = Math.min(
  2,
  Math.max(0, parseFloat(process.env.WRITER_WENDU || '0.9') || 0.9),
)

export interface MoXingCanShu {
  模型: string
  wenDu?: number
  top_p?: number
  最大Tokens?: number
  思考模式?: 'enabled' | 'disabled'
  思考强度?: string
  响应格式?: {
    type: 'json_object' | 'text'
  }
}

export const AI配置 = {
  deepSeek: {
    api密钥: process.env.DEEPSEEK_API_KEY || '',
    基础地址: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
  },

  模型: {
    DaoYan: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      最大Tokens: 32000,
      思考模式: 'enabled',
      思考强度: 'medium',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    XieShou: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      最大Tokens: 4000,
      思考模式: 写手思考 ? 'enabled' : 'disabled',
      ...(写手思考
        ? { 思考强度: process.env['WRITER_SI_KAO_QIANG_DU'] || 'medium' }
        : { wenDu: 写手温度 }),
    } as MoXingCanShu,

    QingGanFenXi: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.2,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    HaoGanDuPingPan: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.2,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    JiYiZhaiYao: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      最大Tokens: 32000,
      思考模式: 'enabled',
      思考强度: 'medium',
    } as MoXingCanShu,

    AnQuanShenHe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    RenSheShenHe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0,
      最大Tokens: 2000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    RenSheKa: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.9,
      最大Tokens: 1000,
      思考模式: 'disabled',
    } as MoXingCanShu,

    GuanJianShiJian: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.2,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    JunShiQiuZhu: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      最大Tokens: 64000,
      思考模式: 'enabled',
      思考强度: 'medium',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    BiaoBaiJianCe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    HuShanJianCe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    ShiPoJianCe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    JieShouBiaoBaiJianCe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    ShenJingBingJianCe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    TuPianShenHe: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    SiLianJian: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    JiaoSeJingGaoFanYing: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0.1,
      最大Tokens: 32000,
      思考模式: 'disabled',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    KaiChangBai: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      最大Tokens: 16000,
      思考模式: 'enabled',
      思考强度: 'medium',
      响应格式: { type: 'json_object' },
    } as MoXingCanShu,

    KaiChangBaiGaiLv: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      wenDu: 0,
      最大Tokens: 30,
      思考模式: 'disabled',
      响应格式: { type: 'text' },
    } as MoXingCanShu,

    FuPanShengCheng: {
      模型: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
      top_p: 0.95,
      最大Tokens: 64000,
      思考模式: 'enabled',
      思考强度: 'medium',
      响应格式: { type: 'json_object' },
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

  响应格式: {
    wenBen: 'text',
    json: 'json_object',
  },
} as const

export interface 模型灰度分组 {
  mingCheng: string
  biLi: number
  思考强度?: string
}

export interface 模型灰度策略 {
  qiYong: boolean
  fenZu: 模型灰度分组[]
}

function duQuHuiDu(模型类型: string, moRenFenZu: 模型灰度分组[]): 模型灰度策略 {
  const kaiGuan = (process.env[`HUI_DU_${模型类型.toUpperCase()}_QI_YONG`] || '').trim().toLowerCase()
  const qiYong = kaiGuan === '1' || kaiGuan === 'true' || kaiGuan === 'yes' || kaiGuan === 'on'
  if (!qiYong) return { qiYong: false, fenZu: moRenFenZu.slice(0, 1) }
  const yuanWen = process.env[`HUI_DU_${模型类型.toUpperCase()}_FEN_ZU`]
  if (!yuanWen) return { qiYong: true, fenZu: moRenFenZu }
  try {
    const jieXi = JSON.parse(yuanWen) as 模型灰度分组[]
    const guoLv = jieXi.filter((zu) => typeof zu.mingCheng === 'string' && typeof zu.biLi === 'number' && zu.biLi > 0)
    if (guoLv.length === 0) return { qiYong: true, fenZu: moRenFenZu }
    return { qiYong: true, fenZu: guoLv }
  } catch {
    return { qiYong: true, fenZu: moRenFenZu }
  }
}

export function xuanZeHuiDuFenZu(
  ceLue: 模型灰度策略,
  suiJiShu: number = Math.random(),
): 模型灰度分组 {
  const zong = ceLue.fenZu.reduce((he, zu) => he + zu.biLi, 0)
  let leiJi = 0
  for (const zu of ceLue.fenZu) {
    leiJi += zu.biLi / zong
    if (suiJiShu < leiJi) return zu
  }
  return ceLue.fenZu[ceLue.fenZu.length - 1]
}

export const 模型灰度策略: Record<string, 模型灰度策略> = {
  DaoYan: duQuHuiDu('DaoYan', [
    { mingCheng: 'gaoJingQueMax', biLi: 90, 思考强度: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, 思考强度: 'medium' },
  ]),
  JunShiQiuZhu: duQuHuiDu('JunShiQiuZhu', [
    { mingCheng: 'jiZhun', biLi: 100, 思考强度: 'medium' },
  ]),
  KaiChangBai: duQuHuiDu('KaiChangBai', [
    { mingCheng: 'chenJinMax', biLi: 80, 思考强度: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 20, 思考强度: 'medium' },
  ]),
  JiYiZhaiYao: duQuHuiDu('JiYiZhaiYao', [
    { mingCheng: 'wenDingMax', biLi: 90, 思考强度: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, 思考强度: 'medium' },
  ]),
  FuPanShengCheng: duQuHuiDu('FuPanShengCheng', [
    { mingCheng: 'fuPanMax', biLi: 90, 思考强度: 'max' },
    { mingCheng: 'shouLianMedium', biLi: 10, 思考强度: 'medium' },
  ]),
}

export type AI模型类型 = keyof typeof AI配置.模型

export function yingYongHuiDuCanShu(
  模型类型: string,
  jiChu: MoXingCanShu,
  suiJiShu: number = Math.random(),
): MoXingCanShu {
  const ceLue = 模型灰度策略[模型类型]
  if (!ceLue || !ceLue.qiYong) return jiChu
  const fenZu = xuanZeHuiDuFenZu(ceLue, suiJiShu)
  return {
    ...jiChu,
    思考强度: fenZu.思考强度 || jiChu.思考强度,
  }
}
