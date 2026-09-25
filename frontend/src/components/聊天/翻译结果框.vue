<template>
  <section
    class="fanyi-jieguo-kuang"
    :class="`fanyi-jieguo-kuang--${zhuangTai}`"
    :data-zhuang-tai="zhuangTai"
    :aria-labelledby="biaoTiId"
    :aria-busy="zhuangTai === 'loading' ? 'true' : undefined"
  >
    <div class="fanyi-jieguo-tou">
      <h4 :id="biaoTiId" class="fanyi-jieguo-biaoti">
        {{ huoQuFanYi('liaoTian', 'fanYiJieGuo') }}
      </h4>
      <div class="fanyi-yuyan-kuang">
        <label class="fanyi-yuyan-xiang">
          <span>{{ huoQuFanYi('liaoTian', 'fanYiYuanYu') }}</span>
          <select
            class="fanyi-yuyan-xiala"
            :value="yuanYu"
            :disabled="zhuangTai === 'loading'"
            @change="gengXinYuanYu"
          >
            <option v-for="xiang in YUAN_YU_XUAN_XIANG" :key="xiang.zhi" :value="xiang.zhi">
              {{ huoQuFanYi('liaoTian', xiang.jian) }}
            </option>
          </select>
        </label>
        <label class="fanyi-yuyan-xiang">
          <span>{{ huoQuFanYi('liaoTian', 'fanYiMuBiaoYu') }}</span>
          <select
            class="fanyi-yuyan-xiala"
            :value="muBiaoYu"
            :disabled="zhuangTai === 'loading'"
            @change="gengXinMuBiaoYu"
          >
            <option v-for="xiang in MU_BIAO_YU_XUAN_XIANG" :key="xiang.zhi" :value="xiang.zhi">
              {{ huoQuFanYi('liaoTian', xiang.jian) }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div
      v-if="zhuangTai === 'success'"
      class="fanyi-jieguo-neirong"
      role="note"
      tabindex="0"
      :aria-label="huoQuFanYi('liaoTian', 'fanYiJieGuo')"
    >
      {{ jieGuoWenBen }}
    </div>
    <div v-else-if="zhuangTai === 'error'">
      <RequestError
        class="fanyi-jieguo-zhuangtai fanyi-jieguo-zhuangtai--cuowu"
        :cuo-wu="xianShiCuoWu"
        mi-xi
        @chong-shi="faChongShiFanYi"
      />
    </div>
    <div
      v-else
      class="fanyi-jieguo-zhuangtai"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <template v-if="zhuangTai === 'loading'">{{ huoQuFanYi('liaoTian', 'fanYiZhong') }}</template>
      <template v-else>{{ huoQuFanYi('liaoTian', 'fanYiKong') }}</template>
    </div>

    <div v-if="zhuangTai !== 'error'" class="fanyi-jieguo-caozuo">
      <button
        type="button"
        class="fanyi-fuzhi-anniu"
        :disabled="zhuangTai !== 'success' || fuZhiZhong || !fuZhiWenBen || !jieGuoWenBen.trim()"
        :aria-label="huoQuFanYi('liaoTian', 'fuZhi')"
        :aria-describedby="fuZhiTiShi ? fankuiId : undefined"
        @click="fuZhiJieGuo"
      >
        {{ huoQuFanYi('liaoTian', 'fuZhi') }}
      </button>
      <span
        v-if="fuZhiTiShi"
        :id="fankuiId"
        class="fanyi-fuzhi-tishi"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ fuZhiTiShi }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import RequestError from '@/components/请求错误.vue'
import { chuangJianQianTaiCuoWu, type QianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'

const props = defineProps<{
  zhuangTai: 'loading' | 'success' | 'empty' | 'error'
  jieGuo?: string | null
  cuoWu?: QianTaiCuoWu | null
  yuanYu: string
  muBiaoYu: string
  fuZhiWenBen?: (wenBen: string) => Promise<boolean>
}>()

const emit = defineEmits<{
  (e: 'gengXinYuanYu', zhi: string): void
  (e: 'gengXinMuBiaoYu', zhi: string): void
  (e: 'chongShi'): void
}>()

const YUAN_YU_XUAN_XIANG = [
  { zhi: 'auto', jian: 'fanYiZiDong' },
  { zhi: 'zh', jian: 'fanYiYuYanZh' },
  { zhi: 'en', jian: 'fanYiYuYanEn' },
  { zhi: 'ja', jian: 'fanYiYuYanJa' },
  { zhi: 'ko', jian: 'fanYiYuYanKo' },
  { zhi: 'fr', jian: 'fanYiYuYanFr' },
  { zhi: 'de', jian: 'fanYiYuYanDe' },
  { zhi: 'es', jian: 'fanYiYuYanEs' },
  { zhi: 'ru', jian: 'fanYiYuYanRu' },
] as const

const MU_BIAO_YU_XUAN_XIANG = YUAN_YU_XUAN_XIANG.filter((xiang) => xiang.zhi !== 'auto')

const shuangTi = getCurrentInstance()?.uid ?? 0
const biaoTiId = `fanyi-jieguo-biaoti-${shuangTi}`
const fankuiId = `fanyi-fuzhi-tishi-${shuangTi}`
const FU_ZHI_TI_SHI_HAO_MIAO = 2000
const fuZhiTiShi = ref('')
const fuZhiZhong = ref(false)
let fuZhiJiShiQi: ReturnType<typeof setTimeout> | null = null

const jieGuoWenBen = computed(() => (typeof props.jieGuo === 'string' ? props.jieGuo : ''))
const xianShiCuoWu = computed(
  () =>
    props.cuoWu ||
    chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.XIE_YI,
      retryable: true,
      yingXiang: huoQuFanYi('liaoTian', 'fanYiShiBai'),
    }),
)
const youJieGuo = computed(() => props.zhuangTai === 'success' && !!jieGuoWenBen.value.trim())

