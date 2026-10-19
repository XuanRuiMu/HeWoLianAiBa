<template>
  <div class="qipao-she-zhi-ye" :style="sheZhi.ziJiQiPaoCSSBianLiang">
    <h2 class="qipao-ye-biao-ti">{{ QI_PAO_WEN_AN.biaoTi }}</h2>
    <RequestError
      v-if="sheZhi.caoZuoCuoWu"
      :cuo-wu="sheZhi.caoZuoCuoWu"
      @chong-shi="sheZhi.chongShi()"
    />
    <QiPaoXuanZeQi />
    <LiaoTianYuLan :biao-ti="QI_PAO_WEN_AN.biaoTi" :dang-qian-ming="dangQianMing" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import QiPaoXuanZeQi from '@/components/气泡主题选择器.vue'
import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'
import RequestError from '@/components/请求错误.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'

const sheZhi = 使用用户设置仓库()

const dangQianMing = computed(() => {
  if (sheZhi.ziDingYiQiPao) return sheZhi.ziDingYiQiPao.mingCheng
  return `${huoQuQiPaoMingCheng(sheZhi.qiPaoZiJi)}/${huoQuQiPaoMingCheng(sheZhi.qiPaoAI)}`
})

onMounted(() => {
  void sheZhi.jiaZai()
})
</script>

<style scoped>
.qipao-she-zhi-ye {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  padding: var(--jiange-zhong);
}
.qipao-ye-biao-ti {
  font-size: 16px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
}
</style>
