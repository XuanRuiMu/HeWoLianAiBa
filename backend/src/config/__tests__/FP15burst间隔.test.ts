import { describe, it, expect, afterEach } from 'vitest'
import {
  shengChengBurstJianGeHaoMiao,
  burstChangJianGeShangXianHaoMiao,
  burstDuanJianGeJiZhunHaoMiao,
  burstDuanJianGeDouDongHaoMiao,
} from '../../config/角色配置'

describe('burst 发送间隔', () => {
  afterEach(() => {
    delete process.env.BURST_DUAN_JIAN_GE_JI_ZHUN_HAO_MIAO
    delete process.env.BURST_DUAN_JIAN_GE_DOU_DONG_HAO_MIAO
    delete process.env.BURST_CHANG_JIAN_GE_JI_ZHUN_HAO_MIAO
    delete process.env.BURST_CHANG_JIAN_GE_DOU_DONG_HAO_MIAO
    delete process.env.BURST_CHANG_JIAN_GE_SHANG_XIAN_HAO_MIAO
  })

  it('连发态间隔为短间隔且落在配置区间内', () => {
    for (let i = 0; i < 200; i++) {
      const v = shengChengBurstJianGeHaoMiao('E', true)
      expect(v).toBeGreaterThanOrEqual(burstDuanJianGeJiZhunHaoMiao.E)
      expect(v).toBeLessThanOrEqual(burstDuanJianGeJiZhunHaoMiao.E + burstDuanJianGeDouDongHaoMiao.E)
    }
  })

  it('长间隔非负且被上界钳制（重尾但不发散）', () => {
    for (let i = 0; i < 500; i++) {
      const v = shengChengBurstJianGeHaoMiao('I', false)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(burstChangJianGeShangXianHaoMiao.I)
    }
  })

  it('长间隔呈重尾分布（均值高于基准、且明显大于连发间隔上沿）', () => {
    let sum = 0
    const n = 1000
    for (let i = 0; i < n; i++) sum += shengChengBurstJianGeHaoMiao('E', false)
    const mean = sum / n
    const duanShong = burstDuanJianGeJiZhunHaoMiao.E + burstDuanJianGeDouDongHaoMiao.E
    expect(mean).toBeGreaterThan(duanShong)
  })

  it('环境变量覆盖基准与抖动幅度', () => {
    process.env.BURST_CHANG_JIAN_GE_JI_ZHUN_HAO_MIAO = '2500'
    process.env.BURST_CHANG_JIAN_GE_DOU_DONG_HAO_MIAO = '100'
    process.env.BURST_CHANG_JIAN_GE_SHANG_XIAN_HAO_MIAO = '3000'
    for (let i = 0; i < 100; i++) {
      const v = shengChengBurstJianGeHaoMiao('E', false)
      expect(v).toBeGreaterThanOrEqual(2500)
      expect(v).toBeLessThanOrEqual(3000)
    }
    process.env.BURST_DUAN_JIAN_GE_JI_ZHUN_HAO_MIAO = '700'
    process.env.BURST_DUAN_JIAN_GE_DOU_DONG_HAO_MIAO = '50'
    for (let i = 0; i < 100; i++) {
      const v = shengChengBurstJianGeHaoMiao('I', true)
      expect(v).toBeGreaterThanOrEqual(700)
      expect(v).toBeLessThanOrEqual(750)
    }
  })
})
