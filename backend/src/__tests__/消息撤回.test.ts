import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../services/AI回复调度器'
import { yunXingAIYinQing } from '../services/AI引擎'
import {
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
  baoCunJiaoSeXiaoXi,
} from '../services/AI输入准备'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from '../services/好感度'
import { pingPanHaoGanDuBianHua } from '../services/好感度评判'
import { cheHuiJiaoSeXiaoXi } from '../services/消息'
import {
  jianCeYongHuXiaoXiBingChuLi,
  chuLiAIHuiFuHouJieShuJianCha,
} from '../services/胜利失败条件'
import { jiaoSeShiFouBeiDuoShe } from '../services/夺舍'
import { huoQuIo } from '../socket/io'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import yingYong from '../server'

vi.mock('../services/AI引擎')
vi.mock('../services/AI输入准备')
vi.mock('../services/好感度')
vi.mock('../services/好感度评判')
vi.mock('../services/胜利失败条件')
vi.mock('../services/夺舍')
vi.mock('../socket/io')
vi.mock('../services/消息', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/消息')>()
  return {
    ...actual,
    cheHuiJiaoSeXiaoXi: vi.fn().mockResolvedValue({ cheng_gong: true }),
  }
})

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await qingLiCeShiYongHu(shouJiHao)

  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)

  const zhuCeXiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing: `测试用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
    })
    .expect(200)

  const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  return {
    shouJiHao,
    lingPai: zhuCeXiangYing.body.shu_ju.令牌,
    yongHuId: String(yongHu.rows[0].ID),
  }
}

async function chuangJianCeShiJiaoSe(lingPai: string): Promise<string> {
  const xiangYing = await request(yingYong)
    .post('/api/生成角色/MBTI生成')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ 性别: 'nv', mbti类型: 'INFP' })
    .expect(200)
  const jiaoSe = xiangYing.body.shu_ju
  const queRenXiangYing = await request(yingYong)
    .post('/api/生成角色/确认')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ xuanZhongJiaoSe: jiaoSe })
    .expect(200)
  return String(queRenXiangYing.body.shu_ju.id)
}

async function qingLiJiaoSeHeYongHu(yongHuId: string): Promise<void> {
  await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

function chuangJianCeShiJiaoSeXinXi(): {
  id: string
  ming_zi: string
  wei_xin_ming: string
  xing_bie: 'nan' | 'nv'
  mbti_lei_xing: string
  ie_lei_xing: 'I' | 'E'
  re_shen_lei_xing: '慢热' | '快热'
  nian_ling: number
  shen_fen: string
  wai_mao: string
  xing_ge: string
  bei_jing_gu_shi: string
  xi_hao: string[]
  yan_yu_feng_ge: string
  xing_wei_te_dian: string
  tou_xiang: string
  xi_huan_de_lei_xing: string
  jia_ting_bei_jing: string
  qing_gan_jing_li: string
  shi_fou_zha_xing: boolean
  shi_jie_xin_xi: Record<string, unknown>
  ba_da_mo_kuai: {
    ji_ben_xin_xi: string
    wai_mao: string
    xing_ge: string
    bei_jing: string
    yan_yu: string
    xing_wei: string
    guan_xi: string
    xi_tong_ti_shi: string
  }
} {
  return {
    id: 'jiao-se-id',
    ming_zi: '小雨',
    wei_xin_ming: '雨夜的猫',
    xing_bie: 'nv',
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '快热',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '清秀，长发',
    xing_ge: '温柔敏感',
    bei_jing_gu_shi: '来自江南小城',
    xi_hao: ['画画'],
    yan_yu_feng_ge: '轻柔含蓄',
    xing_wei_te_dian: '害羞但真诚',
    tou_xiang: 'artist',
    xi_huan_de_lei_xing: '温柔体贴',
    jia_ting_bei_jing: '普通家庭',
    qing_gan_jing_li: '有过一段青涩暗恋',
    shi_fou_zha_xing: false,
    shi_jie_xin_xi: {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '小雨，女，20岁',
      wai_mao: '清秀，长发',
      xing_ge: '温柔敏感',
      bei_jing: '江南小城',
      yan_yu: '轻柔含蓄',
      xing_wei: '害羞但真诚',
      guan_xi: '喜欢温柔体贴的人',
      xi_tong_ti_shi: 'INFP性格',
    },
  }
}

function chuangJianMockIo(): Server {
  const emit = vi.fn()
  return {
    to: vi.fn().mockReturnValue({ emit }),
  } as unknown as Server
}

function huoQuEmit(io: Server): ReturnType<typeof vi.fn> {
  const to = io.to as ReturnType<typeof vi.fn>
  return to().emit as ReturnType<typeof vi.fn>
}

describe('FP-08 消息撤回', () => {
  let lingPai = ''
  let yongHuId = ''
  let jiaoSeId = ''

  beforeAll(async () => {
    const jieGuo = await chuangJianCeShiYongHu()
    lingPai = jieGuo.lingPai
    yongHuId = jieGuo.yongHuId
    jiaoSeId = await chuangJianCeShiJiaoSe(lingPai)
  })

  afterAll(async () => {
    if (yongHuId) {
      await qingLiJiaoSeHeYongHu(yongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(async () => {
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`, [yongHuId, jiaoSeId])
  })

  describe('用户撤回', () => {
    it('2分钟内撤回 → 数据库已撤回=true且原始内容保留', async () => {
      const faSongXiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: '测试撤回' })
        .expect(200)

      const xiaoXiId = faSongXiangYing.body.shu_ju.id

      const cheHuiXiangYing = await request(yingYong)
        .put(`/api/聊天/会话/${jiaoSeId}/消息/${xiaoXiId}/撤回`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      expect(cheHuiXiangYing.body.cheng_gong).toBe(true)
      expect(cheHuiXiangYing.body.shu_ju.yi_che_hui).toBe(true)
      expect(cheHuiXiangYing.body.shu_ju.yuan_shi_nei_rong).toBe('测试撤回')

      const jieGuo = await 数据库.query(`SELECT "已撤回", "原始内容" FROM "消息" WHERE "ID" = $1`, [xiaoXiId])
      expect(jieGuo.rows[0].已撤回).toBe(true)
      expect(jieGuo.rows[0].原始内容).toBe('测试撤回')
    })

    it('超2分钟后撤回 → 返回400', async () => {
      const faSongXiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: '测试超时撤回' })
        .expect(200)

      const xiaoXiId = faSongXiangYing.body.shu_ju.id

      await 数据库.query(
        `UPDATE "消息" SET "创建时间" = NOW() - INTERVAL '3 minutes' WHERE "ID" = $1`,
        [xiaoXiId],
      )

      await request(yingYong)
        .put(`/api/聊天/会话/${jiaoSeId}/消息/${xiaoXiId}/撤回`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(400)
    })

    it('撤回操作 → 通过 Socket.IO 推送消息撤回事件', async () => {
      const emit = vi.fn()
      vi.mocked(huoQuIo).mockReturnValue({
        to: vi.fn().mockReturnValue({ emit }),
      } as unknown as Server)

      const faSongXiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: '测试推送' })
        .expect(200)

      const xiaoXiId = faSongXiangYing.body.shu_ju.id

      await request(yingYong)
        .put(`/api/聊天/会话/${jiaoSeId}/消息/${xiaoXiId}/撤回`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      expect(emit).toHaveBeenCalled()
      const cheHuiCalls = emit.mock.calls.filter((call) => call[0] === '消息撤回')
      expect(cheHuiCalls.length).toBe(1)
      expect(cheHuiCalls[0][1]).toMatchObject({
        hui_hua_id: jiaoSeId,
        xiao_xi_id: xiaoXiId,
        fa_song_zhe_lei_xing: 'yonghu',
      })
    })

    it('军师/聊天记录接口返回撤回消息的原始内容字段', async () => {
      const faSongXiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: '军师可见原始内容' })
        .expect(200)

      const xiaoXiId = faSongXiangYing.body.shu_ju.id

      await request(yingYong)
        .put(`/api/聊天/会话/${jiaoSeId}/消息/${xiaoXiId}/撤回`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      const lieBiaoXiangYing = await request(yingYong)
        .get(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      const xiaoXi = lieBiaoXiangYing.body.shu_ju.lie_biao.find((m: { id: string }) => m.id === xiaoXiId)
      expect(xiaoXi).toBeTruthy()
      expect(xiaoXi.yi_che_hui).toBe(true)
      expect(xiaoXi.yuan_shi_nei_rong).toBe('军师可见原始内容')
    })
  })

  describe('AI 回复调度器与撤回', () => {
    let io: Server
    let 调度器: AI回复调度器

    beforeEach(() => {
      vi.useFakeTimers()
      io = chuangJianMockIo()
      调度器 = new AI回复调度器('jiao-se-id', 'yong-hu-id', 'I', io)

      vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValue(chuangJianCeShiJiaoSeXinXi())
      vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
        xin_ren_du: 100,
        qin_mi_du: 100,
        qu_wei_du: 100,
        guan_huai_du: 100,
        zong_fen: 400,
        guan_xi_jie_duan: 'shuXi',
      })
      vi.mocked(huoQuZuiJinDuiHuaLiShi).mockResolvedValue([
        {
          fa_song_zhe_lei_xing: 'yonghu',
          fa_song_zhe_ming: '对方',
          nei_rong: '你好',
          shi_jian: '14:30',
        },
      ])
      vi.mocked(pingPanHaoGanDuBianHua).mockResolvedValue({
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
      })
      vi.mocked(gengXinHaoGanDu as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        cheng_gong: true,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue({
        id: 'ai-xiao-xi-id',
        hui_hua_id: 'jiao-se-id',
        fa_song_zhe_id: 'jiao-se-id',
        fa_song_zhe_lei_xing: 'jiaose',
        nei_rong: 'AI回复',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: true,
      })
      vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockResolvedValue(null)
      vi.mocked(chuLiAIHuiFuHouJieShuJianCha).mockResolvedValue(null)
      vi.mocked(jiaoSeShiFouBeiDuoShe).mockResolvedValue(false)
    })

    afterEach(() => {
      调度器.重置()
      vi.useRealTimers()
      vi.clearAllMocks()
    })

    it('10秒延迟期内再次调用处理用户消息 → 计时器从第二次调用重新计时', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(5000)
      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(5000)

      expect(yunXingAIYinQing).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(5000)
      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)
    })

    it('AI处理中调用处理用户消息 → 中断当前请求并重新计时10秒', async () => {
      let jieXiCuoWu: (value: unknown) => void = () => {}
      vi.mocked(yunXingAIYinQing).mockImplementation(
        () =>
          new Promise((resolve) => {
            jieXiCuoWu = resolve
          }),
      )

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)

      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

      await 调度器.处理用户消息()

      jieXiCuoWu({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      await vi.advanceTimersByTimeAsync(0)

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter((call) => call[0] === '角色回复')
      const xiaoXiZongShu = jiaoSeHuiFuCalls.reduce(
        (sum, call) => sum + (call[1] as { 消息列表: unknown[] }).消息列表.length,
        0,
      )
      expect(xiaoXiZongShu).toBe(0)

      await vi.advanceTimersByTimeAsync(9999)
      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(1)
      expect(yunXingAIYinQing).toHaveBeenCalledTimes(2)
    })

    it('AI Director决定撤回 → 撤回最近一条AI消息并推送空消息列表事件', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: true,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      expect(cheHuiJiaoSeXiaoXi).toHaveBeenCalledWith({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
      })

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter((call) => call[0] === '角色回复')
      expect(jiaoSeHuiFuCalls.length).toBe(1)
      expect((jiaoSeHuiFuCalls[0][1] as { 消息列表: unknown[] }).消息列表).toEqual([])
    })
  })
})
