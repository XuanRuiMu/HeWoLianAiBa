import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

function 版本戳插件() {
  return {
    name: 'ban-ben-chuo',
    buildStart() {
      try {
        fs.writeFileSync(path.resolve(process.cwd(), 'public/version.txt'), String(Date.now()))
      } catch {
        // 写入失败不影响构建
      }
    },
  }
}

function 体积门禁插件() {
  const MAX_DIST_SIZE_MB = 15
  return {
    name: 'ti-ji-men-jin',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist')
      if (!fs.existsSync(distDir)) return
      let totalSize = 0
      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(fullPath)
          else totalSize += fs.statSync(fullPath).size
        }
      }
      walk(distDir)
      const sizeMB = totalSize / 1024 / 1024
       
      console.log(`[体积门禁] dist 总大小: ${sizeMB.toFixed(2)} MB (限制: ${MAX_DIST_SIZE_MB} MB)`)
      if (sizeMB > MAX_DIST_SIZE_MB) {
        throw new Error(`构建产物体积 ${sizeMB.toFixed(2)} MB 超过限制 ${MAX_DIST_SIZE_MB} MB`)
      }
    },
  }
}

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      // 测试 hermetic：jsdom 默认 URL 恰为 http://localhost:3000（与本地后端开发端口冲突），
      // 后端启动时会把单测里漏 mock 的真实 HTTP 变成真实 401，触发登录跳转懒加载并与 teardown 竞态。
      // 指向永不监听的保留端口，让漏网请求快速失败，不依赖外部服务状态。
      jsdom: { url: 'http://localhost:9/' },
    },
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    pool: 'threads',
    testTimeout: 15000,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/', 'src/**/__tests__/**/*.d.ts', 'tests/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 68,
        functions: 62,
        branches: 57,
        statements: 65,
      },
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/vite-env.d.ts',
        'src/env.d.ts',
        'coverage/',
      ],
    },
  },
  plugins: [
    版本戳插件(),
    体积门禁插件(),
    vue(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: '和我恋爱吧',
        short_name: '恋爱吧',
        description: 'AI 恋爱模拟聊天应用',
        theme_color: '#FF6B9D',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](vue|@vue|vue-router|pinia)[\\/]/.test(id)) {
            return 'vue-vendor'
          }
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) {
            return 'san-wei'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        // 根因收敛：后端未启动时代理穿透502刷控制台error；收敛为代理层静默+前端延迟拉取
        // E2E无后端环境下，/api请求由前端空闲重试兜底，禁首屏error刷屏
        configure: (proxy) => {
          proxy.on('error', () => {
            // 吞掉代理错误日志，后端就绪后前端空闲任务自会重试
          })
        },
      },
      '/socket.io': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        ws: true,
      },
    },
  },
})
