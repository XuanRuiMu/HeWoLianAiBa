<template>
  <div class="ziliao-shezhi">
    <div class="ziliao-kapian" :data-xingbie="主色档" :data-duixiang-xingbie="对象色档">
      <div class="jindu-yuan-dian">
        <button
          v-for="buZhou in 步骤列表"
          :key="buZhou"
          class="jindu-dian"
          :class="{ huoyue: buZhou <= 当前步骤, dangQian: buZhou === 当前步骤 }"
          @click="tiaoZhuanBuZhou(buZhou)"
        />
      </div>

      <div class="buzhou-guo-du-rong-qi">
        <Transition :name="步骤过渡名称">
          <XingBieXuanZeBuZhou
            v-if="当前步骤 === 1"
            key="b1"
            v-model:模型值="ziLiaoShuJu.xingBie"
            变体="ziJi"
            :标题="huoQuFanYi('ziLiaoSheZhi', 'buZhou1BiaoTi')"
            :描述="huoQuFanYi('ziLiaoSheZhi', 'buZhou1MiaoShu')"
            :自身性别="ziLiaoShuJu.xingBie"
            :对象性别="ziLiaoShuJu.muBiaoXingBie"
          />

          <XingBieXuanZeBuZhou
            v-else-if="当前步骤 === 2"
            key="b2"
            v-model:模型值="ziLiaoShuJu.muBiaoXingBie"
            变体="duiXiang"
            :标题="huoQuFanYi('ziLiaoSheZhi', 'buZhou2BiaoTi')"
            :描述="huoQuFanYi('ziLiaoSheZhi', 'buZhou2MiaoShu')"
            :自身性别="ziLiaoShuJu.xingBie"
            :对象性别="ziLiaoShuJu.muBiaoXingBie"
          />

          <div v-else-if="当前步骤 === 3" key="b3" class="buzuo-neirong buZuo3-gundong">
            <h2 class="buZuo-biaoti">{{ huoQuFanYi('ziLiaoSheZhi', 'buZhou3BiaoTi') }}</h2>
            <div class="mbti-wangGe">
              <button
                v-for="mbti in mbti列表"
                :key="mbti"
                class="mbti-kaPian"
                :class="{ beiXuanZhong: ziLiaoShuJu.xingGeXuanZe === mbti && !随机选中 }"
                @click="xuanZeXingGe(mbti)"
              >
                <span class="mbti-daiMa">{{ mbti }}</span>
                <span class="mbti-zhongWen">{{ 性格选择映射[mbti] }}</span>
                <span class="mbti-miaoShu">{{ huoQuMbtiMiaoShu(mbti) }}</span>
              </button>
              <button
                class="mbti-kaPian suiJi-kaPian"
                :class="{ beiXuanZhong: 随机选中 }"
                @click="suiJiXuanZe"
              >
                <span class="mbti-zhongWen">{{ huoQuFanYi('ziLiaoSheZhi', 'suiJi') }}</span>
                <span class="mbti-miaoShu">{{ huoQuFanYi('ziLiaoSheZhi', 'suiJiMiaoShu') }}</span>
              </button>
            </div>
            <p class="suiji-xingge-tishi">
              {{ huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongSuiJiXingGeTiShi') }}
            </p>
            <p class="yixuan-jiangu-tishi">
              {{ huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongYiXuanJianGuTiShi') }}
            </p>

            <XingBieGouXuan
              v-model:模型值="ziLiaoShuJu.yunXuZhaNanZhaNv"
              class="zhaNv-gouxuan"
              :档="对象勾选档"
              :文案="渣型文案"
            />
            <p v-show="ziLiaoShuJu.yunXuZhaNanZhaNv" class="zhaNv-tishi zhaNv-tishi-huaxian">
              {{ 渣型提示文案 }}
            </p>

            <div class="xinmuzhong-ta-qukuai">
              <button
                type="button"
                class="xinmuzhong-ta-kaiguan"
                :aria-expanded="xinMuZhongDeTaZhanKai"
                @click="xinMuZhongDeTaZhanKai = !xinMuZhongDeTaZhanKai"
              >
                <span class="xinmuzhong-ta-biaoti">{{
                  huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongDeTaBiaoTi')
                }}</span>
                <span class="xinmuzhong-ta-zhuangtai">{{
                  xinMuZhongDeTaZhanKai
                    ? huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongDeTaShouQi')
                    : huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongDeTaZhanKai')
                }}</span>
              </button>
              <p class="xinmuzhong-ta-tishi">
                {{ huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongDeTaTiShi') }}
              </p>
              <div v-show="xinMuZhongDeTaZhanKai" class="xinmuzhong-ta-biaodan">
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongWeiXinMing')
                  }}</span>
                  <ChangFangShuRuKuang
                    :模型值="ziLiaoShuJu.xinMuZhongDeTa.weiXinMing"
                    :最大长度="30"
                    :标签="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongWeiXinMing')"
                    :占位文字="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongWeiXinMingZhanwei')"
                    @geng-xin="ziLiaoShuJu.xinMuZhongDeTa.weiXinMing = $event"
                  />
                </label>
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongZhenShiMing')
                  }}</span>
                  <ChangFangShuRuKuang
                    :模型值="ziLiaoShuJu.xinMuZhongDeTa.zhenShiMing"
                    :最大长度="20"
                    :标签="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongZhenShiMing')"
                    :占位文字="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongZhenShiMingZhanwei')"
                    @geng-xin="ziLiaoShuJu.xinMuZhongDeTa.zhenShiMing = $event"
                  />
                </label>
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLing')
                  }}</span>
                  <ChangFangShuRuKuang
                    :模型值="ziLiaoShuJu.xinMuZhongDeTa.nianLing"
                    类型="number"
                    :step="1"
                    :标签="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLing')"
                    :占位文字="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLingZhanwei')"
                    @geng-xin="ziLiaoShuJu.xinMuZhongDeTa.nianLing = $event"
                    @blur="guiYiNianLingShuRu"
                  />
                </label>
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCi')
                  }}</span>
                  <ChangFangShuRuKuang
                    :模型值="ziLiaoShuJu.xinMuZhongDeTa.tongYongTiShiCi"
                    :多行="true"
                    :行数="3"
                    :最大长度="500"
                    :标签="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCi')"
                    :占位文字="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCiZhanwei')"
                    @geng-xin="ziLiaoShuJu.xinMuZhongDeTa.tongYongTiShiCi = $event"
                  />
                </label>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div class="caoZuo-anNiu">
        <button v-if="当前步骤 > 1" class="anniu-fuZhu" @click="houTuiBuZhou">
          {{ huoQuFanYi('ziLiaoSheZhi', 'shangYiBu') }}
        </button>
        <button
          v-if="当前步骤 < 3"
          class="anniu-zhuYao"
          :disabled="!可以下一步"
          @click="qianJinBuZhou"
        >
          {{ huoQuFanYi('ziLiaoSheZhi', 'xiaYiBu') }}
        </button>
        <button
          v-else
          class="anniu-zhuYao kaiShiLiaoTian"
          :disabled="!可以开始"
          @click="kaiShiLiaoTian"
        >
          {{ huoQuFanYi('ziLiaoSheZhi', 'kaiShiLiaoTian') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import type { MBTI类型, 性格选择 } from '@/types/类型定义'
import { 性格选择映射 } from '@/types/类型定义'
import { huoQuFanYi } from '@/config/翻译表'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import XingBieGouXuan from '@/components/表单/性别勾选框.vue'
import XingBieXuanZeBuZhou from '@/components/资料设置/性别选择步骤.vue'
import { congTongYongTiShiCiTuiCeXingGe } from '@/utils/通用提示词性格'
import { 使用通用性别框体配色 } from '@/composables/use性别框体配色'
import { guiYiNianLing } from '@/utils/输入验证'
import { track } from '@/utils/埋点'

const 仓库 = 使用认证表单仓库()
const router = useRouter()

if (仓库.huoQuZiLiaoSheZhiYiWanCheng()) {
  仓库.qingKongZiLiao()
}

const 步骤列表 = [1, 2, 3]
const 当前步骤 = computed({
  get: () => 仓库.ziLiaoDangQianBuZhou,
  set: (zhi) => {
    仓库.ziLiaoDangQianBuZhou = zhi
  },
})
const ziLiaoShuJu = 仓库.ziLiaoShuJu
const 步骤方向 = ref<'qian' | 'hou'>('qian')

watch(() => 仓库.ziLiaoDangQianBuZhou, 仓库.baoCunZiLiaoZhuangTai)
watch(() => ({ ...仓库.ziLiaoShuJu }), 仓库.baoCunZiLiaoZhuangTai, { deep: true })

const {
  自身色档: 主色档,
  对象色档,
} = 使用通用性别框体配色({
  自身性别: () => ziLiaoShuJu.xingBie,
  对象性别: () => ziLiaoShuJu.muBiaoXingBie,
})

function 计算最远可达步骤(): number {
  if (!ziLiaoShuJu.xingBie) return 1
  if (!ziLiaoShuJu.muBiaoXingBie) return 2
  return 3
}

const 最远可达步骤 = 计算最远可达步骤()
if (仓库.ziLiaoDangQianBuZhou > 最远可达步骤) {
  仓库.ziLiaoDangQianBuZhou = 最远可达步骤
}

const 步骤过渡名称 = computed(() =>
  步骤方向.value === 'qian' ? 'buZhou-qianJin' : 'buZhou-houTui',
)

const 对象勾选档 = 对象色档

function qianJinBuZhou() {
  if (当前步骤.value >= 3 || !可以下一步.value) return
  步骤方向.value = 'qian'
  当前步骤.value++
}

function houTuiBuZhou() {
  if (当前步骤.value <= 1) return
  步骤方向.value = 'hou'
  当前步骤.value--
}

function tiaoZhuanBuZhou(buZhou: number) {
  if (buZhou >= 当前步骤.value) return
  步骤方向.value = 'hou'
  当前步骤.value = buZhou
}

const mbti列表: MBTI类型[] = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENFJ',
  'ENTJ',
  'ESTJ',
  'ESFJ',
  'ENTP',
]

function huoQuMbtiMiaoShu(mbti: MBTI类型): string {
  const jian = `mbtiMiaoShu_${mbti}` as const
  return huoQuFanYi('ziLiaoSheZhi', jian)
}

const 可以下一步 = computed(() => {
  if (当前步骤.value === 1) return !!ziLiaoShuJu.xingBie
  if (当前步骤.value === 2) return !!ziLiaoShuJu.muBiaoXingBie
  return false
})

const 可以开始 = computed(() => !!ziLiaoShuJu.xingGeXuanZe)

const 随机选中 = ref(false)
const 随机性格标记 = ref(false)
const xinMuZhongDeTaZhanKai = ref(false)

function guiYiNianLingShuRu() {
  ziLiaoShuJu.xinMuZhongDeTa.nianLing = guiYiNianLing(ziLiaoShuJu.xinMuZhongDeTa.nianLing)
}

function xuanZeXingGe(mbti: MBTI类型) {
  ziLiaoShuJu.xingGeXuanZe = mbti as 性格选择
  随机选中.value = false
  随机性格标记.value = false
}

function anTongYongTiShiCiXuanZuiJinMbti(tiShiCi: string): MBTI类型 | null {
  return congTongYongTiShiCiTuiCeXingGe(tiShiCi)
}

function suiJiXuanZe() {
  const tiShiCi = ziLiaoShuJu.xinMuZhongDeTa.tongYongTiShiCi.trim()
  const jinSi = anTongYongTiShiCiXuanZuiJinMbti(tiShiCi)
  if (jinSi) {
    ziLiaoShuJu.xingGeXuanZe = jinSi as 性格选择
  } else {
    const suiJiSuoyin = Math.floor(Math.random() * mbti列表.length)
    ziLiaoShuJu.xingGeXuanZe = mbti列表[suiJiSuoyin] as 性格选择
  }
  随机选中.value = true
  随机性格标记.value = true
}

const 渣型文案 = computed(() =>
  对象色档.value === 'nan'
    ? huoQuFanYi('ziLiaoSheZhi', 'zhaNanBianTi')
    : huoQuFanYi('ziLiaoSheZhi', 'zhaNvBianTi'),
)

const 渣型提示文案 = computed(() => {
  const daiTi =
    对象色档.value === 'nan'
      ? huoQuFanYi('ziLiaoSheZhi', 'taDaiTiNan')
      : huoQuFanYi('ziLiaoSheZhi', 'taDaiTiNv')
  return huoQuFanYi('ziLiaoSheZhi', 'zhaXingTiShi').replace('{ta}', daiTi)
})

async function kaiShiLiaoTian() {
  if (!可以开始.value) return
  const linShiZiLiao = {
    xingBie: ziLiaoShuJu.xingBie,
    muBiaoXingBie: ziLiaoShuJu.muBiaoXingBie,
    xingGeXuanZe: ziLiaoShuJu.xingGeXuanZe,
    yunXuZhaNanZhaNv: ziLiaoShuJu.yunXuZhaNanZhaNv,
    随机性格标记: 随机性格标记.value,
    xinMuZhongDeTa: 仓库.huoQuXinMuZhongDeTaYouXiao(),
  }
  sessionStorage.setItem('ziLiaoSheZhiLinShi', JSON.stringify(linShiZiLiao))
  仓库.sheZhiZiLiaoSheZhiYiWanCheng(true)
  track('xiangDaoWanCheng')
  router.push('/tian-jia-wei-xin')
}
</script>

<style scoped>
.ziliao-shezhi {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 0 calc(var(--jiange-zhong) + var(--jiange-4));
}


.ziliao-kapian {
  background: var(--ziliao-beijing);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid var(--ziliao-biankuang);
  border-radius: 18px;
  box-shadow: var(--ziliao-yinying);
  padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-da) var(--jiange-da);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-da);
  position: relative;
  overflow: hidden;
}


