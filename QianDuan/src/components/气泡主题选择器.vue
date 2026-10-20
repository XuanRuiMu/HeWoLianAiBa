<template>
  <section class="qipao-zhuTi-xuanZeQi" :aria-label="biaoTi">
    <div v-for="zu in fenZu" :key="zu.jian" class="qipao-fenZu">
      <div class="qipao-fenZu-biaoTi">{{ zu.biaoTi }}</div>
      <div class="qipao-xuanXiang-lieBiao" role="radiogroup" :aria-label="zu.biaoTi">
        <div
          v-for="yuShe in QI_PAO_YU_SHE_XUAN_XIANG"
          :key="'yu-she-' + yuShe"
          class="qipao-xuanXiang"
          :class="{ 'qipao-xuanXiang-xuanZhong': shiXuanZhongYuShe(zu.jian, yuShe) }"
          role="radio"
          tabindex="0"
          :aria-checked="shiXuanZhongYuShe(zu.jian, yuShe)"
          :style="xuanXiangYangShi(yuShe)"
          @click="xuanZeYuShe(zu.jian, yuShe)"
          @keydown.enter.prevent="xuanZeYuShe(zu.jian, yuShe)"
          @keydown.space.prevent="xuanZeYuShe(zu.jian, yuShe)"
        >
          <span class="qipao-xuanXiang-wen">{{ huoQuQiPaoMingCheng(yuShe) }}</span>
          <span class="qipao-xuanXiang-gou" aria-hidden="true">✓</span>
        </div>
        <div
          v-for="tiaoMu in sheZhi.waiGuan.qiPao"
          :key="'zi-ding-yi-' + tiaoMu.id"
          class="qipao-xuanXiang qipao-xuanXiang-ziDingYi"
          :class="{ 'qipao-xuanXiang-xuanZhong': zu.xuanZhongZiDingYi === tiaoMu.id }"
          role="radio"
          tabindex="0"
          :aria-checked="zu.xuanZhongZiDingYi === tiaoMu.id"
          :style="ziDingYiYangShi(tiaoMu)"
          :title="shuangJiBianJiWenAn"
          @click="xuanZeZiDingYi(zu.jian, tiaoMu.id)"
          @dblclick.stop="daKaiBianJi(tiaoMu)"
          @keydown.enter.prevent="xuanZeZiDingYi(zu.jian, tiaoMu.id)"
          @keydown.space.prevent="xuanZeZiDingYi(zu.jian, tiaoMu.id)"
        >
          <span class="qipao-xuanXiang-wen">{{ tiaoMu.mingCheng }}</span>
          <span class="qipao-xuanXiang-gou" aria-hidden="true">✓</span>
          <button
            type="button"
            class="qipao-shan-chu-an-niu"
            :aria-label="shanChuWenAn + '：' + tiaoMu.mingCheng"
            :disabled="caoZuoZhong"
            @click.stop="zhunBeiShanChu(tiaoMu.id)"
          >
            ×
          </button>
        </div>
        <div
          class="qipao-xuanXiang qipao-xuanXiang-shang-chuan"
          role="button"
          tabindex="0"
          :aria-label="shangChuanWenAn"
          @click="daKaiShangChuan(zu.jian)"
          @keydown.enter.prevent="daKaiShangChuan(zu.jian)"
          @keydown.space.prevent="daKaiShangChuan(zu.jian)"
        >
          <span class="qipao-shang-chuan-jia" aria-hidden="true">＋</span>
          <span class="qipao-xuanXiang-wen">{{ shangChuanWenAn }}</span>
        </div>
      </div>
    </div>
    <WaiGuanXiangBianJiQi
      v-if="bianJiZhong"
      :biao-ti="huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')"
      :ming-cheng="bianJiZhong.mingCheng"
      :wen-zi-yan-se="bianJiZhong.wenZiYanSe"
      :zui-da-zi-fu="WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU"
      :shi-yu-she="false"
      :lei-bie="'qiPao'"
      :yan-se-xuan-xiang="WAI_GUAN_QI_PAO_YAN_SE_XUAN_XIANG"
      @geng-xin="baoChunBianJi"
      @huan-yuan="huanYuanBianJi"
      @guan-bi="bianJiZhong = null"
    />
    <p v-if="tiShiWenAn" class="qipao-ti-shi" :class="{ 'qipao-ti-shi-cuo-wu': tiShiShiBai }" role="status">
      {{ tiShiWenAn }}
    </p>
    <input
      ref="wenJianShuRu"
      class="qipao-wen-jian-shu-ru"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      :aria-label="shangChuanWenAn"
      @change="chuLiWenJianXuanZe"
    />
    <Teleport to="body">
      <Transition name="tan-chuang">
        <div
          v-if="xianShiShanChuQueRen"
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
            <h3 id="qipao-shanchu-biaoti" class="tan-chuang-biao-ti">{{ shanChuWenAn }}</h3>
            <p id="qipao-shanchu-miaoshu" class="tan-chuang-miao-shu">{{ queRenShanChuWenAn }}</p>
            <div class="tan-chuang-an-niu-qun">
              <button ref="quXiaoAnNiu" type="button" class="anniu-fu-zhu" @click="guanBiShanChuQueRen">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button ref="queRenAnNiu" type="button" class="anniu-zhu-yao anniu-wei-xian" @click="queRenShanChu">
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
import { computed, nextTick, ref } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  QI_PAO_YU_SHE_XUAN_XIANG,
  huoQuQiPaoDingYi,
  type QiPaoYuShe,
} from '@/config/气泡主题'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'
import { huoQuFanYi } from '@/config/翻译表'
import { tiQuCuoWuWenBen } from '@/utils/前台错误'
import {
  WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU,
  WAI_GUAN_QI_PAO_YAN_SE_XUAN_XIANG,
  huoQuQiPaoBeiJingZhi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import WaiGuanXiangBianJiQi from '@/components/外观项编辑器.vue'

const biaoTi = QI_PAO_WEN_AN.biaoTi
const sheZhi = 使用用户设置仓库()

const shuangJiBianJiWenAn = huoQuFanYi('sheZhi', 'waiGuanShuangJiBianJi')
const shanChuWenAn = huoQuFanYi('sheZhi', 'shanChuZiDingYiQiPao')
const shangChuanWenAn = huoQuFanYi('sheZhi', 'ziDingYiShangChuan')
const queRenShanChuWenAn = huoQuFanYi('sheZhi', 'queRenShanChuQiPao')

const fenZu = computed(() => [
  {
    jian: 'ziJi' as const,
    biaoTi: QI_PAO_WEN_AN.ziJiBiaoTi,
    xuanZhongZiDingYi: sheZhi.waiGuan.dangQianQiPao.ziJi,
  },
  {
    jian: 'ai' as const,
    biaoTi: QI_PAO_WEN_AN.aiBiaoTi,
    xuanZhongZiDingYi: sheZhi.waiGuan.dangQianQiPao.ai,
  },
])

const bianJiZhong = ref<WaiGuanTiaoMu | null>(null)
const tiShiWenAn = ref('')
const tiShiShiBai = ref(false)
const caoZuoZhong = ref(false)
const wenJianShuRu = ref<HTMLInputElement | null>(null)
const shangChuanFang = ref<'ziJi' | 'ai'>('ziJi')
const daiShanChuId = ref<string | null>(null)
const xianShiShanChuQueRen = ref(false)
const quXiaoAnNiu = ref<HTMLButtonElement | null>(null)
const queRenAnNiu = ref<HTMLButtonElement | null>(null)
let fanHuiJiaoDian: HTMLElement | null = null

function xuanXiangYangShi(yuShe: QiPaoYuShe): Record<string, string> {
  const dingYi = huoQuQiPaoDingYi(yuShe)
  return { background: dingYi.beiJing, color: dingYi.wenBen }
}

function ziDingYiYangShi(tiaoMu: WaiGuanTiaoMu): Record<string, string> {
  return {
    background: huoQuQiPaoBeiJingZhi(tiaoMu.tuDiZhi, tiaoMu.wenZiYanSe),
    color: tiaoMu.wenZiYanSe || '#FFFFFF',
  }
}

function shiXuanZhongYuShe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): boolean {
  if (sheZhi.waiGuan.dangQianQiPao[buWei]) return false
  return (buWei === 'ziJi' ? sheZhi.qiPaoZiJi : sheZhi.qiPaoAI) === yuShe
}

