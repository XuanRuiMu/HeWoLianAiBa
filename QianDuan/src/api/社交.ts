import http from './请求'
import {
  anMimeTuiDaoWenJianMing,
  type MeiTiShangChuanJieGuo,
  type ShangChuanLeiBie,
} from './聊天'
import type { XiaoXiKuai, XiaoXiKuaiChuCan } from '@/types/类型定义'
import type { WaiGuanChuCan, WaiGuanShuJu } from '@/config/外观自定义'

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
  fa_song_zhe_lei_xing?: 'yonghu' | 'duifang'
  jie_shou_zhe_id: string
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
  mei_ti_url: string | null
  mei_ti_lei_bie: string | null
  mei_ti_yuan_shi_wen_jian_ming: string | null
  mei_ti_da_xiao_zi_jie: number | null
  mei_ti_shi_chang_hao_miao?: number | null
  yi_du: boolean
  yi_che_hui: boolean
  shi_jian_chuo: number
  nei_rong_kuai?: XiaoXiKuaiChuCan[] | null
  bei_yong_xiao_xi_id?: string | null
}

export interface YongHuSheZhi {
  uid: string
  shou_ji_hao: string
  tou_xiang: string | null
  qian_ming: string | null
  qian_ming_ke_jian_xing: string
  qian_ming_bai_ming_dan: string[]
  liao_tian_bei_jing: string
  liao_tian_bei_jing_qian?: string
  liao_tian_bei_jing_shen?: string
  qi_pao_zi_ji?: string
  qi_pao_ai?: string
  gong_kai_zhang_hao: boolean
  gong_kai_shou_ji_hao: boolean
  gong_kai_you_xiang: boolean
  bang_ding_you_xiang: string
  wai_guan?: WaiGuanChuCan | null
  dui_xiang_jiao_se_id?: string | null
  dui_xiang_tou_xiang?: string | null
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

export interface HaoYouXiaoXiYe {
  lieBiao: HaoYouXiaoXi[]
  haiYouGengDuo: boolean
}

export async function huoQuHaoYouXiaoXi(
  haoYouId: string,
  xianZhi = 20,
  youBiao?: { shi_jian_chuo: number; id: string },
): Promise<HaoYouXiaoXiYe> {
  const xiangYing = await http.get<{
    cheng_gong: boolean
    shu_ju: { lie_biao: HaoYouXiaoXi[]; hai_you_geng_duo?: boolean }
  }>(`/好友/消息/${haoYouId}`, {
    params: {
      limit: xianZhi,
      ...(youBiao
        ? { you_biao_shi_jian_chuo: youBiao.shi_jian_chuo, you_biao_id: youBiao.id }
        : {}),
    },
  })
  return {
    lieBiao: xiangYing.data.shu_ju.lie_biao || [],
    haiYouGengDuo: xiangYing.data.shu_ju.hai_you_geng_duo === true,
  }
}

export type HaoYouShangChuanLeiBie = Extract<ShangChuanLeiBie, 'tupian' | 'biaoqingshu' | 'yuyin' | 'wenjian'>

export async function shangChuanHaoYouMeiTi(
  haoYouId: string,
  wenJian: File | Blob,
  leiBie: HaoYouShangChuanLeiBie,
  zhuiJia?: { shiChangHaoMiao?: number | null },
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
      params: {
        jieShouZheId: haoYouId,
        leiBie,
        ...(zhuiJia?.shiChangHaoMiao != null ? { shiChangHaoMiao: zhuiJia.shiChangHaoMiao } : {}),
      },
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
  zhuiJia?: { neiRongKuai?: XiaoXiKuai[]; beiYongXiaoXiId?: string | null },
): Promise<{ id: string; shi_jian_chuo: number }> {
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: { id: string; shi_jian_chuo: number } }>('/好友/消息', {
    jieShouZheId,
    neiRong,
    leiXing: meiTi?.leiXing || 'wenben',
    meiTiId: meiTi?.meiTiId ?? null,
    ...(zhuiJia?.neiRongKuai ? { neiRongKuai: zhuiJia.neiRongKuai } : {}),
    ...(zhuiJia?.beiYongXiaoXiId ? { beiYongXiaoXiId: zhuiJia.beiYongXiaoXiId } : {}),
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

export async function baoCunLiaoTianBeiJing(beiJing: string, moShi?: 'qian' | 'shen'): Promise<void> {
  await http.put('/用户设置/聊天背景', { beiJing, moShi })
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

export async function shangChuanWaiGuanTuPian(wenJian: Blob): Promise<string> {
  const biaoDan = new FormData()
  biaoDan.append('file', wenJian, wenJian instanceof File && wenJian.name ? wenJian.name : 'wai-guan-tu-pian')
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: { tu_di_zhi: string } }>(
    '/用户设置/外观/上传',
    biaoDan,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    },
  )
  return xiangYing.data.shu_ju.tu_di_zhi
}

export async function baoCunWaiGuan(waiGuan: WaiGuanShuJu): Promise<WaiGuanChuCan> {
  const xiangYing = await http.put<{ cheng_gong: boolean; shu_ju: WaiGuanChuCan }>(
    '/用户设置/外观',
    waiGuan,
  )
  return xiangYing.data.shu_ju
}

export async function shangChuanDuiXiangTouXiang(wenJian: Blob): Promise<{
  dui_xiang_jiao_se_id: string
  dui_xiang_tou_xiang: string | null
}> {
  const biaoDan = new FormData()
  biaoDan.append('file', wenJian, wenJian instanceof File && wenJian.name ? wenJian.name : 'dui-xiang-tou-xiang')
  const xiangYing = await http.post<{
    cheng_gong: boolean
    shu_ju: { dui_xiang_jiao_se_id: string; dui_xiang_tou_xiang: string | null }
  }>('/用户设置/对象头像', biaoDan, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return xiangYing.data.shu_ju
}

export async function baoCunYinSiSheZhi(canShu: { gongKaiZhangHao?: boolean; gongKaiShouJiHao?: boolean; gongKaiYouXiang?: boolean }): Promise<void> {
  await http.put('/用户设置/隐私', canShu)
}

export async function qingKongPaiWeiShuJu(): Promise<void> {
  await http.post('/用户设置/排位/清空')
}
