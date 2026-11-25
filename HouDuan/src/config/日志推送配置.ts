function huoQuZhengShuHuanJing(ming: string, moRen: number): number {
  const yuanShi = process.env[ming]
  if (!yuanShi) return moRen
  const zhi = Number.parseInt(yuanShi, 10)
  if (!Number.isFinite(zhi) || zhi <= 0) return moRen
  return zhi
}

export const riZhiTuiSongPeiZhi = {
  get qiYong(): boolean {
    return process.env.RI_ZHI_TUI_SONG_QI_YONG !== 'false'
  },
  get fangJianMing(): string {
    return process.env.RI_ZHI_TUI_SONG_FANG_JIAN || 'ri_zhi_guan_li_yuan'
  },
  get heBingJianGeHaoMiao(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_HE_BING_JIAN_GE', 250)
  },
  get meiMiaoZuiDaTiaoShu(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_MEI_MIAO_ZUI_DA', 200)
  },
  get piCiZuiDaTiaoShu(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_PI_CI_ZUI_DA', 50)
  },
  get huanChongZuiDaTiaoShu(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_HUAN_CHONG_ZUI_DA', 500)
  },
  get danTiaoZuiDaZiFu(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_DAN_TIAO_ZUI_DA_ZI_FU', 2000)
  },
  get xiangQingZuiDaCengJi(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_XIANG_QING_ZUI_DA_CENG_JI', 4)
  },
  get xiangQingZuiDaJianShu(): number {
    return huoQuZhengShuHuanJing('RI_ZHI_TUI_SONG_XIANG_QING_ZUI_DA_JIAN_SHU', 50)
  },
}
