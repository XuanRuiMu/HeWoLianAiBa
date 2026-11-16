import path from 'path'
import { fanYi } from './translations'

function huoQuHuanJingBianLiang(ming: string, moRen: string): string {
  return process.env[ming] || moRen
}

const ZiJie = 1024

export const ShenHeMoShiAi = 'ai' as const

export const ShenHeMoShiBenDi = '本地' as const

export type ShenHeMoShi = typeof ShenHeMoShiAi | typeof ShenHeMoShiBenDi

export function quShenHeMoShi(): ShenHeMoShi {
  const yuanZhi = huoQuHuanJingBianLiang('MEI_TI_SHEN_HE_MO_SHI', '').trim().toLowerCase()
  if (yuanZhi === 'local' || yuanZhi === ShenHeMoShiBenDi) return ShenHeMoShiBenDi
  return ShenHeMoShiAi
}

export const ShenHeFuWuBuKeYongJian = '审核服务不可用' as const

export const ShenHeXiTongCuoWuJian = '系统错误' as const

export const ShenHeWeiGuiLeiBie: readonly string[] = Object.keys(fanYi.shenHeLeiBie).filter(
  (jian) => jian !== ShenHeFuWuBuKeYongJian,
)

export const MeiTiPeiZhi = {
  cunChuGenMuLu: huoQuHuanJingBianLiang(
    'MEI_TI_CUN_CHU_GEN_MU_LU',
    path.join(__dirname, '../../uploads/media'),
  ),

  daXiaoShangXianZiJie: {
    tupian: 20 * ZiJie * ZiJie,
    biaoqingshu: 10 * ZiJie * ZiJie,
    yuyin: 10 * ZiJie * ZiJie,
    wenjian: 50 * ZiJie * ZiJie,
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

export const WenJianFenLeiDaXiaoShangXian: Readonly<Record<'wenben' | 'wendang', number>> = {
  wenben: 2 * ZiJie * ZiJie,
  wendang: 10 * ZiJie * ZiJie,
}

export const WenBenKuoZhan: readonly string[] = ['txt', 'md', 'markdown']

export const WenDangKuoZhan: readonly string[] = [
  'doc',
  'docx',
  'pdf',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'html',
  'htm',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'tif',
  'tiff',
]

const WenBenMime: readonly string[] = ['text/plain', 'text/markdown']

const WenDangMime: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/html',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
]

function huoQuKuoZhanMing(mingCheng: string): string {
  const dian = (mingCheng || '').lastIndexOf('.')
  return dian === -1 ? '' : mingCheng.slice(dian + 1).toLowerCase()
}

export function huoQuWenJianDaXiaoShangXianZiJie(mingCheng: string, mime: string): number {
  const kuoZhan = huoQuKuoZhanMing(mingCheng)
  if (WenBenKuoZhan.includes(kuoZhan)) return WenJianFenLeiDaXiaoShangXian.wenben
  if (WenDangKuoZhan.includes(kuoZhan)) return WenJianFenLeiDaXiaoShangXian.wendang
  const qingLiMIME = String(mime || '').split(';')[0].trim().toLowerCase()
  if (WenBenMime.includes(qingLiMIME)) return WenJianFenLeiDaXiaoShangXian.wenben
  if (WenDangMime.includes(qingLiMIME)) return WenJianFenLeiDaXiaoShangXian.wendang
  return MeiTiPeiZhi.daXiaoShangXianZiJie.wenjian
}

export const WenDangTiQuPeiZhi = {
  danWenJianZiJieShangXian: 10 * ZiJie * ZiJie,
  tiQuWenBenZiFuShangXian: 20000,
  danTiaoMuJieYaZiJieShangXian: 8 * ZiJie * ZiJie,
  jieYaZongZiJieShangXian: 32 * ZiJie * ZiJie,
  jieYaTiaoMuShuShangXian: 4096,
  jieYaFenYeZiJie: 16 * ZiJie,
  kongZhiFuBiLiShangXian: 0.3,
  tiQuHuanCunTiaoMuShangXian: 64,
} as const

export const GuiDangLeiXing = {
  mime: ['application/zip', 'application/vnd.rar', 'application/x-7z-compressed'] as readonly string[],
  houZhui: ['zip', 'rar', '7z'] as readonly string[],
}

export const 文档解析类型 = [
  'txt',
  'md',
  'csv',
  'json',
  'html',
  'docx',
  'xlsx',
  'pptx',
  'pdf',
  'ocr',
] as const

export type 文档解析类型 = (typeof 文档解析类型)[number]

export const WenDangMimeLeiXing: Readonly<Record<string, 文档解析类型>> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'application/json': 'json',
  'text/html': 'html',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/png': 'ocr',
  'image/jpeg': 'ocr',
  'image/webp': 'ocr',
  'image/gif': 'ocr',
  'image/bmp': 'ocr',
  'image/tiff': 'ocr',
}

export const WenDangHouZhuiLeiXing: Readonly<Record<string, 文档解析类型>> = {
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
  png: 'ocr',
  jpg: 'ocr',
  jpeg: 'ocr',
  webp: 'ocr',
  gif: 'ocr',
  bmp: 'ocr',
  tif: 'ocr',
  tiff: 'ocr',
}

export const LeiBieLieBiao = ['tupian', 'biaoqingshu', 'yuyin', 'wenjian'] as const

export type MeiTiLeiBie = (typeof LeiBieLieBiao)[number]

export const 表情书类别: MeiTiLeiBie = 'biaoqingshu'

export const 类别到消息类型: Record<MeiTiLeiBie, string> = {
  tupian: 'tuPian',
  [表情书类别]: 'biaoQingBao',
  yuyin: 'yuYin',
  wenjian: 'wenJian',
}

export const HaoYouShangChuanLeiBie = LeiBieLieBiao

export function shiHaoYouShangChuanLeiBie(zhi: unknown): zhi is MeiTiLeiBie {
  return (HaoYouShangChuanLeiBie as readonly string[]).includes(String(zhi ?? ''))
}

export const YuYinShiChangXiaXianHaoMiao = 1000
export const YuYinShiChangShangXianHaoMiao = 60 * 1000

export function guiYiHuaShangChuanShiChang(zhi: unknown): number | null {
  if (typeof zhi !== 'number' && typeof zhi !== 'string') return null
  const shu = typeof zhi === 'number' ? zhi : Number(zhi)
  if (!Number.isFinite(shu)) return null
  const zhengShu = Math.round(shu)
  if (zhengShu < YuYinShiChangXiaXianHaoMiao) return null
  if (zhengShu > YuYinShiChangShangXianHaoMiao) return null
  return zhengShu
}

export const YunXuXiaoXiLeiXing = ['wenben', ...Object.values(类别到消息类型)]

export function shiHeFaLeiBie(zhi: unknown): zhi is MeiTiLeiBie {
  return typeof zhi === 'string' && (LeiBieLieBiao as readonly string[]).includes(zhi)
}

export function shiHeFaXiaoXiLeiXing(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && YunXuXiaoXiLeiXing.includes(zhi)
}

export function shiYunXuMIME(leiBie: MeiTiLeiBie, mime: string): boolean {
  const 白名单 = MeiTiPeiZhi.mimeBaiMingDan[leiBie] as readonly string[]
  return 白名单.includes(mime)
}
