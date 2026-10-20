<template>
  <div ref="zhuyeQuyu" class="zhuye-quyu">
    <header class="huanying-qu" :class="{ 'ru-chang-ke-jian': 入场可视(1) }">
      <p class="pinpai-hang">
        <img class="pinpai-logo" :src="品牌图标" alt="" width="24" height="24" />
        <span class="pinpai-ming">{{ huoQuFanYi('zhuYe', 'pinPaiMing') }}</span>
      </p>
      <h1 class="huanying-biaoti">{{ huoQuFanYi('zhuYe', 'huanYingHuiLai') }}</h1>
      <p class="huanying-fubiaoti">{{ huoQuFanYi('zhuYe', 'kaiQiZhuanShu') }}</p>
    </header>

    <div class="wanjia-ka" :class="{ 'ru-chang-ke-jian': 入场可视(2) }">
      <span class="wanjia-touxiang-wei">
        <TouXiang :tou-xiang="玩家头像" :mo-ren-zi="玩家名首字" shen-fen="yonghu" />
      </span>
      <span class="wanjia-wen">
        <span class="wanjia-ming">{{ 玩家昵称 }}</span>
        <span class="wanjia-bianhao">{{ 玩家编号 }}</span>
      </span>
      <span class="wanjia-zhuangtai" :class="{ 'wanjia-zhuangtai-qiang': 资料待完善 }">
        {{ 资料状态文案 }}
      </span>
      <span class="wanjia-qianming">{{ 玩家签名 }}</span>
    </div>

    <div class="rukou-qu" role="group" :aria-label="huoQuFanYi('zhuYe', 'xuanZeMoShi')">
      <MoShiKa
        class="moshi-kapian putong-moshi-kapian"
        :class="{ 'ru-chang-ke-jian': 入场可视(3) }"
        :inert="!入场可视(3)"
        :aria-hidden="入场可视(3) ? undefined : 'true'"
        @xuan-ze="jinRuPuTongMoShi"
      >
        <span class="ka-tou">
          <span class="ka-tubiao-wei">
            <svg
              class="ka-tubiao"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
          </span>
          <span class="ka-wen">
            <span class="ka-ming">{{ huoQuFanYi('zhuYe', 'putongMoShi') }}</span>
            <span class="ka-fu">{{ huoQuFanYi('zhuYe', 'putongFuBiaoTi') }}</span>
          </span>
        </span>
        <span class="ka-yao">
          <span class="yao-hang">
            <span class="yao-dian" aria-hidden="true" />
            <span class="yao-wen">{{ huoQuFanYi('zhuYe', 'ziDingYiJiaoSe') }}</span>
          </span>
          <span class="yao-hang">
            <span class="yao-dian" aria-hidden="true" />
            <span class="yao-wen">{{ huoQuFanYi('zhuYe', 'shiHeXinShou') }}</span>
          </span>
        </span>
        <span class="ka-di">
          <span class="ka-cta">{{ huoQuFanYi('zhuYe', 'kaiShiTiYan') }}</span>
          <svg
            class="ka-jian"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </MoShiKa>

      <MoShiKa
        class="moshi-kapian tiaozhan-moshi-kapian"
        :class="{ 'ru-chang-ke-jian': 入场可视(4) }"
        :inert="!入场可视(4)"
        :aria-hidden="入场可视(4) ? undefined : 'true'"
        @xuan-ze="jinRuTiaoZhanMoShi"
      >
        <span class="ka-tou">
          <span class="ka-tubiao-wei">
            <svg
              class="ka-tubiao"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <span class="ka-wen">
            <span class="ka-ming">{{ huoQuFanYi('zhuYe', 'tiaoZhanMoShi') }}</span>
            <span class="ka-fu">{{ huoQuFanYi('zhuYe', 'tiaoZhanFuBiaoTi') }}</span>
          </span>
        </span>
        <span class="ka-yao">
          <span class="yao-hang">
            <span class="yao-dian" aria-hidden="true" />
            <span class="yao-wen">{{ huoQuFanYi('zhuYe', 'xiTongSuiJi') }}</span>
          </span>
          <span class="yao-hang">
            <span class="yao-dian" aria-hidden="true" />
            <span class="yao-wen">{{ huoQuFanYi('zhuYe', 'fenShuJiRuPaiMing') }}</span>
          </span>
          <span class="yao-hang">
            <span class="yao-dian" aria-hidden="true" />
            <span class="yao-wen">{{ huoQuFanYi('zhuYe', 'shiHeQingChangGaoShou') }}</span>
          </span>
        </span>
        <span class="ka-di">
          <span class="ka-cta">{{ huoQuFanYi('zhuYe', 'jieShouTiaoZhan') }}</span>
          <svg
            class="ka-jian"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </MoShiKa>
    </div>

    <p class="zhuangtai-tiao" :class="{ 'ru-chang-ke-jian': 入场可视(5) }">
      <svg class="zhuangtai-tubiao" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
      </svg>
      <span class="zhuangtai-wen">{{ huoQuFanYi('zhuYe', 'diWeiShuoMing') }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MoShiKa from '@/components/模式卡.vue'
import TouXiang from '@/components/头像.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/翻译表'
import { quXian } from '@/config/设计令牌'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const zhuyeQuyu = ref<HTMLElement | null>(null)

const 品牌图标 = '/favicon.svg'

const 入场可视 = (xuHao: number): boolean => 用户仓库.主页入场序号 >= xuHao

const 玩家 = computed(() => 用户仓库.dangQianYongHu)

const 玩家真名 = computed(() => {
  const 用户 = 玩家.value
  return (用户?.ni_cheng?.trim() || 用户?.yong_hu_ming?.trim()) ?? ''
})

const 玩家昵称 = computed(() => 玩家真名.value || huoQuFanYi('zhuYe', 'wanJiaZhanWeiMing'))

const 玩家名首字 = computed(() => 玩家真名.value.slice(0, 1))

const 玩家头像 = computed(() => 玩家.value?.tou_xiang ?? null)

const 玩家编号 = computed(() => {
  const 编号 = 玩家.value?.id?.slice(0, 8).toUpperCase() ?? ''
  if (!编号) return huoQuFanYi('zhuYe', 'bianHaoZanWei')
  return `${huoQuFanYi('zhuYe', 'bianHao')} ${编号}`
})

const 玩家签名 = computed(() => 玩家.value?.qian_ming?.trim() || huoQuFanYi('zhuYe', 'zanWuQianMing'))

const 资料待完善 = computed(() => {
  const 用户 = 玩家.value
  if (!用户) return false
  return !(用户.tou_xiang && 用户.qian_ming?.trim())
})

const 资料状态文案 = computed(() => {
  if (!玩家.value) return huoQuFanYi('zhuYe', 'ziLiaoTongBuZhong')
  return 资料待完善.value
    ? huoQuFanYi('zhuYe', 'ziLiaoDaiWanShan')
    : huoQuFanYi('zhuYe', 'ziLiaoYiWanShan')
})

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

  const shangCe = rongQi.querySelector('.huanying-qu') as HTMLElement | null
  const zhongCe = rongQi.querySelector('.wanjia-ka') as HTMLElement | null
  const xiaCe = rongQi.querySelector('.rukou-qu') as HTMLElement | null

  const dongHuaZu: Animation[] = []

  if (shangCe) {
    dongHuaZu.push(
      shangCe.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-30px)' },
        ],
        { duration: 400, easing: quXian.biaoZhun, fill: 'forwards' },
      ),
    )
  }

  if (zhongCe) {
    dongHuaZu.push(
      zhongCe.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(-60px)' },
        ],
        { duration: 500, easing: quXian.biaoZhun, fill: 'forwards' },
      ),
    )
  }

  if (xiaCe) {
    dongHuaZu.push(
      xiaCe.animate(
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
  --zj-mian: var(--beijing-kaopian);
  --zj-mian-er: var(--beijing-ciuse);
  --zj-xian: var(--kapian-mian-biankuang);
  --zj-xian-ruo: color-mix(in srgb, var(--zj-xian) 55%, transparent);
  --zj-zhu: var(--qiangdiao-fen);
  --zj-zhu-wen: color-mix(in srgb, var(--zj-zhu) 78%, var(--wenben-zhuse));
  --zj-zhu-mian: color-mix(in srgb, var(--zj-zhu) 6%, var(--zj-mian));
  --zj-zhu-mian-er: color-mix(in srgb, var(--zj-zhu) 12%, var(--zj-mian));
  --zj-wen-san: color-mix(in srgb, var(--wenben-ciuse) 78%, var(--wenben-zhuse));
  --zj-zihao-tou: calc(var(--ziti-da) * 4 / 3);
  --zj-zihao-ming: var(--ziti-da);
  --zj-zihao-wen: var(--ziti-zhong);
  --zj-zihao-fu: var(--ziti-xiao);
  --zj-kuan: calc(var(--jiange-da) * 40);
  --zj-dian: var(--jiange-4);
  --zj-touxiang: calc(var(--jiange-da) * 2);
  --zj-tubiao-kuang: calc(var(--jiange-da) * 2);
  --zj-tubiao: var(--jiange-da);
  width: 100%;
  max-width: var(--zj-kuan);
  min-height: 100%;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(var(--jiange-da) + var(--jiange-xiao));
  padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-zhong) var(--jiange-da);
  color: var(--kapian-mian-biaoti);
}

.huanying-qu {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--jiange-6);
  min-width: 0;
}

