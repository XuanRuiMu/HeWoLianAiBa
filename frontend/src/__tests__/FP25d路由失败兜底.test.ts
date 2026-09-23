import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { mount, flushPromises } from '@vue/test-utils'
import type { Component } from 'vue'
import type { Router } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import { sheZhiCuoWuShangBaoHanShu, chongZhiCuoWuShangBaoZhuangTai } from '@/utils/错误上报'
import {
  fenLeiLuYouCuoWu,
  jiaZaiShiBaiLuYou,
  jiaZaiShiBaiLuYouMing,
  qieDaoJiaZaiShiBaiYe,
  zhuCeLuYouCuoWuChuLi,
} from '@/router/错误处理'

const 源目录 = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 盲区审计 M-4 守卫：`router.isReady()` 的失败路径。
 * 改前 `void router.isReady().then(() => app.mount('#app'))` 无 catch，且全库无 router.onError
 * ⇒ 懒载分块拉不到（弱网 / 发版换 hash）时 #app 里什么都不长出来，失败面从「局部渲染错误」
 * 升级为「整站永久空白」。这里钉四件事：
 *  ① isReady reject ⇒ 仍然挂载（不白屏）+ 落到静态失败页（复用既有错误边界与既有翻译键）；
 *  ② 分块错误与一般错误分判（文案不同、上报类别不同），两类都不静默；
 *  ③ 绝不自动 location.reload（刷新风暴），刷新只能由用户点按钮触发；
 *  ④ 失败页不出现 chunk 文件名/路径等内部实现细节。
 */

const 记录 = vi.hoisted(() => ({
  事件: [] as string[],
  挂载参数: [] as unknown[],
  应用占位: { name: 'AppZhanWei' },
  释放就绪: null as null | (() => void),
  拒绝就绪: null as null | ((原因: unknown) => void),
  当前路由名: null as null | string,
  替换: [] as unknown[],
}))

vi.mock('vue', async (原样) => {
  const 真实 = await 原样<typeof import('vue')>()
  return {
    ...真实,
    // 只对 main.ts 的根组件（App 占位）返回假应用以记录 mount；其余（@vue/test-utils 的
    // mount、错误边界自身的 ref/computed）一律走真实 vue，否则本文件的渲染断言无从谈起。
    createApp: (组价: unknown) => {
      if (组价 !== 记录.应用占位) return 真实.createApp(组价 as never)
      return {
        use: () => undefined,
        config: {},
        mount: (容器: unknown) => {
          记录.事件.push('mount')
          记录.挂载参数.push(容器)
          return {}
        },
      }
    },
  }
})

vi.mock('../App.vue', () => ({ default: 记录.应用占位 }))

vi.mock('../router', () => ({
  default: {
    isReady: () =>
      new Promise<void>((解决, 拒绝) => {
        记录.释放就绪 = 解决
        记录.拒绝就绪 = 拒绝
      }),
    beforeEach: () => () => undefined,
    onError: () => () => undefined,
    get currentRoute() {
      return { value: { name: 记录.当前路由名 } }
    },
    replace: (目标: unknown) => {
      记录.替换.push(目标)
      return Promise.resolve()
    },
  },
}))

vi.mock('pinia', () => ({ createPinia: () => ({}) }))
vi.mock('../stores/主题', () => ({
  使用主题仓库: () => ({
    chuShiHua: () => {
      记录.事件.push('主题初始化')
    },
  }),
}))
vi.mock('../utils/性能监控', () => ({ chuShiHuaXingNengJianKong: () => undefined }))
vi.mock('../utils/teZhengKaiGuan', () => ({ laQuTeZhengKaiGuan: () => undefined }))
vi.mock('../utils/sanWei', () => ({}))

const 分块错样本 = [
  'Loading chunk 42 failed.\n(undefined: http://localhost/assets/liaoTianYeMian-Cz9kq2.js)',
  new Error('Failed to fetch dynamically imported module: http://localhost/assets/liaoTianYeMian-Cz9kq2.js'),
  new Error('error loading dynamically imported module: /assets/liaoTianYeMian-Cz9kq2.js'),
  Object.assign(new Error('boom'), { name: 'ChunkLoadError' }),
  new Error('Unable to preload CSS for /assets/liaoTianYeMian-Cz9kq2.css'),
]

