import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用聊天仓库 } from '@/stores/聊天'
import { biaoJiYiDu, faSongXiaoXi, huoQuJiaoSeXiangQing, huoQuXiaoXi } from '@/api/聊天'
import type { 消息 } from '@/types/类型定义'

vi.mock('@/api/聊天', async (yuanShi) => {
  const 实际 = await yuanShi<typeof import('@/api/聊天')>()
  return {
    ...实际,
    faSongXiaoXi: vi.fn(),
    shangChuanMeiTi: vi.fn(),
    huoQuXiaoXi: vi.fn(),
    huoQuJiaoSeXiangQing: vi.fn(),
    biaoJiYiDu: vi.fn(),
  }
})

function 延迟信使<T>() {
  let 兑付!: (zhi: T) => void
  let 婉拒!: (yin: unknown) => void
  const 约定 = new Promise<T>((兑, 拒) => {
    兑付 = 兑
    婉拒 = 拒
  })
  return { 约定, 兑付, 婉拒 }
}

function 服务端消息(fuGai: Partial<消息> = {}): 消息 {
  return {
    id: 'fu-wu-qi-xin',
    hui_hua_id: 'hui-1',
    fa_song_zhe_id: 'yong-1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: false,
    ...fuGai,
  }
}

function 唯一用户消息(仓库: ReturnType<typeof 使用聊天仓库>): 消息 {
  const 项 = 仓库.xiaoXiLieBiao.find((m) => m.fa_song_zhe_lei_xing === 'yonghu')
  expect(项).toBeDefined()
  return 项 as 消息
}

async function 等待微任务(ciShu = 4) {
  for (let ci = 0; ci < ciShu; ci++) await Promise.resolve()
}

