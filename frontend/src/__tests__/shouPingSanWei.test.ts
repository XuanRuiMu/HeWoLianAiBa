import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('FP-08 YH-075 首屏三维拆块与版本提示', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('main.ts 无静态 three 引用，仅动态导入', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const yuanMa = fs.readFileSync(path.resolve(process.cwd(), 'src', 'main.ts'), 'utf-8')
    expect(yuanMa).not.toMatch(/^\s*import\s+.*from\s+['"]three['"]/m)
    expect(yuanMa).not.toMatch(/^\s*import\s+.*from\s+['"]three\//m)
    expect(yuanMa).toContain('./utils/sanWei')
    const sanWei = fs.readFileSync(path.resolve(process.cwd(), 'src', 'utils', 'sanWei.ts'), 'utf-8')
    expect(sanWei).toContain("await import('three')")
    expect(sanWei).toContain("await import('three/examples/jsm/loaders/GLTFLoader.js')")
    expect(sanWei).toContain('yuJiaZaiSanWei')
  })

  it('vite 构建拆出 san-wei 独立块', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const peiZhi = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8')
    expect(peiZhi).toContain("'san-wei'")
    expect(peiZhi).toContain('node_modules')
    expect(peiZhi).toContain('three')
  })

  it('新版本发布显示提示条而非直接 reload', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const yuanMa = fs.readFileSync(path.resolve(process.cwd(), 'src', 'main.ts'), 'utf-8')
    expect(yuanMa).toContain('ban-ben-ti-shi')
    expect(yuanMa).toContain('banBenYiGengXin')
    expect(yuanMa).toContain('liJiShuaXin')
    expect(yuanMa).toMatch(/xianShiBanBenTiShi\(\)/)
  })
})
