import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount, type VueWrapper } from '@vue/test-utils'
import 全局菜单 from '@/components/全局菜单.vue'

const 源码根 = resolve(__dirname, '..')
const 菜单源 = readFileSync(resolve(源码根, 'components/全局菜单.vue'), 'utf8')

function 取样式块(源: string): string {
  return [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((匹) => 匹[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function 取模板块(源: string): string {
  const 匹 = /<template>([\s\S]*)<\/template>/.exec(源)
  if (!匹) throw new Error('全局菜单.vue 缺少 <template> 块')
  return 匹[1]
}

function 声明值(样式: string, 选择器: string, 属性: string): string[] {
  const 出: string[] = []
  for (const 规则 of 样式.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const 命中 = 规则[1]
      .split(',')
      .some((部) => 部.trim().replace(/:hover|:focus-visible/g, '') === 选择器)
    if (!命中) continue
    for (const 声明 of 规则[2].matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;]+)/g)) {
      if (声明[1].toLowerCase() === 属性) 出.push(声明[2].trim())
    }
  }
  return 出
}

const 样式 = 取样式块(菜单源)
const 模板 = 取模板块(菜单源)

describe('要求2/7 顶部导航：返回与主页槽位恒定宽度', () => {
  it('返回/主页被固定宽度槽位包裹，槽位 flex 不伸缩', () => {
    expect(模板).toMatch(/<div class="caidan-zuo">\s*<div class="fanhui-cao-wei">/)
    expect(声明值(样式, '.fanhui-cao-wei', 'width')).toEqual(['var(--daohanglan-cao-wei-kuan)'])
    expect(声明值(样式, '.fanhui-cao-wei', 'flex')).toEqual(['none'])
  })

  it('槽位宽度由两枚按钮尺寸与一个间距档推导，无第二处字面量', () => {
    expect(样式).toMatch(
      /--daohanglan-cao-wei-kuan:\s*calc\(var\(--daohanglan-anniu-chi\) \* 2 \+ var\(--jiange-xiao\)\)/,
    )
    expect(声明值(样式, '.zhuye-anniu', 'width')).toEqual(['var(--daohanglan-anniu-chi)'])
    expect(声明值(样式, '.zhuye-anniu', 'height')).toEqual(['var(--daohanglan-anniu-chi)'])
  })

  it('三栏网格全站唯一：两侧等宽可收缩，中间按内容居中', () => {
    expect(声明值(样式, '.caidan-neirong', 'grid-template-columns')).toEqual([
      'minmax(0, 1fr) auto minmax(0, 1fr)',
    ])
    expect([...菜单源.matchAll(/grid-template-columns/g)]).toHaveLength(1)
  })
})

describe('要求2 顶部导航：只留图标，不留文字标签', () => {
  it('返回/主页/更多的文字标签与其显隐规则全部删除', () => {
    for (const 死类 of ['fanhui-wenzi', 'zhuye-wenzi', 'qita-wenzi']) {
      expect(菜单源, `残留 ${死类}`).not.toContain(死类)
    }
    expect(菜单源).not.toMatch(/\.caidan-zuo\s*\{[^}]*gap:\s*var\(--jiange-da\)/)
  })

  it('图标按钮保留 title 与 aria-label 作为可读名称', () => {
    expect(模板).toMatch(/class="fanhui-anniu[\s\S]{0,220}?:title="huoQuFanYi\('caidan', 'fanHui'\)"/)
    expect(模板).toMatch(
      /class="fanhui-anniu[\s\S]{0,260}?:aria-label="huoQuFanYi\('caidan', 'fanHui'\)"/,
    )
    expect(模板).toMatch(/class="zhuye-anniu[\s\S]{0,220}?:aria-label="huoQuFanYi\('caidan', 'zhuYe'\)"/)
    expect(模板).toMatch(/class="qita-xuanxiang[\s\S]{0,400}?:aria-label="huoQuFanYi\('caidan', 'gengDuo'\)"/)
  })
})

describe('要求3 顶部导航：非聊天页中间完全空出', () => {
  it('页面标题 h1 与路由标题映射整体删除', () => {
    for (const 死标识 of ['ye-mian-biao-ti', 'dangQianYeMianBiaoTi', 'fanYiBiaoTiDuiZhao']) {
      expect(菜单源, `残留 ${死标识}`).not.toContain(死标识)
    }
  })

  it('会话名仍是中间唯一内容，且受自身 max-width 约束不外溢', () => {
    expect(模板).toMatch(/<div class="caidan-zhong">\s*<div v-if="xianShiHuiHuaMing"/)
    expect(声明值(样式, '.jiaose-mingcheng-caidan', 'max-width')).toEqual(['180px', '80px', '70px'])
    expect(声明值(样式, '.jiaose-mingcheng-caidan', 'overflow')).toEqual(['hidden'])
  })
})

const 空路由 = { path: '/', component: { template: '<div />' } }

async function 挂载于(名字: string): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: 空路由.component },
      { path: '/guo-wang-zhan-ji', name: 'guoWangZhanJi', component: 空路由.component },
      { path: '/qi-pao-she-zhi', name: 'qiPaoSheZhi', component: 空路由.component },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 空路由.component },
    ],
  })
  await router.push({ name: 名字, params: 名字 === 'liaoTian' ? { huiHuaId: 'ce-shi' } : {} })
  await router.isReady()
  const 壳 = mount(全局菜单, { global: { plugins: [createPinia(), router] }, attachTo: document.body })
  return 壳
}

describe('要求1 头像槽位跨页面结构一致', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('主页（无返回/主页）与战绩页（有返回/主页）都渲染同宽槽位，头像紧随其后', async () => {
    const 主页 = await 挂载于('zhuJieMian')
    const 战绩 = await 挂载于('guoWangZhanJi')
    try {
      for (const 壳 of [主页, 战绩]) {
        const 槽位 = 壳.get('.fanhui-cao-wei')
        expect(槽位.exists()).toBe(true)
        expect(槽位.element.nextElementSibling?.classList.contains('yonghu-xuanxiang')).toBe(true)
        expect(壳.findAll('.yonghu-xuanxiang')).toHaveLength(1)
      }
      expect(主页.findAll('.fanhui-anniu.yincang')).toHaveLength(1)
      expect(主页.findAll('.zhuye-anniu.yincang')).toHaveLength(1)
      expect(战绩.findAll('.fanhui-anniu.yincang')).toHaveLength(0)
      expect(战绩.findAll('.zhuye-anniu.yincang')).toHaveLength(0)
    } finally {
      主页.unmount()
      战绩.unmount()
    }
  })

  it('非聊天页中间无任何子元素，聊天页中间只有会话名容器', async () => {
    const 战绩 = await 挂载于('guoWangZhanJi')
    const 气泡 = await 挂载于('qiPaoSheZhi')
    const 聊天 = await 挂载于('liaoTian')
    try {
      for (const 壳 of [战绩, 气泡]) {
        expect(壳.get('.caidan-zhong').element.children).toHaveLength(0)
        expect(壳.get('.caidan-zhong').text()).toBe('')
      }
      expect(聊天.get('.caidan-zhong').element.children).toHaveLength(0)
      expect(聊天.find('.yonghu-xuanxiang').exists()).toBe(false)
    } finally {
      战绩.unmount()
      气泡.unmount()
      聊天.unmount()
    }
  })
})
