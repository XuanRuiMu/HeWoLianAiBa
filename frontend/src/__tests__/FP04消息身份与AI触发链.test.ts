import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { faSongXiaoXi, huoQuXiaoXi } from '@/api/聊天'
import type { 消息 } from '@/types'

type 假Socket实例 = {
  序号: number
  connected: boolean
  监听: Map<string, Array<(参数: never) => unknown>>
  on: (事件: string, 处理: (参数: never) => unknown) => 假Socket实例
  removeAllListeners: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  io: { on: ReturnType<typeof vi.fn> }
  触发: (事件: string, 参数?: unknown) => void
}

const 套 = vi.hoisted(() => ({
  实例列表: [] as unknown[],
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const 监听 = new Map<string, Array<(参数: never) => unknown>>()
    const 实例: 假Socket实例 = {
      序号: 套.实例列表.length + 1,
      connected: false,
      监听,
      on: (事件: string, 处理: (参数: never) => unknown) => {
        if (!监听.has(事件)) 监听.set(事件, [])
        监听.get(事件)?.push(处理)
        return 实例
      },
      removeAllListeners: vi.fn(() => {
        监听.clear()
        return 实例
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      io: { on: vi.fn() },
      触发: (事件: string, 参数?: unknown) => {
        for (const 处理 of [...(监听.get(事件) || [])]) 处理(参数 as never)
      },
    }
    套.实例列表.push(实例)
    return 实例
  }),
}))

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn(async () => ({ lie_biao: [], zong_shu: 0 })),
  faSongXiaoXi: vi.fn(),
  shangChuanMeiTi: vi.fn(),
  DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE: { tuPian: 'image', biaoQingBao: 'sticker', yuYin: 'audio', wenJian: 'file' },
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

