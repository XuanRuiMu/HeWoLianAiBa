import path from 'path'
import { fanYi } from './translations'

function huoQuHuanJingBianLiang(ming: string, moRen: string): string {
  return process.env[ming] || moRen
}

const ZI_JIE = 1024

export const SHEN_HE_MO_SHI_AI = 'ai' as const

export const SHEN_HE_MO_SHI_BEN_DI = '本地' as const

export type ShenHeMoShi = typeof SHEN_HE_MO_SHI_AI | typeof SHEN_HE_MO_SHI_BEN_DI

export function quShenHeMoShi(): ShenHeMoShi {
  const yuanZhi = huoQuHuanJingBianLiang('MEI_TI_SHEN_HE_MO_SHI', '').trim().toLowerCase()
  if (yuanZhi === 'local' || yuanZhi === SHEN_HE_MO_SHI_BEN_DI) return SHEN_HE_MO_SHI_BEN_DI
  return SHEN_HE_MO_SHI_AI
}

export const SHEN_HE_FU_WU_BU_KE_YONG_JIAN = '审核服务不可用' as const

export const SHEN_HE_XI_TONG_CUO_WU_JIAN = '系统错误' as const

export const SHEN_HE_WEI_GUI_LEI_BIE: readonly string[] = Object.keys(fanYi.shenHeLeiBie).filter(
  (jian) => jian !== SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
)

export const MEI_TI_PEI_ZHI = {
  cunChuGenMuLu: huoQuHuanJingBianLiang(
    'MEI_TI_CUN_CHU_GEN_MU_LU',
    path.join(__dirname, '../../uploads/media'),
  ),

  daXiaoShangXianZiJie: {
    tupian: 20 * ZI_JIE * ZI_JIE,
    biaoqingshu: 10 * ZI_JIE * ZI_JIE,
    yuyin: 10 * ZI_JIE * ZI_JIE,
    wenjian: 50 * ZI_JIE * ZI_JIE,
  },

  mimeBaiMingDan: {
    tupian: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    biaoqingshu: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    yuyin: [
      'audio/webm',
      'audio/ogg',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/aac',
    ],
    wenjian: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'text/html',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/quicktime',
      'video/mp4',
      'application/zip',
      'application/vnd.rar',
      'application/x-7z-compressed',
    ],
  },

  qianMingYouXiaoMiaoRenZheng: parseInt(huoQuHuanJingBianLiang('MEI_TI_QIAN_MING_YOU_XIAO_MIAO', '3600'), 10),

  zhanShiYouXiaoMiao: parseInt(huoQuHuanJingBianLiang('MEI_TI_ZHAN_SHI_YOU_XIAO_MIAO', '86400'), 10),
} as const

export const WEN_JIAN_FEN_LEI_DA_XIAO_SHANG_XIAN: Readonly<Record<'wenben' | 'wendang', number>> = {
  wenben: 2 * ZI_JIE * ZI_JIE,
  wendang: 10 * ZI_JIE * ZI_JIE,
}

export const WEN_BEN_KUO_ZHAN: readonly string[] = ['txt', 'md', 'markdown']

export const WEN_DANG_KUO_ZHAN: readonly string[] = [
  'doc',
  'docx',
  'pdf',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'html',
  'htm',
]

const WEN_BEN_MIME: readonly string[] = ['text/plain', 'text/markdown']

const WEN_DANG_MIME: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/html',
]

function huoQuKuoZhanMing(mingCheng: string): string {
  const dian = (mingCheng || '').lastIndexOf('.')
  return dian === -1 ? '' : mingCheng.slice(dian + 1).toLowerCase()
}

export function huoQuWenJianDaXiaoShangXianZiJie(mingCheng: string, mime: string): number {
  const kuoZhan = huoQuKuoZhanMing(mingCheng)
  if (WEN_BEN_KUO_ZHAN.includes(kuoZhan)) return WEN_JIAN_FEN_LEI_DA_XIAO_SHANG_XIAN.wenben
  if (WEN_DANG_KUO_ZHAN.includes(kuoZhan)) return WEN_JIAN_FEN_LEI_DA_XIAO_SHANG_XIAN.wendang
  const qingLiMIME = String(mime || '').split(';')[0].trim().toLowerCase()
  if (WEN_BEN_MIME.includes(qingLiMIME)) return WEN_JIAN_FEN_LEI_DA_XIAO_SHANG_XIAN.wenben
  if (WEN_DANG_MIME.includes(qingLiMIME)) return WEN_JIAN_FEN_LEI_DA_XIAO_SHANG_XIAN.wendang
  return MEI_TI_PEI_ZHI.daXiaoShangXianZiJie.wenjian
}

