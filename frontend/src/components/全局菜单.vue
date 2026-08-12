<template>
  <nav class="quanju-caidan">
    <div class="caidan-neirong">
      <div class="caidan-zuo">
        <button
          class="fanhui-anniu"
          :class="{ yincang: !xianShiFanHui }"
          :aria-hidden="!xianShiFanHui"
          @click="fanHuiShangYiYe"
        >
          <span class="fanhui-jiantou">←</span>
          <span class="fanhui-wenzi">{{ huoQuFanYi('caidan', 'fanHui') }}</span>
        </button>
        <button
          class="zhuye-anniu"
          :class="{ yincang: !xianShiZhuYe }"
          :aria-hidden="!xianShiZhuYe"
          :title="huoQuFanYi('caidan', 'zhuYe')"
          :aria-label="huoQuFanYi('caidan', 'zhuYe')"
          @click="fanHuiShouYe"
        >
          <span class="zhuye-tubiao">⌂</span>
          <span class="zhuye-wenzi">{{ huoQuFanYi('caidan', 'zhuYe') }}</span>
        </button>
        <div class="yonghu-xuanxiang" @click="dianJiYongHuQuYu">
          <div class="yonghu-touxiang-xiao">
            <img
              v-if="用户仓库.dangQianYongHu?.tou_xiang"
              :src="用户仓库.dangQianYongHu.tou_xiang"
              class="touxiang-xiao-tu"
              alt=""
            />
            <span v-else class="touxiang-moren">{{ huoQuFanYi('caidan', 'yongHu') }}</span>
          </div>
          <span class="yonghu-mingcheng">{{ xianShiNiCheng }}</span>
          <span
            v-if="用户仓库.dangQianYongHu"
            class="zhankai-jiantou"
            :class="{ xuanzhuan: yongHuCaiDanZhanKai }"
            >▾</span
          >
          <Transition name="xiala">
            <div
              v-if="yongHuCaiDanZhanKai && 用户仓库.dangQianYongHu"
              class="xiala-caidan yonghu-xiala"
              @click.stop
            >
              <div
                class="zhanghao-shezhi-zu"
                @mouseenter="feiChuKaiQi(false)"
                @mouseleave="feiChuGuanBi"
              >
                <button
                  class="xiala-xiangmu zhanghao-shezhi-biaoti"
                  :aria-expanded="zhangHaoSheZhiZhanKai"
                  aria-haspopup="menu"
                  :aria-controls="zhangHaoSheZhiZhanKai ? 'zhanghao-shezhi-feichu' : undefined"
                  @click="qieHuanZhangHaoSheZhi"
                  @keydown.right.prevent="feiChuKaiQi(true)"
                  @keydown.esc.prevent="feiChuGuanBi"
                >
                  <span>{{ huoQuFanYi('caidan', 'zhangHaoSheZhi') }}</span>
                  <span
                    class="zhanghao-shezhi-jiantou"
                    :class="{ xuanzhuan: zhangHaoSheZhiZhanKai }"
                    >▶</span
                  >
                </button>
                <Transition name="feichu">
                  <div
                    v-if="zhangHaoSheZhiZhanKai"
                    id="zhanghao-shezhi-feichu"
                    ref="feiChuLie"
                    class="zhanghao-shezhi-feichu"
                    role="menu"
                    :aria-label="huoQuFanYi('caidan', 'zhangHaoSheZhi')"
                  >
                    <button class="xiala-xiangmu" role="menuitem" @click="daKaiXiuGaiYongHuMing">
                      {{ huoQuFanYi('caidan', 'xiuGaiYongHuMing') }}
                    </button>
                    <button class="xiala-xiangmu" role="menuitem" @click="daKaiXiuGaiMiMa">
                      {{ huoQuFanYi('caidan', 'xiuGaiMiMa') }}
                    </button>
                    <button class="xiala-xiangmu" role="menuitem" @click="daKaiSheZhiMoRenXingBie">
                      {{ huoQuFanYi('caidan', 'sheZhiMoRenXingBie') }}
                    </button>
                    <button
                      class="xiala-xiangmu tuichu-xiangmu"
                      role="menuitem"
                      @click="zhiXingTuiChu"
                    >
                      {{ huoQuFanYi('caidan', 'tuiChuDengLu') }}
                    </button>
                  </div>
                </Transition>
              </div>
              <button class="xiala-xiangmu" @click="jinRuZhanJi">
                {{ huoQuFanYi('caidan', 'guoWangZhanJi') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="caidan-zhong">
        <div v-if="shiLiaoTianYe && 聊天仓库.jiaoSeXinXi" class="liaotian-biaoti-zu">
          <span class="jiaose-mingcheng-caidan">{{ xianShiJiaoSeMing }}</span>
          <span v-if="聊天仓库.zhengZaiShuRu" class="duifang-shuru-tishi">
            {{ huoQuFanYi('liaoTian', 'duiFangZhengZaiShuRu') }}
          </span>
        </div>
        <h1 v-else class="ye-mian-biao-ti">{{ dangQianYeMianBiaoTi }}</h1>
      </div>

      <div class="caidan-you">
        <button
          v-if="shiLiaoTianYe && 聊天仓库.jiaoSeXinXi"
          class="junshi-anniu"
          :title="huoQuFanYi('caidan', 'junShiZhiDao')"
          :aria-label="huoQuFanYi('caidan', 'junShiZhiDao')"
          @click="tongZhiJunShiZhiDao"
        >
          <span class="junshi-wenzi-quan">{{ huoQuFanYi('caidan', 'junShiZhiDao') }}</span>
          <span class="junshi-wenzi-duan">{{ huoQuFanYi('caidan', 'junShi') }}</span>
        </button>
        <button
          class="zhuti-qiehuan-anniu"
          :title="zhutiAnNiuBiaoTi"
          :aria-label="zhutiAnNiuBiaoTi"
          @click="qieHuanZhuti"
        >
          <span class="zhuti-tubiao">{{ zhutiAnNiuTuBiao }}</span>
        </button>
        <button
          v-if="用户仓库.dangQianYongHu"
          class="tongzhi-anniu"
          :aria-label="huoQuFanYi('caidan', 'tongZhi')"
          @click="jinRuTongZhi"
        >
          <span class="tongzhi-tubiao">{{ huoQuFanYi('caidan', 'tongZhiTuBiao') }}</span>
          <span v-if="通知仓库.weiDuShu > 0" class="tongzhi-badge">{{ xianShiTongZhiShu }}</span>
        </button>
        <span
          class="banben-wenben"
          :aria-label="`${huoQuFanYi('caidan', 'banBenHao')} ${banBenHao}`"
          >{{ banBenHao }}</span
        >
        <div class="qita-xuanxiang" @click="qieHuanQitaCaiDan">
          <span class="qita-tubiao">☰</span>
          <span class="qita-wenzi">{{ huoQuFanYi('caidan', 'gengDuo') }}</span>
          <Transition name="xiala">
            <div v-if="qitaCaiDanZhanKai" class="xiala-caidan qita-xiala" @click.stop>
              <button class="xiala-xiangmu" @click="daKaiXieYi('yongHuXieYi')">
                {{ huoQuFanYi('caidan', 'yongHuXieYi') }}
              </button>
              <button class="xiala-xiangmu" @click="daKaiXieYi('yinSiZhengCe')">
                {{ huoQuFanYi('caidan', 'yinSiZhengCe') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <component
      :is="协议模态框"
      :xian-shi="xieYiXianShi"
      :lei-xing="xieYiLeiXing"
      @guan-bi="xieYiXianShi = false"
    />

    <Teleport to="body">
      <Transition name="motaikuang">
        <div
          v-if="xiuGaiYongHuMingXianShi"
          class="xiugai-zhezhao"
          @click.self="xiuGaiYongHuMingXianShi = false"
        >
          <div class="xiugai-tanchuang">
            <h3 class="xiugai-biaoti">
              {{ huoQuFanYi('caidan', 'xiuGaiYongHuMing') }}
            </h3>
            <div class="xiugai-shuru-zu">
              <input
                v-model="xinYongHuMing"
                type="text"
                class="xiugai-shuru"
                :placeholder="huoQuFanYi('ui', 'xinYongHuMing')"
                maxlength="30"
              />
            </div>
            <div v-if="xiuGaiCuoWu" class="xiugai-cuowu">
              {{ xiuGaiCuoWu }}
            </div>
            <div class="xiugai-anniu-zu">
              <button class="xiugai-anniu quxiao" @click="xiuGaiYongHuMingXianShi = false">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button
                class="xiugai-anniu queding"
                :disabled="xiuGaiJinXingZhong || !xinYongHuMing.trim()"
                @click="zhiXingXiuGaiYongHuMing"
              >
                {{
                  xiuGaiJinXingZhong
                    ? huoQuFanYi('renZheng', 'xiuGaiZhong')
                    : huoQuFanYi('renZheng', 'queRen')
                }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="motaikuang">
        <div
          v-if="xiuGaiMiMaXianShi"
          class="xiugai-zhezhao"
          @click.self="xiuGaiMiMaXianShi = false"
        >
          <div class="xiugai-tanchuang">
            <h3 class="xiugai-biaoti">
              {{ huoQuFanYi('caidan', 'xiuGaiMiMa') }}
            </h3>
            <div class="xiugai-shuru-zu">
              <input
                v-model="jiuMiMa"
                type="password"
                class="xiugai-shuru"
                :placeholder="huoQuFanYi('ui', 'jiuMiMa')"
              />
            </div>
            <div class="xiugai-shuru-zu">
              <input
                v-model="xinMiMa"
                type="password"
                class="xiugai-shuru"
                :placeholder="huoQuFanYi('ui', 'xinMiMa')"
              />
            </div>
            <div class="xiugai-shuru-zu">
              <input
                v-model="queRenXinMiMa"
                type="password"
                class="xiugai-shuru"
                :placeholder="huoQuFanYi('ui', 'queRenXinMiMa')"
              />
            </div>
            <div class="xiugai-shuru-zu yanzhengma-zu">
              <input
                v-model="yanZhengMa"
                type="tel"
                maxlength="6"
                class="xiugai-shuru"
                :placeholder="huoQuFanYi('ui', 'yanZhengMa')"
              />
              <button
                type="button"
                class="fasong-anniu"
                :disabled="!keYiFaSongMa || faSongZhong"
                @click="zhiXingFaSongMa"
              >
                {{ faSongWenBen }}
              </button>
            </div>
            <div v-if="xiuGaiCuoWu" class="xiugai-cuowu">
              {{ xiuGaiCuoWu }}
            </div>
            <div class="xiugai-anniu-zu">
              <button class="xiugai-anniu quxiao" @click="xiuGaiMiMaXianShi = false">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button
                class="xiugai-anniu queding"
                :disabled="xiuGaiJinXingZhong || !keYiXiuGaiMiMa"
                @click="zhiXingXiuGaiMiMa"
              >
                {{
                  xiuGaiJinXingZhong
                    ? huoQuFanYi('renZheng', 'xiuGaiZhong')
                    : huoQuFanYi('renZheng', 'queRen')
                }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="motaikuang">
        <div
          v-if="sheZhiMoRenXingBieXianShi"
          class="xiugai-zhezhao"
          @click.self="sheZhiMoRenXingBieXianShi = false"
        >
          <div class="xiugai-tanchuang">
            <h3 class="xiugai-biaoti">
              {{ huoQuFanYi('caidan', 'sheZhiMoRenXingBie') }}
            </h3>
            <p class="xiugai-miaoShu">{{ huoQuFanYi('caidan', 'moRenXingBieMiaoShu') }}</p>
            <div class="moRen-xingBie-wangGe">
              <button
                class="xingBie-kaPian moRen-xingBie-kaPian"
                :class="{ beiXuanZhong: moRenXingBieXuanZhong === 'male' }"
                @click="moRenXingBieXuanZhong = 'male'"
              >
                <span class="xingBie-mingCheng">{{
                  huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')
                }}</span>
              </button>
              <button
                class="xingBie-kaPian moRen-xingBie-kaPian"
                :class="{ beiXuanZhong: moRenXingBieXuanZhong === 'female' }"
                @click="moRenXingBieXuanZhong = 'female'"
              >
                <span class="xingBie-mingCheng">{{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}</span>
              </button>
            </div>
            <div v-if="sheZhiCuoWu" class="xiugai-cuowu">
              {{ sheZhiCuoWu }}
            </div>
            <div class="xiugai-anniu-zu">
              <button class="xiugai-anniu quxiao" @click="sheZhiMoRenXingBieXianShi = false">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button
                class="xiugai-anniu queding"
                :disabled="sheZhiJinXingZhong || !moRenXingBieXuanZhong"
                @click="zhiXingSheZhiMoRenXingBie"
              >
                {{
                  sheZhiJinXingZhong
                    ? huoQuFanYi('renZheng', 'xiuGaiZhong')
                    : huoQuFanYi('renZheng', 'queRen')
                }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用主题仓库, 浅色值 } from '@/stores/主题'
import { 使用通知仓库 } from '@/stores/通知'
import { gengGaiYongHuMing, gengGaiMiMa, gengGaiMoRenXingBie, faSongMa } from '@/api/认证'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { huoQuFanYi } from '@/config/translations'
import type { XingBie } from '@/types'
import 协议模态框 from '@/components/协议模态框.vue'

const 用户仓库 = 使用用户仓库()
const 认证表单仓库 = 使用认证表单仓库()
const 聊天仓库 = 使用聊天仓库()
const 主题仓库 = 使用主题仓库()
const 通知仓库 = 使用通知仓库()
const router = useRouter()
const route = useRoute()

const yongHuCaiDanZhanKai = ref(false)
const zhangHaoSheZhiZhanKai = ref(false)
const feiChuLie = ref<HTMLElement | null>(null)
const qitaCaiDanZhanKai = ref(false)
const xieYiXianShi = ref(false)
const xieYiLeiXing = ref<'yongHuXieYi' | 'yinSiZhengCe'>('yongHuXieYi')

const xiuGaiYongHuMingXianShi = ref(false)
const xiuGaiMiMaXianShi = ref(false)
const xinYongHuMing = ref('')
const jiuMiMa = ref('')
const xinMiMa = ref('')
const queRenXinMiMa = ref('')
const xiuGaiCuoWu = ref('')
const xiuGaiJinXingZhong = ref(false)
const banBenHao = '1.0.0'
const yanZhengMa = ref('')
const faSongZhong = ref(false)
const daoJiShi = ref(0)
let faSongDaoJiShiQi: ReturnType<typeof setInterval> | null = null

const sheZhiMoRenXingBieXianShi = ref(false)
const moRenXingBieXuanZhong = ref<XingBie | null>(null)
const sheZhiCuoWu = ref('')
const sheZhiJinXingZhong = ref(false)

const xianShiNiCheng = computed(() => {
  if (用户仓库.dangQianYongHu && 用户仓库.mingChengKeJian) {
    return (
      用户仓库.dangQianYongHu.ni_cheng ||
      用户仓库.dangQianYongHu.yong_hu_ming ||
      huoQuFanYi('caidan', 'yongHu')
    )
  }
  return huoQuFanYi('caidan', 'weiDengLu')
})

const xianShiFanHui = computed(() => {
  const yinCangLuYou = ['zhuJieMian', 'dengLu', 'zhuCe']
  return !yinCangLuYou.includes(route.name as string)
})

const xianShiZhuYe = computed(() => {
  // 主页路由下“主页”按钮功能冗余（与居中页面标题重复），需隐藏；但为保持左槽宽度、避免
  // 右侧“个人资料”等元素因左槽塌缩而挤位，仅以 visibility:hidden 占位保留在 DOM 流中。
  // 登录/注册页同样隐藏（沿用原逻辑）。其余路由正常显示该按钮。
  const yinCangLuYou = ['zhuJieMian', 'dengLu', 'zhuCe']
  return !yinCangLuYou.includes(route.name as string)
})

const shiLiaoTianYe = computed(() => route.name === 'liaoTian')

const xianShiJiaoSeMing = computed(() => {
  return (
    聊天仓库.jiaoSeXinXi?.wei_xin_ming ||
    聊天仓库.jiaoSeXinXi?.ming_zi ||
    huoQuFanYi('liaoTian', 'duiFang')
  )
})

const fanYiBiaoTiDuiZhao: Record<
  string,
  | 'zhuJieMian'
  | 'dengLu'
  | 'ziLiaoSheZhi'
  | 'tianJiaWeiXin'
  | 'tongZhi'
  | 'guoWangZhanJi'
  | 'junShiJiLuXiangQing'
  | 'yongHuXieYi'
  | 'yinSiZhengCe'
> = {
  zhuJieMian: 'zhuJieMian',
  dengLu: 'dengLu',
  ziLiaoSheZhi: 'ziLiaoSheZhi',
  tianJiaWeiXin: 'tianJiaWeiXin',
  tongZhi: 'tongZhi',
  guoWangZhanJi: 'guoWangZhanJi',
  junShiJiLuXiangQing: 'junShiJiLuXiangQing',
}

const dangQianYeMianBiaoTi = computed(() => {
  const luYouMing = route.name as string
  if (luYouMing && luYouMing in fanYiBiaoTiDuiZhao) {
    return huoQuFanYi('yeMianBiaoTi', fanYiBiaoTiDuiZhao[luYouMing])
  }
  return huoQuFanYi('caidan', 'fanHui')
})

const xianShiTongZhiShu = computed(() => {
  return 通知仓库.weiDuShu > 99 ? '99+' : String(通知仓库.weiDuShu)
})

const zhutiAnNiuBiaoTi = computed(() => {
  return 主题仓库.dangQianZhuti === 浅色值
    ? huoQuFanYi('caidan', 'qieHuanShenSe')
    : huoQuFanYi('caidan', 'qieHuanQianSe')
})

const zhutiAnNiuTuBiao = computed(() => {
  return 主题仓库.dangQianZhuti === 浅色值
    ? huoQuFanYi('caidan', 'zhutiShenSeTuBiao')
    : huoQuFanYi('caidan', 'zhutiQianSeTuBiao')
})

const keYiXiuGaiMiMa = computed(() => {
  return (
    jiuMiMa.value.length > 0 &&
    xinMiMa.value.length > 0 &&
    queRenXinMiMa.value.length > 0 &&
    /^\d{6}$/.test(yanZhengMa.value)
  )
})

const keYiFaSongMa = computed(
  () => /^1[3-9]\d{9}$/.test(用户仓库.dangQianYongHu?.shou_ji_hao || '') && daoJiShi.value === 0,
)

const faSongWenBen = computed(() => {
  if (faSongZhong.value) return huoQuFanYi('renZheng', 'faSongZhong')
  if (daoJiShi.value > 0) return `${daoJiShi.value}s`
  return huoQuFanYi('renZheng', 'huoQuYanZhengMa')
})

function qieHuanYongHuCaiDan() {
  if (!用户仓库.dangQianYongHu) return
  yongHuCaiDanZhanKai.value = !yongHuCaiDanZhanKai.value
  if (!yongHuCaiDanZhanKai.value) zhangHaoSheZhiZhanKai.value = false
  qitaCaiDanZhanKai.value = false
}

const zhiChiTingLiu =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover)').matches
    : true

function feiChuJiaoDianShouXiang() {
  const shouXiang = feiChuLie.value?.querySelector('button')
  if (shouXiang instanceof HTMLElement) shouXiang.focus()
}

// jiaoDian=true 表示由键盘触发，展开后焦点移入飞出列首子项；
// jiaoDian=false 表示由桌面 hover 触发，仅展开不抢焦点。
function feiChuKaiQi(jiaoDian: boolean) {
  if (!用户仓库.dangQianYongHu) return
  if (!jiaoDian && !zhiChiTingLiu) return
  zhangHaoSheZhiZhanKai.value = true
  if (jiaoDian) nextTick(feiChuJiaoDianShouXiang)
}

function feiChuGuanBi() {
  zhangHaoSheZhiZhanKai.value = false
}

function qieHuanZhangHaoSheZhi() {
  if (!用户仓库.dangQianYongHu) return
  zhangHaoSheZhiZhanKai.value = !zhangHaoSheZhiZhanKai.value
  if (zhangHaoSheZhiZhanKai.value) nextTick(feiChuJiaoDianShouXiang)
}

// 已登录：展开/收起个人下拉菜单；未登录：复用同一模块，点击跳转登录页
function dianJiYongHuQuYu() {
  if (用户仓库.dangQianYongHu) {
    qieHuanYongHuCaiDan()
  } else {
    jinRuDengLu()
  }
}

function qieHuanQitaCaiDan() {
  qitaCaiDanZhanKai.value = !qitaCaiDanZhanKai.value
  yongHuCaiDanZhanKai.value = false
}

function qieHuanZhuti() {
  主题仓库.qieHuanZhuti(主题仓库.dangQianZhuti === 浅色值 ? '暗色' : 浅色值)
}

function daKaiXieYi(leiXing: 'yongHuXieYi' | 'yinSiZhengCe') {
  xieYiLeiXing.value = leiXing
  xieYiXianShi.value = true
  qitaCaiDanZhanKai.value = false
}

function jinRuTongZhi() {
  qitaCaiDanZhanKai.value = false
  router.push('/tong-zhi')
}

function jinRuDengLu() {
  router.push('/login').catch(() => {})
}

function fanHuiShangYiYe() {
  router.back()
}

function fanHuiShouYe() {
  router.push('/')
}

function tongZhiJunShiZhiDao() {
  window.dispatchEvent(new CustomEvent('junshi-zhankai'))
}

function jinRuZhanJi() {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  zhangHaoSheZhiZhanKai.value = false
  router.push('/guo-wang-zhan-ji')
}

function daKaiSheZhiMoRenXingBie() {
  yongHuCaiDanZhanKai.value = false
  zhangHaoSheZhiZhanKai.value = false
  moRenXingBieXuanZhong.value = 用户仓库.dangQianYongHu?.mo_ren_xing_bie || null
  sheZhiCuoWu.value = ''
  sheZhiMoRenXingBieXianShi.value = true
}

async function zhiXingSheZhiMoRenXingBie() {
  if (!moRenXingBieXuanZhong.value) return
  sheZhiJinXingZhong.value = true
  sheZhiCuoWu.value = ''
  try {
    await gengGaiMoRenXingBie(moRenXingBieXuanZhong.value)
    await 用户仓库.jiaZaiYongHu()
    sheZhiMoRenXingBieXianShi.value = false
  } catch (cuoWu: unknown) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      sheZhiCuoWu.value = xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai')
    } else {
      sheZhiCuoWu.value = huoQuFanYi('renZheng', 'xiuGaiShiBai')
    }
  } finally {
    sheZhiJinXingZhong.value = false
  }
}

function daKaiXiuGaiYongHuMing() {
  yongHuCaiDanZhanKai.value = false
  zhangHaoSheZhiZhanKai.value = false
  xinYongHuMing.value = 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  xiuGaiCuoWu.value = ''
  xiuGaiYongHuMingXianShi.value = true
}

function daKaiXiuGaiMiMa() {
  yongHuCaiDanZhanKai.value = false
  zhangHaoSheZhiZhanKai.value = false
  jiuMiMa.value = ''
  xinMiMa.value = ''
  queRenXinMiMa.value = ''
  yanZhengMa.value = ''
  xiuGaiCuoWu.value = ''
  xiuGaiMiMaXianShi.value = true
}

async function zhiXingXiuGaiYongHuMing() {
  if (!xinYongHuMing.value.trim()) return
  xiuGaiJinXingZhong.value = true
  xiuGaiCuoWu.value = ''
  try {
    await gengGaiYongHuMing(xinYongHuMing.value.trim())
    await 用户仓库.jiaZaiYongHu()
    xiuGaiYongHuMingXianShi.value = false
  } catch (cuoWu: unknown) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      xiuGaiCuoWu.value = xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai')
    } else {
      xiuGaiCuoWu.value = huoQuFanYi('renZheng', 'xiuGaiShiBai')
    }
  } finally {
    xiuGaiJinXingZhong.value = false
  }
}

async function zhiXingFaSongMa() {
  if (!keYiFaSongMa.value) return
  faSongZhong.value = true
  xiuGaiCuoWu.value = ''
  try {
    await faSongMa(用户仓库.dangQianYongHu!.shou_ji_hao)
    daoJiShi.value = 60
    if (faSongDaoJiShiQi) clearInterval(faSongDaoJiShiQi)
    faSongDaoJiShiQi = setInterval(() => {
      daoJiShi.value--
      if (daoJiShi.value <= 0) {
        daoJiShi.value = 0
        if (faSongDaoJiShiQi) {
          clearInterval(faSongDaoJiShiQi)
          faSongDaoJiShiQi = null
        }
      }
    }, 1000)
  } catch (cuoWu: unknown) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      xiuGaiCuoWu.value =
        xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai')
    } else {
      xiuGaiCuoWu.value = huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai')
    }
  } finally {
    faSongZhong.value = false
  }
}

