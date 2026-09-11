import { describe, it, expect } from 'vitest'
import {
  gouJianCaoDiDiZhi,
  yingPingBiFenXiQingQiu,
  caiYangTongGuo,
  yingTiaoZhenXuanRan,
} from '@/utils/caoDiBeiJing'
import { caoDiPeiZhi, yingYongBanBen } from '@/config/站点配置'

describe('FP-01 草地背景配置与节流', () => {
  it('默认禁用第三方分析', () => {
    expect(caoDiPeiZhi.fenXiQiYong).toBe(false)
    expect(caoDiPeiZhi.pingBiYuMing).toContain('ingest.analytics.invantis.tech')
  })

  it('背景地址带版本可缓存且默认关闭分析', () => {
    const diZhi = gouJianCaoDiDiZhi()
    expect(diZhi).toContain(`/grass-bg/grass-bg.html?v=${encodeURIComponent(yingYongBanBen)}`)
    expect(diZhi).toContain('fenXi=0')
    expect(diZhi).toContain(`xiangSuBi=${encodeURIComponent(String(caoDiPeiZhi.xiangSuBiFengDing))}`)
    expect(diZhi).toContain(`caiYangMiao=${encodeURIComponent(String(caoDiPeiZhi.fenXiCaiYangZuiXiaoJianGeMiao))}`)
    expect(diZhi).toContain(`zhenJianGe=${encodeURIComponent(String(caoDiPeiZhi.zuiXiaoZhenJianGeHaoMiao))}`)
    expect(diZhi).toContain(`chongShi=${encodeURIComponent(String(caoDiPeiZhi.tieTuZuiDaChongShiCiShu))}`)
    expect(diZhi).not.toContain('ts=')
  })

  it('显式开启分析时地址带 fenXi=1', () => {
    expect(gouJianCaoDiDiZhi({ fenXiQiYong: true })).toContain('fenXi=1')
  })

  it('可配置覆盖采样间隔与帧间隔与重试上限', () => {
    const diZhi = gouJianCaoDiDiZhi({ caiYangJianGeMiao: 5, zhenJianGeHaoMiao: 50, chongShiShangXian: 3 })
    expect(diZhi).toContain('caiYangMiao=5')
    expect(diZhi).toContain('zhenJianGe=50')
    expect(diZhi).toContain('chongShi=3')
  })

  it('命中屏蔽名单的第三方请求被拦截', () => {
    expect(
      yingPingBiFenXiQingQiu('https://ingest.analytics.invantis.tech/v1/track'),
    ).toBe(true)
    expect(yingPingBiFenXiQingQiu(new Request('https://ingest.analytics.invantis.tech/x'))).toBe(true)
    expect(yingPingBiFenXiQingQiu('/api/logs')).toBe(false)
    expect(yingPingBiFenXiQingQiu('https://ingest.analytics.invantis.tech/x', undefined, true)).toBe(
      false,
    )
  })

  it('非法输入不拦截不抛错', () => {
    expect(yingPingBiFenXiQingQiu(undefined)).toBe(false)
    expect(yingPingBiFenXiQingQiu(null)).toBe(false)
    expect(yingPingBiFenXiQingQiu(42)).toBe(false)
  })

  it('分析采样按最小间隔放行', () => {
    expect(caiYangTongGuo(0, 1000)).toBe(true)
    expect(caiYangTongGuo(1000, 1000 + 59 * 1000)).toBe(false)
    expect(caiYangTongGuo(1000, 1000 + 60 * 1000)).toBe(true)
    expect(caiYangTongGuo(1000, 1000 + 5 * 1000, 5)).toBe(true)
  })

  it('帧节流按最小间隔放行', () => {
    expect(yingTiaoZhenXuanRan(0, 16)).toBe(true)
    expect(yingTiaoZhenXuanRan(1000, 1016)).toBe(false)
    expect(yingTiaoZhenXuanRan(1000, 1033)).toBe(true)
    expect(yingTiaoZhenXuanRan(1000, NaN)).toBe(false)
  })

  it('像素比封顶不超过1.25', () => {
    expect(caoDiPeiZhi.xiangSuBiFengDing).toBeLessThanOrEqual(1.25)
  })
})
