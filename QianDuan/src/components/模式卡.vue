<template>
  <button
    v-bind="$attrs"
    class="moshi-kapian"
    type="button"
    :disabled="!jinyong || jiaZaiZhong"
    :aria-busy="jiaZaiZhong ? 'true' : undefined"
    :data-beijing-zhuangtai="beiJingZhuangtai"
    @click="xuanZe"
  >
    <img
      v-if="zhengShiBeiJingTu"
      class="moshi-kapian-beijing-tu"
      :src="zhengShiBeiJingTu"
      alt=""
      aria-hidden="true"
      :draggable="false"
      @load="beiJingJiaZaiWanCheng"
      @error="beiJingJiaZaiShiBai"
    />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const 属性 = withDefaults(
  defineProps<{
    beiJingTu?: string
    jiaZaiZhong?: boolean
    jinyong?: boolean
  }>(),
  {
    beiJingTu: '',
    jiaZaiZhong: false,
    jinyong: true,
  },
)

const emit = defineEmits<{
  xuanZe: []
}>()

type BeiJingZhuangtai = 'empty' | 'loading' | 'loaded' | 'failed'

const zhengShiBeiJingTu = computed(() => 属性.beiJingTu?.trim() ?? '')
const beiJingZhuangtai = ref<BeiJingZhuangtai>(zhengShiBeiJingTu.value ? 'loading' : 'empty')

watch(zhengShiBeiJingTu, () => {
  beiJingZhuangtai.value = zhengShiBeiJingTu.value ? 'loading' : 'empty'
})

function beiJingJiaZaiWanCheng() {
  if (zhengShiBeiJingTu.value) beiJingZhuangtai.value = 'loaded'
}

function beiJingJiaZaiShiBai() {
  beiJingZhuangtai.value = 'failed'
}

function xuanZe() {
  if (!属性.jinyong || 属性.jiaZaiZhong) return
  emit('xuanZe')
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
