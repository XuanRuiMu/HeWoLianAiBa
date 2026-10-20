<template>
  <div class="wai-guan-bian-ji-qi" role="group" :aria-label="biaoTi">
    <div class="wai-guan-bian-ji-qi-hang">
      <label class="wai-guan-bian-ji-qi-biao-qian" :for="mingChengBiaoShi">
        {{ mingChengWenAn }}
      </label>
      <ChangFangShuRuKuang
        :标识="mingChengBiaoShi"
        :模型值="mingChengCaoGao"
        :最大长度="zuiDaZiFu"
        :标签="mingChengWenAn"
        :占位文字="mingChengZhanWei"
        @geng-xin="mingChengCaoGao = $event"
      />
    </div>
    <div class="wai-guan-bian-ji-qi-hang">
      <span class="wai-guan-bian-ji-qi-biao-qian">{{ yanSeWenAn }}</span>
      <div class="wai-guan-yan-se-lie-biao" role="radiogroup" :aria-label="yanSeWenAn">
        <button
          type="button"
          class="wai-guan-yan-se-gen-sui"
          :class="{ 'wai-guan-yan-se-xuan-zhong': !dangQianYanSe }"
          role="radio"
          :aria-checked="!dangQianYanSe"
          @click="dangQianYanSe = ''"
        >
          {{ genSuiWenAn }}
        </button>
        <button
          v-for="yanSe in yanSeXuanXiang"
          :key="yanSe"
          type="button"
          class="wai-guan-yan-se"
          :class="{ 'wai-guan-yan-se-xuan-zhong': dangQianYanSe === yanSe }"
          :style="{ background: yanSe }"
          role="radio"
          :aria-checked="dangQianYanSe === yanSe"
          :aria-label="yanSe"
          @click="dangQianYanSe = yanSe"
        />
        <input
          class="wai-guan-yan-se-zi-ding-yi"
          type="color"
          :value="dangQianYanSe || moRenYanSe"
          :aria-label="yanSeWenAn"
          @input="chuLiYanSeShuRu"
        />
      </div>
    </div>
    <p v-if="cuoWuWenAn" class="wai-guan-bian-ji-qi-cuo-wu" role="alert">{{ cuoWuWenAn }}</p>
    <div class="wai-guan-bian-ji-qi-an-niu">
      <button type="button" class="anniu-fu-zhu wai-guan-an-niu" @click="faChu('huan-yuan')">
        {{ huanYuanWenAn }}
      </button>
      <button type="button" class="anniu-fu-zhu wai-guan-an-niu" @click="faChu('guan-bi')">
        {{ quXiaoWenAn }}
      </button>
      <button type="button" class="anniu-zhu-yao wai-guan-an-niu" @click="baoChun">
        {{ baoChunWenAn }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import { huoQuFanYi } from '@/config/翻译表'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_YAN_SE_XUAN_XIANG,
  shiKeYongQiPaoWenZiYanSe,
  shiKeYongWenZiYanSe,
} from '@/config/外观自定义'

const props = defineProps<{
  biaoTi: string
  mingCheng: string
  wenZiYanSe: string
  zuiDaZiFu: number
  shiYuShe: boolean
  leiBie?: 'beiJing' | 'qiPao'
  yanSeXuanXiang?: readonly string[]
}>()

const faChu = defineEmits<{
  'geng-xin': [zhi: { mingCheng: string; wenZiYanSe: string }]
  'huan-yuan': []
  'guan-bi': []
}>()

const mingChengWenAn = huoQuFanYi('sheZhi', 'waiGuanMingCheng')
const yanSeWenAn = huoQuFanYi('sheZhi', 'waiGuanWenZiYanSe')
const genSuiWenAn = huoQuFanYi('sheZhi', 'waiGuanYanSeGenSuiZhuti')
const huanYuanWenAn = huoQuFanYi('sheZhi', 'waiGuanHuanYuanMoRen')
const quXiaoWenAn = huoQuFanYi('sheZhi', 'waiGuanQuXiao')
const baoChunWenAn = huoQuFanYi('sheZhi', 'waiGuanBaoCun')
const mingChengZhanWei = huoQuFanYi('sheZhi', 'waiGuanMingCheng')
const moRenYanSe = WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
const yanSeXuanXiang = props.yanSeXuanXiang || WAI_GUAN_YAN_SE_XUAN_XIANG

const mingChengBiaoShi = `wai-guan-ming-cheng-${props.shiYuShe ? 'yu-she' : 'zi-ding-yi'}`
const mingChengCaoGao = ref(props.mingCheng)
const dangQianYanSe = ref(props.wenZiYanSe)
const cuoWuWenAn = ref('')

function chuLiYanSeShuRu(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  dangQianYanSe.value = muBiao?.value || ''
}

function baoChun(): void {
  const qingLi = mingChengCaoGao.value.trim()
  if (!qingLi) {
    cuoWuWenAn.value = huoQuFanYi('sheZhi', 'waiGuanMingChengWeiKong')
    return
  }
  if (Array.from(qingLi).length > props.zuiDaZiFu) {
    cuoWuWenAn.value = huoQuFanYi('sheZhi', 'waiGuanMingChengTaiChang').replace('{n}', String(props.zuiDaZiFu))
    return
  }
  const yanSeKeYong = props.leiBie === 'qiPao' ? shiKeYongQiPaoWenZiYanSe : shiKeYongWenZiYanSe
  if (dangQianYanSe.value && !yanSeKeYong(dangQianYanSe.value)) {
    cuoWuWenAn.value = huoQuFanYi('sheZhi', 'waiGuanWenZiYanSeDuiBiDuBuZu')
    return
  }
  cuoWuWenAn.value = ''
  faChu('geng-xin', { mingCheng: qingLi, wenZiYanSe: dangQianYanSe.value.toUpperCase() })
}
</script>

<style scoped>
.wai-guan-bian-ji-qi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  padding: var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  border: 1.5px solid var(--biankuang-yanse);
  background: var(--beijing-kaopian);
}

.wai-guan-bian-ji-qi-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  flex-wrap: wrap;
}

.wai-guan-bian-ji-qi-biao-qian {
  font-size: 13px;
  flex: none;
}

.wai-guan-yan-se-lie-biao {
  display: flex;
  align-items: center;
  gap: var(--jiange-6);
  flex-wrap: wrap;
}

.wai-guan-yan-se {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--biankuang-yanse);
  cursor: pointer;
}

.wai-guan-yan-se-xuan-zhong {
  box-shadow:
    0 0 0 2px var(--beijing-kaopian),
    0 0 0 4px var(--yanse-qiangdiao);
}

.wai-guan-yan-se-gen-sui {
  min-height: 28px;
  padding: 0 var(--jiange-xiao);
  border-radius: var(--yuanjiao-xiao);
  border: 1.5px solid var(--biankuang-yanse);
  background: transparent;
  color: var(--wenben-zhuse);
  font-size: 12px;
  cursor: pointer;
}

.wai-guan-yan-se-zi-ding-yi {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.wai-guan-bian-ji-qi-cuo-wu {
  margin: 0;
  font-size: 12px;
  color: var(--cuowu-wenben);
}

.wai-guan-bian-ji-qi-an-niu {
  display: flex;
  gap: var(--jiange-xiao);
  flex-wrap: wrap;
}

.wai-guan-bian-ji-qi-an-niu .wai-guan-an-niu {
  min-height: 36px;
  padding-inline: var(--jiange-zhong);
  font-size: 13px;
}
</style>
