import { defineConfig, devices } from '@playwright/test'

/**
 * FP-10c 第 ⑤ 刀「接续刀」派生取证配置（不动 playwright.config.ts 本体，也不动 -fp10c 那一份的契约）。
 *
 * 与 playwright.config-fp10c.ts 的唯一差异是 **覆盖面**：本文件把派单点名的 7 个 spec 一次跑齐，
 * 并允许 `FP10CB_FIXTURES=1` 挂上 globalSetup（真登录夹具），用于 console-errors / fp11 这两条
 * 必须走真实页面路径的簇。桩注入簇（其余 5 份）一律不挂 globalSetup —— 和 -fp10c 同一条理由：
 * 不能把「后端可达」当这些用例的前置。
 *
 * 端口只用 5211 + --strictPort（5173/5180/5205–5210/5213 全禁）。
 * outputDir 与 -fp10c 那份（test-results/fp10c）分开，复跑不覆盖上一名的产物（事故 L-10）。
 */
const 端口 = Number(process.env.FP10CB_PORT ?? 5211)
const 地址 = `http://localhost:${端口}`
const 挂夹具 = process.env.FP10CB_FIXTURES === '1'
const 默认匹配 =
  /fp10c-zheneilian\.spec\.ts|fp-verify-chat-input\.spec\.ts|fp05-shuru-quyu-he-gundong\.spec\.ts|fp2324-quzheng\.spec\.ts|fp-verify-chat-quote\.spec\.ts|console-errors\.spec\.ts|fp11-menjin-zonglan\.spec\.ts/
const 匹配 = process.env.FP10CB_MATCH ? new RegExp(process.env.FP10CB_MATCH) : 默认匹配

process.env.PLAYWRIGHT_BASE_URL = 地址
process.env.E2E_FRONTEND_URL = 地址

export default defineConfig({
  testDir: './tests',
  ...(挂夹具 ? { globalSetup: './tests/全局前置.ts' } : {}),
  testMatch: 匹配,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/fp10cb',
  use: {
    baseURL: 地址,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    /**
     * 取样基建（不动任何判据）：actionTimeout 缺省是 0 ⇒ 点不到的元素会一路挂到 test.setTimeout
     * （本轮 ⑤ 移动 320 就是这么烧掉 4 分钟，只留下一句 timeout，取不到「点不到的是谁」）。
     * 钉一个显式动作窗后失败信息里带元素盒/命中者，取证才有归因；阈值本身比各 spec 的 poll 更宽。
     */
    actionTimeout: Number(process.env.FP10CB_ACTION_TIMEOUT ?? 25000),
    navigationTimeout: Number(process.env.FP10CB_NAV_TIMEOUT ?? 60000),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        headless: process.env.FP10CB_HEADED === '1' ? false : true,
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
