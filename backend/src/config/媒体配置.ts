import path from 'path'
import { fanYi } from './translations'

function huoQuHuanJingBianLiang(ming: string, moRen: string): string {
  return process.env[ming] || moRen
}

const ZI_JIE = 1024

/** shenHeLeiBie 段里的服务侧哨兵键：审核自身不可用，不是用户的违规类别 */
export const SHEN_HE_FU_WU_BU_KE_YONG_JIAN = '审核服务不可用' as const

/** 图片读取失败的哨兵键：不出现在任何翻译段，出参统一回退通用审核失败文案 */
export const SHEN_HE_XI_TONG_CUO_WU_JIAN = '系统错误' as const

/**
 * 视觉审核违规类别键的唯一清单 —— 真源是 translations 的 shenHeLeiBie 段键集去掉服务侧哨兵键。
 * 审核侧（services/DeepSeek视觉审核.ts 的判定与 Prompt）与出参侧
 * （services/媒体审核出参.ts）都只引用本常量，路由层不再各抄一份字面量数组。
 */
export const SHEN_HE_WEI_GUI_LEI_BIE: readonly string[] = Object.keys(fanYi.shenHeLeiBie).filter(
  (jian) => jian !== SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
)

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

  zhanShiYouXiaoMiao: parseInt(huoQuHuanJingBianLiang('MEI_TI_ZHAN_SHI_YOU_XIAO_MIAO', '86400'), 10),
} as const

export const LEI_BIE_LIE_BIAO = ['tupian', 'biaoqingshu', 'yuyin', 'wenjian'] as const

export type MeiTiLeiBie = (typeof LEI_BIE_LIE_BIAO)[number]

/**
 * 表情包在 "媒体文件"."类别" 里的存量码（拼写即如此，见 database/000_baseline.sql:275 的 CHECK）。
 * 显式标注为 MeiTiLeiBie：写错字面量直接编译报错，杜绝静默存成对不上号的类别。
 */
export const BIAO_QING_SHU_LEI_BIE: MeiTiLeiBie = 'biaoqingshu'

export const LEI_BIE_DAO_XIAO_XI_LEI_XING: Record<MeiTiLeiBie, string> = {
  tupian: 'tuPian',
  [BIAO_QING_SHU_LEI_BIE]: 'biaoQingBao',
  yuyin: 'yuYin',
  wenjian: 'wenJian',
}

/**
 * FP-21：好友聊天允许用户主动上传的媒体类别（图片与文件）。
 * 好友页当前只有「相册」和「文件」两个上传入口，没有表情面板，因此这里既不含 yuyin（无录音链路），
 * 也不含 biaoqingshu —— 本地图进表情板的唯一入口仍是 POST /api/表情/我的（FP-06b 口径）。
 * 该清单是白名单：路由只接受列出的类别，其余一律 400，且大小/MIME 仍各自读
 * daXiaoShangXianZiJie / mimeBaiMingDan，绝不在路由里另写一份数字。
 */
export const HAO_YOU_SHANG_CHUAN_LEI_BIE = ['tupian', 'wenjian'] as const satisfies readonly MeiTiLeiBie[]

export function shiHaoYouShangChuanLeiBie(zhi: unknown): zhi is MeiTiLeiBie {
  return (HAO_YOU_SHANG_CHUAN_LEI_BIE as readonly string[]).includes(String(zhi ?? ''))
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
