import { defineConfig, devices } from '@playwright/test'

/**
 * FP-30 派生 Playwright 配置（不动 playwright.config.ts 本体）。
 *
 * 端口 5187：5173 归并行 agent，本任务一律 5180+，不复用、不 kill 非本会话进程。
 * `globalSetup`（真实登录夹具，需要 backend dev :3000）只在门禁档 `FP30_GATE=1` 挂上——
 * 反证三件只碰 `/login` 静态页，挂夹具反而被后端可用性挡住。
 * 白条/像素带取证按『像素取证口径定案』默认 headless；`FP30_HEADED=1` 复采 headed 档
 * （fp11 / fp02 两份门禁 spec 内部自带 `test.use({ headless: false })`，不受本开关影响）。
 * viewport 与 deviceScaleFactor 必须钉在 **project 层**（顶层 use 会被 devices spread 覆盖），
 * 回读自证在 spec 内：`普查.几何.视口` / `设备像素比` 逐态断言，fp11 另有 `登录值.取样视口`。
 */
const 端口 = Number(process.env.FP30_PORT ?? 5187)
const 地址 = `http://localhost:${端口}`
const 无头 = process.env.FP30_HEADED !== '1'
const 门禁档 = process.env.FP30_GATE === '1'

// config 求值阶段就先钉上：全局前置.ts 与 测试夹具.ts 都读它
process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  globalSetup: 门禁档 ? './tests/全局前置.ts' : undefined,
  testMatch: 门禁档
    ? /(fp03-baixian-quzheng|fp11-menjin-zonglan|fp02-renzheng-juzhong-gundong)\.spec\.ts/
    : /(fp30-huan-nengliang-fanzheng|fp27-liangtiao-quzheng)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/fp30',
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
