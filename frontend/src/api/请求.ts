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
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import {
  QianTaiCuoWu,
  chuangJianQianTaiCuoWu,
  guiYiBaoFengTraceId,
  shiQianTaiCuoWu,
  归一前台错误,
} from '@/utils/前台错误'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'
import router from '@/router'
import type { InternalAxiosRequestConfig } from 'axios'

function 使用用户仓库() {
  return import('@/stores/用户').then((m) => m.使用用户仓库())
}

export interface 业务错误 extends Error {
  cuo_wu_ma?: string
  code?: string
  traceId?: string
  retryable?: boolean
}

export function 是业务错误(错误: unknown): 错误 is 业务错误 {
  return shiQianTaiCuoWu(错误) || (错误 instanceof Error && 'cuo_wu_ma' in 错误)
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
  __huiFuQingQuDaiB?: string | null
  __qingQiuKongZhiQi?: AbortController
  __zhunQueChongShi?: boolean
}

/** 401 静默刷新：access 过期时用 refresh 令牌换新后重放原请求，用户无感知；
    并发 401 共用一次刷新；认证接口自身与已重放过的请求不参与，避免循环。 */
let shuaXinJinXingZhong: Promise<boolean> | null = null

function shiRenZhengQingQiu(url?: string): boolean {
  return typeof url === 'string' && url.includes('/认证/')
}

function shiYanZhengQingQiu(url?: string): boolean {
  if (!shiRenZhengQingQiu(url)) return false
  return !['/认证/登录', '/认证/注册', '/认证/发送码', '/认证/检查手机', '/认证/刷新'].some((path) =>
    (url as string).includes(path),
  )
}

function huoQuQingQiuDaiB(headers: unknown): string | null {
  if (typeof headers !== 'object' || headers === null) return null
  const zhoun = headers as { get?: (key: string) => unknown; Authorization?: unknown }
  const zhi = typeof zhoun.get === 'function' ? zhoun.get('Authorization') : zhoun.Authorization
  if (typeof zhi !== 'string' || !zhi.startsWith('Bearer ')) return null
  return zhi.slice(7)
}

