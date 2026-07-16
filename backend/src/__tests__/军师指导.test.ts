import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
  type TiaoYongCanShu,
  type TiaoYongJieGuo,
} from '../utils/DeepSeek客户端'
import { xieRuFuPanTiaoMu } from '../services/复盘条目'
import { JUN_SHI_PEI_ZHI, JUN_SHI_PEI_ZHI_MO_REN } from '../config/军师配置'
import { huoQuFanYi } from '../config/translations'
import { aiQingQiuXianLiu } from '../middleware/限流'

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

async function qingLiJunShiRedis(yongHuId: string, jiaoSeId: string): Promise<void> {
  await redis.del(`军师哈希:${yongHuId}:${jiaoSeId}`)
  await redis.del(`军师记录:${yongHuId}:${jiaoSeId}`)
  await redis.del(`复盘条目:${yongHuId}:${jiaoSeId}`)
}

async function faSongCeShiXiaoXi(
  lingPai: string,
  jiaoSeId: string,
  neiRong: string,
): Promise<string> {
  const xiangYing = await request(yingYong)
    .post(`/api/聊天/会话/${jiaoSeId}/消息`)
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ neiRong })
    .expect(200)
  return String(xiangYing.body.shu_ju.id)
}

async function cheHuiCeShiXiaoXi(lingPai: string, jiaoSeId: string, xiaoXiId: string): Promise<void> {
  await request(yingYong)
    .put(`/api/聊天/会话/${jiaoSeId}/消息/${xiaoXiId}/撤回`)
    .set('Authorization', `Bearer ${lingPai}`)
    .expect(200)
}

function chuangJianMockShiBie(): {
  jiLu: TiaoYongCanShu[]
  sheZhiXiangYing: (xiangYing: Partial<TiaoYongJieGuo>) => void
} {
  const jiLu: TiaoYongCanShu[] = []
  let xiaYiCiXiangYing: Partial<TiaoYongJieGuo> = { neiRong: '' }

  sheZhiMockTiaoYong(async (canShu) => {
    jiLu.push(canShu)
    return {
      neiRong: xiaYiCiXiangYing.neiRong || '',
      xinXi: xiaYiCiXiangYing.xinXi || { role: 'assistant', content: xiaYiCiXiangYing.neiRong || '' },
      yuanShuJu: (xiaYiCiXiangYing.yuanShuJu || {}) as TiaoYongJieGuo['yuanShuJu'],
    }
  })

  return {
    jiLu,
    sheZhiXiangYing: (xiangYing) => {
      xiaYiCiXiangYing = xiangYing
    },
  }
}

