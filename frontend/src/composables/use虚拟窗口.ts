import { computed, nextTick, ref, type Ref } from 'vue'
import { fenZuXiaoXiAnShiJian, type XiaoXiFenZuXiang } from '@/utils/消息时间分组'
import type { 消息 } from '@/types'

export type { XiaoXiFenZuXiang }

interface Use虚拟窗口依赖 {
  huoQuXiaoXiLieBiao: () => 消息[]
  xiaoxiQuYuRef: Ref<HTMLElement | null>
}

// ---- M5 自研轻量虚拟渲染（窗口化）----
// YH-086 真窗口头尾双裁：千条消息DOM有界，低端机不卡死
// 根因：只尾裁不回收头，DOM无界增长；收敛为自动尾部窗口定长120，显式窗口定长100
const XU_NI_MAN_RENDER_YU_ZHI = 150
const XU_NI_CHU_SHI_WEI_BU = 120
const XU_NI_KUO_ZHAN_BU_CHANG = 80
const XU_NI_XIAN_SHI_CHUANG_KOU = 100

export function use虚拟窗口(yiLai: Use虚拟窗口依赖) {
  // 渲染窗口的绝对起始索引；null = 自动尾部窗口（始终渲染最新 XU_NI_CHU_SHI_WEI_BU 条）
  // 向上滚动扩展时转为显式数值并逐步减小，揭示更早的已加载消息
  const xuNiQiSuoYin = ref<number | null>(null)
  const xuNiXinHao = ref(0)

  function huoQuYouXiaoQiSuoYin(zongShu: number): number {
    return Math.max(0, xuNiQiSuoYin.value ?? Math.max(0, zongShu - XU_NI_CHU_SHI_WEI_BU))
  }

  function chongZhiXuNiChuangKou(): void {
    xuNiQiSuoYin.value = null
    xuNiXinHao.value++
  }

  /** 实际进入渲染管线的消息列表（真窗口头尾双裁定长；低于阈值全量渲染） */
  const xuanRanXiaoXiLieBiao = computed<消息[]>(() => {
    void xuNiXinHao.value
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    if (!Array.isArray(lieBiao)) return []
    if (lieBiao.length <= XU_NI_MAN_RENDER_YU_ZHI) return lieBiao
    // 自动尾部窗口：最新120条；显式起始索引：该索引起100条；尾部天然有界，头部天然回收
    // 显式窗口扩展中途（起始索引>0且窗口未贴顶）：向上多揭示一个步长，保滚动扩展语义
    if (xuNiQiSuoYin.value === null) {
      return lieBiao.slice(Math.max(0, lieBiao.length - XU_NI_CHU_SHI_WEI_BU))
    }
    const qi = Math.min(xuNiQiSuoYin.value, Math.max(0, lieBiao.length - 1))
    const wei = Math.min(lieBiao.length, qi + XU_NI_XIAN_SHI_CHUANG_KOU + (qi > 0 ? XU_NI_KUO_ZHAN_BU_CHANG : 0))
    return lieBiao.slice(qi, wei)
  })

  /** 已加载但尚未挂载到 DOM 的更早消息条数（>0 时向上滚动可继续扩展窗口） */
  const xuNiYinCangQianDiaoShu = computed(() => {
    void xuNiXinHao.value
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    const zong = Array.isArray(lieBiao) ? lieBiao.length : 0
    if (zong <= XU_NI_MAN_RENDER_YU_ZHI) return 0
    return huoQuYouXiaoQiSuoYin(zong)
  })

  /**
   * 窗口扩展锚点稳定器：先记录首个渲染节点的视口位置，执行扩展后按位置差值回补 scrollTop，
   * 保证用户当前查看的内容在屏幕上纹丝不动（FP-05#11）。
   */
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
    // jsdom/无布局环境下差值为 0，行为退化为不调整（与既有测试契约兼容）
    zhu.scrollTop = qianScrollTop + (houTop - qianTop)
  }

  function kuaiSuKuoZhanXiangShang(): void {
    const lieBiao = yiLai.huoQuXiaoXiLieBiao()
    const zongShu = Array.isArray(lieBiao) ? lieBiao.length : 0
    const dangQianQi = huoQuYouXiaoQiSuoYin(zongShu)
    if (dangQianQi <= 0) return
    void wenDingKuoZhanXuNiChuangKou(() => {
      xuNiQiSuoYin.value = Math.max(0, dangQianQi - XU_NI_KUO_ZHAN_BU_CHANG)
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
