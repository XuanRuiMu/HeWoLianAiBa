import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { 用户 } from '@/types/类型定义'

const { moLuYou, fankuiApiJia } = vi.hoisted(() => {
  const luYouHanShu = {
    useRoute: vi.fn(),
    useRouter: vi.fn(),
    createWebHistory: vi.fn(() => ({})),
    createRouter: vi.fn(() => ({
      beforeEach: vi.fn(),
      onError: vi.fn(),
      push: vi.fn(async () => {}),
      replace: vi.fn(async () => {}),
    })),
    RouterLink: { name: 'RouterLink', render: () => null },
  }
  const jieKouJia = {
    tiJiaoFanKui: vi.fn(),
    huoQuWoDeFanKui: vi.fn(),
    huoQuFanKuiGuanLiLieBiao: vi.fn(),
    huoQuFanKuiTongJi: vi.fn(),
    gengXinFanKuiZhuangTai: vi.fn(),
  }
  return { moLuYou: luYouHanShu, fankuiApiJia: jieKouJia }
})

vi.mock('vue-router', () => moLuYou)
vi.mock('@/api/意见反馈', () => fankuiApiJia)

import 反馈弹窗 from '@/components/意见反馈/反馈弹窗.vue'
import { 使用反馈仓库 } from '@/stores/反馈'
import { 使用用户仓库 } from '@/stores/用户'

function jiaYongHu(): 用户 {
  return {
    id: 'u-1',
    shou_ji_hao: '13800000000',
    yong_hu_ming: 'ceshi',
    ni_cheng: '测试用户',
    mu_biao_xing_bie: null,
    mo_ren_xing_bie: null,
    xing_ge_xuan_ze: null,
    ren_she_biao_qian: null,
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    jiao_se: null,
    neng_li: [],
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: '',
    geng_xin_shi_jian: '',
  } as unknown as 用户
}

async function guaZaiTanChuang(routeName: string) {
  setActivePinia(createPinia())
  const tuiSong = vi.fn()
  moLuYou.useRoute.mockReturnValue({ name: routeName, fullPath: `/${routeName}` })
  moLuYou.useRouter.mockReturnValue({ push: tuiSong })
  const wrapper = mount(反馈弹窗, {
    global: {
      stubs: { teleport: true },
    },
    attachTo: document.body,
  })
  const 反馈仓库 = 使用反馈仓库()
  反馈仓库.daKaiTanChuang()
  await nextTick()
  await nextTick()
  return { wrapper, 反馈仓库, tuiSong }
}

beforeEach(() => {
  moLuYou.useRoute.mockReset()
  moLuYou.useRouter.mockReset()
  fankuiApiJia.tiJiaoFanKui.mockReset()
  fankuiApiJia.huoQuWoDeFanKui.mockReset()
  document.body.innerHTML = ''
})

