import { fanYi, type FanYiFenLei } from '../config/translations'
import type { YouXiJieGuoLeiXing } from '../types'
import type { 角色性别 } from './性别'

export type 结局解析结果 = YouXiJieGuoLeiXing | 'jinxing_zhong'

/** 趣味文案池类目：值是候选句数组而非单条文案，故与其余「字符串类目」分开建模。 */
type 池类目 = 'jieGuoTongGuanChi' | 'jieGuoShiBaiChi'

type 文本类目 = Exclude<FanYiFenLei, 池类目>

const 全部分类: { [F in 文本类目]: Readonly<Record<string, string>> } = fanYi

const 池类目表: { [F in 池类目]: Readonly<Record<string, readonly string[]>> } = fanYi

const 性别变体文案表: Readonly<Record<string, string>> = 全部分类.xingBieBianTi

const 中性文案表: Readonly<Record<string, string>> = 全部分类.jieJu

export function 渲染性别变体文案(分类: 文本类目, 键: string, 性别: 角色性别): string {
  return 性别变体文案表[`${分类}.${键}.${性别}`] ?? 全部分类[分类][键] ?? ''
}

export const 结局枚举列表: readonly YouXiJieGuoLeiXing[] = Object.keys(
  中性文案表,
) as YouXiJieGuoLeiXing[]

type 翻译缺项 = Exclude<YouXiJieGuoLeiXing, keyof typeof fanYi.jieJu>

type 翻译多项 = Exclude<keyof typeof fanYi.jieJu, YouXiJieGuoLeiXing>

export const 结局翻译键一致: [翻译缺项, 翻译多项] extends [never, never] ? true : never = true

const 枚举集合: ReadonlySet<string> = new Set<string>(结局枚举列表)

const 当前文案映射: Record<string, YouXiJieGuoLeiXing> = {}
for (const 枚举 of 结局枚举列表) {
  const 中性文案 = 中性文案表[枚举]
  if (中性文案) {
    当前文案映射[中性文案] = 枚举
  }
}

for (const [组合键, 文案] of Object.entries(性别变体文案表)) {
  const [分类, 键] = 组合键.split('.')
  if (分类 === 'jieJu' && 枚举集合.has(键) && !(文案 in 当前文案映射)) {
    当前文案映射[文案] = 键 as YouXiJieGuoLeiXing
  }
}

// 文案当主键时期落库的历史值；结局改存枚举键后仅作为旧数据兜底
const 历史结局文本映射: Record<string, YouXiJieGuoLeiXing> = {
  '胜利-爱情': 'sheng_li_ai_qing',
  '胜利-互删胜利': 'sheng_li_hu_shan_sheng_li',
  '胜利-识破': 'sheng_li_shi_po',
  '胜利-神经病': 'sheng_li_shen_jing_bing',
  '失败-过早表白': 'shi_bai_guo_zao_biao_bai',
  '失败-被欺骗': 'shi_bai_bei_qi_pian',
  '失败-被诈型欺骗': 'shi_bai_bei_zha_xing_qi_pian',
  '失败-互删失败': 'shi_bai_hu_shan_shi_bai',
  '失败-好感度归零': 'shi_bai_hao_gan_du_gui_ling',
  '失败-错误识破': 'shi_bai_cuo_wu_shi_po',
  '失败-拒绝表白': 'shi_bai_ju_jue_biao_bai',
  '失败-神经病': 'shi_bai_shen_jing_bing',
}

/**
 * 落库值 → 枚举键的**无兜底**识别口（与 `解析性别` 同形态）。
 * 三级识别表与 `解析结局类型` 完全共用：枚举键 → 当前文案 → 历史文案。
 * 认不出返回 null，交由调用方显式决定，绝不静默改写。
 *
 * 存在理由：`解析结局类型` 对认不出的值必然给出一个结局（未封存→进行中、已封存→好感度归零），
 * 这个兜底是读取侧的保命逻辑，但放进存量清洗就是数据伪造 —— 一条脏值会被无声改成「好感度归零」。
 * 清洗脚本因此只能走本函数。
 */
export function 解析落库枚举(存储值: unknown): YouXiJieGuoLeiXing | null {
  const 值 = String(存储值 ?? '').trim()
  if (枚举集合.has(值)) {
    return 值 as YouXiJieGuoLeiXing
  }
  return 当前文案映射[值] ?? 历史结局文本映射[值] ?? null
}

export function 解析结局类型(存储值: unknown, 是否封存: boolean): 结局解析结果 {
  const 枚举 = 解析落库枚举(存储值)
  if (枚举) {
    return 枚举
  }
  if (!是否封存) {
    return 'jinxing_zhong'
  }
  return 'shi_bai_hao_gan_du_gui_ling'
}

export function 渲染结局文案(解析结果: 结局解析结果, 性别: 角色性别): string {
  if (解析结果 === 'jinxing_zhong') return ''
  return 渲染性别变体文案('jieJu', 解析结果, 性别)
}

