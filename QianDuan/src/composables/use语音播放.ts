import { reactive, ref, watch } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types/类型定义'
import { guanLianYuYinYinPin, jieChuYuYinYinPin } from '@/composables/use语音音量'
import { 语音音量键, 语音音量表, duQuYuYinYinLiang, yuYinYinLiangZengYi } from '@/utils/语音音量存储'

interface Use语音播放依赖 {
  huoQuDiZhi: (xiaoXi: 消息) => string | undefined
  huoQuYinLiang?: () => number | null
}

export interface YuYinShiChangZaiTi {
  id?: string
  ke_hu_duan_id?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_url?: string | null
  ben_di_yu_lan_url?: string | null
}

interface YuYinBoFangKongZhi {
  zanTing: () => void
  jiXu: () => void
  tingZhi: () => void
  boFangZhong: () => boolean
}

const WEI_QIONG_DING_WEI_MIAO = 1e101

const ceDeShiChangHaoMiao = reactive(new Map<string, number>())
const ceLiangShiBaiDiZhi = new Set<string>()
const ceLiangRenWu = new Map<string, Promise<number | null>>()

let dangQianKongZhi: YuYinBoFangKongZhi | null = null
let jianPanJianTingZhong = false

function xiaoXiJian(xiaoXi: 消息): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

function yuYinDiZhi(xiaoXi: YuYinShiChangZaiTi): string {
  return xiaoXi.mei_ti_url || xiaoXi.ben_di_yu_lan_url || ''
}

function yuanShiHaoMiao(xiaoXi: YuYinShiChangZaiTi): number {
  const yiCeDe = ceDeShiChangHaoMiao.get(yuYinDiZhi(xiaoXi))
  if (typeof yiCeDe === 'number' && yiCeDe > 0) return yiCeDe
  const yuanShi = Number(xiaoXi.mei_ti_shi_chang_hao_miao)
  return Number.isFinite(yuanShi) && yuanShi > 0 ? yuanShi : 0
}

export function yuYinShiChangMiao(xiaoXi: YuYinShiChangZaiTi): number {
  return Math.min(
    DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao,
    Math.max(
      DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao,
      Math.round(yuanShiHaoMiao(xiaoXi) / 1000),
    ),
  )
}

export function geShiHuaYuYinShiChang(xiaoXi: YuYinShiChangZaiTi): string {
  return yuanShiHaoMiao(xiaoXi) > 0 ? `${yuYinShiChangMiao(xiaoXi)}″` : '…″'
}

export function yuYinKuanDuPx(xiaoXi: YuYinShiChangZaiTi): number {
  const tu =
    yuYinShiChangMiao(xiaoXi) * DUO_MEI_TI_PEI_ZHI.yuYinMeiMiaoKuanPx +
    DUO_MEI_TI_PEI_ZHI.yuYinJiChuKuanPx
  return Math.min(DUO_MEI_TI_PEI_ZHI.yuYinZuiChangKuanPx, tu)
}

export function yuYinKuanYangShi(xiaoXi: YuYinShiChangZaiTi): { width: string } {
  return { width: `${yuYinKuanDuPx(xiaoXi)}px` }
}

function duQuYinPinHaoMiao(yinPin: HTMLAudioElement): number {
  let shiChangMiao: number
  try {
    shiChangMiao = Number(yinPin.duration)
  } catch {
    return 0
  }
  return Number.isFinite(shiChangMiao) && shiChangMiao > 0 ? Math.round(shiChangMiao * 1000) : 0
}

function cuShiWuQiongShiChang(yinPin: HTMLAudioElement): void {
  let shiChangMiao: number
  try {
    shiChangMiao = Number(yinPin.duration)
  } catch {
    return
  }
  if (shiChangMiao !== Infinity || !(Number(yinPin.currentTime) <= 0)) return
  try {
    yinPin.currentTime = WEI_QIONG_DING_WEI_MIAO
  } catch {
    return
  }
}

function shiFangYinPin(yinPin: HTMLAudioElement): void {
  try {
    yinPin.pause()
    yinPin.removeAttribute('src')
    yinPin.load()
  } catch {
    return
  }
}

