import { describe, expect, it, vi, beforeEach } from 'vitest'

// 接入层测试：只验证调度器是否正确触发/填充/容错，历史回想内部逻辑由 历史回想.test.ts 覆盖
const huiXiangMock = vi.hoisted(() => vi.fn())
vi.mock('../历史回想', () => ({
  huiXiangLiShiYuanWen: (...c: unknown[]) => huiXiangMock(...c),
}))

import { shiHuiSuLiShiXiaoXi, huoQuHuiXiangTiShi } from '../AI回复调度器'

describe('FP-04 历史回想接入——触发判定', () => {
  it('回溯类消息判定为真', () => {
    for (const s of [
      '你之前说过喜欢吃火锅',
      '你忘了我们说好的事吗',
      '我记得你说过去年去了海边',
      '上次你说想学做菜来着',
      '还记得那次一起吃饭吗',
      '我之前跟你提过我养猫',
    ]) {
      expect(shiHuiSuLiShiXiaoXi(s), s).toBe(true)
    }
  })

  it('普通消息不触发，避免每条都查库', () => {
    for (const s of ['', '今天天气不错', '那周六呢？', '我有点累', '哈哈哈哈', '你吃了吗']) {
      expect(shiHuiSuLiShiXiaoXi(s), s).toBe(false)
    }
  })

  it('只是提到「之前」但没有回溯动词时不触发', () => {
    expect(shiHuiSuLiShiXiaoXi('之前那个电影还不错')).toBe(false)
  })
})

describe('FP-04 历史回想接入——调用链', () => {
  beforeEach(() => huiXiangMock.mockReset())

  it('回溯类消息会检索并把结果填入回想提示文本', async () => {
    huiXiangMock.mockResolvedValue({
      zhaoDao: true,
      yuanWen: ['我最喜欢麻辣火锅', '上次你说想去长沙玩'],
      buZu: false,
    })
    const 提示 = await huoQuHuiXiangTiShi('你之前说过喜欢吃火锅', 'u-1', 'j-1')
    expect(huiXiangMock).toHaveBeenCalledTimes(1)
    expect(huiXiangMock).toHaveBeenCalledWith('u-1', 'j-1', '你之前说过喜欢吃火锅')
    expect(提示).toContain('【历史回想】')
    expect(提示).toContain('我最喜欢麻辣火锅')
    expect(提示).toContain('上次你说想去长沙玩')
    expect(提示).toContain('照实说没印象')
  })

  it('普通消息不检索、回想提示留空', async () => {
    const 提示 = await huoQuHuiXiangTiShi('今天天气不错', 'u-1', 'j-1')
    expect(提示).toBe('')
    expect(huiXiangMock).not.toHaveBeenCalled()
  })

  it('查不到时回想提示留空（照实说没印象交给提示词层）', async () => {
    huiXiangMock.mockResolvedValue({ zhaoDao: false, yuanWen: [], buZu: true })
    const 提示 = await huoQuHuiXiangTiShi('你之前说过喜欢火锅', 'u-1', 'j-1')
    expect(提示).toBe('')
    expect(huiXiangMock).toHaveBeenCalledTimes(1)
  })

  it('检索异常时吞掉异常、回想提示留空，主链路不受影响', async () => {
    // 检索返回一个会令整理逻辑抛错的结果，验证接入层的 try-catch 吞掉异常
    huiXiangMock.mockResolvedValue({ zhaoDao: true, yuanWen: undefined, buZu: false })
    await expect(huoQuHuiXiangTiShi('你之前说过喜欢火锅', 'u-1', 'j-1')).resolves.toBe('')
  })
})
