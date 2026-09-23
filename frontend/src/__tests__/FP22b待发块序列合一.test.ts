import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 按档解析全部, 声明块清单, 声明位置 } from './主题令牌真源'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import { xieRuShuRuQu } from './输入区夹具'
import type { DaiFaKuai } from '@/composables/use待发图文'

/**
 * FP-22b（审计 B3/S8 重大）待发块序列两份合一 —— **FP-10c 真内联落盘后的改判版**。
 *
 * 缺陷本体（FP-22b 立项时）：AI 聊天页与好友页把「待发图文块序列」的模板与 CSS 各自抄了一份且已漂移 ——
 * 聊天页的 `.dai-fa-kuai-lie` 声明了 `--dai-fa-kuai-tu-kuan` 与 `--dai-fa-kuai-tu-gao` 两枚，
 * 好友页只抄到 `-kuan` 那一行，`.dai-fa-kuai-tu` 的 height 改吃 `-kuan`。两档取值同为 64px，
 * 所以**像素上当时看不出差别**，但下一次只改一页就会长成两个样子。
 *
 * 需求 #6 的前提是同区只有**一处**实现。FP-10c 把待发序列并进 contenteditable 真内联输入区后，
 * `components/聊天/待发图文块序列.vue` 退役，本文件的守卫对象因此**反转指向**
 * `components/聊天/图文输入区.vue` —— "两页共用一份"这条不变式一字不删，只是那"一份"换了文件。
 * 逐条旧→新（每条都在测试内就近再记一次）：
 *  ①结构：旧「六处 dai-fa-kuai* 类名只在 待发图文块序列.vue」→ 新「dai-fa-kuai* 类名只在
 *    图文输入区.vue」。旧的 `.dai-fa-kuai-lie` / `--huodong` / `-anniu` / `-xu` / `-wen` 随容器与
 *    序号呈现退役（FP10c真内联输入区.test.ts ① 判它们全库命中 0），这里不复活它们，
 *    改为钉「现役的四个类名（dai-fa-kuai / --tu / --wen / -tu / -tu--biaoqingbao / -shanchu）唯一」。
 *  ②数值：完全保留（四枚尺寸令牌各声明一次、住共用 :root、全库无第二处声明）。
 *    **加强**：再加"量纲令牌深浅两档解析逐值相等"的成对性判定（FP-12 口径），
 *    因为 FP-10c 新补的 --shuru-kuang-yuanjiao / --shuru-zhan-kai-gao-du 就是这一族的新成员。
 *  ③行为：旧「点文字块切段 + 每块三个前移/后移/删除按钮 + 禁用态」无宿主（切段与逐块按钮随序列退役）
 *    → 新「块级手势只剩三种且各有唯一出口：拖序 @yi-dong(congId, daoXiaBiao)、
 *    单块删除 @shan-chu(kuaiId)、整块退格由 DOM→真源那条路收口」。
 *    旧断言真正在乎的是"页面不自己改块数组、组件不建第二份块状态"，这一层新旧同义且判得更严。
 */

const 源目录 = resolve(__dirname, '..')
const 组件相对路径 = 'components/聊天/图文输入区.vue'
const 组件源 = readFileSync(resolve(源目录, 组件相对路径), 'utf-8')
const 聊天页源 = readFileSync(resolve(源目录, 'views/聊天页面.vue'), 'utf-8')
const 好友页源 = readFileSync(resolve(源目录, 'views/好友聊天.vue'), 'utf-8')
const 令牌源 = readFileSync(resolve(源目录, 'styles/variables.css'), 'utf-8')

const 两页: ReadonlyArray<readonly [页名: string, 源码: string]> = [
  ['聊天页面.vue', 聊天页源],
  ['好友聊天.vue', 好友页源],
]

const 尺寸令牌 = [
  '--daifa-kuai-tu-kuan',
  '--daifa-kuai-tu-gao',
  '--tuwen-tu-zuidakuan',
  '--tuwen-tu-zuida-gao',
]

/** FP-10c 新补的量纲令牌：与 --daifa-kuai-tu-* 同族，同样只准住共用 :root 块 */
const 新增量纲令牌 = ['--shuru-kuang-yuanjiao', '--shuru-zhan-kai-gao-du', '--daifa-kuai-tu-yuanjiao']

