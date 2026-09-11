<template>
  <CuoWuBianJie @cuo-wu-bu-huo="chuLiCuoWuBuHuo">
    <div class="app-rongqi">
      <DuanWangHengFu />
      <QuanJuCaiDan />
      <div class="app-zhuti">
        <router-view v-slot="{ Component }">
          <Transition name="yemian-guodu" mode="out-in">
            <KeepAlive :include="['liaoTian']">
              <component :is="Component" v-if="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </router-view>
      </div>
    </div>
    <!-- 草地 3D 背景：全局单例常驻。加载完全独立于正常功能——应用启动并进入空闲后才
         挂载 iframe（yingJiaZaiBeiJing），主线程先服务登录/主页等真实交互；
         背景加载慢或失败都不影响任何页面功能。除聊天类路由外所有路由可见（含登录页，
         登录页是吴昊阳×草地融合的主舞台）：
         门控揭示——iframe 内部等草地与吴昊阳双就绪后才圆形扩散揭示，
         父页收到 jiu-xu 前保持透明隐藏；任一方超时未就绪则报错并隐藏背景。
         z-index:0 位于 body 渐变背景之上、z-index:1 的应用内容之下；
         进入聊天类路由时缩为屏外 2px 微窗隐藏（文档常驻不销毁，WebGL 上下文保留，
         引擎 rAF 链不断、重开无需重建；2px 正尺寸绘制避免零尺寸帧缓冲 GL 报错，
         每帧开销可忽略），离开时恢复尺寸直接显示、无需重新加载，秒开。
         iframe 挂载后常驻，src 永不切换——切 src 会销毁文档导致每次返回主页都重载。 -->
    <iframe
      v-if="yingJiaZaiBeiJing"
      ref="grassIframe"
      :src="beiJingDiZhi"
      class="grass-bg-iframe"
      :class="{ 'is-active': shiYongCaoDiBeiJing && beiJingJiuXu, 'gua-qi': beiJingGuaQi }"
      :aria-hidden="!(shiYongCaoDiBeiJing && beiJingJiuXu)"
      :title="huoQuFanYi('caoDi', 'beiJingBiaoTi')"
      @error="chuLiBeiJingJiaZaiShiBai"
    ></iframe>
    <div v-if="beiJingShiBai" class="cao-di-shibai-ti-shi" role="alert">
      <span class="cao-di-shibai-wen-an">{{ huoQuFanYi('caoDi', 'jiaZaiShiBaiTiShi') }}</span>
      <button class="cao-di-shibai-anniu" @click="chongShiBeiJing">
        {{ huoQuFanYi('caoDi', 'chongShi') }}
      </button>
      <button
        class="cao-di-shibai-anniu guan-bi"
        :aria-label="huoQuFanYi('tongYong', 'guanBi')"
        @click="guanBiBeiJingTiShi"
      >
        ×
      </button>
    </div>
    <ShiShiRiZhi />
  </CuoWuBianJie>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import CuoWuBianJie from '@/components/错误边界.vue'
import ShiShiRiZhi from '@/components/实时日志.vue'
import DuanWangHengFu from '@/components/断网横幅.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'
import { gouJianCaoDiDiZhi } from '@/utils/caoDiBeiJing'
import { caoDiPeiZhi } from '@/config/站点配置'
import { huoQuFanYi } from '@/config/translations'

const route = useRoute()
const 用户仓库 = 使用用户仓库()
// 聊天类路由（AI 聊天/好友聊天）使用各自的聊天背景，草地背景隐藏让位。
// 登录页（dengLu）保留背景——它是「吴昊阳 × 草地融合」的主舞台，角色要趴在草地上
// 与登录框同屏共存（横向锚定 wuX=5.05 让角色落在登录框右侧，零遮挡）。
// 初始 route.name 为 undefined 时默认不显示，避免首屏闪烁草地 iframe
const liaoTianLeiLuYou = new Set(['liaoTian', 'haoYouLiaoTian'])
const shiYongCaoDiBeiJing = computed(() => route.name && !liaoTianLeiLuYou.has(route.name as string))

