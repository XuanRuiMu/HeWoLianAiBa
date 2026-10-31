<template>
  <div
    class="hua-gan"
    :class="{ 'hua-gan--jin-yong': jinYong, 'hua-gan--tuo': tuoZhuaiZhong, 'hua-gan--jiao-dian': jiaoDianZhong }"
    :data-testid="ceShiJian"
  >
    <div class="hua-gan-tou">
      <span class="hua-gan-biao-ti">{{ biaoTi }}</span>
      <span class="hua-gan-du-shu">{{ duShu }}</span>
    </div>

    <div class="hua-gan-qu">
      <span class="hua-gan-gui-dao" aria-hidden="true"></span>
      <span class="hua-gan-tian-chong" aria-hidden="true" :style="{ width: tianChongKuanDu }"></span>
      <span class="hua-gan-hua-kuai" aria-hidden="true" :style="{ left: huaKuaiWeiZhi }"></span>
      <input
        ref="shuRu"
        class="hua-gan-shu-ru"
        type="range"
        :min="zuiXiao"
        :max="zuiDa"
        :step="buJin"
        :value="zhi"
        :disabled="jinYong"
        :aria-label="biaoTi"
        :aria-valuemin="zuiXiao"
        :aria-valuemax="zuiDa"
        :aria-valuenow="zhi"
        :aria-valuetext="duShu"
        :data-zhi="zhi"
        @input="chuLiShuRu"
        @keydown="chuLiJianPan"
        @pointerdown="kaiShiTuo"
        @pointerup="jieShuTuo"
        @pointercancel="jieShuTuo"
        @focus="chuLiJiaoDian"
        @blur="jiaoDianZhong = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    biaoTi: string
    zhi: number
    duShu: string
    ceShiJian?: string
    zuiXiao?: number
    zuiDa?: number
    buJin?: number
    jinYong?: boolean
  }>(),
  {
    ceShiJian: undefined,
    zuiXiao: 0,
    zuiDa: 100,
    buJin: 1,
    jinYong: false,
  },
)

const emit = defineEmits<{
  (e: 'geng-xin', zhi: number): void
}>()

const SHIFT_BU_JIN = 10

const shuRu = ref<HTMLInputElement | null>(null)
const tuoZhuaiZhong = ref(false)
const jiaoDianZhong = ref(false)

const baiFenBi = computed(() => {
  const kuan = props.zuiDa - props.zuiXiao
  if (kuan <= 0) return 0
  return Math.min(1, Math.max(0, (props.zhi - props.zuiXiao) / kuan))
})

const huaKuaiWeiZhi = computed(
  () => `calc(var(--hua-gan-hua-kuai) / 2 + (100% - var(--hua-gan-hua-kuai)) * ${baiFenBi.value})`,
)

const tianChongKuanDu = computed(
  () => `calc((100% - var(--hua-gan-hua-kuai)) * ${baiFenBi.value})`,
)

function chuLiShuRu(shiJian: Event): void {
  const yuanSu = shiJian.target as HTMLInputElement | null
  if (!yuanSu) return
  emit('geng-xin', Number(yuanSu.value))
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
  if (!shiJian.shiftKey) return
  if (shiJian.key !== 'ArrowLeft' && shiJian.key !== 'ArrowRight') return
  const yuanSu = shiJian.target as HTMLInputElement | null
  if (!yuanSu || props.jinYong) return
  const fangXiang = shiJian.key === 'ArrowLeft' ? -1 : 1
  const muBiao = Math.min(props.zuiDa, Math.max(props.zuiXiao, Number(yuanSu.value) + fangXiang * SHIFT_BU_JIN))
  shiJian.preventDefault()
  if (muBiao === Number(yuanSu.value)) return
  yuanSu.value = String(muBiao)
  emit('geng-xin', muBiao)
}

function chuLiJiaoDian(shiJian: FocusEvent): void {
  const yuanSu = shiJian.target as HTMLElement | null
  jiaoDianZhong.value = yuanSu ? yuanSu.matches(':focus-visible') : false
}

function kaiShiTuo(): void {
  tuoZhuaiZhong.value = true
}

function jieShuTuo(): void {
  tuoZhuaiZhong.value = false
}

function juJiao(): void {
  shuRu.value?.focus()
}

defineExpose({ juJiao })
</script>

<style scoped>
.hua-gan {
  --hua-gan-hua-kuai: 20px;
  --hua-gan-gui-dao-gao: 6px;
  --hua-gan-re-ku: 44px;
  --hua-gan-huan-yuan: 999px;
  --hua-gan-jin-1: #f7d27a;
  --hua-gan-jin-2: #d9a441;
  --hua-gan-jin-yuan: #8a5f12;
  --hua-gan-gui-dao-se: rgba(255, 255, 255, 0.16);
  --hua-gan-hua-kuai-se: #ffffff;
  --hua-gan-wen-ben: #ffffff;
  --hua-gan-ci-wen-ben: #d8d8de;
  --hua-gan-du-shu-se: #f7d27a;
  --hua-gan-guang: rgba(247, 210, 122, 0.45);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
  padding: var(--jiange-11) var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(28, 28, 33, 0.92);
  transition: border-color 0.2s var(--quxian-biao-zhun), box-shadow 0.2s var(--quxian-biao-zhun);
}

