import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { 拉取复盘, 生成复盘 } = vi.hoisted(() => ({ 拉取复盘: vi.fn(), 生成复盘: vi.fn() }))

vi.mock('@/api/聊天', async () => ({
  ...await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天'),
  huoQuFuPan: 拉取复盘,
  shengChengFuPan: 生成复盘,
}))

import { 复盘状态, type 复盘响应 } from '@/api/聊天'
import { use复盘 } from '@/composables/use复盘'
import type { 消息 } from '@/types/类型定义'

function xiaoXi(id: string, fuGai: Record<string, unknown> = {}): 消息 {
  return { id, hui_hua_id: 'j-1', fa_song_zhe_id: 'u-1', fa_song_zhe_lei_xing: 'yonghu', nei_rong: id, lei_xing: 'wenben', shi_jian_chuo: 1, yi_du: true, ...fuGai } as 消息
}

function xiangYing(fuGai: Partial<复盘响应> = {}): 复盘响应 {
  return { fu_pan_nei_rong: null, fu_pan_shi_jian_xian: [], fu_pan_pi_zhu: [], jun_shi_zhi_dao_ji_lu: [], guan_jian_shi_jian: [], jia_zai_zhong: false, fu_pan_zhuang_tai: 复盘状态.已完成, ...fuGai }
}

function chuangJian(lieBiao: 消息[] = []) {
  return use复盘({ luYou: { push: vi.fn() }, huoQuXiaoXiLieBiao: () => lieBiao, qingKongZhuangTai: vi.fn() })
}

async function jiaZai(fuPan: ReturnType<typeof chuangJian>, huiFu: Partial<复盘响应>) {
  拉取复盘.mockResolvedValueOnce(xiangYing(huiFu))
  await fuPan.jiaZaiFuPanShuJu('d-1')
}

afterEach(() => {
  vi.useRealTimers()
  拉取复盘.mockReset()
  生成复盘.mockReset()
})

describe('FP03 批注只按后端映射', () => {
  it('撤回与内心消息影响本地顺序时也不改变批注归属，连发多ID共享一个段点评', async () => {
    const fuPan = chuangJian([xiaoXi('xinli', { lei_xing: 'neiXinHuoDong' }), xiaoXi('a'), xiaoXi('b'), xiaoXi('hui', { yi_che_hui: true }), xiaoXi('c')])
    await jiaZai(fuPan, {
      fu_pan_nei_rong: '对象类型：正常',
      fu_pan_pi_zhu: [],
      fu_pan_duan: [
        { xu_hao: 1, nei_rong: 'a b', xiao_xi_ids: ['a', 'b'], pi_zhu: { xu_hao: 1, ping_lun: '合并段点评', qing_gan: '中性' } },
        { xu_hao: 2, nei_rong: 'c', xiao_xi_ids: ['c'], pi_zhu: { xu_hao: 2, ping_lun: '第二段点评', qing_gan: '积极' } },
      ],
    })
    expect(fuPan.huoQuPiZhuByXiaoXiId('a')?.nei_rong).toBe('合并段点评')
    expect(fuPan.huoQuPiZhuByXiaoXiId('b')?.nei_rong).toBe('合并段点评')
    expect(fuPan.huoQuPiZhuByXiaoXiId('c')?.nei_rong).toBe('第二段点评')
    expect(fuPan.huoQuPiZhuByXiaoXiId('xinli')).toBeNull()
    expect(fuPan.huoQuPiZhuByXiaoXiId('hui')).toBeNull()
  })

  it('旧批注缺ID时不按本地序号猜测', async () => {
    const fuPan = chuangJian([xiaoXi('c'), xiaoXi('a')])
    await jiaZai(fuPan, { fu_pan_nei_rong: '对象类型：正常', fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '历史批注' }], legacy_pi_zhu_ke_ding_wei: false })
    expect(fuPan.huoQuPiZhuByXiaoXiId('c')).toBeNull()
    expect(fuPan.huoQuPiZhuByXiaoXiId('a')).toBeNull()
  })

  it('新格式默认只展开后端标记的最近组，可展开所有更早段且保留总数', async () => {
    const fuPan = chuangJian()
    const zuZao = Array.from({ length: 21 }, (_, i) => ({ xu_hao: i + 1, nei_rong: `段${i + 1}`, xiao_xi_ids: [`id-${i + 1}`], pi_zhu: { xu_hao: i + 1, ping_lun: `短评${i + 1}` } }))
    await jiaZai(fuPan, {
      fu_pan_nei_rong: '用户表现：简短',
      fu_pan_duan: zuZao,
      fu_pan_fen_zu: [{ id: 'early', fan_wei: { qi: 1, zhi: 20 }, duan_lie_biao: zuZao.slice(0, 20), mo_ren_zhan_kai: false }, { id: 'last', fan_wei: { qi: 21, zhi: 21 }, duan_lie_biao: zuZao.slice(20), mo_ren_zhan_kai: true }],
      fu_pan_zong_duan_shu: 21,
      fu_pan_hai_you_geng_duo: true,
    })
    expect(fuPan.keJianPiZhu.value.map((x) => x.xu_hao)).toEqual([21])
    expect(fuPan.yinCangZuShu.value).toBe(1)
    expect(fuPan.haiYouGengDuo.value).toBe(true)
    expect(fuPan.zongDuanShu.value).toBe(21)
    fuPan.zhanKaiQuanBu()
    expect(fuPan.keJianPiZhu.value, JSON.stringify(fuPan.fuPanDuan.value)).toHaveLength(21)
    expect(fuPan.keJianPiZhu.value[0].xu_hao).toBe(1)
    expect(fuPan.keJianPiZhu.value[0].nei_rong).toBe('短评1')
    expect(fuPan.haiYouGengDuo.value).toBe(false)
  })
})

