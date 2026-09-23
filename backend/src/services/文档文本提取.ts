import fs from 'fs'
import { Unzip, UnzipInflate } from 'fflate'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { yanZhengUUID } from '../utils/验证'
import {
  GUI_DANG_LEI_XING,
  WEN_DANG_HOU_ZHUI_LEI_XING,
  WEN_DANG_MIME_LEI_XING,
  WEN_DANG_TI_QU_PEI_ZHI,
  type WenDangJieXiLeiXing,
} from '../config/媒体配置'
import { huoQuBenDiLuJing } from './媒体存储'
import type { DuiHuaLiShiXiang, DuiHuaWenJianTiQu } from '../types'

/**
 * FP-12（需求 #12 后端半区）：把阈值内的常见文档解析成纯文本的**单一提取出口**。
 *
 * 三条硬口径（数值全在 config/媒体配置.ts::WEN_DANG_TI_QU_PEI_ZHI，逻辑里不写字面量）：
 * ① 白名单分派（txt/md/csv/json/html/docx/xlsx/pptx/pdf），白名单外一律不解析；
 *    **归档类永不解析**（zip/rar/7z）——docx/xlsx/pptx 虽同为 zip 容器，但只走各自的
 *    OOXML 条目路径（缺 word/document.xml 之类必需条目就失败），绝不退化成通用解压兜底，
 *    所以「把 zip 改名成 .docx」拿到的是 null 而不是压缩包里的文件名；
 * ② 单文件 >10 MiB 直接跳过（连盘都不读）；提取文本 >20000 **码点**按码点截断，
 *    绝不留下半个多字节字符（不产生 U+FFFD，也不产生孤立代理对）；
 *    OOXML 解压产物按 **实测字节**（单条目 8 MiB / 单次 32 MiB）与 **实测条目数**（4096）设硬上限，
 *    超限即在流式解压途中中止——zip 中央目录里的 originalSize 是打包者自述值，一律不作判据；
 * ③ 任何畸形输入（0 字节、伪装扩展名、损坏 PDF/xlsx、无扩展名、UTF-16/BOM、超大、并发）
 *    都只回 null + 一条不含敏感信息的降级日志，**绝不向调用方抛异常**——
 *    调用方拿到 null 就沿用既有 `[文件:名]` 占位形态，用户侧与模型侧都不会 500。
 *
 * 送模侧的边界围栏与转义在 services/对话渲染（唯一渲染入口）完成，本文件只交纯文本；
 * 缓存键是内容哈希 SHA256（与媒体存储的 CAS 同一真源），故同内容跨消息只解一次。
 */

export interface WenDangYuanShu {
  mime: string
  yuanShiWenJianMing: string
  ziJie: Buffer
}

/** 降级日志的唯一出口：只记错误分类与结果，不记文件名、不记正文、不记完整哈希 */
function jiLuJiangJi(leiXing: string): void {
  debug日志.warn('文档文本提取', '提取失败，已按文件占位继续', {
    xiang_qing: { cuo_wu_fen_lei: leiXing, jie_guo: 'zhan_wei' },
  })
}

/** 依赖故障（进程/磁盘/解码器）与数据故障（内容本身非法）的粗分类，便于降级日志定位 */
function fenLeiCuoWu(cuoWu: unknown): string {
  const bianMa = (cuoWu as { code?: string } | undefined)?.code
  if (typeof bianMa === 'string' && /^(ENOENT|EACCES|EPERM|EBUSY|EMFILE|ENOSPC)$/.test(bianMa)) {
    return '依赖'
  }
  return '数据'
}

function quHouZhui(wenJianMing: string): string {
  const ming = String(wenJianMing || '').trim().toLowerCase()
  const dian = ming.lastIndexOf('.')
  if (dian < 0 || dian === ming.length - 1) return ''
  return ming.slice(dian + 1)
}

/**
 * 解析类型判定：归档类**优先短路**（哪怕客户端把 zip 声明成 application/pdf 也不给进解析路径）；
 * 名字里有点却以点结尾（`仅点.`）是畸形伪装名，MIME 声明什么都不给信；
 * 然后 MIME 白名单——但扩展名同样落在白名单内且与 MIME 指向不同类型时按伪装拒绝
 * （`text/plain` 声明配 `.docx` 名 ⇒ 两个可信信号互相矛盾，宁可占位也不猜）；
 * 最后才是扩展名回退（application/octet-stream 这类客户端猜不出 MIME 的情形）。
 */
