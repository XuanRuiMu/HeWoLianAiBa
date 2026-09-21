import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

const 写入的SQL: Array<{ 文本: string; 参数: unknown[] }> = []

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      写入的SQL.push({ 文本, 参数 })
      return { rows: [], rowCount: 0 }
    },
  },
}))
vi.mock('../../redis', () => {
  const 累加: Record<string, number> = {}
  return {
    redis: {
      hincrby: async (jian: string, yu: string, zeng: number) => {
        累加[`${jian}|${yu}`] = (累加[`${jian}|${yu}`] ?? 0) + zeng
        return 累加[`${jian}|${yu}`]
      },
      expire: async () => undefined,
      hgetall: async () => ({}),
    },
  }
})
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
}))
vi.mock('../邮件告警', () => ({
  faSongGaoJing: vi.fn(async () => true),
  jiLuAIChengGong: vi.fn(),
  jiLuAIShiBai: vi.fn(),
}))

import { AI_PEI_ZHI } from '../../config/AI配置'
import { jiSuanAIChanShu, type CanShuShangXiaWen } from '../../config/AI参数策略'
import { yuSuanBaoHu, ziJianMoXingMingKeYong, type DuiHuaXiaoXi } from '../DeepSeek客户端'
import { debug日志 } from '../debug日志'
import { jiLuShiYongLiang } from '../../services/用量统计'

const 慢热上下文: CanShuShangXiaWen = {
  jiaoSe: { ie_lei_xing: 'E', re_shen_lei_xing: '快热', shi_fou_zha_xing: true },
  haoGanDu: { guan_xi_jie_duan: 'reLian' },
  changJing: 'chaoJia',
}

describe('FP-14 采样参数只在该生效的模式下下发（官方：思考模式 temperature 不生效、非思考模式 top_p 恒为 1.0）', () => {
  it('思考场景不下发温度，且 top_p 不低于官方下限 0.95', () => {
    for (const 键 of ['writer', 'director', 'jiYiZhaiYao', 'junShiQiuZhu', 'kaiChangBai', 'fuPanShengCheng'] as const) {
      const 参数 = jiSuanAIChanShu(键, 慢热上下文)
      expect(参数.wenDu, 键).toBeUndefined()
      expect(参数.top_p, 键).toBeGreaterThanOrEqual(0.95)
      expect(参数.siKaoMoShi, 键).toBe('enabled')
    }
  })

  it('非思考场景下发温度但不下发 top_p，人设/关系/场景修正仍生效', () => {
    const 参数 = jiSuanAIChanShu('qingGanFenXi', 慢热上下文)
    expect(参数.top_p).toBeUndefined()
    expect(参数.siKaoMoShi).toBe('disabled')
    // 基座 0.2 + E 0.1 + 快热 0.05 + 渣 0.05 + 热恋 0.05 + 吵架 -0.15 = 0.3
    expect(参数.wenDu).toBeCloseTo(0.3, 2)
    expect(jiSuanAIChanShu('qingGanFenXi').wenDu).toBeCloseTo(0.2, 2)
  })

  it('AI 配置里不再残留永远不生效的采样字段', () => {
    for (const [键, 基座] of Object.entries(AI_PEI_ZHI.moXing)) {
      if (基座.siKaoMoShi === 'enabled') expect(基座.wenDu, `${键} 思考模式不该配温度`).toBeUndefined()
      else expect(基座.top_p, `${键} 非思考模式 top_p 恒为 1.0`).toBeUndefined()
    }
  })
})

describe('FP-14 预算护栏按官方 token 口径估算并在裁不动时告警', () => {
  beforeEach(() => vi.mocked(debug日志.warn).mockClear())

  it('中文按 0.6 token/字计（旧口径 字符数/2 会低估中文）', () => {
    const 中文100字 = '啊'.repeat(100)
    const 消息: DuiHuaXiaoXi[] = [
      { jiaoSe: 'system', neiRong: 's' },
      { jiaoSe: 'user', neiRong: 中文100字 },
      { jiaoSe: 'user', neiRong: 中文100字 },
    ]
    // 估算量 = system 1 + 60 + 60 = 121；121 不裁，120 裁掉最旧一条
    expect(yuSuanBaoHu(消息, 121).length).toBe(3)
    const 裁后 = yuSuanBaoHu(消息, 120)
    expect(裁后.length).toBe(2)
    expect(裁后[0].jiaoSe).toBe('system')
    expect(裁后[1].neiRong).toBe(中文100字)
  })

  it('单条消息超预算时不丢消息，但必须告警（聊天主链路的历史就是一整条）', () => {
    const 消息: DuiHuaXiaoXi[] = [
      { jiaoSe: 'system', neiRong: 's' },
      { jiaoSe: 'user', neiRong: '啊'.repeat(1000) },
    ]
    expect(yuSuanBaoHu(消息, 100)).toEqual(消息)
    expect(debug日志.warn).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(debug日志.warn).mock.calls[0][1])).toContain('无法再裁')
  })

  it('预算内不告警', () => {
    const 消息: DuiHuaXiaoXi[] = [{ jiaoSe: 'user', neiRong: '短' }]
    expect(yuSuanBaoHu(消息, 1000)).toEqual(消息)
    expect(debug日志.warn).not.toHaveBeenCalled()
  })
})

