import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HengTiaoShuRuKuang from '@/components/表单/横条输入框.vue'
import 区号选择器 from '@/components/表单/区号选择器.vue'
import {
  DA_LU_QU_HAO,
  QU_HAO_XUAN_XIANG,
  panDingBenDiHao,
  panDingGuoJiHao,
  shiFouDaLuHao,
  zuChengGuoJiHao,
} from '@/utils/手机号'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')

const 组件 = 读('components/表单/横条输入框.vue')
const 登录 = 读('views/登录内容.vue')
const 找回 = 读('views/找回密码.vue')
const 翻译表 = 读('config/翻译表.ts')

describe('手机号区号：选号器与输入框职责分离', () => {
  it('输入框只渲染纯文本输入，不承载任何附加控件', () => {
    expect(组件).toContain('<slot name="前缀" />')
    expect(组件).toContain('<slot name="后缀" />')
    expect(组件).not.toContain('shuru-qian-zhui')
    expect(组件).not.toContain('you-qian-zhui')
    expect(组件).not.toContain('前缀?: string')
  })

  it('输入框默认没有前缀槽内容，输入区宽度等于整行', () => {
    const 包 = mount(HengTiaoShuRuKuang, {
      props: { 标识: 'test-code', 标签: '验证码', 模型值: '' },
    })
    expect(包.find('.qu-hao-chu').exists()).toBe(false)
    expect((包.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('区号槽内容渲染在输入框之外，输入框本体只保留数字文本', () => {
    const 包 = mount(HengTiaoShuRuKuang, {
      props: { 标识: 'test-shouji', 标签: '手机号', 模型值: '13800138000' },
      slots: { 前缀: '<span class="ce-shi-qian-zhui">+86</span>' },
    })
    const 根 = 包.get('.shuru-zu')
    expect(根.get('.ce-shi-qian-zhui').text()).toBe('+86')
    expect((根.get('input').element as HTMLInputElement).value).toBe('13800138000')
  })

  it('登录与注册都使用可选区号，注册端固定 +86 文案。找回密码走固定区号前缀槽', () => {
    expect(登录.match(/<QuHaoXuanZeQi/g)?.length).toBe(2)
    expect(登录).toContain('gu-ding-qu-hao">+{{ DA_LU_QU_HAO }}')
    expect(找回).toContain('<template #前缀>')
    expect(找回).toContain('gu-ding-qu-hao">+{{ DA_LU_QU_HAO }}')
  })

  it('翻译表提供区号与境外注册文案，无硬编码中文', () => {
    expect(翻译表).toContain("feiDaLuShouJiHaoZhuCe: '非+86手机号'")
    expect(翻译表).toContain("feiDaLuZhuCeBiaoTi: '非大陆手机号注册'")
    expect(登录).not.toContain('非+86手机号')
    expect(登录).not.toContain('大陆手机号请返回')
  })
})

describe('手机号解析与区号判定', () => {
  it('大陆号码必须带 +86 且为 1[3-9] 开头 11 位', () => {
    expect(shiFouDaLuHao('+8616622370059')).toBe(true)
    expect(shiFouDaLuHao('+8612622370059')).toBe(false)
    expect(shiFouDaLuHao('+85291234567')).toBe(false)
  })

  it('境外号码按国际格式校验，非法输入被拒', () => {
    expect(panDingGuoJiHao('+14155552671').heFa).toBe(true)
    expect(panDingGuoJiHao('+85291234567').heFa).toBe(true)
    expect(panDingGuoJiHao('+819012345678').heFa).toBe(true)
    expect(panDingGuoJiHao('+999123456').heFa).toBe(false)
    expect(panDingGuoJiHao('16622370059').heFa).toBe(false)
  })

  it('本地号拼区号后整体校验，缺位或多位都被拒', () => {
    expect(panDingBenDiHao('86', '16622370059').heFa).toBe(true)
    expect(panDingBenDiHao('86', '1662237005').heFa).toBe(false)
    expect(panDingBenDiHao('852', '91234567').heFa).toBe(true)
    expect(panDingBenDiHao('852', '1234').heFa).toBe(false)
    expect(zuChengGuoJiHao('86', '16622370059')).toBe('+8616622370059')
  })

  it('区号清单覆盖大陆且大陆排第一，默认区号是 86', () => {
    expect(QU_HAO_XUAN_XIANG[0].quHao).toBe('86')
    expect(DA_LU_QU_HAO).toBe('86')
    expect(new Set(QU_HAO_XUAN_XIANG.map((项) => 项.quHao + 项.guoJia)).size).toBe(
      QU_HAO_XUAN_XIANG.length,
    )
  })
})

describe('区号选择器交互', () => {
  it('按钮只显示当前区号，不显示国家名', () => {
    const 包 = mount(区号选择器, { props: { 模型值: '86' } })
    expect(包.get('.qu-hao-chu').text()).toContain('+86')
  })

  it('展开后可搜索并只显示命中项', async () => {
    const 包 = mount(区号选择器, { props: { 模型值: '86' }, attachTo: document.body })
    await 包.get('.qu-hao-chu').trigger('click')
    await new Promise((结束) => setTimeout(结束, 0))
    const 浮层 = document.querySelector('.qu-hao-lie-biao') as HTMLElement | null
    expect(浮层).not.toBeNull()
    const 搜索 = 浮层?.querySelector('.qu-hao-sou-suo-shu-ru') as HTMLInputElement
    搜索.value = '香港'
    搜索.dispatchEvent(new Event('input'))
    await new Promise((结束) => setTimeout(结束, 0))
    const 条 = [...(浮层?.querySelectorAll('.qu-hao-tiao') ?? [])]
    expect(条.length).toBe(1)
    expect(条[0].textContent).toContain('852')
    包.unmount()
  })
})
