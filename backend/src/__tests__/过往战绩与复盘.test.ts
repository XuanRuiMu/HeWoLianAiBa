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

async function chuangJianJianYiJiaoSe(yongHuId: string, weiXinNiCheng?: string): Promise<string> {
  const jiaoSeId = uuidV4()
  await 数据库.query(
    `INSERT INTO "角色" (
      "ID", "用户ID", "名字", "微信昵称", "性别", "年龄", "外貌", "性格",
      "背景故事", "爱好", "言语风格", "头像", "标签", "是否渣型"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      jiaoSeId,
      yongHuId,
      '真实姓名',
      weiXinNiCheng || null,
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

async function chuangJianZhaXingJiaoSe(
  yongHuId: string,
  weiXinNiCheng: string,
  mbtiLeiXing: string = 'INFJ',
): Promise<string> {
  const jiaoSeId = uuidV4()
  await 数据库.query(
    `INSERT INTO "角色" (
      "ID", "用户ID", "名字", "微信昵称", "性别", "年龄", "外貌", "性格",
      "背景故事", "爱好", "言语风格", "头像", "标签", "是否渣型", "MBTI"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      jiaoSeId,
      yongHuId,
      '林嵩序',
      weiXinNiCheng,
      'nv',
      22,
      '清冷',
      '理想主义',
      '小城出身',
      ['写作'],
      '含蓄诗意',
      'avatar',
      ['文艺'],
      true,
      mbtiLeiXing,
    ],
  )
  return jiaoSeId
}

