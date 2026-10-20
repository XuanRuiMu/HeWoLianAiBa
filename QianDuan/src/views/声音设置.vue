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
        <HuaGan
          :biao-ti="tongDao.biaoTi"
          :zhi="yinLiangZhi(tongDao.zhi)"
          :du-shu="duShuWenZi(tongDao.zhi)"
          :ce-shi-jian="`sheng-yin-hua-gan-${tongDao.zhi}`"
          :jin-yong="shiGenSuiXiTong(tongDao.zhi)"
          @geng-xin="(zhi) => sheZhiYinLiang(tongDao.zhi, zhi)"
        />

        <div class="sheng-yin-kong-zhi-hang">
          <label class="sheng-yin-gen-sui">
            <input
              class="sheng-yin-kai-guan"
              type="checkbox"
              role="switch"
              :checked="shiGenSuiXiTong(tongDao.zhi)"
              :aria-label="huoQuFanYi('sheZhi', 'genSuiXiTongShengYin')"
              :data-testid="`sheng-yin-gen-sui-${tongDao.zhi}`"
              @change="(shiJian) => qieHuanGenSui(tongDao.zhi, shiJian)"
            />
            <span class="sheng-yin-gen-sui-wen">{{ huoQuFanYi('sheZhi', 'genSuiXiTongShengYin') }}</span>
          </label>

          <button
            class="sheng-yin-shi-ting"
            type="button"
            :data-testid="`sheng-yin-shi-ting-${tongDao.zhi}`"
            @click="shiTing(tongDao.zhi)"
          >
            {{ huoQuFanYi('sheZhi', 'shengYinYuLan') }}
          </button>
        </div>
      </section>

      <p class="sheng-yin-jiao-zhu">{{ huoQuFanYi('sheZhi', 'yinLiangTiaoZhengTiShi') }}</p>
    </div>

    <audio ref="shiTingYuanSu" preload="none" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { huoQuFanYi, type FanYiZiJian } from '@/config/翻译表'
import {
  SHENG_YIN_BAI_FEN_BI,
  SHENG_YIN_TONG_DAO_MO_REN,
  SHENG_YIN_TONG_DAO_XUAN_XIANG,
  baoCunShengYinTongDao,
  duQuShengYinTongDao,
  guiYiHuaShengYin,
  heChengDanTongDaoYinLiang,
  qingChuJiuShengYinJian,
  type ShengYinPeiZhi,
  type ShengYinTongDao,
} from '@/config/消息配置'
import RequestError from '@/components/请求错误.vue'
import HuaGan from '@/components/表单/滑杆.vue'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const SHENG_YIN_TONG_DAO_JIAN: Record<ShengYinTongDao, FanYiZiJian<'sheZhi'>> = {
  zong: 'shengYinTongDaoZong',
  yinYue: 'shengYinTongDaoYinYue',
  yongHuYuYin: 'shengYinTongDaoYongHuYuYin',
  duiXiangYuYin: 'shengYinTongDaoDuiXiangYuYin',
  shiPin: 'shengYinTongDaoShiPin',
}

const tongDaoPeiZhi = reactive<ShengYinPeiZhi>({ ...SHENG_YIN_TONG_DAO_MO_REN })
const caoZuoCuoWu = ref<QianTaiCuoWu | null>(null)
const shiTingYuanSu = ref<HTMLAudioElement | null>(null)

const tongDaoLieBiao = computed(() =>
  SHENG_YIN_TONG_DAO_XUAN_XIANG.map((zhi) => ({
    zhi,
    biaoTi: huoQuFanYi('sheZhi', SHENG_YIN_TONG_DAO_JIAN[zhi]),
  })),
)

function shiGenSuiXiTong(tongDao: ShengYinTongDao): boolean {
  return tongDaoPeiZhi[tongDao] === null
}

function yinLiangZhi(tongDao: ShengYinTongDao): number {
  return tongDaoPeiZhi[tongDao] ?? SHENG_YIN_BAI_FEN_BI.moRen
}

