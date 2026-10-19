<template>
  <div
    class="dang-wei-hua-gan"
    :class="{
      'dang-wei-hua-gan--tuo-zhuai': tuoZhuaiZhong,
      'dang-wei-hua-gan--jiao-dian': jiaoDianZhong,
      'dang-wei-hua-gan--shi-fang': shiFangZhong,
    }"
    :data-testid="`dang-wei-hua-gan-${ceShiJian}`"
  >
    <div class="hua-gan-tou">
      <span class="hua-gan-biao-ti">{{ biaoTi }}</span>
      <span class="hua-gan-dang-qian">{{ dangQianWenZi }}</span>
    </div>

    <div class="hua-gan-qu">
      <button
        class="hua-gan-an-niu"
        type="button"
        :aria-label="huoQuFanYi('sheZhi', 'shengYinJianYiDang')"
        :disabled="suoYin <= 0"
        @click="tiaoZheng(-1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
          <path d="M6 12h12" />
        </svg>
      </button>

      <div class="gui-dao-qu">
        <span class="gui-dao-di" aria-hidden="true"></span>
        <span class="gui-dao-tian-chong" aria-hidden="true" :style="{ width: tianChongKuanDu }"></span>
        <span class="gui-dao-guang-yun" aria-hidden="true" :style="{ left: huaKuaiZhongXin, width: guangYunKuanDu }"></span>
        <span class="ke-du-qu" aria-hidden="true">
          <span
            v-for="(xiang, xuHao) in xuanXiang"
            :key="xiang.zhi"
            class="ke-du"
            :class="{ 'ke-du--guo': xuHao <= suoYin, 'ke-du--dang': xuHao === suoYin }"
            :style="{ left: keDuWeiZhi(xuHao) }"
          />
        </span>
        <input
          ref="huaGan"
          class="gui-dao"
          type="range"
          min="0"
          :max="zuiDaSuoYin"
          step="1"
          :value="suoYin"
          :aria-label="biaoTi"
          :aria-valuemin="0"
          :aria-valuemax="zuiDaSuoYin"
          :aria-valuenow="suoYin"
          :aria-valuetext="dangQianWenZi"
          :data-dang-wei="dangWei"
          :data-suo-yin="suoYin"
          @input="chuLiShuRu"
          @change="biaoJiShiFang"
          @focus="jiaoDianZhong = true"
          @blur="chuLiShiJiao"
          @pointerdown="tuoZhuaiZhong = true"
          @pointerup="chuLiSongKai"
          @keydown="chuLiJianPan"
        />
        <span class="dang-wei-qi-pao" aria-hidden="true" :style="{ left: huaKuaiZhongXin }">{{ dangQianWenZi }}</span>
      </div>

      <button
        class="hua-gan-an-niu"
        type="button"
        :aria-label="huoQuFanYi('sheZhi', 'shengYinJiaYiDang')"
        :disabled="suoYin >= zuiDaSuoYin"
        @click="tiaoZheng(1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
          <path d="M12 6v12M6 12h12" />
        </svg>
      </button>
    </div>

    <p class="hua-gan-shuo-ming">{{ huoQuFanYi('sheZhi', 'shengYinDangWeiShuoMing') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

const props = defineProps<{
  biaoTi: string
  ceShiJian: string
  xuanXiang: Array<{ zhi: string; wenZi: string }>
  dangWei: string
}>()

const emit = defineEmits<{
  (e: 'geng-xin', zhi: string): void
}>()

const SHI_FANG_HAO_MIAO = 320

const huaGan = ref<HTMLInputElement | null>(null)
const tuoZhuaiZhong = ref(false)
const jiaoDianZhong = ref(false)
const shiFangZhong = ref(false)
let shiFangJiShi: ReturnType<typeof setTimeout> | null = null

const zuiDaSuoYin = computed(() => Math.max(0, props.xuanXiang.length - 1))
const suoYin = computed(() => {
  const zhaoDao = props.xuanXiang.findIndex((xiang) => xiang.zhi === props.dangWei)
  return zhaoDao < 0 ? 0 : zhaoDao
})
const dangQianWenZi = computed(() => props.xuanXiang[suoYin.value]?.wenZi ?? '')
const baiFenBi = computed(() => (zuiDaSuoYin.value === 0 ? 0 : suoYin.value / zuiDaSuoYin.value))

function weiZhiYangShi(biLi: number): string {
  return `calc(var(--hua-gan-hua-kuai) / 2 + (100% - var(--hua-gan-hua-kuai)) * ${biLi})`
}

const huaKuaiZhongXin = computed(() => weiZhiYangShi(baiFenBi.value))
const tianChongKuanDu = computed(
  () => `calc((100% - var(--hua-gan-hua-kuai)) * ${baiFenBi.value})`,
)
const guangYunKuanDu = computed(() => `calc(var(--hua-gan-hua-kuai) * ${2 + baiFenBi.value * 1.6})`)

function keDuWeiZhi(xuHao: number): string {
  return weiZhiYangShi(zuiDaSuoYin.value === 0 ? 0 : xuHao / zuiDaSuoYin.value)
}

function biaoJiShiFang(): void {
  shiFangZhong.value = true
  if (shiFangJiShi !== null) clearTimeout(shiFangJiShi)
  shiFangJiShi = setTimeout(() => {
    shiFangZhong.value = false
    shiFangJiShi = null
  }, SHI_FANG_HAO_MIAO)
}

function shuChuSuoYin(xuHao: number): void {
  const guiYi = Math.min(zuiDaSuoYin.value, Math.max(0, xuHao))
  const muBiao = props.xuanXiang[guiYi]
  if (!muBiao || muBiao.zhi === props.dangWei) return
  emit('geng-xin', muBiao.zhi)
}

function chuLiShuRu(shiJian: Event): void {
  const yuanSu = shiJian.target as HTMLInputElement | null
  if (!yuanSu) return
  shuChuSuoYin(Number(yuanSu.value))
}

function tiaoZheng(buShu: number): void {
  shuChuSuoYin(suoYin.value + buShu)
}

function chuLiSongKai(): void {
  tuoZhuaiZhong.value = false
  biaoJiShiFang()
}

function chuLiShiJiao(): void {
  jiaoDianZhong.value = false
  biaoJiShiFang()
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
  if (shiJian.key === 'ArrowLeft' || shiJian.key === 'ArrowRight' || shiJian.key === 'Home' || shiJian.key === 'End') {
    biaoJiShiFang()
  }
}

function juJiao(): void {
  huaGan.value?.focus()
}

defineExpose({ suoYin, dangQianWenZi, baiFenBi, dangWei: computed(() => props.dangWei), huaGan, tiaoZheng, juJiao })
</script>

<style scoped>
.dang-wei-hua-gan {
  --hua-gan-hua-kuai: 26px;
  --hua-gan-gui-dao-gao: 6px;
  --hua-gan-jin-1: #f7d27a;
  --hua-gan-jin-2: #d9a441;
  --hua-gan-jin-3: #8a5f12;
  --hua-gan-wen-ben: #ffffff;
  --hua-gan-ci-wen-ben: #d8d8de;
  --hua-gan-guang: rgba(247, 210, 122, 0.55);
  --hua-gan-jin-wen-ben: #f7d27a;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  background: rgba(28, 28, 33, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: border-color 0.24s var(--quxian-biao-zhun), box-shadow 0.24s var(--quxian-biao-zhun);
}

:root[data-theme='light'] .dang-wei-hua-gan {
  --hua-gan-jin-1: #e8b94f;
  --hua-gan-jin-2: #c08a1c;
  --hua-gan-jin-3: #7a5208;
  --hua-gan-wen-ben: #14161a;
  --hua-gan-ci-wen-ben: #3f434a;
  --hua-gan-guang: rgba(192, 138, 28, 0.45);
  --hua-gan-jin-wen-ben: #6b4706;
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(20, 22, 26, 0.12);
}

.dang-wei-hua-gan--jiao-dian,
.dang-wei-hua-gan--tuo-zhuai {
  border-color: var(--hua-gan-jin-2);
  box-shadow: 0 0 0 1px var(--hua-gan-guang), 0 6px 18px rgba(0, 0, 0, 0.18);
}

.hua-gan-tou {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--jiange-xiao);
}

.hua-gan-biao-ti {
  font-size: 13px;
  font-weight: 600;
  color: var(--hua-gan-wen-ben);
}

.hua-gan-dang-qian {
  font-size: 12px;
  font-weight: 600;
  color: var(--hua-gan-jin-wen-ben);
}

.hua-gan-qu {
  display: flex;
  align-items: center;
  gap: var(--jiange-6);
}

.hua-gan-an-niu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--hua-gan-ci-wen-ben);
  cursor: pointer;
  transition: border-color 0.2s var(--quxian-biao-zhun), color 0.2s var(--quxian-biao-zhun),
    transform 0.2s var(--quxian-tan-chu);
}

