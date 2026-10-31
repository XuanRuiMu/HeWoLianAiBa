import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'
import LiaoTianBeiJingSheZhi from '@/components/聊天背景设置.vue'
import QiPaoZhuTiXuanZeQi from '@/components/气泡主题选择器.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'
import type { WaiGuanChuCan } from '@/config/外观自定义'

vi.mock('@/api/社交', async (yuanShi) => {
  const yuan = await (yuanShi as () => Promise<Record<string, unknown>>)()
  return {
    ...yuan,
    baoCunLiaoTianBeiJing: vi.fn(async () => undefined),
    shangChuanWaiGuanTuPian: vi.fn(async () => '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)),
    baoCunWaiGuan: vi.fn(async (shuJu: Record<string, unknown>) => {
      const zhuan = (lie: Array<Record<string, unknown>>) =>
        lie.map((xiang) => ({
          id: xiang.id,
          ming_cheng: xiang.mingCheng,
          tu_di_zhi: xiang.tuDiZhi,
          wen_zi_yan_se: xiang.wenZiYanSe,
        }))
      return {
        bei_jing: zhuan((shuJu.beiJing || []) as Array<Record<string, unknown>>),
        qi_pao: zhuan((shuJu.qiPao || []) as Array<Record<string, unknown>>),
        bei_jing_fu_gai: shuJu.beiJingFuGai || {},
        qi_pao_fu_gai: shuJu.qiPaoFuGai || {},
        dang_qian_qi_pao: shuJu.dangQianQiPao || { ziJi: '', ai: '' },
      } as WaiGuanChuCan
    }),
  }
})

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 背景源码 = 读('components/聊天背景设置.vue')
const 气泡源码 = 读('components/气泡主题选择器.vue')
const 编辑器源码 = 读('components/外观就地编辑器.vue')

const 媒体地址 = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

const 已挂载: Array<ReturnType<typeof mount>> = []

function 挂载背景() {
  const kuang = mount(LiaoTianBeiJingSheZhi, { attachTo: document.body })
  已挂载.push(kuang)
  return kuang
}

function 挂载气泡() {
  const kuang = mount(QiPaoZhuTiXuanZeQi, { attachTo: document.body })
  已挂载.push(kuang)
  return kuang
}

function 输入框(kuang: ReturnType<typeof mount>): HTMLInputElement {
  return kuang.get('.jiu-di-bian-ji input').element as HTMLInputElement
}

async function 点外部(): Promise<void> {
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  await nextTick()
}

function 准备气泡数据(): void {
  const cang = 使用用户设置仓库()
  cang.waiGuan = {
    beiJing: [],
    qiPao: [
      { id: 'qi-pao-jia', mingCheng: '自定义气泡甲', tuDiZhi: 媒体地址, wenZiYanSe: '#FFFFFF' },
      { id: 'qi-pao-yi', mingCheng: '自定义气泡乙', tuDiZhi: 媒体地址, wenZiYanSe: '#FFFFFF' },
    ],
    beiJingFuGai: {},
    qiPaoFuGai: {},
    dangQianQiPao: { ziJi: '', ai: '' },
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  Element.prototype.getAnimations = () => []
  Element.prototype.animate = () =>
    ({ cancel: () => undefined, finished: Promise.resolve() }) as unknown as Animation
})

afterEach(() => {
  while (已挂载.length) 已挂载.pop()?.unmount()
})

describe('FP-07 聊天背景改名菜单切换', () => {
  it('点另一个背景的改名会换到新菜单：旧草稿丢弃、菜单唯一、新目标聚焦', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载背景()
    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe('晨雾青')

    await kuang.get('.bei-jing-bian-ji-wei .jiu-di-bian-ji input').setValue('改到一半的晨雾')
    expect(kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-ming').text()).toBe('改到一半的晨雾')
    await nextTick()
    expect(document.activeElement).toBe(输入框(kuang))

    await kuang.get('.bei-jing-ka--fenSeMengJing .bei-jing-ka-kong-zhi').trigger('click')
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe('粉色梦境')
    expect(document.activeElement).toBe(输入框(kuang))
    expect(kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-ming').text()).toBe('晨雾青')
    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})
  })

  it('换到 B 后保存只写 B，A 始终保持原名', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载背景()
    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('不该保存的晨雾')
    await kuang.get('.bei-jing-ka--fenSeMengJing .bei-jing-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('新粉色梦境')
    await kuang.get('.jiu-di-bian-ji-an-niu--zhu').trigger('click')
    await flushPromises()
    await nextTick()

    expect(设置仓库.quBeiJingYuSheMing('fenSeMengJing')).toBe('新粉色梦境')
    expect(设置仓库.quBeiJingYuSheMing('chenWuQing')).toBe('晨雾青')
    expect(设置仓库.waiGuan.beiJingFuGai.chenWuQing).toBeUndefined()
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(0)
  })

  it('Esc 取消不保存，菜单关闭', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载背景()
    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('按了 Esc')
    await kuang.get('.jiu-di-bian-ji input').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(0)
    expect(设置仓库.quBeiJingYuSheMing('chenWuQing')).toBe('晨雾青')
    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})
  })

  it('失焦与点击其他区域都不保存，点击外部即取消', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载背景()
    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    const shuRu = 输入框(kuang)
    await kuang.get('.jiu-di-bian-ji input').setValue('失焦草稿')
    shuRu.blur()
    await nextTick()
    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})

    await 点外部()
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(0)
    expect(设置仓库.quBeiJingYuSheMing('chenWuQing')).toBe('晨雾青')
    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})
  })

  it('再次点击同一条目的改名只重新聚焦，不重建草稿也不保存', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载背景()
    const 铅笔 = kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi')
    await 铅笔.trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('还在写')
    await nextTick()
    输入框(kuang).blur()
    expect(document.activeElement).not.toBe(输入框(kuang))

    await 铅笔.trigger('click')
    await nextTick()
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe('还在写')
    expect(document.activeElement).toBe(输入框(kuang))
    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})
  })

  it('空名称不提交也不写库，错误提示仍由编辑器本地拦截', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载背景()
    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('   ')
    await kuang.get('.jiu-di-bian-ji-an-niu--zhu').trigger('click')
    await flushPromises()

    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})
    expect(kuang.get('.chang-fang-kuang-cuo-wu').text()).toBe(
      huoQuFanYi('sheZhi', 'waiGuanMingChengWeiKong'),
    )
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
  })
})

