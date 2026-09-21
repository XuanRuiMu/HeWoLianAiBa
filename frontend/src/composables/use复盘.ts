import { computed, ref } from 'vue'
import type { Router } from 'vue-router'
import { huoQuFuPan, type 复盘批注项 } from '@/api/聊天'
import { huoQuFanYi } from '@/config/translations'
import type { 消息 } from '@/types'

export interface PiZhuXiang {
  xu_hao: number
  nei_rong: string
  qing_gan?: string
}

export interface ZongJieFenKuai {
  biaoTi: string
  neiRong: string
  jingGao: boolean
}

interface Use复盘依赖 {
  luYou: Pick<Router, 'push'>
  huoQuXiaoXiLieBiao: () => 消息[]
  qingKongZhuangTai: () => void
}

export function use复盘(yiLai: Use复盘依赖) {
  const fuPanMoShi = ref(false)
  const fuPanPiZhu = ref<复盘批注项[] | null>(null)
  const fuPanZongJie = ref<string | null>(null)
  const fuPanJiaZaiZhong = ref(false)
  const fuPanDangAnId = ref<string | null>(null)
  let fuPanQingQiuId = 0

  const xiaoXiDaoXuHaoMap = computed<Map<string, number>>(() => {
    const map = new Map<string, number>()
    if (!fuPanMoShi.value) return map
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    if (!Array.isArray(lieBiao)) return map
    let xuHao = 0
    for (const xiaoXi of lieBiao) {
      if (xiaoXi.fa_song_zhe_lei_xing === 'xitong' || xiaoXi.lei_xing === 'xitong') continue
      xuHao += 1
      const key = xiaoXi.ke_hu_duan_id || xiaoXi.id
      if (key) map.set(key, xuHao)
    }
    return map
  })

  const piZhuMap = computed<Map<number, PiZhuXiang>>(() => {
    const map = new Map<number, PiZhuXiang>()
    if (!fuPanPiZhu.value) return map
    for (const xiang of fuPanPiZhu.value) {
      if (typeof xiang.xu_hao === 'number' && typeof xiang.ping_lun === 'string') {
        map.set(xiang.xu_hao, {
          xu_hao: xiang.xu_hao,
          nei_rong: xiang.ping_lun,
          qing_gan: typeof xiang.qing_gan === 'string' ? xiang.qing_gan : undefined,
        })
      }
    }
    return map
  })

  function huoQuPiZhuByXiaoXiId(xiaoXiId: string): PiZhuXiang | null {
    const xuHao = xiaoXiDaoXuHaoMap.value.get(xiaoXiId)
    if (!xuHao) return null
    return piZhuMap.value.get(xuHao) || null
  }

  function huoQuQingGanLeiXing(qingGan?: string): 'positive' | 'negative' | 'neutral' {
    if (!qingGan) return 'neutral'
    const zhi = qingGan.trim().toLowerCase()
    if (zhi === 'positive' || zhi === '积极') return 'positive'
    if (zhi === 'negative' || zhi === '消极') return 'negative'
    return 'neutral'
  }

  const fuPanZongJieFenKuai = computed<ZongJieFenKuai[] | null>(() => {
    if (!fuPanZongJie.value) return null
    const wenBen = fuPanZongJie.value.trim()
    if (!wenBen) return null

    const ziDuanMingChen = [
      huoQuFanYi('zhanJi', 'duiXiangLeiXing'),
      huoQuFanYi('zhanJi', 'yongHuBiaoXian'),
      huoQuFanYi('zhanJi', 'guanJianZhuanZheDian'),
      huoQuFanYi('zhanJi', 'gaiJinJianYi'),
    ]

    const youZiDuan = ziDuanMingChen.some(
      (ming) => wenBen.includes(ming + '：') || wenBen.includes(ming + ':'),
    )
    if (!youZiDuan) return null

    const hangLie = wenBen
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
    const jieGuo: ZongJieFenKuai[] = []
    let dangQianBiaoTi = ''
    let dangQianNeiRong = ''

    function yaRuDangQian(): void {
      if (!dangQianBiaoTi) return
      jieGuo.push({
        biaoTi: dangQianBiaoTi,
        neiRong: dangQianNeiRong.trim(),
        jingGao:
          dangQianBiaoTi === huoQuFanYi('zhanJi', 'duiXiangLeiXing') &&
          dangQianNeiRong.includes(huoQuFanYi('zhanJi', 'zhaXing')),
      })
    }

    for (const hang of hangLie) {
      const piPeiMing = ziDuanMingChen.find(
        (ming) => hang.startsWith(ming + '：') || hang.startsWith(ming + ':'),
      )
      if (piPeiMing) {
        yaRuDangQian()
        dangQianBiaoTi = piPeiMing
        const qianZhui = hang.startsWith(piPeiMing + '：') ? piPeiMing + '：' : piPeiMing + ':'
        dangQianNeiRong = hang.slice(qianZhui.length).trim()
      } else if (dangQianBiaoTi) {
        dangQianNeiRong += '\n' + hang
      }
    }
    yaRuDangQian()

    return jieGuo.length > 0 ? jieGuo : null
  })

  async function jiaZaiFuPanShuJu(dangAnId: string) {
    const benCiId = ++fuPanQingQiuId
    fuPanJiaZaiZhong.value = true
    fuPanPiZhu.value = null
    fuPanZongJie.value = null
    try {
      let fuPanShuJu = await huoQuFuPan(dangAnId)
      if (!fuPanShuJu.jia_zai_zhong && fuPanShuJu.fu_pan_nei_rong) {
        fuPanPiZhu.value = fuPanShuJu.fu_pan_pi_zhu
        fuPanZongJie.value = fuPanShuJu.fu_pan_nei_rong
        fuPanJiaZaiZhong.value = false
        return
      }
      let changShiCiShu = 0
      while (!fuPanShuJu.fu_pan_nei_rong && changShiCiShu < 20 && fuPanQingQiuId === benCiId) {
        await new Promise((jieJue) => setTimeout(jieJue, 3000))
        changShiCiShu++
        if (fuPanQingQiuId !== benCiId) return
        try {
          fuPanShuJu = await huoQuFuPan(dangAnId)
        } catch (e) {
           
          console.warn('轮询复盘数据失败', e)
        }
        if (fuPanShuJu.fu_pan_nei_rong || !fuPanShuJu.jia_zai_zhong) {
          fuPanPiZhu.value = fuPanShuJu.fu_pan_pi_zhu
          fuPanZongJie.value = fuPanShuJu.fu_pan_nei_rong
          fuPanJiaZaiZhong.value = false
          break
        }
      }
    } finally {
      if (fuPanQingQiuId === benCiId) {
        fuPanJiaZaiZhong.value = false
      }
    }
  }

  function tuiChuFuPan() {
    fuPanMoShi.value = false
    fuPanPiZhu.value = null
    fuPanZongJie.value = null
    fuPanJiaZaiZhong.value = false
    fuPanDangAnId.value = null
    fuPanQingQiuId++
    yiLai.qingKongZhuangTai()
    yiLai.luYou.push('/guo-wang-zhan-ji')
  }

  return {
    fuPanMoShi,
    fuPanPiZhu,
    fuPanZongJie,
    fuPanJiaZaiZhong,
    fuPanDangAnId,
    xiaoXiDaoXuHaoMap,
    piZhuMap,
    huoQuPiZhuByXiaoXiId,
    huoQuQingGanLeiXing,
    fuPanZongJieFenKuai,
    jiaZaiFuPanShuJu,
    tuiChuFuPan,
  }
}
