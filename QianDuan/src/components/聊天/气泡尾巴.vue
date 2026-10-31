<template>
  <span
    ref="gen"
    class="qipao-weiba"
    :class="['qipao-weiba--' + ce, { 'qipao-weiba--tupian': Boolean(tianChong) }]"
    :style="tianChong ? { '--qipao-weiba-tian-chong': tianChong } : undefined"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { caiJiQiPaoBianYuanTianChong, qiuBianYuanZhongXinY } from '@/utils/气泡尾巴填充色'

const props = withDefaults(
  defineProps<{
    ce?: 'zuo' | 'you'
  }>(),
  {
    ce: 'you',
  },
)

const gen = ref<HTMLSpanElement | null>(null)
const tianChong = ref('')
let ciXu = 0
let tingZhi = false
let chiCunGuanCha: ResizeObserver | null = null
let yangShiGuanCha: MutationObserver | null = null
let beiGuanCha: Element | null = null
let anPai = 0

function zhaoYangShiZuXian(el: Element | null): Element | null {
  let dangQian = el
  while (dangQian && dangQian !== document.documentElement) {
    if (dangQian.hasAttribute('style')) return dangQian
    dangQian = dangQian.parentElement
  }
  return null
}

async function gengXin(): Promise<void> {
  const el = gen.value
  const fu = el?.parentElement
  if (!el || !fu) {
    tianChong.value = ''
    return
  }
  const weiBaYangShi = getComputedStyle(el)
  if (weiBaYangShi.display === 'none') {
    tianChong.value = ''
    return
  }
  const fuYangShi = getComputedStyle(fu)
  if (!fuYangShi.backgroundImage.includes('url(')) {
    tianChong.value = ''
    return
  }
  const juXing = fu.getBoundingClientRect()
  const kuangKuan = juXing.width - (parseFloat(fuYangShi.borderLeftWidth) || 0) - (parseFloat(fuYangShi.borderRightWidth) || 0)
  const kuangGao = juXing.height - (parseFloat(fuYangShi.borderTopWidth) || 0) - (parseFloat(fuYangShi.borderBottomWidth) || 0)
  if (!(kuangKuan > 4 && kuangGao > 4)) {
    tianChong.value = ''
    return
  }
  const zhongXinY = qiuBianYuanZhongXinY(weiBaYangShi.clipPath, kuangGao)
  const bianYuanX = props.ce === 'you' ? kuangKuan - 1.5 : 1.5
  const weiBaKuan = parseFloat(weiBaYangShi.getPropertyValue('--qipao-weiba-kuan')) || 0
  const dangQianCi = ++ciXu
  const tianChongZhi = await caiJiQiPaoBianYuanTianChong({
    beiJingTu: fuYangShi.backgroundImage,
    beiJingDaXiao: fuYangShi.backgroundSize,
    kuangKuan,
    kuangGao,
    bianYuanX,
    zhongXinY,
    shuiPingPianYi: props.ce === 'zuo' ? weiBaKuan : 0,
    weiBaKuan,
  })
  if (tingZhi || dangQianCi !== ciXu || !gen.value) return
  if (tianChongZhi) {
    if (tianChong.value !== tianChongZhi) tianChong.value = tianChongZhi
  } else if (tianChong.value) {
    tianChong.value = ''
  }
}

function anPaiGengXin(): void {
  if (tingZhi) return
  if (anPai) cancelAnimationFrame(anPai)
  anPai = requestAnimationFrame(() => {
    anPai = 0
    void gengXin()
  })
}

function lianJieGuanCha(): void {
  const fu = gen.value?.parentElement
  if (!fu || typeof window === 'undefined') return
  if (typeof ResizeObserver === 'function') {
    chiCunGuanCha = new ResizeObserver(anPaiGengXin)
    chiCunGuanCha.observe(fu)
  }
  if (typeof MutationObserver === 'function') {
    beiGuanCha = zhaoYangShiZuXian(fu)
    if (beiGuanCha) {
      yangShiGuanCha = new MutationObserver(anPaiGengXin)
      yangShiGuanCha.observe(beiGuanCha, { attributes: true, attributeFilter: ['style', 'class'] })
    }
  }
}

onMounted(() => {
  lianJieGuanCha()
  anPaiGengXin()
})

onBeforeUnmount(() => {
  tingZhi = true
  if (anPai) cancelAnimationFrame(anPai)
  chiCunGuanCha?.disconnect()
  yangShiGuanCha?.disconnect()
  chiCunGuanCha = null
  yangShiGuanCha = null
  beiGuanCha = null
})

watch(
  () => props.ce,
  () => anPaiGengXin(),
)
</script>

<style scoped>
.qipao-weiba {
  --qipao-weiba-bian: var(--qipao-weiba-miao-bian-kuan);
  --qipao-weiba-jie-feng: var(--qipao-weiba-bian);

  position: absolute;
  top: 0;
  bottom: 0;
  display: var(--qipao-weiba-xian-shi, block);
  pointer-events: none;
  z-index: 0;
}

.qipao-weiba::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qipao-weiba-miao-bian, transparent);
}

.qipao-weiba::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--qipao-weiba-tian-chong, transparent);
}

.qipao-weiba--tupian::after {
  filter: opacity(1);
}

.qipao-weiba--you {
  right: calc((var(--qipao-weiba-kuan) + var(--qipao-weiba-bian)) * -1);
  left: 0;
}

.qipao-weiba--you::before {
  clip-path: polygon(
    calc(100% - var(--qipao-weiba-kuan) - var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) - var(--qipao-weiba-bian)),
    100% calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban)),
    calc(100% - var(--qipao-weiba-kuan) - var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2 + var(--qipao-weiba-bian))
  );
}

.qipao-weiba--you::after {
  left: 0;
  width: calc(100% - var(--qipao-weiba-bian));
  clip-path: polygon(
    calc(100% - var(--qipao-weiba-kuan)) var(--qipao-weiba-shang),
    calc(100% - var(--qipao-weiba-kuan) - var(--qipao-weiba-jie-feng)) var(--qipao-weiba-shang),
    calc(100% - var(--qipao-weiba-kuan) - var(--qipao-weiba-jie-feng))
      calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2),
    calc(100% - var(--qipao-weiba-kuan)) calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2),
    100% calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban))
  );
}

.qipao-weiba--zuo {
  right: 0;
  left: calc((var(--qipao-weiba-kuan) + var(--qipao-weiba-bian)) * -1);
}

.qipao-weiba--zuo::before {
  clip-path: polygon(
    calc(var(--qipao-weiba-kuan) + var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) - var(--qipao-weiba-bian)),
    0 calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban)),
    calc(var(--qipao-weiba-kuan) + var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2 + var(--qipao-weiba-bian))
  );
}

.qipao-weiba--zuo::after {
  left: var(--qipao-weiba-bian);
  width: calc(100% - var(--qipao-weiba-bian));
  clip-path: polygon(
    var(--qipao-weiba-kuan) var(--qipao-weiba-shang),
    calc(var(--qipao-weiba-kuan) + var(--qipao-weiba-jie-feng)) var(--qipao-weiba-shang),
    calc(var(--qipao-weiba-kuan) + var(--qipao-weiba-jie-feng))
      calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2),
    var(--qipao-weiba-kuan) calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2),
    0 calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban))
  );
}
</style>

