export interface ApiXiangYing<T> {
  cheng_gong: boolean
  shu_ju: T | null
  ti_shi?: string
  cuo_wu_ma?: string
}

export type GuanxiJieduan =
  | 'lengDan'
  | 'shuYuan'
  | 'renShi'
  | 'shuXi'
  | 'pengYou'
  | 'haoYou'
  | 'aiMei'
  | 'xinDong'
  | 'reLian'
  | 'shenAi'

export type XingBie = 'male' | 'female'

export type MBTILeiXing =
  | 'ISTJ'
  | 'ISFJ'
  | 'INFJ'
  | 'INTJ'
  | 'ISTP'
  | 'ISFP'
  | 'INFP'
  | 'INTP'
  | 'ESTP'
  | 'ESFP'
  | 'ENFP'
  | 'ENFJ'
  | 'ENTJ'
  | 'ESTJ'
  | 'ESFJ'
  | 'ENTP'

export type XingGeXuanZe = MBTILeiXing

export type RenSheBiaoQian =
  | 'neiLianXueBa'
  | 'huoPoSheJiaoDaRen'
  | 'wenYiQingNian'
  | 'liGongZhiNan'
  | 'wenRouQingTingZhe'
  | 'youMoHuaLao'

export interface Yonghu {
  id: string
  shou_ji_hao: string
  yong_hu_ming: string | null
  ni_cheng: string | null
  xing_bie: XingBie | null
  mu_biao_xing_bie: XingBie | null
  xing_ge_xuan_ze: XingGeXuanZe | null
  ren_she_biao_qian: RenSheBiaoQian | null
  yun_xu_zha_nan_zha_nv: boolean
  tou_xiang: string | null
  sheng_ri: string | null
  qian_ming: string | null
  guan_li_yuan: boolean
  huo_yue_ren_she_id: string | null
  hai_wang_fen_shu: number
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
}

export interface DengLuXiangYing {
  令牌: string
  用户: Yonghu
  新用户: boolean
  是否管理员: boolean
}

export interface Xiaoxi {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  nei_rong: string
  lei_xing: 'wenben' | 'tupian' | 'xitong' | 'neiXinHuoDong'
  shi_jian_chuo: number
  yi_du: boolean
  zheng_zai_da_zi?: boolean
  jiao_se_se?: string
  chuang_jian_shi_jian?: string
  tong_guan_xin_xi?: TongGuanXinXi | null
  yi_che_hui?: boolean
  che_hui_shi_jian?: string
  yuan_shi_nei_rong?: string
  fa_song_zhong?: boolean
}

export interface TongGuanXinXi {
  lei_xing: string
  xiao_xi: string
  ke_ji_xu_liao_tian?: boolean
}

export interface Jiaose {
  id: string
  ming_zi: string
  xing_bie: 'nan' | 'nv'
  nian_ling: number
  wai_mao: string
  xing_ge: string
  bei_jing_gu_shi: string
  xi_hao: string[]
  yan_yu_feng_ge: string
  tou_xiang: string
  bei_jing_tu: string | null
  biao_qian: string[]
  re_du: number
  chuang_jian_shi_jian: string
  mbti_lei_xing?: MBTILeiXing
  shi_fou_zha_xing?: boolean
  kai_chang_bai?: string[]
  wei_xin_ming?: string
  zhen_shi_ming?: string
  yu_she_lei_xing?: string
  ie_lei_xing?: string
  re_shen_lei_xing?: string
  sui_ji_xing_ge?: boolean
  shi_jie_xin_xi?: Record<string, unknown>
  xi_huan_de_lei_xing?: string
  jia_ting_bei_jing?: string
  qing_gan_jing_li?: string
  zhi_ye?: string
  cheng_shi?: string
  zha_fa_miao_shu?: string
  hua_shu?: string[]
  bao_lu_fang_shi?: string
  shi_po_xian_suo?: string[]
}

export interface ShengChengJiaoSeJieGuo {
  id?: string
  jiao_se_id?: string
  ming_zi: string
  xing_bie: 'nan' | 'nv'
  nian_ling: number
  wai_mao: string
  xing_ge: string
  bei_jing_gu_shi: string
  xi_hao: string[]
  yan_yu_feng_ge: string
  tou_xiang: string
  biao_qian: string[]
  yu_she_lei_xing: XingGeXuanZe
  mbti_lei_xing: MBTILeiXing
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: 'slow' | 'fast'
  shi_fou_zha_xing: boolean
  kai_chang_bai: string[]
  wei_xin_ming: string
  zhen_shi_ming: string
  te_zheng_miao_shu?: string
  di_yi_ju_hua?: string
  zha_fa_miao_shu?: string
  hua_shu?: string[]
  bao_lu_fang_shi?: string
  shi_po_xian_suo?: string[]
}

