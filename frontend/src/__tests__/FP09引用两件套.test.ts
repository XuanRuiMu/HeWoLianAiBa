import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { huoQuFanYi } from '@/config/translations'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI, YIN_YONG_DING_WEI_PEI_ZHI } from '@/config/消息配置'
import { 按档解析全部, 声明块清单, 声明位置, 解析几何数值 } from './主题令牌真源'
import { 层叠胜出, 规则清单, 令牌名, type 探针 } from './CSS级联真源'
import YinYongTiao from '@/components/聊天/引用条.vue'
import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'
import type { CaiDanXiaoXi } from '@/composables/use长按菜单'

/**
 * FP-09（需求 #5 表现层）引用两件套。数据层 FP-08a/08b/08c 已落地，本文件只管"接成看得见的东西"。
 *
 * 判定口径：一律走**层叠结果 + var() 解析像素值**（__tests__/CSS级联真源.ts 与
 * __tests__/主题令牌真源.ts::解析几何数值），不用"源码里含某串"冒充断言 —— 那正是 B10 病灶。
 * 数值出处逐条对应 .agents/evidence/references/FP-13-引用条-20260921.md：
 *  §1.1 引用条本体（padding12/圆角8/字号12/行高16）+ 关闭钮（图标 11×11 + padding5）
 *  §1.2 气泡内引用块（padding12/圆角8/字号12/行高16.8/max-width272/margin-top4/两行截断/撤回占位分支）
 *  §1.3 点击定位算法（仅向上滚 + ±1px 交替抖动 + 1s 一轮固定 3 轮 + 高亮吃令牌不吃 #ff9c19 字面量）
 *  §3 左侧色条 3px + 9px 间距（合计 12px，与 §1.2 的 padding 同值不同源）
 *  §2 自己那条色条换主色
 */

const 源目录 = resolve(__dirname, '..')
const 条组件路径 = 'components/聊天/引用条.vue'
const 块组件路径 = 'components/聊天/引用气泡块.vue'
const 读 = (相对: string) => readFileSync(resolve(源目录, 相对), 'utf-8')

