<template>
  <div v-if="shiXianDuanWang" class="duan-wang-heng-fu" role="alert" aria-live="polite">
    <span class="duan-wang-wen-ben">{{ huoQuFanYi('tongYong', 'duanWang') }}</span>
    <button
      class="duan-wang-guan-bi"
      :aria-label="huoQuFanYi('tongYong', 'guanBi')"
      @click="yinCangDuanWang"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { huoQuFanYi } from '@/config/translations'

const shiXianDuanWang = ref(false)
const yiZhuYi = ref(false)
const zaiXianZhuangTai = ref(true)

function xianShiDuanWang() {
  if (!zaiXianZhuangTai.value) {
    shiXianDuanWang.value = true
    yiZhuYi.value = true
  }
}

function yinCangDuanWang() {
  shiXianDuanWang.value = false
}

function guanChaWangLuoBianHua() {
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
}

function quXiaoGuanCha() {
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online', handleOnline)
}

function handleOffline() {
  zaiXianZhuangTai.value = false
  xianShiDuanWang()
}

function handleOnline() {
  zaiXianZhuangTai.value = true
  yinCangDuanWang()
}

onMounted(() => {
  zaiXianZhuangTai.value = navigator.onLine
  if (!zaiXianZhuangTai.value && !yiZhuYi.value) {
    xianShiDuanWang()
  }
  guanChaWangLuoBianHua()
})

onBeforeUnmount(() => {
  quXiaoGuanCha()
})

defineExpose({
  xianShiDuanWang,
  yinCangDuanWang,
})
</script>

<style scoped>
.duan-wang-heng-fu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--jinggao-yanse);
  color: #1a1a1a;
  font-size: var(--ziti-xiao);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  animation: xiaLa 0.3s ease-out;
}

.duan-wang-wen-ben {
  white-space: nowrap;
}

.duan-wang-guan-bi {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  color: #1a1a1a;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.2s ease;
}

.duan-wang-guan-bi:hover {
  background: rgba(0, 0, 0, 0.2);
}

.duan-wang-guan-bi svg {
  width: 16px;
  height: 16px;
}

@keyframes xiaLa {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .duan-wang-heng-fu {
    animation: none;
  }
}
</style>
