import { describe, it, expect } from 'vitest'
import {
  chouYuTai,
  gouJianYuTaiKuai,
  jiSuanLingQiXiShu,
  panChuFaLei,
  quYuTaiZhiLing,
  quZaiMangWeiShuo,
  shengChengZaiMang,
  shiShouWei,
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

  it('收尾', () => {
    for (const s of ['晚安', '我先睡了', '先这样吧', '再说吧', '回见了', '拜拜', '不聊了，去忙了']) {
      expect(panChuFaLei(s), s).toBe('收尾')
    }
  })

  it('收尾判断不影响普通短句', () => {
    for (const s of ['嗯嗯', '好的', '行啊']) {
      expect(shiShouWei(s), s).toBe(false)
    }
  })

  it('空消息按纯应答，纯标点保留问句意图', () => {
    expect(panChuFaLei('')).toBe('纯应答')
    expect(panChuFaLei('，。？！')).toBe('是非问')
  })

  it('收尾带问号时优先回答提问但不硬断收尾', () => {
    expect(panChuFaLei('先这样吧？')).toBe('是非问')
    expect(shiShouWei('先这样吧？')).toBe(true)
  })

  it('后缀变体取自定义表的实际分类', () => {
    expect(panChuFaLei('回见了')).toBe('收尾')
    expect(shiShouWei('回见了')).toBe(true)
    for (const s of ['拜拜了', '晚安啦', '晚安哈', '晚安😴']) {
      expect(panChuFaLei(s), s).toBe('纯应答')
      expect(shiShouWei(s), s).toBe(false)
    }
  })

  it('长句末尾带收尾词时不把整段误判为收尾', () => {
    expect(panChuFaLei('今天有点累，改天再聊，回头聊')).toBe('分享')
    expect(panChuFaLei('我今天要加班，先睡觉了')).toBe('分享')
    expect(panChuFaLei('不聊了，去忙了')).toBe('收尾')
  })
})

