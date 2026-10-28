<template>
  <div class="denglu-neirong">
    <div
      ref="biaodanRongqi"
      class="biaodan-rongqi"
      @focusin="tongBuSuoYouHuiTian(true)"
      @pointerdown.capture="tongBuSuoYouHuiTian(true)"
      @keydown.capture="tongBuSuoYouHuiTian(true)"
    >
      <div class="biaodan-neirong-qu">
        <div class="biaodan-tou">
          <h1 class="biaodan-biaoti">
            {{ huoQuFanYi('renZheng', 'yingYongMing') }}
          </h1>
          <p class="biaodan-fu-biao-ti">
            <span class="fu-biao-hang">
              <span
                v-for="(duan, duanXuHao) in 副标题段"
                :key="duanXuHao"
                :class="duan.jiHao !== null ? 'fu-biao-ci-' + duan.jiHao : undefined"
              >{{ duan.wenBen }}</span>
            </span>
            <span class="fu-biao-hang">{{ huoQuFanYi('renZheng', 'dengLuFuBiaoTiHouBan') }}</span>
          </p>
        </div>

        <div class="biaoqian-qiehuan" role="tablist">
          <button
            type="button"
            class="biaoqian-anniu"
            :class="{ huoyue: moShi === 'dengLu' }"
            role="tab"
            :aria-selected="moShi === 'dengLu' ? 'true' : 'false'"
            aria-busy="false"
            @click="qieHuanMoShi('dengLu')"
          >
            {{ huoQuFanYi('renZheng', 'dengLu') }}
          </button>
          <button
            type="button"
            class="biaoqian-anniu"
            :class="{ huoyue: moShi === 'zhuCe' }"
            role="tab"
            :aria-selected="moShi === 'zhuCe' ? 'true' : 'false'"
            aria-busy="false"
            @click="qieHuanMoShi('zhuCe')"
          >
            {{ huoQuFanYi('renZheng', 'zhuCe') }}
          </button>
        </div>

        <RequestError
          v-if="qianTaiCuoWu"
          :cuo-wu="qianTaiCuoWu"
          :zhong-zai="faSongZhong || dengLuZhong || zhuCeZhong"
          @chong-shi="chongShi"
        />

        <div class="gundong-waike">
          <div ref="gundongRongQi" class="biaodan-gundong" @scroll="chuLiGundongGunDong">
          <div
            class="biaodan-xingwei"
            :class="moShi === 'dengLu' ? 'denglu-moshi' : 'zhuce-moshi'"
          >
            <div
              class="biaodan-moshi-pane denglu-moshi-pane"
              :class="{ 'shi-fu-yong': moShi === 'dengLu' }"
              :inert="moShi !== 'dengLu'"
            >
              <Transition :name="qieHuanDongHua" @before-leave="biaoJiLiChangBiaoDan">
          <form
            v-if="moShi === 'dengLu'"
            key="dengLu"
            class="denglu-biaodan"
            data-form-mode="dengLu"
            :aria-hidden="moShi !== 'dengLu' ? 'true' : undefined"
            :inert="moShi !== 'dengLu' ? true : undefined"
            :tabindex="moShi !== 'dengLu' ? '-1' : undefined"
            @submit.prevent="zhiXingDengLu"
          >
              <HengTiaoShuRuKuang
                标识="denglu-shoujihao"
                :模型值="dengLuShouJiHao"
                :类型="'tel'"
                :最大长度="11"
                自动完成="username"
                :上浮="dengLuShouJiShangFu"
                必填
                :标签="huoQuFanYi('ui', 'shouJiHao')"
                @geng-xin="dengLuShouJiHao = $event"
                @jiao-dian="shouJiHaoJuJiao = true"
                @shi-jiao="shouJiHaoJuJiao = false"
                @shu-ru="tongBuShiJiZhi($event, 'dengLuShouJiHao')"
                @bian-geng="tongBuShiJiZhi($event, 'dengLuShouJiHao')"
                @zi-dong-tian-chong="chuLiZiDongTianChong($event, 'dengLuShouJiHao')"
              />

              <HengTiaoShuRuKuang
                ref="dengLuMiMaShuRuKuang"
                标识="denglu-mima"
                :模型值="dengLuMiMa"
                :类型="xianShiMiMa1 ? 'text' : 'password'"
                自动完成="current-password"
                :上浮="dengLuMiMaShangFu"
                必填
                包裹类="mima-zu"
                :标签="huoQuFanYi('ui', 'miMa')"
                @geng-xin="dengLuMiMa = $event"
                @jiao-dian="miMaJuJiao = true"
                @shi-jiao="miMaJuJiao = false"
                @shu-ru="tongBuShiJiZhi($event, 'dengLuMiMa')"
                @bian-geng="tongBuShiJiZhi($event, 'dengLuMiMa')"
                @zi-dong-tian-chong="chuLiZiDongTianChong($event, 'dengLuMiMa')"
              >
<button
                    type="button"
                    aria-busy="false"
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
              </HengTiaoShuRuKuang>

              <div class="ji-zhu-xuan-xiang">
                <div class="ji-zhu-hang-1">
                  <label class="ji-zhu-xuan-ze">
                    <input
                      :checked="jiZhuZhangHao"
                      type="checkbox"
                      class="ji-zhu-fu-xuan"
                      @change="bd.gengXinJiZhuZhangHao(($event.target as HTMLInputElement).checked)"
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
                      @change="bd.gengXinJiZhuMiMa(($event.target as HTMLInputElement).checked)"
                    />
                    <span class="ji-zhu-wen-ben" :class="{ 'yi-gou-xuan': jiZhuMiMa }">{{
                      huoQuFanYi('renZheng', 'jiZhuMiMa')
                    }}</span>
                  </label>
                </div>
                <div class="ji-zhu-hang-2">
                  <label class="ji-zhu-xuan-ze">
                    <input
                      :checked="ziDongDengLu"
                      type="checkbox"
                      class="ji-zhu-fu-xuan"
                      @change="bd.gengXinZiDongDengLu(($event.target as HTMLInputElement).checked)"
                    />
                    <span class="ji-zhu-wen-ben" :class="{ 'yi-gou-xuan': ziDongDengLu }">{{
                      huoQuFanYi('renZheng', 'ziDongDengLu')
                    }}</span>
                  </label>
                  <RouterLink
                    type="button"
                    class="wangji-mima-lianjie"
                    :to="{ name: 'wangJiMiMa', query: { shouJiHao: dengLuShouJiHao } }"
                  >
                    {{ huoQuFanYi('renZheng', 'wangJiMiMa') }}
                  </RouterLink>
                </div>
              </div>

              <button
                :type="dengLuZhong ? 'button' : 'submit'"
                class="anniu-zhuyao"
                :aria-busy="dengLuZhong ? 'true' : 'false'"
                :disabled="!dengLuZhong && !keYiDengLu"
                @click="dengLuZhong ? quXiaoDengLu() : undefined"
              >
                {{
                  dengLuZhong
                    ? huoQuFanYi('renZheng', 'dengLuQuXiao')
                    : huoQuFanYi('renZheng', 'dengLu')
                }}
              </button>
          </form>
              </Transition>
            </div>
            <div
              class="biaodan-moshi-pane zhuce-moshi-pane"
              :class="{ 'shi-fu-yong': moShi === 'zhuCe' }"
              :inert="moShi !== 'zhuCe'"
            >
              <Transition :name="qieHuanDongHua" @before-leave="biaoJiLiChangBiaoDan">
          <form
            v-if="moShi === 'zhuCe'"
            key="zhuCe"
            class="zhuce-biaodan"
            data-form-mode="zhuCe"
            :aria-hidden="moShi !== 'zhuCe' ? 'true' : undefined"
            :inert="moShi !== 'zhuCe' ? true : undefined"
            :tabindex="moShi !== 'zhuCe' ? '-1' : undefined"
            @submit.prevent="zhiXingZhuCe"
          >
              <HengTiaoShuRuKuang
                标识="zhuce-shoujihao"
                :模型值="zhuCeShouJiHao"
                :类型="'tel'"
                :最大长度="11"
                自动完成="tel"
                :上浮="zhuCeShouJiShangFu"
                必填
                :标签="huoQuFanYi('ui', 'shouJiHao')"
                @geng-xin="zhuCeShouJiHao = $event"
                @jiao-dian="zhuCeShouJiJuJiao = true"
                @shi-jiao="zhuCeShouJiJuJiao = false"
                @shu-ru="tongBuShiJiZhi($event, 'zhuCeShouJiHao')"
                @bian-geng="tongBuShiJiZhi($event, 'zhuCeShouJiHao')"
                @zi-dong-tian-chong="chuLiZiDongTianChong($event, 'zhuCeShouJiHao')"
              />

              <HengTiaoShuRuKuang
                标识="zhuce-yanzhengma"
                :模型值="zhuCeYanZhengMa"
                :类型="'tel'"
                :最大长度="6"
                自动完成="one-time-code"
                :上浮="zhuCeYanZhengMaShangFu"
                必填
                包裹类="yanzhengma-zu"
                内层类="yanzhengma-shuru-qu"
                :标签="huoQuFanYi('ui', 'yanZhengMa')"
                @geng-xin="zhuCeYanZhengMa = $event"
                @jiao-dian="yanZhengMaJuJiao = true"
                @shi-jiao="yanZhengMaJuJiao = false"
                @shu-ru="tongBuShiJiZhi($event, 'zhuCeYanZhengMa')"
                @bian-geng="tongBuShiJiZhi($event, 'zhuCeYanZhengMa')"
                @zi-dong-tian-chong="chuLiZiDongTianChong($event, 'zhuCeYanZhengMa')"
              >
                <button
                  type="button"
                  :aria-busy="faSongZhong ? 'true' : 'false'"
                  class="fasong-anniu"
                  :disabled="!keYiFaSong || faSongZhong"
                  @click="zhiXingFaSongMa"
                >
                  {{ faSongWenBen }}
                </button>
              </HengTiaoShuRuKuang>

              <HengTiaoShuRuKuang
                标识="zhuce-yonghuming"
                :模型值="zhuCeYongHuMing"
                :类型="'text'"
                :最大长度="30"
                自动完成="username"
                :上浮="zhuCeYongHuMingShangFu"
                必填
                :标签="huoQuFanYi('ui', 'yongHuMing')"
                @geng-xin="zhuCeYongHuMing = $event"
                @jiao-dian="yongHuMingJuJiao = true"
                @shi-jiao="yongHuMingJuJiao = false"
                @shu-ru="tongBuShiJiZhi($event, 'zhuCeYongHuMing')"
                @bian-geng="tongBuShiJiZhi($event, 'zhuCeYongHuMing')"
                @zi-dong-tian-chong="chuLiZiDongTianChong($event, 'zhuCeYongHuMing')"
              />

              <HengTiaoShuRuKuang
                ref="zhuCeMiMaShuRuKuang"
                标识="zhuce-mima"
                :模型值="zhuCeMiMa"
                :类型="xianShiMiMa2 ? 'text' : 'password'"
                自动完成="new-password"
                :上浮="zhuCeMiMaShangFu"
                必填
                包裹类="mima-zu"
                :标签="huoQuFanYi('ui', 'miMa')"
                @geng-xin="zhuCeMiMa = $event"
                @jiao-dian="zhuCeMiMaJuJiao = true"
                @shi-jiao="zhuCeMiMaJuJiao = false"
                @shu-ru="tongBuShiJiZhi($event, 'zhuCeMiMa')"
                @bian-geng="tongBuShiJiZhi($event, 'zhuCeMiMa')"
                @zi-dong-tian-chong="chuLiZiDongTianChong($event, 'zhuCeMiMa')"
              >
