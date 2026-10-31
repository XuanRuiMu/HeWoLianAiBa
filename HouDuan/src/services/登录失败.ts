import { CUO_WU_DAI_MA, type CuoWuDaiMa } from '../config/错误码注册表'

export type 登录失败原因 = '参数错误' | '凭据错误' | '尝试过频'

export interface 登录失败映射结果 {
  状态码: number
  错误码: CuoWuDaiMa
}

const 映射表: Readonly<Record<登录失败原因, 登录失败映射结果>> = {
  参数错误: { 状态码: 400, 错误码: CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID },
  凭据错误: { 状态码: 401, 错误码: CUO_WU_DAI_MA.AUTH_INVALID_CREDENTIALS },
  尝试过频: { 状态码: 429, 错误码: CUO_WU_DAI_MA.RATE_LIMITED },
}

export function 映射登录失败(原因: 登录失败原因): 登录失败映射结果 {
  return 映射表[原因]
}
