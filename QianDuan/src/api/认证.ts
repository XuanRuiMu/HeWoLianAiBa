import http from './请求'
import type { Yonghu, XingBie, XingGeXuanZe, RenSheBiaoQian, DengLuXiangYing } from '@/types/类型定义'

export interface 重置密码请求 {
  shouJiHao: string
  yanZhengMa: string
  xinMiMa: string
  queRenXinMiMa: string
}

export interface 注册请求 {
  shouJiHao: string
  yanZhengMa: string
  yongHuMing: string
  miMa: string
  tongYiXieYi: boolean
  chuShengRiQi: string
  jingWai?: boolean
}

export interface 登录请求 {
  shouJiHao: string
  miMa: string
}

export interface 资料请求 {
  niCheng: string
  xingBie: XingBie
  muBiaoXingBie: XingBie
  xingGeXuanZe: XingGeXuanZe
  renSheBiaoQian: RenSheBiaoQian
  yunXuZhaNanZhaNv: boolean
}

export const YAN_ZHENG_MA_YONG_TU = {
  zhuCe: 'zhuCe',
  chongZhiMiMa: 'chongZhiMiMa',
} as const

export type YanZhengMaYongTu = (typeof YAN_ZHENG_MA_YONG_TU)[keyof typeof YAN_ZHENG_MA_YONG_TU]

export interface 人机验证答案 {
  renJiPiaoJu: string
  renJiDaAn: string
}

export interface 人机挑战 {
  id: string
  svg: string
  guoQiMiao: number
}

export async function huoQuRenJiTiaoZhan(
  yongTu: YanZhengMaYongTu = YAN_ZHENG_MA_YONG_TU.zhuCe,
  peiZhi?: { signal?: AbortSignal },
): Promise<人机挑战> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 人机挑战 }>(
    `/认证/人机挑战?yongTu=${encodeURIComponent(yongTu)}`,
    peiZhi,
  )
  return 响应.data.shu_ju
}

export async function faSongMa(
  shouJiHao: string,
  yongTu: YanZhengMaYongTu = YAN_ZHENG_MA_YONG_TU.zhuCe,
  peiZhi?: { signal?: AbortSignal },
  renJi?: 人机验证答案,
): Promise<void> {
  await http.post('/认证/发送码', { shouJiHao, yongTu, ...(renJi ?? {}) }, peiZhi)
}

export async function chongZhiMiMa(
  qingQiu: 重置密码请求,
  peiZhi?: { signal?: AbortSignal },
): Promise<void> {
  await http.post('/认证/重置密码', qingQiu, peiZhi)
}

export async function jianChaShouJiHao(
  shouJiHao: string,
  peiZhi?: { signal?: AbortSignal },
): Promise<{ yi_zhu_ce: boolean }> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { yi_zhu_ce: boolean } }>(
    `/认证/检查手机?shouJiHao=${encodeURIComponent(shouJiHao)}`,
    peiZhi,
  )
  return 响应.data.shu_ju
}

export async function zhuCe(
  shouJiHao: string,
  yanZhengMa: string,
  yongHuMing: string,
  miMa: string,
  tongYiXieYi: boolean,
  chuShengRiQi: string,
  peiZhi?: { signal?: AbortSignal },
  jingWai = false,
): Promise<DengLuXiangYing> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: DengLuXiangYing }>(
    '/认证/注册',
    {
      shouJiHao,
      yanZhengMa,
      yongHuMing,
      miMa,
      tongYiXieYi,
      chuShengRiQi,
      jingWai,
    },
    peiZhi,
  )
  return 响应.data.shu_ju
}

export async function dengLu(
  shouJiHao: string,
  miMa: string,
  peiZhi?: { signal?: AbortSignal },
): Promise<DengLuXiangYing> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: DengLuXiangYing }>(
    '/认证/登录',
    {
      shouJiHao,
      miMa,
    },
    peiZhi,
  )
  return 响应.data.shu_ju
}

export async function gengGaiMiMa(
  jiuMiMa: string,
  xinMiMa: string,
  queRenXinMiMa: string,
  yanZhengMa: string,
): Promise<void> {
  await http.post('/认证/更改密码', { jiuMiMa, xinMiMa, queRenXinMiMa, yanZhengMa })
}

export async function gengGaiYongHuMing(yongHuMing: string): Promise<{ yong_hu_ming: string }> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: { yong_hu_ming: string } }>(
    '/认证/更改用户名',
    { yongHuMing },
  )
  return 响应.data.shu_ju
}

export async function gengGaiMoRenXingBie(moRenXingBie: XingBie): Promise<Yonghu> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: { yong_hu: Yonghu } }>(
    '/认证/设置默认性别',
    { moRenXingBie },
  )
  return 响应.data.shu_ju.yong_hu
}

export async function gengGaiMoRenDuiXiangXingBie(moRenDuiXiangXingBie: XingBie): Promise<Yonghu> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: { yong_hu: Yonghu } }>(
    '/认证/设置默认对象性别',
    { moRenDuiXiangXingBie },
  )
  return 响应.data.shu_ju.yong_hu
}

export async function huoQuYongHuXinXi(peiZhi?: { signal?: AbortSignal }): Promise<Yonghu> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: Yonghu }>('/认证/信息', peiZhi)
  return 响应.data.shu_ju
}

export async function zhuXiaoZhangHao(peiZhi?: { signal?: AbortSignal }): Promise<void> {
  await http.delete<{ cheng_gong: boolean; ti_shi?: string }>('/认证/注销', peiZhi)
}

export async function sheZhiZiLiao(shuJu: 资料请求): Promise<Yonghu> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: Yonghu }>('/用户/资料', shuJu)
  return 响应.data.shu_ju
}
