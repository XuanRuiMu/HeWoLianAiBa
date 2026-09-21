import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  声明块清单,
  按档解析全部,
  声明位置,
  塌陷令牌清单,
  所有声明令牌,
} from './主题令牌真源'

// FP-12：设计令牌成对性全站审计 —— 防 F23（真源只住在单侧主题块 → 另一档塌陷）复发的结构性护栏。

const 源码根 = resolve(__dirname, '..')
const 块们 = 声明块清单()
const 浅色解析 = 按档解析全部('light', 块们)
const 深色解析 = 按档解析全部('dark', 块们)

/** FP-12 授权可改文件：豁免令牌必须在这五处零消费者，否则"上收即改变授权内视觉"就不成立，须回到上收路径 */
const 授权文件 = [
  'styles/variables.css',
  'styles/global.css',
  'components/断网横幅.vue',
  'views/登录内容.vue',
  'layouts/认证布局.vue',
]

/** 豁免类别：两类各带一条可被证伪的机器约束，见下方用例 */
type 豁免类别 = '越权阻塞' | '零消费者疑死令牌'

interface 豁免项 {
  令牌: string
  类别: 豁免类别
  理由: string
}

/**
 * 已知塌陷令牌账本（FP-12 审计扫出的 13 枚 light-only 令牌，与 F23 同族）：
 * - 越权阻塞：上收会让深色档在 FP-12 未授权 / 禁止触碰的文件里由"塌陷值"变成"设计值"，属改变既有视觉，
 *   须由主代理连同 FP-11 深色复取证一并裁决。
 * - 零消费者疑死令牌：全库无人引用，上收零风险，但更干净的下场是删除，删除须主代理确认。
 * 账本只允许缩短；新增任何单侧声明令牌都会红。
 */
const 塌陷豁免: 豁免项[] = [
  { 令牌: '--yuanjiao-da', 类别: '越权阻塞', 理由: 'global.css 之外还有 聊天页面.vue（禁止触碰）消费；上收使深色档圆角 0→16px' },
  { 令牌: '--yuanjiao-zhong', 类别: '越权阻塞', 理由: 'global.css 之外还有 聊天页面.vue（禁止触碰）/通话界面.vue 消费；上收使深色档 0→12px' },
  { 令牌: '--yuanjiao-xiao', 类别: '越权阻塞', 理由: 'global.css 之外还有 聊天页面.vue（禁止触碰）9 处消费；上收使深色档 0→8px' },
  { 令牌: '--anquan-quyu-shang', 类别: '越权阻塞', 理由: 'App.vue/全局菜单.vue/通话界面.vue 用它拼 calc(52px + var(...))，深色档整条失效→height:auto；跨文件行为变更' },
  { 令牌: '--anquan-quyu-xia', 类别: '越权阻塞', 理由: '消费者含 好友聊天.vue/聊天页面.vue（禁止触碰）的 padding-bottom calc 式' },
  { 令牌: '--nuanhui-lan', 类别: '越权阻塞', 理由: '品牌暖灰蓝，10 个文件消费（含 资料设置向导.vue 的 FP-03 已交付 rgb 取证、挑战主页/主页内容/添加微信 渐变底色），深色档现为 IACVT 透明' },
  { 令牌: '--roufen-zi', 类别: '越权阻塞', 理由: '品牌柔粉紫，与 --nuanhui-lan 同组渐变，深色档现为 IACVT 透明' },
  { 令牌: '--anquan-quyu-zuo', 类别: '零消费者疑死令牌', 理由: '全库（含 e2e/backend/docs）零引用；建议随族删除，或随 shang/xia 一并裁决' },
  { 令牌: '--anquan-quyu-you', 类别: '零消费者疑死令牌', 理由: '全库零引用；同上' },
  { 令牌: '--nuanhui-lan-qian', 类别: '零消费者疑死令牌', 理由: '全库零引用；基色 --nuanhui-lan 仍在越权阻塞档，不单独上收以免家族错位' },
  { 令牌: '--nuanhui-lan-shen', 类别: '零消费者疑死令牌', 理由: '全库零引用；同上（--jujiao-huan-yanse 是另写的同值字面量，不构成消费者）' },
  { 令牌: '--roufen-zi-qian', 类别: '零消费者疑死令牌', 理由: '全库零引用；同上' },
  { 令牌: '--roufen-zi-shen', 类别: '零消费者疑死令牌', 理由: '全库零引用；同上' },
]

const 豁免令牌名 = 塌陷豁免.map((项) => 项.令牌).sort()

/** 尺度/缓动令牌族：与主题无关，唯一合法住所是共用 :root 块 */
const 共用块专属令牌 = [
  '--jiange-da',
  '--jiange-zhong',
  '--jiange-xiao',
  '--ziti-da',
  '--ziti-zhong',
  '--ziti-xiao',
  '--quxian-biao-zhun',
  '--quxian-tan-chu',
  '--quxian-ruan',
  '--quxian-huan-ying',
]

