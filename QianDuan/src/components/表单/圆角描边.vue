<template>
  <svg
    ref="根"
    class="yuan-jiao-miao-bian"
    :viewBox="'0 0 ' + 宽 + ' ' + 高"
    aria-hidden="true"
    focusable="false"
  >
    <path class="miao-bian miao-bian--zuo" :d="左路" pathLength="1" />
    <path class="miao-bian miao-bian--you" :d="右路" pathLength="1" />
  </svg>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const 属性 = withDefaults(defineProps<{ 激活?: boolean; 描边宽?: number }>(), {
  激活: false,
  描边宽: 2,
})

const 根 = ref<SVGSVGElement | null>(null)
const 宽 = ref(0)
const 高 = ref(0)
const 圆角 = ref(0)
const 描边宽 = ref(2)
let 观察: ResizeObserver | null = null

const 曲线 = 'cubic-bezier(0.4, 0, 0.2, 1)'

function 解析时长文本(样式: CSSStyleDeclaration, 值: string, 已见: Set<string>): number | null {
  const 引用 = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*?)\s*)?\)$/.exec(值)
  if (引用) {
    if (已见.has(引用[1])) return null
    已见.add(引用[1])
    let 替代 = 样式.getPropertyValue(引用[1]).trim()
    if (替代 === '' && 引用[2]) 替代 = 引用[2]
    return 解析时长文本(样式, 替代, 已见)
  }
  const 数 = parseFloat(值)
  if (Number.isNaN(数)) return null
  return 值.endsWith('ms') ? 数 : 数 * 1000
}

function 读时长(名: string): number | null {
  const 壳 = 根.value?.parentElement
  if (!壳) return null
  const 样式 = getComputedStyle(壳)
  return 解析时长文本(样式, 样式.getPropertyValue(名).trim(), new Set([名]))
}

function 减动效(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function 量取(): void {
  const 节点 = 根.value
  const 壳 = 节点?.parentElement
  if (!节点 || !壳) return
  const 盒 = 壳.getBoundingClientRect()
  宽.value = Math.round(盒.width * 100) / 100
  高.value = Math.round(盒.height * 100) / 100
  圆角.value = parseFloat(getComputedStyle(壳).borderTopLeftRadius) || 0
  const 框 = 壳.querySelector('input, textarea')
  if (框) 描边宽.value = parseFloat(getComputedStyle(框).borderTopWidth) || 属性.描边宽
}

function 描边(起: number, 止: number, 时长: number): void {
  const 路们 = 根.value?.querySelectorAll('path')
  if (!路们) return
  路们.forEach((路) => {
    路.getAnimations().forEach((动) => 动.cancel())
    路.animate([{ strokeDashoffset: 起 }, { strokeDashoffset: 止 }], {
      duration: 减动效() ? 0 : 时长,
      easing: 曲线,
      fill: 'forwards',
    })
  })
}

onMounted(() => {
  量取()
  if (typeof ResizeObserver !== 'undefined' && 根.value?.parentElement) {
    观察 = new ResizeObserver(量取)
    观察.observe(根.value.parentElement)
  }
})

watch(
  () => 属性.激活,
  async (开) => {
    if (!开) {
      const 退回 = 读时长('--miao-bian-tui-chu-shi-chang')
      if (退回 !== null) 描边(0, 1, 退回)
      return
    }
    量取()
    await nextTick()
    const 画入 = 读时长('--miao-bian-shi-chang')
    if (画入 === null) return
    requestAnimationFrame(() => 描边(1, 0, 画入))
  },
)

onBeforeUnmount(() => {
  观察?.disconnect()
  观察 = null
})

function 点(x: number, y: number): string {
  return x.toFixed(2) + ' ' + y.toFixed(2)
}

const 几何 = computed(() => {
  const 内 = 描边宽.value / 2
  const 左 = 内
  const 右 = 宽.value - 内
  const 上 = 内
  const 下 = 高.value - 内
  const 径 = Math.max(0, Math.min(圆角.value, (右 - 左) / 2, (下 - 上) / 2) - 内)
  return { 左, 右, 上, 下, 径 }
})

const 起点 = computed(() => {
  const { 左, 下, 径 } = 几何.value
  return { x: 左 + 径 - 径 * Math.SQRT1_2, y: 下 - 径 + 径 * Math.SQRT1_2 }
})

const 终点 = computed(() => {
  const { 右, 上, 径 } = 几何.value
  return { x: 右 - 径 + 径 * Math.SQRT1_2, y: 上 + 径 - 径 * Math.SQRT1_2 }
})

const 左路 = computed(() => {
  if (宽.value < 4 || 高.value < 4) return ''
  const { 左, 右, 上, 下, 径 } = 几何.value
  const 起 = 起点.value
  const 终 = 终点.value
  return [
    'M ' + 点(起.x, 起.y),
    'A ' + 径 + ' ' + 径 + ' 0 0 1 ' + 点(左, 下 - 径),
    'L ' + 点(左, 上 + 径),
    'A ' + 径 + ' ' + 径 + ' 0 0 1 ' + 点(左 + 径, 上),
    'L ' + 点(右 - 径, 上),
    'A ' + 径 + ' ' + 径 + ' 0 0 1 ' + 点(终.x, 终.y),
  ].join(' ')
})

const 右路 = computed(() => {
  if (宽.value < 4 || 高.value < 4) return ''
  const { 左, 右, 上, 下, 径 } = 几何.value
  const 起 = 起点.value
  const 终 = 终点.value
  return [
    'M ' + 点(起.x, 起.y),
    'A ' + 径 + ' ' + 径 + ' 0 0 0 ' + 点(左 + 径, 下),
    'L ' + 点(右 - 径, 下),
    'A ' + 径 + ' ' + 径 + ' 0 0 0 ' + 点(右, 下 - 径),
    'L ' + 点(右, 上 + 径),
    'A ' + 径 + ' ' + 径 + ' 0 0 0 ' + 点(终.x, 终.y),
  ].join(' ')
})
</script>

<style scoped>
.yuan-jiao-miao-bian {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.miao-bian {
  fill: none;
  stroke: var(--miao-bian-se, currentColor);
  stroke-width: var(--miao-bian-kuan, 2px);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
}
</style>
