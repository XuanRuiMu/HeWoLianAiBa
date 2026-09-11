import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/variables.css'
import './styles/global.css'
import {
  anZhuangQuanJuCuoWuJianTingQi,
  chuFaCuoWuShangBao,
  chuShiHuaCuoWuShangBao,
} from './utils/错误上报'
import { chuShiHuaXingNengJianKong } from './utils/性能监控'
import { laQuTeZhengKaiGuan } from './utils/teZhengKaiGuan'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

declare global {
  interface Window {
    THREE: typeof THREE
    GLTFLoader: typeof GLTFLoader
  }
}

// 暴露 Three.js 和 GLTFLoader 到全局，供 grass-bg.html iframe 使用（避免多实例）
if (typeof window !== 'undefined') {
  window.THREE = THREE
  window.GLTFLoader = GLTFLoader
}

const app = createApp(App)

laQuTeZhengKaiGuan()

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

app.mount('#app')

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
  if (zuiXin && zuiXin !== benDiBanBenChuo) window.location.reload()
}

huoQuBanBenChuo().then((chuo) => {
  benDiBanBenChuo = chuo
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') jianChaBanBenGengXin()
})
window.addEventListener('focus', jianChaBanBenGengXin)