async function zhiXingXiuGaiMiMa() {
  if (!keYiXiuGaiMiMa.value) return
  if (xinMiMa.value !== queRenXinMiMa.value) {
    xiuGaiCuoWu.value = huoQuFanYi('renZheng', 'miMaBuYiZhi')
    return
  }
  xiuGaiJinXingZhong.value = true
  xiuGaiCuoWu.value = ''
  try {
    await gengGaiMiMa(jiuMiMa.value, xinMiMa.value, queRenXinMiMa.value, yanZhengMa.value)
    xiuGaiMiMaXianShi.value = false
  } catch (cuoWu: unknown) {
    if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
      const xiangYing = huoQuCuoWuXiangYing(cuoWu)
      xiuGaiCuoWu.value = xiangYing?.data?.ti_shi || huoQuFanYi('renZheng', 'xiuGaiShiBai')
    } else {
      xiuGaiCuoWu.value = huoQuFanYi('renZheng', 'xiuGaiShiBai')
    }
  } finally {
    xiuGaiJinXingZhong.value = false
  }
}

function zhiXingTuiChu() {
  yongHuCaiDanZhanKai.value = false
  zhangHaoSheZhiZhanKai.value = false
  认证表单仓库.qingKongDengLuZhuCe()
  认证表单仓库.qingKongZiLiao()
  聊天仓库.qingKongZhuangTai()
  if (route.name === 'zhuJieMian') {
    用户仓库.qingQiuTuiChu()
  } else {
    用户仓库.tuiChuDengLu()
    router.push('/login')
  }
}

