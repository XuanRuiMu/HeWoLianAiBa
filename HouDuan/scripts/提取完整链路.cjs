'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
const 日志路径 = path.join(后端根, 'logs', 'debug.log')
const 数据目录 = path.join(项目根, '测试报告', '真实用户模拟')
const 输出目录 = path.join(项目根, '测试报告', '对话链路')

function 读参数() {
  const 取参 = (键, 回退) => {
    const 索引 = process.argv.indexOf(键)
    return 索引 > 0 ? process.argv[索引 + 1] : 回退
  }
  return {
    运行标识: 取参('--运行', process.env.REPORT_RUN || process.env.报告时间 || null),
    局: 取参('--局', process.env.REPORT_JU || process.env.目标局 || 'E局'),
  }
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

function 截断(文本, 上限) {
  const 清理 = String(文本 || '').trim()
  return 清理.length > 上限 ? 清理.slice(0, 上限) + '…' : 清理
}

function 提取关系人设(内容) {
  const 标记 = '【你们俩这回事】'
  const 位 = 内容.indexOf(标记)
  if (位 < 0) return ''
  const 剩余 = 内容.slice(位)
  const 结束 = 剩余.indexOf('\n\n')
  return 截断(结束 > 0 ? 剩余.slice(0, 结束) : 剩余, 900)
}

function 提取小节(内容, 标题列表) {
  const 结果 = {}
  for (const 标题 of 标题列表) {
    const 标记 = `【${标题}】`
    const 位 = 内容.indexOf(标记)
    if (位 < 0) continue
    const 起 = 位 + 标记.length
    const 下一个 = 内容.slice(起).search(/\n【[^】]{2,30}】/)
    const 段 = 下一个 >= 0 ? 内容.slice(起, 起 + 下一个) : 内容.slice(起)
    结果[标题] = 段.trim()
  }
  return 结果
}

function 分类日志(行列表) {
  const 结果 = {
    按trace: new Map(),
    按序号: [],
    人设自述: '',
    开场白: [],
  }
  const 新桶 = () => ({
    导演提示词: '', 导演输出: '', 导演原始输出: '',
    写手提示词: '', 写手输出: '',
    好感提示词: '', 好感输出: '',
    安全提示词: '', 安全输出: '',
    四鉴提示词: '', 四鉴输出: '',
    模型调用: [],
  })
  let 当前桶 = null
  let 当前trace = ''
  const 取桶 = (标识) => {
    if (!结果.按trace.has(标识)) {
      结果.按trace.set(标识, 新桶())
    }
    return 结果.按trace.get(标识)
  }
  for (const 对象 of 行列表) {
    const 类型 = 取文本(对象, 'lei_xing')
    const 详情 = 对象?.xiang_qing
    if (!详情 || typeof 详情 !== 'object') continue
    const 说明 = 取文本(对象, 'xiao_xi')
    const 内容 = 取文本(详情, '内容')
    const 模型类型 = 取文本(详情, '模型LeiXing')
    const 标识 = 取文本(对象, 'trace_id')
    if (!标识) continue

    if (类型 === '通用模型调用' && 模型类型 === 'AnQuanShenHe' && 说明.includes('[AI输入]')) {
      if (当前桶 && (当前桶.写手提示词 || 当前桶.导演提示词)) 结果.按序号.push(当前桶)
      当前桶 = 新桶()
      当前trace = 标识
    }
    if (!当前桶) {
      当前桶 = 新桶()
      当前trace = 标识
    }
    const 桶 = 当前桶

    if (类型 === 'AI导演' && 说明.includes('Director策略')) {
      const 策略 = 详情?.策略
      if (策略) 桶.导演输出 = 策略
      continue
    }
    if (类型 === 'AI写手' && 说明.includes('Writer原始输出')) {
      桶.写手输出 = 内容
      continue
    }
    if (类型 === '通用模型调用' && 模型类型 === 'XieShou') {
      if (说明.includes('[AI输入]')) {
        桶.写手提示词 = 内容
        if (!结果.人设自述) 结果.人设自述 = 提取关系人设(内容)
      } else if (说明.includes('[AI输出]')) {
        if (!取桶(标识).写手输出) 桶.写手输出 = 内容
      }
      continue
    }
    if (类型 === '通用模型调用' && 模型类型 === 'DaoYan') {
      if (说明.includes('[AI输入]')) 桶.导演提示词 = 内容
      else if (说明.includes('[AI输出]')) 桶.导演原始输出 = 内容
      continue
    }
    if (类型 === '通用模型调用' && 模型类型 === 'HaoGanDuPingPan') {
      if (说明.includes('[AI输入]')) 桶.好感提示词 = 内容
      else if (说明.includes('[AI输出]')) 桶.好感输出 = 内容
      continue
    }
    if (类型 === '通用模型调用' && 模型类型 === 'AnQuanShenHe') {
      if (说明.includes('[AI输入]')) 桶.安全提示词 = 内容
      else if (说明.includes('[AI输出]')) 桶.安全输出 = 内容
      continue
    }
    if (类型 === '通用模型调用' && 模型类型 === 'SiLianJian') {
      if (说明.includes('[AI输入]')) 桶.四鉴提示词 = 内容
      else if (说明.includes('[AI输出]')) 桶.四鉴输出 = 内容
      continue
    }
    if (类型 === 'AI调用') {
      桶.模型调用.push({ traceId: 标识, 用途: 取文本(详情, '模型LeiXing') || 取文本(详情, 'mo_xing_lei_xing'), 模型: 取文本(详情, 'mo_xing'), 耗时毫秒: 详情?.hao_shi, 成功: 详情?.cheng_gong !== false })
      continue
    }
    if (类型 === '通用模型调用' && 模型类型 === 'KaiChangBai' && 说明.includes('[AI输出]')) {
      结果.开场白.push(内容)
    }
  }
  if (当前桶 && (当前桶.写手提示词 || 当前桶.导演提示词)) 结果.按序号.push(当前桶)
  return 结果
}

function 解析好感度JSON(原文) {
  try {
    const 匹配 = String(原文 || '').match(/\{[\s\S]*\}/)
    if (!匹配) return null
    return JSON.parse(匹配[0])
  } catch {
    return null
  }
}

function 主流程() {
  const 参数 = 读参数()
  const 文件 = path.join(数据目录, `${参数.运行标识}-${参数.局}.json`)
  if (!fs.existsSync(文件)) {
    console.error(`找不到数据文件：${文件}`)
    process.exitCode = 1
    return
  }
  const 数据 = JSON.parse(fs.readFileSync(文件, 'utf8'))
  const 轮次 = 数据.轮次 || []

  const 已用trace = new Set()
  for (const 轮 of 轮次) {
    for (const 标识 of 轮.traceId列表 || []) if (标识) 已用trace.add(标识)
  }

  const 日志目录 = path.dirname(日志路径)
  const 日志文件列表 = [日志路径]
  try {
    for (const 名 of fs.readdirSync(日志目录)) {
      if (/^debug\.\d{4}-\d{2}-\d{2}\..*\.log$/.test(名)) 日志文件列表.push(path.join(日志目录, 名))
    }
  } catch {}
  const 全部行 = []
  for (const 文件 of 日志文件列表) {
    try {
      全部行.push(...fs.readFileSync(文件, 'utf8').split('\n').filter(Boolean))
    } catch {}
  }
  const 区间行 = []
  const 开始时刻 = 数据.开始时间
  const 开始缓冲 = 开始时刻 ? new Date(new Date(开始时刻).getTime() - 180000).toISOString() : null
  const 轮区间表 = 轮次.map((轮) => {
    const 起 = new Date(轮.发送开始时间).getTime() - 5000
    const 止 = 起 + (轮.耗时毫秒 || 600000) + 30000
    return { 轮, 起, 止, trace集合: new Set((轮.traceId列表 || []).filter(Boolean)) }
  })

  for (const 行 of 全部行) {
    const 对象 = 解析日志行(行)
    if (!对象) continue
    const 标识 = 取文本(对象, 'trace_id')
    const 时刻 = new Date(取文本(对象, 'shi_jian')).getTime()
    const 命中Trace = 标识 && 已用trace.has(标识)
    const 命中区间 = 轮区间表.some((区) => 时刻 >= 区.起 && 时刻 <= 区.止)
    if (!命中Trace && !命中区间) continue
    区间行.push(对象)
  }

  const 分类 = 分类日志(区间行)

  const 输出 = {
    运行标识: 参数.运行标识,
    局: 参数.局,
    标签: 数据.标签,
    人设自述: 分类.人设自述,
    总轮次: 轮次.length,
    轮次明细: [],
  }

  const 序号桶 = 分类.按序号
  for (let 轮序 = 0; 轮序 < 轮次.length; 轮序 += 1) {
    const 轮 = 轮次[轮序]
    const 桶 = 序号桶[轮序] || null
    const 写手提示词 = 桶?.写手提示词 || ''
    const 小节 = 写手提示词 ? 提取小节(写手提示词, ['现在你和这段关系', '关系参考，不是束缚', '刚才聊了什么', '对方近期说话特点', '这一句先说这个', '导演纸条', '你这会儿的感觉', '你最近在忙', '这一轮你就这样回', '别复读', '最近说话记录', '你的日常事实', '这局用哪种语言', '这轮用哪种语言', '你自己']) : {}
    const 好感 = 解析好感度JSON(桶?.好感输出)
    输出.轮次明细.push({
      轮次: 轮.轮次,
      traceId列表: 轮.traceId列表 || [],
      我方消息: 轮.发送内容,
      AI实际发送: (轮.AI回复 || []).map((项) => ({ 类型: 项.lei_xing, 内容: 项.nei_rong })),
      导演策略: 桶?.导演输出 || null,
      导演提示词: 桶?.导演提示词 || '',
      写手提示词: 写手提示词,
      写手提示词小节: 小节,
      写手输出: 桶?.写手输出 || '',
      好感度评判: 好感,
      好感提示词: 桶?.好感提示词 || '',
      安全提示词: 桶?.安全提示词 || '',
      安全输出: 桶?.安全输出 || '',
      四鉴输出: 桶?.四鉴输出 || '',
      模型调用: 桶?.模型调用 || [],
      耗时秒: Math.round((轮.耗时毫秒 || 0) / 1000),
    })
  }

  fs.mkdirSync(输出目录, { recursive: true })
  const 输出文件 = path.join(输出目录, `完整链路-${参数.运行标识}-${参数.局}.json`)
  fs.writeFileSync(输出文件, JSON.stringify(输出, null, 2))
  const 有写手 = 输出.轮次明细.filter((项) => 项.写手提示词).length
  const 有导演 = 输出.轮次明细.filter((项) => 项.导演策略).length
  console.log(`[完整链路] ${参数.局} 轮次=${输出.总轮次} 有写手提示词=${有写手} 有导演策略=${有导演}`)
  console.log(`[完整链路] 输出 ${输出文件}（${(fs.statSync(输出文件).size / 1024).toFixed(0)} KB）`)
}

主流程()
