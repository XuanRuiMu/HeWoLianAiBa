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
      <span class="laba-zu" :class="{ 'laba-zu--bofang': boFangZhong }" aria-hidden="true">
        <svg class="laba-tubiao" viewBox="0 0 62 78" fill="currentColor">
          <path
            class="laba-ge"
            d="M7.75 47.23c4.28 0 7.75-3.479 7.75-7.77 0-4.29-3.47-7.77-7.75-7.77-4.28 0-7.75 3.48-7.75 7.77 0 4.291 3.47 7.77 7.75 7.77z"
          />
          <path
            class="laba-ge"
            d="M28 39.5c0-6.638-2.558-12.755-7-17l5-5.5c5.936 5.662 9 13.637 9 22.5 0 8.604-3.364 16.373-9 22L21 56c4.225-4.22 7-10.048 7-16.5z"
          />
          <path
            class="laba-ge"
            d="M46.025 78.002L41 73c8.457-8.442 13.25-20.631 13.25-33.54C54.25 26.147 48.925 13.493 40 5l5.084-5C55.503 9.91 62 23.924 62 39.46c0 15.062-6.108 28.694-15.975 38.542z"
          />
        </svg>
      </span>
      <span class="yuyin-shichang">{{ shiChangWenBen }}</span>
      <div class="yuyin-jindu-xian" :style="jinDuXianYangShi" />
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
import { computed } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import {
  geShiHuaYuYinShiChang,
  yuYinKuanYangShi,
  type YuYinShiChangZaiTi,
} from '@/composables/use语音播放'

/**
 * 语音气泡（FP-K4b 微信喇叭像素级移植）：全站唯一实现，页面内不得再留第二份内联气泡。
 * 移植源 = TencentCloud/chat-uikit-vue message-audio.vue（Apache-2.0）+ msg-audio.svg。
 * 五要素：三段弧 SVG（62×78 viewBox，fill=currentColor）+ 同底色遮罩 scaleX 阶梯揭开
 * （0.7056/0.3953/0，`audio-play 2s steps(1,end)`）+ `N″` 时长 + 宽度 second*10+20 + 左右朝向。
 * 必改三处：svg fill → currentColor；.mask 硬编码底色 → clip-path（适配深浅双主题）；
 * 摘除腾讯引擎消息模型耦合（本项目自有消息模型 YuYinShiChangZaiTi）。
 * 额外功能：气泡底部 2px 进度线（currentTime/duration），与既有可拖动进度轴并存。
 * 播放状态机不在此：它归各页面的 use语音播放 实例（全局互斥），本组件只收状态、只发意图。
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

const jinDuBiLi = computed(() => {
  if (props.zongMiao <= 0) return 0
  return Math.min(1, Math.max(0, props.jinDuMiao / props.zongMiao))
})

/** 气泡底部 2px 进度线：宽度随时长比例推进，未播放时为 0（不可见） */
const jinDuXianYangShi = computed(() => ({
  width: `${(jinDuBiLi.value * 100).toFixed(2)}%`,
}))

function onSeek(shiJian: Event): void {
  const shuRu = shiJian.target as HTMLInputElement
  emit('tiaoZhuan', shuRu.valueAsNumber)
}
</script>

<style scoped>
/* 微信喇叭气泡：宽度随时长映射由 kuanYangShi 逐条给值；喇叭+时长恒显，播放中走 clip-path 揭开 */
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
  position: relative;
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

/* 三段弧微信喇叭：62×78 viewBox，fill=currentColor；播放中用 clip-path 阶梯揭开（源 .mask 硬编码底色已改） */
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

/* clip-path 揭开：从右往左露出（对方），本人档从左往右露出——与 rotate180 后的点弧朝向一致 */
.laba-zu--bofang {
  animation: laba-ji-kai 2s steps(1, end) infinite;
}

.yuyin-qipao--benren .laba-zu--bofang {
  animation-name: laba-ji-kai-benren;
}

@keyframes laba-ji-kai {
  0% {
    clip-path: inset(0 70.56% 0 0);
  }
  50% {
    clip-path: inset(0 39.53% 0 0);
  }
  75%,
  100% {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes laba-ji-kai-benren {
  0% {
    clip-path: inset(0 0 0 70.56%);
  }
  50% {
    clip-path: inset(0 0 0 39.53%);
  }
  75%,
  100% {
    clip-path: inset(0 0 0 0);
  }
}

.yuyin-shichang {
  min-width: 0;
  font-size: var(--ziti-zhong);
  white-space: nowrap;
  overflow: hidden;
}

/* 气泡底部 2px 进度线：currentTime/duration 比例推进，吃 currentColor 与主题同色 */
.yuyin-jindu-xian {
  position: absolute;
  bottom: 0;
  left: 0;
  height: var(--yuyin-jindu-xian-gao);
  background: currentColor;
  opacity: 0.55;
  pointer-events: none;
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
  .laba-zu--bofang {
    animation: none;
    clip-path: none;
  }
}
</style>
