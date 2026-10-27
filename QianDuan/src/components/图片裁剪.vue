<template>
  <div class="caijian-zhezhao" @click.self="quXiao">
    <div class="caijian-rongqi" role="dialog" aria-modal="true" :aria-label="biaoTi">
      <h3 class="caijian-biaoti">{{ biaoTi }}</h3>
      <p v-if="tuPianJiaZaiShiBai" class="caijian-jiazai-cuowu" role="alert">{{ huoQuFanYi('tongYong', 'tuPianJiaZaiShiBai') }}</p>
      <cropper-canvas
        ref="huaBuRef"
        class="caijian-huabu"
        :style="shiKouYangShi"
        background
        :scale-step="0.1"
        :aria-label="biLiWenAn"
      >
        <cropper-image
          ref="tuXiangRef"
          :src="tuYuan"
          alt=""
          rotatable
          scalable
          translatable
          zoom-around-center
          @transform="shuaXinBianHuan"
          @load="tuPianJiaZaiChengGong"
          @error="tuPianJiaZaiShiBai = true"
        />
        <cropper-selection
          ref="xuanQuRef"
          :aspect-ratio="kuanGaoBi"
          :initial-coverage="1"
          resizable
          precise
          @change="yanZhengXuanQu"
        >
          <cropper-grid rows="3" columns="3" bordered covered />
          <cropper-crosshair centered />
          <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
          <cropper-handle action="n-resize" />
          <cropper-handle action="e-resize" />
          <cropper-handle action="s-resize" />
          <cropper-handle action="w-resize" />
          <cropper-handle action="ne-resize" />
          <cropper-handle action="nw-resize" />
          <cropper-handle action="se-resize" />
          <cropper-handle action="sw-resize" />
        </cropper-selection>
      </cropper-canvas>
      <p class="caijian-tishi">{{ tiShi }}</p>
      <div class="bili-hang" role="group" :aria-label="huoQuFanYi('sheZhi', 'caiJianBiLiZu')">
        <button
          v-for="biLi in biLiXuanXiangLieBiao"
          :key="biLi.jian"
          type="button"
          class="bili-ka"
          :class="{ 'bili-ka--xuan': biLi.xuan }"
          :aria-pressed="biLi.xuan"
          @click="xuanZeBiLi(biLi.zhi)"
        >
          {{ huoQuFanYi('sheZhi', biLi.wenJian) }}
        </button>
        <input
          class="bili-shu-ru"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :value="biLiShuRu"
          :placeholder="huoQuFanYi('sheZhi', 'caiJianBiLiZhanWei')"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianBiLiZiDingYi')"
          @input="shuRuBiLi"
          @change="yingYongBiLiShuRu"
        />
      </div>
      <div class="caijian-gongju" role="toolbar" :aria-label="huoQuFanYi('sheZhi', 'suoFang')">
        <button type="button" class="caijian-gongju-anniu" :aria-label="huoQuFanYi('sheZhi', 'caiJianXuanZhuanZuo')" @click="xuanZhuan(-1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button type="button" class="caijian-gongju-anniu" :aria-label="huoQuFanYi('sheZhi', 'caiJianXuanZhuanYou')" @click="xuanZhuan(1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
        <button
          type="button"
          class="caijian-gongju-anniu"
          :class="{ 'caijian-gongju-anniu--xuan': shuiPingFanZhuan }"
          :aria-pressed="shuiPingFanZhuan"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianFanZhuanShuiPing')"
          @click="fanZhuan(true)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 3v18" />
            <path d="M16 8l5 4-5 4" />
            <path d="M8 8l-5 4 5 4" />
          </svg>
        </button>
        <button
          type="button"
          class="caijian-gongju-anniu"
          :class="{ 'caijian-gongju-anniu--xuan': chuiZhiFanZhuan }"
          :aria-pressed="chuiZhiFanZhuan"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianFanZhuanChuiZhi')"
          @click="fanZhuan(false)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M3 12h18" />
            <path d="M8 7l4-5 4 5" />
            <path d="M8 17l4 5 4-5" />
          </svg>
        </button>
        <button type="button" class="caijian-gongju-anniu" :aria-label="huoQuFanYi('sheZhi', 'caiJianChongZhi')" @click="chongZhiBianHuan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
      <div class="suofang-hang">
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'suoXiao')" @click="tiaoZhengSuoFang(-0.1)">−</button>
        <input
          class="suofang-huatiao"
          type="range"
          min="50"
          max="400"
          step="5"
          :value="suoFangBaiFenShu"
          :aria-label="huoQuFanYi('sheZhi', 'suoFang')"
          :aria-valuetext="suoFangBaiFenShu + '%'"
          @input="huaGanSuoFang"
        />
        <input
          class="suofang-shu-ru"
          type="number"
          inputmode="decimal"
          autocomplete="off"
          min="50"
          max="400"
          step="0.1"
          :value="suoFangShuRu"
          :aria-label="huoQuFanYi('sheZhi', 'suoFang')"
          @change="shuRuSuoFang"
        />
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'fangDa')" @click="tiaoZhengSuoFang(0.1)">＋</button>
        <span class="suofang-bai-fen" aria-hidden="true">{{ suoFangBaiFenShu }}%</span>
      </div>
      <p v-if="caiJianCuoWu" class="caijian-jiazai-cuowu" role="alert">{{ caiJianCuoWu }}</p>
      <div
        v-if="shiLiaoTianYuLan"
        class="caijian-yulan"
        :class="['caijian-yulan--' + props.yuLanLeiXing, yuLanCeLei]"
        :style="yuLanFuGaiYangShi"
      >
        <LiaoTianYuLan :biao-ti="yuLanBiaoTi" />
        <div class="yu-lan-tian-chong" role="group" :aria-label="huoQuFanYi('sheZhi', 'caiJianYuLanTianChongZu')">
          <button
            v-for="xiang in tianChongXuanXiang"
            :key="xiang.zhi"
            type="button"
            class="yu-lan-tian-chong-ka"
            :class="{ 'yu-lan-tian-chong-ka--xuan': xiang.xuan }"
            :aria-pressed="xiang.xuan"
            @click="xuanZeTianChongMoShi(xiang.zhi)"
          >
            {{ huoQuFanYi('sheZhi', xiang.wenJian) }}
          </button>
        </div>
      </div>
      <div class="caijian-anniu-zu">
        <button class="anniu-fu-zhu" @click="quXiao">{{ huoQuFanYi('renZheng', 'quXiao') }}</button>
        <button class="anniu-que-ren" :disabled="zhengZaiShengCheng" @click="queRen">
          {{ zhengZaiShengCheng ? huoQuFanYi('sheZhi', 'shengChengZhong') : huoQuFanYi('renZheng', 'queRen') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'cropperjs'
import type { CropperCanvas, CropperImage, CropperSelection } from 'cropperjs'
import { huoQuFanYi } from '@/config/翻译表'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  huoQuLaShenChiCunZhi,
  huoQuQiPaoBeiJingZhi,
  huoQuQiPaoMengCengZhi,
  type WaiGuanLaShenMoShi,
} from '@/config/外观自定义'
import { caiJiBianYuanYanSe } from '@/utils/外观采样'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  daoChuCaiJianWenJian,
  jiSuanGunLunPingYi,
  jiSuanJianPanPingYi,
  jiSuanJuZhenSuoFang,
  jiXiBiLiWenBen,
  jueDingShuChuGeShi,
} from '@/utils/图片裁剪'
import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'

