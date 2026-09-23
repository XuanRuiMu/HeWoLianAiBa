import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineComponent, h, nextTick, ref } from 'vue'
import { parse } from '@vue/compiler-sfc'
import { 层叠胜出, 令牌名, 规则清单, type 规则, type 探针 } from './CSS级联真源'
import { 按档解析全部, 声明块清单, 声明位置, 解析几何数值 } from './主题令牌真源'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { XIAO_XI_KUAI_LEI_XING } from '@/utils/消息内容块'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import { xieRuShuRuQu } from './输入区夹具'

/**
 * FP-10b（需求 #6 图文同区，第二刀：视觉排布）守门 —— **FP-10c 真内联落盘后的改判版**。
 *
 * 本文件原本钉的是「保留 textarea 时唯一可移植的同区形态」：待发序列作为输入区盒内、编辑器之前
 * 的兄弟块（取证 §0/§2）。FP-10c 换成 contenteditable 真内联后，那只兄弟盒连同
 * `components/聊天/待发图文块序列.vue` 一起退役，旧形态判定失去宿主。逐条旧→新（不改判的一律原样保留）：
 *  ① 旧「序列根盒的 flex-basis 不存在」→ 新「待发块**按行内排版**：`.dai-fa-kuai--tu` 层叠胜出的
 *     display 必须是 inline-block，且 width 不得是 100%」。这比旧断言更强：旧断言只允许"整行槽位
 *     由 width 承担"，新断言连那只容器都不许存在（层叠结果里 `.dai-fa-kuai-lie` 探针拿不到任何声明）。
 *  ② 旧「同区内缩与 textarea 的 padding 同一批令牌」→ 新「同一批令牌，但载体是组件的 .shuru-kuang」；
 *     旧把 textarea 的 `border-radius:6px` 冻结成"只准缩短不得新增"，新判定改成零裸像素（FP-10c 已把
 *     圆角上收成 --shuru-kuang-yuanjiao），冻结值被真正消掉 ⇒ 更严。
 *     旧「--daifa-kuai-jian-ju 有真实消费者且只有一处」→ 新「同区量纲令牌族的成对性审计」：每枚令牌
 *     只住共用 :root、深浅两档解析逐值相等、且至少一处真实消费者（零消费者即幻影令牌）；
 *     --daifa-kuai-jian-ju 随其唯一消费者退役而被删除，本文件用墓碑判定钉住它不得复活。
 *  ③ 旧「块卡片逐位等于块数组 + 序号 1/2/3」→ 新「输入区 DOM 里的 data-kuai-id 序逐位等于真源块数组序」
 *     （序号呈现随组件退役，但 DOM 序 == 视觉序这条不变式本身一字未松，且比对的是真源而非自身）。
 *  ④ 旧「页面 AST：序列与 textarea 同处 .shuru-kuang-waike 且排在编辑器之前」→ 新「页面 AST：两页都
 *     只挂 <TuWenShuRuQu>，输入区行内不存在第二个文字载体，也不存在第二只待发容器」。
 *  ⑤ 相邻契约（FP-23 图标等高 / FP-04a 滚动口与折叠高 / FP-09 引用条整行槽位）原样保留，
 *     只是 .shuru-kuang 那组规则从页面局部搬到唯一组件里。
 * 判据一律走层叠结果 / var() 解析值 / DOM·AST（B10），不接受「源码里含有某串」。
 */

const 源目录 = resolve(__dirname, '..')
const 组件路径 = 'components/聊天/图文输入区.vue'
const 聊天页路径 = 'views/聊天页面.vue'
const 好友页路径 = 'views/好友聊天.vue'

function 读源(相对路径: string): string {
  return readFileSync(join(源目录, 相对路径), 'utf-8')
}

