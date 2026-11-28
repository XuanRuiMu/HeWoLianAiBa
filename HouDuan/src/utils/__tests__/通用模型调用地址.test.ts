import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../邮件告警', () => ({
  faSongGaoJing: vi.fn(async () => true),
  jiLuAIChengGong: vi.fn(),
  jiLuAIShiBai: vi.fn(),
}))

import { 获取通用模型调用, 重置通用模型调用 } from '../通用模型调用'
import { peiZhi } from '../../config'

function duJiChuZhi(客户端: unknown): string {
  return String((客户端 as { baseURL?: unknown }).baseURL ?? '')
}

describe('通用模型调用 基础地址规范化', () => {
  beforeEach(() => {
    重置通用模型调用()
  })

  it('无 /v1 的地址自动补 /v1', () => {
    process.env.MAGPIE_MO_XING_CHI_JI_CHU = ''
    peiZhi.moRenMoXing.基础地址 = 'http://127.0.0.1:3425'
    const 客户端 = 获取通用模型调用()
    expect(duJiChuZhi(客户端)).toBe('http://127.0.0.1:3425/v1')
  })

  it('已带 /v1 的地址保持不变', () => {
    process.env.MAGPIE_MO_XING_CHI_JI_CHU = ''
    peiZhi.moRenMoXing.基础地址 = 'http://127.0.0.1:3425/v1'
    const 客户端 = 获取通用模型调用()
    expect(duJiChuZhi(客户端)).toBe('http://127.0.0.1:3425/v1')
  })

  it('带斜杠结尾的 /v1 地址去尾后仍正确', () => {
    process.env.MAGPIE_MO_XING_CHI_JI_CHU = ''
    peiZhi.moRenMoXing.基础地址 = 'http://127.0.0.1:3425/v1/'
    const 客户端 = 获取通用模型调用()
    expect(duJiChuZhi(客户端)).toBe('http://127.0.0.1:3425/v1')
  })
})
