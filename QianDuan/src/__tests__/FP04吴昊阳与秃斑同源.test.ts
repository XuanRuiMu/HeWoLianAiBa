import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 项目根 = resolve(__dirname, '../..')
const 读源码 = () => readFileSync(resolve(项目根, 'public/grass-bg/scripts/block-08.js'), 'utf8')

describe('FP-04 吴昊阳与秃斑同源（空隙按屏幕等距，缩窗后重新铺设）', () => {
  it('足迹采样改为屏幕反投影（不再用世界 XZ 重心插值）', () => {
    const 源码 = 读源码()
    expect(源码).not.toContain('wuZhongXin')
    expect(源码).toContain('if (!wuBase || !wuAlpha || wuRayN !== WU_SEG) return null')
    expect(源码).toContain('wuBase[qB * 3 + 1] < -500')
    expect(源码).toContain('var sxg = touYingDi(pxg, pzg, wuElev(pxg, pzg))')
    expect(源码).toContain('if (wuAlpha[(ivg * wuAlphaW + iug) * 4 + 3] > 32) hitSet.add(gcx + \',\' + gcz)')
  })

  it('禁区由屏幕距离变换生成，并同时判定草根与叶尖', () => {
    const 源码 = 读源码()
    expect(源码).toMatch(/var CHU = 1, XIE = 1\.41421356/)
    expect(源码).toContain('var imgMinX = wuAlphaW, imgMaxX = -1')
    expect(源码).toContain('var bodyShuPx = {')
    expect(源码).toContain('juLi[cyp * quKuan + cxp] <= mubiaoPx')
    expect(源码).toContain('juLi[cyt * quKuan + cxt] <= mubiaoPx')
    expect(源码).toContain('var yeJianPx = Math.abs(touYingDi(zhongXinX, zhongXinZ, WU_BLADE_H).y - touYingDi(zhongXinX, zhongXinZ, 0).y) + 8')
  })

  it('目标空隙按视口高度等比缩放，叶尖高度作为独立常量', () => {
    const 源码 = 读源码()
    expect(源码).toContain('var WU_QU_KUAN_VH = 0.03')
    expect(源码).toContain('var WU_BLADE_H = 0.108')
    expect(源码).toContain('var mubiaoPx = window.innerHeight * WU_QU_KUAN_VH')
  })

  it('屏幕掩膜域允许越过视口边界（贴边空隙不被截断）', () => {
    const 源码 = 读源码()
    expect(源码).toContain('var quX0 = Math.floor(bodyShuPx.zuo - waiKuo)')
    expect(源码).toContain('var quX1 = Math.ceil(bodyShuPx.you + waiKuo)')
    expect(源码).not.toContain('Math.min(window.innerWidth - 1')
    expect(源码).not.toContain('Math.max(0, Math.floor(bodyShuPx.zuo')
  })

  it('窗口尺寸变化后去抖重铺网格并重算足迹', () => {
    const 源码 = 读源码()
    expect(源码).toContain('window.addEventListener(\'resize\', function () { puWu(); });')
    expect(源码).toContain('function chongPaiWu()')
    expect(源码).toContain('Math.abs(r.l - yiBuRect.l) > 1')
    expect(源码).toContain('Math.abs(r.w - yiBuRect.w) > 1')
    expect(源码).toMatch(/bareDone = false;\s*\n\s*try \{ makeBare\(\); \}/)
  })

  it('旧世界粗格高度场与矩形键判定已移除', () => {
    const 源码 = 读源码()
    expect(源码).not.toContain('var CELL = 0.08')
    expect(源码).not.toContain('wuRectKeyNow')
    expect(源码).not.toContain('wuBareKey')
    expect(源码).not.toContain('wuProject')
    expect(源码).not.toContain('wuRayTo')
  })
})
