import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi, huoQuFanYiMiaoShu } from '../config/translations'
import { HAO_GAN_DU_PEI_ZHI } from '../config/好感度配置'
import { fenJieSiWei, huoQuJieDuanXinXi } from './好感度'
import {
  CUO_WU_DAI_MA,
  JiaoSeShengChengCuoWu,
} from '../config/错误码注册表'
import { huoQuNiChengKu } from '../utils/昵称解析'
import { 剥离控制字符 } from '../utils/控制字符'
import { 内部转展示, 落库性别或拒绝, 读回性别, 性别内部形态列表, type 性别内部形态 } from '../utils/性别'
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
  xueXiaoKu,
  gongZuoZhuangTaiKu,
  xianShangAiHaoKu,
  pengYouQuanXiGuanKu,
  sheJiaoQuanKu,
  weiXinXiGuanKu,
  zuoXiGuiLvKu,
  waiMaoYuanXing,
  zhiYeXueKeKu,
  zhiYeZhiYeKu,
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
import { XUE_KE_TONG_YI_CI, ZHI_YE_TONG_YI_CI } from '../config/职业同义词'
import { baoCunJiaoSeXiaoXi } from './AI输入准备'
import { shengChengKaiChangBai } from './开场白生成'

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
  let jieGuo = 剥离控制字符(wenBen)
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
  'jia_ting_bei_jing', 'qing_gan_jing_li',
  'shi_fou_zha_xing', 'shi_jie_xin_xi', 'sui_ji_xing_ge',
  'ba_da_mo_kuai', 'xi_tong_ti_shi', 'voice_id',
  'hui_fu_yan_chi_hao_miao',
])

export const KE_HU_DUAN_JIN_ZI_DUAN: readonly string[] = [
  'hao_gan_du_zong_fen',
  'zha_fa_miao_shu',
  'hua_shu',
  'bao_lu_fang_shi',
  'shi_po_xian_suo',
]
export const ZHA_XING_YIN_CANG_ZI_DUAN: readonly (keyof ShengChengJiaoSeJieGuo)[] = [
  'shi_fou_zha_xing',
  'zha_fa_miao_shu',
  'hua_shu',
  'bao_lu_fang_shi',
  'shi_po_xian_suo',
]
export const JIAO_SE_YIN_SI_ZI_DUAN: readonly (keyof ShengChengJiaoSeJieGuo)[] = [
  'ming_zi',
  'zhen_shi_ming',
  'bei_jing_gu_shi',
  'shi_jie_xin_xi',
  'xi_tong_ti_shi',
  'ba_da_mo_kuai',
]

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
    if (KE_HU_DUAN_JIN_ZI_DUAN.includes(jian)) continue
    const zhi = yuan[jian]
    if (REN_SHE_WEN_BEN_XING_ZI_DUAN.has(jian) && typeof zhi === 'string') {
      jieGuo[jian] = qingXiRenSheWenBen(zhi)
    } else {
      jieGuo[jian] = zhi
    }
  }
  return jieGuo as T
}

export function chongZhuZhaXingZiDuan(
  jiaoSe: ShengChengJiaoSeJieGuo,
): ShengChengJiaoSeJieGuo {
  if (!jiaoSe.shi_fou_zha_xing) {
    delete jiaoSe.zha_fa_miao_shu
    delete jiaoSe.hua_shu
    delete jiaoSe.bao_lu_fang_shi
    delete jiaoSe.shi_po_xian_suo
    return jiaoSe
  }
  const mbti = jiaoSe.mbti_lei_xing
  if (!mbtiLieBiao.includes(mbti)) return jiaoSe
  const zhaXing = zhaXingBianTi[mbti]
  jiaoSe.zha_fa_miao_shu = zhaXing.zhaFaMiaoShu
  jiaoSe.hua_shu = [...zhaXing.huaShu]
  jiaoSe.bao_lu_fang_shi = zhaXing.baoLuFangShi
  jiaoSe.shi_po_xian_suo = [...zhaXing.shiPoXianSuo]
  return jiaoSe
}

const ZHA_XING_YU_HAO_GAN_DU_YIN_CANG_ZI_DUAN: readonly (keyof ShengChengJiaoSeJieGuo)[] = [
  ...ZHA_XING_YIN_CANG_ZI_DUAN,
  'hao_gan_du_zong_fen',
]