/** 只取 <style> 段内容并剥掉注释：模板与脚本里的花括号会污染规则切分，注释里的 px 字样会污染字面量判定 */
function 样式段(源: string): string {
  const 段 = [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  if (段.length === 0) throw new Error('组件里没有 <style> 段')
  return 段.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
}

const 条规则 = 规则清单(样式段(读(条组件路径)))
const 块规则 = 规则清单(样式段(读(块组件路径)))

function 探针值(
  规则们: ReturnType<typeof 规则清单>,
  探针项: 探针,
  属性: string,
): { 令牌: string; 数值: number } {
  const 胜出 = 层叠胜出(规则们, 探针项, 属性)
  if (!胜出) throw new Error(`探针 ${JSON.stringify(探针项)} 上没有任何规则声明 ${属性}`)
  const 令牌 = 令牌名(胜出.值, 属性)
  return { 令牌, 数值: 解析几何数值(令牌) }
}

/** 伪元素规则（CSS级联真源不支持伪元素探针）：按选择器取唯一命中规则并要求它只吃令牌。
 *  数值只在传了 属性 为量纲类时才解析（色令牌解析不出算式，只能核令牌名） */
function 伪元素令牌(
  规则们: ReturnType<typeof 规则清单>,
  选择器: string,
  属性: string,
): string {
  const 命中 = 规则们.filter((项) => 项.选择器 === 选择器)
  expect(命中.length, `${选择器} 必须恰好一条规则`).toBe(1)
  const 值 = 命中[0].声明.get(属性)
  if (!值) throw new Error(`${选择器} 未声明 ${属性}`)
  return 令牌名(值, 属性)
}

function 伪元素声明(
  规则们: ReturnType<typeof 规则清单>,
  选择器: string,
  属性: string,
): { 令牌: string; 数值: number } {
  const 令牌 = 伪元素令牌(规则们, 选择器, 属性)
  return { 令牌, 数值: 解析几何数值(令牌) }
}

function 造消息(过: Partial<CaiDanXiaoXi> & { id: string }): CaiDanXiaoXi {
  return { nei_rong: '原文', lei_xing: 'wenben', shi_jian_chuo: 1700000000000, ...过 }
}

const 引用条探针: 探针 = { 标签: 'div', 类: ['yinyong-tiao'] }
const 条摘要探针: 探针 = { 标签: 'span', 类: ['yinyong-tiao-zhaiyao'] }
const 条关闭探针: 探针 = { 标签: 'button', 类: ['yinyong-tiao-guanbi'] }
const 块探针: 探针 = { 标签: 'button', 类: ['yinyong-kuai'] }
const 块摘要探针: 探针 = { 标签: 'span', 类: ['yinyong-kuai-zhaiyao'] }

function 挂引用气泡块(
  列表: CaiDanXiaoXi[],
  选项: {
    beiYongXiaoXiId?: string | null
    容器?: HTMLElement | null
    名称?: (muBiao: CaiDanXiaoXi) => string
  } = {},
) {
  return mount(YinYongQiPaoKuai, {
    props: {
      beiYongXiaoXiId: 选项.beiYongXiaoXiId === undefined ? 'm1' : 选项.beiYongXiaoXiId,
      lieBiao: 列表,
      gunDongRongQi: () => 选项.容器 ?? null,
      ...(选项.名称 ? { faSongZheMing: 选项.名称 } : {}),
    },
    attachTo: document.body,
  })
}

function 造容器(自身Top: number, 初始滚动 = 500): HTMLElement {
  const 容器 = document.createElement('div')
  容器.getBoundingClientRect = () => ({ top: 自身Top } as DOMRect)
  Object.defineProperty(容器, 'scrollTop', { value: 初始滚动, writable: true })
  return 容器
}

function 造目标(id: string, 自身Top: number): HTMLElement {
  const 目标 = document.createElement('div')
  目标.id = id
  目标.getBoundingClientRect = () => ({ top: 自身Top } as DOMRect)
  document.body.appendChild(目标)
  临时节点.push(目标)
  return 目标
}

/** 手工 append 到 body 的定位锚必须逐例清干净：getElementById 只回文档序第一个，残留会串用例 */
const 临时节点: HTMLElement[] = []
afterEach(() => {
  临时节点.forEach((项) => 项.remove())
  临时节点.length = 0
})

describe('FP-09 结构：引用两件套各只有一份实现，页面只做接线', () => {
  function 遍历(目录: string): string[] {
    const 结果: string[] = []
    for (const 项 of readdirSync(目录, { withFileTypes: true })) {
      if (项.name === 'node_modules' || 项.name === 'dist') continue
      const 完整 = join(目录, 项.name)
      if (项.isDirectory()) 结果.push(...遍历(完整))
      else if (/\.(ts|vue|css)$/.test(项.name)) 结果.push(完整)
    }
    return 结果
  }

  it('yinyong-tiao* / yinyong-kuai* 类名只存在于两个组件文件内', () => {
    const 白名单 = new Set([条组件路径, 块组件路径])
    const 命中 = new Set<string>()
    for (const 路 of 遍历(源目录)) {
      const 相对 = 路.replace(/\\/g, '/').split('/src/')[1]
      if (白名单.has(相对)) continue
      if (/__tests__/.test(相对)) continue
      // 只认「类」的用法（选择器 .yinyong-* 与模板 class="yinyong-*"）：
      // variables.css 里的 --yinyong-* 是令牌声明，不是第二份形态
      const 源 = 读(相对)
      if (/\.yinyong-(?:tiao|kuai)\b/.test(源) || /class="[^"]*\byinyong-(?:tiao|kuai)/.test(源))
        命中.add(相对)
    }
    expect([...命中], '页面内出现第二份引用形态').toEqual([])
  })

  it('旧形态 .yinyong-yulan/.yinyong-quxiao 全库归零（作废即作废，不留悬空 CSS）', () => {
    const 命中: string[] = []
    for (const 路 of 遍历(源目录)) {
      const 相对 = 路.replace(/\\/g, '/').split('/src/')[1]
      if (/__tests__/.test(相对)) continue
      if (/yinyong-(yulan|biaoqian|zhaiyao|quxiao)/.test(readFileSync(路, 'utf-8')))
        命中.push(相对)
    }
    expect(命中).toEqual([])
  })

  it('聊天页面.vue 接两个组件并给出定位锚与滚动容器；好友页留给 FP-21，不伪造数据', () => {
    const 页面 = 读('views/聊天页面.vue')
    expect(页面).toContain("import YinYongTiao from '@/components/聊天/引用条.vue'")
    expect(页面).toContain("import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'")
    expect(页面).toMatch(/<YinYongTiao\b[\s\S]*?@guan-bi="quXiaoYinYong"/)
    expect(页面).toMatch(/<YinYongQiPaoKuai\b[\s\S]*?:lie-biao="聊天仓库\.xiaoXiLieBiao"/)
    // 定位锚的 id 前缀与组件同源（同一枚配置，两页不许各写一份）
    expect(页面).toContain('YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui')
    const 好友页 = 读('views/好友聊天.vue')
    expect(好友页, '好友页已接引用两件套（FP-21 前端接线）').toMatch(
      /YinYongTiao|YinYongQiPaoKuai|bei_yong_xiao_xi_id/,
    )
    expect(好友页).toContain("import YinYongTiao from '@/components/聊天/引用条.vue'")
    expect(好友页).toContain("import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'")
    expect(好友页).toMatch(/<YinYongTiao\b[\s\S]*?@guan-bi="quXiaoYinYong"/)
    expect(好友页).toContain('YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui')
  })

  it('两个组件的 style 段内零颜色字面量、零裸像素（一切数值经令牌）', () => {
    for (const 相对 of [条组件路径, 块组件路径]) {
      const css = 样式段(读(相对))
      expect(css, `${相对} 出现颜色字面量`).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/)
      expect(css, `${相对} 出现裸像素字面量`).not.toMatch(/:\s*[^;]*?\d+(px|r?em)\b/)
    }
  })
})

