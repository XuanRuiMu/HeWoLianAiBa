import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { debug日志 } from '../utils/debug日志'
import { huoQuBenDiLuJing } from './媒体存储'
import { shiBieYuYin } from './DeepSeek官方工具'
import { AI配置 } from '../config/AI配置'
import { redis } from '../redis'
import { huoQuFFmpegLuJing, tiQuYinPinWeiWav } from '../utils/音频转码'

const execFileAsync = promisify(execFile)

export interface ShiPinJieXiJieGuo {
  huaMianMiaoShu: string | null
  zhuanXieWenBen: string | null
  jiangJiZhaiYao?: string | null
}

export interface ShiPinJieXiYiLai {
  zhiXingMingLing?: (luJing: string, canShu: string[]) => Promise<{ bianMa: number }>
  miaoShuTuPian?: (tuPianZiJie: Buffer) => Promise<string | null>
  zhuanXieYinPin?: (yinPinZiJie: Buffer, mime: string) => Promise<string | null>
}

const HuanCunQianZhui = 'shipin_jiexi:'
const HuanCunYouXiaoMiao = 7 * 24 * 60 * 60
const neiCunHuanCun = new Map<string, ShiPinJieXiJieGuo>()

export function sheZhiShiPinJieXiHuanCun(sha256: string, jieGuo: ShiPinJieXiJieGuo): void {
  neiCunHuanCun.set(sha256, jieGuo)
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
    const cunChu = await redis.get(HuanCunQianZhui + sha256)
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
    await redis.setex(HuanCunQianZhui + sha256, HuanCunYouXiaoMiao, JSON.stringify(jieGuo))
  } catch {
    /* 缓存失败不阻断主流程 */
  }
}

async function moRenMiaoShuTuPian(tuPianZiJie: Buffer): Promise<string | null> {
  const 模型名 = AI配置.deepSeek.模型
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
        model: 模型名,
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

async function moRenZhuanXieYinPin(yinPinZiJie: Buffer, _mime: string): Promise<string | null> {
  const jieGuo = await shiBieYuYin({ wavZiJie: yinPinZiJie })
  if (!jieGuo.cheng_gong) return null
  return qingXi(jieGuo.wenBen, 500)
}

export async function jieXiShiPin(sha256: string, yiLai: ShiPinJieXiYiLai = {}): Promise<ShiPinJieXiJieGuo> {
  const huanCun = await duQuJieXiHuanCun(sha256)
  if (huanCun) return huanCun
  const kong: ShiPinJieXiJieGuo = { huaMianMiaoShu: null, zhuanXieWenBen: null, jiangJiZhaiYao: '视频理解：暂不支持视频识别' }
  const ffmpegLuJing = await huoQuFFmpegLuJing()
  const benDiLuJing = huoQuBenDiLuJing(sha256)
  if (!ffmpegLuJing || !benDiLuJing) {
    kong.jiangJiZhaiYao = '视频理解：暂不支持视频识别'
    await xieRuJieXiHuanCun(sha256, kong)
    return kong
  }
  const linShiMuLu = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'shipin-jiexi-'))
  const zhenLuJing = path.join(linShiMuLu, 'zhen.jpg')
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
    const yinPinZiJie = await tiQuYinPinWeiWav(benDiLuJing, { zhiXingMingLing: zhiXing, zuiChangMiao: 20 })
    if (yinPinZiJie && yinPinZiJie.length > 0) {
      kong.zhuanXieWenBen = await (yiLai.zhuanXieYinPin ?? moRenZhuanXieYinPin)(yinPinZiJie, 'audio/wav')
    }
  } catch (cuoWu) {
    debug日志.warn('视频理解', '解析视频失败，已降级为占位', { xiang_qing: { cuo_wu: String(cuoWu) } })
    kong.jiangJiZhaiYao = '视频理解：暂不支持视频识别'
  } finally {
    await fs.promises.rm(linShiMuLu, { recursive: true, force: true })
  }
  if (!kong.huaMianMiaoShu && !kong.zhuanXieWenBen && !kong.jiangJiZhaiYao) {
    kong.jiangJiZhaiYao = '视频理解：暂不支持视频识别'
  }
  await xieRuJieXiHuanCun(sha256, kong)
  return kong
}

export async function huoQuHuoJieXiShiPinMiaoShu(sha256: string | null | undefined): Promise<ShiPinJieXiJieGuo> {
  const kong: ShiPinJieXiJieGuo = { huaMianMiaoShu: null, zhuanXieWenBen: null, jiangJiZhaiYao: '视频理解：暂不支持视频识别' }
  if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) return kong
  const huanCun = await duQuJieXiHuanCun(sha256)
  if (huanCun) return huanCun
  if (!(await huoQuFFmpegLuJing())) return kong
  try {
    return await Promise.race([
      jieXiShiPin(sha256),
      new Promise<ShiPinJieXiJieGuo>((jieJue) => setTimeout(() => jieJue(kong), 90000)),
    ])
  } catch {
    return kong
  }
}
