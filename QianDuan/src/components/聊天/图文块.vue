<template>
  <span
    v-for="(kuai, xiaBiao) in kuaiLieBiao"
    :key="xiaBiao"
    class="tuwen-kuai"
    :class="kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian ? 'tuwen-kuai--tu' : 'tuwen-kuai--wen'"
  >
    <img
      v-if="kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian"
      class="tuwen-kuai-tu"
      :class="{ 'tuwen-kuai-tu--biaoqingbao': shiBiaoQingBaoKuai(kuai) }"
      :src="kuai.mei_ti_url || tuDiZhi || ''"
      :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
      loading="lazy"
      decoding="async"
      @click.stop="emit('dian-ji', kuai.mei_ti_url || tuDiZhi)"
      @error="emit('cuo-wu', $event)"
    />
    <template v-else>{{ kuai.nei_rong }}</template>
  </span>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/翻译表'
import { XIAO_XI_KUAI_LEI_XING, shiBiaoQingBaoKuai } from '@/utils/消息内容块'
import type { XiaoXiKuaiChuCan } from '@/types/类型定义'

withDefaults(
  defineProps<{
    kuaiLieBiao: XiaoXiKuaiChuCan[]
    tuDiZhi?: string | null
  }>(),
  {
    tuDiZhi: null,
  },
)

const emit = defineEmits<{
  (e: 'dian-ji', url: string | null | undefined): void
  (e: 'cuo-wu', shiJian: Event): void
}>()
</script>

<style scoped>
.tuwen-kuai--tu {
  display: block;
}

.tuwen-kuai-tu {
  display: block;
  max-width: var(--tuwen-tu-zuidakuan);
  max-height: var(--tuwen-tu-zuida-gao);
  border-radius: 6px;
  object-fit: cover;
  cursor: zoom-in;
}

.tuwen-kuai-tu--biaoqingbao {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  max-width: var(--duomeiti-biaoqingbao-chicun);
  max-height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
}
</style>
