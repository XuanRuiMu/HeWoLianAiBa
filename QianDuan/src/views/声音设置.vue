<template>
  <div class="sheng-yin-ye" data-testid="sheng-yin-ye">
    <div class="sheng-yin-zhe-zhao" data-testid="sheng-yin-zhe-zhao" aria-hidden="true"></div>

    <div class="sheng-yin-nei-rong">
      <header class="sheng-yin-tou">
        <h2 class="sheng-yin-biao-ti">{{ huoQuFanYi('sheZhi', 'shengYinBiaoTi') }}</h2>
        <p class="sheng-yin-shuo-ming">{{ huoQuFanYi('sheZhi', 'shengYinQuYuShuoMing') }}</p>
      </header>

      <RequestError v-if="caoZuoCuoWu" :cuo-wu="caoZuoCuoWu || undefined" @chong-shi="qingCuoWu" />

      <section
        v-for="tongDao in tongDaoLieBiao"
        :key="tongDao.zhi"
        class="sheng-yin-tong-dao"
        :data-testid="`sheng-yin-tong-dao-${tongDao.zhi}`"
      >
        <DangWeiHuaGan
          :biao-ti="tongDao.biaoTi"
          :ce-shi-jian="tongDao.zhi"
          :xuan-xiang="xuanXiangLieBiao"
          :dang-wei="tongDaoPeiZhi[tongDao.zhi]"
          @geng-xin="(zhi) => chuLiDangWei(tongDao.zhi, zhi)"
        />
        <button
          v-if="keShiTing(tongDao.zhi)"
          class="sheng-yin-shi-ting"
          type="button"
          data-testid="sheng-yin-shi-ting"
          @click="shiTing(tongDao.zhi)"
        >
          {{ huoQuFanYi('sheZhi', 'shengYinYuLan') }}
        </button>
      </section>

      <p class="sheng-yin-jiao-zhu">{{ huoQuFanYi('sheZhi', 'shengYinDangWeiDangQian') }}</p>
    </div>

    <audio ref="shiTingYuanSu" preload="none" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { huoQuFanYi, type FanYiZiJian } from '@/config/翻译表'
import {
  SHENG_YIN_DANG_XUAN_XIANG,
  SHENG_YIN_TONG_DAO_MO_REN,
  SHENG_YIN_TONG_DAO_XUAN_XIANG,
  SHENG_YIN_YIN_LIANG,
  baoCunShengYinTongDao,
  duQuShengYinTongDao,
  guiYiHuaShengYin,
  heChengDanTongDaoYinLiang,
  qingChuJiuShengYinJian,
  type ShengYinDang,
  type ShengYinTongDao,
} from '@/config/消息配置'
import RequestError from '@/components/请求错误.vue'
import DangWeiHuaGan from '@/components/声音/档位滑杆.vue'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const SHENG_YIN_JIAN: Record<ShengYinDang, FanYiZiJian<'sheZhi'>> = {
  genSuiXiTong: 'shengYinMoRen',
  jingYin: 'shengYinJingYin',
  xiao: 'shengYinXiao',
  zhong: 'shengYinZhong',
  da: 'shengYinDa',
  zuiDa: 'shengYinZuiDa',
}

const SHENG_YIN_TONG_DAO_JIAN: Record<ShengYinTongDao, FanYiZiJian<'sheZhi'>> = {
  zong: 'shengYinTongDaoZong',
  yinYue: 'shengYinTongDaoYinYue',
  yongHuYuYin: 'shengYinTongDaoYongHuYuYin',
  duiXiangYuYin: 'shengYinTongDaoDuiXiangYuYin',
  shiPin: 'shengYinTongDaoShiPin',
}

const SHENG_YIN_YIN_LIANG_DAN_YUAN = SHENG_YIN_YIN_LIANG

const tongDaoPeiZhi = reactive<Record<ShengYinTongDao, ShengYinDang>>({ ...SHENG_YIN_TONG_DAO_MO_REN })
const caoZuoCuoWu = ref<QianTaiCuoWu | null>(null)
const shiTingYuanSu = ref<HTMLAudioElement | null>(null)

const tongDaoLieBiao = computed(() =>
  SHENG_YIN_TONG_DAO_XUAN_XIANG.map((zhi) => ({
    zhi,
    biaoTi: huoQuFanYi('sheZhi', SHENG_YIN_TONG_DAO_JIAN[zhi]),
  })),
)

const xuanXiangLieBiao = computed(() =>
  SHENG_YIN_DANG_XUAN_XIANG.map((zhi) => ({
    zhi: zhi as string,
    wenZi: huoQuFanYi('sheZhi', SHENG_YIN_JIAN[zhi]),
  })),
)

function duQuTongDao(zhi: ShengYinTongDao): ShengYinDang {
  return guiYiHuaShengYin(tongDaoPeiZhi[zhi])
}

onMounted(() => {
  const qianRong = duQuShengYinTongDao()
  for (const tongDao of SHENG_YIN_TONG_DAO_XUAN_XIANG) {
    tongDaoPeiZhi[tongDao] = qianRong[tongDao]
  }
  try {
    baoCunShengYinTongDao({ ...tongDaoPeiZhi })
    qingChuJiuShengYinJian()
  } catch {
    return
  }
})

