import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  gen: vi.fn(),
  db: { query: vi.fn() },
  hao: { gengXin: vi.fn(), full: vi.fn() },
  io: { get: vi.fn(() => null) },
  redis: { set: vi.fn() },
  aiInput: { save: vi.fn() },
  vision: { block: vi.fn(async () => []), image: vi.fn(() => false) },
  render: { split: vi.fn(() => ({ 背景: [], 焦点: null })), history: vi.fn(() => ''), quote: vi.fn(() => '') },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  ending: { pass: vi.fn(() => true), render: vi.fn(() => '结局'), random: vi.fn(() => '趣味句') },
  challenge: { settle: vi.fn(async () => undefined) },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../好感度', () => ({ gengXinHaoGanDu: 假.hao.gengXin, huoQuWanZhengHaoGanDu: 假.hao.full }))
vi.mock('../../socket/io', () => ({ huoQuIo: 假.io.get }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../AI输入准备', () => ({ baoCunJiaoSeXiaoXi: 假.aiInput.save }))
vi.mock('../AI视觉辅助', () => ({ gouJianDanTiaoTuXiangKuai: 假.vision.block, shiTuXiangLeiBie: 假.vision.image }))
vi.mock('../对话渲染', () => ({ fenGeZuiJinYongHuXiaoXi: 假.render.split, fenGeZuiXinYongHuXiaoXi: 假.render.split, gouJianYinYongChaXun: vi.fn(() => vi.fn()), zhanShiLiShiWenBen: 假.render.history, zhanShiXiaoXiZhengWen: 假.render.quote }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug, jiLuYouXiJieJu: vi.fn(), jiLuSocketShiJian: vi.fn() }))
vi.mock('../../utils/结局', () => ({ 是否通关结局: 假.ending.pass, 渲染结局文案: 假.ending.render, 随机结局趣味文案: 假.ending.random }))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: 假.challenge.settle }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.gen }))

import { chuLiAIHuiFuHouJieShuJianCha, chuLiAIJieShouBiaoBai, chuLiHuShan, chuLiShenJingBing, chuLiShiPo, chuLiYongHuBiaoBai, chuLiYongHuJuJueAIHuoJieShou, chuLiYouXiJieShu, jianCeSiLianHeYi, jianCeYongHuXiaoXi, jianCeYongHuXiaoXiBingChuLi } from '../胜利失败条件'

const 用户 = '11111111-1111-4111-8111-111111111111'
const 角色 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const 人设 = { id: 角色, ming_zi: '角色名', wei_xin_ming: '昵称', xing_bie: 'nv', mbti_lei_xing: 'ENFP', ie_lei_xing: 'E', re_shen_lei_xing: '快热', nian_ling: 20, shen_fen: '', wai_mao: '', xing_ge: '活泼', bei_jing_gu_shi: '', xi_hao: [], yan_yu_feng_ge: '', xing_wei_te_dian: '', tou_xiang: '', xi_huan_de_lei_xing: '', jia_ting_bei_jing: '', qing_gan_jing_li: '', shi_fou_zha_xing: false, shi_jie_xin_xi: {}, ba_da_mo_kuai: { ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '' } } as never

function 设置数据库(行: Record<string, unknown> = {}) {
  假.db.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT "用户ID", "是否渣型"')) return { rows: [{ 用户ID: 用户, 是否渣型: false }], rowCount: 1 }
    if (sql.includes('SELECT "性别"')) return { rows: [{ 性别: 'nv' }] }
    if (sql.includes('SELECT "名字"')) return { rows: [{ 名字: '角色名', 是否渣型: false }] }
    if (sql.includes('SELECT "总分"')) return { rows: [{ 总分: 100, 关系阶段: 'renShi' }] }
    if (sql.includes('SELECT COUNT')) return { rows: [{ shu: 2 }] }
    if (sql.includes('SELECT "关系阶段"')) return { rows: [{ 关系阶段: 'renShi' }] }
    if (sql.includes('INSERT INTO "游戏结局"')) return { rows: [], rowCount: 行.rowCount ?? 1 }
    return { rows: [], rowCount: 1 }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  设置数据库()
  假.gen.mockResolvedValue({ neiRong: '{"是否表白":false,"是否互删":false,"是否识破":false,"是否神经病":false}' })
  假.hao.gengXin.mockResolvedValue({ cheng_gong: true })
  假.hao.full.mockResolvedValue({ zong_fen: 100 })
  假.io.get.mockReturnValue(null)
  假.redis.set.mockResolvedValue(true)
  假.vision.block.mockResolvedValue([])
  假.vision.image.mockReturnValue(false)
  假.render.split.mockReturnValue({ 背景: [], 焦点: null })
  假.render.history.mockReturnValue('')
  假.render.quote.mockReturnValue('')
  假.ending.pass.mockReturnValue(true)
  假.ending.render.mockReturnValue('结局')
  假.ending.random.mockReturnValue('趣味句')
  假.challenge.settle.mockResolvedValue(undefined)
})

