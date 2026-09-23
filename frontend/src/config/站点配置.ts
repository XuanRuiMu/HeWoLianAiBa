// 应用版本号：全站唯一来源（UI 展示、埋点 ban_ben 均引用此处）；
// 发版时与 package.json 的 version 一并更新。
export const yingYongBanBen = '1.2.1'

export interface CaoDiPeiZhi {
  fenXiQiYong: boolean
  pingBiYuMing: readonly string[]
  xiangSuBiFengDing: number
  zuiXiaoZhenJianGeHaoMiao: number
  tieTuZuiDaChongShiCiShu: number
  fenXiCaiYangZuiXiaoJianGeMiao: number
  beiJingZuiDaChongShiCiShu: number
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
  beiJingKongXianChaoShiHaoMiao: 1800,
  beiJingKongXianTuiJiHaoMiao: 800,
  fuZhenSanWeiLunXunJianGeHaoMiao: 60,
  fuZhenSanWeiChaoShiHaoMiao: 12000,
}
