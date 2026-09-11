<template>
  <div class="tiaozhan-yemian">
    <div class="tiaozhan-biaoti-qu">
      <h1 class="tiaozhan-biaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianBiaoTi') }}</h1>
      <p class="tiaozhan-fubiaoti">{{ huoQuFanYi('tiaoZhan', 'yeMianFuBiaoTi') }}</p>
    </div>

    <!-- 进行中对局横幅 -->
    <div v-if="dangQianDuiJu" class="jinxing-zhong-hengfu">
      <div class="hengfu-xinxi">
        <span class="hengfu-tubiao">{{ dangQianDuiJu.tou_xiang || '⚔️' }}</span>
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
    <p v-if="cuoWuXinXi" class="cuowu-tishi">{{ cuoWuXinXi }}</p>

    <!-- 性别选择弹层 -->
    <div v-if="xingBieXuanZeKeJian" class="xingbie-zhezhao" @click.self="guanBiXingBieXuanZe">
      <div class="xingbie-tanchuang">
        <template v-if="xuanZeBuZhou === 1">
          <h2 class="tanchuang-biaoti">{{ huoQuFanYi('tiaoZhan', 'woDeXingBieBiaoTi') }}</h2>
        </template>
        <template v-else>
          <h2 class="tanchuang-biaoti">{{ huoQuFanYi('tiaoZhan', 'duiXiangXingBieBiaoTi') }}</h2>
        </template>
        <component :is="挑战渣型提示" :zha-xing-gai-lv="zhaXingGaiLv" />
        <div class="xingbie-wangge">
          <button
            class="xingbie-kaPian"
            @click="xuanZeBuZhou === 1 ? xuanZeZiJi('男') : xuanZeDuiXiang('男')"
          >
            ♂ {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNan') }}
          </button>
          <button
            class="xingbie-kaPian"
            @click="xuanZeBuZhou === 1 ? xuanZeZiJi('女') : xuanZeDuiXiang('女')"
          >
            ♀ {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}
          </button>
        </div>
        <div class="tanchuang-caozuo">
          <button v-if="xuanZeBuZhou === 2" class="anniu-ciJi" @click="xuanZeBuZhou = 1">
            {{ huoQuFanYi('ziLiaoSheZhi', 'shangYiBu') }}
          </button>
          <button class="anniu-ciJi fanSe" @click="guanBiXingBieXuanZe">
            {{ huoQuFanYi('tongYong', 'quXiao') }}
          </button>
        </div>
        <p class="tanchuang-tishi">{{ huoQuFanYi('tiaoZhan', 'suiJiTishi') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
import 挑战渣型提示 from '@/components/挑战渣型提示.vue'

const router = useRouter()

const dangQianDuiJu = ref<TiaoZhanDuiJu | null>(null)
const gaiKuangLieBiao = ref<ZuBieGaiKuang[]>([])
const cuoWuXinXi = ref('')

const xingBieXuanZeKeJian = ref(false)
const xuanZeBuZhou = ref(1)
const woDeXingBie = ref<'男' | '女' | null>(null)
const duiXiangXingBie = ref<'男' | '女' | null>(null)
const zhaXingGaiLv = ref(0.3)

const zhengZaiFangQiQueRen = ref(false)
const fangQiQingQiuZhong = ref(false)
const kaiShiQingQiuZhong = ref(false)

function zuBieMingCheng(zuBie: ZuBie): string {
  const yingShe: Record<ZuBie, string> = {
    nan_nv: huoQuFanYi('tiaoZhan', 'zuBieNanNv'),
    nv_nan: huoQuFanYi('tiaoZhan', 'zuBieNvNan'),
    nan_nan: huoQuFanYi('tiaoZhan', 'zuBieNanNan'),
    nv_nv: huoQuFanYi('tiaoZhan', 'zuBieNvNv'),
  }
  return yingShe[zuBie]
}

async function jiaZaiShuJu() {
  try {
    const [duiJu, gaiKuang] = await Promise.all([huoQuDangQianDuiJu(), huoQuWoDeGaiKuang()])
    dangQianDuiJu.value = duiJu
    gaiKuangLieBiao.value = gaiKuang
  } catch {
    cuoWuXinXi.value = huoQuFanYi('tiaoZhan', 'jiaZaiShiBai')
  }
}

onMounted(jiaZaiShuJu)

async function daKaiXingBieXuanZe() {
  // 同时仅允许一局挑战对局：已有进行中对局时不再发起新局
  if (dangQianDuiJu.value) {
    cuoWuXinXi.value = huoQuFanYi('tiaoZhan', 'yiYouDuiJuTishi')
    return
  }
  cuoWuXinXi.value = ''
  woDeXingBie.value = null
  duiXiangXingBie.value = null
  xuanZeBuZhou.value = 1
  xingBieXuanZeKeJian.value = true
  // 拉取挑战配置（渣型概率）
  try {
    const peiZhi = await huoQuTiaoZhanPeiZhi()
    zhaXingGaiLv.value = peiZhi.zha_xing_gai_lv ?? 0.3
  } catch {
    zhaXingGaiLv.value = 0.3
  }
}

function guanBiXingBieXuanZe() {
  xingBieXuanZeKeJian.value = false
}

function xuanZeZiJi(xingBie: '男' | '女') {
  woDeXingBie.value = xingBie
  xuanZeBuZhou.value = 2
}

/** 选定对象性别即开赛：透传挑战资料到「添加微信」加载页，由生成流程 store 托管 */
function xuanZeDuiXiang(xingBie: '男' | '女') {
  if (!woDeXingBie.value || kaiShiQingQiuZhong.value) return
  duiXiangXingBie.value = xingBie
  kaiShiQingQiuZhong.value = true
  sessionStorage.setItem(
    'ziLiaoSheZhiLinShi',
    JSON.stringify({
      moshi: 'tiaozhan',
      xingBie: woDeXingBie.value === '男' ? 'male' : 'female',
      woDeXingBie: woDeXingBie.value,
      muBiaoXingBie: xingBie === '男' ? 'male' : 'female',
    }),
  )
  router.push('/tian-jia-wei-xin')
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
  try {
    await fangQiDuiJu()
    zhengZaiFangQiQueRen.value = false
    dangQianDuiJu.value = null
    await jiaZaiShuJu()
  } catch {
    cuoWuXinXi.value = huoQuFanYi('tiaoZhan', 'fangQiShiBai')
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
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tiaozhan-biaoti-qu {
  text-align: center;
}

.tiaozhan-biaoti {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 4px;
}

:root[data-theme='light'] .tiaozhan-biaoti {
  color: #191919;
}

.tiaozhan-fubiaoti {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

:root[data-theme='light'] .tiaozhan-fubiaoti {
  color: rgba(0, 0, 0, 0.5);
}

.jinxing-zhong-hengfu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(255, 107, 157, 0.14), rgba(251, 146, 60, 0.1));
  border: 1px solid rgba(255, 107, 157, 0.3);
  border-radius: 16px;
}

.hengfu-xinxi {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.hengfu-tubiao {
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
  color: rgba(255, 107, 157, 0.9);
  font-weight: 700;
}

.hengfu-duixiang {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:root[data-theme='light'] .hengfu-duixiang {
  color: #191919;
}

.hengfu-anniu {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.anniu-jiXu,
.anniu-fangqi,
.anniu-quxiao {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
}

.anniu-jiXu {
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: #ffffff;
}

.anniu-fangqi {
  background: transparent;
  border: 1px solid rgba(255, 107, 107, 0.5);
  color: #ff6b6b;
}

.anniu-fangqi.queRen {
  background: rgba(255, 107, 107, 0.18);
}

.anniu-quxiao {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

:root[data-theme='light'] .anniu-quxiao {
  border-color: rgba(0, 0, 0, 0.2);
  color: rgba(0, 0, 0, 0.6);
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
  gap: 12px;
}

.gaikuang-kapian {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: rgba(20, 24, 40, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

:root[data-theme='light'] .gaikuang-kapian {
  background: rgba(245, 248, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.08);
}

.gaikuang-zubie {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--nuanhui-lan);
}

.gaikuang-duanwei {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
}

:root[data-theme='light'] .gaikuang-duanwei {
  color: #191919;
}

.gaikuang-jifen,
.gaikuang-zhanchang,
.gaikuang-paiming {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

:root[data-theme='light'] .gaikuang-jifen,
:root[data-theme='light'] .gaikuang-zhanchang,
:root[data-theme='light'] .gaikuang-paiming {
  color: rgba(0, 0, 0, 0.55);
}

.gaikuang-weicanjia {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
}

:root[data-theme='light'] .gaikuang-weicanjia {
  color: rgba(0, 0, 0, 0.4);
}

.caozuo-qu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.anniu-kaiShi,
.anniu-paihang {
  padding: 15px 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 1px;
  border: none;
}

.anniu-kaiShi {
  background: linear-gradient(135deg, #ff6b9d, #fb923c);
  color: #ffffff;
  box-shadow: 0 6px 24px rgba(255, 107, 157, 0.35);
}

.anniu-kaiShi:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(255, 107, 157, 0.45);
}

.anniu-kaiShi:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anniu-paihang {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.85);
}

:root[data-theme='light'] .anniu-paihang {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.75);
}

.anniu-paihang:hover {
  filter: brightness(1.15);
}

.cuowu-tishi {
  margin: 0;
  font-size: 13px;
  color: #ff6b6b;
  text-align: center;
}

.xingbie-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.xingbie-tanchuang {
  width: 100%;
  max-width: 360px;
  padding: 28px 24px;
  background: rgba(20, 24, 40, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:root[data-theme='light'] .xingbie-tanchuang {
  background: rgba(250, 250, 252, 0.96);
}

.tanchuang-biaoti {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
}

:root[data-theme='light'] .tanchuang-biaoti {
  color: #191919;
}

.xingbie-wangge {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.xingbie-kaPian {
  padding: 22px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.xingbie-kaPian:hover {
  border-color: var(--yanse-biaobai);
  background: rgba(255, 107, 157, 0.12);
}

:root[data-theme='light'] .xingbie-kaPian {
  color: #191919;
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.12);
}

.tanchuang-caozuo {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.anniu-ciJi {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.75);
}

:root[data-theme='light'] .anniu-ciJi {
  border-color: rgba(0, 0, 0, 0.18);
  color: rgba(0, 0, 0, 0.65);
}

.anniu-ciJi.fanSe:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.tanchuang-tishi {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

:root[data-theme='light'] .tanchuang-tishi {
  color: rgba(0, 0, 0, 0.45);
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
  .xingbie-kaPian {
    transition: none !important;
  }

  .anniu-kaiShi:hover:not(:disabled) {
    transform: none;
  }
}
</style>
