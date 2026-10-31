<template>
  <div class="junshi-zhezhao" @click.self="$emit('guanBi')">
    <div class="junshi-mianban">
      <div class="junshi-dingbu">
        <span class="biaoti">{{ huoQuFanYi('junShi', 'junShiZhiDao') }}</span>
        <div class="dingbu-anniu-zu">
          <button class="zhidao-jilu-anniu" @click="daKaiZhiDaoJiLu">
            {{ huoQuFanYi('junShi', 'zhiDaoJiLu') }}
          </button>
          <button class="guanbi-anniu" @click="$emit('guanBi')">
            {{ huoQuFanYi('junShi', 'guanBi') }}
          </button>
        </div>
      </div>

      <div class="junshi-neirong">
        <RequestError
          v-if="军师仓库.zhuangTaiCuoWu"
          :cuo-wu="军师仓库.zhuangTaiCuoWu"
          :zhong-zai="jiaZaiZhong"
          @chong-shi="chongShiZhuangTai"
        />
        <div v-if="jiaZaiZhong" class="jiazai-zhuangtai">
          {{ huoQuFanYi('junShi', 'jiaZaiZhong') }}
        </div>
        <div v-else-if="junShiLieBiaoXuanXiang.length === 0" class="kong-zhuangtai">
          {{ huoQuFanYi('junShi', 'zanWuJunShi') }}
        </div>
        <template v-else>
          <div v-if="!youLiaoTianJiLu" class="wu-liao-tian-tishi">
            {{ huoQuFanYi('junShi', 'wuLiaoTianJiLu') }}
          </div>
          <div v-if="yiZhiDaoXiangTongNeiRong" class="yi-zhidao-tishi">
            {{ huoQuFanYi('junShi', 'yiZhiDaoXiangTongNeiRong') }}
          </div>
          <div class="junshi-liebiao">
            <div
              v-for="junShi in junShiLieBiaoXuanXiang"
              :key="junShi.id"
              class="junshi-kapian"
              :class="{
                'zhi-dao-zhong': huoQuJunShiZhuangTai(junShi.id) === 'zhi_dao_zhong',
                'yi-wan-cheng': huoQuJunShiZhuangTai(junShi.id) === 'yi_wan_cheng',
              }"
            >
              <div class="junshi-wei">
                <TouXiang
                  :tou-xiang="touXiangShiBai[junShi.id] ? null : shengChengTouXiangURL(junShi.touXiang)"
                  :mo-ren-zi="junShiMoRenWenZi(junShi)"
                  @error="biaoJiTouXiangShiBai(junShi.id)"
                />
              </div>
              <div class="junshi-xiangqing">
                <span class="junshi-mingcheng">{{ huoQuJunShiMingCheng(junShi) }}</span>
              </div>

              <button
                v-if="huoQuJunShiZhuangTai(junShi.id) === 'wei_zhi_dao'"
                class="qingqiu-anniu"
                :disabled="
                  !jiaoSeId ||
                  qingQiuZhongJunShiId !== null ||
                  dangQianZhuangTai?.zhuang_tai === 'zhi_dao_zhong' ||
                  yiZhiDaoXiangTongNeiRong
                "
                @click="zhiXingQingQiu(junShi)"
              >
                {{
                  qingQiuZhongJunShiId === junShi.id
                    ? huoQuFanYi('junShi', 'qingQiuZhong')
                    : huoQuFanYi('junShi', 'junShiQingQiuZhiDao')
                }}
              </button>
              <button
                v-else-if="huoQuJunShiZhuangTai(junShi.id) === 'zhi_dao_zhong'"
                class="qingqiu-anniu zhidao-zhong"
                disabled
              >
                {{ huoQuFanYi('junShi', 'junShiZhiDaoZhong') }}
              </button>
              <button v-else class="qingqiu-anniu yi-zhidao" @click="qieHuanZhanKai(junShi.id)">
                {{ huoQuFanYi('junShi', 'junShiYiZhiDao') }} -
                {{ huoQuFanYi('junShi', 'junShiChaKanJieGuo') }}
              </button>

              <RequestError
                v-if="cuoWuTiShiMap[junShi.id]"
                class="cuowu-tishi"
                :cuo-wu="cuoWuTiShiMap[junShi.id] || undefined"
                :zhong-zai="qingQiuZhongJunShiId === junShi.id"
                @chong-shi="chongShiQingQiu(junShi)"
              />

              <div
                v-if="
                  zhanKaiJunShiId === junShi.id &&
                  (huoQuZhiDaoJieGuo(junShi.id) || huoQuZhiDaoFenDuan(junShi.id))
                "
                class="zhidao-jieguo"
              >
                <h3 class="jieguo-biaoti">{{ huoQuFanYi('junShi', 'zhiDaoJianYi') }}</h3>
                <component
                  :is="军师指导分段"
                  :fen-duan="huoQuZhiDaoFenDuan(junShi.id)"
                  :zheng-duan="huoQuZhiDaoJieGuo(junShi.id) || ''"
                />
                <component :is="提示带" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="xianShiZhiDaoJiLu" class="zhidao-jilu-zhezhao" @click.self="guanBiZhiDaoJiLu">
        <div class="zhidao-jilu-mianban">
          <div class="zhidao-jilu-dingbu">
            <span class="biaoti">{{ huoQuFanYi('junShi', 'zhiDaoJiLu') }}</span>
            <button class="guanbi-anniu" @click="guanBiZhiDaoJiLu">
              {{ huoQuFanYi('junShi', 'guanBi') }}
            </button>
          </div>
          <div class="zhidao-jilu-neirong">
            <div v-if="jiLuLieBiao.length === 0" class="kong-zhuangtai">
              {{ huoQuFanYi('junShi', 'zanWuZhiDaoJiLu') }}
            </div>
            <div v-else class="zhidao-jilu-liebiao">
              <div
                v-for="jiLu in jiLuLieBiao"
                :key="jiLu.shi_jian"
                class="zhidao-jilu-xiangmu"
                @click="tiaoZhuanZhiDaoJiLuXiangQing(jiLu)"
              >
                <div class="jilu-xiangmu-tou">
                  <span class="jilu-junshi-mingcheng">
                    {{ huoQuFanYi('junShi', 'junShiMingCheng') }}：{{ jiLu.jun_shi_ming_chen }}
                  </span>
                  <span class="jilu-shijian">
                    {{ huoQuFanYi('junShi', 'zhiDaoShiJian') }}：{{ jiLu.shi_jian }}
                  </span>
                </div>
                <p class="jilu-yulan">{{ huoQuJianYiYuLan(jiLu) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  qingQiuJunShiZhiDao,
  huoQuJunShiJiLu,
  huoQuJunShiLieBiao,
  huoQuJunShiZhiDaoZhuangTai,
} from '@/api/聊天'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import RequestError from '@/components/请求错误.vue'
import { chuangJianQianTaiCuoWu, 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { shengChengTouXiangURL, junShiMoRenTouXiang } from '@/utils/头像'
import TouXiang from '@/components/头像.vue'
import { 使用军师仓库, shiYouXiaoJiaoSeId } from '@/stores/军师'
import { track } from '@/utils/埋点'
import 军师指导分段 from './军师指导分段.vue'
import 提示带 from './提示带.vue'
import type {
  JunShiXinXi,
  JunShiJiLu,
  JunShiZhiDaoFenDuan,
  JunShiZhiDaoZhuangTaiXinXi,
} from '@/types/类型定义'

type JunShiZhuangTaiLeiXing = 'wei_zhi_dao' | 'zhi_dao_zhong' | 'yi_wan_cheng'

const props = defineProps<{
  jiaoSeId: string
}>()

const emit = defineEmits<{
  guanBi: []
}>()

const router = useRouter()

const 军师仓库 = 使用军师仓库()

const junShiLieBiaoXuanXiang = ref<JunShiXinXi[]>([])
const jiLuLieBiao = ref<JunShiJiLu[]>([])
const dangQianZhuangTai = computed(() => 军师仓库.zhuangTai)
const youLiaoTianJiLu = computed(() => 军师仓库.youLiaoTianJiLu)
const qingQiuZhongJunShiId = ref<string | null>(null)
const zhanKaiJunShiId = ref<string | null>(null)
const cuoWuTiShiMap = ref<Record<string, QianTaiCuoWu | null>>({})
const jiaZaiZhong = ref(true)
const xianShiZhiDaoJiLu = ref(false)
const touXiangShiBai = ref<Record<string, boolean>>({})

function biaoJiTouXiangShiBai(junShiId: string) {
  touXiangShiBai.value = { ...touXiangShiBai.value, [junShiId]: true }
}

function junShiMoRenWenZi(junShi: JunShiXinXi): string {
  return junShiMoRenTouXiang(huoQuJunShiMingCheng(junShi))
}

const yiZhiDaoXiangTongNeiRong = computed(
  () => !军师仓库.keZaiCiZhiDao && 军师仓库.zhuangTai?.zhuang_tai !== 'zhi_dao_zhong',
)

let lunXunShiJianQi: ReturnType<typeof setInterval> | null = null
const LUN_XUN_JIAN_GE_HAO_MIAO = 3000
const JIAN_YI_YU_LAN_CHANG_DU = 50

function tingZhiLunXun() {
  if (lunXunShiJianQi) {
    clearInterval(lunXunShiJianQi)
    lunXunShiJianQi = null
  }
}

function qiDongLunXun() {
  tingZhiLunXun()
  lunXunShiJianQi = setInterval(() => {
    void chaXunBingGengXinZhuangTai()
  }, LUN_XUN_JIAN_GE_HAO_MIAO)
}

function huoQuJunShiZhuangTai(junShiId: string): JunShiZhuangTaiLeiXing {
  if (!军师仓库.shiDangQianHuiHua(props.jiaoSeId)) return 'wei_zhi_dao'
  const zt = 军师仓库.zhuangTai
  if (zt?.zhuang_tai === 'zhi_dao_zhong' && zt.jun_shi_id === junShiId) {
    return 'zhi_dao_zhong'
  }
  if (zt?.zhuang_tai === 'yi_wan_cheng' && zt.jun_shi_id === junShiId) {
    return 军师仓库.keZaiCiZhiDao ? 'wei_zhi_dao' : 'yi_wan_cheng'
  }
  if (jiLuLieBiao.value.some((jiLu) => jiLu.jun_shi_id === junShiId)) {
    return 军师仓库.keZaiCiZhiDao ? 'wei_zhi_dao' : 'yi_wan_cheng'
  }
  return 'wei_zhi_dao'
}

function huoQuZhiDaoJieGuo(junShiId: string): string | null {
  const zt = 军师仓库.zhuangTai
  if (zt?.zhuang_tai === 'yi_wan_cheng' && zt.jun_shi_id === junShiId && zt.jie_guo) {
    return zt.jie_guo.zhiDaoNeiRong
  }
  const jiLu = jiLuLieBiao.value.find((item) => item.jun_shi_id === junShiId)
  return jiLu?.jian_yi || null
}

function huoQuZhiDaoFenDuan(junShiId: string): JunShiZhiDaoFenDuan | null {
  const zt = 军师仓库.zhuangTai
  if (zt?.zhuang_tai === 'yi_wan_cheng' && zt.jun_shi_id === junShiId && zt.jie_guo) {
    return zt.jie_guo.zhiDaoFenDuan ?? null
  }
  const jiLu = jiLuLieBiao.value.find((item) => item.jun_shi_id === junShiId)
  return jiLu?.jian_yi_fen_duan ?? null
}

async function chaXunBingGengXinZhuangTai(): Promise<void> {
  if (!props.jiaoSeId) return
  try {
    const {
      zhuangTai,
      keZaiCiZhiDao: keZaiCi,
      youLiaoTianJiLu: ylt,
    } = await huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
    军师仓库.gengXinZhuangTai(zhuangTai, keZaiCi, ylt)
    if (zhuangTai?.zhuang_tai === 'yi_wan_cheng') {
      tingZhiLunXun()
      await shuaXinJiLuLieBiao()
      if (zhuangTai.jun_shi_id) {
        zhanKaiJunShiId.value = zhuangTai.jun_shi_id
      }
    } else if (!zhuangTai || zhuangTai.zhuang_tai !== 'zhi_dao_zhong') {
      tingZhiLunXun()
    }
  } catch (e) {
     
    console.warn('查询军师指导状态失败', e)
  }
}

async function shuaXinJiLuLieBiao(): Promise<void> {
  if (!props.jiaoSeId) return
  try {
    jiLuLieBiao.value = await huoQuJunShiJiLu(props.jiaoSeId)
  } catch {
    jiLuLieBiao.value = []
  }
}

function huoQuJunShiMingCheng(junShi: JunShiXinXi): string {
  const fanYiJian = `${junShi.id}Ming` as keyof typeof fanYi.junShi
  const fanYiZhi = fanYi.junShi[fanYiJian]
  return typeof fanYiZhi === 'string' ? fanYiZhi : junShi.mingCheng
}

async function zhiXingQingQiu(junShi: JunShiXinXi) {
  if (yiZhiDaoXiangTongNeiRong.value) return
  await qingQiuZhiDao(junShi)
}

function chongShiZhuangTai(): void {
  if (!props.jiaoSeId) return
  void 军师仓库.chuShiHuaZhuangTai(props.jiaoSeId)
}

async function chongShiQingQiu(junShi: JunShiXinXi) {
  if (qingQiuZhongJunShiId.value === junShi.id) return
  await qingQiuZhiDao(junShi)
}

async function qingQiuZhiDao(junShi: JunShiXinXi) {
  if (!props.jiaoSeId) return
  qingQiuZhongJunShiId.value = junShi.id
  cuoWuTiShiMap.value = { ...cuoWuTiShiMap.value, [junShi.id]: null }
  军师仓库.sheZhiZhiDaoZhong(props.jiaoSeId, junShi.id)
  qiDongLunXun()
  try {
    const jieGuo = await qingQiuJunShiZhiDao(props.jiaoSeId, junShi.id)
    track('junShiShiYong', { jun_shi_id: junShi.id })
    军师仓库.sheZhiYiWanCheng(props.jiaoSeId, junShi.id, jieGuo)
    const { keZaiCiZhiDao: kzc } = await huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
    军师仓库.gengXinKeZaiCiZhiDao(kzc)
    await shuaXinJiLuLieBiao()
    zhanKaiJunShiId.value = junShi.id
    qingQiuZhongJunShiId.value = null
    tingZhiLunXun()
  } catch (e: unknown) {
    const zhengChangHua = 归一前台错误(e)
    if (zhengChangHua.code === QIAN_TAI_DAI_MA.JUN_SHI_ZAI_ZHI_DAO_ZHONG) {
      return
    }
    qingQiuZhongJunShiId.value = null
    if (zhengChangHua.code === QIAN_TAI_DAI_MA.JUN_SHI_CHONG_FU) {
      cuoWuTiShiMap.value = {
        ...cuoWuTiShiMap.value,
        [junShi.id]: chuangJianQianTaiCuoWu({
          code: QIAN_TAI_DAI_MA.JUN_SHI_CHONG_FU,
          yingXiang: huoQuFanYi('junShi', 'junShiChongFu'),
        }),
      }
    } else if (zhengChangHua.code === QIAN_TAI_DAI_MA.WU_LIAO_TIAN_JI_LU) {
      cuoWuTiShiMap.value = {
        ...cuoWuTiShiMap.value,
        [junShi.id]: chuangJianQianTaiCuoWu({
          code: QIAN_TAI_DAI_MA.WU_LIAO_TIAN_JI_LU,
          yingXiang: huoQuFanYi('junShi', 'wuLiaoTianJiLu'),
        }),
      }
    } else {
      cuoWuTiShiMap.value = { ...cuoWuTiShiMap.value, [junShi.id]: zhengChangHua }
    }
  }
}

function qieHuanZhanKai(junShiId: string) {
  zhanKaiJunShiId.value = zhanKaiJunShiId.value === junShiId ? null : junShiId
}

function daKaiZhiDaoJiLu() {
  xianShiZhiDaoJiLu.value = true
}

function guanBiZhiDaoJiLu() {
  xianShiZhiDaoJiLu.value = false
}

function huoQuJianYiYuLan(jiLu: JunShiJiLu): string {
  const jianYi = jiLu.jian_yi_fen_duan?.xiaYiBuZenMeHui?.trim() || jiLu.jian_yi || ''
  if (!jianYi) return ''
  return jianYi.length > JIAN_YI_YU_LAN_CHANG_DU
    ? jianYi.slice(0, JIAN_YI_YU_LAN_CHANG_DU) + '...'
    : jianYi
}

function tiaoZhuanZhiDaoJiLuXiangQing(jiLu: JunShiJiLu) {
  if (!props.jiaoSeId) return
  xianShiZhiDaoJiLu.value = false
  emit('guanBi')
  router.push({
    name: 'junShiJiLuXiangQing',
    params: {
      jiaoSeId: props.jiaoSeId,
      jiLuId: jiLu.shi_jian,
    },
  })
}

onMounted(() => {
  void chuShiHua()
})

watch(
  () => props.jiaoSeId,
  () => {
    tingZhiLunXun()
    void chuShiHua()
  },
)

async function chuShiHua(): Promise<void> {
  jiaZaiZhong.value = true
  qingQiuZhongJunShiId.value = null
  zhanKaiJunShiId.value = null
  cuoWuTiShiMap.value = {}
  if (!props.jiaoSeId || !shiYouXiaoJiaoSeId(props.jiaoSeId)) {
    jiaZaiZhong.value = false
    return
  }
  try {
    const [lieBiao, jiLu, zhuangTaiJieGuo] = await Promise.all([
      huoQuJunShiLieBiao(),
      props.jiaoSeId ? huoQuJunShiJiLu(props.jiaoSeId) : Promise.resolve([] as JunShiJiLu[]),
      props.jiaoSeId
        ? huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
        : Promise.resolve({ zhuangTai: null, keZaiCiZhiDao: true, youLiaoTianJiLu: true } as {
            zhuangTai: JunShiZhiDaoZhuangTaiXinXi | null
            keZaiCiZhiDao: boolean
            youLiaoTianJiLu: boolean
          }),
    ])
    junShiLieBiaoXuanXiang.value = lieBiao
    jiLuLieBiao.value = jiLu
    军师仓库.jiaoSeId = props.jiaoSeId
    军师仓库.gengXinZhuangTai(
      zhuangTaiJieGuo.zhuangTai,
      zhuangTaiJieGuo.keZaiCiZhiDao,
      zhuangTaiJieGuo.youLiaoTianJiLu,
    )
    if (zhuangTaiJieGuo.zhuangTai?.zhuang_tai === 'zhi_dao_zhong') {
      qiDongLunXun()
    }
  } catch (e) {
     
    console.warn(huoQuFanYi('junShi', 'jiaZaiJunShiLieBiaoShiBai'), e)
  } finally {
    jiaZaiZhong.value = false
  }
}

onUnmounted(() => {
  tingZhiLunXun()
})
</script>

<style scoped>
.junshi-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--zhezhao-beijing);
  z-index: var(--ceng-junshi);
  display: flex;
  justify-content: flex-end;
}

