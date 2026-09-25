import type { RequestHandler } from 'express'
import { chuangJianRiZhiYinQing, sheZhiRiZhiJiBie, guanBiRiZhiYinQing } from './日志引擎'
import { fenFaRiZhi } from './日志订阅'
import { peiZhi } from '../config'

export type RiZhiJiBie = 'debug' | 'info' | 'warn' | 'error'

export interface RiZhiTiaoMu {
  shi_jian: string
  ji_bie: RiZhiJiBie
  lei_xing: string
  xiao_xi: string
  yong_hu_id?: string
  jiao_se_id?: string
  qing_qiu_id?: string
  xiang_qing?: Record<string, unknown>
}

export interface RiZhiXuanXiang {
  yong_hu_id?: string
  jiao_se_id?: string
  qing_qiu_id?: string
  xiang_qing?: Record<string, unknown>
}

type RiZhiDuiXiang = {
  debug: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
  info: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
  warn: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
  error: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) => void
}

type QingQiuRiZhiDuiXiang = {
  debug: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
  info: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
  warn: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
  error: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) => void
}

const TUO_MIN_ZHI = '***'
const ZUI_DA_RiZhiShenDu = 8
const ZUI_DA_RiZhiShuZu = 100
const JWT_ZHENG_ZE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
const DAI_MING_ZHI = /([A-Za-z][A-Za-z0-9+.-]*:\/\/[^:/\s]+:)[^@\s/]+@/g

