import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync, readdirSync } from 'fs'
import { resolve, relative, sep } from 'path'
import 主页内容 from '@/views/主页内容.vue'
import 模式卡 from '@/components/模式卡.vue'
import { huoQuFanYi } from '@/config/translations'
import { 声明块清单, 按档解析全部 } from './主题令牌真源'
import { 规则清单 } from './CSS级联真源'

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))

vi.mock('/favicon.svg', () => ({ default: '/favicon.svg' }))

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: 主页内容 },
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      {
        path: '/profile-setup',
        name: 'ziLiaoSheZhi',
        component: { template: '<div>资料设置</div>' },
      },
      {
        path: '/tiao-zhan',
        name: 'tiaoZhanZhuYe',
        component: { template: '<div>挑战主页</div>' },
      },
    ],
  })
}

describe('主页内容组件', () => {
  let huiFuTuPianJiaZai: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  afterEach(() => {
    if (huiFuTuPianJiaZai) {
      huiFuTuPianJiaZai()
      huiFuTuPianJiaZai = null
    }
  })

  function pingBiTuPianJiaZai() {
    const YuanShiImage = window.Image
    class JiaImage {
      src = ''
      alt = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    }
    vi.stubGlobal('Image', JiaImage)
    return () => {
      vi.stubGlobal('Image', YuanShiImage)
    }
  }

  async function mountZuJian() {
    huiFuTuPianJiaZai = pingBiTuPianJiaZai()
    const luYou = chuangJianLuYou()
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(主页内容, {
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    })
    await luYou.isReady()
    await flushPromises()
    return { wrapper, luYou }
  }

  it('渲染普通模式和挑战模式两个入口元素', async () => {
    const { wrapper } = await mountZuJian()

    const putongWenBen = huoQuFanYi('zhuYe', 'putongMoShi')
    const tiaozhanWenBen = huoQuFanYi('zhuYe', 'tiaoZhanMoShi')

    const putongKapian = wrapper.find('.putong-moshi-kapian')
    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')

    expect(putongKapian.exists()).toBe(true)
    expect(tiaozhanKapian.exists()).toBe(true)
    expect(putongKapian.text()).toContain(putongWenBen)
    expect(tiaozhanKapian.text()).toContain(tiaozhanWenBen)
  })

  it('挑战模式入口隐藏“排位赛”标签', async () => {
    const { wrapper } = await mountZuJian()

    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')
    const paiWeiSaiWenBen = huoQuFanYi('zhuYe', 'paiWeiSaiBiaoQian')

    expect(tiaozhanKapian.text()).not.toContain(paiWeiSaiWenBen)
    expect(tiaozhanKapian.find('.tiaozhan-zhuangtai-biaoqian').exists()).toBe(false)
  })

  it('点击普通模式入口跳转到资料设置向导路径', async () => {
    const { wrapper, luYou } = await mountZuJian()

    const putongKapian = wrapper.find('.putong-moshi-kapian')
    await putongKapian.trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/profile-setup')
    expect(luYou.currentRoute.value.query.moshi).toBe('putong')
  })

  it('点击挑战模式入口跳转到挑战主页', async () => {
    const { wrapper, luYou } = await mountZuJian()

    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')
    await tiaozhanKapian.trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/tiao-zhan')
  })

  it('主页不再包含角色静态展示层', async () => {
    const { wrapper } = await mountZuJian()

    expect(wrapper.find('.juese-tupian').exists()).toBe(false)
    expect(wrapper.find('.juese-zhanshi-qu').exists()).toBe(false)
  })

  describe('FP-01 主页净化：无罩染无底板，草地直透', () => {
    const zhuYeYuanMa = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')

    it('无染色罩层元素与样式，根容器透明', async () => {
      const { wrapper } = await mountZuJian()
      expect(wrapper.find('.zhuye-ranse').exists()).toBe(false)
      expect(zhuYeYuanMa).not.toContain('zhuye-ranse')
      expect(zhuYeYuanMa).not.toContain('ranSeLeiMing')
      expect(zhuYeYuanMa).toContain('background: transparent')
    })

    it('无备案页脚引用', async () => {
      const { wrapper } = await mountZuJian()
      expect(wrapper.text()).not.toContain('备案进行中')
      expect(zhuYeYuanMa).not.toContain('BeiAnYeJiao')
    })
  })

  describe('FP-03 开始体验深色hover同色', () => {
    const zhuYeYuanMa = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')
    const bianLiangCss = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')

    it('开始体验文案走translations无硬编码', async () => {
      const { wrapper } = await mountZuJian()
      expect(zhuYeYuanMa).toContain("huoQuFanYi('zhuYe', 'kaiShiTiYan')")
      expect(zhuYeYuanMa).toContain("huoQuFanYi('zhuYe', 'jieShouTiaoZhan')")
      expect(wrapper.find('.kaishi-wenben').exists()).toBe(true)
      expect(wrapper.text()).toContain(huoQuFanYi('zhuYe', 'kaiShiTiYan'))
      expect(wrapper.text()).toContain(huoQuFanYi('zhuYe', 'jieShouTiaoZhan'))
    })

    it('开始文本与箭头使用设计令牌单源', () => {
      expect(zhuYeYuanMa).toContain('color: var(--kapian-mian-zhengwen)')
      expect(zhuYeYuanMa).toContain(
        'color: color-mix(in srgb, var(--moshi-kapian-zhu) 72%, transparent)',
      )
      expect(bianLiangCss).toContain('--moshi-kapian-zheyan:')
    })

    it('模式卡文字不再使用低透明度主题色', () => {
      expect(zhuYeYuanMa).not.toContain('--zhuye-kaishi-wenben')
      expect(zhuYeYuanMa).not.toContain('--zhuye-kaishi-jiantou')
      expect(bianLiangCss).not.toContain('--zhuye-kaishi-')
      expect(zhuYeYuanMa).not.toContain('#e84a7a')
    })

    it('hover仅位移无颜色闪烁', () => {
      expect(zhuYeYuanMa).toContain('.moshi-kapian:hover:not(:disabled) .kaishi-jiantou')
      expect(zhuYeYuanMa).toMatch(
        /\.moshi-kapian:hover:not\(:disabled\) \.kaishi-jiantou\s*\{[^}]*transform:\s*translateX\(4px\)/,
      )
      expect(zhuYeYuanMa).toMatch(
        /\.kaishi-jiantou\s*\{[^}]*transition:\s*transform var\(--moshi-kapian-dong-xiao\)/,
      )
      expect(zhuYeYuanMa).not.toMatch(/\.yulan-xiangmu-\d\s*\{[^}]*transition-delay/)
    })
  })

  describe('FP-09 模式卡组件状态与源码清单', () => {
    const srcDir = resolve(__dirname, '..')

    function 收集源码(目录: string): string[] {
      return readdirSync(目录, { withFileTypes: true }).flatMap((项) => {
        const 路径 = resolve(目录, 项.name)
        if (项.isDirectory()) return 收集源码(路径)
        return ['.vue', '.ts', '.css', '.js'].some((后缀) => 项.name.endsWith(后缀)) ? [路径] : []
      })
    }

    function 挂载模式卡(属性: Record<string, unknown> = {}) {
      return mount(模式卡, {
        props: 属性,
        slots: { default: '<span class="kapian-neirong">模式卡内容</span>' },
        attachTo: document.body,
      })
    }

    it('源码清单只允许共享组件、主题令牌和主页两张实例，普通与挑战均使用共享类', () => {
      const 文件清单 = 收集源码(srcDir)
        .map((路径) => relative(srcDir, 路径).split(sep).join('/'))
        .filter((路径) => !路径.startsWith('__tests__/'))
      const 含模式卡类 = 文件清单.filter((路径) =>
        readFileSync(resolve(srcDir, 路径), 'utf8').includes('moshi-kapian'),
      )
      expect(含模式卡类.sort()).toEqual([
        'components/模式卡.vue',
        'styles/variables.css',
        'views/主页内容.vue',
      ])

      const 主页模板 = readFileSync(resolve(srcDir, 'views/主页内容.vue'), 'utf8').match(
        /<template>([\s\S]*?)<\/template>/,
      )?.[1]
      const 实例 = [...(主页模板 ?? '').matchAll(/<MoShiKa\b[^>]*class="([^"]+)"/g)]
      expect(实例).toHaveLength(2)
      expect(实例.map((项) => 项[1])).toEqual([
        'moshi-kapian putong-moshi-kapian',
        'moshi-kapian tiaozhan-moshi-kapian',
      ])
    })

    it('空图直接使用可读纯色层，图片加载与失败状态不会移除入口', async () => {
      const 空图 = 挂载模式卡({ beiJingTu: '   ' })
      expect(空图.attributes('data-beijing-zhuangtai')).toBe('empty')
      expect(空图.find('img').exists()).toBe(false)
      expect(空图.text()).toContain('模式卡内容')

      const 空值 = 挂载模式卡({ beiJingTu: null })
      expect(空值.attributes('data-beijing-zhuangtai')).toBe('empty')

      const 加载 = 挂载模式卡({ beiJingTu: '/images/mode.webp' })
      expect(加载.attributes('data-beijing-zhuangtai')).toBe('loading')
      await 加载.find('img').trigger('load')
      expect(加载.attributes('data-beijing-zhuangtai')).toBe('loaded')

      const 失败 = 挂载模式卡({ beiJingTu: '/images/mode.webp' })
      await 失败.find('img').trigger('error')
      expect(失败.attributes('data-beijing-zhuangtai')).toBe('failed')
      expect(失败.find('.kapian-neirong').exists()).toBe(true)
      expect(失败.attributes('disabled')).toBeUndefined()
    })

    it('disabled 与显式 loading 阻止重复选择，启用态可键盘聚焦并发出选择事件', async () => {
      const 禁用 = 挂载模式卡({ jinyong: false, jiaZaiZhong: true })
      expect(禁用.element.tagName).toBe('BUTTON')
      expect(禁用.attributes('type')).toBe('button')
      expect(禁用.attributes('disabled')).toBeDefined()
      expect(禁用.attributes('aria-busy')).toBe('true')
      await 禁用.trigger('click')
      expect(禁用.emitted('xuanZe')).toBeUndefined()

      const 启用 = 挂载模式卡()
      const 按钮 = 启用.get('button')
      按钮.element.focus()
      expect(document.activeElement).toBe(按钮.element)
      await 按钮.trigger('click')
      expect(启用.emitted('xuanZe')).toHaveLength(1)
    })

    it('背景层动效限定 opacity 且为 240ms，并在 reduced-motion 下关闭', () => {
      const 组件源码 = readFileSync(resolve(srcDir, 'components/模式卡.vue'), 'utf8')
      expect(组件源码).toContain(
        'transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun)',
      )
      expect(组件源码).toContain('background-color: var(--moshi-kapian-zheyan)')
      expect(组件源码).toContain(':slotted(*)')
      expect(组件源码).not.toMatch(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/i)
      expect(组件源码).toContain(".moshi-kapian[data-beijing-zhuangtai='loaded']")
      expect(组件源码).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/)
    })
  })
})

