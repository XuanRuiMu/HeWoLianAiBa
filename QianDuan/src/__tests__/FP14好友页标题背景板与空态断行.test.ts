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
  it('提示语只在标点后断行：keep-all 且宽度容纳第一句、容不下整句', () => {
    const 规则 = /\.kong-tai-ti-shi \{([^}]*)\}/.exec(空态源码)?.[1] ?? ''
    expect(规则).toContain('word-break: keep-all')
    const 宽 = /max-width:\s*([\d.]+)em/.exec(规则)?.[1]
    expect(宽).toBeDefined()
    expect(Number(宽)).toBeGreaterThanOrEqual(17)
    expect(Number(宽)).toBeLessThan(25)
  })

  it('提示语字符串保持单行，不含换行与 br', () => {
    expect(huoQuFanYi('haoYou', 'zanWuHaoYouTiShi')).toBe(
      '搜索手机号或用户名，发出好友申请。对方通过后开聊！',
    )
    expect(huoQuFanYi('haoYou', 'zanWuHaoYouTiShi')).not.toContain('\n')
    expect(翻译源码).not.toMatch(/zanWuHaoYouTiShi[^\n]*<br/)
  })

  it('挂载后提示语渲染为完整单行文本节点', () => {
    const 包裹 = mount(好友空态, {
      props: {
        biaoTi: huoQuFanYi('haoYou', 'zanWuHaoYou'),
        tiShi: huoQuFanYi('haoYou', 'zanWuHaoYouTiShi'),
      },
    })
    const 提示 = 包裹.find('.kong-tai-ti-shi')
    expect(提示.exists()).toBe(true)
    expect(提示.text()).toBe('搜索手机号或用户名，发出好友申请。对方通过后开聊！')
    expect(提示.text()).not.toContain('\n')
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
