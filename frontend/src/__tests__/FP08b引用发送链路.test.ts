import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import http from '@/api/请求'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { faSongXiaoXi } from '@/api/聊天'
import { 使用聊天仓库 } from '@/stores/聊天'
import type { DaiFaKuai } from '@/composables/use待发图文'

/**
 * FP-08b（缺陷5「严重 bug」的前端发送链路半）取证。
 *
 * R4 的原形态：引用态在 `use长按菜单.ts` 里存着，`聊天页面.vue` 发送时只传正文 ⇒ 引用是死胡同，
 * 服务端永远收不到 `beiYongXiaoXiId`。本文件不测外观（归 FP-09），只钉两件事：
 *  ①入参形态收口：`api/聊天.ts::faSongXiaoXi` 只接**一个入参对象**，store 的 4 个调用点逐一改完，
 *    少一个都红；`leiXing`/`meiTiId` 相邻同型的错位面由"必须写键名"消除；
 *  ②引用真的进 HTTP body：带引用 ⇒ body 逐字含 `beiYongXiaoXiId`；不带 ⇒ body 与改造前逐字相同
 *    （不留 null 键）；失败重发（幂等路径）带的是**同一条**引用与**同一把**幂等键；
 *    媒体直发四条入口不带引用（FP-08b 当时的入口判定，**已由 FP-08d 改判为带引用 + 成功必清**：
 *    旧判定留下「引用条悬挂 + 下一条文字继承上一条引用」，见 ③ 段与 ② 段的改判注释）；
 *  ③刷新读回：按出参 `bei_yong_xiao_xi_id` 能在会话消息列表内定位到被引用的那一条。
 *
 * 这里走的是**真** `api/聊天.ts` + 真 store，只把 `@/api/请求` 挡在最后一层，
 * 因此断言对象就是真正发出的 JSON 请求体（不是调用参数形状，也不是源码文本）。
 */

