import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  角色: { yong_hu_id: '用户', id: '角色' },
  ai角色: { wei_xin_ming: '角色' },
  消息: [] as Record<string, unknown>[],
  状态: null as Record<string, unknown> | null,
  重复: false,
  ai生成: vi.fn(),
  角色取数: vi.fn(),
  ai角色取数: vi.fn(),
  消息取数: vi.fn(),
  状态取数: vi.fn(),
  状态设置: vi.fn(),
  状态删除: vi.fn(),
  重复检查: vi.fn(),
  缓存: vi.fn(),
  记录: vi.fn(),
  记录列表: vi.fn(),
  文档: vi.fn(),
  好感: vi.fn(),
  debug: { error: vi.fn() },
  求助日志: vi.fn(),
  提示: vi.fn(() => '上下文'),
  军师: {
    id: '专家',
    mingCheng: '专家',
    fuBiaoTi: '副标题',
    biaoQian: '标签',
    miaoShu: '描述',
    touXiang: '头像',
    xiTongTiShi: '提示',
  },
}))

vi.mock('../../config/军师配置', () => ({ JUN_SHI_PEI_ZHI: { 专家: 假.军师 }, JUN_SHI_PEI_ZHI_MO_REN: 假.军师 }))
vi.mock('../../config/AI配置', () => ({ AI_PEI_ZHI: { prompt: { junShiLiShiXiaoXiShuLiang: 10 } } }))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: 假.提示 }))
vi.mock('../好感度', () => ({ huoQuWanZhengHaoGanDu: 假.好感 }))
vi.mock('../消息', () => ({ huoQuXiaoXiLieBiao: 假.消息取数, huoQuJiaoSeSuoYouZhe: 假.角色取数 }))
vi.mock('../消息内容块', () => ({ shiTuWenHunPaiKuai: vi.fn(() => false) }))
vi.mock('../文档文本提取', () => ({ buQiWenJianTiQuWenBen: 假.文档 }))
vi.mock('../军师求助', () => ({ shengChengJunShiZhiDao: 假.ai生成 }))
vi.mock('../AI输入准备', () => ({ huoQuAIJiaoSeXinXi: 假.ai角色取数 }))
vi.mock('../军师缓存', () => ({
  jiSuanLiaoTianHaXi: vi.fn(() => 'hash'),
  jianChaJunShiChongFu: 假.重复检查,
  baoCunJunShiHaXi: 假.缓存,
  baoCunJunShiJiLu: 假.记录,
  huoQuJunShiJiLuLieBiao: 假.记录列表,
  sheZhiJunShiZhiDaoZhuangTai: 假.状态设置,
  huoQuJunShiZhiDaoZhuangTai: 假.状态取数,
  shanChuJunShiZhiDaoZhuangTai: 假.状态删除,
}))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug, jiLuJunShiQiuZhu: 假.求助日志 }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { huoQuJunShiJiLu, huoQuJunShiLieBiao, huoQuJunShiZhiDaoZhuangTaiXinXi, qingQiuJunShiZhiDao } from '../军师'

const 指导 = { zhi_dao_zheng_duan: '建议', zhi_dao_fen_duan: 'first' }
const 好感 = { xin_ren_du: 1, qin_mi_du: 2, qu_wei_du: 3, guan_cai_du: 4, zong_fen: 10, guan_xi_jie_duan: 'qingNiao' }

beforeEach(() => {
  vi.clearAllMocks()
  假.消息.length = 0
  假.状态 = null
  假.重复 = false
  假.角色取数.mockResolvedValue(假.角色)
  假.ai角色取数.mockResolvedValue(假.ai角色)
  假.消息取数.mockImplementation(async () => ({ lie_biao: 假.消息 }))
  假.状态取数.mockImplementation(async () => 假.状态)
  假.状态设置.mockResolvedValue(undefined)
  假.状态删除.mockResolvedValue(undefined)
  假.重复检查.mockImplementation(async () => 假.重复)
  假.缓存.mockResolvedValue(undefined)
  假.记录.mockResolvedValue(undefined)
  假.记录列表.mockResolvedValue([])
  假.文档.mockImplementation(async (v: unknown) => v)
  假.好感.mockResolvedValue(好感)
  假.ai生成.mockResolvedValue(指导)
})

