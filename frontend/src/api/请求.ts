import axios from 'axios'
import type { ApiXiangYing } from '../types'
import {
  duQuLingPai,
  baoCunLingPai,
  qingChuLingPai,
  duQuShuaXinLingPai,
  baoCunShuaXinLingPai,
  qingChuShuaXinLingPai,
} from '@/utils/令牌存储'
import { huoQuFanYi } from '@/config/translations'
import { fenLeiCuoWu } from '@/utils/错误处理'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'
import router from '@/router'
import type { InternalAxiosRequestConfig } from 'axios'

function 使用用户仓库() {
  return import('@/stores/用户').then((m) => m.使用用户仓库())
}

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

interface KeZhongShiPeiZhi extends InternalAxiosRequestConfig {
  __yiShuaXin?: boolean
}

/** 401 静默刷新：access 过期时用 refresh 令牌换新后重放原请求，用户无感知；
    并发 401 共用一次刷新；认证接口自身与已重放过的请求不参与，避免循环。 */
let shuaXinJinXingZhong: Promise<boolean> | null = null

function shiRenZhengQingQiu(url?: string): boolean {
  return typeof url === 'string' && url.includes('/认证/')
}

async function zhiXingShuaXin(): Promise<boolean> {
  try {
    const { shuaXinLingPai, shuaXinLingPaiID } = duQuShuaXinLingPai()
    const pingZheng = shuaXinLingPaiID || shuaXinLingPai
    if (!pingZheng) return false
    const yuanShengPost = (axios as unknown as { post?: unknown }).post
    if (typeof yuanShengPost !== 'function') return false
    const xiangYing = await (
      yuanShengPost as (
        url: string,
        shuJu: unknown,
        peiZhi: { timeout: number },
      ) => Promise<{ data?: ApiXiangYing<{ 令牌: string; 刷新令牌?: string; 刷新令牌ID?: string }> }>
    )('/api/认证/刷新', { refreshToken: pingZheng }, { timeout: 10000 })
    const shuJu = xiangYing?.data?.shu_ju
    if (!shuJu || !shuJu.令牌) return false
    baoCunLingPai(shuJu.令牌, false)
    baoCunShuaXinLingPai(shuJu.刷新令牌, shuJu.刷新令牌ID, false)
    return true
  } catch {
    return false
  }
}

function changShiShuaXinLingPai(): Promise<boolean> {
  if (!shuaXinJinXingZhong) {
    shuaXinJinXingZhong = zhiXingShuaXin().finally(() => {
      shuaXinJinXingZhong = null
    })
  }
  return shuaXinJinXingZhong
}

// D-6: 请求取消控制器管理
const 进行中请求 = new Map<string, AbortController>()

function shengChengQingQiuKey(配置: InternalAxiosRequestConfig): string {
  return `${配置.method?.toUpperCase() || 'GET'}:${配置.url}`
}

function qingLiJinXingZhong(配置: InternalAxiosRequestConfig): void {
  try {
    进行中请求.delete(shengChengQingQiuKey(配置))
  } catch {
    // 清理失败不影响主流程
  }
}

// YH-140 trace断链收敛：前端透传trace，后端日志透传查问题对得上
// 根因：前后两截；收敛为请求头透传trace+响应回传requestId
function huoQuHuoShengChengTraceId(): string {
  try {
    let xianYou = sessionStorage.getItem('lian-ai-ba-trace-id')
    if (!xianYou) {
      xianYou = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
      sessionStorage.setItem('lian-ai-ba-trace-id', xianYou)
    }
    return xianYou
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
  }
}

实例.interceptors.request.use((配置) => {
  const 令牌 = duQuLingPai()
  if (令牌 && 配置.headers) {
    配置.headers.Authorization = `Bearer ${令牌}`
  }
  if (配置.headers) {
    try {
      ;(配置.headers as Record<string, string>)['X-Trace-Id'] = huoQuHuoShengChengTraceId()
    } catch {
      // 头写入失败不阻断
    }
  }

  // D-6: AbortController 支持请求取消
  const 控制器 = new AbortController()
  配置.signal = 控制器.signal
  const key = shengChengQingQiuKey(配置)
  进行中请求.set(key, 控制器)

  return 配置
})

实例.interceptors.response.use(
  (响应) => {
    if (响应.config) qingLiJinXingZhong(响应.config as InternalAxiosRequestConfig)
    return 响应
  },
  (错误) => {
    if (axios.isAxiosError(错误) && 错误.config)
      qingLiJinXingZhong(错误.config as InternalAxiosRequestConfig)
    return Promise.reject(错误)
  },
)

// D-6: 指数退避重试配置
// FP-08 YH-078：仅幂等方法默认重试；POST 默认不重试，携带幂等键才重试
// 根因收敛：502多为后端未启动的代理穿透，重试只放大雪崩；502禁重试直接抛
const 重试配置 = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 503, 504],
  retryableCodes: ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN'],
}

