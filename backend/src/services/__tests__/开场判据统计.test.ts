import { describe, expect, test } from 'vitest'
import { kaiChangToken, shouJiJiuJinKaiChangToken, tongJiLun, huiZongPanDuan } from '../开场判据统计'

const tiao = (leiXing: 'yonghu' | 'jiaose' | 'xitong', neiRong: string) => ({
  fa_song_zhe_lei_xing: leiXing,
  nei_rong: neiRong,
})

/**
 * 度量代码本身必须先被度量。
 * 判据算错会让 120 轮真实外呼全部作废，因此这些测试不依赖 API、必须常绿。
 */


describe('开场判据统计', () => {
  describe('kaiChangToken', () => {
    test('去空白后取前 2 字', () => {
      expect(kaiChangToken('我 刚 洗 完')).toBe('我刚')
    })
    test('不足 2 字返回短串（调用方按 length===2 过滤）', () => {
      expect(kaiChangToken('嗯')).toBe('嗯')
      expect(kaiChangToken('')).toBe('')
    })
  })

  describe('shouJiJiuJinKaiChangToken', () => {
    test('撞最近窗口 → 计入', () => {
      const liShi = [tiao('yonghu', '在吗'), tiao('jiaose', '哈哈续写')]
      expect([...shouJiJiuJinKaiChangToken(liShi)]).toEqual(['哈哈'])
    })
    test('不撞 → 不计入', () => {
      const liShi = [tiao('yonghu', '在吗'), tiao('jiaose', '我是小雨')]
      expect(shouJiJiuJinKaiChangToken(liShi).has('晚安')).toBe(false)
    })
    test('窗口外的旧 token 不计入', () => {
      const liShi = []
      for (let i = 0; i < 30; i++) liShi.push(tiao('yonghu', '第' + i + '轮'), tiao('jiaose', (i === 0 ? '哈哈' : 'ZZ' + i) + '续'))
      expect(shouJiJiuJinKaiChangToken(liShi, 20).has('哈哈')).toBe(false)
    })
    test('xitong 不开轮', () => {
      const liShi = [
        tiao('yonghu', '在吗'), tiao('jiaose', 'AAA'),
        tiao('xitong', '系统'), tiao('yonghu', '在吗'), tiao('jiaose', 'BBB'),
      ]
      expect([...shouJiJiuJinKaiChangToken(liShi)].sort()).toEqual(['AA', 'BB'])
    })
    test('短消息轮被跳过但同轮后续仍能找到首条', () => {
      const liShi = [tiao('yonghu', '看图'), tiao('jiaose', '嗯'), tiao('jiaose', 'AAA真的开场')]
      expect([...shouJiJiuJinKaiChangToken(liShi)]).toEqual(['AA'])
    })
  })

  describe('shouJiJiuJinKaiChangToken · 轮次切分（活实现）', () => {
    // ⚠️ 这里曾存在**两份**轮次切分实现：`开场候选约束.shouJiJiuJinLunKaiChang`（死代码，
    //    只被自己的测试调用）与本文件所用的 `shouJiJiuJinKaiChangToken`（联调真正在跑）。
    //    结果是「被测的是没人用的那份、在跑的那份没有直接单测」。已删死实现，测试全部迁到这里。

    test('一轮内的第 2、3 条角色消息不计入', () => {
      const liShi = [
        tiao('yonghu', '在吗'), tiao('jiaose', 'AAA首条'),
        tiao('jiaose', 'BBB第二条'), tiao('jiaose', 'CCC第三条'),
        tiao('yonghu', '在吗'), tiao('jiaose', 'DDD首条'),
      ]
      expect([...shouJiJiuJinKaiChangToken(liShi)].sort()).toEqual(['AA', 'DD'])
    })

    test('窗口只保留最近 N 轮', () => {
      const liShi = []
      for (let i = 0; i < 10; i++) liShi.push(tiao('yonghu', '第' + i + '轮'), tiao('jiaose', 'T' + i + '开'))
      // 10 轮的最后 3 轮；token 取前 2 字
      expect([...shouJiJiuJinKaiChangToken(liShi, 3)].sort()).toEqual(['T7', 'T8', 'T9'])
    })

    test('xitong 既不开轮也不占首条名额', () => {
      const liShi = [
        tiao('yonghu', '在吗'), tiao('jiaose', 'AAA'),
        tiao('xitong', '系统提示'), tiao('yonghu', '在吗'), tiao('jiaose', 'BBB'),
      ]
      expect([...shouJiJiuJinKaiChangToken(liShi)].sort()).toEqual(['AA', 'BB'])
    })

    test('媒体轮/空正文轮不丢整轮：继续找到本轮真正的首条', () => {
      const liShi = [
        tiao('yonghu', '看这个'), tiao('jiaose', ''),
        tiao('jiaose', 'AAA真正的开场'), tiao('jiaose', 'BBB'),
        tiao('yonghu', '在吗'), tiao('jiaose', 'CCC'),
      ]
      expect([...shouJiJiuJinKaiChangToken(liShi)].sort()).toEqual(['AA', 'CC'])
    })

    test('整轮都是短消息则该轮不产生 token', () => {
      const liShi = [tiao('yonghu', '嗯'), tiao('jiaose', '嗯'), tiao('yonghu', '在吗'), tiao('jiaose', 'AAA')]
      expect([...shouJiJiuJinKaiChangToken(liShi)]).toEqual(['AA'])
    })

    test('空历史返回空集', () => {
      expect(shouJiJiuJinKaiChangToken([]).size).toBe(0)
    })
  })

describe('tongJiLun', () => {
    const houXuan = ['哈哈', '我也是', '怎么了']

    test('M2：撞窗口内 token → 1', () => {
      const r = tongJiLun([tiao('yonghu', '在吗'), tiao('jiaose', '哈哈哈')], '哈哈哈呢', ['哈哈哈呢'], houXuan)
      expect(r.M2_zhuangChe).toBe(1)
      expect(r.kaiChang).toBe('哈哈')
    })

    test('M2：不撞 → 0', () => {
      const r = tongJiLun([tiao('yonghu', '在吗'), tiao('jiaose', '晚安')], '我刚下班', ['我刚下班'], houXuan)
      expect(r.M2_zhuangChe).toBe(0)
    })

    test('M7：命中候选 → 遵守', () => {
      const r = tongJiLun([], '我也是，刚躺下', ['我也是，刚躺下'], houXuan)
      expect(r.M7_yuFuCong).toBe(1)
      expect(r.M7_daiPanDing).toBe(1)
    })

    test('M7：未命中 → 不遵守但仍计入分母', () => {
      const r = tongJiLun([], '刚洗完澡', ['刚洗完澡'], houXuan)
      expect(r.M7_yuFuCong).toBe(0)
      expect(r.M7_daiPanDing).toBe(1)
    })

    test('⚠️ M7：首条不可判定 → 不计入分母（否则虚高遵守率）', () => {
      const r = tongJiLun([], '嗯', ['嗯'], houXuan)
      expect(r.M7_daiPanDing).toBe(0)
      expect(r.M7_yuFuCong).toBe(0)
    })

    test('M8：消息全文恰等于候选 → 计数（候选仅 2 字，这是真实通道）', () => {
      const r = tongJiLun([], '我也是', ['我也是'], houXuan)
      expect(r.M8_zhengZhiFuZhi).toBe(1)
    })

    test('M8：正常续写不算逐字复制', () => {
      const r = tongJiLun([], '我也是，刚躺下没多久', ['我也是，刚躺下没多久'], houXuan)
      expect(r.M8_zhengZhiFuZhi).toBe(0)
    })

    test('空回复不崩溃且不计入 M2', () => {
      const r = tongJiLun([], '', [], houXuan)
      expect(r.M2_zhuangChe).toBe(0)
      expect(r.M2_keCeRen).toBe(false)
      expect(r.M8_zhengZhiFuZhi).toBe(0)
    })

    test('首条不足 2 字（如单字「嗯」）→ 有效轮但 M2 不判定', () => {
      const r = tongJiLun([], '嗯', ['嗯'], houXuan)
      expect(r.M2_keCeRen).toBe(false)
      expect(r.M2_zhuangChe).toBe(0)
    })
  })

  describe('huiZongPanDuan', () => {
    const youXiao = (M2: 0 | 1, kaiChang = '哈哈') => ({
      M2_zhuangChe: M2, M2_keCeRen: true, M7_yuFuCong: 1 as const, M7_daiPanDing: 1 as const, M8_zhengZhiFuZhi: 0, kaiChang,
    })

    test('M2 分母是有效轮数', () => {
      const p = [youXiao(1), youXiao(0), youXiao(0), youXiao(1)]
      const h = huiZongPanDuan(p)
      expect(h.M2_zhuangCheLv).toBe(0.5)
      expect(h.M2_keCeRenLunShu).toBe(4)
    })

    test('⚠️ 空回轮不得稀释 M2（第二轮审查 P4：否则假达标）', () => {
      const p = [
        youXiao(1, '哈哈'), youXiao(0, '我也'), youXiao(0, '怎么'),
        { M2_zhuangChe: 0 as const, M2_keCeRen: false, M7_yuFuCong: 0 as const, M7_daiPanDing: 0 as const, M8_zhengZhiFuZhi: 0, kaiChang: '' },
      ]
      const h = huiZongPanDuan(p)
      // 1 次撞车 / 3 个有效轮 = 0.3333；若错把空回计入分母会得 0.25（假达标）
      expect(h.M2_zhuangCheLv).toBeCloseTo(1 / 3, 4)
      expect(h.M2_keCeRenLunShu).toBe(3)
      expect(h.lunShu).toBe(4)
      expect(h.M2_keCeRenLv).toBeCloseTo(0.75, 4)
    })

    test('⚠️ M7 分母排除待判定轮，不得用全部轮数', () => {
      const p = [
        { M2_zhuangChe: 0 as const, M2_keCeRen: true, M7_yuFuCong: 1 as const, M7_daiPanDing: 1 as const, M8_zhengZhiFuZhi: 0, kaiChang: '哈哈' },
        { M2_zhuangChe: 0 as const, M2_keCeRen: true, M7_yuFuCong: 0 as const, M7_daiPanDing: 0 as const, M8_zhengZhiFuZhi: 0, kaiChang: '嗯' },
        { M2_zhuangChe: 0 as const, M2_keCeRen: true, M7_yuFuCong: 0 as const, M7_daiPanDing: 1 as const, M8_zhengZhiFuZhi: 0, kaiChang: '我也' },
      ]
      const h = huiZongPanDuan(p)
      expect(h.M7_fuCongLv).toBe(0.5)
      expect(h.M7_kePanDingLunShu).toBe(2)
    })

    test('⚠️ 全轮无有效轮时 M2 也返回 null（纠错 #28：与 M7 同类缺陷，此前漏改）', () => {
      const p = [{ M2_zhuangChe: 0 as const, M2_keCeRen: false, M7_yuFuCong: 0 as const, M7_daiPanDing: 0 as const, M8_zhengZhiFuZhi: 0, kaiChang: '' }]
      const h = huiZongPanDuan(p)
      // 0.00% 会与「真的零撞车」不可区分
      expect(h.M2_zhuangCheLv).toBeNull()
      expect(h.M2_keCeRenLunShu).toBe(0)
      expect(h.M7_fuCongLv).toBeNull()
    })

    test('M8 逐条累加，且开关关闭的轮不计入', () => {
      const p = [
        { ...youXiao(0), M8_zhengZhiFuZhi: 1 },
        { ...youXiao(0), M8_zhengZhiFuZhi: 2 },
        { ...youXiao(0), M8_zhengZhiFuZhi: 5, kaiGuanKaiQi: false },
      ]
      expect(huiZongPanDuan(p).M8_zhengZhiFuZhi).toBe(3)
    })

    test('报告开场种类数（多样性直观指标）', () => {
      // ⚠️ token 恒为 2 字（kaiChangToken 取 slice(0,2)），不足 2 字者不计入种类数
      const p = ['哈哈', '我也', '哈哈', '怎么', '嗯'].map((k) => ({
        M2_zhuangChe: 0 as const, M2_keCeRen: true, M7_yuFuCong: 1 as const, M7_daiPanDing: 1 as const, M8_zhengZhiFuZhi: 0, kaiChang: k,
      }))
      const h = huiZongPanDuan(p)
      expect(h.kaiChangGeShu).toBe(3)
      expect(h.lunShu).toBe(5)
    })

    test('空输入不崩；M7 无可判定轮时返回 null 而非 0', () => {
      const h = huiZongPanDuan([])
      expect(h.M2_zhuangCheLv).toBeNull()
      // ⚠️ 必须是 null：0 会被误读成「模型完全不服从」
      expect(h.M7_fuCongLv).toBeNull()
      expect(h.M7_kePanDingLunShu).toBe(0)
      expect(h.lunShu).toBe(0)
    })

    test('⚠️ 开关关闭的轮必须排除在 M7 分母外（纠错 #26 / 第四轮 Sp-1）', () => {
      const p = [
        { ...youXiao(0), kaiGuanKaiQi: true },   // 服从
        { ...youXiao(0), kaiGuanKaiQi: true },   // 服从
        { ...youXiao(0), kaiGuanKaiQi: true },   // 服从
        { ...youXiao(0), kaiGuanKaiQi: false },  // 开关关：无候选可服从
        { ...youXiao(0), kaiGuanKaiQi: false },
      ]
      const h = huiZongPanDuan(p)
      // 分母应为 3 而非 5；若把关闭轮计入，遵守率会被拉成 3/5 = 0.6
      expect(h.M7_kePanDingLunShu).toBe(3)
      expect(h.M7_fuCongLv).toBe(1)
      expect(h.kaiGuanWeiLunShu).toBe(2)
    })

    test('⚠️ 全轮开关关闭时 M7 为 null，且报告开关关闭轮数（不是 0）', () => {
      const p = [{ ...youXiao(0), kaiGuanKaiQi: false }, { ...youXiao(0), kaiGuanKaiQi: false }]
      const h = huiZongPanDuan(p)
      expect(h.M7_fuCongLv).toBeNull()
      expect(h.kaiGuanWeiLunShu).toBe(2)
      expect(h.M8_zhengZhiFuZhi).toBe(0)
    })

    test('⚠️ 开关关闭轮若模型恰好像候选（哨兵式伪装），仍不得计入 M7 分母', () => {
      // 这正是联调曾用 `['__kaiGuanWeiQ__']` 哨兵的错误做法导致的失效形态
      const p = [{ ...youXiao(0), kaiGuanKaiQi: false }]
      expect(huiZongPanDuan(p).M7_kePanDingLunShu).toBe(0)
    })
  })
})
