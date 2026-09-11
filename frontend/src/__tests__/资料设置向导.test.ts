import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 资料设置向导 from '@/views/资料设置向导.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { huoQuFanYi } from '@/config/translations'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
    const { wrapper, luYou } = await 挂载组件()
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

    // 新流程：向导页仅透传资料并立即跳转，不再本地调用生成接口
    expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')
    const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(linShi).toBeTruthy()
    const ziLiao = JSON.parse(linShi!)
    expect(ziLiao.yunXuZhaNanZhaNv).toBe(true)
    expect(ziLiao.xingGeXuanZe).toBe('ISTJ')
    expect(shengChengJiaoSe).not.toHaveBeenCalled()
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

    const kaiShiAnNiu = wrapper.find('.kaiShiLiaoTian')
    await kaiShiAnNiu.trigger('click')
    await flushPromises()

    // 立即跳转加载页，不等待任何网络请求
    expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')
    expect(luYou.currentRoute.value.query.jiaoSeId).toBeUndefined()
    // 向导页透传资料（非角色对象），由加载页发起生成
    const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(linShi).toBeTruthy()
    const ziLiao = JSON.parse(linShi!)
    expect(ziLiao.xingGeXuanZe).toBe('ISTJ')
    expect(ziLiao.yunXuZhaNanZhaNv).toBe(false)
    expect(shengChengJiaoSe).not.toHaveBeenCalled()
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

  it('心目中的TA：默认折叠，点击开关展开表单', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const biaoDan = wrapper.find('.xinmuzhong-ta-biaodan')
    expect(biaoDan.exists()).toBe(true)
    expect(biaoDan.isVisible()).toBe(false)

    await wrapper.find('.xinmuzhong-ta-kaiguan').trigger('click')
    await flushPromises()

    expect(wrapper.find('.xinmuzhong-ta-biaodan').isVisible()).toBe(true)
  })

  it('心目中的TA：填写的自定义信息随开始聊天透传到加载页', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)
    await wrapper.find('.xinmuzhong-ta-kaiguan').trigger('click')
    await flushPromises()

    const shuruKuang = wrapper.findAll('.xinmuzhong-shurukuang')
    // 顺序：微信名 / 真实姓名 / 年龄 / 通用提示词(textarea)
    expect(shuruKuang.length).toBe(4)
    await shuruKuang[0].setValue('柠檬味的风')
    await shuruKuang[1].setValue('林晚晚')
    await shuruKuang[2].setValue('21')
    await shuruKuang[3].setValue('开朗爱笑，喜欢看电影')

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[0].trigger('click')
    await flushPromises()

    await wrapper.find('.kaiShiLiaoTian').trigger('click')
    await flushPromises()

    const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(linShi).toBeTruthy()
    const ziLiao = JSON.parse(linShi!)
    expect(ziLiao.xinMuZhongDeTa).toEqual({
      weiXinMing: '柠檬味的风',
      zhenShiMing: '林晚晚',
      nianLing: '21',
      tongYongTiShiCi: '开朗爱笑，喜欢看电影',
    })
  })

  it('心目中的TA：仅填通用提示词也能透传', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)
    await wrapper.find('.xinmuzhong-ta-kaiguan').trigger('click')
    await flushPromises()

    const shuruKuang = wrapper.findAll('.xinmuzhong-shurukuang')
    await shuruKuang[3].setValue('喜欢打篮球的开朗同学')

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[0].trigger('click')
    await flushPromises()

    await wrapper.find('.kaiShiLiaoTian').trigger('click')
    await flushPromises()

    const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(linShi).toBeTruthy()
    const ziLiao = JSON.parse(linShi!)
    expect(ziLiao.xinMuZhongDeTa).toEqual({
      weiXinMing: '',
      zhenShiMing: '',
      nianLing: '',
      tongYongTiShiCi: '喜欢打篮球的开朗同学',
    })
  })

  it('心目中的TA：全部留空时透传值为null', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    const mbtiKaPian = wrapper.findAll('.mbti-kaPian')
    await mbtiKaPian[1].trigger('click')
    await flushPromises()

    await wrapper.find('.kaiShiLiaoTian').trigger('click')
    await flushPromises()

    const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(linShi).toBeTruthy()
    const ziLiao = JSON.parse(linShi!)
    expect(ziLiao.xinMuZhongDeTa).toBeNull()
  })

  it('心目中的TA：旧职业城市家乡身份字段已删，仅三框加提示词', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)
    await wrapper.find('.xinmuzhong-ta-kaiguan').trigger('click')
    await flushPromises()

    expect(wrapper.find('select.xinmuzhong-xuanze').exists()).toBe(false)
    expect(wrapper.find('.xinmuzhong-shuangLie').exists()).toBe(false)
    const wenBen = wrapper.text()
    expect(wenBen).not.toContain('职业')
    expect(wenBen).not.toContain('城市')
    expect(wenBen).not.toContain('家乡')
    expect(wenBen).not.toContain('身份')
    expect(wenBen).toContain(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongWeiXinMing'))
    expect(wenBen).toContain(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongZhenShiMing'))
    expect(wenBen).toContain(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLing'))
    expect(wenBen).toContain(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCi'))
    expect(wrapper.find('textarea.xinmuzhong-wenbenyu').exists()).toBe(true)
  })

  it('心目中的TA：年龄输入框选填越界自动归一到最近合法数字', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)
    await wrapper.find('.xinmuzhong-ta-kaiguan').trigger('click')
    await flushPromises()

    const nianLingKuang = wrapper.findAll('.xinmuzhong-shurukuang')[2]
    expect(nianLingKuang.attributes('type')).toBe('number')
    expect(nianLingKuang.attributes('step')).toBe('1')
    expect(nianLingKuang.attributes('placeholder')).toBe(
      huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLingZhanwei'),
    )
    await nianLingKuang.setValue('150')
    await nianLingKuang.trigger('blur')
    await flushPromises()
    expect((nianLingKuang.element as HTMLInputElement).value).toBe('100')
    await nianLingKuang.setValue('-5')
    await nianLingKuang.trigger('blur')
    await flushPromises()
    expect((nianLingKuang.element as HTMLInputElement).value).toBe('0')
  })

  it('心目中的TA：三框加提示词文案走翻译无硬编码', async () => {
    const xiangDaoYuanMa = readFileSync(resolve(__dirname, '../views/资料设置向导.vue'), 'utf8')
    for (const jian of [
      'xinMuZhongWeiXinMing',
      'xinMuZhongWeiXinMingZhanwei',
      'xinMuZhongZhenShiMing',
      'xinMuZhongZhenShiMingZhanwei',
      'xinMuZhongNianLing',
      'xinMuZhongNianLingZhanwei',
      'xinMuZhongTongYongTiShiCi',
      'xinMuZhongTongYongTiShiCiZhanwei',
      'xinMuZhongSuiJiXingGeTiShi',
      'xinMuZhongYiXuanJianGuTiShi',
      'taDaiTiNan',
      'taDaiTiNv',
    ] as const) {
      expect(xiangDaoYuanMa).toContain(`huoQuFanYi('ziLiaoSheZhi', '${jian}')`)
    }
    expect(xiangDaoYuanMa).not.toContain('xinMuZhongShenFen')
    expect(xiangDaoYuanMa).not.toContain('xinMuZhongZhiYe')
    expect(xiangDaoYuanMa).not.toContain('xinMuZhongChengShi')
    expect(xiangDaoYuanMa).not.toContain('xinMuZhongJiaXiang')
    expect(xiangDaoYuanMa).not.toContain("'他'")
    expect(xiangDaoYuanMa).not.toContain("'她'")
  })

  it('心目中的TA：随机性格与已选冲突提示走翻译渲染', async () => {
    const { wrapper } = await 挂载组件()
    await 进入步骤三(wrapper)

    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongSuiJiXingGeTiShi'))
    expect(wrapper.text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongYiXuanJianGuTiShi'))
  })

  it('心目中的TA：随机加通用提示词时选中最接近性格', async () => {
    const { wrapper, cangKu } = await 挂载组件()
    await 进入步骤三(wrapper)
    await wrapper.find('.xinmuzhong-ta-kaiguan').trigger('click')
    await flushPromises()

    const shuruKuang = wrapper.findAll('.xinmuzhong-shurukuang')
    await shuruKuang[3].setValue('热情开朗喜欢交朋友，脑洞大有想象力，温柔体贴爱笑，随性自由爱冒险')

    await wrapper.find('.suiJi-kaPian').trigger('click')
    await flushPromises()

    expect(cangKu.ziLiaoShuJu.xingGeXuanZe).toBe('ENFP')
  })

  it('心目中的TA：展开收起对比色走主题变量单源，深白浅黑无hover变色', async () => {
    const xiangDaoYuanMa = readFileSync(resolve(__dirname, '../views/资料设置向导.vue'), 'utf8')
    const bianLiangCss = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')

    expect(xiangDaoYuanMa).toContain('color: var(--xinmuzhong-duibi-se)')
    expect(xiangDaoYuanMa).toContain('background: var(--xinmuzhong-qukuai-beijing)')
    expect(xiangDaoYuanMa).toContain('border: 1px solid var(--xinmuzhong-qukuai-biankuang)')
    expect(bianLiangCss).toContain('--xinmuzhong-duibi-se:')
    expect(bianLiangCss).toMatch(/--xinmuzhong-duibi-se:\s*#ffffff/)
    expect(bianLiangCss).toMatch(/--xinmuzhong-duibi-se:\s*#191919/)
    expect(xiangDaoYuanMa).not.toMatch(
      /\.xinmuzhong-ta-kaiguan:hover\s+\.xinmuzhong-ta-zhuangtai\s*\{[^}]*filter:/,
    )
    expect(xiangDaoYuanMa).toMatch(
      /\.xinmuzhong-ta-kaiguan:hover\s+\.xinmuzhong-ta-zhuangtai\s*\{[^}]*transform:\s*translateX\(2px\)/,
    )
  })
})
