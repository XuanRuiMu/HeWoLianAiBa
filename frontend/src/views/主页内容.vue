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
          <div class="juese-zhanshi-qu">
            <img src="/图片/主页元素/吴昊阳终稿静态图.png" class="juese-tupian" alt="" />
          </div>
          <p class="zuoce-slogan">{{ huoQuFanYi('zhuYe', 'slogan') }}</p>
        </div>
      </div>

      <div class="you-ce-xuanze-qu">
        <div class="moshi-kapian-zu">
          <button class="moshi-kapian putong-moshi-kapian" @click="jinRuPuTongMoShi">
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
          </button>

          <button class="moshi-kapian tiaozhan-moshi-kapian" @click="jinRuTiaoZhanMoShi">
            <span class="jijiang-tuichu-biaoqian">{{ huoQuFanYi('zhuYe', 'jiJiangTuiChu') }}</span>
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
          </button>
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
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const zhuyeQuyu = ref<HTMLElement | null>(null)

function jinRuPuTongMoShi() {
  router.push('/profile-setup?moshi=putong')
}

function jinRuTiaoZhanMoShi() {
  // 挑战模式暂时搁置，点击不触发路由跳转
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
        { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
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
        { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
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
        { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
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
}

.gonggong-biaoti-qu {
  text-align: center;
  padding: 28px 36px 16px;
  animation: biaoti-ruchang 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.biaoti-neirong {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.biaoti-wenzi {
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 8px;
  line-height: 1.2;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

:root[data-theme='浅色'] .biaoti-wenzi {
  color: #191919;
  background: linear-gradient(135deg, #191919 0%, rgba(25, 25, 25, 0.7) 100%);
  -webkit-background-clip: text;
  background-clip: text;
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
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 2px;
  font-weight: 400;
  text-transform: uppercase;
}

:root[data-theme='浅色'] .biaoti-zhushi {
  color: rgba(0, 0, 0, 0.45);
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
}

.pinpai-qu {
  display: flex;
  align-items: center;
  gap: 12px;
  align-self: flex-start;
  animation: zuoce-ruchang 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
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
  color: #ffffff;
  letter-spacing: 1.5px;
}

:root[data-theme='浅色'] .pinpai-mingcheng {
  color: #191919;
}

.juese-zhanshi-qu {
  width: 100%;
  animation: juese-ruchang 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

.juese-tupian {
  width: 100%;
  height: auto;
  max-height: calc(100vh - 240px);
  object-fit: contain;
  object-position: center;
  display: block;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 14px 36px rgba(0, 0, 0, 0.22));
}

:root[data-theme='浅色'] .juese-tupian {
  filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.08));
}

.juese-tupian:hover {
  transform: scale(1.02);
}

.zuoce-slogan {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
  letter-spacing: 1px;
  line-height: 1.6;
  animation: slogan-ruchang 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
}

:root[data-theme='浅色'] .zuoce-slogan {
  color: rgba(0, 0, 0, 0.32);
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
  justify-self: start;
  margin-right: 48px;
  animation: kapian-zuo-shang 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

.tiaozhan-moshi-kapian {
  justify-self: end;
  margin-left: 48px;
  animation: kapian-you-xia 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both;
}

.jijiang-tuichu-biaoqian {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #ffffff;
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.9), rgba(251, 146, 60, 0.9));
  box-shadow: 0 4px 14px rgba(255, 107, 157, 0.35);
  pointer-events: none;
}

:root[data-theme='浅色'] .jijiang-tuichu-biaoqian {
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(255, 107, 157, 0.25);
}

@keyframes kapian-zuo-shang {
  from {
    opacity: 0;
    transform: translateX(30px) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

@keyframes kapian-you-xia {
  from {
    opacity: 0;
    transform: translateX(-30px) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

.moshi-kapian {
  width: 100%;
  max-width: 360px;
  position: relative;
  padding: 0;
  border: none;
  border-radius: 22px;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  background: transparent;
  transition:
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.putong-moshi-kapian {
  background: linear-gradient(
    135deg,
    rgba(107, 140, 166, 0.11) 0%,
    rgba(147, 130, 186, 0.07) 50%,
    rgba(107, 140, 166, 0.05) 100%
  );
  border: 1px solid rgba(107, 140, 166, 0.13);
}

.tiaozhan-moshi-kapian {
  background: linear-gradient(
    135deg,
    rgba(255, 107, 157, 0.11) 0%,
    rgba(251, 146, 60, 0.07) 50%,
    rgba(255, 107, 157, 0.05) 100%
  );
  border: 1px solid rgba(255, 107, 157, 0.13);
}

:root[data-theme='浅色'] .putong-moshi-kapian {
  background: linear-gradient(
    135deg,
    rgba(245, 248, 252, 0.82) 0%,
    rgba(240, 244, 250, 0.78) 50%,
    rgba(245, 248, 252, 0.74) 100%
  );
  border: 1px solid rgba(107, 140, 166, 0.22);
}

:root[data-theme='浅色'] .tiaozhan-moshi-kapian {
  background: linear-gradient(
    135deg,
    rgba(255, 248, 250, 0.82) 0%,
    rgba(255, 245, 240, 0.78) 50%,
    rgba(255, 248, 250, 0.74) 100%
  );
  border: 1px solid rgba(255, 107, 157, 0.22);
}

.moshi-kapian:hover {
  transform: translateY(-4px);
}

.putong-moshi-kapian:hover {
  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.22),
    0 0 36px rgba(107, 140, 166, 0.1);
  border-color: rgba(107, 140, 166, 0.25);
}

.tiaozhan-moshi-kapian:hover {
  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.22),
    0 0 36px rgba(255, 107, 157, 0.1);
  border-color: rgba(255, 107, 157, 0.25);
}

:root[data-theme='浅色'] .putong-moshi-kapian:hover {
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.05),
    0 0 28px rgba(107, 140, 166, 0.06);
}

:root[data-theme='浅色'] .tiaozhan-moshi-kapian:hover {
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.05),
    0 0 28px rgba(255, 107, 157, 0.06);
}

.moshi-kapian:active {
  transform: translateY(-1px) scale(0.99);
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
  transition: transform 0.3s ease;
}

.putong-moshi-kapian .kapian-tubiao-qu {
  background: linear-gradient(135deg, rgba(107, 140, 166, 0.28), rgba(196, 160, 176, 0.18));
}

.tiaozhan-moshi-kapian .kapian-tubiao-qu {
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.28), rgba(251, 191, 36, 0.18));
}

:root[data-theme='浅色'] .putong-moshi-kapian .kapian-tubiao-qu {
  background: linear-gradient(135deg, rgba(107, 140, 166, 0.1), rgba(196, 160, 176, 0.06));
}

:root[data-theme='浅色'] .tiaozhan-moshi-kapian .kapian-tubiao-qu {
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.1), rgba(251, 191, 36, 0.06));
}

.moshi-kapian:hover .kapian-tubiao-qu {
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
  color: #ffffff;
  margin: 0;
  letter-spacing: 0.5px;
}

:root[data-theme='浅色'] .kapian-biaoti {
  color: #191919;
}

.kapian-fubiaoti {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.42);
  margin: 0;
}

