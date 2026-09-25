import type { 性别内部形态, 性别展示形态, 性别用户形态 } from '@/utils/性别'
import type { GuanLiJiaoSe, GuanLiNengLi } from '@/utils/角色能力'

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
  // FP-28b：后端 /信息 与登录/注册的 用户 出参不再有 xing_bie 键（用户.性别 死列收口）。
  // 用户侧性别的唯一出参口径是 mo_ren_xing_bie（用户.默认性别）；角色性别看 Jiaose.xing_bie，两码事。
  /** 用户.目标性别 由后端以展示形态落库（内部转展示），非 male/female */
  mu_biao_xing_bie: 性别展示形态 | null
  mo_ren_xing_bie: XingBie | null
  xing_ge_xuan_ze: XingGeXuanZe | null
  ren_she_biao_qian: RenSheBiaoQian | null
  yun_xu_zha_nan_zha_nv: boolean
  tou_xiang: string | null
  sheng_ri: string | null
  qian_ming: string | null
  /** FP-18 服务端按用户表三旗标推导的管理角色，无管理身份为 null；不再回传 guan_li_yuan 二值 */
  jiao_se: GuanLiJiaoSe | null
  /** 服务端下发的能力位（视图门唯一依据）；缺省/未知一律按无能力处理 */
  neng_li: GuanLiNengLi[]
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

/**
 * FP-10b（缺陷9）消息内容块 —— 与 backend/src/services/消息内容块.ts 同一契约。
 * 块类型是一个**独立命名空间**（只允许 wenzi/tupian），既不是消息类型（tuPian/biaoQingBao/…），
 * 也不是媒体类别（tupian/biaoqingshu/yuyin/wenjian）；三者的对应表只在服务端存在，前端不建第二份。
 */
export type XiaoXiKuaiLeiXing = 'wenzi' | 'tupian'

/** 提交形态：只允许携带正文与媒体 ID，地址一律由服务端签发（防越权直传 URL） */
export interface XiaoXiKuai {
  lei_xing: XiaoXiKuaiLeiXing
  nei_rong?: string
  mei_ti_id?: string | null
}

/** 出参形态：服务端在图片块上补签名地址与媒体类别 */
export interface XiaoXiKuaiChuCan extends XiaoXiKuai {
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
}

export interface Xiaoxi {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  /** C1 GB 45438-2025 隐式元数据标识：AI 生成消息为 true（机器可读，禁止渲染或移除） */
  ai_biao_shi?: boolean
  nei_rong: string
  /**
   * FP-10b 拼写债收口：这里曾是 `'tupian'` / `'tuPian'` 两套并存。`'tupian'` 是**媒体类别**
   * （媒体文件.类别 的 CHECK 值域，见 database/000_baseline.sql:275 与
   * api/聊天.ts::DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE）被误写进**消息类型**值域，
   * 故删除该非法成员，消息侧图片码唯一权威值是 `'tuPian'`（由 config/消息配置.ts::MEI_TI_XIAO_XI_LEI_XING 单源）。
   * 读取边界的归一见 utils/消息内容块.ts::guiYiXiaoXiLeiXing —— 归一只发生在读取，已落库行的语义不变。
   *
   * 值域由谁守护（FP-22f 更正；**旧注释的「后端 `消息`.`类型` 的 CHECK 从来只允许 …」是假前提**）：
   *  `消息`.`类型` 在 `database/000_baseline.sql:88` 与 `backend/database/init.sql:82` 两处建表语句里
   *  都是裸 `VARCHAR(20) DEFAULT 'wenBen'`，**没有任何 CHECK**（有 CHECK 的是 `好友消息`.`类型`，
   *  见 `database/001_haoyou_yu_shezhi.sql:39` 与 `backend/database/migrations/027_好友消息媒体ID统一UUID外键.sql:82`）；
   *  上面那五个值（wenben/tuPian/biaoQingBao/yuYin/wenJian）的真实来源是应用层发送白名单
   *  `backend/src/config/媒体配置.ts:102` 的 `YUN_XU_XIAO_XI_LEI_XING`，判定在 `services/消息.ts:516`。
   *  另有 4 处生产 INSERT 全部显式写 `"类型"`（`services/消息.ts:590`/`:805`、`services/AI输入准备.ts:221`、
   *  `services/通话.ts:77`），所以 DB 默认值 `'wenBen'`（注意大写 B，**不在本联合类型里**）落不到行上
   *  —— FP-22f 在本地库实测 217 行的类型分布为 wenben212/tuPian2/biaoQingBao1/wenJian1/yuYin1，
   *  无 `'wenBen'` 也无 NULL 行；但这是「当前没人踩」，不是「有约束挡着」：
   *  一旦有人写出不带 `"类型"` 的 INSERT，它就会绕过全部守护进库，而 `guiYiXiaoXiLeiXing` 对
   *  `'wenBen'` 是原样返回（只归一 tupian/biaoqingbao/yuyin/wenjian 四个媒体类别形态）⇒ 值域事实由
   *  这两层应用代码承担，不存在的 DB 约束不可作为依据。守卫见 `__tests__/FP22fSQL列集合三方一致.test.ts`。
   */
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
  /**
   * FP-26：撤回原文。它**只对具备 cha_kan 运营读取能力的调用者出现**（后端 services/消息出参收口
   * 按能力整键剥离），普通用户的会话列表里该键根本不存在。渲染层零消费点，
   * 账本见 `__tests__/FP22运营字段前端无依赖.test.ts`；要新增加展示必须先回 PROGRESS 取裁决。
   */
  yuan_shi_nei_rong?: string
  fa_song_zhong?: boolean
  ke_hu_duan_id?: string
  /** 服务端事务内权威分配的排序序号（FP-09 起前端不再自增伪造，只做读取与分页游标） */
  ke_hu_duan_xu_hao?: number | null
  /** FP-09b 投递幂等键：客户端为每条待发消息生成的稳定 UUID，重发复用同一把，服务端唯一约束据此去重 */
  mi_deng_jian?: string | null
  /**
   * FP-10b（缺陷9）顺序化内容块：出参恒非空（服务端对历史行按 内容+媒体ID+类型 反构），
   * 前端仍按「可能缺失」处理，缺失时由 utils/消息内容块.ts 自行反构，绝不因缺字段渲染成空气泡。
   */
  nei_rong_kuai?: XiaoXiKuaiChuCan[] | null
  /**
   * FP-08a（缺陷5）引用槽：本条消息引用的**同会话另一条消息** ID，null/缺失 = 未引用。
   * 服务端只下发身份、不下发摘要副本（摘要落第二处存就必然与原文漂移），
   * 呈现所需的原文/发送者/撤回态一律按本 ID 在会话消息列表内解析（列表本就整会话下发）。
   * 写侧由 `api/聊天.ts::faSongXiaoXi` 的第 7 位 `yinYong` 透传，
   * 五道非法形态（非 UUID / 不存在 / 跨会话 / 跨用户 / 已撤回）一律 4xx，不会静默丢引用。
   */
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

export interface JunShiZhiDaoFenDuan {
  dangQianJuMian: string
  xiaYiBuZenMeHui: string
  weiShenMeZheMeLiao: string
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
  /** FP-26：撤回原文不再随军师记录下发（该面普通用户可读），故本类型不带 `yuan_shi_nei_rong` */
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

export interface DangAnXiangQing {
  id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing: boolean
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
