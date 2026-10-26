import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import 消息行 from '@/components/聊天/消息行.vue'

const 源码 = readFileSync(resolve(__dirname, '../components/聊天/消息行.vue'), 'utf8')
const 样式 = 源码.slice(源码.indexOf('<style'))

function 规则体们(选择器: string): string[] {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 出: string[] = []
  for (const 匹配 of 样式.matchAll(new RegExp(`(?:^|\\n)\\s*${转义}\\s*\\{([^}]*)\\}`, 'g'))) {
    出.push(匹配[1])
  }
  expect(出.length, `缺少规则 ${选择器}`).toBeGreaterThan(0)
  return 出
}

function 规则体(选择器: string): string {
  return 规则体们(选择器)[0]
}

function 挂载(属性: Record<string, unknown> = {}) {
  return mount(消息行, {
    props: { shiBenRen: true, faSongTiShi: '发送中', ...属性 },
    slots: { default: '<div class="ce-shi-neirong">你好</div>' },
  })
}

describe('FP-09 发送中灰滤镜', () => {
  it('发送中时内容容器带灰滤镜类，且滤镜只挂在气泡外壳上', () => {
    const 包裹 = 挂载({ faSongZhong: true })
    const 外壳 = 包裹.find('.qipao-waike')
    expect(外壳.exists()).toBe(true)
    expect(外壳.classes()).toContain('qipao-fasong-zhong')
    expect(外壳.find('.ce-shi-neirong').exists()).toBe(true)
    expect(外壳.find('.xiaoxi-wei').exists()).toBe(false)
    expect(外壳.find('.fasong-zhuangtai').exists()).toBe(false)
  })

  it('未发送中时不带灰滤镜类，内容恢复原色', () => {
    const 包裹 = 挂载({ faSongZhong: false })
    const 外壳 = 包裹.find('.qipao-waike')
    expect(外壳.classes()).not.toContain('qipao-fasong-zhong')
    expect(包裹.find('.fasong-zhuangtai').exists()).toBe(false)
  })

  it('灰滤镜规则为去色加轻度透明，且不产生遮挡交互的蒙层', () => {
    const 体 = 规则体('.qipao-waike.qipao-fasong-zhong')
    expect(体).toContain('filter: grayscale(1)')
    expect(体).toMatch(/opacity:\s*0\.(6|7)\d*/)
    expect(体).not.toContain('background')
    expect(体).not.toContain('::before')
    expect(样式).not.toMatch(/\.xiaoxi-wei[^{]*\{[^}]*filter:/)
    expect(样式).not.toMatch(/\.fasong-zhuangtai[^{]*\{[^}]*filter:/)
  })

  it('头像与状态节点不在被滤镜的内容容器内，外壳不裁剪圆角', () => {
    const 外壳 = 规则体('.qipao-waike')
    expect(外壳).not.toContain('overflow')
    expect(外壳).not.toContain('filter')
    const 模板 = 源码.slice(0, 源码.indexOf('<script'))
    const 头像位 = 模板.indexOf('class="xiaoxi-wei"')
    const 外壳位 = 模板.indexOf('class="qipao-waike"')
    const 状态位 = 模板.indexOf('class="fasong-zhuangtai"')
    expect(头像位).toBeGreaterThan(-1)
    expect(外壳位).toBeGreaterThan(头像位)
    expect(状态位).toBeGreaterThan(外壳位)
  })
})

describe('FP-09 发送失败感叹号', () => {
  it('失败态渲染红色感叹号按钮，文字为感叹号且不渲染转圈', () => {
    const 包裹 = 挂载({ faSongShiBai: true })
    const 徽标 = 包裹.find('.fasong-shibai-jiaobiao')
    expect(徽标.exists()).toBe(true)
    expect(徽标.text()).toBe('!')
    expect(徽标.attributes('type')).toBe('button')
    expect(包裹.find('.fasong-zhuangtai-zhuanquan').exists()).toBe(false)
    expect(包裹.findAll('.fasong-zhuangtai > *')).toHaveLength(1)
  })

  it('点击感叹号抛出重新发送事件', async () => {
    const 包裹 = 挂载({ faSongShiBai: true })
    await 包裹.find('.fasong-shibai-jiaobiao').trigger('click')
    expect(包裹.emitted('chongXinFaSong')).toHaveLength(1)
  })

  it('感叹号为红色实心圆、白字，直径与转圈一致', () => {
    const 徽标 = 规则体('.fasong-shibai-jiaobiao')
    const 转圈 = 规则体('.fasong-zhuangtai-zhuanquan')
    expect(徽标).toContain('background: var(--cuowu-yanse)')
    expect(徽标).toContain('color: var(--fasong-anniu-wenben)')
    expect(徽标).toContain('border-radius: 50%')
    expect(徽标).toContain('width: var(--jiaobiao-chicun)')
    expect(徽标).toContain('height: var(--jiaobiao-chicun)')
    expect(转圈).toContain('width: var(--jiaobiao-chicun)')
    expect(转圈).toContain('height: var(--jiaobiao-chicun)')
    expect(规则体('.fasong-zhuangtai')).toContain('align-self: center')
  })

  it('发送中与失败同时为真时只出现一个状态节点', () => {
    const 包裹 = 挂载({ faSongZhong: true, faSongShiBai: true })
    expect(包裹.findAll('.fasong-zhuangtai')).toHaveLength(1)
    expect(包裹.find('.fasong-zhuangtai-zhuanquan').exists()).toBe(true)
    expect(包裹.find('.fasong-shibai-jiaobiao').exists()).toBe(false)
  })
})

describe('FP-09 减少动效', () => {
  it('减少动效下转圈静止但仍可见', () => {
    expect(样式).toContain('@media (prefers-reduced-motion: reduce)')
    const 段 = 样式.slice(样式.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(段).toContain('.fasong-zhuangtai-zhuanquan')
    expect(段).toContain('animation: none')
    expect(段).toContain('border-top-color: var(--wenben-tishi)')
  })
})