// 背景页地址带版本防陈旧缓存：同版本命中浏览器缓存秒开，新版本自动失效重取
const beiJingDiZhi = gouJianCaoDiDiZhi()

// 聊天类路由隐藏草地 iframe（屏外 2px 微窗：文档常驻不销毁，rAF 链不断，
// 正尺寸绘制无 GL 报错），离开时恢复尺寸直接显示：门控就绪态保持，不重置、不重载，秒开。
// immediate 兜住「刷新直达聊天页」的首载场景
const beiJingGuaQi = ref(false)
watch(
  () => route.name,
  (luYouMingCheng) => {
    beiJingGuaQi.value = liaoTianLeiLuYou.has(luYouMingCheng as string)
  },
  { immediate: true },
)

// 背景独立加载：首帧渲染与可交互性优先，等主线程空闲再创建背景 iframe，
// 避免 3D bundle 解析/WebGL 初始化与页面交互抢占主线程（此前"背景没加载好啥也点不了"）
const yingJiaZaiBeiJing = ref(false)
const beiJingChongShiCiShu = ref(0)
// 门控揭示状态：iframe 内部等草地与吴昊阳双就绪后才圆形扩散揭示，
// 并 postMessage 通知父页；父页收到 jiu-xu 前 iframe 保持透明隐藏，
// 收到 shi-bai 则隐藏背景并提示（草地与吴昊阳均不加载，应用照常运行）。
const beiJingJiuXu = ref(false)
const beiJingShiBai = ref(false)
const beiJingShiBaiYuanYin = ref('')

function yuJiaZaiCaoDiZiYuan() {
  try {
    const tu = new Image()
    tu.decoding = 'async'
    tu.src = '/grass-bg/wuhaoyang-2d.png'
  } catch {
    // 预载失败不影响正常功能，下次仍走网络加载
  }
  try {
    const cachesJieKou = (window as unknown as { caches?: CacheStorage }).caches
    if (cachesJieKou && typeof cachesJieKou.open === 'function') {
      cachesJieKou
        .open('cao-di-zi-yuan')
        .then((huanCun) => huanCun.add('/grass-bg/wuhaoyang-2d.png').catch(() => {}))
        .catch(() => {})
    }
  } catch {
    // Cache Storage 不可用时静默跳过
  }
}

function chuLiBeiJingXiaoXi(shiJian: MessageEvent) {
  const shuJu = shiJian.data as { source?: unknown; zhuangTai?: unknown; yuanYin?: unknown } | null
  if (!shuJu || shuJu.source !== 'cao-di-bei-jing') return
  try {
    if (grassIframe.value && shiJian.source !== grassIframe.value.contentWindow) return
  } catch {
    return
  }
  if (shuJu.zhuangTai === 'jiu-xu') {
    beiJingJiuXu.value = true
    beiJingShiBai.value = false
    beiJingShiBaiYuanYin.value = ''
  } else if (shuJu.zhuangTai === 'shi-bai') {
    beiJingJiuXu.value = false
    beiJingShiBai.value = true
    beiJingShiBaiYuanYin.value = typeof shuJu.yuanYin === 'string' ? shuJu.yuanYin : ''
    yingJiaZaiBeiJing.value = false
    chuFaCuoWuShangBao({
      leiBie: 'ziYuan',
      cuoWu: new Error(`caoDiMenKongShiBai:${beiJingShiBaiYuanYin.value || 'weiZhi'}`),
      shiJianChuo: Date.now(),
      fuJia: { laiYuan: 'caoDiMenKong', yuanYin: beiJingShiBaiYuanYin.value },
    })
  }
}

function chongShiBeiJing() {
  beiJingShiBai.value = false
  beiJingShiBaiYuanYin.value = ''
  beiJingJiuXu.value = false
  beiJingChongShiCiShu.value = 0
  yingJiaZaiBeiJing.value = false
  setTimeout(() => {
    yingJiaZaiBeiJing.value = true
  }, 300)
}

function guanBiBeiJingTiShi() {
  beiJingShiBai.value = false
}

