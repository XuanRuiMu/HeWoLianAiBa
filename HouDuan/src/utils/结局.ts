import { fanYi, type FanYiFenLei } from '../config/translations'
import type { YouXiJieGuoLeiXing } from '../types'
import type { 角色性别 } from './性别'

export type 结局解析结果 = YouXiJieGuoLeiXing | 'jinxing_zhong'

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

export const 结局池键一致: [池缺项, 池多项] extends [never, never] ? true : never = true

export const 通关结局枚举列表: readonly YouXiJieGuoLeiXing[] = Object.keys(
  通关池表,
) as YouXiJieGuoLeiXing[]

export const 失败结局枚举列表: readonly YouXiJieGuoLeiXing[] = Object.keys(
  失败池表,
) as YouXiJieGuoLeiXing[]

const 通关键集合: ReadonlySet<string> = new Set<string>(通关结局枚举列表)

export function 是否通关结局(解析结果: 结局解析结果): boolean {
  return 解析结果 !== 'jinxing_zhong' && 通关键集合.has(解析结果)
}

export function 渲染结局池文案(句子: string, 性别: 角色性别): string {
  const 代词 = 渲染性别变体文案('daiCi', 'ta', 性别)
  return 句子.replace(/\{TA\}/g, 代词)
}

export function 渲染被删原因(原因: string, 性别: 角色性别): string {
  const 表 = fanYi.beiChaQuYuanYin as Record<string, string>
  const 模板 = 表[原因]
  return 模板 ? 渲染结局池文案(模板, 性别) : ''
}

export function 结局趣味文案池(解析结果: 结局解析结果, 性别: 角色性别): readonly string[] {
  const 池 = 是否通关结局(解析结果) ? 通关池表[解析结果] : 失败池表[解析结果]
  if (!池) return []
  return 池.map((句子) => 渲染结局池文案(句子, 性别))
}

function 默认随机取池<T>(池: readonly T[]): T {
  return 池[Math.floor(Math.random() * 池.length)] as T
}

export function 随机结局趣味文案(
  解析结果: 结局解析结果,
  性别: 角色性别,
  取池器: <T>(池: readonly T[]) => T = 默认随机取池,
): string {
  const 池 = 结局趣味文案池(解析结果, 性别)
  if (池.length === 0) return 渲染结局文案(解析结果, 性别)
  return 取池器(池)
}

export function 解析结局文案(
  解析结果: 结局解析结果,
  性别: 角色性别,
  快照?: string | null,
): string {
  const 值 = typeof 快照 === 'string' ? 快照.trim() : ''
  if (值) return 值
  return 渲染结局文案(解析结果, 性别)
}
