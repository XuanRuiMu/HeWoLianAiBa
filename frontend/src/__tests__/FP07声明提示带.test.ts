import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { huoQuFanYi } from '@/config/translations'
import 提示带 from '@/components/提示带.vue'
import { 层叠胜出, 拆分选择器组, 规则清单 } from './CSS级联真源'
import { 声明位置, 解析几何数值 } from './主题令牌真源'
import type { 探针 } from './CSS级联真源'

/**
 * FP-07（需求 #8 / 根因 R5）门禁：AI 声明与错误提示必须在**同一条带**内，
 * 且**两者都能被选中复制**。
 *
 * 判据一律落在「层叠解析值 + DOM 结构」上，不用源码字符串包含冒充行为断言（B10 病灶）。
 * 本仓 vitest 未开 `test.css`，SFC 的 `<style scoped>` 不注入 jsdom，`getComputedStyle`
 * 在单测里取不到组件样式；因此按仓库既有口径改用 `__tests__/CSS级联真源.ts`——
 * 它按「命中 → 特异度 → 文档序」算出层叠胜出的声明值，与书写位置/换行/注释无关。
 */

const 前端根 = resolve(__dirname, '..')
const 组件源 = readFileSync(resolve(前端根, 'components/提示带.vue'), 'utf8')
const 聊天页源 = readFileSync(resolve(前端根, 'views/聊天页面.vue'), 'utf8')

const AI文案 = huoQuFanYi('tongYong', 'aiTiShiTiao')
const 无权限文案 = huoQuFanYi('liaoTian', 'guanLiMianBanWuQuanXian')

function 取样式块(源: string): string {
  return [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((块) => 块[1])
    .join('\n')
}

const 组件规则们 = 规则清单(取样式块(组件源))

function 解析值(目标: 探针, 属性: string): string | null {
  const 结果 = 层叠胜出(组件规则们, 目标, 属性)
  return 结果 ? 结果.值 : null
}

const 带探针: 探针 = { 标签: 'div', 类: ['tishi-dai'] }
const 声明探针: 探针 = { 标签: 'span', 类: ['tishi-dai-shengming'] }
const 提示探针: 探针 = { 标签: 'span', 类: ['tishi-dai-cuowu'] }

/** user-select 的可选族取值；user-select 可继承，槽位自身不声明即继承带体的 text */
const 可选族 = ['text', 'auto', 'contain', 'all']

function 遍历源文件(目录: string): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录)) {
    const 全路径 = resolve(目录, 项)
    if (statSync(全路径).isDirectory()) {
      if (项 === '__tests__') continue
      结果.push(...遍历源文件(全路径))
    } else if (项.endsWith('.vue') || 项.endsWith('.css')) {
      结果.push(全路径)
    }
  }
  return 结果
}

const 源文件们 = 遍历源文件(前端根)
const 相对 = (文件: string): string => 文件.slice(前端根.length + 1).split(sep).join('/')

function 取所属选择器(行们: string[], 下标: number): string {
  for (let i = 下标; i >= 0; i--) {
    const 叉 = 行们[i].lastIndexOf('{')
    if (叉 < 0) continue
    const 段: string[] = []
    for (let j = i - 1; j >= 0; j--) {
      const 上 = 行们[j].trim()
      if (!上 || /[{}*/]$/.test(上)) break
      段.unshift(上)
    }
    return [...段, 行们[i].slice(0, 叉).trim()].join(' ').replace(/\s+/g, ' ').trim()
  }
  throw new Error(`第 ${下标 + 1} 行之上找不到规则头`)
}

interface 禁用点 {
  键: string
  文件: string
  选择器: string
}

function 采集全部禁用点(): 禁用点[] {
  const 结果: 禁用点[] = []
  for (const 文件 of 源文件们) {
    const 行们 = readFileSync(文件, 'utf8').split('\n')
    行们.forEach((行, 下标) => {
      const 匹 = /^\s*(-webkit-)?user-select\s*:\s*none\b/.exec(行)
      if (!匹) return
      const 选择器 = 取所属选择器(行们, 下标)
      const 属性 = 匹[1] ? '-webkit-user-select' : 'user-select'
      结果.push({ 键: `${相对(文件)}|${选择器}|${属性}`, 文件: 相对(文件), 选择器 })
    })
  }
  return 结果
}

