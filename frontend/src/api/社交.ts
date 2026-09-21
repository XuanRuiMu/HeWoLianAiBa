import http from './请求'
import {
  anMimeTuiDaoWenJianMing,
  type MeiTiShangChuanJieGuo,
  type ShangChuanLeiBie,
} from './聊天'

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
  /** FP-21：后端按「读者用户编号 + 内容哈希」现签的短效地址，绑定读者故换不了人 */
  mei_ti_url: string | null
  /** 媒体类别（媒体文件存量码：tupian / biaoqingshu / yuyin / wenjian） */
  mei_ti_lei_bie: string | null
  mei_ti_yuan_shi_wen_jian_ming: string | null
  mei_ti_da_xiao_zi_jie: number | null
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
  qi_pao_zi_ji?: string
  qi_pao_ai?: string
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

export async function huoQuHaoYouXiaoXi(
  haoYouId: string,
  xianZhi = 20,
  youBiao?: { xu_hao: number | null; shi_jian: number; id: string },
): Promise<HaoYouXiaoXi[]> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: { lie_biao: HaoYouXiaoXi[] } }>(`/好友/消息/${haoYouId}`, {
    params: {
      limit: xianZhi,
      ...(youBiao ? { you_biao_xu_hao: youBiao.xu_hao ?? '', you_biao_shi_jian_chuo: youBiao.shi_jian, you_biao_id: youBiao.id } : {}),
    },
  })
  return xiangYing.data.shu_ju.lie_biao || []
}

/**
 * FP-21 好友媒体上传。归属参数是**好友的 用户编号**（+ 登录态自己的编号），全程不出现会话编号：
 * 好友会话不是 AI 会话，把 huiHuaId 传给 AI 那条 /聊天/会话/:huiHuaId/媒体 等于用错身份模型。
 * 存储与校验仍在后端唯一入口（liuShiBaoCunMeiTi），此处只负责 multipart 形态与超时。
 */
export type HaoYouShangChuanLeiBie = Extract<ShangChuanLeiBie, 'tupian' | 'wenjian'>

export async function shangChuanHaoYouMeiTi(
  haoYouId: string,
  wenJian: File | Blob,
  leiBie: HaoYouShangChuanLeiBie,
): Promise<MeiTiShangChuanJieGuo> {
  const formData = new FormData()
  const wenJianMing =
    wenJian instanceof File && wenJian.name
      ? wenJian.name
      : anMimeTuiDaoWenJianMing(leiBie, wenJian.type || '')
  formData.append('file', wenJian, wenJianMing)
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: MeiTiShangChuanJieGuo }>(
    '/好友/媒体',
    formData,
    {
      params: { jieShouZheId: haoYouId, leiBie },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    },
  )
  return xiangYing.data.shu_ju
}

export async function faSongHaoYouXiaoXi(
  jieShouZheId: string,
  neiRong: string,
  miDengJian?: string,
  meiTi?: { leiXing: string; meiTiId: string },
): Promise<{ id: string; shi_jian_chuo: number }> {
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: { id: string; shi_jian_chuo: number } }>('/好友/消息', {
    jieShouZheId,
    neiRong,
    leiXing: meiTi?.leiXing || 'wenben',
    meiTiId: meiTi?.meiTiId ?? null,
  }, miDengJian ? { miDengJian } as unknown as Record<string, unknown> : undefined)
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

export async function shangChuanLiaoTianBeiJing(wenJian: Blob): Promise<string> {
  const biaoDan = new FormData()
  biaoDan.append('file', wenJian, wenJian instanceof File && wenJian.name ? wenJian.name : 'liaotian-beijing')
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: { bei_jing: string } }>(
    '/用户设置/聊天背景/上传',
    biaoDan,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    },
  )
  return xiangYing.data.shu_ju.bei_jing
}

export async function baoCunQiPao(canShu: { ziJi?: string; ai?: string }): Promise<void> {
  await http.put('/用户设置/气泡', canShu)
}

export async function baoCunYinSiSheZhi(canShu: { gongKaiZhangHao?: boolean; gongKaiShouJiHao?: boolean; gongKaiYouXiang?: boolean }): Promise<void> {
  await http.put('/用户设置/隐私', canShu)
}

export async function qingKongPaiWeiShuJu(): Promise<void> {
  await http.post('/用户设置/排位/清空')
}
