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
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'

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

function jiSuanQianMing(sha256: string, e: number): string {
  return crypto.createHmac('sha256', peiZhi.jwtMiYao).update(`${sha256}:${e}`).digest('hex')
}

describe('FP-20 媒体存储与多媒体消息', () => {
  let yongHuA: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null
  let yongHuB: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null

  beforeAll(async () => {
    yongHuA = await chuangJianCeShiYongHu()
    yongHuB = await chuangJianCeShiYongHu()
  })

  beforeEach(() => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))
    chongZhiDeepSeekKeHuDuan()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
  })

  afterEach(() => {
    sheZhiKaiChangBaiMock(null)
    sheZhiMockTiaoYong(null)
  })

  afterAll(async () => {
    if (yongHuA) await qingLiJiaoSeHeYongHu(yongHuA.yongHuId)
    if (yongHuB) await qingLiJiaoSeHeYongHu(yongHuB.yongHuId)
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

  it('CAS去重：同一内容两次上传，媒体文件表仅1条且磁盘单文件', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const diYiCi = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: 'quanchongneirong-dup-test',
      wenJianMing: 'chongfu.png',
      mime: 'image/png',
    })
    const diErCi = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: 'quanchongneirong-dup-test',
      wenJianMing: 'chongfu2.png',
      mime: 'image/png',
    })

    expect(diYiCi.status).toBe(200)
    expect(diErCi.status).toBe(200)
    expect(diYiCi.body.shu_ju!.mediaId).toBe(diErCi.body.shu_ju!.mediaId)
    const sha256 = String(diYiCi.body.shu_ju!.sha256)

    const chaXun = await 数据库.query(
      `SELECT COUNT(*)::int AS tiao_shu FROM "媒体文件" WHERE "SHA256" = $1`,
      [sha256],
    )
    expect(chaXun.rows[0].tiao_shu).toBe(1)

    const luJing = path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, sha256.slice(0, 2), sha256)
    expect(fs.existsSync(luJing)).toBe(true)
  })

  it('SHA256正确性：上传固定内容得到已知哈希', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: 'abc',
      wenJianMing: 'abc.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju!.sha256).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('上传21MB假图返回400且错误来自翻译文件', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const daHuanChong = Buffer.alloc(21 * 1024 * 1024, 1)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: daHuanChong,
      wenJianMing: 'chaoda.png',
      mime: 'image/jpeg',
    })

    expect(xiangYing.status).toBe(400)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiGuoDa'))
  })

  it('上传exe类MIME返回400', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: 'MZfakeexecutable',
      wenJianMing: 'bingdu.exe',
      mime: 'application/x-msdownload',
    })

    expect(xiangYing.status).toBe(400)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiMIMEBuZhiChi'))
  })

  it('非法类别返回400', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      lingPai: yongHuA!.lingPai,
      jiaoSeId,
      leiBie: 'weifaleibie',
      neiRong: 'neirong',
      wenJianMing: 'a.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(400)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiLeiXingFeiFa'))
  })

  describe('签名URL下载', () => {
    let sha256 = ''
    let luJingQianZhui = ''

    beforeAll(async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
      const xiangYing = await shangChuanMeiTi({
        lingPai: yongHuA!.lingPai,
        jiaoSeId,
        leiBie: 'tupian',
        neiRong: Buffer.alloc(1024, 7),
        wenJianMing: 'qianming.png',
        mime: 'image/png',
      })
      sha256 = String(xiangYing.body.shu_ju!.sha256)
      luJingQianZhui = `/api/媒体/${sha256}`
    })

    it('合法签名返回200且ETag等于sha256且Cache-Control含immutable', async () => {
      const guoQiMiao = Math.floor(Date.now() / 1000) + 600
      const xiangYing = await request(yingYong)
        .get(luJingQianZhui)
        .query({ e: guoQiMiao, s: jiSuanQianMing(sha256, guoQiMiao) })

      expect(xiangYing.status).toBe(200)
      expect(xiangYing.headers.etag).toBe(`"${sha256}"`)
      expect(String(xiangYing.headers['cache-control'])).toContain('immutable')
      expect(Buffer.byteLength(xiangYing.body)).toBe(1024)
    })

    it('无签名返回403', async () => {
      const xiangYing = await request(yingYong).get(luJingQianZhui)
      expect(xiangYing.status).toBe(403)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'qianMingWuXiao'))
    })

    it('篡改签名返回403', async () => {
      const guoQiMiao = Math.floor(Date.now() / 1000) + 600
      const xiangYing = await request(yingYong)
        .get(luJingQianZhui)
        .query({ e: guoQiMiao, s: `${jiSuanQianMing(sha256, guoQiMiao).slice(0, -4)}beef` })

      expect(xiangYing.status).toBe(403)
    })

    it('过期时间戳返回403', async () => {
      const guoQiMiao = Math.floor(Date.now() / 1000) - 100
      const xiangYing = await request(yingYong)
        .get(luJingQianZhui)
        .query({ e: guoQiMiao, s: jiSuanQianMing(sha256, guoQiMiao) })

      expect(xiangYing.status).toBe(403)
    })

    it('非hex的sha256返回403（含路径遍历尝试）', async () => {
      const guoQiMiao = Math.floor(Date.now() / 1000) + 600
      const weiFaHaXi = 'z'.repeat(64)
      const xiangYing = await request(yingYong)
        .get(`/api/媒体/${weiFaHaXi}`)
        .query({ e: guoQiMiao, s: jiSuanQianMing(weiFaHaXi, guoQiMiao) })
      expect(xiangYing.status).toBe(403)

      const bianLiLuJing = encodeURIComponent('../../etc/passwd')
      const bianLiXiangYing = await request(yingYong)
        .get(`/api/媒体/${bianLiLuJing}`)
        .query({ e: guoQiMiao, s: 'renyiqianming' })
      expect(bianLiXiangYing.status).toBe(403)
    })

    it('Range请求返回206且Content-Range存在', async () => {
      const guoQiMiao = Math.floor(Date.now() / 1000) + 600
      const xiangYing = await request(yingYong)
        .get(luJingQianZhui)
        .query({ e: guoQiMiao, s: jiSuanQianMing(sha256, guoQiMiao) })
        .set('Range', 'bytes=0-99')

      expect(xiangYing.status).toBe(206)
      expect(String(xiangYing.headers['content-range'])).toContain('bytes 0-99/')
      expect(Buffer.byteLength(xiangYing.body)).toBe(100)
    })
  })

  describe('多媒体消息发送', () => {
    it('发送tuPian消息后库中记录类型与媒体ID，列表API返回mei_ti_id', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
      const shangChuan = await shangChuanMeiTi({
        lingPai: yongHuA!.lingPai,
        jiaoSeId,
        leiBie: 'tupian',
        neiRong: 'xiaoxitupiannairong',
        wenJianMing: 'xiaoxi.png',
        mime: 'image/png',
      })
      const mediaId = String(shangChuan.body.shu_ju!.mediaId)

      const faSongXiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${yongHuA!.lingPai}`)
        .send({ leiXing: 'tuPian', meiTiId: mediaId })
        .expect(200)

      expect(faSongXiangYing.body.cheng_gong).toBe(true)
      const xiaoXiId = String(faSongXiangYing.body.shu_ju.id)

      const kuChaXun = await 数据库.query(
        `SELECT "类型", "媒体ID", "内容" FROM "消息" WHERE "ID" = $1`,
        [xiaoXiId],
      )
      expect(kuChaXun.rows[0].类型).toBe('tuPian')
      expect(String(kuChaXun.rows[0].媒体ID)).toBe(mediaId)
      expect(String(kuChaXun.rows[0].内容)).toBe('')

      const lieBiaoXiangYing = await request(yingYong)
        .get(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${yongHuA!.lingPai}`)
        .expect(200)

      const muBiao = lieBiaoXiangYing.body.shu_ju.lie_biao.find(
        (xiaoXi: { id: string }) => xiaoXi.id === xiaoXiId,
      )
      expect(muBiao).toBeTruthy()
      expect(muBiao.lei_xing).toBe('tuPian')
      expect(muBiao.mei_ti_id).toBe(mediaId)
    })

    it('用他人meiTiId发送返回400', async () => {
      const jiaoSeIdA = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
      const jiaoSeIdB = await chuangJianCeShiJiaoSe(yongHuB!.lingPai)

      const shangChuanB = await shangChuanMeiTi({
        lingPai: yongHuB!.lingPai,
        jiaoSeId: jiaoSeIdB,
        leiBie: 'tupian',
        neiRong: 'bderenshuju',
        wenJianMing: 'b.png',
        mime: 'image/png',
      })
      const taRenMediaId = String(shangChuanB.body.shu_ju!.mediaId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeIdA}/消息`)
        .set('Authorization', `Bearer ${yongHuA!.lingPai}`)
        .send({ leiXing: 'tuPian', meiTiId: taRenMediaId })

      expect(xiangYing.status).toBe(400)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiWuQuanXian'))
    })

    it('不存在的meiTiId发送返回400', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
      const xuWeiUUID = '00000000-0000-4000-8000-000000000000'

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${yongHuA!.lingPai}`)
        .send({ leiXing: 'tuPian', meiTiId: xuWeiUUID })

      expect(xiangYing.status).toBe(400)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    })

    it('非wenben缺少meiTiId返回400', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${yongHuA!.lingPai}`)
        .send({ leiXing: 'yuYin' })

      expect(xiangYing.status).toBe(400)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'))
    })
  })

  it('未登录上传返回401', async () => {
    const jiaoSeId = await chuangJianCeShiJiaoSe(yongHuA!.lingPai)
    const xiangYing = await shangChuanMeiTi({
      jiaoSeId,
      leiBie: 'tupian',
      neiRong: 'weidengluneirong',
      wenJianMing: 'a.png',
      mime: 'image/png',
    })

    expect(xiangYing.status).toBe(401)
  })
})
