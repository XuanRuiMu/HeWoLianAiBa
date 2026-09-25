import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/debug日志', () => ({ debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import { chongZhiCiKuHuanCun, huoQuCeShiYangBen, huoQuLeiBieCiTiao, huoQuSuoYouCiTiao, huoQuSuoYouLeiBie, jiaZaiZuiXinCiKu, saoMiaoNeiRong, yanZhengCeShiYangBen, yiZhengCeShiYangBen } from '../审核词库'

beforeEach(() => chongZhiCiKuHuanCun())

describe('审核词库业务分支', () => {
  it('加载、缓存、类别和词条查询覆盖真实词库', async () => {
    const ciKu = await jiaZaiZuiXinCiKu(true)
    await expect(jiaZaiZuiXinCiKu()).resolves.toBe(ciKu)
    const leiBie = huoQuSuoYouLeiBie(ciKu)[0]
    expect(huoQuLeiBieCiTiao(ciKu, leiBie).length).toBeGreaterThanOrEqual(0)
    expect(huoQuSuoYouCiTiao(ciKu).length).toBeGreaterThan(0)
    expect(huoQuCeShiYangBen(ciKu, leiBie)).toEqual(expect.any(Array))
  })

  it('扫描命中、普通文本、测试样本和缓存清理', async () => {
    const ciKu = await jiaZaiZuiXinCiKu(true)
    const 所有 = yiZhengCeShiYangBen(ciKu)
    const 命中 = 所有[0]
    expect(saoMiaoNeiRong(命中.yangBen, ciKu)).toMatchObject({ weiGui: true })
    expect(saoMiaoNeiRong('普通无敏感词', ciKu)).toEqual({ weiGui: false })
    await expect(yanZhengCeShiYangBen()).resolves.toMatchObject({ tongGuo: expect.any(Boolean) })
    chongZhiCiKuHuanCun()
    await expect(jiaZaiZuiXinCiKu(true)).resolves.toBeTruthy()
  })
})
