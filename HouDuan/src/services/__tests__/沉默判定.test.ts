import { describe, expect, it } from 'vitest'
import {
  是纯应答词,
  是问句,
  是情绪句,
  是求助句,
  是约后句,
  算回应必要性等级,
  升级等级,
  可不回,
  算时光秒,
  转换时光毫秒,
  type 回应参数,
} from '../沉默判定'

function 造参数(覆盖: Partial<回应参数> = {}): 回应参数 {
  return {
    用户消息: '在吗',
    上条角色消息存在: true,
    上条用户消息: '',
    上条用户等级: null,
    本轮连发条数: 1,
    必答事实中继: false,
    当前时分睡前: false,
    ...覆盖,
  }
}

describe('纯应答词判定', () => {
  it.each(['嗯', '嗯嗯', '哦', '好', '好的', '行', '收到', '知道了', '确实', '有道理', '晚安', '哈哈', '在', '拜拜'])('%s 是纯应答词', (词) => {
    expect(是纯应答词(词)).toBe(true)
  })

  it.each(['嗯？', '好呀', '不好', '嗯什么', '是的呢'])('%s 不是纯应答词', (词) => {
    expect(是纯应答词(词)).toBe(false)
  })

  it('空串与超长串都不是', () => {
    expect(是纯应答词('')).toBe(false)
    expect(是纯应答词('嗯嗯嗯嗯嗯嗯嗯嗯嗯嗯')).toBe(false)
    expect(是纯应答词(null as never)).toBe(false)
  })
})

describe('句式判定', () => {
  it.each(['在吗', '你吃什么', '几点了', '为什么呀', '是不是'])('%s 是问句', (句) => {
    expect(是问句(句)).toBe(true)
  })
  it.each(['今天好累', '我想你了', '有点难受', '气死我了'])('%s 是情绪句', (句) => {
    expect(是情绪句(句)).toBe(true)
  })
  it.each(['帮我个忙', '怎么办啊', '求你了', '想问你个事'])('%s 是求助句', (句) => {
    expect(是求助句(句)).toBe(true)
  })
  it.each(['有空吗', '一起吃饭', '几点见面', '周末出来'])('%s 是约后句', (句) => {
    expect(是约后句(句)).toBe(true)
  })
  it.each(['今天天气不错', '刚吃完饭', '在看剧'])('%s 都不是', (句) => {
    expect(是问句(句)).toBe(false)
    expect(是求助句(句)).toBe(false)
  })
})

describe('回应必要性等级', () => {
  it('纯应答词且短 → 0', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '嗯' }))).toBe(0)
    expect(算回应必要性等级(造参数({ 用户消息: '好的' }))).toBe(0)
  })

  it('对话开头必是 3', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '嗯', 上条角色消息存在: false }))).toBe(3)
  })

  it('必答事实中继必是 3', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '嗯', 必答事实中继: true }))).toBe(3)
  })

  it('情绪句必是 3，哪怕很短', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '想你' }))).toBe(3)
  })

  it.each(['在吗', '你吃了吗', '帮个忙', '周末出来玩'])('%s 是 2', (句) => {
    expect(算回应必要性等级(造参数({ 用户消息: 句 }))).toBe(2)
  })

  it('短陈述 → 1', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '刚吃完饭' }))).toBe(1)
    expect(算回应必要性等级(造参数({ 用户消息: '在看剧' }))).toBe(1)
  })

  it('长消息 → 2', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '今天发生了一件事情，我跟你讲讲，事情是这样的' }))).toBe(2)
  })

  it('连发 3 条强制 3（刷屏必须回）', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '嗯', 本轮连发条数: 3 }))).toBe(3)
  })
})

describe('升级与保险', () => {
  it('上轮已不回 → 至少 1', () => {
    expect(升级等级(0, true, false, false)).toBe(1)
  })

  it('有追问 → 至少 2', () => {
    expect(升级等级(0, false, true, false)).toBe(2)
    expect(升级等级(1, false, true, false)).toBe(2)
  })

  it('睡前 → 最高 1', () => {
    expect(升级等级(3, false, false, true)).toBe(1)
    expect(升级等级(1, false, false, true)).toBe(1)
  })

  it('升级顺序：追问优先于睡前封顶', () => {
    expect(升级等级(3, false, true, true)).toBe(3)
    expect(升级等级(1, false, true, true)).toBe(2)
  })

  it('不升级时保持原等级', () => {
    expect(升级等级(2, false, false, false)).toBe(2)
  })

describe('连续沉默上限', () => {
  it('已经连续沉默过 1 次后，本轮即便像纯应答也必须回（至少 2）', () => {
    expect(升级等级(0, false, false, false, 1)).toBe(2)
    expect(升级等级(1, false, false, false, 1)).toBe(2)
  })

  it('没有沉默过时行为不变', () => {
    expect(升级等级(0, false, false, false, 0)).toBe(0)
    expect(升级等级(1, false, false, false, 0)).toBe(1)
  })
})

})

describe('可不回', () => {
  it('0 和 1 可不回，2 和 3 不可', () => {
    expect(可不回(0)).toBe(true)
    expect(可不回(1)).toBe(true)
    expect(可不回(2)).toBe(false)
    expect(可不回(3)).toBe(false)
  })
})

describe('时光秒数', () => {
  it('等级 0 用纯应答时长', () => {
    expect(算时光秒(0, false, false)).toBe(1.5)
  })

  it('等级 2 以上用状态差时长', () => {
    expect(算时光秒(2, false, false)).toBe(3.5)
    expect(算时光秒(3, false, false)).toBe(3.5)
  })

  it('等级 1 按关系深浅', () => {
    expect(算时光秒(1, false, true)).toBe(2)
    expect(算时光秒(1, false, false)).toBe(1)
  })

  it('状态差时保底 3.5 秒', () => {
    expect(算时光秒(0, true, false)).toBe(3.5)
    expect(算时光秒(1, true, true)).toBe(3.5)
  })
})

describe('时光毫秒转换', () => {
  it('秒转毫秒', () => {
    expect(转换时光毫秒(1.5)).toBe(1500)
    expect(转换时光毫秒(4)).toBe(4000)
  })

  it('越界钳制到配置区间', () => {
    expect(转换时光毫秒(0.1)).toBe(1500)
    expect(转换时光毫秒(100)).toBe(4000)
  })

  it('非数字兜底到下限', () => {
    expect(转换时光毫秒(Number.NaN)).toBe(1500)
  })
})

describe('必答事实中继强制最高等级', () => {
  it('即使消息像纯应答，必答事实也直接判 3', () => {
    expect(算回应必要性等级(造参数({ 用户消息: '嗯', 必答事实中继: true }))).toBe(3)
  })
})

describe('连发刷屏强制升级', () => {
  it('连发达到配置上限时直接判 3', () => {
    expect(算回应必要性等级(造参数({ 本轮连发条数: 3 }))).toBe(3)
  })
})
