<template>
  <button
    type="button"
    class="tupian-qipao"
    :aria-label="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
    @click.stop="emit('dian-ji', url)"
  >
    <span
      v-if="!yiJiaZai"
      class="tupian-gujia"
      :class="{ 'tupian-gujia--fang': shiBiaoQingBao }"
      aria-hidden="true"
    />
    <img
      :class="[shiBiaoQingBao ? 'biaoqingbao-tu' : 'tupian-xianshi', { 'yincang-tu': !yiJiaZai }]"
      :src="url"
      alt=""
      loading="lazy"
      decoding="async"
      @load="yiJiaZai = true"
      @error="emit('cuo-wu', $event)"
    />
  </button>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

const props = withDefaults(
  defineProps<{
    url?: string
    shiBiaoQingBao?: boolean
  }>(),
  {
    url: '',
    shiBiaoQingBao: false,
  },
)

const emit = defineEmits<{
  (e: 'dian-ji', url: string): void
  (e: 'cuo-wu', shiJian: Event): void
}>()

const yiJiaZai = ref(false)

watch(
  () => props.url,
  () => {
    yiJiaZai.value = false
  },
)
</script>

<style scoped>
.tupian-qipao {
  position: relative;
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  line-height: 0;
}

.tupian-xianshi {
  display: block;
  max-width: var(--tuwen-tu-zuidakuan);
  max-height: var(--tuwen-tu-zuida-gao);
  border-radius: var(--yuanjiao-xiao);
  -webkit-touch-callout: none;
}

.yincang-tu {
  visibility: hidden;
  position: absolute;
}

.biaoqingbao-tu {
  display: block;
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  max-width: var(--duomeiti-biaoqingbao-chicun);
  max-height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
}

.tupian-gujia {
  display: block;
  width: var(--tuwen-tu-zuidakuan);
  aspect-ratio: 4 / 3;
  border-radius: var(--yuanjiao-xiao);
  background: var(--touxiang-beijing-moren);
  animation: tupianGujiaShanshuo 1.2s ease-in-out infinite;
}

.tupian-gujia--fang {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  aspect-ratio: 1 / 1;
}

@keyframes tupianGujiaShanshuo {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tupian-gujia {
    animation: none;
  }
}
</style>
