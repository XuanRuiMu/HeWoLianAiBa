<template>
  <CuoWuBianJie @cuo-wu-bu-huo="chuLiCuoWuBuHuo">
    <div class="app-rongqi">
      <QuanJuCaiDan />
      <div class="app-zhuti">
        <router-view v-slot="{ Component, route }">
          <Transition name="yemian-guodu" mode="out-in">
            <KeepAlive :include="['liaoTian']">
              <component :is="Component" v-if="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </router-view>
      </div>
    </div>
    <!-- 草地 3D 背景：全局单例。加载完全独立于正常功能——应用启动并进入空闲后才
         挂载 iframe（yingJiaZaiBeiJing），主线程先服务登录/主页等真实交互；
         背景加载慢或失败都不影响任何页面功能。除聊天页外所有路由可见：
         z-index:0 位于 body 渐变背景之上、z-index:1 的应用内容之下；
         opacity:0 时仍在后台运行，进入非聊天路由即淡入。 -->
    <iframe
      v-if="yingJiaZaiBeiJing"
      ref="grassIframe"
      src="/grass-bg/grass-bg.html"
      class="grass-bg-iframe"
      :class="{ 'is-active': shiYongCaoDiBeiJing }"
      :aria-hidden="!shiYongCaoDiBeiJing"
      title="草地背景"
      @error="yingJiaZaiBeiJing = false"
    ></iframe>
    <ShiShiRiZhi />
  </CuoWuBianJie>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import CuoWuBianJie from '@/components/错误边界.vue'
import ShiShiRiZhi from '@/components/实时日志.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'

const 用户仓库 = 使用用户仓库()
const route = useRoute()
// 除聊天页（liaoTian）外所有路由都显示草地背景；聊天页背景静默运行但不可见
const shiYongCaoDiBeiJing = computed(() => route.name !== 'liaoTian')

// 背景独立加载：首帧渲染与可交互性优先，等主线程空闲再创建背景 iframe，
// 避免 3D bundle 解析/WebGL 初始化与页面交互抢占主线程（此前"背景没加载好啥也点不了"）
const yingJiaZaiBeiJing = ref(false)

function qiDongBeiJingJiaZai() {
  const kongXian = 'requestIdleCallback' in window ? window.requestIdleCallback : null
  if (kongXian) {
    kongXian(
      () => {
        yingJiaZaiBeiJing.value = true
      },
      { timeout: 1800 },
    )
  } else {
    setTimeout(() => {
      yingJiaZaiBeiJing.value = true
    }, 800)
  }
}

// 草地背景鼠标交互（忠实移植 jordan-breton.com 原机制）：
// 背景 iframe 设了 pointer-events:none 且压在内容之下，收不到真实鼠标事件；
// 而原网页的「视差晃动」与「草弯曲」都靠 iframe 内部 document/canvas 收到真实 pointermove 驱动。
// 因此由父页（主帧）把鼠标坐标“注入”回 iframe 内部，完全复刻原网页的输入链路：
//
//   ① 视差晃动：原网页 engine.pointer（类 tL）监听 document 的 pointermove，
//      写入 normalizedPosition；parallax（类 rU）每帧读取它并偏移 camera.group.position
//      （注意：是“偏移位置”，不是旋转）。我们直接写 engine.pointer.normalizedPosition
//      （与原监听产出的数据完全一致），由 bundle 自带的 parallax.update()（在其自身 rAF 中）
//      完成相机偏移——绝不手动旋转/平移相机，那是对原机制的误读。
//
//   ② 草弯曲：raycaster/bender（类 HR）订阅 eventBus 的 "canvas" 通道，该通道的真实 DOM
//      监听挂在 engine.canvas 上。我们向 engine.canvas 派发合成 pointermove，事件经 eventBus
//      送达 raycaster，再触发草地 bender（类 Aw）弯曲——不手动改任何 uniform。
//
// 整套流程完全事件驱动（与原网页一致），不依赖父帧 rAF，由 iframe 自身的 rAF 做平滑 lerp。
const grassIframe = ref<HTMLIFrameElement | null>(null)
const lastClient = { x: 0, y: 0 }

function onPointerMove(e: PointerEvent) {
  lastClient.x = e.clientX
  lastClient.y = e.clientY
  injectGrassPointer()
}

// 把当前鼠标坐标注入 iframe 内部，复刻原网页的 document/canvas pointermove 输入
function injectGrassPointer() {
  if (!shiYongCaoDiBeiJing.value) return
  const cw = grassIframe.value && grassIframe.value.contentWindow
  if (!cw) return
  const exp: any = (cw as any).__experience
  if (!exp || !exp.engine) return
  const engine = exp.engine

  // ① 视差：直接喂 normalizedPosition（与原 tL 的 document 监听产出完全一致）
  try {
    const ptr = engine.pointer
    if (ptr && ptr.normalizedPosition) {
      const w = engine.sizes?.width || (cw as any).innerWidth || window.innerWidth
      const h = engine.sizes?.height || (cw as any).innerHeight || window.innerHeight
      ptr.normalizedPosition.x = (lastClient.x / w - 0.5) * 2
      ptr.normalizedPosition.y = -(lastClient.y / h - 0.5) * 2
    }
  } catch (e1) {
    // 注入失败仅影响背景视差，与正常功能无关（背景完全独立）
  }

  // ② 草弯曲：向 engine.canvas 派发合成 pointermove（routes to eventBus "canvas" → raycaster → 草 bender）
  try {
    const canvas = engine.canvas
    if (canvas && typeof canvas.dispatchEvent === 'function') {
      const ev = new (cw as any).PointerEvent('pointermove', {
        clientX: lastClient.x,
        clientY: lastClient.y,
        pointerId: 1,
        pointerType: 'mouse',
        bubbles: true,
        cancelable: false,
        view: cw,
      })
      canvas.dispatchEvent(ev)
    }
  } catch (e2) {
    // 同上：背景交互注入失败不影响任何页面功能
  }
}

