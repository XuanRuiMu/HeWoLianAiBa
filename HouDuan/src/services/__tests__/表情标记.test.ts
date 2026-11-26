import { describe, expect, it } from 'vitest'
import {
  转义表情标记,
  解析表情,
  含表情标记,
  提取表情标记,
  清掉表情标记,
} from '../表情标记'

describe('表情标记解析', () => {
  it('微信表情写成 [表情:微信名称] 时转成方括号名字', () => {
    expect(转义表情标记('[表情:微信微笑]')).toBe('[微笑]')
    expect(转义表情标记('[表情:微信捂脸]')).toBe('[捂脸]')
    expect(转义表情标记('[表情:微信旺柴]')).toBe('[旺柴]')
  })

  it('emoji 表情写成 [表情:emoji名称] 时转成字符', () => {
    expect(转义表情标记('[表情:emoji开心]')).toBe('😄')
    expect(转义表情标记('[表情:emoji笑哭]')).toBe('😂')
    expect(转义表情标记('[表情:emoji爱心]')).toBe('❤️')
  })

  it('emoji 也可以直接写字符', () => {
    expect(转义表情标记('[表情:emoji😂]')).toBe('😂')
    expect(转义表情标记('[表情:emoji❤️]')).toBe('❤️')
  })

  it('表情可以夹在文字中间，也可以连着打一串', () => {
    expect(转义表情标记('今天真开心[表情:emoji大笑]')).toBe('今天真开心😆')
    expect(转义表情标记('有你真好[表情:微信玫瑰][表情:微信玫瑰][表情:微信玫瑰]')).toBe(
      '有你真好[玫瑰][玫瑰][玫瑰]',
    )
    expect(转义表情标记('[表情:微信呲牙]笑死我了')).toBe('[呲牙]笑死我了')
  })

  it('全角括号与全角冒号同样识别', () => {
    expect(转义表情标记('【表情：微信微笑】')).toBe('[微笑]')
    expect(转义表情标记('［表情：emoji开心］')).toBe('［表情：emoji开心］')
  })

  it('不带来源前缀时按名字自动判断', () => {
    expect(转义表情标记('[表情:微笑]')).toBe('[微笑]')
    expect(转义表情标记('[表情:开心]')).toBe('😄')
  })

  it('无法识别的名字原样保留，不吞掉内容', () => {
    expect(转义表情标记('[表情:微信不存在的表情]')).toBe('[表情:微信不存在的表情]')
    expect(转义表情标记('[表情:emoji不存在]')).toBe('[表情:emoji不存在]')
  })

  it('表情包标记不会被当成表情处理', () => {
    expect(转义表情标记('[表情包:狗头]')).toBe('[表情包:狗头]')
    expect(转义表情标记('[贴纸:狗头]')).toBe('[贴纸:狗头]')
  })

  it('解析结果带来源与短名', () => {
    expect(解析表情('微信微笑')).toEqual({ laiYuan: '微信', mingCheng: '微笑', tiHuan: '[微笑]' })
    expect(解析表情('emoji开心')).toEqual({ laiYuan: 'emoji', mingCheng: '开心', tiHuan: '😄' })
    expect(解析表情('微信不存在')).toBeNull()
  })

  it('含表情标记与提取表情标记', () => {
    expect(含表情标记('你好[表情:微信微笑]')).toBe(true)
    expect(含表情标记('你好')).toBe(false)
    expect(提取表情标记('[表情:微信玫瑰]和[表情:emoji开心]')).toEqual([
      { laiYuan: '微信', mingCheng: '玫瑰' },
      { laiYuan: 'emoji', mingCheng: '开心' },
    ])
  })

  it('清掉表情标记后只剩文字', () => {
    expect(清掉表情标记('今天[表情:emoji开心]真好')).toBe('今天真好')
    expect(清掉表情标记('没有标记')).toBe('没有标记')
  })

  it('空输入安全返回', () => {
    expect(转义表情标记('')).toBe('')
    expect(清掉表情标记('')).toBe('')
    expect(含表情标记('')).toBe(false)
    expect(提取表情标记('')).toEqual([])
  })
})