describe('胜利失败条件业务分支', () => {
  it('四连检测覆盖 JSON、默认值、图片焦点和兼容入口', async () => {
    假.render.split.mockReturnValue({ 背景: [], 焦点: { meiTiLeiBie: 'tupian', yi_che_hui: false } })
    假.vision.image.mockReturnValue(true)
    假.vision.block.mockResolvedValue([{ type: 'input_image', image_url: 'x' }])
    假.gen.mockResolvedValueOnce({ neiRong: '前缀 {"是否表白":true,"表白类型":"直接表白","表白确信度":"bad","是否互删":true,"是否识破":true,"是否神经病":true,"神经病确信度":0.9,"人设能接受":true,"理由":"理由"} 后缀' })
    const 结果 = await jianCeSiLianHeYi('', [], 人设, true)
    expect(结果.biao_bai).toMatchObject({ shi_fou_biao_bai: true, biao_bai_lei_xing: 'zhi_jie_biao_bai', que_xin_du: 0 })
    expect(结果.hu_shan.shi_fou_hu_shan).toBe(true)
    expect(结果.shen_jing_bing.fa_san_si_wei_ren_she).toBe(true)
    await expect(jianCeYongHuXiaoXi('消息', [], 人设)).resolves.toHaveProperty('biao_bai')
  })

  it('结算覆盖角色性别、事务回退、胜负快照和挑战钩子', async () => {
    await expect(chuLiYouXiJieShu(用户, 角色, 'sheng_li_ai_qing', { a: 1 })).resolves.toMatchObject({ jie_guo_lei_xing: 'sheng_li_ai_qing', jie_guo_wen_an: '趣味句' })
    expect(假.challenge.settle).toHaveBeenCalled()
    设置数据库({ rowCount: 0 })
    await expect(chuLiYouXiJieShu(用户, 角色, 'shi_bai_hao_gan_du_gui_ling')).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_hao_gan_du_gui_ling' })
  })

  it('表白、互删、识破、神经病和好感度归零覆盖归属与角色类型', async () => {
    await expect(chuLiYongHuBiaoBai(用户, 角色, 1000)).resolves.toMatchObject({ jie_guo_lei_xing: 'sheng_li_ai_qing' })
    await expect(chuLiYongHuBiaoBai(用户, 角色, 10)).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_guo_zao_biao_bai' })
    await expect(chuLiHuShan(用户, 角色)).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_hu_shan_shi_bai' })
    await expect(chuLiShiPo(用户, 角色)).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_cuo_wu_shi_po' })
    假.redis.set.mockResolvedValueOnce(false)
    await expect(chuLiShenJingBing(用户, 角色, false, 人设)).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_shen_jing_bing' })
    假.redis.set.mockResolvedValueOnce(true)
    假.gen.mockResolvedValueOnce({ neiRong: '{"反应消息":"你在说什么？"}' })
    await expect(chuLiShenJingBing(用户, 角色, false, 人设)).resolves.toBeNull()
    假.hao.full.mockResolvedValueOnce(null)
    await expect(chuLiAIHuiFuHouJieShuJianCha(用户, 角色)).resolves.toBeNull()
    假.hao.full.mockResolvedValueOnce({ zong_fen: 0 })
    await expect(chuLiAIHuiFuHouJieShuJianCha(用户, 角色)).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_hao_gan_du_gui_ling' })
  })

  it('AI表白接受/拒绝和综合入口覆盖高置信、模糊及无归属', async () => {
    await expect(chuLiAIJieShouBiaoBai(用户, 角色, 人设)).resolves.toMatchObject({ jie_guo_lei_xing: 'sheng_li_ai_qing' })
    假.gen.mockResolvedValueOnce({ neiRong: '{"是否接受":true,"确信度":0.99,"是否模糊回复":false}' })
    await expect(chuLiYongHuJuJueAIHuoJieShou(用户, 角色, 人设, '接受')).resolves.toMatchObject({ jie_guo_lei_xing: 'sheng_li_ai_qing' })
    假.gen.mockResolvedValueOnce({ neiRong: '{"是否接受":false,"确信度":0.99,"是否模糊回复":false}' })
    await expect(chuLiYongHuJuJueAIHuoJieShou(用户, 角色, 人设, '拒绝')).resolves.toMatchObject({ jie_guo_lei_xing: 'shi_bai_ju_jue_biao_bai' })
    假.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await expect(jianCeYongHuXiaoXiBingChuLi(用户, 角色, '消息', 100, false, 人设)).resolves.toBeNull()
  })
})
