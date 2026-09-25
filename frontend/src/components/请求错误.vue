<template>
  <section
    v-if="cuoWu?.xianShi"
    class="qian-tai-cuo-wu"
    :class="{ 'qian-tai-cuo-wu--mi-xi': miXi }"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    :aria-labelledby="biaoTiId"
    :aria-busy="zhongZai ? 'true' : 'false'"
  >
    <div class="qian-tai-cuo-wu-tou">
      <svg class="qian-tai-cuo-wu-tu-biao" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17.5h.01" />
      </svg>
      <h2 :id="biaoTiId" class="qian-tai-cuo-wu-biaoti">
        {{ huoQuFanYi('tongYong', 'qianTaiCuoWuBiaoTi') }}
      </h2>
    </div>

    <dl class="qian-tai-cuo-wu-xin-xi">
      <div class="qian-tai-cuo-wu-xin-xi-hang">
        <dt>{{ huoQuFanYi('tongYong', 'qianTaiCuoWuYingXiangBiaoQian') }}</dt>
        <dd class="qian-tai-cuo-wu-ying-xiang">{{ cuoWu.yingXiang }}</dd>
      </div>
      <div class="qian-tai-cuo-wu-xin-xi-hang">
        <dt>{{ huoQuFanYi('tongYong', 'qianTaiCuoWuXiaYiBuBiaoQian') }}</dt>
        <dd class="qian-tai-cuo-wu-xia-yi-bu">{{ cuoWu.xiaYiBu }}</dd>
      </div>
    </dl>

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

    <details class="qian-tai-cuo-wu-zhen-cha">
      <summary>{{ huoQuFanYi('tongYong', 'qianTaiCuoWuZhenCha') }}</summary>
      <p>{{ huoQuFanYi('tongYong', 'qianTaiCuoWuZhenChaShuoMing') }}</p>
      <div class="qian-tai-cuo-wu-zhen-cha-neirong">
        <span>{{ huoQuFanYi('tongYong', 'qianTaiCuoWuDaiMaBiaoQian') }}</span>
        <code class="qian-tai-cuo-wu-dai-ma">{{ cuoWu.code }}</code>
      </div>
      <div v-if="cuoWu.traceId" class="qian-tai-cuo-wu-zhen-cha-neirong">
        <span>{{ huoQuFanYi('tongYong', 'qianTaiCuoWuZhenZongBianHao') }}</span>
        <code class="qian-tai-cuo-wu-zhen-zong-bian-hao">{{ cuoWu.traceId }}</code>
        <button type="button" class="qian-tai-cuo-wu-fu-zhi" @click="fuZhiZhenZongBianHao">
          {{ huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiZhenZongBianHao') }}
        </button>
      </div>
      <span v-if="fuZhiZhuangTai" class="qian-tai-cuo-wu-fu-zhi-zhuang-tai" role="status" aria-live="polite">
        {{ fuZhiZhuangTai }}
      </span>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { huoQuFanYi } from '@/config/translations'
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

const biaoTiId = `qian-tai-cuo-wu-${useId()}`
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

async function fuZhiZhenZongBianHao(): Promise<void> {
  if (!props.cuoWu?.traceId) return
  try {
    if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('clipboard')
    await navigator.clipboard.writeText(props.cuoWu.traceId)
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
  padding: var(--jiange-zhong);
  border: var(--shuru-kuang-biankuang) solid var(--cuowu-touming-biankuang);
  border-radius: var(--yuanjiao-zhong);
  background: var(--cuowu-touming-beijing);
  color: var(--wenben-zhuse);
}

.qian-tai-cuo-wu--mi-xi {
  margin-top: var(--jiange-xiao);
  padding: var(--jiange-xiao) var(--jiange-zhong);
}

.qian-tai-cuo-wu-tou {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.qian-tai-cuo-wu-tu-biao {
  width: 24px;
  height: 24px;
  flex: none;
  fill: none;
  stroke: var(--cuowu-yanse);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.qian-tai-cuo-wu-biaoti {
  margin: 0;
  color: var(--wenben-zhuse);
  font-size: var(--ziti-zhong);
  font-weight: 700;
  line-height: 1.5;
}

.qian-tai-cuo-wu-xin-xi {
  display: grid;
  gap: var(--jiange-xiao);
  margin: var(--jiange-zhong) 0 0;
}

.qian-tai-cuo-wu-xin-xi-hang {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--jiange-xiao);
  align-items: start;
}

.qian-tai-cuo-wu-xin-xi dt {
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  font-weight: 600;
}

.qian-tai-cuo-wu-xin-xi dd {
  min-width: 0;
  margin: 0;
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.qian-tai-cuo-wu-dai-ma,
.qian-tai-cuo-wu-zhen-zong-bian-hao {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  user-select: text;
}

.qian-tai-cuo-wu-dai-ma {
  color: var(--cuowu-yanse);
}

.qian-tai-cuo-wu-cao-zuo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
  justify-content: flex-end;
  margin-top: var(--jiange-zhong);
}

.qian-tai-cuo-wu-deng-dai {
  color: var(--wenben-tishi);
  font-size: var(--ziti-xiao);
}

.qian-tai-cuo-wu-chong-shi,
.qian-tai-cuo-wu-fu-zhi {
  min-height: 36px;
  padding: var(--jiange-xiao) var(--jiange-zhong);
  border: var(--shuru-kuang-biankuang) solid var(--cuowu-touming-biankuang);
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font: inherit;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--quxian-biao-zhun),
    border-color var(--quxian-biao-zhun);
}

.qian-tai-cuo-wu-chong-shi:hover:not(:disabled),
.qian-tai-cuo-wu-fu-zhi:hover:not(:disabled) {
  border-color: var(--cuowu-yanse);
  background: var(--yinying-yanse);
}

.qian-tai-cuo-wu-chong-shi:focus-visible,
.qian-tai-cuo-wu-fu-zhi:focus-visible,
.qian-tai-cuo-wu-zhen-cha summary:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qian-tai-cuo-wu-chong-shi:disabled {
  cursor: wait;
  opacity: 0.65;
}

.qian-tai-cuo-wu-zhen-cha {
  margin-top: var(--jiange-zhong);
  padding-top: var(--jiange-xiao);
  border-top: var(--shuru-kuang-biankuang) solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
}

.qian-tai-cuo-wu-zhen-cha summary {
  width: fit-content;
  cursor: pointer;
  font-weight: 600;
}

.qian-tai-cuo-wu-zhen-cha p {
  margin: var(--jiange-xiao) 0;
  line-height: 1.5;
}

.qian-tai-cuo-wu-zhen-cha-neirong {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-xiao);
}

.qian-tai-cuo-wu-zhen-zong-bian-hao {
  min-width: 0;
  max-width: 100%;
  padding: var(--jiange-xiao);
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
  overflow-wrap: anywhere;
}

.qian-tai-cuo-wu-fu-zhi-zhuang-tai {
  display: block;
  margin-top: var(--jiange-xiao);
  color: var(--wenben-ciuse);
}

:global(:root[data-theme='light']) .qian-tai-cuo-wu {
  background: var(--beijing-kaopian);
}

@media (max-width: 640px) {
  .qian-tai-cuo-wu {
    padding: var(--jiange-zhong) var(--jiange-xiao);
  }

  .qian-tai-cuo-wu-xin-xi-hang {
    grid-template-columns: 1fr;
    gap: 2px;
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
