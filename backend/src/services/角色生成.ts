import { debug日志 } from '../utils/debug日志'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { AI_PEI_ZHI } from '../config/AI配置'
import { huoQuNiChengKu } from '../utils/昵称解析'
import {
  type MBTILeiXing,
  type ShenFenLeiXing,
  mbtiLieBiao,
  mbtiZhongWenMing,
  nanXingMingZiKu,
  nvXingMingZiKu,
  shenFenLieBiao,
  shenFenPeiZhi,
  nianJiPeiZhi,
  shiXueShengShenFen,
  chengShiKu,
  gongZuoZhuangTaiKu,
  xianShangAiHaoKu,
  pengYouQuanXiGuanKu,
  sheJiaoQuanKu,
  weiXinXiGuanKu,
  zuoXiGuiLvKu,
  waiMaoYuanXing,
  zhiYeZhuanYe,
  aiHao,
  jiaXiang,
  xiHuanDeLeiXing,
  jiaTingBeiJing,
  qingGanJingLi,
  xingGeMiaoShu,
  yanYuFengGe,
  xingWeiTeDian,
  xiTongTiShi,
  touXiangEmoji,
  zhaXingBianTi,
  haoGanDuJiChuFanWei,
  jiSuanHuiFuYanChiHaoMiao,
  huiFuYanChiJiZhunHaoMiao,
  huiFuYanChiZuiXiaoHaoMiao,
  huiFuYanChiZuiDaHaoMiao,
  获取默认音色,
} from '../config/角色配置'
import { baoCunJiaoSeXiaoXi } from './AI输入准备'
import { shengChengKaiChangBai } from './开场白生成'
import { jiSuanKaiChangBaiGaiLv } from './开场白概率'

// R3 提示注入防护：人设文本长度上限与指令特征清洗
const REN_SHE_WEN_BEN_ZUI_DA_CHANG_DU = 500

const ZHI_LING_TE_ZHENG_MO_SHI: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
  /forget\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
  /\b(?:system|assistant|user|developer)\s*[:：]/gi,
  /<\/?\s*(?:system|instructions?)\s*>/gi,
  /你是一个?(?:AI|Ai|ai|人工智能|大语言模型|机器人|程序)[^\u4e00-\u9fa5a-zA-Z0-9]{0,4}[\u4e00-\u9fa5]{0,6}/gi,
  /你是(?:一个)?(?:AI|Ai|ai)(?:助手|助理|机器人|模型|语言模型)/gi,
  /\b(?:ChatGPT|GPT-4|GPT-3\.5|GPT-3|OpenAI|Claude|DeepSeek)\b/gi,
  /<<<[A-Z_]+>>>/g,
]

export function qingXiRenSheWenBen(wenBen: string): string {
  if (typeof wenBen !== 'string') return ''
  let jieGuo = wenBen
  for (const moShi of ZHI_LING_TE_ZHENG_MO_SHI) {
    jieGuo = jieGuo.replace(moShi, '')
  }
  if (jieGuo.length > REN_SHE_WEN_BEN_ZUI_DA_CHANG_DU) {
    jieGuo = jieGuo.slice(0, REN_SHE_WEN_BEN_ZUI_DA_CHANG_DU)
  }
  return jieGuo
}

const REN_SHE_BAI_MING_DAN_ZI_DUAN: ReadonlySet<string> = new Set([
  'id', 'ming_zi', 'wei_xin_ming', 'zhen_shi_ming', 'xing_bie', 'nian_ling',
  'mbti_lei_xing', 'ie_lei_xing', 're_shen_lei_xing', 'yu_she_lei_xing',
  'shen_fen', 'wai_mao', 'xing_ge', 'bei_jing_gu_shi', 'xi_hao', 'biao_qian',
  'yan_yu_feng_ge', 'xing_wei_te_dian', 'tou_xiang', 'xi_huan_de_lei_xing',
  'jia_ting_bei_jing', 'qing_gan_jing_li', 'shi_fou_zha_xing', 'zha_fa_miao_shu',
  'hua_shu', 'bao_lu_fang_shi', 'shi_po_xian_suo', 'shi_jie_xin_xi',
  'ba_da_mo_kuai', 'hao_gan_du_zong_fen', 'xi_tong_ti_shi',
  'hui_fu_yan_chi_hao_miao',
])

const REN_SHE_WEN_BEN_XING_ZI_DUAN: ReadonlySet<string> = new Set([
  'ming_zi', 'wei_xin_ming', 'zhen_shi_ming', 'shen_fen', 'wai_mao', 'xing_ge',
  'bei_jing_gu_shi', 'yan_yu_feng_ge', 'xing_wei_te_dian', 'xi_huan_de_lei_xing',
  'jia_ting_bei_jing', 'qing_gan_jing_li', 'zha_fa_miao_shu', 'bao_lu_fang_shi',
])

