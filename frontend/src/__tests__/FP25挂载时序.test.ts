import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * FP-25 挂载时序守卫（jsdom 层）：`app.mount('#app')` 必须在 `router.isReady()` resolve 之后
 * 才被调用，且 resolve 之前一帧都不许挂（同步挂载 ⇒ 首帧 route.name=undefined ⇒
 * App.vue :key 翻转触发 out-in leave 的两帧门控 ⇒ 冷加载首屏空白，即 FP-25 根因）。
 *
 * 判据不是「导入没炸」式空断言：事件序列必须逐字等于 ['isReadyResolved', 'mount']，
 * 把 main.ts 改回同步 `app.mount` 则第一条断言即红（mount 先于 isReadyResolved 出现）。
 * 全链路 fetch 被钉为永不 resolve——挂载路径上任何「等网络」的退化都会把 mount 卡死而红。
 */

const 记录 = vi.hoisted(() => ({
  事件: [] as string[],
  挂载参数: [] as unknown[],
  释放就绪: null as null | (() => void),
}))

vi.mock('vue', async (原样) => {
  const 真实 = await 原样<typeof import('vue')>()
  return {
    ...真实,
    createApp: () => ({
      use: () => undefined,
      config: {},
      mount: (容器: unknown) => {
        记录.事件.push('mount')
        记录.挂载参数.push(容器)
        return {}
      },
    }),
  }
})

vi.mock('../router', () => ({
  default: {
    // 每次 isReady() 调用产生新的 pending promise：resetModules 不重跑 mock 工厂，
    // 按调用取样才能给每个测试一个独立的「释放闸门」。
    isReady: () => {
      const 就绪 = new Promise<void>((解决) => {
        记录.释放就绪 = 解决
      })
      return 就绪.then(() => {
        记录.事件.push('isReadyResolved')
      })
    },
    beforeEach: () => () => undefined,
  },
}))

vi.mock('../App.vue', () => ({ default: { name: 'AppStub' } }))
vi.mock('pinia', () => ({ createPinia: () => ({}) }))
vi.mock('../stores/主题', () => ({
  使用主题仓库: () => ({
    chuShiHua: () => {
      记录.事件.push('主题初始化')
    },
  }),
}))
vi.mock('../utils/错误上报', () => ({
  anZhuangQuanJuCuoWuJianTingQi: () => undefined,
  chuFaCuoWuShangBao: () => undefined,
  chuShiHuaCuoWuShangBao: () => undefined,
}))
vi.mock('../utils/性能监控', () => ({ chuShiHuaXingNengJianKong: () => undefined }))
vi.mock('../utils/teZhengKaiGuan', () => ({ laQuTeZhengKaiGuan: () => undefined }))
vi.mock('../utils/sanWei', () => ({}))
vi.mock('../config/translations', () => ({ huoQuFanYi: (_块: string, 键: string) => 键 }))

async function 推进毫秒(毫秒: number): Promise<void> {
  await new Promise((解决) => setTimeout(解决, 毫秒))
}

describe('FP-25 main.ts 挂载时序：mount 只在 router.isReady resolve 之后发生', () => {
  beforeEach(() => {
    vi.resetModules()
    记录.事件.length = 0
    记录.挂载参数.length = 0
    记录.释放就绪 = null
    vi.stubGlobal(
      'fetch',
      () =>
        new Promise(() => {
          /* 永不 resolve：任何挂在 mount 前的网络等待都会让门禁红 */
        }),
    )
  })

  it('router.isReady 未 resolve 前（含 50ms 宏观等待）不得挂载；resolve 后恰好挂载一次且容器为 #app，顺序逐字锁定', async () => {
    await import('../main')
    expect(typeof 记录.释放就绪).toBe('function')
    await 推进毫秒(50)
    expect(记录.事件, 'isReady 尚未 resolve 就出现 mount ⇒ 退回同步挂载，FP-25 空白回归').not.toContain('mount')
    expect(记录.挂载参数).toEqual([])

    const 释放 = 记录.释放就绪 as () => void
    释放()
    await 推进毫秒(50)
    expect(记录.事件).toEqual(['主题初始化', 'isReadyResolved', 'mount'])
    expect(记录.挂载参数).toEqual(['#app'])
  })

  it('挂载不依赖任何网络应答：version.txt/特征开关等 fetch 全部 pending 时，isReady resolve 仍立刻完成挂载', async () => {
    await import('../main')
    const 释放 = 记录.释放就绪 as () => void
    释放()
    await 推进毫秒(50)
    expect(记录.事件.filter((事) => 事 === 'mount').length, 'mount 必须恰好一次（禁双重挂载兜底）').toBe(1)
  })

  it('isReady 的 then 之前 mount 不得被同步调用（首帧 route.name 恒为 undefined 的形态即红）', async () => {
    await import('../main')
    expect(
      记录.事件.indexOf('mount'),
      '模块求值同步阶段就调用 mount ⇒ 首帧没有已解析路由，out-in 两帧门控回归',
    ).toBe(-1)
  })
})
