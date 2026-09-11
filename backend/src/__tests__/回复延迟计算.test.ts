import { describe, it, expect } from 'vitest'
import {
  mbtiLieBiao,
  xingGeMiaoShu,
  yanYuFengGe,
  reQingCiBiao,
  gaoLengCiBiao,
  huiFuYanChiJiZhunHaoMiao,
  huiFuYanChiZuiXiaoHaoMiao,
  huiFuYanChiZuiDaHaoMiao,
  huiFuYanChiDouDongFuDuHaoMiao,
  huiFuYanChiZhaXingPianYiHaoMiao,
  jiSuanHuiFuYanChiHaoMiao,
} from '../config/角色配置'

function jieXiMbti(mbti: string): { ieLeiXing: 'I' | 'E'; reShenLeiXing: '快热' | '慢热' } {
  const moZiMu = mbti.charAt(3)
  return {
    ieLeiXing: mbti.charAt(0) as 'I' | 'E',
    reShenLeiXing: moZiMu === 'J' || moZiMu === 'T' ? '慢热' : '快热',
  }
}

function gouZaoRuCan(
  mbti: string,
  shiFouZhaXing: boolean,
  xingGeWenBen?: string,
  yanYuFengGeWenBen?: string,
) {
  const { ieLeiXing, reShenLeiXing } = jieXiMbti(mbti)
  return {
    ieLeiXing,
    reShenLeiXing,
    shiFouZhaXing,
    xingGeWenBen: xingGeWenBen ?? xingGeMiaoShu[mbti as keyof typeof xingGeMiaoShu],
    yanYuFengGeWenBen: yanYuFengGeWenBen ?? yanYuFengGe[mbti as keyof typeof yanYuFengGe],
  }
}

function junZhi(shuZu: number[]): number {
  return shuZu.reduce((he, zhi) => he + zhi, 0) / shuZu.length
}

