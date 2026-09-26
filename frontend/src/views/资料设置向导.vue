<template>
  <div class="ziliao-shezhi">
    <div class="ziliao-kapian" :data-xingbie="主色档">
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
          <div v-if="当前步骤 === 1" key="b1" class="buzuo-neirong">
            <h2 class="buZuo-biaoti">{{ huoQuFanYi('ziLiaoSheZhi', 'buZhou1BiaoTi') }}</h2>
            <p class="buZuo-miaoShu">{{ huoQuFanYi('ziLiaoSheZhi', 'buZhou1MiaoShu') }}</p>
            <div class="xingBie-wangGe">
              <button
                class="xingBie-kaPian ziJi-xingBie-kaPian"
                data-dang="nan"
                :class="{ beiXuanZhong: ziLiaoShuJu.xingBie === 'male' }"
                @click="ziLiaoShuJu.xingBie = 'male'"
              >
                <div class="xingBie-tubiao ziJi-nan-tubiao">
                  <svg viewBox="0 0 64 64" class="xingBie-svg" aria-hidden="true">
                    <circle
                      cx="28"
                      cy="36"
                      r="14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M38 26 L54 10"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M44 10 H54 V20"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <span class="xingBie-mingCheng">{{
                  huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')
                }}</span>
              </button>
              <button
                class="xingBie-kaPian ziJi-xingBie-kaPian"
                data-dang="nv"
                :class="{ beiXuanZhong: ziLiaoShuJu.xingBie === 'female' }"
                @click="ziLiaoShuJu.xingBie = 'female'"
              >
                <div class="xingBie-tubiao ziJi-nv-tubiao">
                  <svg viewBox="0 0 64 64" class="xingBie-svg" aria-hidden="true">
                    <circle
                      cx="32"
                      cy="22"
                      r="14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M32 36 V56"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M22 47 H42"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
                <span class="xingBie-mingCheng">{{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}</span>
              </button>
            </div>
          </div>

          <div v-else-if="当前步骤 === 2" key="b2" class="buzuo-neirong">
            <h2 class="buZuo-biaoti">{{ huoQuFanYi('ziLiaoSheZhi', 'buZhou2BiaoTi') }}</h2>
            <p class="buZuo-miaoShu">{{ huoQuFanYi('ziLiaoSheZhi', 'buZhou2MiaoShu') }}</p>
            <div class="xingBie-wangGe">
              <button
                class="xingBie-kaPian duiXiang-xingBie-kaPian"
                data-dang="nan"
                :class="{ beiXuanZhong: ziLiaoShuJu.muBiaoXingBie === 'male' }"
                @click="ziLiaoShuJu.muBiaoXingBie = 'male'"
              >
                <div class="xingBie-tubiao duiXiang-nan-tubiao">
                  <svg viewBox="0 0 64 64" class="xingBie-svg">
                    <circle
                      cx="32"
                      cy="22"
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <path
                      d="M18 58 C18 42 46 42 46 58"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <circle cx="28" cy="20" r="1.5" fill="currentColor" />
                    <circle cx="36" cy="20" r="1.5" fill="currentColor" />
                    <path
                      d="M28 26 Q32 29 36 26"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                  </svg>
                </div>
                <span class="xingBie-mingCheng">{{
                  huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')
                }}</span>
              </button>
              <button
                class="xingBie-kaPian duiXiang-xingBie-kaPian"
                data-dang="nv"
                :class="{ beiXuanZhong: ziLiaoShuJu.muBiaoXingBie === 'female' }"
                @click="ziLiaoShuJu.muBiaoXingBie = 'female'"
              >
                <div class="xingBie-tubiao duiXiang-nv-tubiao">
                  <svg viewBox="0 0 64 64" class="xingBie-svg">
                    <circle
                      cx="32"
                      cy="22"
                      r="12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <path
                      d="M18 58 C18 42 46 42 46 58"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <path
                      d="M24 16 Q28 8 32 12 Q36 8 40 16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    />
                    <circle cx="28" cy="20" r="1.5" fill="currentColor" />
                    <circle cx="36" cy="20" r="1.5" fill="currentColor" />
                    <path
                      d="M29 25 Q32 28 35 25"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                  </svg>
                </div>
                <span class="xingBie-mingCheng">{{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}</span>
              </button>
            </div>
          </div>

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
                <span class="mbti-daiMa">&#127922;</span>
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

            <label class="zhaNv-gouxuan">
              <input
                v-model="ziLiaoShuJu.yunXuZhaNanZhaNv"
                type="checkbox"
                class="zhaXing-gouxuan"
                :data-xingbie="选中框配色档"
              />
              <span>{{ 渣型文案 }}</span>
            </label>
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
                  <input
                    v-model="ziLiaoShuJu.xinMuZhongDeTa.weiXinMing"
                    type="text"
                    class="xinmuzhong-shurukuang"
                    maxlength="30"
                    :placeholder="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongWeiXinMingZhanwei')"
                  />
                </label>
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongZhenShiMing')
                  }}</span>
                  <input
                    v-model="ziLiaoShuJu.xinMuZhongDeTa.zhenShiMing"
                    type="text"
                    class="xinmuzhong-shurukuang"
                    maxlength="20"
                    :placeholder="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongZhenShiMingZhanwei')"
                  />
                </label>
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLing')
                  }}</span>
                  <input
                    v-model="ziLiaoShuJu.xinMuZhongDeTa.nianLing"
                    type="number"
                    :step="1"
                    class="xinmuzhong-shurukuang"
                    :placeholder="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongNianLingZhanwei')"
                    @blur="guiYiNianLingShuRu"
                  />
                </label>
                <label class="xinmuzhong-xiangmu">
                  <span class="xinmuzhong-biaoqian">{{
                    huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCi')
                  }}</span>
                  <textarea
                    v-model="ziLiaoShuJu.xinMuZhongDeTa.tongYongTiShiCi"
                    class="xinmuzhong-shurukuang xinmuzhong-wenbenyu"
                    maxlength="500"
                    rows="3"
                    :placeholder="huoQuFanYi('ziLiaoSheZhi', 'xinMuZhongTongYongTiShiCiZhanwei')"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用用户仓库 } from '@/stores/用户'
