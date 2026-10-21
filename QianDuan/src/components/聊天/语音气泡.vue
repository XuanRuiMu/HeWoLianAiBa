<template>
  <div class="yuyin-pao" :class="{ 'yuyin-pao--benren': shiBenRen }">
    <QiPaoRongQi
      class="yuyin-qipao"
      :class="{ bofangzhong: boFangZhong }"
      :shi-ben-ren="shiBenRen"
      :ke-dian-ji="true"
      :style="kuanYangShi"
      :aria-label="
        boFangZhong ? huoQuFanYi('duoMeiTi', 'zanTingYuYin') : huoQuFanYi('duoMeiTi', 'boFangYuYin')
      "
      @click.stop="emit('qieHuan')"
    >
      <span class="yuyin-neirong" :class="{ 'yuyin-neirong--benren': shiBenRen }">
        <span ref="labaYuanSu" class="laba-zu" aria-hidden="true">
          <svg class="laba-tubiao" viewBox="0 0 18 20" fill="none" stroke="currentColor">
            <circle
              class="laba-duan laba-duan--1"
              cx="4"
              cy="10"
              r="2.4"
              fill="currentColor"
              stroke="none"
            />
            <path
              class="laba-duan laba-duan--2"
              d="M8.68 4.8A7 7 0 0 1 8.68 15.2"
              stroke-width="2.2"
              stroke-linecap="round"
            />
            <path
              class="laba-duan laba-duan--3"
              d="M12.78 1.82A12 12 0 0 1 12.78 18.18"
              stroke-width="2.2"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <span class="yuyin-shichang">{{ shiChangWenBen }}</span>
      </span>
      <span class="yuyin-jindu-xian" :style="jinDuXianYangShi" />
    </QiPaoRongQi>
    <div v-if="xuanZhong" class="yuyin-jindu-qu" :class="{ 'yuyin-jindu-qu--benren': shiBenRen }">
      <button
        type="button"
        class="yuyin-kongzhi"
        :aria-label="
          boFangZhong ? huoQuFanYi('duoMeiTi', 'zanTingYuYin') : huoQuFanYi('duoMeiTi', 'jiXuYuYin')
        "
        :title="
          boFangZhong ? huoQuFanYi('duoMeiTi', 'zanTingYuYin') : huoQuFanYi('duoMeiTi', 'jiXuYuYin')
        "
        @click.stop="qieHuanZanTing"
      >
        <svg
          v-if="boFangZhong"
          class="yuyin-kongzhi-tubiao"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
        <svg
          v-else
          class="yuyin-kongzhi-tubiao"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M7 4.4a1 1 0 0 1 1.53-.85l11.2 7.6a1 1 0 0 1 0 1.7l-11.2 7.6A1 1 0 0 1 7 19.6z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="yuyin-kongzhi"
        :aria-label="huoQuFanYi('duoMeiTi', 'tingZhiYuYin')"
        :title="huoQuFanYi('duoMeiTi', 'tingZhiYuYin')"
        @click.stop="tingZhiBoFang"
      >
        <svg
          class="yuyin-kongzhi-tubiao"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
      </button>
      <input
        class="yuyin-jindu-tiao"
        type="range"
        :min="0"
        :max="zongMiao"
        :step="DUO_MEI_TI_PEI_ZHI.yuYinJinDuBuZhouMiao"
        :value="jinDuMiao"
        :aria-label="huoQuFanYi('duoMeiTi', 'tiaoZhuanYuYinJinDu')"
        @click.stop
        @input.stop="chuLiTuoDong"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/翻译表'
import QiPaoRongQi from '@/components/聊天/气泡容器.vue'
import {
  ceLiangYuYinShiChang,
  geShiHuaYuYinShiChang,
  jiXuDangQianYuYin,
  tingZhiDangQianYuYin,
  yuYinKuanYangShi,
  zanTingDangQianYuYin,
  type YuYinShiChangZaiTi,
} from '@/composables/use语音播放'
import { duQuYuYinYinLiang, jiSuanYuYinDuanYangShi } from '@/composables/use语音音量'

