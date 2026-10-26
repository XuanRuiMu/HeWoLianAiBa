<template>
  <div class="tishi-dai">
    <span class="tishi-dai-shengming" role="note" aria-live="polite">
      {{ huoQuFanYi('tongYong', 'aiTiShiTiao') }}
    </span>
    <span v-if="zengLiang?.length" class="tishi-dai-zengliang" aria-live="polite">
      <span
        v-for="xiang in zengLiang"
        :key="xiang.mingCheng"
        class="tishi-dai-zengliang-xiang"
        :class="xiang.shuZhi > 0 ? 'zheng' : 'fu'"
      >
        {{ xiang.mingCheng }} {{ xiang.shuZhi > 0 ? `+${xiang.shuZhi}` : xiang.shuZhi }}
      </span>
    </span>
    <span v-if="cuoWu" class="tishi-dai-cuowu" role="alert" aria-live="assertive">{{ cuoWu }}</span>
  </div>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/翻译表'

defineProps<{
  cuoWu?: string | null
  zengLiang?: Array<{ mingCheng: string; shuZhi: number }> | null
}>()
</script>

<style scoped>

.tishi-dai {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  column-gap: var(--tishi-dai-lie-ju);
  row-gap: 0;
  flex-shrink: 0;
  padding: var(--tishi-dai-neidian-shang-xia) var(--tishi-dai-neidian-zuo-you);
  font-size: var(--tishi-dai-zihao);
  line-height: 1.4;
  text-align: center;
  color: var(--wenben-ciuse);
  background: var(--beijing-ciuse);
  pointer-events: auto;
  -webkit-user-select: text;
  user-select: text;
}

.tishi-dai-shengming {
  flex-shrink: 0;
}

.tishi-dai-zengliang {
  display: inline-flex;
  align-items: baseline;
  gap: var(--tishi-dai-lie-ju);
  white-space: nowrap;
  flex-shrink: 0;
}

.tishi-dai-zengliang-xiang {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  animation: tishi-dai-zengliang-danru 0.24s ease;
}

.tishi-dai-zengliang-xiang.zheng {
  color: color-mix(in srgb, var(--chenggong-yanse) 72%, var(--wenben-zhuse));
}

.tishi-dai-zengliang-xiang.fu {
  color: color-mix(in srgb, var(--cuowu-yanse) 72%, var(--wenben-zhuse));
}

@keyframes tishi-dai-zengliang-danru {
  from {
    opacity: 0;
    transform: translateY(2px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tishi-dai-zengliang-xiang {
    animation: none;
  }
}

.tishi-dai-cuowu {
  min-width: 0;
  color: color-mix(in srgb, var(--cuowu-yanse) 62%, var(--wenben-zhuse));
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
