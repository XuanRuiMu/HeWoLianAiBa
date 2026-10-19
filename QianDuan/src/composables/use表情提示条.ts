import { ref, type Ref } from 'vue'
import { BIAO_QING_QU_TU_PEI_ZHI } from '@/config/表情配置'

interface Use表情提示条返回值 {
  tiShi: Ref<string | null>
  xianShi: (wenBen: string) => void
  yinXia: () => void
}

/**
 * 「我的表情」写入结果的状态条（role="status"）：成功与「已在库」是两种口径，
 * 不复用红色错误行；到点自动消失，离页与切面板由调用方显式收回，不留待触发定时器。
 */
export function use表情提示条(): Use表情提示条返回值 {
  const tiShi = ref<string | null>(null)
  let tiShiDingShiQi: ReturnType<typeof setTimeout> | null = null

  function xianShi(wenBen: string): void {
    if (tiShiDingShiQi) clearTimeout(tiShiDingShiQi)
    tiShi.value = wenBen
    tiShiDingShiQi = setTimeout(() => {
      tiShiDingShiQi = null
      tiShi.value = null
    }, BIAO_QING_QU_TU_PEI_ZHI.tiShiXiaoShiHaoMiao)
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
