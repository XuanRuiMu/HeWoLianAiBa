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
        @paste="chuLiTieRu($event)"
      />
      <span v-if="xu < DUAN_QING_DAN.length - 1" class="fenge" aria-hidden="true">{{ FENGEFU }}</span>
    </template>
    <button
      :ref="dengJiDaKaiYinYong"
      type="button"
      class="rili-da-kai"
      :aria-label="fanYiDaKai"
      :aria-expanded="riLiZhanKai ? 'true' : 'false'"
      aria-haspopup="dialog"
      @click.stop="qieHuanRiLi"
    >
      <svg
        class="rili-da-kai-tu-biao"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="riLiZhanKai" class="rili-zhe-zhao" @click.self="guanBi">
        <div
          ref="tanchuangYuan"
          class="rili-tanchuang"
          role="dialog"
          aria-modal="true"
          :aria-label="fanYiXuanZe"
          @keydown="chuLiTanchuangAnJian"
        >
          <div class="rili-tou-bu">
            <button
              type="button"
              class="rili-anniu"
              :aria-label="fanYiShangYiNian"
              :disabled="!keYiShangYiNian"
              @click="yiDongNian(-1)"
            >
              <svg class="rili-jiantou" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M11 7l-5 5 5 5M18 7l-5 5 5 5" />
              </svg>
            </button>
            <button
              type="button"
              class="rili-anniu"
              :aria-label="fanYiShangYiYue"
              :disabled="!keYiShangYiYue"
              @click="yiDongYue(-1)"
            >
              <svg class="rili-jiantou" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <span :id="nianYueBiaoId" class="rili-nian-yue">{{ nianYueWenBen }}</span>
            <button
              type="button"
              class="rili-anniu"
              :aria-label="fanYiXiaYiYue"
              :disabled="!keYiXiaYiYue"
              @click="yiDongYue(1)"
            >
              <svg class="rili-jiantou" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              class="rili-anniu"
              :aria-label="fanYiXiaYiNian"
              :disabled="!keYiXiaYiNian"
              @click="yiDongNian(1)"
            >
              <svg class="rili-jiantou" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M13 7l5 5-5 5M6 7l5 5-5 5" />
              </svg>
            </button>
          </div>

          <div class="rili-ge" role="grid" :aria-labelledby="nianYueBiaoId">
            <div class="rili-zhou-tou-hang" role="row">
              <span
                v-for="(zhou, xu) in xingQiQingDan"
                :key="xu"
                class="rili-zhou-tou"
                role="columnheader"
                :aria-label="zhou.ming"
                >{{ zhou.jian }}</span
              >
            </div>
            <div v-for="(hang, xu) in zhouLie" :key="xu" class="rili-zhou-hang" role="row">
              <button
                v-for="ge in hang"
                :key="ge.douYin"
                type="button"
                role="gridcell"
                class="rili-ri"
                :class="{
                  'rili-ri--fu-wei': ge.fuWei,
                  'rili-ri--xuan-zhong': ge.xuanZhong,
                  'rili-ri--jin-ri': ge.jinRi,
                }"
                :tabindex="ge.jiaoDian ? 0 : -1"
                :aria-label="ge.ariaBiaoQian"
                :aria-current="ge.jinRi ? 'date' : undefined"
                :aria-selected="ge.xuanZhong"
                :aria-disabled="ge.keXuan ? undefined : 'true'"
                :data-jiao-dian="ge.jiaoDian ? 'true' : undefined"
                @click="xuanZhongRiQi(ge)"
              >
                {{ ge.ri }}
              </button>
            </div>
          </div>

          <div class="rili-jiao-bu">
            <button
              type="button"
              class="rili-jiao-bu-anniu"
              :aria-label="fanYiHuiDaoJinRi"
              :disabled="!keYiHuiJinRi"
              @click="huiDaoJinRi"
            >
              {{ fanYiJinRi }}
            </button>
            <button
              type="button"
              class="rili-jiao-bu-anniu rili-jiao-bu-anniu--zhu"
              :aria-label="fanYiWanCheng"
              @click="guanBi"
            >
              {{ fanYiWanCheng }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
 *
 * FP-A2：形态升级为「三段 + 日历浮层」双入口，两侧共用同一个 `yiQueRen` 与同一条外发通道，
 * 因此契约（`YYYY-MM-DD` 字符串、min/max 钳制、18 岁拦截归属）一个字都没动，新增的只是第二种录入姿势。
 * 浮层减动效归零：全组件零 transition / 零 animation / 零 @keyframes，开合与换月都是瞬时换面。
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
/** 日历固定 6 行 × 7 列：首行补齐到周一后仍能容下 31 天 + 前后各留白的月份，不会因切月改变浮层高度 */
const ZHOU_ZHANG_SHU = 7
const RI_ZHOU_ZHANG = 6
/** min/max 缺省时用这对兜底年（两位数年份会被 new Date 映射到 1900+，故不用 1/9999） */
const NIAN_ZUI_XIAO = 1000
const NIAN_ZUI_DA = 9999
const XING_QI_JIAN = ['xingQiYi', 'xingQiEr', 'xingQiSan', 'xingQiSi', 'xingQiWu', 'xingQiLiu', 'xingQiRi'] as const
const XING_QI_MING = [
  'xingQiYiMing',
  'xingQiErMing',
  'xingQiSanMing',
  'xingQiSiMing',
  'xingQiWuMing',
  'xingQiLiuMing',
  'xingQiRiMing',
] as const
/** 日格上的四个方向键 = 键盘光标的日偏移：左右 ±1 天，上下 ±1 周 */
const JIAO_DIAN_YI_ZOU: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -ZHOU_ZHANG_SHU,
  ArrowDown: ZHOU_ZHANG_SHU,
}