.ziliao-kapian::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: var(--ziliao-lengxian);
  pointer-events: none;
}

.ziliao-kapian {
  --ziliao-beijing: var(--liuli-fuchuang-beijing);
  --ziliao-biankuang: var(--liuli-fuchuang-biankuang);
  --ziliao-yinying: var(--liuli-fuchuang-yinying);
  --ziliao-lengxian: var(--liuli-lengxian);
  --ziliao-kuai-beijing: var(--liuli-kuai-beijing);
  --ziliao-kuai-biankuang: var(--liuli-kuai-biankuang);
  --ziliao-miaoshu-wenben: rgba(242, 240, 250, 0.84);
  --ziliao-tishi-wenben: rgba(242, 240, 250, 0.78);
  --ziliao-huaxian-wenben: rgba(255, 215, 0, 0.8);
}

.ziliao-kapian {
  --xingge-gao-guang-se: var(--xingge-gao-guang-nan);
  --xingge-gao-guang-bian-ji: color-mix(in srgb, var(--xingge-gao-guang-se) 45%, transparent);
  --xingge-gao-guang-bian-zhong: color-mix(in srgb, var(--xingge-gao-guang-se) 80%, transparent);
  --xingge-liu-guang-yan: color-mix(in srgb, var(--xingge-gao-guang-se) 92%, #ffffff);
  --xingge-liu-guang-di: color-mix(in srgb, var(--xingge-gao-guang-se) 38%, transparent);
  --xingge-xintiao-zhouqi-xuanguo: 6s;
  --xingge-xintiao-zhouqi-xuanzhong: 1.5s;
  --xingge-piao-zhouqi: 9s;
  --xingge-huxi-an: 0.35;
  --xingge-huxi-liang: 1;
  --xingge-huxi-an-xuan: 0;
  --xingge-wai-guang: 0 0 18px var(--xingge-gao-guang-bian-zhong);
  --xingge-wai-guang-xuanguo: 0 0 13px var(--xingge-gao-guang-bian-zhong);
}

.ziliao-kapian[data-duixiang-xingbie='nv'] {
  --xingge-gao-guang-se: var(--xingge-gao-guang-nv);
}

.ziliao-kapian {
  --xingbie-se-1: var(--xingbie-zhongxing-1);
  --xingbie-se-2: var(--xingbie-zhongxing-2);
  --xingbie-se-wenben: var(--xingbie-zhongxing-wenben);
}

.ziliao-kapian[data-xingbie='nan'] {
  --xingbie-se-1: var(--xingbie-nan-1);
  --xingbie-se-2: var(--xingbie-nan-2);
  --xingbie-se-wenben: var(--xingbie-nan-wenben);
}

.ziliao-kapian[data-xingbie='nv'] {
  --xingbie-se-1: var(--xingbie-nv-1);
  --xingbie-se-2: var(--xingbie-nv-2);
  --xingbie-se-wenben: var(--xingbie-nv-wenben);
}

.jindu-yuan-dian {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--jiange-12);
  padding: var(--jiange-xiao) 0 var(--jiange-zhong);
}