/* ---------------------------------------------------------------------------
 * FP-07 结局趣味文案池（缺陷4）
 * -------------------------------------------------------------------------
 * 三条硬约束，决定了这里的形状：
 *  1. 池子住在 `translations.jieGuoTongGuanChi/jieGuoShiBaiChi`，**绝不进 `jieJu`** ——
 *     `jieJu` 的键集合被迁移 030 的 CHECK 与 `迁移030结局归一.test.ts` 钉成三处全等。
 *  2. 抽取只发生在**结算那一刻**，抽中结果落库为快照（`角色.结局文案`）；读取侧一律走
 *     `解析结局文案` 的「快照优先、缺失回退确定性渲染」。读取侧若直接随机，同一局刷新一次
 *     就换一句话（F12）。
 *  3. 句子里不硬写"他/她"，一律 `{TA}`，由 `daiCi.ta` 的 `xingBieBianTi` 变体代入 ——
 *     与 `jieJu` 的「被渣男/渣女骗了」同一套机制，未知性别回落中性 'TA'。
 * 「哪些结局算通关」的唯一真源 = `jieGuoTongGuanChi` 的键集合，前端消费 `是否通关结局`
 * 的结果，不得再自写白名单（旧病灶：白名单漏 `sheng_li_shen_jing_bing`，胜利显示成失败）。
 * ------------------------------------------------------------------------- */

const 通关池表: Readonly<Record<string, readonly string[]>> = 池类目表.jieGuoTongGuanChi

const 失败池表: Readonly<Record<string, readonly string[]>> = 池类目表.jieGuoShiBaiChi

type 池缺项 = Exclude<
  YouXiJieGuoLeiXing,
  keyof typeof fanYi.jieGuoTongGuanChi | keyof typeof fanYi.jieGuoShiBaiChi
>

type 池多项 = Exclude<
  keyof typeof fanYi.jieGuoTongGuanChi | keyof typeof fanYi.jieGuoShiBaiChi,
  YouXiJieGuoLeiXing
>

/** 编译期护栏：两池键集合并起来必须与 14 个结局枚举键严格全等（漏一个池键即编译失败）。 */
export const 结局池键一致: [池缺项, 池多项] extends [never, never] ? true : never = true

export const 通关结局枚举列表: readonly YouXiJieGuoLeiXing[] = Object.keys(
  通关池表,
) as YouXiJieGuoLeiXing[]

export const 失败结局枚举列表: readonly YouXiJieGuoLeiXing[] = Object.keys(
  失败池表,
) as YouXiJieGuoLeiXing[]

const 通关键集合: ReadonlySet<string> = new Set<string>(通关结局枚举列表)

/** 通关/失败分类的唯一判定口。进行中转失败（弹窗只在结算时出现，进行中不该走到这里）。 */
export function 是否通关结局(解析结果: 结局解析结果): boolean {
  return 解析结果 !== 'jinxing_zhong' && 通关键集合.has(解析结果)
}

/** 池内单句的性别代入：`{TA}` → 他/她，未知性别取中性 'TA'。 */
export function 渲染结局池文案(句子: string, 性别: 角色性别): string {
  const 代词 = 渲染性别变体文案('daiCi', 'ta', 性别)
  return 句子.replace(/\{TA\}/g, 代词)
}

/** 某个结局的候选句池（已按性别代入）。进行中返回空池，调用方据此回落标签文案。 */
export function 结局趣味文案池(解析结果: 结局解析结果, 性别: 角色性别): readonly string[] {
  const 池 = 是否通关结局(解析结果) ? 通关池表[解析结果] : 失败池表[解析结果]
  if (!池) return []
  return 池.map((句子) => 渲染结局池文案(句子, 性别))
}

/** 取池器：与 `services/角色生成.ts` 的 `suiJiXuanZe` 同一形态；抽中什么就落库什么。 */
function 默认随机取池<T>(池: readonly T[]): T {
  return 池[Math.floor(Math.random() * 池.length)] as T
}

/**
 * 结算用：从趣味池随机抽一条。**唯一允许随机的时点**，结果必须由调用方落库为快照。
 * 空池（进行中/缺键）回落确定性标签文案，保证弹窗永不空白。
 */
export function 随机结局趣味文案(
  解析结果: 结局解析结果,
  性别: 角色性别,
  取池器: <T>(池: readonly T[]) => T = 默认随机取池,
): string {
  const 池 = 结局趣味文案池(解析结果, 性别)
  if (池.length === 0) return 渲染结局文案(解析结果, 性别)
  return 取池器(池)
}

/**
 * 读取用：**快照优先**，快照缺失（趣味文案上线前的历史记录）回退确定性渲染。
 * 回退分支必须确定性 —— 否则同一局每次刷新换一句话。
 */
export function 解析结局文案(
  解析结果: 结局解析结果,
  性别: 角色性别,
  快照?: string | null,
): string {
  const 值 = typeof 快照 === 'string' ? 快照.trim() : ''
  if (值) return 值
  return 渲染结局文案(解析结果, 性别)
}
