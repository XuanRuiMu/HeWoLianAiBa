<template>
  <div class="tiaozhan-yemian">
    <header class="yemian-tou">
      <div class="tou-zhu">
        <h1 class="yemian-biaoti">
          <span class="biaoti-biao" aria-hidden="true" />
          <span>{{ huoQuFanYi('tiaoZhan', 'yeMianBiaoTi') }}</span>
        </h1>
        <p class="yemian-fubiaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianFuBiaoTi') }}</p>
      </div>
      <dl class="tou-tongji" :aria-busy="shuJuZaiZai ? 'true' : 'false'">
        <div class="tongji-xiang">
          <dt>{{ huoQuFanYi('tiaoZhan', 'yiCanSaiZuBie') }}</dt>
          <dd>
            <span v-if="shuJuZaiZai" class="zhanwei-tiao" aria-hidden="true" />
            <span v-else-if="qianTaiCuoWu && gaiKuangLieBiao.length === 0">{{
              huoQuFanYi('tiaoZhan', 'zanWu')
            }}</span>
            <template v-else>
              {{ canSaiShu }}<span class="tongji-fenmu">/{{ zuBieLieBiao.length }}</span>
            </template>
          </dd>
        </div>
        <div class="tongji-xiang">
          <dt>{{ huoQuFanYi('tiaoZhan', 'zuiGaoJiFen') }}</dt>
          <dd>
            <span v-if="shuJuZaiZai" class="zhanwei-tiao zhanwei-tiao--chang" aria-hidden="true" />
            <template v-else>{{
              zuiGaoJiFen === null ? huoQuFanYi('tiaoZhan', 'zanWu') : zuiGaoJiFen
            }}</template>
          </dd>
        </div>
      </dl>
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
            <h2 class="qu-biaoti">{{ huoQuFanYi('tiaoZhan', 'woDePaiWei') }}</h2>
            <span class="qu-fu">{{ huoQuFanYi('tiaoZhan', 'siGeZuBie') }}</span>
          </div>
          <RequestError
            v-if="qianTaiCuoWu"
            :cuo-wu="qianTaiCuoWu"
            :zhong-zai="shuJuZaiZai"
            @chong-shi="chongShiQuanBu"
          />
          <div v-if="shuJuZaiZai" class="zubie-biao" role="status">
            <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
            <div v-for="序 in zuBieLieBiao.length" :key="序" class="zubie-zhanwei" aria-hidden="true">
              <span class="zhanwei-kuai zhanwei-kuai--ming" />
              <span class="zhanwei-kuai zhanwei-kuai--duan" />
              <span class="zhanwei-kuai zhanwei-kuai--ji" />
              <span class="zhanwei-kuai zhanwei-kuai--pai" />
              <span class="zhanwei-kuai zhanwei-kuai--fen" />
            </div>
          </div>
          <div v-else-if="gaiKuangLieBiao.length > 0 || !qianTaiCuoWu" class="zubie-biao">
            <div class="zubie-tou" aria-hidden="true">
              <span>{{ huoQuFanYi('tiaoZhan', 'zuBieBiaoQian') }}</span>
              <span>{{ huoQuFanYi('tiaoZhan', 'duanWeiBiaoQian') }}</span>
              <span>{{ huoQuFanYi('tiaoZhan', 'zhanJiBiaoQian') }}</span>
              <span>{{ huoQuFanYi('tiaoZhan', 'paiMingBiaoQian') }}</span>
              <span>{{ huoQuFanYi('tiaoZhan', 'jiFenBiaoQian') }}</span>
            </div>
            <div
              v-for="hang in gaiKuangHang"
              :key="hang.zu_bie"
              class="zubie-hang"
              :class="{ 'zubie-hang--kong': hang.ji_fen === null }"
            >
              <span class="zubie-ming">
                <span class="zubie-dian" aria-hidden="true">
                  <span
                    v-for="(dang, suoYin) in zuBieZuCheng(hang.zu_bie)"
                    :key="suoYin"
                    class="dian"
                    :data-dang="dang"
                  />
                </span>
                {{ zuBieMingCheng(hang.zu_bie) }}
              </span>
              <div v-if="hang.ji_fen !== null" class="zubie-xinxi">
                <span class="zubie-duanwei">{{ hang.duan_wei }}</span>
                <span class="zubie-zhanji">{{ zhanJiWenBen(hang) }}</span>
                <span class="zubie-paiming">{{
                  hang.pai_ming === null
                    ? huoQuFanYi('tiaoZhan', 'zanWu')
                    : huoQuFanYi('tiaoZhan', 'mingCiGeShi').replace(
                        '{mingci}',
                        String(hang.pai_ming),
                      )
                }}</span>
              </div>
              <span v-if="hang.ji_fen !== null" class="zubie-jifen">
                {{ hang.ji_fen }}<span class="jifen-danwei">{{
                  huoQuFanYi('tiaoZhan', 'fenDanWei')
                }}</span>
              </span>
              <span v-else class="zubie-kong">{{ huoQuFanYi('tiaoZhan', 'weiCanJia') }}</span>
            </div>
          </div>
        </section>

        <section class="qu rukou-qu">
          <div class="rukou-tou">
            <h2 class="qu-biaoti">{{ huoQuFanYi('tiaoZhan', 'kaiShiXinDuiJu') }}</h2>
            <p class="rukou-shuo">{{ huoQuFanYi('tiaoZhan', 'suiJiTishi') }}</p>
          </div>
          <div class="rukou-cao">
            <button
              ref="kaiShiAnNiu"
              class="anniu-kaiShi"
              type="button"
              :disabled="kaiShiQingQiuZhong || dangQianDuiJu !== null"
              @click="daKaiXingBieXuanZe"
            >
              <span>{{ huoQuFanYi('tiaoZhan', 'kaiShiTiaoZhan') }}</span>
              <span class="anniu-jiantou" aria-hidden="true">→</span>
            </button>
            <button class="anniu-paihang" type="button" @click="qianWangPaiHangBang">
              {{ huoQuFanYi('tiaoZhan', 'paiHangBang') }}
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
            <span class="qu-fu">{{ huoQuFanYi('tiaoZhan', 'qianSanMing') }}</span>
          </div>
          <div class="zu-qie" role="group" :aria-label="huoQuFanYi('tiaoZhan', 'xuanZeZuBie')">
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
          <p v-if="!shuJuZaiZai && !qianTaiCuoWu" class="zhaiyao-wo">{{ bangDanWo }}</p>
          <div v-if="bangDanZaiZai" class="zhaiyao-nei" role="status">
            <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
            <div v-for="序 in 3" :key="序" class="zhaiyao-zhanwei" aria-hidden="true">
              <span class="zhanwei-kuai zhanwei-kuai--pai" />
              <span class="zhanwei-kuai zhanwei-kuai--ming" />
              <span class="zhanwei-kuai zhanwei-kuai--fen" />
            </div>
          </div>
          <div v-else-if="bangDanCuoWu" class="zhaiyao-nei">
            <p class="zhaiyao-kong">{{ bangDanCuoWu.lianAiWenAn }}</p>
            <button
              v-if="bangDanCuoWu.retryable"
              class="zhaiyao-chongshi"
              type="button"
              @click="chongShiBangDan"
            >
              {{ huoQuFanYi('tongYong', 'qianTaiCuoWuChongShi') }}
            </button>
          </div>
          <div v-else-if="bangDanLieBiao.length === 0" class="zhaiyao-nei">
            <p class="zhaiyao-kong">{{ huoQuFanYi('tiaoZhan', 'zanWuPaiHang') }}</p>
            <p class="zhaiyao-kong zhaiyao-kong--fu">
              {{ huoQuFanYi('tiaoZhan', 'bangDanKongFu') }}
            </p>
          </div>
          <ol v-else class="zhaiyao-liebiao">
            <li
              v-for="(xiang, suoYin) in bangDanLieBiao"
              :key="xiang.yong_hu_ming + suoYin"
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
          <button class="zhaiyao-quanbu" type="button" @click="qianWangPaiHangBang">
            <span>{{ huoQuFanYi('tiaoZhan', 'chaKanWanZhengBang') }}</span>
            <span aria-hidden="true">→</span>
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
        <p class="tanchuang-shuo">{{ huoQuFanYi('tiaoZhan', 'suiJiTishi') }}</p>
        <ZhaXingTiShi :zha-xing-gai-lv="zhaXingGaiLv" />
        <div class="xingbie-hang">
          <div class="xingbie-zu">
            <p class="xingbie-zu-biaoti">{{ huoQuFanYi('tiaoZhan', 'niDeXingBie') }}</p>
            <div
              class="xingbie-wangge"
              role="radiogroup"
              :aria-label="huoQuFanYi('tiaoZhan', 'niDeXingBie')"
            >
              <button
                v-for="ka in xingBieKaPianLieBiao"
                :key="'zi-shen-' + ka.zhi"
                type="button"
                class="xingbie-ka-pian"
                role="radio"
                :data-xingbie="ka.dang"
                :disabled="kaiShiQingQiuZhong"
                :aria-checked="woDeXingBie === ka.zhi ? 'true' : 'false'"
                :style="woDeXingBie === ka.zhi ? 选中样式 : undefined"
                @click="xuanZeZiJi(ka.zhi)"
              >
                <span class="xingbie-fuhao" aria-hidden="true">{{ ka.fuhao }}</span>
                <span class="xingbie-ming">{{ ka.ming }}</span>
              </button>
            </div>
          </div>
          <div class="xingbie-zu">
            <p class="xingbie-zu-biaoti">{{ huoQuFanYi('tiaoZhan', 'duiXiangXingBie') }}</p>
            <div
              class="xingbie-wangge"
              role="radiogroup"
              :aria-label="huoQuFanYi('tiaoZhan', 'duiXiangXingBie')"
            >
              <button
                v-for="ka in xingBieKaPianLieBiao"
                :key="'dui-xiang-' + ka.zhi"
                type="button"
                class="xingbie-ka-pian"
                role="radio"
                :data-xingbie="ka.dang"
                :disabled="!woDeXingBie || kaiShiQingQiuZhong"
                :aria-checked="duiXiangXingBie === ka.zhi ? 'true' : 'false'"
                :style="duiXiangXingBie === ka.zhi ? 选中样式 : undefined"
                @click="xuanZeDuiXiang(ka.zhi)"
              >
                <span class="xingbie-fuhao" aria-hidden="true">{{ ka.fuhao }}</span>
                <span class="xingbie-ming">{{ ka.ming }}</span>
              </button>
            </div>
            <p v-if="!woDeXingBie" class="xingbie-tishi">
              {{ huoQuFanYi('tiaoZhan', 'xianXuanZiJi') }}
            </p>
            <p v-else-if="kaiShiQingQiuZhong" class="xingbie-tishi" role="status">
              {{ huoQuFanYi('tiaoZhan', 'zhengZaiJinRu') }}
            </p>
          </div>
        </div>
        <div class="tanchuang-caozuo">
          <button
            class="anniu anniu--mo"
            type="button"
            :disabled="kaiShiQingQiuZhong"
            @click="guanBiXingBieXuanZe"
          >
            {{ huoQuFanYi('tongYong', 'quXiao') }}
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
import { 用户形态, type 性别选择形态 } from '@/utils/性别'
import { 使用性别框体配色 } from '@/composables/use性别框体配色'
import { 使用用户仓库 } from '@/stores/用户'
import ZhaXingTiShi from '@/components/挑战渣型提示.vue'
import TouXiang from '@/components/头像.vue'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']