.jindu-dian {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  transition-property: transform, box-shadow;
  transition-duration: 0.35s;
  transition-timing-function: var(--quxian-biao-zhun);
  padding: 0;
}

.jindu-dian.huoyue {
  background: rgba(255, 255, 255, 0.7);
}

.jindu-dian.dangQian {
  background-color: var(--xingbie-se-2);
  box-shadow: 0 0 12px color-mix(in srgb, var(--xingbie-se-2) 55%, transparent);
  transform: scale(1.25);
}

.buzhou-guo-du-rong-qi {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 360px;
  overflow: hidden;
  box-sizing: border-box;
}

.buzuo-neirong {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.buZuo3-gundong {
  overflow-y: auto;
  padding-inline: var(--jiange-4);
  overscroll-behavior: contain;
}


.buZuo3-gundong::-webkit-scrollbar {
  width: 4px;
}

.buZuo3-gundong::-webkit-scrollbar-track {
  background: transparent;
}

.buZuo3-gundong::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
}

.buZuo-biaoti {
  font-size: 22px;
  font-weight: 700;
  color: #f2f0fa;
  text-align: center;
  margin-bottom: var(--jiange-4);
  letter-spacing: 0.04em;
}

.mbti-wangGe {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--jiange-xiao);
  width: 100%;
  margin-bottom: var(--jiange-zhong);
}