:root[data-theme='light'] .hua-gan {
  --hua-gan-jin-1: #e8b94f;
  --hua-gan-jin-2: #c08a1c;
  --hua-gan-jin-yuan: #7a5208;
  --hua-gan-gui-dao-se: rgba(20, 22, 26, 0.18);
  --hua-gan-hua-kuai-se: #ffffff;
  --hua-gan-wen-ben: #14161a;
  --hua-gan-ci-wen-ben: #3f434a;
  --hua-gan-du-shu-se: #6b4706;
  --hua-gan-guang: rgba(192, 138, 28, 0.4);
  border-color: rgba(20, 22, 26, 0.12);
  background: rgba(255, 255, 255, 0.94);
}

.hua-gan--jiao-dian,
.hua-gan--tuo {
  border-color: var(--hua-gan-jin-2);
}

.hua-gan--jin-yong {
  --hua-gan-gui-dao-se: rgba(255, 255, 255, 0.08);
  --hua-gan-jin-1: rgba(255, 255, 255, 0.22);
  --hua-gan-jin-2: rgba(255, 255, 255, 0.16);
  --hua-gan-jin-yuan: rgba(255, 255, 255, 0.1);
  --hua-gan-hua-kuai-se: rgba(255, 255, 255, 0.38);
  --hua-gan-du-shu-se: var(--hua-gan-ci-wen-ben);
  --hua-gan-guang: transparent;
}

:root[data-theme='light'] .hua-gan--jin-yong {
  --hua-gan-gui-dao-se: rgba(20, 22, 26, 0.08);
  --hua-gan-jin-1: rgba(20, 22, 26, 0.2);
  --hua-gan-jin-2: rgba(20, 22, 26, 0.14);
  --hua-gan-jin-yuan: rgba(20, 22, 26, 0.1);
  --hua-gan-hua-kuai-se: rgba(20, 22, 26, 0.3);
  --hua-gan-du-shu-se: var(--hua-gan-ci-wen-ben);
}

.hua-gan-tou {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--jiange-xiao);
}

.hua-gan-biao-ti {
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--hua-gan-wen-ben);
}

.hua-gan-du-shu {
  font-size: var(--ziti-xiao);
  font-weight: 600;
  color: var(--hua-gan-du-shu-se);
  font-variant-numeric: tabular-nums;
}

.hua-gan-qu {
  position: relative;
  height: var(--hua-gan-re-ku);
  display: flex;
  align-items: center;
}

.hua-gan-gui-dao {
  position: absolute;
  left: calc(var(--hua-gan-hua-kuai) / 2);
  right: calc(var(--hua-gan-hua-kuai) / 2);
  top: 50%;
  height: var(--hua-gan-gui-dao-gao);
  transform: translateY(-50%);
  border-radius: var(--hua-gan-huan-yuan);
  background: var(--hua-gan-gui-dao-se);
  pointer-events: none;
}

.hua-gan-tian-chong {
  position: absolute;
  left: calc(var(--hua-gan-hua-kuai) / 2);
  top: 50%;
  height: var(--hua-gan-gui-dao-gao);
  transform: translateY(-50%);
  border-radius: var(--hua-gan-huan-yuan);
  background: linear-gradient(90deg, var(--hua-gan-jin-yuan), var(--hua-gan-jin-2), var(--hua-gan-jin-1));
  box-shadow: 0 0 6px var(--hua-gan-guang);
  pointer-events: none;
}

.hua-gan-hua-kuai {
  position: absolute;
  top: 50%;
  width: var(--hua-gan-hua-kuai);
  height: var(--hua-gan-hua-kuai);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--hua-gan-hua-kuai-se);
  background: radial-gradient(circle at 34% 30%, var(--hua-gan-jin-1), var(--hua-gan-jin-2));
  box-shadow: 0 0 8px var(--hua-gan-guang);
  pointer-events: none;
  transition: box-shadow 0.28s var(--quxian-tan-chu), transform 0.28s var(--quxian-tan-chu);
}

.hua-gan--tuo .hua-gan-hua-kuai,
.hua-gan--jiao-dian .hua-gan-hua-kuai {
  transform: translate(-50%, -50%) scale(1.12);
  box-shadow: 0 0 14px var(--hua-gan-guang);
}

.hua-gan--jin-yong .hua-gan-hua-kuai {
  box-shadow: none;
}

.hua-gan-shu-ru {
  position: relative;
  z-index: 2;
  width: 100%;
  height: var(--hua-gan-re-ku);
  margin: 0;
  padding: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.hua-gan-shu-ru:disabled {
  cursor: not-allowed;
}

.hua-gan-shu-ru:focus {
  outline: none;
}

.hua-gan-shu-ru::-webkit-slider-runnable-track {
  height: var(--hua-gan-re-ku);
  background: transparent;
}

.hua-gan-shu-ru::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: var(--hua-gan-hua-kuai);
  height: var(--hua-gan-hua-kuai);
  margin-top: calc((var(--hua-gan-re-ku) - var(--hua-gan-hua-kuai)) / 2);
  border: none;
  background: transparent;
}

.hua-gan-shu-ru::-moz-range-track {
  height: var(--hua-gan-re-ku);
  background: transparent;
}

.hua-gan-shu-ru::-moz-range-thumb {
  width: var(--hua-gan-hua-kuai);
  height: var(--hua-gan-hua-kuai);
  border: none;
  background: transparent;
}

.hua-gan--jiao-dian .hua-gan-hua-kuai {
  box-shadow: 0 0 0 var(--jujiao-huan-kuan-du) var(--jujiao-huan-yanse), 0 0 12px var(--hua-gan-guang);
}

.hua-gan--jin-yong .hua-gan-biao-ti {
  color: var(--hua-gan-ci-wen-ben);
}
</style>