describe('FP-17a 主页 hero 局部可读表面', () => {
  type RGB = [number, number, number]
  type 色 = { rgb: RGB; alpha: number }
  type 主题档 = 'light' | 'dark'

  const 源码 = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')
  const 样式 = [...源码.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((项) => 项[1]).join('\n')
  const 规则们 = 规则清单(样式)
  const 令牌们 = 声明块清单()
  const 表面选择器 = ['.biaoti-neirong', '.qinggan-neirong-ceng']
  const 文字选择器 = ['.biaoti-wenzi', '.biaoti-zhushi', '.pinpai-mingcheng', '.zuoce-slogan']

  function 声明(选择器: string, 属性: string): string {
    const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has(属性))
    expect(命中.length, `${选择器}{${属性}} 应至少有一处声明`).toBeGreaterThan(0)
    return 命中[0].声明.get(属性) as string
  }

  function 取值(档: 主题档, 令牌: string): string {
    const 值 = 按档解析全部(档, 令牌们).get(令牌)
    expect(值, `${档} 档缺少 ${令牌}`).toBeDefined()
    return (值 as string).trim()
  }

  function 解析色(值: string): 色 {
    const rgb = 值.match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/,
    )
    if (rgb) {
      return {
        rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] as RGB,
        alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
      }
    }
    const hex = 值.match(/^#([0-9a-f]{6})$/i)
    if (!hex) throw new Error(`无法解析颜色：${值}`)
    return {
      rgb: [
        Number.parseInt(hex[1].slice(0, 2), 16),
        Number.parseInt(hex[1].slice(2, 4), 16),
        Number.parseInt(hex[1].slice(4, 6), 16),
      ],
      alpha: 1,
    }
  }

  function 压合(前景: RGB, alpha: number, 底: RGB): RGB {
    return [0, 1, 2].map((下标) => 前景[下标] * alpha + 底[下标] * (1 - alpha)) as RGB
  }

  function 亮度(色值: RGB): number {
    const 线性 = (值: number) => {
      const v = 值 / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * 线性(色值[0]) + 0.7152 * 线性(色值[1]) + 0.0722 * 线性(色值[2])
  }

  function 对比度(甲: RGB, 乙: RGB): number {
    const a = 亮度(甲)
    const b = 亮度(乙)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }

  it('标题与左侧文案复用模式卡 0.75 局部 scrim，窄屏不溢出且装饰层不拦点击', () => {
    for (const 选择器 of 表面选择器) {
      expect(声明(选择器, 'background-color')).toBe('var(--moshi-kapian-zheyan)')
      expect(声明(选择器, 'background-image')).toBe('none')
      expect(声明(选择器, 'backdrop-filter')).toBe('var(--boli-mohu)')
      expect(声明(选择器, 'border')).toBe('1px solid var(--kapian-mian-biankuang)')
      expect(声明(选择器, 'border-radius')).toBe('var(--yuanjiao-da)')
    }
    expect(声明('.biaoti-neirong', 'max-width')).toBe('100%')
    expect(声明('.qinggan-neirong-ceng', 'width')).toBe('100%')
    expect(声明('.qinggan-neirong-ceng', 'max-width')).toBe('420px')
    for (const 选择器 of 文字选择器) expect(声明(选择器, 'color')).toBe('var(--wenben-zhuse)')
    expect(
      规则们.some((项) =>
        表面选择器.some(
          (选择器) =>
            (项.选择器.includes(选择器) || 项.选择器.startsWith(`${选择器}:`)) &&
            (项.选择器.includes('::') ||
              项.声明.has('pointer-events') ||
              项.声明.has('animation') ||
              项.声明.has('transition')),
        ),
      ),
      'scrim 必须自身绘制，不得借伪元素/独立层拦截点击或引入额外运动',
    ).toBe(false)
    expect(
      规则们.some(
        (项) =>
          项.选择器 === '.biaoti-neirong' &&
          (项.声明.get('display') === 'none' || 项.声明.get('background-color') === 'transparent'),
      ),
    ).toBe(false)
    const 左侧表面撤除 = 规则们.some(
      (项) =>
        项.选择器 === '.qinggan-neirong-ceng' && 项.声明.get('background-color') === 'transparent',
    )
    const 左侧文案窄屏隐藏 = ['.pinpai-qu', '.zuoce-slogan'].every((选择器) =>
      规则们.some((项) => 项.选择器 === 选择器 && 项.声明.get('display') === 'none'),
    )
    expect(左侧表面撤除, '文案隐藏后仍保留空表面会多出一条无用色带').toBe(左侧文案窄屏隐藏)
    expect(
      规则们.some(
        (项) =>
          项.选择器 === '.zuo-ce-qinggan-qu' &&
          ['background', 'background-color', 'background-image'].some((属性) => 项.声明.has(属性)),
      ),
    ).toBe(false)
    expect(声明('.zhuye-quyu', 'background')).toBe('transparent')
  })

  it('浅深 scrim 对纯色极端背景均 ≥4.5:1，且与模式卡同取 0.75 令牌', () => {
    for (const 档 of ['light', 'dark'] as 主题档[]) {
      const 表面 = 解析色(取值(档, '--moshi-kapian-zheyan'))
      const 字色 = 解析色(取值(档, '--wenben-zhuse'))
      expect(表面.alpha).toBe(0.75)
      for (const 背景 of [
        [0, 0, 0],
        [255, 255, 255],
      ] as RGB[]) {
        const 面板 = 压合(表面.rgb, 表面.alpha, 背景)
        expect(对比度(字色.rgb, 面板), `${档} 档极值背景`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
