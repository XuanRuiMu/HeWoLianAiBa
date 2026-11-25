import type { DuiHuaLiShiXiang } from '../types'
import { shiYunYingZiDuanXiaoXiLeiXing } from '../config/消息配置'
import { huoQuFanYi } from '../config/translations'
import { guoLvFenXiBiaoDa } from '../utils/分析层表达过滤'
import { xiaoChuShuZhiXieLu } from '../utils/数值泄露过滤'
import type { 消息信息 } from './消息'
import type { 复盘批注 } from './战绩'

export interface FuPanKeJianXiaoXi extends DuiHuaLiShiXiang {
  id: string
  shi_jian_chuo: number | null
  xuHao: number
  lei_xing: string
  yi_che_hui: boolean
  neiRongYuanWen?: string | null
}

export interface FuPanPiZhuDingWei extends 复盘批注 {
  xiao_xi_ids?: string[]
}

export interface FuPanDuan {
  xu_hao: number
  nei_rong: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose'
  fa_song_zhe_ming: string
  shi_jian: string
  shi_jian_chuo: number | null
  xiao_xi_ids: string[]
  yuan_xu_hao: number[]
  yi_che_hui?: boolean
  legacy_xu_hao?: number
  legacy_pi_zhu?: FuPanPiZhuDingWei[] | null
  legacy_pi_zhu_ke_ding_wei?: boolean
  fu_pan_pi_zhu?: 复盘批注[]
  pi_zhu?: FuPanPiZhuDingWei
}

export interface FuPanDuanFenZu {
  id: string
  fan_wei: { qi: number; zhi: number }
  duan_lie_biao: FuPanDuan[]
  mo_ren_zhan_kai: boolean
}

export interface FuPanZhengLiJieGuo {
  xiaoXiLieBiao: FuPanKeJianXiaoXi[]
  duanLieBiao: FuPanDuan[]
  beiHuLueXuHao: number[]
  legacyPiZhuYouXiao: boolean
}

const DuanJuZiShu = 20
const XiangLinHaoMiao = 2 * 60 * 1000
const YuJuZuiDaZiShu = 60
const MeiZuZuiDuoXiaoXi = 20

const ZhuRuJuXing: RegExp[] = [
  /(忽略|忘掉|无视)(以上|之前|前面|上面)(的)?(指令|规则|提示|要求|内容)/i,
  /ignore\s+(all\s+)?(previous|above)\s+(instructions?|rules?|prompts?)/i,
  /system\s*prompt/i,
  /扮演.{0,12}(角色|AI|助手|模型)/i,
  /你现在是.{0,12}(AI|助手|系统|模型)/i,
  /进入.{0,8}(开发者|调试|越狱|无限制)模式/i,
]

export function shiWuYiYiHuoZhuRu(neiRong: string): boolean {
  const wenBen = neiRong.trim()
  if (!wenBen) return true
  if (ZhuRuJuXing.some((juXing) => juXing.test(wenBen))) return true
  const keDu = wenBen.replace(/[\s\p{P}\p{S}]/gu, '')
  if (!keDu) return true
  if (keDu.length >= 6 && new Set(Array.from(keDu)).size === 1) return true
  if (!/[\u4e00-\u9fa5a-zA-Z0-9]/.test(keDu)) return true
  return false
}

function youXiaoShiJianChuo(zhi: unknown): number | null {
  const shu = Number(zhi)
  return Number.isFinite(shu) && shu > 0 ? shu : null
}

function xiaoXiShiJianWenBen(row: 消息信息): string {
  const chuangJian = row as 消息信息 & { chuang_jian_shi_jian?: string }
  if (typeof chuangJian.chuang_jian_shi_jian === 'string') return chuangJian.chuang_jian_shi_jian
  const chuo = youXiaoShiJianChuo(row.shi_jian_chuo)
  return chuo === null ? '' : new Date(chuo).toISOString()
}

function shiKeYongXiaoXi(row: 消息信息): boolean {
  if (row.fa_song_zhe_lei_xing !== 'yonghu' && row.fa_song_zhe_lei_xing !== 'jiaose') return false
  if (row.lei_xing === 'xitong') return false
  if (shiYunYingZiDuanXiaoXiLeiXing(row.lei_xing)) return false
  return true
}

