










































































































































































































































































































      io: vi.fn(() => ({
        on: vi.fn((shiJian: string, huiDiao: (shuJu: unknown) => void) => {
          jianTing.set(shiJian, huiDiao)
        }),
        connected: false,
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      })),
    }))
    vi.doMock('@/stores/用户', () => ({
      使用用户仓库: () => ({ keGuanLiZhiDu, nengLieBiao: [] }),
    }))
    return jianTing
  }

  it('普通玩家（非管理员）建立socket后监听已注册且能收到增量', async () => {
    const jianTing = zhuCeMocks(false)
    const { 使用聊天仓库: cangKu } = await import('@/stores/聊天')
    setActivePinia(createPinia())
    const 仓库 = cangKu()
    仓库.lianJieSocket('j-9')
    expect(jianTing.has('好感度增量')).toBe(true)
    await 仓库.jiaZaiXiaoXi('j-9')
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual(wuWei())
    jianTing.get('好感度增量')!(
      zengLiangShiJian('e-wan', { zong_fen_bian_hua: 2, jiao_se_id: 'j-9' }),
    )
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual(wuWei({ zongFen: 2 }))
  })

  it('管理员监控订阅保持门槛：非管理员不注册管理员事件', async () => {
    const jianTing = zhuCeMocks(false)
    const { 使用聊天仓库: cangKu } = await import('@/stores/聊天')
    setActivePinia(createPinia())
    const 仓库 = cangKu()
    仓库.lianJieSocket('j-9')
    expect(jianTing.has('管理员_构建过程')).toBe(false)
    expect(jianTing.has('好感度增量')).toBe(true)
  })
})
