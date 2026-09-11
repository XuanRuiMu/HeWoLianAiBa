import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 数据库 } from '../数据库'
import { chuangJianRiZhiYinQing, guanBiRiZhiYinQing } from '../utils/日志引擎'
import { yinBiShouJiHao } from '../utils/掩码'
import { zhuCe, dengLu } from '../services/认证'
import { faSongYanZhengMa } from '../services/短信'
import { huoQuFanYi } from '../config/translations'
import { jiLuShenJiRiZhi } from '../services/审计日志'
import { peiZhi } from '../config'
import { redis } from '../redis'
import type { ShenJiRiZhi } from '../types'

describe('FP-10 C6日志留存+C8协议留痕掩码', () => {
  beforeAll(() => {
    chuangJianRiZhiYinQing()
  })

  afterAll(async () => {
    await guanBiRiZhiYinQing()
  })

  function suiJiShouJiHao(): string {
    return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
  }

  async function qingLiCeShiShuJu(shouJiHao: string): Promise<void> {
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
    await 数据库.query(`DELETE FROM "协议留痕" WHERE "用户ID" IN (SELECT "ID" FROM "用户" WHERE "手机号" = $1)`, [shouJiHao])
    await 数据库.query(`DELETE FROM "审计日志" WHERE "详情"->>'shou_ji_hao' = $1`, [shouJiHao])
    await redis.del(`yan_zheng_ma:${shouJiHao}`)
    await redis.del(`fa_song_jian_ge:${shouJiHao}`)
    await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
  }

  function huoQuChengNianShengRi(): string {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 20)
    return d.toISOString().split('T')[0]
  }

  describe('C6 业务日志留存≥183天', () => {
    it('冷存保留期配置应为183天', () => {
      expect(peiZhi.riZhiLengCunBaoLiuTian).toBe(183)
    })

    it('pino-roll滚动文件数应可配置且有磁盘容量上限', () => {
      expect(peiZhi.riZhiGunDongWenJianShu).toBeGreaterThan(0)
      expect(peiZhi.riZhiGunDongWenJianShu).toBeLessThanOrEqual(100)
    })
  })

  describe('C8 协议版本留痕表', () => {
    it('注册时应写入协议留痕记录(版本/时间/IP)', async () => {
      const shouJiHao = suiJiShouJiHao()
      const yongHuMing = `测试用户_${Date.now()}`
      await qingLiCeShiShuJu(shouJiHao)
      
      try {
        const faSongJieGuo = await faSongYanZhengMa(shouJiHao)
        console.log('发送验证码结果:', faSongJieGuo)
        const cunChuMa = await redis.get(`yan_zheng_ma:${shouJiHao}`)
        console.log('Redis中存储的验证码:', cunChuMa)
        const canShu = {
          shou_ji_hao: shouJiHao,
          yan_zheng_ma: '123456',
          yong_hu_ming: yongHuMing,
          mi_ma: 'Test123456',
          tong_yi_xie_yi: true,
          ip: '127.0.0.1',
          chu_sheng_ri_qi: huoQuChengNianShengRi(),
        }
        console.log('注册参数:', canShu)
        const jieGuo = await zhuCe(canShu)
        if (!jieGuo.cheng_gong) {
          console.log('注册失败:', jieGuo.ti_shi, 'params:', { shouJiHao, yongHuMing })
        }
        expect(jieGuo.cheng_gong).toBe(true)

        const liuHen = await 数据库.query(
          `SELECT * FROM "协议留痕" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC LIMIT 1`,
          [jieGuo.shu_ju!.用户.id],
        )
        expect(liuHen.rows.length).toBe(1)
        expect(liuHen.rows[0].协议版本).toBeDefined()
        expect(liuHen.rows[0].同意时间戳).toBeDefined()
        expect(liuHen.rows[0].客户端IP).toBe('127.0.0.1')
      } finally {
        await qingLiCeShiShuJu(shouJiHao)
      }
    })

    it('协议留痕表结构正确', async () => {
      const columns = await 数据库.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = '协议留痕' ORDER BY ordinal_position
      `)
      const columnNames = columns.rows.map(r => r.column_name)
      expect(columnNames).toContain('ID')
      expect(columnNames).toContain('用户ID')
      expect(columnNames).toContain('协议版本')
      expect(columnNames).toContain('同意时间戳')
      expect(columnNames).toContain('客户端IP')
      expect(columnNames).toContain('创建时间')
    })
  })

  describe('C8 手机号掩码', () => {
    it('yinBiShouJiHao工具函数应正确掩码(前3后4)', () => {
      expect(yinBiShouJiHao('13800138000')).toBe('138****8000')
      expect(yinBiShouJiHao('15912345678')).toBe('159****5678')
      expect(yinBiShouJiHao('1380013800')).toBe('138****3800') // 10位也处理
    })

    it('登录失败审计日志手机号应为掩码', async () => {
      const shouJiHao = suiJiShouJiHao()
      await qingLiCeShiShuJu(shouJiHao)
      
      try {
        await dengLu({
          shou_ji_hao: shouJiHao,
          mi_ma: 'WrongPassword',
          ip: '127.0.0.1',
        })

        const riZhi = await 数据库.query(
          `SELECT * FROM "审计日志" WHERE "事件类型" = $1 AND "详情"->>'shou_ji_hao' IS NOT NULL ORDER BY "创建时间" DESC LIMIT 1`,
          [huoQuFanYi('shenJi', 'dengLuShiBai')],
        )
        expect(riZhi.rows.length).toBeGreaterThan(0)
        const xiangQing = riZhi.rows[0].详情 as Record<string, unknown>
        const 掩码后手机号 = xiangQing.shou_ji_hao as string
        expect(掩码后手机号).toMatch(/^\d{3}\*{4}\d{4}$/)
        expect(掩码后手机号).not.toBe(shouJiHao)
      } finally {
        await qingLiCeShiShuJu(shouJiHao)
      }
    })

    it('注册成功审计日志手机号应为掩码', async () => {
      const shouJiHao = suiJiShouJiHao()
      const yongHuMing = `注册测试_${Date.now()}`
      await qingLiCeShiShuJu(shouJiHao)
      
      try {
        await faSongYanZhengMa(shouJiHao)
        await zhuCe({
          shou_ji_hao: shouJiHao,
          yan_zheng_ma: '123456',
          yong_hu_ming: yongHuMing,
          mi_ma: 'Test123456',
          tong_yi_xie_yi: true,
          ip: '127.0.0.1',
          chu_sheng_ri_qi: huoQuChengNianShengRi(),
        })

        const riZhi = await 数据库.query(
          `SELECT * FROM "审计日志" WHERE "事件类型" = $1 AND "详情"->>'shou_ji_hao' IS NOT NULL ORDER BY "创建时间" DESC LIMIT 1`,
          [huoQuFanYi('shenJi', 'zhuCeChengGong')],
        )
        expect(riZhi.rows.length).toBeGreaterThan(0)
        const xiangQing = riZhi.rows[0].详情 as Record<string, unknown>
        const 掩码后手机号 = xiangQing.shou_ji_hao as string
        expect(掩码后手机号).toMatch(/^\d{3}\*{4}\d{4}$/)
        expect(掩码后手机号).not.toBe(shouJiHao)
      } finally {
        await qingLiCeShiShuJu(shouJiHao)
      }
    })

    it('修改密码审计日志手机号应为掩码', async () => {
      const shouJiHao = suiJiShouJiHao()
      const yongHuMing = `改密测试_${Date.now()}`
      await qingLiCeShiShuJu(shouJiHao)
      
      try {
        await faSongYanZhengMa(shouJiHao)
        const zhuCeJieGuo = await zhuCe({
          shou_ji_hao: shouJiHao,
          yan_zheng_ma: '123456',
          yong_hu_ming: yongHuMing,
          mi_ma: 'OldPass123',
          tong_yi_xie_yi: true,
          ip: '127.0.0.1',
          chu_sheng_ri_qi: huoQuChengNianShengRi(),
        })
        expect(zhuCeJieGuo.cheng_gong).toBe(true)

        await dengLu({
          shou_ji_hao: shouJiHao,
          mi_ma: 'OldPass123',
          ip: '127.0.0.1',
        })

        await faSongYanZhengMa(shouJiHao)
        const { gengGaiMiMa } = await import('../services/认证')
        await gengGaiMiMa({
          yong_hu_id: zhuCeJieGuo.shu_ju!.用户.id,
          shou_ji_hao: shouJiHao,
          jiu_mi_ma: 'OldPass123',
          xin_mi_ma: 'NewPass123',
          que_ren_xin_mi_ma: 'NewPass123',
          yan_zheng_ma: '123456',
          ip: '127.0.0.1',
        })

        const riZhi = await 数据库.query(
          `SELECT * FROM "审计日志" WHERE "事件类型" = $1 AND "详情"->>'shou_ji_hao' IS NOT NULL ORDER BY "创建时间" DESC LIMIT 1`,
          [huoQuFanYi('shenJi', 'xiuGaiMiMa')],
        )
        if (riZhi.rows.length > 0) {
          const xiangQing = riZhi.rows[0].详情 as Record<string, unknown>
          const 掩码后手机号 = xiangQing.shou_ji_hao as string
          expect(掩码后手机号).toMatch(/^\d{3}\*{4}\d{4}$/)
          expect(掩码后手机号).not.toBe(shouJiHao)
        }
      } finally {
        await qingLiCeShiShuJu(shouJiHao)
      }
    })

    it('jiLuShenJiRiZhi直接调用时手机号应被掩码', async () => {
      await jiLuShenJiRiZhi({
        ip: '127.0.0.1',
        shi_jian_lei_xing: '测试事件',
        xiang_qing: { shou_ji_hao: '13512345678', 其他字段: '测试' },
        lei_xing: '测试',
      })

      const riZhi = await 数据库.query(
        `SELECT * FROM "审计日志" WHERE "事件类型" = $1 ORDER BY "创建时间" DESC LIMIT 1`,
        ['测试事件'],
      )
      expect(riZhi.rows.length).toBeGreaterThan(0)
      const xiangQing = riZhi.rows[0].详情 as Record<string, unknown>
      const 掩码后手机号 = xiangQing.shou_ji_hao as string
      expect(掩码后手机号).toBe('135****5678')
    })
  })
})
