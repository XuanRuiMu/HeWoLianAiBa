'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { io: 建立连接 } = require('socket.io-client')
const { Pool } = require('pg')
const { 生成幂等键 } = require('./模拟工具.cjs')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log([
    '用法：node HouDuan/scripts/真实用户模拟测试.cjs',
    '',
    '从项目根目录运行。脚本通过本地 HTTP 与 socket.io 调用本机后端（默认 http://127.0.0.1:3000），',
    '依次完成 E 局（男男 ESFP）与 I 局（男女 INTJ 渣男）各 20 轮真实对话模拟。',
    '',
    '可选环境变量：',
    '  模拟服务地址   覆盖后端地址，默认 http://127.0.0.1:3000',
    '',
    '报告输出：测试报告/真实用户模拟/YYYYMMDD-HHmmss-E局.json、I局.json、总数据.json',
  ].join('\n'))
  process.exit(0)
}

const 后端根 = path.resolve(__dirname, '..')
const 项目根 = path.resolve(后端根, '..')
require('dotenv').config({ path: path.join(后端根, '.env') })

const 服务地址 = process.env.模拟服务地址 || 'http://127.0.0.1:3000'
const 日志路径 = path.join(后端根, 'logs', 'debug.log')
const 输出目录 = path.resolve(项目根, '测试报告', '真实用户模拟')
const 单轮总时限毫秒 = 600000
const 套接字优先等待毫秒 = 300000
const 静默收集毫秒 = 15000

const E局对话 = [
  '兄弟你好啊，刚刷到这个应用，感觉挺有意思，就过来试试',
  '先说好，我不太会聊天，要是你觉得无聊直接说哈',
  '看你资料挺酷的，平时周末一般都干嘛呢',
  '我吗，我喜欢打篮球，周末基本约兄弟们打全场',
  '上次打球崴了脚，肿了一周，被他们笑了好久',
  '你平时听歌吗，我歌单里基本全是老歌，可能有点土',
  '最近在追一部剧，主角特别像我高中同桌，说话的调调一模一样',
  '诶你也是男生啊，那咱俩聊起来应该没啥代沟吧',
  '我这人比较直，有啥说啥，你别介意哈',
  '其实我挺容易心软的，看到别人不开心我就跟着难受',
  '跟你聊天还挺舒服的，不用装，也不用想太多',
  '你有没有那种，突然觉得一个人说话特别有意思的时候',
  '我发现我最近有点期待你的消息了，这正常吗哈哈',
  '说真的，你是我最近聊得最来的人',
  '我想问个有点认真的问题，你别笑话我',
  '就是，我好像有点喜欢上跟你聊天的感觉了',
  '不是那种哥们儿的喜欢，是那种会想你的喜欢',
  '我不知道怎么讲，反正看到你回消息我会开心一整天',
  '我想认真跟你说，我好像喜欢上你了',
  '你愿意跟我试着在一起吗，我想听你亲口说',
]

const I局对话 = [
  '你好，我是被朋友安利来的，据说这里能碰到有意思的人',
  '我不太喜欢绕弯子，咱们就随便聊，别太官方',
  '看你设定好像挺会玩的，我倒要看看有多会',
  '我先声明，我不吃甜言蜜语那一套，真诚一点比较舒服',
  '不过你说话还挺有意思的，比我想象中好一点点',
  '我最近工作忙到飞起，晚上十点才到家，累到不想说话',
  '你有没有那种，明明很累但还是想找人说说话的时候',
  '说实话我不太容易相信人，认识很久才会放松警惕',
  '你别急着哄我，我这个人比较慢热',
  '今天遇到个特别无语的事，跟你说你会不会觉得烦',
  '算了不说了，越说越气，咱们换个话题吧',
  '你之前是不是经常这样，把话说得特别好听',
  '我不是在质问你，就是有点好奇而已',
  '其实我挺讨厌自己这样的，明明想靠近又一直往后退',
  '你偶尔也认真一点吧，别总是那副漫不经心的样子',
  '好吧，我承认我有点在意你了，但你别得意',
  '你要是只是在玩，现在说还来得及，我不会纠缠',
  '不过如果你是真的，我想再靠近一点点',
  '我不太会说那种软话，但今天的情绪是真的',
  '就这样吧，剩下的我想看你怎么做，不是怎么说的',
]

