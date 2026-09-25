import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  messages: vi.fn(),
  ai: vi.fn(),
  update: vi.fn(),
  haoGanDu: vi.fn(),
  stage: vi.fn(),
  events: vi.fn(),
  key: vi.fn(),
  brokenEvents: vi.fn(),
  renderText: vi.fn((x: unknown) => String(x)),
  reference: vi.fn(() => ''),
  mixed: vi.fn(() => false),
  doc: vi.fn(async (x: unknown) => x),
  variant: vi.fn(() => '性别文案'),
  normalize: vi.fn((x: unknown) => x),
  variantConfig: { INTJ: { zhaFaMiaoShu: '话术', huaShu: ['花'], baoLuFangShi: '暴露', shiPoXianSuo: ['线索'] } },
  haoConfig: { miJi: { miLing: '秘籍' } },
}))

vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.ai }))
vi.mock('../消息', () => ({ huoQuXiaoXiLieBiao: 假.messages }))
vi.mock('../战绩', () => ({ gengXinFuPanNeiRong: 假.update }))
vi.mock('../../config/好感度配置', () => ({ HAO_GAN_DU_PEI_ZHI: 假.haoConfig }))
vi.mock('../../config/角色配置', () => ({ zhaXingBianTi: 假.variantConfig }))
vi.mock('../好感度', () => ({ huoQuWanZhengHaoGanDu: 假.haoGanDu, huoQuJieDuanMing: vi.fn((n: number) => `阶段${n}`) }))
vi.mock('../关键事件提取', () => ({ tiQuGuanJianShiJian: 假.key, tiQuBingLuoKuGuanJianShiJian: 假.brokenEvents }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))
vi.mock('../../utils/结局', () => ({ 渲染性别变体文案: 假.variant }))
vi.mock('../../utils/性别', () => ({ 归一角色性别: 假.normalize }))
vi.mock('../对话渲染', () => ({ gouJianYinYongChaXun: 假.reference, zhanShiXiaoXiZhengWen: 假.renderText }))
vi.mock('../消息内容块', () => ({ shiTuWenHunPaiKuai: 假.mixed }))
vi.mock('../文档文本提取', () => ({ buQiWenJianTiQuWenBen: 假.doc }))

import { shengChengFuPan } from '../复盘'

const 消息 = [
  { id: 'sys', fa_song_zhe_lei_xing: 'xitong', nei_rong: '系统', shi_jian_chuo: Date.now() },
  { id: 'u1', fa_song_zhe_lei_xing: 'yonghu', nei_rong: '你好', shi_jian_chuo: Date.now() },
  { id: 'r1', fa_song_zhe_lei_xing: 'jiaose', nei_rong: '嗨', shi_jian_chuo: Date.now(), nei_rong_kuai: [{ type: 'text', text: '嗨' }] },
]
const 角色 = { 微信昵称: '小花', 性别: 'nv', MBTI: 'INTJ', 是否渣型: true }

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.messages.mockResolvedValue({ lie_biao: 消息 })
  假.ai.mockResolvedValue({ neiRong: JSON.stringify({ pi_zhu: [{ xu_hao: 1, pi_zhu_nei_rong: '点评', qing_gan: '积极' }], zong_jie: { dui_xiang_lei_xing: '正常', yong_hu_biao_xian: '不错', guan_jian_zhuan_zhe_dian: ['转折', 1], gai_jin_jian_yi: true } }) })
  假.update.mockResolvedValue(undefined)
  假.haoGanDu.mockResolvedValue({ zong_fen: 88, guan_xi_jie_duan: '亲密' })
  假.brokenEvents.mockResolvedValue([{ shi_jian_lei_xing: '关系', miao_shu: '事件' }])
  假.key.mockResolvedValue([{ shi_jian_lei_xing: '关系', miao_shu: '事件' }])
  假.doc.mockImplementation(async (x: unknown) => x)
  假.mixed.mockReturnValue(false)
})

