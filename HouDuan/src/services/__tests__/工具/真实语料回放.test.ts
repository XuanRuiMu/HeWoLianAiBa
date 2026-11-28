import { describe, expect, it, afterEach, vi } from 'vitest'
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  解析真实语料,
  读取真实对话片段,
  默认语料目录,
  选取回放片段,
  构造回放历史,
  构造语义评审提示词,
  解析语义评审,
  汇总问题标签,
  创建回放记录器,
} from '../../语料读取'
import { sheZhiMockTiaoYong, tiaoYongMoXing } from '../../../utils/通用模型调用'

const 临时目录: string[] = []
const 语料目录存在 = existsSync(默认语料目录())
const 语料相关描述 = 语料目录存在 ? describe : describe.skip
const 通用描述 = describe

afterEach(() => {
  for (const 路径 of 临时目录.splice(0)) rmSync(路径, { recursive: true, force: true })
  vi.restoreAllMocks()
  sheZhiMockTiaoYong(null)
})

语料相关描述('FP04 本地真实公开语料读取', () => {
  it('固定自然对话文件可解析为六个互不重叠的三回合多轮片段', () => {
    const 片段列表 = 语料目录存在 ? 读取真实对话片段(默认语料目录(), 6) : []
    expect(片段列表.map((片段) => 片段.片段ID)).toEqual([
      '0_2-片段1', '0_2-片段2', '0_2-片段3',
      '0_3-片段1', '0_3-片段2', '0_3-片段3',
    ])
    expect(片段列表.every((片段) => 片段.轮次.length === 3)).toBe(true)
    expect(片段列表.flatMap((片段) => 片段.轮次)).toHaveLength(18)
    expect(片段列表[0]?.轮次[0]?.A原话).toBe('嗨！')
    expect(片段列表[0]?.轮次[0]?.真人B原话).toBe('你好。')
    const 所有A = 片段列表.flatMap((片段) => 片段.轮次.map((轮次) => 轮次.A原话))
    expect(new Set(所有A).size).toBe(所有A.length)
  })

  it('原样保留首尾换行：内容校验不擅自改写A方输入', () => {
    const 数据 = JSON.stringify({ rows: [{ row: { dialog_id: '', content: ['\n首行与尾行保留 ', '同轮真实B', '第二轮原文', '第二轮真实B'] } }] })
    expect(解析真实语料(数据, '测试结构.json')[0]?.轮次[0]?.A原话).toBe('\n首行与尾行保留 ')
    expect(解析真实语料(JSON.stringify({ rows: [{ row: { dialog_id: '', content: ['原文 ', '   ', '后续','回应'] } }] }), '测试结构.json')).toEqual([])
  })

  it('验证原始数据和文件来源，不补齐缺失的B或伪造真实发言', () => {
    const 原文 = readFileSync(join(默认语料目录(), 'datasets-server-rows-0-2.json'), 'utf8')
    const 数据 = JSON.parse(原文) as { num_rows_total: number; rows: Array<{ row: { content: string[] } }> }
    expect(数据.num_rows_total).toBe(19919)
    expect(数据.rows).toHaveLength(2)
    expect(解析真实语料(原文, 'datasets-server-rows-0-2.json')).toHaveLength(2)
    const 缺失轮 = JSON.stringify({ rows: [{ row: { dialog_id: '不完整', content: ['原文'] } }] })
    expect(解析真实语料(缺失轮, '测试结构.json')[0]?.轮次[0]?.真人B原话).toBeUndefined()
    expect(解析真实语料(JSON.stringify({ rows: [{ row: { dialog_id: '空内容', content: ['原文', '  ','后续','回应'] } }] }), '测试结构.json')).toEqual([])
    expect(() => 解析真实语料('{无效JSON', '测试结构.json')).toThrow()
  })

  it('只选已有片段，组数不足绝不复制凑数', () => {
    const 片段列表 = 语料目录存在 ? 读取真实对话片段(默认语料目录(), 6) : []
    expect(选取回放片段(片段列表, 5)).toHaveLength(5)
    expect(选取回放片段(片段列表.slice(0, 1), 6)).toHaveLength(1)
  })
})

