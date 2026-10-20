<template>
  <div class="zhaohui-ju-ke">
    <div class="biaodan-rongqi">
      <div class="juanzhou-gan juanzhou-gan-shang" />
      <div class="biaodan-neirong-qu">
        <div class="biaodan-tou">
          <div class="app-tubiao">💕</div>
          <h1 class="biaodan-biaoti">{{ huoQuFanYi('renZheng', 'wangJiMiMaBiaoTi') }}</h1>
          <p class="biaodan-fu-biaoti">{{ huoQuFanYi('renZheng', 'wangJiMiMaFuBiaoTi') }}</p>
        </div>

        <ol v-if="!chongZhiWanCheng" class="zhaohui-jin-du">
          <li
            v-for="(buZhouMing, xuHao) in buZhouLieBiao"
            :key="buZhouMing"
            class="zhaohui-jin-du-xiang"
            :class="{ huoYue: dangQianBuZhou === xuHao + 1, yiWanCheng: dangQianBuZhou > xuHao + 1 }"
            :aria-current="dangQianBuZhou === xuHao + 1 ? 'step' : undefined"
          >
            <span class="zhaohui-xu-hao">{{ xuHao + 1 }}</span>
            <span class="zhaohui-bu-zhou-wen">{{ buZhouMing }}</span>
          </li>
        </ol>

        <div v-if="chongZhiWanCheng" class="zhaohui-cheng-gong" role="status">
          <p class="zhaohui-cheng-gong-biao-ti">{{ huoQuFanYi('renZheng', 'zhaoHuiChengGongBiaoTi') }}</p>
          <p class="zhaohui-cheng-gong-shuo-ming">{{ huoQuFanYi('renZheng', 'zhaoHuiChengGongShuoMing') }}</p>
          <p class="zhaohui-dao-ji-shi">{{ tiaoZhuanWenBen }}</p>
          <RouterLink class="anniu-zhuyao zhaohui-qu-deng-lu" :to="dengLuLuYou">
            {{ huoQuFanYi('renZheng', 'zhaoHuiQuDengLu') }}
          </RouterLink>
        </div>

        <form v-else class="zhaohui-biao-dan" @submit.prevent="zhiXingTiJiao">
          <p class="zhaohui-shuo-ming">
            {{ dangQianBuZhou === 1 ? huoQuFanYi('renZheng', 'wangJiMiMaShuoMing') : huoQuFanYi('renZheng', 'wangJiMiMaTiShi') }}
          </p>

          <div class="zhaohui-zi-duan">
            <HengTiaoShuRuKuang
              ref="shouJiHaoKuang"
              标识="zhaohui-shoujihao"
              :模型值="shouJiHao"
              类型="tel"
              :最大长度="11"
              输入模式="numeric"
              自动完成="tel"
              :只读="dangQianBuZhou === 2"
              :上浮="shouJiHaoShangFu"
              :无效="dangQianBuZhou === 1 && shouJiHaoTiShi !== ''"
              必填
              :标签="huoQuFanYi('ui', 'shouJiHao')"
              @geng-xin="shouJiHao = $event"
              @shu-ru="qingLiTiShi"
              @shi-jiao="shouJiHaoShiJiao"
            />
            <p v-if="dangQianBuZhou === 1 && shouJiHaoCuoWuWenBen !== ''" class="zhaohui-zi-duan-ti-shi" role="alert">
              {{ shouJiHaoCuoWuWenBen }}
            </p>
          </div>

          <button
            v-if="dangQianBuZhou === 1"
            type="submit"
            class="anniu-zhuyao"
            :aria-busy="faSongZhong ? 'true' : 'false'"
            :disabled="!keYiFaSong"
            @click="zhiXingFaSong"
          >
            {{ faSongWenBen }}
          </button>

          <template v-else>
            <div class="zhaohui-zi-duan">
              <HengTiaoShuRuKuang
                ref="yanZhengMaKuang"
                标识="zhaohui-yanzhengma"
                :模型值="yanZhengMa"
                类型="tel"
                :最大长度="6"
                输入模式="numeric"
                自动完成="one-time-code"
                :上浮="yanZhengMaShangFu"
                必填
                包裹类="yanzhengma-zu"
                内层类="yanzhengma-shuru-qu"
                :标签="huoQuFanYi('ui', 'yanZhengMa')"
                @geng-xin="yanZhengMa = $event"
                @shu-ru="qingLiTiShi"
              >
                <button
                  type="button"
                  class="fasong-anniu"
                  :aria-busy="faSongZhong ? 'true' : 'false'"
                  :disabled="!keYiChongFa"
                  @click="zhiXingFaSong"
                >
                  {{ chongFaWenBen }}
                </button>
              </HengTiaoShuRuKuang>
              <p v-if="yanZhengMaCuoWuWenBen !== ''" class="zhaohui-zi-duan-ti-shi" role="alert">
                {{ yanZhengMaCuoWuWenBen }}
              </p>
            </div>

            <div class="zhaohui-zi-duan">
              <HengTiaoShuRuKuang
                ref="xinMiMaKuang"
                标识="zhaohui-xinmima"
                :模型值="xinMiMa"
                :类型="xianShiXinMiMa ? 'text' : 'password'"
                自动完成="new-password"
                :上浮="xinMiMaShangFu"
                必填
                包裹类="mima-zu"
                :标签="huoQuFanYi('renZheng', 'xinMiMa')"
                @geng-xin="xinMiMa = $event"
                @shu-ru="qingLiTiShi"
                @shi-jiao="xinMiMaShiJiao = true"
              >
                <button
                    type="button"
                    class="mima-qiehuan"
                    :aria-label="xianShiXinMiMa ? huoQuFanYi('ui', 'yinCangMiMa') : huoQuFanYi('ui', 'xianShiMiMa')"
                    :aria-pressed="xianShiXinMiMa"
                    @mousedown.prevent
                    @click="xianShiXinMiMa = !xianShiXinMiMa"
                  >
                    <svg
                      v-if="xianShiXinMiMa"
                      class="mima-tubiao"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    <svg
                      v-else
                      class="mima-tubiao"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
              </HengTiaoShuRuKuang>
              </div>

            <div class="zhaohui-zi-duan">
              <HengTiaoShuRuKuang
                标识="zhaohui-querenmima"
                :模型值="queRenXinMiMa"
                :类型="xianShiQueRenMiMa ? 'text' : 'password'"
                自动完成="new-password"
                :上浮="queRenMiMaShangFu"
                必填
                包裹类="mima-zu"
                :标签="huoQuFanYi('renZheng', 'queRenXinMiMa')"
                @geng-xin="queRenXinMiMa = $event"
                @shu-ru="qingLiTiShi"
              >
