'use strict'

const fs = require('node:fs')
const path = require('node:path')

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
require('dotenv').config({ path: path.join(后端根, '.env') })

const 网关地址 = process.env.MAGPIE_MO_XING_CHI_JI_CHU
const 网关密钥 = process.env.MAGPIE_MO_XING_CHI_MI_YAO
const 每模型请求次数 = Number(process.env.测速请求次数 || 5)
const 单次超时毫秒 = Number(process.env.测速超时毫秒 || 60000)
const 输出目录 = path.resolve(项目根, '测试报告', '模型测速')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log([
    '用法：node HouDuan/scripts/模型基准测速.cjs',
    '',
    '对 MAGPIE_MO_XING_CHI 里的每个模型发同等次数的真实请求，记录每次耗时，算出平均/最快/最慢/成功率。',
    '',
    '环境变量：',
    '  测速请求次数   每个模型请求几次，默认 5',
    '  测速超时毫秒   单次请求超时，默认 60000',
    '',
    '输出：测试报告/模型测速/模型测速-YYYYMMDD-HHmmss.json',
  ].join('\n'))
  process.exit(0)
}

const 模型清单 = String(process.env.MAGPIE_MO_XING_CHI || '')
  .split(',')
  .map((xiang) => xiang.trim())
  .filter(Boolean)
  .map((xiang) => xiang.split('|')[0].trim())
  .filter(Boolean)

const 提问池 = [
  '用一句话说说今天天气怎么样',
  '你最喜欢吃什么，为什么',
  '推荐一部你觉得好看的电影',
  '周末一般怎么过',
  '说一句鼓励人的话',
  '你养过宠物吗',
  '最近有什么开心的事',
  '怎么看待早睡早起',
  '你喜欢听什么音乐',
  '形容一下你理想的生活',
]

function 生成时间戳标识() {
  const 现在 = new Date()
  const 补零 = (值) => String(值).padStart(2, '0')
  return `${现在.getFullYear()}${补零(现在.getMonth() + 1)}${补零(现在.getDate())}-${补零(现在.getHours())}${补零(现在.getMinutes())}${补零(现在.getSeconds())}`
}

async function 请求一次(模型, 提问序号) {
  const 开始 = Date.now()
  const 控制器 = new AbortController()
  const 定时器 = setTimeout(() => 控制器.abort(), 单次超时毫秒)
  try {
    const 响应 = await fetch(`${网关地址}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${网关密钥}`,
      },
      body: JSON.stringify({
        model: 模型,
        messages: [{ role: 'user', content: 提问池[提问序号 % 提问池.length] }],
        max_tokens: 60,
        stream: false,
      }),
      signal: 控制器.signal,
    })
    const 文本 = await 响应.text()
    const 耗时 = Date.now() - 开始
    let 内容 = ''
    let 解析错误 = null
    try {
      const 数据 = JSON.parse(文本)
      内容 = 数据?.choices?.[0]?.message?.content || ''
    } catch {
      解析错误 = 文本.slice(0, 200)
    }
    return {
      成功: 响应.ok && 内容.trim().length > 0,
      状态: 响应.status,
      耗时毫秒: 耗时,
      回复预览: 内容.trim().slice(0, 80),
      错误: 响应.ok ? (内容.trim().length === 0 ? '空正文' : null) : 文本.slice(0, 200),
      解析错误,
    }
  } catch (错误) {
    const 耗时 = Date.now() - 开始
    const 是否超时 = 错误?.name === 'AbortError'
    return {
      成功: false,
      状态: 0,
      耗时毫秒: 耗时,
      回复预览: '',
      错误: 是否超时 ? `超时${单次超时毫秒}ms` : String(错误).slice(0, 200),
      解析错误: null,
    }
  } finally {
    clearTimeout(定时器)
  }
}

