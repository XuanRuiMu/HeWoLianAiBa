<template>
  <div class="paihang-yemian">
    <header class="yemian-tou">
      <div class="tou-zhu">
        <button class="fanhui-lianjie" type="button" @click="fanHui">
          <span class="fanhui-jiantou" aria-hidden="true">←</span>
          <span>{{ huoQuFanYi('tiaoZhan', 'fanHui') }}</span>
        </button>
        <h1 class="yemian-biaoti">
          <span class="biaoti-biao" aria-hidden="true" />
          <span>{{ huoQuFanYi('tiaoZhan', 'biaoTi') }}</span>
        </h1>
        <p class="yemian-fubiaoti">{{ huoQuFanYi('tiaoZhan', 'bangDanShuoMing') }}</p>
      </div>
      <dl class="tou-tongji" :aria-busy="jiaZaiZhong ? 'true' : 'false'">
        <div class="tongji-xiang">
          <dt>{{ huoQuFanYi('tiaoZhan', 'shangBangRenShuBiaoQian') }}</dt>
          <dd>
            <span v-if="jiaZaiZhong" class="zhanwei-tiao" aria-hidden="true" />
            <span v-else-if="qianTaiCuoWu && shangBangRenShu === 0">{{
              huoQuFanYi('tiaoZhan', 'zanWu')
            }}</span>
            <template v-else>
              {{ shangBangRenShu }}<span class="tongji-fenmu">{{
                huoQuFanYi('tiaoZhan', 'renDanWei')
              }}</span>
            </template>
          </dd>
        </div>
        <div class="tongji-xiang">
          <dt>{{ huoQuFanYi('tiaoZhan', 'zuiGaoJiFen') }}</dt>
          <dd>
            <span v-if="jiaZaiZhong" class="zhanwei-tiao zhanwei-tiao--chang" aria-hidden="true" />
            <template v-else>{{
              zuiGaoFen === null ? huoQuFanYi('tiaoZhan', 'zanWu') : zuiGaoFen
            }}</template>
          </dd>
        </div>
      </dl>
    </header>

    <div class="zubie-qiehuan" role="group" :aria-label="huoQuFanYi('tiaoZhan', 'xuanZeZuBie')">
      <button
        v-for="zuBie in zuBieLieBiao"
        :key="zuBie"
        class="zubie-anNiu"
        type="button"
        :aria-pressed="dangQianZuBie === zuBie ? 'true' : 'false'"
        @click="qieHuanZuBie(zuBie)"
      >
        <span class="zubie-dian" aria-hidden="true">
          <span
            v-for="(dang, suoYin) in zuBieZuCheng(zuBie)"
            :key="suoYin"
            class="dian"
            :data-dang="dang"
          />
        </span>
        <span>{{ zuBieMingCheng(zuBie) }}</span>
      </button>
    </div>

    <section class="bangdan-qu" :aria-busy="jiaZaiZhong ? 'true' : 'false'">
      <div class="bangdan-tou" aria-hidden="true">
        <span>{{ huoQuFanYi('tiaoZhan', 'paiMingBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'wanJiaBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'duanWeiBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'zhanJiBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'jiFenBiaoQian') }}</span>
      </div>

      <RequestError
        v-if="qianTaiCuoWu"
        :cuo-wu="qianTaiCuoWu"
        :zhong-zai="jiaZaiZhong"
        @chong-shi="chongShi"
      />

      <div v-if="jiaZaiZhong" class="bangdan-zai" role="status">
        <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
        <div v-for="序 in 5" :key="序" class="bangdan-zhanwei" aria-hidden="true">
          <span class="zhanwei-kuai zhanwei-kuai--pai" />
          <span class="zhanwei-kuai zhanwei-kuai--ming" />
          <span class="zhanwei-kuai zhanwei-kuai--duan" />
          <span class="zhanwei-kuai zhanwei-kuai--ji" />
          <span class="zhanwei-kuai zhanwei-kuai--fen" />
        </div>
      </div>

      <div v-else-if="paiHangLieBiao.length === 0 && !qianTaiCuoWu" class="bangdan-kong">
        <p class="kong-biaoti">{{ huoQuFanYi('tiaoZhan', 'zanWuPaiHang') }}</p>
        <p class="kong-fu">{{ huoQuFanYi('tiaoZhan', 'bangDanKongFu') }}</p>
        <button class="kong-anniu" type="button" @click="fanHui">
          {{ huoQuFanYi('tiaoZhan', 'quTiaoZhan') }}
        </button>
      </div>

      <ol v-else-if="paiHangLieBiao.length > 0" class="bangdan-liebiao">
        <li
          v-for="(xiangMu, suoYin) in paiHangLieBiao"
          :key="xiangMu.yong_hu_ming + suoYin"
          class="bangdan-hang"
          :class="{ 'bangdan-hang--qian': xiangMu.pai_ming <= 3 }"
        >
          <span class="paiming-shu">{{ xiangMu.pai_ming }}</span>
          <span class="wanjia-ming">{{ xiangMu.yong_hu_ming }}</span>
          <span class="bangdan-xinxi">
            <span class="duanwei-ming">{{ xiangMu.duan_wei }}</span>
            <span class="zhanji-wen">{{ zhanJiWenBen(xiangMu) }}</span>
          </span>
          <span class="jifen-zhi">
            {{ xiangMu.ji_fen }}<span class="jifen-danwei">{{
              huoQuFanYi('tiaoZhan', 'fenDanWei')
            }}</span>
          </span>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuPaiHangBang, type PaiHangXiangMu, type ZuBie } from '@/api/挑战'
