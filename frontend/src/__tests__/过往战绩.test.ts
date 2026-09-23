import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import { 解析几何数值 } from './主题令牌真源'
import { 读取全局基线 } from './CSS级联真源'
import type { DangAnXiangQing } from '@/types'

// 忠实 stub：持有 modelValue 并渲染 slot，使父组件 v-for 真实落 DOM，
// 供 onTuoZhuaiJieShu 按真实落点顺序读取。拖拽由测试以 $emit 模拟。
vi.mock('vue-draggable-plus', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    VueDraggable: vue.defineComponent({
      name: 'VueDraggable',
      props: { modelValue: { type: Array, default: () => [] }, disabled: { type: Boolean } },
      emits: ['update:modelValue', 'end'],
      setup(_props, { slots }) {
        return () =>
          vue.h('div', { class: 'vue-draggable-stub' }, slots.default ? slots.default() : [])
      },
    }),
  }
})

const guoWangZhanJiYuanMa = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')

vi.mock('@/api/聊天')

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:jiaoSeId', name: 'liaoTian', component: { template: '<div>聊天</div>' } },
      { path: '/战绩', name: 'zhanJi', component: { template: '<div>战绩</div>' } },
    ],
  })
}

function chuangJianDangAnLieBiao(): DangAnXiangQing[] {
  return [
    {
      id: 'dang-an-1',
      jiao_se_id: 'jiao-se-1',
      jiao_se_ming_zi: '小甜心',
      shi_fou_zha_xing: false,
      jie_guo_lei_xing: '胜利-爱情',
      jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
      shi_fou_feng_cun: true,
      liao_tian_tian_shu: 5,
      xiao_xi_zong_shu: 20,
      fu_pan_shu_ju: null,
      fu_pan_nei_rong: null,
      chuang_jian_shi_jian: '2026-07-07T10:00:00.000Z',
      zui_hou_xiao_xi_shi_jian: '2026-07-07T10:30:00.000Z',
      you_xi_jie_shu_shi_jian: '2026-07-07T10:35:00.000Z',
      mbti_lei_xing: 'INFP',
    },
    {
      id: 'dang-an-2',
      jiao_se_id: 'jiao-se-2',
      jiao_se_ming_zi: '高冷姐',
      shi_fou_zha_xing: true,
      jie_guo_lei_xing: '失败-被诈型欺骗',
      jie_guo_lei_xing_yuan: 'shi_bai_bei_zha_xing_qi_pian',
      shi_fou_feng_cun: true,
      liao_tian_tian_shu: 3,
      xiao_xi_zong_shu: 12,
      fu_pan_shu_ju: null,
      fu_pan_nei_rong: null,
      chuang_jian_shi_jian: '2026-07-07T09:00:00.000Z',
      zui_hou_xiao_xi_shi_jian: '2026-07-07T09:20:00.000Z',
      you_xi_jie_shu_shi_jian: '2026-07-07T09:25:00.000Z',
      mbti_lei_xing: 'INTJ',
    },
    {
      id: 'dang-an-3',
      jiao_se_id: 'jiao-se-3',
      jiao_se_ming_zi: '继续聊',
      shi_fou_zha_xing: false,
      jie_guo_lei_xing: '',
      jie_guo_lei_xing_yuan: 'jinxing_zhong',
      shi_fou_feng_cun: false,
      liao_tian_tian_shu: 1,
      xiao_xi_zong_shu: 5,
      fu_pan_shu_ju: null,
      fu_pan_nei_rong: null,
      chuang_jian_shi_jian: '2026-07-07T08:00:00.000Z',
      zui_hou_xiao_xi_shi_jian: '2026-07-07T08:10:00.000Z',
      you_xi_jie_shu_shi_jian: null,
      mbti_lei_xing: 'ENFP',
    },
  ]
}

