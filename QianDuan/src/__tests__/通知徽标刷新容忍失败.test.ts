import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const 桩 = vi.hoisted(() => ({
  拉取列表: vi.fn(),
  上报: vi.fn(),
}))

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: () => 桩.拉取列表(),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('@/utils/错误上报', () => ({
  chuFaCuoWuShangBao: (canShu: unknown) => 桩.上报(canShu),
}))

const { 使用通知仓库 } = await import('@/stores/通知')

function 挂未处理探针() {
  const 捕获: unknown[] = []
  const 处理 = (shiJian: Event) => 捕获.push((shiJian as PromiseRejectionEvent).reason)
  window.addEventListener('unhandledrejection', 处理)
  return {
    列表: 捕获,
    拆除: () => window.removeEventListener('unhandledrejection', 处理),
  }
}

async function 等宏任务() {
  await new Promise((jieShu) => setTimeout(jieShu, 0))
  await Promise.resolve()
}

describe('通知徽标刷新容忍失败', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('装饰性刷新失败时不产生未处理 rejection 且走错误上报', async () => {
    const 探针 = 挂未处理探针()
    const 仓库 = 使用通知仓库()
    桩.拉取列表.mockRejectedValue(new Error('502'))
    仓库.shuaXinTongZhiBiao()
    await 等宏任务()
    探针.拆除()
    expect(探针.列表).toEqual([])
    expect(桩.上报).toHaveBeenCalledTimes(1)
    const 参数 = 桩.上报.mock.calls[0][0] as { leiBie: string; cuoWu: unknown }
    expect(参数.leiBie).toBe('chengNuo')
    expect(参数.cuoWu).toBeTruthy()
    expect(仓库.jiaZaiZhong).toBe(false)
  })

  it('装饰性刷新失败保留上一次徽标值', async () => {
    const 仓库 = 使用通知仓库()
    桩.拉取列表.mockResolvedValue({ lie_biao: [{ id: '1', nei_rong: 'a', yi_du: false }], wei_du_shu: 1 })
    await 仓库.jiaZaiTongZhi()
    桩.拉取列表.mockRejectedValue(new Error('502'))
    仓库.shuaXinTongZhiBiao()
    await 等宏任务()
    expect(仓库.weiDuShu).toBe(1)
    expect(仓库.tongZhiLieBiao).toHaveLength(1)
  })

  it('装饰性刷新成功时不改徽标语义也不上报', async () => {
    const 仓库 = 使用通知仓库()
    桩.拉取列表.mockResolvedValue({ lie_biao: [], wei_du_shu: 3 })
    仓库.shuaXinTongZhiBiao()
    await 等宏任务()
    expect(仓库.weiDuShu).toBe(3)
    expect(桩.上报).not.toHaveBeenCalled()
  })

  it('通知页用的 jiaZaiTongZhi 仍把归一后的前台错误抛给调用方', async () => {
    const 仓库 = 使用通知仓库()
    桩.拉取列表.mockRejectedValue(new Error('502'))
    await expect(仓库.jiaZaiTongZhi()).rejects.toMatchObject({ code: expect.any(String) })
    expect(桩.上报).not.toHaveBeenCalled()
  })

  it('菜单里的通知刷新不得再悬空 Promise', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const 菜单源 = readFileSync(resolve(__dirname, '..', 'components', '全局菜单.vue'), 'utf8')
    expect(菜单源).not.toMatch(/通知仓库\.jiaZaiTongZhi\(\)/)
    expect(菜单源).toContain('通知仓库.shuaXinTongZhiBiao()')
  })
})
