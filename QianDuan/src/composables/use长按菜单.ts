import { computed, getCurrentScope, onScopeDispose, ref, shallowRef, type Ref } from 'vue'
import {
  XIAO_XI_PEI_ZHI,
  LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI,
  CAI_DAN_LEI_XING_MO_REN,
  huoQuCaiDanLeiXing,
  huoQuYuanShiCaiDanXiang,
} from '@/config/消息配置'
import type { XiaoXiCaiDanLeiXing, XiaoXiCaiDanXiang } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/翻译表'
import { QIAN_TAI_DAI_MA, type QianTaiDaiMa } from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import { shiBenDiLinShiXiaoXi } from '@/utils/消息内容块'
import type { 消息 } from '@/types/类型定义'

export interface CaiDanXiaoXi {
  id: string
  nei_rong: string
  lei_xing: string
  shi_jian_chuo: number
  yi_che_hui?: boolean
  fa_song_zhe_lei_xing?: string
  ke_hu_duan_id?: string
}

export type CaiDanLeiXing = XiaoXiCaiDanLeiXing

export interface CaiDanJiDian {
  x: number
  y: number
}

interface Use长按菜单依赖<T> {
  dangQianShiJian: Ref<number>
  cheHuiXiaoXi: (xiaoXiId: string) => Promise<void>
  qieHuanYuYinZhuanWenZi?: (xiaoXi: T) => Promise<void>
  fuZhiWenBen?: (wenBen: string) => Promise<boolean>
  fanYiQingQiu?: (wenBen: string, yuanYu?: string, muBiaoYu?: string) => Promise<string>
  tianJiaDaoBiaoQing?: (xiaoXi: T) => Promise<void>
  baoCunMeiTi?: (xiaoXi: T) => Promise<void>
  sheZhiCuoWu?: (xinXi: string) => void
  zhiChiTuPianYinYong?: boolean
}

function shiHeCaiDanLeiXing(
  xiaoXi: CaiDanXiaoXi,
  leiXing: XiaoXiCaiDanLeiXing,
): boolean {
  return (
    huoQuCaiDanLeiXing(xiaoXi.lei_xing) === leiXing &&
    !xiaoXi.yi_che_hui &&
    xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
  )
}

function keYinYongXiaoXi(xiaoXi: CaiDanXiaoXi | null | undefined): boolean {
  return !!xiaoXi && !shiBenDiLinShiXiaoXi(xiaoXi)
}

function wenBenJian(xiaoXi: CaiDanXiaoXi): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

function fuZhiWenBenLuoBei(wenBen: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false
  const yuanHuoYue = document.activeElement as HTMLElement | null
  const wenBenYu = document.createElement('textarea')
  wenBenYu.value = wenBen
  wenBenYu.setAttribute('readonly', '')
  wenBenYu.setAttribute('aria-hidden', 'true')
  wenBenYu.tabIndex = -1
  wenBenYu.style.position = 'fixed'
  wenBenYu.style.opacity = '0'
  document.body.appendChild(wenBenYu)
  try {
    wenBenYu.select()
    return typeof document.execCommand === 'function' ? document.execCommand('copy') : false
  } catch {
    return false
  } finally {
    wenBenYu.remove()
    yuanHuoYue?.focus()
  }
}

export async function fuZhiWenBen(wenBen: string): Promise<boolean> {
  const daoHang = globalThis.navigator as Navigator & {
    clipboard?: { writeText: (wenBen: string) => Promise<void> }
  }
  if (daoHang?.clipboard?.writeText) {
    try {
      await daoHang.clipboard.writeText(wenBen)
      return true
    } catch {
      return fuZhiWenBenLuoBei(wenBen)
    }
  }
  return fuZhiWenBenLuoBei(wenBen)
}