语料相关描述('FP04 生成上下文与参照隔离', () => {
  const 片段列表 = 语料目录存在 ? 读取真实对话片段(默认语料目录(), 6) : []
  it('先前实际AI进入历史，本轮真人B与其它任何B原话不得泄漏', () => {
    const 片段 = 片段列表[1]!
    const 先前 = { A原话: 片段.轮次[0]!.A原话, AI回应: ['这是注入的既往实际AI'] }
    const 历史 = 构造回放历史([先前])
    expect(历史).toEqual([
      { role: 'user', content: 先前.A原话 },
      { role: 'assistant', content: '这是注入的既往实际AI' },
    ])
    const 序列化 = JSON.stringify(历史)
    expect(序列化).not.toContain(片段.轮次[0]!.真人B原话)
    expect(序列化).not.toContain(片段.轮次[1]!.真人B原话)
    expect(历史[1]?.content).not.toBe(片段.轮次[0]!.真人B原话)
  })

  it('生成空回应时不拿真人B补进历史', () => {
    expect(构造回放历史([{ A原话: '先前原文', AI回应: [] }])).toEqual([{ role: 'user', content: '先前原文' }])
  })

  it('只有独立评审提示词允许包含本轮B原话', () => {
    const 片段 = 片段列表[1]!
    const 结果 = 片段.轮次.map(() => ({ AI回应: ['注入的实际回应'], 调用错误: null }))
    const 提示词 = 构造语义评审提示词(片段, 结果)
    expect(提示词).toContain(片段.轮次[0]!.真人B原话)
    expect(提示词).toContain('模型之前看不到')
    expect(提示词).toContain('必要澄清')
    expect(提示词).not.toContain('建议你用字数')
  })

  it('多分条回应按原本顺序保存，不拼接成更接近B的一条', () => {
    expect(构造回放历史([{ A原话: 'A的原文', AI回应: ['第一种写法', '第二种写法'] }])[1]).toMatchObject({ role: 'assistant', content: '第一种写法\n第二种写法' })
  })
})

通用描述('FP04 语义评审解析器', () => {
  it('接受给定语义与真人B不同但合理承接的结果，不按表面形式判差', () => {
    const 原文 = JSON.stringify({
      每轮: [
        { 轮次: 1, 语义接近: true, 问题标签: [], 理由: '直接问候简洁承接，未制造无关话头；不要求完全复述B。' },
        { 轮次: 2, 语义接近: false, 问题标签: ['演人设丢上下文'], 理由: '把先前自己明确说看的电影改口成没看过。' },
        { 轮次: 3, 语义接近: false, 问题标签: ['无关联追问', '长篇建议'], 理由: '未接当前体育话题而问私人安排，随后展开三条行动教程。' },
      ],
    })
    const 结果 = 解析语义评审(原文, 3)
    expect(结果.map((条目) => 条目.语义接近)).toEqual([true, false, false])
    expect(汇总问题标签(结果)).toEqual({ 演人设丢上下文: 1, 无关联追问: 1, 长篇建议: 1 })
  })

  it('严格要求每轮都有中文有效标签、布尔结果和具体理由', () => {
    expect(() => 解析语义评审(JSON.stringify({ 每轮: [{ 轮次: 1, 语义接近: true, 问题标签: ['无理由拒绝'], 理由: '结构自相矛盾。' }] }), 1)).toThrow('语义接近与问题标签不一致')
    expect(() => 解析语义评审(JSON.stringify({ 每轮: [{ 轮次: 1, 语义接近: false, 问题标签: [], 理由: '无任何标签。' }] }), 1)).toThrow('语义接近与问题标签不一致')
    expect(() => 解析语义评审(JSON.stringify({ 每轮: [{ 轮次: 1, 语义接近: true, 问题标签: [], 理由: '' }] }), 1)).toThrow('判定理由必须是有效文本')
    expect(() => 解析语义评审(JSON.stringify({ 每轮: [{ 轮次: 1, 语义接近: false, 问题标签: ['不必要的字数指标'], 理由: '无关表面指标。' }] }), 1)).toThrow('问题标签必须为受支持的中文标签')
    expect(() => 解析语义评审('```json\n{"每轮":[]}\n```', 1)).toThrow()
  })

  it('拒绝重复、遗漏和越界，绝不代填AI未评审的项目', () => {
    const 两轮相同 = { 每轮: [
      { 轮次: 1, 语义接近: true, 问题标签: [], 理由: '承接当前原话。' },
      { 轮次: 1, 语义接近: true, 问题标签: [], 理由: '重复标注。' },
    ] }
    expect(() => 解析语义评审(JSON.stringify(两轮相同), 2)).toThrow('轮次重复或越界')
    expect(() => 解析语义评审(JSON.stringify({ 每轮: [{ 轮次: 1, 语义接近: true, 问题标签: [], 理由: '合理直接回应。' }] }), 2)).toThrow('遗漏轮次')
  })
})