<button
                    type="button"
                    aria-busy="false"
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
              </HengTiaoShuRuKuang>

              
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
                  <input
                    v-model="tongYiXieYi"
                    type="checkbox"
                    :class="xieYiGouXuanSeLei"
                  />
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
                :aria-busy="zhuCeZhong ? 'true' : 'false'"
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
          </div>
          <div
            ref="gundongZhuangShi"
            class="gundong-zhuangshi"
            aria-hidden="true"
            @wheel.prevent="chuLiZhuangShiGunLun"
          >
            <div class="gundong-jiantou gundong-jiantou-shang" @pointerdown.prevent="anJianTouGunDong(-1)" />
            <div ref="gundongGuiDao" class="gundong-guidao" @pointerdown.prevent="anGuiDaoTiaoZhuan">
              <div
                ref="gundongHuaKuai"
                class="gundong-huakuai" aria-hidden="true"
                @pointerdown.prevent.stop="kaiShiTuoDongHuaKuai"
                @pointermove="tuoDongHuaKuai"
                @pointerup="jieShuTuoDongHuaKuai"
                @pointercancel="jieShuTuoDongHuaKuai"
              />
            </div>
            <div class="gundong-jiantou gundong-jiantou-xia" @pointerdown.prevent="anJianTouGunDong(1)" />
          </div>
        </div>
      </div>
    </div>

    <component
      :is="协议模态框"
      :xian-shi="xieYiXianShi"
      :lei-xing="xieYiLeiXing"
      @guan-bi="xieYiXianShi = false"
    />
    <RenJiYanZheng
      ref="renJiZuJian"
      :xian-shi="renJiXianShi"
      :yong-tu="YAN_ZHENG_MA_YONG_TU.zhuCe"
      :deng-dai-zhong="faSongZhong"
      @guan-bi="renJiXianShi = false"
      @ti-jiao="tiJiaoRenJi"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { faSongMa, jianChaShouJiHao, YAN_ZHENG_MA_YONG_TU, type 人机验证答案 } from '@/api/认证'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, 归一前台错误 } from '@/utils/前台错误'
import { shiRenJiYanZhengShiBai, type 人机测试实例 } from '@/utils/人机验证'
import HengTiaoShuRuKuang from '@/components/表单/横条输入框.vue'
import { huoQuFanYi } from '@/config/翻译表'
import { quXian } from '@/config/设计令牌'
import 协议模态框 from '@/components/协议模态框.vue'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'
import ChuShengRiQiXuanZeQi from '@/components/认证/出生日期选择器.vue'
import RenJiYanZheng from '@/components/认证/人机测试.vue'

const emit = defineEmits<{
  (e: 'dengLuChengGong'): void
  (e: 'gengXinMoShi', moshi: 'dengLu' | 'zhuCe'): void
}>()

const 用户仓库 = 使用用户仓库()
const bd = 使用认证表单仓库()
const router = useRouter()

type MoShiLeiXing = 'dengLu' | 'zhuCe'
const fuMoShi = inject<Ref<MoShiLeiXing>>('denglu-moshi', ref(bd.moShi))
const dengLuTuiChangZhong = inject<Ref<boolean>>('dengLuTuiChangZhong', ref(false))
const moShi = ref<MoShiLeiXing>(bd.moShi)
const qieHuanFangXiang = ref<'you' | 'zuo'>('you')
const qieHuanDongHua = computed(() => `biaodan-qiehuan-${qieHuanFangXiang.value}`)

const 副标题词键 = [
  'dengLuFuBiaoTiCi1',
  'dengLuFuBiaoTiCi2',
  'dengLuFuBiaoTiCi3',
  'dengLuFuBiaoTiCi4',
] as const

type 副标题段型 = { wenBen: string; jiHao: number | null }

function 拆副标题模板(): 副标题段型[] {
  const moBan = huoQuFanYi('renZheng', 'dengLuFuBiaoTiQianBan')
  const duanLie: 副标题段型[] = []
  const jing = /\{ci([1-4])\}/g
  let weiZhi = 0
  let jieGuo: RegExpExecArray | null
  while ((jieGuo = jing.exec(moBan)) !== null) {
    if (jieGuo.index > weiZhi) duanLie.push({ wenBen: moBan.slice(weiZhi, jieGuo.index), jiHao: null })
    duanLie.push({
      wenBen: huoQuFanYi('renZheng', 副标题词键[(Number(jieGuo[1]) - 1) as 0 | 1 | 2 | 3]),
      jiHao: Number(jieGuo[1]),
    })
    weiZhi = jieGuo.index + jieGuo[0].length
  }
  if (weiZhi < moBan.length) duanLie.push({ wenBen: moBan.slice(weiZhi), jiHao: null })
  return duanLie
}

const 副标题段 = 拆副标题模板()

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
const {
  cuoWu: qianTaiCuoWu,
  jieShou: jieShouQianTai,
  chongShi,
  qingLi: qingLiQianTai,
} = use前台错误()
const faSongZhong = ref(false)
const renJiXianShi = ref(false)
const renJiZuJian = ref<人机测试实例 | null>(null)
const dengLuZhong = ref(false)
const zhuCeZhong = ref(false)
const daoJiShi = ref(0)
const xianShiMiMa1 = ref(false)
const xianShiMiMa2 = ref(false)
const tongYiXieYi = ref(bd.tongYiXieYi)
const xieYiXianShi = ref(false)
const xieYiLeiXing = ref<'yongHuXieYi' | 'yinSiZhengCe'>('yongHuXieYi')
let 认证操作代次 = 0
let 认证操作控制器: AbortController | null = null

function kaiShiJieMianCaoZuo(): number {
  认证操作代次 += 1
  认证操作控制器?.abort()
  认证操作控制器 = new AbortController()
  return 认证操作代次
}

function jieMianCaoZuoYouXiao(dai: number): boolean {
  return dai === 认证操作代次
}

function zhiFouJieMianCaoZuo(): void {
  认证操作代次 += 1
  认证操作控制器?.abort()
  认证操作控制器 = null
}

function daKaiXieYi(leiXing: 'yongHuXieYi' | 'yinSiZhengCe') {
  xieYiLeiXing.value = leiXing
  xieYiXianShi.value = true
}

const xieYiGouXuanCiShu = ref(tongYiXieYi.value ? 1 : 0)
const xieYiGouXuanSeLei = computed(() =>
  xieYiGouXuanCiShu.value % 2 === 0 ? 'xieyi-fuxuan-fen' : 'xieyi-fuxuan-lan',
)

