import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { 使用聊天仓库 } from '@/stores/聊天'

const { jiaSocket, shiJianChuLiQi } = vi.hoisted(() => {
  const shiJianChuLiQi: Record<string, (shuJu: unknown) => void> = {}
  const jiaSocket = {
    on: (shiJian: string, chuLiQi: (shuJu: unknown) => void) => {
      shiJianChuLiQi[shiJian] = chuLiQi
    },
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  }
  return { jiaSocket, shiJianChuLiQi }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => jiaSocket),
  Socket: class {},
}))

vi.mock('@/api/聊天')

describe('聊天 store 管理员实时监控事件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    Object.keys(shiJianChuLiQi).forEach((jian) => delete shiJianChuLiQi[jian])
    vi.clearAllMocks()
  })

  it('管理员_构建过程 推入构建过程列表', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    shiJianChuLiQi['管理员_构建过程']({ 阶段: '思考启动', 说明: '开始思考', 时间: 1000 })
    expect(cangKu.gouJianGuoChengLieBiao.length).toBe(1)
    expect(cangKu.gouJianGuoChengLieBiao[0].阶段).toBe('思考启动')
    expect(cangKu.gouJianGuoChengLieBiao[0].说明).toBe('开始思考')
    expect(cangKu.gouJianGuoChengLieBiao[0].时间).toBe(1000)
  })

  it('管理员_好感度变化 推入好感度变化列表', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    shiJianChuLiQi['管理员_好感度变化']({ 变化: { r1: 3, r2: -2 }, 时间: 2000 })
    expect(cangKu.haoGanDuBianHuaLieBiao.length).toBe(1)
    expect(cangKu.haoGanDuBianHuaLieBiao[0].变化).toEqual({ r1: 3, r2: -2 })
    expect(cangKu.haoGanDuBianHuaLieBiao[0].时间).toBe(2000)
  })

  it('管理员_隐藏信息 推入隐藏信息列表', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    shiJianChuLiQi['管理员_隐藏信息']({ 类型: 'AI撤回', 内容: 'AI撤回了一条消息', 时间: 3000 })
    expect(cangKu.yinCangXinXiLieBiao.length).toBe(1)
    expect(cangKu.yinCangXinXiLieBiao[0].类型).toBe('AI撤回')
    expect(cangKu.yinCangXinXiLieBiao[0].内容).toBe('AI撤回了一条消息')
    expect(cangKu.yinCangXinXiLieBiao[0].时间).toBe(3000)
  })

  it('构建过程列表超过100条时截断为最近100条', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    for (let i = 1; i <= 150; i++) {
      shiJianChuLiQi['管理员_构建过程']({ 阶段: '阶段' + i, 说明: 's' + i, 时间: i })
    }
    expect(cangKu.gouJianGuoChengLieBiao.length).toBe(100)
    expect(cangKu.gouJianGuoChengLieBiao[0].时间).toBe(51)
    expect(cangKu.gouJianGuoChengLieBiao[99].时间).toBe(150)
  })

  it('好感度变化列表超过100条时截断为最近100条', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    for (let i = 1; i <= 130; i++) {
      shiJianChuLiQi['管理员_好感度变化']({ 变化: { r: i }, 时间: i })
    }
    expect(cangKu.haoGanDuBianHuaLieBiao.length).toBe(100)
    expect(cangKu.haoGanDuBianHuaLieBiao[0].时间).toBe(31)
    expect(cangKu.haoGanDuBianHuaLieBiao[99].时间).toBe(130)
  })

  it('隐藏信息列表超过100条时截断为最近100条', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    for (let i = 1; i <= 120; i++) {
      shiJianChuLiQi['管理员_隐藏信息']({ 类型: '用户撤回', 内容: 'c' + i, 时间: i })
    }
    expect(cangKu.yinCangXinXiLieBiao.length).toBe(100)
    expect(cangKu.yinCangXinXiLieBiao[0].时间).toBe(21)
    expect(cangKu.yinCangXinXiLieBiao[99].时间).toBe(120)
  })

  it('三类事件互不干扰，各自独立累计', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    shiJianChuLiQi['管理员_构建过程']({ 阶段: 'a', 说明: 's', 时间: 1 })
    shiJianChuLiQi['管理员_好感度变化']({ 变化: { r: 1 }, 时间: 2 })
    shiJianChuLiQi['管理员_隐藏信息']({ 类型: 'AI撤回', 内容: 'c', 时间: 3 })
    expect(cangKu.gouJianGuoChengLieBiao.length).toBe(1)
    expect(cangKu.haoGanDuBianHuaLieBiao.length).toBe(1)
    expect(cangKu.yinCangXinXiLieBiao.length).toBe(1)
  })

  it('管理员_深度思考 推入深度思考列表并透传轮次', () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    shiJianChuLiQi['管理员_深度思考']({ 来源: 'Director', 内容: '先接住情绪', 时间: 100, 轮次: 9 })
    shiJianChuLiQi['管理员_构建过程']({ 阶段: '输出回复', 说明: 's', 内容: '你好', 时间: 200, 轮次: 9 })
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(1)
    expect(cangKu.shenDuSiKaoLieBiao[0]).toEqual({ 来源: 'Director', 内容: '先接住情绪', 时间: 100, 轮次: 9 })
    expect(cangKu.gouJianGuoChengLieBiao[0].内容).toBe('你好')
    expect(cangKu.gouJianGuoChengLieBiao[0].轮次).toBe(9)
  })

  it('监控历史按会话持久化：切走再回来直接看到', async () => {
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    shiJianChuLiQi['管理员_构建过程']({ 阶段: '思考启动', 说明: 's', 时间: 1, 轮次: 3 })
    shiJianChuLiQi['管理员_深度思考']({ 来源: 'Writer', 内容: '短句回复', 时间: 2, 轮次: 3 })
    expect(cangKu.gouJianGuoChengLieBiao.length).toBe(1)
    await cangKu.jiaZaiXiaoXi('h2')
    expect(cangKu.gouJianGuoChengLieBiao.length).toBe(0)
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(0)
    await cangKu.jiaZaiXiaoXi('h1')
    expect(cangKu.gouJianGuoChengLieBiao.length).toBe(1)
    expect(cangKu.gouJianGuoChengLieBiao[0].阶段).toBe('思考启动')
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(1)
    expect(cangKu.shenDuSiKaoLieBiao[0].内容).toBe('短句回复')
  })
})

