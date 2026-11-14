import type { 性别内部形态 } from '../utils/性别'

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

export const TiaoZhanPeiZhi = {
  chuShiJiFen: 1000,

  shengLiJiaFen: 25,
  shiBaiKouFen: 20,
  fangQiKouFen: 15,

  lianShengJiaFen: 5,
  chuFaLianSheng: 3,
  jiaFenShangXian: 40,

  dingJiBaoHuJuShu: 3,

  zhaXingGaiLv: huoQuZhaXingGaiLv(),

  paiHangTiaoShu: 50,

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

export const ZuBieLieBiao = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv'] as const
export type ZuBie = (typeof ZuBieLieBiao)[number]

export function huoQuZuBie(
  wanJiaXingBie: 性别内部形态,
  duiXiangXingBie: 性别内部形态,
): ZuBie {
  if (wanJiaXingBie === 'nan') return duiXiangXingBie === 'nv' ? 'nan_nv' : 'nan_nan'
  return duiXiangXingBie === 'nan' ? 'nv_nan' : 'nv_nv'
}

export function huoQuDuanWeiMing(lishiZuiGaoFen: number): string {
  for (const duanWei of TiaoZhanPeiZhi.duanWeiLieBiao) {
    if (lishiZuiGaoFen >= duanWei.xiaXian) return duanWei.mingCheng
  }
  return TiaoZhanPeiZhi.duanWeiLieBiao[TiaoZhanPeiZhi.duanWeiLieBiao.length - 1].mingCheng
}
