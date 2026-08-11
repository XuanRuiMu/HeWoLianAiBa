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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
import { 使用军师仓库, shiYouXiaoJiaoSeId } from '@/stores/军师'
import type { JunShiXinXi, JunShiJiLu, JunShiZhiDaoZhuangTaiXinXi } from '@/types'

type JunShiZhuangTaiLeiXing = 'wei_zhi_dao' | 'zhi_dao_zhong' | 'yi_wan_cheng'

const props = defineProps<{
  jiaoSeId: string
}>()

const emit = defineEmits<{
  guanBi: []
}>()

const router = useRouter()

// 跨导航唯一事实源：军师指导状态提升到独立 store，组件本地不再持有易失副本
const 军师仓库 = 使用军师仓库()

const junShiLieBiaoXuanXiang = ref<JunShiXinXi[]>([])
const jiLuLieBiao = ref<JunShiJiLu[]>([])
// 透传 store 的持久状态，保持模板与派生逻辑无需改动来源
const dangQianZhuangTai = computed(() => 军师仓库.zhuangTai)
const youLiaoTianJiLu = computed(() => 军师仓库.youLiaoTianJiLu)
const qingQiuZhongJunShiId = ref<string | null>(null)
const zhanKaiJunShiId = ref<string | null>(null)
const cuoWuTiShiMap = ref<Record<string, string>>({})
const jiaZaiZhong = ref(true)
const xianShiZhiDaoJiLu = ref(false)

// 单一派生状态：当前聊天内容是否已被指导过（非指导中时）。
// 提示显隐与「开始指导」按钮可用性均由它统一控制，避免点击后再检查再弹提示的重复路径。
// 判定依据为 store 的持久状态，离开再回来恒与后端真值一致。
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

// 由 store 的持久状态派生卡片状态，颜色（黄/灰）与后端真值始终一致。
// 若 store 持有的会话与当前组件会话不一致（切换竞态窗口），保守视为未指导，待 seed 完成。
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

async function chaXunBingGengXinZhuangTai(): Promise<void> {
  if (!props.jiaoSeId) return
  try {
    const {
      zhuangTai,
      keZaiCiZhiDao: keZaiCi,
      youLiaoTianJiLu: ylt,
    } = await huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
    // 写入 store（而非本地易失 ref），组件卸载不再丢失
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
  if (!props.jiaoSeId) return
  // 单一派生状态控制：当前聊天内容已指导过时禁止再次请求，避免点击后再检查再弹提示
  if (yiZhiDaoXiangTongNeiRong.value) return
  qingQiuZhongJunShiId.value = junShi.id
  cuoWuTiShiMap.value = { ...cuoWuTiShiMap.value, [junShi.id]: '' }
  // 点击即乐观置为「指导中」黄色卡片（与后端真值一致），并启动轮询自校正，
  // 使「刚点击」与「离开再进入仍在指导中」渲染同一套黄色样式，不再出现灰底
  军师仓库.sheZhiZhiDaoZhong(props.jiaoSeId, junShi.id)
  qiDongLunXun()
  try {
    const jieGuo = await qingQiuJunShiZhiDao(props.jiaoSeId, junShi.id)
    // 写入 store：完成态持久化，离开再回来显示灰度与结果一致
    军师仓库.sheZhiYiWanCheng(props.jiaoSeId, junShi.id, jieGuo)
    // 仅刷新 keZaiCiZhiDao（不覆盖已完成态），使「已指导过」提示显示
    const { keZaiCiZhiDao: kzc } = await huoQuJunShiZhiDaoZhuangTai(props.jiaoSeId)
    军师仓库.gengXinKeZaiCiZhiDao(kzc)
    await shuaXinJiLuLieBiao()
    zhanKaiJunShiId.value = junShi.id
    qingQiuZhongJunShiId.value = null
    tingZhiLunXun()
  } catch (e: unknown) {
    const cuoWuMa = 是业务错误(e) ? e.cuo_wu_ma : ''
    if (cuoWuMa === 'JUN_SHI_ZAI_ZHI_DAO_ZHONG') {
      // 已在指导中：点击时已乐观置为「指导中」黄色卡片并启动轮询自校正，无需重复处理
      return
    }
    qingQiuZhongJunShiId.value = null
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

onMounted(() => {
  void chuShiHua()
})

// 切换会话后重新查询历史指导状态，使提示与按钮可用性随新会话正确流转
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
  // P0 输入验证：非法角色 ID 直接中止，避免污染跨导航状态
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
    // 用后端持久真值 seed store（跨导航唯一事实源），不再写本地易失 ref
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
  // 仅停止轮询；store 状态跨导航持久保留，离开再回来黄底恒与后端真值一致
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
  background: color-mix(in srgb, var(--junshi-zhuse) 18%, transparent);
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
  background: var(--junshi-zhuse);
  color: #ffffff;
  opacity: 0.65;
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
  padding: 10px 14px;
  margin-bottom: 12px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #e65100;
  text-align: center;
}

.wu-liao-tian-tishi {
  padding: 10px 14px;
  margin-bottom: 12px;
  background: rgba(33, 150, 243, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: #1976d2;
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
