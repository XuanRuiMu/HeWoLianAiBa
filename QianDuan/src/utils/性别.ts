
import { huoQuFanYi } from '@/config/翻译表'

export type 性别内部形态 = 'nan' | 'nv'

export type 性别展示形态 = '男' | '女' | '未知'

export type 性别选择形态 = '男' | '女'

export type 性别用户形态 = 'male' | 'female'

const 男写法集合: readonly string[] = ['男', 'nan', 'male']

const 女写法集合: readonly string[] = ['女', 'nv', 'female']

export const 性别合法写法: readonly string[] = [...男写法集合, ...女写法集合]

export const 性别内部形态列表: readonly 性别内部形态[] = ['nan', 'nv']

function 清洗写法(原始值: unknown): string {
  return String(原始值 ?? '')
    .trim()
    .toLowerCase()
}

export function 解析性别(原始值: unknown): 性别内部形态 | null {
  const 写法 = 清洗写法(原始值)
  if (男写法集合.includes(写法)) return 'nan'
  if (女写法集合.includes(写法)) return 'nv'
  return null
}

export function 是可识别性别(原始值: unknown): boolean {
  return 解析性别(原始值) !== null
}

export function 内部转展示(值: 性别内部形态 | null | undefined): 性别展示形态 {
  if (值 === 'nv') return '女'
  if (值 === 'nan') return '男'
  return '未知'
}

export function 归一角色性别(原始值: unknown): 性别展示形态 {
  return 内部转展示(解析性别(原始值))
}

export function 内部转用户形态(
  值: 性别内部形态 | null | undefined,
): 性别用户形态 | null {
  if (值 === 'nv') return 'female'
  if (值 === 'nan') return 'male'
  return null
}

export function 用户形态(原始值: unknown): 性别用户形态 | null {
  return 内部转用户形态(解析性别(原始值))
}

export function 选择形态(原始值: unknown): 性别选择形态 | null {
  const 内部 = 解析性别(原始值)
  if (内部 === null) return null
  return 内部 === 'nv' ? '女' : '男'
}

export type 性别二档 = 'nan' | 'nv'

export type 性别配色档 = 性别二档 | 'zhongxing'

export function 解析性别配色档(原始值: unknown): 性别配色档 {
  const 内部 = 解析性别(原始值)
  if (内部 === 'nan') return 'nan'
  if (内部 === 'nv') return 'nv'
  return 'zhongxing'
}

export function 解析性别框体色档(
  自身性别: unknown,
  默认性别: unknown,
  兜底色档: 性别二档 = 'nan',
): 性别二档 {
  return 解析性别(自身性别) ?? 解析性别(默认性别) ?? 兜底色档
}

export function 解析主色档(自身性别: unknown, 默认性别: unknown): 性别配色档 {
  return 解析性别(自身性别) ?? 解析性别(默认性别) ?? 'nan'
}

export function 请求性别或拒绝(值: unknown): 性别内部形态 {
  const 内部 = 解析性别(值)
  if (内部 === null) {
    throw new Error(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
  }
  return 内部
}