function 回应(canShu: unknown, fuGai: Partial<消息>) {
  const miDengJian = (canShu as { miDengJian?: string }).miDengJian ?? null
  return {
    xiaoXi: 服务端消息({ mi_deng_jian: miDengJian, ...fuGai }),
    shiMiJi: false,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('FP-04 发送并发与幂等去重', () => {
  it('连发两条文本时第二条立即出站，不被第一条串行阻塞', async () => {
    const diYi = 延迟信使<{ xiaoXi: 消息 }>()
    const diEr = 延迟信使<{ xiaoXi: 消息 }>()
    vi.mocked(faSongXiaoXi)
      .mockReturnValueOnce(diYi.约定 as never)
      .mockReturnValueOnce(diEr.约定 as never)
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-1'
    const renWu1 = 仓库.faSongXiaoXi('第一条')
    const renWu2 = 仓库.faSongXiaoXi('第二条')
    await 等待微任务()
    expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    const jian1 = (vi.mocked(faSongXiaoXi).mock.calls[0][0] as { miDengJian: string }).miDengJian
    const jian2 = (vi.mocked(faSongXiaoXi).mock.calls[1][0] as { miDengJian: string }).miDengJian
    diYi.兑付({
      xiaoXi: 服务端消息({ id: 'f-1', nei_rong: '第一条', mi_deng_jian: jian1 }),
      shiMiJi: false,
    } as never)
    await renWu1
    expect(仓库.xiaoXiLieBiao.filter((m) => m.nei_rong === '第一条')).toHaveLength(1)
    expect(仓库.xiaoXiLieBiao.find((m) => m.nei_rong === '第二条')?.fa_song_zhong).toBe(true)
    diEr.兑付({
      xiaoXi: 服务端消息({ id: 'f-2', nei_rong: '第二条', mi_deng_jian: jian2 }),
      shiMiJi: false,
    } as never)
    await renWu2
    expect(仓库.xiaoXiLieBiao.filter((m) => m.fa_song_zhe_lei_xing === 'yonghu')).toHaveLength(2)
    expect(仓库.xiaoXiLieBiao.find((m) => m.nei_rong === '第二条')?.id).toBe('f-2')
  })

  it('同一消息在途时重试复用在途请求，不重复出站', async () => {
    vi.mocked(faSongXiaoXi).mockRejectedValueOnce(new Error('首次失败'))
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-1'
    await 仓库.faSongXiaoXi('待重试消息')
    const qiPao = 唯一用户消息(仓库)
    const id = qiPao.ke_hu_duan_id as string
    const zaiTu = 延迟信使<{ xiaoXi: 消息 }>()
    vi.mocked(faSongXiaoXi).mockReturnValueOnce(zaiTu.约定 as never)
    const chongShi1 = 仓库.chongShiFaSongXiaoXi(id)
    仓库.faSongShiBaiJiHe.add(id)
    const chongShi2 = 仓库.chongShiFaSongXiaoXi(id)
    await 等待微任务()
    const jian = (vi.mocked(faSongXiaoXi).mock.calls[1][0] as { miDengJian: string }).miDengJian
    zaiTu.兑付({
      xiaoXi: 服务端消息({ id: 'f-3', nei_rong: '待重试消息', mi_deng_jian: jian }),
      shiMiJi: false,
    } as never)
    expect(await chongShi1).toBe(true)
    expect(await chongShi2).toBe(true)
    expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    expect(仓库.faSongShiBaiJiHe.has(id)).toBe(false)
    expect(仓库.xiaoXiLieBiao.filter((m) => m.nei_rong === '待重试消息')).toHaveLength(1)
  })
})

describe('FP-04 幂等键严格校验', () => {
  it('服务端缺失幂等键时不假成功：乐观项摘除、标失败可重试、无双气泡', async () => {
    vi.mocked(faSongXiaoXi).mockImplementation((canShu) =>
      Promise.resolve(回应(canShu, { id: 'f-nokey', nei_rong: '无键消息', mi_deng_jian: null })) as never,
    )
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-1'
    await 仓库.faSongXiaoXi('无键消息')
    const lieBiao = 仓库.xiaoXiLieBiao.filter((m) => m.fa_song_zhe_lei_xing === 'yonghu')
    expect(lieBiao).toHaveLength(1)
    expect(lieBiao[0].id).toBe('f-nokey')
    expect(lieBiao[0].fa_song_zhong).toBeFalsy()
    const id = lieBiao[0].ke_hu_duan_id as string
    expect(仓库.faSongShiBaiJiHe.has(id)).toBe(true)
    vi.mocked(faSongXiaoXi).mockImplementationOnce(
      (canShu) => Promise.resolve(回应(canShu, { id: 'f-nokey-2', nei_rong: '无键消息' })) as never,
    )
    expect(await 仓库.chongShiFaSongXiaoXi(id)).toBe(true)
    expect(仓库.faSongShiBaiJiHe.has(id)).toBe(false)
    expect(仓库.xiaoXiLieBiao.find((m) => m.ke_hu_duan_id === id)?.id).toBe('f-nokey-2')
  })

  it('服务端回传不同幂等键时不并排双气泡且可重试', async () => {
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: 服务端消息({
        id: 'f-other',
        nei_rong: '错键消息',
        mi_deng_jian: '99999999-9999-4999-8999-999999999999',
      }),
      shiMiJi: false,
    } as never)
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-1'
    await 仓库.faSongXiaoXi('错键消息')
    const lieBiao = 仓库.xiaoXiLieBiao.filter((m) => m.fa_song_zhe_lei_xing === 'yonghu')
    expect(lieBiao).toHaveLength(1)
    expect(lieBiao[0].id).toBe('f-other')
    const id = lieBiao[0].ke_hu_duan_id as string
    expect(仓库.faSongShiBaiJiHe.has(id)).toBe(true)
    vi.mocked(faSongXiaoXi).mockImplementationOnce(
      (canShu) => Promise.resolve(回应(canShu, { id: 'f-other-2', nei_rong: '错键消息' })) as never,
    )
    expect(await 仓库.chongShiFaSongXiaoXi(id)).toBe(true)
    expect(仓库.faSongShiBaiJiHe.has(id)).toBe(false)
  })

  it('服务端回传相同幂等键时按本条对齐并清除失败态', async () => {
    vi.mocked(faSongXiaoXi).mockImplementation(
      (canShu) => Promise.resolve(回应(canShu, { id: 'f-match', nei_rong: '对齐消息' })) as never,
    )
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-1'
    await 仓库.faSongXiaoXi('对齐消息')
    const qiPao = 唯一用户消息(仓库)
    expect(qiPao.id).toBe('f-match')
    expect(qiPao.fa_song_zhong).toBeFalsy()
    expect(仓库.faSongShiBaiJiHe.size).toBe(0)
  })
})

