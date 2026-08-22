function huoQuShuZhiHuanJingBianLiang(ming: string, moRen: number): number {
  const zhi = Number(process.env[ming])
  return Number.isFinite(zhi) && zhi > 0 ? zhi : moRen
}

export const TONG_HUA_PEI_ZHI = {
  zhenLingZuiXiaoHaoMiao: huoQuShuZhiHuanJingBianLiang('TONG_HUA_JIE_TING_ZUI_XIAO_HAO_MIAO', 2000),
  zhenLingZuiDaHaoMiao: huoQuShuZhiHuanJingBianLiang('TONG_HUA_JIE_TING_ZUI_DA_HAO_MIAO', 6000),
  yingJianShangXianMiao: huoQuShuZhiHuanJingBianLiang('TONG_HUA_YING_JIAN_SHANG_XIAN_MIAO', 600),
}
