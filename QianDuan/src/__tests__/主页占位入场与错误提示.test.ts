import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 请求错误 from '@/components/请求错误.vue'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { huoQuFanYi } from '@/config/翻译表'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 读源 = (...路径段: string[]) => readFileSync(resolve(本目录, '..', ...路径段), 'utf8')
const 取花括号块 = (源: string, 起始: string) => {
  const 始 = 源.indexOf(起始)
  if (始 < 0) return ''
  const 开 = 源.indexOf('{', 始)
  if (开 < 0) return ''
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
describe('主页占位入场', () => {
  it('五个位置始终占位在场，仅由揭示类控制显隐', () => {
    const 源 = 读源('views', '主页内容.vue')
    expect(源).not.toContain('v-if="入场可视(')
    for (const 序 of [1, 2, 3, 4, 5]) {
      expect(源, '第' + 序 + '位缺揭示类').toContain("'ru-chang-ke-jian': 入场可视(" + 序 + ')')
    }
    expect(源).toContain(':inert="!入场可视(3)"')
    expect(源).toContain(':inert="!入场可视(4)"')
    expect(源).toContain('.moshi-kapian:not(.ru-chang-ke-jian)')
  })

  it('入场动画只有 opacity 与 transform 合成，且带 0.2 秒文字延迟', () => {
    const 源 = 读源('views', '主页内容.vue')
    const 花括号 = 取花括号块(源, '@keyframes zhuye-ru-chang')
    expect(花括号).not.toBe('')
    for (const 属性 of ['width', 'height', 'margin', 'padding', 'top', 'left', 'right', 'bottom']) {
      expect(花括号).not.toContain(属性)
    }
    expect(花括号).toContain('opacity')
    expect(花括号).toContain('transform')
    expect(源).toContain('var(--deng-lu-shi-xu) var(--quxian-biao-zhun) var(--zhuye-wen-zi-yan-shi) backwards')
  })
})

describe('错误提示设计语言', () => {
  it('请求错误复用全局 .cuowu-tishi 底面并自带红色图标', () => {
    const 包 = mount(请求错误, { props: { cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.AUTH_INVALID_CREDENTIALS }) } })
    expect(包.find('.qian-tai-cuo-wu').classes()).toContain('cuowu-tishi')
    expect(包.find('.qian-tai-cuo-wu-tubiao').exists()).toBe(true)
    expect(包.find('.qian-tai-cuo-wu-biaoti').exists()).toBe(false)
    expect(包.find('.qian-tai-cuo-wu-wen-an').text()).toBe(huoQuFanYi('lianAi', 'LianAi_028'))
  })

  it('错误面不再自建深色玻璃与左侧粗色条，只复用全局提示面', () => {
    const 源 = 读源('components', '请求错误.vue')
    expect(源).not.toContain('box-shadow: inset')
    expect(源).not.toContain('background: color-mix')
    expect(源).toContain('class="qian-tai-cuo-wu cuowu-tishi"')
  })

  it('全局 .cuowu-tishi 提供同一套浅红底、1px 红边与圆角', () => {
    const 源 = 读源('styles', '全局.css')
    const 块 = 取花括号块(源, '.cuowu-tishi')
    expect(块).toContain('--cuo-wu-mian: color-mix(in srgb, var(--cuowu-yanse) 9%, var(--beijing-kaopian))')
    expect(块).toContain('--cuo-wu-bian: color-mix(in srgb, var(--cuowu-yanse) 38%, transparent)')
    expect(块).toContain('--cuo-wu-zhengwen: color-mix(in srgb, var(--wenben-ciuse) 70%, var(--wenben-zhuse))')
    expect(块).toContain('border: 1px solid var(--cuo-wu-bian)')
    expect(块).toContain('border-radius: var(--yuanjiao-zhong)')
    expect(块).toContain('box-shadow: none')
  })

  it('登录链路不再出现加载中小字标识', () => {
    const 源 = 读源('layouts', '认证布局.vue')
    expect(源).not.toContain('renzheng-huifu-zhuangtai')
    expect(源).not.toContain("'tongZhi', 'jiaZaiZhong'")
    expect(源).not.toContain('zhengZaiHuiFu')
  })
})