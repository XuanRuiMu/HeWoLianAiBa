import axios from 'axios'
import { huoQuFanYi } from '@/config/translations'
import {
  QIAN_TAI_DAI_MA,
  daiMaHuoQuTongYongDaiMa,
  guiYiQianTaiDaiMa,
  huoQuWenBenLeiXing,
  moRenKeChongShi,
  type QianTaiDaiMa,
  type QianTaiWenBenLeiXing,
} from '@/config/前台错误码'

export interface HouTaiCuoWuBaoFeng {
  code?: string
  message?: string
  traceId?: string
  retryable?: boolean
  retryAfterMs?: number
}

export type QianTaiCuoWuYuanLeiXing = 'houTai' | 'wangLuo' | 'chaoShi' | 'xieYi' | 'quXiao' | 'weiZhi'

export interface QianTaiCuoWuXinXi {
  code: QianTaiDaiMa
  yingXiang: string
  xiaYiBu: string
  retryable: boolean
  traceId: string | null
  retryAfterMs: number | null
  httpStatus: number | null
  qingQiuFangFa: string | null
  leiXing: QianTaiWenBenLeiXing
  yuanLeiXing: QianTaiCuoWuYuanLeiXing
  houTaiBaoFeng: HouTaiCuoWuBaoFeng | null
  jiuDaiMa: string | null
  zhongShiCiShu: number
  xianShi: boolean
}

export class QianTaiCuoWu extends Error implements QianTaiCuoWuXinXi {
  readonly code: QianTaiDaiMa
  readonly yingXiang: string
  readonly xiaYiBu: string
  readonly retryable: boolean
  readonly traceId: string | null
  readonly retryAfterMs: number | null
  readonly httpStatus: number | null
  readonly qingQiuFangFa: string | null
  readonly leiXing: QianTaiWenBenLeiXing
  readonly yuanLeiXing: QianTaiCuoWuYuanLeiXing
  readonly houTaiBaoFeng: HouTaiCuoWuBaoFeng | null
  readonly jiuDaiMa: string | null
  zhongShiCiShu: number
  readonly xianShi: boolean
  cuo_wu_ma: QianTaiDaiMa

  constructor(xinXi: QianTaiCuoWuXinXi, yuanShiCuoWu?: unknown) {
    super(xinXi.yingXiang)
    this.name = 'QianTaiCuoWu'
    this.code = xinXi.code
    this.yingXiang = xinXi.yingXiang
    this.xiaYiBu = xinXi.xiaYiBu
    this.retryable = xinXi.retryable
    this.traceId = xinXi.traceId
    this.retryAfterMs = xinXi.retryAfterMs
    this.httpStatus = xinXi.httpStatus
    this.qingQiuFangFa = xinXi.qingQiuFangFa
    this.leiXing = xinXi.leiXing
    this.yuanLeiXing = xinXi.yuanLeiXing
    this.houTaiBaoFeng = xinXi.houTaiBaoFeng
    this.jiuDaiMa = xinXi.jiuDaiMa
    this.zhongShiCiShu = xinXi.zhongShiCiShu
    this.xianShi = xinXi.xianShi
    this.cuo_wu_ma = xinXi.code
    if (yuanShiCuoWu !== undefined) this.cause = yuanShiCuoWu
  }
}

export function shiQianTaiCuoWu(zhi: unknown): zhi is QianTaiCuoWu {
  return zhi instanceof QianTaiCuoWu
}

