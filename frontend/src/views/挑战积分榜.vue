<template>
  <div class="paihang-yemian" :data-xingbie="xingBieDang">
    <div class="paihang-biaoti-qu">
      <h1 class="paihang-biaoti">{{ huoQuFanYi('tiaoZhan', 'biaoTi') }}</h1>
    </div>

    <div class="zubie-qiehuan">
      <button
        v-for="zuBie in zuBieLieBiao"
        :key="zuBie"
        class="zubie-anNiu"
        :class="{ huoyue: dangQianZuBie === zuBie }"
        @click="qieHuanZuBie(zuBie)"
      >
        {{ zuBieMingCheng(zuBie) }}
      </button>
    </div>

    <div v-if="qianTaiCuoWu">
      <RequestError
        :cuo-wu="qianTaiCuoWu"
        :zhong-zai="qianTaiZhuangTai === 'loading'"
        @chong-shi="chongShi"
      />
    </div>
    <div v-else-if="qianTaiZhuangTai === 'loading'" class="zhuangtai-tishi" role="status">
      {{ huoQuFanYi('junShi', 'jiaZaiZhong') }}
    </div>
    <div v-else-if="paiHangLieBiao.length === 0" class="zhuangtai-tishi">
      {{ huoQuFanYi('tiaoZhan', 'zanWuPaiHang') }}
    </div>

    <div v-else class="paihang-liebiao">
      <div
        v-for="(xiangMu, suoYin) in paiHangLieBiao"
        :key="xiangMu.yong_hu_ming + suoYin"
        class="paihang-hang"
        :class="{ qianSan: xiangMu.pai_ming <= 3 }"
      >
        <span class="paiming-biao" :class="'paiming-' + xiangMu.pai_ming">{{
          xiangMu.pai_ming
        }}</span>
        <span class="yonghu-ming">{{ xiangMu.yong_hu_ming }}</span>
        <span class="duanwei-ming">{{ xiangMu.duan_wei }}</span>
        <span class="zhanchi-xinxi">
          {{
            huoQuFanYi('tiaoZhan', 'zhanJiGeShi')
              .replace('{sheng}', String(xiangMu.sheng_chang))
              .replace('{fu}', String(xiangMu.fu_chang))
              .replace('{qi}', String(xiangMu.qi_quan_chang))
          }}
        </span>
        <span class="jifen-zhi">{{ xiangMu.ji_fen }}</span>
      </div>
    </div>

    <button class="anniu-fanhui" @click="fanHui">
      {{ huoQuFanYi('tiaoZhan', 'fanHui') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuPaiHangBang, type PaiHangXiangMu, type ZuBie } from '@/api/挑战'
import { huoQuFanYi } from '@/config/translations'
import { 解析主色档 } from '@/utils/性别'
import { 使用用户仓库 } from '@/stores/用户'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const xingBieDang = computed<'nan' | 'nv'>(() =>
  解析主色档(undefined, 用户仓库.dangQianYongHu?.mo_ren_xing_bie) === 'nv' ? 'nv' : 'nan',
)

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']
const dangQianZuBie = ref<ZuBie>('nan_nv')
const paiHangLieBiao = ref<PaiHangXiangMu[]>([])
let paiHangDaiCi = 0
const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, yunXing, chongShi } = use前台错误()

function zuBieMingCheng(zuBie: ZuBie): string {
  const yingShe: Record<ZuBie, string> = {
    nan_nv: huoQuFanYi('tiaoZhan', 'zuBieNanNv'),
    nv_nan: huoQuFanYi('tiaoZhan', 'zuBieNvNan'),
    nan_nan: huoQuFanYi('tiaoZhan', 'zuBieNanNan'),
    nv_nv: huoQuFanYi('tiaoZhan', 'zuBieNvNv'),
  }
  return yingShe[zuBie]
}

async function jiaZaiPaiHang() {
  const benCiZuBie = dangQianZuBie.value
  const benCiDaiCi = ++paiHangDaiCi
  const jieGuo = await yunXing(
    async () => huoQuPaiHangBang(benCiZuBie),
    { chongShi: jiaZaiPaiHang },
  )
  if (jieGuo !== undefined && benCiDaiCi === paiHangDaiCi && benCiZuBie === dangQianZuBie.value) {
    paiHangLieBiao.value = jieGuo
  }
}

function qieHuanZuBie(zuBie: ZuBie) {
  if (dangQianZuBie.value === zuBie) return
  dangQianZuBie.value = zuBie
  void jiaZaiPaiHang()
}

function fanHui() {
  router.push('/tiao-zhan')
}

onMounted(jiaZaiPaiHang)
</script>

