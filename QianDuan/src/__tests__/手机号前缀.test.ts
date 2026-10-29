import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HengTiaoShuRuKuang from '@/components/表单/横条输入框.vue'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')

const 组件 = 读('components/表单/横条输入框.vue')
const 登录 = 读('views/登录内容.vue')
const 找回 = 读('views/找回密码.vue')
const 翻译表 = 读('config/翻译表.ts')
const 令牌 = 读('styles/设计令牌.css')

function 字段邻域(源: string, 标识: string): string {
  const 起 = 源.indexOf(`标识="${标识}"`)
  expect(起, `缺少字段 ${标识}`).toBeGreaterThan(-1)
  return 源.slice(Math.max(0, 起 - 100), 起 + 300)
}

describe('手机号输入框统一 +86 前缀', () => {
  it('翻译表提供 +86 文案，未在视图硬编码', () => {
    expect(翻译表).toContain("shouJiHaoGuoJiQuHao: '+86'")
    for (const 视图 of [登录, 找回]) {
      expect(视图).toContain("huoQuFanYi('ui', 'shouJiHaoGuoJiQuHao')")
      expect(视图).not.toContain('前缀="+86"')
    }
  })

  it('登录、注册、找回密码三处手机号输入都带前缀，验证码不带', () => {
    for (const 源 of [登录, 找回]) {
      for (const 标识 of ['denglu-shoujihao', 'zhuce-shoujihao', 'zhaohui-shoujihao']) {
        if (!源.includes(`标识="${标识}"`)) continue
        const 邻域 = 字段邻域(源, 标识)
        expect(邻域, `${标识} 缺前缀`).toContain(':前缀="huoQuFanYi')
      }
    }
    for (const 标识 of ['zhuce-yanzhengma', 'zhaohui-yanzhengma']) {
      const 邻域 = 字段邻域(登录 + 找回, 标识)
      expect(邻域, `${标识} 不应带 +86 前缀`).not.toContain('前缀=')
    }
  })

  it('输入组件把前缀渲染在输入框之外，并给容器加前缀类', () => {
    const 包 = mount(HengTiaoShuRuKuang, {
      props: { 标识: 'test-shouji', 标签: '手机号', 模型值: '13800138000', 前缀: '+86' },
    })
    const 根 = 包.get('.shuru-zu')
    expect(根.classes()).toContain('you-qian-zhui')
    expect(根.get('.shuru-qian-zhui').text()).toBe('+86')
    expect((根.get('input').element as HTMLInputElement).value).toBe('13800138000')
  })

  it('不传前缀时不渲染前缀，也不改变旧类名', () => {
    const 包 = mount(HengTiaoShuRuKuang, {
      props: { 标识: 'test-code', 标签: '验证码', 模型值: '' },
    })
    expect(包.get('.shuru-zu').classes()).not.toContain('you-qian-zhui')
    expect(包.find('.shuru-qian-zhui').exists()).toBe(false)
  })

  it('前缀宽度由字号令牌派生，浮起标签回到 0 位避免叠字', () => {
    expect(令牌).toContain(
      '--shuru-qian-zhui-kuan: calc(var(--shuru-kuang-zihao) * 1.9 + var(--jiange-6))',
    )
    expect(组件).toContain('width: var(--shuru-qian-zhui-kuan)')
    expect(组件).toContain('left: var(--shuru-qian-zhui-kuan)')
    expect(组件).toContain(
      '.shuru-zu.you-qian-zhui.shangFu .fudong-biaoqian,',
    )
    expect(组件).toContain('.shuru-zu.you-qian-zhui:focus-within .fudong-biaoqian')
  })
})
