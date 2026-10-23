import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用聊天仓库 } from '@/stores/聊天'
import { huoQuFanYi } from '@/config/翻译表'
import { huoQuXiaoXi, huoQuJiaoSeXiangQing } from '@/api/聊天'
import type { Xiaoxi } from '@/types/类型定义'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 读源 = (...路径段: string[]) => readFileSync(resolve(本目录, '..', ...路径段), 'utf8')

vi.mock('@/api/聊天')


const 撤回占位文案 = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
const AI隐藏原文 = 'AI 隐藏起来的内心修正原文'
const 内心行内容 = 'AI 内心活动 我并不想继续这个话题'
const 时间戳 = 1700000000000

function 消息(部分: Partial<Xiaoxi> & Pick<Xiaoxi, 'id' | 'nei_rong'>): Xiaoxi {
  return {
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    lei_xing: 'wenben',
    shi_jian_chuo: 时间戳,
    yi_du: true,
    ...部分,
  } as Xiaoxi
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(huoQuJiaoSeXiangQing).mockResolvedValue({ jiao_se: null, dang_an_zhuang_tai: null } as never)
})

describe('FP-22 收口后的响应形态在普通前端零行为变化', () => {
  it('收口口径（无该键、无内心行）下撤回气泡仍只显占位文案、深度思考列表不被旧内心行喂脏', async () => {
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: [
        消息({ id: 'x2', nei_rong: 撤回占位文案, yi_che_hui: true }),
        消息({ id: 'x1', nei_rong: '今天过得怎么样' }),
      ],
      zong_shu: 2,
    })
    const 仓库 = 使用聊天仓库()

    await 仓库.jiaZaiXiaoXi('h1')

    expect(仓库.xiaoXiLieBiao.map((项) => 项.id)).toEqual(['x1', 'x2'])
    expect(仓库.xiaoXiLieBiao[1].yi_che_hui).toBe(true)
    expect(仓库.xiaoXiLieBiao.every((项) => !('yuan_shi_nei_rong' in 项))).toBe(true)
    expect(仓库.shenDuSiKaoLieBiao).toEqual([])
  })

  it('管理口径（有该键、有内心行）下内心行照旧补进深度思考列表', async () => {
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: [
        消息({ id: 'x3', nei_rong: 内心行内容, lei_xing: 'neiXinHuoDong' }),
        消息({ id: 'x2', nei_rong: 撤回占位文案, yi_che_hui: true, yuan_shi_nei_rong: AI隐藏原文 }),
      ],
      zong_shu: 2,
    })
    const 仓库 = 使用聊天仓库()

    await 仓库.jiaZaiXiaoXi('h1')

    expect(仓库.xiaoXiLieBiao.map((项) => 项.id)).toEqual(['x2', 'x3'])
    expect(仓库.xiaoXiLieBiao[0].yuan_shi_nei_rong).toBe(AI隐藏原文)
    expect(仓库.shenDuSiKaoLieBiao).toEqual([
      { 来源: '历史消息', 内容: 内心行内容, 时间: 时间戳 },
    ])
  })
})

describe('FP-22 前端消费面清单（谁可以依赖运营字段、谁不可以）', () => {
  it('聊天页与聊天 store 对撤回原文零依赖，且内心行的渲染门不得被顺手删掉', () => {
    const 聊天页源 = 读源('views/聊天页面.vue')
    const store源 = 读源('stores/聊天.ts')

    expect(聊天页源).not.toContain('yuan_shi_nei_rong')
    expect(store源).not.toContain('yuan_shi_nei_rong')
    expect(聊天页源).toContain("xiaoXi.lei_xing !== 'neiXinHuoDong'")
  })

  it('该字段在前端类型里只保留在「按能力下发」的消息面上，军师记录类型不带该键', () => {
    const 类型源 = 读源('types/类型定义.ts')
    const 军师记录段 = /interface JunShiJiLuLiaoTianXiaoXi \{([\s\S]*?)\n\}/.exec(类型源)?.[1]

    expect(类型源).toContain('yuan_shi_nei_rong?:')
    expect(类型源).not.toMatch(/^\s*yuan_shi_nei_rong:\s*string\s*$/m)
    expect(军师记录段).toBeDefined()
    expect(军师记录段).not.toMatch(/^\s*yuan_shi_nei_rong\??:/m)
  })

  it('FP-26 反转：军师记录详情面已删除撤回原文展示（旧断言钉的是「该依赖存在」）', () => {
    const 军师详情源 = 读源('views/军师记录详情.vue')

    expect(军师详情源).not.toContain('yuan_shi_nei_rong')
    expect(军师详情源).not.toContain('chehui-yuanshi')
    expect(军师详情源).toContain('chehui-shijian')
    expect(读源('config/翻译表.ts')).toMatch(/cheHuiYuanWen/)
  })

  it('全库对撤回原文的读取点归零（新消费点必须先过裁决）', () => {
    const 命中文件 = [
      'views/聊天页面.vue',
      'views/军师记录详情.vue',
      'views/好友聊天.vue',
      'views/过往战绩.vue',
      'stores/聊天.ts',
      'components/军师指导.vue',
    ].filter((路径) => 读源(路径).includes('yuan_shi_nei_rong'))

    expect(命中文件).toEqual([])
  })

  it('渣型「答案」字段（话术/暴露方式/识破线索）在渲染层零消费点：L-45 的可收口证据', () => {
    const 答案字段 = ['zha_fa_miao_shu', 'hua_shu', 'bao_lu_fang_shi', 'shi_po_xian_suo']
    const 渲染层清单 = ['views', 'components', 'stores'].flatMap((目录) =>
      readdirSync(resolve(本目录, '..', 目录), { withFileTypes: true })
        .filter((条目) => 条目.isFile() && /\.vue$/.test(条目.name))
        .map((条目) => `${目录}/${条目.name}`)
        .filter((路径) => 答案字段.some((字段) => 读源(...路径.split('/')).includes(字段))),
    )

    expect(渲染层清单).toEqual([])
  })
})