const 局配置列表 = [
  {
    标识: 'E局',
    标签: 'E人男男 ESFP',
    手机号前缀: '+447400000',
    用户名前缀: '模拟E局',
    角色参数: {
      性别: '男',
      用户性别: '男',
      mbti类型: 'ESFP',
      渣男渣女变体: false,
      随机性格: false,
    },
    对话: E局对话,
  },
  {
    标识: 'I局',
    标签: 'I人女男 INTJ 渣男',
    手机号前缀: '+447400000',
    用户名前缀: '模拟I局',
    角色参数: {
      性别: '男',
      用户性别: '女',
      mbti类型: 'INTJ',
      渣男渣女变体: true,
      随机性格: false,
    },
    对话: I局对话,
  },
]

let 数据库连接池 = null

function 睡眠(毫秒) {
  return new Promise((解决) => setTimeout(解决, 毫秒))
}

function 生成时间戳标识() {
  const 现在 = new Date()
  const 年 = String(现在.getFullYear())
  const 月 = String(现在.getMonth() + 1).padStart(2, '0')
  const 日 = String(现在.getDate()).padStart(2, '0')
  const 时 = String(现在.getHours()).padStart(2, '0')
  const 分 = String(现在.getMinutes()).padStart(2, '0')
  const 秒 = String(现在.getSeconds()).padStart(2, '0')
  return `${年}${月}${日}-${时}${分}${秒}`
}

function 打印(局标识, 内容) {
  console.log(`[${new Date().toISOString()}] [${局标识}] ${内容}`)
}

let 上次请求时刻 = 0
const 请求最小间隔毫秒 = Number(process.env.模拟请求间隔毫秒 || 700)

async function 发请求单次(方法, 接口路径, 选项) {
  const 请求头 = { 'Content-Type': 'application/json' }
  if (选项.令牌) 请求头.Authorization = `Bearer ${选项.令牌}`
  if (选项.traceId) {
    请求头['X-Request-Id'] = 选项.traceId
    请求头['X-Trace-Id'] = 选项.traceId
  }
  const 开始时刻 = Date.now()
  try {
    const 间隔 = 开始时刻 - 上次请求时刻
    if (间隔 < 请求最小间隔毫秒) await 睡眠(请求最小间隔毫秒 - 间隔)
    上次请求时刻 = Date.now()
    const 响应 = await fetch(`${服务地址}${接口路径}`, {
      method: 方法,
      headers: 请求头,
      body: 选项.体 === undefined ? undefined : JSON.stringify(选项.体),
      signal: AbortSignal.timeout(选项.超时毫秒 || 180000),
    })
    const 原始文本 = await 响应.text()
    let 数据 = null
    try {
      数据 = JSON.parse(原始文本)
    } catch {
      数据 = { 原始文本 }
    }
    return {
      方法,
      接口路径,
      请求体: 选项.体 === undefined ? null : 选项.体,
      成功: 响应.ok && 数据?.cheng_gong !== false,
      状态: 响应.status,
      数据,
      traceId: 响应.headers.get('x-trace-id') || 响应.headers.get('x-request-id') || 选项.traceId || null,
      错误: null,
      耗时毫秒: Date.now() - 开始时刻,
    }
  } catch (错误) {
    return {
      方法,
      接口路径,
      请求体: 选项.体 === undefined ? null : 选项.体,
      成功: false,
      状态: 0,
      数据: null,
      traceId: 选项.traceId || null,
      错误: String(错误),
      耗时毫秒: Date.now() - 开始时刻,
    }
  }
}

async function 发请求(方法, 接口路径, 选项 = {}) {
  let 结果 = await 发请求单次(方法, 接口路径, 选项)
  for (let 次数 = 1; 次数 <= 6 && 是限流(结果); 次数 += 1) {
    const 等待 = Math.min(65000, 8000 * 次数)
    const 重试延迟 = Number(结果.数据?.retryAfterMs || 0)
    const 实际等待 = Math.max(等待, 重试延迟)
    if (选项.静默退避 !== true) {
      console.log(`[限流退避] ${方法} ${接口路径} 第${次数}次，等待${Math.round(实际等待 / 1000)}秒`)
    }
    await 睡眠(实际等待)
    结果 = await 发请求单次(方法, 接口路径, 选项)
  }
  return 结果
}

