import { describe, expect, it } from 'vitest'
import { 候选包装 } from '../表情包选取'
import { 初始化表情包库 } from '../表情包库'
import type { BiaoQingZaiTiJueCe } from '../表情包载体'

function 玩梗决策(gengDuo: Partial<BiaoQingZaiTiJueCe> = {}): BiaoQingZaiTiJueCe {
  return {
    geiHouXuan: true,
    yuanYin: '放行',
    yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
    guanXiJieDuanXuHao: 0,
    nianLingDang: '青年',
    qiWangJianGeLunShu: 3,
    shangCiFaTuLunShu: null,
    quXiang: '正常',
    renSheQiZhi: ['沙雕搞怪'],
    yong_hu_xin_xiao_xi: '哈哈哈哈笑死我了',
    ...gengDuo,
  }
}

describe('真实库端到端：冷淡阶段玩梗也要能取到表情包', () => {
  it('文件库路径能返回真实的短名与元数据', async () => {
    await 初始化表情包库()
    const 列表 = await 候选包装('好笑', 8, 玩梗决策())
    console.log('取到候选数', 列表.length)
    console.log(列表.slice(0, 5).map((x) => `${x.duanMing}|${x.qingXuBiaoQian}|${x.mime}`))
    expect(列表.length).toBeGreaterThan(0)
    expect(列表.every((x) => typeof x.duanMing === 'string' && x.duanMing.length > 0)).toBe(true)
    expect(列表.every((x) => /^image\//.test(x.mime))).toBe(true)
  })

  it('气质落不到专属标签时也不返回空', async () => {
    await 初始化表情包库()
    const 列表 = await 候选包装('好笑', 8, 玩梗决策({ renSheQiZhi: ['通用'] }))
    console.log('通用气质取到', 列表.length)
    expect(列表.length).toBeGreaterThan(0)
  })

  it('非玩梗的冷淡阶段仍受关系门槛约束', async () => {
    await 初始化表情包库()
    const 列表 = await 候选包装('好笑', 8, 玩梗决策({ guanXiJieDuanXuHao: 0, geiHouXuan: false, yong_hu_xin_xiao_xi: '今天天气怎么样' }))
    console.log('冷淡非玩梗取到', 列表.length)
    expect(列表.length).toBe(0)
  })

  it('危机场景即使玩梗也不给', async () => {
    await 初始化表情包库()
    const 列表 = await 候选包装('好笑', 8, 玩梗决策({ geiHouXuan: false, yuanYin: '危机' }))
    expect(列表).toEqual([])
  })
})