export function panDingJieXiLeiXing(
  mime: string | null | undefined,
  yuanShiWenJianMing: string | null | undefined,
): WenDangJieXiLeiXing | null {
  const qingLiMIME = String(mime || '').split(';')[0].trim().toLowerCase()
  const qingMing = String(yuanShiWenJianMing || '').trim().toLowerCase()
  const houZhui = quHouZhui(qingMing)
  if (houZhui && (GUI_DANG_LEI_XING.houZhui as readonly string[]).includes(houZhui)) return null
  if (qingLiMIME && (GUI_DANG_LEI_XING.mime as readonly string[]).includes(qingLiMIME)) return null
  if (qingMing.includes('.') && qingMing.endsWith('.')) return null
  const youMIME = WEN_DANG_MIME_LEI_XING[qingLiMIME]
  if (youMIME) {
    const chongTu = WEN_DANG_HOU_ZHUI_LEI_XING[houZhui]
    if (chongTu && chongTu !== youMIME) return null
    return youMIME
  }
  if (qingLiMIME && qingLiMIME !== 'application/octet-stream' && houZhui) {
    const youHouZhui = WEN_DANG_HOU_ZHUI_LEI_XING[houZhui]
    return youHouZhui ?? null
  }
  const chunHouZhui = WEN_DANG_HOU_ZHUI_LEI_XING[houZhui]
  return chunHouZhui ?? null
}

const DAI_MA_SHI_TI = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,9});/g

function jieXinShiTi(wenBen: string): string {
  return wenBen.replace(DAI_MA_SHI_TI, (zheng, ming: string) => {
    if (ming.charCodeAt(0) === 35) {
      const shiLiu = ming.charCodeAt(1) === 120 || ming.charCodeAt(1) === 88
      const ma = shiLiu ? parseInt(ming.slice(2), 16) : parseInt(ming.slice(1), 10)
      if (!Number.isFinite(ma) || ma < 1 || ma > 0x10ffff) return zheng
      try {
        return String.fromCodePoint(ma)
      } catch {
        return zheng
      }
    }
    switch (ming) {
      case 'amp': return '&'
      case 'lt': return '<'
      case 'gt': return '>'
      case 'quot': return '"'
      case 'apos': return "'"
      case 'nbsp': return ' '
      case 'ensp': return ' '
      case 'emsp': return ' '
      case 'thinsp': return ' '
      case 'mdash': return '—'
      case 'ndash': return '–'
      case 'hellip': return '…'
      case 'middot': return '·'
      case 'copy': return '©'
      case 'reg': return '®'
      case 'ldquo': return '“'
      case 'rdquo': return '”'
      case 'lsquo': return '‘'
      case 'rsquo': return '’'
      default: return zheng
    }
  })
}

/** 去掉 XML/HTML 标签；调用方先把要保留的文本元素解包，剩下的标签一律是结构 */
function quChuBiaoQian(neiRong: string): string {
  return neiRong.replace(/<[^>]*>/g, '')
}

/**
 * 纯文本解码：BOM 判 UTF-16LE/BE/UTF-8；无 BOM 但含 NUL 直接判二进制（伪装扩展名的主判据）；
 * 解完再做控制字符占比复核，兜住 GB 系编码等「能解但全是乱码」的情形。
 */
function jieMaChunWenBen(ziJie: Buffer): string | null {
  if (ziJie.length === 0) return null
  if (ziJie.length >= 2 && ziJie[0] === 0xff && ziJie[1] === 0xfe) {
    return ziJie.subarray(2).toString('utf16le')
  }
  if (ziJie.length >= 2 && ziJie[0] === 0xfe && ziJie[1] === 0xff) {
    const wuBOM = Buffer.from(ziJie.subarray(2))
    wuBOM.swap16()
    return wuBOM.toString('utf16le')
  }
  let qiShi = 0
  if (ziJie.length >= 3 && ziJie[0] === 0xef && ziJie[1] === 0xbb && ziJie[2] === 0xbf) qiShi = 3
  const youNUL = ziJie.subarray(qiShi).includes(0x00)
  if (youNUL) return null
  return ziJie.subarray(qiShi).toString('utf8')
}

/** 控制字符（制表/换行/回车之外）占比 */
function kongZhiZhanBi(wenBen: string): number {
  if (!wenBen) return 0
  let kongZhi = 0
  let zong = 0
  for (const dian of wenBen) {
    zong++
    const ma = dian.codePointAt(0) ?? 0
    if (ma < 0x20 && ma !== 0x09 && ma !== 0x0a && ma !== 0x0d) kongZhi++
    else if (ma >= 0x7f && ma <= 0x9f) kongZhi++
  }
  return zong === 0 ? 0 : kongZhi / zong
}

