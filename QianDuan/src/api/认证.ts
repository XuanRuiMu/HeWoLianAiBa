






















































































































  try {
    const shiQu = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (typeof shiQu === 'string' && /^[A-Za-z_]+\/[A-Za-z_+\-/]+$/.test(shiQu)) return shiQu
  } catch {
    return ''
  }
  return ''
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