export function huoQuYinYongZhaiYao(xiaoXi: CaiDanXiaoXi): string {
  if (xiaoXi.lei_xing === 'yuYin') return huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei')
  const neiRong = xiaoXi.nei_rong || ''
  const shangXian = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu
  if (neiRong.length <= shangXian) return neiRong
  return `${neiRong.slice(0, shangXian)}...`
}

export function keYiJieGuanXuanQu(cao: Node | null | undefined, xuanQu?: Selection | null): boolean {
  if (!cao || typeof document === 'undefined') return false
  const huoYue = document.activeElement
  if (huoYue && cao.contains(huoYue)) return true
  if (!xuanQu || xuanQu.rangeCount === 0) return false
  return cao.contains(xuanQu.anchorNode) && cao.contains(xuanQu.focusNode)
}

export function use长按菜单<T extends CaiDanXiaoXi = 消息>(yiLai: Use长按菜单依赖<T>) {
  const dangQianCaiDan = ref<CaiDanLeiXing | null>(null)
  const dangQianXiaoXi = shallowRef<T | null>(null)
  const dangQianJiDian = ref<CaiDanJiDian | null>(null)
  const yinYongXiaoXi = shallowRef<T | null>(null)
  const fanYiJieGuoJiLu = ref(new Map<string, string>())
  const fanYiZhongJiHe = ref(new Set<string>())
  const fanYiZhanKaiJiHe = ref(new Set<string>())
  const fanYiChuCuoJiHe = ref(new Set<string>())
  const fanYiCuoWuJiLu = ref(new Map<string, QianTaiCuoWu>())
  const fanYiQingQiuDaiCi = new Map<string, number>()
  const fanYiKongJiHe = ref(new Set<string>())
  const fanYiYuanYu = ref('auto')
  const fanYiMuBiaoYu = ref('zh')
  let changAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let changAnDengDai: { xiaoXi: T; leiXing: CaiDanLeiXing; dian: CaiDanJiDian } | null = null
  let chuMoTongDaoShiKe = 0
  let chuangKongJianKongZhong = false

  const dangQianCaiDanLeiXing = computed<CaiDanLeiXing | null>(() => dangQianCaiDan.value)
  const caiDanZhengDaKai = computed(() => dangQianCaiDan.value !== null)

  const dangQianCaiDanXiang = computed<readonly XiaoXiCaiDanXiang[]>(() => {
    const leiXing = dangQianCaiDan.value
    if (!leiXing) return []
    const xiaoXi = dangQianXiaoXi.value
    let xiang: XiaoXiCaiDanXiang[] = [...huoQuYuanShiCaiDanXiang(leiXing)]
    if (!xiaoXi) return xiang
    const keYinYong =
      keYinYongXiaoXi(xiaoXi) && (leiXing !== 'tuPian' || yiLai.zhiChiTuPianYinYong === true)
    if (!keYinYong) xiang = xiang.filter((zhi) => zhi !== 'yinYong')
    if (!keXianShiCheHui(xiaoXi)) xiang = xiang.filter((zhi) => zhi !== 'cheHui')
    return xiang
  })

  function quXiaoDian(shiJian: MouseEvent | TouchEvent): CaiDanJiDian {
    if ('touches' in shiJian) {
      const dian = shiJian.touches[0] ?? shiJian.changedTouches?.[0]
      return { x: dian ? dian.clientX : 0, y: dian ? dian.clientY : 0 }
    }
    const shuBiao = shiJian as MouseEvent
    return { x: shuBiao.clientX, y: shuBiao.clientY }
  }

  function lianJieChuangKouJianKong(): void {
    if (chuangKongJianKongZhong || typeof window === 'undefined') return
    chuangKongJianKongZhong = true
    window.addEventListener('resize', guanBiCaiDan)
  }

  function duanKaiChuangKouJianKong(): void {
    if (!chuangKongJianKongZhong || typeof window === 'undefined') return
    chuangKongJianKongZhong = false
    window.removeEventListener('resize', guanBiCaiDan)
  }

  function guanBiCaiDan(): void {
    dangQianCaiDan.value = null
    dangQianXiaoXi.value = null
    dangQianJiDian.value = null
    duanKaiChuangKouJianKong()
  }

  function daKaiCaiDanNeiBu(xiaoXi: T, leiXing: CaiDanLeiXing, dian: CaiDanJiDian): void {
    guanBiDingShiQi()
    dangQianXiaoXi.value = xiaoXi
    dangQianCaiDan.value = leiXing
    dangQianJiDian.value = dian
    lianJieChuangKouJianKong()
  }

  function youJianBeiPingBi(): boolean {
    return Date.now() - chuMoTongDaoShiKe < LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.youJianQuChongHaoMiao
  }

  function tongGuoLeiXingShenCha(xiaoXi: T, leiXing: CaiDanLeiXing): boolean {
    if (!shiHeCaiDanLeiXing(xiaoXi, leiXing)) return false
    if (leiXing !== CAI_DAN_LEI_XING_MO_REN) return true
    return (
      xiaoXi.fa_song_zhe_lei_xing === 'yonghu' &&
      Date.now() - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
    )
  }

  function daKaiYouJianCaiDanLeiXing(
    xiaoXi: T,
    leiXing: CaiDanLeiXing,
    shiJian: MouseEvent | TouchEvent,
  ): void {
    if (youJianBeiPingBi()) return
    if (!tongGuoLeiXingShenCha(xiaoXi, leiXing)) return
    daKaiCaiDanNeiBu(xiaoXi, leiXing, quXiaoDian(shiJian))
  }

  function guanBiDingShiQi(): void {
    if (changAnDingShiQi) {
      clearTimeout(changAnDingShiQi)
      changAnDingShiQi = null
    }
    changAnDengDai = null
  }

  function chuMoKaiShiLeiXing(xiaoXi: T, leiXing: CaiDanLeiXing, shiJian: TouchEvent): void {
    if (!tongGuoLeiXingShenCha(xiaoXi, leiXing)) return
    guanBiDingShiQi()
    const dian = quXiaoDian(shiJian)
    changAnDengDai = { xiaoXi, leiXing, dian }
    changAnDingShiQi = setTimeout(() => {
      changAnDingShiQi = null
      const dengDai = changAnDengDai
      changAnDengDai = null
      if (!dengDai) return
      chuMoTongDaoShiKe = Date.now()
      daKaiCaiDanNeiBu(dengDai.xiaoXi, dengDai.leiXing, dengDai.dian)
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoYiDongQuXiao(shiJian: TouchEvent): void {
    if (!changAnDingShiQi || !changAnDengDai) return
    const dian = quXiaoDian(shiJian)
    const pianYi = Math.hypot(dian.x - changAnDengDai.dian.x, dian.y - changAnDengDai.dian.y)
    if (pianYi > LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.chuMoPianYiXianZhi) guanBiDingShiQi()
  }

  function daKaiCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent): void {
    daKaiYouJianCaiDanLeiXing(xiaoXi, huoQuCaiDanLeiXing(xiaoXi.lei_xing), shiJian)
  }

  function chuMoKaiShi(xiaoXi: T, shiJian: TouchEvent): void {
    chuMoKaiShiLeiXing(xiaoXi, huoQuCaiDanLeiXing(xiaoXi.lei_xing), shiJian)
  }

  function chuMoJieShu(): void {
    guanBiDingShiQi()
  }

  function sheZhiYinYongMuBiao(muBiao: T): boolean {
    if (!keYinYongXiaoXi(muBiao)) return false
    yinYongXiaoXi.value = { ...muBiao }
    return true
  }

  function keXianShiCheHui(xiaoXi: T): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  const caiDanXiangChuli: Record<XiaoXiCaiDanXiang, (muBiao: T) => Promise<unknown> | void> = {
    cheHui: (muBiao) => yiLai.cheHuiXiaoXi(muBiao.id),
    yinYong: (muBiao) => {
      sheZhiYinYongMuBiao(muBiao)
    },
    fuZhi: async (muBiao) => {
      const fuZhiHanShu = yiLai.fuZhiWenBen ?? fuZhiWenBen
      const chengGong = await fuZhiHanShu(muBiao.nei_rong || '')
      if (!chengGong) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
      }
    },
    fanYi: (muBiao) => qingQiuWenBenFanYi(muBiao),
    yuYinZhuanWenZi: (muBiao) => yiLai.qieHuanYuYinZhuanWenZi?.(muBiao),
    baoCunTuPian: (muBiao) => yiLai.baoCunMeiTi?.(muBiao),
    tianJiaDaoBiaoQing: (muBiao) => yiLai.tianJiaDaoBiaoQing?.(muBiao),
  }

  async function zhiXingCaiDanXiang(xiang: XiaoXiCaiDanXiang): Promise<void> {
    const muBiao = dangQianXiaoXi.value
    const keXuanXiang = dangQianCaiDanXiang.value
    guanBiCaiDan()
    if (!muBiao) return
    if (!keXuanXiang.includes(xiang)) return
    await caiDanXiangChuli[xiang](muBiao)
  }

  function huoQuFanYiJieGuo(xiaoXi: T): string | undefined {
    return fanYiJieGuoJiLu.value.get(wenBenJian(xiaoXi))
  }

  function shiFanYiZhong(xiaoXi: T): boolean {
    return fanYiZhongJiHe.value.has(wenBenJian(xiaoXi))
  }

  function shiFanYiZhanKai(xiaoXi: T): boolean {
    return fanYiZhanKaiJiHe.value.has(wenBenJian(xiaoXi))
  }

  function shiFanYiChuCuo(xiaoXi: T): boolean {
    return fanYiChuCuoJiHe.value.has(wenBenJian(xiaoXi))
  }

  function huoQuFanYiCuoWu(xiaoXi: T): QianTaiCuoWu | null {
    return fanYiCuoWuJiLu.value.get(wenBenJian(xiaoXi)) || null
  }

  function sheZhiFanYiWenTiCuoWu(jian: string, cuoWu: QianTaiCuoWu): void {
    fanYiCuoWuJiLu.value.set(jian, cuoWu)
    fanYiChuCuoJiHe.value.add(jian)
    fanYiKongJiHe.value.delete(jian)
    yiLai.sheZhiCuoWu?.(cuoWu.yingXiang)
  }

  function shiFanYiKong(xiaoXi: T): boolean {
    return fanYiKongJiHe.value.has(wenBenJian(xiaoXi))
  }

  async function qiangZhiFanYi(xiaoXi: T): Promise<string | null> {
    const jian = wenBenJian(xiaoXi)
    fanYiJieGuoJiLu.value.delete(jian)
    fanYiZhanKaiJiHe.value.delete(jian)
    fanYiChuCuoJiHe.value.delete(jian)
    fanYiCuoWuJiLu.value.delete(jian)
    fanYiKongJiHe.value.delete(jian)
    return qingQiuWenBenFanYi(xiaoXi)
  }

  function chuangJianFanYiCuoWu(daiMa: QianTaiDaiMa, keChongShi: boolean): QianTaiCuoWu {
    return chuangJianQianTaiCuoWu({
      code: daiMa,
      retryable: keChongShi,
      yingXiang: huoQuFanYi('liaoTian', 'fanYiShiBai'),
    })
  }

  async function qingQiuWenBenFanYi(xiaoXi: T): Promise<string | null> {
    const jian = wenBenJian(xiaoXi)
    if (fanYiZhanKaiJiHe.value.has(jian)) {
      fanYiZhanKaiJiHe.value.delete(jian)
      return fanYiJieGuoJiLu.value.get(jian) ?? null
    }
    const yiCun = fanYiJieGuoJiLu.value.get(jian)
    if (yiCun) {
      fanYiChuCuoJiHe.value.delete(jian)
      fanYiCuoWuJiLu.value.delete(jian)
      fanYiKongJiHe.value.delete(jian)
      fanYiZhanKaiJiHe.value.add(jian)
      return yiCun
    }
    if (fanYiZhongJiHe.value.has(jian)) return null
    const benCi = (fanYiQingQiuDaiCi.get(jian) || 0) + 1
    fanYiQingQiuDaiCi.set(jian, benCi)
    const yuanWen = typeof xiaoXi.nei_rong === 'string' ? xiaoXi.nei_rong.trim() : ''
    if (!yuanWen) {
      sheZhiFanYiWenTiCuoWu(jian, chuangJianFanYiCuoWu(QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID, false))
      return null
    }
    fanYiChuCuoJiHe.value.delete(jian)
    fanYiCuoWuJiLu.value.delete(jian)
    fanYiKongJiHe.value.delete(jian)
    fanYiZhongJiHe.value.add(jian)
    try {
      if (!yiLai.fanYiQingQiu) {
        sheZhiFanYiWenTiCuoWu(jian, chuangJianFanYiCuoWu(QIAN_TAI_DAI_MA.WEI_ZHI, false))
        return null
      }
      const jieGuo = await yiLai.fanYiQingQiu(yuanWen, fanYiYuanYu.value, fanYiMuBiaoYu.value)
      if (benCi !== fanYiQingQiuDaiCi.get(jian)) return null
      const qingLi = (jieGuo || '').trim()
      if (!qingLi) {
        fanYiKongJiHe.value.add(jian)
        fanYiChuCuoJiHe.value.delete(jian)
        fanYiCuoWuJiLu.value.delete(jian)
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
        return null
      }
      fanYiJieGuoJiLu.value.set(jian, qingLi)
      fanYiChuCuoJiHe.value.delete(jian)
      fanYiCuoWuJiLu.value.delete(jian)
      fanYiKongJiHe.value.delete(jian)
      fanYiZhanKaiJiHe.value.add(jian)
      return qingLi
    } catch (错误: unknown) {
      if (benCi !== fanYiQingQiuDaiCi.get(jian)) return null
      const zhengChangHua = 归一前台错误(错误)
      if (zhengChangHua.xianShi) {
        sheZhiFanYiWenTiCuoWu(jian, chuangJianFanYiCuoWu(zhengChangHua.code, zhengChangHua.retryable))
      }
      return null
    } finally {
      if (benCi === fanYiQingQiuDaiCi.get(jian)) {
        fanYiZhongJiHe.value.delete(jian)
        fanYiQingQiuDaiCi.delete(jian)
      }
    }
  }

  function sheZhiYinYong(xiaoXi: T): void {
    sheZhiYinYongMuBiao(xiaoXi)
    guanBiCaiDan()
  }

  function quXiaoYinYong(): void {
    yinYongXiaoXi.value = null
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      guanBiDingShiQi()
      guanBiCaiDan()
    })
  }

  return {
    dangQianCaiDanLeiXing,
    dangQianCaiDanXiang,
    dangQianXiaoXi,
    dangQianJiDian,
    caiDanZhengDaKai,
    guanBiCaiDan,
    chuMoYiDongQuXiao,
    daKaiCaiDan,
    chuMoKaiShi,
    chuMoJieShu,
    zhiXingCaiDanXiang,
    huoQuFanYiJieGuo,
    huoQuFanYiCuoWu,
    shiFanYiZhong,
    shiFanYiZhanKai,
    shiFanYiChuCuo,
    shiFanYiKong,
    qingQiuWenBenFanYi,
    qiangZhiFanYi,
    fanYiYuanYu,
    fanYiMuBiaoYu,
    yinYongXiaoXi,
    sheZhiYinYong,
    quXiaoYinYong,
    huoQuYinYongZhaiYao,
  }
}
