<template>
  <time class="shijian-biaoqian" :datetime="isoZhi">{{ shiJian }}</time>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  shiJian: string
  shiJianChuo: number
}>()

const isoZhi = computed(() => new Date(props.shiJianChuo).toISOString())
</script>

<style scoped>
.shijian-biaoqian {
  display: inline-block;
  align-self: center;
  padding: var(--shijian-tiao-neidian-shang-xia) var(--shijian-tiao-neidian-zuo-you);
  margin: var(--jiange-zhong) 0 var(--shijian-tiao-xia-jian-ju);
  border-radius: var(--shijian-tiao-yuanjiao);
  background: var(--shijian-biaoqian-beijing);
  color: var(--wenben-tishi);
  font-size: var(--ziti-xiao);
  line-height: 1.4;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}
</style>
