<template>
  <Teleport to="body">
    <Transition name="motaikuang">
      <div v-if="xianShi" class="xieyi-zhezhao" @click.self="guanBi">
        <section
          ref="tanChuangQu"
          class="xieyi-tanchuang"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="biaoTiId"
        >
          <header class="xieyi-toubu">
            <h2 :id="biaoTiId" class="xieyi-biaoti">
              {{ biaoTi }}
            </h2>
            <button
              ref="guanBiAnNiu"
              type="button"
              class="xieyi-guanbi"
              :aria-label="huoQuFanYi('caidan', 'guanBi')"
              @click="guanBi"
            >
              <svg class="xieyi-guanbi-tubiao" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div
            ref="neirongQu"
            class="xieyi-neirong"
            role="document"
            tabindex="0"
            :aria-label="biaoTi"
          >
            <article class="xieyi-zhengwen">
              <template v-for="(kuai, xuHao) in neiRongKuai" :key="xuHao">
                <p v-if="kuai.leiXing === 'gengxin'" class="xieyi-gengxin">
                  {{ kuai.wenBen }}
                </p>
                <h3 v-else-if="kuai.leiXing === 'zhang'" class="xieyi-zhang">
                  {{ kuai.wenBen }}
                </h3>
                <h4 v-else-if="kuai.leiXing === 'jie'" class="xieyi-jie">
                  {{ kuai.wenBen }}
                </h4>
                <p v-else class="xieyi-duan">
                  {{ kuai.wenBen }}
                </p>
              </template>
            </article>
          </div>
          <footer class="xieyi-dibu">
            <button type="button" class="xieyi-zhidao" @click="guanBi">
              {{ huoQuFanYi('caidan', 'yiYiZhiXiao') }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import yongHuXieYiText from '@/assets/yongHuXieYi.txt?raw'
import yinSiZhengCeText from '@/assets/yinSiZhengCe.txt?raw'
import { huoQuFanYi } from '@/config/翻译表'

type XieyiKuaiLeiXing = 'gengxin' | 'zhang' | 'jie' | 'duan'

type XieyiKuai = {
  leiXing: XieyiKuaiLeiXing
  wenBen: string
}

const props = defineProps<{
  xianShi: boolean
  leiXing: 'yongHuXieYi' | 'yinSiZhengCe'
}>()

const emit = defineEmits<{
  (e: 'guanBi'): void
}>()

const ZHANG_ZHENG_ZE = /^[一二三四五六七八九十百]+、\S/
const JIE_ZHENG_ZE = /^\d+(?:\.\d+)+\s*\S/
const JIAO_DIAN_XUAN_ZE_QI =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const biaoTiId = useId()
const tanChuangQu = ref<HTMLElement | null>(null)
const neirongQu = ref<HTMLElement | null>(null)
const guanBiAnNiu = ref<HTMLButtonElement | null>(null)
const zhiQianJiaoDian = ref<HTMLElement | null>(null)

const biaoTi = computed(() => {
  return props.leiXing === 'yongHuXieYi'
    ? huoQuFanYi('yeMianBiaoTi', 'yongHuXieYi')
    : huoQuFanYi('yeMianBiaoTi', 'yinSiZhengCe')
})

const yuanShiWenBen = computed(() => {
  return props.leiXing === 'yongHuXieYi' ? yongHuXieYiText : yinSiZhengCeText
})

function shiZhangBiaoTi(wenBen: string): boolean {
  return ZHANG_ZHENG_ZE.test(wenBen) && wenBen.length <= 30 && !/[。；：]$/.test(wenBen)
}

function shiJieBiaoTi(wenBen: string): boolean {
  return JIE_ZHENG_ZE.test(wenBen) && wenBen.length <= 40 && !/[。；：]$/.test(wenBen)
}

function fenXiXieyi(yuanWen: string): XieyiKuai[] {
  const kuai: XieyiKuai[] = []
  let duanHang: string[] = []
  let yiTiaoGuoBiaoTi = false

  function chongChuDuan(): void {
    if (duanHang.length === 0) return
    kuai.push({ leiXing: 'duan', wenBen: duanHang.join('\n') })
    duanHang = []
  }

  for (const yuanShiHang of yuanWen.replace(/\r\n/g, '\n').split('\n')) {
    const wenBen = yuanShiHang.trim()
    if (wenBen === '') {
      chongChuDuan()
      continue
    }
    if (!yiTiaoGuoBiaoTi) {
      yiTiaoGuoBiaoTi = true
      continue
    }
    if (wenBen.startsWith('最新更新日期')) {
      chongChuDuan()
      kuai.push({ leiXing: 'gengxin', wenBen })
      continue
    }
    if (shiZhangBiaoTi(wenBen)) {
      chongChuDuan()
      kuai.push({ leiXing: 'zhang', wenBen })
      continue
    }
    if (shiJieBiaoTi(wenBen)) {
      chongChuDuan()
      kuai.push({ leiXing: 'jie', wenBen })
      continue
    }
    duanHang.push(wenBen)
  }
  chongChuDuan()
  return kuai
}

const neiRongKuai = computed(() => fenXiXieyi(yuanShiWenBen.value))

function guanBi(): void {
  emit('guanBi')
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
  if (shiJian.isComposing) return
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    guanBi()
    return
  }
  if (shiJian.key !== 'Tab') return
  const rongQi = tanChuangQu.value
  if (!rongQi) return
  const keJiaoDian = Array.from(rongQi.querySelectorAll<HTMLElement>(JIAO_DIAN_XUAN_ZE_QI)).filter(
    (yuanSu) => !yuanSu.hasAttribute('disabled') && yuanSu.getAttribute('aria-hidden') !== 'true',
  )
  if (keJiaoDian.length === 0) return
  const diYi = keJiaoDian[0]
  const zuiHou = keJiaoDian[keJiaoDian.length - 1]
  const dangQian = document.activeElement
  if (shiJian.shiftKey) {
    if (dangQian === diYi || !rongQi.contains(dangQian)) {
      shiJian.preventDefault()
      zuiHou.focus()
    }
    return
  }
  if (dangQian === zuiHou || !rongQi.contains(dangQian)) {
    shiJian.preventDefault()
    diYi.focus()
  }
}

