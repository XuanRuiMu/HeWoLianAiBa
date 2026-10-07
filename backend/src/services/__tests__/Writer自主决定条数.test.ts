import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Writer 自主决定条数（第十三轮，用户裁决方案 B）。
 *
 * 根因：原实现 `slice(0, ceLue.hui_fu_tiao_shu)` 按 Director 的「回复条数」硬截断。
 * 实测（backend/scripts/语域分析/收尾位置.mts）：
 *   问句落在最后一条的比例 AI **34.7%** vs 真人 **19.3%**（硬问号）
 *                          AI **29.9%** vs 真人 **20.7%**（宽口径）
 * Writer 一次性生成整段再被切开 ⇒ 最后一条必然是「收尾/追问」；
 * 真人是一条一条发的，追问可能出现在任何位置、也可能没有。截断把该特征固化了。
 *
 * 本文件锁住两条不变量：
 *   ① Writer 输出的条数**不再**被 Director 的 hui_fu_tiao_shu 改写
 *   ② 仍有 ZUI_DA_TIAO_SHU(5) 失控护栏 —— 模型吐十几条时必须被截
 */

const 假 = vi.hoisted(() => ({
  shengChengDirectorCeLue: vi.fn(),
  shengChengWriterHuiFu: vi.fn(),
  jianChaAiWei: vi.fn(() => ({ mingZhong: [], tongGuo: true })),
  panDuanShiFouCaiYang: vi.fn(() => false),
  panDuanShiFouMoXingChouJian: vi.fn(() => false),
}))

vi.mock('../Director', () => ({ shengChengDirectorCeLue: 假.shengChengDirectorCeLue }))
vi.mock('../Writer', () => ({ shengChengWriterHuiFu: 假.shengChengWriterHuiFu }))
vi.mock('../../config/去AI味配置', () => ({
  jianChaAiWei: 假.jianChaAiWei,
  panDuanShiFouCaiYang: 假.panDuanShiFouCaiYang,
  panDuanShiFouMoXingChouJian: 假.panDuanShiFouMoXingChouJian,
  guoLvAiWeiXiaoXi: (xs: string[]) => ({ baoLiu: xs, beiFengSha: [] }),
}))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn() }))

const { yunXingAIYinQing } = await import('../AI引擎')

const shuRu = {
  yong_hu_id: 'u1',
  jiao_se_id: 'j1',
  jiao_se: { wei_xin_ming: '小美', xing_ge: '沉稳', mbti_lei_xing: 'ISTJ', ie_lei_xing: 'I' },
  yong_hu_xin_xiao_xi: '在干嘛',
  dui_hua_li_shi: [],
  hao_gan_du: { zong_fen: 500, guan_xi_jie_duan: 'shuXi' },
  shi_fou_di_yi_lun: false,
} as never

/** Writer 写出这多条，Director 声称要 N 条 */
function paiZhi(weiZhuTiaoShu: number, xianShengTiaoShu: string[]) {
  假.shengChengDirectorCeLue.mockResolvedValue({
    cheng_gong: true,
    ce_lue: {
      yong_hu_yi_tu: '闲聊',
      qing_gan_fen_xi: '平静',
      hui_fu_ce_lue: '自然发挥',
      shi_fou_hui_fu: true,
      hui_fu_tiao_shu: weiZhuTiaoShu,
      shi_jian_qing_xu: '正常',
      shi_fou_che_hui: false,
      shi_fou_zhu_dong_biao_bai: false,
    },
  })
  假.shengChengWriterHuiFu.mockResolvedValue({
    xiao_xi_lie_biao: xianShengTiaoShu,
    yuan_wen: xianShengTiaoShu.join('\n'),
  })
}

describe('Writer 自主决定条数（方案 B）', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Director 说 1 条、Writer 写 3 条 ⇒ 3 条全部保留（不再按 Director 数字截断）', async () => {
    paiZhi(1, ['第一句', '第二句', '第三句'])
    const r = await yunXingAIYinQing(shuRu)
    expect(r.xiao_xi_lie_biao).toEqual(['第一句', '第二句', '第三句'])
  })

  it('Director 说 5 条、Writer 写 2 条 ⇒ 2 条全部保留（不再向下补齐）', async () => {
    paiZhi(5, ['只有一句', '就两句'])
    const r = await yunXingAIYinQing(shuRu)
    expect(r.xiao_xi_lie_biao).toEqual(['只有一句', '就两句'])
  })

  it('失控护栏仍在：Writer 吐 12 条 ⇒ 截到 5 条', async () => {
    paiZhi(2, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'])
    const r = await yunXingAIYinQing(shuRu)
    expect(r.xiao_xi_lie_biao).toHaveLength(5)
  })

  it('Director 说「已读不回」⇒ 仍不调 Writer（游戏逻辑不能被 B 破坏）', async () => {
    假.shengChengDirectorCeLue.mockResolvedValue({
      cheng_gong: true,
      ce_lue: {
        yong_hu_yi_tu: '闲聊', qing_gan_fen_xi: '平静', hui_fu_ce_lue: '这次先不回',
        shi_fou_hui_fu: false, hui_fu_tiao_shu: 0, shi_jian_qing_xu: '忙',
        shi_fou_che_hui: false, shi_fou_zhu_dong_biao_bai: false,
      },
    })
    const r = await yunXingAIYinQing(shuRu)
    expect(假.shengChengWriterHuiFu).not.toHaveBeenCalled()
    expect(r.xiao_xi_lie_biao).toEqual([])
  })

  it('Director 的撤回/表白意图仍透传给调用方（B 未动游戏逻辑）', async () => {
    假.shengChengDirectorCeLue.mockResolvedValue({
      cheng_gong: true,
      ce_lue: {
        yong_hu_yi_tu: '闲聊', qing_gan_fen_xi: '平静', hui_fu_ce_lue: '自然发挥',
        shi_fou_hui_fu: true, hui_fu_tiao_shu: 2, shi_jian_qing_xu: '正常',
        shi_fou_che_hui: true, shi_fou_zhu_dong_biao_bai: true,
      },
    })
    假.shengChengWriterHuiFu.mockResolvedValue({ xiao_xi_lie_biao: ['一句话'], yuan_wen: '一句话' })
    const r = await yunXingAIYinQing(shuRu)
    expect(r.shi_fou_che_hui).toBe(true)
    expect(r.ce_lue?.shi_fou_zhu_dong_biao_bai).toBe(true)
  })
})