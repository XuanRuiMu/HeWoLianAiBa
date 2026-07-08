import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { 令牌键 } from '@/constants/auth'

const luYou: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/认证布局.vue'),
    children: [
      {
        path: '',
        name: 'zhuJieMian',
        component: () => import('@/views/主页内容.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'login',
        name: 'dengLu',
        component: () => import('@/views/登录内容.vue'),
        meta: { xuYaoDengLu: false },
      },
      {
        path: 'profile-setup',
        name: 'ziLiaoSheZhi',
        component: () => import('@/views/资料设置向导.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'tong-zhi',
        name: 'tongZhi',
        component: () => import('@/views/通知页面.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'chat/:huiHuaId',
        name: 'liaoTian',
        component: () => import('@/views/聊天页面.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'tian-jia-wei-xin',
        name: 'tianJiaWeiXin',
        component: () => import('@/views/添加微信.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'guo-wang-zhan-ji',
        name: 'guoWangZhanJi',
        component: () => import('@/views/过往战绩.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'junshi-jilu/:jiaoSeId/:jiLuId',
        name: 'junShiJiLuXiangQing',
        component: () => import('@/views/军师记录详情.vue'),
        meta: { xuYaoDengLu: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: luYou,
})

function huoQuLingPai(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(令牌键)
}

router.beforeEach(async (to, _from) => {
  const youLingPai = Boolean(huoQuLingPai())
  if (to.meta.xuYaoDengLu && !youLingPai) {
    return { name: 'dengLu', replace: true }
  }
  if ((to.name === 'dengLu' || to.path === '/login') && youLingPai) {
    return { name: 'zhuJieMian', replace: true }
  }
})

export default router
