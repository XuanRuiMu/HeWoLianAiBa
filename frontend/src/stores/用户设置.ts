import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { huoQuYongHuSheZhi, baoCunLiaoTianBeiJing, baoCunQiPao, baoCunYinSiSheZhi, qingKongPaiWeiShuJu } from '@/api/社交'
import { shiHeFaKeJianXing, type KeJianXing } from '@/api/资料'
import {
  QI_PAO_ZI_JI_MO_REN,
  QI_PAO_AI_MO_REN,
  guiYiHuaQiPao,
  huoQuQiPaoCSSBianLiang,
  shiHeFaQiPao,
  type QiPaoYuShe,
} from '@/config/气泡主题'
import { huoQuFanYi } from '@/config/translations'

export const LIAO_TIAN_BEI_JING_XUAN_XIANG = ['moRen', 'miWuSenLin', 'haiYangZhiLan', 'fenSeMengJing', 'yeKongXingHe', 'miSeTianYuan'] as const

export type LiaoTianBeiJing = string

export const BEI_JING_URL_ZUI_DA_CHANG_DU = 2000

const MEI_TI_QIAN_MING_LU_JING = /^\/api\/媒体\/[0-9a-f]{64}(\?e=\d{1,12}&s=[0-9a-f]+)?$/

export function shiYuSheBeiJing(zhi: unknown): boolean {
  return typeof zhi === 'string' && (LIAO_TIAN_BEI_JING_XUAN_XIANG as readonly string[]).includes(zhi)
}

export function shiZiDingYiBeiJingURL(zhi: unknown): boolean {
  if (typeof zhi !== 'string') return false
  const qingLi = zhi.trim()
  if (!qingLi || qingLi.length > BEI_JING_URL_ZUI_DA_CHANG_DU) return false
  if (qingLi.startsWith('/')) return MEI_TI_QIAN_MING_LU_JING.test(qingLi)
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
  const uid = ref('')
  const shouJiHao = ref('')
  const touXiang = ref<string | null>(null)
  const qianMing = ref<string | null>(null)
  const qianMingKeJianXing = ref<KeJianXing>('gong_kai')
  const qianMingBaiMingDan = ref<string[]>([])
  const liaoTianBeiJing = ref<string>('moRen')
  const qiPaoZiJi = ref<QiPaoYuShe>(QI_PAO_ZI_JI_MO_REN)
  const qiPaoAI = ref<QiPaoYuShe>(QI_PAO_AI_MO_REN)
  const gongKaiZhangHao = ref(true)
  const gongKaiShouJiHao = ref(false)
  const gongKaiYouXiang = ref(false)
  const bangDingYouXiang = ref('')
  const yiJiaZai = ref(false)
  let jiaZaiZhong: Promise<void> | null = null

  async function jiaZai(): Promise<void> {
    if (yiJiaZai.value) return
    // 同一时刻多组件并发调用时复用同一请求，不发重复查询
    if (jiaZaiZhong) return jiaZaiZhong
    jiaZaiZhong = zhiXingJiaZai().finally(() => {
      jiaZaiZhong = null
    })
    return jiaZaiZhong
  }

  async function zhiXingJiaZai(): Promise<void> {
    try {
      const sheZhi = await huoQuYongHuSheZhi()
      uid.value = sheZhi.uid
      shouJiHao.value = sheZhi.shou_ji_hao
      touXiang.value = sheZhi.tou_xiang
      qianMing.value = sheZhi.qian_ming
      if (shiHeFaKeJianXing(sheZhi.qian_ming_ke_jian_xing)) {
        qianMingKeJianXing.value = sheZhi.qian_ming_ke_jian_xing
      }
      qianMingBaiMingDan.value = Array.isArray(sheZhi.qian_ming_bai_ming_dan) ? sheZhi.qian_ming_bai_ming_dan : []
      if (typeof sheZhi.liao_tian_bei_jing === 'string' && (shiYuSheBeiJing(sheZhi.liao_tian_bei_jing) || shiZiDingYiBeiJingURL(sheZhi.liao_tian_bei_jing))) {
        liaoTianBeiJing.value = sheZhi.liao_tian_bei_jing
      }
      qiPaoZiJi.value = guiYiHuaQiPao(sheZhi.qi_pao_zi_ji, QI_PAO_ZI_JI_MO_REN)
      qiPaoAI.value = guiYiHuaQiPao(sheZhi.qi_pao_ai, QI_PAO_AI_MO_REN)
      gongKaiZhangHao.value = sheZhi.gong_kai_zhang_hao
      gongKaiShouJiHao.value = sheZhi.gong_kai_shou_ji_hao
      gongKaiYouXiang.value = sheZhi.gong_kai_you_xiang
      bangDingYouXiang.value = sheZhi.bang_ding_you_xiang
    } catch {
      /* 未登录或后端未迁移时保持本地默认值 */
    } finally {
      yiJiaZai.value = true
    }
  }

  async function qieHuanBeiJing(beiJing: string): Promise<void> {
    liaoTianBeiJing.value = beiJing
    try {
      await baoCunLiaoTianBeiJing(beiJing)
    } catch {
      /* 离线时仅本地生效 */
    }
  }

  async function baoCunZiDingYiBeiJing(beiJingURL: string): Promise<void> {
    if (!shiZiDingYiBeiJingURL(beiJingURL)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    await qieHuanBeiJing(beiJingURL.trim())
  }

  async function qingChuZiDingYiBeiJing(): Promise<void> {
    await qieHuanBeiJing('moRen')
  }

  async function qieHuanQiPao(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
    if (!shiHeFaQiPao(yuShe)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    if (buWei === 'ziJi') qiPaoZiJi.value = yuShe
    else qiPaoAI.value = yuShe
    try {
      await baoCunQiPao(buWei === 'ziJi' ? { ziJi: yuShe } : { ai: yuShe })
    } catch {
      /* 离线时仅本地生效 */
    }
  }

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
    } catch {
      /* 离线时仅本地生效 */
    }
  }

  async function qingKongPaiWei(): Promise<void> {
    await qingKongPaiWeiShuJu()
  }

  return { uid, shouJiHao, touXiang, qianMing, qianMingKeJianXing, qianMingBaiMingDan, liaoTianBeiJing, qiPaoZiJi, qiPaoAI, ziJiQiPaoCSSBianLiang, shiYuShe, shiZiDingYi, beiJingNeiLianYangShi, gongKaiZhangHao, gongKaiShouJiHao, gongKaiYouXiang, bangDingYouXiang, yiJiaZai, jiaZai, qieHuanBeiJing, baoCunZiDingYiBeiJing, qingChuZiDingYiBeiJing, qieHuanQiPao, baoCunYinSi, qingKongPaiWei }
})
