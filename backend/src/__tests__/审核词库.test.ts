import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { jiaZaiZuiXinCiKu, saoMiaoNeiRong, yanZhengCeShiYangBen, chongZhiCiKuHuanCun, huoQuSuoYouLeiBie, huoQuLeiBieCiTiao, huoQuCeShiYangBen, yiZhengCeShiYangBen, huoQuSuoYouCiTiao } from '../services/审核词库'
import type { CiKuBanBen } from '../services/审核词库'

describe('FP-05 B-4 审核类别词库', () => {
  let ciKu: CiKuBanBen

  beforeAll(async () => {
    ciKu = await jiaZaiZuiXinCiKu()
  })

  afterAll(() => {
    chongZhiCiKuHuanCun()
  })

  beforeEach(() => {
    chongZhiCiKuHuanCun()
  })

  it('词库文件存在且版本号为v1', () => {
    expect(ciKu.banBen).toBe('v1')
    expect(ciKu.gengXinShiJian).toBeDefined()
  })

  it('包含六大法定类别', () => {
    const leiBie = huoQuSuoYouLeiBie(ciKu)
    expect(leiBie).toHaveLength(6)
    expect(leiBie).toContain('涉政有害')
    expect(leiBie).toContain('淫秽色情')
    expect(leiBie).toContain('暴力恐怖')
    expect(leiBie).toContain('邪教')
    expect(leiBie).toContain('赌博诈骗')
    expect(leiBie).toContain('侵害未成年人')
  })

  it('每个类别包含描述、词条数组、测试样本', () => {
    const leiBie = huoQuSuoYouLeiBie(ciKu)
    for (const lb of leiBie) {
      const ciTiao = huoQuLeiBieCiTiao(ciKu, lb)
      const yangBen = huoQuCeShiYangBen(ciKu, lb)
      expect(ciTiao.length).toBeGreaterThan(0)
      expect(yangBen.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('涉政有害类别词条包含关键敏感词', () => {
    const ciTiao = huoQuLeiBieCiTiao(ciKu, '涉政有害')
    expect(ciTiao).toContain('颠覆国家政权')
    expect(ciTiao).toContain('煽动分裂国家')
    expect(ciTiao).toContain('台独')
    expect(ciTiao).toContain('港独')
  })

  it('淫秽色情类别词条包含关键敏感词', () => {
    const ciTiao = huoQuLeiBieCiTiao(ciKu, '淫秽色情')
    expect(ciTiao).toContain('强奸')
    expect(ciTiao).toContain('卖淫')
    expect(ciTiao).toContain('嫖娼')
    expect(ciTiao).toContain('未成年人性行为')
  })

  it('暴力恐怖类别词条包含关键敏感词', () => {
    const ciTiao = huoQuLeiBieCiTiao(ciKu, '暴力恐怖')
    expect(ciTiao).toContain('恐怖袭击')
    expect(ciTiao).toContain('制造爆炸物')
    expect(ciTiao).toContain('炸弹制作')
  })

  it('邪教类别词条包含关键敏感词', () => {
    const ciTiao = huoQuLeiBieCiTiao(ciKu, '邪教')
    expect(ciTiao).toContain('法轮功')
    expect(ciTiao).toContain('全能神')
    expect(ciTiao).toContain('邪教组织')
  })

  it('赌博诈骗类别词条包含关键敏感词', () => {
    const ciTiao = huoQuLeiBieCiTiao(ciKu, '赌博诈骗')
    expect(ciTiao).toContain('网络赌博')
    expect(ciTiao).toContain('电信诈骗')
    expect(ciTiao).toContain('杀猪盘')
    expect(ciTiao).toContain('非法集资')
  })

  it('侵害未成年人类别词条包含关键敏感词', () => {
    const ciTiao = huoQuLeiBieCiTiao(ciKu, '侵害未成年人')
    expect(ciTiao).toContain('性侵未成年人')
    expect(ciTiao).toContain('诱拐儿童')
    expect(ciTiao).toContain('校园霸凌')
  })

  it('扫描命中涉政有害样本', () => {
    const jieGuo = saoMiaoNeiRong('有人想颠覆国家政权', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    expect(jieGuo.leiBie).toBe('涉政有害')
    expect(jieGuo.mingZhongCi).toBe('颠覆国家政权')
  })

  it('扫描命中淫秽色情样本', () => {
    const jieGuo = saoMiaoNeiRong('组织卖淫嫖娼活动', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    expect(jieGuo.leiBie).toBe('淫秽色情')
    expect(jieGuo.mingZhongCi).toBe('卖淫')
  })

  it('扫描命中暴力恐怖样本', () => {
    const jieGuo = saoMiaoNeiRong('教唆制造炸弹袭击', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    expect(jieGuo.leiBie).toBe('暴力恐怖')
    expect(jieGuo.mingZhongCi).toBe('制造炸弹')
  })

  it('扫描命中邪教样本', () => {
    const jieGuo = saoMiaoNeiRong('宣扬全能神邪教', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    expect(jieGuo.leiBie).toBe('邪教')
    expect(jieGuo.mingZhongCi).toBe('全能神')
  })

  it('扫描命中赌博诈骗样本', () => {
    const jieGuo = saoMiaoNeiRong('组织网络赌博平台', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    expect(jieGuo.leiBie).toBe('赌博诈骗')
    expect(jieGuo.mingZhongCi).toBe('网络赌博')
  })

  it('扫描命中侵害未成年人样本', () => {
    const jieGuo = saoMiaoNeiRong('诱拐贩卖儿童犯罪', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    expect(jieGuo.leiBie).toBe('侵害未成年人')
    expect(jieGuo.mingZhongCi).toBe('贩卖儿童')
  })

  it('正常内容不被拦截', () => {
    const jieGuo = saoMiaoNeiRong('今天天气真不错，一起散步吧', ciKu)
    expect(jieGuo.weiGui).toBe(false)
  })

  it('大小写不敏感匹配', () => {
    const jieGuo = saoMiaoNeiRong('有人想颠覆国家政权', ciKu)
    expect(jieGuo.weiGui).toBe(true)
    const jieGuo2 = saoMiaoNeiRong('有人想颠覆国家政权', ciKu)
    expect(jieGuo2.weiGui).toBe(true)
  })

  it('所有测试样本验证通过', async () => {
    const { tongGuo, xiangQing } = await yanZhengCeShiYangBen()
    expect(tongGuo).toBe(true)
    for (const xq of xiangQing) {
      expect(xq.tongGuo).toBe(true)
      expect(xq.mingZhongCi).toBeDefined()
    }
  })

  it('每个类别至少3个测试样本', () => {
    const yangBenLieBiao = yiZhengCeShiYangBen(ciKu)
    const leiBieJiShu: Record<string, number> = {}
    for (const { leiBie } of yangBenLieBiao) {
      leiBieJiShu[leiBie] = (leiBieJiShu[leiBie] || 0) + 1
    }
    for (const [leiBie, shu] of Object.entries(leiBieJiShu)) {
      expect(shu).toBeGreaterThanOrEqual(3)
    }
  })

  it('获取所有词条汇总不为空', () => {
    const suoYouCiTiao = huoQuSuoYouCiTiao(ciKu)
    expect(suoYouCiTiao.length).toBeGreaterThan(0)
  })
})