import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'

/**
 * 第四波 BlindSpot M-6 守卫：波形采样条数与**显示宽**必须走同一个夹取后的数值。
 * 改前的条数吃 yuYinKuanDuPx() 映射宽，显示宽却另外被 .yuyin-qipao{max-width:100%} 夹进
 * 会话栏、被 .bo-xing-zu{overflow:hidden} 裁掉 ⇒ 窄屏（320/375 档）下 60 秒语音按 300px
 * 排 69 条却画不下，boXingYiBo 用全量条数算点亮比例，尾段进度画面不动。
 * 这里只从 DOM 观察「渲染盒宽」与「内联映射宽」，不复刻组件里的算式。
 */

const 组件路径 = resolve(process.cwd(), 'src/components/聊天/语音气泡.vue')
const 组件源 = readFileSync(组件路径, 'utf8')

const 内缩 = DUO_MEI_TI_PEI_ZHI.yuYinPaoNeidianPx
const 槽宽 = DUO_MEI_TI_PEI_ZHI.yuYinCaoYangTiaoKuanPx + DUO_MEI_TI_PEI_ZHI.yuYinCaoYangJianJuPx

/** 把渲染盒宽度钉成给定值：模拟 CSS max-width:100% 夹取后的真实几何（jsdom 恒 0，必须注入） */
function 钉宽(像素: number) {
  return vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(像素)
}

/** 挂上去并等一次刷新：组件在 onMounted 里实测显示宽，条数在下一帧才跟着夹取（真机同理） */
async function 挂(毫秒: number, 进度秒: number, 总秒: number) {
  const 泡 = mount(YuYinQiPao, {
    props: {
      xiaoXi: { mei_ti_shi_chang_hao_miao: 毫秒 },
      boFangZhong: true,
      jinDuMiao: 进度秒,
      zongMiao: 总秒,
    },
  })
  await nextTick()
  return 泡
}

/** 内联样式里的映射宽——组件自己声明的意图宽，与被 CSS 夹取后的实测宽相对照 */
function 映射宽(泡: Awaited<ReturnType<typeof 挂>>): number {
  const 值 = 泡.find('.yuyin-qipao').attributes('style')?.match(/width:\s*(\d+(?:\.\d+)?)px/)
  return 值 ? Number(值[1]) : Number.NaN
}

function 格(泡: Awaited<ReturnType<typeof 挂>>) {
  return 泡.findAll('.bo-xing-tiao')
}

/** 条数 ×（条宽+间距）必须装得进夹取后的可见净宽，且不多浪费一格——被裁掉的条数 = 0 */
function 铺满不越界(泡: Awaited<ReturnType<typeof 挂>>, 渲染盒宽: number): boolean {
  const 可见净宽 = Math.min(渲染盒宽, 映射宽(泡)) - 内缩 * 2
  const 占宽 = 格(泡).length * 槽宽
  return 占宽 <= 可见净宽 && 占宽 > 可见净宽 - 槽宽
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('M-6 波形条数与显示宽同源', () => {
  it('窄容器（会话栏把气泡夹到 156px）：条数按夹取后可见净宽排，100% 时最后一格点亮', async () => {
    钉宽(156)
    const 泡 = await 挂(60000, 60, 60)
    expect(泡.find('.yuyin-qipao').element.clientWidth).toBe(156)
    expect(映射宽(泡)).toBeGreaterThan(156) // 前提：这一档确实被 CSS 夹了
    expect(铺满不越界(泡, 156)).toBe(true)
    const 条 = 格(泡)
    expect(条.length).toBeGreaterThan(0)
    expect(条[条.length - 1].classes()).toContain('bo-xing-tiao--yi-bo')
    expect(条[0].classes()).toContain('bo-xing-tiao--yi-bo')
  })

  it('同一时长在宽容器里条数严格更多（条数跟着显示宽走，不是钉死映射宽）', async () => {
    钉宽(156)
    const 窄 = 格(await 挂(60000, 0, 60)).length
    钉宽(360)
    const 宽 = 格(await 挂(60000, 0, 60)).length
    expect(窄).toBeLessThan(宽)
  })

  it('短时长（映射宽本身就窄于容器）：条数按映射净宽排，不被容器放大', async () => {
    钉宽(360)
    const 泡 = await 挂(3000, 3, 3)
    expect(铺满不越界(泡, 360)).toBe(true)
    const 条 = 格(泡)
    expect(条[条.length - 1].classes()).toContain('bo-xing-tiao--yi-bo')
  })

  it('测不到渲染宽（clientWidth=0：SSR/jsdom 首帧）时退回映射净宽，且此时显示宽未被夹', async () => {
    钉宽(0)
    const 泡 = await 挂(60000, 30, 60)
    expect(铺满不越界(泡, 0)).toBe(false) // 前提：容器宽测不到 ⇒ 只能按映射宽排
    expect(格(泡).length * 槽宽).toBeLessThanOrEqual(映射宽(泡) - 内缩 * 2)
  })

  it('几何单一真源：映射宽在组件内只有一个调用点，条数只吃夹取后的净宽', () => {
    const 去注释 = 组件源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(去注释.match(/yuYinKuanDuPx\(/g)).toHaveLength(1)
    const 条数式 = 去注释.match(/const caoYangTiaoShu[\s\S]*?\n\}\)/)![0]
    expect(条数式).toContain('xianShiJingKuanPx.value')
    expect(条数式).not.toContain('yuYinKuanDuPx')
  })
})
