'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
const 日志路径 = path.join(后端根, 'logs', 'debug.log')
const 数据目录 = path.join(项目根, '测试报告', '真实用户模拟')
const 输出目录 = path.join(项目根, '测试报告', '对话链路')

const 创建阶段类型 = new Set(['RenSheShenHe', 'KaiChangBai', 'KaiChangBaiGaiLv', 'TouXiang'])

const 阶段名 = {
  RenSheShenHe: '人设审核（判断你填的人设能不能构成一个真实人物）',
  KaiChangBaiGaiLv: '开场白概率判定（这个角色会不会主动先说话）',
  KaiChangBai: '开场白生成（角色主动发的第一批消息）',
  TouXiang: '头像描述生成',
}

function 解析日志行(行) {
  try {
    const 对象 = JSON.parse(行)
    return 对象 && typeof 对象 === 'object' ? 对象 : null
  } catch {
    return null
  }
}

function 取文本(对象, 键) {
  const 值 = 对象?.[键]
  return typeof 值 === 'string' ? 值 : ''
}

function 主流程() {
  const 索引 = process.argv.indexOf('--局')
  const 运行标识 = process.env.报告时间 || (索引 > 0 ? process.argv[索引 + 1] : null)
  const 局 = process.env.目标局 || 'E局'
  const 文件 = path.join(数据目录, `${运行标识}-${局}.json`)
  if (!fs.existsSync(文件)) {
    console.error(`找不到数据文件：${文件}`)
    process.exitCode = 1
    return
  }
  const 数据 = JSON.parse(fs.readFileSync(文件, 'utf8'))
  const 开始时刻 = 数据.开始时间
  const 角色落库时间 = 数据.角色?.角色?.创建时间 || 数据.角色?.确认结果?.数据?.shu_ju?.创建时间 || null
  const 截止时刻 = 角色落库时间 || (开始时刻 ? new Date(new Date(开始时刻).getTime() + 600000).toISOString() : null)

  const 全部行 = fs.readFileSync(日志路径, 'utf8').split('\n').filter(Boolean)
  const 阶段记录 = new Map()

  for (const 行 of 全部行) {
    const 对象 = 解析日志行(行)
    if (!对象) continue
    const 类型 = 取文本(对象, 'lei_xing')
    const 详情 = 对象?.xiang_qing
    if (!详情 || typeof 详情 !== 'object') continue
    const 时间 = 取文本(对象, 'shi_jian')
    if (开始时刻 && 时间 < 开始时刻) continue
    if (截止时刻 && 时间 > 截止时刻) continue
    const 模型类型 = 取文本(详情, '模型LeiXing') || 取文本(详情, 'mo_xing_lei_xing')
    if (!创建阶段类型.has(模型类型)) continue
    const 说明 = 取文本(对象, 'xiao_xi')
    const 标识 = 取文本(对象, 'trace_id')
    const 键 = `${标识}:${模型类型}`
    if (!阶段记录.has(键)) {
      阶段记录.set(键, { 类型: 模型类型, 阶段名: 阶段名[模型类型] || 模型类型, 提示词: '', 输出: '', 参数: null, 模型: '', 耗时毫秒: null, trace: 标识, 时间 })
    }
    const 项 = 阶段记录.get(键)
    if (说明.includes('[AI输入]') && !项.提示词) {
      项.提示词 = 取文本(详情, '内容')
    } else if (说明.includes('[AI输出]') && !项.输出) {
      项.输出 = 取文本(详情, '内容')
    } else if (说明.includes('[AI参数]')) {
      项.参数 = 详情
      项.模型 = 取文本(详情, '模型') || 取文本(详情, '请求模型')
    } else if (类型 === 'AI调用') {
      项.模型 = 取文本(详情, 'mo_xing') || 项.模型
      项.耗时毫秒 = 详情?.hao_shi ?? 项.耗时毫秒
    }
  }

  const 阶段列表 = [...阶段记录.values()]
    .filter((项) => 项.提示词 || 项.输出)
    .sort((甲, 乙) => String(甲.类型).localeCompare(String(乙.类型)))

  const 输出 = {
    运行标识,
    局,
    标签: 数据.标签,
    角色参数: 数据.角色?.草稿 || null,
    创建阶段: 阶段列表,
  }

  fs.mkdirSync(输出目录, { recursive: true })
  const 输出文件 = path.join(输出目录, `角色创建-${运行标识}-${局}.json`)
  fs.writeFileSync(输出文件, JSON.stringify(输出, null, 2))
  console.log(`[角色创建] ${局} 抓到 ${阶段列表.length} 个阶段：`)
  for (const 项 of 阶段列表) {
    console.log(`  - ${项.阶段名} | 提示词 ${项.提示词.length} 字 | 输出 ${项.输出.length} 字 | 模型 ${项.模型 || '待补充'}`)
  }
  console.log(`[角色创建] 输出 ${输出文件}`)
}

主流程()