const WAN_JIA_KE_JIAN_XING_GUI_LEI: Record<keyof ShengChengJiaoSeJieGuo, boolean> = {
  id: true,
  ming_zi: false,
  xing_bie: true,
  nian_ling: true,
  shen_fen: true,
  wai_mao: true,
  xing_ge: true,
  bei_jing_gu_shi: false,
  xi_hao: true,
  yan_yu_feng_ge: true,
  xing_wei_te_dian: true,
  tou_xiang: true,
  biao_qian: true,
  xi_huan_de_lei_xing: true,
  jia_ting_bei_jing: true,
  qing_gan_jing_li: true,
  shi_fou_zha_xing: false,
  zha_fa_miao_shu: false,
  hua_shu: false,
  bao_lu_fang_shi: false,
  shi_po_xian_suo: false,
  yu_she_lei_xing: true,
  mbti_lei_xing: true,
  ie_lei_xing: true,
  sui_ji_xing_ge: true,
  re_shen_lei_xing: true,
  hui_fu_yan_chi_hao_miao: true,
  wei_xin_ming: true,
  zhen_shi_ming: false,
  shi_jie_xin_xi: false,
  xi_tong_ti_shi: false,
  ba_da_mo_kuai: false,
  hao_gan_du_zong_fen: false,
  voice_id: true,
  yao_kai_kou: true,
}

function anYinCangZiDuanTouYing<T extends object>(jiaoSe: T, yinCang: readonly (keyof ShengChengJiaoSeJieGuo)[]): T {
  const jieGuo: Record<string, unknown> = { ...(jiaoSe as Record<string, unknown>) }
  for (const jian of yinCang) delete jieGuo[jian as string]
  return jieGuo as T
}

export function touYingWanJiaKeJianJiaoSe<T extends object>(jiaoSe: T): T {
  const yuan = jiaoSe as Record<string, unknown>
  const jieGuo: Record<string, unknown> = {}
  for (const [jian, keJian] of Object.entries(WAN_JIA_KE_JIAN_XING_GUI_LEI)) {
    if (keJian && jian in yuan) jieGuo[jian] = yuan[jian]
  }
  return jieGuo as T
}

export function touYingGuanLiJiaoSe<T extends object>(jiaoSe: T): T {
  return anYinCangZiDuanTouYing(jiaoSe, ZHA_XING_YU_HAO_GAN_DU_YIN_CANG_ZI_DUAN)
}

const DAI_QU_REN_JIAO_SE_JIAN_QIAN_ZHUI = 'dai_que_ren_jiao_se:'
const DAI_QU_REN_JIAO_SE_TTL_MIAO = 1800

export function daiQueRenJiaoSeJian(yong_hu_id: string): string {
  return `${DAI_QU_REN_JIAO_SE_JIAN_QIAN_ZHUI}${yong_hu_id}`
}

export async function huanCunDaiQueRenJiaoSe(
  yong_hu_id: string,
  jiaoSe: ShengChengJiaoSeJieGuo,
): Promise<void> {
  try {
    await redis.set(daiQueRenJiaoSeJian(yong_hu_id), JSON.stringify(jiaoSe), 'EX', DAI_QU_REN_JIAO_SE_TTL_MIAO)
  } catch {
    return
  }
}

export async function duQuDaiQueRenJiaoSe(yong_hu_id: string): Promise<ShengChengJiaoSeJieGuo | null> {
  try {
    const zhi = await redis.get(daiQueRenJiaoSeJian(yong_hu_id))
    if (!zhi) return null
    const jieXi = JSON.parse(zhi) as { ming_zi?: unknown; zhen_shi_ming?: unknown }
    if (typeof jieXi !== 'object' || jieXi === null) return null
    if (typeof jieXi.ming_zi !== 'string' && typeof jieXi.zhen_shi_ming !== 'string') return null
    return jieXi as ShengChengJiaoSeJieGuo
  } catch {
    return null
  }
}