const 默认XingBie = computed(() => 用户仓库.dangQianYongHu?.mo_ren_xing_bie)
const 默认DuiXiangXingBie = computed(() => 用户仓库.dangQianYongHu?.mu_biao_xing_bie)
const { 样式: 性别框体样式 } = 使用性别框体配色({
  自身性别: () => woDeXingBie.value,
  对象性别: () => duiXiangXingBie.value ?? 默认DuiXiangXingBie.value,
  默认性别: () => 默认XingBie.value,
})
const 选中样式 = computed<CSSProperties>(() => {
  const 原样式 = 性别框体样式.value
  return {
    backgroundColor: 原样式.backgroundColor,
    borderColor: 原样式.borderColor,
    color: 原样式.color,
  }
})
const xingBieKaPianLieBiao = computed(() => [
  {
    zhi: '男' as 性别选择形态,
    dang: 'nan',
    fuhao: '♂',
    ming: huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'),
  },
  {
    zhi: '女' as 性别选择形态,
    dang: 'nv',
    fuhao: '♀',
    ming: huoQuFanYi('ziLiaoSheZhi', 'xingBieNv'),
  },
])

const dangQianDuiJu = ref<TiaoZhanDuiJu | null>(null)
const gaiKuangLieBiao = ref<ZuBieGaiKuang[]>([])
const cuoWuXinXi = ref('')
const kaiShiCuoWu = ref<QianTaiCuoWu | null>(null)

