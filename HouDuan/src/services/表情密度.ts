import { BiaoQingMiDu } from '../config/表情包配置'
import { tiQuTieZhiDuanMing } from './贴纸标记'
import type { DuiHuaLiShiXiang } from '../types'

export type BiaoQingQuXiang = '偏少' | '正常' | '偏多'

export interface BiaoQingShouGanJieGuo {
  shangCiFaTuLunShu: number | null
  duiFangJinQiTuShu: number
  ziJiJinQiTuShu: number
  qiWangJianGeLunShu: number
  quXiang: BiaoQingQuXiang
}

interface JiaoSeXiangGuan {
  ie_lei_xing?: string
  re_shen_lei_xing?: string
}

export function shiBiaoQingXiaoXi(xiang: Pick<DuiHuaLiShiXiang, 'meiTiLeiBie' | 'nei_rong'>): boolean {
  if (xiang.meiTiLeiBie === BiaoQingMiDu.ziLiaoBiaoQingLeiBie) return true
  const neiRong = typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''
  if (neiRong === '') return false
  return tiQuTieZhiDuanMing(neiRong).length > 0
}

function quRenGeXiShu(jiaoSe?: JiaoSeXiangGuan | null, guanXiJieDuan?: string | null): number {
  const xiShu = BiaoQingMiDu.renGeXiShu
  const shiNeiXiang = jiaoSe?.ie_lei_xing === 'I'
  const shiWaiXiang = jiaoSe?.ie_lei_xing === 'E'
  const shiManRe = jiaoSe?.re_shen_lei_xing === BiaoQingMiDu.manReBiaoShi
  const shiGangRenShi =
    guanXiJieDuan === 'lengDan' || guanXiJieDuan === 'shuYuan' || guanXiJieDuan === 'renShi'
  if (shiNeiXiang) return shiManRe && shiGangRenShi ? xiShu.neiXiang * xiShu.manReGangRenShi : xiShu.neiXiang
  if (shiWaiXiang) return shiManRe && shiGangRenShi ? xiShu.waiXiang * xiShu.manReGangRenShi : xiShu.waiXiang
  return 1
}

function quGuanXiXiShu(guanXiJieDuan?: string | null): number {
  const biao = BiaoQingMiDu.guanXiXiShu as Record<string, number>
  if (typeof guanXiJieDuan !== 'string' || guanXiJieDuan === '') return 1
  const xiShu = biao[guanXiJieDuan]
  return typeof xiShu === 'number' && Number.isFinite(xiShu) ? xiShu : 1
}

function quQuXiang(miDu: number): BiaoQingQuXiang {
  const yu = BiaoQingMiDu.quXiangYu
  if (miDu < yu.偏少) return '偏少'
  if (miDu > yu.偏多) return '偏多'
  return '正常'
}

export function jiSuanBiaoQingShouGan(
  liShi: DuiHuaLiShiXiang[] | null | undefined,
  jiaoSe?: JiaoSeXiangGuan | null,
  guanXiJieDuan?: string | null,
): BiaoQingShouGanJieGuo {
  const quanBu = Array.isArray(liShi) ? liShi : []
  const chuangKouTiaoShu = BiaoQingMiDu.chuangKouTiaoShu
  const chuangKou = quanBu.slice(-chuangKouTiaoShu)
  let ziJiJinQiTuShu = 0
  let duiFangJinQiTuShu = 0
  for (const xiang of chuangKou) {
    if (!shiBiaoQingXiaoXi(xiang)) continue
    if (xiang.fa_song_zhe_lei_xing === 'jiaose') ziJiJinQiTuShu += 1
    else if (xiang.fa_song_zhe_lei_xing === 'yonghu') duiFangJinQiTuShu += 1
  }

  let shangCiFaTuLunShu: number | null = null
  let juLi = 0
  for (let xia = quanBu.length - 1; xia >= 0; xia -= 1) {
    const xiang = quanBu[xia]
    if (xiang.fa_song_zhe_lei_xing === 'jiaose' && shiBiaoQingXiaoXi(xiang)) {
      shangCiFaTuLunShu = juLi
      break
    }
    juLi += 1
    if (juLi > BiaoQingMiDu.shangCiZhuiSuZuiDuoTiao) break
  }

  const huHuiXiShu =
    duiFangJinQiTuShu > 0 ? BiaoQingMiDu.huHui.duiFangYou : BiaoQingMiDu.huHui.duiFangWu
  const miDu =
    BiaoQingMiDu.jiXian *
    quRenGeXiShu(jiaoSe, guanXiJieDuan) *
    quGuanXiXiShu(guanXiJieDuan) *
    huHuiXiShu
  const yuanJianGe = miDu > 0 ? Math.round(1 / miDu) : BiaoQingMiDu.jianGe.zuiDa
  const qiWangJianGeLunShu = Math.max(
    BiaoQingMiDu.jianGe.zuiXiao,
    Math.min(BiaoQingMiDu.jianGe.zuiDa, yuanJianGe),
  )

  return {
    shangCiFaTuLunShu,
    duiFangJinQiTuShu,
    ziJiJinQiTuShu,
    qiWangJianGeLunShu,
    quXiang: quQuXiang(miDu),
  }
}
