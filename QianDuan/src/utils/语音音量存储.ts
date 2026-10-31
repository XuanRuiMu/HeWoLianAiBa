import { reactive } from 'vue'

const 存储键 = 'yuYinYinLiang'
const 条数上限 = 400
const 默认音量 = 0.5
const 最小音量 = 0
const 最大音量 = 1
const 写入延迟毫秒 = 320

export interface 语音音量载体 {
  ke_hu_duan_id?: string | number | null
  id?: string | number | null
  mei_ti_url?: string | null
  ben_di_yu_lan_url?: string | null
}

export const 语音音量表 = reactive(new Map<string, number>())

let 已装载 = false
let 写入定时器: ReturnType<typeof setTimeout> | null = null

function 规整(值: unknown): number | null {
  const 数 = typeof 值 === 'number' ? 值 : Number(值)
  if (!Number.isFinite(数)) return null
  return Math.min(最大音量, Math.max(最小音量, 数))
}

function 取存储(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function 装载(): void {
  if (已装载) return
  已装载 = true
  const 存储 = 取存储()
  if (!存储) return
  let 原文: string | null
  try {
    原文 = 存储.getItem(存储键)
  } catch {
    return
  }
  if (!原文) return
  let 解析: unknown
  try {
    解析 = JSON.parse(原文)
  } catch {
    return
  }
  if (!解析 || typeof 解析 !== 'object') return
  for (const [键, 值] of Object.entries(解析 as Record<string, unknown>)) {
    const 规整值 = 规整(值)
    if (规整值 === null || 键 === '') continue
    语音音量表.set(键, 规整值)
  }
}

function 落盘(): void {
  const 存储 = 取存储()
  if (!存储) return
  const 对象: Record<string, number> = {}
  for (const [键, 值] of 语音音量表) 对象[键] = 值
  try {
    存储.setItem(存储键, JSON.stringify(对象))
  } catch {
    return
  }
}

function 排期落盘(): void {
  if (写入定时器 !== null) clearTimeout(写入定时器)
  写入定时器 = setTimeout(() => {
    写入定时器 = null
    落盘()
  }, 写入延迟毫秒)
}

function 收敛条数(): void {
  if (语音音量表.size <= 条数上限) return
  const 多余 = 语音音量表.size - 条数上限
  let 已删 = 0
  for (const 键 of 语音音量表.keys()) {
    语音音量表.delete(键)
    已删 += 1
    if (已删 >= 多余) break
  }
}

export function 语音音量键(载体: 语音音量载体): string {
  const 标识 = 载体.ke_hu_duan_id ?? 载体.id
  if (标识 !== null && 标识 !== undefined && String(标识) !== '') return 'x:' + String(标识)
  const 地址 = 载体.mei_ti_url || 载体.ben_di_yu_lan_url || ''
  return 地址 === '' ? '' : 'u:' + 地址
}

export function duQuYuYinYinLiang(载体: 语音音量载体): number {
  装载()
  const 值 = 语音音量表.get(语音音量键(载体))
  return 值 === undefined ? 默认音量 : 值
}

export function sheZhiYuYinYinLiang(载体: 语音音量载体, 值: unknown): number {
  装载()
  const 键 = 语音音量键(载体)
  const 规整值 = 规整(值)
  if (键 === '' || 规整值 === null) return duQuYuYinYinLiang(载体)
  if (语音音量表.get(键) === 规整值) return 规整值
  语音音量表.delete(键)
  语音音量表.set(键, 规整值)
  收敛条数()
  排期落盘()
  return 规整值
}

export function yuYinYinLiangZengYi(值: number): number {
  const 规整值 = 规整(值) ?? 默认音量
  return 规整值 / 默认音量
}

export function yuYinYinLiangSeXiang(值: number): string {
  const 规整值 = 规整(值) ?? 默认音量
  const 色相 = 55 * (1 - 规整值)
  const 饱和 = 92
  const 亮度 = 52 + 8 * (1 - Math.abs(规整值 - 默认音量) * 2)
  return `hsl(${色相.toFixed(1)} ${饱和}% ${亮度.toFixed(1)}%)`
}

export const YU_YIN_YIN_LIANG_MO_REN = 默认音量
