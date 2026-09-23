import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createServer, type Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import type { AddressInfo } from 'net'
import type { RenZhengSocket } from '../认证'
import { 初始化聊天Socket, luoKuChuFaJiaoSeTiaoDuQi, 清理调度器映射 } from '../聊天'
import { huoQuIo } from '../io'
import { 管理监控房间名 } from '../管理通道'
import type { XiaoXiXinXi } from '../../services/消息'

const 常 = vi.hoisted(() => ({
  普通用户: '11111111-1111-4111-8111-111111111111',
  管理员用户: '22222222-2222-4222-8222-222222222222',
  查库抛错用户: '33333333-3333-4333-8333-333333333333',
  普通角色: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  管理角色: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  抛错角色: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
}))

const 假 = vi.hoisted(() => ({
  // FP-18 同源能力位：cha_kan（查看运营数据）为真 ⇔ 允许进管理房间
  管理能力: {} as Record<string, boolean>,
  查库抛错: false as boolean,
}))

vi.mock('../../middleware/管理员', () => ({
  anYongHuIdJuBeiNengLi: vi.fn(async (yongHuId: string) => {
    if (假.查库抛错 && yongHuId === 常.查库抛错用户) throw new Error('数据库不可达')
    return 假.管理能力[yongHuId] === true
  }),
}))

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
    publish: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    pexpire: vi.fn(async () => 1),
  },
}))

vi.mock('../../services/AI输入准备', () => ({
  huoQuJiaoSeIELeiXing: vi.fn(async () => 'E' as const),
  huoQuJiaoSeHuiFuYanChiHaoMiao: vi.fn(async () => 5),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    xing_bie: 'nv',
    voice_id: '',
  })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => [
    { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '你好呀', lei_xing: 'wenben', shi_jian_chuo: 1 },
  ]),
  baoCunJiaoSeXiaoXi: vi.fn(async (canShu: { nei_rong: string }) => ({
    id: `msg-${Math.random().toString(36).slice(2)}`,
    hui_hua_id: 常.管理角色,
    fa_song_zhe_id: 常.管理角色,
    fa_song_zhe_lei_xing: 'jiaose',
    ai_biao_shi: true,
    nei_rong: canShu.nei_rong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: false,
  })),
}))

vi.mock('../../services/夺舍', () => ({
  huoQuJiaoSeYongHuId: vi.fn(async (jiaoSeId: string) => {
    if (jiaoSeId === 常.普通角色) return 常.普通用户
    if (jiaoSeId === 常.管理角色) return 常.管理员用户
    if (jiaoSeId === 常.抛错角色) return 常.查库抛错用户
    return null
  }),
  jiaoSeShiFouBeiDuoShe: vi.fn(async () => false),
}))

vi.mock('../夺舍', () => ({
  zhuanFaYongHuXiaoXiGeiGuanLiYuan: vi.fn(async () => undefined),
}))

vi.mock('../../services/认证', () => ({ anIdChaYongHu: vi.fn(async () => null) }))

vi.mock('../../services/消息', () => ({
  cheHuiJiaoSeXiaoXi: vi.fn(async () => ({ cheng_gong: true })),
  baoCunJiaoSeMeiTiXiaoXi: vi.fn(async () => null),
}))

vi.mock('../../services/AI引擎', () => ({
  yunXingAIYinQing: vi.fn(async () => ({
    xiao_xi_lie_biao: ['唯一回复'],
    shi_fou_hui_fu: true,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
    si_kao: { director: '先接住情绪再推进话题', writer: '用短句回应' },
  })),
}))

vi.mock('../../services/好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({
    xin_ren_du: 1,
    qin_mi_du: 1,
    qu_wei_du: 1,
    guan_huai_du: 1,
    zong_fen: 4,
    guan_xi_jie_duan: 'reQing',
  })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))

vi.mock('../../services/好感度评判', () => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(async () => ({
    jieGuo: {
      xin_ren_du_bian_hua: 1,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      li_you: '回应及时且真诚（模拟评分理由）',
    },
    xiShu: 1,
    muBiaoQuXian: 'reQing',
    lianXuWeiDaBiao: false,
  })),
}))

vi.mock('../../services/胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => false),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => false),
  chuLiYouXiJieShu: vi.fn(async () => undefined),
}))

