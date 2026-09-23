<template>
  <div class="denglu-neirong">
    <div ref="biaodanRongqi" class="biaodan-rongqi">
      <div class="juanzhou-gan juanzhou-gan-shang" />
      <div class="biaodan-neirong-qu">
        <div class="biaodan-tou">
          <div class="app-tubiao">💕</div>
          <h1 class="biaodan-biaoti">
            {{ huoQuFanYi('renZheng', 'yingYongMing') }}
          </h1>
          <p class="biaodan-fu-biaoti">
            {{ huoQuFanYi('renZheng', 'yingYongFuBiaoTi') }}
          </p>
        </div>

        <div class="biaodan-gundong">
          <div class="biaoqian-qiehuan">
            <button
              class="biaoqian-anniu"
              :class="{ huoyue: moShi === 'dengLu' }"
              @click="qieHuanMoShi('dengLu')"
            >
              {{ huoQuFanYi('renZheng', 'dengLu') }}
            </button>
            <button
              class="biaoqian-anniu"
              :class="{ huoyue: moShi === 'zhuCe' }"
              @click="qieHuanMoShi('zhuCe')"
            >
              {{ huoQuFanYi('renZheng', 'zhuCe') }}
            </button>
          </div>

          <div v-if="cuoWuXinXi" class="cuowu-tishi">
            {{ cuoWuXinXi }}
          </div>

          <Transition name="biaodan-qiehuan">
          <form v-if="moShi === 'dengLu'" key="dengLu" @submit.prevent="zhiXingDengLu">
              <div class="shuru-zu" :class="{ shangFu: dengLuShouJiShangFu }">
                <input
                  id="denglu-shoujihao"
                  v-model="dengLuShouJiHao"
                  type="tel"
                  class="fenlie-shuru"
                  maxlength="11"
                  autocomplete="username"
                  placeholder=" "
                  required
                  @focus="shouJiHaoJuJiao = true"
                  @blur="shouJiHaoJuJiao = false"
                  @input="tongBuShiJiZhi($event, 'dengLuShouJiHao')"
                  @change="tongBuShiJiZhi($event, 'dengLuShouJiHao')"
                  @animationstart="chuLiZiDongTianChong($event, 'dengLuShouJiHao')"
                />
                <label for="denglu-shoujihao" class="fudong-biaoqian">{{
                  huoQuFanYi('ui', 'shouJiHao')
                }}</label>
              </div>

              <div class="shuru-zu" :class="{ shangFu: dengLuMiMaShangFu }">
                <div class="mima-zu">
                  <input
                    id="denglu-mima"
                    ref="dengLuMiMaShuRuKuang"
                    v-model="dengLuMiMa"
                    :type="xianShiMiMa1 ? 'text' : 'password'"
                    class="fenlie-shuru"
                    autocomplete="current-password"
                    placeholder=" "
                    required
                    @focus="miMaJuJiao = true"
                    @blur="miMaJuJiao = false"
                    @input="tongBuShiJiZhi($event, 'dengLuMiMa')"
                    @change="tongBuShiJiZhi($event, 'dengLuMiMa')"
                    @animationstart="chuLiZiDongTianChong($event, 'dengLuMiMa')"
                  />
                  <label for="denglu-mima" class="fudong-biaoqian">{{
                    huoQuFanYi('ui', 'miMa')
                  }}</label>
                  <button
                    type="button"
                    class="mima-qiehuan"
                    :aria-label="xianShiMiMa1 ? huoQuFanYi('ui', 'yinCangMiMa') : huoQuFanYi('ui', 'xianShiMiMa')"
                    :aria-pressed="xianShiMiMa1"
                    @mousedown.prevent
                    @click="qieHuanMiMaXianShi(1)"
                  >
                    <svg
                      v-if="xianShiMiMa1"
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

              <div class="ji-zhu-xuan-xiang">
                <label class="ji-zhu-xuan-ze">
                  <input
                    :checked="jiZhuZhangHao"
                    type="checkbox"
                    class="ji-zhu-fu-xuan"
                    @change="jiZhuZhangHao = ($event.target as HTMLInputElement).checked"
                  />
                  <span class="ji-zhu-wen-ben" :class="{ 'yi-gou-xuan': jiZhuZhangHao }">{{
                    huoQuFanYi('renZheng', 'jiZhuZhangHao')
                  }}</span>
                </label>
                <label class="ji-zhu-xuan-ze">
                  <input
                    :checked="jiZhuMiMa"
                    type="checkbox"
                    class="ji-zhu-fu-xuan"
                    @change="jiZhuMiMa = ($event.target as HTMLInputElement).checked"
                  />
                  <span class="ji-zhu-wen-ben" :class="{ 'yi-gou-xuan': jiZhuMiMa }">{{
                    huoQuFanYi('renZheng', 'jiZhuMiMa')
                  }}</span>
                </label>
                <label class="ji-zhu-xuan-ze" :class="{ weiJiHuo: !jiZhuMiMa }">
                  <input
                    :checked="ziDongDengLu"
                    :disabled="!jiZhuMiMa"
                    type="checkbox"
                    class="ji-zhu-fu-xuan"
                    @change="ziDongDengLu = ($event.target as HTMLInputElement).checked"
                  />
                  <span class="ji-zhu-wen-ben" :class="{ 'yi-gou-xuan': ziDongDengLu }">{{
                    huoQuFanYi('renZheng', 'ziDongDengLu')
                  }}</span>
                </label>
              </div>

              <button type="submit" class="anniu-zhuyao" :disabled="dengLuZhong || !keYiDengLu">
                {{
                  dengLuZhong
                    ? huoQuFanYi('renZheng', 'dengLuZhong')
                    : huoQuFanYi('renZheng', 'dengLu')
                }}
              </button>
          </form>
          <form v-else key="zhuCe" @submit.prevent="zhiXingZhuCe">
              <div class="shuru-zu" :class="{ shangFu: zhuCeShouJiShangFu }">
                <input
                  id="zhuce-shoujihao"
                  v-model="zhuCeShouJiHao"
                  type="tel"
                  class="fenlie-shuru"
                  maxlength="11"
                  autocomplete="tel"
                  placeholder=" "
                  required
                  @focus="zhuCeShouJiJuJiao = true"
                  @blur="zhuCeShouJiJuJiao = false"
                  @input="tongBuShiJiZhi($event, 'zhuCeShouJiHao')"
                  @change="tongBuShiJiZhi($event, 'zhuCeShouJiHao')"
                  @animationstart="chuLiZiDongTianChong($event, 'zhuCeShouJiHao')"
                />
                <label for="zhuce-shoujihao" class="fudong-biaoqian">{{
                  huoQuFanYi('ui', 'shouJiHao')
                }}</label>
              </div>

              <div class="shuru-zu" :class="{ shangFu: zhuCeYanZhengMaShangFu }">
                <div class="yanzhengma-zu">
                  <div class="yanzhengma-shuru-qu">
                    <input
                      id="zhuce-yanzhengma"
                      v-model="zhuCeYanZhengMa"
                      type="tel"
                      class="fenlie-shuru"
                      maxlength="6"
                      inputmode="numeric"
                      autocomplete="one-time-code"
                      placeholder=" "
                      required
                      @focus="yanZhengMaJuJiao = true"
                      @blur="yanZhengMaJuJiao = false"
                      @input="tongBuShiJiZhi($event, 'zhuCeYanZhengMa')"
                      @change="tongBuShiJiZhi($event, 'zhuCeYanZhengMa')"
                      @animationstart="chuLiZiDongTianChong($event, 'zhuCeYanZhengMa')"
                    />
                    <label for="zhuce-yanzhengma" class="fudong-biaoqian">{{
                      huoQuFanYi('ui', 'yanZhengMa')
                    }}</label>
                  </div>
                  <button
                    type="button"
                    class="fasong-anniu"
                    :disabled="!keYiFaSong || faSongZhong"
                    @click="zhiXingFaSongMa"
                  >
                    {{ faSongWenBen }}
                  </button>
                </div>
              </div>

              <div class="shuru-zu" :class="{ shangFu: zhuCeYongHuMingShangFu }">
                <input
                  id="zhuce-yonghuming"
                  v-model="zhuCeYongHuMing"
                  type="text"
                  class="fenlie-shuru"
                  maxlength="30"
                  autocomplete="username"
                  placeholder=" "
                  required
                  @focus="yongHuMingJuJiao = true"
                  @blur="yongHuMingJuJiao = false"
                  @input="tongBuShiJiZhi($event, 'zhuCeYongHuMing')"
                  @change="tongBuShiJiZhi($event, 'zhuCeYongHuMing')"
                  @animationstart="chuLiZiDongTianChong($event, 'zhuCeYongHuMing')"
                />
                <label for="zhuce-yonghuming" class="fudong-biaoqian">{{
                  huoQuFanYi('ui', 'yongHuMing')
                }}</label>
              </div>

              <div class="shuru-zu" :class="{ shangFu: zhuCeMiMaShangFu }">
                <div class="mima-zu">
                  <input
                    id="zhuce-mima"
                    ref="zhuCeMiMaShuRuKuang"
                    v-model="zhuCeMiMa"
                    :type="xianShiMiMa2 ? 'text' : 'password'"
                    class="fenlie-shuru"
                    autocomplete="new-password"
                    placeholder=" "
                    required
                    @focus="zhuCeMiMaJuJiao = true"
                    @blur="zhuCeMiMaJuJiao = false"
                    @input="tongBuShiJiZhi($event, 'zhuCeMiMa')"
                    @change="tongBuShiJiZhi($event, 'zhuCeMiMa')"
                    @animationstart="chuLiZiDongTianChong($event, 'zhuCeMiMa')"
                  />
                  <label for="zhuce-mima" class="fudong-biaoqian">{{
                    huoQuFanYi('ui', 'miMa')
                  }}</label>
                  <button
                    type="button"
                    class="mima-qiehuan"
                    :aria-label="xianShiMiMa2 ? huoQuFanYi('ui', 'yinCangMiMa') : huoQuFanYi('ui', 'xianShiMiMa')"
                    :aria-pressed="xianShiMiMa2"
                    @mousedown.prevent
                    @click="qieHuanMiMaXianShi(2)"
                  >
                    <svg
                      v-if="xianShiMiMa2"
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

              <!-- C5 未成年人保护：注册强制采集出生日期（FP-14：自绘分段控件，显示口径 YYYY-MM-DD） -->
              <div class="shuru-zu shangFu">
                <ChuShengRiQiXuanZeQi
                  v-model="zhuCeChuShengRiQi"
                  class="fenlie-shuru"
                  :id-qian-zhui="'zhuce-chushengriqi'"
                  :zui-xiao="'1900-01-01'"
                  :zui-da="jinRiRiQi"
                />
                <label for="zhuce-chushengriqi" class="fudong-biaoqian">{{
                  huoQuFanYi('ui', 'chuShengRiQi')
                }}</label>
              </div>

              <div class="xieyi-gouxuan">
                <label class="xieyi-fuxuan">
                  <input v-model="tongYiXieYi" type="checkbox" />
                </label>
                <span class="xieyi-wenben"
                  >{{ huoQuFanYi('renZheng', 'yiYueDu')
                  }}<a class="xieyi-lianjie" @click.prevent="daKaiXieYi('yongHuXieYi')">{{
                    huoQuFanYi('renZheng', 'yongHuXieYi')
                  }}</a
                  >{{ huoQuFanYi('renZheng', 'he')
                  }}<a class="xieyi-lianjie" @click.prevent="daKaiXieYi('yinSiZhengCe')">{{
                    huoQuFanYi('renZheng', 'yinSiZhengCe')
                  }}</a></span
                >
              </div>

              <button
                type="submit"
                class="anniu-zhuyao"
                :disabled="zhuCeZhong || !keYiZhuCe || !tongYiXieYi"
              >
                {{
                  zhuCeZhong
                    ? huoQuFanYi('renZheng', 'zhuCeZhong')
                    : huoQuFanYi('renZheng', 'zhuCe')
                }}
              </button>
          </form>
          </Transition>
        </div>
      </div>
      <div class="juanzhou-gan juanzhou-gan-xia" />
    </div>

    <component
      :is="协议模态框"
      :xian-shi="xieYiXianShi"
      :lei-xing="xieYiLeiXing"
      @guan-bi="xieYiXianShi = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { faSongMa, jianChaShouJiHao } from '@/api/认证'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { huoQuFanYi } from '@/config/translations'
