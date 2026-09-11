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

export const LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI = {
  yuYinCaiDanXiang: ['yuYinZhuanWenZi', 'yinYong'],
  wenBenCaiDanXiang: ['fuZhi', 'fanYi', 'yinYong', 'cheHui'],
  changAnChuFaHaoMiao: 500,
  yinYongZhaiYaoZuiDaZiFu: 30,
  yuYinZhuanXieChaoShiHaoMiao: 70000,
} as const

export type YuYinCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['yuYinCaiDanXiang'][number]

export type WenBenCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['wenBenCaiDanXiang'][number]
