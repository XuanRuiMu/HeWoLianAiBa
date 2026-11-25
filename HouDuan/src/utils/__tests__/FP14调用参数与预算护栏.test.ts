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

import { AI配置 } from '../../config/AI配置'
import { jiSuanAIChanShu, 写手温度ShangXian, type 参数上下文 } from '../../config/AI参数策略'
import { 预算保护, 自检模型名可用, type 对话消息 } from '../通用模型调用'
import { debug日志 } from '../debug日志'
import { jiLuShiYongLiang } from '../../services/用量统计'

const 慢热上下文: 参数上下文 = {
  jiaoSe: { ie_lei_xing: 'E', re_shen_lei_xing: '快热', shi_fou_zha_xing: true },
  haoGanDu: { guan_xi_jie_duan: '热恋' },
  changJing: 'chaoJia',
}

describe('FP-14 采样参数只在该生效的模式下下发（官方：思考模式 temperature 不生效、非思考模式 top_p 恒为 1.0）', () => {
  it('思考场景不下发温度，且 top_p 不低于官方下限 0.95', () => {
    for (const 键 of ['DaoYan', 'JiYiZhaiYao', 'JunShiQiuZhu', 'KaiChangBai', 'FuPanShengCheng'] as const) {
      const 参数 = jiSuanAIChanShu(键, 慢热上下文)
      expect(参数.wenDu, 键).toBeUndefined()
      expect(参数.top_p, 键).toBeGreaterThanOrEqual(0.95)
      expect(参数.思考模式, 键).toBe('enabled')
    }
  })

  it('writer 默认走非思考模式：带温度，不带 思考强度', () => {
    expect(AI配置.模型.XieShou.思考模式).toBe('disabled')
    expect(AI配置.模型.XieShou.top_p).toBeUndefined()
    expect(AI配置.模型.XieShou.wenDu).toBeDefined()
    const 参数 = jiSuanAIChanShu('XieShou')
    expect(参数.wenDu).toBeCloseTo(0.9, 2)
    expect(参数.思考强度).toBeUndefined()
  })

  it('writer 的人设微调在非思考模式下真实生效', () => {
    const E型快热 = jiSuanAIChanShu('XieShou', {
      jiaoSe: { ie_lei_xing: 'E', re_shen_lei_xing: '快热', shi_fou_zha_xing: false },
      haoGanDu: { guan_xi_jie_duan: 'pengYou' },
    })
    const I型慢热 = jiSuanAIChanShu('XieShou', {
      jiaoSe: { ie_lei_xing: 'I', re_shen_lei_xing: '慢热', shi_fou_zha_xing: false },
      haoGanDu: { guan_xi_jie_duan: 'pengYou' },
    })
    expect(E型快热.wenDu).toBeGreaterThanOrEqual(I型慢热.wenDu!)
    expect(I型慢热.wenDu).toBeLessThanOrEqual(写手温度ShangXian)
  })

  it('显式打开 Writer 思考开关时才走思考模式', async () => {
    const 原开关 = process.env['WRITER_SI_KAO_QI_YONG']
    process.env['WRITER_SI_KAO_QI_YONG'] = 'true'
    vi.resetModules()
    try {
      const { AI配置: 开后配置 } = await import('../../config/AI配置')
      expect(开后配置.模型.XieShou.思考模式).toBe('enabled')
      expect(开后配置.模型.XieShou.思考强度).toBeTruthy()
    } finally {
      if (原开关 === undefined) delete process.env['WRITER_SI_KAO_QI_YONG']
      else process.env['WRITER_SI_KAO_QI_YONG'] = 原开关
      vi.resetModules()
    }
  })

  it('关掉 Writer 思考开关后回到非思考模式：只配温度，无 top_p/思考强度 残留', async () => {
    const 原开关 = process.env['WRITER_SI_KAO_QI_YONG']
    const 原温度 = process.env['WRITER_WENDU']
    process.env['WRITER_SI_KAO_QI_YONG'] = 'false'
    process.env['WRITER_WENDU'] = '1.0'
    vi.resetModules()
    try {
      const { AI配置: 关后配置 } = await import('../../config/AI配置')
      const { jiSuanAIChanShu: 关后计算 } = await import('../../config/AI参数策略')
      expect(关后配置.模型.XieShou.思考模式).toBe('disabled')
      expect(关后配置.模型.XieShou.top_p).toBeUndefined()
      expect(关后配置.模型.XieShou.思考强度).toBeUndefined()
      expect(关后计算('XieShou').wenDu).toBeCloseTo(1.0, 2)
      expect(关后计算('XieShou', 慢热上下文).wenDu).toBeGreaterThan(0.5)
      expect(关后计算('XieShou', 慢热上下文).wenDu).toBeLessThanOrEqual(1.15)
    } finally {
      if (原开关 === undefined) delete process.env['WRITER_SI_KAO_QI_YONG']
      else process.env['WRITER_SI_KAO_QI_YONG'] = 原开关
      if (原温度 === undefined) delete process.env['WRITER_WENDU']
      else process.env['WRITER_WENDU'] = 原温度
      vi.resetModules()
    }
  })

  it('非思考场景下发温度但不下发 top_p，人设/关系/场景修正仍生效', () => {
    const 参数 = jiSuanAIChanShu('QingGanFenXi', 慢热上下文)
    expect(参数.top_p).toBeUndefined()
    expect(参数.思考模式).toBe('disabled')
    expect(参数.wenDu).toBeCloseTo(0.2, 2)
    expect(jiSuanAIChanShu('QingGanFenXi').wenDu).toBeCloseTo(0.2, 2)
  })

  it('AI 配置里不再残留永远不生效的采样字段', () => {
    for (const [键, 基座] of Object.entries(AI配置.模型)) {
      if (基座.思考模式 === 'enabled') expect(基座.wenDu, `${键} 思考模式不该配温度`).toBeUndefined()
      else expect(基座.top_p, `${键} 非思考模式 top_p 恒为 1.0`).toBeUndefined()
    }
  })
})

