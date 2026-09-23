import { defineConfig, devices } from '@playwright/test'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// FP-23 / FP-24a 取证专用配置副本（收口时删除）。
// 与 frontend/playwright.config.ts 的唯一差异：webServer/baseURL 端口从 5173 挪到 5181
// （5173 归主页背景 agent 独占，本任务禁止复用、禁止 kill 非本会话进程），
// 且不挂 globalSetup —— 两个取证点全部走 page.route 注入，不需要后端夹具账号。
// 取证模式：本轮不涉及滚动条 ⇒ 一律 headless（PROGRESS『像素取证口径定案』①）。
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 端口 = Number(process.env.FP2324_PORT ?? 5181)
const 地址 = `http://localhost:${端口}`
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: 本目录,
  testMatch: /fp2324-quzheng\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: path.resolve(本目录, '../test-results/fp2324'),
  use: {
    baseURL: 地址,
    headless: true,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  // projects.use 会覆盖顶层 use ⇒ 视口必须在两处同时钉死，否则实跑成 Desktop Chrome 的 1280x720
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${端口} --strictPort`,
    cwd: path.resolve(本目录, '..'),
    url: 地址,
    reuseExistingServer: true,
    timeout: 180000,
  },
})
