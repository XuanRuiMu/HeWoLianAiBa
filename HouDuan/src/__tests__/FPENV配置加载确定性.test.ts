import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { lianJieZhiBaoMi } from '../config/env'

const houDuanMuLu = path.resolve(__dirname, '..', '..')
const houDuanWenJian = path.join(houDuanMuLu, '.env')
const genMuWenJian = path.resolve(houDuanMuLu, '..', '.env')

function duQuQuanBuJian(wenJianLuJing: string): Record<string, string> {
  const jieGuo: Record<string, string> = {}
  if (!fs.existsSync(wenJianLuJing)) return jieGuo
  for (const hang of fs.readFileSync(wenJianLuJing, 'utf8').split(/\r?\n/)) {
    const trimmed = hang.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const deng = trimmed.indexOf('=')
    if (deng > 0) jieGuo[trimmed.slice(0, deng).trim()] = trimmed.slice(deng + 1).trim()
  }
  return jieGuo
}

describe('FP-ENV 环境配置加载确定性（根除「连错库」隐患）', () => {
  it('脱敏输出只暴露主机/端口/库名，绝不吐密码', () => {
    const baJie = lianJieZhiBaoMi('postgresql://lianaiba:chaomiMiMa542@localhost:5432/lianaiba')
    expect(baJie).toContain('localhost:5432')
    expect(baJie).toContain('/lianaiba')
    expect(baJie).not.toContain('chaomiMiMa542')
    expect(baJie).toContain(':***@')
  })

  it('脱敏对非标准串不抛异常（脏配置不该把启动打断）', () => {
    expect(() => lianJieZhiBaoMi('这不是一个连接串')).not.toThrow()
    expect(lianJieZhiBaoMi('这不是一个连接串')).toBe('(连接串格式无法解析)')
  })

  it('配置加载路径钉在 backend/.env，不随工作目录漂移', () => {
    const yuanWenJian = fs.readFileSync(path.join(houDuanMuLu, 'src', 'config', 'env.ts'), 'utf8')
    expect(yuanWenJian).not.toMatch(/dotenv\.config\(\{\s*quiet:\s*true\s*\}\)/)
    expect(yuanWenJian).toMatch(/dotenv\.config\(\{\s*path:\s*houDuanWenJian/)
  })

  it('分层加载：根 .env 打底、HouDuan/.env 覆盖，并点名覆盖项', () => {
    const yuanWenJian = fs.readFileSync(path.join(houDuanMuLu, 'src', 'config', 'env.ts'), 'utf8')
    const genMuWei = yuanWenJian.indexOf('dotenv.config({ path: genMuWenJian')
    const houDuanWei = yuanWenJian.indexOf('dotenv.config({ path: houDuanWenJian')
    expect(genMuWei, '根 .env 必须作为基线先加载').toBeGreaterThan(-1)
    expect(houDuanWei, 'HouDuan/.env 必须后加载').toBeGreaterThan(genMuWei)
    expect(yuanWenJian, '本地层必须显式覆盖基线层').toMatch(/dotenv\.config\(\{\s*path:\s*houDuanWenJian,\s*override:\s*true/)
    expect(yuanWenJian, '必须点名被覆盖的键').toContain('本地覆盖层')
    expect(yuanWenJian, '不得再把正常的主机差异报成警告').not.toContain('指向不同数据库')
    expect(yuanWenJian, '仍须报出实际连接目标').toContain('数据库连接目标')
  })

  it('两层配置不重复持有同一键（同值键只留一处，杜绝静默漂移）', () => {
    const genMu = duQuQuanBuJian(genMuWenJian)
    const houDuan = duQuQuanBuJian(houDuanWenJian)
    const chongFu = Object.keys(houDuan).filter((ming) => ming in genMu && genMu[ming] === houDuan[ming])
    expect(chongFu, '同值键必须只保留在根 .env，否则两份配置迟早漂移').toEqual([])
  })
})
