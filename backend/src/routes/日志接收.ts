import { Router } from 'express'
import type { Request, Response } from 'express'
import { xieRuRiZhi } from '../utils/debug日志'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { huoQuFanYi } from '../config/translations'

type ShangBaoLeiXing = 'cuoWu' | 'xingNengZhiBiao'

interface ShangBaoTi {
  lei_xing?: unknown
  xiang_qing?: unknown
}

const SHANG_BAO_LEI_XING_JI_HE: ReadonlySet<ShangBaoLeiXing> = new Set([
  'cuoWu',
  'xingNengZhiBiao',
])

const ZUI_DA_XIANG_QING_ZI_DIAN_SHU = 50

function shiYouXiaoXiangQing(zhi: unknown): zhi is Record<string, unknown> {
  if (typeof zhi !== 'object' || zhi === null || Array.isArray(zhi)) {
    return false
  }
  const duiXiang = zhi as Record<string, unknown>
  const jianShu = Object.keys(duiXiang).length
  if (jianShu === 0 || jianShu > ZUI_DA_XIANG_QING_ZI_DIAN_SHU) {
    return false
  }
  return true
}

function shiYouXiaoTi(ti: ShangBaoTi): ti is { lei_xing: ShangBaoLeiXing; xiang_qing: Record<string, unknown> } {
  if (typeof ti.lei_xing !== 'string') return false
  if (!SHANG_BAO_LEI_XING_JI_HE.has(ti.lei_xing as ShangBaoLeiXing)) return false
  return shiYouXiaoXiangQing(ti.xiang_qing)
}

const luYou = Router()

luYou.post('/', (qingQiu: Request, xiangYing: Response) => {
  const ti = (qingQiu.body ?? {}) as ShangBaoTi

  if (!shiYouXiaoTi(ti)) {
    shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return
  }

  const jiBie = ti.lei_xing === 'cuoWu' ? 'error' : 'info'
  const leiXingBiaoQian = ti.lei_xing === 'cuoWu' ? '前端错误上报' : '前端性能指标'

  xieRuRiZhi(jiBie, leiXingBiaoQian, '前端上报', {
    xiang_qing: ti.xiang_qing,
  })

  chengGongXiangYing(xiangYing, { jie_shou: true })
})

export default luYou