import type { MBTI类型, 性格选择 } from '@/types'
import { 性格选择映射 } from '@/types'
import { huoQuFanYi } from '@/config/translations'
import { congTongYongTiShiCiTuiCeXingGe } from '@/utils/通用提示词性格'
import { 解析主色档, 解析选中框配色档 } from '@/utils/性别'
import { guiYiNianLing } from '@/utils/输入验证'
import { track } from '@/utils/埋点'

const 仓库 = 使用认证表单仓库()
const 用户仓库 = 使用用户仓库()
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

// 普通模式第一步（用户自身性别）默认预选「默认性别」系统设置；
// 仅当用户尚未手动选择时才填入，不覆盖进行中的选择。
onMounted(async () => {
  await 用户仓库.queBaoShenFenJiuXu()
  const moRen = 用户仓库.dangQianYongHu?.mo_ren_xing_bie
  if (moRen && !ziLiaoShuJu.xingBie) {
    ziLiaoShuJu.xingBie = moRen
  }
})

const 步骤过渡名称 = computed(() =>
  步骤方向.value === 'qian' ? 'buZhou-qianJin' : 'buZhou-houTui',
)

// 界面着色档位（需求 #16）：主按钮/进度圆点跟玩家自身性别，选中框（性别卡选中态 + 勾选框强调色）
// 跟对象性别；对象未选时取用户默认性别的反色，连默认性别也没有则粉框 + 蓝按钮兜底。
// 判定口径全部收在 utils/性别.ts 的解析口，组件不再自写二值比较。
const 默认性别 = computed(() => 用户仓库.dangQianYongHu?.mo_ren_xing_bie ?? null)
const 主色档 = computed(() => 解析主色档(ziLiaoShuJu.xingBie, 默认性别.value))
const 选中框配色档 = computed(() =>
  解析选中框配色档(ziLiaoShuJu.muBiaoXingBie, 默认性别.value),
)

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
  ziLiaoShuJu.muBiaoXingBie === 'male'
    ? huoQuFanYi('ziLiaoSheZhi', 'zhaNanBianTi')
    : huoQuFanYi('ziLiaoSheZhi', 'zhaNvBianTi'),
)