const xingBieXuanZeKeJian = ref(false)
const woDeXingBie = ref<性别选择形态 | null>(null)
const duiXiangXingBie = ref<性别选择形态 | null>(null)
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
let bangDanDaiCi = 0

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

function zuBieZuCheng(zuBie: ZuBie): Array<'nan' | 'nv'> {
  const yingShe: Record<ZuBie, Array<'nan' | 'nv'>> = {
    nan_nv: ['nan', 'nv'],
    nv_nan: ['nv', 'nan'],
    nan_nan: ['nan', 'nan'],
    nv_nv: ['nv', 'nv'],
  }
  return yingShe[zuBie]
}

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

const canSaiShu = computed(
  () => gaiKuangHang.value.filter((hang) => hang.ji_fen !== null).length,
)

const zuiGaoJiFen = computed<number | null>(() => {
  const fenShu = gaiKuangHang.value
    .map((hang) => hang.ji_fen)
    .filter((fen): fen is number => fen !== null)
  return fenShu.length > 0 ? Math.max(...fenShu) : null
})

const dangQianZuGaiKuang = computed<ZuBieGaiKuang | null>(
  () => gaiKuangLieBiao.value.find((hang) => hang.zu_bie === bangDanZuBie.value) ?? null,
)

const bangDanWo = computed(() => {
  const hang = dangQianZuGaiKuang.value
  if (hang === null || hang.ji_fen === null || hang.pai_ming === null) {
    return huoQuFanYi('tiaoZhan', 'woWeiCanSai')
  }
  return huoQuFanYi('tiaoZhan', 'woZaiBenZu').replace('{mingci}', String(hang.pai_ming))
})