watch(tongYiXieYi, (val) => {
  bd.tongYiXieYi = val
  if (val) xieYiGouXuanCiShu.value += 1
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
  const shuRuKuang = shijian.target as HTMLInputElement | null
  const shiJiZhi = shuRuKuang?.value ?? ''
  if (shiJiZhi === '') {
    ziDongBiaoZhi.value = false
    if (muBiao.value !== '') muBiao.value = ''
    return
  }
  ziDongBiaoZhi.value = true
  if (muBiao.value !== shiJiZhi) {
    muBiao.value = shiJiZhi
  }
}

function tongBuSuoYouHuiTian(baoLiuDangQianKongZhi = false) {
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
    if (shiJiZhi === '' && muBiao.value !== '') {
      if (baoLiuDangQianKongZhi) {
        muBiao.value = ''
        ziDongBiaoZhi.value = false
      } else {
        yuanSu.value = muBiao.value
        ziDongBiaoZhi.value = true
      }
      continue
    }
    if (muBiao.value !== shiJiZhi) muBiao.value = shiJiZhi
    ziDongBiaoZhi.value = shiJiZhi.length > 0
    try {
      if (yuanSu.matches(':-webkit-autofill')) ziDongBiaoZhi.value = true
    } catch {
      continue
    }
  }
}

function tongBuYeMianKeJianXing() {
  if (document.visibilityState === 'visible') tongBuSuoYouHuiTian()
}

function tongBuPageshow() {
  tongBuSuoYouHuiTian()
}

let shouZhenTongBuId: number | null = null
let huiTianLunXunId: ReturnType<typeof setInterval> | null = null
const HUI_TIAN_LUN_XUN_CI_SHU = 20
const HUI_TIAN_LUN_XUN_JIAN_GE = 250

function tingZhiHuiTianLunXun(): void {
  if (huiTianLunXunId !== null) {
    clearInterval(huiTianLunXunId)
    huiTianLunXunId = null
  }
}

function qiDongHuiTianLunXun(): void {
  tingZhiHuiTianLunXun()
  let ciShu = 0
  huiTianLunXunId = setInterval(() => {
    ciShu += 1
    tongBuSuoYouHuiTian()
    if (ciShu >= HUI_TIAN_LUN_XUN_CI_SHU) tingZhiHuiTianLunXun()
  }, HUI_TIAN_LUN_XUN_JIAN_GE)
}

const dengLuMiMaShuRuKuang = ref<{ 聚焦: () => void } | null>(null)
const zhuCeMiMaShuRuKuang = ref<{ 聚焦: () => void } | null>(null)

type CuoWuZiDuan =
  | 'dengLuShouJiHao'
  | 'dengLuMiMa'
  | 'zhuCeShouJiHao'
  | 'zhuCeYanZhengMa'
  | 'zhuCeYongHuMing'
  | 'zhuCeMiMa'
  | 'zhuCeChuShengRiQi'

const ZI_DUAN_YUAN_SU_ID: Record<CuoWuZiDuan, string> = {
  dengLuShouJiHao: 'denglu-shoujihao',
  dengLuMiMa: 'denglu-mima',
  zhuCeShouJiHao: 'zhuce-shoujihao',
  zhuCeYanZhengMa: 'zhuce-yanzhengma',
  zhuCeYongHuMing: 'zhuce-yonghuming',
  zhuCeMiMa: 'zhuce-mima',
  zhuCeChuShengRiQi: 'zhuce-chushengriqi',
}

function zhaoDongZiDuan(ziDuan: CuoWuZiDuan): void {
  nextTick(() => {
    const yuanSu = document.getElementById(ZI_DUAN_YUAN_SU_ID[ziDuan])
    if (yuanSu instanceof HTMLInputElement && yuanSu.isConnected) yuanSu.focus()
  })
}

function daiMaPanDuanZiDuan(
  daiMa: string | undefined,
  dangQianMoShi: MoShiLeiXing,
): CuoWuZiDuan | null {
  if (!daiMa) return null
  switch (daiMa) {
    case QIAN_TAI_DAI_MA.AUTH_PASSWORD_RESET_FAILED:
      return null
    case QIAN_TAI_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS:
      return dangQianMoShi === 'zhuCe' ? 'zhuCeShouJiHao' : 'dengLuShouJiHao'
    case QIAN_TAI_DAI_MA.AUTH_INVALID_CREDENTIALS:
      return dangQianMoShi === 'zhuCe' ? 'zhuCeMiMa' : 'dengLuMiMa'
    case QIAN_TAI_DAI_MA.AUTH_USERNAME_CHANGE_FAILED:
    case QIAN_TAI_DAI_MA.RESOURCE_CONFLICT:
      return dangQianMoShi === 'zhuCe' ? 'zhuCeYongHuMing' : null
    case QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID:
      return dangQianMoShi === 'zhuCe' ? 'zhuCeShouJiHao' : 'dengLuShouJiHao'
    default:
      return null
  }
}

function juShouFuWuCuoWu(cuoWu: unknown): void {
  const ziDuan = daiMaPanDuanZiDuan(归一前台错误(cuoWu).code, moShi.value)
  if (ziDuan) zhaoDongZiDuan(ziDuan)
}

function qieHuanMiMaXianShi(xuHao: 1 | 2) {
  if (xuHao === 1) {
    xianShiMiMa1.value = !xianShiMiMa1.value
    nextTick(() => {
      tongBuSuoYouHuiTian()
      dengLuMiMaShuRuKuang.value?.聚焦()
    })
  } else {
    xianShiMiMa2.value = !xianShiMiMa2.value
    nextTick(() => {
      tongBuSuoYouHuiTian()
      zhuCeMiMaShuRuKuang.value?.聚焦()
    })
  }
}

const biaodanRongqi = ref<HTMLElement | null>(null)


const gundongRongQi = ref<HTMLElement | null>(null)
const gundongHuaKuai = ref<HTMLElement | null>(null)
const gundongGuiDao = ref<HTMLElement | null>(null)
const gundongZhuangShi = ref<HTMLElement | null>(null)
let gundongGuangChaQi: ResizeObserver | null = null
const HUA_KUAI_ZUI_XIAO_GAO = 24
const GU_DAO_LIU_BAI = 14
const JIAN_TOU_BU_CHANG_BI_LI = 0.25
let huaKuaiGaoDu = 0
let huaKuaiGuiDaoGao = 0
let tuoDongQiDian: { zuoBiaoY: number; gunDongDingBu: number } | null = null

function gengXinHuaKuai(): void {
  const gunDongQuYuanSu = gundongRongQi.value
  const huaKuaiYuanSu = gundongHuaKuai.value
  const zhuangShiYuanSu = gundongZhuangShi.value
  if (!gunDongQuYuanSu || !huaKuaiYuanSu || !zhuangShiYuanSu) return
  const yiChuGao = gunDongQuYuanSu.scrollHeight - gunDongQuYuanSu.clientHeight
  if (yiChuGao <= 0) {
    huaKuaiYuanSu.style.display = 'none'
    zhuangShiYuanSu.style.display = 'none'
    huaKuaiGaoDu = 0
    huaKuaiGuiDaoGao = 0
    return
  }
  huaKuaiYuanSu.style.display = ''
  zhuangShiYuanSu.style.display = ''
  const keJianGao = gunDongQuYuanSu.clientHeight
  const shiYongGao = Math.max(0, keJianGao - GU_DAO_LIU_BAI * 2)
  const huaKuaiGao = Math.max(
    HUA_KUAI_ZUI_XIAO_GAO,
    Math.round(shiYongGao * (shiYongGao / gunDongQuYuanSu.scrollHeight)),
  )
  const guiDaoGao = Math.max(0, shiYongGao - huaKuaiGao)
  const dingBu = Math.round((gunDongQuYuanSu.scrollTop / yiChuGao) * guiDaoGao)
  huaKuaiGaoDu = huaKuaiGao
  huaKuaiGuiDaoGao = guiDaoGao
  huaKuaiYuanSu.style.height = `${huaKuaiGao}px`
  huaKuaiYuanSu.style.transform = `translateY(${dingBu}px)`
}

function gunDongYiChuGao(): number {
  const gunDongQuYuanSu = gundongRongQi.value
  return gunDongQuYuanSu ? gunDongQuYuanSu.scrollHeight - gunDongQuYuanSu.clientHeight : 0
}

function kaiShiTuoDongHuaKuai(shijian: PointerEvent): void {
  const gunDongQuYuanSu = gundongRongQi.value
  const huaKuaiYuanSu = gundongHuaKuai.value
  if (!gunDongQuYuanSu || !huaKuaiYuanSu) return
  huaKuaiYuanSu.setPointerCapture?.(shijian.pointerId)
  tuoDongQiDian = { zuoBiaoY: shijian.clientY, gunDongDingBu: gunDongQuYuanSu.scrollTop }
}