vi.mock('../../services/对话渲染', () => {
  const 焦点 = vi.fn(() => ({
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '你好呀',
    lei_xing: 'wenben',
    shi_jian_chuo: 1,
  }))
  return {
    quZuiXinYongHuXiaoXiXiang: 焦点,
    // FP-09：调度器改由「本轮驱动消息 ID」定位焦点，同一条桩实现保持口径一致
    quBenLunJiaoDianXiaoXiXiang: 焦点,
    zhanShiXiaoXiZhengWen: vi.fn(() => '你好呀'),
    // FP-08c：调度器新增「按 ID 现取被引用原文」的回口，本用例不测引用 ⇒ 桩成取不到（不渲染引用段）
    gouJianYinYongChaXun: vi.fn(() => () => null),
  }
})

vi.mock('../../services/视频理解', () => ({
  huoQuHuoJieXiShiPinMiaoShu: vi.fn(async () => ({ huaMianMiaoShu: '', zhuanXieWenBen: '' })),
}))

vi.mock('../../config/AI参数策略', () => ({
  gouJianJiaoSeShangXiaWen: vi.fn(() => ({})),
}))

vi.mock('../../services/TTS服务', () => ({ 尝试合成语音: vi.fn(async () => null) }))
vi.mock('../../services/TTS文本预处理', () => ({ 转换TTS文本: vi.fn((文本: string) => 文本) }))
vi.mock('../../services/TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => ({ 是否触发: false })) }))
vi.mock('../../services/主动多模态', () => ({ changShiZhuDongShengTu: vi.fn(async () => undefined) }))
vi.mock('../../services/对话摘要', () => ({
  duQuDuiHuaZhaiYao: vi.fn(async () => ''),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(),
  duQuTongBuZhaiYao: vi.fn(() => ''),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
}))

vi.mock('../../utils/debug日志', () => ({
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../io', () => ({
  huoQuIo: vi.fn(() => null),
  sheZhiIo: vi.fn(),
}))

type 收到帧 = { 事件: string; 数据: unknown }

let fuWuQi: HttpServer
let io: Server
let keHuWuDiZhi = ''
const huodongKeFuWu: ClientSocket[] = []

function shuiMiao(haoMiao: number): Promise<void> {
  return new Promise((jieShou) => setTimeout(jieShou, haoMiao))
}

async function dengDai(zh: () => boolean, chaoShiHaoMiao: number, shiYou: string): Promise<void> {
  const kaiShi = Date.now()
  while (!zh()) {
    if (Date.now() - kaiShi > chaoShiHaoMiao) throw new Error(`等待超时：${shiYou}`)
    await shuiMiao(20)
  }
}

async function dengDaiFangJianChengYuan(fangJian: string, shuLiang: number): Promise<void> {
  const kaiShi = Date.now()
  for (;;) {
    const chengYuan = await io.in(fangJian).fetchSockets()
    if (chengYuan.length === shuLiang) return
    if (Date.now() - kaiShi > 5000) throw new Error(`房间 ${fangJian} 成员数未达到 ${shuLiang}`)
    await shuiMiao(20)
  }
}

function lianJieKeHuWu(yongHuId: string): Promise<ClientSocket> {
  const keHuWu = ioClient(keHuWuDiZhi, {
    auth: { yongHuId },
    transports: ['websocket'],
    forceNew: true,
  })
  huodongKeFuWu.push(keHuWu)
  return new Promise((jieShou, juJue) => {
    keHuWu.once('connect', () => jieShou(keHuWu))
    keHuWu.once('connect_error', (cuo) => juJue(cuo))
  })
}

function shouZhen(keHuWu: ClientSocket): 收到帧[] {
  const zhen: 收到帧[] = []
  keHuWu.onAny((shiJian, shuJu) => zhen.push({ 事件: shiJian, 数据: shuJu }))
  return zhen
}

function yongHuXiaoXi(yongHuId: string, jiaoSeId: string): XiaoXiXinXi {
  return {
    id: `db-${yongHuId.slice(0, 8)}-${Math.random().toString(36).slice(2)}`,
    hui_hua_id: jiaoSeId,
    fa_song_zhe_id: yongHuId,
    fa_song_zhe_lei_xing: 'yonghu',
    ai_biao_shi: false,
    nei_rong: '你好呀',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: false,
  }
}

function youFeiKongJiaoSeHuiFu(zhen: 收到帧[]): boolean {
  return zhen.some(
    (z) => z.事件 === '角色回复' && (z.数据 as { 消息列表?: unknown[] }).消息列表?.length > 0,
  )
}

beforeAll(async () => {
  fuWuQi = createServer()
  io = new Server(fuWuQi)
  // 真 JWT 握手链路归 utils/jwt 覆盖层；此处只注入身份对象，专测「房间授予是否仅由服务端决定」
  io.use((socket, xiaYiBu) => {
    ;(socket as RenZhengSocket).yong_hu = {
      yongHuId: String(socket.handshake.auth.yongHuId),
    } as never
    xiaYiBu()
  })
  初始化聊天Socket(io)
  vi.mocked(huoQuIo).mockReturnValue(io as never)
  await new Promise<void>((jieShou) => fuWuQi.listen(0, jieShou))
  keHuWuDiZhi = `http://localhost:${(fuWuQi.address() as AddressInfo).port}`
})

afterAll(async () => {
  for (const keHuWu of huodongKeFuWu.splice(0)) keHuWu.close()
  await new Promise<void>((jieShou) => io.close(() => jieShou()))
  await new Promise<void>((jieShou) => fuWuQi.close(() => jieShou()))
})

beforeEach(() => {
  假.管理能力 = { [常.管理员用户]: true }
  假.查库抛错 = false
  清理调度器映射()
})

afterEach(async () => {
  for (const keHuWu of huodongKeFuWu.splice(0)) keHuWu.disconnect()
  // 等服务端处理完 disconnect，房间断言（含空房间断言）才可判定
  await dengDai(() => io.sockets.sockets.size === 0, 5000, '旧连接未全部从服务端摘除')
})

describe('FP-19 运营侧事件数据面收口（真 socket.io 房间路由 + 真调度器 + mock LLM 外呼）', () => {
  it('①普通用户跑完整 AI 回复流程：收到的事件流零 管理员_* 帧，且其管理房间恒无成员', async () => {
    const keHuWu = await lianJieKeHuWu(常.普通用户)
    const zhen = shouZhen(keHuWu)

    keHuWu.emit('加入聊天', 常.普通角色)
    await dengDaiFangJianChengYuan(常.普通用户, 1)
    expect(await io.in(管理监控房间名(常.普通用户)).fetchSockets()).toHaveLength(0)

    await luoKuChuFaJiaoSeTiaoDuQi(常.普通用户, 常.普通角色, yongHuXiaoXi(常.普通用户, 常.普通角色))
    await dengDai(() => youFeiKongJiaoSeHuiFu(zhen), 8000, '普通用户应收到非空角色回复（AI 流程真跑完）')
    // 再等一拍让轮末的 好感度变化/隐藏信息 帧（若误投玩家房间）必然落袋
    await shuiMiao(400)

    expect(zhen.filter((z) => z.事件.startsWith('管理员_'))).toEqual([])
    expect(await io.in(管理监控房间名(常.普通用户)).fetchSockets()).toHaveLength(0)
  })

  it('②管理员连接经服务端查库鉴权入管理房间，多标签页均收到四类运营帧与业务帧', async () => {
    const jia = await lianJieKeHuWu(常.管理员用户)
    const yi = await lianJieKeHuWu(常.管理员用户)
    const zhenJia = shouZhen(jia)
    const zhenYi = shouZhen(yi)

    jia.emit('加入聊天', 常.管理角色)
    yi.emit('加入聊天', 常.管理角色)
    await dengDaiFangJianChengYuan(管理监控房间名(常.管理员用户), 2)

    await luoKuChuFaJiaoSeTiaoDuQi(常.管理员用户, 常.管理角色, yongHuXiaoXi(常.管理员用户, 常.管理角色))
    const yiShouQi = () =>
      ['管理员_构建过程', '管理员_深度思考', '管理员_好感度变化', '管理员_隐藏信息'].every((ming) =>
        zhenJia.some((z) => z.事件 === ming) && zhenYi.some((z) => z.事件 === ming),
      )
    await dengDai(yiShouQi, 8000, '两个管理员标签页都应收到四类运营帧')

    expect(youFeiKongJiaoSeHuiFu(zhenJia)).toBe(true)
    expect(youFeiKongJiaoSeHuiFu(zhenYi)).toBe(true)
    const yinCang = zhenJia.find((z) => z.事件 === '管理员_隐藏信息')
    expect((yinCang?.数据 as { 内容: string }).内容).toContain('模拟评分理由')
    const siKao = zhenJia.find((z) => z.事件 === '管理员_深度思考')
    expect((siKao?.数据 as { 内容: string }).内容).toContain('先接住情绪')
  })

  it('③客户端伪造加入管理房间/申报管理身份一律无效（房间授予只有服务端一条路）', async () => {
    const gongJi = await lianJieKeHuWu(常.普通用户)
    shouZhen(gongJi)

    // socket.io 的 join 只有服务端 API，客户端可达面只有 emit；穷举申报面 + 加入他人角色
    gongJi.emit(管理监控房间名(常.普通用户))
    gongJi.emit('加入管理监控', 常.普通用户)
    gongJi.emit('订阅管理员事件', true)
    gongJi.emit('管理_订阅', 常.管理员用户)
    gongJi.emit('日志_订阅')
    gongJi.emit('加入聊天', 常.管理角色)
    await shuiMiao(300)

    expect(await io.in(管理监控房间名(常.普通用户)).fetchSockets()).toHaveLength(0)
    expect(await io.in(管理监控房间名(常.管理员用户)).fetchSockets()).toHaveLength(0)
    expect(gongJi.connected).toBe(true)
  })

  it('④业务事件不受影响：普通用户照常收 对方正在输入/AI状态/角色回复，字段仍只有业务字段', async () => {
    const keHuWu = await lianJieKeHuWu(常.普通用户)
    const zhen = shouZhen(keHuWu)

    keHuWu.emit('加入聊天', 常.普通角色)
    await dengDaiFangJianChengYuan(常.普通用户, 1)
    await luoKuChuFaJiaoSeTiaoDuQi(常.普通用户, 常.普通角色, yongHuXiaoXi(常.普通用户, 常.普通角色))
    await dengDai(() => youFeiKongJiaoSeHuiFu(zhen), 8000, '业务帧必须照常')

    const mingZi = zhen.map((z) => z.事件)
    expect(mingZi).toContain('对方正在输入')
    expect(mingZi).toContain('AI状态')
    const huiFu = zhen.find(
      (z) => z.事件 === '角色回复' && (z.数据 as { 消息列表?: unknown[] }).消息列表?.length > 0,
    )
    const xiaoXi = (huiFu?.数据 as { 消息列表: Array<Record<string, unknown>> }).消息列表[0]
    expect(xiaoXi.nei_rong).toBe('唯一回复')
    expect(xiaoXi).not.toHaveProperty('阶段')
    expect(xiaoXi).not.toHaveProperty('说明')
    expect(xiaoXi).not.toHaveProperty('来源')
    expect(xiaoXi).not.toHaveProperty('li_you')
  })

  it('鉴权查库抛错时拒入管理房间（fail-closed），加入聊天与 AI 业务链路不受累', async () => {
    假.查库抛错 = true
    const keHuWu = await lianJieKeHuWu(常.查库抛错用户)
    const zhen = shouZhen(keHuWu)

    keHuWu.emit('加入聊天', 常.抛错角色)
    await dengDaiFangJianChengYuan(常.查库抛错用户, 1)
    expect(await io.in(管理监控房间名(常.查库抛错用户)).fetchSockets()).toHaveLength(0)

    await luoKuChuFaJiaoSeTiaoDuQi(常.查库抛错用户, 常.抛错角色, yongHuXiaoXi(常.查库抛错用户, 常.抛错角色))
    await dengDai(() => youFeiKongJiaoSeHuiFu(zhen), 8000, 'fail-closed 后业务帧仍须到达')
  })
})

describe('FP-19 源码守卫：管理员_* emit 站点全部收口', () => {
  it('后端所有 管理员_* emit 一律投 管理监控房间名()，站点总数恒为 8，无一处投玩家本人房间', async () => {
    const { readFileSync, readdirSync, statSync } = await import('fs')
    const { resolve } = await import('path')
    const tsWenJian: string[] = []
    const bianLi = (muLu: string) => {
      for (const xiang of readdirSync(muLu)) {
        const luJing = resolve(muLu, xiang)
        if (statSync(luJing).isDirectory()) {
          if (xiang !== '__tests__' && xiang !== 'node_modules') bianLi(luJing)
        } else if (xiang.endsWith('.ts')) {
          tsWenJian.push(luJing)
        }
      }
    }
    bianLi(resolve(__dirname, '../..'))

    let zhanDian = 0
    for (const wenJian of tsWenJian) {
      const hangMen = readFileSync(wenJian, 'utf8').split(/\r?\n/)
      for (const hang of hangMen) {
        if (!hang.includes(".emit('管理员_")) continue
        zhanDian += 1
        expect(hang, `未收口的站点：${wenJian}`).toContain('io.to(管理监控房间名(')
      }
    }
    expect(zhanDian, '管理员_* emit 站点总数（新增站点必须纳入本守卫）').toBe(8)
  })
})
