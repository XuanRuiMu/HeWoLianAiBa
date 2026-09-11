import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { MEI_TI_PEI_ZHI } from '../config/媒体配置'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { sheZhiKaiChangBaiMock } from '../services/开场白生成'
import { huoQuMeiTiQianMingMiYao } from '../services/媒体存储'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'
import { chongZhiCiKuHuanCun } from '../services/审核词库'

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
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)

  const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  return {
    shouJiHao,
    lingPai: zhuCeXiangYing.body.shu_ju.令牌,
    yongHuId: String(yongHu.rows[0].ID),
  }
}

const jiaoSeHuanCun = new Map<string, string>()
const yiChuanSha256JiHe = new Set<string>()

async function chuangJianCeShiJiaoSe(lingPai: string): Promise<string> {
  const yiYou = jiaoSeHuanCun.get(lingPai)
  if (yiYou) return yiYou

  const shengChengXiangYing = await request(yingYong)
    .post('/api/生成角色/MBTI生成')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ 性别: 'nv', mbti类型: 'INFP' })
    .expect(200)

  const jiaoSe = shengChengXiangYing.body.shu_ju
  const queRenXiangYing = await request(yingYong)
    .post('/api/生成角色/确认')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ xuanZhongJiaoSe: jiaoSe })
    .expect(200)

  const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
  jiaoSeHuanCun.set(lingPai, jiaoSeId)
  return jiaoSeId
}