function tuoDongHuaKuai(shijian: PointerEvent): void {
  const gunDongQuYuanSu = gundongRongQi.value
  if (!tuoDongQiDian || !gunDongQuYuanSu || huaKuaiGuiDaoGao <= 0) return
  const pianYi = shijian.clientY - tuoDongQiDian.zuoBiaoY
  gunDongQuYuanSu.scrollTop = tuoDongQiDian.gunDongDingBu + (pianYi / huaKuaiGuiDaoGao) * gunDongYiChuGao()
}

function jieShuTuoDongHuaKuai(shijian: PointerEvent): void {
  tuoDongQiDian = null
  const huaKuaiYuanSu = gundongHuaKuai.value
  if (huaKuaiYuanSu?.hasPointerCapture?.(shijian.pointerId)) huaKuaiYuanSu.releasePointerCapture(shijian.pointerId)
}

function anGuiDaoTiaoZhuan(shijian: PointerEvent): void {
  const gunDongQuYuanSu = gundongRongQi.value
  const guiDaoYuanSu = gundongGuiDao.value
  if (!gunDongQuYuanSu || !guiDaoYuanSu || huaKuaiGuiDaoGao <= 0) return
  const guiDaoJuXing = guiDaoYuanSu.getBoundingClientRect()
  const huaKuaiZhongXin = shijian.clientY - guiDaoJuXing.top - huaKuaiGaoDu / 2
  const bili = Math.min(1, Math.max(0, huaKuaiZhongXin / huaKuaiGuiDaoGao))
  gunDongQuYuanSu.scrollTop = bili * gunDongYiChuGao()
}

function anJianTouGunDong(fangXiang: 1 | -1): void {
  const gunDongQuYuanSu = gundongRongQi.value
  if (!gunDongQuYuanSu) return
  gunDongQuYuanSu.scrollTop += fangXiang * gunDongQuYuanSu.clientHeight * JIAN_TOU_BU_CHANG_BI_LI
}

function chuLiZhuangShiGunLun(shijian: WheelEvent): void {
  const gunDongQuYuanSu = gundongRongQi.value
  if (gunDongQuYuanSu) gunDongQuYuanSu.scrollTop += shijian.deltaY
}

function chuLiGundongGunDong(): void {
  gengXinHuaKuai()
}

let daoJiShiDingShiQi: ReturnType<typeof setInterval> | null = null

watch(dengLuShouJiHao, (val) => (bd.dengLuShouJiHao = val))
watch(dengLuMiMa, (val) => (bd.dengLuMiMa = val))
watch(
  () => bd.jiZhuZhangHao,
  (val) => {
    if (jiZhuZhangHao.value !== val) jiZhuZhangHao.value = val
  },
)
watch(
  () => bd.jiZhuMiMa,
  (val) => {
    if (jiZhuMiMa.value !== val) jiZhuMiMa.value = val
  },
)
watch(
  () => bd.ziDongDengLu,
  (val) => {
    if (ziDongDengLu.value !== val) ziDongDengLu.value = val
  },
)
watch(zhuCeShouJiHao, (val) => (bd.zhuCeShouJiHao = val))
watch(zhuCeYanZhengMa, (val) => (bd.zhuCeYanZhengMa = val))
watch(zhuCeYongHuMing, (val) => (bd.zhuCeYongHuMing = val))
watch(zhuCeMiMa, (val) => (bd.zhuCeMiMa = val))
watch(zhuCeChuShengRiQi, (val) => (bd.zhuCeChuShengRiQi = val))

function biaoJiLiChangBiaoDan(yuanSu: Element) {
  yuanSu.setAttribute('aria-hidden', 'true')
  yuanSu.setAttribute('inert', '')
  yuanSu.setAttribute('tabindex', '-1')
}

function qieHuanMoShi(xinMoShi: MoShiLeiXing) {
  if (xinMoShi === moShi.value) return
  if (dengLuZhong.value || zhuCeZhong.value || faSongZhong.value) {
    zhiFouJieMianCaoZuo()
    用户仓库.取消待处理认证()
    dengLuZhong.value = false
    zhuCeZhong.value = false
    faSongZhong.value = false
  }
  qingLiQianTai()
  qieHuanFangXiang.value = xinMoShi === 'zhuCe' ? 'you' : 'zuo'
  const dangQianJiaoDian = document.activeElement as HTMLElement | null
  if (
    dangQianJiaoDian &&
    dangQianJiaoDian !== document.body &&
    dangQianJiaoDian.closest('form') &&
    biaodanRongqi.value?.contains(dangQianJiaoDian)
  ) {
    dangQianJiaoDian.blur()
  }
  const gundongQu = biaodanRongqi.value?.querySelector('.biaodan-gundong') as HTMLElement | null
  if (gundongQu) gundongQu.scrollTop = 0
  moShi.value = xinMoShi
}

onMounted(() => {
  tongBuSuoYouHuiTian()
  bd.jiaZaiJiZhuSheZhi()
  jiZhuZhangHao.value = bd.jiZhuZhangHao
  jiZhuMiMa.value = bd.jiZhuMiMa
  ziDongDengLu.value = bd.ziDongDengLu
  const dengLuShouJiHaoYuanSu = biaodanRongqi.value?.querySelector('#denglu-shoujihao') as HTMLInputElement | null
  const dengLuMiMaYuanSu = biaodanRongqi.value?.querySelector('#denglu-mima') as HTMLInputElement | null
  if ((!dengLuShouJiHaoYuanSu || dengLuShouJiHaoYuanSu.value === '') && bd.dengLuShouJiHao) {
    dengLuShouJiHao.value = bd.dengLuShouJiHao
  }
  if ((!dengLuMiMaYuanSu || dengLuMiMaYuanSu.value === '') && bd.dengLuMiMa) {
    dengLuMiMa.value = bd.dengLuMiMa
  }
  if (bd.yanZhengMaFaSongShiJian) {
    const shengYu = Math.max(0, 60 - Math.floor((Date.now() - bd.yanZhengMaFaSongShiJian) / 1000))
    if (shengYu > 0) kaiShiDaoJiShi(shengYu)
  }
  document.addEventListener('visibilitychange', tongBuYeMianKeJianXing)
  window.addEventListener('pageshow', tongBuPageshow)
  nextTick(() => {
    tongBuSuoYouHuiTian()
    if (typeof requestAnimationFrame === 'function') {
      shouZhenTongBuId = requestAnimationFrame(() => {
        shouZhenTongBuId = null
        tongBuSuoYouHuiTian()
      })
    }
  })
  qiDongHuiTianLunXun()
  if (typeof ResizeObserver === 'function') {
    gundongGuangChaQi = new ResizeObserver(() => gengXinHuaKuai())
    const xingweiYuanSu = gundongRongQi.value?.querySelector('.biaodan-xingwei') ?? null
    if (gundongRongQi.value) gundongGuangChaQi.observe(gundongRongQi.value)
    if (xingweiYuanSu) gundongGuangChaQi.observe(xingweiYuanSu)
  }
  gengXinHuaKuai()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', tongBuYeMianKeJianXing)
  window.removeEventListener('pageshow', tongBuPageshow)
  tingZhiHuiTianLunXun()
  if (gundongGuangChaQi) {
    gundongGuangChaQi.disconnect()
    gundongGuangChaQi = null
  }
  if (shouZhenTongBuId !== null) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(shouZhenTongBuId)
    shouZhenTongBuId = null
  }
  if (daoJiShiDingShiQi) {
    clearInterval(daoJiShiDingShiQi)
    daoJiShiDingShiQi = null
  }
  if (dengLuZhong.value || zhuCeZhong.value || faSongZhong.value) {
    zhiFouJieMianCaoZuo()
    用户仓库.取消待处理认证()
  }
  if (!定格飞行中) {
    清理定格层()
    用户仓库.mingChengKeJian = true
  }
  bd.dengLuMiMa = ''
  bd.zhuCeMiMa = ''
})

const dengLuShouJiHeFa = computed(() => /^1[3-9]\d{9}$/.test(dengLuShouJiHao.value))
const keYiDengLu = computed(
  () =>
    dengLuShouJiHeFa.value &&
    (dengLuMiMa.value.length > 0 || dengLuMiMaZiDong.value) &&
    !dengLuZhong.value,
)