import { huoQuFanYi } from '@/config/翻译表'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'

const router = useRouter()

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']
const dangQianZuBie = ref<ZuBie>('nan_nv')
const paiHangLieBiao = ref<PaiHangXiangMu[]>([])
const yiJiaZai = ref(false)
let paiHangDaiCi = 0

const {
  cuoWu: qianTaiCuoWu,
  zhuangTai: qianTaiZhuangTai,
  yunXing,
  chongShi,
} = use前台错误()

const jiaZaiZhong = computed(
  () =>
    qianTaiZhuangTai.value === 'loading' ||
    (!yiJiaZai.value && qianTaiZhuangTai.value !== 'error'),
)

const shangBangRenShu = computed(() => paiHangLieBiao.value.length)

const zuiGaoFen = computed<number | null>(() => {
  if (paiHangLieBiao.value.length === 0) return null
  return paiHangLieBiao.value.reduce(
    (zuiGao, xiangMu) => (xiangMu.ji_fen > zuiGao ? xiangMu.ji_fen : zuiGao),
    0,
  )
})

function zuBieMingCheng(zuBie: ZuBie): string {
  const yingShe: Record<ZuBie, string> = {
    nan_nv: huoQuFanYi('tiaoZhan', 'zuBieNanNv'),
    nv_nan: huoQuFanYi('tiaoZhan', 'zuBieNvNan'),
    nan_nan: huoQuFanYi('tiaoZhan', 'zuBieNanNan'),
    nv_nv: huoQuFanYi('tiaoZhan', 'zuBieNvNv'),
  }
  return yingShe[zuBie]
}

function zuBieZuCheng(zuBie: ZuBie): Array<'nan' | 'nv'> {
  const yingShe: Record<ZuBie, Array<'nan' | 'nv'>> = {
    nan_nv: ['nan', 'nv'],
    nv_nan: ['nv', 'nan'],
    nan_nan: ['nan', 'nan'],
    nv_nv: ['nv', 'nv'],
  }
  return yingShe[zuBie]
}

function zhanJiWenBen(xiangMu: PaiHangXiangMu): string {
  return huoQuFanYi('tiaoZhan', 'zhanJiGeShi')
    .replace('{sheng}', String(xiangMu.sheng_chang))
    .replace('{fu}', String(xiangMu.fu_chang))
    .replace('{qi}', String(xiangMu.qi_quan_chang))
}

async function jiaZaiPaiHang() {
  const benCiZuBie = dangQianZuBie.value
  const benCiDaiCi = ++paiHangDaiCi
  yiJiaZai.value = false
  const jieGuo = await yunXing(async () => huoQuPaiHangBang(benCiZuBie), {
    chongShi: jiaZaiPaiHang,
  })
  if (jieGuo !== undefined && benCiDaiCi === paiHangDaiCi && benCiZuBie === dangQianZuBie.value) {
    paiHangLieBiao.value = jieGuo
    yiJiaZai.value = true
  }
}

function qieHuanZuBie(zuBie: ZuBie) {
  if (dangQianZuBie.value === zuBie) return
  dangQianZuBie.value = zuBie
  paiHangLieBiao.value = []
  void jiaZaiPaiHang()
}

function fanHui() {
  router.push('/tiao-zhan')
}

onMounted(jiaZaiPaiHang)
</script>

