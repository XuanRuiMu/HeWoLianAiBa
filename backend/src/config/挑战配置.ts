/**
 * 挑战模式（排位赛）配置
 * 积分规则与段位阈值集中于此，禁止在其他模块硬编码。
 */
function huoQuZhaXingGaiLv(): number {
  const huanJingZhi = process.env.TIAO_ZHAN_ZHA_XING_GAI_LV
  if (huanJingZhi !== undefined) {
    const shuZhi = parseFloat(huanJingZhi)
    if (!Number.isNaN(shuZhi) && shuZhi >= 0 && shuZhi <= 1) {
      return shuZhi
    }
  }
  return 0.3
}

export const TIAO_ZHAN_PEI_ZHI = {
  /** 初始积分（定级分） */
  chuShiJiFen: 1000,

  /** 胜利加分 */
  shengLiJiaFen: 25,
  /** 失败扣分（正值，结算时取负） */
  shiBaiKouFen: 20,
  /** 主动放弃扣分（正值，结算时取负） */
  fangQiKouFen: 15,

  /** 连胜加成：连胜达到 chuFaLianSheng 场后，每场额外加 lianShengJiaFen 分 */
  lianShengJiaFen: 5,
  chuFaLianSheng: 3,
  /** 单场加分上限（含连胜加成） */
  jiaFenShangXian: 40,

  /** 定级保护：前 N 场失败不扣分 */
  dingJiBaoHuJuShu: 3,

  /** 挑战模式渣型随机概率（可通过 TIAO_ZHAN_ZHA_XING_GAI_LV 环境变量覆盖，范围 0-1） */
  zhaXingGaiLv: huoQuZhaXingGaiLv(),

  /** 排行榜单页条数上限 */
  paiHangTiaoShu: 50,

  /**
   * 段位表（英雄联盟段位命名），按历史最高分定段：
   * 每项 xiaXian 为进入该段位的最低「历史最高分」。
   */
  duanWeiLieBiao: [
    { mingCheng: '王者', xiaXian: 2200 },
    { mingCheng: '宗师', xiaXian: 2000 },
    { mingCheng: '大师', xiaXian: 1800 },
    { mingCheng: '钻石', xiaXian: 1650 },
    { mingCheng: '翡翠', xiaXian: 1500 },
    { mingCheng: '铂金', xiaXian: 1350 },
    { mingCheng: '黄金', xiaXian: 1200 },
    { mingCheng: '白银', xiaXian: 1100 },
    { mingCheng: '青铜', xiaXian: 1000 },
    { mingCheng: '黑铁', xiaXian: 0 },
  ] as Array<{ mingCheng: string; xiaXian: number }>,
} as const

/** 组别合法值 */
export const ZU_BIE_LIE_BIAO = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv'] as const
export type ZuBie = (typeof ZU_BIE_LIE_BIAO)[number]

/** 由玩家性别+对象性别推导组别 */
export function huoQuZuBie(wanJiaXingBie: '男' | '女', duiXiangXingBie: '男' | '女'): ZuBie {
  if (wanJiaXingBie === '男') return duiXiangXingBie === '女' ? 'nan_nv' : 'nan_nan'
  return duiXiangXingBie === '男' ? 'nv_nan' : 'nv_nv'
}

/** 段位名：按历史最高分定段（达到过的最高段位，符合排位赛习惯） */
export function huoQuDuanWeiMing(lishiZuiGaoFen: number): string {
  for (const duanWei of TIAO_ZHAN_PEI_ZHI.duanWeiLieBiao) {
    if (lishiZuiGaoFen >= duanWei.xiaXian) return duanWei.mingCheng
  }
  return TIAO_ZHAN_PEI_ZHI.duanWeiLieBiao[TIAO_ZHAN_PEI_ZHI.duanWeiLieBiao.length - 1].mingCheng
}
