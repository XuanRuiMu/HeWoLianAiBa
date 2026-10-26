<template>
  <div class="tiaozhan-yemian">
    <header class="yemian-tou">
      <div class="tou-zhu">
        <h1 class="yemian-biaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianBiaoTi') }}</h1>
        <p class="yemian-fubiaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianFuBiaoTi') }}</p>
      </div>
    </header>

    <div class="zhuti">
      <div class="zhuti-zhu">
        <section v-if="dangQianDuiJu" class="qu duiju-qu" aria-live="polite">
          <div class="duiju-hang">
            <div class="duiju-wei">
              <TouXiang
                :tou-xiang="dangQianDuiJu.tou_xiang"
                :mo-ren-zi="dangQianDuiJu.wei_xin_ming.slice(0, 1)"
                shen-fen="duiju"
                @error="dangQianDuiJu.tou_xiang = null"
              />
            </div>
            <div class="duiju-wen">
              <span class="duiju-zhuang">{{ huoQuFanYi('tiaoZhan', 'jinXingZhong') }}</span>
              <span class="duiju-ming">{{ dangQianDuiJu.wei_xin_ming }}</span>
            </div>
            <div class="duiju-cao">
              <button class="anniu anniu--jin" type="button" @click="jiXuDuiJu">
                {{ huoQuFanYi('tiaoZhan', 'jiXuDuiJu') }}
              </button>
              <template v-if="!zhengZaiFangQiQueRen">
                <button
                  class="anniu anniu--wei"
                  type="button"
                  @click="zhengZaiFangQiQueRen = true"
                >
                  {{ huoQuFanYi('tiaoZhan', 'fangQiDuiJu') }}
                </button>
              </template>
              <template v-else>
                <button
                  class="anniu anniu--wei anniu--wei-shi"
                  type="button"
                  :disabled="fangQiQingQiuZhong"
                  @click="queRenFangQi"
                >
                  {{ huoQuFanYi('tiaoZhan', 'queRenFangQi') }}
                </button>
                <button
                  class="anniu anniu--mo"
                  type="button"
                  :disabled="fangQiQingQiuZhong"
                  @click="quXiaoFangQi"
                >
                  {{ huoQuFanYi('tongYong', 'quXiao') }}
                </button>
              </template>
            </div>
          </div>
        </section>

        <section class="qu" :aria-busy="shuJuZaiZai ? 'true' : 'false'">
          <div class="qu-tou">
            <h2 class="qu-biaoti">{{ huoQuFanYi('tiaoZhan', 'siGeZuBie') }}</h2>
            <span class="qu-fu">{{ huoQuFanYi('tiaoZhan', 'woDePaiWei') }}</span>
          </div>
          <RequestError
            v-if="qianTaiCuoWu"
            :cuo-wu="qianTaiCuoWu"
            :zhong-zai="shuJuZaiZai"
            @chong-shi="chongShiQuanBu"
          />
          <div v-if="shuJuZaiZai" class="jifen-wangge" role="status">
            <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
            <div
              v-for="序 in zuBieLieBiao.length"
              :key="序"
              class="jifen-ka jifen-ka--zhanwei"
              aria-hidden="true"
            >
              <span class="zhanwei-kuai zhanwei-kuai--duan" />
              <span class="zhanwei-kuai zhanwei-kuai--fen" />
              <span class="zhanwei-kuai zhanwei-kuai--ming" />
            </div>
          </div>
          <div v-else-if="gaiKuangLieBiao.length > 0 || !qianTaiCuoWu" class="jifen-wangge">
            <article
              v-for="hang in gaiKuangHang"
              :key="hang.zu_bie"
              class="jifen-ka"
              :data-zu-bie="hang.zu_bie"
              :style="zuBiePeiSe[hang.zu_bie]"
            >
              <div class="jifen-ka-tou">
                <h3 class="zubie-ming">{{ zuBieMingCheng(hang.zu_bie) }}</h3>
                <span v-if="hang.ji_fen !== null" class="zubie-paiming">
                  {{
                    hang.pai_ming === null
                      ? huoQuFanYi('tiaoZhan', 'zanWu')
                      : huoQuFanYi('tiaoZhan', 'mingCiGeShi').replace(
                          '{mingci}',
                          String(hang.pai_ming),
                        )
                  }}
                </span>
              </div>
              <span v-if="hang.ji_fen !== null" class="zubie-jifen">
                {{ hang.ji_fen }}<span class="jifen-danwei">{{
                  huoQuFanYi('tiaoZhan', 'fenDanWei')
                }}</span>
              </span>
              <span v-else class="zubie-kong">{{ huoQuFanYi('tiaoZhan', 'weiCanSai') }}</span>
              <div v-if="hang.ji_fen !== null" class="jifen-ka-fu">
                <span class="zubie-duanwei">{{ hang.duan_wei }}</span>
                <span class="zubie-zhanji">{{ zhanJiWenBen(hang) }}</span>
              </div>
            </article>
          </div>
        </section>

        <section class="rukou-qu">
          <div class="rukou-tou">
            <h2 class="rukou-biaoti">{{ huoQuFanYi('tiaoZhan', 'kaiShiXinDuiJu') }}</h2>
          </div>
          <div class="rukou-cao">
            <button
              ref="kaiShiAnNiu"
              class="anniu-kaiShi"
              type="button"
              :disabled="kaiShiQingQiuZhong || dangQianDuiJu !== null"
              @click="daKaiXingBieXuanZe"
            >
              {{ huoQuFanYi('tiaoZhan', 'kaiShiTiaoZhan') }}
            </button>
          </div>
          <p v-if="dangQianDuiJu" class="rukou-tishi">
            {{ huoQuFanYi('tiaoZhan', 'yiYouDuiJuTishi') }}
          </p>
          <p v-else-if="cuoWuXinXi" class="rukou-tishi rukou-tishi--cuo" role="status">
            {{ cuoWuXinXi }}
          </p>
        </section>
      </div>

      <aside class="zhuti-ce">
        <section class="qu zhaiyao-qu" :aria-busy="bangDanZaiZai ? 'true' : 'false'">
          <div class="qu-tou">
            <h2 class="qu-biaoti">{{ huoQuFanYi('tiaoZhan', 'paiHangZhaiYao') }}</h2>
          </div>
          <div
            ref="zuQieKuang"
            class="zu-qie"
            role="group"
            :aria-label="huoQuFanYi('tiaoZhan', 'xuanZeZuBie')"
          >
            <span
              class="zu-zhishi"
              aria-hidden="true"
              :data-liang-zhun="zuZhishiLiangZhun ? 'true' : 'false'"
              :style="zuZhishiWeiZhi"
            />
            <button
              v-for="zu in zuBieLieBiao"
              :key="zu"
              class="zu-anniu"
              type="button"
              :aria-pressed="bangDanZuBie === zu ? 'true' : 'false'"
              @click="qieHuanBangDanZu(zu)"
            >
              {{ zuBieMingCheng(zu) }}
            </button>
          </div>
          <p v-if="bangDanWo !== null && !shuJuZaiZai && !qianTaiCuoWu" class="zhaiyao-wo">
            {{ bangDanWo }}
          </p>
          <div class="zhaiyao-nei-rong" :data-qie-huan="bangDanQieHuanZhong ? 'true' : 'false'">
            <Transition name="zhaiyao-dan-ru">
              <div v-show="bangDanShouCiJiaZai" class="zhaiyao-nei zhaiyao-nei--die" role="status">
                <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
                <div v-for="序 in 5" :key="序" class="zhaiyao-zhanwei" aria-hidden="true">
                  <span class="zhanwei-kuai zhanwei-kuai--pai" />
                  <span class="zhanwei-kuai zhanwei-kuai--ming" />
                  <span class="zhanwei-kuai zhanwei-kuai--fen" />
                </div>
              </div>
            </Transition>
            <Transition name="zhaiyao-dan-ru">
              <div v-show="bangDanCuoWu" class="zhaiyao-nei zhaiyao-nei--die">
                <TiaoZhanKongTai>{{ bangDanCuoWu?.lianAiWenAn }}</TiaoZhanKongTai>
                <button
                  v-if="bangDanCuoWu?.retryable"
                  class="zhaiyao-chongshi"
                  type="button"
                  @click="chongShiBangDan"
                >
                  {{ huoQuFanYi('tongYong', 'qianTaiCuoWuChongShi') }}
                </button>
              </div>
            </Transition>
            <Transition name="zhaiyao-dan-ru">
              <div v-show="bangDanKong" class="zhaiyao-nei zhaiyao-nei--die">
                <TiaoZhanKongTai>{{ huoQuFanYi('tiaoZhan', 'zanWuPaiHang') }}</TiaoZhanKongTai>
              </div>
            </Transition>
            <Transition name="zhaiyao-dan-ru">
              <ol v-show="bangDanYouHang" class="zhaiyao-liebiao zhaiyao-nei--die">
                <li
                  v-for="(xiang, suoYin) in bangDanLieBiao"
                  :key="suoYin"
                  class="zhaiyao-hang"
                  :class="{ 'zhaiyao-hang--yi': suoYin === 0 }"
                >
                  <span class="zhaiyao-paiming">{{ xiang.pai_ming }}</span>
                  <span class="zhaiyao-wen">
                    <span class="zhaiyao-ming">{{ xiang.yong_hu_ming }}</span>
                    <span class="zhaiyao-duan">{{ xiang.duan_wei }}</span>
                  </span>
                  <span class="zhaiyao-jifen">
                    {{ xiang.ji_fen }}<span class="jifen-danwei">{{
                      huoQuFanYi('tiaoZhan', 'fenDanWei')
                    }}</span>
                  </span>
                </li>
              </ol>
            </Transition>
          </div>
          <button class="zhaiyao-quanbu" type="button" @click="qianWangPaiHangBang">
            {{ huoQuFanYi('tiaoZhan', 'chaKanWanZhengBang') }}
          </button>
        </section>
      </aside>
    </div>

    <div
      v-if="xingBieXuanZeKeJian"
      class="xingbie-zhezhao"
      @click.self="guanBiXingBieXuanZe"
      @keydown.esc="guanBiXingBieXuanZe"
      @keydown="xunHuanJiaoDian"
    >
      <div
        ref="xuanZeKuang"
        class="xingbie-tanchuang"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xuan-ze-xing-bie-biao-ti"
        tabindex="-1"
      >
        <div class="tanchuang-tou">
          <h2 id="xuan-ze-xing-bie-biao-ti" class="tanchuang-biaoti">
            {{ huoQuFanYi('tiaoZhan', 'xuanZeXingBieBiaoTi') }}
          </h2>
          <button
            class="tanchuang-guanbi"
            type="button"
            :disabled="kaiShiQingQiuZhong"
            :aria-label="huoQuFanYi('tongYong', 'guanBi')"
            @click="guanBiXingBieXuanZe"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <ZhaXingTiShi :zha-xing-gai-lv="zhaXingGaiLv" />
        <div class="jindu-yuan-dian">
          <button
            v-for="buZhou in tiaoZhanBuZhouLieBiao"
            :key="buZhou"
            class="jindu-dian"
            :class="{ huoyue: buZhou <= xingBieBuZhou, dangQian: buZhou === xingBieBuZhou }"
            type="button"
            :aria-label="String(buZhou)"
            @click="tiaoZhuanBuZhou(buZhou)"
          />
        </div>
        <div class="buzhou-rong-qi">
          <Transition :name="buZhouGuoDuMing">
            <XingBieXuanZeBuZhou
              v-if="xingBieBuZhou === 1"
              key="tzb1"
              v-model:模型值="woDeXingBieZhi"
              变体="ziJi"
              :标题="huoQuFanYi('ziLiaoSheZhi', 'buZhou1BiaoTi')"
              :描述="huoQuFanYi('ziLiaoSheZhi', 'buZhou1MiaoShu')"
              :自身性别="woDeXingBieZhi"
              :对象性别="duiXiangXingBieZhi"
            />
            <XingBieXuanZeBuZhou
              v-else-if="xingBieBuZhou === 2"
              key="tzb2"
              v-model:模型值="duiXiangXingBieZhi"
              变体="duiXiang"
              :标题="huoQuFanYi('ziLiaoSheZhi', 'buZhou2BiaoTi')"
              :描述="huoQuFanYi('ziLiaoSheZhi', 'buZhou2MiaoShu')"
              :自身性别="woDeXingBieZhi"
              :对象性别="duiXiangXingBieZhi"
            />
            <div v-else key="tzb3" class="queren-bu">
              <button
                class="anniu anniu--jin queren-kai-shi"
                type="button"
                :disabled="kaiShiQingQiuZhong"
                @click="queRenKaiShiDuiJu"
              >
                {{ huoQuFanYi('tiaoZhan', 'queRenKaiShi') }}
              </button>
            </div>
          </Transition>
        </div>
        <div class="tanchuang-caozuo">
          <button
            v-if="xingBieBuZhou > 1"
            class="anniu anniu--mo"
            type="button"
            :disabled="kaiShiQingQiuZhong"
            @click="xingBieShangYiBu"
          >
            {{ huoQuFanYi('ziLiaoSheZhi', 'shangYiBu') }}
          </button>
          <button
            v-if="xingBieBuZhou < 3"
            class="anniu anniu--jin"
            type="button"
            :disabled="!keYiXiaYiBu"
            @click="xingBieXiaYiBu"
          >
            {{ huoQuFanYi('ziLiaoSheZhi', 'xiaYiBu') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from 'vue'
import { useRouter } from 'vue-router'
import {
  huoQuDangQianDuiJu,
  fangQiDuiJu,
  huoQuWoDeGaiKuang,
  huoQuTiaoZhanPeiZhi,
  huoQuPaiHangBang,
  type TiaoZhanDuiJu,
  type ZuBie,
  type ZuBieGaiKuang,
  type PaiHangXiangMu,
} from '@/api/挑战'
import { huoQuFanYi } from '@/config/翻译表'
import { 选择形态, type 性别二档, type 性别用户形态 } from '@/utils/性别'
import { 使用通用性别框体配色 } from '@/composables/use性别框体配色'
import ZhaXingTiShi from '@/components/挑战渣型提示.vue'
import XingBieXuanZeBuZhou from '@/components/资料设置/性别选择步骤.vue'
import TiaoZhanKongTai from '@/components/挑战空态.vue'
import TouXiang from '@/components/头像.vue'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const router = useRouter()

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']

const tiaoZhanBuZhouLieBiao = [1, 2, 3]

const dangQianDuiJu = ref<TiaoZhanDuiJu | null>(null)
const gaiKuangLieBiao = ref<ZuBieGaiKuang[]>([])
const cuoWuXinXi = ref('')
const kaiShiCuoWu = ref<QianTaiCuoWu | null>(null)

const xingBieXuanZeKeJian = ref(false)
const xingBieBuZhou = ref(1)
const buZhouGuoDuMing = ref('buzhou-qian-jin')
const woDeXingBieZhi = ref<性别用户形态 | null>(null)
const duiXiangXingBieZhi = ref<性别用户形态 | null>(null)
const zhaXingGaiLv = ref(0.3)

const zhengZaiFangQiQueRen = ref(false)
const fangQiQingQiuZhong = ref(false)
const kaiShiQingQiuZhong = ref(false)
const kaiShiAnNiu = ref<HTMLButtonElement | null>(null)
const xuanZeKuang = ref<HTMLElement | null>(null)

const bangDanZuBie = ref<ZuBie>('nan_nv')
const bangDanLieBiao = ref<PaiHangXiangMu[]>([])
let bangDanYiDongGuo = false
const bangDanYiJiaZai = ref(false)
const bangDanQieHuanZhong = ref(false)
let bangDanDaiCi = 0

const zuQieKuang = ref<HTMLElement | null>(null)
const zuZhishiLiangZhun = ref(false)
const zuZhishiWeiZhi = ref<CSSProperties>({ width: '0px', transform: 'translateX(0px)' })
let 尺寸观察: ResizeObserver | null = null

const {
  cuoWu: qianTaiCuoWu,
  zhuangTai: qianTaiZhuangTai,
  yunXing,
  jieShou,
  chongShi: chongShiZhuShuJu,
  qingLi,
} = use前台错误()

const {
  cuoWu: bangDanCuoWu,
  zhuangTai: bangDanZhuangTai,
  yunXing: yunXingBangDan,
  chongShi: chongShiBangDan,
} = use前台错误()

function zuBieMingCheng(zuBie: ZuBie): string {
  const yingShe: Record<ZuBie, string> = {
    nan_nv: huoQuFanYi('tiaoZhan', 'zuBieNanNv'),
    nv_nan: huoQuFanYi('tiaoZhan', 'zuBieNvNan'),
    nan_nan: huoQuFanYi('tiaoZhan', 'zuBieNanNan'),
    nv_nv: huoQuFanYi('tiaoZhan', 'zuBieNvNv'),
  }
  return yingShe[zuBie]
}

function zuBieZuCheng(zuBie: ZuBie): [性别二档, 性别二档] {
  const yingShe: Record<ZuBie, [性别二档, 性别二档]> = {
    nan_nv: ['nan', 'nv'],
    nv_nan: ['nv', 'nan'],
    nan_nan: ['nan', 'nan'],
    nv_nv: ['nv', 'nv'],
  }
  return yingShe[zuBie]
}

const zuBiePeiSe = Object.fromEntries(
  zuBieLieBiao.map((zuBie) => {
    const [ziShen, duiXiang] = zuBieZuCheng(zuBie)
    const { 样式 } = 使用通用性别框体配色({ 自身性别: ziShen, 对象性别: duiXiang })
    return [zuBie, 样式.value]
  }),
) as Record<ZuBie, CSSProperties>

function zhanJiWenBen(hang: ZuBieGaiKuang): string {
  return huoQuFanYi('tiaoZhan', 'zhanJiGeShi')
    .replace('{sheng}', String(hang.sheng_chang))
    .replace('{fu}', String(hang.fu_chang))
    .replace('{qi}', String(hang.qi_quan_chang))
}

const gaiKuangHang = computed<ZuBieGaiKuang[]>(() =>
  zuBieLieBiao.map(
    (zuBie) =>
      gaiKuangLieBiao.value.find((hang) => hang.zu_bie === zuBie) ?? {
        zu_bie: zuBie,
        ji_fen: null,
        duan_wei: null,
        sheng_chang: 0,
        fu_chang: 0,
        qi_quan_chang: 0,
        lian_sheng: 0,
        pai_ming: null,
      },
  ),
)

const shuJuZaiZai = computed(
  () => qianTaiZhuangTai.value === 'loading' && gaiKuangLieBiao.value.length === 0,
)

const dangQianZuGaiKuang = computed<ZuBieGaiKuang | null>(
  () => gaiKuangLieBiao.value.find((hang) => hang.zu_bie === bangDanZuBie.value) ?? null,
)

const bangDanWo = computed(() => {
  const hang = dangQianZuGaiKuang.value
  if (hang === null || hang.ji_fen === null || hang.pai_ming === null) {
    return null
  }
  return huoQuFanYi('tiaoZhan', 'woZaiBenZu').replace('{mingci}', String(hang.pai_ming))
})

const bangDanZaiZai = computed(
  () =>
    bangDanZhuangTai.value === 'loading' ||
    (!bangDanYiJiaZai.value && bangDanZhuangTai.value !== 'error'),
)

const bangDanShouCiJiaZai = computed(
  () => !bangDanYiJiaZai.value && bangDanZhuangTai.value !== 'error',
)

const bangDanKong = computed(
  () => !bangDanShouCiJiaZai.value && !bangDanCuoWu.value && bangDanLieBiao.value.length === 0,
)

const bangDanYouHang = computed(() => bangDanLieBiao.value.length > 0)

async function jiaZaiShuJuNei() {
  const [duiJu, gaiKuang] = await Promise.all([huoQuDangQianDuiJu(), huoQuWoDeGaiKuang()])
  dangQianDuiJu.value = duiJu
  gaiKuangLieBiao.value = gaiKuang
  if (!bangDanYiDongGuo) {
    const youFen = gaiKuang.find((hang) => hang.ji_fen !== null)
    if (youFen) bangDanZuBie.value = youFen.zu_bie
  }
}

async function jiaZaiShuJu() {
  await yunXing(jiaZaiShuJuNei, { chongShi: jiaZaiShuJu })
}

async function jiaZaiBangDan() {
  const benCiZuBie = bangDanZuBie.value
  const benCiDaiCi = ++bangDanDaiCi
  bangDanQieHuanZhong.value = bangDanYiJiaZai.value
  const jieGuo = await yunXingBangDan(async () => huoQuPaiHangBang(benCiZuBie), {
    chongShi: jiaZaiBangDan,
  })
  if (jieGuo === undefined || benCiDaiCi !== bangDanDaiCi || benCiZuBie !== bangDanZuBie.value) {
    if (benCiDaiCi === bangDanDaiCi) bangDanQieHuanZhong.value = false
    return
  }
  bangDanLieBiao.value = jieGuo.slice(0, 5)
  bangDanYiJiaZai.value = true
  bangDanQieHuanZhong.value = false
}

function 量ZuZhishi() {
  const 容器 = zuQieKuang.value
  if (!容器) return
  const 按钮 = [...容器.querySelectorAll<HTMLElement>('.zu-anniu')].find(
    (项) => 项.getAttribute('aria-pressed') === 'true',
  )
  if (!按钮) return
  zuZhishiWeiZhi.value = {
    width: `${按钮.offsetWidth}px`,
    transform: `translateX(${按钮.offsetLeft}px)`,
  }
}

async function chongShiQuanBu() {
  await chongShiZhuShuJu()
  await jiaZaiBangDan()
}

function qieHuanBangDanZu(zuBie: ZuBie) {
  if (bangDanZuBie.value === zuBie) return
  bangDanYiDongGuo = true
  bangDanZuBie.value = zuBie
  void jiaZaiBangDan()
}

watch(bangDanZuBie, () => {
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
  await jiaZaiShuJu()
  await jiaZaiBangDan()
})

const keYiXiaYiBu = computed(() => {
  if (xingBieBuZhou.value === 1) return !!woDeXingBieZhi.value
  if (xingBieBuZhou.value === 2) return !!duiXiangXingBieZhi.value
  return false
})

function xingBieShangYiBu() {
  if (xingBieBuZhou.value <= 1 || kaiShiQingQiuZhong.value) return
  buZhouGuoDuMing.value = 'buzhou-hou-tui'
  xingBieBuZhou.value -= 1
}

function xingBieXiaYiBu() {
  if (xingBieBuZhou.value >= 3 || !keYiXiaYiBu.value) return
  buZhouGuoDuMing.value = 'buzhou-qian-jin'
  xingBieBuZhou.value += 1
}

function tiaoZhuanBuZhou(buZhou: number) {
  if (buZhou >= xingBieBuZhou.value || kaiShiQingQiuZhong.value) return
  buZhouGuoDuMing.value = 'buzhou-hou-tui'
  xingBieBuZhou.value = buZhou
}

async function queRenKaiShiDuiJu() {
  if (!woDeXingBieZhi.value || !duiXiangXingBieZhi.value || kaiShiQingQiuZhong.value) return
  kaiShiCuoWu.value = null
  kaiShiQingQiuZhong.value = true
  try {
    sessionStorage.setItem(
      'ziLiaoSheZhiLinShi',
      JSON.stringify({
        moshi: 'tiaozhan',
        xingBie: woDeXingBieZhi.value,
        woDeXingBie: 选择形态(woDeXingBieZhi.value),
        muBiaoXingBie: duiXiangXingBieZhi.value,
      }),
    )
    await router.push('/tian-jia-wei-xin')
  } catch (错误: unknown) {
    kaiShiQingQiuZhong.value = false
    const zhengChangHua = 归一前台错误(错误)
    kaiShiCuoWu.value = zhengChangHua.xianShi ? zhengChangHua : null
  }
}

async function daKaiXingBieXuanZe() {
  if (qianTaiZhuangTai.value === 'error' && dangQianDuiJu.value === null) {
    await jiaZaiShuJu()
    if (qianTaiZhuangTai.value === 'error' && dangQianDuiJu.value === null) return
  }
  if (dangQianDuiJu.value) {
    cuoWuXinXi.value = huoQuFanYi('tiaoZhan', 'yiYouDuiJuTishi')
    return
  }
  cuoWuXinXi.value = ''
  kaiShiCuoWu.value = null
  woDeXingBieZhi.value = null
  duiXiangXingBieZhi.value = null
  buZhouGuoDuMing.value = 'buzhou-qian-jin'
  xingBieBuZhou.value = 1
  xingBieXuanZeKeJian.value = true
  try {
    const peiZhi = await huoQuTiaoZhanPeiZhi()
    zhaXingGaiLv.value = peiZhi.zha_xing_gai_lv ?? 0.3
  } catch (错误: unknown) {
    zhaXingGaiLv.value = 0.3
    const zhengChangHua = 归一前台错误(错误)
    kaiShiCuoWu.value = zhengChangHua.xianShi ? zhengChangHua : null
  }
}

function guanBiXingBieXuanZe() {
  if (kaiShiQingQiuZhong.value) return
  xingBieXuanZeKeJian.value = false
}

function qianWangPaiHangBang() {
  router.push('/tiao-zhan/pai-hang')
}

function jiXuDuiJu() {
  if (!dangQianDuiJu.value) return
  router.push(`/chat/${dangQianDuiJu.value.jiao_se_id}`)
}

async function queRenFangQi() {
  if (!dangQianDuiJu.value || fangQiQingQiuZhong.value) return
  fangQiQingQiuZhong.value = true
  qingLi()
  try {
    await fangQiDuiJu()
    zhengZaiFangQiQueRen.value = false
    dangQianDuiJu.value = null
    await jiaZaiShuJu()
  } catch (错误: unknown) {
    jieShou(错误, queRenFangQi)
  } finally {
    fangQiQingQiuZhong.value = false
  }
}

function quXiaoFangQi() {
  zhengZaiFangQiQueRen.value = false
}

function xunHuanJiaoDian(shiJian: KeyboardEvent) {
  if (shiJian.key !== 'Tab' || !xuanZeKuang.value) return
  const keJiaoDian = [
    ...xuanZeKuang.value.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  ]
  if (keJiaoDian.length === 0) return
  const diYiGe = keJiaoDian[0]
  const zuiHouYiGe = keJiaoDian[keJiaoDian.length - 1]
  const dangQian = document.activeElement
  if (shiJian.shiftKey && (dangQian === diYiGe || !xuanZeKuang.value.contains(dangQian))) {
    shiJian.preventDefault()
    zuiHouYiGe.focus()
    return
  }
  if (!shiJian.shiftKey && dangQian === zuiHouYiGe) {
    shiJian.preventDefault()
    diYiGe.focus()
  }
}

let yeMianYuanYiChu = ''
let yiSuoDingGunDong = false

watch(xingBieXuanZeKeJian, async (keJian) => {
  if (keJian) {
    yeMianYuanYiChu = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    yiSuoDingGunDong = true
    await nextTick()
    xuanZeKuang.value?.querySelector<HTMLButtonElement>('.xingBie-kaPian')?.focus()
    return
  }
  if (yiSuoDingGunDong) {
    document.body.style.overflow = yeMianYuanYiChu
    yiSuoDingGunDong = false
  }
  kaiShiAnNiu.value?.focus()
})

onBeforeUnmount(() => {
  if (yiSuoDingGunDong) document.body.style.overflow = yeMianYuanYiChu
  尺寸观察?.disconnect()
  尺寸观察 = null
})
</script>


<style scoped>
.tiaozhan-yemian {
  --tz-jin: var(--junshi-zhuse);
  --tz-jin-an: color-mix(in srgb, var(--junshi-zhuse) 86%, var(--wenben-zhuse));
  --tz-mian: var(--beijing-kaopian);
  --tz-di: var(--beijing-ciuse);
  --tz-xian: var(--biankuang-yanse);
  --tz-xian-ruo: color-mix(in srgb, var(--biankuang-yanse) 60%, transparent);
  --tz-wen: var(--wenben-zhuse);
  --tz-wen-ci: color-mix(in srgb, var(--wenben-zhuse) 72%, var(--wenben-ciuse));
  --tz-wen-wei: color-mix(in srgb, var(--yanse-weixian-shen) 70%, var(--wenben-zhuse));
  --tz-fan-zi: var(--beijing-kaopian);
  --tz-gu: color-mix(in srgb, var(--wenben-ciuse) 32%, var(--beijing-kaopian));
  --tz-zi-xiao: 12px;
  --tz-zi-zheng: 16px;
  --tz-zi-zhong: 20px;
  --tz-zi-da: 32px;
  --tz-kuan: calc(var(--jiange-da) * 44);
  --tz-re-ku: 44px;
  --tz-dong: var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
  --tz-zhi-shi-dong: 260ms;
  --tz-dan-ru-dong: 180ms;
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

.zhuti {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: var(--jiange-da);
  align-items: start;
}

.zhuti-zhu,
.zhuti-ce {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-da);
  min-width: 0;
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

.qu-tou {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--jiange-xiao);
}

.qu-biaoti,
.rukou-biaoti {
  margin: 0;
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  line-height: 1.3;
}

.qu-fu {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
}

.duiju-qu {
  background-color: var(--tz-mian);
  background-image: linear-gradient(to right, var(--tz-jin) 0 2px, transparent 2px);
}

.duiju-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-12);
  flex-wrap: wrap;
}

