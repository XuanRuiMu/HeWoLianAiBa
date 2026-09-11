// 应用版本号：全站唯一来源（UI 展示、埋点 ban_ben 均引用此处）；
// 发版时与 package.json 的 version 一并更新。
export const yingYongBanBen = '1.1.0'

export interface CaoDiPeiZhi {
  fenXiQiYong: boolean
  pingBiYuMing: readonly string[]
  xiangSuBiFengDing: number
  zuiXiaoZhenJianGeHaoMiao: number
  tieTuZuiDaChongShiCiShu: number
  fenXiCaiYangZuiXiaoJianGeMiao: number
  beiJingZuiDaChongShiCiShu: number
}

export const caoDiPeiZhi: CaoDiPeiZhi = {
  fenXiQiYong: false,
  pingBiYuMing: ['ingest.analytics.invantis.tech'],
  xiangSuBiFengDing: 1.25,
  zuiXiaoZhenJianGeHaoMiao: 33,
  tieTuZuiDaChongShiCiShu: 5,
  fenXiCaiYangZuiXiaoJianGeMiao: 60,
  beiJingZuiDaChongShiCiShu: 1,
}