const bangDanZaiZai = computed(
  () =>
    bangDanZhuangTai.value === 'loading' ||
    (!bangDanYiJiaZai.value && bangDanZhuangTai.value !== 'error'),
)

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
  bangDanYiJiaZai.value = false
  const jieGuo = await yunXingBangDan(async () => huoQuPaiHangBang(benCiZuBie), {
    chongShi: jiaZaiBangDan,
  })
  if (jieGuo === undefined || benCiDaiCi !== bangDanDaiCi || benCiZuBie !== bangDanZuBie.value) {
    return
  }
  bangDanLieBiao.value = jieGuo.slice(0, 3)
  bangDanYiJiaZai.value = true
}

async function chongShiQuanBu() {
  await chongShiZhuShuJu()
  await jiaZaiBangDan()
}

function qieHuanBangDanZu(zuBie: ZuBie) {
  if (bangDanZuBie.value === zuBie) return
  bangDanYiDongGuo = true
  bangDanZuBie.value = zuBie
  bangDanLieBiao.value = []
  void jiaZaiBangDan()
}

onMounted(async () => {
  await jiaZaiShuJu()
  await jiaZaiBangDan()
})

async function xuanZeDuiXiang(xingBie: 性别选择形态) {
  if (!woDeXingBie.value || kaiShiQingQiuZhong.value) return
  kaiShiCuoWu.value = null
  duiXiangXingBie.value = xingBie
  kaiShiQingQiuZhong.value = true
  try {
    sessionStorage.setItem(
      'ziLiaoSheZhiLinShi',
      JSON.stringify({
        moshi: 'tiaozhan',
        xingBie: 用户形态(woDeXingBie.value),
        woDeXingBie: woDeXingBie.value,
        muBiaoXingBie: 用户形态(xingBie),
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
  woDeXingBie.value = null
  duiXiangXingBie.value = null
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

function xuanZeZiJi(xingBie: 性别选择形态) {
  kaiShiCuoWu.value = null
  woDeXingBie.value = xingBie
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
    xuanZeKuang.value?.querySelector<HTMLButtonElement>('.xingbie-ka-pian')?.focus()
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
})
</script>

<style scoped>
.tiaozhan-yemian {
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
  --tz-kuan: calc(var(--jiange-da) * 46);
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

.zhuti {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
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
  gap: var(--jiange-12);
  min-width: 0;
  padding: calc(var(--jiange-zhong) + var(--jiange-4)) var(--jiange-zhong);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-da);
  background: var(--tz-mian);
}

.qu-tou {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--jiange-xiao);
}

.qu-biaoti {
  margin: 0;
  font-size: var(--ziti-da);
  font-weight: 600;
  line-height: 1.3;
}

.qu-fu {
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-san);
}

.duiju-qu {
  border-color: var(--tz-jin-xian);
  background: color-mix(in srgb, var(--tz-jin) 7%, var(--tz-mian));
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
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: 50%;
  background: var(--beijing-ciuse);
}

.duiju-wei :deep(.touxiang--zi) {
  font-size: calc(var(--ziti-da) * 1.2);
}

.duiju-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  flex: 1 1 auto;
  min-width: 0;
}

.duiju-zhuang {
  font-size: var(--ziti-xiao);
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--tz-jin);
}