<button
                    type="button"
                    class="mima-qiehuan"
                    :aria-label="
                      xianShiQueRenMiMa ? huoQuFanYi('ui', 'yinCangMiMa') : huoQuFanYi('ui', 'xianShiMiMa')
                    "
                    :aria-pressed="xianShiQueRenMiMa"
                    @mousedown.prevent
                    @click="xianShiQueRenMiMa = !xianShiQueRenMiMa"
                  >
                    <svg
                      v-if="xianShiQueRenMiMa"
                      class="mima-tubiao"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    <svg
                      v-else
                      class="mima-tubiao"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
              </HengTiaoShuRuKuang>
              <p v-if="miMaCuoWuWenBen !== ''" class="zhaohui-zi-duan-ti-shi" role="alert">
                {{ miMaCuoWuWenBen }}
              </p>
            </div>

            <div class="zhaohui-hang">
              <button type="button" class="zhaohui-shang-yi-bu" @click="fanHuiShangYiBu">
                {{ huoQuFanYi('renZheng', 'zhaoHuiShangYiBu') }}
              </button>
              <button
                type="submit"
                class="anniu-zhuyao zhaohui-ti-jiao"
                :aria-busy="chongZhiZhong ? 'true' : 'false'"
                :disabled="!keYiChongZhi"
              >
                {{ chongZhiZhong ? huoQuFanYi('renZheng', 'chongZhiZhong') : huoQuFanYi('renZheng', 'chongZhiMiMa') }}
              </button>
            </div>
          </template>

          <RouterLink class="zhaohui-fan-hui" :to="{ name: 'dengLu' }">
            {{ huoQuFanYi('renZheng', 'fanHuiDengLu') }}
          </RouterLink>
        </form>
      </div>
      <div class="juanzhou-gan juanzhou-gan-xia" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { chongZhiMiMa, faSongMa, YAN_ZHENG_MA_YONG_TU } from '@/api/认证'
