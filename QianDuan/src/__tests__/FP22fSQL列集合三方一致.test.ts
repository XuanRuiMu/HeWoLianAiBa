import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'


const 根目录 = resolve(__dirname, '../../..')
const 基线路径 = resolve(根目录, 'ShuJuKu/000_baseline.sql')
const 初始化路径 = resolve(根目录, 'HouDuan/QianYi/init.sql')
const 迁移目录 = resolve(根目录, 'HouDuan/QianYi/migrations')

const 跳过迁移 = /^034_/

function 顶层迁移文件(目录 = 迁移目录): string[] {
  return readdirSync(目录)
    .filter((名) => 名.endsWith('.sql') && !跳过迁移.test(名))
    .sort()
}

function 读(路径: string): string {
  return readFileSync(路径, 'utf-8').replace(/\r\n/g, '\n')
}

function 建表列集合(源: string, 表名: string): string[] {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [(]`).exec(源)
  if (!头) throw new Error(`找不到 ${表名} 的建表语句`)
  let 位置 = 头.index + 头[0].length
  let 深度 = 1
  let 段起 = 位置
  const 段: string[] = []
  for (; 位置 < 源.length; 位置++) {
    const 字 = 源[位置]
    if (字 === '(') 深度++
    else if (字 === ')') {
      深度--
      if (深度 === 0) {
        段.push(源.slice(段起, 位置))
        break
      }
    } else if (字 === ',' && 深度 === 1) {
      段.push(源.slice(段起, 位置))
      段起 = 位置 + 1
    }
  }
  return 段
    .map((行) => 行.trim())
    .map((行) => /^"([^"]+)"/.exec(行)?.[1])
    .filter((列): 列 is string => !!列)
}

function 去注释(源: string): string {
  return 源.replace(/^\s*--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

function 迁移新增列集合(表名: string, 目录 = 迁移目录): string[] {
  const 集合 = new Set<string>()
  for (const 文件 of 顶层迁移文件(目录)) {
    const 源 = 去注释(读(resolve(目录, 文件)))
    const 模式 = new RegExp(`ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"`, 'g')
    for (const 项 of 源.matchAll(模式)) 集合.add(项[1])
  }
  return [...集合].sort()
}

function 迁移新增列明细(表名: string): Array<{ 文件: string; 列: string; 类型: string }> {
  const 明细: Array<{ 文件: string; 列: string; 类型: string }> = []
  for (const 文件 of 顶层迁移文件()) {
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    const 模式 = new RegExp(
      `ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"\\s+([^;]*?);`,
      'g',
    )
    for (const 项 of 源.matchAll(模式)) {
      明细.push({ 文件, 列: 项[1], 类型: 项[2].trim().split(/\s+/)[0] })
    }
  }
  return 明细
}

function 被补列的表(): string[] {
  const 表 = new Set<string>()
  for (const 文件 of 顶层迁移文件()) {
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    for (const 项 of 源.matchAll(/ALTER TABLE "([^"]+)"\s+ADD COLUMN /g)) 表.add(项[1])
  }
  return [...表].sort()
}

function 删列定义(源: string, 表名: string, 列名: string): string {
  const 表体 = 某表表体(源, 表名)
  const 变异表体 = 表体.replace(new RegExp(`^[ \\t]*"${列名}"[^\\n]*\\n`, 'm'), '')
  if (变异表体 === 表体) {
    throw new Error(`${表名} 的建表语句里取不到 ${列名} 的定义行 ⇒ 变异夹具失效（该列已被删？判据需同步改判）`)
  }
  return 源.replace(表体, () => 变异表体)
}

function 加列定义(源: string, 表名: string, 定义行: string): string {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [(]\\n`).exec(源)
  if (!头) throw new Error(`找不到 ${表名} 的建表语句左括号 ⇒ 变异夹具不成立`)
  const 起点 = 头.index + 头[0].length
  const 变异源 = `${源.slice(0, 起点)}${定义行}\n${源.slice(起点)}`
  if (变异源 === 源) throw new Error('变异夹具没生效')
  return 变异源
}

function 表体或空(源: string, 表名: string): string | null {
  const 表体 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [\\s\\S]*?\\n\\);`).exec(源)?.[0] ?? ''
  return 表体 === '' ? null : 表体
}

function 列类型(源: string, 表名: string, 列名: string): string | null {
  const 表体 = 表体或空(源, 表名)
  if (表体 === null) return null
  const 行 = new RegExp(`^[ \\t]*"${列名}"[ \\t]*([^\\n]*)$`, 'm').exec(表体)
  if (!行) return null
  return (行[1].trim().replace(/,\s*$/, '').split(/\s+/)[0] ?? '')
}

function 迁移删除列集合(表名: string): string[] {
  const 集合 = new Set<string>()
  for (const 文件 of 顶层迁移文件()) {
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    const 模式 = new RegExp(`ALTER TABLE "${表名}"\\s+DROP COLUMN (?:IF EXISTS )?"([^"]+)"`, 'g')
    for (const 项 of 源.matchAll(模式)) 集合.add(项[1])
  }
  return [...集合].sort()
}

