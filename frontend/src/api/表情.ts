import http from './请求'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { huoQuFanYi } from '@/config/translations'

export interface BiaoQingXiang {
  id: string
  mei_ti_id: string
  sha256: string
  mime: string
  duan_ming: string
  pai_xu: number
  chuang_jian_shi_jian: string
  mei_ti_url: string
}

export interface BiaoQingLieBiao {
  lie_biao: BiaoQingXiang[]
  zong_shu: number
}

/** FP-20：无原始文件名时的缺省名与上传口径同源（唯一提供者） */
export const MO_REN_WEN_JIAN_MING = 'biaoqing.png'

/** 后端 yi_cun_zai 是「同 SHA256 已在我的表情里」的唯一判定，前端不再自行按哈希猜第二遍 */
export interface TianJiaBiaoQingJieGuo {
  xiang: BiaoQingXiang
  yiCunZai: boolean
}

export async function huoQuWoDeBiaoQing(): Promise<BiaoQingLieBiao> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: BiaoQingLieBiao }>(
    '/表情/我的',
  )
  const shuJu = xiangYing.data.shu_ju
  return { lie_biao: shuJu?.lie_biao || [], zong_shu: shuJu?.zong_shu ?? 0 }
}

export async function tianJiaBiaoQing(
  wenJian: File | Blob,
  wenJianMing?: string,
): Promise<TianJiaBiaoQingJieGuo> {
  const formData = new FormData()
  const ming =
    wenJianMing || (wenJian instanceof File && wenJian.name ? wenJian.name : MO_REN_WEN_JIAN_MING)
  formData.append('file', wenJian, ming)
  const xiangYing = await http.post<{
    cheng_gong: boolean
    shu_ju: { biao_qing: BiaoQingXiang; yi_cun_zai?: boolean }
  }>('/表情/我的', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: BIAO_QING_TIAN_JIA_PEI_ZHI.chaoShiHaoMiao,
  })
  const shuJu = xiangYing.data?.shu_ju
  if (!shuJu || !shuJu.biao_qing) throw new Error(huoQuFanYi('duoMeiTi', 'biaoQingTianJiaShiBai'))
  return { xiang: shuJu.biao_qing, yiCunZai: shuJu.yi_cun_zai === true }
}

export async function shanChuBiaoQing(biaoQingId: string): Promise<void> {
  await http.delete(`/表情/我的/${encodeURIComponent(biaoQingId)}`)
}

export async function baoCunBiaoQingPaiXu(shunXu: string[]): Promise<BiaoQingLieBiao> {
  const xiangYing = await http.put<{ cheng_gong: boolean; shu_ju: BiaoQingLieBiao }>(
    '/表情/我的/排序',
    { shunXu },
  )
  const shuJu = xiangYing.data.shu_ju
  return { lie_biao: shuJu?.lie_biao || [], zong_shu: shuJu?.zong_shu ?? 0 }
}