describe('FP-12 军师指导系统', () => {
  let ceShiYongHu: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null
  let jiaoSeId = ''
  let mock: ReturnType<typeof chuangJianMockShiBie>

  beforeAll(async () => {
    ceShiYongHu = await chuangJianCeShiYongHu()
    jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
  })

  afterAll(async () => {
    if (ceShiYongHu) {
      await qingLiJunShiRedis(ceShiYongHu.yongHuId, jiaoSeId)
      await qingLiJiaoSeHeYongHu(ceShiYongHu.yongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(async () => {
    mock = chuangJianMockShiBie()
    if (ceShiYongHu) {
      await qingLiJunShiRedis(ceShiYongHu.yongHuId, jiaoSeId)
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`, [
        ceShiYongHu.yongHuId,
        jiaoSeId,
      ])
      ;(aiQingQiuXianLiu as unknown as { resetKey?: (key: string) => void }).resetKey?.(
        ceShiYongHu.yongHuId,
      )
    }
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
    chongZhiDeepSeekKeHuDuan()
  })

  describe('军师列表', () => {
    it('返回的军师副标题来自后端配置，非前端硬编码', async () => {
      const xiangYing = await request(yingYong)
        .get('/api/聊天/军师/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.junShiLieBiao).toBeInstanceOf(Array)
      expect(xiangYing.body.shu_ju.junShiLieBiao.length).toBeGreaterThan(0)

      const xuanRuiMu = xiangYing.body.shu_ju.junShiLieBiao.find((j: { id: string }) => j.id === 'xuanRuiMu')
      expect(xuanRuiMu).toBeDefined()
      expect(xuanRuiMu.fuBiaoTi).toBe(JUN_SHI_PEI_ZHI_MO_REN.fuBiaoTi)
    })

    it('列表包含玄锐暮、测试军师1、测试军师2', async () => {
      const xiangYing = await request(yingYong)
        .get('/api/聊天/军师/列表')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const ids = xiangYing.body.shu_ju.junShiLieBiao.map((j: { id: string }) => j.id)
      expect(ids).toContain('xuanRuiMu')
      expect(ids).toContain('ceShiJunShi1')
      expect(ids).toContain('ceShiJunShi2')
      expect(xiangYing.body.shu_ju.junShiLieBiao.length).toBe(3)
    })
  })

  describe('请求军师指导', () => {
    it('无聊天记录时返回 400 且错误码为 WU_LIAO_TIAN_JI_LU', async () => {
      const xiangYing = await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.cuo_wu_ma).toBe('WU_LIAO_TIAN_JI_LU')
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
    })

    it('正常请求时 DeepSeek 温度=0.85 且 max_tokens=1500', async () => {
      mock.sheZhiXiangYing({ neiRong: '先吐槽你一句，然后给你建议。' })
      await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '你好呀')

      const xiangYing = await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.zhiDaoNeiRong).toBe('先吐槽你一句，然后给你建议。')
      const junShiTiaoYong = mock.jiLu.find((ji) => ji.wenDu === 0.85 && ji.zuiDaTokens === 1500)
      expect(junShiTiaoYong).toBeDefined()
      expect(junShiTiaoYong!.wenDu).toBe(0.85)
      expect(junShiTiaoYong!.zuiDaTokens).toBe(1500)
    })

    it('指定测试军师1时复用玄锐暮提示词并返回测试军师1信息', async () => {
      mock.sheZhiXiangYing({ neiRong: '测试军师1的建议。' })
      await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '测试军师1消息')

      const xiangYing = await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId, junShiId: 'ceShiJunShi1' })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.junShi.id).toBe('ceShiJunShi1')
      expect(xiangYing.body.shu_ju.junShi.mingCheng).toBe('测试军师1')

      const junShiTiaoYong = mock.jiLu.find((ji) => ji.wenDu === 0.85 && ji.zuiDaTokens === 1500)
      expect(junShiTiaoYong).toBeDefined()
      expect(junShiTiaoYong!.xiaoXi[0].neiRong).toBe(JUN_SHI_PEI_ZHI.ceShiJunShi1.xiTongTiShi)
      expect(junShiTiaoYong!.xiaoXi[0].neiRong).toBe(JUN_SHI_PEI_ZHI.xuanRuiMu.xiTongTiShi)
    })

    it('军师 Prompt 包含好感度四维分数、复盘条目和撤回消息原始内容', async () => {
      mock.sheZhiXiangYing({ neiRong: '这是指导内容。' })

      await xieRuFuPanTiaoMu(ceShiYongHu!.yongHuId, jiaoSeId, {
        shi_jian: new Date().toISOString(),
        yong_hu_xiao_xi: '用户消息',
        ai_hui_fu: 'AI回复',
        ai_xin_li_huo_dong: 'AI内心活动',
        hao_gan_du_bian_hua: {
          xin_ren_bian_hua: 1,
          qin_mi_bian_hua: 1,
          qu_wei_bian_hua: 0,
          guan_huai_bian_hua: 0,
          zong_fen_bian_hua: 2,
        },
      })

      const xiaoXiId = await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '这条会撤回')
      await cheHuiCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, xiaoXiId)

      await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const junShiTiaoYong = mock.jiLu.find((ji) => ji.wenDu === 0.85 && ji.zuiDaTokens === 1500)
      expect(junShiTiaoYong).toBeDefined()
      const yongHuPrompt = junShiTiaoYong!.xiaoXi[1]?.neiRong || ''
      expect(yongHuPrompt).toContain('信任')
      expect(yongHuPrompt).toContain('亲密')
      expect(yongHuPrompt).toContain('趣味')
      expect(yongHuPrompt).toContain('关怀')
      expect(yongHuPrompt).toContain('复盘条目')
      expect(yongHuPrompt).toContain('原始内容：这条会撤回')
    })

    it('军师 Prompt 包含自然度提升要素', async () => {
      mock.sheZhiXiangYing({ neiRong: '这是指导内容。' })
      await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '自然度测试')

      await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const junShiTiaoYong = mock.jiLu.find((ji) => ji.wenDu === 0.85 && ji.zuiDaTokens === 1500)
      expect(junShiTiaoYong).toBeDefined()
      const yongHuPrompt = junShiTiaoYong!.xiaoXi[1]?.neiRong || ''
      expect(yongHuPrompt).toContain('嘴贱但靠谱')
      expect(yongHuPrompt).toContain('像军师在耳边碎碎念')
      expect(yongHuPrompt).toContain('先损两句')
    })

    it('军师响应内容不包含具体分数或维度名', async () => {
      mock.sheZhiXiangYing({
        neiRong: 'TA现在对你挺有兴趣，关系还在试探期，多聊聊日常会更自然 😊',
      })
      await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '在吗')

      const xiangYing = await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const zhiDao = xiangYing.body.shu_ju.zhiDaoNeiRong
      expect(zhiDao).not.toMatch(/\d+分/)
      expect(zhiDao).not.toContain('信任度')
      expect(zhiDao).not.toContain('亲密度')
      expect(zhiDao).not.toContain('趣味度')
      expect(zhiDao).not.toContain('关怀度')
    })

    it('同一聊天内容再次请求返回 409 军师重复', async () => {
      mock.sheZhiXiangYing({ neiRong: '指导一' })
      await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '相同内容')

      await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const chongFuXiangYing = await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(409)

      expect(chongFuXiangYing.body.cheng_gong).toBe(false)
      expect(chongFuXiangYing.body.cuo_wu_ma).toBe('JUN_SHI_CHONG_FU')
      expect(chongFuXiangYing.body.ti_shi).toBe(huoQuFanYi('junShi', 'junShiChongFu'))
    })

    it('不同聊天内容多次请求均成功，无每日限额', async () => {
      mock.sheZhiXiangYing({ neiRong: '指导' })

      for (let i = 0; i < 2; i++) {
        await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, `新内容${i}`)
        const xiangYing = await request(yingYong)
          .post('/api/聊天/军师')
          .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
          .send({ jiaoSeId })
          .expect(200)
        expect(xiangYing.body.cheng_gong).toBe(true)
      }
    })
  })

  describe('指导记录', () => {
    it('指导记录 API 返回最多 20 条，包含完整聊天记录与时间点，且不暴露后台数据/分数/维度名', async () => {
      mock.sheZhiXiangYing({ neiRong: '这是记录测试指导。' })

      for (let i = 0; i < 3; i++) {
        await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, `记录测试${i}`)
        await request(yingYong)
          .post('/api/聊天/军师')
          .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
          .send({ jiaoSeId })
          .expect(200)
      }

      const xiangYing = await request(yingYong)
        .get(`/api/聊天/军师/记录/${jiaoSeId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      const lieBiao = xiangYing.body.shu_ju.jiLuLieBiao
      expect(lieBiao.length).toBeGreaterThan(0)
      expect(lieBiao.length).toBeLessThanOrEqual(20)

      const jiLu = lieBiao[0]
      expect(jiLu).toHaveProperty('jian_yi')
      expect(jiLu).toHaveProperty('shi_jian')
      expect(jiLu).toHaveProperty('jun_shi_tou_xiang')
      expect(jiLu.jun_shi_tou_xiang).toBe(JUN_SHI_PEI_ZHI_MO_REN.touXiang)
      expect(jiLu).not.toHaveProperty('hou_tai_shu_ju')
      expect(jiLu).not.toHaveProperty('hao_gan_du_kuai_zhao')
      expect(jiLu.liao_tian_ji_lu).toBeInstanceOf(Array)
      expect(jiLu.liao_tian_ji_lu.length).toBeGreaterThan(0)
      expect(jiLu.liao_tian_ji_lu[0]).toHaveProperty('shi_jian')
    })

    it('指定测试军师2后记录保存该军师信息', async () => {
      mock.sheZhiXiangYing({ neiRong: '测试军师2记录。' })
      await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '测试军师2记录消息')

      await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId, junShiId: 'ceShiJunShi2' })
        .expect(200)

      const xiangYing = await request(yingYong)
        .get(`/api/聊天/军师/记录/${jiaoSeId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const lieBiao = xiangYing.body.shu_ju.jiLuLieBiao
      expect(lieBiao.length).toBe(1)
      expect(lieBiao[0].jun_shi_id).toBe('ceShiJunShi2')
      expect(lieBiao[0].jun_shi_ming_chen).toBe('测试军师2')
      expect(lieBiao[0].jun_shi_tou_xiang).toBe(JUN_SHI_PEI_ZHI.ceShiJunShi2.touXiang)
    })

    it('指导记录中撤回消息显示原始内容与撤回时间', async () => {
      mock.sheZhiXiangYing({ neiRong: '记录中撤回测试。' })

      const xiaoXiId = await faSongCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, '这条要记录撤回')
      await cheHuiCeShiXiaoXi(ceShiYongHu!.lingPai, jiaoSeId, xiaoXiId)

      await request(yingYong)
        .post('/api/聊天/军师')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const xiangYing = await request(yingYong)
        .get(`/api/聊天/军师/记录/${jiaoSeId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const lieBiao = xiangYing.body.shu_ju.jiLuLieBiao
      expect(lieBiao.length).toBe(1)
      const cheHuiXiaoXi = lieBiao[0].liao_tian_ji_lu.find(
        (x: { yuan_shi_nei_rong?: string }) => x.yuan_shi_nei_rong === '这条要记录撤回',
      )
      expect(cheHuiXiaoXi).toBeDefined()
      expect(cheHuiXiaoXi.yi_che_hui).toBe(true)
      expect(cheHuiXiaoXi.yuan_shi_nei_rong).toBe('这条要记录撤回')
      expect(cheHuiXiaoXi.che_hui_shi_jian).toBeTruthy()
    })
  })
})