.mbti-kaPian {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-2);
  padding: var(--jiange-10) var(--jiange-6) var(--jiange-xiao);
  background-color: var(--ziliao-kuai-beijing);
  border: 1px solid var(--ziliao-kuai-biankuang);
  border-radius: 12px;
  color: var(--kapian-shuoming-wenben);
  cursor: pointer;
  transition-property: border-color, box-shadow, transform, color;
  transition-duration: 0.25s;
  transition-timing-function: ease;
  text-align: center;
  min-height: 80px;
  position: relative;
  -webkit-user-select: none;
  user-select: none;
}

.mbti-kaPian::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: var(--xingge-wai-guang);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.mbti-kaPian::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--xingge-liu-guang-yan);
  border-radius: inherit;
  opacity: 0;
  transition:
    opacity 0.4s ease,
    border-color 0.4s ease;
  pointer-events: none;
}

@supports ((-webkit-mask-composite: xor) or (mask-composite: exclude)) {
  .mbti-kaPian::after {
    padding: var(--jiange-2);
    border-width: 0;
    background:
      radial-gradient(ellipse, var(--xingge-liu-guang-yan), transparent 68%),
      radial-gradient(ellipse, var(--xingge-liu-guang-di), transparent 72%),
      radial-gradient(ellipse, var(--xingge-liu-guang-yan), transparent 64%),
      radial-gradient(ellipse, var(--xingge-liu-guang-di), transparent 70%),
      linear-gradient(var(--xingge-liu-guang-di), var(--xingge-liu-guang-di));
    background-position:
      0% 0%,
      100% 0%,
      0% 100%,
      100% 100%,
      center;
    background-size:
      70% 45%,
      60% 55%,
      65% 50%,
      55% 65%,
      100% 100%;
    background-repeat: no-repeat;
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
  }
}

