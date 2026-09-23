import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { qieDaoJiaZaiShiBaiYe } from './router/错误处理'
import './styles/variables.css'
import './styles/global.css'
import './styles/liao-tian-qi-pao.css'
import './styles/zhang-hao-an-quan-rong-cao-di.css'
import {
  anZhuangQuanJuCuoWuJianTingQi,
  chuFaCuoWuShangBao,
  chuShiHuaCuoWuShangBao,
} from './utils/错误上报'
import { chuShiHuaXingNengJianKong } from './utils/性能监控'
import { laQuTeZhengKaiGuan } from './utils/teZhengKaiGuan'
import { huoQuFanYi } from './config/translations'
import './utils/sanWei'

const app = createApp(App)

// 根因收敛：后端未启动时首屏即拉开关+埋点穿透502刷控制台error；收敛为延迟到空闲再拉
// 首屏关键渲染优先，后台任务等主线程空闲，禁阻塞登录交互
function yanChiLaQuHouTai() {
  const zhiXing = () => {
    laQuTeZhengKaiGuan()
  }
  try {
    const kongXian = (window as unknown as { requestIdleCallback?: (cb: () => void, opt?: { timeout: number }) => void }).requestIdleCallback
    if (typeof kongXian === 'function') {
      kongXian(zhiXing, { timeout: 8000 })
      return
    }
  } catch {
    // 忽略
  }
  setTimeout(zhiXing, 3000)
}

yanChiLaQuHouTai()

app.use(createPinia())
app.use(router)

app.config.errorHandler = (cuoWu, _shiLi, xinXi) => {
  if (import.meta.env.DEV) console.error('[全局错误处理] Vue 渲染错误:', cuoWu, xinXi)
  chuFaCuoWuShangBao({
    leiBie: 'vue',
    cuoWu,
    shiJianChuo: Date.now(),
    fuJia: { xinXi },
  })
}

chuShiHuaCuoWuShangBao()
anZhuangQuanJuCuoWuJianTingQi()
chuShiHuaXingNengJianKong()

import { 使用主题仓库 } from './stores/主题'
const 主题仓库 = 使用主题仓库()
主题仓库.chuShiHua()

// FP-25 根因：同步 mount 使首帧 route.name=undefined，App.vue `:key="nei-${route.name}"` 在初始
// 路由解析完成时翻转 nei-undefined→nei-liaoTian，out-in 过渡把新页 enter 完全排在 leave 之后
// （leave 依赖 rAF(rAF)）⇒ 冷加载首屏必付两帧门控空白。isReady 只等当前路由解析（守卫+懒载
// 分块），不等任何网络接口，挂载不被推迟到数据就绪。
// M-4（盲区审计）补失败路径：isReady 一旦 reject（懒载分块取不到/守卫抛错），原来的 .then 链
// 不挂载 ⇒ #app 永久空白。现在两条路径都必挂：先无条件挂出外壳与错误边界，再把用户切到静态
// 失败页。失败页不自动刷新（刷新风暴），刷新只在用户点「刷新页面」时发生。
function guaZaiYingYong(): void {
  app.mount('#app')
}

void router.isReady().then(
  guaZaiYingYong,
  (cuoWu: unknown) => {
    guaZaiYingYong()
    void qieDaoJiaZaiShiBaiYe(router, cuoWu)
  },
)

// 首屏版本提示：新版本发布后顶部提示条引导刷新，草稿保护见 use草稿 composable
function xianShiBanBenTiShi(): void {
  if (typeof document === 'undefined') return
  let tiShi = document.getElementById('ban-ben-ti-shi')
  if (!tiShi) {
    tiShi = document.createElement('div')
    tiShi.id = 'ban-ben-ti-shi'
    tiShi.setAttribute('role', 'status')
    const anNiu = document.createElement('button')
    anNiu.type = 'button'
    anNiu.id = 'ban-ben-shua-xin'
    tiShi.appendChild(document.createElement('span'))
    tiShi.appendChild(anNiu)
    document.body.prepend(tiShi)
    anNiu.addEventListener('click', () => window.location.reload())
  }
  const wenAn = tiShi.querySelector('span')
  if (wenAn) wenAn.textContent = huoQuFanYi('tongYong', 'banBenYiGengXin')
  const anNiu = tiShi.querySelector('#ban-ben-shua-xin')
  if (anNiu) anNiu.textContent = huoQuFanYi('tongYong', 'liJiShuaXin')
  tiShi.hidden = false
}

let benDiBanBenChuo: string | null = null

async function huoQuBanBenChuo(): Promise<string | null> {
  try {
    const xiangYing = await fetch(`${import.meta.env.BASE_URL}version.txt`, { cache: 'no-store' })
    if (!xiangYing.ok) return null
    return (await xiangYing.text()).trim()
  } catch {
    return null
  }
}

async function jianChaBanBenGengXin() {
  if (benDiBanBenChuo === null) return
  const zuiXin = await huoQuBanBenChuo()
  if (zuiXin && zuiXin !== benDiBanBenChuo) xianShiBanBenTiShi()
}

huoQuBanBenChuo().then((chuo) => {
  benDiBanBenChuo = chuo
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') jianChaBanBenGengXin()
})
window.addEventListener('focus', jianChaBanBenGengXin)