:root[data-theme='light'] .hua-gan-an-niu {
  background: rgba(20, 22, 26, 0.05);
  border-color: rgba(20, 22, 26, 0.14);
}

.hua-gan-an-niu svg {
  width: 20px;
  height: 20px;
}

.hua-gan-an-niu:hover:not(:disabled) {
  border-color: var(--hua-gan-jin-2);
  color: var(--hua-gan-jin-wen-ben);
}

.hua-gan-an-niu:active:not(:disabled) {
  transform: scale(0.94);
}

.hua-gan-an-niu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gui-dao-qu {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 44px;
  display: flex;
  align-items: center;
}

.gui-dao-di {
  position: absolute;
  left: calc(var(--hua-gan-hua-kuai) / 2);
  right: calc(var(--hua-gan-hua-kuai) / 2);
  top: 50%;
  height: 6px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:root[data-theme='light'] .gui-dao-di {
  background: linear-gradient(90deg, rgba(20, 22, 26, 0.16), rgba(20, 22, 26, 0.08));
  border-color: rgba(20, 22, 26, 0.08);
}

.gui-dao-tian-chong {
  position: absolute;
  left: calc(var(--hua-gan-hua-kuai) / 2);
  top: 50%;
  height: 6px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, var(--hua-gan-jin-3), var(--hua-gan-jin-2), var(--hua-gan-jin-1));
  box-shadow: 0 0 8px var(--hua-gan-guang);
  transition: width 0.24s var(--quxian-tan-chu);
}

