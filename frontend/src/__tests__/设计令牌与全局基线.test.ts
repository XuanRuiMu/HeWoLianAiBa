import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// FP-01 设计令牌与全局基线收口：焦点环分流 / 滚动条三件套 / button 色继承 / 表面与性别令牌成对

const bianLiangCss = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
const quanJuCss = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8')

function zhuTiKuai(zhuTi: 'light' | 'dark'): string {
  const zhengZe =
    zhuTi === 'light'
      ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
      : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
  const piPei = bianLiangCss.match(zhengZe)
  if (!piPei) throw new Error(`variables.css 缺少 ${zhuTi} 主题块`)
  return piPei[1]
}

function quZhi(zhuTi: 'light' | 'dark', ming: string): string {
  const piPei = new RegExp(`--${ming}\\s*:\\s*([^;]+);`).exec(zhuTiKuai(zhuTi))
  expect(piPei, `令牌 --${ming} 在 ${zhuTi} 主题块未定义`).not.toBeNull()
  return (piPei as RegExpMatchArray)[1].trim()
}

const xinZengLingPai = [
  'gundong-tiao-huakuai',
  'gundong-tiao-huakuai-hover',
  'gundong-tiao-guidao',
  'gundong-tiao-kuan-du',
  'jujiao-huan-yanse',
  'jujiao-huan-kuan-du',
  'jujiao-huan-pian-yi',
  'yemian-di-beijing',
  'xingbie-nan-1',
  'xingbie-nan-2',
  'xingbie-nan-wenben',
  'xingbie-nv-1',
  'xingbie-nv-2',
  'xingbie-nv-wenben',
  'xingbie-zhongxing-1',
  'xingbie-zhongxing-2',
  'xingbie-zhongxing-wenben',
] as const

describe('FP-01 设计令牌成对与取值', () => {
  it('新增令牌在明暗两套主题块各定义一次（全文件恰好两次）', () => {
    for (const ming of xinZengLingPai) {
      const quanWen = [...bianLiangCss.matchAll(new RegExp(`--${ming}\\s*:`, 'g'))].length
      expect(`${ming}:${quanWen}`, `令牌 --${ming} 未成对定义`).toBe(`${ming}:2`)
      for (const zhuTi of ['light', 'dark'] as const) {
        expect(quZhi(zhuTi, ming), `令牌 --${ming} 在 ${zhuTi} 为空`).not.toBe('')
      }
    }
  })

  it('焦点环颜色走暖灰蓝品牌档，明暗互异且不再引用 --wenben-zhuse', () => {
    expect(quZhi('light', 'jujiao-huan-yanse')).toBe('#5a7a94')
    expect(quZhi('dark', 'jujiao-huan-yanse')).toBe('#8eafc5')
    expect(quZhi('light', 'jujiao-huan-kuan-du')).toBe('2px')
    expect(quZhi('dark', 'jujiao-huan-kuan-du')).toBe('2px')
    expect(quZhi('light', 'jujiao-huan-pian-yi')).toBe('2px')
    expect(quZhi('dark', 'jujiao-huan-pian-yi')).toBe('2px')
  })

  it('旧滚动条令牌 beijing/hover 有消费者故保留改造：字面值、明暗互异、不再近乎不可见', () => {
    expect(quZhi('light', 'gundong-tiao-beijing')).toBe('rgba(110, 110, 110, 0.85)')
    expect(quZhi('dark', 'gundong-tiao-beijing')).toBe('rgba(150, 150, 150, 0.9)')
    expect(quZhi('light', 'gundong-tiao-hover')).toBe('rgba(80, 80, 80, 0.95)')
    expect(quZhi('dark', 'gundong-tiao-hover')).toBe('rgba(180, 180, 180, 0.95)')
    expect(bianLiangCss).not.toMatch(/--gundong-tiao-beijing:\s*rgba\(255,\s*255,\s*255,\s*0\.1\)/)
    expect(bianLiangCss).not.toMatch(/--gundong-tiao-beijing:\s*rgba\(0,\s*0,\s*0,\s*0\.1\)/)
  })

  it('滑块色明暗两档 alpha≥0.85（实际可见可拖），轨道色 alpha≤0.25（不压死前景）', () => {
    const alpha = (zhi: string): number => {
      const piPei = zhi.match(/rgba\([^)]+,\s*([\d.]+)\)/)
      expect(piPei, `非 rgba 取值：${zhi}`).not.toBeNull()
      return Number((piPei as RegExpMatchArray)[1])
    }
    for (const zhuTi of ['light', 'dark'] as const) {
      expect(alpha(quZhi(zhuTi, 'gundong-tiao-huakuai'))).toBeGreaterThanOrEqual(0.85)
      expect(alpha(quZhi(zhuTi, 'gundong-tiao-huakuai-hover'))).toBeGreaterThanOrEqual(0.85)
      expect(alpha(quZhi(zhuTi, 'gundong-tiao-guidao'))).toBeLessThanOrEqual(0.25)
    }
  })

  it('表面令牌基值 #F5F5F5/#292929 带透明度；性别令牌为字面色值（蒸馏自向导既有值）', () => {
    expect(quZhi('light', 'yemian-di-beijing')).toBe('rgba(245, 245, 245, 0.7)')
    expect(quZhi('dark', 'yemian-di-beijing')).toBe('rgba(41, 41, 41, 0.6)')
    expect(quZhi('light', 'xingbie-nan-1')).toBe('#4a90d9')
    expect(quZhi('light', 'xingbie-nan-2')).toBe('#3a7bc8')
    expect(quZhi('light', 'xingbie-nv-1')).toBe('#e6a9be')
    expect(quZhi('light', 'xingbie-nv-2')).toBe('#c77b98')
    expect(quZhi('light', 'xingbie-zhongxing-1')).toBe('#8e8e93')
    expect(quZhi('light', 'xingbie-zhongxing-2')).toBe('#636366')
    for (const zhuTi of ['light', 'dark'] as const) {
      for (const ming of xinZengLingPai.filter((m) => m.startsWith('xingbie'))) {
        expect(`${ming}:${quZhi(zhuTi, ming)}`).not.toContain('var(')
      }
    }
  })
})