import { quXian } from '@/config/设计令牌'
import 协议模态框 from '@/components/协议模态框.vue'
import ChuShengRiQiXuanZeQi from '@/components/认证/出生日期选择器.vue'

const emit = defineEmits<{
  (e: 'dengLuChengGong'): void
  (e: 'gengXinMoShi', moshi: 'dengLu' | 'zhuCe'): void
}>()

const 用户仓库 = 使用用户仓库()
const bd = 使用认证表单仓库()
const router = useRouter()

type MoShiLeiXing = 'dengLu' | 'zhuCe'
const fuMoShi = inject<Ref<MoShiLeiXing>>('denglu-moshi', ref(bd.moShi))
const moShi = ref<MoShiLeiXing>(bd.moShi)

watch(moShi, (xinMoShi) => {
  bd.moShi = xinMoShi
  emit('gengXinMoShi', xinMoShi)
  fuMoShi.value = xinMoShi
})

const dengLuShouJiHao = ref(bd.dengLuShouJiHao)
const dengLuMiMa = ref(bd.dengLuMiMa)
const jiZhuZhangHao = ref(bd.jiZhuZhangHao)
const jiZhuMiMa = ref(bd.jiZhuMiMa)
const ziDongDengLu = ref(bd.ziDongDengLu)
const zhuCeShouJiHao = ref(bd.zhuCeShouJiHao)
const zhuCeYanZhengMa = ref(bd.zhuCeYanZhengMa)
const zhuCeYongHuMing = ref(bd.zhuCeYongHuMing)
const zhuCeMiMa = ref(bd.zhuCeMiMa)
const zhuCeChuShengRiQi = ref(bd.zhuCeChuShengRiQi)
const cuoWuXinXi = ref('')
const faSongZhong = ref(false)
const dengLuZhong = ref(false)
const zhuCeZhong = ref(false)
const daoJiShi = ref(0)
const xianShiMiMa1 = ref(false)
const xianShiMiMa2 = ref(false)
const tongYiXieYi = ref(bd.tongYiXieYi)
const xieYiXianShi = ref(false)
const xieYiLeiXing = ref<'yongHuXieYi' | 'yinSiZhengCe'>('yongHuXieYi')

