import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(
    (mingLing: string, canShu: string[], xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
      huiDiao(new Error(`execFile mock: ${mingLing} ${canShu.join(' ')}`), '', '')
    },
  ),
}))

vi.mock('child_process', () => ({
  execFile: execFileMock,
}))
vi.mock('../debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { chongZhiFFmpegLuJingHuanCun, huoQuFFmpegLuJing, tiQuYinPinWeiWav } from '../音频转码'

const HuanJingBianLiang = 'SHI_PIN_JIE_XI_FFMPEG_LU_JING'

function sheZhiMoRenTanCeShiBai(): void {
  execFileMock.mockImplementation(
    (mingLing: string, canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
      huiDiao(new Error(`execFile mock: ${mingLing} ${canShu.join(' ')}`), '', '')
    },
  )
}

describe('音频转码共享工具（FFmpeg 发现与 wav 抽取）', () => {
  beforeEach(() => {
    chongZhiFFmpegLuJingHuanCun()
    delete process.env[HuanJingBianLiang]
    execFileMock.mockReset()
    sheZhiMoRenTanCeShiBai()
  })

  afterEach(() => {
    chongZhiFFmpegLuJingHuanCun()
    delete process.env[HuanJingBianLiang]
  })

  it('配置了存在的 ffmpeg 路径时直接使用，不探测 PATH', async () => {
    process.env[HuanJingBianLiang] = os.tmpdir()
    expect(await huoQuFFmpegLuJing()).toBe(os.tmpdir())
    expect(execFileMock).not.toHaveBeenCalled()
  })

  it('配置路径不存在且 PATH 探测失败时返回 null 不抛错', async () => {
    process.env[HuanJingBianLiang] = 'Z:/bu/cun/zai/ffmpeg.exe'
    expect(await huoQuFFmpegLuJing()).toBeNull()
    expect(execFileMock).toHaveBeenCalledTimes(1)
  })

  it('未配置路径但 PATH 里有 ffmpeg 时返回 ffmpeg 命令名', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    expect(await huoQuFFmpegLuJing()).toBe('ffmpeg')
  })

  it('发现结果有缓存：第二次调用不再探测', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    expect(await huoQuFFmpegLuJing()).toBe('ffmpeg')
    expect(await huoQuFFmpegLuJing()).toBe('ffmpeg')
    expect(execFileMock).toHaveBeenCalledTimes(1)
  })

  it('抽音轨参数：单声道、16k、默认60秒上限，输出可读回', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    const neiRong = Buffer.from('RIFF....WAVE')
    const zhiXing = vi.fn(async (_luJing: string, canShu: string[]) => {
      await fs.promises.writeFile(canShu[canShu.length - 1], neiRong)
      return { bianMa: 0 }
    })
    const jieGuo = await tiQuYinPinWeiWav(os.tmpdir(), { zhiXingMingLing: zhiXing })
    expect(jieGuo?.equals(neiRong)).toBe(true)
    const canShu = zhiXing.mock.calls[0][1]
    expect(canShu).toContain('-vn')
    expect(canShu).toContain('-ac')
    expect(canShu[canShu.indexOf('-ac') + 1]).toBe('1')
    expect(canShu).toContain('-ar')
    expect(canShu[canShu.indexOf('-ar') + 1]).toBe('16000')
    expect(canShu).toContain('-t')
    expect(canShu[canShu.indexOf('-t') + 1]).toBe('60')
  })

  it('视频复用场景可传入自定义时长上限（-t 20）', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    const zhiXing = vi.fn(async (_luJing: string, canShu: string[]) => {
      await fs.promises.writeFile(canShu[canShu.length - 1], Buffer.from('wav'))
      return { bianMa: 0 }
    })
    await tiQuYinPinWeiWav(os.tmpdir(), { zhiXingMingLing: zhiXing, zuiChangMiao: 20 })
    const canShu = zhiXing.mock.calls[0][1]
    expect(canShu[canShu.indexOf('-t') + 1]).toBe('20')
  })

  it('转码命令失败时返回 null 不抛错，且临时目录被清理', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    const zhiXing = vi.fn(async () => ({ bianMa: 1 }))
    expect(await tiQuYinPinWeiWav(os.tmpdir(), { zhiXingMingLing: zhiXing })).toBeNull()
  })

  it('命令成功但没有产出 wav 文件时返回 null', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    const zhiXing = vi.fn(async () => ({ bianMa: 0 }))
    expect(await tiQuYinPinWeiWav(os.tmpdir(), { zhiXingMingLing: zhiXing })).toBeNull()
  })

  it('产出空 wav 文件时返回 null', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, _canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        huiDiao(null, 'ffmpeg version 7.1', '')
      },
    )
    const zhiXing = vi.fn(async (_luJing: string, canShu: string[]) => {
      await fs.promises.writeFile(canShu[canShu.length - 1], Buffer.alloc(0))
      return { bianMa: 0 }
    })
    expect(await tiQuYinPinWeiWav(os.tmpdir(), { zhiXingMingLing: zhiXing })).toBeNull()
  })

  it('ffmpeg 不存在时直接返回 null，不执行转码命令', async () => {
    const zhiXing = vi.fn(async () => ({ bianMa: 0 }))
    expect(await tiQuYinPinWeiWav(os.tmpdir(), { zhiXingMingLing: zhiXing })).toBeNull()
    expect(zhiXing).not.toHaveBeenCalled()
  })

  it('默认执行路径（未注入命令实现）遇到执行失败时返回 null', async () => {
    execFileMock.mockImplementation(
      (_mingLing: string, canShu: string[], _xuanXiang: unknown, huiDiao: (cuoWu: Error | null, stdout: string, stderr: string) => void) => {
        if (canShu.includes('-version')) {
          huiDiao(null, 'ffmpeg version 7.1', '')
          return
        }
        huiDiao(new Error('转码失败'), '', '')
      },
    )
    expect(await tiQuYinPinWeiWav(os.tmpdir())).toBeNull()
  })

  it('空输入路径直接返回 null', async () => {
    expect(await tiQuYinPinWeiWav('')).toBeNull()
    expect(await tiQuYinPinWeiWav('   ')).toBeNull()
  })
})
