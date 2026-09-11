process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import type { Request } from 'express'
import { ipKeyGenerator } from 'express-rate-limit'
import { huoQuZhenShiIP, shiDuanKeXinDaiLi } from '../utils/真实IP'
import { shengChengXianLiuJian } from '../middleware/限流'
import { redis } from '../redis'
import { 数据库 } from '../数据库'
import yingYong from '../server'

function jiaQingQiu(duiXiangDiZhi?: string, touBuLiang?: Record<string, string>): Request {
  return {
    socket: { remoteAddress: duiXiangDiZhi },
    headers: touBuLiang ?? {},
  } as unknown as Request
}

describe.sequential('FP-02 真实IP信任链', () => {
  describe('huoQuZhenShiIP 单元', () => {
    it('直连场景无任何代理头时取socket.remoteAddress', () => {
      const jieGuo = huoQuZhenShiIP(jiaQingQiu('203.0.113.50'))
      expect(jieGuo).toBe('203.0.113.50')
    })

    it('IPv6映射地址归一化为IPv4', () => {
      const jieGuo = huoQuZhenShiIP(jiaQingQiu('::ffff:203.0.113.51'))
      expect(jieGuo).toBe('203.0.113.51')
    })

    it('回环对端信任X-Real-IP头', () => {
      const jieGuo = huoQuZhenShiIP(jiaQingQiu('127.0.0.1', { 'x-real-ip': '198.51.100.7' }))
      expect(jieGuo).toBe('198.51.100.7')
    })

    it('docker网段对端在KE_XIN_DAI_LI_WANG_DUAN显式配置后信任X-Real-IP且归一化映射前缀', () => {
      process.env.KE_XIN_DAI_LI_WANG_DUAN = '172.16.0.0/12'
      try {
        const jieGuo = huoQuZhenShiIP(jiaQingQiu('::ffff:172.18.0.9', { 'x-real-ip': '::ffff:8.8.4.4' }))
        expect(jieGuo).toBe('8.8.4.4')
      } finally {
        delete process.env.KE_XIN_DAI_LI_WANG_DUAN
      }
    })

    it('经配置的私网对端信任X-Real-IP头，未配置网段一律不信任', () => {
      process.env.KE_XIN_DAI_LI_WANG_DUAN = '192.168.0.0/16'
      try {
        const jieGuo = huoQuZhenShiIP(jiaQingQiu('192.168.31.20', { 'x-real-ip': '198.51.100.8' }))
        expect(jieGuo).toBe('198.51.100.8')
      } finally {
        delete process.env.KE_XIN_DAI_LI_WANG_DUAN
      }
      const weiPeiZhi = huoQuZhenShiIP(jiaQingQiu('10.1.2.3', { 'x-real-ip': '198.51.100.9' }))
      expect(weiPeiZhi).toBe('10.1.2.3')
    })

    it('公网对端即使携带X-Real-IP也不信任', () => {
      const jieGuo = huoQuZhenShiIP(jiaQingQiu('203.0.113.66', { 'x-real-ip': '1.2.3.4' }))
      expect(jieGuo).toBe('203.0.113.66')
    })

    it('公网IPv6对端即使携带X-Real-IP也不信任', () => {
      const jieGuo = huoQuZhenShiIP(jiaQingQiu('2400:cb00::32', { 'x-real-ip': '5.6.7.8' }))
      expect(jieGuo).toBe('2400:cb00::32')
    })

    it('X-Real-IP为非法字面量时回落对端地址', () => {
      const jieGuo = huoQuZhenShiIP(
        jiaQingQiu('127.0.0.1', { 'x-real-ip': '<script>alert(1)</script>' }),
      )
      expect(jieGuo).toBe('127.0.0.1')
    })

    it('任何对端下X-Forwarded-For一律被忽略', () => {
      const keXin = huoQuZhenShiIP(
        jiaQingQiu('127.0.0.1', { 'x-forwarded-for': '9.9.9.9, 8.8.8.8' }),
      )
      expect(keXin).toBe('127.0.0.1')
      const buKeXin = huoQuZhenShiIP(
        jiaQingQiu('203.0.113.70', { 'x-forwarded-for': '9.9.9.9' }),
      )
      expect(buKeXin).toBe('203.0.113.70')
    })

    it('Unix套接字等无对端地址场景返回回环默认值且不信任头', () => {
      const jieGuo = huoQuZhenShiIP(jiaQingQiu(undefined, { 'x-real-ip': '6.6.6.6' }))
      expect(jieGuo).toBe('127.0.0.1')
    })
  })

  describe('可信代理判定单元', () => {
    it('未配置KE_XIN_DAI_LI_WANG_DUAN时默认仅回环可信，内网与IPv6本地段一律不可信', () => {
      expect(shiDuanKeXinDaiLi('127.0.0.1')).toBe(true)
      expect(shiDuanKeXinDaiLi('::1')).toBe(true)
      expect(shiDuanKeXinDaiLi('::ffff:127.0.0.1')).toBe(true)
      expect(shiDuanKeXinDaiLi('10.0.0.5')).toBe(false)
      expect(shiDuanKeXinDaiLi('172.16.0.1')).toBe(false)
      expect(shiDuanKeXinDaiLi('172.31.255.255')).toBe(false)
      expect(shiDuanKeXinDaiLi('192.168.1.9')).toBe(false)
      expect(shiDuanKeXinDaiLi('169.254.3.4')).toBe(false)
      expect(shiDuanKeXinDaiLi('fe80::1')).toBe(false)
      expect(shiDuanKeXinDaiLi('fd12::5')).toBe(false)
      expect(shiDuanKeXinDaiLi('fc00::1')).toBe(false)
      expect(shiDuanKeXinDaiLi('8.8.8.8')).toBe(false)
      expect(shiDuanKeXinDaiLi('2606:4700::1111')).toBe(false)
    })

    it('KE_XIN_DAI_LI_WANG_DUAN显式网段增量生效（IPv4 CIDR与IPv6精确地址），回环恒可信', () => {
      process.env.KE_XIN_DAI_LI_WANG_DUAN = '172.16.0.0/12,2400:cb00::32'
      try {
        expect(shiDuanKeXinDaiLi('172.16.0.1')).toBe(true)
        expect(shiDuanKeXinDaiLi('172.31.255.255')).toBe(true)
        expect(shiDuanKeXinDaiLi('172.32.0.1')).toBe(false)
        expect(shiDuanKeXinDaiLi('2400:cb00::32')).toBe(true)
        expect(shiDuanKeXinDaiLi('2606:4700::1111')).toBe(false)
        expect(shiDuanKeXinDaiLi('127.0.0.1')).toBe(true)
        expect(shiDuanKeXinDaiLi('::1')).toBe(true)
      } finally {
        delete process.env.KE_XIN_DAI_LI_WANG_DUAN
      }
    })

    it('非法CIDR条目被跳过不影响其余规则解析', () => {
      process.env.KE_XIN_DAI_LI_WANG_DUAN = '999.1.2.3/8,192.168.0.0/33,bogus,10.0.0.0/8'
      try {
        expect(shiDuanKeXinDaiLi('10.2.3.4')).toBe(true)
        expect(shiDuanKeXinDaiLi('192.168.1.1')).toBe(false)
      } finally {
        delete process.env.KE_XIN_DAI_LI_WANG_DUAN
      }
    })
  })

  describe('限流键生成单元', () => {
    it('伪造XFF时限流键落在真实对端IP而非伪造值', () => {
      const jian = shengChengXianLiuJian(
        jiaQingQiu('::ffff:127.0.0.1', { 'x-forwarded-for': '9.9.9.9' }),
      )
      expect(jian).toContain('127.0.0.1')
      expect(jian).not.toContain('9.9.9.9')
    })

    it('直连公网对端时限流键等于该对端IP派生键', () => {
      const jian = shengChengXianLiuJian(jiaQingQiu('203.0.113.77'))
      expect(jian).toBe(ipKeyGenerator('203.0.113.77'))
    })

    it('经可信代理注入X-Real-IP时限流键取代理报告的真实来源', () => {
      process.env.KE_XIN_DAI_LI_WANG_DUAN = '172.16.0.0/12'
      try {
        const jian = shengChengXianLiuJian(
          jiaQingQiu('::ffff:172.19.0.2', { 'x-real-ip': '203.0.113.88' }),
        )
        expect(jian).toBe(ipKeyGenerator('203.0.113.88'))
      } finally {
        delete process.env.KE_XIN_DAI_LI_WANG_DUAN
      }
    })
  })

  describe('集成回归', () => {
    it('伪造XFF触发SQL注入违规时封禁计数落在真实IP上', async () => {
      const sheJiJianLieBiao = [
        '违规:127.0.0.1',
        '封禁:127.0.0.1',
        '违规:9.9.9.9',
        '封禁:9.9.9.9',
      ]
      for (const jian of sheJiJianLieBiao) {
        await redis.del(jian)
      }
      try {
        const xiangYing = await request(yingYong)
          .post('/api/认证/登录')
          .set('X-Forwarded-For', '9.9.9.9')
          .send({ shouJiHao: "13812340001' OR '1'='1", miMa: 'test' })

        expect([403, 429]).toContain(xiangYing.status)
        const zhenShiWeiGui = await redis.get('违规:127.0.0.1')
        const weiZaoWeiGui = await redis.get('违规:9.9.9.9')
        expect(Number(zhenShiWeiGui)).toBeGreaterThanOrEqual(1)
        expect(weiZaoWeiGui).toBeNull()
      } finally {
        for (const jian of sheJiJianLieBiao) {
          await redis.del(jian)
        }
        await 数据库.query(`DELETE FROM "封禁记录" WHERE "IP" IN ($1, $2)`, [
          '127.0.0.1',
          '9.9.9.9',
        ])
      }
    })

    it('伪造他人IP的违规请求不再写入该他人IP的封禁键', async () => {
      const beiHaiRenIP = '198.18.0.77'
      await redis.del(`违规:${beiHaiRenIP}`)
      await redis.del(`封禁:${beiHaiRenIP}`)
      try {
        await request(yingYong)
          .post('/api/认证/登录')
          .set('X-Forwarded-For', beiHaiRenIP)
          .send({ shouJiHao: "13812340002' OR '1'='1", miMa: 'test' })

        const beiHaiWeiGui = await redis.get(`违规:${beiHaiRenIP}`)
        expect(beiHaiWeiGui).toBeNull()
      } finally {
        await redis.del(`违规:${beiHaiRenIP}`)
        await redis.del(`封禁:${beiHaiRenIP}`)
        await 数据库.query(`DELETE FROM "封禁记录" WHERE "IP" = $1`, [beiHaiRenIP])
      }
    })
  })

  afterAll(async () => {
    await 数据库.end()
    await redis.quit()
  })
})
