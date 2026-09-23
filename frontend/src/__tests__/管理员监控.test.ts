import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { huoQuFanYi } from '@/config/translations'
import type { 角色, Yonghu } from '@/types'
import type { GuanLiJiaoSe } from '@/utils/角色能力'
import GuanLiJianKong from '@/components/管理员监控.vue'
import { 缩放方向清单 } from '@/composables/use可拖动浮窗'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuYongHuXinXi } from '@/api/认证'

// FP-08：身份链路的唯一外部边界是 /api/认证/信息，其余（stores/用户、utils/角色能力）一律用真实现
vi.mock('@/api/认证', async (原模块) => ({
  ...(await 原模块<typeof import('@/api/认证')>()),
  huoQuYongHuXinXi: vi.fn(async (): Promise<Yonghu> => 服务端出参({ jiao_se: null, neng_li: [] })),
}))

/** 后端 services/认证.ts::yingSheYongHu 的出参形态；其字段正确性由后端 FP08 用例把守 */
function 服务端出参(身份: Record<string, unknown>): Yonghu {
  return { id: 'u1', shou_ji_hao: '138****8000', ...身份 } as unknown as Yonghu
}

const 组件源码 = readFileSync(resolve(process.cwd(), 'src/components/管理员监控.vue'), 'utf-8')
const 浮窗源码 = readFileSync(resolve(process.cwd(), 'src/composables/use可拖动浮窗.ts'), 'utf-8')
const 日志源码 = readFileSync(resolve(process.cwd(), 'src/components/实时日志.vue'), 'utf-8')
const 令牌源码 = readFileSync(resolve(process.cwd(), 'src/styles/variables.css'), 'utf-8')
const 聊天页源码 = readFileSync(resolve(process.cwd(), 'src/views/聊天页面.vue'), 'utf-8')
const 全局样式源码 = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf-8')

// jsdom 视口 1024x768：默认高 = round(768*0.55)，右/下停靠边距 24
const 默认高 = 422
const 默认宽 = 420
const 标题栏高 = 56
const 边距 = 24

// 层级令牌口径覆盖的浮层文件（FP-12 收敛范围）：只允许引用 variables.css 档位令牌
const 浮层文件清单 = [
  'src/components/管理员监控.vue',
  'src/components/实时日志.vue',
  'src/components/军师指导.vue',
  'src/components/协议模态框.vue',
  'src/components/多媒体授权弹窗.vue',
  'src/components/断网横幅.vue',
  'src/components/通话界面.vue',
]

function 读源码(路径: string): string {
  return readFileSync(resolve(process.cwd(), 路径), 'utf-8')
}

function 指针(类型: string, x?: number, y?: number): MouseEvent {
  return new MouseEvent(类型, { clientX: x, clientY: y, bubbles: true, cancelable: true })
}

function 视觉视口(宽: number, 高: number) {
  const 监听 = new Map<string, Set<() => void>>()
  const 假 = {
    width: 宽,
    height: 高,
    addEventListener(类型: string, cb: EventListenerOrEventListenerObject) {
      if (!监听.has(类型)) 监听.set(类型, new Set())
      监听.get(类型)!.add(cb as () => void)
    },
    removeEventListener(类型: string, cb: EventListenerOrEventListenerObject) {
      监听.get(类型)?.delete(cb as () => void)
    },
    派发(类型: string) {
      监听.get(类型)?.forEach((cb) => cb())
    },
  }
  Object.defineProperty(window, 'visualViewport', { value: 假, configurable: true })
  return 假
}

function 档位(名: string): number {
  const 匹配 = 令牌源码.match(new RegExp(`--${名}:\\s*(\\d+)`))
  expect(匹配, `variables.css 缺少层级令牌 --${名}`).not.toBeNull()
  return Number(匹配?.[1])
}

