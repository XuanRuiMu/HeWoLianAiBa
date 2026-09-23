import { huoQuFanYi, type FanYiZiJian } from './translations'

export const XIAO_XI_PEI_ZHI = {
  cheHuiShiXian: 2 * 60 * 1000,
  zuiDaXiaoXiChangDu: 500,
  ziFuTongJiXianShiYuZhi: 400,
  heBingShiJianYuZhi: 60 * 1000,
}

export const DUO_MEI_TI_PEI_ZHI = {
  yuYinZuiDaMiao: 60,
  yuYinZuiDuanMiao: 1,
  tuPianQiPaoZuiDaKuanPx: 180,
  biaoQingBaoChiCunPx: 120,
  /* FP-11 语音条几何（数值出处 = .agents/evidence/references/FP-13-语音条-20260921.md §1-A）：
     微信/QQ 式「时长越长气泡越宽」的唯一算式 = 秒数 × yuYinMeiMiaoKuanPx + yuYinJiChuKuanPx，
     再夹进 [yuYinZuiDuanKuanPx, yuYinZuiChangKuanPx]（上限即取证的 max-width:300px；
     下限 60 是改前实测值，一秒的语音也要容得下喇叭与时长）。
     改前的 yuYinZuiDuanKuanPx/yuYinZuiChangKuanPx 是「60→200 线性插值」的两端，插值算式已废，
     两枚键名原地保留为夹取上下限，不再参与映射本身。
     唯一消费者 = use语音播放.ts 的宽度算式 与 components/聊天/语音气泡.vue 的采样条数算式。
     yuYinPaoNeidianPx 与 --yuyin-pao-neidian、yuYinCaoYang*Px 与 --yuyin-bo-xing-* 的同值性
     由 __tests__/FP11语音气泡.test.ts 解析 variables.css 断言把守（成对性口径同 FP-23）。 */
  yuYinMeiMiaoKuanPx: 10,
  yuYinJiChuKuanPx: 20,
  yuYinZuiDuanKuanPx: 60,
  yuYinZuiChangKuanPx: 300,
  yuYinPaoNeidianPx: 12,
  yuYinCaoYangTiaoKuanPx: 2,
  yuYinCaoYangJianJuPx: 2,
  // 进度轨道的拖动步长（秒），改前实测值 0.1，唯一消费者 = 语音气泡.vue 的 input[type=range]
  yuYinJinDuBuZhouMiao: 0.1,
  wenJianMingZuiDaXianShiZiFu: 24,
} as const

/* 录音浮层的电平计条数：改前实测 12 条，本单只解除它与语音气泡那条已作废常量
   （原 use语音播放.ts::YU_YIN_BO_XING_TIAO_SHU）的错误共享，不改录音侧观感；
   语音气泡本身不再有任何「条数」常量（未播放态是 3 格喇叭，见 §1-C）。
   上滑取消阈值另有唯一真源 use录音.ts::LU_YIN_SHANG_HUA_QU_XIAO_JU_LI，不在此重复登记。 */
export const LU_YIN_PEI_ZHI = {
  dianPingTiaoShu: 12,
} as const

// FP-10b（缺陷9）图文混排的前端侧边界，与 backend/src/config/消息配置.ts::XIAO_XI_PEI_ZHI
// 的 neiRongKuai* 两项同源（同源由 __tests__/FP10b图文混排.test.ts 读后端源文件断言把守）。
// 后端仍是唯一裁定方：这里只用于编辑期的即时提示，绝不因为前端放过就改判。
export const XIAO_XI_KUAI_PEI_ZHI = {
  zuiDaKuaiShu: 20,
  zuiDaTuPianShu: 9,
  // 图片块在兼容投影里的载体占位符，与后端 services/AI视觉辅助.ts::meiTiZhanShiWenBen('tupian') 同字
  tuPianZhanWei: '[图片]',
  biaoQingBaoZhanWei: '[表情包]',
} as const

// FP-06a：粘贴图片的客户端边界，与 backend/src/config/媒体配置.ts 的 tupian 口径同源
// （白名单/大小上限均由后端把守，此处只做发送前的即时提示；同源由 __tests__/粘贴图片.test.ts 断言把守）
export const ZHAN_TIE_TU_PIAN_PEI_ZHI = {
  zuiDaZiJieZiJie: 10 * 1024 * 1024,
  yunXuMIME: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as readonly string[],
} as const

// FP-21：媒体消息类型码在前端侧的唯一真源。值集 = backend/src/config/媒体配置.ts::LEI_BIE_DAO_XIAO_XI_LEI_XING
// 的四个值（后端是唯一生产者，好友聊天媒体.test.ts 直读后端源文件断言同集合，改一侧必红灯）。
// 两个聊天页都只引用本常量：页面各自列一份清单就会漂移到「同一条消息在 AI 页是图、在好友页是空泡」。
export const MEI_TI_XIAO_XI_LEI_XING = ['tuPian', 'biaoQingBao', 'yuYin', 'wenJian'] as const

