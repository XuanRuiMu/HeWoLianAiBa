<template>
  <img
    v-if="shiTu"
    class="touxiang"
    role="img"
    draggable="false"
    :src="tuDiZhi"
    :alt="tiHuanWenBen"
    loading="lazy"
    decoding="async"
    @error="chuCuoWu('error')"
  />
  <span
    v-else
    class="touxiang touxiang--zi"
    role="img"
    draggable="false"
    :aria-label="tiHuanWenBen"
    >{{ moRenZi }}</span>
</template>

<script lang="ts">
export const MO_REN_ZI = { jiaose: '👤', yonghu: '🧑', duiju: '⚔️' } as const
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import { shiTuPianDiZhi } from '@/utils/头像'

const props = defineProps<{
  touXiang?: string | null
  moRenZi?: string
  shenFen?: 'jiaose' | 'yonghu' | 'duiju'
}>()

const chuCuoWu = defineEmits<{ error: [] }>()

const shiTu = computed(() => shiTuPianDiZhi(props.touXiang))
const tuDiZhi = computed(() => props.touXiang ?? '')
const moRenZi = computed(
  () => props.moRenZi?.trim() || (props.shenFen ? MO_REN_ZI[props.shenFen] : ''),
)
const tiHuanWenBen = huoQuFanYi('haoYou', 'touXiang')
</script>

<style scoped>
.touxiang {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}

.touxiang--zi {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
