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
          <div class="yonghu-xiao-wei">
            <TouXiang :tou-xiang="touXiangDiZhi" :mo-ren-zi="huoQuFanYi('caidan', 'yongHu')" />
          </div>
          <span class="yonghu-mingcheng">{{ xianShiNiCheng }}</span>
          <span
            v-if="用户仓库.dangQianYongHu"
            class="zhankai-jiantou"
            :class="{ xuanzhuan: yongHuCaiDanZhanKai }"
            aria-hidden="true"
          />
          <Transition name="xiala">
            <div
              v-if="yongHuCaiDanZhanKai && 用户仓库.dangQianYongHu"
              class="xiala-caidan yonghu-xiala"
              @click.stop
            >
              <button class="yonghu-ziliao-tou" @click="tiaoZhuanZhangHao('tou-xiang')">
                <span class="ziliao-wei">
                  <TouXiang :tou-xiang="touXiangDiZhi" :mo-ren-zi="xianShiNiCheng.slice(0, 1)" />
                </span>
                <span class="ziliao-wenzi">
                  <span class="ziliao-mingcheng">{{ xianShiNiCheng }}</span>
                  <span class="ziliao-qianming">{{ qianMingYuLan || huoQuFanYi('haoYou', 'zanWuQianMing') }}</span>
                </span>
              </button>
              <button class="xiala-xiangmu" @click="jinRuZhangHaoAnQuan">
                {{ huoQuFanYi('caidan', 'zhangHaoSheZhi') }}
              </button>
              <button class="xiala-xiangmu" @click="jinRuZhanJi">
                {{ huoQuFanYi('caidan', 'guoWangZhanJi') }}
              </button>
              <button class="xiala-xiangmu" @click="jinRuHaoYou">
                {{ huoQuFanYi('caidan', 'haoYou') }}
              </button>
              <button class="xiala-xiangmu tuichu-xiangmu" @click="zhiXingTuiChu">
                {{ huoQuFanYi('caidan', 'tuiChuDengLu') }}
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
          v-if="shiLiaoTianYe && 聊天仓库.jiaoSeXinXi && junShiKaiQi"
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

  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用主题仓库, 浅色值 } from '@/stores/主题'
import { 使用通知仓库 } from '@/stores/通知'
import { huoQuFanYi } from '@/config/translations'
import { huoQuJunShiKaiGuan } from '@/utils/teZhengKaiGuan'
import { yingYongBanBen } from '@/config/站点配置'
import TouXiang from '@/components/头像.vue'
import 协议模态框 from '@/components/协议模态框.vue'

const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
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

const banBenHao = yingYongBanBen // 版本号唯一来源：站点配置（禁止组件内硬编码）

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
const junShiKaiQi = computed(() => huoQuJunShiKaiGuan())

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
  | 'haoYouLieBiao'
  | 'haoYouLiaoTian'
  | 'zhangHaoAnQuan'
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
  haoYouLieBiao: 'haoYouLieBiao',
  haoYouLiaoTian: 'haoYouLiaoTian',
  zhangHaoAnQuan: 'zhangHaoAnQuan',
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

function qieHuanYongHuCaiDan() {
  if (!用户仓库.dangQianYongHu) return
  yongHuCaiDanZhanKai.value = !yongHuCaiDanZhanKai.value
  qitaCaiDanZhanKai.value = false
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
  // 历史栈已见底时 router.back() 无反应会被误认为“点击无效”，此时直返主页
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace('/')
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
  router.push('/guo-wang-zhan-ji')
}

function jinRuZhangHaoAnQuan() {
  tiaoZhuanZhangHao()
}

function tiaoZhuanZhangHao(锚点?: string) {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  router.push(锚点 ? `/zhang-hao-an-quan#${锚点}` : '/zhang-hao-an-quan')
}

const touXiangDiZhi = computed(() => 设置仓库.touXiang || 用户仓库.dangQianYongHu?.tou_xiang || null)
const qianMingYuLan = computed(() => 设置仓库.qianMing || 用户仓库.dangQianYongHu?.qian_ming || '')

function jinRuHaoYou() {
  qitaCaiDanZhanKai.value = false
  yongHuCaiDanZhanKai.value = false
  router.push('/hao-you')
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
  // 未登录时不拉取设置：避免登录页等公开页刷出 401 控制台错误
  if (用户仓库.令牌 && !设置仓库.yiJiaZai) void 设置仓库.jiaZai()
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
      void 设置仓库.jiaZai()
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

.yonghu-xiao-wei {
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
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--daohanglan-jiantou);
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
  min-width: 220px;
}

/* 下拉顶部个人资料头（对标 QQ/微信：头像+昵称+签名，点击直达账号设置） */
.yonghu-ziliao-tou {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 4px;
  border: none;
  border-bottom: 1px solid var(--xiala-biankuang);
  border-radius: 8px 8px 0 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.yonghu-ziliao-tou:hover {
  background: var(--xiala-hover-beijing);
}

.ziliao-wei {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #07c160, #0a8a44);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.ziliao-wenzi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.ziliao-mingcheng {
  font-size: 13px;
  font-weight: 700;
  color: var(--xiala-wenben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ziliao-qianming {
  font-size: 11px;
  color: var(--daohanglan-ciwenben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
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

.xiala-enter-active {
  transition: all 0.2s var(--quxian-tan-chu);
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
    grid-template-columns: auto minmax(0, 1fr) auto;
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
    display: none;
  }

  .jiaose-mingcheng-caidan {
    max-width: 80px;
  }

  .caidan-neirong:has(.liaotian-biaoti-zu) .zhuye-anniu {
    display: none;
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
  .xiala-xiangmu {
    transition: none;
  }

  .zhuti-qiehuan-anniu:hover {
    transform: none;
  }
}
</style>
