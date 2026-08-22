import path from 'path'

function huoQuHuanJingBianLiang(ming: string, moRen: string): string {
  return process.env[ming] || moRen
}

const ZI_JIE = 1024

export const MEI_TI_PEI_ZHI = {
  cunChuGenMuLu: huoQuHuanJingBianLiang(
    'MEI_TI_CUN_CHU_GEN_MU_LU',
    path.join(__dirname, '../../uploads/media'),
  ),

  daXiaoShangXianZiJie: {
    tupian: 10 * ZI_JIE * ZI_JIE,
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
} as const

export const LEI_BIE_LIE_BIAO = ['tupian', 'biaoqingshu', 'yuyin', 'wenjian'] as const

export type MeiTiLeiBie = (typeof LEI_BIE_LIE_BIAO)[number]

export const LEI_BIE_DAO_XIAO_XI_LEI_XING: Record<MeiTiLeiBie, string> = {
  tupian: 'tuPian',
  biaoqingshu: 'biaoQingBao',
  yuyin: 'yuYin',
  wenjian: 'wenJian',
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
