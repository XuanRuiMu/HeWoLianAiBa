<template>
  <div class="tonghua-zhezhao" :class="{ 'shipin-xingshi': shiShiPin }">
    <header class="tonghua-dingbu">
      <span class="duifang-nicheng">{{ tongHua.duiFangNiCheng }}</span>
      <span v-if="tongHua.zhuangTai !== 'yiJieTong'" class="zhuangtai-wenben">{{
        zhuangTaiWenBen
      }}</span>
    </header>

    <div class="tonghua-zhongyang">
      <template v-if="!shiShiPin">
        <div class="huxi-waiquan" aria-hidden="true" />
        <div class="tonghua-touxiang">
          <img
            v-if="shiTuPianDiZhi(tongHua.duiFangTouXiang)"
            :src="tongHua.duiFangTouXiang || undefined"
            alt=""
          />
          <span v-else>{{ tongHua.duiFangTouXiang || '👤' }}</span>
        </div>
        <p v-if="shiYiJieTong" class="jishi-da-ziti">{{ jiShiWenBen }}</p>
      </template>
      <template v-else>
        <div class="yuanduan-zhanwei">
          <div class="rouguang-huan" aria-hidden="true" />
          <div class="tonghua-touxiang touxiang-xiao">
            <img
              v-if="shiTuPianDiZhi(tongHua.duiFangTouXiang)"
              :src="tongHua.duiFangTouXiang || undefined"
              alt=""
            />
            <span v-else>{{ tongHua.duiFangTouXiang || '👤' }}</span>
          </div>
          <p class="zhanwei-tishi">{{ huoQuFanYi('tongHua', 'duiFangHuaMianZanShiBuKeYong') }}</p>
          <p v-if="shiYiJieTong" class="jishi-wenben">{{ jiShiWenBen }}</p>
        </div>
      </template>
    </div>

    <div
      v-if="shiShiPin"
      ref="benDiChuangRef"
      class="bendi-chuang"
      :style="chuangKouYangShi"
      @pointerdown.prevent="tuoDongKaiShi"
      @pointermove="tuoDongYiDong"
      @pointerup="tuoDongJieShu"
      @pointercancel="tuoDongJieShu"
    >
      <video ref="benDiShiPingRef" class="bendi-shiping" muted autoplay playsinline />
    </div>

    <footer class="kongzhi-qu">
      <template v-if="shiShiPin && !shiZhongTai">
        <button
          class="kongzhi-an"
          :class="{ yiguanbi: !tongHua.maiKeFengKaiQi }"
          :aria-pressed="tongHua.maiKeFengKaiQi"
          :aria-label="huoQuFanYi('tongHua', 'maiKeFeng')"
          :title="huoQuFanYi('tongHua', 'maiKeFeng')"
          @click="tongHua.qieHuanMaiKeFeng()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        <button class="kongzhi-an guaduan-an" :aria-label="guaDuanAnBiaoQian" @click="chuLiGuaDuan">
          <svg
            class="tingtong-tubiao"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            />
          </svg>
        </button>
        <button
          class="kongzhi-an"
          :class="{ yiguanbi: !tongHua.sheXiangTouKaiQi }"
          :aria-pressed="tongHua.sheXiangTouKaiQi"
          :aria-label="huoQuFanYi('tongHua', 'sheXiangTou')"
          :title="huoQuFanYi('tongHua', 'sheXiangTou')"
          @click="tongHua.qieHuanSheXiangTou()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
      </template>
      <template v-else-if="!shiZhongTai">
        <span class="ciji-zhanyue" aria-hidden="true" />
        <button class="kongzhi-an guaduan-an" :aria-label="guaDuanAnBiaoQian" @click="chuLiGuaDuan">
          <svg
            class="tingtong-tubiao"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            />
          </svg>
        </button>
        <span class="ciji-zhanyue" aria-hidden="true" />
      </template>
    </footer>

    <button v-if="!shiShiPin && shiZhenLing" class="quxiao-cijian" @click="tongHua.quXiaoTongHua()">
      {{ huoQuFanYi('tongHua', 'quXiao') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { 使用通话仓库 } from '@/stores/通话'
import { huoQuFanYi } from '@/config/translations'
import { shiTuPianDiZhi } from '@/utils/头像'

const tongHua = 使用通话仓库()

const CHUANG_KOU_KUAN = 160
const CHUANG_KOU_GAO = 213
const CHUANG_KOU_BIAN_JU = 16

const benDiChuangRef = ref<HTMLElement | null>(null)
const benDiShiPingRef = ref<HTMLVideoElement | null>(null)
const chuangKouWeiZhi = ref({ left: CHUANG_KOU_BIAN_JU, top: CHUANG_KOU_BIAN_JU })
let tuoDongZhong = false
let zhiDianPianYiX = 0
let zhiDianPianYiY = 0

const shiShiPin = computed(() => tongHua.leiXing === 'shiPin')
const shiZhenLing = computed(() => tongHua.zhuangTai === 'zhenLing')
const shiYiJieTong = computed(() => tongHua.zhuangTai === 'yiJieTong')
const shiZhongTai = computed(() => tongHua.zhuangTai === 'yiJieShu')

const zhuangTaiWenBen = computed(() => {
  if (tongHua.zhuangTai === 'zhenLing') {
    return huoQuFanYi('tongHua', 'zhengZaiDengDaiDuiFangJieShu')
  }
  if (tongHua.zhuangTai === 'yiJieTong') return huoQuFanYi('tongHua', 'yiLianJie')
  if (tongHua.zhuangTai === 'yiJieShu') {
    return huoQuFanYi(
      'tongHua',
      tongHua.zuiHouZhongTai === 'yiQuXiao' ? 'tongHuaYiQuXiao' : 'yiJieShu',
    )
  }
  return ''
})

const jiShiWenBen = computed(() => geShiHuaShiChang(tongHua.jiShiMiao))
const guaDuanAnBiaoQian = computed(() =>
  shiZhenLing.value ? huoQuFanYi('tongHua', 'quXiao') : huoQuFanYi('tongHua', 'guaDuan'),
)

const chuangKouYangShi = computed(() => ({
  left: `${chuangKouWeiZhi.value.left}px`,
  top: `${chuangKouWeiZhi.value.top}px`,
}))

function geShiHuaShiChang(zongMiao: number): string {
  const fen = Math.floor(zongMiao / 60)
  const miao = zongMiao % 60
  return `${String(fen).padStart(2, '0')}:${String(miao).padStart(2, '0')}`
}

function qianZhiZhi(zhi: number, xiaXian: number, shangXian: number): number {
  if (shangXian <= xiaXian) return Math.max(xiaXian, 0)
  return Math.min(Math.max(zhi, xiaXian), shangXian)
}

function chuShiHuaChuangKouWeiZhi() {
  const kuan = typeof window !== 'undefined' ? window.innerWidth : 0
  chuangKouWeiZhi.value = {
    left: qianZhiZhi(kuan - CHUANG_KOU_KUAN - CHUANG_KOU_BIAN_JU, 0, kuan),
    top: CHUANG_KOU_BIAN_JU * 4,
  }
}

function tuoDongKaiShi(shiJian: PointerEvent) {
  const chuang = benDiChuangRef.value
  if (!chuang) return
  tuoDongZhong = true
  const juXing = chuang.getBoundingClientRect()
  zhiDianPianYiX = shiJian.clientX - juXing.left
  zhiDianPianYiY = shiJian.clientY - juXing.top
  chuang.setPointerCapture?.(shiJian.pointerId)
}

function tuoDongYiDong(shiJian: PointerEvent) {
  if (!tuoDongZhong) return
  const kuan = window.innerWidth
  const gao = window.innerHeight
  chuangKouWeiZhi.value = {
    left: qianZhiZhi(shiJian.clientX - zhiDianPianYiX, 0, kuan - CHUANG_KOU_KUAN),
    top: qianZhiZhi(shiJian.clientY - zhiDianPianYiY, 0, gao - CHUANG_KOU_GAO),
  }
}

function tuoDongJieShu() {
  tuoDongZhong = false
}

function tongBuBenDiLiu() {
  const shiPing = benDiShiPingRef.value
  if (!shiPing) return
  if (shiPing.srcObject !== tongHua.benDiLiu) {
    shiPing.srcObject = tongHua.benDiLiu ?? null
  }
}

// 挂断按钮语义：振铃期为取消，接通后为挂断
function chuLiGuaDuan() {
  if (tongHua.zhuangTai === 'zhenLing') {
    tongHua.quXiaoTongHua()
    return
  }
  tongHua.guaDuanTongHua()
}

onMounted(async () => {
  chuShiHuaChuangKouWeiZhi()
  await nextTick()
  tongBuBenDiLiu()
})

watch(
  () => tongHua.benDiLiu,
  () => {
    void nextTick(tongBuBenDiLiu)
  },
)

// 组件卸载兜底：确保本地轨道、铃声与定时器不泄漏
onBeforeUnmount(() => {
  tongHua.xieZaiQingLi()
})
</script>

<style scoped>
.tonghua-zhezhao {
  /* 低于管理员监控(--jiankong-z-index:1100)，保证管理员调试面板始终置顶 */
  --tonghua-z-index: 1050;
  --tonghua-weixian-se: var(--cuowu-yanse);
  --tonghua-weixian-tubiao: var(--fasong-anniu-wenben);
  --tonghua-liang-wenben: var(--wenben-zhuse);
  --tonghua-an-beijing: rgba(255, 255, 255, 0.14);
  --tonghua-an-guanbi-beijing: rgba(255, 255, 255, 0.32);
  position: fixed;
  inset: 0;
  z-index: var(--tonghua-z-index);
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: calc(20px + var(--anquan-quyu-shang)) 20px calc(28px + var(--anquan-quyu-xia));
  background: var(--zhezhao-beijing);
  backdrop-filter: blur(18px);
}

/* 视频形态：深色渐变背景 + 白色文字（独立变量，主题兼容） */
.tonghua-zhezhao.shipin-xingshi {
  --tonghua-shenye-jianbian-1: #10141d;
  --tonghua-shenye-jianbian-2: #1b2233;
  --tonghua-shenye-jianbian-3: #241a26;
  --tonghua-liang-wenben: #ffffff;
  background: linear-gradient(
    160deg,
    var(--tonghua-shenye-jianbian-1),
    var(--tonghua-shenye-jianbian-2) 55%,
    var(--tonghua-shenye-jianbian-3)
  );
}

.tonghua-dingbu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.duifang-nicheng {
  font-size: 18px;
  font-weight: 600;
  color: var(--tonghua-liang-wenben);
}

.zhuangtai-wenben {
  font-size: 13px;
  color: var(--wenben-ciuse);
}

.shipin-xingshi .zhuangtai-wenben {
  color: rgba(255, 255, 255, 0.72);
}

.tonghua-zhongyang {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  min-height: 0;
}

.huxi-waiquan {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 168px;
  height: 168px;
  margin: -104px 0 0 -84px;
  border-radius: 50%;
  border: 2px solid var(--zhuse);
  animation: huxi-guangquan 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes huxi-guangquan {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.18);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .huxi-waiquan,
  .rouguang-huan {
    animation: none;
  }
}

.tonghua-touxiang {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  background: var(--touxiang-beijing-moren);
  box-shadow: var(--touxiang-yinying);
}

.tonghua-touxiang img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.jishi-da-ziti {
  margin: 0;
  font-size: 40px;
  font-weight: 300;
  letter-spacing: 4px;
  color: var(--tonghua-liang-wenben);
  font-variant-numeric: tabular-nums;
}

.yuanduan-zhanwei {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.rouguang-huan {
  position: absolute;
  top: -22px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16), transparent 70%);
  animation: rouguang-pulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes rouguang-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.25);
    opacity: 1;
  }
}

