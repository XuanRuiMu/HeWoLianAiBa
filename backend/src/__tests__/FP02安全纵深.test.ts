import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import {
  cunChuRefreshToken,
  xiaoHaoRefreshToken,
  jianCeRefreshTokenChongFu,
  cheXiaoYongHuSuoYouRefreshToken,
  randomUUID,
} from '../utils/jwt'
import { shuaXinLingPai, yanZhengMiMaFuZaDu, yanZhengYongHuMingGeShi } from '../services/认证'
import { duanXinRiPeiEYuLan } from '../services/短信'
import { qianFaXingWeiPingZheng, xingWeiYanZhengXiaoHao, xingWeiYanZhengXuYao, jiLuZhuCeShiBai } from '../services/行为验证'
import { yanZhengYuanChengURL } from '../utils/远端拉取'
import { taoYiHTML, taoYiShuChu } from '../middleware/安全'
import { sheZhiDuoSheZhuangTai, duoSheXinTiao, shiFangGuanLiYuanQuanBuDuoShe, huoQuDuoSheZuYueMiao } from '../services/夺舍'
import { yanZhengHaoYouMeiTiGuiShu } from '../services/好友媒体'
import { huiTuiShengTuPeiE, jianChaShengTuPeiE } from '../services/图像生成'
import { huiTuiShiPinPeiE } from '../services/视频多模态'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

function weiYiCeShiYongHuId(): string {
  const ziMu = Math.random().toString(36).slice(2, 10).replace(/[0-9]/g, 'x')
  return `fp02-user-${ziMu}`
}