function daKaiXieYi(leiXing: 'yongHuXieYi' | 'yinSiZhengCe') {
  xieYiLeiXing.value = leiXing
  xieYiXianShi.value = true
}

watch(tongYiXieYi, (val) => {
  bd.tongYiXieYi = val
})

const shouJiHaoJuJiao = ref(false)
const miMaJuJiao = ref(false)
const zhuCeShouJiJuJiao = ref(false)
const yanZhengMaJuJiao = ref(false)
const yongHuMingJuJiao = ref(false)
const zhuCeMiMaJuJiao = ref(false)

const dengLuShouJiZiDong = ref(false)
const dengLuMiMaZiDong = ref(false)
const zhuCeShouJiZiDong = ref(false)
const zhuCeYanZhengMaZiDong = ref(false)
const zhuCeYongHuMingZiDong = ref(false)
const zhuCeMiMaZiDong = ref(false)

const dengLuShouJiShangFu = computed(
  () => shouJiHaoJuJiao.value || dengLuShouJiHao.value.length > 0 || dengLuShouJiZiDong.value,
)
const dengLuMiMaShangFu = computed(
  () => miMaJuJiao.value || dengLuMiMa.value.length > 0 || dengLuMiMaZiDong.value,
)
const zhuCeShouJiShangFu = computed(
  () => zhuCeShouJiJuJiao.value || zhuCeShouJiHao.value.length > 0 || zhuCeShouJiZiDong.value,
)
const zhuCeYanZhengMaShangFu = computed(
  () => yanZhengMaJuJiao.value || zhuCeYanZhengMa.value.length > 0 || zhuCeYanZhengMaZiDong.value,
)
const zhuCeYongHuMingShangFu = computed(
  () => yongHuMingJuJiao.value || zhuCeYongHuMing.value.length > 0 || zhuCeYongHuMingZiDong.value,
)
const zhuCeMiMaShangFu = computed(
  () => zhuCeMiMaJuJiao.value || zhuCeMiMa.value.length > 0 || zhuCeMiMaZiDong.value,
)

const ZI_DONG_TIAN_CHONG_DONG_HUA_MING = 'ziDongTianChongKaiShi'

type FuDongZiDuanMing =
  | 'dengLuShouJiHao'
  | 'dengLuMiMa'
  | 'zhuCeShouJiHao'
  | 'zhuCeYanZhengMa'
  | 'zhuCeYongHuMing'
  | 'zhuCeMiMa'

const fuDongZhiYingShe: Record<FuDongZiDuanMing, Ref<string>> = {
  dengLuShouJiHao,
  dengLuMiMa,
  zhuCeShouJiHao,
  zhuCeYanZhengMa,
  zhuCeYongHuMing,
  zhuCeMiMa,
}

const fuDongZiDongYingShe: Record<FuDongZiDuanMing, Ref<boolean>> = {
  dengLuShouJiHao: dengLuShouJiZiDong,
  dengLuMiMa: dengLuMiMaZiDong,
  zhuCeShouJiHao: zhuCeShouJiZiDong,
  zhuCeYanZhengMa: zhuCeYanZhengMaZiDong,
  zhuCeYongHuMing: zhuCeYongHuMingZiDong,
  zhuCeMiMa: zhuCeMiMaZiDong,
}

function tongBuShiJiZhi(shijian: Event, ziDuanMing: FuDongZiDuanMing) {
  const shuRuKuang = shijian.target as HTMLInputElement | null
  if (!shuRuKuang) return
  const shiJiZhi = shuRuKuang.value ?? ''
  const muBiao = fuDongZhiYingShe[ziDuanMing]
  const ziDongBiaoZhi = fuDongZiDongYingShe[ziDuanMing]
  if (muBiao.value !== shiJiZhi) muBiao.value = shiJiZhi
  ziDongBiaoZhi.value = shiJiZhi.length > 0
}

function chuLiZiDongTianChong(shijian: Event, ziDuanMing: FuDongZiDuanMing) {
  const dongHuaShijian = shijian as AnimationEvent
  if (dongHuaShijian.animationName !== ZI_DONG_TIAN_CHONG_DONG_HUA_MING) return
  const ziDongBiaoZhi = fuDongZiDongYingShe[ziDuanMing]
  const muBiao = fuDongZhiYingShe[ziDuanMing]
  ziDongBiaoZhi.value = true
  const shuRuKuang = shijian.target as HTMLInputElement | null
  if (shuRuKuang && muBiao.value !== shuRuKuang.value) muBiao.value = shuRuKuang.value
}

function tongBuSuoYouHuiTian() {
  const genRongQi = biaodanRongqi.value as HTMLElement | null
  const yingShe: Array<{ id: string; ziDuanMing: FuDongZiDuanMing }> = [
    { id: 'denglu-shoujihao', ziDuanMing: 'dengLuShouJiHao' },
    { id: 'denglu-mima', ziDuanMing: 'dengLuMiMa' },
    { id: 'zhuce-shoujihao', ziDuanMing: 'zhuCeShouJiHao' },
    { id: 'zhuce-yanzhengma', ziDuanMing: 'zhuCeYanZhengMa' },
    { id: 'zhuce-yonghuming', ziDuanMing: 'zhuCeYongHuMing' },
    { id: 'zhuce-mima', ziDuanMing: 'zhuCeMiMa' },
  ]
  for (const xiang of yingShe) {
    const yuanSu = genRongQi?.querySelector(`#${xiang.id}`) as HTMLInputElement | null
    if (!yuanSu) continue
    const muBiao = fuDongZhiYingShe[xiang.ziDuanMing]
    const ziDongBiaoZhi = fuDongZiDongYingShe[xiang.ziDuanMing]
    const shiJiZhi = yuanSu.value ?? ''
    if (shiJiZhi.length > 0 && muBiao.value !== shiJiZhi) muBiao.value = shiJiZhi
    if (shiJiZhi.length > 0) ziDongBiaoZhi.value = true
    try {
      if (yuanSu.matches(':-webkit-autofill')) ziDongBiaoZhi.value = true
    } catch {
      continue
    }
  }
}

const dengLuMiMaShuRuKuang = ref<HTMLInputElement | null>(null)
const zhuCeMiMaShuRuKuang = ref<HTMLInputElement | null>(null)

function qieHuanMiMaXianShi(xuHao: 1 | 2) {
  if (xuHao === 1) {
    xianShiMiMa1.value = !xianShiMiMa1.value
    nextTick(() => {
      tongBuSuoYouHuiTian()
      dengLuMiMaShuRuKuang.value?.focus()
    })
  } else {
    xianShiMiMa2.value = !xianShiMiMa2.value
    nextTick(() => {
      tongBuSuoYouHuiTian()
      zhuCeMiMaShuRuKuang.value?.focus()
    })
  }
}

const biaodanRongqi = ref<HTMLElement | null>(null)

let daoJiShiDingShiQi: ReturnType<typeof setInterval> | null = null

