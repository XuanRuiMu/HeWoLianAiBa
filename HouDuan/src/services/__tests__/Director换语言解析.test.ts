import { describe, expect, it } from 'vitest'
import { jieXiDirectorXiangYing } from '../Director'

describe('Director 解析要求换语言', () => {
  it('中文键能解析出合法语言代码', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 要求换语言: 'en' }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.yao_qiu_huan_yu_yan).toBe('en')
  })

  it('拼音键同样能解析', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ yao_qiu_huan_yu_yan: 'zh' }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.yao_qiu_huan_yu_yan).toBe('zh')
  })

  it('没给这个字段时是 undefined，不是 null', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 是否回复: true }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.yao_qiu_huan_yu_yan).toBeUndefined()
  })

  it('显式 null 表示撤销强制语言', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 要求换语言: null }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.yao_qiu_huan_yu_yan).toBeNull()
  })

  it('不在白名单的语言值被丢弃', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 要求换语言: 'xx' }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.yao_qiu_huan_yu_yan).toBeUndefined()
  })

  it('空字符串按没给处理', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 要求换语言: '   ' }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.yao_qiu_huan_yu_yan).toBeUndefined()
  })
})

describe('Director 解析不回的理由', () => {
  it.each(['对话收尾', '对方冒犯', '对方刷屏', '不想聊', '状态很差', '没什么可回'])('%s 在白名单内会被原样带出', (liYou) => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 不回的理由: liYou }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.bu_hui_li_you).toBe(liYou)
  })

  it('白名单外的值归为「没有」', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 不回的理由: '随便编一个' }))
    expect(jieGuo.ceLue.bu_hui_li_you).toBe('没有')
  })

  it('没给该字段时默认「没有」', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 是否回复: true }))
    expect(jieGuo.ceLue.bu_hui_li_you).toBe('没有')
  })
})