.duiju-ming {
  font-size: var(--ziti-da);
  font-weight: 600;
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
  padding: var(--jiange-6) var(--jiange-12);
  border: var(--tz-xian-kuan) solid transparent;
  border-radius: var(--yuanjiao-xiao);
  font-size: var(--ziti-xiao);
  font-weight: 600;
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.anniu--jin {
  border-color: var(--tz-jin-xian);
  background: var(--tz-jin-ruo);
  color: var(--tz-jin);
}

.anniu--jin:hover {
  border-color: var(--tz-jin);
  background: color-mix(in srgb, var(--tz-jin) 20%, transparent);
}

.anniu--wei {
  border-color: var(--tz-xian);
  color: var(--tz-wen-er);
}

.anniu--wei:hover {
  border-color: var(--yanse-weixian);
  color: var(--yanse-weixian);
}

.anniu--wei-shi {
  border-color: color-mix(in srgb, var(--yanse-weixian) 55%, transparent);
  background: color-mix(in srgb, var(--yanse-weixian) 10%, transparent);
}

.anniu--mo {
  border-color: var(--tz-xian);
  color: var(--tz-wen-er);
}

.anniu--mo:hover {
  border-color: var(--wenben-ciuse);
  color: var(--wenben-zhuse);
}

.anniu:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rukou-qu {
  border-top: var(--tz-xian-hou) solid var(--tz-jin);
}

.rukou-tou {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
}

.rukou-shuo {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  color: var(--tz-wen-er);
}

.rukou-cao {
  display: flex;
  align-items: stretch;
  gap: var(--jiange-xiao);
  flex-wrap: wrap;
}

.anniu-kaiShi {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-12);
  flex: 1 1 calc(var(--jiange-da) * 10);
  padding: var(--jiange-12) var(--jiange-zhong);
  border: var(--tz-xian-kuan) solid var(--tz-jin-xian);
  border-radius: var(--yuanjiao-zhong);
  background: var(--tz-jin-ruo);
  color: var(--tz-jin);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.anniu-kaiShi:hover:not(:disabled) {
  border-color: var(--tz-jin);
  background: color-mix(in srgb, var(--tz-jin) 20%, transparent);
}

.anniu-kaiShi:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.anniu-jiantou {
  font-size: var(--ziti-da);
  line-height: 1;
  transition: transform var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu);
}

.anniu-kaiShi:hover:not(:disabled) .anniu-jiantou {
  transform: translateX(var(--jiange-2));
}

.anniu-paihang {
  flex: none;
  padding: var(--jiange-12) var(--jiange-zhong);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-zhong);
  background: transparent;
  color: var(--tz-wen-er);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.anniu-paihang:hover {
  border-color: var(--tz-jin-xian);
  background: var(--tz-jin-ruo);
  color: var(--tz-jin);
}

.rukou-tishi {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.6;
  color: var(--tz-wen-er);
}

.rukou-tishi--cuo {
  color: var(--yanse-weixian);
}

.zubie-biao {
  display: flex;
  flex-direction: column;
}

.zubie-tou,
.zubie-hang,
.zubie-zhanwei {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr) minmax(0, 1.15fr) minmax(0, 0.95fr) minmax(0, 0.7fr);
  align-items: center;
  gap: var(--jiange-xiao);
}

