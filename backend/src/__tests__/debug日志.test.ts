import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import express from 'express'
import request from 'supertest'
import {
  debug日志,
  sheZhiZuiDiRiZhiJiBie,
  guanBiRiZhiLiu,
  jiLuAIJiLu,
  jiLuHaoGanDuBianHua,
  jiLuJunShiQiuZhu,
  jiLuYouXiJieJu,
  jiLuXiaoXiCaoZuo,
  chuangJianHTTPRiZhiZhongJianJian,
  withRequestId,
  xieRuRiZhi,
} from '../utils/debug日志'

const LOG_WEN_JIAN = path.resolve(process.cwd(), 'logs', 'debug.log')

function duQuRiZhiHang(): string[] {
  if (!fs.existsSync(LOG_WEN_JIAN)) return []
  return fs
    .readFileSync(LOG_WEN_JIAN, 'utf-8')
    .split('\n')
    .filter((hang) => hang.trim().length > 0)
}

async function qingLiRiZhi(): Promise<void> {
  await guanBiRiZhiLiu()
  if (fs.existsSync(LOG_WEN_JIAN)) {
    fs.unlinkSync(LOG_WEN_JIAN)
  }
}

function daJianCeShiYingYong(yongHuId?: string): express.Express {
  const yingYong = express()
  yingYong.use(express.json())
  yingYong.use(chuangJianHTTPRiZhiZhongJianJian())
  if (yongHuId) {
    yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
      ;(qingQiu as unknown as { yong_hu?: { yongHuId: string } }).yong_hu = { yongHuId }
      xiaYiBu()
    })
  }
  yingYong.get('/ce-shi', (_qingQiu, xiangYing) => {
    xiangYing.status(200).json({ cheng_gong: true })
  })
  return yingYong
}

describe('FP-T1 全量 debug 日志', () => {
  beforeEach(async () => {
    await qingLiRiZhi()
    sheZhiZuiDiRiZhiJiBie('debug')
  })

  afterEach(async () => {
    await qingLiRiZhi()
  })

  it('日志写入文件', async () => {
    debug日志.info('测试', '测试消息', { xiang_qing: { a: 1 } })
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(1)

    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.ji_bie).toBe('info')
    expect(tiaoMu.lei_xing).toBe('测试')
    expect(tiaoMu.xiao_xi).toBe('测试消息')
    expect(tiaoMu.xiang_qing.a).toBe(1)
    expect(typeof tiaoMu.shi_jian).toBe('string')
  })

  it('级别过滤', async () => {
    sheZhiZuiDiRiZhiJiBie('warn')
    debug日志.info('测试', 'info消息')
    debug日志.warn('测试', 'warn消息')
    debug日志.error('测试', 'error消息')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(2)
    const jiBieLieBiao = hang.map((hang) => JSON.parse(hang).ji_bie)
    expect(jiBieLieBiao).toContain('warn')
    expect(jiBieLieBiao).toContain('error')
    expect(jiBieLieBiao).not.toContain('info')
  })

  it('敏感字段过滤', async () => {
    debug日志.info('测试', '包含敏感信息', {
      xiang_qing: {
        miMa: 'secret123',
        yanZhengMa: '123456',
        token: 'abc.def.ghi',
        zhengChangZiDuan: 'ok',
      },
    })
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.xiang_qing.miMa).toBe('***')
    expect(tiaoMu.xiang_qing.yanZhengMa).toBe('***')
    expect(tiaoMu.xiang_qing.token).toBe('***')
    expect(tiaoMu.xiang_qing.zhengChangZiDuan).toBe('ok')
  })

  it('JWT token 字符串被识别并过滤', async () => {
    debug日志.info('测试', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.xiao_xi).toBe('***')
  })

  it('AI 调用日志', async () => {
    jiLuAIJiLu('director', 'deepseek-v4-pro', 1200, true)
    jiLuAIJiLu('writer', 'deepseek-v4-pro', 2500, false, '超时')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(2)
    const tiaoMu = hang.map((hang) => JSON.parse(hang))
    expect(tiaoMu[0].lei_xing).toBe('AI调用')
    expect(tiaoMu[0].xiang_qing.cheng_gong).toBe(true)
    expect(tiaoMu[1].xiang_qing.cheng_gong).toBe(false)
    expect(tiaoMu[1].xiang_qing.cuo_wu).toBe('超时')
  })

  it('好感度变更日志', async () => {
    jiLuHaoGanDuBianHua('user-1', 'role-1', { xin_ren_du_bian_hua: 1, qin_mi_du_bian_hua: 2 }, 520)
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.lei_xing).toBe('好感度变更')
    expect(tiaoMu.yong_hu_id).toBe('user-1')
    expect(tiaoMu.jiao_se_id).toBe('role-1')
    expect(tiaoMu.xiang_qing.xin_zong_fen).toBe(520)
  })

  it('军师指导日志', async () => {
    jiLuJunShiQiuZhu('user-1', 'role-1', true)
    jiLuJunShiQiuZhu('user-1', 'role-1', false, 'JUN_SHI_CHONG_FU')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(2)
    const tiaoMu = hang.map((hang) => JSON.parse(hang))
    expect(tiaoMu[0].xiang_qing.cheng_gong).toBe(true)
    expect(tiaoMu[1].xiang_qing.cheng_gong).toBe(false)
    expect(tiaoMu[1].xiang_qing.cuo_wu_ma).toBe('JUN_SHI_CHONG_FU')
  })

  it('游戏结局日志', async () => {
    jiLuYouXiJieJu('user-1', 'role-1', '胜利-爱情')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.lei_xing).toBe('游戏结局')
    expect(tiaoMu.xiang_qing.jie_guo_lei_xing).toBe('胜利-爱情')
  })

  it('消息操作日志', async () => {
    jiLuXiaoXiCaoZuo('用户消息发送', 'user-1', 'role-1', 'yonghu', { xiao_xi_id: 'msg-1' })
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.lei_xing).toBe('消息操作')
    expect(tiaoMu.xiang_qing.cao_zuo).toBe('用户消息发送')
    expect(tiaoMu.xiang_qing.fa_song_zhe_lei_xing).toBe('yonghu')
  })
})

