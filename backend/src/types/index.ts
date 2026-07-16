export interface ApiXiangYing<T> {
  cheng_gong: boolean
  shu_ju: T | null
  ti_shi?: string
  cuo_wu_ma?: string
}

export interface YongHuXinXi {
  id: string
  shou_ji_hao: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  xing_bie: string | null
  mu_biao_xing_bie: string | null
  xing_ge_xuan_ze: string | null
  ren_she_biao_qian: string | null
  yun_xu_zha_nan_zha_nv: boolean
  tou_xiang: string | null
  sheng_ri: string | null
  qian_ming: string | null
  guan_li_yuan: boolean
  ce_shi?: boolean
  huo_yue_ren_she_id: string | null
  hai_wang_fen_shu: number
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
  mi_ma?: string
}

export interface DengLuXiangYing {
  令牌: string
  用户: YongHuXinXi
  新用户: boolean
  是否管理员: boolean
}

export interface RenZhengQingQiu {
  shou_ji_hao: string
  yan_zheng_ma?: string
  yong_hu_ming?: string
  mi_ma?: string
  tong_yi_xie_yi?: boolean
}

export interface GengGaiMiMaQingQiu {
  jiu_mi_ma: string
  xin_mi_ma: string
  que_ren_xin_mi_ma: string
  yan_zheng_ma: string
}

export interface GengGaiYongHuMingQingQiu {
  yong_hu_ming: string
}

export interface ShenJiRiZhi {
  id?: string
  yong_hu_id?: string | null
  ip: string
  shi_jian_lei_xing: string
  xiang_qing?: Record<string, unknown>
  lei_xing?: string
}

export interface AIJiaoSeXinXi {
  id: string
  ming_zi: string
  wei_xin_ming: string
  xing_bie: 'nan' | 'nv'
  mbti_lei_xing: string
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: '慢热' | '快热'
  nian_ling: number
  shen_fen: string
  wai_mao: string
  xing_ge: string
  bei_jing_gu_shi: string
  xi_hao: string[]
  yan_yu_feng_ge: string
  xing_wei_te_dian: string
  tou_xiang: string
  xi_huan_de_lei_xing: string
  jia_ting_bei_jing: string
  qing_gan_jing_li: string
  shi_fou_zha_xing: boolean
  zha_fa_miao_shu?: string
  hua_shu?: string[]
  bao_lu_fang_shi?: string
  shi_po_xian_suo?: string[]
  shi_jie_xin_xi: Record<string, unknown>
  ba_da_mo_kuai: {
    ji_ben_xin_xi: string
    wai_mao: string
    xing_ge: string
    bei_jing: string
    yan_yu: string
    xing_wei: string
    guan_xi: string
    xi_tong_ti_shi: string
  }
}

export interface HaoGanDuXinXi {
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
  zong_fen: number
  guan_xi_jie_duan: string
}

export interface GongKaiHaoGanDuXinXi {
  jie_duan: string
  xin_qing: string
}

export interface WanZhengHaoGanDuXinXi extends HaoGanDuXinXi {
  yong_hu_id: string
  jiao_se_id: string
}

export interface DuiHuaLiShiXiang {
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  fa_song_zhe_ming: string
  nei_rong: string
  shi_jian: string
  yi_che_hui?: boolean
  yuan_shi_nei_rong?: string | null
}

export interface DirectorCeLue {
  yong_hu_yi_tu: string
  qing_gan_fen_xi: string
  hui_fu_ce_lue: string
  shi_fou_hui_fu: boolean
  hui_fu_tiao_shu: number
  shi_jian_qing_xu: string
  shi_fou_che_hui: boolean
}

export interface WriterJieGuo {
  xiao_xi_lie_biao: string[]
  yuan_wen?: string
}

export interface AIYinQingShuRu {
  yong_hu_id: string
  jiao_se_id: string
  jiao_se: AIJiaoSeXinXi
  hao_gan_du: HaoGanDuXinXi
  dui_hua_li_shi: DuiHuaLiShiXiang[]
  ji_yi_zhai_yao?: string
  yong_hu_xin_xiao_xi: string
  shi_fou_di_yi_lun: boolean
  shi_jian_chang_jing?: string
}

