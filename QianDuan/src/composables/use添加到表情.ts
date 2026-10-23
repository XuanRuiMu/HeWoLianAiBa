import { huoQuFanYi } from '@/config/翻译表'
import { BIAO_QING_QU_TU_PEI_ZHI } from '@/config/表情配置'
import { MO_REN_WEN_JIAN_MING } from '@/api/表情'
import type { TianJiaJieGuo } from '@/composables/use表情提交'
import type { 消息 } from '@/types/类型定义'

export type { TianJiaJieGuo }

export interface BiaoQingMuBiaoXiaoXi {
  id: string
  ke_hu_duan_id?: string
}

interface Use添加到表情依赖<T> {
  huoQuMeiTiURL: (xiaoXi: T) => string | null | undefined
  huoQuWenJianMing?: (xiaoXi: T) => string | null | undefined
  chongQianMeiTiURL?: (xiaoXi: T) => Promise<string | null>
  tiJiaoWenJian: (wenJian: File) => Promise<TianJiaJieGuo>
  sheZhiCuoWu: (xinXi: string) => void
  sheZhiTiShi: (xinXi: string) => void
}

function chuLiJian<T extends BiaoQingMuBiaoXiaoXi>(xiaoXi: T): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

function keChongQian(zhuangTaiMa: number): boolean {
  return zhuangTaiMa === 403 || zhuangTaiMa === 404
}

async function laHuiWenJian(diZhi: string): Promise<Response | null> {
  const kongZhi = new AbortController()
  const dingShiQi = setTimeout(() => kongZhi.abort(), BIAO_QING_QU_TU_PEI_ZHI.quTuChaoShiHaoMiao)
  try {
    return await globalThis.fetch(diZhi, { signal: kongZhi.signal })
  } catch {
    return null
  } finally {
    clearTimeout(dingShiQi)
  }
}

export function use添加到表情<T extends BiaoQingMuBiaoXiaoXi = 消息>(
  yiLai: Use添加到表情依赖<T>,
) {
  const chuLiZhong = new Set<string>()

  async function tianJiaTuPianDaoBiaoQing(xiaoXi: T): Promise<void> {
    const jian = chuLiJian(xiaoXi)
    if (chuLiZhong.has(jian)) {
      yiLai.sheZhiTiShi(huoQuFanYi('duoMeiTi', 'biaoQingZhengZaiChuLi'))
      return
    }
    chuLiZhong.add(jian)
    try {
      const diZhi = yiLai.huoQuMeiTiURL(xiaoXi)
      if (!diZhi) {
        yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'biaoQingDiZhiQueShi'))
        return
      }
      let xiangYing = await laHuiWenJian(diZhi)
      if (xiangYing && !xiangYing.ok && keChongQian(xiangYing.status) && yiLai.chongQianMeiTiURL) {
        const xinDiZhi = await yiLai.chongQianMeiTiURL(xiaoXi)
        if (xinDiZhi) xiangYing = await laHuiWenJian(xinDiZhi)
      }
      if (!xiangYing || !xiangYing.ok) {
        yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai'))
        return
      }
      const blob = await xiangYing.blob()
      const wenJianMing = yiLai.huoQuWenJianMing?.(xiaoXi) || MO_REN_WEN_JIAN_MING
      const jieGuo = await yiLai.tiJiaoWenJian(new File([blob], wenJianMing, { type: blob.type }))
      if (jieGuo === 'xinZeng') yiLai.sheZhiTiShi(huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia'))
      else if (jieGuo === 'yiCunZai') yiLai.sheZhiTiShi(huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu'))
    } catch {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai'))
    } finally {
      chuLiZhong.delete(jian)
    }
  }

  return { tianJiaTuPianDaoBiaoQing }
}
