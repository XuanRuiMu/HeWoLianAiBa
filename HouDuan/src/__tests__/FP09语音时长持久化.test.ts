import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')

const TTS = 读('services/TTS服务.ts')
const 消息 = 读('services/消息.ts')

describe('语音时长从合成落库到消息出参的单一链路', () => {
  it('TTS 合成结果把 duration_ms 传给媒体落库，不再生成 NULL 时长', () => {
    const 调用起 = TTS.indexOf('liuShiBaoCunMeiTi(')
    expect(调用起).toBeGreaterThan(-1)
    const 调用块 = TTS.slice(调用起, 调用起 + 400)
    expect(调用块).toContain('响应.duration_ms')
  })

  it('用户消息回查、角色多媒体落库与撤回回包都取媒体时长列', () => {
    const 列 = 'mf."时长毫秒" AS "媒体时长毫秒"'
    expect(消息).toContain(列)
    const 次数 = 消息.split(列).length - 1
    expect(次数, '至少覆盖按ID回查、发送回查、角色媒体、两次撤回').toBeGreaterThanOrEqual(5)
    expect(消息).toContain('row.媒体时长毫秒 != null ? Number(row.媒体时长毫秒) : null')
  })

  it('历史分页语句早已取该列，无需第二套字段名', () => {
    expect(消息).toContain('mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名"')
  })
})
