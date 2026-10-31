import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 请求错误 from '@/components/请求错误.vue'
import 错误边界 from '@/components/错误边界.vue'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { huoQuFanYi } from '@/config/翻译表'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 源码根 = resolve(本目录, '..')
const 读源 = (...段: string[]) => readFileSync(resolve(源码根, ...段), 'utf8')

function 取声明块(源: string, 选择器: string): string {
  const 起 = 源.indexOf(选择器 + ' {')
  if (起 < 0) throw new Error('缺少选择器：' + 选择器)
  const 开 = 源.indexOf('{', 起)
  const 闭 = 源.indexOf('}', 开)
  return 源.slice(开 + 1, 闭)
}

function 取组块(源: string, 首选择器: string): string {
  const 起 = 源.indexOf(首选择器 + ',')
  if (起 < 0) throw new Error('缺少组选择器：' + 首选择器)
  const 开 = 源.indexOf('{', 起)
  const 闭 = 源.indexOf('}', 开)
  return 源.slice(开 + 1, 闭)
}

const 报错框源 = 读源('components', '请求错误.vue')
const 样式 = 报错框源.slice(报错框源.indexOf('<style'))
const 根块 = 取声明块(样式, '.qian-tai-cuo-wu')
const 头部块 = 取声明块(样式, '.cuowu-tishi-tou')
const 图标槽块 = 取声明块(样式, '.cuowu-tishi-tubiao-wei')
const 标题块 = 取声明块(样式, '.qian-tai-cuo-wu-wen-an')
const 说明块 = 取声明块(样式, '.cuowu-tishi-shuo-ming')
const 关闭块 = 取声明块(样式, '.cuowu-tishi-guan-bi')
const 操作行块 = 取声明块(样式, '.cuowu-tishi-wei')
const 码块 = 取声明块(样式, '.qian-tai-cuo-wu-lian-ai-ma')
const 按钮组块 = 取组块(样式, '.qian-tai-cuo-wu-chong-shi')
const 关闭热区块 = 取声明块(样式, '.cuowu-tishi-guan-bi::before')

const 装 = (shiXiang: Record<string, unknown> = {}) =>
  mount(请求错误, {
    props: {
      cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.WANG_LUO, traceId: 'contract-0001' }),
      ...shiXiang,
    },
  })

describe('报错框结构契约', () => {
  it('根节点是唯一语义面：alert + assertive + atomic，且同时挂全局提示面', () => {
    const 包 = 装()
    const 根 = 包.get('.qian-tai-cuo-wu')
    expect(根.classes()).toContain('cuowu-tishi')
    expect(根.attributes('role')).toBe('alert')
    expect(根.attributes('aria-live')).toBe('assertive')
    expect(根.attributes('aria-atomic')).toBe('true')
    expect(报错框源).toContain('class="qian-tai-cuo-wu cuowu-tishi"')
  })

  it('四层固定顺序：图标槽 → 标题 → 说明 → 操作行', () => {
    const 包 = 装()
    const 顺序 = Array.from(包.get('.qian-tai-cuo-wu').element.children).map((e) => (e as HTMLElement).className)
    expect(顺序[0]).toContain('cuowu-tishi-tou')
    expect(顺序[1]).toContain('cuowu-tishi-wei')
    const 头部子序 = Array.from(包.get('.cuowu-tishi-tou').element.children).map((e) => (e as HTMLElement).className)
    expect(头部子序[0]).toContain('cuowu-tishi-tubiao-wei')
    expect(头部子序[1]).toContain('cuowu-tishi-wen')
    expect(头部子序[2]).toContain('cuowu-tishi-guan-bi')
    const 文字子序 = Array.from(包.get('.cuowu-tishi-wen').element.children).map((e) => (e as HTMLElement).className)
    expect(文字子序[0]).toContain('qian-tai-cuo-wu-wen-an')
    expect(文字子序[1]).toContain('cuowu-tishi-shuo-ming')
    expect(包.get('.cuowu-tishi-tubiao-wei').get('svg.qian-tai-cuo-wu-tubiao').exists()).toBe(true)
  })

  it('标题一句 + 说明一句，说明只取下一步，不回显影响与上游长文', () => {
    const 包 = 装()
    const 文案 = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.WANG_LUO, traceId: 'contract-0001' })
    expect(包.get('.qian-tai-cuo-wu-wen-an').text()).toBe(文案.lianAiWenAn)
    expect(包.get('.cuowu-tishi-shuo-ming').text()).toBe(文案.xiaYiBu)
    expect(包.get('.qian-tai-cuo-wu').text()).not.toContain(文案.yingXiang)
    expect(包.get('.cuowu-tishi-shuo-ming').element.tagName).toBe('P')
  })

  it('主操作只有一个：可重试码只有一枚重试按钮，复制是次级操作', () => {
    const 包 = 装()
    expect(包.findAll('.cuowu-tishi-zhu-anniu')).toHaveLength(1)
    expect(包.get('.cuowu-tishi-zhu-anniu').classes()).toContain('qian-tai-cuo-wu-chong-shi')
    expect(包.get('.cuowu-tishi-ci-anniu').classes()).toContain('qian-tai-cuo-wu-fu-zhi')
    const 不可重试 = 装({ cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.AUTH_INVALID_CREDENTIALS }) })
    expect(不可重试.find('.cuowu-tishi-zhu-anniu').exists()).toBe(false)
    expect(不可重试.find('.cuowu-tishi-wei').exists()).toBe(false)
  })

  it('关闭按钮是唯一带 aria-label 的控件，点一下即收起并抛事件', async () => {
    const 包 = 装()
    const 关 = 包.get('.cuowu-tishi-guan-bi')
    expect(关.attributes('aria-label')).toBe(huoQuFanYi('tongYong', 'guanBi'))
    expect(关.attributes('type')).toBe('button')
    expect(包.get('.cuowu-tishi-guan-bi').element.tagName).toBe('BUTTON')
    await 关.trigger('click')
    expect(包.emitted('guanBi')).toHaveLength(1)
    expect(包.find('.qian-tai-cuo-wu').exists()).toBe(false)
  })

  it('关闭开关可关掉，关掉后不渲染关闭按钮', () => {
    const 包 = 装({ keGuanBi: false })
    expect(包.find('.cuowu-tishi-guan-bi').exists()).toBe(false)
    expect(包.find('.qian-tai-cuo-wu').exists()).toBe(true)
  })

  it('换一条新报错时自动重新展开（关闭态不粘住）', async () => {
    const 包 = 装()
    await 包.get('.cuowu-tishi-guan-bi').trigger('click')
    expect(包.find('.qian-tai-cuo-wu').exists()).toBe(false)
    await 包.setProps({ cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.CHAO_SHI }) })
    expect(包.find('.qian-tai-cuo-wu').exists()).toBe(true)
  })
})

