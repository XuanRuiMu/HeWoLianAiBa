import { describe, expect, test, vi } from 'vitest'
import {
  qingLiXiaoXi,
quChuKaiChangToken,
  caiYangKaiChangHouXuan,
  fuJiaKaiChangYuanYu,
  jianChaFuCong,
} from '../开场候选约束'
import { KAI_CHANG_PEI_ZHI, huoQuKaiChangBiao, KAI_CHANG_BIAO_YUAN_XIN } from '../../config/开场采样配置'
import { QIAN_JING_JIE_DONG } from '../开场候选约束'

/**
 * 机制 D（候选开场 + 硬约束）业务分支。
 * 选型依据见 PROGRESS-模拟真人聊天.md §10.1：prefix 强制 2 字语义崩坏 6/8，候选机制 6/6 通顺。
 */

describe('开场候选约束 · 机制 D', () => {
  describe('qingLiXiaoXi', () => {
    test('按行切分并去序号前缀', () => {
      expect(qingLiXiaoXi('1. 你好\n2、我睡了')).toEqual(['你好', '我睡了'])
    })
    test('丢弃空行', () => {
      expect(qingLiXiaoXi('你好\n\n  \n晚安')).toEqual(['你好', '晚安'])
    })
    test('空输入返回空数组', () => {
      expect(qingLiXiaoXi('')).toEqual([])
    })
  })

  describe('quChuKaiChangToken', () => {
    test('去空白后取前 N 字', () => {
      expect(quChuKaiChangToken('我 刚 洗 完 澡')).toBe('我刚')
    })
    test('长度不足返回 null', () => {
      expect(quChuKaiChangToken('嗯')).toBeNull()
      expect(quChuKaiChangToken('　 ')).toBeNull()
    })
  })

  describe('⚠️ 渲染格式残留必须被清洗（第十二轮实测 P0-①）', () => {
    // 真实泄漏原话（out_16xing_D_new.json，ESTP/L3，400 轮里 2 次）
    test('剥掉颜文字 + 时间戳的行首渲染格式', () => {
      expect(qingLiXiaoXi('^\\_^(20:42): 湿头发别往手机上滴啊')[0]).toBe('湿头发别往手机上滴啊')
      expect(qingLiXiaoXi('^_^ 早啊')[0]).toBe('早啊')
      expect(qingLiXiaoXi('orz 你还知道回我')[0]).toBe('你还知道回我')
    })

    test('剥掉裸时间戳前缀，但不动句中的时间戳', () => {
      expect(qingLiXiaoXi('(20:42): 今天还行')[0]).toBe('今天还行')
      expect(qingLiXiaoXi('（20：42）今天还行')[0]).toBe('今天还行')
      expect(qingLiXiaoXi('[20:42] 今天还行')[0]).toBe('今天还行')
      // 句中的时间是正常内容，必须保留
      expect(qingLiXiaoXi('我八点(20:42)才起的')[0]).toBe('我八点(20:42)才起的')
    })

    test('保留历史行为：序号前缀仍被剥掉', () => {
      expect(qingLiXiaoXi('1. 你好')[0]).toBe('你好')
      expect(qingLiXiaoXi('2、今天忙不忙')[0]).toBe('今天忙不忙')
    })

    test('剥完为空则整条丢弃，不产生空消息', () => {
      // 真实泄漏原话是 `^\_^(20:42): `（码点 5e 5c 5f 5e …），颜文字里有反斜杠
      expect(qingLiXiaoXi('^\\_^(20:42): ')).toEqual([])
    })
  })

  describe('caiYangKaiChangHouXuan', () => {
    test('候选数不超过请求数', () => {
      expect(caiYangKaiChangHouXuan(3).length).toBeLessThanOrEqual(3)
    })

    test('多次采样有分散度（非固定返回同几项）', () => {
      const he = new Set<string>()
      for (let i = 0; i < 30; i++) for (const k of caiYangKaiChangHouXuan(5)) he.add(k)
      expect(he.size).toBeGreaterThan(15)
    })

    test('⚠️ 不做撞车拒绝——候选可能与历史相同（这正是要治的「确定性」，靠模型选而非压分布）', () => {
      // 理由：拒绝采样把撞车率压到 0.00%，远低于真人，导致 M2「假达标」（机制过头而非像真人）。
      // ⚠️ 曾引用的 9.03% / 23.00% / 真人区间 15–30% 不可复算且方向反了，已撤回（纠错 #23）。
      const houXuan = caiYangKaiChangHouXuan(5, () => 0)
      expect(houXuan[0]).toBe('哈哈')
    })

    test('伪随机恒定也能返回（去重集合生效，不返回 5 个相同项）', () => {
      const houXuan = caiYangKaiChangHouXuan(5, () => 0)
      expect(houXuan.length).toBe(1)
    })

    test('suiJi 越界（返回 1）不越界取到 undefined', () => {
      const houXuan = caiYangKaiChangHouXuan(5, () => 1)
      expect(houXuan.length).toBeGreaterThan(0)
      expect(houXuan.every((x) => typeof x === 'string' && x.length === 2)).toBe(true)
    })

    test('⚠️ 强场景/时序绑定词一律不得进入候选（第二轮审查 B3）', () => {
      const QIAN = QIAN_JING_JIE_DONG // ⚠️ 从生产模块取，禁止在测试里再抄一份
      // 恒定伪随机指向权重最高项（「哈哈」），仍需跑满重试上限以覆盖全表
      for (let i = 0; i < 400; i++) {
        const houXuan = caiYangKaiChangHouXuan(5, (() => {
          let ci = 0
          return () => { ci = (ci * 37 + 11) % 1000; return ci / 1000 }
        })())
        for (const k of houXuan) {
          expect(QIAN.some((q) => k.startsWith(q))).toBe(false)
        }
      }
    })

    test('剔除绑定词后仍能凑满请求数量', () => {
      const houXuan = caiYangKaiChangHouXuan(8)
      expect(houXuan.length).toBe(8)
    })
  })

  describe('fuJiaKaiChangYuanYu · 类型保持（审查实测的 P0）', () => {
    const YU = '\n\n（第一句请从下面某一条里挑一条开头：哈哈 / 我也）'

    test('string 输入 → 字符串拼接', () => {
      expect(fuJiaKaiChangYuanYu('我是小雨', YU)).toBe('我是小雨' + YU)
    })

    test('内容块数组输入 → 追加 input_text 块，绝不 String() 化', () => {
      const kuai = [{ type: 'input_text', text: '看我发的图' }, { type: 'input_image', image_url: 'http://x/y.png' }]
      const r = fuJiaKaiChangYuanYu(kuai as never, YU) as Array<Record<string, unknown>>
      expect(Array.isArray(r)).toBe(true)
      expect(r[0]['text']).toBe('看我发的图')
      expect(r[1]['type']).toBe('input_image')
      expect(r[2]['type']).toBe('input_text')
      expect(r[2]['text']).toBe(YU)
      // 关键回归：不得出现 [object Object]
      expect(JSON.stringify(r)).not.toContain('[object Object]')
    })

    test('约束为空时原样返回（不新增块、不改类型）', () => {
      const kuai = [{ type: 'input_text', text: '看我发的图' }]
      expect(fuJiaKaiChangYuanYu(kuai as never, '')).toBe(kuai)
      expect(fuJiaKaiChangYuanYu('原文', '')).toBe('原文')
    })
  })

  describe('daiShuKaiChangYuanYu · 开关', () => {
    test('开关默认关闭时返回空文本与空候选（行为与改动前一致）', async () => {
      vi.resetModules()
      vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', '')
      const mod = await import('../开场候选约束')
      const cfg = await import('../../config/开场采样配置')
      expect(cfg.KAI_CHANG_PEI_ZHI.kaiGuan).toBe(false)
      expect(mod.daiShuKaiChangYuanYu()).toEqual({ wenBen: '', houXuan: [] })
      vi.unstubAllEnvs()
    })

    test('⚠️ 指令必须直接点名「只发两个字」这个失败形态（第十一轮 M8 实测驱动）', async () => {
      vi.resetModules()
      vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', 'true')
      const mod = await import('../开场候选约束')
      const { wenBen } = mod.daiShuKaiChangYuanYu()
      // 候选全是 2 字词片，原措辞「不用照抄整句」假设候选是句子 → 没覆盖失败模式。
      // 实测 394 轮出现 2 条逐字复制（把 2 字候选单独发一条），真人 LCCC 该形态 0 条。
      expect(wenBen, '缺少对「只发两个字」的显式禁止').toMatch(/不能只把挑中的这两个字单独发成一条/)
      expect(wenBen, '缺少「后面必须接上真实内容」').toMatch(/后面必须接上真实内容/)
      // 旧措辞对 2 字词片无意义，应已移除
      expect(wenBen, '仍保留对 2 字词片无意义的「照抄整句」').not.toMatch(/照抄整句/)
      vi.unstubAllEnvs()
    })

    test('开关打开时生成约束文本且回传同一批候选', async () => {
      vi.resetModules()
      vi.stubEnv('KAI_CHANG_QIAN_ZHI_QI_YONG', 'true')
      const mod = await import('../开场候选约束')
      const cfg = await import('../../config/开场采样配置')
      expect(cfg.KAI_CHANG_PEI_ZHI.kaiGuan).toBe(true)
      const { wenBen, houXuan } = mod.daiShuKaiChangYuanYu()
      expect(wenBen).not.toBe('')
      expect(houXuan.length).toBe(cfg.KAI_CHANG_PEI_ZHI.houXuanGeShu)
// ⚠️ 文本里出现的候选必须与回传的一致——联调的 M7/M8 依赖这个一致性。
      //    格式契约：候选区在 `：` 与 `；` 之间（见 开场候选约束.ts 的注释）
      const duan = /（(.+)）/.exec(wenBen)?.[1] ?? ''
      const quYu = duan.split('：').pop()?.split('；')[0] ?? ''
      const lie = quYu.split(' / ').filter((x) => x.length > 0)
      expect(lie).toEqual(houXuan)
      vi.unstubAllEnvs()
      vi.resetModules()
    })

    test('⚠️ 空串环境变量必须退回默认值，不得塌成下限（审查实测整表塌成 1 项）', async () => {
      vi.resetModules()
      vi.stubEnv('KAI_CHANG_BIAO_TIAO_SHU', '')
      vi.stubEnv('KAI_CHANG_HOU_XUAN_GE_SHU', '')
      const cfg = await import('../../config/开场采样配置')
      expect(cfg.KAI_CHANG_PEI_ZHI.biaoTiaoShuXian).toBe(KAI_CHANG_BIAO_YUAN_XIN.shouYongShu)
      expect(cfg.KAI_CHANG_PEI_ZHI.houXuanGeShu).toBe(5)
      expect(huoQuKaiChangBiao().kaiChang.length).toBe(KAI_CHANG_BIAO_YUAN_XIN.shouYongShu)
      vi.unstubAllEnvs()
      vi.resetModules()
    })
  })

  describe('jianChaFuCong', () => {
    test('首条命中候选 → true', () => {
      expect(jianChaFuCong('我也是，刚躺下没多久', ['我也是', '哈哈哈'])).toBe(true)
    })
    test('首条未命中 → false', () => {
      expect(jianChaFuCong('刚洗完澡', ['我也是'])).toBe(false)
    })
    test('首条无法判定 → null', () => {
      expect(jianChaFuCong('', ['我也是'])).toBeNull()
      expect(jianChaFuCong('嗯', ['我也是'])).toBeNull()
    })
    test('只看首条，不看后续行', () => {
      expect(jianChaFuCong('刚洗完澡\n我也是', ['我也是'])).toBe(false)
    })
  })

  describe('采样表数据完整性', () => {
    test('权重合计精确 10000', () => {
      expect(huoQuKaiChangBiao().quanZhong.reduce((a, b) => a + b, 0)).toBe(10000)
    })
    test('每项均为 2 字汉字/字母，权重为正整数', () => {
      const biao = huoQuKaiChangBiao()
      expect(biao.kaiChang.length).toBe(biao.quanZhong.length)
      for (const k of biao.kaiChang) expect(Array.from(k).length).toBe(2)
      for (const q of biao.quanZhong) { expect(Number.isInteger(q)).toBe(true); expect(q).toBeGreaterThan(0) }
    })
    test('无重复项、无纯标点项', () => {
      const biao = huoQuKaiChangBiao()
      expect(new Set(biao.kaiChang).size).toBe(biao.kaiChang.length)
      for (const k of biao.kaiChang) expect(/^[…\.\s，,。！？!?～~；;：:]+$/.test(k)).toBe(false)
    })
    test('表覆盖度已记录（供验收核对）', () => {
      expect(KAI_CHANG_BIAO_YUAN_XIN.shouYongShu).toBeGreaterThan(0)
      expect(KAI_CHANG_BIAO_YUAN_XIN.fuHanLv).toBeGreaterThan(30)
    })
    test('默认候选 5 个', () => {
      expect(KAI_CHANG_PEI_ZHI.houXuanGeShu).toBe(5)
    })
  })
})