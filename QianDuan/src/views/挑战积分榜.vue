<template>
  <div class="paihang-yemian">
    <header class="yemian-tou">
      <div class="tou-zhu">
        <button class="fanhui-lianjie dian-ji-qu-44" type="button" @click="fanHui">
          <span class="fanhui-jiantou" aria-hidden="true">←</span>
          <span>{{ huoQuFanYi('tiaoZhan', 'fanHui') }}</span>
        </button>
        <h1 class="yemian-biaoti">{{ huoQuFanYi('tiaoZhan', 'biaoTi') }}</h1>
        <p class="yemian-fubiaoti">{{ huoQuFanYi('tiaoZhan', 'bangDanShuoMing') }}</p>
      </div>
    </header>

    <div
      ref="zuQieKuang"
      class="zubie-qiehuan"
      role="group"
      :aria-label="huoQuFanYi('tiaoZhan', 'xuanZeZuBie')"
    >
      <span
        class="zubie-zhishi"
        aria-hidden="true"
        :data-liang-zhun="zuZhishiLiangZhun ? 'true' : 'false'"
        :style="zuZhishiWeiZhi"
      />
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

    <section class="qu bangdan-qu" :aria-busy="bangDanZhuangTai === 'jiaZai' ? 'true' : 'false'">
      <div v-if="bangDanZhuangTai === 'bangDan'" class="bangdan-tou" aria-hidden="true">
        <span>{{ huoQuFanYi('tiaoZhan', 'paiMingBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'wanJiaBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'duanWeiBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'zhanJiBiaoQian') }}</span>
        <span>{{ huoQuFanYi('tiaoZhan', 'jiFenBiaoQian') }}</span>
      </div>

      <div v-if="bangDanZhuangTai === 'jiaZai'" class="bangdan-zai" role="status">
        <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
        <div v-for="序 in 5" :key="序" class="bangdan-zhanwei" aria-hidden="true">
          <span class="zhanwei-kuai zhanwei-kuai--pai" />
          <span class="zhanwei-kuai zhanwei-kuai--ming" />
          <span class="zhanwei-kuai zhanwei-kuai--duan" />
          <span class="zhanwei-kuai zhanwei-kuai--ji" />
          <span class="zhanwei-kuai zhanwei-kuai--fen" />
        </div>
      </div>
      <div v-else-if="bangDanZhuangTai === 'cuoWu'" class="bangdan-zai">
        <RequestError :cuo-wu="qianTaiCuoWu" @chong-shi="jiaZaiPaiHang" />
      </div>
      <div v-else-if="bangDanZhuangTai === 'kong'" class="bangdan-kong">
        <span class="kong-tubiao" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 4h8v3.5a4 4 0 0 1-8 0z" />
            <path d="M8 5H5.5A2.5 2.5 0 0 0 8 9.5" />
            <path d="M16 5h2.5A2.5 2.5 0 0 1 16 9.5" />
            <path d="M12 11.5V15" />
            <path d="M9.5 20h5" />
            <path d="M10 15h4l1 5h-6z" />
          </svg>
        </span>
        <TiaoZhanKongTai>{{ huoQuFanYi('tiaoZhan', 'zanWuPaiHang') }}</TiaoZhanKongTai>
        <button class="kong-anniu" type="button" @click="fanHui">
          {{ huoQuFanYi('tiaoZhan', 'quTiaoZhan') }}
        </button>
      </div>
      <ol v-else class="bangdan-liebiao">
        <li
          v-for="(xiangMu, suoYin) in paiHangLieBiao"
          :key="suoYin"
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
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuPaiHangBang, type PaiHangXiangMu, type ZuBie } from '@/api/挑战'
import { huoQuFanYi } from '@/config/翻译表'
import RequestError from '@/components/请求错误.vue'
import TiaoZhanKongTai from '@/components/挑战空态.vue'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const router = useRouter()

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']
const dangQianZuBie = ref<ZuBie>('nan_nv')
const paiHangLieBiao = ref<PaiHangXiangMu[]>([])

type 榜单状态 = 'jiaZai' | 'cuoWu' | 'kong' | 'bangDan'

const bangDanZhuangTai = ref<榜单状态>('jiaZai')
const qianTaiCuoWu = ref<QianTaiCuoWu | null>(null)
let paiHangDaiCi = 0

const zuQieKuang = ref<HTMLElement | null>(null)
const zuZhishiLiangZhun = ref(false)
const zuZhishiWeiZhi = ref<CSSProperties>({ width: '0px', transform: 'translateX(0px)' })
let 尺寸观察: ResizeObserver | null = null

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
  paiHangLieBiao.value = []
  qianTaiCuoWu.value = null
  bangDanZhuangTai.value = 'jiaZai'
  try {
    const jieGuo = await huoQuPaiHangBang(benCiZuBie)
    if (benCiDaiCi !== paiHangDaiCi) return
    paiHangLieBiao.value = jieGuo
    bangDanZhuangTai.value = jieGuo.length > 0 ? 'bangDan' : 'kong'
  } catch (错误: unknown) {
    if (benCiDaiCi !== paiHangDaiCi) return
    const zhengChangHua = 归一前台错误(错误)
    if (!zhengChangHua.xianShi) {
      bangDanZhuangTai.value = 'kong'
      return
    }
    qianTaiCuoWu.value = zhengChangHua
    bangDanZhuangTai.value = 'cuoWu'
  }
}

function 量ZuZhishi() {
  const 容器 = zuQieKuang.value
  if (!容器) return
  const 按钮 = [...容器.querySelectorAll<HTMLElement>('.zubie-anNiu')].find(
    (项) => 项.getAttribute('aria-pressed') === 'true',
  )
  if (!按钮) return
  zuZhishiWeiZhi.value = {
    width: `${按钮.offsetWidth}px`,
    transform: `translateX(${按钮.offsetLeft}px)`,
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

watch(dangQianZuBie, () => {
  void nextTick(量ZuZhishi)
})

onMounted(async () => {
  量ZuZhishi()
  requestAnimationFrame(() => {
    zuZhishiLiangZhun.value = true
  })
  if (typeof ResizeObserver !== 'undefined' && zuQieKuang.value) {
    尺寸观察 = new ResizeObserver(量ZuZhishi)
    尺寸观察.observe(zuQieKuang.value)
  }
  await jiaZaiPaiHang()
})

onBeforeUnmount(() => {
  尺寸观察?.disconnect()
  尺寸观察 = null
})
</script>


<style scoped>
.paihang-yemian {
  --tz-jin: var(--junshi-zhuse);
  --tz-jin-an: color-mix(in srgb, var(--junshi-zhuse) 86%, var(--wenben-zhuse));
  --tz-mian: var(--beijing-kaopian);
  --tz-di: var(--beijing-ciuse);
  --tz-xian: var(--biankuang-yanse);
  --tz-xian-ruo: color-mix(in srgb, var(--biankuang-yanse) 60%, transparent);
  --tz-wen: var(--wenben-zhuse);
  --tz-wen-ci: color-mix(in srgb, var(--wenben-zhuse) 72%, var(--wenben-ciuse));
  --tz-kong-wen: color-mix(in srgb, var(--tz-wen-ci) 50%, var(--tz-mian));
  --tz-fan-zi: var(--beijing-kaopian);
  --tz-gu: color-mix(in srgb, var(--wenben-ciuse) 32%, var(--beijing-kaopian));
  --tz-zi-xiao: 12px;
  --tz-zi-zheng: 16px;
  --tz-zi-zhong: 20px;
  --tz-zi-da: 32px;
  --tz-kuan: calc(var(--jiange-da) * 42);
  --tz-re-ku: 44px;
  --tz-dong: var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
  --tz-zhi-shi-dong: 260ms;
  --tz-ka-dong: 200ms;
  width: 100%;
  max-width: var(--tz-kuan);
  margin: 0 auto;
  padding: var(--jiange-da);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-da);
  border-radius: var(--yuanjiao-zhong);
  background: var(--tz-di);
  color: var(--tz-wen);
  font-size: var(--tz-zi-zheng);
}

.yemian-tou {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--jiange-zhong);
  flex-wrap: wrap;
  padding-bottom: var(--jiange-zhong);
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.tou-zhu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  min-width: 0;
}

.fanhui-lianjie {
  position: relative;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--jiange-4);
  min-height: var(--tz-re-ku);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tz-wen-ci);
  font-size: var(--tz-zi-zheng);
  line-height: 1.4;
  transition: color var(--tz-dong);
}