describe('FP-09 取值：引用条按取证 §1.1 与"两行"口径（层叠结果 + 解析值）', () => {
  it('条本体 padding/圆角/字号/行高 = 12/8/12/16', () => {
    expect(探针值(条规则, 引用条探针, 'padding').数值).toBe(12)
    expect(探针值(条规则, 引用条探针, 'border-radius').数值).toBe(8)
    expect(探针值(条规则, 引用条探针, 'font-size').数值).toBe(12)
    expect(探针值(条规则, 引用条探针, 'line-height').数值).toBe(16)
  })

  it('摘要两行截断：clamp 次数 2 且 max-height = 行高 × 次数', () => {
    expect(探针值(条规则, 条摘要探针, '-webkit-line-clamp').数值).toBe(2)
    const 行高 = 探针值(条规则, 条摘要探针, 'max-height').数值
    expect(行高).toBe(
      解析几何数值('--yinyong-tiao-hangao') * 解析几何数值('--yinyong-hang-shu'),
    )
    expect(行高).toBe(32)
    expect(层叠胜出(条规则, 条摘要探针, 'min-width')?.值).toBe('0')
    expect(层叠胜出(条规则, 条摘要探针, 'overflow')?.值).toBe('hidden')
  })

  it('关闭钮：图标 11×11 两轴同源、内边距 5、热区由 ::before 以 44 外扩', () => {
    const 图标 = 探针值(条规则, { 标签: 'svg', 类: ['yinyong-tiao-guanbi-tu'] }, 'width')
    expect(图标.数值).toBe(11)
    expect(
      探针值(条规则, { 标签: 'svg', 类: ['yinyong-tiao-guanbi-tu'] }, 'height').数值,
    ).toBe(图标.数值)
    expect(探针值(条规则, 条关闭探针, 'padding').数值).toBe(5)
    const 热区 = 伪元素声明(条规则, '.yinyong-tiao-guanbi::before', 'width')
    expect(热区.数值).toBe(44)
    expect(热区.令牌, '热区必须与输入区图标同源').toBe('--shuru-anniu-re-ku')
  })
})

