<template>
  <div class="yuyin-pao" :class="{ 'yuyin-pao--benren': shiBenRen }">
    <button
      ref="qipaoEl"
      type="button"
      class="yuyin-qipao"
      :class="{ bofangzhong: boFangZhong, 'yuyin-qipao--benren': shiBenRen }"
      :style="kuanYangShi"
      :aria-label="
        boFangZhong ? huoQuFanYi('duoMeiTi', 'zanTingYuYin') : huoQuFanYi('duoMeiTi', 'boFangYuYin')
      "
      @click.stop="emit('qieHuan')"
    >
      <template v-if="!boFangZhong">
        <span class="laba-zu" aria-hidden="true">
          <svg
            class="laba-tubiao"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path class="laba-ti" d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
            <path class="laba-ge" d="M15 9a4 4 0 0 1 0 6" />
            <path class="laba-ge" d="M17.5 6.5a8 8 0 0 1 0 11" />
            <path class="laba-ge" d="M20 4a12 12 0 0 1 0 16" />
          </svg>
          <span class="laba-zhezhao" />
        </span>
        <span class="yuyin-shichang">{{ shiChangWenBen }}</span>
      </template>
      <span v-else class="bo-xing-zu" aria-hidden="true">
        <span
          v-for="(yiBo, suoYin) in boXingYiBo"
          :key="suoYin"
          class="bo-xing-tiao"
          :class="{ 'bo-xing-tiao--yi-bo': yiBo }"
        />
      </span>
    </button>
    <div v-if="boFangZhong" class="yuyin-jindu-qu">
      <input
        class="yuyin-jindu-tiao"
        type="range"
        :min="0"
        :max="zongMiao"
        :step="DUO_MEI_TI_PEI_ZHI.yuYinJinDuBuZhouMiao"
        :value="jinDuMiao"
        :aria-label="huoQuFanYi('duoMeiTi', 'tiaoZhuanYuYinJinDu')"
        @click.stop
        @input.stop="onSeek"
      />
      <span class="yuyin-jindu-wenben">{{ jinDuWenBen }} / {{ zongWenBen }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import {
  geShiHuaYuYinShiChang,
  yuYinKuanDuPx,
  yuYinKuanYangShi,
  type YuYinShiChangZaiTi,
} from '@/composables/use语音播放'

/**
 * 语音气泡（FP-11，用户需求 #10 语音条部分）：全站唯一实现，页面内不得再留第二份内联气泡。
 * 未播放态 = 3 格喇叭跳动 + 时长；播放中 = 波形采样 + 进度指示（可拖动/可键盘的进度条）。
 * 几何与状态语义取自 .agents/evidence/references/FP-13-语音条-20260921.md
 * （§1-A 时长→宽度映射、§1-C 三格 steps 跳动、§3 波形条与 SeekBar、§5 命中区、§6 slider 语义）。
 * 播放状态机不在此：它归各页面的 use语音播放 实例（全局互斥），本组件只收状态、只发意图。
 * 好友页当前仍按 FP-21 的契约把语音归入文件泡（HaoYouXiaoXi 没有时长字段），字段一到就把
 * 本组件挂上去：props 的 xiaoXi 只要求 YuYinShiChangZaiTi 那一个字段，两页的类型都满足。
 */
const props = defineProps<{
  xiaoXi: YuYinShiChangZaiTi
  boFangZhong: boolean
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
const zongWenBen = computed(
  () => `${Math.max(0, Math.floor(props.zongMiao))}″`,
)
const jinDuWenBen = computed(
  () => `${Math.max(0, Math.floor(props.jinDuMiao))}″`,
)

/** 渲染盒（含内边距）的实测净宽；0 = 尚未测得，此时退回映射宽 */
const ceLiangJingKuanPx = ref(0)
const qipaoEl = ref<HTMLElement | null>(null)
let guanChaShiXianJi: ResizeObserver | null = null

function ceLiangXianShiJingKuan(): void {
  const ele = qipaoEl.value
  if (!ele) return
  // border:none ⇒ clientWidth 即含内边距的渲染盒宽，已吃过 max-width:100% 这道 CSS 夹取
  const jing = ele.clientWidth - DUO_MEI_TI_PEI_ZHI.yuYinPaoNeidianPx * 2
  if (jing > 0) ceLiangJingKuanPx.value = jing
}

/** 波形几何的唯一真源：映射净宽与实测净宽取小（条数与显示宽从此同一数值） */
const xianShiJingKuanPx = computed(() => {
  const yingSheJingKuan =
    yuYinKuanDuPx(props.xiaoXi) - DUO_MEI_TI_PEI_ZHI.yuYinPaoNeidianPx * 2
  if (yingSheJingKuan <= 0) return 0
  if (ceLiangJingKuanPx.value <= 0) return yingSheJingKuan
  return Math.min(yingSheJingKuan, ceLiangJingKuanPx.value)
})

onMounted(() => {
  ceLiangXianShiJingKuan()
  const ele = qipaoEl.value
  if (!ele) return
  if (typeof ResizeObserver === 'function') {
    guanChaShiXianJi = new ResizeObserver(() => ceLiangXianShiJingKuan())
    guanChaShiXianJi.observe(ele)
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', ceLiangXianShiJingKuan)
  }
})

onBeforeUnmount(() => {
  guanChaShiXianJi?.disconnect()
  guanChaShiXianJi = null
  if (typeof window !== 'undefined') window.removeEventListener('resize', ceLiangXianShiJingKuan)
})

/**
 * 采样条数与显示宽**共用同一个夹取后的净宽**（本文件唯一的波形几何出口）。
 * 缺陷根因（第四波 BlindSpot M-6）：条数原本吃 `yuYinKuanDuPx()` 映射宽，而显示宽另外被
 * `.yuyin-qipao { max-width: 100% }` 夹进会话栏、被 `.bo-xing-zu { overflow: hidden }` 裁掉，
 * 两者各算各的 ⇒ 320/375 档下一条 60 秒语音按 300px 算出 69 条却只画得出前几十条，
 * `boXingYiBo` 用全量条数判点亮比例，可见区提前全亮，尾段进度画面不动。
 * 现在实测宽（已吃过 CSS 夹取的真实渲染盒）参与取小，条数与可见宽同源；测不到（SSR/jsdom
 * 首帧 clientWidth=0）才退回映射值，此时 CSS 也不会再夹，两者仍然一致。
 * 条数式 `floor(净宽 ÷（条宽+间距）)` 与取证 §4 的 `barCount` 同式，净余量恒 ≥ 0，
 * 即「条数 ×（条宽+间距）≤ 显示净宽」由构造成立（守卫见 __tests__/FP11b语音波形显示宽.test.ts）。
 */
const caoYangTiaoShu = computed(() => {
  const geKuan =
    DUO_MEI_TI_PEI_ZHI.yuYinCaoYangTiaoKuanPx + DUO_MEI_TI_PEI_ZHI.yuYinCaoYangJianJuPx
  return Math.max(1, Math.floor(xianShiJingKuanPx.value / geKuan))
})

const jinDuBiLi = computed(() => {
  if (props.zongMiao <= 0) return 0
  return Math.min(1, Math.max(0, props.jinDuMiao / props.zongMiao))
})

/** 逐条判定照抄取证 §3 的 `i / relHeights.length <= progress && progress > 0` */
const boXingYiBo = computed<boolean[]>(() => {
  const shu = caoYangTiaoShu.value
  const bi = jinDuBiLi.value
  return Array.from({ length: shu }, (_, i) => bi > 0 && i / shu <= bi)
})

function onSeek(shiJian: Event): void {
  const shuRu = shiJian.target as HTMLInputElement
  emit('tiaoZhuan', shuRu.valueAsNumber)
}
</script>

<style scoped>
/* 未播放态：喇叭 + 时长；播放中：波形采样。宽度随时长映射由 kuanYangShi 逐条给值。 */
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
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-xiao);
  box-sizing: border-box;
  min-height: var(--yuyin-pao-zui-xiao-gao);
  max-width: 100%;
  padding: var(--yuyin-pao-neidian);
  border: none;
  overflow: hidden;
  cursor: pointer;
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  /* 方向靠「贴头像那一角不圆」表达（取证 §1-B：成熟实现里没有三角尖角） */
  border-radius: 0 var(--yuyin-pao-yuanjiao) var(--yuyin-pao-yuanjiao)
    var(--yuyin-pao-yuanjiao);
  font-size: var(--ziti-zhong);
}

