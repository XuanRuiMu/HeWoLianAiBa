<template>
  <div class="tiaozhan-yemian" :data-xingbie="xingBieDang">
    <div class="tiaozhan-biaoti-qu">
      <h1 class="tiaozhan-biaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianBiaoTi') }}</h1>
      <p class="tiaozhan-fubiaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianFuBiaoTi') }}</p>
      <p class="xingbie-huiji" role="status">
        <span class="huiji-dian" aria-hidden="true" />
        <span class="huiji-wen">{{ xingBieHuiJiWen }}</span>
      </p>
    </div>

    <!-- 进行中对局横幅 -->
    <div v-if="dangQianDuiJu" class="jinxing-zhong-hengfu">
      <div class="hengfu-xinxi">
        <div class="hengfu-wei">
          <TouXiang
            :tou-xiang="dangQianDuiJu.tou_xiang"
            :mo-ren-zi="dangQianDuiJu.wei_xin_ming.slice(0, 1)"
            shen-fen="duiju"
            @error="dangQianDuiJu.tou_xiang = null"
          />
        </div>
        <div class="hengfu-wenzi">
          <span class="hengfu-miaoshu">{{ huoQuFanYi('tiaoZhan', 'jinXingZhong') }}</span>
          <span class="hengfu-duixiang">{{ dangQianDuiJu.wei_xin_ming }}</span>
        </div>
      </div>
      <div class="hengfu-anniu">
        <button class="anniu-jiXu" @click="jiXuDuiJu">
          {{ huoQuFanYi('tiaoZhan', 'jiXuDuiJu') }}
        </button>
        <button
          v-if="!zhengZaiFangQiQueRen"
          class="anniu-fangqi"
          @click="zhengZaiFangQiQueRen = true"
        >
          {{ huoQuFanYi('tiaoZhan', 'fangQiDuiJu') }}
        </button>
        <template v-else>
          <button class="anniu-fangqi queRen" :disabled="fangQiQingQiuZhong" @click="queRenFangQi">
            {{ huoQuFanYi('tiaoZhan', 'queRenFangQi') }}
          </button>
          <button class="anniu-quxiao" :disabled="fangQiQingQiuZhong" @click="quXiaoFangQi">
            {{ huoQuFanYi('tongYong', 'quXiao') }}
          </button>
        </template>
      </div>
    </div>

    <!-- 四组别段位概况 -->
    <div class="gaikuang-wangge">
      <div v-for="gaiKuang in gaiKuangLieBiao" :key="gaiKuang.zu_bie" class="gaikuang-kapian">
        <span class="gaikuang-zubie">{{ zuBieMingCheng(gaiKuang.zu_bie) }}</span>
        <template v-if="gaiKuang.ji_fen !== null">
          <span class="gaikuang-duanwei">{{ gaiKuang.duan_wei }}</span>
          <span class="gaikuang-jifen"
            >{{ gaiKuang.ji_fen }}{{ huoQuFanYi('tiaoZhan', 'fenDanWei') }}</span
          >
          <span class="gaikuang-zhanchang">
            {{
              huoQuFanYi('tiaoZhan', 'zhanJiGeShi')
                .replace('{sheng}', String(gaiKuang.sheng_chang))
                .replace('{fu}', String(gaiKuang.fu_chang))
                .replace('{qi}', String(gaiKuang.qi_quan_chang))
            }}
          </span>
          <span v-if="gaiKuang.pai_ming" class="gaikuang-paiming">
            {{
              huoQuFanYi('tiaoZhan', 'paiMingGeShi').replace('{mingci}', String(gaiKuang.pai_ming))
            }}
          </span>
        </template>
        <span v-else class="gaikuang-weicanjia">{{ huoQuFanYi('tiaoZhan', 'weiCanJia') }}</span>
      </div>
    </div>

    <!-- 主操作区 -->
    <div class="caozuo-qu">
      <button class="anniu-kaiShi" :disabled="kaiShiQingQiuZhong" @click="daKaiXingBieXuanZe">
        {{ huoQuFanYi('tiaoZhan', 'kaiShiTiaoZhan') }}
      </button>
      <button class="anniu-paihang" @click="qianWangPaiHangBang">
        {{ huoQuFanYi('tiaoZhan', 'paiHangBang') }}
      </button>
    </div>
    <p v-if="cuoWuXinXi" class="cuowu-tishi" role="status">{{ cuoWuXinXi }}</p>
    <RequestError :cuo-wu="qianTaiCuoWu" :zhong-zai="qianTaiZhuangTai === 'loading'" @chong-shi="chongShi" />

    <!-- 性别选择弹层 -->
    <div v-if="xingBieXuanZeKeJian" class="xingbie-zhezhao" @click.self="guanBiXingBieXuanZe">
      <div
        class="xingbie-tanchuang"
        :class="{ 'er-bu': xuanZeBuZhou === 2 }"
        role="dialog"
        aria-modal="true"
        :aria-label="xuanZeBuZhou === 1
          ? huoQuFanYi('tiaoZhan', 'woDeXingBieBiaoTi')
          : huoQuFanYi('tiaoZhan', 'duiXiangXingBieBiaoTi')"
      >
        <div class="tanchuang-jin-xian" aria-hidden="true" />
        <h2 class="tanchuang-biaoti">
          {{
            xuanZeBuZhou === 1
              ? huoQuFanYi('tiaoZhan', 'woDeXingBieBiaoTi')
              : huoQuFanYi('tiaoZhan', 'duiXiangXingBieBiaoTi')
          }}
        </h2>
        <p class="tanchuang-bu-zhou">
          {{ xuanZeBuZhou === 1 ? '1 / 2' : '2 / 2' }}
        </p>
        <component :is="挑战渣型提示" :zha-xing-gai-lv="zhaXingGaiLv" />
        <div class="xingbie-wangge">
          <button
            type="button"
            class="xingbie-kaPian nan"
            @click="xuanZeBuZhou === 1 ? xuanZeZiJi('男') : xuanZeDuiXiang('男')"
          >
            <span class="xingbie-fuhao" aria-hidden="true">♂</span>
            <span class="xingbie-ming">{{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNan') }}</span>
          </button>
          <button
            type="button"
            class="xingbie-kaPian nv"
            @click="xuanZeBuZhou === 1 ? xuanZeZiJi('女') : xuanZeDuiXiang('女')"
          >
            <span class="xingbie-fuhao" aria-hidden="true">♀</span>
            <span class="xingbie-ming">{{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}</span>
          </button>
        </div>
        <div class="tanchuang-caozuo" :class="{ 'you-shang-yi-bu': xuanZeBuZhou === 2 }">
          <button
            v-if="xuanZeBuZhou === 2"
            type="button"
            class="anniu-ciJi"
            @click="xuanZeBuZhou = 1"
          >
            {{ huoQuFanYi('ziLiaoSheZhi', 'shangYiBu') }}
          </button>
          <button type="button" class="anniu-ciJi fanSe" @click="guanBiXingBieXuanZe">
            {{ huoQuFanYi('tongYong', 'quXiao') }}
          </button>
        </div>
        <p class="tanchuang-tishi">{{ huoQuFanYi('tiaoZhan', 'suiJiTishi') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  huoQuDangQianDuiJu,
  fangQiDuiJu,
  huoQuWoDeGaiKuang,
  huoQuTiaoZhanPeiZhi,
  type TiaoZhanDuiJu,
  type ZuBie,
  type ZuBieGaiKuang,
} from '@/api/挑战'
import { huoQuFanYi } from '@/config/translations'
import { 解析主色档, 用户形态, type 性别选择形态 } from '@/utils/性别'
import { 使用用户仓库 } from '@/stores/用户'
import 挑战渣型提示 from '@/components/挑战渣型提示.vue'
import TouXiang from '@/components/头像.vue'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'

const router = useRouter()
const 用户仓库 = 使用用户仓库()

const xingBieDang = computed<'nan' | 'nv'>(() =>
  解析主色档(undefined, 用户仓库.dangQianYongHu?.mo_ren_xing_bie) === 'nv' ? 'nv' : 'nan',
)
const xingBieHuiJiWen = computed(() =>
  xingBieDang.value === 'nv'
    ? huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')
    : huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'),
)

const dangQianDuiJu = ref<TiaoZhanDuiJu | null>(null)
const gaiKuangLieBiao = ref<ZuBieGaiKuang[]>([])
const cuoWuXinXi = ref('')

const xingBieXuanZeKeJian = ref(false)
const xuanZeBuZhou = ref(1)
const woDeXingBie = ref<性别选择形态 | null>(null)
const duiXiangXingBie = ref<性别选择形态 | null>(null)
const zhaXingGaiLv = ref(0.3)

const zhengZaiFangQiQueRen = ref(false)
const fangQiQingQiuZhong = ref(false)
const kaiShiQingQiuZhong = ref(false)
const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, yunXing, jieShou, chongShi, qingLi } =
  use前台错误()

function zuBieMingCheng(zuBie: ZuBie): string {
  const yingShe: Record<ZuBie, string> = {
    nan_nv: huoQuFanYi('tiaoZhan', 'zuBieNanNv'),
    nv_nan: huoQuFanYi('tiaoZhan', 'zuBieNvNan'),
    nan_nan: huoQuFanYi('tiaoZhan', 'zuBieNanNan'),
    nv_nv: huoQuFanYi('tiaoZhan', 'zuBieNvNv'),
  }
  return yingShe[zuBie]
}

async function jiaZaiShuJuNei() {
  const [duiJu, gaiKuang] = await Promise.all([huoQuDangQianDuiJu(), huoQuWoDeGaiKuang()])
  dangQianDuiJu.value = duiJu
  gaiKuangLieBiao.value = gaiKuang
}

async function jiaZaiShuJu() {
  await yunXing(jiaZaiShuJuNei, { chongShi: jiaZaiShuJu })
}

onMounted(jiaZaiShuJu)

async function daKaiXingBieXuanZe() {
  // 同时仅允许一局挑战对局：加载失败的 null（未知）不得当成“无对局”放行
  if (qianTaiZhuangTai.value === 'error' && dangQianDuiJu.value === null) {
    await jiaZaiShuJu()
    if (dangQianDuiJu.value === null) return
  }
  if (dangQianDuiJu.value) {
    cuoWuXinXi.value = huoQuFanYi('tiaoZhan', 'yiYouDuiJuTishi')
    return
  }
  cuoWuXinXi.value = ''
  woDeXingBie.value = null
  duiXiangXingBie.value = null
  xuanZeBuZhou.value = 1
  xingBieXuanZeKeJian.value = true
  qingLi()
  try {
    const peiZhi = await huoQuTiaoZhanPeiZhi()
    zhaXingGaiLv.value = peiZhi.zha_xing_gai_lv ?? 0.3
  } catch (错误: unknown) {
    zhaXingGaiLv.value = 0.3
    jieShou(错误, daKaiXingBieXuanZe)
  }
}

function guanBiXingBieXuanZe() {
  xingBieXuanZeKeJian.value = false
}

function xuanZeZiJi(xingBie: 性别选择形态) {
  woDeXingBie.value = xingBie
  xuanZeBuZhou.value = 2
}

/** 选定对象性别即开赛：透传挑战资料到「添加微信」加载页，由生成流程 store 托管 */
function xuanZeDuiXiang(xingBie: 性别选择形态) {
  if (!woDeXingBie.value || kaiShiQingQiuZhong.value) return
  duiXiangXingBie.value = xingBie
  kaiShiQingQiuZhong.value = true
  try {
    sessionStorage.setItem(
      'ziLiaoSheZhiLinShi',
      JSON.stringify({
        moshi: 'tiaozhan',
        xingBie: 用户形态(woDeXingBie.value),
        woDeXingBie: woDeXingBie.value,
        muBiaoXingBie: 用户形态(xingBie),
      }),
    )
    router.push('/tian-jia-wei-xin')
  } catch (错误: unknown) {
    kaiShiQingQiuZhong.value = false
    jieShou(错误, () => xuanZeDuiXiang(xingBie))
  }
}

function qianWangPaiHangBang() {
  router.push('/tiao-zhan/pai-hang')
}

function jiXuDuiJu() {
  if (!dangQianDuiJu.value) return
  router.push(`/chat/${dangQianDuiJu.value.jiao_se_id}`)
}

async function queRenFangQi() {
  if (!dangQianDuiJu.value || fangQiQingQiuZhong.value) return
  fangQiQingQiuZhong.value = true
  qingLi()
  try {
    await fangQiDuiJu()
    zhengZaiFangQiQueRen.value = false
    dangQianDuiJu.value = null
    await jiaZaiShuJu()
  } catch (错误: unknown) {
    jieShou(错误, queRenFangQi)
  } finally {
    fangQiQingQiuZhong.value = false
  }
}

function quXiaoFangQi() {
  zhengZaiFangQiQueRen.value = false
}
</script>

<style scoped>
.tiaozhan-yemian {
  --tiaozhan-zhu-1: var(--xingbie-nan-1);
  --tiaozhan-zhu-2: var(--xingbie-nan-2);
  --tiaozhan-zhu-wenben: var(--xingbie-nan-wenben);
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--jiange-da) var(--jiange-zhong) calc(var(--jiange-da) + var(--jiange-zhong));
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  background: var(--yemian-di-beijing);
  border-radius: var(--yuanjiao-da);
}

.tiaozhan-yemian[data-xingbie='nv'] {
  --tiaozhan-zhu-1: var(--xingbie-nv-1);
  --tiaozhan-zhu-2: var(--xingbie-nv-2);
  --tiaozhan-zhu-wenben: var(--xingbie-nv-wenben);
}

.tiaozhan-biaoti-qu {
  text-align: left;
  position: relative;
  padding-bottom: calc(var(--jiange-12) + var(--jiange-2));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--jiange-xiao);
}

.tiaozhan-biaoti-qu::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 64px;
  height: 3px;
  border-radius: var(--yuanjiao-xiao);
  background: linear-gradient(90deg, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2));
}

