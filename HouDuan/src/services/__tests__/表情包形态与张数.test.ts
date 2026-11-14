import { afterEach, describe, expect, it, vi } from 'vitest'

const HuanJingMing = 'BIAO_QING_BAO_ZUI_DA_MEI_LUN_ZHANG_SHU'

async function duYunXingPeiZhi(): Promise<{ zuiDaMeiLunZhangShu: number }> {
  vi.resetModules()
  const mo = await import('../../config/表情包配置')
  return mo.BiaoQingBaoYunXing
}

afterEach(() => {
  delete process.env[HuanJingMing]
})

describe('每轮表情包张数硬上限', () => {
  it('不给环境变量时是一张', async () => {
    delete process.env[HuanJingMing]
    expect((await duYunXingPeiZhi()).zuiDaMeiLunZhangShu).toBe(1)
  })

  it('环境变量给 0 时关掉本轮发图', async () => {
    process.env[HuanJingMing] = '0'
    expect((await duYunXingPeiZhi()).zuiDaMeiLunZhangShu).toBe(0)
  })

  it.each(['1', '2', '5', '99'])('环境变量给 %s 时都不可能超过一张', async (zhi) => {
    process.env[HuanJingMing] = zhi
    expect((await duYunXingPeiZhi()).zuiDaMeiLunZhangShu).toBe(1)
  })

  it.each(['abc', '-1', '1.5', '   '])('环境变量给 %s 这种非法值时回退一张', async (zhi) => {
    process.env[HuanJingMing] = zhi
    expect((await duYunXingPeiZhi()).zuiDaMeiLunZhangShu).toBe(1)
  })
})

describe('写手提示词里的用法不写成一图一文', () => {
  it('第一层贴着规矩只说位置自由，不再绑定到某个词', async () => {
    const { gouJianDiYiCeng } = await import('../Prompt构建器')
    const diYiCeng = gouJianDiYiCeng()
    expect(diYiCeng).toContain('贴纸:短名')
    expect(diYiCeng).toContain('整条只发图不写字也行')
    expect(diYiCeng).toContain('别再用文字说一遍')
    expect(diYiCeng).toContain('不写动作也不写心理活动')
    expect(diYiCeng).not.toContain('顶替你要打的那个词')
    expect(diYiCeng).not.toContain('不是把话说完再补一张图')
  })
})