.junshi-mianban {
  position: relative;
  width: 100%;
  max-width: 380px;
  height: 100%;
  background: var(--beijing-kaopian);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.junshi-dingbu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--jiange-zhong) calc(var(--jiange-zhong) + var(--jiange-4));
  border-bottom: 1px solid var(--biankuang-yanse);
}

.dingbu-anniu-zu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.biaoti {
  font-size: 16px;
  font-weight: 700;
  color: var(--wenben-zhuse);
}

.guanbi-anniu {
  font-size: 18px;
  color: var(--wenben-ciuse);
  padding: var(--jiange-4) var(--jiange-xiao);
  border-radius: 8px;
  transition: background 0.2s ease;
}

.guanbi-anniu:hover {
  background: var(--caidan-hover);
}

.zhidao-jilu-anniu {
  padding: var(--jiange-6) calc(var(--jiange-12) + var(--jiange-2));
  background: var(--junshi-zhuse-touming);
  color: var(--junshi-zhuse);
  border: 1px solid var(--junshi-biankuang);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.zhidao-jilu-anniu:hover {
  background: var(--junshi-zhuse);
  color: #ffffff;
}

.junshi-neirong {
  flex: 1;
  overflow-y: auto;
  padding: calc(var(--jiange-zhong) + var(--jiange-4));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-beijing) transparent;
}