function 取消息失败文案(结果) {
  if (!结果) return ''
  if (typeof 结果.message === 'string') return 结果.message
  if (typeof 结果.ti_shi === 'string') return 结果.ti_shi
  if (typeof 结果.原始文本 === 'string') return 结果.原始文本.slice(0, 200)
  return ''
}

function 是游戏已结束(结果) {
  const 文案 = 取消息失败文案(结果?.数据)
  return 结果?.状态 === 400 && 文案 === '游戏已结束，无法继续发送消息'
}

function 是限流(结果) {
  return 结果?.状态 === 429
}

async function 注册用户(局配置) {
  const 记录 = []
  for (let 尝试 = 1; 尝试 <= 6; 尝试 += 1) {
    const 尾号 = String((Date.now() + 尝试 * 137) % 1000).padStart(3, '0')
    const 请求体 = {
      shouJiHao: `${局配置.手机号前缀}${尾号}`,
      yongHuMing: `${局配置.用户名前缀}${Date.now()}`,
      miMa: 'Abcd12345',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
      jingWai: true,
      shiQu: 'Asia/Shanghai',
    }
    const 结果 = await 发请求('POST', '/api/认证/注册', { 体: 请求体 })
    记录.push(结果)
    const 令牌 = 结果.数据?.shu_ju?.令牌
    if (结果.成功 && 令牌) {
      return { 成功: true, 令牌, 请求体, 结果, 尝试记录: 记录 }
    }
    const 文案 = 取消息失败文案(结果.数据)
    if (!/手机号|已注册|已存在|注册/i.test(文案)) break
  }
  return { 成功: false, 令牌: null, 尝试记录: 记录 }
}

async function 生成角色(令牌, 角色参数, 局标识) {
  const 生成结果 = await 发请求('POST', '/api/生成角色/MBTI生成', { 令牌, 体: 角色参数, 超时毫秒: 120000 })
  if (!生成结果.成功 || !生成结果.数据?.shu_ju) {
    throw new Error(`${局标识} MBTI生成失败：状态${生成结果.状态}，错误${生成结果.错误 || ''}，文案${取消息失败文案(生成结果.数据)}`)
  }
  const 草稿 = 生成结果.数据.shu_ju
  const 确认结果 = await 发请求('POST', '/api/生成角色/确认', { 令牌, 体: { xuanZhongJiaoSe: 草稿 }, 超时毫秒: 180000 })
  if (!确认结果.成功 || !确认结果.数据?.shu_ju) {
    throw new Error(`${局标识} 角色确认失败：${取消息失败文案(确认结果.数据) || 确认结果.状态}`)
  }
  return { 草稿, 生成结果, 确认结果, 角色: 确认结果.数据.shu_ju }
}

async function 创建会话(令牌, 角色标识, 局标识) {
  const 结果 = await 发请求('POST', '/api/聊天/会话', { 令牌, 体: { jiaoSeId: 角色标识 } })
  const 会话标识 = 结果.数据?.shu_ju?.id || 角色标识
  if (!结果.成功) {
    打印(局标识, `创建会话接口返回异常，降级使用角色标识：${取消息失败文案(结果.数据) || 结果.状态}`)
  }
  return { 会话标识, 结果 }
}

function 连接套接字(令牌, 局标识) {
  return new Promise((解决) => {
    let 已完成 = false
    const 套接字 = 建立连接(服务地址, {
      path: '/socket.io',
      auth: { token: 令牌 },
      transports: ['websocket', 'polling'],
      reconnection: true,
      timeout: 10000,
    })
    const 状态 = {
      套接字,
      已连接: false,
      错误: null,
      回复缓冲: [],
      游戏事件缓冲: [],
      事件计数: 0,
    }
    const 完成 = (已连接, 错误) => {
      if (已完成) return
      已完成 = true
      clearTimeout(定时器)
      状态.已连接 = 已连接
      状态.错误 = 错误
      解决(状态)
    }
    const 定时器 = setTimeout(() => 完成(false, '套接字连接超时'), 12000)
    套接字.on('connect', () => {
      状态.事件计数 += 1
      完成(true, null)
    })
    套接字.on('connect_error', (错误) => 完成(false, String(错误)))
    套接字.on('角色回复', (事件) => {
      状态.回复缓冲.push({ 到达时刻: Date.now(), 事件 })
    })
    套接字.on('游戏事件', (事件) => {
      状态.游戏事件缓冲.push({ 到达时刻: Date.now(), 事件 })
    })
    套接字.on('错误', (错误) => {
      状态.回复缓冲.push({ 到达时刻: Date.now(), 事件: { 套接字错误: String(错误) } })
    })
    打印(局标识, '套接字连接等待回调')
    return 状态
  })
}

