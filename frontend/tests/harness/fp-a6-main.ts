/* FP-A6 浮窗缩放取证 harness：直接挂载真实的「管理员监控」浮窗（需求 #7 的贪心弹窗），
   走真实的 use可拖动浮窗 几何单一真源 + 8 向手柄 + position:fixed 宿主契约。
   仅本文件与 html 为取证脚手架，不触碰 frontend/src/**。 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 管理员监控 from '@/components/管理员监控.vue'

const app = createApp(管理员监控)
app.use(createPinia())
app.mount('#fp-a6-app')