.yuyin-qipao--benren {
  flex-direction: row-reverse;
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  border-radius: var(--yuyin-pao-yuanjiao) 0 var(--yuyin-pao-yuanjiao)
    var(--yuyin-pao-yuanjiao);
}

.yuyin-qipao.bofangzhong {
  box-shadow: var(--qipao-yinying);
}

.yuyin-qipao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

/* 三格喇叭：图标 16×20，右侧同色遮罩按 steps(1,end) 硬切，一格→两格→三格循环 */
.laba-zu {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  width: var(--yuyin-laba-kuan);
  height: var(--yuyin-laba-gao);
  margin-right: var(--yuyin-laba-jian-ju);
}

.yuyin-qipao--benren .laba-zu {
  margin-right: 0;
  margin-left: var(--yuyin-laba-jian-ju);
}

.laba-tubiao {
  width: 100%;
  height: 100%;
}

.yuyin-qipao--benren .laba-tubiao {
  transform: rotate(180deg);
}

.laba-zhezhao {
  position: absolute;
  inset: 0;
  transform-origin: right;
  transform: scaleX(0);
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  animation: yuyin-laba-tiao 2s steps(1, end) infinite;
}

.yuyin-qipao--benren .laba-zhezhao {
  transform-origin: left;
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
}

@keyframes yuyin-laba-tiao {
  0% {
    transform: scaleX(0.7056);
  }
  50% {
    transform: scaleX(0.3953);
  }
  75%,
  100% {
    transform: scaleX(0);
    visibility: hidden;
  }
}

