export const yingYongBanBen = '1.3.0'

export const shengChengJiaoSeChaoShiHaoMiao = 120000

export const BUJU_PEI_ZHI = {
  jianPanZhanKaiYuZhi: 150,
} as const

export interface CaoDiPeiZhi {
  fenXiQiYong: boolean
  pingBiYuMing: readonly string[]
  xiangSuBiFengDing: number
  zuiXiaoZhenJianGeHaoMiao: number
  tieTuZuiDaChongShiCiShu: number
  fenXiCaiYangZuiXiaoJianGeMiao: number
  beiJingZuiDaChongShiCiShu: number
  beiJingJiuXuChaoShiHaoMiao: number
  caoDiZhunBeiChaoShiHaoMiao: number
  caoDiJieShiChaoShiHaoMiao: number
  caoDiYuReHaoMiao: number
  beiJingJieShiChaoShiHaoMiao: number
  beiJingYuReChaoShiHaoMiao: number
  beiJingKongXianChaoShiHaoMiao: number
  beiJingKongXianTuiJiHaoMiao: number
  fuZhenSanWeiLunXunJianGeHaoMiao: number
  fuZhenSanWeiChaoShiHaoMiao: number
}

export const caoDiPeiZhi: CaoDiPeiZhi = {
  fenXiQiYong: false,
  pingBiYuMing: ['ingest.analytics.invantis.tech'],
  xiangSuBiFengDing: 1.25,
  zuiXiaoZhenJianGeHaoMiao: 33,
  tieTuZuiDaChongShiCiShu: 5,
  fenXiCaiYangZuiXiaoJianGeMiao: 60,
  beiJingZuiDaChongShiCiShu: 1,
  beiJingJiuXuChaoShiHaoMiao: 35000,
  caoDiZhunBeiChaoShiHaoMiao: 30000,
  caoDiJieShiChaoShiHaoMiao: 8000,
  caoDiYuReHaoMiao: 250,
  beiJingJieShiChaoShiHaoMiao: 10000,
  beiJingYuReChaoShiHaoMiao: 3000,
  beiJingKongXianChaoShiHaoMiao: 1800,
  beiJingKongXianTuiJiHaoMiao: 800,
  fuZhenSanWeiLunXunJianGeHaoMiao: 60,
  fuZhenSanWeiChaoShiHaoMiao: 12000,
}
