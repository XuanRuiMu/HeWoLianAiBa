import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import 好友空态 from '@/components/好友/好友空态.vue'
import { huoQuFanYi } from '@/config/翻译表'

const 空态源码 = readFileSync(resolve(__dirname, '../components/好友/好友空态.vue'), 'utf8')
const 列表源码 = readFileSync(resolve(__dirname, '../views/好友列表.vue'), 'utf8')
const 翻译源码 = readFileSync(resolve(__dirname, '../config/翻译表.ts'), 'utf8')

describe('FP-14 空态提示语断行', () => {
  it('提示语恰为需求指定的两行，行内不再带句号与感叹号', () => {
    const 规则 = /\.kong-tai-ti-shi \{([^}]*)\}/.exec(空态源码)?.[1] ?? ''
    expect(规则).toContain('white-space: pre-line')
    expect(规则).not.toContain('word-break: keep-all')
  })

  it('提示语字符串恰为两行，用换行符而不是 br', () => {
    expect(huoQuFanYi('haoYou', 'zanWuHaoYouTiShi')).toBe(
      '搜索手机号或用户名，发出好友申请\n对方通过后开聊',
    )
    expect(huoQuFanYi('haoYou', 'zanWuHaoYouTiShi').split('\n')).toEqual([
      '搜索手机号或用户名，发出好友申请',
      '对方通过后开聊',
    ])
    expect(翻译源码).not.toMatch(/zanWuHaoYouTiShi[^\n]*<br/)
  })

  it('挂载后提示语按两行渲染，不再出现句号与感叹号', () => {
    const 包裹 = mount(好友空态, {
      props: {
        biaoTi: huoQuFanYi('haoYou', 'zanWuHaoYou'),
        tiShi: huoQuFanYi('haoYou', 'zanWuHaoYouTiShi'),
      },
    })
    const 提示 = 包裹.find('.kong-tai-ti-shi')
    expect(提示.exists()).toBe(true)
    expect(提示.text()).toBe('搜索手机号或用户名，发出好友申请\n对方通过后开聊')
    expect(提示.text()).not.toContain('。')
    expect(提示.text()).not.toContain('！')
  })
})

describe('FP-14 标题区滚动遮挡', () => {
  it('头部静止无背景板，滚动后才挂遮挡层', () => {
    const 头部块 = /\.hao-you-ding-bu \{[\s\S]*?\n\}/.exec(列表源码)?.[0] ?? ''
    expect(头部块).not.toContain('background')
    expect(头部块).toContain('position: sticky')
    const 遮挡块 = /\.hao-you-ding-bu\.ding-bu-fu-gai \{[\s\S]*?\n\}/.exec(列表源码)?.[0] ?? ''
    expect(遮挡块).toContain('background: var(--hao-you-ye-mian)')
    expect(列表源码).toContain('@scroll.passive="gengXinDingBuFuGai"')
  })
})