export interface HaoGanDu {
  id: string
  yong_hu_id: string
  jiao_se_id: string
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
  zong_fen: number
  guan_xi_jie_duan: string
  hu_dong_ci_shu: number
  zui_hou_hu_dong_shi_jian: string
  chuang_jian_shi_jian: string
  zui_hou_ai_xiao_xi_shi_jian: string | null
  zui_hou_yong_hu_hui_fu_shi_jian: string | null
  chao_shi_ci_shu: number
}

export interface QingganZhuangtai {
  jiao_se_id: string
  yong_hu_id: string
  qin_mi_du: number
  guan_xi_jie_duan: GuanxiJieduan
  xin_ren_du: number
  hao_gan_du: number
  jie_suo_dui_hua: string[]
  zui_hou_hu_dong_shi_jian: number
}

export interface HuiHua {
  id: string
  jiao_se_id: string
  yong_hu_id: string
  kai_shi_shi_jian: number
  zui_hou_xiao_xi_shi_jian: number
  wei_du_xiao_xi_shu: number
}

export interface Dengluzhuangtai {
  deng_lu_zhong: boolean
  cuo_wu_xin_xi: string | null
}

export interface JunShiXinXi {
  id: string
  mingCheng: string
  fuBiaoTi: string
  biaoQian: string
  miaoShu: string
  touXiang: string
}

export interface JunShiZhiDaoJieGuo {
  junShi: JunShiXinXi
  zhiDaoNeiRong: string
  shiJian: string
}

export interface JunShiJianYi {
  id?: string
  jian_yi?: string
  jun_shi_id?: string
  jun_shi_ming_chen?: string
  mingCheng?: string
  ming_chen?: string
  cheng_hao?: string
  fuBiaoTi?: string
  biaoQian?: string
  biao_qian?: string
  touXiang?: string
  tou_xiang?: string
  hou_tai_shu_ju?: {
    hao_gan_du: {
      zong_fen: number
      xin_ren_du: number
      qin_mi_du: number
      qu_wei_du: number
      guan_huai_du: number
      guan_xi_jie_duan: string
      guan_xi_jie_duan_ming_cheng: string
    }
  }
}

export interface JunShiJiLuXiaoXi {
  jiao_se: string
  nei_rong: string
}

export interface JunShiJiLuLiaoTianXiaoXi {
  jiao_se: string
  nei_rong: string
  shi_jian: string
  yi_che_hui: boolean
  yuan_shi_nei_rong?: string | null
  che_hui_shi_jian?: string | null
}

export interface JunShiJiLuHouTaiShuJu {
  haoGanDu: {
    zongFen: number
    xinRenDu: number
    qinMiDu: number
    quWeiDu: number
    guanHuaiDu: number
    guanXiJieDuan: string
    guanXiJieDuanMingCheng: string
  }
  fuPanShuJu: FuPanTiaoMu[]
}

export interface JunShiJiLu {
  jian_yi: string
  shi_jian: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  jun_shi_id: string
  jun_shi_ming_chen: string
  jun_shi_tou_xiang?: string
  dui_hua_zhai_yao?: string
  xiao_xi_zhao_pian?: string
  liao_tian_ji_lu?: JunShiJiLuLiaoTianXiaoXi[]
  hou_tai_shu_ju?: JunShiJiLuHouTaiShuJu
}

export interface DangAnXiangQing {
  id: string
  yong_hu_id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing: boolean
  jie_guo_lei_xing: string
  jie_guo_lei_xing_yuan: string
  shi_fou_feng_cun: boolean
  hao_gan_du_zong_fen: number
  guan_xi_jie_duan: string
  liao_tian_tian_shu: number
  xiao_xi_zong_shu: number
  fu_pan_shu_ju: FuPanTiaoMu[] | null
  fu_pan_nei_rong?: string | null
  chuang_jian_shi_jian: string
  zui_hou_xiao_xi_shi_jian: string | null
  sui_ji_xing_ge?: boolean
  mbti_lei_xing?: string
}

export interface FuPanTiaoMu {
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
  }
}

export interface RenShe {
  id: string
  yong_hu_id: string
  ming_cheng: string
  miao_shu: string
  te_zhi: string[]
  shuo_hua_feng_ge: string
  bei_jing_gu_shi: string
  shi_fou_yu_she: boolean
  shi_fou_huo_yue: boolean
  chuang_jian_shi_jian: string
}