describe('FP-07 聊天气泡改名菜单切换', () => {
  it('自定义气泡 A→B：菜单唯一、草稿换成 B、A 不保存', async () => {
    const 设置仓库 = 使用用户设置仓库()
    准备气泡数据()
    const kuang = 挂载气泡()
    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-jia"] .qi-pao-ka-kong-zhi').trigger('click')
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe('自定义气泡甲')
    await kuang.get('.jiu-di-bian-ji input').setValue('改到一半的甲')
    await nextTick()

    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-yi"] .qi-pao-ka-kong-zhi').trigger('click')
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe('自定义气泡乙')
    expect(document.activeElement).toBe(输入框(kuang))
    expect(设置仓库.waiGuan.qiPao[0].mingCheng).toBe('自定义气泡甲')
    expect(设置仓库.waiGuan.qiPao[1].mingCheng).toBe('自定义气泡乙')
  })

  it('自定义气泡换到 B 后保存只写 B', async () => {
    const 设置仓库 = 使用用户设置仓库()
    准备气泡数据()
    const kuang = 挂载气泡()
    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-jia"] .qi-pao-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('不该保存的甲')
    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-yi"] .qi-pao-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('新的乙')
    await kuang.get('.jiu-di-bian-ji-an-niu--zhu').trigger('click')
    await flushPromises()
    await nextTick()

    expect(设置仓库.waiGuan.qiPao[1].mingCheng).toBe('新的乙')
    expect(设置仓库.waiGuan.qiPao[0].mingCheng).toBe('自定义气泡甲')
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(0)
  })

  it('预设改名后再点自定义气泡，预设菜单关闭且预设不保存', async () => {
    const 设置仓库 = 使用用户设置仓库()
    准备气泡数据()
    const kuang = 挂载气泡()
    await kuang.get('[data-yu-she="weiXinLv"] .qi-pao-ka-kong-zhi').trigger('click')
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    const 预设原名 = 输入框(kuang).value
    await kuang.get('.jiu-di-bian-ji input').setValue('改到一半的预设')

    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-jia"] .qi-pao-ka-kong-zhi').trigger('click')
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe('自定义气泡甲')
    expect(设置仓库.waiGuan.qiPaoFuGai).toEqual({})
    expect(设置仓库.quQiPaoYuSheMing('weiXinLv')).toBe(预设原名)
  })

  it('预设 A→预设 B：菜单换成 B，A 不保存', async () => {
    const 设置仓库 = 使用用户设置仓库()
    const kuang = 挂载气泡()
    await kuang.get('[data-yu-she="weiXinLv"] .qi-pao-ka-kong-zhi').trigger('click')
    const 甲原名 = 输入框(kuang).value
    await kuang.get('.jiu-di-bian-ji input').setValue('改到一半的绿')
    await kuang.get('[data-yu-she="tianKongLan"] .qi-pao-ka-kong-zhi').trigger('click')
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(输入框(kuang).value).toBe(设置仓库.quQiPaoYuSheMing('tianKongLan'))
    expect(输入框(kuang).value).not.toBe('改到一半的绿')
    expect(设置仓库.waiGuan.qiPaoFuGai).toEqual({})
    expect(设置仓库.quQiPaoYuSheMing('weiXinLv')).toBe(甲原名)
  })

  it('点击其他区域取消气泡改名，不保存', async () => {
    const 设置仓库 = 使用用户设置仓库()
    准备气泡数据()
    const kuang = 挂载气泡()
    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-jia"] .qi-pao-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('不保存')
    await 点外部()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(0)
    expect(设置仓库.waiGuan.qiPao[0].mingCheng).toBe('自定义气泡甲')
  })
})

