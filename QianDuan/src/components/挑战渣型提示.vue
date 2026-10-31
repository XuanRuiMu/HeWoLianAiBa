<template>
  <p v-if="zhaXingGaiLv > 0" class="zha-xing-ti-shi" role="note">
    <span class="ti-shi-biao" aria-hidden="true" />
    <span class="ti-shi-nei-rong">
      {{
        huoQuFanYi('tiaoZhan', 'zhaXingGaiLvTiShi').replace(
          '{probability}',
          String(Math.round(zhaXingGaiLv * 100)),
        )
      }}
    </span>
  </p>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/翻译表'

defineProps<{
  zhaXingGaiLv: number
}>()
</script>

<style scoped>
.zha-xing-ti-shi {
  --zha-xian-kuan: 2px;
  --zha-wen: color-mix(in srgb, var(--wenben-ciuse) 55%, var(--wenben-zhuse));
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-xiao);
  margin: 0;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-left: var(--zha-xian-kuan) solid var(--yanse-weixian);
  border-radius: 0 var(--yuanjiao-xiao) var(--yuanjiao-xiao) 0;
  background: color-mix(in srgb, var(--yanse-weixian) 8%, transparent);
}

.ti-shi-biao {
  flex: none;
  width: var(--jiange-6);
  height: var(--jiange-6);
  margin-top: calc(var(--ziti-xiao) * 0.55);
  border-radius: 50%;
  background: var(--yanse-weixian);
}

.ti-shi-nei-rong {
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  color: var(--zha-wen);
}
</style>