function 遍历(目录: string): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 完整 = resolve(目录, 项.name)
    if (项.isDirectory()) 结果.push(...遍历(完整))
    else if (/\.(ts|vue|css)$/.test(项.name)) 结果.push(完整)
  }
  return 结果
}

function 相对(全路径: string): string {
  return 全路径.replace(/\\/g, '/').split('/src/')[1]
}

function 含串的文件(串: RegExp): string[] {
  return 遍历(源目录)
    .filter((路) => 串.test(readFileSync(路, 'utf-8')))
    .map(相对)
    .sort()
}

/** 取某条 CSS 规则的声明块内容（用于「这条规则里不许再留裸数字/第二份令牌」这类判定） */
function 规则体(源码: string, 选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${转义}\\s*\\{([^}]*)\\}`).exec(源码)?.[1] ?? ''
}

function 声明次数(源码: string, 令牌: string): number {
  return (
    源码.match(new RegExp(`^[ \\t]*${令牌.replace(/-/g, '\\-')}[ \\t]*:`, 'gm')) ?? []
  ).length
}

function 块(编号: string, 类型: 'wenzi' | 'tupian', 正文 = ''): DaiFaKuai {
  return {
    id: 编号,
    lei_xing: 类型,
    nei_rong: 正文,
    wen_jian: null,
    mei_ti_id: null,
    mei_ti_lei_bie: null,
    yu_lan_url: 类型 === 'tupian' ? `blob:${编号}` : null,
    mi_deng_jian: `jian-${编号}`,
  }
}

/** 与两页逐字同构的挂台：真源＝use待发图文，页面只提供 prop 透传与事件出口（不另造语义） */
function 挂台(kuaiLieBiao: DaiFaKuai[], 出口: { shanChu?: (id: string) => void; yiDong?: (c: string, x: number) => void } = {}) {
  const shuRuNeiRong = ref('')
  const bianJi = use待发图文({ shuRuNeiRong })
  for (const kuai of kuaiLieBiao) bianJi.kuaiLieBiao.value.push(kuai)
  const zhuJi = defineComponent({
    setup: () => () =>
      h(TuWenShuRuQu, {
        kuaiLieBiao: bianJi.kuaiLieBiao.value,
        wenBen: shuRuNeiRong.value,
        guangBiao: bianJi.guangBiao.value,
        zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
        zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
        onGengXinGuangBiao: (weiZhi: DaiFaGuangBiao) => bianJi.gengXinGuangBiao(weiZhi),
        onBianJi: (duan: BianJiQiDuan[], ids: string[]) => bianJi.tongBuCongBianJiQi(duan, ids),
        onShanChu: (id: string) => 出口.shanChu?.(id),
        onYiDong: (c: string, x: number) => 出口.yiDong?.(c, x),
      }),
  })
  return { wrapper: mount(zhuJi, { attachTo: document.body }), bianJi, shuRuNeiRong }
}

describe('FP-22b 结构守卫：待发块呈现只在唯一组件里有一份模板与一份 CSS', () => {
  const 现役类名 = [
    'dai-fa-kuai',
    'dai-fa-kuai--tu',
    'dai-fa-kuai--wen',
    'dai-fa-kuai-tu',
    'dai-fa-kuai-tu--biaoqingbao',
    'dai-fa-kuai-shanchu',
  ]

  it('dai-fa-kuai 家族类名（模板与选择器一并）只出现在唯一组件文件', () => {
    expect(含串的文件(/dai-fa-kuai/), '发现第二处 dai-fa-kuai 实现').toEqual([组件相对路径])
    for (const 名 of 现役类名) {
      expect(组件源, `合一后组件丢失原有类名 ${名}`).toContain(名)
    }
  })

  it('两页各自 import 唯一组件，且不再本地持有拖拽台账与块级手势', () => {
    for (const [页名, 源] of 两页) {
      expect(源, `${页名} 未接唯一组件`).toMatch(
        /import TuWenShuRuQu from '@\/components\/聊天\/图文输入区\.vue'/,
      )
      expect(源, `${页名} 未使用组件标签`).toMatch(/<TuWenShuRuQu\b/)
      // 契约演进 ①：改判前钉的是 import 待发图文块序列.vue；那份实现已随真内联退役，
      // 这里同时判"退役组件不得复活"，比旧断言多咬住一种回归路径。
      expect(源, `${页名} 复活了已退役的待发序列组件`).not.toMatch(/待发图文块序列/)
      // 块拖拽台账随模板一起收进组件；页面再留一份就是第二真源
      expect(源, `${页名} 仍自带拖拽台账 tuoZhanKuaiId`).not.toMatch(/tuoZhanKuaiId/)
      for (const 名 of ['kaiShiKuaiTuoZhan', 'luoXiaKuaiTuoZhan', 'jieshuKuaiTuoZhan']) {
        expect(源, `${页名} 仍自带 ${名}`).not.toMatch(new RegExp(`\\b${名}\\b`))
      }
      expect(源, `${页名} 仍自带 .shuru-kuang 度量`).not.toMatch(/\.shuru-kuang[^-\w]*\s*\{/)
    }
  })

  it('两页把 use待发图文 的真源出口原样透传；组件只发意图事件，不自建块序列状态', () => {
    for (const [页名, 源] of 两页) {
      const 标签 = /<TuWenShuRuQu\b[\s\S]*?\/>/.exec(源)?.[0] ?? ''
      expect(标签, `${页名} 找不到组件标签`).not.toBe('')
      // 契约演进 ①：旧的 :huo-yue-kuai-id / :you-tu-pian 两个 prop 随「切段」一起退役
      // （真内联下没有活动段可标，块与文字同处一条流 ⇒ 活动态就是光标本身，住在真源的 guangBiao）。
      expect(标签, `${页名} 未把块序列真源传给组件`).toContain(':kuai-lie-biao="daiFaKuai"')
      expect(标签, `${页名} 未把文字投影真源传给组件`).toContain(':wen-ben="shuRuNeiRong"')
      expect(标签, `${页名} 未把光标真源传给组件`).toContain(':guang-biao="daiFaGuangBiao"')
      expect(标签, `${页名} 未把「切段」这类已退役的出口复活`).not.toMatch(/@qie-huan|@qian-yi|@hou-yi/)
      // 删除 / 改序 / 插入 / 编辑 / 上报光标 / 发送 六个意图全部回到 use待发图文 那一份实现
      for (const 出口 of [
        'geng-xin-guang-biao',
        'bian-ji',
        'cha-ru-wen-ben',
        'fa-song',
        'shan-chu',
        'yi-dong',
      ]) {
        expect(标签, `${页名} 缺 @${出口} 出口`).toContain(`@${出口}="`)
      }
    }
    expect(组件源, '组件不得自己改块数组，只能发事件').not.toMatch(/\.(splice|push|sort)\(/)
  })
})

