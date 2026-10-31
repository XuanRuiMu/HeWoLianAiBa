import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

export type QianTaiZhuangTai = 'idle' | 'loading' | 'error'
export type QianTaiChongShiDongZuo = () => Promise<unknown> | unknown

export interface YunXingQianTaiCuoWuXuanXiang {
  xianShiJiaZai?: boolean
  chongShi?: QianTaiChongShiDongZuo
  chuLiCuoWu?: (zhengChangHua: QianTaiCuoWu) => void
}

export function use前台错误() {
  const cuoWu = shallowRef<QianTaiCuoWu | null>(null)
  const zhuangTai = ref<QianTaiZhuangTai>('idle')
  let daiCi = 0
  let chongShiDongZuo: QianTaiChongShiDongZuo | null = null
  let yiJieShou = false

  function qingLi(): void {
    daiCi += 1
    chongShiDongZuo = null
    cuoWu.value = null
    zhuangTai.value = 'idle'
  }

  function jieShou(yuanShiCuoWu: unknown, chongShi?: QianTaiChongShiDongZuo): QianTaiCuoWu | null {
    if (yiJieShou) return null
    daiCi += 1
    const zhengChangHua = 归一前台错误(yuanShiCuoWu)
    if (!zhengChangHua.xianShi) {
      qingLi()
      return null
    }
    cuoWu.value = zhengChangHua
    chongShiDongZuo = zhengChangHua.retryable && chongShi ? chongShi : null
    zhuangTai.value = 'error'
    return zhengChangHua
  }

  async function yunXing<T>(
    dongZuo: () => Promise<T> | T,
    xuanXiang: YunXingQianTaiCuoWuXuanXiang = {},
  ): Promise<T | undefined> {
    const benCi = ++daiCi
    chongShiDongZuo = null
    cuoWu.value = null
    zhuangTai.value = xuanXiang.xianShiJiaZai === false ? 'idle' : 'loading'
    try {
      const jieGuo = await dongZuo()
      if (benCi !== daiCi || yiJieShou) return jieGuo
      zhuangTai.value = 'idle'
      return jieGuo
    } catch (yuanShiCuoWu: unknown) {
      if (benCi !== daiCi || yiJieShou) return undefined
      const zhengChangHua = 归一前台错误(yuanShiCuoWu)
      if (!zhengChangHua.xianShi) {
        zhuangTai.value = 'idle'
        return undefined
      }
      cuoWu.value = zhengChangHua
      chongShiDongZuo = zhengChangHua.retryable ? xuanXiang.chongShi || null : null
      zhuangTai.value = 'error'
      xuanXiang.chuLiCuoWu?.(zhengChangHua)
      return undefined
    }
  }

  async function chongShi(): Promise<void> {
    if (yiJieShou || zhuangTai.value === 'loading' || !cuoWu.value?.retryable || !chongShiDongZuo) return
    const dongZuo = chongShiDongZuo
    await yunXing(dongZuo)
  }

  onBeforeUnmount(() => {
    yiJieShou = true
    daiCi += 1
    chongShiDongZuo = null
    cuoWu.value = null
    zhuangTai.value = 'idle'
  })

  return { cuoWu, zhuangTai, jieShou, yunXing, chongShi, qingLi }
}
