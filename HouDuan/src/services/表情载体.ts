import { debug日志 } from '../utils/debug日志'
import { duPeiZhiShiCha } from '../config/时区'
import {
  BiaoQingBaoYunXing,
  BiaoQingGuanXiJieDuanShunXu,
  BiaoQingMiDu,
  BiaoQingZaiTiPeiZhi,
} from '../config/表情包配置'
import { jiSuanBiaoQingShouGan, shiBiaoQingXiaoXi } from './表情密度'
import type { AIYinQingShuRu, DirectorCeLue, DuiHuaLiShiXiang } from '../types'

const RiZhiLeiXing = '表情载体'

export type BiaoQingZaiTiYuanYin =
  | '放行'
  | '回敬'
  | '总开关关闭'
  | '深夜'
  | '危机'
  | '关系未到'
  | '间隔未到'
  | '门控异常'

export interface BiaoQingZaiTiJueCe {
  geiHouXuan: boolean
  yuanYin: BiaoQingZaiTiYuanYin
  yunXuFengGe: readonly string[]
  guanXiJieDuanXuHao: number
  nianLingDang: string
  qiWangJianGeLunShu: number
  shangCiFaTuLunShu: number | null
  quXiang: string
}

interface NianLingDang {
  ming: string
  yunXuFengGe: readonly string[]
  jianGeBeiLv: number
}

function quMoRenDang(): NianLingDang {
  const moRen = BiaoQingZaiTiPeiZhi.nianLingFenDang.find(
    (dang) => dang.ming === BiaoQingZaiTiPeiZhi.moRenDangMing,
  )
  return {
    ming: BiaoQingZaiTiPeiZhi.moRenDangMing,
    yunXuFengGe: moRen?.yunXuFengGe ?? [],
    jianGeBeiLv: moRen?.jianGeBeiLv ?? 1,
  }
}

function quBaoShouJueCe(yuanYin: BiaoQingZaiTiYuanYin): BiaoQingZaiTiJueCe {
  const moRen = quMoRenDang()
  return {
    geiHouXuan: false,
    yuanYin,
    yunXuFengGe: moRen.yunXuFengGe,
    guanXiJieDuanXuHao: 0,
    nianLingDang: moRen.ming,
    qiWangJianGeLunShu: BiaoQingMiDu.jianGe.zuiDa,
    shangCiFaTuLunShu: null,
    quXiang: '偏少',
  }
}

function quWenBen(zhi: unknown): string {
  return typeof zhi === 'string' ? zhi.slice(0, BiaoQingZaiTiPeiZhi.wenBenZuiDaChang) : ''
}

function quGeRenXiShu(jiaoSeId: unknown): number {
  const wenBen = quWenBen(jiaoSeId)
  if (wenBen === '') return 1
  let haXi = 5381
  for (let wei = 0; wei < wenBen.length; wei += 1) {
    haXi = ((haXi << 5) + haXi + wenBen.charCodeAt(wei)) >>> 0
  }
  haXi ^= haXi >>> 16
  haXi = Math.imul(haXi, 0x7feb352d) >>> 0
  haXi ^= haXi >>> 15
  haXi = Math.imul(haXi, 0x846ca68b) >>> 0
  haXi ^= haXi >>> 16
  const biLi = (haXi >>> 0) / 4294967296
  const peiZhi = BiaoQingZaiTiPeiZhi.geRenPianHao
  return peiZhi.jianGeZuiXiaoBeiLv + biLi * (peiZhi.jianGeZuiDaBeiLv - peiZhi.jianGeZuiXiaoBeiLv)
}

function quNianLingDang(nianLing: unknown): NianLingDang {
  if (typeof nianLing !== 'number' || !Number.isFinite(nianLing)) return quMoRenDang()
  const zhengShu = Math.trunc(nianLing)
  if (zhengShu < 10 || zhengShu > 99) return quMoRenDang()
  const mingZhong = BiaoQingZaiTiPeiZhi.nianLingFenDang.find((dang) => zhengShu <= dang.nianLingShangXian)
  if (!mingZhong) return quMoRenDang()
  return {
    ming: mingZhong.ming,
    yunXuFengGe: mingZhong.yunXuFengGe,
    jianGeBeiLv: mingZhong.jianGeBeiLv,
  }
}

function quJieDuanXuHao(jieDuan: unknown): number {
  const wenBen = quWenBen(jieDuan).trim()
  if (wenBen === '') return 0
  const zhongWenMing = BiaoQingMiDu.guanXiJieDuanZhongWenMing as Record<string, string>
  const jian = zhongWenMing[wenBen] ?? wenBen
  const xuHao = BiaoQingGuanXiJieDuanShunXu.indexOf(jian)
  return xuHao >= 0 ? xuHao : 0
}

function shiShenYe(riQi: Date): boolean {
  const shiCha = duPeiZhiShiCha()
  const xiaoShi = ((riQi.getHours() + riQi.getMinutes() / 60 + shiCha) % 24 + 24) % 24
  return (
    xiaoShi >= BiaoQingZaiTiPeiZhi.jinYongXiaoShiQiShi ||
    xiaoShi < BiaoQingZaiTiPeiZhi.jinYongXiaoShiJieShu
  )
}

