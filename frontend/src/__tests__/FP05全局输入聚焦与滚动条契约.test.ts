import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 按档解析全部, 声明位置, 声明块清单 } from './主题令牌真源'
import { 规则清单 } from './CSS级联真源'

const 源码根 = resolve(__dirname, '..')
const 全局源码 = readFileSync(resolve(源码根, 'styles/global.css'), 'utf8')
const 主题块 = 声明块清单()
const 浅色 = 按档解析全部('light', 主题块)
const 深色 = 按档解析全部('dark', 主题块)
const 规则们 = 规则清单(全局源码)
const 非文本输入类型 = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])
const 聊天文件 = new Set([
  'components/聊天/图文输入区.vue',
  'views/好友聊天.vue',
  'views/聊天页面.vue',
])

type 源文件 = {
  路径: string
  相对: string
  内容: string
}

function 遍历(目录: string): 源文件[] {
  const 结果: 源文件[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 路径 = resolve(目录, 项.name)
    if (项.isDirectory()) {
      结果.push(...遍历(路径))
      continue
    }
    if (!['.css', '.vue', '.ts', '.tsx'].includes(resolve(路径).slice(resolve(路径).lastIndexOf('.')))) {
      continue
    }
    结果.push({ 路径, 相对: relative(源码根, 路径).split(sep).join('/'), 内容: readFileSync(路径, 'utf8') })
  }
  return 结果
}

const 源文件们 = 遍历(源码根)
const Vue文件们 = 源文件们.filter((文件) => 文件.相对.endsWith('.vue'))

