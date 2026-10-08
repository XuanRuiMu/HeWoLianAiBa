<template>
  <div class="wangjimima-neirong">
    <div ref="biaodanRongqi" class="biaodan-rongqi">
      <div class="juanzhou-gan juanzhou-gan-shang" />
      <div class="biaodan-neirong-qu">
        <div class="biaodan-tou">
          <div class="app-tubiao">💕</div>
          <h1 class="biaodan-biaoti">{{ huoQuFanYi('renZheng', 'wangJiMiMaBiaoTi') }}</h1>
          <p class="biaodan-fu-biaoti">{{ huoQuFanYi('renZheng', 'wangJiMiMaFuBiaoTi') }}</p>
        </div>

        <RequestError v-if="qianTaiCuoWu" :cuo-wu="qianTaiCuoWu" @chong-shi="chongShi" />

        <form class="wangjimima-biaodan" @submit.prevent="zhiXingChongZhiMiMa">
          <p class="wangjimima-shuoming">{{ huoQuFanYi('renZheng', 'wangJiMiMaShuoMing') }}</p>

          <div class="shuru-zu">
            <input
              id="wangjimima-shoujihao"
              v-model="chongZhiShouJiHao"
              type="tel"
              class="fenlie-shuru"
              maxlength="11"
              inputmode="numeric"
              autocomplete="username"
              placeholder=" "
              required
              @input="tongBuShouJiHao"
            />
            <label for="wangjimima-shoujihao" class="fudong-biaoqian">{{
              huoQuFanYi('ui', 'shouJiHao')
            }}</label>
          </div>

          <div class="shuru-zu">
            <div class="yanzhengma-zu">
              <div class="yanzhengma-shuru-qu">
                <input
                  id="wangjimima-yanzhengma"
                  v-model="chongZhiYanZhengMa"
                  type="tel"
                  class="fenlie-shuru"
                  maxlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder=" "
                  required
                />
                <label for="wangjimima-yanzhengma" class="fudong-biaoqian">{{
                  huoQuFanYi('ui', 'yanZhengMa')
                }}</label>
              </div>
              <button
                type="button"
                :aria-busy="faSongZhong ? 'true' : 'false'"
                class="fasong-anniu"
                :disabled="!keYiFaSong || faSongZhong"
                @click="zhiXingFaSongMa"
              >
                {{ faSongWenBen }}
              </button>
            </div>
          </div>

          <div class="shuru-zu">
            <div class="mima-zu">
              <input
                id="wangjimima-mima"
                v-model="chongZhiMiMaZhi"
                :type="xianShiMiMa ? 'text' : 'password'"
                class="fenlie-shuru"
                autocomplete="new-password"
                placeholder=" "
                required
              />
              <label for="wangjimima-mima" class="fudong-biaoqian">{{
                huoQuFanYi('renZheng', 'xinMiMa')
              }}</label>
              <button
                type="button"
                class="mima-qiehuan"
                :aria-label="xianShiMiMa ? huoQuFanYi('ui', 'yinCangMiMa') : huoQuFanYi('ui', 'xianShiMiMa')"
                :aria-pressed="xianShiMiMa"
                @mousedown.prevent
                @click="xianShiMiMa = !xianShiMiMa"
              >
                <svg
                  v-if="xianShiMiMa"
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
            </div>
          </div>

          <div class="shuru-zu">
            <div class="mima-zu">
              <input
                id="wangjimima-querenmima"
                v-model="chongZhiQueRenMiMa"
                :type="xianShiMiMa ? 'text' : 'password'"
                class="fenlie-shuru"
                autocomplete="new-password"
                placeholder=" "
                required
              />
              <label for="wangjimima-querenmima" class="fudong-biaoqian">{{
                huoQuFanYi('renZheng', 'queRenXinMiMa')
              }}</label>
            </div>
          </div>

          <p class="wangjimima-tishi">{{ huoQuFanYi('renZheng', 'wangJiMiMaTiShi') }}</p>

          <button
            type="submit"
            class="anniu-zhuyao"
            :aria-busy="chongZhiZhong ? 'true' : 'false'"
            :disabled="chongZhiZhong || !keYiChongZhi"
          >
            {{
              chongZhiZhong
                ? huoQuFanYi('renZheng', 'chongZhiZhong')
                : huoQuFanYi('renZheng', 'chongZhiMiMa')
            }}
          </button>

          <RouterLink class="wangjimima-fanhui" :to="{ name: 'dengLu' }">
            {{ huoQuFanYi('renZheng', 'fanHuiDengLu') }}
          </RouterLink>
        </form>
      </div>
      <div class="juanzhou-gan juanzhou-gan-xia" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { chongZhiMiMa, faSongMa, YAN_ZHENG_MA_YONG_TU } from '@/api/认证'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, 归一前台错误 } from '@/utils/前台错误'
import { huoQuFanYi } from '@/config/translations'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'
import { 使用认证表单仓库 } from '@/stores/认证表单'

const bd = 使用认证表单仓库()
const route = useRoute()
const { cuoWu: qianTaiCuoWu, jieShou: jieShouQianTai, chongShi, qingLi: qingLiQianTai } = use前台错误()

const biaoDanRongqi = ref<HTMLElement | null>(null)
const chongZhiShouJiHao = ref('')
const chongZhiYanZhengMa = ref('')
const chongZhiMiMaZhi = ref('')
const chongZhiQueRenMiMa = ref('')
const xianShiMiMa = ref(false)
const chongZhiZhong = ref(false)
const faSongZhong = ref(false)
const daoJiShi = ref(0)