const 一般错样本 = [
  new Error('守卫里抛的错'),
  new TypeError('x is not a function'),
  'bare string',
  undefined,
  null,
  {},
]

function quDiaoZhuShi(yuanMa: string): string {
  return yuanMa
    .split('\n')
    .filter((行) => !/^\s*(\/\/|\*|\/\*)/.test(行))
    .join('\n')
}

function jiaLuYouShiLi(当前路由名: string | null = null) {
  const 替换: unknown[] = []
  const 实例 = {
    currentRoute: { value: { name: 当前路由名 } },
    replace: (目标: unknown) => {
      替换.push(目标)
      return Promise.resolve()
    },
  }
  return { 替换, 实例: 实例 as unknown as Router }
}

function 失败页组件(): Component {
  return jiaZaiShiBaiLuYou.component as unknown as Component
}

async function 推进毫秒(毫秒: number): Promise<void> {
  await new Promise((解决) => setTimeout(解决, 毫秒))
}

describe('M-4 路由错误分类', () => {
  it('分块/懒载失败五种形态全部判为 chunk', () => {
    for (const 样本 of 分块错样本) {
      expect(fenLeiLuYouCuoWu(样本), `chunk 漏判：${String(样本)}`).toBe('chunk')
    }
  })

  it('一般错误（含 undefined/null/裸对象）判为 yiban，不得混进 chunk', () => {
    for (const 样本 of 一般错样本) {
      expect(fenLeiLuYouCuoWu(样本), `chunk 误判：${String(样本)}`).toBe('yiban')
    }
  })

  it('两类必须不同判（分类器退化为常量即红）', () => {
    expect(fenLeiLuYouCuoWu(分块错样本[1])).not.toBe(fenLeiLuYouCuoWu(一般错样本[0]))
  })
})

describe('M-4 失败态切换：上报 + 静态失败页 + 禁自动刷新', () => {
  let 刷新: ReturnType<typeof vi.fn>
  let 上报: ReturnType<typeof vi.fn>

  beforeEach(() => {
    刷新 = vi.fn()
    vi.stubGlobal('location', { reload: 刷新, href: 'http://localhost/login' })
    上报 = vi.fn()
    sheZhiCuoWuShangBaoHanShu(上报)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sheZhiCuoWuShangBaoHanShu(null)
    chongZhiCuoWuShangBaoZhuangTai()
  })

  it('chunk 错 ⇒ 上报类别 ziYuan、切到失败路由、全程不自动 reload', async () => {
    const { 替换, 实例 } = jiaLuYouShiLi()
    await qieDaoJiaZaiShiBaiYe(实例, 分块错样本[1])
    expect(替换).toEqual([{ name: jiaZaiShiBaiLuYouMing }])
    const 参数 = 上报.mock.calls[0][0] as { leiBie: string; fuJia: { luYouShiBaiLeiXing: string } }
    expect(参数.leiBie).toBe('ziYuan')
    expect(参数.fuJia.luYouShiBaiLeiXing).toBe('chunk')
    expect(刷新, '自动刷新 ⇒ 弱网/发版窗口下的刷新风暴').not.toHaveBeenCalled()
  })

  it('一般错 ⇒ 上报类别 weiZhi、同样切失败页（不静默吞掉）', async () => {
    const { 替换, 实例 } = jiaLuYouShiLi()
    await qieDaoJiaZaiShiBaiYe(实例, new Error('守卫炸了'))
    expect(替换).toEqual([{ name: jiaZaiShiBaiLuYouMing }])
    expect((上报.mock.calls[0][0] as { leiBie: string }).leiBie).toBe('weiZhi')
    expect(刷新).not.toHaveBeenCalled()
  })

  it('已在失败页 ⇒ 后续错误不再导航（禁失败页自循环）', async () => {
    const { 替换, 实例 } = jiaLuYouShiLi(jiaZaiShiBaiLuYouMing)
    await qieDaoJiaZaiShiBaiYe(实例, 分块错样本[0])
    expect(替换).toEqual([])
    expect(上报).toHaveBeenCalledOnce()
  })

  it('同一错误对象经 onError 与 isReady.catch 双通道 ⇒ 只上报一次', async () => {
    const { 实例 } = jiaLuYouShiLi()
    const 同一个错 = 分块错样本[1]
    await qieDaoJiaZaiShiBaiYe(实例, 同一个错)
    await qieDaoJiaZaiShiBaiYe(实例, 同一个错)
    expect(上报).toHaveBeenCalledOnce()
  })

  it('replace 自身再失败 ⇒ 不抛到调用方（异常不致页面崩死）', async () => {
    const 实例 = {
      currentRoute: { value: { name: null } },
      replace: () => Promise.reject(new Error('导航也炸了')),
    } as unknown as Router
    await expect(qieDaoJiaZaiShiBaiYe(实例, 一般错样本[0])).resolves.toBeUndefined()
  })
})

