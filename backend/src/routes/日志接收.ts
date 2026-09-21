import { Router } from 'express'
import type { Request, Response } from 'express'
import { xieRuRiZhi } from '../utils/debug日志'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { huoQuFanYi } from '../config/translations'

type ShangBaoLeiXing = 'cuoWu' | 'xingNengZhiBiao' | 'mai_dian'

interface ShangBaoTi {
  lei_xing?: unknown
  xiang_qing?: unknown
  shi_jian?: unknown
  can_shu?: unknown
  ban_ben?: unknown
  shi_jian_chuo?: unknown
}

const SHANG_BAO_LEI_XING_JI_HE: ReadonlySet<ShangBaoLeiXing> = new Set([
  'cuoWu',
  'xingNengZhiBiao',
  'mai_dian',
])

const ZUI_DA_XIANG_QING_ZI_DIAN_SHU = 50
// A8：字段值截断上限，防止伪造超长内容刷爆磁盘/污染日志
const ZUI_DA_ZHI_CHANG_DU = 500

// P1-8：埋点事件名长度上限
const ZUI_DA_SHI_JIAN_MING_CHANG_DU = 100

function jieDuanZhi(zhi: unknown, shenDu: number): unknown {
  if (typeof zhi === 'string') {
    return zhi.length > ZUI_DA_ZHI_CHANG_DU ? `${zhi.slice(0, ZUI_DA_ZHI_CHANG_DU)}…[截断]` : zhi
  }
  if (typeof zhi === 'number' || typeof zhi === 'boolean' || zhi === null || zhi === undefined) {
    return zhi
  }
  if (shenDu <= 0) {
    return '[已达深度上限]'
  }
  if (Array.isArray(zhi)) {
    return zhi.slice(0, 20).map((xiang) => jieDuanZhi(xiang, shenDu - 1))
  }
  if (typeof zhi === 'object') {
    const jieGuo: Record<string, unknown> = {}
    for (const [jian, zhi2] of Object.entries(zhi as Record<string, unknown>).slice(0, 20)) {
      jieGuo[jian.slice(0, 100)] = jieDuanZhi(zhi2, shenDu - 1)
    }
    return jieGuo
  }
  return String(zhi).slice(0, ZUI_DA_ZHI_CHANG_DU)
}

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

type MaiDianTi = {
  lei_xing: 'mai_dian'
  shi_jian: string
  can_shu?: Record<string, unknown>
  ban_ben?: string
  shi_jian_chuo?: number
}

function shiYouXiaoMaiDianTi(ti: ShangBaoTi): ti is MaiDianTi {
  if (
    typeof ti.shi_jian !== 'string' ||
    ti.shi_jian.length === 0 ||
    ti.shi_jian.length > ZUI_DA_SHI_JIAN_MING_CHANG_DU
  ) {
    return false
  }
  if (
    ti.can_shu !== undefined &&
    (typeof ti.can_shu !== 'object' || ti.can_shu === null || Array.isArray(ti.can_shu))
  ) {
    return false
  }
  if (ti.ban_ben !== undefined && typeof ti.ban_ben !== 'string') return false
  if (ti.shi_jian_chuo !== undefined && typeof ti.shi_jian_chuo !== 'number') return false
  return true
}

const luYou = Router()

luYou.post('/', (qingQiu: Request, xiangYing: Response) => {
  const ti = (qingQiu.body ?? {}) as ShangBaoTi

  if (ti.lei_xing === 'mai_dian') {
    if (!shiYouXiaoMaiDianTi(ti)) {
      shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
      return
    }
    const maiDianXiangQing: Record<string, unknown> = {
      shi_jian: ti.shi_jian,
      can_shu: jieDuanZhi(ti.can_shu ?? {}, 3),
      ban_ben: ti.ban_ben ?? '',
      shi_jian_chuo: ti.shi_jian_chuo ?? null,
    }
    xieRuRiZhi('info', '前端埋点', '前端上报', {
      xiang_qing: maiDianXiangQing,
    })
    chengGongXiangYing(xiangYing, { jie_shou: true })
    return
  }

  if (!shiYouXiaoTi(ti)) {
    shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return
  }

  const jiBie = ti.lei_xing === 'cuoWu' ? 'error' : 'info'
  const leiXingBiaoQian = ti.lei_xing === 'cuoWu' ? '前端错误上报' : '前端性能指标'

  xieRuRiZhi(jiBie, leiXingBiaoQian, '前端上报', {
    xiang_qing: jieDuanZhi(ti.xiang_qing, 3) as Record<string, unknown>,
  })

  chengGongXiangYing(xiangYing, { jie_shou: true })
})

export default luYou
