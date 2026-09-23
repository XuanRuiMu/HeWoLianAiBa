import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'
import { fenZuXiaoXiAnShiJian, type ShiJianZaiTi } from '@/utils/消息时间分组'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

/**
 * FP-11 语音条守卫（验收点 A + B）。
 * 需求口径由用户裁定：未播放态 = 3 格喇叭跳动 + 时长；播放中 = 进度指示 + 波形采样；
 * 「12 条波形」作废（任何成熟来源都没有它）。几何逐值出处 =
 * .agents/evidence/references/FP-13-语音条-20260921.md（§1-A/§1-B/§1-C、§3、§5、§6）。
 */

const 组件路径 = resolve(process.cwd(), 'src/components/聊天/语音气泡.vue')
const 时间条路径 = resolve(process.cwd(), 'src/components/聊天/时间条.vue')
const 聊天页路径 = resolve(process.cwd(), 'src/views/聊天页面.vue')
const 好友页路径 = resolve(process.cwd(), 'src/views/好友聊天.vue')
const 令牌路径 = resolve(process.cwd(), 'src/styles/variables.css')

function 读源(路径: string): string {
  return readFileSync(路径, 'utf8')
}

const 组件源 = 读源(组件路径)
const 组件样式 = 组件源.slice(组件源.indexOf('<style scoped>'))
const 时间条源 = 读源(时间条路径)
const 聊天页源 = 读源(聊天页路径)
const 好友页源 = 读源(好友页路径)
const 令牌源 = 读源(令牌路径)

function 语音消息(毫秒: number | null): ShiJianZaiTi & { mei_ti_shi_chang_hao_miao?: number | null } {
  return { shi_jian_chuo: Date.now(), mei_ti_shi_chang_hao_miao: 毫秒 }
}

function 挂气泡(覆盖: Record<string, unknown> = {}) {
  return mount(YuYinQiPao, {
    props: {
      xiaoXi: 语音消息(12000),
      boFangZhong: false,
      jinDuMiao: 0,
      zongMiao: 12,
      ...覆盖,
    },
  })
}

