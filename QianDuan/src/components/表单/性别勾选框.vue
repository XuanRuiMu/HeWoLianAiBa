<template>
  <label class="xing-bie-gou-xuan" :class="`xing-bie-gou-xuan--${档}`">
    <input
      :id="标识 || undefined"
      ref="输入元素"
      type="checkbox"
      :checked="模型值"
      :disabled="禁用"
      @change="处理变更"
    />
    <span class="xing-bie-gou-xuan-wen">{{ 文案 }}</span>
  </label>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const 模型值 = defineModel<boolean>('模型值', { default: false })

const props = withDefaults(
  defineProps<{
    档: 'nan' | 'nv'
    文案: string
    不确定?: boolean
    标识?: string
    禁用?: boolean
  }>(),
  {
    不确定: false,
    标识: '',
    禁用: false,
  },
)

const 输入元素 = ref<HTMLInputElement | null>(null)

function 处理变更(事件: Event): void {
  const 目标 = 事件.target as HTMLInputElement | null
  模型值.value = 目标 ? 目标.checked : false
}

function 同步不确定态(): void {
  const 元素 = 输入元素.value
  if (元素) 元素.indeterminate = props.不确定
}

onMounted(同步不确定态)
watch(() => props.不确定, 同步不确定态)
</script>

<style scoped>
.xing-bie-gou-xuan {
  --xing-bie-gou-xuan-se: var(--xingbie-nan-xuan-biankuang);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-xiao);
  width: 100%;
  padding: var(--jiange-10) 0;
  color: inherit;
  cursor: pointer;
}

.xing-bie-gou-xuan--nv {
  --xing-bie-gou-xuan-se: var(--xingbie-nv-xuan-biankuang);
}

.xing-bie-gou-xuan input[type='checkbox'] {
  flex: none;
  width: var(--gou-xuan-chi-cun);
  height: var(--gou-xuan-chi-cun);
  accent-color: var(--xing-bie-gou-xuan-se);
  cursor: pointer;
}

.xing-bie-gou-xuan input[type='checkbox']:disabled {
  cursor: not-allowed;
}

.xing-bie-gou-xuan-wen {
  font-size: var(--ziti-zhong);
  font-weight: 500;
}
</style>
