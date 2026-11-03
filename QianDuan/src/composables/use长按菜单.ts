import { computed, getCurrentScope, nextTick, onScopeDispose, ref, shallowRef, type Ref } from 'vue'
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

export type CaiDanLeiXing = 'cheHui' | 'yuYin' | 'wenBen' | 'tuPian'

export interface CaiDanDingWeiZhuangTai {
  dingGao: boolean
  weiZhi: 'xia' | 'shang'
  top: string
  left: string
  weiBaX: string
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

function xinDingWeiZhuangTai(): CaiDanDingWeiZhuangTai {
  return { dingGao: false, weiZhi: 'xia', top: '0px', left: '0px', weiBaX: '50%' }
}

export function use长按菜单<T extends CaiDanXiaoXi = 消息>(yiLai: Use长按菜单依赖<T>) {
  const dangQianCaiDan = ref<CaiDanLeiXing | null>(null)
  const dangQianXiaoXi = shallowRef<T | null>(null)
  const caiDanDingWei = ref<CaiDanDingWeiZhuangTai>(xinDingWeiZhuangTai())
  const caiDanYuanSu = ref<HTMLElement | null>(null)
  const caiDanBenRen = computed<boolean | null>(() =>
    dangQianXiaoXi.value ? dangQianXiaoXi.value.fa_song_zhe_lei_xing === 'yonghu' : null,
  )
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
  let changAnDengDai: { xiaoXi: T; leiXing: CaiDanLeiXing; dian: { x: number; y: number } } | null = null
  let dangQianJiaoDian: { x: number; y: number } | null = null
  let chuMoTongDaoShiKe = 0
  let dingGaoZhen = 0
  let dengDaiDingGao = false
  let chuangKongJianKongZhong = false

  const cheHuiCaiDanZhanKai = computed({
    get: () => dangQianCaiDan.value === 'cheHui',
    set: (kai: boolean) => {
      if (!kai) guanBiCaiDan()
    },
  })
  const yuYinCaiDanZhanKai = computed({
    get: () => dangQianCaiDan.value === 'yuYin',
    set: (kai: boolean) => {
      if (!kai) guanBiCaiDan()
    },
  })
  const wenBenCaiDanZhanKai = computed({
    get: () => dangQianCaiDan.value === 'wenBen',
    set: (kai: boolean) => {
      if (!kai) guanBiCaiDan()
    },
  })
  const tuPianCaiDanZhanKai = computed({
    get: () => dangQianCaiDan.value === 'tuPian',
    set: (kai: boolean) => {
      if (!kai) guanBiCaiDan()
    },
  })

  function quXiaoDian(shiJian: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in shiJian) {
      const dian = shiJian.touches[0] ?? shiJian.changedTouches?.[0]
      return { x: dian ? dian.clientX : 0, y: dian ? dian.clientY : 0 }
    }
    const shuBiao = shiJian as MouseEvent
    return { x: shuBiao.clientX, y: shuBiao.clientY }
  }

  function quXiaoDingGaoZhen(): void {
    if (dingGaoZhen) {
      cancelAnimationFrame(dingGaoZhen)
      dingGaoZhen = 0
    }
    dengDaiDingGao = false
  }

