<template>
  <div class="caijian-zhezhao" @click.self="quXiao">
    <div
      ref="rongQiRef"
      class="caijian-rongqi"
      role="dialog"
      aria-modal="true"
      :aria-label="biaoTi"
      tabindex="-1"
      :style="rongQiYangShi"
      @keydown="chuLiJianPan"
    >
      <h3 class="caijian-biaoti">{{ biaoTi }}</h3>
      <p v-if="tuPianJiaZaiShiBai" class="caijian-jiazai-cuowu" role="alert">
        {{ huoQuFanYi('tongYong', 'tuPianJiaZaiShiBai') }}
      </p>
      <div class="caijian-shitu">
        <cropper-canvas
          ref="huaBuRef"
          class="caijian-huabu"
          :class="{ 'caijian-huabu--tuozhong': zhengZaiTuoDong }"
          :style="shiKouYangShi"
          background
          :aria-label="biLiWenAn"
          @pointerdown="tuoDongAnXia"
          @pointermove="tuoDongYiDong"
          @pointerup="tuoDongJieShu"
          @pointercancel="tuoDongJieShu"
          @lostpointercapture="tuoDongJieShu"
          @wheel.capture="gunLunSuoFang"
        >
          <cropper-image
            ref="tuXiangRef"
            class="caijian-tuxiang"
            :src="shiJiTuYuan"
            alt=""
            scalable
            translatable
            zoom-around-center
            initial-fit="cover"
            max-inset="0"
            @transform="shuaXinBianHuan"
          />
          <cropper-selection
            ref="xuanQuRef"
            class="caijian-xuanqu"
            :aspect-ratio="kuanGaoBi"
            precise
          >
            <cropper-grid rows="3" columns="3" bordered covered theme-color="rgba(255, 255, 255, 0.42)" />
            <cropper-crosshair centered theme-color="rgba(255, 255, 255, 0.42)" />
          </cropper-selection>
        </cropper-canvas>
      </div>
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
          inputmode="text"
          autocomplete="off"
          :value="biLiShuRu"
          :placeholder="huoQuFanYi('sheZhi', 'caiJianBiLiZhanWei')"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianBiLiZiDingYi')"
          @input="shuRuBiLi"
          @change="yingYongBiLiShuRu"
          @keydown.enter.prevent="yingYongBiLiShuRu"
        />
      </div>
      <div class="caijian-gongju" role="toolbar" :aria-label="huoQuFanYi('sheZhi', 'suoFang')">
        <button
          type="button"
          class="caijian-gongju-anniu"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianXuanZhuanZuo')"
          @click="xuanZhuan(-1)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          type="button"
          class="caijian-gongju-anniu"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianXuanZhuanYou')"
          @click="xuanZhuan(1)"
        >
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
        <button
          type="button"
          class="caijian-gongju-anniu"
          :aria-label="huoQuFanYi('sheZhi', 'caiJianChongZhi')"
          @click="chongZhiBianHuan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
      <div class="suofang-hang">
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'suoXiao')" @click="tiaoZhengSuoFang(-SUO_FANG_JIA_JIAN)">
          −
        </button>
        <input
          class="suofang-huatiao"
          type="range"
          :min="SUO_FANG_BAI_FEN_XIA"
          :max="SUO_FANG_BAI_FEN_SHANG"
          step="1"
          :value="suoFangBaiFenShu"
          :aria-label="huoQuFanYi('sheZhi', 'suoFang')"
          :aria-valuetext="suoFangWenAn"
          @input="huaGanSuoFang"
        />
        <input
          class="suofang-shu-ru"
          type="number"
          inputmode="decimal"
          autocomplete="off"
          :min="SUO_FANG_BAI_FEN_XIA"
          :max="SUO_FANG_BAI_FEN_SHANG"
          step="0.1"
          :value="suoFangShuRu"
          :aria-label="huoQuFanYi('sheZhi', 'suoFang')"
          @change="shuRuSuoFang"
          @keydown.enter.prevent="shuRuSuoFang"
        />
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'fangDa')" @click="tiaoZhengSuoFang(SUO_FANG_JIA_JIAN)">
          ＋
        </button>
        <span class="suofang-bai-fen" aria-hidden="true">{{ suoFangWenAn }}</span>
      </div>
      <p v-if="caiJianCuoWu" class="caijian-jiazai-cuowu" role="alert">{{ caiJianCuoWu }}</p>
      <div
        v-if="shiLiaoTianYuLan"
        class="caijian-yulan"
        :class="['caijian-yulan--' + props.yuLanLeiXing, yuLanCeLei]"
        :style="yuLanFuGaiYangShi"
      >
        <LiaoTianYuLan :biao-ti="yuLanBiaoTi" />
        <div class="yu-lan-tian-chong">
          <WaiGuanTianChongXuanZe :lei-xing="yuLanLeiXingZhi" />
        </div>
      </div>
      <div class="caijian-anniu-zu">
        <button class="anniu-fu-zhu" @click="quXiao">{{ huoQuFanYi('renZheng', 'quXiao') }}</button>
        <button
          class="anniu-que-ren"
          :disabled="zhengZaiShengCheng || tuPianJiaZaiShiBai"
          @click="queRen"
        >
          {{ zhengZaiShengCheng ? huoQuFanYi('sheZhi', 'shengChengZhong') : huoQuFanYi('renZheng', 'queRen') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'cropperjs'
import type { CropperCanvas, CropperImage, CropperSelection } from 'cropperjs'
import { huoQuFanYi } from '@/config/翻译表'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  huoQuLaShenChiCunZhi,
  huoQuQiPaoBeiJingZhi,
  type WaiGuanLaShenMoShi,
} from '@/config/外观自定义'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  CAI_JIAN_BI_LI_SHANG_XIAN,
  CAI_JIAN_BI_LI_XIA_XIAN,
  TU_PIAN_SHU_CHU_ZUI_DA_BIAN,
  daoChuCaiJianWenJian,
  guiYiGunLunZengLiang,
  jiSuanDaoChuKuan,
  jiSuanGunLunPingYi,
  jiSuanJianPanPingYi,
  jiSuanJuZhenSuoFang,
  jiXiBiLiWenBen,
  jueDingShuChuGeShi,
} from '@/utils/图片裁剪'
import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'
import WaiGuanTianChongXuanZe from '@/components/外观填充选择器.vue'

