import { huoQuFanYi } from '../config/translations'
import { 是可识别性别, 解析性别, type 性别内部形态 } from './性别'

export interface YanZhengJieGuo {
  heFa: boolean
  xiaoXi?: string
}

const SHOU_JI_HAO_ZHENG_ZE = /^1[3-9]\d{9}$/
const YONG_HU_MING_TE_SHU_ZI_FU = /[!@#$%^&*()+=[\]{}|\\:;"'<>?/~`]/
const YONG_HU_MING_ZUI_XIAO = 1
const YONG_HU_MING_ZUI_DA = 30
const LIAO_TIAN_NEI_RONG_ZUI_DA = 500

export function yanZhengShouJiHao(zhi: unknown): YanZhengJieGuo {
  if (typeof zhi === 'string' && SHOU_JI_HAO_ZHENG_ZE.test(zhi)) {
    return { heFa: true }
  }
  return { heFa: false, xiaoXi: huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu') }
}

export function yanZhengYongHuMing(zhi: unknown): YanZhengJieGuo {
  if (typeof zhi !== 'string') {
    return { heFa: false, xiaoXi: huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu') }
  }
  const qingLi = zhi.trim()
  if (qingLi.length < YONG_HU_MING_ZUI_XIAO || qingLi.length > YONG_HU_MING_ZUI_DA) {
    return { heFa: false, xiaoXi: huoQuFanYi('renZheng', 'yongHuMingChangDuCuoWu') }
  }
  if (YONG_HU_MING_TE_SHU_ZI_FU.test(qingLi)) {
    return { heFa: false, xiaoXi: huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu') }
  }
  return { heFa: true }
}

/** 任意写法 → 内部规范形态。唯一实现是 utils/性别，本函数只是既有调用点的别名 */
export function guiYiXingBie(zhi: unknown): 性别内部形态 | null {
  return 解析性别(zhi)
}

export function yanZhengXingBie(zhi: unknown): YanZhengJieGuo {
  if (是可识别性别(zhi)) {
    return { heFa: true }
  }
  return { heFa: false, xiaoXi: huoQuFanYi('anQuan', 'shenFenBuHeFa') }
}

export function yanZhengLiaoTianNeiRong(zhi: unknown): YanZhengJieGuo {
  if (typeof zhi === 'string' && zhi.length > 0 && zhi.length <= LIAO_TIAN_NEI_RONG_ZUI_DA) {
    return { heFa: true }
  }
  if (typeof zhi === 'string' && zhi.length > LIAO_TIAN_NEI_RONG_ZUI_DA) {
    return { heFa: false, xiaoXi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang') }
  }
  return { heFa: false, xiaoXi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong') }
}

export function yanZhengMiMa(zhi: unknown): YanZhengJieGuo {
  if (typeof zhi === 'string' && zhi.length > 0) {
    return { heFa: true }
  }
  return { heFa: false, xiaoXi: huoQuFanYi('renZheng', 'miMaKong') }
}

const NIAN_LING_ZUI_XIAO = 0
const NIAN_LING_ZUI_DA = 100

export function guiYiNianLing(zhi: unknown): string {
  if (zhi === null || zhi === undefined) return ''
  const wenBen = String(zhi).trim()
  if (!wenBen) return ''
  const shu = Number(wenBen)
  if (!Number.isFinite(shu)) return ''
  return String(Math.max(NIAN_LING_ZUI_XIAO, Math.min(NIAN_LING_ZUI_DA, Math.round(shu))))
}