function paixuKeJianXiaoXi(lieBiao: 消息信息[]): 消息信息[] {
  return lieBiao
    .map((row, yuanSuoYin) => ({ row, yuanSuoYin, chuo: youXiaoShiJianChuo(row.shi_jian_chuo) }))
    .sort((zuo, you) => {
      if (zuo.chuo !== null && you.chuo !== null && zuo.chuo !== you.chuo) return zuo.chuo - you.chuo
      if (zuo.chuo !== null && you.chuo === null) return -1
      if (zuo.chuo === null && you.chuo !== null) return 1
      if (zuo.chuo === you.chuo && zuo.chuo !== null) {
        const idBiJiao = zuo.row.id.localeCompare(you.row.id)
        if (idBiJiao !== 0) return idBiJiao
      }
      return zuo.yuanSuoYin - you.yuanSuoYin
    })
    .map(({ row }) => row)
}

function zhengLiLegacyPiZhu(
  jieGuo: FuPanZhengLiJieGuo,
  legacyPiZhu: FuPanPiZhuDingWei[] | null | undefined,
): void {
  if (!Array.isArray(legacyPiZhu)) return
  const youId = legacyPiZhu.every(
    (xiang) =>
      Array.isArray(xiang.xiao_xi_ids) &&
      xiang.xiao_xi_ids.length > 0 &&
      xiang.xiao_xi_ids.every((id) => typeof id === 'string' && id.length > 0),
  )
  jieGuo.legacyPiZhuYouXiao = youId
  if (!youId) return
  const idDaoXuHao = new Map(jieGuo.xiaoXiLieBiao.map((x) => [x.id, x.xuHao]))
  const yuanSet = new Set(jieGuo.xiaoXiLieBiao.map((x) => x.xuHao))
  for (const xiang of legacyPiZhu) {
    if (!Number.isInteger(xiang.xu_hao) || !yuanSet.has(xiang.xu_hao)) continue
    const ids = xiang.xiao_xi_ids ?? []
    if (!ids.every((id) => idDaoXuHao.get(id) === xiang.xu_hao)) continue
    const duan = jieGuo.duanLieBiao.find((x) => x.xiao_xi_ids[0] === ids[0])
    if (!duan || ids.some((id) => !duan.xiao_xi_ids.includes(id))) continue
    if (!duan.pi_zhu) duan.pi_zhu = { ...xiang, xu_hao: duan.xu_hao, xiao_xi_ids: [...duan.xiao_xi_ids] }
  }
}