describe('FP-07 背景与气泡同屏只保留一个改名菜单', () => {
  const 组合 = defineComponent({
    render: () => h('div', [h(LiaoTianBeiJingSheZhi), h(QiPaoZhuTiXuanZeQi)]),
  })

  function 挂载组合() {
    const kuang = mount(组合, { attachTo: document.body })
    已挂载.push(kuang)
    return kuang
  }

  it('背景改名打开后点气泡改名：背景菜单关闭且不保存，气泡菜单接管', async () => {
    const 设置仓库 = 使用用户设置仓库()
    准备气泡数据()
    const kuang = 挂载组合()
    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    await kuang.get('.bei-jing-bian-ji-wei input').setValue('背景草稿')
    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)

    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-jia"] .qi-pao-ka-kong-zhi').trigger('click')
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(kuang.find('.bei-jing-bian-ji-wei').exists()).toBe(false)
    expect(kuang.find('.qi-pao-bian-ji-wei').exists()).toBe(true)
    expect(输入框(kuang).value).toBe('自定义气泡甲')
    expect(设置仓库.waiGuan.beiJingFuGai).toEqual({})
    expect(kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-ming').text()).toBe('晨雾青')
  })

  it('气泡改名打开后点背景改名：气泡菜单关闭且不保存，背景菜单接管', async () => {
    const 设置仓库 = 使用用户设置仓库()
    准备气泡数据()
    const kuang = 挂载组合()
    await kuang.get('.qi-pao-zi-ding-yi-wei[data-id="qi-pao-jia"] .qi-pao-ka-kong-zhi').trigger('click')
    await kuang.get('.jiu-di-bian-ji input').setValue('气泡草稿')

    await kuang.get('.bei-jing-ka--chenWuQing .bei-jing-ka-kong-zhi').trigger('click')
    await nextTick()

    expect(kuang.findAllComponents(WaiGuanJiuDiBianJi)).toHaveLength(1)
    expect(kuang.find('.qi-pao-bian-ji-wei').exists()).toBe(false)
    expect(输入框(kuang).value).toBe('晨雾青')
    expect(设置仓库.waiGuan.qiPao[0].mingCheng).toBe('自定义气泡甲')
  })
})

describe('FP-07 单份改名状态', () => {
  it('气泡选择器只渲染一处改名面板，不再有预设/自定义两套状态', () => {
    expect((气泡源码.match(/<WaiGuanJiuDiBianJi/g) ?? []).length).toBe(1)
    expect(气泡源码).not.toContain('预设编辑中')
    expect(气泡源码).not.toContain('bianJiZhong')
    expect(气泡源码).not.toContain('条目预览值')
    expect(气泡源码).not.toContain('预设预览值')
  })

  it('背景不再用编辑中硬拦截切换', () => {
    expect(背景源码).not.toContain('if (编辑键.value && 编辑键.value !== 键(模式, 项)) return')
    expect(背景源码).toContain('使用外观编辑仓库')
    expect(气泡源码).toContain('使用外观编辑仓库')
  })

  it('改名入口带统一标记，编辑器据此区分“切换目标”与“点其他区域取消”', () => {
    expect(编辑器源码).toContain("closest('[data-wai-guan-gai-ming]')")
    expect(背景源码).toContain('data-wai-guan-gai-ming')
    expect(气泡源码).toContain('data-wai-guan-gai-ming')
  })
})
