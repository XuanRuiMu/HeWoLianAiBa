import { ref } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types/类型定义'

interface Use语音播放依赖 {
  huoQuDiZhi: (xiaoXi: 消息) => string | undefined
  huoQuYinLiang?: () => number | null
}

/**
 * 时长几何的唯一载体要求：只有毫秒时长这一个字段。
 * 聊天页的 消息 与好友页的 HaoYouXiaoXi 都满足它 ⇒ 语音气泡的宽度/时长口径两页同源，
 * 好友页哪天补上时长字段就直接复用同一份组件，不必再抄第二套算式。
 */
export interface YuYinShiChangZaiTi {
  mei_ti_shi_chang_hao_miao?: number | null
}

function xiaoXiJian(xiaoXi: 消息): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

/** 语音时长的唯一取秒口径：毫秒→整秒，夹在配置的上下秒之间（气泡宽度与总时长都吃它） */
export function yuYinShiChangMiao(xiaoXi: YuYinShiChangZaiTi): number {
  return Math.min(
    DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao,
    Math.max(
      DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao,
      Math.round((xiaoXi.mei_ti_shi_chang_hao_miao ?? 0) / 1000),
    ),
  )
}

/** 时长文本（未播放态与进度行共用）：秒数 + 半角逐引号，与取证 §1-A 的 `12"` 同口径 */
export function geShiHuaYuYinShiChang(xiaoXi: YuYinShiChangZaiTi): string {
  return `${yuYinShiChangMiao(xiaoXi)}″`
}

/**
 * 「时长越长气泡越宽」的唯一算式（取证 §1-A：`data.second * 10 + 20`，§1-A 上限 max-width 300px）：
 * 结果夹进配置上下限，一秒不塌成一条线、六十秒不撑破会话栏。
 */
export function yuYinKuanDuPx(xiaoXi: YuYinShiChangZaiTi): number {
  const tu =
    yuYinShiChangMiao(xiaoXi) * DUO_MEI_TI_PEI_ZHI.yuYinMeiMiaoKuanPx +
    DUO_MEI_TI_PEI_ZHI.yuYinJiChuKuanPx
  return Math.min(
    DUO_MEI_TI_PEI_ZHI.yuYinZuiChangKuanPx,
    Math.max(DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanKuanPx, tu),
  )
}

/** 气泡宽度的唯一出口：页面与组件都不许再自己拼 px */
export function yuYinKuanYangShi(xiaoXi: YuYinShiChangZaiTi): { width: string } {
  return { width: `${yuYinKuanDuPx(xiaoXi)}px` }
}

const YU_YIN_SHUANG_JI_JIAN_GE_HAO_MIAO = 260

export function use语音播放(yiLai: Use语音播放依赖) {
  const boFangZhongXiaoXiKey = ref<string | null>(null)
  const boFangZhuangTai = ref<'wu' | 'boFang' | 'zanTing'>('wu')
  const boFangJinDuMiao = ref(0)
  const boFangZongMiao = ref(0)
  let dangQianYinPin: HTMLAudioElement | null = null
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

  function qingLiJinDuDingShiQi() {
    if (jinDuDingShiQi) {
      clearInterval(jinDuDingShiQi)
      jinDuDingShiQi = null
    }
  }

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
      yinPin.pause()
      yinPin.src = ''
    }
    boFangZhongXiaoXiKey.value = null
    boFangZhuangTai.value = 'wu'
    boFangJinDuMiao.value = 0
    boFangZongMiao.value = 0
  }

  function kaiShiJinDuGenZong(yinPin: HTMLAudioElement) {
    qingLiJinDuDingShiQi()
    const gengXin = () => {
      if (dangQianYinPin !== yinPin) return
      try {
        const dangQian = Number(yinPin.currentTime)
        const zong = Number(yinPin.duration)
        if (Number.isFinite(dangQian) && dangQian >= 0) boFangJinDuMiao.value = dangQian
        if (Number.isFinite(zong) && zong > 0) boFangZongMiao.value = zong
      } catch {
        /* 忽略进度读取异常 */
      }
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
    try {
      const yinLiang = yiLai.huoQuYinLiang?.()
      if (typeof yinLiang === 'number' && Number.isFinite(yinLiang)) {
        if (yinLiang <= 0) yinPin.muted = true
        else yinPin.volume = Math.max(0, Math.min(1, yinLiang))
      }
    } catch {
      /* 忽略 */
    }
    yinPin.addEventListener('loadedmetadata', () => {
      if (dangQianYinPin !== yinPin) return
      try {
        if (Number.isFinite(yinPin.duration) && yinPin.duration > 0) {
          boFangZongMiao.value = yinPin.duration
        }
      } catch {
        /* 忽略 */
      }
    })
    yinPin.addEventListener('ended', () => {
      if (dangQianYinPin === yinPin) tingZhiYinPinBoFang()
    })
    yinPin.addEventListener('timeupdate', () => {
      if (dangQianYinPin !== yinPin) return
      try {
        if (Number.isFinite(yinPin.currentTime)) boFangJinDuMiao.value = yinPin.currentTime
      } catch {
        /* 忽略 */
      }
    })
    dangQianYinPin = yinPin
    boFangZhongXiaoXiKey.value = jian
    boFangZhuangTai.value = 'zanTing'
    boFangJinDuMiao.value = 0
    boFangZongMiao.value = yuYinShiChangMiao(xiaoXi)
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
      /* 忽略 */
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
        /* 忽略 */
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
      /* 忽略 */
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
      /* 忽略拖动异常 */
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