describe('FP-09 取值：气泡内引用块按取证 §1.2/§3/§2', () => {
  it('块几何 padding/圆角/字号/行高/max-width/margin-top = 12/8/12/16.8/272/4', () => {
    expect(探针值(块规则, 块探针, 'border-radius').数值).toBe(8)
    expect(探针值(块规则, 块探针, 'font-size').数值).toBe(12)
    expect(探针值(块规则, 块探针, 'line-height').数值).toBe(16.8)
    expect(探针值(块规则, 块探针, 'max-width').数值).toBe(272)
    expect(探针值(块规则, 块探针, 'margin-top').数值).toBe(4)
    expect(探针值(块规则, 块探针, 'padding').数值).toBe(12)
  })

  it('左色条 3px，文字左偏移 = 色条 + 9px 间距 = 12px（§3）', () => {
    expect(伪元素声明(块规则, '.yinyong-kuai::before', 'width').数值).toBe(3)
    expect(探针值(块规则, 块探针, 'padding-left').数值).toBe(12)
  })

  it('两行截断与 §1.2 的 max-height≈2×16.8 同式', () => {
    expect(探针值(块规则, 块摘要探针, '-webkit-line-clamp').数值).toBe(2)
    expect(探针值(块规则, 块摘要探针, 'max-height').数值).toBeCloseTo(33.6, 3)
  })

  it('自己那条色条换主色（§2 own-message 规则），且两档都有值', () => {
    expect(伪元素令牌(块规则, '.yinyong-kuai--benren::before', 'background-color')).toBe('--zhuse')
    expect(伪元素令牌(块规则, '.yinyong-kuai::before', 'background-color')).toBe(
      '--biankuang-yanse',
    )
    const 浅 = 按档解析全部('light')
    const 深 = 按档解析全部('dark')
    for (const 名 of ['--zhuse', '--biankuang-yanse']) {
      expect(浅.get(名), `${名} 浅色档缺值`).toBeTruthy()
      expect(深.get(名), `${名} 深色档缺值`).toBeTruthy()
    }
  })
})

