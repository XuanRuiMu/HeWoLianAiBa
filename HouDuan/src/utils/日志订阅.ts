import { peiZhi } from '../config'
import { riZhiTuiSongPeiZhi } from '../config/日志推送配置'
import type { RiZhiJiBie, RiZhiTiaoMu } from './debug日志'

export type RiZhiDingYueZhe = (tiaoMu: RiZhiTiaoMu) => void

const dingYueZheJiHe = new Set<RiZhiDingYueZhe>()
let fenFaZhong = false

const JwtZhengZe = /^[A-Za-z0-9+/=_-]+(\.[A-Za-z0-9+/=_-]+){2,}$/
const JwtZuiDuanChangDu = 40
const TuoMinZhanWei = '***'

function tuoMinZiFuChuan(yuanShi: string): string {
  let jieGuo = yuanShi
  for (const guanJianZi of peiZhi.minGanZiDuan.guanJianZi) {
    const zhengZe = new RegExp(`"${guanJianZi}"\\s*:\\s*"[^"]*"`, 'gi')
    jieGuo = jieGuo.replace(zhengZe, `"${guanJianZi}":"${TuoMinZhanWei}"`)
  }
  if (JwtZhengZe.test(jieGuo) && jieGuo.length > JwtZuiDuanChangDu) {
    return TuoMinZhanWei
  }
  const zuiDaZiFu = riZhiTuiSongPeiZhi.danTiaoZuiDaZiFu
  if (jieGuo.length > zuiDaZiFu) {
    return `${jieGuo.slice(0, zuiDaZiFu)}…`
  }
  return jieGuo
}

function shiMinGanJianMing(jianMing: string): boolean {
  const xiaoXie = jianMing.toLowerCase()
  return peiZhi.minGanZiDuan.ziDuanMing.some((ziDuan) => ziDuan.toLowerCase() === xiaoXie)
}

function tuoMinZhi(zhi: unknown, shengYuCengJi: number): unknown {
  if (typeof zhi === 'string') return tuoMinZiFuChuan(zhi)
  if (zhi === null || typeof zhi !== 'object') return zhi
  if (shengYuCengJi <= 0) return TuoMinZhanWei

  const zuiDaJianShu = riZhiTuiSongPeiZhi.xiangQingZuiDaJianShu
  if (Array.isArray(zhi)) {
    return zhi.slice(0, zuiDaJianShu).map((xiang) => tuoMinZhi(xiang, shengYuCengJi - 1))
  }

  const jieGuo: Record<string, unknown> = {}
  let yiChuLi = 0
  for (const [jian, zhiXiang] of Object.entries(zhi as Record<string, unknown>)) {
    if (yiChuLi >= zuiDaJianShu) break
    yiChuLi += 1
    jieGuo[jian] = shiMinGanJianMing(jian)
      ? TuoMinZhanWei
      : tuoMinZhi(zhiXiang, shengYuCengJi - 1)
  }
  return jieGuo
}

function tuoMinXiangQing(xiangQing: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!xiangQing) return undefined
  const tuoMinHou = tuoMinZhi(xiangQing, riZhiTuiSongPeiZhi.xiangQingZuiDaCengJi) as Record<string, unknown>
  let xuLieHua = ''
  try {
    xuLieHua = JSON.stringify(tuoMinHou) ?? ''
  } catch {
    return { yi_jie_duan: true }
  }
  if (xuLieHua.length > riZhiTuiSongPeiZhi.danTiaoZuiDaZiFu) {
    return { yi_jie_duan: true, yuan_shi_zi_fu_shu: xuLieHua.length }
  }
  return tuoMinHou
}

export function tuoMinRiZhiTiaoMu(tiaoMu: RiZhiTiaoMu): RiZhiTiaoMu {
  return {
    shi_jian: tiaoMu.shi_jian,
    ji_bie: tiaoMu.ji_bie,
    lei_xing: tuoMinZiFuChuan(tiaoMu.lei_xing),
    xiao_xi: tuoMinZiFuChuan(tiaoMu.xiao_xi),
    ...(tiaoMu.yong_hu_id ? { yong_hu_id: tiaoMu.yong_hu_id } : {}),
    ...(tiaoMu.jiao_se_id ? { jiao_se_id: tiaoMu.jiao_se_id } : {}),
    ...(tiaoMu.qing_qiu_id ? { qing_qiu_id: tiaoMu.qing_qiu_id } : {}),
    ...(tiaoMu.xiang_qing ? { xiang_qing: tuoMinXiangQing(tiaoMu.xiang_qing) } : {}),
  }
}

export function dingYueRiZhi(dingYueZhe: RiZhiDingYueZhe): () => void {
  dingYueZheJiHe.add(dingYueZhe)
  return () => {
    dingYueZheJiHe.delete(dingYueZhe)
  }
}

export function dingYueZheShuLiang(): number {
  return dingYueZheJiHe.size
}

export function qingKongDingYue(): void {
  dingYueZheJiHe.clear()
}

export function fenFaRiZhi(
  jiBie: RiZhiJiBie,
  leiXing: string,
  xiaoXi: string,
  shangXiaWen: Record<string, unknown>,
): void {
  if (dingYueZheJiHe.size === 0) return
  if (fenFaZhong) return
  fenFaZhong = true
  try {
    const tiaoMu = tuoMinRiZhiTiaoMu({
      shi_jian: new Date().toISOString(),
      ji_bie: jiBie,
      lei_xing: leiXing,
      xiao_xi: xiaoXi,
      yong_hu_id: shangXiaWen.yong_hu_id as string | undefined,
      jiao_se_id: shangXiaWen.jiao_se_id as string | undefined,
      qing_qiu_id: shangXiaWen.qing_qiu_id as string | undefined,
      xiang_qing: shangXiaWen.xiang_qing as Record<string, unknown> | undefined,
    })
    for (const dingYueZhe of dingYueZheJiHe) {
      try {
        dingYueZhe(tiaoMu)
      } catch {
        /* 单个订阅者异常不得影响日志主链路 */
      }
    }
  } finally {
    fenFaZhong = false
  }
}
