import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import luYou from '../消息'
import { chuangJianYongHuXiaoXi } from '../../services/消息'
import { chongZhiJiaoSeTiaoDuQi, luoKuChuFaJiaoSeTiaoDuQi } from '../../socket/聊天'
import { huoQuIo } from '../../socket/io'
import { jiLuShenJiRiZhi } from '../../services/审计日志'
import { jiLuSiKao } from '../../services/思考记录'
import { shanChuJunShiZhiDaoZhuangTai } from '../../services/军师缓存'
import { jianCeWeiJiXinHao, shenHeNeiRongAnQuan } from '../../services/安全审核'
import { debug日志 } from '../../utils/debug日志'
import { HAO_GAN_DU_PEI_ZHI } from '../../config/好感度配置'

const 用户ID = '22222222-2222-4222-8222-222222222222'
const 角色ID = '11111111-1111-4111-8111-111111111111'

function 刚落库的消息(正文: string) {
  return {
    id: '101',
    hui_hua_id: 角色ID,
    fa_song_zhe_id: 用户ID,
    fa_song_zhe_lei_xing: 'yonghu',
    ai_biao_shi: false,
    nei_rong: 正文,
    lei_xing: 'wenben',
    shi_jian_chuo: 1700000000000,
    yi_du: true,
    ke_hu_duan_xu_hao: 7,
  }
}

// 这些 mock 只用于「注入失败」，不是把被测调用绕过：被注入的副作用在断言里逐条校验
// 「确实被调用了一次、且带着刚落库的消息」，随后由 routes 侧的落库后副作用入口吞掉。
vi.mock('../../socket/聊天', () => ({
  luoKuChuFaJiaoSeTiaoDuQi: vi.fn(() => {
    throw new Error('调度器创建同步抛错')
  }),
  chongZhiJiaoSeTiaoDuQi: vi.fn(() => {
    throw new Error('调度器重置同步抛错')
  }),
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => ({
    to: vi.fn(() => ({
      emit: vi.fn(() => {
        throw new Error('socket 推送抛错')
      }),
    })),
  })),
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  aiQingQiuXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/输入验证', () => ({
  聊天内容验证中间件: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/管理员', () => ({
  guanLiGaoWeiMenKong: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  guanLiZhiDuMenKong: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  // FP-22：出参收口按能力裁剪；本文件测的是「副作用抛不得」，一律按普通用户口径
  anYongHuIdJuBeiNengLi: vi.fn(async () => false),
}))

vi.mock('../../services/消息', () => ({
  huoQuXiaoXiLieBiao: vi.fn(async () => ({ lie_biao: [], zong_shu: 0, hai_you_geng_duo: false })),
  chuangJianYongHuXiaoXi: vi.fn(async () => ({ cheng_gong: true, xiao_xi: null })),
  cheHuiYongHuXiaoXi: vi.fn(async () => ({ cheng_gong: true, xiao_xi: { id: '101' } })),
  biaoJiSuoYouWeiDu: vi.fn(async () => undefined),
  huoQuJiaoSeSuoYouZhe: vi.fn(async () => null),
}))

vi.mock('../../services/安全审核', () => ({
  jianCeWeiJiXinHao: vi.fn(() => null),
  shenHeNeiRongAnQuan: vi.fn(async () => ({ wei_gui: false })),
}))

vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))

vi.mock('../../services/IP封禁', () => ({
  获取IP: () => '127.0.0.1',
  记录违规: vi.fn(() => ({ 已封禁: false })),
}))

vi.mock('../../services/审计日志', () => ({
  jiLuShenJiRiZhi: vi.fn(async () => {
    throw new Error('审计写入失败')
  }),
}))

vi.mock('../../services/思考记录', () => ({
  jiLuSiKao: vi.fn(async () => {
    throw new Error('思考记录写入失败')
  }),
}))

vi.mock('../../services/军师缓存', () => ({
  shanChuJunShiZhiDaoZhuangTai: vi.fn(async () => {
    throw new Error('Redis 不可用')
  }),
}))

vi.mock('../../services/军师', () => ({
  huoQuJunShiLieBiao: vi.fn(async () => ({ junShiLieBiao: [] })),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn(async () => []),
  huoQuJunShiZhiDaoZhuangTaiXinXi: vi.fn(async () => null),
}))

vi.mock('../../services/好感度', () => ({
  sheZhiMiJiHaoGanDu: vi.fn(async () => ({ cheng_gong: true })),
}))

vi.mock('../../services/AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: '900', lei_xing: 'wenben' })),
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const 应用 = express()
应用.use(express.json())
应用.use((qingQiu, _xiangYing, xiaYiBu) => {
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})
应用.use((请求, _响应, 下一项) => {
  (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 用户ID }
  下一项()
})
应用.use('/api/聊天', luYou)

function faSong(正文: Record<string, unknown>) {
  return request(应用).post(encodeURI(`/api/聊天/会话/${角色ID}/消息`)).send(正文)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(jianCeWeiJiXinHao).mockReturnValue(null)
  vi.mocked(shenHeNeiRongAnQuan).mockResolvedValue({ wei_gui: false } as never)
  vi.mocked(chuangJianYongHuXiaoXi).mockResolvedValue({
    cheng_gong: true,
    xiao_xi: 刚落库的消息('你好呀'),
  } as never)
})