.fanhui-lianjie:hover:not(:disabled) {
  color: var(--tz-jin);
}

.fanhui-jiantou {
  font-size: var(--tz-zi-zheng);
  line-height: 1;
}

.yemian-biaoti {
  margin: 0;
  font-size: var(--tz-zi-da);
  font-weight: 600;
  line-height: 1.2;
}

.yemian-fubiaoti {
  margin: 0;
  font-size: var(--tz-zi-zheng);
  line-height: 1.5;
  color: var(--tz-wen-ci);
}

.zubie-qiehuan {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: var(--jiange-zhong);
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.zubie-zhishi {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-jin);
  transform: translateX(0);
  transition:
    transform var(--tz-zhi-shi-dong) var(--quxian-biao-zhun),
    width var(--tz-zhi-shi-dong) var(--quxian-biao-zhun);
  pointer-events: none;
}

.zubie-zhishi[data-liang-zhun='false'] {
  transition: none;
}

.zubie-anNiu {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-height: var(--tz-re-ku);
  padding: var(--jiange-xiao) 0;
  border: 0;
  background: transparent;
  color: var(--tz-wen-ci);
  font-size: var(--tz-zi-zheng);
  font-weight: 400;
  line-height: 1.4;
  transition:
    color var(--tz-ka-dong) ease-out,
    transform var(--tz-ka-dong) ease-out;
}