interface RiQiSan {
  nian: number
  yue: number
  ri: number
}

interface RiGe {
  nian: number
  yue: number
  ri: number
  fuWei: boolean
  keXuan: boolean
  jinRi: boolean
  xuanZhong: boolean
  jiaoDian: boolean
  douYin: string
  ariaBiaoQian: string
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

/** 月份线性化：yyyy-mm ↔ 整数，供浮层按月导航与范围钳制共用一套比较口径 */
function yueBianLiu(riQi: RiQiSan): number {
  return riQi.nian * 12 + (riQi.yue - 1)
}

function yueHuanYuan(jian: number): RiQiSan {
  return { nian: Math.floor(jian / 12), yue: (jian % 12) + 1, ri: 1 }
}

function qieDaoSan(riQi: RiQiSan): DuanZhuangTai {
  return { nian: riQi.nian, yue: riQi.yue, ri: riQi.ri }
}

function jinRiSan(): RiQiSan {
  const jin = new Date()
  return { nian: jin.getFullYear(), yue: jin.getMonth() + 1, ri: jin.getDate() }
}

function benDiJiao(riQi: RiQiSan, tianShu: number): RiQiSan {
  const ben = new Date(riQi.nian, riQi.yue - 1, riQi.ri + tianShu)
  return { nian: ben.getFullYear(), yue: ben.getMonth() + 1, ri: ben.getDate() }
}

const chuShi = jieXiRiQi(props.modelValue)
const yiQueRen = ref<DuanZhuangTai>(chuShi ? qieDaoSan(chuShi) : kongYinYong())
const zhengZaiShuRu = ref<ShuRuZhuangTai>({ nian: '', yue: '', ri: '' })
const yiChuLi = ref(false)
const weiHeFaTieRu = ref(false)
const jinRi = ref<RiQiSan>(jinRiSan())
const riLiZhanKai = ref(false)

const duanChaoBiao: Record<DuanMing, DuanDingYi> = {
  nian: DUAN_QING_DAN[0],
  yue: DUAN_QING_DAN[1],
  ri: DUAN_QING_DAN[2],
}

const fanWeiXia = computed<RiQiSan>(
  () => jieXiRiQi(props.zuiXiao) ?? { nian: NIAN_ZUI_XIAO, yue: 1, ri: 1 },
)
const fanWeiDa = computed<RiQiSan>(
  () => jieXiRiQi(props.zuiDa) ?? { nian: NIAN_ZUI_DA, yue: YUE_SHANG_XIAN, ri: 31 },
)

function shiFouKeXuan(riQi: RiQiSan): boolean {
  const jian = riQiJian(riQi)
  return jian >= riQiJian(fanWeiXia.value) && jian <= riQiJian(fanWeiDa.value)
}

function jiaZhenRuFanWei(riQi: RiQiSan): RiQiSan {
  const xiuZheng = { ...riQi, ri: Math.min(riQi.ri, yueTianShu(riQi.nian, riQi.yue)) }
  const jian = riQiJian(xiuZheng)
  if (jian < riQiJian(fanWeiXia.value)) return { ...fanWeiXia.value }
  if (jian > riQiJian(fanWeiDa.value)) return { ...fanWeiDa.value }
  return xiuZheng
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
  if (!shiFouKeXuan(riQi)) return false
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
  const xiao = fanWeiXia.value
  const da = fanWeiDa.value
  const nian = yiQueRen.value.nian
  const yue = yiQueRen.value.yue
  if (ming === 'nian') {
    return { xia: xiao.nian, shang: da.nian }
  }
  if (ming === 'yue') {
    const xia = nian === xiao.nian ? xiao.yue : 1
    const shang = nian === da.nian ? da.yue : YUE_SHANG_XIAN
    return { xia, shang }
  }
  const xia = nian === xiao.nian && yue === xiao.yue ? xiao.ri : 1
  const benYue = nian !== null && yue !== null ? yueTianShu(nian, yue) : RI_SHANG_XIAN
  const shang = nian === da.nian && yue === da.yue ? da.ri : benYue
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
  const jiaZhen = jiaZhenRuFanWei({ nian, yue, ri })
  if (riQiJian(jiaZhen) !== riQiJian({ nian, yue, ri })) yiQueRen.value = qieDaoSan(jiaZhen)
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
  weiHeFaTieRu.value = false
  const yuanShi = (shiJian.target as HTMLInputElement).value
  const shuZi = yuanShi.replace(/\D/g, '').slice(-duanChaoBiao[ming].weiShu)
  zhengZaiShuRu.value[ming] = shuZi
  if (shuZi === '') {
    yiQueRen.value[ming] = null
    waiFa()
    return
  }
  if (shuZi.length === duanChaoBiao[ming].weiShu) {
    tiJiaoDuan(ming, Number(shuZi))
    const xiaYi = ming === 'nian' ? 'yue' : ming === 'yue' ? 'ri' : null
    if (xiaYi) xuanZhongDuan(xiaYi)
  }
}

function chuLiTieRu(shiJian: ClipboardEvent): void {
  const wenBen = shiJian.clipboardData?.getData('text') ?? ''
  const shuZi = wenBen.replace(/\D/g, '')
  if (shuZi.length < 8) return
  shiJian.preventDefault()
  yiChuLi.value = true
  const nian = Number(shuZi.slice(0, 4))
  const yue = Number(shuZi.slice(4, 6))
  const ri = Number(shuZi.slice(6, 8))
  const zai = new Date(nian, yue - 1, ri)
  if (zai.getFullYear() === nian && zai.getMonth() === yue - 1 && zai.getDate() === ri) {
    weiHeFaTieRu.value = false
    yiQueRen.value = { nian, yue, ri }
    zhengZaiShuRu.value = { nian: '', yue: '', ri: '' }
    jiaoZheng()
    waiFa()
  } else {
    weiHeFaTieRu.value = true
    yiQueRen.value = kongYinYong()
    zhengZaiShuRu.value = { nian: shuZi.slice(0, 4), yue: shuZi.slice(4, 6), ri: shuZi.slice(6, 8) }
    waiFa()
  }
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

/* ── 日历浮层（FP-A2）：与三段共用 yiQueRen / waiFa()，故两侧永远同值 ── */

const fanYiDaKai = computed(() => huoQuFanYi('ui', 'riQiDaKai'))
const fanYiXuanZe = computed(() => huoQuFanYi('ui', 'riQiXuanZe'))
const fanYiShangYiNian = computed(() => huoQuFanYi('ui', 'riQiShangYiNian'))
const fanYiXiaYiNian = computed(() => huoQuFanYi('ui', 'riQiXiaYiNian'))
const fanYiShangYiYue = computed(() => huoQuFanYi('ui', 'riQiShangYiYue'))
const fanYiXiaYiYue = computed(() => huoQuFanYi('ui', 'riQiXiaYiYue'))
const fanYiJinRi = computed(() => huoQuFanYi('ui', 'riQiJinRi'))
const fanYiHuiDaoJinRi = computed(() => huoQuFanYi('ui', 'riQiHuiDaoJinRi'))
const fanYiWanCheng = computed(() => huoQuFanYi('ui', 'riQiWanCheng'))
const fanYiNian = computed(() => huoQuFanYi('ui', 'riQiNian'))
const fanYiYue = computed(() => huoQuFanYi('ui', 'riQiYue'))
const fanYiRi = computed(() => huoQuFanYi('ui', 'riQiRi'))

const xingQiQingDan = computed(() =>
  XING_QI_JIAN.map((jian, xu) => ({
    jian: huoQuFanYi('ui', jian),
    ming: huoQuFanYi('ui', XING_QI_MING[xu]),
  })),
)

const nianYueBiaoId = computed(() => `${props.idQianZhui}-rili-nianyue`)
const tanchuangYuan = ref<HTMLElement | null>(null)
let daKaiYinYong: HTMLButtonElement | null = null

function dengJiDaKaiYinYong(yuan: unknown): void {
  daKaiYinYong = yuan instanceof HTMLButtonElement ? yuan : null
}

const jiaoDianZhi = ref<RiQiSan>(jiaZhenRuFanWei(chuShi ?? jinRi.value))
const chaKanNian = ref(jiaoDianZhi.value.nian)
const chaKanYue = ref(jiaoDianZhi.value.yue)
const chaKanJian = computed(() => yueBianLiu({ nian: chaKanNian.value, yue: chaKanYue.value, ri: 1 }))
const xianDangXuanZhong = computed<RiQiSan | null>(() => {
  const { nian, yue, ri } = yiQueRen.value
  return nian === null || yue === null || ri === null ? null : { nian, yue, ri }
})

const nianYueWenBen = computed(
  () => `${chaKanNian.value}${fanYiNian.value}${chaKanYue.value}${fanYiYue.value}`,
)

const keYiShangYiYue = computed(() => chaKanJian.value > yueBianLiu(fanWeiXia.value))
const keYiXiaYiYue = computed(() => chaKanJian.value < yueBianLiu(fanWeiDa.value))
const keYiShangYiNian = computed(() => chaKanNian.value > fanWeiXia.value.nian)
const keYiXiaYiNian = computed(() => chaKanNian.value < fanWeiDa.value.nian)
const keYiHuiJinRi = computed(() => shiFouKeXuan(jinRi.value))

function riWenBen(riQi: RiQiSan): string {
  return `${riQi.nian}${fanYiNian.value}${riQi.yue}${fanYiYue.value}${riQi.ri}${fanYiRi.value}`
}

const zhouLie = computed<RiGe[][]>(() => {
  const yueYi = new Date(chaKanNian.value, chaKanYue.value - 1, 1)
  // getDay() 以周日为 0，日历以周一为周首：加 6 再取模把周日挪到本周末尾
  const zhouShou = (yueYi.getDay() + 6) % ZHOU_ZHANG_SHU
  const shouGe = new Date(chaKanNian.value, chaKanYue.value - 1, 1 - zhouShou)
  const jin = jinRi.value
  const xuan = xianDangXuanZhong.value
  const jiaoDian = jiaoDianZhi.value
  const hang: RiGe[][] = []
  for (let zhouXu = 0; zhouXu < RI_ZHOU_ZHANG; zhouXu++) {
    const lie: RiGe[] = []
    for (let lieXu = 0; lieXu < ZHOU_ZHANG_SHU; lieXu++) {
      const tian = new Date(
        shouGe.getFullYear(),
        shouGe.getMonth(),
        shouGe.getDate() + zhouXu * ZHOU_ZHANG_SHU + lieXu,
      )
      const ge: RiQiSan = {
        nian: tian.getFullYear(),
        yue: tian.getMonth() + 1,
        ri: tian.getDate(),
      }
      const shiJinRi = riQiJian(ge) === riQiJian(jin)
      const wenBen = riWenBen(ge)
      lie.push({
        ...ge,
        fuWei: ge.yue !== chaKanYue.value || ge.nian !== chaKanNian.value,
        keXuan: shiFouKeXuan(ge),
        jinRi: shiJinRi,
        xuanZhong: xuan !== null && riQiJian(ge) === riQiJian(xuan),
        jiaoDian: riQiJian(ge) === riQiJian(jiaoDian),
        douYin: wenBen,
        ariaBiaoQian: shiJinRi
          ? `${fanYiJinRi.value} ${wenBen}`
          : wenBen,
      })
    }
    hang.push(lie)
  }
  return hang
})

function sheZhiChaKan(jian: number): void {
  const yue = yueHuanYuan(jian)
  chaKanNian.value = yue.nian
  chaKanYue.value = yue.yue
}

function zhaoJiaoDianGe(): void {
  void nextTick().then(() => {
    tanchuangYuan.value
      ?.querySelector<HTMLButtonElement>('.rili-ri[data-jiao-dian="true"]')
      ?.focus()
  })
}

function jiaZhenYueJian(jian: number): number {
  return Math.min(Math.max(jian, yueBianLiu(fanWeiXia.value)), yueBianLiu(fanWeiDa.value))
}

function yiDongYue(pian: number): void {
  const xinJian = jiaZhenYueJian(chaKanJian.value + pian)
  sheZhiChaKan(xinJian)
  const yue = yueHuanYuan(xinJian)
  jiaoDianZhi.value = jiaZhenRuFanWei({
    nian: yue.nian,
    yue: yue.yue,
    ri: Math.min(jiaoDianZhi.value.ri, yueTianShu(yue.nian, yue.yue)),
  })
  zhaoJiaoDianGe()
}

function yiDongNian(pian: number): void {
  yiDongYue(pian * YUE_SHANG_XIAN)
}

function yiDongJiaoDianGe(tianShu: number): void {
  const xin = jiaZhenRuFanWei(benDiJiao(jiaoDianZhi.value, tianShu))
  jiaoDianZhi.value = xin
  sheZhiChaKan(yueBianLiu(xin))
  zhaoJiaoDianGe()
}

function daoBenYueBian(jie: 'kaishi' | 'jieshu'): void {
  const benYue = yueHuanYuan(chaKanJian.value)
  const tianShu = jie === 'kaishi' ? 1 - jiaoDianZhi.value.ri : yueTianShu(benYue.nian, benYue.yue) - jiaoDianZhi.value.ri
  yiDongJiaoDianGe(tianShu)
}

function huiDaoJinRi(): void {
  const jin = jiaZhenRuFanWei(jinRi.value)
  jiaoDianZhi.value = jin
  sheZhiChaKan(yueBianLiu(jin))
  zhaoJiaoDianGe()
}

function daKaiRiLi(): void {
  const chuShiRi = jiaZhenRuFanWei(xianDangXuanZhong.value ?? jinRi.value)
  jiaoDianZhi.value = chuShiRi
  sheZhiChaKan(yueBianLiu(chuShiRi))
  riLiZhanKai.value = true
  zhaoJiaoDianGe()
}

function guanBi(): void {
  riLiZhanKai.value = false
  void nextTick().then(() => daKaiYinYong?.focus())
}

function qieHuanRiLi(): void {
  if (riLiZhanKai.value) guanBi()
  else daKaiRiLi()
}

function xuanZhongRiQi(ge: RiGe): void {
  if (!ge.keXuan) return
  yiQueRen.value = qieDaoSan(ge)
  zhengZaiShuRu.value = { nian: '', yue: '', ri: '' }
  weiHeFaTieRu.value = false
  yiChuLi.value = true
  jiaoZheng()
  waiFa()
  guanBi()
}

function xianZhuanJiaoDian(shiJian: KeyboardEvent): void {
  const yuan = tanchuangYuan.value
  if (!yuan) return
  const keXuan = [...yuan.querySelectorAll<HTMLButtonElement>('button:not([disabled])')].filter(
    (anNiu) => anNiu.tabIndex !== -1,
  )
  if (keXuan.length === 0) return
  const xun = keXuan.indexOf(document.activeElement as HTMLButtonElement)
  const xin = shiJian.shiftKey
    ? xun <= 0
      ? keXuan.length - 1
      : xun - 1
    : xun < 0 || xun >= keXuan.length - 1
      ? 0
      : xun + 1
  shiJian.preventDefault()
  keXuan[xin].focus()
}

function chuLiTanchuangAnJian(shiJian: KeyboardEvent): void {
  const yuan = tanchuangYuan.value
  if (!yuan) return
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    guanBi()
    return
  }
  if (shiJian.key === 'Tab') {
    xianZhuanJiaoDian(shiJian)
    return
  }
  // 换日/换月/首末日的按键只在日格上生效：焦点停在年月导航钮或底部钮时，同一个方向键不该把焦点拽进网格
  if (!(shiJian.target as HTMLElement).classList.contains('rili-ri')) return
  const tianShu = JIAO_DIAN_YI_ZOU[shiJian.key]
  if (tianShu !== undefined) {
    shiJian.preventDefault()
    yiDongJiaoDianGe(tianShu)
    return
  }
  if (shiJian.key === 'Home' || shiJian.key === 'End') {
    shiJian.preventDefault()
    daoBenYueBian(shiJian.key === 'Home' ? 'kaishi' : 'jieshu')
    return
  }
  if (shiJian.key === 'PageUp' || shiJian.key === 'PageDown') {
    shiJian.preventDefault()
    const pian = shiJian.key === 'PageUp' ? -1 : 1
    if (shiJian.shiftKey) yiDongNian(pian)
    else yiDongYue(pian)
  }
}

watch(
  () => props.modelValue,
  (zhi) => {
    const riQi = jieXiRiQi(zhi)
    if (riQi && zuHeZhi.value === zhi) return
    yiQueRen.value = riQi ? qieDaoSan(riQi) : kongYinYong()
    if (!weiHeFaTieRu.value || zhi !== '') {
      zhengZaiShuRu.value = { nian: '', yue: '', ri: '' }
    }
  },
)

// 双向同步：三段侧一旦定下完整日期，浮层的查看月与键盘光标就跟着走（浮层侧选中走同一条 yiQueRen，
// 天然反向同步），因此两个入口不需要各自的"当前值"副本
watch(zuHeZhi, (zhi) => {
  const riQi = jieXiRiQi(zhi)
  if (!riQi) return
  jiaoDianZhi.value = riQi
  sheZhiChaKan(yueBianLiu(riQi))
})
</script>

<style scoped>
/* 外观一律吃既有令牌与继承值：本组件内不出现像素字面量，也不出现色值字面量。
   字段几何（width/padding/发丝线/字号）由宿主视图的 .fenlie-shuru 承担——它挂在组件根元素上，
   与其余字段共用同一套度量（FP-03c 静置边界、FP-04b 纵向间距的判据原点）。
   日历浮层的几何与面色全部来自共用 :root 令牌（--rili-*）与两档共有的语义色令牌
   （--beijing-kaopian / --biankuang-yanse / --wenben-* / --yinying-yanse / --zhuse），
   组件内零 :root[data-theme=...] 分支 ⇒ 深浅两档结构逐字同构、只有颜色取值不同。 */
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

.rili-da-kai {
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rili-anniu-chicun);
  height: var(--rili-anniu-chicun);
  padding: var(--jiange-xiao);
  color: inherit;
  /* 与宿主 .fudong-biaoqian 的 0.62 弱化档同值：日历钮是字段的配角，不与已选值抢视线 */
  opacity: 0.62;
}

