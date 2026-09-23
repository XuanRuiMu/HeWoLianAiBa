/**
 * 性别取值唯一解析入口（前端侧，FP-13）。
 *
 * 与 `backend/src/utils/性别.ts` 是同一份契约的两个构建产物（前后端无法共享源码），
 * 三种形态与写法表必须逐字一致，一致性由 `src/__tests__/性别口径.test.ts` 直接读后端源文件把守。
 *
 * 1. 内部规范形态 `性别内部形态` = 'nan' | 'nv'
 *    库内 `角色.性别`、`挑战对局.玩家性别/对象性别` 的唯一落库形态（迁移 024 的 CHECK），
 *    也是接口回显给前端的角色性别（`Jiaose.xing_bie`、`ShengChengJiaoSeJieGuo.xing_bie`）。
 * 2. 对外展示形态 `性别展示形态` = '男' | '女' | '未知'
 *    界面文案、接口回显；`性别选择形态` 是其去掉「未知」的子集，用于选择器与挑战开赛请求体。
 * 3. 外部输入形态 = 男/女/nan/nv/male/female 六种写法（大小写、首尾空格不敏感）
 *    路由参数、sessionStorage 透传、用户资料等一切来源都必须先过 `解析性别`。
 * 4. 配色档 `性别配色档` = nan/nv/zhongxing（仅界面着色分支使用，不落库、不进接口，
 *    因此不在与后端逐字对齐的写法表范围内）。
 *
 * 禁止在其它模块再写 `=== 'male' ? '男' : '女'` 这类自带一份的三元映射 ——
 * 历史上正是这种「非 A 即 B」的判定把无法识别的写法静默算成了另一种性别。
 */

import { huoQuFanYi } from '@/config/translations'

export type 性别内部形态 = 'nan' | 'nv'

export type 性别展示形态 = '男' | '女' | '未知'

/** 展示形态中去掉「未知」的子集：界面选择器与请求体只允许二选一 */
export type 性别选择形态 = '男' | '女'

/** 用户资料形态，仅 `用户.默认性别` / 资料向导使用 */
export type 性别用户形态 = 'male' | 'female'

const 男写法集合: readonly string[] = ['男', 'nan', 'male']

const 女写法集合: readonly string[] = ['女', 'nv', 'female']

/** 全部合法写法。输入白名单一律复用本常量，禁止各处另抄一份 */
export const 性别合法写法: readonly string[] = [...男写法集合, ...女写法集合]

/** 仅内部规范形态二值 */
export const 性别内部形态列表: readonly 性别内部形态[] = ['nan', 'nv']

function 清洗写法(原始值: unknown): string {
  return String(原始值 ?? '')
    .trim()
    .toLowerCase()
}

/**
 * 唯一识别口：任意写法 → 内部规范形态。
 * 识别不出返回 null，由调用方显式决定兜底 —— 绝不静默判成某个性别。
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

/** 内部规范形态 → 展示形态；null 一律 未知 */
export function 内部转展示(值: 性别内部形态 | null | undefined): 性别展示形态 {
  if (值 === 'nv') return '女'
  if (值 === 'nan') return '男'
  return '未知'
}

/** 任意来源写法 → 展示形态 */
export function 归一角色性别(原始值: unknown): 性别展示形态 {
  return 内部转展示(解析性别(原始值))
}

/** 内部规范形态 → 用户资料形态；识别不出返回 null 交由调用方拒绝 */
export function 内部转用户形态(
  值: 性别内部形态 | null | undefined,
): 性别用户形态 | null {
  if (值 === 'nv') return 'female'
  if (值 === 'nan') return 'male'
  return null
}

/** 任意来源写法 → 用户资料形态（资料字段与预选项用） */
export function 用户形态(原始值: unknown): 性别用户形态 | null {
  return 内部转用户形态(解析性别(原始值))
}

/** 任意来源写法 → 选择形态（挑战开赛请求体、性别选择器回显用） */
export function 选择形态(原始值: unknown): 性别选择形态 | null {
  const 内部 = 解析性别(原始值)
  if (内部 === null) return null
  return 内部 === 'nv' ? '女' : '男'
}

/** 界面配色档位：三值，识别不出（含 null / 脏写法）一律中性，绝不默认成男或女 */
export type 性别配色档 = 'nan' | 'nv' | 'zhongxing'

/**
 * 任意写法 → 配色档位。一切随性别着色的分支（主按钮底色、进度圆点、勾选框强调色）
 * 都必须经本函数取档，禁止在组件里再写 `=== 'male' ? 蓝 : 粉` 这类自带一份的二值判定 ——
 * 那会把「尚未选择」静默算成其中一档。
 */
export function 解析性别配色档(原始值: unknown): 性别配色档 {
  const 内部 = 解析性别(原始值)
  if (内部 === 'nan') return 'nan'
  if (内部 === 'nv') return 'nv'
  return 'zhongxing'
}

/**
 * 需求 #16：选中框（性别卡选中态、勾选框强调色）档位。
 * ①对象性别可识别 → 该性别档（男→蓝、女→粉）；
 * ②对象未选（含 null 与库里落下的第三种脏写法）→ 用户默认性别的**反色**；
 * ③连默认性别也没有 → 'nv'（粉框）。
 * ③与 解析主色档 的 'nan' 兜底是用户明文的一对兜底配色（"没有默认性别 → 粉色框 + 蓝色按钮"），
 * 不是"默认成女"：脏写法在①②里一律走 解析性别 的 null 分支，绝不静默判成某个性别。
 */
export function 解析选中框配色档(对象性别: unknown, 默认性别: unknown): 性别配色档 {
  const 对象 = 解析性别(对象性别)
  if (对象 !== null) return 对象
  const 默认 = 解析性别(默认性别)
  if (默认 === 'nan') return 'nv'
  if (默认 === 'nv') return 'nan'
  return 'nv'
}

/**
 * 需求 #16：主色档（认证/资料流程主按钮底色、进度圆点）。
 * 自身性别可识别 → 该档；未选 → 用户默认性别；两者皆无 → 'nan'（蓝按钮兜底）。
 */
export function 解析主色档(自身性别: unknown, 默认性别: unknown): 性别配色档 {
  return 解析性别(自身性别) ?? 解析性别(默认性别) ?? 'nan'
}

/**
 * 出参卡口：任意写法 → 内部规范形态，不可识别者抛错。
 * 后端 CHECK 只兜住落库列，前端把无法识别的写法发出去同样是在制造错判，
 * 因此发送前必须经本函数；抛出的文案走翻译文件，由调用方的失败态承接。
 */
export function 请求性别或拒绝(值: unknown): 性别内部形态 {
  const 内部 = 解析性别(值)
  if (内部 === null) {
    throw new Error(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
  }
  return 内部
}
