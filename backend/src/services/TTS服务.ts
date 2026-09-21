import { huoQuFanYi } from '../config/translations'
import { debug日志 } from '../utils/debug日志'
import { peiZhi } from '../config'

export interface TTS合成请求 {
  text: string
  voiceId: string
  roleId?: string
}

export interface TTS合成响应 {
  mediaId: string
  durationMs: number
}

const TTS服务地址 = peiZhi.ttsServiceUrl || 'http://localhost:8001'

function huoQuNeiBuLingPai(): string {
  const lingPai = (peiZhi.internalToken || '').trim()
  // YH-022 空令牌禁止发出：生产启动已强校验，此处为纵深兜底
  if (!lingPai || lingPai.length < 16) {
    throw new Error('TTS内部令牌未配置或长度不足，拒绝发起内部调用')
  }
  return lingPai
}

async function 内部调用<T>(路径: string, body: unknown): Promise<T> {
  const url = `${TTS服务地址}${路径}`
  const 响应 = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': huoQuNeiBuLingPai(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35000),
  })

  if (!响应.ok) {
    const 错误信息 = await 响应.text().catch(() => '')
    throw new Error(`TTS服务调用失败: ${响应.status} ${错误信息}`)
  }

  return 响应.json() as Promise<T>
}

export async function 合成语音(请求: TTS合成请求): Promise<TTS合成响应> {
  const 开始时间 = Date.now()

  try {
    const 响应 = await 内部调用<{ audio_hex: string; duration_ms: number }>('/api/tts/synthesize', {
      text: 请求.text,
      voice_id: 请求.voiceId,
      speed: 1.0,
    })

    const 音频二进制 = Buffer.from(响应.audio_hex, 'hex')
    const { liuShiBaoCunMeiTi } = await import('./媒体存储')
    const 存储结果 = await liuShiBaoCunMeiTi(
      require('stream').Readable.from(音频二进制),
      `tts_${请求.roleId || 'unknown'}_${Date.now()}.mp3`,
      'audio/mpeg',
      'yuyin',
      请求.roleId || 'system',
    )

    debug日志.info('TTS服务', '语音合成成功', {
      xiang_qing: {
        roleId: 请求.roleId,
        voiceId: 请求.voiceId,
        字符数: 请求.text.length,
        音频大小: 音频二进制.length,
        时长: 响应.duration_ms,
        耗时: Date.now() - 开始时间,
      },
    })

    return {
      mediaId: 存储结果.mediaId,
      durationMs: 响应.duration_ms,
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
  if (!peiZhi.ttsEnabled) {
    return null
  }
  try {
    return await 合成语音(请求)
  } catch {
    return null
  }
}