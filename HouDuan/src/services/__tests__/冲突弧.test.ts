import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 查询 } = vi.hoisted(() => ({ 查询: vi.fn() }))

vi.mock('../../数据库', () => ({
  数据库: { query: 查询 },
}))

import {
  biaoJiXiaoXiYiDu,
  diZengFuYanJiShu,
  huaJieChongTu,
  huoQuChongTuXinXi,
  huoQuChongTuZhuangTai,
  renSheHuaJieJiaCheng,
  shengJiChongTu,
  shengJiXiaYiDangMing,
  shiFouYunXuZhuanYi,
} from '../冲突弧'
import { jieXiDirectorXiangYing } from '../Director'

beforeEach(() => {
  查询.mockReset()
})

function 造关系行(zhuangTai: string, shiYou = '', shengJiJiShu = 0) {
  return { zhuangTai, shiYou, shengJiJiShu }
}

function 读档返回(zhuangTai: string, shiYou = '', shengJiJiShu = 0) {
  查询.mockResolvedValueOnce({ rows: [造关系行(zhuangTai, shiYou, shengJiJiShu)] })
}

describe('冲突弧状态机：只允许同级维持或单向升一档', () => {
  it.each([
    ['wu', 'lengZhan', true],
    ['lengZhan', 'huiBi', true],
    ['huiBi', 'yiDuBuHui', true],
    ['yiDuBuHui', 'yiDuBuHui', true],
    ['lengZhan', 'lengZhan', true],
    ['wu', 'huiBi', false],
    ['wu', 'yiDuBuHui', false],
    ['lengZhan', 'yiDuBuHui', false],
    ['lengZhan', 'wu', false],
    ['huiBi', 'lengZhan', false],
    ['huiBi', 'wu', false],
    ['yiDuBuHui', 'huiBi', false],
    ['yiDuBuHui', 'wu', false],
  ])('%s → %s 应为 %s', (dangQian, muBiao, yuQi) => {
    expect(shiFouYunXuZhuanYi(dangQian as never, muBiao as never)).toBe(yuQi)
  })

  it('最高档再升档没有下一档，降级只走化解', () => {
    expect(shengJiXiaYiDangMing('yiDuBuHui')).toBeNull()
    expect(shengJiXiaYiDangMing('huiBi')).toBe('yiDuBuHui')
    expect(shengJiXiaYiDangMing('wu')).toBe('lengZhan')
  })
})

