import { describe, it, expect } from 'vitest'
import {
  chouYuTai,
  gouJianYuTaiKuai,
  panChuFaLei,
  quYuTaiZhiLing,
  quZaiMangWeiShuo,
  shengChengZaiMang,
  zaoSuiJi,
} from '../语态控制器'

describe('触发分类', () => {
  it('纯应答', () => {
    for (const s of ['嗯嗯', '好滴！', '下次约', '有道理', '行啊', '对哈哈哈', '谢谢！！！', '吼']) {
      expect(panChuFaLei(s), s).toBe('纯应答')
    }
  })

  it('是非问', () => {
    for (const s of ['还拉肚子吗', '啊 桐宇你说的是法国的活动吗', '或者五点的时候？不知道是不是你的饭点呀']) {
      expect(panChuFaLei(s), s).toBe('是非问')
    }
  })

  it('分享', () => {
    for (const s of ['刚没在办公室看到你', '其实在会前我有提醒他，这是他熬夜到3点弄的功能']) {
      expect(panChuFaLei(s), s).toBe('分享')
    }
  })
})

describe('语态抽样', () => {
  it('落在区间两端时取到表头和表尾', () => {
    expect(chouYuTai('嗯嗯', () => 0)).toBe('另起')
    expect(chouYuTai('嗯嗯', () => 0.999)).toBe('澄清')
  })

  it('分享型输入的分布对齐真人行为基线', () => {
    const 计: Record<string, number> = {}
    const N = 20000
    for (let i = 0; i < N; i++) {
      const 值 = chouYuTai('刚没在办公室看到你')
      计[值] = (计[值] || 0) + 1
    }
    const 占比 = (k: string) => (计[k] || 0) / N
    // 真人基线（语料实验室/行为类别基线.md，2431 条相邻配对）：
    // 接内容 27.5% ／ 说自己 23.0% ／ 极短 20.5% ／ 另起约 20% ／ 要对方解释 1.1%
    // 旧配置接内容高达 42.3%，是「太像称职好助理」的量化根源。
    expect(占比('接内容')).toBeGreaterThan(0.2)
    expect(占比('接内容')).toBeLessThan(0.35)
    expect(占比('极短')).toBeGreaterThan(0.12)
    expect(占比('极短')).toBeLessThan(0.28)
    expect(占比('说自己')).toBeGreaterThan(0.15)
    expect(占比('另起')).toBeGreaterThan(0.12)
    expect(占比('澄清')).toBeLessThan(0.08)
  })

  it('纯应答几乎不接内容', () => {
    const 计: Record<string, number> = {}
    const N = 20000
    for (let i = 0; i < N; i++) {
      const 值 = chouYuTai('嗯嗯')
      计[值] = (计[值] || 0) + 1
    }
    expect((计['接内容'] || 0) / N).toBeLessThan(0.25)
  })
})

describe('在忙池', () => {
  it('同一种子生成同一组，不同种子会不同', () => {
    const 甲 = shengChengZaiMang(true, zaoSuiJi('j-1'))
    const 乙 = shengChengZaiMang(true, zaoSuiJi('j-1'))
    expect(甲).toEqual(乙)
    expect(甲.length).toBe(5)
    expect(new Set(甲).size).toBe(5)
  })

  it('说过的会被摘掉，换说法也能摘掉', () => {
    const 待办 = shengChengZaiMang(true, zaoSuiJi('j-2'))
    expect(quZaiMangWeiShuo(待办, ['我今天提过' + 待办[0]])).not.toContain(待办[0])
    expect(quZaiMangWeiShuo(待办, 待办).length).toBe(5)

    const 定项 = ['社团招新的材料要收', '在等一个面试结果', '房东说要涨房租']
    const 剩 = quZaiMangWeiShuo(定项, ['社团招新那堆表还没弄完'])
    expect(剩).not.toContain('社团招新的材料要收')
    expect(剩).toContain('在等一个面试结果')
    expect(quZaiMangWeiShuo(['在准备六级', '在等一个面试结果'], ['六级单词背到一半就走神了'])).not.toContain('在准备六级')
  })
})

describe('语态指令块', () => {
  it('结构完整且每种语态都有实质指令', () => {
    const 待办 = shengChengZaiMang(true, zaoSuiJi('j-3'))
    const 块 = gouJianYuTaiKuai('另起', 待办)
    expect(块).toContain('【你最近在忙】')
    expect(块).toContain('【这一轮你就这样回】')
    for (const 值 of ['接内容', '说自己', '极短', '另起', '澄清', '安排'] as const) {
      expect(gouJianYuTaiKuai(值, 待办).length).toBeGreaterThan(20)
    }
  })

  it('澄清不装不懂、不自我否认；另起允许复提但要求说进展；安排要求了结', () => {
    expect(quYuTaiZhiLing('澄清')).not.toContain('这一轮你没太听懂')
    expect(quYuTaiZhiLing('澄清')).toContain('打错字')
    expect(quYuTaiZhiLing('澄清')).toContain('绝不要质疑你自己刚刚说过的事')
    expect(quYuTaiZhiLing('另起')).toContain('进展')
    expect(quYuTaiZhiLing('安排')).toContain('了结')
  })
})