vi.mock('@/api/请求', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const 会话ID = 'h1'
const 被引用ID = 'aaaaaaaa-1111-4111-8111-111111111111'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function 消息回包(附加: Record<string, unknown> = {}) {
  return {
    data: {
      cheng_gong: true,
      shu_ju: {
        id: 'luo-ku-1',
        hui_hua_id: 会话ID,
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '正文',
        lei_xing: 'wenben',
        shi_jian_chuo: 1700000000000,
        yi_du: true,
        ...附加,
      },
    },
  } as never
}

/** 按 URL 分发：消息投递 / 媒体上传各自回自己的形态 */
function 路由回包(消息体: Record<string, unknown> = {}) {
  vi.mocked(http.post).mockImplementation(async (url: unknown) => {
    if (String(url).endsWith('/媒体')) {
      return { data: { cheng_gong: true, shu_ju: { mediaId: 'm-shang-chuan', leiBie: 'tupian' } } } as never
    }
    return 消息回包(消息体) as never
  })
}

function 第N次请求体(下标 = 0): Record<string, unknown> {
  return vi.mocked(http.post).mock.calls[下标][1] as Record<string, unknown>
}

function 造图文块(): DaiFaKuai[] {
  return [
    {
      id: 'k1',
      lei_xing: 'wenzi',
      nei_rong: '图文混排的字',
      wen_jian: null,
      mei_ti_id: null,
      mei_ti_lei_bie: null,
      yu_lan_url: null,
      mi_deng_jian: '',
    },
  ]
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(http.post).mockReset()
  vi.mocked(http.get).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('FP-08b ① 入参形态收口：单一入参对象', () => {
  it('api 层形参个数恒为 1（退回位置参即红）', () => {
    expect(faSongXiaoXi.length).toBe(1)
  })

  it('store 的 4 个调用点全部以对象实参调用，且都在同一条发送链路上', () => {
    const 源 = readFileSync(resolve(__dirname, '../stores/聊天.ts'), 'utf-8')
    const 调用点 = 源.match(/faSongXiaoXiApi\(/g) ?? []
    // 实测 4 处：乐观消息两分支（图文 / 纯文本）、媒体直发、图文混排首发
    expect(调用点).toHaveLength(4)
    const 非对象实参 = (源.match(/faSongXiaoXiApi\(\s*(?!\{)/g) ?? []).length
    expect(非对象实参, '仍有位置参调用点未收口').toBe(0)
  })

  it('四个键名逐字对齐旧位置参：收口只改形态不改语义', async () => {
    路由回包()
    await faSongXiaoXi({
      huiHuaId: 会话ID,
      neiRong: '收口前是第 2 位',
      miDengJian: 'bbbbbbbb-2222-4222-8222-222222222222',
      leiXing: 'tuPian',
      meiTiId: 'm1',
    })
    expect(第N次请求体()).toEqual({
      neiRong: '收口前是第 2 位',
      幂等键: 'bbbbbbbb-2222-4222-8222-222222222222',
      leiXing: 'tuPian',
      meiTiId: 'm1',
    })
  })
})

describe('FP-08b ② 引用真的进 HTTP body（store → api → 请求体）', () => {
  it('调用点·纯文本分支：带引用 ⇒ body 逐字含 beiYongXiaoXiId', async () => {
    路由回包()
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    await 聊天仓库.faSongXiaoXi('这句带着引用', 被引用ID)
    expect(第N次请求体()).toEqual({
      neiRong: '这句带着引用',
      幂等键: expect.stringMatching(UUID),
      leiXing: 'wenben',
      meiTiId: null,
      beiYongXiaoXiId: 被引用ID,
    })
  })

  it('调用点·纯文本分支：无引用态 ⇒ body 与改造前逐字相同（不留 null 键）', async () => {
    路由回包()
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    await 聊天仓库.faSongXiaoXi('普通一句', null)
    const 请求体 = 第N次请求体()
    expect(Object.keys(请求体).sort()).toEqual(['leiXing', 'meiTiId', 'neiRong', '幂等键'])
    expect(请求体).not.toHaveProperty('beiYongXiaoXiId')
  })

  it('调用点·图文首发：块数组与引用槽并存，互不覆盖', async () => {
    路由回包()
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    await 聊天仓库.faSongTuWenXiaoXi(造图文块(), 被引用ID)
    const 请求体 = 第N次请求体()
    expect(请求体.beiYongXiaoXiId).toBe(被引用ID)
    expect(请求体.neiRongKuai).toEqual([{ lei_xing: 'wenzi', nei_rong: '图文混排的字' }])
  })

  it('调用点·媒体直发：带引用 ⇒ body 含 beiYongXiaoXiId（FP-08d 改判）', async () => {
    // 旧断言（钉的是缺陷形态，FP-08b 原判「媒体直发不该带引用」）：
    //   expect(请求体).not.toHaveProperty('beiYongXiaoXiId')
    // 该判定的代价是引用条在直发后悬挂、并被下一条文字继承；且用户字面要求是
    // 「一切右键引用都要带上被引用消息」。FP-08d 选「补引用参数 + 成功必清」，故按新契约改判。
    路由回包()
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    const wenJian = new Blob(['bin'], { type: 'image/png' })
    await 聊天仓库.faSongMeiTiXiaoXi('tuPian', wenJian as unknown as File, {}, 被引用ID)
    const 请求体 = 第N次请求体(1)
    expect(请求体.beiYongXiaoXiId).toBe(被引用ID)
    expect(请求体).toMatchObject({ leiXing: 'tuPian', meiTiId: 'm-shang-chuan' })
  })

  it('引用钉在气泡身份上：失败重发带同一条引用与同一把幂等键，幂等路径不丢引用', async () => {
    const 链路 = [] as Array<Record<string, unknown>>
    vi.mocked(http.post).mockImplementation(async (url: unknown, 体: unknown) => {
      链路.push(体 as Record<string, unknown>)
      throw new Error('网络异常')
    })
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    await 聊天仓库.faSongTuWenXiaoXi(造图文块(), 被引用ID)
    const 气泡 = 聊天仓库.xiaoXiLieBiao[0]
    expect(气泡.ke_hu_duan_id).toBeTruthy()
    expect(聊天仓库.faSongShiBaiJiHe.size).toBe(1)
    // 重发成功：换回正常回包
    路由回包()
    const 重发成功 = await 聊天仓库.chongShiFaSongXiaoXi(气泡.ke_hu_duan_id as string)
    expect(重发成功).toBe(true)
    const 首发 = 链路[0]
    const 重发 = 第N次请求体()
    expect(首发.beiYongXiaoXiId).toBe(被引用ID)
    expect(重发.beiYongXiaoXiId).toBe(被引用ID)
    expect(重发.幂等键).toBe(首发.幂等键)
    expect(重发.neiRongKuai).toBeDefined()
  })

  it('发送失败不清引用：只有成功才清（不清则重发必丢引用）', async () => {
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 会话ID
    vi.mocked(http.post).mockRejectedValueOnce(new Error('网络异常'))
    vi.mocked(http.post).mockImplementation(async () => 消息回包() as never)
    await 聊天仓库.faSongXiaoXi('先失败再重发', 被引用ID)
    const 气泡 = 聊天仓库.xiaoXiLieBiao[0]
    await 聊天仓库.chongShiFaSongXiaoXi(气泡.ke_hu_duan_id as string)
    expect(第N次请求体(1).beiYongXiaoXiId).toBe(被引用ID)
  })
})

describe('FP-08b ③ 入口穷尽：聊天页每个发送入口是否接引用态，逐条落到断言上', () => {
  const 页面源 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf-8')

  function 调用实参(方法名: string): string[] {
    const 匹配 = new RegExp(`聊天仓库\\.${方法名}\\(([^)]*)\\)`, 'g')
    return [...页面源.matchAll(匹配)].map((x) => x[1])
  }

  it('输入区两入口（文本 / 图文混排）都把引用态作为第二个实参传进 store', () => {
    const 入口 = [...调用实参('faSongXiaoXi'), ...调用实参('faSongTuWenXiaoXi')]
    expect(入口.length).toBeGreaterThanOrEqual(2)
    for (const 实参 of 入口) {
      expect(实参, `入口 ${实参} 未接引用态`).toContain('yinYongXiaoXi.value')
    }
  })

  /**
   * 【FP-10a 改判】第四条入口（表情面板的内置贴纸）不再直发：按需求 #6 它进本条消息的待发块序列，
   *  引用态因此由图文混排那条入口带（`聊天仓库.faSongTuWenXiaoXi(daiFa, yinYongXiaoXi.value?.id)`，
   *  已由上面「输入区两入口」那条用例逐实参钉住）。剩下的三条媒体直发入口（语音/文件/我的表情）
   *  仍全部经页面侧唯一出口 `faSongMeiTiZhiFa`，出口内仍只剩一处 store 调用点。
   */
  it('媒体直发三入口（语音 / 文件 / 我的表情）经页面侧单一出口一律接引用态，贴纸入口改走待发', () => {
    // 旧断言（钉的是缺陷形态）：四条入口各自直调 store 且 `not.toContain('yinYongXiaoXi')`。
    // FP-08d 把「带引用 + 成功必清」收进唯一出口 `faSongMeiTiZhiFa`（避免四份清理逻辑漂移），
    // 故这里判：store 调用点只剩一处且它接了引用态，而直发入口全部经该出口。
    // 行为级（引用条消失、第二条不继承）断言在 __tests__/FP08d媒体引用与直发.test.ts。
    const 出口 = 调用实参('faSongMeiTiXiaoXi')
    expect(出口).toHaveLength(1)
    expect(出口[0]).toContain('yinYongXiaoXi.value')
    const 入口 = [...页面源.matchAll(/await faSongMeiTiZhiFa\(/g)]
    expect(入口).toHaveLength(3)
    // 贴纸入口的引用态出口：它进的是待发块序列，发送那一刻与图文混排共用同一处带引用的调用
    expect(页面源.match(/聊天仓库\.faSongTuWenXiaoXi\(/g)).toHaveLength(1)
    expect(调用实参('faSongTuWenXiaoXi')[0]).toContain('yinYongXiaoXi.value')
  })
})

describe('FP-08b ④ 刷新读回：按 bei_yong_xiao_xi_id 定位被引用那条（数据层，不做渲染）', () => {
  it('列表加载后能按该 ID 找回到被引用的原消息，字段不被归一丢掉', async () => {
    const 原消息 = {
      id: 被引用ID,
      hui_hua_id: 会话ID,
      fa_song_zhe_id: 'j1',
      fa_song_zhe_lei_xing: 'jiaose',
      nei_rong: '被引用的那句原文',
      lei_xing: 'wenben',
      shi_jian_chuo: 1700000000000,
      yi_du: true,
    }
    const 引用消息 = {
      ...原消息,
      id: 'luo-ku-yin-yong',
      fa_song_zhe_id: 'u1',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '我引用了上面那句',
      bei_yong_xiao_xi_id: 被引用ID,
    }
    vi.mocked(http.get).mockResolvedValue({
      data: {
        cheng_gong: true,
        shu_ju: { lie_biao: [引用消息, 原消息].reverse(), zong_shu: 2, zui_hou_xu_hao: 2 },
      },
    } as never)
    const 聊天仓库 = 使用聊天仓库()
    await 聊天仓库.jiaZaiXiaoXi(会话ID)
    const 发出那条 = 聊天仓库.xiaoXiLieBiao.find((m) => m.id === 'luo-ku-yin-yong')
    expect(发出那条?.bei_yong_xiao_xi_id).toBe(被引用ID)
    const 被引用那条 = 聊天仓库.xiaoXiLieBiao.find((m) => m.id === 发出那条?.bei_yong_xiao_xi_id)
    expect(被引用那条?.nei_rong).toBe('被引用的那句原文')
  })
})
