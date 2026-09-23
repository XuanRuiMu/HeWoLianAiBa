import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * FP-28b 注销匿名化 UPDATE 的**列清单守卫**（`用户.性别` 死列处置的第二步）。
 *
 * 为什么钉这一条：`services/账号注销.ts` 的匿名化 UPDATE 用**显式列名**写
 * `"性别" = NULL`，它是该死列在后端的最后一个写点。FP-28c 真删列时若不先摘掉这一行，
 * 注销会当场 42703 ⇒ `/api/认证/注销` 500，且是在事务里 ⇒ 整条注销不可用。
 *
 * 本文件同时钉**反向**事实（避免"顺手把脱敏也删了"）：脱敏列清单逐列全在、
 * 参数与占位符逐位对齐、且 UPDATE 引用的每一列都必须在 `database/000_baseline.sql`
 * 的 用户 建表列集合里存在 —— 后者是 FP-28c 的看门狗：baseline 删掉 性别 之后，
 * 谁再把 `"性别" =` 写回来，这里必红（反证见同名用例）。
 *
 * 【契约演进（不是放宽判据）】匿名化赋值项由 **16 → 15**，少的就是 `"性别" = NULL`，
 *  与出参侧 `xing_bie` 键由 20 → 19 同一口径（见 FP08认证信息出参能力位.test.ts 的逐键用例）。
 *  列集合面只增不减：新增"逐列存在于 baseline"这一条旧版没有的判定。
 *
 * 【FP-28c 追加改判（2026-09-23，本单：迁移 038 真删该列）】本文件是**三步链的落地验证**，
 *  用例清单**一条不删**、判据**一条不放宽**，只把最后那条"反证自证"由**内存变异模拟**升级为
 *  **真库事实**：旧版得先把 baseline 里的 `"性别" VARCHAR(10),` 抹掉才能构造"列不存在"，
 *  038 之后那个前提已经是 baseline 自身的样子 ⇒ 变异夹具作废，同一条看门狗直接跑在真 baseline 上。
 *  随之前提一起翻向的还有旧版那句 `expect(基线用户列集合()).toContain('性别')`（它钉的是"列还在位"，
 *  该前提被本单主动消灭 ⇒ 留着即永久红灯），换成 `not.toContain('性别')` 并补钉"同族两列仍在位、
 *  仍被注销清空"，防止有人顺手把 目标性别/默认性别 一起摘了。
 *
 * 【FP-28d 追加改判（2026-09-23，第六轮裁定②）】管理端已提交版本仍读 `用户.性别`、容器启动自动
 *  迁移链会 DROP 该列打挂管理端 ⇒ 038 暂移 `migrations/pending/`（不进链），baseline 成对回带该列定义。
 *  上条 28c 里「换成 not.toContain('性别')」的前提（baseline 已删列）随之失效：`:165` 键翻回
 *  `toContain('性别')`、`:172` 的越权差集由恰 `['性别']` 改判为 `[]`（性别 合法在位、现清单仍不含它），
 *  并补一条「真越权探针列」钉看门狗本身不是空判。其余用例（注销不再写 性别、15 项赋值清单、
 *  占位符对齐、逐列看门狗）判据一字未动。放行条件见
 *  `.agents/evidence/traces/FP-28d放行条件-20260923.md`。
 */

const 仓库根 = resolve(__dirname, '..', '..', '..', '..')
const 基线路径 = resolve(仓库根, 'database', '000_baseline.sql')

const 语句记录: Array<{ 文本: string; 参数: unknown[] }> = []
const 注销用户ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句记录.push({ 文本, 参数 })
      if (文本.includes(`SELECT * FROM "用户"`)) {
        return { rows: [{ ID: 注销用户ID, 手机号: '13800138000' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
    connect: async () => ({
      query: async (文本: string, 参数: unknown[] = []) => {
        语句记录.push({ 文本, 参数 })
        return { rows: [], rowCount: 1 }
      },
      release: () => undefined,
    }),
  },
}))

vi.mock('../../redis', () => ({
  redis: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1) },
}))

vi.mock('../../utils/jwt', () => ({
  yanZhengLingPai: () => ({ jti: null }),
  xieRuCheXiaoShiJianCuo: vi.fn(async () => undefined),
  cheXiaoYongHuSuoYouRefreshToken: vi.fn(async () => undefined),
}))

vi.mock('../../services/媒体存储', () => ({
  huoQuBenDiLuJing: () => null,
  cheXiaoYongHuMeiTiQianMing: vi.fn(async () => undefined),
}))

vi.mock('../../services/审计日志', () => ({ jiLuShenJiRiZhi: vi.fn(async () => undefined) }))

vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))

import { zhuXiaoYongHu } from '../账号注销'

/** baseline 的 用户 建表列集合（首标识符即列名；表级约束不以引号开头，天然排除） */
function 基线用户列集合(): string[] {
  const 源 = readFileSync(基线路径, 'utf-8').replace(/\r\n/g, '\n')
  const 表体 = new RegExp(`CREATE TABLE IF NOT EXISTS "用户" [\\s\\S]*?\\n\\);`).exec(源)?.[0] ?? ''
  if (表体 === '') throw new Error('找不到 baseline 的 用户 建表语句，比对基准不成立')
  return [...表体.matchAll(/^\s*"([^"]+)"/gm)].map((项) => 项[1])
}

/** 只取 UPDATE 的 SET 段（`WHERE "ID" = $1` 不是赋值列，整串匹配会把它误计入） */
function SET赋值列(文本: string): string[] {
  const 段 = /SET([\s\S]*?)WHERE/.exec(文本)?.[1] ?? ''
  if (段 === '') throw new Error('UPDATE 语句没取到 SET 段，比对基准不成立')
  return [...段.matchAll(/"([^"]+)"\s*=/g)].map((项) => 项[1])
}

