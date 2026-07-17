import { describe, it, expect } from 'vitest'
import { AI_PEI_ZHI, AIMoXingLeiXing } from '../config/AI配置'

const QI_WANG_MO_XING = 'deepseek-v4-pro'

describe('FP-04 AI模型配置', () => {
  it('顶层 deepSeek.moXing → 等于 deepseek-v4-pro', () => {
    expect(AI_PEI_ZHI.deepSeek.moXing).toBe(QI_WANG_MO_XING)
  })

  it('moXing 下所有子配置的 moXing 字段 → 等于 deepseek-v4-pro', () => {
    const moXingLeiXingLieBiao = Object.keys(AI_PEI_ZHI.moXing) as AIMoXingLeiXing[]
    expect(moXingLeiXingLieBiao.length).toBeGreaterThan(0)

    for (const leiXing of moXingLeiXingLieBiao) {
      const canShu = AI_PEI_ZHI.moXing[leiXing]
      expect(canShu.moXing, `模型类型 ${leiXing} 的 moXing 应为 ${QI_WANG_MO_XING}`).toBe(QI_WANG_MO_XING)
    }
  })
})
