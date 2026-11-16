import { debug日志 } from '../utils/debug日志'
import { Readable } from 'stream'
import { heChengYuYin } from './DeepSeek官方工具'

export interface TTS合成请求 {
  text: string
  voiceId: string
  roleId?: string
}

export interface TTS合成响应 {
  mediaId: string
  durationMs: number
}

function guJiShiChangHaoMiao(wenBen: string): number {
  const ziFuShu = Array.from(wenBen).length
  return Math.max(500, Math.round((ziFuShu / 4) * 1000))
}

export async function 合成语音(请求: TTS合成请求): Promise<TTS合成响应> {
  const 开始时间 = Date.now()

  try {
    const jieGuo = await heChengYuYin({ text: 请求.text, voiceId: 请求.voiceId, durationMs: guJiShiChangHaoMiao(请求.text) })
    if (!jieGuo.cheng_gong || !jieGuo.yinPin) {
      throw new Error(jieGuo.ti_shi || 'TTS合成失败')
    }
    const 音频二进制 = jieGuo.yinPin
    const 时长毫秒 = guJiShiChangHaoMiao(请求.text)
    const { liuShiBaoCunMeiTi } = await import('./媒体存储')
    const 存储结果 = await liuShiBaoCunMeiTi(
      Readable.from(音频二进制),
      `tts_${请求.roleId || 'unknown'}_${Date.now()}.wav`,
      jieGuo.mime || 'audio/wav',
      'yuyin',
      请求.roleId ?? 'system',
      jieGuo.shiChangHaoMiao ?? 时长毫秒,
    )

    debug日志.info('TTS服务', '语音合成成功', {
      xiang_qing: {
        roleId: 请求.roleId,
        voiceId: 请求.voiceId,
        字符数: 请求.text.length,
        音频大小: 音频二进制.length,
        时长: 时长毫秒,
        耗时: Date.now() - 开始时间,
      },
    })

    return {
      mediaId: 存储结果.mediaId,
      durationMs: jieGuo.shiChangHaoMiao ?? 时长毫秒,
    }
  } catch (错误) {
    debug日志.debug('TTS服务', '语音合成失败，已告警降级', {
      xiang_qing: {
        roleId: 请求.roleId,
        voiceId: 请求.voiceId,
        错误: String(错误),
        耗时: Date.now() - 开始时间,
      },
    })
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('tts_he_cheng_shi_bai', 'TTS合成失败降级', `TTS合成失败已降级为空：${String(错误).slice(0, 300)}`).catch(() => undefined)
    throw 错误
  }
}

export async function 尝试合成语音(请求: TTS合成请求): Promise<TTS合成响应 | null> {
  try {
    return await 合成语音(请求)
  } catch {
    return null
  }
}