describe('FP-14 模型名在册自检', () => {
  const 原Fetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = 原Fetch
  })

  it('配置的模型名在官方列表内 → 通过', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: AI_PEI_ZHI.deepSeek.moXing }, { id: 'deepseek-v4-pro' }] }),
    })) as unknown as typeof fetch
    await expect(ziJianMoXingMingKeYong()).resolves.toBe(true)
  })

  it('模型名不在列表内 → 返回 false 并告警，不抛异常', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'another-model' }] }),
    })) as unknown as typeof fetch
    const { faSongGaoJing } = await import('../邮件告警')
    await expect(ziJianMoXingMingKeYong()).resolves.toBe(false)
    expect(faSongGaoJing).toHaveBeenCalled()
  })

  it('拉取失败（网络/限速）时放行，不阻塞启动', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    await expect(ziJianMoXingMingKeYong()).resolves.toBe(true)
  })

  it('过期内测模型名不得残留在源码与实际生效的模型配置里', () => {
    const 根 = path.resolve(__dirname, '../..')
    const 命中: string[] = []
    const 内测名 = /deepseek-[\w.-]*expires/i
    const 走 = (目录: string) => {
      for (const 项 of fs.readdirSync(目录, { withFileTypes: true })) {
        const 路径 = path.join(目录, 项.name)
        if (项.isDirectory()) {
          if (项.name !== '__tests__') 走(路径)
        } else if (/\.ts$/.test(项.name)) {
          const 内容 = fs.readFileSync(路径, 'utf8')
          if (内测名.test(内容)) 命中.push(路径)
        }
      }
    }
    走(根)
    // .env 会覆盖 config 里的默认模型名：内测临时通道不在官方 /v1/models 在册列表内，也拿不到正式模型的
    // 上下文硬盘缓存待遇（实测同前缀两次调用命中 0%），漏一处等于整套共用前缀优化白做
    for (const 文件 of ['../.env', '../.env.example', '../../docker-compose.yml']) {
      const 路径 = path.resolve(根, 文件)
      if (!fs.existsSync(路径)) continue
      for (const 匹配 of fs.readFileSync(路径, 'utf8').matchAll(/DEEPSEEK_MODEL\s*[:=]\s*([^\r\n#]+)/g)) {
        if (内测名.test(匹配[1])) 命中.push(`${文件} → ${匹配[1].trim()}`)
      }
    }
    expect(命中).toEqual([])
  })
})

describe('FP-14 缓存命中量落库', () => {
  beforeEach(() => {
    写入的SQL.length = 0
  })

  it('把 cached_tokens 累计进「缓存命中Token」，且不超过输入 token', async () => {
    await jiLuShiYongLiang({
      moXingLeiXing: 'writer',
      moXing: 'deepseek-flash',
      shuRuToken: 1000,
      shuChuToken: 200,
      zongToken: 1200,
      mingZhongToken: 900,
    })
    await jiLuShiYongLiang({
      moXingLeiXing: 'writer',
      moXing: 'deepseek-flash',
      shuRuToken: 1000,
      shuChuToken: 200,
      zongToken: 1200,
      mingZhongToken: 5000,
    })
    const 插入 = 写入的SQL.find((项) => 项.文本.includes('INSERT INTO "LLM用量"'))
    expect(插入).toBeDefined()
    expect(插入!.文本).toContain('缓存命中Token')
    expect(插入!.参数[6]).toBe(900)
    // 第二条命中量超过输入量，按输入量封顶
    expect(写入的SQL.filter((项) => 项.文本.includes('INSERT INTO "LLM用量"'))[1].参数[6]).toBe(1000)
  })

  it('未上报命中量时按 0 落库（旧调用方不受影响）', async () => {
    await jiLuShiYongLiang({
      moXingLeiXing: 'qingGanFenXi',
      moXing: 'deepseek-flash',
      shuRuToken: 10,
      shuChuToken: 5,
      zongToken: 15,
    })
    const 插入 = 写入的SQL.find((项) => 项.文本.includes('INSERT INTO "LLM用量"'))
    expect(插入!.参数[6]).toBe(0)
  })
})
