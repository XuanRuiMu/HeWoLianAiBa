<template>
  <div class="sheng-yin-ye" data-testid="sheng-yin-ye">
    <h2 class="sheng-yin-biao-ti">{{ huoQuFanYi('sheZhi', 'shengYinBiaoTi') }}</h2>
    <RequestError
      v-if="caoZuoCuoWu"
      :cuo-wu="caoZuoCuoWu || undefined"
      @chong-shi="qingCuoWu"
    />
    <div class="sheng-yin-lie-biao" role="radiogroup" :aria-label="huoQuFanYi('sheZhi', 'shengYinBiaoTi')">
      <button
        v-for="xuanXiang in xuanXiangLieBiao"
        :key="xuanXiang.zhi"
        class="sheng-yin-xiang"
        :class="{ 'sheng-yin-xuan-zhong': dangQianDang === xuanXiang.zhi }"
        role="radio"
        :aria-checked="dangQianDang === xuanXiang.zhi"
        @click="xuanZe(xuanXiang.zhi)"
      >
        <span class="sheng-yin-ming">{{ xuanXiang.wenZi }}</span>
      </button>
    </div>
    <button v-if="keShiTing" class="sheng-yin-shi-ting" data-testid="sheng-yin-shi-ting" @click="shiTing">
      {{ huoQuFanYi('sheZhi', 'shengYinYuLan') }}
    </button>
    <audio ref="shiTingYuanSu" preload="none" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { huoQuFanYi, type FanYiZiJian } from '@/config/translations'
import { SHENG_YIN_DANG_XUAN_XIANG, SHENG_YIN_YIN_LIANG, guiYiHuaShengYin, type ShengYinDang } from '@/config/消息配置'
import RequestError from '@/components/请求错误.vue'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const SHENG_YIN_JIAN: Record<ShengYinDang, FanYiZiJian<'sheZhi'>> = {
  genSuiXiTong: 'shengYinMoRen',
  jingYin: 'shengYinJingYin',
  xiao: 'shengYinXiao',
  zhong: 'shengYinZhong',
  da: 'shengYinDa',
  zuiDa: 'shengYinZuiDa',
}

const SHENG_YIN_YIN_LIANG_DAN_YUAN = SHENG_YIN_YIN_LIANG

const dangQianDang = ref<ShengYinDang>(guiYiHuaShengYin(cunChuDang()))
const caoZuoCuoWu = ref<QianTaiCuoWu | null>(null)
const shiTingYuanSu = ref<HTMLAudioElement | null>(null)

function cunChuJian(): string {
  return 'lian-ai-ba-sheng-yin'
}

function cunChuDang(): unknown {
  try {
    return localStorage.getItem(cunChuJian())
  } catch {
    return null
  }
}

const xuanXiangLieBiao = computed(() =>
  SHENG_YIN_DANG_XUAN_XIANG.map((zhi) => ({
    zhi,
    wenZi: huoQuFanYi('sheZhi', SHENG_YIN_JIAN[zhi]),
  })),
)

const keShiTing = computed(() => SHENG_YIN_YIN_LIANG_DAN_YUAN[dangQianDang.value] !== null)

function qingCuoWu(): void {
  caoZuoCuoWu.value = null
}

function xuanZe(dang: ShengYinDang): void {
  dangQianDang.value = dang
  qingCuoWu()
  try {
    localStorage.setItem(cunChuJian(), dang)
  } catch (cuoWu: unknown) {
    caoZuoCuoWu.value = 归一前台错误(cuoWu)
    return
  }
  yingYongYinLiang()
}

function yingYongYinLiang(): void {
  const yuanSu = shiTingYuanSu.value
  if (!yuanSu) return
  const yinLiang = SHENG_YIN_YIN_LIANG_DAN_YUAN[dangQianDang.value]
  if (yinLiang === null) {
    yuanSu.volume = 1
    yuanSu.muted = false
    return
  }
  yuanSu.muted = yinLiang === 0
  yuanSu.volume = yinLiang
}

function shiTing(): void {
  qingCuoWu()
  const yuanSu = shiTingYuanSu.value
  if (!yuanSu) return
  yingYongYinLiang()
  try {
    const shangXiaWen = new AudioContext()
    const zhenDang = shangXiaWen.createOscillator()
    const zengYi = shangXiaWen.createGain()
    const yinLiang = SHENG_YIN_YIN_LIANG_DAN_YUAN[dangQianDang.value] ?? 1
    zengYi.gain.value = Math.max(0.0001, yinLiang * 0.2)
    zhenDang.frequency.value = 880
    zhenDang.connect(zengYi)
    zengYi.connect(shangXiaWen.destination)
    zhenDang.start()
    zhenDang.stop(shangXiaWen.currentTime + 0.3)
    zhenDang.onended = () => {
      void shangXiaWen.close()
    }
  } catch (cuoWu: unknown) {
    caoZuoCuoWu.value = 归一前台错误(cuoWu)
  }
}

function duQuDangQianYinLiang(): number | null {
  return SHENG_YIN_YIN_LIANG_DAN_YUAN[dangQianDang.value]
}

onBeforeUnmount(() => {
  const yuanSu = shiTingYuanSu.value
  if (yuanSu) {
    try {
      yuanSu.pause()
    } catch {
      /* 忽略 */
    }
  }
})

defineExpose({ duQuDangQianYinLiang, yingYongYinLiang })
</script>

<style scoped>
.sheng-yin-ye {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--jiange-zhong);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
}
.sheng-yin-biao-ti {
  font-size: 16px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  color: var(--wenben-zhuse);
  margin: 0;
}
.sheng-yin-lie-biao {
  display: flex;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}
.sheng-yin-xiang {
  padding: var(--jiange-xiao) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: 12px;
  border: 1.5px solid transparent;
  font-size: 13px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  cursor: pointer;
  background: var(--beijing-kaopian);
  border-color: var(--biankuang-yanse);
  color: var(--wenben-zhuse);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
}
.sheng-yin-xiang-xuan-zhong,
.sheng-yin-xuan-zhong {
  border-color: var(--yanse-qiangdiao);
}
.sheng-yin-shi-ting {
  padding: var(--jiange-xiao) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: 8px;
  background: var(--zhuse);
  color: #fff;
  font-size: 13px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  align-self: flex-start;
}
.sheng-yin-shi-ting:disabled {
  opacity: 0.5;
}
</style>
