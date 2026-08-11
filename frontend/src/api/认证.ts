import http from './请求'
import type { Yonghu, XingBie, XingGeXuanZe, RenSheBiaoQian, DengLuXiangYing } from '@/types'

export interface 发送码请求 {
  shouJiHao: string
}

export interface 注册请求 {
  shouJiHao: string
  yanZhengMa: string
  yongHuMing: string
  miMa: string
  tongYiXieYi: boolean
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

export async function faSongMa(shouJiHao: string): Promise<void> {
  await http.post('/认证/发送码', { shouJiHao })
}

export async function jianChaShouJiHao(shouJiHao: string): Promise<{ yi_zhu_ce: boolean }> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { yi_zhu_ce: boolean } }>(
    `/认证/检查手机?shouJiHao=${shouJiHao}`,
  )
  return 响应.data.shu_ju
}

export async function zhuCe(
  shouJiHao: string,
  yanZhengMa: string,
  yongHuMing: string,
  miMa: string,
  tongYiXieYi: boolean,
): Promise<DengLuXiangYing> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: DengLuXiangYing }>('/认证/注册', {
    shouJiHao,
    yanZhengMa,
    yongHuMing,
    miMa,
    tongYiXieYi,
  })
  return 响应.data.shu_ju
}

export async function dengLu(shouJiHao: string, miMa: string): Promise<DengLuXiangYing> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: DengLuXiangYing }>('/认证/登录', {
    shouJiHao,
    miMa,
  })
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

export async function huoQuYongHuXinXi(): Promise<Yonghu> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: Yonghu }>('/认证/信息')
  return 响应.data.shu_ju
}

export async function sheZhiZiLiao(shuJu: 资料请求): Promise<Yonghu> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: Yonghu }>('/用户/资料', shuJu)
  return 响应.data.shu_ju
}