export function qingXiRenSheDuiXiang<T extends Record<string, unknown>>(jiaoSe: T): T {
  const jieGuo: Record<string, unknown> = {}
  const yuan = jiaoSe as Record<string, unknown>
  for (const jian of Object.keys(yuan)) {
    if (!REN_SHE_BAI_MING_DAN_ZI_DUAN.has(jian)) continue
    const zhi = yuan[jian]
    if (REN_SHE_WEN_BEN_XING_ZI_DUAN.has(jian) && typeof zhi === 'string') {
      jieGuo[jian] = qingXiRenSheWenBen(zhi)
    } else {
      jieGuo[jian] = zhi
    }
  }
  return jieGuo as T
}

export interface XinMuZhongDeTaZiDing {
  wei_xin_ming?: string
  zhen_shi_ming?: string
  nian_ling?: number
  tong_yong_ti_shi_ci?: string
}

export interface CongTiShiCiTiQuJieGuo {
  nian_ling?: number
  shen_fen?: ShenFenLeiXing
  zhi_ye?: string
  cheng_shi?: string
  jia_xiang?: string
}

const TONG_YONG_TI_SHI_CI_NIAN_LING_SHANG_XIAN = 100

function anChangDuPaiXuQuChong(wenBenZu: string[]): string[] {
  const weiYi = Array.from(new Set(wenBenZu.filter((wenBen) => wenBen.trim().length > 0)))
  return weiYi.sort((qian, hou) => hou.length - qian.length)
}

export function congTongYongTiShiCiTiQuRenShe(tiShiCi: string): CongTiShiCiTiQuJieGuo {
  const jieGuo: CongTiShiCiTiQuJieGuo = {}
  if (typeof tiShiCi !== 'string' || tiShiCi.trim().length === 0) return jieGuo
  const wenBen = tiShiCi

  const nianLingPiPei = wenBen.match(/(\d{1,3})\s*岁/)
  if (nianLingPiPei) {
    const nianLing = Number(nianLingPiPei[1])
    if (Number.isInteger(nianLing) && nianLing >= 0 && nianLing <= TONG_YONG_TI_SHI_CI_NIAN_LING_SHANG_XIAN) {
      jieGuo.nian_ling = nianLing
    }
  }

  for (const shenFen of shenFenLieBiao) {
    if (wenBen.includes(shenFen)) {
      jieGuo.shen_fen = shenFen
      break
    }
  }

  for (const chengShi of chengShiKu) {
    if (wenBen.includes(chengShi)) {
      jieGuo.cheng_shi = chengShi
      break
    }
  }

  const zhiYeHouXuan = anChangDuPaiXuQuChong(Object.values(zhiYeZhuanYe).flat())
  for (const zhiYe of zhiYeHouXuan) {
    if (wenBen.includes(zhiYe)) {
      jieGuo.zhi_ye = zhiYe
      break
    }
  }

  const jiaXiangHouXuan = anChangDuPaiXuQuChong(Object.values(jiaXiang).flat())
  for (const diMing of jiaXiangHouXuan) {
    if (diMing.length >= 2 && wenBen.includes(diMing)) {
      jieGuo.jia_xiang = diMing
      break
    }
  }

  return jieGuo
}

export interface HeBingXinMuZhongJieGuo extends CongTiShiCiTiQuJieGuo {
  wei_xin_ming?: string
  zhen_shi_ming?: string
  tong_yong_ti_shi_ci?: string
}

export function heBingMingQueYuTiQu(
  ziDing: XinMuZhongDeTaZiDing | null | undefined,
  tiQu: CongTiShiCiTiQuJieGuo | null | undefined,
): HeBingXinMuZhongJieGuo {
  const jieGuo: HeBingXinMuZhongJieGuo = {}
  if (ziDing?.wei_xin_ming) jieGuo.wei_xin_ming = ziDing.wei_xin_ming
  if (ziDing?.zhen_shi_ming) jieGuo.zhen_shi_ming = ziDing.zhen_shi_ming
  if (typeof ziDing?.nian_ling === 'number' && Number.isFinite(ziDing.nian_ling)) {
    jieGuo.nian_ling = ziDing.nian_ling
  } else if (typeof tiQu?.nian_ling === 'number') {
    jieGuo.nian_ling = tiQu.nian_ling
  }
  if (tiQu?.shen_fen) jieGuo.shen_fen = tiQu.shen_fen
  if (tiQu?.zhi_ye) jieGuo.zhi_ye = tiQu.zhi_ye
  if (tiQu?.cheng_shi) jieGuo.cheng_shi = tiQu.cheng_shi
  if (tiQu?.jia_xiang) jieGuo.jia_xiang = tiQu.jia_xiang
  if (ziDing?.tong_yong_ti_shi_ci) jieGuo.tong_yong_ti_shi_ci = ziDing.tong_yong_ti_shi_ci
  return jieGuo
}

export interface ShengChengJiaoSeCanShu {
  yong_hu_id: string
  xing_bie: 'nan' | 'nv'
  mu_biao_xing_bie?: 'nan' | 'nv' | null
  mbti_lei_xing?: MBTILeiXing | null
  shi_fou_zha_xing?: boolean
  sui_ji_xing_ge?: boolean
  xin_mu_zhong_de_ta?: XinMuZhongDeTaZiDing | null
}

