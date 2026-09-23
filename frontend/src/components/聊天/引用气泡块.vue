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
import { huoQuFanYi } from '@/config/translations'
import { YIN_YONG_DING_WEI_PEI_ZHI, huoQuMeiTiYinYongZhanWei } from '@/config/消息配置'
import { huoQuYinYongZhaiYao, type CaiDanXiaoXi } from '@/composables/use长按菜单'

const props = defineProps<{
  beiYongXiaoXiId: string | null
  lieBiao: CaiDanXiaoXi[]
  gunDongRongQi: () => HTMLElement | null
  faSongZheMing?: (muBiao: CaiDanXiaoXi) => string
}>()

/**
 * 摘要按 ID 在会话列表内现取（FP-08a：摘要不落库），取不到与已撤回一律走既有撤回占位文案，
 * 既不空白也不抛错；语音目标的占位由唯一出口 huoQuYinYongZhaiYao 承担。
 */
const muBiao = computed<CaiDanXiaoXi | null>(
  () => props.lieBiao.find((xiang) => xiang && xiang.id === props.beiYongXiaoXiId) ?? null,
)
const shiCheHui = computed(() => muBiao.value?.yi_che_hui === true)
const shiWuXiao = computed(() => !muBiao.value || shiCheHui.value)
const zhaiYao = computed(() => {
  if (shiWuXiao.value) return huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  const muBiaoNei = muBiao.value as CaiDanXiaoXi
  // FP-08d（需求 #5）：媒体目标（图/文件/贴纸）没有可截断的正文，一律取 `config/消息配置.ts`
  // 的单源占位；文字与语音仍归截断唯一出口。与 聊天页面.vue 的引用条同一行组合式，
  // 两处解析值相同由 __tests__/FP08d媒体引用与直发.test.ts 断言把守。
  return huoQuMeiTiYinYongZhanWei(muBiaoNei.lei_xing) ?? huoQuYinYongZhaiYao(muBiaoNei)
})
const faSongZheXianShi = computed(() => {
  if (shiWuXiao.value || !props.faSongZheMing) return ''
  return props.faSongZheMing(muBiao.value as CaiDanXiaoXi) || ''
})
const shiBenRen = computed(() => muBiao.value?.fa_song_zhe_lei_xing === 'yonghu')
const keDingWei = computed(() => !!props.beiYongXiaoXiId && !shiWuXiao.value)

/** ±1px 交替抖动的奇偶台账（取证 §1.3 第4步：目标位置相同时浏览器不派发 scroll，靠抖动强制生效） */
let douDongJiShu = 0

/** 高亮吃令牌、不粘字面量：色取自 YIN_YONG_DING_WEI_PEI_ZHI.liangGuangLingPai 指名的那枚令牌 */
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
  // 只给 50% 一帧 ⇒ 0%/100% 由元素自身值合成，与取证的 @keyframes{50%{...}} 同语义
  可动画.animate(
    [{ offset: 0.5, boxShadow: guangYun }],
    {
      duration: YIN_YONG_DING_WEI_PEI_ZHI.liangGuangHaoMiao,
      iterations: YIN_YONG_DING_WEI_PEI_ZHI.liangGuangCiShu,
      easing: 'linear',
    },
  )
}

/**
 * 点击定位原文（取证 §1.3 的 TUIKit 算法，逐步对应）：
 * ①撤回/取不到不可定位 → ②按 ID 找原消息 DOM → ③量测滚动容器与目标盒 →
 * ④finalScrollTop = 目标 top + scrollTop − 容器 top − 奇偶抖动 → ⑤仅当目标在视口上方才写 scrollTop → ⑥高亮若干轮
 */
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
    // 取证 §1.3 第4步：selfAddValue++ % 2 ⇒ 同一目标第二次点击落到差 1px 的位置，否则浏览器不派发 scroll
    const douDong = (douDongJiShu % 2) * YIN_YONG_DING_WEI_PEI_ZHI.douDongXianShi
    douDongJiShu += 1
    rongQi.scrollTop = Math.max(0, muBiaoDing + rongQi.scrollTop - rongQiDing - douDong)
  }
  liangGuangDingWei(muBiaoYuanSu)
}
</script>

<style scoped>
/* FP-09（需求 #5 表现层）气泡内引用块。数值真源 = .agents/evidence/references/FP-13-引用条-20260921.md
   §1.2（块几何 padding/border-radius/font-size/line-height/max-width/margin-top、两行截断、撤回占位分支）
   + §3（左侧色条 3px 与 9px 间距，作者色与正文色分离）+ §2（色条由 ::before 承担、自己那条换主色）。
   未采 §1.2 的 margin-left/right:44px —— 那是 TUIKit 头像列宽，本块按用户裁定的"气泡内"落位，
   头像列偏移已由 .xiaoxi-wei 承担，抄过来会变成第二份无源缩进。 */
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

/* 左侧色条（取证 §2 的 ::before 形态，宽度与色按 §3 与既有令牌） */
.yinyong-kuai::before {
  content: ' ';
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  height: 100%;
  width: var(--yinyong-se-tiao-kuan-du);
  background-color: var(--biankuang-yanse);
}

/* 自己发的被引用 ⇒ 色条换主色（取证 §2 quote--own-message 规则） */
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

/* 撤回/已不在列表的占位：比正文再淡一档，且仍是一行可读文案（取证 §1.2 .revoked-text 分支） */
.yinyong-kuai-chehui {
  color: var(--wenben-ciuse);
}
</style>
