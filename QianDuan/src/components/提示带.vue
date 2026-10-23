<template>
  <div class="tishi-dai">
    <span class="tishi-dai-shengming" role="note" aria-live="polite">
      {{ huoQuFanYi('tongYong', 'aiTiShiTiao') }}
    </span>
    <span v-if="cuoWu" class="tishi-dai-cuowu" role="alert" aria-live="assertive">{{ cuoWu }}</span>
  </div>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/翻译表'

defineProps<{
  cuoWu?: string | null
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

.tishi-dai-cuowu {
  min-width: 0;
  color: color-mix(in srgb, var(--cuowu-yanse) 62%, var(--wenben-zhuse));
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