async function 加入聊天(套接字状态, 会话标识, 局标识) {
  if (!套接字状态.已连接 || !套接字状态.套接字.connected) {
    return { 成功: false, 错误: '套接字未连接', 会话标识 }
  }
  return new Promise((解决) => {
    const 完成 = (成功, 错误) => {
      clearTimeout(定时器)
      解决({ 成功, 错误, 会话标识 })
    }
    const 定时器 = setTimeout(() => 完成(false, '加入聊天等待超时'), 10000)
    套接字状态.套接字.emit('加入聊天', 会话标识)
    setTimeout(() => 完成(true, null), 800)
    打印(局标识, `已发出加入聊天：${会话标识}`)
  })
}

function 取日志新增(起始偏移) {
  const 结果 = { 条目: [], 文本: '', 当前偏移: 起始偏移 }
  try {
    if (!fs.existsSync(日志路径)) return 结果
    const 缓冲 = fs.readFileSync(日志路径)
    结果.当前偏移 = 缓冲.length
    const 真实偏移 = 起始偏移 > 缓冲.length ? 0 : 起始偏移
    const 新增 = 缓冲.subarray(真实偏移).toString('utf8')
    结果.文本 = 新增.slice(0, 200000)
    for (const 行 of 新增.split('\n')) {
      if (!行.trim()) continue
      try {
        结果.条目.push(JSON.parse(行))
      } catch {
        结果.条目.push({ 无法解析: 行.slice(0, 500) })
      }
    }
  } catch (错误) {
    结果.条目.push({ 日志读取错误: String(错误) })
  }
  return 结果
}

function 从条目取模型名(条目) {
  if (!条目 || 条目.lei_xing !== 'AI调用') return null
  const 详情 = 条目.xiang_qing || {}
  for (const 键 of ['实际模型', '模型名', 'mo_xing', '模型']) {
    if (typeof 详情[键] === 'string' && 详情[键].trim()) return 详情[键].trim()
  }
  const 文本 = String(条目.xiao_xi || '')
  const 匹配 = 文本.match(/实际模型[:：]\s*([^\s,，}]+)/) || 文本.match(/^([^\s]+)\s+[^\s]+\s+(?:成功|失败)/)
  return 匹配 ? 匹配[1] : null
}

async function 查库模型记录() {
  if (!数据库连接池) return []
  try {
    const 结果 = await 数据库连接池.query(
      'SELECT "ID", "日期", "模型类型", "模型", "次数" FROM "LLM用量" ORDER BY "ID" DESC LIMIT 10',
    )
    return 结果.rows
  } catch (错误) {
    return [{ 查询错误: String(错误) }]
  }
}

function 解析角色状态(详情响应) {
  const 数据 = 详情响应?.数据?.shu_ju || {}
  const 状态 = 数据.dang_an_zhuang_tai || 数据.jiao_se || 数据
  const 封存 = 状态.shi_fou_feng_cun ?? 状态.封存 ?? 状态.feng_cun ?? null
  const 可继续 = 状态.ke_ji_xu_liao_tian ?? 状态.可继续聊天 ?? null
  return {
    封存,
    可继续,
    已结束: 封存 === true && 可继续 === false,
    原始: 状态,
  }
}