@media (hover: hover) {
  .mbti-kaPian:hover:not(.beiXuanZhong) {
    border-color: var(--xingge-gao-guang-bian-ji);
    transform: translateY(-1px);
  }

  .mbti-kaPian:hover:not(.beiXuanZhong)::before {
    --xingge-wai-guang: var(--xingge-wai-guang-xuanguo);
    animation: xingge-xintiao var(--xingge-xintiao-zhouqi-xuanguo) ease-in-out infinite;
  }

  .mbti-kaPian:hover:not(.beiXuanZhong)::after {
    opacity: 0.55;
    animation:
      xingge-xintiao var(--xingge-xintiao-zhouqi-xuanguo) ease-in-out infinite,
      xingge-liu-guang-piao var(--xingge-piao-zhouqi) ease-in-out infinite alternate;
  }
}

.mbti-kaPian:focus-visible {
  outline: none;
  border-color: var(--xingge-gao-guang-bian-zhong);
}

.mbti-kaPian:focus-visible:not(.beiXuanZhong)::before {
  --xingge-wai-guang: var(--xingge-wai-guang-xuanguo);
  animation: xingge-xintiao var(--xingge-xintiao-zhouqi-xuanguo) ease-in-out infinite;
}

.mbti-kaPian:focus-visible::after {
  opacity: 0.55;
  animation:
    xingge-xintiao var(--xingge-xintiao-zhouqi-xuanguo) ease-in-out infinite,
    xingge-liu-guang-piao var(--xingge-piao-zhouqi) ease-in-out infinite alternate;
}

