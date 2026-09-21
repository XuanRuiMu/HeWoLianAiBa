import { describe, it, expect } from 'vitest'
import { fanYi } from '../../config/translations'
import {
  通关结局枚举列表,
  失败结局枚举列表,
  结局池键一致,
  结局枚举列表,
  是否通关结局,
  结局趣味文案池,
  渲染结局池文案,
  渲染结局文案,
  解析结局文案,
  随机结局趣味文案,
} from '../结局'
import type { YouXiJieGuoLeiXing } from '../../types'

/**
 * FP-07（缺陷4）：结局趣味文案池与快照读取口径。
 *
 * 三条不可让的性质，对应下面三组用例：
 *  ① 池子覆盖 14 个结局枚举键、每键 ≥3 条，且**绝不进 `jieJu`**（迁移 030 的 CHECK 与
 *     `迁移030结局归一.test.ts` 把 `jieJu` 键集合钉成枚举真源，池子塞进去必红那条用例）。
 *  ② 他/她只走 `xingBieBianTi` 的 `{TA}` 变体机制，池子里不许硬写代词。
 *  ③ 读取侧「快照优先、缺失回退**确定性**渲染」——回退分支若随机，同一局刷新一次换一句话。
 */

const 全部池键 = [...通关结局枚举列表, ...失败结局枚举列表]

describe('结局趣味文案池覆盖全部枚举键', () => {
  it('两池键集合并后与 结局枚举列表 严格全等，且互不重叠', () => {
    expect(结局池键一致).toBe(true)
    expect([...全部池键].sort()).toEqual([...结局枚举列表].sort())
    expect(全部池键.length).toBe(结局枚举列表.length)
    expect(通关结局枚举列表.filter((键) => 失败结局枚举列表.includes(键))).toEqual([])
    expect(结局枚举列表).toHaveLength(14)
  })

  it('每个枚举键的池子 ≥3 条、每条非空且省略号收尾', () => {
    for (const 枚举 of 结局枚举列表) {
      const 池 = fanYi.jieGuoTongGuanChi[枚举 as keyof typeof fanYi.jieGuoTongGuanChi] ?? undefined
      const 另一池 =
        fanYi.jieGuoShiBaiChi[枚举 as keyof typeof fanYi.jieGuoShiBaiChi] ?? undefined
      const 句子列表: readonly string[] = (池 ?? 另一池) as readonly string[]
      expect(Array.isArray(句子列表), `${枚举} 缺文案池`).toBe(true)
      expect(句子列表.length, `${枚举} 池内少于 3 条`).toBeGreaterThanOrEqual(3)
      for (const 句子 of 句子列表) {
        expect(句子.trim().length, `${枚举} 有空句`).toBeGreaterThan(0)
        expect(句子.endsWith('...'), `${枚举} 的句子未按省略号收尾: ${句子}`).toBe(true)
      }
    }
  })

  it('池子住在独立类目里，jieJu 的 14 键一字未增', () => {
    expect(Object.keys(fanYi.jieJu)).toEqual([...结局枚举列表])
    expect(fanYi).toHaveProperty('jieGuoTongGuanChi')
    expect(fanYi).toHaveProperty('jieGuoShiBaiChi')
  })

  it('池句不硬写他/她，只允许 {TA} 占位', () => {
    for (const 枚举 of 结局枚举列表) {
      for (const 句子 of 结局趣味文案池(枚举, '未知')) {
        // 未知性别时 {TA} 代入中性 'TA'，剩下的字面里再出现 他/她 即为硬编码
        expect(句子, `未知性别却出现了硬编码代词: ${句子}`).not.toMatch(/他|她/)
      }
      const 原始 = 枚举 in fanYi.jieGuoTongGuanChi
        ? fanYi.jieGuoTongGuanChi[枚举 as keyof typeof fanYi.jieGuoTongGuanChi]
        : fanYi.jieGuoShiBaiChi[枚举 as keyof typeof fanYi.jieGuoShiBaiChi]
      for (const 句子 of 原始 as readonly string[]) {
        const 去掉占位 = 句子.replaceAll('{TA}', '')
        expect(去掉占位, `池子原文硬写了代词: ${句子}`).not.toMatch(/他|她/)
      }
    }
  })
})

