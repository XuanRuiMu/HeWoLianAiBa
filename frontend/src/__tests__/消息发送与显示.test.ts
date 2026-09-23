import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import 添加微信 from '@/views/添加微信.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuXiaoXi, faSongXiaoXi } from '@/api/聊天'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { duQuShuRuQuText, xieRuShuRuQu } from './输入区夹具'

const dangQianMuLu = dirname(fileURLToPath(import.meta.url))

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn(),
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
    jiao_se: {
      id: 'j1',
      ming_zi: '测试角色',
      wei_xin_ming: '小甜心',
      tou_xiang: 'https://example.com/avatar.png',
      xing_bie: 'nv',
      nian_ling: 22,
      wai_mao: '',
      xing_ge: '',
      bei_jing_gu_shi: '',
      xi_hao: [],
      yan_yu_feng_ge: '',
      biao_qian: [],
      re_du: 0,
      chuang_jian_shi_jian: new Date().toISOString(),
    },
    dang_an_zhuang_tai: null,
  }),
  chuangJianHuiHua: vi.fn().mockResolvedValue({
    id: 'h1',
    jiao_se_id: 'j1',
    yong_hu_id: 'u1',
    kai_shi_shi_jian: Date.now(),
    zui_hou_xiao_xi_shi_jian: Date.now(),
    wei_du_xiao_xi_shu: 0,
  }),
  faSongKaiChangBai: vi.fn().mockResolvedValue({ yi_fa_song: true, xiao_xi_shu: 1 }),
  huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
      { path: '/tian-jia-wei-xin', name: 'tianJiaWeiXin', component: 添加微信 },
    ],
  })
}