function keShiTing(_tongDao: ShengYinTongDao): boolean {
  return true
}

function qingCuoWu(): void {
  caoZuoCuoWu.value = null
}

function chuLiDangWei(tongDao: ShengYinTongDao, zhi: string): void {
  xuanZe(tongDao, guiYiHuaShengYin(zhi))
}

function xuanZe(tongDao: ShengYinTongDao, dang: ShengYinDang): void {
  tongDaoPeiZhi[tongDao] = dang
  qingCuoWu()
  try {
    baoCunShengYinTongDao({ ...tongDaoPeiZhi })
    qingChuJiuShengYinJian()
  } catch (cuoWu: unknown) {
    caoZuoCuoWu.value = 归一前台错误(cuoWu)
    return
  }
  yingYongYinLiang()
}

function yingYongYinLiang(): void {
  const yuanSu = shiTingYuanSu.value
  if (!yuanSu) return
  const yinLiang = heChengDanTongDaoYinLiang({ ...tongDaoPeiZhi }, 'zong')
  if (yinLiang === null) {
    yuanSu.volume = 1
    yuanSu.muted = false
    return
  }
  yuanSu.muted = yinLiang === 0
  yuanSu.volume = yinLiang
}

function shiTing(tongDao: ShengYinTongDao): void {
  qingCuoWu()
  const yuanSu = shiTingYuanSu.value
  if (!yuanSu) return
  yingYongYinLiang()
  try {
    const shangXiaWen = new AudioContext()
    const zhenDang = shangXiaWen.createOscillator()
    const zengYi = shangXiaWen.createGain()
    const yinLiang = heChengDanTongDaoYinLiang({ ...tongDaoPeiZhi }, tongDao) ?? SHENG_YIN_YIN_LIANG_DAN_YUAN[duQuTongDao(tongDao)] ?? 1
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

onBeforeUnmount(() => {
  const yuanSu = shiTingYuanSu.value
  if (yuanSu) {
    try {
      yuanSu.pause()
    } catch {
      return
    }
  }
})

defineExpose({ tongDaoPeiZhi, xuanZe, xuanXiangLieBiao })
</script>

<style scoped>
.sheng-yin-ye {
  --sheng-yin-wen-ben: #ffffff;
  --sheng-yin-ci-wen-ben: #d8d8de;
  --sheng-yin-ka-mian: rgba(24, 24, 28, 0.9);
  --sheng-yin-ka-bian: rgba(255, 255, 255, 0.12);
  --sheng-yin-jin: #f0c86a;
  position: relative;
  isolation: isolate;
  flex: none;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--jiange-zhong);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  border-radius: var(--yuanjiao-da);
}

:root[data-theme='light'] .sheng-yin-ye {
  --sheng-yin-wen-ben: #14161a;
  --sheng-yin-ci-wen-ben: #3f434a;
  --sheng-yin-ka-mian: rgba(255, 255, 255, 0.94);
  --sheng-yin-ka-bian: rgba(20, 22, 26, 0.12);
  --sheng-yin-jin: #6f4a06;
}

.sheng-yin-zhe-zhao {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: var(--yuanjiao-da);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px) saturate(1.05);
  -webkit-backdrop-filter: blur(14px) saturate(1.05);
  pointer-events: none;
}

:root[data-theme='light'] .sheng-yin-zhe-zhao {
  background: rgba(255, 255, 255, 0.72);
}

.sheng-yin-nei-rong {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
}

.sheng-yin-tou {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  padding: var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  background: var(--sheng-yin-ka-mian);
  border: 1px solid var(--sheng-yin-ka-bian);
}

.sheng-yin-biao-ti {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--sheng-yin-wen-ben);
}

.sheng-yin-shuo-ming {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--sheng-yin-ci-wen-ben);
}

.sheng-yin-tong-dao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.sheng-yin-shi-ting {
  align-self: flex-start;
  min-height: 44px;
  padding: var(--jiange-xiao) var(--jiange-da);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--sheng-yin-ka-bian);
  color: var(--sheng-yin-wen-ben);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s var(--quxian-biao-zhun), color 0.2s var(--quxian-biao-zhun);
}

:root[data-theme='light'] .sheng-yin-shi-ting {
  background: rgba(20, 22, 26, 0.05);
}

.sheng-yin-shi-ting:hover {
  border-color: var(--sheng-yin-jin);
  color: var(--sheng-yin-jin);
}

.sheng-yin-jiao-zhu {
  margin: 0;
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  background: var(--sheng-yin-ka-mian);
  border: 1px dashed var(--sheng-yin-ka-bian);
  font-size: 12px;
  line-height: 1.6;
  color: var(--sheng-yin-ci-wen-ben);
}

@media (max-width: 767px) {
  .sheng-yin-ye {
    padding: var(--jiange-12);
    border-radius: var(--yuanjiao-zhong);
  }
}
</style>