describe('语态抽样', () => {
  it('落在区间两端时取到表头和表尾', () => {
    expect(chouYuTai('刚没在办公室看到你', () => 0)).toBe('接内容')
    expect(chouYuTai('刚没在办公室看到你', () => 0.999)).toBe('另起')
  })

  it('系数为 1 时低随机数不返回另起，只有极高随机数才返回', () => {
    const 样本 = ['嗯嗯', '好的', '还拉肚子吗', '今晚吃了吗', '刚没在办公室看到你', '其实在会前我有提醒他', '哈哈这个太好笑了']
    for (const s of 样本) {
      expect(chouYuTai(s, () => 0.3)).not.toBe('另起')
      expect(chouYuTai(s, () => 0.999)).toBe('另起')
    }
  })

  it('收尾消息可能抽到另起', () => {
    const 计: Record<string, number> = {}
    const N = 20000
    for (let i = 0; i < N; i++) {
      const 值 = chouYuTai('我先睡了，晚安')
      计[值] = (计[值] || 0) + 1
    }
    expect((计['另起'] || 0) / N).toBeGreaterThan(0.15)
    expect((计['另起'] || 0) / N).toBeLessThan(0.45)
  })

  it('普通人格收尾另起仍有自然下界', () => {
    const 计: Record<string, number> = {}
    const N = 20000
    for (let i = 0; i < N; i++) {
      const 值 = chouYuTai('我先睡了，晚安', zaoSuiJi(`FP-G-正常收尾-${i}`))
      计[值] = (计[值] || 0) + 1
    }
    expect((计['另起'] || 0) / N).toBeGreaterThan(0.02)
    expect((计['另起'] || 0) / N).toBeLessThan(0.28)
  })

  it('极端回避人格收尾另起被限制在四分之一以内', () => {
    const 极端回避 = { ieLeiXing: 'I', reShenLeiXing: '慢热', shiFouZhaXing: true, zongFen: 100 }
    expect(jiSuanLingQiXiShu(极端回避)).toBe(2.5)
    expect(chouYuTai('我先睡了，晚安', () => 0.2, 极端回避)).toBe('另起')
    expect(chouYuTai('我先睡了，晚安', () => 0.249999, 极端回避)).toBe('另起')
    expect(chouYuTai('我先睡了，晚安', () => 0.25, 极端回避)).toBe('极短')
    const 计: Record<string, number> = {}
    const N = 100000
    for (let i = 0; i < N; i++) {
      const 值 = chouYuTai('我先睡了，晚安', () => (i * 37 % N) / N, 极端回避)
      计[值] = (计[值] || 0) + 1
    }
    expect((计['另起'] || 0) / N).toBeCloseTo(0.25, 1)
  })

  it('极端回避人格分享另起仍沿用低概率原权重', () => {
    expect(chouYuTai('刚没在办公室看到你', () => 0.999999, {
      ieLeiXing: 'I', reShenLeiXing: '慢热', shiFouZhaXing: true, zongFen: 100,
    })).toBe('另起')
  })

  it('分享型输入以接内容为主', () => {
    const 计: Record<string, number> = {}
    const N = 20000
    for (let i = 0; i < N; i++) {
      const 值 = chouYuTai('刚没在办公室看到你')
      计[值] = (计[值] || 0) + 1
    }
    const 占比 = (k: string) => (计[k] || 0) / N
    expect(占比('接内容')).toBeGreaterThan(0.45)
    expect(占比('极短')).toBeGreaterThan(0.08)
    expect(占比('说自己')).toBeGreaterThan(0.06)
    expect(占比('另起')).toBeGreaterThan(0)
    expect(占比('另起')).toBeLessThan(0.05)
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

describe('岔开倾向系数', () => {
  it('默认无倾向时系数为 1', () => {
    expect(jiSuanLingQiXiShu()).toBe(1)
    expect(jiSuanLingQiXiShu({})).toBe(1)
  })

  it('I+慢热+渣型+低分按乘积封顶到 2.5', () => {
    expect(jiSuanLingQiXiShu({ ieLeiXing: 'I', reShenLeiXing: '慢热', shiFouZhaXing: true, zongFen: 100 })).toBe(2.5)
  })

  it('E+快热+热恋高分接近下限 0.5', () => {
    expect(jiSuanLingQiXiShu({ ieLeiXing: 'E', reShenLeiXing: '快热', guanXiJieDuan: '热恋', zongFen: 850 })).toBe(0.5)
    expect(jiSuanLingQiXiShu({ ieLeiXing: 'E', reShenLeiXing: '快热', guanXiJieDuan: '深爱', zongFen: 700 })).toBe(0.5)
  })

  it('单因素按倍率变化，低阶段和低分都会抬高', () => {
    expect(jiSuanLingQiXiShu({ ieLeiXing: 'I' })).toBeCloseTo(1.2)
    expect(jiSuanLingQiXiShu({ ieLeiXing: 'E' })).toBeCloseTo(0.8)
    expect(jiSuanLingQiXiShu({ reShenLeiXing: '慢热' })).toBeCloseTo(1.3)
    expect(jiSuanLingQiXiShu({ reShenLeiXing: '快热' })).toBeCloseTo(0.8)
    expect(jiSuanLingQiXiShu({ shiFouZhaXing: true })).toBeCloseTo(1.6)
    expect(jiSuanLingQiXiShu({ guanXiJieDuan: '认识' })).toBeCloseTo(1.25)
    expect(jiSuanLingQiXiShu({ zongFen: 299 })).toBeCloseTo(1.25)
    expect(jiSuanLingQiXiShu({ zongFen: 300 })).toBe(1)
  })

  it('高随机数下更回避的人格更容易抽到另起', () => {
    const 触发 = '刚没在办公室看到你'
    const 回避 = chouYuTai(触发, () => 0.95, { ieLeiXing: 'I', reShenLeiXing: '慢热', shiFouZhaXing: true, zongFen: 100 })
    const 亲近 = chouYuTai(触发, () => 0.95, { ieLeiXing: 'E', reShenLeiXing: '快热', guanXiJieDuan: '热恋', zongFen: 850 })
    expect(回避).toBe('另起')
    expect(亲近).not.toBe('另起')
  })

  it('同一随机序列下回避型抽到另起更频繁', () => {
    const 触发 = '其实在会前我有提醒他'
    const 序列 = Array.from({ length: 4000 }, (_, i) => (i * 37 % 997) / 997)
    const 抽样 = (qingXiang?: Parameters<typeof chouYuTai>[2]) => {
      let i = 0
      let 次 = 0
      for (let n = 0; n < 20000; n++) {
        const 值 = chouYuTai(触发, () => 序列[i++ % 序列.length], qingXiang)
        if (值 === '另起') 次++
      }
      return 次
    }
    const 高回避 = 抽样({ ieLeiXing: 'I', reShenLeiXing: '慢热', shiFouZhaXing: true, zongFen: 100 })
    const 低回避 = 抽样({ ieLeiXing: 'E', reShenLeiXing: '快热', guanXiJieDuan: '热恋', zongFen: 850 })
    expect(高回避).toBeGreaterThan(低回避)
    expect(低回避).toBeGreaterThan(0)
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

  it('另起指令要求先承接再转，承接不超过八字', () => {
    const zhiLing = quYuTaiZhiLing('另起')
    expect(zhiLing).toContain('两段式')
    expect(zhiLing).toContain('承接')
    expect(zhiLing).toContain('不超过八个字')
    expect(zhiLing).toContain('别直接无视对方刚说的话')
  })
})
