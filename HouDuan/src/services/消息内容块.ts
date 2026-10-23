import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import { LEI_BIE_DAO_XIAO_XI_LEI_XING } from '../config/媒体配置'
import { meiTiZhanShiWenBen, shiTuXiangLeiBie } from './AI视觉辅助'
import { yanZhengUUID } from '../utils/验证'
import { 清洗玩家文本 } from '../utils/控制字符'
import { debug日志 } from '../utils/debug日志'


export const XIAO_XI_KUAI_LEI_XING = { wenZi: 'wenzi', tuPian: 'tupian' } as const

export type XiaoXiKuaiLeiXing = (typeof XIAO_XI_KUAI_LEI_XING)[keyof typeof XIAO_XI_KUAI_LEI_XING]

export interface XiaoXiKuai {
  lei_xing: XiaoXiKuaiLeiXing
  nei_rong?: string
  mei_ti_id?: string
}

export type KuaiDiuQiYuanYin =
  | 'kuai_fei_dui_xiang'
  | 'lei_xing_wu_ren'
  | 'wen_zi_chao_chang'
  | 'mei_ti_id_bu_he_fa'
  | 'kuaishu_chao_xian'
  | 'tupianshu_chao_xian'
  | 'mei_ti_bu_cun_zai'
  | 'mei_ti_wu_quan_xian'
  | 'mei_ti_lei_bie_bu_fu'

export interface QingLiTiJiaoJieGuo {
  kuai: XiaoXiKuai[] | null
  diuQi: KuaiDiuQiYuanYin[]
  chaoXian: boolean
  daiPanDingMeiTiId: string[]
}

export function xiaoXiKuaiPeiZhi() {
  return {
    zuiDaKuaiShu: XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaKuaiShu,
    zuiDaTuPianShu: XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaTuPianShu,
    danKuaiZuiDaZiShu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
    ziShuZongShangXian: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
  }
}

function meiTiLeiBieDaoKuaiXiaoXiLeiXing(leiBie: string): string | null {
  return (LEI_BIE_DAO_XIAO_XI_LEI_XING as Record<string, string | undefined>)[leiBie] ?? null
}

function quKuaiShuZu(zhi: unknown, changDing: string): unknown[] | null {
  if (Array.isArray(zhi)) return zhi
  if (typeof zhi === 'string' && zhi.trim() !== '') {
    try {
      const jieXi = JSON.parse(zhi) as unknown
      if (Array.isArray(jieXi)) return jieXi
    } catch {
      debug日志.warn('消息内容块', '提交的内容块不是合法 JSON 数组，按未携带处理', {
        xiang_qing: { chang_ding: changDing, ti_jiao_lei_xing: 'string' },
      })
      return null
    }
    debug日志.warn('消息内容块', '提交的内容块 JSON 不是数组，按未携带处理', {
      xiang_qing: { chang_ding: changDing },
    })
  }
  return null
}

function isKuaiLeiXing(zhi: unknown): zhi is XiaoXiKuaiLeiXing {
  return zhi === XIAO_XI_KUAI_LEI_XING.wenZi || zhi === XIAO_XI_KUAI_LEI_XING.tuPian
}