function 收敛列集合(建表: string[], 迁移: string[], 删除: string[] = []): string[] {
  return [...new Set([...建表, ...迁移])].filter((列) => !删除.includes(列)).sort()
}

const 基线源 = 读(基线路径)
const 初始化源 = 读(初始化路径)

const 基线消息列 = 建表列集合(基线源, '消息')
const 基线用户列 = 建表列集合(基线源, '用户')
const 迁移消息列 = 迁移新增列集合('消息')
const 迁移用户列 = 迁移新增列集合('用户')
const 迁移删除用户列 = 迁移删除列集合('用户')

interface 仅补迁移列身份 {
  文件: string
  表名: string
  列名: string
}

interface 仅补迁移列登记项 extends 仅补迁移列身份 {
  理由: string
}

const 仅补迁移列登记: readonly 仅补迁移列登记项[] = [
  {
    文件: '045_气泡已显式设置.sql',
    表名: '用户设置',
    列名: '气泡已显式设置',
    理由: '区分「从未设置气泡」与「设置为默认值」，名片只把真正设置过的气泡用于对方气泡，baseline 不含该语义',
  },
  {
    文件: '043_外观自定义.sql',
    表名: '用户设置',
    列名: '外观自定义',
    理由: '自定义背景与气泡条目、预设背景命名与文字色覆盖由迁移补列，baseline 不含该外观能力',
  },
  {
    文件: '010_挑战模式.sql',
    表名: '游戏档案',
    列名: '模式',
    理由: '挑战玩法在 baseline 快照后引入，由迁移补列',
  },
  {
    文件: '010_挑战模式.sql',
    表名: '角色',
    列名: '对局模式',
    理由: '挑战玩法在 baseline 快照后引入，由迁移补列',
  },
  {
    文件: '013_角色音色ID.sql',
    表名: '角色',
    列名: '音色ID',
    理由: '角色语音能力由迁移补列，baseline 不含该能力',
  },
  {
    文件: '014_头像签名与可见性.sql',
    表名: '用户',
    列名: '签名可见性',
    理由: '签名可见性由迁移补列，baseline 不含该隐私字段',
  },
  {
    文件: '014_头像签名与可见性.sql',
    表名: '用户',
    列名: '签名白名单',
    理由: '签名白名单由迁移补列，baseline 不含该隐私字段',
  },
  {
    文件: '022_用户RBAC运营审核员列.sql',
    表名: '用户',
    列名: '审核员',
    理由: '运营审核角色位由迁移补列，baseline 不含该 RBAC 字段',
  },
  {
    文件: '022_用户RBAC运营审核员列.sql',
    表名: '用户',
    列名: '运营',
    理由: '运营角色位由迁移补列，baseline 不含该 RBAC 字段',
  },
  {
    文件: '026_对话摘要素材锚点.sql',
    表名: '对话摘要',
    列名: '素材锚点时间',
    理由: '摘要素材锚点由迁移补列，baseline 不含该字段',
  },
  {
    文件: '031_角色结局文案快照列.sql',
    表名: '角色',
    列名: '结局文案',
    理由: '结局趣味文案快照由迁移补列，历史行不回填',
  },
  {
    文件: '039_FP11战绩分类排序.sql',
    表名: '游戏档案',
    列名: '分类ID',
    理由: '039 单点引入战绩分类模型；两条建库路径都会重放顶层迁移，baseline 不复制第二份列定义',
  },
  {
    文件: '039_FP11战绩分类排序.sql',
    表名: '游戏档案',
    列名: '排序',
    理由: '039 单点引入分类内持久顺序；两条建库路径都会重放顶层迁移，baseline 不复制第二份列定义',
  },
  {
    文件: '041_浅色深色聊天背景.sql',
    表名: '用户设置',
    列名: '聊天背景浅色',
    理由: 'FP-14 聊天背景按主题拆浅色槽，由迁移补列',
  },
  {
    文件: '041_浅色深色聊天背景.sql',
    表名: '用户设置',
    列名: '聊天背景深色',
    理由: 'FP-14 聊天背景按主题拆深色槽，由迁移补列',
  },
  {
    文件: '048_角色与用户公开编号.sql',
    表名: '用户',
    列名: '公开编号',
    理由: 'FP-08 对外公开编号替代内部 UUID，避免主键外泄；baseline 不复制第二份列定义，两条建库路径都会重放顶层迁移',
  },
  {
    文件: '048_角色与用户公开编号.sql',
    表名: '角色',
    列名: '公开编号',
    理由: 'FP-08 角色对外公开编号，同一方案覆盖角色与用户两表',
  },
]

function 仅补迁移列键(项: 仅补迁移列身份): string {
  return `${项.文件.replace(/\.sql$/, '')}:${项.表名}.${项.列名}`
}

