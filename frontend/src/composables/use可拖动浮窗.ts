import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type 缩放方向 = 'you' | 'xia' | 'youXia'

export interface 可拖动浮窗选项 {
  元素: Ref<HTMLElement | null>
  存储键: string
  横向停靠?: 'zuo' | 'you'
  停靠边距?: number
  最小宽?: number
  最小高?: number
  默认宽?: number
  默认高占比?: number
  标题栏高?: number
  可缩放?: boolean
  支持最小化?: boolean
}

const 拖动阈值像素 = 5

function 取视口(): { 宽: number; 高: number } {
  if (typeof window === 'undefined') return { 宽: 1024, 高: 768 }
  const 视觉 = window.visualViewport
  return {
    宽: Math.round(视觉?.width || window.innerWidth || 1024),
    高: Math.round(视觉?.height || window.innerHeight || 768),
  }
}

function 限制(值: number, 最小: number, 最大: number): number {
  const 下限 = Math.min(最小, 最大)
  const 上限 = Math.max(最小, 最大)
  return Math.min(上限, Math.max(下限, 值))
}

function 读数字(值: unknown): number | null {
  return typeof 值 === 'number' && Number.isFinite(值) ? 值 : null
}

export function use可拖动浮窗(原始选项: 可拖动浮窗选项) {
  const 元素 = 原始选项.元素
  const 存储键 = 原始选项.存储键
  const 横向停靠 = 原始选项.横向停靠 ?? 'you'
  const 边距 = 原始选项.停靠边距 ?? 24
  const 最小宽 = 原始选项.最小宽 ?? 280
  const 最小高 = 原始选项.最小高 ?? 200
  const 默认宽 = 原始选项.默认宽 ?? 420
  const 默认高占比 = 原始选项.默认高占比 ?? 0.55
  const 标题栏高 = 原始选项.标题栏高 ?? 44
  const 可缩放 = 原始选项.可缩放 ?? true
  const 支持最小化 = 原始选项.支持最小化 ?? true

  const 视口 = ref(取视口())
  const 位移 = ref({ x: 0, y: 0 })
  const 用户宽 = ref<number | null>(null)
  const 用户高 = ref<number | null>(null)
  const 最小化 = ref(false)
  const 拖动中 = ref(false)
  const 缩放中 = ref(false)

  const 当前宽 = computed(() =>
    限制(用户宽.value ?? 默认宽, 最小宽, 视口.value.宽 - 边距 * 2),
  )
  const 当前高 = computed(() =>
    限制(
      用户高.value ?? Math.round(视口.value.高 * 默认高占比),
      最小高,
      视口.value.高 - 边距 * 2,
    ),
  )

  const 有效高 = computed(() => (最小化.value ? 标题栏高 : 当前高.value))

  function 钳制位移(x: number, y: number, 宽: number, 高: number) {
    const x最小 = 横向停靠 === 'you' ? 宽 + 边距 - 视口.value.宽 : -边距
    const x最大 = 横向停靠 === 'you' ? 边距 : 视口.value.宽 - 边距 - 宽
    return {
      x: 限制(x, x最小, x最大),
      y: 限制(y, 高 + 边距 - 视口.value.高, 边距),
    }
  }

  // 尺寸/视口一变就重新钳制，否则最小化或缩放后旧位移会越界把浮窗整条推出屏外
  watch([当前宽, 有效高, () => 视口.value.宽, () => 视口.value.高], () => {
    位移.value = 钳制位移(位移.value.x, 位移.value.y, 当前宽.value, 有效高.value)
  })

  const 浮窗样式 = computed<Record<string, string>>(() => {
    const 样式: Record<string, string> = {
      // 标题栏高与停靠边距由本 composable 单向下发，组件 CSS 只消费变量，避免两处各写一份数字
      '--fu-chuang-biaoti-lan-gao': `${标题栏高}px`,
      '--fu-chuang-ting-kao-bian-jv': `${边距}px`,
      width: `${当前宽.value}px`,
      height: `${有效高.value}px`,
      transform: `translate(${位移.value.x}px, ${位移.value.y}px)`,
    }
    if (缩放中.value) 样式.transition = 'none'
    return 样式
  })

  // 最小化只裁外层：内容区恒按展开高布局，滚动位置不被 clientHeight 变化夹走
  const 内容区样式 = computed(() => ({ height: `${当前高.value - 标题栏高}px` }))

  function 持久化() {
    try {
      localStorage.setItem(
        存储键,
        JSON.stringify({
          x: 位移.value.x,
          y: 位移.value.y,
          宽: 用户宽.value,
          高: 用户高.value,
          最小化: 最小化.value,
        }),
      )
    } catch {
      // 偏好写失败不影响浮窗本身
    }
  }

  try {
    const 原文 = localStorage.getItem(存储键)
    if (原文) {
      const 存 = JSON.parse(原文) as Record<string, unknown>
      const 存宽 = 读数字(存.宽)
      const 存高 = 读数字(存.高)
      if (可缩放) {
        if (存宽 !== null) 用户宽.value = 存宽
        if (存高 !== null) 用户高.value = 存高
      }
      if (支持最小化 && typeof 存.最小化 === 'boolean') 最小化.value = 存.最小化
      const x = 读数字(存.x) ?? 0
      const y = 读数字(存.y) ?? 0
      位移.value = 钳制位移(x, y, 当前宽.value, 有效高.value)
    }
  } catch {
    // 无历史偏好时用默认停靠
  }

  let 已按下 = false
  let 起始X = 0
  let 起始Y = 0
  let 起始位移X = 0
  let 起始位移Y = 0

  function 处理拖动(e: PointerEvent) {
    if (!已按下) return
    const 偏移X = e.clientX - 起始X
    const 偏移Y = e.clientY - 起始Y
    if (!拖动中.value) {
      if (Math.hypot(偏移X, 偏移Y) < 拖动阈值像素) return
      拖动中.value = true
      try {
        元素.value?.setPointerCapture(e.pointerId)
      } catch {
        // 捕获失败仍可拖动
      }
    }
    位移.value = 钳制位移(
      起始位移X + 偏移X,
      起始位移Y + 偏移Y,
      当前宽.value,
      有效高.value,
    )
  }

  function 结束拖动(e: PointerEvent) {
    if (!已按下) return
    已按下 = false
    if (拖动中.value) {
      拖动中.value = false
      try {
        if (元素.value?.hasPointerCapture(e.pointerId)) 元素.value.releasePointerCapture(e.pointerId)
      } catch {
        // 忽略释放异常
      }
      持久化()
    }
    window.removeEventListener('pointermove', 处理拖动)
    window.removeEventListener('pointerup', 结束拖动)
    window.removeEventListener('pointercancel', 结束拖动)
  }

  function 开始拖动(e: PointerEvent) {
    // 标题栏内任何按钮都不触发拖动（最小化/排序/关闭点击直达）
    if ((e.target as HTMLElement).closest('button')) return
    if (!元素.value) return
    已按下 = true
    起始X = e.clientX
    起始Y = e.clientY
    起始位移X = 位移.value.x
    起始位移Y = 位移.value.y
    window.addEventListener('pointermove', 处理拖动)
    window.addEventListener('pointerup', 结束拖动)
    window.addEventListener('pointercancel', 结束拖动)
  }

  let 正在缩放 = false
  let 缩放起始X = 0
  let 缩放起始Y = 0
  let 缩放起始宽 = 0
  let 缩放起始高 = 0
  let 缩放指针方向: 缩放方向 = 'youXia'

  function 处理缩放(e: PointerEvent) {
    if (!正在缩放) return
    const 增宽 = 缩放指针方向 === 'you' || 缩放指针方向 === 'youXia' ? e.clientX - 缩放起始X : 0
    const 增高 = 缩放指针方向 === 'xia' || 缩放指针方向 === 'youXia' ? e.clientY - 缩放起始Y : 0
    用户宽.value = 限制(缩放起始宽 + 增宽, 最小宽, 视口.value.宽 - 边距 * 2)
    用户高.value = 限制(缩放起始高 + 增高, 最小高, 视口.value.高 - 边距 * 2)
  }

  function 结束缩放(e: PointerEvent) {
    if (!正在缩放) return
    正在缩放 = false
    缩放中.value = false
    try {
      if (元素.value?.hasPointerCapture(e.pointerId)) 元素.value.releasePointerCapture(e.pointerId)
    } catch {
      // 忽略释放异常
    }
    window.removeEventListener('pointermove', 处理缩放)
    window.removeEventListener('pointerup', 结束缩放)
    window.removeEventListener('pointercancel', 结束缩放)
    持久化()
  }

  function 开始缩放(e: PointerEvent, 方向: 缩放方向) {
    if (!可缩放 || 最小化.value) return
    e.stopPropagation()
    e.preventDefault()
    if (!元素.value) return
    缩放起始宽 = 当前宽.value
    缩放起始高 = 当前高.value
    正在缩放 = true
    缩放中.value = true
    缩放指针方向 = 方向
    缩放起始X = e.clientX
    缩放起始Y = e.clientY
    try {
      元素.value.setPointerCapture(e.pointerId)
    } catch {
      // 捕获失败仍可缩放
    }
    window.addEventListener('pointermove', 处理缩放)
    window.addEventListener('pointerup', 结束缩放)
    window.addEventListener('pointercancel', 结束缩放)
  }

  function 切换最小化() {
    if (!支持最小化) return
    最小化.value = !最小化.value
    持久化()
  }

  function 更新视口() {
    视口.value = 取视口()
  }

  onMounted(() => {
    window.addEventListener('resize', 更新视口)
    window.visualViewport?.addEventListener('resize', 更新视口)
    window.visualViewport?.addEventListener('scroll', 更新视口)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', 更新视口)
    window.visualViewport?.removeEventListener('resize', 更新视口)
    window.visualViewport?.removeEventListener('scroll', 更新视口)
    window.removeEventListener('pointermove', 处理拖动)
    window.removeEventListener('pointerup', 结束拖动)
    window.removeEventListener('pointercancel', 结束拖动)
    window.removeEventListener('pointermove', 处理缩放)
    window.removeEventListener('pointerup', 结束缩放)
    window.removeEventListener('pointercancel', 结束缩放)
  })

  return {
    位移,
    最小化,
    拖动中,
    缩放中,
    当前宽,
    当前高,
    浮窗样式,
    内容区样式,
    开始拖动,
    开始缩放,
    切换最小化,
  }
}