.rili-da-kai:hover,
.rili-da-kai:focus-visible {
  opacity: 1;
}

.rili-da-kai-tu-biao {
  width: 100%;
  height: 100%;
}

.rili-zhe-zhao {
  position: fixed;
  inset: 0;
  z-index: var(--ceng-rili);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--rili-tanchuang-nei-pad);
  background: var(--rili-zhe-zhao-beijing);
}

.rili-tanchuang {
  display: flex;
  flex-direction: column;
  gap: var(--rili-tanchuang-zhou-ju);
  width: var(--rili-tanchuang-kuan);
  max-width: 100%;
  max-height: calc(var(--shi-jiao-kou-gao-du) - var(--rili-tanchuang-nei-pad) * 2);
  padding: var(--rili-tanchuang-nei-pad);
  overflow-y: auto;
  background-color: var(--beijing-kaopian);
  border: var(--shuru-xian-changtai-kuan-du) solid var(--biankuang-yanse);
  border-radius: var(--rili-tanchuang-yuan-jiao);
  color: var(--wenben-zhuse);
  /* 浮层高度由遮罩 + 面色差 + 一圈发丝边框给足，不另立第四种阴影真源（故本组件零 box-shadow） */
}

.rili-tou-bu {
  display: flex;
  align-items: center;
  gap: var(--rili-tanchuang-zhou-ju);
}

