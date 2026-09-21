import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 执行落库后副作用 } from '../落库后副作用'
import { debug日志 } from '../debug日志'

vi.mock('../debug日志', () => ({
  debug日志: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('落库后副作用唯一入口', () => {
  it('同步抛错的副作用被吞掉，调用方继续执行且不抛出', () => {
    let 走到终点 = false

    expect(() => {
      执行落库后副作用('撤回后重置AI调度器', () => {
        throw new Error('调度器内部炸了')
      })
      走到终点 = true
    }).not.toThrow()

    expect(走到终点).toBe(true)
    expect(debug日志.error).toHaveBeenCalledTimes(1)
  })

  it('Promise reject 的副作用被吞掉且不产生未处理拒绝', async () => {
    const 拒绝 = Promise.reject(new Error('LLM 链路超时'))
    let 进程未处理拒绝 = false
    const 监听 = () => {
      进程未处理拒绝 = true
    }
    process.on('unhandledRejection', 监听)

    expect(() => 执行落库后副作用('落库后触发AI调度器', () => 拒绝)).not.toThrow()
    await new Promise((jieJue) => setImmediate(jieJue))
    process.off('unhandledRejection', 监听)

    expect(进程未处理拒绝).toBe(false)
    expect(debug日志.error).toHaveBeenCalledTimes(1)
  })

  it('日志带异常栈与标识上下文，便于服务端定位（不把问题藏掉）', () => {
    执行落库后副作用(
      '危机干预审计落账',
      () => {
        throw new Error('审计表写入失败')
      },
      { yong_hu_id: '22222222-2222-4222-8222-222222222222', jiao_se_id: '11111111-1111-4111-8111-111111111111' },
    )

    const 参数 = vi.mocked(debug日志.error).mock.calls[0]
    expect(参数[0]).toBe('落库后副作用')
    expect(参数[1]).toContain('危机干预审计落账')
    expect(参数[2]?.yong_hu_id).toBe('22222222-2222-4222-8222-222222222222')
    expect(参数[2]?.jiao_se_id).toBe('11111111-1111-4111-8111-111111111111')
    const 详情 = 参数[2]?.xiang_qing as Record<string, unknown>
    expect(详情.ming_cheng).toBe('危机干预审计落账')
    expect(String(详情.cuo_wu)).toContain('审计表写入失败')
    // zhan 必须是调用栈而非一行消息：本次缺陷定位时就因为日志只留 String(err) 而看不到根因
    expect(String(详情.zhan)).toContain('审计表写入失败')
    expect(String(详情.zhan)).toMatch(/at .+:\d+:\d+/)
  })

  it('副作用成功时不记错误日志，同步返回值不影响吞异常判定', () => {
    执行落库后副作用('清除军师已指导状态', () => undefined)
    执行落库后副作用('异步生成复盘', () => Promise.resolve({ cheng_gong: true }))
    执行落库后副作用('非 Promise 返回值', () => 'ok')

    expect(debug日志.error).not.toHaveBeenCalled()
  })
})
