import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const yuan = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
const yangShi = yuan.slice(yuan.indexOf('<style scoped>'))

describe('危机干预弹窗（安全关键 UI）必须有完整样式', () => {
  it('五个类名都有样式定义', () => {
    for (const lei of [
      '.wei-ji-tan-chuang {',
      '.wei-ji-nei {',
      '.wei-ji-an-niu-zu {',
      '.wei-ji-bo-da {',
      '.wei-ji-guan-bi {',
    ]) {
      expect(yangShi.includes(lei), `缺少样式：${lei}`).toBe(true)
    }
  })

  it('弹窗是 fixed 遮罩且居中，不把输入区挤出视口', () => {
    const kuai = yangShi.slice(yangShi.indexOf('.wei-ji-tan-chuang {'), yangShi.indexOf('.wei-ji-nei {'))
    expect(kuai).toContain('position: fixed')
    expect(kuai).toContain('inset: 0')
    expect(kuai).toContain('align-items: center')
  })

  it('弹窗内容矮视口可滚，触摸目标 ≥44px', () => {
    const nei = yangShi.slice(yangShi.indexOf('.wei-ji-nei {'), yangShi.indexOf('.wei-ji-nei h2 {'))
    expect(nei).toContain('max-height')
    expect(nei).toContain('overflow-y: auto')
    const anNiu = yangShi.slice(yangShi.indexOf('.wei-ji-bo-da,'), yangShi.indexOf('.wei-ji-bo-da {'))
    expect(anNiu).toContain('min-height: var(--shuru-anniu-re-ku)')
  })

  it('热线上色与号码排版', () => {
    const reXian = yangShi.slice(yangShi.indexOf('.wei-ji-re-xian {'), yangShi.indexOf('.wei-ji-an-niu-zu {'))
    expect(reXian).toContain('font-variant-numeric: tabular-nums')
  })
})
