import { describe, expect, it } from 'vitest'
import { qieGeXiaoXi } from '../AI引擎'

describe('消息条数截断（表情包不占文字名额）', () => {
  it('表情包在首位且条数上限1时，仍保留一条文字（R16 真实故障）', () => {
    const 输入 = [
      '[表情包:喽喽得意2]',
      '我可不保证人人都有我这么有趣',
      '在意就在意吧，这条我记下了',
      '不过别急着定性，你的观察期还没结束呢',
    ]
    const 结果 = qieGeXiaoXi(输入, 1)
    expect(结果).toContain('[表情包:喽喽得意2]')
    expect(结果.some((条) => !条.startsWith('[表情包:'))).toBe(true)
    expect(结果.length).toBeLessThanOrEqual(2)
  })

  it('上限2时保留两条文字，不因表情包挤掉名额', () => {
    const 输入 = ['[表情包:笑]', '第一句', '第二句', '第三句']
    const 结果 = qieGeXiaoXi(输入, 2)
    expect(结果.filter((条) => !条.startsWith('[表情包:'))).toHaveLength(2)
    expect(结果).toContain('[表情包:笑]')
  })

  it('纯表情包输出不强行添加文字', () => {
    const 结果 = qieGeXiaoXi(['[表情包:笑]', '[表情包:哭]'], 1)
    expect(结果).toHaveLength(2)
    expect(结果.every((条) => 条.startsWith('[表情包:'))).toBe(true)
  })

  it('上限0时返回空', () => {
    expect(qieGeXiaoXi(['文字'], 0)).toEqual([])
  })

  it('普通多条文字按上限截断', () => {
    expect(qieGeXiaoXi(['甲', '乙', '丙'], 2)).toEqual(['甲', '乙'])
  })

  it('空数组不崩溃', () => {
    expect(qieGeXiaoXi([], 3)).toEqual([])
  })

  it('带空格的纯表情包行也识别为表情包', () => {
    const 结果 = qieGeXiaoXi(['  [表情包:笑]  ', '正文'], 1)
    expect(结果.some((条) => 条.includes('正文'))).toBe(true)
  })
})
