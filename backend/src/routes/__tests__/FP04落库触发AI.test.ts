import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import luYou from '../消息'
import { chuangJianYongHuXiaoXi } from '../../services/消息'
import { luoKuChuFaJiaoSeTiaoDuQi } from '../../socket/聊天'
import { jianCeWeiJiXinHao, shenHeNeiRongAnQuan } from '../../services/安全审核'
import { sheZhiMiJiHaoGanDu } from '../../services/好感度'
import { baoCunJiaoSeXiaoXi } from '../../services/AI输入准备'
import { huoQuIo } from '../../socket/io'
import { HAO_GAN_DU_PEI_ZHI } from '../../config/好感度配置'
import { huoQuFanYi } from '../../config/translations'

const 用户ID = '22222222-2222-4222-8222-222222222222'
const 角色ID = '11111111-1111-4111-8111-111111111111'

vi.mock('../../services/消息', () => ({
  huoQuXiaoXiLieBiao: vi.fn(async () => ({ lie_biao: [], zong_shu: 0, hai_you_geng_duo: false })),
  chuangJianYongHuXiaoXi: vi.fn(async () => ({
    cheng_gong: true,
    xiao_xi: {
      id: '101',
      hui_hua_id: 角色ID,
      fa_song_zhe_id: 用户ID,
      fa_song_zhe_lei_xing: 'yonghu',
      ai_biao_shi: false,
      nei_rong: '插话内容',
      lei_xing: 'wenben',
      shi_jian_chuo: 1700000000000,
      yi_du: true,
      ke_hu_duan_xu_hao: 7,
    },
  })),
  cheHuiYongHuXiaoXi: vi.fn(async () => ({ cheng_gong: true, xiao_xi: { id: '101' } })),
  biaoJiSuoYouWeiDu: vi.fn(async () => undefined),
  huoQuJiaoSeSuoYouZhe: vi.fn(async () => null),
}))

vi.mock('../../socket/聊天', () => ({
  luoKuChuFaJiaoSeTiaoDuQi: vi.fn(async () => undefined),
  chongZhiJiaoSeTiaoDuQi: vi.fn(),
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: ( _req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  aiQingQiuXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/输入验证', () => ({
  聊天内容验证中间件: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/管理员', () => ({
  guanLiGaoWeiMenKong: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  guanLiZhiDuMenKong: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  // FP-22：出参收口按能力裁剪；本文件测的是 AI 触发链，一律按「无运营读取能力」走普通用户口径
  anYongHuIdJuBeiNengLi: vi.fn(async () => false),
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
  jiLuShenJiRiZhi: vi.fn(async () => undefined),
}))

vi.mock('../../services/军师', () => ({
  huoQuJunShiLieBiao: vi.fn(async () => ({ junShiLieBiao: [] })),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn(async () => []),
  huoQuJunShiZhiDaoZhuangTaiXinXi: vi.fn(async () => null),
}))

vi.mock('../../services/军师缓存', () => ({
  shanChuJunShiZhiDaoZhuangTai: vi.fn(async () => undefined),
}))

vi.mock('../../services/好感度', () => ({
  sheZhiMiJiHaoGanDu: vi.fn(async () => ({ cheng_gong: true })),
}))

vi.mock('../../services/AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: '900', lei_xing: 'wenben' })),
}))

vi.mock('../../services/思考记录', () => ({
  jiLuSiKao: vi.fn(async () => undefined),
}))

const 应用 = express()
应用.use(express.json())
// 与 server.ts:109 的 YH-029 中文路径解码中间件保持一致（路由前缀与路径段是中文）
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
    xiao_xi: {
      id: '101',
      hui_hua_id: 角色ID,
      fa_song_zhe_id: 用户ID,
      fa_song_zhe_lei_xing: 'yonghu',
      ai_biao_shi: false,
      nei_rong: '插话内容',
      lei_xing: 'wenben',
      shi_jian_chuo: 1700000000000,
      yi_du: true,
      ke_hu_duan_xu_hao: 7,
    },
  } as never)
})

