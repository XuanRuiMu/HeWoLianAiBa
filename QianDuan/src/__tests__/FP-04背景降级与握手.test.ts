import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 项目根 = resolve(源码根, '..')
const 仓库根 = resolve(项目根, '..')
const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

describe('主页三维背景：就绪握手、暂停与降级', () => {
  it('背景页只在场景真正完成后通知父页，并支持暂停渲染', () => {
    const 背景页 = 读('public/grass-bg/grass-bg.html')
    const 握手 = 读('public/grass-bg/scripts/block-09.js')
    expect(握手).toContain("tongZhi('jiu-xu'")
    expect(握手).toContain("tongZhi('shi-bai'")
    expect(握手).toContain("type !== 'grass-pause'")
    expect(握手).toContain('__caoDiZanTing')
    expect(握手).toContain("addEventListener('webglcontextlost'")
    expect(握手).toContain('chao-shi')
    expect(握手).toContain('__caoDiZhunBeiZhuangTai')
    expect(握手).toContain('z.zhunBei !== true')
    expect(握手).toContain("cao-di-jiu-xu")
    expect(背景页).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i)
    expect(背景页).toContain('.loading { display: none !important; }')
    expect(背景页).not.toContain('scripts/block-04.js')
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

  it('浅色主题使用日间占位，避免淡入时底部被夜景占位染暗', () => {
    const 根 = 读('src/根组件.vue')
    expect(根).toContain("'is-light': shiQianSe")
    expect(根).toContain('.cao-di-jiang-ji.is-light')
    expect(根).toContain('.cao-di-jiang-ji.is-light .jiang-ji-yue-liang')
    expect(根).toContain('使用主题仓库')
  })

  it('部署 CSP 只允许同源连接，本地化后不再触发外链拦截', () => {
    const 配置 = readFileSync(resolve(仓库根, 'BuShu/nginx.conf'), 'utf8')
    expect(配置).toContain("connect-src 'self' blob: data:")
    expect(配置).not.toContain('unpkg.com')
  })

  it('就绪超时写入站点配置且父页超时大于背景页自检超时', () => {
    const 配置 = 读('src/config/站点配置.ts')
    expect(配置).toContain('beiJingJiuXuChaoShiHaoMiao: 35000')
    expect(配置).toContain('caoDiZhunBeiChaoShiHaoMiao: 30000')
    const 握手 = 读('public/grass-bg/scripts/block-09.js')
    expect(握手).toContain('chaoShiHaoMiao = 30000')
    expect(握手).toContain("get('zhunBeiChaoShi')")
  })

  it('场景完成门要求资源、吴昊阳、秃斑、配色与稳定帧，且不再有补草重建', () => {
    const 场景 = 读('public/grass-bg/scripts/block-08.js')
    for (const 锚 of ['__caoDiZhunBeiZhuangTai', 'jianChaZhunBei', 'wuPuShe', 'wuBare', 'zhuTi', 'chongJianCiShu', 'xuanRanZhen', 'wenDingKaiShi']) {
      expect(场景).toContain(锚)
    }
    for (const 新增 of ['caoDiJiuXu', 'caoDiKuaiZongShu', 'caoDiKuaiWenDing', 'bareYiZhuRu', 'CAO_DI_WEN_DING_CI_SHU']) {
      expect(场景).toContain(新增)
    }
    expect(场景).toContain('dengCaoDi')
    for (const 已删 of ['fillRedbox', 'fillGrass', 'buFengXi', 'paintZones', 'grassTimer', 'REDBOX_']) {
      expect(场景).not.toContain(已删)
    }
    expect(场景).toContain("ziYuan.on('ready'")
  })

  it('主题同步改为材质创建即上色，不再全场景 400ms 轮询', () => {
    const 主题 = 读('public/grass-bg/scripts/block-05.js')
    expect(主题).toContain('__caoDiTongBuZhuTi')
    expect(主题).toContain('__caoDiZhuTiJiuXu')
    expect(主题).toContain('材质表.push')
    expect(主题).toContain('d.initialized = true')
    expect(主题).not.toContain('setInterval(syncTheme, 400)')
  })

  it('预热完成后父页才显示 iframe，再由父页启动波浪开场', () => {
    const 揭示 = 读('public/grass-bg/scripts/block-06.js')
    const 握手 = 读('public/grass-bg/scripts/block-09.js')
    const 根 = 读('src/根组件.vue')
    expect(揭示).toContain('cao-di-jiu-xu')
    expect(揭示).toContain('cao-di-ke-bo-fang')
    expect(揭示).toContain('grass-wave-start')
    expect(揭示).toContain('grass-reveal-finish')
    expect(揭示).toContain('jieShiChaoShi')
    expect(揭示).toContain('yuReHaoMiao')
    expect(揭示).toContain('setProgress')
    expect(揭示).toContain('uProgress')
    expect(揭示).toContain("sheZhiXianJing(1)")
    expect(揭示).not.toContain('uLineGlowIntensity')
    expect(揭示).not.toContain('sheZhiXianJing(0.5)')
    expect(揭示).not.toContain('sheZhiGuang')
    expect(揭示).toContain('__yiPangLu')
    expect(揭示).toContain('kanShouShuiCaiLvJing')
    expect(揭示).toContain('material.visible')
    expect(揭示).not.toContain('grass-reveal-start')
    expect(揭示).not.toContain('revealMesh.startReveal')
    expect(握手).toContain('cao-di-ke-bo-fang')
    expect(握手).toContain("tongZhi('ke-bo-fang'")
    expect(握手).toContain("tongZhi('jie-shi-wan-cheng'")
    expect(根).toContain("shuJu.zhuangTai === 'ke-bo-fang'")
    expect(根).toContain('xianShiBingBoFang')
    expect(根).toContain("type: 'grass-wave-start'")
    expect(根).toContain('beiJingYuReChaoShiHaoMiao')
    expect(根).toContain('beiJingJieShiChaoShiHaoMiao')
    expect(根).not.toContain('qiDongCaoDiJieShi')
    expect(根).not.toContain("type: 'grass-reveal-start'")
  })

  it('波浪开始前 iframe 保持隐藏，开始后才置 is-active；完成只做收尾', () => {
    const 根 = 读('src/根组件.vue')
    const 显示函数 = 根.indexOf('function xianShiBingBoFang')
    const 开始等待 = 根.indexOf('function kaiShiBoFangDengDai')
    expect(显示函数).toBeGreaterThan(-1)
    expect(开始等待).toBeGreaterThan(-1)
    const 显示段 = 根.slice(显示函数, 开始等待)
    expect(显示段).toContain('beiJingJiuXu.value = true')
    expect(显示段).toContain('faBoFangKaiShi()')
    expect(显示段).toContain('beiJingJieShiChaoShiHaoMiao')
    const 完成段 = 根.slice(根.indexOf("if (shuJu.zhuangTai === 'jie-shi-wan-cheng')"), 根.indexOf("if (shuJu.zhuangTai === 'shi-bai')"))
    expect(完成段).toContain('qingLiBoFangDengDai()')
    expect(完成段).not.toContain('xianShiBingBoFang()')
  })

  it('波浪开场的预热/显示/安全超时参数都来自站点配置', () => {
    const 配置 = 读('src/config/站点配置.ts')
    const 地址 = 读('src/utils/CaoDiBeiJing.ts')
    expect(配置).toContain('caoDiJieShiChaoShiHaoMiao: 8000')
    expect(配置).toContain('caoDiYuReHaoMiao: 250')
    expect(配置).toContain('beiJingJieShiChaoShiHaoMiao: 10000')
    expect(配置).toContain('beiJingYuReChaoShiHaoMiao: 3000')
    expect(地址).toContain('yuReHaoMiao')
    expect(地址).toContain('jieShiChaoShi')
  })

  it('揭示中泥土色在 createMaterial 同步写入后立刻恢复主题色', () => {
    const 主题 = 读('public/grass-bg/scripts/block-05.js')
    expect(主题).toContain('queueMicrotask')
    expect(主题).toContain('Promise.resolve().then')
    expect(主题).toContain('应用草地材质')
  })
})

describe('FP-02 首访紫色卡屏：握手失败后的自恢复', () => {
  it('超时报失败后不停止轮询，引擎晚就绪时补发就绪通知', () => {
    vi.useFakeTimers()
    try {
      const 握手源码 = 读('public/grass-bg/scripts/block-09.js')
      const 收到: Array<{ source: string; zhuangTai: string; yuanYin?: string }> = []
      const 假画布 = { addEventListener: vi.fn() }
      const 假父页 = {
        postMessage: vi.fn((xinXi: { source: string; zhuangTai: string }) => {
          收到.push(xinXi)
        }),
      }
      const 假窗口: Record<string, unknown> = {
        parent: 假父页,
        location: { origin: 'http://localhost:5173' },
        WebGLRenderingContext: function LinShi() {},
        addEventListener: vi.fn(),
        __dcm: undefined,
        __experience: undefined,
      }
      new Function('window', 握手源码)(假窗口)
      vi.advanceTimersByTime(30100)
      const shiBai = 收到.find((xinXi) => xinXi.zhuangTai === 'shi-bai')
      expect(shiBai?.yuanYin).toBe('chao-shi')
      假窗口.__caoDiZhunBeiZhuangTai = { zhunBei: true, jieDuan: 'jiuXu' }
      假窗口.__dcm = {}
      假窗口.__experience = {
        engine: {
          renderer: { instance: { render: vi.fn() } },
          camera: {},
          canvas: 假画布,
        },
      }
      vi.advanceTimersByTime(2000)
      expect(收到.some((xinXi) => xinXi.zhuangTai === 'jiu-xu')).toBe(true)
      expect(收到[收到.length - 1]?.zhuangTai).toBe('jiu-xu')
    } finally {
      vi.useRealTimers()
    }
  })

  it('就绪晚到时渲染器包装只生效一次且暂停指令仍被尊重', () => {
    vi.useFakeTimers()
    try {
      const 握手源码 = 读('public/grass-bg/scripts/block-09.js')
      const 收到: Array<{ zhuangTai: string }> = []
      const yuanShiXuanRan = vi.fn()
      const xuanRanQi = { render: yuanShiXuanRan }
      const 假画布 = { addEventListener: vi.fn() }
      const 假窗口: Record<string, unknown> = {
        parent: {
          postMessage: vi.fn((xinXi: { zhuangTai: string }) => {
            收到.push(xinXi)
          }),
        },
        location: { origin: 'http://localhost:5173' },
        WebGLRenderingContext: function LinShi() {},
        addEventListener: vi.fn(),
        __dcm: {},
        __caoDiZhunBeiZhuangTai: { zhunBei: true, jieDuan: 'jiuXu' },
        __experience: { engine: { renderer: { instance: xuanRanQi }, camera: {}, canvas: 假画布 } },
      }
      new Function('window', 握手源码)(假窗口)
      vi.advanceTimersByTime(300)
      expect(收到.some((xinXi) => xinXi.zhuangTai === 'jiu-xu')).toBe(true)
      xuanRanQi.render()
      expect(yuanShiXuanRan).toHaveBeenCalledTimes(1)
      假窗口.__caoDiZanTing = true
      xuanRanQi.render()
      expect(yuanShiXuanRan).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('父页在超时、失败、加载错误三条路径上统一走重载重试', () => {
    const 根 = 读('src/根组件.vue')
    expect(根).toContain('function chongShiBeiJingJiaZai(): void')
    expect(根).toContain('if (!beiJingChangJingYiJiuXu) chongShiBeiJingJiaZai()')
    expect(根).toMatch(/zhuangTai === 'shi-bai'[\s\S]{0,260}chongShiBeiJingJiaZai\(\)/)
    expect(根).toMatch(/function chuLiBeiJingJiaZaiShiBai\(\) \{\s*chongShiBeiJingJiaZai\(\)\s*\}/)
    expect(根).toContain('beiJingChongShiCiShu.value >= caoDiPeiZhi.beiJingZuiDaChongShiCiShu')
    expect(根).toContain('yingJiaZaiBeiJing.value = false')
    expect(根).not.toContain('if (!beiJingJiuXu.value) beiJingShiBai.value = true')
  })

  it('预缓存清单排除按需加载的 grass-bg 资源目录', () => {
    const 配置 = 读('vite.config.ts')
    expect(配置).toContain("globIgnores: ['grass-bg/**']")
    expect(配置).toContain("globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}']")
  })
})
