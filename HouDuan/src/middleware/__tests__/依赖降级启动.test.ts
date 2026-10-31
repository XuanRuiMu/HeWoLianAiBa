import { describe, expect, it, vi, beforeEach } from 'vitest'
import express from 'express'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

const huanJing = vi.hoisted(() => ({
  postgres: false,
  redis: false,
  ciKu: true,
  cuoWuRiZhi: [] as string[],
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn((leiXing: string, xiaoXi: string) => {
      huanJing.cuoWuRiZhi.push(`${leiXing}|${xiaoXi}`)
    }),
  },
  qingLiNeiBuCuoWu: (cuoWu: unknown) => ({ ming_cheng: 'E', cuo_wu: String(cuoWu) }),
}))

vi.mock('../../utils/依赖就绪', async (yuanShi) => {
  const zhen = await (yuanShi as () => Promise<Record<string, unknown>>)()
  return zhen
})

vi.mock('../../数据库', () => ({
  数据库: { query: vi.fn(), connect: vi.fn(), end: vi.fn(), on: vi.fn() },
  tanCeShuJuKuJiuXu: vi.fn(async () => {
    const { biaoJiWeiJiuXu, biaoJiYiJiuXu } = await import('../../utils/依赖就绪')
    if (huanJing.postgres) {
      biaoJiYiJiuXu('postgres')
      return true
    }
    biaoJiWeiJiuXu('postgres', '探测失败')
    return false
  }),
}))

vi.mock('../../redis', () => ({
  redis: { status: 'ready', ping: vi.fn(), on: vi.fn(), once: vi.fn(), off: vi.fn() },
  tanCeRedisJiuXu: vi.fn(async () => {
    const { biaoJiWeiJiuXu, biaoJiYiJiuXu } = await import('../../utils/依赖就绪')
    if (huanJing.redis) {
      biaoJiYiJiuXu('redis')
      return true
    }
    biaoJiWeiJiuXu('redis', '探测失败')
    return false
  }),
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  biaoJiRedisYiTanCeShiBai: vi.fn(),
  gouJianRedisLianJiePeiZhi: vi.fn(() => ({ host: '127.0.0.1', port: 6379 })),
}))

vi.mock('../../services/审核词库', () => ({
  jiaZaiZuiXinCiKu: vi.fn(async () => {
    if (!huanJing.ciKu) throw new Error('ENOENT 审核词库缺失')
    return { banBen: 'v1', gengXinShiJian: '', leiBie: {} }
  }),
  huoQuCiKuMuLu: vi.fn(() => 'src/config/审核词库'),
}))

import { 全YuZhanCuoWuChuLi } from '../错误处理'
import { 依赖闸门中间件, 重置闸门节流, 选址依赖错误码 } from '../依赖闸门'
import { 依赖不可用错误 } from '../../utils/依赖错误'
import { biaoJiYiJiuXu, 重置就绪状态, huoQuJiuXuKuaiZhao } from '../../utils/依赖就绪'
import { 校验redissTLS, 启动前强校验 } from '../../启动校验'

const YE_WU_LU_JING = '/ye-wu'

function daQiFuWu(peizhi: (yingYong: express.Express) => void): Promise<{ url: string; guan: () => Promise<void> }> {
  const yingYong = express()
  yingYong.use(express.json())
  peizhi(yingYong)
  yingYong.use(全YuZhanCuoWuChuLi)
  return new Promise((jiejue) => {
    const fuWuQi = createServer(yingYong)
    fuWuQi.listen(0, '127.0.0.1', () => {
      const duanKou = (fuWuQi.address() as AddressInfo).port
      jiejue({
        url: `http://127.0.0.1:${duanKou}`,
        guan: () => new Promise<void>((jieshu) => fuWuQi.close(() => jieshu())),
      })
    })
  })
}

async function qingQiu(url: string, fangFa = 'POST'): Promise<{ zhuangTaiMa: number; ti: Record<string, unknown> }> {
  const xiangYing = await fetch(`${url}${YE_WU_LU_JING}`, {
    method: fangFa,
    headers: { 'Content-Type': 'application/json' },
    body: fangFa === 'POST' ? JSON.stringify({ shouJiHao: '+8613900000001', miMa: 'Fpdeg12345' }) : undefined,
  })
  return { zhuangTaiMa: xiangYing.status, ti: (await xiangYing.json()) as Record<string, unknown> }
}

