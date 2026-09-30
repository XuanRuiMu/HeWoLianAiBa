<template>
  <div class="qipao-she-zhi-ye" :style="sheZhi.ziJiQiPaoCSSBianLiang">
    <h2 class="qipao-ye-biao-ti">{{ QI_PAO_WEN_AN.biaoTi }}</h2>
    <RequestError
      v-if="sheZhi.caoZuoCuoWu"
      :cuo-wu="sheZhi.caoZuoCuoWu"
      @chong-shi="sheZhi.chongShi()"
    />
    <QiPaoXuanZeQi />
    <div class="qipao-yu-lan-qu">
      <div class="qipao-yu-lan-xiang yonghu-xiaoxi">
        <div class="qipao-neirong">{{ QI_PAO_WEN_AN.yuLanQu }}</div>
      </div>
      <div class="qipao-yu-lan-xiang jiaose-xiaoxi">
        <div class="qipao-neirong">{{ QI_PAO_WEN_AN.yuLanLai }}</div>
      </div>
      <p class="qipao-dang-qian">{{ QI_PAO_WEN_AN.dangQian }}：{{ dangQianMing }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import QiPaoXuanZeQi from '@/components/气泡主题选择器.vue'
import RequestError from '@/components/请求错误.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'

const sheZhi = 使用用户设置仓库()

const dangQianMing = computed(
  () => `${huoQuQiPaoMingCheng(sheZhi.qiPaoZiJi)}/${huoQuQiPaoMingCheng(sheZhi.qiPaoAI)}`,
)

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
  font-weight: 600;
}
.qipao-yu-lan-qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}
.qipao-neirong {
  display: inline-block;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: 12px;
  font-size: 14px;
}
.yonghu-xiaoxi .qipao-neirong {
  background: var(--qipao-ziJi-beiJing);
  color: var(--qipao-ziJi-wenBen);
  align-self: flex-end;
}
.jiaose-xiaoxi .qipao-neirong {
  background: var(--qipao-duiFang-beiJing);
  color: var(--qipao-duiFang-wenBen);
  align-self: flex-start;
}
.qipao-dang-qian {
  font-size: 12px;
  opacity: 0.7;
}
</style>
