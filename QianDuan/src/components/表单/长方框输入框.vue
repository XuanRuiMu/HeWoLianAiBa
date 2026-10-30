<template>
  <span class="chang-fang-kuang-ke">
    <component :is="圆角描边" ref="描边组件" :激活="聚焦中" />
    <input
      v-if="!多行"
      :id="标识 || undefined"
      ref="输入元素"
      class="chang-fang-kuang-shuru she-zhi-shuru"
      :type="类型"
      :value="模型值"
      :autocomplete="自动填充"
      :maxlength="最大长度 || undefined"
      :placeholder="占位文字 || undefined"
      :disabled="禁用"
      :readonly="只读"
      :aria-label="标签 || undefined"
      :aria-invalid="错误提示文字 ? 'true' : undefined"
      v-bind="$attrs"
      @input="处理输入"
      @focus="处理聚焦"
      @blur="处理失焦"
    />
    <textarea
      v-else
      :id="标识 || undefined"
      ref="输入元素"
      class="chang-fang-kuang-shuru chang-fang-kuang-shuru--duo-hang she-zhi-shuru"
      :rows="行数"
      :value="模型值"
      :autocomplete="自动填充"
      :maxlength="最大长度 || undefined"
      :placeholder="占位文字 || undefined"
      :disabled="禁用"
      :readonly="只读"
      :aria-label="标签 || undefined"
      :aria-invalid="错误提示文字 ? 'true' : undefined"
      v-bind="$attrs"
      @input="处理输入"
      @focus="处理聚焦"
      @blur="处理失焦"
    />
  </span>
  <p v-if="错误提示文字" class="chang-fang-kuang-cuo-wu" role="alert">
    {{ 错误提示文字 }}
  </p>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import 圆角描边 from './圆角描边.vue'


defineOptions({ inheritAttrs: false })

const 属性 = withDefaults(
  defineProps<{
    标签?: string
    模型值?: string
    类型?: string
    最大长度?: number
    错误提示文字?: string
    禁用?: boolean
    只读?: boolean
    占位文字?: string
    标识?: string
    多行?: boolean
    行数?: number
    自动完成?: string
  }>(),
  {
    标签: '',
    模型值: '',
    类型: 'text',
    最大长度: 0,
    错误提示文字: '',
    禁用: false,
    只读: false,
    占位文字: '',
    标识: '',
    多行: false,
    行数: 3,
    自动完成: undefined,
  },
)

const 自动填充 = computed(() => 属性.自动完成 ?? (属性.类型 === 'password' ? 'new-password' : 'off'))

const emit = defineEmits<{ 'geng-xin': [值: string] }>()

const 输入元素 = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const 聚焦中 = ref(false)
const 描边组件 = ref<{ 播放入场: () => void } | null>(null)
const 失焦退场延迟毫秒 = 120
let 失焦定时器: ReturnType<typeof setTimeout> | null = null

function 处理聚焦(): void {
  if (失焦定时器 !== null) {
    clearTimeout(失焦定时器)
    失焦定时器 = null
  }
  if (聚焦中.value) return
  聚焦中.value = true
  描边组件.value?.播放入场()
}

function 处理失焦(): void {
  if (失焦定时器 !== null) clearTimeout(失焦定时器)
  失焦定时器 = setTimeout(() => {
    失焦定时器 = null
    聚焦中.value = false
  }, 失焦退场延迟毫秒)
}

onBeforeUnmount(() => {
  if (失焦定时器 !== null) {
    clearTimeout(失焦定时器)
    失焦定时器 = null
  }
})

function 处理输入(事件: Event): void {
  const 目标 = 事件.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('geng-xin', 目标 ? 目标.value : '')
}

function 聚焦(): void {
  输入元素.value?.focus()
}

defineExpose({ 聚焦, 输入元素 })
</script>

<style scoped>
.chang-fang-kuang-ke {
  --chang-fang-kuang-hou-du: var(--juxing-shuru-biankuang);
  --chang-fang-kuang-yuan-jiao: var(--juxing-shuru-yuanjiao);
  --chang-fang-kuang-hui-se: var(--bianKuang, var(--biankuang-yanse));
  --chang-fang-kuang-bei-jing: var(--kaPian, var(--beijing-kaopian));
  --chang-fang-kuang-wen-se: var(--moSe, var(--wenben-zhuse));
  --chang-fang-kuang-zhan-wei-se: var(--huiSe, var(--wenben-ciuse));
  --chang-fang-kuang-gao-liang-liang: var(--shuru-gao-liang-liang-nan);
  --miao-bian-se: var(--chang-fang-kuang-gao-liang-liang);
  --miao-bian-kuan: var(--chang-fang-kuang-hou-du);
  --miao-bian-shi-chang: var(--shuru-gao-liang-shi-chang);
  --miao-bian-tui-chu-shi-chang: var(--shuru-gao-liang-tui-chu-shi-chang);

  position: relative;
  display: block;
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  border-radius: var(--chang-fang-kuang-yuan-jiao);
  overflow: hidden;
}

:root[data-xing-bie='nv'] .chang-fang-kuang-ke {
  --chang-fang-kuang-gao-liang-liang: var(--shuru-gao-liang-liang-nv);
  --miao-bian-se: var(--chang-fang-kuang-gao-liang-liang);
}

.chang-fang-kuang-shuru {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: var(--jiange-12) calc(var(--jiange-xiao) + var(--jiange-6));
  border: var(--chang-fang-kuang-hou-du) solid var(--chang-fang-kuang-hui-se);
  border-radius: var(--chang-fang-kuang-yuan-jiao);
  background-color: var(--chang-fang-kuang-bei-jing);
  color: var(--chang-fang-kuang-wen-se);
  font-family: inherit;
  font-size: var(--ziti-zhong);
  line-height: 1.5;
}

.chang-fang-kuang-shuru:focus {
  outline: none;
}

.chang-fang-kuang-shuru--duo-hang {
  min-height: 72px;
  line-height: 1.7;
  resize: vertical;
}

.chang-fang-kuang-shuru::placeholder {
  color: var(--chang-fang-kuang-zhan-wei-se);
}

.chang-fang-kuang-shuru:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chang-fang-kuang-cuo-wu {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.6;
  color: var(--cuowu-wenben);
}

@media (prefers-reduced-motion: reduce) {
  .chang-fang-kuang-ke {
    transition-duration: 0s;
  }
}
</style>
