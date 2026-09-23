<template>
  <div class="chushengriqi" role="group" :aria-label="zuHeMing" @click="chuLiDianJi">
    <template v-for="(duan, xu) in DUAN_QING_DAN" :key="duan.ming">
      <input
        :id="duanId(duan)"
        :ref="(yuan: unknown) => dengJiDuanYinYong(duan.ming, yuan)"
        class="duan-shuru"
        :class="'duan-shuru--' + duan.ming"
        type="text"
        role="spinbutton"
        inputmode="numeric"
        autocomplete="off"
        :maxlength="duan.weiShu"
        :placeholder="duan.geShi"
        :value="xianShiZhi(duan.ming)"
        :aria-label="duan.geShi"
        aria-required="true"
        :aria-invalid="shiFouBaoChu"
        :aria-valuenow="ariaZhiXianZai(duan.ming)"
        :aria-valuemin="duanQuJian(duan.ming).xia"
        :aria-valuemax="duanQuJian(duan.ming).shang"
        :aria-valuetext="ariaZhiWenBen(duan.ming)"
        @focus="chuLiJuJiao($event)"
        @input="chuLiShuRu(duan.ming, $event)"
        @blur="chuLiShiJiao(duan.ming)"
        @keydown="chuLiAnJian(duan.ming, $event)"
      />
      <span v-if="xu < DUAN_QING_DAN.length - 1" class="fenge" aria-hidden="true">{{ FENGEFU }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/translations'

/**
 * FP-14（需求 #13）：自绘出生日期选择器，替换原生 `input[type=date]`。
 * 原生控件的分段占位（"yyyy/mm/日"）由 UA 决定、页面代码不可改写，故整控件自绘：
 * 显示口径固定为 GB/T 7408-2005 扩展表示法 `YYYY-MM-DD`（零填充），对外契约仍是同一个字符串。
 * 校验真源（真实日期 / min / max / 周岁）不在本组件内复制，越界只夹紧不产出非法值，
 * 剩下的必填与未满 18 拦截仍由 views/登录内容.vue 的 jiSuanZhouSui 判定与既有翻译键报错。
 */

type DuanMing = 'nian' | 'yue' | 'ri'

interface DuanDingYi {
  ming: DuanMing
  idHouZhui: string
  weiShu: number
  geShi: string
}

const DUAN_QING_DAN: DuanDingYi[] = [
  { ming: 'nian', idHouZhui: '', weiShu: 4, geShi: 'YYYY' },
  { ming: 'yue', idHouZhui: '-yue', weiShu: 2, geShi: 'MM' },
  { ming: 'ri', idHouZhui: '-ri', weiShu: 2, geShi: 'DD' },
]

const YUE_SHANG_XIAN = 12
const RI_SHANG_XIAN = 31
const FENGEFU = '-'

interface RiQiSan {
  nian: number
  yue: number
  ri: number
}

interface DuanZhuangTai {
  nian: number | null
  yue: number | null
  ri: number | null
}

interface ShuRuZhuangTai {
  nian: string
  yue: string
  ri: string
}

const props = defineProps<{
  modelValue: string
  idQianZhui: string
  zuiXiao: string
  zuiDa: string
}>()

const emit = defineEmits<{ 'update:modelValue': [zhi: string] }>()

function kongYinYong(): DuanZhuangTai {
  return { nian: null, yue: null, ri: null }
}

function buChang(shu: number, weiShu: number): string {
  return String(shu).padStart(weiShu, '0')
}

function jieXiRiQi(qie: string): RiQiSan | null {
  const piPei = /^(\d{4})-(\d{2})-(\d{2})$/.exec(qie)
  if (!piPei) return null
  const nian = Number(piPei[1])
  const yue = Number(piPei[2])
  const ri = Number(piPei[3])
  const riQi = new Date(nian, yue - 1, ri)
  if (riQi.getFullYear() !== nian || riQi.getMonth() !== yue - 1 || riQi.getDate() !== ri) return null
  return { nian, yue, ri }
}

function riQiJian(riQi: RiQiSan): number {
  return riQi.nian * 10000 + riQi.yue * 100 + riQi.ri
}

function yueTianShu(nian: number, yue: number): number {
  return new Date(nian, yue, 0).getDate()
}

function qieDaoSan(riQi: RiQiSan): DuanZhuangTai {
  return { nian: riQi.nian, yue: riQi.yue, ri: riQi.ri }
}

const chuShi = jieXiRiQi(props.modelValue)
const yiQueRen = ref<DuanZhuangTai>(chuShi ? qieDaoSan(chuShi) : kongYinYong())
const zhengZaiShuRu = ref<ShuRuZhuangTai>({ nian: '', yue: '', ri: '' })
const yiChuLi = ref(false)

const duanChaoBiao: Record<DuanMing, DuanDingYi> = {
  nian: DUAN_QING_DAN[0],
  yue: DUAN_QING_DAN[1],
  ri: DUAN_QING_DAN[2],
}

const zuHeMing = computed(() => huoQuFanYi('ui', 'chuShengRiQi'))

const zuHeZhi = computed(() => {
  const { nian, yue, ri } = yiQueRen.value
  if (nian === null || yue === null || ri === null) return ''
  return [
    buChang(nian, duanChaoBiao.nian.weiShu),
    buChang(yue, duanChaoBiao.yue.weiShu),
    buChang(ri, duanChaoBiao.ri.weiShu),
  ].join(FENGEFU)
})

const keShiFa = computed(() => {
  const riQi = jieXiRiQi(zuHeZhi.value)
  if (!riQi) return false
  const xiao = jieXiRiQi(props.zuiXiao)
  const da = jieXiRiQi(props.zuiDa)
  if (xiao && riQiJian(riQi) < riQiJian(xiao)) return false
  if (da && riQiJian(riQi) > riQiJian(da)) return false
  return true
})

const shiFouBaoChu = computed(() => (!yiChuLi.value || keShiFa.value ? 'false' : 'true'))

function duanId(duan: DuanDingYi): string {
  return `${props.idQianZhui}${duan.idHouZhui}`
}

function xianShiZhi(ming: DuanMing): string {
  const shuRu = zhengZaiShuRu.value[ming]
  if (shuRu !== '') return shuRu
  const queRen = yiQueRen.value[ming]
  return queRen === null ? '' : buChang(queRen, duanChaoBiao[ming].weiShu)
}

function duanQuJian(ming: DuanMing): { xia: number; shang: number } {
  const xiao = jieXiRiQi(props.zuiXiao)
  const da = jieXiRiQi(props.zuiDa)
  const nian = yiQueRen.value.nian
  const yue = yiQueRen.value.yue
  if (ming === 'nian') {
    return { xia: xiao ? xiao.nian : 1, shang: da ? da.nian : 9999 }
  }
  if (ming === 'yue') {
    const xia = xiao && nian === xiao.nian ? xiao.yue : 1
    const shang = da && nian === da.nian ? da.yue : YUE_SHANG_XIAN
    return { xia, shang }
  }
  const xia = xiao && nian === xiao.nian && yue === xiao.yue ? xiao.ri : 1
  const benYue = nian !== null && yue !== null ? yueTianShu(nian, yue) : RI_SHANG_XIAN
  const shang = da && nian === da.nian && yue === da.yue ? da.ri : benYue
  return { xia, shang }
}

function ariaZhiXianZai(ming: DuanMing): number | undefined {
  return yiQueRen.value[ming] ?? undefined
}

function ariaZhiWenBen(ming: DuanMing): string | undefined {
  const shu = yiQueRen.value[ming]
  return shu === null ? undefined : xianShiZhi(ming)
}

const duanYinYong: Partial<Record<DuanMing, HTMLInputElement>> = {}

function dengJiDuanYinYong(ming: DuanMing, yuan: unknown): void {
  if (yuan instanceof HTMLInputElement) duanYinYong[ming] = yuan
}

function xuanZhongDuan(ming: DuanMing): void {
  // 提交段值会重写 input.value 并把光标落到末尾，选择动作必须排在补丁之后，
  // 否则下一次按键是"追加"而不是"替换"（原生分段控件在整段选中态下输入）
  void nextTick().then(() => {
    const yinYong = duanYinYong[ming]
    if (!yinYong) return
    yinYong.focus()
    yinYong.select()
  })
}

function waiFa(): void {
  const zhi = zuHeZhi.value
  if (zhi !== props.modelValue) emit('update:modelValue', zhi)
}

function jiaoZheng(): void {
  const { nian, yue, ri } = yiQueRen.value
  if (nian === null || yue === null || ri === null) return
  const xiuZhengRi = Math.min(ri, yueTianShu(nian, yue))
  const xiao = jieXiRiQi(props.zuiXiao)
  const da = jieXiRiQi(props.zuiDa)
  const jian = riQiJian({ nian, yue, ri: xiuZhengRi })
  if (xiao && jian < riQiJian(xiao)) yiQueRen.value = qieDaoSan(xiao)
  else if (da && jian > riQiJian(da)) yiQueRen.value = qieDaoSan(da)
  else if (xiuZhengRi !== ri) yiQueRen.value.ri = xiuZhengRi
}

function tiJiaoDuan(ming: DuanMing, shu: number): void {
  const { xia, shang } = duanQuJian(ming)
  yiQueRen.value[ming] = Math.min(Math.max(shu, xia), shang)
  zhengZaiShuRu.value[ming] = ''
  jiaoZheng()
  waiFa()
}

function buJinDuan(muBiaoMing: DuanMing, pian: number, tingLiuMing?: DuanMing): void {
  const { xia, shang } = duanQuJian(muBiaoMing)
  const dangQian = yiQueRen.value[muBiaoMing]
  const xin =
    dangQian === null ? (pian > 0 ? xia : shang) : Math.min(Math.max(dangQian + pian, xia), shang)
  tiJiaoDuan(muBiaoMing, xin)
  xuanZhongDuan(tingLiuMing ?? muBiaoMing)
}

function yiDongJuJiao(ming: DuanMing, fangXiang: number, shiJian: KeyboardEvent): void {
  const xu = DUAN_QING_DAN.findIndex((duan) => duan.ming === ming)
  const muBiao = DUAN_QING_DAN[xu + fangXiang]
  if (!muBiao) return
  const yinYong = duanYinYong[ming]
  const wenBen = yinYong ? yinYong.value : ''
  const weiYu = fangXiang > 0 ? (yinYong?.selectionStart ?? 0) >= wenBen.length : (yinYong?.selectionEnd ?? 0) <= 0
  if (!weiYu) return
  shiJian.preventDefault()
  xuanZhongDuan(muBiao.ming)
}

function chuLiDianJi(shiJian: MouseEvent): void {
  if ((shiJian.target as HTMLElement).tagName === 'INPUT') return
  const kongDuan = DUAN_QING_DAN.find(
    (duan) => yiQueRen.value[duan.ming] === null && zhengZaiShuRu.value[duan.ming] === '',
  )
  xuanZhongDuan(kongDuan ? kongDuan.ming : 'nian')
}

function chuLiJuJiao(shiJian: FocusEvent): void {
  const yinYong = shiJian.target as HTMLInputElement
  if (yinYong.value !== '') yinYong.select()
}

function chuLiShuRu(ming: DuanMing, shiJian: Event): void {
  yiChuLi.value = true
  const yuanShi = (shiJian.target as HTMLInputElement).value
  const shuZi = yuanShi.replace(/\D/g, '').slice(-duanChaoBiao[ming].weiShu)
  zhengZaiShuRu.value[ming] = shuZi
  if (shuZi === '') {
    yiQueRen.value[ming] = null
    waiFa()
    return
  }
  if (shuZi.length === duanChaoBiao[ming].weiShu) tiJiaoDuan(ming, Number(shuZi))
}

function chuLiShiJiao(ming: DuanMing): void {
  const shuZi = zhengZaiShuRu.value[ming]
  if (shuZi === '') return
  tiJiaoDuan(ming, Number(shuZi))
}

function chuLiAnJian(ming: DuanMing, shiJian: KeyboardEvent): void {
  const luJing = {
    ArrowUp: () => buJinDuan(ming, 1),
    ArrowDown: () => buJinDuan(ming, -1),
    PageUp: () => buJinDuan('nian', 1, ming),
    PageDown: () => buJinDuan('nian', -1, ming),
    ArrowRight: () => yiDongJuJiao(ming, 1, shiJian),
    ArrowLeft: () => yiDongJuJiao(ming, -1, shiJian),
  }[shiJian.key]
  if (!luJing) return
  yiChuLi.value = true
  if (shiJian.key === 'ArrowRight' || shiJian.key === 'ArrowLeft') {
    luJing()
    return
  }
  shiJian.preventDefault()
  luJing()
}

watch(
  () => props.modelValue,
  (zhi) => {
    const riQi = jieXiRiQi(zhi)
    if (riQi && zuHeZhi.value === zhi) return
    yiQueRen.value = riQi ? qieDaoSan(riQi) : kongYinYong()
    zhengZaiShuRu.value = { nian: '', yue: '', ri: '' }
  },
)
</script>

<style scoped>
/* 外观一律吃既有令牌与继承值：本组件内不出现像素字面量，也不出现色值字面量。
   字段几何（width/padding/发丝线/字号）由宿主视图的 .fenlie-shuru 承担——它挂在组件根元素上，
   与其余字段共用同一套度量（FP-03c 静置边界、FP-04b 纵向间距的判据原点）。 */
.chushengriqi {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.duan-shuru {
  box-sizing: border-box;
  flex-shrink: 0;
  width: var(--rili-erwei-kuan);
  padding: 0;
  border: none;
  border-radius: 0;
  background-color: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  caret-color: inherit;
  -webkit-text-fill-color: inherit;
  text-align: center;
  cursor: text;
  appearance: none;
  -webkit-appearance: none;
}

.duan-shuru--nian {
  width: var(--rili-nian-kuan);
}

.duan-shuru::placeholder {
  color: inherit;
  opacity: 1;
}

.fenge {
  flex-shrink: 0;
}
</style>
