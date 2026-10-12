import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import 出生日期选择器 from '@/components/认证/出生日期选择器.vue'
import { huoQuFanYi } from '@/config/translations'

/**
 * FP-01 定案①：今天按钮语义 = 导航回到今天。
 * 根因（探针实测 2026-10-11）：jinRi 在 setup 期快照一次，浮层开着跨过午夜后
 * huiDaoJinRi 回的是旧今天；越界禁用只靠原生 disabled，合成事件仍能导航。
 * 本文件先红：两条都按定案口径断言，可靠导航 + 越界零副作用。
 */

const 挂载中: VueWrapper[] = []

function 挂载控件(覆盖: Record<string, string> = {}): VueWrapper {
  const wrapper = mount(出生日期选择器, {
    props: {
      modelValue: '',
      idQianZhui: 'zhuce-chushengriqi',
      zuiXiao: '1900-01-01',
      zuiDa: '2099-12-31',
      ...覆盖,
    },
    attachTo: document.body,
  })
  挂载中.push(wrapper)
  return wrapper
}

async function 稳定(): Promise<void> {
  await flushPromises()
  await nextTick()
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0)
  else await new Promise((解决) => setTimeout(解决, 0))
}

function 今天钮(): HTMLButtonElement {
  const 命中 = [...document.querySelectorAll<HTMLButtonElement>('.rili-jiao-bu-anniu')].find(
    (anNiu) => anNiu.textContent?.trim() === huoQuFanYi('ui', 'riQiJinRi'),
  )
  expect(命中, '浮层里找不到今天按钮').toBeDefined()
  return 命中 as HTMLButtonElement
}

function 年月(): string {
  return document.querySelector('.rili-nian-yue')?.textContent ?? ''
}

function 光标名(): string | null | undefined {
  return document
    .querySelector('.rili-ri[data-jiao-dian="true"]')
    ?.getAttribute('aria-label')
}

afterEach(() => {
  while (挂载中.length > 0) 挂载中.pop()?.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('FP-01 定案①：今天按钮跨月可靠回到今天并移动焦点', () => {
  it('浮层开着跨过午夜后，今天按钮回的是新今天而非 setup 快照', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1995, 2, 7, 12, 0, 0))
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    await wrapper.find('.rili-da-kai').trigger('click')
    await 稳定()
    expect(年月()).toBe('1995年3月')

    vi.setSystemTime(new Date(1995, 2, 8, 0, 0, 1))
    今天钮().click()
    await 稳定()

    expect(年月()).toBe('1995年3月')
    expect(光标名()).toBe(
      `${huoQuFanYi('ui', 'riQiJinRi')} 1995${huoQuFanYi('ui', 'riQiNian')}3${huoQuFanYi('ui', 'riQiYue')}8${huoQuFanYi('ui', 'riQiRi')}`,
    )
    expect(document.activeElement?.getAttribute('data-jiao-dian')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(document.querySelector('.rili-tanchuang')).not.toBeNull()
  })

  it('越界禁用时合成事件也零副作用：不换月、不移光标、不外发', async () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07', zuiDa: '2000-01-01' })
    await wrapper.find('.rili-da-kai').trigger('click')
    await 稳定()
    const 钮 = 今天钮()
    expect(钮.disabled).toBe(true)
    const 前年月 = 年月()
    const 前光标 = 光标名()

    钮.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await 稳定()

    expect(年月()).toBe(前年月)
    expect(光标名()).toBe(前光标)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(document.querySelector('.rili-tanchuang')).not.toBeNull()
  })
})
