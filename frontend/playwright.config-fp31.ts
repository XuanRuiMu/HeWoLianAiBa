import { defineConfig, devices } from '@playwright/test'

/**
 * FP-31 派生 Playwright 配置（不动 playwright.config.ts 本体；本文件与 -fp03/-fp2324/-fp24c/-fp24d/
 * -fp27/-fp30 同族，属"可复跑门禁的组成部分"，第三波 Standards 轴 H4 已在证据里逐份标注去留）。
 *
 * 端口 5188：5173 归并行 agent，本任务一律 5180+，不复用、不 kill 非本会话进程。
 * fp11 走真实登录夹具（tests/全局前置.ts → 测试夹具.ts 真调 /api/认证/登录）⇒ 必须先起
 * backend dev（:3000 或 env BACKEND_URL 指定口），否则 502 直接抛在 globalSetup。
 * viewport 与 deviceScaleFactor 钉在 **project 层**（顶层 use 会被 devices spread 覆盖），
 * 回读自证在 spec 内（场景C 的 `值.取样视口`、场景A+B 的 `登录值.取样视口`）。
 * fp11 spec 内部自带 `test.use({ headless: false })`（F21：滚动条取证必须 headed）。
 * 复跑取证前务必换 FP11_PREFIX / FP11_EVIDENCE_SUFFIX（L-10 覆盖事故）。
 *
 * FP-32 扩口：testMatch 追加 `fp32-zhanji-genshou.spec.ts`（拖拽跟手逐点守卫），复用同一套
 * 登录夹具 / globalSetup / webServer 纪律，不再新增第 9 份派生 config。默认端口交调用方
 * （FP31_PORT）指定，本文件不改动既有 5188 默认值。
 */
const 端口 = Number(process.env.FP31_PORT ?? 5188)
const 地址 = `http://localhost:${端口}`

process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/全局前置.ts',
  testMatch: [/fp11-menjin-zonglan\.spec\.ts/, /fp32-zhanji-genshou\.spec\.ts/],
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/fp31',
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