describe('FP-04 会话切换与发送隔离', () => {
  it('切换会话后旧会话在途发送不串扰，新会话可立即发送', async () => {
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: [],
      zong_shu: 0,
      hai_you_geng_duo: false,
    } as never)
    vi.mocked(huoQuJiaoSeXiangQing).mockResolvedValue({
      jiao_se: { id: 'jue-1', wei_xin_ming: '小玄' },
      dang_an_zhuang_tai: null,
    } as never)
    vi.mocked(biaoJiYiDu).mockResolvedValue(undefined as never)
    const zaiTu = 延迟信使<{ xiaoXi: 消息 }>()
    const xin = 延迟信使<{ xiaoXi: 消息 }>()
    vi.mocked(faSongXiaoXi)
      .mockReturnValueOnce(zaiTu.约定 as never)
      .mockReturnValueOnce(xin.约定 as never)
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('hui-1')
    const renWu1 = 仓库.faSongXiaoXi('旧会话消息')
    await 等待微任务()
    const jian1 = (vi.mocked(faSongXiaoXi).mock.calls[0][0] as { miDengJian: string }).miDengJian
    await 仓库.jiaZaiXiaoXi('hui-2')
    const renWu2 = 仓库.faSongXiaoXi('新消息')
    await 等待微任务()
    expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    const jian2 = (vi.mocked(faSongXiaoXi).mock.calls[1][0] as { miDengJian: string }).miDengJian
    xin.兑付({
      xiaoXi: 服务端消息({ id: 'f-new', hui_hua_id: 'hui-2', nei_rong: '新消息', mi_deng_jian: jian2 }),
      shiMiJi: false,
    } as never)
    await renWu2
    expect(仓库.xiaoXiLieBiao.some((m) => m.id === 'f-new')).toBe(true)
    zaiTu.兑付({
      xiaoXi: 服务端消息({ id: 'f-old', hui_hua_id: 'hui-1', nei_rong: '旧会话消息', mi_deng_jian: jian1 }),
      shiMiJi: false,
    } as never)
    await renWu1
    expect(仓库.xiaoXiLieBiao.some((m) => m.id === 'f-old')).toBe(false)
    expect(仓库.xiaoXiLieBiao.some((m) => m.nei_rong === '旧会话消息')).toBe(false)
    expect(仓库.cuoWuXinXi).toBeNull()
  })

  it('切换会话时在途发送失败不再污染新会话错误与失败集合', async () => {
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: [],
      zong_shu: 0,
      hai_you_geng_duo: false,
    } as never)
    vi.mocked(huoQuJiaoSeXiangQing).mockResolvedValue({
      jiao_se: { id: 'jue-1', wei_xin_ming: '小玄' },
      dang_an_zhuang_tai: null,
    } as never)
    vi.mocked(biaoJiYiDu).mockResolvedValue(undefined as never)
    const zaiTu = 延迟信使<never>()
    vi.mocked(faSongXiaoXi).mockReturnValueOnce(zaiTu.约定 as never)
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('hui-1')
    const renWu1 = 仓库.faSongXiaoXi('将失败的旧消息')
    await 等待微任务()
    await 仓库.jiaZaiXiaoXi('hui-2')
    zaiTu.婉拒(new Error('旧会话网络失败'))
    await renWu1
    expect(仓库.faSongShiBaiJiHe.size).toBe(0)
    expect(仓库.cuoWuXinXi).toBeNull()
  })
})

describe('FP-04 管理员监控存档清理', () => {
  it('存档写入会话级 sessionStorage，键数超上限后清理最旧', () => {
    for (let xuHao = 0; xuHao < 20; xuHao++) {
      sessionStorage.setItem(
        `guanli-jiankong-huihua:jui-${xuHao}`,
        JSON.stringify({
          cun_dang_shi_jian: 1000 + xuHao,
          gouJian: [],
          haoGanDu: [],
          yinCang: [],
          shenDuSiKao: [],
        }),
      )
    }
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-xin'
    仓库.xiaoXiLieBiao = [
      { id: 'nei-1', lei_xing: 'neiXinHuoDong', nei_rong: '内心活动', shi_jian_chuo: 5 } as 消息,
    ]
    仓库.补全旧内心消息()
    const jian = Object.keys(sessionStorage).filter((k) => k.startsWith('guanli-jiankong-huihua:'))
    expect(jian).toHaveLength(20)
    expect(jian).toContain('guanli-jiankong-huihua:hui-xin')
    expect(jian).not.toContain('guanli-jiankong-huihua:jui-0')
  })

  it('旧版 localStorage 监控键被清扫且偏好键保留', () => {
    localStorage.setItem('guanli-jiankong:jiu-hui-hua', JSON.stringify({ gouJian: [] }))
    localStorage.setItem('guanli-jiankong:fu-chuang', '{}')
    localStorage.setItem('guanli-jiankong:pian-hao', '{}')
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'hui-qian-yi'
    仓库.xiaoXiLieBiao = [
      { id: 'nei-2', lei_xing: 'neiXinHuoDong', nei_rong: '内心活动二', shi_jian_chuo: 6 } as 消息,
    ]
    仓库.补全旧内心消息()
    expect(localStorage.getItem('guanli-jiankong:jiu-hui-hua')).toBeNull()
    expect(localStorage.getItem('guanli-jiankong:fu-chuang')).toBe('{}')
    expect(localStorage.getItem('guanli-jiankong:pian-hao')).toBe('{}')
    expect(sessionStorage.getItem('guanli-jiankong-huihua:hui-qian-yi')).not.toBeNull()
  })
})
