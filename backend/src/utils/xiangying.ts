import type { Response } from 'express'
import type { ApiXiangYing } from '../types'
import { taoYiShuChu } from '../middleware/安全'
import {
  daiMaHuoQuZhuangTaiMa,
  huoQuCuoWuXianRong,
  zhuanHuanJiuDaiMa,
  type CuoWuDaiMa,
} from '../config/错误码注册表'
import { queDingXiangYingZhuanZongId } from '../middleware/日志追踪'

const ZUI_DA_ZhongWenBenChangDu = 500
const ZUI_DA_ChongShiMiaoShuHaoMiao = 24 * 60 * 60 * 1000
const KE_AN_QUAN_FIELD_BAI_MING_DAN: ReadonlySet<string> = new Set([
  'username',
  'expectedVersion',
  'recordIds',
  'categoryId',
  'targetCategoryId',
])

export interface ShiBaiXiangYingXuanXiang {
  retryAfterMs?: number
  fieldErrors?: Record<string, string>
}

function anQuanKeWaiWenBen(zhi: string | undefined, houTuiWenBen: string): string {
  if (typeof zhi !== 'string') return houTuiWenBen
  const jieGuo = zhi.trim().slice(0, ZUI_DA_ZhongWenBenChangDu)
  if (!jieGuo || !/[\u3400-\u9fff]/.test(jieGuo)) return houTuiWenBen
  if (/select|insert|update|delete|stack|sqlstate|postgres|mysql|redis|password|api[_-]?key|bearer\s|jwt|[A-Za-z]:[\\/]|\/(?:app|home|usr|var)\//i.test(jieGuo)) {
    return houTuiWenBen
  }
  return jieGuo
}

function anQuanZiDuanCuoWu(wenBen: unknown): Record<string, string> | undefined {
  if (!wenBen || typeof wenBen !== 'object' || Array.isArray(wenBen)) return undefined
  const jieGuo: Record<string, string> = {}
  for (const [jian, zhi] of Object.entries(wenBen)) {
    if (!KE_AN_QUAN_FIELD_BAI_MING_DAN.has(jian)) continue
    if (typeof zhi !== 'string') continue
    const anQuanZhi = zhi.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200)
    if (anQuanZhi) jieGuo[jian] = anQuanZhi
  }
  return Object.keys(jieGuo).length > 0 ? jieGuo : undefined
}

function anQuanCuoWuMa(zhi: string | undefined, houTui: string): string {
  return zhi && /^[A-Z][A-Z0-9_]{0,63}$/.test(zhi) ? zhi : houTui
}

function quYongRetryAfterMs(zhi: number | undefined, houTui: number | undefined): number | undefined {
  if (typeof zhi === 'number' && Number.isSafeInteger(zhi) && zhi > 0 && zhi <= ZUI_DA_ChongShiMiaoShuHaoMiao) return zhi
  if (typeof houTui === 'number' && Number.isSafeInteger(houTui) && houTui > 0 && houTui <= ZUI_DA_ChongShiMiaoShuHaoMiao) return houTui
  return undefined
}

export function chuangJianCuoWuXiangYing(
  zhuangTaiMa: number,
  tiShi: string,
  cuoWuMa?: string,
  xuanXiang: ShiBaiXiangYingXuanXiang = {},
): ApiXiangYing<null> {
  const zhuanHuanMa = zhuanHuanJiuDaiMa(cuoWuMa)
  const daiMa: CuoWuDaiMa = zhuanHuanMa || daiMaHuoQuZhuangTaiMa(zhuangTaiMa)
  const xianRong = huoQuCuoWuXianRong(daiMa)
  const houTuiWenBen = xianRong.message
  const message = zhuanHuanMa
    ? houTuiWenBen
    : anQuanKeWaiWenBen(tiShi, houTuiWenBen)
  const retryAfterMs = quYongRetryAfterMs(xuanXiang.retryAfterMs, xianRong.retryAfterMs)
  const fieldErrors = anQuanZiDuanCuoWu(xuanXiang.fieldErrors)
  return {
    cheng_gong: false,
    shu_ju: null,
    ti_shi: anQuanKeWaiWenBen(tiShi, houTuiWenBen),
    cuo_wu_ma: anQuanCuoWuMa(cuoWuMa, daiMa),
    code: daiMa,
    message,
    retryable: xianRong.retryable,
    ...(retryAfterMs ? { retryAfterMs } : {}),
    ...(fieldErrors ? { fieldErrors } : {}),
  }
}

export function chengGongXiangYing<T>(
  xiangYing: Response,
  shuJu: T,
  tiShi?: string,
): void {
  const jieGuo: ApiXiangYing<T> = {
    cheng_gong: true,
    shu_ju: taoYiShuChu(shuJu) as T,
    ti_shi: tiShi,
  }
  xiangYing.json(jieGuo)
}

export function shiBaiXiangYing(
  xiangYing: Response,
  zhuangTaiMa: number,
  tiShi: string,
  cuoWuMa?: string,
  xuanXiang?: ShiBaiXiangYingXuanXiang,
): void {
  const jieGuo = chuangJianCuoWuXiangYing(zhuangTaiMa, tiShi, cuoWuMa, xuanXiang)
  const traceId = queDingXiangYingZhuanZongId(xiangYing)
  const daiMa = zhuanHuanJiuDaiMa(cuoWuMa) || daiMaHuoQuZhuangTaiMa(zhuangTaiMa)
  xiangYing.status(zhuanHuanJiuDaiMa(cuoWuMa) && zhuangTaiMa !== 200 ? huoQuCuoWuXianRong(daiMa).httpStatus : zhuangTaiMa)
  xiangYing.json({ ...jieGuo, traceId })
}
