import { computed, watchEffect } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'

export const MO_REN_BEI_JING = 'moRen'
export const ZI_DING_YI_BEI_JING_LEI_MING = 'beijing-ziDingYi'

export function huoQuLiaoTianBeiJingLeiMing(
  shiYuShe: boolean,
  liaoTianBeiJing: string | null | undefined,
): string {
  return shiYuShe ? `beijing-${liaoTianBeiJing || MO_REN_BEI_JING}` : ZI_DING_YI_BEI_JING_LEI_MING
}

export function use聊天皮肤() {
  const sheZhi = 使用用户设置仓库()
  const beiJingLeiMing = computed(() =>
    huoQuLiaoTianBeiJingLeiMing(sheZhi.shiYuShe, sheZhi.liaoTianBeiJing),
  )
  const beiJingYangShi = computed(() => sheZhi.beiJingNeiLianYangShi)
  const qiPaoYangShi = computed(() => sheZhi.qiPaoCSSBianLiang)
  watchEffect(() => {
    const ziJiTu = sheZhi.dangQianZiJiQiPaoTu
    const aiTu = sheZhi.dangQianAiQiPaoTu
    if (ziJiTu) void sheZhi.queRenQiPaoWeiBaYanSe('ziJi', ziJiTu)
    if (aiTu) void sheZhi.queRenQiPaoWeiBaYanSe('ai', aiTu)
  })
  return { beiJingLeiMing, beiJingYangShi, qiPaoYangShi }
}
