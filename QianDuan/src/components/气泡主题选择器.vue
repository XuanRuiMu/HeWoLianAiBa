<template>
  <section class="qipao-zhuTi-xuanZeQi" :aria-label="biaoTi">
    <h3 class="qipao-xuanZe-biaoTi">{{ biaoTi }}</h3>
    <div class="qipao-fenZu">
      <h4 class="qipao-fenZu-biaoTi">{{ ziJiBiaoTi }}</h4>
      <div class="qipao-xuanXiang-lieBiao" role="radiogroup" :aria-label="ziJiBiaoTi">
        <button
          v-for="yuShe in QI_PAO_YU_SHE_XUAN_XIANG"
          :key="'ziJi-' + yuShe"
          class="qipao-xuanXiang"
          :class="{ 'qipao-xuanXiang-xuanZhong': sheZhi.qiPaoZiJi === yuShe && !sheZhi.ziDingYiQiPao }"
          :style="xuanXiangYangShi(yuShe)"
          role="radio"
          :aria-checked="sheZhi.qiPaoZiJi === yuShe && !sheZhi.ziDingYiQiPao"
          @click="xuanZe('ziJi', yuShe)"
        >
          <span class="qipao-xuanXiang-wen">{{ huoQuQiPaoMingCheng(yuShe) }}</span>
          <span class="qipao-xuanXiang-gou" aria-hidden="true">✓</span>
        </button>
        <button
          v-if="sheZhi.ziDingYiQiPao"
          class="qipao-xuanXiang qipao-xuanXiang-xuanZhong qipao-xuanXiang-ziDingYi"
          :style="sheZhi.ziDingYiQiPaoNeiLianYangShi"
          role="radio"
          aria-checked="true"
          @click="qingChuZiDingYi"
        >
          <span class="qipao-xuanXiang-wen">{{ sheZhi.ziDingYiQiPao.mingCheng }}</span>
          <span class="qipao-xuanXiang-gou" aria-hidden="true">✓</span>
        </button>
      </div>
    </div>
    <div class="qipao-fenZu">
      <h4 class="qipao-fenZu-biaoTi">{{ aiBiaoTi }}</h4>
      <div class="qipao-xuanXiang-lieBiao" role="radiogroup" :aria-label="aiBiaoTi">
        <button
          v-for="yuShe in QI_PAO_YU_SHE_XUAN_XIANG"
          :key="'ai-' + yuShe"
          class="qipao-xuanXiang"
          :class="{ 'qipao-xuanXiang-xuanZhong': sheZhi.qiPaoAI === yuShe }"
          :style="xuanXiangYangShi(yuShe)"
          role="radio"
          :aria-checked="sheZhi.qiPaoAI === yuShe"
          @click="xuanZe('ai', yuShe)"
        >
          <span class="qipao-xuanXiang-wen">{{ huoQuQiPaoMingCheng(yuShe) }}</span>
          <span class="qipao-xuanXiang-gou" aria-hidden="true">✓</span>
        </button>
      </div>
    </div>
    <div class="qipao-ziDingYi-qu">
      <div class="qipao-ziDingYi-ming-hang">
        <label class="qipao-ziDingYi-biao-qian" for="zi-ding-yi-qi-pao-ming-cheng">
          {{ huoQuFanYi('sheZhi', 'qiPaoMingCheng') }}
        </label>
        <ChangFangShuRuKuang
          biao-shi="zi-ding-yi-qi-pao-ming-cheng"
          :mo-xing-zhi="qiPaoMingCheng"
          :zui-da-chang-du="12"
          :biao-qian="huoQuFanYi('sheZhi', 'qiPaoMingCheng')"
          :zhan-wei-wen-zi="huoQuFanYi('sheZhi', 'qiPaoMingChengZhanWei')"
          @geng-xin="qiPaoMingCheng = $event"
        />
      </div>
      <p class="qipao-ziDingYi-shuo-ming">{{ huoQuFanYi('sheZhi', 'qiPaoMingChengBenDiBieMing') }}</p>
      <p v-if="qiPaoTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': qiPaoShiBai }">{{ qiPaoTiShi }}</p>
      <div class="qipao-ziDingYi-an-niu-hang">
        <button class="anniu-fu-zhu xiao-anniu zi-ding-yi-qi-pao-shang-chuan" :disabled="qiPaoShangChuanZhong" @click="daKaiQiPaoXuanZe">
          {{ qiPaoShangChuanZhong ? huoQuFanYi('sheZhi', 'shangChuanZhong') : huoQuFanYi('sheZhi', 'shangChuanZiDingYiQiPao') }}
        </button>
        <button
          v-if="sheZhi.ziDingYiQiPao"
          class="anniu-fu-zhu xiao-anniu zi-ding-yi-qi-pao-shan-chu"
          :disabled="qiPaoShangChuanZhong"
          @click="daKaiShanChuQueRen"
        >
          {{ huoQuFanYi('sheZhi', 'shanChuZiDingYiQiPao') }}
        </button>
      </div>
      <input ref="qiPaoInputRef" class="yincang-wenjian-shuru" type="file" accept="image/*" @change="chuLiQiPaoXuanZe" />
    </div>
    <Teleport to="body">
      <Transition name="tan-chuang">
        <div
          v-if="xianShiQiPaoShanChuQueRen"
          class="tan-chuang-bei-jing"
          @click.self="guanBiShanChuQueRen"
          @keydown="chuLiTanChuangJianPan"
        >
          <div
            class="tan-chuang-rong-qi"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qipao-shanchu-biaoti"
            aria-describedby="qipao-shanchu-miaoshu"
          >
            <h3 id="qipao-shanchu-biaoti" class="tan-chuang-biao-ti">{{ huoQuFanYi('sheZhi', 'shanChuZiDingYiQiPao') }}</h3>
            <p id="qipao-shanchu-miaoshu" class="tan-chuang-miao-shu">{{ huoQuFanYi('sheZhi', 'queRenShanChuQiPao') }}</p>
            <div class="tan-chuang-an-niu-qun">
              <button ref="quXiaoAnNiu" class="anniu-fu-zhu" @click="guanBiShanChuQueRen">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button ref="queRenAnNiu" class="anniu-zhu-yao anniu-wei-xian" @click="queRenShanChuZiDingYi">
                {{ huoQuFanYi('renZheng', 'queRen') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  QI_PAO_YU_SHE_XUAN_XIANG,
  huoQuQiPaoDingYi,
  type QiPaoYuShe,
} from '@/config/气泡主题'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'
import { huoQuFanYi } from '@/config/翻译表'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import { shangChuanLiaoTianBeiJing } from '@/api/社交'
import { yaSuoTuPiang } from '@/utils/图片压缩'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'

const biaoTi = QI_PAO_WEN_AN.biaoTi
const ziJiBiaoTi = QI_PAO_WEN_AN.ziJiBiaoTi
const aiBiaoTi = QI_PAO_WEN_AN.aiBiaoTi

const sheZhi = 使用用户设置仓库()
const qiPaoMingCheng = ref('')
const { qingChuCaoGao: qingChuQiPaoMingChengCaoGao } = useCaoGao(CAO_GAO_JIAN.ziDingYiQiPaoMingCheng, qiPaoMingCheng)
const qiPaoInputRef = ref<HTMLInputElement | null>(null)
const qiPaoShangChuanZhong = ref(false)
const qiPaoTiShi = ref('')
const qiPaoShiBai = ref(false)
const xianShiQiPaoShanChuQueRen = ref(false)
const quXiaoAnNiu = ref<HTMLButtonElement | null>(null)
const queRenAnNiu = ref<HTMLButtonElement | null>(null)
let fanHuiJiaoDian: HTMLElement | null = null

function xuanXiangYangShi(yuShe: QiPaoYuShe): Record<string, string> {
  const dingYi = huoQuQiPaoDingYi(yuShe)
  return { background: dingYi.beiJing, color: dingYi.wenBen }
}

function xuanZe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): void {
  qingChuZiDingYi()
  void sheZhi.qieHuanQiPao(buWei, yuShe)
}

