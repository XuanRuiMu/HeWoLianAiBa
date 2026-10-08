import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { lianJieZhiBaoMi } from '../config/env'

const houDuanMuLu = path.resolve(__dirname, '..', '..')
const houDuanWenJian = path.join(houDuanMuLu, '.env')
const genMuWenJian = path.resolve(houDuanMuLu, '..', '.env')

function duQuJianZhi(wenJianLuJing: string, ming: string): string | null {
  if (!fs.existsSync(wenJianLuJing)) return null
  for (const hang of fs.readFileSync(wenJianLuJing, 'utf8').split(/\r?\n/)) {
    const trimmed = hang.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const deng = trimmed.indexOf('=')
    if (deng > 0 && trimmed.slice(0, deng).trim() === ming) {
      return trimmed.slice(deng + 1).trim().replace(/^["']|["']$/g, '')
    }
  }
  return null
}

describe('FP-ENV 环境配置加载确定性（根除「连错库」隐患）', () => {
  it('脱敏输出只暴露主机/端口/库名，绝不吐密码', () => {
    const baJie = lianJieZhiBaoMi('postgresql://lovewithme:chaomiMiMa542@localhost:5432/lovewithme')
    expect(baJie).toContain('localhost:5432')
    expect(baJie).toContain('/lovewithme')
    expect(baJie).not.toContain('chaomiMiMa542')
    expect(baJie).toContain(':***@')
  })

  it('脱敏对非标准串不抛异常（脏配置不该把启动打断）', () => {
    expect(() => lianJieZhiBaoMi('这不是一个连接串')).not.toThrow()
    expect(lianJieZhiBaoMi('这不是一个连接串')).toBe('(连接串格式无法解析)')
  })

  it('配置加载路径钉在 backend/.env，不随工作目录漂移', () => {
    const yuanWenJian = fs.readFileSync(path.join(houDuanMuLu, 'src', 'config', 'env.ts'), 'utf8')
    // 曾经的写法是 dotenv.config({ quiet: true })，不带 path ⇒ 按 cwd 找 .env，
    // 从仓库根启动后端就会换成根目录那份、指向另一个库。必须显式给 path。
    expect(yuanWenJian).not.toMatch(/dotenv\.config\(\{\s*quiet:\s*true\s*\}\)/)
    expect(yuanWenJian).toMatch(/dotenv\.config\(\{\s*path:\s*houDuanWenJian/)
  })

  it('两份 .env 的 DATABASE_URL 若指向不同库，必须能被检出（本次真实踩过）', () => {
    const houDuan = duQuJianZhi(houDuanWenJian, 'DATABASE_URL')
    const genMu = duQuJianZhi(genMuWenJian, 'DATABASE_URL')
    // 记录事实：两份都存在且不同 ⇒ 启动时必须打警告；相同或缺一份 ⇒ 不该误报
    const buTong = houDuan !== null && genMu !== null && houDuan !== genMu
    if (buTong) {
      const yuanWenJian = fs.readFileSync(path.join(houDuanMuLu, 'src', 'config', 'env.ts'), 'utf8')
      expect(yuanWenJian, '两份配置指向不同库时必须有警告分支').toContain('指向不同数据库')
    } else {
      expect(buTong).toBe(false)
    }
    // 无论当前是否冲突，警告逻辑本身必须在
    const yuanWenJian = fs.readFileSync(path.join(houDuanMuLu, 'src', 'config', 'env.ts'), 'utf8')
    expect(yuanWenJian).toContain('指向不同数据库')
    expect(yuanWenJian).toContain('数据库连接目标')
  })
})
