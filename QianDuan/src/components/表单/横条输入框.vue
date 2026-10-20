<template>
  <div class="shuru-zu" :class="{ shangFu: 上浮 }">
    <div v-if="包裹类" :class="包裹类">
      <div v-if="内层类" :class="内层类">
        <input
          :id="标识"
          ref="gongJu"
          :value="模型值"
          :type="类型"
          class="fenlie-shuru"
          :maxlength="最大长度"
          :inputmode="输入模式"
          :autocomplete="自动完成"
          :readonly="只读"
          :disabled="禁用"
          :aria-invalid="无效 ? 'true' : undefined"
          :required="必填"
          placeholder=" "
          @input="faShuRu"
          @change="faBianGeng"
          @focus="faJiaoDian"
          @blur="faShiJiao"
          @animationstart="faZiDongTianChong"
        />
        <label :for="标识" class="fudong-biaoqian">{{ 标签 }}</label>
      </div>
      <template v-else>
        <input
          :id="标识"
          ref="gongJu"
          :value="模型值"
          :type="类型"
          class="fenlie-shuru"
          :maxlength="最大长度"
          :inputmode="输入模式"
          :autocomplete="自动完成"
          :readonly="只读"
          :disabled="禁用"
          :aria-invalid="无效 ? 'true' : undefined"
          :required="必填"
          placeholder=" "
          @input="faShuRu"
          @change="faBianGeng"
          @focus="faJiaoDian"
          @blur="faShiJiao"
          @animationstart="faZiDongTianChong"
        />
        <label :for="标识" class="fudong-biaoqian">{{ 标签 }}</label>
      </template>
      <slot />
    </div>
    <template v-else>
      <input
        :id="标识"
        ref="gongJu"
        :value="模型值"
        :type="类型"
        class="fenlie-shuru"
        :maxlength="最大长度"
        :inputmode="输入模式"
        :autocomplete="自动完成"
        :readonly="只读"
        :disabled="禁用"
        :aria-invalid="无效 ? 'true' : undefined"
        :required="必填"
        placeholder=" "
        @input="faShuRu"
        @change="faBianGeng"
        @focus="faJiaoDian"
        @blur="faShiJiao"
        @animationstart="faZiDongTianChong"
      />
      <label :for="标识" class="fudong-biaoqian">{{ 标签 }}</label>
      <slot />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    模型值: string
    标识: string
    标签: string
    类型?: string
    最大长度?: number
    输入模式?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
    自动完成?: string
    上浮?: boolean
    只读?: boolean
    禁用?: boolean
    无效?: boolean
    必填?: boolean
    包裹类?: string
    内层类?: string
  }>(),
  {
    类型: 'text',
    最大长度: undefined,
    输入模式: undefined,
    自动完成: undefined,
    上浮: false,
    只读: false,
    禁用: false,
    无效: false,
    必填: false,
    包裹类: undefined,
    内层类: undefined,
  },
)

const faChu = defineEmits<{
  (时间: 'geng-xin', 值: string): void
  (时间: 'jiao-dian'): void
  (时间: 'shi-jiao'): void
  (时间: 'shu-ru', 事件: Event): void
  (时间: 'bian-geng', 事件: Event): void
  (时间: 'zi-dong-tian-chong', 事件: Event): void
}>()

const gongJu = ref<HTMLInputElement | null>(null)

function faShuRu(事件: Event): void {
  faChu('geng-xin', (事件.target as HTMLInputElement).value)
  faChu('shu-ru', 事件)
}

function faBianGeng(事件: Event): void {
  faChu('bian-geng', 事件)
}

function faJiaoDian(): void {
  faChu('jiao-dian')
}

function faShiJiao(): void {
  faChu('shi-jiao')
}

function faZiDongTianChong(事件: Event): void {
  faChu('zi-dong-tian-chong', 事件)
}

function jiaoDian(): void {
  gongJu.value?.focus()
}

defineExpose({ jiaoDian })
</script>

<style scoped>
.shuru-zu {
  position: relative;
}
</style>
