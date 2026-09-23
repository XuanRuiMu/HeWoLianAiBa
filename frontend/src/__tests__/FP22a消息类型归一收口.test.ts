import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 使用聊天仓库 } from '@/stores/聊天'
import { huoQuXiaoXi } from '@/api/聊天'
import { MEI_TI_XIAO_XI_LEI_XING } from '@/config/消息配置'
import { guiYiXiaoXiLeiXing } from '@/utils/消息内容块'
import type { 消息 } from '@/types'

/**
 * FP-22a（审计 B1 致命）消息类型归一的**调用点**守门测试。
 *
 * 缺陷本体：`stores/聊天.ts` 的 `jiaRuXiaoXi` 注释自称「读取边界唯一归一点」，而
 * `jiaZaiXiaoXi`（首屏快照）与 `jiaZaiGengDuoXiaoXi`（上拉加载更早）这两条同样消费
 * 服务端 `lie_biao` 的路径是「拿到列表后整体赋值 `xiaoXiLieBiao.value`」，整体绕过了归一。
 * 后果：同一条历史行 `lei_xing = 'tupian'`（types 已删除的非法成员，早期脏行确有此形态）
 * 经 socket 单条推送是图片气泡，经列表加载则落到 `views/聊天页面.vue:121/141/151/233`
 * 那几条 `=== 'tuPian' / 'biaoQingBao' / 'yuYin' / 'wenJian'` 分支之外，渲染成空气泡/错图标。
 *
 * 为什么 `FP10b图文混排.test.ts:540-566` 拦不住本缺陷（它没错，只是不够）：那条断言数的是
 * 「每个出口在前端 src 内有几处 `function` 定义」，属**定义点**断言。而本缺陷存在期间
 * `guiYiXiaoXiLeiXing` 全库恰好只有一处定义、也只有一处调用 —— 定义点断言一直是绿的。
 * 它度量的是「有没有人抄了第二份实现」，压根不看「该调的地方调没调」。故本文件只补
 * **调用点**口径，与前者互补：
 *  ①行为断言：真跑 `jiaZaiXiaoXi` / `jiaZaiGengDuoXiaoXi`，喂脏 `lei_xing` 的服务端列表，
 *    断言落进 `xiaoXiLieBiao` 的每一条都已归一到权威值域（证明出口有效）；
 *  ②结构断言：穷尽 `stores/聊天.ts` 内所有对 `xiaoXiLieBiao.value` 的整表赋值语句，
 *    要求每条要么置空、要么经 `guiYiXiaoXiLieBiao`（证明没有第二条绕过的路，
 *    并拦住「下一个人再加一条整体赋值」——①对尚不存在的代码无能为力）。
 */

const 媒体权威值域: readonly string[] = MEI_TI_XIAO_XI_LEI_XING

/**
 * 脏值 → 权威值。前五组是 `guiYiXiaoXiLeiXing` 的四个改写分支在历史数据里的误写形态
 * （小写媒体类别、全大写、带空白），后两组是本来就该原样通行的文本域值——归一不得改坏它们。
 */
const 脏值清单: ReadonlyArray<readonly [脏值: string, 期望: string]> = [
  ['tupian', 'tuPian'],
  ['TUPIAN', 'tuPian'],
  [' biaoqingbao ', 'biaoQingBao'],
  ['yuyin', 'yuYin'],
  ['WENJIAN', 'wenJian'],
  ['wenben', 'wenben'],
  ['neiXinHuoDong', 'neiXinHuoDong'],
]

/** 服务端下发的行（`lie_biao` 序为「新 → 旧」，时间戳随序号递减以对齐该口径） */
function 服务端行(序号: number, 脏类型: unknown): 消息 {
  return {
    id: `m-${序号}`,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: `第${序号}条`,
    lei_xing: 脏类型 as 消息['lei_xing'],
    shi_jian_chuo: 1700000000000 - 序号,
    yi_du: false,
  }
}

