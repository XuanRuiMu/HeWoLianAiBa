<template>
  <div class="zhanji-yemian">
    <main class="zhanji-liebiao">
      <div v-if="jiaZaiZhong" class="jiazai-zhuangtai">
        {{ huoQuFanYi('zhanJi', 'jiaZaiZhong') }}
      </div>
      <div v-else-if="dangAnLieBiao.length === 0" class="kong-zhuangtai">
        {{ huoQuFanYi('zhanJi', 'zanWuZhanJi') }}
      </div>
      <TransitionGroup v-else name="liebiao-guodu" tag="div" class="zhanji-liebiao-neirong">
        <div v-for="dangAn in dangAnLieBiao" :key="dangAn.id" class="zhanji-kapian">
          <div class="zhanji-zuo">
            <div class="jiaose-touxiang">
              {{
                dangAn.shi_fou_zha_xing
                  ? '😈'
                  : dangAn.jie_guo_lei_xing_yuan === 'sheng_li_ai_qing'
                    ? '💕'
                    : '👤'
              }}
            </div>
            <div class="zhanji-xinxi">
              <div class="jiaose-mingcheng">
                {{ dangAn.jiao_se_ming_zi }}
              </div>
              <div class="zhanji-biaoqian-zu">
                <span v-if="dangAn.mbti_lei_xing" class="mbti-biaoqian">{{
                  dangAn.mbti_lei_xing
                }}</span>
                <span
                  class="zhuangtai-biaoqian"
                  :class="zhuangTaiYangShi(dangAn.jie_guo_lei_xing_yuan)"
                >
                  {{ zhuangTaiWenBen(dangAn.jie_guo_lei_xing_yuan) }}
                </span>
              </div>
              <div class="liaotian-tianshu">
                {{
                  huoQuFanYi('zhanJi', 'liaoTianTianShu').replace(
                    '{天}',
                    String(dangAn.liao_tian_tian_shu),
                  )
                }}
              </div>
            </div>
          </div>
          <div class="zhanji-you">
            <button
              v-if="dangAn.jie_guo_lei_xing_yuan === 'jinxing_zhong'"
              class="caozuo-anniu jixu"
              @click.stop="jiXuLiaoTian(dangAn)"
            >
              {{ huoQuFanYi('zhanJi', 'jiXu') }}
            </button>
            <button
              v-if="dangAn.jie_guo_lei_xing_yuan !== 'jinxing_zhong'"
              class="caozuo-anniu fupan"
              @click.stop="daKaiFuPan(dangAn)"
            >
              {{ huoQuFanYi('zhanJi', 'fuPan') }}
            </button>
          </div>
        </div>
      </TransitionGroup>
    </main>

    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div v-if="fuPanZhanKai" class="fupan-zhezhao" @click.self="fuPanZhanKai = false">
          <div class="fupan-tanchuang">
            <div class="fupan-dingbu">
              <h2 class="fupan-biaoti2">{{ huoQuFanYi('zhanJi', 'aiFuPanFenXi') }}</h2>
              <button class="guanbi-anniu" @click="fuPanZhanKai = false">
                {{ huoQuFanYi('zhanJi', 'guanBi') }}
              </button>
            </div>
            <div class="fupan-neirong">
              <div v-if="fuPanJiaZaiZhong" class="jiazai-zhuangtai">
                {{ huoQuFanYi('zhanJi', 'fuPanShengChengZhong') }}
              </div>
              <template v-else>
                <div v-if="!fuPanNeiRong && fuPanShiJianXian.length === 0" class="kong-zhuangtai">
                  {{ huoQuFanYi('zhanJi', 'fuPanWeiShengCheng') }}
                </div>
                <div v-if="fuPanShiJianXian.length > 0" class="shijianxian-quyu">
                  <h3 class="shijianxian-biaoti">
                    {{ huoQuFanYi('zhanJi', 'guanJianShiJianShiJianXian') }}
                  </h3>
                  <div class="shijianxian-liebiao">
                    <div
                      v-for="(tiaoMu, suoYin) in fuPanShiJianXian"
                      :key="suoYin"
                      class="shijianxian-tiaomu"
                    >
                      <div class="shijianxian-shuxian-quyu">
                        <div class="shijianxian-yuan" />
                        <div
                          v-if="suoYin < fuPanShiJianXian.length - 1"
                          class="shijianxian-shuxian"
                        />
                      </div>
                      <div class="shijianxian-neirong">
                        <div class="shijianxian-shijian">
                          {{ geShiHuaShiJian(tiaoMu.shi_jian) }}
                        </div>
                        <div v-if="tiaoMu.shi_jian_miao_shu" class="shijianxian-miaoshu">
                          {{ tiaoMu.shi_jian_miao_shu }}
                        </div>
                        <div v-if="tiaoMu.yong_hu_xiao_xi" class="shijianxian-duihua">
                          <span class="shijianxian-jiaose yonghu">{{
                            huoQuFanYi('zhanJi', 'ni')
                          }}</span>
                          <span class="shijianxian-xiaoxi">{{ tiaoMu.yong_hu_xiao_xi }}</span>
                        </div>
                        <div v-if="tiaoMu.ai_hui_fu" class="shijianxian-duihua">
                          <span class="shijianxian-jiaose ai">{{
                            huoQuFanYi('zhanJi', 'ta')
                          }}</span>
                          <span class="shijianxian-xiaoxi">{{ tiaoMu.ai_hui_fu }}</span>
                        </div>
                        <div v-if="tiaoMu.ai_xin_li_huo_dong" class="shijianxian-xinli">
                          <span class="xinli-biaoqian"
                            >💭 {{ huoQuFanYi('zhanJi', 'neiXin') }}</span
                          >
                          <span class="xinli-neirong">{{ tiaoMu.ai_xin_li_huo_dong }}</span>
                        </div>
                        <div v-if="tiaoMu.hao_gan_du_bian_hua" class="shijianxian-haogandu">
                          <span
                            v-for="bianHua in guoLvBianHua(tiaoMu.hao_gan_du_bian_hua)"
                            :key="bianHua.key"
                            class="haogandu-biaoqian"
                            :class="
                              bianHua.zhi > 0
                                ? 'zhengmian'
                                : bianHua.zhi < 0
                                  ? 'fumian'
                                  : 'zhongxing'
                            "
                            >{{ bianHua.mingCheng }}{{ bianHua.zhi >= 0 ? '+' : ''
                            }}{{ bianHua.zhi }}</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="fuPanNeiRong" class="fupan-wenben">
                  {{ fuPanNeiRong }}
                </div>
                <div v-if="junShiZhiDaoJiLu.length > 0" class="junshi-zhidao-quyu">
                  <h3 class="junshi-zhidao-biaoti">
                    🎯 {{ huoQuFanYi('zhanJi', 'junShiZhiDaoJiLu') }}
                  </h3>
                  <div class="junshi-zhidao-liebiao">
                    <div
                      v-for="(jiLu, suoYin) in junShiZhiDaoJiLu"
                      :key="suoYin"
                      class="junshi-zhidao-xiangmu"
                    >
                      <div class="junshi-zhidao-tou">
                        <span class="junshi-zhidao-xuhao">{{
                          huoQuFanYi('zhanJi', 'diNCi').replace('{次}', String(suoYin + 1))
                        }}</span>
                        <span v-if="jiLu.jun_shi_ming_chen" class="junshi-zhidao-mingchen">{{
                          jiLu.jun_shi_ming_chen
                        }}</span>
                        <span class="junshi-zhidao-shijian">{{
                          geShiHuaShiJian(jiLu.shi_jian)
                        }}</span>
                      </div>
                      <div v-if="jiLu.dui_hua_zhai_yao" class="junshi-zhidao-zhaiyao">
                        {{ jiLu.dui_hua_zhai_yao }}
                      </div>
                      <div v-if="jiLu.hao_gan_du_kuai_zhao" class="junshi-zhidao-haogandu">
                        <span class="junshi-haogandu-jieduan">{{
                          jiLu.hao_gan_du_kuai_zhao.guanXiJieDuanMingCheng
                        }}</span>
                      </div>
                      <div class="junshi-zhidao-jianyi">
                        {{ jiLu.jian_yi }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div class="pinggu-quyu">
              <div class="pinggu-dingbu">
                <h3 class="pinggu-biaoti">{{ huoQuFanYi('zhanJi', 'liaoTianShuiPingPingGu') }}</h3>
                <button
                  class="caozuo-anniu pinggu"
                  :disabled="pingGuJiaZaiZhong"
                  @click="zhiXingPingGuCaoZuo"
                >
                  <span v-if="pingGuJiaZaiZhong">{{
                    huoQuFanYi('zhanJi', 'pingGuShengChengZhong')
                  }}</span>
                  <span v-else>{{
                    pingGuJieGuo
                      ? huoQuFanYi('zhanJi', 'chongXinPingGu')
                      : huoQuFanYi('zhanJi', 'pingGuLiaoTianShuiPing')
                  }}</span>
                </button>
              </div>

              <div v-if="pingGuJiaZaiZhong" class="jiazai-zhuangtai">
                {{ huoQuFanYi('zhanJi', 'pingGuShengChengZhong') }}
              </div>

              <div v-else-if="pingGuJieGuo" class="pinggu-neirong">
                <div class="weidu-liebiao">
                  <div v-for="weiDu in weiDuLieBiao" :key="weiDu.key" class="weidu-xiangmu">
                    <div class="weidu-dingbu">
                      <span class="weidu-mingcheng">{{ weiDu.mingCheng }}</span>
                      <span class="weidu-fenshu">{{ weiDu.fen }}/10</span>
                    </div>
                    <div class="weidu-jindu">
                      <div class="jindu-beijing">
                        <div
                          class="jindu-tiaoxing pinggu-jindu"
                          :style="{ width: `${weiDu.fen * 10}%` }"
                        />
                      </div>
                    </div>
                    <div class="weidu-shuoming">
                      {{ weiDu.shuoMing }}
                    </div>
                  </div>
                </div>

                <div class="pinggu-zongti">
                  <h4 class="zongti-biaoti">{{ huoQuFanYi('zhanJi', 'zongTiPingJia') }}</h4>
                  <p class="zongti-wenben">
                    {{ pingGuJieGuo['总体评价'] }}
                  </p>
                </div>

                <div
                  v-if="pingGuJieGuo['改进建议'] && pingGuJieGuo['改进建议'].length > 0"
                  class="pinggu-jianyi"
                >
                  <h4 class="jianyi-biaoti">{{ huoQuFanYi('zhanJi', 'gaiJinJianYi') }}</h4>
                  <ul class="jianyi-liebiao">
                    <li
                      v-for="(jianYi, suoYin) in pingGuJieGuo['改进建议']"
                      :key="suoYin"
                      class="jianyi-xiangmu"
                    >
                      {{ jianYi }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuDangAnLieBiao, huoQuFuPan, zhiXingPingGu, huoQuPingGuLiShi } from '@/api/聊天'
import type { 复盘时间线条目, 军师指导记录项, 关键事件项 } from '@/api/聊天'
import type { 档案详情, 评估结果, WeiDuPingFen } from '@/types'
import { huoQuFanYi } from '@/config/translations'

const router = useRouter()
const dangAnLieBiao = ref<档案详情[]>([])
const jiaZaiZhong = ref(true)
const dangQianDangAn = ref<档案详情 | null>(null)
const fuPanZhanKai = ref(false)
const fuPanNeiRong = ref<string | null>(null)
const fuPanShiJianXian = ref<复盘时间线条目[]>([])
const fuPanJiaZaiZhong = ref(false)
const junShiZhiDaoJiLu = ref<军师指导记录项[]>([])
const guanJianShiJian = ref<关键事件项[]>([])
const pingGuJieGuo = ref<评估结果 | null>(null)
const pingGuJiaZaiZhong = ref(false)
const fuPanQingQiuId = ref(0)

const WEI_DU_LIE_BIAO = [
  { key: 'huaTiYinDao', mingCheng: '话题引导' },
  { key: 'qingGanGongMing', mingCheng: '情感共鸣' },
  { key: 'youMoGan', mingCheng: '幽默感' },
  { key: 'tiTieDu', mingCheng: '体贴度' },
  { key: 'jieZouBaKong', mingCheng: '节奏把控' },
]

const HAO_GAN_DU_WEI_DU: Record<string, string> = {
  xin_ren_bian_hua: '信任',
  qin_mi_bian_hua: '亲密',
  qu_wei_bian_hua: '趣味',
  guan_huai_bian_hua: '关怀',
  zong_fen_bian_hua: '总分',
}

const weiDuLieBiao = computed(() => {
  if (!pingGuJieGuo.value) return []
  const jieGuo = pingGuJieGuo.value
  return WEI_DU_LIE_BIAO.map((x) => {
    const pingFen = jieGuo[x.mingCheng as keyof 评估结果] as WeiDuPingFen
    return {
      key: x.key,
      mingCheng: x.mingCheng,
      fen: pingFen.fen,
      shuoMing: pingFen.shuo_ming,
    }
  })
})

function geShiHuaShiJian(shiJian: string): string {
  if (!shiJian) return ''
  try {
    const date = new Date(shiJian)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return shiJian
  }
}

function guoLvBianHua(
  bianHua: Record<string, unknown>,
): { key: string; mingCheng: string; zhi: number }[] {
  return Object.entries(HAO_GAN_DU_WEI_DU)
    .map(([key, mingCheng]) => ({ key, mingCheng, zhi: Number(bianHua[key]) || 0 }))
    .filter((x) => x.zhi !== 0)
}

function zhuangTaiWenBen(jieGuoLeiXing: string): string {
  if (jieGuoLeiXing === 'jinxing_zhong') return huoQuFanYi('zhanJi', 'zhuangTaiJinXingZhong')
  if (jieGuoLeiXing.startsWith('sheng_li')) return huoQuFanYi('zhanJi', 'zhuangTaiShengLi')
  return huoQuFanYi('zhanJi', 'zhuangTaiShiBai')
}

function zhuangTaiYangShi(jieGuoLeiXing: string): string {
  if (jieGuoLeiXing === 'jinxing_zhong') return 'jinxingzhong'
  if (jieGuoLeiXing.startsWith('sheng_li')) return 'shengli'
  return 'shibai'
}

async function jiaZaiShuJu() {
  jiaZaiZhong.value = true
  try {
    dangAnLieBiao.value = await huoQuDangAnLieBiao()
  } catch {
    dangAnLieBiao.value = []
  } finally {
    jiaZaiZhong.value = false
  }
}

async function zhiXingPingGuCaoZuo() {
  if (!dangQianDangAn.value || pingGuJiaZaiZhong.value) return
  pingGuJiaZaiZhong.value = true
  try {
    const jieGuo = await zhiXingPingGu(dangQianDangAn.value.jiao_se_id)
    pingGuJieGuo.value = jieGuo
  } catch {
    pingGuJieGuo.value = null
  } finally {
    pingGuJiaZaiZhong.value = false
  }
}

function jiXuLiaoTian(dangAn: 档案详情) {
  router.push(`/chat/${dangAn.jiao_se_id}`)
}

async function daKaiFuPan(dangAn: 档案详情) {
  const benCiId = ++fuPanQingQiuId.value
  dangQianDangAn.value = dangAn
  fuPanZhanKai.value = true
  fuPanJiaZaiZhong.value = true
  fuPanNeiRong.value = null
  fuPanShiJianXian.value = []
  junShiZhiDaoJiLu.value = []
  guanJianShiJian.value = []
  pingGuJieGuo.value = null
  try {
    let fuPanShuJu = await huoQuFuPan(dangAn.id)
    if (!fuPanShuJu.jia_zai_zhong) {
      fuPanNeiRong.value = fuPanShuJu.fu_pan_nei_rong
      fuPanShiJianXian.value = fuPanShuJu.fu_pan_shi_jian_xian || []
      junShiZhiDaoJiLu.value = fuPanShuJu.jun_shi_zhi_dao_ji_lu || []
      fuPanJiaZaiZhong.value = false
    } else {
      let changShiCiShu = 0
      while (
        !fuPanShuJu.fu_pan_nei_rong &&
        changShiCiShu < 20 &&
        fuPanZhanKai.value &&
        fuPanQingQiuId.value === benCiId
      ) {
        await new Promise((jieJue) => setTimeout(jieJue, 3000))
        changShiCiShu++
        if (!fuPanZhanKai.value || fuPanQingQiuId.value !== benCiId) return
        try {
          fuPanShuJu = await huoQuFuPan(dangAn.id)
        } catch (e) {
          console.warn('轮询复盘数据失败', e)
        }
        if (fuPanShuJu.fu_pan_nei_rong || !fuPanShuJu.jia_zai_zhong) {
          fuPanNeiRong.value = fuPanShuJu.fu_pan_nei_rong
          fuPanShiJianXian.value = fuPanShuJu.fu_pan_shi_jian_xian || []
          junShiZhiDaoJiLu.value = fuPanShuJu.jun_shi_zhi_dao_ji_lu || []
          fuPanJiaZaiZhong.value = false
          break
        }
      }
    }
  } finally {
    if (fuPanQingQiuId.value === benCiId) {
      fuPanJiaZaiZhong.value = false
    }
  }
  if (fuPanQingQiuId.value !== benCiId) return
  try {
    const liShi = await huoQuPingGuLiShi(dangAn.jiao_se_id)
    pingGuJieGuo.value = liShi
  } catch (e) {
    console.warn('加载评估历史失败', e)
  }
}

onMounted(() => {
  jiaZaiShuJu()
})
</script>

<style scoped>
.zhanji-yemian {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: linear-gradient(
    135deg,
    var(--beijing-jianbian-1),
    var(--beijing-jianbian-2),
    var(--beijing-jianbian-3),
    var(--beijing-jianbian-4)
  );
  background-size: 300% 300%;
  animation: jianbian-liudong 12s ease infinite;
}

.zhanji-liebiao {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.jiazai-zhuangtai,
.kong-zhuangtai {
  text-align: center;
  padding: 48px 16px;
  color: var(--wenben-ciuse);
  font-size: 14px;
}

.zhanji-kapian {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 16px;
  transition: all 0.2s ease;
}

.zhanji-zuo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.jiaose-touxiang {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--boli-beijing-shen);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.zhanji-xinxi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.jiaose-mingcheng {
  font-size: 15px;
  font-weight: 600;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zhanji-biaoqian-zu {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mbti-biaoqian {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--biao-qian-xinxi-beijing);
  color: var(--biao-qian-xinxi-wenben);
}

.zhuangtai-biaoqian {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.zhuangtai-biaoqian.jinxingzhong {
  background: var(--biao-qian-chenggong-beijing);
  color: var(--biao-qian-chenggong-wenben);
}

.zhuangtai-biaoqian.shengli {
  background: var(--biao-qian-jinggao-beijing);
  color: var(--biao-qian-jinggao-wenben);
}

.zhuangtai-biaoqian.shibai {
  background: var(--biao-qian-shibai-beijing);
  color: var(--biao-qian-shibai-wenben);
}

.zhuangtai-biaoqian.taotuo {
  background: var(--yanse-taotuo-beijing);
  color: var(--yanse-chenggong);
}

.zhuangtai-biaoqian.huShanShengLi {
  background: var(--yanse-huashan-beijing);
  color: var(--yanse-huashan);
}

.zhuangtai-biaoqian.biaobai {
  background: var(--yanse-biaobai-beijing);
  color: var(--yanse-biaobai);
}

.jindu-beijing {
  flex: 1;
  height: 4px;
  background: var(--biankuang-qianse);
  border-radius: 2px;
  overflow: hidden;
}

.jindu-tiaoxing {
  height: 100%;
  background: var(--jianbian-jindu);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.jindu-shuzhi {
  font-size: 11px;
  color: var(--wenben-ciuse);
  white-space: nowrap;
}

.liaotian-tianshu {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.zhanji-you {
  flex-shrink: 0;
  margin-left: 12px;
}

.caozuo-anniu {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.caozuo-anniu.jixu {
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: #ffffff;
}

.caozuo-anniu.jixu:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 140, 166, 0.3);
}

.caozuo-anniu.chakan {
  background: var(--boli-beijing-shen);
  color: var(--wenben-zhuse);
  border: 1px solid var(--boli-biankuang);
}

.caozuo-anniu.chakan:hover {
  background: var(--boli-beijing-shen);
  transform: translateY(-1px);
}

.guanbi-anniu {
  font-size: 18px;
  color: var(--wenben-ciuse);
  padding: 4px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.guanbi-anniu:hover {
  background: var(--caidan-hover);
}

.zhezhao-xianshi-enter-active {
  transition: opacity 0.25s ease;
}

.zhezhao-xianshi-leave-active {
  transition: opacity 0.15s ease;
}

.zhezhao-xianshi-enter-from,
.zhezhao-xianshi-leave-to {
  opacity: 0;
}

.zhanji-liebiao-neirong {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.liebiao-guodu-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.liebiao-guodu-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.liebiao-guodu-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.liebiao-guodu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.liebiao-guodu-move {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes jianbian-liudong {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.caozuo-anniu.fupan {
  background: linear-gradient(135deg, var(--yanse-zhanji), var(--yanse-zhanji-qian));
  color: #ffffff;
}

.caozuo-anniu.fupan:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.fupan-zhezhao {
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

.fupan-tanchuang {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  background: var(--beijing-kaopian);
  border-radius: 20px;
  box-shadow: var(--chuangkou-yinying);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fupan-dingbu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--biankuang-yanse);
  flex-shrink: 0;
}

.fupan-biaoti2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--wenben-zhuse);
}

.fupan-neirong {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.fupan-wenben {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.shijianxian-quyu {
  margin-bottom: 20px;
}

.shijianxian-biaoti {
  font-size: 15px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin-bottom: 16px;
}

.shijianxian-liebiao {
  display: flex;
  flex-direction: column;
}

.shijianxian-tiaomu {
  display: flex;
  gap: 12px;
  min-height: 60px;
}

.shijianxian-shuxian-quyu {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}

.shijianxian-yuan {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--yanse-zhanji), var(--yanse-zhanji-qian));
  flex-shrink: 0;
  margin-top: 4px;
}

.shijianxian-shuxian {
  width: 2px;
  flex: 1;
  background: var(--yanse-zhanji-shuxian);
  margin: 2px 0;
}

.shijianxian-neirong {
  flex: 1;
  padding-bottom: 16px;
  min-width: 0;
}

.shijianxian-shijian {
  font-size: 11px;
  font-weight: 600;
  color: var(--yanse-zhanji-qian);
  margin-bottom: 2px;
}

.shijianxian-miaoshu {
  font-size: 13px;
  font-weight: 600;
  color: var(--wenben-zhuse);
  margin-bottom: 6px;
}

.shijianxian-duihua {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 4px;
}

.shijianxian-jiaose {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 1px;
}

.shijianxian-jiaose.yonghu {
  background: rgba(107, 140, 166, 0.15);
  color: var(--nuanhui-lan);
}

.shijianxian-jiaose.ai {
  background: var(--yanse-zhanji-beijing);
  color: var(--yanse-zhanji);
}

.shijianxian-xiaoxi {
  font-size: 13px;
  color: var(--wenben-zhuse);
  line-height: 1.4;
  word-break: break-word;
}

.shijianxian-xinli {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
}

.xinli-biaoqian {
  font-size: 11px;
  color: var(--yanse-xinli);
  flex-shrink: 0;
}

.xinli-neirong {
  font-size: 12px;
  color: var(--wenben-ciuse);
  line-height: 1.4;
  font-style: italic;
}

.shijianxian-haogandu {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.haogandu-biaoqian {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}

.haogandu-biaoqian.zhengmian {
  background: var(--yanse-taotuo-beijing);
  color: var(--yanse-chenggong);
}

.haogandu-biaoqian.fumian {
  background: var(--yanse-huashan-beijing);
  color: var(--yanse-fumian);
}

.haogandu-biaoqian.zhongxing {
  background: var(--yanse-zhongxing-beijing);
  color: var(--yanse-zhongxing);
}

.pinggu-quyu {
  border-top: 1px solid var(--biankuang-yanse);
  padding: 20px 24px;
}

.pinggu-dingbu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.pinggu-biaoti {
  font-size: 16px;
  font-weight: 700;
  color: var(--wenben-zhuse);
}

.caozuo-anniu.pinggu {
  background: linear-gradient(135deg, var(--yanse-chenggong), var(--yanse-chenggong-qian));
  color: #ffffff;
  padding: 6px 14px;
  font-size: 12px;
}

.caozuo-anniu.pinggu:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.3);
}

.caozuo-anniu.pinggu:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pinggu-neirong {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.weidu-liebiao {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.weidu-xiangmu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weidu-dingbu {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.weidu-mingcheng {
  font-size: 13px;
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.weidu-fenshu {
  font-size: 13px;
  font-weight: 700;
  color: var(--nuanhui-lan);
}

.weidu-jindu {
  margin: 2px 0;
}

.pinggu-jindu {
  background: linear-gradient(90deg, var(--yanse-chenggong), var(--yanse-chenggong-qian));
  border-radius: 2px;
}

.weidu-shuoming {
  font-size: 12px;
  color: var(--wenben-ciuse);
  line-height: 1.4;
}

.pinggu-zongti {
  border-top: 1px solid var(--biankuang-yanse);
  padding-top: 16px;
}

.zongti-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin-bottom: 8px;
}

.zongti-wenben {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.6;
  margin: 0;
}

.pinggu-jianyi {
  border-top: 1px solid var(--biankuang-yanse);
  padding-top: 16px;
}

.jianyi-biaoti {
  font-size: 14px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin-bottom: 8px;
}

.jianyi-liebiao {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.jianyi-xiangmu {
  font-size: 13px;
  color: var(--wenben-zhuse);
  line-height: 1.5;
  padding-left: 16px;
  position: relative;
}

.jianyi-xiangmu::before {
  content: '💡';
  position: absolute;
  left: 0;
  font-size: 11px;
}

.junshi-zhidao-quyu {
  margin-top: 20px;
  padding: 16px;
  background: var(--yanse-junshi-beijing);
  border: 1px solid var(--yanse-junshi-biankuang);
  border-radius: 12px;
}

.junshi-zhidao-biaoti {
  font-size: 15px;
  font-weight: 700;
  color: var(--yanse-zhanji-qian);
  margin: 0 0 12px;
}

.junshi-zhidao-liebiao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.junshi-zhidao-xiangmu {
  padding: 12px;
  background: var(--yanse-junshi-xiangmu-beijing);
  border-radius: 10px;
  border: 1px solid var(--yanse-junshi-xiangmu-biankuang);
}

.junshi-zhidao-tou {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.junshi-zhidao-xuhao {
  font-size: 12px;
  font-weight: 700;
  color: var(--yanse-zhanji-qian);
  background: var(--yanse-junshi-xuhao-beijing);
  padding: 2px 8px;
  border-radius: 6px;
}

.junshi-zhidao-mingchen {
  font-size: 12px;
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.junshi-zhidao-shijian {
  font-size: 11px;
  color: var(--wenben-ciuse);
  margin-left: auto;
}

.junshi-zhidao-zhaiyao {
  font-size: 12px;
  color: var(--wenben-ciuse);
  margin-bottom: 8px;
  line-height: 1.4;
}

.junshi-zhidao-jianyi {
  font-size: 13px;
  color: var(--wenben-zhuse);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.guanjian-shijian-quyu {
  margin-bottom: 20px;
}

.guanjian-shijian-biaoti {
  font-size: 15px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin-bottom: 16px;
}

.guanjian-shijian-liebiao {
  display: flex;
  flex-direction: column;
}

.guanjian-shijian-tiaomu {
  display: flex;
  gap: 12px;
  min-height: 48px;
}

.guanjian-shijian-shuxian-quyu {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}

.guanjian-shijian-yuan {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.guanjian-shijian-yuan.diYiTiaoXiaoXi {
  background: linear-gradient(135deg, var(--yanse-chenggong), var(--yanse-chenggong-qian));
}

.guanjian-shijian-yuan.guanXiBianHua {
  background: linear-gradient(135deg, var(--yanse-zhanji), var(--yanse-zhanji-qian));
}

.guanjian-shijian-yuan.junShiZhiDao {
  background: linear-gradient(135deg, var(--yanse-xinli), #f39c12);
}

.guanjian-shijian-shuxian {
  width: 2px;
  flex: 1;
  background: var(--yanse-zhanji-shuxian);
  margin: 2px 0;
}

.guanjian-shijian-neirong {
  flex: 1;
  padding-bottom: 12px;
  min-width: 0;
}

.guanjian-shijian-shijian {
  font-size: 11px;
  font-weight: 600;
  color: var(--yanse-zhanji-qian);
  margin-bottom: 2px;
}

.guanjian-shijian-miaoshu {
  font-size: 13px;
  color: var(--wenben-zhuse);
  line-height: 1.4;
}

.junshi-zhidao-haogandu {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 4px 8px;
  background: var(--yanse-junshi-haogandu-beijing);
  border-radius: 6px;
}

.junshi-haogandu-biaoqian {
  font-size: 11px;
  color: var(--yanse-junshi-biaoqian);
}

.junshi-haogandu-zongfen {
  font-size: 14px;
  font-weight: 700;
  color: var(--yanse-junshi-zongfen);
}

.junshi-haogandu-jieduan {
  font-size: 11px;
  color: var(--wenben-ciuse);
  background: var(--yanse-junshi-haogandu-jieduan);
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
