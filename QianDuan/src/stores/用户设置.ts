import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { huoQuYongHuSheZhi, baoCunLiaoTianBeiJing, baoCunQiPao, baoCunYinSiSheZhi, qingKongPaiWeiShuJu } from '@/api/社交'
import { shiHeFaKeJianXing, type KeJianXing } from '@/api/资料'
import { 使用主题仓库, 浅色值 } from '@/stores/主题'
import {
  QI_PAO_ZI_JI_MO_REN,
  QI_PAO_AI_MO_REN,
  guiYiHuaQiPao,
  huoQuQiPaoCSSBianLiang,
  shiHeFaQiPao,
  type QiPaoYuShe,
} from '@/config/气泡主题'
import { huoQuFanYi } from '@/config/翻译表'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

export const LIAO_TIAN_BEI_JING_XUAN_XIANG = ['moRen', 'miWuSenLin', 'haiYangZhiLan', 'fenSeMengJing', 'yeKongXingHe', 'miSeTianYuan', 'chenWuQing', 'muZiXingYe'] as const

export type LiaoTianBeiJing = string

export const BEI_JING_URL_ZUI_DA_CHANG_DU = 2000

export const ZI_DING_YI_BEI_JING_JIAN = 'lian-ai-ba-zi-ding-yi-bei-jing-cao'
export const ZI_DING_YI_BEI_JING_CAO_SHU = 3

export interface ZiDingYiBeiJingCao {
  tuDiZhi: string
  bieMing: string
}

export function shiZiDingYiBeiJingCao(zhi: unknown): zhi is ZiDingYiBeiJingCao {
  if (!zhi || typeof zhi !== 'object') return false
  const houXuan = zhi as Record<string, unknown>
  if (typeof houXuan.tuDiZhi !== 'string' || !shiZiDingYiBeiJingURL(houXuan.tuDiZhi)) return false
  return typeof houXuan.bieMing === 'string'
}

export function duQuZiDingYiBeiJingCao(): Array<ZiDingYiBeiJingCao | null> {
  const moRen: Array<ZiDingYiBeiJingCao | null> = [null, null, null]
  try {
    const yuanShi = localStorage.getItem(ZI_DING_YI_BEI_JING_JIAN)
    if (!yuanShi) return moRen
    const jieXi = JSON.parse(yuanShi) as unknown
    if (!Array.isArray(jieXi)) return moRen
    for (let i = 0; i < ZI_DING_YI_BEI_JING_CAO_SHU; i++) {
      const houXuan = jieXi[i] as unknown
      moRen[i] = shiZiDingYiBeiJingCao(houXuan) ? (houXuan as ZiDingYiBeiJingCao) : null
    }
    return moRen
  } catch {
    return moRen
  }
}

export function xieRuZiDingYiBeiJingCao(cao: Array<ZiDingYiBeiJingCao | null>): void {
  localStorage.setItem(ZI_DING_YI_BEI_JING_JIAN, JSON.stringify(cao.slice(0, ZI_DING_YI_BEI_JING_CAO_SHU)))
}

export const ZI_DING_YI_QI_PAO_JIAN = 'lian-ai-ba-zi-ding-yi-qi-pao'

export const QI_PAO_MING_CHENG_ZUI_DA_ZI_FU = 12

export interface ZiDingYiQiPao {
  mingCheng: string
  tuDiZhi: string
}

export function shiZiDingYiQiPao(zhi: unknown): zhi is ZiDingYiQiPao {
  if (!zhi || typeof zhi !== 'object') return false
  const houXuan = zhi as Record<string, unknown>
  if (typeof houXuan.mingCheng !== 'string' || !houXuan.mingCheng.trim()) return false
  if (Array.from(houXuan.mingCheng.trim()).length > QI_PAO_MING_CHENG_ZUI_DA_ZI_FU) return false
  return shiZiDingYiBeiJingURL(houXuan.tuDiZhi)
}

export function duQuZiDingYiQiPao(): ZiDingYiQiPao | null {
  try {
    const yuanShi = localStorage.getItem(ZI_DING_YI_QI_PAO_JIAN)
    if (!yuanShi) return null
    const jieXi = JSON.parse(yuanShi) as unknown
    return shiZiDingYiQiPao(jieXi) ? (jieXi as ZiDingYiQiPao) : null
  } catch {
    return null
  }
}