const props = defineProps<{
  xiaoXi: YuYinShiChangZaiTi
  boFangZhong: boolean
  xuanZhong?: boolean
  jinDuMiao: number
  zongMiao: number
  shiBenRen?: boolean
}>()

const emit = defineEmits<{
  (e: 'qieHuan'): void
  (e: 'tiaoZhuan', miao: number): void
}>()

const kuanYangShi = computed(() => yuYinKuanYangShi(props.xiaoXi))
const shiChangWenBen = computed(() => geShiHuaYuYinShiChang(props.xiaoXi))

onMounted(() => ceLiangYuYinShiChang(props.xiaoXi))
watch(
  () => [props.xiaoXi.mei_ti_url, props.xiaoXi.ben_di_yu_lan_url],
  () => ceLiangYuYinShiChang(props.xiaoXi),
)

function qieHuanZanTing(): void {
  if (props.boFangZhong) zanTingDangQianYuYin()
  else jiXuDangQianYuYin()
}

function tingZhiBoFang(): void {
  tingZhiDangQianYuYin()
}

const jinDuBiLi = computed(() => {
  if (props.zongMiao <= 0) return 0
  return Math.min(1, Math.max(0, props.jinDuMiao / props.zongMiao))
})

const jinDuXianYangShi = computed(() => ({
  width: `${(jinDuBiLi.value * 100).toFixed(2)}%`,
}))

function chuLiTuoDong(shiJian: Event): void {
  const shuRu = shiJian.target as HTMLInputElement
  emit('tiaoZhuan', shuRu.valueAsNumber)
}

const labaYuanSu = ref<HTMLElement | null>(null)
let zhenJieDian = 0

const jianDongMoShi =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function xieRuDuanYangShi(biLi: number): void {
  const suYuan = labaYuanSu.value
  if (!suYuan) return
  jiSuanYuYinDuanYangShi(biLi).forEach((duan, suoYin) => {
    suYuan.style.setProperty(`--laba-duan-${suoYin + 1}-gao`, duan.gao.toFixed(3))
    suYuan.style.setProperty(`--laba-duan-${suoYin + 1}-tou`, duan.tou.toFixed(3))
  })
}

function guiWeiDuanYangShi(): void {
  xieRuDuanYangShi(1)
}

function qingChuZhen(): void {
  if (zhenJieDian) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(zhenJieDian)
    zhenJieDian = 0
  }
}

function zhuiZongYinLiang(): void {
  xieRuDuanYangShi(duQuYuYinYinLiang())
  zhenJieDian = requestAnimationFrame(zhuiZongYinLiang)
}

function kaiShiZhuiZong(): void {
  qingChuZhen()
  if (jianDongMoShi || typeof requestAnimationFrame !== 'function') {
    guiWeiDuanYangShi()
    return
  }
  xieRuDuanYangShi(duQuYuYinYinLiang())
  zhenJieDian = requestAnimationFrame(zhuiZongYinLiang)
}

function guiWeiBingTingZhi(): void {
  qingChuZhen()
  guiWeiDuanYangShi()
}

onMounted(() => {
  if (props.boFangZhong) kaiShiZhuiZong()
  else guiWeiDuanYangShi()
})

watch(
  () => props.boFangZhong,
  (boFangZhong) => {
    if (boFangZhong) kaiShiZhuiZong()
    else guiWeiBingTingZhi()
  },
)

onBeforeUnmount(() => {
  qingChuZhen()
})
</script>

<style scoped>
.yuyin-pao {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: var(--yuyin-jindu-zui-xiao-kuan);
}

.yuyin-pao--benren {
  align-items: flex-end;
}

.yuyin-qipao {
  min-width: max-content;
  cursor: pointer;
}

.yuyin-qipao.bofangzhong {
  box-shadow: var(--qipao-yinying);
}

.yuyin-qipao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.yuyin-neirong {
  display: inline-flex;
  align-items: center;
  gap: var(--yuyin-laba-jian-ju);
}