function dianJiWaiBuGuanBi(shiJian: MouseEvent) {
  const muBiao = shiJian.target as HTMLElement
  if (!muBiao.closest('.quanju-caidan')) {
    yongHuCaiDanZhanKai.value = false
    zhangHaoSheZhiZhanKai.value = false
    qitaCaiDanZhanKai.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', dianJiWaiBuGuanBi)
  if (用户仓库.令牌) {
    通知仓库.jiaZaiTongZhi()
    通知仓库.lianJieSocket()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', dianJiWaiBuGuanBi)
  通知仓库.duanKaiSocket()
})

watch(
  () => 用户仓库.令牌,
  (令牌) => {
    if (令牌) {
      通知仓库.jiaZaiTongZhi()
      通知仓库.lianJieSocket()
    } else {
      通知仓库.duanKaiSocket()
    }
  },
)
</script>

<style scoped>
.quanju-caidan {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  z-index: 100;
  height: 52px;
  height: calc(52px + var(--anquan-quyu-shang));
  min-height: 52px;
  min-height: calc(52px + var(--anquan-quyu-shang));
  background: var(--daohanglan-beijing);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--daohanglan-xiabiankuang);
  box-shadow: var(--daohanglan-yinying);
  padding-top: var(--anquan-quyu-shang);
}

