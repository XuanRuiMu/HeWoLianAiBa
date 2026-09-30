import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  互换文档序,
  比较特异度,
  层叠焦点环,
  规则清单,
  type 探针,
} from './CSS级联真源'

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
  // FP-01 令牌基座追加：卡面组 / 选中态阴影与辉光 / 性别选中框三件套（共用块里的几何与光标令牌不在此列）
  'moshi-kapian-zheyan',
  'kapian-mian-biankuang',
  'kapian-mian-zhengwen',
  'kapian-mian-biaoti',
  'xuanzhong-wenben-yinying',
  'xuanzhong-qiangdiao-yinying',
  'xingbie-nan-xuan-biankuang',
  'xingbie-nan-xuan-beijing',
  'xingbie-nan-xuan-wenben',
  'xingbie-nv-xuan-biankuang',
  'xingbie-nv-xuan-beijing',
  'xingbie-nv-xuan-wenben',
  'xingbie-zhongxing-xuan-biankuang',
  'xingbie-zhongxing-xuan-beijing',
  'xingbie-zhongxing-xuan-wenben',
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
    // FP-15b 旧→新：#e6a9be（白字 1.95:1，FP-01 已知缺陷账本）→ #a34f74（白字 5.35:1）
    expect(quZhi('light', 'xingbie-nv-1')).toBe('#a34f74')
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
  it('文本输入类控件焦点改为收窄环而非 outline:none（白线根因是装饰线，撤环才是丢指示），非文本 input 类型不被误伤', () => {
    expect(quanJuCss).toMatch(
      /:where\(\s*input:not\(\[type='checkbox'\], \[type='radio'\], \[type='button'\], \[type='submit'\], \[type='reset'\], \[type='file'\], \[type='image'\], \[type='range'\], \[type='color'\]\),\s*textarea,\s*select,\s*\.shuru-kuang,\s*\.xinmuzhong-shurukuang,\s*\.xiugai-shuru,\s*\.fenlie-shuru\s*\):focus-visible\s*\{\s*outline:\s*var\(--jujiao-huan-kuan-du-wenben\)\s+solid\s+var\(--jujiao-huan-yanse\)/,
    )
    expect(quanJuCss).not.toMatch(/outline:\s*none/)
    expect(quanJuCss).not.toMatch(/outline:\s*2px solid var\(--wenben-zhuse\)/)
    expect(quanJuCss).not.toMatch(/\.shuru-kuang:focus-visible/)
  })

  it('标准焦点环走 jujiao 三件套，且规则本体包在 :where() 里（特异度 0）', () => {
    expect(quanJuCss).toMatch(
      /:where\(:focus-visible\)\s*\{\s*outline:\s*var\(--jujiao-huan-kuan-du\)\s+solid\s+var\(--jujiao-huan-yanse\)/,
    )
    expect(quanJuCss).toMatch(/outline-offset:\s*var\(--jujiao-huan-pian-yi\)/)
    // 不再存在裸 :focus-visible 规则：任何"靠源码顺序压制"的第二真源都视为回归
    expect(quanJuCss).not.toMatch(/^\s*:focus-visible\s*\{/m)
  })

  it('文本控件窄环靠特异度差胜出（0 → 0,1,0），不再依赖同特异度的书写顺序', () => {
    const 规则们 = 规则清单(quanJuCss)
    const 文本控件: 探针 = { 标签: 'input', 类: ['shuru-kuang'], 属性: {}, 焦点可见: true }
    const 非文本控件: 探针 = {
      标签: 'input',
      类: [],
      属性: { type: 'checkbox' },
      焦点可见: true,
    }
    const 窄环 = 层叠焦点环(规则们, 文本控件)
    const 标准环 = 层叠焦点环(规则们, 非文本控件)
    // 「靠特异度差」这句标题现在真的有断言兜着了：旧断言比的是两处 search() 字符下标
    expect(标准环.特异度).toEqual([0, 0, 0])
    expect(窄环.特异度).toEqual([0, 1, 0])
    expect(比较特异度(窄环.特异度, 标准环.特异度)).toBeGreaterThan(0)
    expect(窄环.宽度令牌).toBe('--jujiao-huan-kuan-du-wenben')
    expect(标准环.宽度令牌).toBe('--jujiao-huan-kuan-du')
    // 等价改写反证：两条规则整体换位（窄环本来在标准环之后，换完在前），层叠结果必须不动
    const 换位 = 互换文档序(规则们, 窄环.规则.选择器, 标准环.规则.选择器)
    expect(窄环.规则.序号 > 标准环.规则.序号).toBe(true)
    expect(层叠焦点环(换位, 文本控件).宽度令牌).toBe('--jujiao-huan-kuan-du-wenben')
    expect(层叠焦点环(换位, 非文本控件).宽度令牌).toBe('--jujiao-huan-kuan-du')
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

  it('FP-20：@keyframes jianbian-liudong 全库仅 global.css 一份（页面副本已删）', () => {
    const 遍历 = (目录: string): string[] => {
      const 结果: string[] = []
      for (const 项 of readdirSync(目录)) {
        if (项 === '__tests__') continue
        const 全路径 = resolve(目录, 项)
        if (statSync(全路径).isDirectory()) 结果.push(...遍历(全路径))
        else if (项.endsWith('.vue') || 项.endsWith('.css')) 结果.push(全路径)
      }
      return 结果
    }
    const 根 = resolve(__dirname, '..')
    const 含有的 = 遍历(根)
      .filter((文件) => readFileSync(文件, 'utf8').includes('@keyframes jianbian-liudong'))
      .map((文件) => 文件.slice(根.length + 1).split(sep).join('/'))
    expect(含有的, 'jianbian-liudong 关键帧只准存在于 global.css').toEqual(['styles/global.css'])
    expect(quanJuCss).toMatch(/animation:\s*[^;]*jianbian-liudong/)
  })
})