describe('聊天 store 旧内心消息统一持久化补全', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    Object.keys(shiJianChuLiQi).forEach((jian) => delete shiJianChuLiQi[jian])
    vi.clearAllMocks()
  })

  function 旧内心消息(id: string, neiRong: string, shiJian = 500) {
    return {
      id,
      hui_hua_id: 'h1',
      fa_song_zhe_id: 'r1',
      fa_song_zhe_lei_xing: 'jiaose',
      nei_rong: neiRong,
      lei_xing: 'neiXinHuoDong',
      shi_jian_chuo: shiJian,
      yi_du: true,
    }
  }

  it('旧内心消息补全进深度思考列表并持久化', () => {
    const cangKu = 使用聊天仓库()
    cangKu.dangQianHuiHuaId = 'h1'
    cangKu.xiaoXiLieBiao = [旧内心消息('m1', '内心独白旧数据')]
    cangKu.补全旧内心消息()
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(1)
    expect(cangKu.shenDuSiKaoLieBiao[0]).toEqual({ 来源: '历史消息', 内容: '内心独白旧数据', 时间: 500 })
    const 存档 = JSON.parse(localStorage.getItem('guanli-jiankong:h1') as string)
    expect(存档.shenDuSiKao.length).toBe(1)
    expect(存档.shenDuSiKao[0].内容).toBe('内心独白旧数据')
  })

  it('重复补全不产生重复条目', () => {
    const cangKu = 使用聊天仓库()
    cangKu.dangQianHuiHuaId = 'h1'
    cangKu.xiaoXiLieBiao = [旧内心消息('m1', '内心独白旧数据')]
    cangKu.补全旧内心消息()
    cangKu.补全旧内心消息()
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(1)
  })

  it('localStorage已有复用并补全缺口：存档保留+旧消息追加', () => {
    localStorage.setItem(
      'guanli-jiankong:h9',
      JSON.stringify({
        gouJian: [],
        haoGanDu: [],
        yinCang: [],
        shenDuSiKao: [{ 来源: 'Director', 内容: '存档思考', 时间: 100, 轮次: 3 }],
      }),
    )
    const cangKu = 使用聊天仓库()
    cangKu.dangQianHuiHuaId = 'h9'
    cangKu.lianJieSocket('h9')
    shiJianChuLiQi['管理员_深度思考']({ 来源: 'Director', 内容: '存档思考', 时间: 100, 轮次: 3 })
    cangKu.xiaoXiLieBiao = [旧内心消息('m1', '内心独白旧数据', 200)]
    cangKu.补全旧内心消息()
    const 内容表 = cangKu.shenDuSiKaoLieBiao.map((项) => 项.内容)
    expect(内容表).toContain('存档思考')
    expect(内容表).toContain('内心独白旧数据')
  })

  it('非内心消息不被补全，空列表直接返回', () => {
    const cangKu = 使用聊天仓库()
    cangKu.dangQianHuiHuaId = 'h1'
    cangKu.xiaoXiLieBiao = [
      {
        id: 'm2',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '普通文本',
        lei_xing: 'wenben',
        shi_jian_chuo: 600,
        yi_du: true,
      },
    ]
    cangKu.补全旧内心消息()
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(0)
    cangKu.xiaoXiLieBiao = []
    cangKu.补全旧内心消息()
    expect(cangKu.shenDuSiKaoLieBiao.length).toBe(0)
  })
})