function duShuWenZi(tongDao: ShengYinTongDao): string {
  const baiFenBi = tongDaoPeiZhi[tongDao]
  if (baiFenBi === null) return huoQuFanYi('sheZhi', 'yinLiangXiTongKongZhi')
  return `${baiFenBi}%`
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

function qingCuoWu(): void {
  caoZuoCuoWu.value = null
}

function baoCunBingYingYong(): void {
  try {
    baoCunShengYinTongDao({ ...tongDaoPeiZhi })
    qingChuJiuShengYinJian()
  } catch (cuoWu: unknown) {
    caoZuoCuoWu.value = 归一前台错误(cuoWu)
    return
  }
  yingYongYinLiang()
}

function sheZhiYinLiang(tongDao: ShengYinTongDao, zhi: number): void {
  const baiFenBi = guiYiHuaShengYin(zhi)
  if (baiFenBi === null || baiFenBi === tongDaoPeiZhi[tongDao]) return
  tongDaoPeiZhi[tongDao] = baiFenBi
  qingCuoWu()
  baoCunBingYingYong()
}

function qieHuanGenSui(tongDao: ShengYinTongDao, shiJian: Event): void {
  const yuanSu = shiJian.target as HTMLInputElement | null
  if (!yuanSu) return
  tongDaoPeiZhi[tongDao] = yuanSu.checked ? null : yinLiangZhi(tongDao)
  qingCuoWu()
  baoCunBingYingYong()
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
  yingYongYinLiang()
  try {
    const shangXiaWen = new AudioContext()
    const zhenDang = shangXiaWen.createOscillator()
    const zengYi = shangXiaWen.createGain()
    const yinLiang = heChengDanTongDaoYinLiang({ ...tongDaoPeiZhi }, tongDao) ?? 1
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

defineExpose({ tongDaoPeiZhi, sheZhiYinLiang, qieHuanGenSui, yinLiangZhi, duShuWenZi })
</script>

<style scoped>
.sheng-yin-ye {
  --sheng-yin-wen-ben: #ffffff;
  --sheng-yin-ci-wen-ben: #d8d8de;
  --sheng-yin-ka-mian: rgba(24, 24, 28, 0.9);
  --sheng-yin-ka-bian: rgba(255, 255, 255, 0.12);
  --sheng-yin-jin: #f0c86a;
  --sheng-yin-huan-yuan: 999px;
  --sheng-yin-ji-zhu-kou: 44px;
  --sheng-yin-kai-guan-kuan: 44px;
  --sheng-yin-kai-guan-gao: 24px;
  --sheng-yin-kai-guan-qiu: 18px;
  --sheng-yin-kai-guan-ji: 1px;
  --sheng-yin-kai-guan-di: rgba(255, 255, 255, 0.16);
  --sheng-yin-kai-guan-kai-di: #d9a441;
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
  --sheng-yin-kai-guan-di: rgba(20, 22, 26, 0.18);
  --sheng-yin-kai-guan-kai-di: #c08a1c;
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
  gap: var(--jiange-15);
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

.sheng-yin-kong-zhi-hang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-xiao);
  flex-wrap: wrap;
}

.sheng-yin-gen-sui {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-height: var(--sheng-yin-ji-zhu-kou);
  padding: 0 var(--jiange-xiao);
  border-radius: var(--sheng-yin-huan-yuan);
  cursor: pointer;
}

.sheng-yin-kai-guan {
  flex: none;
  position: relative;
  width: var(--sheng-yin-kai-guan-kuan);
  height: var(--sheng-yin-kai-guan-gao);
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  border-radius: var(--sheng-yin-huan-yuan);
  background: var(--sheng-yin-kai-guan-di);
  border: 1px solid var(--sheng-yin-ka-bian);
  cursor: pointer;
  transition: background-color 0.2s var(--quxian-biao-zhun), border-color 0.2s var(--quxian-biao-zhun);
}

.sheng-yin-kai-guan::after {
  content: '';
  position: absolute;
  top: 50%;
  left: var(--sheng-yin-kai-guan-ji);
  width: var(--sheng-yin-kai-guan-qiu);
  height: var(--sheng-yin-kai-guan-qiu);
  border-radius: 50%;
  background: var(--sheng-yin-wen-ben);
  transform: translate(0, -50%);
  transition: transform 0.2s var(--quxian-tan-chu);
}

.sheng-yin-kai-guan:checked {
  background: var(--sheng-yin-kai-guan-kai-di);
  border-color: var(--sheng-yin-kai-guan-kai-di);
}

.sheng-yin-kai-guan:checked::after {
  transform: translate(
    calc(var(--sheng-yin-kai-guan-kuan) - var(--sheng-yin-kai-guan-qiu) - var(--sheng-yin-kai-guan-ji) * 4),
    -50%
  );
}

.sheng-yin-kai-guan:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.sheng-yin-gen-sui-wen {
  font-size: 13px;
  color: var(--sheng-yin-ci-wen-ben);
}

.sheng-yin-shi-ting {
  flex: none;
  min-height: var(--sheng-yin-ji-zhu-kou);
  padding: var(--jiange-xiao) var(--jiange-da);
  border-radius: var(--sheng-yin-huan-yuan);
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
