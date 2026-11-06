<template>
  <Teleport to="body">
    <Transition name="xiaoxi-caidan-guodu">
      <div
        v-if="kaiQi && jiDian"
        class="xiaoxi-caidan-zhezhao"
        @click="emit('guan-bi')"
        @keydown="chuLiAnJian"
      >
        <span
          ref="dingDianYuanSu"
          class="xiaoxi-caidan-dingdian"
          :style="{ top: `${jiDian.y}px`, left: `${jiDian.x}px` }"
          aria-hidden="true"
        />
        <div
          ref="fuCengYuanSu"
          class="xiaoxi-caidan"
          :data-ding-gao="dingGao ? '1' : '0'"
          :data-fang-xiang="weiZhi.fangXiang"
          :style="fuCengYangShi"
          @click.stop
        >
          <div
            ref="lieBiaoYuanSu"
            class="xiaoxi-caidan-lie"
            role="menu"
            tabindex="-1"
            :aria-label="huoQuFanYi('tongYong', 'xuanXiangLieBiao')"
          >
            <button
              v-for="(xiang, suoYin) in caiDanXiangQing"
              :key="xiang.jian"
              type="button"
              role="menuitem"
              class="xiaoxi-caidan-xiangmu"
              :class="{ 'xiaoxi-caidan-xiangmu--weixian': xiang.weiXian }"
              :tabindex="suoYin === huoDongSuoYin ? 0 : -1"
              @click="dianJi(xiang.jian)"
              @focus="huoDongSuoYin = suoYin"
            >
              <span class="xiaoxi-caidan-ming">{{ xiang.wenZi }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { 使用浮层定位 } from '@/components/通用菜单.vue'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI, shiWeiXianCaiDanXiang } from '@/config/消息配置'
import type { XiaoXiCaiDanXiang } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/翻译表'
import type { CaiDanJiDian } from '@/composables/use长按菜单'
import '@/styles/消息操作菜单.css'

const props = withDefaults(
  defineProps<{
    kaiQi: boolean
    jiDian?: CaiDanJiDian | null
    caiDanXiang?: readonly XiaoXiCaiDanXiang[]
  }>(),
  { jiDian: null, caiDanXiang: () => [] },
)

const emit = defineEmits<{
  (e: 'guan-bi'): void
  (e: 'xuan-zhong', xiang: XiaoXiCaiDanXiang): void
}>()

const dingDianYuanSu = ref<HTMLElement | null>(null)
const fuCengYuanSu = ref<HTMLElement | null>(null)
const lieBiaoYuanSu = ref<HTMLElement | null>(null)
const dingGao = ref(false)
const huoDongSuoYin = ref(0)

const {
  位置: weiZhi,
  计算: 计算WeiZhi,
  开始跟踪: kaiShiGenZong,
  结束跟踪: jieShuGenZong,
} = 使用浮层定位(dingDianYuanSu, fuCengYuanSu, {
  duiQi: 'zuo',
  jianGe: LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanJianGe,
  bianJu: LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu,
  zuiDaGaoDu: LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanZuiDaGaoDu,
  zuiXiaoKuanDu: LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanZuiXiaoKuanDu,
  zuiDaKuanDu: LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanZuiDaKuanDu,
})

const caiDanXiangQing = computed(() =>
  props.caiDanXiang.map((jian) => ({
    jian,
    wenZi: huoQuFanYi('liaoTian', jian),
    weiXian: shiWeiXianCaiDanXiang(jian),
  })),
)

const fuCengYangShi = computed(() => ({
  top: `${weiZhi.value.top}px`,
  left: `${weiZhi.value.left}px`,
  width: `${weiZhi.value.kuanDu}px`,
  maxHeight: `${weiZhi.value.zuiDaGaoDu}px`,
}))

let huiFuYuanSu: HTMLElement | null = null
let dingWeiCiShu = 0
let caiDanZaiZhanKai = false

function xiangMuYuanSu(suoYin: number): HTMLElement | null {
  return fuCengYuanSu.value?.querySelectorAll<HTMLElement>('.xiaoxi-caidan-xiangmu')[suoYin] ?? null
}

function juJiaoZaiRongQi(): boolean {
  const huoYue = document.activeElement as HTMLElement | null
  if (!huoYue || !lieBiaoYuanSu.value) return false
  return lieBiaoYuanSu.value.contains(huoYue) && !huoYue.classList.contains('xiaoxi-caidan-xiangmu')
}

function juJiaoDao(suoYin: number): void {
  const zong = caiDanXiangQing.value.length
  if (!zong) return
  const muBiao = ((suoYin % zong) + zong) % zong
  huoDongSuoYin.value = muBiao
  const yuan = xiangMuYuanSu(muBiao)
  if (!yuan) return
  yuan.focus({ preventScroll: true })
  yuan.scrollIntoView?.({ block: 'nearest' })
}

function yiDongJuJiao(bu: number): void {
  const zong = caiDanXiangQing.value.length
  if (!zong) return
  if (juJiaoZaiRongQi()) {
    juJiaoDao(bu > 0 ? 0 : zong - 1)
    return
  }
  juJiaoDao(huoDongSuoYin.value + bu)
}

function chuLiAnJian(shiJian: KeyboardEvent): void {
  switch (shiJian.key) {
    case 'Escape':
      shiJian.preventDefault()
      shiJian.stopPropagation()
      emit('guan-bi')
      break
    case 'Tab':
      emit('guan-bi')
      break
    case 'ArrowDown':
      shiJian.preventDefault()
      yiDongJuJiao(1)
      break
    case 'ArrowUp':
      shiJian.preventDefault()
      yiDongJuJiao(-1)
      break
    case 'Home':
      shiJian.preventDefault()
      juJiaoDao(0)
      break
    case 'End':
      shiJian.preventDefault()
      juJiaoDao(caiDanXiangQing.value.length - 1)
      break
    default:
      break
  }
}

function dianJi(jian: XiaoXiCaiDanXiang): void {
  emit('xuan-zhong', jian)
}

function dingWei(): void {
  const ciShu = ++dingWeiCiShu
  dingGao.value = false
  void nextTick(() => {
    if (ciShu !== dingWeiCiShu || !props.kaiQi || !props.jiDian) return
    计算WeiZhi()
    kaiShiGenZong()
    dingGao.value = true
    void nextTick(() => {
      if (ciShu !== dingWeiCiShu || !props.kaiQi || !props.jiDian) return
      lieBiaoYuanSu.value?.focus({ preventScroll: true })
    })
  })
}

function zhanKaiCaiDan(): void {
  if (!caiDanZaiZhanKai) {
    caiDanZaiZhanKai = true
    huiFuYuanSu = (document.activeElement as HTMLElement | null) ?? null
  }
  dingWei()
}

function shouQiCaiDan(): void {
  if (!caiDanZaiZhanKai) return
  caiDanZaiZhanKai = false
  dingWeiCiShu += 1
  jieShuGenZong()
  if (huiFuYuanSu?.isConnected) huiFuYuanSu.focus({ preventScroll: true })
  huiFuYuanSu = null
}

function tongBuZhuangTai(): void {
  if (props.kaiQi && props.jiDian) zhanKaiCaiDan()
  else shouQiCaiDan()
}

watch(
  () => [props.kaiQi, props.jiDian?.x, props.jiDian?.y, caiDanXiangQing.value.length] as const,
  tongBuZhuangTai,
)

onMounted(() => {
  tongBuZhuangTai()
})

onBeforeUnmount(() => {
  shouQiCaiDan()
})
</script>
