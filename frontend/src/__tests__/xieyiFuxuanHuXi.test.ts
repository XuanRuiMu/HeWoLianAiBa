import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
const 样式 = /<style[^>]*>([\s\S]*)<\/style>/.exec(源)?.[1] ?? ''

describe('协议勾选框蓝粉交替（FP-协议框交替）', () => {
  it('蓝粉两个态类只吃既有边框令牌，无裸色值', () => {
    const 蓝 = /\.xieyi-fuxuan input\[type='checkbox'\]\.xieyi-fuxuan-lan\s*\{[^}]*\}/.exec(样式)?.[0] ?? ''
    const 粉 = /\.xieyi-fuxuan input\[type='checkbox'\]\.xieyi-fuxuan-fen\s*\{[^}]*\}/.exec(样式)?.[0] ?? ''
    expect(蓝, '蓝态类规则缺失').not.toBe('')
    expect(粉, '粉态类规则缺失').not.toBe('')
    expect(蓝).toMatch(/accent-color:\s*var\(--xingbie-nan-xuan-biankuang\)/)
    expect(粉).toMatch(/accent-color:\s*var\(--xingbie-nv-xuan-biankuang\)/)
    expect(蓝 + 粉, '勾选框态类内不得出现裸色值').not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('无呼吸动画：accent-color 不做时间过渡', () => {
    expect(样式).not.toContain('@keyframes xieyi-fuxuan-huxi')
    expect(样式).not.toMatch(/animation:\s*xieyi-fuxuan-huxi/)
    const 勾选块 = /\.xieyi-fuxuan input\[type='checkbox'\]\s*\{[^}]*\}/.exec(样式)?.[0] ?? ''
    expect(勾选块, '勾选框不得声明 animation').not.toMatch(/animation\s*:/)
    expect(勾选块, '勾选框不得对 accent-color 做过渡').not.toMatch(/transition\s*:/)
  })

  it('态类由勾选次数模 2 决定：偶数粉、奇数蓝', () => {
    expect(源).toMatch(/xieYiGouXuanCiShu\.value\s*%\s*2\s*===\s*0\s*\?\s*'xieyi-fuxuan-fen'\s*:\s*'xieyi-fuxuan-lan'/)
    expect(源).toMatch(/watch\(\s*tongYiXieYi\s*,/)
    expect(源).toMatch(/if \(val\) xieYiGouXuanCiShu\.value \+= 1/)
  })

  it('态类真实挂在勾选框上', () => {
    expect(源).toMatch(/:class="xieYiGouXuanSeLei"/)
    const 输入块 = /<input[\s\S]{0,300}?tongYiXieYi[\s\S]{0,300}?\/>/.exec(源)?.[0] ?? ''
    expect(输入块, '未找到协议勾选 input').not.toBe('')
  })
})