describe('冲突弧服务：升档链、化解、计数、查询', () => {
  it('wu→lengZhan→huiBi→yiDuBuHui 单向逐档升级，事由随每次升档写入', async () => {
    const lian: Array<{ cong: string; dao: string }> = []
    let dangQian = 'wu'
    for (const shiYou of ['拿我家人开玩笑', '又提分手威胁', '骂人还拉黑']) {
      读档返回(dangQian)
      查询.mockResolvedValueOnce({ rows: [{ 冲突状态: dangQian }], rowCount: 1 })
      const jieGuo = await shengJiChongTu('u-1', 'j-1', shiYou)
      expect(jieGuo.chengGong).toBe(true)
      expect(jieGuo.shengJi).toBe(true)
      lian.push({ cong: dangQian, dao: jieGuo.zhuangTai as string })
      dangQian = jieGuo.zhuangTai as string
    }
    expect(lian).toEqual([
      { cong: 'wu', dao: 'lengZhan' },
      { cong: 'lengZhan', dao: 'huiBi' },
      { cong: 'huiBi', dao: 'yiDuBuHui' },
    ])
    const shengJiDiaoYong = 查询.mock.calls.filter(([yuJu]) => String(yuJu).includes('UPDATE "好感度"'))
    expect(shengJiDiaoYong).toHaveLength(3)
    for (const [yuJu] of shengJiDiaoYong) {
      expect(String(yuJu)).toContain('RETURNING *')
      expect(String(yuJu)).toContain('AND "冲突状态" = $5')
      expect(String(yuJu)).not.toMatch(/NOW\(\)|INTERVAL|AGE\(|EXTRACT\(/i)
    }
    expect(shengJiDiaoYong[0][1]).toEqual(['u-1', 'j-1', 'lengZhan', '拿我家人开玩笑', 'wu'])
    expect(shengJiDiaoYong[1][1]).toEqual(['u-1', 'j-1', 'huiBi', '又提分手威胁', 'lengZhan'])
    expect(shengJiDiaoYong[2][1]).toEqual(['u-1', 'j-1', 'yiDuBuHui', '骂人还拉黑', 'huiBi'])
  })

  it('已在最高档时严重冒犯只维持同级并刷新事由，不再升档', async () => {
    读档返回('yiDuBuHui', '旧事由', 2)
    查询.mockResolvedValueOnce({ rows: [{ 冲突状态: 'yiDuBuHui' }], rowCount: 1 })
    const jieGuo = await shengJiChongTu('u-1', 'j-1', '又骂了一次')
    expect(jieGuo).toEqual({ chengGong: true, shengJi: false, zhuangTai: 'yiDuBuHui' })
    const [, canShu] = 查询.mock.calls[1]
    expect(canShu).toEqual(['u-1', 'j-1', 'yiDuBuHui', '又骂了一次', 'yiDuBuHui'])
  })

  it('档位被并发修改导致守卫不中时升档失败且不改状态', async () => {
    读档返回('lengZhan')
    查询.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const jieGuo = await shengJiChongTu('u-1', 'j-1', '事由')
    expect(jieGuo).toEqual({ chengGong: false, shengJi: false, zhuangTai: 'lengZhan' })
    expect(查询).toHaveBeenCalledTimes(2)
  })

  it('化解：任何档位归零，事由清空，升级计数清零，无任何时间条件', async () => {
    查询.mockResolvedValueOnce({ rows: [{ 冲突状态: 'wu' }], rowCount: 1 })
    const chengGong = await huaJieChongTu('u-1', 'j-1')
    expect(chengGong).toBe(true)
    const [yuJu, canShu] = 查询.mock.calls[0]
    expect(String(yuJu)).toContain('"冲突状态" = \'wu\'')
    expect(String(yuJu)).toContain('"冲突事由" = NULL')
    expect(String(yuJu)).toContain('"冲突升级计数" = 0')
    expect(String(yuJu)).toContain('AND "冲突状态" <> \'wu\'')
    expect(String(yuJu)).toContain('RETURNING *')
    expect(String(yuJu)).not.toMatch(/NOW\(\)|INTERVAL|AGE\(|EXTRACT\(/i)
    expect(canShu).toEqual(['u-1', 'j-1'])
  })

  it('无冲突时化解返回 false，不发无效写', async () => {
    查询.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    expect(await huaJieChongTu('u-2', 'j-2')).toBe(false)
  })

  it('敷衍计数只加一且要求弧内状态，返回新计数', async () => {
    查询.mockResolvedValueOnce({ rows: [{ 冲突升级计数: 3 }], rowCount: 1 })
    const jiShu = await diZengFuYanJiShu('u-1', 'j-1')
    expect(jiShu).toBe(3)
    const [yuJu, canShu] = 查询.mock.calls[0]
    expect(String(yuJu)).toContain('"冲突升级计数" = "冲突升级计数" + 1')
    expect(String(yuJu)).toContain('AND "冲突状态" <> \'wu\'')
    expect(String(yuJu)).not.toMatch(/NOW\(\)|INTERVAL|AGE\(|EXTRACT\(/i)
    expect(canShu).toEqual(['u-1', 'j-1'])
  })

  it('查询按用户ID加角色ID定位，非法档位回退为 wu，无行返回 null', async () => {
    读档返回('lengZhan', '事由A', 2)
    const xinXi = await huoQuChongTuXinXi('u-1', 'j-1')
    expect(xinXi).toEqual({ zhuangTai: 'lengZhan', shiYou: '事由A', shengJiJiShu: 2 })
    const [yuJu, canShu] = 查询.mock.calls[0]
    expect(String(yuJu)).toContain('FROM "好感度"')
    expect(String(yuJu)).toContain('WHERE "用户ID" = $1 AND "角色ID" = $2')
    expect(canShu).toEqual(['u-1', 'j-1'])

    查询.mockResolvedValueOnce({ rows: [造关系行('luanXieDe', '', -5)] })
    const jieGuo = await huoQuChongTuXinXi('u-3', 'j-3')
    expect(jieGuo).toEqual({ zhuangTai: 'wu', shiYou: '', shengJiJiShu: 0 })

    查询.mockResolvedValueOnce({ rows: [] })
    expect(await huoQuChongTuXinXi('u-4', 'j-4')).toBeNull()
    查询.mockResolvedValueOnce({ rows: [] })
    expect(await huoQuChongTuZhuangTai('u-4', 'j-4')).toBe('wu')
  })

  it('标记已读复用「消息.已读」写入路径，非法ID被过滤，空列表不发语句', async () => {
    const heFa = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    await biaoJiXiaoXiYiDu('u-1', 'j-1', [heFa, '不是uuid', '', 123 as unknown as string])
    const [yuJu, canShu] = 查询.mock.calls[0]
    expect(String(yuJu)).toContain('UPDATE "消息" SET "已读" = true')
    expect(String(yuJu)).toContain('WHERE "用户ID" = $1 AND "角色ID" = $2 AND "ID" = ANY($3::uuid[])')
    expect(canShu).toEqual(['u-1', 'j-1', [heFa]])

    查询.mockClear()
    await biaoJiXiaoXiYiDu('u-1', 'j-1', ['bad-id'])
    expect(查询).not.toHaveBeenCalled()
  })

  it('人设化解加成：快热大于默认，慢热最小', () => {
    expect(renSheHuaJieJiaCheng('快热')).toBeGreaterThan(renSheHuaJieJiaCheng())
    expect(renSheHuaJieJiaCheng('慢热')).toBeLessThan(renSheHuaJieJiaCheng())
  })
})

describe('冲突弧零时间路径', () => {
  it('冲突弧服务源码不含任何时间读取、定时或间隔函数', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../冲突弧.ts'), 'utf8')
    expect(yuanMa).not.toMatch(/Date\.now|new Date|setTimeout|setInterval|setImmediate|NOW\(\)|INTERVAL|AGE\(|EXTRACT\(|毫秒|时间戳|更新时间|最后互动时间|创建时间|衰减|TTL|过期/)
  })

  it('迁移 063 只加三列一约束，幂等守卫，无破坏性语句', () => {
    const SQL = readFileSync(resolve(__dirname, '../../../QianYi/migrations/063_关系冲突弧.sql'), 'utf8')
    expect(SQL).toContain('ADD COLUMN "冲突状态" TEXT NOT NULL DEFAULT \'wu\'')
    expect(SQL).toContain('ADD COLUMN "冲突事由" TEXT NULL')
    expect(SQL).toContain('ADD COLUMN "冲突升级计数" INTEGER NOT NULL DEFAULT 0')
    expect(SQL).toContain("CHECK (\"冲突状态\" IN ('wu', 'lengZhan', 'huiBi', 'yiDuBuHui'))")
    expect((SQL.match(/information_schema\.columns/g) ?? []).length).toBe(3)
    expect(SQL).toContain('pg_constraint')
    expect(SQL).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/)
    expect(SQL).toContain('时间化解因素')
  })
})

describe('Director 解析冲突事件', () => {
  it('中文键严重冒犯解析为 yanZhong 并带事由', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({
      是否回复: true,
      冲突事件: { 动作: 'yanZhong', 事由: '拿我家人开玩笑' },
    }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.chongTuShiJian).toEqual({ dongZuo: 'yanZhong', shiYou: '拿我家人开玩笑' })
  })

  it('拼音键与中文别名同样支持，普通生气解析为 shengQi', () => {
    const jia = jieXiDirectorXiangYing(JSON.stringify({ chongTuShiJian: { dongZuo: 'shengQi', shiYou: '怼了我' } }))
    expect(jia.ceLue.chongTuShiJian).toEqual({ dongZuo: 'shengQi', shiYou: '怼了我' })
    const yi = jieXiDirectorXiangYing(JSON.stringify({ 冲突事件: { 动作: '严重', 事由: '侮辱人' } }))
    expect(yi.ceLue.chongTuShiJian).toEqual({ dongZuo: 'yanZhong', shiYou: '侮辱人' })
    const bing = jieXiDirectorXiangYing(JSON.stringify({ 冲突事件: { 动作: '生气', 事由: '甩脸子' } }))
    expect(bing.ceLue.chongTuShiJian).toEqual({ dongZuo: 'shengQi', shiYou: '甩脸子' })
  })

  it('null 表示明确无事件，缺字段是 undefined，非法值被丢弃', () => {
    const xian = jieXiDirectorXiangYing(JSON.stringify({ 冲突事件: null }))
    expect(xian.ceLue.chongTuShiJian).toBeNull()
    const que = jieXiDirectorXiangYing(JSON.stringify({ 是否回复: true }))
    expect(que.ceLue.chongTuShiJian).toBeUndefined()
    const luan = jieXiDirectorXiangYing(JSON.stringify({ 冲突事件: '直接生气了' }))
    expect(luan.ceLue.chongTuShiJian).toBeUndefined()
    const kong = jieXiDirectorXiangYing(JSON.stringify({ 冲突事件: { 动作: '随口写的' } }))
    expect(kong.ceLue.chongTuShiJian).toBeUndefined()
  })

  it('事由超长被截到 200 字', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({ 冲突事件: { 动作: 'yanZhong', 事由: '坏'.repeat(500) } }))
    expect(jieGuo.ceLue.chongTuShiJian?.shiYou).toHaveLength(200)
  })
})
