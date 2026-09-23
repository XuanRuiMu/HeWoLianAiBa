<template>
  <div class="caijian-zhezhao" @click.self="quXiao">
    <div class="caijian-rongqi" role="dialog" aria-modal="true" :aria-label="huoQuFanYi('sheZhi', 'touXiangCaiJian')">
      <h3 class="caijian-biaoti">{{ huoQuFanYi('sheZhi', 'touXiangCaiJian') }}</h3>
      <div
        ref="shiKouRef"
        class="caijian-shikou"
        @pointerdown="kaiShiTuo"
        @pointermove="chuLiTuo"
        @pointerup="jieShuTuo"
        @pointercancel="jieShuTuo"
        @wheel.prevent="chuLiGunLun"
      >
        <img
          ref="tuRef"
          :src="tuYuan"
          class="caijian-tu"
          :style="tuYangShi"
          draggable="false"
          alt=""
          @load="chuShiHuaTu"
        />
        <div class="caijian-zhe-zhao-wangge" aria-hidden="true" />
      </div>
      <p class="caijian-tishi">{{ huoQuFanYi('sheZhi', 'touXiangCaiJianTiShi') }}</p>
      <div class="suofang-hang">
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'suoXiao')" @click="tiaoZhengSuoFang(-0.2)">−</button>
        <input
          v-model.number="suoFangBeiShu"
          class="suofang-huatiao"
          type="range"
          :min="1"
          :max="4"
          :step="0.05"
          :aria-label="huoQuFanYi('sheZhi', 'suoFang')"
        />
        <button class="suofang-anniu" :aria-label="huoQuFanYi('sheZhi', 'fangDa')" @click="tiaoZhengSuoFang(0.2)">＋</button>
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
import { ref, computed, watch } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import {
  jiSuanJiChuSuoFang,
  yueShuPianYi,
  jiSuanYuanQu,
  jueDingShuChuGeShi,
  xuanRanTouXiang,
} from '@/utils/头像裁剪'

const QU_YU_BIAN_CHANG = 260

const props = defineProps<{
  tuYuan: string
  yuanMime: string
}>()

const emit = defineEmits<{
  (e: 'que-ren', wenJian: Blob): void
  (e: 'qu-xiao'): void
}>()

const tuRef = ref<HTMLImageElement | null>(null)
const shiKouRef = ref<HTMLElement | null>(null)
const yuanKuan = ref(0)
const yuanGao = ref(0)
const suoFangBeiShu = ref(1)
const pianYi = ref({ x: 0, y: 0 })
const zhengZaiTuo = ref(false)
const tuoQiDian = ref({ x: 0, y: 0, pianYiX: 0, pianYiY: 0 })
const zhengZaiShengCheng = ref(false)

const dangQianSuoFang = computed(() => {
  if (!yuanKuan.value || !yuanGao.value) return 1
  return jiSuanJiChuSuoFang(yuanKuan.value, yuanGao.value, QU_YU_BIAN_CHANG) * suoFangBeiShu.value
})

const xuanRanChiCun = computed(() => ({
  kuan: yuanKuan.value * dangQianSuoFang.value,
  gao: yuanGao.value * dangQianSuoFang.value,
}))

const tuYangShi = computed(() => ({
  width: `${xuanRanChiCun.value.kuan}px`,
  height: `${xuanRanChiCun.value.gao}px`,
  transform: `translate(${pianYi.value.x}px, ${pianYi.value.y}px)`,
}))

function yueShuDangQianPianYi() {
  pianYi.value = yueShuPianYi(
    pianYi.value.x,
    pianYi.value.y,
    xuanRanChiCun.value.kuan,
    xuanRanChiCun.value.gao,
    QU_YU_BIAN_CHANG,
  )
}

watch(suoFangBeiShu, () => {
  if (suoFangBeiShu.value < 1) suoFangBeiShu.value = 1
  if (suoFangBeiShu.value > 4) suoFangBeiShu.value = 4
  yueShuDangQianPianYi()
})

