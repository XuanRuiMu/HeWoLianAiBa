import http from './请求'
import type {
  Xiaoxi,
  HuiHua,
  JunShiXinXi,
  JunShiZhiDaoJieGuo,
  JunShiJiLu,
  DangAnXiangQing,
  ShengChengJiaoSeJieGuo,
  Jiaose,
  FanKuiTiJiao,
} from '@/types'

export async function chuangJianHuiHua(jiaoSeId: string): Promise<HuiHua> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: HuiHua }>('/聊天/会话', {
    jiaoSeId,
  })
  return 响应.data.shu_ju
}

export async function huoQuHuiHuaLieBiao(): Promise<HuiHua[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: HuiHua[] }>('/聊天/会话')
  return 响应.data.shu_ju
}

export async function huoQuXiaoXi(
  huiHuaId: string,
  yeMa: number = 1,
  meiYeTiaoShu: number = 50,
): Promise<{ lie_biao: Xiaoxi[]; zong_shu: number }> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao: Xiaoxi[]; zong_shu: number }
  }>(`/聊天/会话/${huiHuaId}/消息`, {
    params: { ye_ma: yeMa, mei_ye_tiao_shu: meiYeTiaoShu },
  })
  const shuJu = 响应.data.shu_ju
  return {
    lie_biao: shuJu?.lie_biao || [],
    zong_shu: shuJu?.zong_shu || 0,
  }
}

export async function faSongXiaoXi(
  huiHuaId: string,
  neiRong: string,
): Promise<{ xiaoXi: Xiaoxi; shiMiJi: boolean }> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: Xiaoxi & { shi_mi_ji?: boolean } }>(
    `/聊天/会话/${huiHuaId}/消息`,
    { neiRong },
  )
  const shuJu = 响应.data.shu_ju
  return {
    xiaoXi: shuJu,
    shiMiJi: shuJu.shi_mi_ji === true,
  }
}

export async function cheHuiXiaoXi(huiHuaId: string, xiaoXiId: string): Promise<void> {
  await http.put(`/聊天/会话/${huiHuaId}/消息/${xiaoXiId}/撤回`)
}

export async function biaoJiYiDu(huiHuaId: string): Promise<void> {
  await http.put(`/聊天/会话/${huiHuaId}/已读`)
}

export async function huoQuJunShiLieBiao(): Promise<JunShiXinXi[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { junShiLieBiao: JunShiXinXi[] }
  }>('/聊天/军师/列表')
  return 响应.data.shu_ju.junShiLieBiao
}

export async function qingQiuJunShiZhiDao(jiaoSeId: string): Promise<JunShiZhiDaoJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: JunShiZhiDaoJieGuo }>(
    '/聊天/军师',
    {
      jiaoSeId,
    },
    {
      timeout: 120000,
    },
  )
  return 响应.data.shu_ju
}

export async function huoQuJunShiJiLu(jiaoSeId: string): Promise<JunShiJiLu[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { jiLuLieBiao: JunShiJiLu[] } }>(
    `/聊天/军师/记录/${jiaoSeId}`,
  )
  return 响应.data.shu_ju.jiLuLieBiao
}

export async function huoQuDangAnLieBiao(): Promise<DangAnXiangQing[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: { dangAnLieBiao: DangAnXiangQing[] } }>(
    '/战绩/列表',
  )
  return 响应.data.shu_ju?.dangAnLieBiao || []
}

export async function huoQuDangAnXiangQing(dangAnId: string): Promise<DangAnXiangQing> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: DangAnXiangQing }>(
    `/战绩/详情/${dangAnId}`,
  )
  return 响应.data.shu_ju
}

export async function shengChengJiaoSe(
  目标性别: string,
  性格选择: string,
  允许渣型: boolean,
  是否随机性格?: boolean,
  用户性别?: string | null,
): Promise<ShengChengJiaoSeJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: ShengChengJiaoSeJieGuo }>(
    '/生成角色/MBTI生成',
    {
      性别: 目标性别 === 'male' ? 'nan' : 'nv',
      mbti类型: 性格选择,
      渣男渣女变体: 允许渣型,
      随机性格: 是否随机性格 || false,
      用户性别: 用户性别 === 'male' ? 'nan' : 用户性别 === 'female' ? 'nv' : undefined,
    },
  )
  return 响应.data.shu_ju
}

export async function queRenJiaoSe(
  xuanZhongJiaoSe: ShengChengJiaoSeJieGuo,
): Promise<ShengChengJiaoSeJieGuo> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: ShengChengJiaoSeJieGuo }>(
    '/生成角色/确认',
    { xuanZhongJiaoSe },
  )
  return 响应.data.shu_ju
}

