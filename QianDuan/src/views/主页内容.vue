<template>
  <div ref="zhuyeQuyu" class="zhuye-quyu">
    <div class="gonggong-biaoti-qu" :class="{ 'ru-chang-ke-jian': 入场可视(1) }">
      <div class="biaoti-neirong">
        <span class="biaoti-wenzi">{{ huoQuFanYi('zhuYe', 'huanYingHuiLai') }}</span>
        <span class="biaoti-fenge" />
        <span class="biaoti-zhushi">{{ huoQuFanYi('zhuYe', 'kaiQiZhuanShu') }}</span>
      </div>
    </div>

    <div class="zhuye-neirong-qu">
      <div class="zuo-ce-kong-qu" aria-hidden="true" />

      <div class="you-ce-xuanze-qu">
        <div class="moshi-kapian-zu">
          <MoShiKa
            class="moshi-kapian putong-moshi-kapian"
            :class="{ 'ru-chang-ke-jian': 入场可视(2) }"
            :inert="!入场可视(2)"
            :aria-hidden="入场可视(2) ? undefined : 'true'"
            @选择="jinRuPuTongMoShi"
          >
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

          <MoShiKa
            class="moshi-kapian tiaozhan-moshi-kapian"
            :class="{ 'ru-chang-ke-jian': 入场可视(3) }"
            :inert="!入场可视(3)"
            :aria-hidden="入场可视(3) ? undefined : 'true'"
            @选择="jinRuTiaoZhanMoShi"
          >
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

        <div class="zhuye-diwei-shuoming" :class="{ 'ru-chang-ke-jian': 入场可视(4) }">
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
import { huoQuFanYi } from '@/config/翻译表'
import { quXian } from '@/config/设计令牌'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const zhuyeQuyu = ref<HTMLElement | null>(null)

const 入场可视 = (xuHao: number): boolean => 用户仓库.主页入场序号 >= xuHao

function jinRuPuTongMoShi() {
  router.push('/profile-setup')
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
  --zhuye-chi: clamp(0.46px, min(0.0732601vw, 0.1302083vh), 2.4px);
  --zhuye-zihao-biaoti: max(18px, calc(32 * var(--zhuye-chi)));
  --zhuye-zihao-fu: max(10px, calc(13 * var(--zhuye-chi)));
  --zhuye-zihao-ka-biaoti: max(12px, calc(16 * var(--zhuye-chi)));
  --zhuye-zihao-ka-fu: max(9px, calc(11.5 * var(--zhuye-chi)));
  --zhuye-zihao-zhengwen: max(9.5px, calc(12 * var(--zhuye-chi)));
  --zhuye-zihao-anniu: max(10px, calc(12.5 * var(--zhuye-chi)));
  width: 100%;
  flex: 1 0 auto;
  min-height: 0;
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
  padding: calc(28 * var(--zhuye-chi)) calc(36 * var(--zhuye-chi))
    calc(16 * var(--zhuye-chi));
}

.biaoti-neirong {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: calc(6 * var(--zhuye-chi));
  padding: calc(10 * var(--zhuye-chi)) calc(28 * var(--zhuye-chi));
  max-width: 100%;
  border: max(1px, calc(1 * var(--zhuye-chi))) solid var(--kapian-mian-biankuang);
  border-radius: calc(16 * var(--zhuye-chi));
  background-color: var(--moshi-kapian-zheyan);
  background-image: none;
  backdrop-filter: var(--boli-mohu);
  box-shadow: var(--boli-yinying);
}

.biaoti-wenzi {
  font-size: var(--zhuye-zihao-biaoti);
  font-weight: 800;
  color: var(--wenben-zhuse);
  letter-spacing: calc(8 * var(--zhuye-chi));
  line-height: 1.2;
}

.biaoti-fenge {
  width: calc(40 * var(--zhuye-chi));
  height: max(1px, calc(2 * var(--zhuye-chi)));
  border-radius: calc(1 * var(--zhuye-chi));
  background: linear-gradient(90deg, transparent, var(--nuanhui-lan), transparent);
  opacity: 0.5;
}

.biaoti-zhushi {
  font-size: var(--zhuye-zihao-fu);
  color: var(--wenben-zhuse);
  letter-spacing: calc(2 * var(--zhuye-chi));
  font-weight: 400;
  text-transform: uppercase;
}

.zhuye-neirong-qu {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
  padding-bottom: calc(24 * var(--zhuye-chi));
}


.zuo-ce-kong-qu {
  width: 48%;
  flex-shrink: 0;
  pointer-events: none;
}

