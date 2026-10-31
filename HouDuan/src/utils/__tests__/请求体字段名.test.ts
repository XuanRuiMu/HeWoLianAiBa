import { describe, it, expect } from 'vitest'
import { GouJianQingQiuShuRu } from '../DeepSeek客户端'

describe('Responses API 请求体字段名', () => {
  it('对话内容必须落在 content 上', () => {
    const 结果 = GouJianQingQiuShuRu([{ jiaoSe: 'user', neiRong: '你好' }])
    expect(结果).toEqual([{ role: 'user', content: '你好' }])
  })

  it('不得出现 neiRong 这个键（接口要 content，写错就是全站 422）', () => {
    const 结果 = GouJianQingQiuShuRu([{ jiaoSe: 'system', neiRong: '规则' }])
    expect(Object.keys(结果[0])).toEqual(['role', 'content'])
  })

  it('图片等多段内容原样透传，不做字符串化', () => {
    const 多段 = [{ type: 'input_text', text: '看这张' }]
    const 结果 = GouJianQingQiuShuRu([{ jiaoSe: 'user', neiRong: 多段 }])
    expect(结果[0].content).toBe(多段)
  })

  it('多轮消息逐条映射，角色不串位', () => {
    const 结果 = GouJianQingQiuShuRu([
      { jiaoSe: 'system', neiRong: 'a' },
      { jiaoSe: 'user', neiRong: 'b' },
      { jiaoSe: 'assistant', neiRong: 'c' },
    ])
    expect(结果.map((x) => x.role)).toEqual(['system', 'user', 'assistant'])
    expect(结果.map((x) => x.content)).toEqual(['a', 'b', 'c'])
  })
})
