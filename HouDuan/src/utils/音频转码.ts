import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { debug日志 } from './debug日志'

const execFileAsync = promisify(execFile)

const FfmpegLuJingHuanCunBianLiang = 'SHI_PIN_JIE_XI_FFMPEG_LU_JING'
const YinPinZhuanMaCaiYangLv = 16000
const YinPinZhuanMaShengDaoShu = 1
const YinPinZhuanMaZuiChangMiao = 60
const FfmpegTanCeChaoShiHaoMiao = 10000

export interface YinPinZhuanMaYiLai {
  zhiXingMingLing?: (luJing: string, canShu: string[]) => Promise<{ bianMa: number }>
  zuiChangMiao?: number
}

let ffmpegLuJingHuanCun: string | null | undefined

export function chongZhiFFmpegLuJingHuanCun(): void {
  ffmpegLuJingHuanCun = undefined
}

export async function huoQuFFmpegLuJing(): Promise<string | null> {
  if (ffmpegLuJingHuanCun !== undefined) return ffmpegLuJingHuanCun
  const peiZhiLuJing = (process.env[FfmpegLuJingHuanCunBianLiang] || '').trim()
  if (peiZhiLuJing && fs.existsSync(peiZhiLuJing)) {
    ffmpegLuJingHuanCun = peiZhiLuJing
    return ffmpegLuJingHuanCun
  }
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: FfmpegTanCeChaoShiHaoMiao })
    ffmpegLuJingHuanCun = 'ffmpeg'
  } catch {
    ffmpegLuJingHuanCun = null
  }
  return ffmpegLuJingHuanCun
}

export async function tiQuYinPinWeiWav(yuanLuJing: string, yiLai: YinPinZhuanMaYiLai = {}): Promise<Buffer | null> {
  if (typeof yuanLuJing !== 'string' || yuanLuJing.trim() === '') return null
  const ffmpegLuJing = await huoQuFFmpegLuJing()
  if (!ffmpegLuJing) return null
  const zuiChangMiao = yiLai.zuiChangMiao && yiLai.zuiChangMiao > 0 ? yiLai.zuiChangMiao : YinPinZhuanMaZuiChangMiao
  const linShiMuLu = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yinpin-zhuanma-'))
  const wavLuJing = path.join(linShiMuLu, 'sheng.wav')
  const canShu = [
    '-y',
    '-v',
    'error',
    '-i',
    yuanLuJing,
    '-vn',
    '-ac',
    String(YinPinZhuanMaShengDaoShu),
    '-ar',
    String(YinPinZhuanMaCaiYangLv),
    '-t',
    String(zuiChangMiao),
    wavLuJing,
  ]
  try {
    const zhiXing = yiLai.zhiXingMingLing ?? (async (luJing: string, args: string[]) => {
      try {
        await execFileAsync(luJing, args, { timeout: 60000 })
        return { bianMa: 0 }
      } catch {
        return { bianMa: 1 }
      }
    })
    const zhiXingJieGuo = await zhiXing(ffmpegLuJing, canShu)
    if (zhiXingJieGuo.bianMa !== 0 || !fs.existsSync(wavLuJing)) return null
    const wavZiJie = await fs.promises.readFile(wavLuJing)
    if (!wavZiJie.length) return null
    return wavZiJie
  } catch (cuoWu) {
    debug日志.warn('音频转码', '音频转码为wav失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  } finally {
    await fs.promises.rm(linShiMuLu, { recursive: true, force: true })
  }
}