function chuShiHuaTu() {
  const tu = tuRef.value
  if (!tu || !tu.naturalWidth) return
  yuanKuan.value = tu.naturalWidth
  yuanGao.value = tu.naturalHeight
  suoFangBeiShu.value = 1
  pianYi.value = yueShuPianYi(
    (QU_YU_BIAN_CHANG - tu.naturalWidth * dangQianSuoFang.value) / 2,
    (QU_YU_BIAN_CHANG - tu.naturalHeight * dangQianSuoFang.value) / 2,
    tu.naturalWidth * dangQianSuoFang.value,
    tu.naturalHeight * dangQianSuoFang.value,
    QU_YU_BIAN_CHANG,
  )
}

function kaiShiTuo(shiJian: PointerEvent) {
  zhengZaiTuo.value = true
  tuoQiDian.value = { x: shiJian.clientX, y: shiJian.clientY, pianYiX: pianYi.value.x, pianYiY: pianYi.value.y }
  ;(shiJian.target as HTMLElement).setPointerCapture?.(shiJian.pointerId)
}

function chuLiTuo(shiJian: PointerEvent) {
  if (!zhengZaiTuo.value) return
  pianYi.value = yueShuPianYi(
    tuoQiDian.value.pianYiX + (shiJian.clientX - tuoQiDian.value.x),
    tuoQiDian.value.pianYiY + (shiJian.clientY - tuoQiDian.value.y),
    xuanRanChiCun.value.kuan,
    xuanRanChiCun.value.gao,
    QU_YU_BIAN_CHANG,
  )
}

function jieShuTuo() {
  zhengZaiTuo.value = false
}

function chuLiGunLun(shiJian: WheelEvent) {
  tiaoZhengSuoFang(shiJian.deltaY < 0 ? 0.15 : -0.15)
}

function tiaoZhengSuoFang(buJin: number) {
  suoFangBeiShu.value = Math.max(1, Math.min(4, suoFangBeiShu.value + buJin))
  yueShuDangQianPianYi()
}

function quXiao() {
  emit('qu-xiao')
}

async function queRen() {
  const tu = tuRef.value
  if (!tu || !yuanKuan.value || zhengZaiShengCheng.value) return
  zhengZaiShengCheng.value = true
  try {
    const yuanQu = jiSuanYuanQu({
      yuanKuan: yuanKuan.value,
      yuanGao: yuanGao.value,
      suoFang: dangQianSuoFang.value,
      pianYiX: pianYi.value.x,
      pianYiY: pianYi.value.y,
      quYuBianChang: QU_YU_BIAN_CHANG,
    })
    const geShi = jueDingShuChuGeShi(props.yuanMime)
    const jieGuo = await xuanRanTouXiang(tu, yuanQu, geShi.mime)
    emit('que-ren', new File([jieGuo], `touXiang.${geShi.houZhui}`, { type: geShi.mime }))
  } finally {
    zhengZaiShengCheng.value = false
  }
}
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
  padding: 24px;
  z-index: 1000;
}

.caijian-rongqi {
  background: rgba(20, 24, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  max-width: 340px;
  width: 100%;
  text-align: center;
}

.caijian-biaoti {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
}

.caijian-shikou {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 16px;
  background: #0a0a12;
  touch-action: none;
  cursor: grab;
}

.caijian-shikou:active {
  cursor: grabbing;
}

.caijian-tu {
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.caijian-zhe-zhao-wangge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 33.34% 33.34%;
}

.caijian-tishi {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  margin: 12px 0;
}

.suofang-hang {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.suofang-anniu {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.suofang-huatiao {
  flex: 1;
  accent-color: #07c160;
}

.caijian-anniu-zu {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.anniu-fu-zhu {
  padding: 12px 24px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.anniu-que-ren {
  padding: 12px 24px;
  background: linear-gradient(135deg, #07c160, #05a050);
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
</style>
