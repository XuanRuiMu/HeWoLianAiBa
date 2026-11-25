<template>
  <Transition name="gengduo-zhankai">
    <div v-show="zhanKai" class="gengduo-mianban">
      <button
        type="button"
        class="gengduo-rukou"
        @click="emit('dian-ji-xiang-ce')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>{{ huoQuFanYi('duoMeiTi', 'xiangCe') }}</span>
      </button>
      <button
        type="button"
        class="gengduo-rukou"
        @click="emit('dian-ji-wen-jian')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <span>{{ huoQuFanYi('duoMeiTi', 'wenJian') }}</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/翻译表'

defineProps<{
  zhanKai: boolean
}>()

const emit = defineEmits<{
  (e: 'dian-ji-xiang-ce'): void
  (e: 'dian-ji-wen-jian'): void
}>()
</script>

<style scoped>
.gengduo-mianban {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-xiao);
  padding: var(--jiange-10);
  background: var(--beijing-ciuse);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  border-radius: var(--yuanjiao-zhong);
}

.gengduo-rukou {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-6);
  padding: var(--jiange-12) var(--jiange-4);
  border: none;
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  cursor: pointer;
  transition: background 0.15s ease;
}

.gengduo-rukou:hover {
  background: var(--caidan-hover);
}

.gengduo-rukou:active {
  background: var(--caidan-active);
}

.gengduo-rukou svg {
  width: var(--shuru-tubiao-glyph-chicun);
  height: var(--shuru-tubiao-glyph-chicun);
}

.gengduo-zhankai-enter-active,
.gengduo-zhankai-leave-active {
  transition: max-height 0.2s var(--quxian-biao-zhun), opacity 0.2s var(--quxian-biao-zhun);
  overflow: hidden;
}

.gengduo-zhankai-enter-from,
.gengduo-zhankai-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gengduo-zhankai-enter-active,
  .gengduo-zhankai-leave-active {
    transition: none;
  }
}
</style>
