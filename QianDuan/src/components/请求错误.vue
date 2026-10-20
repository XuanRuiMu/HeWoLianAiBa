<template>
  <section
    v-if="cuoWu?.xianShi"
    class="qian-tai-cuo-wu cuowu-tishi"
    :class="{ 'qian-tai-cuo-wu--mi-xi': miXi }"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    :aria-busy="zhongZai ? 'true' : 'false'"
  >
    <div class="qian-tai-cuo-wu-tou">
      <svg
        class="qian-tai-cuo-wu-tubiao"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="7.5" x2="12" y2="13" />
        <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
      </svg>
      <p class="qian-tai-cuo-wu-wen-an">{{ cuoWu.lianAiWenAn }}</p>
    </div>

    <div v-if="cuoWu.xianShiDaiMa" class="qian-tai-cuo-wu-lian-ai-hang">
      <code class="qian-tai-cuo-wu-lian-ai-ma">{{ cuoWu.lianAiMa }}</code>
      <button type="button" class="qian-tai-cuo-wu-fu-zhi" @click="fuZhiLianAiMa">
        {{ huoQuFanYi('tongYong', 'lianAiMaFuZhi') }}
      </button>
    </div>
    <span v-if="fuZhiZhuangTai" class="qian-tai-cuo-wu-fu-zhi-zhuang-tai" role="status" aria-live="polite">
      {{ fuZhiZhuangTai }}
    </span>

    <div v-if="cuoWu.retryable && xianShiChongShi" class="qian-tai-cuo-wu-cao-zuo">
      <button
        type="button"
        class="qian-tai-cuo-wu-chong-shi chongshi-anniu kong-tai-anniu"
        :disabled="zhongZai || dengDaiZhong"
        @click="faChongShi"
      >
        {{
          zhongZai
            ? huoQuFanYi('tongYong', 'qianTaiCuoWuZhengZaiChongShi')
            : huoQuFanYi('tongYong', 'qianTaiCuoWuChongShi')
        }}
      </button>
      <span
        v-if="dengDaiZhong"
        class="qian-tai-cuo-wu-deng-dai"
        role="status"
        aria-live="polite"
      >
        {{ dengDaiWenBen }}
      </span>
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
  }>(),
  { cuoWu: null, zhongZai: false, miXi: false, xianShiChongShi: true },
)

const emit = defineEmits<{
  (e: 'chongShi'): void
}>()

const fuZhiZhuangTai = ref('')
const dengDaiMiaoHao = ref(0)
const faChongShiZhong = ref(false)
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
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.qian-tai-cuo-wu--mi-xi {
  margin-top: var(--jiange-xiao);
  padding: var(--jiange-xiao) var(--jiange-12);
}

.qian-tai-cuo-wu-tou {
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.qian-tai-cuo-wu-tubiao {
  flex: none;
  width: var(--jiange-zhong);
  height: var(--jiange-zhong);
  margin-top: var(--jiange-2);
  color: var(--cuo-wu-biaoti);
}

.qian-tai-cuo-wu-wen-an {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--cuo-wu-biaoti);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.qian-tai-cuo-wu-lian-ai-hang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-xiao);
}

.qian-tai-cuo-wu-lian-ai-ma {
  min-width: 0;
  max-width: 100%;
  padding: var(--jiange-2) var(--jiange-6);
  border: 1px solid var(--cuo-wu-bian);
  border-radius: var(--yuanjiao-xiao);
  background: var(--cuo-wu-dian);
  color: var(--cuo-wu-zhengwen);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow-wrap: anywhere;
  user-select: text;
}

.qian-tai-cuo-wu-cao-zuo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
  justify-content: flex-end;
  margin-top: var(--jiange-12);
}

.qian-tai-cuo-wu-deng-dai {
  color: var(--cuo-wu-zhengwen);
  font-size: var(--ziti-xiao);
}

.qian-tai-cuo-wu-chong-shi,
.qian-tai-cuo-wu-fu-zhi {
  position: relative;
  min-height: calc(var(--jiange-da) + var(--jiange-12));
  padding: var(--jiange-6) var(--jiange-12);
  border: 1px solid var(--cuo-wu-bian);
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-kaopian);
  color: var(--cuo-wu-biaoti);
  font: inherit;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.qian-tai-cuo-wu-chong-shi:hover:not(:disabled),
.qian-tai-cuo-wu-fu-zhi:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--cuowu-yanse) 58%, transparent);
  background: var(--cuo-wu-dian);
}

.qian-tai-cuo-wu-chong-shi:focus-visible,
.qian-tai-cuo-wu-fu-zhi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qian-tai-cuo-wu-chong-shi:disabled {
  cursor: wait;
  opacity: 0.65;
}

.qian-tai-cuo-wu-chong-shi::before,
.qian-tai-cuo-wu-fu-zhi::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.qian-tai-cuo-wu-fu-zhi-zhuang-tai {
  display: block;
  margin-top: var(--jiange-xiao);
  color: var(--cuo-wu-zhengwen);
}

@media (max-width: 640px) {
  .qian-tai-cuo-wu {
    padding: var(--jiange-12) var(--jiange-xiao);
  }

  .qian-tai-cuo-wu-cao-zuo {
    justify-content: stretch;
  }

  .qian-tai-cuo-wu-chong-shi {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .qian-tai-cuo-wu-chong-shi,
  .qian-tai-cuo-wu-fu-zhi {
    transition: none;
  }
}
</style>
