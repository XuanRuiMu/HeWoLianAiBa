import { computed, ref } from 'vue'
import type { Router } from 'vue-router'
import { huoQuFuPan, shengChengFuPan, 复盘状态, type 复盘批注项, type 复盘响应, type 复盘段项 } from '@/api/聊天'
import { huoQuFanYi } from '@/config/翻译表'
import type { 消息 } from '@/types/类型定义'

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
  const fuPanWuLiaoTianJiLu = ref(false)
  const fuPanDangAnId = ref<string | null>(null)
  const fuPanShiBai = ref(false)
  const fuPanDuan = ref<复盘段项[]>([])
  const fuPanFenZu = ref<复盘响应['fu_pan_fen_zu']>([])
  const zhanKaiQuanBuFenZu = ref(false)
  const fuPanZongDuanShu = ref(0)
  const fuPanYouGengDuo = ref(false)
  let fuPanQingQiuId = 0

  const piZhuMap = computed<Map<string, PiZhuXiang>>(() => {
    const biao = new Map<string, PiZhuXiang>()
    for (const duan of fuPanDuan.value) {
      const zhi = duan.pi_zhu
      if (!zhi || !Array.isArray(duan.xiao_xi_ids)) continue
      for (const id of duan.xiao_xi_ids) {
        biao.set(id, { xu_hao: duan.xu_hao, nei_rong: zhi.ping_lun, qing_gan: zhi.qing_gan })
      }
    }
    return biao
  })
  const keJianPiZhu = computed(() => {
    if (zhanKaiQuanBuFenZu.value || !fuPanFenZu.value?.length) return fuPanDuan.value.filter((x) => x.pi_zhu).map((x) => ({ xu_hao: x.xu_hao, nei_rong: x.pi_zhu?.ping_lun || '', qing_gan: x.pi_zhu?.qing_gan }))
    return fuPanFenZu.value.filter((zu) => zu.mo_ren_zhan_kai).flatMap((zu) => zu.duan_lie_biao).filter((x) => x.pi_zhu).map((x) => ({ xu_hao: x.xu_hao, nei_rong: x.pi_zhu?.ping_lun || '', qing_gan: x.pi_zhu?.qing_gan }))
  })
  const yinCangZuShu = computed(() => fuPanFenZu.value?.filter((zu) => !zu.mo_ren_zhan_kai).length ?? 0)
  const haiYouGengDuo = computed(() => !zhanKaiQuanBuFenZu.value && fuPanYouGengDuo.value)
  const zongDuanShu = computed(() => fuPanZongDuanShu.value)
  const zhanKaiPiZhuFenZu = computed(() => fuPanFenZu.value?.filter((zu) => zu.mo_ren_zhan_kai || zhanKaiQuanBuFenZu.value) ?? [])

  function huoQuPiZhuByXiaoXiId(xiaoXiId: string): PiZhuXiang | null {
    return piZhuMap.value.get(xiaoXiId) ?? null
  }


  const xiaoXiDaoXuHaoMap = computed<Map<string, number>>(() => {
    const biao = new Map<string, number>()
    for (const [id, xiang] of piZhuMap.value) biao.set(id, xiang.xu_hao)
    return biao
  })

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

  function yingYongWuLiaoTianJiLu(): void {
    fuPanWuLiaoTianJiLu.value = true
    fuPanPiZhu.value = null
    fuPanZongJie.value = null
    fuPanJiaZaiZhong.value = false
  }

  async function jiaZaiFuPanShuJu(dangAnId: string, chongShi = false) {
    const benCiId = ++fuPanQingQiuId
    fuPanDangAnId.value = dangAnId
    fuPanWuLiaoTianJiLu.value = false
    fuPanJiaZaiZhong.value = true
    fuPanShiBai.value = false
    fuPanPiZhu.value = null
    fuPanZongJie.value = null
    fuPanDuan.value = []
    fuPanFenZu.value = []
    fuPanZongDuanShu.value = 0
    fuPanYouGengDuo.value = false
    zhanKaiQuanBuFenZu.value = false
    try {
      let shuJu = chongShi ? await shengChengFuPan(dangAnId) : await huoQuFuPan(dangAnId)
      if (shuJu.fu_pan_zhuang_tai === 复盘状态.未生成) shuJu = await shengChengFuPan(dangAnId)
      for (let ci = 0; ci < 20 && fuPanQingQiuId === benCiId && shuJu.fu_pan_zhuang_tai === 复盘状态.生成中 && shuJu.jia_zai_zhong; ci++) {
        await new Promise((jieJue) => setTimeout(jieJue, 3000))
        if (fuPanQingQiuId !== benCiId) return
        shuJu = await huoQuFuPan(dangAnId)
      }
      if (fuPanQingQiuId !== benCiId) return
      fuPanShiBai.value = shuJu.fu_pan_zhuang_tai === 复盘状态.生成失败
      if (shuJu.fu_pan_zhuang_tai === 复盘状态.无聊天记录) {
        yingYongWuLiaoTianJiLu()
        return
      }
      fuPanDuan.value = Array.isArray(shuJu.fu_pan_duan) ? shuJu.fu_pan_duan : []
      fuPanFenZu.value = Array.isArray(shuJu.fu_pan_fen_zu)
        ? shuJu.fu_pan_fen_zu
        : fuPanDuan.value.length > 0
          ? [{ id: 'zu-1', fan_wei: { qi: 1, zhi: fuPanDuan.value.length }, duan_lie_biao: fuPanDuan.value, mo_ren_zhan_kai: true }]
          : []
      fuPanZongDuanShu.value = shuJu.fu_pan_zong_duan_shu ?? fuPanDuan.value.length
      fuPanYouGengDuo.value = shuJu.fu_pan_hai_you_geng_duo === true
      if (shuJu.fu_pan_zhuang_tai === 复盘状态.已完成 && shuJu.fu_pan_nei_rong) {
        fuPanPiZhu.value = shuJu.fu_pan_pi_zhu
        fuPanZongJie.value = shuJu.fu_pan_nei_rong
      }
    } catch {
      fuPanShiBai.value = true
    } finally {
      if (fuPanQingQiuId === benCiId) fuPanJiaZaiZhong.value = false
    }
  }

  async function chongShiFuPan() {
    if (!fuPanDangAnId.value) return
    await jiaZaiFuPanShuJu(fuPanDangAnId.value, true)
  }

  function zhanKaiQuanBu() {
    zhanKaiQuanBuFenZu.value = true
  }

  function tuiChuFuPan() {
    fuPanMoShi.value = false
    fuPanPiZhu.value = null
    fuPanZongJie.value = null
    fuPanJiaZaiZhong.value = false
    fuPanWuLiaoTianJiLu.value = false
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
    fuPanWuLiaoTianJiLu,
    fuPanDangAnId,
    xiaoXiDaoXuHaoMap,
    piZhuMap,
    huoQuPiZhuByXiaoXiId,
    huoQuQingGanLeiXing,
    fuPanZongJieFenKuai,
    jiaZaiFuPanShuJu,
    fuPanShiBai,
    fuPanDuan,
    keJianPiZhu,
    yinCangZuShu,
    haiYouGengDuo,
    zongDuanShu,
    zhanKaiPiZhuFenZu,
    zhanKaiQuanBu,
    chongShiFuPan,
    tuiChuFuPan,
  }
}