function ceLiangYinPinShiChang(diZhi: string): Promise<number | null> {
  return new Promise((jieJue) => {
    if (typeof Audio === 'undefined') {
      jieJue(null)
      return
    }
    const yinPin = new Audio()
    let yiJieShu = false
    let chaoShiDingShi: ReturnType<typeof setTimeout> | null = null
    const qingChuDingShi = (): void => {
      if (chaoShiDingShi === null) return
      clearTimeout(chaoShiDingShi)
      chaoShiDingShi = null
    }
    const jieShu = (haoMiao: number | null): void => {
      if (yiJieShu) return
      yiJieShu = true
      qingChuDingShi()
      yinPin.removeEventListener('loadedmetadata', changShiDu)
      yinPin.removeEventListener('durationchange', changShiDu)
      yinPin.removeEventListener('timeupdate', changShiDu)
      yinPin.removeEventListener('error', jieShuShiBai)
      shiFangYinPin(yinPin)
      jieJue(haoMiao !== null && haoMiao > 0 ? haoMiao : null)
    }
    const jieShuShiBai = (): void => jieShu(null)
    const changShiDu = (): void => {
      const haoMiao = duQuYinPinHaoMiao(yinPin)
      if (haoMiao > 0) {
        jieShu(haoMiao)
        return
      }
      cuShiWuQiongShiChang(yinPin)
    }
    yinPin.preload = 'metadata'
    yinPin.addEventListener('loadedmetadata', changShiDu)
    yinPin.addEventListener('durationchange', changShiDu)
    yinPin.addEventListener('timeupdate', changShiDu)
    yinPin.addEventListener('error', jieShuShiBai)
    chaoShiDingShi = setTimeout(
      jieShuShiBai,
      DUO_MEI_TI_PEI_ZHI.yuYinShiChangCeLiangChaoShiHaoMiao,
    )
    yinPin.src = diZhi
  })
}

export function ceLiangYuYinShiChang(xiaoXi: YuYinShiChangZaiTi): void {
  const diZhi = yuYinDiZhi(xiaoXi)
  if (diZhi === '') return
  if (ceDeShiChangHaoMiao.has(diZhi) || ceLiangShiBaiDiZhi.has(diZhi) || ceLiangRenWu.has(diZhi)) return
  const yuanShi = Number(xiaoXi.mei_ti_shi_chang_hao_miao)
  if (Number.isFinite(yuanShi) && yuanShi > 0) return
  const renWu = ceLiangYinPinShiChang(diZhi).then((haoMiao) => {
    ceLiangRenWu.delete(diZhi)
    if (haoMiao !== null) ceDeShiChangHaoMiao.set(diZhi, haoMiao)
    else ceLiangShiBaiDiZhi.add(diZhi)
    return haoMiao
  })
  ceLiangRenWu.set(diZhi, renWu)
}

function jiLuYiCeShiChang(diZhi: string, haoMiao: number): void {
  if (diZhi === '' || !(haoMiao > 0)) return
  if (ceDeShiChangHaoMiao.get(diZhi) === haoMiao) return
  ceDeShiChangHaoMiao.set(diZhi, haoMiao)
}

function shiKeBianJiYuanSu(muBiao: EventTarget | null): boolean {
  const yuanSu = muBiao instanceof Element ? muBiao : null
  if (!yuanSu) return false
  if (
    yuanSu.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    )
  ) {
    return true
  }
  return yuanSu instanceof HTMLElement && yuanSu.isContentEditable
}

function shiHuDongYuanSu(muBiao: EventTarget | null): boolean {
  return (
    muBiao instanceof Element &&
    !!muBiao.closest('button, a, [role="button"], [role="slider"], [role="switch"]')
  )
}

function chuLiKongGeJian(shiJian: KeyboardEvent): void {
  if (shiJian.code !== 'Space' && shiJian.key !== ' ') return
  if (shiJian.repeat || shiJian.isComposing) return
  if (shiJian.altKey || shiJian.ctrlKey || shiJian.metaKey) return
  if (shiKeBianJiYuanSu(shiJian.target) || shiHuDongYuanSu(shiJian.target)) return
  if (!qieHuanDangQianYuYin()) return
  shiJian.preventDefault()
}