function 扫描仅补迁移列(): 仅补迁移列身份[] {
  const 实际: 仅补迁移列身份[] = []
  for (const 表名 of 被补列的表()) {
    if (!建库侧有此表(表名)) continue
    for (const 项 of 迁移新增列明细(表名)) {
      if (建库侧列类型(表名, 项.列) === null) {
        实际.push({ 文件: 项.文件, 表名, 列名: 项.列 })
      }
    }
  }
  return 实际.sort((甲, 乙) => 仅补迁移列键(甲).localeCompare(仅补迁移列键(乙)))
}

function 仅补迁移列登记差异(
  实际: readonly 仅补迁移列身份[],
  登记: readonly 仅补迁移列登记项[],
): { 未登记: string[]; 失效登记: string[] } {
  const 实际键 = new Set(实际.map(仅补迁移列键))
  const 登记键 = new Set(登记.map(仅补迁移列键))
  return {
    未登记: [...实际键].filter((键) => !登记键.has(键)).sort(),
    失效登记: [...登记键].filter((键) => !实际键.has(键)).sort(),
  }
}

const 好友建库源文本 = 读(resolve(根目录, 'ShuJuKu/001_haoyou_yu_shezhi.sql'))
const 迁移好友消息列 = 迁移新增列集合('好友消息')

function 建库侧有此表(表名: string): boolean {
  return 表体或空(基线源, 表名) !== null || 表体或空(好友建库源文本, 表名) !== null
}

function 建库侧列类型(表名: string, 列名: string): string | null {
  for (const 源 of [基线源, 好友建库源文本]) {
    const 直取 = 列类型(源, 表名, 列名)
    if (直取 !== null) return 直取
    const 补列 = new RegExp(
      `ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"${列名}"\\s+([^;]*?);`,
    ).exec(源)
    if (补列) return 补列[1].trim().split(/\s+/)[0]
  }
  return null
}

function 某列的定义(源: string, 表名: string, 列名: string): string {
  const 行 = new RegExp(`^\\s*"${列名}"([^\\n]*)$`, 'm').exec(某表表体(源, 表名))
  return (行?.[1] ?? '').replace(/,\s*$/, '').trim()
}

function 某表表体(源: string, 表名: string): string {
  const 表体 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [\\s\\S]*?\\n\\);`).exec(源)?.[0] ?? ''
  if (表体 === '') throw new Error(`找不到 ${表名} 的建表语句`)
  return 表体
}

function 删用户列定义(源: string, 列名: string): string {
  const 表体 = 某表表体(源, '用户')
  const 变异表体 = 表体.replace(new RegExp(`^[ \\t]*"${列名}"[^\\n]*\\n`, 'm'), '')
  if (变异表体 === 表体) {
    throw new Error(
      `baseline 的 用户 里取不到 ${列名} 的定义行 ⇒ 变异夹具失效（FP-28c 已删该列？本用例的列清单需同步改判）`,
    )
  }
  return 源.replace(表体, () => 变异表体)
}

function 加回用户列定义(源: string, 定义行: string): string {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "用户" [(]\\n`).exec(源)
  if (!头) throw new Error('找不到 baseline 的 用户 建表语句左括号 ⇒ 变异夹具不成立')
  const 起点 = 头.index + 头[0].length
  const 变异源 = `${源.slice(0, 起点)}${定义行}\n${源.slice(起点)}`
  if (变异源 === 源) throw new Error('变异夹具没生效')
  return 变异源
}