export const WEN_DANG_TI_QU_PEI_ZHI = {
  danWenJianZiJieShangXian: 10 * ZI_JIE * ZI_JIE,
  tiQuWenBenZiFuShangXian: 20000,
  danTiaoMuJieYaZiJieShangXian: 8 * ZI_JIE * ZI_JIE,
  jieYaZongZiJieShangXian: 32 * ZI_JIE * ZI_JIE,
  jieYaTiaoMuShuShangXian: 4096,
  jieYaFenYeZiJie: 16 * ZI_JIE,
  kongZhiFuBiLiShangXian: 0.3,
  tiQuHuanCunTiaoMuShangXian: 64,
} as const

export const GUI_DANG_LEI_XING = {
  mime: ['application/zip', 'application/vnd.rar', 'application/x-7z-compressed'] as readonly string[],
  houZhui: ['zip', 'rar', '7z'] as readonly string[],
}

export const WEN_DANG_JIE_XI_LEI_XING = [
  'txt',
  'md',
  'csv',
  'json',
  'html',
  'docx',
  'xlsx',
  'pptx',
  'pdf',
] as const

export type WenDangJieXiLeiXing = (typeof WEN_DANG_JIE_XI_LEI_XING)[number]

export const WEN_DANG_MIME_LEI_XING: Readonly<Record<string, WenDangJieXiLeiXing>> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'application/json': 'json',
  'text/html': 'html',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

export const WEN_DANG_HOU_ZHUI_LEI_XING: Readonly<Record<string, WenDangJieXiLeiXing>> = {
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  csv: 'csv',
  json: 'json',
  html: 'html',
  htm: 'html',
  docx: 'docx',
  xlsx: 'xlsx',
  pptx: 'pptx',
  pdf: 'pdf',
}

export const LEI_BIE_LIE_BIAO = ['tupian', 'biaoqingshu', 'yuyin', 'wenjian'] as const

export type MeiTiLeiBie = (typeof LEI_BIE_LIE_BIAO)[number]

export const BIAO_QING_SHU_LEI_BIE: MeiTiLeiBie = 'biaoqingshu'

export const LEI_BIE_DAO_XIAO_XI_LEI_XING: Record<MeiTiLeiBie, string> = {
  tupian: 'tuPian',
  [BIAO_QING_SHU_LEI_BIE]: 'biaoQingBao',
  yuyin: 'yuYin',
  wenjian: 'wenJian',
}

export const HAO_YOU_SHANG_CHUAN_LEI_BIE = LEI_BIE_LIE_BIAO

export function shiHaoYouShangChuanLeiBie(zhi: unknown): zhi is MeiTiLeiBie {
  return (HAO_YOU_SHANG_CHUAN_LEI_BIE as readonly string[]).includes(String(zhi ?? ''))
}

export const YU_YIN_SHI_CHANG_XIA_XIAN_HAO_MIAO = 1000
export const YU_YIN_SHI_CHANG_SHANG_XIAN_HAO_MIAO = 60 * 1000

export function guiYiHuaShangChuanShiChang(zhi: unknown): number | null {
  if (typeof zhi !== 'number' && typeof zhi !== 'string') return null
  const shu = typeof zhi === 'number' ? zhi : Number(zhi)
  if (!Number.isFinite(shu)) return null
  const zhengShu = Math.round(shu)
  if (zhengShu < YU_YIN_SHI_CHANG_XIA_XIAN_HAO_MIAO) return null
  if (zhengShu > YU_YIN_SHI_CHANG_SHANG_XIAN_HAO_MIAO) return null
  return zhengShu
}

export const YUN_XU_XIAO_XI_LEI_XING = ['wenben', ...Object.values(LEI_BIE_DAO_XIAO_XI_LEI_XING)]

export function shiHeFaLeiBie(zhi: unknown): zhi is MeiTiLeiBie {
  return typeof zhi === 'string' && (LEI_BIE_LIE_BIAO as readonly string[]).includes(zhi)
}

export function shiHeFaXiaoXiLeiXing(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && YUN_XU_XIAO_XI_LEI_XING.includes(zhi)
}

export function shiYunXuMIME(leiBie: MeiTiLeiBie, mime: string): boolean {
  const baiMingDan = MEI_TI_PEI_ZHI.mimeBaiMingDan[leiBie] as readonly string[]
  return baiMingDan.includes(mime)
}
