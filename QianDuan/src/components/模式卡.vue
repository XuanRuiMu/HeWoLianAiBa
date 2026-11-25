<template>
  <button
    v-bind="$attrs"
    class="moshi-kapian"
    type="button"
    :disabled="禁用 || 加载中"
    :aria-busy="加载中 ? 'true' : undefined"
    :data-beijing-zhuangtai="背景状态"
    @click="选择"
  >
    <img
      v-if="正式背景图"
      class="moshi-kapian-beijing-tu"
      :src="正式背景图"
      alt=""
      aria-hidden="true"
      :draggable="false"
      @load="背景加载完成"
      @error="背景加载失败"
    />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const 属性 = withDefaults(
  defineProps<{
    背景图?: string
    加载中?: boolean
    禁用?: boolean
  }>(),
  {
    背景图: '',
    加载中: false,
    禁用: false,
  },
)

const emit = defineEmits<{
  选择: []
}>()

type 背景状态类型 = 'empty' | 'loading' | 'loaded' | 'failed'

const 正式背景图 = computed(() => 属性.背景图?.trim() ?? '')
const 背景状态 = ref<背景状态类型>(正式背景图.value ? 'loading' : 'empty')

watch(正式背景图, () => {
  背景状态.value = 正式背景图.value ? 'loading' : 'empty'
})

function 背景加载完成() {
  if (正式背景图.value) 背景状态.value = 'loaded'
}

function 背景加载失败() {
  背景状态.value = 'failed'
}

function 选择() {
  if (属性.禁用 || 属性.加载中) return
  emit('选择')
}
</script>

<style scoped>
.moshi-kapian[data-beijing-zhuangtai='loading'],
.moshi-kapian[data-beijing-zhuangtai='loaded'] {
  background-color: transparent;
}

.moshi-kapian::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background-color: var(--moshi-kapian-zheyan);
  opacity: 0;
  pointer-events: none;
}

.moshi-kapian[data-beijing-zhuangtai='loading']::before,
.moshi-kapian[data-beijing-zhuangtai='loaded']::before {
  opacity: 1;
}

.moshi-kapian-beijing-tu {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.moshi-kapian[data-beijing-zhuangtai='loaded'] > .moshi-kapian-beijing-tu {
  opacity: 1;
}

:slotted(*) {
  position: relative;
  z-index: 2;
}

@media (prefers-reduced-motion: reduce) {
  .moshi-kapian-beijing-tu {
    transition: none;
  }
}
</style>
