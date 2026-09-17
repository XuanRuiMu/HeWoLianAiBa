import { describe, it, expect } from 'vitest'
import { AI_PEI_ZHI } from '../config/AI配置'
import type { AIMoXingLeiXing } from '../config/AI配置'

describe('FP-22 M1 Effort分级策略', () => {
  const panDingJianCeLei: AIMoXingLeiXing[] = [
    'qingGanFenXi',
    'haoGanDuPingPan',
    'guanJianShiJian',
    'biaoBaiJianCe',
    'huShanJianCe',
    'shiPoJianCe',
    'jieShouBiaoBaiJianCe',
    'shenJingBingJianCe',
    'anQuanShenHe',
  ]

  it('判定/检测/评判类 → siKaoMoShi=disabled 且无 reasoningEffort（仅需 JSON 输出，省思考成本）', () => {
    for (const leiXing of panDingJianCeLei) {
      const canShu = AI_PEI_ZHI.moXing[leiXing]
      expect(canShu.siKaoMoShi, `${leiXing} 应禁用思考模式`).toBe('disabled')
      expect(canShu.reasoningEffort, `${leiXing} 不应有 reasoningEffort`).toBeUndefined()
      expect(canShu.xiangYingGeShi?.type, `${leiXing} 必须输出 JSON`).toBe('json_object')
    }
  })

  it('Director/Writer → 维持 siKaoMoShi=enabled；writer=max 其余 medium（FP-05 YH-041 裁决）', () => {
    const director = AI_PEI_ZHI.moXing.director
    expect(director.siKaoMoShi).toBe('enabled')
    expect(director.reasoningEffort).toBe('medium')

    const writer = AI_PEI_ZHI.moXing.writer
    expect(writer.siKaoMoShi).toBe('enabled')
    expect(writer.reasoningEffort).toBe('max')
  })

  it('军师求助 → siKaoMoShi=enabled 且 reasoningEffort=medium', () => {
    const junShi = AI_PEI_ZHI.moXing.junShiQiuZhu
    expect(junShi.siKaoMoShi).toBe('enabled')
    expect(junShi.reasoningEffort).toBe('medium')
  })

  it('生成类模型 → 维持 siKaoMoShi=enabled 且 reasoningEffort=medium（FP-05 YH-041 裁决，writer 外）', () => {
    const shengChengLei: AIMoXingLeiXing[] = [
      'jiYiZhaiYao',
      'kaiChangBai',
      'fuPanShengCheng',
    ]
    for (const leiXing of shengChengLei) {
      const canShu = AI_PEI_ZHI.moXing[leiXing]
      expect(canShu.siKaoMoShi, `${leiXing} 应启用思考模式`).toBe('enabled')
      expect(canShu.reasoningEffort, `${leiXing} 应为 medium`).toBe('medium')
    }
  })

  it('开场白概率 → 保持 disabled（轻量决策）', () => {
    const gaiLv = AI_PEI_ZHI.moXing.kaiChangBaiGaiLv
    expect(gaiLv.siKaoMoShi).toBe('disabled')
    expect(gaiLv.reasoningEffort).toBeUndefined()
  })
})