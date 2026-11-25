import { peiZhi } from '../config'
import { huoQuDuoMoTaiPeiZhi, huoQuGuiJiLiuDongMiYao } from '../config/多模态配置'

const JiChu = (): string => {
  const zi = (process.env.DEEPSEEK_OFFICIAL_BASE_URL || peiZhi.deepSeek.基础地址 || 'https://api.deepseek.com').trim().replace(/\/$/, '')
  return /\/v1$/.test(zi) ? zi.replace(/\/v1$/, '') : zi
}

const MiYao = (): string => (process.env.DEEPSEEK_OFFICIAL_API_KEY || '').trim()

const ChaoShiHaoMiao = 180000

function huoQuMianFeiSouSuoDaiLi(): string {
  return (process.env.SOU_SUO_DAI_LI || '').trim()
}

function jieXiDdgLite(html: string): Array<{ title: string; url: string; snippet: string; site_name: string; date: string }> {
  const jieGuo: Array<{ title: string; url: string; snippet: string; site_name: string; date: string }> = []
  const linkReg = /<a\s+rel="nofollow"\s+href="(?:https?:)?\/\/duckduckgo\.com\/l\/\?uddg=([^"&]+)[^"]*"[^>]*class='result-link'[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = linkReg.exec(html)) !== null) {
    let url = ''
    try { url = decodeURIComponent(m[1]) } catch { continue }
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!/^https?:\/\//i.test(url) || !title) continue
    let snippet = ''
    const snipZhengZe = new RegExp(`<td\\s+class='result-snippet'>([\\s\\S]{0,600}?)</td>`)
    const snip = html.slice(m.index, m.index + 1200).match(snipZhengZe) || html.match(snipZhengZe)
    if (snip) snippet = snip[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    let site = ''
    try { site = new URL(url).hostname.replace(/^www\./, '') } catch { site = '' }
    const riQi = snippet.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2})/)
    jieGuo.push({ title, url, snippet, site_name: site, date: riQi ? riQi[1] : '' })
  }
  return jieGuo
}

async function souSuoDdgLite(query: string, tiaoShu: number): Promise<WangYeSouSuoTiaoMu[]> {
  const daiLi = huoQuMianFeiSouSuoDaiLi()
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 25000)
  try {
    const tou: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' }
    let dispatcher: unknown
    if (daiLi) {
      const { ProxyAgent } = await import('undici')
      dispatcher = new ProxyAgent(daiLi)
    }
    const xiangYing = await fetch(url, {
      method: 'GET',
      headers: tou,
      signal: kongZhi.signal,
      ...(dispatcher ? ({ dispatcher } as Record<string, unknown>) : {}),
    } as RequestInit)
    if (!xiangYing.ok) return []
    const html = await xiangYing.text()
    return jieXiDdgLite(html).slice(0, tiaoShu).map((x) => ({
      title: x.title, url: x.url, snippet: x.snippet, summary: x.snippet, content: x.snippet,
      site_name: x.site_name || null, date: x.date || null, authority: 0, rerank_score: 0,
    }))
  } catch {
    return []
  } finally {
    clearTimeout(dingShi)
  }
}

async function souSuoBing(query: string, tiaoShu: number): Promise<WangYeSouSuoTiaoMu[]> {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 25000)
  try {
    const xiangYing = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' },
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) return []
    const html = await xiangYing.text()
    const jieGuo: WangYeSouSuoTiaoMu[] = []
    const reg = /<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/gi
    let m: RegExpExecArray | null
    while ((m = reg.exec(html)) !== null && jieGuo.length < tiaoShu) {
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      let site = ''
      try { site = new URL(m[1]).hostname.replace(/^www\./, '') } catch { site = '' }
      jieGuo.push({ title, url: m[1], snippet: title, summary: title, content: title, site_name: site || null, date: null, authority: 0, rerank_score: 0 })
    }
    return jieGuo
  } catch {
    return []
  } finally {
    clearTimeout(dingShi)
  }
}

export interface WangYeSouSuoTiaoMu {
  title: string
  url: string
  snippet: string
  summary: string
  content: string
  site_name: string | null
  date: string | null
  authority: number
  rerank_score: number
}