async function mountZuJian() {
  const luYou = chuangJianLuYou()
  await luYou.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(过往战绩, {
    global: {
      plugins: [pinia, luYou],
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, luYou }
}

describe('FP-13 过往战绩与复盘前端', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.querySelectorAll('.fupan-zhezhao').forEach((el) => el.remove())
    localStorage.clear()
  })

  describe('战绩列表', () => {
    it('加载状态显示翻译文本', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockImplementation(() => new Promise(() => {}))

      const { wrapper } = await mountZuJian()
      // ⏳ 是视图装饰图标（外部重设计加入），完整渲染串仍逐字钉住：装饰改动即红灯
      expect(wrapper.find('.jiazai-zhuangtai').text()).toBe(
        `⏳${huoQuFanYi('zhanJi', 'jiaZaiZhong')}`,
      )
    })

    it('无战绩时显示空状态翻译文本', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue([])

      const { wrapper } = await mountZuJian()
      expect(wrapper.find('.kong-zhuangtai').text()).toBe(
        `🕊${huoQuFanYi('zhanJi', 'zanWuZhanJi')}`,
      )
    })

    it('空态与加载态的装饰图标对辅助技术隐藏（aria-hidden）', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')

      vi.mocked(huoQuDangAnLieBiao).mockImplementation(() => new Promise(() => {}))
      const jiaZaiRongQi = (await mountZuJian()).wrapper.find('.jiazai-zhuangtai')

      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue([])
      const kongRongQi = (await mountZuJian()).wrapper.find('.kong-zhuangtai')

      // 装饰图标只许挂在 .kong-tubiao 上，且恒带 aria-hidden，读屏不得把它念进文案
      for (const rongQi of [jiaZaiRongQi, kongRongQi]) {
        expect(rongQi.exists()).toBe(true)
        const tuBiao = rongQi.find('.kong-tubiao')
        expect(tuBiao.exists(), '装饰图标必须走 .kong-tubiao 类').toBe(true)
        expect(tuBiao.attributes('aria-hidden'), '装饰图标必须 aria-hidden="true"').toBe('true')
      }
      // 模板里每一处 kong-tubiao 都必须自带 aria-hidden（新增第三处忘了标即红灯）
      const tuBiaoDingYi = guoWangZhanJiYuanMa.match(/<[^>]*class="kong-tubiao"[^>]*>/g) || []
      expect(tuBiaoDingYi.length).toBeGreaterThanOrEqual(2)
      for (const dingYi of tuBiaoDingYi) expect(dingYi).toContain('aria-hidden="true"')
    })

    it('装饰图标不得混进翻译文案（图标是视图装饰，i18n 源保持纯文本）', async () => {
      const BIAO_QING_FAN_WEI =
        /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u
      const fanYiYuanMa = readFileSync(resolve(__dirname, '../config/translations.ts'), 'utf8')
      const zhanJiDuan = fanYiYuanMa.match(/\n {2}zhanJi: \{[\s\S]*?\n {2}\}/)
      expect(zhanJiDuan, 'translations.ts 缺 zhanJi 段').toBeTruthy()
      for (const xing of zhanJiDuan![0].split('\n')) {
        expect(BIAO_QING_FAN_WEI.test(xing), `翻译文案含装饰图标：${xing.trim()}`).toBe(false)
      }
      // 运行期口径同一遍：界面取到的文案本身零 emoji，图标只可能来自视图
      expect(BIAO_QING_FAN_WEI.test(huoQuFanYi('zhanJi', 'jiaZaiZhong'))).toBe(false)
      expect(BIAO_QING_FAN_WEI.test(huoQuFanYi('zhanJi', 'zanWuZhanJi'))).toBe(false)
    })

    it('按结果类型分为进行中、已胜利、已失败三类', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const biaoTiLieBiao = wrapper.findAll('.zhanji-fenlei-biaoti')
      expect(biaoTiLieBiao.length).toBe(3)
      expect(biaoTiLieBiao[0].text()).toContain(huoQuFanYi('zhanJi', 'fenLeiJinXingZhong'))
      expect(biaoTiLieBiao[1].text()).toContain(huoQuFanYi('zhanJi', 'fenLeiShengLi'))
      expect(biaoTiLieBiao[2].text()).toContain(huoQuFanYi('zhanJi', 'fenLeiShiBai'))
    })

    it('每类内显示对应战绩卡片', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const fenLeiZu = wrapper.findAll('.zhanji-fenlei-zu')
      expect(fenLeiZu[0].findAll('.zhanji-kapian').length).toBe(1)
      expect(fenLeiZu[0].text()).toContain('继续聊')
      expect(fenLeiZu[1].findAll('.zhanji-kapian').length).toBe(1)
      expect(fenLeiZu[1].text()).toContain('小甜心')
      expect(fenLeiZu[2].findAll('.zhanji-kapian').length).toBe(1)
      expect(fenLeiZu[2].text()).toContain('高冷姐')
    })

    it('渲染战绩列表并显示角色名字、MBTI、聊天天数、游戏结束时间（已结束）/最后消息时间（进行中），不显示好感度总分', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const lieBiao = wrapper.findAll('.zhanji-kapian')
      expect(lieBiao.length).toBe(3)
      expect(lieBiao[0].text()).toContain('继续聊')
      expect(lieBiao[0].text()).toContain('ENFP')
      expect(lieBiao[0].text()).toContain('1')
      expect(lieBiao[0].text()).toContain(huoQuFanYi('zhanJi', 'zuiHouXiaoXiShiJian'))
      expect(lieBiao[1].text()).toContain('小甜心')
      expect(lieBiao[1].text()).toContain('INFP')
      expect(lieBiao[1].text()).toContain('5')
      expect(lieBiao[1].text()).not.toContain('850')
      expect(lieBiao[1].text()).toContain(huoQuFanYi('zhanJi', 'youXiJieShuShiJian'))
      expect(lieBiao[1].text()).toContain('07/07 18:35')
    })

    it('进行中游戏显示继续按钮，已结束游戏显示复盘按钮和删除按钮', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const anNiuLieBiao = wrapper.findAll('.caozuo-anniu')
      const wenBenLieBiao = anNiuLieBiao.map((x) => x.text())
      expect(wenBenLieBiao).toContain(huoQuFanYi('zhanJi', 'jiXu'))
      expect(wenBenLieBiao).toContain(huoQuFanYi('zhanJi', 'fuPan'))
      expect(wenBenLieBiao).toContain(huoQuFanYi('zhanJi', 'shanChu'))
    })

    it('状态文本全部来自翻译文件', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).toContain(huoQuFanYi('zhanJi', 'zhuangTaiShengLi'))
      expect(quanBuWenBen).toContain(huoQuFanYi('zhanJi', 'zhuangTaiShiBai'))
      expect(quanBuWenBen).toContain(huoQuFanYi('zhanJi', 'zhuangTaiJinXingZhong'))
    })

    it('点击继续按钮跳转到聊天页面', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper, luYou } = await mountZuJian()
      const jiXuAnNiu = wrapper.findAll('.caozuo-anniu.jixu').at(0)
      expect(jiXuAnNiu).toBeDefined()
      await jiXuAnNiu!.trigger('click')
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe('/chat/jiao-se-3')
    })

    it('点击删除按钮并确认后从列表移除该记录', async () => {
      const { huoQuDangAnLieBiao, shanChuDangAn } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(shanChuDangAn).mockResolvedValue({ cheng_gong: true })
      vi.stubGlobal('confirm', () => true)

      const { wrapper } = await mountZuJian()
      const shanChuAnNiuLieBiao = wrapper.findAll('.caozuo-anniu.shanchu')
      expect(shanChuAnNiuLieBiao.length).toBe(3)
      await shanChuAnNiuLieBiao[0].trigger('click')
      await flushPromises()

      expect(shanChuDangAn).toHaveBeenCalledWith('dang-an-3')
      expect(wrapper.findAll('.zhanji-kapian').length).toBe(2)
      expect(wrapper.text()).not.toContain('继续聊')
    })

    it('删除时用户取消确认则不调用删除接口', async () => {
      const { huoQuDangAnLieBiao, shanChuDangAn } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(shanChuDangAn).mockResolvedValue({ cheng_gong: true })
      vi.stubGlobal('confirm', () => false)

      const { wrapper } = await mountZuJian()
      const shanChuAnNiuLieBiao = wrapper.findAll('.caozuo-anniu.shanchu')
      await shanChuAnNiuLieBiao[0].trigger('click')
      await flushPromises()

      expect(shanChuDangAn).not.toHaveBeenCalled()
      expect(wrapper.findAll('.zhanji-kapian').length).toBe(3)
    })

    it('可通过自定义勾选按钮多选战绩', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuan.length).toBe(3)

      await gouXuan[0].trigger('click')
      await gouXuan[1].trigger('click')
      await flushPromises()

      const gongJuLan = wrapper.find('.piliang-gongju-lan')
      expect(gongJuLan.exists()).toBe(true)
      expect(gongJuLan.text()).toContain('2')
      expect(gongJuLan.text()).toContain(huoQuFanYi('zhanJi', 'piLiangShanChu'))
    })

    it('批量删除按钮触发二次确认并调用批量删除接口', async () => {
      const { huoQuDangAnLieBiao, piLiangShanChuDangAn } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(piLiangShanChuDangAn).mockResolvedValue({
        cheng_gong: true,
        shan_chu_ids: ['dang-an-1', 'dang-an-2'],
      })
      vi.stubGlobal('confirm', () => true)

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      await gouXuan[0].trigger('click')
      await gouXuan[1].trigger('click')
      await flushPromises()

      await wrapper.find('.piliang-shanchu-anniu').trigger('click')
      await flushPromises()

      expect(piLiangShanChuDangAn).toHaveBeenCalledWith(['dang-an-3', 'dang-an-1'])
      expect(wrapper.findAll('.zhanji-kapian').length).toBe(1)
      expect(wrapper.text()).not.toContain('小甜心')
      expect(wrapper.text()).not.toContain('高冷姐')
    })

    it('批量删除取消确认后不调用接口', async () => {
      const { huoQuDangAnLieBiao, piLiangShanChuDangAn } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(piLiangShanChuDangAn).mockResolvedValue({
        cheng_gong: true,
        shan_chu_ids: [],
      })
      vi.stubGlobal('confirm', () => false)

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      await gouXuan[0].trigger('click')
      await gouXuan[1].trigger('click')
      await flushPromises()

      await wrapper.find('.piliang-shanchu-anniu').trigger('click')
      await flushPromises()

      expect(piLiangShanChuDangAn).not.toHaveBeenCalled()
      expect(wrapper.findAll('.zhanji-kapian').length).toBe(3)
    })

    it('FP-05 未选中任何记录时常驻显示批量工具栏（取消全选/批量删除 disabled）', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gongJuLan = wrapper.find('.piliang-gongju-lan')
      expect(gongJuLan.exists()).toBe(true)
      expect(gongJuLan.text()).toContain('0')

      const quanXuanAnNiu = wrapper.find('.quan-xuan-anniu')
      expect(quanXuanAnNiu.attributes('disabled')).toBeFalsy()

      const quXiaoAnNiu = wrapper.find('.quxiao-quanxuan-anniu')
      expect(quXiaoAnNiu.attributes('disabled')).toBeDefined()

      const piLiangAnNiu = wrapper.find('.piliang-shanchu-anniu')
      expect(piLiangAnNiu.attributes('disabled')).toBeDefined()
    })

    it('FP-05 选中任意记录后取消全选/批量删除按钮启用', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      await gouXuan[0].trigger('click')
      await flushPromises()

      const quXiaoAnNiu = wrapper.find('.quxiao-quanxuan-anniu')
      expect(quXiaoAnNiu.attributes('disabled')).toBeFalsy()

      const piLiangAnNiu = wrapper.find('.piliang-shanchu-anniu')
      expect(piLiangAnNiu.attributes('disabled')).toBeFalsy()

      const gongJuLan = wrapper.find('.piliang-gongju-lan')
      expect(gongJuLan.text()).toContain(huoQuFanYi('zhanJi', 'quanXuan'))
    })

    it('点击全选按钮选中当前所有战绩', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      await wrapper.find('.quan-xuan-anniu').trigger('click')
      await flushPromises()

      const xuanZhongKaPian = wrapper.findAll('.zhanji-kapian.xuanZhong')
      expect(xuanZhongKaPian.length).toBe(3)
      expect(wrapper.find('.xuan-ze-shu-liang').text()).toContain('3')
    })

    it('FP-05 全部选中后点击取消全选按钮清空选择', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      await wrapper.find('.quan-xuan-anniu').trigger('click')
      await flushPromises()
      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(3)

      const quXiaoAnNiu = wrapper.find('.quxiao-quanxuan-anniu')
      expect(quXiaoAnNiu.attributes('disabled')).toBeFalsy()
      await quXiaoAnNiu.trigger('click')
      await flushPromises()

      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(0)
      expect(wrapper.find('.xuan-ze-shu-liang').text()).toContain('0')
    })

    it('每个非空分类标题旁显示全选该分类按钮', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const fenLeiQuanXuanAnNiu = wrapper.findAll('.fenlei-quan-xuan-anniu')
      expect(fenLeiQuanXuanAnNiu.length).toBe(3)
      fenLeiQuanXuanAnNiu.forEach((anniu) => {
        expect(anniu.text()).toBe(huoQuFanYi('zhanJi', 'quanXuanGaiFenLei'))
      })
    })

    it('点击分类全选按钮只选中该分类下所有记录', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const fenLeiQuanXuanAnNiu = wrapper.findAll('.fenlei-quan-xuan-anniu')
      await fenLeiQuanXuanAnNiu[1].trigger('click')
      await flushPromises()

      const xuanZhongKaPian = wrapper.findAll('.zhanji-kapian.xuanZhong')
      expect(xuanZhongKaPian.length).toBe(1)
      expect(xuanZhongKaPian[0].text()).toContain('小甜心')
      expect(wrapper.find('.xuan-ze-shu-liang').text()).toContain('1')
    })

    it('分类已全部选中时点击分类全选按钮取消该分类选择', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const fenLeiQuanXuanAnNiu = wrapper.findAll('.fenlei-quan-xuan-anniu')
      await fenLeiQuanXuanAnNiu[1].trigger('click')
      await flushPromises()

      await fenLeiQuanXuanAnNiu[1].trigger('click')
      await flushPromises()

      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(0)
    })

    it('拖拽排序后持久化到 localStorage 并在重新加载时恢复', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      const lieBiao = chuangJianDangAnLieBiao()
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(lieBiao)

      const { wrapper } = await mountZuJian()
      const shengLiZu = wrapper.findAll('.zhanji-fenlei-zu')[1]
      const kaPian = shengLiZu.findAll('.zhanji-kapian')
      expect(kaPian.length).toBe(1)

      localStorage.setItem(
        'zhanJiPaiXu',
        JSON.stringify({
          jinxingzhong: [],
          shengli: ['dang-an-1'],
          shibai: [],
        }),
      )

      await wrapper.vm.$forceUpdate()
      await flushPromises()

      expect(localStorage.getItem('zhanJiPaiXu')).toContain('dang-an-1')
    })

    it('FP-05 拖拽排序后顺序持久化（mock vDraggable onEnd 回调）', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      const lieBiao: DangAnXiangQing[] = [
        {
          id: 'jinzhi-1',
          jiao_se_id: 'jiao-se-a',
          jiao_se_ming_zi: '进行中A',
          shi_fou_zha_xing: false,
          jie_guo_lei_xing: '',
          jie_guo_lei_xing_yuan: 'jinxing_zhong',
          shi_fou_feng_cun: false,
          liao_tian_tian_shu: 1,
          xiao_xi_zong_shu: 1,
          fu_pan_shu_ju: null,
          fu_pan_nei_rong: null,
          chuang_jian_shi_jian: '2026-07-07T08:00:00.000Z',
          zui_hou_xiao_xi_shi_jian: '2026-07-07T08:10:00.000Z',
          you_xi_jie_shu_shi_jian: null,
          mbti_lei_xing: 'ENFP',
        },
        {
          id: 'jinzhi-2',
          jiao_se_id: 'jiao-se-b',
          jiao_se_ming_zi: '进行中B',
          shi_fou_zha_xing: false,
          jie_guo_lei_xing: '',
          jie_guo_lei_xing_yuan: 'jinxing_zhong',
          shi_fou_feng_cun: false,
          liao_tian_tian_shu: 2,
          xiao_xi_zong_shu: 2,
          fu_pan_shu_ju: null,
          fu_pan_nei_rong: null,
          chuang_jian_shi_jian: '2026-07-07T09:00:00.000Z',
          zui_hou_xiao_xi_shi_jian: '2026-07-07T09:10:00.000Z',
          you_xi_jie_shu_shi_jian: null,
          mbti_lei_xing: 'INFP',
        },
      ]
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(lieBiao)

      localStorage.setItem(
        'zhanJiPaiXu',
        JSON.stringify({
          jinxingzhong: ['jinzhi-1', 'jinzhi-2'],
          shengli: [],
          shibai: [],
        }),
      )

      const { wrapper } = await mountZuJian()
      const fenLeiZu0 = wrapper.findAll('.zhanji-fenlei-zu')[0]
      const kaPian0 = fenLeiZu0.findAll('.zhanji-kapian')
      expect(kaPian0.length).toBe(2)
      expect(kaPian0[0].text()).toContain('进行中A')
      expect(kaPian0[1].text()).toContain('进行中B')

      const fenLeiZuRef = (
        wrapper.vm as unknown as {
          fenLeiZu: Record<string, DangAnXiangQing[]>
        }
      ).fenLeiZu
      const oldArr = [...fenLeiZuRef.jinxingzhong]
      fenLeiZuRef.jinxingzhong = [oldArr[1], oldArr[0]]
      // 先让 DOM 按新顺序重渲染（模拟真实拖拽后 DOM 已落位），再触发结束持久化
      await flushPromises()
      ;(
        wrapper.vm as unknown as { onTuoZhuaiJieShu: (zhuangTai: string) => void }
      ).onTuoZhuaiJieShu('jinxingzhong')
      await flushPromises()

      const xinKaPian = wrapper.findAll('.zhanji-fenlei-zu')[0].findAll('.zhanji-kapian')
      expect(xinKaPian[0].text()).toContain('进行中B')
      expect(xinKaPian[1].text()).toContain('进行中A')

      const cunChu = JSON.parse(localStorage.getItem('zhanJiPaiXu') || '{}')
      expect(cunChu.jinxingzhong).toEqual(['jinzhi-2', 'jinzhi-1'])
    })

    it('后端未返回 id 时仍能用索引兜底渲染列表', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue([
        { ...chuangJianDangAnLieBiao()[0], id: undefined },
        { ...chuangJianDangAnLieBiao()[1], id: undefined },
      ] as unknown as DangAnXiangQing[])

      const { wrapper } = await mountZuJian()
      const lieBiao = wrapper.findAll('.zhanji-kapian')
      expect(lieBiao.length).toBe(2)
      expect(lieBiao[0].text()).toContain('小甜心')
      expect(lieBiao[1].text()).toContain('高冷姐')
    })

    it('战绩列表容器存在统一纵向滚动条样式（FP-20 单一真源：私有宽/滑块/悬停已删，只留透明轨道）', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/\.zhanji-liebiao\s*\{[^}]*overflow-y:\s*auto/)
      // FP-20：私有 width/thumb/thumb:hover 三规则与 global 同令牌纯重复，已删——负断言钉住不许回归
      expect(guoWangZhanJiYuanMa).not.toMatch(/\.zhanji-liebiao::-webkit-scrollbar\s*\{/)
      expect(guoWangZhanJiYuanMa).not.toMatch(/\.zhanji-liebiao::-webkit-scrollbar-thumb\s*\{/)
      expect(guoWangZhanJiYuanMa).not.toMatch(/\.zhanji-liebiao::-webkit-scrollbar-thumb:hover\s*\{/)
      // 保留特例：透明轨道露出页面渐变底，global 半透明灰轨道会显出灰带
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-liebiao::-webkit-scrollbar-track\s*\{\s*background:\s*transparent/,
      )
      // 宽/滑块/悬停吃 global 单一真源（同令牌）
      const 全局 = 读取全局基线()
      expect(全局).toMatch(
        /::-webkit-scrollbar\s*\{\s*width:\s*var\(--gundong-tiao-kuan-du\)/,
      )
      expect(全局).toMatch(
        /::-webkit-scrollbar-thumb\s*\{\s*background:\s*var\(--gundong-tiao-huakuai\)/,
      )
      expect(全局).toMatch(/::-webkit-scrollbar-thumb:hover\s*\{/)
    })
  })

  describe('FP-05 勾选组件三态视觉', () => {
    it('未选中时全局勾选框为未选态（无 xuanzhong/bufen 类）', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const quanJuGouXuan = wrapper.find('.gouxuan-anniu--quanju')
      expect(quanJuGouXuan.exists()).toBe(true)
      expect(quanJuGouXuan.classes()).not.toContain('gouxuan-anniu--xuanzhong')
      expect(quanJuGouXuan.classes()).not.toContain('gouxuan-anniu--bufen')
    })

    it('选中部分记录时全局勾选框为部分选中态（bufen 类）', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      await gouXuan[0].trigger('click')
      await flushPromises()

      const quanJuGouXuan = wrapper.find('.gouxuan-anniu--quanju')
      expect(quanJuGouXuan.classes()).toContain('gouxuan-anniu--bufen')
      expect(quanJuGouXuan.classes()).not.toContain('gouxuan-anniu--xuanzhong')
    })

    it('全部选中时全局勾选框为选中态（xuanzhong 类）', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      await wrapper.find('.quan-xuan-anniu').trigger('click')
      await flushPromises()

      const quanJuGouXuan = wrapper.find('.gouxuan-anniu--quanju')
      expect(quanJuGouXuan.classes()).toContain('gouxuan-anniu--xuanzhong')
      expect(quanJuGouXuan.classes()).not.toContain('gouxuan-anniu--bufen')
    })

    it('卡片勾选框选中时添加 xuanzhong 类', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuan[0].classes()).not.toContain('gouxuan-anniu--xuanzhong')

      await gouXuan[0].trigger('click')
      await flushPromises()

      const gouXuanGengXin = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuanGengXin[0].classes()).toContain('gouxuan-anniu--xuanzhong')
    })

    it('勾选按钮有 role=checkbox 和 aria-checked 属性', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuan[0].attributes('role')).toBe('checkbox')
      expect(gouXuan[0].attributes('aria-checked')).toBe('false')

      await gouXuan[0].trigger('click')
      await flushPromises()

      const gouXuanGengXin = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuanGengXin[0].attributes('aria-checked')).toBe('true')
    })

    it('勾选按钮支持键盘 Space 切换', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuan[0].attributes('tabindex')).toBe('0')

      await gouXuan[0].trigger('keydown', { key: ' ' })
      await flushPromises()

      const gouXuanGengXin = wrapper.findAll('.gouxuan-anniu--kapian')
      expect(gouXuanGengXin[0].classes()).toContain('gouxuan-anniu--xuanzhong')
    })

    it('整卡可拖拽且无拖拽手柄', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const shouBing = wrapper.findAll('.tuozhuai-shoubing')
      expect(shouBing.length).toBe(0)
      const kaPian = wrapper.findAll('.zhanji-kapian')
      expect(kaPian.length).toBe(3)
      expect(kaPian[0].attributes('style') ?? '').not.toContain('cursor')
    })
  })

  describe('复盘跳转（FP-06 重构后）', () => {
    it('过往战绩页面源码不再包含复盘弹窗 DOM 类名', () => {
      expect(guoWangZhanJiYuanMa).not.toContain('fupan-zhezhao')
      expect(guoWangZhanJiYuanMa).not.toContain('fupan-tanchuang')
      expect(guoWangZhanJiYuanMa).not.toContain('fupan-dingbu')
      expect(guoWangZhanJiYuanMa).not.toContain('fupan-neirong')
      expect(guoWangZhanJiYuanMa).not.toContain('shijianxian-biaoti')
      expect(guoWangZhanJiYuanMa).not.toContain('shijianxian-tiaomu')
      expect(guoWangZhanJiYuanMa).not.toContain('junshi-zhidao-biaoti')
      expect(guoWangZhanJiYuanMa).not.toContain('guanbi-anniu')
    })

    it('过往战绩页面源码不再导入 huoQuFuPan', () => {
      expect(guoWangZhanJiYuanMa).not.toMatch(/import\s+.*huoQuFuPan/)
    })

    it('过往战绩页面源码不再包含弹窗状态变量', () => {
      expect(guoWangZhanJiYuanMa).not.toContain('fuPanZhanKai')
      expect(guoWangZhanJiYuanMa).not.toContain('dangQianDangAn')
      expect(guoWangZhanJiYuanMa).not.toContain('fuPanNeiRong')
      expect(guoWangZhanJiYuanMa).not.toContain('fuPanShiJianXian')
      expect(guoWangZhanJiYuanMa).not.toContain('junShiZhiDaoJiLu')
    })

    it('点击复盘按钮跳转到聊天页面并携带 fuPan 和 dangAnId query 参数', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper, luYou } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      expect(fuPanAnNiu).toBeDefined()
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe('/chat/jiao-se-1')
      expect(luYou.currentRoute.value.query.fuPan).toBe('1')
      expect(luYou.currentRoute.value.query.dangAnId).toBe('dang-an-1')
    })

    it('点击不同战绩的复盘按钮跳转到对应角色聊天页', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper, luYou } = await mountZuJian()
      const fuPanAnNiuLieBiao = wrapper.findAll('.caozuo-anniu.fupan')
      expect(fuPanAnNiuLieBiao.length).toBe(2)
      await fuPanAnNiuLieBiao[1]!.trigger('click')
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe('/chat/jiao-se-2')
      expect(luYou.currentRoute.value.query.fuPan).toBe('1')
      expect(luYou.currentRoute.value.query.dangAnId).toBe('dang-an-2')
    })

    it('复盘按钮不在进行中的游戏上显示', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const kaPianLieBiao = wrapper.findAll('.zhanji-kapian')
      const jinXingZhongKaPian = kaPianLieBiao.find((k) => k.text().includes('继续聊'))
      expect(jinXingZhongKaPian).toBeDefined()
      expect(jinXingZhongKaPian!.find('.caozuo-anniu.fupan').exists()).toBe(false)
      expect(jinXingZhongKaPian!.find('.caozuo-anniu.jixu').exists()).toBe(true)
    })

    it('时间格式化函数对无效时间返回空字符串不显示 Invalid Date', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      const lieBiao: DangAnXiangQing[] = [
        {
          id: 'dang-an-invalid',
          jiao_se_id: 'jiao-se-x',
          jiao_se_ming_zi: '无效时间测试',
          shi_fou_zha_xing: false,
          jie_guo_lei_xing: '失败-过早表白',
          jie_guo_lei_xing_yuan: 'shi_bai_guo_zao_biao_bai',
          shi_fou_feng_cun: true,
          liao_tian_tian_shu: 1,
          xiao_xi_zong_shu: 1,
          fu_pan_shu_ju: null,
          fu_pan_nei_rong: null,
          chuang_jian_shi_jian: 'invalid-date',
          zui_hou_xiao_xi_shi_jian: null,
          you_xi_jie_shu_shi_jian: undefined as unknown as null,
          mbti_lei_xing: 'INTJ',
        },
      ]
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(lieBiao)

      const { wrapper } = await mountZuJian()
      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).not.toContain('Invalid Date')
      expect(quanBuWenBen).not.toContain('NaN:NaN')
    })
  })

  describe('FP-04 Gmail风格勾选增强', () => {
    it('Shift+点击范围多选：单击A，Shift+点击C，选中A到C之间所有项', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')

      await gouXuan[0].trigger('click')
      await flushPromises()
      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(1)

      await gouXuan[2].trigger('click', { shiftKey: true })
      await flushPromises()

      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(3)
      expect(wrapper.find('.xuan-ze-shu-liang').text()).toContain('3')
    })

    it('Shift+点击反向范围同样生效：单击C，Shift+点击A，选中A到C', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')

      await gouXuan[2].trigger('click')
      await flushPromises()

      await gouXuan[0].trigger('click', { shiftKey: true })
      await flushPromises()

      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(3)
    })

    it('无上次点击时 Shift+点击退化为单选切换', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const gouXuan = wrapper.findAll('.gouxuan-anniu--kapian')

      await gouXuan[1].trigger('click', { shiftKey: true })
      await flushPromises()

      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(1)
    })

    it('拖拽时源卡片隐藏、目标处显示虚线落点空位（FP-04：外层定位槽画框，内容隐藏；FP-22e：环宽/环色吃焦点环令牌）', () => {
      // 落点空位用 outline 而非 border：外层是纯定位槽，加 border 会撑高一格、兄弟卡片跟着跳
      const guiYingKuai =
        /\.zhanji-kapian\.sortable-ghost\s*\{([\s\S]*?)\n\}/.exec(guoWangZhanJiYuanMa)?.[1] ?? ''
      // 契约随实现演进（FP-22e）：旧断言把 `2px … #ff2d95` 两个字面量钉在落点空位上，
      // 正是"三套并行环色体系"里的一套。现升级为「声明必须吃 --jujiao-huan-* 令牌」+
      // 「解析后环宽仍是 2px、仍是虚线」，判定条件比旧版更严（旧版只比字符串，不比解析值）。
      expect(guiYingKuai).toMatch(
        /outline:\s*var\(--jujiao-huan-kuan-du\)\s+dashed\s+var\(--jujiao-huan-yanse\)/,
      )
      expect(解析几何数值('--jujiao-huan-kuan-du'), '落点空位环宽解析后应仍为 2px').toBe(2)
      expect(guiYingKuai).not.toMatch(/outline:\s*[^;]*#/)
      expect(guoWangZhanJiYuanMa).toMatch(/\.sortable-ghost\s*\{[^}]*rgba\(255,\s*45,\s*149/)
      // 落点空位内卡片内容隐藏，仅保留轮廓
      expect(guoWangZhanJiYuanMa).toMatch(/\.sortable-ghost\s*>\s*\*\s*\{[^}]*opacity:\s*0/)
      // 「手里拽着的」卡片样式保留
      expect(guoWangZhanJiYuanMa).toMatch(/\.sortable-drag\s*\{[^}]*opacity:\s*1/)
    })

    it('FP-04 鬼影外层不带 transform，倾斜下沉到内层且有起手动画', () => {
      // 库把指针增量除以鬼影自身矩阵的 a/d：外层带 rotate/scale 就会让卡片只走指针位移的 1/scale
      const guiWaiCengKuai =
        /\.zhanji-kapian\.sortable-drag\s*\{([\s\S]*?)\n\}/.exec(guoWangZhanJiYuanMa)?.[1] ?? ''
      // 恒等矩阵只能靠「不写」保证：作者样式的 transform（含 none !important）优先级压过库写在
      // style 上的内联 matrix，会把鬼影钉死在插入点（实测指针 200px → 鬼影 0px，跟随比值 0）
      expect(guiWaiCengKuai).not.toMatch(/transform\s*:/)
      // transition 也必须关掉，否则每次写 matrix 都被缓动，鬼影恒落后指针
      expect(guiWaiCengKuai).toMatch(/transition:\s*none\s*!important/)
      // 倾斜改由内层承载（视觉随卡片一起斜，不会出现静框 + 斜内容的双层）
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-kapian\.sortable-drag\s*>\s*\.zhanji-kapian-nei\s*\{[^}]*animation:\s*kapian-qishou-qingxie/,
      )
      // 克隆体是新建元素，首绘无前值，transition 结构上跑不起来，必须用 @keyframes 从恒等矩阵插值
      expect(guoWangZhanJiYuanMa).toMatch(
        /@keyframes\s+kapian-qishou-qingxie\s*\{\s*from\s*\{\s*transform:\s*rotate\(0deg\)\s+scale\(1\)\s*;?\s*\}\s*to\s*\{\s*transform:\s*rotate\(2deg\)\s+scale\(1\.02\)/,
      )
    })

    it('FP-04 落定 FLIP 以鬼影视觉位作被拖卡片的旧位（消除松手瞬移）', () => {
      // 鬼影只在库的 fallback 分支挂在 body（:fallback-on-body），真卡片不会被误命中
      expect(guoWangZhanJiYuanMa).toMatch(
        /document\.querySelector\('body > \.zhanji-kapian\.sortable-drag'\)/,
      )
      // pointermove 每帧无条件采样，任何早退都不许跳过
      expect(guoWangZhanJiYuanMa).toMatch(
        /includes\(yuanId\)\) return\s*\n\s*\/\/[^\n]*\n\s*caiJiGuiYingShiJueWei\(\)/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(
        /if \(gui && el\.getAttribute\('data-id'\) === gui\.id\) return \{ el, x: gui\.x, y: gui\.y \}/,
      )
      // 跨轮脏位必须清：拖拽开始与复位各清一次
      expect(guoWangZhanJiYuanMa.match(/guiYingShiJueWei = null/g)?.length).toBeGreaterThanOrEqual(2)
    })

    it('FP-04 合成层提示由 FLIP 本轮内联自管理，样式层不留并存的 will-change 规则', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/el\.style\.willChange = 'transform'/)
      expect(guoWangZhanJiYuanMa).toMatch(/el\.style\.willChange = ''/)
      expect(guoWangZhanJiYuanMa).not.toMatch(/\.tuo-zhuai-zhong \.zhanji-kapian\s*\{[^}]*will-change/)
    })

    it('FP-04 起手前硬取消在飞位移 + 缓动曲线唯一来源于共用 :root 令牌，两主题过渡一致', () => {
      // 快速连拖时中心采样只认布局位：先落地 transition:none 再清 transform（强制回流防反向触发）
      expect(guoWangZhanJiYuanMa).toMatch(/function qingChuZaiFeiLiuWei\(rongQi: HTMLElement \| null\)/)
      expect(guoWangZhanJiYuanMa).toMatch(
        /el\.style\.transition = 'none'\n\s*void el\.offsetHeight[\s\S]*?el\.style\.transform = ''/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(/qingChuZaiFeiLiuWei\(rongQi\)\n\s*yuanXinZuoBiao\.value = buZhuoZhongXin\(rongQi\)/)
      // 曲线由 variables.css 共用 :root 块（与主题档无关）单点声明：本文件一旦再写同名声明或
      // 字面量，就长出第二真源（FP-12 上收前那个"浅色档补齐"补丁的成因），深浅两档从此可分叉。
      expect(guoWangZhanJiYuanMa).not.toMatch(/--quxian-huan-ying\s*:/)
      expect(guoWangZhanJiYuanMa).not.toMatch(/cubic-bezier\(/)
    })

    it('FP-04 落定改写一律包在 FLIP 事务里，不允许有无补偿的裸重排出口', () => {
      // 定义 + 拖拽中预览 + luoDing（customUpdate / @end 索引兜底共用）+ 自动排序早退 + @end 落点兜底
      expect((guoWangZhanJiYuanMa.match(/zhiXingLiuWeiDongHua\(/g) ?? []).length).toBeGreaterThanOrEqual(5)
      const luoDingKuai = /function luoDing[\s\S]*?\n\}/.exec(guoWangZhanJiYuanMa)?.[0] ?? ''
      expect(luoDingKuai).toMatch(/zhiXingLiuWeiDongHua\(\(\) => \{/)
      expect(luoDingKuai).toContain('yingYongZuiZhongChongPai(zt, oldIdx, newIdx)')
      const jieShuKuai = /function onTuoZhuaiJieShu[\s\S]*?\n\}/.exec(guoWangZhanJiYuanMa)?.[0] ?? ''
      // ⑤自动排序早退 与 ③④指针落点/原始序回写 两条分支各自成 FLIP 事务
      expect(jieShuKuai).toMatch(/zhiXingLiuWeiDongHua\(\(\) => chongZhiYuLan\(\)/)
      expect((jieShuKuai.match(/zhiXingLiuWeiDongHua\(/g) ?? []).length).toBeGreaterThanOrEqual(2)
      expect(jieShuKuai).toContain('changShiZhiZhenLuoDianChongPai(zhuangTai, shiJian)')
    })

    it('FP-04 页面根使用整页底板令牌，滚动层不带底板', () => {
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-yemian\s*\{[^}]*background:\s*var\(--yemian-di-beijing\)\s*;/,
      )
      const lieBiaoKuai = /\.zhanji-liebiao\s*\{[\s\S]*?\n\}/.exec(guoWangZhanJiYuanMa)?.[0] ?? ''
      expect(lieBiaoKuai).not.toMatch(/background:\s*var\(--yemian-di-beijing\)/)
    })

    it('FP-04 卡片位移过渡时长/曲线单源于 CSS，JS 不再各写一份', () => {
      expect(guoWangZhanJiYuanMa).toMatch(
        /--kapian-liu-wei:\s*transform\s+0\.32s\s+var\(--quxian-huan-ying\)/,
      )
      expect(guoWangZhanJiYuanMa).toContain("el.style.transition = 'var(--kapian-liu-wei)'")
      // 旧的死规则（TransitionGroup 已被移除）不得留两套并存机制
      expect(guoWangZhanJiYuanMa).not.toContain('zhanji-kapian-move')
      expect(guoWangZhanJiYuanMa).not.toContain('<TransitionGroup')
    })

    it('FP-04 六条落位分支逐条可追溯：每条顺序改写出口都被位移事务包住', () => {
      // ① customUpdate → luoDing → yingYongZuiZhongChongPai
      const gengXinKuai = /function onTuoZhuaiGengXin[\s\S]*?\n\}/.exec(guoWangZhanJiYuanMa)?.[0] ?? ''
      expect(gengXinKuai).toContain('luoDing(zt, oldIdx, newIdx)')
      const luoDingKuai = /function luoDing[\s\S]*?\n\}/.exec(guoWangZhanJiYuanMa)?.[0] ?? ''
      expect(luoDingKuai).toMatch(/zhiXingLiuWeiDongHua\(\(\) => \{\n\s*yingYongZuiZhongChongPai/)
      // ② @end 索引兜底：走同一个 luoDing，不再有第二条裸改写路径
      const jieShuKuai = /function onTuoZhuaiJieShu[\s\S]*?\n\}/.exec(guoWangZhanJiYuanMa)?.[0] ?? ''
      expect(jieShuKuai).toMatch(/if \(oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx\) \{\n\s*luoDing\(/)
      // ⑤ 自动排序早退：复位预览也是一次位移事务
      expect(jieShuKuai).toMatch(/zhiXingLiuWeiDongHua\(\(\) => chongZhiYuLan\(\), rongQiZiDong\)/)
      // ③ 指针坐标兜底 + ④ 无可信落点回写原始序：两条共用一个事务
      expect(jieShuKuai).toMatch(
        /zhiXingLiuWeiDongHua\(\(\) => \{\n\s*if \(!changShiZhiZhenLuoDianChongPai\(zhuangTai, shiJian\)\) \{\n\s*\/\/[^\n]*\n\s*yingYongZuiZhongChongPai\(zhuangTai, -1, -1\)/,
      )
      // ③ 的裸调用出口只允许一个（定义 + 事务内那一次），杜绝「无处方重排」重新长回来
      expect((guoWangZhanJiYuanMa.match(/changShiZhiZhenLuoDianChongPai\(/g) ?? []).length).toBe(2)
      expect(jieShuKuai).toContain('chongZhiYuLan()')
      // ⑥ 被拖卡片自身归位：有鬼影样本时以鬼影视覚位为旧位，没有时退回自身实时 rect
      // （两条路径都在 jiu 采样里，都会被同一次位移事务补偿，不再出现「松手才跳」）
      expect(guoWangZhanJiYuanMa).toMatch(
        /if \(gui && el\.getAttribute\('data-id'\) === gui\.id\) return \{ el, x: gui\.x, y: gui\.y \}\n\s*const r = el\.getBoundingClientRect\(\)/,
      )
    })

    it('FP-04 库自带 FLIP 已关：卡片位移只有本组件一套机制', () => {
      // 库的 animate/animateAll 会在同一批卡片上写内联 transform + transition，并在时限到点
      // 把两者清空，与手写 FLIP 互相覆盖（且 animation truthy 时 captureAnimationState 会留存
      // 已卸载节点的 rect）
      expect(guoWangZhanJiYuanMa).toMatch(/:animation="0"/)
      expect(guoWangZhanJiYuanMa).not.toMatch(/:animation="[1-9]/)
    })

    it('FP-04 内联位移样式必有收尾：令牌时限可兜底解析 + end/cancel 双事件 + 本轮先占令牌', () => {
      expect(guoWangZhanJiYuanMa).toMatch(
        /function liuWeiShouWeiHaoMiao\(el: HTMLElement, guangZe\?: string\)/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(/liuWeiShouWeiHaoMiao\(el, guangZe\)/)
      // 令牌字符串只读一次，避免同一帧两次 getComputedStyle 读到不同计算值
      expect(guoWangZhanJiYuanMa).toMatch(/const guangZe = rongQi \? huoQuLiuWeiGuangZe\(rongQi\) : ''/)
      expect(guoWangZhanJiYuanMa).toMatch(/el\.addEventListener\('transitionend', shouWei, \{ once: true \}\)/)
      expect(guoWangZhanJiYuanMa).toMatch(
        /el\.addEventListener\('transitioncancel', shouWei, \{ once: true \}\)/,
      )
      // 起始位移一写下就占住令牌：上一轮迟到的 cancel/end/定时器才抹不掉本轮的位移
      expect(guoWangZhanJiYuanMa).toMatch(/liuWeiDaiShu\.set\(el, dai\)\n\s*daiYun\.push\(el\)/)
      expect((guoWangZhanJiYuanMa.match(/liuWeiDaiShu\.set\(/g) ?? []).length).toBe(1)
      // 起手前的硬取消必须连 will-change 一起看，否则只残留合成层提示也算「未清干净」
      expect(guoWangZhanJiYuanMa).toMatch(
        /if \(!el\.style\.transition && !el\.style\.transform && !el\.style\.willChange\) continue/,
      )
    })

    it('FP-04 起手曲线与位移曲线同源：挂在 body 上的克隆体也能解析出该令牌', () => {
      // 鬼影克隆体挂在 document.body 上（:fallback-on-body），拿不到 .zhanji-liebiao 上的任何
      // 局部声明，它的 animation 只能靠全局可继承的令牌工作 → 令牌必须住在与主题档无关的共用块，
      // 否则浅色档 var() 解析不出来会让整条 animation 在计算值阶段失效（起手倾斜静默消失）。
      const lingPaiYuanMa = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
      const guaiZheXie = [...lingPaiYuanMa.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((kuai) =>
        /--quxian-huan-ying:/.test(kuai[2] ?? ''),
      )
      expect(guaiZheXie.length).toBe(1)
      expect(/(^|,)\s*:root\s*(,|$)/.test(guaiZheXie[0][1] ?? '')).toBe(true)
      // animation 只引用令牌，不各自再写一份时长/曲线
      expect(guoWangZhanJiYuanMa).toMatch(
        /animation:\s*kapian-qishou-qingxie\s+220ms\s+var\(--quxian-huan-ying\)\s+both/,
      )
      // 缓动曲线唯一来源于 variables.css 的共用 :root 块（更强性质，取代旧的"浅色档必须自己声明一遍"）：
      // ①真源侧只声明一次、住在与主题档无关的裸 :root、取值逐字钉死；
      // ②本文件侧零局部声明、零曲线字面量，只允许通过 var() 消费（历史补丁即"浅色档重声明"不得复活）。
      const zhenYuanKuai = guaiZheXie[0][2] ?? ''
      expect((zhenYuanKuai.match(/--quxian-huan-ying\s*:/g) ?? []).length).toBe(1)
      const zhenYuanQuZhi = /--quxian-huan-ying:\s*([^;]+);/.exec(zhenYuanKuai)?.[1] ?? ''
      expect(zhenYuanQuZhi.replace(/\s+/g, '')).toBe('cubic-bezier(0.22,1,0.36,1)')
      expect(guoWangZhanJiYuanMa).not.toMatch(/--quxian-huan-ying\s*:/)
      expect((guoWangZhanJiYuanMa.match(/cubic-bezier\(/g) ?? []).length).toBe(0)
      // var() 消费点：卡片位移过渡 + 起手 animation，两处共用同一真源
      expect((guoWangZhanJiYuanMa.match(/var\(--quxian-huan-ying\)/g) ?? []).length).toBe(2)
    })

    it('FP-04 位移时长全库只声明一次，JS 侧不再出现第二份时长', () => {
      expect((guoWangZhanJiYuanMa.match(/--kapian-liu-wei:/g) ?? []).length).toBe(1)
      expect((guoWangZhanJiYuanMa.match(/0\.32s/g) ?? []).length).toBe(1)
      expect(guoWangZhanJiYuanMa).not.toMatch(/transition = 'transform[\d.]/)
      expect(guoWangZhanJiYuanMa).not.toMatch(/transitionDuration\s*=\s*'/)
    })

    it('卡片勾选框默认半透明，悬停或选中时完全显示', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/\.gouxuan-anniu--kapian\s*\{[^}]*opacity:\s*0\.6/)
      expect(guoWangZhanJiYuanMa).toMatch(/\.zhanji-kapian:hover\s+\.gouxuan-anniu--kapian/)
    })

    it('选中行使用霓虹粉全边框 + 内圈描边高亮（FP-04 后视觉在内层）', () => {
      // FP-22g：霓虹粉两处字面量收编进 --xuanzhong-huan-yanse（值仍 #ff2d95），断言随契约演进改钉令牌
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-kapian\.xuanZhong\s*>\s*\.zhanji-kapian-nei\s*\{[^}]*border-color:\s*var\(--xuanzhong-huan-yanse\)/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-kapian\.xuanZhong\s*>\s*\.zhanji-kapian-nei\s*\{[^}]*inset\s+0\s+0\s+0\s+2px\s+var\(--xuanzhong-huan-yanse\)/,
      )
    })

    it('批量工具栏有选中项时高亮加阴影', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/\.piliang-gongju-lan:not\(\.piliang-gongju-lan--kong\)/)
    })

    it('indeterminate 态改为横线样式', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/\.gouxuan-anniu--bufen::after\s*\{[^}]*height:\s*2px/)
    })
  })

  describe('拖拽不选中文字（Req1）', () => {
    it('拖拽开始时为列表容器添加抑制文本选择的 tuo-zhuai-zhong 类', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const lieBiao = wrapper.find('.zhanji-liebiao')
      expect(lieBiao.exists()).toBe(true)
      expect(lieBiao.classes()).not.toContain('tuo-zhuai-zhong')
      ;(wrapper.vm as unknown as { onTuoZhuaiKaiShi: (z: string) => void }).onTuoZhuaiKaiShi(
        'jinxingzhong',
      )
      await flushPromises()

      expect(wrapper.find('.zhanji-liebiao').classes()).toContain('tuo-zhuai-zhong')
    })

    it('拖拽结束后移除 tuo-zhuai-zhong 类并清空已产生的文本选区', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const removeAllRanges = vi.fn()
      vi.stubGlobal(
        'getSelection',
        () => ({ removeAllRanges, toString: () => '被误选中的文字' }) as unknown as Selection,
      )

      const { wrapper } = await mountZuJian()
      ;(wrapper.vm as unknown as { onTuoZhuaiKaiShi: (z: string) => void }).onTuoZhuaiKaiShi(
        'shengli',
      )
      await flushPromises()
      expect(wrapper.find('.zhanji-liebiao').classes()).toContain('tuo-zhuai-zhong')
      ;(wrapper.vm as unknown as { onTuoZhuaiJieShu: (z: string) => void }).onTuoZhuaiJieShu(
        'shengli',
      )
      await flushPromises()

      expect(wrapper.find('.zhanji-liebiao').classes()).not.toContain('tuo-zhuai-zhong')
      expect(removeAllRanges).toHaveBeenCalledTimes(1)
    })

    it('源码声明 .zhanji-liebiao.tuo-zhuai-zhong 同时设置 user-select:none 与 -webkit-user-select', () => {
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-liebiao\.tuo-zhuai-zhong\s*\{[^}]*user-select:\s*none/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-liebiao\.tuo-zhuai-zhong\s*\{[^}]*-webkit-user-select:\s*none/,
      )
    })
  })

  describe('Req1 卡片本体与拖拽副本禁止选中文字', () => {
    it('拖拽 ghost 预览空位与跟随光标的 drag 副本同样携带 user-select:none', () => {
      // force-fallback 拖拽副本（.sortable-drag）与预览空位（.sortable-ghost/.sortable-chosen）
      expect(guoWangZhanJiYuanMa).toMatch(/\.sortable-ghost\s*\{[^}]*user-select:\s*none/)
      expect(guoWangZhanJiYuanMa).toMatch(/\.sortable-chosen\s*\{[^}]*user-select:\s*none/)
      expect(guoWangZhanJiYuanMa).toMatch(/\.sortable-drag\s*\{[^}]*user-select:\s*none/)
    })
  })
})
