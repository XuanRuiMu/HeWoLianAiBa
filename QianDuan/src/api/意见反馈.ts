import { 请求实例 as http } from './请求'
import { huoQuFanYi } from '@/config/翻译表'
import type {
  FanKuiGuanLiXiang,
  FanKuiTiJiao,
  FanKuiTongJi,
  WoDeFanKuiXiang,
} from '@/types/类型定义'

export interface FanKuiTiJiaoJieGuo {
  id: string
}

export interface WoDeFanKuiYe {
  lie_biao: WoDeFanKuiXiang[]
  hai_you_geng_duo: boolean
}

export interface FanKuiGuanLiYe {
  lie_biao: FanKuiGuanLiXiang[]
  hai_you_geng_duo: boolean
}

export interface FanKuiGuanLiShaiXuan {
  zhuangTai?: string
  fenLei?: string
  yeMian?: string
  yeMa?: number
}

function shengChengMiDengJian(): string {
  const suiJiUUID = globalThis.crypto?.randomUUID?.()
  if (suiJiUUID) return suiJiUUID
  return `fankui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

export async function tiJiaoFanKui(canShu: FanKuiTiJiao): Promise<FanKuiTiJiaoJieGuo> {
  const xiangYing = await http.post<{
    cheng_gong: boolean
    shu_ju: { id?: string } | null
  }>('/反馈', canShu, { miDengJian: shengChengMiDengJian() })
  const shuJu = xiangYing.data?.shu_ju
  if (!shuJu || typeof shuJu.id !== 'string' || !shuJu.id) {
    throw new Error(huoQuFanYi('yiJianFanKui', 'tiJiaoShiBai'))
  }
  return { id: shuJu.id }
}

export async function huoQuWoDeFanKui(yeMa: number): Promise<WoDeFanKuiYe> {
  const xiangYing = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao?: WoDeFanKuiXiang[]; hai_you_geng_duo?: boolean } | null
  }>('/反馈/我的', {
    params: { yeMa },
  })
  const shuJu = xiangYing.data?.shu_ju
  return {
    lie_biao: shuJu?.lie_biao || [],
    hai_you_geng_duo: shuJu?.hai_you_geng_duo === true,
  }
}

function guiYiGuanLiXiang(xiang: FanKuiGuanLiXiang | null | undefined): FanKuiGuanLiXiang {
  const anQuan = xiang && typeof xiang === 'object' ? xiang : ({} as FanKuiGuanLiXiang)
  return {
    ...anQuan,
    biao_qian: Array.isArray(anQuan.biao_qian) ? anQuan.biao_qian : [],
    xiao_xi_yin_yong: Array.isArray(anQuan.xiao_xi_yin_yong) ? anQuan.xiao_xi_yin_yong : [],
    biao_qing_bao_yin_yong: Array.isArray(anQuan.biao_qing_bao_yin_yong)
      ? anQuan.biao_qing_bao_yin_yong
      : [],
  }
}

export async function huoQuFanKuiGuanLiLieBiao(
  canShu: FanKuiGuanLiShaiXuan,
): Promise<FanKuiGuanLiYe> {
  const xiangYing = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao?: FanKuiGuanLiXiang[]; hai_you_geng_duo?: boolean } | null
  }>('/管理/反馈', {
    params: canShu,
  })
  const shuJu = xiangYing.data?.shu_ju
  return {
    lie_biao: (shuJu?.lie_biao || []).map(guiYiGuanLiXiang),
    hai_you_geng_duo: shuJu?.hai_you_geng_duo === true,
  }
}

export async function huoQuFanKuiTongJi(): Promise<FanKuiTongJi> {
  const xiangYing = await http.get<{
    cheng_gong: boolean
    shu_ju: FanKuiTongJi | null
  }>('/管理/反馈/统计')
  const shuJu = xiangYing.data?.shu_ju
  return {
    zong_shu: shuJu?.zong_shu ?? 0,
    jin_7_tian_shu: shuJu?.jin_7_tian_shu ?? 0,
    zhuang_tai_shu: shuJu?.zhuang_tai_shu || {},
    fen_lei_shu: shuJu?.fen_lei_shu || {},
  }
}

export async function gengXinFanKuiZhuangTai(
  fanKuiId: string,
  canShu: { zhuang_tai: string; guan_li_bei_zhu?: string },
): Promise<FanKuiGuanLiXiang> {
  const xiangYing = await http.post<{
    cheng_gong: boolean
    shu_ju: FanKuiGuanLiXiang | null
  }>(`/管理/反馈/${encodeURIComponent(fanKuiId)}/zhuang-tai`, canShu)
  const shuJu = xiangYing.data?.shu_ju
  if (!shuJu || !shuJu.id) {
    throw new Error(huoQuFanYi('yiJianFanKui', 'guanLiBaoCunShiBai'))
  }
  return guiYiGuanLiXiang(shuJu)
}