.junshi-neirong::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.junshi-neirong::-webkit-scrollbar-track {
  background: transparent;
}

.junshi-neirong::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 3px;
}

.junshi-neirong::-webkit-scrollbar-thumb:hover {
  background: var(--gundong-tiao-beijing);
}

.jiazai-zhuangtai,
.kong-zhuangtai {
  text-align: center;
  padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-zhong);
  color: var(--wenben-ciuse);
  font-size: 14px;
}

.junshi-liebiao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
}

.junshi-kapian {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-12);
  padding: var(--jiange-zhong);
  background: var(--junshi-zhuse-touming);
  border: 1px solid var(--junshi-biankuang);
  border-radius: 16px;
  transition: all 0.2s ease;
}

.junshi-kapian.zhi-dao-zhong {
  border-color: var(--junshi-zhuse);
  background: color-mix(in srgb, var(--junshi-zhuse) 18%, transparent);
}

.junshi-kapian.yi-wan-cheng {
  border-color: var(--junshi-biankuang);
}

.junshi-wei {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #8b6914, #d4a843);
}

.junshi-xiangqing {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  flex: 1;
  min-width: 0;
}

.junshi-mingcheng {
  font-size: 16px;
  font-weight: 700;
  color: var(--junshi-zhuse);
}

.qingqiu-anniu {
  box-sizing: border-box;
  width: 7.6em;
  min-height: 3em;
  margin-left: auto;
  padding: var(--jiange-4) var(--jiange-10);
  background: var(--junshi-zhuse);
  color: #ffffff;
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  white-space: normal;
  word-break: break-word;
}

