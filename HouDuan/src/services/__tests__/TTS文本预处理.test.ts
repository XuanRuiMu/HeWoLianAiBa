import { describe, expect, it } from 'vitest'
import { 转换TTS文本 } from '../TTS文本预处理'

describe('TTS 文本的贴纸兜底清洗', () => {
  it('合法标记被剥除，读稿不含贴纸字样与括号', () => {
    const jieGuo = 转换TTS文本('无语[贴纸:熊猫头无语]我跟你说')
    expect(jieGuo).not.toContain('贴纸')
    expect(jieGuo).not.toContain('[')
    expect(jieGuo).not.toContain(']')
    expect(jieGuo).toContain('无语')
    expect(jieGuo).toContain('我跟你说')
  })

  it('漏网的非标准形态也被第二道清洗剥除', () => {
    const jieGuo = 转换TTS文本('(贴纸:狗头)今天天气不错')
    expect(jieGuo).not.toContain('贴纸')
    expect(jieGuo).toContain('今天天气不错')
    const jianKuo = 转换TTS文本('你看<贴纸:笑哭>这个')
    expect(jianKuo).not.toContain('贴纸')
    expect(jianKuo).toContain('这个')
  })

  it('只有标记时输出为空串', () => {
    expect(转换TTS文本('[贴纸:狗头]')).toBe('')
    expect(转换TTS文本('【表情包:狗头】')).toBe('')
  })

  it('没有标记的普通文本原样保留语义', () => {
    const jieGuo = 转换TTS文本('今天想去看3场电影')
    expect(jieGuo).toContain('今天想去看三场电影')
  })
})
