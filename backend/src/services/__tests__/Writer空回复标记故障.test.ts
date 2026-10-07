import { describe, it, expect, vi, beforeEach } from 'vitest'
import { huoQuFanYi } from '../../config/translations'

/**
 * 「Director 说要回、Writer 交白卷」必须被标记为故障，而非静默的「已读不回」。
 *
 * ⚠️ 为什么单独测这一层（第十二轮实测 P0-②）：
 *   实测 400 轮里 3 轮（INTP/L7、INFJ/L18、ESFJ/L8）
 *   `ceLue.shi_fou_hui_fu === true` 且策略写满，但 `xiao_xi_lie_biao` 为 `[]`。
 *   `AI回复调度器` 侧已有测试，但**引擎侧这段标记此前零覆盖** ——
 *   把它整段删掉，`tsc` 静默、所有测试照样全绿（实测验证过）。
 *
 * 断言用「翻译键」而非字面文案，这样翻译改了测试不会假失败。
 */

const 假 = vi.hoisted(() => ({
  ceLue: { shi_fou_hui_fu: true, hui_fu_ce_lue: '先给个不算敷衍的答案，再反问她为什么突然问这个', shi_jian_qing_xu: '好奇', hui_fu_tiao_shu: 2 } as Record<string, unknown> | undefined,
  writerTiao: ['我刚说了你别打断我'] as string[],
}))

vi.mock('../Director', () => ({
  // ⚠️ 必须带 `cheng_gong: true`：AI引擎.ts:191 判的是这个字段，
  //    缺失会走「Director调用失败，降级为单代理模式」分支（ceLue 变 undefined），
  //    导致本测试测的根本不是目标分支。
  shengChengDirectorCeLue: vi.fn(async () => ({ cheng_gong: true, ce_lue: 假.ceLue, si_kao: '' })),
}))
vi.mock('../Writer', () => ({
  shengChengWriterHuiFu: vi.fn(async () => ({
    xiao_xi_lie_biao: 假.writerTiao,
    yuan_wen: 假.writerTiao.join('\n'),
    kai_chang_hou_xuan: [],
  })),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({
    xin_ren_du: 1, qin_mi_du: 1, qu_wei_du: 1, guan_huai_du: 1, zong_fen: 400, guan_xi_jie_duan: 'shuXi',
  })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))
vi.mock('../好感度评判', () => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(async () => ({
    jieGuo: { xin_ren_du_bian_hua: 0, qin_mi_du_bian_hua: 0, qu_wei_du_bian_hua: 0, guan_huai_du_bian_hua: 0, li_you: 't' },
    xiShu: 1, muBiaoWanZhengLunShu: 1, lianXuWeiDaBiao: false,
  })),
}))
vi.mock('../消息', () => ({
  cheHuiJiaoSeXiaoXi: vi.fn(async () => ({ cheng_gong: true })),
  baoCunJiaoSeMeiTiXiaoXi: vi.fn(async () => ({ id: 'y' })),
}))
vi.mock('../对话摘要', () => ({
  duQuDuiHuaZhaiYao: vi.fn(async () => ''),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(),
  duQuTongBuZhaiYao: vi.fn(() => ''),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
}))
vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => false),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => false),
  chuLiYouXiJieShu: vi.fn(async () => undefined),
}))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn(async () => null) }))
vi.mock('../../utils/debug日志', () => ({
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: vi.fn(async () => undefined) }))

const shuRu = {
  yong_hu_id: 'yh', jiao_se_id: 'js',
  jiao_se: { id: 'js', wei_xin_ming: '小甜心', nian_ling: 22, xing_ge: '慢热', yan_yu_feng_ge: '直接' } as never,
  hao_gan_du: { zong_fen: 400, guan_xi_jie_duan: 'shuXi' } as never,
  dui_hua_li_shi: [],
  yong_hu_xin_xiao_xi: '在吗',
  shi_fou_di_yi_lun: false,
  shi_jian_chang_jing: '20:31',
  tu_pian_shou_quan: false,
} as never

describe('Writer 交白卷必须标记为故障（P0-② 引擎侧）', () => {
  beforeEach(() => {
    假.ceLue = { shi_fou_hui_fu: true, hui_fu_ce_lue: '先给个不算敷衍的答案，再反问她为什么突然问这个', shi_jian_qing_xu: '好奇', hui_fu_tiao_shu: 2 }
    假.writerTiao = ['我刚说了你别打断我']
  })

  it('Director 要回 + Writer 输出空 → 必须带 WriterFuShiKongBai 错误码', async () => {
    假.writerTiao = []
    const { yunXingAIYinQing } = await import('../AI引擎')
    const chu = await yunXingAIYinQing(shuRu)
    expect(chu.xiao_xi_lie_biao, '本轮确实无内容').toEqual([])
    expect(chu.shi_fou_hui_fu, '用户侧仍是「没收到回复」').toBe(false)
    expect(chu.cuo_wu_xin_xi, '必须给出错误码，否则调度器无法区分故障与已读不回')
      .toBe(huoQuFanYi('AI', 'WriterFuShiKongBai'))
  })

  it('Director 说「已读不回」+ Writer 空 → 不算故障，不得带错误码', async () => {
    假.ceLue = { shi_fou_hui_fu: false, hui_fu_ce_lue: '这次先不回', shi_jian_qing_xu: '忙', hui_fu_tiao_shu: 0 }
    假.writerTiao = []
    const { yunXingAIYinQing } = await import('../AI引擎')
    const chu = await yunXingAIYinQing(shuRu)
    expect(chu.xiao_xi_lie_biao).toEqual([])
    expect(chu.cuo_wu_xin_xi, '已读不回是正常产品行为，不得报错').toBeUndefined()
  })

  it('正常回复不受影响：既非空也无错误码', async () => {
    const { yunXingAIYinQing } = await import('../AI引擎')
    const chu = await yunXingAIYinQing(shuRu)
    expect(chu.xiao_xi_lie_biao.length).toBeGreaterThan(0)
    expect(chu.cuo_wu_xin_xi).toBeUndefined()
  })
})