import { describe, expect, it } from 'vitest'
import { guJiTokenShu, guJiZiFuShu, ziFuShuZhuanTokenShu } from '../token估算'

describe('token 口径统一估算（W3-B）', () => {
  it('空串与空值返回 0', () => {
    expect(guJiTokenShu('')).toBe(0)
    expect(guJiZiFuShu('')).toBe(0)
    expect(ziFuShuZhuanTokenShu(0)).toBe(0)
    expect(ziFuShuZhuanTokenShu(-5)).toBe(0)
    expect(ziFuShuZhuanTokenShu(Number.NaN)).toBe(0)
  })

  it('纯中文按字符数乘 0.6 上取整', () => {
    expect(guJiZiFuShu('火锅麻辣烫')).toBe(5)
    expect(guJiTokenShu('火锅')).toBe(2)
    expect(guJiTokenShu('火锅麻辣')).toBe(3)
    expect(guJiTokenShu('啊'.repeat(100))).toBe(60)
    expect(guJiTokenShu('啊'.repeat(101))).toBe(61)
  })

  it('纯英文按字符数乘 0.6 上取整', () => {
    expect(guJiZiFuShu('hello')).toBe(5)
    expect(guJiTokenShu('hello')).toBe(3)
    expect(guJiTokenShu('hello world')).toBe(7)
    expect(guJiTokenShu('a')).toBe(1)
  })

  it('emoji 按码元计字符且向上取整', () => {
    expect(guJiZiFuShu('😀')).toBe(2)
    expect(guJiTokenShu('😀')).toBe(2)
    expect(guJiTokenShu('😀😀')).toBe(3)
  })

  it('中英混合与标点混合统一按字符总长折算', () => {
    const hunHe = '今天ok！😀'
    expect(guJiZiFuShu(hunHe)).toBe(hunHe.length)
    expect(guJiTokenShu(hunHe)).toBe(Math.ceil(hunHe.length * 0.6))
    expect(guJiTokenShu('，。！？')).toBe(3)
  })
})
