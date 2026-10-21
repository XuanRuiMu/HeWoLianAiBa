<template>
  <div class="tiaozhan-yemian">
    <header class="yemian-tou">
      <div class="tou-zhu">
        <h1 class="yemian-biaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianBiaoTi') }}</h1>
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
            <p v-if="!qianTaiCuoWu && canSaiShu === 0" class="zubie-kong-ti">
              {{ huoQuFanYi('tiaoZhan', 'zubieKongTiShi') }}
            </p>
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

        <section class="rukou-qu">
          <div class="rukou-tou">
            <h2 class="rukou-biaoti">{{ huoQuFanYi('tiaoZhan', 'kaiShiXinDuiJu') }}</h2>
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
              {{ huoQuFanYi('tiaoZhan', 'kaiShiTiaoZhan') }}
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
          <p v-if="!shuJuZaiZai && !qianTaiCuoWu" class="zhaiyao-wo">{{ bangDanWo }}</p>
          <div class="zhaiyao-nei-rong" :data-qie-huan="bangDanQieHuanZhong ? 'true' : 'false'">
            <Transition name="zhaiyao-dan-ru">
              <div v-show="bangDanShouCiJiaZai" class="zhaiyao-nei zhaiyao-nei--die" role="status">
                <span class="ping-mu-wai">{{ huoQuFanYi('tiaoZhan', 'jiaZaiZhong') }}</span>
                <div v-for="序 in 3" :key="序" class="zhaiyao-zhanwei" aria-hidden="true">
                  <span class="zhanwei-kuai zhanwei-kuai--pai" />
                  <span class="zhanwei-kuai zhanwei-kuai--ming" />
                  <span class="zhanwei-kuai zhanwei-kuai--fen" />
                </div>
              </div>
            </Transition>
            <Transition name="zhaiyao-dan-ru">
              <div v-show="bangDanCuoWu" class="zhaiyao-nei zhaiyao-nei--die">
                <p class="zhaiyao-kong">{{ bangDanCuoWu?.lianAiWenAn }}</p>
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
                <p class="zhaiyao-kong">{{ huoQuFanYi('tiaoZhan', 'zanWuPaiHang') }}</p>
                <p class="zhaiyao-kong zhaiyao-kong--fu">
                  {{ huoQuFanYi('tiaoZhan', 'bangDanKongFu') }}
                </p>
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
        <p class="tanchuang-shuo">{{ huoQuFanYi('tiaoZhan', 'suiJiTishi') }}</p>
        <ZhaXingTiShi :zha-xing-gai-lv="zhaXingGaiLv" />
        <div class="xingbie-hang">
          <div class="xingbie-zu" :data-dui="对象配色档">
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
          <div class="xingbie-zu" :data-dui="对象配色档">
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
import { 解析性别, 用户形态, type 性别二档, type 性别选择形态 } from '@/utils/性别'
import { 使用默认性别卡配色 } from '@/composables/use性别框体配色'
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
const 对象深边框色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-shen-biankuang)',
  nv: 'var(--xingbie-nv-shen-biankuang)',
}
const { 色档: 自身色档, 样式: 默认卡样式 } = 使用默认性别卡配色({
  自身性别: () => woDeXingBie.value,
  默认性别: () => 默认XingBie.value,
})
const 对象配色档 = computed<性别二档>(
  () => 解析性别(duiXiangXingBie.value) ?? 解析性别(默认DuiXiangXingBie.value) ?? 自身色档.value,
)
const 选中样式 = computed<CSSProperties>(() => ({
  backgroundColor: 默认卡样式.value.backgroundColor,
  borderColor: 对象深边框色[对象配色档.value],
  color: 默认卡样式.value.color,
}))
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
  bangDanLieBiao.value = jieGuo.slice(0, 3)
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

.tou-tongji {
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-da);
  margin: 0;
}

.tongji-xiang {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  text-align: right;
}

.tongji-xiang dt {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
}