const QU_YU_GAO_DU = 260
const SUO_FANG_BAI_FEN_XIA = 100
const SUO_FANG_BAI_FEN_SHANG = 400
const SUO_FANG_JIA_JIAN = 10
const YU_LAN_ZUI_DA_BIAN = 640
const YU_LAN_MO_REN_KUAN = 320
const GUN_LUN_PING_YI_XI_SHU = 0.08
const GUN_LUN_SUO_FANG_BU_JIN = 10
const GUN_LUN_JIAN_GE_HAO_MIAO = 40
const JIAN_PAN_PING_YI_BU_CHANG = 8
const YU_JIAN_CHAO_SHI_HAO_MIAO = 20000
const YA_SUO_YUAN_XIANG_SU = 32000000
const YA_SUO_YUAN_BIAN = 8192
const YA_SUO_HOU_BIAN = 4096

type BiLiWenJian =
  | 'caiJianBiLiYiBiYi'
  | 'caiJianBiLiSanBiSi'
  | 'caiJianBiLiErBiYi'
  | 'caiJianBiLiShiLiuBiJiu'

const BI_LI_XUAN_XIANG: Array<{ zhi: number; jian: string; wenJian: BiLiWenJian }> = [
  { zhi: 1, jian: 'fang', wenJian: 'caiJianBiLiYiBiYi' },
  { zhi: 0.75, jian: 'shu', wenJian: 'caiJianBiLiSanBiSi' },
  { zhi: 2, jian: 'kuan', wenJian: 'caiJianBiLiErBiYi' },
  { zhi: 16 / 9, jian: 'ying', wenJian: 'caiJianBiLiShiLiuBiJiu' },
]

function shiXiangTongBiLi(jia: number, yi: number): boolean {
  return Math.abs(jia - yi) < 0.001
}