.duiju-wei {
  width: calc(var(--jiange-da) * 2);
  height: calc(var(--jiange-da) * 2);
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  background: var(--tz-di);
}

.duiju-wei :deep(.touxiang--zi) {
  font-size: var(--tz-zi-zhong);
}

.duiju-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  flex: 1 1 auto;
  min-width: 0;
}

.duiju-zhuang {
  font-size: var(--tz-zi-xiao);
  font-weight: 600;
  line-height: 1.4;
  color: var(--tz-jin);
}

.duiju-ming {
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duiju-cao {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  flex: none;
  flex-wrap: wrap;
}

.anniu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tz-re-ku);
  padding: 0 var(--jiange-zhong);
  border: 1px solid transparent;
  border-radius: var(--yuanjiao-xiao);
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  line-height: 1.2;
  transition:
    background-color var(--tz-dong),
    border-color var(--tz-dong),
    color var(--tz-dong);
}

.anniu--jin {
  background: var(--tz-jin);
  color: var(--tz-fan-zi);
}

.anniu--jin:hover:not(:disabled) {
  background: var(--tz-jin-an);
}

.anniu--wei {
  border-color: var(--tz-xian);
  background: transparent;
  color: var(--tz-wen);
}

.anniu--wei:hover:not(:disabled) {
  border-color: var(--tz-wen-wei);
  color: var(--tz-wen-wei);
}