const 渣型提示文案 = computed(() => {
  const daiTi =
    ziLiaoShuJu.muBiaoXingBie === 'male'
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
  padding: 0 20px;
}

/* 星夜琉璃 · Starlit Glass：精工玻璃 + 顶部棱线高光 + 玫瑰金点缀 */
.ziliao-kapian {
  background: rgba(15, 17, 38, 0.62);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(4, 6, 20, 0.55);
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  overflow: hidden;
}

/* 顶部棱线高光（宝石切面感） */
.ziliao-kapian::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  pointer-events: none;
}

/* 性别配色单源：未选 → 中性，男 → 蓝，女 → 粉。档位由 utils/性别.ts 的权威口径写成 data-xingbie，
   本文件只做「档位 → 令牌」映射，不再出现任何自造的粉/蓝色值 */
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
  gap: 12px;
  padding: 8px 0 16px;
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
  padding-right: 4px;
  overscroll-behavior: contain;
}

/* FP-20 保留特例：步骤三滚动区需要 4px 极窄条+透明轨道+半透明白滑块（global 为 8px+半透明灰轨道+不透明灰滑块），且浅色档另有手写滑块覆盖，删任一处都改变既有视觉，整块保留 */
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
  margin-bottom: 4px;
  letter-spacing: 0.04em;
}

.buZuo-miaoShu {
  font-size: 13px;
  color: rgba(242, 240, 250, 0.52);
  text-align: center;
  margin-bottom: 20px;
}

.xingBie-wangGe {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

/* 选中框三件套 + 环两层按卡片**自身性别档**取 --xingbie-*-xuan-*（需求 #16：男→蓝、女→粉）。
   规则一律带 .ziliao-kapian 前缀抬到 (0,4,0)：浅色档的静置边是 :root[data-theme] + 类 = (0,3,0)，
   不带前缀就会被它压住（= 改前"选中框只能两性统一写死成粉"的成因，R1 主题倒置的实例） */
.xingBie-kaPian {
  --xuan-bian: var(--xingbie-zhongxing-xuan-biankuang);
  --xuan-bei: var(--xingbie-zhongxing-xuan-beijing);
  --xuan-wen: var(--xingbie-zhongxing-xuan-wenben);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px 22px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  cursor: pointer;
  transition-property: border-color, box-shadow, transform, color;
  transition-duration: 0.3s;
  transition-timing-function: var(--quxian-biao-zhun);
  min-width: 0;
  -webkit-user-select: none;
  user-select: none;
}

.xingBie-kaPian[data-dang='nan'] {
  --xuan-bian: var(--xingbie-nan-xuan-biankuang);
  --xuan-bei: var(--xingbie-nan-xuan-beijing);
  --xuan-wen: var(--xingbie-nan-xuan-wenben);
}

.xingBie-kaPian[data-dang='nv'] {
  --xuan-bian: var(--xingbie-nv-xuan-biankuang);
  --xuan-bei: var(--xingbie-nv-xuan-beijing);
  --xuan-wen: var(--xingbie-nv-xuan-wenben);
}

@media (hover: hover) {
  .xingBie-kaPian:hover {
    transform: translateY(-2px);
  }

  /* 悬停边线同样按卡片性别档淡出（改前两性统一写死 rgba(217, 140, 166, 0.45)） */
  .ziliao-kapian .xingBie-kaPian:hover[data-dang] {
    border-color: color-mix(in srgb, var(--xuan-bian) 45%, transparent);
  }
}

.ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-dang] {
  border-width: 1.5px;
  border-color: var(--xuan-bian);
  background-color: var(--xuan-bei);
  color: var(--xuan-wen);
}

.ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-dang='nan'] {
  box-shadow:
    0 0 0 3px var(--xingbie-nan-xuan-huan),
    0 10px 26px var(--xingbie-nan-xuan-guangyun);
}

.ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-dang='nv'] {
  box-shadow:
    0 0 0 3px var(--xingbie-nv-xuan-huan),
    0 10px 26px var(--xingbie-nv-xuan-guangyun);
}

.xingBie-tubiao {
  font-size: 42px;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(255, 255, 255, 0.15));
}

.xingBie-svg {
  width: 64px;
  height: 64px;
}

.ziJi-xingBie-kaPian .xingBie-svg,
.duiXiang-xingBie-kaPian .xingBie-svg {
  stroke-width: 2.2;
}

.ziJi-nan-tubiao .xingBie-svg,
.duiXiang-nan-tubiao .xingBie-svg {
  color: color-mix(in srgb, var(--xingbie-nan-1) 92%, transparent);
}

