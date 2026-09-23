import { defineConfig, devices } from '@playwright/test'

/**
 * FP-27 临时取证配置（收工即删，不动 playwright.config.ts 本体）。
 * 端口 5183（5173 归并行 agent，本任务一律 5180+）。headless 由 FP27_HEADED 控制：
 * 白条/像素带取证按『像素取证口径定案』必须 headless，滚动条取证才要 headed。
 * viewport 必须在 project 层钉死（顶层 use.viewport 会被 devices spread 覆盖）。
 */
const 端口 = Number(process.env.FP27_PORT ?? 5183)
const 地址 = `http://localhost:${端口}`
const 无头 = process.env.FP27_HEADED !== '1'
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  testMatch: /fp27-liangtiao-quzheng\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/fp27', // 走 .gitignore 已覆盖的 test-results/ 目录，不留未忽略的过程产物
  use: {
    baseURL: 地址,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        headless: 无头,
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${端口} --strictPort`,
    url: 地址,
    reuseExistingServer: true,
    timeout: 180000,
  },
})
