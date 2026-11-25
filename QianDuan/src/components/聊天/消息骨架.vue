<template>
  <div class="gujia-liebiao" :class="{ 'gujia-liebiao--ding-di': dingDi }" aria-hidden="true">
    <div
      v-for="(hang, xiaBiao) in hangPeiZhi"
      :key="xiaBiao"
      class="gujia-xiangmu"
      :class="hang.shiYouCe ? 'gujia-xiangmu--youce' : 'gujia-xiangmu--zuoce'"
    >
      <span v-if="!hang.shiYouCe" class="gujia-wei" />
      <span class="gujia-qipao" :style="{ width: hang.kuanDu }" />
      <span v-if="hang.shiYouCe" class="gujia-wei" />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface GuJiaHang {
  kuanDu: string
  shiYouCe: boolean
}

withDefaults(
  defineProps<{
    hangPeiZhi: GuJiaHang[]
    dingDi?: boolean
  }>(),
  {
    dingDi: false,
  },
)
</script>

<style scoped>
.gujia-liebiao {
  display: flex;
  flex-direction: column;
}

.gujia-liebiao--ding-di {
  margin-top: auto;
}

.gujia-xiangmu {
  display: flex;
  align-items: flex-start;
  margin-bottom: var(--jiange-zhong);
}

.gujia-xiangmu--zuoce {
  flex-direction: row;
  align-self: flex-start;
}

.gujia-xiangmu--youce {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.gujia-wei {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--shijian-biaoqian-beijing);
  flex-shrink: 0;
  animation: guJiaShanShuo 1.2s ease-in-out infinite;
}

.gujia-xiangmu--zuoce .gujia-wei {
  margin-right: var(--jiange-10);
}

.gujia-xiangmu--youce .gujia-wei {
  margin-left: var(--jiange-10);
}

.gujia-qipao {
  display: inline-block;
  height: 40px;
  border-radius: var(--qipao-yuanjiao);
  background: var(--shijian-biaoqian-beijing);
  animation: guJiaShanShuo 1.2s ease-in-out infinite;
}

@keyframes guJiaShanShuo {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gujia-wei,
  .gujia-qipao {
    animation: none;
  }
}
</style>