  function dingGaoCaiDanWeiZhi(): void {
    const yuanSu = caiDanYuanSu.value
    const dian = dangQianJiaoDian
    if (!yuanSu || !dian || typeof window === 'undefined') {
      caiDanDingWei.value = { ...caiDanDingWei.value, dingGao: true }
      return
    }
    const he = yuanSu.getBoundingClientRect()
    const kuan = window.innerWidth
    const gao = window.innerHeight
    const caiDanKuan = he.width
    const caiDanGao = he.height
    const bianJu = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu
    const jianGe = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe
    const neiSuo = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo
    const fangXia = dian.y + jianGe + caiDanGao <= gao - bianJu
    const fangShang = dian.y - jianGe - caiDanGao >= bianJu
    const weiZhi: 'xia' | 'shang' = fangXia || !fangShang ? 'xia' : 'shang'
    let ding = weiZhi === 'xia' ? dian.y + jianGe : dian.y - jianGe - caiDanGao
    ding = Math.max(bianJu, Math.min(ding, gao - caiDanGao - bianJu))
    let zuo = dian.x - neiSuo
    zuo = Math.max(bianJu, Math.min(zuo, kuan - caiDanKuan - bianJu))
    const weiBaX = Math.max(neiSuo, Math.min(dian.x - zuo, caiDanKuan - neiSuo))
    caiDanDingWei.value = {
      dingGao: true,
      weiZhi,
      top: `${ding}px`,
      left: `${zuo}px`,
      weiBaX: `${weiBaX}px`,
    }
  }

  function anPaiDingGao(): void {
    quXiaoDingGaoZhen()
    dengDaiDingGao = true
    void nextTick(() => {
      if (!dengDaiDingGao) return
      dingGaoZhen = requestAnimationFrame(() => {
        dingGaoZhen = 0
        if (!dengDaiDingGao) return
        dengDaiDingGao = false
        dingGaoCaiDanWeiZhi()
      })
    })
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
    dangQianJiaoDian = null
    quXiaoDingGaoZhen()
    duanKaiChuangKouJianKong()
  }

  function daKaiCaiDanNeiBu(xiaoXi: T, leiXing: CaiDanLeiXing, dian: { x: number; y: number }): void {
    guanBiDingShiQi()
    dangQianXiaoXi.value = xiaoXi
    dangQianCaiDan.value = leiXing
    dangQianJiaoDian = dian
    const bianJu = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu
    const neiSuo = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo
    const jianGe = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe
    const cuShiZuo =
      typeof window === 'undefined'
        ? dian.x
        : Math.max(bianJu, Math.min(dian.x - neiSuo, window.innerWidth - bianJu))
    caiDanDingWei.value = {
      dingGao: false,
      weiZhi: 'xia',
      top: `${dian.y + jianGe}px`,
      left: `${cuShiZuo}px`,
      weiBaX: `${neiSuo}px`,
    }
    lianJieChuangKouJianKong()
    anPaiDingGao()
  }

  function youJianBeiPingBi(): boolean {
    return Date.now() - chuMoTongDaoShiKe < LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.youJianQuChongHaoMiao
  }

