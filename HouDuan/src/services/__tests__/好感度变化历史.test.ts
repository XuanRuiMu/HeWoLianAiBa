import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 查询 } = vi.hoisted(() => ({ 查询: vi.fn() }))

vi.mock('../../数据库', () => ({
  数据库: { query: 查询 },
}))

import { huoQuHaoGanDuLeiJiBianHua } from '../好感度历史'

beforeEach(() => {
  查询.mockReset()
})

describe('好感度累计变化持久化读取', () => {
  it('按用户和角色汇总五维变化与发生次数，负数原样保留', async () => {
    查询.mockResolvedValueOnce({
      rows: [
        {
          lunCiShu: 12,
          xinRenDu: 18,
          qinMiDu: -3,
          quWeiDu: 9,
          guanHuaiDu: 7,
          zongFen: 31,
        },
      ],
    })
    const 结果 = await huoQuHaoGanDuLeiJiBianHua('u-1', 'j-1')
    expect(结果).toEqual({
      lun_ci_shu: 12,
      xin_ren_du_bian_hua: 18,
      qin_mi_du_bian_hua: -3,
      qu_wei_du_bian_hua: 9,
      guan_huai_du_bian_hua: 7,
      zong_fen_bian_hua: 31,
    })
    const [语句, 参数] = 查询.mock.calls[0]
    expect(语句).toContain('FROM "好感度变化历史"')
    expect(语句).toContain('WHERE "用户ID" = $1 AND "角色ID" = $2')
    expect(参数).toEqual(['u-1', 'j-1'])
  })

  it('没有历史时返回稳定零值，不返回 null 或字符串', async () => {
    查询.mockResolvedValueOnce({ rows: [] })
    expect(await huoQuHaoGanDuLeiJiBianHua('u-2', 'j-2')).toEqual({
      lun_ci_shu: 0,
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      zong_fen_bian_hua: 0,
    })
  })

  it('数据库返回非法或溢出数值时归零，不把 NaN 传给接口', async () => {
    查询.mockResolvedValueOnce({
      rows: [
        {
          lunCiShu: 'bad',
          xinRenDu: Number.NaN,
          qinMiDu: Number.POSITIVE_INFINITY,
          quWeiDu: 1.5,
          guanHuaiDu: null,
          zongFen: '8',
        },
      ],
    })
    const 结果 = await huoQuHaoGanDuLeiJiBianHua('u-3', 'j-3')
    expect(结果).toEqual({
      lun_ci_shu: 0,
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      zong_fen_bian_hua: 8,
    })
  })
})

describe('好感度变化历史迁移', () => {
  const SQL = readFileSync(
    resolve(__dirname, '../../../QianYi/migrations/049_好感度变化历史.sql'),
    'utf8',
  )

  it('在数据库更新时原子写入五维变化、变化后快照和角色关联', () => {
    expect(SQL).toContain('CREATE TABLE IF NOT EXISTS "好感度变化历史"')
    for (const 列 of ['信任度变化', '亲密度变化', '趣味度变化', '关怀度变化', '总分变化']) {
      expect(SQL).toContain(`"${列}"`)
    }
    expect(SQL).toContain('"角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE')
    expect(SQL).toContain('AFTER UPDATE OF "信任度", "亲密度", "趣味度", "关怀度", "总分"')
    expect(SQL).toContain('COALESCE(NEW."总分", 0) - COALESCE(OLD."总分", 0)')
    expect(SQL).toContain('SET search_path = public, pg_temp')
  })

  it('零变化不写噪声行，索引覆盖按聊天顺序读取，迁移无破坏性删表', () => {
    expect(SQL).toContain('IF NEW."信任度" IS NOT DISTINCT FROM OLD."信任度"')
    expect(SQL).toContain('RETURN NEW;')
    expect(SQL).toContain('"用户ID", "角色ID", "创建时间" DESC, "ID" DESC')
    expect(SQL).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/)
  })
})
