import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { 令牌键, 自动登录键 } from '@/constants/auth'
import { duQuLingPai } from '@/utils/令牌存储'
import { baoCunShuJu, duQuShuJu } from '@/utils/storage'

function chuangJianRenZhengShouWei(lingPaiJian: string) {
  void lingPaiJian
  return function huoQuLingPai(): string | null {
    if (typeof window === 'undefined') return null
    return duQuLingPai()
  }
}

function ziDongDengLuKaiQi(): boolean {
  const zhi = duQuShuJu<boolean>(自动登录键, null)
  if (zhi === null) return true
  return zhi === true
}

describe('路由认证守卫', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  function chuangJianCeShiLuYou() {
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          name: 'zhuJieMian',
          component: { template: '<div>主页</div>' },
          meta: { xuYaoDengLu: true },
        },
        {
          path: '/login',
          name: 'dengLu',
          component: { template: '<div>登录</div>' },
          meta: { xuYaoDengLu: false },
        },
        { path: '/:pathMatch(.*)*', redirect: '/login' },
      ],
    })

    const huoQuLingPai = chuangJianRenZhengShouWei(令牌键)
    luYou.beforeEach(async (to, _from) => {
      const youLingPai = Boolean(huoQuLingPai())
      if (to.meta.xuYaoDengLu && !youLingPai) {
        return { name: 'dengLu', replace: true }
      }
      if ((to.name === 'dengLu' || to.path === '/login') && youLingPai && ziDongDengLuKaiQi()) {
        return { name: 'zhuJieMian', replace: true }
      }
    })

    return luYou
  }

  it('未登录访问受保护路由应重定向到登录页', async () => {
    const luYou = chuangJianCeShiLuYou()
    await luYou.push({ name: 'zhuJieMian' })
    await luYou.isReady()
    expect(luYou.currentRoute.value.name).toBe('dengLu')
  })

  it('已登录访问登录页应重定向到主页', async () => {
    localStorage.setItem(令牌键, 'valid-token')
    const luYou = chuangJianCeShiLuYou()
    await luYou.push({ name: 'dengLu' })
    await luYou.isReady()
    expect(luYou.currentRoute.value.name).toBe('zhuJieMian')
  })

  it('会话级令牌访问登录页应重定向到主页', async () => {
    sessionStorage.setItem(令牌键, 'valid-token')
    const luYou = chuangJianCeShiLuYou()
    await luYou.push({ name: 'dengLu' })
    await luYou.isReady()
    expect(luYou.currentRoute.value.name).toBe('zhuJieMian')
  })

  it('关闭自动登录时有令牌也停留在登录页', async () => {
    localStorage.setItem(令牌键, 'valid-token')
    baoCunShuJu(自动登录键, false)
    const luYou = chuangJianCeShiLuYou()
    await luYou.push({ name: 'dengLu' })
    await luYou.isReady()
    expect(luYou.currentRoute.value.name).toBe('dengLu')
  })

  it('已登录可访问受保护路由', async () => {
    localStorage.setItem(令牌键, 'valid-token')
    const luYou = chuangJianCeShiLuYou()
    await luYou.push({ name: 'zhuJieMian' })
    await luYou.isReady()
    expect(luYou.currentRoute.value.name).toBe('zhuJieMian')
  })
})
