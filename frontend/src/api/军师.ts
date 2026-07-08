import http from './请求'
import type { FuPanTiaoMu } from '@/types'

export interface 求助状态 {
  yi_yong_ci_shu: number
  sheng_yu_ci_shu: number
  zui_da_ci_shu: number
  hao_gan_du: {
    zong_fen: number
    guan_xi_jie_duan: string
    xin_ren_du: number
    qin_mi_du: number
    qu_wei_du: number
    guan_huai_du: number
  } | null
  fu_pan_shu_ju: FuPanTiaoMu[]
}

export async function huoQuQiuZhuZhuangTai(jiaoSeId: string): Promise<求助状态> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 求助状态 }>('/顾问/求助状态', {
    params: { jiaoSeId },
  })
  return 响应.data.shu_ju
}