function 汇总一个模型(模型, 记录) {
  const 成功记录 = 记录.filter((项) => 项.成功)
  const 全部耗时 = 记录.map((项) => 项.耗时毫秒)
  const 成功耗时 = 成功记录.map((项) => 项.耗时毫秒)
  const 平均 = (数组) => (数组.length === 0 ? null : Math.round(数组.reduce((和, 值) => 和 + 值, 0) / 数组.length))
  return {
    模型,
    请求次数: 记录.length,
    成功次数: 成功记录.length,
    成功率: 记录.length === 0 ? 0 : Number((成功记录.length / 记录.length).toFixed(3)),
    平均耗时毫秒: 平均(成功耗时),
    最快耗时毫秒: 成功耗时.length === 0 ? null : Math.min(...成功耗时),
    最慢耗时毫秒: 成功耗时.length === 0 ? null : Math.max(...成功耗时),
    含失败平均耗时毫秒: 平均(全部耗时),
    记录,
  }
}

async function 主流程() {
  fs.mkdirSync(输出目录, { recursive: true })
  const 运行标识 = 生成时间戳标识()
  const 输出路径 = path.join(输出目录, `模型测速-${运行标识}.json`)
  const 结果 = {
    运行标识,
    开始时间: new Date().toISOString(),
    网关地址,
    每模型请求次数,
    单次超时毫秒,
    模型总数: 模型清单.length,
    模型结果: [],
    结束时间: null,
  }

  console.log(`[测速] 开始，${模型清单.length} 个模型，每个 ${每模型请求次数} 次请求`)
  console.log(`[测速] 网关 ${网关地址}`)

  for (let 序号 = 0; 序号 < 模型清单.length; 序号 += 1) {
    const 模型 = 模型清单[序号]
    const 记录 = []
    for (let 次 = 0; 次 < 每模型请求次数; 次 += 1) {
      const 单次 = await 请求一次(模型, 次)
      记录.push(单次)
      结果.模型结果 = [...结果.模型结果.filter((项) => 项.模型 !== 模型), 汇总一个模型(模型, 记录)]
      结果.结束时间 = null
      fs.writeFileSync(输出路径, JSON.stringify(结果, null, 2))
      const 标记 = 单次.成功 ? 'OK' : 'FAIL'
      console.log(`[测速] ${序号 + 1}/${模型清单.length} ${模型} 第${次 + 1}次 ${标记} ${单次.耗时毫秒}ms ${单次.错误 || ''}`)
    }
    const 汇总 = 汇总一个模型(模型, 记录)
    console.log(`[测速] === ${模型} 成功${汇总.成功次数}/${汇总.请求次数} 平均${汇总.平均耗时毫秒}ms ===`)
  }

  const 排序后 = [...结果.模型结果].sort((甲, 乙) => {
    if (甲.平均耗时毫秒 === null && 乙.平均耗时毫秒 === null) return 0
    if (甲.平均耗时毫秒 === null) return 1
    if (乙.平均耗时毫秒 === null) return -1
    return 甲.平均耗时毫秒 - 乙.平均耗时毫秒
  })
  const 排名 = 排序后.map((项, 序号) => ({
    名次: 序号 + 1,
    模型: 项.模型,
    平均耗时毫秒: 项.平均耗时毫秒,
    成功率: 项.成功率,
    请求次数: 项.请求次数,
  }))
  const 最终 = { ...结果, 排名, 结束时间: new Date().toISOString() }
  fs.writeFileSync(输出路径, JSON.stringify(最终, null, 2))
  console.log(`[测速] 完成，结果写入 ${输出路径}`)
  console.log('[测速] 速度排名（平均耗时从快到慢）：')
  for (const 项 of 排名) {
    console.log(`  ${项.名次}. ${项.模型} 平均${项.平均耗时毫秒}ms 成功率${(项.成功率 * 100).toFixed(0)}%`)
  }
}

主流程().catch((错误) => {
  console.error(`[测速] 未捕获异常：${String(错误)}`)
  process.exitCode = 1
})
