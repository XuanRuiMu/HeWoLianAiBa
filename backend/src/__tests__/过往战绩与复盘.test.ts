import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'
import { shengChengFuPan } from '../services/复盘'
import { xieRuFuPanTiaoMu } from '../services/复盘条目'
import { v4 as uuidV4 } from 'uuid'
import { huoQuFanYi } from '../config/translations'

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

async function chuangJianCeShiJiaoSe(lingPai: string, canShu: Record<string, unknown>): Promise<string> {
  const shengChengXiangYing = await request(yingYong)
    .post('/api/生成角色/MBTI生成')
    .set('Authorization', `Bearer ${lingPai}`)
    .send(canShu)
    .expect(200)

  const jiaoSe = shengChengXiangYing.body.shu_ju
  const queRenXiangYing = await request(yingYong)
    .post('/api/生成角色/确认')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ xuanZhongJiaoSe: jiaoSe })
    .expect(200)

  return String(queRenXiangYing.body.shu_ju.id)
}

async function qingLiJiaoSeHeYongHu(yongHuId: string): Promise<void> {
  await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

async function chuangJianJianYiJiaoSe(yongHuId: string): Promise<string> {
  const jiaoSeId = uuidV4()
  await 数据库.query(
    `INSERT INTO "角色" (
      "ID", "用户ID", "名字", "性别", "年龄", "外貌", "性格",
      "背景故事", "爱好", "言语风格", "头像", "标签", "是否渣型"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      jiaoSeId,
      yongHuId,
      '简易角色',
      'nv',
      20,
      '清秀',
      '温柔',
      '来自小城',
      ['画画'],
      '轻柔',
      'avatar',
      ['温柔'],
      false,
    ],
  )
  return jiaoSeId
}

async function chuangJianYouXiDangAn(
  yongHuId: string,
  jiaoSeId: string,
  jieGuoLeiXing: string,
  shiFouFengCun = true,
): Promise<string> {
  const jiaoSe = await 数据库.query(`SELECT "名字", "微信昵称", "是否渣型" FROM "角色" WHERE "ID" = $1`, [jiaoSeId])
  const row = jiaoSe.rows[0] || {}
  const dangAnId = uuidV4()
  await 数据库.query(
    `INSERT INTO "游戏档案" (
      "ID", "用户ID", "角色ID", "角色名字", "是否渣型", "结果类型",
      "是否封存", "好感度总分", "关系阶段", "聊天天数", "消息总数"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      dangAnId,
      yongHuId,
      jiaoSeId,
      String(row.名字 || '测试角色'),
      Boolean(row.是否渣型),
      jieGuoLeiXing,
      shiFouFengCun,
      850,
      'reLian',
      3,
      6,
    ],
  )
  return dangAnId
}

async function qingLiFuPanPingGuRedis(yongHuId: string, jiaoSeId: string): Promise<void> {
  await redis.del(`军师哈希:${yongHuId}:${jiaoSeId}`)
  await redis.del(`军师记录:${yongHuId}:${jiaoSeId}`)
  await redis.del(`复盘条目:${yongHuId}:${jiaoSeId}`)
}

async function qingLiDangAnYuJieJu(yongHuId: string): Promise<void> {
  await 数据库.query(`DELETE FROM "评估" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yongHuId])
}

function shengChengFuPanMockNeiRong(): string {
  return JSON.stringify({
    逐句分析: '你开场问候自然，后续能接住话题。',
    聊对了什么: '保持了轻松语气，适时关心对方。',
    聊错了什么: '有一次回复稍显急躁。',
    撤回分析: '撤回了一条消息，避免了尴尬。',
    军师建议效果: '军师建议你多分享日常，实际帮助了你打开话题。',
    关键事件时间线: ['10:00 - 初次互动', '10:05 - 话题深入', '10:10 - 关心对方'],
    总结评价: '整体表现不错，建议继续保持自然节奏。',
  })
}

function shengChengPingGuMockNeiRong(): string {
  return JSON.stringify({
    话题引导: { 分数: 8, 说明: '能自然引出话题' },
    情感共鸣: { 分数: 7, 说明: '能回应情绪' },
    幽默感: { 分数: 6, 说明: '偶尔有亮点' },
    体贴度: { 分数: 8, 说明: '关心细节' },
    节奏把控: { 分数: 7, 说明: '总体平稳' },
    总体评价: '聊天水平良好，有进一步提升空间。',
    改进建议: ['多倾听', '避免急躁', '增加共同话题'],
  })
}

describe('FP-13 过往战绩与复盘', () => {
  let ceShiYongHu: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null
  let jiaoSeId = ''

  beforeAll(async () => {
    ceShiYongHu = await chuangJianCeShiYongHu()
    jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
  })

  afterAll(async () => {
    if (ceShiYongHu) {
      await qingLiFuPanPingGuRedis(ceShiYongHu.yongHuId, jiaoSeId)
      await qingLiDangAnYuJieJu(ceShiYongHu.yongHuId)
      await qingLiJiaoSeHeYongHu(ceShiYongHu.yongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(async () => {
    chongZhiDeepSeekKeHuDuan()
    if (ceShiYongHu) {
      await qingLiFuPanPingGuRedis(ceShiYongHu.yongHuId, jiaoSeId)
      await qingLiDangAnYuJieJu(ceShiYongHu.yongHuId)
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`, [
        ceShiYongHu.yongHuId,
        jiaoSeId,
      ])
    }
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
    chongZhiDeepSeekKeHuDuan()
  })

  describe('战绩列表', () => {
    it('返回结果按创建时间倒序排列', async () => {
      const jiaoSeId2 = await chuangJianJianYiJiaoSe(ceShiYongHu!.yongHuId)
      const dangAnId1 = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')
      await new Promise((jieJue) => setTimeout(jieJue, 50))
      const dangAnId2 = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId2, '失败-过早表白')

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      const lieBiao = xiangYing.body.shu_ju.dangAnLieBiao
      expect(lieBiao.length).toBeGreaterThanOrEqual(2)
      const dangAnIds = lieBiao.map((x: { id: string }) => x.id)
      expect(dangAnIds.indexOf(dangAnId2)).toBeLessThan(dangAnIds.indexOf(dangAnId1))
    })

    it('进行中的游戏状态为 jinxing_zhong', async () => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '', false)

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const jinXingZhong = xiangYing.body.shu_ju.dangAnLieBiao.find(
        (x: { jie_guo_lei_xing_yuan: string }) => x.jie_guo_lei_xing_yuan === 'jinxing_zhong',
      )
      expect(jinXingZhong).toBeDefined()
      expect(jinXingZhong.shi_fou_feng_cun).toBe(false)
    })

    it.each([
      ['胜利-爱情', 'sheng_li_ai_qing'],
      ['胜利-互删胜利', 'sheng_li_hu_shan_sheng_li'],
      ['胜利-识破', 'sheng_li_shi_po'],
      ['失败-过早表白', 'shi_bai_guo_zao_biao_bai'],
      ['失败-被欺骗', 'shi_bai_bei_qi_pian'],
      ['失败-被诈型欺骗', 'shi_bai_bei_zha_xing_qi_pian'],
      ['失败-互删失败', 'shi_bai_hu_shan_shi_bai'],
      ['失败-好感度归零', 'shi_bai_hao_gan_du_gui_ling'],
      ['失败-错误识破', 'shi_bai_cuo_wu_shi_po'],
      ['失败-拒绝表白', 'shi_bai_ju_jue_biao_bai'],
    ])('战绩状态=%s → 映射为 %s 且已封存', async (jieGuoLeiXing, yuQiYuan) => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, jieGuoLeiXing)

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const dangAn = xiangYing.body.shu_ju.dangAnLieBiao.find(
        (x: { jie_guo_lei_xing: string }) => x.jie_guo_lei_xing === jieGuoLeiXing,
      )
      expect(dangAn).toBeDefined()
      expect(dangAn.jie_guo_lei_xing_yuan).toBe(yuQiYuan)
      expect(dangAn.shi_fou_feng_cun).toBe(true)
    })
  })

  describe('复盘生成', () => {
    it('复盘未生成时请求详情返回加载状态', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(true)
      expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toBeNull()
      expect(xiangYing.body.shu_ju.fu_pan_shi_jian_xian).toEqual([])
    })

    it('复盘生成调用 temperature=0.7 且 max_tokens=3000', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')
      let tiaoYongCanShu: { wenDu?: number; zuiDaTokens?: number } | null = null

      sheZhiMockTiaoYong(async (canShu) => {
        tiaoYongCanShu = canShu
        return {
          neiRong: shengChengFuPanMockNeiRong(),
          xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
          yuanShuJu: {} as never,
        }
      })

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      expect(tiaoYongCanShu).not.toBeNull()
      expect(tiaoYongCanShu!.wenDu).toBe(0.7)
      expect(tiaoYongCanShu!.zuiDaTokens).toBe(3000)
    })

    it('复盘生成完毕后刷新页面显示完整7维度内容', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengFuPanMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.jia_zai_zhong).toBe(false)
      const neiRong = xiangYing.body.shu_ju.fu_pan_nei_rong
      expect(neiRong).toContain('## 逐句分析')
      expect(neiRong).toContain('## 聊对了什么')
      expect(neiRong).toContain('## 聊错了什么')
      expect(neiRong).toContain('## 撤回分析')
      expect(neiRong).toContain('## 军师建议效果')
      expect(neiRong).toContain('## 总结评价')
    })

    it('复盘关键事件时间线格式匹配 HH:MM - 描述', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengFuPanMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const shiJianXian = xiangYing.body.shu_ju.fu_pan_shi_jian_xian
      expect(shiJianXian.length).toBeGreaterThan(0)
      for (const tiaoMu of shiJianXian) {
        expect(tiaoMu.shi_jian).toMatch(/^\d{2}:\d{2}$/)
        expect(tiaoMu.shi_jian_miao_shu).toBeTruthy()
      }
    })

    it('复盘内容包含军师建议效果分析', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengFuPanMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.shu_ju.fu_pan_nei_rong).toContain('军师建议效果')
    })

    it('复盘内容不包含数字评分、维度名或好感度字样', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengFuPanMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const neiRong = xiangYing.body.shu_ju.fu_pan_nei_rong
      expect(neiRong).not.toMatch(/\d+分/)
      expect(neiRong).not.toContain('信任度')
      expect(neiRong).not.toContain('亲密度')
      expect(neiRong).not.toContain('趣味度')
      expect(neiRong).not.toContain('关怀度')
      expect(neiRong).not.toContain('好感度')
    })

    it('复盘详情返回军师指导记录且包含好感度快照', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')
      await xieRuFuPanTiaoMu(ceShiYongHu!.yongHuId, jiaoSeId, {
        shi_jian: new Date().toISOString(),
        yong_hu_xiao_xi: '你好',
        ai_hui_fu: '嗨',
        ai_xin_li_huo_dong: '对方看起来友善',
        hao_gan_du_bian_hua: {
          xin_ren_bian_hua: 1,
          qin_mi_bian_hua: 0,
          qu_wei_bian_hua: 0,
          guan_huai_bian_hua: 0,
          zong_fen_bian_hua: 1,
        },
      })

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengFuPanMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const jiLuLieBiao = xiangYing.body.shu_ju.jun_shi_zhi_dao_ji_lu
      expect(Array.isArray(jiLuLieBiao)).toBe(true)
    })
  })

  describe('聊天水平评估', () => {
    it('评估调用 temperature=0.3 且返回合法JSON', async () => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')
      let tiaoYongCanShu: { wenDu?: number } | null = null

      sheZhiMockTiaoYong(async (canShu) => {
        tiaoYongCanShu = canShu
        return {
          neiRong: shengChengPingGuMockNeiRong(),
          xinXi: { role: 'assistant', content: shengChengPingGuMockNeiRong() },
          yuanShuJu: {} as never,
        }
      })

      const xiangYing = await request(yingYong)
        .post('/api/战绩/评估/聊天水平')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      expect(tiaoYongCanShu).not.toBeNull()
      expect(tiaoYongCanShu!.wenDu).toBe(0.3)
      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju).toHaveProperty('话题引导')
      expect(xiangYing.body.shu_ju).toHaveProperty('情感共鸣')
      expect(xiangYing.body.shu_ju).toHaveProperty('幽默感')
      expect(xiangYing.body.shu_ju).toHaveProperty('体贴度')
      expect(xiangYing.body.shu_ju).toHaveProperty('节奏把控')
    })

    it('评估JSON各维度分数在1-10范围内', async () => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengPingGuMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengPingGuMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      const xiangYing = await request(yingYong)
        .post('/api/战绩/评估/聊天水平')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const jieGuo = xiangYing.body.shu_ju
      const weiDu = ['话题引导', '情感共鸣', '幽默感', '体贴度', '节奏把控']
      for (const mingCheng of weiDu) {
        expect(jieGuo[mingCheng]).toHaveProperty('fen')
        expect(jieGuo[mingCheng]).toHaveProperty('shuo_ming')
        expect(jieGuo[mingCheng].fen).toBeGreaterThanOrEqual(1)
        expect(jieGuo[mingCheng].fen).toBeLessThanOrEqual(10)
      }
    })

    it('聊天水平评估完成后评估表新增记录', async () => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengPingGuMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengPingGuMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await request(yingYong)
        .post('/api/战绩/评估/聊天水平')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const jieGuo = await 数据库.query(
        `SELECT "ID" FROM "评估" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(jieGuo.rows.length).toBeGreaterThan(0)
    })

    it('获取评估历史返回最近一条记录', async () => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengPingGuMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengPingGuMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await request(yingYong)
        .post('/api/战绩/评估/聊天水平')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const xiangYing = await request(yingYong)
        .get('/api/战绩/评估/聊天水平')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .query({ jiaoSeId })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju).not.toBeNull()
      expect(xiangYing.body.shu_ju.话题引导.fen).toBe(8)
    })
  })

  describe('战绩详情', () => {
    it('未授权访问返回 401', async () => {
      const xiangYing = await request(yingYong).get('/api/战绩/列表').expect(401)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'weiShouQuan'))
    })

    it('访问不存在的战绩返回 404', async () => {
      const xiangYing = await request(yingYong)
        .get(`/api/战绩/详情/${uuidV4()}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(404)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    })
  })
})
