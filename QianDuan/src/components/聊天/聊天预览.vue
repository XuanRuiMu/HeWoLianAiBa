<template>
  <div class="yu-lan-xiao-xi-qu liao-tian-yu-lan" :class="beiJingLeiMing" :style="[sheZhi.beiJingNeiLianYangShi, sheZhi.ziJiQiPaoCSSBianLiang]">
    <p class="yu-lan-biao-ti">{{ biaoTi }}</p>
    <div class="xiaoxi-hang jiaose-xiaoxi">
      <div class="qipao-waike" :style="sheZhi.ziDingYiQiPao ? sheZhi.ziDingYiQiPaoNeiLianYangShi : undefined">
        <div class="qipao-neirong">{{ laiWen }}</div>
      </div>
    </div>
    <div class="xiaoxi-hang yonghu-xiaoxi">
      <div class="qipao-waike" :style="sheZhi.ziDingYiQiPao ? sheZhi.ziDingYiQiPaoNeiLianYangShi : undefined">
        <div class="qipao-neirong">{{ quWen }}</div>
      </div>
    </div>
    <p class="yu-lan-dang-qian">{{ dangQianTi }}：{{ dangQianMing }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'

const props = defineProps<{
  biaoTi: string
  dangQianMing: string
}>()

const sheZhi = 使用用户设置仓库()
const beiJingLeiMing = computed(() => (sheZhi.shiYuShe ? `beijing-${sheZhi.liaoTianBeiJing}` : 'beijing-ziDingYi'))
const laiWen = huoQuFanYi('sheZhi', 'yuLanQiPaoLai')
const quWen = huoQuFanYi('sheZhi', 'yuLanQiPaoQu')
const dangQianTi = huoQuFanYi('sheZhi', 'dangQianBeiJing')
</script>

<style scoped>
.yu-lan-xiao-xi-qu {
  margin-top: var(--jiange-4);
  border-radius: 14px;
  padding: var(--jiange-zhong);
  border: 1.5px solid var(--biankuang-yanse);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  background: var(--liaotian-beijing);
  background-size: 18px 18px;
}
.yu-lan-xiao-xi-qu.beijing-moRen {
  background: var(--liaotian-beijing);
  background-size: 18px 18px;
}
.yu-lan-xiao-xi-qu.beijing-chenWuQing {
  background: var(--liaotian-beijing-chenWuQing);
}
.yu-lan-xiao-xi-qu.beijing-muZiXingYe {
  background: var(--liaotian-beijing-muZiXingYe);
}
.yu-lan-xiao-xi-qu.beijing-miWuSenLin {
  background: var(--liaotian-beijing-miWuSenLin);
}
.yu-lan-xiao-xi-qu.beijing-haiYangZhiLan {
  background: var(--liaotian-beijing-haiYangZhiLan);
}
.yu-lan-xiao-xi-qu.beijing-fenSeMengJing {
  background: var(--liaotian-beijing-fenSeMengJing);
}
.yu-lan-xiao-xi-qu.beijing-yeKongXingHe {
  background: var(--liaotian-beijing-yeKongXingHe);
}
.yu-lan-xiao-xi-qu.beijing-miSeTianYuan {
  background: var(--liaotian-beijing-miSeTianYuan);
}
.yu-lan-xiao-xi-qu .xiaoxi-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  margin-bottom: var(--jiange-xiao);
}
.yu-lan-xiao-xi-qu .yonghu-xiaoxi {
  flex-direction: row-reverse;
  align-self: flex-end;
}
.yu-lan-xiao-xi-qu .jiaose-xiaoxi {
  flex-direction: row;
  align-self: flex-start;
}
.yu-lan-xiao-xi-qu .qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}
.yu-lan-xiao-xi-qu .qipao-neirong {
  padding: var(--jiange-9) var(--jiange-13);
  border-radius: 6px;
  font-size: 16px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  line-height: 1.45;
  word-break: break-word;
  position: relative;
  display: inline-block;
  max-width: 100%;
}
.yu-lan-xiao-xi-qu .yonghu-xiaoxi .qipao-neirong {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}
.yu-lan-xiao-xi-qu .yonghu-xiaoxi .qipao-neirong::after {
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
.yu-lan-xiao-xi-qu .jiaose-xiaoxi .qipao-neirong {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
}
.yu-lan-xiao-xi-qu .jiaose-xiaoxi .qipao-neirong::after {
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
.yu-lan-biao-ti {
  font-size: 14px;
  margin: 0;
}
.yu-lan-dang-qian {
  font-size: 12px;
  margin: 0;
}
</style>
