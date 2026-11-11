import { describe, expect, it, vi } from 'vitest'

const 数据库桩 = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock('../../数据库', () => ({ 数据库: 数据库桩 }))

const { yanZhengShouJiHaoGeShi } = await import('../认证')
const { 验证手机号 } = await import('../../middleware/输入验证')

describe('手机号格式校验按归一化后的国际号判定', () => {
  it('本地11位大陆号码视为合法（发码与找回密码的既有调用形态）', () => {
    expect(yanZhengShouJiHaoGeShi('16600001234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('13800000000')).toBe(true)
  })

  it('带分隔符与区号前缀的号码仍合法', () => {
    expect(yanZhengShouJiHaoGeShi('166 0000 1234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('+86 166 0000 1234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('+8616600001234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('+85298765432')).toBe(true)
  })

  it('中文输入法的全角括号、全角加减号与各类连字符都能清洗', () => {
    expect(yanZhengShouJiHaoGeShi('166（）00001234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('（166）00001234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('166－00001234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('＋8616600001234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('166–0000–1234')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('+86（166）00001234')).toBe(true)
  })

  it('垃圾输入与空串一律拒绝', () => {
    expect(yanZhengShouJiHaoGeShi('')).toBe(false)
    expect(yanZhengShouJiHaoGeShi('12345')).toBe(false)
    expect(yanZhengShouJiHaoGeShi('abcdefghij')).toBe(false)
    expect(yanZhengShouJiHaoGeShi('+86123')).toBe(false)
  })

  it('中间件手机号护栏接受本地与国际两种形态', () => {
    expect(验证手机号('13800000000')).toBe(true)
    expect(验证手机号('+8613800000001')).toBe(true)
    expect(验证手机号(12345)).toBe(false)
    expect(验证手机号(undefined)).toBe(false)
    expect(验证手机号('')).toBe(false)
  })

  it('两层防线：中间件浅检放行的伪号由服务层深度校验拒绝', () => {
    expect(验证手机号('12345')).toBe(true)
    expect(yanZhengShouJiHaoGeShi('12345')).toBe(false)
  })
})