// variables.css 的三段式：:root / :root[data-theme="light"] / :root,:root[data-theme="dark"]
function 令牌段清单() {
  return [...令牌源码.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((匹配) => ({
    选择器: 匹配[1].trim(),
    声明: 匹配[2],
  }))
}

function 主题已定义(令牌名: string, 主题: 'light' | 'dark'): boolean {
  return 令牌段清单().some((段) => {
    const 适用 = 段.选择器
      .split(',')
      .some((部) => 部.trim() === ':root' || 部.trim() === `:root[data-theme="${主题}"]`)
    return 适用 && new RegExp(`--${令牌名}\\s*:`).test(段.声明)
  })
}

function 组件用令牌(源码: string): string[] {
  const 名字 = new Set<string>()
  for (const 匹配 of 源码.matchAll(/var\(--([a-z0-9-]+)[),]/g)) {
    if (匹配[1].startsWith('fu-chuang-')) continue
    if (匹配[1].startsWith('jiankong-')) continue
    名字.add(匹配[1])
  }
  return [...名字]
}

function 人设(性别写法: unknown) {
  return {
    id: 'j1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    xing_bie: 性别写法,
    nian_ling: 22,
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    tou_xiang: '',
    bei_jing_tu: null,
    biao_qian: [],
    re_du: 0,
    chuang_jian_shi_jian: '2026-01-01T00:00:00.000Z',
  } as unknown as 角色
}

describe('管理员监控 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true })
  })

  it('浮窗根元素为可拖动浮窗且不再有全屏遮罩', () => {
    const wrapper = mount(GuanLiJianKong)
    // 旧的全屏遮罩类已移除
    expect(wrapper.find('.guanli-jiankong-zhezhao').exists()).toBe(false)
    // 浮窗根元素存在
    expect(wrapper.find('.guanli-jiankong-fuchuang').exists()).toBe(true)
    // 不再是模态：无 aria-modal
    const gen = wrapper.find('.guanli-jiankong-fuchuang')
    expect(gen.attributes('aria-modal')).toBeUndefined()
    expect(gen.attributes('role')).toBe('dialog')
  })

  it('浮窗根元素使用固定定位且尺寸由公共 composable 以 px 下发', () => {
    expect(组件源码).not.toContain('inset: 0')
    expect(组件源码).not.toContain('backdrop-filter')
    expect(组件源码).not.toContain('guanli-jiankong-zhezhao')
    expect(组件源码).not.toContain('aria-modal')
    expect(组件源码).toContain('position: fixed')
    // 尺寸/位移/停靠边距一律由公共 composable 单向下发，组件不再自带第二套
    expect(组件源码).toContain('use可拖动浮窗')
    expect(组件源码).not.toContain('vh')
    expect(组件源码).not.toMatch(/height:\s*auto/)
    expect(组件源码).not.toMatch(/width:\s*auto/)
    // 契约演进（FP-06 需求 #7 根因）：宿主一旦用 right/bottom 钉盒，盒子右下角被钉死，
    // 宽度增只能向左扩、高度增只能向上扩 ⇒ 缩放方向必然反向。锚定边归 composable 自持。
    expect(组件源码).not.toMatch(/^\s*(right|bottom):\s*var\(--fu-chuang-ting-kao-bian-jv\)/m)
    expect(组件源码).toMatch(/will-change:\s*left,\s*top/)
    // 层级收敛到 variables.css 档位令牌，组件内不得再出现 z-index 数字
    expect(组件源码).toMatch(/--jiankong-z-index:\s*var\(--ceng-tiaoshi-mianban\)/)
    expect(组件源码).not.toMatch(/z-index:\s*-?\d/)
    // 主题全部走令牌，不再硬编码深色
    expect(组件源码).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('标题栏为拖动句柄且按钮点击不触发拖动', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-biaoti-lan').exists()).toBe(true)
    expect(组件源码).toContain('@pointerdown="开始拖动"')
    // 拖动机制：阈值式指针拖动 + setPointerCapture + pointercancel（实现下沉到公共 composable）
    expect(浮窗源码).toContain('setPointerCapture')
    expect(浮窗源码).toContain('pointermove')
    expect(浮窗源码).toContain('pointercancel')
    // 标题栏内按钮排除在拖动之外，最小化/排序/关闭独立存在
    expect(wrapper.find('.jiankong-zuiXiao').exists()).toBe(true)
    expect(wrapper.find('.jiankong-paixu').exists()).toBe(true)
    expect(wrapper.find('.jiankong-guanbi').exists()).toBe(true)
  })

  it('渲染标题与两个分区标题（人设/轮次），历史事件分区已删除', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-biaoti').text()).toContain(
      huoQuFanYi('guanLiJianKong', 'biaoTi'),
    )
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'jiaoSeRenShe'))
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'lunCiBiaoTi'))
    expect(wrapper.find('.jiankong-lishi').exists()).toBe(false)
    expect(wrapper.find('.rizhi-liebiao').exists()).toBe(false)
  })

  it('源码已删除历史事件分区/历史事件列表计算/weiFenZuBiaoTi引用', () => {
    expect(组件源码).not.toContain('weiFenZuBiaoTi')
    expect(组件源码).not.toContain('历史事件列表')
    expect(组件源码).not.toContain('jiankong-lishi')
    expect(组件源码).not.toContain('rizhi-')
    expect(组件源码).not.toContain('biaoQianGouJian')
    expect(组件源码).not.toContain('biaoQianHaoGanDu')
    expect(组件源码).not.toContain('biaoQianYinCang')
  })

  it('两个分区在空数据时均显示空态', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.findAll('.fenqu-kong').length).toBe(2)
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'zanWuLunCi'))
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-guanbi').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('最小化只裁高度：正文 DOM 保留、高度落到标题栏 px、再展开还原', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 根 = wrapper.find('.guanli-jiankong-fuchuang')
    expect(根.attributes('style') || '').toContain(`height: ${默认高}px`)
    expect(wrapper.find('.jiankong-wangge').exists()).toBe(true)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(根.classes()).toContain('zui-xiao-hua')
    // 正文不再被 v-if 卸载，这是滚动位置能保住的前提
    expect(wrapper.find('.jiankong-wangge').exists()).toBe(true)
    const 最小样式 = 根.attributes('style') || ''
    expect(最小样式).toContain(`height: ${标题栏高}px`)
    expect(最小样式).not.toContain('auto')
    // 长条宽度恒等于展开宽度，事件计数增长不再引起宽度抖动
    expect(最小样式).toContain('width: 420px')
    expect(wrapper.find('.jiankong-zuiXiao').text()).toContain(huoQuFanYi('guanLiJianKong', 'zhanKai'))
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(根.classes()).not.toContain('zui-xiao-hua')
    expect(根.attributes('style') || '').toContain(`height: ${默认高}px`)
  })

  it('展开入口在最小化后仍可见可点，且内容区保持展开高布局', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 内容样式 = wrapper.find('.jiankong-wangge').attributes('style') || ''
    expect(内容样式).toContain(`height: ${默认高 - 标题栏高}px`)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.jiankong-zuiXiao').exists()).toBe(true)
    expect(wrapper.find('.jiankong-guanbi').exists()).toBe(true)
    // 内容区高度不随最小化变化：clientHeight 恒定才不会夹掉 scrollTop
    expect(wrapper.find('.jiankong-wangge').attributes('style') || '').toBe(内容样式)
  })

  it('最小化拖到最顶后展开不会飞出屏外（尺寸突变重新钳制几何）', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(指针('pointerdown', 300, 300))
    window.dispatchEvent(指针('pointermove', -9000, -9000))
    await nextTick()
    // 契约演进（FP-06）：改前该用例读的是 `translate(-580px, -688px)`（右下锚角上的偏移），
    // 锚定边既已收归 composable 自持并下发绝对 left/top，同一钳制不变量的现代表述是「整盒贴回视口左上角」
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').toContain(
      'left: 0px',
    )
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').toContain(
      'top: 0px',
    )
    window.dispatchEvent(指针('pointerup', -9000, -9000))
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    await nextTick()
    const 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(样式).toContain('left: 0px')
    expect(样式).toContain('top: 0px')
    expect(样式).toContain(`height: ${默认高}px`)
    wrapper.unmount()
  })

  it('同一轮次的思考/构建/回复/评分/理由聚合在一张卡片内', () => {
    const cangKu = 使用聊天仓库()
    cangKu.gouJianGuoChengLieBiao = [
      { 阶段: '思考启动', 说明: '分析上下文', 时间: 100, 轮次: 7 },
      { 阶段: '输出回复', 说明: '第1条回复已生成并写入对话', 内容: '今晚月色真美', 时间: 300, 轮次: 7 },
    ]
    cangKu.shenDuSiKaoLieBiao = [{ 来源: 'Director', 内容: '用户在试探，先接住情绪', 时间: 150, 轮次: 7 }]
    cangKu.haoGanDuBianHuaLieBiao = [{ 变化: { 信任: 5, 亲密: -1 }, 时间: 400, 轮次: 7 }]
    cangKu.yinCangXinXiLieBiao = [
      { 类型: '好感度评判理由', 内容: '用户主动分享日常', 时间: 410, 轮次: 7 },
      { 类型: 'AI撤回', 内容: '撤回上一条', 时间: 420, 轮次: 7 },
    ]

    const wrapper = mount(GuanLiJianKong)
    const 卡片 = wrapper.findAll('.lunci-kapian')
    expect(卡片.length).toBe(1)
    expect(卡片[0].text()).toContain('用户在试探')
    expect(卡片[0].text()).toContain('今晚月色真美')
    expect(卡片[0].text()).toContain('信任+5')
    expect(卡片[0].text()).toContain('亲密-1')
    expect(卡片[0].text()).toContain('用户主动分享日常')
    expect(卡片[0].text()).toContain('撤回上一条')
  })

  it('排序切换：默认时间降序，点击后变升序', () => {
    const cangKu = 使用聊天仓库()
    cangKu.gouJianGuoChengLieBiao = [
      { 阶段: '思考启动', 说明: '早轮', 时间: 100, 轮次: 1 },
      { 阶段: '思考启动', 说明: '晚轮', 时间: 900, 轮次: 2 },
    ]
    const wrapper = mount(GuanLiJianKong)
    const 标题 = () => wrapper.findAll('.lunci-ming').map((n) => n.text())
    expect(标题()[0]).toContain('2')
    expect(标题()[1]).toContain('1')
    expect(wrapper.find('.jiankong-paixu').text()).toContain(huoQuFanYi('guanLiJianKong', 'shiJianJiangXu'))
    return wrapper.find('.jiankong-paixu').trigger('click').then(() => {
      const 升序标题 = wrapper.findAll('.lunci-ming').map((n) => n.text())
      expect(升序标题[0]).toContain('1')
      expect(升序标题[1]).toContain('2')
      expect(wrapper.find('.jiankong-paixu').text()).toContain(huoQuFanYi('guanLiJianKong', 'shiJianShengXu'))
    })
  })

  it('无轮次旧事件默认并入轮次卡片全量展示（含用户撤回等隐藏信息）', () => {
    const cangKu = 使用聊天仓库()
    cangKu.gouJianGuoChengLieBiao = [
      { 阶段: '思考启动', 说明: '旧版本无轮次构建', 时间: 100 },
    ]
    cangKu.shenDuSiKaoLieBiao = [{ 来源: '历史消息', 内容: '内心独白旧数据', 时间: 150 }]
    cangKu.haoGanDuBianHuaLieBiao = [{ 变化: { 信任: 2 }, 时间: 200 }]
    cangKu.yinCangXinXiLieBiao = [
      { 类型: '用户撤回', 内容: '用户撤回了消息', 时间: 250 },
    ]
    const wrapper = mount(GuanLiJianKong)
    const 卡片 = wrapper.findAll('.lunci-kapian')
    expect(卡片.length).toBe(1)
    expect(卡片[0].text()).toContain('旧版本无轮次构建')
    expect(卡片[0].text()).toContain('内心独白旧数据')
    expect(卡片[0].text()).toContain('信任+2')
    expect(卡片[0].text()).toContain('用户撤回了消息')
  })

  it('监控只读仓库已保存信息：裸消息列表不再另建来源', () => {
    const cangKu = 使用聊天仓库()
    cangKu.xiaoXiLieBiao = [
      {
        id: 'm1',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'r1',
        fa_song_zhe_lei_xing: 'jiaose',
        nei_rong: '内心独白旧数据',
        lei_xing: 'neiXinHuoDong',
        shi_jian_chuo: 500,
        yi_du: true,
      },
    ]
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.findAll('.lunci-kapian').length).toBe(0)
    expect(组件源码).not.toContain('xiaoXiLieBiao')
  })

  it('仓库补全后旧内心消息经持久化列表进入轮次卡片', () => {
    const cangKu = 使用聊天仓库()
    cangKu.dangQianHuiHuaId = 'h1'
    cangKu.xiaoXiLieBiao = [
      {
        id: 'm1',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'r1',
        fa_song_zhe_lei_xing: 'jiaose',
        nei_rong: '内心独白旧数据',
        lei_xing: 'neiXinHuoDong',
        shi_jian_chuo: 500,
        yi_du: true,
      },
    ]
    cangKu.补全旧内心消息()
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.findAll('.lunci-kapian').length).toBe(1)
    expect(wrapper.find('.lunci-kapian').text()).toContain('内心独白旧数据')
  })

  it('FP-04 三按钮阻止pointerdown冒泡且公共实现保留阈值不吞点击', () => {
    const 命中断 = 组件源码.match(/@pointerdown\.stop/g) || []
    expect(命中断.length).toBeGreaterThanOrEqual(3)
    expect(浮窗源码).toContain('拖动阈值像素')
    expect(浮窗源码).toContain("closest('button')")
  })

  it('FP-04 按钮pointerdown不启动拖动', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 根 = wrapper.find('.guanli-jiankong-fuchuang')
    const 起始样式 = 根.attributes('style') || ''
    await wrapper.find('.jiankong-guanbi').element.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 10, clientY: 10, button: 0, bubbles: true, cancelable: true }),
    )
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 400, bubbles: true }))
    await nextTick()
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').toBe(起始样式)
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    wrapper.unmount()
  })

  it('FP-04 标题栏拖动更新位置且超视口钳制', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 根 = () => wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    // 首帧停靠与改前逐像素同位：改前 right:24/bottom:24 钉盒 ⇒ 左 = 1024-24-420、上 = 768-24-422
    expect(根()).toContain('left: 580px')
    expect(根()).toContain('top: 322px')
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(指针('pointerdown', 200, 200))
    window.dispatchEvent(指针('pointermove', 140, 170))
    await nextTick()
    // 契约演进（FP-06）：位移不再是 transform 偏移，而是下发的绝对 left/top
    expect(根()).not.toContain('transform')
    expect(根()).toContain('left: 520px')
    expect(根()).toContain('top: 292px')
    window.dispatchEvent(指针('pointermove', 5000, 5000))
    await nextTick()
    expect(根()).toContain('left: 604px')
    expect(根()).toContain('top: 346px')
    window.dispatchEvent(指针('pointerup', 5000, 5000))
    wrapper.unmount()
  })

  it('FP-04 右下角手柄缩放更新尺寸、缩放期间无动画并持久化', async () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-shouBing-you').exists()).toBe(true)
    expect(wrapper.find('.jiankong-shouBing-xia').exists()).toBe(true)
    const 手柄 = wrapper.find('.jiankong-shouBing-youXia')
    expect(手柄.exists()).toBe(true)
    await 手柄.element.dispatchEvent(指针('pointerdown', 500, 500))
    window.dispatchEvent(指针('pointermove', 600, 560))
    await nextTick()
    const 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    // 需求 #7 的宿主侧现形：往右下拖右下手柄 ⇒ left/top 一动不动，盒只向右/向下长。
    // 契约演进（FP-06）：旧期望 520x482 是右下钉盒把 100/60px 的拖拽折成向左/向上扩张的结果；
    // 新契约下被拖动的边止于视口边界（左 580 ⇒ 宽至多 1024-580，上 322 ⇒ 高至多 768-322）
    expect(样式).toContain('left: 580px')
    expect(样式).toContain('top: 322px')
    expect(样式).toContain('width: 444px')
    expect(样式).toContain('height: 446px')
    expect(样式).toContain('transition: none')
    window.dispatchEvent(指针('pointerup', 600, 560))
    await nextTick()
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').not.toContain(
      'transition: none',
    )
    const 原文 = localStorage.getItem('guanli-jiankong:fu-chuang') || ''
    expect(原文).toContain('444')
    wrapper.unmount()
  })

  it('FP-04 单向手柄只改单轴尺寸', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper
      .find('.jiankong-shouBing-you')
      .element.dispatchEvent(指针('pointerdown', 500, 500))
    window.dispatchEvent(指针('pointermove', 520, 990))
    await nextTick()
    let 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    // 契约演进（FP-06）：旧期望 480px 读的是右下钉盒下「往右拖却向左长」的尺寸通道；新契约 left 恒 580，
    // 且把偏移收小到此值以钉住「方向」而不是钉住视口边界钳制值
    expect(样式).toContain('left: 580px')
    expect(样式).toContain('width: 440px')
    expect(样式).toContain(`height: ${默认高}px`)
    window.dispatchEvent(指针('pointerup', 520, 990))
    await wrapper
      .find('.jiankong-shouBing-xia')
      .element.dispatchEvent(指针('pointerdown', 500, 500))
    window.dispatchEvent(指针('pointermove', 990, 520))
    await nextTick()
    样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    // 同上：旧期望 462 的下缘扩张其实发生在视觉上的「向上长」，新契约 top 恒 322、只有下缘在动
    expect(样式).toContain('top: 322px')
    expect(样式).toContain('width: 440px')
    expect(样式).toContain('height: 442px')
    window.dispatchEvent(指针('pointerup', 990, 520))
    wrapper.unmount()
  })

  it('FP-04 缩放钳制最小280x200', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper
      .find('.jiankong-shouBing-youXia')
      .element.dispatchEvent(指针('pointerdown', 500, 500))
    window.dispatchEvent(指针('pointermove', -5000, -5000))
    await nextTick()
    const 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(样式).toContain('280px')
    expect(样式).toContain('200px')
    window.dispatchEvent(指针('pointerup', -5000, -5000))
    wrapper.unmount()
  })

  it('FP-04 最小化长条无手柄但标题栏仍可拖动', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.guanli-jiankong-fuchuang').classes()).toContain('zui-xiao-hua')
    expect(wrapper.find('.jiankong-shouBing-youXia').exists()).toBe(false)
    expect(wrapper.find('.jiankong-shouBing-you').exists()).toBe(false)
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(指针('pointerdown', 100, 100))
    window.dispatchEvent(指针('pointermove', 40, 70))
    await nextTick()
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').toContain(
      'left: 520px',
    )
    // 最小化态长条的下缘锚点用标题栏高（56）算：上 = 768-24-56-30 = 658
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').toContain(
      'top: 658px',
    )
    window.dispatchEvent(指针('pointerup', 40, 70))
    wrapper.unmount()
  })

  it('缩放实现下沉公共 composable，组件移除 CSS resize 双通道并自带卸载清理', () => {
    expect(浮窗源码).toContain('开始缩放')
    expect(浮窗源码).toContain('处理缩放')
    expect(浮窗源码).toContain('结束缩放')
    expect(组件源码).toContain('开始缩放')
    // 尺寸通道只留自写手柄一条，浏览器原生 resize 双通道已移除
    expect(组件源码).not.toContain('resize: both')
    expect(组件源码).toContain('touch-action: none')
    // 右缘手柄自标题栏下沿起算，不再压住标题栏与标题栏按钮
    expect(组件源码).toContain('top: var(--fu-chuang-biaoti-lan-gao)')
    const 卸载段 = 浮窗源码.slice(浮窗源码.indexOf('onBeforeUnmount'))
    expect(卸载段).toContain('处理缩放')
    expect(卸载段).toContain('结束缩放')
    expect(卸载段).toContain('处理拖动')
    expect(卸载段).toContain('pointercancel')
    expect(卸载段).toContain('visualViewport')
  })

  it('实时日志浮窗改消费公共 composable，第二套拖动实现已删除', () => {
    expect(日志源码).toContain('use可拖动浮窗')
    expect(日志源码).not.toContain('kaiShiTuoDong')
    expect(日志源码).not.toContain('chuLiTuoDong')
    expect(日志源码).not.toContain('jieShuTuoDong')
    expect(日志源码).not.toContain('xianZhi(')
    expect(日志源码).not.toMatch(/z-index:\s*-?\d/)
    expect(日志源码).toMatch(/--rizhi-z-index:\s*var\(--ceng-tiaoshi-riji\)/)
    expect(日志源码).not.toMatch(/\d+vh/)
    expect(日志源码).toContain('touch-action: none')
    expect(日志源码).toContain('@pointerdown="开始拖动"')
    // 契约演进（FP-06）：本浮窗只消费几何、不可缩放，宿主同样不得再钉任何一条边（改前为 left/bottom）
    expect(日志源码).not.toMatch(/^\s*(left|right|top|bottom):\s*var\(--fu-chuang-ting-kao-bian-jv\)/m)
    expect(日志源码).toMatch(/will-change:\s*left,\s*top/)
  })

  it('浮层层级收敛为档位令牌：档位数字序单调（通话<军师<协议<授权<调试<断网<版本）', () => {
    expect(档位('ceng-tiaoshi-mianban')).toBeGreaterThan(档位('ceng-tiaoshi-riji'))
    expect(档位('ceng-tiaoshi-riji')).toBeGreaterThan(档位('ceng-shouquan'))
    expect(档位('ceng-shouquan')).toBeGreaterThan(档位('ceng-xieyi'))
    expect(档位('ceng-xieyi')).toBeGreaterThan(档位('ceng-junshi-jilu'))
    expect(档位('ceng-junshi-jilu')).toBeGreaterThan(档位('ceng-junshi'))
    expect(档位('ceng-junshi')).toBeGreaterThan(档位('ceng-tonghua'))
    expect(档位('ceng-duanwang')).toBeGreaterThan(档位('ceng-tiaoshi-mianban'))
    expect(档位('ceng-banben')).toBeGreaterThan(档位('ceng-duanwang'))
  })

  it('档位数字序保证调试浮窗低于断网横幅与版本提示', () => {
    expect(档位('ceng-duanwang')).toBeGreaterThan(档位('ceng-tiaoshi-mianban'))
    expect(档位('ceng-banben')).toBeGreaterThan(档位('ceng-tiaoshi-mianban'))
    expect(档位('ceng-duanwang')).toBeGreaterThan(档位('ceng-tiaoshi-riji'))
    expect(档位('ceng-banben')).toBeGreaterThan(档位('ceng-tiaoshi-riji'))
  })

  it('已知层级例外登记（层级上下文统一后可删除本用例）：断网横幅与调试浮窗不在同一层叠上下文', () => {
    // 结构事实：管理员监控经 Teleport 落在 body 根层叠上下文，实时日志在 .app-rongqi 之外，
    // 而断网横幅在 .app-rongqi{z-index:1} 之内——数字档位序单独决定不了实际遮挡关系。
    expect(聊天页源码).toMatch(/<Teleport\s+to="body">\s*<GuanLiJianKong/)
    const app源码 = 读源码('src/App.vue')
    expect(app源码).toMatch(/\.app-rongqi\s*\{[^}]*z-index:\s*1/)
    expect(app源码.indexOf('<DuanWangHengFu')).toBeGreaterThan(-1)
    expect(app源码.indexOf('<DuanWangHengFu')).toBeLessThan(app源码.indexOf('<ShiShiRiZhi'))
  })

  it.each(浮层文件清单)('浮层文件 %s 的 z-index 只引用档位令牌，无裸数字', (路径) => {
    expect(读源码(路径)).not.toMatch(/z-index:\s*[^;]*\d/)
  })

  it('global.css 版本提示取 --ceng-banben，除卡内装饰层外不再有数字层级', () => {
    expect(全局样式源码).toMatch(/#ban-ben-ti-shi\s*\{[^}]*z-index:\s*var\(--ceng-banben\)/)
    const 去装饰层 = 全局样式源码.replace(/\.boli-kapian::after\s*\{[^}]*\}/, '')
    expect(去装饰层).not.toMatch(/z-index:\s*[^;]*\d/)
  })

  it('面板零硬编码色值，且所用主题令牌在明暗两套均有定义', () => {
    expect(组件源码).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(组件源码).not.toMatch(/rgba?\(/)
    const 用到的令牌 = 组件用令牌(组件源码)
    expect(用到的令牌.length).toBeGreaterThan(15)
    for (const 令牌名 of 用到的令牌) {
      expect(主题已定义(令牌名, 'light'), `浅色主题缺少令牌 --${令牌名}`).toBe(true)
      expect(主题已定义(令牌名, 'dark'), `暗色主题缺少令牌 --${令牌名}`).toBe(true)
    }
  })

  it('常态保留 height 过渡，缩放期间才被内联 transition:none 掐断', () => {
    expect(组件源码).toMatch(/transition:\s*height\s+[\d.]+s\s+var\(--quxian-biao-zhun\)/)
    expect(浮窗源码).toContain("if (缩放中.value) 样式.transition = 'none'")
  })

  it('八个缩放手柄逐边就位：侧缘与下缘不自标题栏起算，上缘只占标题栏顶部 10px', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(缩放方向清单).toHaveLength(8)
    for (const 方向 of 缩放方向清单) {
      expect(wrapper.find(`.jiankong-shouBing-${方向}`).exists(), `缺少 ${方向} 向手柄`).toBe(true)
      expect(组件源码).toMatch(
        new RegExp(`\\.jiankong-shouBing-${方向}\\s*\\{[^}]*cursor:`),
        `${方向} 向手柄无 cursor`,
      )
    }
    // 契约演进（FP-06）：改前宿主只挂 you/xia/youXia 三向，其余五向在 composable 里根本没实现
    for (const 侧缘 of ['you', 'zuo']) {
      expect(组件源码).toMatch(
        new RegExp(
          `\\.jiankong-shouBing-${侧缘}\\s*\\{[^}]*top:\\s*var\\(--fu-chuang-biaoti-lan-gao\\)`,
        ),
        `${侧缘} 缘手柄应自标题栏下沿起算`,
      )
    }
    for (const 下缘 of ['xia', 'youXia', 'zuoXia']) {
      expect(组件源码).toMatch(
        new RegExp(`\\.jiankong-shouBing-${下缘}\\s*\\{[^}]*bottom:\\s*0`),
        `${下缘} 手柄应贴下缘`,
      )
      expect(组件源码).not.toMatch(
        new RegExp(`\\.jiankong-shouBing-${下缘}\\s*\\{[^}]*top:`),
        `${下缘} 手柄不得自标题栏起算`,
      )
    }
    // 上缘带不得吃掉标题栏按钮的命中区：只占 10px 顶带（按钮在 --fu-chuang-biaoti-lan-gao 内垂直居中）
    expect(组件源码).toMatch(/\.jiankong-shouBing-shang\s*\{[^}]*top:\s*0/)
    expect(组件源码).toMatch(/\.jiankong-shouBing-shang\s*\{[^}]*height:\s*10px/)
    wrapper.unmount()
  })

  it('visualViewport 收窄后尺寸与位置同步重钳制，展开态永不越出视口', async () => {
    const vv = 视觉视口(1024, 768)
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(指针('pointerdown', 300, 300))
    window.dispatchEvent(指针('pointermove', -9000, -9000))
    window.dispatchEvent(指针('pointerup', -9000, -9000))
    await nextTick()
    const 读样式 = () => wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    // 契约演进（FP-06）：left/top 取代 translate 偏移，「拖到锚点极值」的现代表述即整盒贴左上角
    expect(读样式()).toContain('left: 0px')
    expect(读样式()).toContain('top: 0px')
    vv.width = 500
    vv.height = 400
    vv.派发('resize')
    await nextTick()
    const 收窄高 = Math.round(400 * 0.55)
    const 样式 = 读样式()
    expect(样式).toContain(`height: ${收窄高}px`)
    expect(样式).toContain('left: 0px')
    expect(样式).toContain('top: 0px')
    wrapper.unmount()
  })

  it('最小化态位置按标题栏高重新钳制：视口收窄不会把长条推出屏外', async () => {
    const vv = 视觉视口(1024, 768)
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(指针('pointerdown', 300, 300))
    window.dispatchEvent(指针('pointermove', -9000, -9000))
    window.dispatchEvent(指针('pointerup', -9000, -9000))
    await nextTick()
    const 读样式 = () => wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(读样式()).toContain('left: 0px')
    expect(读样式()).toContain('top: 0px')
    vv.height = 500
    vv.派发('resize')
    await nextTick()
    expect(读样式()).toContain('left: 0px')
    expect(读样式()).toContain('top: 0px')
    expect(读样式()).toContain(`height: ${标题栏高}px`)
    wrapper.unmount()
  })

  it('最小化与展开之间正文 DOM 节点不重建，滚动位置因此不丢', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 正文 = wrapper.find('.jiankong-wangge').element
    Object.defineProperty(正文, 'scrollTop', { value: 200, writable: true, configurable: true })
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.jiankong-wangge').element).toBe(正文)
    expect(正文.scrollTop).toBe(200)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.jiankong-wangge').element).toBe(正文)
    expect(正文.scrollTop).toBe(200)
    wrapper.unmount()
  })

  it('事件总数 badge 从 0 变 1 不改最小化长条宽度', async () => {
    const cangKu = 使用聊天仓库()
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    const 长条样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style')
    expect(wrapper.find('.jiankong-jishu').exists()).toBe(false)
    cangKu.shenDuSiKaoLieBiao = [{ 来源: 'Director', 内容: '思考', 时间: 10 }]
    await nextTick()
    expect(wrapper.find('.jiankong-jishu').exists()).toBe(true)
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style')).toBe(长条样式)
    wrapper.unmount()
  })

  it('旧版混存的 pian-hao 残留被抹平为只含排序，不与浮窗尺寸键互串', () => {
    localStorage.setItem(
      'guanli-jiankong:pian-hao',
      JSON.stringify({ 排序: 'sheng', 宽: 500, 高: 300, 最小化: true }),
    )
    const wrapper = mount(GuanLiJianKong)
    expect(JSON.parse(localStorage.getItem('guanli-jiankong:pian-hao') as string)).toEqual({
      排序: 'sheng',
    })
    const 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(样式).toContain(`width: ${默认宽}px`)
    expect(样式).toContain(`height: ${默认高}px`)
    expect(localStorage.getItem('guanli-jiankong:fu-chuang')).toBeNull()
    wrapper.unmount()
  })

  it('性别展示走 utils/性别 唯一识别口，未知写法不再静默判成女性', () => {
    expect(组件源码).not.toMatch(/xing_bie\s*===\s*['"]/)
    expect(组件源码).toContain('guiYiXingBie')
    const 用例: [unknown, 'nanXing' | 'nvXing' | 'weiZhiXingBie'][] = [
      ['nan', 'nanXing'],
      ['男', 'nanXing'],
      ['male', 'nanXing'],
      ['nv', 'nvXing'],
      ['女', 'nvXing'],
      ['female', 'nvXing'],
      ['NV', 'nvXing'],
      ['other', 'weiZhiXingBie'],
      ['', 'weiZhiXingBie'],
      [null, 'weiZhiXingBie'],
      [undefined, 'weiZhiXingBie'],
    ]
    const cangKu = 使用聊天仓库()
    const 标签 = huoQuFanYi('guanLiJianKong', 'xingBie')
    for (const [写法, 期望键] of 用例) {
      cangKu.jiaoSeXinXi = 人设(写法)
      const wrapper = mount(GuanLiJianKong)
      const 行 = wrapper.findAll('.renshe-xiang').find((项) => 项.text().startsWith(标签))
      expect(
        行 ? 行.find('.renshe-zhi').text() : null,
        `性别写法 ${String(写法)} 应展示 ${期望键}`,
      ).toBe(huoQuFanYi('guanLiJianKong', 期望键))
      wrapper.unmount()
    }
  })

  it('greedisgood 门禁真值只来自服务端下发：huoQuYongHuXinXi → jiaZaiYongHu → 归一管理能力列表（FP-08 替代源码正则断言）', async () => {
    const 用户仓库 = 使用用户仓库()
    用户仓库.令牌 = 'test-token'

    // 三旗标全伪账号：服务端下发空能力位 ⇒ 视图门 fail-closed
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(服务端出参({ jiao_se: null, neng_li: [] }))
    await 用户仓库.jiaZaiYongHu()
    expect(用户仓库.dangQianJiaoSe).toBeNull()
    expect(用户仓库.nengLieBiao).toEqual([])
    expect(用户仓库.keGuanLiZhiDu).toBe(false)
    expect(用户仓库.keGaoWei).toBe(false)

    // 管理员账号：服务端按 管理员 旗标下发五位能力 ⇒ 同一门禁翻为真
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(
      服务端出参({
        jiao_se: 'chao_guan',
        neng_li: ['cha_kan', 'feng_jin', 'feng_jin_shen_he', 'tong_ji_xie', 'gao_we'],
      }),
    )
    await 用户仓库.jiaZaiYongHu()
    expect(用户仓库.dangQianJiaoSe).toBe('chao_guan')
    expect(用户仓库.keGuanLiZhiDu).toBe(true)
    expect(用户仓库.keGaoWei).toBe(true)

    // 审核员：只有 cha_kan 族 ⇒ 面板可开，高危运行时面不可开
    vi.mocked(huoQuYongHuXinXi).mockResolvedValue(
      服务端出参({ jiao_se: 'shen_he_yuan', neng_li: ['cha_kan', 'feng_jin_shen_he'] }),
    )
    await 用户仓库.jiaZaiYongHu()
    expect(用户仓库.keGuanLiZhiDu).toBe(true)
    expect(用户仓库.keGaoWei).toBe(false)
  })

  it('服务端出参缺字段/脏值一律按无能力处理（白名单 fail-closed，抬权路径不存在）', async () => {
    const 用户仓库 = 使用用户仓库()
    用户仓库.令牌 = 'test-token'
    const 脏出参: Array<[Record<string, unknown>, GuanLiJiaoSe | null]> = [
      [{}, null],
      // 角色在场但能力位缺失：能力位是唯一门禁，绝不由角色反推成有权
      [{ jiao_se: 'chao_guan' }, 'chao_guan'],
      [{ neng_li: null }, null],
      [{ neng_li: 'cha_kan' }, null],
      [{ neng_li: ['chaKan', 'admin', 'cha_kan '] }, null],
      [{ neng_li: [{ jiao_se: 'cha_kan' }] }, null],
      [{ jiao_se: '管理员', neng_li: [] }, null],
    ]
    for (const [出参, 期望角色] of 脏出参) {
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(服务端出参(出参))
      await 用户仓库.jiaZaiYongHu()
      expect(用户仓库.nengLieBiao, JSON.stringify(出参)).toEqual([])
      expect(用户仓库.keGuanLiZhiDu, JSON.stringify(出参)).toBe(false)
      expect(用户仓库.keGaoWei, JSON.stringify(出参)).toBe(false)
      expect(用户仓库.dangQianJiaoSe, JSON.stringify(出参)).toBe(期望角色)
    }
  })

  it('门禁放行的会话里面板确实承载运营数据（人设/AI 思维链），故该门不可退回无条件开启', async () => {
    const cangKu = 使用聊天仓库()
    cangKu.jiaoSeXinXi = 人设('nv')
    cangKu.shenDuSiKaoLieBiao = [{ 来源: 'Director', 内容: 'AI 内部思考', 时间: 10 }]
    const wrapper = mount(GuanLiJianKong)
    await nextTick()

    expect(wrapper.findAll('.renshe-xiang').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'jiaoSeRenShe'))
    expect(wrapper.find('.jiankong-jishu').exists()).toBe(true)
    expect(wrapper.text()).toContain('AI 内部思考')
    wrapper.unmount()
  })
})
