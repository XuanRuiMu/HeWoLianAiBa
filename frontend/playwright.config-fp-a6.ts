import { defineConfig, devices } from '@playwright/test'

/**
 * FP-A6 浮窗缩放（需求 #7）临时取证配置（收工即删，不动 playwright.config.ts 本体）。
 * 端口只用 5210 且 --strictPort；禁止复用 5173/5180/5205–5209。
 * viewport 必须在 project 层钉死（顶层 use.viewport 会被 devices spread 覆盖），并在用例内回读 innerWidth 复核。
 * 草地背景 public/grass-bg 属另一名 agent 的在途 WIP，本 harness 不挂载 → error 分账单列。
 */
const 端口 = Number(process.env.FP_A6_PORT ?? 5210)
const 地址 = `http://localhost:${端口}`
const 无头 = process.env.FP_A6_HEADED === '1' ? false : true
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  testMatch: /fp-a6-fuchuang-suofang-quzheng\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/fp-a6',
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
        viewport: { width: 1280, height: 900 },
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
