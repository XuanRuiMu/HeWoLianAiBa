import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fanYi, huoQuFanYiMiaoShu } from '../../config/translations'
import { fengJinTongZhiZhengWen, jiSuanZhangHaoFengJinShiChang } from '../账号封禁'

/**
 * L-44（[P0] 翻译文件优先）收口守卫：玩家可见通知文案的唯一真源是 config/translations.ts。
 * ① 源码扫描：chuangJianTongZhi 的 biao_ti/nei_rong 不得再出现中文字面量（两个文件 + 全后端）
 * ② 渲染等价：封禁通知 3 级别 × 有/无解封时间共 6 组合，整句与迁移前逐字相同
 * ③ 键存在性：新键都在 fanYi 里、非空串，且内容一字未改
 */

const 源码根 = resolve(__dirname, '../..')
const 业务文件: ReadonlyArray<readonly [string, string]> = [
  ['services', '账号封禁.ts'],
  ['routes', '好友.ts'],
]

function 读源(目录: string, 文件: string): string {
  return readFileSync(resolve(源码根, 目录, 文件), 'utf-8')
}

/** 按括号深度抽出每个 函数名( 调用的实参片段；字符串内的括号不参与配对 */
function 抽调用体(源: string, 函数名: string): string[] {
  const 结果: string[] = []
  let 游标 = 0
  for (;;) {
    const 起点 = 源.indexOf(`${函数名}(`, 游标)
    if (起点 < 0) return 结果
    let 深度 = 0
    let i = 起点 + 函数名.length
    for (; i < 源.length; i++) {
      const 字 = 源[i]
      if (字 === '(') 深度 += 1
      else if (字 === ')') {
        深度 -= 1
        if (深度 === 0) break
      } else if (字 === "'" || 字 === '"' || 字 === '`') {
        const 结束 = 源.indexOf(字, i + 1)
        if (结束 > 0) i = 结束
      }
    }
    结果.push(源.slice(起点, i + 1))
    游标 = i + 1
  }
}

function 遍历TS(目录: string, 收集: string[] = []): string[] {
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 完整 = resolve(目录, 项.name)
    if (项.isDirectory()) {
      if (项.name === '__tests__' || 项.name === 'node_modules' || 项.name === 'dist') continue
      遍历TS(完整, 收集)
    } else if (项.name.endsWith('.ts')) {
      收集.push(完整)
    }
  }
  return 收集
}