describe('反馈弹窗', () => {
  it('未登录显示引导并锁定提交', async () => {
    const { wrapper } = await guaZaiTanChuang('zhuJieMian')
    expect(wrapper.find('[data-testid="fankui-weidenglu"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fankui-tab-tijiao"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="fankui-tijiao"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('聊天页分类集合包含AI聊天四分类', async () => {
    const { wrapper } = await guaZaiTanChuang('liaoTian')
    使用用户仓库().dangQianYongHu = jiaYongHu()
    await nextTick()
    const kaPian = wrapper.findAll('[data-testid^="fankui-fenlei-"]').map((ka) => ka.attributes('data-testid'))
    expect(kaPian).toContain('fankui-fenlei-aiLiaoTian')
    expect(kaPian).toContain('fankui-fenlei-biaoQingBao')
    expect(kaPian).toContain('fankui-fenlei-yuYin')
    expect(kaPian).toContain('fankui-fenlei-qiTa')
    expect(kaPian).not.toContain('fankui-fenlei-gongNengYiChang')
    wrapper.unmount()
  })

  it('非聊天页分类集合包含通用四分类', async () => {
    const { wrapper } = await guaZaiTanChuang('zhuJieMian')
    使用用户仓库().dangQianYongHu = jiaYongHu()
    await nextTick()
    const kaPian = wrapper.findAll('[data-testid^="fankui-fenlei-"]').map((ka) => ka.attributes('data-testid'))
    expect(kaPian).toContain('fankui-fenlei-gongNengYiChang')
    expect(kaPian).toContain('fankui-fenlei-jieMianXianShi')
    expect(kaPian).toContain('fankui-fenlei-tiYanJianYi')
    expect(kaPian).toContain('fankui-fenlei-qiTa')
    expect(kaPian).not.toContain('fankui-fenlei-aiLiaoTian')
    wrapper.unmount()
  })

  it('正文不足10字禁止进入确认并提示', async () => {
    const { wrapper } = await guaZaiTanChuang('zhuJieMian')
    使用用户仓库().dangQianYongHu = jiaYongHu()
    await nextTick()
    await wrapper.find('[data-testid="fankui-fenlei-qiTa"]').trigger('click')
    await wrapper.find('[data-testid="fankui-buzou-xiayibu"]').trigger('click')
    const zhengWen = wrapper.find('[data-testid="fankui-zhengwen"]')
    expect(zhengWen.exists()).toBe(true)
    await zhengWen.setValue('太短了')
    expect(wrapper.find('[data-testid="fankui-buzou-queren"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="fankui-zhengwen-cuowu"]').exists()).toBe(true)
    await zhengWen.setValue('这一段正文已经超过十个字了，可以提交')
    expect(wrapper.find('[data-testid="fankui-buzou-queren"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('tab切换到我的反馈并加载数据', async () => {
    const { wrapper } = await guaZaiTanChuang('zhuJieMian')
    使用用户仓库().dangQianYongHu = jiaYongHu()
    await nextTick()
    fankuiApiJia.huoQuWoDeFanKui.mockResolvedValue({ lie_biao: [], hai_you_geng_duo: false })
    await wrapper.find('[data-testid="fankui-tab-wode"]').trigger('click')
    await flushPromises()
    expect(fankuiApiJia.huoQuWoDeFanKui).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="fankui-wode-liebiao"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('提交成功后清空附件并展示编号', async () => {
    const { wrapper, 反馈仓库 } = await guaZaiTanChuang('liaoTian')
    使用用户仓库().dangQianYongHu = jiaYongHu()
    反馈仓库.tianJiaFuJian({
      id: 'm-1',
      ke_hu_duan_id: 'k-1',
      nei_rong: '要附上的消息内容',
      lei_xing: 'wenben',
      fa_song_zhe_lei_xing: 'yonghu',
      shi_jian_chuo: Date.now(),
    })
    await nextTick()
    await wrapper.find('[data-testid="fankui-fenlei-aiLiaoTian"]').trigger('click')
    await wrapper.find('[data-testid="fankui-buzou-xiayibu"]').trigger('click')
    await wrapper.find('[data-testid="fankui-zhengwen"]').setValue('这条反馈的正文内容足够长，超过十个字')
    await wrapper.find('[data-testid="fankui-buzou-queren"]').trigger('click')
    fankuiApiJia.tiJiaoFanKui.mockResolvedValue({ id: 'abcd1234-5678' })
    await wrapper.find('[data-testid="fankui-tijiao"]').trigger('click')
    await flushPromises()
    expect(fankuiApiJia.tiJiaoFanKui).toHaveBeenCalledTimes(1)
    const faChuCanShu = fankuiApiJia.tiJiaoFanKui.mock.calls[0][0]
    expect(faChuCanShu.fen_lei).toBe('aiLiaoTian')
    expect(faChuCanShu.xiao_xi_yin_yong).toHaveLength(1)
    expect(faChuCanShu.she_bei_xin_xi).toBeTruthy()
    expect(反馈仓库.fuJianXiaoXi).toHaveLength(0)
    expect(wrapper.find('[data-testid="fankui-chenggong"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="fankui-chenggong"]').text()).toContain('abcd1234')
    wrapper.unmount()
  })
})
