import http from './请求'
import type { TongZhi } from '@/types'

export async function huoQuTongZhiLieBiao(
  xianShiShu = 50,
): Promise<{ lie_biao: TongZhi[]; wei_du_shu: number }> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao: TongZhi[]; wei_du_shu: number }
  }>('/通知', {
    params: { xianShiShu },
  })
  return 响应.data.shu_ju
}

export async function biaoJiTongZhiYiDu(tongZhiId: string): Promise<void> {
  await http.put(`/通知/${tongZhiId}/已读`)
}

export async function biaoJiQuanBuTongZhiYiDu(): Promise<void> {
  await http.put('/通知/全部已读')
}
