import { jianChaFuCong } from './开场候选约束'

const KOU_JING = 20

export function kaiChangToken(wenBen: string): string {
  return wenBen.replace(/[\s　]+/g, '').slice(0, 2)
}

export function shouJiJiuJinKaiChangToken(
  liShi: Array<{ fa_song_zhe_lei_xing: string; nei_rong: string }>,
  kouJing: number = KOU_JING,
): Set<string> {
  const kaiShiWei: number[] = []
  let kaiShi = -1
  for (let i = 0; i < liShi.length; i++) {
    const leiXing = liShi[i].fa_song_zhe_lei_xing
    if (leiXing === 'yonghu') {
      if (kaiShi >= 0) kaiShiWei.push(kaiShi)
      kaiShi = -1
      continue
    }
    if (leiXing !== 'jiaose') continue
    if (kaiShi >= 0) continue
    if (kaiChangToken(String(liShi[i].nei_rong || '')).length === 2) kaiShi = i
  }
  if (kaiShi >= 0) kaiShiWei.push(kaiShi)

  const jieGuo = new Set<string>()
  for (const wei of kaiShiWei.slice(-kouJing)) {
    const t = kaiChangToken(String(liShi[wei].nei_rong || ''))
    if (t.length === 2) jieGuo.add(t)
  }
  return jieGuo
}

export interface LunPanDuan {
  M2_zhuangChe: 0 | 1
  M2_keCeRen: boolean
  M7_yuFuCong: 0 | 1
  M7_daiPanDing: 0 | 1
  M8_zhengZhiFuZhi: number
  kaiChang: string
}

export function tongJiLun(
  liShi: Array<{ fa_song_zhe_lei_xing: string; nei_rong: string }>,
  yuanWen: string,
  xiaoXi: string[],
  houXuan: string[],
): LunPanDuan {
  const shouTiao = (xiaoXi[0] || '').trim()
  const benLun = kaiChangToken(shouTiao)

  const jinKou = shouJiJiuJinKaiChangToken(liShi)
  const youXiao = xiaoXi.length > 0 && benLun.length === 2
  const M2 = youXiao && jinKou.has(benLun) ? 1 : 0

  const fuCong = jianChaFuCong(yuanWen, houXuan)
  const M7_yu = fuCong === true ? 1 : 0
  const M7_dai = fuCong === null ? 0 : 1

  const M8 = xiaoXi.filter((x) => houXuan.includes(x.trim())).length

  return {
    M2_zhuangChe: M2 as 0 | 1,
    M2_keCeRen: youXiao,
    M7_yuFuCong: M7_yu as 0 | 1,
    M7_daiPanDing: M7_dai as 0 | 1,
    M8_zhengZhiFuZhi: M8,
    kaiChang: benLun,
  }
}

export function huiZongPanDuan(panDuan: (LunPanDuan & { kaiGuanKaiQi?: boolean })[]) {
  const M2_keCeRen = panDuan.filter((x) => x.M2_keCeRen).length
  const M7_kePanDing = panDuan.filter((x) => x.M7_daiPanDing === 1 && x.kaiGuanKaiQi !== false).length
  const M8_youXiao = panDuan.filter((x) => x.kaiGuanKaiQi !== false)
  const M7_luShu = M8_youXiao.reduce((a, x) => a + x.M7_yuFuCong, 0)
  return {
    M2_zhuangCheLv: M2_keCeRen === 0 ? null : Number((panDuan.reduce((a, x) => a + x.M2_zhuangChe, 0) / M2_keCeRen).toFixed(4)),
    M2_keCeRenLunShu: M2_keCeRen,
    M7_fuCongLv: M7_kePanDing === 0 ? null : Number((M7_luShu / M7_kePanDing).toFixed(4)),
    M7_kePanDingLunShu: M7_kePanDing,
    kaiGuanWeiLunShu: panDuan.length - M8_youXiao.length,
    M8_zhengZhiFuZhi: M8_youXiao.reduce((a, x) => a + x.M8_zhengZhiFuZhi, 0),
    lunShu: panDuan.length,
    M2_keCeRenLv: panDuan.length === 0 ? 0 : Number((M2_keCeRen / panDuan.length).toFixed(4)),
    kaiChangGeShu: new Set(panDuan.map((x) => x.kaiChang).filter((x) => x.length === 2)).size,
  }
}