.yuyin-shichang {
  min-width: 0;
  font-size: var(--ziti-zhong);
  white-space: nowrap;
  overflow: hidden;
}

/* 播放中：波形采样条即进度指示——已播段实色、未播段同色淡档（取证 §3 的着色切换） */
.bo-xing-zu {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--yuyin-bo-xing-jian-ju);
  min-width: 0;
  height: var(--yuyin-bo-xing-gao);
  overflow: hidden;
}

.bo-xing-tiao {
  flex: 0 0 auto;
  width: var(--yuyin-bo-xing-tiao-kuan);
  height: 100%;
  border-radius: var(--yuyin-bo-xing-tiao-kuan);
  background: currentColor;
  opacity: 0.35;
  transition: opacity 250ms var(--quxian-biao-zhun);
}

.bo-xing-tiao--yi-bo {
  opacity: 1;
}

/* 进度指示的可拖动轨道：1px 轨 + 8px 滑块 + 42px 命中区（取证 §3 SeekBar 与 §5 命中区） */
.yuyin-jindu-qu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  width: 100%;
  min-width: 0;
}

.yuyin-jindu-tiao {
  flex: 1 1 auto;
  min-width: 0;
  height: var(--yuyin-re-ku);
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

.yuyin-jindu-wenben {
  flex: 0 0 auto;
  font-size: var(--ziti-xiao);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .laba-zhezhao {
    animation: none;
    transform: scaleX(0);
    visibility: hidden;
  }

  .bo-xing-tiao {
    transition: none;
  }
}
</style>