.zubie-tou {
  padding: 0 var(--jiange-xiao) var(--jiange-xiao);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-san);
}

.zubie-tou span:last-child {
  text-align: right;
}

.zubie-hang {
  padding: var(--jiange-12) var(--jiange-xiao);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
}

.zubie-hang:last-child {
  border-bottom: 0;
}

.zubie-ming {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
  font-size: var(--ziti-zhong);
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

.zubie-xinxi {
  display: contents;
}

.zubie-duanwei {
  grid-column: 2;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  color: var(--tz-jin);
}

.zubie-zhanji {
  grid-column: 3;
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-er);
  white-space: nowrap;
}

.zubie-paiming {
  grid-column: 4;
  font-size: var(--ziti-xiao);
  font-variant-numeric: tabular-nums;
  color: var(--wenben-zhuse);
  white-space: nowrap;
}

.zubie-jifen {
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

.zubie-kong {
  grid-column: 2 / -1;
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-er);
}

.zubie-zhanwei {
  padding: var(--jiange-12) var(--jiange-xiao);
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
}

.zubie-zhanwei:last-child {
  border-bottom: 0;
}

.zhanwei-kuai {
  display: block;
  height: calc(var(--ziti-zhong) * 0.95);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-xian-ruo);
}

.zhanwei-kuai--ming {
  width: 72%;
}

.zhanwei-kuai--duan {
  width: 56%;
}

.zhanwei-kuai--ji {
  width: 64%;
}

.zhanwei-kuai--pai {
  width: 46%;
}

.zhanwei-kuai--fen {
  width: 52%;
  justify-self: end;
}

.zhaiyao-qu {
  gap: var(--jiange-12);
}

.zu-qie {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jiange-4);
}

.zu-anniu {
  padding: var(--jiange-6) var(--jiange-xiao);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--tz-wen-er);
  font-size: var(--ziti-xiao);
  font-weight: 600;
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.zu-anniu:hover {
  border-color: var(--tz-jin-xian);
  color: var(--wenben-zhuse);
}

.zu-anniu[aria-pressed='true'] {
  border-color: var(--tz-jin-xian);
  background: var(--tz-jin-ruo);
  color: var(--tz-jin);
}

.zhaiyao-wo {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-san);
}

.zhaiyao-nei {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
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
  grid-template-columns: calc(var(--jiange-da) + var(--jiange-6)) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-10) 0;
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
}

.zhaiyao-hang:last-child {
  border-bottom: 0;
}

.zhaiyao-paiming {
  font-size: var(--ziti-xiao);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--tz-wen-san);
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
  font-size: var(--ziti-zhong);
  font-weight: 600;
}

.zhaiyao-duan {
  font-size: var(--ziti-xiao);
  color: var(--tz-wen-san);
}

.zhaiyao-jifen {
  font-size: var(--ziti-zhong);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.zhaiyao-kong {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  color: var(--tz-wen-er);
}

.zhaiyao-kong--fu {
  color: var(--tz-wen-san);
}

.zhaiyao-chongshi {
  align-self: flex-start;
  padding: var(--jiange-6) var(--jiange-12);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  font-weight: 600;
}

.zhaiyao-chongshi:hover {
  border-color: var(--tz-jin-xian);
  color: var(--tz-jin);
}

.zhaiyao-zhanwei {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-10) 0;
  border-bottom: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-xiao);
  width: 100%;
  padding: var(--jiange-10) 0 0;
  border: 0;
  border-top: var(--tz-xian-kuan) solid var(--tz-xian-ruo);
  background: transparent;
  color: var(--tz-wen-er);
  font-size: var(--ziti-xiao);
  font-weight: 600;
  text-align: left;
  transition: color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.zhaiyao-quanbu:hover {
  color: var(--tz-jin);
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
  padding: var(--jiange-da);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--zhezhao-beijing);
  backdrop-filter: var(--boli-mohu);
  -webkit-backdrop-filter: var(--boli-mohu);
}

.xingbie-tanchuang {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  width: 100%;
  max-width: calc(var(--jiange-da) * 22);
  max-height: calc(100dvh - var(--jiange-da) * 2);
  overflow-y: auto;
  padding: calc(var(--jiange-da) + var(--jiange-4)) var(--jiange-zhong) var(--jiange-zhong);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-da);
  background: var(--beijing-kaopian);
}

