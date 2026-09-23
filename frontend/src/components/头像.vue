<template>
  <img
    v-if="shiTu"
    class="touxiang"
    role="img"
    draggable="false"
    :src="tuDiZhi"
    :alt="alt"
    loading="lazy"
    decoding="async"
    @error="chuCuoWu('error')"
  />
  <span
    v-else
    class="touxiang touxiang--zi"
    role="img"
    draggable="false"
    :aria-label="alt"
    >{{ moRenZi }}</span>
</template>

<script lang="ts">
// 兜底字形的唯一真源（FP-31 H1）：调用点只传数据，不得再在任何 .vue 里写第二份默认字形。
// FP-19b 起具名导出：过往战绩的战报海报输入与头像出口共用同一份字形，调用点仍零字面量。
// 取值逐字沿用 FP-19a/FP-31 改前实测值：jiaose = AI 角色气泡、yonghu = 玩家自己气泡、
// duiju = 对局头像（FP-19b 收 挑战主页 的兜底字形）。
export const MO_REN_ZI = { jiaose: '👤', yonghu: '🧑', duiju: '⚔️' } as const
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import { shiTuPianDiZhi } from '@/utils/头像'

const props = defineProps<{
  touXiang?: string | null
  moRenZi?: string
  shenFen?: 'jiaose' | 'yonghu' | 'duijue'
}>()

// 图片加载失败的事件出口（FP-19b）：军师指导/军师记录详情 的「加载失败→落文字分支」手势
// 需要感知原生 error，由宿主自行改绑数据后回灌本组件，字形真源仍只有一份。
const chuCuoWu = defineEmits<{ error: [] }>()

const shiTu = computed(() => shiTuPianDiZhi(props.touXiang))
const tuDiZhi = computed(() => props.touXiang ?? '')
// 调用点给了占位数据就用它（emoji 头像走这一路）；只给了身份且无数据时才落本组件的兜底字形。
const moRenZi = computed(
  () => props.moRenZi?.trim() || (props.shenFen ? MO_REN_ZI[props.shenFen] : ''),
)
const alt = huoQuFanYi('haoYou', 'touXiang')
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