export interface ShengChengJiaoSeJieGuo {
  id: string
  ming_zi: string
  xing_bie: 'nan' | 'nv'
  nian_ling: number
  shen_fen: string
  wai_mao: string
  xing_ge: string
  bei_jing_gu_shi: string
  xi_hao: string[]
  yan_yu_feng_ge: string
  xing_wei_te_dian: string
  tou_xiang: string
  biao_qian: string[]
  xi_huan_de_lei_xing: string
  jia_ting_bei_jing: string
  qing_gan_jing_li: string
  shi_fou_zha_xing: boolean
  zha_fa_miao_shu?: string
  hua_shu?: string[]
  bao_lu_fang_shi?: string
  shi_po_xian_suo?: string[]
  yu_she_lei_xing: MBTILeiXing
  mbti_lei_xing: MBTILeiXing
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: '慢热' | '快热'
  hui_fu_yan_chi_hao_miao: number
  wei_xin_ming: string
  zhen_shi_ming: string
  shi_jie_xin_xi: Record<string, unknown>
  xi_tong_ti_shi: string
  ba_da_mo_kuai: {
    ji_ben_xin_xi: string
    wai_mao: string
    xing_ge: string
    bei_jing: string
    yan_yu: string
    xing_wei: string
    guan_xi: string
    xi_tong_ti_shi: string
  }
  hao_gan_du_zong_fen: number
  voice_id?: string
}