const QU_YU_GAO_DU = 260
const SUO_FANG_XIA_XIAN = 0.5
const SUO_FANG_SHANG_XIAN = 4
const XUAN_QU_ZUI_XIAO_BIAN = 48
const YU_LAN_SHU_CHU_KUAN = 320
const GUN_LUN_PING_YI_XI_SHU = 0.08
const JIAN_PAN_PING_YI_BU_CHANG = 8

type BiLiWenJian =
  | 'caiJianBiLiZiYou'
  | 'caiJianBiLiYiBiYi'
  | 'caiJianBiLiSanBiSi'
  | 'caiJianBiLiErBiYi'
  | 'caiJianBiLiShiLiuBiJiu'

const BI_LI_XUAN_XIANG: Array<{ zhi: number; jian: string; wenJian: BiLiWenJian }> = [
  { zhi: 0, jian: 'ziYou', wenJian: 'caiJianBiLiZiYou' },
  { zhi: 1, jian: 'fang', wenJian: 'caiJianBiLiYiBiYi' },
  { zhi: 0.75, jian: 'shu', wenJian: 'caiJianBiLiSanBiSi' },
  { zhi: 2, jian: 'kuan', wenJian: 'caiJianBiLiErBiYi' },
  { zhi: 16 / 9, jian: 'ying', wenJian: 'caiJianBiLiShiLiuBiJiu' },
]

