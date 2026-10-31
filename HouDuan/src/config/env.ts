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

function lieChuFuGaiXiang(genMuLuJing: string, houDuanLuJing: string): string[] {
  const genMu = duQuQuanBuJian(genMuLuJing)
  const houDuan = duQuQuanBuJian(houDuanLuJing)
  return Object.keys(houDuan).filter((ming) => ming in genMu && genMu[ming] !== houDuan[ming])
}

export function jiaZaiHuanJing(): void {
  if (yiJinJiaZai) return
  yiJinJiaZai = true
  if (shiFouMingQueYiZhuRu()) return

  const houDuanMuLu = path.resolve(__dirname, '..', '..')
  const houDuanWenJian = path.join(houDuanMuLu, '.env')
  const genMuWenJian = path.resolve(houDuanMuLu, '..', '.env')

  if (fs.existsSync(genMuWenJian)) dotenv.config({ path: genMuWenJian, quiet: true })

  if (!fs.existsSync(houDuanWenJian)) {
    console.warn(`[配置警告] 未找到后端配置文件 ${houDuanWenJian}，将只依赖进程环境变量`)
  } else {
    dotenv.config({ path: houDuanWenJian, override: true, quiet: true })
  }

  const houDuanLianJie = process.env.DATABASE_URL?.trim() || null

  if (houDuanLianJie) {
    console.log(`[配置] 数据库连接目标：${lianJieZhiBaoMi(houDuanLianJie)}`)
  }
  const fuGaiXiang = lieChuFuGaiXiang(genMuWenJian, houDuanWenJian)
  if (fuGaiXiang.length > 0) {
    console.log('[配置] 本地覆盖层 HouDuan/.env 覆盖根 .env 的 ' + fuGaiXiang.length + ' 项：' + fuGaiXiang.join('、'))
  }
}

jiaZaiHuanJing()