<style scoped>
.paihang-yemian {
  --tz-jin: var(--junshi-zhuse);
  --tz-jin-ruo: color-mix(in srgb, var(--tz-jin) 12%, transparent);
  --tz-jin-xian: color-mix(in srgb, var(--tz-jin) 38%, var(--biankuang-yanse));
  --tz-mian: var(--beijing-kaopian);
  --tz-xian: var(--biankuang-yanse);
  --tz-xian-ruo: color-mix(in srgb, var(--biankuang-yanse) 62%, transparent);
  --tz-xian-kuan: 1px;
  --tz-xian-hou: 2px;
  --tz-wen-er: color-mix(in srgb, var(--wenben-ciuse) 55%, var(--wenben-zhuse));
  --tz-wen-san: color-mix(in srgb, var(--wenben-ciuse) 78%, var(--wenben-zhuse));
  --tz-kuan: calc(var(--jiange-da) * 42);
  width: 100%;
  max-width: var(--tz-kuan);
  margin: 0 auto;
  padding: var(--jiange-zhong) var(--jiange-zhong) calc(var(--jiange-da) * 2);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-da);
  color: var(--wenben-zhuse);
}

.yemian-tou {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--jiange-zhong);
  flex-wrap: wrap;
  padding-bottom: var(--jiange-zhong);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
}

.tou-zhu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
  min-width: 0;
}

.fanhui-lianjie {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--jiange-6);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tz-wen-er);
  font-size: var(--ziti-xiao);
  transition: color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.fanhui-lianjie:hover {
  color: var(--tz-jin);
}

.fanhui-jiantou {
  transition: transform var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu);
}

.fanhui-lianjie:hover .fanhui-jiantou {
  transform: translateX(calc(var(--jiange-2) * -1));
}

.yemian-biaoti {
  display: flex;
  align-items: center;
  gap: var(--jiange-12);
  margin: 0;
  font-size: calc(var(--ziti-da) * 1.9);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.01em;
}

.biaoti-biao {
  display: block;
  width: var(--jiange-4);
  height: calc(var(--ziti-da) * 1.5);
  border-radius: var(--jiange-2);
  background: var(--tz-jin);
}

.yemian-fubiaoti {
  margin: 0;
  font-size: var(--ziti-zhong);
  line-height: 1.6;
  color: var(--tz-wen-er);
}

.tou-tongji {
  display: flex;
  align-items: flex-end;
  gap: var(--jiange-da);
  margin: 0;
}

.tongji-xiang {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  text-align: right;
}

.tongji-xiang dt {
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-san);
}

.tongji-xiang dd {
  margin: 0;
  font-size: calc(var(--ziti-da) * 1.12);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--wenben-zhuse);
}

.tongji-fenmu {
  font-size: var(--ziti-zhong);
  font-weight: 400;
  color: var(--tz-wen-san);
}


.zhanwei-tiao {
  display: inline-block;
  width: calc(var(--jiange-da) * 2);
  height: calc(var(--ziti-zhong) * 1.1);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-xian-ruo);
}

.zhanwei-tiao--chang {
  width: calc(var(--jiange-da) * 3);
}

.zubie-qiehuan {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--jiange-xiao);
}

.zubie-anNiu {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-6);
  padding: var(--jiange-10) var(--jiange-xiao);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-mian);
  color: var(--tz-wen-er);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.zubie-anNiu:hover {
  border-color: var(--tz-jin-xian);
  color: var(--wenben-zhuse);
}

.zubie-anNiu[aria-pressed='true'] {
  border-color: var(--tz-jin-xian);
  background: var(--tz-jin-ruo);
  color: var(--tz-jin);
}

.zubie-dian {
  display: inline-flex;
  gap: var(--jiange-2);
  flex: none;
}

.dian {
  display: block;
  width: var(--jiange-6);
  height: var(--jiange-6);
  border-radius: 50%;
  background: var(--xingbie-nan-1);
}

.dian[data-dang='nv'] {
  background: var(--xingbie-nv-1);
}

.bangdan-qu {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--jiange-xiao) var(--jiange-zhong) var(--jiange-4);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-da);
  background: var(--tz-mian);
}

.bangdan-tou,
.bangdan-hang,
.bangdan-zhanwei {
  display: grid;
  grid-template-columns:
    calc(var(--jiange-da) + var(--jiange-12)) minmax(0, 1.6fr) minmax(0, 0.9fr)
    minmax(0, 1fr) minmax(0, 0.6fr);
  align-items: center;
  gap: var(--jiange-xiao);
}

.bangdan-tou {
  padding: var(--jiange-12) var(--jiange-xiao) var(--jiange-10);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-san);
}

.bangdan-tou span:last-child {
  text-align: right;
}