.you-ce-xuanze-qu {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: calc(16 * var(--zhuye-chi)) calc(32 * var(--zhuye-chi))
    calc(32 * var(--zhuye-chi));
  gap: calc(22 * var(--zhuye-chi));
  min-width: 0;
  overflow-y: visible;
}

.moshi-kapian-zu {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  gap: calc(20 * var(--zhuye-chi));
  width: 100%;
  max-width: calc(408 * var(--zhuye-chi));
}

.putong-moshi-kapian {
  --moshi-kapian-zhu: var(--nuanhui-lan);
  justify-self: start;
  margin-right: calc(48 * var(--zhuye-chi));
}

.tiaozhan-moshi-kapian {
  --moshi-kapian-zhu: var(--yanse-biaobai);
  justify-self: end;
  margin-left: calc(48 * var(--zhuye-chi));
}

.moshi-kapian {
  width: 100%;
  max-width: calc(360 * var(--zhuye-chi));
  position: relative;
  padding: 0;
  border: max(1px, calc(1 * var(--zhuye-chi))) solid var(--kapian-mian-biankuang);
  border-radius: calc(22 * var(--zhuye-chi));
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  background-color: var(--moshi-kapian-zheyan);
  transition: transform var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.moshi-kapian:hover:not(:disabled) {
  transform: translateY(calc(-4 * var(--zhuye-chi)));
  border-color: var(--moshi-kapian-zhu);
  box-shadow: var(--moshi-kapian-hover-yinying);
}

.moshi-kapian:active:not(:disabled) {
  transform: translateY(calc(-1 * var(--zhuye-chi))) scale(0.99);
}

.moshi-kapian:disabled {
  cursor: not-allowed;
  transform: none;
}

.kapian-dingbu {
  display: flex;
  align-items: center;
  gap: calc(14 * var(--zhuye-chi));
  padding: calc(20 * var(--zhuye-chi)) calc(22 * var(--zhuye-chi))
    calc(14 * var(--zhuye-chi));
}

.kapian-tubiao-qu {
  flex-shrink: 0;
  width: calc(48 * var(--zhuye-chi));
  height: calc(48 * var(--zhuye-chi));
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(14 * var(--zhuye-chi));
  color: var(--moshi-kapian-zhu);
  background: color-mix(in srgb, var(--moshi-kapian-zhu) 18%, transparent);
  transition: transform var(--moshi-kapian-dong-xiao) ease;
}

.moshi-kapian:hover:not(:disabled) .kapian-tubiao-qu {
  transform: scale(1.08) rotate(-3deg);
}

.kapian-tubiao {
  width: calc(24 * var(--zhuye-chi));
  height: calc(24 * var(--zhuye-chi));
  color: currentColor;
}

.kapian-xinxi {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--zhuye-chi));
  min-width: 0;
}

.kapian-biaoti {
  font-size: var(--zhuye-zihao-ka-biaoti);
  font-weight: 700;
  color: var(--kapian-mian-biaoti);
  margin: 0;
  letter-spacing: calc(0.5 * var(--zhuye-chi));
}

.kapian-fubiaoti {
  font-size: var(--zhuye-zihao-ka-fu);
  color: var(--kapian-mian-zhengwen);
  margin: 0;
}

.kapian-yulan-qu {
  padding: 0 calc(22 * var(--zhuye-chi)) calc(12 * var(--zhuye-chi));
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--zhuye-chi));
}

.yulan-xiangmu {
  display: flex;
  align-items: center;
  gap: calc(10 * var(--zhuye-chi));
  color: var(--kapian-mian-zhengwen);
  transition: transform var(--moshi-kapian-dong-xiao) ease;
}

.yulan-dian {
  width: max(3px, calc(5 * var(--zhuye-chi)));
  height: max(3px, calc(5 * var(--zhuye-chi)));
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--moshi-kapian-zhu);
  box-shadow: 0 0 max(3px, calc(5 * var(--zhuye-chi))) currentColor;
}

.yulan-wenzi {
  font-size: var(--zhuye-zihao-zhengwen);
  font-weight: 400;
}

.yulan-xiangmu-1,
.yulan-xiangmu-2,
.yulan-xiangmu-3 {
  transform-origin: left center;
}

.moshi-kapian:hover:not(:disabled) .yulan-xiangmu-1 {
  transform: translateX(calc(4 * var(--zhuye-chi)));
}
.moshi-kapian:hover:not(:disabled) .yulan-xiangmu-2 {
  transform: translateX(calc(5 * var(--zhuye-chi)));
}
.moshi-kapian:hover:not(:disabled) .yulan-xiangmu-3 {
  transform: translateX(calc(4 * var(--zhuye-chi)));
}