import HengTiaoShuRuKuang from '@/components/表单/横条输入框.vue'
import { huoQuFanYi } from '@/config/翻译表'
import { use前台错误 } from '@/composables/use前台错误'
import { 使用认证表单仓库 } from '@/stores/认证表单'

const SHOU_JI_HAO_ZHENG_ZE = /^1[3-9]\d{9}$/
const YAN_ZHENG_MA_ZHENG_ZE = /^\d{6}$/
const XIN_MI_MA_ZHENG_ZE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const bd = 使用认证表单仓库()
const route = useRoute()
const router = useRouter()
const { cuoWu: qianTaiCuoWu, jieShou: jieShouQianTai, qingLi: qingLiQianTai } = use前台错误()

const shouJiHao = ref('')
const yanZhengMa = ref('')
const xinMiMa = ref('')
const queRenXinMiMa = ref('')
const xianShiXinMiMa = ref(false)
const xianShiQueRenMiMa = ref(false)
const dangQianBuZhou = ref<1 | 2>(1)
const faSongZhong = ref(false)
const chongZhiZhong = ref(false)
const daoJiShi = ref(0)
const tiaoZhuanMiao = ref(0)
const chongZhiWanCheng = ref(false)
const shouJiHaoJiaoCuo = ref(false)
const xinMiMaShiJiao = ref(false)
type ShuRuKuangShiLi = { 聚焦: () => void }
const shouJiHaoKuang = ref<ShuRuKuangShiLi | null>(null)
const yanZhengMaKuang = ref<ShuRuKuangShiLi | null>(null)
const xinMiMaKuang = ref<ShuRuKuangShiLi | null>(null)

let daiCi = 0
let yiTiaoZhuan = false
let daoJiShiDingShiQi: ReturnType<typeof setInterval> | null = null
let tiaoZhuanDingShiQi: ReturnType<typeof setInterval> | null = null

const shouJiHaoShangFu = computed(() => shouJiHao.value.length > 0)
const yanZhengMaShangFu = computed(() => yanZhengMa.value.length > 0)
const xinMiMaShangFu = computed(() => xinMiMa.value.length > 0)
const queRenMiMaShangFu = computed(() => queRenXinMiMa.value.length > 0)

const shouJiHaoHeFa = computed(() => SHOU_JI_HAO_ZHENG_ZE.test(shouJiHao.value.trim()))
const yanZhengMaHeFa = computed(() => YAN_ZHENG_MA_ZHENG_ZE.test(yanZhengMa.value))
const xinMiMaHeFa = computed(() => XIN_MI_MA_ZHENG_ZE.test(xinMiMa.value))
const miMaYiZhi = computed(() => xinMiMa.value.length > 0 && xinMiMa.value === queRenXinMiMa.value)

const keYiFaSong = computed(
  () => shouJiHaoHeFa.value && daoJiShi.value === 0 && !faSongZhong.value,
)
const keYiChongFa = computed(() => keYiFaSong.value && dangQianBuZhou.value === 2)
const keYiChongZhi = computed(
  () => yanZhengMaHeFa.value && xinMiMaHeFa.value && miMaYiZhi.value && !chongZhiZhong.value,
)

const shouJiHaoTiShi = computed(() =>
  shouJiHaoJiaoCuo.value && !shouJiHaoHeFa.value ? huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu') : '',
)

const miMaTiShi = computed(() => {
  if (!xinMiMaShiJiao.value && queRenXinMiMa.value.length === 0) return ''
  if (!xinMiMaHeFa.value) return huoQuFanYi('renZheng', 'xinMiMaQiangDuBuZu')
  if (queRenXinMiMa.value.length > 0 && !miMaYiZhi.value) return huoQuFanYi('renZheng', 'miMaBuYiZhi')
  return ''
})

