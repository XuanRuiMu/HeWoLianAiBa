import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { join, resolve, sep } from 'node:path'
import { huoQuCiKuMuLu } from '../../src/services/审核词库'

/**
 * 「构建产物缺非 TS 运行时资源」根因守卫（聊天发送消息 500 的真实根因）。
 *
 * tsc 只产出 .js/.d.ts/.map，src 下的非 TS 资源不会进 dist；生产镜像又只 COPY dist，
 * 于是 services/审核词库.ts 运行期 scandir 直接 ENOENT → 每条文本消息 500。
 * A 组：复制器口径（该复制的一律复制、不该复制的一律不复制）。
 * B 组：真实接线（build 串上了复制步骤；复制后词库恰好落在 审核词库.ts 解析出的目录）。
 */

type FuZhiQingDan = string[]

const js侧 = createRequire(__filename)('../复制静态资源.js') as {
  xuYaoFuZhi(相对路径: string): boolean
  收集静态资源(源目录: string): FuZhiQingDan
  复制静态资源(源目录: string, 目标目录: string): FuZhiQingDan
}

const 临时根: string[] = []

function 新临时目录(名字: string): string {
  const 目录 = mkdtempSync(join(tmpdir(), `goujian-${名字}-`))
  临时根.push(目录)
  return 目录
}

afterEach(() => {
  while (临时根.length > 0) {
    const 目录 = 临时根.pop() as string
    rmSync(目录, { recursive: true, force: true })
  }
})

describe('A 组：构建期资源复制口径', () => {
  it('只复制非 TS 运行时资源，跳过类型产物与测试目录', () => {
    const 源 = 新临时目录('shou')
    const 写入 = (相对: string, 内容: string) => {
      const 路径 = join(源, ...相对.split('/'))
      mkdirSync(resolve(路径, '..'), { recursive: true })
      writeFileSync(路径, 内容, 'utf-8')
    }
    写入('config/审核词库/v1.json', '{"banBen":"v1"}')
    写入('config/词表.txt', '词条')
    写入('config/index.ts', 'export const a = 1')
    写入('config/索引.d.ts', 'declare const a: number')
    写入('services/__tests__/夹具.json', '{"zhen":true}')
    写入('services/模块.js.map', '{}')

    expect(js侧.收集静态资源(源)).toEqual([
      join('config', '审核词库', 'v1.json'),
      join('config', '词表.txt'),
    ])
  })

  it('中文目录名与深层结构按原样落进目标目录，内容逐字节一致', () => {
    const 源 = 新临时目录('yuan')
    const 目标 = 新临时目录('mu')
    mkdirSync(join(源, 'config', '审核词库'), { recursive: true })
    const 正文 = '{"banBen":"v1","leiBie":{"sheZhengYouHai":{"ciTiao":["a"]}}}'
    writeFileSync(join(源, 'config', '审核词库', 'v1.json'), 正文, 'utf-8')

    const 清单 = js侧.复制静态资源(源, 目标)

    expect(清单).toEqual([join('config', '审核词库', 'v1.json')])
    const 落点 = join(目标, 'config', '审核词库', 'v1.json')
    expect(existsSync(落点)).toBe(true)
    expect(readFileSync(落点, 'utf-8')).toBe(正文)
  })

  it('复制器对不存在的源目录不静默产出空清单以外的行为', () => {
    expect(js侧.xuYaoFuZhi(join('config', 'x.json'))).toBe(true)
    expect(js侧.xuYaoFuZhi(join('config', 'x.ts'))).toBe(false)
    expect(js侧.xuYaoFuZhi(join('a', '__tests__', 'b.json'))).toBe(false)
  })
})

describe('B 组：真实接线与落点', () => {
  it('npm run build 串了资源复制步骤（否则修了脚本也没人跑）', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf-8'),
    ) as { scripts: { build: string } }
    expect(packageJson.scripts.build).toContain('tsc')
    expect(packageJson.scripts.build).toContain('复制静态资源')
  })

  it('真实 src 下的审核词库在复制清单里（根因回归锚点）', () => {
    const 源 = resolve(__dirname, '..', '..', 'src')
    const 清单 = js侧.收集静态资源(源).map((xiang) => xiang.split(sep).join('/'))
    expect(清单).toContain('config/审核词库/v1.json')
  })

  it('复制进 dist 后，词库恰好落在 services/审核词库.ts 运行期解析出的目录', () => {
    const 源 = resolve(__dirname, '..', '..', 'src')
    const 目标 = 新临时目录('dist')
    const 运行期目录 = huoQuCiKuMuLu()
    const 相对运行期目录 = 运行期目录.split(sep).join('/')

    js侧.复制静态资源(源, 目标)

    // 运行期路径以 __dirname/../config/审核词库 解析；src 与 dist 同 rootDir 结构，
    // 因此复制到 dist 的相对路径后缀必须与运行期解析出的后缀一致
    expect(相对运行期目录.endsWith('config/审核词库')).toBe(true)
    expect(existsSync(join(目标, 'config', '审核词库', 'v1.json'))).toBe(true)
  })
})

