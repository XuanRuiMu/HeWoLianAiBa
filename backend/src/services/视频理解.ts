import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { debug日志 } from '../utils/debug日志'
import { huoQuBenDiLuJing } from './媒体存储'
import { huoQuGuiJiLiuDongMiYao, huoQuDuoMoTaiPeiZhi } from '../config/多模态配置'
import { redis } from '../redis'

const execFileAsync = promisify(execFile)

export interface ShiPinJieXiJieGuo {
  huaMianMiaoShu: string | null
  zhuanXieWenBen: string | null
}

export interface ShiPinJieXiYiLai {
  zhiXingMingLing?: (luJing: string, canShu: string[]) => Promise<{ bianMa: number }>
  miaoShuTuPian?: (tuPianZiJie: Buffer) => Promise<string | null>
  zhuanXieYinPin?: (yinPinZiJie: Buffer, mime: string) => Promise<string | null>
}

const HUAN_CUN_QIAN_ZHUI = 'shipin_jiexi:'
const HUAN_CUN_YOU_XIAO_MIAO = 7 * 24 * 60 * 60
const neiCunHuanCun = new Map<string, ShiPinJieXiJieGuo>()

export function sheZhiShiPinJieXiHuanCun(sha256: string, jieGuo: ShiPinJieXiJieGuo): void {
  neiCunHuanCun.set(sha256, jieGuo)
}

export function huoQuFFmpegLuJing(): string | null {
  const peiZhiLuJing = (process.env['SHI_PIN_JIE_XI_FFMPEG_LU_JING'] || '').trim()
  if (peiZhiLuJing && fs.existsSync(peiZhiLuJing)) return peiZhiLuJing
  return null
}

function qingXi(wenBen: string | null | undefined, shangXian: number): string | null {
  if (typeof wenBen !== 'string') return null
  const jieGuo = wenBen.trim().slice(0, shangXian)
  return jieGuo || null
}

export async function duQuJieXiHuanCun(sha256: string): Promise<ShiPinJieXiJieGuo | null> {
  const benDi = neiCunHuanCun.get(sha256)
  if (benDi) return benDi
  try {
    const cunChu = await redis.get(HUAN_CUN_QIAN_ZHUI + sha256)
    if (!cunChu) return null
    const jieGuo = JSON.parse(cunChu) as ShiPinJieXiJieGuo
    neiCunHuanCun.set(sha256, jieGuo)
    return jieGuo
  } catch {
    return null
  }
}

export async function xieRuJieXiHuanCun(sha256: string, jieGuo: ShiPinJieXiJieGuo): Promise<void> {
  neiCunHuanCun.set(sha256, jieGuo)
  try {
    await redis.setex(HUAN_CUN_QIAN_ZHUI + sha256, HUAN_CUN_YOU_XIAO_MIAO, JSON.stringify(jieGuo))
  } catch {
    /* 缓存失败不阻断主流程 */
  }
}

async function moRenMiaoShuTuPian(tuPianZiJie: Buffer): Promise<string | null> {
  const moXing = 'deepseek-v4.1-flash-expires-on-0910'
  const jiChu = (process.env.DEEPSEEK_BASE_URL || '').trim().replace(/\/$/, '')
  const miYao = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!jiChu || !miYao) return null
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 90000)
  try {
    const xiangYing = await fetch(`${jiChu}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
      body: JSON.stringify({
        model: moXing,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '用一句话描述这段视频这一帧的画面内容' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${tuPianZiJie.toString('base64')}` } },
            ],
          },
        ],
        max_tokens: 500,
      }),
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) return null
    const shuJu = (await xiangYing.json()) as Record<string, unknown>
    const xuanXiang = (shuJu['choices'] as Array<Record<string, unknown>>)?.[0]
    const xiaoXi = xuanXiang?.['message'] as Record<string, unknown> | undefined
    return qingXi(typeof xiaoXi?.['content'] === 'string' ? String(xiaoXi?.['content']) : '', 200)
  } catch {
    return null
  } finally {
    clearTimeout(dingShi)
  }
}

