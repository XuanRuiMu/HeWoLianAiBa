import { beforeEach, describe, expect, it, vi } from 'vitest'

const 存储 = vi.hoisted(() => new Map<string, { 字段: Map<string, string>; 到期毫秒: number | null }>())
const Redis调用 = vi.hoisted(() => ({
  写入失败: false,
  过期写入失败: false,
  读取失败: false,
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../redis', () => {
  function 取或建(键: string) {
    const 已有 = 存储.get(键)
    if (已有) return 已有
    const 新建 = { 字段: new Map<string, string>(), 到期毫秒: null }
    存储.set(键, 新建)
    return 新建
  }
  function 是否到期(项: { 到期毫秒: number | null }): boolean {
    return 项.到期毫秒 !== null && 项.到期毫秒 <= Date.now()
  }
  return {
    redis: {
      hset: vi.fn(async (键: string, ...值: Array<string | number>) => {
        if (Redis调用.写入失败) throw new Error('hset failed')
        const 项 = 取或建(键)
        for (let 序 = 0; 序 < 值.length; 序 += 2) {
          项.字段.set(String(值[序]), String(值[序 + 1]))
        }
        return 1
      }),
      expire: vi.fn(async (键: string, 秒: number) => {
        if (Redis调用.写入失败 || Redis调用.过期写入失败) throw new Error('expire failed')
        const 项 = 取或建(键)
        项.到期毫秒 = Date.now() + 秒 * 1000
        return 1
      }),
      ttl: vi.fn(async (键: string) => {
        if (Redis调用.读取失败) throw new Error('ttl failed')
        const 项 = 存储.get(键)
        if (!项 || 是否到期(项)) return -2
        if (项.到期毫秒 === null) return -1
        return Math.max(0, Math.ceil((项.到期毫秒 - Date.now()) / 1000))
      }),
      hgetall: vi.fn(async (键: string) => {
        if (Redis调用.读取失败) throw new Error('hgetall failed')
        const 项 = 存储.get(键)
        if (!项 || 是否到期(项)) {
          存储.delete(键)
          return {}
        }
        return Object.fromEntries(项.字段)
      }),
      hincrby: vi.fn(async (键: string, 字段: string, 增量: number) => {
        if (Redis调用.写入失败) throw new Error('hincrby failed')
        const 项 = 取或建(键)
        const 原值 = Number(项.字段.get(字段) ?? '0') || 0
        const 新值 = 原值 + 增量
        项.字段.set(字段, String(新值))
        return 新值
      }),
      del: vi.fn(async (键: string) => {
        if (Redis调用.写入失败) throw new Error('del failed')
        return 存储.delete(键) ? 1 : 0
      }),
      hget: vi.fn(async (键: string, 字段: string) => {
        const 项 = 存储.get(键)
        return 项?.字段.get(字段) ?? null
      }),
    },
  }
})

import {
  REN_JI_ZI_FU_BIAO,
  guiYiHuaRenJiDaAn,
  qianFaRenJiTiaoZhan,
  shengChengRenJiDaAn,
  shengChengRenJiTiaoZhanSvg,
  shiHeFaRenJiDaAn,
  shiHeFaRenJiPiaoJu,
  xiaoHaoRenJiTiaoZhan,
} from '../人机验证'

function 取挑战答案(票据: string): string {
  return 存储.get(`ren_ji_tiao_zhan:${票据}`)?.字段.get('daAn') ?? ''
}

beforeEach(() => {
  存储.clear()
  Redis调用.写入失败 = false
  Redis调用.过期写入失败 = false
  Redis调用.读取失败 = false
  vi.clearAllMocks()
})

describe('人机验证答案生成', () => {
  it('固定4位且只使用无歧义字符集', () => {
    for (let 轮次 = 0; 轮次 < 200; 轮次 += 1) {
      const 答案 = shengChengRenJiDaAn()
      expect(答案).toHaveLength(4)
      for (const 字符 of 答案) expect(REN_JI_ZI_FU_BIAO).toContain(字符)
      expect(答案).not.toMatch(/[O0I1]/)
    }
  })

  it('格式校验接受小写并转大写，拒绝长度或字符不合法的答案', () => {
    expect(guiYiHuaRenJiDaAn(' ab2c ')).toBe('AB2C')
    expect(shiHeFaRenJiDaAn('ab2c')).toBe(true)
    expect(shiHeFaRenJiDaAn('abc')).toBe(false)
    expect(shiHeFaRenJiDaAn('ABCDE')).toBe(false)
    expect(shiHeFaRenJiDaAn('A0C2')).toBe(false)
    expect(shiHeFaRenJiDaAn(1234)).toBe(false)
    expect(shiHeFaRenJiPiaoJu('rj_0123456789abcdef0123456789abcdef')).toBe(true)
    expect(shiHeFaRenJiPiaoJu('rj_短票')).toBe(false)
    expect(shiHeFaRenJiPiaoJu('x'.repeat(500))).toBe(false)
  })
})

describe('人机挑战SVG', () => {
  it('只由固定字形与干扰图元组成，不含文字、脚本或答案', () => {
    const 答案 = 'A2B3'
    const svg = shengChengRenJiTiaoZhanSvg(答案)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('<circle')
    expect(svg).toContain('<line')
    expect(svg).toContain('<rect')
    expect(svg).not.toContain('<text')
    expect(svg).not.toContain('<script')
    expect(svg).not.toContain('onload')
    expect(svg).not.toContain(答案)
    expect(svg).toContain('aria-hidden="true"')
    expect(svg.match(/<circle/g)?.length ?? 0).toBeGreaterThan(40)
  })
})

describe('人机挑战签发', () => {
  it('返回票据、SVG与120秒有效期，答案只落在Redis', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    expect(挑战).not.toBeNull()
    expect(挑战?.id).toMatch(/^rj_[0-9a-f]{32}$/)
    expect(挑战?.guoQiMiao).toBe(120)
    expect(挑战?.svg).toContain('<svg')
    const 答案 = 取挑战答案(挑战!.id)
    expect(答案).toHaveLength(4)
    expect(JSON.stringify(挑战)).not.toContain(答案)
    expect(存储.get(`ren_ji_tiao_zhan:${挑战!.id}`)?.字段.get('ip')).toBe('1.2.3.4')
    expect(存储.get(`ren_ji_tiao_zhan:${挑战!.id}`)?.字段.get('yongTu')).toBe('zhuCe')
    expect(存储.get(`ren_ji_tiao_zhan:${挑战!.id}`)?.字段.get('changShiCiShu')).toBe('0')
    expect(存储.get(`ren_ji_tiao_zhan:${挑战!.id}`)?.到期毫秒).toBeGreaterThan(Date.now() + 110 * 1000)
  })

  it('Redis写入失败时返回null且不抛异常', async () => {
    Redis调用.写入失败 = true
    await expect(qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')).resolves.toBeNull()
  })

  it('过期时间写入失败时回收半成品键并返回null', async () => {
    Redis调用.过期写入失败 = true
    await expect(qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')).resolves.toBeNull()
    expect(存储.size).toBe(0)
  })
})

describe('人机挑战消费', () => {
  it('答案正确即通过并销毁票据，重复使用一定失败', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    const 答案 = 取挑战答案(挑战!.id)
    const 首次 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 答案.toLowerCase(), '1.2.3.4', 'zhuCe')
    expect(首次).toEqual({ cheng_gong: true })
    expect(存储.has(`ren_ji_tiao_zhan:${挑战!.id}`)).toBe(false)
    const 再次 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 答案, '1.2.3.4', 'zhuCe')
    expect(再次).toEqual({ cheng_gong: false, yuanYin: 'guoQi' })
  })

  it('答案错误累计5次后销毁票据', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    const 错误答案 = 取挑战答案(挑战!.id) === 'AAAA' ? 'BBBB' : 'AAAA'
    for (let 次数 = 1; 次数 <= 4; 次数 += 1) {
      const 结果 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 错误答案, '1.2.3.4', 'zhuCe')
      expect(结果).toEqual({ cheng_gong: false, yuanYin: 'daAnCuoWu' })
      expect(存储.get(`ren_ji_tiao_zhan:${挑战!.id}`)?.字段.get('changShiCiShu')).toBe(String(次数))
    }
    const 第五次 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 错误答案, '1.2.3.4', 'zhuCe')
    expect(第五次).toEqual({ cheng_gong: false, yuanYin: 'changShiChaoChu' })
    expect(存储.has(`ren_ji_tiao_zhan:${挑战!.id}`)).toBe(false)
  })

  it('绑定来源IP，换IP不能消费且不销毁票据', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    const 答案 = 取挑战答案(挑战!.id)
    const 结果 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 答案, '5.6.7.8', 'zhuCe')
    expect(结果).toEqual({ cheng_gong: false, yuanYin: 'ipBuPiPei' })
    expect(存储.has(`ren_ji_tiao_zhan:${挑战!.id}`)).toBe(true)
    const 正确IP = await xiaoHaoRenJiTiaoZhan(挑战!.id, 答案, '1.2.3.4', 'zhuCe')
    expect(正确IP).toEqual({ cheng_gong: true })
  })

  it('绑定用途，注册票据不能用于找回密码', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    const 答案 = 取挑战答案(挑战!.id)
    const 结果 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 答案, '1.2.3.4', 'chongZhiMiMa')
    expect(结果).toEqual({ cheng_gong: false, yuanYin: 'yongTuBuPiPei' })
    expect(存储.has(`ren_ji_tiao_zhan:${挑战!.id}`)).toBe(true)
  })

  it('票据过期后返回过期，非法票据与非法答案不触达Redis', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    存储.delete(`ren_ji_tiao_zhan:${挑战!.id}`)
    const 过期 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 取挑战答案(挑战!.id) || 'AAAA', '1.2.3.4', 'zhuCe')
    expect(过期).toEqual({ cheng_gong: false, yuanYin: 'guoQi' })
    const 非法票 = await xiaoHaoRenJiTiaoZhan('bad-ticket', 'AAAA', '1.2.3.4', 'zhuCe')
    expect(非法票).toEqual({ cheng_gong: false, yuanYin: 'piaoJuBuHeFa' })
    const 非法答案 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 'A0', '1.2.3.4', 'zhuCe')
    expect(非法答案).toEqual({ cheng_gong: false, yuanYin: 'daAnBuHeFa' })
  })

  it('Redis读取失败时返回内部错误而不是放行', async () => {
    const 挑战 = await qianFaRenJiTiaoZhan('1.2.3.4', 'zhuCe')
    Redis调用.读取失败 = true
    const 结果 = await xiaoHaoRenJiTiaoZhan(挑战!.id, 'AAAA', '1.2.3.4', 'zhuCe')
    expect(结果).toEqual({ cheng_gong: false, yuanYin: 'neiBuCuoWu' })
  })
})
