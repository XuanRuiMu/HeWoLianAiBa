<template>
  <div
    ref="rongQi"
    class="jiu-di-bian-ji"
    @click.stop
    @dblclick.stop
    @keydown.stop
    @focusout="chuLiShiJiao"
  >
    <div class="jiu-di-bian-ji-tou">
      <label class="jiu-di-bian-ji-biao-ti" :for="shuRuBiaoShi">{{ biaoTi }}</label>
      <span class="jiu-di-bian-ji-ji-shu" :class="{ 'jiu-di-bian-ji-ji-shu--chao': ziShuChao }">
        {{ ziShu }}/{{ zuiDaZiFu }}
      </span>
    </div>

    <input
      :id="shuRuBiaoShi"
      ref="shuRuKuang"
      v-model="mingChengGaoGao"
      class="jiu-di-bian-ji-shu-ru"
      type="text"
      autocomplete="off"
      :maxlength="zuiDaZiFu"
      :disabled="caoZuoZhong"
      :aria-invalid="Boolean(cuoWuWenAn)"
      :placeholder="mingChengZhanWei"
      @keydown="chuLiAnJian"
      @input="qingChuBenDiCuoWu"
    />

    <div class="jiu-di-bian-ji-yan-se">
      <span class="jiu-di-bian-ji-yan-se-biao-ti">{{ yanSeBiaoTi }}</span>
      <button
        type="button"
        class="jiu-di-bian-ji-sui-shi"
        :class="{ 'jiu-di-bian-ji-sui-shi--xuan': !yanSeGaoGao }"
        :disabled="caoZuoZhong"
        @click="genSuiZhuTi"
      >
        {{ genSuiWenAn }}
      </button>
      <button
        v-for="yanSe in keYongYanSe"
        :key="yanSe"
        type="button"
        class="jiu-di-bian-ji-se-kuai"
        :class="{ 'jiu-di-bian-ji-se-kuai--xuan': yanSeGaoGao === yanSe }"
        :style="{ background: yanSe }"
        :aria-label="yanSe"
        :aria-pressed="yanSeGaoGao === yanSe"
        :disabled="caoZuoZhong"
        @click="xuanZeYanSe(yanSe)"
      />
      <label class="jiu-di-bian-ji-zi-ding-yi-se" :class="{ 'jiu-di-bian-ji-zi-ding-yi-se--xuan': ziDingYiYanSeXuanZhong }">
        <input
          class="jiu-di-bian-ji-yan-se-shu-ru"
          type="color"
          :value="yanSeGaoGao || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE"
          :disabled="caoZuoZhong"
          :aria-label="ziDingYiYanSeBiaoTi"
          @input="chuLiYanSeShuRu"
        />
        <span aria-hidden="true">＋</span>
      </label>
    </div>

    <p v-if="cuoWuWenAn" class="jiu-di-bian-ji-cuo-wu" role="alert">{{ cuoWuWenAn }}</p>

    <div class="jiu-di-bian-ji-jiao">
      <button type="button" class="jiu-di-bian-ji-an-niu" :disabled="caoZuoZhong" @click="huanYuanMoRen">
        {{ huanYuanWenAn }}
      </button>
      <span class="jiu-di-bian-ji-ti-shi">{{ huiCheTiShi }}</span>
      <button type="button" class="jiu-di-bian-ji-an-niu" :disabled="caoZuoZhong" @click="quXiaoBianJi">
        {{ quXiaoWenAn }}
      </button>
      <button
        type="button"
        class="jiu-di-bian-ji-an-niu jiu-di-bian-ji-an-niu--zhu"
        :disabled="caoZuoZhong"
        @click="tiJiao"
      >
        {{ caoZuoZhong ? baoCunZhongWenAn : baoCunWenAn }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_YAN_SE_XUAN_XIANG,
  shiKeYongQiPaoWenZiYanSe,
  shiKeYongWenZiYanSe,
} from '@/config/外观自定义'

const props = withDefaults(
  defineProps<{
    biaoTi: string
    mingCheng: string
    wenZiYanSe: string
    zuiDaZiFu: number
    leiBie: 'beiJing' | 'qiPao'
    cuoWuWenAn?: string
    caoZuoZhong?: boolean
  }>(),
  {
    cuoWuWenAn: '',
    caoZuoZhong: false,
  },
)

const faChu = defineEmits<{
  (shiJian: 'tijiao', zhi: { mingCheng: string; wenZiYanSe: string }): void
  (shiJian: 'huan-yuan'): void
  (shiJian: 'qu-xiao'): void
}>()