.caidan-neirong {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

.caidan-zuo,
.caidan-zhong,
.caidan-you {
  display: flex;
  align-items: center;
  min-width: 0;
}

.caidan-zuo {
  justify-content: flex-start;
  gap: 8px;
}

.fanhui-anniu {
  font-size: 14px;
  color: var(--daohanglan-wenben);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.fanhui-wenzi {
  display: inline;
}

.fanhui-jiantou {
  display: inline;
}

.fanhui-anniu.yincang {
  visibility: hidden;
  pointer-events: none;
}

.fanhui-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
}

.zhuye-anniu {
  font-size: 14px;
  color: var(--daohanglan-wenben);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.zhuye-anniu.yincang {
  visibility: hidden;
  pointer-events: none;
}

.zhuye-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
}

.zhuye-tubiao {
  display: inline;
  font-size: 15px;
}

.zhuye-wenzi {
  display: inline;
}

.caidan-zhong {
  justify-content: center;
  gap: 10px;
  min-width: 0;
}

.caidan-you {
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.yonghu-xuanxiang {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 10px;
  transition: background 0.2s ease;
  position: relative;
  min-width: 0;
}

.yonghu-xuanxiang:hover {
  background: var(--daohanglan-hover);
}

.yonghu-touxiang-xiao {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-touming-beijing);
  flex-shrink: 0;
  font-size: 11px;
  color: var(--daohanglan-ciwenben);
  font-weight: 600;
}

.touxiang-xiao-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.touxiang-moren {
  font-size: 11px;
}

.yonghu-mingcheng {
  font-size: 13px;
  font-weight: 600;
  color: var(--daohanglan-wenben);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.4s ease;
}

.zhankai-jiantou {
  font-size: 16px;
  color: var(--daohanglan-jiantou);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.zhankai-jiantou.xuanzhuan {
  transform: rotate(180deg);
}

.xiala-caidan {
  position: absolute;
  top: calc(100% + 8px);
  min-width: 160px;
  background: var(--xiala-beijing);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--xiala-biankuang);
  border-radius: 12px;
  box-shadow: var(--xiala-yinying);
  padding: 6px;
  z-index: 200;
}

.yonghu-xiala {
  left: 0;
}

.yonghu-xiala .zhanghao-shezhi-zu {
  position: relative;
}

/* 飞出列：账号设置二级菜单独立成右列（cascade 飞出，纯 CSS 定位，无重布局抖动） */
.zhanghao-shezhi-feichu {
  position: absolute;
  left: calc(100% + 8px);
  top: -6px;
  min-width: 170px;
  background: var(--xiala-beijing);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--xiala-biankuang);
  border-radius: 12px;
  box-shadow: var(--xiala-yinying);
  padding: 6px;
  z-index: 300;
}