describe('渲染结局池文案走 xingBieBianTi 同一套变体机制', () => {
  it('男/女/未知三态分别代入 他/她/TA', () => {
    expect(渲染结局池文案('{TA}根本没把你放在心上...', '男')).toBe('他根本没把你放在心上...')
    expect(渲染结局池文案('{TA}根本没把你放在心上...', '女')).toBe('她根本没把你放在心上...')
    expect(渲染结局池文案('{TA}根本没把你放在心上...', '未知')).toBe('TA根本没把你放在心上...')
  })

  it('多处占位全部替换', () => {
    expect(渲染结局池文案('你删了{TA}，{TA}又把你捞回来', '女')).toBe(
      '你删了她，她又把你捞回来',
    )
  })

  it('被渣型骗了的池子含用户点名的三条原句', () => {
    const 女池 = 结局趣味文案池('shi_bai_bei_qi_pian', '女')
    expect(女池).toContain('你的真心付诸东流...')
    expect(女池).toContain('她根本没把你放在心上...')
    expect(女池).toContain('她伪装得太好了...')
  })
})

describe('通关/失败分类单源于池子键集合', () => {
  it('四个 sheng_li 键全部判为通关，含此前被漏掉的 sheng_li_shen_jing_bing', () => {
    const 通关键 = 结局枚举列表.filter((枚举) => 枚举.startsWith('sheng_li'))
    expect(通关键.sort()).toEqual([...通关结局枚举列表].sort())
    expect(通关键).toContain('sheng_li_shen_jing_bing')
    for (const 枚举 of 通关键) {
      expect(是否通关结局(枚举), `${枚举} 应判通关`).toBe(true)
    }
  })

  it('失败键与进行中判为非通关', () => {
    for (const 枚举 of 失败结局枚举列表) {
      expect(是否通关结局(枚举)).toBe(false)
    }
    expect(是否通关结局('jinxing_zhong')).toBe(false)
  })
})

describe('随机结局趣味文案', () => {
  it('只在传入取池器时随机，且结果恒来自本结局的池子', () => {
    const 池 = 结局趣味文案池('shi_bai_bei_qi_pian', '女')
    const 抽中 = 随机结局趣味文案('shi_bai_bei_qi_pian', '女', (候选) => 候选[0] as string)
    expect(池).toContain(抽中)
    expect(() => 随机结局趣味文案('shi_bai_bei_qi_pian', '女')).not.toThrow()
  })

  it('进行中无池，回落空标签文案而非随机句', () => {
    expect(结局趣味文案池('jinxing_zhong', '女')).toEqual([])
    expect(随机结局趣味文案('jinxing_zhong', '女')).toBe('')
    expect(渲染结局文案('jinxing_zhong', '女')).toBe('')
  })
})

describe('解析结局文案快照优先', () => {
  it('有快照即用快照，不查池也不再随机', () => {
    expect(解析结局文案('shi_bai_bei_qi_pian', '女', '你的真心付诸东流...')).toBe(
      '你的真心付诸东流...',
    )
  })

  it('快照首尾空白被削；空串/空白/NULL 回退确定性标签', () => {
    expect(解析结局文案('shi_bai_bei_qi_pian', '女', '  你的真心付诸东流...  ')).toBe(
      '你的真心付诸东流...',
    )
    for (const 空快照 of [null, undefined, '', '   ']) {
      expect(解析结局文案('shi_bai_bei_qi_pian', '女', 空快照)).toBe('被渣女骗了')
    }
  })

  it('回退分支重复读取 50 次恒定不变（快照缺失的历史记录不得随机漂移）', () => {
    const 首次 = 解析结局文案('shi_bai_bei_qi_pian', '男', null)
    for (let 次 = 0; 次 < 50; 次 += 1) {
      expect(解析结局文案('shi_bai_bei_qi_pian', '男', null)).toBe(首次)
    }
    expect(首次).toBe('被渣男骗了')
  })

  it('快照与当前性别渲染结果不同也照快照返回（他/她以结算那一刻为准）', () => {
    expect(解析结局文案('shi_bai_bei_qi_pian', '男', '她伪装得太好了...')).toBe('她伪装得太好了...')
  })
})

type 枚举池映射 = Partial<Record<YouXiJieGuoLeiXing, readonly string[]>>

describe('抽取分布（离线可复算的抽样模型）', () => {
  it('200 次抽取里每个结局键都能覆盖到池内 ≥3 种句', () => {
    const 命中: 枚举池映射 = {}
    for (const 枚举 of 结局枚举列表) {
      const 池 = 结局趣味文案池(枚举, '未知')
      const 集 = new Set<string>()
      for (let 次 = 0; 次 < 200; 次 += 1) 集.add(随机结局趣味文案(枚举, '未知'))
      命中[枚举] = [...集]
      expect(集.size, `${枚举} 200 次抽取只出现 ${集.size} 种`).toBeGreaterThanOrEqual(3)
      for (const 句 of 集) expect(池).toContain(句)
    }
    expect(Object.keys(命中).length).toBe(14)
  })
})