const rongQi = ref<HTMLElement | null>(null)
const shuRuKuang = ref<HTMLInputElement | null>(null)
const mingChengGaoGao = ref(props.mingCheng)
const yanSeGaoGao = ref(props.wenZiYanSe.toUpperCase())
const benDiCuoWu = ref('')
const yiTiJiao = ref(false)
const shuRuBiaoShi = 'wai-guan-bian-ji-' + Math.random().toString(36).slice(2, 9)

const mingChengZhanWei = huoQuFanYi('sheZhi', 'waiGuanMingCheng')
const yanSeBiaoTi = huoQuFanYi('sheZhi', 'waiGuanWenZiYanSe')
const genSuiWenAn = huoQuFanYi('sheZhi', 'waiGuanYanSeGenSuiZhuti')
const huanYuanWenAn = huoQuFanYi('sheZhi', 'waiGuanHuanYuanMoRen')
const quXiaoWenAn = huoQuFanYi('sheZhi', 'waiGuanQuXiao')
const baoCunWenAn = huoQuFanYi('sheZhi', 'waiGuanBaoCun')
const baoCunZhongWenAn = huoQuFanYi('sheZhi', 'waiGuanBaoCunZhong')
const huiCheTiShi = huoQuFanYi('sheZhi', 'waiGuanHuiCheBaoCun')
const ziDingYiYanSeBiaoTi = huoQuFanYi('sheZhi', 'waiGuanWenZiYanSe')

const ziShu = computed(() => Array.from(mingChengGaoGao.value.trim()).length)
const ziShuChao = computed(() => ziShu.value > props.zuiDaZiFu)
const keYongYanSe = computed(() =>
  WAI_GUAN_YAN_SE_XUAN_XIANG.filter((yanSe) =>
    props.leiBie === 'qiPao' ? shiKeYongQiPaoWenZiYanSe(yanSe) : shiKeYongWenZiYanSe(yanSe),
  ),
)
const ziDingYiYanSeXuanZhong = computed(
  () => Boolean(yanSeGaoGao.value) && !keYongYanSe.value.some((yanSe) => yanSe === yanSeGaoGao.value),
)
const cuoWuWenAn = computed(() => benDiCuoWu.value || props.cuoWuWenAn)

function qingChuBenDiCuoWu(): void {
  benDiCuoWu.value = ''
}

function xuanZeYanSe(yanSe: string): void {
  yanSeGaoGao.value = yanSe
  benDiCuoWu.value = ''
}

function genSuiZhuTi(): void {
  yanSeGaoGao.value = ''
  benDiCuoWu.value = ''
}

function chuLiYanSeShuRu(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  yanSeGaoGao.value = (muBiao?.value || '').toUpperCase()
  benDiCuoWu.value = ''
}

function tiJiao(): void {
  if (yiTiJiao.value || props.caoZuoZhong) return
  const mingCheng = mingChengGaoGao.value.trim()
  if (!mingCheng) {
    benDiCuoWu.value = huoQuFanYi('sheZhi', 'waiGuanMingChengWeiKong')
    shuRuKuang.value?.focus()
    return
  }
  if (Array.from(mingCheng).length > props.zuiDaZiFu) {
    benDiCuoWu.value = huoQuFanYi('sheZhi', 'waiGuanMingChengTaiChang').replace('{n}', String(props.zuiDaZiFu))
    shuRuKuang.value?.focus()
    return
  }
  if (yanSeGaoGao.value) {
    const heFa = props.leiBie === 'qiPao' ? shiKeYongQiPaoWenZiYanSe(yanSeGaoGao.value) : shiKeYongWenZiYanSe(yanSeGaoGao.value)
    if (!heFa) {
      benDiCuoWu.value = huoQuFanYi('sheZhi', 'waiGuanWenZiYanSeDuiBiDuBuZu')
      return
    }
  }
  benDiCuoWu.value = ''
  yiTiJiao.value = true
  faChu('tijiao', { mingCheng, wenZiYanSe: yanSeGaoGao.value })
}

function chuLiShiJiao(shiJian: FocusEvent): void {
  const xiaYiGe = shiJian.relatedTarget as Node | null
  if (xiaYiGe && rongQi.value?.contains(xiaYiGe)) return
  tiJiao()
}

function chuLiAnJian(shiJian: KeyboardEvent): void {
  if (shiJian.isComposing) return
  if (shiJian.key === 'Enter') {
    shiJian.preventDefault()
    tiJiao()
    return
  }
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    yiTiJiao.value = true
    faChu('qu-xiao')
  }
}

