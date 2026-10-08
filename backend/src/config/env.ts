import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

let yiJinJiaZai = false

function shiFouMingQueYiZhuRu(): boolean {
  const mingQue = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']
  return (
    (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') &&
    mingQue.every((ming) => (process.env[ming] ?? '').trim() !== '')
  )
}

/**
 * 脱敏后的连接目标：只暴露 协议/主机/端口/库名，绝不暴露密码。
 * 报错与日志里排查「到底连的哪个库」全靠它。
 */
export function lianJieZhiBaoMi(chi: string): string {
  try {
    const u = new URL(chi)
    const duanKou = u.port ? `:${u.port}` : ''
    return `${u.protocol}//${u.username ? `${u.username}:***@` : ''}${u.hostname}${duanKou}${u.pathname}`
  } catch {
    return '(连接串格式无法解析)'
  }
}

/** 从 .env 文本里取某个键的原始值（只读探测用，不写入 process.env） */
function duQuJianZhi(wenJianLuJing: string, ming: string): string | null {
  try {
    if (!fs.existsSync(wenJianLuJing)) return null
    for (const hang of fs.readFileSync(wenJianLuJing, 'utf8').split(/\r?\n/)) {
      const trimmed = hang.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const deng = trimmed.indexOf('=')
      if (deng < 0) continue
      if (trimmed.slice(0, deng).trim() !== ming) continue
      const zhi = trimmed.slice(deng + 1).trim().replace(/^["']|["']$/g, '')
      return zhi === '' ? null : zhi
    }
    return null
  } catch {
    return null
  }
}

/**
 * 启动即报「我到底连的哪个库」。
 *
 * 背景（真实踩过的坑）：仓库根目录与 backend/ 各有一份 .env，两份都定义了 DATABASE_URL，
 * 但指向不同的库（根目录指容器 postgres 主机，backend 指 localhost 原生库）。
 * 而 dotenv.config() 不带 path 时按「当前工作目录」找 .env —— 从仓库根启动后端就会
 * 悄悄换成另一个库，账号、密码、数据全对不上，且没有任何提示。
 * 这里把加载路径钉死在 backend/.env（不随工作目录漂移），并在两份指向不同时大声报出来。
 */
export function jiaZaiHuanJing(): void {
  if (yiJinJiaZai) return
  yiJinJiaZai = true
  if (shiFouMingQueYiZhuRu()) return

  // 以「模块所在位置」反推 backend 目录，src 与 dist 两种产物结构都成立；
  // 绝不使用 cwd，否则换个目录启动就会换一个库（这正是本次要根除的隐患）
  const houDuanMuLu = path.resolve(__dirname, '..', '..')
  const houDuanWenJian = path.join(houDuanMuLu, '.env')
  const genMuWenJian = path.resolve(houDuanMuLu, '..', '.env')

  if (!fs.existsSync(houDuanWenJian)) {
    // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
    console.warn(`[配置警告] 未找到后端配置文件 ${houDuanWenJian}，将只依赖进程环境变量`)
  } else {
    dotenv.config({ path: houDuanWenJian, quiet: true })
  }

  const houDuanLianJie = process.env.DATABASE_URL?.trim() || null
  const genMuLianJie = duQuJianZhi(genMuWenJian, 'DATABASE_URL')

  if (houDuanLianJie) {
    // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
    console.log(`[配置] 数据库连接目标：${lianJieZhiBaoMi(houDuanLianJie)}`)
  }
  if (houDuanLianJie && genMuLianJie && genMuLianJie !== houDuanLianJie) {
    // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
    console.warn(
      '[配置警告] 仓库根目录 .env 与 backend/.env 的 DATABASE_URL 指向不同数据库！' +
        `根目录=${lianJieZhiBaoMi(genMuLianJie)}；backend=${lianJieZhiBaoMi(houDuanLianJie)}。` +
        '后端只读 backend/.env；若你本意是容器库，请改 backend/.env，或统一两份配置。',
    )
  }
}

jiaZaiHuanJing()