export interface WangYeSouSuoJieGuo {
  cheng_gong: boolean
  tiaoMu: WangYeSouSuoTiaoMu[]
  ti_shi?: string
}

export async function souSuoWangYe(canShu: {
  query: string
  tiaoShu?: number
  xuYaoZhengWen?: boolean
  yuanShiWenTi?: string
}): Promise<WangYeSouSuoJieGuo> {
  const query = (canShu.query || '').trim()
  if (query === '' || query.length > 128) return { cheng_gong: false, tiaoMu: [], ti_shi: '搜索词为空或超长' }
  const gongJu = (process.env.SOU_SUO_GONG_JU || 'ddg').trim().toLowerCase()
  const tiaoShu = Math.max(1, Math.min(20, canShu.tiaoShu ?? 8))
  const mianFei = gongJu === 'ddg' || gongJu === 'bing' ? (gongJu === 'ddg' ? await souSuoDdgLite(query, tiaoShu) : await souSuoBing(query, tiaoShu)) : []
  if (mianFei.length > 0) return { cheng_gong: true, tiaoMu: mianFei }
  if (gongJu === 'ddg' || gongJu === 'bing') {
    const bei = gongJu === 'ddg' ? await souSuoBing(query, tiaoShu) : await souSuoDdgLite(query, tiaoShu)
    if (bei.length > 0) return { cheng_gong: true, tiaoMu: bei }
    return { cheng_gong: false, tiaoMu: [], ti_shi: '免费搜索无结果' }
  }
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, tiaoMu: [], ti_shi: '官方钥匙未配置' }
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 30000)
  try {
    const xiangYing = await fetch(`${JiChu()}/v1/tools/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
      body: JSON.stringify({
        query,
        count: tiaoShu,
        need_content: canShu.xuYaoZhengWen === true,
        ori_question: canShu.yuanShiWenTi ? String(canShu.yuanShiWenTi).slice(0, 128) : null,
      }),
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) {
      const wai = await xiangYing.text().catch(() => '')
      return { cheng_gong: false, tiaoMu: [], ti_shi: `搜索失败 ${xiangYing.status} ${wai.slice(0, 200)}` }
    }
    const shuJu = (await xiangYing.json()) as { results?: Array<Record<string, unknown>> }
    const tiaoMu: WangYeSouSuoTiaoMu[] = (shuJu.results || []).map((xiang) => ({
      title: String(xiang.title ?? ''),
      url: String(xiang.url ?? ''),
      snippet: String(xiang.snippet ?? ''),
      summary: String(xiang.summary ?? ''),
      content: String(xiang.content ?? ''),
      site_name: xiang.site_name == null ? null : String(xiang.site_name),
      date: xiang.date == null ? null : String(xiang.date),
      authority: Number(xiang.authority ?? 0) || 0,
      rerank_score: Number(xiang.rerank_score ?? 0) || 0,
    }))
    return { cheng_gong: true, tiaoMu }
  } catch (cuoWu) {
    return { cheng_gong: false, tiaoMu: [], ti_shi: `搜索异常 ${String(cuoWu).slice(0, 200)}` }
  } finally {
    clearTimeout(dingShi)
  }
}

export async function zhuaQuWangYe(url: string): Promise<{ cheng_gong: boolean; title: string; neiRong: string; ti_shi?: string }> {
  const muBiao = (url || '').trim()
  if (!/^https?:\/\//i.test(muBiao) || muBiao.length > 8192) return { cheng_gong: false, title: '', neiRong: '', ti_shi: 'URL 不合法' }
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, title: '', neiRong: '', ti_shi: '官方钥匙未配置' }
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 60000)
  try {
    const xiangYing = await fetch(`${JiChu()}/v1/tools/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
      body: JSON.stringify({ url: muBiao }),
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) {
      const wai = await xiangYing.text().catch(() => '')
      return { cheng_gong: false, title: '', neiRong: '', ti_shi: `抓取失败 ${xiangYing.status} ${wai.slice(0, 200)}` }
    }
    const shuJu = (await xiangYing.json()) as Record<string, unknown>
    return { cheng_gong: true, title: String(shuJu.title ?? ''), neiRong: String(shuJu.content ?? '') }
  } catch (cuoWu) {
    return { cheng_gong: false, title: '', neiRong: '', ti_shi: `抓取异常 ${String(cuoWu).slice(0, 200)}` }
  } finally {
    clearTimeout(dingShi)
  }
}