function shiXiangTongBiLi(jia: number, yi: number): boolean {
  return Math.abs(jia - yi) < 0.001
}

const props = withDefaults(
  defineProps<{
    tuYuan: string
    yuanMime: string
    biaoTi: string
    tiShi: string
    kuanGaoBi?: number
    wenJianMing?: string
    yuLanLeiXing?: 'beiJing' | 'qiPao'
    yuLanCeZhong?: 'ziJi' | 'ai'
  }>(),
  {
    kuanGaoBi: 1,
    wenJianMing: 'tupian',
    yuLanLeiXing: undefined,
    yuLanCeZhong: undefined,
  },
)

const emit = defineEmits<{
  (e: 'que-ren', wenJian: Blob): void
  (e: 'qu-xiao'): void
}>()

const quKuan = computed(() => Math.round(QU_YU_GAO_DU * Math.max(0.2, Math.min(5, props.kuanGaoBi))))
const shiKouYangShi = computed(() => ({ width: `${quKuan.value}px`, height: `${QU_YU_GAO_DU}px` }))

const huaBuRef = ref<CropperCanvas | null>(null)
const tuXiangRef = ref<CropperImage | null>(null)
const xuanQuRef = ref<CropperSelection | null>(null)
const zhengZaiShengCheng = ref(false)
const bianHuanJuZhen = ref<number[]>([1, 0, 0, 1, 0, 0])
let chuShiJuZhen: number[] | null = null

const biLiXuanXiang = ref(props.kuanGaoBi > 0 ? props.kuanGaoBi : 1)
const kuanGaoBi = computed(() => (biLiXuanXiang.value > 0 ? biLiXuanXiang.value : undefined))
const biLiXuanXiangLieBiao = computed(() =>
  BI_LI_XUAN_XIANG.map((xiang) => ({ ...xiang, xuan: shiXiangTongBiLi(biLiXuanXiang.value, xiang.zhi) })),
)
const biLiShuRu = ref('')

function shuRuBiLi(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  biLiShuRu.value = muBiao?.value ?? ''
}

function yingYongBiLiShuRu(): void {
  const zhi = jiXiBiLiWenBen(biLiShuRu.value)
  if (zhi === null) {
    caiJianCuoWu.value = huoQuFanYi('sheZhi', 'caiJianBiLiWuXiao')
    return
  }
  const guiYi = Math.round(zhi * 1000) / 1000
  if (shiXiangTongBiLi(biLiXuanXiang.value, guiYi)) {
    caiJianCuoWu.value = ''
    return
  }
  caiJianCuoWu.value = ''
  biLiXuanXiang.value = guiYi
  chuShiHuaXuanQu()
  qiangZhiShuaXinYuLan()
}

const shuiPingFanZhuan = computed(() => bianHuanJuZhen.value[0] < 0)
const chuiZhiFanZhuan = computed(() => bianHuanJuZhen.value[3] < 0)
const jiXianSuoFang = computed(() => (chuShiJuZhen ? jiSuanJuZhenSuoFang(chuShiJuZhen) : 1))
const dangQianSuoFang = computed(() => jiSuanJuZhenSuoFang(bianHuanJuZhen.value))
const suoFangBaiFenShu = computed(() => Math.round((dangQianSuoFang.value / jiXianSuoFang.value) * 100))

const caiJianCuoWu = ref('')

const biLiWenAn = computed(() => {
  if (!(biLiXuanXiang.value > 0)) return huoQuFanYi('sheZhi', 'caiJianBiLiZiYou')
  const zuiDaShu = 40
  for (let n = 1; n <= zuiDaShu; n += 1) {
    const jiSuan = biLiXuanXiang.value * n
    if (Math.abs(jiSuan - Math.round(jiSuan)) < 0.01) {
      const zheng = Math.round(jiSuan)
      const qiuHe = (a: number, b: number): number => (b === 0 ? a : qiuHe(b, a % b))
      const yue = qiuHe(zheng, n) || 1
      return huoQuFanYi('sheZhi', 'caiJianQueRenBiLi').replace('{ratio}', `${zheng / yue}:${n / yue}`)
    }
  }
  return huoQuFanYi('sheZhi', 'caiJianQueRenBiLi').replace('{ratio}', String(biLiXuanXiang.value))
})

function shiSuoFangHeFa(suoFang: number): boolean {
  const rongCha = 1e-4
  return (
    suoFang >= SUO_FANG_XIA_XIAN * jiXianSuoFang.value - rongCha &&
    suoFang <= SUO_FANG_SHANG_XIAN * jiXianSuoFang.value + rongCha
  )
}