/**
 * 按码点截断（[P0] 绝不切半个多字节字符）：偏移按 `codePointAt` 实际宽度前进，
 * 增补平面字符（emoji 等代理对）按**一个**码点计数、两个 UTF-16 单元偏移，
 * 因此 slice 的落点永远是字符边界，不会留下孤立高代理。
 */
export function anMaDianCaiDuan(
  wenBen: string,
  shangXian: number = WEN_DANG_TI_QU_PEI_ZHI.tiQuWenBenZiFuShangXian,
): DuiHuaWenJianTiQu {
  if (shangXian <= 0) return { wenBen: '', beiCaiDuan: wenBen.length > 0 }
  let pianYi = 0
  let jiShu = 0
  while (pianYi < wenBen.length) {
    const maDian = wenBen.codePointAt(pianYi) ?? 0
    pianYi += maDian > 0xffff ? 2 : 1
    jiShu++
    if (jiShu >= shangXian) {
      if (pianYi >= wenBen.length) return { wenBen, beiCaiDuan: false }
      return { wenBen: wenBen.slice(0, pianYi), beiCaiDuan: true }
    }
  }
  return { wenBen, beiCaiDuan: false }
}

/** 解析结果的统一收口：清洗换行、剔除控制字符、判伪装、按码点截断 */
function shouKouJieGuo(yuanShi: string | null): DuiHuaWenJianTiQu | null {
  if (typeof yuanShi !== 'string') return null
  const qingLi = yuanShi
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!qingLi) return null
  if (kongZhiZhanBi(qingLi) > WEN_DANG_TI_QU_PEI_ZHI.kongZhiFuBiLiShangXian) {
    jiLuJiangJi('伪装扩展名或二进制内容')
    return null
  }
  return anMaDianCaiDuan(qingLi)
}

function zuZiFu(ziJie: Uint8Array | undefined): string | null {
  if (!ziJie || ziJie.length === 0) return null
  return Buffer.from(ziJie).toString('utf8')
}

/** 只解需要的 OOXML 条目；上限一律按**实测解压产物**判定，绝不读 zip 自述字段 */
function jieYaOOXMLTiaoMu(
  ziJie: Buffer,
  xuYao: (ming: string) => boolean,
): Promise<Record<string, Uint8Array>> {
  const danTiaoShangXian = WEN_DANG_TI_QU_PEI_ZHI.danTiaoMuJieYaZiJieShangXian
  const zongZiJieShangXian = WEN_DANG_TI_QU_PEI_ZHI.jieYaZongZiJieShangXian
  const tiaoMuShangXian = WEN_DANG_TI_QU_PEI_ZHI.jieYaTiaoMuShuShangXian
  const fenYeZiJie = WEN_DANG_TI_QU_PEI_ZHI.jieYaFenYeZiJie
  return new Promise((jieJue) => {
    const chengPin: Record<string, Uint8Array> = {}
    /** 当前条目的分片缓冲：ondata 每次只给一片，按片累计后在 final 时拼接 */
    let dangQian: { ming: string; pian: Uint8Array[]; ziJie: number } | null = null
    let leiJiZiJie = 0
    let yiJianTiaoMu = 0
    let chaoXian = false
    const duiZhao = (ming: string) => {
      if (chaoXian || !xuYao(ming)) return null
      const jia = { ming, pian: [] as Uint8Array[], ziJie: 0 }
      dangQian = jia
      return jia
    }
    const shouWei = () => {
      if (chaoXian || !dangQian) return
      chengPin[dangQian.ming] = Buffer.concat(dangQian.pian)
      dangQian = null
    }
    const liu = new Unzip((xie) => {
      yiJianTiaoMu += 1
      if (yiJianTiaoMu > tiaoMuShangXian) {
        chaoXian = true
        xie.terminate()
        return
      }
      const jia = duiZhao(xie.name)
      if (!jia) return
      xie.ondata = (cuoWu, shu, final) => {
        if (chaoXian) return
        if (cuoWu) {
          chaoXian = true
          xie.terminate()
          return
        }
        jia.ziJie += shu.length
        leiJiZiJie += shu.length
        if (jia.ziJie > danTiaoShangXian || leiJiZiJie > zongZiJieShangXian) {
          chaoXian = true
          xie.terminate()
          return
        }
        jia.pian.push(shu)
        if (final) shouWei()
      }
      xie.start()
    })
    try {
      // 只注册同步解码器：整条流在 push 内跑完，不额外起工作线程，也不留下在途解压
      liu.register(UnzipInflate)
      for (let pian = 0; !chaoXian && pian < ziJie.length; pian += fenYeZiJie) {
        const jie = Math.min(pian + fenYeZiJie, ziJie.length)
        liu.push(new Uint8Array(ziJie.subarray(pian, jie)), jie >= ziJie.length)
      }
      if (chaoXian) {
        jiLuJiangJi('解压产物或条目数超过实测硬上限')
        jieJue({})
        return
      }
      jieJue(chengPin)
    } catch (cuoWu) {
      try {
        if (dangQian) liu.push(new Uint8Array(0), true)
      } catch {
        /* 收尾失败不改降级结论 */
      }
      jiLuJiangJi(fenLeiCuoWu(cuoWu))
      jieJue({})
    }
  })
}

