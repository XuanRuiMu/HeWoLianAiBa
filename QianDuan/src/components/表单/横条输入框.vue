<template>
  <div class="shuru-zu" :class="{ shangFu: 上浮, 'you-fu-jian': 有附加 }">
    <div class="shuru-hang">
      <slot name="前缀" />
      <div class="shuru-zhu-ti">
        <input
          :id="标识"
          ref="输入元素"
          :value="模型值"
          :type="类型"
          class="fenlie-shuru"
          :maxlength="最大长度"
          :inputmode="输入模式"
          :autocomplete="自动填充"
          :readonly="只读"
          :disabled="禁用"
          :aria-invalid="无效 ? 'true' : undefined"
          :required="必填"
          placeholder=" "
          @input="处理输入"
          @change="处理变更"
          @focus="处理聚焦"
          @blur="处理失焦"
          @animationstart="处理自动填充"
        />
        <label :for="标识" class="fudong-biaoqian">{{ 标签 }}</label>
      </div>
      <slot name="后缀" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const 属性 = withDefaults(
  defineProps<{
    模型值: string
    标识: string
    标签: string
    类型?: string
    最大长度?: number
    输入模式?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
    自动完成?: string
    上浮?: boolean
    只读?: boolean
    禁用?: boolean
    无效?: boolean
    必填?: boolean
    有附加?: boolean
  }>(),
  {
    类型: 'text',
    最大长度: undefined,
    输入模式: undefined,
    自动完成: undefined,
    上浮: false,
    只读: false,
    禁用: false,
    无效: false,
    必填: false,
    有附加: false,
  },
)

const 自动填充 = computed(() => 属性.自动完成 ?? (属性.类型 === 'password' ? 'new-password' : 'off'))

const 发出 = defineEmits<{
  (时间: 'geng-xin', 值: string): void
  (时间: 'jiao-dian'): void
  (时间: 'shi-jiao'): void
  (时间: 'shu-ru', 事件: Event): void
  (时间: 'bian-geng', 事件: Event): void
  (时间: 'zi-dong-tian-chong', 事件: Event): void
}>()

const 输入元素 = ref<HTMLInputElement | null>(null)

function 处理输入(事件: Event): void {
  发出('geng-xin', (事件.target as HTMLInputElement).value)
  发出('shu-ru', 事件)
}

function 处理变更(事件: Event): void {
  发出('bian-geng', 事件)
}

function 处理聚焦(): void {
  发出('jiao-dian')
}

function 处理失焦(): void {
  发出('shi-jiao')
}

function 处理自动填充(事件: Event): void {
  发出('zi-dong-tian-chong', 事件)
}

function 聚焦(): void {
  输入元素.value?.focus()
}

defineExpose({ 聚焦 })
</script>

<style scoped>
.shuru-zu {
  position: relative;
}

.shuru-hang {
  display: flex;
  align-items: flex-end;
  gap: var(--shuru-fu-jian-jian-ju);
  min-width: 0;
}

.shuru-zhu-ti {
  position: relative;
  flex: 1;
  min-width: 0;
}
</style>