export async function qingChuDaiQueRenJiaoSe(yong_hu_id: string): Promise<void> {
  try {
    await redis.del(daiQueRenJiaoSeJian(yong_hu_id))
  } catch {
    return
  }
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

  const zhiYeHouXuan = anChangDuPaiXuQuChong([...zhiYeXueKeKu, ...zhiYeZhiYeKu])
  for (const zhiYe of zhiYeHouXuan) {
    if (wenBen.includes(zhiYe)) {
      jieGuo.zhi_ye = zhiYe
      break
    }
  }
  if (!jieGuo.zhi_ye) {
    const tongYiHouXuan = Object.entries({ ...XUE_KE_TONG_YI_CI, ...ZHI_YE_TONG_YI_CI })
      .sort(([qian], [hou]) => hou.length - qian.length)
    for (const [chengHu, guiFanCi] of tongYiHouXuan) {
      if (wenBen.includes(chengHu)) {
        jieGuo.zhi_ye = guiFanCi
        break
      }
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
  xing_bie: 性别内部形态
  mu_biao_xing_bie?: 性别内部形态 | null
  mbti_lei_xing?: MBTILeiXing | null
  shi_fou_zha_xing?: boolean
  sui_ji_xing_ge?: boolean
  xin_mu_zhong_de_ta?: XinMuZhongDeTaZiDing | null
}

export interface ShengChengJiaoSeJieGuo {
  id: string
  ming_zi: string
  xing_bie: 性别内部形态
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
  sui_ji_xing_ge: boolean
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
  yao_kai_kou?: boolean
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
  xingBie?: 性别内部形态 | null,
  muBiaoXingBie?: 性别内部形态 | null,
): 性别内部形态 {
  if (muBiaoXingBie === 'nan' || muBiaoXingBie === 'nv') return muBiaoXingBie
  if (xingBie === 'nan' || xingBie === 'nv') return xingBie
  return suiJiXuanZe([...性别内部形态列表])
}

function huoQuMingZi(xingBie: 性别内部形态): string {
  const ku = xingBie === 'nan' ? nanXingMingZiKu : nvXingMingZiKu
  return suiJiXuanZe(ku)
}

function huoQuWeiXinMing(xingBie: 性别内部形态): string {
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

function anQuanZhongXuanZeZhiYe(shenFen: ShenFenLeiXing): string {
  if (shiXueShengShenFen(shenFen)) {
    return suiJiXuanZe(zhiYeXueKeKu)
  }
  return suiJiXuanZe(zhiYeZhiYeKu)
}

function xuanZeZhiYe(shenFen: ShenFenLeiXing, zhiYeTiQu: string): string {
  if (zhiYeTiQu) return zhiYeTiQu
  return anQuanZhongXuanZeZhiYe(shenFen)
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

function shengChengShiJieXinXi(shenFen: ShenFenLeiXing, _mbti: MBTILeiXing, nianJi: string | null, chengShi: string): Record<string, unknown> {
  const xueSheng = shiXueShengShenFen(shenFen)
  return {
    cheng_shi: chengShi,
    xue_xiao: shenFen === '大专生'
      ? chengShi + '职业技术学院'
      : suiJiXuanZe(xueXiaoKu[chengShi] || ['省属师范大学']),
    gong_zuo_zhuang_tai: xueSheng ? null : suiJiXuanZe(gongZuoZhuangTaiKu),
    xian_shang_ai_hao: suiJiXuanZe(xianShangAiHaoKu),
    peng_you_quan_xi_guan: suiJiXuanZe(pengYouQuanXiGuanKu),
    she_jiao_quan: suiJiXuanZe(sheJiaoQuanKu),
    wei_xin_xi_guan: suiJiXuanZe(weiXinXiGuanKu),
    zuo_xi_gui_lv: suiJiXuanZe(zuoXiGuiLvKu),
    jia_ting_ren_shu: 3 + Math.floor(Math.random() * 3),
    nian_ji: xueSheng ? nianJi : null,
  }
}

function ziFuChuanHashZhuanShuZi(zhongZi: string): number {
  let haXiZhi = 5381
  for (let i = 0; i < zhongZi.length; i++) {
    haXiZhi = ((haXiZhi << 5) + haXiZhi) + zhongZi.charCodeAt(i)
    haXiZhi = haXiZhi >>> 0
  }
  return haXiZhi
}

function anZhongZiSuiJiShu(zhongZi: string, min: number, max: number): number {
  const haXiZhi = ziFuChuanHashZhuanShuZi(zhongZi)
  return min + (haXiZhi % (max - min + 1))
}

export function shengChengHaoGanDuZongFen(
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
  const jieDuan = huoQuJieDuanXinXi(haoGanDu)
  return Object.keys(HAO_GAN_DU_PEI_ZHI.jieDuan).find(
    (jian) => HAO_GAN_DU_PEI_ZHI.jieDuan[jian as keyof typeof HAO_GAN_DU_PEI_ZHI.jieDuan] === jieDuan,
  ) ?? 'lengDan'
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

  const zhiYeTiQu = heBing.zhi_ye ? qingXiRenSheWenBen(heBing.zhi_ye) : ''
  const zhiYe = xuanZeZhiYe(shenFenJieGuo.leiXing, zhiYeTiQu)
  const nianJi = shiXueShengShenFen(shenFenJieGuo.leiXing)
    ? suiJiXuanZe(nianJiPeiZhi[shenFenJieGuo.leiXing])
    : null
  const aiHaoLieBiao = anQuanZhongXuanZeAiHao(mbti)
  const jiaXiangDi = heBing.jia_xiang ? qingXiRenSheWenBen(heBing.jia_xiang) : anQuanZhongXuanZeJiaXiang(mbti)
  const chengShi = heBing.cheng_shi ? qingXiRenSheWenBen(heBing.cheng_shi) : suiJiXuanZe(chengShiKu)
  const shiJieXinXi = {
    ...shengChengShiJieXinXi(shenFenJieGuo.leiXing, mbti, nianJi, chengShi),
    cheng_shi: chengShi,
    zhi_ye: zhiYe,
  }
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
  const shenFenMiaoShu = xueSheng && nianJi
    ? huoQuFanYiMiaoShu('jiaoSe', 'jiaoSeMiaoShuXueSheng', { nianJi, shenFen: shenFenJieGuo.leiXing, zhiYe })
    : shenFenJieGuo.leiXing === '自由职业'
      ? huoQuFanYiMiaoShu('jiaoSe', 'jiaoSeMiaoShuZiYou', { zhiYe })
      : huoQuFanYiMiaoShu('jiaoSe', 'jiaoSeMiaoShuGongZuo', { zhiYe })
  const buChongMiaoShu = heBing.tong_yong_ti_shi_ci
    ? `${huoQuFanYi('jiaoSe', 'buChongMiaoShuQianZhui')}${qingXiRenSheWenBen(heBing.tong_yong_ti_shi_ci)}`
    : ''
  const beiJingGuShi = `${mingZi}来自${jiaXiangDi}，现居${chengShi}。${shenFenMiaoShu}${buChongMiaoShu}`

  const baDaMoKuai = {
    ji_ben_xin_xi: `姓名：${mingZi}，性别：${内部转展示(xingBie)}，年龄：${nianLing}岁，身份：${shenFenJieGuo.leiXing}，职业/专业：${zhiYe}，城市：${chengShi}`,
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
    biao_qian: [mbti, mbtiZhongWenMing[mbti], `${内部转展示(xingBie)}生`],
    xi_huan_de_lei_xing: xiHuanLeiXing,
    jia_ting_bei_jing: jiaTing,
    qing_gan_jing_li: qingGan,
    shi_fou_zha_xing: shiFouZhaXing,
    yu_she_lei_xing: mbti,
    mbti_lei_xing: mbti,
    ie_lei_xing: ieLeiXing,
    sui_ji_xing_ge: canShu.sui_ji_xing_ge ?? false,
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

async function jiLuKaiChangBaiJueCe(
  jiao_se_id: string,
  dang_wei: string,
  gai_lv: number,
  yao_kai_kou: boolean,
  tiao_shu: number,
): Promise<void> {
  try {
    await 数据库.query(`UPDATE "角色" SET "开场白" = $1 WHERE "ID" = $2`, [
      JSON.stringify({
        主动程度: dang_wei,
        出不出声: yao_kai_kou,
        概率: Number(gai_lv.toFixed(2)),
        条数: yao_kai_kou ? tiao_shu : 0,
      }),
      jiao_se_id,
    ])
  } catch {
    return
  }
}

export async function baoCunJiaoSe(
  yongHuId: string,
  jiaoSe: ShengChengJiaoSeJieGuo,
  duiJuMoShi: 'putong' | 'tiaozhan' = 'putong',
): Promise<ShengChengJiaoSeJieGuo> {
  chongZhuZhaXingZiDuan(jiaoSe)
  if (mbtiLieBiao.includes(jiaoSe.mbti_lei_xing)) {
    jiaoSe.hao_gan_du_zong_fen = shengChengHaoGanDuZongFen(
      jiaoSe.mbti_lei_xing,
      jiaoSe.shi_fou_zha_xing === true,
      yongHuId,
    )
  }

  let xingBieLuoKu: 性别内部形态
  try {
    xingBieLuoKu = 落库性别或拒绝(jiaoSe.xing_bie, '角色生成', yongHuId)
  } catch (cuoWu) {
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_INPUT_INVALID, cuoWu)
  }
  const lianJieHanShu = (数据库 as unknown as { connect?: unknown }).connect
  let shiWuKeHuDuan: { query: (wen: string, can?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>; release: () => void } | undefined
  if (typeof lianJieHanShu === 'function') {
    try {
      const keHuDuan = await (lianJieHanShu as () => Promise<{ query: (wen: string, can?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>; release: () => void }>).call(数据库)
      if (keHuDuan && typeof keHuDuan.query === 'function' && typeof keHuDuan.release === 'function') {
        shiWuKeHuDuan = keHuDuan
      }
    } catch {
      shiWuKeHuDuan = undefined
    }
  }
  const zhiXing = shiWuKeHuDuan ?? 数据库
  let jiaoSeId = ''
  const huiFuYanChiHaoMiao = (() => {
    const tiJiaoYanChi = Number(jiaoSe.hui_fu_yan_chi_hao_miao)
    return Number.isFinite(tiJiaoYanChi)
      ? Math.min(huiFuYanChiZuiDaHaoMiao, Math.max(huiFuYanChiZuiXiaoHaoMiao, Math.round(tiJiaoYanChi)))
      : huiFuYanChiJiZhunHaoMiao
  })()
  try {
    if (shiWuKeHuDuan) {
      await zhiXing.query('BEGIN')
    }
    if (duiJuMoShi === 'tiaozhan') {
      await zhiXing.query(
        `UPDATE "角色" SET "封存" = TRUE WHERE "用户ID" = $1 AND "封存" = FALSE AND "删除时间" IS NULL AND "对局模式" = $2`,
        [yongHuId, duiJuMoShi],
      )
    }

    const chaRuJiaoSe = await zhiXing.query(
    `INSERT INTO "角色" (
      "用户ID", "名字", "性别", "年龄", "外貌", "性格", "背景故事", "爱好",
      "言语风格", "头像", "标签", "喜欢的类型", "家庭背景", "情感经历",
      "是否渣型", "渣法描述", "话术", "暴露方式", "识破线索", "预设类型",
      "IE类型", "热身类型", "回复延迟毫秒", "开场白", "MBTI", "微信昵称", "真实姓名", "世界信息", "对局模式", "音色ID",
      "封存", "可继续聊天", "结局状态", "随机性格"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
    RETURNING "ID"`,
    [
      yongHuId,
      jiaoSe.ming_zi,
      xingBieLuoKu,
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
      false,
      true,
      '',
      jiaoSe.sui_ji_xing_ge === true,
    ],
  )

  const jiaoSeIdNei = String(chaRuJiaoSe.rows[0].ID)
  jiaoSeId = jiaoSeIdNei
  jiaoSe.id = jiaoSeIdNei

  await zhiXing.query(
    `INSERT INTO "好感度" (
      "用户ID", "角色ID", "信任度", "亲密度", "趣味度", "关怀度", "总分", "关系阶段"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      yongHuId,
      jiaoSeId,
      fenJieSiWei(jiaoSe.hao_gan_du_zong_fen).xin_ren_du,
      fenJieSiWei(jiaoSe.hao_gan_du_zong_fen).qin_mi_du,
      fenJieSiWei(jiaoSe.hao_gan_du_zong_fen).qu_wei_du,
      fenJieSiWei(jiaoSe.hao_gan_du_zong_fen).guan_huai_du,
      jiaoSe.hao_gan_du_zong_fen,
      huoQuGuanXiJieDuan(jiaoSe.hao_gan_du_zong_fen),
    ],
  )

  const guanXiJieDuan = huoQuGuanXiJieDuan(jiaoSe.hao_gan_du_zong_fen)
  await zhiXing.query(
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

  await zhiXing.query(
    `UPDATE "用户" SET "活跃角色ID" = $1, "目标性别" = $2, "性格选择" = $3, "渣男渣女变体" = $4 WHERE "ID" = $5`,
    [
      jiaoSeId,
      内部转展示(xingBieLuoKu),
      jiaoSe.yu_she_lei_xing,
      jiaoSe.shi_fou_zha_xing,
      yongHuId,
    ],
  )
  if (shiWuKeHuDuan) {
    await zhiXing.query('COMMIT')
  }
  } catch (cuoWu) {
    if (shiWuKeHuDuan) {
      await zhiXing.query('ROLLBACK').catch(() => undefined)
      shiWuKeHuDuan.release()
    }
    if (cuoWu instanceof JiaoSeShengChengCuoWu) throw cuoWu
    throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED, cuoWu)
  }
  shiWuKeHuDuan?.release()

  let yiBaoCunKaiChang = false
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
    const kaiChangBai = await shengChengKaiChangBai(kcbCanShu)
    const yaoKaiKou = Math.random() < kaiChangBai.zhu_dong_kai_kou_gai_lv
    await jiLuKaiChangBaiJueCe(
      jiaoSeId,
      kaiChangBai.zhu_dong_dang_wei,
      kaiChangBai.zhu_dong_kai_kou_gai_lv,
      yaoKaiKou,
      kaiChangBai.xiao_xi_lie_biao.length,
    )
    if (yaoKaiKou) {
      for (const neiRong of kaiChangBai.xiao_xi_lie_biao.slice(0, 5)) {
        if (neiRong.trim()) {
          await baoCunJiaoSeXiaoXi({
            yong_hu_id: yongHuId,
            jiao_se_id: jiaoSeId,
            nei_rong: neiRong.trim(),
          })
          yiBaoCunKaiChang = true
        }
      }
    }
  } catch {
    // 开场白生成/落库失败不阻断角色创建（角色已入库），
    // shengChengKaiChangBai 内部已降级到 jiangJi，此处兜底防持久化异常
  }

  jiaoSe.yao_kai_kou = yiBaoCunKaiChang
  return jiaoSe
}

export async function anIdChaJiaoSeXiangQing(
  jiaoSeId: string,
): Promise<ShengChengJiaoSeJieGuo | null> {
  const jieGuo = await 数据库.query(`SELECT * FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiaoSeId])
  if (jieGuo.rows.length === 0) return null

  const shuJuHang = jieGuo.rows[0]
  const shiJieXinXi = shuJuHang.世界信息
    ? typeof shuJuHang.世界信息 === 'object'
      ? shuJuHang.世界信息
      : JSON.parse(String(shuJuHang.世界信息))
    : {}

  return {
    id: String(shuJuHang.ID),
    ming_zi: String(shuJuHang.名字),
    xing_bie: 读回性别(shuJuHang.性别, '角色生成', jiaoSeId),
    nian_ling: Number(shuJuHang.年龄),
    shen_fen: '',
    wai_mao: String(shuJuHang.外貌 || ''),
    xing_ge: String(shuJuHang.性格 || ''),
    bei_jing_gu_shi: String(shuJuHang.背景故事 || ''),
    xi_hao: Array.isArray(shuJuHang.爱好) ? shuJuHang.爱好 : [],
    yan_yu_feng_ge: String(shuJuHang.言语风格 || ''),
    xing_wei_te_dian: '',
    tou_xiang: String(shuJuHang.头像 || ''),
    biao_qian: Array.isArray(shuJuHang.标签) ? shuJuHang.标签 : [],
    xi_huan_de_lei_xing: String(shuJuHang.喜欢的类型 || ''),
    jia_ting_bei_jing: String(shuJuHang.家庭背景 || ''),
    qing_gan_jing_li: String(shuJuHang.情感经历 || ''),
    shi_fou_zha_xing: Boolean(shuJuHang.是否渣型),
    zha_fa_miao_shu: shuJuHang.渣法描述 ? String(shuJuHang.渣法描述) : undefined,
    hua_shu: Array.isArray(shuJuHang.话术) ? shuJuHang.话术 : undefined,
    bao_lu_fang_shi: shuJuHang.暴露方式 ? String(shuJuHang.暴露方式) : undefined,
    shi_po_xian_suo: Array.isArray(shuJuHang.识破线索) ? shuJuHang.识破线索 : undefined,
    yu_she_lei_xing: String(shuJuHang.预设类型 || shuJuHang.MBTI || 'INTJ') as MBTILeiXing,
    mbti_lei_xing: String(shuJuHang.MBTI || shuJuHang.预设类型 || 'INTJ') as MBTILeiXing,
    ie_lei_xing: String(shuJuHang.IE类型 || 'I') as 'I' | 'E',
    sui_ji_xing_ge: Boolean(shuJuHang.随机性格),
    re_shen_lei_xing: String(shuJuHang.热身类型 || '慢热') as '慢热' | '快热',
    hui_fu_yan_chi_hao_miao: Number(shuJuHang.回复延迟毫秒) || huiFuYanChiJiZhunHaoMiao,
    wei_xin_ming: String(shuJuHang.微信昵称 || shuJuHang.名字 || ''),
    zhen_shi_ming: String(shuJuHang.真实姓名 || shuJuHang.名字 || ''),
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