async function 跑注销(): Promise<string> {
  const 结果 = await zhuXiaoYongHu(注销用户ID, 'fake-token', '127.0.0.1')
  expect(结果.cheng_gong).toBe(true)
  const 匿名化 = 语句记录.filter((项) => /^\s*UPDATE "用户" SET/m.test(项.文本))
  expect(匿名化).toHaveLength(1)
  return 匿名化[0].文本
}

beforeEach(() => {
  语句记录.length = 0
  vi.clearAllMocks()
})

describe('FP-28b 注销匿名化：不再写 用户.性别 死列，且脱敏面逐列不退', () => {
  it('UPDATE 里不再出现 "性别" 赋值（FP-28c 删列后注销不得 500）', async () => {
    const 文本 = await 跑注销()
    expect(文本).not.toMatch(/"性别"\s*=/)
    expect(文本).not.toMatch(/,\s*"性别"\s*,/)
    // 同族两列（目标性别/默认性别）是不同列，不得被顺手删：带前缀的引号标识符必须仍在
    expect(文本).toMatch(/"目标性别"\s*=\s*NULL/)
    expect(文本).toMatch(/"默认性别"\s*=\s*NULL/)
  })

  it('赋值项逐列钉死：15 项全清单与顺序无关的全等判定（多一列少一列都红）', async () => {
    const 文本 = await 跑注销()
    const 赋值列 = SET赋值列(文本)
    expect([...赋值列].sort()).toEqual(
      [
        '手机号',
        '用户名',
        '密码哈希',
        '昵称',
        '目标性别',
        '默认性别',
        '性格选择',
        '人设标签',
        '渣男渣女变体',
        '管理员',
        '头像',
        '生日',
        '签名',
        '活跃角色ID',
        '更新时间',
      ].sort(),
    )
    expect(赋值列).not.toContain('性别')
  })

  it('占位符与参数逐位对齐：$1 用户ID、$2/$3 同一注销标记（手机号与用户名同步匿名化）', async () => {
    await 跑注销()
    const 匿名化 = 语句记录.find((项) => /^\s*UPDATE "用户" SET/m.test(项.文本))
    expect(匿名化?.参数).toEqual([注销用户ID, `注销_${注销用户ID.slice(0, 8)}`, `注销_${注销用户ID.slice(0, 8)}`])
    expect(匿名化?.文本).toMatch(/WHERE "ID" = \$1/)
  })

  it('看门狗（反证面）：UPDATE 引用的每一列都必须在 baseline 的 用户 列集合里', async () => {
    const 文本 = await 跑注销()
    const 基线列 = new Set(基线用户列集合())
    const 赋值列 = SET赋值列(文本)
    for (const 列 of 赋值列) {
      expect(基线列, `注销写了 baseline 里不存在的列 ${列} ⇒ 删列后必 42703`).toContain(列)
    }
  })

  it('反证自证（FP-28d 翻回）：baseline 仍含 性别（038 暂捏），现清单对 baseline 无越权且看门狗非空判', async () => {
    // 【旧 → 新】FP-28b 版做内存变异假造"列不存在"；FP-28c 把前提换成"038 真删 ⇒ baseline 无 性别"，
    //   `基线列` 断言翻为 not.toContain、越权差集恰 `['性别']`；FP-28d 成对回退后前提再次翻回：
    //   **baseline 必须重新含 性别**（038 在 pending/ 未放行）。
    //   越权差集随之从恰 `['性别']` 改判为 `[]`——性别 已合法在位，"把 性别 写回 UPDATE"不再由列级
    //   看门狗拦截（它只管列在不在），改由本文件前两条用例（UPDATE 不得含 性别 赋值 / 15 项清单）
    //   把守；看门狗本身仍用真越权探针列钉非空判。判定维度不减：正向逐列在位 + 反向探针点名。
    await 跑注销()
    const 基线列 = new Set(基线用户列集合())
    expect(基线列, 'FP-28d 已成对回退 ⇒ baseline 必须仍含 性别（038 在 pending/ 未放行）').toContain('性别')
    const UPDATE文本 = 语句记录.find((项) => /^\s*UPDATE "用户" SET/m.test(项.文本))!.文本
    const 现清单 = SET赋值列(UPDATE文本)
    // 正向：当前注销语句引用的列在真库里逐列存在 ⇒ 删列当天不会 42703
    for (const 列 of 现清单) expect(基线列, `注销写了 baseline 里不存在的列 ${列}`).toContain(列)
    // 28d：现清单不得因性别回列而回写它（15 项契约不变）
    expect(现清单).not.toContain('性别')
    // 越权差集（28d：性别 合法在位 ⇒ 模拟写回后仍无越权列）
    const 回流清单 = [...现清单, '性别']
    expect(回流清单.filter((列) => !基线列.has(列))).toEqual([])
    // 看门狗防空判：真不在 baseline 的探针列必须被精确点名（否则上面的 [] 是空判）
    expect(
      ['FP28d_越权探针列'].filter((列) => !基线列.has(列)),
      '看门狗对真越权列取回空 ⇒ 守卫失效',
    ).toEqual(['FP28d_越权探针列'])
    // 同族两列不得被顺手牵连：它们仍在 baseline，也仍被 UPDATE 清空
    for (const 列 of ['目标性别', '默认性别']) {
      expect(基线列).toContain(列)
      expect(现清单, `${列} 不得随 性别 一起被摘掉`).toContain(列)
    }
  })
})