function shuaXinBianHuan(shiJian?: Event): void {
  const xiJie = (shiJian as CustomEvent<{ matrix?: number[] }> | undefined)?.detail
  const juZhen = Array.isArray(xiJie?.matrix) && xiJie.matrix.length >= 4 ? [...xiJie.matrix] : tuXiangRef.value?.$getTransform()
  if (!juZhen || juZhen.length < 4) return
  if (shiJian && !shiSuoFangHeFa(jiSuanJuZhenSuoFang(juZhen))) {
    shiJian.preventDefault()
    return
  }
  bianHuanJuZhen.value = [...juZhen]
  qiangZhiShuaXinYuLan()
}

const tuPianJiaZaiShiBai = ref(false)

watch(() => props.tuYuan, () => {
  tuPianJiaZaiShiBai.value = false
  caiJianCuoWu.value = ''
  yuLanDiZhi.value = ''
  qiangZhiShuaXinYuLan()
})

function tuPianJiaZaiChengGong(): void {
  tuPianJiaZaiShiBai.value = false
  chuShiHuaXuanQu()
}

function chuShiHuaXuanQu(): void {
  const huaBu = huaBuRef.value
  const tuXiang = tuXiangRef.value
  const xuanQu = xuanQuRef.value
  if (!huaBu || !tuXiang || !xuanQu) return
  if (!chuShiJuZhen) chuShiJuZhen = [...(tuXiang.$getTransform() || [1, 0, 0, 1, 0, 0])]
  shuaXinBianHuan()
  if (!(biLiXuanXiang.value > 0)) {
    qiangZhiShuaXinYuLan()
    return
  }
  const huaBuJu = huaBu.getBoundingClientRect()
  const tuJu = tuXiang.getBoundingClientRect()
  if (!huaBuJu.width || !huaBuJu.height || !tuJu.width || !tuJu.height) return
  const biLi = biLiXuanXiang.value
  let kuan = tuJu.width
  let gao = kuan / biLi
  if (gao > tuJu.height) {
    gao = tuJu.height
    kuan = gao * biLi
  }
  const x = tuJu.left - huaBuJu.left + (tuJu.width - kuan) / 2
  const y = tuJu.top - huaBuJu.top + (tuJu.height - gao) / 2
  xuanQu.$change(x, y, kuan, gao, biLi)
  guDingXuanQuJuZhong()
  qiangZhiShuaXinYuLan()
}

function yanZhengXuanQu(shiJian: Event): void {
  const xiJie = (shiJian as CustomEvent<{ width?: number; height?: number }>).detail
  const kuan = Number(xiJie?.width)
  const gao = Number(xiJie?.height)
  if (Number.isFinite(kuan) && Number.isFinite(gao) && (kuan < XUAN_QU_ZUI_XIAO_BIAN || gao < XUAN_QU_ZUI_XIAO_BIAN)) {
    shiJian.preventDefault()
    return
  }
  qiangZhiShuaXinYuLan()
}

function xuanZeBiLi(zhi: number): void {
  if (shiXiangTongBiLi(biLiXuanXiang.value, zhi)) return
  caiJianCuoWu.value = ''
  biLiShuRu.value = ''
  biLiXuanXiang.value = zhi
  if (zhi > 0) chuShiHuaXuanQu()
  qiangZhiShuaXinYuLan()
}

function guDingXuanQuJuZhong(): void {
  xuanQuRef.value?.$center()
}

function xuanZhuan(fangXiang: 1 | -1): void {
  tuXiangRef.value?.$rotate((fangXiang * Math.PI) / 2)
  shuaXinBianHuan()
  guDingXuanQuJuZhong()
}

function fanZhuan(shuiPing: boolean): void {
  if (shuiPing) tuXiangRef.value?.$scale(-1, 1)
  else tuXiangRef.value?.$scale(1, -1)
  shuaXinBianHuan()
  guDingXuanQuJuZhong()
}

function chongZhiBianHuan(): void {
  const tuXiang = tuXiangRef.value
  if (!tuXiang) return
  if (chuShiJuZhen) tuXiang.$setTransform(chuShiJuZhen)
  else tuXiang.$resetTransform()
  shuaXinBianHuan()
  chuShiHuaXuanQu()
}

