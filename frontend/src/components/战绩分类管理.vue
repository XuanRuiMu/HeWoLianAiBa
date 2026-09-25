<template>
  <section class="fenlei-guan-li-lan" :aria-busy="caoZuoZhong ? 'true' : 'false'">
    <div class="fenlei-biao-qian-lan">
      <div
        v-for="fenLei in fenLeiLieBiao"
        :key="fenLei.id"
        class="fenlei-biao-qian"
        :class="{ 'fenlei-biao-qian--jihuo': fenLei.id === dangQianFenLeiId }"
        :data-id="fenLei.id"
        @click="qieHuan(fenLei.id)"
      >
        <button
          type="button"
          class="fenlei-biao-qian-an-niu"
          :aria-pressed="fenLei.id === dangQianFenLeiId ? 'true' : 'false'"
          :disabled="caoZuoZhong"
          @click.stop="qieHuan(fenLei.id)"
        >
          <span class="fenlei-ming-cheng">{{ fenLei.name }}</span>
          <span class="fenlei-ji-shu">{{ fenLei.record_count }}</span>
        </button>
        <template v-if="!fenLei.is_default">
          <button
            type="button"
            class="fenlei-tu-biao-anniu gengMing-fenlei-anniu"
            :aria-label="`${huoQuFanYi('zhanJi', 'gengMing')}: ${fenLei.name}`"
            :disabled="caoZuoZhong"
            @click.stop="kaiShiGengMing(fenLei)"
          >
            ✎
          </button>
          <button
            type="button"
            class="fenlei-tu-biao-anniu shanChu-fenlei-anniu"
            :aria-label="`${huoQuFanYi('zhanJi', 'shanChu')}: ${fenLei.name}`"
            :disabled="caoZuoZhong"
            @click.stop="queRenShanChu(fenLei)"
          >
            ×
          </button>
        </template>
      </div>
      <button
        type="button"
        class="chuangJian-fenlei-anniu"
        :aria-label="huoQuFanYi('zhanJi', 'chuangJianFenLei')"
        :disabled="caoZuoZhong"
        @click="kaiShiChuangJian"
      >
        +
      </button>
    </div>
    <form v-if="bianJiMoShi" class="fenlei-bian-ji" @submit.prevent="tiJiaoBianJi">
      <input
        ref="mingChengShuRuKuang"
        v-model="bianJiMingCheng"
        class="fenlei-ming-cheng-input"
        type="text"
        maxlength="20"
        :aria-label="dangQianFenLei ? `${huoQuFanYi('zhanJi', 'gengMingFenLeiMingCheng')}: ${dangQianFenLei.name}` : huoQuFanYi('zhanJi', 'chuangJianFenLeiMingCheng')"
        :disabled="caoZuoZhong"
        @keydown.esc="guanBiBianJi"
      />
      <button
        type="submit"
        class="fenlei-bao-cun"
        :aria-label="huoQuFanYi('zhanJi', 'baoCun')"
        :disabled="caoZuoZhong || !bianJiMingCheng.trim()"
      >
        ✓
      </button>
      <button
        type="button"
        class="fenlei-qu-xiao"
        :aria-label="huoQuFanYi('tongYong', 'quXiao')"
        :disabled="caoZuoZhong"
        @click="guanBiBianJi"
      >
        ×
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import type { ZhanJiFenLei } from '@/types'

const props = defineProps<{
  fenLeiLieBiao: ZhanJiFenLei[]
  dangQianFenLeiId: string
  caoZuoZhong: boolean
}>()

const emit = defineEmits<{
  qieHuan: [fenLeiId: string]
  chuangJian: [mingCheng: string]
  gengMing: [fenLeiId: string, mingCheng: string]
  shanChu: [fenLeiId: string]
}>()

const bianJiMoShi = ref<'chuangJian' | 'gengMing' | null>(null)
const bianJiFenLeiId = ref('')
const bianJiMingCheng = ref('')
const mingChengShuRuKuang = ref<HTMLInputElement | null>(null)
const dangQianFenLei = computed(() =>
  props.fenLeiLieBiao.find((item) => item.id === props.dangQianFenLeiId),
)

function qieHuan(fenLeiId: string): void {
  if (props.caoZuoZhong) return
  emit('qieHuan', fenLeiId)
}

async function kaiShiChuangJian(): Promise<void> {
  bianJiMoShi.value = 'chuangJian'
  bianJiFenLeiId.value = ''
  bianJiMingCheng.value = ''
  await nextTick()
  mingChengShuRuKuang.value?.focus()
}

