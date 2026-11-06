import { reactive } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'

const 存储键 = 'yuYinShiChang'
const 条数上限 = DUO_MEI_TI_PEI_ZHI.yuYinShiChangChiJiuShangXian
const 持久最长毫秒 = DUO_MEI_TI_PEI_ZHI.yuYinShiChangChiJiuZuiDaHaoMiao
const 失效毫秒 = DUO_MEI_TI_PEI_ZHI.yuYinShiChangChiJiuShiXiaoHaoMiao
const 写入延迟毫秒 = DUO_MEI_TI_PEI_ZHI.yuYinShiChangXieRuYanChiHaoMiao
const 网络协议集合 = new Set(['http:', 'https:'])

export const 语音时长表 = reactive(new Map<string, number>())

const 写入时间戳表 = new Map<string, number>()

let 已装载 = false
let 写入定时器: ReturnType<typeof setTimeout> | null = null

function 取存储(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function 基准地址(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.href
}

function 解析地址(地址: string): URL | null {
  if (地址 === '' || typeof URL !== 'function') return null
  try {
    return new URL(地址, 基准地址())
  } catch {
    return null
  }
}

export function shiKeChiJiuHuaYuYinDiZhi(地址: string): boolean {
  const 解析 = 解析地址(地址)
  return 解析 !== null && 网络协议集合.has(解析.protocol)
}

export function yuYinShiChangJian(地址: string): string {
  if (地址 === '') return ''
  const 解析 = 解析地址(地址)
  if (解析 === null || !网络协议集合.has(解析.protocol)) return 地址
  return 解析.origin + 解析.pathname
}

function 规整毫秒(值: unknown): number | null {
  const 数 = typeof 值 === 'number' ? 值 : Number(值)
  if (!Number.isFinite(数) || 数 <= 0) return null
  return Math.round(数)
}

function 落盘(): void {
  const 存储 = 取存储()
  if (!存储) return
  const 对象: Record<string, [number, number]> = {}
  for (const [键, 时长] of 语音时长表) {
    const 时间戳 = 写入时间戳表.get(键)
    if (时间戳 === undefined) continue
    对象[键] = [时长, 时间戳]
  }
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
  if (语音时长表.size <= 条数上限) return
  const 多余 = 语音时长表.size - 条数上限
  let 已删 = 0
  for (const 键 of 语音时长表.keys()) {
    语音时长表.delete(键)
    写入时间戳表.delete(键)
    已删 += 1
    if (已删 >= 多余) break
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
  const 现在 = Date.now()
  const 有效: Array<{ jian: string; shiChang: number; shiJian: number }> = []
  for (const [键, 值] of Object.entries(解析 as Record<string, unknown>)) {
    if (键 === '' || !Array.isArray(值) || 值.length < 2) continue
    const 时长 = 规整毫秒(值[0])
    const 时间戳 = 规整毫秒(值[1])
    if (时长 === null || 时间戳 === null) continue
    if (时长 > 持久最长毫秒) continue
    if (现在 - 时间戳 > 失效毫秒) continue
    有效.push({ jian: 键, shiChang: 时长, shiJian: 时间戳 })
  }
  有效.sort((jia, yi) => jia.shiJian - yi.shiJian)
  const 丢弃 = 有效.length > 条数上限 ? 有效.length - 条数上限 : 0
  for (let suoYin = 丢弃; suoYin < 有效.length; suoYin += 1) {
    const 项 = 有效[suoYin]
    语音时长表.set(项.jian, 项.shiChang)
    写入时间戳表.set(项.jian, 项.shiJian)
  }
}

export function duQuYuYinShiChang(地址: string): number | null {
  装载()
  const 键 = yuYinShiChangJian(地址)
  if (键 === '') return null
  const 时长 = 语音时长表.get(键)
  return typeof 时长 === 'number' && 时长 > 0 ? 时长 : null
}

export function jiLuYuYinShiChang(地址: string, 毫秒: unknown): number | null {
  装载()
  const 键 = yuYinShiChangJian(地址)
  if (键 === '') return null
  const 时长 = 规整毫秒(毫秒)
  if (时长 === null) return null
  if (语音时长表.get(键) !== 时长) 语音时长表.set(键, 时长)
  if (时长 > 持久最长毫秒 || !shiKeChiJiuHuaYuYinDiZhi(地址)) return 时长
  写入时间戳表.set(键, Date.now())
  收敛条数()
  排期落盘()
  return 时长
}

export const YU_YIN_SHI_CHANG_TIAO_SHU_SHANG_XIAN = 条数上限

export const YU_YIN_SHI_CHANG_CUN_CHU_JIAN = 存储键

装载()
