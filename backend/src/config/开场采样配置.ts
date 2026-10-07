/**
 * 开场采样配置（P2 · prefix 强制首字）。
 *
 * 全部数值走环境变量，禁硬编码（AGENTS.md「零硬编码 [P0]」）。
 * 范式对齐 backend/src/config/去AI味配置.ts。
 *
 * 背景见 PROGRESS-模拟真人聊天.md §3.5 / §8.1：
 *  AI 的开场复读率 73.65% vs 真人 0.69%（同场景内，1–2 条发言的短对话），
 *  但 LCCC 单段最长仅 14 条发言，AI 会话是 40 轮；真人复用率随对话长度单调上升
 *  （0% → 0.7% → 1.6% → 2.6% → 8.6%）。所以约束窗口取「最近 N 条」而非全部历史。
 */
import 开场采样表 from './开场采样表.json'

interface KaiChangBiao {
  kaiChang: string[]
  quanZhong: number[]
  _shouYong: number
  _fuHanLv: number
  _jiShu?: { faYanShu: number; kuaiShu: number }
}

const BIAO = 开场采样表 as unknown as KaiChangBiao

function duZhengShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = (process.env[ming] || '').trim()
  // ⚠️ 必须先判空串：Number('') === 0 且 isFinite(0) === true，
  //    若不拦会把默认值变成下限（实测：整张权重表塌成 1 项，机制退化为固定开场）。
  if (yuan === '') return moRen
  const shu = Number(yuan)
  if (!Number.isFinite(shu)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, shu))
}

/**
 * 解析布尔型环境变量的**唯一实现**。
 * ⚠️ 联调脚本与生产配置都必须用它——曾各自解析 `process.env`，
 *    导致 `TRUE` / `True` / ` true ` / `true\n` 下「候选确实注入了」但报告写「开关=off」
 *    （第五轮审查 P0-3）。口径分裂会让一次真实在跑的实验被描述成关闭。
 */
export function duJieBaoKaiGuan(ming: string): boolean {
  return (process.env[ming] || '').trim().toLowerCase() === 'true'
}

/** 机制 D 总开关的环境变量名（联调报告也用它，避免硬编码字符串漂移） */
export const KAI_CHANG_KAI_GUAN_MING = 'KAI_CHANG_QIAN_ZHI_QI_YONG'

export const KAI_CHANG_PEI_ZHI = {
  /** 总开关。关掉后 Writer 不注入任何开场约束，行为与改动前完全一致 */
  kaiGuan: duJieBaoKaiGuan(KAI_CHANG_KAI_GUAN_MING),
  /** 每轮给模型的候选开场数量 */
  houXuanGeShu: duZhengShu('KAI_CHANG_HOU_XUAN_GE_SHU', 5, 2, 12),
  /** 权重表条数上限（表本身有 200 条，这里再收窄便于灰度） */
  biaoTiaoShuXian: duZhengShu('KAI_CHANG_BIAO_TIAO_SHU', BIAO._shouYong, 1, BIAO._shouYong),
  /** 开发模式下打印注入的候选，便于核对 */
  kaiFaMoShi: (process.env['KAI_CHANG_KAI_FA_MO_SHI'] || '').trim().toLowerCase() === 'true',
} as const

/** 权重表（已按权重降序）。只暴露读，不暴露写。 */
export function huoQuKaiChangBiao(): { kaiChang: string[]; quanZhong: number[] } {
  const shu = Math.min(BIAO.kaiChang.length, KAI_CHANG_PEI_ZHI.biaoTiaoShuXian)
  return { kaiChang: BIAO.kaiChang.slice(0, shu), quanZhong: BIAO.quanZhong.slice(0, shu) }
}

export const KAI_CHANG_BIAO_YUAN_XIN = {
  shouYongShu: BIAO._shouYong,
  fuHanLv: BIAO._fuHanLv,
  kuaiShu: BIAO._jiShu?.kuaiShu ?? 0,
  faYanShu: BIAO._jiShu?.faYanShu ?? 0,
} as const
