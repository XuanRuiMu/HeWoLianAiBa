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

        <div class="biaodan-gundong" :class="{ 'xuyao-gundong': moShi === 'zhuCe' }">
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

          <form v-if="moShi === 'dengLu'" @submit.prevent="zhiXingDengLu">
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
                <div class="dixian-dixian" />
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
                  <div class="dixian-dixian" />
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
          <form v-else @submit.prevent="zhiXingZhuCe">
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
                <div class="dixian-dixian" />
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
                    <div class="dixian-dixian" />
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
                <div class="dixian-dixian" />
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
                  <div class="dixian-dixian" />
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

              <!-- C5 未成年人保护：注册强制采集出生日期 -->
              <div class="shuru-zu shangFu">
                <input
                  id="zhuce-chushengriqi"
                  v-model="zhuCeChuShengRiQi"
                  type="date"
                  class="fenlie-shuru shengri-shuru"
                  :min="'1900-01-01'"
                  :max="jinRiRiQi"
                  required
                />
                <label for="zhuce-chushengriqi" class="fudong-biaoqian">{{
                  huoQuFanYi('ui', 'chuShengRiQi')
                }}</label>
                <div class="dixian-dixian" />
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

async function qiDongJuanZhouDongHua(mubiaoLuJing: string) {
  const pianHaoJianShaoDongHua = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  用户仓库.mingChengKeJian = false
  const biaodan = biaodanRongqi.value
  if (!biaodan) {
    用户仓库.mingChengKeJian = true
    router.push(mubiaoLuJing)
    return
  }

  if (pianHaoJianShaoDongHua) {
    biaodan.style.opacity = '0'
    用户仓库.mingChengKeJian = true
    router.push(mubiaoLuJing)
    return
  }

  const caidanYongHu = document.querySelector('.yonghu-xuanxiang') as HTMLElement | null
  const shangGan = biaodan.querySelector('.juanzhou-gan-shang') as HTMLElement | null
  const xiaGan = biaodan.querySelector('.juanzhou-gan-xia') as HTMLElement | null
  const neirongQu = biaodan.querySelector('.biaodan-neirong-qu') as HTMLElement | null

  biaodan.style.pointerEvents = 'none'
  biaodan.style.overflow = 'hidden'
  biaodan.style.willChange = 'height, border-radius, background-color, padding, transform, opacity'

  const yuanShiGaoDu = biaodan.offsetHeight
  const yuanShiKuanDu = biaodan.offsetWidth
  const juanTongGaoDu = 28

  if (shangGan) {
    shangGan.animate(
      [
        { opacity: 0, height: '0px' },
        { opacity: 1, height: '14px' },
      ],
      { duration: 250, easing: 'ease-out', fill: 'forwards' },
    )
  }
  if (xiaGan) {
    xiaGan.animate(
      [
        { opacity: 0, height: '0px' },
        { opacity: 1, height: '14px' },
      ],
      { duration: 250, easing: 'ease-out', fill: 'forwards' },
    )
  }

  if (neirongQu) {
    neirongQu.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 500,
      easing: quXian.biaoZhun,
      fill: 'forwards',
    })
  }

  const juanQiDongHua = biaodan.animate(
    [
      {
        height: `${yuanShiGaoDu}px`,
        borderRadius: '24px',
        backgroundColor: 'rgba(20, 24, 40, 0.6)',
        padding: '28px 28px 24px',
      },
      {
        height: `${yuanShiGaoDu * 0.35}px`,
        borderRadius: '18px',
        backgroundColor: 'rgba(20, 24, 40, 0.7)',
        padding: '6px 10px',
        offset: 0.5,
      },
      {
        height: `${juanTongGaoDu}px`,
        borderRadius: '14px',
        backgroundColor: 'rgba(20, 24, 40, 0.75)',
        padding: '0px',
      },
    ],
    { duration: 700, easing: quXian.biaoZhun, fill: 'forwards' },
  )

  await juanQiDongHua.finished

  biaodan.style.opacity = '0'
  biaodan.style.height = `${juanTongGaoDu}px`
  biaodan.style.width = `${yuanShiKuanDu}px`
  biaodan.style.borderRadius = '14px'
  biaodan.style.background = 'var(--boli-beijing-shen)'
  biaodan.style.backdropFilter = 'blur(16px)'
  biaodan.style.setProperty('-webkit-backdrop-filter', 'blur(16px)')
  biaodan.style.border = '1px solid var(--boli-biankuang-liang)'
  biaodan.style.padding = '0'
  biaodan.style.boxShadow =
    '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.08)'

  if (shangGan) {
    shangGan.style.display = 'none'
  }
  if (xiaGan) {
    xiaGan.style.display = 'none'
  }
  if (neirongQu) {
    neirongQu.style.display = 'none'
  }

  juanQiDongHua.cancel()

  await new Promise<void>((jieJue) =>
    requestAnimationFrame(() => requestAnimationFrame(() => jieJue())),
  )

  biaodan.style.opacity = '1'

  if (caidanYongHu) {
    const biaodanJu = biaodan.getBoundingClientRect()
    const mubiaoJu = caidanYongHu.getBoundingClientRect()
    const qiShiX = biaodanJu.left + biaodanJu.width / 2
    const qiShiY = biaodanJu.top + biaodanJu.height / 2
    const muBiaoX = mubiaoJu.left + mubiaoJu.width / 2
    const muBiaoY = mubiaoJu.top + mubiaoJu.height / 2
    const pianYiX = muBiaoX - qiShiX
    const pianYiY = muBiaoY - qiShiY

    biaodan.style.willChange = 'transform, opacity'

    const feiXingDongHua = biaodan.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate(${pianYiX * 0.5}px, ${pianYiY * 0.5}px) scale(0.6)`,
          opacity: 0.7,
          offset: 0.4,
        },
        { transform: `translate(${pianYiX}px, ${pianYiY}px) scale(0.15)`, opacity: 0 },
      ],
      { duration: 600, easing: quXian.ruan, fill: 'forwards' },
    )

    await feiXingDongHua.finished
    biaodan.style.opacity = '0'
    feiXingDongHua.cancel()
  }

  用户仓库.mingChengKeJian = true
  router.push(mubiaoLuJing)
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
    await qiDongJuanZhouDongHua('/')
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
    await qiDongJuanZhouDongHua('/')
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
  padding: 0 32px;
  /* 四边 auto：纵向自动外边距负责在认证布局滚动口内居中（内容超高时自动归零、顶部可达）。
     原 `margin: 0 auto` 与认证布局 `.yemian-buju > *` 的 margin auto 同权重，
     谁后注入谁生效，导致登录卡片纵向居中随样式加载顺序漂移 */
  margin: auto;
}

/* 鎏金年代 · Gilded Deco：午夜蓝象牙双档 + 香槟金双线框 + 扇形放射纹 */
.biaodan-rongqi {
  display: flex;
  flex-direction: column;
  background: #161b2e;
  border: 1px solid rgba(201, 169, 106, 0.34);
  border-radius: 6px;
  box-shadow:
    0 20px 50px rgba(2, 4, 14, 0.55),
    inset 0 0 0 4px #161b2e,
    inset 0 0 0 5px rgba(201, 169, 106, 0.28);
  padding: 30px 28px 24px;
  position: relative;
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
  overflow: hidden;
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
  overflow: visible;
}

.biaodan-gundong.xuyao-gundong {
  max-height: 50vh;
  overflow-y: auto;
}

.biaodan-gundong.xuyao-gundong::-webkit-scrollbar {
  width: var(--gundong-tiao-kuan-du);
}

.biaodan-gundong.xuyao-gundong::-webkit-scrollbar-track {
  background: var(--gundong-tiao-guidao);
}

.biaodan-gundong.xuyao-gundong::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-huakuai);
  border-radius: var(--gundong-tiao-kuan-du);
}

.biaodan-gundong.xuyao-gundong::-webkit-scrollbar-thumb:hover {
  background: var(--gundong-tiao-huakuai-hover);
}

/* 标签页：金线分隔 + 活动项菱形指示符（衬线宽距） */
.biaoqian-qiehuan {
  display: flex;
  gap: 0;
  margin-bottom: var(--jiange-zhong);
  border-radius: 0;
  overflow: visible;
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
  background: #161b2e;
  padding: 0 6px;
  line-height: 1;
}

.shuru-zu {
  position: relative;
  margin-bottom: var(--jiange-da);
}

.fenlie-shuru {
  width: 100%;
  padding: 18px 0 10px;
  background-color: transparent;
  background-image: none;
  border: none;
  border-radius: 0;
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
  transition: all 0.3s var(--quxian-biao-zhun);
  transform-origin: left center;
}

.shuru-zu.shangFu .fudong-biaoqian,
.shuru-zu:focus-within .fudong-biaoqian,
.shuru-zu:has(.fenlie-shuru:-webkit-autofill) .fudong-biaoqian {
  top: -5px;
  font-size: 11px;
  color: #d5b878;
  letter-spacing: 0.12em;
}

.dixian-dixian {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(201, 169, 106, 0.28);
  transition: background 0.3s ease;
}

.dixian-dixian::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, #e3c98e, #c9a96a);
  transform: scaleX(0);
  transform-origin: center center;
  transition: transform 0.4s var(--quxian-biao-zhun);
}

.shuru-zu:focus-within .dixian-dixian {
  background: transparent;
}

.shuru-zu:focus-within .dixian-dixian::after {
  transform: scaleX(1);
}

.shuru-zu.shangFu .dixian-dixian,
.shuru-zu:has(.fenlie-shuru:-webkit-autofill) .dixian-dixian {
  background: rgba(201, 169, 106, 0.45);
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

.mima-zu .dixian-dixian {
  right: 40px;
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

/* C5：日期输入在深色主题下保持可读 */
.shengri-shuru {
  color-scheme: dark;
}

.shengri-shuru::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.6;
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
  background: #fffcf3;
  border-color: rgba(163, 129, 62, 0.4);
  box-shadow:
    0 20px 50px rgba(2, 4, 14, 0.5),
    inset 0 0 0 4px #fffcf3,
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
  background: #fffcf3;
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

:root[data-theme='light'] .dixian-dixian {
  background: rgba(163, 129, 62, 0.35);
}

:root[data-theme='light'] .dixian-dixian::after {
  background: linear-gradient(90deg, #b3924f, #8a6a2f);
}

:root[data-theme='light'] .shuru-zu.shangFu .dixian-dixian,
:root[data-theme='light'] .shuru-zu:has(.fenlie-shuru:-webkit-autofill) .dixian-dixian {
  background: rgba(163, 129, 62, 0.5);
}

:root[data-theme='light'] .mima-qiehuan {
  color: rgba(46, 42, 32, 0.6);
}

:root[data-theme='light'] .mima-qiehuan:hover {
  color: #8a6a2f;
}

:root[data-theme='light'] .shengri-shuru {
  color-scheme: light;
}

:root[data-theme='light'] .shengri-shuru::-webkit-calendar-picker-indicator {
  filter: none;
  opacity: 0.6;
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
  .dixian-dixian::after,
  .biaoqian-anniu,
  .anniu-zhuyao,
  .fasong-anniu,
  .mima-qiehuan {
    transition: none !important;
  }
}
</style>
