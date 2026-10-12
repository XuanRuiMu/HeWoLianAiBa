import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { 规则清单 } from './CSS级联真源'

/**
 * FP-01 定案②：取消深色 = 同一按钮 aria-busy 驱动深色，不拆按钮。
 * 现状缺口（证伪记录 2026-10-11 §推断1）：登录内容.vue:215-227 同一按钮已绑
 * aria-busy，但只有 :disabled 暗化，取消态 disabled=false 故仍是香槟金。
 * 最小实现：busy 态只压 filter 亮度（零新令牌、零新色值），与常态金渐变同色相、
 * 明度各压一档；两档无需分支（filter 相对常态生效，深浅各自压暗）。
 */

const 登录源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')

function 样式源码(全源: string): string {
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
}

function 剔帧(源: string): string {
  return 源.replace(/@keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
}

describe('FP-01 定案②：同一登录按钮 aria-busy 深色可辨', () => {
  it('取消态仍是同一按钮：模板无第二个主按钮，语义仍由 aria-busy 承载', () => {
    const 模板 = 登录源.slice(登录源.indexOf('<template'), 登录源.indexOf('</template>'))
    expect(模板.match(/class="[^"]*anniu-zhuyao[^"]*"/g)?.length ?? 0).toBe(2)
    expect(登录源).toContain(':aria-busy="dengLuZhong ? \'true\' : \'false\'"')
    expect(登录源).not.toContain('quXiaoAnNiu')
  })

  it('busy 态有独立深色声明：filter 压暗且声明里零色值字面量', () => {
    const 规则们 = 规则清单(剔帧(样式源码(登录源)))
    const 命中 = 规则们.filter((项) => 项.选择器 === ".anniu-zhuyao[aria-busy='true']")
    expect(命中.length, ".anniu-zhuyao[aria-busy='true'] 缺深色声明").toBe(1)
    const 取值 = 命中[0].声明.get('filter') ?? ''
    expect(取值).toMatch(/brightness\(0\.\d+\)/)
    const 数值 = Number(/brightness\((0\.\d+)\)/.exec(取值)?.[1] ?? '1')
    expect(数值).toBeLessThan(1)
    const 整条 = [...命中[0].声明.values()].join(' ')
    expect(整条).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  })

  it('减动效档不断 busy 深色：filter 仍生效，不被 transition 归零误伤', () => {
    const 样式 = 样式源码(登录源)
    const 减档 = /@media \(prefers-reduced-motion: reduce\)[\s\S]*$/.exec(样式)?.[0] ?? ''
    expect(减档).not.toMatch(/\.anniu-zhuyao\[aria-busy/)
  })
})
