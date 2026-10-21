<template>
  <Teleport to="body">
    <Transition name="fu-ceng">
      <div
        v-if="xianShi"
        class="fu-ceng-zhe-zhao"
        @click.self="dianJiZheZhaoGuanBi && faChu('guan-bi')"
        @keydown="chuLiJianPan"
      >
        <div
          ref="kuang"
          class="fu-ceng-kuang"
          :class="'fu-ceng-kuang--' + kuan"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="biaoTiBiaoShi"
          :aria-describedby="miaoShu ? miaoShuBiaoShi : undefined"
          tabindex="-1"
        >
          <div class="fu-ceng-tou">
            <h3 :id="biaoTiBiaoShi" class="fu-ceng-biao-ti">{{ biaoTi }}</h3>
            <button type="button" class="fu-ceng-guan-bi" :aria-label="guanBiWenAn" @click="faChu('guan-bi')">
              ×
            </button>
          </div>
          <p v-if="miaoShu" :id="miaoShuBiaoShi" class="fu-ceng-miao-shu">{{ miaoShu }}</p>
          <div v-if="$slots.default" class="fu-ceng-nei-rong">
            <slot />
          </div>
          <div v-if="$slots.jiaoBu" class="fu-ceng-jiao-bu">
            <slot name="jiaoBu" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

const props = withDefaults(
  defineProps<{
    xianShi: boolean
    biaoTi: string
    miaoShu?: string
    kuan?: 'zhong' | 'da'
    dianJiZheZhaoGuanBi?: boolean
  }>(),
  {
    miaoShu: '',
    kuan: 'zhong',
    dianJiZheZhaoGuanBi: true,
  },
)

const faChu = defineEmits<{
  (shiJian: 'guan-bi'): void
}>()

const kuang = ref<HTMLElement | null>(null)
const guanBiWenAn = huoQuFanYi('tongYong', 'guanBi')
const biaoTiBiaoShi = 'fu-ceng-' + Math.random().toString(36).slice(2, 9)
const miaoShuBiaoShi = biaoTiBiaoShi + '-miao-shu'
let xianQianJiaoDian: HTMLElement | null = null
let xianQianYiChu: string | null = null

function quKeJuJiao(): HTMLElement[] {
  if (!kuang.value) return []
  return Array.from(
    kuang.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function jinRu(): void {
  xianQianJiaoDian = document.activeElement instanceof HTMLElement ? document.activeElement : null
  xianQianYiChu = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  void nextTick(() => {
    const shouXuan = kuang.value?.querySelector<HTMLElement>('[data-shou-xuan]')
    const lieBiao = quKeJuJiao()
    ;(shouXuan || lieBiao[0] || kuang.value)?.focus()
  })
}

function liKai(): void {
  document.body.style.overflow = xianQianYiChu || ''
  xianQianYiChu = null
  xianQianJiaoDian?.focus()
  xianQianJiaoDian = null
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    shiJian.stopPropagation()
    faChu('guan-bi')
    return
  }
  if (shiJian.key !== 'Tab') return
  const lieBiao = quKeJuJiao()
  if (lieBiao.length === 0) {
    shiJian.preventDefault()
    kuang.value?.focus()
    return
  }
  const shou = lieBiao[0]
  const wei = lieBiao[lieBiao.length - 1]
  if (shiJian.shiftKey && document.activeElement === shou) {
    shiJian.preventDefault()
    wei.focus()
    return
  }
  if (!shiJian.shiftKey && document.activeElement === wei) {
    shiJian.preventDefault()
    shou.focus()
  }
}

watch(
  () => props.xianShi,
  (zhi, jiuZhi) => {
    if (zhi) jinRu()
    else if (jiuZhi) liKai()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = xianQianYiChu || ''
})
</script>

<style scoped>
.fu-ceng-zhe-zhao {
  position: fixed;
  inset: 0;
  z-index: var(--ceng-xieyi);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-zhong);
  background: var(--zhezhao-beijing);
}

.fu-ceng-kuang {
  width: 100%;
  max-height: calc(100dvh - var(--jiange-da) * 2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  padding: calc(var(--jiange-da) + var(--jiange-4)) var(--jiange-da);
  border: 1.5px solid var(--tanchuang-biankuang);
  border-radius: var(--yuanjiao-da);
  background: var(--tanchuang-beijing);
  box-shadow: var(--tanchuang-yinying);
  color: var(--wenben-zhuse);
}

.fu-ceng-kuang--zhong {
  max-width: 440px;
}

.fu-ceng-kuang--da {
  max-width: 640px;
}

.fu-ceng-tou {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-12);
}

.fu-ceng-biao-ti {
  margin: 0;
  font-size: var(--ziti-da);
  font-weight: 600;
  line-height: 1.35;
  color: var(--tanchuang-biaoti);
}

.fu-ceng-guan-bi {
  flex: none;
  width: var(--wai-guan-re-ku);
  height: var(--wai-guan-re-ku);
  margin: calc(var(--jiange-10) * -1) calc(var(--jiange-12) * -1) 0 0;
  border: none;
  border-radius: var(--yuanjiao-zhong);
  background: transparent;
  color: var(--wenben-ciuse);
  font-size: var(--ziti-da);
  line-height: 1;
  cursor: pointer;
}

.fu-ceng-guan-bi:hover {
  background: var(--tanchuang-fanhui-beijing);
  color: var(--wenben-zhuse);
}

.fu-ceng-guan-bi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.fu-ceng-miao-shu {
  margin: 0;
  font-size: var(--ziti-zhong);
  line-height: 1.65;
  color: var(--wenben-ciuse);
}

.fu-ceng-nei-rong {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.fu-ceng-jiao-bu {
  display: flex;
  justify-content: flex-end;
  gap: var(--jiange-12);
  flex-wrap: wrap;
  padding-top: var(--jiange-4);
}

.fu-ceng-enter-active,
.fu-ceng-leave-active {
  transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.fu-ceng-enter-from,
.fu-ceng-leave-to {
  opacity: 0;
}

.fu-ceng-enter-from .fu-ceng-kuang,
.fu-ceng-leave-to .fu-ceng-kuang {
  transform: translateY(var(--jiange-xiao));
}

.fu-ceng-kuang {
  transition: transform var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu);
}

@media (prefers-reduced-motion: reduce) {
  .fu-ceng-enter-active,
  .fu-ceng-leave-active,
  .fu-ceng-kuang {
    transition: none;
  }
}
</style>
