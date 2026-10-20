<template>
  <div class="liao-tian-yu-lan">
    <p class="yu-lan-biao-ti">{{ biaoTi }}</p>
    <div
      class="yu-lan-xiao-xi-qu"
      :class="beiJingLeiMing"
      :style="[sheZhi.beiJingNeiLianYangShi, sheZhi.ziJiQiPaoCSSBianLiang]"
      :aria-label="biaoTi"
    >
      <ShiJianTiao :shi-jian="shiJianWenBen" :shi-jian-chuo="shiJianChuo" />
      <div class="xiaoxi-xiangmu jiaose-xiaoxi">
        <div class="xiaoxi-wei yu-lan-wei">
          <TouXiang :tou-xiang="sheZhi.duiXiangTouXiang" shen-fen="jiaose" />
          <button
            type="button"
            class="yu-lan-huan-tou-xiang"
            :aria-label="huanTouXiangWenAn"
            :title="huanTouXiangWenAn"
            :disabled="shangChuanZhong"
            @click="daKaiTouXiangXuanZe"
          >
            <span aria-hidden="true">＋</span>
          </button>
        </div>
        <div class="qipao-waike">
          <div class="qipao-neirong">{{ laiWen }}</div>
        </div>
      </div>
      <div class="xiaoxi-xiangmu yonghu-xiaoxi">
        <div class="xiaoxi-wei">
          <TouXiang :tou-xiang="sheZhi.touXiang" shen-fen="yonghu" />
        </div>
        <div class="qipao-waike">
          <div class="qipao-neirong">{{ quWen }}</div>
        </div>
      </div>
      <input
        ref="touXiangShuRu"
        class="yu-lan-wen-jian-shu-ru"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        :aria-label="huanTouXiangWenAn"
        @change="chuLiTouXiangXuanZe"
      />
    </div>
    <p v-if="tiShiWenBen" class="yu-lan-ti-shi" :class="{ 'yu-lan-ti-shi--cuo-wu': tiShiCuoWu }" role="status">
      {{ tiShiWenBen }}
    </p>
    <p class="yu-lan-dang-qian">{{ dangQianTi }}：{{ dangQianMing }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'
import { tiQuCuoWuWenBen } from '@/utils/前台错误'
import { geShiHuaXiaoXiShiJian } from '@/utils/消息时间分组'
import TouXiang from '@/components/头像.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'

const props = defineProps<{
  biaoTi: string
  dangQianMing: string
  dangQianTi?: string
}>()

const sheZhi = 使用用户设置仓库()
const laiWen = huoQuFanYi('sheZhi', 'yuLanQiPaoLai')
const quWen = huoQuFanYi('sheZhi', 'yuLanQiPaoQu')
const dangQianTi = props.dangQianTi || huoQuFanYi('sheZhi', 'dangQianBeiJing')
const huanTouXiangWenAn = huoQuFanYi('sheZhi', 'huanDuiXiangTouXiang')
const shangChuanZhongWenBen = huoQuFanYi('sheZhi', 'shangChuanZhongWenAn')

const beiJingLeiMing = computed(() => (sheZhi.shiYuShe ? `beijing-${sheZhi.liaoTianBeiJing}` : 'beijing-ziDingYi'))

const shiJianChuo = Date.now() - 3 * 60 * 1000
const shiJianWenBen = geShiHuaXiaoXiShiJian(new Date(shiJianChuo), new Date())

const touXiangShuRu = ref<HTMLInputElement | null>(null)
const shangChuanZhong = ref(false)
const tiShiWenBen = ref('')
const tiShiCuoWu = ref(false)

function quCuoWuWenBen(cuoWu: unknown): string {
  return tiQuCuoWuWenBen(cuoWu, huoQuFanYi('sheZhi', 'duiXiangTouXiangShangChuanShiBai'))
}

function daKaiTouXiangXuanZe(): void {
  if (shangChuanZhong.value) return
  touXiangShuRu.value?.click()
}

async function chuLiTouXiangXuanZe(shiJian: Event): Promise<void> {
  const yuanSu = shiJian.target as HTMLInputElement | null
  const wenJian = yuanSu?.files?.[0]
  if (yuanSu) yuanSu.value = ''
  if (!wenJian) return
  shangChuanZhong.value = true
  tiShiCuoWu.value = false
  tiShiWenBen.value = shangChuanZhongWenBen
  try {
    await sheZhi.shangChuanDuiXiangTouXiang(wenJian)
    tiShiCuoWu.value = false
    tiShiWenBen.value = huoQuFanYi('sheZhi', 'duiXiangTouXiangGengXin')
  } catch (cuoWu: unknown) {
    tiShiCuoWu.value = true
    tiShiWenBen.value = quCuoWuWenBen(cuoWu)
  } finally {
    shangChuanZhong.value = false
  }
}
</script>

<style scoped>
.liao-tian-yu-lan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-4);
  min-width: 0;
}

.yu-lan-biao-ti {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

.yu-lan-xiao-xi-qu {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: var(--jiange-zhong);
  border-radius: var(--yuanjiao-da);
  border: 1.5px solid var(--biankuang-yanse);
  overflow: hidden;
  background: var(--liaotian-beijing);
  background-size: 18px 18px;
  min-height: 220px;
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
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.yu-lan-xiao-xi-qu.beijing-miSeTianYuan {
  background: var(--liaotian-beijing-miSeTianYuan);
}

.liao-tian-yu-lan .shijian-biaoqian {
  align-self: center;
}

.liao-tian-yu-lan .xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  max-width: 100%;
  position: relative;
}

.liao-tian-yu-lan .xiaoxi-xiangmu.yonghu-xiaoxi {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.liao-tian-yu-lan .xiaoxi-xiangmu.jiaose-xiaoxi {
  flex-direction: row;
  align-self: flex-start;
}

.liao-tian-yu-lan .xiaoxi-wei {
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

.liao-tian-yu-lan .yonghu-xiaoxi .xiaoxi-wei {
  margin-left: var(--jiange-10);
}

.liao-tian-yu-lan .jiaose-xiaoxi .xiaoxi-wei {
  margin-right: var(--jiange-10);
}

.liao-tian-yu-lan .qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}

.liao-tian-yu-lan .qipao-neirong {
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

.liao-tian-yu-lan .yonghu-xiaoxi .qipao-neirong {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
  border-radius: 6px;
}

.liao-tian-yu-lan .yonghu-xiaoxi .qipao-neirong::after {
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

.liao-tian-yu-lan .jiaose-xiaoxi .qipao-neirong {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
  border: none;
  border-radius: 6px;
}

.liao-tian-yu-lan .jiaose-xiaoxi .qipao-neirong::after {
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

.liao-tian-yu-lan .yu-lan-wei {
  position: relative;
}

.liao-tian-yu-lan .yu-lan-huan-tou-xiang {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--biankuang-yanse);
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.liao-tian-yu-lan .yu-lan-huan-tou-xiang:disabled {
  opacity: 0.6;
  cursor: progress;
}

.liao-tian-yu-lan .yu-lan-wen-jian-shu-ru {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.yu-lan-ti-shi {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

.yu-lan-ti-shi--cuo-wu {
  color: var(--cuowu-wenben);
}

.yu-lan-dang-qian {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

@media (max-width: 480px) {
  .liao-tian-yu-lan .qipao-waike {
    max-width: min(calc(100vw - 120px), 420px);
  }

  .liao-tian-yu-lan .qipao-neirong {
    font-size: 15px;
  }
}
</style>
