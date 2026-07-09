import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import type { DangAnXiangQing, PingGuJieGuo } from '@/types'
import type { 复盘响应, 军师指导记录项, 复盘时间线条目 } from '@/api/聊天'

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
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-1',
      jiao_se_ming_zi: '小甜心',
      shi_fou_zha_xing: false,
      jie_guo_lei_xing: '胜利-爱情',
      jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
      shi_fou_feng_cun: true,
      hao_gan_du_zong_fen: 850,
      guan_xi_jie_duan: 'reLian',
      liao_tian_tian_shu: 5,
      xiao_xi_zong_shu: 20,
      fu_pan_shu_ju: null,
      fu_pan_nei_rong: null,
      chuang_jian_shi_jian: '2026-07-07T10:00:00.000Z',
      mbti_lei_xing: 'INFP',
    },
    {
      id: 'dang-an-2',
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-2',
      jiao_se_ming_zi: '高冷姐',
      shi_fou_zha_xing: true,
      jie_guo_lei_xing: '失败-被诈型欺骗',
      jie_guo_lei_xing_yuan: 'shi_bai_bei_zha_xing_qi_pian',
      shi_fou_feng_cun: true,
      hao_gan_du_zong_fen: 120,
      guan_xi_jie_duan: 'lengDan',
      liao_tian_tian_shu: 3,
      xiao_xi_zong_shu: 12,
      fu_pan_shu_ju: null,
      fu_pan_nei_rong: null,
      chuang_jian_shi_jian: '2026-07-07T09:00:00.000Z',
      mbti_lei_xing: 'INTJ',
    },
    {
      id: 'dang-an-3',
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-3',
      jiao_se_ming_zi: '继续聊',
      shi_fou_zha_xing: false,
      jie_guo_lei_xing: '',
      jie_guo_lei_xing_yuan: 'jinxing_zhong',
      shi_fou_feng_cun: false,
      hao_gan_du_zong_fen: 300,
      guan_xi_jie_duan: 'renShi',
      liao_tian_tian_shu: 1,
      xiao_xi_zong_shu: 5,
      fu_pan_shu_ju: null,
      fu_pan_nei_rong: null,
      chuang_jian_shi_jian: '2026-07-07T08:00:00.000Z',
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
      hao_gan_du_kuai_zhao: {
        zongFen: 300,
        xinRenDu: 100,
        qinMiDu: 80,
        quWeiDu: 60,
        guanHuaiDu: 60,
        guanXiJieDuan: 'renShi',
        guanXiJieDuanMingCheng: '认识',
      },
    },
  ]
}

function chuangJianFuPanXiangYing(
  jiaZaiZhong = false,
  fuPanNeiRong: string | null = null,
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
          hao_gan_du_bian_hua: {
            xin_ren_bian_hua: 1,
            qin_mi_bian_hua: 0,
            qu_wei_bian_hua: 0,
            guan_huai_bian_hua: 0,
            zong_fen_bian_hua: 1,
            guan_xi_jie_duan: 'renShi',
          },
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

function chuangJianPingGuJieGuo(): PingGuJieGuo {
  return {
    话题引导: { fen: 8, shuo_ming: '能自然引出话题' },
    情感共鸣: { fen: 7, shuo_ming: '能回应情绪' },
    幽默感: { fen: 6, shuo_ming: '偶尔有亮点' },
    体贴度: { fen: 8, shuo_ming: '关心细节' },
    节奏把控: { fen: 7, shuo_ming: '总体平稳' },
    总体评价: '聊天水平良好。',
    改进建议: ['多倾听', '避免急躁'],
  }
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

    it('渲染战绩列表并显示角色名字、MBTI、聊天天数', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const lieBiao = wrapper.findAll('.zhanji-kapian')
      expect(lieBiao.length).toBe(3)
      expect(lieBiao[0].text()).toContain('小甜心')
      expect(lieBiao[0].text()).toContain('INFP')
      expect(lieBiao[0].text()).toContain('5')
    })

    it('进行中游戏显示继续按钮，已结束游戏显示复盘按钮', async () => {
      const { huoQuDangAnLieBiao } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())

      const { wrapper } = await mountZuJian()
      const anNiuLieBiao = wrapper.findAll('.caozuo-anniu')
      const wenBenLieBiao = anNiuLieBiao.map((x) => x.text())
      expect(wenBenLieBiao).toContain(huoQuFanYi('zhanJi', 'jiXu'))
      expect(wenBenLieBiao).toContain(huoQuFanYi('zhanJi', 'fuPan'))
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
      const { huoQuDangAnLieBiao, huoQuFuPan, huoQuPingGuLiShi } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, '## 逐句分析\n分析内容'),
      )
      vi.mocked(huoQuPingGuLiShi).mockResolvedValue(null)

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
  })

  describe('聊天水平评估', () => {
    it('点击评估按钮展示五维评分', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan, huoQuPingGuLiShi, zhiXingPingGu } =
        await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, '## 总结评价\n表现不错'),
      )
      vi.mocked(huoQuPingGuLiShi).mockResolvedValue(null)
      vi.mocked(zhiXingPingGu).mockResolvedValue(chuangJianPingGuJieGuo())

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      const pingGuAnNiu = document.querySelector('.caozuo-anniu.pinggu')
      expect(pingGuAnNiu).not.toBeNull()
      expect(pingGuAnNiu!.textContent?.trim()).toBe(huoQuFanYi('zhanJi', 'pingGuLiaoTianShuiPing'))
      await (pingGuAnNiu as HTMLElement).click()
      await flushPromises()

      const weiDuLieBiao = document.querySelectorAll('.weidu-xiangmu')
      expect(weiDuLieBiao.length).toBe(5)
      expect(document.querySelector('.zongti-wenben')?.textContent?.trim()).toBe('聊天水平良好。')
    })

    it('已存在评估历史时按钮显示重新评估', async () => {
      const { huoQuDangAnLieBiao, huoQuFuPan, huoQuPingGuLiShi } = await import('@/api/聊天')
      vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(chuangJianDangAnLieBiao())
      vi.mocked(huoQuFuPan).mockResolvedValue(
        chuangJianFuPanXiangYing(false, '## 总结评价\n表现不错'),
      )
      vi.mocked(huoQuPingGuLiShi).mockResolvedValue(chuangJianPingGuJieGuo())

      const { wrapper } = await mountZuJian()
      const fuPanAnNiu = wrapper.findAll('.caozuo-anniu.fupan').at(0)
      await fuPanAnNiu!.trigger('click')
      await flushPromises()

      expect(document.querySelector('.caozuo-anniu.pinggu')?.textContent?.trim()).toBe(
        huoQuFanYi('zhanJi', 'chongXinPingGu'),
      )
    })
  })
})
