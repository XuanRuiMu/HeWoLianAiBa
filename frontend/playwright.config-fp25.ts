import { defineConfig, devices } from '@playwright/test'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * FP-25 派生配置（诊断 spec `fp25-shouping-kongbai.spec.ts` + 常驻帧级门禁 spec `fp25-guodeng.spec.ts`；
 * 与 -fp24c/-fp24d/-fp27/-fp30/-fp31 同族）。
 *
 * 端口 5201（派单钉死，禁止复用 5173）。前端 `/api` 代理目标钉到 3010（本会话自己起的后端），
 * 与 `VITE_API_PROXY_TARGET` 对齐；不起后端时把 FP25_REAL 留空即可（冷加载/探针组全走 page.route 桩）。
 *
 * 已知陷阱（PROGRESS 2026-09-22 定案）：顶层 `use.viewport` 会被 `projects[].use` 里 spread 的
 * `devices[...]` 覆盖 ⇒ project 层显式钉死 viewport（下方 projects[0].use 在 spread 之后），
 * spec 内每档再用 `browser.newContext()` 显式开档，并逐轮回读 `innerWidth/innerHeight` 自证。
 *
 * 复跑必须换 FP25_EVIDENCE_SUFFIX（L-10 覆盖事故）；门禁 spec 证据自带执行 ID 前缀 FP-25G-，不相撞。
 */
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 端口 = Number(process.env.FP25_PORT ?? 5201)
const 地址 = `http://localhost:${端口}`

process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址
process.env.VITE_API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3010'

export default defineConfig({
  testDir: path.resolve(本目录, 'tests'),
  globalSetup: process.env.FP25_REAL === '1' ? './tests/全局前置.ts' : undefined,
  testMatch: /fp25-(shouping-kongbai|guodeng)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: path.resolve(本目录, 'test-results/fp25'),
  use: {
    baseURL: 地址,
    headless: true,
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
        headless: true,
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${端口} --strictPort`,
    cwd: 本目录,
    url: 地址,
    reuseExistingServer: true,
    timeout: 180000,
  },
})
