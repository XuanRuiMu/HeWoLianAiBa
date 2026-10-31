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


export interface WenDangYuanShu {
  mime: string
  yuanShiWenJianMing: string
  ziJie: Buffer
}

function jiLuJiangJi(leiXing: string): void {
  debug日志.warn('文档文本提取', '提取失败，已按文件占位继续', {
    xiang_qing: { cuo_wu_fen_lei: leiXing, jie_guo: 'zhan_wei' },
  })
}

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

function quChuBiaoQian(neiRong: string): string {
  return neiRong.replace(/<[^>]*>/g, '')
}

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
    const biaoQianWenBen = zuZiFu(tiaoMu[ming])
    if (!biaoQianWenBen) continue
    const hang: string[] = []
    for (const hangXML of biaoQianWenBen.match(/<row(?:\s[^>]*)?>[\s\S]*?<\/row>/g) ?? []) {
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

function jieXiPptX(tiaoMu: Record<string, Uint8Array>): string | null {
  const mingList = xiaoJuShuZu(
    Object.keys(tiaoMu).filter((ming) => /^ppt\/slides\/slide\d+\.xml$/.test(ming)),
    /slide(\d+)\.xml$/,
  )
  if (mingList.length === 0) return null
  const duan: string[] = []
  for (const ming of mingList) {
    const biaoQianWenBen = zuZiFu(tiaoMu[ming])
    if (!biaoQianWenBen) continue
    const wenBen = quChuBiaoQian(biaoQianWenBen)
      .replace(/<\/a:p>/g, '\n')
      .replace(/<a:br(?:\s[^>]*)?\/>/g, '\n')
      .replace(/<\/?a:t(?:\s[^>]*)?>/g, '')
    duan.push(jieXinShiTi(quChuBiaoQian(wenBen)))
  }
  return duan.join('\n\n') || null
}

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
      const { extractText } = await import('unpdf')
      const { text: wenBen } = await extractText(new Uint8Array(ke.ziJie), { mergePages: true })
      if (typeof wenBen !== 'string') return null
      return shouKouJieGuo(wenBen)
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

async function huoQuHuoJieXiWenJian(xing: MeiTiXing): Promise<DuiHuaWenJianTiQu | null> {
  const mingZhong = xing.sha256
  const zaiTu = tiQuHuanCun.get(mingZhong)
  if (zaiTu) return zaiTu
  if (tiQuHuanCun.size >= WEN_DANG_TI_QU_PEI_ZHI.tiQuHuanCunTiaoMuShangXian) {
    const zuiJiu = tiQuHuanCun.keys().next().value
    if (zuiJiu !== undefined) tiQuHuanCun.delete(zuiJiu)
  }
  const daiBanRenWu = anSha256TiQu(xing).catch((cuoWu) => {
    jiLuJiangJi(fenLeiCuoWu(cuoWu))
    return null
  })
  tiQuHuanCun.set(mingZhong, daiBanRenWu)
  return daiBanRenWu
}

export async function buQiWenJianTiQuWenBen<T extends DuiHuaLiShiXiang>(
  liShi: T[],
): Promise<T[]> {
  const houXuan: T[] = []
  const bianHaoLieBiao = new Set<string>()
  for (const xiang of liShi) {
    if (xiang.meiTiLeiBie !== 'wenjian' || xiang.yi_che_hui) continue
    if (xiang.wenJianTiQu || !xiang.meiTiId || !yanZhengUUID(xiang.meiTiId)) continue
    houXuan.push(xiang)
    bianHaoLieBiao.add(xiang.meiTiId)
  }
  if (houXuan.length === 0) return liShi
  let hangBiao: Map<string, MeiTiXing>
  try {
    hangBiao = await huoQuMeiTiXingLieBiao([...bianHaoLieBiao])
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
