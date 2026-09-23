import type { 性别内部形态 } from '../utils/性别'
import type { GuanLiJiaoSe, GuanLiNengLi } from '../utils/角色能力'
import type { XiaoXiKuaiChuCan } from '../services/消息'

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
  // FP-28b：不再有 xing_bie 键（用户.性别 死列出参收口）；用户侧性别只看 mo_ren_xing_bie
  mu_biao_xing_bie: string | null
  xing_ge_xuan_ze: string | null
  ren_she_biao_qian: string | null
  yun_xu_zha_nan_zha_nv: boolean
  tou_xiang: string | null
  sheng_ri: string | null
  qian_ming: string | null
  jiao_se: GuanLiJiaoSe | null
  neng_li: GuanLiNengLi[]
  ce_shi?: boolean
  huo_yue_ren_she_id: string | null
  hai_wang_fen_shu: number
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
  mo_ren_xing_bie: string | null
  mi_ma?: string
  tu_pian_shou_quan?: boolean
}

export interface DengLuXiangYing {
  令牌: string
  刷新令牌?: string
  刷新令牌ID?: string
  用户: YongHuXinXi
  新用户: boolean
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
  xing_bie: 性别内部形态
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
  voice_id?: string
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
  互动次数?: number
}

export interface GongKaiHaoGanDuXinXi {
  jie_duan: string
  xin_qing: string
}

export interface WanZhengHaoGanDuXinXi extends HaoGanDuXinXi {
  yong_hu_id: string
  jiao_se_id: string
}

/** FP-12：文档正文提取的结果形态（`services/文档文本提取` 产出、`services/对话渲染` 消费） */
export interface DuiHuaWenJianTiQu {
  /** 已按码点截断到 config 上限的纯文本 */
  wenBen: string
  /** 是否因超出 `tiQuWenBenZiFuShangXian` 而被截断 */
  beiCaiDuan: boolean
}

export interface DuiHuaLiShiXiang {
  /** 消息行 ID：FP-09 起用于把「本轮焦点消息」精确锁定到触发本轮的那一条 */
  id?: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  fa_song_zhe_ming: string
  nei_rong: string
  shi_jian: string
  /**
   * FP-26：撤回原文**不进模型语料**，本类型自始不携带该字段（旧 `yuan_shi_nei_rong` 键已删）。
   * 撤回行由 `services/对话渲染` 渲染成既有撤回占位；库里的 `原始内容` 列保留，
   * 只作运营读取面的数据源，不再被任何模型装配口读取。
   */
  yi_che_hui?: boolean
  meiTiLeiBie?: string
  meiTiSha256?: string
  meiTiMIME?: string
  meiTiShiChangHaoMiao?: number | null
  yuanShiWenJianMing?: string
  /** FP-12：本行引用的媒体行 ID（文档正文提取按它批量取 媒体文件 行，不再各路径自带第二套查表） */
  meiTiId?: string
  /**
   * FP-12：阈值内文档消息的提取正文（已由 services/文档文本提取 按码点截断）。
   * 只由那一个补全口写入、只由 services/对话渲染 那唯一入口消费；
   * 缺失/为 null ⇒ 该条仍按 `[文件:名]` 占位呈现（不支持、超阈值、解析失败都是这个形态）。
   */
  wenJianTiQu?: DuiHuaWenJianTiQu | null
  /**
   * FP-10（缺陷9）：本行的 内容 是**有序图文块**的投影（同时含文字块与图片块）。
   * 此时 内容 里已经按用户排的顺序内联了载体占位符，任何「媒体消息 ⇒ 用单个占位符覆盖正文」
   * 的旧读取分支都必须让位，否则模型看到的是只剩 [图片] 的半条消息。
   */
  tuWenHunPai?: boolean
  /**
   * FP-08c（缺陷5）引用槽身份：本条引用的另一条消息 ID。
   * 只带身份、不带摘要副本（摘要落第二处存就必然与原文漂移）；渲染时由
   * `services/对话渲染` 按它在**整会话列表**里现取原文。
   */
  beiYongXiaoXiId?: string | null
  /**
   * 该会话的消息总条数（取数时由 COUNT(*) OVER() 带出，同一次取数内恒定）。
   * 历史窗口的淘汰边界要按总条数量化，才能做到「攒满一个步长才整体前移」；
   * 若只按取到的数组长度对齐，取数窗口每轮滑动一条就会让前缀每轮都变。
   */
  duiHuaZongTiaoShu?: number
}

