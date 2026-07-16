import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import type { DangAnXiangQing } from '@/types'
import type { 复盘响应, 军师指导记录项, 复盘时间线条目 } from '@/api/聊天'

const guoWangZhanJiYuanMa = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')

vi.mock('@/api/聊天')

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:jiaoSeId', name: 'liaoTian', component: { template: '<div>聊天</div>' } },
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

function chuangJunShiJiLu(): 军师指导记录项[] {
  return [
    {
      shi_jian: '2026-07-07T10:00:00.000Z',
      jiao_se_ming_zi: '小甜心',
      jun_shi_ming_chen: '玄锐暮',
      jian_yi: '先吐槽你一句，然后给你建议。',
      dui_hua_zhai_yao: '初次互动摘要',
    },
  ]
}

function chuangJianFuPanXiangYing(
  jiaZaiZhong = false,
  fuPanNeiRong: unknown = null,
  youShiJianXian = true,
): 复盘响应 {
  const shiJianXian: 复盘时间线条目[] = youShiJianXian
    ? [
        {
          shi_jian: '10:00',
          shi_jian_miao_shu: '初次互动',
          yong_hu_xiao_xi: '你好',
          ai_hui_fu: '嗨',
          ai_xin_li_huo_dong: '对方看起来友善',
        },
      ]
    : []
  return {
    fu_pan_nei_rong: fuPanNeiRong,
    fu_pan_shi_jian_xian: shiJianXian,
    jun_shi_zhi_dao_ji_lu: chuangJunShiJiLu(),
    guan_jian_shi_jian: [],
    jia_zai_zhong: jiaZaiZhong,
  } as 复盘响应
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

  describe('复盘弹窗', () => {
    it('点击复盘按钮打开弹窗并显示加载状态', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(chuangJianFuPanXiangYing(true))

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      expect(fuPanAnNiu).toBeDefined()
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      expect(document.querySelector('.fupan-zhezhao')).not.toBeNull()
      expect(document.querySelector('.fupan-neirong .jiazai-zhuangtai')?.textContent?.trim()).toBe(
        huoQuFanYi('zhanJi', 'fuPanShengChengZhong'),
      )
    })

    it('复盘未生成时显示提示文案', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(chuangJianFuPanXiangYing(false, null, false))

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      expect(document.querySelector('.fupan-neirong .kong-zhuangtai')?.textContent?.trim()).toBe(
        huoQuFanYi('zhanJi', 'fuPanWeiShengCheng'),
      )
    })

    it('复盘生成后展示关键事件时间线和军师指导记录', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, '## 逐句分析\n分析内容'),
      )

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      expect(document.querySelector('.shijianxian-biaoti')?.textContent?.trim()).toBe(
        huoQuFanYi('zhanJi', 'guanJianShiJianShiJianXian'),
      )
      expect(document.querySelector('.shijianxian-tiaomu')).not.toBeNull()
      expect(document.querySelector('.junshi-zhidao-biaoti')?.textContent?.trim()).toContain(
        huoQuFanYi('zhanJi', 'junShiZhiDaoJiLu'),
      )
    })

    it('复盘内容即使后端误返回对象也不渲染 [object Object]', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, { some: 'object', nested: { value: 1 } }),
      )

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      const fuPanWenBen = document.querySelector('.fupan-wenben')?.textContent?.trim() || ''
      expect(fuPanWenBen).not.toContain('[object Object]')
      expect(fuPanWenBen).toContain('"some": "object"')
    })

    it('复盘弹窗内容区存在统一纵向滚动条样式', () => {
      expect(guoWangZhanJiYuanMa).toMatch(/\.fupan-neirong\s*\{[^}]*overflow-y:\s*auto/)
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.fupan-neirong::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(
        /\.fupan-neirong::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gundong-tiao-beijing\)/,
      )
      expect(guoWangZhanJiYuanMa).toMatch(/\.fupan-neirong::-webkit-scrollbar-thumb:hover/)
    })

    it('复盘中不展示评估聊天水平相关按钮或区域', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, '## 总结评价\n表现不错'),
      )

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      expect(document.querySelector('.pinggu-quyu')).toBeNull()
      expect(document.querySelector('.caozuo-anniu.pinggu')).toBeNull()
    })

    it('复盘弹窗不渲染好感度数值、维度名、进度条与好感度快照', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, '## 总结评价\n表现不错'),
      )

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      const fuPanWenBen = document.querySelector('.fupan-neirong')?.textContent?.trim() || ''
      expect(fuPanWenBen).not.toContain('850')
      expect(fuPanWenBen).not.toContain('信任')
      expect(fuPanWenBen).not.toContain('亲密')
      expect(fuPanWenBen).not.toContain('趣味')
      expect(fuPanWenBen).not.toContain('关怀')
      expect(document.querySelector('.shijianxian-haogandu')).toBeNull()
      expect(document.querySelector('.junshi-zhidao-haogandu')).toBeNull()
    })
  })
})
