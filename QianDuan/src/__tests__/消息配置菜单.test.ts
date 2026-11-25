import { describe, expect, it } from 'vitest'
import {
  LiaoTianYouJianCaiDanPeiZhi,
  huoQuCaiDanLeiXing,
  huoQuYuanShiCaiDanXiang,
  shiWeiXianCaiDanXiang,
} from '@/config/消息配置'

describe('消息长按菜单配置', () => {
  it('文本菜单在引用后撤回前包含加入反馈', () => {
    const xiang = [...huoQuYuanShiCaiDanXiang('wenBen')]
    expect(xiang).toContain('jieRuFanKui')
    expect(xiang.indexOf('jieRuFanKui')).toBeGreaterThan(xiang.indexOf('yinYong'))
    expect(xiang.indexOf('jieRuFanKui')).toBeLessThan(xiang.indexOf('cheHui'))
  })

  it('语音菜单包含加入反馈', () => {
    expect(huoQuYuanShiCaiDanXiang('yuYin')).toContain('jieRuFanKui')
  })

  it('图片菜单包含加入反馈', () => {
    expect(huoQuYuanShiCaiDanXiang('tuPian')).toContain('jieRuFanKui')
  })

  it('表情包菜单包含加入反馈', () => {
    expect(huoQuYuanShiCaiDanXiang('biaoQingBao')).toContain('jieRuFanKui')
  })

  it('默认撤回菜单不含加入反馈', () => {
    expect(huoQuYuanShiCaiDanXiang('cheHui')).toEqual(['cheHui'])
  })

  it('加入反馈不是危险菜单项', () => {
    expect(shiWeiXianCaiDanXiang('jieRuFanKui')).toBe(false)
    expect(shiWeiXianCaiDanXiang('yiChuFanKui')).toBe(false)
    expect(shiWeiXianCaiDanXiang('cheHui')).toBe(true)
  })

  it('消息类型映射保持原行为', () => {
    expect(huoQuCaiDanLeiXing('wenben')).toBe('wenBen')
    expect(huoQuCaiDanLeiXing('tuPian')).toBe('tuPian')
    expect(huoQuCaiDanLeiXing('biaoQingBao')).toBe('biaoQingBao')
    expect(huoQuCaiDanLeiXing('yuYin')).toBe('yuYin')
    expect(huoQuCaiDanLeiXing('xitong')).toBe('cheHui')
  })

  it('四类菜单数组都只新增了加入反馈一项', () => {
    expect(LiaoTianYouJianCaiDanPeiZhi.wenBenCaiDanXiang).toEqual([
      'fuZhi',
      'fanYi',
      'yinYong',
      'jieRuFanKui',
      'cheHui',
    ])
    expect(LiaoTianYouJianCaiDanPeiZhi.yuYinCaiDanXiang).toEqual([
      'yuYinZhuanWenZi',
      'yinYong',
      'jieRuFanKui',
      'cheHui',
    ])
  })
})
