<template>
  <Teleport to="body">
    <Transition name="yulan-guodu">
      <div
        v-if="dangQian"
        ref="zhezhaoRef"
        class="tupian-yulan-zhezhao"
        role="dialog"
        aria-modal="true"
        :aria-label="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
        tabindex="-1"
        @click.self="guanBi"
        @keydown.esc.prevent="guanBi"
        @keydown.left.prevent="qieHuan(-1)"
        @keydown.right.prevent="qieHuan(1)"
        @touchstart.passive="kaiShiHuaDong"
        @touchend.passive="jieShuHuaDong"
      >
        <div class="tupian-yulan-shi" :class="{ 'shi--chang-tu': changTu }">
          <img
            class="tupian-yulan-da-tu"
            :src="dangQian"
            :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
            @load="chuLiJiaZaiWanCheng"
            @error="guanBi"
          />
        </div>
        <span v-if="tu.length > 1" class="tupian-yulan-ye-ma">{{ xianZaiYeMa }}</span>
        <button
          type="button"
          class="tupian-yulan-guanbi"
          :aria-label="huoQuFanYi('duoMeiTi', 'guanBiYuLan')"
          @click="guanBi"
        >
          ×
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

const CHANG_TU_BI_LI = 2.4
const HUA_DONG_MIN_PIAN_YI = 44

const shuRu = defineProps<{ tu: string[]; xiaBiao: number | null }>()
const faChu = defineEmits<{ 'guan-bi': []; 'geng-xin-xia-biao': [xiaBiao: number] }>()

const zhezhaoRef = ref<HTMLElement | null>(null)
const changTu = ref(false)
let huaDongQiDianX = 0

const dangQian = computed(() => {
  if (shuRu.xiaBiao === null) return null
  return shuRu.tu[shuRu.xiaBiao] ?? null
})

const xianZaiYeMa = computed(() => `${(shuRu.xiaBiao ?? 0) + 1}/${shuRu.tu.length}`)

function guanBi(): void {
  faChu('guan-bi')
}

function qieHuan(buChang: number): void {
  const zongShu = shuRu.tu.length
  if (zongShu < 2 || shuRu.xiaBiao === null) return
  const xin = (shuRu.xiaBiao + buChang + zongShu) % zongShu
  if (xin !== shuRu.xiaBiao) faChu('geng-xin-xia-biao', xin)
}

function chuLiJiaZaiWanCheng(shiJian: Event): void {
  const tu = shiJian.target as HTMLImageElement
  const kuan = tu.naturalWidth
  const gao = tu.naturalHeight
  changTu.value = kuan > 0 && gao / kuan >= CHANG_TU_BI_LI
}

function kaiShiHuaDong(shiJian: TouchEvent): void {
  const dian = shiJian.touches[0]
  huaDongQiDianX = dian ? dian.clientX : 0
}

function jieShuHuaDong(shiJian: TouchEvent): void {
  const dian = shiJian.changedTouches[0]
  if (!dian || !huaDongQiDianX) return
  const pianYi = dian.clientX - huaDongQiDianX
  huaDongQiDianX = 0
  if (Math.abs(pianYi) < HUA_DONG_MIN_PIAN_YI) return
  qieHuan(pianYi < 0 ? 1 : -1)
}

watch(
  () => shuRu.xiaBiao,
  async (xiaBiao) => {
    changTu.value = false
    if (xiaBiao === null) return
    await nextTick()
    zhezhaoRef.value?.focus()
  },
)
</script>

<style scoped>
.tupian-yulan-zhezhao {
  position: fixed;
  inset: 0;
  z-index: var(--ceng-yu-lan);
  background: var(--zhezhao-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  outline: none;
  touch-action: manipulation;
}

.tupian-yulan-shi {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.tupian-yulan-shi--chang-tu {
  align-items: flex-start;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.tupian-yulan-da-tu {
  max-width: 92vw;
  max-height: 92vh;
  object-fit: contain;
  border-radius: var(--yuanjiao-xiao);
}

.tupian-yulan-shi--chang-tu .tupian-yulan-da-tu {
  max-height: none;
  width: min(92vw, 560px);
  height: auto;
}

.tupian-yulan-ye-ma {
  position: absolute;
  bottom: var(--jiange-da);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--jiange-4) var(--jiange-12);
  border-radius: 999px;
  background: var(--chehui-caidan-beijing);
  color: var(--chehui-caidan-wenben);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.tupian-yulan-guanbi {
  position: absolute;
  top: calc(var(--jiange-da) + var(--anquan-quyu-shang));
  right: var(--jiange-da);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--chehui-caidan-beijing);
  color: var(--chehui-caidan-wenben);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.yulan-guodu-enter-active,
.yulan-guodu-leave-active {
  transition: opacity 0.2s ease;
}

.yulan-guodu-enter-from,
.yulan-guodu-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .yulan-guodu-enter-active,
  .yulan-guodu-leave-active {
    transition: none;
  }
}
</style>
