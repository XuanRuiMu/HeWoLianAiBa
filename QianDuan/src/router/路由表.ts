import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { duQuLingPai } from '@/utils/令牌存储'
import { jiaZaiShiBaiLuYou, zhuCeLuYouCuoWuChuLi } from './错误处理'
import { anJingHua, cunYuQuJiaoJie, kaiShiLuYouYuQu, tuiJinLuYouPiCi } from './预取'

const jiaZaiGuoWangZhanJi = () => import('@/views/过往战绩.vue')
const jiaZaiTongZhiYe = () => import('@/views/通知页面.vue')
const jiaZaiZhangHaoAnQuan = () => import('@/views/账号与安全.vue')
const jiaZaiJunShiJiLu = () => import('@/views/军师记录详情.vue')
const jiaZaiTiaoZhanZhuYe = () => import('@/views/挑战主页.vue')
const jiaZaiTiaoZhanPaiHangBang = () => import('@/views/挑战积分榜.vue')
const jiaZaiHaoYouLieBiao = () => import('@/views/好友列表.vue')

const tiaoZhanZuBieLieBiao = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv'] as const

function duZiFuCanShu(zhi: unknown): string {
  return typeof zhi === 'string' ? zhi : ''
}

const luYou: RouteRecordRaw[] = [
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
        path: 'forgot-password',
        name: 'wangJiMiMa',
        component: () => import('@/views/找回密码.vue'),
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
        component: jiaZaiTongZhiYe,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'tongZhi',
            renWu: [
              async () => {
                const { 使用通知仓库 } = await import('@/stores/通知')
                return 使用通知仓库().jiaZaiTongZhi()
              },
            ],
            zuJian: jiaZaiTongZhiYe,
          },
        },
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
        component: jiaZaiGuoWangZhanJi,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'guoWangZhanJi',
            renWu: [
              async () => {
                const { 使用战绩仓库 } = await import('@/stores/战绩')
                return 使用战绩仓库().jiaZai()
              },
            ],
            zuJian: jiaZaiGuoWangZhanJi,
          },
        },
      },
      {
        path: 'zai-ru/:jiaoSeId',
        name: 'zaiRuLiaoTian',
        component: () => import('@/views/载入聊天.vue'),
        meta: { xuYaoDengLu: true },
      },
      {
        path: 'zhang-hao-an-quan',
        name: 'zhangHaoAnQuan',
        component: jiaZaiZhangHaoAnQuan,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'zhangHaoAnQuan',
            renWu: [
              async (to) => {
                const [{ huoQuFengJinZhuangTai }, { huoQuHaoYouLieBiao }, { 使用用户设置仓库 }] =
                  await Promise.all([
                    import('@/api/资料'),
                    import('@/api/社交'),
                    import('@/stores/用户设置'),
                  ])
                const fengJin = anJingHua(huoQuFengJinZhuangTai())
                const haoYouKeXuan = anJingHua(huoQuHaoYouLieBiao())
                cunYuQuJiaoJie(to.name, { fengJin, haoYouKeXuan })
                return Promise.all([fengJin, haoYouKeXuan, 使用用户设置仓库().jiaZai()])
              },
            ],
            zuJian: jiaZaiZhangHaoAnQuan,
          },
        },
      },
      {
        path: 'junshi-jilu/:jiaoSeId/:jiLuId',
        name: 'junShiJiLuXiangQing',
        component: jiaZaiJunShiJiLu,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'junShiJiLuXiangQing',
            renWu: [
              async (to) => {
                const { huoQuJunShiJiLu } = await import('@/api/聊天')
                const chengNuo = anJingHua(huoQuJunShiJiLu(duZiFuCanShu(to.params.jiaoSeId)))
                cunYuQuJiaoJie(to.name, chengNuo)
                return chengNuo
              },
            ],
            zuJian: jiaZaiJunShiJiLu,
          },
        },
      },
      {
        path: 'tiao-zhan',
        name: 'tiaoZhanZhuYe',
        component: jiaZaiTiaoZhanZhuYe,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'tiaoZhanZhuYe',
            renWu: [
              async (to) => {
                const [{ huoQuDangQianDuiJu }, { huoQuWoDeGaiKuang }, { use挑战榜单 }] =
                  await Promise.all([
                    import('@/api/挑战'),
                    import('@/api/挑战'),
                    import('@/composables/use挑战榜单'),
                  ])
                const zhuShuJu = anJingHua(
                  Promise.all([huoQuDangQianDuiJu(), huoQuWoDeGaiKuang()]),
                )
                cunYuQuJiaoJie(to.name, zhuShuJu)
                return Promise.all([zhuShuJu, use挑战榜单().yuQuQuanBu(tiaoZhanZuBieLieBiao)])
              },
            ],
            zuJian: jiaZaiTiaoZhanZhuYe,
          },
        },
      },
      {
        path: 'tiao-zhan/pai-hang',
        name: 'tiaoZhanPaiHangBang',
        component: jiaZaiTiaoZhanPaiHangBang,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'tiaoZhanPaiHangBang',
            renWu: [
              async (to) => {
                const { huoQuPaiHangBang } = await import('@/api/挑战')
                const chengNuo = anJingHua(huoQuPaiHangBang('nan_nv'))
                cunYuQuJiaoJie(to.name, chengNuo)
                return chengNuo
              },
            ],
            zuJian: jiaZaiTiaoZhanPaiHangBang,
          },
        },
      },
      {
        path: 'hao-you',
        name: 'haoYouLieBiao',
        component: jiaZaiHaoYouLieBiao,
        meta: {
          xuYaoDengLu: true,
          yuJiaZai: {
            wenAn: 'haoYouLieBiao',
            renWu: [
              async () => {
                const { 使用好友仓库 } = await import('@/stores/好友')
                return 使用好友仓库().chuShiHua()
              },
            ],
            zuJian: jiaZaiHaoYouLieBiao,
          },
        },
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
      {
        path: 'sheng-yin',
        name: 'shengYin',
        component: () => import('@/views/声音设置.vue'),
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

router.beforeEach(async (to, _from) => {
  tuiJinLuYouPiCi()
  const youLingPai = Boolean(huoQuLingPai())
  if (to.meta.xuYaoDengLu && !youLingPai) {
    return { name: 'dengLu', replace: true }
  }
  const yuJiaZai = to.meta.yuJiaZai
  if (yuJiaZai && youLingPai && _from.matched.length > 0) {
    await kaiShiLuYouYuQu(yuJiaZai, to)
  }
})

zhuCeLuYouCuoWuChuLi(router)

export default router