function huanYuanMoRen(): void {
  yiTiJiao.value = true
  faChu('huan-yuan')
}

function quXiaoBianJi(): void {
  yiTiJiao.value = true
  faChu('qu-xiao')
}

watch(
  () => props.cuoWuWenAn,
  (zhi) => {
    if (!zhi) return
    yiTiJiao.value = false
    void nextTick(() => shuRuKuang.value?.focus())
  },
)

onMounted(() => {
  void nextTick(() => {
    shuRuKuang.value?.focus()
    shuRuKuang.value?.select()
  })
})
</script>

<style scoped>
.jiu-di-bian-ji {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  padding: var(--jiange-12);
  border: 1.5px solid var(--tanchuang-biankuang);
  border-radius: var(--yuanjiao-zhong);
  background: var(--tanchuang-beijing);
  box-shadow: var(--tanchuang-yinying);
  color: var(--wenben-zhuse);
}

.jiu-di-bian-ji-tou {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--jiange-xiao);
}

.jiu-di-bian-ji-biao-ti {
  font-size: var(--ziti-zhong);
  font-weight: 600;
}

.jiu-di-bian-ji-ji-shu {
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}

.jiu-di-bian-ji-ji-shu--chao {
  color: var(--cuowu-yanse);
}

.jiu-di-bian-ji-shu-ru {
  width: 100%;
  min-height: var(--wai-guan-re-ku);
  padding: 0 var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
  font-family: inherit;
  font-size: var(--ziti-zhong);
  letter-spacing: 0.02em;
}

.jiu-di-bian-ji-shu-ru::placeholder {
  color: var(--wenben-ciuse);
}

.jiu-di-bian-ji-shu-ru:focus {
  border-color: var(--zhuse);
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.jiu-di-bian-ji-shu-ru[aria-invalid='true'] {
  border-color: var(--cuowu-yanse);
}

.jiu-di-bian-ji-yan-se {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}

.jiu-di-bian-ji-yan-se-biao-ti {
  flex: none;
  margin-right: var(--jiange-2);
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}

.jiu-di-bian-ji-sui-shi {
  min-height: var(--wai-guan-re-ku);
  padding: 0 var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-zhuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.jiu-di-bian-ji-sui-shi--xuan {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.jiu-di-bian-ji-se-kuai {
  flex: none;
  width: var(--wai-guan-re-ku);
  height: var(--wai-guan-re-ku);
  padding: 0;
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--tanchuang-beijing) inset;
  cursor: pointer;
}

.jiu-di-bian-ji-se-kuai--xuan {
  border-color: var(--zhuse);
  box-shadow:
    0 0 0 2px var(--tanchuang-beijing),
    0 0 0 4px var(--zhuse);
}

.jiu-di-bian-ji-sui-shi:focus-visible,
.jiu-di-bian-ji-se-kuai:focus-visible,
.jiu-di-bian-ji-zi-ding-yi-se:focus-within {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.jiu-di-bian-ji-zi-ding-yi-se {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--wai-guan-re-ku);
  height: var(--wai-guan-re-ku);
  border: 1.5px dashed var(--biankuang-yanse);
  border-radius: 50%;
  background: var(--beijing-ciuse);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-zhong);
  cursor: pointer;
}

.jiu-di-bian-ji-zi-ding-yi-se--xuan {
  border-style: solid;
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.jiu-di-bian-ji-yan-se-shu-ru {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.jiu-di-bian-ji-cuo-wu {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.5;
  color: var(--cuowu-yanse);
}

.jiu-di-bian-ji-jiao {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}

.jiu-di-bian-ji-ti-shi {
  flex: 1 1 auto;
  min-width: 140px;
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}

.jiu-di-bian-ji-an-niu {
  min-height: var(--wai-guan-re-ku);
  padding: 0 var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-zhuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.jiu-di-bian-ji-an-niu:hover:not(:disabled) {
  background: var(--tanchuang-fanhui-beijing);
}

.jiu-di-bian-ji-an-niu--zhu {
  border-color: var(--zhuse);
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
}

.jiu-di-bian-ji-an-niu--zhu:hover:not(:disabled) {
  background: var(--zhuse-shen);
}

.jiu-di-bian-ji-an-niu:disabled,
.jiu-di-bian-ji-sui-shi:disabled,
.jiu-di-bian-ji-se-kuai:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