const qingQiuCuoWuWeiZhi = ref<'' | 'shouJiHao' | 'yanZhengMa' | 'miMa'>('')

const qingQiuCuoWuWenBen = computed(() => {
  if (qingQiuCuoWuWeiZhi.value === '') return ''
  return qianTaiCuoWu.value?.lianAiWenAn || ''
})

const shouJiHaoCuoWuWenBen = computed(() => {
  if (qingQiuCuoWuWeiZhi.value === 'shouJiHao') return qingQiuCuoWuWenBen.value
  return shouJiHaoTiShi.value
})

const yanZhengMaCuoWuWenBen = computed(() =>
  qingQiuCuoWuWeiZhi.value === 'yanZhengMa' ? qingQiuCuoWuWenBen.value : '',
)

const miMaCuoWuWenBen = computed(() => {
  if (qingQiuCuoWuWeiZhi.value === 'miMa') return qingQiuCuoWuWenBen.value
  return miMaTiShi.value
})

const buZhouLieBiao = computed(() => [
  huoQuFanYi('renZheng', 'zhaoHuiBuZhouYi'),
  huoQuFanYi('renZheng', 'zhaoHuiBuZhouEr'),
])

const faSongWenBen = computed(() =>
  faSongZhong.value ? huoQuFanYi('renZheng', 'faSongZhong') : huoQuFanYi('renZheng', 'huoQuYanZhengMa'),
)

const chongFaWenBen = computed(() => {
  if (faSongZhong.value) return huoQuFanYi('renZheng', 'faSongZhong')
  if (daoJiShi.value > 0) {
    return huoQuFanYi('renZheng', 'zhaoHuiDaoJiShi').replace('{miao}', String(daoJiShi.value))
  }
  return huoQuFanYi('renZheng', 'zhaoHuiChongFa')
})

const tiaoZhuanWenBen = computed(() =>
  huoQuFanYi('renZheng', 'zhaoHuiZiDongTiaoZhuan').replace('{miao}', String(tiaoZhuanMiao.value)),
)

const dengLuLuYou = computed(() => ({
  name: 'dengLu',
  query: shouJiHaoHeFa.value ? { shouJiHao: shouJiHao.value.trim() } : {},
}))

function duQuZhiBiaoMiao(ming: string, houBei: number): number {
  const yuanShi = getComputedStyle(document.documentElement).getPropertyValue(ming).trim()
  const zhi = Number.parseFloat(yuanShi)
  return Number.isFinite(zhi) && zhi > 0 ? Math.round(zhi) : houBei
}

function tingZhiDaoJiShi(): void {
  if (daoJiShiDingShiQi !== null) {
    clearInterval(daoJiShiDingShiQi)
    daoJiShiDingShiQi = null
  }
}

function tingZhiTiaoZhuan(): void {
  if (tiaoZhuanDingShiQi !== null) {
    clearInterval(tiaoZhuanDingShiQi)
    tiaoZhuanDingShiQi = null
  }
}

function kaiShiDaoJiShi(): void {
  tingZhiDaoJiShi()
  daoJiShi.value = duQuZhiBiaoMiao('--zhao-hui-dao-ji-shi-miao', 60)
  daoJiShiDingShiQi = setInterval(() => {
    daoJiShi.value -= 1
    if (daoJiShi.value <= 0) {
      daoJiShi.value = 0
      tingZhiDaoJiShi()
    }
  }, 1000)
}

function kaiShiTiaoZhuan(): void {
  tingZhiTiaoZhuan()
  tiaoZhuanMiao.value = duQuZhiBiaoMiao('--zhao-hui-tiao-zhuan-miao', 8)
  tiaoZhuanDingShiQi = setInterval(() => {
    tiaoZhuanMiao.value -= 1
    if (tiaoZhuanMiao.value <= 0) {
      tiaoZhuanMiao.value = 0
      tingZhiTiaoZhuan()
      qianWangDengLu()
    }
  }, 1000)
}

function qingLiTiShi(): void {
  qingQiuCuoWuWeiZhi.value = ''
  qingLiQianTai()
}

function shouJiHaoShiJiao(): void {
  shouJiHaoJiaoCuo.value = true
}

