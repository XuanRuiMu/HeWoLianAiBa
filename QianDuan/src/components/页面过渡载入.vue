<template>
  <Transition name="guodu">
    <div
      v-if="guoDuZhuangTai.jinXingZhong"
      class="guodu-fugai"
      role="status"
      aria-live="polite"
    >
      <svg class="guodu-tianchong" aria-hidden="true" width="100%" height="100%">
        <defs>
          <pattern
            id="guodu-wenyang-yi"
            patternUnits="userSpaceOnUse"
            :width="wenYangYi.danYuan"
            :height="wenYangYi.danYuan"
          >
            <path
              v-for="(luJing, xuHao) in wenYangYi.luJing"
              :key="'wenYangYi' + xuHao"
              class="guodu-wenyang-xian"
              :d="luJing"
            />
          </pattern>
          <pattern
            id="guodu-wenyang-er"
            patternUnits="userSpaceOnUse"
            :width="wenYangEr.danYuan"
            :height="wenYangEr.danYuan"
          >
            <path
              v-for="(luJing, xuHao) in wenYangEr.luJing"
              :key="'wenYangEr' + xuHao"
              class="guodu-wenyang-xian guodu-fuwen-xian"
              :d="luJing"
            />
          </pattern>
        </defs>
        <rect class="guodu-mianbu-kuai" x="0" y="0" width="100%" height="100%" />
        <rect
          class="guodu-wenyang-kuai"
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#guodu-wenyang-yi)"
        />
        <rect
          class="guodu-fuwen-kuai"
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#guodu-wenyang-er)"
        />
      </svg>

      <svg
        v-for="ceng in jiaoCeng"
        :key="ceng"
        class="guodu-jiao"
        :class="`guodu-jiao--${ceng}`"
        :viewBox="shiKongJian"
        preserveAspectRatio="xMinYMin meet"
        aria-hidden="true"
      >
        <g class="guodu-jiao-tian">
          <path
            v-for="(luJing, xuHao) in jiaoXingZuoShang.tianChong"
            :key="'tian' + xuHao"
            class="guodu-jiao-tian-xian"
            :d="luJing"
          />
        </g>
        <path
          v-for="(luJing, xuHao) in jiaoXingZuoShang.lunKuo"
          :key="'lun' + xuHao"
          class="guodu-jiao-xian guodu-jiao-lun-xian"
          :d="luJing"
          pathLength="1"
        />
        <path
          v-for="(luJing, xuHao) in jiaoXingZuoShang.tuoWei"
          :key="'tuo' + xuHao"
          class="guodu-jiao-xian guodu-jiao-tuo-xian"
          :d="luJing"
          pathLength="1"
        />
      </svg>

      <p class="guodu-wenben" aria-hidden="true">{{ guoDuZhuangTai.wenAn }}</p>
      <span class="ping-mu-wai">{{ guoDuZhuangTai.wenAn }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { guoDuZhuangTai } from '@/router/预取'
import { jiaoXingKuanDu, jiaoXingZuoShang, wenYangYi, wenYangEr } from '@/assets/手绘笔触路径'

const jiaoCeng = ['you-xia', 'zuo-shang'] as const
const shiKongJian = `0 0 ${jiaoXingKuanDu} ${jiaoXingKuanDu}`
</script>

<style scoped>
.guodu-fugai {
  position: fixed;
  inset: var(--daohanglan-gao-du) 0 0;
  z-index: var(--ceng-guodu);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: auto;
  background: transparent;
}

.guodu-tianchong,
.guodu-jiao {
  position: absolute;
  pointer-events: none;
}

.guodu-tianchong {
  inset: 0;
  width: 100%;
  height: 100%;
  clip-path: polygon(-100% 100%, 0% 0%, 200% 0%, 100% 100%);
  animation: guodu-pu-kai var(--guodu-jin-chang-san) var(--quxian-huan-ying) var(--guodu-jin-yan-san)
    both;
}

.guodu-mianbu-kuai {
  fill: var(--guodu-mian-bu);
}

.guodu-wenyang-kuai {
  opacity: var(--guodu-wen-du);
}

.guodu-fuwen-kuai {
  opacity: var(--guodu-fu-wen-du);
}

.guodu-wenyang-xian {
  fill: none;
  stroke: var(--guodu-mo-mu);
  stroke-width: var(--guodu-bi-kuan-wen);
  stroke-linecap: round;
}

.guodu-fuwen-xian {
  stroke-width: var(--guodu-bi-kuan-fu-wen);
}

.guodu-jiao {
  width: var(--guodu-jiao-kuan);
  height: var(--guodu-jiao-kuan);
  max-width: 62%;
  max-height: 86%;
  --guodu-jiao-qi-shi: 0ms;
  --guodu-jiao-tui-yan: 0ms;
}

.guodu-jiao--zuo-shang {
  top: 0;
  left: 0;
  --guodu-jiao-qi-shi: 0ms;
  --guodu-jiao-tui-yan: var(--guodu-tui-yan-san);
}

.guodu-jiao--you-xia {
  right: 0;
  bottom: 0;
  transform: rotate(180deg);
  --guodu-jiao-qi-shi: var(--guodu-jin-yan-er);
  --guodu-jiao-tui-yan: var(--guodu-tui-yan-er);
}

.guodu-jiao--zuo-shang .guodu-jiao-xian,
.guodu-jiao--zuo-shang .guodu-jiao-tian-xian {
  stroke: var(--guodu-mo-mu);
}

.guodu-jiao--you-xia .guodu-jiao-xian,
.guodu-jiao--you-xia .guodu-jiao-tian-xian {
  stroke: var(--guodu-cheng-se);
}

.guodu-jiao-xian {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  animation: guodu-hui-zhi var(--guodu-jin-chang-du) var(--quxian-tan-chu) var(--guodu-jiao-qi-shi)
    both;
}

.guodu-jiao-lun-xian {
  stroke-width: var(--guodu-bi-kuan-lun);
}

.guodu-jiao-tuo-xian {
  stroke-width: var(--guodu-bi-kuan-tuo);
}

.guodu-jiao-tian {
  animation: guodu-xian-xing var(--guodu-jin-chang-du) var(--quxian-tan-chu) var(--guodu-jiao-qi-shi)
    both;
}

.guodu-jiao-tian-xian {
  fill: none;
  stroke-linecap: round;
  stroke-width: var(--guodu-bi-kuan-tian);
  stroke-opacity: var(--guodu-tian-du);
}

.guodu-wenben {
  position: relative;
  max-width: var(--guodu-wen-kuan);
  margin: 0;
  padding: 0;
  text-align: center;
  font-family: var(--ziti-jiazu);
  font-size: var(--ziti-da);
  line-height: 1.6;
  letter-spacing: var(--guodu-zi-ju);
  color: var(--guodu-wen-zi);
  overflow-wrap: anywhere;
  text-shadow:
    0 0 var(--guodu-wen-guang-kuan) var(--guodu-mian-bu),
    0 0 var(--guodu-wen-guang-kuan) var(--guodu-mian-bu),
    0 0 var(--guodu-wen-guang-kuan) var(--guodu-mian-bu);
  animation: guodu-xian-xing var(--guodu-jin-chang-du) var(--quxian-tan-chu) var(--guodu-jin-yan-zi)
    both;
}

.ping-mu-wai {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.guodu-enter-active {
  transition: opacity var(--guodu-jin-chang-ye) var(--quxian-biao-zhun);
}

.guodu-leave-active {
  transition: opacity var(--guodu-tui-chang-ye) var(--quxian-biao-zhun);
  pointer-events: none;
}

.guodu-enter-from,
.guodu-leave-to {
  opacity: 0;
}

.guodu-leave-active .guodu-tianchong {
  animation: guodu-pu-kai var(--guodu-tui-chang-du) var(--quxian-huan-ying) reverse both;
}

.guodu-leave-active .guodu-jiao-xian {
  animation: guodu-hui-zhi var(--guodu-tui-chang-du) var(--quxian-tan-chu) var(--guodu-jiao-tui-yan)
    reverse both;
}

.guodu-leave-active .guodu-jiao-tian {
  animation: guodu-xian-xing var(--guodu-tui-chang-du) var(--quxian-tan-chu) var(--guodu-jiao-tui-yan)
    reverse both;
}

.guodu-leave-active .guodu-wenben {
  animation: guodu-xian-xing var(--guodu-tui-chang-du) var(--quxian-tan-chu) reverse both;
}

@keyframes guodu-hui-zhi {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes guodu-xian-xing {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes guodu-pu-kai {
  from {
    opacity: 0;
    clip-path: polygon(0% 100%, 100% 0%, 100% 0%, 0% 100%);
  }

  to {
    opacity: 1;
    clip-path: polygon(-100% 100%, 0% 0%, 200% 0%, 100% 100%);
  }
}

@media (max-width: 767px) {
  .guodu-fugai {
    top: var(--daohanglan-gao-du-zhai);
  }
}

@media (prefers-reduced-motion: reduce) {
  .guodu-enter-active,
  .guodu-leave-active {
    transition: none;
  }

  .guodu-tianchong,
  .guodu-jiao-xian,
  .guodu-jiao-tian,
  .guodu-wenben,
  .guodu-leave-active .guodu-tianchong,
  .guodu-leave-active .guodu-jiao-xian,
  .guodu-leave-active .guodu-jiao-tian,
  .guodu-leave-active .guodu-wenben {
    animation: none;
  }
}
</style>
