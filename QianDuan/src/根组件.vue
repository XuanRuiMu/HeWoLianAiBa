<template>
  <CuoWuBianJie @cuo-wu-bu-huo="chuLiCuoWuBuHuo">
    <div class="app-rongqi" :class="{ 'shi-jian-pan': shiLiaoTianLeiLuYou }">
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
    <div
      class="cao-di-jiang-ji"
      :class="{ 'is-yin-cang': jiangJiYinCang, 'is-zan-ting': !shiYongCaoDiBeiJing }"
      aria-hidden="true"
    >
      <div class="jiang-ji-xing-kong" />
      <div class="jiang-ji-yue-liang" />
      <div class="jiang-ji-ji-guang jiang-ji-ji-guang--yi" />
      <div class="jiang-ji-ji-guang jiang-ji-ji-guang--er" />
      <svg class="jiang-ji-di-ping" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="cao-di-jiang-ji-yuan-shan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3d2168" />
            <stop offset="1" stop-color="#160b26" />
          </linearGradient>
          <linearGradient id="cao-di-jiang-ji-jin-shan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2a1547" />
            <stop offset="1" stop-color="#0d0718" />
          </linearGradient>
        </defs>
        <path
          d="M0 118 C 180 58 330 148 520 102 C 720 54 900 132 1100 90 C 1250 60 1360 100 1440 82 L 1440 220 L 0 220 Z"
          fill="url(#cao-di-jiang-ji-yuan-shan)"
        />
        <path
          d="M0 162 C 220 122 400 192 640 152 C 880 112 1100 182 1440 142 L 1440 220 L 0 220 Z"
          fill="url(#cao-di-jiang-ji-jin-shan)"
        />
      </svg>
      <div class="jiang-ji-zao-dian" />
    </div>
    <iframe
      v-if="yingJiaZaiBeiJing"
      ref="grassIframe"
      :src="beiJingDiZhi"
      class="grass-bg-iframe"
      :class="{ 'is-active': shiYongCaoDiBeiJing && beiJingJiuXu, 'is-zan-ting': beiJingGuaQi }"
      :aria-hidden="!(shiYongCaoDiBeiJing && beiJingJiuXu)"
      :title="huoQuFanYi('caoDi', 'beiJingBiaoTi')"
      @load="beiJingYiJiaZai"
      @error="chuLiBeiJingJiaZaiShiBai"
    ></iframe>
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
import { gouJianCaoDiDiZhi, shiFouCaoDiDiaoShi } from '@/utils/CaoDiBeiJing'
import { BUJU_PEI_ZHI, caoDiPeiZhi } from '@/config/站点配置'
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
const shiLiaoTianLeiLuYou = computed(
  () => route.name !== undefined && liaoTianLeiLuYou.has(route.name as string),
)
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
const jiangJiYinCang = computed(() => !shiYongCaoDiBeiJing.value || beiJingJiuXu.value)
let beiJingDengDaiDingShiQi: ReturnType<typeof setTimeout> | null = null
let jieShiDengDaiDingShiQi: ReturnType<typeof setTimeout> | null = null
let jieShiQiangZhiDingShiQi: ReturnType<typeof setTimeout> | null = null
let beiJingChangJingYiJiuXu = false
let yiShangBaoBeiJingShiBai = false

function qingLiBeiJingDengDai(): void {
  if (beiJingDengDaiDingShiQi === null) return
  clearTimeout(beiJingDengDaiDingShiQi)
  beiJingDengDaiDingShiQi = null
}

function qingLiJieShiDengDai(): void {
  if (jieShiDengDaiDingShiQi !== null) {
    clearTimeout(jieShiDengDaiDingShiQi)
    jieShiDengDaiDingShiQi = null
  }
  if (jieShiQiangZhiDingShiQi !== null) {
    clearTimeout(jieShiQiangZhiDingShiQi)
    jieShiQiangZhiDingShiQi = null
  }
}

