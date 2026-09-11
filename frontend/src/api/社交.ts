import http from './请求'

export interface HaoYouSouSuoXiang {
  id: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  tou_xiang: string | null
  qian_ming: string | null
  shou_ji_hao: string
  shi_hao_you: boolean
}

export interface HaoYouShenQingXiang {
  id: string
  shen_qing_zhe_id?: string
  jie_shou_zhe_id?: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  tou_xiang: string | null
  chuang_jian_shi_jian: string
}

export interface HaoYouXiang {
  id: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  tou_xiang: string | null
  qian_ming: string | null
}

export interface HaoYouXiaoXi {
  id: string
  fa_song_zhe_id: string
  jie_shou_zhe_id: string
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
  yi_du: boolean
  yi_che_hui: boolean
  shi_jian_chuo: number
}

export interface YongHuSheZhi {
  uid: string
  shou_ji_hao: string
  tou_xiang: string | null
  qian_ming: string | null
  qian_ming_ke_jian_xing: string
  qian_ming_bai_ming_dan: string[]
  liao_tian_bei_jing: string
  gong_kai_zhang_hao: boolean
  gong_kai_shou_ji_hao: boolean
  gong_kai_you_xiang: boolean
  bang_ding_you_xiang: string
}

export async function souSuoHaoYou(guanJianZi: string): Promise<HaoYouSouSuoXiang[]> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: { lie_biao: HaoYouSouSuoXiang[] } }>('/好友/搜索', {
    params: { q: guanJianZi },
  })
  return xiangYing.data.shu_ju.lie_biao || []
}

export async function faSongHaoYouShenQing(jieShouZheId: string): Promise<void> {
  await http.post('/好友/申请', { jieShouZheId })
}

export async function huoQuShouDaoShenQing(): Promise<HaoYouShenQingXiang[]> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: { lie_biao: HaoYouShenQingXiang[] } }>('/好友/申请/收到的')
  return xiangYing.data.shu_ju.lie_biao || []
}

export async function huoQuFaChuShenQing(): Promise<HaoYouShenQingXiang[]> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: { lie_biao: HaoYouShenQingXiang[] } }>('/好友/申请/发出的')
  return xiangYing.data.shu_ju.lie_biao || []
}

export async function jieShouHaoYouShenQing(shenQingId: string): Promise<void> {
  await http.post(`/好友/申请/${shenQingId}/接受`)
}

export async function juJueHaoYouShenQing(shenQingId: string): Promise<void> {
  await http.post(`/好友/申请/${shenQingId}/拒绝`)
}

export async function huoQuHaoYouLieBiao(): Promise<HaoYouXiang[]> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: { lie_biao: HaoYouXiang[] } }>('/好友/列表')
  return xiangYing.data.shu_ju.lie_biao || []
}

export async function shanChuHaoYou(haoYouId: string): Promise<void> {
  await http.delete(`/好友/${haoYouId}`)
}

export async function huoQuHaoYouXiaoXi(haoYouId: string, xianZhi = 20): Promise<HaoYouXiaoXi[]> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: { lie_biao: HaoYouXiaoXi[] } }>(`/好友/消息/${haoYouId}`, {
    params: { limit: xianZhi },
  })
  return xiangYing.data.shu_ju.lie_biao || []
}

export async function faSongHaoYouXiaoXi(jieShouZheId: string, neiRong: string): Promise<{ id: string; shi_jian_chuo: number }> {
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: { id: string; shi_jian_chuo: number } }>('/好友/消息', {
    jieShouZheId,
    neiRong,
    leiXing: 'wenben',
  })
  return xiangYing.data.shu_ju
}

export async function cheHuiHaoYouXiaoXi(xiaoXiId: string): Promise<void> {
  await http.put(`/好友/消息/${xiaoXiId}/撤回`)
}

export async function biaoJiHaoYouYiDu(haoYouId: string): Promise<void> {
  await http.put(`/好友/消息/已读/${haoYouId}`)
}

export async function huoQuYongHuSheZhi(): Promise<YongHuSheZhi> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: YongHuSheZhi }>('/用户设置')
  return xiangYing.data.shu_ju
}

export async function baoCunLiaoTianBeiJing(beiJing: string): Promise<void> {
  await http.put('/用户设置/聊天背景', { beiJing })
}

export async function baoCunYinSiSheZhi(canShu: { gongKaiZhangHao?: boolean; gongKaiShouJiHao?: boolean; gongKaiYouXiang?: boolean }): Promise<void> {
  await http.put('/用户设置/隐私', canShu)
}

export async function qingKongPaiWeiShuJu(): Promise<void> {
  await http.post('/用户设置/排位/清空')
}
