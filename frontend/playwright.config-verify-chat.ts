import { defineConfig, devices } from '@playwright/test'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// 「循环工程」取证派单专用配置副本（收工可删）。
// 与 frontend/playwright.config.ts 的差异仅两处：
//  ① webServer/baseURL 端口挪到 5190（5173 归主页背景 agent、5180-5188 归他会话，本单派单纪律钉 5190）；
//  ② 不挂 globalSetup —— 本单全部走 page.route 桩（fp03-qipao / fp2324 样板同法），不需要后端夹具登录。
// 取证模式：本单不涉及滚动条宽度 ⇒ 一律 headless（PROGRESS『像素取证口径定案』①+FP-27 修正）。
// 派生 config 陷阱（PROGRESS 2026-09-22 定案）：顶层 use.viewport 会被 project 层 spread 的
// devices['Desktop Chrome'] 覆盖 ⇒ viewport 必须在 **project 层** 钉死，spec 内再回读 innerWidth 自证。
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 端口 = Number(process.env.FPVC_PORT ?? 5190)
const 地址 = `http://localhost:${端口}`
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: 本目录,
  testMatch: /fp-verify-chat-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: path.resolve(本目录, 'test-results/fp-verify-chat'),
  use: {
    baseURL: 地址,
    headless: true,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${端口} --strictPort`,
    // 本 config 放在 frontend/ 根（fp2324 副本放 tests/，其 '..' 才等于 frontend）⇒ cwd 就是本目录
    cwd: 本目录,
    url: 地址,
    reuseExistingServer: true,
    timeout: 180000,
  },
})