function anZhuangJianPanJianTing(): void {
  if (jianPanJianTingZhong || typeof window === 'undefined') return
  window.addEventListener('keydown', chuLiKongGeJian)
  jianPanJianTingZhong = true
}

function xieZaiJianPanJianTing(): void {
  if (!jianPanJianTingZhong || typeof window === 'undefined') return
  window.removeEventListener('keydown', chuLiKongGeJian)
  jianPanJianTingZhong = false
}

function dengJiDangQianKongZhi(kongZhi: YuYinBoFangKongZhi): void {
  dangQianKongZhi = kongZhi
  anZhuangJianPanJianTing()
}

function zhuXiaoDangQianKongZhi(kongZhi: YuYinBoFangKongZhi): void {
  if (dangQianKongZhi !== kongZhi) return
  dangQianKongZhi = null
  xieZaiJianPanJianTing()
}

export function shiDangQianYuYinBoFangZhong(): boolean {
  return dangQianKongZhi !== null && dangQianKongZhi.boFangZhong()
}

export function zanTingDangQianYuYin(): boolean {
  if (!dangQianKongZhi || !dangQianKongZhi.boFangZhong()) return false
  dangQianKongZhi.zanTing()
  return true
}

export function jiXuDangQianYuYin(): boolean {
  if (!dangQianKongZhi || dangQianKongZhi.boFangZhong()) return false
  dangQianKongZhi.jiXu()
  return true
}

export function qieHuanDangQianYuYin(): boolean {
  if (!dangQianKongZhi) return false
  return dangQianKongZhi.boFangZhong() ? zanTingDangQianYuYin() : jiXuDangQianYuYin()
}

export function tingZhiDangQianYuYin(): boolean {
  if (!dangQianKongZhi) return false
  dangQianKongZhi.tingZhi()
  return true
}

const YU_YIN_SHUANG_JI_JIAN_GE_HAO_MIAO = 260

