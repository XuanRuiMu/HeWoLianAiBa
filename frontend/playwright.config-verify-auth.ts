import { defineConfig, devices } from '@playwright/test'

/**
 * 「认证页簇 + 性别配色簇」真机取证派生 config（FP-VERIFY-AUTHGENDER-20260922）。
 * 不动 playwright.config.ts 本体；与 -fp31/-fp24d 同族样板。
 * 端口 5191（避开 5173 与 5180-5188、5190）。
 * globalSetup 走真实登录夹具（tests/全局前置.ts → 测试夹具.ts 真调 /api/认证/登录），
 * 前提：backend dev 在 :3000 已在运行（本会话入场时已确认，非本会话起，不回收）。
 * viewport/deviceScaleFactor 钉在 project 层（顶层 use 会被 devices spread 覆盖），
 * spec 内回读 innerWidth 自证。白条/gender 一律 headless；滚动条 spec 一律 headed。
 */
const 端口 = Number(process.env.VERIFY_PORT ?? 5191)
const 地址 = `http://localhost:${端口}`

process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/全局前置.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/verify-auth',
  use: {
    baseURL: 地址,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'headless',
      testMatch: [/fp-verify-auth-baixian\.spec\.ts/, /fp-verify-gender\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        headless: true,
      },
    },
    {
      name: 'headed',
      testMatch: [/fp-verify-auth-gundong\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        headless: false,
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
