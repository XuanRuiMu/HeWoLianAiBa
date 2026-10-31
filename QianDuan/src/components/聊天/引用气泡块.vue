<template>
  <button
    type="button"
    class="yinyong-kuai"
    :class="{ 'yinyong-kuai--benren': shiBenRen }"
    :aria-disabled="keDingWei ? undefined : 'true'"
    @click.stop="dingWei"
  >
    <span v-if="shiWuXiao" class="yinyong-kuai-chehui">{{ zhaiYao }}</span>
    <span v-else class="yinyong-kuai-zhaiyao">
      <template v-if="faSongZheXianShi">{{ faSongZheXianShi }}: </template>{{ zhaiYao }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import { YIN_YONG_DING_WEI_PEI_ZHI, huoQuMeiTiYinYongZhanWei } from '@/config/消息配置'
import { huoQuYinYongZhaiYao, type CaiDanXiaoXi } from '@/composables/use长按菜单'

const props = defineProps<{
  beiYongXiaoXiId: string | null
  lieBiao: CaiDanXiaoXi[]
  gunDongRongQi: () => HTMLElement | null
  faSongZheMing?: (muBiao: CaiDanXiaoXi) => string
}>()

const muBiao = computed<CaiDanXiaoXi | null>(
  () => props.lieBiao.find((xiang) => xiang && xiang.id === props.beiYongXiaoXiId) ?? null,
)
const shiCheHui = computed(() => muBiao.value?.yi_che_hui === true)
const shiWuXiao = computed(() => !muBiao.value || shiCheHui.value)
const zhaiYao = computed(() => {
  if (shiWuXiao.value) return huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  const muBiaoNei = muBiao.value as CaiDanXiaoXi
  return huoQuMeiTiYinYongZhanWei(muBiaoNei.lei_xing) ?? huoQuYinYongZhaiYao(muBiaoNei)
})
const faSongZheXianShi = computed(() => {
  if (shiWuXiao.value || !props.faSongZheMing) return ''
  return props.faSongZheMing(muBiao.value as CaiDanXiaoXi) || ''
})
const shiBenRen = computed(() => muBiao.value?.fa_song_zhe_lei_xing === 'yonghu')
const keDingWei = computed(() => !!props.beiYongXiaoXiId && !shiWuXiao.value)

let douDongJiShu = 0

function liangGuangDingWei(mubiaoYuanSu: HTMLElement): void {
  const yanSe = getComputedStyle(document.documentElement)
    .getPropertyValue(YIN_YONG_DING_WEI_PEI_ZHI.liangGuangLingPai)
    .trim()
  const 可动画 = mubiaoYuanSu as HTMLElement & {
    animate?: (
      keyframes: Record<string, unknown>[],
      options: Record<string, unknown>,
    ) => unknown
  }
  if (!yanSe || typeof 可动画.animate !== 'function') return
  const guangYun = `0 0 ${YIN_YONG_DING_WEI_PEI_ZHI.guangYunMoHu}px 0 ${yanSe}`
  可动画.animate(
    [{ offset: 0.5, boxShadow: guangYun }],
    {
      duration: YIN_YONG_DING_WEI_PEI_ZHI.liangGuangHaoMiao,
      iterations: YIN_YONG_DING_WEI_PEI_ZHI.liangGuangCiShu,
      easing: 'linear',
    },
  )
}

function dingWei(): void {
  if (!keDingWei.value || !props.beiYongXiaoXiId) return
  const rongQi = props.gunDongRongQi()
  const muBiaoYuanSu = document.getElementById(
    `${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}${props.beiYongXiaoXiId}`,
  )
  if (!rongQi || !muBiaoYuanSu) return
  const rongQiDing = rongQi.getBoundingClientRect().top
  const muBiaoDing = muBiaoYuanSu.getBoundingClientRect().top
  if (muBiaoDing < rongQiDing) {
    const douDong = (douDongJiShu % 2) * YIN_YONG_DING_WEI_PEI_ZHI.douDongXianShi
    douDongJiShu += 1
    rongQi.scrollTop = Math.max(0, muBiaoDing + rongQi.scrollTop - rongQiDing - douDong)
  }
  liangGuangDingWei(muBiaoYuanSu)
}
</script>

<style scoped>

.yinyong-kuai {
  position: relative;
  box-sizing: border-box;
  display: block;
  width: fit-content;
  max-width: var(--yinyong-kuai-zuida-kuan);
  margin-top: var(--yinyong-kuai-shang-jian-ju);
  padding: var(--yinyong-kuang-neidian);
  padding-left: var(--yinyong-kuai-zuo-neidian);
  border: none;
  border-radius: var(--yinyong-kuang-yuanjiao);
  background: var(--beijing-qianse);
  color: var(--wen-zi-ci-se);
  font-family: inherit;
  font-size: var(--yinyong-kuang-zihao);
  line-height: var(--yinyong-kuai-hangao);
  text-align: start;
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  word-break: break-all;
}


.yinyong-kuai::before {
  content: ' ';
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  height: 100%;
  width: var(--yinyong-se-tiao-kuan-du);
  background-color: var(--biankuang-yanse);
}


.yinyong-kuai--benren {
  margin-left: auto;
}

.yinyong-kuai--benren::before {
  background-color: var(--zhuse);
}

.yinyong-kuai-zhaiyao {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--yinyong-hang-shu);
  max-height: var(--yinyong-kuai-zuida-gao-du);
  overflow: hidden;
}


.yinyong-kuai-chehui {
  color: var(--wenben-ciuse);
}
</style>
