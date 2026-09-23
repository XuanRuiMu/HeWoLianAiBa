import { defineConfig, devices } from '@playwright/test'

/**
 * FP-10c（图文真内联输入区）派生取证配置。
 * 端口只用 5211 且 --strictPort；禁止复用 5173/5180/5205–5210。
 * 无 globalSetup：本簇 spec 一律 page.route 桩注入，不需要真实登录夹具，也就不能把
 * 「后端可达」当成前置（有后端时 globalSetup 会自建账号，无后端时它直接把整簇拖红）。
 * viewport 在 project 层钉死（顶层 use.viewport 会被 devices spread 覆盖），用例内回读 innerWidth 自证。
 */
const 端口 = Number(process.env.FP10C_PORT ?? 5211)
const 地址 = `http://localhost:${端口}`
const 无头 = process.env.FP10C_HEADED === '1' ? false : true
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  testMatch: /fp10c-zheneilian\.spec\.ts|fp-verify-chat-input\.spec\.ts|fp05-shuru-quyu-he-gundong\.spec\.ts|fp2324-quzheng\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/fp10c',
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