watch(dengLuShouJiHao, (val) => (bd.dengLuShouJiHao = val))
watch(dengLuMiMa, (val) => (bd.dengLuMiMa = val))
watch(jiZhuZhangHao, (val) => {
  bd.jiZhuZhangHao = val
  if (!val) {
    jiZhuMiMa.value = false
    ziDongDengLu.value = false
  }
})
watch(jiZhuMiMa, (val) => {
  bd.jiZhuMiMa = val
  if (val) {
    jiZhuZhangHao.value = true
  } else {
    ziDongDengLu.value = false
  }
})
watch(ziDongDengLu, (val) => {
  bd.ziDongDengLu = val
  if (val) {
    jiZhuMiMa.value = true
    jiZhuZhangHao.value = true
  }
})
watch(zhuCeShouJiHao, (val) => (bd.zhuCeShouJiHao = val))
watch(zhuCeYanZhengMa, (val) => (bd.zhuCeYanZhengMa = val))
watch(zhuCeYongHuMing, (val) => (bd.zhuCeYongHuMing = val))
watch(zhuCeMiMa, (val) => (bd.zhuCeMiMa = val))
watch(zhuCeChuShengRiQi, (val) => (bd.zhuCeChuShengRiQi = val))

function qieHuanMoShi(xinMoShi: MoShiLeiXing) {
  if (xinMoShi === moShi.value) return
  const dangQianJiaoDian = document.activeElement as HTMLElement | null
  if (
    dangQianJiaoDian &&
    dangQianJiaoDian !== document.body &&
    dangQianJiaoDian.closest('form') &&
    biaodanRongqi.value?.contains(dangQianJiaoDian)
  ) {
    dangQianJiaoDian.blur()
  }
  // FP-02：离场表单在过渡窗口内仍是 DOM 节点（含三段日期控件的段级焦点），
  // 先注销其中焦点，切换后 activeElement 不残留上一表单
  // 滚动口先归零：离场层已脱流覆在顶部，滚动复位藏在淡切之下，不产生可见的滚动甩动
  const gundongQu = biaodanRongqi.value?.querySelector('.biaodan-gundong') as HTMLElement | null
  if (gundongQu) gundongQu.scrollTop = 0
  moShi.value = xinMoShi
}

onMounted(() => {
  bd.jiaZaiJiZhuSheZhi()
  jiZhuZhangHao.value = bd.jiZhuZhangHao
  jiZhuMiMa.value = bd.jiZhuMiMa
  ziDongDengLu.value = bd.ziDongDengLu
  dengLuShouJiHao.value = bd.dengLuShouJiHao
  dengLuMiMa.value = bd.dengLuMiMa
  if (bd.yanZhengMaFaSongShiJian) {
    const shengYu = Math.max(0, 60 - Math.floor((Date.now() - bd.yanZhengMaFaSongShiJian) / 1000))
    if (shengYu > 0) kaiShiDaoJiShi(shengYu)
  }
  nextTick(() => {
    tongBuSuoYouHuiTian()
  })
})

onBeforeUnmount(() => {
  if (daoJiShiDingShiQi) {
    clearInterval(daoJiShiDingShiQi)
    daoJiShiDingShiQi = null
  }
})

const dengLuShouJiHeFa = computed(() => /^1[3-9]\d{9}$/.test(dengLuShouJiHao.value))
const keYiDengLu = computed(() => dengLuShouJiHeFa.value && dengLuMiMa.value.length > 0)

const zhuCeShouJiHeFa = computed(() => /^1[3-9]\d{9}$/.test(zhuCeShouJiHao.value))
const zhuCeYanZhengMaHeFa = computed(() => /^\d{6}$/.test(zhuCeYanZhengMa.value))
const YONG_HU_MING_TE_SHU_ZI_FU = /[!@#$%^&*()+=[\]{}|\\:;"'<>?/~`]/
const zhuCeYongHuMingHeFa = computed(() => {
  const qingLiHou = zhuCeYongHuMing.value.trim()
  return (
    qingLiHou.length >= 1 && qingLiHou.length <= 30 && !YONG_HU_MING_TE_SHU_ZI_FU.test(qingLiHou)
  )
})

// C5 未成年人保护：出生日期必填且年满18周岁，不满14另需监护人分支本阶段直接拦截
function geShiHuaBenDiRiQi(d: Date): string {
  const nian = d.getFullYear()
  const yue = String(d.getMonth() + 1).padStart(2, '0')
  const ri = String(d.getDate()).padStart(2, '0')
  return `${nian}-${yue}-${ri}`
}
const jinRiRiQi = geShiHuaBenDiRiQi(new Date())

function jiSuanZhouSui(chuShengRiQi: string): number | null {
  const piPei = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chuShengRiQi)
  if (!piPei) return null
  const nian = Number(piPei[1])
  const yue = Number(piPei[2])
  const ri = Number(piPei[3])
  const shengRi = new Date(nian, yue - 1, ri)
  if (
    shengRi.getFullYear() !== nian ||
    shengRi.getMonth() !== yue - 1 ||
    shengRi.getDate() !== ri
  ) {
    return null
  }
  const jinTian = new Date()
  if (shengRi > jinTian) return null
  let nianLing = jinTian.getFullYear() - nian
  const weiDaoShengRi =
    jinTian.getMonth() + 1 < yue || (jinTian.getMonth() + 1 === yue && jinTian.getDate() < ri)
  if (weiDaoShengRi) nianLing -= 1
  return nianLing
}

const ZHU_CE_ZUI_XIAO_NIAN_LING = 18

const chuShengRiQiZhouSui = computed(() => jiSuanZhouSui(zhuCeChuShengRiQi.value))

const keYiFaSong = computed(() => zhuCeShouJiHeFa.value && daoJiShi.value === 0)
const keYiZhuCe = computed(
  () =>
    zhuCeShouJiHeFa.value &&
    zhuCeYanZhengMaHeFa.value &&
    zhuCeYongHuMingHeFa.value &&
    zhuCeMiMa.value.length > 0 &&
    (chuShengRiQiZhouSui.value ?? -1) >= ZHU_CE_ZUI_XIAO_NIAN_LING,
)

const faSongWenBen = computed(() => {
  if (faSongZhong.value) return huoQuFanYi('renZheng', 'faSongZhong')
  if (daoJiShi.value > 0) return `${daoJiShi.value}s`
  return huoQuFanYi('renZheng', 'huoQuYanZhengMa')
})

async function zhiXingFaSongMa() {
  if (!keYiFaSong.value) return
  faSongZhong.value = true
  cuoWuXinXi.value = ''
  try {
    // YH-028 注册状态模糊化：不再前端预检枚举，直接发码由服务端统一返回
    await jianChaShouJiHao(zhuCeShouJiHao.value).catch(() => undefined)
    await faSongMa(zhuCeShouJiHao.value)
    bd.yanZhengMaFaSongShiJian = Date.now()
    kaiShiDaoJiShi()
  } catch (cuoWu) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      cuoWuXinXi.value = xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai')
    } else {
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai')
    }
  } finally {
    faSongZhong.value = false
  }
}

function kaiShiDaoJiShi(qiShiZhi = 60) {
  daoJiShi.value = qiShiZhi
  if (daoJiShiDingShiQi) clearInterval(daoJiShiDingShiQi)
  daoJiShiDingShiQi = setInterval(() => {
    daoJiShi.value--
    if (daoJiShi.value <= 0) {
      daoJiShi.value = 0
      if (daoJiShiDingShiQi) {
        clearInterval(daoJiShiDingShiQi)
        daoJiShiDingShiQi = null
      }
    }
  }, 1000)
}