.qita-xiala {
  right: 0;
}

.xiala-xiangmu {
  display: block;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  color: var(--xiala-wenben);
  border-radius: 8px;
  transition: all 0.15s ease;
  cursor: pointer;
  background: transparent;
  border: none;
}

.xiala-xiangmu:hover {
  background: var(--xiala-hover-beijing);
  color: var(--xiala-hover-wenben);
}

.tuichu-xiangmu {
  color: var(--yanse-weixian) !important;
}

:root[data-theme='light'] .tuichu-xiangmu {
  color: var(--yanse-weixian) !important;
}

.tuichu-xiangmu:hover {
  background: var(--tuichu-hover-beijing);
  color: var(--yanse-weixian-shen) !important;
}

.zhanghao-shezhi-biaoti {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--xiala-wenben);
  border-radius: 8px;
  transition: all 0.15s ease;
  cursor: pointer;
  background: transparent;
  border: none;
}

.zhanghao-shezhi-biaoti:hover {
  background: var(--xiala-hover-beijing);
  color: var(--xiala-hover-wenben);
}

.zhanghao-shezhi-jiantou {
  font-size: 14px;
  color: var(--daohanglan-jiantou);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.zhanghao-shezhi-jiantou.xuanzhuan {
  transform: rotate(90deg);
}

.xiugai-miaoShu {
  font-size: 13px;
  color: var(--tanchuang-ciwenben, var(--daohanglan-ciwenben));
  text-align: center;
  margin: 0 0 4px;
  opacity: 0.8;
}

.moRen-xingBie-wangGe {
  display: flex;
  gap: 14px;
  justify-content: center;
  width: 100%;
  margin: 8px 0 4px;
}

.moRen-xingBie-kaPian {
  flex: 1;
  min-width: 0;
  max-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 12px;
  background: var(--shuru-touming-beijing);
  border: 2px solid var(--shuru-touming-biankuang);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.moRen-xingBie-kaPian:hover {
  background: var(--xiala-hover-beijing);
  border-color: var(--xiala-hover-biankuang, var(--nuanhui-lan));
}

.moRen-xingBie-kaPian.beiXuanZhong {
  background: linear-gradient(135deg, rgba(107, 140, 166, 0.3), rgba(196, 160, 176, 0.3));
  border-color: var(--nuanhui-lan);
  box-shadow: 0 0 16px rgba(107, 140, 166, 0.3);
}

.moRen-xingBie-kaPian .xingBie-mingCheng {
  font-size: 16px;
  font-weight: 700;
  color: var(--xiala-wenben);
}

.moRen-xingBie-kaPian.beiXuanZhong .xingBie-mingCheng {
  color: #ffffff;
}

.ye-mian-biao-ti {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  color: var(--daohanglan-qiangwenben);
  margin: 0;
  padding: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.jiaose-mingcheng-caidan {
  font-size: 14px;
  font-weight: 600;
  color: var(--daohanglan-qiangwenben);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.liaotian-biaoti-zu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.duifang-shuru-tishi {
  font-size: 11px;
  font-weight: 400;
  color: var(--daohanglan-ciwenben);
  line-height: 1.2;
  white-space: nowrap;
}

.zhuti-qiehuan-anniu {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--daohanglan-qianbeijing);
  border: 1px solid var(--daohanglan-qianbiankuang);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.zhuti-qiehuan-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
  transform: scale(1.05);
}

.zhuti-tubiao {
  font-size: 16px;
}

.junshi-anniu {
  font-size: 13px;
  color: var(--yanse-qiangdiao);
  background: var(--junshi-anniu-beijing);
  border: none;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
}

.junshi-anniu:hover {
  background: var(--junshi-anniu-hover-beijing);
}

.junshi-wenzi-duan {
  display: none;
}

.tongzhi-anniu {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--daohanglan-qianbeijing);
  border: 1px solid var(--daohanglan-qianbiankuang);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tongzhi-anniu:hover {
  background: var(--daohanglan-zhongbeijing);
}

.tongzhi-tubiao {
  font-size: 16px;
}

.tongzhi-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--tongzhi-badge-beijing);
  color: var(--tongzhi-badge-wenben);
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.banben-wenben {
  font-size: 12px;
  font-weight: 600;
  color: var(--daohanglan-ciwenben);
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--daohanglan-qianbeijing);
  border: 1px solid var(--daohanglan-qianbiankuang);
  flex-shrink: 0;
  user-select: none;
}

.qita-xuanxiang {
  position: relative;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.qita-xuanxiang:hover {
  background: var(--daohanglan-hover);
}

.qita-tubiao {
  font-size: 16px;
  color: var(--daohanglan-ciwenben);
}

.qita-wenzi {
  font-size: 12px;
  color: var(--daohanglan-ciwenben);
  font-weight: 500;
}

.xiugai-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--zhezhao-beijing);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.xiugai-tanchuang {
  width: 100%;
  max-width: 360px;
  padding: 28px 24px;
  background: var(--tanchuang-beijing);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--tanchuang-biankuang);
  border-radius: 20px;
  box-shadow: var(--tanchuang-yinying);
}