.anniu--wei-shi {
  border-color: var(--tz-wen-wei);
  color: var(--tz-wen-wei);
}

.anniu--mo {
  border-color: transparent;
  background: transparent;
  color: var(--tz-wen-ci);
}

.anniu--mo:hover:not(:disabled) {
  color: var(--tz-wen);
}

.anniu:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anniu-kaiShi:disabled {
  background: var(--tz-gu);
  color: var(--tz-wen-ci);
  cursor: not-allowed;
}

.rukou-qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.rukou-tou {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
}

.rukou-cao {
  display: flex;
  align-items: stretch;
  gap: var(--jiange-xiao);
  flex-wrap: wrap;
}

.anniu-kaiShi {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 calc(var(--jiange-da) * 9);
  min-height: var(--tz-re-ku);
  padding: 0 var(--jiange-da);
  border: 1px solid transparent;
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-jin);
  color: var(--tz-fan-zi);
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  transition: background-color var(--tz-dong);
}

.anniu-kaiShi:hover:not(:disabled) {
  background: var(--tz-jin-an);
}

.rukou-tishi {
  margin: 0;
  font-size: var(--tz-zi-zheng);
  line-height: 1.6;
  color: var(--tz-wen-ci);
}

.rukou-tishi--cuo {
  padding: var(--jiange-xiao) var(--jiange-12);
  border-left: 2px solid var(--tz-wen-wei);
  border-radius: var(--yuanjiao-xiao);
  background: color-mix(in srgb, var(--yanse-weixian) 8%, transparent);
  color: var(--tz-wen-wei);
}