export interface OCRJieGuo {
  cheng_gong: boolean
  yeShu: number
  wenBen: string
  ti_shi?: string
}

export async function ocrShiBieWenJian(canShu: { ziJie: Buffer; wenJianMing: string; mime: string }): Promise<OCRJieGuo> {
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, yeShu: 0, wenBen: '', ti_shi: '官方钥匙未配置' }
  if (!canShu.ziJie.length) return { cheng_gong: false, yeShu: 0, wenBen: '', ti_shi: '文件为空' }
  const biaoDan = new FormData()
  biaoDan.append('purpose', 'text_recognition')
  biaoDan.append('file', new Blob([new Uint8Array(canShu.ziJie)], { type: canShu.mime || 'application/octet-stream' }), canShu.wenJianMing || 'file')
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), ChaoShiHaoMiao)
  try {
    const xiangYing = await fetch(`${JiChu()}/v1/tools/ocr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${miYao}` },
      body: biaoDan,
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) {
      const wai = await xiangYing.text().catch(() => '')
      return { cheng_gong: false, yeShu: 0, wenBen: '', ti_shi: `OCR失败 ${xiangYing.status} ${wai.slice(0, 200)}` }
    }
    const shuJu = (await xiangYing.json()) as {
      page_count?: number
      pages?: Array<{ index?: number; text?: string; finish_reason?: string }>
    }
    const ye = (shuJu.pages || []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    const wenBen = ye.map((x) => String(x.text ?? '')).join('\n\n').trim()
    if (wenBen === '') return { cheng_gong: false, yeShu: shuJu.page_count ?? 0, wenBen: '', ti_shi: '未识别到文字' }
    return { cheng_gong: true, yeShu: shuJu.page_count ?? ye.length, wenBen: wenBen.slice(0, 20000) }
  } catch (cuoWu) {
    return { cheng_gong: false, yeShu: 0, wenBen: '', ti_shi: `OCR异常 ${String(cuoWu).slice(0, 200)}` }
  } finally {
    clearTimeout(dingShi)
  }
}

export interface ASRJieGuo {
  cheng_gong: boolean
  wenBen: string
  shiChangHaoMiao: number | null
  ti_shi?: string
}

export async function shiBieYuYin(canShu: { wavZiJie: Buffer }): Promise<ASRJieGuo> {
  if (!canShu.wavZiJie.length) return { cheng_gong: false, wenBen: '', shiChangHaoMiao: null, ti_shi: '音频为空' }
  const duoMoTai = huoQuDuoMoTaiPeiZhi()
  const mianFeiKey = huoQuGuiJiLiuDongMiYao().trim()
  const mianFeiBase = duoMoTai.guiJiLiuDongJiChuUrl.trim().replace(/\/$/, '')
  const mianFeiModel = duoMoTai.guiJiLiuDongYuYinMoXing.trim()
  if (mianFeiKey !== '' && mianFeiBase !== '' && mianFeiModel !== '') {
    const biaoDan = new FormData()
    biaoDan.append('file', new Blob([new Uint8Array(canShu.wavZiJie)], { type: 'audio/wav' }), 'yuyin.wav')
    biaoDan.append('model', mianFeiModel)
    const kongZhi = new AbortController()
    const dingShi = setTimeout(() => kongZhi.abort(), 120000)
    try {
      const xiangYing = await fetch(`${mianFeiBase}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mianFeiKey}` },
        body: biaoDan,
        signal: kongZhi.signal,
      })
      if (xiangYing.ok) {
        const shuJu = (await xiangYing.json()) as { text?: string; duration?: number }
        const wenBen = String(shuJu.text ?? '').trim()
        if (wenBen !== '') return { cheng_gong: true, wenBen, shiChangHaoMiao: Number(shuJu.duration ?? 0) > 0 ? Math.round(Number(shuJu.duration) * 1000) : null }
        return { cheng_gong: true, wenBen: '', shiChangHaoMiao: null }
      }
    } catch {
      /* 免费通道失败继续走官方 */
    } finally {
      clearTimeout(dingShi)
    }
  }
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, wenBen: '', shiChangHaoMiao: null, ti_shi: '官方钥匙未配置' }
  const biaoDan = new FormData()
  biaoDan.append('file', new Blob([new Uint8Array(canShu.wavZiJie)], { type: 'audio/wav' }), 'yuyin.wav')
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 120000)
  try {
    const xiangYing = await fetch(`${JiChu()}/v1/tools/asr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${miYao}` },
      body: biaoDan,
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) {
      const wai = await xiangYing.text().catch(() => '')
      return { cheng_gong: false, wenBen: '', shiChangHaoMiao: null, ti_shi: `ASR失败 ${xiangYing.status} ${wai.slice(0, 200)}` }
    }
    const shuJu = (await xiangYing.json()) as { text?: string; duration_ms?: number }
    return { cheng_gong: true, wenBen: String(shuJu.text ?? '').trim(), shiChangHaoMiao: Number(shuJu.duration_ms ?? 0) || null }
  } catch {
    return { cheng_gong: false, wenBen: '', shiChangHaoMiao: null, ti_shi: 'ASR请求失败' }
  } finally {
    clearTimeout(dingShi)
  }
}

