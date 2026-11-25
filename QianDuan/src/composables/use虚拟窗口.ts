import { computed, nextTick, ref, type Ref } from 'vue'
import { fenZuXiaoXiAnShiJian, type XiaoXiFenZuXiang } from '@/utils/消息时间分组'
import type { 消息 } from '@/types/类型定义'

export type { XiaoXiFenZuXiang }

interface Use虚拟窗口依赖 {
  huoQuXiaoXiLieBiao: () => 消息[]
  xiaoxiQuYuRef: Ref<HTMLElement | null>
}

const XuNiManRenderYuZhi = 150
const XuNiChuShiWeiBu = 120
const XuNiKuoZhanBuChang = 80
const XuNiXianShiChuangKou = 100

export function use虚拟窗口(yiLai: Use虚拟窗口依赖) {
  const xuNiQiSuoYin = ref<number | null>(null)
  const xuNiXinHao = ref(0)

  function huoQuYouXiaoQiSuoYin(zongShu: number): number {
    return Math.max(0, xuNiQiSuoYin.value ?? Math.max(0, zongShu - XuNiChuShiWeiBu))
  }

  function chongZhiXuNiChuangKou(): void {
    xuNiQiSuoYin.value = null
    xuNiXinHao.value++
  }

  const xuanRanXiaoXiLieBiao = computed<消息[]>(() => {
    void xuNiXinHao.value
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    if (!Array.isArray(lieBiao)) return []
    if (lieBiao.length <= XuNiManRenderYuZhi) return lieBiao
    if (xuNiQiSuoYin.value === null) {
      return lieBiao.slice(Math.max(0, lieBiao.length - XuNiChuShiWeiBu))
    }
    const qi = Math.min(xuNiQiSuoYin.value, Math.max(0, lieBiao.length - 1))
    const wei = Math.min(lieBiao.length, qi + XuNiXianShiChuangKou + (qi > 0 ? XuNiKuoZhanBuChang : 0))
    return lieBiao.slice(qi, wei)
  })

  const xuNiYinCangQianDiaoShu = computed(() => {
    void xuNiXinHao.value
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    const zong = Array.isArray(lieBiao) ? lieBiao.length : 0
    if (zong <= XuNiManRenderYuZhi) return 0
    return huoQuYouXiaoQiSuoYin(zong)
  })

  async function wenDingKuoZhanXuNiChuangKou(dongZuo: () => void): Promise<void> {
    const zhu = yiLai.xiaoxiQuYuRef.value
    if (!zhu) {
      dongZuo()
      return
    }
    const qianMian = zhu.querySelector('.xiaoxi-liebiao > *') as HTMLElement | null
    const qianTop = qianMian ? qianMian.getBoundingClientRect().top : null
    const qianScrollTop = zhu.scrollTop
    dongZuo()
    await nextTick()
    if (qianTop === null) return
    const houMian = zhu.querySelector('.xiaoxi-liebiao > *') as HTMLElement | null
    const houTop = houMian ? houMian.getBoundingClientRect().top : qianTop
    zhu.scrollTop = qianScrollTop + (houTop - qianTop)
  }

  function kuaiSuKuoZhanXiangShang(): void {
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    const zongShu = Array.isArray(lieBiao) ? lieBiao.length : 0
    const dangQianQi = huoQuYouXiaoQiSuoYin(zongShu)
    if (dangQianQi <= 0) return
    void wenDingKuoZhanXuNiChuangKou(() => {
      xuNiQiSuoYin.value = Math.max(0, dangQianQi - XuNiKuoZhanBuChang)
      xuNiXinHao.value++
    })
  }

  const xiaoXiFenZu = computed<XiaoXiFenZuXiang[]>(() =>
    fenZuXiaoXiAnShiJian(xuanRanXiaoXiLieBiao.value),
  )

  return {
    xuNiQiSuoYin,
    xuNiXinHao,
    chongZhiXuNiChuangKou,
    xuanRanXiaoXiLieBiao,
    xuNiYinCangQianDiaoShu,
    kuaiSuKuoZhanXiangShang,
    xiaoXiFenZu,
  }
}