.touxiang-xiao {
  width: 84px;
  height: 84px;
  font-size: 38px;
}

.zhanwei-tishi {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.jishi-wenben {
  margin: 0;
  font-size: 22px;
  letter-spacing: 2px;
  color: var(--tonghua-liang-wenben);
  font-variant-numeric: tabular-nums;
}

.bendi-chuang {
  position: fixed;
  width: 160px;
  height: 213px;
  border-radius: var(--yuanjiao-zhong);
  overflow: hidden;
  box-shadow: var(--chuangkou-yinying);
  touch-action: none;
  cursor: grab;
  background: var(--beijing-ciuse);
}

.bendi-chuang:active {
  cursor: grabbing;
}

.bendi-shiping {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  pointer-events: none;
}

.kongzhi-qu {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  min-height: 68px;
}

.ciji-zhanyue {
  width: 56px;
  flex-shrink: 0;
}

.kongzhi-an {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tonghua-an-beijing);
  color: var(--tonghua-liang-wenben);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.kongzhi-an svg {
  width: 24px;
  height: 24px;
}

.kongzhi-an:hover {
  background: var(--tonghua-an-guanbi-beijing);
}

.kongzhi-an.yiguanbi {
  background: var(--chehui-caidan-beijing);
  color: var(--wenben-ciuse);
}

.guaduan-an {
  background: var(--tonghua-weixian-se);
  color: var(--tonghua-weixian-tubiao);
  width: 64px;
  height: 64px;
}

.guaduan-an:hover {
  opacity: 0.88;
  background: var(--tonghua-weixian-se);
}

.tingtong-tubiao {
  transform: rotate(135deg);
}

.quxiao-cijian {
  position: absolute;
  left: 50%;
  bottom: 116px;
  transform: translateX(-50%);
  padding: 8px 22px;
  border-radius: 999px;
  border: none;
  background: var(--quxiao-anniu-beijing);
  color: var(--quxiao-anniu-wenben);
  font-size: 14px;
  cursor: pointer;
}
</style>