describe('M-4 失败页呈现：可读、分类型可行动、不泄内部实现', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sheZhiCuoWuShangBaoHanShu(null)
  })

  it('chunk 态 ⇒ 复用错误边界 + 网络类文案 + 刷新按钮，且不出现 chunk 文件名', async () => {
    const { 实例 } = jiaLuYouShiLi()
    await qieDaoJiaZaiShiBaiYe(实例, 分块错样本[1])
    const wrapper = mount(失败页组件())
    await flushPromises()
    expect(wrapper.find('.cuowu-tishi').exists(), '失败态未渲染 ⇒ 等同白屏').toBe(true)
    expect(wrapper.find('.cuowu-biaoti').text()).toBe(huoQuFanYi('tongYong', 'cuoWuBianJie'))
    expect(wrapper.find('.cuowu-miaoshu').text()).toBe(huoQuFanYi('tongYong', 'wangLuoCuoWu'))
    expect(wrapper.find('.shuaxin-anniu').exists()).toBe(true)
    const 全文 = wrapper.text()
    expect(全文).not.toContain('liaoTianYeMian-Cz9kq2')
    expect(全文).not.toContain('/assets/')
    expect(全文).not.toContain('dynamically imported')
    wrapper.unmount()
  })

  it('一般错态 ⇒ 描述为渲染异常文案（与 chunk 态不同判才成立）', async () => {
    const { 实例 } = jiaLuYouShiLi()
    await qieDaoJiaZaiShiBaiYe(实例, new TypeError('守卫炸了'))
    const wrapper = mount(失败页组件())
    await flushPromises()
    expect(wrapper.find('.cuowu-miaoshu').text()).toBe(
      huoQuFanYi('tongYong', 'cuoWuBianJieTiShi'),
    )
    wrapper.unmount()
  })

  it('失败页隐藏「清除错误」（清了只会剩空壳），刷新只由用户点击触发一次', async () => {
    const 刷新 = vi.fn()
    vi.stubGlobal('location', { reload: 刷新, href: 'http://localhost/login' })
    const { 实例 } = jiaLuYouShiLi()
    await qieDaoJiaZaiShiBaiYe(实例, 分块错样本[1])
    const wrapper = mount(失败页组件())
    await flushPromises()
    expect(wrapper.find('.chongzhi-anniu').exists()).toBe(false)
    expect(刷新, '挂载即自动刷新 ⇒ 刷新风暴').not.toHaveBeenCalled()
    await wrapper.find('.shuaxin-anniu').trigger('click')
    expect(刷新).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})