function gengXinYuanYu(shiJian: Event): void {
  const xuanZe = shiJian.target as HTMLSelectElement
  emit('gengXinYuanYu', xuanZe.value)
}

function gengXinMuBiaoYu(shiJian: Event): void {
  const xuanZe = shiJian.target as HTMLSelectElement
  emit('gengXinMuBiaoYu', xuanZe.value)
}

function qingChuFuZhiTiShi(): void {
  fuZhiTiShi.value = ''
  if (fuZhiJiShiQi) {
    clearTimeout(fuZhiJiShiQi)
    fuZhiJiShiQi = null
  }
}

async function fuZhiJieGuo(): Promise<void> {
  if (fuZhiZhong.value || !youJieGuo.value || !jieGuoWenBen.value || !props.fuZhiWenBen) return
  qingChuFuZhiTiShi()
  fuZhiZhong.value = true
  try {
    const chengGong = await props.fuZhiWenBen(jieGuoWenBen.value)
    fuZhiTiShi.value = chengGong
      ? huoQuFanYi('liaoTian', 'yiFuZhi')
      : huoQuFanYi('liaoTian', 'fuZhiShiBai')
  } catch {
    fuZhiTiShi.value = huoQuFanYi('liaoTian', 'fuZhiShiBai')
  } finally {
    fuZhiZhong.value = false
    fuZhiJiShiQi = setTimeout(qingChuFuZhiTiShi, FU_ZHI_TI_SHI_HAO_MIAO)
  }
}

function faChongShiFanYi(): void {
  emit('chongShi')
}

watch(
  () => [props.zhuangTai, props.jieGuo],
  () => qingChuFuZhiTiShi(),
)

onBeforeUnmount(() => {
  qingChuFuZhiTiShi()
})
</script>

<style scoped>
.fanyi-jieguo-kuang {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-top: var(--jiange-xiao);
  padding: var(--jiange-zhong);
  overflow: hidden;
  border: var(--shuru-kuang-biankuang) solid var(--biankuang-yanse);
  border-radius: var(--shuru-kuang-yuanjiao);
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  transition:
    background var(--quxian-biao-zhun),
    border-color var(--quxian-biao-zhun);
}

.fanyi-jieguo-kuang--error {
  border-color: var(--cuowu-yanse);
}

.fanyi-jieguo-tou {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-zhong);
  min-width: 0;
}

.fanyi-jieguo-biaoti {
  flex: 0 0 auto;
  margin: 0;
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  font-weight: 700;
  line-height: 1.5;
}

.fanyi-yuyan-kuang {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  flex: 1 1 auto;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.fanyi-yuyan-xiang {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  min-width: 0;
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
}

.fanyi-yuyan-xiala {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: var(--jiange-xiao);
  border: var(--shuru-kuang-biankuang) solid var(--biankuang-yanse);
  border-radius: var(--shuru-kuang-yuanjiao);
  background: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
  font: inherit;
}

.fanyi-yuyan-xiala:focus-visible,
.fanyi-fuzhi-anniu:focus-visible,
.fanyi-chongshi-anniu:focus-visible,
.fanyi-jieguo-neirong:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.fanyi-jieguo-neirong {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  margin-top: var(--jiange-zhong);
  padding: var(--jiange-zhong);
  overflow-wrap: anywhere;
  border-radius: var(--shuru-kuang-yuanjiao);
  background: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
  font-size: var(--ziti-zhong);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.fanyi-jieguo-zhuangtai {
  display: flex;
  align-items: center;
  min-height: var(--shuru-anniu-re-ku);
  margin-top: var(--jiange-zhong);
  padding: var(--jiange-zhong);
  border-radius: var(--shuru-kuang-yuanjiao);
  background: var(--beijing-ciuse);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-zhong);
  line-height: 1.5;
}

.fanyi-jieguo-zhuangtai--cuowu {
  color: var(--cuowu-wenben);
}

.fanyi-jieguo-caozuo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-zhong);
}

.fanyi-fuzhi-anniu,
.fanyi-chongshi-anniu {
  min-height: var(--shuru-anniu-re-ku);
  padding: var(--jiange-xiao) var(--jiange-zhong);
  border: var(--shuru-kuang-biankuang) solid var(--zhuse);
  border-radius: var(--shuru-kuang-yuanjiao);
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--quxian-biao-zhun);
}

.fanyi-fuzhi-anniu:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.fanyi-fuzhi-tishi {
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
}

.fanyi-chongshi-anniu {
  margin-top: var(--jiange-zhong);
  background: transparent;
  color: var(--cuowu-wenben);
  border-color: var(--cuowu-yanse);
}

@media (max-width: 480px) {
  .fanyi-jieguo-tou {
    flex-direction: column;
  }

  .fanyi-yuyan-kuang {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
  }

  .fanyi-jieguo-kuang {
    padding: var(--jiange-xiao);
  }

  .fanyi-jieguo-caozuo {
    align-items: stretch;
    flex-direction: column;
  }

  .fanyi-fuzhi-anniu,
  .fanyi-chongshi-anniu {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fanyi-jieguo-kuang,
  .fanyi-fuzhi-anniu {
    transition: none;
  }
}
</style>