.rili-anniu {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rili-anniu-chicun);
  height: var(--rili-anniu-chicun);
  padding: var(--jiange-xiao);
  color: var(--wenben-ciuse);
  background-color: transparent;
  border-radius: var(--rili-tanchuang-yuan-jiao);
}

.rili-anniu:hover {
  background-color: var(--yinying-yanse);
  color: var(--wenben-zhuse);
}

.rili-anniu:disabled {
  color: var(--wenben-tishi);
  cursor: not-allowed;
}

.rili-jiantou {
  width: 100%;
  height: 100%;
}

.rili-nian-yue {
  flex: 1;
  text-align: center;
  font-size: var(--ziti-zhong);
  font-weight: 700;
}

.rili-ge {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--rili-tanchuang-zhou-ju);
}

/* 行只承载 ARIA 的 row 语义，几何交回外层栅格：display:contents 让 7 列贯通，行盒不参与布局 */
.rili-zhou-tou-hang,
.rili-zhou-hang {
  display: contents;
}

.rili-zhou-tou {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--rili-ri-ge-kuan);
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

.rili-ri {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--rili-ri-ge-kuan);
  font-size: var(--ziti-xiao);
  color: var(--wenben-zhuse);
  background-color: transparent;
  border-radius: var(--rili-tanchuang-yuan-jiao);
}