function shiWeiJi(shuRu: AIYinQingShuRu, ceLue?: DirectorCeLue): boolean {
  const yongHu = quWenBen(shuRu?.yong_hu_xin_xiao_xi)
  const wenBen = [
    yongHu,
    quWenBen(ceLue?.qing_gan_fen_xi),
    quWenBen(ceLue?.yong_hu_yi_tu),
  ].join('\n')
  if (wenBen.trim() === '') return false
  if (BiaoQingZaiTiPeiZhi.weiJiPaiChuCi.some((ci) => yongHu.includes(ci))) return false
  return BiaoQingZaiTiPeiZhi.weiJiGuanJianCi.some((ci) => wenBen.includes(ci))
}

function shiHuiJing(liShi: DuiHuaLiShiXiang[]): boolean {
  for (let xia = liShi.length - 1; xia >= 0; xia -= 1) {
    const xiang = liShi[xia]
    if (!xiang || typeof xiang !== 'object') continue
    if (xiang.fa_song_zhe_lei_xing !== 'yonghu') continue
    return shiBiaoQingXiaoXi(xiang)
  }
  return false
}

function qingXiLiShi(zhi: unknown): DuiHuaLiShiXiang[] {
  if (!Array.isArray(zhi)) return []
  return zhi.filter((xiang): xiang is DuiHuaLiShiXiang => Boolean(xiang) && typeof xiang === 'object')
}

export function panDuanBiaoQingZaiTi(
  shuRu: AIYinQingShuRu,
  ceLue?: DirectorCeLue,
  riQi: Date = new Date(),
): BiaoQingZaiTiJueCe {
  try {
    const nianLingDang = quNianLingDang(shuRu?.jiao_se?.nian_ling)
    const geRenXiShu = quGeRenXiShu(shuRu?.jiao_se_id)
    const jieDuanXuHao = quJieDuanXuHao(shuRu?.hao_gan_du?.guan_xi_jie_duan)
    const liShi = qingXiLiShi(shuRu?.dui_hua_li_shi)
    const shouGan = jiSuanBiaoQingShouGan(
      liShi,
      {
        ie_lei_xing: shuRu?.jiao_se?.ie_lei_xing,
        re_shen_lei_xing: shuRu?.jiao_se?.re_shen_lei_xing,
      },
      BiaoQingGuanXiJieDuanShunXu[jieDuanXuHao],
    )
    const qiWangJianGe = Math.min(
      BiaoQingMiDu.jianGe.zuiDa,
      BiaoQingMiDu.shangCiZhuiSuZuiDuoTiao - 1,
      Math.max(
        BiaoQingMiDu.jianGe.zuiXiao,
        Math.round(shouGan.qiWangJianGeLunShu * nianLingDang.jianGeBeiLv * geRenXiShu),
      ),
    )

    let yuanYin: BiaoQingZaiTiYuanYin = '放行'
    if (!BiaoQingBaoYunXing.daKai) yuanYin = '总开关关闭'
    else if (shiShenYe(riQi)) yuanYin = '深夜'
    else if (shiWeiJi(shuRu, ceLue)) yuanYin = '危机'
    else if (jieDuanXuHao < quJieDuanXuHao(BiaoQingZaiTiPeiZhi.zuiDiYunXuJieDuan)) yuanYin = '关系未到'
    else if (shiHuiJing(liShi)) yuanYin = '回敬'
    else if (shouGan.shangCiFaTuLunShu !== null && shouGan.shangCiFaTuLunShu < qiWangJianGe) {
      yuanYin = '间隔未到'
    }

    const jueCe: BiaoQingZaiTiJueCe = {
      geiHouXuan: yuanYin === '放行' || yuanYin === '回敬',
      yuanYin,
      yunXuFengGe: nianLingDang.yunXuFengGe,
      guanXiJieDuanXuHao: jieDuanXuHao,
      nianLingDang: nianLingDang.ming,
      qiWangJianGeLunShu: qiWangJianGe,
      shangCiFaTuLunShu: shouGan.shangCiFaTuLunShu,
      quXiang: shouGan.quXiang,
    }
    debug日志.debug(RiZhiLeiXing, '本轮表情载体决策', {
      xiang_qing: {
        jiao_se_id: shuRu?.jiao_se_id ?? '',
        yuan_yin: jueCe.yuanYin,
        gei_hou_xuan: jueCe.geiHouXuan,
        nian_ling_dang: jueCe.nianLingDang,
        feng_ge_shu: jueCe.yunXuFengGe.length,
        jie_duan_xu_hao: jueCe.guanXiJieDuanXuHao,
        qi_wang_jian_ge: jueCe.qiWangJianGeLunShu,
        jian_ge_bei_lv: nianLingDang.jianGeBeiLv,
        ge_ren_xi_shu: geRenXiShu,
        shang_ci_fa_tu: jueCe.shangCiFaTuLunShu,
        qu_xiang: jueCe.quXiang,
      },
    })
    return jueCe
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '表情载体门控异常，本轮不给候选', {
      xiang_qing: { yuan_yin: '门控异常', cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return quBaoShouJueCe('门控异常')
  }
}