describe('聊天 store AI状态 派生对方正在输入', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.keys(shiJianChuLiQi).forEach((jian) => delete shiJianChuLiQi[jian])
    vi.clearAllMocks()
    const cangKu = 使用聊天仓库()
    cangKu.qingKongZhuangTai()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
  })

  function faAiZhuangTai(jiaoSeId: string, zhuangTai: string, xuHao: number) {
    shiJianChuLiQi['AI状态']({
      jiao_se_id: jiaoSeId,
      zhuang_tai: zhuangTai,
      xu_hao: xuHao,
      shi_jian: 1,
    })
  }

  it('zhengZaiShuRu 由 aiZhuangTai 派生，导出名不变；从"正在输入"变"空闲"延迟 1000ms 消失', () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    expect(cangKu.zhengZaiShuRu).toBe(false)
    cangKu.aiZhuangTai = 'zheng_zai_shu_ru'
    expect(cangKu.zhengZaiShuRu).toBe(true)
    cangKu.aiZhuangTai = 'kong_xian'
    expect(cangKu.zhengZaiShuRu).toBe(true) // 延迟中仍显示
    vi.advanceTimersByTime(999)
    expect(cangKu.zhengZaiShuRu).toBe(true)
    vi.advanceTimersByTime(1)
    expect(cangKu.zhengZaiShuRu).toBe(false) // 满 1000ms 后消失
    vi.useRealTimers()
  })

  it('仅接受当前会话且 xu_hao 更大的 AI状态，乱序旧事件被丢弃', () => {
    const cangKu = 使用聊天仓库()
    faAiZhuangTai('h2', 'zheng_zai_shu_ru', 1)
    expect(cangKu.aiZhuangTai).toBe('kong_xian')
    faAiZhuangTai('h1', 'zheng_zai_shu_ru', 5)
    expect(cangKu.aiZhuangTai).toBe('zheng_zai_shu_ru')
    faAiZhuangTai('h1', 'kong_xian', 3)
    expect(cangKu.aiZhuangTai).toBe('zheng_zai_shu_ru')
    faAiZhuangTai('h1', 'kong_xian', 6)
    expect(cangKu.aiZhuangTai).toBe('kong_xian')
  })

  it('切会话（jiaZaiXiaoXi）重置 aiZhuangTai 与 xu_hao 基线', async () => {
    const cangKu = 使用聊天仓库()
    faAiZhuangTai('h1', 'zheng_zai_shu_ru', 10)
    expect(cangKu.aiZhuangTai).toBe('zheng_zai_shu_ru')
    await cangKu.jiaZaiXiaoXi('h2')
    expect(cangKu.aiZhuangTai).toBe('kong_xian')
    faAiZhuangTai('h1', 'zheng_zai_shu_ru', 11)
    expect(cangKu.aiZhuangTai).toBe('kong_xian')
  })

  it('断线（disconnect）重置 aiZhuangTai', () => {
    const cangKu = 使用聊天仓库()
    faAiZhuangTai('h1', 'zheng_zai_shu_ru', 1)
    expect(cangKu.aiZhuangTai).toBe('zheng_zai_shu_ru')
    shiJianChuLiQi['disconnect']?.({})
    expect(cangKu.aiZhuangTai).toBe('kong_xian')
  })
})