/** 上收前 light 档实测值，钉住"上收不得改数值" */
const 尺度真源取值: Record<string, string> = {
  '--jiange-da': '24px',
  '--jiange-zhong': '16px',
  '--jiange-xiao': '8px',
  '--ziti-da': '18px',
  '--ziti-zhong': '14px',
  '--ziti-xiao': '12px',
  '--quxian-biao-zhun': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--quxian-tan-chu': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--quxian-ruan': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  '--quxian-huan-ying': 'cubic-bezier(0.22, 1, 0.36, 1)',
}

/** FP-02 那类"绕真源同值兜底"补丁账本（越权文件，已登记待清理；新增即红） */
const 同值兜底待清理 = [
  'src/App.vue|--shi-jiao-kou-gao-du|1',
  'src/components/空态.vue|--liaotian-beijing|2',
]

/** FP-12 授权文件里仍在引用单侧令牌的位置（越权阻塞豁免的直接后果，随主代理裁决归零） */
const 授权内塌陷引用账本 = [
  'src/styles/global.css|--nuanhui-lan|2',
  'src/styles/global.css|--yuanjiao-da|1',
  'src/styles/global.css|--yuanjiao-xiao|1',
  'src/styles/global.css|--yuanjiao-zhong|2',
].sort()

/** variables.css 之外局部重声明全局令牌 = 第二真源。账本只允许缩短、不得陈化：
 *  FP-04 的那处 `过往战绩.vue|--quxian-huan-ying`（自陈"待令牌上收为全局后可删"）已由
 *  FP-04b 于 FP-12 上收完成后删除，现归零；再出现任何一条即红。 */
const 第二真源待删账本: string[] = []

function 遍历源文件(dir: string, 累加: string[] = []): string[] {
  for (const 项 of readdirSync(dir, { withFileTypes: true })) {
    const 全路径 = join(dir, 项.name)
    if (项.isDirectory()) {
      if (项.name === '__tests__' || 项.name === 'node_modules') continue
      遍历源文件(全路径, 累加)
    } else if (/\.(css|vue|ts)$/.test(项.name)) {
      累加.push(全路径)
    }
  }
  return 累加
}

const 全部源文件 = 遍历源文件(源码根)

function 相对(全路径: string): string {
  return 'src/' + 全路径.slice(源码根.length + 1).replace(/\\/g, '/')
}

function 消费者文件(令牌: string): string[] {
  const 正则 = new RegExp(`var\\(\\s*${令牌.replace(/-/g, '\\-') }\\s*[,)]`)
  return 全部源文件
    .filter((文件) => 相对(文件) !== 'src/styles/variables.css')
    .filter((文件) => 正则.test(readFileSync(文件, 'utf8')))
    .map(相对)
    .sort()
}

/** variables.css 之外把全局令牌又声明一遍的位置（第二真源） */
function 第二真源位置(): string[] {
  const 令牌表 = new Set(所有声明令牌(块们))
  const 命中: string[] = []
  for (const 文件 of 全部源文件) {
    if (相对(文件) === 'src/styles/variables.css') continue
    const 计数 = new Map<string, number>()
    for (const 匹配 of readFileSync(文件, 'utf8').matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) {
      if (令牌表.has(匹配[1])) 计数.set(匹配[1], (计数.get(匹配[1]) ?? 0) + 1)
    }
    for (const [令牌, 次数] of 计数) 命中.push(`${相对(文件)}|${令牌}|${次数}`)
  }
  return 命中.sort()
}

function 同值兜底补丁(): string[] {
  const 命中: string[] = []
  for (const 文件 of 全部源文件) {
    const 源码 = readFileSync(文件, 'utf8')
    const 计数 = new Map<string, number>()
    for (const 匹配 of 源码.matchAll(/var\(\s*(--[a-z0-9-]+)\s*,\s*([^)]+)\)/g)) {
      const [, 令牌, 兜底] = 匹配
      const 浅值 = 浅色解析.get(令牌)
      const 深值 = 深色解析.get(令牌)
      if (浅值 === undefined || 深值 === undefined) continue
      const 归一 = (值: string) => 值.replace(/\s+/g, '')
      if (归一(兜底) === 归一(浅值) || 归一(兜底) === 归一(深值)) {
        计数.set(令牌, (计数.get(令牌) ?? 0) + 1)
      }
    }
    for (const [令牌, 次数] of 计数) 命中.push(`${相对(文件)}|${令牌}|${次数}`)
  }
  return 命中.sort()
}