export function xieRuZiDingYiQiPao(qiPao: ZiDingYiQiPao | null): void {
  if (!qiPao) {
    try {
      localStorage.removeItem(ZI_DING_YI_QI_PAO_JIAN)
    } catch {
      /* 忽略 */
    }
    return
  }
  localStorage.setItem(ZI_DING_YI_QI_PAO_JIAN, JSON.stringify(qiPao))
}

export function qingChuZiDingYiQiPao(): void {
  try {
    localStorage.removeItem(ZI_DING_YI_QI_PAO_JIAN)
  } catch {
    /* 忽略 */
  }
}

const MEI_TI_QIAN_MING_LU_JING = /^\/api\/媒体\/[0-9a-f]{64}(\?e=\d{1,12}&s=[0-9a-f]+)?$/
const MEI_TI_XIN_QIAN_MING_LU_JING =
  /^\/api\/媒体\/[0-9a-f]{64}\?e=\d{1,12}&u=[0-9a-f-]{36}&t=\d{1,15}&s=[0-9a-f]+$/i

export function shiYuSheBeiJing(zhi: unknown): boolean {
  return typeof zhi === 'string' && (LIAO_TIAN_BEI_JING_XUAN_XIANG as readonly string[]).includes(zhi)
}

export function shiZiDingYiBeiJingURL(zhi: unknown): boolean {
  if (typeof zhi !== 'string') return false
  const qingLi = zhi.trim()
  if (!qingLi || qingLi.length > BEI_JING_URL_ZUI_DA_CHANG_DU) return false
  if (qingLi.startsWith('/')) {
    return MEI_TI_QIAN_MING_LU_JING.test(qingLi) || MEI_TI_XIN_QIAN_MING_LU_JING.test(qingLi)
  }
  let jieXi: URL
  try {
    jieXi = new URL(qingLi)
  } catch {
    return false
  }
  return jieXi.protocol === 'https:'
}

