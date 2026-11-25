<template>
  <div class="buzuo-neirong">
    <h2 class="buZuo-biaoti">{{ 标题 }}</h2>
    <p class="buZuo-miaoShu">{{ 描述 }}</p>
    <div class="xingBie-wangGe">
      <button
        v-if="变体 === 'ziJi'"
        class="xingBie-kaPian ziJi-xingBie-kaPian"
        data-xuan-xing-bie="nan"
        :class="{ beiXuanZhong: 模型值 === 'male' }"
        :style="模型值 === 'male' ? 性别卡选中样式 : undefined"
        :aria-pressed="模型值 === 'male'"
        @click="xuanZeXingBie('male')"
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
        <span class="xingBie-mingCheng">{{ nanMingCheng }}</span>
      </button>
      <button
        v-if="变体 === 'ziJi'"
        class="xingBie-kaPian ziJi-xingBie-kaPian"
        data-xuan-xing-bie="nv"
        :class="{ beiXuanZhong: 模型值 === 'female' }"
        :style="模型值 === 'female' ? 性别卡选中样式 : undefined"
        :aria-pressed="模型值 === 'female'"
        @click="xuanZeXingBie('female')"
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
        <span class="xingBie-mingCheng">{{ nvMingCheng }}</span>
      </button>
      <button
        v-if="变体 === 'duiXiang'"
        class="xingBie-kaPian duiXiang-xingBie-kaPian"
        data-xuan-xing-bie="nan"
        :class="{ beiXuanZhong: 模型值 === 'male' }"
        :style="模型值 === 'male' ? 性别卡选中样式 : undefined"
        :aria-pressed="模型值 === 'male'"
        @click="xuanZeXingBie('male')"
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
        <span class="xingBie-mingCheng">{{ nanMingCheng }}</span>
      </button>
      <button
        v-if="变体 === 'duiXiang'"
        class="xingBie-kaPian duiXiang-xingBie-kaPian"
        data-xuan-xing-bie="nv"
        :class="{ beiXuanZhong: 模型值 === 'female' }"
        :style="模型值 === 'female' ? 性别卡选中样式 : undefined"
        :aria-pressed="模型值 === 'female'"
        @click="xuanZeXingBie('female')"
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
        <span class="xingBie-mingCheng">{{ nvMingCheng }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import { 使用通用性别框体配色 } from '@/composables/use性别框体配色'
import { type 性别用户形态 } from '@/utils/性别'

const props = defineProps<{
  标题: string
  描述: string
  变体: 'ziJi' | 'duiXiang'
  自身性别?: 性别用户形态 | null
  对象性别?: 性别用户形态 | null
  模型值: 性别用户形态 | null
}>()

const emit = defineEmits<{
  (e: 'update:模型值', 值: 性别用户形态): void
}>()

const { 样式: 性别卡选中样式 } = 使用通用性别框体配色({
  自身性别: () => props.自身性别,
  对象性别: () => props.对象性别,
})

const nanMingCheng = computed(() => huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'))
const nvMingCheng = computed(() => huoQuFanYi('ziLiaoSheZhi', 'xingBieNv'))

function xuanZeXingBie(xingBie: 性别用户形态) {
  emit('update:模型值', xingBie)
}
</script>

<style scoped>
.buzuo-neirong {
  --ziliao-miaoshu-wenben: rgba(242, 240, 250, 0.84);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

:root[data-theme='light'] .buzuo-neirong {
  --ziliao-miaoshu-wenben: rgba(55, 42, 63, 0.86);
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
  color: var(--ziliao-miaoshu-wenben);
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
  background-color: var(--liuli-kuai-beijing);
  border: 2px solid var(--liuli-kuai-biankuang);
  border-radius: 16px;
  color: var(--kapian-shuoming-wenben);
  cursor: pointer;
  transition-property: border-color, box-shadow, transform, color, background-color;
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

.xingBie-kaPian.beiXuanZhong .xingBie-mingCheng,
.xingBie-kaPian.beiXuanZhong .xingBie-svg {
  color: inherit;
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

:root[data-theme='light'] .buZuo-biaoti {
  color: #372a3f;
}

@media (max-height: 560px) {
  .buZuo-biaoti {
    font-size: 20px;
  }

  .buZuo-miaoShu {
    margin-bottom: var(--jiange-xiao);
    font-size: 12px;
  }

  .xingBie-wangGe {
    max-width: 300px;
  }

  .xingBie-kaPian {
    gap: var(--jiange-6);
    padding: var(--jiange-10) var(--jiange-xiao);
  }

  .xingBie-tubiao {
    font-size: 30px;
  }

  .xingBie-svg {
    width: 44px;
    height: 44px;
  }

  .xingBie-mingCheng {
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xingBie-kaPian {
    transition: none !important;
  }
}
</style>
