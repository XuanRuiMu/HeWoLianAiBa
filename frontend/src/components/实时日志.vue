<template>
  <div
    v-if="日志仓库.keJian"
    ref="fuchuang"
    class="rizhi-fuchuang"
    :style="weiZhiYangShi"
    role="dialog"
    :aria-label="huoQuFanYi('shiShiRiZhi', 'biaoTi')"
  >
    <header class="rizhi-biaoti-lan" @pointerdown="kaiShiTuoDong">
      <div class="rizhi-biaoti">
        <span class="rizhi-dian" :class="{ 'rizhi-dian-duankai': !日志仓库.yiLianJie }" />
        {{ huoQuFanYi('shiShiRiZhi', 'biaoTi') }}
        <span class="rizhi-zhuangtai">
          {{
            日志仓库.yiLianJie
              ? huoQuFanYi('shiShiRiZhi', 'yiLianJie')
              : huoQuFanYi('shiShiRiZhi', 'weiLianJie')
          }}
        </span>
      </div>
      <div class="rizhi-biaoti-you">
        <span class="rizhi-jishu">
          {{ huoQuFanYi('shiShiRiZhi', 'tiaoShu') }} {{ 日志仓库.guoLvHouLieBiao.length }}/{{
            日志仓库.zongTiaoShu
          }}
        </span>
        <span v-if="日志仓库.diuQiZongShu > 0" class="rizhi-diuqi">
          {{ huoQuFanYi('shiShiRiZhi', 'diuQi') }} {{ 日志仓库.diuQiZongShu }}
        </span>
        <button class="rizhi-guanbi" type="button" @click="日志仓库.qieHuanKeJian()">
          {{ huoQuFanYi('shiShiRiZhi', 'guanBi') }}
        </button>
      </div>
    </header>

    <div class="rizhi-gongju-lan">
      <button
        v-for="jiBie in QUAN_BU_JI_BIE"
        :key="'jb-' + jiBie"
        type="button"
        class="rizhi-jibie-kai"
        :class="['rizhi-jibie-' + jiBie, { 'rizhi-jibie-guan': !日志仓库.qiYongJiBie[jiBie] }]"
        @click="日志仓库.qieHuanJiBie(jiBie)"
      >
        {{ huoQuFanYi('shiShiRiZhi', JI_BIE_FAN_YI_JIAN[jiBie]) }}
      </button>

      <input
        v-model="日志仓库.guanJianZi"
        class="rizhi-sousuo"
        type="search"
        :placeholder="huoQuFanYi('shiShiRiZhi', 'souSuoZhanWei')"
      />

      <button class="rizhi-anniu" type="button" @click="日志仓库.qieHuanZanTing()">
        {{
          日志仓库.zanTing
            ? huoQuFanYi('shiShiRiZhi', 'jiXu')
            : huoQuFanYi('shiShiRiZhi', 'zanTing')
        }}
      </button>
      <button class="rizhi-anniu" type="button" @click="日志仓库.qingKong()">
        {{ huoQuFanYi('shiShiRiZhi', 'qingKong') }}
      </button>
      <button class="rizhi-anniu" type="button" @click="fuZhi">
        {{ fuZhiTiShi || huoQuFanYi('shiShiRiZhi', 'fuZhi') }}
      </button>
    </div>

    <div ref="gunDongQu" class="rizhi-gundong-qu" @scroll.passive="chuLiGunDong">
      <div v-if="日志仓库.guoLvHouLieBiao.length === 0" class="rizhi-kong">
        {{ huoQuFanYi('shiShiRiZhi', 'kongZhuangTai') }}
      </div>
      <div v-else class="rizhi-zhanwei" :style="{ height: zongGaoDu + 'px' }">
        <div class="rizhi-shichuang" :style="{ transform: 'translateY(' + pianYiGaoDu + 'px)' }">
          <div
            v-for="(tiaoMu, xuHao) in keJianTiaoMu"
            :key="'rz-' + (qiShiSuoYin + xuHao)"
            class="rizhi-hang"
            :class="'rizhi-hang-' + tiaoMu.ji_bie"
            :style="{ height: HANG_GAO + 'px' }"
            :title="xuLieHuaTiaoMu(tiaoMu)"
          >
            <span class="rizhi-shijian">{{ geShiHuaShiJian(tiaoMu.shi_jian) }}</span>
            <span class="rizhi-jibie" :class="'rizhi-jibie-' + tiaoMu.ji_bie">
              {{ huoQuFanYi('shiShiRiZhi', JI_BIE_FAN_YI_JIAN[tiaoMu.ji_bie]) }}
            </span>
            <span class="rizhi-leixing">{{ tiaoMu.lei_xing }}</span>
            <span class="rizhi-xiaoxi">{{ tiaoMu.xiao_xi }}</span>
          </div>
        </div>
      </div>
    </div>

    <footer class="rizhi-jiaobu">{{ huoQuFanYi('shiShiRiZhi', 'kuaiJieJianTiShi') }}</footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用实时日志仓库, QUAN_BU_JI_BIE, type RiZhiTiaoMu } from '@/stores/实时日志'

