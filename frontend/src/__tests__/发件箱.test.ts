import { describe, it, expect } from 'vitest'
import { jiaRuFaJianXiang, yiChuFaJianXiang, duQuDaiFaSongShu, chongFaFaJianXiang } from '@/utils/发件箱'
import { baoCunShuJu } from '@/utils/storage'

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
