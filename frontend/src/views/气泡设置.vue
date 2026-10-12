<template>
  <div class="qipao-she-zhi-ye" :style="sheZhi.ziJiQiPaoCSSBianLiang">
    <h2 class="qipao-ye-biao-ti">{{ QI_PAO_WEN_AN.biaoTi }}</h2>
    <RequestError
      v-if="sheZhi.caoZuoCuoWu"
      :cuo-wu="sheZhi.caoZuoCuoWu"
      @chong-shi="sheZhi.chongShi()"
    />
    <QiPaoXuanZeQi />
    <div class="qipao-yu-lan-qu" :style="sheZhi.beiJingNeiLianYangShi" :class="sheZhi.shiYuShe ? `beijing-${sheZhi.liaoTianBeiJing}` : 'beijing-ziDingYi'">
      <div class="qipao-yu-lan-xiang xiaoxi-xiangmu jiaose-xiaoxi">
        <TouXiang :tou-xiang="null" mo-ren-zi="老" />
        <div class="qipao-waike">
          <div class="qipao-neirong">{{ QI_PAO_WEN_AN.yuLanLai }}</div>
        </div>
      </div>
      <div class="qipao-yu-lan-xiang xiaoxi-xiangmu yonghu-xiaoxi">
        <div class="qipao-waike">
          <div class="qipao-neirong">{{ QI_PAO_WEN_AN.yuLanQu }}</div>
        </div>
        <TouXiang :tou-xiang="null" mo-ren-zi="我" />
      </div>
      <p class="qipao-dang-qian">{{ QI_PAO_WEN_AN.dangQian }}：{{ dangQianMing }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import QiPaoXuanZeQi from '@/components/气泡主题选择器.vue'
import RequestError from '@/components/请求错误.vue'
import TouXiang from '@/components/头像.vue'
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
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
}
.qipao-yu-lan-qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  border-radius: 14px;
  padding: var(--jiange-zhong);
  border: 1.5px solid var(--biankuang-yanse);
  background: var(--liaotian-beijing);
}
.qipao-yu-lan-qu.beijing-miWuSenLin {
  background: var(--liaotian-beijing-miWuSenLin);
}
.qipao-yu-lan-qu.beijing-haiYangZhiLan {
  background: var(--liaotian-beijing-haiYangZhiLan);
}
.qipao-yu-lan-qu.beijing-fenSeMengJing {
  background: var(--liaotian-beijing-fenSeMengJing);
}
.qipao-yu-lan-qu.beijing-yeKongXingHe {
  background: var(--liaotian-beijing-yeKongXingHe);
}
.qipao-yu-lan-qu.beijing-miSeTianYuan {
  background: var(--liaotian-beijing-miSeTianYuan);
}
.qipao-yu-lan-xiang {
  display: flex;
  align-items: flex-start;
  margin-bottom: var(--jiange-xiao);
  max-width: 100%;
}
.qipao-yu-lan-xiang.yonghu-xiaoxi {
  flex-direction: row-reverse;
  align-self: flex-end;
}
.qipao-yu-lan-xiang.jiaose-xiaoxi {
  flex-direction: row;
  align-self: flex-start;
}
.qipao-yu-lan-qu .qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}
.qipao-neirong {
  display: inline-block;
  padding: var(--jiange-9) var(--jiange-13);
  border-radius: 6px;
  font-size: 16px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  line-height: 1.45;
  word-break: break-word;
  position: relative;
}
.yonghu-xiaoxi .qipao-neirong {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
  align-self: flex-end;
}
.yonghu-xiaoxi .qipao-neirong::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 13px;
  width: 0;
  height: 0;
  border-left: 6px solid var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}
.jiaose-xiaoxi .qipao-neirong {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
  align-self: flex-start;
}
.jiaose-xiaoxi .qipao-neirong::after {
  content: '';
  position: absolute;
  left: -5px;
  top: 13px;
  width: 0;
  height: 0;
  border-right: 6px solid var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}
.qipao-dang-qian {
  font-size: 12px;
  opacity: 0.7;
}
</style>