/**
 * C 组：镜像构建上下文接线。
 *
 * 根因（真实事故）：`package.json` 的 build 串了 `node scripts/复制静态资源.js`，
 * 而 Dockerfile 的 build 阶段只 `COPY database` + `COPY src`，从未 COPY `scripts`，
 * 于是 `docker compose build` 直接 MODULE_NOT_FOUND 失败——B 组只证「本地跑得通」，
 * 恰好放过这一类「本仓构建步骤引用了镜像里没有的文件」。
 * 本组把 build 命令里每一个 `node <文件>` 目标都拿去和 build 阶段（第一个
 * `RUN npm run build` 之前）的 COPY 源比对，缺一即红灯。
 */
describe('C 组：镜像构建阶段必须 COPY 到 build 命令引用的每个本地文件', () => {
  const 仓根 = resolve(__dirname, '..', '..')

  function 读构建命令(): string {
    const packageJson = JSON.parse(
      readFileSync(join(仓根, 'package.json'), 'utf-8'),
    ) as { scripts: { build: string } }
    return packageJson.scripts.build
  }

  /** build 命令里 `node <相对路径>` 形式的本地文件目标（不含 npx/tsc 这类依赖包二进制） */
  function 取Node文件目标(): string[] {
    const 目标: string[] = []
    for (const 片段 of 读构建命令().split(/&&|;/)) {
      const 匹配 = /(?:^|\s)node\s+(?:-\S+\s+)*([^\s|&]+\.js)/.exec(片段.trim())
      if (匹配) 目标.push(匹配[1].split('\\').join('/'))
    }
    return 目标
  }

  /** Dockerfile build 阶段（第一个 `RUN npm run build` 之前）的全部 COPY 源路径 */
  function 取Build阶段COPY源(): string[] {
    const 行列表 = readFileSync(join(仓根, 'Dockerfile'), 'utf-8')
      .split(/\r?\n/)
      .map((行) => 行.trim())
    const 源: string[] = []
    for (const 行 of 行列表) {
      if (/^RUN\s+npm\s+run\s+build\b/.test(行)) break
      const 匹配 = /^COPY\s+(--from=\S+\s+)?(?!--)(\S+)\s+(\S+)/.exec(行)
      if (匹配 && !匹配[0].includes('--from=')) 源.push(匹配[2].split('\\').join('/'))
    }
    return 源
  }

  /** 目标文件是否被某个 COPY 源覆盖：同源、或位于某个被 COPY 的目录之下 */
  function 被覆盖(目标: string, COPY源: string[]): boolean {
    return COPY源.some((源) => {
      // `package*.json` 这类带通配的源按 glob 前缀匹配
      const 通配 = 源.includes('*') ? new RegExp(`^${源.split('').map((字) => (字 === '*' ? '.*' : 字.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`) : null
      if (通配) return 通配.test(目标)
      return 目标 === 源 || 目标.startsWith(`${源.replace(/\/$/, '')}/`)
    })
  }

  it('build 命令确实引用了本地 node 文件（守卫本身不是空转）', () => {
    expect(取Node文件目标()).toContain('scripts/复制静态资源.js')
  })

  it('build 阶段 COPY 覆盖了 build 命令引用的每一个本地 node 文件', () => {
    const COPY源 = 取Build阶段COPY源()
    const 未覆盖 = 取Node文件目标().filter((目标) => !被覆盖(目标, COPY源))
    expect(未覆盖, `Dockerfile build 阶段缺 COPY：${未覆盖.join(', ')}`).toEqual([])
  })

  it('被 COPY 进 build 阶段的复制脚本在上下文里真实存在（不钉幽灵路径）', () => {
    for (const 目标 of 取Node文件目标()) {
      expect(existsSync(join(仓根, 目标)), `构建命令引用了不存在的文件: ${目标}`).toBe(true)
    }
  })
})

