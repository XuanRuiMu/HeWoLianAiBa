import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'
import { baoCunJiaoSe, type ShengChengJiaoSeJieGuo } from '../角色生成'

const 假 = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  generate: vi.fn(),
  probability: vi.fn(),
  saveMessage: vi.fn(),
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: 假.query,
    connect: 假.connect,
  },
}))
vi.mock('../开场白生成', () => ({ shengChengKaiChangBai: 假.generate }))
vi.mock('../开场白概率', () => ({ jiSuanKaiChangBaiGaiLv: 假.probability }))
vi.mock('../AI输入准备', () => ({ baoCunJiaoSeXiaoXi: 假.saveMessage }))

function 角色(): ShengChengJiaoSeJieGuo {
  return {
    id: '',
    ming_zi: '测试角色',
    xing_bie: 'nv',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '短发',
    xing_ge: '安静',
    bei_jing_gu_shi: '背景',
    xi_hao: ['阅读'],
    yan_yu_feng_ge: '简短',
    xing_wei_te_dian: '谨慎',
    tou_xiang: '🙂',
    biao_qian: ['INTJ'],
    xi_huan_de_lei_xing: '真诚',
    jia_ting_bei_jing: '家庭',
    qing_gan_jing_li: '经历',
    shi_fou_zha_xing: false,
    yu_she_lei_xing: 'INTJ',
    mbti_lei_xing: 'INTJ',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '慢热',
    hui_fu_yan_chi_hao_miao: 1000,
    wei_xin_ming: '昵称',
    zhen_shi_ming: '真实姓名',
    shi_jie_xin_xi: {},
    xi_tong_ti_shi: '',
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '',
      wai_mao: '',
      xing_ge: '',
      bei_jing: '',
      yan_yu: '',
      xing_wei: '',
      guan_xi: '',
      xi_tong_ti_shi: '',
    },
    hao_gan_du_zong_fen: 100,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  假.query.mockResolvedValue({ rows: [{ ID: '角色-1' }] })
  假.connect.mockResolvedValue({ query: 假.query, release: vi.fn() })
  假.generate.mockResolvedValue({ xiao_xi_lie_biao: ['嗨'] })
  假.probability.mockResolvedValue(1)
  假.saveMessage.mockResolvedValue({ id: '消息-1' })
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FP-13 角色生成阶段错误', () => {
  it('初始化输入非法返回输入阶段码', async () => {
    await expect(baoCunJiaoSe('用户-1', { ...角色(), xing_bie: '未知' as never })).rejects.toMatchObject({
      code: CUO_WU_DAI_MA.ROLE_GENERATION_INPUT_INVALID,
    })
  })

  it('数据库事务失败返回持久化阶段码且不伪装成功', async () => {
    假.query.mockRejectedValueOnce(new Error('SQLSTATE password=secret'))
    await expect(baoCunJiaoSe('用户-1', 角色())).rejects.toMatchObject({
      code: CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED,
    })
  })

  it('模型调用失败返回模型阶段码', async () => {
    假.generate.mockRejectedValueOnce(new Error('上游网络错误'))
    await expect(baoCunJiaoSe('用户-1', 角色())).rejects.toMatchObject({
      code: CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_CALL_FAILED,
    })
  })

  it('开场白消息持久化失败返回持久化阶段码', async () => {
    假.saveMessage.mockRejectedValueOnce(new Error('消息落库失败'))
    await expect(baoCunJiaoSe('用户-1', 角色())).rejects.toMatchObject({
      code: CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED,
    })
  })

  it('角色持久化与开场白保存成功时保持原成功结果', async () => {
    const 结果 = await baoCunJiaoSe('用户-1', 角色())
    expect(结果.id).toBe('角色-1')
    expect(结果.xing_bie).toBe('nv')
    expect(假.saveMessage).toHaveBeenCalledWith(expect.objectContaining({ yong_hu_id: '用户-1', jiao_se_id: '角色-1' }))
  })
})