const HANG_GAO = 22
const HUAN_CHONG_HANG_SHU = 8
const DI_BU_YU_ZHI = 24
const FU_ZHI_TI_SHI_HAO_MIAO = 1500
const TING_KAO_BIAN_JU = 24

const JI_BIE_FAN_YI_JIAN = {
  debug: 'jiBieDebug',
  info: 'jiBieInfo',
  warn: 'jiBieWarn',
  error: 'jiBieError',
} as const

const 用户仓库 = 使用用户仓库()
const 日志仓库 = 使用实时日志仓库()

const fuchuang = ref<HTMLElement | null>(null)
const gunDongQu = ref<HTMLElement | null>(null)
const gunDongDingBu = ref(0)
const shiChuangGaoDu = ref(0)
const fuZhiTiShi = ref('')
const yiYi = ref({ x: 0, y: 0 })

let tuoDongZhong = false
let qiShiX = 0
let qiShiY = 0
let qiShiYiYiX = 0
let qiShiYiYiY = 0
let kuangKuan = 0
let kuangGao = 0
let chiCunGuanChaQi: ResizeObserver | null = null
let fuZhiJiShiQi: ReturnType<typeof setTimeout> | null = null

const weiZhiYangShi = computed(() => ({
  transform: `translate(${yiYi.value.x}px, ${yiYi.value.y}px)`,
}))

const zongGaoDu = computed(() => 日志仓库.guoLvHouLieBiao.length * HANG_GAO)

const qiShiSuoYin = computed(() =>
  Math.max(0, Math.floor(gunDongDingBu.value / HANG_GAO) - HUAN_CHONG_HANG_SHU),
)

const jieShuSuoYin = computed(() =>
  Math.min(
    日志仓库.guoLvHouLieBiao.length,
    Math.ceil((gunDongDingBu.value + shiChuangGaoDu.value) / HANG_GAO) + HUAN_CHONG_HANG_SHU,
  ),
)

const keJianTiaoMu = computed(() =>
  日志仓库.guoLvHouLieBiao.slice(qiShiSuoYin.value, jieShuSuoYin.value),
)

const pianYiGaoDu = computed(() => qiShiSuoYin.value * HANG_GAO)

function chuLiGunDong() {
  const yuanSu = gunDongQu.value
  if (!yuanSu) return
  gunDongDingBu.value = yuanSu.scrollTop
}

function zaiDiBu(): boolean {
  const yuanSu = gunDongQu.value
  if (!yuanSu) return true
  return yuanSu.scrollHeight - yuanSu.scrollTop - yuanSu.clientHeight <= DI_BU_YU_ZHI
}

function gunDongDaoDiBu() {
  const yuanSu = gunDongQu.value
  if (!yuanSu) return
  yuanSu.scrollTop = yuanSu.scrollHeight
  gunDongDingBu.value = yuanSu.scrollTop
}

function celiangShiChuang() {
  const yuanSu = gunDongQu.value
  if (!yuanSu) return
  shiChuangGaoDu.value = yuanSu.clientHeight
}