export interface AIYinQingShuChu {
  xiao_xi_lie_biao: string[]
  shi_fou_hui_fu: boolean
  shi_fou_che_hui: boolean
  ce_lue?: DirectorCeLue
  jiang_ji_mo_shi: boolean
  cuo_wu_xin_xi?: string
}

export interface QingGanFenXiJieGuo {
  fen_shu: number
  fen_xi?: string
}

export interface HaoGanDuPingPanJieGuo {
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
  li_you?: string
}

export interface AnQuanShenHeJieGuo {
  wei_gui: boolean
  yan_zhong_cheng_du?: 'qing_wei' | 'zhong_deng' | 'yan_zhong'
  lei_xing?: string
  li_you?: string
}

export interface JiYiZhaiYaoJieGuo {
  zhai_yao: string
  guan_jian_ci?: string[]
}

export interface GongJianShiJianJieGuo {
  shi_jian_lei_xing: string
  miao_shu: string
  que_xin_du?: number
}

export type YouXiJieGuoLeiXing =
  | 'sheng_li_ai_qing'
  | 'sheng_li_hu_shan_sheng_li'
  | 'sheng_li_shi_po'
  | 'sheng_li_shen_jing_bing'
  | 'shi_bai_guo_zao_biao_bai'
  | 'shi_bai_hu_shan_shi_bai'
  | 'shi_bai_cuo_wu_shi_po'
  | 'shi_bai_hao_gan_du_gui_ling'
  | 'shi_bai_ju_jue_biao_bai'
  | 'shi_bai_bei_qi_pian'
  | 'shi_bai_bei_zha_xing_qi_pian'
  | 'shi_bai_shen_jing_bing'

export interface YouXiJieShuJieGuo {
  jie_guo_lei_xing: YouXiJieGuoLeiXing
  zhuang_tai_wen_ben: string
  ke_ji_xu_liao_tian: boolean
  cheng_jiu?: string
}

export interface BiaoBaiJianCeJieGuo {
  shi_fou_biao_bai: boolean
  biao_bai_lei_xing: 'zhi_jie_biao_bai' | 'an_shi_biao_bai' | 'yao_qiu_que_li_guan_xi' | 'fei_biao_bai'
  que_xin_du: number
  li_you?: string
}

export interface HuShanJianCeJieGuo {
  shi_fou_hu_shan: boolean
  que_xin_du: number
  li_you?: string
}

export interface ShiPoJianCeJieGuo {
  shi_fou_shi_po: boolean
  que_xin_du: number
  li_you?: string
}

export interface ShenJingBingJianCeJieGuo {
  shi_fou_shen_jing_bing: boolean
  fa_san_si_wei_ren_she: boolean
  que_xin_du: number
  li_you?: string
}

export interface YongHuXiaoXiJianCeJieGuo {
  biao_bai: BiaoBaiJianCeJieGuo
  hu_shan: HuShanJianCeJieGuo
  shi_po: ShiPoJianCeJieGuo
  shen_jing_bing: ShenJingBingJianCeJieGuo
}

export interface DirectorCeLue {
  yong_hu_yi_tu: string
  qing_gan_fen_xi: string
  hui_fu_ce_lue: string
  shi_fou_hui_fu: boolean
  hui_fu_tiao_shu: number
  shi_jian_qing_xu: string
  shi_fou_che_hui: boolean
  shi_fou_zhu_dong_biao_bai?: boolean
}

export interface TongZhi {
  id: string
  fa_song_zhe_id: string | null
  jie_shou_zhe_id: string
  biao_ti: string
  nei_rong: string
  yi_du: boolean
  chuang_jian_shi_jian: string
  yi_du_shi_jian: string | null
}

export interface JunShiQiuZhuCanShu {
  yong_hu_id: string
  jiao_se_id: string
  jiao_se_ming: string
  dui_hua_li_shi: DuiHuaLiShiXiang[]
  hao_gan_du: HaoGanDuXinXi
  fu_pan_tiao_mu?: string[]
  jun_shi_pei_zhi: {
    id: string
    mingCheng: string
    xiTongTiShi: string
  }
}

export interface JunShiQiuZhuJieGuo {
  zhi_dao_nei_rong: string
}