async function chaRuXiaoXi(
  yongHuId: string,
  jiaoSeId: string,
  neiRong: string,
  faSongZhe: 'yonghu' | 'jiaose' = 'yonghu',
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读")
     VALUES ($1, $2, $3, $4, 'wenben', true)`,
    [yongHuId, jiaoSeId, neiRong, faSongZhe],
  )
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
  await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yongHuId])
}

function shengChengFuPanMockNeiRong(): string {
  return JSON.stringify({
    pi_zhu: [
      { xu_hao: 1, ping_lun: '开场挺自然的，没让人尴尬。' },
      { xu_hao: 3, ping_lun: '这句回应有点急了，可以再稳一点。' },
    ],
    zong_jie: '整体表现不错，建议继续保持自然节奏，像朋友复盘吐槽一样。',
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

    it('战绩列表不返回好感度总分、关系阶段等敏感字段', async () => {
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const lieBiao = xiangYing.body.shu_ju.dangAnLieBiao
      expect(lieBiao.length).toBeGreaterThan(0)
      for (const dangAn of lieBiao) {
        expect(dangAn).not.toHaveProperty('hao_gan_du_zong_fen')
        expect(dangAn).not.toHaveProperty('guan_xi_jie_duan')
        expect(dangAn).not.toHaveProperty('yong_hu_id')
      }
    })

    it('战绩列表显示对象微信昵称而非真实姓名', async () => {
      const jiaoSeId2 = await chuangJianJianYiJiaoSe(ceShiYongHu!.yongHuId, '微信甜心')
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId2, '胜利-爱情')

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const dangAn = xiangYing.body.shu_ju.dangAnLieBiao.find(
        (x: { jiao_se_id: string }) => x.jiao_se_id === jiaoSeId2,
      )
      expect(dangAn).toBeDefined()
      expect(dangAn.jiao_se_ming_zi).toBe('微信甜心')
      expect(dangAn.jiao_se_ming_zi).not.toBe('真实姓名')
    })

    it('微信昵称为空时不返回真实姓名，使用未知微信兜底', async () => {
      const jiaoSeId2 = await chuangJianJianYiJiaoSe(ceShiYongHu!.yongHuId)
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId2, '胜利-爱情')

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const dangAn = xiangYing.body.shu_ju.dangAnLieBiao.find(
        (x: { jiao_se_id: string }) => x.jiao_se_id === jiaoSeId2,
      )
      expect(dangAn).toBeDefined()
      expect(dangAn.jiao_se_ming_zi).toBe(huoQuFanYi('zhanJi', 'weiZhiWeiXin'))
      expect(dangAn.jiao_se_ming_zi).not.toBe('真实姓名')
    })

    it('已结束游戏返回游戏结束时间，进行中游戏返回 null', async () => {
      const jiaoSeId2 = await chuangJianJianYiJiaoSe(ceShiYongHu!.yongHuId, '结束测试')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId2, '胜利-爱情')
      await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '', false)

      const xiangYing = await request(yingYong)
        .get('/api/战绩/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const yiJieShu = xiangYing.body.shu_ju.dangAnLieBiao.find(
        (x: { id: string }) => x.id === dangAnId,
      )
      expect(yiJieShu).toBeDefined()
      expect(yiJieShu.you_xi_jie_shu_shi_jian).toBeTruthy()

      const jinXingZhong = xiangYing.body.shu_ju.dangAnLieBiao.find(
        (x: { jie_guo_lei_xing_yuan: string }) => x.jie_guo_lei_xing_yuan === 'jinxing_zhong',
      )
      expect(jinXingZhong).toBeDefined()
      expect(jinXingZhong.you_xi_jie_shu_shi_jian).toBeNull()
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
      expect(xiangYing.body.shu_ju.fu_pan_pi_zhu).toBeNull()
    })

    it('复盘生成调用 temperature=0.7 且 max_tokens=3000', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')
      let tiaoYongCanShu: { wenDu?: number; zuiDaTokens?: number; xiangYingGeShi?: string } | null = null

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

    it('复盘生成完毕后返回 pi_zhu 批注列表与 zong_jie 总结', async () => {
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
      expect(neiRong).toContain('整体表现不错')
      const piZhu = xiangYing.body.shu_ju.fu_pan_pi_zhu
      expect(Array.isArray(piZhu)).toBe(true)
      expect(piZhu.length).toBeGreaterThan(0)
      for (const tiaoMu of piZhu) {
        expect(typeof tiaoMu.xu_hao).toBe('number')
        expect(tiaoMu.xu_hao).toBeGreaterThan(0)
        expect(typeof tiaoMu.ping_lun).toBe('string')
        expect(tiaoMu.ping_lun.length).toBeGreaterThan(0)
      }
    })

    it('复盘响应不包含旧的 7 维度 markdown 标题', async () => {
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
      expect(neiRong).not.toContain('## 逐句分析')
      expect(neiRong).not.toContain('## 聊对了什么')
      expect(neiRong).not.toContain('## 聊错了什么')
      expect(neiRong).not.toContain('## 撤回分析')
      expect(neiRong).not.toContain('## 军师建议效果')
      expect(neiRong).not.toContain('## 整体感受')
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
      const piZhu = xiangYing.body.shu_ju.fu_pan_pi_zhu || []
      for (const tiaoMu of piZhu) {
        expect(tiaoMu.ping_lun).not.toMatch(/\d+分/)
        expect(tiaoMu.ping_lun).not.toContain('信任度')
        expect(tiaoMu.ping_lun).not.toContain('亲密度')
        expect(tiaoMu.ping_lun).not.toContain('趣味度')
        expect(tiaoMu.ping_lun).not.toContain('关怀度')
        expect(tiaoMu.ping_lun).not.toContain('好感度')
      }
    })

    it('复盘 prompt 包含角色基本信息和后台数据用于 AI 分析', async () => {
      const zhaXingJiaoSeId = await chuangJianZhaXingJiaoSe(ceShiYongHu!.yongHuId, '渣女林嵩序', 'INFJ')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '胜利-识破')
      let buHuoDePrompt = ''

      sheZhiMockTiaoYong(async (canShu) => {
        const yongHuXiaoXi = canShu.xiaoXi.find((x) => x.jiaoSe === 'user')
        if (yongHuXiaoXi && yongHuXiaoXi.neiRong.includes('【角色基本信息】')) {
          buHuoDePrompt = yongHuXiaoXi.neiRong
        }
        return {
          neiRong: shengChengFuPanMockNeiRong(),
          xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
          yuanShuJu: {} as never,
        }
      })

      await shengChengFuPan(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, dangAnId)

      expect(buHuoDePrompt).not.toBe('')
      expect(buHuoDePrompt).toContain('渣女林嵩序')
      expect(buHuoDePrompt).toContain('MBTI：INFJ')
      expect(buHuoDePrompt).toContain('对象类型：渣型（渣女）')
      expect(buHuoDePrompt).toContain('渣型特质')
      expect(buHuoDePrompt).toContain('识破线索')
      expect(buHuoDePrompt).toContain('胜利条件：用户识破渣型身份')
    })

    it('渣型角色复盘 prompt 包含渣型特质和识破线索', async () => {
      const zhaXingJiaoSeId = await chuangJianZhaXingJiaoSe(ceShiYongHu!.yongHuId, '林嵩序渣女', 'INFJ')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '胜利-识破')
      let buHuoDePrompt = ''

      sheZhiMockTiaoYong(async (canShu) => {
        const yongHuXiaoXi = canShu.xiaoXi.find((x) => x.jiaoSe === 'user')
        if (yongHuXiaoXi && yongHuXiaoXi.neiRong.includes('【角色基本信息】')) {
          buHuoDePrompt = yongHuXiaoXi.neiRong
        }
        return {
          neiRong: shengChengFuPanMockNeiRong(),
          xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
          yuanShuJu: {} as never,
        }
      })

      await shengChengFuPan(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, dangAnId)

      expect(buHuoDePrompt).not.toBe('')
      expect(buHuoDePrompt).toContain('渣型特质')
      expect(buHuoDePrompt).toContain('灵魂共鸣')
      expect(buHuoDePrompt).toContain('很少有人能懂我')
      expect(buHuoDePrompt).toContain('害怕受伤')
      expect(buHuoDePrompt).toContain('推拉感很强')
      expect(buHuoDePrompt).toContain('识破线索')
      expect(buHuoDePrompt).toContain('胜利条件：用户识破渣型身份')
      expect(buHuoDePrompt).toContain('失败条件：用户被欺骗表白')
    })

    it('渣型角色复盘 zong_jie 标注对象类型为渣型', async () => {
      const zhaXingJiaoSeId = await chuangJianZhaXingJiaoSe(ceShiYongHu!.yongHuId, '渣女测试', 'INFJ')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '胜利-识破')

      const zhaXingMockNeiRong = JSON.stringify({
        pi_zhu: [{ xu_hao: 1, pi_zhu_nei_rong: '对方开场就在制造稀缺感。', qing_gan: '消极' }],
        zong_jie: {
          dui_xiang_lei_xing: '渣型',
          yong_hu_biao_xian: '用户在第3条识破了渣型的灵魂共鸣话术。',
          guan_jian_zhuan_zhe_dian: '用户直接质疑"很少有人能懂我"是套路。',
          gai_jin_jian_yi: '继续保持警惕，对感性的话多问为什么。',
        },
      })

      sheZhiMockTiaoYong(async () => ({
        neiRong: zhaXingMockNeiRong,
        xinXi: { role: 'assistant', content: zhaXingMockNeiRong },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const neiRong = xiangYing.body.shu_ju.fu_pan_nei_rong
      expect(neiRong).toContain('对象类型：渣型')
      expect(neiRong).toContain('用户表现')
      expect(neiRong).toContain('关键转折点')
      expect(neiRong).toContain('改进建议')
      expect(neiRong).not.toContain('信任度')
      expect(neiRong).not.toContain('亲密度')
      expect(neiRong).not.toContain('MBTI')
      expect(neiRong).not.toMatch(/\d+分/)
    })

    it('正常角色复盘 prompt 不包含渣型特质段', async () => {
      const zhengChangJiaoSeId = await chuangJianJianYiJiaoSe(ceShiYongHu!.yongHuId, '温柔对象')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, zhengChangJiaoSeId, '胜利-爱情')
      let buHuoDePrompt = ''

      sheZhiMockTiaoYong(async (canShu) => {
        const yongHuXiaoXi = canShu.xiaoXi.find((x) => x.jiaoSe === 'user')
        if (yongHuXiaoXi && yongHuXiaoXi.neiRong.includes('【角色基本信息】')) {
          buHuoDePrompt = yongHuXiaoXi.neiRong
        }
        return {
          neiRong: shengChengFuPanMockNeiRong(),
          xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
          yuanShuJu: {} as never,
        }
      })

      await shengChengFuPan(ceShiYongHu!.yongHuId, zhengChangJiaoSeId, dangAnId)

      expect(buHuoDePrompt).not.toBe('')
      expect(buHuoDePrompt).not.toContain('【渣型特质】')
      expect(buHuoDePrompt).not.toContain('渣法描述')
      expect(buHuoDePrompt).not.toContain('用户识破渣型身份')
      expect(buHuoDePrompt).toContain('对象类型：正常角色')
      expect(buHuoDePrompt).toContain('双向表白成功')
    })

    it('复盘 pi_zhu 的 qing_gan 字段被传递到前端响应', async () => {
      const zhaXingJiaoSeId = await chuangJianZhaXingJiaoSe(ceShiYongHu!.yongHuId, '渣女情感字段测试', 'INFJ')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '胜利-识破')

      const qingGanMockNeiRong = JSON.stringify({
        pi_zhu: [
          { xu_hao: 1, pi_zhu_nei_rong: '对方开场就在制造稀缺感。', qing_gan: '消极' },
          { xu_hao: 2, pi_zhu_nei_rong: '此处回应稍显急切。', qing_gan: '中性' },
          { xu_hao: 3, pi_zhu_nei_rong: '识破话术很果断，干得漂亮。', qing_gan: '积极' },
        ],
        zong_jie: {
          dui_xiang_lei_xing: '渣型',
          yong_hu_biao_xian: '用户识破及时。',
          guan_jian_zhuan_zhe_dian: '第3条直接质疑。',
          gai_jin_jian_yi: '继续保持警惕。',
        },
      })

      sheZhiMockTiaoYong(async () => ({
        neiRong: qingGanMockNeiRong,
        xinXi: { role: 'assistant', content: qingGanMockNeiRong },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const piZhu = xiangYing.body.shu_ju.fu_pan_pi_zhu
      expect(Array.isArray(piZhu)).toBe(true)
      expect(piZhu.length).toBe(3)
      const qingGanLieBiao = piZhu.map((tiaoMu: { qing_gan?: string }) => tiaoMu.qing_gan)
      expect(qingGanLieBiao).toContain('消极')
      expect(qingGanLieBiao).toContain('中性')
      expect(qingGanLieBiao).toContain('积极')
    })

    it('复盘 pi_zhu 缺失 qing_gan 时不向前端返回该字段', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      const wuQingGanMockNeiRong = JSON.stringify({
        pi_zhu: [
          { xu_hao: 1, ping_lun: '开场挺自然的，没让人尴尬。' },
          { xu_hao: 3, ping_lun: '这句回应有点急了，可以再稳一点。' },
        ],
        zong_jie: '整体表现不错，建议继续保持自然节奏。',
      })

      sheZhiMockTiaoYong(async () => ({
        neiRong: wuQingGanMockNeiRong,
        xinXi: { role: 'assistant', content: wuQingGanMockNeiRong },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const piZhu = xiangYing.body.shu_ju.fu_pan_pi_zhu
      expect(Array.isArray(piZhu)).toBe(true)
      expect(piZhu.length).toBe(2)
      for (const tiaoMu of piZhu) {
        expect(tiaoMu).not.toHaveProperty('qing_gan')
      }
    })

    it('复盘 prompt 包含开场白和用户第一句话内容', async () => {
      const zhaXingJiaoSeId = await chuangJianZhaXingJiaoSe(ceShiYongHu!.yongHuId, '林嵩序开场白测试', 'INFJ')
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '胜利-识破')
      let buHuoDePrompt = ''

      await chaRuXiaoXi(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '嗨，我也是一个人在写东西，看到你的签名就过来了。', 'jiaose')
      await chaRuXiaoXi(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '你好呀，写什么呢？', 'yonghu')
      await chaRuXiaoXi(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '在写一些关于孤独的东西，很少有人能懂我。', 'jiaose')
      await chaRuXiaoXi(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, '我感觉你在套路我。', 'yonghu')

      sheZhiMockTiaoYong(async (canShu) => {
        const yongHuXiaoXi = canShu.xiaoXi.find((x) => x.jiaoSe === 'user')
        if (yongHuXiaoXi && yongHuXiaoXi.neiRong.includes('【角色基本信息】')) {
          buHuoDePrompt = yongHuXiaoXi.neiRong
        }
        return {
          neiRong: shengChengFuPanMockNeiRong(),
          xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
          yuanShuJu: {} as never,
        }
      })

      await shengChengFuPan(ceShiYongHu!.yongHuId, zhaXingJiaoSeId, dangAnId)

      expect(buHuoDePrompt).not.toBe('')
      expect(buHuoDePrompt).toContain('我也是一个人在写东西')
      expect(buHuoDePrompt).toContain('你好呀，写什么呢？')
      expect(buHuoDePrompt).toContain('很少有人能懂我')
      expect(buHuoDePrompt).toContain('我感觉你在套路我')
    })

    it('复盘存储格式为 {pi_zhu: ...} 对象', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: shengChengFuPanMockNeiRong(),
        xinXi: { role: 'assistant', content: shengChengFuPanMockNeiRong() },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const jieGuo = await 数据库.query(
        `SELECT "复盘数据" FROM "游戏档案" WHERE "ID" = $1`,
        [dangAnId],
      )
      const fuPanShuJu = jieGuo.rows[0].复盘数据
      const jieXi = typeof fuPanShuJu === 'string' ? JSON.parse(fuPanShuJu) : fuPanShuJu
      expect(jieXi).toHaveProperty('pi_zhu')
      expect(Array.isArray(jieXi.pi_zhu)).toBe(true)
      expect(jieXi.pi_zhu.length).toBeGreaterThan(0)
      expect(jieXi.pi_zhu[0]).toHaveProperty('xu_hao')
      expect(jieXi.pi_zhu[0]).toHaveProperty('ping_lun')
    })

    it('AI 返回对象字段时复盘内容不出现 [object Object]', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      sheZhiMockTiaoYong(async () => ({
        neiRong: JSON.stringify({
          pi_zhu: [
            { xu_hao: 1, ping_lun: { nested: '对象字段示例' } },
            { xu_hao: 2, ping_lun: ['数组', '字段'] },
          ],
          zong_jie: { summary: '总结对象' },
        }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }))

      await shengChengFuPan(ceShiYongHu!.yongHuId, jiaoSeId, dangAnId)

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/复盘/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const neiRong = xiangYing.body.shu_ju.fu_pan_nei_rong
      expect(neiRong).not.toContain('[object Object]')
      expect(neiRong).toContain('summary')
      const piZhu = xiangYing.body.shu_ju.fu_pan_pi_zhu || []
      for (const tiaoMu of piZhu) {
        expect(tiaoMu.ping_lun).not.toContain('[object Object]')
      }
    })

    it('复盘详情返回军师指导记录且不包含好感度快照', async () => {
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
      for (const jiLu of jiLuLieBiao) {
        expect(jiLu).not.toHaveProperty('hao_gan_du_kuai_zhao')
        expect(jiLu).not.toHaveProperty('hou_tai_shu_ju')
      }
    })

    it('时间格式化函数对无效时间戳返回空字符串不显示 Invalid Date', async () => {
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

      const quanBuWenBen = JSON.stringify(xiangYing.body.shu_ju)
      expect(quanBuWenBen).not.toContain('Invalid Date')
      expect(quanBuWenBen).not.toContain('NaN:NaN')
    })
  })

  describe('战绩详情与删除', () => {
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

    it('删除已存在的战绩后无法再次访问', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      const shanChuXiangYing = await request(yingYong)
        .delete(`/api/战绩/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)
      expect(shanChuXiangYing.body.cheng_gong).toBe(true)

      await request(yingYong)
        .get(`/api/战绩/详情/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(404)
    })

    it('批量删除多条战绩后无法再次访问', async () => {
      const jiaoSeId2 = await chuangJianJianYiJiaoSe(ceShiYongHu!.yongHuId)
      const dangAnId1 = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')
      const dangAnId2 = await chuangJianYouXiDangAn(
        ceShiYongHu!.yongHuId,
        jiaoSeId2,
        '失败-过早表白',
      )

      const shanChuXiangYing = await request(yingYong)
        .post('/api/战绩/批量删除')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ dangAnIds: [dangAnId1, dangAnId2] })
        .expect(200)
      expect(shanChuXiangYing.body.cheng_gong).toBe(true)
      expect(shanChuXiangYing.body.shu_ju.shan_chu_ids).toContain(dangAnId1)
      expect(shanChuXiangYing.body.shu_ju.shan_chu_ids).toContain(dangAnId2)

      await request(yingYong)
        .get(`/api/战绩/详情/${dangAnId1}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(404)
      await request(yingYong)
        .get(`/api/战绩/详情/${dangAnId2}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(404)
    })

    it('批量删除空数组或非法参数返回 400', async () => {
      const kongXiangYing = await request(yingYong)
        .post('/api/战绩/批量删除')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ dangAnIds: [] })
        .expect(400)
      expect(kongXiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'queShaoCanShu'))

      const feiFaXiangYing = await request(yingYong)
        .post('/api/战绩/批量删除')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ dangAnIds: ['', 123, null] })
        .expect(400)
      expect(feiFaXiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'queShaoCanShu'))
    })

    it('战绩详情不返回好感度总分、关系阶段等敏感字段', async () => {
      const dangAnId = await chuangJianYouXiDangAn(ceShiYongHu!.yongHuId, jiaoSeId, '胜利-爱情')

      const xiangYing = await request(yingYong)
        .get(`/api/战绩/详情/${dangAnId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const dangAn = xiangYing.body.shu_ju
      expect(dangAn).not.toHaveProperty('hao_gan_du_zong_fen')
      expect(dangAn).not.toHaveProperty('guan_xi_jie_duan')
      expect(dangAn).not.toHaveProperty('yong_hu_id')
    })
  })
})
