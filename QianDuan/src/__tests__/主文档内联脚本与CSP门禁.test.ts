import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 前端根 = resolve(__dirname, '..', '..')
const 仓库根 = resolve(前端根, '..')
const 主页源码 = readFileSync(resolve(前端根, 'index.html'), 'utf8')
const 引导源码 = readFileSync(resolve(前端根, 'public/zhu-ti-yin-dao.js'), 'utf8')
const nginx配置 = readFileSync(resolve(仓库根, 'BuShu/nginx.conf'), 'utf8')

function 提取CSP策略(文本: string): string[] {
  return [...文本.matchAll(/add_header\s+Content-Security-Policy\s+"([^"]+)"/g)].map((匹配) => 匹配[1])
}

function 解析指令(策略: string): Map<string, string> {
  const 指令表 = new Map<string, string>()
  for (const 段 of 策略.split(';')) {
    const 净段 = 段.trim()
    if (!净段) continue
    const 空格位 = 净段.indexOf(' ')
    const 指令名 = 空格位 === -1 ? 净段 : 净段.slice(0, 空格位)
    const 指令值 = 空格位 === -1 ? '' : 净段.slice(空格位 + 1).trim()
    指令表.set(指令名, 指令值)
  }
  return 指令表
}

function 提取location块(文本: string, 块头: string): string {
  const 起位 = 文本.indexOf(块头)
  expect(起位, `nginx 范本缺少 ${块头}`).toBeGreaterThanOrEqual(0)
  let 深度 = 1
  let 末位 = 起位
  for (let 下标 = 起位 + 块头.length; 下标 < 文本.length; 下标 += 1) {
    const 字符 = 文本[下标]
    if (字符 === '{') 深度 += 1
    else if (字符 === '}') {
      深度 -= 1
      if (深度 === 0) {
        末位 = 下标
        break
      }
    }
  }
  return 文本.slice(起位, 末位 + 1)
}

describe('主文档内联脚本外置与 nginx CSP 契约', () => {
  it('QianDuan/index.html 源文件不再存在任何内联 script 正文', () => {
    expect(主页源码).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i)
  })

  it('主文档以同步外链脚本承载首屏主题引导且先于 body 执行', () => {
    expect(主页源码).toContain('<script src="/zhu-ti-yin-dao.js"></script>')
    expect(主页源码).toContain('<script type="module" src="/src/入口.ts"></script>')
    expect(主页源码.indexOf('/zhu-ti-yin-dao.js')).toBeLessThan(主页源码.indexOf('<body>'))
  })

  it('主题引导脚本写 CSS 真正消费的 data-theme 且与仓库取值同源', () => {
    expect(引导源码).toContain("localStorage.getItem('主题')")
    expect(引导源码).toContain("document.documentElement.setAttribute('data-theme', 'light')")
    expect(引导源码).toContain("document.documentElement.setAttribute('data-theme', 'dark')")
    expect(引导源码).not.toMatch(/\/\*|\/\//)
  })

  it('主题只有 localStorage「主题」一份编码，无死属性与第二套取值', () => {
    const 全站源码 = [主页源码, 引导源码, nginx配置].join('\n')
    expect(全站源码).not.toContain('lian-ai-ba-zhu-ti')
    expect(全站源码).not.toContain('data-zhu-ti')
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('主题', '浅色')
    new Function(引导源码)()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    localStorage.setItem('主题', '暗色')
    new Function(引导源码)()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    localStorage.removeItem('主题')
    document.documentElement.removeAttribute('data-theme')
    new Function(引导源码)()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('nginx 范本三条 CSP 完全一致且主文档 location 必带 CSP', () => {
    const 策略列表 = 提取CSP策略(nginx配置)
    expect(策略列表.length).toBeGreaterThanOrEqual(3)
    expect(new Set(策略列表).size).toBe(1)
    const 主文档块 = 提取location块(nginx配置, 'location = /index.html {')
    expect(提取CSP策略(主文档块).length).toBe(1)
  })

  it('主文档 CSP 的 script-src 只允许同源与 wasm，不含任何 unsafe 逃生舱', () => {
    const 指令表 = 解析指令(提取CSP策略(nginx配置)[0])
    expect(指令表.get('default-src')).toBe("'self'")
    expect(指令表.get('script-src')).toBe("'self' 'wasm-unsafe-eval'")
  })

  it('connect-src 覆盖 Socket.IO 同源 ws/wss 与 blob data，img 与 media 覆盖 blob data', () => {
    const 指令表 = 解析指令(提取CSP策略(nginx配置)[0])
    const 连接源 = 指令表.get('connect-src')?.split(/\s+/) ?? []
    expect(连接源).toContain("'self'")
    expect(连接源).toContain('blob:')
    expect(连接源).toContain('data:')
    expect(连接源).toContain('ws://$http_host')
    expect(连接源).toContain('wss://$http_host')
    const 图像源 = 指令表.get('img-src')?.split(/\s+/) ?? []
    expect(图像源).toContain('data:')
    expect(图像源).toContain('blob:')
    const 媒体源 = 指令表.get('media-src')?.split(/\s+/) ?? []
    expect(媒体源).toContain("'self'")
    expect(媒体源).toContain('blob:')
    expect(媒体源).toContain('data:')
  })

  it('style-src 保留 unsafe-inline 仅因草地背景页内联样式，worker frame font 全部收口同源', () => {
    const 指令表 = 解析指令(提取CSP策略(nginx配置)[0])
    expect(指令表.get('style-src')).toBe("'self' 'unsafe-inline'")
    expect(指令表.get('worker-src')).toBe("'self' blob:")
    expect(指令表.get('frame-src')).toBe("'self'")
    expect(指令表.get('font-src')).toBe("'self'")
    expect(指令表.get('object-src')).toBe("'none'")
    expect(指令表.get('base-uri')).toBe("'self'")
    const 背景页 = readFileSync(resolve(前端根, 'public/grass-bg/grass-bg.html'), 'utf8')
    expect(背景页).toMatch(/<style>/i)
  })
})