function kaiShiBeiJingDengDai(): void {
  qingLiBeiJingDengDai()
  beiJingDengDaiDingShiQi = setTimeout(() => {
    beiJingDengDaiDingShiQi = null
    if (!beiJingChangJingYiJiuXu) chongShiBeiJingJiaZai()
  }, caoDiPeiZhi.beiJingJiuXuChaoShiHaoMiao)
}

function faJieShiWanCheng(): void {
  const chuangKou = grassIframe.value && grassIframe.value.contentWindow
  if (!chuangKou) return
  try {
    chuangKou.postMessage({ type: 'grass-reveal-finish' }, window.location.origin)
  } catch {
    return
  }
}

function kaiShiJieShiDengDai(): void {
  qingLiJieShiDengDai()
  if (beiJingGuaQi.value) faJieShiWanCheng()
  jieShiDengDaiDingShiQi = setTimeout(() => {
    jieShiDengDaiDingShiQi = null
    if (beiJingJiuXu.value) return
    faJieShiWanCheng()
    jieShiQiangZhiDingShiQi = setTimeout(() => {
      jieShiQiangZhiDingShiQi = null
      if (!beiJingJiuXu.value) beiJingJiuXu.value = true
    }, 800)
  }, caoDiPeiZhi.beiJingJieShiChaoShiHaoMiao)
}

function chongShiBeiJingJiaZai(): void {
  qingLiBeiJingDengDai()
  qingLiJieShiDengDai()
  beiJingChangJingYiJiuXu = false
  beiJingJiuXu.value = false
  if (beiJingChongShiCiShu.value >= caoDiPeiZhi.beiJingZuiDaChongShiCiShu) {
    beiJingShiBai.value = true
    return
  }
  beiJingChongShiCiShu.value += 1
  yingJiaZaiBeiJing.value = false
  setTimeout(() => {
    yingJiaZaiBeiJing.value = true
  }, 2000)
}

function tongBuBeiJingZanTing(): void {
  const chuangKou = grassIframe.value && grassIframe.value.contentWindow
  if (!chuangKou) return
  try {
    chuangKou.postMessage(
      { type: 'grass-pause', paused: beiJingGuaQi.value },
      window.location.origin,
    )
  } catch {
    return
  }
}

function tongBuBeiJingYuShui(): void {
  const chuangKou = grassIframe.value && grassIframe.value.contentWindow
  if (!chuangKou) return
  try {
    chuangKou.postMessage(
      { type: 'grass-rain', enabled: 设置仓库.zhuYeBeiJingYuShui },
      window.location.origin,
    )
  } catch {
    return
  }
}

function beiJingYiJiaZai() {
  beiJingShiBai.value = false
  kaiShiBeiJingDengDai()
  tongBuBeiJingZanTing()
  tongBuBeiJingYuShui()
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
    qingLiBeiJingDengDai()
    if (beiJingJiuXu.value) {
      tongBuBeiJingZanTing()
      tongBuBeiJingYuShui()
      shuChuCaoDiZhenDuan('jiu-xu', shuJu)
      return
    }
    beiJingChangJingYiJiuXu = true
    beiJingJiuXu.value = false
    beiJingShiBai.value = false
    yiShangBaoBeiJingShiBai = false
    tongBuBeiJingZanTing()
    tongBuBeiJingYuShui()
    kaiShiJieShiDengDai()
    shuChuCaoDiZhenDuan('jiu-xu', shuJu)
  } else if (shuJu.zhuangTai === 'jie-shi-wan-cheng') {
    qingLiJieShiDengDai()
    if (beiJingJiuXu.value) return
    beiJingJiuXu.value = true
    beiJingShiBai.value = false
    tongBuBeiJingZanTing()
    tongBuBeiJingYuShui()
    shuChuCaoDiZhenDuan('jie-shi-wan-cheng', shuJu)
  } else if (shuJu.zhuangTai === 'shi-bai') {
    qingLiJieShiDengDai()
    beiJingChangJingYiJiuXu = false
    beiJingJiuXu.value = false
    chongShiBeiJingJiaZai()
    if (yiShangBaoBeiJingShiBai) return
    yiShangBaoBeiJingShiBai = true
    const yuanYin = typeof shuJu.yuanYin === 'string' ? shuJu.yuanYin : ''
    shuChuCaoDiZhenDuan('shi-bai', shuJu)
    chuFaCuoWuShangBao({
      leiBie: 'ziYuan',
      cuoWu: new Error(`caoDiMenKongShiBai:${yuanYin || 'weiZhi'}`),
      shiJianChuo: Date.now(),
      fuJia: { laiYuan: 'caoDiMenKong', yuanYin },
    })
  }
}