.pinpai-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.pinpai-logo {
  width: var(--jiange-da);
  height: var(--jiange-da);
  flex: none;
  border-radius: var(--yuanjiao-xiao);
}

.pinpai-ming {
  font-size: var(--zj-zihao-wen);
  font-weight: 600;
  line-height: calc(var(--jiange-zhong) + var(--jiange-2));
  color: var(--kapian-mian-zhengwen);
  letter-spacing: 0.02em;
}

.huanying-biaoti {
  font-size: var(--zj-zihao-tou);
  font-weight: 600;
  line-height: calc(var(--jiange-da) + var(--jiange-xiao));
  letter-spacing: 0.02em;
  color: var(--kapian-mian-biaoti);
}

.huanying-fubiaoti {
  font-size: var(--zj-zihao-wen);
  font-weight: 400;
  line-height: calc(var(--jiange-da) - var(--jiange-2));
  color: var(--kapian-mian-zhengwen);
}

.wanjia-ka {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--jiange-12);
  padding: var(--jiange-zhong);
  border: 1px solid var(--zj-xian);
  border-radius: var(--yuanjiao-da);
  background: var(--zj-mian);
}

.wanjia-touxiang-wei {
  display: block;
  width: var(--zj-touxiang);
  height: var(--zj-touxiang);
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  background: var(--zj-mian-er);
  color: var(--zj-wen-san);
  font-size: var(--zj-zihao-ming);
  font-weight: 600;
  line-height: var(--jiange-da);
}

