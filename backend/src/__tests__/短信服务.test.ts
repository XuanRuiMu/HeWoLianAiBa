import { describe, it, expect, vi } from 'vitest'
import { shengChengSuiJiYanZhengMa } from '../services/短信'

describe('FP-11 C-1 短信验证码生成使用 crypto.randomInt', () => {
  it('生成的验证码为 6 位数字字符串', () => {
    const yanZhengMa = shengChengSuiJiYanZhengMa()
    expect(yanZhengMa).toMatch(/^\d{6}$/)
    expect(Number(yanZhengMa)).toBeGreaterThanOrEqual(100000)
    expect(Number(yanZhengMa)).toBeLessThan(1000000)
  })

  it('多次生成的验证码不相同（验证随机性）', () => {
    const ma1 = shengChengSuiJiYanZhengMa()
    const ma2 = shengChengSuiJiYanZhengMa()
    const ma3 = shengChengSuiJiYanZhengMa()
    const ma4 = shengChengSuiJiYanZhengMa()
    const ma5 = shengChengSuiJiYanZhengMa()

    expect(ma1).not.toBe(ma2)
    expect(ma1).not.toBe(ma3)
    expect(ma1).not.toBe(ma4)
    expect(ma1).not.toBe(ma5)
  })

  it('不使用 Math.random（源码检查）', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.resolve(__dirname, '../services/短信.ts')
    const sourceCode = fs.readFileSync(filePath, 'utf-8')

    expect(sourceCode).not.toContain('Math.random()')
    expect(sourceCode).toContain('crypto.randomInt')
  })
})