describe('FP-T1R HTTP 日志用户 ID 修复', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('已认证请求在 response finish 后记录用户 ID', async () => {
    const yingYong = daJianCeShiYingYong('user-authed-001')
    const spy = vi.spyOn(debug日志, 'info')

    await request(yingYong).get('/ce-shi').expect(200)

    expect(spy).toHaveBeenCalledTimes(1)
    const xuanXiang = spy.mock.calls[0][2] as { yong_hu_id?: string; xiang_qing?: Record<string, unknown> }
    expect(xuanXiang?.yong_hu_id).toBe('user-authed-001')
    expect(xuanXiang?.xiang_qing?.lu_jing).toBe('/ce-shi')
  })

  it('未认证请求记录的用户 ID 为 undefined', async () => {
    const yingYong = daJianCeShiYingYong()
    const spy = vi.spyOn(debug日志, 'info')

    await request(yingYong).get('/ce-shi').expect(200)

    expect(spy).toHaveBeenCalledTimes(1)
    const xuanXiang = spy.mock.calls[0][2] as { yong_hu_id?: string }
    expect(xuanXiang?.yong_hu_id).toBeUndefined()
  })
})

describe('FP-01 pino 结构化日志', () => {
  beforeEach(async () => {
    await qingLiRiZhi()
    sheZhiZuiDiRiZhiJiBie('debug')
  })

  afterEach(async () => {
    await qingLiRiZhi()
  })

  it('每行日志均为可解析的 JSON 并包含结构化字段', async () => {
    debug日志.info('测试', 'JSON格式验证', { xiang_qing: { a: 1 } })
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(1)

    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.ji_bie).toBe('info')
    expect(tiaoMu.lei_xing).toBe('测试')
    expect(tiaoMu.xiao_xi).toBe('JSON格式验证')
    expect(tiaoMu.shi_jian).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(tiaoMu.xiang_qing.a).toBe(1)
    expect(typeof tiaoMu.pid).toBe('number')
    expect(typeof tiaoMu.hostname).toBe('string')
  })

  it('xieRuRiZhi 直接调用支持 qing_qiu_id 字段', async () => {
    xieRuRiZhi('info', '请求追踪', '带请求ID', {
      qing_qiu_id: 'req-001',
      yong_hu_id: 'user-x',
    })
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.qing_qiu_id).toBe('req-001')
    expect(tiaoMu.yong_hu_id).toBe('user-x')
    expect(tiaoMu.lei_xing).toBe('请求追踪')
  })

  it('withRequestId 自动注入 qing_qiu_id 到每条日志', async () => {
    const qingQiuRiZhi = withRequestId('req-abc-123', 'user-1', 'role-1')
    qingQiuRiZhi.info('请求处理', '开始处理', { bu_zhou: 'jiao_yan' })
    qingQiuRiZhi.warn('请求处理', '耗时偏高', { hao_shi: 800 })
    qingQiuRiZhi.error('请求处理', '处理失败')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(3)

    for (const hangXiang of hang) {
      const tiaoMu = JSON.parse(hangXiang)
      expect(tiaoMu.qing_qiu_id).toBe('req-abc-123')
      expect(tiaoMu.yong_hu_id).toBe('user-1')
      expect(tiaoMu.jiao_se_id).toBe('role-1')
      expect(tiaoMu.lei_xing).toBe('请求处理')
    }

    const tiaoMu1 = JSON.parse(hang[0])
    expect(tiaoMu1.ji_bie).toBe('info')
    expect(tiaoMu1.xiang_qing.bu_zhou).toBe('jiao_yan')

    const tiaoMu2 = JSON.parse(hang[1])
    expect(tiaoMu2.ji_bie).toBe('warn')
    expect(tiaoMu2.xiang_qing.hao_shi).toBe(800)

    const tiaoMu3 = JSON.parse(hang[2])
    expect(tiaoMu3.ji_bie).toBe('error')
    expect(tiaoMu3.xiang_qing).toBeUndefined()
  })

  it('LOG_LEVEL 控制级别过滤 - error 级别只输出 error', async () => {
    sheZhiZuiDiRiZhiJiBie('error')
    debug日志.debug('测试', 'debug消息')
    debug日志.info('测试', 'info消息')
    debug日志.warn('测试', 'warn消息')
    debug日志.error('测试', 'error消息')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(1)
    const tiaoMu = JSON.parse(hang[0])
    expect(tiaoMu.ji_bie).toBe('error')
    expect(tiaoMu.xiao_xi).toBe('error消息')
  })

  it('LOG_LEVEL 控制级别过滤 - info 级别输出 info/warn/error', async () => {
    sheZhiZuiDiRiZhiJiBie('info')
    debug日志.debug('测试', 'debug消息')
    debug日志.info('测试', 'info消息')
    debug日志.warn('测试', 'warn消息')
    debug日志.error('测试', 'error消息')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(3)
    const jiBieLieBiao = hang.map((hangXiang) => JSON.parse(hangXiang).ji_bie)
    expect(jiBieLieBiao).toContain('info')
    expect(jiBieLieBiao).toContain('warn')
    expect(jiBieLieBiao).toContain('error')
    expect(jiBieLieBiao).not.toContain('debug')
  })

  it('LOG_LEVEL=debug 时 debug 级别日志能输出', async () => {
    sheZhiZuiDiRiZhiJiBie('debug')
    debug日志.debug('测试', 'debug消息')
    debug日志.info('测试', 'info消息')
    await guanBiRiZhiLiu()

    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(2)
    const jiBieLieBiao = hang.map((hangXiang) => JSON.parse(hangXiang).ji_bie)
    expect(jiBieLieBiao).toContain('debug')
    expect(jiBieLieBiao).toContain('info')
  })

  it('多次 guanBiRiZhiLiu 后再次写入能重建日志流', async () => {
    debug日志.info('测试', '第一批')
    await guanBiRiZhiLiu()
    expect(duQuRiZhiHang().length).toBe(1)

    debug日志.info('测试', '第二批')
    await guanBiRiZhiLiu()
    const hang = duQuRiZhiHang()
    expect(hang.length).toBe(2)
    const tiaoMu2 = JSON.parse(hang[1])
    expect(tiaoMu2.xiao_xi).toBe('第二批')
  })
})
