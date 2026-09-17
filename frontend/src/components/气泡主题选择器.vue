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
          :class="{ 'qipao-xuanXiang-xuanZhong': sheZhi.qiPaoZiJi === yuShe }"
          :style="xuanXiangYangShi(yuShe)"
          role="radio"
          :aria-checked="sheZhi.qiPaoZiJi === yuShe"
          @click="xuanZe('ziJi', yuShe)"
        >
          {{ huoQuQiPaoMingCheng(yuShe) }}
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
          {{ huoQuQiPaoMingCheng(yuShe) }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  QI_PAO_YU_SHE_XUAN_XIANG,
  huoQuQiPaoDingYi,
  type QiPaoYuShe,
} from '@/config/气泡主题'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'

const biaoTi = QI_PAO_WEN_AN.biaoTi
const ziJiBiaoTi = QI_PAO_WEN_AN.ziJiBiaoTi
const aiBiaoTi = QI_PAO_WEN_AN.aiBiaoTi

const sheZhi = 使用用户设置仓库()

function xuanXiangYangShi(yuShe: QiPaoYuShe): Record<string, string> {
  const dingYi = huoQuQiPaoDingYi(yuShe)
  return { background: dingYi.beiJing, color: dingYi.wenBen }
}

function xuanZe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): void {
  void sheZhi.qieHuanQiPao(buWei, yuShe)
}
</script>

<style scoped>
.qipao-zhuTi-xuanZeQi {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.qipao-xuanZe-biaoTi {
  font-size: 15px;
  font-weight: 600;
}
.qipao-fenZu-biaoTi {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}
.qipao-xuanXiang-lieBiao {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.qipao-xuanXiang {
  padding: 8px 14px;
  border-radius: 16px;
  border: 2px solid transparent;
  font-size: 13px;
  cursor: pointer;
}
.qipao-xuanXiang-xuanZhong {
  border-color: currentcolor;
}
</style>