describe('复盘业务分支', () => {
  it('普通角色生成点评、结论并写入档案', async () => {
    假.db.query.mockImplementation(async (sql: string) => sql.includes('游戏档案') ? { rows: [{ 是否秘籍通关: false, 秘籍前好感度: null }] } : { rows: [角色] })
    const 结果 = await shengChengFuPan('用户', '角色', '档案')
    expect(结果.fu_pan_pi_zhu).toEqual([{ xu_hao: 1, ping_lun: '点评', qing_gan: '积极' }])
    expect(结果.fu_pan_nei_rong).toContain('用户表现')
    expect(假.update).toHaveBeenCalledWith('档案', expect.any(String), expect.any(Array))
    expect(假.brokenEvents).toHaveBeenCalled()
  })

  it('渣型秘籍通关截断记录、覆盖轨迹并生成警示', async () => {
    假.db.query.mockImplementation(async (sql: string) => sql.includes('游戏档案') ? { rows: [{ 是否秘籍通关: true, 秘籍前好感度: 66 }] } : { rows: [{ ...角色, MBTI: 'INTJ' }] })
    假.messages.mockResolvedValue({ lie_biao: [
      { ...消息[1], nei_rong: '普通' },
      { ...消息[2], nei_rong: '秘籍' },
      { ...消息[2], id: 'after', nei_rong: '之后' },
    ] })
    假.ai.mockResolvedValue({ neiRong: JSON.stringify({ zong_jie: '', zha_dian_ti_shi: { 提示: '重点' }, pi_zhu: [{ xu_hao: 0, pi_zhu_nei_rong: '无效' }, { xu_hao: 1, pi_zhu_nei_rong: ['好', 2] }] }) })
    const 结果 = await shengChengFuPan('用户', '角色', '档案')
    expect(结果.fu_pan_nei_rong).toContain('重点')
    expect(结果.fu_pan_nei_rong).toContain('miJiShengMing')
    expect(假.haoGanDu).toHaveBeenCalled()
  })

  it('角色缺失、无消息、坏JSON和事件失败均能降级', async () => {
    假.db.query.mockResolvedValue({ rows: [] })
    假.messages.mockResolvedValue({ lie_biao: [] })
    假.haoGanDu.mockResolvedValue(null)
    假.ai.mockResolvedValue({ neiRong: '前缀 {坏JSON} 后缀' })
    const 结果 = await shengChengFuPan('用户', '角色', '档案')
    expect(结果.fu_pan_pi_zhu).toEqual([])
    expect(结果.fu_pan_nei_rong).toBe('前缀 {坏JSON} 后缀')
    假.brokenEvents.mockRejectedValueOnce(new Error('事件失败'))
    假.messages.mockResolvedValue({ lie_biao: [{ ...消息[1], id: 'x' }] })
    假.ai.mockResolvedValue({ neiRong: '没有JSON' })
    await expect(shengChengFuPan('用户', '角色', '档案')).resolves.toMatchObject({ fu_pan_pi_zhu: [] })
  })

  it('无渣型时使用正常条件，坏时间转为空评论', async () => {
    假.db.query.mockImplementation(async (sql: string) => sql.includes('游戏档案') ? { rows: [{ 是否秘籍通关: false, 秘籍前好感度: null }] } : { rows: [{ ...角色, 是否渣型: false, MBTI: '' }] })
    假.ai.mockResolvedValue({ neiRong: JSON.stringify({ pi_zhu: [{ xu_hao: 1, pi_zhu_nei_rong: null }, { xu_hao: 2, pi_zhu_nei_rong: '有效', qing_gan: ' ' }], zong_jie: '字符串结论' }) })
    const 结果 = await shengChengFuPan('用户', '角色', '档案')
    expect(结果.fu_pan_pi_zhu).toEqual([{ xu_hao: 2, ping_lun: '有效' }])
    expect(结果.fu_pan_nei_rong).toBe('字符串结论')
  })
})
