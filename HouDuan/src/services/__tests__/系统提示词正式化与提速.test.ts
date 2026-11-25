import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 安全审核源 = readFileSync(resolve(__dirname, '..', 'Prompt构建器.ts'), 'utf8')
const 缓存源 = readFileSync(resolve(__dirname, '..', '好感度缓存.ts'), 'utf8')
const 调度源 = readFileSync(resolve(__dirname, '..', 'AI回复调度器.ts'), 'utf8')

function 截取(源: string, 起点: string, 长度 = 2000): string {
  const i = 源.indexOf(起点)
  if (i < 0) throw new Error(`没找到：${起点}`)
  return 源.slice(i, i + 长度)
}

describe('安全审核提示词必须是正式措辞', () => {
  const 段 = 截取(安全审核源, 'export function gouJianAnQuanShenHePrompt', 1800)

  it('不再出现口语化的「瞅一眼」「踩线」', () => {
    expect(段).not.toContain('瞅一眼')
    expect(段).not.toContain('踩线')
  })

  it('使用正式的任务式表述', () => {
    expect(段).toContain('任务：判定给定消息是否违反内容安全策略')
    expect(段).toContain('判定范围')
    expect(段).toContain('判定原则')
  })

  it('五类违规逐条列明', () => {
    for (const 类 of ['人身攻击', '性别歧视', '种族歧视', '性骚扰', '死亡威胁']) {
      expect(段).toContain(类)
    }
  })

  it('明确写出确信度门槛与宽容原则', () => {
    expect(段).toContain('0.8')
    expect(段).toContain('无法确定时判为不违规')
  })

  it('输出格式要求只输出 JSON', () => {
    expect(段).toContain('仅输出 JSON')
  })
})

describe('好感度目标曲线按 5 分钟一把校准', () => {
  it('默认目标轮数从 35 降到 12', () => {
    expect(缓存源).toContain("HAO_GAN_DU_MU_BIAO_LUN_SHU")
    const 段 = 截取(缓存源, 'export function jiSuanMuBiaoQuXian', 600)
    expect(段).toContain('return 12')
    expect(段).not.toContain('35 - huDongCiShu')
  })

  it('目标轮数可由环境变量覆盖，且有上下限保护', () => {
    const 段 = 截取(缓存源, 'export function jiSuanMuBiaoQuXian', 600)
    expect(段).toContain('yuan < 3')
    expect(段).toContain('Math.min(80')
  })

  it('成长系数上限提高，追赶时加速更明显', () => {
    const 段 = 截取(缓存源, 'if (pingJun < daBiaoXian)', 700)
    expect(段).toContain('1.5 + lianXuWeiDaBiao * 0.25')
    expect(段).toContain('2.8')
  })
})

describe('日程生成不再阻塞回复', () => {
  it('准备日程改为后台执行，不 await 在主链路上', () => {
    const 位置 = 调度源.indexOf('void (async () => {')
    expect(位置).toBeGreaterThan(-1)
    const 段 = 调度源.slice(位置, 位置 + 700)
    expect(段).toContain('zhunBeiRiCheng')
    expect(段).toContain('await zhunBeiRiCheng')
  })

  it('日程准备失败只记警告，不影响本轮', () => {
    const 位置 = 调度源.indexOf('void (async () => {')
    const 段 = 调度源.slice(位置, 位置 + 900)
    expect(段).toContain('日程准备失败，不影响本轮回复')
  })
})

describe('好感度评判异步化', () => {
  it('好感度更新不再阻塞消息发送', () => {
    expect(调度源).toContain('异步应用好感度结果')
    expect(调度源).toContain('异步刷新关系阶段跃迁')
    expect(调度源).toContain('排队好感评判')
    expect(调度源).toContain('好感异步队列')
    const 段 = 截取(调度源, 'this.排队好感评判(async () => {', 400)
    expect(段).toContain('await this.更新好感度')
  })

  it('异步失败只记警告，不抛出影响已发消息', () => {
    expect(调度源).toContain('异步好感度链路失败，不影响已发出的回复')
  })
})

describe('好感度按「对方舒不舒服」分档', () => {
  const 取评分段 = () => 截取(安全审核源, '【核心判断标准——只看这一条', 2200)

  it('判断标准统一为对方舒不舒服，不用抽象情商标签', () => {
    const 段 = 取评分段()
    expect(段).toContain('舒不舒服')
    expect(段).toContain('在微信上收到这句话，心里是什么感觉')
  })

  it('低情商也保留少量加分空间，不是只有零分或负分', () => {
    const 段 = 取评分段()
    expect(段).toContain('低情商但不出错，照样有少量加分')
    expect(段).toContain('总分约 +4~+12')
    expect(段).toContain('低情商不等于零分或负分')
  })

  it('分档覆盖从极度舒服到极度反感，梯度完整', () => {
    const 段 = 取评分段()
    for (const 锚 of ['+50~+58', '+38~+50', '+28~+40', '+14~+24', '+4~+12', '±2', '-12~-26', '-34~-46', '-52~-58']) {
      expect(段).toContain(锚)
    }
  })

  it('高情商必须有明显回报，能拉开与普通人的差距', () => {
    const 段 = 取评分段()
    expect(段).toContain('情场高手的水平，关系推进最快')
    expect(段).toContain('高情商必须有明显回报')
  })

  it('真正的扣分只发生在让人不舒服时', () => {
    const 段 = 取评分段()
    expect(段).toContain('真正扣分的是让人不舒服')
  })
})
