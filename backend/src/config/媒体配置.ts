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

/**
 * FP-12（需求 #12）文档正文提取的唯一阈值口径：**所有数字只在这里出现一次**，
 * 解析逻辑与渲染逻辑一律引用本常量，不得在函数里写字面量。
 * 口径由用户 2026-09-21 定案（见 docs/API文档.md 的「文档正文提取」节）：
 * 单文件 ≤10 MiB 且提取纯文本 ≤20000 字符，超出即不解析 / 按码点截断并显式标注。
 */
export const WEN_DANG_TI_QU_PEI_ZHI = {
  /** 参与解析的单文件字节上限（图片类媒体上限同量级；文件类传输上限仍是 daXiaoShangXianZiJie.wenjian） */
  danWenJianZiJieShangXian: 10 * ZI_JIE * ZI_JIE,
  /** 提取纯文本的码点上限，超出按码点截断（绝不切半个多字节字符） */
  tiQuWenBenZiFuShangXian: 20000,
  /** OOXML（docx/xlsx/pptx 是 zip 容器）单个内部条目的解压后上限，防解压炸弹 */
  danTiaoMuJieYaZiJieShangXian: 8 * ZI_JIE * ZI_JIE,
  /**
   * 一次 OOXML 解压**实测产物**的总字节硬上限：zip 中央目录里的 originalSize 由打包者自己写，
   * 谎报即可绕过 danTiaoMuJieYaZiJieShangXian，故上限只能按真实吐出来的字节算（见
   * services/文档文本提取.ts::jieYaOOXMLTiaoMu，超限即在流式解压途中中止）。
   */
  jieYaZongZiJieShangXian: 32 * ZI_JIE * ZI_JIE,
  /** 一次 OOXML 解压允许的条目数硬上限（实测计数，防条目洪流与同名片段把解析器拖死） */
  jieYaTiaoMuShuShangXian: 4096,
  /** 喂给解压流的压缩字节分片宽度：每喂一片复核一次上限，决定超限中止前最多多解出多少字节 */
  jieYaFenYeZiJie: 16 * ZI_JIE,
  /** 解码后文本里控制字符占比上限，超过即判为二进制伪装，不送模 */
  kongZhiFuBiLiShangXian: 0.3,
  /** 按 SHA256 缓存的提取结果条数上限（值为截断后文本，量级 MB 以内），超出按写入序淘汰 */
  tiQuHuanCunTiaoMuShangXian: 64,
} as const

/**
 * FP-12：归档类**永不解析**的唯一真源。用户仍可上传（见 mimeBaiMingDan.wenjian），
 * 只是不进文本提取。docx/xlsx/pptx 本身也是 zip 容器，但它们只走各自的 OOXML 解析路径，
 * 绝不由通用解压兜底 —— 改名成 .docx 的普通 zip 因缺 word/document.xml 而解析失败。
 */
export const GUI_DANG_LEI_XING = {
  mime: ['application/zip', 'application/vnd.rar', 'application/x-7z-compressed'] as readonly string[],
  houZhui: ['zip', 'rar', '7z'] as readonly string[],
}

/** FP-12 可解析的文档类型（值域即解析器分派键，白名单非黑名单：不在表内一律不解析） */
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

/**
 * MIME → 解析类型的白名单。落库 MIME 以客户端声明为准，故解析端只把它当**首选线索**：
 * 命中不了才回退扩展名；两者都不在表内 ⇒ 不解析。声明与内容不符时由
 * 二进制占比判定与「缺必需条目」兜住（见 services/文档文本提取.ts）。
 */
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

/** 扩展名 → 解析类型（MIME 未命中白名单时的回退，如 application/octet-stream） */
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