.yuyin-neirong--benren {
  flex-direction: row-reverse;
}

.laba-zu {
  --laba-duan-1-gao: 1;
  --laba-duan-1-tou: 1;
  --laba-duan-2-gao: 1;
  --laba-duan-2-tou: 1;
  --laba-duan-3-gao: 1;
  --laba-duan-3-tou: 1;
  display: inline-flex;
  flex: 0 0 auto;
  width: var(--yuyin-laba-kuan);
  height: var(--yuyin-laba-gao);
}

.laba-tubiao {
  display: block;
  width: 100%;
  height: 100%;
}

.yuyin-neirong--benren .laba-tubiao {
  transform: rotate(180deg);
}

.laba-duan {
  transform-box: fill-box;
  transform-origin: center;
}

.laba-duan--1 {
  transform: scale(var(--laba-duan-1-gao, 1));
  opacity: var(--laba-duan-1-tou, 1);
}

.laba-duan--2 {
  transform: scaleY(var(--laba-duan-2-gao, 1));
  opacity: var(--laba-duan-2-tou, 1);
}

.laba-duan--3 {
  transform: scaleY(var(--laba-duan-3-gao, 1));
  opacity: var(--laba-duan-3-tou, 1);
}

.yuyin-shichang {
  flex: 0 0 auto;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  white-space: nowrap;
}

.yuyin-jindu-xian {
  position: absolute;
  bottom: 0;
  left: 0;
  height: var(--yuyin-jindu-xian-gao);
  background: currentColor;
  opacity: 0.55;
  pointer-events: none;
  border-radius: var(--qipao-yuanjiao);
}

.yuyin-jindu-qu {
  display: flex;
  align-items: center;
  gap: var(--jiange-12);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin-top: var(--jiange-xiao);
  padding-inline: var(--jiange-13);
}

.yuyin-jindu-qu--benren {
  flex-direction: row-reverse;
}

.yuyin-jindu-tiao {
  flex: 1 1 0;
  width: 0;
  min-width: var(--yuyin-jindu-zui-xiao-kuan);
  height: var(--yuyin-kongzhi-re-ku);
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.yuyin-jindu-tiao::-webkit-slider-runnable-track {
  height: var(--yuyin-jindu-gao);
  background: currentColor;
  opacity: 0.35;
}

.yuyin-jindu-tiao::-webkit-slider-thumb {
  width: var(--yuyin-huakuai-chicun);
  height: var(--yuyin-huakuai-chicun);
  margin-top: calc((var(--yuyin-jindu-gao) - var(--yuyin-huakuai-chicun)) / 2);
  border: none;
  border-radius: 50%;
  background: currentColor;
  opacity: 1;
}

.yuyin-jindu-tiao::-moz-range-track {
  height: var(--yuyin-jindu-gao);
  background: currentColor;
  opacity: 0.35;
}

.yuyin-jindu-tiao::-moz-range-thumb {
  width: var(--yuyin-huakuai-chicun);
  height: var(--yuyin-huakuai-chicun);
  border: none;
  border-radius: 50%;
  background: currentColor;
}

.yuyin-jindu-tiao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.yuyin-kongzhi {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-sizing: border-box;
  width: var(--yuyin-kongzhi-chicun);
  height: var(--yuyin-kongzhi-chicun);
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.yuyin-kongzhi::before {
  content: '';
  position: absolute;
  inset: calc((var(--yuyin-kongzhi-chicun) - var(--yuyin-kongzhi-re-ku)) / 2);
  border-radius: 50%;
}

.yuyin-kongzhi:hover::before {
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.yuyin-kongzhi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.yuyin-kongzhi-tubiao {
  position: relative;
  width: var(--yuyin-kongzhi-tubiao);
  height: var(--yuyin-kongzhi-tubiao);
}

@media (prefers-reduced-motion: reduce) {
  .laba-duan {
    transform: none;
    opacity: 1;
  }
}
</style>
