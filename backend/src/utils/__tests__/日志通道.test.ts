import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import pino from 'pino'
import { gouJianShengChanTargets } from '../日志引擎'

/**
 * 生产态日志通道的存活守卫。
 *
 * 真机故障（本轮复测抓到）：容器内 `logs/debug.*.log` 全 0 字节、`docker logs` 也没有任何
 * pino JSON 行，运行期 5xx 一律查不到原因。根因是 transport 目标写了裸模块名 `'pino-roll'`，
 * pino v10 在 worker 线程里解析不到时**静默失效**（不抛错、不留痕）。
 * 因此这里既钉「目标必须是绝对路径」，也钉「按这套配置真能把日志写进文件」。
 */
describe('生产态日志通道', () => {
  it('文件通道目标必须是可解析的绝对路径，不得是裸模块名', () => {
    const targets = gouJianShengChanTargets(path.join(tmpdir(), 'bu-gou-yong.log'))
    expect(targets).toHaveLength(1)
    for (const tiao of targets) {
      expect(path.isAbsolute(tiao.target), `transport 目标必须是绝对路径，实得 ${tiao.target}`).toBe(true)
      expect(existsSync(tiao.target), `transport 目标模块必须真实存在：${tiao.target}`).toBe(true)
      expect(tiao.target).not.toBe('pino-roll')
    }
  })

  it('按这套 targets 建 transport 后，日志真的落盘（通道存活的可执行证据）', async () => {
    const mu = mkdtempSync(path.join(tmpdir(), 'rizhi-'))
    try {
      const xiangDui = path.join(mu, 'debug.log')
      const stream = pino.transport({ targets: gouJianShengChanTargets(xiangDui) })
      const logger = pino({ level: 'debug', messageKey: 'xiao_xi' }, stream)
      logger.error({ lei_xing: '守卫' }, '日志通道存活探针')

      const zhong = Date.now() + 8000
      let luJing = ''
      while (Date.now() < zhong) {
        await new Promise((jie) => setTimeout(jie, 200))
        const ming = readdirSync(mu).filter((w) => w.startsWith('debug.') && w.endsWith('.log'))
        if (ming.length) { luJing = path.join(mu, ming[0]); break }
      }
      expect(luJing, 'pino-roll 没有产出任何日志文件').not.toBe('')
      const neiRong = readFileSync(luJing, 'utf-8')
      expect(neiRong).toContain('日志通道存活探针')
      expect(neiRong).toContain('"lei_xing":"守卫"')
      await new Promise<void>((jie) => { stream.on('close', () => jie()); stream.end() })
    } finally {
      rmSync(mu, { recursive: true, force: true })
    }
  })
})
