import { describe, expect, it } from 'vitest'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'
import { 映射登录失败, type 登录失败原因 } from '../登录失败'

describe('登录失败映射', () => {
  it.each<[登录失败原因, number, string]>([
    ['参数错误', 400, CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID],
    ['凭据错误', 401, CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS],
    ['尝试过频', 429, CUO_WU_DAI_MA.RATE_LIMITED],
  ])('%s -> %i/%s', (原因, 状态码, 错误码) => {
    expect(映射登录失败(原因)).toEqual({ 状态码, 错误码 })
  })

  it('只有凭据错误使用密码错误语义，限流与参数错误不得复用它', () => {
    const 凭据 = 映射登录失败('凭据错误')
    const 限流 = 映射登录失败('尝试过频')
    const 参数 = 映射登录失败('参数错误')
    expect(凭据.错误码).toBe(CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS)
    expect(限流.错误码).not.toBe(CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS)
    expect(参数.错误码).not.toBe(CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS)
  })
})