function qingChuZiDingYi(): void {
  if (sheZhi.ziDingYiQiPao) sheZhi.qingChuZiDingYiQiPaoZhuangTai()
}

function daKaiQiPaoXuanZe(): void {
  qiPaoTiShi.value = ''
  qiPaoShiBai.value = false
  qiPaoInputRef.value?.click()
}

async function chuLiQiPaoXuanZe(): Promise<void> {
  const wenJian = qiPaoInputRef.value?.files?.[0]
  if (qiPaoInputRef.value) qiPaoInputRef.value.value = ''
  if (!wenJian) return
  if (!wenJian.type.startsWith('image/')) {
    qiPaoShiBai.value = true
    qiPaoTiShi.value = huoQuFanYi('sheZhi', 'qiPaoFeiFaWenJianTiShi')
    return
  }
  qiPaoShangChuanZhong.value = true
  qiPaoShiBai.value = false
  qiPaoTiShi.value = ''
  try {
    const yaSuo = await yaSuoTuPiang(wenJian)
    const diZhi = await shangChuanLiaoTianBeiJing(yaSuo)
    await sheZhi.baoCunZiDingYiQiPao(qiPaoMingCheng.value.trim(), diZhi)
    qingChuQiPaoMingChengCaoGao()
    qiPaoTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    qiPaoShiBai.value = true
    qiPaoTiShi.value = cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('sheZhi', 'qiPaoFeiFaWenJianTiShi')
  } finally {
    qiPaoShangChuanZhong.value = false
  }
}

function daKaiShanChuQueRen(): void {
  fanHuiJiaoDian = document.activeElement as HTMLElement | null
  xianShiQiPaoShanChuQueRen.value = true
  void nextTick(() => quXiaoAnNiu.value?.focus())
}

