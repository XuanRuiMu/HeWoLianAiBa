import { ref } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

interface Use语音播放依赖 {
  huoQuDiZhi: (xiaoXi: 消息) => string | undefined
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

export function use语音播放(yiLai: Use语音播放依赖) {
  const boFangZhongXiaoXiKey = ref<string | null>(null)
  const boFangJinDuMiao = ref(0)
  const boFangZongMiao = ref(0)
  let dangQianYinPin: HTMLAudioElement | null = null
  let jinDuDingShiQi: ReturnType<typeof setInterval> | null = null

  function shiYuYinBoFangZhong(xiaoXi: 消息): boolean {
    return boFangZhongXiaoXiKey.value === xiaoXiJian(xiaoXi)
  }

  function huoQuBoFangJinDu(xiaoXi: 消息): number {
    if (!shiYuYinBoFangZhong(xiaoXi)) return 0
    return boFangJinDuMiao.value
  }

  function huoQuBoFangZongMiao(xiaoXi: 消息): number {
    if (shiYuYinBoFangZhong(xiaoXi) && boFangZongMiao.value > 0) return boFangZongMiao.value
    return yuYinShiChangMiao(xiaoXi)
  }

  function qingLiJinDuDingShiQi() {
    if (jinDuDingShiQi) {
      clearInterval(jinDuDingShiQi)
      jinDuDingShiQi = null
    }
  }

  function tingZhiYinPinBoFang() {
    qingLiJinDuDingShiQi()
    if (dangQianYinPin) {
      dangQianYinPin.pause()
      dangQianYinPin.src = ''
      dangQianYinPin = null
    }
    boFangZhongXiaoXiKey.value = null
    boFangJinDuMiao.value = 0
    boFangZongMiao.value = 0
  }

  function kaiShiJinDuGenZong(yinPin: HTMLAudioElement) {
    qingLiJinDuDingShiQi()
    const gengXin = () => {
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

  function qieHuanYuYinBoFang(xiaoXi: 消息) {
    const diZhi = yiLai.huoQuDiZhi(xiaoXi)
    if (!diZhi) return
    const jian = xiaoXiJian(xiaoXi)
    if (boFangZhongXiaoXiKey.value === jian) {
      tingZhiYinPinBoFang()
      return
    }
    tingZhiYinPinBoFang()
    const yinPin = new Audio(diZhi)
    yinPin.addEventListener('loadedmetadata', () => {
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
      try {
        if (Number.isFinite(yinPin.currentTime)) boFangJinDuMiao.value = yinPin.currentTime
      } catch {
        /* 忽略 */
      }
    })
    dangQianYinPin = yinPin
    boFangZhongXiaoXiKey.value = jian
    boFangJinDuMiao.value = 0
    boFangZongMiao.value = yuYinShiChangMiao(xiaoXi)
    kaiShiJinDuGenZong(yinPin)
    Promise.resolve(yinPin.play()).catch(() => {
      tingZhiYinPinBoFang()
    })
  }

  function tiaoZhuanYuYinJinDu(xiaoXi: 消息, miao: number) {
    if (!shiYuYinBoFangZhong(xiaoXi) || !dangQianYinPin) return
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
    tingZhiYinPinBoFang,
    qieHuanYuYinBoFang,
    boFangJinDuMiao,
    boFangZongMiao,
    huoQuBoFangJinDu,
    huoQuBoFangZongMiao,
    tiaoZhuanYuYinJinDu,
  }
}
