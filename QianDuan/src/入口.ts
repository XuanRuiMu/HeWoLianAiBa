import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './根组件.vue'
import router from './router/路由表'
import { qieDaoJiaZaiShiBaiYe } from './router/错误处理'
import './styles/设计令牌.css'
import './styles/全局.css'
import './styles/liao-tian-qi-pao.css'
import './styles/zhang-hao-an-quan-rong-cao-di.css'
import './styles/认证卡片.css'
import {
  anZhuangQuanJuCuoWuJianTingQi,
  chuFaCuoWuShangBao,
  chuShiHuaCuoWuShangBao,
} from './utils/错误上报'
import { chuShiHuaXingNengJianKong } from './utils/性能监控'
import { laQuTeZhengKaiGuan } from './utils/TeZhengKaiGuan'
import { huoQuFanYi } from './config/翻译表'
void import('./utils/SanWei').catch(() => {})

const app = createApp(App)

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