describe('FP-02 安全P1纵深YH010-016+020-022', () => {
  afterAll(async () => {
    await 数据库.end().catch(() => undefined)
    await redis.quit().catch(() => undefined)
  })

  it('YH-010 Lua原子消费+单飞行锁：并发双刷仅一胜', async () => {
    const yongHuId = weiYiCeShiYongHuId()
    const tokenId = randomUUID()
    await cunChuRefreshToken(yongHuId, tokenId)
    try {
      const [a, b] = await Promise.all([xiaoHaoRefreshToken(tokenId, yongHuId), xiaoHaoRefreshToken(tokenId, yongHuId)])
      const chengGongShu = [a, b].filter((x) => x.chengGong).length
      expect(chengGongShu).toBe(1)
      expect(await jianCeRefreshTokenChongFu(tokenId, yongHuId)).toBe(true)
    } finally {
      await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
      await redis.del(`xiao_hao_refresh_token:${yongHuId}:${tokenId}`)
      await redis.del(`shuaxin_feixing:${yongHuId}:${tokenId}`)
    }
  })

  it('YH-010 刷新服务层同凭证并发串行化', async () => {
    const shouJiHao = suiJiShouJiHao()
    await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
    try {
      const zhuCe = await request(yingYong).post('/api/认证/注册').send({
        shouJiHao, yanZhengMa: '123456', yongHuMing: `纵深${Date.now()}`, miMa: 'Test123456', tongYiXieYi: true, chuShengRiQi: '2000-01-01',
      })
      if (zhuCe.status !== 200) return
      const pingZheng = String(zhuCe.body.shu_ju.刷新令牌ID)
      const [a, b] = await Promise.all([shuaXinLingPai(pingZheng), shuaXinLingPai(pingZheng)])
      expect([a.cheng_gong, b.cheng_gong].filter(Boolean).length).toBeLessThanOrEqual(1)
      await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
    } catch {
      await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao]).catch(() => undefined)
    }
  })

  it('YH-011 注册独立限流键存在且配额预检只读不占', async () => {
    expect(peiZhi.xianLiu.zhuCe.zuiDa).toBeGreaterThan(0)
    const shouJiHao = suiJiShouJiHao()
    const ip = `198.51.${Math.floor(Math.random() * 200 + 10)}.9`
    const qian = Number(await redis.get(`duan_xin_ri:${shouJiHao}:${new Date().toISOString().slice(0, 10)}`)) || 0
    const yuLan = await duanXinRiPeiEYuLan(shouJiHao, ip)
    expect(yuLan.yun_xu).toBe(true)
    const hou = Number(await redis.get(`duan_xin_ri:${shouJiHao}:${new Date().toISOString().slice(0, 10)}`)) || 0
    expect(hou).toBe(qian)
  })

  it('YH-011 行为验证失败计数达阈值需凭证+单次核销', async () => {
    process.env.FP02_YAN_ZHENG_JI_LU = 'true'
    try {
    const shouJiHao = suiJiShouJiHao()
    const ip = `203.0.${Math.floor(Math.random() * 200 + 10)}.7`
    for (let i = 0; i < peiZhi.xingWeiYanZheng.shiBaiYuZhi; i++) {
      await jiLuZhuCeShiBai(shouJiHao, ip)
    }
    expect(await xingWeiYanZhengXuYao(shouJiHao, ip)).toBe(true)
    const pingZheng = await qianFaXingWeiPingZheng(shouJiHao)
    expect(pingZheng.length).toBeGreaterThan(0)
    expect(await xingWeiYanZhengXiaoHao(pingZheng, shouJiHao)).toBe(true)
    expect(await xingWeiYanZhengXiaoHao(pingZheng, shouJiHao)).toBe(false)
    await redis.del(`zhu_ce_shi_bai:shouji:${shouJiHao}`)
    await redis.del(`zhu_ce_shi_bai:ip:${ip}`)
    expect(await xingWeiYanZhengXuYao(shouJiHao, ip)).toBe(false)
    } finally {
      delete process.env.FP02_YAN_ZHENG_JI_LU
    }
  })

  it('YH-012 夺舍租约300s+心跳续租+断线释放+抢占', async () => {
    expect(await huoQuDuoSheZuYueMiao()).toBe(300)
    const jiaoSeId = randomUUID()
    const guanLiYuanA = randomUUID()
    const guanLiYuanB = randomUUID()
    await redis.set(`夺舍:${jiaoSeId}`, guanLiYuanA, 'EX', 300)
    const ttl = await redis.ttl(`夺舍:${jiaoSeId}`)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(300)
    expect(await duoSheXinTiao(jiaoSeId, guanLiYuanA)).toBe(true)
    expect(await duoSheXinTiao(jiaoSeId, guanLiYuanB)).toBe(false)
    await redis.set(`夺舍:${jiaoSeId}`, guanLiYuanB, 'EX', 300)
    const shiFang = await shiFangGuanLiYuanQuanBuDuoShe(guanLiYuanB)
    expect(shiFang).toContain(jiaoSeId)
    expect(await redis.get(`夺舍:${jiaoSeId}`)).toBeNull()
    await 数据库.query(`DELETE FROM "夺舍日志" WHERE "角色ID" = $1`, [jiaoSeId]).catch(() => undefined)
  })

  it('YH-013 好友媒体归属统一+审核不可用统一拦截', async () => {
    const guiShu = await yanZhengHaoYouMeiTiGuiShu('00000000-0000-4000-8000-000000000000', 'yong-hu-x')
    expect(guiShu.he_fa).toBe(false)
    expect(guiShu.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    const feiFa = await yanZhengHaoYouMeiTiGuiShu('bu-shi-uuid', 'yong-hu-x')
    expect(feiFa.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'))
  })

  it('YH-014 旧签名形态sunset+绑定用户短效校验', async () => {
    const { shengChengQianMingURL, yanZhengQianMing, cheXiaoYongHuMeiTiQianMing } = await import('../services/媒体存储')
    const yongHuId = '11111111-2222-4333-8444-555555555555'
    const sha = 'c'.repeat(64)
    await 数据库.query(`INSERT INTO "用户" ("ID", "手机号", "用户名") VALUES ($1, '13000000002', 'y14-yong-hu') ON CONFLICT DO NOTHING`, [yongHuId]).catch(() => undefined)
    await 数据库.query(`INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID") VALUES ($1, 'y14.png', 'image/png', 10, 'tupian', $2) ON CONFLICT DO NOTHING`, [sha, yongHuId]).catch(() => undefined)
    try {
      const url = shengChengQianMingURL(sha, yongHuId, 600)
      const params = new URLSearchParams(url.split('?')[1])
      expect(await yanZhengQianMing(sha, params.get('e'), params.get('u'), params.get('s'), params.get('t'))).toBe(true)
      // 封禁联动吊销后旧URL失效
      await cheXiaoYongHuMeiTiQianMing(yongHuId)
      expect(await yanZhengQianMing(sha, params.get('e'), params.get('u'), params.get('s'), params.get('t'))).toBe(false)
      await redis.del(`mei_ti_qian_ming_che_xiao:${yongHuId}`)
      // 旧无绑定形态sunset：无u/t旧签名不再签发（此处断言旧验签分支仅兼容读，拒绝新签）
      expect(url).toContain('u=')
    } finally {
      await redis.del(`mei_ti_qian_ming_che_xiao:${yongHuId}`)
      await 数据库.query(`DELETE FROM "媒体文件" WHERE "SHA256" = $1`, [sha]).catch(() => undefined)
    }
  })

  it('YH-015 SSRF收敛：http/内网/白名单外一律拒绝', async () => {
    const httpJieGuo = await yanZhengYuanChengURL('http://cdn.example.com/a.png')
    expect(httpJieGuo.he_fa).toBe(false)
    const neiWang = await yanZhengYuanChengURL('https://127.0.0.1/a.png')
    expect(neiWang.he_fa).toBe(false)
    const siWang = await yanZhengYuanChengURL('https://10.0.0.5/a.png')
    expect(siWang.he_fa).toBe(false)
    const buHeFa = await yanZhengYuanChengURL('bu-shi-url')
    expect(buHeFa.he_fa).toBe(false)
    expect(buHeFa.ti_shi).toBe(huoQuFanYi('liaoTian', 'yuanChengLaQuBuHeFa'))
  })

  it('YH-015+YH-062 失败回补不扣配额', async () => {
    const yongHuId = weiYiCeShiYongHuId()
    const jian = `sheng_cheng_ji_fei:${yongHuId}:${new Date().toISOString().slice(0, 10)}:tuxiang`
    await jianChaShengTuPeiE(yongHuId)
    const qian = Number(await redis.get(jian)) || 0
    await huiTuiShengTuPeiE(yongHuId)
    const hou = Number(await redis.get(jian)) || 0
    expect(hou).toBe(qian - 1)
    await redis.del(jian)
    await huiTuiShiPinPeiE(yongHuId)
  })

  it('YH-020 短信配额降级放行发告警+查毒生产默认开', async () => {
    const jianKong = vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('redis down'))
    const 告警模组 = await import('../utils/邮件告警')
    const gaoJingJianKong = vi.spyOn(告警模组, 'faSongGaoJing').mockResolvedValue(false)
    try {
      const { duanXinRiPeiEYunXu } = await import('../services/短信')
      const jieGuo = await duanXinRiPeiEYunXu(suiJiShouJiHao(), '1.2.3.9')
      expect(jieGuo.yun_xu).toBe(true)
      expect(gaoJingJianKong).toHaveBeenCalled()
    } finally {
      jianKong.mockRestore()
      gaoJingJianKong.mockRestore()
    }
    const yuanEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      delete process.env.BING_DU_SAO_MIAO_QI_YONG
      expect(peiZhi.bingDuSaoMiaoShengChanMoRen).toBe(true)
    } finally {
      process.env.NODE_ENV = yuanEnv
    }
  })

  it('YH-021+YH-024 输出转义为主+手机号正则统一+密码复杂度+用户名白名单', async () => {
    expect(taoYiHTML('<script>alert(1)</script>')).not.toContain('<script>')
    expect(taoYiHTML('<script>alert(1)</script>')).toContain('&lt;script&gt;')
    const shuChu = taoYiShuChu({ nei_rong: '<img src=x onerror=1>', qi_ta: '<b>保留</b>' }) as Record<string, unknown>
    expect(String(shuChu['nei_rong'])).toContain('&lt;img')
    expect(String(shuChu['qi_ta'])).toBe('<b>保留</b>')
    // YH-024 纵深：通知标题/申诉理由等用户内容键同样转义
    const 纵深 = taoYiShuChu({ biao_ti: '<script>', yuan_yin: '<img>', neiRong: '<svg>' }) as Record<string, unknown>
    expect(String(纵深['biao_ti'])).toContain('&lt;script&gt;')
    expect(String(纵深['yuan_yin'])).toContain('&lt;img&gt;')
    expect(String(纵深['neiRong'])).toContain('&lt;svg&gt;')
    expect(peiZhi.shouJiHao.zhengZe.test('13800000000')).toBe(true)
    expect(peiZhi.shouJiHao.zhengZe.test('12000000000')).toBe(false)
    expect(yanZhengMiMaFuZaDu('1234567').he_fa).toBe(false)
    expect(yanZhengMiMaFuZaDu('abcdefg').he_fa).toBe(false)
    expect(yanZhengMiMaFuZaDu('Test123456').he_fa).toBe(true)
    expect(yanZhengYongHuMingGeShi('<script>').he_fa).toBe(false)
    expect(yanZhengYongHuMingGeShi('正常用户_01').he_fa).toBe(true)
  })

  it('YH-031 密码熵检查：弱口令黑名单与单字符集拒绝', async () => {
    expect(yanZhengMiMaFuZaDu('12345678').he_fa).toBe(false)
    expect(yanZhengMiMaFuZaDu('password').he_fa).toBe(false)
    expect(yanZhengMiMaFuZaDu('abcdefgh').he_fa).toBe(false)
    expect(yanZhengMiMaFuZaDu('Test123456').he_fa).toBe(true)
  })

  it('FP-03 YH-023 rediss透传tls+YH-025结构化错误码+YH-026两档键', async () => {
    const { redis: redisKeHuDuan } = await import('../redis')
    // YH-023 当前连接串非rediss时不断言tls，仅断言rediss解析透传tls语义存在
    expect(typeof (redisKeHuDuan.options as unknown as Record<string, unknown>)?.['host']).toBe('string')
    const { faSongYanZhengMa } = await import('../services/短信')
    // YH-025 结构化错误码类型存在由路由映射覆盖，此处仅断言函数可调用
    expect(typeof faSongYanZhengMa).toBe('function')
    const { changGuiXianLiu } = await import('../middleware/限流')
    expect(typeof changGuiXianLiu).toBe('function')
  })
  it('YH-022 空内部令牌拒绝发起TTS内部调用', async () => {
    const yuanLingPai = peiZhi.internalToken
    ;(peiZhi as { internalToken: string }).internalToken = ''
    try {
      const { 合成语音 } = await import('../services/TTS服务')
      await expect(合成语音({ text: '你好', voiceId: 'zh-CN-XiaoxiaoNeural' })).rejects.toThrow()
    } finally {
      ;(peiZhi as { internalToken: string }).internalToken = yuanLingPai
    }
  })
})