.ziJi-nv-tubiao .xingBie-svg,
.duiXiang-nv-tubiao .xingBie-svg {
  color: color-mix(in srgb, var(--xingbie-nv-1) 92%, transparent);
}

/* 选中态图标吃本卡性别档的三件套文字色（改前深档 #9ecbff/#ffb1cc、浅档 #2f6bb0/#c4577e 四处各写一份） */
.ziJi-xingBie-kaPian.beiXuanZhong .ziJi-nan-tubiao .xingBie-svg,
.duiXiang-xingBie-kaPian.beiXuanZhong .duiXiang-nan-tubiao .xingBie-svg {
  color: var(--xuan-wen);
}

.ziJi-xingBie-kaPian.beiXuanZhong .ziJi-nv-tubiao .xingBie-svg,
.duiXiang-xingBie-kaPian.beiXuanZhong .duiXiang-nv-tubiao .xingBie-svg {
  color: var(--xuan-wen);
}

.duiXiang-xingBie-kaPian .xingBie-svg {
  stroke-width: 2;
  color: rgba(180, 200, 235, 0.9);
}

.duiXiang-xingBie-kaPian.beiXuanZhong .xingBie-svg {
  color: #ffffff;
}

.xingBie-mingCheng {
  font-size: 17px;
  font-weight: 700;
  color: #f2f0fa;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
}

/* 选中卡换了染色底，名称文字必须同时吃到本档的三件套文字色，
   否则浅档的 #372a3f / 深档的 #f2f0fa 压在染色底上都会糊掉 */
.xingBie-kaPian.beiXuanZhong[data-dang] .xingBie-mingCheng {
  color: var(--xuan-wen);
}

.mbti-wangGe {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
  margin-bottom: 16px;
}

.mbti-kaPian {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 6px 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition-property: border-color, box-shadow, transform, color;
  transition-duration: 0.25s;
  transition-timing-function: ease;
  text-align: center;
  min-height: 80px;
  -webkit-user-select: none;
  user-select: none;
}

@media (hover: hover) {
  .mbti-kaPian:hover {
    border-color: color-mix(in srgb, var(--qiangdiao-fen) 40%, transparent);
    transform: translateY(-1px);
  }
}

/* MBTI 卡不承担性别语义，静置/悬停边与选中边仍吃 --qiangdiao-fen（深浅两档成对）。
   选中态的**辉光与标题阴影**自 FP-29 起一律吃 --xuanzhong-*（整串令牌，组件不再补数字）：
   改前这里是"深色档看不见"的真身——近黑 text-shadow 压在深卡面上与底色同明度，
   而浅色档另写一份 .mbti-zhongWen{text-shadow:none}，两档各缺一半 ⇒ 选中态只剩边框可读 */
.mbti-kaPian.beiXuanZhong {
  border: 1.5px solid color-mix(in srgb, var(--qiangdiao-fen) 75%, transparent);
  box-shadow: var(--xuanzhong-qiangdiao-yinying);
}

.mbti-kaPian.beiXuanZhong .mbti-daiMa {
  color: var(--wenben-zhuse);
  text-shadow: var(--xuanzhong-wenben-yinying);
}

.mbti-kaPian.beiXuanZhong .mbti-zhongWen {
  color: var(--wenben-zhuse);
  font-weight: 800;
  text-shadow: var(--xuanzhong-wenben-yinying);
}

.mbti-kaPian.beiXuanZhong .mbti-miaoShu {
  color: var(--wenben-ciuse);
}

.suiJi-kaPian {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 152, 0, 0.15));
  border-color: rgba(255, 193, 7, 0.35);
  border-style: dashed;
}

@media (hover: hover) {
  .suiJi-kaPian:hover {
    border-color: rgba(255, 193, 7, 0.55);
    box-shadow: 0 0 14px rgba(255, 193, 7, 0.2);
  }
}

.suiJi-kaPian.beiXuanZhong {
  border-color: rgba(255, 193, 7, 0.8);
  border-style: solid;
  box-shadow: var(--xuanzhong-qiangdiao-yinying);
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
  color: var(--wenben-ciuse);
  line-height: 1.2;
}

.mbti-miaoShu {
  font-size: 9px;
  color: var(--wenben-tishi);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.zhaNv-gouxuan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  cursor: pointer;
  width: 100%;
  justify-content: center;
}

