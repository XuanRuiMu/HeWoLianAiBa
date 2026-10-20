import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import 主页内容 from '@/views/主页内容.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/翻译表'

vi.mock('vue-router', async (importOriginal) => {
  const 原 = await importOriginal<typeof import('vue-router')>()
  return { ...原, useRouter: () => ({ push: () => {} }) }
})

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 读源 = () => readFileSync(resolve(本目录, '..', 'views', '主页内容.vue'), 'utf8')

function 取块(源: string, 选择器: string): string {
  const 始 = 源.indexOf(选择器 + ' {')
  if (始 < 0) return ''
  const 开 = 源.indexOf('{', 始)
  let 层 = 0
  for (let 位 = 开; 位 < 源.length; 位 += 1) {
    if (源[位] === '{') 层 += 1
    else if (源[位] === '}') {
      层 -= 1
      if (层 === 0) return 源.slice(开, 位 + 1)
    }
  }
  return ''
}

const 揭示位 = [
  '.huanying-qu',
  '.wanjia-ka',
  '.putong-moshi-kapian',
  '.tiaozhan-moshi-kapian',
  '.zhuangtai-tiao',
]

const 玩家 = {
  id: '4c2a9dcd-16fe-4625-804d-08c7992270bc',
  ni_cheng: '玄锐暮',
  yong_hu_ming: '玄锐暮',
  tou_xiang: null,
  qian_ming: null,
}

function 建组件(序号: number, 用户: unknown) {
  const 仓 = 使用用户仓库()
  仓.主页入场序号 = 序号
  仓.dangQianYongHu = 用户 as never
  return mount(主页内容)
}

function 玩家卡槽们(包: ReturnType<typeof 建组件>): string[] {
  return Array.from(包.find('.wanjia-ka').element.children).map(
    (元素) => 元素.tagName + ':' + 元素.classList[0],
  )
}