.wanjia-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  min-width: 0;
}

.wanjia-ming {
  font-size: var(--zj-zihao-ming);
  font-weight: 600;
  line-height: var(--jiange-da);
  color: var(--kapian-mian-biaoti);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wanjia-bianhao {
  font-size: var(--zj-zihao-fu);
  font-weight: 400;
  line-height: calc(var(--jiange-zhong) + var(--jiange-2));
  color: var(--zj-wen-san);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wanjia-zhuangtai {
  flex: none;
  padding: var(--jiange-4) var(--jiange-10);
  border-radius: var(--yuanjiao-xiao);
  background: var(--zj-mian-er);
  color: var(--kapian-mian-zhengwen);
  font-size: var(--zj-zihao-fu);
  font-weight: 600;
  line-height: calc(var(--jiange-zhong) + var(--jiange-2));
  white-space: nowrap;
}

.wanjia-zhuangtai-qiang {
  background: var(--zj-zhu-mian-er);
  color: var(--zj-zhu-wen);
}

.wanjia-qianming {
  grid-column: 1 / -1;
  padding-top: var(--jiange-12);
  border-top: 1px solid var(--zj-xian-ruo);
  font-size: var(--zj-zihao-wen);
  font-weight: 400;
  line-height: calc(var(--jiange-da) - var(--jiange-2));
  color: var(--kapian-mian-zhengwen);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rukou-qu {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jiange-zhong);
  min-width: 0;
}

.moshi-kapian {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 0;
  text-align: left;
  border: 1px solid var(--zj-xian);
  border-radius: var(--yuanjiao-da);
  background: var(--zj-mian);
  transition:
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    box-shadow var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    transform var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.moshi-kapian:hover:not(:disabled) {
  transform: translateY(calc(var(--jiange-2) * -1));
  box-shadow: var(--moshi-kapian-hover-yinying);
}

.moshi-kapian:active:not(:disabled) {
  transform: translateY(0);
}

.moshi-kapian:disabled {
  cursor: not-allowed;
}

.putong-moshi-kapian {
  border-color: var(--zj-zhu);
  background: var(--zj-zhu-mian);
}

.tiaozhan-moshi-kapian:hover:not(:disabled) {
  border-color: var(--zj-wen-san);
}

.ka-tou {
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-12);
  padding: var(--jiange-zhong);
  min-width: 0;
}

.ka-tubiao-wei {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--zj-tubiao-kuang);
  height: var(--zj-tubiao-kuang);
  border-radius: var(--yuanjiao-zhong);
  background: var(--zj-mian-er);
  color: var(--zj-wen-san);
}

.putong-moshi-kapian .ka-tubiao-wei {
  background: var(--zj-zhu-mian-er);
  color: var(--zj-zhu);
}

.ka-tubiao {
  width: var(--zj-tubiao);
  height: var(--zj-tubiao);
}

.ka-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  min-width: 0;
}

