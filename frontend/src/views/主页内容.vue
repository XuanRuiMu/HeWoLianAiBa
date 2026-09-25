<template>
  <div ref="zhuyeQuyu" class="zhuye-quyu">
    <div class="gonggong-biaoti-qu">
      <div class="biaoti-neirong">
        <span class="biaoti-wenzi">{{ huoQuFanYi('zhuYe', 'huanYingHuiLai') }}</span>
        <span class="biaoti-fenge" />
        <span class="biaoti-zhushi">{{ huoQuFanYi('zhuYe', 'kaiQiZhuanShu') }}</span>
      </div>
    </div>

    <div class="zhuye-neirong-qu">
      <div class="zuo-ce-qinggan-qu">
        <div class="qinggan-neirong-ceng">
          <div class="pinpai-qu">
            <img src="/favicon.svg" class="pinpai-logo" alt="" />
            <span class="pinpai-mingcheng">{{ huoQuFanYi('zhuYe', 'pinPaiMing') }}</span>
          </div>
          <p class="zuoce-slogan">{{ huoQuFanYi('zhuYe', 'slogan') }}</p>
        </div>
      </div>

      <div class="you-ce-xuanze-qu">
        <div class="moshi-kapian-zu">
          <MoShiKa class="moshi-kapian putong-moshi-kapian" @xuan-ze="jinRuPuTongMoShi">
            <div class="kapian-dingbu">
              <div class="kapian-tubiao-qu">
                <svg
                  class="kapian-tubiao"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  />
                </svg>
              </div>
              <div class="kapian-xinxi">
                <h3 class="kapian-biaoti">{{ huoQuFanYi('zhuYe', 'putongMoShi') }}</h3>
                <p class="kapian-fubiaoti">{{ huoQuFanYi('zhuYe', 'putongFuBiaoTi') }}</p>
              </div>
            </div>
            <div class="kapian-yulan-qu">
              <div class="yulan-xiangmu yulan-xiangmu-1">
                <span class="yulan-dian" />
                <span class="yulan-wenzi">{{ huoQuFanYi('zhuYe', 'ziDingYiJiaoSe') }}</span>
              </div>
              <div class="yulan-xiangmu yulan-xiangmu-2">
                <span class="yulan-dian" />
                <span class="yulan-wenzi">{{ huoQuFanYi('zhuYe', 'shiHeXinShou') }}</span>
              </div>
            </div>
            <div class="kapian-dibu">
              <span class="kaishi-wenben">{{ huoQuFanYi('zhuYe', 'kaiShiTiYan') }}</span>
              <span class="kaishi-jiantou">→</span>
            </div>
          </MoShiKa>

          <MoShiKa class="moshi-kapian tiaozhan-moshi-kapian" @xuan-ze="jinRuTiaoZhanMoShi">
            <div class="kapian-dingbu">
              <div class="kapian-tubiao-qu">
                <svg
                  class="kapian-tubiao"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div class="kapian-xinxi">
                <h3 class="kapian-biaoti">{{ huoQuFanYi('zhuYe', 'tiaoZhanMoShi') }}</h3>
                <p class="kapian-fubiaoti">{{ huoQuFanYi('zhuYe', 'tiaoZhanFuBiaoTi') }}</p>
              </div>
            </div>
            <div class="kapian-yulan-qu">
              <div class="yulan-xiangmu yulan-xiangmu-1">
                <span class="yulan-dian" />
                <span class="yulan-wenzi">{{ huoQuFanYi('zhuYe', 'xiTongSuiJi') }}</span>
              </div>
              <div class="yulan-xiangmu yulan-xiangmu-2">
                <span class="yulan-dian" />
                <span class="yulan-wenzi">{{ huoQuFanYi('zhuYe', 'fenShuJiRuPaiMing') }}</span>
              </div>
              <div class="yulan-xiangmu yulan-xiangmu-3">
                <span class="yulan-dian" />
                <span class="yulan-wenzi">{{ huoQuFanYi('zhuYe', 'shiHeQingChangGaoShou') }}</span>
              </div>
            </div>
            <div class="kapian-dibu">
              <span class="kaishi-wenben">{{ huoQuFanYi('zhuYe', 'jieShouTiaoZhan') }}</span>
              <span class="kaishi-jiantou">→</span>
            </div>
          </MoShiKa>
        </div>

        <div class="zhuye-diwei-shuoming">
          <svg
            class="diwei-tubiao"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
            />
          </svg>
          <span>{{ huoQuFanYi('zhuYe', 'diWeiShuoMing') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MoShiKa from '@/components/模式卡.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import { quXian } from '@/config/设计令牌'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const zhuyeQuyu = ref<HTMLElement | null>(null)

function jinRuPuTongMoShi() {
  router.push('/profile-setup?moshi=putong')
}

function jinRuTiaoZhanMoShi() {
  router.push('/tiao-zhan')
}

async function zhiXingTuiChuDongHua() {
  const pianHaoJianShaoDongHua = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (pianHaoJianShaoDongHua) {
    用户仓库.tuiChuDengLu()
    用户仓库.tuiChuQingQiu = false
    router.push('/login')
    return
  }

  用户仓库.mingChengKeJian = false

  const rongQi = zhuyeQuyu.value
  if (!rongQi) {
    用户仓库.tuiChuDengLu()
    用户仓库.tuiChuQingQiu = false
    router.push('/login')
    return
  }

  const biaotiQu = rongQi.querySelector('.gonggong-biaoti-qu') as HTMLElement | null
  const zuoCe = rongQi.querySelector('.zuo-ce-qinggan-qu') as HTMLElement | null
  const youCe = rongQi.querySelector('.you-ce-xuanze-qu') as HTMLElement | null

  const dongHuaZu: Animation[] = []

  if (biaotiQu) {
    dongHuaZu.push(
      biaotiQu.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-30px)' },
        ],
        { duration: 400, easing: quXian.biaoZhun, fill: 'forwards' },
      ),
    )
  }

  if (zuoCe) {
    dongHuaZu.push(
      zuoCe.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(-60px)' },
        ],
        { duration: 500, easing: quXian.biaoZhun, fill: 'forwards' },
      ),
    )
  }

  if (youCe) {
    dongHuaZu.push(
      youCe.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(60px)' },
        ],
        { duration: 500, easing: quXian.biaoZhun, fill: 'forwards' },
      ),
    )
  }

  if (dongHuaZu.length > 0) {
    await Promise.all(dongHuaZu.map((d) => d.finished))
  }

  用户仓库.tuiChuDengLu()
  用户仓库.tuiChuQingQiu = false
  router.push('/login')
}

