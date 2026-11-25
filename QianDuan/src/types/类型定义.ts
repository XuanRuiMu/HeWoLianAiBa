import type { 性别内部形态, 性别展示形态, 性别用户形态 } from '@/utils/性别'
import type { 管理角色, 管理能力 } from '@/utils/角色能力'

export interface ApiXiangYing<T> {
  cheng_gong: boolean
  shu_ju: T | null
  ti_shi?: string
  cuo_wu_ma?: string
  code?: string
  message?: string
  traceId?: string
  retryable?: boolean
  retryAfterMs?: number
}

export type XingBie = 性别用户形态

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

export type XiaoXiKuaiLeiXing = 'wenzi' | 'tupian'

export interface XiaoXiKuai {
  lei_xing: XiaoXiKuaiLeiXing
  nei_rong?: string
  mei_ti_id?: string | null
}

export interface XiaoXiKuaiChuCan extends XiaoXiKuai {
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
}

export interface Xiaoxi {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  ai_biao_shi?: boolean
  nei_rong: string
  lei_xing:
    | 'wenben'
    | 'xitong'
    | 'neiXinHuoDong'
    | 'tuPian'
    | 'biaoQingBao'
    | 'yuYin'
    | 'wenJian'
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
  ke_hu_duan_id?: string
  ke_hu_duan_xu_hao?: number | null
  mi_deng_jian?: string | null
  nei_rong_kuai?: XiaoXiKuaiChuCan[] | null
  bei_yong_xiao_xi_id?: string | null
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
  ben_di_yu_lan_url?: string | null
  ben_di_da_xiao_zi_jie?: number | null
}

export type DuoMeiTiLeiXing = 'tuPian' | 'biaoQingBao' | 'yuYin' | 'wenJian'

export interface TongGuanXinXi {
  lei_xing: string
  xiao_xi: string
  ke_ji_xu_liao_tian?: boolean
}

export interface Jiaose {
  id: string
  ming_zi: string
  xing_bie: 性别内部形态
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
  voice_id?: string
}

