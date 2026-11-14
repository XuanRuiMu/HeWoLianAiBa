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

import { ZaiTiBiaoJiShuoMing, zhanShiXiaoXiZhengWen } from '../对话渲染'
import { biaoQingBaoZhanShiWenBen, meiTiZhanShiWenBen } from '../AI视觉辅助'
import type { DuiHuaLiShiXiang } from '../../types'

function zaoXiang(canShu: Partial<DuiHuaLiShiXiang> = {}): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: 'jiaose',
    fa_song_zhe_ming: '对方',
    nei_rong: '',
    shi_jian: '12:00',
    ...canShu,
  }
}

describe('A5 表情包在历史上下文里带短名', () => {
  it('AI 发的表情包由内容解析出短名，渲染成带短名的载体标记', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(zaoXiang({ nei_rong: '[贴纸:熊猫头无语]' }))
    expect(jieGuo).toBe('[表情包:熊猫头无语]')
  })

  it('用户发来的表情包没有短名时保持裸载体标记', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(
      zaoXiang({ fa_song_zhe_lei_xing: 'yonghu', nei_rong: '', meiTiLeiBie: 'biaoqingshu' }),
    )
    expect(jieGuo).toBe('[表情包]')
  })

  it('表情包媒体类别存在且内容带短名时同样带短名', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(
      zaoXiang({ fa_song_zhe_lei_xing: 'yonghu', nei_rong: '[贴纸:熊猫头无语]', meiTiLeiBie: 'biaoqingshu' }),
    )
    expect(jieGuo).toBe('[表情包:熊猫头无语]')
  })

  it('撤回表情包仍走撤回文案，不暴露短名', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(
      zaoXiang({ fa_song_zhe_lei_xing: 'yonghu', yi_che_hui: true, meiTiLeiBie: 'biaoqingshu' }),
    )
    expect(jieGuo).toBe('[用户撤回了一个表情包]')
  })

  it('混排文字里的贴纸标记不被当成纯表情包改写', () => {
    const jieGuo = zhanShiXiaoXiZhengWen(zaoXiang({ fa_song_zhe_lei_xing: 'yonghu', nei_rong: '[贴纸:熊猫头无语]在吗' }))
    expect(jieGuo).toBe('[贴纸:熊猫头无语]在吗')
  })

  it('普通文字消息渲染保持原样', () => {
    expect(zhanShiXiaoXiZhengWen(zaoXiang({ fa_song_zhe_lei_xing: 'yonghu', nei_rong: '在吗' }))).toBe('在吗')
  })

  it('载体标记说明补上短名含义，仍禁止把标记当梗引用', () => {
    expect(ZaiTiBiaoJiShuoMing).toContain('短名')
    expect(ZaiTiBiaoJiShuoMing).toContain('不许拿它们当梗')
  })
})

describe('A5 表情包展示文案函数', () => {
  it('纯贴纸内容返回带短名的展示文案', () => {
    expect(biaoQingBaoZhanShiWenBen('[贴纸:熊猫头无语]')).toBe('[表情包:熊猫头无语]')
  })

  it('非纯贴纸与非字符串内容不返回改写结果', () => {
    expect(biaoQingBaoZhanShiWenBen('')).toBeNull()
    expect(biaoQingBaoZhanShiWenBen('[贴纸:熊猫头无语]在吗')).toBeNull()
    expect(biaoQingBaoZhanShiWenBen(null)).toBeNull()
    expect(biaoQingBaoZhanShiWenBen(undefined)).toBeNull()
  })

  it('媒体展示函数据短名走表情包文案', () => {
    expect(meiTiZhanShiWenBen('biaoqingshu', { neiRong: '[贴纸:熊猫头无语]' })).toBe(
      '[表情包:熊猫头无语]',
    )
    expect(meiTiZhanShiWenBen('biaoqingshu', { neiRong: '' })).toBe('[表情包]')
  })
})