.xiugai-biaoti {
  font-size: 18px;
  font-weight: 700;
  color: var(--tanchuang-biaoti);
  text-align: center;
  margin: 0 0 20px;
}

.xiugai-shuru-zu {
  margin-bottom: 14px;
}

.xiugai-shuru {
  width: 100%;
  padding: 12px 16px;
  background: var(--shuru-touming-beijing);
  border: 1px solid var(--shuru-touming-biankuang);
  border-radius: 10px;
  color: var(--shuru-touming-wenben);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.xiugai-shuru:focus {
  border-color: var(--nuanhui-lan);
}

.xiugai-shuru::placeholder {
  color: var(--shuru-zhanwei-touming);
}

.xiugai-cuowu {
  padding: 8px 12px;
  background: var(--cuowu-touming-beijing);
  border: 1px solid var(--cuowu-touming-biankuang);
  border-radius: 8px;
  color: var(--cuowu-qianse);
  font-size: 12px;
  margin-bottom: 14px;
}

.xiugai-anniu-zu {
  display: flex;
  gap: 12px;
}

.xiugai-anniu {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.xiugai-anniu.quxiao {
  background: var(--quxiao-anniu-beijing);
  border: 1px solid var(--quxiao-anniu-biankuang);
  color: var(--quxiao-anniu-wenben);
}

.xiugai-anniu.quxiao:hover {
  background: var(--quxiao-anniu-hover-beijing);
}

.xiugai-anniu.queding {
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: var(--wenzi-baise);
}

.xiugai-anniu.queding:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--nuanhui-lan-touming-yinying);
}

