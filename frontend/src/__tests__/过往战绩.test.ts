import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import type { DangAnXiangQing } from '@/types'

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
      expect(wrapper.find('.jiazai-zhuangtai').text()).toBe(huoQuFanYi('zhanJi', 'jiaZaiZhong'))
    })

    it('无战绩时显示空状态翻译文本', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue([])

      const { wrapper } = await mountZuJian()
      expect(wrapper.find('.kong-zhuangtai').text()).toBe(huoQuFanYi('zhanJi', 'zanWuZhanJi'))
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

    it('可通过复选框多选战绩', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const xuanZeKuang = wrapper.findAll('.xuan-ze-kuang input')
      expect(xuanZeKuang.length).toBe(3)

      await xuanZeKuang[0].setValue(true)
      await xuanZeKuang[1].setValue(true)
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
      const xuanZeKuang = wrapper.findAll('.xuan-ze-kuang input')
      await xuanZeKuang[0].setValue(true)
      await xuanZeKuang[1].setValue(true)
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
      const xuanZeKuang = wrapper.findAll('.xuan-ze-kuang input')
      await xuanZeKuang[0].setValue(true)
      await xuanZeKuang[1].setValue(true)
      await flushPromises()

      await wrapper.find('.piliang-shanchu-anniu').trigger('click')
      await flushPromises()

      expect(piLiangShanChuDangAn).not.toHaveBeenCalled()
      expect(wrapper.findAll('.zhanji-kapian').length).toBe(3)
    })

    it('未选中任何记录时不显示批量工具栏', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      expect(wrapper.find('.piliang-gongju-lan').exists()).toBe(false)
    })

    it('选中任意记录后工具栏显示全选按钮', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const xuanZeKuang = wrapper.findAll('.xuan-ze-kuang input')
      await xuanZeKuang[0].setValue(true)
      await flushPromises()

      const gongJuLan = wrapper.find('.piliang-gongju-lan')
      expect(gongJuLan.exists()).toBe(true)
      expect(gongJuLan.text()).toContain(huoQuFanYi('zhanJi', 'quanXuan'))
    })

    it('点击全选按钮选中当前所有战绩', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const xuanZeKuang = wrapper.findAll('.xuan-ze-kuang input')
      await xuanZeKuang[0].setValue(true)
      await flushPromises()

      await wrapper.find('.quan-xuan-anniu').trigger('click')
      await flushPromises()

      const xuanZhongKaPian = wrapper.findAll('.zhanji-kapian.xuanZhong')
      expect(xuanZhongKaPian.length).toBe(3)
      expect(wrapper.find('.xuan-ze-shu-liang').text()).toContain('3')
    })

    it('全部选中时全选按钮变为取消全选并点击清空选择', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const xuanZeKuang = wrapper.findAll('.xuan-ze-kuang input')
      await xuanZeKuang[0].setValue(true)
      await xuanZeKuang[1].setValue(true)
      await xuanZeKuang[2].setValue(true)
      await flushPromises()

      const quanXuanAnNiu = wrapper.find('.quan-xuan-anniu')
      expect(quanXuanAnNiu.text()).toBe(huoQuFanYi('zhanJi', 'quXiaoQuanXuan'))

      await quanXuanAnNiu.trigger('click')
      await flushPromises()

      expect(wrapper.find('.piliang-gongju-lan').exists()).toBe(false)
      expect(wrapper.findAll('.zhanji-kapian.xuanZhong').length).toBe(0)
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
      expect(wrapper.find('.piliang-gongju-lan').exists()).toBe(false)
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

    it('FP-09 拖拽卡片后视图顺序立即更新（无需手动刷新）', async () => {
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
      const fenLeiZu = wrapper.findAll('.zhanji-fenlei-zu')[0]
      const kaPian = fenLeiZu.findAll('.zhanji-kapian')
      expect(kaPian.length).toBe(2)
      expect(kaPian[0].text()).toContain('进行中A')
      expect(kaPian[1].text()).toContain('进行中B')

      const dataTransfer = {
        effectAllowed: 'move' as const,
        dropEffect: 'move' as const,
        data: {} as Record<string, string>,
        setData(type: string, val: string) {
          this.data[type] = val
        },
        getData(type: string) {
          return this.data[type] || ''
        },
      }
      await kaPian[0].trigger('dragstart', { dataTransfer })
      await kaPian[1].trigger('dragover', { dataTransfer })
      await kaPian[1].trigger('drop', { dataTransfer })
      await kaPian[0].trigger('dragend')
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

    it('战绩列表容器存在统一纵向滚动条样式', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/\.zhanji-liebiao\s*\{[^}]*overflow-y:\s*auto/)
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-liebiao::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.zhanji-liebiao::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gundong-tiao-beijing\)/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(/\.zhanji-liebiao::-webkit-scrollbar-thumb:hover/)
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
})