.tiaozhan-biaoti {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--wenben-zhuse);
  letter-spacing: var(--jiange-xiao);
  line-height: 1.25;
}

.tiaozhan-fubiaoti {
  margin: var(--jiange-6) 0 0;
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.xingbie-huiji {
  margin: var(--jiange-xiao) 0 0;
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-6) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: var(--yuanjiao-zhong);
  border: 1px solid var(--tiaozhan-zhu-1);
  background: color-mix(in srgb, var(--tiaozhan-zhu-1) 12%, transparent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--wenben-zhuse);
}

.huiji-dian {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tiaozhan-zhu-1);
  box-shadow: 0 0 8px var(--tiaozhan-zhu-1);
}

.huiji-wen {
  line-height: 1;
}

.jinxing-zhong-hengfu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-xiao);
  padding: calc(var(--jiange-12) + var(--jiange-2)) var(--jiange-zhong);
  background: var(--beijing-kaopian);
  border: 1px solid var(--tiaozhan-zhu-1);
  border-radius: var(--yuanjiao-da);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--tiaozhan-zhu-1) 18%, transparent);
}

.hengfu-xinxi {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.hengfu-wei {
  width: 26px;
  height: 26px;
  font-size: 26px;
  line-height: 1;
}

.hengfu-wenzi {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hengfu-miaoshu {
  font-size: 11px;
  color: var(--tiaozhan-zhu-1);
  font-weight: 700;
}

.hengfu-duixiang {
  font-size: 15px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hengfu-anniu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  flex-shrink: 0;
}

.anniu-jiXu,
.anniu-fangqi,
.anniu-quxiao {
  padding: var(--jiange-xiao) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: var(--yuanjiao-xiao);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
}

.anniu-jiXu {
  background: linear-gradient(135deg, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2));
  color: var(--tiaozhan-zhu-wenben);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--tiaozhan-zhu-1) 30%, transparent);
}