.mbti-kaPian.beiXuanZhong {
  --xingge-huxi-an: var(--xingge-huxi-an-xuan);
  border: 1px solid var(--xingge-gao-guang-bian-zhong);
}

.mbti-kaPian.beiXuanZhong::before {
  animation: xingge-xintiao var(--xingge-xintiao-zhouqi-xuanzhong) ease-in-out infinite;
}

.mbti-kaPian.beiXuanZhong::after {
  opacity: 1;
  animation:
    xingge-xintiao var(--xingge-xintiao-zhouqi-xuanzhong) ease-in-out infinite,
    xingge-liu-guang-piao var(--xingge-piao-zhouqi) ease-in-out infinite alternate;
}

.mbti-kaPian.suiJi-kaPian {
  grid-column: 1 / -1;
  justify-self: center;
  width: calc((100% - 3 * var(--jiange-xiao)) / 4);
}

.mbti-daiMa {
  font-size: 14px;
  font-weight: 800;
  color: var(--wenben-zhuse);
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.mbti-zhongWen {
  font-size: 11px;
  font-weight: 600;
  color: var(--ziliao-tishi-wenben);
  line-height: 1.2;
}

.mbti-miaoShu {
  font-size: 9px;
  color: var(--kapian-shuoming-wenben);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.zhaNv-gouxuan {
  color: var(--ziliao-miaoshu-wenben);
}

.zhaNv-tishi {
  font-size: 11px;
  color: var(--ziliao-tishi-wenben);
  text-align: center;
  margin-top: calc(var(--jiange-xiao) * -1);
  margin-bottom: var(--jiange-4);
  transition:
    color 0.3s ease,
    text-shadow 0.3s ease;
}

.zhaNv-tishi-huaxian {
  color: var(--ziliao-huaxian-wenben);
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}

.suiji-xingge-tishi,
.yixuan-jiangu-tishi {
  font-size: 11px;
  color: var(--ziliao-tishi-wenben);
  text-align: center;
  margin: 0 0 var(--jiange-4);
  line-height: 1.5;
}

.xinmuzhong-ta-qukuai {
  width: 100%;
  margin-top: var(--jiange-4);
  padding: var(--jiange-12) calc(var(--jiange-12) + var(--jiange-2));
  background: var(--xinmuzhong-qukuai-beijing);
  border: 1px solid var(--xinmuzhong-qukuai-biankuang);
  border-radius: 14px;
}

.xinmuzhong-ta-kaiguan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.xinmuzhong-ta-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: var(--xinmuzhong-duibi-se);
  letter-spacing: 0.5px;
}

.xinmuzhong-ta-zhuangtai {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: var(--xinmuzhong-duibi-se);
  transition: transform 0.25s ease;
}

@media (hover: hover) {
  .xinmuzhong-ta-kaiguan:hover .xinmuzhong-ta-zhuangtai {
    transform: translateX(2px);
  }
}

.xinmuzhong-ta-tishi {
  margin: var(--jiange-6) 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--ziliao-tishi-wenben);
  text-align: left;
}

