import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { 令牌键 } from '@/constants/auth'

function chuangJianRenZhengShouWei(lingPaiJian: string) {
  return function huoQuLingPai(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(lingPaiJian)
  }
}

describe('路由认证守卫', () => {
  beforeEach(() => {
    localStorage.clear()
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
      if ((to.name === 'dengLu' || to.path === '/login') && youLingPai) {
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

  it('已登录可访问受保护路由', async () => {
    localStorage.setItem(令牌键, 'valid-token')
    const luYou = chuangJianCeShiLuYou()
    await luYou.push({ name: 'zhuJieMian' })
    await luYou.isReady()
    expect(luYou.currentRoute.value.name).toBe('zhuJieMian')
  })
})