/* ============ FP-05（需求 #15）：登录/注册成功后的真定格飞行 ============
   整段动画由一次性快照层（活卡片的克隆）承载：活 DOM 一个内联样式都不写，
   快照层上的每条 fill:'forwards' 动画都进 定格动画们，收尾无条件全部注销。 */

let 定格层: HTMLElement | null = null
let 定格动画们: Animation[] = []

/** 关键帧的数值端一律向 CSS 要：读回类上的解析结果再写进动画，脚本里不留像素/色值字面量 */
function 计算帧(元素: HTMLElement, 属性清单: string[]): Record<string, string> {
  const 样式 = getComputedStyle(元素)
  const 帧: Record<string, string> = {}
  for (const 属性 of 属性清单) {
    const 值 = 样式.getPropertyValue(属性).trim()
    // 真浏览器在此只会给出已解析值；样式表未注入的宿主（jsdom）会退回 var()/calc() 原文或空串，
    // 那种值不能当关键帧用 —— 丢掉该属性即可，动画退化为隐式起值，不抛错也不影响导航
    if (值 && !值.includes('var(') && !值.includes('calc(')) 帧[属性] = 值
  }
  return 帧
}

function 记动画(动画: Animation): Animation {
  定格动画们.push(动画)
  return 动画
}

function 清理定格层(): void {
  for (const 动画 of 定格动画们) 动画.cancel()
  定格动画们 = []
  定格层?.remove()
  定格层 = null
}

function 建定格层(活卡: HTMLElement): HTMLElement {
  const 矩形 = 活卡.getBoundingClientRect()
  const 层 = 活卡.cloneNode(true) as HTMLElement
  层.classList.add('juan-zhou-dingge')
  // 快照不是第二份可交互表单：摘净 id（否则与活表单撞 id）、整棵子树退出无障碍树并冻结交互
  层.removeAttribute('id')
  for (const 子 of 层.querySelectorAll('[id]')) 子.removeAttribute('id')
  层.setAttribute('aria-hidden', 'true')
  层.setAttribute('inert', '')
  // cloneNode 不带 input 的当前值（value/checked 是 property 而非 attribute），逐位回填才定格得住真正那一帧
  const 源输入们 = 活卡.querySelectorAll('input')
  层.querySelectorAll('input').forEach((克隆输入, 序) => {
    const 源 = 源输入们[序] as HTMLInputElement | undefined
    if (!源) return
    克隆输入.value = 源.value
    克隆输入.checked = 源.checked
  })
  层.style.position = 'fixed'
  层.style.setProperty('--dingge-zuo', `${矩形.left}px`)
  层.style.setProperty('--dingge-shang', `${矩形.top}px`)
  层.style.setProperty('--dingge-kuan', `${矩形.width}px`)
  层.style.setProperty('--dingge-gao', `${矩形.height}px`)
  document.body.appendChild(层)
  return 层
}

async function 定格飞向用户位(层: HTMLElement, 用户位: HTMLElement): Promise<void> {
  const 收束 = (() => {
    层.classList.add('juan-zhou-dingge-shousuo')
    const 帧 = 计算帧(层, ['height', 'border-radius', 'padding'])
    层.classList.remove('juan-zhou-dingge-shousuo')
    return 帧
  })()
  for (const 杆 of 层.querySelectorAll<HTMLElement>('.juanzhou-gan')) {
    杆.classList.add('juan-zhou-dingge-gan')
    const 杆帧 = 计算帧(杆, ['height', 'opacity'])
    杆.classList.remove('juan-zhou-dingge-gan')
    // 属性式关键帧（单端点）= 起点取元素当前计算值，端点取 CSS 解析值 ⇒ 首帧零跳变
    记动画(杆.animate(杆帧, { duration: 250, easing: quXian.biaoZhun, fill: 'forwards' }))
  }
  const 内容区 = 层.querySelector<HTMLElement>('.biaodan-neirong-qu')
  if (内容区) {
    记动画(
      内容区.animate([{ opacity: '0' }], {
        duration: 500,
        easing: quXian.biaoZhun,
        fill: 'forwards',
      }),
    )
  }
  const 卷轴 = 记动画(层.animate([收束], { duration: 700, easing: quXian.biaoZhun, fill: 'forwards' }))
  await 卷轴.finished

  const 起点 = 层.getBoundingClientRect()
  const 落点 = 用户位.getBoundingClientRect()
  const 位移X = 落点.left + 落点.width / 2 - (起点.left + 起点.width / 2)
  const 位移Y = 落点.top + 落点.height / 2 - (起点.top + 起点.height / 2)
  const 落点缩放 = 起点.width > 0 ? Math.min(1, Math.max(0, 落点.width / 起点.width)) : 1
  const 飞行 = 记动画(
    层.animate(
      [{ transform: `translate(${位移X}px, ${位移Y}px) scale(${落点缩放})`, opacity: '0' }],
      { duration: 600, easing: quXian.ruan, fill: 'forwards' },
    ),
  )
  await 飞行.finished
}

async function qiDongDinggeFeixing(mubiaoLuJing: string) {
  const 活卡 = biaodanRongqi.value
  const 用户位 = document.querySelector<HTMLElement>('.yonghu-xuanxiang')
  const 减动效 = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!活卡 || !用户位 || 减动效) {
    // 缺宿主 / 缺落点 / 用户要求减动效：不做位移、直接切换，活 DOM 与动画集合都不留痕
    router.push(mubiaoLuJing)
    return
  }
  用户仓库.mingChengKeJian = false
  const 快照 = 建定格层(活卡)
  定格层 = 快照
  // 快照先落地、页面随即切走：真定格浮在下一屏之上飞向左上角，而不是原地改写还在屏幕上的表单
  router.push(mubiaoLuJing)
  try {
    await 定格飞向用户位(快照, 用户位)
  } catch {
    // 装饰性动画的任何失败都不许挡住登录成功后的导航
  } finally {
    清理定格层()
    用户仓库.mingChengKeJian = true
  }
}

async function zhiXingDengLu() {
  if (!keYiDengLu.value) return
  dengLuZhong.value = true
  cuoWuXinXi.value = ''
  try {
    await 用户仓库.zhiXingDengLu(dengLuShouJiHao.value, dengLuMiMa.value, jiZhuMiMa.value)
    bd.sheZhiJiZhuZhangHaoMiMa(
      dengLuShouJiHao.value,
      dengLuMiMa.value,
      jiZhuZhangHao.value,
      jiZhuMiMa.value,
      ziDongDengLu.value,
    )
    bd.qingKongDengLuZhuCe()
    emit('dengLuChengGong')
    await qiDongDinggeFeixing('/')
  } catch (cuoWu) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      cuoWuXinXi.value = xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'dengLuShiBai')
    } else {
      cuoWuXinXi.value = 用户仓库.zhuangTai.cuo_wu_xin_xi || huoQuFanYi('renZheng', 'dengLuShiBai')
    }
  } finally {
    dengLuZhong.value = false
  }
}

