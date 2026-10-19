<template>
  <input
    v-if="!duoHang"
    :id="biaoShi || undefined"
    ref="shuRuYuanSu"
    class="chang-fang-kuang-shuru she-zhi-shuru"
    :type="leiXing"
    :value="moXingZhi"
    :maxlength="zuiDaChangDu || undefined"
    :placeholder="zhanWeiWenZi || undefined"
    :disabled="jinYong"
    :readonly="zhiDu"
    :aria-label="biaoQian || undefined"
    :aria-invalid="cuoWuTiShiWenZi ? 'true' : undefined"
    :data-jiao-dian-guo="yiJiaoDianGuo ? '' : undefined"
    v-bind="$attrs"
    @input="chuLiShuRu"
    @focus="chuLiJiaoDian"
  />
  <textarea
    v-else
    :id="biaoShi || undefined"
    ref="shuRuYuanSu"
    class="chang-fang-kuang-shuru chang-fang-kuang-shuru--duo-hang she-zhi-shuru"
    :rows="hangShu"
    :value="moXingZhi"
    :maxlength="zuiDaChangDu || undefined"
    :placeholder="zhanWeiWenZi || undefined"
    :disabled="jinYong"
    :readonly="zhiDu"
    :aria-label="biaoQian || undefined"
    :aria-invalid="cuoWuTiShiWenZi ? 'true' : undefined"
    :data-jiao-dian-guo="yiJiaoDianGuo ? '' : undefined"
    v-bind="$attrs"
    @input="chuLiShuRu"
    @focus="chuLiJiaoDian"
  />
  <p v-if="cuoWuTiShiWenZi" class="chang-fang-kuang-cuo-wu" role="alert">
    {{ cuoWuTiShiWenZi }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    biaoQian?: string
    moXingZhi?: string
    leiXing?: string
    zuiDaChangDu?: number
    cuoWuTiShiWenZi?: string
    jinYong?: boolean
    zhiDu?: boolean
    zhanWeiWenZi?: string
    biaoShi?: string
    duoHang?: boolean
    hangShu?: number
  }>(),
  {
    biaoQian: '',
    moXingZhi: '',
    leiXing: 'text',
    zuiDaChangDu: 0,
    cuoWuTiShiWenZi: '',
    jinYong: false,
    zhiDu: false,
    zhanWeiWenZi: '',
    biaoShi: '',
    duoHang: false,
    hangShu: 3,
  },
)

const emit = defineEmits<{ gengXin: [zhi: string] }>()

const shuRuYuanSu = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const yiJiaoDianGuo = ref(false)

function chuLiShuRu(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | HTMLTextAreaElement | null
  emit('gengXin', muBiao ? muBiao.value : '')
}

function chuLiJiaoDian(): void {
  yiJiaoDianGuo.value = true
}

function jiaoDian(): void {
  shuRuYuanSu.value?.focus()
}

defineExpose({ jiaoDian, shuRuYuanSu })
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
