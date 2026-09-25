import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  媒体错误: class extends Error {
    fanYiJian = '违规图片'
  },
  dbQuery: vi.fn(),
  huoQuXiaoXiLieBiao: vi.fn(),
  chuangJianYongHuXiaoXi: vi.fn(),
  cheHuiYongHuXiaoXi: vi.fn(),
  biaoJiSuo所有WeiDu: vi.fn(),
  chaXunZhangHaoFengJin: vi.fn(),
  jiLuZhangHaoWeiGui: vi.fn(),
  jianCeWeiJi: vi.fn(),
  shenHeAnQuan: vi.fn(),
  qingLiTiJiaoKuai: vi.fn(),
  kuaiShenHeWenBen: vi.fn(),
  liuShiBaoCunMeiTi: vi.fn(),
  shengChengQianMingURL: vi.fn(),
  panDingMeiTi: vi.fn(),
  baoCunJiaoSeXiaoXi: vi.fn(),
  sheZhiMiJi: vi.fn(),
  huoQuJunShiLieBiao: vi.fn(),
  qingQiuJunShi: vi.fn(),
  huoQuJunShiJiLu: vi.fn(),
  huoQuJunShiZhuangTai: vi.fn(),
  shanChuJunShi: vi.fn(),
  luoKuChuFa: vi.fn(),
  chongZhiTiaoDu: vi.fn(),
  zhongDuanTiaoDu: vi.fn(),
  huoQuIo: vi.fn(),
  jiLuShenJi: vi.fn(),
  jiLuSiKao: vi.fn(),
  fanYiWenBen: vi.fn(),
  mianFeiZhuanXie: vi.fn(),
  gouJianYuYin: vi.fn(),
  gouJianShiPin: vi.fn(),
  huoQuDuoMoTai: vi.fn(),
  chongZaiDuoMoTai: vi.fn(),
  huoQuJiaoSeSuoYouZhe: vi.fn(),
  huoQu视频: vi.fn(),
  chaXunJiaoSeSuoYouZhe: vi.fn(),
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: { query: 假.dbQuery } }))
vi.mock('../../services/消息', () => ({
  huoQuXiaoXiLieBiao: 假.huoQuXiaoXiLieBiao,
  chuangJianYongHuXiaoXi: 假.chuangJianYongHuXiaoXi,
  cheHuiYongHuXiaoXi: 假.cheHuiYongHuXiaoXi,
  biaoJiSuoYouWeiDu: 假.biaoJiSuo所有WeiDu,
  huoQuJiaoSeSuoYouZhe: 假.chaXunJiaoSeSuoYouZhe,
}))
vi.mock('../../services/消息出参收口', () => ({
  shouKouXiaoXiYunYingZiDuan: async (x: unknown) => x,
  shouKouXiaoXiLieBiaoYunYingZiDuan: async (x: unknown) => x,
}))
vi.mock('../../services/消息内容块', () => ({
  qingLiTiJiaoKuai: 假.qingLiTiJiaoKuai,
  kuaiShenHeWenBen: 假.kuaiShenHeWenBen,
}))
vi.mock('../../services/媒体存储', () => ({
  liuShiBaoCunMeiTi: 假.liuShiBaoCunMeiTi,
  MeiTiCunChuCuoWu: 假.媒体错误,
  shengChengQianMingURL: 假.shengChengQianMingURL,
}))
vi.mock('../../services/媒体审核出参', () => ({ panDingMeiTiShenHeChuCan: 假.panDingMeiTi }))
vi.mock('../../services/安全审核', () => ({ jianCeWeiJiXinHao: 假.jianCeWeiJi, shenHeNeiRongAnQuan: 假.shenHeAnQuan }))
vi.mock('../../services/账号封禁', () => ({ chaXunZhangHaoFengJin: 假.chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui: 假.jiLuZhangHaoWeiGui }))
vi.mock('../../services/IP封禁', () => ({ 获取IP: () => '127.0.0.1', 记录违规: vi.fn(async () => ({ 已封禁: false })) }))
vi.mock('../../services/审计日志', () => ({ jiLuShenJiRiZhi: 假.jiLuShenJi }))
vi.mock('../../services/思考记录', () => ({ jiLuSiKao: 假.jiLuSiKao }))
vi.mock('../../services/军师', () => ({
  huoQuJunShiLieBiao: 假.huoQuJunShiLieBiao,
  qingQiuJunShiZhiDao: 假.qingQiuJunShi,
  huoQuJunShiJiLu: 假.huoQuJunShiJiLu,
  huoQuJunShiZhiDaoZhuangTaiXinXi: 假.huoQuJunShiZhuangTai,
}))
vi.mock('../../services/军师缓存', () => ({ shanChuJunShiZhiDaoZhuangTai: 假.shanChuJunShi }))
vi.mock('../../services/AI输入准备', () => ({ baoCunJiaoSeXiaoXi: 假.baoCunJiaoSeXiaoXi }))
vi.mock('../../services/好感度', () => ({ sheZhiMiJiHaoGanDu: 假.sheZhiMiJi }))
vi.mock('../../services/翻译', () => ({ fanYiWenBen: 假.fanYiWenBen }))
vi.mock('../../services/语音转写', () => ({ mianFeiZhuanXieYuYin: 假.mianFeiZhuanXie }))
vi.mock('../../services/语音理解', () => ({ gouJianYuYinKeDuWenBen: 假.gouJianYuYin }))
vi.mock('../../services/视频多模态', () => ({ gouJianShiPinKeDuWenBen: 假.gouJianShiPin }))
vi.mock('../../services/视频理解', () => ({ huoQuHuoJieXiShiPinMiaoShu: 假.huoQu视频 }))
vi.mock('../../config/多模态配置', () => ({ huoQuDuoMoTaiQianDuanShiTu: 假.huoQuDuoMoTai, chongZaiDuoMoTaiHuanJing: 假.chongZaiDuoMoTai }))
vi.mock('../../socket/聊天', () => ({ luoKuChuFaJiaoSeTiaoDuQi: 假.luoKuChuFa, chongZhiJiaoSeTiaoDuQi: 假.chongZhiTiaoDu, zhongDuanJiaoSeTiaoDuQi: 假.zhongDuanTiaoDu }))
vi.mock('../../socket/io', () => ({ huoQuIo: 假.huoQuIo }))
vi.mock('../../socket/管理通道', () => ({ 管理监控房间名: (id: string) => `admin:${id}` }))
vi.mock('../../middleware/限流', () => {
  const 放行 = (_q: unknown, _r: unknown, 下一步: () => void) => 下一步()
  return { liaoTianXianLiu: 放行, aiQingQiuXianLiu: 放行 }
})
vi.mock('../../middleware/输入验证', () => ({ 聊天内容验证中间件: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))
vi.mock('../../middleware/管理员', () => ({ guanLiGaoWeiMenKong: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import 路由 from '../消息'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 角色ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const 媒体ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const 好友ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const 消息对象 = {
  id: '消息-1',
  hui_hua_id: 角色ID,
  fa_song_zhe_id: 用户ID,
  fa_song_zhe_lei_xing: 'yonghu',
  ai_biao_shi: false,
  nei_rong: '你好',
  lei_xing: 'wenben',
  shi_jian_chuo: 1700000000000,
  yi_du: true,
  ke_hu_duan_xu_hao: 1,
}

function 建应用(登录: string | null): Express {
  const 应用 = express()
  应用.use(express.json())
  应用.use((请求, _响应, 下一步) => {
    请求.url = decodeURI(请求.url)
    下一步()
  })
  应用.use((请求, _响应, 下一步) => {
    if (登录) (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 登录 }
    下一步()
  })
  应用.use('/api/聊天', 路由)
  return 应用
}

function 请(方法: 'get' | 'post' | 'put', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(建应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

function 上传(登录: string | null = 用户ID) {
  return 请('post', `/api/聊天/会话/${角色ID}/媒体?leiBie=tupian`, 登录).attach('file', Buffer.from('image'), { filename: 'a.png', contentType: 'image/png' })
}

beforeEach(() => {
  vi.clearAllMocks()
  假.dbQuery.mockImplementation(async (sql: string) => {
    const text = String(sql)
    if (text.includes('SELECT "ID" as id')) return { rows: [{ id: 角色ID, jiao_se_ming: '角色', tou_xiang: null, kai_shi_shi_jian: null }], rowCount: 1 }
    if (text.includes('SELECT "ID" FROM "角色" WHERE "ID" = $1')) return { rows: [{ ID: 角色ID }], rowCount: 1 }
    if (text.includes('SELECT 1 FROM "角色" WHERE "ID" = $1')) return { rows: [{ '?column?': 1 }], rowCount: 1 }
    if (text.includes('SELECT mf."SHA256"')) return { rows: [{ SHA256: 'a'.repeat(64) }], rowCount: 1 }
    if (text.includes('SELECT "SHA256" FROM "媒体文件"')) return { rows: [{ SHA256: 'a'.repeat(64) }], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
  假.huoQuXiaoXiLieBiao.mockResolvedValue({ lie_biao: [消息对象], zong_shu: 1, hai_you_geng_duo: false })
  假.chuangJianYongHuXiaoXi.mockResolvedValue({ cheng_gong: true, xiao_xi: 消息对象 })
  假.cheHuiYongHuXiaoXi.mockResolvedValue({ cheng_gong: true, xiao_xi: 消息对象 })
  假.biaoJiSuo所有WeiDu.mockResolvedValue(undefined)
  假.chaXunZhangHaoFengJin.mockResolvedValue({ beiFengJin: false })
  假.jiLuZhangHaoWeiGui.mockResolvedValue(undefined)
  假.jianCeWeiJi.mockReturnValue(null)
  假.shenHeAnQuan.mockResolvedValue({ wei_gui: false })
  假.qingLiTiJiaoKuai.mockReturnValue({ kuai: null })
  假.kuaiShenHeWenBen.mockReturnValue('')
  假.liuShiBaoCunMeiTi.mockResolvedValue({ mediaId: 媒体ID, sha256: 'a'.repeat(64), mime: 'image/png', daXiao: 3, leiBie: 'tupian', yuanShiWenJianMing: 'a.png' })
  假.shengChengQianMingURL.mockReturnValue('/api/媒体/signed')
  假.panDingMeiTi.mockReturnValue({ xuYaoJiWeiGui: true, zhuangTaiMa: 403, tiShi: '图片违规' })
  假.baoCunJiaoSeXiaoXi.mockResolvedValue({ id: '确认消息', lei_xing: 'wenben' })
  假.sheZhiMiJi.mockResolvedValue({ cheng_gong: true })
  假.huoQuJunShiLieBiao.mockResolvedValue({ junShiLieBiao: [{ id: '军师' }] })
  假.qingQiuJunShi.mockResolvedValue({ cheng_gong: true, jie_guo: { id: '指导' } })
  假.huoQuJunShiJiLu.mockResolvedValue({ jiLuLieBiao: [{ id: '记录' }] })
  假.huoQuJunShiZhuangTai.mockResolvedValue({ zhuang_tai: 'ok', ke_zai_ci_zhi_dao: true, you_liao_tian_ji_lu: false })
  假.shanChuJunShi.mockResolvedValue(undefined)
  假.luoKuChuFa.mockReturnValue(undefined)
  假.chongZhiTiaoDu.mockReturnValue(undefined)
  假.zhongDuanTiaoDu.mockReturnValue(undefined)
  假.huoQuIo.mockReturnValue({ to: () => ({ emit: vi.fn() }) })
  假.jiLuShenJi.mockResolvedValue(undefined)
  假.jiLuSiKao.mockResolvedValue(undefined)
  假.fanYiWenBen.mockResolvedValue({ cheng_gong: true, fan_yi: '你好' })
  假.mianFeiZhuanXie.mockResolvedValue('转写文本')
  假.gouJianYuYin.mockReturnValue('音频理解')
  假.gouJianShiPin.mockReturnValue('视频理解')
  假.huoQuDuoMoTai.mockReturnValue({ tuPian: true })
  假.chongZaiDuoMoTai.mockReturnValue([{ id: '配置' }])
  假.huoQuJiaoSeSuoYouZhe.mockResolvedValue({ yong_hu_id: 用户ID })
  假.chaXunJiaoSeSuoYouZhe.mockResolvedValue({ yong_hu_id: 用户ID })
  假.huoQu视频.mockResolvedValue({ huaMianMiaoShu: 2, zhuanXieWenBen: '字幕' })
})

describe('聊天会话与消息列表', () => {
  it('会话列表和创建覆盖未认证、资源不存在、成功与数据库异常', async () => {
    await 请('get', '/api/聊天/会话', null).expect(401)
    await 请('get', '/api/聊天/会话').expect(200)
    假.dbQuery.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/聊天/会话').expect(500)
    await 请('post', '/api/聊天/会话', 用户ID, {}).expect(400)
    await 请('post', '/api/聊天/会话', 用户ID, { jiaoSeId: 角色ID }).expect(200)
    假.dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('post', '/api/聊天/会话', 用户ID, { jiao_se_id: 角色ID }).expect(404)
    假.dbQuery.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/聊天/会话', 用户ID, { jiaoSeId: 角色ID }).expect(500)
  })

  it('消息列表覆盖认证、游标解析、服务异常和空结果', async () => {
    await 请('get', `/api/聊天/会话/${角色ID}/消息`, null).expect(401)
    await 请('get', `/api/聊天/会话/${角色ID}/消息?ye_ma=2&mei_ye_tiao_shu=bad&you_biao_xu_hao=bad&you_biao_shi_jian_chuo=bad`).expect(200)
    假.huoQuXiaoXiLieBiao.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/聊天/会话/${角色ID}/消息`).expect(500)
  })
})

describe('聊天媒体上传', () => {
  it('按认证、封禁、类型、请求格式和存储结果分支返回', async () => {
    await 上传(null).expect(401)
    假.chaXunZhangHaoFengJin.mockResolvedValueOnce({ beiFengJin: true })
    await 上传().expect(403)
    await 请('post', `/api/聊天/会话/${角色ID}/媒体?leiBie=bad`, 用户ID).attach('file', Buffer.from('x'), { filename: 'a', contentType: 'image/png' }).expect(400)
    await 请('post', `/api/聊天/会话/${角色ID}/媒体?leiBie=tupian`, 用户ID).expect(400)
    await 上传().expect(200)
    假.liuShiBaoCunMeiTi.mockRejectedValueOnce(new Error('storage'))
    await 上传().expect(500)
    假.liuShiBaoCunMeiTi.mockRejectedValueOnce(new 假.媒体错误())
    await 上传().expect(403)
  })
})

describe('发送消息业务分支', () => {
  const 路径 = `/api/聊天/会话/${角色ID}/消息`

  it('拒绝未认证、封禁、非法类型、媒体和引用输入', async () => {
    await 请('post', 路径, null, { neiRong: 'x' }).expect(401)
    假.chaXunZhangHaoFengJin.mockResolvedValueOnce({ beiFengJin: true })
    await 请('post', 路径, 用户ID, { leiXing: 'bad', neiRong: 'x' }).expect(403)
    await 请('post', 路径, 用户ID, { leiXing: 'bad', neiRong: 'x' }).expect(400)
    await 请('post', 路径, 用户ID, { leiXing: 'tupian', meiTiId: 'bad', neiRong: '' }).expect(400)
    await 请('post', 路径, 用户ID, { beiYongXiaoXiId: 'bad', neiRong: 'x' }).expect(400)
    await 请('post', 路径, 用户ID, { neiRong: '   ' }).expect(400)
    await 请('post', 路径, 用户ID, { neiRong: 'x', 客户端序号: 'bad' }).expect(400)
  })

  it('覆盖危机干预、内容违规、服务失败、秘密指令、成功和异常', async () => {
    假.jianCeWeiJi.mockReturnValueOnce({ wei_ji: true, yuan_zhu_re_xian: '12356', ti_shi: '援助', ming_zhong_ci: '自杀' })
    假.chuangJianYongHuXiaoXi.mockResolvedValueOnce({ cheng_gong: true, xiao_xi: 消息对象 })
    await 请('post', 路径, 用户ID, { neiRong: '我不想活了' }).expect(200)
    假.shenHeAnQuan.mockResolvedValueOnce({ wei_gui: true, lei_xing: '淫秽色情', li_you: '命中' })
    await 请('post', 路径, 用户ID, { neiRong: '违规' }).expect(403)
    假.shenHeAnQuan.mockResolvedValueOnce({ wei_gui: true, lei_xing: '审核服务不可用' })
    await 请('post', 路径, 用户ID, { neiRong: '违规' }).expect(403)
    假.chuangJianYongHuXiaoXi.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败', zhuang_tai_ma: 400 })
    await 请('post', 路径, 用户ID, { neiRong: '普通' }).expect(400)
    await 请('post', 路径, 用户ID, { neiRong: '秘籍' }).expect(200)
    假.chuangJianYongHuXiaoXi.mockRejectedValueOnce(new Error('db'))
    await 请('post', 路径, 用户ID, { neiRong: '普通' }).expect(500)
  })
})

describe('撤回、已读与军师接口', () => {
  it('撤回和已读覆盖参数、失败、成功和异常', async () => {
    await 请('put', `/api/聊天/会话/${角色ID}/消息/消息-1/撤回`, null).expect(401)
    await 请('put', `/api/聊天/会话/${角色ID}/消息/消息-1/撤回`, 用户ID).expect(200)
    假.cheHuiYongHuXiaoXi.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败', zhuang_tai_ma: 400 })
    await 请('put', `/api/聊天/会话/${角色ID}/消息/消息-1/撤回`, 用户ID).expect(400)
    假.cheHuiYongHuXiaoXi.mockRejectedValueOnce(new Error('db'))
    await 请('put', `/api/聊天/会话/${角色ID}/消息/消息-1/撤回`, 用户ID).expect(500)
    await 请('put', `/api/聊天/会话/${角色ID}/已读`, null).expect(401)
    await 请('put', `/api/聊天/会话/${角色ID}/已读`, 用户ID).expect(200)
    假.biaoJiSuo所有WeiDu.mockRejectedValueOnce(new Error('db'))
    await 请('put', `/api/聊天/会话/${角色ID}/已读`, 用户ID).expect(500)
  })

  it('军师列表、请求、记录和状态覆盖参数、成功和异常', async () => {
    await 请('get', '/api/聊天/军师/列表', null).expect(401)
    await 请('get', '/api/聊天/军师/列表').expect(200)
    假.huoQuJunShiLieBiao.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/聊天/军师/列表').expect(500)
    await 请('post', '/api/聊天/军师', 用户ID, {}).expect(400)
    假.qingQiuJunShi.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败', zhuang_tai_ma: 400 })
    await 请('post', '/api/聊天/军师', 用户ID, { jiaoSeId: 角色ID }).expect(400)
    await 请('post', '/api/聊天/军师', 用户ID, { jiao_se_id: 角色ID, jun_shi_id: '军师' }).expect(200)
    await 请('get', `/api/聊天/军师/记录/${角色ID}`).expect(200)
    await 请('get', `/api/聊天/军师/状态/${角色ID}`).expect(200)
    假.huoQuJunShiJiLu.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/聊天/军师/记录/${角色ID}`).expect(500)
    假.huoQuJunShiZhuangTai.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/聊天/军师/状态/${角色ID}`).expect(500)
  })
})

describe('媒体签名与辅助接口', () => {
  it('签名覆盖非法 UUID、无会话、无媒体、成功和异常', async () => {
    await 请('get', `/api/聊天/会话/${角色ID}/媒体签名/${媒体ID}`, null).expect(401)
    await 请('get', `/api/聊天/会话/bad/媒体签名/${媒体ID}`).expect(400)
    await 请('get', `/api/聊天/会话/${角色ID}/媒体签名/${媒体ID}`).expect(200)
    假.dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('get', `/api/聊天/会话/${角色ID}/媒体签名/${媒体ID}`).expect(403)
    假.dbQuery.mockResolvedValueOnce({ rows: [{ ID: 角色ID }], rowCount: 1 }).mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('get', `/api/聊天/会话/${角色ID}/媒体签名/${媒体ID}`).expect(404)
    假.dbQuery.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/聊天/会话/${角色ID}/媒体签名/${媒体ID}`).expect(500)
  })

  it('翻译、语音转写、多模态和语音理解覆盖空值、失败、成功和异常', async () => {
    await 请('post', '/api/聊天/翻译', null, { neiRong: 'x' }).expect(401)
    await 请('post', '/api/聊天/翻译', 用户ID, { neiRong: '' }).expect(400)
    假.fanYiWenBen.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败' })
    await 请('post', '/api/聊天/翻译', 用户ID, { neiRong: 'x' }).expect(500)
    await 请('post', '/api/聊天/翻译', 用户ID, { nei_rong: 'x', yuan_yu: 'en', mu_biao_yu: 'zh' }).expect(200)
    假.fanYiWenBen.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/聊天/翻译', 用户ID, { neiRong: 'x' }).expect(500)
    await 请('post', '/api/聊天/语音/转写', null, { meiTiId: 媒体ID }).expect(401)
    await 请('post', '/api/聊天/语音/转写', 用户ID, {}).expect(400)
    假.mianFeiZhuanXie.mockResolvedValueOnce(null)
    await 请('post', '/api/聊天/语音/转写', 用户ID, { meiTiId: 媒体ID }).expect(500)
    await 请('post', '/api/聊天/语音/转写', 用户ID, { mei_ti_id: 媒体ID }).expect(200)
    假.mianFeiZhuanXie.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/聊天/语音/转写', 用户ID, { meiTiId: 媒体ID }).expect(500)
    await 请('get', '/api/聊天/多模态配置', null).expect(401)
    await 请('get', '/api/聊天/多模态配置').expect(200)
    await 请('post', '/api/聊天/多模态配置/重载').expect(200)
    假.chongZaiDuoMoTai.mockImplementationOnce(() => { throw new Error('reload') })
    await 请('post', '/api/聊天/多模态配置/重载').expect(500)
    await 请('post', `/api/聊天/会话/${角色ID}/语音理解`, null, {}).expect(401)
    await 请('post', `/api/聊天/会话/${角色ID}/语音理解`, 用户ID, {}).expect(200)
    假.chaXunJiaoSeSuoYouZhe.mockResolvedValueOnce(null)
    await 请('post', `/api/聊天/会话/${角色ID}/语音理解`, 用户ID, { zhuanXieWenBen: 'x' }).expect(403)
    假.chaXunJiaoSeSuoYouZhe.mockRejectedValueOnce(new Error('db'))
    await 请('post', `/api/聊天/会话/${角色ID}/语音理解`, 用户ID, { zhuan_xie_wen_ben: 'x' }).expect(500)
  })

  it('生图和视频生成明确拒绝，视频理解覆盖归属与解析异常', async () => {
    await 请('post', `/api/聊天/会话/${角色ID}/生图`, null).expect(401)
    await 请('post', `/api/聊天/会话/${角色ID}/生图`).expect(403)
    await 请('post', `/api/聊天/会话/${角色ID}/生成视频`, null).expect(401)
    await 请('post', `/api/聊天/会话/${角色ID}/生成视频`).expect(403)
    await 请('get', `/api/聊天/会话/${角色ID}/视频理解`, null).expect(401)
    await 请('get', `/api/聊天/会话/bad/视频理解`).expect(200)
    await 请('get', `/api/聊天/会话/${角色ID}/视频理解`).expect(200)
    假.chaXunJiaoSeSuoYouZhe.mockResolvedValueOnce(null)
    await 请('get', `/api/聊天/会话/${角色ID}/视频理解`).expect(403)
    假.chaXunJiaoSeSuoYouZhe.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/聊天/会话/${角色ID}/视频理解`).expect(500)
  })
})
