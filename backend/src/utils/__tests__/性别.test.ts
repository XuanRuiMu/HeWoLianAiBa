import { describe, it, expect } from 'vitest'
import {
  解析性别,
  是可识别性别,
  内部转展示,
  归一角色性别,
  性别合法写法,
  性别内部形态列表,
} from '../性别'

/**
 * FP-13 性别唯一解析入口全矩阵。
 * 覆盖：六种写法 + 空值 + 未知值 + 大小写 + 带空格 + null/undefined/非字符串。
 */

const 男性写法 = ['男', 'nan', 'NAN', 'Nan', 'male', 'Male', 'MALE', '  nan  ', '\t男\n']

const 女性写法 = ['女', 'nv', 'NV', 'Nv', 'female', 'Female', 'FEMALE', '  nv  ', '\t女\n']

const 非性别值: unknown[] = [
  '',
  ' ',
  null,
  undefined,
  0,
  1,
  123,
  true,
  false,
  {},
  [],
  '不详',
  '未知',
  'other',
  'n',
  'f',
  'nan1',
  '1nv',
  '男男',
  '女生',
  '不明',
  'unknown',
]

describe('解析性别：任意写法 → 内部规范形态', () => {
  it.each(男性写法)('男性写法 %j → nan', (写法) => {
    expect(解析性别(写法)).toBe('nan')
  })

  it.each(女性写法)('女性写法 %j → nv', (写法) => {
    expect(解析性别(写法)).toBe('nv')
  })

  it.each(非性别值)('非性别写法 %j → null（绝不静默判为男性）', (值) => {
    expect(解析性别(值)).toBeNull()
  })

  it('返回值只可能是二值集合', () => {
    const 出现值 = new Set<unknown>()
    for (const 项 of [...男性写法, ...女性写法, ...非性别值]) {
      出现值.add(解析性别(项))
    }
    expect([...出现值].sort()).toEqual([null, 'nan', 'nv'].sort())
  })
})

describe('内部转展示：内部规范形态 → 展示形态', () => {
  it.each([
    ['nan', '男'],
    ['nv', '女'],
  ] as const)('%s → %s', (内部, 展示) => {
    expect(内部转展示(内部)).toBe(展示)
  })

  it('null / undefined → 未知', () => {
    expect(内部转展示(null)).toBe('未知')
    expect(内部转展示(undefined)).toBe('未知')
  })
})

describe('归一角色性别：任意写法 → 展示形态', () => {
  it.each([
    ['男', '男'],
    ['nan', '男'],
    ['male', '男'],
    ['女', '女'],
    ['nv', '女'],
    ['female', '女'],
  ])('识别 %s → %s', (写法, 展示) => {
    expect(归一角色性别(写法)).toBe(展示)
  })

  it.each(非性别值)('非性别写法 %j → 未知', (值) => {
    expect(归一角色性别(值)).toBe('未知')
  })

  it('三态互斥且穷尽', () => {
    const 出现值 = new Set<unknown>()
    for (const 项 of [...男性写法, ...女性写法, ...非性别值]) {
      出现值.add(归一角色性别(项))
    }
    expect([...出现值].sort()).toEqual(['女', '未知', '男'].sort())
  })
})

describe('白名单常量', () => {
  it('性别合法写法恰为六种写法', () => {
    expect([...性别合法写法].sort()).toEqual(
      ['nan', 'nv', 'male', 'female', '男', '女'].sort(),
    )
  })

  it('性别内部形态列表恰为二值', () => {
    expect(性别内部形态列表).toEqual(['nan', 'nv'])
  })

  it.each(男性写法)('是可识别性别(%j) === true', (写法) => {
    expect(是可识别性别(写法)).toBe(true)
  })

  it.each(女性写法)('是可识别性别(%j) === true', (写法) => {
    expect(是可识别性别(写法)).toBe(true)
  })

  it.each(非性别值)('是可识别性别(%j) === false', (值) => {
    expect(是可识别性别(值)).toBe(false)
  })
})