/** 从 style 块里抠出某条规则的声明体（只用于解析值断言，不做样式引擎） */
function 取规则体(源文本: string, 选择器: string): string {
  const 起点 = 源文本.indexOf(`${选择器} {`)
  if (起点 < 0) return ''
  const 左括号 = 源文本.indexOf('{', 起点)
  return 源文本.slice(左括号 + 1, 源文本.indexOf('}', 左括号))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('FP-11 验收点 A：语音条两态组件', () => {
  it('未播放态恰好 3 格喇叭 + 时长文本，且不残留任何波形条', () => {
    const 泡 = 挂气泡()
    expect(泡.findAll('.laba-ge')).toHaveLength(3)
    expect(泡.find('.laba-zhezhao').exists()).toBe(true)
    expect(泡.find('.yuyin-shichang').text()).toBe('12″')
    expect(泡.find('.bo-xing-tiao').exists()).toBe(false)
    // 反证一：12 是伪需求 ⇒ 条数既不等于 12，也不存在旧类名
    expect(泡.findAll('.boxing-tiao')).toHaveLength(0)
    expect(泡.findAll('.bo-xing-tiao')).toHaveLength(0)
  })

  it('播放中出波形采样与可拖动进度轴，喇叭与时长退场', () => {
    const 泡 = 挂气泡({ boFangZhong: true, jinDuMiao: 6, zongMiao: 12 })
    expect(泡.find('.laba-zu').exists()).toBe(false)
    expect(泡.findAll('.bo-xing-tiao').length).toBeGreaterThan(0)
    const 轴 = 泡.find('.yuyin-jindu-tiao')
    expect(轴.exists()).toBe(true)
    expect(轴.attributes('type')).toBe('range')
    expect(轴.attributes('max')).toBe('12')
    expect(轴.attributes('aria-label')).toBe(huoQuFanYi('duoMeiTi', 'tiaoZhuanYuYinJinDu'))
    expect(泡.find('.yuyin-jindu-wenben').text()).toBe('6″ / 12″')
  })

  it('波形条数按净宽采样：既不是 12，也随时长变宽而增多', () => {
    const 短 = 挂气泡({ boFangZhong: true, xiaoXi: 语音消息(3000), zongMiao: 3 })
    const 长 = 挂气泡({ boFangZhong: true, xiaoXi: 语音消息(28000), zongMiao: 28 })
    const 短数 = 短.findAll('.bo-xing-tiao').length
    const 长数 = 长.findAll('.bo-xing-tiao').length
    expect(短数).not.toBe(12)
    expect(长数).not.toBe(12)
    expect(长数).toBeGreaterThan(短数)
    // 反证二：与 config 算式逐值相符（(宽度−2×内边距)÷(条宽+间距)），换实现即红
    const 净宽 = (秒: number) =>
      Math.min(
        DUO_MEI_TI_PEI_ZHI.yuYinZuiChangKuanPx,
        Math.max(
          DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanKuanPx,
          秒 * DUO_MEI_TI_PEI_ZHI.yuYinMeiMiaoKuanPx + DUO_MEI_TI_PEI_ZHI.yuYinJiChuKuanPx,
        ),
      ) -
      DUO_MEI_TI_PEI_ZHI.yuYinPaoNeidianPx * 2
    const 槽 = DUO_MEI_TI_PEI_ZHI.yuYinCaoYangTiaoKuanPx + DUO_MEI_TI_PEI_ZHI.yuYinCaoYangJianJuPx
    expect(短数).toBe(Math.max(1, Math.floor(净宽(3) / 槽)))
    expect(长数).toBe(Math.max(1, Math.floor(净宽(28) / 槽)))
  })

  it('气泡宽度随时长单调不降，且不再退回旧的 60→200 插值口径', () => {
    let 上一条宽 = 0
    for (const 秒 of [1, 2, 5, 10, 20, 28, 40, 60]) {
      const 宽 = Number(
        挂气泡({ xiaoXi: 语音消息(秒 * 1000) })
          .find('.yuyin-qipao')
          .attributes('style')!
          .match(/width:\s*(\d+(?:\.\d+)?)px/)![1],
      )
      expect(宽).toBeGreaterThanOrEqual(上一条宽)
      expect(宽).toBeLessThanOrEqual(DUO_MEI_TI_PEI_ZHI.yuYinZuiChangKuanPx)
      上一条宽 = 宽
    }
    // 反证三：20 秒在旧插值口径下是 130px，按取证 §1-A 必须是 220px
    const 二十秒 = 挂气泡({ xiaoXi: 语音消息(20000) }).find('.yuyin-qipao').attributes('style')!
    expect(二十秒).toContain('width: 220px')
    expect(二十秒).not.toContain('width: 130px')
  })

  it('进度推进时已播格数与进度轴读数单调不降、气泡宽度不缩', () => {
    const 序列 = [0, 2.4, 5, 5.9, 8, 11.8, 12]
    let 上次已播 = -1
    let 上次读数 = -1
    let 上次宽度 = 0
    let 总条数 = 0
    for (const 秒 of 序列) {
      const 泡 = 挂气泡({ boFangZhong: true, jinDuMiao: 秒, zongMiao: 12 })
      const 已播 = 泡.findAll('.bo-xing-tiao--yi-bo').length
      总条数 = 泡.findAll('.bo-xing-tiao').length
      const 读数 = Number((泡.find('.yuyin-jindu-tiao').element as HTMLInputElement).value)
      const 宽度 = Number(
        泡.find('.yuyin-qipao').attributes('style')!.match(/width:\s*(\d+(?:\.\d+)?)px/)![1],
      )
      expect(已播).toBeGreaterThanOrEqual(上次已播)
      expect(读数).toBeGreaterThanOrEqual(上次读数)
      expect(宽度).toBeGreaterThanOrEqual(上次宽度)
      上次已播 = 已播
      上次读数 = 读数
      上次宽度 = 宽度
    }
    expect(上次已播).toBe(总条数)
  })

  it('交互：点击气泡只发「切换」意图，拖动进度轴只发「跳转」秒数', async () => {
    const 泡 = 挂气泡()
    await 泡.find('.yuyin-qipao').trigger('click')
    expect(泡.emitted('qieHuan')).toHaveLength(1)
    expect(泡.emitted('tiaoZhuan')).toBeUndefined()

    const 播 = 挂气泡({ boFangZhong: true, jinDuMiao: 1, zongMiao: 12 })
    const 轴 = 播.find('.yuyin-jindu-tiao')
    ;(轴.element as HTMLInputElement).valueAsNumber = 9.5
    await 轴.trigger('input')
    expect(播.emitted('tiaoZhuan')).toEqual([[9.5]])
    expect(播.emitted('qieHuan')).toBeUndefined()
  })

  it('无障碍：气泡是 button、波形装饰对读屏隐藏、进度轴带配置化步长', () => {
    const 泡 = 挂气泡()
    const 气泡 = 泡.find('.yuyin-qipao')
    expect(气泡.element.tagName).toBe('BUTTON')
    expect(气泡.attributes('type')).toBe('button')
    expect(气泡.attributes('aria-label')).toBe(huoQuFanYi('duoMeiTi', 'boFangYuYin'))
    expect(泡.find('.laba-zu').attributes('aria-hidden')).toBe('true')
    expect(泡.find('.bo-xing-zu').exists()).toBe(false)

    const 播 = 挂气泡({ boFangZhong: true })
    expect(播.find('.yuyin-qipao').attributes('aria-label')).toBe(
      huoQuFanYi('duoMeiTi', 'zanTingYuYin'),
    )
    expect(播.find('.bo-xing-zu').attributes('aria-hidden')).toBe('true')
    expect(
      Number(播.find('.yuyin-jindu-tiao').attributes('step')),
    ).toBe(DUO_MEI_TI_PEI_ZHI.yuYinJinDuBuZhouMiao)
  })

  it('减动效退化：跳动与过渡关闭，时长与进度仍完整可读', () => {
    const 减动效块 = 组件样式.slice(组件样式.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(减动效块).toContain('animation: none')
    expect(取规则体(减动效块, '.laba-zhezhao')).toContain('animation: none')
    // 反证四：退化不等于退场——未播态的时长与播放态的进度都必须还在
    expect(挂气泡().find('.yuyin-shichang').text()).toBe('12″')
    const 播 = 挂气泡({ boFangZhong: true, jinDuMiao: 4, zongMiao: 12 })
    expect(播.find('.yuyin-jindu-wenben').text()).toContain('4″')
    expect(播.find('.yuyin-jindu-tiao').exists()).toBe(true)
  })

  it('组件内零像素/色值字面量：所有量纲都吃令牌或 config', () => {
    // 只判声明体（注释里允许写出处数值，那是取证台账不是字面量）
    const 去注释 = (源文本: string) => 源文本.replace(/\/\*[\s\S]*?\*\//g, '')
    const 扫描 = (源文本: string) => {
      const 正文 = 去注释(源文本)
      return [
        ...正文.matchAll(/(?:^|[\s:;,(])(?:-?\d+(?:\.\d+)?)?(?:px|rem|em)\b/g),
        ...正文.matchAll(/#[0-9a-fA-F]{3,8}\b/g),
        ...正文.matchAll(/\brgba?\(/g),
      ].map((匹配) => 匹配[0].trim())
    }
    // 扫描器自身有效性：同一段正则扫页面源码必须命中（否则「组件命中 0」是假绿）
    expect(扫描(聊天页源).length).toBeGreaterThan(0)
    expect(扫描(组件样式)).toEqual([])
    expect(扫描(时间条源.slice(时间条源.indexOf('<style scoped>')))).toEqual([])
  })

  it('几何令牌与 config 同值：一处改数、另一处不改就红', () => {
    const 令牌值 = (名: string) => {
      const 匹配 = 令牌源.match(new RegExp(`--${名}:\\s*([^;]+);`))
      return 匹配 ? 匹配[1].trim() : ''
    }
    expect(令牌值('yuyin-pao-neidian')).toBe(`${DUO_MEI_TI_PEI_ZHI.yuYinPaoNeidianPx}px`)
    expect(令牌值('yuyin-bo-xing-tiao-kuan')).toBe(
      `${DUO_MEI_TI_PEI_ZHI.yuYinCaoYangTiaoKuanPx}px`,
    )
    expect(令牌值('yuyin-bo-xing-jian-ju')).toBe(`${DUO_MEI_TI_PEI_ZHI.yuYinCaoYangJianJuPx}px`)
    expect(令牌值('yuyin-jindu-zui-xiao-kuan')).toBe(
      `${DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanKuanPx}px`,
    )
    // 每条新令牌都要有真实消费者（禁止零消费者令牌）
    for (const 名 of [
      'yuyin-pao-neidian',
      'yuyin-pao-yuanjiao',
      'yuyin-pao-zui-xiao-gao',
      'yuyin-laba-kuan',
      'yuyin-laba-gao',
      'yuyin-laba-jian-ju',
      'yuyin-bo-xing-tiao-kuan',
      'yuyin-bo-xing-jian-ju',
      'yuyin-bo-xing-gao',
      'yuyin-jindu-gao',
      'yuyin-huakuai-chicun',
      'yuyin-re-ku',
      'yuyin-jindu-zui-xiao-kuan',
      'shijian-tiao-neidian-shang-xia',
      'shijian-tiao-neidian-zuo-you',
      'shijian-tiao-yuanjiao',
      'shijian-tiao-xia-jian-ju',
    ]) {
      expect(令牌值(名), `令牌 ${名} 未在 variables.css 定义`).not.toBe('')
      expect(组件源 + 时间条源, `令牌 ${名} 零消费者`).toContain(`var(--${名}`)
    }
  })
})

describe('FP-11 治理面 R5：两页不得再有第二份实现', () => {
  it('两页都引用唯一组件，两页源码里旧内联语音气泡命中 0', () => {
    for (const 页源 of [聊天页源, 好友页源]) {
      expect(页源).toContain("@/components/聊天/语音气泡.vue")
      expect(页源).toContain('<YuYinQiPao')
    }
    for (const 页源 of [聊天页源, 好友页源]) {
      for (const 墓碑 of [
        'yuyin-shengyin-tubiao',
        'YU_YIN_BO_XING_TIAO_SHU',
        '.yuyin-qipao {',
        '.boxing-tiao',
        'boxing-baidong',
        'duomeiti-boxing-tiaokuan',
        'yuYinKuanYangShi(',
      ]) {
        expect(页源, `旧内联实现复活：${墓碑}`).not.toContain(墓碑)
      }
    }
    // 电平计改名自 boxing-*，与语音条再无共享类名/常量
    expect(聊天页源).toContain('luyin-dianping-tiao')
    expect(聊天页源).toContain('LU_YIN_PEI_ZHI.dianPingTiaoShu')
  })

  it('语音气泡全站唯一：除组件文件外没有任何文件绘制喇叭格或波形条', () => {
    const 绘制方 = ['src/views/聊天页面.vue', 'src/views/好友聊天.vue', 'src/views/军师记录详情.vue']
    for (const 路径 of 绘制方) {
      expect(读源(resolve(process.cwd(), 路径)), `第二份实现：${路径}`).not.toMatch(
        /laba-ge|bo-xing-tiao/,
      )
    }
  })
})

describe('FP-11 验收点 B：时间条分档', () => {
  function 组一条(时间戳: number): (ShiJianZaiTi & { id: string })[] {
    return [{ shi_jian_chuo: 时间戳, id: 'x' }]
  }

  function 标签(基准: string, 目标: string): string {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(基准))
    const 组 = fenZuXiaoXiAnShiJian(组一条(new Date(目标).getTime()))
    vi.useRealTimers()
    return 组[0].shiJian
  }

  it('同日→时:分；跨日→昨天；本周内→星期；跨月→MM-DD；跨年→YYYY-MM-DD', () => {
    const 现在 = '2026-07-08T18:30:00+08:00' // 周三
    expect(标签(现在, '2026-07-08T14:05:00+08:00')).toBe('14:05')
    expect(标签(现在, '2026-07-07T14:05:00+08:00')).toBe(
      `${huoQuFanYi('shiJian', 'zuoTian')} 14:05`,
    )
    expect(标签(现在, '2026-07-06T09:00:00+08:00')).toBe(
      `${huoQuFanYi('shiJian', 'xingQiYi')} 09:00`,
    )
    expect(标签(现在, '2026-06-20T09:00:00+08:00')).toBe('06-20 09:00')
    // 反证五：跨年必须带年份，否则两条不同年份的 06-20 会撞成同一个标签
    expect(标签(现在, '2025-06-20T09:00:00+08:00')).toBe('2025-06-20 09:00')
  })

  it('合并阈值内不切新组、超阈值切两组（既有契约不回归）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-08T14:06:00+08:00'))
    const 基准 = new Date('2026-07-08T14:05:00+08:00').getTime()
    const 同组 = fenZuXiaoXiAnShiJian([
      { shi_jian_chuo: 基准 } as ShiJianZaiTi,
      { shi_jian_chuo: 基准 + 59 * 1000 } as ShiJianZaiTi,
    ])
    const 拆组 = fenZuXiaoXiAnShiJian([
      { shi_jian_chuo: 基准 } as ShiJianZaiTi,
      { shi_jian_chuo: 基准 + 61 * 1000 } as ShiJianZaiTi,
    ])
    vi.useRealTimers()
    expect(同组).toHaveLength(1)
    expect(同组[0].xiaoXiLieBiao).toHaveLength(2)
    expect(拆组).toHaveLength(2)
  })

  it('时间条组件：shijian-biaoqian 类名不变、datetime 机器可读、不参与点击', () => {
    const 戳 = new Date('2026-07-08T14:05:00+08:00').getTime()
    const 条 = mount(ShiJianTiao, { props: { shiJian: '14:05', shiJianChuo: 戳 } })
    expect(条.element.tagName).toBe('TIME')
    expect(条.classes()).toContain('shijian-biaoqian')
    expect(条.attributes('datetime')).toBe(new Date(戳).toISOString())
    expect(条.text()).toBe('14:05')
    expect(取规则体(时间条源.slice(时间条源.indexOf('<style scoped>')), '.shijian-biaoqian')).toContain(
      'pointer-events: none',
    )
  })

  it('两页共用同一份时间条与同一份分档实现', () => {
    for (const 页源 of [聊天页源, 好友页源]) {
      expect(页源).toContain('@/components/聊天/时间条.vue')
      expect(页源).toContain('<ShiJianTiao')
    }
    expect(聊天页源).toContain('xiaoXiFenZu')
    expect(好友页源).toContain('fenZuXiaoXiAnShiJian')
    // 分档文案不再由页面自己拼：两页源码里零命中旧的秒/时:分手工格式化出口
    for (const 页源 of [聊天页源, 好友页源]) {
      expect(页源).not.toContain('xingQiLieBiao')
      expect(页源).not.toContain('geShiHuaShiJian')
    }
  })
})
