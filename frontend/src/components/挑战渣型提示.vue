<template>
  <div v-if="zhaXingGaiLv > 0" class="zha-xing-ti-shi">
    <span class="ti-shi-nei-rong">
      {{
        huoQuFanYi('tiaoZhan', 'zhaXingGaiLvTiShi').replace(
          '{probability}',
          String(Math.round(zhaXingGaiLv * 100)),
        )
      }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/translations'

interface Props {
  zhaXingGaiLv: number
}

const props = defineProps<Props>()

const zhaXingGaiLv = computed(() => props.zhaXingGaiLv)
</script>

<style scoped>
.zha-xing-ti-shi {
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 10px;
}

:root[data-theme='light'] .zha-xing-ti-shi {
  background: rgba(255, 107, 107, 0.08);
  border-color: rgba(255, 107, 107, 0.25);
}

.ti-shi-nei-rong {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #ff6b6b;
  line-height: 1.4;
}

:root[data-theme='light'] .ti-shi-nei-rong {
  color: #cc3333;
}
</style>
