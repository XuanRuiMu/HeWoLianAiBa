import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { huoQuFanYi } from '@/config/translations'
import GuanLiJianKong from '@/components/管理员监控.vue'
import { 使用聊天仓库 } from '@/stores/聊天'

const 组件源码 = readFileSync(resolve(process.cwd(), 'src/components/管理员监控.vue'), 'utf-8')

describe('管理员监控 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

  it('标题栏为拖动句柄且关闭按钮可点击不触发拖动', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-biaoti-lan').exists()).toBe(true)
    // 拖动机制：自研指针事件 + setPointerCapture（源码断言）
    expect(组件源码).toContain('setPointerCapture')
    expect(组件源码).toContain('pointermove')
    // 关闭按钮存在且独立于拖动
    expect(wrapper.find('.jiankong-guanbi').exists()).toBe(true)
  })

  it('渲染标题与四个分区标题', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.jiankong-biaoti').text()).toContain(
      huoQuFanYi('guanLiJianKong', 'biaoTi'),
    )
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'gouJianSiLu'))
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'haoGanDuBianHua'))
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'yinCangXinXi'))
    expect(wrapper.text()).toContain(huoQuFanYi('guanLiJianKong', 'shiJianRiZhi'))
  })

  it('四个分区在空数据时均显示暂无数据', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.findAll('.fenqu-kong').length).toBe(4)
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = mount(GuanLiJianKong)
    await wrapper.find('.jiankong-guanbi').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('填充 store 数据后渲染对应条目与累计值', () => {
    const cangKu = 使用聊天仓库()
    cangKu.gouJianGuoChengLieBiao = [
      { 阶段: '思考启动', 说明: '分析上下文', 时间: 100 },
      { 阶段: '策略规划', 说明: '拟定回复', 时间: 200 },
    ]
    cangKu.haoGanDuBianHuaLieBiao = [{ 变化: { r1: 5, r2: -1 }, 时间: 300 }]
    cangKu.yinCangXinXiLieBiao = [{ 类型: 'AI撤回', 内容: '撤回内容', 时间: 400 }]

    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.findAll('.shijian-xian-xiang').length).toBe(2)
    expect(wrapper.findAll('.haogandu-xiang').length).toBe(1)
    expect(wrapper.findAll('.yincang-xiang').length).toBe(1)
    expect(wrapper.findAll('.rizhi-xiang').length).toBe(4)
    expect(wrapper.find('.leiji-xiang').text()).toContain('r1')
    expect(wrapper.find('.leiji-xiang').text()).toContain('+5')
  })

  it('构建过程按时间倒序展示', () => {
    const cangKu = 使用聊天仓库()
    cangKu.gouJianGuoChengLieBiao = [
      { 阶段: '思考启动', 说明: 's1', 时间: 100 },
      { 阶段: '输出回复', 说明: 's2', 时间: 500 },
    ]
    const wrapper = mount(GuanLiJianKong)
    const jieDuan = wrapper.findAll('.shijian-xian-jieduan').map((n) => n.text())
    expect(jieDuan[0]).toBe('输出回复')
    expect(jieDuan[1]).toBe('思考启动')
  })
})