/**
 * FP-21（迁移 036）：`GET /api/好友/消息/:haoYouId` 的单行出参形态。
 * 这里是好友出参形态的**唯一声明处**（`routes/好友.ts` 只实现、不再自带一份 interface），
 * 两个新键与 AI 侧 `services/消息.ts::XiaoXiXinXi` 同名同形 —— 名字一致是前端两页
 * 能共用 `frontend/src/utils/消息内容块` 那一份真源的前提；各起一个名字就会在接线当天分裂。
 * 键集合的绝对值由 `backend/src/routes/__tests__/FP21好友引用与内容块.test.ts` 钉死。
 */
export interface HaoYouXiaoXiChuCan {
  id: string
  fa_song_zhe_id: string
  jie_shou_zhe_id: string
  /** `nei_rong_kuai` 的兼容投影（文字块原文 + 图片块载体占位符），逐字不变地继续给老读取方 */
  nei_rong: string
  lei_xing: string
  /** 恒非空：库里有块就采信，历史行/旧客户端按 内容 + 媒体ID + 类型 反构等价块数组 */
  nei_rong_kuai: XiaoXiKuaiChuCan[]
  /**
   * 引用槽：恒在（未引用是 null，不是缺键）。只下发身份、不下发摘要副本 ——
   * 摘要一律由消费方按该 ID 在本列表内现取（列表本就整段下发这一对好友的消息）。
   */
  bei_yong_xiao_xi_id: string | null
  mei_ti_id: string | null
  /** 签名主体是**当前读者**；已撤回行一律 null（留着等于让撤回失效） */
  mei_ti_url: string | null
  mei_ti_lei_bie: string | null
  mei_ti_yuan_shi_wen_jian_ming: string | null
  mei_ti_da_xiao_zi_jie: number | null
  yi_du: boolean
  yi_che_hui: boolean
  shi_jian_chuo: number
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
  si_kao?: string
}

export interface AIYinQingShuRu {
  yong_hu_id: string
  jiao_se_id: string
  jiao_se: AIJiaoSeXinXi
  hao_gan_du: HaoGanDuXinXi
  dui_hua_li_shi: DuiHuaLiShiXiang[]
  yong_hu_xin_xiao_xi: string
  shi_fou_di_yi_lun: boolean
  shi_jian_chang_jing?: string
  tu_pian_shou_quan: boolean
  ji_yi_zhai_yao?: string
  /**
   * 关键事件注入段（按本轮相关性挑过）。必须与 ji_yi_zhai_yao 分开：摘要每 40 条才变，
   * 留在共用前缀里对缓存友好；关键事件按本轮选、每轮都可能变，只能注入到历史之后。
   */
  guan_jian_shi_jian?: string
}

export interface AIYinQingShuChu {
  xiao_xi_lie_biao: string[]
  shi_fou_hui_fu: boolean
  shi_fou_che_hui: boolean
  ce_lue?: DirectorCeLue
  jiang_ji_mo_shi: boolean
  cuo_wu_xin_xi?: string
  cuo_wu_ma?: 'XIAN_LIU_429' | 'YU_E_BU_ZU_402'
  yong_hu_id?: string
  si_kao?: { director?: string; writer?: string }
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
  | 'shi_bai_fang_qi_tiao_zhan'
  | 'shi_bai_mian_da_rao'

export interface YouXiJieShuJieGuo {
  jie_guo_lei_xing: YouXiJieGuoLeiXing
  /** 结局标签文案（`translations.jieJu` 的性别变体），短、稳定、不含随机成分 */
  zhuang_tai_wen_ben: string
  /**
   * FP-07 结局趣味文案快照：结算那一刻从 `translations.jieGuoTongGuanChi/jieGuoShiBaiChi`
   * 随机抽中并落库（`角色.结局文案`）的那一句。弹窗正文用它，读取侧一律走 `解析结局文案` 的快照优先。
   */
  jie_guo_wen_an: string
  /** 通关/失败分类的唯一真源（= 趣味池通关组键集合），前端禁止再自写白名单 */
  shi_fou_tong_guan: boolean
  ke_ji_xu_liao_tian: boolean
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

export interface JunShiZhiDaoFenDuan {
  dangQianJuMian: string
  xiaYiBuZenMeHui: string
  weiShenMeZheMeLiao: string
  guLi: string
}

export interface JunShiQiuZhuJieGuo {
  zhi_dao_fen_duan: JunShiZhiDaoFenDuan | null
  zhi_dao_zheng_duan: string
}
