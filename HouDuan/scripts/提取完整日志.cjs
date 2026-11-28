'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
const 日志路径 = path.join(后端根, 'logs', 'debug.log')
const 输出目录 = path.join(项目根, '测试报告', '真实用户模拟')

const 运行标识 = process.argv[2] || ''
const 指定日志 = process.argv[3] || ''
const 日志来源 = 指定日志 ? path.resolve(指定日志) : 日志路径
const 输出文件 = path.join(输出目录, `${运行标识 || '最新'}-完整模型日志.txt`)

if (!fs.existsSync(日志来源)) {
  console.error('日志文件不存在：' + 日志路径)
  process.exit(1)
}

const 行列表 = fs.readFileSync(日志来源, 'utf8').split('\n').filter((行) => 行.trim())
const 条目 = []
let 过滤数 = 0
for (const 行 of 行列表) {
  if (/VITEST 测试环境禁止真实外呼|invalid input syntax for type uuid: "u-1"|"jiao_se_id":"j-1"/.test(行)) {
    过滤数 += 1
    continue
  }
  try {
    条目.push(JSON.parse(行))
  } catch {
    条目.push({ 无法解析: 行.slice(0, 200) })
  }
}

function 内容文本(值) {
  if (Array.isArray(值)) return 值.join('\n')
  return String(值 ?? '')
}

const 分片 = []
let 当前模型 = null
let 当前输入 = ''
let 当前输出 = ''
let 序号 = 0

function 落盘一条() {
  if (!当前模型) return
  序号 += 1
  const 分隔 = '='.repeat(80)
  分片.push([
    分隔,
    `【调用 ${序号}】模型类型：${当前模型}`,
    分隔,
    '--- 输入提示词 ---',
    当前输入 || '(未记录)',
    '',
    '--- 模型输出 ---',
    当前输出 || '(未记录)',
    '',
  ].join('\n'))
}

for (const 项 of 条目) {
  const 消息 = String(项.xiao_xi || '')
  const 类型 = String(项.lei_xing || '')
  const 时间 = String(项.shi_jian || '')
  const 级别 = String(项.ji_bie || '')
  const 模型 = String(项.xiang_qing?.模型LeiXing || '')

  if (消息.includes('完整模型提示词')) {
    落盘一条()
    当前模型 = 模型 || 类型
    当前输入 = `[时间 ${时间}] ${内容文本(项.xiang_qing?.内容)}`
    当前输出 = ''
    continue
  }
  if (消息.includes('模型完整回复')) {
    if (!当前模型) {
      当前模型 = 模型 || '未知模型'
      当前输入 = '(未记录)'
    }
    当前输出 += `[时间 ${时间}] ${内容文本(项.xiang_qing?.内容)}\n`
    continue
  }
  if (级别 === 'error' || 级别 === 'warn' || 消息.includes('好感度变更') || 消息.includes('游戏结束')) {
    分片.push(`[${时间}] [${级别}] [${类型}] ${消息} ${内容文本(项.xiang_qing?.cuo_wu || '')}`)
  }
}
落盘一条()

fs.writeFileSync(输出文件, 分片.join('\n'), 'utf8')
console.log(`[提取] 日志 ${条目.length} 条（过滤测试污染 ${过滤数} 条），模型调用 ${序号} 次，输出：${输出文件}`)
console.log(`[提取] 文件大小 ${fs.statSync(输出文件).size} 字节`)