describe('FP-09 令牌基座：新令牌成对、单一声明、且真有消费者', () => {
  const 新令牌 = [
    '--yinyong-kuang-yuanjiao',
    '--yinyong-kuang-neidian',
    '--yinyong-kuang-zihao',
    '--yinyong-tiao-hangao',
    '--yinyong-kuai-hangao',
    '--yinyong-hang-shu',
    '--yinyong-tiao-zuida-gao-du',
    '--yinyong-kuai-zuida-gao-du',
    '--yinyong-kuai-zuo-neidian',
    '--yinyong-kuai-zuida-kuan',
    '--yinyong-kuai-shang-jian-ju',
    '--yinyong-se-tiao-kuan-du',
    '--yinyong-se-tiao-ju-li',
    '--yinyong-guanbi-chicun',
    '--yinyong-guanbi-neidian',
  ]
  const 块们 = 声明块清单()
  const 浅 = 按档解析全部('light', 块们)
  const 深 = 按档解析全部('dark', 块们)

  it('全部住在共用 :root 块，深浅两档解析逐值相等（不放单侧块，另一档必塌陷）', () => {
    for (const 名 of 新令牌) {
      expect(声明位置(名, 块们), `${名} 只能声明在共用 :root 块一次`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
      expect(深.get(名), `${名} 深色档塌陷`).toBe(浅.get(名))
    }
  })

  it('无新造字面量色值：颜色令牌全部是既有成对令牌', () => {
    for (const 名 of ['--beijing-qianse', '--wen-zi-ci-se', '--wenben-ciuse', '--biankuang-yanse', '--zhuse', '--jing-gao-se']) {
      expect(浅.has(名) && 深.has(名), `${名} 必须深浅两档均有值`).toBe(true)
    }
    expect(浅.get('--beijing-qianse'), '取证 §1.1 引用条底色 #fafafa').toBe('#fafafa')
    expect(浅.get('--wen-zi-ci-se'), '取证 §1.2 引用块正文色 #666').toBe('#666666')
  })

  it('blink 高亮色吃令牌：配置指名的令牌在两档均有值，且不是 #ff9c19 字面量', () => {
    const 名 = YIN_YONG_DING_WEI_PEI_ZHI.liangGuangLingPai
    expect(名.startsWith('--'), '只准登记令牌名').toBe(true)
    expect(浅.get(名), `${名} 浅色档缺值`).toBeTruthy()
    expect(深.get(名), `${名} 深色档缺值`).toBeTruthy()
    const 源码 = 读(块组件路径)
    expect(源码, '禁止粘取证里的橙色字面量').not.toMatch(/#ff9c19/i)
  })

  it('新令牌逐个有真实消费者（FP-01 零消费者令牌病理不得复发）', () => {
    const 消费面 = [条组件路径, 块组件路径, 'styles/variables.css']
      .map(读)
      .join('\n')
    for (const 名 of 新令牌) {
      const 次数 = [...消费面.matchAll(new RegExp(`var\\(\\s*${名.replace(/-/g, '\\-')}\\s*[,)]`, 'g'))].length
      expect(次数, `${名} 消费者为 0`).toBeGreaterThan(0)
    }
  })
})

describe('FP-09 引用条呈现与键盘可达', () => {
  it('摘要与发送者前缀照取证 §1.1 的 "nick: text" 形态渲染，无名字时不渲染前缀', () => {
    const 带名 = mount(YinYongTiao, { props: { zhaiYao: '今天忙吗', faSongZheMing: '小美' } })
    expect(带名.find('.yinyong-tiao').exists()).toBe(true)
    expect(带名.find('.yinyong-tiao-zhaiyao').text()).toBe('小美: 今天忙吗')
    带名.unmount()
    const 无名 = mount(YinYongTiao, { props: { zhaiYao: '只有摘要' } })
    expect(无名.find('.yinyong-tiao-zhaiyao').text()).toBe('只有摘要')
    无名.unmount()
  })

  it('关闭钮是真 button：type=button、未禁用、未被摘掉 tabindex，点击上抛 guanBi', async () => {
    const 条 = mount(YinYongTiao, { props: { zhaiYao: 'x' } })
    const 钮 = 条.find('button.yinyong-tiao-guanbi')
    expect(钮.exists()).toBe(true)
    expect(钮.attributes('type')).toBe('button')
    expect(钮.attributes('disabled')).toBeUndefined()
    expect(钮.attributes('tabindex'), '不得把关闭钮移出 Tab 序列').not.toBe('-1')
    expect(钮.attributes('aria-label')).toBe(huoQuFanYi('liaoTian', 'quXiaoYinYong'))
    await 钮.trigger('click')
    expect(条.emitted('guanBi')).toHaveLength(1)
  })

  it('UI 内零署名/授权文案（用户明令）', () => {
    const 条 = mount(YinYongTiao, { props: { zhaiYao: '摘要内容', faSongZheMing: '小美' } })
    expect(条.text()).not.toMatch(/授权|参考|致谢|TUIKit|spreed|ChatUI|matrix/i)
    条.unmount()
  })
})

describe('FP-09 气泡内引用块呈现与定位', () => {
  const 撤回占位 = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')

  it('正常态：左侧色条 + 发送者 + 摘要，块内文本走唯一摘要出口（含 30 字上限）', () => {
    const 长文 = '啊'.repeat(40)
    const 包 = 挂引用气泡块(
      [造消息({ id: 'm1', nei_rong: 长文, fa_song_zhe_lei_xing: 'jiaose' })],
      { 名称: () => '小美' },
    )
    expect(包.find('.yinyong-kuai').exists()).toBe(true)
    expect(包.find('.yinyong-kuai').classes()).not.toContain('yinyong-kuai--benren')
    expect(包.find('.yinyong-kuai-zhaiyao').text()).toBe(
      `小美: ${'啊'.repeat(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu)}...`,
    )
    包.unmount()
  })

  it('被引用的是自己发的 ⇒ 加 --benren 修饰（色条换主色的判据）', () => {
    const 包 = 挂引用气泡块([造消息({ id: 'm1', fa_song_zhe_lei_xing: 'yonghu' })])
    expect(包.find('.yinyong-kuai').classes()).toContain('yinyong-kuai--benren')
    包.unmount()
  })

  it('语音目标 ⇒ 走既有语音占位，不空白', () => {
    const 包 = 挂引用气泡块([造消息({ id: 'm1', lei_xing: 'yuYin', nei_rong: '' })])
    expect(包.find('.yinyong-kuai-zhaiyao').text()).toBe(
      huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei'),
    )
    包.unmount()
  })

  it('已撤回 / 已不在列表 ⇒ 既有撤回占位文案 + aria-disabled，不空白不抛错', () => {
    const 撤回 = 挂引用气泡块([造消息({ id: 'm1', yi_che_hui: true })])
    expect(撤回.find('.yinyong-kuai-chehui').text()).toBe(撤回占位)
    expect(撤回.find('.yinyong-kuai').attributes('aria-disabled')).toBe('true')
    expect(() => 撤回.find('.yinyong-kuai').trigger('click')).not.toThrow()
    撤回.unmount()

    const 丢失 = 挂引用气泡块([])
    expect(丢失.find('.yinyong-kuai-chehui').text()).toBe(撤回占位)
    expect(丢失.find('.yinyong-kuai-zhaiyao').exists()).toBe(false)
    丢失.unmount()

    const 无槽 = 挂引用气泡块([造消息({ id: 'm1' })], { beiYongXiaoXiId: null })
    expect(无槽.find('.yinyong-kuai-chehui').text()).toBe(撤回占位)
    无槽.unmount()
  })

  it('点击定位：仅向上滚， scrollTop = 目标 top + 现滚动 − 容器 top（§1.3 第4/5步）', async () => {
    const 容器 = 造容器(100, 500)
    造目标(`${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}m1`, 20)
    const 包 = 挂引用气泡块([造消息({ id: 'm1' })], { 容器 })
    await 包.find('.yinyong-kuai').trigger('click')
    expect(容器.scrollTop).toBe(20 + 500 - 100)
    包.unmount()
  })

  it('目标在视口下方 ⇒ 一律不滚（"仅向上滚"口径），高亮照发', async () => {
    const 容器 = 造容器(100, 500)
    造目标(`${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}m1`, 900)
    const 包 = 挂引用气泡块([造消息({ id: 'm1' })], { 容器 })
    await 包.find('.yinyong-kuai').trigger('click')
    expect(容器.scrollTop).toBe(500)
    包.unmount()
  })

  it('第二次点击同一目标 ⇒ 落点差 1px 抖动，否则浏览器不派发 scroll（§1.3 第4步）', async () => {
    const 容器 = 造容器(100, 500)
    造目标(`${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}m1`, 20)
    const 包 = 挂引用气泡块([造消息({ id: 'm1' })], { 容器 })
    const 钮 = 包.find('.yinyong-kuai')
    await 钮.trigger('click')
    const 第一次 = 容器.scrollTop
    // 把"现场"复位成同一状态再点一次：输入完全相同，唯一变量就是奇偶抖动
    容器.scrollTop = 500
    await 钮.trigger('click')
    const 第二次 = 容器.scrollTop
    expect(第一次).toBe(20 + 500 - 100)
    expect(第一次 - 第二次).toBe(YIN_YONG_DING_WEI_PEI_ZHI.douDongXianShi)
    容器.scrollTop = 500
    await 钮.trigger('click')
    expect(容器.scrollTop).toBe(第一次)
    包.unmount()
  })

  it('高亮吃令牌：色取自配置指名的令牌，1s 一轮固定 3 轮、0 0 10px 0 光晕', async () => {
    document.documentElement.style.setProperty(
      YIN_YONG_DING_WEI_PEI_ZHI.liangGuangLingPai,
      'rgb(1, 2, 3)',
    )
    const 调用: unknown[][] = []
    const 原型 = HTMLElement.prototype as HTMLElement & {
      animate?: (...args: unknown[]) => unknown
    }
    const 原Animate = 原型.animate
    原型.animate = function (this: HTMLElement, ...args: unknown[]) {
      调用.push(args)
      return { cancel: () => undefined }
    }
    const 容器 = 造容器(100, 500)
    造目标(`${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}m1`, 20)
    const 包 = 挂引用气泡块([造消息({ id: 'm1' })], { 容器 })
    await 包.find('.yinyong-kuai').trigger('click')
    expect(调用).toHaveLength(1)
    const [关键帧, 参数] = 调用[0] as [Record<string, unknown>[], Record<string, unknown>]
    expect(关键帧[0].boxShadow).toBe(`0 0 ${YIN_YONG_DING_WEI_PEI_ZHI.guangYunMoHu}px 0 rgb(1, 2, 3)`)
    expect(关键帧[0].offset).toBe(0.5)
    expect(参数.iterations).toBe(YIN_YONG_DING_WEI_PEI_ZHI.liangGuangCiShu)
    expect(参数.duration).toBe(YIN_YONG_DING_WEI_PEI_ZHI.liangGuangHaoMiao)
    expect(参数.easing).toBe('linear')
    原型.animate = 原Animate
    document.documentElement.style.removeProperty(YIN_YONG_DING_WEI_PEI_ZHI.liangGuangLingPai)
    包.unmount()
  })

  it('目标 DOM 不在（虚拟窗口外）⇒ 不动滚动也不抛错', async () => {
    const 容器 = 造容器(100, 500)
    const 包 = 挂引用气泡块([造消息({ id: 'm1' })], { 容器 })
    expect(() => 包.find('.yinyong-kuai').trigger('click')).not.toThrow()
    expect(容器.scrollTop).toBe(500)
    包.unmount()
  })
})