/**
 * 入场实测 **19 处** `user-select: none` 的逐条判定账本（FP-07 验收②）；FP-11 引入时间条后为 **21 处**（+2 见下方两条目）。
 *  FP-24c 收口第 1 处误用（`components/全局菜单.vue|.banben-wenben`）⇒ 销账后本账本 18 条、误用余 0 条。
 * 键 = 文件|选择器|属性；**双向相等**：新冒出一个没判定的禁用点⇒红，删掉了却不销账⇒红。
 * 判定只有 `必要`（保留并写理由）与 `误用`（必须清零）两种。
 * 头像相关判定点归 FP-19（它将抽 components/头像.vue），本单只登记不改。
 */
const 判定账本: Array<{ 键: string; 判定: '必要' | '误用'; 理由: string }> = [
  {
    // FP-11（时间条）新增两条：`pointer-events:none` 只禁指针命中测试，不禁「从相邻消息起拖穿越」时把分隔文本卷进选区，
    // 故 user-select 不是它的冗余；两者共同保证时间条是不可选中的页面 chrome（消息文本侧选仍可）。
    键: 'components/聊天/时间条.vue|<style scoped> .shijian-biaoqian|user-select',
    判定: '必要',
    理由: '需求 #10 时间条＝非交互分隔 chrome：与相邻消息拖选互斥（pointer-events:none 只禁命中测试，不禁拖选穿越选区）——FP-11 引入',
  },
  {
    键: 'components/聊天/时间条.vue|<style scoped> .shijian-biaoqian|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀，与主声明同生同灭（FP-11 时间条）',
  },
  {
    键: 'components/头像.vue|<style scoped> .touxiang|user-select',
    判定: '必要',
    理由: '需求 #11：头像（含纯 emoji 头像）一律按图片处理，不得被选中——FP-19a 抽出的全库唯一头像出口',
  },
  {
    键: 'components/头像.vue|<style scoped> .touxiang|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀，与主声明同生同灭（FP-19a 头像出口）',
  },
  {
    键: 'components/头像裁剪.vue|.caijian-tu|user-select',
    判定: '必要',
    理由: '裁剪层是被拖拽的图片本体，禁选防拖动时产生选区残影；属头像类判定点，归 FP-19 复核',
  },
  {
    键: 'components/头像裁剪.vue|.caijian-tu|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀，与主声明同生同灭',
  },
  {
    键: 'components/实时日志.vue|.rizhi-biaoti-lan|user-select',
    判定: '必要',
    理由: '浮窗标题栏即拖拽手柄（cursor:grab + touch-action:none），禁选防拖拽把整行标题选中',
  },
  {
    键: 'components/管理员监控.vue|.jiankong-biaoti-lan|user-select',
    判定: '必要',
    理由: '同上：拖拽手柄，且该文件在 FP-07 禁止触碰清单内',
  },
  {
    键: 'views/聊天页面.vue|.luyin-anzhu-an|user-select',
    判定: '必要',
    理由: '按住说话按钮（touch-action:none），禁选防长按把手柄标签选成选区；FP-11 重写语音条时复核',
  },
  {
    键: 'views/资料设置向导.vue|.xingBie-kaPian|user-select',
    判定: '必要',
    理由: '整卡即按钮的点选控件（cursor:pointer），禁选防连点产生选区；文件归 FP-15',
  },
  {
    键: 'views/资料设置向导.vue|.xingBie-kaPian|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀',
  },
  {
    键: 'views/资料设置向导.vue|.mbti-kaPian|user-select',
    判定: '必要',
    理由: '点选式 MBTI 卡，与性别卡同一判据；文件归 FP-15',
  },
  {
    键: 'views/资料设置向导.vue|.mbti-kaPian|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-liebiao.tuo-zhuai-zhong|user-select',
    判定: '必要',
    理由: '只在拖拽进行中的列表态生效，防拖拽与选区互搏；由 过往战绩.test.ts 钉住',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-liebiao.tuo-zhuai-zhong|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.sortable-ghost|user-select',
    判定: '必要',
    理由: '拖拽预览空位是 pointer-events:none 的装饰占位层，非用户要读的正文',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.sortable-ghost|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.sortable-chosen|user-select',
    判定: '必要',
    理由: '被抓取卡片态（cursor:grabbing），拖拽手势与选区互斥',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.sortable-chosen|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.sortable-drag|user-select',
    判定: '必要',
    理由: '跟随光标的拖拽副本，不是正文',
  },
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.sortable-drag|-webkit-user-select',
    判定: '必要',
    理由: '同上一条的 Safari 前缀',
  },
]