export function zhengLiFuPanXiaoXi(
  yuanLieBiao: 消息信息[],
  legacyPiZhu?: FuPanPiZhuDingWei[] | null,
): FuPanZhengLiJieGuo {
  const jieGuo: FuPanZhengLiJieGuo = {
    xiaoXiLieBiao: [],
    duanLieBiao: [],
    beiHuLueXuHao: [],
    legacyPiZhuYouXiao: !legacyPiZhu,
  }
  let dangQian: FuPanDuan | null = null
  let shangYiChuo: number | null = null
  for (const row of paixuKeJianXiaoXi(yuanLieBiao.filter(shiKeYongXiaoXi))) {
    const chuo = youXiaoShiJianChuo(row.shi_jian_chuo)
    const keJian: FuPanKeJianXiaoXi = {
      id: row.id,
      fa_song_zhe_lei_xing: row.fa_song_zhe_lei_xing as 'yonghu' | 'jiaose',
      fa_song_zhe_ming: row.fa_song_zhe_lei_xing === 'jiaose' ? '对方' : '你',
      nei_rong: row.yi_che_hui === true
        ? `${(row.neiRongYuanWen ?? '').trim()}${huoQuFanYi('liaoTian', 'yiCheHuiYuanWenQianZhui')}`.trim()
        : row.nei_rong,
      shi_jian: xiaoXiShiJianWenBen(row),
      shi_jian_chuo: chuo,
      xuHao: jieGuo.xiaoXiLieBiao.length + 1,
      lei_xing: row.lei_xing,
      yi_che_hui: row.yi_che_hui === true,
      neiRongYuanWen: typeof row.neiRongYuanWen === 'string' ? row.neiRongYuanWen : null,
      meiTiLeiBie: row.mei_ti_lei_bie ?? undefined,
      meiTiShiChangHaoMiao: row.mei_ti_shi_chang_hao_miao ?? null,
      yuanShiWenJianMing: row.mei_ti_yuan_shi_wen_jian_ming ?? undefined,
      meiTiId: row.mei_ti_id ?? undefined,
      tuWenHunPai: Array.isArray(row.nei_rong_kuai) && row.nei_rong_kuai.length > 0,
      beiYongXiaoXiId: row.bei_yong_xiao_xi_id ?? null,
    }
    jieGuo.xiaoXiLieBiao.push(keJian)
    if (keJian.yi_che_hui) {
      if (dangQian) jieGuo.duanLieBiao.push(dangQian)
      dangQian = null
      shangYiChuo = null
      const cheHuiZhengWen = (keJian.neiRongYuanWen || '').trim()
      if (cheHuiZhengWen === '' || shiWuYiYiHuoZhuRu(cheHuiZhengWen)) {
        jieGuo.beiHuLueXuHao.push(keJian.xuHao)
        continue
      }
      jieGuo.duanLieBiao.push({
        xu_hao: jieGuo.duanLieBiao.length + 1,
        nei_rong: `${cheHuiZhengWen}${huoQuFanYi('liaoTian', 'yiCheHuiYuanWenQianZhui')}`,
        fa_song_zhe_lei_xing: keJian.fa_song_zhe_lei_xing === 'jiaose' ? 'jiaose' : 'yonghu',
        fa_song_zhe_ming: keJian.fa_song_zhe_ming,
        shi_jian: keJian.shi_jian,
        shi_jian_chuo: chuo,
        xiao_xi_ids: [keJian.id],
        yuan_xu_hao: [keJian.xuHao],
        yi_che_hui: true,
      })
      continue
    }
    if (shiWuYiYiHuoZhuRu(keJian.nei_rong)) {
      if (dangQian) jieGuo.duanLieBiao.push(dangQian)
      dangQian = null
      shangYiChuo = null
      jieGuo.beiHuLueXuHao.push(keJian.xuHao)
      continue
    }
    const keHeBing =
      !!dangQian &&
      dangQian.fa_song_zhe_lei_xing === keJian.fa_song_zhe_lei_xing &&
      Array.from(keJian.nei_rong.trim()).length <= DuanJuZiShu &&
      Array.from(dangQian.nei_rong).length + Array.from(keJian.nei_rong.trim()).length <= YuJuZuiDaZiShu &&
      (shangYiChuo === null || chuo === null || (chuo >= shangYiChuo && chuo - shangYiChuo <= XiangLinHaoMiao))
    if (keHeBing && dangQian) {
      dangQian.nei_rong = `${dangQian.nei_rong} ${keJian.nei_rong.trim()}`
      dangQian.xiao_xi_ids.push(keJian.id)
      dangQian.yuan_xu_hao.push(keJian.xuHao)
    } else {
      if (dangQian) jieGuo.duanLieBiao.push(dangQian)
      dangQian = {
        xu_hao: jieGuo.duanLieBiao.length + 1,
        nei_rong: keJian.nei_rong.trim(),
        fa_song_zhe_lei_xing: keJian.fa_song_zhe_lei_xing === 'jiaose' ? 'jiaose' : 'yonghu',
        fa_song_zhe_ming: keJian.fa_song_zhe_ming,
        shi_jian: keJian.shi_jian,
        shi_jian_chuo: chuo,
        xiao_xi_ids: [keJian.id],
        yuan_xu_hao: [keJian.xuHao],
      }
    }
    shangYiChuo = chuo
  }
  if (dangQian) jieGuo.duanLieBiao.push(dangQian)
  zhengLiLegacyPiZhu(jieGuo, legacyPiZhu)
  return jieGuo
}