function sheZhiSuoFang(muBiaoSuoFang: number): void {
  const xia = SUO_FANG_XIA_XIAN * jiXianSuoFang.value
  const shang = SUO_FANG_SHANG_XIAN * jiXianSuoFang.value
  const ding = Math.min(shang, Math.max(xia, muBiaoSuoFang))
  const yinZi = ding / dangQianSuoFang.value
  if (Number.isFinite(yinZi) && yinZi > 0 && Math.abs(yinZi - 1) > 1e-4) tuXiangRef.value?.$scale(yinZi)
  shuaXinBianHuan()
}

function tiaoZhengSuoFang(buJin: number): void {
  sheZhiSuoFang(dangQianSuoFang.value * (1 + buJin))
}

function huaGanSuoFang(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  if (!muBiao) return
  const baiFenShu = Math.max(50, Math.min(400, Number(muBiao.value)))
  sheZhiSuoFang((baiFenShu / 100) * jiXianSuoFang.value)
}

const suoFangShuRu = ref('50')
const suoFangJingQueBaiFenShu = computed(() => ((dangQianSuoFang.value / jiXianSuoFang.value) * 100))

watch(suoFangJingQueBaiFenShu, (zhi) => {
  const ru = Number(suoFangShuRu.value)
  if (!suoFangShuRu.value || !Number.isFinite(ru) || Math.abs(ru - zhi) > 1e-6) {
    suoFangShuRu.value = suFangXianShiZhi(zhi)
  }
})

function suFangXianShiZhi(zhi: number): string {
  const shiWeiShu = Math.abs(zhi - Math.round(zhi)) > 1e-9
  return shiWeiShu ? zhi.toFixed(1) : String(Math.round(zhi))
}

function shuRuSuoFang(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  if (!muBiao) return
  const zhi = Number(muBiao.value)
  if (!Number.isFinite(zhi) || zhi <= 0) {
    suoFangShuRu.value = suFangXianShiZhi(suoFangJingQueBaiFenShu.value)
    return
  }
  sheZhiSuoFang((zhi / 100) * jiXianSuoFang.value)
  suoFangShuRu.value = suFangXianShiZhi(suoFangJingQueBaiFenShu.value)
}

const shiLiaoTianYuLan = computed(() => props.yuLanLeiXing === 'beiJing' || props.yuLanLeiXing === 'qiPao')
const yuLanBiaoTi = computed(() =>
  huoQuFanYi('sheZhi', props.yuLanLeiXing === 'qiPao' ? 'caiJianYuLanQiPao' : 'caiJianYuLanBeiJing'),
)
const yuLanCeLei = computed(() =>
  props.yuLanLeiXing === 'qiPao' && props.yuLanCeZhong ? 'caijian-yulan--ce-' + props.yuLanCeZhong : '',
)
const yuLanDiZhi = ref('')
let sheZhiCang: ReturnType<typeof 使用用户设置仓库> | null = null

function quSheZhiCang(): ReturnType<typeof 使用用户设置仓库> | null {
  if (!shiLiaoTianYuLan.value) return null
  if (!sheZhiCang) sheZhiCang = 使用用户设置仓库()
  return sheZhiCang
}

function dangQianLaShenMoShi(): WaiGuanLaShenMoShi {
  const cang = quSheZhiCang()
  if (!cang) return 'dengBi'
  return props.yuLanLeiXing === 'qiPao' ? cang.qiPaoLaShenMoShi : cang.beiJingLaShenMoShi
}

const TIAN_CHONG_XUAN_XIANG: Array<{ zhi: WaiGuanLaShenMoShi; wenJian: 'caiJianYuLanTianChongDengBi' | 'caiJianYuLanTianChongHenXiang' | 'caiJianYuLanTianChongZongXiang' | 'caiJianYuLanTianChongQuanBu' }> = [
  { zhi: 'dengBi', wenJian: 'caiJianYuLanTianChongDengBi' },
  { zhi: 'henXiang', wenJian: 'caiJianYuLanTianChongHenXiang' },
  { zhi: 'zongXiang', wenJian: 'caiJianYuLanTianChongZongXiang' },
  { zhi: 'quanBu', wenJian: 'caiJianYuLanTianChongQuanBu' },
]

const tianChongXuanXiang = computed(() => {
  const dangQian = dangQianLaShenMoShi()
  return TIAN_CHONG_XUAN_XIANG.map((xiang) => ({ ...xiang, xuan: xiang.zhi === dangQian }))
})

