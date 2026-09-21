import { huoQuFanYi } from '@/config/translations'
import { BIAO_QING_QU_TU_PEI_ZHI } from '@/config/表情配置'
import { MO_REN_WEN_JIAN_MING } from '@/api/表情'
import type { TianJiaJieGuo } from '@/composables/use表情提交'
import type { 消息 } from '@/types'

export type { TianJiaJieGuo }

/**
 * 本 composable 唯一真正消费的消息形状：去重键 `ke_hu_duan_id || id`。
 * 媒体地址、文件名、重签全部走注入回调，故两个聊天页（`消息` 与 `HaoYouXiaoXi`）共用同一份实现，
 * 不需要第二份文件，也不需要任何强转。
 */
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

/** 签名过期与媒体行缺失都走一次重签再取，与气泡 @error 的 V8 重签口径同一 */
function keChongQian(zhuangTaiMa: number): boolean {
  return zhuangTaiMa === 403 || zhuangTaiMa === 404
}

async function laHuiWenJian(diZhi: string): Promise<Response | null> {
  const kongZhi = new AbortController()
  const dingShiQi = setTimeout(() => kongZhi.abort(), BIAO_QING_QU_TU_PEI_ZHI.quTuChaoShiHaoMiao)
  try {
    // 不带任何自定义请求头：签名随 URL 查询下发，同源经 vite 代理/生产同域 nginx，
    // 登录态请求头一律由 api/请求.ts 单源承载，此处不得出现第二份
    return await globalThis.fetch(diZhi, { signal: kongZhi.signal })
  } catch {
    return null
  } finally {
    clearTimeout(dingShiQi)
  }
}

/**
 * FP-20「添加到表情」：把消息气泡里的图片取回成本地文件，交回唯一写入口 `use表情提交` 提交。
 * 本文件不上传、不判定、不碰登录态请求头，也不建第二条上传通路。
 */
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