function 去注释(源: string): string {
  return 源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

function 模板(源: string): string {
  const 开始 = 源.indexOf('<template')
  const 结束 = 源.lastIndexOf('</template>')
  if (开始 < 0 || 结束 < 开始) return ''
  return 去注释(源.slice(开始, 结束))
}

type 文本输入 = {
  文件: string
  类型: string
  可编辑: boolean
}

function 文本输入们(): 文本输入[] {
  const 结果: 文本输入[] = []
  for (const 文件 of Vue文件们) {
    const 源 = 模板(文件.内容)
    for (const 匹配 of 源.matchAll(/<(input|textarea)\b[\s\S]*?>/gi)) {
      const 标签 = 匹配[0]
      const 类型 = 标签.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? 'text'
      if (匹配[1].toLowerCase() === 'input' && 非文本输入类型.has(类型)) continue
      结果.push({ 文件: 文件.相对, 类型: 匹配[1].toLowerCase(), 可编辑: false })
    }
    for (const 匹配 of 源.matchAll(/<([a-z][\w-]*)\b[^>]*\bcontenteditable(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?[^>]*>/gi)) {
      const 值 = 匹配[2] ?? 匹配[3] ?? 匹配[4] ?? 'true'
      if (值.toLowerCase() === 'false') continue
      结果.push({ 文件: 文件.相对, 类型: 匹配[1].toLowerCase(), 可编辑: true })
    }
  }
  return 结果
}

const 输入清单 = 文本输入们()
const 非聊天输入 = 输入清单.filter((输入) => !聊天文件.has(输入.文件))
const 聊天输入 = 输入清单.filter((输入) => 聊天文件.has(输入.文件))
const 契约排除类型 = new Set(
  [...全局源码.matchAll(/\[type='([^']+)'\]/g)].map((匹配) => 匹配[1].toLowerCase()),
)

function 契约覆盖输入(输入: 文本输入): boolean {
  if (输入.可编辑) return 全局源码.includes('[contenteditable]')
  if (输入.类型 === 'textarea') return 全局源码.includes('textarea')
  return !契约排除类型.has(输入.类型) && 全局源码.includes('input:not(')
}

const 溢出声明 = 源文件们.flatMap((文件) => {
  const 源 = 去注释(文件.内容)
  return [...源.matchAll(/\boverflow(?:-[xy])?\s*:\s*(auto|scroll)\b/gi)].map((匹配) => ({
    文件: 文件.相对,
    值: 匹配[1].toLowerCase(),
  }))
})

function 令牌值(表: Map<string, string>, 名: string): string {
  const 值 = 表.get(名)
  expect(值, `令牌 ${名} 未定义`).toBeDefined()
  return (值 as string).trim()
}

const 契约规则们 = 规则们.filter(
  (规则) =>
    规则.选择器.includes("[data-chat-scope='true']") &&
    规则.选择器.includes("[data-chat-input='true']"),
)

function 状态规则(状态: string) {
  return 契约规则们.filter((规则) => {
    if (状态.startsWith('[')) return 规则.选择器.includes(状态)
    return new RegExp(`${状态}(?![\\w-])`).test(规则.选择器)
  })
}

describe('FP-05 全局文本输入契约', () => {
  it('所有非聊天文本输入都由统一标签契约覆盖，聊天输入有稳定排除标记', () => {
    expect(非聊天输入.length).toBeGreaterThan(0)
    expect(全局源码).toContain('input:not(')
    expect(全局源码).toContain('textarea')
    expect(全局源码).toContain('[contenteditable]')
    expect(全局源码).toContain(":not([data-chat-scope='true'] *)")
    expect(全局源码).toContain(":not([data-chat-input='true'])")
    for (const 输入 of 非聊天输入) {
      expect(契约覆盖输入(输入)).toBe(true)
    }
    expect(非聊天输入.some((输入) => 输入.类型 === 'textarea')).toBe(true)
    for (const 文件 of ['views/聊天页面.vue', 'views/好友聊天.vue']) {
      const 源 = readFileSync(resolve(源码根, 文件), 'utf8')
      expect(源).toMatch(/class="liaotian-yemian"[^>]*data-chat-scope="true"/)
    }
    const 编辑器 = readFileSync(resolve(源码根, 'components/聊天/图文输入区.vue'), 'utf8')
    expect(编辑器).toMatch(/data-chat-input="true"/)
    expect(编辑器).toMatch(/contenteditable="true"/)
    expect(聊天输入.some((输入) => 输入.可编辑)).toBe(true)
  })

  it('双主题输入与滚动条语义令牌、普通态、错误态、禁用态、只读态和自动填充态均有真源', () => {
    const 主题令牌 = new Map([
      ['--shuru-xian-changtai-se', '--renzheng-shuru-xian-se'],
      ['--shuru-xian-jujiao-se', '--jujiao-huan-yanse'],
      ['--shuru-xian-cuowu-se', '--cuowu-yanse'],
      ['--shuru-xian-jinyong-se', '--wenben-tishi'],
      ['--shuru-xian-zhi-du-se', '--wenben-ciuse'],
      ['--shuru-beijing-zidong-tianchong', '--beijing-kaopian'],
      ['--shuru-wenben-zidong-tianchong', '--wenben-zhuse'],
      ['--gundong-tiao-guidao-hover', '--gundong-tiao-guidao'],
      ['--gundong-tiao-huakuai-jujiao', '--gundong-tiao-huakuai-hover'],
      ['--gundong-tiao-guidao-jujiao', '--gundong-tiao-guidao-hover'],
    ])
    for (const [名, 对应] of 主题令牌) {
      expect(声明位置(名, 主题块), `${名} 主题作用域错误`).toEqual({
        共用: false,
        浅色: true,
        深色: true,
      })
      expect(令牌值(浅色, 名)).toBe(`var(${对应})`)
      expect(令牌值(深色, 名)).toBe(`var(${对应})`)
      expect(令牌值(浅色, 对应)).not.toBe('')
      expect(令牌值(深色, 对应)).not.toBe('')
    }
    for (const [名, 值] of [
      ['--shuru-xian-changtai-kuan-du', '1px'],
      ['--shuru-xian-jujiao-kuan-du', '2px'],
      ['--shuru-juzhong-dong-xiao', '0.2s'],
      ['--shuru-sao-chu-shi-chang', '0.38s'],
    ] as const) {
      expect(声明位置(名, 主题块), `${名} 主题作用域错误`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
      expect(令牌值(浅色, 名)).toBe(值)
      expect(令牌值(深色, 名)).toBe(值)
    }
  })

  it('focus、focus-visible、blur、disabled、readonly、autofill 和错误态都有确定声明', () => {
    const 基础 = 契约规则们.filter((规则) => 规则.声明.has('border-bottom-color'))
    const 聚焦 = 状态规则(':focus')
    const 可见聚焦 = 状态规则(':focus-visible')
    const 禁用 = 状态规则(':disabled')
    const 只读 = 状态规则(':read-only')
    const 错误 = 状态规则("[aria-invalid='true']")
    const 自动填充 = 状态规则(':-webkit-autofill')
    expect(基础.some((规则) => 规则.声明.get('border-bottom-color') === 'var(--shuru-xian-changtai-se)')).toBe(true)
    expect(聚焦.some((规则) => 规则.声明.get('border-bottom-color') === 'var(--shuru-xian-jujiao-se)')).toBe(true)
    expect(可见聚焦.some((规则) => 规则.声明.get('border-bottom-color') === 'var(--shuru-xian-jujiao-se)')).toBe(true)
    expect(禁用.some((规则) => 规则.声明.get('border-bottom-color') === 'var(--shuru-xian-jinyong-se)')).toBe(true)
    expect(只读.some((规则) => 规则.声明.get('border-bottom-color') === 'var(--shuru-xian-zhi-du-se)')).toBe(true)
    expect(错误.some((规则) => 规则.声明.get('border-bottom-color') === 'var(--shuru-xian-cuowu-se)')).toBe(true)
    expect(自动填充.some((规则) => 规则.声明.get('background-color') === 'var(--shuru-beijing-zidong-tianchong)')).toBe(true)
    expect(自动填充.some((规则) => 规则.声明.get('-webkit-text-fill-color') === 'var(--shuru-wenben-zidong-tianchong)')).toBe(true)
    expect(
      基础.some((规则) => {
        const 值 = 规则.声明.get('transition-property') ?? ''
        return 值.includes('border-color') && 值.includes('background-size')
      }),
    ).toBe(true)
    expect(基础.some((规则) => 规则.声明.get('background-size') === '0% var(--shuru-xian-jujiao-kuan-du)')).toBe(true)
    expect(聚焦.some((规则) => 规则.声明.get('background-size') === '100% var(--shuru-xian-jujiao-kuan-du)')).toBe(true)
    expect(可见聚焦.some((规则) => 规则.声明.get('background-size') === '100% var(--shuru-xian-jujiao-kuan-du)')).toBe(true)
    expect(基础.some((规则) => 规则.声明.get('transition-duration')?.includes('var(--shuru-juzhong-dong-xiao)'))).toBe(true)
    expect(基础.some((规则) => 规则.声明.get('transition-duration')?.includes('var(--shuru-sao-chu-shi-chang)'))).toBe(true)
    expect(基础.some((规则) => 规则.声明.get('transition-timing-function')?.includes('var(--quxian-tan-chu)'))).toBe(true)
    expect(禁用.some((规则) => 规则.声明.get('cursor') === 'not-allowed')).toBe(true)
    expect(全局源码).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?transition-property:\s*none\s*!important/)
    expect(全局源码).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?transition-duration:\s*0s\s*!important/)
  })
})

describe('FP-05 全局滚动条契约', () => {
  it('所有声明 overflow 为 auto/scroll 的区域都落在全局滚动条规则覆盖下', () => {
    expect(溢出声明.length).toBeGreaterThan(0)
    expect(new Set(溢出声明.map((声明) => 声明.文件)).size).toBeGreaterThan(0)
    for (const 选择器 of [
      '::-webkit-scrollbar',
      '::-webkit-scrollbar-track',
      '::-webkit-scrollbar-thumb',
      '::-webkit-scrollbar-thumb:hover',
      '::-webkit-scrollbar-track:hover',
      '::-webkit-scrollbar-corner',
    ]) {
      expect(全局源码).toContain(选择器)
    }
    expect(全局源码).toMatch(/scrollbar-color:\s*var\(--gundong-tiao-huakuai\)\s+var\(--gundong-tiao-guidao\)/)
    expect(全局源码).toMatch(
      /:where\(\*:focus, \*:focus-visible, \*:focus-within\)::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gundong-tiao-huakuai-jujiao\)/,
    )
    expect(全局源码).toMatch(
      /:where\(\*:focus, \*:focus-visible, \*:focus-within\)::-webkit-scrollbar-track\s*\{[^}]*background:\s*var\(--gundong-tiao-guidao-jujiao\)/,
    )
    expect(全局源码).toMatch(
      /scrollbar-color:\s*var\(--gundong-tiao-huakuai-jujiao\)\s+var\(--gundong-tiao-guidao-jujiao\)/,
    )
  })

  it('滚动条及悬停光标统一为 default，不使用 pointer、text 或 grab', () => {
    const 光标令牌 = [
      '--gundong-tiao-cursor',
      '--gundong-tiao-huakuai-cursor',
      '--gundong-tiao-guidao-cursor',
    ]
    for (const 名 of 光标令牌) {
      expect(令牌值(浅色, 名)).toBe('default')
      expect(令牌值(深色, 名)).toBe('default')
    }
    const 滚动规则 = 规则们.filter((规则) => 规则.选择器.includes('::-webkit-scrollbar'))
    expect(滚动规则.length).toBeGreaterThan(0)
    for (const 规则 of 滚动规则) {
      const 值 = 规则.声明.get('cursor')
      if (!值) continue
      expect(值).toMatch(/^var\(--gundong-tiao-(?:cursor|huakuai-cursor|guidao-cursor)\)$/)
      expect(值).not.toMatch(/pointer|text|grab/)
    }
    expect(全局源码).not.toMatch(/\*\s*\{[^}]*cursor\s*:\s*(?:default|text)/)
    expect(全局源码).not.toMatch(/(?:^|})\s*(?:a|input|textarea)\s*\{[^}]*cursor\s*:/m)
    expect(全局源码).toMatch(/button\s*\{[^}]*cursor:\s*pointer/)
  })
})