.tongji-xiang dd {
  margin: 0;
  font-size: var(--tz-zi-zhong);
  font-weight: 600;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.tongji-fenmu {
  font-size: var(--tz-zi-zheng);
  font-weight: 400;
  color: var(--tz-wen-ci);
}

.zhanwei-tiao {
  display: inline-block;
  width: calc(var(--jiange-da) * 2);
  height: var(--tz-zi-zhong);
  border-radius: var(--yuanjiao-xiao);
  background: var(--tz-gu);
}

.zhanwei-tiao--chang {
  width: calc(var(--jiange-da) * 3);
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

.rukou-shuo {
  margin: 0;
  max-width: 46ch;
  font-size: var(--tz-zi-zheng);
  line-height: 1.6;
  color: var(--tz-wen-ci);
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

.anniu-paihang {
  flex: none;
  min-height: var(--tz-re-ku);
  padding: 0 var(--jiange-zhong);
  border: 1px solid var(--tz-xian);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--tz-wen);
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  transition:
    border-color var(--tz-dong),
    color var(--tz-dong);
}

.anniu-paihang:hover:not(:disabled) {
  border-color: var(--tz-jin);
  color: var(--tz-jin);
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

.zubie-biao {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.zubie-tou,
.zubie-hang,
.zubie-zhanwei {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1.1fr) minmax(0, 0.8fr) auto;
  align-items: center;
  gap: var(--jiange-12);
}

.zubie-tou {
  padding: 0 0 var(--jiange-xiao);
  border-bottom: 1px solid var(--tz-xian);
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
}

.zubie-tou span:nth-child(4),
.zubie-tou span:nth-child(5) {
  text-align: right;
}

.zubie-hang {
  padding: var(--jiange-12) 0;
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.zubie-hang:last-child {
  border-bottom: 0;
}

.zubie-hang--kong .zubie-ming {
  color: var(--tz-wen-ci);
  font-weight: 400;
}

.zubie-kong-ti {
  margin: 0;
  padding: var(--jiange-12) 0 0;
  font-size: var(--tz-zi-zheng);
  line-height: 1.6;
  color: var(--tz-wen-ci);
}

.zubie-ming {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
  font-size: var(--tz-zi-zheng);
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

.zubie-duanwei,
.zubie-zhanji {
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  color: var(--tz-wen-ci);
  white-space: nowrap;
}

.zubie-zhanji {
  font-variant-numeric: tabular-nums;
}

.zubie-paiming {
  justify-self: end;
  font-size: var(--tz-zi-xiao);
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: var(--tz-wen-ci);
  white-space: nowrap;
}

.zubie-jifen {
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

.zubie-kong {
  grid-column: 2 / -1;
  font-size: var(--tz-zi-zheng);
  line-height: 1.5;
  color: var(--tz-wen-ci);
}

.zubie-zhanwei {
  padding: var(--jiange-12) 0;
  border-bottom: 1px solid var(--tz-xian-ruo);
}

.zubie-zhanwei:last-child {
  border-bottom: 0;
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
  width: 56%;
}

.zhanwei-kuai--ji {
  width: 64%;
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

.zhaiyao-kong {
  margin: 0;
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
  line-height: 1.5;
}

.zhaiyao-kong--fu {
  font-size: var(--tz-zi-xiao);
  font-weight: 400;
  line-height: 1.6;
  color: var(--tz-wen-ci);
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

.tanchuang-shuo {
  margin: 0;
  font-size: var(--tz-zi-zheng);
  line-height: 1.6;
  color: var(--tz-wen-ci);
}

.xingbie-tanchuang :deep(.ti-shi-nei-rong) {
  color: var(--tz-wen-ci);
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
  font-size: var(--tz-zi-xiao);
  font-weight: 600;
  line-height: 1.4;
  color: var(--tz-wen-ci);
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
  gap: var(--jiange-4);
  min-height: calc(var(--tz-re-ku) + var(--jiange-12));
  padding: var(--jiange-12) var(--jiange-xiao);
  border: 1px solid var(--tz-xian);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--tz-wen);
  transition:
    background-color var(--tz-ka-dong) ease-out,
    border-color var(--tz-ka-dong) ease-out,
    color var(--tz-ka-dong) ease-out,
    box-shadow var(--tz-ka-dong) ease-out,
    transform var(--tz-ka-dong) ease-out;
}

@media (hover: hover) {
  .xingbie-ka-pian:hover:not(:disabled) {
    transform: translateY(-2px);
  }
}

.xingbie-ka-pian[aria-checked='true'] {
  border-width: 2px;
  transform: translateY(-1px);
}

.xingbie-zu[data-dui='nan'] .xingbie-ka-pian[aria-checked='true'] {
  box-shadow: 0 0 0 1px var(--xingbie-nan-shen-biankuang);
}

.xingbie-zu[data-dui='nv'] .xingbie-ka-pian[aria-checked='true'] {
  box-shadow: 0 0 0 1px var(--xingbie-nv-shen-biankuang);
}

.xingbie-fuhao {
  font-size: var(--tz-zi-zhong);
  line-height: 1;
  color: var(--tz-wen-ci);
}

.xingbie-ka-pian[aria-checked='true'] .xingbie-fuhao {
  color: currentColor;
}

.xingbie-ming {
  font-size: var(--tz-zi-zheng);
  font-weight: 600;
}

.xingbie-ka-pian[data-xingbie='nan']:hover:not(:disabled):not([aria-checked='true']) {
  border-color: var(--xingbie-nan-1);
  box-shadow: 0 6px 18px -12px var(--xingbie-nan-xuan-guangyun);
}

.xingbie-ka-pian[data-xingbie='nv']:hover:not(:disabled):not([aria-checked='true']) {
  border-color: var(--xingbie-nv-1);
  box-shadow: 0 6px 18px -12px var(--xingbie-nv-xuan-guangyun);
}

.xingbie-ka-pian:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.xingbie-tishi {
  margin: 0;
  font-size: var(--tz-zi-xiao);
  line-height: 1.5;
  color: var(--tz-wen-ci);
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
  .tou-tongji {
    width: 100%;
    justify-content: flex-start;
  }

  .tongji-xiang {
    align-items: flex-start;
    text-align: left;
  }

  .zubie-tou {
    display: none;
  }

  .zubie-hang,
  .zubie-zhanwei {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'ming fen'
      'xinxi xinxi';
    gap: var(--jiange-12);
    row-gap: var(--jiange-4);
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

  .zubie-paiming {
    justify-self: start;
  }

  .zubie-jifen {
    grid-area: fen;
  }

  .zubie-kong {
    grid-area: xinxi;
  }

  .duiju-cao {
    width: 100%;
  }

  .xingbie-hang {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--jiange-12);
  }

  .xingbie-tanchuang {
    padding: var(--jiange-zhong);
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
  .anniu-paihang,
  .zu-anniu,
  .zu-zhishi,
  .tanchuang-guanbi,
  .xingbie-ka-pian,
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