.anniu-fangqi {
  background: transparent;
  border: 1px solid var(--yanse-weixian);
  color: var(--yanse-weixian);
}

.anniu-fangqi.queRen {
  background: color-mix(in srgb, var(--yanse-weixian) 14%, transparent);
}

.anniu-quxiao {
  background: transparent;
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
}

.anniu-jiXu:hover,
.anniu-fangqi:hover,
.anniu-quxiao:hover {
  filter: brightness(1.1);
}

.anniu-fangqi:disabled,
.anniu-quxiao:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gaikuang-wangge {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--jiange-xiao);
}

.gaikuang-kapian {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  padding: var(--jiange-zhong) calc(var(--jiange-zhong) + var(--jiange-2)) calc(var(--jiange-12) + var(--jiange-2));
  background: var(--beijing-kaopian);
  border: 1px solid color-mix(in srgb, var(--tiaozhan-zhu-1) 32%, var(--biankuang-yanse));
  border-radius: var(--yuanjiao-da);
  box-shadow:
    var(--qipao-yinying),
    inset 0 1px 0 color-mix(in srgb, var(--tiaozhan-zhu-1) 14%, transparent);
  position: relative;
  overflow: hidden;
}

.gaikuang-kapian::before {
  content: '';
  position: absolute;
  top: 0;
  left: 14px;
  right: 14px;
  height: 2px;
  border-radius: 0 0 var(--yuanjiao-xiao) var(--yuanjiao-xiao);
  background: linear-gradient(90deg, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2));
  opacity: 0.75;
  pointer-events: none;
}

