<template>
  <CuoWuBianJie @cuo-wu-bu-huo="chuLiCuoWuBuHuo">
    <div class="app-rongqi">
      <DuanWangHengFu />
      <QuanJuCaiDan />
      <main class="app-zhuti">
        <router-view v-slot="{ Component }">
          <Transition name="yemian-guodu" mode="out-in">
            <KeepAlive :include="['liaoTian']">
              <CuoWuBianJie :key="`nei-${String(route.name)}`">
                <component :is="Component" v-if="Component" :key="route.path" />
              </CuoWuBianJie>
            </KeepAlive>
          </Transition>
        </router-view>
      </main>
    </div>
    <iframe
      v-if="yingJiaZaiBeiJing"
      ref="grassIframe"
      :src="beiJingDiZhi"
      class="grass-bg-iframe"
      :class="{ 'is-active': shiYongCaoDiBeiJing && beiJingJiuXu, 'gua-qi': beiJingGuaQi }"
      :aria-hidden="!(shiYongCaoDiBeiJing && beiJingJiuXu)"
      :title="huoQuFanYi('caoDi', 'beiJingBiaoTi')"
      @load="beiJingYiJiaZai"
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
const liaoTianLeiLuYou = new Set(['liaoTian', 'haoYouLiaoTian'])
const shiYongCaoDiBeiJing = computed(() => route.name !== undefined && !liaoTianLeiLuYou.has(route.name as string))

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
// 背景状态：iframe 加载完成后显示，失败时保留应用功能并提示。
const beiJingJiuXu = ref(false)
const beiJingShiBai = ref(false)
const beiJingShiBaiYuanYin = ref('')

function beiJingYiJiaZai() {
  beiJingJiuXu.value = true
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

async function qiDongBeiJingJiaZai() {
  try {
    const moKuai = await import('@/utils/sanWei')
    await moKuai.yuJiaZaiSanWei()
  } catch {
    // 三维块本体取不到（离线/404）：仍挂载 iframe，由其内部等待超时降级为静态兜底图
  }
  await dengDaiZhuXianChengKongXian()
  yingJiaZaiBeiJing.value = true
}

function dengDaiZhuXianChengKongXian(): Promise<void> {
  const kongXian = 'requestIdleCallback' in window ? window.requestIdleCallback : null
  if (kongXian) {
    return new Promise<void>((resolve) => {
      kongXian(() => resolve(), { timeout: caoDiPeiZhi.beiJingKongXianChaoShiHaoMiao })
    })
  }
  return new Promise<void>((resolve) => {
    setTimeout(resolve, caoDiPeiZhi.beiJingKongXianTuiJiHaoMiao)
  })
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
  // 应用挂载完成后，先等父帧三维库预热有结论、再等主线程空闲，才加载草地背景（独立、静默、不阻塞交互）
  void qiDongBeiJingJiaZai()
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

/* 草地 3D 背景：全局固定层，位于内容之下，不拦截鼠标。 */
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