<style scoped>
.paihang-yemian {
  --tiaozhan-zhu-1: var(--xingbie-nan-1);
  --tiaozhan-zhu-2: var(--xingbie-nan-2);
  --tiaozhan-zhu-wenben: var(--xingbie-nan-wenben);
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: var(--jiange-da) var(--jiange-zhong) calc(var(--jiange-da) + var(--jiange-zhong));
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  background: var(--yemian-di-beijing);
  border-radius: var(--yuanjiao-da);
}

.paihang-yemian[data-xingbie='nv'] {
  --tiaozhan-zhu-1: var(--xingbie-nv-1);
  --tiaozhan-zhu-2: var(--xingbie-nv-2);
  --tiaozhan-zhu-wenben: var(--xingbie-nv-wenben);
}

.paihang-biaoti-qu {
  text-align: left;
  position: relative;
  padding-bottom: calc(var(--jiange-12) + var(--jiange-2));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--jiange-xiao);
}

.paihang-biaoti-qu::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 64px;
  height: 3px;
  border-radius: var(--yuanjiao-xiao);
  background: linear-gradient(90deg, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2));
}

.paihang-biaoti {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--wenben-zhuse);
  letter-spacing: var(--jiange-xiao);
  line-height: 1.25;
}

.zubie-qiehuan {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--jiange-xiao);
}

.zubie-anNiu {
  padding: var(--jiange-10) var(--jiange-6);
  font-size: 13px;
  font-weight: 700;
  color: var(--wenben-ciuse);
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  cursor: pointer;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.zubie-anNiu.huoyue {
  color: var(--tiaozhan-zhu-wenben);
  background: linear-gradient(135deg, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2));
  border-color: var(--tiaozhan-zhu-1);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--tiaozhan-zhu-1) 35%, transparent);
}

.zhuangtai-tishi {
  padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-zhong);
  text-align: center;
  font-size: 14px;
  color: var(--wenben-tishi);
}

.paihang-liebiao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.paihang-hang {
  display: grid;
  grid-template-columns: 40px 1fr auto auto auto;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: calc(var(--jiange-12) + var(--jiange-2)) var(--jiange-zhong);
  background: var(--beijing-kaopian);
  border: 1px solid color-mix(in srgb, var(--tiaozhan-zhu-1) 26%, var(--biankuang-yanse));
  border-radius: var(--yuanjiao-da);
  box-shadow:
    var(--qipao-yinying),
    inset 0 1px 0 color-mix(in srgb, var(--tiaozhan-zhu-1) 10%, transparent);
  position: relative;
  overflow: hidden;
}

.paihang-hang::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  border-radius: 0 0 var(--yuanjiao-xiao) var(--yuanjiao-xiao);
  background: linear-gradient(90deg, transparent, var(--tiaozhan-zhu-1), transparent);
  opacity: 0.55;
  pointer-events: none;
}

.paihang-hang.qianSan {
  border-color: var(--tiaozhan-zhu-1);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--tiaozhan-zhu-1) 24%, transparent);
}

.paiming-biao {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
  color: var(--wenben-ciuse);
  background: var(--beijing-ciuse);
  border: 1px solid color-mix(in srgb, var(--tiaozhan-zhu-1) 30%, var(--biankuang-yanse));
}

.paiming-1 {
  background: var(--tiaozhan-zhu-1);
  color: var(--tiaozhan-zhu-wenben);
  border-color: transparent;
}

.paiming-2 {
  background: color-mix(in srgb, var(--tiaozhan-zhu-1) 55%, var(--beijing-kaopian));
  color: var(--wenben-zhuse);
  border-color: transparent;
}

.paiming-3 {
  background: color-mix(in srgb, var(--tiaozhan-zhu-1) 28%, var(--beijing-kaopian));
  color: var(--wenben-zhuse);
  border-color: transparent;
}

.yonghu-ming {
  font-size: 14px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duanwei-ming {
  font-size: var(--ziti-xiao);
  font-weight: 700;
  color: var(--tiaozhan-zhu-1);
  font-variant-numeric: tabular-nums;
}

.zhanchi-xinxi {
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.jifen-zhi {
  min-width: 44px;
  text-align: right;
  font-weight: 800;
  font-size: var(--ziti-zhong);
  white-space: nowrap;
  color: var(--tiaozhan-zhu-1);
}

.anniu-fanhui {
  align-self: center;
  padding: var(--jiange-11) calc(var(--jiange-da) + var(--jiange-2));
  border-radius: var(--yuanjiao-zhong);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease;
}

.anniu-fanhui:hover {
  color: var(--tiaozhan-zhu-1);
  border-color: var(--tiaozhan-zhu-1);
  background: color-mix(in srgb, var(--tiaozhan-zhu-1) 8%, transparent);
}

@media (max-width: 480px) {
  .paihang-hang {
    grid-template-columns: 34px 1fr auto;
    grid-auto-flow: row;
  }

  .zhanchi-xinxi {
    display: none;
  }

  .zubie-qiehuan {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .zubie-anNiu,
  .anniu-fanhui {
    transition: none !important;
  }
}
</style>
