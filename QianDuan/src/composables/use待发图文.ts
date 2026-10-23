import { computed, ref, watch, type Ref } from 'vue'
import type { XiaoXiKuaiLeiXing } from '@/types/类型定义'
import { panDingKuaiChaoXian, XIAO_XI_KUAI_LEI_XING } from '@/utils/消息内容块'
import { queDingMiDengJian } from '@/utils/发件箱'

export interface DaiFaKuai {
  id: string
  lei_xing: XiaoXiKuaiLeiXing
  nei_rong: string
  wen_jian: File | Blob | null
  mei_ti_id: string | null
  mei_ti_lei_bie: string | null
  yu_lan_url: string | null
  mi_deng_jian: string
}

export interface DaiFaGuangBiao {
  kuaiId: string
  pianYi: number
}

export interface BianJiQiDuan {
  leiXing: 'wenzi' | 'tupian'
  kuaiId: string
  neiRong?: string
}

export interface Use待发图文依赖 {
  shuRuNeiRong: Ref<string>
  chuangJianYuLan?: (wenJian: File | Blob) => string | null
  huiShouYuLan?: (diZhi: string | null) => void
  shengChengJian?: () => string
}

interface ChaRuJieGuo {
  chengGong: boolean
  yuanYin: '' | 'chao_xian'
  kuaiId: string
  guangBiao: DaiFaGuangBiao
}

