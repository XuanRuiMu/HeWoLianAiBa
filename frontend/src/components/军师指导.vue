<template>
  <div class="junshi-zhezhao" @click.self="$emit('guanBi')">
    <div class="junshi-mianban">
      <div class="junshi-dingbu">
        <div v-if="dangQianJunShi" class="biaoqian-zu">
          <button
            class="biaoqian-anniu"
            :class="{ huoyue: dangQianBiaoQian === 'zhidao' }"
            @click="dangQianBiaoQian = 'zhidao'"
          >
            {{ huoQuFanYi('junShi', 'junShiZhiDao') }}
          </button>
          <button
            class="biaoqian-anniu"
            :class="{ huoyue: dangQianBiaoQian === 'jilu' }"
            @click="qieHuanDaoJiLu()"
          >
            {{ huoQuFanYi('junShi', 'zhiDaoJiLu') }}
          </button>
        </div>
        <div v-else class="junshi-biaoti">{{ huoQuFanYi('junShi', 'junShiZhiDao') }}</div>
        <button class="guanbi-anniu" @click="$emit('guanBi')">
          {{ huoQuFanYi('junShi', 'guanBi') }}
        </button>
      </div>

      <div class="junshi-neirong">
        <div v-if="!dangQianJunShi" class="junshi-xuanze-buju">
          <div class="xuanze-tishi">{{ huoQuFanYi('junShi', 'qingXuanZeNiDeJunShi') }}</div>
          <div class="junshi-liebiao">
            <div
              v-for="junShi in junShiLieBiaoXuanXiang"
              :key="junShi.id"
              class="junshi-xuanze-xiang"
              @click="jinRuJunShiXiangQing(junShi)"
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
              <span class="jiantou">›</span>
            </div>
          </div>
        </div>

        <template v-else>
          <div class="junshi-xinxi-toubu">
            <button class="fanhui-anniu" @click="fanHuiDaoLieBiao">
              ← {{ huoQuFanYi('caidan', 'fanHui') }}
            </button>
            <div class="xuanzhong-junshi">
              <div class="junshi-touxiang xiao">
                <img
                  :src="shengChengTouXiangURL(dangQianJunShi.touXiang)"
                  :alt="huoQuJunShiMingCheng(dangQianJunShi)"
                  class="touxiang-tu"
                />
              </div>
              <span class="junshi-mingcheng">{{ huoQuJunShiMingCheng(dangQianJunShi) }}</span>
            </div>
          </div>

          <div v-if="dangQianBiaoQian === 'zhidao'" class="zhidao-buju">
            <button
              class="qingqiu-anniu"
              :disabled="qingQiuZhong || !jiaoSeId"
              @click="zhiXingQingQiu"
            >
              {{
                qingQiuZhong
                  ? huoQuFanYi('junShi', 'zhiDaoZhong')
                  : huoQuFanYi('junShi', 'qingQiuZhiDao')
              }}
            </button>

            <div v-if="cuoWuTiShi" class="cuowu-tishi">
              {{ cuoWuTiShi }}
            </div>

            <div v-if="zhiDaoJieGuo" class="zhidao-jieguo">
              <h3 class="jieguo-biaoti">{{ huoQuFanYi('junShi', 'zhiDaoJianYi') }}</h3>
              <p class="jieguo-neirong">
                {{ zhiDaoJieGuo }}
              </p>
            </div>
          </div>

          <div v-else class="jilu-buju">
            <div v-if="jiaZaiJiLuZhong" class="jiazai-zhuangtai">
              {{ huoQuFanYi('junShi', 'jiaZaiZhong') }}
            </div>
            <div v-else-if="dangQianJunShiJiLu.length === 0" class="kong-zhuangtai">
              {{ huoQuFanYi('junShi', 'zanWuZhiDaoJiLu') }}
            </div>
            <div v-else class="jilu-liebiao">
              <div
                v-for="jiLu in dangQianJunShiJiLu"
                :key="jiLu.shi_jian"
                class="jilu-xiangmu"
                @click="jinRuJiLuXiangQing(jiLu)"
              >
                <div class="jilu-zhaiyao">
                  <span class="jilu-shijian">{{ jiLu.shi_jian }}</span>
                  <span class="jilu-jiaose">{{ jiLu.jiao_se_ming_zi }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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
import type { JunShiXinXi, JunShiJiLu } from '@/types'

const props = defineProps<{
  jiaoSeId: string
}>()

defineEmits<{
  guanBi: []
}>()

const dangQianBiaoQian = ref<'zhidao' | 'jilu'>('zhidao')
const qingQiuZhong = ref(false)
const zhiDaoJieGuo = ref<string | null>(null)
const cuoWuTiShi = ref('')
const jiLuLieBiao = ref<JunShiJiLu[]>([])
const jiaZaiJiLuZhong = ref(false)
const junShiLieBiaoXuanXiang = ref<JunShiXinXi[]>([])
const dangQianJunShi = ref<JunShiXinXi | null>(null)
const router = useRouter()
let lunXunShiJianQi: ReturnType<typeof setInterval> | null = null
const LUN_XUN_JIAN_GE_HAO_MIAO = 3000

function tingZhiLunXun() {
  if (lunXunShiJianQi) {
    clearInterval(lunXunShiJianQi)
    lunXunShiJianQi = null
  }
}

function qiDongLunXun() {
  tingZhiLunXun()
  lunXunShiJianQi = setInterval(() => {
    void chaXunBingGengXinZhuangTai(false)
  }, LUN_XUN_JIAN_GE_HAO_MIAO)
}

async function chaXunBingGengXinZhuangTai(qingQiuZhongBaoChi: boolean): Promise<void> {
  if (!props.jiaoSeId) return
  try {
    const zhuangTai = await huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
    if (!zhuangTai) {
      if (!qingQiuZhongBaoChi) {
        qingQiuZhong.value = false
        zhiDaoJieGuo.value = null
        cuoWuTiShi.value = ''
        tingZhiLunXun()
      }
      return
    }
    if (zhuangTai.zhuang_tai === 'zhi_dao_zhong') {
      qingQiuZhong.value = true
      zhiDaoJieGuo.value = null
      cuoWuTiShi.value = ''
    } else if (zhuangTai.zhuang_tai === 'yi_wan_cheng' && zhuangTai.jie_guo) {
      qingQiuZhong.value = false
      const junShiPiPei = dangQianJunShi.value && zhuangTai.jun_shi_id === dangQianJunShi.value.id
      zhiDaoJieGuo.value = junShiPiPei ? zhuangTai.jie_guo.zhiDaoNeiRong : null
      cuoWuTiShi.value = ''
      tingZhiLunXun()
    }
  } catch (e) {
    console.warn('查询军师指导状态失败', e)
  }
}

const dangQianJunShiJiLu = computed(() => {
  if (!dangQianJunShi.value) return []
  return jiLuLieBiao.value.filter((jiLu) => jiLu.jun_shi_id === dangQianJunShi.value!.id)
})

onMounted(async () => {
  try {
    junShiLieBiaoXuanXiang.value = await huoQuJunShiLieBiao()
  } catch (e) {
    console.warn(huoQuFanYi('junShi', 'jiaZaiJunShiLieBiaoShiBai'), e)
  }
})

onUnmounted(() => {
  tingZhiLunXun()
})

async function jinRuJunShiXiangQing(junShi: JunShiXinXi) {
  dangQianJunShi.value = junShi
  dangQianBiaoQian.value = 'zhidao'
  zhiDaoJieGuo.value = null
  cuoWuTiShi.value = ''
  qingQiuZhong.value = false
  tingZhiLunXun()
  await chaXunBingGengXinZhuangTai(false)
  if (qingQiuZhong.value) {
    qiDongLunXun()
  }
}

function fanHuiDaoLieBiao() {
  dangQianJunShi.value = null
  dangQianBiaoQian.value = 'zhidao'
  zhiDaoJieGuo.value = null
  cuoWuTiShi.value = ''
  qingQiuZhong.value = false
  tingZhiLunXun()
}

function huoQuJunShiMingCheng(junShi: JunShiXinXi): string {
  const fanYiJian = `${junShi.id}Ming` as keyof typeof fanYi.junShi
  const fanYiZhi = fanYi.junShi[fanYiJian]
  return typeof fanYiZhi === 'string' ? fanYiZhi : junShi.mingCheng
}

function jinRuJiLuXiangQing(jiLu: JunShiJiLu) {
  router.push({
    name: 'junShiJiLuXiangQing',
    params: {
      jiaoSeId: props.jiaoSeId,
      jiLuId: jiLu.shi_jian,
    },
  })
}

async function zhiXingQingQiu() {
  if (!dangQianJunShi.value) return
  qingQiuZhong.value = true
  zhiDaoJieGuo.value = null
  cuoWuTiShi.value = ''
  try {
    const jieGuo = await qingQiuJunShiZhiDao(props.jiaoSeId, dangQianJunShi.value.id)
    zhiDaoJieGuo.value = jieGuo.zhiDaoNeiRong
    qingQiuZhong.value = false
    tingZhiLunXun()
  } catch (e: unknown) {
    const cuoWuMa = 是业务错误(e) ? e.cuo_wu_ma : ''
    if (cuoWuMa === 'JUN_SHI_CHONG_FU') {
      cuoWuTiShi.value = huoQuFanYi('junShi', 'junShiChongFu')
      qingQiuZhong.value = false
      tingZhiLunXun()
    } else if (cuoWuMa === 'WU_LIAO_TIAN_JI_LU') {
      cuoWuTiShi.value = huoQuFanYi('junShi', 'wuLiaoTianJiLu')
      qingQiuZhong.value = false
      tingZhiLunXun()
    } else if (cuoWuMa === 'JUN_SHI_ZAI_ZHI_DAO_ZHONG') {
      cuoWuTiShi.value = ''
      qingQiuZhong.value = true
      qiDongLunXun()
    } else {
      cuoWuTiShi.value = ''
      qingQiuZhong.value = true
      qiDongLunXun()
    }
    zhiDaoJieGuo.value = null
  }
}

async function jiaZaiJiLu() {
  jiaZaiJiLuZhong.value = true
  try {
    jiLuLieBiao.value = await huoQuJunShiJiLu(props.jiaoSeId)
  } catch {
    jiLuLieBiao.value = []
  } finally {
    jiaZaiJiLuZhong.value = false
  }
}

function qieHuanDaoJiLu() {
  dangQianBiaoQian.value = 'jilu'
  jiaZaiJiLu()
}
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

.biaoqian-zu {
  display: flex;
  gap: 4px;
  background: var(--beijing-ciuse);
  border-radius: 10px;
  padding: 3px;
}

.biaoqian-anniu {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--wenben-ciuse);
  transition: all 0.2s ease;
}

