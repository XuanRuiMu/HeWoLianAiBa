import { defineConfig, devices } from '@playwright/test'

/**
 * FP-24c 的派生 Playwright 配置（不动 playwright.config.ts 本体）。
 *
 * 为什么要派生：`playwright.config.ts` 的 `baseURL`/`webServer.url` 硬写 5173，
 * 而 5173 归另一名并行工人（派单端口纪律：本任务一律 5180+，禁止复用、禁止 kill 非本会话进程）。
 *
 * 派生 config 的已知陷阱（PROGRESS『当前决策』已记）：顶层 `use.viewport` 会被
 * `projects[].use` 里 spread 的 `devices['Desktop Chrome']` 覆盖 ⇒ 视口必须在 **project 层**钉死，
 * 且 `deviceScaleFactor: 1` 必须钉死（DPR≠1 会改变亚像素描边的容差换算）。
 * 真机 `innerWidth` 的自证回读在 spec 内（`登录值.取样视口`）。
 */
const 端口 = Number(process.env.FP24C_PORT || 5181)
const 地址 = `http://localhost:${端口}`

// globalSetup 与 测试夹具 都读这个环境变量，必须在 config 求值阶段就先钉上
process.env.PLAYWRIGHT_BASE_URL = 地址

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/全局前置.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results-fp24c',
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