const zhuCeShouJiHeFa = computed(() => /^1[3-9]\d{9}$/.test(zhuCeShouJiHao.value))
const zhuCeYanZhengMaHeFa = computed(() => /^\d{6}$/.test(zhuCeYanZhengMa.value))
const YONG_HU_MING_TE_SHU_ZI_FU = /[!@#$%^&*()+=[\]{}|\\:;"'<>?/~`]/
const zhuCeYongHuMingHeFa = computed(() => {
  const qingLiHou = zhuCeYongHuMing.value.trim()
  return (
    qingLiHou.length >= 1 && qingLiHou.length <= 30 && !YONG_HU_MING_TE_SHU_ZI_FU.test(qingLiHou)
  )
})

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

const keYiFaSong = computed(
  () => zhuCeShouJiHeFa.value && daoJiShi.value === 0 && !faSongZhong.value,
)
const keYiZhuCe = computed(
  () =>
    zhuCeShouJiHeFa.value &&
    zhuCeYanZhengMaHeFa.value &&
    zhuCeYongHuMingHeFa.value &&
    zhuCeMiMa.value.length > 0 &&
    !zhuCeZhong.value &&
    (chuShengRiQiZhouSui.value ?? -1) >= ZHU_CE_ZUI_XIAO_NIAN_LING,
)

const faSongWenBen = computed(() => {
  if (faSongZhong.value) return huoQuFanYi('renZheng', 'faSongZhong')
  if (daoJiShi.value > 0) return `${daoJiShi.value}s`
  return huoQuFanYi('renZheng', 'huoQuYanZhengMa')
})

async function zhiXingFaSongMa() {
  if (!keYiFaSong.value || faSongZhong.value) return
  const daiCi = kaiShiJieMianCaoZuo()
  const shouJiHao = zhuCeShouJiHao.value
  faSongZhong.value = true
  qingLiQianTai()
  try {
    try {
      await jianChaShouJiHao(shouJiHao, { signal: 认证操作控制器?.signal })
    } catch (jianChaCuoWu: unknown) {
      if (!jieMianCaoZuoYouXiao(daiCi)) return
      if (归一前台错误(jianChaCuoWu).code !== QIAN_TAI_DAI_MA.RESOURCE_NOT_FOUND) {
        jieShouQianTai(jianChaCuoWu, zhiXingFaSongMa)
        return
      }
    }
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    renJiXianShi.value = true
  } finally {
    if (jieMianCaoZuoYouXiao(daiCi)) faSongZhong.value = false
  }
}

async function tiJiaoRenJi(yanZheng: 人机验证答案) {
  if (faSongZhong.value) return
  const daiCi = kaiShiJieMianCaoZuo()
  const shouJiHao = zhuCeShouJiHao.value
  faSongZhong.value = true
  qingLiQianTai()
  try {
    await faSongMa(shouJiHao, YAN_ZHENG_MA_YONG_TU.zhuCe, { signal: 认证操作控制器?.signal }, yanZheng)
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    renJiXianShi.value = false
    bd.yanZhengMaFaSongShiJian = Date.now()
    kaiShiDaoJiShi()
  } catch (cuoWu) {
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    if (shiRenJiYanZhengShiBai(cuoWu)) {
      renJiZuJian.value?.biaoShiYanZhengShiBai()
      return
    }
    renJiXianShi.value = false
    jieShouQianTai(cuoWu, zhiXingFaSongMa)
    juShouFuWuCuoWu(cuoWu)
  } finally {
    if (jieMianCaoZuoYouXiao(daiCi)) faSongZhong.value = false
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


let 定格层: HTMLElement | null = null
let 定格动画们: Animation[] = []
let 定格飞行中 = false

async function dengDaiDongHua(
  动画: Animation,
  chaoShiHaoMiao: number,
): Promise<void> {
  const wanDing = 动画.finished.catch(() => undefined)
  const chaoShi = new Promise<void>((jieJue) => {
    window.setTimeout(jieJue, chaoShiHaoMiao)
  })
  await Promise.race([wanDing, chaoShi])
}

function 计算帧(元素: HTMLElement, 属性清单: string[]): Record<string, string> {
  const 样式 = getComputedStyle(元素)
  const 帧: Record<string, string> = {}
  for (const 属性 of 属性清单) {
    const 值 = 样式.getPropertyValue(属性).trim()
    if (值 && !值.includes('var(') && !值.includes('calc(')) 帧[属性] = 值
  }
  return 帧
}

function 记动画(动画: Animation): Animation {
  定格动画们.push(动画)
  return 动画
}

function 清理定格层(): void {
  if (定格飞行中) return
  for (const 动画 of 定格动画们) {
    try {
      动画.cancel()
    } catch {
      continue
    }
  }
  定格动画们 = []
  定格层?.remove()
  定格层 = null
}

function qiangZhiHuiShou定格层(): void {
  for (const 动画 of 定格动画们) {
    try {
      动画.cancel()
    } catch {
      continue
    }
  }
  定格动画们 = []
  定格层?.remove()
  定格层 = null
  定格飞行中 = false
}

function 建定格层(活卡: HTMLElement): HTMLElement {
  const 矩形 = 活卡.getBoundingClientRect()
  const 层 = 活卡.cloneNode(true) as HTMLElement
  层.classList.add('juan-zhou-dingge')
  层.removeAttribute('id')
  for (const 子 of 层.querySelectorAll('[id]')) 子.removeAttribute('id')
  层.setAttribute('aria-hidden', 'true')
  层.setAttribute('inert', '')
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
  const 内容区 = 层.querySelector<HTMLElement>('.biaodan-neirong-qu')
  if (内容区) {
    记动画(
      内容区.animate([{ opacity: '0' }], {
        duration: 700,
        easing: quXian.biaoZhun,
        fill: 'forwards',
      }),
    )
  }
  const 卷轴 = 记动画(层.animate([收束], { duration: 900, easing: quXian.biaoZhun, fill: 'forwards' }))
  await dengDaiDongHua(卷轴, 1100)

  const 起点 = 层.getBoundingClientRect()
  const 落点 = 用户位.getBoundingClientRect()
  const 位移X = 落点.left + 落点.width / 2 - (起点.left + 起点.width / 2)
  const 位移Y = 落点.top + 落点.height / 2 - (起点.top + 起点.height / 2)
  const 落点缩放 = 起点.width > 0 ? Math.min(1, Math.max(0, 落点.width / 起点.width)) : 1
  const 飞行 = 记动画(
    层.animate(
      [{ transform: `translate(${位移X}px, ${位移Y}px) scale(${落点缩放})`, opacity: '0' }],
      { duration: 800, easing: quXian.ruan, fill: 'forwards' },
    ),
  )
  await dengDaiDongHua(飞行, 1000)
}

async function qiDongDinggeFeixing(mubiaoLuJing: string) {
  dengLuTuiChangZhong.value = true
  try {
    const 活卡 = biaodanRongqi.value
    const 用户位 = document.querySelector<HTMLElement>('.yonghu-xuanxiang')
    const 减动效 = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!活卡 || !用户位 || 减动效) {
      用户仓库.zhongZhiZhuYeRuChang()
      router.push(mubiaoLuJing)
      用户仓库.qiDongZhuYeRuChang()
      return
    }
    const 卡矩形 = 活卡.getBoundingClientRect()
    const 位矩形 = 用户位.getBoundingClientRect()
    const 冻起点 = {
      zuo: 卡矩形.left,
      shang: 卡矩形.top,
      kuan: 卡矩形.width,
      gao: 卡矩形.height,
    }
    const 冻落点 = {
      zuo: 位矩形.left,
      shang: 位矩形.top,
      kuan: 位矩形.width,
      gao: 位矩形.height,
    }
    用户仓库.mingChengKeJian = false
    用户仓库.zhongZhiZhuYeRuChang()
    const 快照 = 建定格层(活卡)
    定格层 = 快照
    定格飞行中 = true
    router.push(mubiaoLuJing)
    用户仓库.qiDongZhuYeRuChang()
    try {
      await 定格飞向用户位(快照, 用户位)
    } catch {
      // 装饰性动画的任何失败都不许挡住登录成功后的导航
    } finally {
      void 冻起点
      void 冻落点
      qiangZhiHuiShou定格层()
      用户仓库.mingChengKeJian = true
    }
  } finally {
    dengLuTuiChangZhong.value = false
  }
}

function quXiaoDengLu(): void {
  if (!dengLuZhong.value) return
  zhiFouJieMianCaoZuo()
  用户仓库.取消待处理认证()
  dengLuZhong.value = false
  qingLiQianTai()
}

function chuFaLiuLanQiBaoCunMiMa(shouJiHao: string, miMa: string): void {
  try {
    const kuangJiaMing = 'liulanqi-baocun-mima'
    const kuangJia = document.createElement('iframe')
    kuangJia.name = kuangJiaMing
    kuangJia.style.display = 'none'
    kuangJia.setAttribute('aria-hidden', 'true')
    kuangJia.tabIndex = -1
    document.body.appendChild(kuangJia)
    const biaoDan = document.createElement('form')
    biaoDan.action = window.location.href
    biaoDan.target = kuangJiaMing
    biaoDan.method = 'post'
    biaoDan.style.display = 'none'
    const yongHuXiang = document.createElement('input')
    yongHuXiang.name = 'username'
    yongHuXiang.type = 'text'
    yongHuXiang.autocomplete = 'username'
    yongHuXiang.value = shouJiHao
    const miMaXiang = document.createElement('input')
    miMaXiang.name = 'password'
    miMaXiang.type = 'password'
    miMaXiang.autocomplete = 'current-password'
    miMaXiang.value = miMa
    biaoDan.append(yongHuXiang, miMaXiang)
    document.body.appendChild(biaoDan)
    biaoDan.submit()
    setTimeout(() => {
      biaoDan.remove()
      kuangJia.remove()
    }, 2000)
  } catch {
    /* 触发浏览器保存密码失败不影响登录流程 */
  }
}

async function zhiXingDengLu() {
  if (!keYiDengLu.value || dengLuZhong.value) return
  const daiCi = kaiShiJieMianCaoZuo()
  const shouJiHao = dengLuShouJiHao.value
  const miMa = dengLuMiMa.value
  const jiZhuMiMaZhi = jiZhuMiMa.value
  dengLuZhong.value = true
  qingLiQianTai()
  try {
    await 用户仓库.zhiXingDengLu(shouJiHao, miMa, ziDongDengLu.value)
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    if (jiZhuMiMaZhi) chuFaLiuLanQiBaoCunMiMa(shouJiHao, miMa)
    bd.sheZhiJiZhuZhangHaoMiMa(
      shouJiHao,
      miMa,
      jiZhuZhangHao.value,
      jiZhuMiMaZhi,
      ziDongDengLu.value,
    )
    bd.qingKongDengLuZhuCe()
    emit('dengLuChengGong')
    await qiDongDinggeFeixing('/')
  } catch (cuoWu) {
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    jieShouQianTai(cuoWu, zhiXingDengLu)
    juShouFuWuCuoWu(cuoWu)
  } finally {
    if (jieMianCaoZuoYouXiao(daiCi)) {
      dengLuZhong.value = false
      认证操作控制器 = null
    }
  }
}

function sheZhiBenDiYanZhengCuoWu(yingXiang: string, ziDuan?: CuoWuZiDuan) {
  jieShouQianTai(
    chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID,
      retryable: false,
      yingXiang,
    }),
  )
  if (ziDuan) zhaoDongZiDuan(ziDuan)
}

