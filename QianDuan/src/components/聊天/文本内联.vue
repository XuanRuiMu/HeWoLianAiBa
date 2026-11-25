<template>
  <template v-for="(pian, xiaBiao) in pianDuanLieBiao" :key="xiaBiao">
    <img
      v-if="pian.leiXing === 'weiXinBiaoQing'"
      class="wenben-neilian-biaoqing"
      :src="weiXinXiaoBiaoQingURL(pian.neiRong) || ''"
      :alt="pian.neiRong"
      :title="pian.neiRong"
      loading="lazy"
      decoding="async"
    />
    <template v-else>{{ pian.neiRong }}</template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { weiXinXiaoBiaoQingURL } from '@/config/微信原生表情'
import { qieFenWenBenWeiXinBiaoQing } from '@/utils/微信小表情渲染'

const props = defineProps<{
  neiRong: string
}>()

const pianDuanLieBiao = computed(() => qieFenWenBenWeiXinBiaoQing(props.neiRong))
</script>

<style scoped>
.wenben-neilian-biaoqing {
  display: inline-block;
  width: 20px;
  height: 20px;
  vertical-align: -4px;
  margin: 0 var(--jiange-1);
  object-fit: contain;
}
</style>
