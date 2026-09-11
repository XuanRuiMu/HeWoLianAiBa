import { describe, it, expect, beforeEach } from 'vitest'
import {
  jieXiShiPin,
  huoQuHuoJieXiShiPinMiaoShu,
  duQuJieXiHuanCun,
  sheZhiShiPinJieXiHuanCun,
  huoQuFFmpegLuJing,
  xieRuJieXiHuanCun,
} from '../services/视频理解'

import crypto from 'crypto'

function suiJiSha(): string {
  return crypto.randomBytes(32).toString('hex')
}

describe('视频理解', () => {
  beforeEach(() => {
    delete process.env['SHI_PIN_JIE_XI_FFMPEG_LU_JING']
  })

  it('无ffmpeg时降级为空并缓存', async () => {
    const sha = suiJiSha()
    const jieGuo = await jieXiShiPin(sha)
    expect(jieGuo.huaMianMiaoShu).toBeNull()
    expect(jieGuo.zhuanXieWenBen).toBeNull()
    expect(await duQuJieXiHuanCun(sha)).toEqual(jieGuo)
  })

  it('非法哈希直接返回空', async () => {
    expect(await huoQuHuoJieXiShiPinMiaoShu(null)).toEqual({ huaMianMiaoShu: null, zhuanXieWenBen: null })
    expect(await huoQuHuoJieXiShiPinMiaoShu('bu-he-fa')).toEqual({ huaMianMiaoShu: null, zhuanXieWenBen: null })
  })

  it('缓存命中不再执行解析', async () => {
    const sha = suiJiSha()
    sheZhiShiPinJieXiHuanCun(sha, { huaMianMiaoShu: '海鸥', zhuanXieWenBen: null })
    let diaoYong = 0
    const jieGuo = await jieXiShiPin(sha, {
      zhiXingMingLing: async () => {
        diaoYong += 1
        return { bianMa: 0 }
      },
    })
    expect(diaoYong).toBe(0)
    expect(jieGuo.huaMianMiaoShu).toBe('海鸥')
  })

  it('ffmpeg路径缺失时huoQuFFmpegLuJing返回null', () => {
    expect(huoQuFFmpegLuJing()).toBeNull()
  })

  it('写入后可读出同一结果', async () => {
    const sha = suiJiSha()
    await xieRuJieXiHuanCun(sha, { huaMianMiaoShu: '沙滩', zhuanXieWenBen: '海浪声' })
    expect(await duQuJieXiHuanCun(sha)).toEqual({ huaMianMiaoShu: '沙滩', zhuanXieWenBen: '海浪声' })
  })
})