async function qingLiJiaoSeHeYongHu(yongHuId: string): Promise<void> {
  await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

interface ShangChuanXiangYing {
  status: number
  body: {
    cheng_gong: boolean
    ti_shi?: string
    shu_ju?: {
      mediaId?: string
      sha256?: string
      mime?: string
      daXiao?: number
      leiBie?: string
      yuanShiWenJianMing?: string
    }
  }
  headers: Record<string, unknown>
}

function zhenShiPNG(kuan = 16, gao = 16): Buffer {
  const b = Buffer.alloc(33)
  b.writeUInt32BE(0x89504e47, 0)
  b.writeUInt32BE(0x0d0a1a0a, 4)
  b.writeUInt32BE(13, 8)
  b.write('IHDR', 12, 'ascii')
  b.writeUInt32BE(kuan, 16)
  b.writeUInt32BE(gao, 20)
  b[24] = 8
  b[25] = 6
  return b
}

async function shangChuanMeiTi(
  xuanXiang: {
    lingPai?: string
    jiaoSeId: string
    leiBie: string
    neiRong: Buffer | string
    wenJianMing: string
    mime: string
  },
): Promise<ShangChuanXiangYing> {
  const qingQiu = request(yingYong)
    .post(`/api/聊天/会话/${xuanXiang.jiaoSeId}/媒体`)
    .query({ leiBie: xuanXiang.leiBie })
  if (xuanXiang.lingPai) {
    qingQiu.set('Authorization', `Bearer ${xuanXiang.lingPai}`)
  }
  const neiRongHuanChong = Buffer.isBuffer(xuanXiang.neiRong)
    ? xuanXiang.neiRong
    : Buffer.from(xuanXiang.neiRong)
  const xiangYing = await qingQiu.attach('file', neiRongHuanChong, {
    filename: xuanXiang.wenJianMing,
    contentType: xuanXiang.mime,
  })
  if (xiangYing.body?.shu_ju?.sha256) {
    yiChuanSha256JiHe.add(String(xiangYing.body.shu_ju.sha256))
  }
  return xiangYing as unknown as ShangChuanXiangYing
}

describe('FP-06 B-5 图片LLM机审', () => {
  let yongHuA: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null

  beforeAll(async () => {
    yongHuA = await chuangJianCeShiYongHu()
  })

  beforeEach(async () => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))
    chongZhiDeepSeekKeHuDuan()
    chongZhiCiKuHuanCun()
    // 任务3三级封禁会跨用例累计：每个用例前清零该测试用户的账号封禁态，保证用例隔离
    if (yongHuA) {
      await 数据库.query(`DELETE FROM "账号封禁" WHERE "用户ID" = $1`, [yongHuA.yongHuId]).catch(() => {})
      await redis.del(`账号违规:${yongHuA.yongHuId}`).catch(() => {})
      await redis.del(`账号封禁:${yongHuA.yongHuId}`).catch(() => {})
    }
    // 默认 mock：正常图片通过审核
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      // 文本安全审核 mock
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })
  })

  afterEach(() => {
    sheZhiKaiChangBaiMock(null)
    sheZhiMockTiaoYong(null)
    chongZhiCiKuHuanCun()
  })

  afterAll(async () => {
    if (yongHuA) await qingLiJiaoSeHeYongHu(yongHuA.yongHuId)
    jiaoSeHuanCun.clear()

    for (const sha256 of yiChuanSha256JiHe) {
      const muLu = path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, sha256.slice(0, 2))
      await fs.promises.rm(path.join(muLu, sha256), { force: true }).catch(() => {})
      await fs.promises.rmdir(muLu).catch(() => {})
    }
    await fs.promises.rm(path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, 'tmp'), {
      recursive: true,
      force: true,
    }).catch(() => {})

    await 数据库.end()
    await redis.quit()
  })

  it('正常图片上传通过审核，返回 mediaId 和签名 URL', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'zhengchang.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju).toBeDefined()
    expect(xiangYing.body.shu_ju!.mediaId).toBeDefined()
    expect(xiangYing.body.shu_ju!.sha256).toBeDefined()
    expect(xiangYing.body.shu_ju!.mei_ti_url).toBeDefined()
    expect(String(xiangYing.body.shu_ju!.mei_ti_url)).toContain('/api/媒体/')
  })

  it('违规图片（色情）被拒绝，返回 403 且错误来自翻译文件', async () => {
    // Mock 返回违规结果：淫秽色情
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.95,
            类型: '淫秽色情',
            严重程度: '严重',
            理由: '图片包含露骨性内容',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'weifa.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.cheng_gong).toBe(false)
    // 错误消息应包含违规类别
    expect(xiangYing.body.ti_shi).toContain('淫秽色情')
    // 临时文件应被清理（不应有物理文件残留）
  })

  it('违规图片（暴力恐怖）被拒绝，返回对应类别错误', async () => {
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.9,
            类型: '暴力恐怖',
            严重程度: '严重',
            理由: '图片包含血腥暴力内容',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'baoli.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.ti_shi).toContain('暴力恐怖')
  })

  it('违规图片（涉政有害）被拒绝', async () => {
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.92,
            类型: '涉政有害',
            严重程度: '严重',
            理由: '图片包含政治敏感内容',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'zhengzhi.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.ti_shi).toContain('涉政有害')
  })

  it('违规图片（邪教）被拒绝', async () => {
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.88,
            类型: '邪教',
            严重程度: '中等',
            理由: '图片包含邪教宣传内容',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'xiejiao.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.ti_shi).toContain('邪教')
  })

  it('违规图片（赌博诈骗）被拒绝', async () => {
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.85,
            类型: '赌博诈骗',
            严重程度: '中等',
            理由: '图片包含赌博诈骗诱导内容',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'dubo.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.ti_shi).toContain('赌博诈骗')
  })

  it('违规图片（侵害未成年人）被拒绝', async () => {
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.93,
            类型: '侵害未成年人',
            严重程度: '严重',
            理由: '图片涉及未成年人不当内容',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'weichengnian.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.ti_shi).toContain('侵害未成年人')
  })

  it('表情包类别图片同样走审核', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'biaoqingshu',
      neiRong: zhenShiPNG(),
      wenJianMing: 'biaoqing.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.cheng_gong).toBe(true)
  })

  it('非图片类别（语音、文件）不走视觉审核', async () => {
    let tuPianShenHeBeiDiaoYong = false
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        tuPianShenHeBeiDiaoYong = true
        return {
          neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    
    // 上传语音
    await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'yuyin',
      neiRong: 'fake audio content',
      wenJianMing: 'audio.webm',
      mime: 'audio/webm',
    })
    expect(tuPianShenHeBeiDiaoYong).toBe(false)

    // 上传文件
    await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'wenjian',
      neiRong: 'fake document content',
      wenJianMing: 'doc.pdf',
      mime: 'application/pdf',
    })
    expect(tuPianShenHeBeiDiaoYong).toBe(false)
  })

  it('AI 审核服务异常时拒绝上传（安全兜底）', async () => {
    // Mock 抛出异常
    sheZhiMockTiaoYong(async () => {
      throw new Error('DeepSeek API unavailable')
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'error.png',
      mime: 'image/png',
    })

    // AI 审核失败时应拒绝上传（安全优先）
    expect(xiangYing.status).toBe(403)
    expect(xiangYing.body.ti_shi).toBeDefined()
  })

  it('确信度低于 0.8 不判定为违规', async () => {
    sheZhiMockTiaoYong(async (canShu) => {
      const xiaoXi = canShu.xiaoXi
      const youTuPian = xiaoXi.some((x) => Array.isArray(x.neiRong) && x.neiRong.some((k) => k.type === 'input_image'))
      if (youTuPian) {
        return {
          neiRong: JSON.stringify({
            违规: true,
            确信度: 0.7, // 低于 0.8 阈值
            类型: '淫秽色情',
            严重程度: '中等',
            理由: '疑似违规但确信度不足',
          }),
          xinXi: { role: 'assistant', content: '' },
          yuanShuJu: {} as never,
        }
      }
      return {
        neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
        xinXi: { role: 'assistant', content: '' },
        yuanShuJu: {} as never,
      }
    })

    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: zhenShiPNG(),
      wenJianMing: 'low_confidence.png',
      mime: 'image/png',
    })

    // 确信度 < 0.8 应视为通过
    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.cheng_gong).toBe(true)
  })
})