describe('M-4 onError 接线', () => {
  it('zhuCeLuYouCuoWuChuLi 装的处理器收到 chunk 错 ⇒ 分类为 chunk 并切失败页，不自动刷新', async () => {
    const 刷新 = vi.fn()
    vi.stubGlobal('location', { reload: 刷新, href: 'http://localhost/login' })
    const 上报 = vi.fn()
    sheZhiCuoWuShangBaoHanShu(上报)
    const 替换: unknown[] = []
    const 注册 = vi.fn()
    const 假路由 = {
      onError: 注册,
      currentRoute: { value: { name: null } },
      replace: (目标: unknown) => {
        替换.push(目标)
        return Promise.resolve()
      },
    }
    zhuCeLuYouCuoWuChuLi(假路由 as unknown as Router)
    expect(注册, 'onError 未注册 ⇒ 后续导航失败继续静默（M-4 原缺陷的另一半）').toHaveBeenCalledOnce()
    const 处理器 = 注册.mock.calls[0][0] as (错: unknown) => unknown
    // 全新错误对象：同对象已被上一用例的去重门记过，换对象才测得到「不静默吞掉」
    await 处理器(new Error('Failed to fetch dynamically imported module: http://localhost/assets/haoYouLiaoTian-K3d8.js'))
    expect(替换).toEqual([{ name: jiaZaiShiBaiLuYouMing }])
    expect((上报.mock.calls[0][0] as { fuJia: { luYouShiBaiLeiXing: string } }).fuJia
      .luYouShiBaiLeiXing).toBe('chunk')
    expect(刷新).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    sheZhiCuoWuShangBaoHanShu(null)
  })

  // 存在性门禁：接线一旦被拆（审计原文的「全库没有 router.onError」/「Promise 没有 catch」
  // 两种回归形态），必须没有执行者看不见它。整行注释掉的接线不算数。
  it('源码接线：router/index.ts 注册 onError，main.ts 的 isReady 有失败分支且挂载点唯一', () => {
    const luYouYuanMa = quDiaoZhuShi(readFileSync(resolve(源目录, 'router/index.ts'), 'utf8'))
    const zRuiYuanMa = quDiaoZhuShi(readFileSync(resolve(源目录, 'main.ts'), 'utf8'))
    expect(luYouYuanMa).toContain('zhuCeLuYouCuoWuChuLi(router)')
    expect(luYouYuanMa).toContain('jiaZaiShiBaiLuYou')
    expect(zRuiYuanMa).toContain('qieDaoJiaZaiShiBaiYe(')
    expect(
      (zRuiYuanMa.match(/app\.mount\(/g) ?? []).length,
      '挂载点必须唯一：失败分支复用同一函数，不另起第二处 mount',
    ).toBe(1)
  })
})

describe('M-4 main.ts 集成：isReady reject 仍挂载 + 呈现失败态', () => {
  beforeEach(() => {
    vi.resetModules()
    记录.事件.length = 0
    记录.挂载参数.length = 0
    记录.释放就绪 = null
    记录.拒绝就绪 = null
    记录.当前路由名 = null
    记录.替换.length = 0
    vi.stubGlobal(
      'fetch',
      () =>
        new Promise(() => {
          /* 永不 resolve：兜底路径同样不得等网络 */
        }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    sheZhiCuoWuShangBaoHanShu(null)
    chongZhiCuoWuShangBaoZhuangTai()
  })

  it('isReady reject ⇒ 事件序列含 mount（不白屏）、切到失败路由、无自动刷新、无未处理拒绝', async () => {
    const 刷新 = vi.fn()
    vi.stubGlobal('location', { reload: 刷新, href: 'http://localhost/login' })
    const 上报 = vi.fn()
    const 未处理拒绝 = vi.fn()
    process.on('unhandledRejection', 未处理拒绝)

    await import('../main')
    // resetModules 后 main 依赖的是新模块实例：探针必须取同一实例（并在其装好默认上报器之后覆盖）
    const 上报模块 = await import('@/utils/错误上报')
    上报模块.sheZhiCuoWuShangBaoHanShu(上报)
    expect(记录.事件).toEqual(['主题初始化'])
    const 拒绝 = 记录.拒绝就绪 as (原因: unknown) => void
    拒绝(分块错样本[1])
    await 推进毫秒(50)

    expect(记录.事件, 'isReady 失败即不挂载 ⇒ 整站永久空白（M-4 原缺陷）').toContain('mount')
    expect(记录.挂载参数).toEqual(['#app'])
    expect(记录.替换).toEqual([{ name: jiaZaiShiBaiLuYouMing }])
    expect(上报).toHaveBeenCalled()
    expect(刷新, '自动刷新 ⇒ 刷新风暴').not.toHaveBeenCalled()
    await 推进毫秒(10)
    process.off('unhandledRejection', 未处理拒绝)
    expect(未处理拒绝, 'isReady 的 Promise 必须有失败分支接住').not.toHaveBeenCalled()
  })

  it('isReady resolve ⇒ 事件序列逐字为 [主题初始化, mount]，FP-25 原判据不回退', async () => {
    const 刷新 = vi.fn()
    vi.stubGlobal('location', { reload: 刷新, href: 'http://localhost/login' })
    await import('../main')
    const 释放 = 记录.释放就绪 as () => void
    释放()
    await 推进毫秒(50)
    expect(记录.事件).toEqual(['主题初始化', 'mount'])
    expect(记录.挂载参数).toEqual(['#app'])
    expect(记录.替换, '健康路径不得被切到失败页').toEqual([])
    expect(刷新).not.toHaveBeenCalled()
  })
})

void ({} as RouteLocationAsPathGeneric)