.qingqiu-anniu:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.qingqiu-anniu:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qingqiu-anniu.zhidao-zhong {
  background: var(--junshi-zhuse);
  color: #ffffff;
  opacity: 0.65;
  cursor: not-allowed;
}

.qingqiu-anniu.yi-zhidao {
  background: var(--junshi-zhuse);
  color: #ffffff;
}

.cuowu-tishi {
  width: 100%;
}

.yi-zhidao-tishi {
  padding: var(--jiange-10) calc(var(--jiange-12) + var(--jiange-2));
  margin-bottom: var(--jiange-12);
  background: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #e65100;
  text-align: center;
}

.wu-liao-tian-tishi {
  padding: var(--jiange-10) calc(var(--jiange-12) + var(--jiange-2));
  margin-bottom: var(--jiange-12);
  background: rgba(33, 150, 243, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #1976d2;
  text-align: center;
}

.zhidao-jieguo {
  width: 100%;
  padding: var(--jiange-zhong);
  background: var(--junshi-zhaiyao-beijing);
  border-radius: 12px;
  border: 1px solid var(--junshi-biankuang);
}

.jieguo-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: var(--junshi-zhuse);
  margin-bottom: var(--jiange-xiao);
}

.zhidao-jilu-zhezhao {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: var(--ceng-junshi-jilu);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
}