/** 调用点断言的核心口径：列表里不允许存在「还没归一到不动点」的类型码 */
function 断言整表已归一(列表: readonly 消息[], 说明: string) {
  for (const 项 of 列表) {
    const 说明句 = `${说明}（${项.id}）`
    expect(typeof 项.lei_xing, `${说明句}：进入 xiaoXiLieBiao 的类型必须是字符串`).toBe('string')
    // types 已删除的非法成员，也是「空气泡」的直接成因，一条都不许留
    expect(项.lei_xing, `${说明句}：误写的 'tupian' 未被收回`).not.toBe('tupian')
    expect(
      guiYiXiaoXiLeiXing(项.lei_xing),
      `${说明句}：列表里的 ${JSON.stringify(项.lei_xing)} 不是归一函数的不动点 ⇒ 它绕过了归一出口`,
    ).toBe(项.lei_xing)
    // 模板按 `=== 'tuPian'` 这类权威值分支渲染：本该是媒体气泡的行必须落在权威媒体值域内
    if (媒体权威值域.includes(guiYiXiaoXiLeiXing(项.lei_xing))) {
      expect(媒体权威值域, `${说明句}：媒体行不在权威媒体值域内，会渲染成空气泡`).toContain(项.lei_xing)
    }
  }
}

let 聊天仓库: ReturnType<typeof 使用聊天仓库>
let 分页: Record<number, { lie_biao: 消息[]; hai_you_geng_duo: boolean }>

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn(async () => ({ lie_biao: [], zong_shu: 0 })),
  faSongXiaoXi: vi.fn(),
  shangChuanMeiTi: vi.fn(),
  DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE: {
    tuPian: 'image',
    biaoQingBao: 'sticker',
    yuYin: 'audio',
    wenJian: 'file',
  },
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  huoQuJiaoSeXiangQing: vi.fn(async () => ({ jiao_se: null, dang_an_zhuang_tai: null })),
  qingQiuShengTu: vi.fn(),
  qingQiuShengChengShiPin: vi.fn(),
}))

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn(async () => ({ lie_biao: [], wei_du_shu: 0 })),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('@/utils/埋点', () => ({ track: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  聊天仓库 = 使用聊天仓库()
  分页 = {}
  vi.mocked(huoQuXiaoXi).mockImplementation(async (_huiHuaId, yeMa) => {
    const 页 = 分页[yeMa ?? 1]
    if (!页) return { lie_biao: [], zong_shu: 0, hai_you_geng_duo: false }
    return {
      lie_biao: 页.lie_biao,
      zong_shu: 页.lie_biao.length,
      hai_you_geng_duo: 页.hai_you_geng_duo,
    }
  })
})

describe('FP-22a 调用点：服务端列表进入 xiaoXiLieBiao 必须已归一', () => {
  it('首屏快照 jiaZaiXiaoXi：脏 lei_xing 的整表列表逐条收回权威值域', async () => {
    // 服务端下发序「新 → 旧」= m-1 … m-7；前端 reverse 成时间升序 ⇒ 列表序 = 脏值清单倒序
    分页[1] = {
      lie_biao: 脏值清单.map(([脏值, _期望], i) => 服务端行(i + 1, 脏值)),
      hai_you_geng_duo: false,
    }

    await 聊天仓库.jiaZaiXiaoXi('h1')

    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(脏值清单.length)
    断言整表已归一(聊天仓库.xiaoXiLieBiao, '首屏快照')
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.lei_xing)).toEqual(
      [...脏值清单].reverse().map(([_脏值, 期望]) => 期望),
    )
    // 归一只改 lei_xing，不改身份也不重排：整体赋值语义与改前逐字一致
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(
      脏值清单.map((_x, i) => `m-${脏值清单.length - i}`),
    )
  })

  it('上拉加载 jiaZaiGengDuoXiaoXi：更早页的脏列表 prepend 后整表仍在权威值域', async () => {
    分页[1] = { lie_biao: [服务端行(1, 'wenben')], hai_you_geng_duo: true }
    await 聊天仓库.jiaZaiXiaoXi('h1')
    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)

    分页[2] = {
      lie_biao: [服务端行(6, 'wenjian'), 服务端行(5, 'yuyin'), 服务端行(4, 'tupian')],
      hai_you_geng_duo: false,
    }
    const 成功 = await 聊天仓库.jiaZaiGengDuoXiaoXi()

    expect(成功).toBe(true)
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.lei_xing)).toEqual([
      'tuPian',
      'yuYin',
      'wenJian',
      'wenben',
    ])
    断言整表已归一(聊天仓库.xiaoXiLieBiao, '上拉加载')
  })

  it('列表路径与单条推送口径一致：同一批脏值经哪条路都归一到同一组权威值', async () => {
    const 投喂脏值 = 脏值清单.map(([脏值]) => 脏值)
    分页[1] = {
      lie_biao: 投喂脏值.map((脏值, i) => 服务端行(i + 1, 脏值)),
      hai_you_geng_duo: false,
    }
    await 聊天仓库.jiaZaiXiaoXi('h1')

    const 列表结果 = 聊天仓库.xiaoXiLieBiao.map((m) => m.lei_xing)
    // 单条推送（jiaRuXiaoXi）与整表加载共用同一份归一实现，二者对同一脏值必须给出同一答案；
    // 否则「同一条消息在两条路径下渲染成不同气泡」的原始缺陷就回来了。
    const 归一真源 = 投喂脏值.map((脏值) => guiYiXiaoXiLeiXing(脏值))
    expect([...列表结果].sort()).toEqual([...归一真源].sort())
  })
})