.xiugai-anniu.queding:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.fasong-anniu {
  padding: 10px 14px;
  background: var(--zhuse);
  color: var(--beijing-kaopian);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.fasong-anniu:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.xiala-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.xiala-leave-active {
  transition: all 0.15s ease;
}

.xiala-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.xiala-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.feichu-enter-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.feichu-leave-active {
  transition: all 0.12s ease;
}

.feichu-enter-from,
.feichu-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.96);
}

.motaikuang-enter-active {
  transition: opacity 0.25s ease;
}

.motaikuang-leave-active {
  transition: opacity 0.15s ease;
}

.motaikuang-enter-from,
.motaikuang-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .quanju-caidan {
    height: 48px;
    height: calc(48px + var(--anquan-quyu-shang));
    min-height: 48px;
    min-height: calc(48px + var(--anquan-quyu-shang));
  }

  .caidan-neirong {
    padding: 0 10px;
    gap: 6px;
  }

  .fanhui-anniu {
    padding: 6px 8px;
  }

  .fanhui-wenzi {
    display: none;
  }

  .zhuye-anniu {
    padding: 6px 8px;
  }

  .zhuye-wenzi {
    display: none;
  }

  .yonghu-xuanxiang {
    padding: 6px 8px;
    gap: 6px;
  }

  .yonghu-mingcheng {
    max-width: 90px;
  }

  .jiaose-mingcheng-caidan {
    max-width: 100px;
  }

  .ye-mian-biao-ti {
    font-size: 15px;
  }

  .junshi-anniu {
    padding: 6px 10px;
  }

  .junshi-wenzi-quan {
    display: none;
  }

  .junshi-wenzi-duan {
    display: inline;
  }

  .qita-xuanxiang {
    padding: 6px 8px;
  }

  .qita-wenzi {
    display: none;
  }

  .banben-wenben {
    display: none;
  }

  /* 窄屏：飞出列改为左列下方全宽子面板，避免溢出视口 */
  .zhanghao-shezhi-feichu {
    position: static;
    left: auto;
    top: auto;
    min-width: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    padding: 2px 0 2px 14px;
    margin-top: 2px;
  }
}

@media (max-width: 374px) {
  .yonghu-mingcheng {
    max-width: 70px;
  }

  .jiaose-mingcheng-caidan {
    max-width: 70px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fanhui-anniu,
  .yonghu-xuanxiang,
  .zhuti-qiehuan-anniu,
  .junshi-anniu,
  .tongzhi-anniu,
  .qita-xuanxiang,
  .xiala-xiangmu,
  .xiugai-anniu,
  .zhanghao-shezhi-feichu,
  .feichu-enter-active,
  .feichu-leave-active {
    transition: none;
  }

  .zhuti-qiehuan-anniu:hover,
  .xiugai-anniu.queding:hover:not(:disabled) {
    transform: none;
  }
}
</style>
