import http from './请求'

export const KE_JIAN_XING_LIE_BIAO = [
  'gong_kai',
  'jin_hao_you',
  'jin_bu_fen_ren',
  'bu_ke_jian',
  'jin_zi_ji',
] as const

export type KeJianXing = (typeof KE_JIAN_XING_LIE_BIAO)[number]

export function shiHeFaKeJianXing(zhi: unknown): zhi is KeJianXing {
  return typeof zhi === 'string' && (KE_JIAN_XING_LIE_BIAO as readonly string[]).includes(zhi)
}

export interface MingPian {
  id: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  tou_xiang: string | null
  qian_ming: string | null
  shi_hao_you: boolean
  shi_zi_ji: boolean
}

export async function baoCunQianMing(canShu: {
  qianMing: string
  keJianXing?: KeJianXing
  baiMingDan?: string[]
}): Promise<void> {
  await http.put('/资料/签名', canShu)
}

export async function baoCunQianMingBaiMingDan(baiMingDan: string[]): Promise<void> {
  await http.put('/资料/签名白名单', { baiMingDan })
}

export async function shangChuanTouXiang(wenJian: Blob): Promise<string> {
  const biaoDan = new FormData()
  biaoDan.append('file', wenJian, wenJian instanceof File && wenJian.name ? wenJian.name : 'touxiang')
  const xiangYing = await http.post<{ cheng_gong: boolean; shu_ju: { tou_xiang: string } }>(
    '/资料/头像',
    biaoDan,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    },
  )
  return xiangYing.data.shu_ju.tou_xiang
}

export async function huoQuMingPian(yongHuId: string): Promise<MingPian> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: MingPian }>(
    `/资料/名片/${encodeURIComponent(yongHuId)}`,
  )
  return xiangYing.data.shu_ju
}

export interface FengJinZhuangTai {
  bei_feng_jin: boolean
  ji_bie: string
  wei_gui_ci_shu: number
  jie_feng_shi_jian: string | null
  shen_su_zhuang_tai: string
}

export async function huoQuFengJinZhuangTai(): Promise<FengJinZhuangTai> {
  const xiangYing = await http.get<{ cheng_gong: boolean; shu_ju: FengJinZhuangTai }>('/资料/封禁状态')
  return xiangYing.data.shu_ju
}

export async function tiJiaoShenSu(liYou: string): Promise<void> {
  await http.post('/资料/申诉', { liYou })
}