.gaikuang-zubie {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--tiaozhan-zhu-1);
}

.gaikuang-duanwei {
  font-size: 22px;
  font-weight: 800;
  color: var(--wenben-zhuse);
  letter-spacing: 1px;
}

.gaikuang-jifen {
  font-size: 15px;
  font-weight: 800;
  color: var(--tiaozhan-zhu-1);
}

.gaikuang-zhanchang,
.gaikuang-paiming {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.gaikuang-weicanjia {
  font-size: 13px;
  color: var(--wenben-tishi);
}

.caozuo-qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.anniu-kaiShi,
.anniu-paihang {
  padding: var(--jiange-15) var(--jiange-da);
  border-radius: var(--yuanjiao-zhong);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 1px;
  border: none;
}

.anniu-kaiShi {
  background: linear-gradient(135deg, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2));
  color: var(--tiaozhan-zhu-wenben);
  box-shadow: 0 6px 24px color-mix(in srgb, var(--tiaozhan-zhu-1) 32%, transparent);
}

.anniu-kaiShi:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px color-mix(in srgb, var(--tiaozhan-zhu-1) 42%, transparent);
}

.anniu-kaiShi:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anniu-paihang {
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
}

.anniu-paihang:hover {
  filter: brightness(1.15);
}

.cuowu-tishi {
  margin: 0;
  font-size: 13px;
  color: var(--yanse-weixian);
  text-align: center;
}

