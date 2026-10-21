<template>
  <FuCengDuiHuaKuang
    :xian-shi="xianShi"
    :biao-ti="biaoTiWenAn"
    kuan="da"
    @guan-bi="quXiao"
  >
    <div class="shang-chuan-guige">
      <div class="shang-chuan-guige-hang">
        <span class="shang-chuan-guige-ming">{{ geShiBiaoTi }}</span>
        <span class="shang-chuan-guige-zhi">{{ geShiNeiRong }}</span>
      </div>
      <div class="shang-chuan-guige-hang">
        <span class="shang-chuan-guige-ming">{{ daXiaoBiaoTi }}</span>
        <span class="shang-chuan-guige-zhi">{{ daXiaoNeiRong }}</span>
      </div>
    </div>

    <section class="shang-chuan-gui-fan" :aria-labelledby="guiFanBiaoTiBiaoShi">
      <h4 :id="guiFanBiaoTiBiaoShi" class="shang-chuan-gui-fan-ti">{{ guiFanBiaoTi }}</h4>
      <p class="shang-chuan-gui-fan-dao-yan">{{ guiFanDaoYan }}</p>
      <ul class="shang-chuan-tiao-kuan">
        <li v-for="tiao in faLvTiaoKuan" :key="tiao">{{ tiao }}</li>
      </ul>
      <p class="shang-chuan-lai-yuan">{{ faLvLaiYuan }}</p>
    </section>

    <p class="shang-chuan-cheng-nuo">{{ chengNuoWenAn }}</p>
    <p class="shang-chuan-xian-du">{{ xianDuShuoMing }}</p>

    <template #jiaoBu>
      <button type="button" class="shang-chuan-an-niu shang-chuan-an-niu--ci" data-shou-xuan @click="quXiao">
        {{ zanBuWenAn }}
      </button>
      <button type="button" class="shang-chuan-an-niu shang-chuan-an-niu--zhu" @click="queRen">
        {{ jiXuWenAn }}
      </button>
    </template>
  </FuCengDuiHuaKuang>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FuCengDuiHuaKuang from '@/components/浮层对话框.vue'
import { huoQuFanYi } from '@/config/翻译表'

const props = defineProps<{
  xianShi: boolean
  leiBie: 'beiJing' | 'qiPao'
}>()

const faChu = defineEmits<{
  (shiJian: 'que-ren'): void
  (shiJian: 'qu-xiao'): void
}>()

const biaoTiWenAn = computed(() =>
  huoQuFanYi('sheZhi', props.leiBie === 'beiJing' ? 'shangChuanBeiJingBiaoTi' : 'shangChuanQiPaoBiaoTi'),
)
const geShiBiaoTi = huoQuFanYi('sheZhi', 'shangChuanZhiChiGeShi')
const geShiNeiRong = huoQuFanYi('sheZhi', 'shangChuanGeShiNeiRong')
const daXiaoBiaoTi = huoQuFanYi('sheZhi', 'shangChuanDaXiaoXianZhi')
const daXiaoNeiRong = huoQuFanYi('sheZhi', 'shangChuanDaXiaoNeiRong')
const guiFanBiaoTi = huoQuFanYi('sheZhi', 'shangChuanGuiFanBiaoTi')
const guiFanDaoYan = huoQuFanYi('sheZhi', 'shangChuanGuiFanDaoYan')
const faLvLaiYuan = huoQuFanYi('sheZhi', 'shangChuanFaLvLaiYuan')
const chengNuoWenAn = huoQuFanYi('sheZhi', 'shangChuanChengNuo')
const xianDuShuoMing = huoQuFanYi('sheZhi', 'shangChuanXianDuShuoMing')
const zanBuWenAn = huoQuFanYi('sheZhi', 'shangChuanZanBu')
const jiXuWenAn = huoQuFanYi('sheZhi', 'shangChuanJiXu')
const guiFanBiaoTiBiaoShi = 'shang-chuan-gui-fan-' + Math.random().toString(36).slice(2, 8)
const faLvTiaoKuan = [
  huoQuFanYi('sheZhi', 'shangChuanFaLvWangLuoAnQuan'),
  huoQuFanYi('sheZhi', 'shangChuanFaLvShengTai'),
  huoQuFanYi('sheZhi', 'shangChuanFaLvGeRenXinXi'),
]

function queRen(): void {
  faChu('que-ren')
}

function quXiao(): void {
  faChu('qu-xiao')
}
</script>

<style scoped>
.shang-chuan-guige {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--jiange-xiao);
  padding: var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: var(--beijing-ciuse);
}

.shang-chuan-guige-hang {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--jiange-12);
}

.shang-chuan-guige-ming {
  flex: none;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.shang-chuan-guige-zhi {
  font-size: var(--ziti-zhong);
  line-height: 1.5;
  color: var(--wenben-ciuse);
  text-align: right;
}

.shang-chuan-gui-fan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.shang-chuan-gui-fan-ti {
  margin: 0;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.shang-chuan-gui-fan-dao-yan,
.shang-chuan-lai-yuan,
.shang-chuan-cheng-nuo,
.shang-chuan-xian-du {
  margin: 0;
  font-size: var(--ziti-zhong);
  line-height: 1.65;
  color: var(--wenben-ciuse);
}

.shang-chuan-tiao-kuan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  margin: 0;
  padding-left: var(--jiange-zhong);
  color: var(--wenben-zhuse);
}

.shang-chuan-tiao-kuan li {
  padding-left: var(--jiange-4);
  font-size: var(--ziti-zhong);
  line-height: 1.65;
}

.shang-chuan-lai-yuan {
  font-size: var(--ziti-xiao);
}

.shang-chuan-cheng-nuo {
  padding: var(--jiange-12);
  border-left: 3px solid var(--zhuse);
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
}

.shang-chuan-xian-du {
  font-size: var(--ziti-xiao);
}

.shang-chuan-an-niu {
  min-width: 112px;
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

.shang-chuan-an-niu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.shang-chuan-an-niu--ci {
  border-color: var(--biankuang-yanse);
  background: transparent;
  color: var(--wenben-zhuse);
}

.shang-chuan-an-niu--ci:hover {
  background: var(--tanchuang-fanhui-beijing);
}

.shang-chuan-an-niu--zhu {
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
}

.shang-chuan-an-niu--zhu:hover {
  background: var(--zhuse-shen);
}

@media (max-width: 520px) {
  .shang-chuan-guige-hang {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--jiange-2);
  }

  .shang-chuan-guige-zhi {
    text-align: left;
  }

  .shang-chuan-an-niu {
    flex: 1;
  }
}
</style>
