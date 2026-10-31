import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 认证路由源码 = readFileSync(resolve(__dirname, '../认证.ts'), 'utf8')
const 人机中间件源码 = readFileSync(resolve(__dirname, '../../middleware/人机验证.ts'), 'utf8')

describe('发送码人机强制门（防绕过回归）', () => {
  it('发送码路由在限流之前挂了人机验证中间件', () => {
    const 行 = 认证路由源码.split('\n').find((行) => 行.includes("luYou.post('/发送码'"))
    expect(行).toBeTruthy()
    const 序 = (名: string) => 行!.indexOf(名)
    expect(序('renJiYanZhengZhongJianJian')).toBeGreaterThan(-1)
    expect(序('renJiYanZhengZhongJianJian')).toBeLessThan(序('faSongMaXianLiu'))
    expect(序('faSongMaXianLiu')).toBeLessThan(行!.indexOf('async'))
  })

  it('人机中间件在票据或答案缺失时直接 400，不进业务', () => {
    expect(人机中间件源码).toContain("quZiFu(qingQiuTi, 'renJiPiaoJu', 'ren_ji_piao_ju')")
    expect(人机中间件源码).toContain("quZiFu(qingQiuTi, 'renJiDaAn', 'ren_ji_da_an')")
    expect(人机中间件源码).toContain('AUTH_HUMAN_VERIFICATION_FAILED')
  })

  it('挑战签发绑定用途，校验消费时用途不匹配即拒', () => {
    expect(人机中间件源码).toContain('zhunHuaYanZhengMaYongTu(qingQiuTi.yongTu)')
    expect(人机中间件源码).toContain('xiaoHaoRenJiTiaoZhan(piaoJu, daAn,')
  })
})
