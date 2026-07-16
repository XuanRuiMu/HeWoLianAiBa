import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 资料设置向导 from '@/views/资料设置向导.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { huoQuFanYi } from '@/config/translations'

type ZuJianBaoZhuang = VueWrapper

vi.mock('@/api/聊天', () => ({
  shengChengJiaoSe: vi.fn(),
  queRenJiaoSe: vi.fn(),
}))

import { shengChengJiaoSe, queRenJiaoSe } from '@/api/聊天'

function 创建路由() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/profile-setup', name: 'ziLiaoSheZhi', component: 资料设置向导 },
      {
        path: '/tian-jia-wei-xin',
        name: 'tianJiaWeiXin',
        component: { template: '<div>添加微信</div>' },
      },
    ],
  })
}

async function 挂载组件(选项目: { 清空状态?: boolean } = {}) {
  const 需要清空 = 选项目.清空状态 !== false
  const luYou = 创建路由()
  const pinia = createPinia()
  setActivePinia(pinia)
  const cangKu = 使用认证表单仓库()
  if (需要清空) {
    cangKu.qingKongZiLiao()
  }

  const wrapper = mount(资料设置向导, {
    global: {
      plugins: [pinia, luYou],
    },
    attachTo: document.body,
  })
  await luYou.isReady()
  await flushPromises()
  return { wrapper, luYou, cangKu }
}

async function 进入步骤二(wrapper: ZuJianBaoZhuang) {
  const xingBieKaPian = wrapper.findAll('.ziJi-xingBie-kaPian')
  await xingBieKaPian[0].trigger('click')
  await flushPromises()
  await wrapper.find('.anniu-zhuYao').trigger('click')
  await flushPromises()
}

async function 进入步骤三(wrapper: ZuJianBaoZhuang) {
  await 进入步骤二(wrapper)
  const xingBieKaPian = wrapper.findAll('.duiXiang-xingBie-kaPian')
  await xingBieKaPian[1].trigger('click')
  await flushPromises()
  await wrapper.find('.anniu-zhuYao').trigger('click')
  await flushPromises()
}

