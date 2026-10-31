import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 创建自动填充守卫 } from '@/utils/禁止自动填充'

const 免禁路由 = new Set(['dengLu', 'wangJiMiWa'])

export function use禁止自动填充(): void {
  const route = useRoute()
  const 守卫 = 创建自动填充守卫(() => 免禁路由.has(route.name as string))
  onMounted(() => 守卫.开始())
  watch(
    () => route.name,
    () => {
      void nextTick(() => 守卫.扫描())
    },
  )
  onBeforeUnmount(() => 守卫.停止())
}