function suiJiShu(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function suiJiXuanZe<T>(shuZu: T[]): T {
  return shuZu[Math.floor(Math.random() * shuZu.length)]
}

function anGaiLvXuanZeShenFen(): { leiXing: ShenFenLeiXing; nianLingFanWei: [number, number] } {
  const suiJi = Math.random()
  let leiJi = 0
  for (const peiZhi of shenFenPeiZhi) {
    leiJi += peiZhi.gaiLv
    if (suiJi <= leiJi) {
      return { leiXing: peiZhi.leiXing, nianLingFanWei: peiZhi.nianLingFanWei }
    }
  }
  return { leiXing: shenFenPeiZhi[0].leiXing, nianLingFanWei: shenFenPeiZhi[0].nianLingFanWei }
}

function huoQuMbti(mbtiLeiXing?: MBTILeiXing | null, tongYongTiShiCi?: string): MBTILeiXing {
  if (mbtiLeiXing && mbtiLieBiao.includes(mbtiLeiXing)) {
    return mbtiLeiXing
  }
  const jinSi = anTongYongTiShiCiXuanZuiJinMbti(tongYongTiShiCi)
  if (jinSi) return jinSi
  return suiJiXuanZe(mbtiLieBiao)
}

const MBTI_WEI_DU_GUAN_JIAN_CI: ReadonlyArray<{ weiDu: 0 | 1 | 2 | 3; zheng: string; fu: string; ci: string[] }> = [
  { weiDu: 0, zheng: 'E', fu: 'I', ci: ['外向', '社牛', '热情', '爱笑', '话痨', '自来熟', '表演', '领导', '开朗', '活泼', '社交'] },
  { weiDu: 0, zheng: 'I', fu: 'E', ci: ['内向', '社恐', '安静', '慢热', '独处', '神秘', '治愈', '文静', '宅', '敏感'] },
  { weiDu: 1, zheng: 'S', fu: 'N', ci: ['务实', '踏实', '可靠', '细节', '组织', '照顾', '实干', '稳重'] },
  { weiDu: 1, zheng: 'N', fu: 'S', ci: ['直觉', '理想', '创新', '灵感', '战略', '好奇', '浪漫', '想象'] },
  { weiDu: 2, zheng: 'T', fu: 'F', ci: ['逻辑', '理性', '分析', '果断', '指挥', '辩论', '冷静', '独立思考'] },
  { weiDu: 2, zheng: 'F', fu: 'T', ci: ['温柔', '体贴', '共情', '温暖', '热心', '艺术', '善良', '感性', '照顾他人'] },
  { weiDu: 3, zheng: 'J', fu: 'P', ci: ['计划', '高效', '自律', '果断', '组织者', '领导者', '条理'] },
  { weiDu: 3, zheng: 'P', fu: 'J', ci: ['灵活', '随性', '自发', '享受当下', '自由', '随和', '乐观'] },
]

export function anTongYongTiShiCiXuanZuiJinMbti(tiShiCi?: string): MBTILeiXing | null {
  if (typeof tiShiCi !== 'string' || tiShiCi.trim().length === 0) return null
  const wenBen = tiShiCi
  const deFen: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  let mingZhong = 0
  for (const xiang of MBTI_WEI_DU_GUAN_JIAN_CI) {
    for (const guanJian of xiang.ci) {
      if (guanJian.length > 0 && wenBen.includes(guanJian)) {
        deFen[xiang.zheng] += guanJian.length
        mingZhong += 1
      }
    }
  }
  if (mingZhong === 0) return null
  const xuan = (a: string, b: string): string => {
    if (deFen[a] === deFen[b]) return b
    return deFen[a] > deFen[b] ? a : b
  }
  const jieGuo = `${xuan('E', 'I')}${xuan('S', 'N')}${xuan('T', 'F')}${xuan('J', 'P')}`
  return mbtiLieBiao.includes(jieGuo as MBTILeiXing) ? (jieGuo as MBTILeiXing) : null
}

export const congTongYongTiShiCiTuiCeXingGe = anTongYongTiShiCiXuanZuiJinMbti

function huoQuXingBie(
  xingBie?: 'nan' | 'nv' | null,
  muBiaoXingBie?: 'nan' | 'nv' | null,
): 'nan' | 'nv' {
  if (muBiaoXingBie === 'nan' || muBiaoXingBie === 'nv') return muBiaoXingBie
  if (xingBie === 'nan' || xingBie === 'nv') return xingBie
  return suiJiXuanZe(['nan', 'nv'])
}

function huoQuMingZi(xingBie: 'nan' | 'nv'): string {
  const ku = xingBie === 'nan' ? nanXingMingZiKu : nvXingMingZiKu
  return suiJiXuanZe(ku)
}

function huoQuWeiXinMing(xingBie: 'nan' | 'nv'): string {
  const niChengKu = huoQuNiChengKu()
  const ku = xingBie === 'nan' ? niChengKu.nan : niChengKu.nv
  if (ku.length === 0) return xingBie === 'nan' ? '未知男生' : '未知女生'
  return suiJiXuanZe(ku)
}

function anQuanZhongXuanZeWaiMao(mbti: MBTILeiXing): string {
  if (Math.random() < 0.7) {
    return suiJiXuanZe(waiMaoYuanXing[mbti])
  }
  const suoYou = Object.values(waiMaoYuanXing).flat()
  return suiJiXuanZe(suoYou)
}

function anQuanZhongXuanZeZhiYe(mbti: MBTILeiXing): string {
  if (Math.random() < 0.7) {
    return suiJiXuanZe(zhiYeZhuanYe[mbti])
  }
  return suiJiXuanZe(Object.values(zhiYeZhuanYe).flat())
}

function anQuanZhongXuanZeAiHao(mbti: MBTILeiXing): string[] {
  const mbtiAiHao = [...aiHao[mbti]]
  const qiTaAiHao = Object.values(aiHao)
    .flat()
    .filter((x) => !mbtiAiHao.includes(x))
  const jieGuo: string[] = []

  while (jieGuo.length < 3) {
    const gaiLv = Math.random()
    const houXuan =
      (gaiLv < 0.6 && mbtiAiHao.length > 0) || qiTaAiHao.length === 0
        ? mbtiAiHao
        : qiTaAiHao
    const xuanZhong = suiJiXuanZe(houXuan)
    if (!jieGuo.includes(xuanZhong)) {
      jieGuo.push(xuanZhong)
    }
    const suoYin = houXuan.indexOf(xuanZhong)
    if (suoYin > -1) houXuan.splice(suoYin, 1)
  }

  return jieGuo
}

function anQuanZhongXuanZeJiaXiang(mbti: MBTILeiXing): string {
  if (Math.random() < 0.6) {
    return suiJiXuanZe(jiaXiang[mbti])
  }
  return suiJiXuanZe(Object.values(jiaXiang).flat())
}

function huoQuReShenLeiXing(mbti: MBTILeiXing): '慢热' | '快热' {
  const moZiMu = mbti.charAt(3)
  if (moZiMu === 'J' || moZiMu === 'T') {
    return huoQuFanYi('jiaoSe', 'manRe') as '慢热' | '快热'
  }
  return huoQuFanYi('jiaoSe', 'kuaiRe') as '慢热' | '快热'
}

function huoQuIeLeiXing(mbti: MBTILeiXing): 'I' | 'E' {
  return mbti.charAt(0) as 'I' | 'E'
}

function shengChengShiJieXinXi(shenFen: ShenFenLeiXing, _mbti: MBTILeiXing): Record<string, unknown> {
  const xueSheng = shiXueShengShenFen(shenFen)
  return {
    cheng_shi: suiJiXuanZe(chengShiKu),
    gong_zuo_zhuang_tai: xueSheng ? null : suiJiXuanZe(gongZuoZhuangTaiKu),
    xian_shang_ai_hao: suiJiXuanZe(xianShangAiHaoKu),
    peng_you_quan_xi_guan: suiJiXuanZe(pengYouQuanXiGuanKu),
    she_jiao_quan: suiJiXuanZe(sheJiaoQuanKu),
    wei_xin_xi_guan: suiJiXuanZe(weiXinXiGuanKu),
    zuo_xi_gui_lv: suiJiXuanZe(zuoXiGuiLvKu),
    nian_ji: xueSheng ? suiJiXuanZe(nianJiPeiZhi[shenFen]) : null,
  }
}

function ziFuChuanHashZhuanShuZi(zhongZi: string): number {
  let hash = 5381
  for (let i = 0; i < zhongZi.length; i++) {
    hash = ((hash << 5) + hash) + zhongZi.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash
}

function anZhongZiSuiJiShu(zhongZi: string, min: number, max: number): number {
  const hash = ziFuChuanHashZhuanShuZi(zhongZi)
  return min + (hash % (max - min + 1))
}

function shengChengHaoGanDuZongFen(
  mbti: MBTILeiXing,
  shiFouZhaXing: boolean,
  yongHuId?: string,
): number {
  const [jiChuMin, jiChuMax] = haoGanDuJiChuFanWei[mbti]
  const zhongZi = yongHuId ? `${yongHuId}_${mbti}` : `${mbti}_${Date.now()}_${Math.random()}`
  let zongFen = anZhongZiSuiJiShu(zhongZi, jiChuMin, jiChuMax)
  if (shiFouZhaXing) {
    const jiaFen = anZhongZiSuiJiShu(`${zhongZi}_zha_xing_jia_fen`, 200, 300)
    zongFen = Math.min(zongFen + jiaFen, 1000)
  }
  return zongFen
}

function huoQuGuanXiJieDuan(haoGanDu: number): string {
  if (haoGanDu <= 100) return 'lengDan'
  if (haoGanDu <= 200) return 'shuYuan'
  if (haoGanDu <= 300) return 'renShi'
  if (haoGanDu <= 400) return 'shuXi'
  if (haoGanDu <= 500) return 'pengYou'
  if (haoGanDu <= 600) return 'haoYou'
  if (haoGanDu <= 700) return 'aiMei'
  if (haoGanDu <= 800) return 'xinDong'
  if (haoGanDu <= 900) return 'reLian'
  return 'shenAi'
}

export function shengChengJiaoSe(canShu: ShengChengJiaoSeCanShu): ShengChengJiaoSeJieGuo {
  const mbti = huoQuMbti(canShu.mbti_lei_xing, canShu.xin_mu_zhong_de_ta?.tong_yong_ti_shi_ci)
  const xingBie = huoQuXingBie(canShu.xing_bie, canShu.mu_biao_xing_bie)
  const shiFouZhaXing = canShu.shi_fou_zha_xing || false
  const ziDing = canShu.xin_mu_zhong_de_ta ?? null

  const tiQu = ziDing?.tong_yong_ti_shi_ci
    ? congTongYongTiShiCiTiQuRenShe(ziDing.tong_yong_ti_shi_ci)
    : {}
  const heBing = heBingMingQueYuTiQu(ziDing, tiQu)
  const mingZi = heBing.zhen_shi_ming ? qingXiRenSheWenBen(heBing.zhen_shi_ming) : huoQuMingZi(xingBie)

  let shenFenJieGuo = anGaiLvXuanZeShenFen()
  if (heBing.shen_fen) {
    const piPei = shenFenPeiZhi.find((peiZhi) => peiZhi.leiXing === heBing.shen_fen)
    if (piPei) {
      shenFenJieGuo = { leiXing: piPei.leiXing, nianLingFanWei: [...piPei.nianLingFanWei] as [number, number] }
    }
  }

  let nianLing: number
  if (typeof heBing.nian_ling === 'number' && Number.isFinite(heBing.nian_ling)) {
    nianLing = Math.max(0, Math.min(100, Math.round(heBing.nian_ling)))
  } else {
    nianLing = suiJiShu(shenFenJieGuo.nianLingFanWei[0], shenFenJieGuo.nianLingFanWei[1])
  }

  const zhiYe = heBing.zhi_ye ? qingXiRenSheWenBen(heBing.zhi_ye) : anQuanZhongXuanZeZhiYe(mbti)
  const aiHaoLieBiao = anQuanZhongXuanZeAiHao(mbti)
  const jiaXiangDi = heBing.jia_xiang ? qingXiRenSheWenBen(heBing.jia_xiang) : anQuanZhongXuanZeJiaXiang(mbti)
  const chengShi = heBing.cheng_shi ? qingXiRenSheWenBen(heBing.cheng_shi) : suiJiXuanZe(chengShiKu)
  const shiJieXinXi = { ...shengChengShiJieXinXi(shenFenJieGuo.leiXing, mbti), cheng_shi: chengShi }
  const xiHuanLeiXing = xiHuanDeLeiXing[mbti]
  const jiaTing = suiJiXuanZe(jiaTingBeiJing[mbti])
  const qingGan = suiJiXuanZe(qingGanJingLi[mbti])
  const waiMao = anQuanZhongXuanZeWaiMao(mbti)
  const xingGe = xingGeMiaoShu[mbti]
  const yanYu = yanYuFengGe[mbti]
  const xingWei = xingWeiTeDian[mbti]
  const ieLeiXing = huoQuIeLeiXing(mbti)
  const reShenLeiXing = huoQuReShenLeiXing(mbti)
  const huiFuYanChiHaoMiao = jiSuanHuiFuYanChiHaoMiao({
    ieLeiXing,
    reShenLeiXing,
    shiFouZhaXing,
    xingGeWenBen: xingGe,
    yanYuFengGeWenBen: yanYu,
  })
  const xiTong = xiTongTiShi[mbti]
  const weiXinMing = heBing.wei_xin_ming ? qingXiRenSheWenBen(heBing.wei_xin_ming) : huoQuWeiXinMing(xingBie)
  const touXiang = touXiangEmoji[mbti]
  const haoGanDuZongFen = shengChengHaoGanDuZongFen(mbti, shiFouZhaXing, canShu.yong_hu_id)

  const xueSheng = shiXueShengShenFen(shenFenJieGuo.leiXing)
  const shenFenMiaoShu = xueSheng
    ? `目前是一名${shenFenJieGuo.leiXing}${suiJiXuanZe(nianJiPeiZhi[shenFenJieGuo.leiXing])}的学生，学习${zhiYe}。`
    : shenFenJieGuo.leiXing === '自由职业'
      ? `目前是一名自由职业者，从事${zhiYe}。`
      : `目前是一名${zhiYe}。`
  const buChongMiaoShu = heBing.tong_yong_ti_shi_ci
    ? `${huoQuFanYi('jiaoSe', 'buChongMiaoShuQianZhui')}${qingXiRenSheWenBen(heBing.tong_yong_ti_shi_ci)}`
    : ''
  const beiJingGuShi = `${mingZi}来自${jiaXiangDi}，现居${chengShi}。${shenFenMiaoShu}${qingGan}${buChongMiaoShu}`

  const baDaMoKuai = {
    ji_ben_xin_xi: `姓名：${mingZi}，性别：${xingBie === 'nan' ? '男' : '女'}，年龄：${nianLing}岁，身份：${shenFenJieGuo.leiXing}，职业/专业：${zhiYe}，城市：${chengShi}`,
    wai_mao: waiMao,
    xing_ge: xingGe,
    bei_jing: `${jiaTing}。${beiJingGuShi}`,
    yan_yu: yanYu,
    xing_wei: xingWei,
    guan_xi: `喜欢的类型：${xiHuanLeiXing}`,
    xi_tong_ti_shi: xiTong,
  }

  const jieGuo: ShengChengJiaoSeJieGuo = {
    id: '',
    ming_zi: mingZi,
    xing_bie: xingBie,
    nian_ling: nianLing,
    shen_fen: shenFenJieGuo.leiXing,
    wai_mao: waiMao,
    xing_ge: xingGe,
    bei_jing_gu_shi: beiJingGuShi,
    xi_hao: aiHaoLieBiao,
    yan_yu_feng_ge: yanYu,
    xing_wei_te_dian: xingWei,
    tou_xiang: touXiang,
    biao_qian: [mbti, mbtiZhongWenMing[mbti], xingBie === 'nan' ? '男生' : '女生'],
    xi_huan_de_lei_xing: xiHuanLeiXing,
    jia_ting_bei_jing: jiaTing,
    qing_gan_jing_li: qingGan,
    shi_fou_zha_xing: shiFouZhaXing,
    yu_she_lei_xing: mbti,
    mbti_lei_xing: mbti,
    ie_lei_xing: ieLeiXing,
    re_shen_lei_xing: reShenLeiXing,
    hui_fu_yan_chi_hao_miao: huiFuYanChiHaoMiao,
    wei_xin_ming: weiXinMing,
    zhen_shi_ming: mingZi,
    shi_jie_xin_xi: shiJieXinXi,
    xi_tong_ti_shi: xiTong,
    ba_da_mo_kuai: baDaMoKuai,
    hao_gan_du_zong_fen: haoGanDuZongFen,
    voice_id: 获取默认音色(mbti, xingBie),
  }

  if (shiFouZhaXing) {
    const zhaXing = zhaXingBianTi[mbti]
    jieGuo.zha_fa_miao_shu = zhaXing.zhaFaMiaoShu
    jieGuo.hua_shu = zhaXing.huaShu
    jieGuo.bao_lu_fang_shi = zhaXing.baoLuFangShi
    jieGuo.shi_po_xian_suo = zhaXing.shiPoXianSuo
  }

  return jieGuo
}

export async function baoCunJiaoSe(
  yongHuId: string,
  jiaoSe: ShengChengJiaoSeJieGuo,
  duiJuMoShi: 'putong' | 'tiaozhan' = 'putong',
): Promise<ShengChengJiaoSeJieGuo> {
  // R2 创建角色幂等：先把该用户现有「同模式」的活跃角色归档（封存），
  // 保证串行重复创建总是成功；并发场景由部分唯一索引 uk_角色_用户ID_模式_活跃
  // 兜底，同一用户同一模式同时最多只允许一个活跃（未封存且未删除）角色。
  await 数据库.query(
    `UPDATE "角色" SET "封存" = TRUE WHERE "用户ID" = $1 AND "封存" = FALSE AND "删除时间" IS NULL AND "对局模式" = $2`,
    [yongHuId, duiJuMoShi],
  )

  const tiJiaoYanChi = Number(jiaoSe.hui_fu_yan_chi_hao_miao)
  const huiFuYanChiHaoMiao = Number.isFinite(tiJiaoYanChi)
    ? Math.min(huiFuYanChiZuiDaHaoMiao, Math.max(huiFuYanChiZuiXiaoHaoMiao, Math.round(tiJiaoYanChi)))
    : huiFuYanChiJiZhunHaoMiao

  const chaRuJiaoSe = await 数据库.query(
    `INSERT INTO "角色" (
      "用户ID", "名字", "性别", "年龄", "外貌", "性格", "背景故事", "爱好",
      "言语风格", "头像", "标签", "喜欢的类型", "家庭背景", "情感经历",
      "是否渣型", "渣法描述", "话术", "暴露方式", "识破线索", "预设类型",
      "IE类型", "热身类型", "回复延迟毫秒", "开场白", "MBTI", "微信昵称", "真实姓名", "世界信息", "对局模式", "音色ID"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
    RETURNING "ID"`,
    [
      yongHuId,
      jiaoSe.ming_zi,
      jiaoSe.xing_bie === 'nan' ? '男' : '女',
      jiaoSe.nian_ling,
      jiaoSe.wai_mao,
      jiaoSe.xing_ge,
      jiaoSe.bei_jing_gu_shi,
      jiaoSe.xi_hao,
      jiaoSe.yan_yu_feng_ge,
      jiaoSe.tou_xiang,
      jiaoSe.biao_qian,
      jiaoSe.xi_huan_de_lei_xing,
      jiaoSe.jia_ting_bei_jing,
      jiaoSe.qing_gan_jing_li,
      jiaoSe.shi_fou_zha_xing,
      jiaoSe.zha_fa_miao_shu || null,
      jiaoSe.hua_shu || [],
      jiaoSe.bao_lu_fang_shi || null,
      jiaoSe.shi_po_xian_suo || [],
      jiaoSe.yu_she_lei_xing,
      jiaoSe.ie_lei_xing,
      jiaoSe.re_shen_lei_xing,
      huiFuYanChiHaoMiao,
      JSON.stringify([]),
      jiaoSe.yu_she_lei_xing,
      jiaoSe.wei_xin_ming,
      jiaoSe.zhen_shi_ming,
      JSON.stringify(jiaoSe.shi_jie_xin_xi),
      duiJuMoShi,
      jiaoSe.voice_id || null,
    ],
  )

  const jiaoSeId = String(chaRuJiaoSe.rows[0].ID)
  jiaoSe.id = jiaoSeId

  await 数据库.query(
    `INSERT INTO "好感度" (
      "用户ID", "角色ID", "信任度", "亲密度", "趣味度", "关怀度", "总分", "关系阶段"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      yongHuId,
      jiaoSeId,
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.35),
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.25),
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.2),
      Math.round(jiaoSe.hao_gan_du_zong_fen * 0.2),
      jiaoSe.hao_gan_du_zong_fen,
      huoQuGuanXiJieDuan(jiaoSe.hao_gan_du_zong_fen),
    ],
  )

  const guanXiJieDuan = huoQuGuanXiJieDuan(jiaoSe.hao_gan_du_zong_fen)
  await 数据库.query(
    `INSERT INTO "游戏档案" (
      "用户ID", "角色ID", "角色名字", "是否渣型", "结果类型", "是否封存",
      "好感度总分", "关系阶段", "聊天天数", "消息总数", "模式"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
      "角色名字" = EXCLUDED."角色名字",
      "是否渣型" = EXCLUDED."是否渣型",
      "结果类型" = EXCLUDED."结果类型",
      "是否封存" = EXCLUDED."是否封存",
      "好感度总分" = EXCLUDED."好感度总分",
      "关系阶段" = EXCLUDED."关系阶段",
      "模式" = EXCLUDED."模式"`,
    [
      yongHuId,
      jiaoSeId,
      jiaoSe.ming_zi,
      jiaoSe.shi_fou_zha_xing,
      '',
      false,
      jiaoSe.hao_gan_du_zong_fen,
      guanXiJieDuan,
      0,
      0,
      duiJuMoShi,
    ],
  )

  await 数据库.query(
    `UPDATE "用户" SET "活跃角色ID" = $1, "目标性别" = $2, "性格选择" = $3, "渣男渣女变体" = $4 WHERE "ID" = $5`,
    [
      jiaoSeId,
      jiaoSe.xing_bie === 'nan' ? '男' : '女',
      jiaoSe.yu_she_lei_xing,
      jiaoSe.shi_fou_zha_xing,
      yongHuId,
    ],
  )

  // AI 开场白生成必须在返回前完成（同步 await）。
  // 修复"开始聊天后看不到消息只有复盘能看到"的严重 bug：
  // 原先用 void async 后台生成，用户进聊天页时消息可能尚未写入数据库，
  // 且后台保存不触发 socket 推送，导致聊天页拉取消息为空。
  // 现在同步等待生成+保存完成，/生成角色/确认 返回时消息已在数据库，
  // 添加微信过渡页 1.5s 后跳转聊天页，聊天页拉取消息时直接显示。
  // 前端 queRenJiaoSe 已配置 60s timeout，DeepSeek 客户端 timeout=120s，
  // shengChengKaiChangBai 内部 try/catch 失败会降级到 jiangJi 不会抛出。
  //
  // 开场白发送：画像驱动的 10%~90% 动态门控（两步，与内容生成解耦）。
  // 第一步：AI 根据完整人物画像算出"发开场白"的概率（10%~90%）；
  //        无 AI key / 测试环境退回固定兜底概率（kaiChangBaiFaSongGaiLv）。
  // 第二步：系统随机选 [0,1) 一个数，小于概率则发送——概率高的角色更常发，低的更少发。
  // 测试环境强制 faSongGaiLv=1（必发）以保证确定性。
  try {
    const kcbCanShu: Parameters<typeof shengChengKaiChangBai>[0] = {
      mbti_lei_xing: jiaoSe.mbti_lei_xing,
      ie_lei_xing: jiaoSe.ie_lei_xing,
      re_shen_lei_xing: jiaoSe.re_shen_lei_xing,
      shi_fou_zha_xing: jiaoSe.shi_fou_zha_xing,
      xing_ge: jiaoSe.xing_ge,
      yan_yu_feng_ge: jiaoSe.yan_yu_feng_ge,
      xi_huan_de_lei_xing: jiaoSe.xi_huan_de_lei_xing,
      xing_bie: jiaoSe.xing_bie,
      ming_zi: jiaoSe.ming_zi,
      bei_jing_gu_shi: jiaoSe.bei_jing_gu_shi,
      qing_gan_jing_li: jiaoSe.qing_gan_jing_li,
      jia_ting_bei_jing: jiaoSe.jia_ting_bei_jing,
      tou_xiang: jiaoSe.tou_xiang,
      biao_qian: jiaoSe.biao_qian,
    }
    const faSongGaiLv =
      process.env.VITEST === 'true' ? 1 : await jiSuanKaiChangBaiGaiLv(kcbCanShu)
    const kaiChangBai =
      Math.random() < faSongGaiLv
        ? await shengChengKaiChangBai(kcbCanShu)
        : { xiao_xi_lie_biao: [] as string[] }
    for (const neiRong of kaiChangBai.xiao_xi_lie_biao.slice(0, 5)) {
      if (neiRong.trim()) {
        await baoCunJiaoSeXiaoXi({
          yong_hu_id: yongHuId,
          jiao_se_id: jiaoSeId,
          nei_rong: neiRong.trim(),
        })
      }
    }
  } catch (cuoWu) {
    debug日志.error('角色生成', '生成开场白消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }

  return jiaoSe
}

export async function anIdChaJiaoSeXiangQing(
  jiaoSeId: string,
): Promise<ShengChengJiaoSeJieGuo | null> {
  const jieGuo = await 数据库.query(`SELECT * FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiaoSeId])
  if (jieGuo.rows.length === 0) return null

  const row = jieGuo.rows[0]
  const shiJieXinXi = row.世界信息
    ? typeof row.世界信息 === 'object'
      ? row.世界信息
      : JSON.parse(String(row.世界信息))
    : {}

  return {
    id: String(row.ID),
    ming_zi: String(row.名字),
    xing_bie: row.性别 === '女' ? 'nv' : 'nan',
    nian_ling: Number(row.年龄),
    shen_fen: '',
    wai_mao: String(row.外貌 || ''),
    xing_ge: String(row.性格 || ''),
    bei_jing_gu_shi: String(row.背景故事 || ''),
    xi_hao: Array.isArray(row.爱好) ? row.爱好 : [],
    yan_yu_feng_ge: String(row.言语风格 || ''),
    xing_wei_te_dian: '',
    tou_xiang: String(row.头像 || ''),
    biao_qian: Array.isArray(row.标签) ? row.标签 : [],
    xi_huan_de_lei_xing: String(row.喜欢的类型 || ''),
    jia_ting_bei_jing: String(row.家庭背景 || ''),
    qing_gan_jing_li: String(row.情感经历 || ''),
    shi_fou_zha_xing: Boolean(row.是否渣型),
    zha_fa_miao_shu: row.渣法描述 ? String(row.渣法描述) : undefined,
    hua_shu: Array.isArray(row.话术) ? row.话术 : undefined,
    bao_lu_fang_shi: row.暴露方式 ? String(row.暴露方式) : undefined,
    shi_po_xian_suo: Array.isArray(row.识破线索) ? row.识破线索 : undefined,
    yu_she_lei_xing: String(row.预设类型 || row.MBTI || 'INTJ') as MBTILeiXing,
    mbti_lei_xing: String(row.MBTI || row.预设类型 || 'INTJ') as MBTILeiXing,
    ie_lei_xing: String(row.IE类型 || 'I') as 'I' | 'E',
    re_shen_lei_xing: String(row.热身类型 || '慢热') as '慢热' | '快热',
    hui_fu_yan_chi_hao_miao: Number(row.回复延迟毫秒) || huiFuYanChiJiZhunHaoMiao,
    wei_xin_ming: String(row.微信昵称 || row.名字 || ''),
    zhen_shi_ming: String(row.真实姓名 || row.名字 || ''),
    shi_jie_xin_xi: shiJieXinXi as Record<string, unknown>,
    xi_tong_ti_shi: '',
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '',
      wai_mao: '',
      xing_ge: '',
      bei_jing: '',
      yan_yu: '',
      xing_wei: '',
      guan_xi: '',
      xi_tong_ti_shi: '',
    },
    hao_gan_du_zong_fen: 0,
  }
}