async function zhiXingZhuCe() {
  if (zhuCeZhong.value) return
  if (!keYiZhuCe.value) {
    if (!zhuCeShouJiHeFa.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), 'zhuCeShouJiHao')
    } else if (!zhuCeYanZhengMaHeFa.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'yanZhengMaGeShiCuoWu'), 'zhuCeYanZhengMa')
    } else if (YONG_HU_MING_TE_SHU_ZI_FU.test(zhuCeYongHuMing.value.trim())) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'), 'zhuCeYongHuMing')
    } else if (!zhuCeYongHuMingHeFa.value) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'yongHuMingChangDuCuoWu'), 'zhuCeYongHuMing')
    } else if (zhuCeMiMa.value.length === 0) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'miMaKong'), 'zhuCeMiMa')
    } else if (chuShengRiQiZhouSui.value === null) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu'), 'zhuCeChuShengRiQi')
    } else if ((chuShengRiQiZhouSui.value ?? -1) < ZHU_CE_ZUI_XIAO_NIAN_LING) {
      sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'weiChengNianRenJinZhi'), 'zhuCeChuShengRiQi')
    }
    return
  }
  if (!tongYiXieYi.value) {
    sheZhiBenDiYanZhengCuoWu(huoQuFanYi('renZheng', 'weiTongYiXieYi'))
    return
  }
  const daiCi = kaiShiJieMianCaoZuo()
  const shouJiHao = zhuCeShouJiHao.value
  const yanZhengMa = zhuCeYanZhengMa.value
  const yongHuMing = zhuCeYongHuMing.value
  const miMa = zhuCeMiMa.value
  const tongYiXieYiZhi = tongYiXieYi.value
  const chuShengRiQi = zhuCeChuShengRiQi.value
  zhuCeZhong.value = true
  qingLiQianTai()
  try {
    await 用户仓库.zhiXingZhuCe(
      shouJiHao,
      yanZhengMa,
      yongHuMing,
      miMa,
      tongYiXieYiZhi,
      chuShengRiQi,
    )
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    bd.qingKongDengLuZhuCe()
    dengLuShouJiHao.value = shouJiHao
    zhuCeZhong.value = false
    await nextTick()
    await router.push('/login')
    moShi.value = 'dengLu'
  } catch (cuoWu) {
    if (!jieMianCaoZuoYouXiao(daiCi)) return
    jieShouQianTai(cuoWu, zhiXingZhuCe)
    juShouFuWuCuoWu(cuoWu)
  } finally {
    if (jieMianCaoZuoYouXiao(daiCi)) {
      zhuCeZhong.value = false
      认证操作控制器 = null
    }
  }
}
</script>

<style scoped>
.denglu-neirong {
  width: 100%;
  max-width: 420px;
  
  height: 100%;
  padding: 0 calc(var(--jiange-da) + var(--jiange-xiao));
  
  margin: auto;
  
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
}

.biaodan-rongqi {
  --ka-zhu-wen: #efe9dc;
  --ka-ci-wen: #d5b878;
  --ka-san-wen: #a99f8a;
  --ka-jin: #c9a96a;
  --ka-jin-shen: #8a6a2f;
  --ka-jin-liang: #f0dcae;
  --ka-jin-xian: rgba(201, 169, 106, 0.34);
  --ka-jin-mian: rgba(201, 169, 106, 0.1);
  --ka-guang-wen: rgba(201, 169, 106, 0.3);
  --ka-cuo: #ff5a4e;
  --ka-cuo-mian: rgba(255, 69, 58, 0.1);
  --ka-cuo-bian: rgba(255, 69, 58, 0.45);
  --ka-hong-1: #f2b0ac;
  --ka-hong-2: #e98f85;
  --ka-hong-3: #dd6d61;
  --ka-hong-4: #db5d51;
  --ka-mo: #17130a;
  --ka-duan-luo: calc(var(--jiange-da) + var(--jiange-xiao));
  --zihao-biaoti: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--renzheng-mian-se);
  border: 1px solid var(--ka-jin-xian);
  border-radius: var(--yuanjiao-xiao);
  outline: 1px solid var(--ka-jin-xian);
  outline-offset: -4px;
  box-shadow:
    0 24px 48px rgba(2, 4, 14, 0.42),
    0 6px 14px rgba(2, 4, 14, 0.34);
  padding: var(--ka-duan-luo) var(--renzheng-ka-pian-you-nei-ju);
  position: relative;
  max-height: 100%;
  overflow: hidden;
  transition: height 0.45s var(--quxian-biao-zhun);
}

.biaodan-rongqi::before {
  content: '';
  position: absolute;
  top: 7px;
  left: 7px;
  right: 7px;
  height: 14px;
  background: repeating-conic-gradient(
    from 90deg at 50% 130%,
    var(--ka-guang-wen) 0deg 6deg,
    transparent 6deg 12deg
  );
  border-radius: 0 0 999px 999px;
  pointer-events: none;
}

.biaodan-neirong-qu {
  --ka-heng-nei-ju: var(--renzheng-ka-pian-you-nei-ju);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  z-index: 1;
}

@media (max-width: 767px) {
  .biaodan-neirong-qu {
    --ka-heng-nei-ju: var(--jiange-zhong);
  }
}

.biaodan-tou {
  text-align: center;
  margin-top: var(--jiange-da);
  margin-bottom: var(--jiange-da);
}

.biaodan-biaoti {
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif;
  font-size: var(--zihao-biaoti);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.12em;
  text-indent: 0.12em;
  color: var(--ka-zhu-wen);
  margin: 0;
  text-shadow: none;
}

.biaodan-fu-biao-ti {
  margin: var(--jiange-xiao) calc(var(--ka-heng-nei-ju) * -1) 0;
  font-size: var(--ziti-xiao);
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.04em;
  text-indent: 0.04em;
  color: var(--ka-ci-wen);
  text-align: center;
}

.fu-biao-hang {
  display: block;
}

.fu-biao-ci-1 {
  color: var(--ka-hong-1);
}

.fu-biao-ci-2 {
  color: var(--ka-hong-2);
}

.fu-biao-ci-3 {
  color: var(--ka-hong-3);
}

.fu-biao-ci-4 {
  color: var(--ka-hong-4);
}

.biaodan-gundong {
  flex: 1;
  min-height: 0;

  margin-top: calc(var(--biaoqian-qin-ru) * -1 + var(--jiange-2) * -1);
  overflow-y: auto;
  overflow-x: hidden;
  
  scrollbar-width: none;
  scrollbar-color: transparent transparent;
  position: relative;
}

.biaodan-gundong::-webkit-scrollbar {
  width: 0;
}


.gundong-waike {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}


.biaodan-neirong-qu > .qian-tai-cuo-wu {
  --cuo-wu-mian: var(--ka-cuo-mian);
  --cuo-wu-bian: var(--ka-cuo-bian);
  --cuo-wu-biaoti: var(--ka-cuo);
  --cuo-wu-zhengwen: var(--ka-zhu-wen);
  border-radius: var(--yuanjiao-xiao);
  margin-top: 0;
  margin-bottom: calc(var(--biaoqian-qin-ru) + var(--jiange-2) + var(--jiange-da));
}

.gundong-zhuangshi {
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc(var(--renzheng-ka-pian-you-nei-ju) / -2 - var(--renzheng-gundong-shou-kuan) / 2);
  width: var(--renzheng-gundong-shou-kuan);
  pointer-events: none;
}

.gundong-guidao {
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 50%;
  width: var(--renzheng-gundong-huakuai-kuan);
  margin-left: calc(var(--renzheng-gundong-huakuai-kuan) / -2);
  border-radius: var(--renzheng-gundong-yuan-jiao);
  background: color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 26%, transparent);
  pointer-events: auto;
  touch-action: none;
  cursor: default;
}

