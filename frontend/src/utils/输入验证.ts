import { huoQuFanYi } from '../config/translations'

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

export function yanZhengXingBie(zhi: unknown): YanZhengJieGuo {
  if (typeof zhi === 'string' && (zhi === '男' || zhi === '女' || zhi === 'nan' || zhi === 'nv')) {
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
