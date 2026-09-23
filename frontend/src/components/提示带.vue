<template>
  <div class="tishi-dai">
    <span class="tishi-dai-shengming" role="note" aria-live="polite">
      {{ huoQuFanYi('tongYong', 'aiTiShiTiao') }}
    </span>
    <span v-if="cuoWu" class="tishi-dai-cuowu" role="alert" aria-live="assertive">{{ cuoWu }}</span>
  </div>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/translations'

defineProps<{
  cuoWu?: string | null
}>()
</script>

<style scoped>
/* FP-07（需求 #8）AI 声明与错误提示的同一条带：声明在左、提示在右、整条居中。
   本体是 .aitishi-tiao 的唯一后继，尺寸取值逐字沿用改前实测值（10px / 3px 12px / 11px / 1.4），
   量纲自 FP-31 起住 styles/variables.css 共用 :root 的 --tishi-dai-* 四枚（本组件是唯一消费者），
   组件内不再留裸 px；颜色一律吃既有令牌。
   pointer-events 与 user-select 必须是可选中的：这两条声明就是需求 #8 的根因本体。 */
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
  color: var(--cuowu-yanse);
  overflow-wrap: anywhere;
}
</style>