.xinmuzhong-ta-biaodan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  margin-top: var(--jiange-12);
}

.xinmuzhong-xiangmu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  text-align: left;
}

.xinmuzhong-biaoqian {
  font-size: 11px;
  font-weight: 600;
  color: var(--ziliao-miaoshu-wenben);
}

.caoZuo-anNiu {
  display: flex;
  gap: var(--jiange-12);
  justify-content: center;
  padding-top: var(--jiange-xiao);
  flex-shrink: 0;
}

.anniu-fuZhu {
  padding: var(--jiange-13) calc(var(--jiange-da) + var(--jiange-4));
  background: transparent;
  color: var(--ziliao-miaoshu-wenben);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition-property: color, border-color, transform;
  transition-duration: 0.3s;
  transition-timing-function: ease;
}

@media (hover: hover) {
  .anniu-fuZhu:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #f2f0fa;
    border-color: rgba(255, 255, 255, 0.3);
  }
}


.anniu-zhuYao {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--jiange-12) + var(--jiange-2)) calc(var(--jiange-da) + var(--jiange-4));
  background: linear-gradient(135deg, var(--xingbie-se-1), var(--xingbie-se-2));
  color: var(--xingbie-se-wenben);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition-property: transform, box-shadow, opacity;
  transition-duration: 0.35s;
  transition-timing-function: var(--quxian-biao-zhun);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8px 24px color-mix(in srgb, var(--xingbie-se-2) 38%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.anniu-zhuYao::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  transition: left 0.5s ease;
}

@media (hover: hover) {
  .anniu-zhuYao:hover:not(:disabled)::before {
    left: 100%;
  }

  .anniu-zhuYao:hover:not(:disabled) {
    box-shadow:
      0 12px 30px color-mix(in srgb, var(--xingbie-se-2) 50%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.35);
    transform: translateY(-2px);
  }
}