async function kaiShiGengMing(fenLei: ZhanJiFenLei): Promise<void> {
  bianJiMoShi.value = 'gengMing'
  bianJiFenLeiId.value = fenLei.id
  bianJiMingCheng.value = fenLei.name
  await nextTick()
  mingChengShuRuKuang.value?.focus()
}

function guanBiBianJi(): void {
  bianJiMoShi.value = null
  bianJiFenLeiId.value = ''
  bianJiMingCheng.value = ''
}

function tiJiaoBianJi(): void {
  const mingCheng = bianJiMingCheng.value.trim()
  if (!mingCheng || props.caoZuoZhong) return
  if (bianJiMoShi.value === 'gengMing') emit('gengMing', bianJiFenLeiId.value, mingCheng)
  else emit('chuangJian', mingCheng)
  guanBiBianJi()
}

function queRenShanChu(fenLei: ZhanJiFenLei): void {
  if (props.caoZuoZhong) return
  const queRenWenBen = `${huoQuFanYi('zhanJi', 'shanChu')}: ${fenLei.name}`
  if (window.confirm(queRenWenBen)) emit('shanChu', fenLei.id)
}
</script>

<style scoped>
.fenlei-guan-li-lan {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.fenlei-biao-qian-lan {
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding-bottom: 4px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}

.fenlei-biao-qian,
.chuangJian-fenlei-anniu {
  flex: 0 0 auto;
  min-height: 42px;
  border: 2px solid var(--biankuang-yanse);
  border-radius: 12px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
}

.fenlei-biao-qian {
  display: flex;
  align-items: stretch;
  max-width: min(360px, calc(100vw - 96px));
  overflow: hidden;
}

.fenlei-biao-qian--jihuo {
  border-color: var(--yanse-zhanji);
  box-shadow: 3px 3px 0 var(--xuanzhong-qiangdiao-yinying);
}

.fenlei-biao-qian-an-niu,
.fenlei-tu-biao-anniu,
.chuangJian-fenlei-anniu {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.fenlei-biao-qian-an-niu {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 10px;
  font: inherit;
  font-weight: 800;
}

.fenlei-ming-cheng {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fenlei-ji-shu {
  flex: 0 0 auto;
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--yanse-zhanji);
  color: var(--beijing-zhuse);
  text-align: center;
  font-size: 11px;
}

.fenlei-tu-biao-anniu {
  width: 34px;
  padding: 0;
  border-left: 1px solid var(--biankuang-yanse);
  font-size: 18px;
  font-weight: 900;
}

.shanChu-fenlei-anniu:hover:not(:disabled) {
  background: transparent;
  color: var(--yanse-weixian);
}

.chuangJian-fenlei-anniu {
  width: 42px;
  font-size: 24px;
  font-weight: 900;
}

.fenlei-bian-ji {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.fenlei-ming-cheng-input,
.fenlei-bao-cun,
.fenlei-qu-xiao {
  min-height: 42px;
  border: 2px solid var(--biankuang-yanse);
  border-radius: 10px;
  font: inherit;
}

.fenlei-ming-cheng-input {
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  background: var(--beijing-zhuse);
  color: var(--wenben-zhuse);
}

.fenlei-bao-cun,
.fenlei-qu-xiao {
  width: 42px;
  padding: 0;
  background: var(--yanse-zhanji);
  color: var(--beijing-zhuse);
  cursor: pointer;
  font-size: 18px;
  font-weight: 900;
}

button:focus-visible,
input:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

button:disabled,
input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

:root[data-theme='light'] .fenlei-biao-qian,
:root[data-theme='light'] .chuangJian-fenlei-anniu {
  border-color: var(--beijing-zhuse);
  background: var(--beijing-kaopian);
  color: var(--beijing-zhuse);
}

:root[data-theme='light'] .fenlei-tu-biao-anniu {
  border-left-color: var(--beijing-zhuse);
}

:root[data-theme='light'] .fenlei-ming-cheng-input {
  border-color: var(--beijing-zhuse);
  background: var(--beijing-kaopian);
  color: var(--beijing-zhuse);
}

@media (max-width: 640px) {
  .fenlei-biao-qian {
    max-width: calc(100vw - 74px);
  }

  .fenlei-bian-ji {
    gap: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fenlei-guan-li-lan *,
  .fenlei-guan-li-lan *::before,
  .fenlei-guan-li-lan *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