describe('资料设置向导组件', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  afterEach(() => {
    const cangKu = 使用认证表单仓库()
    cangKu.qingKongZiLiao()
  })

  it('步骤1渲染存在“男”和“女”两个性别选项', async () => {
    const { wrapper } = await 挂载组件()

    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou1BiaoTi'))
    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'))
    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNv'))

    const kaPian = wrapper.findAll('.ziJi-xingBie-kaPian')
    expect(kaPian.length).toBe(2)
  })

  it('步骤2渲染存在“男”和“女”两个性别选项', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤二(wrapper)

    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou2BiaoTi'))
    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'))
    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNv'))

    const kaPian = wrapper.findAll('.duiXiang-xingBie-kaPian')
    expect(kaPian.length).toBe(2)
  })

  it('步骤3渲染存在16个MBTI选项和“随机”选项', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    expect(mbtiKaPian.length).toBe(17)
    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'suiJi'))
  })

  it('“随机”选项选中后从16种MBTI中随机一种，运行10次结果不全部相同', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const jieGuoJiHe = new Set<string>()
    const suiJiKaPian = wrapper.find('.suiJi-kaPian')

    for (let i = 0; i < 10; i++) {
      await suiJiKaPian.trigger('click')
      await flushPromises()
      const cangKu = 使用认证表单仓库()
      if (cangKu.ziLiaoShuJu.xingGeXuanZe) {
        jieGuoJiHe.add(cangKu.ziLiaoShuJu.xingGeXuanZe)
      }
    }

    expect(jieGuoJiHe.size).toBeGreaterThan(1)
  })

  it('步骤3根据步骤2选择的性别显示“渣男”或“渣女”勾选框', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤二(wrapper)

    const nanKaPian = wrapper.findAll('.duiXiang-xingBie-kaPian')[0]
    const nvKaPian = wrapper.findAll('.duiXiang-xingBie-kaPian')[1]

    await nanKaPian.trigger('click')
    await flushPromises()
    await wrapper.find('.anniu-zhuYao').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'zhaNanBianTi'))
    expect(wrapper.text()).not.toContain(huoQuFanYi('ziLiaoSheZhi', 'zhaNvBianTi'))

    await wrapper.find('.anniu-fuZhu').trigger('click')
    await flushPromises()
    await nvKaPian.trigger('click')
    await flushPromises()
    await wrapper.find('.anniu-zhuYao').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'zhaNvBianTi'))
    expect(wrapper.text()).not.toContain(huoQuFanYi('ziLiaoSheZhi', 'zhaNanBianTi'))
  })

  it('勾选“渣男/渣女变体”后角色生成接口请求参数渣男渣女变体=true', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[0].trigger('click')
    await flushPromises()

    const fuXuanKuang = wrapper.find('.zhaXing-gouxuan')
    await fuXuanKuang.setValue(true)
    await flushPromises()

    vi.mocked(shengChengJiaoSe).mockResolvedValue({
      id: 'jiao-se-1',
      ming_zi: '测试角色',
      xing_bie: 'nv',
      nian_ling: 22,
      wai_mao: '测试外貌',
      xing_ge: '测试性格',
      bei_jing_gu_shi: '测试背景',
      xi_hao: ['测试爱好'],
      yan_yu_feng_ge: '测试言语风格',
      tou_xiang: 'emoji',
      biao_qian: ['测试标签'],
      yu_she_lei_xing: 'INFP',
      mbti_lei_xing: 'INFP',
      ie_lei_xing: 'I',
      re_shen_lei_xing: 'slow',
      shi_fou_zha_xing: true,
      wei_xin_ming: '测试微信昵称',
      zhen_shi_ming: '测试名字',
    })
    vi.mocked(queRenJiaoSe).mockResolvedValue({ jiao_se_id: 'jiao-se-1' })

    const kaiShiAnNiu = wrapper.find('.kaiShiLiaoTian')
    await kaiShiAnNiu.trigger('click')
    await flushPromises()

    expect(shengChengJiaoSe).toHaveBeenCalled()
    const diaoYongCanShu = vi.mocked(shengChengJiaoSe).mock.calls[0]
    expect(diaoYongCanShu[2]).toBe(true)
  })

  it('渣男渣女勾选前提示文字不显示，勾选后提示文字可见', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const tiShi = wrapper.find('.zhaNv-tishi')
    expect(tiShi.exists()).toBe(true)
    expect(tiShi.isVisible()).toBe(false)

    const fuXuanKuang = wrapper.find('.zhaXing-gouxuan')
    await fuXuanKuang.setValue(true)
    await flushPromises()

    expect(tiShi.isVisible()).toBe(true)
  })

  it('前进时动画名称为 buZhou-qianJin，后退时动画名称为 buZhou-houTui', async () => {
    const { wrapper } = await 挂载组件()

    const guoDu = wrapper.findComponent({ name: 'Transition' })
    expect(guoDu.exists()).toBe(true)

    await wrapper.findAll('.ziJi-xingBie-kaPian')[0].trigger('click')
    await flushPromises()
    await wrapper.find('.anniu-zhuYao').trigger('click')
    await flushPromises()

    expect(guoDu.attributes('name')).toBe('buZhou-qianJin')

    await wrapper.find('.anniu-fuZhu').trigger('click')
    await flushPromises()

    expect(guoDu.attributes('name')).toBe('buZhou-houTui')
  })

  it('进度圆点点击可跳回对应已完成步骤', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const yuanDian = wrapper.findAll('.jindu-dian')
    expect(yuanDian.length).toBe(3)

    await yuanDian[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou1BiaoTi'))
  })

  it('完成步骤3后调用角色生成接口并跳转到“添加微信”过渡页', async () => {
    const { wrapper, luYou } = await 挂载组件()
    await 进入步骤三(wrapper)

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[0].trigger('click')
    await flushPromises()

    vi.mocked(shengChengJiaoSe).mockResolvedValue({
      id: 'jiao-se-1',
      ming_zi: '测试角色',
      xing_bie: 'nv',
      nian_ling: 22,
      wai_mao: '测试外貌',
      xing_ge: '测试性格',
      bei_jing_gu_shi: '测试背景',
      xi_hao: ['测试爱好'],
      yan_yu_feng_ge: '测试言语风格',
      tou_xiang: 'emoji',
      biao_qian: ['测试标签'],
      yu_she_lei_xing: 'ISTJ',
      mbti_lei_xing: 'ISTJ',
      ie_lei_xing: 'I',
      re_shen_lei_xing: 'slow',
      shi_fou_zha_xing: false,
      wei_xin_ming: '测试微信昵称',
      zhen_shi_ming: '测试名字',
    })
    vi.mocked(queRenJiaoSe).mockResolvedValue({ jiao_se_id: 'jiao-se-1' })

    const kaiShiAnNiu = wrapper.find('.kaiShiLiaoTian')
    await kaiShiAnNiu.trigger('click')
    await flushPromises()

    expect(shengChengJiaoSe).toHaveBeenCalledTimes(1)
    expect(queRenJiaoSe).toHaveBeenCalledTimes(1)
    expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')
    expect(luYou.currentRoute.value.query.jiaoSeId).toBe('jiao-se-1')
  })

  it('完整设置对象后退出再进入，从步骤1开始', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[0].trigger('click')
    await flushPromises()

    vi.mocked(shengChengJiaoSe).mockResolvedValue({
      id: 'jiao-se-1',
      ming_zi: '测试角色',
      xing_bie: 'nv',
      nian_ling: 22,
      wai_mao: '测试外貌',
      xing_ge: '测试性格',
      bei_jing_gu_shi: '测试背景',
      xi_hao: ['测试爱好'],
      yan_yu_feng_ge: '测试言语风格',
      tou_xiang: 'emoji',
      biao_qian: ['测试标签'],
      yu_she_lei_xing: 'ISTJ',
      mbti_lei_xing: 'ISTJ',
      ie_lei_xing: 'I',
      re_shen_lei_xing: 'slow',
      shi_fou_zha_xing: false,
      wei_xin_ming: '测试微信昵称',
      zhen_shi_ming: '测试名字',
    })
    vi.mocked(queRenJiaoSe).mockResolvedValue({ jiao_se_id: 'jiao-se-1' })

    await wrapper.find('.kaiShiLiaoTian').trigger('click')
    await flushPromises()

    wrapper.unmount()

    const { wrapper: xinWrapper } = await 挂载组件({ 清空状态: false })

    expect(xinWrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou1BiaoTi'))
    expect(xinWrapper.text()).not.toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou3BiaoTi'))
  })

  it('步骤2未点确定退出后重新进入，恢复到步骤2并保留已选项', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤二(wrapper)

    const duiXiangKaPian = wrapper.findAll('.duiXiang-xingBie-kaPian')
    await duiXiangKaPian[1].trigger('click')
    await flushPromises()

    wrapper.unmount()

    const { wrapper: xinWrapper } = await 挂载组件({ 清空状态: false })

    expect(xinWrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou2BiaoTi'))
    const xinDuiXiangKaPian = xinWrapper.findAll('.duiXiang-xingBie-kaPian')
    expect(xinDuiXiangKaPian[1].classes()).toContain('beiXuanZhong')
  })

  it('步骤3未点确定退出后重新进入，恢复到步骤3并保留性格选择', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[3].trigger('click')
    await flushPromises()

    wrapper.unmount()

    const { wrapper: xinWrapper } = await 挂载组件({ 清空状态: false })

    expect(xinWrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou3BiaoTi'))
    const xinMbtiKaPian = xinWrapper.findAll('.mbti-kaPian')
    expect(xinMbtiKaPian[3].classes()).toContain('beiXuanZhong')
  })

  it('刷新页面后未完成的步骤和已选项仍然保持', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤二(wrapper)

    const duiXiangKaPian = wrapper.findAll('.duiXiang-xingBie-kaPian')
    await duiXiangKaPian[0].trigger('click')
    await flushPromises()

    wrapper.unmount()

    const { wrapper: xinWrapper } = await 挂载组件({ 清空状态: false })

    expect(xinWrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'buZhou2BiaoTi'))
    const xinDuiXiangKaPian = xinWrapper.findAll('.duiXiang-xingBie-kaPian')
    expect(xinDuiXiangKaPian[0].classes()).toContain('beiXuanZhong')
  })
})
