import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { 声明块清单, 所有声明令牌 } from './主题令牌真源'

// FP-20 切片 B：variables.css 零消费者令牌与幻影令牌的双向回归护栏。
// 口径（按任务示例而非括号反向文字）：幻影 = 剥注释后被 var( 引用、但全库（含 .vue 局部与运行时注入）
// 均无 `--x:` 定义的令牌；零消费者 = variables.css 有定义、但全库无 var( 引用的令牌。

const 源码根 = resolve(__dirname, '..')
const 前端根 = resolve(源码根, '..')

function 遍历(目录: string, 累加: string[] = []): string[] {
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 路径 = join(目录, 项.name)
    if (项.isDirectory()) {
      if (项.name === 'node_modules' || 项.name === 'dist') continue
      遍历(路径, 累加)
    } else if (/\.(css|vue|ts|js|html)$/.test(项.name)) {
      累加.push(路径)
    }
  }
  return 累加
}

function 剥注释(源: string): string {
  return 源
    .replace(/\/\*[\s\S]*?\*\//g, (块) => 块.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, (块) => 块.replace(/[^\n]/g, ' '))
}

function 相对(全路径: string): string {
  return 全路径.startsWith(源码根)
    ? 'src/' + 全路径.slice(源码根.length + 1).replace(/\\/g, '/')
    : 全路径.slice(前端根.length + 1).replace(/\\/g, '/')
}

const 源文件 = 遍历(源码根)
const 前端根文件 = readdirSync(前端根, { withFileTypes: true })
  .filter((项) => 项.isFile() && /\.(html|css|js|ts)$/.test(项.name))
  .map((项) => join(前端根, 项.name))
const 扫描文件 = [...源文件, ...前端根文件]

const 定义集 = new Set(所有声明令牌(声明块清单()))

const 全库定义集 = new Set(定义集)
for (const 文件 of 源文件) {
  const 剥 = 剥注释(readFileSync(文件, 'utf8'))
  for (const 匹配 of 剥.matchAll(/^\s*(--[A-Za-z0-9-]+)\s*:/gm)) 全库定义集.add(匹配[1])
}

const 引用集 = new Set<string>()
for (const 文件 of 扫描文件) {
  const 剥 = 剥注释(readFileSync(文件, 'utf8'))
  for (const 匹配 of 剥.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) 引用集.add(匹配[1])
}

const 零消费计算 = [...定义集].filter((名) => !引用集.has(名)).sort()
const 幻影计算 = [...引用集].filter((名) => !全库定义集.has(名)).sort()

/** 零消费白名单：无 var( 消费且无非 var( 消费路径，按共用块两档基准保留 */
const 零消费白名单: { 令牌: string; 理由: string }[] = [
  {
    令牌: '--quxian-ruan',
    理由:
      '共用 :root「尺度令牌与缓动曲线深浅两档恒等」基准族，量纲与主题档无关；零 var( 消费但由 FP-12 成对审计的共用块专属令牌与尺度真源取值钉住，非主题色对',
  },
]

/** 已知非 var( 消费者：var( 扫描为零，但经字符串令牌名 + getPropertyValue 真实消费 */
const 已知消费者: { 令牌: string; 理由: string; 位置: string[] }[] = [
  {
    令牌: '--jing-gao-se',
    理由:
      '消息配置.ts 的 liangGuangLingPai 登记令牌名字符串；引用气泡块.vue 经 getPropertyValue(该配置) 间接取运行时值（本文件无令牌字面量）',
    位置: ['src/config/消息配置.ts'],
  },
  {
    令牌: '--yanse-zhanji-qian',
    理由: '战报海报.ts 的 quLingPai(令牌名) → getComputedStyle(documentElement).getPropertyValue 取值绘制海报',
    位置: ['src/utils/战报海报.ts'],
  },
  {
    令牌: '--biao-qian-chenggong-wenben',
    理由: '战报海报.ts 胜利分支 zhuangTaiWenBen 令牌名字符串，同 quLingPai 消费链',
    位置: ['src/utils/战报海报.ts'],
  },
  {
    令牌: '--biao-qian-shibai-wenben',
    理由: '战报海报.ts 失败分支 zhuangTaiWenBen 令牌名字符串，同 quLingPai 消费链',
    位置: ['src/utils/战报海报.ts'],
  },
]

/** 幻影登记：被 var( 引用但全库无 `--x:` 定义（运行时注入或测试文案伪影） */
const 幻影登记: { 令牌: string; 理由: string }[] = [
  { 令牌: '--dingge-gao', 理由: '登录内容.vue 快照层 setProperty 按实测矩形运行时注入的四枚几何之一' },
  { 令牌: '--dingge-kuan', 理由: '同 --dingge-gao，运行时注入' },
  { 令牌: '--dingge-shang', 理由: '同 --dingge-gao，运行时注入' },
  { 令牌: '--dingge-zuo', 理由: '同 --dingge-gao，运行时注入' },
  {
    令牌: '--fu-chuang-biaoti-lan-gao',
    理由: 'use可拖动浮窗.ts 浮窗样式对象单向下发标题栏高，组件 CSS 只消费变量',
  },
  {
    令牌: '--gundong-tiao-',
    理由: 'FP01令牌基座.test.ts 断言文案 var(--gundong-tiao-*-cursor) 的正则伪影（* 非令牌名字符）',
  },
  {
    令牌: '--lizi-x',
    理由: 'global.css lizi-kuosan 关键帧引用，全库无定义亦无运行时注入（已登记待裁决，非本单清理对象）',
  },
  { 令牌: '--lizi-y', 理由: '同 --lizi-x，关键帧引用但全库无定义' },
  { 令牌: '--qipao-duiFang-beiJing', 理由: '气泡主题.ts 自定义气泡配色对象运行时注入' },
  { 令牌: '--qipao-duiFang-wenBen', 理由: '同 --qipao-duiFang-beiJing，运行时注入' },
  { 令牌: '--qipao-ziJi-beiJing', 理由: '同 --qipao-duiFang-beiJing，运行时注入' },
  { 令牌: '--qipao-ziJi-wenBen', 理由: '同 --qipao-duiFang-beiJing，运行时注入' },
  {
    令牌: '--x',
    理由: '主题令牌成对审计.test.ts 断言文案 var(--x, 同值) 的示例伪影，非真实引用',
  },
]

const 白名单令牌 = 零消费白名单.map((项) => 项.令牌)
const 已知消费令牌 = 已知消费者.map((项) => 项.令牌)
const 应零消费 = [...白名单令牌, ...已知消费令牌].sort()
const 幻影令牌 = 幻影登记.map((项) => 项.令牌).sort()

describe('FP-20 零消费者与幻影令牌双向账本', () => {
  it('variables.css 零消费者集合 = 白名单 ∪ 已知消费者，精确不增不减', () => {
    expect(
      零消费计算,
      `新增零消费者：${零消费计算.filter((名) => !应零消费.includes(名)).join(', ')}；` +
        `账本陈化：${应零消费.filter((名) => !零消费计算.includes(名)).join(', ')}`,
    ).toEqual(应零消费)
  })

  it('全库幻影集合 = 幻影登记，精确不增不减', () => {
    expect(
      幻影计算,
      `新增幻影：${幻影计算.filter((名) => !幻影令牌.includes(名)).join(', ')}；` +
        `账本陈化：${幻影令牌.filter((名) => !幻影计算.includes(名)).join(', ')}`,
    ).toEqual(幻影令牌)
  })

  it('三本账每条均带非空理由', () => {
    for (const 项 of 零消费白名单) expect(项.理由.trim(), `${项.令牌} 缺白名单理由`).not.toBe('')
    for (const 项 of 已知消费者) expect(项.理由.trim(), `${项.令牌} 缺已知消费者理由`).not.toBe('')
    for (const 项 of 幻影登记) expect(项.理由.trim(), `${项.令牌} 缺幻影理由`).not.toBe('')
  })

  it('白名单与已知消费者令牌仍在 variables.css 定义（定义侧删除即销账）', () => {
    for (const 令牌 of 应零消费) {
      expect(定义集.has(令牌), `${令牌} 已不在 variables.css，须从账本删除`).toBe(true)
    }
  })

  it('已知消费者的登记位置仍以原文包含该令牌字符串（消费链断开即销账）', () => {
    for (const 项 of 已知消费者) {
      for (const 位置 of 项.位置) {
        const 源 = readFileSync(join(前端根, 位置), 'utf8')
        expect(源.includes(项.令牌), `${位置} 不再包含 ${项.令牌}，须改判或删账`).toBe(true)
      }
    }
  })

  it('幻影登记令牌在全库仍无 `--x:` 定义（定义侧毕业即销账）', () => {
    for (const 令牌 of 幻影令牌) {
      expect(全库定义集.has(令牌), `${令牌} 已有定义，须从幻影登记删除`).toBe(false)
    }
  })

  it('零消费账本与幻影账本互不相交', () => {
    expect(应零消费.filter((名) => 幻影令牌.includes(名))).toEqual([])
  })
})
