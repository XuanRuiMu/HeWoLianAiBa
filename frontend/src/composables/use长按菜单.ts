import { ref, type Ref } from 'vue'
import { XIAO_XI_PEI_ZHI, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'
import type { YuYinCaiDanXiang, WenBenCaiDanXiang } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import type { 消息 } from '@/types'

interface Use长按菜单依赖 {
  dangQianShiJian: Ref<number>
  cheHuiXiaoXi: (xiaoXiId: string) => Promise<void>
  qieHuanYuYinZhuanWenZi?: (xiaoXi: 消息) => Promise<void>
  fuZhiWenBen?: (wenBen: string) => Promise<boolean>
  fanYiQingQiu?: (wenBen: string, yuanYu?: string, muBiaoYu?: string) => Promise<string>
  sheZhiCuoWu?: (xinXi: string) => void
}

function shiYuYinXiaoXi(xiaoXi: 消息): boolean {
  return xiaoXi.lei_xing === 'yuYin' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
}

function shiWenBenXiaoXi(xiaoXi: 消息): boolean {
  return xiaoXi.lei_xing === 'wenben' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
}

function wenBenJian(xiaoXi: 消息): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

async function moRenFuZhi(wenBen: string): Promise<boolean> {
  try {
    const daoHang = globalThis.navigator as Navigator & {
      clipboard?: { writeText: (wenBen: string) => Promise<void> }
    }
    if (daoHang?.clipboard?.writeText) {
      await daoHang.clipboard.writeText(wenBen)
      return true
    }
    if (typeof document !== 'undefined') {
      const wenBenYu = document.createElement('textarea')
      wenBenYu.value = wenBen
      wenBenYu.style.position = 'fixed'
      wenBenYu.style.opacity = '0'
      document.body.appendChild(wenBenYu)
      wenBenYu.select()
      const jieGuo = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
      document.body.removeChild(wenBenYu)
      return !!jieGuo
    }
    return false
  } catch {
    return false
  }
}

export function use长按菜单(yiLai: Use长按菜单依赖) {
  const cheHuiCaiDanZhanKai = ref(false)
  const cheHuiCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongXiaoXi = ref<消息 | null>(null)
  const yuYinCaiDanZhanKai = ref(false)
  const yuYinCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongYuYin = ref<消息 | null>(null)
  const yinYongXiaoXi = ref<消息 | null>(null)
  const wenBenCaiDanZhanKai = ref(false)
  const wenBenCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongWenBen = ref<消息 | null>(null)
  const fanYiJieGuoJiLu = ref(new Map<string, string>())
  const fanYiZhongJiHe = ref(new Set<string>())
  const fanYiZhanKaiJiHe = ref(new Set<string>())
  const fanYiYuanYu = ref('auto')
  const fanYiMuBiaoYu = ref('zh')
  let changAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let yuYinChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let wenBenChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null

  function daKaiCaiDan(xiaoXi: 消息, shiJian: MouseEvent) {
    if (shiYuYinXiaoXi(xiaoXi)) return
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
    if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
    xuanZhongXiaoXi.value = xiaoXi
    cheHuiCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    cheHuiCaiDanZhanKai.value = true
  }

  function chuMoKaiShi(xiaoXi: 消息) {
    if (shiYuYinXiaoXi(xiaoXi)) return
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
    if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
    changAnDingShiQi = setTimeout(() => {
      xuanZhongXiaoXi.value = xiaoXi
      cheHuiCaiDanZhanKai.value = true
    }, 500)
  }

  function chuMoJieShu() {
    if (changAnDingShiQi) {
      clearTimeout(changAnDingShiQi)
      changAnDingShiQi = null
    }
  }

  function daKaiYuYinCaiDan(xiaoXi: 消息, shiJian: MouseEvent) {
    if (!shiYuYinXiaoXi(xiaoXi)) return
    xuanZhongYuYin.value = xiaoXi
    yuYinCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    yuYinCaiDanZhanKai.value = true
  }

  function chuMoKaiShiYuYin(xiaoXi: 消息) {
    if (!shiYuYinXiaoXi(xiaoXi)) return
    yuYinChangAnDingShiQi = setTimeout(() => {
      xuanZhongYuYin.value = xiaoXi
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

  function huoQuYuYinCaiDanXiang(): YuYinCaiDanXiang[] {
    return [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang]
  }

  async function zhiXingYuYinCaiDanXiang(xiang: YuYinCaiDanXiang) {
    const muBiao = xuanZhongYuYin.value
    guanBiYuYinCaiDan()
    if (!muBiao) return
    if (xiang === 'yinYong') {
      yinYongXiaoXi.value = muBiao
      return
    }
    await yiLai.qieHuanYuYinZhuanWenZi?.(muBiao)
  }

  function daKaiWenBenCaiDan(xiaoXi: 消息, shiJian: MouseEvent) {
    if (!shiWenBenXiaoXi(xiaoXi)) return
    xuanZhongWenBen.value = xiaoXi
    wenBenCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    wenBenCaiDanZhanKai.value = true
  }

  function chuMoKaiShiWenBen(xiaoXi: 消息) {
    if (!shiWenBenXiaoXi(xiaoXi)) return
    wenBenChangAnDingShiQi = setTimeout(() => {
      xuanZhongWenBen.value = xiaoXi
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

  function keXianShiWenBenCheHui(xiaoXi: 消息): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  function huoQuWenBenCaiDanXiang(xiaoXi?: 消息): WenBenCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongWenBen.value
    const quanBu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang]
    if (!muBiao) return quanBu
    if (keXianShiWenBenCheHui(muBiao)) return quanBu
    return quanBu.filter((xiang) => xiang !== 'cheHui')
  }

  function huoQuFanYiJieGuo(xiaoXi: 消息): string | undefined {
    return fanYiJieGuoJiLu.value.get(wenBenJian(xiaoXi))
  }

  function shiFanYiZhong(xiaoXi: 消息): boolean {
    return fanYiZhongJiHe.value.has(wenBenJian(xiaoXi))
  }

  function shiFanYiZhanKai(xiaoXi: 消息): boolean {
    return fanYiZhanKaiJiHe.value.has(wenBenJian(xiaoXi))
  }

  async function qiangZhiFanYi(xiaoXi: 消息): Promise<string | null> {
    const jian = wenBenJian(xiaoXi)
    fanYiJieGuoJiLu.value.delete(jian)
    fanYiZhanKaiJiHe.value.delete(jian)
    return qingQiuWenBenFanYi(xiaoXi)
  }

  async function qingQiuWenBenFanYi(xiaoXi: 消息): Promise<string | null> {
    const jian = wenBenJian(xiaoXi)
    if (fanYiZhanKaiJiHe.value.has(jian)) {
      fanYiZhanKaiJiHe.value.delete(jian)
      return fanYiJieGuoJiLu.value.get(jian) ?? null
    }
    const yiCun = fanYiJieGuoJiLu.value.get(jian)
    if (yiCun) {
      fanYiZhanKaiJiHe.value.add(jian)
      return yiCun
    }
    if (fanYiZhongJiHe.value.has(jian)) return null
    const yuanWen = (xiaoXi.nei_rong || '').trim()
    if (!yuanWen) {
      yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
      return null
    }
    fanYiZhongJiHe.value.add(jian)
    try {
      if (!yiLai.fanYiQingQiu) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
        return null
      }
      const jieGuo = await yiLai.fanYiQingQiu(yuanWen, fanYiYuanYu.value, fanYiMuBiaoYu.value)
      const qingLi = (jieGuo || '').trim()
      if (!qingLi) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
        return null
      }
      fanYiJieGuoJiLu.value.set(jian, qingLi)
      fanYiZhanKaiJiHe.value.add(jian)
      return qingLi
    } catch {
      yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
      return null
    } finally {
      fanYiZhongJiHe.value.delete(jian)
    }
  }

  async function zhiXingWenBenCaiDanXiang(xiang: WenBenCaiDanXiang) {
    const muBiao = xuanZhongWenBen.value
    guanBiWenBenCaiDan()
    if (!muBiao) return
    if (xiang === 'yinYong') {
      yinYongXiaoXi.value = muBiao
      return
    }
    if (xiang === 'cheHui') {
      await yiLai.cheHuiXiaoXi(muBiao.id)
      return
    }
    if (xiang === 'fuZhi') {
      const fuZhiHanShu = yiLai.fuZhiWenBen ?? moRenFuZhi
      const chengGong = await fuZhiHanShu(muBiao.nei_rong || '')
      if (!chengGong) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
      }
      return
    }
    await qingQiuWenBenFanYi(muBiao)
  }

  function sheZhiYinYong(xiaoXi: 消息) {
    yinYongXiaoXi.value = xiaoXi
    guanBiYuYinCaiDan()
    guanBiWenBenCaiDan()
  }

  function quXiaoYinYong() {
    yinYongXiaoXi.value = null
  }

  function huoQuYinYongZhaiYao(xiaoXi: 消息): string {
    if (xiaoXi.lei_xing === 'yuYin') return huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei')
    const neiRong = xiaoXi.nei_rong || ''
    const shangXian = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu
    if (neiRong.length <= shangXian) return neiRong
    return `${neiRong.slice(0, shangXian)}...`
  }

  async function zhiXingCheHui() {
    cheHuiCaiDanZhanKai.value = false
    if (!xuanZhongXiaoXi.value) return
    await yiLai.cheHuiXiaoXi(xuanZhongXiaoXi.value.id)
    xuanZhongXiaoXi.value = null
  }

  function xianShiCheHuiAnNiu(xiaoXi: 消息): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  async function zhiXingCheHuiXiaoXi(xiaoXi: 消息) {
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
    huoQuFanYiJieGuo,
    shiFanYiZhong,
    shiFanYiZhanKai,
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
