import { describe, expect, it } from 'vitest'
import { 计算TTS概率 } from '../TTS概率计算'
import { 转换TTS文本 } from '../TTS文本预处理'

const 角色 = (ie_lei_xing: 'I' | 'E', xing_ge: string, yan_yu_feng_ge: string, xing_wei_te_dian = '') => ({
  id: '角色',
  ie_lei_xing,
  xing_ge,
  yan_yu_feng_ge,
  xing_wei_te_dian,
})

describe('TTS概率与文本预处理业务分支', () => {
  it('概率覆盖无关系、I/E、人设冷热、禁用、加成、边界和触发', () => {
    const 基础 = 计算TTS概率({ 角色: 角色('I', '普通', '普通') as never, 好感度: null, 随机数: 0.5 })
    expect(基础.详情.关系阶段系数).toBe(1)
    expect(基础.概率).toBeGreaterThanOrEqual(0)
    expect(基础.概率).toBeLessThanOrEqual(1)
    expect(计算TTS概率({ 角色: 角色('E', '热情活泼', '外向') as never, 好感度: { guan_xi_jie_duan: 'reLian' } as never, 随机数: 0.99 }).详情.人设系数).toBeGreaterThan(1)
    expect(计算TTS概率({ 角色: 角色('I', '高冷内向', '寡言') as never, 好感度: { guan_xi_jie_duan: 'lengDan' } as never, 随机数: 0 }).详情.人设系数).toBeLessThan(1)
    const 禁用 = 计算TTS概率({ 角色: 角色('I', '普通', '普通') as never, 好感度: null, 策略: { hui_fu_ce_lue: '代码', qing_gan_fen_xi: '', yong_hu_yi_tu: '' } as never, 随机数: 0 })
    expect(禁用.是否触发).toBe(false)
    expect(禁用.详情.禁用).toBe(true)
    const 加成 = 计算TTS概率({ 角色: 角色('E', '普通', '普通') as never, 好感度: null, 策略: { hui_fu_ce_lue: '表白', qing_gan_fen_xi: '', yong_hu_yi_tu: '' } as never, 随机数: 0.99 })
    expect(加成.详情.场景系数).toBeGreaterThan(1)
    expect(计算TTS概率({ 角色: 角色('E', '普通', '普通') as never, 好感度: null, 随机数: 0 }).是否触发).toBe(true)
  })

  it('文本转换覆盖空值、数字、缩写、停顿、重复人称、自称和语气词', () => {
    expect(转换TTS文本('')).toBe('')
    expect(转换TTS文本('   ')).toBe('')
    const 结果 = 转换TTS文本('2024年AI API，HTTPS JSON C++；我是我是，作为AI助手，你你你！！！')
    expect(结果).toContain('二零二四年')
    expect(结果).toContain('A I')
    expect(结果).toContain('A P I')
    expect(结果).toContain('H T T P S')
    expect(结果).toContain('J S O N')
    expect(结果).toContain('C++')
    expect(() => 转换TTS文本('C++')).not.toThrow()
    expect(结果).toContain('，<#0.5#>')
    expect(结果).toContain('；<#0.8#>')
    expect(结果).toContain('我是')
    expect(结果).not.toContain('作为AI')
    expect(结果).not.toContain('你你你')
    expect(转换TTS文本('你好呢~')).toContain('呢')
  })
})