/** 本环境 V8（Node 26）不支持 \p{Han} 简写，必须写全称 \p{Script=Han} */
const 中文 = '\\p{Script=Han}'
const 中文字面量 = new RegExp(`['"\`][^'"\`\\n]*${中文}[^'"\`\\n]*['"\`]`, 'u')
const 翻译取值 = /^(?:huoQuFanYi\('tongZhi',\s*'\w+'\)|fengJinTongZhiZhengWen\(|neiRong\.slice\(0, 50\) \|\| huoQuFanYi\('tongZhi',\s*'\w+'\))/

const 通知文案键: ReadonlyArray<readonly ['tongZhi' | 'fengJinJiBie', string, string]> = [
  ['tongZhi', 'zhangHaoShouXianBiaoTi', '账号受限通知'],
  [
    'tongZhi',
    'zhangHaoShouXianZhengWen',
    '你发送的内容违规已被撤回，这是第{ciShu}次违规，账号{jiBie}{jieFengZhui}。如有异议可在账号与安全页申诉。',
  ],
  ['tongZhi', 'jieFengShiJianZhui', '，解封时间{shiJian}'],
  ['tongZhi', 'shenSuJieGuoBiaoTi', '申诉结果通知'],
  ['tongZhi', 'shenSuTongGuoZhengWen', '你的申诉已通过，账号已恢复正常，历史违规记录已清除。'],
  ['tongZhi', 'shenSuBoHuiZhengWen', '你的申诉未通过，账号限制继续生效。如仍有异议请联系客服。'],
  ['tongZhi', 'zhangHaoHuiFuBiaoTi', '账号恢复通知'],
  ['tongZhi', 'zhangHaoHuiFuZhengWen', '管理员已解除你的账号限制，但历史违规次数保留，再次违规将升级处罚。'],
  ['tongZhi', 'xinHaoYouShenQingBiaoTi', '新的好友申请'],
  ['tongZhi', 'xinHaoYouShenQingZhengWen', '有人请求添加你为好友，请前往好友列表确认'],
  ['tongZhi', 'xinHaoYouXiaoXiBiaoTi', '新的好友消息'],
  ['tongZhi', 'xinHaoYouXiaoXiFallback', '你收到一条新的好友消息'],
  ['fengJinJiBie', 'zheng_chang', '正常'],
  ['fengJinJiBie', 'feng_jin_1_fen', '封禁1分钟'],
  ['fengJinJiBie', 'feng_jin_1_tian', '封禁1天'],
  ['fengJinJiBie', 'yong_feng', '封禁30天'],
]

describe('通知文案同源：源码扫描钉死 chuangJianTongZhi 不再携带中文字面量', () => {
  for (const [目录, 文件] of 业务文件) {
    it(`${目录}/${文件} 的每个 chuangJianTongZhi 调用体都无中文字面量`, () => {
      const 调用体 = 抽调用体(读源(目录, 文件), 'chuangJianTongZhi')
      // 先钉「扫到了真实调用」，否则改名即可让本用例假绿
      expect(调用体.length, `${目录}/${文件} 未扫到 chuangJianTongZhi 调用`).toBeGreaterThan(0)
      for (const 体 of 调用体) {
        expect(中文字面量.test(体), `硬编码文案：${体}`).toBe(false)
      }
    })

    it(`${目录}/${文件} 的 biao_ti/nei_rong 取值只来自翻译文件`, () => {
      for (const 体 of 抽调用体(读源(目录, 文件), 'chuangJianTongZhi')) {
        for (const 字段 of ['biao_ti', 'nei_rong']) {
          const 取值 = new RegExp(`${字段}\\s*:\\s*([^\\n]*)`).exec(体)
          expect(取值, `调用体缺 ${字段}：${体}`).toBeTruthy()
          expect(翻译取值.test(取值![1].trim()), `${字段} 取值未走翻译：${取值![1]}`).toBe(true)
        }
      }
    })
  }

  it('封禁通知正文由单一纯函数渲染，业务侧不做中文字符串拼接', () => {
    const 源 = 读源('services', '账号封禁.ts')
    expect(源).toContain('nei_rong: fengJinTongZhiZhengWen(ciShu, jiBie, jieFengShiJian)')
    expect(源).not.toMatch(/`[^`\n]*\p{Script=Han}[^`\n]*\$\{/u)
    expect(源).not.toContain("'，解封时间")
  })

  it('全后端 chuangJianTongZhi 出现点清单固定，且每个调用体都无中文字面量', () => {
    const 出现文件: string[] = []
    const 硬编码: string[] = []
    for (const 文件 of 遍历TS(源码根)) {
      const 源 = readFileSync(文件, 'utf-8')
      if (!源.includes('chuangJianTongZhi(')) continue
      const 相对 = 文件.slice(源码根.length + 1).replace(/\\/g, '/')
      出现文件.push(相对)
      for (const 体 of 抽调用体(源, 'chuangJianTongZhi')) {
        if (中文字面量.test(体)) 硬编码.push(`${相对} :: ${体}`)
      }
    }
    expect(硬编码).toEqual([])
    expect(出现文件.sort()).toEqual(
      ['routes/好友.ts', 'services/通知.ts', 'services/账号封禁.ts'].sort(),
    )
  })
})

describe('通知文案同源：封禁通知整句与迁移前逐字相同（渲染等价）', () => {
  // 时间文本仍用迁移前同一个 toLocaleString('zh-CN') 表达式取，句子骨架逐字硬编码在期望值里
  const 解封时间 = new Date(2026, 0, 2, 8, 0, 0, 0)
  const 时间文本 = 解封时间.toLocaleString('zh-CN')

  const 组合: ReadonlyArray<readonly [number, 'feng_jin_1_fen' | 'feng_jin_1_tian' | 'yong_feng', string]> = [
    [1, 'feng_jin_1_fen', '封禁1分钟'],
    [2, 'feng_jin_1_tian', '封禁1天'],
    [4, 'yong_feng', '封禁30天'],
  ]

  for (const [ciShu, jiBie, 级别文案] of 组合) {
    it(`第${ciShu}次违规 / ${级别文案} / 无解封时间`, () => {
      expect(fengJinTongZhiZhengWen(ciShu, jiBie, null)).toBe(
        `你发送的内容违规已被撤回，这是第${ciShu}次违规，账号${级别文案}。如有异议可在账号与安全页申诉。`,
      )
    })
    it(`第${ciShu}次违规 / ${级别文案} / 带解封时间`, () => {
      expect(fengJinTongZhiZhengWen(ciShu, jiBie, 解封时间)).toBe(
        `你发送的内容违规已被撤回，这是第${ciShu}次违规，账号${级别文案}，解封时间${时间文本}。如有异议可在账号与安全页申诉。`,
      )
    })
  }

  it('正常级别文案同源于 fengJinJiBie 段', () => {
    expect(fengJinTongZhiZhengWen(1, 'zheng_chang', null)).toBe(
      '你发送的内容违规已被撤回，这是第1次违规，账号正常。如有异议可在账号与安全页申诉。',
    )
  })

  it('占位符渲染器只替换给定键，未给值时原样保留', () => {
    expect(huoQuFanYiMiaoShu('tongZhi', 'jieFengShiJianZhui', { shiJian: 'X' })).toBe('，解封时间X')
    expect(huoQuFanYiMiaoShu('tongZhi', 'jieFengShiJianZhui', {})).toBe('，解封时间{shiJian}')
  })
})

describe('通知文案同源：新键存在、非空、内容一字未改', () => {
  for (const [分类, 键, 迁移前文案] of 通知文案键) {
    it(`${分类}.${键} 存在且等于迁移前文案`, () => {
      const 值 = (fanYi[分类] as Record<string, string>)[键]
      expect(值, `缺失键 ${分类}.${键}`).toBeTypeOf('string')
      expect(值.length).toBeGreaterThan(0)
      expect(值).toBe(迁移前文案)
    })
  }

  it('两个业务文件用到的 tongZhi 键都在 fanYi 里（不靠猜键名）', () => {
    const 用到的键 = new Set<string>()
    for (const [目录, 文件] of 业务文件) {
      for (const 匹配 of 读源(目录, 文件).matchAll(/huoQuFanYi(?:MiaoShu)?\(\s*'tongZhi'\s*,\s*'(\w+)'/g)) {
        用到的键.add(匹配[1])
      }
    }
    expect(用到的键.size).toBeGreaterThanOrEqual(10)
    for (const 键 of 用到的键) {
      const 值 = (fanYi.tongZhi as Record<string, string>)[键]
      expect(值, `缺失键 tongZhi.${键}`).toBeTypeOf('string')
      expect(值.length).toBeGreaterThan(0)
    }
  })
})

describe('封禁通知的时长陈述与 jiSuanZhangHaoFengJinShiChang 同源', () => {
  const 分 = 60 * 1000
  const 天 = 24 * 60 * 60 * 1000

  /** 测试侧独立换算：真实毫秒 → 「封禁N天/N分钟」，与实现各算各的，漂移必红灯 */
  function 真实时长文案(haoMiao: number): string {
    return haoMiao % 天 === 0 ? `封禁${haoMiao / 天}天` : `封禁${haoMiao / 分}分钟`
  }

  // 与 账号封禁.ts 的定级口径一致（第3次起即 yong_feng），本用例只测文案，不测定级
  const 各级别: Array<[number, 'feng_jin_1_fen' | 'feng_jin_1_tian' | 'yong_feng']> = [
    [1, 'feng_jin_1_fen'],
    [2, 'feng_jin_1_tian'],
    [3, 'yong_feng'],
    [4, 'yong_feng'],
    [5, 'yong_feng'],
  ]

  for (const [ciShu, jiBie] of 各级别) {
    it(`第${ciShu}次违规的整句时长 == 真实毫秒数（级别枚举不参与生成）`, () => {
      const haoMiao = jiSuanZhangHaoFengJinShiChang(ciShu)
      expect(haoMiao, `第${ciShu}次违规算不出时长`).toBeTypeOf('number')
      const 时长 = 真实时长文案(haoMiao!)

      const 正文 = fengJinTongZhiZhengWen(ciShu, jiBie, null)
      expect(正文).toBe(
        `你发送的内容违规已被撤回，这是第${ciShu}次违规，账号${时长}。如有异议可在账号与安全页申诉。`,
      )
      expect(正文).toContain(`账号${时长}`)
      expect(正文).not.toContain('{')
      // 时长陈述只随 ciShu（真实毫秒）变，换掉级别枚举也必须同一句 —— 钉「不再拿 jiBie 生成时长」
      for (const 别的级别 of ['feng_jin_1_fen', 'feng_jin_1_tian', 'yong_feng'] as const) {
        if (别的级别 === jiBie) continue
        expect(fengJinTongZhiZhengWen(ciShu, 别的级别, null), `级别 ${别的级别} 仍在左右时长陈述`).toBe(
          正文,
        )
      }
    })
  }

  it('第3次违规说7天、第4次说30天（缺陷原貌：第3次曾被说成30天）', () => {
    expect(fengJinTongZhiZhengWen(3, 'yong_feng', null)).toContain('账号封禁7天')
    expect(fengJinTongZhiZhengWen(3, 'yong_feng', null)).not.toContain('30天')
    expect(fengJinTongZhiZhengWen(4, 'yong_feng', null)).toContain('账号封禁30天')
    expect(jiSuanZhangHaoFengJinShiChang(3)).toBe(7 * 天)
    expect(jiSuanZhangHaoFengJinShiChang(4)).toBe(30 * 天)
  })

  it('带解封时间时追加片段逐字未变，只有时长换成了同源值', () => {
    const 解封时间 = new Date(2026, 0, 9, 8, 0, 0, 0)
    expect(fengJinTongZhiZhengWen(3, 'yong_feng', 解封时间)).toBe(
      `你发送的内容违规已被撤回，这是第3次违规，账号封禁7天，解封时间${解封时间.toLocaleString('zh-CN')}。如有异议可在账号与安全页申诉。`,
    )
  })
})
