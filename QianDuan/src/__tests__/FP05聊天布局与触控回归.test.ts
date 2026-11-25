import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 页面源 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')

function 取规则(选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 命中 = new RegExp(`${转义}\\s*\\{([^}]*)\\}`).exec(页面源)
  expect(命中, `缺少样式规则：${选择器}`).not.toBeNull()
  return 命中?.[1] ?? ''
}

function 取媒体(判据: string): string {
  const 起点 = 页面源.indexOf(`@media ${判据} {`)
  expect(起点, `缺少媒体规则：${判据}`).toBeGreaterThanOrEqual(0)
  return 页面源.slice(起点, 页面源.indexOf('</style>', 起点))
}

describe('FP05 聊天页网格轨道与弹层边界', () => {
  it('提示和错误共享首行，消息与输入保留直接网格子项及固定轨道', () => {
    expect(页面源).toContain('<div class="liaotian-dingbu">')
    expect(页面源).toContain('<LiaoTianMianBan')
    expect(页面源).toContain('<footer class="shuru-quyu weixin-shuru">')
    expect(页面源.indexOf('<TiShiDai')).toBeGreaterThan(页面源.indexOf('<div class="liaotian-dingbu">'))
    expect(页面源.indexOf('<LiaoTianMianBan')).toBeGreaterThan(页面源.indexOf('<RequestError'))
    expect(取规则('.liaotian-yemian')).toContain('grid-template-rows: auto minmax(0, 1fr) auto')
    expect(取规则('.liaotian-dingbu')).toContain('grid-row: 1 / 2')
    expect(取规则('.xiaoxi-quyu')).toContain('grid-row: 2 / 3')
    expect(取规则('.xiaoxi-quyu')).toContain('overflow-y: auto')
    expect(取规则('.xiaoxi-quyu')).toContain('min-height: 0')
    expect(取规则('.weixin-shuru')).toContain('grid-row: 3 / 4')
  })

  it('危机弹层和复盘弹层脱离网格，不用通用子序号选择器改布局', () => {
    expect(取规则('.wei-ji-tan-chuang')).toContain('position: fixed')
    expect(取规则('.youxi-zhezhao')).toContain('position: fixed')
    expect(页面源).not.toMatch(/\.liaotian-yemian\s*>\s*:nth-child/)
    expect(页面源).not.toMatch(/\.liaotian-yemian\s+[^,{]*:nth-child/)
  })
})

describe('FP05 表情触控和矮横屏', () => {
  it('iPad 等粗指针设备获得与窄屏一致的 44 像素热区', () => {
    const 上下文 = 取媒体('(max-width: 767px), (hover: none) and (pointer: coarse)')
    expect(上下文).toContain('.ge-caoZuo::before')
    expect(上下文).toContain('width: 44px')
    expect(上下文).toContain('height: 44px')
  })

  it('表情面板高度随视口收敛，内部仍可独立滚动', () => {
    expect(取规则('.emoji-mianban')).toMatch(/max-height:\s*clamp\([^;]*var\(--shi-jiao-kou-gao-du\)[^;]*\)/)
    expect(取规则('.emoji-mianban')).toContain('overflow-y: auto')
    expect(取规则('.emoji-mianban')).toContain('-webkit-overflow-scrolling: touch')
    const 横屏 = 取媒体('(orientation: landscape) and (max-height: 480px)')
    expect(横屏).toMatch(/\.emoji-mianban\s*\{[^}]*max-height:\s*clamp\(/)
  })

  it('退出复盘按钮的 hover 只在可悬停设备启用', () => {
    expect(取媒体('(hover: hover)')).toContain('.fupan-tuichu-anniu:hover')
    expect(取规则('.fupan-tuichu-anniu')).not.toContain('opacity: 0.85')
  })
})