describe('FP-15a 两方口径：消息表在 baseline + 迁移链一致（旧三方口径的迁移面原样保留）', () => {
  const 期望消息列 = [
    'ID',
    '用户ID',
    '角色ID',
    '内容',
    '发送者',
    '类型',
    '已读',
    '已撤回',
    '撤回时间',
    '原始内容',
    '客户端序号',
    '媒体ID',
    '幂等键',
    '内容块',
    '被引用消息ID',
    '创建时间',
  ]

  it('baseline 的 消息 建表列集合与显式期望完全相同（顺序也一致；从 baseline 删/改任一列即红）', () => {
    expect(基线消息列).toEqual(期望消息列)
  })

  it('迁移链对 消息 新增的列恰为三条且有据可查（032/033/035）；从 035 删列即红', () => {
    expect(迁移消息列).toEqual(['内容块', '幂等键', '被引用消息ID'].sort())
  })

  it('两方一致（收敛态钉绝对值）：baseline ∪ 迁移链 == 同一份显式期望 ⇒ 新库/老库同一列集合', () => {
    expect(收敛列集合(基线消息列, 迁移消息列)).toEqual([...期望消息列].sort())
  })

  it('重放幂等：迁移链在 baseline 之上不新增任何列（新库首启重放零变更）', () => {
    expect(收敛列集合(基线消息列, [])).toEqual(收敛列集合(基线消息列, 迁移消息列))
  })

  it('治理列两方俱在：三条内容/引用列既在 baseline 也有补列迁移（旧口径只比两份建表脚本，这里更强）', () => {
    for (const 列 of ['内容块', '幂等键', '被引用消息ID']) {
      expect(基线消息列, `${列} 缺于 baseline ⇒ 空卷首启的库没有该列`).toContain(列)
      expect(迁移消息列, `${列} 无补列迁移 ⇒ 存量库永远补不上（42703）`).toContain(列)
    }
  })

  it('三列的迁移依据仍在：032 定义幂等键、033 定义内容块、035 定义被引用消息ID（补进建表语句不等于作废迁移）', () => {
    const 零三二 = 读(resolve(迁移目录, '032_FP09消息幂等键.sql'))
    const 零三三 = 读(resolve(迁移目录, '033_FP10顺序化内容块.sql'))
    const 零三五 = 读(resolve(迁移目录, '035_引用消息.sql'))
    expect(零三二).toContain('ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "幂等键" UUID')
    expect(零三三).toContain('ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB')
    expect(零三五).toContain('ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID')
    expect(零三五).toMatch(/"被引用消息ID"[\s\S]{0,160}REFERENCES "消息"\("ID"\) ON DELETE SET NULL/)
    expect(零三五).not.toMatch(/REFERENCES "消息"\("ID"\)[^\n]*ON DELETE CASCADE/)
    expect(零三五).toContain('CHECK ("ID" <> "被引用消息ID")')
    expect(某表表体(基线源, '消息'), 'baseline 的 引用列必须显式 SET NULL').toContain(
      `"被引用消息ID" UUID REFERENCES "消息"("ID") ON DELETE SET NULL`,
    )
  })

  it('值域事实：消息.类型 至今没有任何 CHECK（types/index.ts 旧注释的假前提，由本用例钉死）', () => {
    const 消息表体 = 某表表体(基线源, '消息')
    expect(消息表体, 'baseline 的 消息.类型 竟出现了行内 CHECK').not.toMatch(/"类型"[^\n]*CHECK/i)
    expect(消息表体, 'baseline 的 消息.类型 竟出现了表级 CHECK').not.toMatch(/CHECK\s*\("类型"/)
    expect(消息表体, '类型 默认值变更须同步 types/index.ts 注释').toContain(
      `"类型" VARCHAR(20) DEFAULT 'wenBen'`,
    )
    const 好友定义 = /CREATE TABLE IF NOT EXISTS "好友消息" [\s\S]*?\n\);/.exec(
      读(resolve(根目录, 'ShuJuKu/001_haoyou_yu_shezhi.sql')),
    )?.[0]
    expect(好友定义 ?? '').toMatch(
      /CHECK \("类型" IN \('wenben', 'tuPian', 'yuYin', 'wenJian', 'biaoQingBao'\)\)/,
    )
  })
})

