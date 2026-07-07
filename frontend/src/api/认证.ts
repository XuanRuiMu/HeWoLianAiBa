import http from './请求'
import type { 用户, 性别, 性格选择, 人设标签, 登录响应 } from '@/types'

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
  xingBie: 性别
  muBiaoXingBie: 性别
  xingGeXuanZe: 性格选择
  renSheBiaoQian: 人设标签
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
): Promise<登录响应> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 登录响应 }>('/认证/注册', {
    shouJiHao,
    yanZhengMa,
    yongHuMing,
    miMa,
    tongYiXieYi,
  })
  return 响应.data.shu_ju
}

export async function dengLu(shouJiHao: string, miMa: string): Promise<登录响应> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 登录响应 }>('/认证/登录', {
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

export async function huoQuYongHuXinXi(): Promise<用户> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 用户 }>('/用户/信息')
  return 响应.data.shu_ju
}

export async function sheZhiZiLiao(shuJu: 资料请求): Promise<用户> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 用户 }>('/用户/资料', shuJu)
  return 响应.data.shu_ju
}