function chuLiBeiJingJiaZaiShiBai() {
  beiJingJiuXu.value = false
  if (beiJingChongShiCiShu.value < caoDiPeiZhi.beiJingZuiDaChongShiCiShu) {
    beiJingChongShiCiShu.value += 1
    yingJiaZaiBeiJing.value = false
    setTimeout(() => {
      yingJiaZaiBeiJing.value = true
    }, 2000)
    return
  }
  yingJiaZaiBeiJing.value = false
  beiJingShiBai.value = true
  beiJingShiBaiYuanYin.value = 'iframe'
}

function qiDongBeiJingJiaZai() {
  yuJiaZaiCaoDiZiYuan()
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
interface CaoDiYinQing {
  pointer?: { normalizedPosition?: { x: number; y: number } }
  sizes?: { width: number; height: number }
  canvas?: HTMLCanvasElement
}

type CaoDiBeiJingChuangKou = Window & {
  __experience?: { engine?: CaoDiYinQing }
  PointerEvent: typeof PointerEvent
}

function injectGrassPointer() {
  if (!shiYongCaoDiBeiJing.value || !beiJingJiuXu.value) return
  const cw = grassIframe.value && grassIframe.value.contentWindow
  if (!cw) return
  const cwChuangKou = cw as CaoDiBeiJingChuangKou
  const exp = cwChuangKou.__experience
  if (!exp || !exp.engine) return
  const engine = exp.engine

  // ① 视差：直接喂 normalizedPosition（与原 tL 的 document 监听产出完全一致）
  try {
    const ptr = engine.pointer
    if (ptr && ptr.normalizedPosition) {
      const w = engine.sizes?.width || cwChuangKou.innerWidth || window.innerWidth
      const h = engine.sizes?.height || cwChuangKou.innerHeight || window.innerHeight
      ptr.normalizedPosition.x = (lastClient.x / w - 0.5) * 2
      ptr.normalizedPosition.y = -(lastClient.y / h - 0.5) * 2
    }
  } catch {
    // 注入失败仅影响背景视差，与正常功能无关（背景完全独立）
  }

  // ② 草弯曲：向 engine.canvas 派发合成 pointermove（routes to eventBus "canvas" → raycaster → 草 bender）
  try {
    const canvas = engine.canvas
    if (canvas && typeof canvas.dispatchEvent === 'function') {
      const ev = new cwChuangKou.PointerEvent('pointermove', {
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
  } catch {
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
  window.addEventListener('message', chuLiBeiJingXiaoXi)
  // 应用挂载完成后，等主线程空闲再开始加载草地背景（独立、静默、不阻塞交互）
  qiDongBeiJingJiaZai()
})

onBeforeUnmount(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', gengXinShiJiaoKouGaoDu)
    window.visualViewport.removeEventListener('scroll', gengXinShiJiaoKouGaoDu)
  }
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('message', chuLiBeiJingXiaoXi)
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
    opacity 0.35s var(--quxian-tan-chu),
    transform 0.35s var(--quxian-tan-chu);
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
   门控通过（草地与吴昊阳双就绪，iframe 内部已圆形扩散揭示）后父页才加 .is-active
   以 opacity 淡入显现（父层无圆形扩散，与内层解耦）。不用 visibility:hidden，
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
  transition: opacity 0.8s ease;
}

.grass-bg-iframe.is-active {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .grass-bg-iframe {
    transition: none;
  }
}

/* 聊天类路由挂起态：屏外 2px 微窗隐藏（visibility 隐藏但文档保持可见态，rAF 链不断） */
.grass-bg-iframe.gua-qi {
  left: -10px;
  top: -10px;
  right: auto;
  bottom: auto;
  width: 2px;
  height: 2px;
  opacity: 0;
  visibility: hidden;
}

.cao-di-shibai-ti-shi {
  position: fixed;
  left: 50%;
  bottom: 76px;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(92vw, 480px);
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(20, 24, 40, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  pointer-events: auto;
}

.cao-di-shibai-wen-an {
  flex: 1;
}

.cao-di-shibai-anniu {
  flex: none;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.cao-di-shibai-anniu.guan-bi {
  padding: 6px 10px;
}
</style>