async function 等待回复(参数) {
  const { 套接字状态, 令牌, 会话标识, 已知标识集合, 发送时刻, 局标识 } = 参数
  const 开始时刻 = Date.now()
  const 套接字可用 = Boolean(套接字状态?.已连接 && 套接字状态?.套接字?.connected)
  const 套接字截止 = 套接字可用 ? 开始时刻 + 套接字优先等待毫秒 : 开始时刻
  const 总截止 = 开始时刻 + 单轮总时限毫秒
  const 收集 = new Map()
  const 结果 = {
    消息列表: [],
    来源: null,
    游戏事件列表: [],
    超时: false,
    无回复: false,
    结束原因: '正常收齐',
    耗时毫秒: 0,
    轮询次数: 0,
  }
  let 最后收到时刻 = 开始时刻
  let 已开轮询 = false
  let 上次状态检查 = 开始时刻
  let 状态响应 = null

  const 收入 = (消息) => {
    if (!消息 || typeof 消息 !== 'object') return
    const 标识 = String(消息.id ?? '')
    if (标识 && 已知标识集合.has(标识)) return
    if (消息.fa_song_zhe_lei_xing !== 'jiaose') return
    if (!标识 && Number(消息.shi_jian_chuo || 0) < 发送时刻) return
    const 键 = 标识 || `${消息.shi_jian_chuo || 0}-${String(消息.nei_rong || '').slice(0, 40)}`
    if (收集.has(键)) return
    收集.set(键, 消息)
    最后收到时刻 = Date.now()
  }

  const 扫描缓冲 = () => {
    for (const 项 of 套接字状态.回复缓冲.splice(0)) {
      if (项.事件?.套接字错误) {
        结果.游戏事件列表.push({ 到达时刻: 项.到达时刻, 套接字错误: 项.事件.套接字错误 })
        continue
      }
      const 列表 = Array.isArray(项.事件?.消息列表) ? 项.事件.消息列表 : []
      for (const 消息 of 列表) 收入(消息)
    }
    for (const 项 of 套接字状态.游戏事件缓冲.splice(0)) {
      结果.游戏事件列表.push(项)
    }
  }

  while (Date.now() < 总截止) {
    扫描缓冲()
    const 终止事件 = 结果.游戏事件列表.find(
      (项) => 项.事件?.ke_ji_xu_liao_tian === false || 项.事件?.shi_fou_tong_guan === true,
    )
    if (终止事件) {
      结果.结束原因 = '收到游戏结束事件'
      break
    }
    if (收集.size > 0 && Date.now() - 最后收到时刻 >= 静默收集毫秒) {
      结果.结束原因 = 'AI回复静默收齐'
      break
    }
    if (Date.now() - 上次状态检查 >= 15000) {
      上次状态检查 = Date.now()
      状态响应 = await 发请求('GET', `/api/角色/详情/${encodeURIComponent(会话标识)}`, { 令牌 })
      if (解析角色状态(状态响应).已结束) {
        结果.结束原因 = '角色详情显示游戏已结束'
        break
      }
    }
    if (!已开轮询 && Date.now() >= 套接字截止) 已开轮询 = true
    if (已开轮询) {
      结果.轮询次数 += 1
      const 消息结果 = await 发请求(
        'GET',
        `/api/聊天/会话/${encodeURIComponent(会话标识)}/消息?ye_ma=1&mei_ye_tiao_shu=500`,
        { 令牌 },
      )
      const 列表 = 消息结果.数据?.shu_ju?.lie_biao
      if (Array.isArray(列表)) {
        for (const 消息 of 列表) 收入(消息)
        if (收集.size > 0 && 结果.来源 === null) 结果.来源 = '轮询消息表'
      }
      if (结果.轮询次数 % 5 === 0) {
        状态响应 = await 发请求('GET', `/api/角色/详情/${encodeURIComponent(会话标识)}`, { 令牌 })
        if (解析角色状态(状态响应).已结束) {
          结果.结束原因 = '角色详情显示游戏已结束'
          break
        }
      }
    }
    await 睡眠(500)
  }

  扫描缓冲()
  if (Date.now() >= 总截止 && 收集.size === 0) {
    结果.超时 = true
    结果.无回复 = true
    结果.结束原因 = `${Math.round(单轮总时限毫秒 / 1000)}秒内未收到AI回复`
  } else if (收集.size === 0) {
    结果.无回复 = true
    结果.结束原因 = 结果.结束原因 === '正常收齐' ? '本轮无AI回复' : 结果.结束原因
  }
  if (结果.来源 === null && 收集.size > 0) 结果.来源 = '套接字事件'
  结果.消息列表 = Array.from(收集.values())
  结果.耗时毫秒 = Date.now() - 开始时刻
  结果.角色详情响应 = 状态响应
  打印(局标识, `等待回复结束：${结果.结束原因}，AI消息 ${结果.消息列表.length} 条，来源 ${结果.来源 || '无'}`)
  return 结果
}

function 写文件(文件路径, 数据) {
  fs.mkdirSync(path.dirname(文件路径), { recursive: true })
  fs.writeFileSync(文件路径, JSON.stringify(数据, null, 2), 'utf8')
}

