import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { MEI_TI_PEI_ZHI } from '../config/媒体配置'
import { huoQuDuoMoTaiPeiZhi, huoQuDuoMoTaiQianDuanShiTu, chongZaiDuoMoTaiHuanJing } from '../config/多模态配置'
import { gouJianYuYinKeDuWenBen, rongHeYuYinXiaoXiNeiRong, sheZhiYuYinLiJieMock, huoQuYinPinShiJianMiaoShu, tiQuYinPinShiJian } from '../services/语音理解'
import { yanZhengShengTuTiShiCi, shengChengTuXiang, sheZhiShengTuMock } from '../services/图像生成'
import { shiShiPinMIME, shiShiPinWenJian, gouJianShiPinKeDuWenBen, yanZhengShiPinTiShiCi, shengChengShiPin, sheZhiShengShiPinMock } from '../services/视频多模态'
import { meiTiZhanShiWenBen, shiShiPinNeiRong, gouJianYongHuTuXiangKuai } from '../services/AI视觉辅助'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'
import { fanYi } from '../config/translations'
import { peiZhi } from '../config'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao })
  const zhuCe = await request(yingYong).post('/api/认证/注册').send({
    shouJiHao,
    yanZhengMa: '123456',
    yongHuMing: `FP10_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    miMa: 'testPassword123',
    tongYiXieYi: true,
    chuShengRiQi: '2000-01-01',
  })
  const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  return { shouJiHao, lingPai: zhuCe.body.shu_ju.令牌, yongHuId: String(yongHu.rows[0].ID) }
}

async function huoQuCeShiJiaoSeId(lingPai: string): Promise<string> {
  const shengCheng = await request(yingYong).post('/api/生成角色/MBTI生成').set('Authorization', `Bearer ${lingPai}`).send({ 性别: 'nv', mbti类型: 'INFP' })
  const queRen = await request(yingYong).post('/api/生成角色/确认').set('Authorization', `Bearer ${lingPai}`).send({ xuanZhongJiaoSe: shengCheng.body.shu_ju })
  return String(queRen.body.shu_ju.id)
}

function gouJianCeShiPng(): Buffer {
  const b = Buffer.alloc(64)
  b.writeUInt32BE(0x89504e47, 0)
  b.writeUInt32BE(0x0d0a1a0a, 4)
  b.writeUInt32BE(13, 8)
  b.write('IHDR', 12, 'ascii')
  b.writeUInt32BE(16, 16)
  b.writeUInt32BE(16, 20)
  b[24] = 8
  b[25] = 6
  return Buffer.concat([b, Buffer.from(`fp10-${Date.now()}`)])
}

describe('FP-10 多模态C混合省钱', () => {
  const yuanEnv = { ...process.env }

  beforeEach(() => {
    sheZhiYuYinLiJieMock(null)
    sheZhiShengTuMock(null)
    sheZhiShengShiPinMock(null)
  })

  afterEach(() => {
    process.env = { ...yuanEnv }
    sheZhiYuYinLiJieMock(null)
    sheZhiShengTuMock(null)
    sheZhiShengShiPinMock(null)
    sheZhiMockTiaoYong(null)
    chongZhiDeepSeekKeHuDuan()
  })

  afterAll(async () => {
    try {
      await redis.quit()
    } catch {
      // redis 可能已被其他测试关闭
    }
    try {
      await 数据库.end()
    } catch {
      // 连接池可能已被关闭
    }
  })

  it('多模态配置走后端env可配置且热重载生效', () => {
    process.env.YU_YIN_LI_JIE_QI_YONG = 'true'
    process.env.MEI_RI_SHENG_CHENG_SHANG_XIAN = '7'
    const peiZhi = huoQuDuoMoTaiPeiZhi()
    expect(peiZhi.yuYinLiJieQiYong).toBe(true)
    expect(peiZhi.meiRiShengChengShangXian).toBe(7)
    process.env.YU_YIN_LI_JIE_QI_YONG = 'false'
    expect(huoQuDuoMoTaiPeiZhi().yuYinLiJieQiYong).toBe(false)
    expect(typeof chongZaiDuoMoTaiHuanJing).toBe('function')
  })

  it('前端视图脱敏不含任何密钥明文', () => {
    process.env.GUI_JI_LIU_DONG_API_MI_YAO = 'mi-yao-ming-wen'
    process.env.TU_XIANG_SHENG_CHENG_API_MI_YAO = 'mi-yao-ming-wen'
    process.env.SHI_PIN_SHENG_CHENG_API_MI_YAO = 'mi-yao-ming-wen'
    const shiTu = huoQuDuoMoTaiQianDuanShiTu()
    const wenBen = JSON.stringify(shiTu)
    expect(wenBen).not.toContain('mi-yao-ming-wen')
    expect(wenBen).not.toContain('MI_YAO')
    expect(typeof shiTu.yuYinLiJieQiYong).toBe('boolean')
    expect(typeof shiTu.tuXiangShengChengQiYong).toBe('boolean')
    expect(typeof shiTu.shiPinShengChengQiYong).toBe('boolean')
  })

  it('日志掩码默认含FP-10三供应商密钥字段', () => {
    expect(peiZhi.minGanZiDuan.ziDuanMing).toContain('GUI_JI_LIU_DONG_API_MI_YAO')
    expect(peiZhi.minGanZiDuan.ziDuanMing).toContain('TU_XIANG_SHENG_CHENG_API_MI_YAO')
    expect(peiZhi.minGanZiDuan.ziDuanMing).toContain('SHI_PIN_SHENG_CHENG_API_MI_YAO')
  })

  it('音频事件标签零成本提取（音乐/动物鸣叫/歌曲段落）', () => {
    expect(tiQuYinPinShiJian('我为你唱一首歌<music>前奏</music>汪汪')).toContain('音乐')
    expect(tiQuYinPinShiJian('我为你唱一首歌<music>前奏</music>汪汪')).toContain('狗叫')
    expect(tiQuYinPinShiJian('我为你唱一首歌<music>前奏</music>汪汪')).toContain('前奏')
    expect(tiQuYinPinShiJian('今天天气不错')).toBeNull()
    expect(tiQuYinPinShiJian('')).toBeNull()
    expect(tiQuYinPinShiJian('主歌部分很好听，猫叫了一声')).toContain('猫叫')
  })

  it('语音理解混合内容转DeepSeek可读文字', () => {
    expect(gouJianYuYinKeDuWenBen({ zhuanXieWenBen: '我想你了', yinPinShiJianMiaoShu: '背景有狗叫和歌声', shiChangHaoMiao: 12000 })).toBe('[语音转写：我想你了][音频事件：背景有狗叫和歌声](12秒)')
    expect(gouJianYuYinKeDuWenBen({ zhuanXieWenBen: '早点回家', shiChangHaoMiao: 5000 })).toBe('[语音转写：早点回家](5秒)')
    expect(gouJianYuYinKeDuWenBen({ shiChangHaoMiao: 3000 })).toBe('[语音](3秒)')
    expect(gouJianYuYinKeDuWenBen({})).toBe('[语音]')
    expect(rongHeYuYinXiaoXiNeiRong('混合文字歌声汪汪', '[语音(8秒)]', { shiChangHaoMiao: 8000 })).toBe('[语音转写：混合文字歌声汪汪](8秒)')
    expect(rongHeYuYinXiaoXiNeiRong('', '[语音(8秒)]')).toBe('[语音(8秒)]')
  })

  it('语音理解供应商未配置优雅降级为null', async () => {
    process.env.YU_YIN_LI_JIE_QI_YONG = 'false'
    process.env.GUI_JI_LIU_DONG_API_MI_YAO = ''
    const jieGuo = await huoQuYinPinShiJianMiaoShu({ sha256: 'a'.repeat(64), mime: 'audio/webm' })
    expect(jieGuo).toBeNull()
    expect(await huoQuYinPinShiJianMiaoShu({ sha256: '非法哈希', mime: 'audio/webm' })).toBeNull()
  })

  it('语音理解mock可注入音频事件描述', async () => {
    sheZhiYuYinLiJieMock(async () => '狗叫三声加背景音乐')
    const jieGuo = await huoQuYinPinShiJianMiaoShu({ sha256: 'b'.repeat(64), mime: 'audio/webm' })
    expect(jieGuo).toBe('狗叫三声加背景音乐')
    expect(gouJianYuYinKeDuWenBen({ zhuanXieWenBen: '文字部分', yinPinShiJianMiaoShu: jieGuo, shiChangHaoMiao: 9000 })).toContain('狗叫三声加背景音乐')
  })

  it('图片生图校验与未开启降级走翻译', async () => {
    expect(yanZhengShengTuTiShiCi('  ').heFa).toBe(false)
    expect(yanZhengShengTuTiShiCi('夕阳下的海边拥抱').heFa).toBe(true)
    process.env.TU_XIANG_SHENG_CHENG_QI_YONG = 'false'
    process.env.TU_XIANG_SHENG_CHENG_API_MI_YAO = ''
    const jieGuo = await shengChengTuXiang({ tiShiCi: '夕阳', yongHuId: 'u1' })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.ti_shi).toBe(fanYi.liaoTian.duoMoTaiFuWuBuKeYong)
  })

  it('图片生图mock成功返回字节', async () => {
    sheZhiShengTuMock(async () => ({ cheng_gong: true, tuPianZiJie: gouJianCeShiPng(), mime: 'image/png' }))
    const jieGuo = await shengChengTuXiang({ tiShiCi: '海边', yongHuId: 'u1' })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.tuPianZiJie?.length).toBeGreaterThan(30)
  })

  it('视频看懂画面声音文本化与撤回一致', () => {
    expect(shiShiPinMIME('video/mp4')).toBe(true)
    expect(shiShiPinMIME('video/quicktime')).toBe(true)
    expect(shiShiPinMIME('image/png')).toBe(false)
    expect(shiShiPinWenJian('video/mp4', 'a.mp4')).toBe(true)
    expect(shiShiPinWenJian(null, 'lvxing.MP4')).toBe(true)
    expect(shiShiPinWenJian(null, 'wenjian.pdf')).toBe(false)
    expect(shiShiPinNeiRong('video/mp4', 'a.mp4')).toBe(true)
    expect(gouJianShiPinKeDuWenBen({ wenJianMing: 'lvxing.mp4', mime: 'video/mp4', shiChangHaoMiao: 15000, zhuanXieWenBen: '海边风声', huaMianMiaoShu: '日落沙滩' })).toBe('[视频：lvxing.mp4，15秒][画面：日落沙滩][声音转写：海边风声]')
    expect(gouJianShiPinKeDuWenBen({ wenJianMing: 'a.mp4', yiCheHui: true })).toBe('[用户撤回了一个视频]')
    expect(meiTiZhanShiWenBen('wenjian', { yuanShiWenJianMing: 'a.mp4', mime: 'video/mp4', shiChangHaoMiao: 8000 })).toBe('[视频(8秒)]')
    expect(meiTiZhanShiWenBen('wenjian', { yuanShiWenJianMing: 'a.pdf' })).toBe('[文件:a.pdf]')
    expect(yanZhengShiPinTiShiCi('海边散步').heFa).toBe(true)
    expect(yanZhengShiPinTiShiCi('  ').heFa).toBe(false)
  })

  it('FP-05 YH-048 图像注入8张low：超限只保留最近8张且detail全low', async () => {
    const { AI_PEI_ZHI } = await import('../config/AI配置')
    expect(AI_PEI_ZHI.prompt.liShiTuXiangZuiDuoZhuRuShu).toBe(8)
    const liShi = Array.from({ length: 10 }, (_, i) => ({
      fa_song_zhe_lei_xing: 'yonghu' as const,
      fa_song_zhe_ming: '对方',
      nei_rong: '',
      shi_jian: '14:30',
      meiTiLeiBie: 'tupian',
      meiTiSha256: '0'.repeat(63) + String(i),
      meiTiMIME: 'image/png',
    }))
    const kuai = await gouJianYongHuTuXiangKuai(liShi)
    expect(kuai.filter((k) => k.type === 'input_image').every((k) => k.type !== 'input_image' || k.detail === 'low')).toBe(true)
    expect(kuai.filter((k) => k.type === 'input_image').length).toBeLessThanOrEqual(8)
  })

  it('视频生成未开启降级走翻译且mock可成功', async () => {
    process.env.SHI_PIN_SHENG_CHENG_QI_YONG = 'false'
    process.env.SHI_PIN_SHENG_CHENG_API_MI_YAO = ''
    const shiBai = await shengChengShiPin({ tiShiCi: '海边', yongHuId: 'u1' })
    expect(shiBai.cheng_gong).toBe(false)
    expect(shiBai.ti_shi).toBe(fanYi.liaoTian.duoMoTaiFuWuBuKeYong)
    sheZhiShengShiPinMock(async () => ({ cheng_gong: true, shiPinZiJie: Buffer.from('shipin'), mime: 'video/mp4' }))
    const jieGuo = await shengChengShiPin({ tiShiCi: '海边', yongHuId: 'u1' })
    expect(jieGuo.cheng_gong).toBe(true)
  })

  it('多模态接口未登录返回401', async () => {
    await request(yingYong).get('/api/聊天/多模态配置').expect(401)
    await request(yingYong).post('/api/聊天/会话/00000000-0000-0000-0000-000000000000/语音理解').send({}).expect(401)
    await request(yingYong).post('/api/聊天/会话/00000000-0000-0000-0000-000000000000/生图').send({ tiShiCi: '海' }).expect(401)
    await request(yingYong).post('/api/聊天/会话/00000000-0000-0000-0000-000000000000/生成视频').send({ tiShiCi: '海' }).expect(401)
  })

  it('语音理解接口登录后返回DeepSeek可读文字', async () => {
    const yongHu = await chuangJianCeShiYongHu()
    try {
      const jiaoSeId = await huoQuCeShiJiaoSeId(yongHu.lingPai)
      const xiangYing = await request(yingYong).post(`/api/聊天/会话/${jiaoSeId}/语音理解`).set('Authorization', `Bearer ${yongHu.lingPai}`).send({ zhuanXieWenBen: '文字加歌声汪汪', yinPinShiJianMiaoShu: '狗叫', shiChangHaoMiao: 10000 }).expect(200)
      expect(String(xiangYing.body.shu_ju.keDuWenBen)).toContain('文字加歌声汪汪')
      expect(String(xiangYing.body.shu_ju.keDuWenBen)).toContain('狗叫')
    } finally {
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHu.yongHuId])
    }
  })

  it('语音转写随语音消息入库不再被丢弃', async () => {
    const yongHu = await chuangJianCeShiYongHu()
    const yiChuan: string[] = []
    try {
      const jiaoSeId = await huoQuCeShiJiaoSeId(yongHu.lingPai)
      const { sheZhiMockTiaoYong } = await import('../utils/DeepSeek客户端')
      // 上传与发送全程保持mock：安全审核走mock判无违规，禁VITEST禁外呼兜底误拦截正常文本
      sheZhiMockTiaoYong(async () => ({ neiRong: JSON.stringify({ 违规: false, 确信度: 0.1 }), xinXi: { role: 'assistant', content: '' }, yuanShuJu: {} as never }))
      const shangChuan = await request(yingYong).post(`/api/聊天/会话/${jiaoSeId}/媒体`).query({ leiBie: 'yuyin' }).set('Authorization', `Bearer ${yongHu.lingPai}`).attach('file', Buffer.from('yuyin-neirong'), { filename: 'yuyin.wav', contentType: 'audio/wav' })
      yiChuan.push(String(shangChuan.body.shu_ju.sha256))
      const faSong = await request(yingYong).post(`/api/聊天/会话/${jiaoSeId}/消息`).set('Authorization', `Bearer ${yongHu.lingPai}`).send({ leiXing: 'yuYin', meiTiId: String(shangChuan.body.shu_ju.mediaId), neiRong: '混合文字歌声汪汪' }).expect(200)
      expect(String(faSong.body.shu_ju.nei_rong)).toContain('混合文字歌声汪汪')
    } finally {
      const { sheZhiMockTiaoYong } = await import('../utils/DeepSeek客户端')
      sheZhiMockTiaoYong(null)
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHu.yongHuId])
      for (const sha of yiChuan) {
        await fs.promises.rm(path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, sha.slice(0, 2), sha), { force: true }).catch(() => {})
      }
    }
  })

  it('生图接口mock成功落库为角色图片消息', async () => {
    // YH-036 用户手动按钮已删：生图/视频走AI主动偶发，用户手动触发一律403由AI代发；此处断言契约而非旧落库链路
    const yongHu = await chuangJianCeShiYongHu()
    try {
      const jiaoSeId = await huoQuCeShiJiaoSeId(yongHu.lingPai)
      const xiangYing = await request(yingYong).post(`/api/聊天/会话/${jiaoSeId}/生图`).set('Authorization', `Bearer ${yongHu.lingPai}`).send({ tiShiCi: '夕阳海边' }).expect(403)
      expect(String(xiangYing.body.ti_shi)).toBe('图片与视频由AI对象在合适时主动发起，无需手动触发')
    } finally {
      sheZhiShengTuMock(null)
      sheZhiMockTiaoYong(null)
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHu.yongHuId])
      await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHu.yongHuId])
    }
  })
})