export interface TTSJieGuo {
  cheng_gong: boolean
  yinPin: Buffer | null
  mime: string
  shiChangHaoMiao: number | null
  ti_shi?: string
}

export async function heChengYuYin(canShu: { text: string; yinSeId?: string; durationMs?: number }): Promise<TTSJieGuo> {
  const text = (canShu.text || '').trim()
  if (text === '') return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: '文本为空' }
  const duoMoTai = huoQuDuoMoTaiPeiZhi()
  const mianFeiKey = huoQuGuiJiLiuDongMiYao().trim()
  const mianFeiBase = duoMoTai.guiJiLiuDongJiChuUrl.trim().replace(/\/$/, '')
  if (mianFeiKey !== '' && mianFeiBase !== '') {
    const yinSe = canShu.yinSeId === 'male-qn-chenqing' || canShu.yinSeId === 'tide' ? 'benjamin' : 'anna'
    const kongZhi = new AbortController()
    const dingShi = setTimeout(() => kongZhi.abort(), 90000)
    try {
      const xiangYing = await fetch(`${mianFeiBase}/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mianFeiKey}` },
        body: JSON.stringify({
          model: 'FunAudioLLM/CosyVoice2-0.5B',
          input: text.slice(0, 10000),
          voice: `FunAudioLLM/CosyVoice2-0.5B:${yinSe}`,
          response_format: 'wav',
        }),
        signal: kongZhi.signal,
      })
      if (xiangYing.ok) {
        const huanChong = Buffer.from(await xiangYing.arrayBuffer())
        if (huanChong.length > 0) return { cheng_gong: true, yinPin: huanChong, mime: 'audio/wav', shiChangHaoMiao: typeof canShu.durationMs === 'number' && canShu.durationMs > 0 ? Math.round(canShu.durationMs) : null }
      }
    } catch {
      /* 免费通道失败继续走官方 */
    } finally {
      clearTimeout(dingShi)
    }
  }
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: '官方钥匙未配置' }
  const voiceId = canShu.yinSeId === 'male-qn-chenqing' || canShu.yinSeId === 'tide' ? 'tide' : 'stella'
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), ChaoShiHaoMiao)
  try {
    const xiangYing = await fetch(`${JiChu()}/v1/tools/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
      body: JSON.stringify({ text: text.slice(0, 10000), voice_id: voiceId, format: 'wav', filter_markdown: true }),
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) {
      const wai = await xiangYing.text().catch(() => '')
      return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: `TTS失败 ${xiangYing.status} ${wai.slice(0, 200)}` }
    }
    const huanChong = Buffer.from(await xiangYing.arrayBuffer())
    if (!huanChong.length) return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: 'TTS返回空音频' }
    return { cheng_gong: true, yinPin: huanChong, mime: 'audio/wav', shiChangHaoMiao: typeof canShu.durationMs === 'number' && canShu.durationMs > 0 ? Math.round(canShu.durationMs) : null }
  } catch (cuoWu) {
    return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: `TTS异常 ${String(cuoWu).slice(0, 200)}` }
  } finally {
    clearTimeout(dingShi)
  }
}
