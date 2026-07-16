import axios from 'axios'
import type { ApiXiangYing } from '../types'
import { 令牌键 } from '@/constants/auth'
import { huoQuFanYi } from '@/config/translations'

export interface 业务错误 extends Error {
  cuo_wu_ma?: string
}

export function 是业务错误(错误: unknown): 错误 is 业务错误 {
  return 错误 instanceof Error && 'cuo_wu_ma' in 错误
}

function shiYeWuCuoWuShuJu(数据: unknown): 数据 is ApiXiangYing<unknown> & { ti_shi: string } {
  return (
    typeof 数据 === 'object' &&
    数据 !== null &&
    'cheng_gong' in 数据 &&
    数据.cheng_gong === false &&
    'ti_shi' in 数据 &&
    typeof (数据 as ApiXiangYing<unknown>).ti_shi === 'string'
  )
}

export function huoQuCuoWuXiangYing(错误: unknown) {
  if (axios.isAxiosError(错误)) {
    return 错误.response
  }
  return undefined
}

const 实例 = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

实例.interceptors.request.use((配置) => {
  const 令牌 = localStorage.getItem(令牌键)
  if (令牌 && 配置.headers) {
    配置.headers.Authorization = `Bearer ${令牌}`
  }
  return 配置
})

实例.interceptors.response.use(
  (响应) => {
    const 数据 = 响应.data as ApiXiangYing<unknown>
    if (数据 && !数据.cheng_gong) {
      const 错误 = new Error(数据.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai')) as 业务错误
      错误.cuo_wu_ma = 数据.cuo_wu_ma
      return Promise.reject(错误)
    }
    return 响应
  },
  (错误) => {
    if (axios.isAxiosError(错误) && 错误.response) {
      const { status, data } = 错误.response
      if (status === 401) {
        localStorage.removeItem(令牌键)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      if (shiYeWuCuoWuShuJu(data)) {
        const 业务错误实例 = new Error(data.ti_shi) as 业务错误
        业务错误实例.cuo_wu_ma = data.cuo_wu_ma
        return Promise.reject(业务错误实例)
      }
    }
    return Promise.reject(错误)
  },
)

export default 实例