/** FP-09b 幂等键格式：与后端 utils/验证.ts::yanZhengUUID 同口径 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function 角色消息(id: string, 正文: string): 消息 {
  return {
    id,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: 正文,
    lei_xing: 'wenben',
    shi_jian_chuo: 1700000000000,
    yi_du: false,
  }
}

function 落库用户消息(id: string, 正文: string, 幂等键?: string | null): 消息 {
  return {
    ...角色消息(id, 正文),
    fa_song_zhe_lei_xing: 'yonghu',
    fa_song_zhe_id: 'u1',
    mi_deng_jian: 幂等键 ?? null,
  }
}

function 最后Socket(): 假Socket实例 {
  return 套.实例列表[套.实例列表.length - 1] as unknown as 假Socket实例
}

async function 建连(chat: ReturnType<typeof 使用聊天仓库>, huiHuaId = 'h1') {
  await chat.jiaZaiXiaoXi(huiHuaId)
  chat.lianJieSocket(huiHuaId)
  const 实例 = 最后Socket()
  实例.connected = true
  实例.触发('connect')
  return 实例
}

let 聊天仓库: ReturnType<typeof 使用聊天仓库>

beforeEach(async () => {
  vi.clearAllMocks()
  套.实例列表.length = 0
  setActivePinia(createPinia())
  聊天仓库 = 使用聊天仓库()
  聊天仓库.qingKongZhuangTai()
  vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 })
})

describe('FP-04 前端消息身份幂等', () => {
  it('同一条「角色回复」推送两次只留一条消息', async () => {
    const 实例 = await 建连(聊天仓库)
    const 单条 = 角色消息('x-1', '这是同一条回复')

    实例.触发('角色回复', { 角色ID: 'h1', 消息列表: [单条] })
    实例.触发('角色回复', { 角色ID: 'h1', 消息列表: [单条] })

    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.id === 'x-1')).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
  })

  it('两条同毫秒的系统消息不会因 ID 相同互相覆盖', async () => {
    const 实例 = await 建连(聊天仓库)

    实例.触发('已读不回', { jiao_se_id: 'h1', yuan_yin: 'leng_lo' })
    实例.触发('已读不回', { jiao_se_id: 'h1', yuan_yin: 'leng_lo' })

    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.fa_song_zhe_lei_xing === 'xitong')).toHaveLength(2)
  })

  it('乐观气泡的服务端 ID 替换是原子的：既不重复也不丢发送态字段', async () => {
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: { ...角色消息('fu-wu-1', '你好'), fa_song_zhe_lei_xing: 'yonghu', ke_hu_duan_xu_hao: 3 },
      shiMiJi: false,
    })
    await 建连(聊天仓库)

    const 任务 = 聊天仓库.faSongXiaoXi('你好')
    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao[0].id).toMatch(/^linshi-/)
    const 临时Id = 聊天仓库.xiaoXiLieBiao[0].ke_hu_duan_id as string
    await 任务

    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao[0].id).toBe('fu-wu-1')
    expect(聊天仓库.xiaoXiLieBiao[0].ke_hu_duan_id).toBe(临时Id)
    expect(聊天仓库.xiaoXiLieBiao[0].fa_song_zhong).toBeUndefined()

    const 实例 = 最后Socket()
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [{ ...角色消息('fu-wu-1', '你好'), fa_song_zhe_lei_xing: 'yonghu' }],
    })
    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
  })

  it('首屏快照在途期间到达的推送不被整体覆盖吞掉', async () => {
    let 解析快照: (值: unknown) => void = () => {}
    vi.mocked(huoQuXiaoXi).mockImplementation(
      () =>
        new Promise((解决) => {
          解析快照 = 解决 as (值: unknown) => void
        }),
    )
    聊天仓库.dangQianHuiHuaId = 'h1'
    const 加载 = 聊天仓库.jiaZaiXiaoXi('h2')
    聊天仓库.lianJieSocket('h2')
    const 实例 = 最后Socket()
    实例.connected = true
    实例.触发('connect')
    实例.触发('角色回复', { 角色ID: 'h2', 消息列表: [角色消息('zai-tu', '在途回复')] })

    解析快照({
      lie_biao: [{ ...角色消息('ku-2', '库里的旧消息'), hui_hua_id: 'h2', shi_jian_chuo: 1699000000000 }],
      zong_shu: 1,
    })
    await 加载

    const 在途 = 聊天仓库.xiaoXiLieBiao.filter((m) => m.id === 'zai-tu')
    expect(在途).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['ku-2', 'zai-tu'])
  })

  it('快照与在途乐观气泡按幂等键判重，不出现双份', async () => {
    // 真实链路：首屏快照请求在途 → 用户此刻发出一条（服务端尚未回，气泡仍是乐观态）
    // → 快照里已含该条的落库行（同幂等键、不同 ID）⇒ 只能留服务端那一条。
    // 旧口径按「前端自增序号」判重，序号归服务端权威后本地值恒对不上，正是吞消息的成因。
    let 解析快照: (值: unknown) => void = () => {}
    vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))
    await 建连(聊天仓库)
    vi.mocked(huoQuXiaoXi).mockImplementation(
      () =>
        new Promise((解决) => {
          解析快照 = 解决 as (值: unknown) => void
        }),
    )
    const 加载 = 聊天仓库.jiaZaiXiaoXi('h1')
    await Promise.resolve()
    const 发送 = 聊天仓库.faSongXiaoXi('插话内容')
    await Promise.resolve()
    const 乐观幂等键 = 聊天仓库.xiaoXiLieBiao[0].mi_deng_jian as string
    expect(乐观幂等键).toMatch(UUID)
    // 前端不再自增伪造排序序号：乐观态身上没有本地序号
    expect(聊天仓库.xiaoXiLieBiao[0].ke_hu_duan_xu_hao).toBeUndefined()

    解析快照({
      lie_biao: [
        {
          ...角色消息('yi-luo-ku', '插话内容'),
          fa_song_zhe_lei_xing: 'yonghu',
          ke_hu_duan_xu_hao: 77,
          mi_deng_jian: 乐观幂等键,
        },
      ],
      zong_shu: 1,
    })
    await 加载
    void 发送

    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao[0].id).toBe('yi-luo-ku')
    expect(聊天仓库.xiaoXiLieBiao[0].ke_hu_duan_xu_hao).toBe(77)
  })

  it('幂等键不同的两条用户消息不会因服务端序号相同被误判为重复', async () => {
    // 快照在途期间发出两条，快照只含第一条的落库行：两条都必须留在列表里且各只有一条
    let 解析快照: (值: unknown) => void = () => {}
    vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))
    await 建连(聊天仓库)
    vi.mocked(huoQuXiaoXi).mockImplementation(
      () =>
        new Promise((解决) => {
          解析快照 = 解决 as (值: unknown) => void
        }),
    )
    const 加载 = 聊天仓库.jiaZaiXiaoXi('h1')
    void 聊天仓库.faSongXiaoXi('第一条')
    void 聊天仓库.faSongXiaoXi('第二条')
    const 两条键 = 聊天仓库.xiaoXiLieBiao.map((m) => m.mi_deng_jian) as string[]
    expect(new Set(两条键).size).toBe(2)

    解析快照({
      lie_biao: [
        {
          ...角色消息('luo-ku-1', '第一条'),
          fa_song_zhe_lei_xing: 'yonghu',
          ke_hu_duan_xu_hao: 1,
          mi_deng_jian: 两条键[0],
        },
      ],
      zong_shu: 1,
    })
    await 加载

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.nei_rong).sort()).toEqual(['第一条', '第二条'])
    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.nei_rong === '第一条')).toHaveLength(1)
  })

  it('上滑分页与已有消息重叠时同样按 消息.id 去重', async () => {
    const 实例 = await 建连(聊天仓库)
    实例.触发('角色回复', { 角色ID: 'h1', 消息列表: [角色消息('ku-9', '已在列表里')] })
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['ku-9'])

    // 分页响应按「新→旧」返回：ku-9 与列表重叠，ku-10 是更早的一条
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: [
        { ...角色消息('ku-9', '已在列表里') },
        { ...角色消息('ku-10', '更早的一条'), shi_jian_chuo: 1699000000000 },
      ],
      zong_shu: 3,
      hai_you_geng_duo: true,
    })
    聊天仓库.yeMa = 1
    聊天仓库.haiYouGengDuo = true
    聊天仓库.jiaZaiGengDuoZhong = false

    await 聊天仓库.jiaZaiGengDuoXiaoXi()

    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.id === 'ku-9')).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['ku-10', 'ku-9'])
  })
})

describe('FP-04 socket 监听器单所有权', () => {
  it('重复挂载/重复调用只建一条连接且每个事件只注册一次', async () => {
    // FP-19 后 管理员_* 监听只随 cha_kan 视图门注册；点亮能力使本用例覆盖全部 12 个监听（断言不放宽）
    使用用户仓库().nengLieBiao = ['cha_kan']
    await 建连(聊天仓库)
    聊天仓库.lianJieSocket('h1')
    聊天仓库.lianJieSocket('h1')
    await 聊天仓库.jiaZaiXiaoXi('h1')
    聊天仓库.lianJieSocket('h1')

    expect(套.实例列表).toHaveLength(1)
    const 实例 = 最后Socket()
    const 事件名 = [...实例.监听.keys()]
    expect(事件名.length).toBeGreaterThanOrEqual(9)
    for (const 事件 of 事件名) {
      expect(实例.监听.get(事件)?.length, `${事件} 监听器叠加`).toBe(1)
    }
  })

  it('切会话复用同一连接，只重发「加入聊天」', async () => {
    const 实例 = await 建连(聊天仓库)
    实例.emit.mockClear()

    await 聊天仓库.jiaZaiXiaoXi('h2')
    聊天仓库.lianJieSocket('h2')

    expect(套.实例列表).toHaveLength(1)
    expect(实例.disconnect).not.toHaveBeenCalled()
    expect(实例.emit).toHaveBeenCalledWith('加入聊天', 'h2')
  })

  it('socket.io 放弃重连后重建连接前先彻底解绑旧实例', async () => {
    const 实例 = await 建连(聊天仓库)
    const 放弃重连 = 实例.io.on.mock.calls.find(([事件]) => 事件 === 'reconnect_failed')?.[1]
    expect(放弃重连, '必须订阅 reconnect_failed 才能感知永久失效').toBeTypeOf('function')

    实例.connected = false
    实例.触发('disconnect')
    放弃重连?.()

    聊天仓库.lianJieSocket('h1')

    expect(实例.removeAllListeners).toHaveBeenCalledTimes(1)
    expect(实例.disconnect).toHaveBeenCalledTimes(1)
    expect(套.实例列表).toHaveLength(2)
  })

  it('AI 触发信号不再由前端发出（改由服务端落库路径驱动）', async () => {
    const 实例 = await 建连(聊天仓库)
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: { ...角色消息('fu-wu-2', '插话'), fa_song_zhe_lei_xing: 'yonghu' },
      shiMiJi: false,
    })

    await 聊天仓库.faSongXiaoXi('插话')

    expect(实例.emit).not.toHaveBeenCalledWith('发送消息')
    expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
  })

  it('换调度器实例后序号重新计数，「正在输入」不被误丢', async () => {
    const 实例 = await 建连(聊天仓库)
    实例.触发('AI状态', {
      jiao_se_id: 'h1',
      zhuang_tai: 'zheng_zai_shu_ru',
      xu_hao: 9,
      shi_jian: Date.now(),
    })
    expect(聊天仓库.zhengZaiShuRu).toBe(true)

    await 聊天仓库.jiaZaiXiaoXi('h2')
    聊天仓库.lianJieSocket('h2')
    实例.触发('AI状态', {
      jiao_se_id: 'h2',
      zhuang_tai: 'zheng_zai_shu_ru',
      xu_hao: 1,
      shi_jian: Date.now(),
    })

    expect(聊天仓库.aiZhuangTai).toBe('zheng_zai_shu_ru')
  })
})

describe('FP-09b 幂等键投递 / 轮次闸门 / 乐观气泡对齐', () => {
  it('发送即带稳定 UUID 幂等键，重发复用同一把且列表只有一条', async () => {
    const 实例 = await 建连(聊天仓库)
    let 第一次的键: string | null = null
    vi.mocked(faSongXiaoXi).mockImplementation(async (canShu) => {
      if (!第一次的键) {
        第一次的键 = canShu.miDengJian ?? null
        throw new Error('网络异常')
      }
      return { xiaoXi: 落库用户消息('luo-ku-tong-yi-jian', '插话内容', 第一次的键), shiMiJi: false }
    })

    await 聊天仓库.faSongXiaoXi('插话内容')
    const 气泡 = 聊天仓库.xiaoXiLieBiao[0]
    expect(气泡.mi_deng_jian).toMatch(UUID)
    expect(第一次的键).toBe(气泡.mi_deng_jian)
    expect(聊天仓库.faSongShiBaiJiHe.size).toBe(1)

    const 重发成功 = await 聊天仓库.chongShiFaSongXiaoXi(气泡.ke_hu_duan_id as string)

    expect(重发成功).toBe(true)
    // 两次派发用的是同一把键 ⇒ 服务端唯一约束把重放压成一条
    expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    expect(vi.mocked(faSongXiaoXi).mock.calls[1][0].miDengJian).toBe(第一次的键)
    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao[0].id).toBe('luo-ku-tong-yi-jian')
    expect(聊天仓库.xiaoXiLieBiao[0].mi_deng_jian).toBe(第一次的键)
    // 幂等键挂在消息本体上，随失败态一起存活（重发前气泡没被删掉重建）
    expect(实例.emit).not.toHaveBeenCalledWith('发送消息')
  })

  it('轮次小于当前有效轮次的「角色回复」整帧丢弃，同轮次与缺轮次的旧推送照收', async () => {
    const 实例 = await 建连(聊天仓库)

    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-51', '第五十一号回复')],
      轮次: 5,
      驱动消息ID: 'u-1',
    })
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-41', '被插话作废的旧轮次残余')],
      轮次: 4,
      驱动消息ID: 'u-1',
    })
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-52', '同轮次的语音尾巴')],
      轮次: 5,
      驱动消息ID: 'u-1',
    })
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-wu', '不带轮次的旁路推送（秘密指令/夺舍等）')],
    })

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['r-51', 'r-52', 'r-wu'])
    expect(聊天仓库.xiaoXiLieBiao.some((m) => m.id === 'r-41')).toBe(false)
  })

  it('调度器实例重建使轮次重新计数时，按驱动消息ID 重新起算而不是永久丢弃', async () => {
    const 实例 = await 建连(聊天仓库)
    vi.mocked(faSongXiaoXi)
      .mockResolvedValueOnce({ xiaoXi: 落库用户消息('u-1', '第一条'), shiMiJi: false })
      .mockResolvedValueOnce({ xiaoXi: 落库用户消息('u-2', '第二条'), shiMiJi: false })
    await 聊天仓库.faSongXiaoXi('第一条')
    await 聊天仓库.faSongXiaoXi('第二条')

    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-5', '旧调度器第 5 轮')],
      轮次: 5,
      驱动消息ID: 'u-1',
    })
    // 轮次比已接受的小、驱动却是更新的一条 ⇒ 新一代调度器重新计数，必须收下并以此为新基准
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-3', '新调度器第 3 轮')],
      轮次: 3,
      驱动消息ID: 'u-2',
    })
    // 换基准后仍按新基准拦截：驱动不是更新的那条 ⇒ 作废轮次的残余
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-2', '旧轮次的尾巴')],
      轮次: 2,
      驱动消息ID: 'u-1',
    })

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['u-1', 'u-2', 'r-5', 'r-3'])
    expect(聊天仓库.xiaoXiLieBiao.some((m) => m.id === 'r-2')).toBe(false)
  })

  it('重连后闸门基点归零，新会话轮次不被上一会话的记忆误丢', async () => {
    const 实例 = await 建连(聊天仓库)
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-9', '上一会话第 9 轮')],
      轮次: 9,
    })
    实例.触发('connect')
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-1', '重连后新调度器第 1 轮')],
      轮次: 1,
    })

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['r-9', 'r-1'])
  })

  it('用户插入消息的乐观气泡不会被返回体里的角色消息替换掉', async () => {
    const 实例 = await 建连(聊天仓库)
    const 第一次的键: string[] = []
    vi.mocked(faSongXiaoXi).mockImplementation(async (canShu) => {
      第一次的键.push(canShu.miDengJian ?? '')
      return { xiaoXi: 角色消息('pao-lu-de-jiao-se-xing', 'AI 抢先落库的回复'), shiMiJi: false }
    })

    await 聊天仓库.faSongXiaoXi('我插进去的那句话')

    const 用户气泡 = 聊天仓库.xiaoXiLieBiao.find((m) => m.fa_song_zhe_lei_xing === 'yonghu')
    expect(用户气泡, '返回体不是本条气泡时绝不覆盖用户消息').toBeDefined()
    expect(用户气泡?.nei_rong).toBe('我插进去的那句话')
    expect(用户气泡?.id).toMatch(/^linshi-/)
    expect(用户气泡?.fa_song_zhong).toBe(false)
    expect(用户气泡?.mi_deng_jian).toBe(第一次的键[0])
    // 返回的那条角色行按自身身份另行入列，不冒充用户气泡
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual([用户气泡?.id, 'pao-lu-de-jiao-se-xing'])
    expect(实例.emit).not.toHaveBeenCalledWith('发送消息')
  })

  it('返回体是「另一条」用户消息（幂等键不同）时同样不覆盖本条气泡', async () => {
    await 建连(聊天仓库)
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: 落库用户消息('bie-ren-de-xing', '别人的消息', 'ffffffff-1111-4111-8111-111111111111'),
      shiMiJi: false,
    })

    await 聊天仓库.faSongXiaoXi('我这句话')

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.nei_rong)).toEqual(['我这句话', '别人的消息'])
  })

  it('payload 缺字段或为脏值时优雅降级：不崩、不误丢、也不脏化闸门', async () => {
    const 实例 = await 建连(聊天仓库)
    const 脏帧: unknown[] = [
      { 角色ID: 'h1' },
      { 角色ID: 'h1', 消息列表: undefined, 轮次: Number.NaN },
      { 角色ID: 'h1', 消息列表: '不是数组', 轮次: '3' },
      { 角色ID: 'h1', 消息列表: [角色消息('r-zi', '轮次是字符串')], 轮次: '5' },
      { 角色ID: null, 消息列表: [角色消息('r-ling', '角色ID 为空')] },
      { 角色ID: 'h1', 消息列表: [角色消息('r-fu', '轮次为负')], 轮次: -1 },
      null,
    ]
    for (const zhen of 脏帧) {
      expect(() => 实例.触发('角色回复', zhen)).not.toThrow()
    }
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['r-zi', 'r-fu'])

    // 脏值不得把闸门基点抬高：随后带轮次 2 的正常帧仍必须送达
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-2', '轮次 2 的正常回复')],
      轮次: 2,
    })
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toContain('r-2')
  })

  it('切换会话时闸门基点随 jiaZaiXiaoXi 归零，新会话的第 1 轮不被上一会话记忆误丢', async () => {
    const 实例 = await 建连(聊天仓库)
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-h1-9', '上一会话第 9 轮')],
      轮次: 9,
    })
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['r-h1-9'])

    // 真实换会话路径：聊天页面只调 jiaZaiXiaoXi，不再触发 connect（socket 仍在连）
    await 聊天仓库.jiaZaiXiaoXi('h2')
    实例.触发('角色回复', {
      角色ID: 'h2',
      消息列表: [角色消息('r-h2-1', '新会话第 1 轮')],
      轮次: 1,
    })

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['r-h2-1'])
  })

  it('驱动消息ID 是本端从未确认过的一条时按旧轮次残余丢弃，不借道抬升闸门', async () => {
    const 实例 = await 建连(聊天仓库)
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: 落库用户消息('u-1', '我这句话'),
      shiMiJi: false,
    })
    await 聊天仓库.faSongXiaoXi('我这句话')
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-5', '第 5 轮')],
      轮次: 5,
      驱动消息ID: 'u-1',
    })

    // 轮次更小且驱动消息本端从未确认 ⇒ 既不是新一代也不是本轮尾巴，只能丢弃
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-3-mo-sheng', '驱动消息陌生的旧轮次残余')],
      轮次: 3,
      驱动消息ID: 'cong-lai-mei-you-de-id',
    })

    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toEqual(['u-1', 'r-5'])
    // 闸门基点未被陌生帧抬走：随后同轮次的正常尾巴仍必须送达
    实例.触发('角色回复', {
      角色ID: 'h1',
      消息列表: [角色消息('r-5-tail', '第 5 轮的语音尾巴')],
      轮次: 5,
      驱动消息ID: 'u-1',
    })
    expect(聊天仓库.xiaoXiLieBiao.map((m) => m.id)).toContain('r-5-tail')
  })
})