function chuLiCuoWuBuHuo(xinXi: {
  cuoWu: unknown
  shiLi: unknown
  xinXi: string
  leiXing: string
  shiJianChuo: number
}) {
  chuFaCuoWuShangBao({
    leiBie: 'vue',
    cuoWu: xinXi.cuoWu,
    shiJianChuo: xinXi.shiJianChuo,
    fuJia: {
      laiYuan: 'cuoWuBianJie',
      xinXi: xinXi.xinXi,
      leiXing: xinXi.leiXing,
    },
  })
}

function gengXinShiJiaoKouGaoDu() {
  if (typeof window === 'undefined' || !window.visualViewport) return
  const gaoDu = window.visualViewport.height
  if (gaoDu > 0) {
    document.documentElement.style.setProperty('--shi-jiao-kou-gao-du', `${gaoDu}px`)
  }
}

function jianCeAnQuanQuYu() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const shiYongDiv = document.createElement('div')
  shiYongDiv.style.position = 'fixed'
  shiYongDiv.style.top = '0'
  shiYongDiv.style.left = '0'
  shiYongDiv.style.width = '0'
  shiYongDiv.style.height = '0'
  shiYongDiv.style.paddingTop = 'env(safe-area-inset-top)'
  shiYongDiv.style.paddingBottom = 'env(safe-area-inset-bottom)'
  shiYongDiv.style.visibility = 'hidden'
  document.body.appendChild(shiYongDiv)
  const shang = window.getComputedStyle(shiYongDiv).paddingTop
  const xia = window.getComputedStyle(shiYongDiv).paddingBottom
  document.body.removeChild(shiYongDiv)
  const zhiChi = (shang && shang !== '0px') || (xia && xia !== '0px')
  if (zhiChi) return

  // 桌面端不进行键盘遮挡兜底推算，避免将浏览器工具栏/任务栏高度误判为底部安全区
  const shiYiDongDuan =
    navigator.maxTouchPoints > 0 &&
    typeof window.screen === 'object' &&
    window.screen !== null &&
    typeof window.screen.width === 'number' &&
    window.screen.width <= 1024
  if (!shiYiDongDuan) {
    document.documentElement.style.setProperty('--anquan-quyu-shang', '0px')
    document.documentElement.style.setProperty('--anquan-quyu-xia', '0px')
    return
  }

  let tuiSuanShang = 0
  let tuiSuanXia = 0
  if (window.screen && typeof window.screen.height === 'number' && window.visualViewport) {
    const chuangKouGaoDu = window.visualViewport.height
    const pingMuGaoDu = window.screen.height
    const chaZhi = Math.max(0, pingMuGaoDu - chuangKouGaoDu)
    if (chaZhi > 0 && chaZhi < 200) {
      if (window.visualViewport.offsetTop > 0) {
        tuiSuanShang = window.visualViewport.offsetTop
      }
      tuiSuanXia = Math.max(0, chaZhi - tuiSuanShang)
    }
  }
  document.documentElement.style.setProperty('--anquan-quyu-shang', `${tuiSuanShang}px`)
  document.documentElement.style.setProperty('--anquan-quyu-xia', `${tuiSuanXia}px`)
}

onMounted(() => {
  用户仓库.queBaoShenFenJiuXu()
  gengXinShiJiaoKouGaoDu()
  jianCeAnQuanQuYu()
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', gengXinShiJiaoKouGaoDu)
    window.visualViewport.addEventListener('scroll', gengXinShiJiaoKouGaoDu)
  }
  // 父帧把鼠标坐标注入 iframe 内部，复刻原网页 document/canvas pointermove 输入链路
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  // 应用挂载完成后，等主线程空闲再开始加载草地背景（独立、静默、不阻塞交互）
  qiDongBeiJingJiaZai()
})

onBeforeUnmount(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', gengXinShiJiaoKouGaoDu)
    window.visualViewport.removeEventListener('scroll', gengXinShiJiaoKouGaoDu)
  }
  window.removeEventListener('pointermove', onPointerMove)
})
</script>

<style scoped>
.app-rongqi {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  height: var(--shi-jiao-kou-gao-du, 100dvh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-zhuti {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.yemian-guodu-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.yemian-guodu-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.yemian-guodu-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.yemian-guodu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 草地 3D 背景：全局固定层，位于内容之下（z-index:-1），不拦截鼠标。
   默认 opacity:0 —— 后台静默加载（文档仍可见、脚本正常跑、WebGL 初始化），
   除聊天页外的路由加 .is-active 才 opacity:1 显现。不用 visibility:hidden，
   否则 iframe 被判定为隐藏、requestAnimationFrame 不触发，导致背景无法在后台预加载。 */
.grass-bg-iframe {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.grass-bg-iframe.is-active {
  opacity: 1;
}
</style>