describe('聊天发送：落库成功后的副作用不得把请求打成 500', () => {
  it('AI 触发同步抛错时仍返回 200，响应体就是刚落库的那条消息', async () => {
    const 响应 = await faSong({ neiRong: '你好呀', 客户端序号: 7 })

    // 前提：副作用确实被执行了（不是被 mock 绕过）
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledTimes(1)
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledWith(用户ID, 角色ID, 刚落库的消息('你好呀'))

    expect(响应.status).toBe(200)
    expect(响应.body.cheng_gong).toBe(true)
    expect(响应.body.shu_ju).toEqual(刚落库的消息('你好呀'))
  })

  it('军师状态清理与调度器触发双双抛错时仍然 200（每一个落库后副作用各自被吞）', async () => {
    const 响应 = await faSong({ neiRong: '你好呀', 客户端序号: 7 })

    expect(shanChuJunShiZhiDaoZhuangTai).toHaveBeenCalledTimes(1)
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju).toEqual(刚落库的消息('你好呀'))
  })

  it('副作用失败一定落服务端日志（含标识与栈），不允许静默藏问题', async () => {
    await faSong({ neiRong: '你好呀', 客户端序号: 7 })

    const 副作用日志 = vi
      .mocked(debug日志.error)
      .mock.calls
      .filter((xiang) => xiang[0] === '落库后副作用')
    expect(副作用日志.length).toBeGreaterThanOrEqual(2)
    const 触发日志 = 副作用日志.find((xiang) => String(xiang[2]?.xiang_qing?.ming_cheng).includes('AI调度器'))
    expect(触发日志).toBeDefined()
    expect(String(触发日志?.[2]?.xiang_qing?.zhan)).toContain('调度器创建同步抛错')
    expect(触发日志?.[2]?.yong_hu_id).toBe(用户ID)
    expect(触发日志?.[2]?.jiao_se_id).toBe(角色ID)
  })

  it('危机干预分支：审计落账与 AI 触发都失败时仍 200 且带援助文案', async () => {
    vi.mocked(jianCeWeiJiXinHao).mockReturnValue({
      wei_ji: true,
      yuan_zhu_re_xian: '12356',
      ti_shi: '援助提示',
      ming_zhong_ci: '自杀',
    } as never)

    const 响应 = await faSong({ neiRong: '我不想活了', 客户端序号: 9 })

    expect(jiLuShenJiRiZhi).toHaveBeenCalledTimes(1)
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.wei_ji_gan_yu).toBe(true)
    expect(响应.body.shu_ju.gan_yu_ti_shi).toBe('援助提示')
    expect(响应.body.shu_ju.id).toBe('101')
  })

  it('秘密指令分支：角色回复推送抛错时仍 200 且仍不回驱动 AI', async () => {
    const 响应 = await faSong({ neiRong: HAO_GAN_DU_PEI_ZHI.miJi.miLing, 客户端序号: 10 })

    expect(huoQuIo).toHaveBeenCalled()
    expect(luoKuChuFaJiaoSeTiaoDuQi).not.toHaveBeenCalled()
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.shi_mi_ji).toBe(true)
  })

  it('落库真的失败时仍是业务状态码，不被副作用口径掩盖', async () => {
    vi.mocked(chuangJianYongHuXiaoXi).mockResolvedValue({
      cheng_gong: false,
      ti_shi: '消息内容过长',
      zhuang_tai_ma: 400,
    } as never)

    const 响应 = await faSong({ neiRong: '你好呀', 客户端序号: 11 })

    expect(响应.status).toBe(400)
    expect(luoKuChuFaJiaoSeTiaoDuQi).not.toHaveBeenCalled()
  })

  it('内容违规仍 403：落库前拦截属安全边界，不受本次口径影响', async () => {
    vi.mocked(shenHeNeiRongAnQuan).mockResolvedValue({
      wei_gui: true,
      lei_xing: '淫秽色情',
      li_you: '命中词库',
    } as never)

    const 响应 = await faSong({ neiRong: '违规内容', 客户端序号: 12 })

    expect(响应.status).toBe(403)
    expect(chuangJianYongHuXiaoXi).not.toHaveBeenCalled()
    expect(luoKuChuFaJiaoSeTiaoDuQi).not.toHaveBeenCalled()
  })
})

describe('聊天撤回：落库成功后的副作用不得把请求打成 500', () => {
  function cheHui() {
    return request(应用).put(encodeURI(`/api/聊天/会话/${角色ID}/消息/101/撤回`)).send({})
  }

  it('调度器重置 + 管理监控推送 + 思考记录三处同时抛错时仍 200', async () => {
    const 响应 = await cheHui()

    expect(chongZhiJiaoSeTiaoDuQi).toHaveBeenCalledTimes(1)
    expect(jiLuSiKao).toHaveBeenCalledTimes(1)
    expect(响应.status).toBe(200)
    expect(响应.body.cheng_gong).toBe(true)
    expect(响应.body.shu_ju).toEqual({ id: '101' })

    const 副作用日志 = vi
      .mocked(debug日志.error)
      .mock.calls
      .filter((xiang) => xiang[0] === '落库后副作用')
      .map((xiang) => String(xiang[2]?.xiang_qing?.ming_cheng))
    expect(副作用日志).toContain('撤回后重置AI调度器')
    expect(副作用日志).toContain('撤回后推送管理监控隐藏信息')
    expect(副作用日志).toContain('撤回后写思考记录')
  })

  it('撤回本身失败时仍是业务状态码', async () => {
    const { cheHuiYongHuXiaoXi } = await import('../../services/消息')
    vi.mocked(cheHuiYongHuXiaoXi).mockResolvedValue({
      cheng_gong: false,
      ti_shi: '超出撤回时限',
      zhuang_tai_ma: 400,
    } as never)

    const 响应 = await cheHui()

    expect(响应.status).toBe(400)
    expect(chongZhiJiaoSeTiaoDuQi).not.toHaveBeenCalled()
  })
})
