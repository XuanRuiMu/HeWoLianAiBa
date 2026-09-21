// FP-06b 用户自定义表情：客户端侧的添加约束。
// 上限/白名单的真实卡口在后端（config/媒体配置.ts 的 biaoqingshu 口径 + routes/表情.ts），
// 此处只做「选完文件立刻提示」，数值一致性由 __tests__/我的表情.test.ts 直读后端源文件断言把守。
export const BIAO_QING_TIAN_JIA_PEI_ZHI = {
  zuiDaZiJieZiJie: 10 * 1024 * 1024,
  yunXuMIME: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as readonly string[],
  wenJianJieShou: 'image/jpeg,image/png,image/gif,image/webp',
  chaoShiHaoMiao: 60000,
} as const

/**
 * FP-20「添加到表情」从消息气泡取图：
 * quTuChaoShiHaoMiao 是取回一张已入库图片的上限（同源且多为浏览器缓存命中，故远小于上传超时），
 * tiShiXiaoShiHaoMiao 是「已添加／已在我的表情里」反馈条的自动消失时间。
 */
export const BIAO_QING_QU_TU_PEI_ZHI = {
  quTuChaoShiHaoMiao: 30000,
  tiShiXiaoShiHaoMiao: 2600,
} as const