function xiaoJuShuZu(mingList: string[], zhengZe: RegExp): string[] {
  return mingList
    .map((ming) => ({ ming, xu: Number(zhengZe.exec(ming)?.[1] ?? Number.NaN) }))
    .filter((xie) => Number.isFinite(xie.xu))
    .sort((a, b) => a.xu - b.xu)
    .map((xie) => xie.ming)
}

/** docx：段落结束换行，<w:t> 解包后其余标签按结构删除；根元素未闭合即判损坏（截断的 XML 不送模） */
function jieXiDocX(tiaoMu: Record<string, Uint8Array>): string | null {
  const zhuWen = zuZiFu(tiaoMu['word/document.xml'])
  if (!zhuWen || !zhuWen.includes('</w:document>')) return null
  const wenBen = zhuWen
    .replace(/<w:br(?:\s[^>]*)?\/>/g, '\n')
    .replace(/<w:tab(?:\s[^>]*)?\/>/g, '\t')
    .replace(/<\/w:p>|<\/w:tr>|<\/w:tc>/g, '\n')
    .replace(/<\/?w:t(?:\s[^>]*)?>/g, '')
  return jieXinShiTi(quChuBiaoQian(wenBen))
}

/** xlsx：sharedStrings 按下标还原单元格引用，行内制表符分隔、行间换行 */
function jieXiXlsX(tiaoMu: Record<string, Uint8Array>): string | null {
  const mingList = xiaoJuShuZu(
    Object.keys(tiaoMu).filter((ming) => /^xl\/worksheets\/[^/]+\.xml$/.test(ming)),
    /sheet(\d+)\.xml$/,
  )
  if (mingList.length === 0) return null
  const gongXiang: string[] = []
  const gongXiangXML = zuZiFu(tiaoMu['xl/sharedStrings.xml'])
  if (gongXiangXML) {
    for (const xiang of gongXiangXML.match(/<si(?:\s[^>]*)?>[\s\S]*?<\/si>/g) ?? []) {
      gongXiang.push(jieXinShiTi(quChuBiaoQian(xiang.replace(/<\/?t(?:\s[^>]*)?>/g, ''))))
    }
  }
  const duan: string[] = []
  for (const ming of mingList) {
    const xml = zuZiFu(tiaoMu[ming])
    if (!xml) continue
    const hang: string[] = []
    for (const hangXML of xml.match(/<row(?:\s[^>]*)?>[\s\S]*?<\/row>/g) ?? []) {
      const lie: string[] = []
      for (const lieXML of hangXML.match(/<c(?:\s[^>]*?)?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
        const leiXing = /t="([^"]*)"/.exec(lieXML)?.[1] ?? ''
        const zhi = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(lieXML)?.[1] ?? ''
        if (leiXing === 's') {
          const suo = Number(zhi)
          lie.push(Number.isFinite(suo) ? gongXiang[suo] ?? '' : '')
        } else if (leiXing === 'inlineStr') {
          const nei = /<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/.exec(lieXML)?.[1] ?? ''
          lie.push(jieXinShiTi(quChuBiaoQian(nei.replace(/<\/?t(?:\s[^>]*)?>/g, ''))))
        } else if (leiXing === 'e' || leiXing === 'str' || leiXing === 'b') {
          lie.push(jieXinShiTi(quChuBiaoQian(zhi)))
        } else {
          lie.push(zhi)
        }
      }
      if (lie.some((z) => z !== '')) hang.push(lie.join('\t'))
    }
    if (hang.length > 0) duan.push(hang.join('\n'))
  }
  return duan.join('\n\n') || null
}

