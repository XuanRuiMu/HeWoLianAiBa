import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 过往战绩 from '@/views/过往战绩.vue'
import type { DangAnXiangQing } from '@/types'

// 忠实 stub：持有 modelValue 并渲染 slot。拖拽由测试通过事件模拟真实库：
// $emit('start') 触发父组件快照；库内部 onUpdate 通过 $emit('update:modelValue', 重排数组)
// 写回模型；最后 $emit('end', { oldIndex, newIndex, ... }) 触发父组件按索引持久化。
// 注意：父组件已不再读取 DOM，故顺序完全由事件索引决定，与真实库行为一致。
vi.mock('vue-draggable-plus', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    VueDraggable: vue.defineComponent({
      name: 'VueDraggable',
      props: { modelValue: { type: Array, default: () => [] }, disabled: { type: Boolean } },
      emits: ['update:modelValue', 'start', 'end'],
      setup(_props, { slots }) {
        return () =>
          vue.h('div', { class: 'vue-draggable-stub' }, slots.default ? slots.default() : [])
      },
    }),
  }
})

vi.mock('@/api/聊天')

// 身份异步就绪的仿真：dangQianYongHu 初始为 null，只有 await queBaoShenFenJiuXu() 之后才点亮
const shenFenTiJi = vi.hoisted(() => {
  const zhuangTai = {
    dangQianYongHu: null as { id: string } | null,
    yongHuId: 'yong-hu-1',
    queBaoShenFenJiuXu: vi.fn(),
  }
  zhuangTai.queBaoShenFenJiuXu.mockImplementation(async () => {
    await Promise.resolve()
    zhuangTai.dangQianYongHu = { id: zhuangTai.yongHuId }
  })
  return zhuangTai
})

vi.mock('@/stores/用户', () => ({
  使用用户仓库: () => shenFenTiJi,
}))

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:jiaoSeId', name: 'liaoTian', component: { template: '<div>聊天</div>' } },
    ],
  })
}

function zaoDangAn(bu: Partial<DangAnXiangQing> & { id: string }): DangAnXiangQing {
  return {
    jiao_se_id: `jiao-se-${bu.id}`,
    jiao_se_ming_zi: bu.id,
    shi_fou_zha_xing: false,
    jie_guo_lei_xing: '',
    jie_guo_lei_xing_yuan: 'jinxing_zhong',
    shi_fou_feng_cun: false,
    liao_tian_tian_shu: 1,
    xiao_xi_zong_shu: 1,
    fu_pan_shu_ju: null,
    fu_pan_nei_rong: null,
    chuang_jian_shi_jian: '2026-07-01T00:00:00.000Z',
    zui_hou_xiao_xi_shi_jian: null,
    you_xi_jie_shu_shi_jian: null,
    ...bu,
  } as DangAnXiangQing
}

// 三条「进行中」档案，创建时间 甲 < 乙 < 丙，最后对话时间刻意与创建时间反序
function jinXingZhongLieBiao(): DangAnXiangQing[] {
  return [
    zaoDangAn({
      id: 'jia',
      jiao_se_ming_zi: '阿甲',
      chuang_jian_shi_jian: '2026-07-01T00:00:00.000Z',
      zui_hou_xiao_xi_shi_jian: '2026-07-09T00:00:00.000Z',
      mbti_lei_xing: 'ENFP',
    }),
    zaoDangAn({
      id: 'yi',
      jiao_se_ming_zi: '波乙',
      chuang_jian_shi_jian: '2026-07-02T00:00:00.000Z',
      zui_hou_xiao_xi_shi_jian: '2026-07-08T00:00:00.000Z',
      mbti_lei_xing: 'INTJ',
    }),
    zaoDangAn({
      id: 'bing',
      jiao_se_ming_zi: '此丙',
      chuang_jian_shi_jian: '2026-07-03T00:00:00.000Z',
      zui_hou_xiao_xi_shi_jian: '2026-07-07T00:00:00.000Z',
      mbti_lei_xing: 'ISTJ',
    }),
  ]
}