describe('FP-15a 两方口径：用户表（默认性别 + 图片授权 由迁移 037 收口；性别 列按 FP-28d 暂留、038 在 pending/）', () => {
  const 期望用户基线列 = [
    'ID',
    '手机号',
    '用户名',
    '密码哈希',
    '昵称',
    '性别',
    '目标性别',
    '默认性别',
    '性格选择',
    '人设标签',
    '渣男渣女变体',
    '头像',
    '生日',
    '签名',
    '管理员',
    '测试',
    '图片授权',
    '活跃角色ID',
    '创建时间',
    '更新时间',
  ]
  const 期望用户迁移列 = [
    '图片授权',
    '审核员',
    '测试',
    '签名可见性',
    '签名白名单',
    '运营',
    '默认性别',
    '公开编号',
  ]
  const 期望用户删除列: string[] = []
  const 期望收敛用户列 = [
    ...期望用户基线列,
    '签名可见性',
    '签名白名单',
    '运营',
    '审核员',
    '公开编号',
  ].filter((列) => !期望用户删除列.includes(列))

  it('baseline 的 用户 建表列集合与显式期望完全相同（含 性别/默认性别/图片授权；删任一列即红）', () => {
    expect(基线用户列).toEqual(期望用户基线列)
    expect(基线用户列, 'FP-28d 已成对回退 ⇒ baseline 必须仍含 性别（038 在 pending/ 未放行）').toContain(
      '性别',
    )
  })

  it('迁移链对 用户 的补列集合与显式期望相同（旧正则漏判的 测试/运营/审核员 现已计入）', () => {
    expect(迁移用户列).toEqual([...期望用户迁移列].sort())
  })

  it('迁移链对 用户 的删列集合恰为空（FP-28d：038 已移出顶层，回移即红），且 038 只在 pending/', () => {
    expect(迁移删除用户列).toEqual([])
    expect(readdirSync(迁移目录), '038 回到顶层 ⇒ 容器启动自动迁移会 DROP 性别 打挂管理端').not.toContain(
      '038_删除用户性别死列.sql',
    )
    expect(readdirSync(resolve(迁移目录, 'pending'))).toContain('038_删除用户性别死列.sql')
    const 零三八 = 读(resolve(迁移目录, 'pending', '038_删除用户性别死列.sql'))
    expect(零三八).toContain('ALTER TABLE "用户" DROP COLUMN IF EXISTS "性别";')
    expect([...零三八.replace(/^\s*--.*$/gm, '').matchAll(/ALTER TABLE "([^"]+)"/g)].map((项) =>项[1])).toEqual([
      '用户',
    ])
    expect(零三八).toContain('-- 删除语义')
    expect(零三八).toContain('037')
    expect(零三八).toContain('fp28c_probe_')
    expect(零三八, '038 头注释缺 FP-28d 暂捏登记').toContain('FP-28d')
  })

  it('两方一致（收敛态钉绝对值）：(baseline ∪ 迁移链补列) − 迁移链删列 == 24 列全集（FP-28d：顶层无 DROP）', () => {
    expect(收敛列集合(基线用户列, 迁移用户列, 迁移删除用户列)).toEqual([...期望收敛用户列].sort())
  })

  it('FP-15a 收口项：默认性别 与 图片授权 两方俱在 ⇒ 新库由 baseline 有、老库由 037 补', () => {
    for (const 列 of ['默认性别', '图片授权']) {
      expect(基线用户列, `${列} 缺于 baseline ⇒ 空卷首启的库没有该列`).toContain(列)
      expect(迁移用户列, `${列} 无补列迁移 ⇒ 存量库永远补不上（42703）`).toContain(列)
    }
  })

  it('旧账本用例改判：FP-22f 登记的两条 init 侧分叉（默认性别 无补列迁移 / 图片授权 只写在 baseline）均已闭合', () => {
    const 基线独有 = 基线用户列.filter((列) => !迁移用户列.includes(列))
    const 迁移独有 = 迁移用户列.filter((列) => !基线用户列.includes(列))
    for (const 列 of ['默认性别', '图片授权']) expect(基线独有, `${列} 退化为只写在 baseline`).not.toContain(列)
    expect(迁移独有.sort()).toEqual(['公开编号', '审核员', '签名可见性', '签名白名单', '运营'])
  })

  it('037 的列定义与既有 目标性别 列同族：类型串逐字相同，且 用户 表两侧都无 CHECK（不新造第二套约束形态）', () => {
    const 零三七 = 读(resolve(迁移目录, '037_用户默认性别.sql'))
    const 基准定义 = 某列的定义(基线源, '用户', '目标性别')
    expect(基准定义, 'baseline 的 用户.目标性别 定义取不到或漂移，比对基准不成立').toBe('VARCHAR(10)')
    expect(某列的定义(基线源, '用户', '默认性别'), 'baseline 的 默认性别 与 目标性别 不同族').toBe(基准定义)
    expect(零三七).toContain(`ADD COLUMN IF NOT EXISTS "默认性别" ${基准定义};`)
    expect(零三七).toContain('ADD COLUMN IF NOT EXISTS "图片授权" BOOLEAN DEFAULT FALSE;')
    expect(某列的定义(基线源, '用户', '图片授权')).toBe('BOOLEAN DEFAULT FALSE')
    const 值域行 = /^--\s*值域字面量:\s*(.+)$/m.exec(零三七)?.[1] ?? ''
    expect([...值域行.matchAll(/'([^']+)'/g)].map((项) => 项[1]).sort()).toEqual(['female', 'male'])
    const 语句体 = 零三七.replace(/^\s*--.*$/gm, '')
    expect(语句体).not.toMatch(/\bCHECK\b/i)
    expect(某表表体(基线源, '用户'), 'baseline 的 用户 表出现表级 CHECK ⇒ 同族口径需同步改判').not.toMatch(
      /\bCHECK\s*\(/,
    )
  })

  it('删列反证 + FP-28d 暂捏反证（性别 成对回退仍在位；038 不得回到顶层）', () => {
    for (const 列 of ['性别', '目标性别', '默认性别']) {
      const 变异源 = 删用户列定义(基线源, 列)
      expect(建表列集合(变异源, '用户'), `${列} 被删后列集合守卫仍等于期望值 ⇒ 该守卫是空判`).not.toEqual(
        期望用户基线列,
      )
      expect(建表列集合(变异源, '用户')).not.toContain(列)
    }
    const 回流源 = 加回用户列定义(删用户列定义(基线源, '性别'), '    "性别" VARCHAR(10),')
    const 回流列 = 建表列集合(回流源, '用户')
    expect(回流列).toContain('性别')
    expect([...回流列].sort(), '删后加回仍凑不回期望全集 ⇒ 夹具失效').toEqual([...期望用户基线列].sort())
    expect(迁移删除用户列, '当前顶层必须无 DROP（038 在 pending/）').toEqual([])
    const 模拟回移删除 = [...new Set([...迁移删除用户列, '性别'])]
    expect(
      收敛列集合(基线用户列, 迁移用户列, 模拟回移删除),
      '038 移回顶层后收敛态仍等于 24 列全集 ⇒ 暂捏守卫是空判',
    ).not.toEqual([...期望收敛用户列].sort())
    expect(收敛列集合(基线用户列, 迁移用户列, 迁移删除用户列)).toEqual([...期望收敛用户列].sort())
    const 基准消失 = 删用户列定义(基线源, '目标性别')
    expect(某列的定义(基准消失, '用户', '目标性别'), '基准列被删后同族守卫仍能取到定义 ⇒ 反证失效').not.toBe(
      'VARCHAR(10)',
    )
    expect(某列的定义(基线源, '用户', '目标性别')).toBe('VARCHAR(10)')
  })

  it('命名与编号从真实顶层目录推进：035/036/037/039 唯一，034 与 pending 038 不进链，全目录无重号', () => {
    const 顶层文件 = 顶层迁移文件()
    const 版本 = 顶层文件.map((名) => 名.split('_')[0])
    expect(顶层文件.every((名) => /^\d{3}_.+\.sql$/.test(名))).toBe(true)
    expect(版本.filter((项) => 项 === '035')).toHaveLength(1)
    expect(版本.filter((项) => 项 === '036')).toHaveLength(1)
    expect(版本.filter((项) => 项 === '037')).toHaveLength(1)
    expect(版本.filter((项) => 项 === '039')).toHaveLength(1)
    expect(版本.filter((项) => 项 === '034')).toHaveLength(0)
    expect(
      版本.filter((项) => 项 === '038'),
      '038 回到顶层 ⇒ 容器启动自动迁移会 DROP 性别 打挂管理端',
    ).toHaveLength(0)
    const 重号 = [...new Set(版本)].filter((项) => 版本.filter((它) => 它 === 项).length > 1)
    expect(重号, 'migrations 目录出现重号迁移 ⇒ 台账 checksum 与已应用迁移不可改那两条铁律都会被绕过').toEqual([])
    expect(版本).toEqual([...版本].sort())
    expect(仅补迁移列登记.some((项) => 项.文件.startsWith('038_'))).toBe(false)
    expect(顶层文件).not.toContain('038_删除用户性别死列.sql')
    expect(readdirSync(resolve(迁移目录, 'pending')).filter((名) => 名.startsWith('038'))).toEqual([
      '038_删除用户性别死列.sql',
    ])
  })
})

describe('FP-21 两方口径：好友消息表在 001_haoyou_yu_shezhi.sql + 迁移链一致', () => {
  const 好友建库源 = 好友建库源文本
  const 期望好友消息列 = [
    'ID',
    '发送者ID',
    '接收者ID',
    '内容',
    '类型',
    '媒体ID',
    '已读',
    '撤回',
    '内容块',
    '被引用消息ID',
    '创建时间',
  ]

  it('建库侧 001 的 好友消息 列集合与显式期望完全相同（含 036 的两列；删任一列即红）', () => {
    expect(建表列集合(好友建库源, '好友消息')).toEqual(期望好友消息列)
  })

  it('000_baseline.sql 确实不建 好友消息 ⇒ 本表的建库侧真源只能是 001（前提本身也要钉住）', () => {
    expect(表体或空(基线源, '好友消息'), '好友消息 已进 baseline ⇒ 本节判据的比对口径需整体改判').toBeNull()
    expect(建表列集合(基线源, '消息').length).toBeGreaterThan(0)
  })

  it('迁移链对 好友消息 新增的列恰为 036 的两列；从 036 删列即红', () => {
    expect(迁移好友消息列).toEqual(['内容块', '被引用消息ID'])
  })

  it('两方一致（收敛态钉绝对值）：001 建表 ∪ 迁移链补列 == 同一份 11 列全集 ⇒ 空卷库与存量库同形', () => {
    expect(收敛列集合(建表列集合(好友建库源, '好友消息'), 迁移好友消息列)).toEqual(
      [...期望好友消息列].sort(),
    )
  })

  it('重放幂等：迁移链在 001 之上不新增任何列（干净卷首启重放零变更）', () => {
    expect(收敛列集合(建表列集合(好友建库源, '好友消息'), [])).toEqual(
      收敛列集合(建表列集合(好友建库源, '好友消息'), 迁移好友消息列),
    )
  })

  it('治理列两方俱在：两列既有建表依据（001）也有补列迁移（036）⇒ 新库靠建表、老库靠迁移，缺一即 42703', () => {
    const 建库列 = 建表列集合(好友建库源, '好友消息')
    for (const 列 of ['内容块', '被引用消息ID']) {
      expect(建库列, `${列} 缺于 001 ⇒ 空卷首启的库没有该列`).toContain(列)
      expect(迁移好友消息列, `${列} 无补列迁移 ⇒ 存量库永远补不上（42703）`).toContain(列)
    }
  })

  it('036 的列定义与 001 逐字同形：内容块=JSONB、被引用消息ID=UUID（同族于 消息 的 033/035）', () => {
    const 零三六 = 读(resolve(迁移目录, '036_好友消息内容与引用.sql'))
    expect(某列的定义(基线源, '消息', '内容块'), '比对基准 消息.内容块 漂移').toBe('JSONB')
    expect(某列的定义(基线源, '消息', '被引用消息ID').split(/\s+/)[0], '比对基准 消息.被引用消息ID 漂移').toBe(
      'UUID',
    )
    expect(列类型(好友建库源, '好友消息', '内容块')).toBe('JSONB')
    expect(列类型(好友建库源, '好友消息', '被引用消息ID')).toBe('UUID')
    expect(零三六).toContain('ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB;')
    expect(零三六).toContain('ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID')
    expect(零三六).toMatch(/"被引用消息ID"[\s\S]{0,160}REFERENCES "好友消息"\("ID"\) ON DELETE SET NULL/)
    expect(零三六).not.toMatch(/REFERENCES "好友消息"\("ID"\)[^\n]*ON DELETE CASCADE/)
    expect(零三六).toContain('CHECK ("ID" <> "被引用消息ID")')
    expect(零三六).toContain('CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引"')
    const 明细 = 迁移新增列明细('好友消息')
    expect(明细.map((项) => `${项.文件}:${项.列}=${项.类型}`).sort()).toEqual([
      '036_好友消息内容与引用.sql:内容块=JSONB',
      '036_好友消息内容与引用.sql:被引用消息ID=UUID',
    ])
    for (const 项 of 明细) {
      expect(列类型(好友建库源, '好友消息', 项.列), `001 的 ${项.列} 与 036 不同形`).toBe(项.类型)
      expect(列类型(基线源, '消息', 项.列), `baseline 的 消息.${项.列} 与 036 不同形（同构前提失效）`).toBe(
        项.类型,
      )
    }
  })

  it('建库侧同约束：001 必须与 036 给出**同名** FK / CHECK / 索引 ⇒ 两条路径的 pg_constraint 行一致', () => {
    const 建表语句 = 某表表体(好友建库源, '好友消息')
    expect(建表语句, '001 的引用列缺 FK 或非 SET NULL').toContain(
      '"被引用消息ID" UUID REFERENCES "好友消息"("ID") ON DELETE SET NULL',
    )
    expect(建表语句, '001 缺与 036 同名的禁自引用 CHECK').toContain(
      'CONSTRAINT "好友消息_不得自引用" CHECK ("ID" <> "被引用消息ID")',
    )
    expect(好友建库源, '001 缺外键侧索引 ⇒ 批量删行退化成逐行全表扫').toContain(
      'CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引" ON "好友消息" ("被引用消息ID")',
    )
    expect(表体或空(基线源, '消息'), '消息 若已有同名 CHECK，本用例的"分叉事实"陈述需改判').not.toContain(
      '消息_不得自引用',
    )
  })

  it('删列反证：从 001 的 好友消息 抹掉任一治理列 ⇒ 建库侧列集合与两方俱在两条必红（守卫不是空判）', () => {
    for (const 列 of ['内容块', '被引用消息ID']) {
      const 变异源 = 删列定义(好友建库源, '好友消息', 列)
      const 变异列 = 建表列集合(变异源, '好友消息')
      expect(变异列, `${列} 被删后建库侧列集合守卫仍等于期望值 ⇒ 该守卫是空判`).not.toEqual(期望好友消息列)
      expect(变异列).not.toContain(列)
      expect(
        变异列.includes(列) && 迁移好友消息列.includes(列),
        `${列} 的两方俱在判据失效`,
      ).toBe(false)
      expect(收敛列集合(变异列, 迁移好友消息列)).toEqual([...期望好友消息列].sort())
      expect(
        收敛列集合(变异列, 迁移好友消息列.filter((它) => 它 !== 列)),
        `${列} 两侧都没依据时收敛态仍绿 ⇒ 绝对值守卫是空判`,
      ).not.toEqual([...期望好友消息列].sort())
    }
    const 回流源 = 加列定义(
      删列定义(好友建库源, '好友消息', '内容块'),
      '好友消息',
      '    "内容块" JSONB,',
    )
    expect(建表列集合(回流源, '好友消息').slice().sort()).toEqual([...期望好友消息列].sort())
    expect(列类型(回流源, '好友消息', '内容块'), '回流的列定义与 036 不同形').toBe('JSONB')
    expect(建表列集合(好友建库源, '好友消息')).toContain('内容块')
  })

  it('通用判据：迁移链补的每一列，只要建库侧也有依据，两侧类型必须同形（全表扫描，非手写清单）', () => {
    const 比过: string[] = []
    const 类型分叉: string[] = []
    for (const 表名 of 被补列的表()) {
      if (!建库侧有此表(表名)) continue 
      for (const 项 of 迁移新增列明细(表名)) {
        const 建库侧 = 建库侧列类型(表名, 项.列)
        if (建库侧 === null) continue 
        比过.push(`${表名}.${项.列}=${建库侧}`)
        if (建库侧 !== 项.类型) 类型分叉.push(`${表名}.${项.列} 建库=${建库侧} 迁移=${项.类型}`)
      }
    }
    expect(比过.length, '一条都没比对 ⇒ 本判据空转').toBeGreaterThanOrEqual(15)
    expect(比过).toEqual(expect.arrayContaining(['好友消息.内容块=JSONB', '好友消息.被引用消息ID=UUID', '消息.内容块=JSONB']))
    expect(类型分叉, '同一列在建库侧与迁移链上类型不一致 ⇒ 两条路径得到的表结构不同形').toEqual([])
  })

  it('仅补迁移列必须与显式登记逐条全等；039 两列有真实理由，038 pending 不在登记面', () => {
    const 实际 = 扫描仅补迁移列()
    expect(仅补迁移列登记差异(实际, 仅补迁移列登记)).toEqual({ 未登记: [], 失效登记: [] })
    for (const 登记 of 仅补迁移列登记) {
      expect(登记.理由.trim(), `${仅补迁移列键(登记)} 缺登记理由`).not.toBe('')
      expect(顶层迁移文件(), `${仅补迁移列键(登记)} 指向的迁移不在顶层链`).toContain(登记.文件)
      expect(
        迁移新增列明细(登记.表名).some(
          (项) => 项.文件 === 登记.文件 && 项.列 === 登记.列名,
        ),
        `${仅补迁移列键(登记)} 在登记中但迁移链没有对应 ADD COLUMN`,
      ).toBe(true)
      expect(
        建库侧列类型(登记.表名, 登记.列名),
        `${仅补迁移列键(登记)} 已进入建库侧，不再属于仅补迁移列`,
      ).toBeNull()
    }
    const 零三九登记 = 仅补迁移列登记.filter((项) => 项.文件 === '039_FP11战绩分类排序.sql')
    expect(零三九登记.map(仅补迁移列键)).toEqual([
      '039_FP11战绩分类排序:游戏档案.分类ID',
      '039_FP11战绩分类排序:游戏档案.排序',
    ])
    for (const 项 of 零三九登记) {
      expect(项.理由).toContain('039')
      expect(项.理由).toContain('baseline')
    }
    expect(实际.some((项) => 项.文件.startsWith('038_'))).toBe(false)
    const 实际键 = new Set(实际.map(仅补迁移列键))
    for (const 项 of 迁移新增列明细('好友消息')) {
      expect(实际键, `036 的 ${项.列} 只存在于迁移链 ⇒ 建库侧漏了`).not.toContain(
        `036_好友消息内容与引用:好友消息.${项.列}`,
      )
    }
  })

  it('登记守卫防空判：新增顶层迁移的仅补列未登记判红，补入登记后转绿', () => {
    const 当前实际 = 扫描仅补迁移列()
    const 合成登记: 仅补迁移列登记项 = {
      文件: '040_合成验证新增顶层迁移.sql',
      表名: '游戏档案',
      列名: '合成未登记列',
      理由: '仅用于验证未登记判红',
    }
    expect(仅补迁移列登记差异([...当前实际, 合成登记], 仅补迁移列登记)).toEqual({
      未登记: ['040_合成验证新增顶层迁移:游戏档案.合成未登记列'],
      失效登记: [],
    })
    expect(
      仅补迁移列登记差异([...当前实际, 合成登记], [...仅补迁移列登记, 合成登记]),
    ).toEqual({ 未登记: [], 失效登记: [] })
    expect(顶层迁移文件()).not.toContain(合成登记.文件)
  })
})

describe('FP-15a 新增面：init.sql 已退役，不得再自称生产建库路径', () => {
  it('文件头自述按事实写明：仅供开发参考 + 正式建库真源是 000_baseline.sql', () => {
    const 头 = 初始化源.slice(0, 3000)
    expect(头, 'init.sql 的退役自述缺失或被改写').toContain('仅供开发参考')
    expect(头, 'init.sql 未指明正式建库真源').toContain('ShuJuKu/000_baseline.sql')
    expect(头, 'init.sql 的自述未落到可核对的事实（挂载点/CI）').toContain('docker-entrypoint-initdb.d')
    expect(头, 'init.sql 未记录「跑不通」这一实测事实').toContain('媒体文件')
  })

  it('假自述不回流：全文（含 SQL 语义行）不得再出现「生产」或任何自称建库路径的写法', () => {
    expect(初始化源, 'init.sql 又自称生产建库路径（L-07 裁定已退役）').not.toMatch(/生产/)
    for (const 假自述 of [
      '首次建库脚本',
      '生产库首次建库',
      '生产环境首次建库',
      '本脚本用于建库',
      '正式建库走本文件',
      '本文件是建库路径',
    ]) {
      expect(初始化源, `init.sql 出现假自述：${假自述}`).not.toContain(假自述)
    }
  })

  it('退役不等于重生成：本文件的 SQL 语义仍只是「缺 媒体文件 表」的旧全量脚本（列集合不参与任何一致性门禁）', () => {
    const 建表数 = [...初始化源.matchAll(/^CREATE TABLE IF NOT EXISTS "([^"]+)"/gm)].map((项) => 项[1])
    expect(建表数, 'init.sql 的 用户/角色 建表语句不该被顺手删').toEqual(
      expect.arrayContaining(['用户', '角色', '消息']),
    )
    expect(建表数, 'init.sql 仍不建 媒体文件 ⇒ 它不可能成为建库路径（该事实由守卫①②依赖）').not.toContain(
      '媒体文件',
    )
    expect(初始化源).toContain('DROP TABLE IF EXISTS "积分变动"')
  })
})