describe('FP-12 设计令牌成对性全站审计', () => {
  it('variables.css 仍是三段式主题块，选择器未被私改（防另开第四块绕审计）', () => {
    expect(块们.map((块) => 块.选择器)).toEqual([
      ':root',
      ':root[data-theme="light"]',
      ':root, :root[data-theme="dark"]',
    ])
  })

  it('单侧声明（另一档塌陷）令牌数 = 豁免账本，且不新增不陈化', () => {
    const 塌陷 = 塌陷令牌清单(块们).sort()
    expect(塌陷, `新增未登记的同族塌陷令牌：${塌陷.filter((名) => !豁免令牌名.includes(名))}`).toEqual(
      豁免令牌名,
    )
    expect(塌陷.length).toBe(塌陷豁免.length)
    for (const 项 of 塌陷豁免) {
      expect(项.理由.trim(), `${项.令牌} 缺豁免理由`).not.toBe('')
      expect(声明位置(项.令牌, 块们).共用, `${项.令牌} 已上收到共用块，须从豁免账本删除`).toBe(false)
    }
  })

  it('浅色档不存在未定义令牌（深色块自带裸 :root，塌陷只可能来自 light-only）', () => {
    const 全声明 = [...new Set(块们.flatMap((块) => [...块.声明.keys()]))]
    expect(全声明.filter((名) => !浅色解析.has(名))).toEqual([])
  })

  it('豁免账本分类自证：越权阻塞必须有授权外消费者，疑死令牌必须真的零消费者', () => {
    for (const 项 of 塌陷豁免) {
      const 消费者 = 消费者文件(项.令牌)
      const 授权外 = 消费者.filter((文件) => !授权文件.some((授权) => 文件 === `src/${授权}`))
      if (项.类别 === '越权阻塞') {
        expect(授权外.length, `${项.令牌} 的消费者全在 FP-12 授权文件内 → 无据豁免，必须上收`).toBeGreaterThan(0)
      } else {
        expect(消费者, `${项.令牌} 已出现消费者，须改判类别或直接上收`).toEqual([])
      }
    }
  })

  it('尺度/缓动令牌只住在共用 :root 块，深浅两档解析逐值相等且等于 light 历史值', () => {
    for (const 令牌 of 共用块专属令牌) {
      const 位置 = 声明位置(令牌, 块们)
      expect(位置, `${令牌} 只能声明一次且在共用 :root 块`).toEqual({ 共用: true, 浅色: false, 深色: false })
      const 浅值 = 浅色解析.get(令牌)
      const 深值 = 深色解析.get(令牌)
      expect(深值, `${令牌} 深色档未定义（塌陷）`).toBeDefined()
      expect(`${令牌}:${深值}`, `${令牌} 深浅两档取值不等`).toBe(`${令牌}:${浅值}`)
      expect(浅值, `${令牌} 上收时数值被改动`).toBe(尺度真源取值[令牌])
    }
  })

  it('FP-12 授权文件内引用单侧令牌的位置被冻结成账本（不得新增，随裁决缩短）', () => {
    const 实际: string[] = []
    for (const 授权 of 授权文件) {
      if (授权 === 'styles/variables.css') continue
      const 源码 = readFileSync(join(源码根, 授权), 'utf8')
      const 计数 = new Map<string, number>()
      for (const 匹配 of 源码.matchAll(/var\(\s*(--[a-z0-9-]+)\s*[,)]/g)) {
        const 令牌 = 匹配[1]
        if (!浅色解析.has(令牌) && !深色解析.has(令牌)) continue
        if (!浅色解析.has(令牌) || !深色解析.has(令牌)) {
          计数.set(令牌, (计数.get(令牌) ?? 0) + 1)
        }
      }
      for (const [令牌, 次数] of 计数) 实际.push(`src/${授权}|${令牌}|${次数}`)
    }
    expect(实际.sort(), '授权文件内的单侧令牌引用发生变化，请同步豁免账本与主代理裁决').toEqual(
      授权内塌陷引用账本,
    )
  })

  it('豁免账本未在 variables.css 内留下活的中转消费者（豁免不会把塌陷继续传染下去）', () => {
    const 被豁免令牌 = new Set(豁免令牌名)
    const 中转声明 = 块们
      .filter((块) => 块.选择器 !== ':root')
      .flatMap((块) => [...块.声明].filter(([, 值]) => 值.includes('var(')))
    for (const [令牌, 值] of 中转声明) {
      const 引用了豁免 = [...值.matchAll(/var\(\s*(--[a-z0-9-]+)\s*[,)]/g)].some(
        (匹配) => 被豁免令牌.has(匹配[1]),
      )
      if (引用了豁免) expect(消费者文件(令牌), `${令牌} 中转了豁免令牌且有活消费者，须一并上收`).toEqual([])
    }
  })

  it('全库零同值兜底补丁（FP-02 那类绕真源的 var(--x, 同值) 不得再出现，越权者进账本）', () => {
    expect(同值兜底补丁()).toEqual(同值兜底待清理)
  })

  it('全库不存在 variables.css 之外重声明全局令牌的第二真源（账本已归零）', () => {
    expect(第二真源位置()).toEqual(第二真源待删账本)
  })

  it('FP-12 授权文件内 --jiange-*/--ziti-* 引用一律裸用真源，无兜底', () => {
    const 残留: string[] = []
    for (const 授权 of 授权文件) {
      const 源码 = readFileSync(join(源码根, 授权), 'utf8')
      for (const 匹配 of 源码.matchAll(/var\(\s*(--(?:jiange|ziti)-[a-z-]+)\s*,/g)) {
        残留.push(`${授权} → ${匹配[1]}`)
      }
    }
    expect(残留).toEqual([])
  })
})
