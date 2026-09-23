<template>
  <time class="shijian-biaoqian" :datetime="isoZhi">{{ shiJian }}</time>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 时间条（FP-11 验收点 B）：全站唯一实现，聊天页与好友页共用（FP-35① 后页面侧重复
 * .shijian-biaoqian scoped 规则已删，组件这一份是唯一规则真源）。
 * 分档口径（同日→时:分、跨日→昨天/星期、跨月→月-日、跨年→年-月-日）住在
 * utils/消息时间分组.ts，本组件只负责呈现；归组阈值与既有分组行为由
 * __tests__/use虚拟窗口.test.ts 与 __tests__/FP11语音气泡.test.ts 分别把守。
 * 语义用 <time datetime>，读屏可按机器可读时间朗读；本身不参与交互，
 * pointer-events 直传给会话列表，点击不会打断消息行的长按/右键菜单。
 */
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