async function zhiXingZhuCe() {
  if (!keYiZhuCe.value) {
    if (!zhuCeShouJiHeFa.value) {
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu')
    } else if (!zhuCeYanZhengMaHeFa.value) {
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'yanZhengMaGeShiCuoWu')
    } else if (YONG_HU_MING_TE_SHU_ZI_FU.test(zhuCeYongHuMing.value.trim())) {
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu')
    } else if (!zhuCeYongHuMingHeFa.value) {
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'yongHuMingChangDuCuoWu')
    } else if (zhuCeMiMa.value.length === 0) {
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'miMaKong')
    } else if (chuShengRiQiZhouSui.value === null) {
      // C5：出生日期缺失或非法
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu')
    } else if ((chuShengRiQiZhouSui.value ?? -1) < ZHU_CE_ZUI_XIAO_NIAN_LING) {
      // C5：未满18周岁硬拦截，不满14另需监护人分支本阶段直接拦截
      cuoWuXinXi.value = huoQuFanYi('renZheng', 'weiChengNianRenJinZhi')
    }
    return
  }
  if (!tongYiXieYi.value) {
    cuoWuXinXi.value = huoQuFanYi('renZheng', 'weiTongYiXieYi')
    return
  }
  zhuCeZhong.value = true
  cuoWuXinXi.value = ''
  try {
    await 用户仓库.zhiXingZhuCe(
      zhuCeShouJiHao.value,
      zhuCeYanZhengMa.value,
      zhuCeYongHuMing.value,
      zhuCeMiMa.value,
      tongYiXieYi.value,
      zhuCeChuShengRiQi.value,
    )
    bd.qingKongDengLuZhuCe()
    await qiDongDinggeFeixing('/')
  } catch (cuoWu) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      cuoWuXinXi.value = xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'zhuCeShiBai')
    } else {
      cuoWuXinXi.value = 用户仓库.zhuangTai.cuo_wu_xin_xi || huoQuFanYi('renZheng', 'zhuCeShiBai')
    }
  } finally {
    zhuCeZhong.value = false
  }
}
</script>

<style scoped>
.denglu-neirong {
  width: 100%;
  max-width: 420px;
  /* 高度吃满认证布局的内容盒：.yemian-buju 由 flex:1 + min-height:0 拿到确定高（认证布局.vue:83/94），
     本层由此成为「确定高」的居中参照，卡片高≤本层 ⇒ 任何分辨率下卡片都装得下视口 */
  height: 100%;
  padding: 0 32px;
  /* 四边 auto 保留（FP-02 契约：不得写回 `margin: 0 auto` 与认证布局 .yemian-buju>* 的同权重外边距抢序）；
     本层高度已确定为 100%，自动外边距吸收的自由空间恒为 0 ⇒ 居中实际由下面的网格承担 */
  margin: auto;
  /* minmax(0,1fr) 让这一行「等于本层高度、且可小于内容高」，卡片的 max-height:100% 才有确定参照；
     auto 行只会被 align-content:stretch 撑大不会被压小，写成普通 grid 就封不住顶 */
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
}

/* 鎏金年代 · Gilded Deco：午夜蓝象牙双档 + 香槟金双线框 + 扇形放射纹 */
.biaodan-rongqi {
  display: flex;
  flex-direction: column;
  /* 卡面色单一真源（FP-03c）：标签缺口衬底与它必须是同一枚令牌，故写成 longhand
     （带 var() 的 background 简写在 jsdom 里整条被丢，层叠结果读不出来） */
  background-color: var(--renzheng-mian-se);
  border: 1px solid rgba(201, 169, 106, 0.34);
  border-radius: 6px;
  box-shadow:
    0 20px 50px rgba(2, 4, 14, 0.55),
    inset 0 0 0 4px var(--renzheng-mian-se),
    inset 0 0 0 5px rgba(201, 169, 106, 0.28);
  padding: 30px 28px 24px;
  position: relative;
  /* 视口内上界：相对 .denglu-neirong 的确定高（网格区域）封顶，超出量交给内层恒定滚动口。
     卡片自身仍是 overflow:hidden —— 它要裁掉 .juanzhou-gan 的 110% 宽与圆角，不是多余裁切层 */
  max-height: 100%;
  overflow: hidden;
}

/* 卡顶扇形放射纹（Art Deco rising sun），置于金线内衬之内 */
.biaodan-rongqi::before {
  content: '';
  position: absolute;
  top: 7px;
  left: 7px;
  right: 7px;
  height: 14px;
  background: repeating-conic-gradient(
    from 90deg at 50% 130%,
    rgba(201, 169, 106, 0.3) 0deg 6deg,
    transparent 6deg 12deg
  );
  border-radius: 0 0 999px 999px;
  pointer-events: none;
}

.juanzhou-gan {
  width: 110%;
  margin-left: -5%;
  height: 0;
  border-radius: 12px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.12),
    rgba(255, 255, 255, 0.06),
    rgba(255, 255, 255, 0.12)
  );
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  opacity: 0;
  flex-shrink: 0;
  transition: none;
}

.biaodan-neirong-qu {
  flex: 1;
  /* min-height:0 才让 flex:1 真的能缩；overflow:hidden 是 R2 点名的多余裁切层，删 ——
     卡片被封顶后需要有人吸收溢出量，那是 .biaodan-gundong 的职责，两层都裁就成了切掉内容 */
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.biaodan-tou {
  text-align: center;
  margin-bottom: var(--jiange-zhong);
}

.app-tubiao {
  font-size: 40px;
  margin-bottom: var(--jiange-xiao);
  filter: drop-shadow(0 4px 12px rgba(201, 169, 106, 0.45));
  display: inline-block;
  animation: tubiao-fudong 3s ease-in-out infinite;
}

@keyframes tubiao-fudong {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.biaodan-biaoti {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  color: #efe9dc;
  margin-bottom: 4px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.biaodan-fu-biaoti {
  font-size: 12px;
  font-weight: 400;
  color: #d5b878;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  text-shadow: none;
  margin-top: 5px;
}

.biaodan-gundong {
  /* 恒定滚动口（需求 #2「登录和注册都必须始终有滚动条」）：
     scroll 而非 auto ⇒ 内容不足一屏时滚动口依然存在可见；条宽/颜色/cursor 全走 global.css 单一真源。
     旧实现是 `overflow:visible` + JS 条件类 xuyao-gundong 才给 50vh/auto，登录态根本没有滚动口 */
  flex: 1;
  min-height: 0;
  overflow-y: scroll;
  /* 登录↔注册过渡的离场层定位宿主（FP-02） */
  position: relative;
}

/* 登录↔注册同层切换过渡（FP-02，复用认证布局 yemian-nei-guodu 的类驱动机制）：
   离场表单脱流覆在滚动口顶部原位淡出，入场表单即刻承担盒高 ⇒ 两列内容不叠排；
   位移量与缓动全部吃既有共用 :root 令牌（--jiange-xiao / --quxian-*），零新量纲字面量 */
.biaodan-qiehuan-enter-active {
  transition:
    opacity 0.3s var(--quxian-tan-chu),
    transform 0.3s var(--quxian-tan-chu);
}

.biaodan-qiehuan-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.biaodan-qiehuan-enter-from {
  opacity: 0;
  transform: translateY(var(--jiange-xiao));
}

.biaodan-qiehuan-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--jiange-xiao) * -1));
}