export function use语音播放(yiLai: Use语音播放依赖) {
  const boFangZhongXiaoXiKey = ref<string | null>(null)
  const boFangZhuangTai = ref<'wu' | 'boFang' | 'zanTing'>('wu')
  const boFangJinDuMiao = ref(0)
  const boFangZongMiao = ref(0)
  let dangQianYinPin: HTMLAudioElement | null = null
  let dangQianXiaoXi: 消息 | null = null
  let benShiLiKongZhi: YuYinBoFangKongZhi | null = null
  let jinDuDingShiQi: ReturnType<typeof setInterval> | null = null
  let dianJiDingShiQi: ReturnType<typeof setTimeout> | null = null
  let daiDianJiXiaoXi: 消息 | null = null

  function shiYuYinXuanZhong(xiaoXi: 消息): boolean {
    return boFangZhuangTai.value !== 'wu' && boFangZhongXiaoXiKey.value === xiaoXiJian(xiaoXi)
  }

  function shiYuYinBoFangZhong(xiaoXi: 消息): boolean {
    return boFangZhuangTai.value === 'boFang' && boFangZhongXiaoXiKey.value === xiaoXiJian(xiaoXi)
  }

  function huoQuBoFangJinDu(xiaoXi: 消息): number {
    if (!shiYuYinXuanZhong(xiaoXi)) return 0
    return boFangJinDuMiao.value
  }

  function huoQuBoFangZongMiao(xiaoXi: 消息): number {
    if (shiYuYinXuanZhong(xiaoXi) && boFangZongMiao.value > 0) return boFangZongMiao.value
    return yuYinShiChangMiao(xiaoXi)
  }

  function huoQuBenShiLiKongZhi(): YuYinBoFangKongZhi {
    if (!benShiLiKongZhi) {
      benShiLiKongZhi = {
        zanTing: () => zanTingYinPinBoFang(),
        jiXu: () => {
          if (dangQianXiaoXi) kaiShiBoFang(dangQianXiaoXi)
        },
        tingZhi: () => tingZhiYinPinBoFang(),
        boFangZhong: () => boFangZhuangTai.value === 'boFang',
      }
    }
    return benShiLiKongZhi
  }

  function qingLiJinDuDingShiQi() {
    if (jinDuDingShiQi) {
      clearInterval(jinDuDingShiQi)
      jinDuDingShiQi = null
    }
  }

  function tongDaoYinLiang(): number {
    try {
      const 值 = yiLai.huoQuYinLiang?.()
      if (typeof 值 !== 'number' || !Number.isFinite(值)) return 1
      return Math.max(0, Math.min(1, 值))
    } catch {
      return 1
    }
  }

  function yingYongYinLiang(yinPin: HTMLAudioElement, xiaoXi: 消息): void {
    const 目标 = Math.max(
      0,
      Math.min(1, tongDaoYinLiang() * yuYinYinLiangZengYi(duQuYuYinYinLiang(xiaoXi))),
    )
    try {
      yinPin.muted = 目标 <= 0
      yinPin.volume = 目标
    } catch {
      return
    }
  }

  watch(
    () => (dangQianXiaoXi ? 语音音量表.get(语音音量键(dangQianXiaoXi)) : undefined),
    () => {
      if (!dangQianYinPin || !dangQianXiaoXi) return
      yingYongYinLiang(dangQianYinPin, dangQianXiaoXi)
    },
  )

  function qingLiDianJiDingShiQi() {
    if (dianJiDingShiQi) {
      clearTimeout(dianJiDingShiQi)
      dianJiDingShiQi = null
    }
    daiDianJiXiaoXi = null
  }

  function tingZhiYinPinBoFang() {
    qingLiJinDuDingShiQi()
    qingLiDianJiDingShiQi()
    if (dangQianYinPin) {
      const yinPin = dangQianYinPin
      dangQianYinPin = null
      jieChuYuYinYinPin(yinPin)
      yinPin.pause()
      yinPin.src = ''
    }
    if (benShiLiKongZhi) zhuXiaoDangQianKongZhi(benShiLiKongZhi)
    dangQianXiaoXi = null
    boFangZhongXiaoXiKey.value = null
    boFangZhuangTai.value = 'wu'
    boFangJinDuMiao.value = 0
    boFangZongMiao.value = 0
  }

  function kaiShiJinDuGenZong(yinPin: HTMLAudioElement) {
    qingLiJinDuDingShiQi()
    const gengXin = () => {
      if (dangQianYinPin !== yinPin) return
      const dangQian = Number(yinPin.currentTime)
      const zong = Number(yinPin.duration)
      if (Number.isFinite(dangQian) && dangQian >= 0) boFangJinDuMiao.value = dangQian
      if (Number.isFinite(zong) && zong > 0) boFangZongMiao.value = zong
    }
    gengXin()
    jinDuDingShiQi = setInterval(gengXin, 200)
  }

  function chuanJianYinPin(xiaoXi: 消息): HTMLAudioElement | null {
    const jian = xiaoXiJian(xiaoXi)
    if (dangQianYinPin && boFangZhongXiaoXiKey.value === jian) return dangQianYinPin
    const diZhi = yiLai.huoQuDiZhi(xiaoXi)
    if (!diZhi) return null
    tingZhiYinPinBoFang()
    const yinPin = new Audio(diZhi)
    guanLianYuYinYinPin(yinPin)
    yingYongYinLiang(yinPin, xiaoXi)
    const cunShiChang = () => {
      if (dangQianYinPin !== yinPin) return
      const haoMiao = duQuYinPinHaoMiao(yinPin)
      if (haoMiao <= 0) return
      jiLuYiCeShiChang(diZhi, haoMiao)
      boFangZongMiao.value = haoMiao / 1000
    }
    yinPin.addEventListener('loadedmetadata', cunShiChang)
    yinPin.addEventListener('durationchange', cunShiChang)
    yinPin.addEventListener('ended', () => {
      if (dangQianYinPin === yinPin) tingZhiYinPinBoFang()
    })
    yinPin.addEventListener('timeupdate', () => {
      if (dangQianYinPin !== yinPin) return
      if (Number.isFinite(yinPin.currentTime)) boFangJinDuMiao.value = yinPin.currentTime
    })
    dangQianYinPin = yinPin
    dangQianXiaoXi = xiaoXi
    boFangZhongXiaoXiKey.value = jian
    boFangZhuangTai.value = 'zanTing'
    boFangJinDuMiao.value = 0
    boFangZongMiao.value = yuanShiHaoMiao(xiaoXi) > 0 ? yuanShiHaoMiao(xiaoXi) / 1000 : yuYinShiChangMiao(xiaoXi)
    dengJiDangQianKongZhi(huoQuBenShiLiKongZhi())
    kaiShiJinDuGenZong(yinPin)
    return yinPin
  }

  function kaiShiBoFang(xiaoXi: 消息) {
    const yinPin = chuanJianYinPin(xiaoXi)
    if (!yinPin) return
    try {
      const zong = Number(yinPin.duration)
      if (yinPin.ended || (Number.isFinite(zong) && zong > 0 && yinPin.currentTime >= zong)) {
        yinPin.currentTime = 0
        boFangJinDuMiao.value = 0
      }
    } catch {
      boFangJinDuMiao.value = 0
    }
    boFangZhuangTai.value = 'boFang'
    Promise.resolve(yinPin.play()).catch(() => {
      if (dangQianYinPin === yinPin) tingZhiYinPinBoFang()
    })
  }

  function zanTingYinPinBoFang() {
    if (dangQianYinPin) {
      try {
        dangQianYinPin.pause()
      } catch {
        boFangZhuangTai.value = 'zanTing'
      }
    }
    if (boFangZhuangTai.value === 'boFang') boFangZhuangTai.value = 'zanTing'
  }

  function qieHuanYuYinBoFang(xiaoXi: 消息) {
    if (shiYuYinXuanZhong(xiaoXi) && dangQianYinPin) {
      if (boFangZhuangTai.value === 'boFang') {
        zanTingYinPinBoFang()
        return
      }
      kaiShiBoFang(xiaoXi)
      return
    }
    kaiShiBoFang(xiaoXi)
  }

  function huiDaoKaiTouBingZanTing(xiaoXi: 消息) {
    const yinPin = chuanJianYinPin(xiaoXi)
    if (!yinPin) return
    try {
      yinPin.pause()
      yinPin.currentTime = 0
    } catch {
      boFangJinDuMiao.value = 0
    }
    boFangZhuangTai.value = 'zanTing'
    boFangJinDuMiao.value = 0
  }

  function chuLiYuYinDianJi(xiaoXi: 消息) {
    const jian = xiaoXiJian(xiaoXi)
    if (dianJiDingShiQi && daiDianJiXiaoXi) {
      if (xiaoXiJian(daiDianJiXiaoXi) === jian) {
        qingLiDianJiDingShiQi()
        huiDaoKaiTouBingZanTing(xiaoXi)
        return
      }
      const shangYiTiao = daiDianJiXiaoXi
      qingLiDianJiDingShiQi()
      qieHuanYuYinBoFang(shangYiTiao)
    }
    daiDianJiXiaoXi = xiaoXi
    dianJiDingShiQi = setTimeout(() => {
      const muBiao = daiDianJiXiaoXi
      qingLiDianJiDingShiQi()
      if (muBiao) qieHuanYuYinBoFang(muBiao)
    }, YU_YIN_SHUANG_JI_JIAN_GE_HAO_MIAO)
  }

  function tiaoZhuanYuYinJinDu(xiaoXi: 消息, miao: number) {
    if (!shiYuYinXuanZhong(xiaoXi) || !dangQianYinPin) return
    const zong = boFangZongMiao.value > 0 ? boFangZongMiao.value : yuYinShiChangMiao(xiaoXi)
    const muBiao = Math.max(0, Math.min(zong, Number(miao) || 0))
    try {
      dangQianYinPin.currentTime = muBiao
      boFangJinDuMiao.value = muBiao
    } catch {
      boFangJinDuMiao.value = 0
    }
  }

  return {
    shiYuYinBoFangZhong,
    shiYuYinXuanZhong,
    tingZhiYinPinBoFang,
    qieHuanYuYinBoFang,
    chuLiYuYinDianJi,
    huiDaoKaiTouBingZanTing,
    boFangJinDuMiao,
    boFangZongMiao,
    huoQuBoFangJinDu,
    huoQuBoFangZongMiao,
    tiaoZhuanYuYinJinDu,
  }
}
