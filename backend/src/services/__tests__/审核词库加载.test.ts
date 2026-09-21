import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { jiaZaiZuiXinCiKu, huoQuCiKuMuLu } from '../审核词库'
import { debug日志 } from '../../utils/debug日志'

/**
 * 聊天发送消息 500 的根因侧守卫。
 *
 * 根因：tsc 不把 src 下的非 TS 资源复制进 dist，而生产镜像只 COPY dist，
 * 于是运行期 scandir <dist>/config/审核词库 ENOENT → 每条文本消息在内容审核处抛错 → HTTP 500。
 * 本文件把「词库读不到时会怎样」钉死：明确报错 + 落含目录的日志 + 启动期拒绝带病上线；
 * 产物侧的修复由 scripts/__tests__/构建资源打包.test.ts 把守。
 */

const ZHEN_SHI_READDIR = vi.hoisted(() => ({ shiBai: false }))

vi.mock('fs/promises', async () => {
  const zhenShi = await vi.importActual<typeof import('fs/promises')>('fs/promises')
  return {
    ...zhenShi,
    readdir: async (...canShu: Parameters<typeof zhenShi.readdir>) => {
      if (ZHEN_SHI_READDIR.shiBai) {
        throw new Error('ENOENT: no such file or directory, scandir 词库目录')
      }
      return zhenShi.readdir(...canShu)
    },
  }
})

vi.mock('../../utils/debug日志', () => ({
  debug日志: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

afterEach(() => {
  ZHEN_SHI_READDIR.shiBai = false
  vi.clearAllMocks()
})

describe('审核词库加载', () => {
  it('仓库内的词库可加载并带类别结构', async () => {
    const ciKu = await jiaZaiZuiXinCiKu(true)
    expect(ciKu.banBen).toBeTruthy()
    expect(Object.keys(ciKu.leiBie).length).toBeGreaterThan(0)
    expect(debug日志.error).not.toHaveBeenCalled()
  })

  it('运行期解析出的目录后缀就是 config/审核词库（构建产物必须把资源放进这一层）', () => {
    expect(huoQuCiKuMuLu().split(/[\\/]/).slice(-2).join('/')).toBe('config/审核词库')
  })

  it('词库目录读不到时抛错并落含目录的日志，不返回半成品词库', async () => {
    ZHEN_SHI_READDIR.shiBai = true

    const jieGuo = await jiaZaiZuiXinCiKu(true).then(
      () => ({ cheng_gong: true }),
      (cuoWu: unknown) => ({ cheng_gong: false, cuo_wu: String(cuoWu) }),
    )

    expect(jieGuo.cheng_gong).toBe(false)
    expect(String(jieGuo.cuo_wu)).toContain('ENOENT')

    const diaoYong = vi.mocked(debug日志.error).mock.calls.find((xiang) => xiang[1] === '加载词库失败')
    expect(diaoYong).toBeDefined()
    expect(String(diaoYong?.[2]?.xiang_qing?.cuo_wu)).toContain('ENOENT')
  })

  it('启动前强校验会预检词库并在失败时中止启动（禁「容器 healthy 但聊天全废」）', () => {
    const yuanMa = readFileSync(resolve(__dirname, '..', '..', 'server.ts'), 'utf-8')
    expect(yuanMa).toContain('jiaZaiZuiXinCiKu')
    expect(yuanMa).toMatch(/审核词库不可加载[\s\S]{0,400}process\.exit\(1\)/)
  })
})
