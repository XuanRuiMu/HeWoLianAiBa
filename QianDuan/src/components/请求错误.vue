<template>
  <section
    v-if="cuoWu?.xianShi && !yiGuanBi"
    class="qian-tai-cuo-wu cuowu-tishi"
    :class="{ 'qian-tai-cuo-wu--mi-xi': miXi }"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    :aria-busy="zhongZai ? 'true' : 'false'"
  >
    <div class="cuowu-tishi-tou">
      <span class="cuowu-tishi-tubiao-wei" aria-hidden="true">
        <svg
          class="qian-tai-cuo-wu-tubiao"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="7.5" x2="12" y2="13" />
          <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
        </svg>
      </span>

      <div class="cuowu-tishi-wen">
        <p class="qian-tai-cuo-wu-wen-an">{{ cuoWu.lianAiWenAn }}</p>
        <p v-if="cuoWu.xiaYiBu" class="cuowu-tishi-shuo-ming">{{ cuoWu.xiaYiBu }}</p>
      </div>

      <button
        v-if="keGuanBi"
        type="button"
        class="cuowu-tishi-guan-bi"
        :aria-label="huoQuFanYi('tongYong', 'guanBi')"
        @click="guanBiTiShi"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>

    <div
      v-if="cuoWu.xianShiDaiMa || (cuoWu.retryable && xianShiChongShi)"
      class="cuowu-tishi-wei"
    >
      <div v-if="cuoWu.xianShiDaiMa" class="cuowu-tishi-ma-zu">
        <code class="qian-tai-cuo-wu-lian-ai-ma">{{ cuoWu.lianAiMa }}</code>
        <button
          type="button"
          class="qian-tai-cuo-wu-fu-zhi cuowu-tishi-ci-anniu"
          @click="fuZhiLianAiMa"
        >
          {{ huoQuFanYi('tongYong', 'lianAiMaFuZhi') }}
        </button>
        <span
          v-if="fuZhiZhuangTai"
          class="qian-tai-cuo-wu-fu-zhi-zhuang-tai"
          role="status"
          aria-live="polite"
        >
          {{ fuZhiZhuangTai }}
        </span>
      </div>

      <span
        v-if="dengDaiZhong"
        class="qian-tai-cuo-wu-deng-dai"
        role="status"
        aria-live="polite"
      >
        {{ dengDaiWenBen }}
      </span>

      <button
        v-if="cuoWu.retryable && xianShiChongShi"
        type="button"
        class="qian-tai-cuo-wu-chong-shi cuowu-tishi-zhu-anniu chongshi-anniu"
        :disabled="zhongZai || dengDaiZhong"
        @click="faChongShi"
      >
        {{
          zhongZai
            ? huoQuFanYi('tongYong', 'qianTaiCuoWuZhengZaiChongShi')
            : huoQuFanYi('tongYong', 'qianTaiCuoWuChongShi')
        }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import type { QianTaiCuoWuXinXi } from '@/utils/前台错误'

const props = withDefaults(
  defineProps<{
    cuoWu?: QianTaiCuoWuXinXi | null
    zhongZai?: boolean
    miXi?: boolean
    xianShiChongShi?: boolean
    keGuanBi?: boolean
  }>(),
  { cuoWu: null, zhongZai: false, miXi: false, xianShiChongShi: true, keGuanBi: true },
)

const emit = defineEmits<{
  (e: 'chongShi'): void
  (e: 'guanBi'): void
}>()

const fuZhiZhuangTai = ref('')
const dengDaiMiaoHao = ref(0)
const faChongShiZhong = ref(false)
const yiGuanBi = ref(false)
let dengDaiJiShiQi: ReturnType<typeof setInterval> | null = null

const dengDaiZhong = computed(() => dengDaiMiaoHao.value > 0)
const dengDaiWenBen = computed(() =>
  huoQuFanYi('tongYong', 'qianTaiCuoWuQingDeng').replace('{miao}', String(dengDaiMiaoHao.value)),
)

function tingZhiDengDai(): void {
  if (dengDaiJiShiQi) {
    clearInterval(dengDaiJiShiQi)
    dengDaiJiShiQi = null
  }
}

function kaiShiDengDai(weiZhiMiaoHao: number): void {
  tingZhiDengDai()
  dengDaiMiaoHao.value = Math.max(0, Math.ceil(weiZhiMiaoHao / 1000))
  if (dengDaiMiaoHao.value === 0) return
  dengDaiJiShiQi = setInterval(() => {
    dengDaiMiaoHao.value -= 1
    if (dengDaiMiaoHao.value <= 0) {
      dengDaiMiaoHao.value = 0
      tingZhiDengDai()
    }
  }, 1000)
}

watch(
  () => props.cuoWu?.retryAfterMs ?? 0,
  (miaoHao) => kaiShiDengDai(miaoHao),
  { immediate: true },
)

watch(
  () => props.cuoWu,
  () => {
    fuZhiZhuangTai.value = ''
    faChongShiZhong.value = false
    yiGuanBi.value = false
  },
)

onBeforeUnmount(() => {
  tingZhiDengDai()
})

function faChongShi(): void {
  if (props.zhongZai || dengDaiZhong.value || faChongShiZhong.value) return
  faChongShiZhong.value = true
  emit('chongShi')
}

function guanBiTiShi(): void {
  yiGuanBi.value = true
  emit('guanBi')
}

async function fuZhiLianAiMa(): Promise<void> {
  if (!props.cuoWu?.lianAiMa) return
  try {
    if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('clipboard')
    await navigator.clipboard.writeText(props.cuoWu.lianAiMa)
    fuZhiZhuangTai.value = huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiChengGong')
  } catch {
    fuZhiZhuangTai.value = huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiShiBai')
  }
}
</script>

<style scoped>
.qian-tai-cuo-wu {
  --cuowu-tubiao-chicun: var(--jiange-da);
  --cuowu-jianju-tubiao: var(--jiange-12);
  --cuowu-jianju-kuai: var(--jiange-zhong);
  --cuowu-jianju-wen: var(--jiange-4);
  --cuowu-biaoti-hangao: var(--jiange-da);
  display: flex;
  flex-direction: column;
  gap: var(--cuowu-jianju-kuai);
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: var(--cuowu-jianju-kuai);
  border-left: 3px solid var(--cuo-wu-biaoti);
  border-radius: var(--yuanjiao-zhong);
  color: var(--cuo-wu-zhengwen);
  font-size: var(--ziti-xiao);
  line-height: 1.5;
  text-align: left;
}

.qian-tai-cuo-wu--mi-xi {
  gap: var(--cuowu-jianju-tubiao);
  padding: var(--jiange-12);
}

.cuowu-tishi-tou {
  display: flex;
  align-items: flex-start;
  gap: var(--cuowu-jianju-tubiao);
  min-width: 0;
}

.cuowu-tishi-tubiao-wei {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--cuowu-tubiao-chicun);
  height: var(--cuowu-tubiao-chicun);
  color: var(--cuo-wu-biaoti);
}

