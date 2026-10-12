import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { 规则清单 } from './CSS级联真源'

/**
 * FP-01 定案③：登录编排 = CSS 阶梯。
 * 认证布局已保证飞行结束才挂载主页（FP06主页加载时序.test.ts 钉住），主页挂载
 * 即按 0/0.4/0.8/1.2/1.6s 五级从上到下入场，飞行全程主页不渲染。
 * 五级 = 标题区 / 左侧情感区 / 普通卡 / 挑战卡 / 底位说明，从上到下 0.4s 一档。
 * 本文件先红：五级 animation-delay 阶梯 + 减动效归零 + 零新增时长字面量。
 */

const 主页源 = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')

function 样式源码(): string {
  const 段 = [...主页源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '主页内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
}

function 剔帧(源: string): string {
  return 源.replace(/@keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
}

describe('FP-01 定案③：主页挂载即五级阶梯入场', () => {
  it('五级从上到下 0/0.4/0.8/1.2/1.6s：标题→左侧→普通卡→挑战卡→底位说明', () => {
    const 规则们 = 规则清单(剔帧(样式源码()))
    const 延迟 = (选择器: string): string => {
      const 命中 = 规则们.filter(
        (项) => 项.选择器 === 选择器 && 项.声明.has('animation-delay'),
      )
      expect(命中.length, `${选择器} 缺 animation-delay 阶梯声明`).toBe(1)
      return (命中[0].声明.get('animation-delay') as string).replace(/\s+/g, '')
    }
    expect(延迟('.gonggong-biaoti-qu')).toBe('0s')
    expect(延迟('.zuo-ce-qinggan-qu')).toBe('0.4s')
    expect(延迟('.putong-moshi-kapian')).toBe('0.8s')
    expect(延迟('.tiaozhan-moshi-kapian')).toBe('1.2s')
    expect(延迟('.zhuye-diwei-shuoming')).toBe('1.6s')
  })

  it('阶梯只改延迟：五级仍吃既有入场动画与时长令牌，不另立第二套运动', () => {
    const 规则们 = 规则清单(剔帧(样式源码()))
    const 五级 = [
      '.gonggong-biaoti-qu',
      '.zuo-ce-qinggan-qu',
      '.putong-moshi-kapian',
      '.tiaozhan-moshi-kapian',
      '.zhuye-diwei-shuoming',
    ]
    for (const 选择器 of 五级) {
      const 动画 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has('animation'))
      expect(动画.length, `${选择器} 的入场 animation 被改写`).toBe(1)
    }
    const 左侧 = 规则们.find((项) => 项.选择器 === '.zuo-ce-qinggan-qu' && 项.声明.has('animation'))
    expect(左侧?.声明.get('animation')).toContain('zuoce-ruchang')
  })

  it('减动效档同步归零：五级延迟在 reduced-motion 下全归 0s 且动画关闭', () => {
    const 样式 = 样式源码()
    const 减档 = /@media \(prefers-reduced-motion: reduce\)[\s\S]*$/.exec(样式)?.[0] ?? ''
    expect(减档).toMatch(/animation-delay:\s*0s/)
    expect(减档).toMatch(/animation:\s*none/)
  })
})