/* 相邻月补位格只降一档灰度，不并排禁用外观：它们仍是可达的落点，aria-disabled 才是权威判据 */
.rili-ri--fu-wei {
  color: var(--wenben-tishi);
}

.rili-ri:hover {
  background-color: var(--yinying-yanse);
}

/* 选中态靠"填色 + 字重"两轴同时表达，不只靠颜色（色觉差异下仍可分辨） */
.rili-ri--xuan-zhong {
  background-color: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
  font-weight: 700;
}

/* 今日标识用圆点，与"填色"的选中态形状上就分得开。圆点绝对定位而不是排进流里：
   排进流会让带点那一格的数字被顶上去，整张网格的数字就对不齐了。 */
.rili-ri--jin-ri::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: var(--rili-tanchuang-zhou-ju);
  transform: translateX(-50%);
  width: var(--rili-jin-ri-dian);
  height: var(--rili-jin-ri-dian);
  border-radius: 50%;
  background: var(--zhuse);
}

.rili-ri[aria-disabled='true'] {
  color: var(--wenben-tishi);
  cursor: not-allowed;
}

.rili-jiao-bu {
  display: flex;
  gap: var(--rili-tanchuang-zhou-ju);
}

.rili-jiao-bu-anniu {
  flex: 1;
  height: var(--rili-anniu-chicun);
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
  background-color: transparent;
  border: var(--shuru-xian-changtai-kuan-du) solid var(--biankuang-yanse);
  border-radius: var(--rili-tanchuang-yuan-jiao);
}

.rili-jiao-bu-anniu:hover {
  background-color: var(--yinying-yanse);
  color: var(--wenben-zhuse);
}

.rili-jiao-bu-anniu:disabled {
  color: var(--wenben-tishi);
  cursor: not-allowed;
}

.rili-jiao-bu-anniu--zhu {
  color: var(--wenben-zhuse);
  border-color: var(--beijing-ciuse);
  background-color: var(--beijing-ciuse);
  font-weight: 700;
}
</style>