export async function huoQuJiaoSeXiangQing(jiaoSeId: string): Promise<{
  jiao_se: Jiaose
  dang_an_zhuang_tai?: {
    jie_guo_lei_xing: string
    shi_fou_feng_cun: boolean
    you_xi_yi_jie_shu: boolean
    ke_ji_xu_liao_tian: boolean
  } | null
}> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: {
      jiao_se: Jiaose
      dang_an_zhuang_tai?: {
        jie_guo_lei_xing: string
        shi_fou_feng_cun: boolean
        you_xi_yi_jie_shu: boolean
        ke_ji_xu_liao_tian: boolean
      } | null
    }
  }>(`/角色/详情/${jiaoSeId}`)
  return 响应.data.shu_ju
}

export interface 军师指导记录项 {
  shi_jian: string
  jiao_se_ming_zi: string
  jun_shi_ming_chen: string
  jian_yi: string
  dui_hua_zhai_yao: string
  hao_gan_du_kuai_zhao: {
    zongFen: number
    xinRenDu: number
    qinMiDu: number
    quWeiDu: number
    guanHuaiDu: number
    guanXiJieDuan: string
    guanXiJieDuanMingCheng: string
  } | null
}

export interface 关键事件项 {
  shi_jian: string
  shi_jian_lei_xing: string
  miao_shu: string
}

export interface 复盘响应 {
  fu_pan_nei_rong: string | null
  fu_pan_shi_jian_xian: 复盘时间线条目[]
  jun_shi_zhi_dao_ji_lu: 军师指导记录项[]
  guan_jian_shi_jian: 关键事件项[]
  jia_zai_zhong: boolean
}

export interface 复盘时间线条目 {
  shi_jian: string
  shi_jian_miao_shu: string
  yong_hu_xiao_xi: string
  ai_hui_fu: string
  ai_xin_li_huo_dong: string
  hao_gan_du_bian_hua: {
    xin_ren_bian_hua: number
    qin_mi_bian_hua: number
    qu_wei_bian_hua: number
    guan_huai_bian_hua: number
    zong_fen_bian_hua: number
    guan_xi_jie_duan: string
  } | null
}

export async function huoQuFuPan(dangAnId: string): Promise<复盘响应> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 复盘响应 }>(`/战绩/复盘/${dangAnId}`)
  return 响应.data.shu_ju
}

export interface 通关结果 {
  xiao_xi?: string
  cheng_gong?: boolean
  [key: string]: unknown
}

export interface 成就项 {
  id: string
  ming_cheng: string
  miao_shu?: string
  yi_wan_cheng?: boolean
  [key: string]: unknown
}

export async function chuLiGaoBai(jiaoSeId: string, xiaoXi: string): Promise<通关结果> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 通关结果 }>('/通关/告白', {
    jiaoSeId,
    xiaoXi,
  })
  return 响应.data.shu_ju
}

export async function queRenGuanXi(jiaoSeId: string): Promise<通关结果> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 通关结果 }>('/通关/确认', {
    jiaoSeId,
  })
  return 响应.data.shu_ju
}

export async function huoQuChengJiu(): Promise<成就项[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 成就项[] }>('/通关/成就')
  return 响应.data.shu_ju
}

export async function chuLiShiPo(jiaoSeId: string, jiaoSeMingZi: string): Promise<通关结果> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 通关结果 }>('/通关/识破', {
    jiaoSeId,
    jiaoSeMingZi,
  })
  return 响应.data.shu_ju
}

export async function jianCeAiZhuDongGaoBai(
  jiaoSeId: string,
): Promise<{ zhu_dong_gao_bai: boolean; xiao_xi?: string }> {
  const 响应 = await http.post<{
    cheng_gong: boolean
    shu_ju: { zhu_dong_gao_bai: boolean; xiao_xi?: string }
  }>('/通关/主动告白', { jiaoSeId })
  return 响应.data.shu_ju
}

export async function 响应AI主动告白(jiaoSeId: string, jieShou: boolean): Promise<通关结果> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 通关结果 }>('/通关/响应告白', {
    jiaoSeId,
    jieShou,
  })
  return 响应.data.shu_ju
}

export async function tiJiaoFanKui(canShu: FanKuiTiJiao): Promise<void> {
  await http.post('/反馈/提交', canShu)
}

export async function shanChuDangAn(dangAnId: string): Promise<{ cheng_gong: boolean }> {
  const 响应 = await http.delete<{ cheng_gong: boolean; shu_ju: { cheng_gong: boolean } }>(
    `/战绩/${dangAnId}`,
  )
  return 响应.data.shu_ju
}