export function huoQuBeiJingNeiLianYangShi(beiJing: string): Record<string, string> {
  if (!shiZiDingYiBeiJingURL(beiJing)) return {}
  const anQuanURL = beiJing.trim().replace(/["\\\n\r]/g, '')
  return {
    backgroundImage: `url("${anQuanURL}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

export const 使用用户设置仓库 = defineStore('用户设置', () => {
  const yongHuBianHao = ref('')
  const shouJiHao = ref('')
  const touXiang = ref<string | null>(null)
  const qianMing = ref<string | null>(null)
  const qianMingKeJianXing = ref<KeJianXing>('gong_kai')
  const qianMingBaiMingDan = ref<string[]>([])
  const liaoTianBeiJingQian = ref<string>('moRen')
  const liaoTianBeiJingShen = ref<string>('moRen')
  const ziDingYiBeiJingBieMing = ref('')
  const ziDingYiBeiJingCao = ref<Array<ZiDingYiBeiJingCao | null>>(duQuZiDingYiBeiJingCao())
  const ziDingYiQiPao = ref<ZiDingYiQiPao | null>(null)
  const qiPaoZiJi = ref<QiPaoYuShe>(QI_PAO_ZI_JI_MO_REN)
  const qiPaoAI = ref<QiPaoYuShe>(QI_PAO_AI_MO_REN)
  const gongKaiZhangHao = ref(true)
  const gongKaiShouJiHao = ref(false)
  const gongKaiYouXiang = ref(false)
  const bangDingYouXiang = ref('')
  const yiJiaZai = ref(false)
  const caoZuoCuoWu = ref<QianTaiCuoWu | null>(null)
  let jiaZaiZhong: Promise<void> | null = null
  let chongShiCaoZuo: (() => unknown) | null = null

  function jiLuCuoWu(cuoWu: unknown, chongShi?: () => unknown): void {
    const zhengChangHua = 归一前台错误(cuoWu)
    if (!zhengChangHua.xianShi) return
    caoZuoCuoWu.value = zhengChangHua
    chongShiCaoZuo = chongShi || null
  }

  function qingCuoWu(): void {
    caoZuoCuoWu.value = null
    chongShiCaoZuo = null
  }

  async function chongShi(): Promise<void> {
    const daiZhi = chongShiCaoZuo
    if (!daiZhi) return
    await daiZhi()
  }

  async function jiaZai(): Promise<void> {
    if (yiJiaZai.value && !caoZuoCuoWu.value) return
    if (jiaZaiZhong) return jiaZaiZhong
    qingCuoWu()
    jiaZaiZhong = zhiXingJiaZai().finally(() => {
      jiaZaiZhong = null
    })
    return jiaZaiZhong
  }

  async function zhiXingJiaZai(): Promise<void> {
    let quXiao = false
    try {
      const sheZhi = await huoQuYongHuSheZhi()
      yongHuBianHao.value = sheZhi.uid
      shouJiHao.value = sheZhi.shou_ji_hao
      touXiang.value = sheZhi.tou_xiang
      qianMing.value = sheZhi.qian_ming
      if (shiHeFaKeJianXing(sheZhi.qian_ming_ke_jian_xing)) {
        qianMingKeJianXing.value = sheZhi.qian_ming_ke_jian_xing
      }
      qianMingBaiMingDan.value = Array.isArray(sheZhi.qian_ming_bai_ming_dan) ? sheZhi.qian_ming_bai_ming_dan : []
      const yiChanQian = typeof sheZhi.liao_tian_bei_jing_qian === 'string' && sheZhi.liao_tian_bei_jing_qian
      const yiChanShen = typeof sheZhi.liao_tian_bei_jing_shen === 'string' && sheZhi.liao_tian_bei_jing_shen
      if (yiChanQian && (shiYuSheBeiJing(yiChanQian) || shiZiDingYiBeiJingURL(yiChanQian))) liaoTianBeiJingQian.value = yiChanQian
      else if (typeof sheZhi.liao_tian_bei_jing === 'string' && (shiYuSheBeiJing(sheZhi.liao_tian_bei_jing) || shiZiDingYiBeiJingURL(sheZhi.liao_tian_bei_jing))) liaoTianBeiJingQian.value = sheZhi.liao_tian_bei_jing
      if (yiChanShen && (shiYuSheBeiJing(yiChanShen) || shiZiDingYiBeiJingURL(yiChanShen))) liaoTianBeiJingShen.value = yiChanShen
      else if (typeof sheZhi.liao_tian_bei_jing === 'string' && (shiYuSheBeiJing(sheZhi.liao_tian_bei_jing) || shiZiDingYiBeiJingURL(sheZhi.liao_tian_bei_jing))) liaoTianBeiJingShen.value = sheZhi.liao_tian_bei_jing
      qiPaoZiJi.value = guiYiHuaQiPao(sheZhi.qi_pao_zi_ji, QI_PAO_ZI_JI_MO_REN)
      qiPaoAI.value = guiYiHuaQiPao(sheZhi.qi_pao_ai, QI_PAO_AI_MO_REN)
      ziDingYiQiPao.value = duQuZiDingYiQiPao()
      gongKaiZhangHao.value = sheZhi.gong_kai_zhang_hao
      gongKaiShouJiHao.value = sheZhi.gong_kai_shou_ji_hao
      gongKaiYouXiang.value = sheZhi.gong_kai_you_xiang
      bangDingYouXiang.value = sheZhi.bang_ding_you_xiang
    } catch (cuoWu: unknown) {
      const zhengChangHua = 归一前台错误(cuoWu)
      if (!zhengChangHua.xianShi) {
        quXiao = true
        return
      }
      jiLuCuoWu(cuoWu, jiaZai)
    } finally {
      if (quXiao) yiJiaZai.value = false
      else if (!caoZuoCuoWu.value) yiJiaZai.value = true
    }
  }

  async function qieHuanBeiJing(beiJing: string, moShi?: 'qian' | 'shen'): Promise<void> {
    const 旧前 = liaoTianBeiJingQian.value
    const 旧深 = liaoTianBeiJingShen.value
    const 旧别名 = ziDingYiBeiJingBieMing.value
    const 换自定义 = shiZiDingYiBeiJingURL(beiJing)
    if (moShi === 'qian') liaoTianBeiJingQian.value = beiJing
    else if (moShi === 'shen') liaoTianBeiJingShen.value = beiJing
    else {
      liaoTianBeiJingQian.value = beiJing
      liaoTianBeiJingShen.value = beiJing
    }
    try {
      if (换自定义) ziDingYiBeiJingBieMing.value = 旧别名
      else ziDingYiBeiJingBieMing.value = ''
      await baoCunLiaoTianBeiJing(beiJing, moShi)
    } catch (cuoWu: unknown) {
      liaoTianBeiJingQian.value = 旧前
      liaoTianBeiJingShen.value = 旧深
      ziDingYiBeiJingBieMing.value = 旧别名
      jiLuCuoWu(cuoWu, () => baoCunLiaoTianBeiJing(beiJing, moShi))
    }
  }

  async function tongBuBeiJing(yuan: 'qian' | 'shen'): Promise<void> {
    const laiYuan = yuan === 'qian' ? liaoTianBeiJingQian.value : liaoTianBeiJingShen.value
    const muDi = yuan === 'qian' ? 'shen' : 'qian'
    await qieHuanBeiJing(laiYuan, muDi)
  }

  async function baoCunZiDingYiBeiJing(beiJingURL: string, bieMing?: string): Promise<void> {
    if (!shiZiDingYiBeiJingURL(beiJingURL)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    await qieHuanBeiJing(beiJingURL.trim())
    ziDingYiBeiJingBieMing.value = (bieMing ?? '').trim()
    tongBuDangQianZiDingYiDaoCao()
  }

  function tongBuDangQianZiDingYiDaoCao(): void {
    const dangQian = liaoTianBeiJing.value
    if (!shiZiDingYiBeiJingURL(dangQian)) return
    const cao = [...ziDingYiBeiJingCao.value]
    while (cao.length < ZI_DING_YI_BEI_JING_CAO_SHU) cao.push(null)
    const yiCun = cao.findIndex((xiang) => xiang && xiang.tuDiZhi === dangQian.trim())
    if (yiCun >= 0) {
      const jiu = cao[yiCun] as ZiDingYiBeiJingCao
      cao[yiCun] = { tuDiZhi: jiu.tuDiZhi, bieMing: ziDingYiBeiJingBieMing.value }
    } else {
      const kong = cao.findIndex((xiang) => !xiang)
      const xin: ZiDingYiBeiJingCao = { tuDiZhi: dangQian.trim(), bieMing: ziDingYiBeiJingBieMing.value }
      if (kong >= 0) cao[kong] = xin
      else cao[cao.length - 1] = xin
    }
    ziDingYiBeiJingCao.value = cao.slice(0, ZI_DING_YI_BEI_JING_CAO_SHU)
    try {
      xieRuZiDingYiBeiJingCao(ziDingYiBeiJingCao.value)
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, chongShi)
    }
  }

  async function jiHuoZiDingYiBeiJingCao(xuHao: number): Promise<void> {
    const cao = ziDingYiBeiJingCao.value[xuHao]
    if (!cao || !shiZiDingYiBeiJingURL(cao.tuDiZhi)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    await qieHuanBeiJing(cao.tuDiZhi)
    ziDingYiBeiJingBieMing.value = cao.bieMing
  }

  function qingChuZiDingYiBeiJingCao(xuHao: number): void {
    const cao = [...ziDingYiBeiJingCao.value]
    while (cao.length < ZI_DING_YI_BEI_JING_CAO_SHU) cao.push(null)
    cao[xuHao] = null
    ziDingYiBeiJingCao.value = cao.slice(0, ZI_DING_YI_BEI_JING_CAO_SHU)
    try {
      xieRuZiDingYiBeiJingCao(ziDingYiBeiJingCao.value)
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, chongShi)
    }
  }

  async function qingChuZiDingYiBeiJing(): Promise<void> {
    await qieHuanBeiJing('moRen')
    ziDingYiBeiJingBieMing.value = ''
  }

  async function baoCunZiDingYiQiPao(mingCheng: string, tuDiZhi: string): Promise<void> {
    const qingLiMing = mingCheng.trim()
    if (!qingLiMing) throw new Error(huoQuFanYi('sheZhi', 'qiPaoMingChengZhanWei'))
    if (Array.from(qingLiMing).length > QI_PAO_MING_CHENG_ZUI_DA_ZI_FU) {
      throw new Error(huoQuFanYi('sheZhi', 'qiPaoMingChengTaiChang'))
    }
    const qingLiDiZhi = tuDiZhi.trim()
    if (!shiZiDingYiBeiJingURL(qingLiDiZhi)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    ziDingYiQiPao.value = { mingCheng: qingLiMing, tuDiZhi: qingLiDiZhi }
    try {
      xieRuZiDingYiQiPao(ziDingYiQiPao.value)
    } catch (cuoWu: unknown) {
      ziDingYiQiPao.value = null
      jiLuCuoWu(cuoWu, chongShi)
    }
  }

  function qingChuZiDingYiQiPaoZhuangTai(): void {
    ziDingYiQiPao.value = null
    qingChuZiDingYiQiPao()
  }

  const ziDingYiQiPaoNeiLianYangShi = computed<Record<string, string>>(() => {
    const dangQian = ziDingYiQiPao.value
    if (!dangQian || !shiZiDingYiBeiJingURL(dangQian.tuDiZhi)) return {}
    const anQuanURL = dangQian.tuDiZhi.trim().replace(/["\\\n\r]/g, '')
    return {
      backgroundImage: `url("${anQuanURL}")`,
      backgroundSize: '100% 100%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  })

  async function qieHuanQiPao(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
    if (!shiHeFaQiPao(yuShe)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    if (buWei === 'ziJi') qiPaoZiJi.value = yuShe
    else qiPaoAI.value = yuShe
    try {
      await baoCunQiPao(buWei === 'ziJi' ? { ziJi: yuShe } : { ai: yuShe })
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, () => baoCunQiPao(buWei === 'ziJi' ? { ziJi: yuShe } : { ai: yuShe }))
    }
  }

  const liaoTianBeiJing = computed(() => (使用主题仓库().dangQianZhuti === 浅色值 ? liaoTianBeiJingQian.value : liaoTianBeiJingShen.value))
  const shiYuShe = computed(() => shiYuSheBeiJing(liaoTianBeiJing.value))
  const shiZiDingYi = computed(() => shiZiDingYiBeiJingURL(liaoTianBeiJing.value))
  const beiJingNeiLianYangShi = computed(() => huoQuBeiJingNeiLianYangShi(liaoTianBeiJing.value))
  const ziJiQiPaoCSSBianLiang = computed(() => huoQuQiPaoCSSBianLiang(qiPaoZiJi.value, qiPaoAI.value))

  async function baoCunYinSi(canShu: { gongKaiZhangHao?: boolean; gongKaiShouJiHao?: boolean; gongKaiYouXiang?: boolean }): Promise<void> {
    if (canShu.gongKaiZhangHao !== undefined) gongKaiZhangHao.value = canShu.gongKaiZhangHao
    if (canShu.gongKaiShouJiHao !== undefined) gongKaiShouJiHao.value = canShu.gongKaiShouJiHao
    if (canShu.gongKaiYouXiang !== undefined) gongKaiYouXiang.value = canShu.gongKaiYouXiang
    try {
      await baoCunYinSiSheZhi(canShu)
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, () => baoCunYinSiSheZhi(canShu))
    }
  }

  async function qingKongPaiWei(): Promise<void> {
    try {
      await qingKongPaiWeiShuJu()
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, qingKongPaiWei)
    }
  }

  return { yongHuBianHao, shouJiHao, touXiang, qianMing, qianMingKeJianXing, qianMingBaiMingDan, liaoTianBeiJing, liaoTianBeiJingQian, liaoTianBeiJingShen, ziDingYiBeiJingBieMing, ziDingYiBeiJingCao, ziDingYiQiPao, ziDingYiQiPaoNeiLianYangShi, qiPaoZiJi, qiPaoAI, ziJiQiPaoCSSBianLiang, shiYuShe, shiZiDingYi, beiJingNeiLianYangShi, gongKaiZhangHao, gongKaiShouJiHao, gongKaiYouXiang, bangDingYouXiang, yiJiaZai, caoZuoCuoWu, qingCuoWu, chongShi, jiaZai, qieHuanBeiJing, baoCunZiDingYiBeiJing, qingChuZiDingYiBeiJing, jiHuoZiDingYiBeiJingCao, qingChuZiDingYiBeiJingCao, baoCunZiDingYiQiPao, qingChuZiDingYiQiPaoZhuangTai, qieHuanQiPao, baoCunYinSi, qingKongPaiWei, tongBuBeiJing }
})
