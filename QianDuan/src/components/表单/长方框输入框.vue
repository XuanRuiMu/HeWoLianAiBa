<template>
  <span class="chang-fang-kuang-ke">
    <input
      v-if="!多行"
      :id="标识 || undefined"
      ref="输入元素"
      class="chang-fang-kuang-shuru she-zhi-shuru yuan-jiao-shuru-kuang"
      :type="类型"
      :value="模型值"
      :maxlength="最大长度 || undefined"
      :placeholder="占位文字 || ' '"
      :disabled="禁用"
      :readonly="只读"
      :aria-label="标签 || undefined"
      :aria-invalid="错误提示文字 ? 'true' : undefined"
      v-bind="$attrs"
      @input="处理输入"
    />
    <textarea
      v-else
      :id="标识 || undefined"
      ref="输入元素"
      class="chang-fang-kuang-shuru chang-fang-kuang-shuru--duo-hang she-zhi-shuru yuan-jiao-shuru-kuang"
      :rows="行数"
      :value="模型值"
      :maxlength="最大长度 || undefined"
      :placeholder="占位文字 || ' '"
      :disabled="禁用"
      :readonly="只读"
      :aria-label="标签 || undefined"
      :aria-invalid="错误提示文字 ? 'true' : undefined"
      v-bind="$attrs"
      @input="处理输入"
    />
  </span>
  <p v-if="错误提示文字" class="chang-fang-kuang-cuo-wu" role="alert">
    {{ 错误提示文字 }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    标签?: string
    模型值?: string
    类型?: string
    最大长度?: number
    错误提示文字?: string
    禁用?: boolean
    只读?: boolean
    占位文字?: string
    标识?: string
    多行?: boolean
    行数?: number
  }>(),
  {
    标签: '',
    模型值: '',
    类型: 'text',
    最大长度: 0,
    错误提示文字: '',
    禁用: false,
    只读: false,
    占位文字: '',
    标识: '',
    多行: false,
    行数: 3,
  },
)

const emit = defineEmits<{ 'geng-xin': [值: string] }>()

const 输入元素 = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

function 处理输入(事件: Event): void {
  const 目标 = 事件.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('geng-xin', 目标 ? 目标.value : '')
}

function 聚焦(): void {
  输入元素.value?.focus()
}

defineExpose({ 聚焦, 输入元素 })
</script>

<style scoped>
.chang-fang-kuang-ke {
  position: relative;
  display: block;
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  --chang-fang-kuang-wen-se: var(--moSe, var(--wenben-zhuse));
  --chang-fang-kuang-zhan-wei-se: var(--huiSe, var(--wenben-ciuse));
}

.chang-fang-kuang-shuru {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: var(--jiange-12) var(--jiange-12);
  color: var(--chang-fang-kuang-wen-se);
  font-family: inherit;
  font-size: var(--ziti-zhong);
  line-height: 1.5;
}

.chang-fang-kuang-shuru:focus {
  outline: none;
}

.chang-fang-kuang-shuru--duo-hang {
  min-height: 72px;
  line-height: 1.7;
  resize: vertical;
}

.chang-fang-kuang-shuru::placeholder {
  color: var(--chang-fang-kuang-zhan-wei-se);
}

.chang-fang-kuang-shuru:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chang-fang-kuang-cuo-wu {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.6;
  color: var(--cuowu-wenben);
}
</style>
