<template>
  <div class="cuowu-bianjie">
    <slot v-if="!cuoWuZhuangTai" />
    <div v-else class="cuowu-tishi" role="alert" aria-live="assertive">
      <div class="cuowu-toubu">
        <span class="cuowu-tubiao" aria-hidden="true">⚠</span>
        <h2 class="cuowu-biaoti">
          {{ huoQuFanYi('tongYong', 'cuoWuBianJie') }}
        </h2>
      </div>
      <p class="cuowu-miaoshu">
        {{ huoQuFanYi('tongYong', 'cuoWuBianJieTiShi') }}
      </p>
      <div class="cuowu-anniu-zu">
        <button class="shuaxin-anniu" type="button" @click="shuaXinYeMian">
          {{ huoQuFanYi('tongYong', 'cuoWuBianJieShuaXin') }}
        </button>
        <button class="chongzhi-anniu" type="button" @click="chongZhiCuoWu">
          {{ huoQuFanYi('tongYong', 'cuoWuBianJieChongZhi') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { huoQuFanYi } from '@/config/translations'

type CuoWuLeiXing = 'leiXing' | 'yuFa' | 'ziYuan' | 'weiZhi'

interface CuoWuXinXi {
  cuoWu: unknown
  shiLi: unknown
  xinXi: string
  leiXing: CuoWuLeiXing
  shiJianChuo: number
}

const emit = defineEmits<{
  (e: 'cuoWuBuHuo', xinXi: CuoWuXinXi): void
}>()

const cuoWuZhuangTai = ref(false)
const dangQianCuoWu = ref<unknown>(null)

function guoLeiXing(cuoWu: unknown): CuoWuLeiXing {
  if (cuoWu instanceof TypeError) return 'leiXing'
  if (cuoWu instanceof SyntaxError) return 'yuFa'
  if (cuoWu && typeof cuoWu === 'object' && 'name' in cuoWu) {
    const mingCheng = (cuoWu as { name: string }).name
    if (mingCheng === 'NetworkError' || mingCheng.includes('Resource')) return 'ziYuan'
  }
  return 'weiZhi'
}

onErrorCaptured((cuoWu, shiLi, xinXi) => {
  cuoWuZhuangTai.value = true
  dangQianCuoWu.value = cuoWu
  const xinXiRong: CuoWuXinXi = {
    cuoWu,
    shiLi,
    xinXi,
    leiXing: guoLeiXing(cuoWu),
    shiJianChuo: Date.now(),
  }
  emit('cuoWuBuHuo', xinXiRong)
  console.error('[错误边界] 捕获渲染错误:', cuoWu, xinXi)
  return false
})

function shuaXinYeMian() {
  if (typeof window !== 'undefined' && typeof window.location === 'object') {
    window.location.reload()
  }
}

function chongZhiCuoWu() {
  cuoWuZhuangTai.value = false
  dangQianCuoWu.value = null
}

defineExpose({
  huoQuDangQianCuoWu: () => dangQianCuoWu.value,
  qingChuCuoWu: chongZhiCuoWu,
})
</script>

<style scoped>
.cuowu-bianjie {
  width: 100%;
  height: 100%;
}

.cuowu-tishi {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 32px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(20, 24, 40, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  max-width: 480px;
  margin: 24px auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.cuowu-toubu {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.cuowu-tubiao {
  font-size: 28px;
  line-height: 1;
}

.cuowu-biaoti {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
}

.cuowu-miaoshu {
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 24px;
  color: rgba(255, 255, 255, 0.7);
}

.cuowu-anniu-zu {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.shuaxin-anniu,
.chongzhi-anniu {
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.shuaxin-anniu {
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: #ffffff;
}

.shuaxin-anniu:hover {
  box-shadow: 0 4px 16px rgba(107, 140, 166, 0.3);
  transform: translateY(-1px);
}

.chongzhi-anniu {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.chongzhi-anniu:hover {
  background: rgba(255, 255, 255, 0.14);
}

:root[data-theme='浅色'] .cuowu-tishi {
  color: rgba(0, 0, 0, 0.75);
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.08);
}

:root[data-theme='浅色'] .cuowu-biaoti {
  color: #1a1a2e;
}

:root[data-theme='浅色'] .cuowu-miaoshu {
  color: rgba(0, 0, 0, 0.6);
}

:root[data-theme='浅色'] .chongzhi-anniu {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.7);
  border-color: rgba(0, 0, 0, 0.1);
}

:root[data-theme='浅色'] .chongzhi-anniu:hover {
  background: rgba(0, 0, 0, 0.08);
}

@media (max-width: 767px) {
  .cuowu-tishi {
    min-height: 50vh;
    padding: 24px 16px;
    margin: 16px;
  }

  .cuowu-tubiao {
    font-size: 24px;
  }

  .cuowu-biaoti {
    font-size: 16px;
  }

  .shuaxin-anniu,
  .chongzhi-anniu {
    padding: 9px 18px;
    font-size: 13px;
  }
}
</style>