.xingbie-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  background: rgba(8, 10, 20, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.xingbie-tanchuang {
  position: relative;
  width: 100%;
  max-width: 360px;
  padding: calc(var(--jiange-da) + var(--jiange-4)) calc(var(--jiange-zhong) + var(--jiange-6)) calc(var(--jiange-zhong) + var(--jiange-6));
  background: var(--tanchuang-beijing);
  border: 1px solid var(--tanchuang-biankuang);
  border-radius: var(--yuanjiao-da);
  display: flex;
  flex-direction: column;
  gap: calc(var(--jiange-12) + var(--jiange-2));
  box-shadow:
    var(--tanchuang-yinying),
    inset 0 1px 0 color-mix(in srgb, var(--tiaozhan-zhu-1) 10%, transparent);
}

.tanchuang-jin-xian {
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 3px;
  border-radius: 0 0 var(--yuanjiao-xiao) var(--yuanjiao-xiao);
  background: linear-gradient(90deg, transparent, var(--tiaozhan-zhu-1), var(--tiaozhan-zhu-2), transparent);
  pointer-events: none;
}

.tanchuang-biaoti {
  margin: var(--jiange-4) 0 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--wenben-zhuse);
  text-align: center;
}

.tanchuang-bu-zhou {
  margin: calc(var(--jiange-6) * -1) 0 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-align: center;
  color: var(--wenben-tishi);
}

