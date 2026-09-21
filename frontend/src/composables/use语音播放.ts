import { ref } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

export const YU_YIN_BO_XING_TIAO_SHU = 12

interface Use语音播放依赖 {
  huoQuDiZhi: (xiaoXi: 消息) => string | undefined
}

function xiaoXiJian(xiaoXi: 消息): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

export function use语音播放(yiLai: Use语音播放依赖) {
  const boFangZhongXiaoXiKey = ref<string | null>(null)
  const boFangJinDuMiao = ref(0)
  const boFangZongMiao = ref(0)
  let dangQianYinPin: HTMLAudioElement | null = null
  let jinDuDingShiQi: ReturnType<typeof setInterval> | null = null

  function geShiHuaYuYinShiChang(xiaoXi: 消息): string {
    const miao = Math.max(1, Math.round((xiaoXi.mei_ti_shi_chang_hao_miao ?? 0) / 1000))
    return `${miao}″`
  }

  function yuYinShiChangMiao(xiaoXi: 消息): number {
    return Math.min(
      DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao,
      Math.max(
        DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao,
        Math.round((xiaoXi.mei_ti_shi_chang_hao_miao ?? 0) / 1000),
      ),
    )
  }

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

  function yuYinKuanYangShi(xiaoXi: 消息) {
    const { yuYinZuiDuanKuanPx, yuYinZuiChangKuanPx, yuYinZuiDaMiao, yuYinZuiDuanMiao } =
      DUO_MEI_TI_PEI_ZHI
    const miao = yuYinShiChangMiao(xiaoXi)
    const biLi = (miao - yuYinZuiDuanMiao) / Math.max(1, yuYinZuiDaMiao - yuYinZuiDuanMiao)
    const kuanDu = Math.round(
      yuYinZuiDuanKuanPx + biLi * (yuYinZuiChangKuanPx - yuYinZuiDuanKuanPx),
    )
    return { width: `${kuanDu}px` }
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
    YU_YIN_BO_XING_TIAO_SHU,
    shiYuYinBoFangZhong,
    yuYinKuanYangShi,
    geShiHuaYuYinShiChang,
    tingZhiYinPinBoFang,
    qieHuanYuYinBoFang,
    boFangJinDuMiao,
    boFangZongMiao,
    huoQuBoFangJinDu,
    huoQuBoFangZongMiao,
    tiaoZhuanYuYinJinDu,
  }
}
