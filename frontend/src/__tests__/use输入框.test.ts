import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import { 解析几何数值 } from './主题令牌真源'
import { xieRuShuRuQu } from './输入区夹具'

/**
 * 这里原本是 `composables/use输入框.ts` 那条 JS 量高链的单元测试。
 *
 * FP-10c 把折叠/展开改成纯 CSS（min-height/max-height 吃令牌）后，该 composable 连同文件一起
 * 删除，"测一个不存在的模块"就是空转测试，故本文件按新契约重写，而不是留着读不到东西的用例。
 * 三条旧口径各自的去向：
 *  ①「测量得自然内容高度、折叠态是单行 max-height」→ 折叠档 min-/max-height **严格等于**
 *    --shuru-danxing-gao-du 的解析值（走 主题令牌真源::解析几何数值，不是字符串比对）；
 *  ②「内容超一行保持折叠不自动展开，把溢出交给可见滚动条」→ 真的灌一段超一行的内容进组件，
 *    断言 .zhan-kai 不会出现、展开只由用户点击决定；
 *  ③「单行高度取整自同一组 CSS 度量」→ 保留原算式（字号×行高 + 上下内边距×2 再 ceil 等于令牌）。
 * 与 聊天界面.test.ts(FP-02b) / FP22e 不重复：那两处判页面与令牌归档，本文件判组件挂载后的
 * 运行时行为（会不会自己偷偷展开）与折叠档的两轴声明形态。
 */

const 组件样式段 = readFileSync(
  resolve(__dirname, '../components/聊天/图文输入区.vue'),
  'utf-8',
).replace(/\/\*[\s\S]*?\*\//g, '')

function 规则体(选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 体 = new RegExp(`(?:^|\\})\\s*${转义}\\s*\\{([^}]*)\\}`).exec(组件样式段)?.[1]
  if (体 === undefined) throw new Error(`组件样式里找不到规则 ${选择器}`)
  return 体
}

/** 该规则里该属性的**单一 var() 令牌名**；写像素、写 calc()、带兜底字面量一律当场抛错 */
function 吃的令牌(选择器: string, 属性: string): string {
  const 值 = new RegExp(`(?:^|;)\\s*${属性}\\s*:\\s*([^;]+)`).exec(规则体(选择器))?.[1]?.trim()
  if (值 === undefined) throw new Error(`${选择器} 里没有 ${属性} 声明（折叠档不许靠 JS 补）`)
  const 匹配 = /^var\(\s*(--[\w-]+)\s*\)$/.exec(值)
  if (!匹配) throw new Error(`${选择器} 的 ${属性} 未引用单一令牌：${值}`)
  return 匹配[1]
}

function guaZai() {
  const shuRuNeiRong = ref('')
  const bianJi = use待发图文({ shuRuNeiRong })
  const zhuJi = defineComponent({
    setup: () => () =>
      h(TuWenShuRuQu, {
        kuaiLieBiao: bianJi.kuaiLieBiao.value,
        wenBen: shuRuNeiRong.value,
        guangBiao: bianJi.guangBiao.value,
        zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
        zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
        onGengXinGuangBiao: (weiZhi: DaiFaGuangBiao) => bianJi.gengXinGuangBiao(weiZhi),
        onBianJi: (duan: BianJiQiDuan[], xianShiXuanRanIds: string[]) =>
          bianJi.tongBuCongBianJiQi(duan, xianShiXuanRanIds),
        onChaRuWenBen: (wenBen: string, weiZhi: DaiFaGuangBiao) =>
          bianJi.chaRuWenZi(wenBen, weiZhi),
      }),
  })
  return { wrapper: mount(zhuJi, { attachTo: document.body }), shuRuNeiRong }
}

describe('FP-05 单行高度与 CSS 同源度量不冲突（折叠/展开的纯 CSS 契约）', () => {
  it('单行高度算式取整后与全局令牌逐值相等', () => {
    const zihao = 解析几何数值('--shuru-kuang-zihao')
    const hangao = 解析几何数值('--shuru-kuang-hangao')
    const neidian = 解析几何数值('--shuru-kuang-shang-xia-neidian')
    expect([zihao, hangao, neidian]).toEqual([16, 1.4, 6])
    const danXingGao = zihao * hangao + neidian * 2
    expect(danXingGao).toBeCloseTo(34.4, 6)
    expect(Math.ceil(danXingGao)).toBe(解析几何数值('--shuru-danxing-gao-du'))
    expect(解析几何数值('--shuru-danxing-gao-du')).toBe(35)
  })

  it('折叠档两轴都严格吃折叠令牌，展开档只换 max-height 一轴', () => {
    for (const 属性 of ['min-height', 'max-height']) {
      expect(吃的令牌('.shuru-kuang', 属性), `折叠档 ${属性} 不再吃单行令牌`).toBe(
        '--shuru-danxing-gao-du',
      )
    }
    expect(解析几何数值(吃的令牌('.shuru-kuang', 'min-height'))).toBe(35)
    expect(吃的令牌('.shuru-kuang.zhan-kai', 'max-height')).toBe('--shuru-zhan-kai-gao-du')
    // 展开档只准出现这一条声明：再报 min-height / height 就是第二处量高。
    // 契约演进（FP-10c 尾段）：旧写法 `split(';').keys()` 数的是切片段数，末尾那个分号必然多切出
    // 一个空串 ⇒ 恒为 2，是断言自身 off-by-one，不是实现多写了一条声明。改判为「非空声明逐条枚举」：
    // 既保住"只有一条"这条更强的量纲唯一性，又把那一条的内容钉死，比旧断言更严。
    const 展开声明 = 规则体('.shuru-kuang.zhan-kai')
      .split(';')
      .map((条) => 条.replace(/\s+/g, ' ').trim())
      .filter((条) => 条 !== '')
    expect(展开声明).toEqual(['max-height: var(--shuru-zhan-kai-gao-du)'])
    expect(组件样式段).not.toMatch(/\.zhan-kai\s*\{[^}]*(?:^|;)\s*height\s*:/)
  })

  it('灌入超一行内容也不会自动展开；展开只由点击决定', async () => {
    const { wrapper } = guaZai()
    await xieRuShuRuQu(wrapper, '一'.repeat(200))
    expect(wrapper.find('.shuru-kuang').classes()).not.toContain('zhan-kai')
    expect(wrapper.find('.shuru-kuang').text()).toContain('一')
    wrapper.unmount()
  })
})

describe('FP-02 输入框绿线根因去除', () => {
  it('全局输入聚焦不再使用绿色描边', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf-8')
    expect(css).not.toMatch(/:focus-visible\s*{[^}]*var\(--zhuse\)/)
    expect(css).not.toMatch(/\.shuru-kuang:focus\s*{[^}]*var\(--zhuse\)/)
  })
})
