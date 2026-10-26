import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 项目根 = resolve(源码根, '..')
const 仓库根 = resolve(项目根, '..')
const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

describe('主页三维背景：就绪握手、暂停与降级', () => {
  it('背景页只在引擎真正就绪后通知父页，并支持暂停渲染', () => {
    const 背景页 = 读('public/grass-bg/grass-bg.html')
    const 握手 = 读('public/grass-bg/scripts/block-09.js')
    expect(握手).toContain("tongZhi('jiu-xu')")
    expect(握手).toContain("tongZhi('shi-bai'")
    expect(握手).toContain("type !== 'grass-pause'")
    expect(握手).toContain('__caoDiZanTing')
    expect(握手).toContain("addEventListener('webglcontextlost'")
    expect(握手).toContain('chao-shi')
    expect(背景页).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i)
  })

  it('GPU 探测基准已本地化，不再依赖被 CSP 拦截的 unpkg', () => {
    const 背景页 = 读('public/grass-bg/grass-bg.html')
    expect(背景页).not.toContain('unpkg.com/detect-gpu')
    const 资源目录 = resolve(项目根, 'public/grass-bg').replace(/\\/g, '/')
    const 包目录 = readdirSync(资源目录).find((名) => 名.startsWith('references'))
    expect(包目录).toBeTruthy()
    const 包路径 = resolve(项目根, `public/grass-bg/${包目录}`)
    const 脚本 = readdirSync(包路径).find((名) => 名.endsWith('.js'))
    expect(脚本).toBeTruthy()
    const 包源码 = readFileSync(resolve(包路径, 脚本 as string), 'utf8')
    expect(包源码).toContain('/grass-bg/detect-gpu/benchmarks')
    expect(包源码).not.toContain('https://unpkg.com/detect-gpu')
    const 基准目录 = resolve(项目根, 'public/grass-bg/detect-gpu/benchmarks')
    expect(existsSync(基准目录)).toBe(true)
    expect(readdirSync(基准目录).filter((名) => 名.endsWith('.json')).length).toBe(16)
  })

  it('父页不再把 iframe load 当成功，失败时保留循环降级背景', () => {
    const 根 = 读('src/根组件.vue')
    expect(根).toContain('const jiangJiYinCang = computed(() => !shiYongCaoDiBeiJing.value || beiJingJiuXu.value)')
    expect(根).toContain('cao-di-jiang-ji')
    expect(根).toContain('jiang-ji-yue-liang')
    expect(根).toContain('grass-pause')
    expect(根).toContain('beiJingJiuXuChaoShiHaoMiao')
    expect(根).toContain('is-zan-ting')
    expect(根).not.toContain('gua-qi')
    expect(根).not.toContain('cao-di-shibai-ti-shi')
    expect(根).not.toContain('width: 2px')
  })

  it('下雨开关驱动三维草地场景内的雨，不再使用页面级 CSS 雨层', () => {
    const 根 = 读('src/根组件.vue')
    const 雨 = 读('public/grass-bg/scripts/block-10.js')
    expect(根).toContain("type: 'grass-rain'")
    expect(根).toContain('tongBuBeiJingYuShui')
    expect(根).not.toContain('zhu-ye-yu-shui')
    expect(雨).toContain("数据.type !== 'grass-rain'")
    expect(雨).toContain('weatherController')
    expect(雨).toContain('tweaksValue.forceState = 目标')
    expect(雨).toContain("雨开启 ? 'rain' : 'clear'")
    expect(雨).toContain('控制器.cycleTimer = 0')
    expect(雨).not.toContain('setIntensity')
    expect(雨).not.toContain('LineSegments')
    expect(雨).not.toContain('BufferGeometry')
    expect(读('public/grass-bg/grass-bg.html')).toContain('scripts/block-10.js')
  })

  it('降级层动画无缝循环并可在隐藏时暂停', () => {
    const 根 = 读('src/根组件.vue')
    expect(根).toContain('animation-play-state: paused')
    expect(根).toContain('prefers-reduced-motion: reduce')
    expect(根).toContain('@keyframes jiang-ji-ji-guang-piao')
  })

  it('部署 CSP 只允许同源连接，本地化后不再触发外链拦截', () => {
    const 配置 = readFileSync(resolve(仓库根, 'BuShu/nginx.conf'), 'utf8')
    expect(配置).toContain("connect-src 'self' blob: data:")
    expect(配置).not.toContain('unpkg.com')
  })

  it('就绪超时写入站点配置且大于背景页自检超时', () => {
    const 配置 = 读('src/config/站点配置.ts')
    expect(配置).toContain('beiJingJiuXuChaoShiHaoMiao: 18000')
    const 握手 = 读('public/grass-bg/scripts/block-09.js')
    expect(握手).toContain('}, 15000);')
  })
})
