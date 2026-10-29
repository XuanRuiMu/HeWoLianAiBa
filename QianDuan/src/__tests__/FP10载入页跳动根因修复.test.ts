import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Transition, defineComponent, h, nextTick, ref } from 'vue'
import 载入页 from '@/components/载入页.vue'
import { huoQuFanYi } from '@/config/翻译表'

const 根 = resolve(__dirname, '..')
const 读源 = (相对: string): string =>
  readFileSync(resolve(根, 相对), 'utf8').replace(/\r\n/g, '\n')
const 载入页源 = 读源('components/载入页.vue')
const 令牌源 = 读源('styles/设计令牌.css')
const 菜单源 = 读源('components/全局菜单.vue')

function 取样式(源: string): string {
  return [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((匹) => 匹[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function 取规则(样式: string, 选择器: string): string {
  return new RegExp(`${选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`).exec(样式)?.[1] ?? ''
}

const 载入样式 = 取样式(载入页源)
const 菜单样式 = 取样式(菜单源)

afterEach(() => {
  document.body.innerHTML = ''
})

function 建壳(): HTMLDivElement {
  const 壳 = document.createElement('div')
  壳.className = 'app-rongqi'
  document.body.appendChild(壳)
  return 壳
}

function 建页() {
  return mount(载入页, {
    props: {
      changJing: 'huiYi',
      duiXiangId: 'jue-se-1-abcd',
      biaoTi: '正在找回这个人',
      jinDu: 8,
      quWeiYu: '正在翻找和这个人的聊天记录...',
    },
  })
}

describe('FP-10 载入页跳动根因：脱离 transform 包含块', () => {
  it('载入页传送到稳定壳层，浮层固定于导航下内容区，不再依赖过渡祖先的包含块', () => {
    expect(载入页源).toContain('<Teleport :to="guaZaiMuBiao">')
    expect(载入页源).toMatch(/document\.querySelector\('\.app-rongqi'\)[\s\S]{0,30}document\.body/)
    expect(载入页源).toContain('<div class="zairu-chaosong" aria-hidden="true">')
    expect(取规则(载入样式, '.zairu-chaosong')).toContain('display: contents')
    const 浮层块 = 取规则(载入样式, '.zairu-yemian')
    expect(浮层块).toContain('position: fixed')
    expect(浮层块).toContain('inset: var(--daohanglan-gao-du) 0 0')
    expect(载入样式).not.toMatch(/transform:/)
  })

  it('进场只做透明度动画，浮层与卡片均无位移动画', () => {
    expect(载入样式).toMatch(/@keyframes zairu-xianru \{\s*from \{\s*opacity: 0;\s*\}\s*\}/)
    expect(载入样式).toMatch(/animation: zairu-xianru var\(--moshi-kapian-dong-xiao\)/)
    expect(取规则(载入样式, '.zairu-yemian')).not.toContain('transition')
  })

  it('导航高度单一真源，载入页与顶部导航共用同一令牌', () => {
    expect(令牌源).toContain('--daohanglan-gao-du: calc(52px + var(--anquan-quyu-shang))')
    expect(令牌源).toContain('--daohanglan-gao-du-zhai: calc(48px + var(--anquan-quyu-shang))')
    const 导航块 = 取规则(菜单样式, '.quanju-caidan')
    expect(导航块).toContain('height: var(--daohanglan-gao-du)')
    expect(导航块).toContain('min-height: var(--daohanglan-gao-du)')
    expect(菜单样式).toMatch(
      /@media \(max-width: 767px\) \{\s*\.quanju-caidan \{\s*height: var\(--daohanglan-gao-du-zhai\);[\s\S]*?min-height: var\(--daohanglan-gao-du-zhai\);/,
    )
    expect(菜单样式).not.toMatch(/height: 52px/)
    expect(菜单样式).not.toMatch(/height: 48px/)
    expect(载入样式).toMatch(
      /@media \(max-width: 767px\) \{\s*\.zairu-yemian \{\s*top: var\(--daohanglan-gao-du-zhai\);/,
    )
  })
})

describe('FP-10 载入页内容定高：任意内容不改变卡片在流高度与中心', () => {
  it('头像、标题、对象ID、趣味语槽位定高，卡片不再内部滚动', () => {
    expect(载入页源).toMatch(/\.zairu-touxiang-wei \{[\s\S]*?width: 88px;[\s\S]*?height: 88px;/)
    expect(取规则(载入样式, '.zairu-biaoti')).toContain('height: 29px')
    expect(取规则(载入样式, '.zairu-duixiang-id')).toContain('height: 18px')
    expect(取规则(载入样式, '.zairu-mingcheng-wei')).toContain('flex: none')
    expect(取规则(载入样式, '.zairu-tishi')).toContain(
      'height: calc(var(--jiange-da) + var(--jiange-12))',
    )
    expect(取规则(载入样式, '.zairu-zhuangtai')).toContain('flex: none')
    expect(取规则(载入样式, '.zairu-kaPian')).not.toContain('max-height')
    expect(取规则(载入样式, '.zairu-kaPian')).not.toContain('overflow-y')
  })

  it('错误态为卡片内的绝对定位覆盖层，不参与在流布局', () => {
    const 错误层 = 取规则(载入样式, '.zairu-cuowu-ceng')
    expect(错误层).toContain('position: absolute')
    expect(错误层).toContain('inset: 0')
    expect(载入页源).toMatch(
      /<div v-if="cuoWu" class="zairu-cuowu-ceng" role="alert">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/Teleport>/,
    )
  })

  it('挂载到应用壳层，内容与错误切换时卡片在流子节点与槽位高度保持不变', async () => {
    const 壳 = 建壳()
    const 包 = 建页()
    await nextTick()

    const 浮层 = 壳.querySelector('.zairu-yemian')
    expect(浮层).not.toBeNull()
    expect(浮层?.getAttribute('role')).toBe('status')
    expect(浮层?.getAttribute('aria-busy')).toBe('true')

    const 卡 = 浮层?.querySelector('.zairu-kaPian') as HTMLElement
    const 在流结构 = (): string[] => Array.from(卡.children).map((子) => (子 as HTMLElement).className)
    const 初始结构 = 在流结构()
    expect(初始结构).toEqual(['zairu-touxiang-wei', 'zairu-mingcheng-wei', 'zairu-zhuangtai'])

    const 标题高 = (): string => getComputedStyle(卡.querySelector('.zairu-biaoti') as Element).height
    const 编号高 = (): string =>
      getComputedStyle(卡.querySelector('.zairu-duixiang-id') as Element).height
    const 趣语高 = (): string => getComputedStyle(卡.querySelector('.zairu-tishi') as Element).height
    const 趣语定高 = 'calc(var(--jiange-da) + var(--jiange-12))'
    expect(标题高()).toBe('29px')
    expect(编号高()).toBe('18px')
    expect(趣语高()).toBe(趣语定高)
    expect(卡.querySelector('.zairu-duixiang-id')?.textContent).toBe('UID：jue-se-1')

    await 包.setProps({ biaoTi: '🍏🍎', duiXiangId: 'abcdef1234567890' })
    await nextTick()
    expect(在流结构()).toEqual(初始结构)
    expect(标题高()).toBe('29px')
    expect(编号高()).toBe('18px')
    expect(卡.querySelector('.zairu-duixiang-id')?.textContent).toBe('UID：abcdef12')

    await 包.setProps({
      biaoTi: '很长很长的微信名称很长很长的微信名称很长很长的微信名称',
      quWeiYu: '正在把上次的对话一条条捡回来，再检查一下有没有漏掉一句晚安，马上就好',
    })
    await nextTick()
    expect(在流结构()).toEqual(初始结构)
    expect(标题高()).toBe('29px')
    expect(编号高()).toBe('18px')
    expect(趣语高()).toBe(趣语定高)

    await 包.setProps({ cuoWu: huoQuFanYi('zaiRuLiaoTian', 'jiaZaiShiBai') })
    await nextTick()
    expect(在流结构()).toEqual([...初始结构, 'zairu-cuowu-ceng'])
    expect(浮层?.getAttribute('aria-busy')).toBe('false')
    const 错误层 = 卡.querySelector('.zairu-cuowu-ceng') as HTMLElement
    expect(错误层.getAttribute('role')).toBe('alert')
    expect(getComputedStyle(错误层).position).toBe('absolute')
    expect(标题高()).toBe('29px')
    expect(编号高()).toBe('18px')
    expect(趣语高()).toBe(趣语定高)

    await 浮层!.querySelector<HTMLButtonElement>('.zairu-fanhui')!.click()
    expect(包.emitted('fanHui')).toHaveLength(1)

    await 包.setProps({ cuoWu: '' })
    await nextTick()
    expect(在流结构()).toEqual(初始结构)
    expect(标题高()).toBe('29px')

    包.unmount()
  })

  it('错误态仅在允许重试时提供重试按钮，点击触发重试而不影响卡片在流结构', async () => {
    const 壳 = 建壳()
    const 包 = 建页()
    await nextTick()
    const 卡 = 壳.querySelector('.zairu-kaPian') as HTMLElement
    const 在流结构 = (): string[] => Array.from(卡.children).map((子) => (子 as HTMLElement).className)
    const 初始结构 = 在流结构()

    await 包.setProps({ cuoWu: '加载失败', chongShiKeYong: false })
    await nextTick()
    expect(壳.querySelector('.zairu-chongshi')).toBeNull()

    await 包.setProps({ chongShiKeYong: true })
    await nextTick()
    expect(在流结构()).toEqual([...初始结构, 'zairu-cuowu-ceng'])
    await 壳.querySelector<HTMLButtonElement>('.zairu-chongshi')!.click()
    expect(包.emitted('zhongShi')).toHaveLength(1)
    包.unmount()
  })

  it('无应用壳层时回落到 body 传送，不产生告警与残留节点', async () => {
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const 包 = mount(载入页, {
      props: { changJing: 'huiYi', biaoTi: '正在找回这个人', jinDu: 8 },
    })
    await nextTick()
    expect(document.body.querySelector('.zairu-yemian')?.parentElement).toBe(document.body)
    expect(警告).not.toHaveBeenCalled()
    包.unmount()
    expect(document.body.querySelector('.zairu-yemian')).toBeNull()
    警告.mockRestore()
  })

  it('作为路由过渡的子节点时根元素仍是可动画元素，不产生非元素根告警', async () => {
    建壳()
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const 显示 = ref(true)
    const 容器 = defineComponent({
      setup() {
        return () =>
          h(Transition, { name: 'yemian-nei-guodu' }, {
            default: () =>
              显示.value
                ? h(载入页, { key: 'zairu', changJing: 'huiYi', biaoTi: '正在找回这个人', jinDu: 8 })
                : h('div', { key: 'qita' }),
          })
      },
    })
    const 包 = mount(容器)
    await nextTick()
    显示.value = false
    await nextTick()
    expect(警告.mock.calls.flat().join(' ')).not.toContain('non-element')
    包.unmount()
    警告.mockRestore()
  })
})
