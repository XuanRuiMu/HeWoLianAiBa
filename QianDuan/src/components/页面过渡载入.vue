<template>
  <div
    v-if="zhuangTai.jieDuan !== 'guanBi'"
    class="guodu-fugai"
    :class="{ 'guodu-tuichang': zhuangTai.jieDuan === 'tuiChang' }"
    role="status"
    aria-live="polite"
  >
    <canvas ref="huabu" class="guodu-huabu"></canvas>
    <span class="guodu-pingmuwai">{{ zhuangTai.wenAn }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { guoDuZhuangTai, jieShuGuoDu, GuoDuRuChangHaoMiao } from '@/router/预取'
import { 使用主题仓库, 浅色值 } from '@/stores/主题'
import { 建渲染器, 取配色, type 渲染器 } from '@/components/页面过渡/过渡渲染'

const huabu = ref<HTMLCanvasElement | null>(null)
const zhuangTai = guoDuZhuangTai
const 主题仓库 = 使用主题仓库()
const shiQianSe = computed(() => 主题仓库.dangQianZhuti === 浅色值)

let ranran: 渲染器 | null = null
let bangDingHuabu: HTMLCanvasElement | null = null
let zhen: number | null = null

function tingZhi(): void {
  if (zhen !== null) {
    cancelAnimationFrame(zhen)
    zhen = null
  }
}

function gengXinChiCun(): void {
  if (!ranran || !huabu.value) return
  const 宽 = window.innerWidth || document.documentElement.clientWidth || 1280
  const 高 = window.innerHeight || document.documentElement.clientHeight || 720
  ranran.设尺寸(宽, 高, window.devicePixelRatio || 1)
}

function huiZhi(): void {
  if (!ranran) return
  const zhuang = zhuangTai.value
  if (zhuang.jieDuan === 'guanBi') return
  const peiSe = 取配色(shiQianSe.value)
  if (zhuang.jieDuan === 'ruChang') {
    const jinDu = Math.min(1, Math.max(0, (Date.now() - zhuang.ruChangQiDian) / GuoDuRuChangHaoMiao))
    ranran.画(jinDu, null, peiSe)
    return
  }
  const shiChang = Math.max(1, zhuang.tuiChangShiChang)
  const tuiJinDu = Math.min(1, Math.max(0, (Date.now() - zhuang.tuiChangQiDian) / shiChang))
  ranran.画(zhuang.dongJieJinDu, tuiJinDu, peiSe)
  if (tuiJinDu >= 1) jieShuGuoDu(zhuang.banBen)
}

function rengZai(): boolean {
  return zhuangTai.value.jieDuan !== 'guanBi'
}

function xunHuan(): void {
  zhen = null
  if (!rengZai()) return
  huiZhi()
  if (rengZai()) zhen = requestAnimationFrame(xunHuan)
}

function kaiXunHuan(): void {
  tingZhi()
  zhen = requestAnimationFrame(xunHuan)
}

function qiDong(): void {
  const 画 = huabu.value
  if (!画) return
  if (ranran && bangDingHuabu !== 画) {
    ranran.释放()
    ranran = null
  }
  if (!ranran) {
    try {
      ranran = 建渲染器(画)
      bangDingHuabu = 画
    } catch {
      ranran = null
      return
    }
  }
  gengXinChiCun()
  huiZhi()
  kaiXunHuan()
}

watch(
  zhuangTai,
  (xin) => {
    if (xin.jieDuan === 'guanBi') {
      tingZhi()
      return
    }
    qiDong()
  },
  { immediate: true, flush: 'post' },
)

watch(shiQianSe, () => {
  if (ranran && zhuangTai.value.jieDuan !== 'guanBi') {
    huiZhi()
    kaiXunHuan()
  }
})

onMounted(() => {
  window.addEventListener('resize', gengXinChiCun)
  if (zhuangTai.value.jieDuan !== 'guanBi') qiDong()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', gengXinChiCun)
  tingZhi()
  ranran?.释放()
  ranran = null
})
</script>

<style scoped>
.guodu-fugai {
  position: fixed;
  inset: 0;
  z-index: var(--ceng-guodu);
  overflow: hidden;
  pointer-events: auto;
  background: transparent;
}

.guodu-tuichang {
  pointer-events: none;
}

.guodu-huabu {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.guodu-pingmuwai {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