.zubie-anNiu:hover:not(:disabled) {
  color: var(--tz-wen);
  transform: translateY(-1px);
}

.zubie-anNiu[aria-pressed='true'] {
  color: var(--tz-wen);
  font-weight: 600;
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

.qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  min-width: 0;
  padding: var(--jiange-da);
  border-radius: var(--yuanjiao-zhong);
  background: var(--tz-mian);
}

.bangdan-qu {
  gap: 0;
}

.bangdan-tou,
.bangdan-hang,
.bangdan-zhanwei {
  display: grid;
  grid-template-columns:
    calc(var(--jiange-da) * 1.5) minmax(0, 1.6fr) minmax(0, 0.9fr)
    minmax(0, 1fr) minmax(0, 0.7fr);
  align-items: center;
  gap: var(--jiange-12);
}

.bangdan-tou {
  padding: var(--jiange-xiao) 0;
  border-bottom: 1px solid var(--tz-xian);
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
}

.bangdan-tou span:first-child,
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
  padding: var(--jiange-12) 0;
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.bangdan-hang:last-child {
  border-bottom: 0;
}

.bangdan-hang--qian .paiming-shu {
  color: var(--tz-jin);
}

.paiming-shu {
  justify-self: end;
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--tz-wen-ci);
}

.wanjia-ming {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
}

.bangdan-xinxi {
  display: contents;
}

.duanwei-ming {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
  white-space: nowrap;
}

.zhanji-wen {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.jifen-zhi {
  justify-self: end;
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.jifen-danwei {
  font-size: var(--tz-zi-xiao);
  font-weight: 400;
  color: var(--tz-wen-ci);
}

.bangdan-zhanwei {
  padding: var(--jiange-12) 0;
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.bangdan-zhanwei:last-child {
  border-bottom: 0;
}

.zhanwei-kuai {
  display: block;
  height: var(--tz-zi-zheng);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-gu);
}

.zhanwei-kuai--pai {
  width: 60%;
  justify-self: end;
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
  padding: calc(var(--jiange-da) * 2) 0 var(--jiange-da);
}

.kong-tubiao {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--jiange-da) * 2);
  height: calc(var(--jiange-da) * 2);
  margin-bottom: var(--jiange-4);
  border-radius: 50%;
  background: var(--tz-di);
  color: var(--tz-jin);
}

.kong-tubiao svg {
  width: var(--jiange-da);
  height: var(--jiange-da);
}

.kong-anniu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tz-re-ku);
  margin-top: var(--jiange-4);
  padding: 0 var(--jiange-da);
  border: 1px solid transparent;
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-jin);
  color: var(--tz-fan-zi);
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  transition: background-color var(--tz-dong);
}

.kong-anniu:hover:not(:disabled) {
  background: var(--tz-jin-an);
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
    padding: var(--jiange-zhong);
    gap: var(--jiange-zhong);
  }

  .qu {
    padding: var(--jiange-zhong);
  }

  .yemian-tou {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .zubie-qiehuan {
    gap: var(--jiange-12);
  }

  .bangdan-tou {
    display: none;
  }

  .bangdan-hang,
  .bangdan-zhanwei {
    grid-template-columns: calc(var(--jiange-da) * 2) minmax(0, 1fr) auto;
    grid-template-areas:
      'pai ming fen'
      '. xinxi xinxi';
    gap: var(--jiange-xiao);
    row-gap: var(--jiange-4);
    padding: var(--jiange-12) 0;
  }

  .paiming-shu {
    grid-area: pai;
    justify-self: start;
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

  .bangdan-zhanwei .zhanwei-kuai--pai {
    grid-area: pai;
  }

  .bangdan-zhanwei .zhanwei-kuai--ming {
    grid-area: ming;
  }

  .bangdan-zhanwei .zhanwei-kuai--fen {
    grid-area: fen;
  }

  .bangdan-zhanwei .zhanwei-kuai--duan,
  .bangdan-zhanwei .zhanwei-kuai--ji {
    display: none;
  }

  .bangdan-kong {
    padding: var(--jiange-da) 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fanhui-lianjie,
  .zubie-anNiu,
  .zubie-zhishi,
  .kong-anniu {
    transition: none;
    animation: none;
  }
}
</style>