describe('FP03 读取/生成与失败终态', () => {
  it('首次未生成走显式POST而非GET出发生成；成功后按映射存批注', async () => {
    拉取复盘.mockResolvedValueOnce(xiangYing({ fu_pan_zhuang_tai: 复盘状态.未生成 }))
    生成复盘.mockResolvedValueOnce(xiangYing({ fu_pan_nei_rong: '对象类型：正常', fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '开场好', xiao_xi_ids: ['p'] }] }))
    const fuPan = chuangJian()
    await fuPan.jiaZaiFuPanShuJu('d-1')
    expect(拉取复盘).toHaveBeenCalledTimes(1)
    expect(生成复盘).toHaveBeenCalledWith('d-1')
    expect(fuPan.fuPanZongJie.value).toBe('对象类型：正常')
    expect(fuPan.huoQuPiZhuByXiaoXiId('p')).toBeNull()
  })

  it('失败立即结束轮询并显示重试，连续GET失败也停止', async () => {
    vi.useFakeTimers()
    拉取复盘.mockResolvedValue(xiangYing({ fu_pan_zhuang_tai: 复盘状态.生成失败, jia_zai_zhong: true }))
    const fuPan = chuangJian()
    await fuPan.jiaZaiFuPanShuJu('d-1')
    expect(fuPan.fuPanJiaZaiZhong.value).toBe(false)
    expect(fuPan.fuPanShiBai.value).toBe(true)
    expect(拉取复盘).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('生成失败后用户重试才显式POST', async () => {
    拉取复盘.mockResolvedValueOnce(xiangYing({ fu_pan_zhuang_tai: 复盘状态.生成失败 }))
    生成复盘.mockResolvedValueOnce(xiangYing({ fu_pan_nei_rong: '用户表现：已重试' }))
    const fuPan = chuangJian()
    await fuPan.jiaZaiFuPanShuJu('d-1')
    expect(生成复盘).not.toHaveBeenCalled()
    await fuPan.chongShiFuPan()
    expect(生成复盘).toHaveBeenCalledTimes(1)
    expect(fuPan.fuPanShiBai.value).toBe(false)
    expect(fuPan.fuPanZongJie.value).toBe('用户表现：已重试')
  })

  it('轮询只在真正生成中运行，收到失败或无即时结束', async () => {
    vi.useFakeTimers()
    拉取复盘.mockResolvedValueOnce(xiangYing({ fu_pan_zhuang_tai: 复盘状态.生成中, jia_zai_zhong: true })).mockResolvedValueOnce(xiangYing({ fu_pan_zhuang_tai: 复盘状态.生成失败 }))
    const fuPan = chuangJian()
    const renWu = fuPan.jiaZaiFuPanShuJu('d-1')
    await vi.advanceTimersByTimeAsync(3000)
    await renWu
    expect(拉取复盘).toHaveBeenCalledTimes(2)
    expect(fuPan.fuPanShiBai.value).toBe(true)
    expect(fuPan.fuPanJiaZaiZhong.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('FP03 折叠区表现', () => {
  it('折叠按钮与批注列表具备可换行、可访问的展示结构，无固定高度裁切', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const source = fs.readFileSync(path.resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(source).toContain('data-testid="fu-pan-zhan-kai-quan-bu"')
    expect(source).toContain('keJianPiZhu')
    expect(source).toContain('fu-pan-fen-zu')
  })
})