export interface ShengChengJiaoSeJieGuo {
  id?: string
  jiao_se_id?: string
  ming_zi: string
  xing_bie: 性别内部形态
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
  wei_xin_ming: string
  zhen_shi_ming: string
  te_zheng_miao_shu?: string
  di_yi_ju_hua?: string
  zha_fa_miao_shu?: string
  hua_shu?: string[]
  bao_lu_fang_shi?: string
  shi_po_xian_suo?: string[]
  yao_kai_kou?: boolean
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
  guan_xi_jie_duan: string
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

export interface JunShiZhiDaoFenDuan {
  dangQianJuMian: string
  xiaYiBuZenMeHui: string
  weiShenMeZheMeLiao: string
  kanDaoDeJiXiang: string
  guLi: string
}

export interface JunShiZhiDaoJieGuo {
  junShi: JunShiXinXi
  zhiDaoNeiRong: string
  zhiDaoFenDuan?: JunShiZhiDaoFenDuan | null
  shiJian: string
}

export type JunShiZhiDaoZhuangTai = 'zhi_dao_zhong' | 'yi_wan_cheng'

export interface JunShiZhiDaoZhuangTaiXinXi {
  zhuang_tai: JunShiZhiDaoZhuangTai
  jun_shi_id: string
  kai_shi_shi_jian: string
  jie_guo?: JunShiZhiDaoJieGuo
  cuo_wu_ma?: string
  youLiaoTianJiLu: boolean
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
  che_hui_shi_jian?: string | null
}

export interface JunShiJiLu {
  jian_yi: string
  jian_yi_fen_duan?: JunShiZhiDaoFenDuan | null
  shi_jian: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  jun_shi_id: string
  jun_shi_ming_chen: string
  jun_shi_tou_xiang?: string
  dui_hua_zhai_yao?: string
  liao_tian_ji_lu?: JunShiJiLuLiaoTianXiaoXi[]
}

export interface ZhanJiFenLei {
  id: string
  name: string
  is_default: boolean
  record_count: number
  version: number
  sort_order: number
}

export interface ZhanJiFenLeiLieBiao {
  moRenFenLeiId: string
  fenLeiLieBiao: ZhanJiFenLei[]
}

export interface ZhanJiFenLeiShanChuJieGuo {
  deleted_id: string
  fallback_category_id: string
  moved_record_count: number
}

export interface ZhanJiDangAnYiDongJieGuo {
  record_id: string
  source_category_id: string
  category_id: string
  sort_order: number
  source_version: number
  target_version: number
}

export interface ZhanJiFenLeiPaiXuJieGuo {
  category_id: string
  record_ids: string[]
  version: number
}

export interface ZhanJiZuiHouXiaoXi {
  shi_jian: string
  fa_song_zhe: 'yonghu' | 'jiaose'
  zhai_yao: string
}

export interface DangAnXiangQing {
  id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing?: boolean
  tou_xiang_biao_ji?: string
  jie_guo_lei_xing: string
  jie_guo_lei_xing_yuan: string
  shi_fou_feng_cun: boolean
  liao_tian_tian_shu: number
  xiao_xi_zong_shu: number
  fu_pan_shu_ju: FuPanTiaoMu[] | null
  fu_pan_nei_rong?: string | null
  chuang_jian_shi_jian: string
  zui_hou_xiao_xi_shi_jian: string | null
  you_xi_jie_shu_shi_jian: string | null
  sui_ji_xing_ge?: boolean
  mbti_lei_xing?: string
  jun_shi_ji_lu: JunShiJiLu[]
  category_id: string
  sort_order: number
  zui_hou_liang_tiao?: ZhanJiZuiHouXiaoXi[] | null
}

export interface FuPanTiaoMu {
  shi_jian: string
  shi_jian_miao_shu: string
  yong_hu_xiao_xi: string
  ai_hui_fu: string
  ai_xin_li_huo_dong: string
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

export const XingGeXuanZeMap: Record<XingGeXuanZe, string> = {
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

export const RenSheBiaoQianMap: Record<RenSheBiaoQian, string> = {
  neiLianXueBa: '内敛学霸',
  huoPoSheJiaoDaRen: '活泼社交达人',
  wenYiQingNian: '文艺青年',
  liGongZhiNan: '理工直男/女',
  wenRouQingTingZhe: '温柔倾听者',
  youMoHuaLao: '幽默话痨',
}

export type FanKuiLeiBie =
  | 'jiaoSeBuHeShi'
  | 'huiFuBuHeShi'
  | 'neiRongBuDang'
  | 'xiTongGuZhang'
  | 'qiTaJianYi'
  | 'yuYin'
  | 'aiLiaoTian'
  | 'biaoQingBao'
  | 'gongNengYiChang'
  | 'jieMianXianShi'
  | 'qiTa'
  | 'tiYanJianYi'
  | string

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

export const FanKuiLeiBieMap: Partial<Record<FanKuiLeiBie, string>> = {
  jiaoSeBuHeShi: '角色不合适',
  huiFuBuHeShi: '回复不合适',
  neiRongBuDang: '内容不当',
  xiTongGuZhang: '系统故障',
  qiTaJianYi: '其他建议',
  yuYin: '语音',
  aiLiaoTian: 'AI聊天',
  biaoQingBao: '表情包',
  gongNengYiChang: '功能异常',
  jieMianXianShi: '界面显示',
  qiTa: '其他',
  tiYanJianYi: '体验建议',
}

export type 用户 = Yonghu
export type 登录状态 = Dengluzhuangtai
export type 消息 = Xiaoxi
export type 角色 = Jiaose
export type 通知 = TongZhi
export type 档案详情 = DangAnXiangQing
export type MBTI类型 = MBTILeiXing
export type 性格选择 = XingGeXuanZe
export const 性格选择映射 = XingGeXuanZeMap
export type 人设标签 = RenSheBiaoQian
export type 性别 = XingBie

export interface FanKuiSheBeiXinXi {
  yeMian?: string
  yuYan?: string
  pingTai?: string
  shiQu?: string
  shiKouKuanGao?: number
  shiKouGaoDu?: number
  pingMuKuan?: number
  pingMuGao?: number
  xiangSuBi?: number
  shiJianChuo?: number
}

export interface XiaoXiYinYongKuaiZhao {
  xiao_xi_id: string
  lei_xing: string
  zhai_yao: string
  fa_song_zhe_lei_xing: string
  shi_jian_chuo?: number
  mei_ti_id?: string
  url?: string
  mei_ti_url?: string
  mei_ti_shi_chang_hao_miao?: number
  lai_yuan?: string
}

export interface BiaoQingBaoYinYongKuaiZhao {
  mei_ti_id: string
  url?: string
  mei_ti_url?: string
  lai_yuan: string
  duan_ming?: string
}

export type FanKuiXiaoXiLeiXing = 'wenben' | 'wenzi' | 'tuPian' | 'tupian' | 'yuYin' | 'yinpin' | 'shipin' | 'biaoQingBao' | 'biaoqingbao' | 'wenJian' | 'xitong' | 'neiXinHuoDong' | 'neixinhuodong' | 'tiaozhan' | string

export interface WoDeFanKuiXiang {
  id: string
  fen_lei: string
  zhuang_tai: string
  zheng_wen_zhai_yao: string
  guan_li_bei_zhu: string | null
  chuang_jian_shi_jian: string
}

export interface FanKuiGuanLiXiang {
  id: string
  yong_hu_ni_cheng: string | null
  yong_hu_shou_ji_hao_yan_ma: string
  ye_mian_biao_shi: string
  fen_lei: string
  man_yi_du: number | null
  zheng_wen: string
  biao_qian: string[]
  xiao_xi_yin_yong: unknown[]
  biao_qing_bao_yin_yong: unknown[]
  she_bei_xin_xi: FanKuiSheBeiXinXi
  zhuang_tai: string
  guan_li_bei_zhu: string | null
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
}

export interface FanKuiTongJi {
  zong_shu: number
  jin_7_tian_shu: number
  zhuang_tai_shu: Record<string, number>
  fen_lei_shu: Record<string, number>
}

export interface FanKuiTiJiao {
  ye_mian_biao_shi: string
  fen_lei: string
  man_yi_du?: number
  zheng_wen: string
  biao_qian: string[]
  xiao_xi_yin_yong: Array<XiaoXiYinYongKuaiZhao & { lei_xing: FanKuiXiaoXiLeiXing }> | XiaoXiYinYongKuaiZhao[]
  biao_qing_bao_yin_yong: BiaoQingBaoYinYongKuaiZhao[]
  she_bei_xin_xi: FanKuiSheBeiXinXi
}

export type FanKuiZhuangTai = 'xinJian' | 'chuLiZhong' | 'yiJieJue' | 'yiJuJue' | string

export const FanKuiZhuangTaiMap: Record<FanKuiZhuangTai, string> = {
  xinJian: '新建',
  chuLiZhong: '处理中',
  yiJieJue: '已解决',
  yiJuJue: '已拒绝',
}