function shuChuCaoDiZhenDuan(
  zhuangTai: 'jiu-xu' | 'shi-bai' | 'jie-shi-wan-cheng',
  shuJu: unknown,
): void {
  if (!shiFouCaoDiDiaoShi()) return
  let zhenDuan: unknown
  try {
    const chuangKou = grassIframe.value?.contentWindow as
      | (Window & { __caoDiZhunBeiZhuangTai?: unknown })
      | null
    zhenDuan = chuangKou?.__caoDiZhunBeiZhuangTai ?? null
  } catch {
    zhenDuan = null
  }
  if (zhuangTai === 'shi-bai') console.warn('[草地背景] 失败', zhenDuan, shuJu)
  else if (zhuangTai === 'jie-shi-wan-cheng') console.info('[草地背景] 揭示完成', zhenDuan, shuJu)
  else console.info('[草地背景] 就绪', zhenDuan, shuJu)
}

function chuLiBeiJingJiaZaiShiBai() {
  chongShiBeiJingJiaZai()
}

async function qiDongBeiJingJiaZai() {
  try {
    const moKuai = await import('@/utils/SanWei')
    await moKuai.yuJiaZaiSanWei()
  } catch {
    beiJingShiBai.value = true
  }
  await dengDaiZhuXianChengKongXian()
  yingJiaZaiBeiJing.value = true
}

watch([beiJingGuaQi, beiJingJiuXu], () => tongBuBeiJingZanTing())
watch(() => 设置仓库.zhuYeBeiJingYuShui, () => tongBuBeiJingYuShui())

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
  if (typeof window === 'undefined') return
  const buJuGaoDu = window.innerHeight
  document.documentElement.style.setProperty('--bu-ju-gao-du', `${buJuGaoDu}px`)
  if (!window.visualViewport) {
    document.documentElement.style.setProperty('--shi-jiao-kou-gao-du', `${buJuGaoDu}px`)
    return
  }
  const keShiGaoDu = window.visualViewport.height
  if (keShiGaoDu <= 0) return
  const jianPanZhanKai = buJuGaoDu - keShiGaoDu >= BUJU_PEI_ZHI.jianPanZhanKaiYuZhi
  document.documentElement.style.setProperty(
    '--shi-jiao-kou-gao-du',
    `${jianPanZhanKai ? keShiGaoDu : buJuGaoDu}px`,
  )
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
  qingLiBeiJingDengDai()
  qingLiJieShiDengDai()
})
</script>

