import { defineConfig, devices } from '@playwright/test'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// FP-03 取证专用配置副本（收口时删除）。
// 与 frontend/playwright.config.ts 的唯一差异：webServer/baseURL 端口从 5173 挪到 5180
// （5173 归主页背景 agent 独占，本任务禁止复用、禁止 kill 非本会话进程），
// 且不挂 globalSetup ——本 spec 只做登录/注册页的像素取证，不需要后端夹具账号。
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 端口 = Number(process.env.FP03_PORT ?? 5180)
const 地址 = `http://localhost:${端口}`
// tests/测试夹具.ts 与 全局前置.ts 读这两个变量定位前端；不指到 5180 就会去连 5173（本任务禁用）
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: 本目录,
  // 默认只跑本 FP 的取证 spec；FP03_MATCH 可临时指向受同一契约演进影响的既有 spec（如 fp02 认证页），
  // 以便在不复用 5173 的前提下复跑它们
  testMatch: process.env.FP03_MATCH ? new RegExp(process.env.FP03_MATCH) : /fp03-baixian-quzheng\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: path.resolve(本目录, '../test-results/fp03'),
  use: {
    baseURL: 地址,
    headless: true,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 } }],
  webServer: {
    command: `npm run dev -- --port ${端口} --strictPort`,
    cwd: path.resolve(本目录, '..'),
    url: 地址,
    reuseExistingServer: true,
    timeout: 180000,
  },
})