.gundong-guidao::before,
.gundong-huakuai::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc((var(--renzheng-gundong-shou-kuan) - var(--renzheng-gundong-huakuai-kuan)) / -2);
  right: calc((var(--renzheng-gundong-shou-kuan) - var(--renzheng-gundong-huakuai-kuan)) / -2);
}

.gundong-jiantou {
  position: absolute;
  left: 50%;
  width: 8px;
  height: 8px;
  border-left: 2px solid var(--renzheng-gundong-huakuai-se);
  border-top: 2px solid var(--renzheng-gundong-huakuai-se);
  pointer-events: auto;
  touch-action: none;
  cursor: default;
}

.gundong-jiantou::before {
  content: '';
  position: absolute;
  inset: calc(var(--jiange-zhong) * -1);
}

.gundong-jiantou-shang {
  top: 0;
  transform: translateX(-50%) rotate(45deg);
}

.gundong-jiantou-xia {
  bottom: 0;
  transform: translateX(-50%) rotate(-135deg);
}

.gundong-huakuai {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  touch-action: none;
  cursor: default;
  border-radius: var(--renzheng-gundong-yuan-jiao);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 34%, transparent) 0%,
    var(--renzheng-gundong-huakuai-se) 50%,
    color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 34%, transparent) 100%
  );
  opacity: 1;
  filter: brightness(0.76) saturate(0.8);
  box-shadow: none;
  transition:
    filter 200ms ease,
    box-shadow 200ms ease;
  pointer-events: auto;
  will-change: transform;
}


.gundong-zhuangshi:hover .gundong-huakuai,
.gundong-zhuangshi:focus-within .gundong-huakuai,
.gundong-huakuai:hover,
.gundong-huakuai:active {
  filter: brightness(1.2) saturate(1.18);
  box-shadow: 0 0 10px color-mix(in srgb, var(--renzheng-gundong-huakuai-se) 72%, transparent);
}

.biaodan-xingwei {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.biaodan-moshi-pane {
  display: grid;
  grid-template-rows: 0fr;
  min-height: 0;
  overflow: hidden;
  flex-shrink: 0;
  transition: grid-template-rows 0.45s var(--quxian-biao-zhun);
}

.biaodan-moshi-pane.shi-fu-yong {
  grid-template-rows: 1fr;
}

.denglu-biaodan,
.zhuce-biaodan {
  min-height: 0;
  min-width: 0;
  padding-top: calc(var(--biaoqian-qin-ru) + var(--jiange-2));
  padding-left: var(--jiange-4);
  padding-right: var(--jiange-4);
  overflow: hidden;
}

.biaodan-gundong::-webkit-scrollbar-track {
  background: transparent;
  border-radius: var(--renzheng-gundong-yuan-jiao);
}

.biaodan-gundong::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: var(--renzheng-gundong-yuan-jiao);
}

.biaodan-gundong:hover,
.biaodan-gundong:focus-within {
  scrollbar-color: var(--gundong-tiao-huakuai) var(--gundong-tiao-guidao);
}

.biaodan-gundong:hover::-webkit-scrollbar-track,
.biaodan-gundong:focus-within::-webkit-scrollbar-track {
  background: var(--gundong-tiao-guidao);
}

.biaodan-gundong:hover::-webkit-scrollbar-thumb,
.biaodan-gundong:focus-within::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-huakuai);
}

.biaodan-qiehuan-you-enter-active,
.biaodan-qiehuan-zuo-enter-active {
  transition:
    opacity var(--renzheng-qiehuan-shi-chang) var(--quxian-biao-zhun),
    transform var(--renzheng-qiehuan-shi-chang) var(--quxian-biao-zhun);
}

.biaodan-qiehuan-you-leave-active,
.biaodan-qiehuan-zuo-leave-active {
  position: relative;
  pointer-events: none;
  transition:
    opacity var(--renzheng-qiehuan-shi-chang) var(--quxian-biao-zhun),
    transform var(--renzheng-qiehuan-shi-chang) var(--quxian-biao-zhun);
}

.biaodan-qiehuan-you-enter-from {
  opacity: 0;
  transform: translateX(var(--renzheng-qiehuan-weiyi));
}

.biaodan-qiehuan-you-leave-to {
  opacity: 0;
  transform: translateX(calc(var(--renzheng-qiehuan-weiyi) * -1));
}

.biaodan-qiehuan-zuo-enter-from {
  opacity: 0;
  transform: translateX(calc(var(--renzheng-qiehuan-weiyi) * -1));
}

.biaodan-qiehuan-zuo-leave-to {
  opacity: 0;
  transform: translateX(var(--renzheng-qiehuan-weiyi));
}

.biaoqian-qiehuan {
  display: flex;
  gap: var(--jiange-xiao);
  margin-bottom: var(--ka-duan-luo);
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--ka-jin-xian);
  padding: 0;
}

.biaoqian-anniu,
.mima-qiehuan,
.anniu-zhuyao:not(:disabled),
.fasong-anniu:not(:disabled) {
  cursor: pointer;
}

.biaoqian-anniu {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--shuru-anniu-re-ku);
  padding: 0 var(--jiange-4);
  background: transparent;
  border: none;
  border-radius: 0;
  color: var(--ka-san-wen);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif;
  font-size: var(--ziti-zhong);
  font-weight: 400;
  letter-spacing: 0.12em;
  text-indent: 0.12em;
  position: relative;
  transition: color 0.2s var(--quxian-biao-zhun);
}

.biaoqian-anniu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.biaoqian-anniu.huoyue {
  background: transparent;
  color: var(--ka-zhu-wen);
  font-weight: 700;
}

.biaoqian-anniu.huoyue::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(var(--jiange-1) * -1);
  width: 100%;
  height: var(--jiange-2);
  transform: translateX(-50%);
  border-radius: var(--jiange-1);
  background: var(--ka-jin);
  padding: 0;
}


.shuru-zu {
  --ziduan-jian-ju: var(--jiange-da);
  margin-bottom: var(--ziduan-jian-ju);
}

.wangji-mima-lianjie {
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  min-height: var(--shuru-anniu-re-ku);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--ziti-xiao);
  font-weight: 400;
  color: var(--ka-ci-wen);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: color 0.2s var(--quxian-biao-zhun);
}

.wangji-mima-lianjie:hover {
  color: var(--ka-zhu-wen);
}

.wangji-mima-lianjie:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.wangji-mima-lianjie:active {
  color: var(--ka-jin-shen);
}

.ji-zhu-xuan-xiang {
  display: flex;
  flex-direction: column;
  margin: calc((var(--ziti-xiao) - var(--shuru-anniu-re-ku)) / 2 - var(--jiange-4)) calc(var(--ka-heng-nei-ju) * -1) var(--jiange-4);
}

.ji-zhu-hang-2 {
  margin-top: calc((var(--jiange-2) - var(--shuru-anniu-re-ku) + var(--gou-xuan-chi-cun)) / 2);
}

.ji-zhu-hang-1,
.ji-zhu-hang-2 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  justify-items: center;
}

.ji-zhu-hang-1 > :first-child,
.ji-zhu-hang-2 > :first-child {
  grid-column: 1 / 3;
  grid-row: 1;
}

.ji-zhu-hang-1 > :last-child,
.ji-zhu-hang-2 > :last-child {
  grid-column: 2 / 4;
  grid-row: 1;
}

.ji-zhu-hang-1 .ji-zhu-xuan-ze,
.ji-zhu-hang-2 .ji-zhu-xuan-ze,
.ji-zhu-hang-2 .wangji-mima-lianjie {
  white-space: nowrap;
}

.ji-zhu-xuan-ze {
  display: flex;
  align-items: center;
  min-height: var(--shuru-anniu-re-ku);
  color: var(--ka-san-wen);
  font-size: var(--ziti-xiao);
  cursor: pointer;
  transition: color 0.2s var(--quxian-biao-zhun);
}

.ji-zhu-xuan-ze:hover {
  color: var(--ka-zhu-wen);
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
  padding-left: calc(var(--jiange-zhong) + var(--jiange-6));
}

.ji-zhu-wen-ben::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: var(--gou-xuan-chi-cun);
  height: var(--gou-xuan-chi-cun);
  border: 1px solid var(--ka-jin);
  border-radius: var(--jiange-4);
  background: transparent;
  transition:
    background-color 0.2s var(--quxian-biao-zhun),
    border-color 0.2s var(--quxian-biao-zhun);
}

.ji-zhu-wen-ben.yi-gou-xuan::before {
  background: var(--ka-jin);
  border-color: var(--ka-jin-shen);
}

