<template>
  <div class="junshi-zhezhao" @click.self="$emit('guanBi')">
    <div class="junshi-mianban">
      <div class="junshi-dingbu">
        <div class="biaoqian-zu">
          <button
            class="biaoqian-anniu"
            :class="{ huoyue: dangQianBiaoQian === 'zhidao' }"
            @click="dangQianBiaoQian = 'zhidao'"
          >
            军师指导
          </button>
          <button
            class="biaoqian-anniu"
            :class="{ huoyue: dangQianBiaoQian === 'jilu' }"
            @click="qieHuanDaoJiLu()"
          >
            指导记录
          </button>
        </div>
        <button class="guanbi-anniu" @click="$emit('guanBi')">✕</button>
      </div>

      <div class="junshi-neirong">
        <div v-if="dangQianBiaoQian === 'zhidao'" class="zhidao-buju">
          <div class="junshi-xuanze">
            <div
              class="junshi-xinxi"
              :class="{ huoyue: xuanZeZhanKai }"
              @click="xuanZeZhanKai = !xuanZeZhanKai"
            >
              <div class="junshi-touxiang">
                <img
                  :src="dangQianJunShi.touXiang"
                  :alt="dangQianJunShi.mingChen"
                  class="touxiang-tu"
                />
              </div>
              <div class="junshi-xiangqing">
                <span class="junshi-mingcheng">{{ dangQianJunShi.mingChen }}</span>
                <span class="junshi-fubiaoti">{{ dangQianJunShi.chengHao }}</span>
                <span v-if="dangQianJunShi.biaoQian" class="junshi-biaoqian">{{
                  dangQianJunShi.biaoQian
                }}</span>
              </div>
              <span class="xuanze-jiantou">{{ xuanZeZhanKai ? '▲' : '▼' }}</span>
            </div>
            <div v-if="xuanZeZhanKai" class="junshi-xuanze-liebiao">
              <div
                v-for="junShi in junShiLieBiaoXuanXiang"
                :key="junShi.id"
                class="junshi-xuanze-xiang"
                :class="{ dangQian: junShi.id === dangQianJunShi.id }"
                @click="xuanZeJunShi(junShi)"
              >
                <div class="junshi-touxiang xiao">
                  <img
                    :src="junShi.tou_xiang || '/advisors/军师玄锐暮头像.jpg'"
                    :alt="junShi.ming_chen || ''"
                    class="touxiang-tu"
                  />
                </div>
                <div class="junshi-xiangqing">
                  <span class="junshi-mingcheng">{{
                    junShi.ming_chen || junShi.jun_shi_ming_chen
                  }}</span>
                  <span class="junshi-fubiaoti">{{ junShi.cheng_hao || '' }}</span>
                </div>
                <span v-if="junShi.id === dangQianJunShi.id" class="yixuan-biaoji">✓</span>
              </div>
            </div>
          </div>

          <div v-if="haoGanDuShuJu" class="guanxi-zhanshi">
            <span class="guanxi-jieduan-biaoqian">{{
              GUAN_XI_JIE_DUAN_YING_SHE[haoGanDuShuJu.guan_xi_jie_duan] ||
              haoGanDuShuJu.guan_xi_jie_duan
            }}</span>
          </div>

          <div v-if="fuPanShuJu.length > 0" class="neixin-huodong-zhanshi">
            <div
              class="neixin-huodong-biaoti"
              @click="zhanKaiNeiXinHuoDong = !zhanKaiNeiXinHuoDong"
            >
              <span>AI内心活动 & 评分变化</span>
              <span class="zhanKai-tubiao">{{ zhanKaiNeiXinHuoDong ? '▼' : '▶' }}</span>
            </div>
            <div v-if="zhanKaiNeiXinHuoDong" class="neixin-huodong-liebiao">
              <div
                v-for="(tiaoMu, suoYin) in fuPanShuJu"
                :key="suoYin"
                class="neixin-huodong-tiaomu"
              >
                <div class="tiaoMu-lunCi">第{{ suoYin + 1 }}轮</div>
                <div class="tiaoMu-xinxi">
                  <div class="tiaoMu-hang">
                    <span class="tiaoMu-biaoqian">你说：</span>{{ tiaoMu.yong_hu_xiao_xi || '' }}
                  </div>
                  <div class="tiaoMu-hang">
                    <span class="tiaoMu-biaoqian">TA回：</span>{{ tiaoMu.ai_hui_fu || '' }}
                  </div>
                  <div class="tiaoMu-hang tiaoMu-neixin">
                    <span class="tiaoMu-biaoqian">内心：</span
                    >{{ tiaoMu.ai_xin_li_huo_dong || '无记录' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            class="qingqiu-anniu"
            :disabled="qingQiuZhong || !jiaoSeId"
            @click="zhiXingQingQiu"
          >
            {{ qingQiuZhong ? '请求中...' : '请求指导' }}
          </button>

          <div v-if="cuoWuTiShi" class="cuowu-tishi">
            {{ cuoWuTiShi }}
          </div>

          <div v-if="zhiDaoJieGuo" class="zhidao-jieguo">
            <h3 class="jieguo-biaoti">指导建议</h3>
            <p class="jieguo-neirong">
              {{ zhiDaoJieGuo }}
            </p>
          </div>
        </div>

        <div v-else class="jilu-buju">
          <div v-if="jiaZaiJiLuZhong" class="jiazai-zhuangtai">加载中...</div>
          <div v-else-if="jiLuLieBiao.length === 0" class="kong-zhuangtai">暂无指导记录</div>
          <div v-else class="jilu-liebiao">
            <div
              v-for="jiLu in jiLuLieBiao"
              :key="jiLu.shi_jian"
              class="jilu-xiangmu"
              @click="jinRuJiLuXiangQing(jiLu)"
            >
              <div class="jilu-zhaiyao">
                <span class="jilu-shijian">{{ jiLu.shi_jian }}</span>
                <span class="jilu-jiaose">{{ jiLu.jiao_se_ming_zi }}</span>
              </div>
              <div v-if="jiLu.dui_hua_zhai_yao" class="jilu-zhaiyao-wenben">
                {{ jiLu.dui_hua_zhai_yao }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { qingQiuJunShiZhiDao, huoQuJunShiJiLu, huoQuJunShiLieBiao } from '@/api/聊天'
import { huoQuQiuZhuZhuangTai } from '@/api/军师'
import { 是业务错误 } from '@/api/请求'
import type { 军师建议, 军师记录, 复盘条目 } from '@/types'

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
const jiLuLieBiao = ref<军师记录[]>([])
const jiaZaiJiLuZhong = ref(false)
const junShiLieBiaoXuanXiang = ref<军师建议[]>([])
const xuanZeZhanKai = ref(false)

const MO_REN_JUN_SHI = {
  id: 'xuanRuiMu',
  mingChen: '玄锐暮',
  chengHao: '拥有大量旁观经验的指导老师',
  biaoQian: '损友军师',
  touXiang: '/advisors/军师玄锐暮头像.jpg',
}

const dangQianJunShi = ref({ ...MO_REN_JUN_SHI })
const zhanKaiNeiXinHuoDong = ref(false)
const haoGanDuShuJu = ref<{
  zong_fen: number
  guan_xi_jie_duan: string
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
} | null>(null)
const GUAN_XI_JIE_DUAN_YING_SHE: Record<string, string> = {
  lengDan: '陌生人',
  shuYuan: '陌生人',
  renShi: '认识的人',
  shuXi: '认识的人',
  pengYou: '朋友',
  haoYou: '朋友',
  aiMei: '暧昧',
  xinDong: '暧昧',
  reLian: '恋人',
  shenAi: '恋人',
  moShengRen: '陌生人',
  renShiDeRen: '认识的人',
  lianRen: '恋人',
}

const fuPanShuJu = ref<复盘条目[]>([])
const router = useRouter()

onMounted(async () => {
  try {
    const lieBiao = await huoQuJunShiLieBiao()
    junShiLieBiaoXuanXiang.value = lieBiao
    const xuanRuiMu = lieBiao.find((j: 军师建议) => j.id === 'xuanRuiMu')
    if (xuanRuiMu) {
      dangQianJunShi.value = {
        id: xuanRuiMu.id || 'xuanRuiMu',
        mingChen: xuanRuiMu.ming_chen || MO_REN_JUN_SHI.mingChen,
        chengHao: xuanRuiMu.cheng_hao || MO_REN_JUN_SHI.chengHao,
        biaoQian: xuanRuiMu.ming_chen || MO_REN_JUN_SHI.biaoQian,
        touXiang: xuanRuiMu.tou_xiang || MO_REN_JUN_SHI.touXiang,
      }
    }
  } catch (e) {
    console.warn('加载军师列表失败', e)
  }
  jiaZaiHaoGanDu()
})

function xuanZeJunShi(junShi: 军师建议) {
  dangQianJunShi.value = {
    id: junShi.id || 'xuanRuiMu',
    mingChen: junShi.ming_chen || junShi.jun_shi_ming_chen || '玄锐暮',
    chengHao: junShi.cheng_hao || '',
    biaoQian: junShi.ming_chen || '',
    touXiang: junShi.tou_xiang || '/advisors/军师玄锐暮头像.jpg',
  }
  xuanZeZhanKai.value = false
}

async function jiaZaiHaoGanDu() {
  if (!props.jiaoSeId) return
  try {
    const zhuangTai = await huoQuQiuZhuZhuangTai(props.jiaoSeId)
    haoGanDuShuJu.value = zhuangTai.hao_gan_du
    fuPanShuJu.value = zhuangTai.fu_pan_shu_ju || []
  } catch (e) {
    console.warn('加载好感度失败', e)
  }
}

function jinRuJiLuXiangQing(jiLu: 军师记录) {
  router.push(`/junshi-jilu/${props.jiaoSeId}/${encodeURIComponent(jiLu.shi_jian)}`)
}

async function zhiXingQingQiu() {
  qingQiuZhong.value = true
  zhiDaoJieGuo.value = null
  cuoWuTiShi.value = ''
  try {
    const jieGuo = await qingQiuJunShiZhiDao(props.jiaoSeId)
    zhiDaoJieGuo.value = jieGuo.jian_yi
    jiaZaiHaoGanDu()
  } catch (e: unknown) {
    const cuoWuMa = 是业务错误(e) ? e.cuo_wu_ma : ''
    if (cuoWuMa === 'JUN_SHI_CHONG_FU') {
      cuoWuTiShi.value = '已指导过相同聊天内容，请先发送新消息'
    } else if (cuoWuMa === 'WU_LIAO_TIAN_JI_LU') {
      cuoWuTiShi.value = '暂无聊天记录，无法请求军师指导'
    } else {
      cuoWuTiShi.value = e instanceof Error ? e.message : '请求失败，请稍后再试'
    }
    zhiDaoJieGuo.value = null
  } finally {
    qingQiuZhong.value = false
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
}

.zhidao-buju {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.junshi-xuanze {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.junshi-xinxi {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--junshi-zhuse-touming);
  border-radius: 16px;
  border: 1px solid var(--junshi-biankuang);
  cursor: pointer;
  transition: all 0.2s ease;
}

.junshi-xinxi:hover {
  background: var(--junshi-zhuse-touming);
  border-color: var(--junshi-zhuse);
}

.junshi-xinxi.huoyue {
  border-radius: 16px 16px 4px 4px;
}

.xuanze-jiantou {
  margin-left: auto;
  font-size: 10px;
  color: var(--wenben-ciuse);
  flex-shrink: 0;
}

.junshi-xuanze-liebiao {
  border: 1px solid var(--junshi-biankuang);
  border-top: none;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

.junshi-xuanze-xiang {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.junshi-xuanze-xiang:hover {
  background: var(--junshi-zhuse-touming);
}

.junshi-xuanze-xiang.dangQian {
  background: var(--junshi-zhuse-touming);
}

.yixuan-biaoji {
  margin-left: auto;
  color: var(--junshi-zhuse);
  font-weight: 700;
  font-size: 14px;
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

.junshi-fubiaoti {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.junshi-biaoqian {
  font-size: 11px;
  color: var(--junshi-zhuse);
  background: var(--junshi-zhuse-touming);
  padding: 2px 8px;
  border-radius: 6px;
  margin-top: 2px;
  display: inline-block;
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

.guanxi-zhanshi {
  padding: 10px 14px;
  background: var(--boli-beijing);
  border: 1px solid var(--boli-biankuang);
  border-radius: 12px;
}

.guanxi-jieduan-biaoqian {
  font-size: 13px;
  font-weight: 600;
  color: var(--junshi-zhuse);
  background: var(--junshi-zhuse-touming);
  padding: 4px 12px;
  border-radius: 8px;
}

.neixin-huodong-zhanshi {
  background: var(--boli-beijing);
  border: 1px solid var(--boli-biankuang);
  border-radius: 12px;
  overflow: hidden;
}

.neixin-huodong-biaoti {
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--junshi-zhuse);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.zhanKai-tubiao {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.neixin-huodong-liebiao {
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.neixin-huodong-tiaomu {
  padding: 10px;
  background: var(--beijing-ciuse);
  border-radius: 8px;
}

.tiaoMu-lunCi {
  font-size: 11px;
  font-weight: 700;
  color: var(--junshi-zhuse);
  margin-bottom: 6px;
}

.tiaoMu-xinxi {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tiaoMu-hang {
  font-size: 11px;
  color: var(--wenben-ciuse);
  line-height: 1.5;
  word-break: break-word;
}

.tiaoMu-biaoqian {
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.tiaoMu-neixin {
  color: var(--junshi-zhuse);
  font-style: italic;
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

.jilu-zhaiyao-wenben {
  font-size: 12px;
  color: var(--wenben-ciuse);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .junshi-mianban {
    max-width: 100%;
  }
}
</style>
