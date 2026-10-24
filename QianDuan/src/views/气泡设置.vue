<template>
  <div class="qipao-she-zhi-ye">
    <h2 class="qipao-ye-biao-ti">{{ QI_PAO_WEN_AN.biaoTi }}</h2>
    <RequestError
      v-if="sheZhi.caoZuoCuoWu"
      :cuo-wu="sheZhi.caoZuoCuoWu"
      @chong-shi="sheZhi.chongShi()"
    />
    <QiPaoXuanZeQi />
    <LiaoTianYuLan
      :biao-ti="huoQuFanYi('sheZhi', 'liaoTianYuLan')"
      :dang-qian-ming="sheZhi.dangQianQiPaoBiaoShu"
      :dang-qian-ti="huoQuFanYi('qiPao', 'dangQian')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import QiPaoXuanZeQi from '@/components/气泡主题选择器.vue'
import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'
import RequestError from '@/components/请求错误.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { QI_PAO_WEN_AN } from '@/config/气泡主题文案'
import { huoQuFanYi } from '@/config/翻译表'

const sheZhi = 使用用户设置仓库()

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
