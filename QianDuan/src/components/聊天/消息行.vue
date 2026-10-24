<template>
  <div class="xiaoxi-xiangmu" :class="[shiBenRen ? 'yonghu-xiaoxi' : 'jiaose-xiaoxi', leiMing]">
    <div v-if="xianShiTouXiang" class="xiaoxi-wei">
      <TouXiang :tou-xiang="touXiang" :mo-ren-zi="moRenZi" :shen-fen="shenFen" />
      <slot name="tou-xiang-jiao" />
    </div>
    <div v-if="!wuWaiKe" class="qipao-waike" :class="waiKeLeiMing">
      <slot />
    </div>
    <slot v-else />
    <slot name="wei-jiao" />
  </div>
</template>

<script setup lang="ts">
import TouXiang from '@/components/头像.vue'

type LeiMing = string | Record<string, boolean> | Array<string | Record<string, boolean>> | undefined

withDefaults(
  defineProps<{
    shiBenRen?: boolean
    leiMing?: LeiMing
    waiKeLeiMing?: LeiMing
    wuWaiKe?: boolean
    xianShiTouXiang?: boolean
    touXiang?: string | null
    moRenZi?: string
    shenFen?: 'jiaose' | 'yonghu' | 'duiju'
  }>(),
  {
    shiBenRen: false,
    leiMing: undefined,
    waiKeLeiMing: undefined,
    wuWaiKe: false,
    xianShiTouXiang: true,
    touXiang: null,
    moRenZi: undefined,
    shenFen: undefined,
  },
)
</script>

<style scoped>
.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  position: relative;
  max-width: 100%;
  margin-bottom: var(--jiange-zhong);
}

.xiaoxi-xiangmu.yonghu-xiaoxi {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.xiaoxi-xiangmu.jiaose-xiaoxi {
  flex-direction: row;
  align-self: flex-start;
}

.xiaoxi-wei {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-beijing-moren);
  flex-shrink: 0;
  font-size: 18px;
  color: var(--wenben-zhuse);
}

.yonghu-xiaoxi .xiaoxi-wei {
  margin-left: var(--jiange-10);
}

.jiaose-xiaoxi .xiaoxi-wei {
  margin-right: var(--jiange-10);
}

.qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}

@media (max-width: 480px) {
  .qipao-waike {
    max-width: min(calc(100vw - 120px), 420px);
  }
}

.qipao-waike.tupian-waike {
  --duomeiti-tupian-zuidakuan: 180px;
  --duomeiti-tupian-morenkuan: 160px;
  max-width: min(calc(100vw - 126px), 260px);
}

.qipao-waike.wenjian-waike {
  max-width: min(calc(100vw - 126px), 320px);
}

.qipao-waike.yuyin-waike {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.qipao-waike.biaoqingbao-waike {
  background: transparent;
}
</style>
