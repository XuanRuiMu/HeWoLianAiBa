import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')

const 布局 = 读('layouts/认证布局.vue')
const 根组件 = 读('根组件.vue')
const 登录 = 读('views/登录内容.vue')

function 取样式块(源码: string): string {
  return [...源码.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1]).join('\n')
}

function 取模板块(源码: string): string {
  const 匹 = /<template>([\s\S]*)<\/template>/.exec(源码)
  expect(匹, '缺少 template 块').not.toBeNull()
  return (匹 as RegExpMatchArray)[1]
}

interface 规则 {
  选择器: string
  声明: string
}

function 规则清单(样式: string): 规则[] {
  const 去注释 = 样式.replace(/\/\*[\s\S]*?\*\//g, '')
  const 出: 规则[] = []
  for (const 匹 of 去注释.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const 选择器 = 匹[1].trim()
    if (选择器.startsWith('@') || 选择器 === '') continue
    for (const 单 of 选择器.split(',')) 出.push({ 选择器: 单.trim(), 声明: 匹[2] })
  }
  return 出
}

function 整段规则(样式: string, 选择器: string): string | null {
  const 命中 = 规则清单(样式).filter((规) => 规.选择器 === 选择器)
  return 命中.length ? 命中.map((规) => 规.声明).join('\n') : null
}

function 声明(声明段: string, 属性: string): string | null {
  const 匹 = new RegExp(`(?:^|;)\\s*${属性.replace(/-/g, '\\-')}\\s*:\\s*([^;]+)`).exec(声明段)
  return 匹 ? 匹[1].trim().replace(/\s+/g, ' ') : null
}

const 布局样式 = 取样式块(布局)
const 布局模板 = 取模板块(布局)
const 根组件样式 = 取样式块(根组件)
const 根组件模板 = 取模板块(根组件)

describe('页面级滚动安全带：内容层可滚，装饰层独立裁剪', () => {
  it('认证布局基础容器允许纵向滚动，任何页面模式都不得隐藏纵向溢出', () => {
    const 基础 = 整段规则(布局样式, '.yemian-buju')
    expect(基础, '缺少 .yemian-buju 规则').not.toBeNull()
    expect(声明(基础 as string, 'overflow-y')).toBe('auto')
    expect(布局样式, '页面模式不得用 overflow-y:hidden/clip 裁掉主内容').not.toMatch(
      /\.yemian-buju[^{,]*\{[^}]*overflow-y\s*:\s*(hidden|clip)/,
    )
    expect(布局样式, '页面模式不得用 overflow 简写同时裁掉两轴').not.toMatch(
      /\.yemian-buju[^{,]*\{[^}]*overflow\s*:\s*(hidden|clip)/,
    )
  })

  it('登录模式不再单独禁止滚动（恢复错误框是页面兄弟节点，必须随页面滚到卡片底部）', () => {
    expect(布局样式).not.toMatch(/\.yemian-buju\.denglu-moshi[^{,]*\{[^}]*overflow-y\s*:\s*hidden/)
    const 恢复错误位 = 布局模板.indexOf('renzheng-huifu-cuo-wu')
    const 路由视图位 = 布局模板.indexOf('<router-view')
    const 布局位 = 布局模板.indexOf('class="yemian-buju"')
    expect(布局位).toBeGreaterThanOrEqual(0)
    expect(恢复错误位).toBeGreaterThan(布局位)
    expect(恢复错误位).toBeLessThan(路由视图位)
  })

  it('全屏路由沿用同一滚动层，未另设裁切', () => {
    const 全屏 = 整段规则(布局样式, '.yemian-buju.quanping-moshi')
    expect(全屏, '缺少全屏模式规则').not.toBeNull()
    expect(声明(全屏 as string, 'overflow-y')).toBe('auto')
  })

  it('登录卡内部自定义滚动条与短视口紧凑保持原状', () => {
    const 登录样式 = 取样式块(登录)
    expect(声明(整段规则(登录样式, '.biaodan-gundong') as string, 'overflow-y')).toBe('auto')
    expect(声明(整段规则(登录样式, '.biaodan-rongqi') as string, 'max-height')).toBe('100%')
    expect(声明(整段规则(登录样式, '.biaodan-rongqi') as string, 'overflow')).toBe('hidden')
  })

  it('装饰背景与内容层分离：背景固定且不接收事件，内容层独立堆叠', () => {
    expect(根组件模板).toMatch(/<div\s+class="cao-di-jiang-ji"[\s\S]*?aria-hidden="true"/)
    expect(根组件模板).toMatch(/class="grass-bg-iframe"[\s\S]*?aria-hidden=/)
    const 草地 = 整段规则(根组件样式, '.cao-di-jiang-ji')
    expect(草地).not.toBeNull()
    expect(声明(草地 as string, 'position')).toBe('fixed')
    expect(声明(草地 as string, 'overflow')).toBe('hidden')
    expect(声明(草地 as string, 'pointer-events')).toBe('none')
    const 内容层 = 整段规则(根组件样式, '.app-rongqi')
    expect(声明(内容层 as string, 'z-index')).toBe('1')
    expect(声明(内容层 as string, 'position')).toBe('relative')
  })
})

describe('全站页面根节点：固定高度不得叠加两轴裁切', () => {
  const 页面清单 = readdirSync(resolve(源码根, 'views'))
    .filter((名) => 名.endsWith('.vue'))
    .map((名) => ({ 名, 源: 读('views/' + 名) }))

  it('所有视图根节点若按视口定高，不得再用 overflow hidden/clip 剪掉主内容', () => {
    const 违规: string[] = []
    for (const { 名, 源 } of 页面清单) {
      const 模板 = 取模板块(源)
      const 根 = /^\s*<div[^>]*class="([^"]+)"/.exec(模板)
      if (!根) continue
      const 根类 = 根[1].split(/\s+/)[0]
      const 样式 = 取样式块(源)
      const 规则段 = 整段规则(样式, '.' + 根类)
      if (!规则段) continue
      const 定高 = /^(100%|100vh|100dvh|calc\()/.test(声明(规则段, 'height') ?? '')
      const 纵向裁切 =
        /(hidden|clip)/.test(声明(规则段, 'overflow-y') ?? '') ||
        /(hidden|clip)/.test(声明(规则段, 'overflow') ?? '')
      if (!定高 || !纵向裁切) continue
      const 聊天作业面 = /data-chat-scope="true"/.test(模板) && /overflow-y\s*:\s*auto/.test(样式)
      if (聊天作业面) continue
      违规.push(`${名} 的 .${根类} 定高后又裁切，页面内容无路可滚`)
    }
    expect(违规, 违规.join('\n')).toEqual([])
  })

  it('聊天作业面享有豁免时必须自带内部滚动容器', () => {
    for (const 名 of ['聊天页面.vue', '好友聊天.vue']) {
      const 源 = 读('views/' + 名)
      expect(取模板块(源), 名 + ' 应声明 data-chat-scope').toContain('data-chat-scope="true"')
      expect(取样式块(源), 名 + ' 必须有内部纵向滚动').toMatch(/overflow-y\s*:\s*auto/)
    }
  })
})
