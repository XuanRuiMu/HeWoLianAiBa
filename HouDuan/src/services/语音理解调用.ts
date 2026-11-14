import { debug日志 } from '../utils/debug日志'
import { huoQuDuoMoTaiPeiZhi, huoQuYinPinLiJieMiYao } from '../config/多模态配置'
import { huoQuBenDiLuJing } from './媒体存储'
import { huoQuFFmpegLuJing, tiQuYinPinWeiWav } from '../utils/音频转码'
import { redis } from '../redis'

const HuanCunQianZhui = 'yuyin_shijian:'
const HuanCunYouXiaoMiao = 7 * 24 * 60 * 60
const MiaoShuZuiDaZiFu = 200
const QingQiuChaoShiDiXianHaoMiao = 60000
const ZhiLingCi =
  '请用不超过200字客观描述这段语音：说了什么内容、说话人的语气情绪、背景环境声、是否在唱歌以及唱歌表现。只陈述听到的事实，不评价、不讨好；听不清的部分就写听不清，禁止编造。'
const neiCunHuanCun = new Map<string, string>()

export function qingChuYinPinShiJianNeiCunHuanCun(): void {
  neiCunHuanCun.clear()
}

function shiFouJinZhiCeShiWaiHu(): boolean {
  return process.env.VITEST === 'true' && process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true'
}

function qingXiMiaoShu(wenBen: unknown): string | null {
  if (typeof wenBen !== 'string') return null
  const jieGuo = wenBen.trim().slice(0, MiaoShuZuiDaZiFu)
  return jieGuo || null
}

function tiQuHuiFuNeiRong(shuJu: Record<string, unknown>): string | null {
  const xuanXiang = (shuJu['choices'] as Array<Record<string, unknown>> | undefined)?.[0]
  const xiaoXi = xuanXiang?.['message'] as Record<string, unknown> | undefined
  const neiRong = xiaoXi?.['content']
  if (typeof neiRong === 'string') return qingXiMiaoShu(neiRong)
  if (Array.isArray(neiRong)) {
    const pinJie = (neiRong as Array<Record<string, unknown>>)
      .filter((fenPian) => fenPian['type'] === 'text' && typeof fenPian['text'] === 'string')
      .map((fenPian) => String(fenPian['text']))
      .join('')
    return qingXiMiaoShu(pinJie)
  }
  return null
}

export async function duQuYinPinShiJianHuanCun(sha256: string, moXing: string): Promise<string | null> {
  const jian = `${sha256}:${moXing}`
  const neiCun = neiCunHuanCun.get(jian)
  if (neiCun !== undefined) return neiCun
  try {
    const cunChu = await redis.get(`${HuanCunQianZhui}${jian}`)
    if (!cunChu) return null
    const jieXi = JSON.parse(cunChu) as unknown
    const miaoShu = qingXiMiaoShu(jieXi)
    if (miaoShu) neiCunHuanCun.set(jian, miaoShu)
    return miaoShu
  } catch {
    return null
  }
}

async function xieRuYinPinShiJianHuanCun(sha256: string, moXing: string, miaoShu: string): Promise<void> {
  const jian = `${sha256}:${moXing}`
  neiCunHuanCun.set(jian, miaoShu)
  try {
    await redis.setex(`${HuanCunQianZhui}${jian}`, HuanCunYouXiaoMiao, JSON.stringify(miaoShu))
  } catch {
    /* 缓存失败不阻断主流程 */
  }
}

export async function huoQuYinPinShiJianMiaoShuZhiJie(canShu: { sha256: string; mime: string }): Promise<string | null> {
  const sha256 = typeof canShu?.sha256 === 'string' ? canShu.sha256.toLowerCase().trim() : ''
  const mime = typeof canShu?.mime === 'string' ? canShu.mime.toLowerCase() : ''
  if (!/^[0-9a-f]{64}$/.test(sha256)) return null
  if (!mime.startsWith('audio/')) return null
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const miYao = huoQuYinPinLiJieMiYao().trim()
  const moXing = peiZhi.yinPinLiJieMoXing.trim()
  if (!peiZhi.yinPinLiJieQiYong || miYao === '' || moXing === '') return null
  const huanCun = await duQuYinPinShiJianHuanCun(sha256, moXing)
  if (huanCun) return huanCun
  const benDiLuJing = huoQuBenDiLuJing(sha256)
  if (!benDiLuJing) return null
  const ffmpegLuJing = await huoQuFFmpegLuJing()
  if (!ffmpegLuJing) return null
  let wavZiJie: Buffer | null = null
  try {
    wavZiJie = await tiQuYinPinWeiWav(benDiLuJing)
  } catch (cuoWu) {
    debug日志.warn('语音理解调用', '音频转码失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  }
  if (!wavZiJie || !wavZiJie.length) return null
  const base64 = wavZiJie.toString('base64')
  if (Buffer.byteLength(base64, 'utf8') > peiZhi.yinPinLiJieZuiDaZiJie) return null
  if (shiFouJinZhiCeShiWaiHu()) {
    throw new Error(
      '[语音理解调用] VITEST 测试环境禁止真实外呼（音频事件理解）：请在 语音理解.ts 注入 sheZhiYuYinLiJieMock，或显式设置 XU_KE_ZHEN_SHI_WAI_HU=true 并 stub fetch 后联调',
    )
  }
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), Math.max(peiZhi.qingQiuChaoShiHaoMiao, QingQiuChaoShiDiXianHaoMiao))
  try {
    const xiangYing = await fetch(`${peiZhi.yinPinLiJieJiChuUrl.trim().replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${miYao}` },
      body: JSON.stringify({
        model: moXing,
        modalities: ['text'],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'input_audio', input_audio: { data: base64, format: 'wav' } },
              { type: 'text', text: ZhiLingCi },
            ],
          },
        ],
      }),
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) return null
    const shuJu = (await xiangYing.json()) as Record<string, unknown>
    const miaoShu = tiQuHuiFuNeiRong(shuJu)
    if (!miaoShu) return null
    await xieRuYinPinShiJianHuanCun(sha256, moXing, miaoShu)
    return miaoShu
  } catch (cuoWu) {
    debug日志.warn('语音理解调用', '音频事件理解请求失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  } finally {
    clearTimeout(dingShi)
  }
}