.zhaNv-gouxuan input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--xingbie-zhongxing-xuan-biankuang);
  cursor: pointer;
  flex-shrink: 0;
}

/* 勾选框强调色 = 选中框边框色同源（需求 #16：对象男→蓝、女→粉；
   对象未选→用户默认性别反色；无默认性别→粉） */
.zhaNv-gouxuan input[type='checkbox'][data-xingbie='nan'] {
  accent-color: var(--xingbie-nan-xuan-biankuang);
}

.zhaNv-gouxuan input[type='checkbox'][data-xingbie='nv'] {
  accent-color: var(--xingbie-nv-xuan-biankuang);
}

.zhaNv-gouxuan span {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.zhaNv-tishi {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  margin-top: -8px;
  margin-bottom: 4px;
  transition:
    color 0.3s ease,
    text-shadow 0.3s ease;
}

.zhaNv-tishi-huaxian {
  color: rgba(255, 215, 0, 0.8);
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}

.suiji-xingge-tishi,
.yixuan-jiangu-tishi {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin: 0 0 4px;
  line-height: 1.5;
}

.xinmuzhong-ta-qukuai {
  width: 100%;
  margin-top: 4px;
  padding: 12px 14px;
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
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.4);
  text-align: left;
}

.xinmuzhong-ta-biaodan {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.xinmuzhong-xiangmu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.xinmuzhong-biaoqian {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.xinmuzhong-shurukuang {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  font-size: 13px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  transition-property: border-color;
  transition-duration: 0.25s;
  transition-timing-function: ease;
}

.xinmuzhong-shurukuang::placeholder {
  color: rgba(255, 255, 255, 0.28);
}

.xinmuzhong-shurukuang:focus {
  border-color: var(--jujiao-huan-yanse);
  background: rgba(255, 255, 255, 0.09);
}

.xinmuzhong-wenbenyu {
  min-height: 72px;
  resize: vertical;
  line-height: 1.5;
}

:root[data-theme='light'] .xinmuzhong-ta-tishi {
  color: rgba(0, 0, 0, 0.5);
}

:root[data-theme='light'] .xinmuzhong-biaoqian {
  color: rgba(0, 0, 0, 0.6);
}

:root[data-theme='light'] .xinmuzhong-shurukuang {
  color: #191919;
  background: #f7f7f7;
  border-color: #e5e5e5;
}

:root[data-theme='light'] .xinmuzhong-shurukuang::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

:root[data-theme='light'] .xinmuzhong-shurukuang:focus {
  border-color: var(--nuanhui-lan);
  background: #ffffff;
}

.caoZuo-anNiu {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 8px;
  flex-shrink: 0;
}

.anniu-fuZhu {
  padding: 13px 28px;
  background: transparent;
  color: rgba(242, 240, 250, 0.7);
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

/* 主按钮：底色跟随玩家性别档（蓝/粉/中性），色值全部来自 --xingbie-* 令牌 */
.anniu-zhuYao {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
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

.kaiShi-cuoWu-tishi {
  font-size: 13px;
  color: #ff6b6b;
  text-align: center;
  margin: 0;
  padding: 8px 12px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 10px;
}

/* ============ 浅色主题：星夜琉璃浅色档（云白玻璃 + 玫瑰金） ============ */
:root[data-theme='light'] .ziliao-kapian {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(70, 50, 110, 0.22);
}

:root[data-theme='light'] .ziliao-kapian::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent);
}

/* 浅色档只为「非当前」圆点铺灰底：当前档的底色归 .jindu-dian.dangQian 的性别令牌独占，
   否则 :root[data-theme] 前缀的特异度会盖过 (0,2,0) 的性别档，浅色下圆点就不跟性别走了 */
:root[data-theme='light'] .jindu-dian:not(.dangQian) {
  background: rgba(55, 42, 63, 0.16);
}

:root[data-theme='light'] .jindu-dian.huoyue:not(.dangQian) {
  background: rgba(55, 42, 63, 0.5);
}

/* 当前档圆点走 --xingbie-se-2；令牌本身已按深浅成对，浅色档不再覆写色值 */
:root[data-theme='light'] .buZuo-biaoti {
  color: #372a3f;
}

:root[data-theme='light'] .buZuo-miaoShu {
  color: rgba(55, 42, 63, 0.6);
}

/* 浅色档只留静置面/边；性别选中框的边框/底色/文字色与环两层由 --xingbie-*-xuan-* 成对令牌
   在两档各自取值，组件不再写第二份。
   改前此处有 6 条 :root[data-theme] 覆写，把男女统一钉成粉（浅档四处字面量 + 深档两处），
   正是 R1「主题机制倒置 + 组件零令牌」的实例 */
:root[data-theme='light'] .xingBie-kaPian {
  background: rgba(244, 238, 248, 0.6);
  border-color: rgba(120, 90, 140, 0.14);
}

:root[data-theme='light'] .xingBie-mingCheng {
  color: #372a3f;
}

:root[data-theme='light'] .mbti-kaPian {
  background: rgba(244, 238, 248, 0.6);
  border-color: rgba(120, 90, 140, 0.13);
}

@media (hover: hover) {
  :root[data-theme='light'] .mbti-kaPian:hover {
    border-color: color-mix(in srgb, var(--qiangdiao-fen) 45%, transparent);
  }
}

/* 浅色档此处必须留一条同特异度的覆写：静置边是 :root[data-theme] + 类 = (0,3,0)，
   不带前缀的深色档选中规则压不住它（改前同样是两条，只是值写死成字面量）。
   改前这里还重复写了一份 box-shadow、下面一条又写了 text-shadow:none ——
   两档成对令牌（--xuanzhong-*）落地后组件不再需要第二份，"浅色无阴影/深黑阴影看不见"即此残留 */
:root[data-theme='light'] .mbti-kaPian.beiXuanZhong {
  border-color: color-mix(in srgb, var(--qiangdiao-fen) 75%, transparent);
}

:root[data-theme='light'] .mbti-kaPian.beiXuanZhong .mbti-zhongWen {
  color: var(--wenben-zhuse);
}

:root[data-theme='light'] .mbti-daiMa {
  color: var(--wenben-zhuse);
}

:root[data-theme='light'] .mbti-zhongWen {
  color: var(--wenben-ciuse);
}

:root[data-theme='light'] .mbti-miaoShu {
  color: var(--wenben-tishi);
}

:root[data-theme='light'] .zhaNv-gouxuan span {
  color: rgba(55, 42, 63, 0.75);
}

:root[data-theme='light'] .zhaNv-tishi {
  color: rgba(55, 42, 63, 0.45);
}

:root[data-theme='light'] .suiji-xingge-tishi,
:root[data-theme='light'] .yixuan-jiangu-tishi {
  color: rgba(55, 42, 63, 0.55);
}

:root[data-theme='light'] .anniu-fuZhu {
  color: rgba(55, 42, 63, 0.7);
  border-color: rgba(55, 42, 63, 0.2);
}

@media (hover: hover) {
  :root[data-theme='light'] .anniu-fuZhu:hover {
    background: rgba(55, 42, 63, 0.06);
    color: #372a3f;
    border-color: rgba(55, 42, 63, 0.4);
  }
}

/* FP-20 保留特例：浅色档步骤区滑块手写覆盖，删则吃 global 档位色改变既有视觉 */
:root[data-theme='light'] .buZuo3-gundong::-webkit-scrollbar-thumb {
  background: rgba(120, 90, 140, 0.35);
}

.buZhou-qianJin-enter-active,
.buZhou-qianJin-leave-active,
.buZhou-houTui-enter-active,
.buZhou-houTui-leave-active {
  transition:
    transform 0.35s var(--quxian-biao-zhun),
    opacity 0.35s var(--quxian-biao-zhun);
}

.buZhou-qianJin-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.buZhou-qianJin-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.buZhou-qianJin-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.buZhou-qianJin-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.buZhou-houTui-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.buZhou-houTui-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.buZhou-houTui-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.buZhou-houTui-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 480px) {
  .mbti-wangGe {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .mbti-kaPian {
    padding: 8px 4px 6px;
    min-height: 70px;
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

@media (prefers-reduced-motion: reduce) {
  .buZhou-qianJin-enter-active,
  .buZhou-qianJin-leave-active,
  .buZhou-houTui-enter-active,
  .buZhou-houTui-leave-active,
  .mbti-kaPian,
  .xingBie-kaPian,
  .anniu-zhuYao,
  .anniu-fuZhu,
  .jindu-dian {
    transition: none !important;
  }
}
</style>
