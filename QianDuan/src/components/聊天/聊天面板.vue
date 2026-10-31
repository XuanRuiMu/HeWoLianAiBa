<template>
  <component
    :is="yuanSu"
    class="liao-tian-mian-ban"
    :class="[{ 'gun-dong': shiGunDong }, beiJingLeiMing, leiMing]"
    :style="[beiJingYangShi, mianBanQiPaoYangShi]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use聊天皮肤 } from '@/composables/use聊天皮肤'

type LeiMing = string | Record<string, boolean> | Array<string | Record<string, boolean>> | undefined

const props = withDefaults(
  defineProps<{
    yuanSu?: 'div' | 'main'
    leiMing?: LeiMing
    qiPaoYangShi?: Record<string, string> | null
    shiGunDong?: boolean
  }>(),
  {
    yuanSu: 'div',
    leiMing: undefined,
    qiPaoYangShi: null,
    shiGunDong: false,
  },
)

const { beiJingLeiMing, beiJingYangShi, qiPaoYangShi } = use聊天皮肤()
const mianBanQiPaoYangShi = computed(() => props.qiPaoYangShi ?? qiPaoYangShi.value)
</script>

<style scoped>
.liao-tian-mian-ban {
  display: flex;
  flex-direction: column;
  padding: var(--jiange-12) var(--jiange-zhong);
  background: var(--liaotian-beijing);
  font-family: var(--ziti-jiazu);
}

.liao-tian-mian-ban.gun-dong {
  padding-bottom: 0;
}

.liao-tian-mian-ban.beijing-moRen {
  background: var(--liaotian-beijing);
}

.liao-tian-mian-ban.beijing-chenWuQing {
  background: var(--liaotian-beijing-chenWuQing);
}

.liao-tian-mian-ban.beijing-muZiXingYe {
  background: var(--liaotian-beijing-muZiXingYe);
}

.liao-tian-mian-ban.beijing-miWuSenLin {
  background: var(--liaotian-beijing-miWuSenLin);
}

.liao-tian-mian-ban.beijing-haiYangZhiLan {
  background: var(--liaotian-beijing-haiYangZhiLan);
}

.liao-tian-mian-ban.beijing-fenSeMengJing {
  background: var(--liaotian-beijing-fenSeMengJing);
}

.liao-tian-mian-ban.beijing-yeKongXingHe {
  background: var(--liaotian-beijing-yeKongXingHe);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.liao-tian-mian-ban.beijing-miSeTianYuan {
  background: var(--liaotian-beijing-miSeTianYuan);
}

@media (max-width: 480px) {
  .liao-tian-mian-ban {
    padding: var(--jiange-10) var(--jiange-12);
  }
}
</style>