.ka-ming {
  font-size: var(--zj-zihao-ming);
  font-weight: 600;
  line-height: var(--jiange-da);
  color: var(--kapian-mian-biaoti);
}

.ka-fu {
  font-size: var(--zj-zihao-wen);
  font-weight: 400;
  line-height: calc(var(--jiange-da) - var(--jiange-2));
  color: var(--kapian-mian-zhengwen);
}

.ka-yao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  padding: 0 var(--jiange-zhong) var(--jiange-12);
  min-width: 0;
}

.yao-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  min-width: 0;
}

.yao-dian {
  flex: none;
  width: var(--zj-dian);
  height: var(--zj-dian);
  border-radius: 50%;
  background: var(--zj-wen-san);
}

.putong-moshi-kapian .yao-dian {
  background: var(--zj-zhu);
}

.yao-wen {
  font-size: var(--zj-zihao-wen);
  font-weight: 400;
  line-height: calc(var(--jiange-da) - var(--jiange-2));
  color: var(--zj-wen-san);
  min-width: 0;
}

.ka-di {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-xiao);
  margin-top: auto;
  padding: var(--jiange-12) var(--jiange-zhong);
  border-top: 1px solid var(--zj-xian-ruo);
}

.putong-moshi-kapian .ka-di {
  background: var(--zj-zhu-mian-er);
  border-top-color: transparent;
}

.ka-cta {
  font-size: var(--zj-zihao-wen);
  font-weight: 600;
  line-height: calc(var(--jiange-da) - var(--jiange-2));
  color: var(--kapian-mian-zhengwen);
}

.putong-moshi-kapian .ka-cta {
  color: var(--zj-zhu-wen);
}

.ka-jian {
  flex: none;
  width: var(--zj-zihao-ming);
  height: var(--zj-zihao-ming);
  color: var(--zj-wen-san);
  transition: transform var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu);
}

.putong-moshi-kapian .ka-jian {
  color: var(--zj-zhu-wen);
}

.moshi-kapian:hover:not(:disabled) .ka-jian {
  transform: translateX(var(--jiange-4));
}

.zhuangtai-tiao {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-12) var(--jiange-zhong);
  border: 1px solid var(--zj-xian);
  border-radius: var(--yuanjiao-zhong);
  background: var(--zj-mian);
  min-width: 0;
}

.zhuangtai-tubiao {
  flex: none;
  width: var(--jiange-zhong);
  height: var(--jiange-zhong);
  color: var(--zj-zhu);
}

.zhuangtai-wen {
  font-size: var(--zj-zihao-fu);
  font-weight: 400;
  line-height: calc(var(--jiange-zhong) + var(--jiange-2));
  color: var(--zj-wen-san);
  min-width: 0;
}

.huanying-qu:not(.ru-chang-ke-jian),
.wanjia-ka:not(.ru-chang-ke-jian),
.moshi-kapian:not(.ru-chang-ke-jian),
.zhuangtai-tiao:not(.ru-chang-ke-jian) {
  opacity: 0;
}

.moshi-kapian:not(.ru-chang-ke-jian) {
  pointer-events: none;
}

.huanying-qu.ru-chang-ke-jian,
.wanjia-ka.ru-chang-ke-jian,
.moshi-kapian.ru-chang-ke-jian,
.zhuangtai-tiao.ru-chang-ke-jian {
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

@media (max-width: 767px) {
  .zhuye-quyu {
    gap: var(--jiange-da);
    padding: var(--jiange-zhong) var(--jiange-zhong) var(--jiange-da);
  }

  .rukou-qu {
    grid-template-columns: minmax(0, 1fr);
  }

  .wanjia-ka {
    padding: var(--jiange-12);
    gap: var(--jiange-xiao);
  }

  .ka-tou {
    padding: var(--jiange-12) var(--jiange-12) var(--jiange-xiao);
  }

  .ka-yao {
    padding: 0 var(--jiange-12) var(--jiange-12);
  }

  .ka-di {
    padding: var(--jiange-12);
  }

  .zhuangtai-tiao {
    padding: var(--jiange-10) var(--jiange-12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .moshi-kapian,
  .ka-jian {
    transition: none;
  }

  .moshi-kapian:hover:not(:disabled) {
    transform: none;
  }

  .moshi-kapian:hover:not(:disabled) .ka-jian {
    transform: none;
  }

  .huanying-qu.ru-chang-ke-jian,
  .wanjia-ka.ru-chang-ke-jian,
  .moshi-kapian.ru-chang-ke-jian,
  .zhuangtai-tiao.ru-chang-ke-jian {
    animation: none;
  }
}
</style>