watch(
  () => 用户仓库.tuiChuQingQiu,
  (xinZhi) => {
    if (xinZhi) {
      zhiXingTuiChuDongHua()
    }
  },
)
</script>

<style scoped>
.zhuye-quyu {
  width: 100%;
  min-height: calc(100vh - 52px);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  background: transparent;
}

.gonggong-biaoti-qu,
.zhuye-neirong-qu {
  position: relative;
  z-index: 1;
}

.gonggong-biaoti-qu {
  text-align: center;
  padding: 28px 36px 16px;
  animation: biaoti-ruchang 0.8s var(--quxian-tan-chu) both;
}

.biaoti-neirong {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 10px 28px;
  max-width: 100%;
  border: 1px solid var(--kapian-mian-biankuang);
  border-radius: var(--yuanjiao-da);
  background-color: var(--moshi-kapian-zheyan);
  background-image: none;
  backdrop-filter: var(--boli-mohu);
  box-shadow: var(--boli-yinying);
}

.biaoti-wenzi {
  font-size: 32px;
  font-weight: 800;
  color: var(--wenben-zhuse);
  letter-spacing: 8px;
  line-height: 1.2;
}

.biaoti-fenge {
  width: 40px;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(90deg, transparent, var(--nuanhui-lan), transparent);
  opacity: 0.5;
}

.biaoti-zhushi {
  font-size: 13px;
  color: var(--wenben-zhuse);
  letter-spacing: 2px;
  font-weight: 400;
  text-transform: uppercase;
}

@keyframes biaoti-ruchang {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.zhuye-neirong-qu {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
  padding-bottom: 24px;
}

.zuo-ce-qinggan-qu {
  position: relative;
  width: 48%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qinggan-neirong-ceng {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--kapian-mian-biankuang);
  border-radius: var(--yuanjiao-da);
  background-color: var(--moshi-kapian-zheyan);
  background-image: none;
  backdrop-filter: var(--boli-mohu);
  box-shadow: var(--boli-yinying);
}

.pinpai-qu {
  display: flex;
  align-items: center;
  gap: 12px;
  align-self: flex-start;
  animation: zuoce-ruchang 0.7s var(--quxian-tan-chu) both;
}

.pinpai-logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(255, 107, 157, 0.3);
  transition:
    transform 0.35s ease,
    box-shadow 0.35s ease;
  animation: logo-fudong 4s ease-in-out infinite;
}

.pinpai-logo:hover {
  transform: scale(1.08) rotate(-3deg);
  box-shadow: 0 8px 28px rgba(255, 107, 157, 0.45);
}