.anniu-zhuYao:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    0 4px 12px color-mix(in srgb, var(--xingbie-se-2) 32%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.anniu-zhuYao:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.kaiShiLiaoTian {
  flex: 1;
  max-width: 280px;
}


:root[data-theme='light'] .jindu-dian:not(.dangQian) {
  background: rgba(55, 42, 63, 0.16);
}

:root[data-theme='light'] .jindu-dian.huoyue:not(.dangQian) {
  background: rgba(55, 42, 63, 0.5);
}


:root[data-theme='light'] .buZuo-biaoti {
  color: #372a3f;
}

:root[data-theme='light'] .ziliao-kapian {
  --ziliao-miaoshu-wenben: rgba(55, 42, 63, 0.86);
  --ziliao-tishi-wenben: rgba(55, 42, 63, 0.78);
  --ziliao-huaxian-wenben: rgba(55, 42, 63, 0.78);
}

:root[data-theme='light'] .mbti-daiMa {
  color: var(--wenben-zhuse);
}

:root[data-theme='light'] .anniu-fuZhu {
  border-color: rgba(55, 42, 63, 0.2);
}

@media (hover: hover) {
  :root[data-theme='light'] .anniu-fuZhu:hover {
    background: rgba(55, 42, 63, 0.06);
    color: #372a3f;
    border-color: rgba(55, 42, 63, 0.4);
  }
}


:root[data-theme='light'] .buZuo3-gundong::-webkit-scrollbar-thumb {
  background: rgba(120, 90, 140, 0.35);
}

@media (max-height: 560px) {
  .ziliao-shezhi {
    padding-block: var(--jiange-xiao);
  }

  .ziliao-kapian {
    gap: var(--jiange-xiao);
    padding: var(--jiange-12);
    border-radius: 14px;
  }

  .jindu-yuan-dian {
    padding: 0 0 var(--jiange-xiao);
  }

  .buzhou-guo-du-rong-qi {
    min-height: 248px;
  }

  .buZuo-biaoti {
    font-size: 20px;
  }

  .caoZuo-anNiu {
    padding-top: var(--jiange-4);
  }

  .anniu-fuZhu,
  .anniu-zhuYao {
    padding: var(--jiange-10) var(--jiange-zhong);
  }
}

@media (max-width: 480px) {
  .mbti-wangGe {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--jiange-6);
  }

  .mbti-kaPian {
    padding: var(--jiange-xiao) var(--jiange-4) var(--jiange-6);
    min-height: 70px;
  }

  .mbti-kaPian.suiJi-kaPian {
    width: calc((100% - 2 * var(--jiange-6)) / 3);
  }

  .mbti-daiMa {
    font-size: 12px;
  }

  .mbti-zhongWen {
    font-size: 10px;
  }

  .mbti-miaoShu {
    font-size: 8px;
    -webkit-line-clamp: 1;
  }

  .caoZuo-anNiu {
    flex-direction: column-reverse;
  }

  .anniu-fuZhu,
  .anniu-zhuYao {
    width: 100%;
  }
}

@keyframes xingge-xintiao {
  0%,
  100% {
    opacity: var(--xingge-huxi-an);
  }
  33.333%,
  66.667% {
    opacity: var(--xingge-huxi-liang);
  }
}

@keyframes xingge-liu-guang-piao {
  from {
    background-position:
      0% 0%,
      100% 0%,
      0% 100%,
      100% 100%;
    border-color: var(--xingge-liu-guang-di);
  }
  to {
    background-position:
      18% 12%,
      82% 18%,
      12% 82%,
      88% 88%;
    border-color: var(--xingge-liu-guang-yan);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mbti-kaPian,
  .anniu-zhuYao,
  .anniu-fuZhu,
  .jindu-dian {
    transition: none !important;
  }

  .mbti-kaPian::before {
    transition: none !important;
    animation: none !important;
  }

  .mbti-kaPian:hover:not(.beiXuanZhong)::before,
  .mbti-kaPian:focus-visible:not(.beiXuanZhong)::before {
    opacity: var(--xingge-huxi-an);
  }

  .mbti-kaPian.beiXuanZhong::before {
    opacity: var(--xingge-huxi-an-xuan);
  }

  .mbti-kaPian::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
