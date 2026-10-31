<template>
  <div class="qipao-she-zhi-ye">
    <h2 class="qipao-ye-biao-ti">{{ QI_PAO_WEN_AN.biaoTi }}</h2>
    <RequestError
      v-if="sheZhi.caoZuoCuoWu"
      :cuo-wu="sheZhi.caoZuoCuoWu"
      @chong-shi="sheZhi.chongShi()"
    />
    <QiPaoXuanZeQi />
    <div class="qipao-tian-chong-hang">
      <span class="qipao-tian-chong-ming">{{ tianChongWen }}</span>
      <WaiGuanTianChongXuanZe lei-xing="qiPao" />
    </div>
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
import WaiGuanTianChongXuanZe from '@/components/外观填充选择器.vue'
import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'
import RequestError from '@/components/请求错误.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { QI_PAO_WEN_AN } from '@/config/气泡主题文案'
import { huoQuFanYi } from '@/config/翻译表'

const sheZhi = 使用用户设置仓库()
const tianChongWen = huoQuFanYi('sheZhi', 'caiJianYuLanTianChongZu')

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
.qipao-tian-chong-hang {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-10);
  padding: var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: var(--beijing-ciuse);
}
.qipao-tian-chong-ming {
  flex: none;
  min-width: 4.5em;
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}
.qipao-tian-chong-hang :deep(.tian-chong-xuan-ze) {
  justify-content: flex-start;
}
</style>