function duQuWenBenLeiXing(leiXing: QianTaiWenBenLeiXing): { yingXiang: string; xiaYiBu: string } {
  switch (leiXing) {
    case 'qingQiu':
      return {
        yingXiang: huoQuFanYi('tongYong', 'qingQiuWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'qingQiuWenTiXiaYiBu'),
      }
    case 'wangLuo':
      return {
        yingXiang: huoQuFanYi('tongYong', 'wangLuoWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'wangLuoWenTiXiaYiBu'),
      }
    case 'chaoShi':
      return {
        yingXiang: huoQuFanYi('tongYong', 'chaoShiWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'chaoShiWenTiXiaYiBu'),
      }
    case 'fangWen':
      return {
        yingXiang: huoQuFanYi('tongYong', 'xieYiWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'xieYiWenTiXiaYiBu'),
      }
    case 'jianQuan':
      return {
        yingXiang: huoQuFanYi('tongYong', 'jianQuanWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'jianQuanWenTiXiaYiBu'),
      }
    case 'quanXian':
      return {
        yingXiang: huoQuFanYi('tongYong', 'quanXianWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'quanXianWenTiXiaYiBu'),
      }
    case 'ziYuan':
      return {
        yingXiang: huoQuFanYi('tongYong', 'ziYuanWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'ziYuanWenTiXiaYiBu'),
      }
    case 'chongTu':
      return {
        yingXiang: huoQuFanYi('tongYong', 'chongTuWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'chongTuWenTiXiaYiBu'),
      }
    case 'pinFan':
      return {
        yingXiang: huoQuFanYi('tongYong', 'pinFanWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'pinFanWenTiXiaYiBu'),
      }
    case 'fuWu':
      return {
        yingXiang: huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'fuWuWenTiXiaYiBu'),
      }
    case 'jiaoSe':
      return {
        yingXiang: huoQuFanYi('tongYong', 'jiaoSeWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'jiaoSeWenTiXiaYiBu'),
      }
    case 'zhanJi':
      return {
        yingXiang: huoQuFanYi('tongYong', 'zhanJiWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'zhanJiWenTiXiaYiBu'),
      }
    case 'quXiao':
      return {
        yingXiang: huoQuFanYi('tongYong', 'qingQiuWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'qingQiuWenTiXiaYiBu'),
      }
    case 'tongYong':
    default:
      return {
        yingXiang: huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'),
        xiaYiBu: huoQuFanYi('tongYong', 'tongYongWenTiXiaYiBu'),
      }
  }
}

function duQuBaoFeng(shuJu: unknown): HouTaiCuoWuBaoFeng | null {
  if (typeof shuJu !== 'object' || shuJu === null) return null
  const duiXiang = shuJu as Record<string, unknown>
  const code = typeof duiXiang.code === 'string' ? duiXiang.code : undefined
  const message =
    typeof duiXiang.message === 'string'
      ? duiXiang.message
      : typeof duiXiang.ti_shi === 'string'
        ? duiXiang.ti_shi
        : undefined
  const traceId = typeof duiXiang.traceId === 'string' ? duiXiang.traceId : undefined
  const retryable = typeof duiXiang.retryable === 'boolean' ? duiXiang.retryable : undefined
  const retryAfterMs =
    typeof duiXiang.retryAfterMs === 'number' && Number.isFinite(duiXiang.retryAfterMs)
      ? duiXiang.retryAfterMs
      : undefined
  return { code, message, traceId, retryable, retryAfterMs }
}

function anQuanTraceId(zhi: unknown): string | null {
  if (typeof zhi !== 'string') return null
  const jingZheng = zhi.trim()
  if (!jingZheng || jingZheng.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(jingZheng)) return null
  return jingZheng
}

function duQuJiuDaiMa(shuJu: unknown, yuanShiCuoWu?: unknown): string | null {
  const duiXiang = (zhi: unknown) => {
    if (typeof zhi !== 'object' || zhi === null) return null
    const zhi2 = (zhi as Record<string, unknown>).cuo_wu_ma
    return typeof zhi2 === 'string' && zhi2 ? zhi2 : null
  }
  return duiXiang(shuJu) || duiXiang(yuanShiCuoWu)
}

function duQuFangFa(zhi: unknown): string | null {
  if (typeof zhi !== 'object' || zhi === null) return null
  const fangFa = (zhi as { config?: { method?: unknown } }).config?.method
  return typeof fangFa === 'string' ? fangFa.toUpperCase() : null
}

function duQuZhuangTai(zhi: unknown): number | null {
  if (typeof zhi !== 'object' || zhi === null) return null
  const zhuangTai = (zhi as { response?: { status?: unknown } }).response?.status
  return typeof zhuangTai === 'number' && Number.isFinite(zhuangTai) ? zhuangTai : null
}

function duQuShuJu(zhi: unknown): unknown {
  if (typeof zhi !== 'object' || zhi === null) return undefined
  return (zhi as { response?: { data?: unknown } }).response?.data
}

export interface ChuangJianQianTaiCuoWuCanShu {
  leiXing?: QianTaiWenBenLeiXing
  yuanLeiXing?: QianTaiCuoWuYuanLeiXing
  code?: QianTaiDaiMa
  retryable?: boolean
  traceId?: string | null
  retryAfterMs?: number | null
  httpStatus?: number | null
  qingQiuFangFa?: string | null
  houTaiBaoFeng?: HouTaiCuoWuBaoFeng | null
  jiuDaiMa?: string | null
  zhongShiCiShu?: number
  yingXiang?: string
  xiaYiBu?: string
}

export function chuangJianQianTaiCuoWu(
  canShu: ChuangJianQianTaiCuoWuCanShu = {},
  yuanShiCuoWu?: unknown,
): QianTaiCuoWu {
  const code = canShu.code || QIAN_TAI_DAI_MA.WEI_ZHI
  const leiXing = canShu.leiXing || huoQuWenBenLeiXing(code)
  const wenBen = duQuWenBenLeiXing(leiXing)
  const houTaiBaoFeng = canShu.houTaiBaoFeng || null
  const traceId = anQuanTraceId(canShu.traceId ?? houTaiBaoFeng?.traceId)
  const retryAfterMs =
    typeof canShu.retryAfterMs === 'number' && Number.isFinite(canShu.retryAfterMs)
      ? Math.min(120000, Math.max(0, Math.round(canShu.retryAfterMs)))
      : typeof houTaiBaoFeng?.retryAfterMs === 'number'
        ? Math.min(120000, Math.max(0, Math.round(houTaiBaoFeng.retryAfterMs)))
        : null
  return new QianTaiCuoWu(
    {
      code,
      yingXiang: canShu.yingXiang || wenBen.yingXiang,
      xiaYiBu: canShu.xiaYiBu || wenBen.xiaYiBu,
      retryable: canShu.retryable ?? moRenKeChongShi(code),
      traceId,
      retryAfterMs,
      httpStatus: canShu.httpStatus ?? null,
      qingQiuFangFa: canShu.qingQiuFangFa ?? null,
      leiXing,
      yuanLeiXing: canShu.yuanLeiXing ?? 'weiZhi',
      houTaiBaoFeng,
      jiuDaiMa: canShu.jiuDaiMa ?? null,
      zhongShiCiShu: Math.max(1, canShu.zhongShiCiShu || 1),
      xianShi: code !== QIAN_TAI_DAI_MA.QU_XIAO,
    },
    yuanShiCuoWu,
  )
}

function shiXieYiCuoWu(zhi: unknown): boolean {
  return zhi instanceof SyntaxError || (zhi instanceof Error && zhi.name === 'SyntaxError')
}

function shiQuXiaoCuoWu(zhi: unknown): boolean {
  if (typeof zhi !== 'object' || zhi === null) return false
  const duiXiang = zhi as { code?: unknown; name?: unknown }
  return duiXiang.code === 'ERR_CANCELED' || duiXiang.name === 'CanceledError' || duiXiang.name === 'AbortError'
}

export function guiYiBaoFengTraceId(baoFeng: HouTaiCuoWuBaoFeng | null, touWenBen?: unknown): string | null {
  const ziFuTou = anQuanTraceId(baoFeng?.traceId)
  if (ziFuTou) return ziFuTou
  if (typeof touWenBen !== 'object' || touWenBen === null) return null
  const tou = touWenBen as {
    response?: { headers?: Record<string, unknown> }
    config?: { headers?: Record<string, unknown> }
  }
  return (
    anQuanTraceId(tou.response?.headers?.['x-request-id']) ||
    anQuanTraceId(tou.response?.headers?.['x-trace-id']) ||
    anQuanTraceId(tou.config?.headers?.['X-Request-Id']) ||
    null
  )
}

export function 归一前台错误(zhi: unknown): QianTaiCuoWu {
  if (shiQianTaiCuoWu(zhi)) return zhi
  const zhuangTai = duQuZhuangTai(zhi)
  const shuJu = duQuShuJu(zhi)
  const baoFeng = duQuBaoFeng(shuJu)
  const jiuDaiMa = duQuJiuDaiMa(shuJu, zhi)
  const qingQiuFangFa = duQuFangFa(zhi)
  const traceId = guiYiBaoFengTraceId(baoFeng, zhi)
  if (shiQuXiaoCuoWu(zhi)) {
    return chuangJianQianTaiCuoWu(
      {
        code: QIAN_TAI_DAI_MA.QU_XIAO,
        retryable: false,
        traceId,
        httpStatus: zhuangTai,
        qingQiuFangFa,
        houTaiBaoFeng: baoFeng,
        jiuDaiMa,
        yuanLeiXing: 'quXiao',
      },
      zhi,
    )
  }
  const houTaiDaiMa = guiYiQianTaiDaiMa(baoFeng?.code) || guiYiQianTaiDaiMa(jiuDaiMa)
  const youZhiDingDaiMa = Boolean(baoFeng?.code || jiuDaiMa)
  const duiXiangFu =
    typeof shuJu === 'object' && shuJu !== null && !Array.isArray(shuJu)
      ? (shuJu as Record<string, unknown>)
      : null
  const youBaoFengZiDian = Boolean(
    duiXiangFu &&
      ('cheng_gong' in duiXiangFu || 'code' in duiXiangFu || 'cuo_wu_ma' in duiXiangFu),
  )
  if (
    shiXieYiCuoWu(zhi) ||
    (zhuangTai !== null &&
      zhuangTai < 400 &&
      shuJu !== undefined &&
      baoFeng === null &&
      !youBaoFengZiDian)
  ) {
    const daiMa = QIAN_TAI_DAI_MA.XIE_YI
    return chuangJianQianTaiCuoWu(
      {
        code: daiMa,
        retryable: moRenKeChongShi(daiMa),
        traceId,
        httpStatus: zhuangTai,
        qingQiuFangFa,
        houTaiBaoFeng: baoFeng,
        jiuDaiMa,
        yuanLeiXing: 'xieYi',
      },
      zhi,
    )
  }
  if (zhuangTai === null && (houTaiDaiMa || baoFeng || jiuDaiMa)) {
    const daiMa = houTaiDaiMa || QIAN_TAI_DAI_MA.WEI_ZHI
    return chuangJianQianTaiCuoWu(
      {
        code: daiMa,
        retryable: baoFeng?.retryable ?? moRenKeChongShi(daiMa),
        traceId,
        retryAfterMs: baoFeng?.retryAfterMs ?? null,
        qingQiuFangFa,
        houTaiBaoFeng: baoFeng,
        jiuDaiMa,
        yuanLeiXing: 'houTai',
      },
      zhi,
    )
  }
  if (zhuangTai === null) {
    const axiosTong = axios.isAxiosError(zhi)
    const axiosDaiMa = typeof zhi === 'object' && zhi !== null ? (zhi as { code?: unknown }).code : undefined
    const chaoShi =
      axiosDaiMa === 'ECONNABORTED' || axiosDaiMa === 'ETIMEDOUT' || axiosDaiMa === 'ERR_CANCELED'
    const daiMa = !axiosTong
      ? QIAN_TAI_DAI_MA.WEI_ZHI
      : chaoShi
        ? QIAN_TAI_DAI_MA.CHAO_SHI
        : QIAN_TAI_DAI_MA.WANG_LUO
    return chuangJianQianTaiCuoWu(
      {
        code: daiMa,
        retryable: axiosTong || moRenKeChongShi(daiMa),
        traceId,
        qingQiuFangFa,
        houTaiBaoFeng: baoFeng,
        jiuDaiMa,
        yuanLeiXing: !axiosTong ? 'weiZhi' : chaoShi ? 'chaoShi' : 'wangLuo',
      },
      zhi,
    )
  }
  const daiMa =
    houTaiDaiMa ||
    (youZhiDingDaiMa ? QIAN_TAI_DAI_MA.WEI_ZHI : daiMaHuoQuTongYongDaiMa(zhuangTai)) ||
    QIAN_TAI_DAI_MA.WEI_ZHI
  return chuangJianQianTaiCuoWu(
    {
      code: daiMa,
      retryable: baoFeng?.retryable ?? moRenKeChongShi(daiMa),
      traceId,
      retryAfterMs: baoFeng?.retryAfterMs ?? null,
      httpStatus: zhuangTai,
      qingQiuFangFa,
      houTaiBaoFeng: baoFeng,
      jiuDaiMa,
      yuanLeiXing: 'houTai',
    },
    zhi,
  )
}
