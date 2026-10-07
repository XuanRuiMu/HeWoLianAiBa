import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * CI workflow 自检。
 *
 * ⚠️ 为什么必须有这条（第六轮审查 P0-1 的直接产物）：
 *   曾把 `- name: Typecheck (主配置)` 误写成 0 缩进，整个 `ci.yml` 变成**非法 YAML**，
 *   GitHub Actions 解析失败 → **所有 job 全部不执行**，而本地
 *   `tsc / eslint / vitest / 自检脚本` **全绿**。
 *   也就是说：CI 能不能启动，当前门禁里**没有任何一条能发现**。
 *
 * 本测试把 workflow 文件纳入门禁：
 *  1. 必须能被 YAML 解析
 *  2. backend job 必须存在
 *  3. backend job 里 typecheck 两步的序号必须 **小于** Lint 步骤
 *     （GitHub Actions 在第一个非零 `run:` 就终止 job，顺序错了护栏形同虚设——第五轮 P0-1）
 */
import { parse } from 'yaml'

const CI_YML = new URL('../../../.github/workflows/ci.yml', import.meta.url)
const YUAN = readFileSync(CI_YML, 'utf8')

describe('CI workflow 自检', () => {
  it('ci.yml 必须是合法 YAML', () => {
    expect(() => parse(YUAN)).not.toThrow()
  })

  it('backend job 的 typecheck 步骤必须排在 Lint 之前', () => {
    const gong = parse(YUAN)
    const jobs = gong['jobs'] as Record<string, { steps?: Array<{ name?: string; run?: string }> }>
    const backend = jobs['backend']
    expect(backend, 'ci.yml 缺少 backend job').toBeTruthy()

    const bu = (backend.steps ?? []).map((s) => s.name ?? s.run ?? '')
    const wen = (x: string) => bu.findIndex((n) => n.includes(x))

    const typecheck = wen('Typecheck (主配置)')
    const typecheckDu = wen('Typecheck (度量链)')
    const lint = wen('Lint')

    expect(typecheck, '缺少主配置 typecheck 步骤').toBeGreaterThanOrEqual(0)
    expect(typecheckDu, '缺少度量链 typecheck 步骤').toBeGreaterThanOrEqual(0)
    expect(lint, '缺少 Lint 步骤').toBeGreaterThanOrEqual(0)

    // GitHub Actions 遇到第一个非零退出码就终止 job —— typecheck 必须在 Lint 之前
    expect(typecheck, 'typecheck(主配置) 必须在 Lint 之前').toBeLessThan(lint)
    expect(typecheckDu, 'typecheck(度量链) 必须在 Lint 之前').toBeLessThan(lint)
  })

  it('backend job 必须真的跑测试与构建（防止有人删步骤求绿）', () => {
    const gong = parse(YUAN)
    const backend = gong['jobs'] as Record<string, { steps?: Array<{ run?: string }> }>
    const yun = (backend['backend']?.steps ?? []).map((s) => s.run ?? '').join('\n')
    expect(yun).toContain('npm run test')
    expect(yun).toContain('npm run build')
    expect(yun).toContain('npm run typecheck')
    // 度量链那一步在 yml 里是 npm script（`typecheck:度量`），配置文件名只出现在该 script 内部
    expect(yun).toContain('typecheck:度量')
  })
})