.jifen-wangge {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jiange-12);
  min-width: 0;
}

.jifen-ka {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
  padding: var(--jiange-zhong);
  border: 1px solid currentColor;
  border-radius: var(--yuanjiao-zhong);
}

.jifen-ka-tou,
.jifen-ka-fu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.jifen-ka-tou {
  flex-wrap: wrap;
}

.jifen-ka-fu {
  flex-wrap: wrap;
  padding-top: var(--jiange-xiao);
  border-top: 1px solid currentColor;
}

.zubie-ming {
  min-width: 0;
  margin: 0;
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  line-height: 1.4;
}

.zubie-duanwei,
.zubie-zhanji,
.zubie-paiming {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
}

.zubie-zhanji,
.zubie-paiming {
  font-variant-numeric: tabular-nums;
}

.zubie-paiming {
  margin-inline-start: auto;
  white-space: nowrap;
}

.zubie-jifen,
.zubie-kong {
  font-size: var(--tz-zi-da);
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.zubie-jifen {
  white-space: nowrap;
}

.jifen-danwei {
  margin-inline-start: var(--jiange-4);
  font-size: var(--tz-zi-xiao);
  font-weight: 400;
}

.jifen-ka--zhanwei {
  border-color: var(--tz-xian);
  background: var(--tz-di);
}

.jifen-ka--zhanwei .zhanwei-kuai--fen {
  width: 52%;
  height: var(--tz-zi-da);
}

.zhanwei-kuai {
  display: block;
  height: var(--tz-zi-zheng);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-gu);
}