describe('FP-22a 结构守卫：不存在绕过归一出口的整表赋值', () => {
  const 仓库源 = readFileSync(resolve(__dirname, '../stores/聊天.ts'), 'utf-8')
  const 源行 = 仓库源.split(/\r?\n/)

  /** 收集所有对 `xiaoXiLieBiao.value` 的整表赋值（`[index] =`、`.push`、`.splice` 不在此列） */
  function 整表赋值语句(): Array<{ 行号: number; 语句: string }> {
    const 结果: Array<{ 行号: number; 语句: string }> = []
    源行.forEach((行, 下标) => {
      const 命中 = /^\s*xiaoXiLieBiao\.value\s*=\s*(.*)$/.exec(行)
      if (!命中) return
      // 置空重置（`= []`）不含任何服务端类型码，不构成绕过
      if (命中[1].trimStart().startsWith('[]')) return
      // 赋值表达式可折行，取 6 行窗口兜住跨行实参
      结果.push({ 行号: 下标 + 1, 语句: 源行.slice(下标, 下标 + 6).join('\n') })
    })
    return 结果
  }

  it('每条整表赋值都经 guiYiXiaoXiLieBiao 出口', () => {
    const 语句们 = 整表赋值语句()
    // 先确认这道守卫真有东西可查（首屏 + 上拉两条路径），避免守卫自己退化成空断言
    expect(语句们.length).toBeGreaterThanOrEqual(2)
    const 绕过的 = 语句们.filter((项) => !/guiYiXiaoXiLieBiao\s*\(/.test(项.语句))
    expect(
      绕过的.map((项) => `第 ${项.行号} 行：${项.语句.split('\n')[0].trim()}`),
      '发现绕过归一出口的整表赋值：服务端裸 lei_xing 会直达模板分支',
    ).toEqual([])
  })

  it('归一实现只有一份，整表出口逐条委托单条出口（不留第二份镜像逻辑）', () => {
    expect(仓库源.match(/^\s*function guiYiDanTiaoLeiXing\b/gm) ?? []).toHaveLength(1)
    expect(仓库源).toMatch(/function guiYiXiaoXiLieBiao[\s\S]{0,220}?guiYiDanTiaoLeiXing\(/)
    // 真正调归一函数的地方全库只此一处：单条归一，整表靠委托而非各写一遍
    expect(仓库源.match(/guiYiXiaoXiLeiXing\(/g) ?? []).toHaveLength(1)
  })

  it('「唯一归一点 / 所有路径都经此处」的假注释已更正（注释不得声称代码没做到的事）', () => {
    expect(仓库源).not.toMatch(/唯一归一点/)
    expect(仓库源).not.toMatch(/所有进入 xiaoXiLieBiao 的路径都经此处/)
  })
})