function xuanZeTianChongMoShi(zhi: WaiGuanLaShenMoShi): void {
  if (!props.yuLanLeiXing) return
  quSheZhiCang()?.shiYongLaShenMoShi(props.yuLanLeiXing, zhi)
}

const yuLanFuGaiYangShi = computed<Record<string, string>>(() => {
  const yangShi: Record<string, string> = {
    '--caijian-yulan-chi-cun': huoQuLaShenChiCunZhi(dangQianLaShenMoShi()),
  }
  if (!yuLanDiZhi.value) return yangShi
  const zhi =
    props.yuLanLeiXing === 'qiPao'
      ? huoQuQiPaoBeiJingZhi(yuLanDiZhi.value, WAI_GUAN_MO_REN_WEN_ZI_YAN_SE, dangQianLaShenMoShi())
      : `url("${yuLanDiZhi.value}")`
  yangShi['--caijian-yulan-fu-gai'] = zhi
  if (props.yuLanLeiXing === 'qiPao' && yuLanWeiBaSe.value) {
    yangShi['--caijian-yulan-wei-ba'] = yuLanWeiBaSe.value
  }
  return yangShi
})

const yuLanWeiBaSe = ref('')

watch(yuLanDiZhi, (zhi) => {
  yuLanWeiBaSe.value = ''
  if (!zhi || props.yuLanLeiXing !== 'qiPao') return
  const ceBie = props.yuLanCeZhong === 'ai' ? 'zuo' : 'you'
  void caiJiBianYuanYanSe(zhi, ceBie, huoQuQiPaoMengCengZhi(WAI_GUAN_MO_REN_WEN_ZI_YAN_SE)).then((yanSe) => {
    if (yanSe) yuLanWeiBaSe.value = yanSe
  })
})

let yuLanPaiZhen = 0
let yuLanDaoLuZhong = false
let yuLanDaiZhong = false
let yuLanChongShi = 0

function anPaiYuLanChongShi(): void {
  if (!shiLiaoTianYuLan.value || yuLanDiZhi.value || yuLanChongShi) return
  yuLanChongShi = window.setTimeout(() => {
    yuLanChongShi = 0
    qiangZhiShuaXinYuLan()
  }, 1000)
}

function qiangZhiShuaXinYuLan(): void {
  if (!shiLiaoTianYuLan.value) return
  if (yuLanPaiZhen) return
  yuLanPaiZhen = requestAnimationFrame(() => {
    yuLanPaiZhen = 0
    void shuaXinYuLan()
  })
}

async function shuaXinYuLan(): Promise<void> {
  if (!shiLiaoTianYuLan.value) return
  if (yuLanDaoLuZhong) {
    yuLanDaiZhong = true
    return
  }
  const xuanQu = xuanQuRef.value
  if (!xuanQu) {
    anPaiYuLanChongShi()
    return
  }
  yuLanDaoLuZhong = true
  try {
    const huaBu = await xuanQu.$toCanvas({ width: YU_LAN_SHU_CHU_KUAN })
    if (shiLiaoTianYuLan.value) yuLanDiZhi.value = huaBu.toDataURL('image/png')
  } catch (cuoWu) {
    console.error('裁剪预览导出失败', cuoWu)
    yuLanDiZhi.value = ''
  } finally {
    yuLanDaoLuZhong = false
    if (yuLanDaiZhong) {
      yuLanDaiZhong = false
      qiangZhiShuaXinYuLan()
    }
  }
  if (!yuLanDiZhi.value) anPaiYuLanChongShi()
}

function quXiao(): void {
  if (zhengZaiShengCheng.value) return
  emit('qu-xiao')
}

async function queRen(): Promise<void> {
  const xuanQu = xuanQuRef.value
  if (!xuanQu || zhengZaiShengCheng.value) return
  if (xuanQu.width < XUAN_QU_ZUI_XIAO_BIAN || xuanQu.height < XUAN_QU_ZUI_XIAO_BIAN) {
    caiJianCuoWu.value = huoQuFanYi('sheZhi', 'caiJianXuanQuTaiXiao')
    return
  }
  caiJianCuoWu.value = ''
  zhengZaiShengCheng.value = true
  try {
    const geShi = jueDingShuChuGeShi(props.yuanMime)
    const wenJian = await daoChuCaiJianWenJian(xuanQu, geShi, props.wenJianMing)
    emit('que-ren', wenJian)
  } finally {
    zhengZaiShengCheng.value = false
  }
}