const shouJiHaoHeFa = computed(() => /^1[3-9]\d{9}$/.test(chongZhiShouJiHao.value.trim()))
const yanZhengMaHeFa = computed(() => /^\d{6}$/.test(chongZhiYanZhengMa.value))
const miMaQiangDuTongGuo = computed(
  () =>
    chongZhiMiMaZhi.value.length >= 8 &&
    /[A-Za-z]/.test(chongZhiMiMaZhi.value) &&
    /[0-9]/.test(chongZhiMiMaZhi.value),
)
const miMaYiZhi = computed(() => chongZhiMiMaZhi.value === chongZhiQueRenMiMa.value)

const keYiFaSong = computed(() => shouJiHaoHeFa.value && daoJiShi.value === 0 && !faSongZhong.value)
const keYiChongZhi = computed(
  () =>
    shouJiHaoHeFa.value &&
    yanZhengMaHeFa.value &&
    miMaQiangDuTongGuo.value &&
    miMaYiZhi.value &&
    !chongZhiZhong.value,
)

const faSongWenBen = computed(() => {
  if (faSongZhong.value) return huoQuFanYi('renZheng', 'faSongZhong')
  if (daoJiShi.value > 0) return `${daoJiShi.value}s`
  return huoQuFanYi('renZheng', 'huoQuYanZhengMa')
})

let daoJiShiDingShiQi: ReturnType<typeof setInterval> | null = null
let faShouDaiCi = 0

function tingZhiDaoJiShi(): void {
  if (daoJiShiDingShiQi !== null) {
    clearInterval(daoJiShiDingShiQi)
    daoJiShiDingShiQi = null
  }
}

function kaiShiDaoJiShi(): void {
  tingZhiDaoJiShi()
  daoJiShi.value = 60
  daoJiShiDingShiQi = setInterval(() => {
    daoJiShi.value -= 1
    if (daoJiShi.value <= 0) tingZhiDaoJiShi()
  }, 1000)
}

onMounted(() => {
  const daiRu = typeof route.query.shouJiHao === 'string' ? route.query.shouJiHao : ''
  if (/^1[3-9]\d{9}$/.test(daiRu)) chongZhiShouJiHao.value = daiRu
  document.getElementById('wangjimima-shoujihao')?.focus()
})

onBeforeUnmount(() => {
  tingZhiDaoJiShi()
})

function tongBuShouJiHao(): void {
  qingLiQianTai()
}

async function zhiXingFaSongMa(): Promise<void> {
  if (!keYiFaSong.value || faSongZhong.value) return
  const daiCi = ++faShouDaiCi
  const shouJiHao = chongZhiShouJiHao.value.trim()
  faSongZhong.value = true
  qingLiQianTai()
  try {
    await faSongMa(shouJiHao, YAN_ZHENG_MA_YONG_TU.chongZhiMiMa)
    if (daiCi !== faShouDaiCi) return
    kaiShiDaoJiShi()
  } catch (cuoWu) {
    if (daiCi !== faShouDaiCi) return
    jieShouQianTai(cuoWu, zhiXingFaSongMa)
  } finally {
    if (daiCi === faShouDaiCi) faSongZhong.value = false
  }
}

function sheZhiBenDiYanZhengCuoWu(yingXiang: string): void {
  jieShouQianTai(
    chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID,
      retryable: false,
      yingXiang,
    }),
  )
}

async function zhiXingChongZhiMiMa(): Promise<void> {
  if (chongZhiZhong.value) return
  if (!keYiChongZhi.value) {
    if (!shouJiHaoHeFa.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
    } else if (!yanZhengMaHeFa.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'yanZhengMaGeShiCuoWu'))
    } else if (!miMaQiangDuTongGuo.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'xinMiMaQiangDuBuZu'))
    } else if (!miMaYiZhi.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'miMaBuYiZhi'))
    }
    return
  }
  const daiCi = ++faShouDaiCi
  const shouJiHao = chongZhiShouJiHao.value.trim()
  const miMa = chongZhiMiMaZhi.value
  const queRenMiMa = chongZhiQueRenMiMa.value
  chongZhiZhong.value = true
  qingLiQianTai()
  try {
    await chongZhiMiMa(shouJiHao, chongZhiYanZhengMa.value, miMa, queRenMiMa)
    if (daiCi !== faShouDaiCi) return
    tingZhiDaoJiShi()
    // 重置即全设备下线：本页留存的旧密码必须丢弃，号码留给登录页直接登录
    bd.qingKongDengLuZhuCe()
    bd.dengLuShouJiHao = shouJiHao
    bd.dengLuMiMa = ''
  } catch (cuoWu) {
    if (daiCi !== faShouDaiCi) return
    jieShouQianTai(cuoWu, zhiXingChongZhiMiMa)
  } finally {
    if (daiCi === faShouDaiCi) chongZhiZhong.value = false
  }
}
</script>

<style scoped>
.wangjimima-neirong {
  width: 100%;
}

.wangjimima-biaodan {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.wangjimima-shuoming,
.wangjimima-tishi {
  margin: 0 0 var(--jiange-xiao);
  font-size: 12px;
  line-height: 1.7;
  color: var(--shuru-xian-changtai-se);
  opacity: 0.85;
}

.wangjimima-tishi {
  margin: var(--jiange-xiao) 0 0;
}

.wangjimima-fanhui {
  align-self: center;
  margin-top: var(--jiange-xiao);
  font-size: 13px;
  color: #d5b878;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.wangjimima-fanhui:hover {
  opacity: 0.75;
}

.wangjimima-fanhui:active {
  opacity: 0.55;
}

.wangjimima-fanhui:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}
</style>