  function tongGuoLeiXingShenCha(xiaoXi: T, leiXing: CaiDanLeiXing): boolean {
    if (leiXing === 'yuYin') return shiYuYinXiaoXi(xiaoXi)
    if (leiXing === 'wenBen') return shiWenBenXiaoXi(xiaoXi)
    if (leiXing === 'tuPian') return shiTuPianXiaoXi(xiaoXi)
    return (
      !shiYuYinXiaoXi(xiaoXi) &&
      xiaoXi.fa_song_zhe_lei_xing === 'yonghu' &&
      !xiaoXi.yi_che_hui &&
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

  function daKaiCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent) {
    daKaiYouJianCaiDanLeiXing(xiaoXi, 'cheHui', shiJian)
  }

  function chuMoKaiShi(xiaoXi: T, shiJian: TouchEvent) {
    chuMoKaiShiLeiXing(xiaoXi, 'cheHui', shiJian)
  }

  function chuMoJieShu() {
    guanBiDingShiQi()
  }

  function daKaiYuYinCaiDan(xiaoXi: T, shiJian: MouseEvent | TouchEvent) {
    daKaiYouJianCaiDanLeiXing(xiaoXi, 'yuYin', shiJian)
  }

  function chuMoKaiShiYuYin(xiaoXi: T, shiJian: TouchEvent) {
    chuMoKaiShiLeiXing(xiaoXi, 'yuYin', shiJian)
  }

  function chuMoJieShuYuYin() {
    guanBiDingShiQi()
  }

  function guanBiYuYinCaiDan() {
    guanBiCaiDan()
  }

  function huoQuYuYinCaiDanXiang(xiaoXi?: T): YuYinCaiDanXiang[] {
    const muBiao = xiaoXi ?? (dangQianCaiDan.value === 'yuYin' ? dangQianXiaoXi.value : null)
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
    const muBiao = dangQianCaiDan.value === 'yuYin' ? dangQianXiaoXi.value : null
    guanBiCaiDan()
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
    daKaiYouJianCaiDanLeiXing(xiaoXi, 'wenBen', shiJian)
  }

  function chuMoKaiShiWenBen(xiaoXi: T, shiJian: TouchEvent) {
    chuMoKaiShiLeiXing(xiaoXi, 'wenBen', shiJian)
  }

  function chuMoJieShuWenBen() {
    guanBiDingShiQi()
  }

  function guanBiWenBenCaiDan() {
    guanBiCaiDan()
  }

  function keXianShiCheHui(xiaoXi: T): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  function huoQuWenBenCaiDanXiang(xiaoXi?: T): WenBenCaiDanXiang[] {
    const muBiao = xiaoXi ?? (dangQianCaiDan.value === 'wenBen' ? dangQianXiaoXi.value : null)
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
    const muBiao = dangQianCaiDan.value === 'wenBen' ? dangQianXiaoXi.value : null
    guanBiCaiDan()
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
    daKaiYouJianCaiDanLeiXing(xiaoXi, 'tuPian', shiJian)
  }

  function chuMoKaiShiTuPian(xiaoXi: T, shiJian: TouchEvent) {
    chuMoKaiShiLeiXing(xiaoXi, 'tuPian', shiJian)
  }

  function chuMoJieShuTuPian() {
    guanBiDingShiQi()
  }

  function guanBiTuPianCaiDan() {
    guanBiCaiDan()
  }

  function huoQuTuPianCaiDanXiang(xiaoXi?: T): TuPianCaiDanXiang[] {
    const muBiao = xiaoXi ?? (dangQianCaiDan.value === 'tuPian' ? dangQianXiaoXi.value : null)
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
    const muBiao = dangQianCaiDan.value === 'tuPian' ? dangQianXiaoXi.value : null
    guanBiCaiDan()
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
    guanBiCaiDan()
  }

  function quXiaoYinYong() {
    yinYongXiaoXi.value = null
  }

  async function zhiXingCheHui() {
    const muBiao = dangQianCaiDan.value === 'cheHui' ? dangQianXiaoXi.value : null
    guanBiCaiDan()
    if (!muBiao) return
    await yiLai.cheHuiXiaoXi(muBiao.id)
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

  if (getCurrentScope()) {
    onScopeDispose(() => {
      guanBiDingShiQi()
      guanBiCaiDan()
    })
  }

  return {
    caiDanDingWei,
    caiDanYuanSu,
    caiDanBenRen,
    dingGaoCaiDanWeiZhi,
    guanBiCaiDan,
    chuMoYiDongQuXiao,
    cheHuiCaiDanZhanKai,
    daKaiCaiDan,
    chuMoKaiShi,
    chuMoJieShu,
    zhiXingCheHui,
    xianShiCheHuiAnNiu,
    zhiXingCheHuiXiaoXi,
    yuYinCaiDanZhanKai,
    daKaiYuYinCaiDan,
    chuMoKaiShiYuYin,
    chuMoJieShuYuYin,
    guanBiYuYinCaiDan,
    huoQuYuYinCaiDanXiang,
    zhiXingYuYinCaiDanXiang,
    wenBenCaiDanZhanKai,
    daKaiWenBenCaiDan,
    chuMoKaiShiWenBen,
    chuMoJieShuWenBen,
    guanBiWenBenCaiDan,
    huoQuWenBenCaiDanXiang,
    zhiXingWenBenCaiDanXiang,
    tuPianCaiDanZhanKai,
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
