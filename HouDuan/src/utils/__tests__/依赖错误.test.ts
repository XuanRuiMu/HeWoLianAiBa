import { describe, expect, it } from 'vitest'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'
import {
  依赖不可用错误,
  依赖对应错误码,
  包装依赖调用,
  推断依赖来源,
  是依赖不可用错误,
} from '../依赖错误'

describe('依赖错误归类', () => {
  it('把底层异常包装成带依赖名的错误并保留原始原因', async () => {
    const 原始 = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED',
    })
    const 错误 = await 包装依赖调用('postgres', () => Promise.reject(原始)).catch((e) => e)
    expect(是依赖不可用错误(错误)).toBe(true)
    expect((错误 as 依赖不可用错误).依赖).toBe('postgres')
    expect((错误 as 依赖不可用错误).原始错误).toBe(原始)
    expect((错误 as 依赖不可用错误).cause).toBe(原始)
  })

  it('已经是依赖错误时不重复包装', async () => {
    const 原错误 = new 依赖不可用错误('redis', new Error('NOAUTH'))
    const 错误 = await 包装依赖调用('postgres', () => Promise.reject(原错误)).catch((e) => e)
    expect(错误).toBe(原错误)
  })

  it('依赖名映射到各自的 503 错误码', () => {
    expect(依赖对应错误码('postgres')).toBe(CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE)
    expect(依赖对应错误码('redis')).toBe(CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE)
  })

  it('能从未包装的数据库错误里识别依赖来源', () => {
    expect(推断依赖来源(Object.assign(new Error('relation "用户" does not exist'), { code: '42P01' }))).toBe('postgres')
    expect(推断依赖来源(Object.assign(new Error('password authentication failed'), { code: '28P01' }))).toBe('postgres')
    expect(推断依赖来源(Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:6379'), { code: 'ECONNREFUSED' }))).toBe('redis')
    expect(推断依赖来源(Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' }))).toBe('postgres')
    expect(推断依赖来源(Object.assign(new Error('NOAUTH Authentication required.'), { code: 'NOAUTH' }))).toBe('redis')
  })

  it('普通业务异常不会被误判为依赖故障', () => {
    expect(推断依赖来源(new Error('账号或密码错误'))).toBeNull()
    expect(推断依赖来源(null)).toBeNull()
    expect(推断依赖来源('ECONNREFUSED')).toBeNull()
  })
})