/**
 * D 组：运行期可写目录的属主。
 *
 * 根因（真机才暴露、mock 全绿）：镜像以 `USER appuser` 运行，而 Dockerfile 只在切用户前
 * chown 了 /app/logs 与 /app/database，漏了媒体存储根 /app/uploads。命名卷首次创建时按
 * 镜像内目录属主初始化 ⇒ 卷是 root:root 755，容器里每一次媒体上传（表情/图片/文件/语音/
 * 好友媒体）都 EACCES → 500「媒体上传失败，请重试」，且日志文件恒 0 字节看不见原因。
 * 本组从 docker-compose 的挂载表反推「运行期要写的容器目录」，逐个要求它在 USER 之前被
 * mkdir 且 chown 给运行用户，缺一即红灯。
 */
describe('D 组：运行期可写目录必须在切用户前建好并授权', () => {
  const 仓根 = resolve(__dirname, '..', '..')
  const Dockerfile路径 = join(仓根, 'Dockerfile')
  const compose路径 = join(仓根, '..', 'docker-compose.yml')

  function 取挂载目标(): string[] {
    const yml = readFileSync(compose路径, 'utf-8').split(/\r?\n/)
    // 只看 backend 这一段（服务名缩进在 services 之下）：postgres/redis 的数据卷属主由各自
    // 镜像负责，不在本守卫口径内
    const 起 = yml.findIndex((行) => /^[ \t]*backend:[ \t]*$/.test(行))
    if (起 < 0) return []
    const 缩进 = (yml[起].match(/^[ \t]*/) as RegExpMatchArray)[0].length
    const 段: string[] = []
    for (let i = 起 + 1; i < yml.length; i++) {
      const 行 = yml[i]
      if (行.trim() !== '' && (行.match(/^[ \t]*/) as RegExpMatchArray)[0].length <= 缩进) break
      段.push(行)
    }
    const 目标: string[] = []
    for (const 行 of 段) {
      const 匹 = 行.match(/^\s*-\s*([A-Za-z0-9_.-]+):(\/[^:\s]+)(:ro)?\s*$/)
      if (匹 && !匹[3]) 目标.push(匹[2])
    }
    return 目标
  }

  function 取切用户前的目录操作(): { chown: string[]; mkdir: string[] } {
    const 行集 = readFileSync(Dockerfile路径, 'utf-8').split(/\r?\n/)
    const 截止 = 行集.findIndex((行) => /^USER\s+/.test(行))
    if (截止 < 0) return { chown: [], mkdir: [] }
    const 前 = 行集.slice(0, 截止).join('\n')
    const 抓 = (令: RegExp) => {
      const 出: string[] = []
      let 匹: RegExpExecArray | null
      const 重 = new RegExp(令.source, 'g')
      while ((匹 = 重.exec(前))) 出.push(...匹[1].split(/\s+/).filter(Boolean))
      return 出
    }
    return {
      // chown 的第二个位置参数才是用户:组，其后一律是路径
      chown: 抓(/chown\s+(?:-R\s+)?\S+\s+([^\n&;]+)/),
      mkdir: 抓(/mkdir\s+(?:-p\s+)?([^\n&;]+)/),
    }
  }

  it('compose 里存在需要属主的容器内挂载点（守卫不空转）', () => {
    expect(取挂载目标().length).toBeGreaterThan(0)
  })

  it('每一个可写挂载点的顶层目录都在 USER 之前被 mkdir 且 chown 给运行用户', () => {
    const { chown, mkdir } = 取切用户前的目录操作()
    // 挂载目标形如 /app/<可写目录>/...，命名卷的属主按 /app 下那一层目录初始化
    const 顶层 = (目: string) => '/' + 目.split('/').filter(Boolean).slice(0, 2).join('/')
    const 缺chown = [...new Set(取挂载目标().map(顶层))]
      .filter((顶) => !chown.some((项) => 项 === 顶 || 顶.startsWith(项.replace(/\/$/, '') + '/')))
    const 缺mkdir = [...new Set(取挂载目标().map((目) => 目.replace(/\/$/, '')))]
      .filter((目) => !mkdir.some((项) => 目 === 项 || 目.startsWith(项.replace(/\/$/, '') + '/')))
    expect(缺chown, `Dockerfile 切用户前未 chown 的可写挂载目录: ${缺chown.join(', ')}`).toEqual([])
    expect(缺mkdir, `Dockerfile 切用户前未 mkdir 的可写挂载目录: ${缺mkdir.join(', ')}`).toEqual([])
  })
})