async function zhiXingShuaXin(): Promise<boolean> {
  try {
    const yuanShengRefresh = duQuShuaXinLingPai()
    const yuanShengToken = duQuLingPai()
    const pingZheng = yuanShengRefresh.shuaXinLingPaiID || yuanShengRefresh.shuaXinLingPai
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
    const xianZhuangRefresh = duQuShuaXinLingPai()
    if (
      duQuLingPai() !== yuanShengToken ||
      xianZhuangRefresh.shuaXinLingPaiID !== yuanShengRefresh.shuaXinLingPaiID ||
      xianZhuangRefresh.shuaXinLingPai !== yuanShengRefresh.shuaXinLingPai
    ) {
      return false
    }
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

const JIN_XING_ZHONG_QING_QIU = new Map<string, Set<AbortController>>()

function shengChengQingQiuKey(配置: InternalAxiosRequestConfig): string {
  return `${配置.method?.toUpperCase() || 'GET'}:${配置.url}`
}

function dengJiaJinXingQingQiu(配置: KeZhongShiPeiZhi, 控制器: AbortController): void {
  const key = shengChengQingQiuKey(配置)
  const tongYiFang = JIN_XING_ZHONG_QING_QIU.get(key) || new Set<AbortController>()
  tongYiFang.add(控制器)
  JIN_XING_ZHONG_QING_QIU.set(key, tongYiFang)
}

function qingLiJinXingZhong(配置: InternalAxiosRequestConfig): void {
  const daiZhengPeiZhi = 配置 as KeZhongShiPeiZhi
  const key = shengChengQingQiuKey(配置)
  const tongYiFang = JIN_XING_ZHONG_QING_QIU.get(key)
  const 控制器 = daiZhengPeiZhi.__qingQiuKongZhiQi
  if (!tongYiFang || !控制器) return
  tongYiFang.delete(控制器)
  if (tongYiFang.size === 0) JIN_XING_ZHONG_QING_QIU.delete(key)
}

function shengChengTraceId(): string {
  const suoYou = globalThis.crypto?.randomUUID?.()
  return suoYou ? `request-${suoYou}` : `request-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

function huoQuHuoShengChengTraceId(): string {
  try {
    const xianYou = sessionStorage.getItem('lian-ai-ba-trace-id')
    if (xianYou) return xianYou
    const xinDe = shengChengTraceId()
    sessionStorage.setItem('lian-ai-ba-trace-id', xinDe)
    return xinDe
  } catch {
    return shengChengTraceId()
  }
}

实例.interceptors.request.use((配置) => {
  const daiZhengPeiZhi = 配置 as KeZhongShiPeiZhi
  const 令牌 = duQuLingPai()
  daiZhengPeiZhi.__huiFuQingQuDaiB = 令牌
  if (令牌 && 配置.headers) {
    配置.headers.Authorization = `Bearer ${令牌}`
  }
  if (配置.headers) {
    const traceId = huoQuHuoShengChengTraceId()
    ;(配置.headers as Record<string, string>)['X-Request-Id'] = traceId
    ;(配置.headers as Record<string, string>)['X-Trace-Id'] = traceId
  }

  const 外部信号 = 配置.signal
  const 控制器 = new AbortController()
  if (外部信号) {
    if (外部信号.aborted) 控制器.abort()
    else 外部信号.addEventListener('abort', () => 控制器.abort(), { once: true })
  }
  daiZhengPeiZhi.__qingQiuKongZhiQi = 控制器
  配置.signal = 控制器.signal
  dengJiaJinXingQingQiu(daiZhengPeiZhi, 控制器)

  return 配置
})

实例.interceptors.response.use(
  (响应) => {
    if (响应.config) qingLiJinXingZhong(响应.config as InternalAxiosRequestConfig)
    return 响应
  },
  (错误) => {
    const config = axios.isAxiosError(错误) ? 错误.config : undefined
    if (config) qingLiJinXingZhong(config)
    return Promise.reject(错误)
  },
)

const 重试配置 = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
}

function chuangJianQuXiaoCuoWu(): Error {
  const cuoWu = new Error('request-cancelled')
  cuoWu.name = 'AbortError'
  return cuoWu
}

function dengDaiKeQuXiao(haoMiao: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(chuangJianQuXiaoCuoWu())
  return new Promise((resolve, reject) => {
    const qiShiQi = setTimeout(() => {
      signal?.removeEventListener('abort', zhongZhiTing)
      resolve()
    }, haoMiao)
    const zhongZhiTing = () => {
      clearTimeout(qiShiQi)
      signal?.removeEventListener('abort', zhongZhiTing)
      reject(chuangJianQuXiaoCuoWu())
    }
    signal?.addEventListener('abort', zhongZhiTing, { once: true })
  })
}

async function 执行带重试<T>(
  请求函数: () => Promise<T>,
  允许自动重试: boolean,
  配置?: { signal?: AbortSignal } | null,
  尝试次数 = 0,
): Promise<T> {
  if (配置?.signal?.aborted) throw 归一前台错误(chuangJianQuXiaoCuoWu())
  try {
    return await 请求函数()
  } catch (错误: unknown) {
    const zhengChangHua = 归一前台错误(错误)
    zhengChangHua.zhongShiCiShu = 尝试次数 + 1
    if (允许自动重试 && zhengChangHua.retryable && 尝试次数 < 重试配置.maxRetries) {
      const 延迟 = Math.min(
        重试配置.baseDelay * Math.pow(2, 尝试次数) + Math.random() * 1000,
        重试配置.maxDelay,
      )
      await dengDaiKeQuXiao(延迟, 配置?.signal || undefined)
      return 执行带重试(请求函数, true, 配置, 尝试次数 + 1)
    }
    throw zhengChangHua
  }
}

function xianRongZiDongChongShi(配置?: any): boolean {
  return 配置?.__zhunQueChongShi === true || typeof 配置?.miDengJian === 'string'
}

const 包装实例 = {
  get: <T = any>(url: string, 配置?: any) =>
    执行带重试(() => 实例.get<T>(url, 配置), true, 配置),
  post: <T = any>(url: string, 数据?: any, 配置?: any) => {
    if (typeof 配置?.miDengJian === 'string' && 配置.miDengJian) {
      const daiMiDengJianPeiZhi = {
        ...(配置 || {}),
        headers: { ...(配置?.headers || {}), 'Idempotency-Key': 配置.miDengJian as string },
      }
      return 执行带重试(
        () => 实例.post<T>(url, 数据, daiMiDengJianPeiZhi),
        true,
        daiMiDengJianPeiZhi,
      )
    }
    return 实例.post<T>(url, 数据, 配置)
  },
  put: <T = any>(url: string, 数据?: any, 配置?: any) =>
    xianRongZiDongChongShi(配置)
      ? 执行带重试(() => 实例.put<T>(url, 数据, 配置), true, 配置)
      : 实例.put<T>(url, 数据, 配置),
  patch: <T = any>(url: string, 数据?: any, 配置?: any) =>
    xianRongZiDongChongShi(配置)
      ? 执行带重试(() => 实例.patch<T>(url, 数据, 配置), true, 配置)
      : 实例.patch<T>(url, 数据, 配置),
  delete: <T = any>(url: string, 配置?: any) =>
    xianRongZiDongChongShi(配置)
      ? 执行带重试(() => 实例.delete<T>(url, 配置), true, 配置)
      : 实例.delete<T>(url, 配置),
  取消所有请求: () => {
    JIN_XING_ZHONG_QING_QIU.forEach(( tongYiFang) => tongYiFang.forEach((控制器) => 控制器.abort()))
    JIN_XING_ZHONG_QING_QIU.clear()
  },
  取消请求: (方法: string, url: string) => {
    const key = `${方法.toUpperCase()}:${url}`
    const tongYiFang = JIN_XING_ZHONG_QING_QIU.get(key)
    if (!tongYiFang) return
    tongYiFang.forEach((控制器) => 控制器.abort())
    JIN_XING_ZHONG_QING_QIU.delete(key)
  },
}

function shiYouXiangYingWenFeng(shuJu: unknown): shuJu is ApiXiangYing<unknown> {
  return (
    typeof shuJu === 'object' &&
    shuJu !== null &&
    'cheng_gong' in shuJu &&
    typeof (shuJu as { cheng_gong?: unknown }).cheng_gong === 'boolean'
  )
}

function quChuLiuLu(url: string | undefined): string | undefined {
  if (typeof url !== 'string') return undefined
  return url.split(/[?#]/, 1)[0]
}

function shangBaQianTaiCuoWu(cuoWu: QianTaiCuoWu, yuanLeiXing: string, url?: string): void {
  chuFaCuoWuShangBao({
    leiBie: 'weiZhi',
    cuoWu: {
      name: 'QianTaiCuoWu',
      code: cuoWu.code,
      status: cuoWu.httpStatus,
      traceId: cuoWu.traceId,
    },
    shiJianChuo: Date.now(),
    fuJia: {
      yuanLeiXing,
      url: quChuLiuLu(url),
    },
  })
}

实例.interceptors.response.use(
  (响应) => {
    if (!shiYouXiangYingWenFeng(响应.data)) {
      const traceId = guiYiBaoFengTraceId(null, { response: { headers: 响应.headers } })
      return Promise.reject(chuangJianQianTaiCuoWu({
        code: QIAN_TAI_DAI_MA.XIE_YI,
        retryable: true,
        traceId,
        httpStatus: 响应.status,
        qingQiuFangFa: 响应.config?.method?.toUpperCase() || null,
        yuanLeiXing: 'xieYi',
      }))
    }
    if (!响应.data.cheng_gong) {
      return Promise.reject(归一前台错误({
        response: {
          status: 响应.status,
          data: 响应.data,
          headers: 响应.headers,
        },
        config: 响应.config,
      }))
    }
    return 响应
  },
  async (错误) => {
    if (axios.isAxiosError(错误) && 错误.response?.status === 401) {
      const yuanQingQiu = 错误.config as KeZhongShiPeiZhi | undefined
      const authenticationRequest = shiRenZhengQingQiu(yuanQingQiu?.url)
      const sessionRequest = !authenticationRequest || shiYanZhengQingQiu(yuanQingQiu?.url)
      if (
        yuanQingQiu &&
        !yuanQingQiu.__yiShuaXin &&
        !authenticationRequest &&
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
      const requestToken = huoQuQingQiuDaiB(yuanQingQiu?.headers)
      const currentToken = duQuLingPai()
      const hasRequestSnapshot = Object.prototype.hasOwnProperty.call(
        yuanQingQiu || {},
        '__huiFuQingQuDaiB',
      )
      const qingChuToken = requestToken ?? (hasRequestSnapshot ? yuanQingQiu?.__huiFuQingQuDaiB : currentToken)
      const canClear = qingChuToken === currentToken
      if (sessionRequest && canClear) {
        if (qingChuToken === duQuLingPai()) {
          qingChuLingPai()
          qingChuShuaXinLingPai()
        }
        const tuiChuDaoLu = () => {
          if (window.location.pathname !== '/login') {
            router.push({
              path: '/login',
              query: { redirect: window.location.pathname + window.location.search },
            })
          }
        }
        void 使用用户仓库().then((用户仓库) => {
          if (用户仓库.清空用户状态(qingChuToken) === false) return
          tuiChuDaoLu()
        })
      }
    }

    const zhengChangHua = 归一前台错误(错误)
    if (
      zhengChangHua.yuanLeiXing === 'wangLuo' ||
      zhengChangHua.yuanLeiXing === 'chaoShi' ||
      (zhengChangHua.httpStatus !== null && zhengChangHua.httpStatus >= 500)
    ) {
      shangBaQianTaiCuoWu(
        zhengChangHua,
        zhengChangHua.yuanLeiXing,
        axios.isAxiosError(错误) ? 错误.config?.url : undefined,
      )
    }
    return Promise.reject(zhengChangHua)
  },
)

export { 实例 as 默认实例, 包装实例 as 请求实例 }
export default 实例