export function qingLiTiJiaoKuai(zhi: unknown, changDing = '消息发送'): QingLiTiJiaoJieGuo {
  const peiZhi = xiaoXiKuaiPeiZhi()
  const diuQi: KuaiDiuQiYuanYin[] = []
  const kuai: XiaoXiKuai[] = []
  const daiPanDingMeiTiId: string[] = []

  const shuZu = quKuaiShuZu(zhi, changDing)
  if (shuZu === null) {
    return { kuai: null, diuQi, chaoXian: false, daiPanDingMeiTiId }
  }
  if (shuZu.length === 0) {
    return { kuai: null, diuQi, chaoXian: false, daiPanDingMeiTiId }
  }
  if (shuZu.length > peiZhi.zuiDaKuaiShu) {
    diuQi.push('kuaishu_chao_xian')
    return { kuai: [], diuQi, chaoXian: true, daiPanDingMeiTiId }
  }

  let ziShu = 0
  let tuPianShu = 0
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) {
      diuQi.push('kuai_fei_dui_xiang')
      continue
    }
    const xiang = yuan as Record<string, unknown>
    if (!isKuaiLeiXing(xiang.lei_xing)) {
      diuQi.push('lei_xing_wu_ren')
      continue
    }
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : ''
      if (!meiTiId || !yanZhengUUID(meiTiId)) {
        diuQi.push('mei_ti_id_bu_he_fa')
        continue
      }
      if (tuPianShu >= peiZhi.zuiDaTuPianShu) {
        diuQi.push('tupianshu_chao_xian')
        continue
      }
      tuPianShu += 1
      if (!daiPanDingMeiTiId.includes(meiTiId)) daiPanDingMeiTiId.push(meiTiId)
      kuai.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: meiTiId })
      continue
    }
    const yuanWen = typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''
    const wenZi = 清洗玩家文本(yuanWen)
    if (wenZi === '') {
      continue
    }
    if (wenZi.length > peiZhi.danKuaiZuiDaZiShu || ziShu + wenZi.length > peiZhi.ziShuZongShangXian) {
      diuQi.push('wen_zi_chao_chang')
      return { kuai: [], diuQi, chaoXian: true, daiPanDingMeiTiId }
    }
    ziShu += wenZi.length
    kuai.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: wenZi })
  }

  return { kuai, diuQi, chaoXian: false, daiPanDingMeiTiId }
}

export function yingYongMeiTiPanDing(
  kuai: XiaoXiKuai[],
  meiTiXinXi: Map<string, { lei_bie: string; suo_shu: boolean }>,
): { baoLiu: XiaoXiKuai[]; diuQi: KuaiDiuQiYuanYin[] } {
  const baoLiu: XiaoXiKuai[] = []
  const diuQi: KuaiDiuQiYuanYin[] = []
  for (const xiang of kuai) {
    if (xiang.lei_xing !== XIAO_XI_KUAI_LEI_XING.tuPian) {
      baoLiu.push(xiang)
      continue
    }
    const xinXi = meiTiXinXi.get(xiang.mei_ti_id ?? '')
    if (!xinXi) {
      diuQi.push('mei_ti_bu_cun_zai')
      continue
    }
    if (!xinXi.suo_shu) {
      diuQi.push('mei_ti_wu_quan_xian')
      continue
    }
    if (!shiTuXiangLeiBie(xinXi.lei_bie)) {
      diuQi.push('mei_ti_lei_bie_bu_fu')
      continue
    }
    baoLiu.push(xiang)
  }
  return { baoLiu, diuQi }
}

export function shunXuKeDuWenBen(
  kuai: XiaoXiKuai[],
  xuanXiang?: { leiBieLeiXing?: (meiTiId: string | undefined) => string | undefined; yiCheHui?: boolean },
): string {
  let jieGuo = ''
  for (const xiang of kuai) {
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
      jieGuo += xiang.nei_rong ?? ''
      continue
    }
    const leiBie = xuanXiang?.leiBieLeiXing?.(xiang.mei_ti_id) ?? 'tupian'
    jieGuo +=
      meiTiZhanShiWenBen(leiBie, { yiCheHui: Boolean(xuanXiang?.yiCheHui) }) ??
      meiTiZhanShiWenBen('tupian', { yiCheHui: Boolean(xuanXiang?.yiCheHui) })
  }
  return jieGuo
}

export interface JianRongJianYing {
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
}

