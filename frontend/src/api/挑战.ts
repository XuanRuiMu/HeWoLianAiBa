import http from './请求'
import type { ShengChengJiaoSeJieGuo } from '@/types'

export type ZuBie = 'nan_nv' | 'nv_nan' | 'nan_nan' | 'nv_nv'

export interface TiaoZhanDuiJu {
  id: string
  jiao_se_id: string
  wan_jia_xing_bie: '男' | '女'
  dui_xiang_xing_bie: '男' | '女'
  wei_xin_ming: string
  tou_xiang: string
  chuang_jian_shi_jian: string
}

export interface PaiHangXiangMu {
  pai_ming: number
  yong_hu_ming: string
  ji_fen: number
  duan_wei: string
  sheng_chang: number
  fu_chang: number
  qi_quan_chang: number
  zui_gao_lian_sheng: number
}

export interface ZuBieGaiKuang {
  zu_bie: ZuBie
  ji_fen: number | null
  duan_wei: string | null
  sheng_chang: number
  fu_chang: number
  qi_quan_chang: number
  lian_sheng: number
  pai_ming: number | null
}

/** 开始一局挑战：服务端随机生成全部隐藏参数并直接保存角色 */
export async function kaiShiTiaoZhan(
  woDeXingBie: '男' | '女',
  duiXiangXingBie: '男' | '女',
): Promise<ShengChengJiaoSeJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: ShengChengJiaoSeJieGuo }>(
    '/挑战/开始',
    { woDeXingBie, duiXiangXingBie },
    { timeout: 60000 },
  )
  return 响应.data.shu_ju
}

export async function huoQuDangQianDuiJu(): Promise<TiaoZhanDuiJu | null> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { dui_ju: TiaoZhanDuiJu | null } }>(
    '/挑战/当前',
  )
  return 响应.data.shu_ju?.dui_ju || null
}

export interface FangQiJieGuo {
  jie_guo: {
    jie_guo_lei_xing: string
    zhuang_tai_wen_ben: string
    ke_ji_xu_liao_tian: boolean
  }
}

export async function fangQiDuiJu(): Promise<FangQiJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: FangQiJieGuo }>('/挑战/放弃')
  return 响应.data.shu_ju
}

export async function huoQuPaiHangBang(zuBie: ZuBie): Promise<PaiHangXiangMu[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { pai_hang: PaiHangXiangMu[] }
  }>('/挑战/排行榜', { params: { zuBie } })
  return 响应.data.shu_ju?.pai_hang || []
}

export interface TiaoZhanPeiZhi {
  zha_xing_gai_lv: number
}

export async function huoQuTiaoZhanPeiZhi(): Promise<TiaoZhanPeiZhi> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: TiaoZhanPeiZhi
  }>('/挑战/配置')
  return 响应.data.shu_ju
}

export async function huoQuWoDeGaiKuang(): Promise<ZuBieGaiKuang[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { gai_kuang: ZuBieGaiKuang[] }
  }>('/挑战/我的概况')
  return 响应.data.shu_ju?.gai_kuang || []
}
