import { describe, it, expect, vi } from 'vitest'

vi.mock('../../utils/debug日志', () => ({ debug日志: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

import { 剥离控制字符, 清洗玩家文本 } from '../控制字符'
import { qingLiTiJiaoKuai } from '../../services/消息内容块'
import { qingXiRenSheWenBen } from '../../services/角色生成'

/**
 * 输出安全：utils/控制字符 真源模块全量边界。
 * 口径：保留 \t 与 \n（聊天换行/制表是合理排版），\r 与其余 C0/DEL/非字符全剥。
 */

const 控制字符样本: Array<[string, string]> = [
  ['NUL', String.fromCharCode(0x00)],
  ['SOH', String.fromCharCode(0x01)],
  ['VT', String.fromCharCode(0x0b)],
  ['FF', String.fromCharCode(0x0c)],
  ['SO', String.fromCharCode(0x0e)],
  ['US', String.fromCharCode(0x1f)],
  ['DEL', String.fromCharCode(0x7f)],
  ['CR', String.fromCharCode(0x0d)],
]

describe('剥离控制字符：C0/DEL 全剥（\\t \\n 除外）', () => {
  it.each(控制字符样本)('%s 被剥', (_mingMing, ziFu) => {
    expect(剥离控制字符(`甲${ziFu}乙`)).toBe('甲乙')
  })

  it('非字符 U+FFFE / U+FFFF 被剥', () => {
    expect(剥离控制字符(`甲${String.fromCodePoint(0xfffe)}乙`)).toBe('甲乙')
    expect(剥离控制字符(`甲${String.fromCodePoint(0xffff)}乙`)).toBe('甲乙')
  })

  it('\\t 与 \\n 原样保留', () => {
    expect(剥离控制字符('第一行\n第二行')).toBe('第一行\n第二行')
    expect(剥离控制字符('列一\t列二')).toBe('列一\t列二')
    expect(剥离控制字符('\t\n')).toBe('\t\n')
  })

  it('混合正文只剥控制字符，中文与 emoji 逐字保留', () => {
    expect(剥离控制字符('abc\u0000def\u001fghi\u007fjkl')).toBe('abcdefghijkl')
    expect(剥离控制字符('表情😀与中文\u000b混排正常')).toBe('表情😀与中文混排正常')
  })

  it('空串原样返回', () => {
    expect(剥离控制字符('')).toBe('')
  })

  it('非字符串入参返回空串（不抛错）', () => {
    expect(剥离控制字符(undefined as never)).toBe('')
    expect(剥离控制字符(null as never)).toBe('')
    expect(剥离控制字符(123 as never)).toBe('')
  })
})

describe('清洗玩家文本：剥控制字符 + trim + 可选码点截断', () => {
  it('无上限时只剥字符并 trim', () => {
    expect(清洗玩家文本('  你好\u0000世界  ')).toBe('你好世界')
    expect(清洗玩家文本('保留\n换行与\t制表')).toBe('保留\n换行与\t制表')
  })

  it('超长输入按码点截断到上限', () => {
    const jieGuo = 清洗玩家文本('x'.repeat(5000), 2000)
    expect(jieGuo).toHaveLength(2000)
  })

  it('码点截断不劈 emoji 代理对', () => {
    const jieGuo = 清洗玩家文本('😀'.repeat(3000), 10)
    expect(Array.from(jieGuo)).toHaveLength(10)
    expect(jieGuo).toBe('😀'.repeat(10))
    expect(jieGuo).not.toContain('\ufffd')
  })

  it('上限为 0 时截为空串；上限大于实际长度时原样返回', () => {
    expect(清洗玩家文本('任意内容', 0)).toBe('')
    expect(清洗玩家文本('短', 100)).toBe('短')
  })

  it('非字符串入参返回空串（不抛错）', () => {
    expect(清洗玩家文本(undefined as never)).toBe('')
    expect(清洗玩家文本({} as never)).toBe('')
  })
})

describe('端到端：消息内容块文字块清洗后不含控制字符', () => {
  it('提交侧文字块剥掉控制字符，保留换行', () => {
    const jieGuo = qingLiTiJiaoKuai([
      { lei_xing: 'wenzi', nei_rong: '你好\u0000世界\u001b\u007f' },
      { lei_xing: 'wenzi', nei_rong: '第二行\n照样换行' },
    ])
    expect(jieGuo.chaoXian).toBe(false)
    expect(jieGuo.kuai.map((xiang) => xiang.nei_rong)).toEqual(['你好世界', '第二行\n照样换行'])
    for (const xiang of jieGuo.kuai) {
      expect(剥离控制字符(xiang.nei_rong ?? '')).toBe(xiang.nei_rong)
    }
  })

  it('纯控制字符文字块按空块丢弃，不落入库', () => {
    const jieGuo = qingLiTiJiaoKuai([{ lei_xing: 'wenzi', nei_rong: '\u0001\u0002\r' }])
    expect(jieGuo.kuai).toEqual([])
  })
})

describe('端到端：qingXiRenSheWenBen 输出不含控制字符', () => {
  it('人设文本剥掉控制字符，换行保留', () => {
    const jieGuo = qingXiRenSheWenBen(`姓名\u0000甲\u001b乙\r丙\n保留行`)
    expect(jieGuo).toBe('姓名甲乙丙\n保留行')
    // 幂等断言：再过一遍真源清洗应无变化，即输出不含任何控制字符
    expect(剥离控制字符(jieGuo)).toBe(jieGuo)
  })

  it('超长人设文本截断后仍不含控制字符', () => {
    const jieGuo = qingXiRenSheWenBen(`\u0001${'丁'.repeat(600)}`)
    expect(jieGuo).toHaveLength(500)
    expect(剥离控制字符(jieGuo)).toBe(jieGuo)
  })
})
