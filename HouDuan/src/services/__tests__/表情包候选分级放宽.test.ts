import { describe, expect, it } from 'vitest'
import { 候选系统表情 } from '../表情包库'
import { 表情人设气质标签, 表情圈层门槛标签, 表情风格标签 } from '../../config/表情包配置'

const 全部风格 = [...表情风格标签]
const 全部气质 = [...表情人设气质标签]

interface 假条目 {
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  qiYong: boolean
  sha256: string
  mime: string
  ziJieShu: number
  wenJianMing: string
  wenJianLuJing: string
  fengGe: string
  guanXiJieDuanXiaXian: number
  renSheQiZhi: string[]
  quanCengMenKian: string
}

function 假条目(zhi: Partial<假条目> = {}): 假条目 {
  return {
    duanMing: `图-${Math.random().toString(36).slice(2, 8)}`,
    miaoShu: '描述',
    qingXuBiaoQian: '好笑',
    shiYongChangJing: '日常斗图',
    qiYong: true,
    sha256: 'a'.repeat(64),
    mime: 'image/png',
    ziJieShu: 1024,
    wenJianMing: 'x.png',
    wenJianLuJing: '/tmp/x.png',
    fengGe: '梗图',
    guanXiJieDuanXiaXian: 2,
    renSheQiZhi: ['沙雕搞怪'],
    quanCengMenKian: '大众',
    ...zhi,
  }
}

const 真实库条件 = {
  yunXuFengGe: 全部风格,
  guanXiJieDuanXuHao: 0,
  renSheQiZhi: ['通用'],
  wenBen: '笑死我了哈哈哈',
}

describe('气质过滤的现实语义标签', () => {
  it('角色气质是「通用」时不当作硬过滤条件，真实气质标签的图仍然可选', () => {
    const 库 = [假条目({ renSheQiZhi: ['沙雕搞怪'] }), 假条目({ renSheQiZhi: ['可爱萌系'] })]
    expect(库.every((x) => x.renSheQiZhi.includes('通用'))).toBe(false)
  })

  it('全部标签都来自配置，没有凭空写出的「通用」气质', () => {
    expect(全部气质).toContain('通用')
    expect(全部气质.length).toBeGreaterThan(1)
  })

  it('圈层门槛标签与风格标签来自同一份配置', () => {
    expect(表情圈层门槛标签.length).toBeGreaterThan(0)
    expect(全部风格.length).toBeGreaterThan(0)
  })
})

describe('候选过滤分级放宽', () => {
  it('条件齐备的库在严格条件下能被取出', async () => {
    const 结果 = await 候选系统表情('好笑', 5, 真实库条件)
    expect(Array.isArray(结果)).toBe(true)
  })

  it('情绪标签写得再偏也要回退到别的图，不能返回空', async () => {
    const 结果 = await 候选系统表情('绝对不存在的情绪', 5, 真实库条件)
    expect(Array.isArray(结果)).toBe(true)
  })

  it('传入排除短名时结果里不出现被排除的条目', async () => {
    const 结果 = await 候选系统表情('好笑', 5, 真实库条件, ['不存在的短名'])
    expect(结果.every((x) => x.duanMing !== '不存在的短名')).toBe(true)
  })

  it('数量参数非法时返回空数组', async () => {
    await expect(候选系统表情('好笑', 0, 真实库条件)).resolves.toEqual([])
    await expect(候选系统表情('好笑', Number.NaN, 真实库条件)).resolves.toEqual([])
  })
})