.zhanwei-kuai--ming {
  width: 72%;
}

.zhanwei-kuai--duan {
  width: 40%;
}

.zhanwei-kuai--pai {
  width: 46%;
  justify-self: end;
}

.zhanwei-kuai--fen {
  width: 52%;
  justify-self: end;
}

.zu-qie {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: var(--jiange-zhong);
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.zu-zhishi {
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

.zu-zhishi[data-liang-zhun='false'] {
  transition: none;
}

.zu-anniu {
  position: relative;
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

.zu-anniu:hover:not(:disabled) {
  color: var(--tz-wen);
  transform: translateY(-1px);
}

.zu-anniu[aria-pressed='true'] {
  color: var(--tz-wen);
  font-weight: 600;
}

.zhaiyao-wo {
  margin: 0;
  font-size: var(--tz-zi-xiao);
  line-height: 1.5;
  color: var(--tz-wen-ci);
}

.zhaiyao-nei-rong {
  display: grid;
  transition:
    opacity var(--tz-dan-ru-dong) ease-out,
    transform var(--tz-dan-ru-dong) ease-out;
}

.zhaiyao-nei-rong > * {
  grid-area: 1 / 1;
}

.zhaiyao-nei-rong[data-qie-huan='true'] {
  opacity: 0.5;
  transform: translateY(4px);
}

.zhaiyao-dan-ru-enter-active,
.zhaiyao-dan-ru-leave-active {
  transition:
    opacity var(--tz-dan-ru-dong) ease-out,
    transform var(--tz-dan-ru-dong) ease-out;
}

.zhaiyao-dan-ru-enter-from,
.zhaiyao-dan-ru-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.zhaiyao-nei {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.zhaiyao-liebiao {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.zhaiyao-hang {
  display: grid;
  grid-template-columns: calc(var(--jiange-da) * 1.5) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--jiange-12);
  padding: var(--jiange-xiao) 0;
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.zhaiyao-hang:last-child {
  border-bottom: 0;
}

.zhaiyao-paiming {
  justify-self: end;
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--tz-wen-ci);
}

.zhaiyao-hang--yi .zhaiyao-paiming {
  color: var(--tz-jin);
}

.zhaiyao-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  min-width: 0;
}

.zhaiyao-ming {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
}

.zhaiyao-duan {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
}

.zhaiyao-jifen {
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.zhaiyao-chongshi {
  align-self: flex-start;
  min-height: var(--tz-re-ku);
  padding: 0 var(--jiange-zhong);
  border: 1px solid var(--tz-xian);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--tz-wen);
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
}

.zhaiyao-chongshi:hover:not(:disabled) {
  border-color: var(--tz-jin);
  color: var(--tz-jin);
}

.zhaiyao-zhanwei {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-xiao) 0;
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.zhaiyao-zhanwei:last-child {
  border-bottom: 0;
}

.zhaiyao-zhanwei .zhanwei-kuai--pai {
  flex: none;
  width: var(--jiange-da);
}

.zhaiyao-zhanwei .zhanwei-kuai--ming {
  flex: 1 1 auto;
}

.zhaiyao-zhanwei .zhanwei-kuai--fen {
  flex: none;
  width: calc(var(--jiange-da) * 2);
}

.zhaiyao-quanbu {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: var(--tz-re-ku);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tz-wen);
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  text-align: left;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  text-decoration-color: var(--tz-xian);
  transition:
    color var(--tz-dong),
    text-decoration-color var(--tz-dong);
}

.zhaiyao-quanbu:hover {
  color: var(--tz-jin);
  text-decoration-color: currentColor;
}

.ping-mu-wai {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.xingbie-zhezhao {
  position: fixed;
  inset: 0;
  z-index: var(--ceng-caidan);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-zhong);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: var(--boli-mohu);
  -webkit-backdrop-filter: var(--boli-mohu);
  animation: xingbie-zhe-zhao-ru var(--tz-dan-ru-dong) ease-out both;
}

.xingbie-tanchuang {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  width: 100%;
  max-width: calc(var(--jiange-da) * 21);
  max-height: calc(100dvh - var(--jiange-da) * 2);
  overflow-y: auto;
  padding: var(--jiange-da);
  border-radius: var(--yuanjiao-zhong);
  background: var(--tz-mian);
  box-shadow: 0 24px 48px -24px rgba(0, 0, 0, 0.45);
  animation: xingbie-tan-chuang-ru 220ms var(--quxian-tan-chu) both;
}

.tanchuang-tou {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-zhong);
}

.tanchuang-biaoti {
  margin: 0;
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  line-height: 1.3;
}

.tanchuang-guanbi {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: var(--tz-re-ku);
  height: var(--tz-re-ku);
  margin: calc(var(--jiange-xiao) * -1);
  border: 0;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--tz-wen-ci);
  font-size: var(--tz-zi-zhong);
  line-height: 1;
  transition: color var(--tz-dong);
}

