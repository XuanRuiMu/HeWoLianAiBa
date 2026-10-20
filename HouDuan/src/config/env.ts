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

function duQuQuanBuJian(wenJianLuJing: string): Record<string, string> {
  const jieGuo: Record<string, string> = {}
  try {
    if (!fs.existsSync(wenJianLuJing)) return jieGuo
    for (const hang of fs.readFileSync(wenJianLuJing, 'utf8').split(/\r?\n/)) {
      const trimmed = hang.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const deng = trimmed.indexOf('=')
      if (deng < 0) continue
      jieGuo[trimmed.slice(0, deng).trim()] = trimmed.slice(deng + 1).trim()
    }
  } catch {
    return jieGuo
  }
  return jieGuo
}

/** 列出两层配置同名但取值不同的键名（只报键名，不落取值） */
function lieChuFuGaiXiang(genMuLuJing: string, houDuanLuJing: string): string[] {
  const genMu = duQuQuanBuJian(genMuLuJing)
  const houDuan = duQuQuanBuJian(houDuanLuJing)
  return Object.keys(houDuan).filter((ming) => ming in genMu && genMu[ming] !== houDuan[ming])
}

/**
 * 启动即报「我到底连的哪个库」。
 *
 * 配置分两层，根 .env 是基线、HouDuan/.env 是本地覆盖层（override: true），
 * 同名键只有一处权威取值，容器部署与本地开发不再各写一套。
 * 路径全部按「模块所在位置」反推，绝不使用 cwd，否则换个目录启动就会连到另一个库。
 * 覆盖了哪些键会被逐条点名，既保留「我到底连的哪个库」的可观测性，又不再把
 * 根目录指容器主机、本地指 localhost 这种正常差异报成警告。
 */
export function jiaZaiHuanJing(): void {
  if (yiJinJiaZai) return
  yiJinJiaZai = true
  if (shiFouMingQueYiZhuRu()) return

  // 以「模块所在位置」反推 HouDuan 目录，src 与 dist 两种产物结构都成立；
  // 绝不使用 cwd，否则换个目录启动就会换一个库（这正是本次要根除的隐患）
  const houDuanMuLu = path.resolve(__dirname, '..', '..')
  const houDuanWenJian = path.join(houDuanMuLu, '.env')
  const genMuWenJian = path.resolve(houDuanMuLu, '..', '.env')

  if (fs.existsSync(genMuWenJian)) dotenv.config({ path: genMuWenJian, quiet: true })

  if (!fs.existsSync(houDuanWenJian)) {
    // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
    console.warn(`[配置警告] 未找到后端配置文件 ${houDuanWenJian}，将只依赖进程环境变量`)
  } else {
    dotenv.config({ path: houDuanWenJian, override: true, quiet: true })
  }

  const houDuanLianJie = process.env.DATABASE_URL?.trim() || null

  if (houDuanLianJie) {
    // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
    console.log(`[配置] 数据库连接目标：${lianJieZhiBaoMi(houDuanLianJie)}`)
  }
  const fuGaiXiang = lieChuFuGaiXiang(genMuWenJian, houDuanWenJian)
  if (fuGaiXiang.length > 0) {
    // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
    console.log('[配置] 本地覆盖层 HouDuan/.env 覆盖根 .env 的 ' + fuGaiXiang.length + ' 项：' + fuGaiXiang.join('、'))
  }
}

jiaZaiHuanJing()
