import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 第四波 BlindSpot G-4 守卫：好友链路的幂等键注释必须与后端事实一致（禁悬空假陈述）。
 *
 * 事实面（写这份用例时逐一核对）：
 *  - `backend/src/routes/好友.ts::HAO_YOU_YU_JU.插入消息` 的列清单没有 "幂等键"；
 *  - `backend/src` 全量没有 Idempotency 头的读点；
 *  - 只有 AI 链路的 `消息` 表有 "幂等键" 列 + 唯一约束（迁移 032）并被 services/消息.ts 用于去重。
 * ⇒ 好友页注释只准陈述「幂等仅在 AI 链路生效」，不得再承诺「重发不会多出一条」。
 * 双向锁：哪天后端真的落了这一列，本用例反向变红，逼着注释同步改口径（同 FP22f 的三方一致口径）。
 */

const 后端路由 = readFileSync(
  resolve(__dirname, '../../../backend/src/routes/好友.ts'),
  'utf-8',
)
const 好友页 = readFileSync(resolve(__dirname, '../views/好友聊天.vue'), 'utf-8')
const 后端源 = readFileSync(
  resolve(__dirname, '../../../backend/src/services/消息.ts'),
  'utf-8',
)

function 好友插入语句(): string {
  const 起点 = 后端路由.indexOf('插入消息:')
  expect(起点, 'routes/好友.ts 里找不到 HAO_YOU_YU_JU.插入消息').toBeGreaterThan(-1)
  const 左反引号 = 后端路由.indexOf('`', 起点)
  const 右反引号 = 后端路由.indexOf('`', 左反引号 + 1)
  return 后端路由.slice(左反引号 + 1, 右反引号)
}

const 插入语句 = 好友插入语句()
const 列清单 = 插入语句.slice(
  插入语句.indexOf('(') + 1,
  插入语句.indexOf(')'),
)
const 后端已落列 = 列清单.includes('幂等键')

describe('G-4 好友链路幂等键：注释与后端事实一致', () => {
  it('后端事实自证：好友 INSERT 列清单逐列可枚举，AI 链路那侧确有幂等键', () => {
    const 列 = 列清单
      .split(',')
      .map((项) => 项.trim().replace(/^"|"$/g, ''))
      .filter((项) => 项.length > 0)
    // FP-21（036）后 好友消息 多了 `内容块` 与 `被引用消息ID` 两列 ⇒ 清单由 5 列改判为 7 列。
    // 本用例钉的是「**没有** 幂等键 列」，该风险面不随列数变化；两条 AI 链路事实保持不动。
    expect(列).toEqual(['发送者ID', '接收者ID', '内容', '类型', '媒体ID', '内容块', '被引用消息ID'])
    expect(后端源).toContain('ON CONFLICT ("用户ID", "角色ID", "幂等键")')
  })

  it('后端没有 Idempotency 头读者：请求头带键也只到得了重试逻辑', () => {
    expect(后端路由).not.toMatch(/Idempotency/i)
    if (!后端已落列) expect(列清单).not.toContain('幂等键')
  })

  it('好友页注释按事实陈述：写明幂等仅在 AI 链路生效，且不残留无条件承诺', () => {
    if (后端已落列) {
      // 反向锁：后端一旦真落该列，「不成立」这句就成了新的假陈述——必须同步改注释
      expect(
        好友页,
        '后端 INSERT 已携带 幂等键，好友页注释的「不成立」口径需要重新核对',
      ).not.toContain('不成立')
      return
    }
    expect(好友页).toContain('只在 AI 链路真正生效')
    expect(好友页).toContain('不成立')
    expect(好友页).not.toContain('保证同一次编辑重发不会多出一条')
  })
})
