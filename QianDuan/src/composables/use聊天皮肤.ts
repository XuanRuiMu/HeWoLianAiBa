import { computed } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'

export const MoRenBeiJing = 'moRen'
export const ZiDingYiBeiJingLeiMing = 'beijing-ziDingYi'

export function huoQuLiaoTianBeiJingLeiMing(
  shiYuShe: boolean,
  liaoTianBeiJing: string | null | undefined,
): string {
  return shiYuShe ? `beijing-${liaoTianBeiJing || MoRenBeiJing}` : ZiDingYiBeiJingLeiMing
}

export function use聊天皮肤() {
  const sheZhi = 使用用户设置仓库()
  const beiJingLeiMing = computed(() =>
    huoQuLiaoTianBeiJingLeiMing(sheZhi.shiYuShe, sheZhi.liaoTianBeiJing),
  )
  const beiJingYangShi = computed(() => sheZhi.beiJingNeiLianYangShi)
  const qiPaoYangShi = computed(() => sheZhi.qiPaoCSSBianLiang)
  return { beiJingLeiMing, beiJingYangShi, qiPaoYangShi }
}