async function 执行带重试<T>(
  请求函数: () => Promise<T>,
  尝试次数 = 0,
  配置?: { method?: string } | null,
): Promise<T> {
  try {
    return await 请求函数()
  } catch (错误: unknown) {
    const 是否可重试 =
      axios.isAxiosError(错误) &&
      ((错误.response && 重试配置.retryableStatuses.includes(错误.response.status)) ||
        (错误.code && 重试配置.retryableCodes.includes(错误.code)))

    if (是否可重试 && 尝试次数 < 重试配置.maxRetries) {
      const 延迟 = Math.min(
        重试配置.baseDelay * Math.pow(2, 尝试次数) + Math.random() * 1000,
        重试配置.maxDelay,
      )
      await new Promise((resolve) => setTimeout(resolve, 延迟))
      return 执行带重试(请求函数, 尝试次数 + 1, 配置)
    }
    throw 错误
  }
}

const 包装实例 = {
  get: <T = any>(url: string, 配置?: any) =>
    执行带重试(() => 实例.get<T>(url, 配置), 0, 配置),
  post: <T = any>(url: string, 数据?: any, 配置?: any) => {
    if (typeof 配置?.miDengJian === 'string' && 配置.miDengJian) {
      const daiMiDengJianPeiZhi = {
        ...(配置 || {}),
        headers: { ...(配置?.headers || {}), 'Idempotency-Key': 配置.miDengJian as string },
      }
      return 执行带重试(() => 实例.post<T>(url, 数据, daiMiDengJianPeiZhi), 0, 配置)
    }
    return 实例.post<T>(url, 数据, 配置)
  },
  put: <T = any>(url: string, 数据?: any, 配置?: any) =>
    执行带重试(() => 实例.put<T>(url, 数据, 配置), 0, 配置),
  patch: <T = any>(url: string, 数据?: any, 配置?: any) =>
    执行带重试(() => 实例.patch<T>(url, 数据, 配置), 0, 配置),
  delete: <T = any>(url: string, 配置?: any) => 执行带重试(() => 实例.delete<T>(url, 配置), 0, 配置),
  // 取消所有进行中请求
  取消所有请求: () => {
    进行中请求.forEach((控制器) => 控制器.abort())
    进行中请求.clear()
  },
  // 取消特定请求
  取消请求: (方法: string, url: string) => {
    const key = `${方法.toUpperCase()}:${url}`
    const 控制器 = 进行中请求.get(key)
    if (控制器) {
      控制器.abort()
      进行中请求.delete(key)
    }
  },
}

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
  async (错误) => {
    const fenLei = fenLeiCuoWu(错误)

    if (fenLei === 'wangLuo') {      chuFaCuoWuShangBao({
        leiBie: 'weiZhi',
        cuoWu: 错误,
        shiJianChuo: Date.now(),
        fuJia: {
          fenLei,
          url: axios.isAxiosError(错误) ? 错误.config?.url : undefined,
          code: axios.isAxiosError(错误) ? 错误.code : undefined,
        },
      })
    }

    if (axios.isAxiosError(错误) && 错误.response) {
      const { status, data } = 错误.response
      if (status === 401) {
        // 不出戏：先静默刷新一次，成功则重放原请求（用户无感知）；
        // 无刷新凭证/刷新失败/认证接口自身 401 才走原有登出流程
        const yuanQingQiu = 错误.config as KeZhongShiPeiZhi | undefined
        if (
          yuanQingQiu &&
          !yuanQingQiu.__yiShuaXin &&
          !shiRenZhengQingQiu(yuanQingQiu.url) &&
          (await changShiShuaXinLingPai())
        ) {
          yuanQingQiu.__yiShuaXin = true
          const xinLingPai = duQuLingPai()
          if (xinLingPai) {
            if (!yuanQingQiu.headers) {
              yuanQingQiu.headers = {
                Authorization: `Bearer ${xinLingPai}`,
              } as unknown as typeof yuanQingQiu.headers
            } else {
              ;(yuanQingQiu.headers as unknown as Record<string, string>).Authorization =
                `Bearer ${xinLingPai}`
            }
          }
          return 实例(yuanQingQiu)
        }
        // D-6: 401 时使用 router.push 带 redirect，并清理 Pinia 用户态
        使用用户仓库().then((用户仓库) => {
          用户仓库.清空用户状态()
        })
        qingChuLingPai()
        qingChuShuaXinLingPai()
        if (window.location.pathname !== '/login') {
          router.push({
            path: '/login',
            query: { redirect: window.location.pathname + window.location.search },
          })
        }
      }
      if (shiYeWuCuoWuShuJu(data)) {
        const 业务错误实例 = new Error(data.ti_shi) as 业务错误
        业务错误实例.cuo_wu_ma = data.cuo_wu_ma
        return Promise.reject(业务错误实例)
      }
      if (fenLei === 'fuWuQi') {
        chuFaCuoWuShangBao({
          leiBie: 'weiZhi',
          cuoWu: 错误,
          shiJianChuo: Date.now(),
          fuJia: {
            fenLei,
            status,
            url: 错误.config?.url,
          },
        })
      }
    }

    return Promise.reject(错误)
  },
)

export { 实例 as 默认实例, 包装实例 as 请求实例 }
export default 实例