.bangdan-liebiao {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bangdan-hang {
  padding: var(--jiange-12) var(--jiange-xiao);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
}

.bangdan-hang:last-child {
  border-bottom: 0;
}

.bangdan-hang--qian {
  box-shadow: inset var(--tz-xian-hou) 0 0 var(--tz-jin);
}

.bangdan-hang--qian .paiming-shu {
  color: var(--tz-jin);
}

.paiming-shu {
  font-size: var(--ziti-da);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tz-wen-san);
}

.wanjia-ming {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--ziti-zhong);
  font-weight: 600;
}

.bangdan-xinxi {
  display: contents;
}

.duanwei-ming {
  grid-column: 3;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  color: var(--tz-jin);
}

.zhanji-wen {
  grid-column: 4;
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-er);
  white-space: nowrap;
}

.jifen-zhi {
  grid-column: 5;
  justify-self: end;
  font-size: var(--ziti-da);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.jifen-danwei {
  font-size: var(--ziti-xiao);
  font-weight: 400;
  color: var(--tz-wen-san);
}

.bangdan-zhanwei {
  padding: var(--jiange-12) var(--jiange-xiao);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
}

.bangdan-zhanwei:last-child {
  border-bottom: 0;
}

.zhanwei-kuai {
  display: block;
  height: calc(var(--ziti-zhong) * 0.95);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-xian-ruo);
}

.zhanwei-kuai--pai {
  width: 60%;
}

.zhanwei-kuai--ming {
  width: 58%;
}

.zhanwei-kuai--duan {
  width: 56%;
}

.zhanwei-kuai--ji {
  width: 66%;
}

.zhanwei-kuai--fen {
  width: 54%;
  justify-self: end;
}

.bangdan-kong {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--jiange-xiao);
  padding: calc(var(--jiange-da) * 2) var(--jiange-xiao);
}

.kong-biaoti {
  margin: 0;
  font-size: var(--ziti-da);
  font-weight: 600;
  line-height: 1.5;
}

.kong-fu {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  color: var(--tz-wen-er);
}

.kong-anniu {
  margin-top: var(--jiange-4);
  padding: var(--jiange-xiao) var(--jiange-zhong);
  border: var(--tz-xian-kuan) solid var(--tz-jin-xian);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-jin-ruo);
  color: var(--tz-jin);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.kong-anniu:hover {
  border-color: var(--tz-jin);
  background: color-mix(in srgb, var(--tz-jin) 20%, transparent);
}

.ping-mu-wai {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .paihang-yemian {
    gap: var(--jiange-zhong);
    padding-bottom: calc(var(--jiange-da) * 2);
  }

  .yemian-biaoti {
    font-size: calc(var(--ziti-da) * 1.5);
  }

  .yemian-tou {
    align-items: flex-start;
    padding-bottom: var(--jiange-12);
  }
}

@media (max-width: 640px) {
  .tou-tongji {
    width: 100%;
    justify-content: flex-start;
    gap: var(--jiange-da);
  }

  .tongji-xiang {
    align-items: flex-start;
    text-align: left;
  }

  .zubie-qiehuan {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bangdan-qu {
    padding: var(--jiange-4) var(--jiange-12);
  }

  .bangdan-tou {
    display: none;
  }

  .bangdan-hang {
    grid-template-columns: calc(var(--jiange-da) + var(--jiange-6)) minmax(0, 1fr) auto;
    grid-template-areas:
      'pai ming fen'
      '. xinxi xinxi';
    row-gap: var(--jiange-6);
    padding: var(--jiange-12) 0;
  }

  .bangdan-hang--qian {
    box-shadow: inset var(--tz-xian-hou) 0 0 var(--tz-jin);
    padding-left: var(--jiange-xiao);
  }

  .paiming-shu {
    grid-area: pai;
  }

  .wanjia-ming {
    grid-area: ming;
  }

  .bangdan-xinxi {
    grid-area: xinxi;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--jiange-xiao);
  }

  .jifen-zhi {
    grid-area: fen;
  }

  .bangdan-zhanwei {
    grid-template-columns: calc(var(--jiange-da) + var(--jiange-6)) minmax(0, 1fr) auto;
    padding: var(--jiange-12) 0;
  }

  .bangdan-zhanwei .zhanwei-kuai--duan,
  .bangdan-zhanwei .zhanwei-kuai--ji {
    display: none;
  }

  .zhanwei-kuai--fen {
    grid-column: 3;
  }

  .bangdan-kong {
    padding: var(--jiange-da) 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fanhui-lianjie,
  .fanhui-jiantou,
  .zubie-anNiu,
  .kong-anniu {
    transition: none;
  }

  .fanhui-lianjie:hover .fanhui-jiantou {
    transform: none;
  }
}
</style>