/** FP-07 授权面之外、判为误用而未能清零的点（只准缩短，不准增长）。
 *  FP-24c 已把 `components/全局菜单.vue` 的 `.banben-wenben{user-select:none}` 删除 ⇒ 本登记归零。 */
const 越界误用登记: string[] = []

/** 本单治理的呈现面：这些文件里除已判定的手柄外，不得再有任何禁选点 */
const 治理面文件 = [
  'views/聊天页面.vue',
  'views/好友聊天.vue',
  'views/好友列表.vue',
  'views/挑战主页.vue',
  'components/错误边界.vue',
  'components/断网横幅.vue',
  'components/提示带.vue',
]

describe('FP-07 提示带契约：一条带·两个槽·都可选中文本', () => {
  it('无提示时只渲染左侧 AI 声明，右侧槽不留空节点', () => {
    const wrapper = mount(提示带)
    const 带 = wrapper.find('.tishi-dai')
    expect(带.exists()).toBe(true)
    expect(带.findAll('span')).toHaveLength(1)
    expect(带.find('.tishi-dai-cuowu').exists()).toBe(false)
    const 声明 = 带.find('.tishi-dai-shengming')
    expect(声明.text()).toBe(AI文案)
    expect(声明.attributes('role')).toBe('note')
  })

  it('有提示时同一条带内 AI 声明在左、提示在右，两句都取自翻译文件', () => {
    const wrapper = mount(提示带, { props: { cuoWu: 无权限文案 } })
    const 槽 = wrapper.findAll('.tishi-dai > span')
    expect(槽).toHaveLength(2)
    expect(槽[0].classes()).toContain('tishi-dai-shengming')
    expect(槽[1].classes()).toContain('tishi-dai-cuowu')
    expect(
      槽[0].element.compareDocumentPosition(槽[1].element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(槽[0].text()).toBe(AI文案)
    expect(槽[1].text()).toBe(无权限文案)
    expect(槽[1].attributes('role')).toBe('alert')
  })

  it('整条居中：层叠胜出 justify-content=center，窄屏可换行不溢出', () => {
    expect(解析值(带探针, 'justify-content')).toBe('center')
    expect(解析值(带探针, 'flex-wrap')).toBe('wrap')
  })

  it('带体可选中文本：层叠胜出 user-select=text、pointer-events=auto', () => {
    const 选值 = 解析值(带探针, 'user-select')
    expect(选值).toBe('text')
    if (选值) expect(可选族).toContain(选值)
    expect(解析值(带探针, '-webkit-user-select')).toBe('text')
    expect(解析值(带探针, 'pointer-events')).toBe('auto')
  })

  it('两个槽自身不得声明禁选或屏蔽命中（继承带体的 text）', () => {
    for (const 目标 of [声明探针, 提示探针]) {
      expect(解析值(目标, 'user-select') ?? 'text').not.toBe('none')
      expect(解析值(目标, 'pointer-events') ?? 'auto').not.toBe('none')
    }
  })

  it('组件内零新增色值字面量，三处颜色一律吃既有令牌', () => {
    const 样式 = 取样式块(组件源)
    expect([...样式.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g)]).toEqual([])
    expect(样式).toContain('var(--wenben-ciuse)')
    expect(样式).toContain('var(--beijing-ciuse)')
    expect(样式).toContain('var(--cuowu-yanse)')
  })
})

describe('FP-07 AI 声明单一实现（R5：不得留第二份 DOM/CSS）', () => {
  const 渲染声明的文件 = 源文件们
    .filter((文件) => readFileSync(文件, 'utf8').includes("huoQuFanYi('tongYong', 'aiTiShiTiao')"))
    .map(相对)

  it('全库只有一个文件渲染 AI 声明文案', () => {
    expect(渲染声明的文件).toEqual(['components/提示带.vue'])
  })

  it('聊天页/军师面板/记录详情三处只剩组件引用，无第二份声明', () => {
    const 三处: Array<[string, string]> = [
      ['views/聊天页面.vue', 聊天页源],
      ['components/军师指导.vue', readFileSync(resolve(前端根, 'components/军师指导.vue'), 'utf8')],
      ['views/军师记录详情.vue', readFileSync(resolve(前端根, 'views/军师记录详情.vue'), 'utf8')],
    ]
    for (const [名, 源] of 三处) {
      expect(源, `${名} 不得再自带声明文案`).not.toContain("huoQuFanYi('tongYong', 'aiTiShiTiao')")
      expect(源, `${名} 必须引用提示带组件`).toMatch(/(\/|\.)提示带\.vue'/)
    }
  })

  it('旧声明带的 CSS 规则在全库归零', () => {
    const 旧选择器 = new Set(['.aitishi-tiao', '.ai-tishi'])
    const 残留 = 源文件们
      .filter((文件) =>
        规则清单(取样式块(readFileSync(文件, 'utf8'))).some((规则) =>
          拆分选择器组(规则.选择器).some(
            (串) => 旧选择器.has(串.trim().split(/\s+/).slice(-1)[0]),
          ),
        ),
      )
      .map(相对)
    expect(残留).toEqual([])
  })

  it('聊天页把错误绑进带内右侧槽，且不再留第二条错误行', () => {
    expect(聊天页源).toMatch(
      /<TiShiDai\s+:cuo-wu="fuPanMoShi \? null : 聊天仓库\.cuoWuXinXi"\s*\/>/,
    )
    expect(聊天页源).not.toMatch(/<span class="fasong-cuowu">\{\{\s*聊天仓库\.cuoWuXinXi\s*\}\}/)
  })
})

describe('FP-07 全库 user-select:none 逐条判定（验收②）', () => {
  const 实测 = 采集全部禁用点()

  it('账本每条都有判定与理由，键唯一且理由不空转', () => {
    const 键 = 判定账本.map((项) => 项.键)
    expect(new Set(键).size).toBe(键.length)
    for (const 项 of 判定账本) {
      expect(['必要', '误用'], 项.键).toContain(项.判定)
      expect(项.理由.length, `${项.键} 缺理由`).toBeGreaterThan(11)
    }
  })

  it('实测禁用点与账本双向相等（新增未判定⇒红，删了不销账⇒红）', () => {
    expect(实测.map((项) => 项.键).sort()).toEqual(判定账本.map((项) => 项.键).sort())
  })

  it('误用处在授权面内清零，面外未清零者逐条登记且只准缩短', () => {
    const 误用文件 = [
      ...new Set(判定账本.filter((项) => 项.判定 === '误用').map((项) => 项.键.split('|')[0])),
    ].sort()
    expect(误用文件.filter((项) => 治理面文件.includes(项))).toEqual([])
    expect(误用文件.filter((项) => !治理面文件.includes(项))).toEqual(
      [...new Set(越界误用登记)].sort(),
    )
  })

  it('提示带与其两个槽永不出现在禁用点账本里', () => {
    expect(判定账本.filter((项) => 项.键.includes('tishi-dai'))).toEqual([])
    expect(实测.filter((项) => 项.选择器.includes('tishi-dai'))).toEqual([])
  })

  it('本单治理面上除已判定手柄外零禁选点（错误/状态/正文一律可选）', () => {
    const 命中 = 实测
      .filter((项) => 治理面文件.includes(项.文件))
      .map((项) => 项.键)
      .sort()
    expect(命中).toEqual(['views/聊天页面.vue|.luyin-anzhu-an|user-select'])
  })
})

describe('FP-07 非超管权限提示的呈现口径（验收③）', () => {
  it('无管理员权限提示进右侧槽：与声明同带，解析值允许选中', () => {
    const wrapper = mount(提示带, { props: { cuoWu: 无权限文案 } })
    const 提示 = wrapper.find('.tishi-dai .tishi-dai-cuowu')
    expect(提示.text()).toBe(无权限文案)
    expect(提示.element.parentElement?.classList.contains('tishi-dai')).toBe(true)
    expect(解析值(提示探针, 'user-select') ?? 'text').not.toBe('none')
    expect(解析值(带探针, 'user-select')).toBe('text')
  })

  it('提示文案走翻译键，聊天页与组件源码内均无该句硬编码', () => {
    expect(无权限文案.length).toBeGreaterThan(0)
    expect(聊天页源).toContain("huoQuFanYi('liaoTian', 'guanLiMianBanWuQuanXian')")
    expect(聊天页源).not.toContain('没有打开管理员面板的权限')
    expect(组件源).not.toContain('没有打开管理员面板的权限')
  })
})

/**
 * FP-31 H2（第三波 Standards 轴）：本波新建组件内不得留裸 px 量纲字面量。
 * 旧形态＝`column-gap:10px` / `padding:3px 12px` / `font-size:11px` 三行抄在组件里（FP-07 因禁改
 * variables.css 而留在原地的搬迁值）；新契约＝四枚量纲住共用 `:root` 的 `--tishi-dai-*`，
 * 本组件是唯一真实消费者（**不造零消费者令牌** ⇒ 逐条查 var() 在场），解析值仍等于改前实测像素。
 */
describe('FP-31 H2 提示带量纲收进 variables.css 共用 :root（零裸 px）', () => {
  const 改前实测: Array<[string, number]> = [
    ['--tishi-dai-lie-ju', 10],
    ['--tishi-dai-neidian-shang-xia', 3],
    ['--tishi-dai-neidian-zuo-you', 12],
    ['--tishi-dai-zihao', 11],
  ]

  it('组件样式块内零 px 字面量（回填 10px/3px 12px/11px 任一即红）', () => {
    // 注释里写的是"改前实测值"的出处说明，判定面只看真实声明 ⇒ 先剥注释再扫
    const 声明文本 = 取样式块(组件源).replace(/\/\*[\s\S]*?\*\//g, '')
    const 裸px = [...声明文本.matchAll(/\b\d*\.?\d+px\b/g)].map((匹) => 匹[0])
    expect(裸px, '提示带.vue 又自带 px 量纲字面量 ⇒ 违反「量纲令牌住 variables.css 共用 :root」').toEqual(
      [],
    )
  })

  it('四枚令牌只住在共用 :root 块、解析值等于改前实测，且每一条都有本组件的消费者', () => {
    const 样式 = 取样式块(组件源)
    for (const [令牌, 实测值] of 改前实测) {
      const 位 = 声明位置(令牌)
      expect(位.共用, `${令牌} 未声明在 variables.css 的共用 :root 块`).toBe(true)
      expect([位.浅色, 位.深色], `${令牌} 是量纲令牌，不得进任一主题档`).toEqual([false, false])
      expect(解析几何数值(令牌), `${令牌} 的解析值偏离改前实测`).toBe(实测值)
      expect(样式, `${令牌} 零消费者 ⇒ 本任务点名的病灶形态`).toContain(`var(${令牌})`)
    }
    expect(解析值(带探针, 'column-gap')).toBe('var(--tishi-dai-lie-ju)')
    expect(解析值(带探针, 'font-size')).toBe('var(--tishi-dai-zihao)')
    expect(解析值(带探针, 'padding')).toBe(
      'var(--tishi-dai-neidian-shang-xia) var(--tishi-dai-neidian-zuo-you)',
    )
  })

  it('--tishi-dai-* 族的声明面与消费面成对：声明只在 variables.css，消费只在提示带.vue', () => {
    const 声明文件 = 源文件们.filter((文件) =>
      /--tishi-dai-(?:lie-ju|neidian-shang-xia|neidian-zuo-you|zihao)\s*:/.test(
        readFileSync(文件, 'utf8'),
      ),
    ).map(相对)
    const 消费文件 = 源文件们
      .filter((文件) => /var\(\s*--tishi-dai-/.test(readFileSync(文件, 'utf8')))
      .map(相对)
    expect(声明文件).toEqual(['styles/variables.css'])
    expect(消费文件).toEqual(['components/提示带.vue'])
  })
})