async function guaZai(lieBiao: DangAnXiangQing[]) {
  const { huoQuDangAnLieBiao } = await import('@/api/聊天')
  vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(lieBiao)
  const luYou = chuangJianLuYou()
  await luYou.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(过往战绩, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

function jinXingZhongMingCheng(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper
    .findAll('.zhanji-fenlei-zu')[0]
    .findAll('.jiaose-mingcheng')
    .map((jie) => jie.text())
}

type PaiXuShiLi = {
  paiXuWeiDu: string
  paiXuFangXiang: string
  qieHuanPaiXuWeiDu: (weiDu: string) => void
  qieHuanPaiXuFangXiang: () => void
}

describe('过往战绩排序', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    shenFenTiJi.dangQianYongHu = null
    shenFenTiJi.yongHuId = 'yong-hu-1'
    shenFenTiJi.queBaoShenFenJiuXu.mockImplementation(async () => {
      await Promise.resolve()
      shenFenTiJi.dangQianYongHu = { id: shenFenTiJi.yongHuId }
    })
  })

  describe('身份就绪门（拖拽顺序不持久化的根因）', () => {
    it('读取排序前先等待身份就绪，使用带用户 id 的存储键', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['bing', 'jia', 'yi'], shengli: [], shibai: [] }),
      )

      const wrapper = await guaZai(jinXingZhongLieBiao())

      expect(shenFenTiJi.queBaoShenFenJiuXu).toHaveBeenCalled()
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '阿甲', '波乙'])
    })

    it('拖拽写回的键与首屏读取的键一致，刷新后顺序保持', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['jia', 'yi', 'bing'], shengli: [], shibai: [] }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())

      const shiLi = wrapper.vm as unknown as {
        fenLeiZu: Record<string, DangAnXiangQing[]>
        onTuoZhuaiJieShu: (zhuangTai: string) => void
      }
      const yuanShi = [...shiLi.fenLeiZu.jinxingzhong]
      shiLi.fenLeiZu.jinxingzhong = [yuanShi[2], yuanShi[0], yuanShi[1]]
      // 先让 DOM 按新顺序落位（DOM 权威读取依赖真实落点），再触发结束
      await nextTick()
      shiLi.onTuoZhuaiJieShu('jinxingzhong')
      await flushPromises()

      const cunChu = JSON.parse(localStorage.getItem('zhanJiPaiXu_yong-hu-1') || '{}')
      expect(cunChu.jinxingzhong).toEqual(['bing', 'jia', 'yi'])

      const chongJian = await guaZai(jinXingZhongLieBiao())
      expect(jinXingZhongMingCheng(chongJian)).toEqual(['此丙', '阿甲', '波乙'])
    })

    it('把历史兜底键的顺序迁移到带用户 id 的键并清除兜底键', async () => {
      localStorage.setItem(
        'zhanJiPaiXu',
        JSON.stringify({ jinxingzhong: ['yi', 'bing', 'jia'], shengli: [], shibai: [] }),
      )

      const wrapper = await guaZai(jinXingZhongLieBiao())

      expect(localStorage.getItem('zhanJiPaiXu')).toBeNull()
      const qianYiHou = JSON.parse(localStorage.getItem('zhanJiPaiXu_yong-hu-1') || '{}')
      expect(qianYiHou.jinxingzhong).toEqual(['yi', 'bing', 'jia'])
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['波乙', '此丙', '阿甲'])
    })

    it('真实键已有数据时迁移不覆盖，只清理兜底键', async () => {
      localStorage.setItem(
        'zhanJiPaiXu',
        JSON.stringify({ jinxingzhong: ['yi', 'bing', 'jia'], shengli: [], shibai: [] }),
      )
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['bing', 'yi', 'jia'], shengli: [], shibai: [] }),
      )

      const wrapper = await guaZai(jinXingZhongLieBiao())

      expect(localStorage.getItem('zhanJiPaiXu')).toBeNull()
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '波乙', '阿甲'])
    })
  })

  describe('拖拽手势写回→持久化（覆盖被空 stub 掩盖的真实链路）', () => {
    it('模拟一次拖拽重排：fenLeiZu 顺序改变、持久化、重建后保持', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['jia', 'yi', 'bing'], shengli: [], shibai: [] }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as {
        fenLeiZu: Record<string, DangAnXiangQing[]>
      }

      // 模拟真实库：把第 0 项拖到第 2 位，先 emit update:modelValue（重排数组）再 emit end
      const yuanShi = [...shiLi.fenLeiZu.jinxingzhong]
      const chongPai = [yuanShi[1], yuanShi[2], yuanShi[0]]
      const draggable = wrapper.findComponent({ name: 'VueDraggable' })
      draggable.vm.$emit('update:modelValue', chongPai)
      // 等待 Vue 把新顺序真正落到 DOM（等价于真实拖拽后 DOM 已落位），再触发结束
      await nextTick()
      draggable.vm.$emit('end', {})
      await flushPromises()

      // ① 顺序已改变
      expect(shiLi.fenLeiZu.jinxingzhong.map((x) => x.id)).toEqual(['yi', 'bing', 'jia'])
      // ② 持久化到 localStorage
      const cunChu = JSON.parse(localStorage.getItem('zhanJiPaiXu_yong-hu-1') || '{}')
      expect(cunChu.jinxingzhong).toEqual(['yi', 'bing', 'jia'])
      // ③ 重建组件后顺序保持
      const chongJian = await guaZai(jinXingZhongLieBiao())
      expect(jinXingZhongMingCheng(chongJian)).toEqual(['波乙', '此丙', '阿甲'])
    })

    it('拖拽结束以 oldIndex→newIndex 重排序并持久化（不依赖 DOM 落点）', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['jia', 'yi', 'bing'], shengli: [], shibai: [] }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as { fenLeiZu: Record<string, DangAnXiangQing[]> }
      const draggable = wrapper.findComponent({ name: 'VueDraggable' })

      // 真实库：start 触发快照；把第 0 项拖到第 2 位（oldIndex 0 → newIndex 2）。
      // 故意不 emit update:modelValue，验证最终顺序完全由事件索引重排得出，
      // 而非依赖 force-fallback 下不可靠的 DOM 落点读物。
      draggable.vm.$emit('start', { oldIndex: 0 })
      draggable.vm.$emit('end', {
        oldIndex: 0,
        newIndex: 2,
        oldDraggableIndex: 0,
        newDraggableIndex: 2,
        from: {},
        to: {},
      })
      await flushPromises()

      // ① 模型顺序已被索引重排改变
      expect(shiLi.fenLeiZu.jinxingzhong.map((x) => x.id)).toEqual(['yi', 'bing', 'jia'])
      // ② 持久化到 localStorage
      const cunChu = JSON.parse(localStorage.getItem('zhanJiPaiXu_yong-hu-1') || '{}')
      expect(cunChu.jinxingzhong).toEqual(['yi', 'bing', 'jia'])
      // ③ 重建组件后顺序保持
      const chongJian = await guaZai(jinXingZhongLieBiao())
      expect(jinXingZhongMingCheng(chongJian)).toEqual(['波乙', '此丙', '阿甲'])
    })

    it('fallback 模式：以指针坐标推算目标下标重排（事件索引与 DOM 均不可信）', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['jia', 'yi', 'bing'], shengli: [], shibai: [] }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as { fenLeiZu: Record<string, DangAnXiangQing[]> }
      const draggable = wrapper.findComponent({ name: 'VueDraggable' })

      // 构造 fallback 真实场景：事件索引全部等于起始位（0）且 DOM 不变；
      // 唯一可靠落点来源是「放下瞬间指针坐标」。把 jia 拖到 yi 与 bing 之间：
      // clientY 落在 yi 中点之下、bing 中点之上。
      const paiPiao = [
        { id: 'jia', top: 0 },
        { id: 'yi', top: 10 },
        { id: 'bing', top: 20 },
      ]
      const toMock = {
        querySelectorAll: () =>
          paiPiao.map((p) => {
            const el = document.createElement('div')
            el.setAttribute('data-id', p.id)
            el.getBoundingClientRect = () =>
              ({
                top: p.top,
                height: 10,
                left: 0,
                right: 0,
                bottom: p.top + 10,
                width: 0,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              }) as unknown as DOMRect
            return el
          }),
      }
      const itemMock = document.createElement('div')
      itemMock.setAttribute('data-id', 'jia')
      const originalEvent = { clientY: 18 } as unknown as Event

      draggable.vm.$emit('start', { oldIndex: 0 })
      draggable.vm.$emit('end', {
        oldIndex: 0,
        newIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 0,
        from: toMock,
        to: toMock,
        item: itemMock,
        originalEvent,
      })
      await flushPromises()

      // jia 应被排到 yi 与 bing 之间
      expect(shiLi.fenLeiZu.jinxingzhong.map((x) => x.id)).toEqual(['yi', 'jia', 'bing'])
      const cunChu = JSON.parse(localStorage.getItem('zhanJiPaiXu_yong-hu-1') || '{}')
      expect(cunChu.jinxingzhong).toEqual(['yi', 'jia', 'bing'])
    })
  })

  describe('手动排序下新建对话置顶', () => {
    it('未记录顺序的档案按创建时间倒序排在已记录档案之前', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['jia'], shengli: [], shibai: [] }),
      )

      const wrapper = await guaZai(jinXingZhongLieBiao())

      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '波乙', '阿甲'])
    })
  })

  describe('多维度排序', () => {
    it('默认手动排序，切换维度后按创建时间降序并可持久化偏好', async () => {
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      expect(shiLi.paiXuWeiDu).toBe('shouDong')

      shiLi.qieHuanPaiXuWeiDu('chuangJianShiJian')
      await flushPromises()
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '波乙', '阿甲'])

      const pianHao = JSON.parse(localStorage.getItem('zhanJiPaiXuPianHao_yong-hu-1') || '{}')
      expect(pianHao).toEqual({ weiDu: 'chuangJianShiJian', fangXiang: 'jiangXu' })
    })

    it('切换升序后创建时间由旧到新', async () => {
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      shiLi.qieHuanPaiXuWeiDu('chuangJianShiJian')
      shiLi.qieHuanPaiXuFangXiang()
      await flushPromises()

      expect(shiLi.paiXuFangXiang).toBe('shengXu')
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['阿甲', '波乙', '此丙'])
    })

    it('按最后对话时间降序与创建时间结果不同', async () => {
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      shiLi.qieHuanPaiXuWeiDu('zuiHouDuiHuaShiJian')
      await flushPromises()

      expect(jinXingZhongMingCheng(wrapper)).toEqual(['阿甲', '波乙', '此丙'])
    })

    it('按名称升序使用中文拼音顺序', async () => {
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      shiLi.qieHuanPaiXuWeiDu('mingCheng')
      shiLi.qieHuanPaiXuFangXiang()
      await flushPromises()

      expect(jinXingZhongMingCheng(wrapper)).toEqual(['阿甲', '波乙', '此丙'])
    })

    it('按性格升序，性格为空的档案沉底且不被过滤', async () => {
      const lieBiao = jinXingZhongLieBiao()
      lieBiao[1].mbti_lei_xing = undefined
      const wrapper = await guaZai(lieBiao)
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      shiLi.qieHuanPaiXuWeiDu('xingGe')
      shiLi.qieHuanPaiXuFangXiang()
      await flushPromises()

      expect(jinXingZhongMingCheng(wrapper)).toEqual(['阿甲', '此丙', '波乙'])
    })

    it('性格为空的档案在降序时同样沉底', async () => {
      const lieBiao = jinXingZhongLieBiao()
      lieBiao[1].mbti_lei_xing = undefined
      const wrapper = await guaZai(lieBiao)
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      shiLi.qieHuanPaiXuWeiDu('xingGe')
      await flushPromises()

      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '阿甲', '波乙'])
    })

    it('自动排序维度下拖拽结束不覆盖已保存的手动顺序', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['jia', 'yi', 'bing'], shengli: [], shibai: [] }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi & {
        fenLeiZu: Record<string, DangAnXiangQing[]>
        onTuoZhuaiJieShu: (zhuangTai: string) => void
      }
      shiLi.qieHuanPaiXuWeiDu('mingCheng')
      await flushPromises()

      const yuanShi = [...shiLi.fenLeiZu.jinxingzhong]
      shiLi.fenLeiZu.jinxingzhong = [yuanShi[2], yuanShi[1], yuanShi[0]]
      shiLi.onTuoZhuaiJieShu('jinxingzhong')

      const cunChu = JSON.parse(localStorage.getItem('zhanJiPaiXu_yong-hu-1') || '{}')
      expect(cunChu.jinxingzhong).toEqual(['jia', 'yi', 'bing'])
    })

    it('切回手动排序恢复原有拖拽顺序', async () => {
      localStorage.setItem(
        'zhanJiPaiXu_yong-hu-1',
        JSON.stringify({ jinxingzhong: ['bing', 'jia', 'yi'], shengli: [], shibai: [] }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi

      shiLi.qieHuanPaiXuWeiDu('mingCheng')
      await flushPromises()
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '波乙', '阿甲'])

      shiLi.qieHuanPaiXuWeiDu('shouDong')
      await flushPromises()
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['此丙', '阿甲', '波乙'])
    })

    it('排序偏好按用户隔离，重新挂载后自动恢复', async () => {
      localStorage.setItem(
        'zhanJiPaiXuPianHao_yong-hu-1',
        JSON.stringify({ weiDu: 'mingCheng', fangXiang: 'shengXu' }),
      )
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi

      expect(shiLi.paiXuWeiDu).toBe('mingCheng')
      expect(shiLi.paiXuFangXiang).toBe('shengXu')
      expect(jinXingZhongMingCheng(wrapper)).toEqual(['阿甲', '波乙', '此丙'])
    })

    it('偏好内容非法时回落到默认手动排序', async () => {
      localStorage.setItem('zhanJiPaiXuPianHao_yong-hu-1', '{不是合法 JSON')
      const wrapper = await guaZai(jinXingZhongLieBiao())
      const shiLi = wrapper.vm as unknown as PaiXuShiLi

      expect(shiLi.paiXuWeiDu).toBe('shouDong')
      expect(shiLi.paiXuFangXiang).toBe('jiangXu')
    })
  })

  describe('分组隔离', () => {
    it('三个分类各自独立排序，互不串组', async () => {
      const lieBiao = [
        ...jinXingZhongLieBiao(),
        zaoDangAn({
          id: 'sheng-1',
          jiao_se_ming_zi: '早胜',
          jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
          chuang_jian_shi_jian: '2026-06-01T00:00:00.000Z',
        }),
        zaoDangAn({
          id: 'sheng-2',
          jiao_se_ming_zi: '晚胜',
          jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
          chuang_jian_shi_jian: '2026-06-20T00:00:00.000Z',
        }),
      ]
      const wrapper = await guaZai(lieBiao)
      const shiLi = wrapper.vm as unknown as PaiXuShiLi
      shiLi.qieHuanPaiXuWeiDu('chuangJianShiJian')
      await flushPromises()

      const fenZu = wrapper.findAll('.zhanji-fenlei-zu')
      expect(fenZu[0].findAll('.jiaose-mingcheng').map((jie) => jie.text())).toEqual([
        '此丙',
        '波乙',
        '阿甲',
      ])
      expect(fenZu[1].findAll('.jiaose-mingcheng').map((jie) => jie.text())).toEqual([
        '晚胜',
        '早胜',
      ])
    })
  })
})
