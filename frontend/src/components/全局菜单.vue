<template>
  <nav class="quanju-caidan">
    <div class="caidan-neirong">
      <div class="caidan-zuo">
        <button class="fanhui-anniu" :class="{ yincang: !xianShiFanHui }" @click="fanHuiShouYe">
          <span class="fanhui-jiantou">←</span>
          <span class="fanhui-wenzi">{{ huoQuFanYi('caidan', 'fanHui') }}</span>
        </button>
        <div class="yonghu-xuanxiang" @click="qieHuanYongHuCaiDan">
          <div class="yonghu-touxiang-xiao">
            <img
              v-if="用户仓库.dangQianYongHu?.tou_xiang"
              :src="用户仓库.dangQianYongHu.tou_xiang"
              class="touxiang-xiao-tu"
              alt=""
            />
            <span v-else class="touxiang-moren">👤</span>
          </div>
          <span class="yonghu-mingcheng">{{
            用户仓库.dangQianYongHu && 用户仓库.mingChengKeJian
              ? xianShiNiCheng
              : huoQuFanYi('caidan', 'weiDengLu')
          }}</span>
          <span class="zhankai-jiantou" :class="{ xuanzhuan: yongHuCaiDanZhanKai }">▾</span>
          <Transition name="xiala">
            <div
              v-if="yongHuCaiDanZhanKai && 用户仓库.dangQianYongHu"
              class="xiala-caidan yonghu-xiala"
              @click.stop
            >
              <button class="xiala-xiangmu" @click="daKaiXiuGaiYongHuMing">
                {{ huoQuFanYi('caidan', 'xiuGaiYongHuMing') }}
              </button>
              <button class="xiala-xiangmu" @click="daKaiXiuGaiMiMa">
                {{ huoQuFanYi('caidan', 'xiuGaiMiMa') }}
              </button>
              <button class="xiala-xiangmu" @click="jinRuZhanJi">
                {{ huoQuFanYi('caidan', 'guoWangZhanJi') }}
              </button>
              <div class="xiala-fenge" />
              <button class="xiala-xiangmu tuichu-xiangmu" @click="zhiXingTuiChu">
                {{ huoQuFanYi('caidan', 'tuiChuDengLu') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="caidan-zhong">
        <template v-if="route.name === 'liaoTian' && 聊天仓库.jiaoSeXinXi">
          <span class="jiaose-mingcheng-caidan">{{
            聊天仓库.jiaoSeXinXi.wei_xin_ming || 聊天仓库.jiaoSeXinXi.ming_zi || '对方'
          }}</span>
        </template>
        <button
          v-else
          class="zhuti-qiehuan-anniu"
          :title="主题仓库.dangQianZhuti === '浅色' ? '切换深色模式' : '切换浅色模式'"
          @click="qieHuanZhuti"
        >
          <span class="zhuti-tubiao">{{ 主题仓库.dangQianZhuti === '浅色' ? '🌙' : '☀️' }}</span>
        </button>
      </div>

      <div class="caidan-you">
        <button
          v-if="route.name === 'liaoTian' && 聊天仓库.jiaoSeXinXi"
          class="junshi-anniu"
          @click="tongZhiJunShiZhiDao"
        >
          <span class="junshi-wenzi-quan">{{ huoQuFanYi('caidan', 'junShiZhiDao') }}</span>
          <span class="junshi-wenzi-duan">{{ huoQuFanYi('caidan', 'junShi') }}</span>
        </button>
        <div class="qita-xuanxiang" @click="qieHuanQitaCaiDan">
          <span class="qita-tubiao">☰</span>
          <Transition name="xiala">
            <div v-if="qitaCaiDanZhanKai" class="xiala-caidan qita-xiala" @click.stop>
              <button class="xiala-xiangmu" @click="daKaiXieYi('yongHuXieYi')">
                {{ huoQuFanYi('caidan', 'yongHuXieYi') }}
              </button>
              <button class="xiala-xiangmu" @click="daKaiXieYi('yinSiZhengCe')">
                {{ huoQuFanYi('caidan', 'yinSiZhengCe') }}
              </button>
              <div class="xiala-fenge" />
              <button class="xiala-xiangmu" @click="xianShiBanBenHao">
                {{ huoQuFanYi('caidan', 'banBenHao') }}
              </button>
              <button class="xiala-xiangmu tongzhi-caidan-xiang" @click="jinRuTongZhi">
                <span>{{ huoQuFanYi('caidan', 'tongZhi') }}</span>
                <span v-if="通知仓库.weiDuShu > 0" class="tongzhi-badge">{{
                  通知仓库.weiDuShu > 99 ? '99+' : 通知仓库.weiDuShu
                }}</span>
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
        <div v-if="banBenXianShi" class="banben-zhezhao" @click.self="banBenXianShi = false">
          <div class="banben-tanchuang">
            <h3 class="banben-biaoti">
              {{ huoQuFanYi('caidan', 'banBenXinXi') }}
            </h3>
            <p class="banben-hao">
              {{ banBenHao }}
            </p>
            <button class="banben-guanbi" @click="banBenXianShi = false">
              {{ huoQuFanYi('renZheng', 'queRen') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

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
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用主题仓库 } from '@/stores/主题'
import { 使用通知仓库 } from '@/stores/通知'
import { gengGaiYongHuMing, gengGaiMiMa, faSongMa } from '@/api/认证'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { huoQuFanYi } from '@/config/translations'
import 协议模态框 from '@/components/协议模态框.vue'

const 用户仓库 = 使用用户仓库()
const 认证表单仓库 = 使用认证表单仓库()
const 聊天仓库 = 使用聊天仓库()
const 主题仓库 = 使用主题仓库()
const 通知仓库 = 使用通知仓库()
const router = useRouter()
const route = useRoute()

const yongHuCaiDanZhanKai = ref(false)
const qitaCaiDanZhanKai = ref(false)
const xieYiXianShi = ref(false)
const xieYiLeiXing = ref<'yongHuXieYi' | 'yinSiZhengCe'>('yongHuXieYi')
const banBenXianShi = ref(false)

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

const xianShiNiCheng = computed(() => {
  return (
    用户仓库.dangQianYongHu?.ni_cheng ||
    用户仓库.dangQianYongHu?.yong_hu_ming ||
    huoQuFanYi('caidan', 'yongHu')
  )
})

const xianShiFanHui = computed(() => {
  const yinCangLuYou = ['zhuJieMian', 'dengLu', 'zhuCe']
  return !yinCangLuYou.includes(route.name as string)
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
  yongHuCaiDanZhanKai.value = !yongHuCaiDanZhanKai.value
  qitaCaiDanZhanKai.value = false
}

function qieHuanQitaCaiDan() {
  qitaCaiDanZhanKai.value = !qitaCaiDanZhanKai.value
  yongHuCaiDanZhanKai.value = false
}

function qieHuanZhuti() {
  主题仓库.qieHuanZhuti(主题仓库.dangQianZhuti === '浅色' ? '深色' : '浅色')
}

function daKaiXieYi(leiXing: 'yongHuXieYi' | 'yinSiZhengCe') {
  xieYiLeiXing.value = leiXing
  xieYiXianShi.value = true
  qitaCaiDanZhanKai.value = false
}

function xianShiBanBenHao() {
  banBenXianShi.value = true
  qitaCaiDanZhanKai.value = false
}

function jinRuTongZhi() {
  qitaCaiDanZhanKai.value = false
  router.push('/tong-zhi')
}

function fanHuiShouYe() {
  router.push('/')
}

function tongZhiJunShiZhiDao() {
  window.dispatchEvent(new CustomEvent('junshi-zhankai'))
}

function jinRuZhanJi() {
  yongHuCaiDanZhanKai.value = false
  router.push('/guo-wang-zhan-ji')
}

function daKaiXiuGaiYongHuMing() {
  yongHuCaiDanZhanKai.value = false
  xinYongHuMing.value = 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  xiuGaiCuoWu.value = ''
  xiuGaiYongHuMingXianShi.value = true
}

function daKaiXiuGaiMiMa() {
  yongHuCaiDanZhanKai.value = false
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 52px;
  background: var(--daohanglan-beijing);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--daohanglan-xiabiankuang);
  box-shadow: var(--daohanglan-yinying);
}

.caidan-neirong {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 20px;
}

.caidan-zuo,
.caidan-zhong,
.caidan-you {
  display: flex;
  align-items: center;
}

.caidan-zuo {
  flex: 0 0 auto;
  justify-content: flex-start;
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

.caidan-zhong {
  flex: 1;
  justify-content: center;
  gap: 10px;
}

.caidan-you {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 8px;
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
}

.touxiang-xiao-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.touxiang-moren {
  font-size: 14px;
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
:root[data-theme='浅色'] .tuichu-xiangmu {
  color: var(--yanse-weixian) !important;
}
.tuichu-xiangmu:hover {
  background: var(--tuichu-hover-beijing);
  color: var(--yanse-weixian-shen) !important;
}

.xiala-fenge {
  height: 1px;
  background: var(--xiala-fenge);
  margin: 4px 8px;
}

.tongzhi-caidan-xiang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tongzhi-badge {
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

.jiaose-mingcheng-caidan {
  font-size: 14px;
  font-weight: 600;
  color: var(--daohanglan-qiangwenben);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qita-xuanxiang {
  position: relative;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.qita-xuanxiang:hover {
  background: var(--daohanglan-hover);
}

.qita-tubiao {
  font-size: 18px;
  color: var(--daohanglan-ciwenben);
}

.banben-zhezhao,
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

.banben-tanchuang,
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

.banben-biaoti,
.xiugai-biaoti {
  font-size: 18px;
  font-weight: 700;
  color: var(--tanchuang-biaoti);
  text-align: center;
  margin: 0 0 20px;
}

.banben-hao {
  font-size: 32px;
  font-weight: 800;
  color: var(--nuanhui-lan, #6b8ca6);
  text-align: center;
  margin: 16px 0 24px;
}

.banben-guanbi {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--nuanhui-lan, #6b8ca6), var(--roufen-zi, #c4a0b0));
  color: var(--wenzi-baise);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.banben-guanbi:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--nuanhui-lan-touming-yinying);
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
  border-color: var(--nuanhui-lan, #6b8ca6);
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
  background: linear-gradient(135deg, var(--nuanhui-lan, #6b8ca6), var(--roufen-zi, #c4a0b0));
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

  .yonghu-xuanxiang {
    padding: 6px 8px;
    gap: 6px;
  }

  .yonghu-mingcheng {
    max-width: 110px;
  }

  .jiaose-mingcheng-caidan {
    max-width: 90px;
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
}

@media (max-width: 374px) {
  .yonghu-mingcheng {
    max-width: 80px;
  }

  .jiaose-mingcheng-caidan {
    max-width: 70px;
  }
}
</style>