.xingbie-wangge {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--jiange-xiao);
}

.xingbie-kaPian {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-xiao);
  padding: calc(var(--jiange-zhong) + var(--jiange-4)) var(--jiange-12) calc(var(--jiange-zhong) + var(--jiange-2));
  color: var(--wenben-zhuse);
  background: var(--beijing-kaopian);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-da);
  cursor: pointer;
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease;
}

.xingbie-fuhao {
  font-size: 28px;
  line-height: 1;
  font-weight: 400;
}

.xingbie-ming {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
}

/* 性别符号色单源：深浅两档由 --xingbie-{nan,nv}-1 成对令牌各自取值。
   改前此处深档写死 #7eb6ff/#ff8fb8、浅档另写一份 #3d7cc9/#d4568a（被禁字面量），
   是 R1「深色为 baseline + 组件零令牌」在性别色上的第二处实例 */
.xingbie-kaPian.nan .xingbie-fuhao {
  color: var(--xingbie-nan-1);
}

.xingbie-kaPian.nv .xingbie-fuhao {
  color: var(--xingbie-nv-1);
}

.xingbie-kaPian:hover {
  transform: translateY(-2px);
  border-color: var(--tiaozhan-zhu-1);
  background: color-mix(in srgb, var(--tiaozhan-zhu-1) 10%, var(--beijing-kaopian));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--tiaozhan-zhu-1) 18%, transparent);
}

.xingbie-kaPian.nan:hover {
  border-color: var(--xingbie-nan-1);
  background: color-mix(in srgb, var(--xingbie-nan-1) 10%, var(--beijing-kaopian));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--xingbie-nan-1) 18%, transparent);
}

.xingbie-kaPian:active {
  transform: translateY(0) scale(0.98);
}

.tanchuang-caozuo {
  display: flex;
  justify-content: center;
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-2);
}

.tanchuang-caozuo.you-shang-yi-bu {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.anniu-ciJi {
  width: 100%;
  min-height: 40px;
  padding: var(--jiange-10) calc(var(--jiange-zhong) + var(--jiange-2));
  border-radius: var(--yuanjiao-zhong);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  background: var(--beijing-kaopian);
  border: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.anniu-ciJi:hover {
  transform: translateY(-1px);
  border-color: var(--tiaozhan-zhu-1);
  color: var(--tiaozhan-zhu-1);
  background: color-mix(in srgb, var(--tiaozhan-zhu-1) 8%, var(--beijing-kaopian));
}

.anniu-ciJi.fanSe:hover {
  border-color: var(--yanse-weixian);
  color: var(--yanse-weixian);
  background: color-mix(in srgb, var(--yanse-weixian) 8%, var(--beijing-kaopian));
}

.tanchuang-tishi {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: var(--wenben-tishi);
  text-align: center;
  letter-spacing: 0.02em;
}

@media (max-width: 480px) {
  .gaikuang-wangge {
    grid-template-columns: 1fr;
  }

  .jinxing-zhong-hengfu {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .anniu-kaiShi,
  .anniu-paihang,
  .anniu-jiXu,
  .anniu-fangqi,
  .anniu-quxiao,
  .xingbie-kaPian,
  .anniu-ciJi {
    transition: none !important;
  }

  .xingbie-kaPian:hover,
  .anniu-ciJi:hover {
    transform: none;
  }

  .anniu-kaiShi:hover:not(:disabled) {
    transform: none;
  }
}
</style>
