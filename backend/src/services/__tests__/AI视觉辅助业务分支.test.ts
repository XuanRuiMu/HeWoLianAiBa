import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ readFile: vi.fn(), benDiLuJing: vi.fn() }))

vi.mock('fs', () => ({ default: { promises: { readFile: 假.readFile } } }))
vi.mock('../媒体存储', () => ({ huoQuBenDiLuJing: 假.benDiLuJing }))

import { gouJianDanTiaoTuXiangKuai, meiTiZhanShiWenBen, shiShiPinNeiRong, shiTuXiangLeiBie } from '../AI视觉辅助'

beforeEach(() => {
  vi.clearAllMocks()
  假.benDiLuJing.mockReturnValue('C:/media/image.png')
  假.readFile.mockResolvedValue(Buffer.from('image'))
})

describe('AI视觉辅助业务分支', () => {
  it('识别视频、图片类型并渲染所有媒体占位符', () => {
    expect(shiShiPinNeiRong('VIDEO/MP4')).toBe(true)
    expect(shiShiPinNeiRong(null, 'clip.MOV')).toBe(true)
    expect(shiShiPinNeiRong(null, 'clip.txt')).toBe(false)
    expect(shiShiPinNeiRong(null, null)).toBe(false)
    expect(shiTuXiangLeiBie('tupian')).toBe(true)
    expect(shiTuXiangLeiBie('biaoqingshu')).toBe(true)
    expect(shiTuXiangLeiBie('yin')).toBe(false)
    expect(meiTiZhanShiWenBen(null)).toBeNull()
    expect(meiTiZhanShiWenBen('tupian')).toBe('[图片]')
    expect(meiTiZhanShiWenBen('tupian', { yiCheHui: true })).toBe('[用户撤回了一张图片]')
    expect(meiTiZhanShiWenBen('biaoqingshu')).toBe('[表情包]')
    expect(meiTiZhanShiWenBen('biaoqingshu', { yiCheHui: true })).toBe('[用户撤回了一个表情包]')
    expect(meiTiZhanShiWenBen('yuyin', { yiCheHui: true })).toBe('[用户撤回了一条语音]')
    expect(meiTiZhanShiWenBen('yuyin')).toBe('[语音]')
    expect(meiTiZhanShiWenBen('yuyin', { shiChangHaoMiao: 1500 })).toBe('[语音(2秒)]')
    expect(meiTiZhanShiWenBen('yuyin', { shiChangHaoMiao: Number.NaN })).toBe('[语音]')
    expect(meiTiZhanShiWenBen('wenjian', { yiCheHui: true, mime: 'video/mp4' })).toBe('[用户撤回了一个视频]')
    expect(meiTiZhanShiWenBen('wenjian', { yiCheHui: true, yuanShiWenJianMing: 'a.txt' })).toBe('[用户撤回了一个文件]')
    expect(meiTiZhanShiWenBen('wenjian', { mime: 'video/mp4', shiChangHaoMiao: 2000 })).toBe('[视频(2秒)]')
    expect(meiTiZhanShiWenBen('wenjian', { mime: 'video/mp4' })).toBe('[视频]')
    expect(meiTiZhanShiWenBen('wenjian', { yuanShiWenJianMing: 'a.txt' })).toBe('[文件:a.txt]')
    expect(meiTiZhanShiWenBen('未知')).toBeNull()
  })

  it('图片块覆盖类型、撤回、缺元数据、路径和读取失败', async () => {
    const 基础 = { fa_song_zhe_lei_xing: 'yonghu' as const, fa_song_zhe_ming: '用户', nei_rong: '', shi_jian: '时间' }
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'yin' })).resolves.toEqual([])
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'tupian', yi_che_hui: true })).resolves.toEqual([])
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'tupian' })).resolves.toEqual([])
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'tupian', meiTiSha256: 'sha' })).resolves.toEqual([])
    假.benDiLuJing.mockReturnValueOnce('')
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'tupian', meiTiSha256: 'sha', meiTiMIME: 'image/png' })).resolves.toEqual([])
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'tupian', meiTiSha256: 'sha', meiTiMIME: 'image/png' })).resolves.toEqual([
      { type: 'input_text', text: '上面那条图片标记的本体（同一条消息，不是对方另外又发的）' },
      { type: 'input_image', image_url: 'data:image/png;base64,aW1hZ2U=', detail: 'low' },
    ])
    假.readFile.mockRejectedValueOnce(new Error('missing'))
    await expect(gouJianDanTiaoTuXiangKuai({ ...基础, meiTiLeiBie: 'biaoqingshu', meiTiSha256: 'sha', meiTiMIME: 'image/gif' })).resolves.toEqual([])
  })
})
