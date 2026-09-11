<template>
  <Transition name="zhezhao-xianshi">
    <div
      v-if="youXiShiJianZhanKai"
      class="youxi-zhezhao"
      @click.self="$emit('update:youXiShiJianZhanKai', false)"
    >
      <div class="youxi-tanchuang" :class="youXiShiJianLeiXing">
        <div class="youxi-tubiao">
          {{ youXiShiJianLeiXing === 'shengli' ? '🎉' : '💔' }}
        </div>
        <h2 class="youxi-biaoti">
          {{
            youXiShiJianLeiXing === 'shengli'
              ? huoQuFanYi('liaoTian', 'gongXiTongGuan')
              : huoQuFanYi('liaoTian', 'gongLueShiBai')
          }}
        </h2>
        <p class="youxi-miaoshu">
          {{ youXiShiJianNeiRong }}
        </p>
        <div class="youxi-anniu-zu">
          <button class="youxi-anniu fanhui" @click="fanhuiShouYe">
            {{ huoQuFanYi('liaoTian', 'fanHuiShouYe') }}
          </button>
          <button class="youxi-anniu chakan" @click="chakanZhanJi">
            {{ huoQuFanYi('liaoTian', 'chaKanZhanJi') }}
          </button>
        </div>
        <div
          v-if="youXiShiJianLeiXing === 'shengli' && prefersReducedMotion === false"
          class="youxi-cai-dai-rong-qi"
          aria-hidden="true"
        >
          <div v-for="i in caiDaiCount" :key="i" class="cai-dai" :style="caiDaiYangShi(i)" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { huoQuFanYi } from '@/config/translations'

interface Props {
  youXiShiJianZhanKai: boolean
  youXiShiJianLeiXing: 'shengli' | 'shibai'
  youXiShiJianNeiRong: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:youXiShiJianZhanKai', value: boolean): void
}>()

const prefersReducedMotion = computed(() => {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const caiDaiCount = 30

function caiDaiYangShi(index: number) {
  const colors = [
    '#ff6b9d',
    '#ffd700',
    '#00ffff',
    '#ff6b6b',
    '#98fb98',
    '#ff69b4',
    '#00ff7f',
    '#ffa500',
  ]
  const color = colors[index % colors.length]
  const left = Math.random() * 100
  const size = 6 + Math.random() * 10
  const duration = 2 + Math.random() * 2
  const delay = Math.random() * 1.5
  const rotation = Math.random() * 360
  const skewX = (Math.random() - 0.5) * 20
  return {
    left: `${left}%`,
    backgroundColor: color,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    transform: `rotate(${rotation}deg) skewX(${skewX}deg)`,
  }
}

function fanhuiShouYe() {
  window.dispatchEvent(new CustomEvent('结算-返回首页'))
}

function chakanZhanJi() {
  window.dispatchEvent(new CustomEvent('结算-查看战绩'))
}

function faQiZhenDong() {
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100, 50, 200])
  }
}

function handleMediaChange(e: MediaQueryListEvent) {
  // prefers-reduced-motion 变化时响应式更新由计算属性自动处理
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaQuery.addEventListener?.('change', handleMediaChange)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaQuery.removeEventListener?.('change', handleMediaChange)
  }
})

watch(
  () => props.youXiShiJianZhanKai,
  async (newVal) => {
    if (newVal && props.youXiShiJianLeiXing === 'shengli') {
      await nextTick()
      faQiZhenDong()
    }
  },
)

defineExpose({
  faQiZhenDong,
})
</script>

<style scoped>
.youxi-zhezhao {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: zhezhao-xianshi 0.25s ease-out;
}

@keyframes zhezhao-xianshi {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.youxi-tanchuang {
  background: var(--kapian-beijing);
  border: 1px solid var(--kapian-bian);
  border-radius: 16px;
  padding: 24px;
  max-width: 300px;
  width: 90%;
  text-align: center;
  animation: tanchuang-guodu 0.3s ease-out;
  position: relative;
}

@keyframes tanchuang-guodu {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.youxi-tubiao {
  font-size: 48px;
  margin-bottom: 12px;
}

.youxi-biaoti {
  font-size: 18px;
  font-weight: 600;
  color: var(--wenben-zhuti);
  margin-bottom: 8px;
}

.youxi-miaoshu {
  color: var(--wenben-ciuse);
  margin-bottom: 24px;
  line-height: 1.5;
}

.youxi-anniu-zu {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.youxi-anniu {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.youxi-anniu.fanhui {
  background: var(--kapian-beijing);
  color: var(--wenben-zhuti);
  border: 1px solid var(--kapian-bian);
}

.youxi-anniu.fanhui:hover {
  background: var(--anniu-beijing-hover);
}

.youxi-anniu.chakan {
  background: linear-gradient(135deg, #ff6b9d, #ff8fb1);
  color: white;
}

.youxi-anniu.chakan:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.4);
}

/* 彩带/彩纸动画容器 */
.youxi-cai-dai-rong-qi {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 999;
}

.cai-dai {
  position: absolute;
  top: -10%;
  border-radius: 2px;
  animation: caiDaiDrop 3s ease-in forwards;
  will-change: transform, opacity;
}

@keyframes caiDaiDrop {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(110vh) rotate(720deg);
    opacity: 0;
  }
}

/* 减少动画偏好：禁用彩带 */
@media (prefers-reduced-motion: reduce) {
  .cai-dai {
    display: none;
  }
}
</style>
