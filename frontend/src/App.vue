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
    <!-- 草地 3D 背景：全局单例，应用启动即后台静默加载（任何路由都加载），
         仅在主页（zhuJieMian）可见。z-index:0 使其位于 body 渐变背景之上、
         z-index:1 的应用内容之下；opacity:0 时仍在后台运行，主页时淡入。 -->
    <iframe
      ref="grassIframe"
      src="/grass-bg/grass-bg.html"
      class="grass-bg-iframe"
      :class="{ 'is-active': shiZhuYeMian }"
      :aria-hidden="!shiZhuYeMian"
      title="草地背景"
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
// 仅主页（zhuJieMian）显示草地背景；其余路由（含登录页）后台静默加载但不可见
const shiZhuYeMian = computed(() => route.name === 'zhuJieMian')

// 草地背景 iframe 引用 + 鼠标跟随视差的数据桥：
// 背景 iframe 设了 pointer-events:none 且压在应用内容之下，收不到鼠标事件；
// 故在此把归一化光标 postMessage 给 iframe，由其内部轻推相机（CameraGroup）视差。
const grassIframe = ref<HTMLIFrameElement | null>(null)
let cursorRaf = 0
let pendingCursor: { x: number; y: number } | null = null
function zhuanFaShuBiao(e: PointerEvent) {
  pendingCursor = {
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: (e.clientY / window.innerHeight) * 2 - 1,
  }
  if (!cursorRaf) {
    cursorRaf = requestAnimationFrame(() => {
      cursorRaf = 0
      if (pendingCursor && grassIframe.value && grassIframe.value.contentWindow) {
        try {
          grassIframe.value.contentWindow.postMessage(
            { type: 'grass-cursor', x: pendingCursor.x, y: pendingCursor.y },
            '*'
          )
        } catch (err) {}
      }
    })
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
  // 转发鼠标位置给背景 iframe（rAF 节流），恢复"跟随鼠标微晃"
  window.addEventListener('pointermove', zhuanFaShuBiao, { passive: true })
})

onBeforeUnmount(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', gengXinShiJiaoKouGaoDu)
    window.visualViewport.removeEventListener('scroll', gengXinShiJiaoKouGaoDu)
  }
  window.removeEventListener('pointermove', zhuanFaShuBiao)
  if (cursorRaf) cancelAnimationFrame(cursorRaf)
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
   仅主页加 .is-active 才 opacity:1 显现。不用 visibility:hidden，否则 iframe
   被判定为隐藏、requestAnimationFrame 不触发，导致背景无法在后台预加载。 */
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
