import { peiZhi } from '../config'

const JiChu = (): string => {
  const zi = (process.env.DEEPSEEK_OFFICIAL_BASE_URL || peiZhi.deepSeek.基础地址 || 'https://api.deepseek.com').trim().replace(/\/$/, '')
  return /\/v1$/.test(zi) ? zi.replace(/\/v1$/, '') : zi
}

const MiYao = (): string => (process.env.DEEPSEEK_OFFICIAL_API_KEY || '').trim()

const ChaoShiHaoMiao = 180000

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
        count: Math.max(1, Math.min(20, canShu.tiaoShu ?? 8)),
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
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, wenBen: '', shiChangHaoMiao: null, ti_shi: '官方钥匙未配置' }
  if (!canShu.wavZiJie.length) return { cheng_gong: false, wenBen: '', shiChangHaoMiao: null, ti_shi: '音频为空' }
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

export async function heChengYuYin(canShu: { text: string; voiceId?: string; durationMs?: number }): Promise<TTSJieGuo> {
  const miYao = MiYao()
  if (miYao === '') return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: '官方钥匙未配置' }
  const text = (canShu.text || '').trim()
  if (text === '') return { cheng_gong: false, yinPin: null, mime: '', shiChangHaoMiao: null, ti_shi: '文本为空' }
  const voiceId = canShu.voiceId === 'male-qn-chenqing' || canShu.voiceId === 'tide' ? 'tide' : 'stella'
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