function jiaoDianZaiBianJiKuang(): boolean {
  const jiaoDian = document.activeElement
  return jiaoDian instanceof HTMLInputElement
    || jiaoDian instanceof HTMLTextAreaElement
    || (jiaoDian instanceof HTMLElement && jiaoDian.isContentEditable)
}

function chuFaAnJian(shiJian: KeyboardEvent): void {
  if (shiJian.key === 'Escape') {
    quXiao()
    return
  }
  const bu = jiSuanJianPanPingYi(shiJian.key, shiJian.shiftKey, JIAN_PAN_PING_YI_BU_CHANG)
  if (!bu.x && !bu.y) return
  if (jiaoDianZaiBianJiKuang()) return
  shiJian.preventDefault()
  tuXiangRef.value?.$move(bu.x, bu.y)
}

function jieHuoCtrlGunLun(shiJian: WheelEvent): void {
  if (!shiJian.ctrlKey) return
  const bu = jiSuanGunLunPingYi(shiJian.deltaY, GUN_LUN_PING_YI_XI_SHU)
  if (!bu.x && !bu.y) return
  shiJian.preventDefault()
  shiJian.stopPropagation()
  tuXiangRef.value?.$move(bu.x, bu.y)
}

function jieHuoGunLunQuanJu(shiJian: Event): void {
  jieHuoCtrlGunLun(shiJian as WheelEvent)
}

function xiaYiZhen(): Promise<void> {
  return new Promise((jieJue) => requestAnimationFrame(() => jieJue()))
}

onMounted(() => {
  document.addEventListener('keydown', chuFaAnJian)
  document.addEventListener('wheel', jieHuoGunLunQuanJu, { capture: true, passive: false })
  void tuXiangRef.value
    ?.$ready()
    .then(async () => {
      await xiaYiZhen()
      await xiaYiZhen()
      chuShiHuaXuanQu()
    })
    .catch(() => undefined)
  qiangZhiShuaXinYuLan()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', chuFaAnJian)
  document.removeEventListener('wheel', jieHuoGunLunQuanJu, true)
  if (yuLanPaiZhen) {
    cancelAnimationFrame(yuLanPaiZhen)
    yuLanPaiZhen = 0
  }
  if (yuLanChongShi) {
    clearTimeout(yuLanChongShi)
    yuLanChongShi = 0
  }
})
</script>

<style scoped>
.caijian-zhezhao {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  z-index: 1000;
}

.caijian-rongqi {
  background: var(--caijian-mian);
  border: 1px solid var(--caijian-xian);
  border-radius: 20px;
  padding: var(--jiange-da);
  max-width: 380px;
  width: 100%;
  max-height: min(88vh, 860px);
  overflow-y: auto;
  text-align: center;
}

.caijian-zhezhao {
  --caijian-mian: rgba(20, 24, 40, 0.95);
  --caijian-xian: rgba(255, 255, 255, 0.1);
  --caijian-huabu-mian: #0a0a12;
  --caijian-ci-wenben: rgba(255, 255, 255, 0.55);
  --caijian-kong-xian: rgba(255, 255, 255, 0.2);
  --caijian-kong-wenben: rgba(255, 255, 255, 0.8);
  --caijian-zhuse: #07c160;
}

.caijian-biaoti {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 var(--jiange-zhong);
}

.caijian-jiazai-cuowu {
  font-size: 13px;
  color: var(--cuowu-yanse);
  margin: 0 0 var(--jiange-zhong);
}

.caijian-huabu {
  position: relative;
  max-width: 100%;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  background: var(--caijian-huabu-mian);
}

.caijian-tishi {
  font-size: 12px;
  color: var(--caijian-ci-wenben);
  margin: var(--jiange-12) 0;
  text-align: left;
}

.bili-hang {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--jiange-6);
  margin-bottom: var(--jiange-12);
}