describe('FP-04 AI 触发点搬到 HTTP 落库路径', () => {
  it('文本消息落库成功后由服务端直接触发对应角色调度器', async () => {
    const 响应 = await faSong({ neiRong: '插话内容', 客户端序号: 7 })

    expect(响应.status).toBe(200)
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledTimes(1)
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledWith(用户ID, 角色ID, expect.objectContaining({ id: '101' }))
  })

  it('媒体消息落库成功后同样触发调度器', async () => {
    const 响应 = await faSong({
      neiRong: '',
      leiXing: 'tuPian',
      meiTiId: '33333333-3333-4333-8333-333333333333',
      客户端序号: 8,
    })

    expect(响应.status).toBe(200)
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledTimes(1)
  })

  it('危机干预命中仍触发调度器（既有玩法语义不变）', async () => {
    vi.mocked(jianCeWeiJiXinHao).mockReturnValue({
      wei_ji: true,
      yuan_zhu_re_xian: '12356',
      ti_shi: '援助提示',
      ming_zhong_ci: '自杀',
    } as never)

    const 响应 = await faSong({ neiRong: '我不想活了', 客户端序号: 9 })

    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.wei_ji_gan_yu).toBe(true)
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledTimes(1)
  })

  it('秘密指令不触发 AI，仅回确认消息（既有玩法语义不变）', async () => {
    const 响应 = await faSong({ neiRong: HAO_GAN_DU_PEI_ZHI.miJi.miLing, 客户端序号: 10 })

    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.shi_mi_ji).toBe(true)
    expect(luoKuChuFaJiaoSeTiaoDuQi).not.toHaveBeenCalled()
    expect(sheZhiMiJiHaoGanDu).toHaveBeenCalledWith(用户ID, 角色ID, HAO_GAN_DU_PEI_ZHI.miJi.miLing)
    expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledTimes(1)
    expect(huoQuIo).toHaveBeenCalled()
  })

  it('落库失败时不触发调度器', async () => {
    vi.mocked(chuangJianYongHuXiaoXi).mockResolvedValue({
      cheng_gong: false,
      ti_shi: '发送失败',
      zhuang_tai_ma: 400,
    } as never)

    const 响应 = await faSong({ neiRong: '插话内容', 客户端序号: 11 })

    expect(响应.status).toBe(400)
    expect(luoKuChuFaJiaoSeTiaoDuQi).not.toHaveBeenCalled()
  })

  it('同客户端序号幂等重放时仍触发（重试不该被吞）', async () => {
    await faSong({ neiRong: '插话内容', 客户端序号: 12 })
    await faSong({ neiRong: '插话内容', 客户端序号: 12 })

    expect(chuangJianYongHuXiaoXi).toHaveBeenCalledTimes(2)
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledTimes(2)
  })
})

/**
 * FP-10（缺陷9）发送入口契约：块是正文的唯一真源，路由不另写第二套裁定。
 * 三条各钉一件事：混排的审核文本只取文字块；纯图片块（零文字）不得被「缺少参数」挡回；
 * 服务层的明确 400 原样透出且既不触发 AI 也不 500。
 */
describe('FP-10 发送入口：有序内容块原样交服务层，纯图片块也是合法消息', () => {
  const 媒体 = '33333333-3333-4333-8333-333333333333'
  const 媒体二 = '44444444-4444-4444-8444-444444444444'

  it('图文混排：块数组逐字下发，送审文本 = 文字块按序拼接（系统占位符不掺进审核）', async () => {
    const 块 = [
      { lei_xing: 'wenzi', nei_rong: '这里' },
      { lei_xing: 'tupian', mei_ti_id: 媒体 },
      { lei_xing: 'wenzi', nei_rong: '还有这里' },
      { lei_xing: 'tupian', mei_ti_id: 媒体二 },
    ]

    const 响应 = await faSong({ neiRong: '客户端乱带的正文', nei_rong_kuai: 块 })

    expect(响应.status).toBe(200)
    expect(shenHeNeiRongAnQuan).toHaveBeenCalledWith('这里还有这里')
    expect(chuangJianYongHuXiaoXi).toHaveBeenCalledWith(
      expect.objectContaining({ yong_hu_id: 用户ID, jiao_se_id: 角色ID, nei_rong_kuai: 块 }),
    )
    expect(luoKuChuFaJiaoSeTiaoDuQi).toHaveBeenCalledTimes(1)
  })

  it('纯图片块（一张图 + 零文字）不再被「缺少参数」400；无文字可审也不调审核服务', async () => {
    const 响应 = await faSong({
      neiRong: '',
      leiXing: 'tuPian',
      nei_rong_kuai: [{ lei_xing: 'tupian', mei_ti_id: 媒体 }],
    })

    expect(响应.status).toBe(200)
    expect(chuangJianYongHuXiaoXi).toHaveBeenCalledTimes(1)
    expect(chuangJianYongHuXiaoXi).toHaveBeenCalledWith(
      expect.objectContaining({ mei_ti_id: null, nei_rong_kuai: [{ lei_xing: 'tupian', mei_ti_id: 媒体 }] }),
    )
    expect(shenHeNeiRongAnQuan).not.toHaveBeenCalled()
  })

  it('服务层判脏（越权媒体 / 块全丢光）时按它的 400 + 翻译文案回，不 500、不触发 AI', async () => {
    const 文案 = huoQuFanYi('liaoTian', 'meiTiWuQuanXian')
    vi.mocked(chuangJianYongHuXiaoXi).mockResolvedValue({
      cheng_gong: false,
      ti_shi: 文案,
      zhuang_tai_ma: 400,
    } as never)

    const 响应 = await faSong({
      neiRong: '',
      nei_rong_kuai: [{ lei_xing: 'tupian', mei_ti_id: 媒体 }],
    })

    expect(响应.status).toBe(400)
    expect(响应.body.ti_shi).toBe(文案)
    expect(luoKuChuFaJiaoSeTiaoDuQi).not.toHaveBeenCalled()
  })
})