describe('军师业务分支', () => {
  it('返回军师列表并重建用户可见记录白名单', async () => {
    await expect(huoQuJunShiLieBiao()).resolves.toMatchObject({ junShiLieBiao: [{ id: '专家' }] })
    假.记录列表.mockResolvedValueOnce([{ jian_yi: '建议', jian_yi_fen_duan: null, shi_jian: '时间', jiao_se_id: '角色', jiao_se_ming_zi: '角色', jun_shi_id: '专家', jun_shi_ming_chen: '专家', jun_shi_tou_xiang: '头像', dui_hua_zhai_yao: '', liao_tian_ji_lu: [{ jiao_se: '角色', nei_rong: '内容', shi_jian: '时间', yi_che_hui: 1, che_hui_shi_jian: undefined, yuan_shi_nei_rong: '泄露' }] }])
    const 结果 = await huoQuJunShiJiLu('用户', '角色')
    expect(结果.jiLuLieBiao[0].liao_tian_ji_lu[0]).toEqual({ jiao_se: '角色', nei_rong: '内容', shi_jian: '时间', yi_che_hui: true, che_hui_shi_jian: null })
    expect(结果.jiLuLieBiao[0].liao_tian_ji_lu[0]).not.toHaveProperty('yuan_shi_nei_rong')
  })

  it('状态查询覆盖指导中、已完成、有记录和无记录', async () => {
    假.状态 = { zhuang_tai: 'zhi_dao_zhong' }
    await expect(huoQuJunShiZhiDaoZhuangTaiXinXi('用户', '角色')).resolves.toMatchObject({ ke_zai_ci_zhi_dao: false, you_liao_tian_ji_lu: true })
    假.状态 = { zhuang_tai: 'yi_wan_cheng' }
    await expect(huoQuJunShiZhiDaoZhuangTaiXinXi('用户', '角色')).resolves.toMatchObject({ ke_zai_ci_zhi_dao: false })
    假.状态 = null
    假.消息.push({ id: '1', fa_song_zhe_lei_xing: 'yonghu', nei_rong: '你好', shi_jian_chuo: Date.now() })
    await expect(huoQuJunShiZhiDaoZhuangTaiXinXi('用户', '角色')).resolves.toMatchObject({ ke_zai_ci_zhi_dao: true, you_liao_tian_ji_lu: true })
    假.消息.length = 0
    await expect(huoQuJunShiZhiDaoZhuangTaiXinXi('用户', '角色')).resolves.toMatchObject({ ke_zai_ci_zhi_dao: true, you_liao_tian_ji_lu: false })
  })

  it('请求指导覆盖角色、权限、进行中、资料、聊天和重复分支', async () => {
    假.角色取数.mockResolvedValueOnce(null)
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'JIAO_SE_BU_CUN_ZAI' })
    假.角色取数.mockResolvedValueOnce({ yong_hu_id: '他人' })
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'WU_QUAN_XIAN' })
    假.状态取数.mockResolvedValueOnce({ zhuang_tai: 'zhi_dao_zhong' })
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'JUN_SHI_ZAI_ZHI_DAO_ZHONG' })
    假.角色取数.mockResolvedValueOnce(假.角色)
    vi.mocked(假.消息取数).mockResolvedValueOnce({ lie_biao: [] })
    const { huoQuAIJiaoSeXinXi } = await import('../AI输入准备')
    vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValueOnce(null)
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'JIAO_SE_BU_CUN_ZAI' })
    vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValueOnce(假.ai角色 as never)
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'WU_LIAO_TIAN_JI_LU' })
    假.消息.push({ id: '1', fa_song_zhe_lei_xing: 'yonghu', nei_rong: '你好', shi_jian_chuo: Date.now() })
    假.重复 = true
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'JUN_SHI_CHONG_FU' })
  })

  it('请求指导成功和生成异常均清理状态', async () => {
    假.消息.push({ id: '1', fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '旧名', nei_rong: '历史', shi_jian_chuo: Date.now() })
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色', jun_shi_id: '专家' })).resolves.toMatchObject({ cheng_gong: true, jie_guo: { zhiDaoNeiRong: '建议' } })
    expect(假.状态设置).toHaveBeenCalled()
    假.ai生成.mockRejectedValueOnce(new Error('生成失败'))
    await expect(qingQiuJunShiZhiDao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ cuo_wu_ma: 'XI_TONG_YI_CHANG' })
    expect(假.状态删除).toHaveBeenCalled()
  })
})