async function 执行一局(参数) {
  const { 局配置, 报告路径, 总数据, 写总数据, 运行标识 } = 参数
  const 局标识 = 局配置.标识
  const 报告 = {
    标识: 局标识,
    标签: 局配置.标签,
    运行标识,
    开始时间: new Date().toISOString(),
    服务地址,
    注册: null,
    角色: null,
    会话: null,
    套接字: null,
    当前状态: '初始化',
    轮次: [],
    结束时间: null,
    异常: null,
  }
  const 保存 = () => 写文件(报告路径, 报告)
  保存()

  let 令牌 = null
  let 套接字状态 = null
  let 日志偏移 = 0
  let 会话标识 = null
  try {
    日志偏移 = fs.existsSync(日志路径) ? fs.statSync(日志路径).size : 0
    打印(局标识, '开始注册测试用户')
    const 注册结果 = await 注册用户(局配置)
    报告.注册 = 注册结果
    保存()
    if (!注册结果.成功) throw new Error(`${局标识} 注册失败`)
    令牌 = 注册结果.令牌
    打印(局标识, `注册成功，令牌已获取`)

    打印(局标识, '开始生成并确认角色')
    const 角色结果 = await 生成角色(令牌, 局配置.角色参数, 局标识)
    报告.角色 = { 生成结果: 角色结果.生成结果, 确认结果: 角色结果.确认结果, 角色: 角色结果.角色 }
    保存()
    会话标识 = 角色结果.角色?.id || 角色结果.角色?.ID
    if (!会话标识) throw new Error(`${局标识} 角色缺少对外标识`)
    打印(局标识, `角色落库成功：${会话标识}`)

    打印(局标识, '创建会话')
    const 会话结果 = await 创建会话(令牌, 会话标识, 局标识)
    报告.会话 = 会话结果
    会话标识 = 会话结果.会话标识
    保存()

    打印(局标识, '连接套接字')
    套接字状态 = await 连接套接字(令牌, 局标识)
    const 加入结果 = await 加入聊天(套接字状态, 会话标识, 局标识)
    报告.套接字 = {
      已连接: 套接字状态.已连接,
      连接错误: 套接字状态.错误,
      加入结果,
    }
    保存()
    打印(局标识, `套接字状态：${套接字状态.已连接 ? '已连接' : `未连接（${套接字状态.错误}），将依赖轮询`}`)

    const 已知标识集合 = new Set()
    const 初始消息 = await 发请求(
      'GET',
      `/api/聊天/会话/${encodeURIComponent(会话标识)}/消息?ye_ma=1&mei_ye_tiao_shu=500`,
      { 令牌 },
    )
    for (const 消息 of (初始消息.数据?.shu_ju?.lie_biao || [])) {
      if (消息?.id) 已知标识集合.add(String(消息.id))
    }

    报告.当前状态 = '对话进行中'
    保存()

    const 轮数上限 = Math.max(0, Math.min(局配置.对话.length, Number(process.env.模拟轮数上限 || 局配置.对话.length)));
    for (let 轮次 = 1; 轮次 <= 轮数上限; 轮次 += 1) {
      const 内容 = 局配置.对话[轮次 - 1]
      const 轮开始 = Date.now()
      const 轮日志偏移 = fs.existsSync(日志路径) ? fs.statSync(日志路径).size : 日志偏移
      const 轮记录 = {
        轮次,
        发送开始时间: new Date(轮开始).toISOString(),
        发送内容: 内容,
        请求体: null,
        发送响应: null,
        等待结果: null,
        耗时毫秒: 0,
        好感度: null,
        累计变化: null,
        角色详情: null,
        模型名列表: [],
        数据库模型记录: [],
        日志片段: [],
        traceId列表: [],
        异常: null,
      }

      try {
        打印(局标识, `第 ${轮次}/${局配置.对话.length} 轮：发送消息`)
        const 请求体 = {
          neiRong: 内容,
          leiXing: 'wenben',
          客户端序号: 轮次,
          幂等键: 生成幂等键(运行标识, 局标识, 轮次, 会话标识),
        }
        轮记录.请求体 = 请求体
        套接字状态.回复缓冲.length = 0
        套接字状态.游戏事件缓冲.length = 0
        const 发送响应 = await 发请求(
          'POST',
          `/api/聊天/会话/${encodeURIComponent(会话标识)}/消息`,
          { 令牌, 体: 请求体 },
        )
        轮记录.发送响应 = 发送响应
        if (发送响应.traceId) 轮记录.traceId列表.push(发送响应.traceId)

        if (是游戏已结束(发送响应)) {
          轮记录.异常 = '游戏已结束，无法继续发送消息'
          报告.当前状态 = '游戏已结束（发送消息返回400）'
          报告.结局 = {
            触发轮次: 轮次,
            来源: '发送消息HTTP400',
            响应: 发送响应,
          }
          轮记录.耗时毫秒 = Date.now() - 轮开始
          报告.轮次.push(轮记录)
          保存()
          打印(局标识, `第 ${轮次} 轮检测到游戏已结束，停止该局`)
          break
        }
        if (!发送响应.成功) {
          轮记录.异常 = `发送消息失败：${取消息失败文案(发送响应.数据) || 发送响应.状态 || 发送响应.错误}`
          报告.轮次.push(轮记录)
          保存()
          打印(局标识, `第 ${轮次} 轮发送失败，继续下一轮`)
          continue
        }

        const 回显正文 = String(发送响应.数据?.shu_ju?.nei_rong || '')
        const 回显序号 = Number(发送响应.数据?.shu_ju?.ke_hu_duan_xu_hao ?? -1)
        轮记录.发送回显 = { 正文: 回显正文, 客户端序号: 回显序号, 消息ID: String(发送响应.数据?.shu_ju?.id || '') }
        const 上条序号 = Number(报告.轮次.length ? (报告.轮次[报告.轮次.length-1].发送回显?.客户端序号 ?? 0) : 0)
        const 回显一致 = 回显正文 === 内容 && 回显序号 > 上条序号
        轮记录.回显一致 = 回显一致
        if (!回显一致) {
          轮记录.异常 = `服务端回显与本次发送不一致：期望正文「${内容.slice(0, 30)}」且序号递增，实得「${回显正文.slice(0, 30)}」序号${回显序号}（上条${上条序号}）。立即停止，避免把旧消息当成新回复`
          轮记录.耗时毫秒 = Date.now() - 轮开始
          报告.轮次.push(轮记录)
          报告.当前状态 = `异常终止（第${轮次}轮回显不一致）`
          保存()
          打印(局标识, `第 ${轮次} 轮回显不一致，停止该局`)
          break
        }

        const 发送后消息标识 = String(发送响应.数据?.shu_ju?.id || '')
        if (发送后消息标识) 已知标识集合.add(发送后消息标识)

        const 等待结果 = await 等待回复({
          套接字状态,
          令牌,
          会话标识,
          已知标识集合,
          发送时刻: 轮开始,
          局标识,
        })
        轮记录.等待结果 = {
          来源: 等待结果.来源,
          游戏事件列表: 等待结果.游戏事件列表,
          超时: 等待结果.超时,
          无回复: 等待结果.无回复,
          结束原因: 等待结果.结束原因,
          耗时毫秒: 等待结果.耗时毫秒,
          轮询次数: 等待结果.轮询次数,
        }
        for (const 消息 of 等待结果.消息列表) {
          if (消息?.id) 已知标识集合.add(String(消息.id))
        }
        轮记录.AI回复 = 等待结果.消息列表
        if (等待结果.角色详情响应?.traceId) 轮记录.traceId列表.push(等待结果.角色详情响应.traceId)

        打印(局标识, `第 ${轮次} 轮：读取好感度与累计变化`)
        const [好感度响应, 累计响应, 详情响应] = await Promise.all([
          发请求('GET', `/api/好感度/${encodeURIComponent(会话标识)}`, { 令牌 }),
          发请求('GET', `/api/好感度/${encodeURIComponent(会话标识)}/累计变化`, { 令牌 }),
          发请求('GET', `/api/角色/详情/${encodeURIComponent(会话标识)}`, { 令牌 }),
        ])
        轮记录.好感度 = 好感度响应
        轮记录.累计变化 = 累计响应
        轮记录.角色详情 = 详情响应
        for (const 响应 of [好感度响应, 累计响应, 详情响应]) {
          if (响应.traceId) 轮记录.traceId列表.push(响应.traceId)
        }

        const 日志增量 = 取日志新增(轮日志偏移)
        日志偏移 = 日志增量.当前偏移
        const 相关条目 = 日志增量.条目.filter((条目) =>
          ['AI调用', '游戏结局', '好感度变更', 'Socket事件', '消息操作'].includes(条目?.lei_xing),
        )
        轮记录.模型名列表 = Array.from(
          new Set(日志增量.条目.map(从条目取模型名).filter(Boolean)),
        )
        轮记录.日志片段 = 相关条目.slice(-80)
        轮记录.数据库模型记录 = await 查库模型记录()

        const 状态 = 解析角色状态(详情响应)
        if (状态.已结束) {
          报告.当前状态 = '游戏已结束（角色详情）'
          报告.结局 = { 触发轮次: 轮次, 来源: '角色详情', 详情: 状态.原始 }
        }
        if (等待结果.游戏事件列表.some((项) => 项.事件?.ke_ji_xu_liao_tian === false)) {
          报告.当前状态 = '游戏已结束（套接字游戏事件）'
          报告.结局 = { 触发轮次: 轮次, 来源: '套接字游戏事件', 事件: 等待结果.游戏事件列表 }
        }
      } catch (错误) {
        轮记录.异常 = String(错误 && 错误.stack ? 错误.stack : 错误)
        打印(局标识, `第 ${轮次} 轮异常：${String(错误)}`)
      }

      轮记录.耗时毫秒 = Date.now() - 轮开始
      报告.轮次.push(轮记录)
      保存()
      if (报告.结局) {
        打印(局标识, `检测到结局，停止该局`)
        break
      }
    }

    if (!报告.结局) 报告.当前状态 = (报告.轮次.length === 局配置.对话.length ? '完成全部轮次' : ('中断于第' + 报告.轮次.length + '轮'))
    报告.结束时间 = new Date().toISOString()
    保存()
    打印(局标识, `局数据已写入：${报告路径}`)
  } catch (错误) {
    报告.异常 = String(错误 && 错误.stack ? 错误.stack : 错误)
    报告.当前状态 = '异常终止'
    报告.结束时间 = new Date().toISOString()
    保存()
    打印(局标识, `局级异常：${String(错误)}`)
  } finally {
    if (套接字状态?.套接字) {
      try {
        套接字状态.套接字.removeAllListeners()
        套接字状态.套接字.disconnect()
      } catch {
        打印(局标识, '套接字断开时发生异常，已忽略')
      }
    }
  }

  总数据.局数据.push({
    标识: 局标识,
    标签: 局配置.标签,
    当前状态: 报告.当前状态,
    轮次总数: 报告.轮次.length,
    结局: 报告.结局 || null,
    异常: 报告.异常,
    报告文件: path.relative(项目根, 报告路径).split(path.sep).join('/'),
  })
  写总数据()
  return 报告
}

