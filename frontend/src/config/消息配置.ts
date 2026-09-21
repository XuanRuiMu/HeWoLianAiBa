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
  yuYinZuiDuanKuanPx: 60,
  yuYinZuiChangKuanPx: 200,
  wenJianMingZuiDaXianShiZiFu: 24,
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
  tuPianCaiDanXiang: ['tianJiaDaoBiaoQing', 'cheHui'],
  changAnChuFaHaoMiao: 500,
  yinYongZhaiYaoZuiDaZiFu: 30,
  yuYinZhuanXieChaoShiHaoMiao: 70000,
} as const

export type YuYinCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['yuYinCaiDanXiang'][number]

export type WenBenCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['wenBenCaiDanXiang'][number]

export type TuPianCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['tuPianCaiDanXiang'][number]