.tanchuang-guanbi:hover:not(:disabled) {
  color: var(--tz-wen);
}

.tanchuang-guanbi:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.xingbie-tanchuang :deep(.ti-shi-nei-rong) {
  color: var(--tz-wen-ci);
}

.jindu-yuan-dian {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--jiange-12);
  padding: var(--jiange-xiao) 0;
}

.jindu-dian {
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--tz-wen-ci);
  cursor: pointer;
  transition:
    background-color var(--tz-ka-dong) ease-out,
    transform var(--tz-ka-dong) ease-out;
}

.jindu-dian.huoyue {
  background: var(--tz-wen);
}

.jindu-dian.dangQian {
  background: var(--tz-jin);
  transform: scale(1.25);
}

.buzhou-rong-qi {
  position: relative;
  width: 100%;
  min-height: 340px;
  overflow: hidden;
}

.queren-bu {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-zhong);
}

.queren-kai-shi {
  width: 100%;
  max-width: calc(var(--jiange-da) * 9);
  min-height: var(--tz-re-ku);
}

.buzhou-qian-jin-enter-active,
.buzhou-qian-jin-leave-active,
.buzhou-hou-tui-enter-active,
.buzhou-hou-tui-leave-active {
  transition:
    transform var(--tz-ka-dong) ease-out,
    opacity var(--tz-ka-dong) ease-out;
}

