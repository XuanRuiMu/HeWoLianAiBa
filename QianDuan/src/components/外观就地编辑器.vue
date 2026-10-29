<template>
  <div ref="gen" class="jiu-di-bian-ji" @click.stop @dblclick.stop @keydown.stop>
    <div class="jiu-di-bian-ji-tou">
      <label class="jiu-di-bian-ji-biao-ti" :for="shuRuBiaoShi">{{ biaoTi }}</label>
      <span class="jiu-di-bian-ji-ji-shu" :class="{ 'jiu-di-bian-ji-ji-shu--chao': ziShuChao }">
        {{ ziShu }}/{{ zuiDaZiFu }}
      </span>
    </div>

    <div class="jiu-di-bian-ji-ming-cheng-wei">
      <ChangFangShuRuKuang
        ref="shuRuKuang"
        :标识="shuRuBiaoShi"
        :模型值="mingChengGaoGao"
        :最大长度="zuiDaZiFu"
        :禁用="caoZuoZhong"
        :占位文字="mingChengZhanWei"
        :错误提示文字="cuoWuWenAn"
        @geng-xin="gengXinMingCheng"
        @keydown="chuLiAnJian"
      />
    </div>

    <div class="jiu-di-bian-ji-yan-se">
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

    <div class="jiu-di-bian-ji-jiao">
      <button type="button" class="jiu-di-bian-ji-an-niu" :disabled="caoZuoZhong" @click="huanYuanMoRen">
        {{ huanYuanWenAn }}
      </button>
      <span class="jiu-di-bian-ji-zhan-wei" />
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_YAN_SE_XUAN_XIANG,
  shiKeYongQiPaoWenZiYanSe,
  shiKeYongWenZiYanSe,
} from '@/config/外观自定义'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'

const props = withDefaults(
  defineProps<{
    biaoTi: string
    mingCheng: string
    wenZiYanSe: string
    zuiDaZiFu: number
    leiBie: 'beiJing' | 'qiPao'
    cuoWuWenAn?: string
    caoZuoZhong?: boolean
    juJiaoXuHao?: number
  }>(),
  {
    cuoWuWenAn: '',
    caoZuoZhong: false,
    juJiaoXuHao: 0,
  },
)

const faChu = defineEmits<{
  (shiJian: 'tijiao', zhi: { mingCheng: string; wenZiYanSe: string }): void
  (shiJian: 'huan-yuan'): void
  (shiJian: 'qu-xiao'): void
  (shiJian: 'yu-lan', zhi: { mingCheng: string; wenZiYanSe: string }): void
}>()

const shuRuKuang = ref<InstanceType<typeof ChangFangShuRuKuang> | null>(null)
const gen = ref<HTMLElement | null>(null)
const mingChengGaoGao = ref(props.mingCheng)
const yanSeGaoGao = ref(props.wenZiYanSe.toUpperCase())
const benDiCuoWu = ref('')
const yiTiJiao = ref(false)
const shuRuBiaoShi = 'wai-guan-bian-ji-' + Math.random().toString(36).slice(2, 9)

const mingChengZhanWei = huoQuFanYi('sheZhi', 'waiGuanMingCheng')
const genSuiWenAn = huoQuFanYi('sheZhi', 'waiGuanYanSeGenSuiZhuti')
const huanYuanWenAn = huoQuFanYi('sheZhi', 'waiGuanHuanYuanMoRen')
const quXiaoWenAn = huoQuFanYi('sheZhi', 'waiGuanQuXiao')
const baoCunWenAn = huoQuFanYi('sheZhi', 'waiGuanBaoCun')
const baoCunZhongWenAn = huoQuFanYi('sheZhi', 'waiGuanBaoCunZhong')
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

function faYuLan(): void {
  faChu('yu-lan', { mingCheng: mingChengGaoGao.value, wenZiYanSe: yanSeGaoGao.value })
}

function gengXinMingCheng(zhi: string): void {
  mingChengGaoGao.value = zhi
  benDiCuoWu.value = ''
  faYuLan()
}

function xuanZeYanSe(yanSe: string): void {
  yanSeGaoGao.value = yanSe
  benDiCuoWu.value = ''
  faYuLan()
}

function genSuiZhuTi(): void {
  yanSeGaoGao.value = ''
  benDiCuoWu.value = ''
  faYuLan()
}

function chuLiYanSeShuRu(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  yanSeGaoGao.value = (muBiao?.value || '').toUpperCase()
  benDiCuoWu.value = ''
  faYuLan()
}

function tiJiao(): void {
  if (yiTiJiao.value || props.caoZuoZhong) return
  const mingCheng = mingChengGaoGao.value.trim()
  if (!mingCheng) {
    benDiCuoWu.value = huoQuFanYi('sheZhi', 'waiGuanMingChengWeiKong')
    shuRuKuang.value?.聚焦()
    return
  }
  if (Array.from(mingCheng).length > props.zuiDaZiFu) {
    benDiCuoWu.value = huoQuFanYi('sheZhi', 'waiGuanMingChengTaiChang').replace('{n}', String(props.zuiDaZiFu))
    shuRuKuang.value?.聚焦()
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
    void nextTick(() => shuRuKuang.value?.聚焦())
  },
)

function 聚焦并全选(): void {
  void nextTick(() => {
    shuRuKuang.value?.聚焦()
    shuRuKuang.value?.输入元素?.select()
  })
}

function 处理外部按下(shiJian: Event): void {
  const muBiao = shiJian.target
  if (!(muBiao instanceof Node)) return
  if (gen.value?.contains(muBiao)) return
  if (muBiao instanceof Element && muBiao.closest('[data-wai-guan-gai-ming]')) return
  faChu('qu-xiao')
}

watch(() => props.juJiaoXuHao, 聚焦并全选)

onMounted(() => {
  聚焦并全选()
  document.addEventListener('pointerdown', 处理外部按下, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', 处理外部按下, true)
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

.jiu-di-bian-ji-ming-cheng-wei {
  min-width: 0;
}

.jiu-di-bian-ji-yan-se {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
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

.jiu-di-bian-ji-jiao {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}

.jiu-di-bian-ji-zhan-wei {
  flex: 1 1 auto;
  min-width: 0;
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