describe('聊天 store 对方正在输入 延迟消失（Req9）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.keys(shiJianChuLiQi).forEach((jian) => delete shiJianChuLiQi[jian])
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function faAiZhuangTai(zhuangTai: string, xuHao = 1) {
    shiJianChuLiQi['AI状态']({
      jiao_se_id: 'h1',
      zhuang_tai: zhuangTai,
      xu_hao: xuHao,
      shi_jian: 1,
    })
  }

  it('从"正在输入"变"空闲"时，显示态延迟 1000ms 才消失', () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    faAiZhuangTai('zheng_zai_shu_ru', 1)
    expect(cangKu.zhengZaiShuRu).toBe(true)
    faAiZhuangTai('kong_xian', 2)
    expect(cangKu.zhengZaiShuRu).toBe(true) // 延迟中仍显示
    vi.advanceTimersByTime(999)
    expect(cangKu.zhengZaiShuRu).toBe(true)
    vi.advanceTimersByTime(1)
    expect(cangKu.zhengZaiShuRu).toBe(false) // 满 1000ms 后消失
  })

  it('延迟消失期间再次收到"正在输入"，取消挂起的隐藏定时器并保持显示', () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    faAiZhuangTai('zheng_zai_shu_ru', 1)
    faAiZhuangTai('kong_xian', 2)
    vi.advanceTimersByTime(500)
    expect(cangKu.zhengZaiShuRu).toBe(true)
    faAiZhuangTai('zheng_zai_shu_ru', 3) // 延迟期内恢复输入
    vi.advanceTimersByTime(1000)
    expect(cangKu.zhengZaiShuRu).toBe(true) // 未消失
    faAiZhuangTai('kong_xian', 4)
    vi.advanceTimersByTime(1000)
    expect(cangKu.zhengZaiShuRu).toBe(false)
  })

  it('从"空闲"变"正在输入"时立即显示，不延迟', () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    expect(cangKu.zhengZaiShuRu).toBe(false)
    faAiZhuangTai('zheng_zai_shu_ru', 1)
    expect(cangKu.zhengZaiShuRu).toBe(true) // 立即显示
  })

  it('内部真实状态 aiZhuangTai 仍立即更新，不受显示延迟影响', () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    faAiZhuangTai('zheng_zai_shu_ru', 1)
    faAiZhuangTai('kong_xian', 2)
    expect(cangKu.aiZhuangTai).toBe('kong_xian') // 真实状态立即更新
    expect(cangKu.zhengZaiShuRu).toBe(true) // 显示态仍在延迟中
    vi.advanceTimersByTime(1000)
    expect(cangKu.zhengZaiShuRu).toBe(false)
  })

  it('断线（disconnect）立即隐藏显示态，无挂起定时器串场', () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    faAiZhuangTai('zheng_zai_shu_ru', 1)
    expect(cangKu.zhengZaiShuRu).toBe(true)
    shiJianChuLiQi['disconnect']?.({})
    expect(cangKu.zhengZaiShuRu).toBe(false) // 立即隐藏
    vi.advanceTimersByTime(1000)
    expect(cangKu.zhengZaiShuRu).toBe(false) // 不会被延迟定时器重新显示
  })

  it('切会话（jiaZaiXiaoXi）立即隐藏显示态', async () => {
    vi.useFakeTimers()
    const cangKu = 使用聊天仓库()
    cangKu.lianJieSocket('h1')
    cangKu.dangQianHuiHuaId = 'h1'
    faAiZhuangTai('zheng_zai_shu_ru', 1)
    expect(cangKu.zhengZaiShuRu).toBe(true)
    await cangKu.jiaZaiXiaoXi('h2')
    expect(cangKu.zhengZaiShuRu).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(cangKu.zhengZaiShuRu).toBe(false)
  })
})