export function paiShengJianRong(
  kuai: XiaoXiKuai[],
  meiTiXinXi: Map<string, { lei_bie: string }> = new Map(),
): JianRongJianYing {
  const leiBieOf = (meiTiId: string | undefined) =>
    meiTiId ? meiTiXinXi.get(meiTiId)?.lei_bie : undefined
  const tuPianKuai = kuai.find((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)
  const youWenZi = kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
  const shouTuPianLeiBie = tuPianKuai ? leiBieOf(tuPianKuai.mei_ti_id) : undefined
  if (!youWenZi && shouTuPianLeiBie) {
    const leiXing = meiTiLeiBieDaoKuaiXiaoXiLeiXing(shouTuPianLeiBie)
    if (leiXing) {
      return { nei_rong: '', lei_xing: leiXing, mei_ti_id: tuPianKuai?.mei_ti_id ?? null }
    }
  }
  return {
    nei_rong: shunXuKeDuWenBen(kuai, { leiBieLeiXing: leiBieOf }),
    lei_xing: 'wenben',
    mei_ti_id: tuPianKuai?.mei_ti_id ?? null,
  }
}

export interface LiShiHangZiDuan {
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
}

export function leiXingDaoMeiTiLeiBie(leiXing: string): string | null {
  for (const [leiBie, xiaoXiLeiXing] of Object.entries(LEI_BIE_DAO_XIAO_XI_LEI_XING)) {
    if (xiaoXiLeiXing === leiXing) return leiBie
  }
  return null
}

export function fanGouKuai(xiang: LiShiHangZiDuan): XiaoXiKuai[] {
  const jieGuo: XiaoXiKuai[] = []
  const wuWenBenLeiBie = xiang.lei_xing === 'wenben' ? null : leiXingDaoMeiTiLeiBie(xiang.lei_xing)
  const shiTuPian = wuWenBenLeiBie !== null && shiTuXiangLeiBie(wuWenBenLeiBie)
  if (shiTuPian && xiang.mei_ti_id) {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: xiang.mei_ti_id })
  }
  if (xiang.nei_rong !== '') {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: xiang.nei_rong })
  }
  if (jieGuo.length === 0) {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: '' })
  }
  return jieGuo
}

export function qingLiLuoKuKuai(zhi: unknown, xiaoXiId: string): XiaoXiKuai[] | null {
  const shuZu = Array.isArray(zhi) ? zhi : null
  if (!shuZu) {
    if (zhi !== undefined && zhi !== null) {
      debug日志.warn('消息内容块', '库内内容块形状非数组，回退为按行反构', {
        xiang_qing: { xiao_xi_id: xiaoXiId },
      })
    }
    return null
  }
  const jieGuo: XiaoXiKuai[] = []
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    const xiang = yuan as Record<string, unknown>
    if (!isKuaiLeiXing(xiang.lei_xing)) continue
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id : ''
      if (!meiTiId || !yanZhengUUID(meiTiId)) continue
      jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: meiTiId })
      continue
    }
    const wenZi = typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: wenZi })
  }
  if (jieGuo.length === 0) {
    debug日志.warn('消息内容块', '库内内容块无一可解析，回退为按行反构', {
      xiang_qing: { xiao_xi_id: xiaoXiId, yuan_shi_kuai_shu: shuZu.length },
    })
    return null
  }
  return jieGuo
}

export function jiLuKuaiDiuQi(diuQi: KuaiDiuQiYuanYin[], changDing: string, yongHuId?: string): void {
  if (diuQi.length === 0) return
  const zhiFangTu: Record<string, number> = {}
  for (const yin of diuQi) zhiFangTu[yin] = (zhiFangTu[yin] ?? 0) + 1
  debug日志.warn('消息内容块', '内容块脏数据已丢弃', {
    xiang_qing: { chang_ding: changDing, yong_hu_id: yongHuId ?? '', diu_qi: zhiFangTu },
  })
}

export function kuaiShenHeWenBen(kuai: XiaoXiKuai[]): string {
  return kuai
    .filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
    .map((xiang) => xiang.nei_rong ?? '')
    .join('')
}

export function shiTuWenHunPaiKuai(kuai: XiaoXiKuai[] | null | undefined): boolean {
  if (!kuai || kuai.length < 2) return false
  const youWenZi = kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
  const youTuPian = kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)
  return youWenZi && youTuPian
}

export function diuQiDaoCuoWuJian(diuQi: KuaiDiuQiYuanYin[]): 'meiTiBuCunZai' | 'meiTiWuQuanXian' | 'xiaoXiNeiRongWeiKong' {
  if (diuQi.includes('mei_ti_wu_quan_xian')) return 'meiTiWuQuanXian'
  if (
    diuQi.includes('mei_ti_bu_cun_zai') ||
    diuQi.includes('mei_ti_lei_bie_bu_fu') ||
    diuQi.includes('mei_ti_id_bu_he_fa')
  ) {
    return 'meiTiBuCunZai'
  }
  return 'xiaoXiNeiRongWeiKong'
}
