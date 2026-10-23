import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { io, Socket } from 'socket.io-client'
import { duQuLingPai } from '@/utils/令牌存储'
import { 使用用户仓库 } from '@/stores/用户'

export type RiZhiJiBie = 'debug' | 'info' | 'warn' | 'error'

export interface RiZhiTiaoMu {
  shi_jian: string
  ji_bie: RiZhiJiBie
  lei_xing: string
  xiao_xi: string
  yong_hu_id?: string
  jiao_se_id?: string
  qing_qiu_id?: string
  xiang_qing?: Record<string, unknown>
}

interface RiZhiPiLiangZaiHe {
  tiao_mu_lie_biao: RiZhiTiaoMu[]
  diu_qi_shu: number
}

export const SHI_JIAN_DING_YUE_RI_ZHI = '日志_订阅'
export const SHI_JIAN_QU_XIAO_RI_ZHI = '日志_取消订阅'
export const SHI_JIAN_RI_ZHI_PI_LIANG = '日志_批量'

export const HUAN_CHONG_ZUI_DA_TIAO_SHU = 1000
export const QUAN_BU_JI_BIE: RiZhiJiBie[] = ['debug', 'info', 'warn', 'error']

export const 使用实时日志仓库 = defineStore('实时日志', () => {
  const huanChongQu: (RiZhiTiaoMu | undefined)[] = new Array(HUAN_CHONG_ZUI_DA_TIAO_SHU)
  let xieRuYouBiao = 0
  let yiXieRuZongShu = 0

  const keJian = ref(false)
  const zanTing = ref(false)
  const yiLianJie = ref(false)
  const diuQiZongShu = ref(0)
  const guanJianZi = ref('')
  const qiYongJiBie = ref<Record<RiZhiJiBie, boolean>>({
    debug: true,
    info: true,
    warn: true,
    error: true,
  })

  const kuaiZhao = shallowRef<RiZhiTiaoMu[]>([])
  const socketLianJie = ref<Socket | null>(null)

  function shengChengKuaiZhao(): RiZhiTiaoMu[] {
    const zongShu = Math.min(yiXieRuZongShu, HUAN_CHONG_ZUI_DA_TIAO_SHU)
    const jieGuo: RiZhiTiaoMu[] = new Array(zongShu)
    const qiShi = (xieRuYouBiao - zongShu + HUAN_CHONG_ZUI_DA_TIAO_SHU) % HUAN_CHONG_ZUI_DA_TIAO_SHU
    for (let pianYi = 0; pianYi < zongShu; pianYi += 1) {
      jieGuo[pianYi] = huanChongQu[(qiShi + pianYi) % HUAN_CHONG_ZUI_DA_TIAO_SHU] as RiZhiTiaoMu
    }
    return jieGuo
  }

  function xieRuHuanChong(tiaoMuLieBiao: RiZhiTiaoMu[]) {
    for (const tiaoMu of tiaoMuLieBiao) {
      huanChongQu[xieRuYouBiao] = tiaoMu
      xieRuYouBiao = (xieRuYouBiao + 1) % HUAN_CHONG_ZUI_DA_TIAO_SHU
      yiXieRuZongShu += 1
    }
  }

  function chuLiPiLiang(zaiHe: RiZhiPiLiangZaiHe) {
    if (Array.isArray(zaiHe?.tiao_mu_lie_biao) && zaiHe.tiao_mu_lie_biao.length > 0) {
      xieRuHuanChong(zaiHe.tiao_mu_lie_biao)
    }
    if (typeof zaiHe?.diu_qi_shu === 'number' && zaiHe.diu_qi_shu > 0) {
      diuQiZongShu.value += zaiHe.diu_qi_shu
    }
    if (!zanTing.value) {
      kuaiZhao.value = shengChengKuaiZhao()
    }
  }

  function lianJie() {
    const 用户仓库 = 使用用户仓库()
    if (!用户仓库.keGaoWei) return
    if (socketLianJie.value) return

    const 令牌 = duQuLingPai()
    if (!令牌) return

    const xieYiLianJie = io({
      path: '/xieYiLianJie.io',
      auth: { token: 令牌 },
      transports: ['websocket', 'polling'],
    })

    xieYiLianJie.on('connect', () => {
      yiLianJie.value = true
      xieYiLianJie.emit(SHI_JIAN_DING_YUE_RI_ZHI)
    })
    xieYiLianJie.on('disconnect', () => {
      yiLianJie.value = false
    })
    xieYiLianJie.on(SHI_JIAN_RI_ZHI_PI_LIANG, chuLiPiLiang)

    socketLianJie.value = xieYiLianJie
  }

  function duanKai() {
    const xieYiLianJie = socketLianJie.value
    if (!xieYiLianJie) return
    if (xieYiLianJie.connected) xieYiLianJie.emit(SHI_JIAN_QU_XIAO_RI_ZHI)
    xieYiLianJie.off(SHI_JIAN_RI_ZHI_PI_LIANG, chuLiPiLiang)
    xieYiLianJie.disconnect()
    socketLianJie.value = null
    yiLianJie.value = false
  }

  function qieHuanKeJian() {
    keJian.value = !keJian.value
    if (keJian.value) {
      lianJie()
    } else {
      duanKai()
    }
  }

  function qieHuanZanTing() {
    zanTing.value = !zanTing.value
    if (!zanTing.value) {
      kuaiZhao.value = shengChengKuaiZhao()
    }
  }

  function qieHuanJiBie(jiBie: RiZhiJiBie) {
    qiYongJiBie.value = { ...qiYongJiBie.value, [jiBie]: !qiYongJiBie.value[jiBie] }
  }

  function qingKong() {
    huanChongQu.fill(undefined)
    xieRuYouBiao = 0
    yiXieRuZongShu = 0
    diuQiZongShu.value = 0
    kuaiZhao.value = []
  }

  const guoLvHouLieBiao = computed<RiZhiTiaoMu[]>(() => {
    const guanJianZiXiaoXie = guanJianZi.value.trim().toLowerCase()
    const jiBiePeiZhi = qiYongJiBie.value
    return kuaiZhao.value.filter((tiaoMu) => {
      if (!jiBiePeiZhi[tiaoMu.ji_bie]) return false
      if (!guanJianZiXiaoXie) return true
      if (tiaoMu.xiao_xi.toLowerCase().includes(guanJianZiXiaoXie)) return true
      if (tiaoMu.lei_xing.toLowerCase().includes(guanJianZiXiaoXie)) return true
      if (tiaoMu.yong_hu_id?.toLowerCase().includes(guanJianZiXiaoXie)) return true
      if (tiaoMu.qing_qiu_id?.toLowerCase().includes(guanJianZiXiaoXie)) return true
      return false
    })
  })

  const zongTiaoShu = computed(() => kuaiZhao.value.length)

  function xuLieHuaGuoLvJieGuo(): string {
    return guoLvHouLieBiao.value.map((tiaoMu) => JSON.stringify(tiaoMu)).join('\n')
  }

  return {
    keJian,
    zanTing,
    yiLianJie,
    diuQiZongShu,
    guanJianZi,
    qiYongJiBie,
    kuaiZhao,
    guoLvHouLieBiao,
    zongTiaoShu,
    lianJie,
    duanKai,
    qieHuanKeJian,
    qieHuanZanTing,
    qieHuanJiBie,
    qingKong,
    xuLieHuaGuoLvJieGuo,
  }
})