function moRenJian(): string {
  return `kuai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function qiaJia(zhi: number, shangXian: number): number {
  if (typeof zhi !== 'number' || !Number.isFinite(zhi) || zhi < 0) return 0
  return Math.min(zhi, shangXian)
}

export function use待发图文(yiLai: Use待发图文依赖) {
  const kuaiLieBiao = ref<DaiFaKuai[]>([])
  const guangBiao = ref<DaiFaGuangBiao>({ kuaiId: '', pianYi: 0 })
  let biaoHao = 0

  function xinJianId(): string {
    biaoHao += 1
    return yiLai.shengChengJian ? yiLai.shengChengJian() : `${moRenJian()}-${biaoHao}`
  }

  function wenZiKuai(neiRong: string): DaiFaKuai {
    const kuai: DaiFaKuai = {
      id: xinJianId(),
      lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi,
      nei_rong: neiRong,
      wen_jian: null,
      mei_ti_id: null,
      mei_ti_lei_bie: null,
      yu_lan_url: null,
      mi_deng_jian: '',
    }
    queDingMiDengJian(kuai)
    return kuai
  }

  function huoQuKuai(id: string): DaiFaKuai | undefined {
    return kuaiLieBiao.value.find((xiang) => xiang.id === id)
  }

  function huoQuXiaBiao(id: string): number {
    return kuaiLieBiao.value.findIndex((xiang) => xiang.id === id)
  }

  function shiWenZiKuai(kuai: DaiFaKuai | undefined | null): kuai is DaiFaKuai {
    return !!kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi
  }

  function shiTuPianKuai(kuai: DaiFaKuai): boolean {
    return kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian
  }

  function luoXieKuaiXuLie(lieBiao: DaiFaKuai[]): void {
    const muBiao = kuaiLieBiao.value
    muBiao.length = 0
    for (const xiang of lieBiao) muBiao.push(xiang)
  }

  function xieGuangBiao(weiZhi: DaiFaGuangBiao): void {
    guangBiao.value.kuaiId = weiZhi.kuaiId
    guangBiao.value.pianYi = weiZhi.pianYi
  }

  function touYingWenBen(): string {
    return kuaiLieBiao.value.reduce((he, xiang) => (shiWenZiKuai(xiang) ? he + xiang.nei_rong : he), '')
  }

  function baoChiTouYing(): void {
    if (kuaiLieBiao.value.length === 0) return
    const zhi = touYingWenBen()
    if (yiLai.shuRuNeiRong.value !== zhi) yiLai.shuRuNeiRong.value = zhi
  }

  function moWeiWenZiKuai(): DaiFaKuai | null {
    for (let xiaBiao = kuaiLieBiao.value.length - 1; xiaBiao >= 0; xiaBiao--) {
      if (shiWenZiKuai(kuaiLieBiao.value[xiaBiao])) return kuaiLieBiao.value[xiaBiao]
    }
    return null
  }

  function guangBiaoDaoJueDuiPianYi(weiZhi: DaiFaGuangBiao, wenBen: string): number {
    if (weiZhi.kuaiId === '') return qiaJia(weiZhi.pianYi, wenBen.length)
    let jiLei = 0
    for (const xiang of kuaiLieBiao.value) {
      if (!shiWenZiKuai(xiang)) continue
      if (xiang.id === weiZhi.kuaiId) return jiLei + qiaJia(weiZhi.pianYi, xiang.nei_rong.length)
      jiLei += xiang.nei_rong.length
    }
    return jiLei
  }

  function bingLianXuWenZiKuai(lieBiao: DaiFaKuai[]): DaiFaKuai[] {
    const paiSheng: DaiFaKuai[] = []
    for (const xiang of lieBiao) {
      const qian = paiSheng[paiSheng.length - 1]
      if (shiWenZiKuai(xiang) && shiWenZiKuai(qian)) {
        qian.nei_rong = `${qian.nei_rong}${xiang.nei_rong}`
        continue
      }
      paiSheng.push(xiang)
    }
    return paiSheng
  }

  function shouLiuChunWenBenTai(): boolean {
    if (kuaiLieBiao.value.some((xiang) => shiTuPianKuai(xiang))) return false
    const wenBen = touYingWenBen()
    const jueDui = qiaJia(guangBiaoDaoJueDuiPianYi(guangBiao.value, wenBen), wenBen.length)
    luoXieKuaiXuLie([])
    xieGuangBiao({ kuaiId: '', pianYi: jueDui })
    if (yiLai.shuRuNeiRong.value !== wenBen) yiLai.shuRuNeiRong.value = wenBen
    return true
  }

  function chaRuTuPian(
    wenJian: File | Blob,
    meiTiLeiBie: string | null = null,
    weiZhi?: DaiFaGuangBiao | null,
  ): ChaRuJieGuo {
    const yuLan = yiLai.chuangJianYuLan ? yiLai.chuangJianYuLan(wenJian) : null
    const tuKuai: DaiFaKuai = {
      id: xinJianId(),
      lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
      nei_rong: '',
      wen_jian: wenJian,
      mei_ti_id: null,
      mei_ti_lei_bie: meiTiLeiBie,
      yu_lan_url: yuLan,
      mi_deng_jian: '',
    }
    queDingMiDengJian(tuKuai)
    const dangQian = weiZhi ?? guangBiao.value
    let hou: DaiFaGuangBiao
    if (kuaiLieBiao.value.length === 0) {
      const yuanWen = yiLai.shuRuNeiRong.value
      const pian = qiaJia(dangQian.kuaiId === '' ? dangQian.pianYi : yuanWen.length, yuanWen.length)
      const qianKuai = pian === 0 ? null : wenZiKuai(yuanWen.slice(0, pian))
      const houKuai = wenZiKuai(yuanWen.slice(pian))
      luoXieKuaiXuLie(qianKuai ? [qianKuai, tuKuai, houKuai] : [tuKuai, houKuai])
      hou = { kuaiId: houKuai.id, pianYi: 0 }
    } else {
      const kuai = dangQian.kuaiId === '' ? null : huoQuKuai(dangQian.kuaiId)
      if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
        const pian = qiaJia(dangQian.pianYi, kuai.nei_rong.length)
        const xinWen = wenZiKuai(kuai.nei_rong.slice(pian))
        kuai.nei_rong = kuai.nei_rong.slice(0, pian)
        const xiaBiao = huoQuXiaBiao(kuai.id)
        const xinXu: DaiFaKuai[] = []
        for (let suoYin = 0; suoYin < kuaiLieBiao.value.length; suoYin++) {
          xinXu.push(kuaiLieBiao.value[suoYin])
          if (suoYin === xiaBiao) xinXu.push(tuKuai, xinWen)
        }
        luoXieKuaiXuLie(xinXu)
        hou = { kuaiId: xinWen.id, pianYi: 0 }
      } else if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
        const chaWei = dangQian.pianYi > 0 ? huoQuXiaBiao(kuai.id) + 1 : huoQuXiaBiao(kuai.id)
        const QianDuan = kuaiLieBiao.value.slice(0, chaWei)
        const HouDuan = kuaiLieBiao.value.slice(chaWei)
        const jie: DaiFaKuai[] = [...QianDuan, tuKuai]
        const jieShou = HouDuan.length > 0 && shiWenZiKuai(HouDuan[0]) ? (HouDuan[0] as DaiFaKuai) : null
        const xinWen = jieShou ?? wenZiKuai('')
        if (!jieShou) jie.push(xinWen)
        jie.push(...HouDuan)
        luoXieKuaiXuLie(jie)
        hou = { kuaiId: xinWen.id, pianYi: 0 }
      } else {
        const xinWen = wenZiKuai('')
        luoXieKuaiXuLie([...kuaiLieBiao.value, tuKuai, xinWen])
        hou = { kuaiId: xinWen.id, pianYi: 0 }
      }
    }
    xieGuangBiao(hou)
    baoChiTouYing()
    return {
      chengGong: true,
      kuaiId: tuKuai.id,
      yuanYin: chaoXianYuJian() ? 'chao_xian' : '',
      guangBiao: hou,
    }
  }

  function chaRuWenZi(wenBen: string, weiZhi?: DaiFaGuangBiao | null): boolean {
    if (wenBen === '') return false
    const dangQian = weiZhi ?? guangBiao.value
    if (kuaiLieBiao.value.length === 0) {
      const yuanWen = yiLai.shuRuNeiRong.value
      const pian = qiaJia(dangQian.pianYi, yuanWen.length)
      yiLai.shuRuNeiRong.value = `${yuanWen.slice(0, pian)}${wenBen}${yuanWen.slice(pian)}`
      xieGuangBiao({ kuaiId: '', pianYi: pian + wenBen.length })
      return true
    }
    const kuai = dangQian.kuaiId === '' ? null : huoQuKuai(dangQian.kuaiId)
    if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
      const pian = qiaJia(dangQian.pianYi, kuai.nei_rong.length)
      kuai.nei_rong = `${kuai.nei_rong.slice(0, pian)}${wenBen}${kuai.nei_rong.slice(pian)}`
      xieGuangBiao({ kuaiId: kuai.id, pianYi: pian + wenBen.length })
    } else if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      const chaWei = dangQian.pianYi > 0 ? huoQuXiaBiao(kuai.id) + 1 : huoQuXiaBiao(kuai.id)
      const zuoLin = kuaiLieBiao.value[chaWei - 1]
      if (dangQian.pianYi === 0 && shiWenZiKuai(zuoLin)) {
        zuoLin.nei_rong += wenBen
        xieGuangBiao({ kuaiId: zuoLin.id, pianYi: zuoLin.nei_rong.length })
      } else {
        const xin = wenZiKuai(wenBen)
        luoXieKuaiXuLie([
          ...kuaiLieBiao.value.slice(0, chaWei),
          xin,
          ...kuaiLieBiao.value.slice(chaWei),
        ])
        xieGuangBiao({ kuaiId: xin.id, pianYi: wenBen.length })
      }
    } else {
      const moWei = moWeiWenZiKuai()
      if (moWei) {
        moWei.nei_rong += wenBen
        xieGuangBiao({ kuaiId: moWei.id, pianYi: moWei.nei_rong.length })
      } else {
        const xin = wenZiKuai(wenBen)
        luoXieKuaiXuLie([...kuaiLieBiao.value, xin])
        xieGuangBiao({ kuaiId: xin.id, pianYi: wenBen.length })
      }
    }
    baoChiTouYing()
    return true
  }

  function gengXinGuangBiao(weiZhi: DaiFaGuangBiao): void {
    xieGuangBiao({ kuaiId: weiZhi.kuaiId, pianYi: qiaJia(weiZhi.pianYi, Number.MAX_SAFE_INTEGER) })
  }

  function tongBuCongBianJiQi(duan: BianJiQiDuan[], xianShiXuanRanIds?: string[]): void {
    const zaiDu = new Set<string>()
    for (const xiang of duan) zaiDu.add(xiang.kuaiId)
    const xuanRanJi = new Set(xianShiXuanRanIds ?? kuaiLieBiao.value.map((xiang) => xiang.id))
    const xianZhuang = [...kuaiLieBiao.value]
    const buHuiRou: Array<{ xiaBiao: number; kuai: DaiFaKuai }> = []
    for (let xiaBiao = 0; xiaBiao < xianZhuang.length; xiaBiao++) {
      const xiang = xianZhuang[xiaBiao]
      if (!shiTuPianKuai(xiang) || zaiDu.has(xiang.id)) continue
      if (!xuanRanJi.has(xiang.id)) {
        buHuiRou.push({ xiaBiao, kuai: xiang })
        continue
      }
      if (xiang.yu_lan_url) yiLai.huiShouYuLan?.(xiang.yu_lan_url)
    }
    const zhengHe: DaiFaKuai[] = []
    for (const xiang of duan) {
      if (xiang.leiXing === 'tupian') {
        const yuan = huoQuKuai(xiang.kuaiId)
        if (yuan && shiTuPianKuai(yuan)) zhengHe.push(yuan)
        continue
      }
      const wenBen = xiang.neiRong ?? ''
      const qian = zhengHe[zhengHe.length - 1]
      if (shiWenZiKuai(qian)) {
        qian.nei_rong = `${qian.nei_rong}${wenBen}`
        continue
      }
      const yuan = xiang.kuaiId === '' ? undefined : huoQuKuai(xiang.kuaiId)
      if (shiWenZiKuai(yuan)) zhengHe.push({ ...yuan, nei_rong: wenBen })
      else if (wenBen !== '') zhengHe.push(wenZiKuai(wenBen))
    }
    luoXieKuaiXuLie(bingLianXuWenZiKuai(buHuiRouZhiHui(zhengHe, buHuiRou)))
    if (shouLiuChunWenBenTai()) return
    baoChiTouYing()
  }

  function buHuiRouZhiHui(zhengHe: DaiFaKuai[], buHuiRou: Array<{ xiaBiao: number; kuai: DaiFaKuai }>): DaiFaKuai[] {
    if (buHuiRou.length === 0) return zhengHe
    const jieGuo = [...zhengHe]
    for (const xiang of buHuiRou) jieGuo.splice(Math.min(jieGuo.length, xiang.xiaBiao), 0, xiang.kuai)
    return jieGuo
  }

  function daiHuanKuaiWenJian(id: string, wenJian: File | Blob): boolean {
    const xiang = huoQuKuai(id)
    if (!xiang || !shiTuPianKuai(xiang)) return false
    xiang.wen_jian = wenJian
    return true
  }

  const zaiTuYaSuo = new Set<Promise<unknown>>()

  function dengJiYaSuo(chengGuo: Promise<unknown>): void {
    zaiTuYaSuo.add(chengGuo)
    const yiWanCheng = () => {
      zaiTuYaSuo.delete(chengGuo)
    }
    void chengGuo.then(yiWanCheng, yiWanCheng)
  }

  async function dengDaiYaSuoWanCheng(): Promise<void> {
    while (zaiTuYaSuo.size > 0) await Promise.allSettled([...zaiTuYaSuo])
  }

  function shanChuKuai(id: string): void {
    const xiaBiao = huoQuXiaBiao(id)
    if (xiaBiao === -1) return
    const xiang = kuaiLieBiao.value[xiaBiao]
    yiLai.huiShouYuLan?.(xiang.yu_lan_url)
    const xinXu = kuaiLieBiao.value.filter((_, suoYin) => suoYin !== xiaBiao)
    luoXieKuaiXuLie(bingLianXuWenZiKuai(xinXu))
    if (guangBiao.value.kuaiId === id) xieGuangBiao({ kuaiId: '', pianYi: 0 })
    if (shouLiuChunWenBenTai()) return
    baoChiTouYing()
  }

  function yiDongKuai(fromId: string, daoXiaBiao: number): boolean {
    const cong = huoQuXiaBiao(fromId)
    if (cong === -1) return false
    const muBiao = Math.max(0, Math.min(daoXiaBiao, kuaiLieBiao.value.length - 1))
    if (muBiao === cong) return true
    const xuLie = [...kuaiLieBiao.value]
    const [yiDong] = xuLie.splice(cong, 1)
    xuLie.splice(muBiao, 0, yiDong)
    luoXieKuaiXuLie(bingLianXuWenZiKuai(xuLie))
    baoChiTouYing()
    return true
  }

  function daiFaKuaiLieBiao(): DaiFaKuai[] {
    return kuaiLieBiao.value
      .filter((xiang) => shiTuPianKuai(xiang) || (xiang.nei_rong ?? '').trim() !== '')
      .map((xiang) => ({ ...xiang }))
  }

  function chaoXianYuJian(): boolean {
    return panDingKuaiChaoXian(
      kuaiLieBiao.value.map((xiang) => ({
        lei_xing: xiang.lei_xing,
        nei_rong: xiang.nei_rong,
        mei_ti_id: xiang.mei_ti_id,
      })),
    ).chaoXian
  }

  function qingKong(): void {
    for (const xiang of kuaiLieBiao.value) yiLai.huiShouYuLan?.(xiang.yu_lan_url)
    luoXieKuaiXuLie([])
    xieGuangBiao({ kuaiId: '', pianYi: 0 })
    yiLai.shuRuNeiRong.value = ''
  }

  function meiTiShangChuanWanCheng(id: string, meiTiId: string): void {
    const xiang = huoQuKuai(id)
    if (!xiang) return
    xiang.mei_ti_id = meiTiId
    xiang.wen_jian = null
  }

  watch(
    () => yiLai.shuRuNeiRong.value,
    (zhi) => {
      if (kuaiLieBiao.value.length === 0) return
      const xianZai = touYingWenBen()
      if (zhi === xianZai) return
      if (zhi.length > xianZai.length && zhi.startsWith(xianZai)) {
        const moWei = moWeiWenZiKuai()
        chaRuWenZi(
          zhi.slice(xianZai.length),
          moWei ? { kuaiId: moWei.id, pianYi: moWei.nei_rong.length } : null,
        )
        return
      }
      const tuKuai = kuaiLieBiao.value.filter((xiang) => shiTuPianKuai(xiang))
      luoXieKuaiXuLie(zhi === '' ? [] : [wenZiKuai(zhi), ...tuKuai])
      if (zhi === '') {
        yiLai.shuRuNeiRong.value = ''
        xieGuangBiao({ kuaiId: '', pianYi: 0 })
        return
      }
      baoChiTouYing()
    },
  )

  const youTuPianKuai = computed(() => kuaiLieBiao.value.some((xiang) => shiTuPianKuai(xiang)))
  const tuPianShu = computed(() => kuaiLieBiao.value.filter((xiang) => shiTuPianKuai(xiang)).length)

  return {
    kuaiLieBiao,
    guangBiao,
    youTuPianKuai,
    tuPianShu,
    chaRuTuPian,
    chaRuWenZi,
    gengXinGuangBiao,
    tongBuCongBianJiQi,
    daiHuanKuaiWenJian,
    dengJiYaSuo,
    dengDaiYaSuoWanCheng,
    shanChuKuai,
    yiDongKuai,
    daiFaKuaiLieBiao,
    chaoXianYuJian,
    qingKong,
    meiTiShangChuanWanCheng,
    touYingWenBen,
  }
}

export type DaiFaTuWen = ReturnType<typeof use待发图文>
