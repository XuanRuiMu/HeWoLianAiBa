export const XIAO_XI_PEI_ZHI = {
  cheHuiShiXian: 2 * 60 * 1000,
  zuiDaXiaoXiChangDu: 500,
  heBingShiJianYuZhi: 60 * 1000,
  lianFaMianDaRaoTiaoShu: 20,
  lianFaYuJingTiaoShu: 12,
  // FP-10（缺陷9）顺序化内容块：一条消息的块数与图片块数上限。
  // zuiDaXiaoXiChangDu 同时是「全部文字块合计」与「单块文字」的上限（派生投影 内容 不得超它）。
  neiRongKuaiZuiDaKuaiShu: 20,
  neiRongKuaiZuiDaTuPianShu: 9,
}

/**
 * FP-22（消解 L-39）运营侧消息类型清单：`neiXinHuoDong` 是历史版本把「AI 隐藏的内心修正」
 * 直接落成消息行的残留类型（前端只做视觉隐藏、并喂管理员监控的深度思考列表）。
 * 它不在发送白名单 `YUN_XU_XIAO_XI_LEI_XING` 内 ⇒ 现码已无生产者，只有存量库还有这类行。
 * 普通用户的读接口整行不下发，只随运营读取能力（能力位 cha_kan）下发。
 */
export const YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING: readonly string[] = ['neiXinHuoDong']

export function shiYunYingZiDuanXiaoXiLeiXing(zhi: unknown): boolean {
  return typeof zhi === 'string' && YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING.includes(zhi)
}
