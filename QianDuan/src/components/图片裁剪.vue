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
          movable
          resizable
          keyboard
          precise
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
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'fangDa')" @click="tiaoZhengSuoFang(0.1)">＋</button>
        <span class="suofang-bai-fen" aria-hidden="true">{{ suoFangBaiFenShu }}%</span>
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
import { daoChuCaiJianWenJian, jueDingShuChuGeShi } from '@/utils/图片裁剪'

const QU_YU_GAO_DU = 260

const props = withDefaults(
  defineProps<{
    tuYuan: string
    yuanMime: string
    biaoTi: string
    tiShi: string
    kuanGaoBi?: number
    wenJianMing?: string
  }>(),
  {
    kuanGaoBi: 1,
    wenJianMing: 'tupian',
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

const shuiPingFanZhuan = computed(() => bianHuanJuZhen.value[0] < 0)
const chuiZhiFanZhuan = computed(() => bianHuanJuZhen.value[3] < 0)
const dangQianSuoFang = computed(() => Math.max(0.01, Math.abs(bianHuanJuZhen.value[0]) || 0.01))
const suoFangBaiFenShu = computed(() => Math.round(dangQianSuoFang.value * 100))

const biLiWenAn = computed(() => {
  const zuiDaShu = 40
  for (let n = 1; n <= zuiDaShu; n += 1) {
    const jiSuan = props.kuanGaoBi * n
    if (Math.abs(jiSuan - Math.round(jiSuan)) < 0.01) {
      const zheng = Math.round(jiSuan)
      const qiuHe = (a: number, b: number): number => (b === 0 ? a : qiuHe(b, a % b))
      const yue = qiuHe(zheng, n) || 1
      return huoQuFanYi('sheZhi', 'caiJianQueRenBiLi').replace('{ratio}', `${zheng / yue}:${n / yue}`)
    }
  }
  return huoQuFanYi('sheZhi', 'caiJianQueRenBiLi').replace('{ratio}', String(props.kuanGaoBi))
})

function shuaXinBianHuan(): void {
  const juZhen = tuXiangRef.value?.$getTransform()
  if (juZhen && juZhen.length >= 4) bianHuanJuZhen.value = [...juZhen]
}

const tuPianJiaZaiShiBai = ref(false)

watch(() => props.tuYuan, () => {
  tuPianJiaZaiShiBai.value = false
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
  const huaBuJu = huaBu.getBoundingClientRect()
  const tuJu = tuXiang.getBoundingClientRect()
  if (!huaBuJu.width || !huaBuJu.height || !tuJu.width || !tuJu.height) return
  let kuan = tuJu.width
  let gao = kuan / props.kuanGaoBi
  if (gao > tuJu.height) {
    gao = tuJu.height
    kuan = gao * props.kuanGaoBi
  }
  const x = tuJu.left - huaBuJu.left + (tuJu.width - kuan) / 2
  const y = tuJu.top - huaBuJu.top + (tuJu.height - gao) / 2
  xuanQu.$change(x, y, kuan, gao, props.kuanGaoBi)
}

function xuanZhuan(fangXiang: 1 | -1): void {
  tuXiangRef.value?.$rotate((fangXiang * Math.PI) / 2)
  shuaXinBianHuan()
}

function fanZhuan(shuiPing: boolean): void {
  if (shuiPing) tuXiangRef.value?.$scale(-1, 1)
  else tuXiangRef.value?.$scale(1, -1)
  shuaXinBianHuan()
}

function chongZhiBianHuan(): void {
  const tuXiang = tuXiangRef.value
  if (!tuXiang) return
  if (chuShiJuZhen) tuXiang.$setTransform(chuShiJuZhen)
  else tuXiang.$resetTransform()
  shuaXinBianHuan()
  chuShiHuaXuanQu()
}

function tiaoZhengSuoFang(buJin: number): void {
  tuXiangRef.value?.$zoom(buJin)
  shuaXinBianHuan()
}

function huaGanSuoFang(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  if (!muBiao) return
  const baiFenShu = Math.max(50, Math.min(400, Number(muBiao.value)))
  const yinZi = baiFenShu / 100 / dangQianSuoFang.value
  if (Number.isFinite(yinZi) && yinZi > 0) tuXiangRef.value?.$zoom(yinZi)
  shuaXinBianHuan()
}

function quXiao(): void {
  if (zhengZaiShengCheng.value) return
  emit('qu-xiao')
}

async function queRen(): Promise<void> {
  const xuanQu = xuanQuRef.value
  if (!xuanQu || zhengZaiShengCheng.value) return
  zhengZaiShengCheng.value = true
  try {
    const geShi = jueDingShuChuGeShi(props.yuanMime)
    const wenJian = await daoChuCaiJianWenJian(xuanQu, geShi, props.wenJianMing)
    emit('que-ren', wenJian)
  } finally {
    zhengZaiShengCheng.value = false
  }
}

function chuFaAnJian(shiJian: KeyboardEvent): void {
  if (shiJian.key === 'Escape') quXiao()
}

onMounted(() => {
  document.addEventListener('keydown', chuFaAnJian)
  void tuXiangRef.value?.$ready().then(chuShiHuaXuanQu).catch(() => undefined)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', chuFaAnJian)
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

.suofang-bai-fen {
  flex: none;
  min-width: 44px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
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
  .caijian-gongju-anniu {
    transition: none;
  }
}
</style>