.biaoqian-anniu.huoyue {
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.junshi-biaoti {
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
  background: var(--gundong-tiao-hover);
}

.junshi-xuanze-buju {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.xuanze-tishi {
  font-size: 13px;
  color: var(--wenben-ciuse);
  padding: 0 4px;
}

.junshi-liebiao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.junshi-xuanze-xiang {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--junshi-zhuse-touming);
  border: 1px solid var(--junshi-biankuang);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.junshi-xuanze-xiang:hover {
  background: var(--junshi-zhuse-touming);
  border-color: var(--junshi-zhuse);
}

.jiantou {
  margin-left: auto;
  font-size: 18px;
  color: var(--wenben-ciuse);
}

.junshi-touxiang {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--beijing-ciuse);
}

.junshi-touxiang.xiao {
  width: 36px;
  height: 36px;
  border-radius: 10px;
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
}

.junshi-mingcheng {
  font-size: 16px;
  font-weight: 700;
  color: var(--junshi-zhuse);
}

.junshi-xinxi-toubu {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.fanhui-anniu {
  align-self: flex-start;
  font-size: 14px;
  color: var(--wenben-ciuse);
  padding: 4px 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.xuanzhong-junshi {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--junshi-zhuse-touming);
  border: 1px solid var(--junshi-biankuang);
  border-radius: 16px;
}

.zhidao-buju {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qingqiu-anniu {
  width: 100%;
  padding: 14px;
  background: var(--junshi-zhuse);
  color: #ffffff;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.qingqiu-anniu:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.qingqiu-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zhidao-jieguo {
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

.cuowu-tishi {
  padding: 10px 14px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #e65100;
  text-align: center;
  margin-top: 8px;
}

.jilu-buju {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jiazai-zhuangtai,
.kong-zhuangtai {
  text-align: center;
  padding: 32px 16px;
  color: var(--wenben-ciuse);
  font-size: 14px;
}

.jilu-liebiao {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jilu-xiangmu {
  padding: 12px;
  background: var(--boli-beijing);
  border: 1px solid var(--boli-biankuang);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.jilu-xiangmu:hover {
  background: var(--boli-beijing-shen);
}

.jilu-zhaiyao {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.jilu-shijian {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.jilu-jiaose {
  font-size: 13px;
  font-weight: 600;
  color: var(--wenben-zhuse);
}

@media (max-width: 480px) {
  .junshi-mianban {
    max-width: 100%;
  }
}
</style>