function shouLianBiLi(zhi: unknown): number {
  const shu = Number(zhi)
  if (!Number.isFinite(shu) || shu <= 0) return 1
  return Math.min(CAI_JIAN_BI_LI_SHANG_XIAN, Math.max(CAI_JIAN_BI_LI_XIA_XIAN, shu))
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

const huaBuRef = ref<CropperCanvas | null>(null)
const tuXiangRef = ref<CropperImage | null>(null)
const xuanQuRef = ref<CropperSelection | null>(null)
const rongQiRef = ref<HTMLElement | null>(null)

const zhengZaiShengCheng = ref(false)
const tuPianJiaZaiShiBai = ref(false)
const caiJianCuoWu = ref('')
const zhunBeiJiuXu = ref(false)
const zhengZaiTuoDong = ref(false)
const shiJiTuYuan = ref(props.tuYuan)
const bianHuanJuZhen = ref<number[]>([1, 0, 0, 1, 0, 0])
const xuanZhuanJiaoDu = ref(0)
const shuiPingFanZhuan = ref(false)
const chuiZhiFanZhuan = ref(false)
const suoFangBaiFenShu = ref(SUO_FANG_BAI_FEN_XIA)
const suoFangShuRu = ref(String(SUO_FANG_BAI_FEN_XIA))

const biLiXuanXiang = ref(shouLianBiLi(props.kuanGaoBi))
const kuanGaoBi = computed(() => biLiXuanXiang.value)
const biLiShuRu = ref('')

const biLiXuanXiangLieBiao = computed(() =>
  BI_LI_XUAN_XIANG.map((xiang) => ({ ...xiang, xuan: shiXiangTongBiLi(biLiXuanXiang.value, xiang.zhi) })),
)

const shiKouYangShi = computed<Record<string, string>>(() => ({
  width: `${Math.round(QU_YU_GAO_DU * kuanGaoBi.value)}px`,
  maxWidth: '100%',
  height: 'auto',
  aspectRatio: String(kuanGaoBi.value),
}))

const rongQiYangShi = computed<Record<string, string>>(() => {
  const yangShi: Record<string, string> = {
    '--caijian-yulan-bi-li': String(kuanGaoBi.value),
  }
  const cang = quSheZhiCang()
  if (cang) Object.assign(yangShi, cang.qiPaoCSSBianLiang)
  return yangShi
})

function qiuZuiDaGongYue(a: number, b: number): number {
  return b === 0 ? a : qiuZuiDaGongYue(b, a % b)
}

function geShiBiLiWenAn(zhi: number): string {
  for (let n = 1; n <= 40; n += 1) {
    const jiSuan = zhi * n
    if (Math.abs(jiSuan - Math.round(jiSuan)) < 0.01) {
      const zheng = Math.round(jiSuan)
      const yue = qiuZuiDaGongYue(zheng, n) || 1
      return `${zheng / yue}:${n / yue}`
    }
  }
  return String(Math.round(zhi * 1000) / 1000)
}

const biLiWenAn = computed(() =>
  huoQuFanYi('sheZhi', 'caiJianQueRenBiLi').replace('{ratio}', geShiBiLiWenAn(kuanGaoBi.value)),
)

interface ChiCun {
  kuan: number
  gao: number
  yuanKuan: number
  yuanGao: number
}

interface ZhongXin {
  x: number
  y: number
}

function ceLiang(): ChiCun | null {
  const huaBu = huaBuRef.value
  const tuXiang = tuXiangRef.value
  if (!huaBu || !tuXiang) return null
  const huaBuJu = huaBu.getBoundingClientRect()
  const kuan = huaBuJu.width || huaBu.clientWidth
  const gao = huaBuJu.height || huaBu.clientHeight
  const yuanKuan = tuXiang.$image?.naturalWidth || tuXiang.offsetWidth
  const yuanGao = tuXiang.$image?.naturalHeight || tuXiang.offsetHeight
  if (!(kuan > 0) || !(gao > 0) || !(yuanKuan > 0) || !(yuanGao > 0)) return null
  return { kuan, gao, yuanKuan, yuanGao }
}

function jiSuanFuGaiSuoFang(chiCun: ChiCun): number {
  const huDu = (xuanZhuanJiaoDu.value * Math.PI) / 180
  const cos = Math.abs(Math.cos(huDu))
  const sin = Math.abs(Math.sin(huDu))
  const waiKuan = cos * chiCun.yuanKuan + sin * chiCun.yuanGao
  const waiGao = sin * chiCun.yuanKuan + cos * chiCun.yuanGao
  if (!(waiKuan > 0) || !(waiGao > 0)) return 1
  return Math.max(chiCun.kuan / waiKuan, chiCun.gao / waiGao)
}

function jiaZhongXin(zhi: number, kuangChang: number, huaBuChang: number): number {
  if (kuangChang <= huaBuChang) return huaBuChang / 2
  const xia = huaBuChang - kuangChang / 2
  const shang = kuangChang / 2
  const anQuan = Number.isFinite(zhi) ? zhi : huaBuChang / 2
  return Math.min(shang, Math.max(xia, anQuan))
}

function gouZaoJuZhen(chiCun: ChiCun, baiFen: number, zhongXin: ZhongXin | null): number[] {
  const suoFangBi = Math.min(SUO_FANG_BAI_FEN_SHANG, Math.max(SUO_FANG_BAI_FEN_XIA, baiFen)) / 100
  const fuGai = jiSuanFuGaiSuoFang(chiCun)
  const suoFang = fuGai * suoFangBi
  const huDu = (xuanZhuanJiaoDu.value * Math.PI) / 180
  const cos = Math.cos(huDu)
  const sin = Math.sin(huDu)
  const fx = shuiPingFanZhuan.value ? -1 : 1
  const fy = chuiZhiFanZhuan.value ? -1 : 1
  const a = fx * suoFang * cos
  const b = fx * suoFang * sin
  const c = fy * -suoFang * sin
  const d = fy * suoFang * cos
  const kuangKuan = Math.abs(a) * chiCun.yuanKuan + Math.abs(c) * chiCun.yuanGao
  const kuangGao = Math.abs(b) * chiCun.yuanKuan + Math.abs(d) * chiCun.yuanGao
  const zhongXinX = jiaZhongXin(zhongXin?.x ?? chiCun.kuan / 2, kuangKuan, chiCun.kuan)
  const zhongXinY = jiaZhongXin(zhongXin?.y ?? chiCun.gao / 2, kuangGao, chiCun.gao)
  return [
    a,
    b,
    c,
    d,
    zhongXinX - chiCun.yuanKuan / 2,
    zhongXinY - chiCun.yuanGao / 2,
  ]
}

function dangQianZhongXin(chiCun: ChiCun): ZhongXin {
  const juZhen = tuXiangRef.value?.$getTransform() ?? bianHuanJuZhen.value
  return {
    x: chiCun.yuanKuan / 2 + (Number(juZhen[4]) || 0),
    y: chiCun.yuanGao / 2 + (Number(juZhen[5]) || 0),
  }
}

function tongBuXuanQu(chiCun: ChiCun): void {
  const xuanQu = xuanQuRef.value
  if (!xuanQu) return
  xuanQu.$change(0, 0, chiCun.kuan, chiCun.gao, Number.NaN, true)
}

function yingYongJuZhen(chiCun: ChiCun, zhongXin: ZhongXin | null): void {
  const tuXiang = tuXiangRef.value
  if (!tuXiang) return
  const juZhen = gouZaoJuZhen(chiCun, suoFangBaiFenShu.value, zhongXin)
  tuXiang.$setTransform(juZhen)
}

function juZhongYingYong(): void {
  const chiCun = ceLiang()
  if (!chiCun) return
  tongBuXuanQu(chiCun)
  yingYongJuZhen(chiCun, { x: chiCun.kuan / 2, y: chiCun.gao / 2 })
}

function shuaXinBianHuan(shiJian: Event): void {
  const xiJie = (shiJian as CustomEvent<{ matrix?: number[] }>).detail
  const juZhen = Array.isArray(xiJie?.matrix) && xiJie.matrix.length >= 6
    ? xiJie.matrix.slice(0, 6)
    : tuXiangRef.value?.$getTransform()
  if (!juZhen || juZhen.length < 4) return
  const chiCun = zhunBeiJiuXu.value ? ceLiang() : null
  if (chiCun) {
    const suoFang = jiSuanJuZhenSuoFang(juZhen)
    const fuGai = jiSuanFuGaiSuoFang(chiCun)
    const baiFen = (suoFang / fuGai) * 100
    if (baiFen < SUO_FANG_BAI_FEN_XIA - 0.5 || baiFen > SUO_FANG_BAI_FEN_SHANG + 0.5) {
      shiJian.preventDefault()
      return
    }
    suoFangBaiFenShu.value = Math.round(baiFen * 10) / 10
  }
  bianHuanJuZhen.value = [...juZhen]
  qiangZhiShuaXinYuLan()
}

watch(suoFangBaiFenShu, (zhi) => {
  const ru = Number(suoFangShuRu.value)
  if (!suoFangShuRu.value || !Number.isFinite(ru) || Math.abs(ru - zhi) > 1e-6) {
    suoFangShuRu.value = xianShiShu(zhi)
  }
})

function xianShiShu(zhi: number): string {
  const anQuan = Number.isFinite(zhi) ? zhi : 100
  return Math.abs(anQuan - Math.round(anQuan)) > 1e-9 ? anQuan.toFixed(1) : String(Math.round(anQuan))
}

const suoFangWenAn = computed(() => `${xianShiShu(suoFangBaiFenShu.value)}%`)

function sheZhiSuoFang(baiFen: number, juZhong = false): void {
  const ding = Number.isFinite(baiFen)
    ? Math.min(SUO_FANG_BAI_FEN_SHANG, Math.max(SUO_FANG_BAI_FEN_XIA, baiFen))
    : SUO_FANG_BAI_FEN_XIA
  suoFangBaiFenShu.value = Math.round(ding * 10) / 10
  const chiCun = ceLiang()
  if (!chiCun) return
  yingYongJuZhen(chiCun, juZhong ? { x: chiCun.kuan / 2, y: chiCun.gao / 2 } : dangQianZhongXin(chiCun))
}

function tiaoZhengSuoFang(buJin: number): void {
  sheZhiSuoFang(suoFangBaiFenShu.value + buJin)
}

function huaGanSuoFang(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  if (!muBiao) return
  sheZhiSuoFang(Number(muBiao.value))
}

function shuRuSuoFang(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  if (!muBiao) return
  const zhi = Number(muBiao.value)
  if (!Number.isFinite(zhi) || zhi <= 0) {
    suoFangShuRu.value = xianShiShu(suoFangBaiFenShu.value)
    return
  }
  sheZhiSuoFang(zhi)
  suoFangShuRu.value = xianShiShu(suoFangBaiFenShu.value)
}

function shuRuBiLi(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  biLiShuRu.value = muBiao?.value ?? ''
}

function yingYongBiLi(zhi: number): void {
  caiJianCuoWu.value = ''
  biLiXuanXiang.value = zhi
  void nextTick().then(() => {
    juZhongYingYong()
    qiangZhiShuaXinYuLan()
  })
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
  yingYongBiLi(guiYi)
}

function xuanZeBiLi(zhi: number): void {
  if (shiXiangTongBiLi(biLiXuanXiang.value, zhi)) return
  biLiShuRu.value = ''
  yingYongBiLi(zhi)
}

function xuanZhuan(fangXiang: 1 | -1): void {
  xuanZhuanJiaoDu.value = (xuanZhuanJiaoDu.value + fangXiang * 90 + 360) % 360
  juZhongYingYong()
  qiangZhiShuaXinYuLan()
}

function fanZhuan(shuiPing: boolean): void {
  if (shuiPing) shuiPingFanZhuan.value = !shuiPingFanZhuan.value
  else chuiZhiFanZhuan.value = !chuiZhiFanZhuan.value
  const chiCun = ceLiang()
  if (chiCun) yingYongJuZhen(chiCun, dangQianZhongXin(chiCun))
  qiangZhiShuaXinYuLan()
}

function chongZhiBianHuan(): void {
  xuanZhuanJiaoDu.value = 0
  shuiPingFanZhuan.value = false
  chuiZhiFanZhuan.value = false
  suoFangBaiFenShu.value = SUO_FANG_BAI_FEN_XIA
  juZhongYingYong()
  qiangZhiShuaXinYuLan()
}

interface TuoDongZuoBiao {
  x: number
  y: number
}

const huoDongZhiZhen = new Map<number, TuoDongZuoBiao>()
let tuoDongZhiZhenBiaoShi: number | null = null

function tuoDongAnXia(shiJian: PointerEvent): void {
  if (shiJian.pointerType === 'mouse' && shiJian.button !== 0) return
  huoDongZhiZhen.set(shiJian.pointerId, { x: shiJian.clientX, y: shiJian.clientY })
  if (huoDongZhiZhen.size > 1) {
    zhengZaiTuoDong.value = false
    tuoDongZhiZhenBiaoShi = null
    return
  }
  tuoDongZhiZhenBiaoShi = shiJian.pointerId
  zhengZaiTuoDong.value = true
  try {
    huaBuRef.value?.setPointerCapture?.(shiJian.pointerId)
  } catch {
    tuoDongZhiZhenBiaoShi = shiJian.pointerId
  }
  shiJian.preventDefault()
}

function tuoDongYiDong(shiJian: PointerEvent): void {
  const shangCi = huoDongZhiZhen.get(shiJian.pointerId)
  if (!shangCi) return
  const dx = shiJian.clientX - shangCi.x
  const dy = shiJian.clientY - shangCi.y
  huoDongZhiZhen.set(shiJian.pointerId, { x: shiJian.clientX, y: shiJian.clientY })
  if (tuoDongZhiZhenBiaoShi !== shiJian.pointerId || huoDongZhiZhen.size !== 1 || !zhengZaiTuoDong.value) return
  if (!dx && !dy) return
  shiJian.preventDefault()
  tuXiangRef.value?.$move(dx, dy)
}

function tuoDongJieShu(shiJian: PointerEvent): void {
  huoDongZhiZhen.delete(shiJian.pointerId)
  if (tuoDongZhiZhenBiaoShi === shiJian.pointerId) {
    tuoDongZhiZhenBiaoShi = null
    zhengZaiTuoDong.value = false
    try {
      huaBuRef.value?.releasePointerCapture?.(shiJian.pointerId)
    } catch {
      zhengZaiTuoDong.value = false
    }
  }
  if (huoDongZhiZhen.size === 0) zhengZaiTuoDong.value = false
}

let shangCiGunLunShiJian = 0

function gunLunSuoFang(shiJian: WheelEvent): void {
  if (shiJian.ctrlKey || shiJian.metaKey) return
  const zengLiang = guiYiGunLunZengLiang(shiJian.deltaY, shiJian.deltaMode)
  if (!zengLiang) return
  shiJian.preventDefault()
  shiJian.stopImmediatePropagation()
  const xianZai = Date.now()
  if (xianZai - shangCiGunLunShiJian < GUN_LUN_JIAN_GE_HAO_MIAO) return
  shangCiGunLunShiJian = xianZai
  sheZhiSuoFang(suoFangBaiFenShu.value + (zengLiang > 0 ? -GUN_LUN_SUO_FANG_BU_JIN : GUN_LUN_SUO_FANG_BU_JIN))
}

function jiaoDianZaiBianJiKuang(): boolean {
  const jiaoDian = document.activeElement
  return jiaoDian instanceof HTMLInputElement
    || jiaoDian instanceof HTMLTextAreaElement
    || jiaoDian instanceof HTMLSelectElement
    || (jiaoDian instanceof HTMLElement && jiaoDian.isContentEditable)
}

function chuFaAnJian(shiJian: KeyboardEvent): void {
  if (shiJian.defaultPrevented) return
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    quXiao()
    return
  }
  if (shiJian.ctrlKey || shiJian.metaKey || shiJian.altKey) return
  const bu = jiSuanJianPanPingYi(shiJian.key, shiJian.shiftKey, JIAN_PAN_PING_YI_BU_CHANG)
  if (!bu.x && !bu.y) return
  if (jiaoDianZaiBianJiKuang()) return
  shiJian.preventDefault()
  tuXiangRef.value?.$move(bu.x, bu.y)
}

