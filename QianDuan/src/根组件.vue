<template>
  <CuoWuBianJie @cuo-wu-bu-huo="chuLiCuoWuBuHuo">
    <div class="app-rongqi">
      <DuanWangHengFu />
      <QuanJuCaiDan />
      <main class="app-zhuti">
        <router-view v-slot="{ Component }">
          <Transition name="yemian-guodu" mode="out-in">
            <KeepAlive :include="['liaoTian']">
              <component :is="Component" v-if="Component" :key="route.path" />
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
    <div v-if="显示主页雨水" class="zhu-ye-yu-shui" aria-hidden="true" />
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
import { gouJianCaoDiDiZhi } from '@/utils/CaoDiBeiJing'
import { caoDiPeiZhi } from '@/config/站点配置'
import { huoQuFanYi } from '@/config/翻译表'
import { 解析性别 } from '@/utils/性别'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { use禁止自动填充 } from '@/composables/use禁止自动填充'

const route = useRoute()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()

use禁止自动填充()

watch(
  () => 用户仓库.dangQianYongHu?.mo_ren_xing_bie,
  (值) => {
    document.documentElement.dataset.xingBie = 解析性别(值) === 'nv' ? 'nv' : 'nan'
  },
  { immediate: true },
)
const liaoTianLeiLuYou = new Set(['liaoTian', 'haoYouLiaoTian'])
const shiYongCaoDiBeiJing = computed(() => route.name !== undefined && !liaoTianLeiLuYou.has(route.name as string))

const beiJingDiZhi = gouJianCaoDiDiZhi()

const beiJingGuaQi = ref(false)
watch(
  () => route.name,
  (luYouMingCheng) => {
    beiJingGuaQi.value = liaoTianLeiLuYou.has(luYouMingCheng as string)
  },
  { immediate: true },
)

const yingJiaZaiBeiJing = ref(false)
const beiJingChongShiCiShu = ref(0)
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
    const moKuai = await import('@/utils/SanWei')
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

const grassIframe = ref<HTMLIFrameElement | null>(null)
const shangCiGuangBiao = { x: 0, y: 0 }

function chuLiGuangBiaoYiDong(e: PointerEvent) {
  shangCiGuangBiao.x = e.clientX
  shangCiGuangBiao.y = e.clientY
  zhuRuCaoDiGuangBiao()
}

function chuLiChuMoYiDong(e: TouchEvent) {
  const dian = e.touches && e.touches[0]
  if (!dian) return
  shangCiGuangBiao.x = dian.clientX
  shangCiGuangBiao.y = dian.clientY
  zhuRuCaoDiGuangBiao()
}

const luoPanZhiZhen = { x: 0, y: 0 }
const LUO_PAN_MAN_LIANG = 10
let luoPanJiZhun: { beta: number; gamma: number } | null = null
let luoPanYiTing = false
let luoPanYiQingQiu = false
let luoPanYiZhuCe = false

