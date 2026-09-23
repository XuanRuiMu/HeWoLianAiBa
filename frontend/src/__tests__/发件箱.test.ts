import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  jiaRuFaJianXiang,
  yiChuFaJianXiang,
  duQuDaiFaSongShu,
  chongFaFaJianXiang,
  queDingMiDengJian,
  tiaoMuMiDengJian,
} from '@/utils/发件箱'
import { baoCunShuJu } from '@/utils/storage'
import http from '@/api/请求'
import { faSongXiaoXi } from '@/api/聊天'

vi.mock('@/api/请求', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('FP-09 YH-098 离线发件箱', () => {
  it('断网写操作进outbox并持久化，恢复后重发清空', async () => {
    baoCunShuJu('fa-jian-xiang', [])
    const jian = jiaRuFaJianXiang('hao-you-xiao-xi', { nei_rong: '你好' })
    expect(duQuDaiFaSongShu()).toBe(1)
    const jieGuo = await chongFaFaJianXiang(async () => undefined)
    expect(jieGuo.cheng_gong).toBe(1)
    expect(duQuDaiFaSongShu()).toBe(0)
    yiChuFaJianXiang(jian)
    expect(duQuDaiFaSongShu()).toBe(0)
  })

  it('重发失败保留outbox并计数失败，禁静默分叉', async () => {
    baoCunShuJu('fa-jian-xiang', [])
    jiaRuFaJianXiang('hao-you-xiao-xi', { nei_rong: '失败消息' })
    const jieGuo = await chongFaFaJianXiang(async () => {
      throw new Error('网络仍断开')
    })
    expect(jieGuo.shi_bai).toBe(1)
    expect(duQuDaiFaSongShu()).toBe(1)
    baoCunShuJu('fa-jian-xiang', [])
  })
})

describe('FP-09b 幂等键挂在消息本体并随队列存活', () => {
  beforeEach(() => {
    baoCunShuJu('fa-jian-xiang', [])
  })

  it('同一条消息进队列后，失败重试取回的是同一把键（不每次重发新造）', async () => {
    const 气泡本体: { mi_deng_jian: string | null; nei_rong: string } = {
      mi_deng_jian: null,
      nei_rong: '离线那句话',
    }
    const 首次键 = queDingMiDengJian(气泡本体)
    expect(首次键).toMatch(UUID)
    const jian = jiaRuFaJianXiang('liao-tian-xiao-xi', { ...气泡本体 })

    const 派发记录: Array<string | undefined> = []
    let 第一次 = true
    const 首轮 = await chongFaFaJianXiang(async (xiang) => {
      派发记录.push(xiang.zai_he.mi_deng_jian as string | undefined)
      if (第一次) {
        第一次 = false
        throw new Error('仍断网')
      }
    })
    expect(首轮).toEqual({ cheng_gong: 0, shi_bai: 1 })
    const 次轮 = await chongFaFaJianXiang(async (xiang) => {
      派发记录.push(xiang.zai_he.mi_deng_jian as string | undefined)
    })

    expect(次轮).toEqual({ cheng_gong: 1, shi_bai: 0 })
    expect(派发记录).toEqual([首次键, 首次键])
    expect(duQuDaiFaSongShu()).toBe(0)
    expect(tiaoMuMiDengJian(jian)).toBeNull()
  })

  it('载荷没带键时队列只补造一次，并把键写回队列', () => {
    const jian = jiaRuFaJianXiang('liao-tian-xiao-xi', { nei_rong: '没带键' })
    const 首次 = tiaoMuMiDengJian(jian)
    const 再取 = tiaoMuMiDengJian(jian)

    expect(首次).toMatch(UUID)
    expect(再取).toBe(首次)
  })

  it('已有合法键一律原样复用；非 UUID 的脏值才允许被替换', () => {
    const 脏本体: { mi_deng_jian?: string | null } = { mi_deng_jian: 'bu-shi-uuid' }
    const 换掉的 = queDingMiDengJian(脏本体)
    expect(换掉的).toMatch(UUID)
    expect(queDingMiDengJian(脏本体)).toBe(换掉的)

    const 好本体: { mi_deng_jian?: string | null } = {
      mi_deng_jian: '2f7a1c3d-5b6e-4a7f-8c9d-0e1f2a3b4c5d',
    }
    expect(queDingMiDengJian(好本体)).toBe('2f7a1c3d-5b6e-4a7f-8c9d-0e1f2a3b4c5d')
    expect(好本体.mi_deng_jian).toBe('2f7a1c3d-5b6e-4a7f-8c9d-0e1f2a3b4c5d')
  })

  it('每条消息各钉各的键：格式合法且互不相同，同一条再钉取回同一把', () => {
    const 一批 = Array.from({ length: 50 }, () =>
      queDingMiDengJian({} as { mi_deng_jian?: string | null }),
    )
    一批.forEach((jian) => expect(jian).toMatch(UUID))
    expect(new Set(一批).size).toBe(50)

    const 同一条: { mi_deng_jian?: string | null } = {}
    const 首次 = queDingMiDengJian(同一条)
    expect(queDingMiDengJian(同一条)).toBe(首次)
  })

  it('不存在的队列项取键返回 null，不凭空造出投递', () => {
    expect(tiaoMuMiDengJian('mei-you-z-jian')).toBeNull()
  })
})

describe('FP-09b api 层真实请求体（幂等键上报 + 退出序号权威）', () => {
  const 回包 = (extra: Record<string, unknown> = {}) =>
    ({
      data: {
        cheng_gong: true,
        shu_ju: {
          id: 'luo-ku-1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '你好',
          lei_xing: 'wenben',
          shi_jian_chuo: 1700000000000,
          yi_du: true,
          ...extra,
        },
      },
    }) as never

  beforeEach(() => {
    vi.mocked(http.post).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('请求体带 幂等键、不带 客户端序号，并把键交给 Idempotency-Key 重试通道', async () => {
    vi.mocked(http.post).mockResolvedValue(回包({ mi_deng_jian: 'a'.repeat(8) }))
    const jieGuo = await faSongXiaoXi({
      huiHuaId: 'h1',
      neiRong: '你好',
      miDengJian: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    })

    const [url, 请求体, 配置] = vi.mocked(http.post).mock.calls[0]
    expect(url).toBe('/聊天/会话/h1/消息')
    expect(请求体).toEqual({
      neiRong: '你好',
      幂等键: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      leiXing: 'wenben',
      meiTiId: null,
    })
    expect(请求体).not.toHaveProperty('客户端序号')
    expect(配置).toEqual({ miDengJian: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' })
    expect(jieGuo.xiaoXi.id).toBe('luo-ku-1')
  })

  it('媒体消息把类别与媒体 ID 一并上报，幂等键仍是第三条消息自己的', async () => {
    vi.mocked(http.post).mockResolvedValue(回包())
    await faSongXiaoXi({
      huiHuaId: 'h1',
      neiRong: '',
      miDengJian: 'bbbbbbbb-1111-4111-8111-111111111111',
      leiXing: 'tuPian',
      meiTiId: 'm1',
    })

    const [, 请求体] = vi.mocked(http.post).mock.calls[0]
    expect(请求体).toEqual({
      neiRong: '',
      幂等键: 'bbbbbbbb-1111-4111-8111-111111111111',
      leiXing: 'tuPian',
      meiTiId: 'm1',
    })
  })

  it('没有幂等键（旧调用方）时按 null 上报且不走重试通道', async () => {
    vi.mocked(http.post).mockResolvedValue(回包())
    await faSongXiaoXi({ huiHuaId: 'h1', neiRong: '你好' })

    const [, 请求体, 配置] = vi.mocked(http.post).mock.calls[0]
    expect(请求体.幂等键).toBeNull()
    expect(请求体).not.toHaveProperty('客户端序号')
    expect(配置).toBeUndefined()
  })
})
