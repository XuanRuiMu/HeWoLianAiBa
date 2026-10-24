import { ref, shallowRef, type Ref } from 'vue'
import { XIAO_XI_PEI_ZHI, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'
import type { TuPianCaiDanXiang, WenBenCaiDanXiang, YuYinCaiDanXiang } from '@/config/消息配置'
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

function shiYuYinXiaoXi(xiaoXi: CaiDanXiaoXi): boolean {
  return xiaoXi.lei_xing === 'yuYin' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
}

function shiWenBenXiaoXi(xiaoXi: CaiDanXiaoXi): boolean {
  return xiaoXi.lei_xing === 'wenben' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
}

function shiTuPianXiaoXi(xiaoXi: CaiDanXiaoXi): boolean {
  return (
    xiaoXi.lei_xing === 'tuPian' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
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
  const cheHuiCaiDanZhanKai = ref(false)
  const cheHuiCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongXiaoXi = shallowRef<T | null>(null)
  const yuYinCaiDanZhanKai = ref(false)
  const yuYinCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongYuYin = shallowRef<T | null>(null)
  const yinYongXiaoXi = shallowRef<T | null>(null)
  const wenBenCaiDanZhanKai = ref(false)
  const wenBenCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongWenBen = shallowRef<T | null>(null)
  const tuPianCaiDanZhanKai = ref(false)
  const tuPianCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongTuPian = shallowRef<T | null>(null)
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
  let yuYinChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let wenBenChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let tuPianChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null

  function quXiaoDian(shiJian: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in shiJian) {
      const dian = shiJian.touches[0] ?? shiJian.changedTouches?.[0]
      return { x: dian ? dian.clientX : 0, y: dian ? dian.clientY : 0 }
    }
    const shuBiao = shiJian as MouseEvent
    return { x: shuBiao.clientX, y: shuBiao.clientY }
  }

  function dingWeiCaiDian(x: number, y: number): { top: string; left: string } {
    if (typeof window === 'undefined') return { top: `${y}px`, left: `${x}px` }
    const kuan = window.innerWidth
    const gao = window.innerHeight
    const zuo = Math.max(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu, Math.min(x, kuan - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanYuGuKuan - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu))
    let ding = y - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanYuGuGao
    if (ding < LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu) ding = y + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanXiaFangPianYi
    ding = Math.max(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu, Math.min(ding, gao - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanYuGuGao - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu))
    return { top: `${ding}px`, left: `${zuo}px` }
  }

  function daKaiCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent) {
    if (shiYuYinXiaoXi(xiaoXi)) return
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
    if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
    const dian = quXiaoDian(shiJian)
    xuanZhongXiaoXi.value = xiaoXi
    cheHuiCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
    cheHuiCaiDanZhanKai.value = true
  }

  function chuMoKaiShi(xiaoXi: T, shiJian: TouchEvent) {
    if (shiYuYinXiaoXi(xiaoXi)) return
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
    if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
    const dian = quXiaoDian(shiJian)
    changAnDingShiQi = setTimeout(() => {
      xuanZhongXiaoXi.value = xiaoXi
      cheHuiCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
      cheHuiCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShu() {
    if (changAnDingShiQi) {
      clearTimeout(changAnDingShiQi)
      changAnDingShiQi = null
    }
  }

  function daKaiYuYinCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent) {
    if (!shiYuYinXiaoXi(xiaoXi)) return
    const dian = quXiaoDian(shiJian)
    xuanZhongYuYin.value = xiaoXi
    yuYinCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
    yuYinCaiDanZhanKai.value = true
  }

  function chuMoKaiShiYuYin(xiaoXi: T, shiJian: TouchEvent) {
    if (!shiYuYinXiaoXi(xiaoXi)) return
    const dian = quXiaoDian(shiJian)
    yuYinChangAnDingShiQi = setTimeout(() => {
      xuanZhongYuYin.value = xiaoXi
      yuYinCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
      yuYinCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShuYuYin() {
    if (yuYinChangAnDingShiQi) {
      clearTimeout(yuYinChangAnDingShiQi)
      yuYinChangAnDingShiQi = null
    }
  }

  function guanBiYuYinCaiDan() {
    yuYinCaiDanZhanKai.value = false
    xuanZhongYuYin.value = null
  }

  function huoQuYuYinCaiDanXiang(xiaoXi?: T): YuYinCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongYuYin.value
    const quanBu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang]
    if (!muBiao) return quanBu
    const kejian = keYinYongXiaoXi(muBiao) ? quanBu : quanBu.filter((xiang) => xiang !== 'yinYong')
    if (keXianShiCheHui(muBiao)) return kejian
    return kejian.filter((xiang) => xiang !== 'cheHui')
  }

  function sheZhiYinYongMuBiao(muBiao: T): boolean {
    if (!keYinYongXiaoXi(muBiao)) return false
    yinYongXiaoXi.value = { ...muBiao }
    return true
  }

  async function zhiXingYuYinCaiDanXiang(xiang: YuYinCaiDanXiang) {
    const muBiao = xuanZhongYuYin.value
    guanBiYuYinCaiDan()
    if (!muBiao) return
    if (xiang === 'yinYong') {
      sheZhiYinYongMuBiao(muBiao)
      return
    }
    if (xiang === 'cheHui') {
      await yiLai.cheHuiXiaoXi(muBiao.id)
      return
    }
    await yiLai.qieHuanYuYinZhuanWenZi?.(muBiao)
  }

  function daKaiWenBenCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent) {
    if (!shiWenBenXiaoXi(xiaoXi)) return
    const dian = quXiaoDian(shiJian)
    xuanZhongWenBen.value = xiaoXi
    wenBenCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
    wenBenCaiDanZhanKai.value = true
  }

  function chuMoKaiShiWenBen(xiaoXi: T, shiJian: TouchEvent) {
    if (!shiWenBenXiaoXi(xiaoXi)) return
    const dian = quXiaoDian(shiJian)
    wenBenChangAnDingShiQi = setTimeout(() => {
      xuanZhongWenBen.value = xiaoXi
      wenBenCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
      wenBenCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShuWenBen() {
    if (wenBenChangAnDingShiQi) {
      clearTimeout(wenBenChangAnDingShiQi)
      wenBenChangAnDingShiQi = null
    }
  }

  function guanBiWenBenCaiDan() {
    wenBenCaiDanZhanKai.value = false
    xuanZhongWenBen.value = null
  }

  function keXianShiCheHui(xiaoXi: T): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  function huoQuWenBenCaiDanXiang(xiaoXi?: T): WenBenCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongWenBen.value
    const quanBu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang]
    if (!muBiao) return quanBu
    const kejian = keYinYongXiaoXi(muBiao) ? quanBu : quanBu.filter((xiang) => xiang !== 'yinYong')
    if (keXianShiCheHui(muBiao)) return kejian
    return kejian.filter((xiang) => xiang !== 'cheHui')
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

  async function zhiXingWenBenCaiDanXiang(xiang: WenBenCaiDanXiang) {
    const muBiao = xuanZhongWenBen.value
    guanBiWenBenCaiDan()
    if (!muBiao) return
    if (xiang === 'yinYong') {
      sheZhiYinYongMuBiao(muBiao)
      return
    }
    if (xiang === 'cheHui') {
      await yiLai.cheHuiXiaoXi(muBiao.id)
      return
    }
    if (xiang === 'fuZhi') {
      const fuZhiHanShu = yiLai.fuZhiWenBen ?? fuZhiWenBen
      const chengGong = await fuZhiHanShu(muBiao.nei_rong || '')
      if (!chengGong) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
      }
      return
    }
    await qingQiuWenBenFanYi(muBiao)
  }

  function daKaiTuPianCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent) {
    if (!shiTuPianXiaoXi(xiaoXi)) return
    const dian = quXiaoDian(shiJian)
    xuanZhongTuPian.value = xiaoXi
    tuPianCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
    tuPianCaiDanZhanKai.value = true
  }

  function chuMoKaiShiTuPian(xiaoXi: T, shiJian: TouchEvent) {
    if (!shiTuPianXiaoXi(xiaoXi)) return
    const dian = quXiaoDian(shiJian)
    tuPianChangAnDingShiQi = setTimeout(() => {
      xuanZhongTuPian.value = xiaoXi
      tuPianCaiDanYangShi.value = dingWeiCaiDian(dian.x, dian.y)
      tuPianCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShuTuPian() {
    if (tuPianChangAnDingShiQi) {
      clearTimeout(tuPianChangAnDingShiQi)
      tuPianChangAnDingShiQi = null
    }
  }

  function guanBiTuPianCaiDan() {
    tuPianCaiDanZhanKai.value = false
    xuanZhongTuPian.value = null
  }

  function huoQuTuPianCaiDanXiang(xiaoXi?: T): TuPianCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongTuPian.value
    const quanBu = (
      yiLai.zhiChiTuPianYinYong
        ? [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang]
        : LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang.filter(
            (xiang) => xiang !== 'yinYong',
          )
    ) as TuPianCaiDanXiang[]
    const kejian = muBiao && !keYinYongXiaoXi(muBiao) ? quanBu.filter((xiang) => xiang !== 'yinYong') : quanBu
    if (muBiao && !keXianShiCheHui(muBiao)) {
      return kejian.filter((xiang) => xiang !== 'cheHui')
    }
    return kejian
  }

  async function zhiXingTuPianCaiDanXiang(xiang: TuPianCaiDanXiang) {
    const muBiao = xuanZhongTuPian.value
    guanBiTuPianCaiDan()
    if (!muBiao) return
    if (xiang === 'cheHui') {
      await yiLai.cheHuiXiaoXi(muBiao.id)
      return
    }
    if (xiang === 'yinYong') {
      sheZhiYinYongMuBiao(muBiao)
      return
    }
    if (xiang === 'baoCunTuPian') {
      await yiLai.baoCunMeiTi?.(muBiao)
      return
    }
    await yiLai.tianJiaDaoBiaoQing?.(muBiao)
  }

  function sheZhiYinYong(xiaoXi: T) {
    sheZhiYinYongMuBiao(xiaoXi)
    guanBiYuYinCaiDan()
    guanBiWenBenCaiDan()
  }

  function quXiaoYinYong() {
    yinYongXiaoXi.value = null
  }

  async function zhiXingCheHui() {
    cheHuiCaiDanZhanKai.value = false
    if (!xuanZhongXiaoXi.value) return
    await yiLai.cheHuiXiaoXi(xuanZhongXiaoXi.value.id)
    xuanZhongXiaoXi.value = null
  }

  function xianShiCheHuiAnNiu(xiaoXi: T): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  async function zhiXingCheHuiXiaoXi(xiaoXi: T) {
    await yiLai.cheHuiXiaoXi(xiaoXi.id)
  }

  return {
    cheHuiCaiDanZhanKai,
    cheHuiCaiDanYangShi,
    daKaiCaiDan,
    chuMoKaiShi,
    chuMoJieShu,
    zhiXingCheHui,
    xianShiCheHuiAnNiu,
    zhiXingCheHuiXiaoXi,
    yuYinCaiDanZhanKai,
    yuYinCaiDanYangShi,
    daKaiYuYinCaiDan,
    chuMoKaiShiYuYin,
    chuMoJieShuYuYin,
    guanBiYuYinCaiDan,
    huoQuYuYinCaiDanXiang,
    zhiXingYuYinCaiDanXiang,
    wenBenCaiDanZhanKai,
    wenBenCaiDanYangShi,
    daKaiWenBenCaiDan,
    chuMoKaiShiWenBen,
    chuMoJieShuWenBen,
    guanBiWenBenCaiDan,
    huoQuWenBenCaiDanXiang,
    zhiXingWenBenCaiDanXiang,
    tuPianCaiDanZhanKai,
    tuPianCaiDanYangShi,
    daKaiTuPianCaiDan,
    chuMoKaiShiTuPian,
    chuMoJieShuTuPian,
    guanBiTuPianCaiDan,
    huoQuTuPianCaiDanXiang,
    zhiXingTuPianCaiDanXiang,
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