.zhidao-jilu-mianban {
  width: 100%;
  max-width: 320px;
  max-height: 80%;
  background: var(--liaotian-beijing);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.zhidao-jilu-dingbu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--jiange-12) + var(--jiange-2)) calc(var(--jiange-zhong) + var(--jiange-2));
  border-bottom: 1px solid var(--biankuang-yanse);
}

.zhidao-jilu-neirong {
  flex: 1;
  overflow-y: auto;
  padding: var(--jiange-zhong);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-beijing) transparent;
}


.zhidao-jilu-neirong::-webkit-scrollbar {
  width: 6px;
}

.zhidao-jilu-neirong::-webkit-scrollbar-track {
  background: transparent;
}

.zhidao-jilu-liebiao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
}

.zhidao-jilu-xiangmu {
  padding: var(--jiange-12) calc(var(--jiange-12) + var(--jiange-2));
  background: var(--junshi-zhuse-touming);
  border: 1px solid var(--junshi-biankuang);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zhidao-jilu-xiangmu:hover {
  border-color: var(--junshi-zhuse);
  transform: translateY(-1px);
}

.jilu-xiangmu-tou {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  margin-bottom: var(--jiange-6);
}

.jilu-junshi-mingcheng {
  font-size: 14px;
  font-weight: 700;
  color: var(--junshi-zhuse);
}

.jilu-shijian {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.jilu-yulan {
  font-size: 13px;
  color: var(--wenben-zhuse);
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 480px) {
  .junshi-mianban {
    max-width: 100%;
  }
}
</style>
