process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, afterEach, afterAll } from 'vitest'
import request from 'supertest'
import { execFile } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import yingYong from '../server'
import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { peiZhi, huoQuQiDongHuanJingCuoWu } from '../config'
import { yanZhengMaShiFouZhengQue, shanChuYanZhengMa } from '../services/短信'
import { huoQuFanYi } from '../config/translations'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingChuCeShiShuJu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await shanChuYanZhengMa(shouJiHao)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

describe('开发模式验证码后门防护', () => {
  const yuanKaiFaMoShi = peiZhi.kaiFaMoShi
  const yuanVitestZhi = process.env.VITEST

  afterEach(() => {
    peiZhi.kaiFaMoShi = yuanKaiFaMoShi
    if (yuanVitestZhi === undefined) {
      delete process.env.VITEST
    } else {
      process.env.VITEST = yuanVitestZhi
    }
  })

  afterAll(async () => {
    await 数据库.end()
    await redis.quit()
  })

  describe('启动环境校验函数', () => {
    it('未设置NODE_ENV返回错误且说明如何配置', () => {
      const cuoWu = huoQuQiDongHuanJingCuoWu(undefined)
      expect(cuoWu).not.toBeNull()
      expect(cuoWu).toContain('NODE_ENV')
      expect(cuoWu).toContain('NODE_ENV=production')
    })

    it('空字符串NODE_ENV视为未设置拒绝启动', () => {
      expect(huoQuQiDongHuanJingCuoWu('')).not.toBeNull()
    })

    it('非法取值拒绝启动', () => {
      expect(huoQuQiDongHuanJingCuoWu('staging')).not.toBeNull()
      expect(huoQuQiDongHuanJingCuoWu('Development')).not.toBeNull()
    })

    it('合法取值通过校验', () => {
      expect(huoQuQiDongHuanJingCuoWu('development')).toBeNull()
      expect(huoQuQiDongHuanJingCuoWu('test')).toBeNull()
      expect(huoQuQiDongHuanJingCuoWu('production')).toBeNull()
    })
  })

  describe('验证码回退路径防护', () => {
    it('生产语义（kaiFaMoShi=false）：Redis无码时拒绝固定码123456', async () => {
      const shouJiHao = suiJiShouJiHao()
      await shanChuYanZhengMa(shouJiHao)
      peiZhi.kaiFaMoShi = false
      expect(await yanZhengMaShiFouZhengQue(shouJiHao, '123456')).toBe(false)
    })

    it('非VITEST环境（如本地开发者终端）：Redis无码时不凭空接受固定码', async () => {
      const shouJiHao = suiJiShouJiHao()
      await shanChuYanZhengMa(shouJiHao)
      process.env.VITEST = ''
      expect(await yanZhengMaShiFouZhengQue(shouJiHao, '123456')).toBe(false)
    })

    it('VITEST环境保留固定码回退：测试基建不回退', async () => {
      const shouJiHao = suiJiShouJiHao()
      await shanChuYanZhengMa(shouJiHao)
      expect(yuanKaiFaMoShi).toBe(true)
      expect(await yanZhengMaShiFouZhengQue(shouJiHao, '123456')).toBe(true)
    })

    it('Redis有真实下发码时正常比对不受环境影响', async () => {
      const shouJiHao = suiJiShouJiHao()
      await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '654321')
      peiZhi.kaiFaMoShi = false
      expect(await yanZhengMaShiFouZhengQue(shouJiHao, '654321')).toBe(true)
      expect(await yanZhengMaShiFouZhengQue(shouJiHao, '123456')).toBe(false)
      await shanChuYanZhengMa(shouJiHao)
    })
  })

  describe('HTTP接口防护与本地开发兼容', () => {
    it('生产语义下注册接口拒绝未下发的123456', async () => {
      const shouJiHao = suiJiShouJiHao()
      await qingChuCeShiShuJu(shouJiHao)
      peiZhi.kaiFaMoShi = false
      process.env.VITEST = ''
      try {
        const xiangYing = await request(yingYong)
          .post('/api/认证/注册')
          .send({
            shouJiHao,
            yanZhengMa: '123456',
            yongHuMing: `后门防护测试${Date.now()}`,
            miMa: 'Test123456',
            tongYiXieYi: true,
            chuShengRiQi: '2000-01-01',
          })
          .expect(400)
        expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'yanZhengMaCuoWu'))
      } finally {
        await qingChuCeShiShuJu(shouJiHao)
      }
    })

    it('显式development非VITEST流程：发送码下发123456入Redis并可完成校验', async () => {
      const shouJiHao = suiJiShouJiHao()
      await qingChuCeShiShuJu(shouJiHao)
      peiZhi.kaiFaMoShi = true
      process.env.VITEST = ''
      try {
        const faSong = await request(yingYong)
          .post('/api/认证/发送码')
          .send({ shouJiHao })
          .expect(200)
        expect(faSong.body.cheng_gong).toBe(true)
        expect(await redis.get(`yan_zheng_ma:${shouJiHao}`)).toBe('123456')
        const zhuCe = await request(yingYong)
          .post('/api/认证/注册')
          .send({
            shouJiHao,
            yanZhengMa: '123456',
            yongHuMing: `开发兼容测试${Date.now()}`,
            miMa: 'Test123456',
            tongYiXieYi: true,
            chuShengRiQi: '2000-01-01',
          })
          .expect(200)
        expect(zhuCe.body.cheng_gong).toBe(true)
      } finally {
        await qingChuCeShiShuJu(shouJiHao)
      }
    })

    it('生产语义下发送码走真实短信通道，缺短信配置时明确失败', async () => {
      const shouJiHao = suiJiShouJiHao()
      await qingChuCeShiShuJu(shouJiHao)
      peiZhi.kaiFaMoShi = false
      try {
        const xiangYing = await request(yingYong)
          .post('/api/认证/发送码')
          .send({ shouJiHao })
          .expect(500)
        expect(xiangYing.body.cheng_gong).toBe(false)
        expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai'))
      } finally {
        await qingChuCeShiShuJu(shouJiHao)
      }
    })
  })

  describe('进程直接启动防护', () => {
    const gouJianChanPinLuJing = path.resolve(__dirname, '../../dist/server.js')

    it('以未设置NODE_ENV启动生产构建时立即退出并输出配置说明', async () => {
      if (!fs.existsSync(gouJianChanPinLuJing)) {
        return
      }
      await new Promise<void>((jieJue) => {
        execFile(
          process.execPath,
          [gouJianChanPinLuJing],
          {
            cwd: os.tmpdir(),
            timeout: 10000,
            env: {
              ...process.env,
              NODE_ENV: '',
              VITEST: '',
              DATABASE_URL: 'postgres://ce_shi:ce_shi@localhost:5432/ce_shi',
              REDIS_URL: 'redis://localhost:6379',
              JWT_SECRET: 'ce_shi_mi_yao_ce_shi_mi_yao_ce_shi_mi_yao_32zi',
            },
          },
          (cuoWu, _biaoZhunShuChu, biaoZhunCuoWu) => {
            expect(cuoWu).not.toBeNull()
            const quanBuShuChu = `${String(_biaoZhunShuChu)}${String(biaoZhunCuoWu)}`
            expect(quanBuShuChu).toContain('NODE_ENV')
            jieJue()
          },
        )
      })
    })
  })
})
