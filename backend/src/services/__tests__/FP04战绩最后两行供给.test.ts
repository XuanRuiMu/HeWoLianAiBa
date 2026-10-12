import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 假 = vi.hoisted(() => ({ db: { query: vi.fn() }, jun: vi.fn() }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../军师缓存', () => ({ huoQuJunShiJiLuLieBiao: 假.jun }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { huoQuDangAnLieBiao } from '../战绩'

const 档案行 = {
  ID: '档案',
  用户ID: '用户',
  角色ID: '角色',
  微信昵称: '小美',
  是否渣型: false,
  结果类型: '',
  是否封存: false,
  好感度总分: 3,
  关系阶段: '朋友',
  聊天天数: 2,
  消息总数: 4,
  创建时间: '2026-01-01',
  MBTI: 'INFP',
  性别: 'nv',
  结局文案: null,
  随机性格: false,
  最后消息时间: '2026-07-02T10:01:00.000Z',
  模式: 'putong',
  分类ID: '分类',
  排序: 0,
}

function 查列表(语句: string): number {
  if (语句.includes('FROM "游戏档案"')) return 0
  return 1
}

beforeEach(() => {
  vi.clearAllMocks()
  假.jun.mockResolvedValue([])
})

describe('FP-04 需求8列表轻字段供给', () => {
  it('空档案不查消息，轻字段为空数组', async () => {
    假.db.query.mockImplementation(async () => ({ rows: [] }))
    const 列表 = await huoQuDangAnLieBiao('用户')
    expect(列表).toEqual([])
    expect(假.db.query).toHaveBeenCalledTimes(1)
  })

  it('两条消息按时间正序派成最后两行，摘要截断30字', async () => {
    const 长文 = `超长${'文'.repeat(60)}`
    假.db.query.mockImplementation(async (语句: string) => {
      if (查列表(语句) === 0) return { rows: [档案行] }
      return {
        rows: [
          { 角色ID: '角色', 发送者: 'jiaose', 内容: 长文, 类型: 'wenben', 已撤回: false, 创建时间: '2026-07-02T10:01:00.000Z', ID: 'b' },
          { 角色ID: '角色', 发送者: 'yonghu', 内容: '在吗', 类型: 'wenben', 已撤回: false, 创建时间: '2026-07-02T10:00:00.000Z', ID: 'a' },
        ],
      }
    })
    const [项] = await huoQuDangAnLieBiao('用户')
    expect(项.zui_hou_liang_tiao).toHaveLength(2)
    expect(项.zui_hou_liang_tiao[0]).toMatchObject({ fa_song_zhe: 'yonghu', zhai_yao: '在吗' })
    expect(项.zui_hou_liang_tiao[1]?.fa_song_zhe).toBe('jiaose')
    expect(项.zui_hou_liang_tiao[1]?.zhai_yao.length).toBeLessThanOrEqual(30)
    expect(项.zui_hou_liang_tiao.map((条) => 条.shi_jian)).toEqual([
      '2026-07-02T10:00:00.000Z',
      '2026-07-02T10:01:00.000Z',
    ])
  })

  it('媒体空正文回落占位，撤回行出占位不露原文', async () => {
    假.db.query.mockImplementation(async (语句: string) => {
      if (查列表(语句) === 0) return { rows: [档案行] }
      return {
        rows: [
          { 角色ID: '角色', 发送者: 'jiaose', 内容: '', 类型: 'yuYin', 已撤回: false, 创建时间: '2026-07-02T10:01:00.000Z', ID: 'b' },
          { 角色ID: '角色', 发送者: 'yonghu', 内容: '原文', 类型: 'wenben', 已撤回: true, 创建时间: '2026-07-02T10:00:00.000Z', ID: 'a' },
        ],
      }
    })
    const [项] = await huoQuDangAnLieBiao('用户')
    expect(项.zui_hou_liang_tiao).toHaveLength(2)
    expect(项.zui_hou_liang_tiao[0]?.zhai_yao).not.toContain('原文')
    expect(项.zui_hou_liang_tiao[1]).toMatchObject({
      shi_jian: '2026-07-02T10:01:00.000Z',
      fa_song_zhe: 'jiaose',
    })
    expect(项.zui_hou_liang_tiao[1]?.zhai_yao).toBe('yuYinZhaiYao')
    const 服务源 = readFileSync(resolve(__dirname, '../战绩.ts'), 'utf8')
    expect(服务源).toContain("IN ('yonghu', 'jiaose')")
    expect(服务源).toContain("huoQuFanYi('zhanJi', 'yuYinZhaiYao')")
  })

  it('越权面守住：取数恒带用户ID参数且分区取前二，无复盘重查', async () => {
    假.db.query.mockImplementation(async (语句: string) => {
      if (查列表(语句) === 0) return { rows: [档案行] }
      return { rows: [] }
    })
    await huoQuDangAnLieBiao('用户')
    for (const 调用 of 假.db.query.mock.calls) {
      const [语句, 参数] = 调用 as [string, unknown[]]
      if (语句.includes('FROM "消息"') || 语句.includes('FROM\n           SELECT')) {
        expect(语句).toContain('"用户ID" = $1')
        expect(参数[0]).toBe('用户')
      }
    }
    const 服务源 = readFileSync(resolve(__dirname, '../战绩.ts'), 'utf8')
    expect(服务源).toContain('ROW_NUMBER() OVER (PARTITION BY')
    expect(服务源).not.toMatch(/huoQuDangAnLieBiao[\s\S]{0,400}复盘数据/)
  })
})
