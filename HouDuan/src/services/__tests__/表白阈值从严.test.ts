import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 源 = readFileSync(resolve(__dirname, '..', '胜利失败条件.ts'), 'utf8')

function 提取正则(源码: string): RegExp {
  const 匹配 = 源码.match(/const MingQueBiaoBaiTeZheng = \/(.+?)\//)
  if (!匹配) throw new Error('没找到表白特征正则')
  return new RegExp(匹配[1])
}

const 表白正则 = 提取正则(源)

describe('表白阈值：只有明确说出才算法定表白', () => {
  it.each([
    '我喜欢你',
    '我挺喜欢你的，做我男朋友吧',
    '我爱你',
    '和我在一起吧',
    '咱们交往吧',
    '我们谈恋爱吧',
    '你愿意做我对象吗',
    '我想和你在一起',
    '我要追你',
    '请和我交往',
  ])('明确表白「%s」应当被识别', (文本) => {
    expect(表白正则.test(文本)).toBe(true)
  })

  it.each([
    '我突然有点期待跟你见面了',
    '想约你出来吃饭',
    '下次有live可以叫上我',
    '跟你聊天挺放松的',
    '你今天心情好像特别好',
    '你这人挺有意思的，跟我想的不一样',
    '我发现我有点上头了',
    '你对我什么感觉啊',
    '我最近总想着你',
    '我挺喜欢跟你聊天的',
    '要是能常见面就好了',
    '我觉得你特别好看',
    '我有点想你了',
    '说实话我有点心动了',
  ])('亲近表达「%s」不得被误判为表白', (文本) => {
    expect(表白正则.test(文本)).toBe(false)
  })

  it('空字符串与普通闲聊都不算表白', () => {
    expect(表白正则.test('')).toBe(false)
    expect(表白正则.test('今天天气怎么样')).toBe(false)
    expect(表白正则.test('哈哈哈哈笑死我了')).toBe(false)
  })
})

describe('表白处理函数接受原文用于二次确认', () => {
  it('函数签名包含原文参数，便于做明确用语校验', () => {
    const 段 = 源.slice(源.indexOf('export async function chuLiYongHuBiaoBai'))
    const 签名 = 段.slice(0, 400)
    expect(签名).toContain('yuanWen')
  })

  it('原文不含明确表白用语时直接返回，不结束游戏', () => {
    const 段 = 源.slice(源.indexOf('export async function chuLiYongHuBiaoBai'))
    const 前  = 段.slice(0, 1200)
    expect(前).toContain('shiMingQueBiaoBai')
    expect(前).toContain('return null')
  })
})

describe('判定提示词要求从严', () => {
  it('提示词里写明了不算表白的情形', () => {
    expect(源).toContain('只是表达期待、想见面')
    expect(源).toContain('一律填 false')
  })

  it('提示词里写明了算表白的情形', () => {
    expect(源).toContain('对方直接说喜欢你、爱你')
    expect(源).toContain('要求确立关系')
  })

  it('提示词要求暗示表白只在几乎等于明说时才填', () => {
    expect(源).toContain('几乎等于明说')
  })
})
