import http from './请求'
import type {
  消息,
  会话,
  军师建议,
  军师记录,
  档案详情,
  生成角色结果,
  角色,
  评估结果,
  反馈提交,
} from '@/types'

export async function chuangJianHuiHua(jiaoSeId: string): Promise<会话> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 会话 }>('/聊天/会话', {
    jiaoSeId,
  })
  return 响应.data.shu_ju
}

export async function huoQuHuiHuaLieBiao(): Promise<会话[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 会话[] }>('/聊天/会话')
  return 响应.data.shu_ju
}

export async function huoQuXiaoXi(huiHuaId: string): Promise<消息[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao: 消息[] } | 消息[]
  }>(`/聊天/会话/${huiHuaId}/消息`)
  const shuJu = 响应.data.shu_ju
  if (Array.isArray(shuJu)) return shuJu
  if (shuJu && 'lie_biao' in shuJu && Array.isArray(shuJu.lie_biao)) return shuJu.lie_biao
  return []
}

export async function faSongXiaoXi(huiHuaId: string, neiRong: string): Promise<消息> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 消息 }>(
    `/聊天/会话/${huiHuaId}/消息`,
    { neiRong },
  )
  return 响应.data.shu_ju
}

export async function cheHuiXiaoXi(huiHuaId: string, xiaoXiId: string): Promise<void> {
  await http.put(`/聊天/会话/${huiHuaId}/消息/${xiaoXiId}/撤回`)
}

export async function biaoJiYiDu(huiHuaId: string): Promise<void> {
  await http.put(`/聊天/会话/${huiHuaId}/已读`)
}

export async function huoQuJunShiLieBiao(): Promise<军师建议[]> {
  const 响应 = await http.get<{
    cheng_gong: boolean
    shu_ju: { junShiLieBiao: 军师建议[] }
  }>('/聊天/军师/列表')
  return 响应.data.shu_ju.junShiLieBiao
}

export async function qingQiuJunShiZhiDao(jiaoSeId: string): Promise<军师建议> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 军师建议 }>('/聊天/军师', {
    jiaoSeId,
  })
  return 响应.data.shu_ju
}

export async function huoQuJunShiJiLu(jiaoSeId: string): Promise<军师记录[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 军师记录[] }>(
    `/聊天/军师/记录/${jiaoSeId}`,
  )
  return 响应.data.shu_ju
}

export async function huoQuDangAnLieBiao(): Promise<档案详情[]> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 档案详情[] }>('/档案/列表')
  return 响应.data.shu_ju
}

export async function huoQuDangAnXiangQing(dangAnId: string): Promise<档案详情> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 档案详情 }>(`/档案/详情/${dangAnId}`)
  return 响应.data.shu_ju
}

export async function shengChengJiaoSe(
  muBiaoXingBie: string,
  xingGeXuanZe: string,
  yunXuZhaXing: boolean,
  suiJiXingGe?: boolean,
  yongHuXingBie?: string | null,
): Promise<生成角色结果> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 生成角色结果 }>(
    '/生成角色/MBTI生成',
    {
      xingBie: muBiaoXingBie === 'male' ? 'nan' : 'nv',
      mbtiLeiXing: xingGeXuanZe,
      shiFouZhaXing: yunXuZhaXing,
      suiJiXingGe: suiJiXingGe || false,
      yongHuXingBie:
        yongHuXingBie === 'male' ? 'nan' : yongHuXingBie === 'female' ? 'nv' : undefined,
    },
  )
  return 响应.data.shu_ju
}

export async function queRenJiaoSe(xuanZhongJiaoSe: 生成角色结果): Promise<void> {
  await http.post('/生成角色/确认', { xuanZhongJiaoSe })
}

export async function huoQuJiaoSeXiangQing(jiaoSeId: string): Promise<{
  jiao_se: 角色
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
      jiao_se: 角色
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
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 复盘响应 }>(`/档案/复盘/${dangAnId}`)
  return 响应.data.shu_ju
}

export async function faSongKaiChangBai(
  jiaoSeId: string,
): Promise<{ yi_fa_song: boolean; xiao_xi_shu?: number; yuan_yin?: string }> {
  const 响应 = await http.post<{
    cheng_gong: boolean
    shu_ju: { yi_fa_song: boolean; xiao_xi_shu?: number; yuan_yin?: string }
  }>('/聊天/开场白', { jiaoSeId })
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

export async function tiJiaoFanKui(canShu: 反馈提交): Promise<void> {
  await http.post('/反馈/提交', canShu)
}

export async function zhiXingPingGu(jiaoSeId: string): Promise<评估结果> {
  const 响应 = await http.post<{ cheng_gong: boolean; shu_ju: 评估结果 }>('/评估/聊天水平', {
    jiaoSeId,
  })
  return 响应.data.shu_ju
}

export async function huoQuPingGuLiShi(jiaoSeId: string): Promise<评估结果 | null> {
  const 响应 = await http.get<{ cheng_gong: boolean; shu_ju: 评估结果 | null }>('/评估/聊天水平', {
    params: { jiaoSeId },
  })
  return 响应.data.shu_ju
}
