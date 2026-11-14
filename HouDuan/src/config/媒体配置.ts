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

export const WenDangJieXiLeiXing = [
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

export type WenDangJieXiLeiXing = (typeof WenDangJieXiLeiXing)[number]

export const WenDangMimeLeiXing: Readonly<Record<string, WenDangJieXiLeiXing>> = {
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

export const WenDangHouZhuiLeiXing: Readonly<Record<string, WenDangJieXiLeiXing>> = {
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

export const LeiBieLieBiao = ['tupian', 'biaoqingshu', 'yuyin', 'wenjian'] as const

export type MeiTiLeiBie = (typeof LeiBieLieBiao)[number]

export const BiaoQingShuLeiBie: MeiTiLeiBie = 'biaoqingshu'

export const LeiBieDaoXiaoXiLeiXing: Record<MeiTiLeiBie, string> = {
  tupian: 'tuPian',
  [BiaoQingShuLeiBie]: 'biaoQingBao',
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

export const YunXuXiaoXiLeiXing = ['wenben', ...Object.values(LeiBieDaoXiaoXiLeiXing)]

export function shiHeFaLeiBie(zhi: unknown): zhi is MeiTiLeiBie {
  return typeof zhi === 'string' && (LeiBieLieBiao as readonly string[]).includes(zhi)
}

export function shiHeFaXiaoXiLeiXing(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && YunXuXiaoXiLeiXing.includes(zhi)
}

export function shiYunXuMIME(leiBie: MeiTiLeiBie, mime: string): boolean {
  const baiMingDan = MeiTiPeiZhi.mimeBaiMingDan[leiBie] as readonly string[]
  return baiMingDan.includes(mime)
}