.qian-tai-cuo-wu-tubiao {
  display: block;
  width: var(--cuowu-tubiao-chicun);
  height: var(--cuowu-tubiao-chicun);
}

.cuowu-tishi-wen {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--cuowu-jianju-wen);
}

.qian-tai-cuo-wu-wen-an {
  margin: 0;
  color: var(--cuo-wu-biaoti);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  line-height: var(--cuowu-biaoti-hangao);
  overflow-wrap: anywhere;
}

.cuowu-tishi-shuo-ming {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  margin: 0;
  overflow: hidden;
  color: var(--cuo-wu-zhengwen);
  font-size: var(--ziti-xiao);
  font-weight: 400;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.cuowu-tishi-guan-bi {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--cuowu-tubiao-chicun);
  height: var(--cuowu-tubiao-chicun);
  margin: 0 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--cuo-wu-zhengwen);
  cursor: pointer;
}

.cuowu-tishi-guan-bi svg {
  width: var(--ziti-zhong);
  height: var(--ziti-zhong);
}

.cuowu-tishi-guan-bi::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.cuowu-tishi-guan-bi:hover {
  background: var(--cuo-wu-dian);
  color: var(--cuo-wu-biaoti);
}

.cuowu-tishi-guan-bi:focus-visible,
.cuowu-tishi-zhu-anniu:focus-visible,
.cuowu-tishi-ci-anniu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.cuowu-tishi-wei {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.cuowu-tishi-ma-zu {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.qian-tai-cuo-wu-lian-ai-ma {
  min-width: 0;
  max-width: 100%;
  padding: var(--cuowu-jianju-wen) var(--jiange-xiao);
  border-radius: var(--yuanjiao-xiao);
  background: var(--cuo-wu-dian);
  color: var(--cuo-wu-zhengwen);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--ziti-xiao);
  line-height: var(--jiange-zhong);
  overflow-wrap: anywhere;
  user-select: text;
}

.qian-tai-cuo-wu-deng-dai,
.qian-tai-cuo-wu-fu-zhi-zhuang-tai {
  color: var(--cuo-wu-zhengwen);
  font-size: var(--ziti-xiao);
}

.qian-tai-cuo-wu-chong-shi,
.qian-tai-cuo-wu-fu-zhi {
  min-height: var(--shuru-anniu-re-ku);
  margin: 0;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: var(--yuanjiao-xiao);
  font: inherit;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.qian-tai-cuo-wu-chong-shi {
  margin-left: auto;
  border: 1px solid var(--cuo-wu-bian);
  background: var(--beijing-kaopian);
  color: var(--cuo-wu-zhengwen);
}

.qian-tai-cuo-wu-fu-zhi {
  border: 1px solid transparent;
  background: transparent;
  color: var(--cuo-wu-zhengwen);
  font-weight: 500;
}

.qian-tai-cuo-wu-chong-shi:hover:not(:disabled),
.qian-tai-cuo-wu-fu-zhi:hover:not(:disabled) {
  border-color: var(--cuo-wu-bian);
  background: var(--cuo-wu-dian);
}

.qian-tai-cuo-wu-chong-shi:disabled {
  cursor: wait;
  opacity: 0.65;
}

.cuowu-tishi-wei:has(.cuowu-tishi-ma-zu) .qian-tai-cuo-wu-chong-shi {
  margin-left: auto;
}

@media (max-width: 640px) {
  .qian-tai-cuo-wu {
    padding: var(--jiange-12);
  }

  .qian-tai-cuo-wu-chong-shi,
  .qian-tai-cuo-wu-fu-zhi {
    width: 100%;
    margin-left: 0;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .qian-tai-cuo-wu-chong-shi,
  .qian-tai-cuo-wu-fu-zhi {
    transition: none;
  }
}
</style>