.ji-zhu-wen-ben.yi-gou-xuan::after {
  content: '';
  position: absolute;
  left: calc(var(--gou-xuan-chi-cun) / 2);
  top: 50%;
  width: 4px;
  height: 8px;
  border: solid var(--ka-mo);
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

.ji-zhu-fu-xuan:focus-visible + .ji-zhu-wen-ben::before {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.yanzhengma-zu {
  display: flex;
  gap: var(--jiange-12);
  align-items: flex-end;
}

.yanzhengma-shuru-qu {
  flex: 1;
  position: relative;
}

.fasong-anniu {
  flex-shrink: 0;
  min-height: var(--shuru-anniu-re-ku);
  padding: 0 var(--jiange-12);
  background: transparent;
  color: var(--ka-ci-wen);
  border: 1px solid var(--ka-jin);
  border-radius: var(--yuanjiao-xiao);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  font-weight: 400;
  letter-spacing: 0.06em;
  white-space: nowrap;
  transition:
    background-color 0.2s var(--quxian-biao-zhun),
    border-color 0.2s var(--quxian-biao-zhun),
    color 0.2s var(--quxian-biao-zhun);
}

.fasong-anniu:hover:not(:disabled) {
  background: var(--ka-jin-mian);
  color: var(--ka-zhu-wen);
  border-color: var(--ka-jin);
}

.fasong-anniu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.fasong-anniu:disabled {
  color: var(--ka-san-wen);
  border-color: var(--ka-jin-xian);
  cursor: not-allowed;
  opacity: 1;
  transform: none;
  box-shadow: none;
}

.xieyi-gouxuan {
  margin-top: var(--jiange-da);
  margin-bottom: var(--jiange-da);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-xiao);
}

.xieyi-fuxuan {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.xieyi-fuxuan::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.xieyi-fuxuan input[type='checkbox'] {
  width: var(--gou-xuan-chi-cun);
  height: var(--gou-xuan-chi-cun);
  cursor: pointer;
}

.xieyi-fuxuan input[type='checkbox'].xieyi-fuxuan-lan {
  accent-color: var(--xingbie-nan-xuan-biankuang);
}

.xieyi-fuxuan input[type='checkbox'].xieyi-fuxuan-fen {
  accent-color: var(--xingbie-nv-xuan-biankuang);
}

.xieyi-wenben {
  font-size: var(--ziti-xiao);
  color: var(--ka-san-wen);
  line-height: 1.5;
  text-align: center;
}

.xieyi-lianjie {
  color: var(--ka-ci-wen);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  font-weight: 400;
  cursor: pointer;
}

.xieyi-lianjie:hover {
  color: var(--ka-zhu-wen);
}

.xieyi-lianjie:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

:root[data-theme='light'] .biaodan-rongqi {
  --ka-zhu-wen: #2e2a20;
  --ka-ci-wen: #8a6a2f;
  --ka-san-wen: #6f6350;
  --ka-jin: #a3813e;
  --ka-jin-shen: #6d5424;
  --ka-jin-liang: #f7ead0;
  --ka-jin-xian: rgba(163, 129, 62, 0.4);
  --ka-jin-mian: rgba(163, 129, 62, 0.1);
  --ka-guang-wen: rgba(163, 129, 62, 0.26);
  --ka-cuo: #b3261e;
  --ka-cuo-mian: rgba(250, 81, 81, 0.1);
  --ka-cuo-bian: rgba(250, 81, 81, 0.45);
  --ka-hong-1: #b2503f;
  --ka-hong-2: #99362a;
  --ka-hong-3: #7c2018;
  --ka-hong-4: #571008;
}

:root[data-theme='light'] .biaodan-biaoti {
  color: var(--ka-zhu-wen);
}

@media (prefers-reduced-motion: reduce) {
  :deep(.fudong-biaoqian),
  .biaodan-tou,
  .biaoqian-anniu,
  .biaoqian-anniu.huoyue::after,
  .anniu-zhuyao,
  .anniu-zhuyao::before,
  .fasong-anniu,
  .mima-qiehuan,
  .wangji-mima-lianjie,
  .ji-zhu-xuan-ze,
  .ji-zhu-wen-ben::before,
  .ji-zhu-wen-ben::after,
  .xieyi-lianjie {
    transition: none !important;
  }

  .biaodan-rongqi,
  .biaodan-moshi-pane,
  .biaodan-gundong,
  .gundong-huakuai,
  .biaodan-qiehuan-you-enter-active,
  .biaodan-qiehuan-you-leave-active,
  .biaodan-qiehuan-zuo-enter-active,
  .biaodan-qiehuan-zuo-leave-active {
    transition: none !important;
  }

  
  .biaodan-qiehuan-you-enter-from,
  .biaodan-qiehuan-you-leave-to,
  .biaodan-qiehuan-zuo-enter-from,
  .biaodan-qiehuan-zuo-leave-to {
    transform: none;
  }
}


.juan-zhou-dingge {
  position: fixed;
  left: var(--dingge-zuo);
  top: var(--dingge-shang);
  width: var(--dingge-kuan);
  height: var(--dingge-gao);
  margin: 0;
  z-index: var(--ceng-jingge);
  pointer-events: none;
  box-shadow: var(--renzheng-dingge-guang-yun);
}

.juan-zhou-dingge-shousuo {
  height: var(--juanzhou-tong-gao-du);
  border-radius: calc(var(--juanzhou-tong-gao-du) * 0.5);
  padding: 0;
}

.anniu-zhuyao {
  width: 100%;
  min-height: var(--shuru-anniu-re-ku);
  padding: var(--jiange-12) var(--jiange-da);
  background: linear-gradient(180deg, var(--ka-jin-liang), var(--ka-jin));
  color: var(--ka-mo);
  border: 1px solid var(--ka-jin-shen);
  border-radius: var(--yuanjiao-xiao);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif;
  font-size: var(--ziti-zhong);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-indent: 0.08em;
  box-shadow:
    0 4px 10px rgba(2, 4, 14, 0.32),
    0 1px 2px rgba(2, 4, 14, 0.24);
  margin-top: 0;
  overflow: visible;
  position: relative;
  transition:
    filter 0.2s var(--quxian-biao-zhun),
    transform 0.2s var(--quxian-biao-zhun),
    box-shadow 0.2s var(--quxian-biao-zhun);
}

.anniu-zhuyao::before {
  content: none;
}

.anniu-zhuyao:hover:not(:disabled) {
  background: linear-gradient(180deg, var(--ka-jin-liang), var(--ka-jin));
  color: var(--ka-mo);
  border-color: var(--ka-jin-shen);
  box-shadow:
    0 6px 14px rgba(2, 4, 14, 0.34),
    0 1px 2px rgba(2, 4, 14, 0.24);
  filter: brightness(1.04);
  transform: none;
}

.anniu-zhuyao:active:not(:disabled) {
  background: linear-gradient(180deg, var(--ka-jin-liang), var(--ka-jin));
  filter: brightness(0.96);
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(2, 4, 14, 0.3);
}

.anniu-zhuyao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.anniu-zhuyao[aria-busy='true'] {
  background: transparent;
  background-image: none;
  color: var(--ka-zhu-wen);
  border-color: var(--ka-jin);
  filter: none;
  box-shadow: none;
}

.anniu-zhuyao[aria-busy='true']:hover:not(:disabled) {
  background: var(--ka-jin-mian);
  background-image: none;
  color: var(--ka-zhu-wen);
  box-shadow: none;
}

.anniu-zhuyao[aria-busy='true']:active:not(:disabled) {
  background: var(--ka-jin-xian);
  background-image: none;
  transform: none;
}

.anniu-zhuyao:disabled {
  background: var(--ka-jin-mian);
  background-image: none;
  border-color: var(--ka-jin-xian);
  color: var(--ka-san-wen);
  cursor: not-allowed;
  opacity: 1;
  transform: none;
  box-shadow: none;
}

:deep(.fenlie-shuru) {
  color: var(--ka-zhu-wen);
  caret-color: var(--ka-ci-wen);
  font-size: var(--shuru-kuang-zihao);
  letter-spacing: 0.02em;
  -webkit-text-fill-color: var(--ka-zhu-wen);
}

:deep(.fenlie-shuru:-webkit-autofill),
:deep(.fenlie-shuru:-webkit-autofill:hover),
:deep(.fenlie-shuru:-webkit-autofill:focus),
:deep(.fenlie-shuru:-webkit-autofill:active) {
  -webkit-text-fill-color: var(--ka-zhu-wen) !important;
  caret-color: var(--ka-ci-wen) !important;
  background-color: var(--renzheng-mian-se) !important;
}

:deep(.fudong-biaoqian) {
  color: var(--ka-ci-wen);
  font-size: var(--shuru-kuang-zihao);
  letter-spacing: 0.02em;
}

:deep(.shuru-zu.shangFu .fudong-biaoqian),
:deep(.shuru-zu:focus-within .fudong-biaoqian),
:deep(.shuru-zu:has(.fenlie-shuru:-webkit-autofill) .fudong-biaoqian) {
  color: var(--ka-ci-wen);
  font-size: var(--ziti-xiao);
}

.mima-qiehuan {
  top: 50%;
  transform: translateY(-50%);
  padding: var(--jiange-6);
  color: var(--ka-ci-wen);
  border-radius: var(--yuanjiao-xiao);
}

.mima-qiehuan::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.mima-qiehuan:hover {
  transform: translateY(-50%);
  color: var(--ka-zhu-wen);
}

.mima-qiehuan:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}
</style>
