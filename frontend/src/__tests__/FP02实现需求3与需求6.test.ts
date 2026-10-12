import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

const 组件源 = readFileSync(
  resolve(__dirname, '../components/聊天/图文输入区.vue'),
  'utf-8',
).replace(/\/\*[\s\S]*?\*\//g, '')
const 分类源 = readFileSync(
  resolve(__dirname, '../components/战绩分类管理.vue'),
  'utf-8',
).replace(/\/\*[\s\S]*?\*\//g, '')
const 翻译框源 = readFileSync(
  resolve(__dirname, '../components/聊天/翻译结果框.vue'),
  'utf-8',
).replace(/\/\*[\s\S]*?\*\//g, '')

function guaZai() {
  const wrapper = mount(TuWenShuRuQu, {
    props: {
      kuaiLieBiao: [],
      wenBen: '',
      guangBiao: { kuaiId: '', pianYi: 0 },
      zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
      zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
    },
    attachTo: document.body,
  })
  const 已挂载: Array<{ unmount: () => void }> = [wrapper]
  return { wrapper, 回收: () => { for (const 项 of 已挂载.splice(0)) 项.unmount() } }
}

describe('FP-02-实现 需求3 矩形契约：分类名输入框已有八层自绘只染色已有边框', () => {
  it('八层渐变仍在位：四层聚焦色在前染色、四层已有边框色在后打底', () => {
    const 背景图 = /\.fenlei-ming-cheng-input\s*\{[^}]*background-image:([^;]+);/s.exec(分类源)?.[1] ?? ''
    const 渐变数 = (背景图.match(/linear-gradient/g) ?? []).length
    expect(渐变数, `八层自绘层数=${渐变数}≠8`).toBe(8)
    const 前四 = 背景图.split('linear-gradient').slice(1, 5).join(' ')
    const 后四 = 背景图.split('linear-gradient').slice(5, 9).join(' ')
    expect(前四).toMatch(/--jujiao-huan-yanse/)
    expect(后四).toMatch(/--fenlei-biankuang/)
    expect(后四).not.toMatch(/--jujiao-huan-yanse/)
  })

  it('逆时针顺序：下→左→上→右两组同序，不新增元素只改已有边框色', () => {
    const 位置 = /background-position:\s*([^;]+);/s.exec(分类源)?.[1] ?? ''
    const 两组 = 位置.split(',').map((段) => 段.trim())
    expect(两组.length).toBe(8)
    expect(两组.slice(0, 4)).toEqual(两组.slice(4, 8))
    expect(两组.slice(0, 4).join('|')).toContain('left bottom')
    expect(分类源).not.toMatch(/\.fenlei-ming-cheng-input::(before|after)/)
  })

  it('圆角化不断裂：输入框圆角仍吃令牌且描边画在边框盒上', () => {
    expect(分类源).toMatch(/\.fenlei-ming-cheng-input[\s\S]{0,400}?border-radius:\s*10px/)
    expect(分类源).toMatch(/background-origin:\s*border-box/)
  })
})

describe('FP-02-实现 需求3 聊天输入框：外壳静态边框无焦点高亮，本体无边框', () => {
  it('外壳只有静态边框声明，无 focus / focus-within / focus-visible 高亮分支', () => {
    const 外壳 = /\.shuru-kuang-waike\s*\{[^}]*\}/s.exec(组件源)?.[0] ?? ''
    expect(外壳).not.toBe('')
    expect(外壳).toMatch(/border:\s*var\(--shuru-kuang-biankuang\)\s+solid/)
    expect(组件源).not.toMatch(/\.shuru-kuang-waike\s*:(focus|focus-within|focus-visible)/)
    expect(组件源).not.toMatch(/\.shuru-kuang\s*:(focus|focus-visible)\s*\{[^}]*border/)
  })

  it('本体边框为 none：焦点不另画边框色', () => {
    const 本体 = /\.shuru-kuang\s*\{[^}]*\}/s.exec(组件源)?.[0] ?? ''
    expect(本体).toMatch(/border:\s*none/)
  })
})

describe('FP-02-实现 需求6 空态拼音：组合期恢复实色且摘占位', () => {
  it('组合期挂类：compositionstart 加类、compositionend 摘类后走正常编辑链', async () => {
    const { wrapper, 回收 } = guaZai()
    await nextTick()
    await nextTick()
    const cao = wrapper.find('.shuru-kuang')
    expect(cao.exists(), '图文输入区未渲染：挂台接线与既有用例同构仍找不到 .shuru-kuang').toBe(true)
    expect(cao.classes()).toContain('wei-kong')
    await cao.trigger('compositionstart')
    expect(cao.classes()).toContain('zu-he-zhong')
    expect(cao.classes()).not.toContain('wei-kong')
    await cao.trigger('compositionend')
    await nextTick()
    await nextTick()
    expect(cao.classes()).not.toContain('zu-he-zhong')
    expect(cao.classes()).toContain('wei-kong')
    回收()
  })

  it('组合期实色：组合类覆盖空态透明色并隐藏占位伪元素', () => {
    expect(组件源).toMatch(/\.shuru-kuang\.zu-he-zhong\s*\{[^}]*color:\s*var\(--wenben-zhuse\)/)
    expect(组件源).toMatch(/\.shuru-kuang\.zu-he-zhong::before\s*\{[^}]*content:\s*none/)
  })
})

describe('FP-02-实现 翻译下拉：框内两枚下拉同源箭头同度量', () => {
  it('框内两枚下拉同源同度量：同一条规则供给、箭头落点一致', () => {
    const 下拉数 = (翻译框源.match(/fanyi-yuyan-xiala/g) ?? []).length
    expect(下拉数).toBeGreaterThanOrEqual(2)
    const 箭头 = /\.fanyi-yuyan-xiala\s*\{[^}]*background-image:[^}]*background-position:\s*right 12px center/s.exec(
      翻译框源,
    )?.[0] ?? ''
    expect(箭头).not.toBe('')
  })
})
