import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/variables.css'
import './styles/global.css'
import './styles/theme.css'
import {
  anZhuangQuanJuCuoWuJianTingQi,
  chuFaCuoWuShangBao,
  chuShiHuaCuoWuShangBao,
} from './utils/错误上报'
import { chuShiHuaXingNengJianKong } from './utils/性能监控'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.config.errorHandler = (cuoWu, _shiLi, xinXi) => {
  console.error('[全局错误处理] Vue 渲染错误:', cuoWu, xinXi)
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
