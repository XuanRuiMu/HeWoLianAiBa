import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

const xiangMuGen = path.resolve(__dirname, '..')
const jieTuMuLu = path.resolve(xiangMuGen, '测试截图')
const qianDuanJiChuUrl = process.env.E2E_FRONTEND_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: path.resolve(__dirname, 'playwright-report') }]],
  use: {
    baseURL: qianDuanJiChuUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 0,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalSetup: path.resolve(__dirname, 'helpers', '启动服务.ts'),
  globalTeardown: path.resolve(__dirname, 'helpers', '停止服务.ts'),
  expect: {
    timeout: 10000,
  },
  timeout: 120000,
})

export { jieTuMuLu, xiangMuGen }