/** pptx：按 slide 序号顺序取 <a:t>，段落结束换行 */
function jieXiPptX(tiaoMu: Record<string, Uint8Array>): string | null {
  const mingList = xiaoJuShuZu(
    Object.keys(tiaoMu).filter((ming) => /^ppt\/slides\/slide\d+\.xml$/.test(ming)),
    /slide(\d+)\.xml$/,
  )
  if (mingList.length === 0) return null
  const duan: string[] = []
  for (const ming of mingList) {
    const xml = zuZiFu(tiaoMu[ming])
    if (!xml) continue
    const wenBen = xml
      .replace(/<\/a:p>/g, '\n')
      .replace(/<a:br(?:\s[^>]*)?\/>/g, '\n')
      .replace(/<\/?a:t(?:\s[^>]*)?>/g, '')
    duan.push(jieXinShiTi(quChuBiaoQian(wenBen)))
  }
  return duan.join('\n\n') || null
}

/** html：脚本与样式整段丢弃（它们是代码不是正文），块级结束标签转换行 */
function jieXiHTML(neiRong: string): string {
  return neiRong
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br(?:\s[^>]*)?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|table)>/gi, '\n')
    .replace(/<\/?t[dh](?:\s[^>]*)?>/gi, '\t')
    .replace(/<[^>]*>/g, '')
}

/**
 * 单一提取出口：MIME + 原始文件名 + 字节 → 截断后的纯文本；不支持/伪装/损坏一律 null 且不抛。
 * 阈值内的字节全部由调用方给（本函数不碰磁盘），便于逐类型直测。
 */
export async function tiQuWenDangWenBen(
  ke: WenDangYuanShu,
): Promise<DuiHuaWenJianTiQu | null> {
  const leiXing = panDingJieXiLeiXing(ke.mime, ke.yuanShiWenJianMing)
  if (!leiXing) return null
  try {
    if (leiXing === 'txt' || leiXing === 'md' || leiXing === 'csv' || leiXing === 'json') {
      return shouKouJieGuo(jieMaChunWenBen(ke.ziJie))
    }
    if (leiXing === 'html') {
      const yuanWen = jieMaChunWenBen(ke.ziJie)
      if (yuanWen === null) return null
      return shouKouJieGuo(jieXinShiTi(jieXiHTML(yuanWen)))
    }
    if (leiXing === 'pdf') {
      // 只依赖 unpdf 声明过的入口：`extractText` 直接吃字节，不必自己持有 PDFDocumentProxy
      // （serverless 构建无独立 worker 线程，其类型面里也没有销毁口，不去调未声明的 API）
      const { extractText } = await import('unpdf')
      const { text } = await extractText(new Uint8Array(ke.ziJie), { mergePages: true })
      if (typeof text !== 'string') return null
      return shouKouJieGuo(text)
    }
    const xuYao =
      leiXing === 'docx'
        ? (ming: string) => ming === 'word/document.xml'
        : leiXing === 'xlsx'
          ? (ming: string) =>
              /^xl\/worksheets\/[^/]+\.xml$/.test(ming) || ming === 'xl/sharedStrings.xml'
          : (ming: string) => /^ppt\/slides\/slide\d+\.xml$/.test(ming)
    const tiaoMu = await jieYaOOXMLTiaoMu(ke.ziJie, xuYao)
    if (Object.keys(tiaoMu).length === 0) return null
    const yuanWen =
      leiXing === 'docx' ? jieXiDocX(tiaoMu) : leiXing === 'xlsx' ? jieXiXlsX(tiaoMu) : jieXiPptX(tiaoMu)
    return shouKouJieGuo(yuanWen)
  } catch (cuoWu) {
    jiLuJiangJi(fenLeiCuoWu(cuoWu))
    return null
  }
}

interface MeiTiXing {
  sha256: string
  mime: string
  yuanShiWenJianMing: string
}

const tiQuHuanCun = new Map<string, Promise<DuiHuaWenJianTiQu | null>>()

/** 测试专用：清空 SHA256 维度的进程内提取缓存 */
export function chongZhiWenDangTiQuHuanCun(): void {
  tiQuHuanCun.clear()
}