通用描述('FP04 JSONL记录器', () => {
  it('按轮保留A、真人B、分条AI、问题标签并写真实文件，无凭据字段', () => {
    const 目录 = mkdtempSync(join(tmpdir(), 'fp04-'))
    临时目录.push(目录)
    const 路径 = join(目录, '嵌套', 'FP04-回放-20261120.jsonl')
    const 记录器 = 创建回放记录器(路径, '测试运行')
    记录器.记录轮次({
      片段ID: '测试来源片段', 来源文件: '真实源.json', 轮次: 1,
      A原话: '输入原话', 真人B原话: '真人参照原话', AI回应: ['实际第一段', '实际第二段'],
      语义接近: false, 问题标签: ['长篇建议'], 判定理由: '主动展开成多条教导。', 调用错误: null,
    })
    const 行 = readFileSync(路径, 'utf8').trim().split('\n').map((内容) => JSON.parse(内容) as Record<string, unknown>)
    expect(行).toHaveLength(1)
    expect(行[0]).toMatchObject({
      类型: '逐轮', 运行ID: '测试运行', A原话: '输入原话', 真人B原话: '真人参照原话',
      AI回应: ['实际第一段', '实际第二段'], 问题标签: ['长篇建议'], 调用错误: null,
    })
    expect(行[0]?.AI回应).not.toContain(行[0]?.真人B原话)
    expect(路径).toContain('FP04-回放-20261120.jsonl')
    expect(readFileSync(路径, 'utf8')).not.toContain('sk-')
  })

  it('注入错误与原始语义样本另行落记录，不把翻译的业务提示冒充上游错误', () => {
    const 目录 = mkdtempSync(join(tmpdir(), 'fp04-'))
    临时目录.push(目录)
    const 路径 = join(目录, '日志.jsonl')
    const 记录器 = 创建回放记录器(路径, '测试运行')
    记录器.写入({ 类型: '环境错误', 错误: 'TypeError: fetch failed', 片段ID: '真实片段' })
    expect(JSON.parse(readFileSync(路径, 'utf8')).错误).toBe('TypeError: fetch failed')
    expect(JSON.parse(readFileSync(路径, 'utf8')).错误).not.toBe('消息没发出去，稍等再试')
  })

  it('同一问题标签跨轮累加，同一轮相同标签只计一次', () => {
    expect(汇总问题标签([
      { 问题标签: ['无关联追问', '长篇建议'] },
      { 问题标签: ['无关联追问'] },
      { 问题标签: [] },
    ])).toEqual({ 无关联追问: 2, 长篇建议: 1 })
  })
})

通用描述('FP04 Vitest外呼隔离', () => {
  it('缺省显式许可会被客户端拒绝，测试不创建AI回应', async () => {
    const 原计划 = process.env.XU_KE_ZHEN_SHI_WAI_HU
    process.env.XU_KE_ZHEN_SHI_WAI_HU = 'false'
    const 联网 = vi.spyOn(globalThis, 'fetch')
    try {
      await expect(tiaoYongMoXing({ xiaoXi: [{ jiaoSe: 'user', neiRong: '只应为本地逻辑校验' }] })).rejects.toThrow('VITEST')
      expect(联网).not.toHaveBeenCalled()
    } finally {
      if (原计划 === undefined) delete process.env.XU_KE_ZHEN_SHI_WAI_HU
      else process.env.XU_KE_ZHEN_SHI_WAI_HU = 原计划
    }
  })
})