/** 其中按图片渲染的两类（相册/粘贴发的图 + 表情面板发的表情包）；其余媒体走文件泡 */
export const TU_PIAN_XIAO_XI_LEI_XING = ['tuPian', 'biaoQingBao'] as const

export type MeiTiXiaoXiLeiXing = (typeof MEI_TI_XIAO_XI_LEI_XING)[number]

export const WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN = [
  '.pdf',
  '.txt',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.7z',
  '.mp4',
  '.mov',
  // FP-12b：与 backend/src/config/媒体配置.ts::mimeBaiMingDan.wenjian 的
  // text/markdown、text/csv、application/json、text/html 四条同源补齐（同源由
  // __tests__/FP12b文件气泡与accept.test.ts 直读后端源文件断言把守）
  '.md',
  '.csv',
  '.json',
  '.html',
].join(',')

// FP-06b（用户问题 #13）：表情面板开合的滚动补偿只在「过渡区间」内生效。
// 区间终点由 transitionend 给出；过渡被中断（v-show 收尾置 display:none 时事件不到达）
// 则由下面的兜底毫秒数收尾，两者都只负责「结束补偿」，不参与任何高度计算。
export const EMOJI_MIANBAN_PEI_ZHI = {
  guoDuShouWeiHaoMiao: 600,
} as const

export const LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI = {
  yuYinCaiDanXiang: ['yuYinZhuanWenZi', 'yinYong'],
  wenBenCaiDanXiang: ['fuZhi', 'fanYi', 'yinYong', 'cheHui'],
  // FP-20：图片气泡（自己发的与 AI 发来的同一口径）长按/右键菜单。
  // cheHui 与文本菜单同一判定：只在消息仍在撤回窗口内时出现，故本清单是「全量」而非恒显示。
  // FP-08d（需求 #5）：补 yinYong —— 图片此前根本无法被引用（三个菜单里只有它缺引用项）。
  tuPianCaiDanXiang: ['tianJiaDaoBiaoQing', 'yinYong', 'cheHui'],
  changAnChuFaHaoMiao: 500,
  yinYongZhaiYaoZuiDaZiFu: 30,
  yuYinZhuanXieChaoShiHaoMiao: 70000,
} as const

// FP-08d（需求 #5）媒体消息被引用时的摘要占位口径：媒体气泡没有可供截断的正文（`内容` 为空），
// 一律按各自的占位文案呈现。这里是「哪种媒体 → 哪个翻译键」的唯一映射，文案本体住在
// config/translations.ts（语音的占位已由 use长按菜单.ts::huoQuYinYongZhaiYao 承担，不在此重复登记）。
const YIN_YONG_MEI_TI_ZHAN_WEI_JIAN = {
  tuPian: 'yinYongTuPianZhanWei',
  biaoQingBao: 'yinYongBiaoQingBaoZhanWei',
  wenJian: 'yinYongWenJianZhanWei',
} as const satisfies Partial<Record<(typeof MEI_TI_XIAO_XI_LEI_XING)[number], FanYiZiJian<'liaoTian'>>>

/**
 * 被引用那条是媒体消息时返回它的占位文案，不是媒体（或语音）时返回 null，
 * 由调用方回落 `use长按菜单.ts::huoQuYinYongZhaiYao`（正文截断的唯一出口）。
 */
export function huoQuMeiTiYinYongZhanWei(leiXing: string): string | null {
  const jian = (YIN_YONG_MEI_TI_ZHAN_WEI_JIAN as Partial<Record<string, FanYiZiJian<'liaoTian'>>>)[
    leiXing
  ]
  return jian ? huoQuFanYi('liaoTian', jian) : null
}

// FP-09（需求 #5 表现层）点击气泡内引用块定位原文的参数。逐值出处
// = .agents/evidence/references/FP-13-引用条-20260921.md §1.3（TUIKit scrollToOriginalMessage）：
// 目标位置相同时浏览器不派发 scroll，靠 douDongXianShi 的奇偶抖动强制生效；高亮 1s 一轮、固定 3 轮、
// 光晕 0 0 10px 0。颜色不在此写死，只登记吃哪枚令牌（--jing-gao-se 深浅两档均有值）。
// domQianZhui 是消息行 DOM id 的前缀约定（等价 TUIKit 的 tui-<messageID>），由聊天页面.vue 与组件同源使用。
export const YIN_YONG_DING_WEI_PEI_ZHI = {
  domQianZhui: 'xiaoxi-',
  douDongXianShi: 1,
  guangYunMoHu: 10,
  liangGuangHaoMiao: 1000,
  liangGuangCiShu: 3,
  liangGuangLingPai: '--jing-gao-se',
} as const

export type YuYinCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['yuYinCaiDanXiang'][number]

export type WenBenCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['wenBenCaiDanXiang'][number]

export type TuPianCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['tuPianCaiDanXiang'][number]
