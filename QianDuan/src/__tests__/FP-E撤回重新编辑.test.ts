import { describe, expect, it } from 'vitest'
import {
  huoQuCheHuiChongBianShiXian,
  shiKeChongBian,
} from '../composables/撤回重编'
import { XiaoXiPeiZhi } from '../config/消息配置'

describe('撤回重新编辑 前端时限与类型判定', () => {
  it('文字/图片/图文按2分钟时限判定', () => {
    const faSong = 1_000_000
    expect(huoQuCheHuiChongBianShiXian('wenben')).toBe(XiaoXiPeiZhi.cheHuiShiXian)
    expect(huoQuCheHuiChongBianShiXian('tuPian')).toBe(XiaoXiPeiZhi.cheHuiShiXian)
    expect(huoQuCheHuiChongBianShiXian('wenJian')).toBe(
      XiaoXiPeiZhi.wenJianCheHuiShiXian,
    )
    expect(huoQuCheHuiChongBianShiXian('yuYin')).toBe(XiaoXiPeiZhi.cheHuiShiXian)
    expect(huoQuCheHuiChongBianShiXian('biaoQingBao')).toBe(
      XiaoXiPeiZhi.cheHuiShiXian,
    )
    expect(shiKeChongBian('wenben', faSong, faSong + 60_000)).toBe(true)
    expect(shiKeChongBian('wenben', faSong, faSong + 120_000)).toBe(true)
    expect(shiKeChongBian('wenben', faSong, faSong + 120_001)).toBe(false)
    expect(shiKeChongBian('wenJian', faSong, faSong + 3 * 60 * 60 * 1000)).toBe(false)
    expect(shiKeChongBian('wenJian', faSong, faSong + 60_000)).toBe(false)
  })

  it('只有本人文字/图片/图文可重编，语音表情包文件不可重编', () => {
    const xianZai = 2_000_000
    const faSong = xianZai - 10_000
    expect(shiKeChongBian('wenben', faSong, xianZai, true)).toBe(true)
    expect(shiKeChongBian('tuPian', faSong, xianZai, true)).toBe(true)
    expect(shiKeChongBian('yuYin', faSong, xianZai, true)).toBe(false)
    expect(shiKeChongBian('biaoQingBao', faSong, xianZai, true)).toBe(false)
    expect(shiKeChongBian('wenJian', faSong, xianZai, true)).toBe(false)
    expect(shiKeChongBian('wenben', faSong, xianZai, false)).toBe(false)
  })

  it('校准缺失/无效时一律失效关闭，不退化为客户端时间', () => {
    const faSong = 1_000_000
    expect(shiKeChongBian('wenben', faSong, null)).toBe(false)
    expect(shiKeChongBian('wenben', faSong, Number.NaN)).toBe(false)
    expect(shiKeChongBian('wenben', faSong, Number.POSITIVE_INFINITY)).toBe(false)
  })

  it('发送时间无效时不允许重编（不用客户端时间兜底）', () => {
    expect(shiKeChongBian('wenben', Number.NaN, 2_000_000)).toBe(false)
    expect(shiKeChongBian('wenben', 0, 2_000_000)).toBe(false)
  })

  it('回拨时钟语义由单调钟推进保证：读取器只增不减，较早服务器样本不回退', async () => {
    const { chuangJianShiJianXiaoZhunQi } = await import('../composables/撤回重编')
    const qi = chuangJianShiJianXiaoZhunQi(1_000_000, 5_000_000)
    const diYi = qi.duQu()
    qi.tuiJin(10_000)
    const diEr = qi.duQu()
    expect(diEr).toBeGreaterThanOrEqual(diYi)
    qi.shouDao(4_000_000)
    expect(qi.duQu()).toBeGreaterThanOrEqual(diEr)
    qi.tuiJin(0)
    expect(qi.duQu()).toBeGreaterThanOrEqual(diEr)
    qi.shouDao(Number.NaN)
    expect(Number.isFinite(qi.duQu())).toBe(true)
    qi.shouDao(1_000)
    expect(qi.duQu()).toBeGreaterThanOrEqual(diEr)
  })

  it('长按撤回入口使用统一校准时间，校验作废后不保留旧撤回菜单', async () => {
    const { use长按菜单 } = await import('../composables/use长按菜单')
    const { ref, nextTick } = await import('vue')
    const xianZai = 1_800_000_000_000
    const xiaoZhun = ref<number | null>(xianZai)
    const quan = use长按菜单({
      dangQianShiJian: ref(xianZai),
      cheHuiXiaoXi: async () => undefined,
      xiaoZhunShiJian: () => xiaoZhun.value,
    } as never)
    const xiaoXi = {
      id: 'm-1',
      nei_rong: '在吗',
      lei_xing: 'wenben',
      shi_jian_chuo: xianZai - 60_000,
      fa_song_zhe_lei_xing: 'yonghu',
    }
    quan.daKaiCaiDan(xiaoXi as never, { clientX: 0, clientY: 0 } as MouseEvent)
    expect([...quan.dangQianCaiDanXiang.value]).toContain('cheHui')
    xiaoZhun.value = null
    quan.daKaiCaiDan(xiaoXi as never, { clientX: 0, clientY: 0 } as MouseEvent)
    expect(quan.dangQianXiaoXi.value).toBeNull()
    expect(quan.dangQianCaiDanLeiXing.value).toBeNull()
    xiaoZhun.value = xianZai - 10_000_000
    quan.daKaiCaiDan(xiaoXi as never, { clientX: 0, clientY: 0 } as MouseEvent)
    expect(quan.dangQianXiaoXi.value).toBeNull()
    expect(quan.dangQianCaiDanLeiXing.value).toBeNull()
    expect([...quan.dangQianCaiDanXiang.value]).not.toContain('cheHui')
  })
})
