import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import { parse } from 'yaml'

const CI_YML = new URL('../../../.github/workflows/ci.yml', import.meta.url)
const YUAN = readFileSync(CI_YML, 'utf8')

describe('CI workflow 自检', () => {
  it('ci.yml 必须是合法 YAML', () => {
    expect(() => parse(YUAN)).not.toThrow()
  })

  it('HouDuan job 的 typecheck 步骤必须排在 Lint 之前', () => {
    const gong = parse(YUAN)
    const jobs = gong['jobs'] as Record<string, { steps?: Array<{ name?: string; run?: string }> }>
    const houDuanJob = jobs['HouDuan']
    expect(houDuanJob, 'ci.yml 缺少 HouDuan job').toBeTruthy()

    const bu = (houDuanJob.steps ?? []).map((s) => s.name ?? s.run ?? '')
    const wen = (x: string) => bu.findIndex((n) => n.includes(x))

    const typecheck = wen('Typecheck (主配置)')
    const typecheckDu = wen('Typecheck (度量链)')
    const lint = wen('Lint')

    expect(typecheck, '缺少主配置 typecheck 步骤').toBeGreaterThanOrEqual(0)
    expect(typecheckDu, '缺少度量链 typecheck 步骤').toBeGreaterThanOrEqual(0)
    expect(lint, '缺少 Lint 步骤').toBeGreaterThanOrEqual(0)

    expect(typecheck, 'typecheck(主配置) 必须在 Lint 之前').toBeLessThan(lint)
    expect(typecheckDu, 'typecheck(度量链) 必须在 Lint 之前').toBeLessThan(lint)
  })

  it('HouDuan job 必须真的跑测试与构建（防止有人删步骤求绿）', () => {
    const gong = parse(YUAN)
    const houDuanJob2 = gong['jobs'] as Record<string, { steps?: Array<{ run?: string }> }>
    const yun = (houDuanJob2['HouDuan']?.steps ?? []).map((s) => s.run ?? '').join('\n')
    expect(yun).toContain('npm run test')
    expect(yun).toContain('npm run build')
    expect(yun).toContain('npm run typecheck')
    expect(yun).toContain('typecheck:度量')
  })
})