import { appendFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export const 语料问题标签 = ['无关联追问', '演人设丢上下文', '长篇建议', '无理由拒绝', '空回应', '语义偏差'] as const
export type 问题标签 = typeof 语料问题标签[number]

export interface 真人轮次 {
  A原话: string
  真人B原话: string
}

export interface 真实对话片段 {
  片段ID: string
  来源文件: string
  轮次: 真人轮次[]
}

export interface 语义评审轮次 {
  轮次: number
  语义接近: boolean
  问题标签: 问题标签[]
  理由: string
}

export interface 回放轮次记录 {
  类型: '逐轮'
  运行ID: string
  时间: string
  片段ID: string
  来源文件: string
  轮次: number
  A原话: string
  真人B原话: string
  AI回应: string[]
  语义接近: boolean | null
  问题标签: 问题标签[]
  判定理由: string
  调用错误: string | null
}

export function 默认语料目录(): string {
  return resolve(__dirname, '..', '..', '..', '项目语料实验室', '公开语料', 'NaturalConv', '原始')
}

function 读取文本(值: unknown): string | null {
  return typeof 值 === 'string' && 值.trim().length > 0 && 值.length <= 4000 ? 值 : null
}

function 拆分轮次(内容: unknown): 真人轮次[] {
  if (!Array.isArray(内容) || 内容.length < 4) return []
  const 文本列表 = 内容.map(读取文本)
  if (文本列表.some((文本) => 文本 === null)) return []
  const 轮次: 真人轮次[] = []
  for (let 序号 = 0; 序号 + 1 < 文本列表.length; 序号 += 2) {
    轮次.push({ A原话: String(文本列表[序号]), 真人B原话: String(文本列表[序号 + 1]) })
  }
  return 轮次.length >= 2 ? 轮次 : []
}

export function 解析真实语料(原文: string, 来源文件: string): 真实对话片段[] {
  const 数据 = JSON.parse(原文) as unknown
  const 行列表 = Array.isArray(数据)
    ? 数据
    : typeof 数据 === 'object' && 数据 !== null && Array.isArray((数据 as { rows?: unknown }).rows)
      ? (数据 as { rows: unknown[] }).rows
      : []
  const 对话ID = new Set<string>()
  const 片段: 真实对话片段[] = []
  for (const [序号, 行] of 行列表.entries()) {
    if (typeof 行 !== 'object' || 行 === null) continue
    const 原始行 = 行 as { row?: { dialog_id?: unknown; content?: unknown }; dialog_id?: unknown; content?: unknown }
    const 对话 = 原始行.row ?? 原始行
    const 标识 = 读取文本(对话.dialog_id) ?? `${来源文件}-${序号 + 1}`
    if (对话ID.has(标识)) continue
    const 轮次 = 拆分轮次(对话.content)
    if (轮次.length === 0) continue
    对话ID.add(标识)
    片段.push({ 片段ID: 标识, 来源文件, 轮次 })
  }
  return 片段
}

export function 读取真实对话片段(目录 = 默认语料目录(), 最多组数 = 5): 真实对话片段[] {
  if (!Number.isInteger(最多组数) || 最多组数 < 1 || 最多组数 > 6) throw new Error('最多组数只能是1到6之间的整数')
  const 全部对话: 真实对话片段[] = []
  const 文件名列表 = readdirSync(目录, { withFileTypes: true })
    .filter((文件) => 文件.isFile() && 文件.name.endsWith('.json'))
    .map((文件) => 文件.name)
    .sort()
  for (const 文件名 of 文件名列表) {
    全部对话.push(...解析真实语料(readFileSync(join(目录, 文件名), 'utf8'), 文件名))
  }
  const 片段列表: 真实对话片段[] = []
  for (const 对话 of 全部对话) {
    for (let 起点 = 0; 起点 + 2 < 对话.轮次.length && 片段列表.length < 最多组数; 起点 += 3) {
      片段列表.push({ 片段ID: `${对话.片段ID}-片段${起点 / 3 + 1}`, 来源文件: 对话.来源文件, 轮次: 对话.轮次.slice(起点, 起点 + 3) })
    }
  }
  return 片段列表
}

export function 选取回放片段(片段列表: readonly 真实对话片段[], 最多组数: number): 真实对话片段[] {
  if (!Number.isInteger(最多组数) || 最多组数 < 1 || 最多组数 > 6) throw new Error('最多组数只能是1到6之间的整数')
  return 片段列表.slice(0, 最多组数)
}

export function 构造回放历史(既往: readonly { A原话: string; AI回应: string[] }[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return 既往.flatMap((轮次) => [
    { role: 'user' as const, content: 轮次.A原话 },
    ...(轮次.AI回应.length > 0 ? [{ role: 'assistant' as const, content: 轮次.AI回应.join('\n') }] : []),
  ])
}

export function 构造语义评审提示词(片段: 真实对话片段, 回放: readonly { AI回应: string[]; 调用错误: string | null }[]): string {
  if (回放.length !== 片段.轮次.length) throw new Error('语义评审必须包含每个实际回放轮次')
  const 每轮 = 片段.轮次.map((轮次, 序号) => ({
    轮次: 序号 + 1,
    A原话: 轮次.A原话,
    真人B原话: 轮次.真人B原话,
    AI回应: 回放[序号]?.AI回应 ?? [],
    调用错误: 回放[序号]?.调用错误,
  }))
  return [
    '逐轮比较公开真人对人和本地模型的回应。A方原话固定；真人B原话只作意图参照，模型之前看不到。',
    '双方仅为共享新闻场景中的中文真人对话参与者，没有推断的性别、年龄、职业、恋爱关系或性格标签。',
    '语义接近指接住A方当前话、回应意图与情境相容；不必字面一样。直接回应、简短承接或承诺、必要澄清均可。',
    '仅在证据明确时标记：无关联追问、演人设丢上下文、长篇建议、无理由拒绝、空回应、语义偏差。必要澄清不算无关联追问。',
    '长篇建议需是主动教导、攻略或分点说教；解释一句不算。与真人B的经历、事实表述不同本身不算问题；与原对话相反或答非所问才记。',
    '空回应、调用错误单独记录，不推断角色质量。字数、标点、符号或形似程度本身不构成问题。',
    `片段ID：${片段.片段ID}`,
    JSON.stringify(每轮),
    '仅输出JSON：{"每轮":[{"轮次":1,"语义接近":true,"问题标签":[],"理由":"对应具体话语"}]}。每轮各一次且无重复。',
  ].join('\n')
}

function 清理标签(值: unknown): 问题标签[] {
  if (!Array.isArray(值)) throw new Error('问题标签必须为数组')
  const 标签: 问题标签[] = []
  for (const 条目 of 值) {
    if (typeof 条目 !== 'string' || !(语料问题标签 as readonly string[]).includes(条目)) throw new Error('问题标签必须为受支持的中文标签')
    if (!标签.includes(条目 as 问题标签)) 标签.push(条目 as 问题标签)
  }
  return 标签
}

export function 解析语义评审(原文: string, 轮次数量: number): 语义评审轮次[] {
  if (!Number.isInteger(轮次数量) || 轮次数量 < 1) throw new Error('语义评审需要至少一轮')
  const 数据 = JSON.parse(原文.trim()) as { 每轮?: unknown }
  if (!Array.isArray(数据.每轮)) throw new Error('语义评审缺少每轮数组')
  const 已见轮次 = new Set<number>()
  const 评审: 语义评审轮次[] = []
  for (const 条目 of 数据.每轮) {
    if (typeof 条目 !== 'object' || 条目 === null) throw new Error('语义评审轮次必须为对象')
    const { 轮次, 语义接近, 问题标签, 理由 } = 条目 as Record<string, unknown>
    if (!Number.isInteger(轮次) || Number(轮次) < 1 || Number(轮次) > 轮次数量 || 已见轮次.has(Number(轮次))) throw new Error('语义评审轮次重复或越界')
    if (typeof 语义接近 !== 'boolean') throw new Error('语义接近必须是布尔值')
    if (typeof 理由 !== 'string' || 理由.trim() === '' || 理由.length > 800) throw new Error('判定理由必须是有效文本')
    const 标签 = 清理标签(问题标签)
    if (语义接近 !== (标签.length === 0)) throw new Error('语义接近与问题标签不一致')
    已见轮次.add(Number(轮次))
    评审.push({ 轮次: Number(轮次), 语义接近, 问题标签: 标签, 理由: 理由.trim() })
  }
  if (已见轮次.size !== 轮次数量) throw new Error('语义评审遗漏轮次')
  return 评审.sort((甲, 乙) => 甲.轮次 - 乙.轮次)
}

export function 汇总问题标签(评审列表: readonly { 问题标签: readonly 问题标签[] }[]): Record<string, number> {
  const 汇总: Record<string, number> = {}
  for (const 评审 of 评审列表) {
    for (const 标签 of new Set(评审.问题标签)) 汇总[标签] = (汇总[标签] ?? 0) + 1
  }
  return 汇总
}

export interface 回放记录器 {
  记录轮次(记录: Omit<回放轮次记录, '类型' | '运行ID' | '时间'>): void
  写入(记录: Record<string, unknown>): void
}

export function 创建回放记录器(文件路径: string, 运行ID: string): 回放记录器 {
  if (文件路径.trim() === '' || 运行ID.trim() === '') throw new Error('记录器文件路径与运行ID不能为空')
  mkdirSync(dirname(文件路径), { recursive: true })
  return {
    记录轮次(记录) {
      if (!Number.isInteger(记录.轮次) || 记录.轮次 < 1) throw new Error('记录轮次必须是正整数')
      if ([记录.片段ID, 记录.来源文件, 记录.A原话, 记录.真人B原话].some((值) => 值.trim() === '')) throw new Error('记录必须保留片段来源与A、真人B原话')
      appendFileSync(文件路径, `${JSON.stringify({ 类型: '逐轮', 运行ID, 时间: new Date().toISOString(), ...记录 })}\n`, { encoding: 'utf8', mode: 0o600 })
    },
    写入(记录) {
      appendFileSync(文件路径, `${JSON.stringify({ 运行ID, 时间: new Date().toISOString(), ...记录 })}\n`, { encoding: 'utf8', mode: 0o600 })
    },
  }
}
