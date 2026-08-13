import { describe, it, expect } from 'vitest'
import { AI_PEI_ZHI, AIMoXingLeiXing } from '../config/AI配置'

const QI_WANG_MO_XING = 'deepseek-v4-flash'

describe('FP-04 AI模型配置', () => {
  it('顶层 deepSeek.moXing → 等于 deepseek-v4-flash', () => {
    expect(AI_PEI_ZHI.deepSeek.moXing).toBe(QI_WANG_MO_XING)
  })

  it('moXing 下所有子配置的 moXing 字段 → 等于 deepseek-v4-flash', () => {
    const moXingLeiXingLieBiao = Object.keys(AI_PEI_ZHI.moXing) as AIMoXingLeiXing[]
    expect(moXingLeiXingLieBiao.length).toBeGreaterThan(0)

    for (const leiXing of moXingLeiXingLieBiao) {
      const canShu = AI_PEI_ZHI.moXing[leiXing]
      expect(canShu.moXing, `模型类型 ${leiXing} 的 moXing 应为 ${QI_WANG_MO_XING}`).toBe(QI_WANG_MO_XING)
    }
  })

  it('moXing 下所有子配置 → 参数完整（wenDu/zuiDaTokens/siKaoMoShi/xiangYingGeShi）且无旧字段残留', () => {
    const moXingLeiXingLieBiao = Object.keys(AI_PEI_ZHI.moXing) as AIMoXingLeiXing[]
    for (const leiXing of moXingLeiXingLieBiao) {
      const canShu = AI_PEI_ZHI.moXing[leiXing]
      expect(typeof canShu.wenDu, `${leiXing}.wenDu 必须为数字`).toBe('number')
      expect(canShu.wenDu, `${leiXing}.wenDu 必须在 [0,2]`).toBeGreaterThanOrEqual(0)
      expect(canShu.wenDu, `${leiXing}.wenDu 必须在 [0,2]`).toBeLessThanOrEqual(2)
      expect(canShu.zuiDaTokens, `${leiXing}.zuiDaTokens 必须配置`).toBeGreaterThan(0)
      expect(
        typeof canShu.top_p === 'number' && canShu.top_p > 0 && canShu.top_p <= 1,
        `${leiXing}.top_p 必须为 0~1 的数字`,
      ).toBe(true)
      expect(['enabled', 'disabled'], `${leiXing}.siKaoMoShi 必须为 enabled/disabled`).toContain(canShu.siKaoMoShi)
      const canShuYuanShi = canShu as unknown as Record<string, unknown>
      expect(canShuYuanShi.enableThinking, `${leiXing} 残留旧字段 enableThinking`).toBeUndefined()
      // reasoningEffort 为当前官方 Responses API 字段（思考强度，取值 none/minimal/low/medium/high/xhigh/max）
      // 仅在启用思考（siKaoMoShi=enabled）时必填；关闭思考的配置可不带该字段
      if (canShuYuanShi.reasoningEffort !== undefined) {
        expect(
          ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(
            canShuYuanShi.reasoningEffort as string,
          ),
          `${leiXing}.reasoningEffort 必须为合法思考强度`,
        ).toBe(true)
      }
      if (canShu.xiangYingGeShi) {
        expect(['json_object', 'text'], `${leiXing}.xiangYingGeShi.type 非法`).toContain(canShu.xiangYingGeShi.type)
      }
    }
  })
})
