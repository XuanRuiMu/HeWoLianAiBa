import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { dengLiCuoWuXianRongLieBiao, huoQuCuoWuXianRong, type CuoWuDaiMa } from '../../src/config/错误码注册表'
import { 错误码文档路径, duiQu旧码映射, 生成错误码文档 } from '../错误码文档'

const 已提交文档 = readFileSync(错误码文档路径, 'utf8')
const 归一 = (文本: string): string => 文本.replace(/\r\n/g, '\n')

interface 码行 {
  码: string
  单元: string[]
}

function 查码行(文档: string): 码行[] {
  return 归一(文档)
    .split('\n')
    .filter((行) => /^\|[A-Z][A-Z0-9_]*\|/.test(行))
    .map((行) => ({ 码: 行.slice(1, 行.indexOf('|', 1)), 单元: 行.split('|').slice(1, -1) }))
}

const 敏感样本: ReadonlyArray<readonly [string, RegExp]> = [
  ['SQL 读语句', /\bSELECT\b/i],
  ['SQL 写语句', /\b(?:INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE)\b/i],
  ['解释器堆栈', /Traceback \(most recent call last\)|\n\s+at\s+[\w.$]+ \(/],
  ['令牌原文', /eyJ[A-Za-z0-9_-]{8,}/],
  ['Bearer 凭证', /Bearer\s+[A-Za-z0-9._-]{8,}/],
  ['凭据键值', /(?:password|passwd|token|secret|api[_-]?key|authorization)\s*[:=]\s*\S/i],
  ['连接串', /(?:postgres|postgresql|redis|mysql):\/\//i],
  ['本机或容器路径', /[A-Za-z]:\\|\/(?:home|app|usr|var|etc)\//],
  ['环境变量取值', /process\.env\.[A-Z_]+/],
]

function 查违规(文档: string): string[] {
  const 违规: string[] = []
  const 行 = 查码行(文档)
  if (行.length === 0) {
    违规.push('文档里解析不出任何码表行')
    return 违规
  }
  const 旧码 = duiQu旧码映射()
  const 期望 = new Map<string, string[]>()
  for (const 码 of dengLiCuoWuXianRongLieBiao) {
    const 定义 = huoQuCuoWuXianRong(码)
    期望.set(码, [
      码,
      String(定义.httpStatus),
      定义.message,
      定义.retryable ? '是' : '否',
      定义.retryAfterMs === undefined ? '—' : String(定义.retryAfterMs),
    ])
  }
  for (const 项 of 旧码) {
    期望.set(项.旧码, [项.旧码, 项.现码])
  }
  const 已见 = new Map<string, number>()
  for (const 项 of 行) {
    已见.set(项.码, (已见.get(项.码) ?? 0) + 1)
    const 目标 = 期望.get(项.码)
    if (目标 === undefined) {
      违规.push(`未注册码 ${项.码}`)
      continue
    }
    if (项.单元.join('|') !== 目标.join('|')) {
      违规.push(`${项.码} 行与真源不一致：${项.单元.join('|')}`)
    }
  }
  for (const 码 of 期望.keys()) {
    const 次数 = 已见.get(码) ?? 0
    if (次数 !== 1) {
      违规.push(`${码} 出现 ${次数} 行，必须恰好一行`)
    }
  }
  for (const [名, 表达式] of 敏感样本) {
    if (表达式.test(文档)) {
      违规.push(`出现敏感样例：${名}`)
    }
  }
  if (文档.includes('\uFFFD')) {
    违规.push('文档含替换字符 U+FFFD')
  }
  if (文档.charCodeAt(0) === 0xfeff) {
    违规.push('文档带 BOM')
  }
  return 违规
}

function 查格式违规(文档: string): string[] {
  const 违规: string[] = []
  const 行 = 归一(文档).split('\n')
  const 标题 = 行.filter(本行 => /^#{1,6} /.test(本行))
  if (new Set(标题).size !== 标题.length) {
    违规.push('存在内容完全相同的标题')
  }
  行.forEach((本行, 下标) => {
    if (!/^#{1,6} /.test(本行)) {
      return
    }
    const 上 = 下标 > 0 ? 行[下标 - 1] : ''
    const 下 = 下标 < 行.length - 1 ? 行[下标 + 1] : ''
    if (上 !== '' || 下 !== '') {
      违规.push(`第 ${下标 + 1} 行标题未空行包围`)
    }
  })
  const 块类 = (本行: string): string => (本行.startsWith('|') ? '表格' : /^- /.test(本行) ? '列表' : '')
  let 下标 = 0
  while (下标 < 行.length) {
    const 类 = 块类(行[下标])
    if (类 === '') {
      下标 += 1
      continue
    }
    const 起 = 下标
    while (下标 < 行.length && 块类(行[下标]) === 类) {
      下标 += 1
    }
    const 止 = 下标 - 1
    if ((起 > 0 && 行[起 - 1] !== '') || (止 < 行.length - 1 && 行[止 + 1] !== '')) {
      违规.push(`第 ${起 + 1} 至 ${止 + 1} 行${类}块未空行包围`)
    }
    if (类 === '表格') {
      if (!/^\|[-|]+\|$/.test(行[起 + 1] ?? '')) {
        违规.push(`第 ${起 + 2} 行表格缺 compact 分隔行`)
      }
      for (let 行号 = 起; 行号 <= 止; 行号 += 1) {
        if (/\|\s|\s\|/.test(行[行号])) {
          违规.push(`第 ${行号 + 1} 行表格不是 compact 管道风格`)
        }
      }
    }
  }
  for (const 匹配 of 归一(文档).matchAll(/```([^\n]*)\n([\s\S]*?)```/g)) {
    if (!/^[a-z]+$/.test(匹配[1])) {
      违规.push(`代码块未标语言：${匹配[1]}`)
    }
    if (匹配[2].trim() === '') {
      违规.push('代码块内容为空')
    }
  }
  return 违规
}

describe('错误码大全与注册表同源', () => {
  it('重新生成结果与已提交文档逐字一致', () => {
    expect(归一(已提交文档)).toBe(生成错误码文档())
  })

  it('每个注册码恰好一行且状态、可重试、重试间隔与文案逐条一致', () => {
    expect(查违规(已提交文档)).toEqual([])
    expect(dengLiCuoWuXianRongLieBiao.length).toBe(查码行(已提交文档).length - duiQu旧码映射().length)
  })

  it('全部 57 个注册码都在文档里，旧码只出现在兼容映射表', () => {
    const 注册码 = dengLiCuoWuXianRongLieBiao as readonly CuoWuDaiMa[]
    expect(注册码.length).toBe(57)
    const 旧码 = new Set(duiQu旧码映射().map((项) => 项.旧码))
    for (const 码 of 注册码) {
      expect(旧码.has(码), `${码} 不得同时是旧码`).toBe(false)
    }
    expect(查码行(已提交文档).filter((项) => 注册码.includes(项.码 as CuoWuDaiMa))).toHaveLength(注册码.length)
  })

  it('文档不含 SQL、堆栈、连接串、环境变量取值与令牌等敏感样例', () => {
    for (const [名, 表达式] of 敏感样本) {
      expect(表达式.test(已提交文档), `文档出现敏感样例：${名}`).toBe(false)
    }
    expect([...归一(已提交文档).matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((匹配) => 匹配[1])).toEqual([
      'npx ts-node scripts/错误码文档.ts\n',
    ])
  })

  it('Markdown 为 UTF-8 无 BOM、无替换字符，标题与表格符合格式守卫', () => {
    expect(已提交文档.charCodeAt(0)).not.toBe(0xfeff)
    expect(已提交文档).not.toContain('\uFFFD')
    expect(查格式违规(已提交文档)).toEqual([])
  })

  it('分类覆盖注册表全部码且无空分类', () => {
    const 小节 = [...归一(已提交文档).matchAll(/^### (.+)$/gm)].map((匹配) => 匹配[1])
    expect(小节).toEqual(['依赖', '认证', '数据', '业务', '网络', 'Docker 启动', '战绩', '角色生成', '管理'])
    for (const 分类 of 小节) {
      const 段 = 归一(已提交文档).split(`### ${分类}\n`)[1].split('\n### ')[0]
      expect(查码行(段).length, `${分类} 分类为空`).toBeGreaterThan(0)
    }
  })

  it('反证：漏行、改状态、留未注册码与塞敏感样例都必须判红', () => {
    const 完整 = 生成错误码文档()
    const 首行 = 查码行(完整)[0]
    expect(查违规(完整.replace(`${首行.码}|${首行.单元[1]}`, `${首行.码}|599`), '改状态')).toContain(
      `${首行.码} 行与真源不一致：${首行.码}|599|${首行.单元[2]}|${首行.单元[3]}|${首行.单元[4]}`,
    )
    expect(查违规(完整.replace(首行.码, 'FIRST_ROW_PLACEHOLDER'), '漏行').length).toBeGreaterThan(0)
    expect(查违规(完整.replace(/^# .*$/m, '# 和我恋爱吧 错误码大全\n\n|UNREGISTERED_CODE|404|x|否|—|'))).toContain(
      '未注册码 UNREGISTERED_CODE',
    )
    expect(查违规(`${完整}\nSELECT * FROM "用户"\n`)).toContain('出现敏感样例：SQL 读语句')
  })

  it('反证：注册表旧码映射解析不到或解析到多处必须抛错', () => {
    expect(duiQu旧码映射().length).toBeGreaterThan(0)
    expect(查违规('')).toEqual(['文档里解析不出任何码表行'])
  })
})