function quCuoWuWenBen(cuoWu: unknown): string {
  return tiQuCuoWuWenBen(cuoWu, huoQuFanYi('sheZhi', 'waiGuanBaoCunShiBai'))
}

async function xuanZeYuShe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
  tiShiShiBai.value = false
  tiShiWenAn.value = ''
  try {
    await sheZhi.xuanZeYuSheQiPao(buWei, yuShe)
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

async function xuanZeZiDingYi(buWei: 'ziJi' | 'ai', id: string): Promise<void> {
  tiShiShiBai.value = false
  tiShiWenAn.value = ''
  try {
    await sheZhi.xuanZeZiDingYiQiPao(buWei, id)
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

function daKaiBianJi(tiaoMu: WaiGuanTiaoMu): void {
  bianJiZhong.value = { ...tiaoMu }
  tiShiWenAn.value = ''
}

async function baoChunBianJi(zhi: { mingCheng: string; wenZiYanSe: string }): Promise<void> {
  if (!bianJiZhong.value) return
  caoZuoZhong.value = true
  try {
    await sheZhi.gengXinWaiGuanTiaoMu('qiPao', bianJiZhong.value.id, zhi)
    bianJiZhong.value = null
    tiShiShiBai.value = false
    tiShiWenAn.value = huoQuFanYi('sheZhi', 'waiGuanShangChuanChengGong')
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    caoZuoZhong.value = false
  }
}

async function huanYuanBianJi(): Promise<void> {
  if (!bianJiZhong.value) return
  caoZuoZhong.value = true
  try {
    await sheZhi.huanYuanWaiGuan('qiPao', bianJiZhong.value.id)
    bianJiZhong.value = null
    tiShiShiBai.value = false
    tiShiWenAn.value = huoQuFanYi('sheZhi', 'waiGuanShangChuanChengGong')
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    caoZuoZhong.value = false
  }
}

function daKaiShangChuan(buWei: 'ziJi' | 'ai'): void {
  if (caoZuoZhong.value) return
  shangChuanFang.value = buWei
  tiShiWenAn.value = ''
  wenJianShuRu.value?.click()
}

async function chuLiWenJianXuanZe(): Promise<void> {
  const wenJian = wenJianShuRu.value?.files?.[0]
  if (wenJianShuRu.value) wenJianShuRu.value.value = ''
  if (!wenJian) return
  caoZuoZhong.value = true
  tiShiShiBai.value = false
  tiShiWenAn.value = huoQuFanYi('sheZhi', 'shangChuanZhongWenAn')
  try {
    const tiaoMu = await sheZhi.shangChuanWaiGuan('qiPao', wenJian)
    await sheZhi.xuanZeZiDingYiQiPao(shangChuanFang.value, tiaoMu.id)
    tiShiShiBai.value = false
    tiShiWenAn.value = huoQuFanYi('sheZhi', 'waiGuanShangChuanChengGong')
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    caoZuoZhong.value = false
  }
}

function zhunBeiShanChu(id: string): void {
  fanHuiJiaoDian = document.activeElement as HTMLElement | null
  daiShanChuId.value = id
  xianShiShanChuQueRen.value = true
  void nextTick(() => quXiaoAnNiu.value?.focus())
}

function guanBiShanChuQueRen(): void {
  xianShiShanChuQueRen.value = false
  daiShanChuId.value = null
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

async function queRenShanChu(): Promise<void> {
  const id = daiShanChuId.value
  fanHuiJiaoDian = null
  xianShiShanChuQueRen.value = false
  daiShanChuId.value = null
  if (!id) return
  caoZuoZhong.value = true
  try {
    await sheZhi.shanChuWaiGuan('qiPao', id)
    if (bianJiZhong.value?.id === id) bianJiZhong.value = null
    tiShiShiBai.value = false
    tiShiWenAn.value = ''
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    caoZuoZhong.value = false
  }
}
</script>

<style scoped>
.qipao-zhuTi-xuanZeQi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
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

.qipao-xuanXiang:hover {
  transform: translateY(-1px);
  box-shadow: var(--qipao-yinying);
}

.qipao-xuanXiang:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: 2px;
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
  position: relative;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  max-width: 220px;
}

.qipao-xuanXiang-ziDingYi .qipao-xuanXiang-wen {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qipao-shan-chu-an-niu {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.qipao-shan-chu-an-niu:disabled {
  opacity: 0.5;
  cursor: progress;
}

.qipao-xuanXiang-shang-chuan {
  border-style: dashed;
  background: color-mix(in srgb, var(--wenben-zhuse) 6%, transparent);
  color: var(--wenben-ciuse);
}

.qipao-shang-chuan-jia {
  font-size: 16px;
  line-height: 1;
}

.qipao-ti-shi {
  margin: 0;
  font-size: 13px;
}

.qipao-ti-shi-cuo-wu {
  color: var(--cuowu-wenben);
}

.qipao-wen-jian-shu-ru {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
  font-size: 16px;
  margin: 0 0 var(--jiange-xiao);
}

.tan-chuang-miao-shu {
  font-size: 13px;
  color: var(--wenben-ciuse);
  margin: 0 0 var(--jiange-zhong);
}

.tan-chuang-an-niu-qun {
  display: flex;
  gap: var(--jiange-xiao);
  justify-content: center;
}

.tan-chuang-enter-active,
.tan-chuang-leave-active {
  transition: opacity 0.15s ease;
}

.tan-chuang-enter-from,
.tan-chuang-leave-to {
  opacity: 0;
}
</style>