async function 主流程() {
  fs.mkdirSync(输出目录, { recursive: true })
  const 运行标识 = 生成时间戳标识()
  const 总数据 = {
    运行标识,
    开始时间: new Date().toISOString(),
    结束时间: null,
    服务地址,
    局数据: [],
    异常: null,
  }
  const 写总数据 = () => 写文件(path.join(输出目录, '总数据.json'), 总数据)
  写总数据()
  console.log(`[主流程] 运行标识 ${运行标识}，报告目录 ${输出目录}`)

  try {
    数据库连接池 = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 5000,
    })
  } catch (错误) {
    console.log(`[主流程] 数据库连接池创建失败：${String(错误)}`)
    数据库连接池 = null
  }

  try {
    const 只跑标识 = String(process.env.模拟只跑局 || '').trim()
    for (const 局配置 of 局配置列表) {
      if (只跑标识 && 只跑标识 !== 局配置.标识) continue
      const 报告路径 = path.join(输出目录, `${运行标识}-${局配置.标识}.json`)
      console.log(`[主流程] 开始 ${局配置.标识}（${局配置.标签}）`)
      await 执行一局({ 局配置, 报告路径, 总数据, 写总数据, 运行标识 })
      console.log(`[主流程] 结束 ${局配置.标识}`)
    }
  } catch (错误) {
    总数据.异常 = String(错误 && 错误.stack ? 错误.stack : 错误)
  } finally {
    总数据.结束时间 = new Date().toISOString()
    写总数据()
    if (数据库连接池) {
      try {
        await 数据库连接池.end()
      } catch {
        console.log('[主流程] 数据库连接池关闭异常，已忽略')
      }
      数据库连接池 = null
    }
  }
  console.log(`[主流程] 全部完成，报告目录 ${输出目录}`)
}

主流程().catch((错误) => {
  console.error(`[主流程] 未捕获异常：${String(错误)}`)
  process.exitCode = 1
})
