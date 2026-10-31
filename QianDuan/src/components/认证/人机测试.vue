<template>
  <Teleport to="body">
    <Transition name="renji-motaikuang">
      <div
        v-if="xianShi"
        class="renji-zhezhao"
        @click.self="qingQiuGuanBi"
        @keydown="anJianPan"
      >
        <section
          ref="tanChuang"
          class="renji-tanchuang"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="biaoTiId"
          :aria-describedby="miaoShuId"
          :aria-busy="jiaZaiZhong || dengDaiZhong"
        >
          <header class="renji-toubu">
            <h2 :id="biaoTiId" class="renji-biaoti">
              {{ huoQuFanYi('renZheng', 'renJiYanZheng') }}
            </h2>
            <button
              type="button"
              class="renji-guanbi"
              :aria-label="huoQuFanYi('renZheng', 'quXiao')"
              :disabled="dengDaiZhong"
              @click="qingQiuGuanBi"
            >
              <svg class="renji-guanbi-tubiao" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <form class="renji-biaodan" @submit.prevent="queRen">
            <div class="renji-neirong">
              <p :id="miaoShuId" class="renji-miaoshu">
                {{ huoQuFanYi('renZheng', 'renJiYanZhengMiaoShu') }}
              </p>

              <div class="renji-tuxiang-qu" :class="{ 'renji-tuxiang-jiazai': jiaZaiZhong }">
                <img
                  v-if="tiaoZhan"
                  class="renji-tuxiang"
                  :src="tuPianDiZhi"
                  :alt="huoQuFanYi('renZheng', 'renJiYanZheng')"
                  draggable="false"
                />
                <p v-else class="renji-zhanwei" role="status">
                  {{
                    jiaZaiZhong
                      ? huoQuFanYi('renZheng', 'renJiYanZhengJiaZaiZhong')
                      : huoQuFanYi('renZheng', 'renJiYanZhengShiBai')
                  }}
                </p>
                <span v-if="jiaZaiZhong && tiaoZhan" class="renji-shuaxin-zhuang" role="status">
                  {{ huoQuFanYi('renZheng', 'renJiYanZhengJiaZaiZhong') }}
                </span>
              </div>

              <label for="renji-daan" class="renji-shuru-biaoqian">
                {{ huoQuFanYi('renZheng', 'renJiYanZhengShuRu') }}
              </label>
              <ChangFangShuRuKuang
                ref="shuRuKuang"
                标识="renji-daan"
                :模型值="daAn"
                类型="text"
                :最大长度="REN_JI_DA_AN_CHANG_DU"
                自动完成="off"
                :占位文字="huoQuFanYi('renZheng', 'renJiYanZhengShuRu')"
                :标签="huoQuFanYi('renZheng', 'renJiYanZhengShuRu')"
                inputmode="text"
                @geng-xin="gengXinDaAn"
              />
              <p v-if="cuoWu !== ''" class="renji-cuowu" role="alert">
                {{ cuoWu }}
              </p>
            </div>
            <div class="renji-anniu-hang">
              <button
                type="button"
                class="renji-geng-huan"
                :disabled="jiaZaiZhong || dengDaiZhong"
                @click="gengHuan"
              >
                {{ huoQuFanYi('renZheng', 'renJiYanZhengGengHuan') }}
              </button>
              <button
                ref="queRenAnNiu"
                type="submit"
                class="renji-que-ren"
                :disabled="jiaZaiZhong || dengDaiZhong || guoQi || !tiaoZhan"
              >
                {{
                  dengDaiZhong
                    ? huoQuFanYi('renZheng', 'faSongZhong')
                    : huoQuFanYi('renZheng', 'renJiYanZhengQueRen')
                }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { huoQuRenJiTiaoZhan, type YanZhengMaYongTu, type 人机验证答案 } from '@/api/认证'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import { REN_JI_DA_AN_CHANG_DU, REN_JI_DA_AN_ZHENG_ZE } from '@/config/人机验证'
import { huoQuFanYi } from '@/config/翻译表'

const 属性 = withDefaults(
  defineProps<{
    xianShi: boolean
    yongTu: YanZhengMaYongTu
    dengDaiZhong?: boolean
  }>(),
  {
    dengDaiZhong: false,
  },
)

const 发出 = defineEmits<{
  (e: 'guan-bi'): void
  (e: 'ti-jiao', zhi: 人机验证答案): void
}>()

const biaoTiId = useId()
const miaoShuId = useId()
const tanChuang = ref<HTMLElement | null>(null)
const shuRuKuang = ref<{ 聚焦: () => void } | null>(null)
const queRenAnNiu = ref<HTMLButtonElement | null>(null)
const zhiQianJiaoDian = ref<HTMLElement | null>(null)
const tiaoZhan = ref<{ id: string; svg: string; guoQiMiao: number } | null>(null)
const daAn = ref('')
const cuoWu = ref('')
const jiaZaiZhong = ref(false)
const guoQi = ref(false)
let qingQiuDai = 0
let daoJiShiQi: ReturnType<typeof setInterval> | null = null

const tuPianDiZhi = computed(() => {
  if (!tiaoZhan.value) return ''
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tiaoZhan.value.svg)}`
})

function tingZhiDaoJiShi(): void {
  if (daoJiShiQi !== null) {
    clearInterval(daoJiShiQi)
    daoJiShiQi = null
  }
}

function biaoJiGuoQi(): void {
  tingZhiDaoJiShi()
  guoQi.value = true
  cuoWu.value = huoQuFanYi('renZheng', 'renJiYanZhengGuoQi')
}

function kaiShiDaoJiShi(miao: number): void {
  tingZhiDaoJiShi()
  guoQi.value = false
  const zongMiao = Number.isFinite(miao) && miao > 0 ? Math.floor(miao) : 120
  let shengYu = zongMiao
  daoJiShiQi = setInterval(() => {
    shengYu -= 1
    if (shengYu <= 0) biaoJiGuoQi()
  }, 1000)
}

function qingLiZhuangTai(): void {
  qingQiuDai += 1
  tingZhiDaoJiShi()
  tiaoZhan.value = null
  daAn.value = ''
  cuoWu.value = ''
  jiaZaiZhong.value = false
  guoQi.value = false
}

async function jiaZaiTiaoZhan(baoLiuCuoWu = false): Promise<void> {
  const dai = ++qingQiuDai
  jiaZaiZhong.value = true
  guoQi.value = false
  if (!baoLiuCuoWu) cuoWu.value = ''
  daAn.value = ''
  tingZhiDaoJiShi()
  try {
    const jieGuo = await huoQuRenJiTiaoZhan(属性.yongTu)
    if (dai !== qingQiuDai) return
    if (
      !jieGuo ||
      typeof jieGuo.id !== 'string' ||
      typeof jieGuo.svg !== 'string' ||
      !jieGuo.svg.startsWith('<svg') ||
      !Number.isFinite(jieGuo.guoQiMiao) ||
      jieGuo.guoQiMiao <= 0
    ) {
      throw new Error('人机挑战格式异常')
    }
    tiaoZhan.value = jieGuo
    kaiShiDaoJiShi(jieGuo.guoQiMiao)
    await nextTick()
    shuRuKuang.value?.聚焦()
  } catch {
    if (dai !== qingQiuDai) return
    tiaoZhan.value = null
    cuoWu.value = huoQuFanYi('renZheng', 'renJiYanZhengShiBai')
  } finally {
    if (dai === qingQiuDai) jiaZaiZhong.value = false
  }
}

function gengXinDaAn(zhi: string): void {
  daAn.value = zhi.replace(/\s+/g, '').toUpperCase().slice(0, 4)
  if (cuoWu.value !== '' && !guoQi.value) cuoWu.value = ''
}

function queRen(): void {
  if (属性.dengDaiZhong || jiaZaiZhong.value || guoQi.value || !tiaoZhan.value) return
  const guiYi = daAn.value.trim().toUpperCase()
  if (!REN_JI_DA_AN_ZHENG_ZE.test(guiYi)) {
    cuoWu.value = huoQuFanYi('renZheng', 'renJiYanZhengShiBai')
    shuRuKuang.value?.聚焦()
    return
  }
  cuoWu.value = ''
  发出('ti-jiao', { renJiPiaoJu: tiaoZhan.value.id, renJiDaAn: guiYi })
}

function gengHuan(): void {
  if (jiaZaiZhong.value || 属性.dengDaiZhong) return
  void jiaZaiTiaoZhan()
}

function qingQiuGuanBi(): void {
  if (属性.dengDaiZhong) return
  发出('guan-bi')
}

function biaoShiYanZhengShiBai(): void {
  if (!属性.xianShi) return
  cuoWu.value = huoQuFanYi('renZheng', 'renJiYanZhengShiBai')
  void jiaZaiTiaoZhan(true)
}

function anJianPan(shijian: KeyboardEvent): void {
  if (shijian.key === 'Escape') {
    shijian.preventDefault()
    qingQiuGuanBi()
    return
  }
  if (shijian.key !== 'Tab') return
  const jiaoDianLie = Array.from(
    tanChuang.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )
  if (jiaoDianLie.length === 0) return
  const shou = jiaoDianLie[0]
  const wei = jiaoDianLie[jiaoDianLie.length - 1]
  if (shijian.shiftKey && document.activeElement === shou) {
    shijian.preventDefault()
    wei.focus()
  } else if (!shijian.shiftKey && document.activeElement === wei) {
    shijian.preventDefault()
    shou.focus()
  }
}

function jiLuJiaoDian(): void {
  const huoYue = document.activeElement
  zhiQianJiaoDian.value = huoYue instanceof HTMLElement && huoYue !== document.body ? huoYue : null
}

function huiFuJiaoDian(): void {
  const muBiao = zhiQianJiaoDian.value
  zhiQianJiaoDian.value = null
  if (!muBiao || !document.contains(muBiao)) return
  void nextTick(() => muBiao.focus())
}

watch(
  () => 属性.xianShi,
  (xianShi) => {
    if (xianShi) {
      jiLuJiaoDian()
      qingLiZhuangTai()
      void jiaZaiTiaoZhan()
      return
    }
    qingLiZhuangTai()
    huiFuJiaoDian()
  },
)

onMounted(() => {
  if (!属性.xianShi) return
  jiLuJiaoDian()
  void jiaZaiTiaoZhan()
})

onBeforeUnmount(() => {
  qingLiZhuangTai()
})

defineExpose({ biaoShiYanZhengShiBai })
</script>

<style scoped>
.renji-zhezhao {
  position: fixed;
  inset: 0;
  z-index: var(--ceng-xieyi);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-zhong);
  background: var(--zhezhao-beijing);
  backdrop-filter: var(--boli-mohu);
  -webkit-backdrop-filter: var(--boli-mohu);
  overscroll-behavior: contain;
}

.renji-tanchuang {
  --renji-jin: #c9a96a;
  --renji-jin-liang: #f0dcae;
  --renji-jin-shen: #8a6a2f;
  --renji-mian: #141a2d;
  --renji-xian: rgba(201, 169, 106, 0.42);
  --renji-cuo: #ff6b5e;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - var(--jiange-da) * 2);
  max-height: calc(100dvh - var(--jiange-da) * 2);
  overflow: hidden;
  padding: var(--jiange-da);
  background: var(--tanchuang-beijing);
  border: 1px solid var(--tanchuang-biankuang);
  border-radius: var(--yuanjiao-da);
  box-shadow: var(--tanchuang-yinying);
  color: var(--wenben-zhuse);
  outline: none;
}

.renji-toubu {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-zhong);
  margin-bottom: var(--jiange-6);
}

.renji-biaoti {
  margin: 0;
  font-size: var(--ziti-da);
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.06em;
  color: var(--tanchuang-biaoti);
}

.renji-guanbi {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 32px;
  margin: calc(var(--jiange-4) * -1) calc(var(--jiange-4) * -1) 0 0;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--yuanjiao-xiao);
  color: var(--wenben-ciuse);
  cursor: pointer;
  transition:
    color 0.2s var(--quxian-biao-zhun),
    background-color 0.2s var(--quxian-biao-zhun),
    border-color 0.2s var(--quxian-biao-zhun);
}

.renji-guanbi::before {
  content: '';
  position: absolute;
  inset: calc((var(--shuru-anniu-re-ku) - 32px) / -2);
}

.renji-guanbi-tubiao {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.renji-guanbi:hover:not(:disabled) {
  background: rgba(201, 169, 106, 0.12);
  border-color: var(--renji-xian);
  color: var(--tanchuang-biaoti);
}

.renji-guanbi:focus-visible,
.renji-geng-huan:focus-visible,
.renji-que-ren:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.renji-guanbi:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.renji-miaoshu {
  margin: 0 0 var(--jiange-xiao);
  font-size: var(--ziti-zhong);
  line-height: 1.6;
  color: var(--wenben-ciuse);
}

.renji-tuxiang-qu {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  margin-bottom: var(--jiange-xiao);
  padding: var(--jiange-xiao);
  background: var(--renji-mian);
  border: 1px solid var(--renji-xian);
  border-radius: var(--yuanjiao-xiao);
  overflow: hidden;
}

.renji-tuxiang {
  display: block;
  width: 100%;
  max-width: 360px;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
  transition: opacity 0.2s var(--quxian-biao-zhun);
}

.renji-tuxiang-jiazai .renji-tuxiang {
  opacity: 0.35;
}

.renji-zhanwei {
  margin: 0;
  padding: var(--jiange-zhong);
  font-size: var(--ziti-zhong);
  color: var(--wenben-ciuse);
  text-align: center;
}

.renji-shuaxin-zhuang {
  position: absolute;
  inset: auto 0 var(--jiange-xiao);
  font-size: var(--ziti-xiao);
  color: var(--renji-jin-liang);
  text-align: center;
}

.renji-biaodan {
  --bianKuang: var(--renji-xian);
  --kaPian: rgba(13, 18, 32, 0.72);
  --moSe: var(--wenben-zhuse);
  --huiSe: var(--wenben-ciuse);
  --miao-bian-se: rgba(240, 220, 174, 0.75);
  --chang-fang-kuang-gao-liang-liang: rgba(240, 220, 174, 0.75);
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: var(--jiange-xiao);
}

.renji-neirong {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: var(--jiange-xiao);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.renji-shuru-biaoqian {
  padding-left: var(--jiange-2);
  font-size: var(--ziti-xiao);
  line-height: 1.5;
  color: var(--wenben-ciuse);
}

.renji-cuowu {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.5;
  color: var(--renji-cuo);
}

.renji-anniu-hang {
  display: flex;
  flex: none;
  align-items: stretch;
  gap: var(--jiange-12);
  margin-top: var(--jiange-4);
}

.renji-geng-huan,
.renji-que-ren {
  min-height: var(--shuru-anniu-re-ku);
  padding: var(--jiange-10) var(--jiange-zhong);
  border-radius: var(--yuanjiao-xiao);
  font-family: inherit;
  font-size: var(--ziti-zhong);
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    filter 0.2s var(--quxian-biao-zhun),
    transform 0.2s var(--quxian-biao-zhun),
    background-color 0.2s var(--quxian-biao-zhun),
    border-color 0.2s var(--quxian-biao-zhun),
    color 0.2s var(--quxian-biao-zhun);
}

.renji-geng-huan {
  flex: none;
  background: transparent;
  border: 1px solid var(--renji-xian);
  color: var(--wenben-ciuse);
}

.renji-geng-huan:hover:not(:disabled) {
  background: rgba(201, 169, 106, 0.12);
  border-color: var(--renji-jin);
  color: var(--tanchuang-biaoti);
}

.renji-que-ren {
  flex: 1;
  min-width: 0;
  background: linear-gradient(180deg, var(--renji-jin-liang), var(--renji-jin));
  border: 1px solid var(--renji-jin-shen);
  color: #17130a;
  box-shadow:
    0 4px 10px rgba(2, 4, 14, 0.32),
    0 1px 2px rgba(2, 4, 14, 0.24);
}

.renji-que-ren:hover:not(:disabled) {
  filter: brightness(1.04);
}

.renji-que-ren:active:not(:disabled) {
  filter: brightness(0.96);
  transform: translateY(1px);
}

.renji-geng-huan:disabled,
.renji-que-ren:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.renji-biaodan :deep(.chang-fang-kuang-shuru) {
  font-size: var(--shuru-kuang-zihao);
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.renji-biaodan :deep(.chang-fang-kuang-shuru:placeholder-shown) {
  letter-spacing: normal;
}

:root[data-theme='light'] .renji-tanchuang {
  --renji-jin: #a3813e;
  --renji-jin-liang: #f7ead0;
  --renji-jin-shen: #6d5424;
  --renji-mian: #fffcf3;
  --renji-xian: rgba(163, 129, 62, 0.4);
  --renji-cuo: #b3261e;
}

:root[data-theme='light'] .renji-biaodan {
  --kaPian: #fffcf3;
  --miao-bian-se: rgba(163, 129, 62, 0.65);
  --chang-fang-kuang-gao-liang-liang: rgba(163, 129, 62, 0.65);
}

.renji-motaikuang-enter-active,
.renji-motaikuang-leave-active {
  transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.renji-motaikuang-enter-active .renji-tanchuang,
.renji-motaikuang-leave-active .renji-tanchuang {
  transition:
    transform var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu),
    opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.renji-motaikuang-enter-from,
.renji-motaikuang-leave-to {
  opacity: 0;
}

.renji-motaikuang-enter-from .renji-tanchuang,
.renji-motaikuang-leave-to .renji-tanchuang {
  transform: scale(0.96) translateY(var(--jiange-zhong));
  opacity: 0;
}

@media (max-width: 767px) {
  .renji-zhezhao {
    padding: var(--jiange-12);
  }

  .renji-tanchuang {
    max-height: calc(100dvh - var(--jiange-12) * 2);
    padding: var(--jiange-zhong);
  }

  .renji-anniu-hang {
    flex-direction: column-reverse;
  }

  .renji-geng-huan {
    width: 100%;
  }
}

@media (max-height: 540px) {
  .renji-tanchuang {
    max-height: calc(100vh - var(--jiange-zhong) * 2);
    max-height: calc(100dvh - var(--jiange-zhong) * 2);
    padding: var(--jiange-zhong);
  }

  .renji-toubu {
    margin-bottom: var(--jiange-4);
  }

  .renji-miaoshu {
    margin-bottom: var(--jiange-4);
  }

  .renji-tuxiang-qu {
    min-height: 0;
    margin-bottom: var(--jiange-4);
  }

  .renji-tuxiang {
    max-width: 240px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .renji-motaikuang-enter-active,
  .renji-motaikuang-leave-active,
  .renji-motaikuang-enter-active .renji-tanchuang,
  .renji-motaikuang-leave-active .renji-tanchuang,
  .renji-tuxiang,
  .renji-guanbi,
  .renji-geng-huan,
  .renji-que-ren {
    transition: none !important;
  }
}
</style>