/* 标签页：金线分隔 + 活动项菱形指示符（衬线宽距） */
.biaoqian-qiehuan {
  display: flex;
  gap: 0;
  margin-bottom: var(--jiange-zhong);
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(201, 169, 106, 0.4);
  padding: 0 0 1px;
}

.biaoqian-anniu {
  flex: 1;
  padding: 10px 4px;
  background: transparent;
  color: rgba(239, 233, 220, 0.55);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif;
  font-size: var(--ziti-zhong);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  transition: all 0.3s ease;
  border: none;
  border-radius: 0;
  position: relative;
}

.biaoqian-anniu.huoyue {
  background: transparent;
  color: #d5b878;
}

.biaoqian-anniu.huoyue::after {
  content: '◆';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -7px;
  font-size: 8px;
  color: #c9a96a;
  background: var(--renzheng-mian-se);
  padding: 0 6px;
  line-height: 1;
}

.shuru-zu {
  position: relative;
  /* FP-04b 字段纵向间距：局部量纲令牌，值只由共用 :root 的节奏令牌派生（24+8=32），
     禁裸 px、禁镜像字面量。上浮标签向上侵入本间距 5px、上一项的发丝线+下内边距占 11px，
     故「上一项底线→本标签顶」净空 = 本值 − 16（旧 24 时净空只剩 8，标签贴着上一项字脚） */
  --ziduan-jian-ju: calc(var(--jiange-da) + var(--jiange-xiao));
  margin-bottom: var(--ziduan-jian-ju);
}

.fenlie-shuru {
  width: 100%;
  padding: 18px 0 10px;
  background-color: transparent;
  background-image: none;
  border: none;
  border-radius: 0;
  /* 静置发丝线（FP-03c）：FP-03 删 .dixian-dixian 后未聚焦输入框零可见边界。
     刻意写成三条 longhand——带 var() 的 border-bottom 简写在 jsdom 里整条被丢，
     门禁就退回到读源码字符串；longhand 让「宽度/样式吃层叠结果、颜色吃令牌」可被解析值断言 */
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: var(--renzheng-shuru-xian-se);
  color: #efe9dc;
  font-size: 15px;
  letter-spacing: 0.06em;
  caret-color: #d5b878;
  -webkit-appearance: none;
  appearance: none;
  box-shadow: none;
  -webkit-text-fill-color: #efe9dc;
  transition: background-color 5000s ease-in-out 0s;
}

.fenlie-shuru::placeholder {
  color: transparent;
}

@keyframes ziDongTianChongKaiShi {
  from {
    opacity: 1;
  }
  to {
    opacity: 1;
  }
}

.fenlie-shuru:-webkit-autofill,
.fenlie-shuru:-webkit-autofill:hover,
.fenlie-shuru:-webkit-autofill:focus,
.fenlie-shuru:-webkit-autofill:active {
  -webkit-text-fill-color: #efe9dc !important;
  caret-color: #d5b878 !important;
  transition: background-color 5000s ease-in-out 0s !important;
  animation-name: ziDongTianChongKaiShi;
  animation-duration: 0.01s;
  animation-iteration-count: 1;
}

.fudong-biaoqian {
  position: absolute;
  left: 0;
  top: 18px;
  font-size: 15px;
  color: rgba(239, 233, 220, 0.62);
  pointer-events: none;
  /* 标签缺口衬底（FP-03c）：与卡面同一枚令牌色，使上浮态的焦点环上边线在标签处断开而不是
     打穿字脚。左右各 4px 由 margin-left 抵消，标签文字仍与输入文本同一起线 */
  background-color: var(--renzheng-mian-se);
  padding-left: 4px;
  padding-right: 4px;
  margin-left: -4px;
  transition: all 0.3s var(--quxian-biao-zhun);
  transform-origin: left center;
}

.shuru-zu.shangFu .fudong-biaoqian,
.shuru-zu:focus-within .fudong-biaoqian,
.shuru-zu:has(.fenlie-shuru:-webkit-autofill) .fudong-biaoqian {
  top: -5px;
  font-size: 11px;
  /* 缺口盒高写死，不靠 UA 的 normal（随字族漂移）：环带 [-1,0] 必须落在标签盒 [-5,8] 内 */
  line-height: 13px;
  color: #d5b878;
  letter-spacing: 0.12em;
}


.mima-zu {
  display: flex;
  align-items: center;
  position: relative;
}

.mima-zu .fenlie-shuru {
  flex: 1;
  padding-right: 40px;
}

.mima-qiehuan {
  position: absolute;
  right: 0;
  top: 12px;
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;
  color: rgba(239, 233, 220, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mima-qiehuan:hover {
  transform: scale(1.15);
  color: #d5b878;
}

.mima-tubiao {
  width: 20px;
  height: 20px;
  display: block;
}

.fenlie-shuru::-ms-reveal,
.fenlie-shuru::-ms-clear {
  display: none;
}

.ji-zhu-xuan-xiang {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: -4px 0 20px;
  padding: 0 2px;
}

.ji-zhu-xuan-ze {
  display: flex;
  align-items: center;
  color: rgba(239, 233, 220, 0.72);
  font-size: var(--ziti-xiao);
  cursor: pointer;
  transition: color 0.2s ease;
}

.ji-zhu-xuan-ze:hover {
  color: #efe9dc;
}

.ji-zhu-xuan-ze.weiJiHuo {
  opacity: 0.45;
}

.ji-zhu-fu-xuan {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
}

.ji-zhu-wen-ben {
  line-height: 1;
  position: relative;
  padding-left: 22px;
}

.ji-zhu-wen-ben::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 1.5px solid rgba(201, 169, 106, 0.75);
  border-radius: 2px;
  background: transparent;
  transition: all 0.2s ease;
}

.ji-zhu-wen-ben.yi-gou-xuan::before {
  background: #c9a96a;
  border-color: #8a6a2f;
}

.ji-zhu-wen-ben.yi-gou-xuan::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 50%;
  width: 4px;
  height: 8px;
  border: solid #17130a;
  border-width: 0 2px 2px 0;
  transform: translateY(-65%) rotate(45deg);
}

/* 原生勾选框被压成 0×0 透明，全局焦点环画在它身上等于没画：
   键盘聚焦时把焦点环转移到自绘方框上（走 FP-01 焦点环令牌，深浅两档均可见） */
