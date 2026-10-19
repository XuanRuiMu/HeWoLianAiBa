/**
 * 性别取值唯一解析入口（FP-13）。
 *
 * 三种形态，形态间转换只能发生在本模块内：
 *
 * 1. 内部规范形态 `性别内部形态` = 'nan' | 'nv'
 *    `角色.性别`、`挑战对局.玩家性别`、`挑战对局.对象性别` 的落库值，
 *    以及喂给大模型的 AI 上下文值（`AIJiaoSeXinXi.xing_bie`）。
 *    迁移 024 对这三列加了 CHECK，库内不可能再出现第三种写法。
 * 2. 对外展示形态 `性别展示形态` = '男' | '女' | '未知'
 *    结局文案、战绩文案、管理端/网页端展示与 API 回显值。
 * 3. 外部输入形态 = 男/女/nan/nv/male/female 六种写法（大小写、首尾空格不敏感）
 *    请求体、库内存量脏数据、AI 产出等一切来源都必须先过 `解析性别`。
 *
 * 禁止在其它模块再写 `=== '女'` / `=== '男'` 这类字面量判定 ——
 * 历史上正是这种判定把 10565 个 nv 女性角色映射成了男性人设。
 */

import { huoQuFanYi } from '../config/translations'
import { debug日志 } from './debug日志'

export type 性别内部形态 = 'nan' | 'nv'

export type 性别展示形态 = '男' | '女' | '未知'

/** 展示形态别名，沿用 FP-09 既有命名 */
export type 角色性别 = 性别展示形态

const 男写法集合: readonly string[] = ['男', 'nan', 'male']

const 女写法集合: readonly string[] = ['女', 'nv', 'female']

/** 全部合法写法。输入白名单一律复用本常量，禁止各处另抄一份 */
export const 性别合法写法: readonly string[] = [...男写法集合, ...女写法集合]

/** 仅内部规范形态二值，落库 CHECK 与前端请求体的目标形态 */
export const 性别内部形态列表: readonly 性别内部形态[] = ['nan', 'nv']

function 清洗写法(原始值: unknown): string {
  return String(原始值 ?? '')
    .trim()
    .toLowerCase()
}

/**
 * 唯一识别口：任意写法 → 内部规范形态。
 * 识别不出返回 null，由调用方显式决定兜底 —— 绝不静默判为男性。
 */
export function 解析性别(原始值: unknown): 性别内部形态 | null {
  const 写法 = 清洗写法(原始值)
  if (男写法集合.includes(写法)) return 'nan'
  if (女写法集合.includes(写法)) return 'nv'
  return null
}

/** 是否为可识别写法（输入验证白名单的唯一来源） */
export function 是可识别性别(原始值: unknown): boolean {
  return 解析性别(原始值) !== null
}

/**
 * 读回卡口：库内存量脏写法 → 内部规范形态。
 * 与 `落库性别或拒绝` 相对：读取路径必须容忍迁移前的历史行，
 * 识别不出时按男性兜底并留 warn，使其可观测而非静默错判。
 */
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

/**
 * 落库卡口：任意写法 → 内部规范形态，不可识别者抛 400。
 * 迁移 024 给三列加了 CHECK，写入第三种写法会直接炸成 500，
 * 因此写入前必须经本函数，并把 zhuang_tai_ma=400 回传给路由。
 */
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

/** 内部规范形态 → 展示形态；null 一律 未知 */
export function 内部转展示(值: 性别内部形态 | null | undefined): 性别展示形态 {
  if (值 === 'nv') return '女'
  if (值 === 'nan') return '男'
  return '未知'
}

/**
 * 用户资料形态 = 'male' | 'female'
 * 仅 `用户.默认性别` 列与前端资料向导使用；该列不在迁移 024 范围内，
 * 但写法表必须与上面同源，禁止各处再抄一份六种写法。
 */
export type 性别用户形态 = 'male' | 'female'

/** 内部规范形态 → 用户资料形态；识别不出原样返回 null 交由调用方拒绝 */
export function 内部转用户形态(
  值: 性别内部形态 | null | undefined,
): 性别用户形态 | null {
  if (值 === 'nv') return 'female'
  if (值 === 'nan') return 'male'
  return null
}

/** 任意来源写法 → 展示形态（原 `utils/结局.归一角色性别` 语义，迁移至此） */
export function 归一角色性别(原始值: unknown): 性别展示形态 {
  return 内部转展示(解析性别(原始值))
}
