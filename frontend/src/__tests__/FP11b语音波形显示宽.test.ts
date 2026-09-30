import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'

/**
 * FP-K4b 进度线几何守卫：气泡底部 2px 进度线宽度必须与 currentTime/duration 同步，
 * 且高度吃令牌（--yuyin-jindu-xian-gao ↔ yuYinJinDuXianGaoPx 同值）。
 * 改前的波形条数/显示宽同源判定（BlindSpot M-6）已随波形一并作废——微信喇叭不画波形。
 */

const 组件路径 = resolve(process.cwd(), 'src/components/聊天/语音气泡.vue')
const 组件源 = readFileSync(组件路径, 'utf8')

/** 把渲染盒宽度钉成给定值（jsdom 恒 0，进度线测试不需要实测宽，但保留以防回归） */
function 钉宽(像素: number) {
  return vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(像素)
}

function 挂(毫秒: number, 进度秒: number, 总秒: number) {
  return mount(YuYinQiPao, {
    props: {
      xiaoXi: { mei_ti_shi_chang_hao_miao: 毫秒 },
      boFangZhong: true,
      jinDuMiao: 进度秒,
      zongMiao: 总秒,
    },
  })
}

function 进度线宽百分比(泡: ReturnType<typeof 挂>): number {
  const 值 = 泡.find('.yuyin-jindu-xian').attributes('style')?.match(/width:\s*([\d.]+)%/)
  return 值 ? Number(值[1]) : Number.NaN
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FP-K4b 进度线几何', () => {
  it('进度线宽度 = currentTime/duration × 100%，夹在 [0,100]', () => {
    expect(进度线宽百分比(挂(12000, 0, 12))).toBe(0)
    expect(进度线宽百分比(挂(12000, 6, 12))).toBe(50)
    expect(进度线宽百分比(挂(12000, 12, 12))).toBe(100)
    // 越界输入被夹取
    expect(进度线宽百分比(挂(12000, -3, 12))).toBe(0)
    expect(进度线宽百分比(挂(12000, 20, 12))).toBe(100)
  })

  it('zongMiao=0 时进度线宽度为 0（除零守卫）', () => {
    expect(进度线宽百分比(挂(0, 5, 0))).toBe(0)
  })

  it('进度线高度吃令牌，组件内零像素字面量', () => {
    expect(组件源).toContain('var(--yuyin-jindu-xian-gao)')
    const 正文 = 组件源.replace(/\/\*[\s\S]*?\*\//g, '')
    const 样式 = 正文.slice(正文.indexOf('<style scoped>'))
    expect(样式).not.toMatch(/(?:^|[\s:;,(])-?\d+(?:\.\d+)?px\b/)
  })

  it('高度令牌与 config 同值（改一侧必红灯）', () => {
    const 令牌源 = readFileSync(resolve(process.cwd(), 'src/styles/variables.css'), 'utf8')
    const 匹配 = 令牌源.match(/--yuyin-jindu-xian-gao:\s*([^;]+);/)
    expect(匹配, '令牌 --yuyin-jindu-xian-gao 未定义').toBeTruthy()
    expect(匹配![1].trim()).toBe(`${DUO_MEI_TI_PEI_ZHI.yuYinJinDuXianGaoPx}px`)
  })

  it('进度线是装饰元素：pointer-events none、不发事件', () => {
    const 泡 = 挂(12000, 6, 12)
    // pointer-events 在 scoped CSS 里（非内联），从组件源断言
    const 样式 = 组件源.slice(组件源.indexOf('<style scoped>'))
    expect(样式).toContain('pointer-events: none')
    expect(泡.find('.yuyin-jindu-xian').exists()).toBe(true)
    void 钉宽
  })
})