function juJiao(kong: typeof shouJiHaoKuang): void {
  void nextTick(() => kong.value?.聚焦())
}

function fanHuiShangYiBu(): void {
  daiCi += 1
  faSongZhong.value = false
  dangQianBuZhou.value = 1
  qingLiTiShi()
  juJiao(shouJiHaoKuang)
}

function qianWangDengLu(): void {
  if (yiTiaoZhuan) return
  yiTiaoZhuan = true
  tingZhiDaoJiShi()
  tingZhiTiaoZhuan()
  void router.push(dengLuLuYou.value)
}

async function zhiXingFaSong(): Promise<void> {
  if (!keYiFaSong.value) return
  shouJiHaoJiaoCuo.value = true
  if (dangQianBuZhou.value === 1 && !shouJiHaoHeFa.value) {
    juJiao(shouJiHaoKuang)
    return
  }
  const dai = ++daiCi
  const hao = shouJiHao.value.trim()
  faSongZhong.value = true
  qingLiTiShi()
  qingQiuCuoWuWeiZhi.value = dangQianBuZhou.value === 1 ? 'shouJiHao' : 'yanZhengMa'
  try {
    await faSongMa(hao, YAN_ZHENG_MA_YONG_TU.chongZhiMiMa)
    if (dai !== daiCi) return
    shouJiHao.value = hao
    dangQianBuZhou.value = 2
    kaiShiDaoJiShi()
    juJiao(yanZhengMaKuang)
  } catch (cuoWu) {
    if (dai !== daiCi) return
    jieShouQianTai(cuoWu, zhiXingFaSong)
  } finally {
    if (dai === daiCi) faSongZhong.value = false
  }
}

function zhiXingTiJiao(): void {
  if (dangQianBuZhou.value === 1) {
    void zhiXingFaSong()
    return
  }
  if (chongZhiZhong.value) return
  if (!keYiChongZhi.value) {
    if (!yanZhengMaHeFa.value) juJiao(yanZhengMaKuang)
    else if (!xinMiMaHeFa.value || !miMaYiZhi.value) {
      xinMiMaShiJiao.value = true
      juJiao(xinMiMaKuang)
    }
    return
  }
  void zhiXingChongZhi()
}

async function zhiXingChongZhi(): Promise<void> {
  const dai = ++daiCi
  const hao = shouJiHao.value.trim()
  const ma = yanZhengMa.value
  const miMa = xinMiMa.value
  const queRen = queRenXinMiMa.value
  chongZhiZhong.value = true
  qingLiTiShi()
  qingQiuCuoWuWeiZhi.value = 'miMa'
  try {
    await chongZhiMiMa({ shouJiHao: hao, yanZhengMa: ma, xinMiMa: miMa, queRenXinMiMa: queRen })
    if (dai !== daiCi) return
    tingZhiDaoJiShi()
    daoJiShi.value = 0
    bd.qingKongDengLuZhuCe()
    bd.dengLuShouJiHao = hao
    bd.dengLuMiMa = ''
    yanZhengMa.value = ''
    xinMiMa.value = ''
    queRenXinMiMa.value = ''
    chongZhiWanCheng.value = true
    kaiShiTiaoZhuan()
  } catch (cuoWu) {
    if (dai !== daiCi) return
    jieShouQianTai(cuoWu, zhiXingChongZhi)
  } finally {
    if (dai === daiCi) chongZhiZhong.value = false
  }
}

onMounted(() => {
  const daiRu = typeof route.query.shouJiHao === 'string' ? route.query.shouJiHao.trim() : ''
  if (SHOU_JI_HAO_ZHENG_ZE.test(daiRu)) shouJiHao.value = daiRu
  else if (SHOU_JI_HAO_ZHENG_ZE.test(bd.dengLuShouJiHao)) shouJiHao.value = bd.dengLuShouJiHao
  juJiao(shouJiHaoKuang)
})

onBeforeUnmount(() => {
  daiCi += 1
  tingZhiDaoJiShi()
  tingZhiTiaoZhuan()
})
</script>

<style scoped>
.zhaohui-ju-ke {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: var(--zhao-hui-ju-ke-kuan);
  margin: auto;
}

