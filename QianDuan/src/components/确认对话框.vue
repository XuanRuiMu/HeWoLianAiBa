<template>
  <FuCengDuiHuaKuang
    :xian-shi="xianShi"
    :biao-ti="biaoTi"
    :miao-shu="miaoShu"
    kuan="zhong"
    :dian-ji-zhe-zhao-guan-bi="!caoZuoZhong"
    @guan-bi="quXiao"
  >
    <template #jiaoBu>
      <button
        type="button"
        class="que-ren-an-niu que-ren-an-niu--ci"
        data-shou-xuan
        :disabled="caoZuoZhong"
        @click="quXiao"
      >
        {{ quXiaoWenAn }}
      </button>
      <button
        type="button"
        class="que-ren-an-niu"
        :class="weiXian ? 'que-ren-an-niu--wei-xian' : 'que-ren-an-niu--zhu'"
        :disabled="caoZuoZhong"
        @click="queRen"
      >
        {{ queRenWenAn }}
      </button>
    </template>
  </FuCengDuiHuaKuang>
</template>

<script setup lang="ts">
import FuCengDuiHuaKuang from '@/components/浮层对话框.vue'

withDefaults(
  defineProps<{
    xianShi: boolean
    biaoTi: string
    miaoShu: string
    queRenWenAn: string
    quXiaoWenAn: string
    weiXian?: boolean
    caoZuoZhong?: boolean
  }>(),
  {
    weiXian: true,
    caoZuoZhong: false,
  },
)

const faChu = defineEmits<{
  (shiJian: 'que-ren'): void
  (shiJian: 'qu-xiao'): void
}>()

function queRen(): void {
  faChu('que-ren')
}

function quXiao(): void {
  faChu('qu-xiao')
}
</script>

<style scoped>
.que-ren-an-niu {
  min-width: 104px;
  min-height: var(--wai-guan-re-ku);
  padding: var(--jiange-10) var(--jiange-zhong);
  border: 1.5px solid transparent;
  border-radius: var(--yuanjiao-zhong);
  font-family: inherit;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.que-ren-an-niu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.que-ren-an-niu:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.que-ren-an-niu--ci {
  border-color: var(--biankuang-yanse);
  background: transparent;
  color: var(--wenben-zhuse);
}

.que-ren-an-niu--ci:hover:not(:disabled) {
  background: var(--tanchuang-fanhui-beijing);
}

.que-ren-an-niu--wei-xian {
  background: var(--cuowu-yanse);
  color: var(--fasong-anniu-wenben);
}

.que-ren-an-niu--wei-xian:hover:not(:disabled) {
  filter: brightness(0.94);
}

.que-ren-an-niu--zhu {
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
}

.que-ren-an-niu--zhu:hover:not(:disabled) {
  background: var(--zhuse-shen);
}
</style>
