<template>
  <section class="qipao-zhuTi-xuanZeQi" :aria-label="biaoTi">
    <div class="qi-pao-liang-lan">
      <section v-for="zu in fenZu" :key="zu.jian" class="qi-pao-ce">
        <h3 class="qi-pao-ce-ti">{{ zu.biaoTi }}</h3>

        <div class="qi-pao-qun" role="radiogroup" :aria-label="zu.biaoTi">
          <button
            v-for="yuShe in QI_PAO_YU_SHE_XUAN_XIANG"
            :key="'yu-she-' + yuShe"
            type="button"
            class="qi-pao-xuan-xiang"
            :class="{ 'qi-pao-xuan-xiang--xuan': shiXuanZhongYuShe(zu.jian, yuShe) }"
            role="radio"
            :aria-checked="shiXuanZhongYuShe(zu.jian, yuShe)"
            :style="xuanXiangYangShi(yuShe)"
            :title="shuangJiBianJiWenAn"
            @click="xuanZeYuShe(zu.jian, yuShe)"
            @dblclick.stop="daKaiYuSheBianJi(yuShe)"
          >
            <span class="qi-pao-xuan-xiang-wen" @dblclick.stop="daKaiYuSheBianJi(yuShe)">{{
              sheZhi.quQiPaoYuSheMing(yuShe)
            }}</span>
            <span v-if="shiXuanZhongYuShe(zu.jian, yuShe)" class="qi-pao-gou" aria-hidden="true">✓</span>
          </button>

          <div v-for="tiaoMu in sheZhi.waiGuan.qiPao" :key="tiaoMu.id" class="qi-pao-zi-ding-yi-wei">
            <button
              type="button"
              class="qi-pao-xuan-xiang qi-pao-zi-ding-yi"
              :class="{ 'qi-pao-xuan-xiang--xuan': zu.xuanZhongZiDingYi === tiaoMu.id }"
              role="radio"
              :aria-checked="zu.xuanZhongZiDingYi === tiaoMu.id"
              :style="ziDingYiYangShi(tiaoMu)"
              :title="shuangJiBianJiWenAn"
              @click="xuanZeZiDingYi(zu.jian, tiaoMu.id)"
              @dblclick.stop="daKaiBianJi(tiaoMu)"
            >
              <span class="qi-pao-xuan-xiang-wen" @dblclick.stop="daKaiBianJi(tiaoMu)">{{ tiaoMu.mingCheng }}</span>
              <span v-if="zu.xuanZhongZiDingYi === tiaoMu.id" class="qi-pao-gou" aria-hidden="true">✓</span>
            </button>
            <div class="qi-pao-cao-kong">
              <button
                type="button"
                class="qi-pao-kong-zhi"
                :aria-label="bianJiMingChengWenAn + '：' + tiaoMu.mingCheng"
                :disabled="编辑保存中"
                @click.stop="daKaiBianJi(tiaoMu)"
              >
                ✎
              </button>
              <button
                type="button"
                class="qi-pao-kong-zhi qi-pao-kong-zhi--shan-chu"
                :aria-label="shanChuWenAn + '：' + tiaoMu.mingCheng"
                :disabled="删除中"
                @click.stop="zhunBeiShanChu(tiaoMu)"
              >
                ×
              </button>
            </div>
          </div>

          <button
            type="button"
            class="qi-pao-shang-chuan"
            :disabled="上传中"
            :aria-label="shangChuanWenAn"
            @click="daKaiShangChuan(zu.jian)"
          >
            <span class="qi-pao-shang-chuan-jia" aria-hidden="true">＋</span>
            <span>{{ 上传中 ? shangChuanZhongWenAn : shangChuanWenAn }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-if="预设编辑中" class="qi-pao-bian-ji-wei">
      <WaiGuanJiuDiBianJi
        :biao-ti="bianJiBiaoTi"
        :ming-cheng="预设编辑中.mingCheng"
        :wen-zi-yan-se="预设编辑中.wenZiYanSe"
        :zui-da-zi-fu="WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU"
        lei-bie="qiPao"
        :cuo-wu-wen-an="预设编辑错误"
        :cao-zuo-zhong="预设保存中"
        @tijiao="baoChunYuSheBianJi"
        @huan-yuan="huanYuanYuSheBianJi"
        @qu-xiao="guanBiYuSheBianJi"
      />
    </div>

    <div v-if="bianJiZhong" class="qi-pao-bian-ji-wei">
      <WaiGuanJiuDiBianJi
        :biao-ti="bianJiBiaoTi"
        :ming-cheng="bianJiZhong.mingCheng"
        :wen-zi-yan-se="bianJiZhong.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE"
        :zui-da-zi-fu="WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU"
        lei-bie="qiPao"
        :cuo-wu-wen-an="bianJiCuoWu"
        :cao-zuo-zhong="编辑保存中"
        @tijiao="baoChunBianJi"
        @huan-yuan="huanYuanBianJi"
        @qu-xiao="guanBiBianJi"
      />
    </div>

    <p v-if="tiShiWenAn" class="qi-pao-ti-shi" :class="{ 'qi-pao-ti-shi--cuo-wu': tiShiShiBai }" role="status">
      {{ tiShiWenAn }}
    </p>

    <input
      ref="wenJianShuRu"
      class="qi-pao-wen-jian-shu-ru"
      type="file"
      :accept="tuPianMime"
      :aria-label="shangChuanWenAn"
      @change="chuLiWenJianXuanZe"
    />

    <ShangChuanShuoMing
      :xian-shi="显示上传说明"
      lei-bie="qiPao"
      @que-ren="queRenShangChuan"
      @qu-xiao="显示上传说明 = false"
    />

    <QueRenDuiHuaKuang
      :xian-shi="显示删除确认"
      :biao-ti="shanChuBiaoTi"
      :miao-shu="shanChuMiaoShu"
      :que-ren-wen-an="删除中 ? shanChuZhongWenAn : shanChuWenAn"
      :qu-xiao-wen-an="quXiaoWenAn"
      :cao-zuo-zhong="删除中"
      @que-ren="queRenShanChu"
      @qu-xiao="guanBiShanChuQueRen"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { QI_PAO_YU_SHE_XUAN_XIANG, huoQuQiPaoDingYi, type QiPaoYuShe } from '@/config/气泡主题'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'
import { huoQuFanYi } from '@/config/翻译表'
import { tiQuCuoWuWenBen } from '@/utils/前台错误'
import {
  WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU,
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_TU_PIAN_MIME,
  huoQuQiPaoBeiJingZhi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'
import ShangChuanShuoMing from '@/components/上传说明层.vue'
import QueRenDuiHuaKuang from '@/components/确认对话框.vue'

const biaoTi = QI_PAO_WEN_AN.biaoTi
const sheZhi = 使用用户设置仓库()

const shuangJiBianJiWenAn = huoQuFanYi('sheZhi', 'waiGuanShuangJiBianJi')
const shanChuWenAn = huoQuFanYi('sheZhi', 'waiGuanShanChuQiPao')
const shanChuBiaoTi = huoQuFanYi('sheZhi', 'shanChuZiDingYiQiPao')
const shangChuanWenAn = huoQuFanYi('sheZhi', 'ziDingYiShangChuan')
const shangChuanZhongWenAn = huoQuFanYi('sheZhi', 'shangChuanZhongWenAn')
const bianJiBiaoTi = huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')
const bianJiMingChengWenAn = huoQuFanYi('sheZhi', 'waiGuanBianJiMingCheng')
const quXiaoWenAn = huoQuFanYi('sheZhi', 'waiGuanQuXiao')
const shanChuZhongWenAn = huoQuFanYi('sheZhi', 'shanChuZhongWenAn')
const 保存成功文案 = huoQuFanYi('sheZhi', 'waiGuanShangChuanChengGong')
const 还原成功文案 = huoQuFanYi('sheZhi', 'waiGuanYiHuiFuMoRen')
const 失败文案 = huoQuFanYi('sheZhi', 'waiGuanBaoCunShiBai')
const tuPianMime = WAI_GUAN_TU_PIAN_MIME.join(',')

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
const bianJiCuoWu = ref('')
const 编辑保存中 = ref(false)
const tiShiWenAn = ref('')
const tiShiShiBai = ref(false)
const wenJianShuRu = ref<HTMLInputElement | null>(null)
const shangChuanFang = ref<'ziJi' | 'ai'>('ziJi')
const 显示上传说明 = ref(false)
const 上传中 = ref(false)
const 待删除 = ref<WaiGuanTiaoMu | null>(null)
const 显示删除确认 = ref(false)
const 删除中 = ref(false)

const shanChuMiaoShu = computed(() =>
  待删除.value
    ? huoQuFanYi('sheZhi', 'shanChuQiPaoMing').replace('{name}', 待删除.value.mingCheng)
    : '',
)

function xuanXiangYangShi(yuShe: QiPaoYuShe): Record<string, string> {
  const dingYi = huoQuQiPaoDingYi(yuShe)
  return { background: dingYi.beiJing, color: sheZhi.quQiPaoYuSheYanSe(yuShe) || dingYi.wenBen }
}

function ziDingYiYangShi(tiaoMu: WaiGuanTiaoMu): Record<string, string> {
  return {
    background: huoQuQiPaoBeiJingZhi(tiaoMu.tuDiZhi, tiaoMu.wenZiYanSe),
    color: tiaoMu.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  }
}

function shiXuanZhongYuShe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): boolean {
  if (sheZhi.waiGuan.dangQianQiPao[buWei]) return false
  return (buWei === 'ziJi' ? sheZhi.qiPaoZiJi : sheZhi.qiPaoAI) === yuShe
}

function quCuoWuWenBen(cuoWu: unknown): string {
  return tiQuCuoWuWenBen(cuoWu, 失败文案)
}

function qingChuTiShi(): void {
  tiShiWenAn.value = ''
  tiShiShiBai.value = false
}

async function xuanZeYuShe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
  qingChuTiShi()
  try {
    await sheZhi.xuanZeYuSheQiPao(buWei, yuShe)
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

async function xuanZeZiDingYi(buWei: 'ziJi' | 'ai', id: string): Promise<void> {
  qingChuTiShi()
  try {
    await sheZhi.xuanZeZiDingYiQiPao(buWei, id)
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

const 预设编辑中 = ref<{ yuShe: QiPaoYuShe; mingCheng: string; wenZiYanSe: string } | null>(null)
const 预设编辑错误 = ref('')
const 预设保存中 = ref(false)

function daKaiYuSheBianJi(yuShe: QiPaoYuShe): void {
  if (预设保存中.value) return
  预设编辑中.value = {
    yuShe,
    mingCheng: sheZhi.quQiPaoYuSheMing(yuShe),
    wenZiYanSe: sheZhi.quQiPaoYuSheYanSe(yuShe) || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  }
  预设编辑错误.value = ''
  qingChuTiShi()
}

function guanBiYuSheBianJi(): void {
  预设编辑中.value = null
  预设编辑错误.value = ''
}

async function baoChunYuSheBianJi(zhi: { mingCheng: string; wenZiYanSe: string }): Promise<void> {
  if (!预设编辑中.value) return
  预设保存中.value = true
  预设编辑错误.value = ''
  try {
    await sheZhi.gengXinQiPaoYuShe(预设编辑中.value.yuShe, zhi)
    guanBiYuSheBianJi()
    tiShiShiBai.value = false
    tiShiWenAn.value = 保存成功文案
  } catch (cuoWu: unknown) {
    预设编辑错误.value = quCuoWuWenBen(cuoWu)
  } finally {
    预设保存中.value = false
  }
}

async function huanYuanYuSheBianJi(): Promise<void> {
  if (!预设编辑中.value) return
  预设保存中.value = true
  预设编辑错误.value = ''
  try {
    await sheZhi.huanYuanWaiGuanXiang('qiPao', { jian: 预设编辑中.value.yuShe, leiXing: 'yuShe' })
    guanBiYuSheBianJi()
    tiShiShiBai.value = false
    tiShiWenAn.value = 还原成功文案
  } catch (cuoWu: unknown) {
    预设编辑错误.value = quCuoWuWenBen(cuoWu)
  } finally {
    预设保存中.value = false
  }
}

function daKaiBianJi(tiaoMu: WaiGuanTiaoMu): void {
  if (编辑保存中.value) return
  bianJiZhong.value = { ...tiaoMu }
  bianJiCuoWu.value = ''
  qingChuTiShi()
}

function guanBiBianJi(): void {
  bianJiZhong.value = null
  bianJiCuoWu.value = ''
}

async function baoChunBianJi(zhi: { mingCheng: string; wenZiYanSe: string }): Promise<void> {
  if (!bianJiZhong.value) return
  编辑保存中.value = true
  bianJiCuoWu.value = ''
  try {
    await sheZhi.gengXinWaiGuanTiaoMu('qiPao', bianJiZhong.value.id, zhi)
    guanBiBianJi()
    tiShiShiBai.value = false
    tiShiWenAn.value = 保存成功文案
  } catch (cuoWu: unknown) {
    bianJiCuoWu.value = quCuoWuWenBen(cuoWu)
  } finally {
    编辑保存中.value = false
  }
}

async function huanYuanBianJi(): Promise<void> {
  if (!bianJiZhong.value) return
  编辑保存中.value = true
  bianJiCuoWu.value = ''
  try {
    await sheZhi.huanYuanWaiGuanXiang('qiPao', { jian: bianJiZhong.value.id, leiXing: 'ziDingYi' })
    guanBiBianJi()
    tiShiShiBai.value = false
    tiShiWenAn.value = 还原成功文案
  } catch (cuoWu: unknown) {
    bianJiCuoWu.value = quCuoWuWenBen(cuoWu)
  } finally {
    编辑保存中.value = false
  }
}

function daKaiShangChuan(buWei: 'ziJi' | 'ai'): void {
  if (上传中.value) return
  shangChuanFang.value = buWei
  qingChuTiShi()
  显示上传说明.value = true
}

function queRenShangChuan(): void {
  显示上传说明.value = false
  wenJianShuRu.value?.click()
}

async function chuLiWenJianXuanZe(): Promise<void> {
  const wenJian = wenJianShuRu.value?.files?.[0]
  if (wenJianShuRu.value) wenJianShuRu.value.value = ''
  if (!wenJian) return
  qingChuTiShi()
  上传中.value = true
  tiShiWenAn.value = shangChuanZhongWenAn
  try {
    const tiaoMu = await sheZhi.shangChuanWaiGuan('qiPao', wenJian)
    await sheZhi.xuanZeZiDingYiQiPao(shangChuanFang.value, tiaoMu.id)
    tiShiShiBai.value = false
    tiShiWenAn.value = 保存成功文案
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    上传中.value = false
  }
}

function zhunBeiShanChu(tiaoMu: WaiGuanTiaoMu): void {
  if (删除中.value) return
  qingChuTiShi()
  待删除.value = tiaoMu
  显示删除确认.value = true
}

function guanBiShanChuQueRen(): void {
  if (删除中.value) return
  显示删除确认.value = false
  待删除.value = null
}

async function queRenShanChu(): Promise<void> {
  const tiaoMu = 待删除.value
  if (!tiaoMu || 删除中.value) return
  删除中.value = true
  try {
    await sheZhi.shanChuWaiGuan('qiPao', tiaoMu.id)
    if (bianJiZhong.value?.id === tiaoMu.id) guanBiBianJi()
    显示删除确认.value = false
    待删除.value = null
    tiShiShiBai.value = false
    tiShiWenAn.value = ''
  } catch (cuoWu: unknown) {
    显示删除确认.value = false
    待删除.value = null
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    删除中.value = false
  }
}
</script>

<style scoped>
.qipao-zhuTi-xuanZeQi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.qi-pao-liang-lan {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--jiange-12);
  min-width: 0;
}

.qi-pao-ce {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  min-width: 0;
  padding: var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: var(--beijing-ciuse);
}

.qi-pao-ce-ti {
  margin: 0;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.qi-pao-qun {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.qi-pao-xuan-xiang {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-4);
  min-height: var(--wai-guan-re-ku);
  max-width: 100%;
  padding: var(--jiange-10) var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  line-height: 1.35;
  cursor: pointer;
}

.qi-pao-xuan-xiang--xuan {
  border-color: var(--zhuse);
  box-shadow: 0 0 0 2px var(--zhuse);
}

.qi-pao-xuan-xiang:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-xuan-xiang-wen {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.qi-pao-gou {
  flex: none;
  font-weight: 900;
}

.qi-pao-zi-ding-yi-wei {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-4);
  max-width: 100%;
  min-width: 0;
}

.qi-pao-zi-ding-yi {
  max-width: 180px;
}

.qi-pao-cao-kong {
  display: flex;
  align-items: center;
  gap: var(--jiange-2);
  flex: none;
}

.qi-pao-kong-zhi {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--wai-guan-re-ku);
  height: var(--wai-guan-re-ku);
  padding: 0;
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 50%;
  background: var(--beijing-kaopian);
  color: var(--wenben-ciuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  line-height: 1;
  cursor: pointer;
}

.qi-pao-kong-zhi:hover:not(:disabled) {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.qi-pao-kong-zhi--shan-chu:hover:not(:disabled) {
  border-color: var(--cuowu-yanse);
  background: var(--cuowu-yanse);
  color: var(--fasong-anniu-wenben);
}

.qi-pao-kong-zhi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-kong-zhi:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.qi-pao-shang-chuan {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-4);
  min-height: var(--wai-guan-re-ku);
  padding: var(--jiange-10) var(--jiange-12);
  border: 1.5px dashed var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: transparent;
  color: var(--wenben-ciuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.qi-pao-shang-chuan:hover:not(:disabled) {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.qi-pao-shang-chuan:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-shang-chuan:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.qi-pao-shang-chuan-jia {
  font-size: var(--ziti-zhong);
  line-height: 1;
}

.qi-pao-bian-ji-wei {
  min-width: 0;
}

.qi-pao-ti-shi {
  margin: 0;
  min-height: var(--ziti-zhong);
  font-size: var(--ziti-xiao);
  color: var(--chenggong-yanse);
}

.qi-pao-ti-shi--cuo-wu {
  color: var(--cuowu-yanse);
}

.qi-pao-wen-jian-shu-ru {
  display: none;
}

@media (max-width: 520px) {
  .qi-pao-zi-ding-yi {
    max-width: 140px;
  }
}
</style>