/** 去掉注释后的源码：消费者判定必须看真声明，不能把注释里的 `var(--x)` 当成消费（FP-10c 实测踩到） */
function 去注释(源: string): string {
  return 源.replace(/\/\*[\s\S]*?\*\//g, '')
}

function 样式规则(相对路径: string): 规则[] {
  const { descriptor, errors } = parse(读源(相对路径), { filename: 相对路径 })
  if (errors.length > 0) throw new Error(`${相对路径} 解析失败：${errors[0].message}`)
  if (descriptor.styles.length === 0) throw new Error(`${相对路径} 没有 style 段`)
  // FP-10c-12：命令式节点的待发块样式住在非 scoped 段（scoped 只命中模板节点）；
  // 层叠判定吃全部段的拼接，判定本体一字不改。
  return 规则清单(descriptor.styles.map((段) => 段.content).join('\n'))
}

const 组件规则们 = 样式规则(组件路径)
const 聊天页规则们 = 样式规则(聊天页路径)
const 编辑器: 探针 = { 标签: 'div', 类: ['shuru-kuang'] }
const 外壳: 探针 = { 标签: 'div', 类: ['shuru-kuang-waike'] }
const 图片块: 探针 = { 标签: 'span', 类: ['dai-fa-kuai', 'dai-fa-kuai--tu'] }
const 文字块: 探针 = { 标签: 'span', 类: ['dai-fa-kuai', 'dai-fa-kuai--wen'] }
/** 已退役的独立序列容器：真内联后它不该再拿到任何一条层叠声明 */
const 序列盒: 探针 = { 标签: 'div', 类: ['dai-fa-kuai-lie'] }

function 声明了(规则们: 规则[], 探针项: 探针, 属性: string): string | undefined {
  return 层叠胜出(规则们, 探针项, 属性)?.值
}

/** 同区几何属性面：只钉「盒子怎么摆」这一类量纲，改动面内不留裸像素 */
const 同区几何属性 = [
  'gap',
  'row-gap',
  'column-gap',
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'margin',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'flex-basis',
  'border',
  'border-width',
  'border-radius',
]

function 裸像素声明(规则们: 规则[], 探针项: 探针): string[] {
  const 命中: string[] = []
  for (const 属性 of 同区几何属性) {
    const 值 = 声明了(规则们, 探针项, 属性)
    if (值 === undefined) continue
    for (const 段 of 值.split(/\s+/)) {
      if (/^\d*\.?\d+px$/.test(段)) 命中.push(`${属性}:${段}`)
    }
  }
  return 命中.sort()
}

/* ---------------- ① 待发块不是独立整行，而是文字流里的行内原子块 ---------------- */

describe('FP-10b ① 层叠：图文同区不再有独立的第二只容器', () => {
  it('待发图片块按行内排版（display:inline-block），且不 claim 整行宽度', () => {
    expect(
      声明了(组件规则们, 图片块, 'display'),
      '待发块不再是行内盒 ⇒ 图与文又分回两块',
    ).toBe('inline-block')
    expect(声明了(组件规则们, 图片块, 'width'), 'width:100% = 向文字流要整行').not.toBe('100%')
    expect(声明了(组件规则们, 图片块, 'max-width')).toBe('100%')
  })

  it('旧的独立序列容器彻底消失：.dai-fa-kuai-lie 拿不到任何一条层叠声明', () => {
    // 契约演进 ①：旧判定是「flex-basis 不存在」，那是在保留容器的前提下收窄；真内联后连容器都没有，
    // 于是升级为「这只盒子的每一条几何属性都不存在」——任何一条复活即红。
    for (const 属性 of 同区几何属性) {
      expect(声明了(组件规则们, 序列盒, 属性), `.dai-fa-kuai-lie 又声明了 ${属性}`).toBeUndefined()
    }
  })

  it('同区内只有一个文字载体：外壳的模板子节点只有那只 contenteditable 编辑器', () => {
    const 模板 = 模板树(组件路径)
    const 壳 = 查找(模板, (项) => 元素类名(项).includes('shuru-kuang-waike')) as 节点
    expect(壳, '找不到 .shuru-kuang-waike').not.toBeNull()
    const 子 = 直系元素(壳)
    expect(子.map((项) => 项.tag)).toEqual(['div'])
    expect(元素类名(子[0])).toContain('shuru-kuang')
    expect(子[0].props?.some((属) => 属.arg?.content === 'contenteditable' || 属.name === 'contenteditable')).toBe(
      true,
    )
  })
})

/* ---------------- ② 同区几何：单一真源令牌 + 改动面零裸像素 ---------------- */

describe('FP-10b ② 同区几何量纲', () => {
  it('编辑器内缩的层叠胜出值是同一批 --shuru-kuang-* 令牌，解析值 6px/12px 一字未动', () => {
    const 内缩 = 声明了(组件规则们, 编辑器, 'padding')
    expect(内缩, 'padding 未回到令牌').toBe(
      'var(--shuru-kuang-shang-xia-neidian) var(--shuru-kuang-zuo-you-neidian)',
    )
    expect(解析几何数值('--shuru-kuang-shang-xia-neidian')).toBe(6)
    expect(解析几何数值('--shuru-kuang-zuo-you-neidian')).toBe(12)
  })

  it('改动面零裸像素：编辑器、外壳、待发块三处都不留字面量（旧冻结的 border-radius:6px 已真正消掉）', () => {
    expect(裸像素声明(组件规则们, 编辑器)).toEqual([])
    expect(裸像素声明(组件规则们, 外壳)).toEqual([])
    expect(裸像素声明(组件规则们, 图片块)).toEqual([])
    expect(裸像素声明(组件规则们, 文字块)).toEqual([])
    expect(令牌名(声明了(组件规则们, 外壳, 'border-radius') as string, 'border-radius')).toBe(
      '--shuru-kuang-yuanjiao',
    )
    expect(令牌名(声明了(组件规则们, 编辑器, 'border-radius') as string, 'border-radius')).toBe(
      '--shuru-kuang-yuanjiao',
    )
  })

  it('同区量纲令牌族成对性审计：只住共用 :root、深浅两档逐值相等、且至少一处真实消费者', () => {
    const 块们 = 声明块清单()
    const 浅 = 按档解析全部('light', 块们)
    const 深 = 按档解析全部('dark', 块们)
    const 族 = [
      '--shuru-kuang-zihao',
      '--shuru-kuang-hangao',
      '--shuru-kuang-shang-xia-neidian',
      '--shuru-kuang-zuo-you-neidian',
      '--shuru-kuang-biankuang',
      '--shuru-kuang-yuanjiao',
      '--shuru-danxing-gao-du',
      '--shuru-zhan-kai-gao-du',
      '--daifa-kuai-tu-kuan',
      '--daifa-kuai-tu-gao',
      '--daifa-kuai-tu-yuanjiao',
      '--tuwen-tu-zuidakuan',
      '--tuwen-tu-zuida-gao',
    ]
    for (const 名 of 族) {
      expect(声明位置(名, 块们), `${名} 是量纲令牌，只能住共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
      expect(深.get(名), `${名} 深色档塌陷（只住单侧主题块的必然结果）`).toBe(浅.get(名))
      expect(消费者文件(名), `${名} 零消费者 = 幻影令牌`).not.toEqual([])
    }
  })

  it('FP-10c 补的展开档令牌有唯一真实消费者，且消费者就是那份两页共用的输入区实现', () => {
    expect(消费者文件('--shuru-zhan-kai-gao-du'), '--shuru-zhan-kai-gao-du 的消费者必须唯一').toEqual([
      组件路径,
    ])
    for (const 名 of ['--daifa-kuai-tu-kuan', '--daifa-kuai-tu-gao', '--daifa-kuai-tu-yuanjiao']) {
      expect(消费者文件(名), `${名} 出现第二处消费者`).toEqual([组件路径])
    }
  })

  it('墓碑：--daifa-kuai-jian-ju 随唯一消费者退役，声明与引用在全库都必须命中 0（复活即红）', () => {
    // 契约演进 ②：旧断言是「--daifa-kuai-jian-ju 有真实消费者且只有一处」。FP-10c 删掉了
    // components/聊天/待发图文块序列.vue（gap 正是它的唯一消费者），令牌沦为幻影 ⇒ 按 FP-12
    // 「定义与消费成对存在」的口径删除定义，并把这条审计从"必须有消费者"翻成"不得复活"。
    const 声明 = 含串的文件(/^[ \t]*--daifa-kuai-jian-ju[ \t]*:/m)
    const 引用 = 含串的文件(/var\(\s*--daifa-kuai-jian-ju\s*[,)]/)
    expect(声明, '退役令牌又被声明回 variables.css').toEqual([])
    expect(引用, '退役令牌仍有引用 = 引用一枚不存在的令牌').toEqual([])
  })
})

/* ---------------- ③ DOM 序 == 视觉序（无任何视觉重排手段） ---------------- */

describe('FP-10b ③ 图文同一条流的呈现次序', () => {
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
          onBianJi: (duan: BianJiQiDuan[], ids: string[]) => bianJi.tongBuCongBianJiQi(duan, ids),
          onChaRuWenBen: (wenBen: string, weiZhi: DaiFaGuangBiao) => bianJi.chaRuWenZi(wenBen, weiZhi),
          onShanChu: (kuaiId: string) => bianJi.shanChuKuai(kuaiId),
        }),
    })
    return { wrapper: mount(zhuJi, { attachTo: document.body }), bianJi }
  }

  it('DOM 里的 data-kuai-id 序逐位等于真源块数组序：文字与图都按插入序呈现', async () => {
    const { wrapper, bianJi } = guaZai()
    await xieRuShuRuQu(wrapper, '先打的一句')
    bianJi.chaRuTuPian(new Blob(['tu'], { type: 'image/png' }), XIAO_XI_KUAI_LEI_XING.tuPian)
    await nextTick()
    await nextTick()
    const 真源 = bianJi.kuaiLieBiao.value.map((kuai) => kuai.id)
    const 节点 = Array.from(
      wrapper.find('.shuru-kuang').element.querySelectorAll('[data-kuai-id]'),
    ).map((项) => 项.getAttribute('data-kuai-id'))
    expect(真源.length).toBe(3)
    expect(节点, 'DOM 序与真源块序分叉 = 用户看到的顺序和发出去的不一样').toEqual(真源)
    wrapper.unmount()
  })

  it('视觉序由 DOM 序承担：层叠结果里不存在 order / flex-direction 造假序（FP-18 不变式①）', () => {
    for (const 探针项 of [图片块, 文字块, 编辑器]) {
      expect(声明了(组件规则们, 探针项, 'order'), `${探针项.类[0]} 用了 order 造假序`).toBeUndefined()
      expect(
        声明了(组件规则们, 探针项, 'flex-direction'),
        `${探针项.类[0]} 用 flex-direction 反向造假序`,
      ).toBeUndefined()
    }
  })

  it('没有图片块时一个块节点都不渲染，纯文本路径一行行为都没变（兼容性铁律）', async () => {
    const { wrapper } = guaZai()
    await xieRuShuRuQu(wrapper, '只打字')
    expect(wrapper.findAll('[class*="dai-fa-kuai"]')).toHaveLength(0)
    expect(wrapper.find('.shuru-kuang').element.querySelector('[data-kuai-id]')).toBeNull()
    wrapper.unmount()
  })
})

/* ---------------- ④ 两页结构：图文只落在那一份共用实现里 ---------------- */

interface 节点 {
  type: number
  tag?: string
  children?: 节点[]
  props?: {
    type: number
    name?: string
    value?: { content?: string }
    arg?: { content?: string }
    exp?: { content?: string }
  }[]
}

function 模板树(相对路径: string): 节点 {
  const { descriptor, errors } = parse(读源(相对路径), { filename: 相对路径 })
  if (errors.length > 0) throw new Error(`${相对路径} 解析失败：${errors[0].message}`)
  if (!descriptor.template) throw new Error(`${相对路径} 没有模板`)
  return descriptor.template.ast as unknown as 节点
}

function 元素类名(项: 节点): string[] {
  const 结果: string[] = []
  for (const 属 of 项.props ?? []) {
    if (属.type === 6 && 属.name === 'class')
      结果.push(...(属.value?.content ?? '').split(/\s+/).filter(Boolean))
    if (属.type === 7 && 属.arg?.content === 'class')
      结果.push(...(属.exp?.content ?? '').replace(/['"[\],:{}]/g, ' ').split(/\s+/).filter(Boolean))
  }
  return 结果
}

function 查找(根: 节点, 判定: (项: 节点) => boolean): 节点 | null {
  if (根.type === 1 && 判定(根)) return 根
  for (const 子 of 根.children ?? []) {
    const 命中 = 查找(子, 判定)
    if (命中) return 命中
  }
  return null
}

function 收集标签(根: 节点): string[] {
  const 结果: string[] = []
  if (根.type === 1 && 根.tag) 结果.push(根.tag)
  for (const 子 of 根.children ?? []) 结果.push(...收集标签(子))
  return 结果
}

function 直系元素(根: 节点): 节点[] {
  return (根.children ?? []).filter((项) => 项.type === 1)
}

describe('FP-10b ④ 两页输入区的结构（模板 AST）', () => {
  for (const 页路径 of [聊天页路径, 好友页路径]) {
    it(`${页路径}：输入区行里只挂共用的图文输入区，既没有第二个文字载体也没有第二只待发容器`, () => {
      const 模板 = 模板树(页路径)
      const 输入区行 = 查找(模板, (项) => 元素类名(项).includes('shuru-rongqi')) as 节点
      expect(输入区行, '找不到 .shuru-rongqi').not.toBeNull()
      const 标签们 = 收集标签(输入区行)
      // 契约演进 ④：旧判定要求序列与 textarea 同为输入区盒内的兄弟；真内联后两者都不存在，
      // 只剩这一份共用实现承载图文。
      expect(标签们.filter((名) => 名 === 'textarea'), 'textarea 复活 = 第二份文字载体').toHaveLength(0)
      expect(
        标签们.filter((名) => 名 === 'DaiFaTuWenKuaiXuLie'),
        '已退役的待发序列组件复活 = 第二份待发实现',
      ).toHaveLength(0)
      expect(标签们.filter((名) => 名 === 'TuWenShuRuQu'), '共用的图文输入区没挂上').toHaveLength(1)
      expect(直系元素(输入区行).flatMap((项) => 元素类名(项))).not.toContain('dai-fa-kuai-lie')
    })
  }

  it('两份输入区实现不得并立：.shuru-kuang 宿主在全库只出现在组件文件里', () => {
    expect(含串的文件(/class="shuru-kuang[\s\x22]/)).toEqual([组件路径])
  })
})

describe('FP-10b ⑤ 相邻契约一字未动（FP-23 图标等高 / FP-04a 滚动口 / FP-09 引用条槽位）', () => {
  it('FP-23：图标盒与字形仍吃同一套 --shuru-tubiao-* 解析值，折叠档与图标盒同值', () => {
    expect(解析几何数值('--shuru-tubiao-chicun')).toBe(解析几何数值('--shuru-danxing-gao-du'))
    expect(解析几何数值('--shuru-tubiao-glyph-chicun')).toBe(22)
    expect(解析几何数值('--shuru-anniu-re-ku')).toBe(44)
  })

  it('FP-04a：折叠态单行高与滚动口机制未因同区改造变化', () => {
    expect(
      解析几何数值('--shuru-kuang-hangxing-gao') +
        解析几何数值('--shuru-kuang-shang-xia-neidian') * 2,
    ).toBeCloseTo(34.4, 10)
    expect(声明了(组件规则们, 编辑器, 'overflow-y')).toBe('auto')
    expect(声明了(组件规则们, 编辑器, 'min-width')).toBe('0')
    expect(声明了(组件规则们, 外壳, 'flex')).toBe('1')
  })

  it('引用条保持它自己的整行槽位（只剩它一行 claim 整行）', () => {
    const 引用规则 = 样式规则('components/聊天/引用条.vue')
    expect(层叠胜出(引用规则, { 标签: 'div', 类: ['yinyong-tiao'] }, 'flex-basis')?.值).toBe('100%')
  })
})

/* ---------------- 共用遍历工具（消费者/文件命中判定的唯一出口） ---------------- */

function 遍历(目录: string): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 完整 = join(目录, 项.name)
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
    .filter((路) => 串.test(去注释(readFileSync(路, 'utf-8'))))
    .map(相对)
    .sort()
}

/** 某枚令牌的真实消费者：注释里的 var() 不算（否则 FP-10c 那批"出处注释"会被当成消费者而假绿） */
function 消费者文件(令牌: string): string[] {
  const 串 = new RegExp(`var\\(\\s*${令牌}\\s*[,)]`)
  return 遍历(源目录)
    .filter((路) => 相对(路) !== 'styles/variables.css')
    .filter((路) => 串.test(去注释(readFileSync(路, 'utf-8'))))
    .map(相对)
    .sort()
}
