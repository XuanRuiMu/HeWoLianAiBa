import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { 自动登录键 } from '@/constants/auth'
import { duQuLingPai } from '@/utils/令牌存储'
import { duQuShuJu } from '@/utils/storage'
import { jiaZaiShiBaiLuYou, zhuCeLuYouCuoWuChuLi } from './错误处理'

const luYou: RouteRecordRaw[] = [
  // 路由/分块加载失败时的落地页：静态组件，不经懒载，保证失败态自身不再依赖网络
  jiaZaiShiBaiLuYou,
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
        path: 'zhang-hao-an-quan',
        name: 'zhangHaoAnQuan',
        component: () => import('@/views/账号与安全.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'junshi-jilu/:jiaoSeId/:jiLuId',
        name: 'junShiJiLuXiangQing',
        component: () => import('@/views/军师记录详情.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'tiao-zhan',
        name: 'tiaoZhanZhuYe',
        component: () => import('@/views/挑战主页.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'tiao-zhan/pai-hang',
        name: 'tiaoZhanPaiHangBang',
        component: () => import('@/views/挑战积分榜.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'hao-you',
        name: 'haoYouLieBiao',
        component: () => import('@/views/好友列表.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'hao-you/:haoYouId',
        name: 'haoYouLiaoTian',
        component: () => import('@/views/好友聊天.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'qi-pao-she-zhi',
        name: 'qiPaoSheZhi',
        component: () => import('@/views/气泡设置.vue'),
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
  // YH-102 滚动管理：前进置顶后退恢复，禁返回列表位置丢
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.name === from.name) {
      return false
    }
    return { top: 0 }
  },
})

function huoQuLingPai(): string | null {
  if (typeof window === 'undefined') return null
  return duQuLingPai()
}

function ziDongDengLuKaiQi(): boolean {
  const zhi = duQuShuJu<boolean>(自动登录键, null)
  if (zhi === null) return true
  return zhi === true
}

router.beforeEach(async (to, _from) => {
  const youLingPai = Boolean(huoQuLingPai())
  if (to.meta.xuYaoDengLu && !youLingPai) {
    return { name: 'dengLu', replace: true }
  }
  if ((to.name === 'dengLu' || to.path === '/login') && youLingPai && ziDongDengLuKaiQi()) {
    return { name: 'zhuJieMian', replace: true }
  }
})

zhuCeLuYouCuoWuChuLi(router)

export default router