describe('FP-14 预算护栏按官方 token 口径估算并在裁不动时告警', () => {
  beforeEach(() => vi.mocked(debug日志.warn).mockClear())

  it('中文按 0.6 token/字计（旧口径 字符数/2 会低估中文）', () => {
    const 中文100字 = '啊'.repeat(100)
    const 消息: 对话消息[] = [
      { jiaoSe: 'system', neiRong: 's' },
      { jiaoSe: 'user', neiRong: 中文100字 },
      { jiaoSe: 'user', neiRong: 中文100字 },
    ]
    expect(预算保护(消息, 121).length).toBe(3)
    const 裁后 = 预算保护(消息, 120)
    expect(裁后.length).toBe(2)
    expect(裁后[0].jiaoSe).toBe('system')
    expect(裁后[1].neiRong).toBe(中文100字)
  })

  it('单条消息超预算时不丢消息，但必须告警（聊天主链路的历史就是一整条）', () => {
    const 消息: 对话消息[] = [
      { jiaoSe: 'system', neiRong: 's' },
      { jiaoSe: 'user', neiRong: '啊'.repeat(1000) },
    ]
    expect(预算保护(消息, 100)).toEqual(消息)
    expect(debug日志.warn).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(debug日志.warn).mock.calls[0][1])).toContain('无法再裁')
  })

  it('预算内不告警', () => {
    const 消息: 对话消息[] = [{ jiaoSe: 'user', neiRong: '短' }]
    expect(预算保护(消息, 1000)).toEqual(消息)
    expect(debug日志.warn).not.toHaveBeenCalled()
	})

  it('摘要模型得到900000预算，低于普通六万字上限的素材才允许裁剪', () => {
    expect(jiSuanAIChanShu('JiYiZhaiYao').上下文预算).toBe(900000)
    const 素材 = '约定'.repeat(100000)
    const 消息: 对话消息[] = [
      { jiaoSe: 'system', neiRong: '提炼持续记忆' },
      { jiaoSe: 'user', neiRong: 素材 },
    ]
    const 生效 = 预算保护(消息, jiSuanAIChanShu('JiYiZhaiYao').上下文预算)
    expect(生效).toEqual(消息)
    expect(预算保护(消息, 100).length).toBe(2)
    expect(debug日志.warn).toHaveBeenCalled()
    const 多条消息: 对话消息[] = [
      { jiaoSe: 'system', neiRong: '提炼持续记忆' },
      { jiaoSe: 'user', neiRong: '更早的旧素材' },
      { jiaoSe: 'user', neiRong: 素材 },
    ]
    const 裁后 = 预算保护(多条消息, 100)
    expect(裁后.map((x) => x.neiRong)).toEqual(['提炼持续记忆', 素材])
  })
})

describe('FP-14 模型名在册自检', () => {
  const 原端点 = process.env.DEEPSEEK_BASE_URL
  const 原模型 = process.env.DEEPSEEK_MODEL
  beforeEach(() => {
    process.env.DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
    process.env.DEEPSEEK_MODEL = 'deepseek-flash'
  })
  afterEach(() => {
    process.env.DEEPSEEK_BASE_URL = 原端点
    process.env.DEEPSEEK_MODEL = 原模型
  })
  const 原Fetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = 原Fetch
  })

  it('配置的模型名在官方列表内 → 通过', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'deepseek-flash' }, { id: 'deepseek-v4-pro' }] }),
    })) as unknown as typeof fetch
    await expect(自检模型名可用()).resolves.toBe(true)
  })

  it('模型名不在列表内 → 返回 false 并告警，不抛异常', async () => {
    process.env.DEEPSEEK_MODEL = 'deepseek-flash'
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'deepseek-v4-pro' }] }),
    })) as unknown as typeof fetch
    const { faSongGaoJing } = await import('../邮件告警')
    await expect(自检模型名可用()).resolves.toBe(false)
    expect(faSongGaoJing).toHaveBeenCalled()
  })

  it('拉取失败（网络/限速）时放行，不阻塞启动', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    await expect(自检模型名可用()).resolves.toBe(true)
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
      模型类型: 'XieShou',
      模型: 'deepseek-flash',
      shuRuToken: 1000,
      shuChuToken: 200,
      zongToken: 1200,
      mingZhongToken: 900,
    })
    await jiLuShiYongLiang({
      模型类型: 'XieShou',
      模型: 'deepseek-flash',
      shuRuToken: 1000,
      shuChuToken: 200,
      zongToken: 1200,
      mingZhongToken: 5000,
    })
    const 插入 = 写入的SQL.find((项) => 项.文本.includes('INSERT INTO "LLM用量"'))
    expect(插入).toBeDefined()
    expect(插入!.文本).toContain('缓存命中Token')
    expect(插入!.参数[6]).toBe(900)
    expect(写入的SQL.filter((项) => 项.文本.includes('INSERT INTO "LLM用量"'))[1].参数[6]).toBe(1000)
  })

  it('未上报命中量时按 0 落库（旧调用方不受影响）', async () => {
    await jiLuShiYongLiang({
      模型类型: 'QingGanFenXi',
      模型: 'deepseek-flash',
      shuRuToken: 10,
      shuChuToken: 5,
      zongToken: 15,
    })
    const 插入 = 写入的SQL.find((项) => 项.文本.includes('INSERT INTO "LLM用量"'))
    expect(插入!.参数[6]).toBe(0)
  })
})
