import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import http from '@/api/请求'
import { faSongXiaoXi, huoQuXiaoXi } from '@/api/聊天'
import type { Xiaoxi } from '@/types'

/**
 * FP-08a（缺陷5 严重 bug 的数据与接口层·前端半）引用契约的**请求层**取证。
 *
 * R4 的原形态是「前端为纯 UI 死胡同：状态存而不传」，所以本文件不测渲染、不测肉眼，
 * 只钉一件事：**引用标识必须出现在真正发出去的 HTTP 请求体里**，且读回的字段不在前端被丢掉。
 *  ①带引用 ⇒ body 逐字含 beiYongXiaoXiId（`toEqual` 而非 `toMatchObject`：漏键、多键、改名都红）；
 *  ②不带引用 ⇒ body 与改造前逐字相同（老调用点/老链路零改动的证明，也是 发件箱.test.ts
 *    那批 `toEqual(4 键)` 断言仍绿的同一件事）；
 *  ③出参读取边界 ⇒ bei_yong_xiao_xi_id 原样透传，归一/分页不丢字段。
 */

vi.mock('@/api/请求', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const 会话ID = 'h1'
const 被引用ID = 'aaaaaaaa-1111-4111-8111-111111111111'
const 本条幂等键 = 'bbbbbbbb-2222-4222-8222-222222222222'

function 回包(附加: Record<string, unknown> = {}) {
  return {
    data: {
      cheng_gong: true,
      shu_ju: {
        id: 'luo-ku-1',
        hui_hua_id: 会话ID,
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '引用一下',
        lei_xing: 'wenben',
        shi_jian_chuo: 1700000000000,
        yi_du: true,
        ...附加,
      },
    },
  } as never
}

beforeEach(() => {
  vi.mocked(http.post).mockReset()
  vi.mocked(http.get).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('FP-08a ② 带引用发送：引用标识必须进 HTTP 请求体', () => {
  it('入参对象带 yinYong ⇒ body 逐字含 beiYongXiaoXiId，其余键不变', async () => {
    vi.mocked(http.post).mockResolvedValue(回包({ bei_yong_xiao_xi_id: 被引用ID }))
    const jieGuo = await faSongXiaoXi({
      huiHuaId: 会话ID,
      neiRong: '引用一下',
      miDengJian: 本条幂等键,
      yinYong: { beiYongXiaoXiId: 被引用ID },
    })

    const [url, 请求体, 配置] = vi.mocked(http.post).mock.calls[0]
    expect(url).toBe('/聊天/会话/h1/消息')
    expect(请求体).toEqual({
      neiRong: '引用一下',
      幂等键: 本条幂等键,
      leiXing: 'wenben',
      meiTiId: null,
      beiYongXiaoXiId: 被引用ID,
    })
    expect(配置).toEqual({ miDengJian: 本条幂等键 })
    expect(jieGuo.xiaoXi.bei_yong_xiao_xi_id).toBe(被引用ID)
  })

  it('图文混排 + 引用：块与引用槽并存，互不覆盖', async () => {
    vi.mocked(http.post).mockResolvedValue(回包())
    await faSongXiaoXi({
      huiHuaId: 会话ID,
      neiRong: '',
      miDengJian: 本条幂等键,
      leiXing: 'wenben',
      meiTiId: null,
      neiRongKuai: [{ lei_xing: 'wenzi', nei_rong: '块里的字' }],
      yinYong: { beiYongXiaoXiId: 被引用ID },
    })
    expect(vi.mocked(http.post).mock.calls[0][1]).toEqual({
      neiRong: '',
      幂等键: 本条幂等键,
      leiXing: 'wenben',
      meiTiId: null,
      neiRongKuai: [{ lei_xing: 'wenzi', nei_rong: '块里的字' }],
      beiYongXiaoXiId: 被引用ID,
    })
  })

  it('不传 yinYong ⇒ 请求体与改造前逐字相同（老调用点零改动，不留 null 键）', async () => {
    vi.mocked(http.post).mockResolvedValue(回包())
    await faSongXiaoXi({ huiHuaId: 会话ID, neiRong: '引用一下', miDengJian: 本条幂等键 })
    const 请求体 = vi.mocked(http.post).mock.calls[0][1] as Record<string, unknown>
    expect(请求体).toEqual({
      neiRong: '引用一下',
      幂等键: 本条幂等键,
      leiXing: 'wenben',
      meiTiId: null,
    })
    expect(请求体).not.toHaveProperty('beiYongXiaoXiId')
  })

  it('显式 null / 空串 ⇒ 同样不进 body（撤掉引用态后不发脏键，服务端按未引用处理）', async () => {
    for (const 空值 of [null, undefined, '']) {
      vi.mocked(http.post).mockResolvedValue(回包())
      await faSongXiaoXi({
        huiHuaId: 会话ID,
        neiRong: '引用一下',
        miDengJian: 本条幂等键,
        yinYong: { beiYongXiaoXiId: 空值 },
      })
      expect(vi.mocked(http.post).mock.calls[0][1]).not.toHaveProperty('beiYongXiaoXiId')
    }
  })

  it('引用值原样透传不做前端整形：脏值由服务端裁定（前端不建第二套校验）', async () => {
    vi.mocked(http.post).mockResolvedValue(回包())
    await faSongXiaoXi({
      huiHuaId: 会话ID,
      neiRong: 'x',
      yinYong: { beiYongXiaoXiId: 'not-a-uuid' },
    })
    expect((vi.mocked(http.post).mock.calls[0][1] as Record<string, unknown>).beiYongXiaoXiId).toBe(
      'not-a-uuid',
    )
  })
})

describe('FP-08a ④ 读回：引用字段不在前端被丢掉', () => {
  it('列表接口的 bei_yong_xiao_xi_id 原样到达调用方', async () => {
    const 那条 = {
      id: 'm1',
      hui_hua_id: 会话ID,
      fa_song_zhe_id: 'u1',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '带引用的那条',
      lei_xing: 'wenben',
      shi_jian_chuo: 1700000000000,
      yi_du: true,
      bei_yong_xiao_xi_id: 被引用ID,
    } satisfies Xiaoxi
    vi.mocked(http.get).mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { lie_biao: [那条], zong_shu: 1 } },
    } as never)

    const jieGuo = await huoQuXiaoXi(会话ID)
    expect(jieGuo.lie_biao[0].bei_yong_xiao_xi_id).toBe(被引用ID)
  })

  it('服务端未下发该键时读为 undefined 而不是编造空串（缺失 ≠ 引用了空气）', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        cheng_gong: true,
        shu_ju: {
          lie_biao: [
            {
              id: 'm2',
              hui_hua_id: 会话ID,
              fa_song_zhe_id: 'u1',
              fa_song_zhe_lei_xing: 'yonghu',
              nei_rong: '老消息',
              lei_xing: 'wenben',
              shi_jian_chuo: 1700000000000,
              yi_du: true,
            },
          ],
          zong_shu: 1,
        },
      },
    } as never)
    const jieGuo = await huoQuXiaoXi(会话ID)
    expect(jieGuo.lie_biao[0].bei_yong_xiao_xi_id).toBeUndefined()
  })
})
