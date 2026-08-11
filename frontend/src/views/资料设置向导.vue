<template>
  <div class="ziliao-shezhi">
    <div class="ziliao-kapian">
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
                :class="{ beiXuanZhong: ziLiaoShuJu.xingBie === 'male' }"
                @click="ziLiaoShuJu.xingBie = 'male'"
              >
                <div class="xingBie-tubiao ziJi-nan-tubiao">
                  <svg viewBox="0 0 64 64" class="xingBie-svg">
                    <circle
                      cx="32"
                      cy="24"
                      r="14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <line
                      x1="32"
                      y1="38"
                      x2="32"
                      y2="58"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <line
                      x1="22"
                      y1="48"
                      x2="42"
                      y2="48"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                  </svg>
                </div>
                <span class="xingBie-mingCheng">{{
                  huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')
                }}</span>
              </button>
              <button
                class="xingBie-kaPian ziJi-xingBie-kaPian"
                :class="{ beiXuanZhong: ziLiaoShuJu.xingBie === 'female' }"
                @click="ziLiaoShuJu.xingBie = 'female'"
              >
                <div class="xingBie-tubiao ziJi-nv-tubiao">
                  <svg viewBox="0 0 64 64" class="xingBie-svg">
                    <circle
                      cx="32"
                      cy="24"
                      r="14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <line
                      x1="32"
                      y1="38"
                      x2="32"
                      y2="52"
                      stroke="currentColor"
                      stroke-width="2.5"
                    />
                    <path
                      d="M24 46 L32 52 L40 46"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
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

            <label class="zhaNv-gouxuan">
              <input
                v-model="ziLiaoShuJu.yunXuZhaNanZhaNv"
                type="checkbox"
                class="zhaXing-gouxuan"
                :class="{ 'zhaNan-gouxuan': ziLiaoShuJu.muBiaoXingBie === 'male' }"
              />
              <span>{{ 渣型文案 }}</span>
            </label>
            <p v-show="ziLiaoShuJu.yunXuZhaNanZhaNv" class="zhaNv-tishi zhaNv-tishi-huaxian">
              {{ 渣型提示文案 }}
            </p>
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

function xuanZeXingGe(mbti: MBTI类型) {
  ziLiaoShuJu.xingGeXuanZe = mbti as 性格选择
  随机选中.value = false
  随机性格标记.value = false
}

function suiJiXuanZe() {
  const suiJiSuoyin = Math.floor(Math.random() * mbti列表.length)
  ziLiaoShuJu.xingGeXuanZe = mbti列表[suiJiSuoyin] as 性格选择
  随机选中.value = true
  随机性格标记.value = true
}

const 渣型文案 = computed(() =>
  ziLiaoShuJu.muBiaoXingBie === 'male'
    ? huoQuFanYi('ziLiaoSheZhi', 'zhaNanBianTi')
    : huoQuFanYi('ziLiaoSheZhi', 'zhaNvBianTi'),
)

const 渣型提示文案 = computed(() => {
  const daiTi = ziLiaoShuJu.muBiaoXingBie === 'male' ? '他' : '她'
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
  }
  sessionStorage.setItem('ziLiaoSheZhiLinShi', JSON.stringify(linShiZiLiao))
  仓库.sheZhiZiLiaoSheZhiYiWanCheng(true)
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

.ziliao-kapian {
  background: rgba(20, 24, 40, 0.6);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.jindu-dian.huoyue {
  background: rgba(255, 255, 255, 0.7);
}

.jindu-dian.dangQian {
  background: #ffffff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
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
  color: #ffffff;
  text-align: center;
  margin-bottom: 4px;
}

.buZuo-miaoShu {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-bottom: 20px;
}

.xingBie-wangGe {
  display: flex;
  gap: 16px;
  justify-content: center;
  width: 100%;
}

.xingBie-kaPian {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 36px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 120px;
}

.xingBie-kaPian:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.xingBie-kaPian.beiXuanZhong {
  background: linear-gradient(135deg, rgba(107, 140, 166, 0.3), rgba(196, 160, 176, 0.3));
  border-color: var(--nuanhui-lan);
  box-shadow: 0 0 20px rgba(107, 140, 166, 0.3);
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

.ziJi-xingBie-kaPian .xingBie-svg {
  stroke-width: 2;
  color: rgba(200, 210, 230, 0.85);
}

.ziJi-xingBie-kaPian.beiXuanZhong .xingBie-svg {
  color: #ffffff;
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
  color: #ffffff;
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
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: center;
  min-height: 80px;
}

.mbti-kaPian:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.mbti-kaPian.beiXuanZhong {
  background: linear-gradient(145deg, rgba(107, 140, 166, 0.45), rgba(196, 160, 176, 0.35));
  border-color: rgba(130, 180, 220, 0.8);
  box-shadow:
    0 0 16px rgba(107, 140, 166, 0.35),
    inset 0 0 12px rgba(255, 255, 255, 0.06);
}

.mbti-kaPian.beiXuanZhong .mbti-daiMa {
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.mbti-kaPian.beiXuanZhong .mbti-zhongWen {
  color: #e8f0fe;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.mbti-kaPian.beiXuanZhong .mbti-miaoShu {
  color: rgba(255, 255, 255, 0.85);
}

.suiJi-kaPian {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 152, 0, 0.15));
  border-color: rgba(255, 193, 7, 0.35);
  border-style: dashed;
}

.suiJi-kaPian:hover {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.25), rgba(255, 152, 0, 0.25));
  border-color: rgba(255, 193, 7, 0.55);
  box-shadow: 0 0 14px rgba(255, 193, 7, 0.2);
}

.suiJi-kaPian.beiXuanZhong {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.4), rgba(255, 152, 0, 0.35));
  border-color: rgba(255, 193, 7, 0.8);
  border-style: solid;
  box-shadow: 0 0 18px rgba(255, 193, 7, 0.35);
}

.mbti-daiMa {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.mbti-zhongWen {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.2;
}

.mbti-miaoShu {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.45);
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
  accent-color: #ff6b9d;
  cursor: pointer;
  flex-shrink: 0;
}

.zhaNv-gouxuan input[type='checkbox'].zhaNan-gouxuan {
  accent-color: #4a90d9;
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
  color: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.anniu-fuZhu:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
}

.anniu-zhuYao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(107, 140, 166, 0.3);
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

.anniu-zhuYao:hover:not(:disabled)::before {
  left: 100%;
}

.anniu-zhuYao:hover:not(:disabled) {
  box-shadow:
    0 6px 28px rgba(107, 140, 166, 0.4),
    0 0 48px rgba(196, 160, 176, 0.15);
  transform: translateY(-2px);
}

.anniu-zhuYao:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(107, 140, 166, 0.3);
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

.buZhou-qianJin-enter-active,
.buZhou-qianJin-leave-active,
.buZhou-houTui-enter-active,
.buZhou-houTui-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
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
