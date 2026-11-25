










































  | 'youMoHuaLao'

export interface Yonghu {
  id: string
  shou_ji_hao: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  mu_biao_xing_bie: 性别展示形态 | null
  mo_ren_xing_bie: XingBie | null
  xing_ge_xuan_ze: XingGeXuanZe | null
  ren_she_biao_qian: RenSheBiaoQian | null
  yun_xu_zha_nan_zha_nv: boolean
  tou_xiang: string | null
  sheng_ri: string | null
  qian_ming: string | null
  jiao_se: 管理角色 | null
  neng_li: 管理能力[]
  huo_yue_ren_she_id: string | null
  hai_wang_fen_shu: number
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
}

export interface DengLuXiangYing {
  令牌: string
  刷新令牌?: string
  刷新令牌ID?: string
  用户: Yonghu
  新用户: boolean
}
