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
                data-xuan-xing-bie="nan"
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
                data-xuan-xing-bie="nv"
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
                data-xuan-xing-bie="nan"
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
                data-xuan-xing-bie="nv"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用用户仓库 } from '@/stores/用户'
import type { MBTI类型, 性格选择 } from '@/types/类型定义'
import { 性格选择映射 } from '@/types/类型定义'
import { huoQuFanYi } from '@/config/翻译表'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import XingBieGouXuan from '@/components/表单/性别勾选框.vue'
import { congTongYongTiShiCiTuiCeXingGe } from '@/utils/通用提示词性格'
import { 解析主色档, 解析性别, 解析性别配色档 } from '@/utils/性别'
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

onMounted(async () => {
  await 用户仓库.queBaoShenFenJiuXu()
  const buZhouYiCun = 仓库.ziLiaoDangQianBuZhou !== 1
  const youCaoGao = !!ziLiaoShuJu.xingBie || !!ziLiaoShuJu.muBiaoXingBie || !!ziLiaoShuJu.xingGeXuanZe
  if (buZhouYiCun || youCaoGao) return
  const moRen = 用户仓库.dangQianYongHu?.mo_ren_xing_bie
  const moRenNei = 解析性别(moRen)
  if (moRenNei && !ziLiaoShuJu.xingBie) {
    ziLiaoShuJu.xingBie = moRenNei === 'nan' ? 'male' : 'female'
  }
  const muBiaoMoRen = 用户仓库.dangQianYongHu?.mu_biao_xing_bie
  if (muBiaoMoRen && !ziLiaoShuJu.muBiaoXingBie) {
    const guiYiHou = 解析性别(muBiaoMoRen)
    if (guiYiHou === 'nan') ziLiaoShuJu.muBiaoXingBie = 'male'
    if (guiYiHou === 'nv') ziLiaoShuJu.muBiaoXingBie = 'female'
  }
  const ziShenYiShe = 解析性别(moRen) !== null
  const duiXiangYiShe = 解析性别(muBiaoMoRen) !== null
  if (ziShenYiShe && duiXiangYiShe) 当前步骤.value = 3
  else if (ziShenYiShe) 当前步骤.value = 2
  else 当前步骤.value = 1
})

const 步骤过渡名称 = computed(() =>
  步骤方向.value === 'qian' ? 'buZhou-qianJin' : 'buZhou-houTui',
)

const 默认性别 = computed(() => 用户仓库.dangQianYongHu?.mo_ren_xing_bie ?? null)
const 默认对象性别 = computed(() => 用户仓库.dangQianYongHu?.mu_biao_xing_bie ?? null)
const 主色档 = computed(() => 解析主色档(ziLiaoShuJu.xingBie, 默认性别.value))
const 对象色档 = computed(() => 解析性别配色档(ziLiaoShuJu.muBiaoXingBie ?? 默认对象性别.value))
const 对象勾选档 = computed<'nan' | 'nv'>(() => (对象色档.value === 'nan' ? 'nan' : 'nv'))

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
  padding: 0 calc(var(--jiange-zhong) + var(--jiange-4));
}


.ziliao-kapian {
  background: rgba(15, 17, 38, 0.62);
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(4, 6, 20, 0.55);
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  pointer-events: none;
}

.ziliao-kapian {
  --xingge-gao-guang-ji: rgba(255, 255, 255, 0.06);
  --xingge-gao-guang-zhong: rgba(255, 255, 255, 0.14);
  --xingge-gao-guang-bian-ji: rgba(255, 255, 255, 0.18);
  --xingge-gao-guang-bian-zhong: rgba(255, 255, 255, 0.4);
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

.buZuo-miaoShu {
  font-size: 13px;
  color: rgba(242, 240, 250, 0.52);
  text-align: center;
  margin-bottom: calc(var(--jiange-zhong) + var(--jiange-4));
}

.xingBie-wangGe {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--jiange-12) + var(--jiange-2));
  justify-content: center;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.xingBie-kaPian {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-10);
  padding: var(--jiange-da) var(--jiange-zhong) calc(var(--jiange-zhong) + var(--jiange-6));
  background-color: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  color: var(--kapian-shuoming-wenben);
  cursor: pointer;
  transition-property: border-color, box-shadow, transform, color;
  transition-duration: 0.3s;
  transition-timing-function: var(--quxian-biao-zhun);
  min-width: 0;
  -webkit-user-select: none;
  user-select: none;
}

@media (hover: hover) {
  .xingBie-kaPian:hover:not(.beiXuanZhong) {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--qiangdiao-fen) 45%, transparent);
  }
}

.ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie='nan'] {
  background-color: var(--xingbie-nan-tan-beijing);
  border: 2px solid var(--xingbie-nan-shen-biankuang);
  box-shadow: 0 0 0 3px var(--xingbie-nan-xuan-huan);
  color: var(--xingbie-nan-tan-wenben);
}

.ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie='nv'] {
  background-color: var(--xingbie-nv-tan-beijing);
  border: 2px solid var(--xingbie-nv-shen-biankuang);
  box-shadow: 0 0 0 3px var(--xingbie-nv-xuan-huan);
  color: var(--xingbie-nv-tan-wenben);
}

.xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie='nan'] .xingBie-mingCheng,
.xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie='nan'] .xingBie-svg {
  color: var(--xingbie-nan-tan-wenben);
  text-shadow: none;
}

.xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie='nv'] .xingBie-mingCheng,
.xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie='nv'] .xingBie-svg {
  color: var(--xingbie-nv-tan-wenben);
  text-shadow: none;
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

.xingBie-mingCheng {
  font-size: 17px;
  font-weight: 700;
  color: var(--kapian-shuoming-wenben);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
}

.mbti-wangGe {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--jiange-xiao);
  width: 100%;
  margin-bottom: var(--jiange-zhong);
}

.mbti-kaPian {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-2);
  padding: var(--jiange-10) var(--jiange-6) var(--jiange-xiao);
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--kapian-shuoming-wenben);
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
  .mbti-kaPian:hover:not(.beiXuanZhong) {
    background-image: linear-gradient(0deg, var(--xingge-gao-guang-ji), var(--xingge-gao-guang-ji));
    border-color: var(--xingge-gao-guang-bian-ji);
    transform: translateY(-1px);
  }
}

.mbti-kaPian.beiXuanZhong {
  background-image: linear-gradient(0deg, var(--xingge-gao-guang-zhong), var(--xingge-gao-guang-zhong));
  border: 1.5px solid var(--xingge-gao-guang-bian-zhong);
  box-shadow: none;
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

.suiJi-kaPian {
  --suiJi-wen: var(--wenben-zhuse);
  border-color: var(--xingge-gao-guang-bian-ji);
  border-style: dashed;
}

@media (hover: hover) {
  .suiJi-kaPian:hover:not(.beiXuanZhong) {
    background-image: linear-gradient(0deg, var(--xingge-gao-guang-ji), var(--xingge-gao-guang-ji));
    border-color: var(--xingge-gao-guang-bian-ji);
  }
}

.suiJi-kaPian.beiXuanZhong {
  background-image: linear-gradient(0deg, var(--xingge-gao-guang-zhong), var(--xingge-gao-guang-zhong));
  border-color: var(--xingge-gao-guang-bian-zhong);
  border-style: solid;
}

.suiJi-kaPian.beiXuanZhong .mbti-zhongWen {
  color: var(--suiJi-wen);
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
  color: var(--kapian-shuoming-wenben);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.zhaNv-gouxuan {
  color: rgba(255, 255, 255, 0.8);
}

.zhaNv-tishi {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  margin-top: calc(var(--jiange-xiao) * -1);
  margin-bottom: var(--jiange-4);
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
  color: rgba(255, 255, 255, 0.4);
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
  color: rgba(255, 255, 255, 0.6);
}

:root[data-theme='light'] .xinmuzhong-ta-tishi {
  color: rgba(0, 0, 0, 0.5);
}

:root[data-theme='light'] .xinmuzhong-biaoqian {
  color: rgba(0, 0, 0, 0.6);
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


:root[data-theme='light'] .ziliao-kapian {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(70, 50, 110, 0.22);
}

:root[data-theme='light'] .ziliao-kapian::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent);
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

:root[data-theme='light'] .buZuo-miaoShu {
  color: rgba(55, 42, 63, 0.6);
}


:root[data-theme='light'] .xingBie-kaPian {
  background: rgba(244, 238, 248, 0.6);
  border-color: rgba(120, 90, 140, 0.14);
}

:root[data-theme='light'] .mbti-kaPian {
  background: rgba(244, 238, 248, 0.6);
  border-color: rgba(120, 90, 140, 0.13);
}

@media (hover: hover) {
  :root[data-theme='light'] .mbti-kaPian:hover:not(.beiXuanZhong) {
    border-color: var(--xingge-gao-guang-bian-ji);
  }
}

:root[data-theme='light'] .ziliao-kapian {
  --xingge-gao-guang-ji: rgba(255, 255, 255, 0.55);
  --xingge-gao-guang-zhong: rgba(255, 255, 255, 0.92);
  --xingge-gao-guang-bian-ji: rgba(120, 90, 140, 0.2);
  --xingge-gao-guang-bian-zhong: rgba(90, 60, 110, 0.42);
}

:root[data-theme='light'] .mbti-kaPian.beiXuanZhong .mbti-zhongWen {
  color: var(--wenben-zhuse);
}

:root[data-theme='light'] .suiJi-kaPian.beiXuanZhong .mbti-zhongWen {
  color: var(--suiJi-wen);
}

:root[data-theme='light'] .mbti-daiMa {
  color: var(--wenben-zhuse);
}

:root[data-theme='light'] .mbti-zhongWen {
  color: var(--wenben-ciuse);
}

:root[data-theme='light'] .zhaNv-gouxuan {
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
    gap: var(--jiange-6);
  }

  .mbti-kaPian {
    padding: var(--jiange-xiao) var(--jiange-4) var(--jiange-6);
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