.tanchuang-tou {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-zhong);
}

.tanchuang-biaoti {
  margin: 0;
  font-size: calc(var(--ziti-da) * 1.25);
  font-weight: 700;
  line-height: 1.3;
}

.tanchuang-guanbi {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: calc(var(--jiange-da) + var(--jiange-xiao));
  height: calc(var(--jiange-da) + var(--jiange-xiao));
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: 50%;
  background: transparent;
  color: var(--wenben-ciuse);
  font-size: var(--ziti-da);
  line-height: 1;
  transition:
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.tanchuang-guanbi:hover:not(:disabled) {
  border-color: var(--tz-jin-xian);
  color: var(--wenben-zhuse);
}

.tanchuang-guanbi:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tanchuang-shuo {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  color: var(--tz-wen-er);
}

.xingbie-hang {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jiange-zhong);
}

.xingbie-zu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.xingbie-zu-biaoti {
  margin: 0;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  color: var(--tz-wen-san);
}

.xingbie-wangge {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jiange-xiao);
}

.xingbie-ka-pian {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-6);
  padding: var(--jiange-12) var(--jiange-xiao);
  border: var(--tz-xian-kuan) solid var(--tz-xian);
  border-radius: var(--yuanjiao-zhong);
  background: transparent;
  color: var(--wenben-zhuse);
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.xingbie-fuhao {
  font-size: calc(var(--ziti-da) * 1.4);
  line-height: 1;
}

.xingbie-ka-pian[data-xingbie='nan'] .xingbie-fuhao {
  color: var(--xingbie-nan-1);
}

.xingbie-ka-pian[data-xingbie='nv'] .xingbie-fuhao {
  color: var(--xingbie-nv-1);
}

.xingbie-ka-pian[aria-checked='true'] .xingbie-fuhao {
  color: currentColor;
}

.xingbie-ming {
  font-size: var(--ziti-zhong);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-indent: 0.12em;
}

.xingbie-ka-pian[data-xingbie='nan']:hover:not(:disabled):not([aria-checked='true']) {
  border-color: var(--xingbie-nan-1);
}

.xingbie-ka-pian[data-xingbie='nv']:hover:not(:disabled):not([aria-checked='true']) {
  border-color: var(--xingbie-nv-1);
}

.xingbie-ka-pian:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.xingbie-tishi {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.6;
  color: var(--tz-wen-er);
}

.tanchuang-caozuo {
  display: flex;
  justify-content: flex-end;
  gap: var(--jiange-xiao);
}

@media (max-width: 1023px) {
  .zhuti {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .tiaozhan-yemian {
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

  .qu {
    padding: calc(var(--jiange-12) + var(--jiange-4)) var(--jiange-12);
  }

  .zhuti,
  .zhuti-zhu,
  .zhuti-ce {
    gap: var(--jiange-zhong);
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

  .duiju-cao {
    width: 100%;
  }

  .duiju-cao .anniu {
    flex: 1 1 auto;
  }

  .rukou-cao {
    flex-direction: column;
  }

  .anniu-kaiShi,
  .anniu-paihang {
    flex: none;
    width: 100%;
  }

  .zubie-tou {
    display: none;
  }

  .zubie-hang {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'ming jifen'
      'xinxi xinxi';
    row-gap: var(--jiange-6);
    padding: var(--jiange-12) 0;
  }

  .zubie-ming {
    grid-area: ming;
  }

  .zubie-xinxi {
    grid-area: xinxi;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--jiange-xiao);
  }

  .zubie-jifen {
    grid-area: jifen;
  }

  .zubie-kong {
    grid-area: xinxi;
  }

  .zubie-zhanwei {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .xingbie-hang {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--jiange-12);
  }

  .xingbie-tanchuang {
    padding: calc(var(--jiange-da) + var(--jiange-4)) var(--jiange-12) var(--jiange-12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .anniu,
  .anniu-kaiShi,
  .anniu-paihang,
  .anniu-jiantou,
  .zu-anniu,
  .tanchuang-guanbi,
  .xingbie-ka-pian,
  .zhaiyao-quanbu {
    transition: none;
  }

  .anniu-kaiShi:hover:not(:disabled) .anniu-jiantou {
    transform: none;
  }
}
</style>
