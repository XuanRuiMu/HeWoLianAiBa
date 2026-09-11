import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { huoQuFanYi } from '@/config/translations'
import GuanLiJianKong from '@/components/管理员监控.vue'
import { 使用聊天仓库 } from '@/stores/聊天'

const 组件源码 = readFileSync(resolve(process.cwd(), 'src/components/管理员监控.vue'), 'utf-8')

describe('管理员监控 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('浮窗根元素使用固定定位（源码断言）', () => {
    expect(组件源码).not.toContain('inset: 0')
    expect(组件源码).not.toContain('backdrop-filter')
    expect(组件源码).not.toContain('guanli-jiankong-zhezhao')
    expect(组件源码).not.toContain('aria-modal')
    expect(组件源码).toContain('position: fixed')
    // 尺寸与 z-index 提为 CSS 变量，禁止散落魔法数字
    expect(组件源码).toContain('--jiankong-kuan')
    expect(组件源码).toContain('--jiankong-gao')
    expect(组件源码).toContain('--jiankong-z-index')
  })

  it('标题栏为拖动句柄且按钮点击不触发拖动', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-biaoti-lan').exists()).toBe(true)
    // 拖动机制：阈值式指针拖动 + setPointerCapture（源码断言）
    expect(组件源码).toContain('setPointerCapture')
    expect(组件源码).toContain('pointermove')
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

  it('最小化后缩成 slim 长条：正文隐藏、再次点击展开还原', async () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-wangge').exists()).toBe(true)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.guanli-jiankong-fuchuang').classes()).toContain('zui-xiao-hua')
    expect(wrapper.find('.jiankong-wangge').exists()).toBe(false)
    expect(wrapper.find('.jiankong-zuiXiao').text()).toContain(huoQuFanYi('guanLiJianKong', 'zhanKai'))
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.guanli-jiankong-fuchuang').classes()).not.toContain('zui-xiao-hua')
    expect(wrapper.find('.jiankong-wangge').exists()).toBe(true)
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

  it('FP-04 三按钮阻止pointerdown冒泡且源码保留阈值不吞点击', () => {
    const 命中断 = 组件源码.match(/@pointerdown\.stop/g) || []
    expect(命中断.length).toBeGreaterThanOrEqual(3)
    expect(组件源码).toContain('拖动阈值像素')
    expect(组件源码).toContain("closest('button')")
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

  it('FP-04 标题栏拖动更新位移且超视口钳制', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 元素 = wrapper.find('.guanli-jiankong-fuchuang').element as HTMLElement
    元素.getBoundingClientRect = () =>
      ({ width: 420, height: 400, x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 420 }) as DOMRect
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 200, clientY: 200, button: 0, bubbles: true, cancelable: true }),
    )
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 170, bubbles: true }))
    await nextTick()
    const 位移后 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(位移后).toContain('translate(-60px')
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 5000, clientY: 5000, bubbles: true }))
    await nextTick()
    const 钳制后 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(钳制后).toContain('translate(24px')
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    wrapper.unmount()
  })

  it('FP-04 右下角手柄缩放更新尺寸并持久化', async () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-shouBing-you').exists()).toBe(true)
    expect(wrapper.find('.jiankong-shouBing-xia').exists()).toBe(true)
    const 手柄 = wrapper.find('.jiankong-shouBing-youXia')
    expect(手柄.exists()).toBe(true)
    const 元素 = wrapper.find('.guanli-jiankong-fuchuang').element as HTMLElement
    元素.getBoundingClientRect = () =>
      ({ width: 420, height: 400, x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 420 }) as DOMRect
    await 手柄.element.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 500, clientY: 500, button: 0, bubbles: true, cancelable: true }),
    )
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 600, clientY: 560, bubbles: true }))
    await nextTick()
    const 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(样式).toContain('520px')
    expect(样式).toContain('460px')
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    await nextTick()
    const 原文 = localStorage.getItem('guanli-jiankong:pian-hao') || ''
    expect(原文).toContain('520')
    wrapper.unmount()
  })

  it('FP-04 缩放钳制最小280x200', async () => {
    const wrapper = mount(GuanLiJianKong)
    const 元素 = wrapper.find('.guanli-jiankong-fuchuang').element as HTMLElement
    元素.getBoundingClientRect = () =>
      ({ width: 420, height: 400, x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 420 }) as DOMRect
    await wrapper.find('.jiankong-shouBing-youXia').element.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 500, clientY: 500, button: 0, bubbles: true, cancelable: true }),
    )
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: -5000, clientY: -5000, bubbles: true }))
    await nextTick()
    const 样式 = wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || ''
    expect(样式).toContain('280px')
    expect(样式).toContain('200px')
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    wrapper.unmount()
  })

  it('FP-04 最小化长条无手柄但标题栏仍可拖动', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-zuiXiao').trigger('click')
    expect(wrapper.find('.guanli-jiankong-fuchuang').classes()).toContain('zui-xiao-hua')
    expect(wrapper.find('.jiankong-shouBing-youXia').exists()).toBe(false)
    const 元素 = wrapper.find('.guanli-jiankong-fuchuang').element as HTMLElement
    元素.getBoundingClientRect = () =>
      ({ width: 300, height: 40, x: 0, y: 0, top: 0, left: 0, bottom: 40, right: 300 }) as DOMRect
    await wrapper.find('.jiankong-biaoti-lan').element.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 100, clientY: 100, button: 0, bubbles: true, cancelable: true }),
    )
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 40, clientY: 70, bubbles: true }))
    await nextTick()
    expect(wrapper.find('.guanli-jiankong-fuchuang').attributes('style') || '').toContain('translate(-60px')
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    wrapper.unmount()
  })

  it('FP-04 源码含缩放实现与CSS兜底及卸载清理', () => {
    expect(组件源码).toContain('开始缩放')
    expect(组件源码).toContain('处理缩放')
    expect(组件源码).toContain('结束缩放')
    expect(组件源码).toContain('resize: both')
    expect(组件源码).toContain('280px')
    expect(组件源码).toContain('200px')
    expect(组件源码).toContain('touch-action: none')
    const 卸载段 = 组件源码.slice(组件源码.indexOf('onBeforeUnmount'))
    expect(卸载段).toContain('处理缩放')
    expect(卸载段).toContain('结束缩放')
    expect(卸载段).toContain('处理拖动')
  })
})