export const GUANXI_JIEDUAN_MAP: Record<GuanxiJieduan, string> = {
  lengDan: '冷淡',
  shuYuan: '疏远',
  renShi: '认识',
  shuXi: '熟悉',
  pengYou: '朋友',
  haoYou: '好友',
  aiMei: '暧昧',
  xinDong: '心动',
  reLian: '热恋',
  shenAi: '深爱',
}

export const GUANXI_JIEDUAN_ORDER: GuanxiJieduan[] = [
  'lengDan',
  'shuYuan',
  'renShi',
  'shuXi',
  'pengYou',
  'haoYou',
  'aiMei',
  'xinDong',
  'reLian',
  'shenAi',
]

export const XING_BIE_MAP: Record<XingBie, string> = {
  male: '男',
  female: '女',
}

export const XING_GE_XUAN_ZE_MAP: Record<XingGeXuanZe, string> = {
  ISTJ: '物流师',
  ISFJ: '守护者',
  INFJ: '提倡者',
  INTJ: '战略家',
  ISTP: '鉴赏家',
  ISFP: '探险家',
  INFP: '调停者',
  INTP: '逻辑学家',
  ESTP: '企业家',
  ESFP: '表演者',
  ENFP: '竞选者',
  ENFJ: '主人公',
  ENTJ: '指挥官',
  ESTJ: '总经理',
  ESFJ: '执政官',
  ENTP: '辩论家',
}

export const REN_SHE_BIAO_QIAN_MAP: Record<RenSheBiaoQian, string> = {
  neiLianXueBa: '内敛学霸',
  huoPoSheJiaoDaRen: '活泼社交达人',
  wenYiQingNian: '文艺青年',
  liGongZhiNan: '理工直男/女',
  wenRouQingTingZhe: '温柔倾听者',
  youMoHuaLao: '幽默话痨',
}

export const HAO_GAN_DU_CENG_JI_MAP: Record<
  string,
  { min: number; max: number; ming_cheng: string }
> = {
  lengDan: { min: 0, max: 100, ming_cheng: '冷淡' },
  shuYuan: { min: 101, max: 200, ming_cheng: '疏远' },
  renShi: { min: 201, max: 300, ming_cheng: '认识' },
  shuXi: { min: 301, max: 400, ming_cheng: '熟悉' },
  pengYou: { min: 401, max: 500, ming_cheng: '朋友' },
  haoYou: { min: 501, max: 600, ming_cheng: '好友' },
  aiMei: { min: 601, max: 700, ming_cheng: '暧昧' },
  xinDong: { min: 701, max: 800, ming_cheng: '心动' },
  reLian: { min: 801, max: 900, ming_cheng: '热恋' },
  shenAi: { min: 901, max: 1000, ming_cheng: '深爱' },
}

export type FanKuiLeiBie =
  | 'jiaoSeBuHeShi'
  | 'huiFuBuHeShi'
  | 'neiRongBuDang'
  | 'xiTongGuZhang'
  | 'qiTaJianYi'

export interface FanKuiTiJiao {
  jiao_se_id: string
  lei_bie: FanKuiLeiBie
  nei_rong: string
  xiao_xi_duan_luo?: string
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

export const FAN_KUI_LEI_BIE_MAP: Record<FanKuiLeiBie, string> = {
  jiaoSeBuHeShi: '角色不合适',
  huiFuBuHeShi: '回复不合适',
  neiRongBuDang: '内容不当',
  xiTongGuZhang: '系统故障',
  qiTaJianYi: '其他建议',
}

export function huoQuHaoGanDuCengJi(haoGanDu: number): string {
  for (const [, dingYi] of Object.entries(HAO_GAN_DU_CENG_JI_MAP)) {
    if (haoGanDu >= dingYi.min && haoGanDu <= dingYi.max) return dingYi.ming_cheng
  }
  return '冷淡'
}

export type 用户 = Yonghu
export type 登录状态 = Dengluzhuangtai
export type 消息 = Xiaoxi
export type 角色 = Jiaose
export type 通知 = TongZhi
export type 档案详情 = DangAnXiangQing
export type MBTI类型 = MBTILeiXing
export type 性格选择 = XingGeXuanZe
export const 性格选择映射 = XING_GE_XUAN_ZE_MAP
export type 人设标签 = RenSheBiaoQian
export type 性别 = XingBie