function jieHuoCtrlGunLun(shiJian: WheelEvent): void {
  if (!shiJian.ctrlKey || tuPianJiaZaiShiBai.value) return
  if (jiaoDianZaiBianJiKuang()) return
  const zengLiang = guiYiGunLunZengLiang(shiJian.deltaY, shiJian.deltaMode)
  const bu = jiSuanGunLunPingYi(zengLiang, GUN_LUN_PING_YI_XI_SHU)
  if (!bu.x && !bu.y) return
  shiJian.preventDefault()
  shiJian.stopPropagation()
  tuXiangRef.value?.$move(bu.x, bu.y)
}

function jieHuoCtrlGunLunQuanJu(shiJian: Event): void {
  jieHuoCtrlGunLun(shiJian as WheelEvent)
}

function keJuJiaoLieBiao(): HTMLElement[] {
  if (!rongQiRef.value) return []
  return Array.from(
    rongQiRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    shiJian.stopPropagation()
    quXiao()
    return
  }
  if (shiJian.key !== 'Tab' || !rongQiRef.value) return
  const lieBiao = keJuJiaoLieBiao()
  if (lieBiao.length === 0) {
    shiJian.preventDefault()
    rongQiRef.value.focus({ preventScroll: true })
    return
  }
  const shou = lieBiao[0]
  const wei = lieBiao[lieBiao.length - 1]
  if (!(document.activeElement instanceof HTMLElement) || !rongQiRef.value.contains(document.activeElement)) {
    shiJian.preventDefault()
    shou.focus()
    return
  }
  if (shiJian.shiftKey && document.activeElement === shou) {
    shiJian.preventDefault()
    wei.focus()
    return
  }
  if (!shiJian.shiftKey && document.activeElement === wei) {
    shiJian.preventDefault()
    shou.focus()
  }
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

const yuLanLeiXingZhi = computed<'beiJing' | 'qiPao'>(() => (props.yuLanLeiXing === 'qiPao' ? 'qiPao' : 'beiJing'))

function dangQianLaShenMoShi(): WaiGuanLaShenMoShi {
  const cang = quSheZhiCang()
  if (!cang) return 'dengBi'
  return props.yuLanLeiXing === 'qiPao' ? cang.qiPaoLaShenMoShi : cang.beiJingLaShenMoShi
}

const yuLanWenZiYanSe = computed(() => {
  const cang = quSheZhiCang()
  if (!cang) return WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
  const tiaoMu = props.yuLanCeZhong === 'ai' ? cang.dangQianAiQiPaoTu : cang.dangQianZiJiQiPaoTu
  return tiaoMu?.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
})

const yuLanFuGaiYangShi = computed<Record<string, string>>(() => {
  const yangShi: Record<string, string> = {
    '--caijian-yulan-chi-cun': huoQuLaShenChiCunZhi(dangQianLaShenMoShi()),
  }
  if (!yuLanDiZhi.value) return yangShi
  const zhi =
    props.yuLanLeiXing === 'qiPao'
      ? huoQuQiPaoBeiJingZhi(yuLanDiZhi.value, yuLanWenZiYanSe.value, dangQianLaShenMoShi())
      : `url("${yuLanDiZhi.value}")`
  yangShi['--caijian-yulan-fu-gai'] = zhi
  return yangShi
})

let yuLanPaiZhen = 0
let yiXiaoHui = false
let yuLanDaoLuZhong = false
let yuLanDaiZhong = false
let yuLanChongShi = 0
let yuLanCuoWuYiJi = false

function anPaiYuLanChongShi(): void {
  if (yiXiaoHui || !shiLiaoTianYuLan.value || yuLanDiZhi.value || yuLanChongShi || tuPianJiaZaiShiBai.value) return
  yuLanChongShi = window.setTimeout(() => {
    yuLanChongShi = 0
    qiangZhiShuaXinYuLan()
  }, 1000)
}

function qiangZhiShuaXinYuLan(): void {
  if (yiXiaoHui || !shiLiaoTianYuLan.value || tuPianJiaZaiShiBai.value) return
  if (yuLanPaiZhen) return
  yuLanPaiZhen = window.setTimeout(() => {
    yuLanPaiZhen = 0
    void shuaXinYuLan()
  }, 16)
}

async function shuaXinYuLan(): Promise<void> {
  if (yiXiaoHui || !shiLiaoTianYuLan.value || tuPianJiaZaiShiBai.value) return
  if (yuLanDaoLuZhong) {
    yuLanDaiZhong = true
    return
  }
  const huaBu = huaBuRef.value
  if (!huaBu) {
    anPaiYuLanChongShi()
    return
  }
  const chiCun = ceLiang()
  const suoFang = jiSuanJuZhenSuoFang(tuXiangRef.value?.$getTransform() ?? bianHuanJuZhen.value)
  const kuan = jiSuanDaoChuKuan(chiCun?.kuan ?? YU_LAN_MO_REN_KUAN, suoFang, kuanGaoBi.value, YU_LAN_ZUI_DA_BIAN)
  yuLanDaoLuZhong = true
  try {
    const huaBuJieGuo = await huaBu.$toCanvas({
      width: kuan,
      beforeDraw: (shangXiaWen) => {
        shangXiaWen.imageSmoothingEnabled = true
        shangXiaWen.imageSmoothingQuality = 'high'
      },
    })
    if (!yiXiaoHui && shiLiaoTianYuLan.value) yuLanDiZhi.value = huaBuJieGuo.toDataURL('image/png')
  } catch (cuoWu) {
    if (!tuPianJiaZaiShiBai.value && !yuLanCuoWuYiJi) {
      yuLanCuoWuYiJi = true
      console.error('裁剪预览导出失败', cuoWu)
    }
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

function xiaYiZhen(): Promise<void> {
  return new Promise((jieJue) => window.setTimeout(() => jieJue(), 0))
}

async function chuShiHua(): Promise<void> {
  await nextTick()
  if (yiXiaoHui) return
  await xiaYiZhen()
  if (yiXiaoHui) return
  zhunBeiJiuXu.value = true
  juZhongYingYong()
  qiangZhiShuaXinYuLan()
}

async function dengDaiTuPian(): Promise<void> {
  try {
    await tuXiangRef.value?.$ready()
  } catch {
    return
  }
  if (yiXiaoHui) return
  zhunBeiJiuXu.value = true
  juZhongYingYong()
  qiangZhiShuaXinYuLan()
}

function tuPianNeiBuJiaZai(): void {
  tuPianJiaZaiShiBai.value = false
  yuLanCuoWuYiJi = false
  zhunBeiJiuXu.value = true
  juZhongYingYong()
  qiangZhiShuaXinYuLan()
}

function tuPianNeiBuCuoWu(): void {
  tuPianJiaZaiShiBai.value = true
  caiJianCuoWu.value = ''
}

let neiBuTuPian: HTMLImageElement | null = null
let chiCunGuanCha: ResizeObserver | null = null
let yuanShiYiChu = ''
let yuJianXuHao = 0
let yuJianDingShi: number | null = null
let yaSuoDuiXiangDiZhi = ''

function qingLiYuJian(): void {
  if (yuJianDingShi !== null) {
    window.clearTimeout(yuJianDingShi)
    yuJianDingShi = null
  }
}

function huiShouYaSuoDiZhi(): void {
  if (!yaSuoDuiXiangDiZhi) return
  URL.revokeObjectURL(yaSuoDuiXiangDiZhi)
  yaSuoDuiXiangDiZhi = ''
}

function yaSuoChaoDaTuPian(tuPian: HTMLImageElement): void {
  const kuan = tuPian.naturalWidth
  const gao = tuPian.naturalHeight
  if (!(kuan > 0) || !(gao > 0)) return
  const chaoXiangSu = kuan * gao > YA_SUO_YUAN_XIANG_SU
  if (!chaoXiangSu && kuan <= YA_SUO_YUAN_BIAN && gao <= YA_SUO_YUAN_BIAN) return
  const bi = Math.min(YA_SUO_HOU_BIAN / kuan, YA_SUO_HOU_BIAN / gao, 1)
  const huaBu = document.createElement('canvas')
  huaBu.width = Math.max(1, Math.round(kuan * bi))
  huaBu.height = Math.max(1, Math.round(gao * bi))
  const shangXiaWen = huaBu.getContext('2d')
  if (!shangXiaWen) return
  shangXiaWen.imageSmoothingEnabled = true
  shangXiaWen.imageSmoothingQuality = 'high'
  shangXiaWen.drawImage(tuPian, 0, 0, huaBu.width, huaBu.height)
  const mime = props.yuanMime === 'image/png' ? 'image/png' : 'image/jpeg'
  huaBu.toBlob(
    (blob) => {
      if (!blob) return
      huiShouYaSuoDiZhi()
      yaSuoDuiXiangDiZhi = URL.createObjectURL(blob)
      xuanZhuanJiaoDu.value = 0
      shuiPingFanZhuan.value = false
      chuiZhiFanZhuan.value = false
      suoFangBaiFenShu.value = SUO_FANG_BAI_FEN_XIA
      shiJiTuYuan.value = yaSuoDuiXiangDiZhi
    },
    mime,
    0.92,
  )
}

function anPaiYuJian(): void {
  const diZhi = props.tuYuan
  if (!diZhi || diZhi.startsWith('data:')) return
  const xuHao = ++yuJianXuHao
  const tuPian = new Image()
  tuPian.decoding = 'async'
  const jieShu = (shiBai: boolean): void => {
    if (xuHao !== yuJianXuHao) return
    qingLiYuJian()
    tuPian.onload = null
    tuPian.onerror = null
    if (shiBai) {
      tuPianJiaZaiShiBai.value = true
      return
    }
    tuPianJiaZaiShiBai.value = false
    yaSuoChaoDaTuPian(tuPian)
  }
  tuPian.onload = () => jieShu(false)
  tuPian.onerror = () => jieShu(true)
  yuJianDingShi = window.setTimeout(() => jieShu(true), YU_JIAN_CHAO_SHI_HAO_MIAO)
  tuPian.src = diZhi
}

watch(() => props.tuYuan, (zhi) => {
  yuJianXuHao += 1
  qingLiYuJian()
  huiShouYaSuoDiZhi()
  xuanZhuanJiaoDu.value = 0
  shuiPingFanZhuan.value = false
  chuiZhiFanZhuan.value = false
  suoFangBaiFenShu.value = SUO_FANG_BAI_FEN_XIA
  bianHuanJuZhen.value = [1, 0, 0, 1, 0, 0]
  if (zhi !== shiJiTuYuan.value) shiJiTuYuan.value = zhi
  anPaiYuJian()
})

watch(shiJiTuYuan, () => {
  caiJianCuoWu.value = ''
  tuPianJiaZaiShiBai.value = false
  bianHuanJuZhen.value = [1, 0, 0, 1, 0, 0]
  void nextTick().then(() => {
    void dengDaiTuPian()
    void xiaYiZhen().then(() => chuShiHua())
  })
})

function quXiao(): void {
  if (zhengZaiShengCheng.value) return
  emit('qu-xiao')
}

async function queRen(): Promise<void> {
  if (zhengZaiShengCheng.value || tuPianJiaZaiShiBai.value) return
  const huaBu = huaBuRef.value
  if (!huaBu || !zhunBeiJiuXu.value) return
  caiJianCuoWu.value = ''
  zhengZaiShengCheng.value = true
  try {
    const chiCun = ceLiang()
    const suoFang = jiSuanJuZhenSuoFang(tuXiangRef.value?.$getTransform() ?? bianHuanJuZhen.value)
    const kuan = jiSuanDaoChuKuan(
      chiCun?.kuan ?? 0,
      suoFang,
      kuanGaoBi.value,
      TU_PIAN_SHU_CHU_ZUI_DA_BIAN,
    )
    const geShi = jueDingShuChuGeShi(props.yuanMime)
    const wenJian = await daoChuCaiJianWenJian(huaBu, geShi, props.wenJianMing, kuan)
    emit('que-ren', wenJian)
  } catch (cuoWu) {
    console.error('裁剪导出失败', cuoWu)
    caiJianCuoWu.value = huoQuFanYi('tongYong', 'caoZuoShiBai')
  } finally {
    zhengZaiShengCheng.value = false
  }
}

onMounted(() => {
  zhunBeiJiuXu.value = true
  if (props.yuanMime && !props.yuanMime.startsWith('image/')) {
    caiJianCuoWu.value = huoQuFanYi('tongYong', 'feiTuPianTiShi')
    tuPianJiaZaiShiBai.value = true
  }
  document.addEventListener('keydown', chuFaAnJian)
  document.addEventListener('wheel', jieHuoCtrlGunLunQuanJu, { capture: true, passive: false })
  yuanShiYiChu = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  neiBuTuPian = tuXiangRef.value?.$image ?? null
  neiBuTuPian?.addEventListener('load', tuPianNeiBuJiaZai)
  neiBuTuPian?.addEventListener('error', tuPianNeiBuCuoWu)
  if (typeof ResizeObserver !== 'undefined') {
    chiCunGuanCha = new ResizeObserver(() => {
      if (!zhunBeiJiuXu.value) return
      juZhongYingYong()
      qiangZhiShuaXinYuLan()
    })
    if (huaBuRef.value) chiCunGuanCha.observe(huaBuRef.value)
  }
  anPaiYuJian()
  void nextTick().then(() => {
    if (rongQiRef.value) {
      rongQiRef.value.scrollTop = 0
      rongQiRef.value.focus({ preventScroll: true })
    }
  })
  void chuShiHua()
  void dengDaiTuPian()
})

onBeforeUnmount(() => {
  yiXiaoHui = true
  document.removeEventListener('keydown', chuFaAnJian)
  document.removeEventListener('wheel', jieHuoCtrlGunLunQuanJu, true)
  document.body.style.overflow = yuanShiYiChu
  neiBuTuPian?.removeEventListener('load', tuPianNeiBuJiaZai)
  neiBuTuPian?.removeEventListener('error', tuPianNeiBuCuoWu)
  neiBuTuPian = null
  chiCunGuanCha?.disconnect()
  chiCunGuanCha = null
  yuJianXuHao += 1
  qingLiYuJian()
  huiShouYaSuoDiZhi()
  if (yuLanPaiZhen) {
    window.clearTimeout(yuLanPaiZhen)
    yuLanPaiZhen = 0
  }
  if (yuLanChongShi) {
    window.clearTimeout(yuLanChongShi)
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
  --caijian-yulan-bi-li: 3 / 4;

  background: var(--caijian-mian);
  border: 1px solid var(--caijian-xian);
  border-radius: 20px;
  padding: var(--jiange-da);
  max-width: 380px;
  width: 100%;
  max-height: min(88vh, 860px);
  overflow-y: auto;
  text-align: center;
  outline: none;
}

.caijian-zhezhao {
  --caijian-mian: rgba(20, 24, 40, 0.95);
  --caijian-xian: rgba(255, 255, 255, 0.1);
  --caijian-huabu-mian: #0a0a12;
  --caijian-ci-wenben: rgba(255, 255, 255, 0.55);
  --caijian-kong-xian: rgba(255, 255, 255, 0.2);
  --caijian-kong-wenben: rgba(255, 255, 255, 0.8);
  --caijian-zhuse: #07c160;
  --caijian-tuxiang-bian: rgba(255, 255, 255, 0.16);
  --caijian-tuxiang-ying: rgba(0, 0, 0, 0.32);
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

.caijian-shitu {
  display: flex;
  justify-content: center;
  min-width: 0;
}

.caijian-huabu {
  position: relative;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  margin: 0 auto;
  border-radius: 14px;
  overflow: hidden;
  background: var(--caijian-huabu-mian);
  box-shadow:
    0 0 0 1px var(--caijian-tuxiang-bian),
    0 10px 28px var(--caijian-tuxiang-ying);
  cursor: grab;
}

.caijian-huabu--tuozhong {
  cursor: grabbing;
}

.caijian-tuxiang,
.caijian-xuanqu {
  pointer-events: none;
}

.caijian-xuanqu {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
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

.caijian-yulan--beiJing :deep(.yu-lan-xiao-xi-qu) {
  width: 100%;
  min-height: 0;
  aspect-ratio: var(--caijian-yulan-bi-li, 3 / 4);
}

.caijian-yulan--beiJing :deep(.liao-tian-mian-ban) {
  background: var(--caijian-yulan-fu-gai, var(--liaotian-beijing)) center / var(--caijian-yulan-chi-cun, cover) no-repeat !important;
}

.caijian-yulan--ce-ziJi :deep(.qipao-neirong--benren) {
  --qipao-weiba-tian-chong: var(--caijian-yulan-fu-gai) !important;

  background: var(--caijian-yulan-fu-gai) !important;
}

.caijian-yulan--ce-ai :deep(.qipao-neirong--jiaose) {
  --qipao-weiba-tian-chong: var(--caijian-yulan-fu-gai) !important;

  background: var(--caijian-yulan-fu-gai) !important;
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
  min-width: 0;
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
  --tian-chong-xian: var(--caijian-kong-xian);
  --tian-chong-wenben: var(--caijian-kong-wenben);
  --tian-chong-zhuse: var(--caijian-zhuse);
  --tian-chong-xuan-beijing: rgba(7, 193, 96, 0.12);

  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--jiange-6);
  margin-top: var(--jiange-10);
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
  .bili-ka {
    transition: none;
  }
}
</style>