watch(
  () => 日志仓库.guoLvHouLieBiao.length,
  () => {
    if (日志仓库.zanTing) return
    const gaiGunDong = zaiDiBu()
    nextTick(() => {
      if (gaiGunDong) gunDongDaoDiBu()
    })
  },
)

watch(
  () => 日志仓库.keJian,
  (xinZhi) => {
    if (!xinZhi) return
    nextTick(() => {
      celiangShiChuang()
      guanChaChiCun()
      gunDongDaoDiBu()
    })
  },
)

function guanChaChiCun() {
  const yuanSu = gunDongQu.value
  if (!yuanSu || typeof ResizeObserver === 'undefined') return
  chiCunGuanChaQi?.disconnect()
  chiCunGuanChaQi = new ResizeObserver(() => celiangShiChuang())
  chiCunGuanChaQi.observe(yuanSu)
}

function geShiHuaShiJian(shiJian: string): string {
  const ri = new Date(shiJian)
  if (Number.isNaN(ri.getTime())) return shiJian
  const bu = (shu: number, changDu = 2) => String(shu).padStart(changDu, '0')
  return `${bu(ri.getHours())}:${bu(ri.getMinutes())}:${bu(ri.getSeconds())}.${bu(ri.getMilliseconds(), 3)}`
}

function xuLieHuaTiaoMu(tiaoMu: RiZhiTiaoMu): string {
  return JSON.stringify(tiaoMu)
}

async function fuZhi() {
  try {
    await navigator.clipboard.writeText(日志仓库.xuLieHuaGuoLvJieGuo())
    fuZhiTiShi.value = huoQuFanYi('shiShiRiZhi', 'yiFuZhi')
  } catch {
    fuZhiTiShi.value = huoQuFanYi('shiShiRiZhi', 'fuZhiShiBai')
  }
  if (fuZhiJiShiQi) clearTimeout(fuZhiJiShiQi)
  fuZhiJiShiQi = setTimeout(() => {
    fuZhiTiShi.value = ''
  }, FU_ZHI_TI_SHI_HAO_MIAO)
}

function xianZhi(zhi: number, zuiXiao: number, zuiDa: number): number {
  return Math.min(zuiDa, Math.max(zuiXiao, zhi))
}

function kaiShiTuoDong(shiJian: PointerEvent) {
  if ((shiJian.target as HTMLElement).closest('button')) return
  const yuanSu = fuchuang.value
  if (!yuanSu) return
  tuoDongZhong = true
  qiShiX = shiJian.clientX
  qiShiY = shiJian.clientY
  qiShiYiYiX = yiYi.value.x
  qiShiYiYiY = yiYi.value.y
  const kuang = yuanSu.getBoundingClientRect()
  kuangKuan = kuang.width
  kuangGao = kuang.height
  yuanSu.setPointerCapture(shiJian.pointerId)
  window.addEventListener('pointermove', chuLiTuoDong)
  window.addEventListener('pointerup', jieShuTuoDong)
}

function chuLiTuoDong(shiJian: PointerEvent) {
  if (!tuoDongZhong) return
  const xinX = qiShiYiYiX + (shiJian.clientX - qiShiX)
  const xinY = qiShiYiYiY + (shiJian.clientY - qiShiY)
  yiYi.value = {
    x: xianZhi(xinX, kuangKuan + TING_KAO_BIAN_JU - window.innerWidth, TING_KAO_BIAN_JU),
    y: xianZhi(xinY, kuangGao + TING_KAO_BIAN_JU - window.innerHeight, TING_KAO_BIAN_JU),
  }
}

function jieShuTuoDong(shiJian: PointerEvent) {
  if (!tuoDongZhong) return
  tuoDongZhong = false
  const yuanSu = fuchuang.value
  if (yuanSu?.hasPointerCapture(shiJian.pointerId)) yuanSu.releasePointerCapture(shiJian.pointerId)
  window.removeEventListener('pointermove', chuLiTuoDong)
  window.removeEventListener('pointerup', jieShuTuoDong)
}

function chuLiKuaiJieJian(shiJian: KeyboardEvent) {
  if (!shiJian.ctrlKey || !shiJian.shiftKey) return
  if (shiJian.key !== 'L' && shiJian.key !== 'l') return
  if (!用户仓库.shiFouGuanLiYuan) return
  shiJian.preventDefault()
  日志仓库.qieHuanKeJian()
}

