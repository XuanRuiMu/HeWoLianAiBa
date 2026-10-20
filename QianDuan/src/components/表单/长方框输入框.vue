<template>
  <input
    v-if="!多行"
    :id="标识 || undefined"
    ref="输入元素"
    class="chang-fang-kuang-shuru she-zhi-shuru"
    :type="类型"
    :value="模型值"
    :maxlength="最大长度 || undefined"
    :placeholder="占位文字 || undefined"
    :disabled="禁用"
    :readonly="只读"
    :aria-label="标签 || undefined"
    :aria-invalid="错误提示文字 ? 'true' : undefined"
    :data-jiao-dian-guo="已聚焦过 ? '' : undefined"
    v-bind="$attrs"
    @input="处理输入"
    @focus="处理焦点"
  />
  <textarea
    v-else
    :id="标识 || undefined"
    ref="输入元素"
    class="chang-fang-kuang-shuru chang-fang-kuang-shuru--duo-hang she-zhi-shuru"
    :rows="行数"
    :value="模型值"
    :maxlength="最大长度 || undefined"
    :placeholder="占位文字 || undefined"
    :disabled="禁用"
    :readonly="只读"
    :aria-label="标签 || undefined"
    :aria-invalid="错误提示文字 ? 'true' : undefined"
    :data-jiao-dian-guo="已聚焦过 ? '' : undefined"
    v-bind="$attrs"
    @input="处理输入"
    @focus="处理焦点"
  />
  <p v-if="错误提示文字" class="chang-fang-kuang-cuo-wu" role="alert">
    {{ 错误提示文字 }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
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
  },
)

const emit = defineEmits<{ 'geng-xin': [值: string] }>()

const 输入元素 = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const 已聚焦过 = ref(false)

function 处理输入(事件: Event): void {
  const 目标 = 事件.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('geng-xin', 目标 ? 目标.value : '')
}

function 处理焦点(): void {
  已聚焦过.value = true
}

function 聚焦(): void {
  输入元素.value?.focus()
}

defineExpose({ 聚焦, 输入元素 })
</script>

<style scoped>
.chang-fang-kuang-shuru {
  --chang-fang-kuang-hui-se: var(--bianKuang, var(--biankuang-yanse));
  --chang-fang-kuang-lan-se: var(--shuru-bian-yi-se);
  --chang-fang-kuang-hou-du: var(--juxing-shuru-biankuang);
  --chang-fang-kuang-yuan-jiao: var(--juxing-shuru-yuanjiao);
  --chang-fang-kuang-zong-shi-chang: calc(var(--shuru-bian-yi-shi-chang) * 3.25);
  --chang-fang-kuang-hui-fu-shi-chang: calc(var(--shuru-bian-yi-shi-chang) * 2.4375);
  --chang-fang-kuang-bei-jing: var(--kaPian, var(--beijing-kaopian));
  --chang-fang-kuang-wen-se: var(--moSe, var(--wenben-zhuse));
  --chang-fang-kuang-zhan-wei-se: var(--huiSe, var(--wenben-ciuse));

  display: block;
  box-sizing: border-box;
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  padding: var(--jiange-12) calc(var(--jiange-xiao) + var(--jiange-6));
  border: var(--chang-fang-kuang-hou-du) solid transparent;
  border-radius: var(--chang-fang-kuang-yuan-jiao);
  background-color: var(--chang-fang-kuang-bei-jing);
  background-image:
    linear-gradient(var(--chang-fang-kuang-lan-se), var(--chang-fang-kuang-lan-se)),
    linear-gradient(var(--chang-fang-kuang-lan-se), var(--chang-fang-kuang-lan-se)),
    linear-gradient(var(--chang-fang-kuang-lan-se), var(--chang-fang-kuang-lan-se)),
    linear-gradient(var(--chang-fang-kuang-lan-se), var(--chang-fang-kuang-lan-se)),
    linear-gradient(var(--chang-fang-kuang-hui-se), var(--chang-fang-kuang-hui-se)),
    linear-gradient(var(--chang-fang-kuang-hui-se), var(--chang-fang-kuang-hui-se)),
    linear-gradient(var(--chang-fang-kuang-hui-se), var(--chang-fang-kuang-hui-se)),
    linear-gradient(var(--chang-fang-kuang-hui-se), var(--chang-fang-kuang-hui-se));
  background-repeat: no-repeat;
  background-origin: border-box;
  background-clip: border-box;
  background-position:
    left bottom,
    left bottom,
    left top,
    right top,
    left bottom,
    left bottom,
    left top,
    right top;
  background-size:
    0% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 0%,
    0% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 0%,
    100% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 100%,
    100% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 100%;
  color: var(--chang-fang-kuang-wen-se);
  font-family: inherit;
  font-size: var(--ziti-zhong);
  line-height: 1.5;
}

.chang-fang-kuang-shuru:focus {
  outline: none;
  background-size:
    100% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 100%,
    100% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 100%,
    100% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 100%,
    100% var(--chang-fang-kuang-hou-du),
    var(--chang-fang-kuang-hou-du) 100%;
  animation: chang-fang-kuang-miao-bian var(--chang-fang-kuang-zong-shi-chang) linear both;
}

.chang-fang-kuang-shuru[data-jiao-dian-guo]:not(:focus) {
  animation: chang-fang-kuang-shou-hui var(--chang-fang-kuang-hui-fu-shi-chang) linear both;
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

@keyframes chang-fang-kuang-miao-bian {
  0% {
    background-size:
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  7.69% {
    background-size:
      25% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  30.77% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 75%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  38.46% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  69.23% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  100% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }
}

@keyframes chang-fang-kuang-shou-hui {
  0% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  30.77% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  61.54% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  69.23% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 75%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  92.31% {
    background-size:
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 25%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }

  100% {
    background-size:
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      0% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 0%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%,
      100% var(--chang-fang-kuang-hou-du),
      var(--chang-fang-kuang-hou-du) 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chang-fang-kuang-shuru,
  .chang-fang-kuang-shuru:focus,
  .chang-fang-kuang-shuru[data-jiao-dian-guo]:not(:focus) {
    animation: none !important;
  }
}
</style>
