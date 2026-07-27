import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { huoQuFanYi } from '@/config/translations'
import GuanLiJianKong from '@/components/管理员监控.vue'
import { 使用聊天仓库 } from '@/stores/聊天'

describe('管理员监控 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('渲染遮罩、标题与四个分区标题', () => {
    const wrapper = mount(GuanLiJianKong)
    expect(wrapper.find('.guanli-jiankong-zhezhao').exists()).toBe(true)
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
