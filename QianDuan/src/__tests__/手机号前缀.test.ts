import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HengTiaoShuRuKuang from '@/components/表单/横条输入框.vue'
import 区号选择器 from '@/components/表单/区号选择器.vue'
import {
  DA_LU_QU_HAO,
  QU_HAO_XUAN_XIANG,
  huoQuGuoJia,
  panDingBenDiHao,
  panDingGuoJiHao,
  quanJuQuHaoZuiChang,
  quHaoWenAn,
  shiFouDaLuHao,
  zuChengGuoJiHao,
} from '@/utils/手机号'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')

const 组件 = 读('components/表单/横条输入框.vue')
const 组件区号 = 读('components/表单/区号选择器.vue')
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

  it('区号清单覆盖全世界所有国家地区，大陆固定第一', () => {
    expect(QU_HAO_XUAN_XIANG.length).toBe(245)
    expect(QU_HAO_XUAN_XIANG[0].guoJia).toBe('CN')
    expect(QU_HAO_XUAN_XIANG.filter((项) => 项.quHao === '86').length).toBe(1)
    expect(quanJuQuHaoZuiChang()).toBe(3)
    expect(QU_HAO_XUAN_XIANG.every((项) => /^\d{1,3}$/.test(项.quHao))).toBe(true)
    expect(QU_HAO_XUAN_XIANG.every((项) => 项.mingCheng.length > 0)).toBe(true)
  })

  it('港澳台用中文全称，其余按本地化地区名下发', () => {
    const 取 = (国: string) => quHaoWenAn(QU_HAO_XUAN_XIANG.find((项) => 项.guoJia === 国)!)
    expect(取('CN')).toBe('中国大陆')
    expect(取('HK')).toBe('中国香港')
    expect(取('MO')).toBe('中国澳门')
    expect(取('TW')).toBe('中国台湾')
    expect(取('JP')).toBe('日本')
    expect(取('CI')).not.toBe('CI')
  })

  it('共享区号按主流国家优先，其余按中文名拼音', () => {
    expect(huoQuGuoJia('1')).toBe('US')
    expect(huoQuGuoJia('7')).toBe('RU')
    expect(huoQuGuoJia('39')).toBe('IT')
    expect(huoQuGuoJia('44')).toBe('GB')
    expect(huoQuGuoJia('61')).toBe('AU')
    expect(huoQuGuoJia('212')).toBe('MA')
    expect(huoQuGuoJia('358')).toBe('FI')
    expect(huoQuGuoJia('599')).toBe('CW')
    expect(huoQuGuoJia('852')).toBe('HK')
    expect(huoQuGuoJia('99999')).toBeNull()
    const 比较器 = new Intl.Collator('zh-Hans-CN', { collation: 'pinyin' })
    const 锚名: string[] = []
    const 全名: string[] = []
    let 起 = 1
    while (起 < QU_HAO_XUAN_XIANG.length) {
      let 止 = 起
      while (止 < QU_HAO_XUAN_XIANG.length && QU_HAO_XUAN_XIANG[止].quHao === QU_HAO_XUAN_XIANG[起].quHao) 止 += 1
      const 组 = QU_HAO_XUAN_XIANG.slice(起, 止)
      expect(组[0].guoJia).toBe(huoQuGuoJia(QU_HAO_XUAN_XIANG[起].quHao))
      锚名.push(组.map((项) => 项.mingCheng).sort(比较器.compare)[0])
      全名.push(...组.map((项) => 项.mingCheng))
      起 = 止
    }
    expect(全名.length).toBe(244)
    expect([...全名].sort()).toEqual(
      [...QU_HAO_XUAN_XIANG.slice(1).map((项) => 项.mingCheng)].sort(),
    )
    expect(锚名).toEqual([...锚名].sort(比较器.compare))
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

  it('搜索框使用方框外观逃生舱，不再是横条输入框', () => {
    expect(组件区号).toContain('data-kuang-ti="fangkuang"')
    expect(组件区号).toContain('quHaoWuPiPei')
    expect(组件区号).not.toContain('wuKeXuanXiang')
    expect(组件区号).toContain('preventScroll: true')
  })

  it('数字、加号、中文、英文都能搜到对应地区', async () => {
    const 包 = mount(区号选择器, { props: { 模型值: '86' }, attachTo: document.body })
    await 包.get('.qu-hao-chu').trigger('click')
    await new Promise((结束) => setTimeout(结束, 0))
    const 浮层 = document.querySelector('.qu-hao-lie-biao') as HTMLElement
    const 搜索 = 浮层.querySelector('.qu-hao-sou-suo-shu-ru') as HTMLInputElement
    const 搜 = async (词: string) => {
      搜索.value = 词
      搜索.dispatchEvent(new Event('input'))
      await new Promise((结束) => setTimeout(结束, 0))
      return [...浮层.querySelectorAll('.qu-hao-tiao')].map((条) => ({
        号: 条.querySelector('.qu-hao-tiao-hao')?.textContent ?? '',
        名: 条.querySelector('.qu-hao-tiao-ming')?.textContent ?? '',
      }))
    }
    expect((await 搜('')).length).toBe(245)
    const 六 = await 搜('6')
    expect(六.length).toBeGreaterThan(5)
    expect(六.every((条) => 条.号.includes('6'))).toBe(true)
    expect(六.some((条) => 条.号 === '+86')).toBe(true)
    const 八二 = await 搜('82')
    expect(八二[0]).toEqual({ 号: '+82', 名: '韩国' })
    expect(八二.some((条) => 条.号 === '+382')).toBe(true)
    const 加九 = await 搜('+9')
    expect(加九.some((条) => 条.号 === '+91')).toBe(true)
    expect(加九.some((条) => 条.号 === '+971')).toBe(true)
    const 中国 = await 搜('中国')
    expect(中国.map((条) => 条.名)).toEqual(['中国大陆', '中国澳门', '中国台湾', '中国香港'])
    const 英文 = await 搜('united states')
    expect(英文.some((条) => 条.号 === '+1' && 条.名 === '美国')).toBe(true)
    expect((await 搜('zzzzz')).length).toBe(0)
    包.unmount()
  })
})
