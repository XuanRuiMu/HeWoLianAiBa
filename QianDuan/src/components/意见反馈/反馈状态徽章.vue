<template>
  <span class="fankui-zhuangtai-huizhang" :class="'fankui-zhuangtai-huizhang--' + zhuangTai">
    {{ wenAn }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import type { FanKuiZhuangTai } from '@/types/类型定义'

const props = defineProps<{
  zhuangTai: FanKuiZhuangTai
}>()

const wenAn = computed(() => {
  if (props.zhuangTai === 'xinJian') return huoQuFanYi('yiJianFanKui', 'woDeZhuangTaiXinJian')
  if (props.zhuangTai === 'chuLiZhong') return huoQuFanYi('yiJianFanKui', 'woDeZhuangTaiChuLiZhong')
  if (props.zhuangTai === 'yiJieJue') return huoQuFanYi('yiJianFanKui', 'woDeZhuangTaiYiJieJue')
  return huoQuFanYi('yiJianFanKui', 'woDeZhuangTaiYiJuJue')
})
</script>

<style scoped>
.fankui-zhuangtai-huizhang {
  display: inline-flex;
  align-items: center;
  padding: var(--jiange-1) var(--jiange-xiao);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.fankui-zhuangtai-huizhang--xinJian {
  color: var(--zhuse);
  background: color-mix(in srgb, var(--zhuse) 14%, transparent);
}

.fankui-zhuangtai-huizhang--chuLiZhong {
  color: var(--jinggao-yanse);
  background: color-mix(in srgb, var(--jinggao-yanse) 16%, transparent);
}

.fankui-zhuangtai-huizhang--yiJieJue {
  color: var(--chenggong-yanse);
  background: color-mix(in srgb, var(--chenggong-yanse) 14%, transparent);
}

.fankui-zhuangtai-huizhang--yiJuJue {
  color: var(--wenben-ciuse);
  background: color-mix(in srgb, var(--wenben-ciuse) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--wenben-ciuse) 45%, transparent);
}
</style>