.ji-zhu-fu-xuan:focus-visible + .ji-zhu-wen-ben::before {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.yanzhengma-zu {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.yanzhengma-shuru-qu {
  flex: 1;
  position: relative;
}

.fasong-anniu {
  flex-shrink: 0;
  padding: 10px 14px;
  min-height: 44px;
  background: transparent;
  color: #d5b878;
  border: 1.5px solid rgba(201, 169, 106, 0.55);
  border-radius: 4px;
  font-size: var(--ziti-xiao);
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
  transition: all 0.3s ease;
  margin-bottom: 2px;
}

.fasong-anniu:hover:not(:disabled) {
  background: #c9a96a;
  color: #17130a;
  border-color: #8a6a2f;
  box-shadow: 0 4px 14px rgba(201, 169, 106, 0.35);
}

.fasong-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 主按钮：香槟金渐变实底 + 墨字 + 衬线宽距（明确的可点击形态） */
.anniu-zhuyao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  background: linear-gradient(135deg, #e3c98e, #c9a96a 60%, #b3924f);
  color: #17130a;
  border: 1px solid #8a6a2f;
  border-radius: 4px;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.4em;
  text-indent: 0.4em;
  transition: all 0.35s var(--quxian-biao-zhun);
  width: 100%;
  box-shadow:
    0 6px 18px rgba(201, 169, 106, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}

.anniu-zhuyao::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.anniu-zhuyao:hover:not(:disabled)::before {
  left: 100%;
}

.anniu-zhuyao:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow:
    0 8px 24px rgba(201, 169, 106, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.anniu-zhuyao:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    0 3px 10px rgba(201, 169, 106, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.anniu-zhuyao:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cuowu-tishi {
  padding: 10px 14px;
  background: rgba(217, 138, 128, 0.1);
  border: 1px solid rgba(217, 138, 128, 0.35);
  border-radius: 4px;
  color: #d98a80;
  font-size: var(--ziti-xiao);
  margin-bottom: var(--jiange-zhong);
}

.xieyi-gouxuan {
  margin-top: var(--jiange-zhong);
  margin-bottom: var(--jiange-zhong);
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-xiao);
}

.xieyi-fuxuan {
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.xieyi-fuxuan input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.xieyi-wenben {
  font-size: var(--ziti-xiao);
  color: rgba(239, 233, 220, 0.6);
  line-height: 1.5;
}

.xieyi-lianjie {
  color: #d5b878;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.xieyi-lianjie:hover {
  color: #e3c98e;
  text-decoration: underline;
}

/* ============ 浅色主题：鎏金年代象牙白档（登录页固定星夜 3D 背景） ============ */
:root[data-theme='light'] .biaodan-rongqi {
  border-color: rgba(163, 129, 62, 0.4);
  box-shadow:
    0 20px 50px rgba(2, 4, 14, 0.5),
    inset 0 0 0 4px var(--renzheng-mian-se),
    inset 0 0 0 5px rgba(163, 129, 62, 0.3);
}

:root[data-theme='light'] .biaodan-rongqi::before {
  background: repeating-conic-gradient(
    from 90deg at 50% 130%,
    rgba(163, 129, 62, 0.26) 0deg 6deg,
    transparent 6deg 12deg
  );
}

:root[data-theme='light'] .biaodan-biaoti {
  color: #2e2a20;
  text-shadow: none;
}

:root[data-theme='light'] .biaodan-fu-biaoti {
  color: #8a6a2f;
}

:root[data-theme='light'] .biaoqian-qiehuan {
  border-bottom-color: rgba(163, 129, 62, 0.45);
}

:root[data-theme='light'] .biaoqian-anniu {
  color: rgba(46, 42, 32, 0.55);
}

:root[data-theme='light'] .biaoqian-anniu.huoyue {
  color: #8a6a2f;
}

:root[data-theme='light'] .biaoqian-anniu.huoyue::after {
  color: #a3813e;
}

:root[data-theme='light'] .fenlie-shuru {
  color: #2e2a20;
  caret-color: #8a6a2f;
  -webkit-text-fill-color: #2e2a20;
}

:root[data-theme='light'] .fenlie-shuru:-webkit-autofill,
:root[data-theme='light'] .fenlie-shuru:-webkit-autofill:hover,
:root[data-theme='light'] .fenlie-shuru:-webkit-autofill:focus,
:root[data-theme='light'] .fenlie-shuru:-webkit-autofill:active {
  -webkit-text-fill-color: #2e2a20 !important;
  caret-color: #8a6a2f !important;
}

:root[data-theme='light'] .fudong-biaoqian {
  color: rgba(46, 42, 32, 0.6);
}

:root[data-theme='light'] .shuru-zu.shangFu .fudong-biaoqian,
:root[data-theme='light'] .shuru-zu:focus-within .fudong-biaoqian,
:root[data-theme='light'] .shuru-zu:has(.fenlie-shuru:-webkit-autofill) .fudong-biaoqian {
  color: #8a6a2f;
}

:root[data-theme='light'] .mima-qiehuan {
  color: rgba(46, 42, 32, 0.6);
}

:root[data-theme='light'] .mima-qiehuan:hover {
  color: #8a6a2f;
}

:root[data-theme='light'] .ji-zhu-xuan-ze {
  color: rgba(46, 42, 32, 0.72);
}

:root[data-theme='light'] .ji-zhu-xuan-ze:hover {
  color: #2e2a20;
}

:root[data-theme='light'] .ji-zhu-wen-ben::before {
  border-color: rgba(163, 129, 62, 0.75);
}

:root[data-theme='light'] .ji-zhu-wen-ben.yi-gou-xuan::before {
  background: #a3813e;
  border-color: #8a6a2f;
}

:root[data-theme='light'] .fasong-anniu {
  color: #8a6a2f;
  border-color: rgba(163, 129, 62, 0.55);
}

:root[data-theme='light'] .fasong-anniu:hover:not(:disabled) {
  background: #a3813e;
  color: #fffcf3;
  border-color: #8a6a2f;
}

:root[data-theme='light'] .cuowu-tishi {
  background: rgba(176, 58, 46, 0.07);
  border-color: rgba(176, 58, 46, 0.32);
  color: #b03a2e;
}

:root[data-theme='light'] .xieyi-wenben {
  color: rgba(46, 42, 32, 0.62);
}

:root[data-theme='light'] .xieyi-lianjie {
  color: #8a6a2f;
}

:root[data-theme='light'] .xieyi-lianjie:hover {
  color: #a3813e;
}

@media (prefers-reduced-motion: reduce) {
  .fudong-biaoqian,
  .biaoqian-anniu,
  .anniu-zhuyao,
  .fasong-anniu,
  .mima-qiehuan {
    transition: none !important;
  }

  /* 登录↔注册切换在减动效下退化为无位移淡切：淡入淡出的 opacity 过渡保留，位移归零 */
  .biaodan-qiehuan-enter-from,
  .biaodan-qiehuan-leave-to {
    transform: none;
  }
}

/* ============ FP-05（需求 #15）登录/注册成功的一次性定格快照层 ============
   快照层是 .biaodan-rongqi 的克隆，故卡片本体的所有规则（裁切、金线、::before 放射纹）自动跟随；
   下面三条只补"它已脱离文档流、浮在全站之上"与"收束后的目标态"，几何端一律由令牌给出、
   由脚本读回解析值当关键帧 ⇒ 脚本内零像素/色值字面量，改令牌即改动画。 */
.juan-zhou-dingge {
  position: fixed;
  /* 几何端 = 脚本按实测矩形写进快照层的内联自定义属性，本规则只做转接 ⇒ 组件内零像素字面量 */
  left: var(--dingge-zuo);
  top: var(--dingge-shang);
  width: var(--dingge-kuan);
  height: var(--dingge-gao);
  margin: 0;
  z-index: var(--ceng-jingge);
  pointer-events: none;
}

.juan-zhou-dingge-shousuo {
  height: var(--juanzhou-tong-gao-du);
  border-radius: calc(var(--juanzhou-tong-gao-du) * 0.5);
  padding: 0;
}

/* 卷轴杆的目标态：杆高取筒高之半（与 .juanzhou-gan 同特异度、源码在后而生效） */
.juan-zhou-dingge-gan {
  height: calc(var(--juanzhou-tong-gao-du) * 0.5);
  opacity: 1;
}
</style>