:root[data-theme='浅色'] .kapian-fubiaoti {
  color: rgba(0, 0, 0, 0.55);
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
  opacity: 0.62;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.moshi-kapian:hover .yulan-xiangmu {
  opacity: 1;
}

.yulan-dian {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.putong-moshi-kapian .yulan-dian {
  background: var(--nuanhui-lan);
  box-shadow: 0 0 5px rgba(107, 140, 166, 0.35);
}

.tiaozhan-moshi-kapian .yulan-dian {
  background: var(--yanse-biaobai);
  box-shadow: 0 0 5px rgba(255, 107, 157, 0.35);
}

.yulan-wenzi {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 400;
}

:root[data-theme='浅色'] .yulan-wenzi {
  color: rgba(0, 0, 0, 0.58);
}

.yulan-xiangmu-1 {
  transform-origin: left center;
}
.yulan-xiangmu-2 {
  transform-origin: left center;
  transition-delay: 0.05s;
}
.yulan-xiangmu-3 {
  transform-origin: left center;
  transition-delay: 0.1s;
}

.moshi-kapian:hover .yulan-xiangmu-1 {
  transform: translateX(4px);
}
.moshi-kapian:hover .yulan-xiangmu-2 {
  transform: translateX(5px);
}
.moshi-kapian:hover .yulan-xiangmu-3 {
  transform: translateX(4px);
}

.kapian-dibu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  margin: 0 22px;
}

:root[data-theme='浅色'] .kapian-dibu {
  border-top-color: rgba(0, 0, 0, 0.03);
}

.kaishi-wenben {
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  transition: color 0.3s ease;
}

:root[data-theme='浅色'] .kaishi-wenben {
  color: rgba(0, 0, 0, 0.55);
}

.putong-moshi-kapian:hover .kaishi-wenben {
  color: var(--nuanhui-lan);
}
.tiaozhan-moshi-kapian:hover .kaishi-wenben {
  color: var(--yanse-biaobai);
}

:root[data-theme='浅色'] .putong-moshi-kapian:hover .kaishi-wenben {
  color: var(--nuanhui-lan-shen);
}
:root[data-theme='浅色'] .tiaozhan-moshi-kapian:hover .kaishi-wenben {
  color: #e84a7a;
}

.kaishi-jiantou {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.12);
  transition: all 0.3s ease;
}

:root[data-theme='浅色'] .kaishi-jiantou {
  color: rgba(0, 0, 0, 0.1);
}

.putong-moshi-kapian:hover .kaishi-jiantou {
  color: var(--nuanhui-lan);
  transform: translateX(4px);
}

.tiaozhan-moshi-kapian:hover .kaishi-jiantou {
  color: var(--yanse-biaobai);
  transform: translateX(4px);
}

.zhuye-diwei-shuoming {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.2);
  animation: diwei-ruchang 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
}

:root[data-theme='浅色'] .zhuye-diwei-shuoming {
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

@keyframes juese-ruchang {
  from {
    opacity: 0;
    transform: translateX(-36px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
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

  .juese-tupian {
    max-height: 40vh;
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

  .juese-tupian {
    max-height: 30vh;
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
  }

  .pinpai-qu {
    display: none;
  }

  .juese-tupian {
    max-height: 150px;
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

  .moshi-kapian:hover .kapian-tubiao-qu {
    transform: none;
  }

  .moshi-kapian:hover .yulan-xiangmu-1,
  .moshi-kapian:hover .yulan-xiangmu-2,
  .moshi-kapian:hover .yulan-xiangmu-3 {
    transform: none;
  }

  .pinpai-qu,
  .juese-zhanshi-qu,
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