describe('FP-01 全局基线规则', () => {
  it('文本输入类控件聚焦不再绘制全局 outline（白线根因），非文本 input 类型不被误伤', () => {
    expect(quanJuCss).toMatch(
      /:where\(\s*input:not\(\[type='checkbox'\], \[type='radio'\], \[type='button'\], \[type='submit'\], \[type='reset'\], \[type='file'\], \[type='image'\], \[type='range'\], \[type='color'\]\),\s*textarea,\s*select,\s*\.shuru-kuang,\s*\.xinmuzhong-shurukuang,\s*\.xiugai-shuru,\s*\.fenlie-shuru\s*\):focus-visible\s*\{\s*outline:\s*none/,
    )
    expect(quanJuCss).not.toMatch(/outline:\s*2px solid var\(--wenben-zhuse\)/)
    expect(quanJuCss).not.toMatch(/\.shuru-kuang:focus-visible/)
  })

  it('非文本控件 :focus-visible 焦点环走 jujiao 三件套', () => {
    expect(quanJuCss).toMatch(
      /:focus-visible\s*\{\s*outline:\s*var\(--jujiao-huan-kuan-du\)\s+solid\s+var\(--jujiao-huan-yanse\)/,
    )
    expect(quanJuCss).toMatch(/outline-offset:\s*var\(--jujiao-huan-pian-yi\)/)
  })

  it('文本控件排除规则排在全局焦点环规则之后（同特异度后来者胜）', () => {
    const huan = quanJuCss.search(/:focus-visible\s*\{[^}]*--jujiao-huan-kuan-du/)
    const paiChu = quanJuCss.search(/input:not\(\[type='checkbox'\]/)
    expect(huan).toBeGreaterThanOrEqual(0)
    expect(paiChu).toBeGreaterThan(huan)
  })

  it('button reset 补 color: inherit（零规则按钮随主题色）', () => {
    expect(quanJuCss).toMatch(/button\s*\{[^}]*color:\s*inherit/)
  })

  it('.shuru-kuang 聚焦边框改走焦点环令牌（原同值 no-op 不再丢指示）', () => {
    expect(quanJuCss).toMatch(
      /\.shuru-kuang:focus\s*\{\s*border-color:\s*var\(--jujiao-huan-yanse\)/,
    )
    expect(quanJuCss).not.toMatch(
      /\.shuru-kuang:focus\s*\{\s*border-color:\s*var\(--biankuang-yanse\)/,
    )
  })

  it('全局滚动条基线消费 gundong-tiao 三件套（webkit 块 + Firefox @supports 分支）', () => {
    expect(quanJuCss).toMatch(
      /::-webkit-scrollbar\s*\{\s*width:\s*var\(--gundong-tiao-kuan-du\)\s*;\s*height:\s*var\(--gundong-tiao-kuan-du\)/,
    )
    expect(quanJuCss).toMatch(/::-webkit-scrollbar-track\s*\{\s*background:\s*var\(--gundong-tiao-guidao\)/)
    expect(quanJuCss).toMatch(/::-webkit-scrollbar-thumb\s*\{\s*background:\s*var\(--gundong-tiao-huakuai\)/)
    expect(quanJuCss).toMatch(
      /::-webkit-scrollbar-thumb:hover\s*\{\s*background:\s*var\(--gundong-tiao-huakuai-hover\)/,
    )
    expect(quanJuCss).toMatch(/@supports\s+not\s+selector\(::-webkit-scrollbar\)/)
    expect(quanJuCss).toMatch(
      /scrollbar-color:\s*var\(--gundong-tiao-huakuai\)\s+var\(--gundong-tiao-guidao\)/,
    )
  })
})