<style scoped>
.app-rongqi {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  height: var(--bu-ju-gao-du);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-rongqi.shi-jian-pan {
  height: var(--shi-jiao-kou-gao-du);
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

.grass-bg-iframe.is-zan-ting {
  visibility: hidden;
}

.cao-di-jiang-ji {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: linear-gradient(180deg, #050814 0%, #0b1028 34%, #191036 66%, #221040 100%);
  opacity: 1;
  transition: opacity 0.9s ease;
}

.cao-di-jiang-ji.is-yin-cang {
  opacity: 0;
}

.jiang-ji-xing-kong {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.8) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(200, 220, 255, 0.55) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(255, 255, 255, 0.38) 0 1.5px, transparent 2px);
  background-size:
    240px 200px,
    320px 280px,
    460px 360px;
  background-position:
    20px 30px,
    140px 110px,
    60px 200px;
  opacity: 0.5;
  animation: jiang-ji-xing-guang 7s ease-in-out infinite alternate;
}

.jiang-ji-yue-liang {
  position: absolute;
  top: 12%;
  right: 13%;
  width: clamp(68px, 8vw, 108px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #fdf6e3 0%, #eadfc4 56%, #cdbb96 100%);
  box-shadow:
    0 0 28px rgba(253, 246, 227, 0.42),
    0 0 90px rgba(210, 190, 255, 0.28),
    0 0 180px rgba(168, 140, 255, 0.18);
  animation: jiang-ji-yue-liang-hu-xi 9s ease-in-out infinite alternate;
}

.jiang-ji-ji-guang {
  position: absolute;
  width: 84vw;
  height: 62vh;
  border-radius: 50%;
  filter: blur(72px);
  mix-blend-mode: screen;
  animation: jiang-ji-ji-guang-piao 18s ease-in-out infinite alternate;
}

.jiang-ji-ji-guang--yi {
  left: -22%;
  top: -16%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.6), transparent 66%);
}

.jiang-ji-ji-guang--er {
  right: -26%;
  top: 12%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.38), transparent 66%);
  animation-duration: 24s;
  animation-delay: -7s;
}

.jiang-ji-di-ping {
  position: absolute;
  left: -1.5%;
  right: -1.5%;
  bottom: 0;
  width: 103%;
  height: 44vh;
  animation: jiang-ji-di-ping-hu-xi 12s ease-in-out infinite alternate;
}

.jiang-ji-zao-dian {
  position: absolute;
  inset: 0;
  background-image: url('/grass-bg/noise2.png');
  background-size: 320px;
  opacity: 0.1;
  mix-blend-mode: soft-light;
}

.cao-di-jiang-ji.is-yin-cang .jiang-ji-xing-kong,
.cao-di-jiang-ji.is-yin-cang .jiang-ji-yue-liang,
.cao-di-jiang-ji.is-yin-cang .jiang-ji-ji-guang,
.cao-di-jiang-ji.is-yin-cang .jiang-ji-di-ping,
.cao-di-jiang-ji.is-zan-ting .jiang-ji-xing-kong,
.cao-di-jiang-ji.is-zan-ting .jiang-ji-yue-liang,
.cao-di-jiang-ji.is-zan-ting .jiang-ji-ji-guang,
.cao-di-jiang-ji.is-zan-ting .jiang-ji-di-ping {
  animation-play-state: paused;
}

@keyframes jiang-ji-xing-guang {
  from {
    opacity: 0.34;
  }
  to {
    opacity: 0.62;
  }
}

@keyframes jiang-ji-yue-liang-hu-xi {
  from {
    transform: scale(1);
    box-shadow:
      0 0 28px rgba(253, 246, 227, 0.38),
      0 0 90px rgba(210, 190, 255, 0.24),
      0 0 180px rgba(168, 140, 255, 0.14);
  }
  to {
    transform: scale(1.04);
    box-shadow:
      0 0 36px rgba(253, 246, 227, 0.52),
      0 0 110px rgba(210, 190, 255, 0.34),
      0 0 210px rgba(168, 140, 255, 0.22);
  }
}

@keyframes jiang-ji-ji-guang-piao {
  from {
    transform: translate3d(-3%, -2%, 0) scale(1);
  }
  to {
    transform: translate3d(4%, 3%, 0) scale(1.08);
  }
}

@keyframes jiang-ji-di-ping-hu-xi {
  from {
    transform: translateX(-1.2%);
  }
  to {
    transform: translateX(1.2%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .grass-bg-iframe {
    transition: none;
  }

  .cao-di-jiang-ji {
    transition: none;
  }

  .jiang-ji-xing-kong,
  .jiang-ji-yue-liang,
  .jiang-ji-ji-guang,
  .jiang-ji-di-ping {
    animation: none;
  }
}
</style>
