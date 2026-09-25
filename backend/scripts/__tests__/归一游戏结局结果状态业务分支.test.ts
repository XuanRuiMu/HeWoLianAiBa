import { describe, expect, it, vi } from 'vitest'

import { 归一游戏结局结果状态 } from '../归一游戏结局结果状态'

describe('归一游戏结局结果状态业务分支', () => {
  it('覆盖枚举、当前文案、历史文案、未知值和事务失败', async () => {
    const 客户端 = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { 存储值: 'sheng_li_ai_qing', 行数: 2 },
            { 存储值: '胜利-爱情', 行数: 3 },
            { 存储值: '完全未知', 行数: 1 },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 3 })
        .mockResolvedValueOnce({ rows: [] }),
    }
    await expect(归一游戏结局结果状态(客户端)).resolves.toMatchObject({ 扫描行数: 6, 改写行数: 3, 跳过行数: 2 })
    expect(客户端.query).toHaveBeenCalledWith('COMMIT')

    const 失败客户端 = { query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(new Error('查询失败')).mockResolvedValueOnce({}) }
    await expect(归一游戏结局结果状态(失败客户端)).rejects.toThrow('查询失败')
    expect(失败客户端.query).toHaveBeenCalledWith('ROLLBACK')
  })
})