.gui-dao-guang-yun {
  position: absolute;
  top: 50%;
  height: 6px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: radial-gradient(closest-side, var(--hua-gan-guang), transparent);
  opacity: 0.85;
  transition: left 0.24s var(--quxian-tan-chu), width 0.24s var(--quxian-tan-chu);
  pointer-events: none;
}

.ke-du-qu {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 14px;
  transform: translateY(-50%);
  pointer-events: none;
}

.ke-du {
  position: absolute;
  top: 0;
  width: 2px;
  height: 14px;
  transform: translateX(-50%);
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.18);
  transition: background 0.24s var(--quxian-biao-zhun), transform 0.24s var(--quxian-tan-chu);
}

:root[data-theme='light'] .ke-du {
  background: rgba(20, 22, 26, 0.18);
}

.ke-du--guo {
  background: var(--hua-gan-jin-2);
}

.ke-du--dang {
  transform: translateX(-50%) scaleY(1.35);
  background: var(--hua-gan-jin-1);
}

.gui-dao {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 44px;
  padding: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.gui-dao:focus {
  outline: none;
}

.gui-dao:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px var(--hua-gan-guang), 0 0 18px var(--hua-gan-jin-1);
}

.gui-dao::-webkit-slider-runnable-track {
  height: 6px;
  background: transparent;
  border-radius: 999px;
}

.gui-dao::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: var(--hua-gan-hua-kuai);
  height: var(--hua-gan-hua-kuai);
  margin-top: calc((var(--hua-gan-gui-dao-gao) - var(--hua-gan-hua-kuai)) / 2);
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: radial-gradient(circle at 34% 30%, #fff6dd, var(--hua-gan-jin-1) 46%, var(--hua-gan-jin-2));
  box-shadow: 0 0 12px var(--hua-gan-guang), 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: grab;
  transition: transform 0.28s var(--quxian-tan-chu), box-shadow 0.28s var(--quxian-tan-chu);
}

.gui-dao::-moz-range-track {
  height: 6px;
  background: transparent;
  border-radius: 999px;
}

.gui-dao::-moz-range-thumb {
  width: var(--hua-gan-hua-kuai);
  height: var(--hua-gan-hua-kuai);
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: radial-gradient(circle at 34% 30%, #fff6dd, var(--hua-gan-jin-1) 46%, var(--hua-gan-jin-2));
  box-shadow: 0 0 12px var(--hua-gan-guang), 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: grab;
  transition: transform 0.28s var(--quxian-tan-chu), box-shadow 0.28s var(--quxian-tan-chu);
}

.dang-wei-hua-gan--tuo-zhuai .gui-dao::-webkit-slider-thumb {
  transform: scale(1.12);
  box-shadow: 0 0 22px var(--hua-gan-jin-1), 0 3px 10px rgba(0, 0, 0, 0.4);
  cursor: grabbing;
}

.dang-wei-hua-gan--tuo-zhuai .gui-dao::-moz-range-thumb {
  transform: scale(1.12);
}

.dang-wei-hua-gan--shi-fang .gui-dao::-webkit-slider-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 26px var(--hua-gan-jin-1), 0 4px 14px rgba(0, 0, 0, 0.42);
}

.dang-wei-hua-gan--shi-fang .gui-dao::-moz-range-thumb {
  transform: scale(1.2);
}

.dang-wei-qi-pao {
  position: absolute;
  bottom: calc(100% - 6px);
  z-index: 3;
  padding: var(--jiange-2) var(--jiange-xiao);
  border-radius: var(--yuanjiao-xiao);
  background-color: #e0af4a;
  background-image: linear-gradient(135deg, var(--hua-gan-jin-1), var(--hua-gan-jin-2));
  color: #2a1d05;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.28s var(--quxian-tan-chu), opacity 0.24s var(--quxian-biao-zhun);
  pointer-events: none;
}

.dang-wei-qi-pao::after {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(100% - 3px);
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--hua-gan-jin-2);
  transform: translate(-50%, -50%) rotate(45deg);
}

.dang-wei-hua-gan--tuo-zhuai .dang-wei-qi-pao,
.dang-wei-hua-gan--shi-fang .dang-wei-qi-pao {
  transform: translateX(-50%) translateY(-6px) scale(1.06);
}

.hua-gan-shuo-ming {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--hua-gan-ci-wen-ben);
}
</style>