describe('FP-22b 数值守卫：缩略图与气泡图文块尺寸只有一处数字', () => {
  const 共用块 = /:root\s*\{([\s\S]*?)\}/.exec(令牌源)?.[1] ?? ''

  it('四枚尺寸令牌各声明一次，且住在共用 :root 块（深浅两档恒等，同 --shuru-*）', () => {
    expect(共用块, '取不到 variables.css 的共用 :root 块').not.toBe('')
    for (const 名 of 尺寸令牌) {
      expect(声明次数(令牌源, 名), `${名} 在 variables.css 内的声明处数`).toBe(1)
      expect(共用块, `${名} 不在共用 :root 块，另一档会塌陷`).toContain(名)
    }
    // 钉住「上收不改数值」：合一前两页实测同为 64×64 与 180×200
    expect(共用块).toMatch(/--daifa-kuai-tu-kuan:\s*64px/)
    expect(共用块).toMatch(/--daifa-kuai-tu-gao:\s*64px/)
    expect(共用块).toMatch(/--tuwen-tu-zuidakuan:\s*180px/)
    expect(共用块).toMatch(/--tuwen-tu-zuida-gao:\s*200px/)
  })

  it('FP-10c 新补的三枚量纲令牌同样只住共用 :root，且深浅两档解析逐值相等（成对性，FP-12 口径）', () => {
    // 契约演进 ②（加强）：旧断言只查"住在共用块"。FP-10c 一次补了 4 枚新令牌（含 --shuru-zhan-kai-gao-du），
    // 前一名工人的待办第 7 项正是这条 ⇒ 升级为按声明块清单机器解析两档取值，任何一枚只住单侧主题块即红。
    const 块们 = 声明块清单()
    const 浅 = 按档解析全部('light', 块们)
    const 深 = 按档解析全部('dark', 块们)
    for (const 名 of [...尺寸令牌, ...新增量纲令牌]) {
      expect(声明位置(名, 块们), `${名} 是量纲令牌，只能住共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
      expect(浅.get(名), `${名} 浅色档未定义`).toBeDefined()
      expect(`${名}:${深.get(名)}`, `${名} 深浅两档取值不等 = 换档即漂移`).toBe(`${名}:${浅.get(名)}`)
    }
  })

  it('全库不存在 variables.css 之外重声明这些令牌的第二真源', () => {
    const 名单 = [...尺寸令牌, ...新增量纲令牌]
    const 命中 = 遍历(源目录)
      .filter((路) => 相对(路) !== 'styles/variables.css')
      .filter((路) => {
        const 源 = readFileSync(路, 'utf-8')
        return 名单.some((名) => 声明次数(源, 名) > 0)
      })
      .map(相对)
    expect(命中, '局部又声明了一遍上收后的尺寸令牌').toEqual([])
  })

  it('组件与聊天页都吃令牌，相关规则体内不留裸像素也不留旧局部量', () => {
    const 缩略图 = 规则体(组件源, '.dai-fa-kuai-tu')
    expect(缩略图).toContain('width: var(--daifa-kuai-tu-kuan)')
    expect(缩略图).toContain('height: var(--daifa-kuai-tu-gao)')
    // 好友页漂移形态（height 回吃 -kuan）不得被抄进唯一实现
    expect(缩略图).not.toMatch(/height:\s*var\(--daifa-kuai-tu-kuan\)/)
    expect(组件源).not.toMatch(/--dai-fa-kuai-tu-/)
    // 契约演进 ②：待发缩略图圆角同样是单一真源，不留 6px 字面量
    expect(缩略图).toContain('border-radius: var(--daifa-kuai-tu-yuanjiao)')

    const 气泡图 = 规则体(聊天页源, '.tuwen-kuai-tu')
    expect(气泡图).toContain('max-width: var(--tuwen-tu-zuidakuan)')
    expect(气泡图).toContain('max-height: var(--tuwen-tu-zuida-gao)')
    expect(规则体(聊天页源, '.tuwen-kuai--tu'), '局部又声明了一遍令牌 = 第二真源').not.toContain(
      '--tuwen-tu-',
    )
  })
})

describe('FP-22b 行为守卫：唯一实现的三种块级手势各有单一出口', () => {
  const 序列 = [块('w1', 'wenzi', '早'), 块('t1', 'tupian'), 块('w2', 'wenzi', '晚')]

  it('块节点按真源块数组渲染；真源没有块时一个块节点都不出现（纯文本路径一行行为都没变）', () => {
    // 契约演进 ③：旧判定是「youTuPian=false ⇒ 整只 .dai-fa-kuai-lie 不渲染」。真内联后没有那只容器，
    // 而且文字段的物化与否由真源的「无图片块退回纯文本态」那条规则决定（不是组件自己判），
    // 故这里判的是同一件事的两端：真源空 ⇒ DOM 空；真源有块 ⇒ DOM 逐块有节点。
    const 收起 = 挂台([])
    expect(收起.wrapper.findAll('[class*="dai-fa-kuai"]')).toHaveLength(0)
    收起.wrapper.unmount()

    const 展开 = 挂台(序列)
    expect(展开.wrapper.findAll('.dai-fa-kuai')).toHaveLength(3)
    expect(展开.wrapper.findAll('.dai-fa-kuai--tu')).toHaveLength(1)
    展开.wrapper.unmount()
  })

  it('DOM 层级与读屏语义逐块对齐现状：原子块不可编辑、可拖，文字块不带这些标记', () => {
    const 展开 = 挂台(序列)
    const 块们 = 展开.wrapper.findAll('.dai-fa-kuai')
    expect(块们.map((项) => 项.attributes('data-kuai-id'))).toEqual(['w1', 't1', 'w2'])
    expect(块们[0].find('span').exists()).toBe(false)
    expect(块们[0].text()).toBe('早')
    expect(块们[1].attributes('contenteditable')).toBe('false')
    expect(块们[1].attributes('draggable')).toBe('true')
    expect(块们[1].find('img.dai-fa-kuai-tu').attributes('src')).toBe('blob:t1')
    expect(块们[1].find('img.dai-fa-kuai-tu').attributes('alt')).toBe(
      huoQuFanYi('duoMeiTi', 'tuPianYuLan'),
    )
    expect(块们[0].attributes('contenteditable')).toBeUndefined()
    展开.wrapper.unmount()
  })

  it('单块删除：点 × 只上抛这一块自己的 id，且 .stop 不外溢成编辑', async () => {
    const 上抛: string[] = []
    const 展开 = 挂台(序列, { shanChu: (id) => 上抛.push(id) })
    const 按钮 = 展开.wrapper.findAll('.dai-fa-kuai-shanchu')
    expect(按钮).toHaveLength(1)
    await 按钮[0].trigger('click')
    expect(上抛, '删除钮没把块 id 交给真源出口').toEqual(['t1'])
    展开.wrapper.unmount()
  })

  it('拖序：只有图片块可拖，drop 落点索引交页面；未起拖或落回自身不动手', async () => {
    const 上抛: Array<[string, number]> = []
    const 展开 = 挂台(序列, { yiDong: (c, x) => 上抛.push([c, x]) })
    const 块们 = 展开.wrapper.findAll('.dai-fa-kuai')

    await 块们[1].trigger('dragstart')
    await 块们[1].trigger('dragend')
    await 块们[0].trigger('drop')
    expect(上抛, 'dragend 已清台账，拖拽结束后不该再改序').toEqual([])

    await 块们[1].trigger('dragstart')
    await 块们[1].trigger('drop')
    expect(上抛, 'drop 到自身不该产生改序').toEqual([])

    // 契约演进 ③：文字是一条流，拖文字块等于凭空改序 ⇒ 只有图片块可起拖
    await 块们[0].trigger('dragstart')
    await 块们[1].trigger('drop')
    expect(上抛, '拖文字块也能改序 = 与图片语义不一致').toEqual([])

    await 块们[1].trigger('dragstart')
    await 块们[2].trigger('drop')
    expect(上抛, '拖图片块到后面的文字段上不生效').toEqual([['t1', 2]])
    展开.wrapper.unmount()
  })

  it('整块退格：块节点从 DOM 摘掉后真源不再持有它，页面不自己 splice/push', async () => {
    const 展开 = 挂台(序列)
    const 真源 = 展开.bianJi
    expect(真源.kuaiLieBiao.value).toHaveLength(3)
    展开.wrapper.find('.dai-fa-kuai--tu').element.remove()
    展开.wrapper.find('.shuru-kuang').element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    await nextTick()
    expect(
      真源.kuaiLieBiao.value.some((项) => 项.id === 't1'),
      'DOM 删掉的块仍留在真源里 ⇒ 会把一张用户已删的图发出去',
    ).toBe(false)
    expect(真源.kuaiLieBiao.value.filter((项) => 项.lei_xing === 'tupian')).toHaveLength(0)
    expect(
      真源.kuaiLieBiao.value.length === 0
        ? 展开.shuRuNeiRong.value
        : 真源.kuaiLieBiao.value.map((项) => 项.nei_rong).join(''),
      '块没了但文字也不能丢（无图片块时真源退回纯文本态，文字住投影里）',
    ).toContain('早')
    展开.wrapper.unmount()
  })

  it('纯文本态下真源不造块：打字只改文字投影，块数组恒为空（兼容性铁律）', async () => {
    const 展开 = 挂台([])
    await xieRuShuRuQu(展开.wrapper, '一句纯文本')
    expect(展开.bianJi.kuaiLieBiao.value).toEqual([])
    expect(展开.wrapper.findAll('[class*="dai-fa-kuai"]')).toHaveLength(0)
    展开.wrapper.unmount()
  })
})
