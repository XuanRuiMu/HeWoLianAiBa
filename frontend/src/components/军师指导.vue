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
        <div v-if="jiaZaiZhong" class="jiazai-zhuangtai">
          {{ huoQuFanYi('junShi', 'jiaZaiZhong') }}
        </div>
        <div v-else-if="junShiLieBiaoXuanXiang.length === 0" class="kong-zhuangtai">
          {{ huoQuFanYi('junShi', 'zanWuJunShi') }}
        </div>
        <div v-else class="junshi-liebiao">
          <div v-if="yiZhiDaoGuo" class="yi-zhidao-tishi">
            {{ huoQuFanYi('junShi', 'yiZhiDaoXiangTongNeiRong') }}
          </div>
          <div
            v-for="junShi in junShiLieBiaoXuanXiang"
            :key="junShi.id"
            class="junshi-kapian"
            :class="{
              'zhi-dao-zhong': huoQuJunShiZhuangTai(junShi.id) === 'zhi_dao_zhong',
              'yi-wan-cheng': huoQuJunShiZhuangTai(junShi.id) === 'yi_wan_cheng',
            }"
          >
            <div class="junshi-touxiang">
              <img
                :src="shengChengTouXiangURL(junShi.touXiang)"
                :alt="huoQuJunShiMingCheng(junShi) || ''"
                class="touxiang-tu"
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
                dangQianZhuangTai?.zhuang_tai === 'zhi_dao_zhong'
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

            <div v-if="cuoWuTiShiMap[junShi.id]" class="cuowu-tishi">
              {{ cuoWuTiShiMap[junShi.id] }}
            </div>

            <div
              v-if="zhanKaiJunShiId === junShi.id && huoQuZhiDaoJieGuo(junShi.id)"
              class="zhidao-jieguo"
            >
              <h3 class="jieguo-biaoti">{{ huoQuFanYi('junShi', 'zhiDaoJianYi') }}</h3>
              <p class="jieguo-neirong">
                {{ huoQuZhiDaoJieGuo(junShi.id) }}
              </p>
            </div>
          </div>
        </div>
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
                <p class="jilu-yulan">{{ huoQuJianYiYuLan(jiLu.jian_yi) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  qingQiuJunShiZhiDao,
  huoQuJunShiJiLu,
  huoQuJunShiLieBiao,
  huoQuJunShiZhiDaoZhuangTai,
} from '@/api/聊天'
import { fanYi, huoQuFanYi } from '@/config/translations'
import { 是业务错误 } from '@/api/请求'
import { shengChengTouXiangURL } from '@/utils/头像'
import type { JunShiXinXi, JunShiJiLu, JunShiZhiDaoZhuangTaiXinXi } from '@/types'

type JunShiZhuangTaiLeiXing = 'wei_zhi_dao' | 'zhi_dao_zhong' | 'yi_wan_cheng'

const props = defineProps<{
  jiaoSeId: string
}>()

const emit = defineEmits<{
  guanBi: []
}>()

const router = useRouter()

const junShiLieBiaoXuanXiang = ref<JunShiXinXi[]>([])
const jiLuLieBiao = ref<JunShiJiLu[]>([])
const dangQianZhuangTai = ref<JunShiZhiDaoZhuangTaiXinXi | null>(null)
const keZaiCiZhiDao = ref(true)
const qingQiuZhongJunShiId = ref<string | null>(null)
const zhanKaiJunShiId = ref<string | null>(null)
const cuoWuTiShiMap = ref<Record<string, string>>({})
const jiaZaiZhong = ref(true)
const xianShiZhiDaoJiLu = ref(false)

const yiZhiDaoGuo = computed(
  () => !keZaiCiZhiDao.value && dangQianZhuangTai.value?.zhuang_tai !== 'zhi_dao_zhong',
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
  if (
    dangQianZhuangTai.value?.zhuang_tai === 'zhi_dao_zhong' &&
    dangQianZhuangTai.value.jun_shi_id === junShiId
  ) {
    return 'zhi_dao_zhong'
  }
  if (
    dangQianZhuangTai.value?.zhuang_tai === 'yi_wan_cheng' &&
    dangQianZhuangTai.value.jun_shi_id === junShiId
  ) {
    return keZaiCiZhiDao.value ? 'wei_zhi_dao' : 'yi_wan_cheng'
  }
  if (jiLuLieBiao.value.some((jiLu) => jiLu.jun_shi_id === junShiId)) {
    return keZaiCiZhiDao.value ? 'wei_zhi_dao' : 'yi_wan_cheng'
  }
  return 'wei_zhi_dao'
}

function huoQuZhiDaoJieGuo(junShiId: string): string | null {
  if (
    dangQianZhuangTai.value?.zhuang_tai === 'yi_wan_cheng' &&
    dangQianZhuangTai.value.jun_shi_id === junShiId &&
    dangQianZhuangTai.value.jie_guo
  ) {
    return dangQianZhuangTai.value.jie_guo.zhiDaoNeiRong
  }
  const jiLu = jiLuLieBiao.value.find((item) => item.jun_shi_id === junShiId)
  return jiLu?.jian_yi || null
}

async function chaXunBingGengXinZhuangTai(): Promise<void> {
  if (!props.jiaoSeId) return
  try {
    const { zhuangTai, keZaiCiZhiDao: keZaiCi } = await huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
    dangQianZhuangTai.value = zhuangTai
    keZaiCiZhiDao.value = keZaiCi
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
  if (!props.jiaoSeId) return
  qingQiuZhongJunShiId.value = junShi.id
  cuoWuTiShiMap.value = { ...cuoWuTiShiMap.value, [junShi.id]: '' }
  try {
    const jieGuo = await qingQiuJunShiZhiDao(props.jiaoSeId, junShi.id)
    dangQianZhuangTai.value = {
      zhuang_tai: 'yi_wan_cheng',
      jun_shi_id: junShi.id,
      kai_shi_shi_jian: jieGuo.shiJian,
      jie_guo: jieGuo,
    }
    await shuaXinJiLuLieBiao()
    zhanKaiJunShiId.value = junShi.id
    qingQiuZhongJunShiId.value = null
    tingZhiLunXun()
  } catch (e: unknown) {
    qingQiuZhongJunShiId.value = null
    const cuoWuMa = 是业务错误(e) ? e.cuo_wu_ma : ''
    if (cuoWuMa === 'JUN_SHI_CHONG_FU') {
      cuoWuTiShiMap.value = {
        ...cuoWuTiShiMap.value,
        [junShi.id]: huoQuFanYi('junShi', 'junShiChongFu'),
      }
    } else if (cuoWuMa === 'WU_LIAO_TIAN_JI_LU') {
      cuoWuTiShiMap.value = {
        ...cuoWuTiShiMap.value,
        [junShi.id]: huoQuFanYi('junShi', 'wuLiaoTianJiLu'),
      }
    } else if (cuoWuMa === 'JUN_SHI_ZAI_ZHI_DAO_ZHONG') {
      dangQianZhuangTai.value = {
        zhuang_tai: 'zhi_dao_zhong',
        jun_shi_id: junShi.id,
        kai_shi_shi_jian: new Date().toISOString(),
      }
      qiDongLunXun()
    } else {
      cuoWuTiShiMap.value = {
        ...cuoWuTiShiMap.value,
        [junShi.id]: huoQuFanYi('junShi', 'qingQiuShiBai'),
      }
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

function huoQuJianYiYuLan(jianYi: string): string {
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

onMounted(async () => {
  jiaZaiZhong.value = true
  try {
    const [lieBiao, jiLu, zhuangTaiJieGuo] = await Promise.all([
      huoQuJunShiLieBiao(),
      props.jiaoSeId ? huoQuJunShiJiLu(props.jiaoSeId) : Promise.resolve([] as JunShiJiLu[]),
      props.jiaoSeId
        ? huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
        : Promise.resolve({ zhuangTai: null, keZaiCiZhiDao: true } as {
            zhuangTai: JunShiZhiDaoZhuangTaiXinXi | null
            keZaiCiZhiDao: boolean
          }),
    ])
    junShiLieBiaoXuanXiang.value = lieBiao
    jiLuLieBiao.value = jiLu
    dangQianZhuangTai.value = zhuangTaiJieGuo.zhuangTai
    keZaiCiZhiDao.value = zhuangTaiJieGuo.keZaiCiZhiDao
    if (zhuangTaiJieGuo.zhuangTai?.zhuang_tai === 'zhi_dao_zhong') {
      qiDongLunXun()
    }
  } catch (e) {
    console.warn(huoQuFanYi('junShi', 'jiaZaiJunShiLieBiaoShiBai'), e)
  } finally {
    jiaZaiZhong.value = false
  }
})

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
  z-index: 1500;
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
  padding: 16px 20px;
  border-bottom: 1px solid var(--biankuang-yanse);
}

.dingbu-anniu-zu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.biaoti {
  font-size: 16px;
  font-weight: 700;
  color: var(--wenben-zhuse);
}

.guanbi-anniu {
  font-size: 18px;
  color: var(--wenben-ciuse);
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.guanbi-anniu:hover {
  background: var(--caidan-hover);
}

.zhidao-jilu-anniu {
  padding: 6px 14px;
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
  padding: 20px;
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
  padding: 32px 16px;
  color: var(--wenben-ciuse);
  font-size: 14px;
}

.junshi-liebiao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.junshi-kapian {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--junshi-zhuse-touming);
  border: 1px solid var(--junshi-biankuang);
  border-radius: 16px;
  transition: all 0.2s ease;
}

.junshi-kapian.zhi-dao-zhong {
  border-color: var(--junshi-zhuse);
  background: var(--junshi-zhuse-touming);
}

.junshi-kapian.yi-wan-cheng {
  border-color: var(--junshi-biankuang);
}

.junshi-touxiang {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--beijing-ciuse);
}

.touxiang-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.junshi-xiangqing {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.junshi-mingcheng {
  font-size: 16px;
  font-weight: 700;
  color: var(--junshi-zhuse);
}

.qingqiu-anniu {
  margin-left: auto;
  padding: 8px 16px;
  background: var(--junshi-zhuse);
  color: #ffffff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
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
  background: var(--beijing-ciuse);
  color: var(--wenben-ciuse);
  cursor: not-allowed;
}

.qingqiu-anniu.yi-zhidao {
  background: var(--beijing-kaopian);
  color: var(--junshi-zhuse);
  border: 1px solid var(--junshi-biankuang);
}

.qingqiu-anniu.yi-zhidao:hover {
  background: var(--junshi-zhuse-touming);
}

.cuowu-tishi {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #e65100;
  text-align: center;
}

.yi-zhidao-tishi {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #e65100;
  text-align: center;
}

.zhidao-jieguo {
  width: 100%;
  padding: 16px;
  background: var(--junshi-zhaiyao-beijing);
  border-radius: 12px;
  border: 1px solid var(--junshi-biankuang);
}

.jieguo-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: var(--junshi-zhuse);
  margin-bottom: 8px;
}

.jieguo-neirong {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.6;
}

.zhidao-jilu-zhezhao {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.zhidao-jilu-mianban {
  width: 100%;
  max-width: 320px;
  max-height: 80%;
  background: var(--beijing-kaopian);
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
  padding: 14px 18px;
  border-bottom: 1px solid var(--biankuang-yanse);
}

.zhidao-jilu-neirong {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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

.zhidao-jilu-neirong::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 3px;
}

.zhidao-jilu-liebiao {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.zhidao-jilu-xiangmu {
  padding: 12px 14px;
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
  gap: 4px;
  margin-bottom: 6px;
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