export function guoLvFuPanDuanLieBiao(
  duanLieBiao: FuPanDuan[],
  piZhuLieBiao: FuPanPiZhuDingWei[] | null | undefined,
): FuPanDuan[] {
  const piZhuMap = new Map<number, FuPanPiZhuDingWei>()
  for (const xiang of piZhuLieBiao ?? []) {
    if (!xiang || !Number.isInteger(xiang.xu_hao) || xiang.xu_hao < 1 || piZhuMap.has(xiang.xu_hao)) continue
    if (typeof xiang.ping_lun !== 'string') continue
    const neiRong = shuangChongGuoLv(xiang.ping_lun)
    if (!neiRong) continue
    piZhuMap.set(xiang.xu_hao, {
      xu_hao: xiang.xu_hao,
      ping_lun: neiRong,
      ...(typeof xiang.qing_gan === 'string' && xiang.qing_gan.trim() ? { qing_gan: xiang.qing_gan.trim() } : {}),
    })
  }
  return duanLieBiao.flatMap((duan) => {
    if (duan.yi_che_hui === true) return []
    const xiang = piZhuMap.get(duan.xu_hao)
    if (!xiang) return [{ ...duan }]
    return [{ ...duan, pi_zhu: { ...xiang, xiao_xi_ids: [...duan.xiao_xi_ids] } }]
  })
}

export function shuangChongGuoLv(wenBen: string): string {
  return guoLvFenXiBiaoDa(xiaoChuShuZhiXieLu(wenBen), '复盘')
}

export function baoHuDuiXiangLeiXingZiDuan(wenBen: string): string {
  return wenBen
    .split('\n')
    .flatMap((hang) => {
      const piPei = /^(\s*对象类型\s*[：:])\s*(.*)$/.exec(hang)
      if (!piPei) return [shuangChongGuoLv(hang)]
      const zhi = shuangChongGuoLv(piPei[2])
      return zhi ? [`${piPei[1].trim()}${zhi}`] : []
    })
    .filter(Boolean)
    .join('\n')
    .trim()
}

export function fuPanDuanLieBiaoDaoPiZhu(duanLieBiao: FuPanDuan[]): FuPanPiZhuDingWei[] {
  return duanLieBiao.flatMap((duan) => duan.pi_zhu ? [{
    ...duan.pi_zhu,
    xu_hao: duan.xu_hao,
    xiao_xi_ids: [...duan.xiao_xi_ids],
    yuan_xu_hao: [...duan.yuan_xu_hao],
  }] : [])
}

export function fuPanDuanFenZu(
  duanLieBiao: FuPanDuan[],
  meiZuZuiDuoXiaoXi = MeiZuZuiDuoXiaoXi,
  moRenZuiJinXiaoXiShu = 12,
): { fen_zu: FuPanDuanFenZu[]; zong_duan_shu: number; hai_you_geng_duo: boolean } {
  const fenZu: FuPanDuanFenZu[] = []
  let dangQian: FuPanDuan[] = []
  let dangQianXiaoXiShu = 0
  for (const duan of duanLieBiao) {
    if (dangQian.length > 0 && dangQianXiaoXiShu + duan.xiao_xi_ids.length > meiZuZuiDuoXiaoXi) {
      fenZu.push({ id: `zu-${fenZu.length + 1}`, fan_wei: { qi: dangQian[0].xu_hao, zhi: dangQian.at(-1)?.xu_hao ?? dangQian[0].xu_hao }, duan_lie_biao: dangQian, mo_ren_zhan_kai: true })
      dangQian = []
      dangQianXiaoXiShu = 0
    }
    dangQian.push(duan)
    dangQianXiaoXiShu += duan.xiao_xi_ids.length
  }
  if (dangQian.length > 0) {
    fenZu.push({ id: `zu-${fenZu.length + 1}`, fan_wei: { qi: dangQian[0].xu_hao, zhi: dangQian.at(-1)?.xu_hao ?? dangQian[0].xu_hao }, duan_lie_biao: dangQian, mo_ren_zhan_kai: true })
  }
  let keJian = 0
  let zuiJin = Math.max(0, fenZu.length - 1)
  while (zuiJin > 0) {
    const benZu = fenZu[zuiJin].duan_lie_biao.reduce((shu, x) => shu + x.xiao_xi_ids.length, 0)
    if (keJian > 0 && keJian + benZu > moRenZuiJinXiaoXiShu) break
    keJian += benZu
    if (keJian >= moRenZuiJinXiaoXiShu || keJian + benZu > moRenZuiJinXiaoXiShu) break
    zuiJin -= 1
  }
  return {
    fen_zu: fenZu.map((zu, suoYin) => ({ ...zu, mo_ren_zhan_kai: suoYin >= zuiJin })),
    zong_duan_shu: duanLieBiao.length,
    hai_you_geng_duo: zuiJin > 0,
  }
}