async function moRenZhuanXieYinPin(yinPinZiJie: Buffer, mime: string): Promise<string | null> {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const miYao = huoQuGuiJiLiuDongMiYao()
  const moXing = peiZhi.guiJiLiuDongYuYinMoXing.trim()
  if (!miYao.trim() || !moXing) return null
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), 120000)
  try {
    const biaoDan = new FormData()
    biaoDan.append('model', moXing)
    biaoDan.append('file', new Blob([new Uint8Array(yinPinZiJie)], { type: mime }), 'shipin-shengyin.wav')
    const xiangYing = await fetch(`${peiZhi.guiJiLiuDongJiChuUrl.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${miYao}` },
      body: biaoDan,
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) return null
    const shuJu = (await xiangYing.json()) as Record<string, unknown>
    const wenBen = typeof shuJu['text'] === 'string' ? String(shuJu['text']) : typeof shuJu['wen_ben'] === 'string' ? String(shuJu['wen_ben']) : ''
    return qingXi(wenBen, 500)
  } catch {
    return null
  } finally {
    clearTimeout(dingShi)
  }
}

export async function jieXiShiPin(sha256: string, yiLai: ShiPinJieXiYiLai = {}): Promise<ShiPinJieXiJieGuo> {
  const huanCun = await duQuJieXiHuanCun(sha256)
  if (huanCun) return huanCun
  const kong: ShiPinJieXiJieGuo = { huaMianMiaoShu: null, zhuanXieWenBen: null }
  const ffmpegLuJing = huoQuFFmpegLuJing()
  const benDiLuJing = huoQuBenDiLuJing(sha256)
  if (!ffmpegLuJing || !benDiLuJing) {
    await xieRuJieXiHuanCun(sha256, kong)
    return kong
  }
  const linShiMuLu = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'shipin-jiexi-'))
  const zhenLuJing = path.join(linShiMuLu, 'zhen.jpg')
  const shengLuJing = path.join(linShiMuLu, 'sheng.wav')
  const zhiXing = yiLai.zhiXingMingLing ?? (async (luJing: string, canShu: string[]) => {
    try {
      await execFileAsync(luJing, canShu, { timeout: 60000 })
      return { bianMa: 0 }
    } catch {
      return { bianMa: 1 }
    }
  })
  try {
    const zhenJieGuo = await zhiXing(ffmpegLuJing, ['-y', '-v', 'error', '-i', benDiLuJing, '-vf', 'select=eq(n\\,60)', '-vframes', '1', '-q:v', '4', zhenLuJing])
    if (zhenJieGuo.bianMa === 0 && fs.existsSync(zhenLuJing)) {
      const tuPianZiJie = await fs.promises.readFile(zhenLuJing)
      if (tuPianZiJie.length > 0) {
        kong.huaMianMiaoShu = await (yiLai.miaoShuTuPian ?? moRenMiaoShuTuPian)(tuPianZiJie)
      }
    }
    const shengJieGuo = await zhiXing(ffmpegLuJing, ['-y', '-v', 'error', '-i', benDiLuJing, '-vn', '-ac', '1', '-ar', '16000', '-t', '20', shengLuJing])
    if (shengJieGuo.bianMa === 0 && fs.existsSync(shengLuJing)) {
      const yinPinZiJie = await fs.promises.readFile(shengLuJing)
      if (yinPinZiJie.length > 0) {
        kong.zhuanXieWenBen = await (yiLai.zhuanXieYinPin ?? moRenZhuanXieYinPin)(yinPinZiJie, 'audio/wav')
      }
    }
  } catch (cuoWu) {
    debug日志.warn('视频理解', '解析视频失败，已降级为占位', { xiang_qing: { cuo_wu: String(cuoWu) } })
  } finally {
    await fs.promises.rm(linShiMuLu, { recursive: true, force: true })
  }
  await xieRuJieXiHuanCun(sha256, kong)
  return kong
}

export async function huoQuHuoJieXiShiPinMiaoShu(sha256: string | null | undefined): Promise<ShiPinJieXiJieGuo> {
  const kong: ShiPinJieXiJieGuo = { huaMianMiaoShu: null, zhuanXieWenBen: null }
  if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) return kong
  const huanCun = await duQuJieXiHuanCun(sha256)
  if (huanCun) return huanCun
  if (!huoQuFFmpegLuJing()) return kong
  try {
    return await Promise.race([
      jieXiShiPin(sha256),
      new Promise<ShiPinJieXiJieGuo>((jieJue) => setTimeout(() => jieJue(kong), 90000)),
    ])
  } catch {
    return kong
  }
}
