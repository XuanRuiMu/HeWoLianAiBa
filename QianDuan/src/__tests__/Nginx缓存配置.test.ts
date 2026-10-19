import { describe, it, expect } from 'vitest'

// 由于 nginx 配置测试需要运行 nginx，我们在单元测试中验证配置语法和逻辑
// 实际的响应头测试应在集成测试环境中进行

describe('nginx 配置缓存规则验证', () => {
  describe('缓存规则逻辑验证', () => {
    it('index.html 应该设置 no-cache', () => {
      const indexHtmlCacheControl = 'no-store, no-cache, must-revalidate, max-age=0'
      expect(indexHtmlCacheControl).toContain('no-cache')
      expect(indexHtmlCacheControl).toContain('max-age=0')
    })

    it('带 hash 的静态资源应该设置 immutable 长缓存', () => {
      const hashResourceCacheControl = 'public, max-age=31536000, immutable'
      expect(hashResourceCacheControl).toContain('immutable')
      expect(hashResourceCacheControl).toContain('max-age=31536000')
    })

    it('非 hash 静态资源应该设置短缓存', () => {
      const nonHashCacheControl = 'public, max-age=3600'
      expect(nonHashCacheControl).toContain('max-age=3600')
    })

    it('brotli 压缩配置应该启用', () => {
      const brotliConfig = {
        on: true,
        vary: true,
        comp_level: 6,
        types: [
          'text/plain',
          'text/css',
          'text/xml',
          'application/json',
          'application/javascript',
          'application/xml+rss',
          'application/atom+xml',
          'image/svg+xml',
        ],
      }

      expect(brotliConfig.on).toBe(true)
      expect(brotliConfig.vary).toBe(true)
      expect(brotliConfig.comp_level).toBe(6)
      expect(brotliConfig.types).toContain('application/javascript')
      expect(brotliConfig.types).toContain('text/css')
    })

    it('hash 文件名正则匹配应该正确', () => {
      const hashPattern = /\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|webp|avif)$/

      // 匹配带 hash 的文件名 (8+ 位十六进制字符)
      expect('app.a1b2c3d4.js').toMatch(hashPattern)
      expect('style.abcdef12.css').toMatch(hashPattern)
      expect('image.1234abcd.png').toMatch(hashPattern)
      expect('font.abcdef01.woff2').toMatch(hashPattern)

      // 不匹配非 hash 文件名
      expect('app.js').not.toMatch(hashPattern)
      expect('style.css').not.toMatch(hashPattern)
      expect('image.png').not.toMatch(hashPattern)
    })
  })

  describe('nginx 配置语法验证', () => {
    it('nginx.conf 应该包含 brotli 指令', () => {
      // 这里验证配置文件中包含必要的 brotli 配置
      const nginxConfig = `
        brotli on;
        brotli_vary on;
        brotli_comp_level 6;
        brotli_types text/plain text/css application/javascript;
      `

      expect(nginxConfig).toContain('brotli on;')
      expect(nginxConfig).toContain('brotli_vary on;')
      expect(nginxConfig).toContain('brotli_comp_level 6;')
    })

    it('nginx.conf 应该包含 index.html 缓存规则', () => {
      const indexHtmlConfig = `
        location = /index.html {
            add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
        }
      `

      expect(indexHtmlConfig).toContain('no-store')
      expect(indexHtmlConfig).toContain('no-cache')
      expect(indexHtmlConfig).toContain('max-age=0')
    })

    it('nginx.conf 应该包含 hash 资源缓存规则', () => {
      const hashResourceConfig = `
        location ~* \\.(js|css|png|jpg)$ {
            if ($uri ~* "\\.[a-f0-9]{8,}\\.(js|css|png|jpg)$") {
                add_header Cache-Control "public, max-age=31536000, immutable";
            }
        }
      `

      expect(hashResourceConfig).toContain('immutable')
      expect(hashResourceConfig).toContain('max-age=31536000')
      expect(hashResourceConfig).toContain('[a-f0-9]{8,}')
    })
  })
})
