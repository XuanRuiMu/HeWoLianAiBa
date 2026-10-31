<template>
  <div class="cuowu-bianjie">
    <slot v-if="!xianShiCuoWu" />
    <div v-else class="cuowu-tishi" role="alert" aria-live="assertive">
      <span class="cuowu-tubiao-wei" aria-hidden="true">
        <svg
          class="cuowu-tubiao"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="7.5" x2="12" y2="13" />
          <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
        </svg>
      </span>

      <div class="cuowu-wen">
        <h2 class="cuowu-biaoti">
          {{ huoQuFanYi('tongYong', 'cuoWuBianJie') }}
        </h2>
        <p class="cuowu-miaoshu">
          {{ miaoShuWenAn || huoQuFanYi('tongYong', 'cuoWuBianJieTiShi') }}
        </p>
        <p v-if="caoGaoTiShi" class="cuowu-miaoshu" role="status">
          {{ caoGaoTiShi }}
        </p>
      </div>

      <div class="cuowu-anniu-zu">
        <button class="shuaxin-anniu" type="button" @click="shuaXinYeMian">
          {{ huoQuFanYi('tongYong', 'cuoWuBianJieShuaXin') }}
        </button>
        <button v-if="!qiangZhiXianShi" class="chongzhi-anniu" type="button" @click="chongZhiCuoWu">
          {{ huoQuFanYi('tongYong', 'cuoWuBianJieChongZhi') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

type CuoWuLeiXing = 'leiXing' | 'yuFa' | 'ziYuan' | 'weiZhi'

interface CuoWuXinXi {
  cuoWu: unknown
  shiLi: unknown
  xinXi: string
  leiXing: CuoWuLeiXing
  shiJianChuo: number
}

const props = withDefaults(
  defineProps<{ qiangZhiXianShi?: boolean; miaoShuWenAn?: string }>(),
  { qiangZhiXianShi: false, miaoShuWenAn: '' },
)

const emit = defineEmits<{
  (e: 'cuoWuBuHuo', xinXi: CuoWuXinXi): void
}>()

const cuoWuZhuangTai = ref(false)
const xianShiCuoWu = computed(() => cuoWuZhuangTai.value || props.qiangZhiXianShi)
const dangQianCuoWu = ref<unknown>(null)
const caoGaoTiShi = ref('')

function shouJiWeiFaCaoGao(): void {
  caoGaoTiShi.value = ''
  try {
    if (typeof sessionStorage === 'undefined') return
    const jianLieBiao: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const jian = sessionStorage.key(i)
      if (jian && jian.startsWith('caoGao:')) jianLieBiao.push(jian)
    }
    if (jianLieBiao.length > 0) caoGaoTiShi.value = huoQuFanYi('tongYong', 'caoGaoYiHuiFu')
  } catch {
    caoGaoTiShi.value = ''
  }
}

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
  shouJiWeiFaCaoGao()
  const xinXiRong: CuoWuXinXi = {
    cuoWu,
    shiLi,
    xinXi,
    leiXing: guoLeiXing(cuoWu),
    shiJianChuo: Date.now(),
  }
  emit('cuoWuBuHuo', xinXiRong)
  if (import.meta.env.DEV) console.error('[错误边界] 捕获渲染错误:', cuoWu, xinXi)
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
  caoGaoTiShi.value = ''
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
  --cuowu-tubiao-chicun: var(--jiange-da);
  --cuowu-mian-zui-da-kuan: 480px;
  --cuowu-mian-wen-kuan: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-zhong);
  box-sizing: border-box;
  max-width: var(--cuowu-mian-zui-da-kuan);
  min-height: 60vh;
  margin: var(--jiange-da) auto;
  padding: var(--jiange-da);
  text-align: center;
  color: var(--cuo-wu-zhengwen);
  background: var(--cuo-wu-mian);
  border: 1px solid var(--cuo-wu-bian);
  border-left: 3px solid var(--cuo-wu-biaoti);
  border-radius: var(--yuanjiao-da);
  box-shadow: none;
}

.cuowu-tubiao-wei {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--cuowu-tubiao-chicun);
  height: var(--cuowu-tubiao-chicun);
  color: var(--cuo-wu-biaoti);
}

.cuowu-tubiao {
  width: var(--cuowu-tubiao-chicun);
  height: var(--cuowu-tubiao-chicun);
}

.cuowu-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  max-width: var(--cuowu-mian-wen-kuan);
}

.cuowu-biaoti {
  margin: 0;
  color: var(--cuo-wu-biaoti);
  font-size: var(--ziti-da);
  font-weight: 700;
  line-height: 1.4;
}

.cuowu-miaoshu {
  margin: 0;
  color: var(--cuo-wu-zhengwen);
  font-size: var(--ziti-zhong);
  line-height: 1.6;
}

.cuowu-anniu-zu {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-xiao);
}

.shuaxin-anniu,
.chongzhi-anniu {
  min-height: var(--shuru-anniu-re-ku);
  padding: var(--jiange-xiao) var(--jiange-da);
  border-radius: var(--yuanjiao-xiao);
  font: inherit;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun),
    border-color var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.shuaxin-anniu {
  border: 1px solid var(--cuo-wu-bian);
  background: var(--beijing-kaopian);
  color: var(--cuo-wu-zhengwen);
}

.chongzhi-anniu {
  border: 1px solid var(--biankuang-yanse);
  background: transparent;
  color: var(--cuo-wu-zhengwen);
  font-weight: 500;
}

.shuaxin-anniu:hover,
.chongzhi-anniu:hover {
  background: var(--cuo-wu-dian);
  border-color: var(--cuo-wu-bian);
}

.shuaxin-anniu:focus-visible,
.chongzhi-anniu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

@media (max-width: 767px) {
  .cuowu-tishi {
    min-height: 50vh;
    padding: var(--jiange-zhong);
    margin: var(--jiange-zhong);
  }

  .shuaxin-anniu,
  .chongzhi-anniu {
    padding: var(--jiange-xiao) var(--jiange-12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shuaxin-anniu,
  .chongzhi-anniu {
    transition: none;
  }
}
</style>
