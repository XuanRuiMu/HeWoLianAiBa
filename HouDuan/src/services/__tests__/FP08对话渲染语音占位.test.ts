import { describe, expect, it, vi } from 'vitest'

vi.mock('../../数据库', () => ({
  数据库: { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) },
}))
vi.mock('../../redis', () => ({
  redis: { get: vi.fn(async () => null), setex: vi.fn(async () => 'OK') },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { zhanShiXiaoXiZhengWen } from '../对话渲染'
import type { DuiHuaLiShiXiang } from '../../types'

function zaoYuYinXiang(canShu: Partial<DuiHuaLiShiXiang> = {}): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: 'yonghu',
    fa_song_zhe_ming: '对方',
    nei_rong: '',
    shi_jian: '12:00',
    meiTiLeiBie: 'yuyin',
    meiTiShiChangHaoMiao: 3000,
    ...canShu,
  }
}

describe('FP8 语音载体在AI输入中的渲染', () => {
  it('空转写有时长时渲染语义化占位，而不是裸[语音]', () => {
    expect(zhanShiXiaoXiZhengWen(zaoYuYinXiang())).toBe('[语音(3秒)：无法识别具体内容]')
  })

  it('空转写无时长时也渲染语义化占位', () => {
    expect(zhanShiXiaoXiZhengWen(zaoYuYinXiang({ meiTiShiChangHaoMiao: null }))).toBe('[语音：无法识别具体内容]')
  })

  it('空转写但有音频事件描述时进入[语音：描述]格式并带时长后缀', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(zaoYuYinXiang(), { 音频事件描述: '一个人在唱歌，背景有吉他声' })
    expect(jieGuo).toBe('[语音：一个人在唱歌，背景有吉他声](3秒)')
  })

  it('有转写时保持[语音转写：…]格式，音频事件从转写文本提取', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(zaoYuYinXiang({ nei_rong: '今天汪汪叫了好几声' }))
    expect(jieGuo).toContain('[语音转写：今天汪汪叫了好几声]')
    expect(jieGuo).toContain('[音频事件：狗叫]')
    expect(jieGuo).toContain('(3秒)')
  })

  it('有转写时注入的音频事件描述优先于正则提取', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(zaoYuYinXiang({ nei_rong: '汪汪' }), {
      音频事件描述: 'omni描述',
    })
    expect(jieGuo).toContain('[音频事件：omni描述]')
    expect(jieGuo).not.toContain('狗叫')
  })

  it('已撤回语音仍渲染撤回占位，不受新逻辑影响', () => {
    expect(zhanShiXiaoXiZhengWen(zaoYuYinXiang({ yi_che_hui: true }))).toBe('[用户撤回了一条语音]')
  })

  it('文字消息渲染不受本次改动影响', () => {
    expect(zhanShiXiaoXiZhengWen(zaoYuYinXiang({ meiTiLeiBie: undefined, nei_rong: '在吗' }))).toBe('在吗')
  })
})