.buzhou-qian-jin-enter-from,
.buzhou-hou-tui-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

.buzhou-qian-jin-leave-to,
.buzhou-hou-tui-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}

.tanchuang-caozuo {
  display: flex;
  justify-content: flex-end;
  gap: var(--jiange-xiao);
}

@media (max-width: 900px) {
  .zhuti {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .tiaozhan-yemian {
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
  .duiju-cao {
    width: 100%;
  }

  .xingbie-tanchuang {
    padding: var(--jiange-zhong);
  }

  .buzhou-rong-qi {
    min-height: 300px;
  }
}

@media (max-width: 480px) {
  .jifen-wangge {
    grid-template-columns: minmax(0, 1fr);
  }
}

@keyframes xingbie-zhe-zhao-ru {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes xingbie-tan-chuang-ru {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .anniu,
  .anniu-kaiShi,
  .zu-anniu,
  .zu-zhishi,
  .tanchuang-guanbi,
  .jindu-dian,
  .buzhou-qian-jin-enter-active,
  .buzhou-qian-jin-leave-active,
  .buzhou-hou-tui-enter-active,
  .buzhou-hou-tui-leave-active,
  .zhaiyao-quanbu,
  .zhaiyao-chongshi,
  .zhaiyao-nei-rong,
  .zhaiyao-nei-rong > *,
  .xingbie-zhezhao,
  .xingbie-tanchuang {
    transition: none;
    animation: none;
  }
}
</style>
