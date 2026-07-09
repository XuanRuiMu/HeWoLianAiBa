<template>
  <Teleport to="body">
    <Transition name="motaikuang">
      <div v-if="xianShi" class="xieyi-zhezhao" @click.self="guanBi">
        <div class="xieyi-tanchuang">
          <div class="tanchuang-toubu">
            <h2 class="tanchuang-biaoti">
              {{ biaoTi }}
            </h2>
            <button class="guanbi-anniu" aria-label="关闭" @click="guanBi">✕</button>
          </div>
          <div ref="neirongQu" class="tanchuang-neirong">
            <pre class="xieyi-wenben">{{ yuanShiWenBen }}</pre>
          </div>
          <div class="tanchuang-dibu">
            <button class="zhidao-anniu" @click="guanBi">我已知晓</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import yongHuXieYiText from '@/assets/yongHuXieYi.txt?raw'
import yinSiZhengCeText from '@/assets/yinSiZhengCe.txt?raw'

const props = defineProps<{
  xianShi: boolean
  leiXing: 'yongHuXieYi' | 'yinSiZhengCe'
}>()

const emit = defineEmits<{
  (e: 'guanBi'): void
}>()

const neirongQu = ref<HTMLElement | null>(null)

const biaoTi = computed(() => {
  return props.leiXing === 'yongHuXieYi' ? '用户协议' : '隐私政策'
})

const yuanShiWenBen = computed(() => {
  return props.leiXing === 'yongHuXieYi' ? yongHuXieYiText : yinSiZhengCeText
})

watch(
  () => props.xianShi,
  (xinZhi) => {
    if (xinZhi && neirongQu.value) {
      neirongQu.value.scrollTop = 0
    }
  },
)

function guanBi() {
  emit('guanBi')
}
</script>

<style scoped>
.xieyi-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.xieyi-tanchuang {
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(20, 24, 40, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.tanchuang-toubu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.tanchuang-biaoti {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.guanbi-anniu {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guanbi-anniu:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.tanchuang-neirong {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  -webkit-overflow-scrolling: touch;
}

.tanchuang-neirong::-webkit-scrollbar {
  width: 4px;
}

.tanchuang-neirong::-webkit-scrollbar-track {
  background: transparent;
}

.tanchuang-neirong::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.xieyi-wenben {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  margin: 0;
}

.tanchuang-dibu {
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.zhidao-anniu {
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: #ffffff;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.zhidao-anniu:hover {
  box-shadow: 0 4px 20px rgba(107, 140, 166, 0.3);
  transform: translateY(-1px);
}

.motaikuang-enter-active {
  transition: opacity 0.3s ease;
}

.motaikuang-enter-active .xieyi-tanchuang {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}

.motaikuang-leave-active {
  transition: opacity 0.2s ease;
}

.motaikuang-leave-active .xieyi-tanchuang {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.motaikuang-enter-from {
  opacity: 0;
}

.motaikuang-enter-from .xieyi-tanchuang {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

.motaikuang-leave-to {
  opacity: 0;
}

.motaikuang-leave-to .xieyi-tanchuang {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 767px) {
  .xieyi-zhezhao {
    padding: 16px;
  }

  .xieyi-tanchuang {
    max-height: 85vh;
  }

  .tanchuang-toubu {
    padding: 16px 20px 12px;
  }

  .tanchuang-neirong {
    padding: 16px 20px;
  }

  .tanchuang-dibu {
    padding: 12px 20px 16px;
  }
}

:root[data-theme='浅色'] .xieyi-zhezhao {
  background: rgba(0, 0, 0, 0.25);
}

:root[data-theme='浅色'] .xieyi-tanchuang {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.12);
}

:root[data-theme='浅色'] .tanchuang-toubu {
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

:root[data-theme='浅色'] .tanchuang-biaoti {
  color: #1a1a2e;
}

:root[data-theme='浅色'] .guanbi-anniu {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.5);
}

:root[data-theme='浅色'] .guanbi-anniu:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #1a1a2e;
}

:root[data-theme='浅色'] .tanchuang-neirong::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
}

:root[data-theme='浅色'] .xieyi-wenben {
  color: rgba(0, 0, 0, 0.75);
}

:root[data-theme='浅色'] .tanchuang-dibu {
  border-top-color: rgba(0, 0, 0, 0.06);
}
</style>
