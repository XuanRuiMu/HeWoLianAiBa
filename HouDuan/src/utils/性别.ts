
import { huoQuFanYi } from '../config/translations'
import { debug日志 } from './debug日志'

export type 性别内部形态 = 'nan' | 'nv'

export type 性别展示形态 = '男' | '女' | '未知'

export type 角色性别 = 性别展示形态

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

export function 读回性别(原始值: unknown, 来源: string, 标识: string): 性别内部形态 {
  const 内部 = 解析性别(原始值)
  if (内部 === null) {
    debug日志.warn(来源, '性别写法无法识别，按男性兜底', {
      xiang_qing: { biaoshi: 标识, yuan_shi_zhi: String(原始值 ?? '') },
    })
    return 'nan'
  }
  return 内部
}

export function 落库性别或拒绝(值: unknown, 来源: string, 标识: string): 性别内部形态 {
  const 内部 = 解析性别(值)
  if (内部 === null) {
    debug日志.warn(来源, '拒绝落库不可识别的性别写法', {
      xiang_qing: { biaoshi: 标识, yuan_shi_zhi: String(值 ?? '') },
    })
    const 错误 = new Error(huoQuFanYi('anQuan', 'shenFenBuHeFa')) as Error & {
      zhuang_tai_ma?: number
    }
    错误.zhuang_tai_ma = 400
    throw 错误
  }
  return 内部
}

export function 内部转展示(值: 性别内部形态 | null | undefined): 性别展示形态 {
  if (值 === 'nv') return '女'
  if (值 === 'nan') return '男'
  return '未知'
}

export type 性别用户形态 = 'male' | 'female'

export function 内部转用户形态(
  值: 性别内部形态 | null | undefined,
): 性别用户形态 | null {
  if (值 === 'nv') return 'female'
  if (值 === 'nan') return 'male'
  return null
}

export function 归一角色性别(原始值: unknown): 性别展示形态 {
  return 内部转展示(解析性别(原始值))
}