.bili-ka {
  padding: var(--jiange-6) var(--jiange-12);
  border: 1.5px solid var(--caijian-kong-xian);
  border-radius: 999px;
  background: transparent;
  color: var(--caijian-kong-wenben);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.bili-ka:hover {
  border-color: var(--caijian-zhuse);
  color: var(--caijian-zhuse);
}

.bili-ka:focus-visible {
  outline: 2px solid var(--caijian-zhuse);
  outline-offset: 2px;
}

.bili-ka--xuan {
  border-color: var(--caijian-zhuse);
  color: var(--caijian-zhuse);
  background: rgba(7, 193, 96, 0.12);
}

.bili-shu-ru {
  padding: var(--jiange-6) var(--jiange-10);
  border: 1.5px solid var(--caijian-kong-xian);
  border-radius: 999px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  width: 92px;
}

.bili-shu-ru:focus-visible {
  outline: 2px solid var(--caijian-zhuse);
  outline-offset: 2px;
}

.caijian-yulan {
  margin: var(--jiange-12) 0;
  padding: var(--jiange-10);
  border: 1px solid var(--caijian-xian);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  text-align: left;
}

.caijian-yulan--beiJing :deep(.liao-tian-mian-ban) {
  background: var(--caijian-yulan-fu-gai, var(--liaotian-beijing)) center / var(--caijian-yulan-chi-cun, cover) no-repeat !important;
}

.caijian-yulan--ce-ziJi :deep(.qipao-neirong--benren) {
  background: var(--caijian-yulan-fu-gai) !important;
}

.caijian-yulan--ce-ziJi :deep(.qipao-neirong--benren::after) {
  border-left-color: var(--caijian-yulan-wei-ba, var(--qipao-ziJi-weiBa, var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing)))) !important;
}

.caijian-yulan--ce-ai :deep(.qipao-neirong--jiaose) {
  background: var(--caijian-yulan-fu-gai) !important;
}

.caijian-yulan--ce-ai :deep(.qipao-neirong--jiaose::after) {
  border-right-color: var(--caijian-yulan-wei-ba, var(--qipao-duiFang-weiBa, var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing)))) !important;
}

.caijian-gongju {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-10);
  margin-bottom: var(--jiange-12);
}

.caijian-gongju-anniu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1.5px solid var(--caijian-kong-xian);
  border-radius: 50%;
  background: transparent;
  color: var(--caijian-kong-wenben);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.caijian-gongju-anniu svg {
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.caijian-gongju-anniu:hover:not(:disabled) {
  border-color: var(--caijian-zhuse);
  color: var(--caijian-zhuse);
  transform: translateY(-1px);
}

.caijian-gongju-anniu:focus-visible {
  outline: 2px solid var(--caijian-zhuse);
  outline-offset: 2px;
}

.caijian-gongju-anniu--xuan {
  border-color: var(--caijian-zhuse);
  color: var(--caijian-zhuse);
  background: rgba(7, 193, 96, 0.12);
}

.suofang-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  margin-bottom: var(--jiange-zhong);
}

.suofang-anniu {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid var(--caijian-kong-xian);
  background: transparent;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.suofang-huatiao {
  flex: 1;
  accent-color: var(--caijian-zhuse);
}

.suofang-shu-ru {
  flex: none;
  width: 64px;
  padding: var(--jiange-4) var(--jiange-6);
  border: 1.5px solid var(--caijian-kong-xian);
  border-radius: 10px;
  background: transparent;
  color: #fff;
  font-size: 13px;
  text-align: right;
}

.suofang-shu-ru:focus-visible {
  outline: 2px solid var(--caijian-zhuse);
  outline-offset: 2px;
}

.suofang-bai-fen {
  flex: none;
  min-width: 44px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}

.yu-lan-tian-chong {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--jiange-6);
  margin-top: var(--jiange-10);
}

.yu-lan-tian-chong-ka {
  padding: var(--jiange-4) var(--jiange-10);
  border: 1.5px solid var(--caijian-kong-xian);
  border-radius: 999px;
  background: transparent;
  color: var(--caijian-kong-wenben);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.yu-lan-tian-chong-ka:hover {
  border-color: var(--caijian-zhuse);
  color: var(--caijian-zhuse);
}

.yu-lan-tian-chong-ka:focus-visible {
  outline: 2px solid var(--caijian-zhuse);
  outline-offset: 2px;
}

.yu-lan-tian-chong-ka--xuan {
  border-color: var(--caijian-zhuse);
  color: var(--caijian-zhuse);
  background: rgba(7, 193, 96, 0.12);
}

.caijian-anniu-zu {
  display: flex;
  gap: var(--jiange-12);
  justify-content: center;
}

.anniu-fu-zhu {
  padding: var(--jiange-12) var(--jiange-da);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1.5px solid var(--caijian-kong-xian);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.anniu-que-ren {
  padding: var(--jiange-12) var(--jiange-da);
  background: linear-gradient(135deg, var(--caijian-zhuse), color-mix(in srgb, var(--caijian-zhuse) 78%, #00380f));
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.anniu-que-ren:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .caijian-gongju-anniu,
  .bili-ka,
  .yu-lan-tian-chong-ka {
    transition: none;
  }
}
</style>
