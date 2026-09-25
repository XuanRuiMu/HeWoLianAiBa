import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import 战绩分类管理 from '@/components/战绩分类管理.vue'
import type { ZhanJiFenLei } from '@/types'

const moRenId = '00000000-0000-4000-8000-000000000001'
const ziDingId = '00000000-0000-4000-8000-000000000002'
const yongFa = vi.hoisted(() => ({ queRen: true }))
vi.stubGlobal('confirm', (...args: unknown[]) => yongFa.queRen && args.length > 0)

const fenLeiLieBiao: ZhanJiFenLei[] = [
  { id: moRenId, name: '默认分类', is_default: true, record_count: 2, version: 0 },
  { id: ziDingId, name: '收藏夹', is_default: false, record_count: 1, version: 3 },
]

function zhuangPei() {
  return mount(战绩分类管理, {
    props: {
      fenLeiLieBiao,
      dangQianFenLeiId: moRenId,
      caoZuoZhong: false,
    },
  })
}

describe('战绩分类管理', () => {
  beforeEach(() => {
    yongFa.queRen = true
  })

  it('分类按钮切换当前分类并显示服务端名称与数量', async () => {
    const wrapper = zhuangPei()
    const anNiu = wrapper.findAll('.fenlei-biao-qian')[1]

    expect(anNiu.text()).toContain('收藏夹')
    expect(anNiu.text()).toContain('1')
    await anNiu.trigger('click')

    expect(wrapper.emitted('qieHuan')?.[0]).toEqual([ziDingId])
  })

  it('默认分类不提供改名和删除入口，自定义分类提供', () => {
    const wrapper = zhuangPei()

    expect(wrapper.findAll('.gengMing-fenlei-anniu')).toHaveLength(1)
    expect(wrapper.findAll('.shanChu-fenlei-anniu')).toHaveLength(1)
    expect(wrapper.find(`.fenlei-biao-qian[data-id="${moRenId}"] .gengMing-fenlei-anniu`).exists()).toBe(false)
    expect(wrapper.find(`.fenlei-biao-qian[data-id="${moRenId}"] .shanChu-fenlei-anniu`).exists()).toBe(false)
  })

  it('创建与重命名共用表单，提交去除首尾空白', async () => {
    const wrapper = zhuangPei()
    await wrapper.find('.chuangJian-fenlei-anniu').trigger('click')
    const input = wrapper.get('.fenlei-ming-cheng-input')
    await input.setValue('  收藏夹  ')
    await wrapper.find('.fenlei-bian-ji').trigger('submit')
    expect(wrapper.emitted('chuangJian')?.[0]).toEqual(['收藏夹'])

    await wrapper.find('.gengMing-fenlei-anniu').trigger('click')
    await wrapper.get('.fenlei-ming-cheng-input').setValue('  重要回忆  ')
    await wrapper.find('.fenlei-bian-ji').trigger('submit')
    expect(wrapper.emitted('gengMing')?.[0]).toEqual([ziDingId, '重要回忆'])
  })

  it('取消表单不提交任何变更', async () => {
    const wrapper = zhuangPei()
    await wrapper.find('.chuangJian-fenlei-anniu').trigger('click')
    await wrapper.get('.fenlei-ming-cheng-input').setValue('无效')
    await wrapper.find('.fenlei-qu-xiao').trigger('click')

    expect(wrapper.find('.fenlei-ming-cheng-input').exists()).toBe(false)
    expect(wrapper.emitted('chuangJian')).toBeUndefined()
  })

  it('删除必须确认，取消不发事件', async () => {
    const wrapper = zhuangPei()
    yongFa.queRen = false
    await wrapper.find('.shanChu-fenlei-anniu').trigger('click')
    expect(wrapper.emitted('shanChu')).toBeUndefined()

    yongFa.queRen = true
    await wrapper.find('.shanChu-fenlei-anniu').trigger('click')
    expect(wrapper.emitted('shanChu')?.[0]).toEqual([ziDingId])
  })

  it('操作中禁用分类写入口和切换入口', () => {
    const wrapper = mount(战绩分类管理, {
      props: {
        fenLeiLieBiao,
        dangQianFenLeiId: moRenId,
        caoZuoZhong: true,
      },
    })

    for (const anniu of wrapper.findAll('button')) expect(anniu.attributes('disabled')).toBeDefined()
  })

  it('移动端不横向撑破、双主题有样式且 reduced-motion 关闭过渡', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../components/战绩分类管理.vue'), 'utf8')
    expect(yuanMa).toMatch(/\.fenlei-guan-li-lan\s*\{[^}]*max-width:\s*100%/s)
    expect(yuanMa).toMatch(/\.fenlei-biao-qian-lan\s*\{[^}]*overflow-x:\s*auto/s)
    expect(yuanMa).toContain(":root[data-theme='light']")
    expect(yuanMa).toContain('var(--beijing-kaopian)')
    expect(yuanMa).toContain('var(--wenben-zhuse)')
    expect(yuanMa).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
    expect(yuanMa).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(yuanMa).toMatch(/@media\s*\(max-width:\s*640px\)/)
  })
})