@keyframes logo-fudong {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.pinpai-mingcheng {
  font-size: 18px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  letter-spacing: 1.5px;
}

.zuoce-slogan {
  text-align: center;
  font-size: 13px;
  color: var(--wenben-zhuse);
  margin: 0;
  letter-spacing: 1px;
  line-height: 1.6;
  animation: slogan-ruchang 0.6s var(--quxian-tan-chu) 0.5s both;
}

.you-ce-xuanze-qu {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px 32px 32px;
  gap: 22px;
  min-width: 0;
  overflow-y: visible;
}

.moshi-kapian-zu {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  gap: 20px;
  width: 100%;
  max-width: 400px;
}

.putong-moshi-kapian {
  --moshi-kapian-zhu: var(--nuanhui-lan);
  justify-self: start;
  margin-right: 48px;
  animation: moshi-kapian-jinru var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu) both;
}

.tiaozhan-moshi-kapian {
  --moshi-kapian-zhu: var(--yanse-biaobai);
  justify-self: end;
  margin-left: 48px;
  animation: moshi-kapian-jinru var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu) both;
}

@keyframes moshi-kapian-jinru {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.moshi-kapian {
  width: 100%;
  max-width: 360px;
  position: relative;
  padding: 0;
  border: 1px solid var(--kapian-mian-biankuang);
  border-radius: 22px;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  background-color: var(--moshi-kapian-zheyan);
  transition: transform var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.moshi-kapian:hover:not(:disabled) {
  transform: translateY(-4px);
  border-color: var(--moshi-kapian-zhu);
  box-shadow: var(--moshi-kapian-hover-yinying);
}

.moshi-kapian:active:not(:disabled) {
  transform: translateY(-1px) scale(0.99);
}

.moshi-kapian:disabled {
  cursor: not-allowed;
  transform: none;
}

.kapian-dingbu {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px 14px;
}

.kapian-tubiao-qu {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: var(--moshi-kapian-zhu);
  background: color-mix(in srgb, var(--moshi-kapian-zhu) 18%, transparent);
  transition: transform var(--moshi-kapian-dong-xiao) ease;
}

.moshi-kapian:hover:not(:disabled) .kapian-tubiao-qu {
  transform: scale(1.08) rotate(-3deg);
}

.kapian-tubiao {
  width: 24px;
  height: 24px;
  color: currentColor;
}

.kapian-xinxi {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.kapian-biaoti {
  font-size: 16px;
  font-weight: 700;
  color: var(--kapian-mian-biaoti);
  margin: 0;
  letter-spacing: 0.5px;
}

.kapian-fubiaoti {
  font-size: 11.5px;
  color: var(--kapian-mian-zhengwen);
  margin: 0;
}

.kapian-yulan-qu {
  padding: 0 22px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.yulan-xiangmu {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--kapian-mian-zhengwen);
  transition: transform var(--moshi-kapian-dong-xiao) ease;
}

.yulan-dian {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.yulan-dian {
  background: var(--moshi-kapian-zhu);
  box-shadow: 0 0 5px currentColor;
}

.yulan-wenzi {
  font-size: 12px;
  font-weight: 400;
}

.yulan-xiangmu-1,
.yulan-xiangmu-2,
.yulan-xiangmu-3 {
  transform-origin: left center;
}

.moshi-kapian:hover:not(:disabled) .yulan-xiangmu-1 {
  transform: translateX(4px);
}
.moshi-kapian:hover:not(:disabled) .yulan-xiangmu-2 {
  transform: translateX(5px);
}
.moshi-kapian:hover:not(:disabled) .yulan-xiangmu-3 {
  transform: translateX(4px);
}

.kapian-dibu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px 16px;
  border-top: 1px solid var(--kapian-mian-biankuang);
  margin: 0 22px;
}

.kaishi-wenben {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--kapian-mian-zhengwen);
}

.kaishi-jiantou {
  font-size: 20px;
  color: color-mix(in srgb, var(--moshi-kapian-zhu) 72%, transparent);
  transition: transform var(--moshi-kapian-dong-xiao) ease;
}

.moshi-kapian:hover:not(:disabled) .kaishi-jiantou {
  transform: translateX(4px);
}

.zhuye-diwei-shuoming {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.2);
  animation: diwei-ruchang 0.6s var(--quxian-tan-chu) 0.65s both;
}

:root[data-theme='light'] .zhuye-diwei-shuoming {
  color: rgba(0, 0, 0, 0.45);
}

.diwei-tubiao {
  width: 13px;
  height: 13px;
  color: currentColor;
  animation: xingxing-shanshuo 2s ease-in-out infinite;
}

@keyframes xingxing-shanshuo {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes zuoce-ruchang {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slogan-ruchang {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes diwei-ruchang {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1023px) {
  .zhuye-neirong-qu {
    flex-direction: column;
  }

  .zuo-ce-qinggan-qu {
    width: 100%;
    padding: 16px 20px 8px;
  }

  .qinggan-neirong-ceng {
    gap: 18px;
    padding: 18px;
  }

  .pinpai-qu {
    align-self: center;
  }

  .you-ce-xuanze-qu {
    padding: 16px 20px 36px;
    gap: 18px;
  }

  .putong-moshi-kapian {
    justify-self: stretch;
    margin-right: 0;
    max-width: none;
  }

  .tiaozhan-moshi-kapian {
    justify-self: stretch;
    margin-left: 0;
    max-width: none;
  }
}

@media (max-width: 767px) {
  .gonggong-biaoti-qu {
    padding: 20px 16px 12px;
  }

  .biaoti-wenzi {
    font-size: 26px;
    letter-spacing: 6px;
  }

  .zuo-ce-qinggan-qu {
    padding: 12px 16px 4px;
  }

  .qinggan-neirong-ceng {
    gap: 14px;
    padding: 14px;
  }

  .pinpai-logo {
    width: 36px;
    height: 36px;
  }

  .pinpai-mingcheng {
    font-size: 16px;
  }

  .zuoce-slogan {
    font-size: 12px;
  }

  .you-ce-xuanze-qu {
    padding: 14px 16px 28px;
    gap: 14px;
  }

  .kapian-dingbu {
    padding: 16px 16px 12px;
    gap: 12px;
  }

  .kapian-tubiao-qu {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  .kapian-tubiao {
    font-size: 21px;
  }

  .kapian-biaoti {
    font-size: 15px;
  }

  .kapian-yulan-qu {
    padding: 0 16px 10px;
  }

  .kapian-dibu {
    padding: 10px 16px 12px;
    margin: 0 16px;
  }

  .yulan-wenzi {
    font-size: 11px;
  }
}

@media (max-width: 640px) {
  .gonggong-biaoti-qu {
    padding: 12px 16px 8px;
  }

  .biaoti-wenzi {
    font-size: 22px;
    letter-spacing: 4px;
  }

  .biaoti-zhushi {
    font-size: 11px;
  }

  .zuo-ce-qinggan-qu {
    padding: 4px 16px 0;
  }

  .qinggan-neirong-ceng {
    gap: 8px;
    padding: 8px;
    border: none;
    background-color: transparent;
    background-image: none;
    backdrop-filter: none;
    box-shadow: none;
  }

  .pinpai-qu {
    display: none;
  }

  .zuoce-slogan {
    display: none;
  }

  .you-ce-xuanze-qu {
    padding: 8px 16px 16px;
    gap: 8px;
  }

  .moshi-kapian-zu {
    gap: 10px;
  }

  .moshi-kapian {
    border-radius: 16px;
  }

  .kapian-dingbu {
    padding: 10px 12px 8px;
    gap: 10px;
  }

  .kapian-tubiao-qu {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .kapian-tubiao {
    font-size: 18px;
  }

  .kapian-biaoti {
    font-size: 14px;
  }

  .kapian-fubiaoti {
    font-size: 10.5px;
  }

  .kapian-yulan-qu {
    padding: 0 12px 6px;
    gap: 5px;
  }

  .yulan-wenzi {
    font-size: 10px;
  }

  .kapian-dibu {
    padding: 6px 12px 8px;
    margin: 0 12px;
  }

  .kaishi-wenben {
    font-size: 11px;
  }

  .kaishi-jiantou {
    font-size: 16px;
  }

  .zhuye-diwei-shuoming {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pinpai-logo,
  .diwei-tubiao {
    animation: none;
  }

  .moshi-kapian,
  .kapian-tubiao-qu,
  .yulan-xiangmu,
  .kaishi-jiantou {
    transition: none !important;
  }

  .moshi-kapian:hover {
    transform: none;
  }

  .moshi-kapian:hover:not(:disabled) .kapian-tubiao-qu {
    transform: none;
  }

  .moshi-kapian:hover:not(:disabled) .yulan-xiangmu-1,
  .moshi-kapian:hover:not(:disabled) .yulan-xiangmu-2,
  .moshi-kapian:hover:not(:disabled) .yulan-xiangmu-3 {
    transform: none;
  }

  .pinpai-qu,
  .zuoce-slogan,
  .putong-moshi-kapian,
  .tiaozhan-moshi-kapian,
  .gonggong-biaoti-qu,
  .zhuye-diwei-shuoming {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