onMounted(() => {
  window.addEventListener('keydown', chuLiKuaiJieJian)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', chuLiKuaiJieJian)
  window.removeEventListener('pointermove', chuLiTuoDong)
  window.removeEventListener('pointerup', jieShuTuoDong)
  chiCunGuanChaQi?.disconnect()
  chiCunGuanChaQi = null
  if (fuZhiJiShiQi) clearTimeout(fuZhiJiShiQi)
  日志仓库.duanKai()
})
</script>

<style scoped>
.rizhi-fuchuang {
  --rizhi-kuan: 640px;
  --rizhi-gao: 46vh;
  --rizhi-ju-bian: 24px;
  --rizhi-z-index: 1200;

  position: fixed;
  left: var(--rizhi-ju-bian);
  bottom: var(--rizhi-ju-bian);
  width: var(--rizhi-kuan);
  height: var(--rizhi-gao);
  max-width: calc(100vw - var(--rizhi-ju-bian) * 2);
  z-index: var(--rizhi-z-index);
  display: flex;
  flex-direction: column;
  background: #06090f;
  border: 1px solid rgba(99, 179, 237, 0.28);
  border-radius: 12px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  will-change: transform;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.rizhi-biaoti-lan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(99, 179, 237, 0.18);
  background: rgba(99, 179, 237, 0.06);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.rizhi-biaoti {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #d6e6ff;
}

.rizhi-biaoti-you {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rizhi-dian {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
}

.rizhi-dian-duankai {
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
}

.rizhi-zhuangtai,
.rizhi-jishu {
  font-size: 11px;
  font-weight: 400;
  color: #6b7f99;
}

.rizhi-diuqi {
  font-size: 11px;
  color: #ffb38a;
}

.rizhi-guanbi,
.rizhi-anniu {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #cdd7e6;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}

.rizhi-guanbi:hover,
.rizhi-anniu:hover {
  background: rgba(99, 179, 237, 0.18);
}

.rizhi-gongju-lan {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(99, 179, 237, 0.12);
  flex-wrap: wrap;
}

.rizhi-jibie-kai {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.rizhi-jibie-guan {
  opacity: 0.35;
}

.rizhi-sousuo {
  flex: 1;
  min-width: 120px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(99, 179, 237, 0.18);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  color: #d6e6ff;
  outline: none;
}

.rizhi-gundong-qu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  contain: layout paint;
}

.rizhi-zhanwei {
  position: relative;
  width: 100%;
}

.rizhi-shichuang {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.rizhi-hang {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-size: 11px;
  line-height: 22px;
  white-space: nowrap;
  border-left: 2px solid transparent;
}

.rizhi-hang-warn {
  border-left-color: #f6ad55;
}

.rizhi-hang-error {
  border-left-color: #f87171;
  background: rgba(248, 113, 113, 0.06);
}

.rizhi-shijian {
  color: #5b6b82;
  flex: none;
}

.rizhi-jibie {
  flex: none;
  width: 46px;
  text-align: center;
  border-radius: 4px;
  font-weight: 600;
}

.rizhi-jibie-debug {
  color: #9aa7b8;
  background: rgba(154, 167, 184, 0.14);
}

.rizhi-jibie-info {
  color: #7fc3ff;
  background: rgba(99, 179, 237, 0.16);
}

.rizhi-jibie-warn {
  color: #ffc98a;
  background: rgba(246, 173, 85, 0.16);
}

.rizhi-jibie-error {
  color: #ff9b9b;
  background: rgba(248, 113, 113, 0.16);
}

.rizhi-leixing {
  flex: none;
  color: #8fb6e8;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rizhi-xiaoxi {
  flex: 1;
  color: #cdd7e6;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rizhi-kong {
  padding-top: 40px;
  text-align: center;
  color: #5b6b82;
  font-size: 12px;
}

.rizhi-jiaobu {
  padding: 5px 12px;
  border-top: 1px solid rgba(99, 179, 237, 0.12);
  font-size: 10px;
  color: #4d5c72;
}
</style>
