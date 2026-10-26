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
        <span class="laba-zu" :class="keJianDuanShuLei" aria-hidden="true">
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
      <span class="yuyin-kongzhi-zu">
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
      </span>
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
    <div v-if="zhuanXieZhong" class="yuyin-zhuanwenzi-zhuangtai">
      {{ huoQuFanYi('liaoTian', 'yuYinZhuanWenZiZhong') }}
    </div>
    <button
      v-else-if="zhuanWenZhanKai"
      type="button"
      class="yuyin-zhuanwenzi"
      :class="{ 'yuyin-zhuanwenzi--benren': shiBenRen }"
      :aria-label="huoQuFanYi('liaoTian', 'zheDie')"
      :title="huoQuFanYi('liaoTian', 'zheDie')"
      @click.stop="emit('qieHuanZhuanWenZi')"
    >
      {{ zhuanWenBen }}
    </button>
    <span
      v-else-if="zhuanWenShiBai"
      class="yuyin-zhuanwenzi yuyin-zhuanwenzi--shibai"
      :class="{ 'yuyin-zhuanwenzi--benren': shiBenRen }"
    >
      {{ huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai') }}
    </span>
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
import {
  duQuYuYinYinLiang,
  jiSuanYuYinKeJianDuanShu,
  type YuYinKeJianDuanShu,
} from '@/composables/use语音音量'

const props = withDefaults(
  defineProps<{
    xiaoXi: YuYinShiChangZaiTi
    boFangZhong: boolean
    xuanZhong?: boolean
    jinDuMiao: number
    zongMiao: number
    shiBenRen?: boolean
    zhuanXieZhong?: boolean
    zhuanWenZhanKai?: boolean
    zhuanWenShiBai?: boolean
    zhuanWenBen?: string | null
  }>(),
  {
    xuanZhong: false,
    shiBenRen: false,
    zhuanXieZhong: false,
    zhuanWenZhanKai: false,
    zhuanWenShiBai: false,
    zhuanWenBen: null,
  },
)

const emit = defineEmits<{
  (e: 'qieHuan'): void
  (e: 'tiaoZhuan', miao: number): void
  (e: 'qieHuanZhuanWenZi'): void
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

const keJianDuanShu = ref<YuYinKeJianDuanShu>(3)
const keJianDuanShuLei = computed(() => `laba-zu--${keJianDuanShu.value}-duan`)
let shangCiKeJianDuanShu: YuYinKeJianDuanShu = 3
let zhenJieDian = 0

const jianDongMoShi =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function guiWeiQuanBuDuan(): void {
  shangCiKeJianDuanShu = 3
  if (keJianDuanShu.value !== 3) keJianDuanShu.value = 3
}

function gengXinKeJianDuanShu(): void {
  const xinDuanShu = jiSuanYuYinKeJianDuanShu(duQuYuYinYinLiang(), shangCiKeJianDuanShu)
  shangCiKeJianDuanShu = xinDuanShu
  if (keJianDuanShu.value !== xinDuanShu) keJianDuanShu.value = xinDuanShu
}

function qingChuZhen(): void {
  if (zhenJieDian) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(zhenJieDian)
    zhenJieDian = 0
  }
}

function zhuiZongYinLiang(): void {
  gengXinKeJianDuanShu()
  zhenJieDian = requestAnimationFrame(zhuiZongYinLiang)
}

function kaiShiZhuiZong(): void {
  qingChuZhen()
  if (jianDongMoShi || typeof requestAnimationFrame !== 'function') {
    guiWeiQuanBuDuan()
    return
  }
  gengXinKeJianDuanShu()
  zhenJieDian = requestAnimationFrame(zhuiZongYinLiang)
}

function guiWeiBingTingZhi(): void {
  qingChuZhen()
  guiWeiQuanBuDuan()
}

onMounted(() => {
  if (props.boFangZhong) kaiShiZhuiZong()
  else guiWeiQuanBuDuan()
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
  --yuyin-yuandian-hui: color-mix(in srgb, currentColor 35%, #9e9e9e);
  --yuyin-yuandian-lan: color-mix(in srgb, #1a73e8 82%, currentColor);
  --yuyin-yuandian-bian-hua-shi-chang: 200ms;
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
  transition: opacity var(--yuyin-duan-yin-cang-shi-chang) var(--quxian-biao-zhun);
}

.laba-duan--1 {
  fill: var(--yuyin-yuandian-hui);
  transition:
    opacity var(--yuyin-duan-yin-cang-shi-chang) var(--quxian-biao-zhun),
    fill var(--yuyin-yuandian-bian-hua-shi-chang) var(--quxian-biao-zhun);
}

.yuyin-qipao.bofangzhong .laba-duan--1 {
  fill: var(--yuyin-yuandian-lan);
}

@media (prefers-reduced-motion: reduce) {
  .laba-duan--1 {
    transition: none;
  }
}

.laba-zu--1-duan .laba-duan--2,
.laba-zu--1-duan .laba-duan--3,
.laba-zu--2-duan .laba-duan--3 {
  opacity: 0;
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
  gap: var(--jiange-xiao);
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
  box-sizing: border-box;
  display: block;
  flex: 1 1 0;
  width: 0;
  min-width: var(--yuyin-jindu-zui-xiao-kuan);
  height: var(--yuyin-kongzhi-re-ku);
  margin: 0;
  padding: 0;
  border: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.yuyin-jindu-tiao::-webkit-slider-runnable-track {
  box-sizing: border-box;
  height: var(--yuyin-kongzhi-re-ku);
  border: none;
  background: linear-gradient(currentColor, currentColor) center / 100% var(--yuyin-jindu-gao) no-repeat;
  opacity: 0.35;
}

.yuyin-jindu-tiao::-webkit-slider-thumb {
  box-sizing: border-box;
  width: var(--yuyin-huakuai-chicun);
  height: var(--yuyin-huakuai-chicun);
  margin-top: calc((var(--yuyin-kongzhi-re-ku) - var(--yuyin-huakuai-chicun)) / 2);
  border: none;
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: currentColor;
  opacity: 1;
}

.yuyin-jindu-tiao::-moz-range-track {
  box-sizing: border-box;
  height: var(--yuyin-kongzhi-re-ku);
  border: none;
  background: linear-gradient(currentColor, currentColor) center / 100% var(--yuyin-jindu-gao) no-repeat;
  opacity: 0.35;
}

.yuyin-jindu-tiao::-moz-range-thumb {
  box-sizing: border-box;
  width: var(--yuyin-huakuai-chicun);
  height: var(--yuyin-huakuai-chicun);
  margin: 0;
  border: none;
  border-radius: 50%;
  background: currentColor;
}

.yuyin-jindu-tiao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.yuyin-kongzhi-zu {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: var(--yuyin-kongzhi-jian-ju);
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

.yuyin-zhuanwenzi {
  display: block;
  box-sizing: border-box;
  max-width: 100%;
  margin-top: var(--jiange-6);
  padding: var(--jiange-xiao) var(--jiange-12);
  border: none;
  border-radius: var(--qipao-yuanjiao);
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
  font-size: var(--zhuanwenzi-zihao);
  line-height: var(--zhuanwenzi-hangao);
  text-align: left;
  word-break: break-word;
  cursor: pointer;
}

.yuyin-zhuanwenzi--benren {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}

.yuyin-zhuanwenzi--shibai {
  background: transparent;
  color: var(--cuowu-wenben);
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
}

.yuyin-zhuanwenzi-zhuangtai {
  margin-top: var(--jiange-6);
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}
</style>