watch(
  () => props.xianShi,
  (xinZhi) => {
    if (xinZhi) {
      zhiQianJiaoDian.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.addEventListener('keydown', chuLiJianPan)
      void nextTick(() => {
        if (neirongQu.value) neirongQu.value.scrollTop = 0
        guanBiAnNiu.value?.focus()
      })
      return
    }
    document.removeEventListener('keydown', chuLiJianPan)
    const qian = zhiQianJiaoDian.value
    zhiQianJiaoDian.value = null
    if (qian && document.contains(qian)) qian.focus()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', chuLiJianPan)
})
</script>

<style scoped>
.xieyi-zhezhao {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--ceng-xieyi);
  padding: var(--jiange-da);
  background: var(--zhezhao-beijing);
  backdrop-filter: var(--boli-mohu);
  -webkit-backdrop-filter: var(--boli-mohu);
}

.xieyi-tanchuang {
  width: 100%;
  max-width: 600px;
  max-height: calc(100dvh - var(--jiange-da) * 4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--tanchuang-beijing);
  border: 1px solid var(--tanchuang-biankuang);
  border-radius: var(--yuanjiao-da);
  box-shadow: var(--tanchuang-yinying);
  backdrop-filter: var(--boli-mohu);
  -webkit-backdrop-filter: var(--boli-mohu);
  color: var(--wenben-zhuse);
}

.xieyi-toubu {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-zhong);
  padding: var(--jiange-da);
  border-bottom: 1px solid var(--tanchuang-biankuang);
  flex-shrink: 0;
}

.xieyi-biaoti {
  margin: 0;
  font-size: var(--ziti-da);
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: var(--tanchuang-biaoti);
}