describe('FP-DEG 依赖未就绪时业务路由返回结构化 503', () => {
  beforeEach(() => {
    重置就绪状态()
    重置闸门节流()
    huanJing.postgres = false
    huanJing.redis = false
    huanJing.ciKu = true
  })

  it('数据库未就绪 → 503 + DEPENDENCY_POSTGRES_UNAVAILABLE，文案明确是服务器问题且与账号密码无关', async () => {
    biaoJiYiJiuXu('redis')
    biaoJiYiJiuXu('词库')
    const { url, guan } = await daQiFuWu((yingYong) => {
      yingYong.use(依赖闸门中间件)
      yingYong.post(YE_WU_LU_JING, (_q, s) => s.json({ cheng_gong: true }))
    })
    try {
      const { zhuangTaiMa, ti } = await qingQiu(url)
      expect(zhuangTaiMa).toBe(503)
      expect(ti.code).toBe('DEPENDENCY_POSTGRES_UNAVAILABLE')
      expect(String(ti.message)).toMatch(/服务器|服务端/)
      expect(String(ti.message)).toMatch(/账号|密码/)
      expect(String(ti.message)).not.toMatch(/PostgreSQL|Redis|SQL|堆栈|stack/i)
    } finally {
      await guan()
    }
  })

  it('两个依赖都不可用 → 503 + DEPENDENCIES_UNAVAILABLE', async () => {
    const { url, guan } = await daQiFuWu((yingYong) => {
      yingYong.use(依赖闸门中间件)
      yingYong.post(YE_WU_LU_JING, (_q, s) => s.json({ cheng_gong: true }))
    })
    try {
      const { zhuangTaiMa, ti } = await qingQiu(url)
      expect(zhuangTaiMa).toBe(503)
      expect(ti.code).toBe('DEPENDENCIES_UNAVAILABLE')
    } finally {
      await guan()
    }
  })

  it('依赖全部就绪时闸门放行，业务路由正常响应', async () => {
    biaoJiYiJiuXu('postgres')
    biaoJiYiJiuXu('redis')
    biaoJiYiJiuXu('词库')
    const { url, guan } = await daQiFuWu((yingYong) => {
      yingYong.use(依赖闸门中间件)
      yingYong.post(YE_WU_LU_JING, (_q, s) => s.json({ cheng_gong: true }))
    })
    try {
      const { zhuangTaiMa, ti } = await qingQiu(url)
      expect(zhuangTaiMa).toBe(200)
      expect(ti).toEqual({ cheng_gong: true })
    } finally {
      await guan()
    }
  })

  it('全局错误处理把依赖异常映射为 503 与对应错误码', async () => {
    biaoJiYiJiuXu('redis')
    biaoJiYiJiuXu('词库')
    const { url, guan } = await daQiFuWu((yingYong) => {
      yingYong.post(YE_WU_LU_JING, (_q, _s, xiaYiBu) => {
        xiaYiBu(new 依赖不可用错误('postgres', Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5499'), { code: 'ECONNREFUSED' })))
      })
    })
    try {
      const { zhuangTaiMa, ti } = await qingQiu(url)
      expect(zhuangTaiMa).toBe(503)
      expect(ti.code).toBe('DEPENDENCY_POSTGRES_UNAVAILABLE')
    } finally {
      await guan()
    }
  })

  it('选址依赖错误码在部分就绪时指向正确的单一依赖', () => {
    expect(选址依赖错误码({ postgres: true, redis: true, 词库: true })).toBeNull()
    expect(选址依赖错误码({ postgres: true, redis: false, 词库: true })).toBe('DEPENDENCY_REDIS_UNAVAILABLE')
    expect(选址依赖错误码({ postgres: false, redis: true, 词库: true })).toBe('DEPENDENCY_POSTGRES_UNAVAILABLE')
    expect(选址依赖错误码({ postgres: false, redis: false, 词库: true })).toBe('DEPENDENCIES_UNAVAILABLE')
  })
})

describe('FP-DEG 配置非法拒绝启动 / 依赖不可用降级启动', () => {
  beforeEach(() => {
    重置就绪状态()
    huanJing.cuoWuRiZhi.length = 0
  })

  it('rediss:// 未启用 TLS → 拒绝启动', () => {
    const panDing = 校验redissTLS({}, 'rediss://:miMa@127.0.0.1:6379/0')
    expect(panDing.keQiDong).toBe(false)
    expect(panDing.cuoWuMa).toBe('DOCKER_STARTUP_REDIS_TLS_INVALID')
  })

  it('已启用 TLS 的 rediss 连接 → 允许启动', () => {
    expect(校验redissTLS({ tls: {} }, 'rediss://:miMa@127.0.0.1:6379/0').keQiDong).toBe(true)
  })

  it('普通 redis 连接不做 TLS 判定', () => {
    expect(校验redissTLS({}, 'redis://:miMa@127.0.0.1:6379/0').keQiDong).toBe(true)
  })

  it('依赖不可用时不退出进程，就绪状态置 false 并记录降级日志', async () => {
    huanJing.postgres = false
    huanJing.redis = false
    const tuiChu = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    try {
      await 启动前强校验()
      expect(tuiChu).not.toHaveBeenCalled()
      expect(huoQuJiuXuKuaiZhao().postgres).toBe(false)
      expect(huoQuJiuXuKuaiZhao().redis).toBe(false)
      expect(huoQuJiuXuKuaiZhao().词库).toBe(true)
      const jiangJi = huanJing.cuoWuRiZhi.filter((hang) => hang.includes('已降级启动'))
      expect(jiangJi.length).toBe(2)
      expect(jiangJi.join('|')).toMatch(/PostgreSQL|Redis/)
    } finally {
      tuiChu.mockRestore()
    }
  })

  it('依赖可用时就绪状态全部置为 true', async () => {
    huanJing.postgres = true
    huanJing.redis = true
    huanJing.ciKu = true
    const tuiChu = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    try {
      await 启动前强校验()
      expect(tuiChu).not.toHaveBeenCalled()
      expect(huoQuJiuXuKuaiZhao()).toEqual({ postgres: true, redis: true, 词库: true })
    } finally {
      tuiChu.mockRestore()
    }
  })

  it('审核词库缺失时不退出进程，只标记词库未就绪', async () => {
    huanJing.postgres = true
    huanJing.redis = true
    huanJing.ciKu = false
    const tuiChu = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    try {
      await 启动前强校验()
      expect(tuiChu).not.toHaveBeenCalled()
      expect(huoQuJiuXuKuaiZhao().词库).toBe(false)
    } finally {
      tuiChu.mockRestore()
    }
  })
})