.zhaohui-jin-du {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--zhao-hui-jin-du-jian-ju);
  margin: 0 0 var(--zhao-hui-jin-du-xia-ju);
  padding: 0;
  list-style: none;
}

.zhaohui-jin-du-xiang {
  display: flex;
  align-items: center;
  gap: var(--jiange-6);
  padding-bottom: var(--zhao-hui-jin-du-xian-gao);
  border-bottom: var(--zhao-hui-jin-du-xian-gao) solid transparent;
  font-size: var(--ziti-xiao);
  color: var(--renzheng-gundong-huakuai-se);
  opacity: 0.55;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.zhaohui-jin-du-xiang.huoYue {
  opacity: 1;
  border-bottom-color: var(--renzheng-gundong-huakuai-se);
}

.zhaohui-jin-du-xiang.yiWanCheng {
  opacity: 0.85;
}

.zhaohui-xu-hao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--zhao-hui-xu-hao-chi-cun);
  height: var(--zhao-hui-xu-hao-chi-cun);
  border: var(--shuru-kuang-biankuang) solid currentColor;
  border-radius: 50%;
  font-size: var(--ziti-xiao);
  line-height: 1;
}

.zhaohui-biao-dan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  width: 100%;
}

.zhaohui-shuo-ming {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  color: var(--renzheng-gundong-huakuai-se);
  opacity: 0.85;
}

.zhaohui-zi-duan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  min-width: 0;
}

.zhaohui-zi-duan-ti-shi {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.6;
  color: var(--cuowu-wenben);
}

.zhaohui-biao-dan .anniu-zhuyao,
.zhaohui-cheng-gong .anniu-zhuyao {
  margin-top: 0;
}

.zhaohui-hang {
  display: flex;
  align-items: stretch;
  gap: var(--jiange-12);
}

.zhaohui-ti-jiao {
  flex: 1;
  min-width: 0;
  width: auto;
}

.zhaohui-shang-yi-bu {
  flex: none;
  min-height: var(--zhao-hui-shang-yi-bu-gao);
  padding: 0 var(--jiange-zhong);
  background: none;
  border: var(--shuru-kuang-biankuang) solid var(--renzheng-gundong-huakuai-se);
  border-radius: var(--jiange-4);
  color: var(--renzheng-gundong-huakuai-se);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.zhaohui-shang-yi-bu:hover {
  opacity: 0.75;
}

.zhaohui-shang-yi-bu:active {
  opacity: 0.55;
}

.zhaohui-shang-yi-bu:focus-visible,
.zhaohui-fan-hui:focus-visible,
.zhaohui-qu-deng-lu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.zhaohui-cheng-gong {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  width: 100%;
}

.zhaohui-cheng-gong-biao-ti {
  margin: 0;
  font-size: var(--ziti-da);
  font-weight: 700;
  text-align: center;
  color: var(--renzheng-gundong-huakuai-se);
}

.zhaohui-cheng-gong-shuo-ming {
  margin: 0;
  font-size: var(--ziti-xiao);
  line-height: 1.7;
  text-align: center;
  color: var(--renzheng-gundong-huakuai-se);
  opacity: 0.85;
}

.zhaohui-dao-ji-shi {
  margin: 0;
  font-size: var(--ziti-xiao);
  text-align: center;
  color: var(--renzheng-gundong-huakuai-se);
  opacity: 0.7;
}

.zhaohui-qu-deng-lu {
  text-decoration: none;
}

.zhaohui-fan-hui {
  align-self: center;
  font-size: var(--ziti-xiao);
  font-weight: 500;
  color: var(--renzheng-gundong-huakuai-se);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity 0.2s ease;
}

.zhaohui-fan-hui:hover {
  opacity: 0.75;
}

.zhaohui-fan-hui:active {
  opacity: 0.55;
}

@media (max-width: 767px) {
  .zhaohui-hang {
    flex-direction: column-reverse;
  }

  .zhaohui-shang-yi-bu {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zhaohui-jin-du-xiang,
  .zhaohui-shang-yi-bu,
  .zhaohui-fan-hui {
    transition: none;
  }
}
</style>