.xieyi-guanbi {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: calc(var(--jiange-da) + var(--jiange-xiao));
  height: calc(var(--jiange-da) + var(--jiange-xiao));
  background: var(--tanchuang-fanhui-beijing);
  border: 1px solid var(--tanchuang-biankuang);
  border-radius: var(--yuanjiao-xiao);
  color: var(--wen-zi-ci-se);
  transition:
    background-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.xieyi-guanbi::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.xieyi-guanbi:hover {
  background: var(--caidan-hover);
  color: var(--tanchuang-biaoti);
}

.xieyi-guanbi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.xieyi-guanbi-tubiao {
  width: var(--ziti-da);
  height: var(--ziti-da);
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.xieyi-neirong {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--jiange-da);
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.xieyi-neirong:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: calc(var(--jujiao-huan-pian-yi) * -1);
}

.xieyi-zhengwen {
  width: 100%;
  max-width: 72ch;
  margin-inline: auto;
}

.xieyi-gengxin {
  margin: 0 0 var(--jiange-zhong);
  padding-bottom: var(--jiange-12);
  border-bottom: 1px solid var(--tanchuang-biankuang);
  font-size: var(--ziti-xiao);
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.02em;
  color: var(--wen-zi-ci-se);
}

.xieyi-zhang {
  margin: var(--jiange-da) 0 var(--jiange-xiao);
  font-size: var(--ziti-da);
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: var(--tanchuang-biaoti);
}

.xieyi-jie {
  margin: var(--jiange-zhong) 0 var(--jiange-6);
  font-size: var(--ziti-zhong);
  font-weight: 700;
  line-height: 1.5;
  color: var(--wenben-zhuse);
}

.xieyi-duan {
  margin: 0;
  font-size: var(--ziti-zhong);
  font-weight: 400;
  line-height: 1.8;
  color: var(--wenben-zhuse);
  white-space: pre-line;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.xieyi-duan + .xieyi-duan {
  margin-top: var(--jiange-12);
}

.xieyi-dibu {
  padding: var(--jiange-zhong) var(--jiange-da) var(--jiange-da);
  border-top: 1px solid var(--tanchuang-biankuang);
  flex-shrink: 0;
}

.xieyi-zhidao {
  width: 100%;
  min-height: var(--shuru-anniu-re-ku);
  padding: var(--jiange-12) var(--jiange-da);
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  border-radius: var(--yuanjiao-zhong);
  color: var(--fasong-anniu-wenben);
  font-size: var(--ziti-zhong);
  font-weight: 700;
  letter-spacing: 0.08em;
  transition: filter var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.xieyi-zhidao:hover {
  filter: brightness(1.06);
}

.xieyi-zhidao:active {
  filter: brightness(0.96);
}

.xieyi-zhidao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.motaikuang-enter-active {
  transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.motaikuang-enter-active .xieyi-tanchuang {
  transition:
    transform var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu),
    opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.motaikuang-leave-active {
  transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.motaikuang-leave-active .xieyi-tanchuang {
  transition:
    transform var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.motaikuang-enter-from {
  opacity: 0;
}

.motaikuang-enter-from .xieyi-tanchuang {
  transform: scale(0.96) translateY(var(--jiange-zhong));
  opacity: 0;
}

.motaikuang-leave-to {
  opacity: 0;
}

.motaikuang-leave-to .xieyi-tanchuang {
  transform: scale(0.96);
  opacity: 0;
}

@media (max-width: 767px) {
  .xieyi-zhezhao {
    padding: var(--jiange-zhong);
  }

  .xieyi-tanchuang {
    max-height: calc(100dvh - var(--jiange-zhong) * 4);
  }

  .xieyi-toubu {
    padding: var(--jiange-zhong);
  }

  .xieyi-neirong {
    padding: var(--jiange-zhong);
  }

  .xieyi-dibu {
    padding: var(--jiange-12) var(--jiange-zhong) var(--jiange-zhong);
  }
}

@media (prefers-reduced-motion: reduce) {
  .motaikuang-enter-active,
  .motaikuang-leave-active,
  .motaikuang-enter-active .xieyi-tanchuang,
  .motaikuang-leave-active .xieyi-tanchuang,
  .xieyi-guanbi,
  .xieyi-zhidao {
    transition: none;
  }
}
</style>
