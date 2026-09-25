<template>
  <div class="paihang-yemian">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuPaiHangBang, type PaiHangXiangMu, type ZuBie } from '@/api/挑战'
import { huoQuFanYi } from '@/config/translations'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'

const router = useRouter()

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']
const dangQianZuBie = ref<ZuBie>('nan_nv')
const paiHangLieBiao = ref<PaiHangXiangMu[]>([])
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
  await yunXing(
    async () => {
      paiHangLieBiao.value = await huoQuPaiHangBang(dangQianZuBie.value)
    },
    { chongShi: jiaZaiPaiHang },
  )
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
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.paihang-biaoti-qu {
  text-align: center;
}

.paihang-biaoti {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 4px;
}

:root[data-theme='light'] .paihang-biaoti {
  color: #191919;
}

.zubie-qiehuan {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.zubie-anNiu {
  padding: 10px 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.zubie-anNiu.huoyue {
  color: #ffffff;
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.35), rgba(251, 146, 60, 0.28));
  border-color: rgba(255, 107, 157, 0.55);
}

:root[data-theme='light'] .zubie-anNiu {
  color: rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.1);
}

:root[data-theme='light'] .zubie-anNiu.huoyue {
  color: #e84a7a;
}

.zhuangtai-tishi {
  padding: 32px 16px;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
}

:root[data-theme='light'] .zhuangtai-tishi {
  color: rgba(0, 0, 0, 0.45);
}

.paihang-liebiao {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.paihang-hang {
  display: grid;
  grid-template-columns: 40px 1fr auto auto auto;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(20, 24, 40, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

:root[data-theme='light'] .paihang-hang {
  background: rgba(245, 248, 252, 0.85);
  border-color: rgba(0, 0, 0, 0.07);
}

.paihang-hang.qianSan {
  border-color: rgba(251, 191, 36, 0.4);
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
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
}

.paiming-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #3b2b00;
}

.paiming-2 {
  background: linear-gradient(135deg, #d8d8d8, #a8a8a8);
  color: #26262b;
}

.paiming-3 {
  background: linear-gradient(135deg, #e8a06a, #c47b46);
  color: #33200c;
}

.yonghu-ming {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:root[data-theme='light'] .yonghu-ming {
  color: #191919;
}

.duanwei-ming {
  font-size: 12px;
  font-weight: 700;
  color: var(--nuanhui-lan);
}

.zhanchi-xinxi,
.jifen-zhi {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

:root[data-theme='light'] .zhanchi-xinxi,
:root[data-theme='light'] .jifen-zhi {
  color: rgba(0, 0, 0, 0.55);
}

.jifen-zhi {
  min-width: 44px;
  text-align: right;
  font-weight: 800;
  font-size: 14px;
  color: var(--yanse-biaobai);
}

.anniu-fanhui {
  align-self: center;
  padding: 11px 26px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.75);
  transition: all 0.25s ease;
}

:root[data-theme='light'] .anniu-fanhui {
  border-color: rgba(0, 0, 0, 0.18);
  color: rgba(0, 0, 0, 0.65);
}

.anniu-fanhui:hover {
  filter: brightness(1.2);
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