function zhuanYiZhengZe(zhi: string): string {
  return zhi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function tuoMinRiZhiWenBen(zhi: string): string {
  let jieGuo = zhi
  for (const jian of peiZhi.minGanZiDuan.guanJianZi) {
    const anQuanJian = zhuanYiZhengZe(jian)
    const dengHao = new RegExp(`(["']?${anQuanJian}["']?\\s*[:=]\\s*)(["'])(.*?)\\2`, 'gi')
    jieGuo = jieGuo.replace(dengHao, '$1$2***$2')
    const meiYinHao = new RegExp(`\\b${anQuanJian}\\b\\s*[:=]\\s*[^\\s,;]+`, 'gi')
    jieGuo = jieGuo.replace(meiYinHao, '$1***')
  }
  jieGuo = jieGuo.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***')
  jieGuo = jieGuo.replace(JWT_ZHENG_ZE, TUO_MIN_ZHI)
  jieGuo = jieGuo.replace(DAI_MING_ZHI, '$1***@')
  return jieGuo
}

function shiMinGanJianMing(jian: string): boolean {
  const xiaoXie = jian.toLowerCase()
  return peiZhi.minGanZiDuan.ziDuanMing.some((ziDuan) => ziDuan.toLowerCase() === xiaoXie)
}

function tuoMinZhi(zhi: unknown, shenDu: number): unknown {
  if (typeof zhi === 'string') return tuoMinRiZhiWenBen(zhi)
  if (zhi === null || typeof zhi !== 'object') return zhi
  if (zhi instanceof Error) {
    return {
      ming_cheng: tuoMinRiZhiWenBen(zhi.name),
      xiao_xi: tuoMinRiZhiWenBen(zhi.message),
      zhan: tuoMinRiZhiWenBen(zhi.stack || ''),
    }
  }
  if (shenDu <= 0) return TUO_MIN_ZHI
  if (Array.isArray(zhi)) return zhi.slice(0, ZUI_DA_RiZhiShuZu).map((xiang) => tuoMinZhi(xiang, shenDu - 1))
  const jieGuo: Record<string, unknown> = {}
  for (const [jian, zhiXiang] of Object.entries(zhi as Record<string, unknown>).slice(0, ZUI_DA_RiZhiShuZu)) {
    jieGuo[jian] = shiMinGanJianMing(jian) ? TUO_MIN_ZHI : tuoMinZhi(zhiXiang, shenDu - 1)
  }
  return jieGuo
}

export function qingLiNeiBuCuoWu(cuoWu: unknown): Record<string, string> {
  if (cuoWu instanceof Error) {
    return {
      ming_cheng: tuoMinRiZhiWenBen(cuoWu.name),
      cuo_wu: tuoMinRiZhiWenBen(cuoWu.message),
      zhan: tuoMinRiZhiWenBen(cuoWu.stack || ''),
    }
  }
  return { ming_cheng: 'UnknownError', cuo_wu: tuoMinRiZhiWenBen(String(cuoWu)) }
}

function gouJianShangXiaWen(xuanXiang: RiZhiXuanXiang | undefined): Record<string, unknown> {
  const shangXiaWen: Record<string, unknown> = {}
  if (xuanXiang?.yong_hu_id) shangXiaWen.yong_hu_id = xuanXiang.yong_hu_id
  if (xuanXiang?.jiao_se_id) shangXiaWen.jiao_se_id = xuanXiang.jiao_se_id
  if (xuanXiang?.qing_qiu_id) shangXiaWen.qing_qiu_id = xuanXiang.qing_qiu_id
  if (xuanXiang?.xiang_qing) shangXiaWen.xiang_qing = tuoMinZhi(xuanXiang.xiang_qing, ZUI_DA_RiZhiShenDu)
  return shangXiaWen
}

export function sheZhiZuiDiRiZhiJiBie(jiBie: RiZhiJiBie): void {
  sheZhiRiZhiJiBie(jiBie)
}

export function xieRuRiZhi(
  jiBie: RiZhiJiBie,
  leiXing: string,
  xiaoXi: string,
  xuanXiang?: RiZhiXuanXiang,
): void {
  const yinQing = chuangJianRiZhiYinQing()
  const shangXiaWen = gouJianShangXiaWen(xuanXiang)
  const heBingDuiXiang = { lei_xing: leiXing, ...shangXiaWen }
  const guoLvXiaoXi = tuoMinRiZhiWenBen(String(xiaoXi))
  const jiBieFangFaBiao: Record<RiZhiJiBie, (obj: object, msg?: string) => void> = {
    debug: (...canShu) => yinQing.debug(...canShu),
    info: (...canShu) => yinQing.info(...canShu),
    warn: (...canShu) => yinQing.warn(...canShu),
    error: (...canShu) => yinQing.error(...canShu),
  }
  jiBieFangFaBiao[jiBie](heBingDuiXiang, guoLvXiaoXi)
  if (yinQing.isLevelEnabled(jiBie)) {
    fenFaRiZhi(jiBie, leiXing, guoLvXiaoXi, shangXiaWen)
  }
}

export const debug日志: RiZhiDuiXiang = {
  debug: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('debug', leiXing, xiaoXi, xuanXiang),
  info: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('info', leiXing, xiaoXi, xuanXiang),
  warn: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('warn', leiXing, xiaoXi, xuanXiang),
  error: (leiXing: string, xiaoXi: string, xuanXiang?: RiZhiXuanXiang) =>
    xieRuRiZhi('error', leiXing, xiaoXi, xuanXiang),
}

export function withRequestId(
  qingQiuId: string,
  yongHuId?: string,
  jiaoSeId?: string,
): QingQiuRiZhiDuiXiang {
  const daiRuXuanXiang = (xiangQing?: Record<string, unknown>): RiZhiXuanXiang => ({
    qing_qiu_id: qingQiuId,
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: xiangQing,
  })
  return {
    debug: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('debug', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
    info: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('info', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
    warn: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('warn', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
    error: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>) =>
      xieRuRiZhi('error', leiXing, xiaoXi, daiRuXuanXiang(xiangQing)),
  }
}

export function jiLuHTTPQingQiu(
  fangFa: string,
  luJing: string,
  zhuangTaiMa: number,
  haoShi: number,
  yongHuId?: string,
): void {
  const huanJing = peiZhi.huanJing
  const jiBie: RiZhiJiBie = zhuangTaiMa >= 500 ? 'error' : zhuangTaiMa >= 400 ? 'warn' : 'info'
  debug日志[jiBie]('HTTP请求', `${fangFa} ${luJing} ${zhuangTaiMa} ${haoShi}ms`, {
    yong_hu_id: yongHuId,
    xiang_qing: {
      fang_fa: fangFa,
      lu_jing: luJing,
      zhuang_tai_ma: zhuangTaiMa,
      hao_shi: haoShi,
      huan_jing: huanJing,
    },
  })
}

export function chuangJianHTTPRiZhiZhongJianJian(): RequestHandler {
  return (qingQiu, xiangYing, xiaYiBu) => {
    const kaiShiShiJian = (qingQiu as unknown as Record<string, number>).kai_shi_shi_jian || Date.now()

    xiangYing.on('finish', () => {
      const haoShi = Date.now() - kaiShiShiJian
      const yongHuId = (qingQiu as unknown as { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
      jiLuHTTPQingQiu(qingQiu.method, qingQiu.path, xiangYing.statusCode, haoShi, yongHuId)
    })

    xiaYiBu()
  }
}

export function jiLuSocketShiJian(
  shiJian: string,
  yongHuId: string,
  xiangQing?: Record<string, unknown>,
): void {
  debug日志.info('Socket事件', shiJian, {
    yong_hu_id: yongHuId,
    xiang_qing: xiangQing,
  })
}

export function jiLuAIJiLu(
  moXingLeiXing: string,
  moXing: string,
  haoShi: number,
  chengGong: boolean,
  cuoWu?: string,
): void {
  const jiBie: RiZhiJiBie = chengGong ? 'info' : 'error'
  debug日志[jiBie]('AI调用', `${moXingLeiXing} ${moXing} ${chengGong ? '成功' : '失败'} ${haoShi}ms`, {
    xiang_qing: {
      mo_xing_lei_xing: moXingLeiXing,
      mo_xing: moXing,
      hao_shi: haoShi,
      cheng_gong: chengGong,
      cuo_wu: cuoWu,
    },
  })
}

export function jiLuHaoGanDuBianHua(
  yongHuId: string,
  jiaoSeId: string,
  bianHua: Record<string, unknown>,
  xinZongFen?: number,
): void {
  debug日志.info('好感度变更', `用户 ${yongHuId} 角色 ${jiaoSeId}`, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      bian_hua: bianHua,
      xin_zong_fen: xinZongFen,
    },
  })
}

export function jiLuJunShiQiuZhu(
  yongHuId: string,
  jiaoSeId: string,
  chengGong: boolean,
  cuoWuMa?: string,
): void {
  const jiBie: RiZhiJiBie = chengGong ? 'info' : 'warn'
  debug日志[jiBie]('军师指导', `用户 ${yongHuId} 角色 ${jiaoSeId} ${chengGong ? '成功' : '失败'}`, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      cheng_gong: chengGong,
      cuo_wu_ma: cuoWuMa,
    },
  })
}

export function jiLuYouXiJieJu(
  yongHuId: string,
  jiaoSeId: string,
  jieGuoLeiXing: string,
): void {
  debug日志.info('游戏结局', `用户 ${yongHuId} 角色 ${jiaoSeId} 触发 ${jieGuoLeiXing}`, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      jie_guo_lei_xing: jieGuoLeiXing,
    },
  })
}

export function jiLuXiaoXiCaoZuo(
  caoZuo: string,
  yongHuId: string,
  jiaoSeId: string,
  faSongZheLeiXing: string,
  xiangQing?: Record<string, unknown>,
): void {
  debug日志.info('消息操作', caoZuo, {
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    xiang_qing: {
      cao_zuo: caoZuo,
      fa_song_zhe_lei_xing: faSongZheLeiXing,
      ...xiangQing,
    },
  })
}

export function guanBiRiZhiLiu(): Promise<void> {
  return guanBiRiZhiYinQing()
}
