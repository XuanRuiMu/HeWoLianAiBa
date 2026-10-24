import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { huoQuFanYi } from '@/config/翻译表'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { fenZuXiaoXiAnShiJian, geShiHuaXiaoXiShiJian } from '@/utils/消息时间分组'

const 根 = resolve(__dirname, '..')
const 读 = (xiangDui: string): string => readFileSync(resolve(根, xiangDui), 'utf8')
const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')

describe('零消息时保持微信式空白聊天区', () => {
  it('AI 聊天页不再渲染开场白空态', () => {
    expect(聊天页源).not.toContain('<KongTai')
    expect(聊天页源).not.toContain('haiMeiKaiKou')
    expect(聊天页源).not.toContain('xiaoXiZongShu')
  })

  it('好友聊天成功分支不再按空列表切换，消息区常驻', () => {
    const 成功分支起点 = 好友页源.indexOf('<template v-else>')
    expect(成功分支起点).toBeGreaterThan(-1)
    expect(好友页源).not.toContain('zanWuXiaoXi')
    expect(好友页源).not.toContain('xiaoXiLieBiao.length === 0')
    expect(好友页源).toMatch(/<LiaoTianMianBan[\s\S]{0,200}?yuan-su="main"[\s\S]{0,80}?class="xiaoxi-quyu"/)
    expect(好友页源).not.toMatch(/<LiaoTianMianBan[^>]*v-(if|else)/)
    expect(好友页源.indexOf('<LiaoTianMianBan')).toBeGreaterThan(成功分支起点)
  })

  it('AI 聊天页保留加载骨架、加载失败与失败块内的重试', () => {
    const 骨架起点 = 聊天页源.indexOf('<XiaoXiGuJia')
    const 失败起点 = 聊天页源.indexOf('<div v-else-if="聊天仓库.jiaZaiShiBai"')
    const 列表起点 = 聊天页源.indexOf('<TransitionGroup')
    expect(骨架起点).toBeGreaterThan(-1)
    expect(失败起点).toBeGreaterThan(骨架起点)
    expect(列表起点).toBeGreaterThan(失败起点)
    expect(聊天页源.slice(骨架起点, 失败起点)).toContain('GU_JIA_QI_PAO_PEI_ZHI')
    const 失败块 = 聊天页源.slice(失败起点, 列表起点)
    expect(失败块).toContain('聊天仓库.shouPingQianTaiCuoWu')
    expect(失败块).toContain('@chong-shi="chongShiJiaZai"')
    expect(失败块).toContain('<RequestError')
  })

  it('好友聊天保留非好友分支与失败分支内的重试', () => {
    const 非好友起点 = 好友页源.indexOf('v-if="feiHaoYou"')
    const 失败起点 = 好友页源.indexOf('v-else-if="qianTaiCuoWu"')
    const 成功分支起点 = 好友页源.indexOf('<template v-else>')
    expect(非好友起点).toBeGreaterThan(-1)
    expect(失败起点).toBeGreaterThan(非好友起点)
    expect(成功分支起点).toBeGreaterThan(失败起点)
    const 失败块 = 好友页源.slice(失败起点, 成功分支起点)
    expect(失败块).toContain("huoQuFanYi('haoYou', 'xiaoXiJiaZaiShiBai')")
    expect(失败块).toContain('@chong-shi="chongShi"')
    expect(失败块).toContain('<RequestError')
  })
})

describe('聊天时间分隔按微信五分钟规则', () => {
  const 基准 = Date.UTC(2026, 9, 23, 4, 0, 0)
  const 造 = (pianYiHaoMiao: number) => ({ shi_jian_chuo: 基准 + pianYiHaoMiao })

  it('五分钟内的同一天消息合并到同一时间组', () => {
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(4 * 60 * 1000)])
    expect(组).toHaveLength(1)
    expect(组[0].xiaoXiLieBiao).toHaveLength(2)
  })

  it('恰好五分钟仍并入同一组，边界口径为严格大于', () => {
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(5 * 60 * 1000)])
    expect(组).toHaveLength(1)
    expect(组[0].xiaoXiLieBiao).toHaveLength(2)
  })

  it('超过五分钟另起一组并生成时间条文本', () => {
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(6 * 60 * 1000)])
    expect(组).toHaveLength(2)
    expect(组[1].shiJian.trim().length).toBeGreaterThan(0)
    expect(组[1].shiJianChuo).toBe(基准 + 6 * 60 * 1000)
  })

  it('跨天后即使不足五分钟也另起一组，不吞掉新日期', () => {
    const 昨夜 = Date.UTC(2026, 9, 23, 15, 58, 0)
    const 今晨 = Date.UTC(2026, 9, 23, 16, 2, 0)
    const 组 = fenZuXiaoXiAnShiJian([{ shi_jian_chuo: 昨夜 }, { shi_jian_chuo: 今晨 }])
    expect(组).toHaveLength(2)
    expect(组[1].shiJianChuo).toBe(今晨)
  })

  it('时间倒序时另起一组，不发生负差合并', () => {
    const 组 = fenZuXiaoXiAnShiJian([造(10 * 60 * 1000), 造(0)])
    expect(组).toHaveLength(2)
  })

  it('空列表与单条消息不报错', () => {
    expect(fenZuXiaoXiAnShiJian([])).toEqual([])
    expect(fenZuXiaoXiAnShiJian([造(0)])).toHaveLength(1)
  })

  it('合并阈值与微信一致为五分钟', () => {
    expect(XIAO_XI_PEI_ZHI.heBingShiJianYuZhi).toBe(5 * 60 * 1000)
  })
})

describe('往前数七天内的时间标签显示星期', () => {
  it('周日查看本周三的消息仍显示星期，不退化成日期', () => {
    const 周日 = new Date(2026, 9, 25, 12, 0, 0)
    const 周三 = new Date(2026, 9, 21, 12, 0, 0)
    expect(geShiHuaXiaoXiShiJian(周三, 周日)).toBe(
      `${huoQuFanYi('shiJian', 'xingQiSan')} ${huoQuFanYi('shiJian', 'zhongWu')}12:00`,
    )
  })
})