.kapian-dibu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12 * var(--zhuye-chi)) calc(22 * var(--zhuye-chi))
    calc(16 * var(--zhuye-chi));
  border-top: max(1px, calc(1 * var(--zhuye-chi))) solid var(--kapian-mian-biankuang);
  margin: 0 calc(22 * var(--zhuye-chi));
}

.kaishi-wenben {
  font-size: var(--zhuye-zihao-anniu);
  font-weight: 600;
  color: var(--kapian-mian-zhengwen);
}

.kaishi-jiantou {
  font-size: calc(20 * var(--zhuye-chi));
  line-height: 1;
  color: color-mix(in srgb, var(--moshi-kapian-zhu) 72%, transparent);
  transition: transform var(--moshi-kapian-dong-xiao) ease;
}

.moshi-kapian:hover:not(:disabled) .kaishi-jiantou {
  transform: translateX(calc(4 * var(--zhuye-chi)));
}

.zhuye-diwei-shuoming {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(8 * var(--zhuye-chi));
  font-size: var(--zhuye-zihao-ka-fu);
  color: rgba(255, 255, 255, 0.2);
}

:root[data-theme='light'] .zhuye-diwei-shuoming {
  color: rgba(0, 0, 0, 0.45);
}

.diwei-tubiao {
  width: max(10px, calc(13 * var(--zhuye-chi)));
  height: max(10px, calc(13 * var(--zhuye-chi)));
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


@media (min-width: 768px) and (orientation: portrait) {
  .zhuye-quyu {
    --zhuye-chi: clamp(0.8px, min(0.0732601vw, 0.1302083vh), 2.4px);
  }
}


@media (max-height: 560px) and (min-width: 768px) {
  .gonggong-biaoti-qu {
    padding: calc(10 * var(--zhuye-chi)) calc(24 * var(--zhuye-chi))
      calc(8 * var(--zhuye-chi));
  }

  .biaoti-fenge,
  .biaoti-zhushi {
    display: none;
  }

  .zhuye-neirong-qu {
    padding-bottom: calc(8 * var(--zhuye-chi));
  }

  .you-ce-xuanze-qu {
    padding: calc(4 * var(--zhuye-chi)) calc(16 * var(--zhuye-chi))
      calc(10 * var(--zhuye-chi));
    gap: calc(10 * var(--zhuye-chi));
  }

  .moshi-kapian-zu {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
    gap: calc(16 * var(--zhuye-chi));
    max-width: calc(760 * var(--zhuye-chi));
  }

  .putong-moshi-kapian,
  .tiaozhan-moshi-kapian {
    justify-self: stretch;
    margin-right: 0;
    margin-left: 0;
    max-width: none;
  }

  .kapian-dingbu {
    gap: calc(10 * var(--zhuye-chi));
    padding: calc(12 * var(--zhuye-chi)) calc(14 * var(--zhuye-chi))
      calc(8 * var(--zhuye-chi));
  }

  .kapian-tubiao-qu {
    width: calc(36 * var(--zhuye-chi));
    height: calc(36 * var(--zhuye-chi));
    border-radius: calc(10 * var(--zhuye-chi));
  }

  .kapian-yulan-qu {
    padding: 0 calc(14 * var(--zhuye-chi)) calc(8 * var(--zhuye-chi));
    gap: calc(6 * var(--zhuye-chi));
  }

  .kapian-dibu {
    padding: calc(8 * var(--zhuye-chi)) calc(14 * var(--zhuye-chi))
      calc(10 * var(--zhuye-chi));
    margin: 0 calc(14 * var(--zhuye-chi));
  }

  .zhuye-diwei-shuoming {
    display: none;
  }
}


@media (max-width: 767px) {
  .zhuye-quyu {
    --zhuye-chi: 1px;
  }

  .gonggong-biaoti-qu {
    padding: calc(var(--jiange-zhong) + var(--jiange-4)) var(--jiange-zhong)
      var(--jiange-12);
  }

  .biaoti-neirong {
    gap: var(--jiange-6);
    padding: var(--jiange-10) calc(var(--jiange-da) + var(--jiange-4));
    border-radius: var(--yuanjiao-da);
  }

  .biaoti-wenzi {
    font-size: 26px;
    letter-spacing: 6px;
  }

  .biaoti-fenge {
    width: 40px;
    height: 2px;
  }

  .biaoti-zhushi {
    font-size: var(--ziti-xiao);
    letter-spacing: 2px;
  }

  .zhuye-neirong-qu {
    flex-direction: column;
    padding-bottom: var(--jiange-da);
  }

  .zuo-ce-kong-qu {
    display: none;
  }

  .you-ce-xuanze-qu {
    padding: calc(var(--jiange-xiao) + var(--jiange-6)) var(--jiange-zhong)
      calc(var(--jiange-da) + var(--jiange-4));
    gap: calc(var(--jiange-xiao) + var(--jiange-6));
  }

  .moshi-kapian-zu {
    gap: var(--jiange-12);
    max-width: 420px;
  }

  .putong-moshi-kapian,
  .tiaozhan-moshi-kapian {
    justify-self: stretch;
    margin-right: 0;
    margin-left: 0;
    max-width: none;
  }

  .moshi-kapian {
    border-radius: var(--yuanjiao-da);
  }

  .kapian-dingbu {
    padding: var(--jiange-zhong) var(--jiange-zhong) var(--jiange-12);
    gap: var(--jiange-12);
  }

  .kapian-tubiao-qu {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  .kapian-tubiao {
    width: 22px;
    height: 22px;
  }

  .kapian-biaoti {
    font-size: 15px;
    letter-spacing: 0;
  }

  .kapian-fubiaoti {
    font-size: 11px;
  }

  .kapian-yulan-qu {
    padding: 0 var(--jiange-zhong) var(--jiange-10);
    gap: var(--jiange-xiao);
  }

  .yulan-wenzi {
    font-size: 11px;
  }

  .kapian-dibu {
    padding: var(--jiange-10) var(--jiange-zhong) var(--jiange-12);
    margin: 0 var(--jiange-zhong);
  }

  .kaishi-wenben {
    font-size: var(--ziti-xiao);
  }

  .kaishi-jiantou {
    font-size: 18px;
  }

  .zhuye-diwei-shuoming {
    display: none;
  }
}

@media (max-width: 640px) {
  .gonggong-biaoti-qu {
    padding: var(--jiange-12) var(--jiange-zhong) var(--jiange-xiao);
  }

  .biaoti-wenzi {
    font-size: 22px;
    letter-spacing: 4px;
  }

  .biaoti-zhushi {
    font-size: 11px;
  }

  .zhuye-neirong-qu {
    padding-bottom: var(--jiange-zhong);
  }

  .you-ce-xuanze-qu {
    padding: var(--jiange-xiao) var(--jiange-zhong) var(--jiange-zhong);
    gap: var(--jiange-xiao);
  }

  .moshi-kapian-zu {
    gap: var(--jiange-10);
  }

  .moshi-kapian {
    border-radius: 16px;
  }

  .kapian-dingbu {
    padding: var(--jiange-10) var(--jiange-12) var(--jiange-xiao);
    gap: var(--jiange-10);
  }

  .kapian-tubiao-qu {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .kapian-tubiao {
    width: 18px;
    height: 18px;
  }

  .kapian-biaoti {
    font-size: 14px;
  }

  .kapian-fubiaoti {
    font-size: 10.5px;
  }

  .kapian-yulan-qu {
    padding: 0 var(--jiange-12) var(--jiange-6);
    gap: var(--jiange-6);
  }

  .yulan-wenzi {
    font-size: 10px;
  }

  .kapian-dibu {
    padding: var(--jiange-6) var(--jiange-12) var(--jiange-xiao);
    margin: 0 var(--jiange-12);
  }

  .kaishi-wenben {
    font-size: 11px;
  }

  .kaishi-jiantou {
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
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
}

.gonggong-biaoti-qu:not(.ru-chang-ke-jian) .biaoti-neirong,
.moshi-kapian:not(.ru-chang-ke-jian),
.zhuye-diwei-shuoming:not(.ru-chang-ke-jian) {
  opacity: 0;
}

.moshi-kapian:not(.ru-chang-ke-jian) {
  pointer-events: none;
}

.gonggong-biaoti-qu.ru-chang-ke-jian .biaoti-neirong,
.moshi-kapian.ru-chang-ke-jian,
.zhuye-diwei-shuoming.ru-chang-ke-jian {
  animation: zhuye-ru-chang var(--deng-lu-shi-xu) var(--quxian-biao-zhun) var(--zhuye-wen-zi-yan-shi) backwards;
}

@keyframes zhuye-ru-chang {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gonggong-biaoti-qu.ru-chang-ke-jian .biaoti-neirong,
  .moshi-kapian.ru-chang-ke-jian,
  .zhuye-diwei-shuoming.ru-chang-ke-jian {
    animation: none;
  }
}
</style>