function shiFouChuMo(): boolean {
  if (typeof window === 'undefined') return false
  if ('ontouchstart' in window) return true
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function shouXian(zhi: number): number {
  const fu = LUO_PAN_MAN_LIANG
  return zhi > fu ? fu : zhi < -fu ? -fu : zhi
}

function chuLiLuoPan(e: DeviceOrientationEvent) {
  if (!shiFouChuMo()) return
  const beta = e.beta
  const gamma = e.gamma
  if (beta === null || gamma === null) return
  if (!luoPanJiZhun) luoPanJiZhun = { beta, gamma }
  luoPanZhiZhen.x = shouXian(gamma - luoPanJiZhun.gamma) / LUO_PAN_MAN_LIANG
  luoPanZhiZhen.y = -shouXian(beta - luoPanJiZhun.beta) / LUO_PAN_MAN_LIANG
  luoPanYiTing = true
  zhuRuCaoDiGuangBiao()
}

function zhuCeLuoPan() {
  if (luoPanYiZhuCe) return
  luoPanYiZhuCe = true
  window.addEventListener('deviceorientation', chuLiLuoPan, { passive: true })
}
async function qiDongLuoPan() {
  zhuCeLuoPan()
  if (luoPanYiQingQiu) return
  const lei = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
  if (!lei || typeof lei.requestPermission !== 'function') return
  luoPanYiQingQiu = true
  try {
    const jg = await lei.requestPermission()
    if (jg === 'granted') { luoPanYiZhuCe = true; luoPanJiZhun = null }
  } catch {
    return
  } finally {
    luoPanYiQingQiu = false
  }
}

function chuLiYeMianKeJian() {
  if (!document.hidden) luoPanJiZhun = null
}

interface CaoDiYinQing {
  pointer?: { normalizedPosition?: { x: number; y: number } }
  sizes?: { width: number; height: number }
  canvas?: HTMLCanvasElement
}

interface CaoDiBeiJingTiYan {
  engine?: CaoDiYinQing
}

type CaoDiBeiJingChuangKou = Window & {
  __experience?: CaoDiBeiJingTiYan
  PointerEvent: typeof PointerEvent
}

function zhuRuCaoDiGuangBiao() {
  if (!shiYongCaoDiBeiJing.value || !beiJingJiuXu.value) return
  const cw = grassIframe.value && grassIframe.value.contentWindow
  if (!cw) return
  const cwChuangKou = cw as CaoDiBeiJingChuangKou
  const tiYanDuiXiang = cwChuangKou.__experience
  if (!tiYanDuiXiang || !tiYanDuiXiang.engine) return
  const engine = tiYanDuiXiang.engine

  try {
    const zhiZhen = engine.pointer
    if (zhiZhen && zhiZhen.normalizedPosition) {
      const w = engine.sizes?.width || cwChuangKou.innerWidth || window.innerWidth
      const h = engine.sizes?.height || cwChuangKou.innerHeight || window.innerHeight
      if (luoPanYiTing) {
        zhiZhen.normalizedPosition.x = luoPanZhiZhen.x
        zhiZhen.normalizedPosition.y = luoPanZhiZhen.y
      } else {
        zhiZhen.normalizedPosition.x = (shangCiGuangBiao.x / w - 0.5) * 2
        zhiZhen.normalizedPosition.y = -(shangCiGuangBiao.y / h - 0.5) * 2
      }
    }
  } catch {
    // 注入失败仅影响背景视差，与正常功能无关（背景完全独立）
  }

  try {
    const canvas = engine.canvas
    if (canvas && typeof canvas.dispatchEvent === 'function') {
      const ev = new cwChuangKou.PointerEvent('pointermove', {
        clientX: shangCiGuangBiao.x,
        clientY: shangCiGuangBiao.y,
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

const 显示主页雨水 = computed(() => 设置仓库.zhuYeBeiJingYuShui && shiYongCaoDiBeiJing.value)

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
  window.addEventListener('pointermove', chuLiGuangBiaoYiDong, { passive: true })
  window.addEventListener('touchmove', chuLiChuMoYiDong, { passive: true })
  window.addEventListener('pointerdown', qiDongLuoPan, { passive: true })
  document.addEventListener('visibilitychange', chuLiYeMianKeJian)
  void qiDongLuoPan()
  window.addEventListener('message', chuLiBeiJingXiaoXi)
  void qiDongBeiJingJiaZai()
})

onBeforeUnmount(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', gengXinShiJiaoKouGaoDu)
    window.visualViewport.removeEventListener('scroll', gengXinShiJiaoKouGaoDu)
  }
  window.removeEventListener('pointermove', chuLiGuangBiaoYiDong)
  window.removeEventListener('touchmove', chuLiChuMoYiDong)
  window.removeEventListener('pointerdown', qiDongLuoPan)
  window.removeEventListener('deviceorientation', chuLiLuoPan)
  document.removeEventListener('visibilitychange', chuLiYeMianKeJian)
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
  height: var(--shi-jiao-kou-gao-du);
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

.zhu-ye-yu-shui {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(8, 18, 38, 0.2),
    rgba(8, 18, 38, 0.06) 32%,
    transparent 68%
  );
}

.zhu-ye-yu-shui::before,
.zhu-ye-yu-shui::after {
  content: '';
  position: absolute;
  inset: -22% -12%;
  background-image: repeating-linear-gradient(
    100deg,
    transparent 0 23px,
    rgba(198, 220, 255, 0.3) 23px 24px,
    transparent 24px 49px
  );
  opacity: 0.55;
  animation: zhu-ye-yu-shui-luo 0.9s linear infinite;
  will-change: transform;
}

.zhu-ye-yu-shui::after {
  background-image: repeating-linear-gradient(
    100deg,
    transparent 0 37px,
    rgba(170, 198, 255, 0.2) 37px 38px,
    transparent 38px 71px
  );
  opacity: 0.35;
  animation-duration: 1.45s;
  animation-delay: -0.45s;
}

@keyframes zhu-ye-yu-shui-luo {
  from {
    transform: translate3d(0, -12%, 0);
  }
  to {
    transform: translate3d(-2%, 12%, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .zhu-ye-yu-shui::before,
  .zhu-ye-yu-shui::after {
    animation: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grass-bg-iframe {
    transition: none;
  }
}


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
  gap: var(--jiange-xiao);
  max-width: min(92vw, 480px);
  padding: var(--jiange-10) var(--jiange-12);
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
  padding: var(--jiange-6) var(--jiange-12);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.cao-di-shibai-anniu.guan-bi {
  padding: var(--jiange-6) var(--jiange-10);
}
</style>
