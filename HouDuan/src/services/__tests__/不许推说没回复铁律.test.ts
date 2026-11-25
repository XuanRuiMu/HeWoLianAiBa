import { describe, expect, it } from 'vitest'
import { gouJianBuDeTuiShuoWeiHuiFuTieShi, gouJianZhaoHuiYeWanTiShi } from '../Prompt构建器'

describe('不许推说没看到消息的铁律', () => {
  it('铁律层无条件存在，且明确列出所有禁止说法', () => {
    const 铁律 = gouJianBuDeTuiShuoWeiHuiFuTieShi()
    expect(铁律).toContain('不许说自己没看到消息')
    for (const 说法 of ['刚看到你的消息', '昨晚没回你', '睡过头了没回', '手机静音没看见', '忙到现在才看到']) {
      expect(铁律).toContain(说法)
    }
  })

  it('铁律声明与日程、时间、睡眠状态无关，永远成立', () => {
    const 铁律 = gouJianBuDeTuiShuoWeiHuiFuTieShi()
    expect(铁律).toContain('与日程、时间、睡眠状态无关')
    expect(铁律).toContain('永远成立')
  })

  it('睡觉提示不再把「按新的时间说」当成可以摆脱禁令的出口', () => {
    const 睡觉 = gouJianZhaoHuiYeWanTiShi()
    expect(睡觉).toContain('被你吵醒了')
    expect(睡觉).toContain('不要拿“睡过去了所以没看见”当理由')
    expect(睡觉).not.toContain('不必继续装困')
  })

  it('两层提示内容不重复且都非空', () => {
    const 铁律 = gouJianBuDeTuiShuoWeiHuiFuTieShi()
    const 睡觉 = gouJianZhaoHuiYeWanTiShi()
    expect(铁律.length).toBeGreaterThan(0)
    expect(睡觉.length).toBeGreaterThan(0)
    expect(铁律).not.toBe(睡觉)
  })
})
