import { ref, type Ref } from 'vue'
import { BiaoQingQuTuPeiZhi } from '@/config/表情配置'

interface Use表情提示条返回值 {
  tiShi: Ref<string | null>
  xianShi: (wenBen: string) => void
  yinXia: () => void
}

export function use表情提示条(): Use表情提示条返回值 {
  const tiShi = ref<string | null>(null)
  let tiShiDingShiQi: ReturnType<typeof setTimeout> | null = null

  function xianShi(wenBen: string): void {
    if (tiShiDingShiQi) clearTimeout(tiShiDingShiQi)
    tiShi.value = wenBen
    tiShiDingShiQi = setTimeout(() => {
      tiShiDingShiQi = null
      tiShi.value = null
    }, BiaoQingQuTuPeiZhi.tiShiXiaoShiHaoMiao)
  }

  function yinXia(): void {
    if (tiShiDingShiQi) {
      clearTimeout(tiShiDingShiQi)
      tiShiDingShiQi = null
    }
    tiShi.value = null
  }

  return { tiShi, xianShi, yinXia }
}