function guanBiShanChuQueRen(): void {
  xianShiQiPaoShanChuQueRen.value = false
  const muBiao = fanHuiJiaoDian
  fanHuiJiaoDian = null
  void nextTick(() => {
    if (muBiao?.isConnected) muBiao.focus()
  })
}

function chuLiTanChuangJianPan(shiJian: KeyboardEvent): void {
  if (shiJian.key === 'Escape') {
    shiJian.preventDefault()
    guanBiShanChuQueRen()
    return
  }
  if (shiJian.key !== 'Tab') return
  const anNiuMen = [quXiaoAnNiu.value, queRenAnNiu.value].filter(
    (anNiu): anNiu is HTMLButtonElement => !!anNiu,
  )
  if (!anNiuMen.length) return
  const dangQian = document.activeElement
  if (shiJian.shiftKey && dangQian === anNiuMen[0]) {
    shiJian.preventDefault()
    anNiuMen[anNiuMen.length - 1].focus()
  } else if (!shiJian.shiftKey && dangQian === anNiuMen[anNiuMen.length - 1]) {
    shiJian.preventDefault()
    anNiuMen[0].focus()
  }
}

function queRenShanChuZiDingYi(): void {
  fanHuiJiaoDian = null
  xianShiQiPaoShanChuQueRen.value = false
  sheZhi.qingChuZiDingYiQiPaoZhuangTai()
}
</script>

<style scoped>
.qipao-zhuTi-xuanZeQi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
}
.qipao-xuanZe-biaoTi {
  font-size: 15px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
}
.qipao-fenZu-biaoTi {
  display: flex;
  align-items: center;
  gap: var(--jiange-6);
  font-size: 13px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  margin-bottom: var(--jiange-xiao);
}

.qipao-fenZu-biaoTi::before {
  content: '';
  flex: none;
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: var(--zhuse);
}
.qipao-xuanXiang-lieBiao {
  display: flex;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}
.qipao-xuanXiang {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-6);
  min-height: 36px;
  padding: var(--jiange-xiao) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: 12px;
  border: 1.5px solid color-mix(in srgb, var(--wenben-zhuse) 16%, transparent);
  font-size: 13px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.qipao-xuanXiang:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--qipao-yinying);
}

.qipao-xuanXiang:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: 2px;
}

.qipao-xuanXiang:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qipao-xuanXiang-xuanZhong {
  border-color: transparent;
  box-shadow:
    0 0 0 2px var(--beijing-kaopian),
    0 0 0 4px var(--yanse-qiangdiao);
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
}

.qipao-xuanXiang-xuanZhong:hover {
  transform: none;
  box-shadow:
    0 0 0 2px var(--beijing-kaopian),
    0 0 0 4px var(--yanse-qiangdiao);
}

.qipao-xuanXiang-wen {
  min-width: 0;
}

.qipao-xuanXiang-gou {
  flex: none;
  opacity: 0;
  transform: scale(0.7);
  font-weight: 900;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.qipao-xuanXiang-xuanZhong .qipao-xuanXiang-gou {
  opacity: 1;
  transform: scale(1);
}
.qipao-xuanXiang-ziDingYi {
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  color: #fff;
}
.qipao-ziDingYi-qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}
.qipao-ziDingYi-ming-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}
.qipao-ziDingYi-biao-qian {
  font-size: 13px;
  flex: none;
}
.qipao-ziDingYi-shuo-ming {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}
.qipao-ziDingYi-an-niu-hang {
  display: flex;
  gap: var(--jiange-xiao);
  flex-wrap: wrap;
}
.ti-shi-wen {
  font-size: 13px;
  margin: 0;
}
.ti-shi-cuowu {
  color: var(--yanse-weixian);
}
.yincang-wenjian-shuru {
  display: none;
}
.tan-chuang-bei-jing {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  z-index: 1000;
}
.tan-chuang-rong-qi {
  background: var(--beijing-kaopian);
  border-radius: 14px;
  padding: var(--jiange-da);
  max-width: 400px;
  width: 100%;
  text-align: center;
}
.tan-chuang-biao-ti {
  font-size: 18px;
  margin: 0 0 var(--jiange-12);
}
.tan-chuang-miao-shu {
  font-size: 14px;
  margin: 0 0 var(--jiange-da);
}
.tan-chuang-an-niu-qun {
  display: flex;
  gap: var(--jiange-12);
  justify-content: center;
}

.tan-chuang-an-niu-qun button {
  min-height: 36px;
  padding-inline: var(--jiange-zhong);
}

@media (max-width: 767px) {
  .qipao-xuanXiang,
  .tan-chuang-an-niu-qun button {
    min-height: 44px;
  }

  .qipao-ziDingYi-ming-hang {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .qipao-xuanXiang,
  .qipao-xuanXiang-gou {
    transition: none;
  }
}
</style>