describe('回复延迟纯函数 jiSuanHuiFuYanChiHaoMiao', () => {
  it('热情/高冷词表常量各含 8~12 个不重复词', () => {
    for (const ciBiao of [reQingCiBiao, gaoLengCiBiao]) {
      expect(ciBiao.length).toBeGreaterThanOrEqual(8)
      expect(ciBiao.length).toBeLessThanOrEqual(12)
      expect(new Set(ciBiao).size).toBe(ciBiao.length)
    }
  })

  it('注入抖动 0 时同入参结果完全一致（确定性）', () => {
    const ruCan = gouZaoRuCan('ENFP', false)
    const jieGuo1 = jiSuanHuiFuYanChiHaoMiao(ruCan, 0)
    const jieGuo2 = jiSuanHuiFuYanChiHaoMiao(ruCan, 0)
    const jieGuo3 = jiSuanHuiFuYanChiHaoMiao({ ...ruCan }, 0)
    expect(jieGuo1).toBe(jieGuo2)
    expect(jieGuo2).toBe(jieGuo3)
  })

  it('注入抖动叠加在基准钳制值上，且越界后再次钳制', () => {
    const ruCan = { ieLeiXing: 'E' as const, reShenLeiXing: '慢热' as const, shiFouZhaXing: false, xingGeWenBen: '平静温和', yanYuFengGeWenBen: '平铺直叙' }
    const jiZhun = jiSuanHuiFuYanChiHaoMiao(ruCan, 0)
    expect(jiZhun).toBe(huiFuYanChiJiZhunHaoMiao + (-1500) + 1500)
    expect(jiSuanHuiFuYanChiHaoMiao(ruCan, huiFuYanChiDouDongFuDuHaoMiao)).toBe(jiZhun + huiFuYanChiDouDongFuDuHaoMiao)
    expect(jiSuanHuiFuYanChiHaoMiao(ruCan, -huiFuYanChiDouDongFuDuHaoMiao)).toBe(jiZhun - huiFuYanChiDouDongFuDuHaoMiao)

    const dingGeRuCan = gouZaoRuCan('ISTJ', false)
    expect(jiSuanHuiFuYanChiHaoMiao(dingGeRuCan, huiFuYanChiDouDongFuDuHaoMiao)).toBe(huiFuYanChiZuiDaHaoMiao)
    const dingDiRuCan = gouZaoRuCan('ESTP', true)
    expect(jiSuanHuiFuYanChiHaoMiao(dingDiRuCan, -huiFuYanChiDouDongFuDuHaoMiao)).toBe(huiFuYanChiZuiXiaoHaoMiao)
  })

  it('16 种 MBTI 各采样 20 次（随机抖动）→ 全部落在 [8000, 12000] 且为整数', () => {
    for (const mbti of mbtiLieBiao) {
      for (const zha of [false, true]) {
        for (let i = 0; i < 20; i++) {
          const jieGuo = jiSuanHuiFuYanChiHaoMiao(gouZaoRuCan(mbti, zha))
          expect(Number.isInteger(jieGuo)).toBe(true)
          expect(jieGuo).toBeGreaterThanOrEqual(huiFuYanChiZuiXiaoHaoMiao)
          expect(jieGuo).toBeLessThanOrEqual(huiFuYanChiZuiDaHaoMiao)
        }
      }
    }
  })

  it('E 型延迟均值低于 I 型均值', () => {
    const eZhi: number[] = []
    const iZhi: number[] = []
    for (const mbti of mbtiLieBiao) {
      for (const zha of [false, true]) {
        for (let i = 0; i < 10; i++) {
          const jieGuo = jiSuanHuiFuYanChiHaoMiao(gouZaoRuCan(mbti, zha), 0)
          if (jieXiMbti(mbti).ieLeiXing === 'E') eZhi.push(jieGuo)
          else iZhi.push(jieGuo)
        }
      }
    }
    expect(eZhi.length).toBeGreaterThan(0)
    expect(iZhi.length).toBeGreaterThan(0)
    expect(junZhi(eZhi)).toBeLessThan(junZhi(iZhi))
  })

  it('快热延迟均值低于慢热均值', () => {
    const kuaiRe: number[] = []
    const manRe: number[] = []
    for (const mbti of mbtiLieBiao) {
      for (const zha of [false, true]) {
        for (let i = 0; i < 10; i++) {
          const jieGuo = jiSuanHuiFuYanChiHaoMiao(gouZaoRuCan(mbti, zha), 0)
          if (jieXiMbti(mbti).reShenLeiXing === '快热') kuaiRe.push(jieGuo)
          else manRe.push(jieGuo)
        }
      }
    }
    expect(kuaiRe.length).toBeGreaterThan(0)
    expect(manRe.length).toBeGreaterThan(0)
    expect(junZhi(kuaiRe)).toBeLessThan(junZhi(manRe))
  })

  it('渣型延迟均值低于非渣型均值（含单点对比）', () => {
    const feiZha: number[] = []
    const zha: number[] = []
    for (const mbti of mbtiLieBiao) {
      for (let i = 0; i < 10; i++) {
        feiZha.push(jiSuanHuiFuYanChiHaoMiao(gouZaoRuCan(mbti, false), 0))
        zha.push(jiSuanHuiFuYanChiHaoMiao(gouZaoRuCan(mbti, true), 0))
      }
    }
    expect(junZhi(zha)).toBeLessThan(junZhi(feiZha))

    const weiChuDingRuCan = gouZaoRuCan('INFP', false)
    const feiZhaDanDian = jiSuanHuiFuYanChiHaoMiao(weiChuDingRuCan, 0)
    const zhaDanDian = jiSuanHuiFuYanChiHaoMiao(gouZaoRuCan('INFP', true), 0)
    expect(feiZhaDanDian - zhaDanDian).toBe(-huiFuYanChiZhaXingPianYiHaoMiao)
  })

  it('命中热情词表延迟更低、命中高冷词表延迟更高（各至多一次）', () => {
    const puTongRuCan = { ieLeiXing: 'E' as const, reShenLeiXing: '慢热' as const, shiFouZhaXing: false, xingGeWenBen: '平静叙述文本', yanYuFengGeWenBen: '普通表达' }
    const reQingRuCan = { ...puTongRuCan, xingGeWenBen: '热情活泼元气满满自来熟话痨开朗健谈爱笑阳光外向' }
    const gaoLengRuCan = { ...puTongRuCan, xingGeWenBen: '高冷淡漠疏离清冷内向安静矜持寡言沉默' }

    const puTong = jiSuanHuiFuYanChiHaoMiao(puTongRuCan, 0)
    expect(jiSuanHuiFuYanChiHaoMiao(reQingRuCan, 0)).toBe(puTong - 500)
    expect(jiSuanHuiFuYanChiHaoMiao(gaoLengRuCan, 0)).toBe(puTong + 1000)
  })
})