describe('报错框间距与层级令牌契约', () => {
  it('内边距 16 / 块间距 16 / 图标与文字 12 / 标题与说明 4，全部走八档令牌', () => {
    expect(根块).toContain('--cuowu-jianju-kuai: var(--jiange-zhong)')
    expect(根块).toContain('--cuowu-jianju-tubiao: var(--jiange-12)')
    expect(根块).toContain('--cuowu-jianju-wen: var(--jiange-4)')
    expect(根块).toContain('padding: var(--cuowu-jianju-kuai)')
    expect(根块).toContain('gap: var(--cuowu-jianju-kuai)')
    expect(头部块).toContain('gap: var(--cuowu-jianju-tubiao)')
    expect(操作行块).toContain('gap: var(--jiange-xiao)')
  })

  it('图标槽固定 24px（20~24 区间），标题行高与槽同高保证首行对齐', () => {
    expect(根块).toContain('--cuowu-tubiao-chicun: var(--jiange-da)')
    expect(图标槽块).toContain('width: var(--cuowu-tubiao-chicun)')
    expect(图标槽块).toContain('height: var(--cuowu-tubiao-chicun)')
    expect(根块).toContain('--cuowu-biaoti-hangao: var(--jiange-da)')
    expect(标题块).toContain('line-height: var(--cuowu-biaoti-hangao)')
    expect(头部块).toContain('align-items: flex-start')
  })

  it('说明最多两行并留白，不撑高面板', () => {
    expect(说明块).toContain('-webkit-line-clamp: 2')
    expect(说明块).toContain('overflow: hidden')
    expect(说明块).toContain('display: -webkit-box')
  })

  it('触控热区不小于 44px：主按钮、次按钮、关闭按钮', () => {
    expect(按钮组块).toContain('min-height: var(--shuru-anniu-re-ku)')
    expect(关闭块).toContain('position: relative')
    expect(关闭热区块).toContain('width: var(--shuru-anniu-re-ku)')
    expect(关闭热区块).toContain('height: var(--shuru-anniu-re-ku)')
    expect(关闭热区块).toContain('transform: translate(-50%, -50%)')
    expect(操作行块).toContain('display: flex')
  })

  it('错误色只落在图标槽、左描边与标题，正文与按钮一律正文色', () => {
    expect(根块).toContain('border-left: 3px solid var(--cuo-wu-biaoti)')
    expect(图标槽块).toContain('color: var(--cuo-wu-biaoti)')
    expect(标题块).toContain('color: var(--cuo-wu-biaoti)')
    expect(说明块).toContain('color: var(--cuo-wu-zhengwen)')
    expect(取声明块(样式, '.qian-tai-cuo-wu-chong-shi')).toContain('color: var(--cuo-wu-zhengwen)')
    expect(码块).toContain('color: var(--cuo-wu-zhengwen)')
    expect(样式).not.toContain('rgba(255, 69, 58')
    expect(样式).not.toContain('background: var(--cuowu-yanse)')
  })

  it('样式块零字面色值，圆角只吃令牌', () => {
    expect(样式).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(样式).not.toMatch(/(^|[^-])rgba?\(/m)
    expect(根块).toContain('border-radius: var(--yuanjiao-zhong)')
    expect(关闭块).toContain('border-radius: var(--yuanjiao-xiao)')
  })
})

describe('错误边界复用同一套报错面', () => {
  it('渲染图标槽 + 标题 + 说明 + 动作组，语义面与共享报错框一致', () => {
    const 包 = mount(错误边界, { props: { qiangZhiXianShi: true } })
    const 根 = 包.get('.cuowu-tishi')
    expect(根.attributes('role')).toBe('alert')
    expect(根.attributes('aria-live')).toBe('assertive')
    expect(包.get('.cuowu-tubiao-wei').get('svg.cuowu-tubiao').exists()).toBe(true)
    expect(包.get('.cuowu-biaoti').text().length).toBeGreaterThan(0)
    expect(包.get('.cuowu-miaoshu').text().length).toBeGreaterThan(0)
    expect(包.findAll('.cuowu-anniu-zu button')).toHaveLength(1)
    expect(包.findAll('.cuowu-anniu-zu button')[0].attributes('type')).toBe('button')
  })

  it('渲染异常落地时给刷新与重置两枚动作，重置只对真异常露出', () => {
    const 源 = 读源('components', '错误边界.vue')
    expect(源).toContain('class="cuowu-anniu-zu"')
    expect(源).toContain('class="shuaxin-anniu"')
    expect(源).toContain('v-if="!qiangZhiXianShi"')
    expect(源).toContain('class="chongzhi-anniu"')
    expect(源).toContain('@click="chongZhiCuoWu"')
    expect(源).toContain('onErrorCaptured')
  })

  it('样式只吃令牌：零字面色值、零玻璃层、零浅色硬编码分支', () => {
    const 源 = 读源('components', '错误边界.vue')
    const 边样式 = 源.slice(源.indexOf('<style'))
    expect(边样式).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(边样式).not.toMatch(/(^|[^-])rgba?\(/m)
    expect(边样式).not.toContain('backdrop-filter')
    expect(边样式).not.toContain("[data-theme='light']")
    expect(边样式).toContain('border-left: 3px solid var(--cuo-wu-biaoti)')
    expect(边样式).toContain('min-height: var(--shuru-anniu-re-ku)')
    expect(边样式).toContain('background: var(--cuo-wu-mian)')
  })
})

describe('报错框全站唯一来源', () => {
  const 全Vue: string[] = []
  ;(function 收(目录: string) {
    for (const 条 of readdirSync(目录, { withFileTypes: true })) {
      if (条.name === '__tests__') continue
      const 全 = resolve(目录, 条.name)
      if (条.isDirectory()) 收(全)
      else if (条.name.endsWith('.vue')) 全Vue.push(全)
    }
  })(源码根)

  it('只有共享报错框与错误边界持有 cuowu-tishi 语义面', () => {
    const 持有 = 全Vue.filter((f) => 读源(...f.slice(源码根.length + 1).split('\\')).includes('class="qian-tai-cuo-wu cuowu-tishi"'))
    expect(持有.length).toBe(1)
    const 边界 = 全Vue.filter((f) => readFileSync(f, 'utf8').includes('class="cuowu-tishi" role="alert"'))
    expect(边界.length).toBe(1)
  })

  it('所有消费方都从同一文件引入，没有第二份报错框实现', () => {
    const 消费 = 全Vue.filter((f) => /from '@\/components\/请求错误\.vue'/.test(readFileSync(f, 'utf8')))
    expect(消费.length).toBeGreaterThanOrEqual(10)
    const 自建 = 全Vue.filter((f) => {
      const 源 = readFileSync(f, 'utf8')
      return /class="[^"]*cuowu-tishi/.test(源) && !源.includes('请求错误.vue') && !f.endsWith('错误边界.vue') && !f.endsWith('请求错误.vue')
    })
    expect(自建).toEqual([])
  })
})