async function mountLiaoTianYeMian() {
  const luYou = chuangJianLuYou()
  await luYou.push('/chat/h1')
  const pinia = createPinia()
  setActivePinia(pinia)

  const 用户仓库 = 使用用户仓库()
  用户仓库.dangQianYongHu = {
    id: 'u1',
    shou_ji_hao: '13800138000',
    yong_hu_ming: '测试用户',
    ni_cheng: '测试昵称',
    xing_bie: 'male',
    mu_biao_xing_bie: 'female',
    xing_ge_xuan_ze: 'INTJ',
    ren_she_biao_qian: 'neiLianXueBa',
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
  用户仓库.令牌 = 'test-token'

  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.jiaoSeXinXi = {
    id: 'j1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    xing_bie: 'nv',
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
    chuang_jian_shi_jian: new Date().toISOString(),
  }

  const wrapper = mount(
    {
      components: { QuanJuCaiDan },
      template: '<div><QuanJuCaiDan /><router-view /></div>',
    },
    {
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    },
  )
  await flushPromises()
  return { wrapper, luYou, 聊天仓库 }
}

describe('FP-02 删除发送消息后转圈结束的左右跳动动画', () => {
  it('聊天页面样式表中不存在 xiaoxi-guodu-move 动画类', () => {
    const wenJianLuJing = resolve(dangQianMuLu, '../views/聊天页面.vue')
    const wenJianNeiRong = readFileSync(wenJianLuJing, 'utf-8')
    expect(wenJianNeiRong).not.toContain('xiaoxi-guodu-move')
  })

  it('保留正常的转圈动画 fasong-zhuangtai-zhuanquan 与 keyframes', () => {
    const wenJianLuJing = resolve(dangQianMuLu, '../views/聊天页面.vue')
    const wenJianNeiRong = readFileSync(wenJianLuJing, 'utf-8')
    expect(wenJianNeiRong).toContain('fasong-zhuangtai-zhuanquan')
    expect(wenJianNeiRong).toContain('@keyframes fasong-xuanzhuan')
  })

  it('保留消息进入动画 xiaoxi-guodu-enter（不误删正常动画）', () => {
    const wenJianLuJing = resolve(dangQianMuLu, '../views/聊天页面.vue')
    const wenJianNeiRong = readFileSync(wenJianLuJing, 'utf-8')
    expect(wenJianNeiRong).toContain('xiaoxi-guodu-enter-active')
    expect(wenJianNeiRong).toContain('xiaoxi-guodu-enter-from')
  })
})

describe('FP-06 消息发送与显示', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(faSongXiaoXi).mockReset()
    vi.mocked(huoQuXiaoXi).mockReset()
    vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('乐观更新', () => {
    it('发送消息立即出现在消息列表，不等API响应', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      let jieXiCuoWu: (value: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockImplementation(
        () =>
          new Promise((resolve) => {
            jieXiCuoWu = resolve
          }),
      )

      await xieRuShuRuQu(wrapper, '你好')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      const xiaoXiLieBiao = wrapper.findAll('.qipao-neirong')
      expect(xiaoXiLieBiao.length).toBeGreaterThan(0)
      expect(xiaoXiLieBiao[xiaoXiLieBiao.length - 1].text()).toContain('你好')
      expect(聊天仓库.xiaoXiLieBiao.some((x) => x.nei_rong === '你好')).toBe(true)

      jieXiCuoWu({
        xiaoXi: {
          id: 'x-real',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '你好',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
        shiMiJi: false,
      })
      await flushPromises()
    })

    it('点击发送后输入栏立即清空', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))

      await xieRuShuRuQu(wrapper, '立即清空测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(duQuShuRuQuText(wrapper)).toBe('')
    })

    it('发送中的临时消息显示发送动画标记', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))

      await xieRuShuRuQu(wrapper, '动画测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      const xiaoXiLieBiao = wrapper.findAll('.xiaoxi-xiangmu.yonghu-xiaoxi')
      expect(xiaoXiLieBiao.length).toBeGreaterThan(0)
      const zuiHouXiaoXi = xiaoXiLieBiao[xiaoXiLieBiao.length - 1]
      expect(zuiHouXiaoXi.find('.fasong-zhuangtai-zhuanquan').exists()).toBe(true)
      expect(zuiHouXiaoXi.find('.fasong-zhuangtai').attributes('aria-label')).toBe(
        huoQuFanYi('liaoTian', 'faSongZhong'),
      )
    })

    it('发送中转圈位于气泡外部左侧，不覆盖文字', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))

      await xieRuShuRuQu(wrapper, '位置测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      const qipao = wrapper.find('.qipao-neirong')
      expect(qipao.find('.fasong-zhuangtai-zhuanquan').exists()).toBe(false)
      const xiaoXiXiangMu = wrapper.find('.xiaoxi-xiangmu.yonghu-xiaoxi')
      const zhuangTai = xiaoXiXiangMu.find('.fasong-zhuangtai')
      expect(zhuangTai.exists()).toBe(true)
      expect(zhuangTai.find('.qipao-neirong').exists()).toBe(false)

      const xiangMuElement = xiaoXiXiangMu.element as HTMLElement
      const qipaoIndex = Array.from(xiangMuElement.children).findIndex((el) =>
        el.classList.contains('qipao-waike'),
      )
      const zhuangTaiIndex = Array.from(xiangMuElement.children).findIndex((el) =>
        el.classList.contains('fasong-zhuangtai'),
      )
      expect(zhuangTaiIndex).toBeGreaterThan(qipaoIndex)
    })

    it('后端确认后消息使用相同客户端键，无二次渲染跳动', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      let jieXiCuoWu: (value: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockImplementation(
        () =>
          new Promise((resolve) => {
            jieXiCuoWu = resolve
          }),
      )

      await xieRuShuRuQu(wrapper, '稳定键测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      const linShiXiaoXi = 聊天仓库.xiaoXiLieBiao.find((x) => x.nei_rong === '稳定键测试')
      expect(linShiXiaoXi).toBeDefined()
      expect(linShiXiaoXi?.ke_hu_duan_id).toBeTruthy()
      const linShiId = linShiXiaoXi!.ke_hu_duan_id

      jieXiCuoWu({
        xiaoXi: {
          id: 'x-real-stable',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '稳定键测试',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
        shiMiJi: false,
      })
      await flushPromises()

      const queRenXiaoXi = 聊天仓库.xiaoXiLieBiao.find((x) => x.id === 'x-real-stable')
      expect(queRenXiaoXi).toBeDefined()
      expect(queRenXiaoXi?.ke_hu_duan_id).toBe(linShiId)
      expect(queRenXiaoXi?.fa_song_zhong).toBeFalsy()
      expect(wrapper.find('.fasong-zhuangtai').exists()).toBe(false)
    })

    it('发送whosyourdaddy秘籍时不触发AI发送消息事件', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const faSongMock = vi.fn()
      if (聊天仓库.socketLianJie) {
        聊天仓库.socketLianJie.emit = faSongMock
      }

      vi.mocked(faSongXiaoXi).mockResolvedValue({
        xiaoXi: {
          id: 'x-miji',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: 'whosyourdaddy',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
        shiMiJi: true,
      })

      await xieRuShuRuQu(wrapper, 'whosyourdaddy')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(faSongMock).not.toHaveBeenCalledWith('发送消息')
    })

    it('API发送失败时气泡保留原位并显示红色感叹号角标且显示错误提示', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockRejectedValue(new Error(huoQuFanYi('liaoTian', 'faSongShiBai')))

      await xieRuShuRuQu(wrapper, '失败测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(聊天仓库.xiaoXiLieBiao.some((x) => x.nei_rong === '失败测试')).toBe(true)
      const shiBaiXiaoXi = wrapper.findAll('.xiaoxi-xiangmu.yonghu-xiaoxi')
      expect(shiBaiXiaoXi.length).toBeGreaterThan(0)
      expect(shiBaiXiaoXi[shiBaiXiaoXi.length - 1].find('.fasong-shibai-jiaobiao').exists()).toBe(
        true,
      )
      expect(聊天仓库.cuoWuXinXi).toBeTruthy()
      expect(wrapper.find('.tishi-dai-cuowu').exists()).toBe(true)
    })
  })

  describe('输入验证', () => {
    // FP-10c 契约演进：载体从 <textarea maxlength> 换成 <div contenteditable>，浏览器不再有可声明的
    // maxlength 属性，长度上限改由 beforeinput 拦截（FP10c③ 已在组件级证明「再插就超才拦、组合输入不拦」）。
    // 这里按页面级等价且更严的口径判定：① 页面确实把配置里的上限传给了唯一实现（不是组件内写死）；
    // ② 超限的那次插入在 DOM 落地前就被 preventDefault ⇒ 用户根本打不进第 501 个字符。
    it('长度上限由页面把配置注入唯一实现并在插入前拦截', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const cao = wrapper.find('.shuru-kuang')
      expect(cao.attributes('contenteditable')).toBe('true')
      expect(wrapper.findComponent(TuWenShuRuQu).props('zuiDaChangDu')).toBe(
        XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
      )
      const chaoChang = new Event('beforeinput', { bubbles: true, cancelable: true }) as Event & {
        inputType: string
        data: string
      }
      chaoChang.inputType = 'insertText'
      chaoChang.data = 'a'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu + 1)
      cao.element.dispatchEvent(chaoChang)
      expect(chaoChang.defaultPrevented, '超限的纯文本插入没被拦 = maxlength 契约丢了').toBe(true)
    })

    it('输入超过500字符后发送按钮禁用', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu + 1)
      await xieRuShuRuQu(wrapper, changNeiRong)
      await flushPromises()

      const faSongAnNiu = wrapper.find('.fasong-anniu')
      expect(faSongAnNiu.attributes('disabled')).toBeDefined()
    })

    it('字符计数在达到阈值后显示当前长度/最大长度', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)
      await xieRuShuRuQu(wrapper, changNeiRong)
      await flushPromises()

      expect(wrapper.find('.zifu-jishu').text()).toBe(
        `${XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi}/${XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu}`,
      )
    })

    it('store直接发送超过500字符的消息返回null并设置错误', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.dangQianHuiHuaId = 'h1'

      const jieGuo = await 聊天仓库.faSongXiaoXi('a'.repeat(501))
      expect(jieGuo).toBeNull()
      expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    })
  })

  describe('时间显示与分组', () => {
    it('消息时间显示为 HH:MM 24小时制', async () => {
      vi.setSystemTime(new Date('2026-07-08T14:05:00+08:00'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const jiDingShiJian = new Date('2026-07-07T14:05:00+08:00').getTime()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '测试',
          lei_xing: 'wenben',
          shi_jian_chuo: jiDingShiJian,
          yi_du: true,
        },
      ]
      await flushPromises()

      const shiJianBiaoQian = wrapper.find('.shijian-biaoqian')
      expect(shiJianBiaoQian.text()).toMatch(/^(昨天 )?\d{2}:\d{2}$/)
      expect(shiJianBiaoQian.text()).toContain('14:05')
    })

    it('消息配置合并阈值为1分钟', () => {
      expect(XIAO_XI_PEI_ZHI.heBingShiJianYuZhi).toBe(60 * 1000)
    })

    it('同一分钟内的两条消息合并为同一时间分组', async () => {
      vi.setSystemTime(new Date('2026-07-08T14:05:00+08:00'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const jiChuShiJian = new Date('2026-07-07T14:05:00+08:00').getTime()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息一',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian,
          yi_du: true,
        },
        {
          id: 'x2',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息二',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian + 59 * 1000,
          yi_du: true,
        },
      ]
      await flushPromises()

      const shiJianBiaoQian = wrapper.findAll('.shijian-biaoqian')
      expect(shiJianBiaoQian.length).toBe(1)
      expect(shiJianBiaoQian[0].text()).toBe('昨天 14:05')

      const xiaoXiNeiRong = wrapper.findAll('.qipao-neirong')
      const quChuBiaoJi = xiaoXiNeiRong.filter(
        (x) => x.text() === '消息一' || x.text() === '消息二',
      )
      expect(quChuBiaoJi.length).toBe(2)
    })

    it('相隔超过1分钟的消息分为两个时间组', async () => {
      vi.setSystemTime(new Date('2026-07-08T14:06:00+08:00'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const jiChuShiJian = new Date('2026-07-07T14:05:00+08:00').getTime()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息一',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian,
          yi_du: true,
        },
        {
          id: 'x2',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息二',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian + 61 * 1000,
          yi_du: true,
        },
      ]
      await flushPromises()

      const shiJianBiaoQian = wrapper.findAll('.shijian-biaoqian')
      expect(shiJianBiaoQian.length).toBe(2)
    })
  })

  describe('历史消息与分页', () => {
    it('历史消息中正序排列，最早消息在列表最前', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.dangQianHuiHuaId = 'h1'
      const jiZhunShiJian = Date.now()
      vi.mocked(huoQuXiaoXi).mockResolvedValue({
        lie_biao: [
          {
            id: 'x2',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'u1',
            fa_song_zhe_lei_xing: 'yonghu',
            nei_rong: '第二条',
            lei_xing: 'wenben',
            shi_jian_chuo: jiZhunShiJian,
            yi_du: true,
          },
          {
            id: 'x1',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'j1',
            fa_song_zhe_lei_xing: 'jiaose',
            nei_rong: '第一条',
            lei_xing: 'wenben',
            shi_jian_chuo: jiZhunShiJian - 10000,
            yi_du: true,
          },
        ],
        zong_shu: 2,
      })

      await 聊天仓库.jiaZaiXiaoXi('h1')
      expect(聊天仓库.xiaoXiLieBiao.length).toBe(2)
      expect(聊天仓库.xiaoXiLieBiao[0].nei_rong).toBe('第一条')
      expect(聊天仓库.xiaoXiLieBiao[1].nei_rong).toBe('第二条')
    })

    it('撤回消息显示系统提示文本而非原始内容', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'j1',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'),
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          yi_che_hui: true,
          yuan_shi_nei_rong: '原始内容',
        },
      ]
      await flushPromises()

      expect(wrapper.text()).toContain(huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'))
      expect(wrapper.text()).not.toContain('原始内容')
    })

    it('store加载更多分页，第二页消息追加到列表前面', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.dangQianHuiHuaId = 'h1'

      vi.mocked(huoQuXiaoXi).mockResolvedValueOnce({
        lie_biao: [
          {
            id: 'x2',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'u1',
            fa_song_zhe_lei_xing: 'yonghu',
            nei_rong: '第二页',
            lei_xing: 'wenben',
            shi_jian_chuo: Date.now() - 20000,
            yi_du: true,
          },
        ],
        zong_shu: 2,
      })

      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '第一页',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
      ]
      聊天仓库.haiYouGengDuo = true
      聊天仓库.yeMa = 1

      await 聊天仓库.jiaZaiGengDuoXiaoXi()
      expect(聊天仓库.xiaoXiLieBiao.length).toBe(2)
      expect(聊天仓库.xiaoXiLieBiao[0].nei_rong).toBe('第二页')
      expect(聊天仓库.xiaoXiLieBiao[1].nei_rong).toBe('第一页')
    })

    it('页面存在加载更多按钮且点击触发分页加载', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      聊天仓库.haiYouGengDuo = true
      聊天仓库.jiaZaiGengDuoZhong = false
      await flushPromises()

      const jiaZaiAnNiu = wrapper.find('.jiazaigengduo-anniu')
      expect(jiaZaiAnNiu.exists()).toBe(true)
      expect(jiaZaiAnNiu.text()).toBe(huoQuFanYi('liaoTian', 'jiaZaiGengDuo'))
    })
  })
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('FP-09b 投递幂等键与气泡对齐（点击发送真实链路）', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(faSongXiaoXi).mockReset()
    vi.mocked(huoQuXiaoXi).mockReset()
    vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('点一次发送即上报一把 UUID 幂等键，且不再上报前端自增序号', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    let 派发时的键: string | null | undefined
    let 派发时的序号: unknown
    vi.mocked(faSongXiaoXi).mockImplementation(async ({ miDengJian }) => {
      派发时的键 = miDengJian
      派发时的序号 = 聊天仓库.xiaoXiLieBiao[0].ke_hu_duan_xu_hao
      return {
        xiaoXi: {
          id: 'luo-ku-1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '幂等键这句话',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          mi_deng_jian: miDengJian ?? null,
          ke_hu_duan_xu_hao: 88,
        },
        shiMiJi: false,
      }
    })

    await xieRuShuRuQu(wrapper, '幂等键这句话')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect(派发时的键).toMatch(UUID)
    // 序号是服务端回显值：本地乐观态从来没有自增序号
    expect(派发时的序号).toBeUndefined()
    const 落库那条 = 聊天仓库.xiaoXiLieBiao.find((m) => m.id === 'luo-ku-1')
    expect(落库那条?.mi_deng_jian).toBe(派发时的键)
    expect(落库那条?.ke_hu_duan_xu_hao).toBe(88)
    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.nei_rong === '幂等键这句话')).toHaveLength(1)
  })

  it('旧后端不回显幂等键/序号时照常对齐气泡且不崩', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: {
        id: 'jiu-hou-duan-xing',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '旧响应',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: true,
      },
      shiMiJi: false,
    })

    await xieRuShuRuQu(wrapper, '旧响应')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao[0].id).toBe('jiu-hou-duan-xing')
    expect(聊天仓库.xiaoXiLieBiao[0].fa_song_zhong).toBeFalsy()
    // 前端把本体上的键补回落库行，后续快照/重发仍按同一把键判重
    expect(聊天仓库.xiaoXiLieBiao[0].mi_deng_jian).toMatch(UUID)
    expect(wrapper.findAll('.fasong-shibai-jiaobiao')).toHaveLength(0)
  })

  it('角色消息插队时用户气泡仍在原位，列表顺序等于「用户气泡 → 角色回复」', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    let 解析发送: (值: unknown) => void = () => {}
    vi.mocked(faSongXiaoXi).mockImplementation(
      () =>
        new Promise((解决) => {
          解析发送 = 解决 as (值: unknown) => void
        }),
    )

    await xieRuShuRuQu(wrapper, '我插进去的话')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.nei_rong)).toEqual(['我插进去的话'])

    解析发送({
      xiaoXi: {
        id: 'jiaose-xian-luo-ku',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'j1',
        fa_song_zhe_lei_xing: 'jiaose',
        nei_rong: 'AI 抢先落库的回复',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: false,
      },
      shiMiJi: false,
    })
    await flushPromises()

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.nei_rong)).toEqual([
      '我插进去的话',
      'AI 抢先落库的回复',
    ])
    expect(聊天仓库.xiaoXiLieBiao[0].fa_song_zhe_lei_xing).toBe('yonghu')
    const 气泡 = wrapper.findAll('.xiaoxi-xiangmu.yonghu-xiaoxi')
    expect(气泡[气泡.length - 1].text()).toContain('我插进去的话')
  })
})