describe('主页信息层级与几何稳定', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('五个位置在入场序号为 0 时全部在场，只由揭示类控制显隐', () => {
    const 包 = 建组件(0, 玩家)
    for (const 选择器 of 揭示位) {
      const 元素 = 包.find(选择器)
      expect(元素.exists(), 选择器 + ' 未预占位').toBe(true)
      expect(元素.classes(), 选择器 + ' 提前可见').not.toContain('ru-chang-ke-jian')
    }
    expect(包.findAll('.moshi-kapian').length).toBe(2)
  })

  it('揭示按序号逐个推进，入口卡在揭示前 inert', async () => {
    const 源含 = 读源()
    const 包 = 建组件(0, 玩家)
    const 仓 = 使用用户仓库()
    expect(源含).toContain(':inert="!入场可视(3)"')
    expect(源含).toContain(':inert="!入场可视(4)"')
    expect(包.find('.putong-moshi-kapian').attributes('inert')).toBeDefined()
    expect(包.find('.tiaozhan-moshi-kapian').attributes('inert')).toBeDefined()
    expect(包.find('.putong-moshi-kapian').attributes('aria-hidden')).toBe('true')
    expect(包.find('.tiaozhan-moshi-kapian').attributes('aria-hidden')).toBe('true')
    for (let 序 = 1; 序 <= 5; 序 += 1) {
      仓.主页入场序号 = 序
      await nextTick()
      for (const [所, 选择器] of 揭示位.entries()) {
        expect(
          包.find(选择器).classes().includes('ru-chang-ke-jian'),
          `第 ${所 + 1} 位在序号 ${序} 的显隐`,
        ).toBe(所 + 1 <= 序)
      }
    }
    expect(包.find('.putong-moshi-kapian').attributes('aria-hidden')).toBeUndefined()
    expect(包.find('.tiaozhan-moshi-kapian').attributes('aria-hidden')).toBeUndefined()
  })

  it('数据到位与缺数据时玩家卡结构完全一致，只有文字不同', () => {
    const 有数据 = 建组件(2, 玩家)
    setActivePinia(createPinia())
    const 无数据 = 建组件(2, null)
    expect(玩家卡槽们(无数据)).toEqual(玩家卡槽们(有数据))
  })

  it('玩家卡按真实资料渲染，空字段落翻译表文案', () => {
    const 包 = 建组件(2, 玩家)
    const 卡 = 包.find('.wanjia-ka')
    expect(卡.find('.wanjia-ming').text()).toBe(玩家.ni_cheng)
    expect(卡.find('.wanjia-bianhao').text()).toBe(
      huoQuFanYi('zhuYe', 'bianHao') + ' ' + 玩家.id.slice(0, 8).toUpperCase(),
    )
    expect(卡.find('.wanjia-qianming').text()).toBe(huoQuFanYi('zhuYe', 'zanWuQianMing'))
    expect(卡.find('.wanjia-zhuangtai').text()).toBe(huoQuFanYi('zhuYe', 'ziLiaoDaiWanShan'))
    expect(卡.find('.wanjia-zhuangtai').classes()).toContain('wanjia-zhuangtai-qiang')
    expect(卡.text()).not.toMatch(/undefined|null|NaN/)
  })

  it('无用户数据时玩家卡落空态文案且不再强调', () => {
    const 包 = 建组件(2, null)
    const 卡 = 包.find('.wanjia-ka')
    expect(卡.find('.wanjia-ming').text()).toBe(huoQuFanYi('zhuYe', 'wanJiaZhanWeiMing'))
    expect(卡.find('.wanjia-bianhao').text()).toBe(huoQuFanYi('zhuYe', 'bianHaoZanWei'))
    expect(卡.find('.wanjia-zhuangtai').text()).toBe(huoQuFanYi('zhuYe', 'ziLiaoTongBuZhong'))
    expect(卡.find('.wanjia-zhuangtai').classes()).not.toContain('wanjia-zhuangtai-qiang')
    expect(卡.text()).not.toMatch(/undefined|null|NaN/)
  })

  it('字号全部取自局部尺度令牌，字重只有 400 与 600', () => {
    const 源 = 读源()
    expect(源).not.toMatch(/font-size:\s*\d/)
    const 字重们 = [...源.matchAll(/font-weight:\s*(\d+)/g)].map((匹配) => 匹配[1])
    expect([...new Set(字重们)].sort()).toEqual(['400', '600'])
    expect(源).toContain('--zj-zihao-tou: calc(var(--ziti-da) * 4 / 3)')
    expect(源).toContain('--zj-zihao-ming: var(--ziti-da)')
    expect(源).toContain('--zj-zihao-wen: var(--ziti-zhong)')
    expect(源).toContain('--zj-zihao-fu: var(--ziti-xiao)')
  })

  it('文字色收敛为三档中性色加一个强调色，无半透明白字', () => {
    const 源 = 读源()
    expect(源).not.toContain('--wenben-tishi')
    expect(源).not.toMatch(/color:\s*rgba\(/)
    const 色们 = [...源.matchAll(/^\s{2}color:\s*([^;]+);$/gm)].map((匹配) => 匹配[1].trim())
    const 允许 = new Set([
      'var(--kapian-mian-biaoti)',
      'var(--kapian-mian-zhengwen)',
      'var(--zj-wen-san)',
      'var(--zj-zhu-wen)',
      'var(--zj-zhu)',
    ])
    for (const 值 of 色们) expect(允许.has(值), '越界文字色 ' + 值).toBe(true)
    expect(色们.filter((值) => 值 === 'var(--zj-zhu-wen)').length).toBeGreaterThanOrEqual(2)
    expect(色们.filter((值) => 值 === 'var(--zj-wen-san)').length).toBeGreaterThanOrEqual(5)
  })

  it('强调色只有一个来源，挑战卡不自带第二套配色', () => {
    const 源 = 读源()
    expect(源).not.toContain('--nuanhui-lan')
    expect(源).not.toContain('--yanse-biaobai')
    expect(源.match(/--zj-zhu:\s*var\(--qiangdiao-fen\)/g)?.length).toBe(1)
    expect(取块(源, '.putong-moshi-kapian')).toContain('var(--zj-zhu)')
    expect(取块(源, '.tiaozhan-moshi-kapian')).not.toContain('--zj-zhu')
  })

  it('间距声明全部走八档刻度，无裸 px', () => {
    const 源 = 读源()
    const 间距项 = [...源.matchAll(/^\s*(margin|padding|gap|row-gap|column-gap)[a-z-]*:\s*([^;]+);$/gim)]
    expect(间距项.length).toBeGreaterThan(10)
    for (const 项 of 间距项) {
      const 剥后 = 项[2].replace(/var\([^)]*\)/g, '').replace(/calc\(/g, '')
      expect(剥后, 项[2]).not.toMatch(/\d+px/)
    }
  })

  it('卡面一律不透明，文字对比度可算', () => {
    const 源 = 读源()
    expect(源).not.toMatch(/background(-color)?:\s*rgba\(/)
    expect(源).toContain('--zj-mian: var(--beijing-kaopian)')
    expect(源.match(/background: var\(--zj-(mian|mian-er|zhu-mian|zhu-mian-er)\)/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('单行文本锁死三件套，头像与品牌标有确定盒子', () => {
    const 源 = 读源()
    for (const 选择器 of ['.wanjia-ming', '.wanjia-bianhao', '.wanjia-qianming']) {
      const 块 = 取块(源, 选择器)
      expect(块, 选择器).toContain('white-space: nowrap')
      expect(块, 选择器).toContain('text-overflow: ellipsis')
      expect(块, 选择器).toContain('overflow: hidden')
    }
    const 头像位 = 取块(源, '.wanjia-touxiang-wei')
    expect(头像位).toContain('width: var(--zj-touxiang)')
    expect(头像位).toContain('height: var(--zj-touxiang)')
    expect(头像位).toContain('overflow: hidden')
    const 品牌标 = 取块(源, '.pinpai-logo')
    expect(品牌标).toContain('width: var(--jiange-da)')
    expect(品牌标).toContain('height: var(--jiange-da)')
  })

  it('行高一律取整像素刻度，不出现亚像素行高', () => {
    const 源 = 读源()
    const 行高们 = [...源.matchAll(/^\s{2}line-height:\s*([^;]+);$/gm)].map((匹配) => 匹配[1].trim())
    expect(行高们.length).toBeGreaterThanOrEqual(10)
    for (const 值 of 行高们) {
      expect(值, 值).toMatch(
        /^(var\(--jiange-[a-z0-9]+\)|calc\(var\(--jiange-[a-z0-9]+\) [+-] var\(--jiange-[a-z0-9]+\)\))$/,
      )
    }
  })

  it('过渡与动画不碰几何属性，入场关键帧只有 opacity 与 transform', () => {
    const 源 = 读源()
    expect(源.match(/@keyframes/g)?.length).toBe(1)
    for (const 匹配 of 源.matchAll(/transition:[^;]+;/g)) {
      expect(匹配[0]).not.toMatch(/height|width|margin|padding|top|left|right|bottom/)
    }
    const 关键帧 = 取块(源, '@keyframes zhuye-ru-chang')
    for (const 属性 of ['width', 'height', 'margin', 'padding', 'top', 'left', 'right', 'bottom']) {
      expect(关键帧).not.toContain(属性)
    }
    expect(关键帧).toContain('opacity')
    expect(关键帧).toContain('transform')
  })

  it('键盘焦点不被抹掉，动效可降级', () => {
    const 源 = 读源()
    expect(源).not.toMatch(/outline:\s*(none|0)/)
    const 降级 = 取块(源, '@media (prefers-reduced-motion: reduce)')
    expect(降级).toContain('animation: none')
    expect(降级).toContain('transition: none')
    expect(降级).toContain('.ka-jian')
  })

  it('模板不写死中文，新增文案键全部有值', () => {
    const 源 = 读源()
    const 模板 = 源.slice(源.indexOf('<template>'), 源.indexOf('</template>'))
    expect(模板).not.toMatch(/>[^<>{}]*[\u4e00-\u9fa5][^<>{}]*</)
    const 键们 = [
      'xuanZeMoShi',
      'wanJiaZhanWeiMing',
      'bianHao',
      'bianHaoZanWei',
      'zanWuQianMing',
      'ziLiaoYiWanShan',
      'ziLiaoDaiWanShan',
      'ziLiaoTongBuZhong',
    ]
    for (const 键 of 键们) {
      expect(huoQuFanYi('zhuYe', 键 as never).trim(), 键).not.toBe('')
      expect(源, 键).toContain("huoQuFanYi('zhuYe', '" + 键 + "')")
    }
  })
})