async function huoQuMeiTiXingLieBiao(meiTiIds: string[]): Promise<Map<string, MeiTiXing>> {
  const jieGuo = new Map<string, MeiTiXing>()
  if (meiTiIds.length === 0) return jieGuo
  const shu = await 数据库.query(
    `SELECT "ID", "SHA256", "MIME", "原始文件名" FROM "媒体文件" WHERE "ID" = ANY($1::uuid[])`,
    [meiTiIds],
  )
  for (const hang of shu.rows as Record<string, unknown>[]) {
    const id = String(hang.ID ?? '')
    const sha = String(hang.SHA256 ?? '').toLowerCase()
    if (!id || !/^[0-9a-f]{64}$/.test(sha)) continue
    jieGuo.set(id, {
      sha256: sha,
      mime: String(hang.MIME ?? ''),
      yuanShiWenJianMing: String(hang.原始文件名 ?? ''),
    })
  }
  return jieGuo
}

/** 类型判定在前、读盘在后：视频/归档这类根本不该进解析的条目连文件都不打开 */
async function anSha256TiQu(
  xing: MeiTiXing,
): Promise<DuiHuaWenJianTiQu | null> {
  const leiXing = panDingJieXiLeiXing(xing.mime, xing.yuanShiWenJianMing)
  if (!leiXing) return null
  const luJing = huoQuBenDiLuJing(xing.sha256)
  if (!luJing) return null
  const tongJi = await fs.promises.stat(luJing)
  if (!tongJi.isFile() || tongJi.size === 0 || tongJi.size > WEN_DANG_TI_QU_PEI_ZHI.danWenJianZiJieShangXian) {
    return null
  }
  const ziJie = await fs.promises.readFile(luJing)
  if (ziJie.length === 0 || ziJie.length > WEN_DANG_TI_QU_PEI_ZHI.danWenJianZiJieShangXian) return null
  return await tiQuWenDangWenBen({
    mime: xing.mime,
    yuanShiWenJianMing: xing.yuanShiWenJianMing,
    ziJie,
  })
}

/** 同内容只解一次：并发命中同一 SHA256 时共享同一个在途 Promise（缓存 null 也留，坏文件不被反复重解） */
async function huoQuHuoJieXiWenJian(xing: MeiTiXing): Promise<DuiHuaWenJianTiQu | null> {
  const mingZhong = xing.sha256
  const zaiTu = tiQuHuanCun.get(mingZhong)
  if (zaiTu) return zaiTu
  if (tiQuHuanCun.size >= WEN_DANG_TI_QU_PEI_ZHI.tiQuHuanCunTiaoMuShangXian) {
    const zuiJiu = tiQuHuanCun.keys().next().value
    if (zuiJiu !== undefined) tiQuHuanCun.delete(zuiJiu)
  }
  const promise = anSha256TiQu(xing).catch((cuoWu) => {
    jiLuJiangJi(fenLeiCuoWu(cuoWu))
    return null
  })
  tiQuHuanCun.set(mingZhong, promise)
  return promise
}

/**
 * 送模前的唯一补全口：给阈值内的文档消息挂上提取正文，军师 / 军事分析 / 复盘 / 主聊天
 * 四条装配路径共用这一个入口（渲染仍在 services/对话渲染 那唯一一份里做，本函数不产文本行）。
 * 任何一步失败都只是「不挂正文」⇒ 该条继续按 `[文件:名]` 占位进模型，绝不抛到调用方。
 */
export async function buQiWenJianTiQuWenBen<T extends DuiHuaLiShiXiang>(
  liShi: T[],
): Promise<T[]> {
  const houXuan: T[] = []
  const ids = new Set<string>()
  for (const xiang of liShi) {
    if (xiang.meiTiLeiBie !== 'wenjian' || xiang.yi_che_hui) continue
    if (xiang.wenJianTiQu || !xiang.meiTiId || !yanZhengUUID(xiang.meiTiId)) continue
    houXuan.push(xiang)
    ids.add(xiang.meiTiId)
  }
  if (houXuan.length === 0) return liShi
  let hangBiao: Map<string, MeiTiXing>
  try {
    hangBiao = await huoQuMeiTiXingLieBiao([...ids])
  } catch (cuoWu) {
    jiLuJiangJi(fenLeiCuoWu(cuoWu))
    return liShi
  }
  for (const xiang of houXuan) {
    const xing = hangBiao.get(String(xiang.meiTiId))
    if (!xing) continue
    const jieGuo = await huoQuHuoJieXiWenJian(xing)
    if (jieGuo) xiang.wenJianTiQu = jieGuo
  }
  return liShi
}
