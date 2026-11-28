import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { 生成幂等键, 校验回显 } = require('./模拟工具.cjs')

describe('模拟工具', () => {
  it('20 轮幂等键全部唯一，且包含会话标识', () => {
    const 键集合 = new Set()
    for (let i = 1; i <= 20; i += 1) {
      键集合.add(生成幂等键('20261127-120000', 'E局', i, 'JSF0EA85'))
    }
    expect(键集合.size).toBe(20)
    expect(生成幂等键('R', 'E局', 1, 'S1')).not.toBe(生成幂等键('R', 'E局', 1, 'S2'))
    expect(生成幂等键('R', 'E局', 1, 'S1')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('回显校验：正文一致且序号递增才算成功', () => {
    const 响应 = { data: { shu_ju: { nei_rong: '你好', ke_hu_duan_xu_hao: 3, id: 'm-1' } } }
    expect(校验回显('你好', 2, 响应).一致).toBe(true)
    expect(校验回显('旧消息', 2, 响应).一致).toBe(false)
    expect(校验回显('你好', 3, 响应).一致).toBe(false)
  })

  it('回显校验：支持中文键名并容忍缺字段', () => {
    const 响应 = { 数据: { shu_ju: { nei_rong: '在吗', ke_hu_duan_xu_hao: 2, id: 'm-2' } } }
    expect(校验回显('在吗', 1, 响应).一致).toBe(true)
    const 缺失 = 校验回显('在吗', 1, { data: { shu_ju: {} } })
    expect(缺失.一致).toBe(false)
    expect(缺失.回显序号).toBe(-1)
  })
})
