<template>
  <div class="zhanji-yemian">
    <main class="zhanji-liebiao">
      <div v-if="jiaZaiZhong" class="jiazai-zhuangtai">
        {{ huoQuFanYi('zhanJi', 'jiaZaiZhong') }}
      </div>
      <div v-else-if="dangAnLieBiao.length === 0" class="kong-zhuangtai">
        {{ huoQuFanYi('zhanJi', 'zanWuZhanJi') }}
      </div>
      <template v-else>
        <div v-if="xuanZhongIds.size > 0" class="piliang-gongju-lan">
          <span class="xuan-ze-shu-liang">
            {{ huoQuFanYi('zhanJi', 'yiXuanZe').replace('{条}', String(xuanZhongIds.size)) }}
          </span>
          <button class="piliang-shanchu-anniu" @click="piLiangShanChu">
            {{ huoQuFanYi('zhanJi', 'piLiangShanChu') }}
          </button>
        </div>
        <div
          v-for="fenLei in fenLeiLieBiao"
          :key="fenLei.zhuangTai"
          class="zhanji-fenlei-zu"
        >
          <h2 class="zhanji-fenlei-biaoti">
            <span class="fenlei-tubiao">{{ fenLei.tuBiao }}</span>
            {{ fenLei.biaoTi }}
            <span class="fenlei-shu-liang">{{ fenLei.dangAn.length }}</span>
          </h2>
          <TransitionGroup
            v-if="fenLei.dangAn.length > 0"
            name="liebiao-guodu"
            tag="div"
            class="zhanji-liebiao-neirong"
          >
            <div
              v-for="(dangAn, suoYin) in fenLei.dangAn"
              :key="dangAn.id ?? `zhanji-${fenLei.zhuangTai}-${suoYin}`"
              class="zhanji-kapian"
              :class="{
                xuanZhong: dangAn.id && xuanZhongIds.has(dangAn.id),
                tuoZhuaiZhong: tuoZhuaiId === dangAn.id,
              }"
              draggable="true"
              @dragstart="kaiShiTuoZhuai($event, dangAn, fenLei.zhuangTai)"
              @dragover="tuoZhuaiJingGuo($event, dangAn, fenLei.zhuangTai)"
              @drop="jieShouTuoZhuai($event, dangAn, fenLei.zhuangTai)"
              @dragend="jieShuTuoZhuai"
            >
              <label class="xuan-ze-kuang" @click.stop>
                <input
                  type="checkbox"
                  :checked="dangAn.id ? xuanZhongIds.has(dangAn.id) : false"
                  @change="qieHuanXuanZe(dangAn, $event)"
                />
              </label>
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
                  <div class="zhanji-fu-jia-xin-xi">
                    <span class="liaotian-tianshu">
                      {{
                        huoQuFanYi('zhanJi', 'liaoTianTianShu').replace(
                          '{天}',
                          String(dangAn.liao_tian_tian_shu ?? 0),
                        )
                      }}
                    </span>
                    <span v-if="xianShiShiJian(dangAn)" class="zui-hou-xiao-xi-shi-jian">
                      {{ xianShiShiJian(dangAn) }}
                    </span>
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
                <button
                  class="caozuo-anniu shanchu"
                  :title="huoQuFanYi('zhanJi', 'shanChu')"
                  @click.stop="shanChuZhanJi(dangAn)"
                >
                  {{ huoQuFanYi('zhanJi', 'shanChu') }}
                </button>
              </div>
            </div>
          </TransitionGroup>
          <div v-else class="fenlei-kong-zhuangtai">
            {{ fenLei.kongWenBen }}
          </div>
        </div>
      </template>
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
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="fuPanNeiRong" class="fupan-wenben">
                  {{ zhuanHuanFuPanNeiRong(fuPanNeiRong) }}
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
                      <div class="junshi-zhidao-jianyi">
                        {{ jiLu.jian_yi }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
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
import { huoQuDangAnLieBiao, huoQuFuPan, shanChuDangAn, piLiangShanChuDangAn } from '@/api/聊天'
import type { 复盘时间线条目, 军师指导记录项 } from '@/api/聊天'
import type { 档案详情 } from '@/types'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'

const router = useRouter()
const yongHuCangKu = 使用用户仓库()
const dangAnLieBiao = ref<档案详情[]>([])
const jiaZaiZhong = ref(true)
const dangQianDangAn = ref<档案详情 | null>(null)
const fuPanZhanKai = ref(false)
const fuPanNeiRong = ref<string | null>(null)
const fuPanShiJianXian = ref<复盘时间线条目[]>([])
const fuPanJiaZaiZhong = ref(false)
const junShiZhiDaoJiLu = ref<军师指导记录项[]>([])
const fuPanQingQiuId = ref(0)
const xuanZhongIds = ref<Set<string>>(new Set())
const tuoZhuaiId = ref<string | null>(null)
const tuoZhuaiMuBiaoId = ref<string | null>(null)

const paiXuCunChuJian = computed(() => {
  const yongHuId = yongHuCangKu.dangQianYongHu?.id
  return yongHuId ? `zhanJiPaiXu_${yongHuId}` : 'zhanJiPaiXu'
})

type FenLeiZhuangTai = 'jinxingzhong' | 'shengli' | 'shibai'

interface FenLeiXinXi {
  zhuangTai: FenLeiZhuangTai
  tuBiao: string
  biaoTi: string
  kongWenBen: string
  dangAn: 档案详情[]
}

function huoQuPaiXuMap(): Record<FenLeiZhuangTai, string[]> {
  try {
    const yuan = localStorage.getItem(paiXuCunChuJian.value)
    if (!yuan) return { jinxingzhong: [], shengli: [], shibai: [] }
    const jieXi = JSON.parse(yuan)
    return {
      jinxingzhong: Array.isArray(jieXi.jinxingzhong) ? jieXi.jinxingzhong : [],
      shengli: Array.isArray(jieXi.shengli) ? jieXi.shengli : [],
      shibai: Array.isArray(jieXi.shibai) ? jieXi.shibai : [],
    }
  } catch {
    return { jinxingzhong: [], shengli: [], shibai: [] }
  }
}

function baoCunPaiXuMap(map: Record<FenLeiZhuangTai, string[]>) {
  try {
    localStorage.setItem(paiXuCunChuJian.value, JSON.stringify(map))
  } catch {
    // 忽略存储失败
  }
}

function yingYongPaiXuLieBiao(
  lieBiao: 档案详情[],
  paiXuIds: string[],
): 档案详情[] {
  const idDaoJiLu = new Map<string, 档案详情>()
  const wuIdJiLu: 档案详情[] = []
  for (const item of lieBiao) {
    if (item.id) idDaoJiLu.set(item.id, item)
    else wuIdJiLu.push(item)
  }
  const paiXuHou: 档案详情[] = []
  for (const id of paiXuIds) {
    const item = idDaoJiLu.get(id)
    if (item) {
      paiXuHou.push(item)
      idDaoJiLu.delete(id)
    }
  }
  return [...paiXuHou, ...Array.from(idDaoJiLu.values()), ...wuIdJiLu]
}

function huoQuFenLeiZhuangTai(item: 档案详情): FenLeiZhuangTai {
  const leiXing = item.jie_guo_lei_xing_yuan
  if (!leiXing || leiXing === 'jinxing_zhong') return 'jinxingzhong'
  if (leiXing.startsWith('sheng_li')) return 'shengli'
  return 'shibai'
}

const fenLeiLieBiao = computed<FenLeiXinXi[]>(() => {
  const map = huoQuPaiXuMap()
  const jinXingZhong: 档案详情[] = []
  const shengLi: 档案详情[] = []
  const shiBai: 档案详情[] = []
  for (const item of dangAnLieBiao.value) {
    const fenLei = huoQuFenLeiZhuangTai(item)
    if (fenLei === 'jinxingzhong') jinXingZhong.push(item)
    else if (fenLei === 'shengli') shengLi.push(item)
    else shiBai.push(item)
  }
  return [
    {
      zhuangTai: 'jinxingzhong',
      tuBiao: '⏳',
      biaoTi: huoQuFanYi('zhanJi', 'fenLeiJinXingZhong'),
      kongWenBen: huoQuFanYi('zhanJi', 'zanWuJinXingZhong'),
      dangAn: yingYongPaiXuLieBiao(jinXingZhong, map.jinxingzhong),
    },
    {
      zhuangTai: 'shengli',
      tuBiao: '🏆',
      biaoTi: huoQuFanYi('zhanJi', 'fenLeiShengLi'),
      kongWenBen: huoQuFanYi('zhanJi', 'zanWuShengLi'),
      dangAn: yingYongPaiXuLieBiao(shengLi, map.shengli),
    },
    {
      zhuangTai: 'shibai',
      tuBiao: '💔',
      biaoTi: huoQuFanYi('zhanJi', 'fenLeiShiBai'),
      kongWenBen: huoQuFanYi('zhanJi', 'zanWuShiBai'),
      dangAn: yingYongPaiXuLieBiao(shiBai, map.shibai),
    },
  ]
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

function geShiHuaRiQiShiJian(shiJian: string): string {
  if (!shiJian) return ''
  try {
    const date = new Date(shiJian)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return shiJian
  }
}

function xianShiShiJian(dangAn: 档案详情): string {
  const jieShuShiJian = dangAn.you_xi_jie_shu_shi_jian
  if (jieShuShiJian) {
    return `${huoQuFanYi('zhanJi', 'youXiJieShuShiJian')}: ${geShiHuaRiQiShiJian(jieShuShiJian)}`
  }
  const zuiHouXiaoXiShiJian = dangAn.zui_hou_xiao_xi_shi_jian
  if (zuiHouXiaoXiShiJian) {
    return `${huoQuFanYi('zhanJi', 'zuiHouXiaoXiShiJian')}: ${geShiHuaRiQiShiJian(zuiHouXiaoXiShiJian)}`
  }
  return ''
}

function zhuanHuanFuPanNeiRong(neiRong: unknown): string {
  if (neiRong === null || neiRong === undefined) return ''
  if (typeof neiRong === 'string') return neiRong
  if (typeof neiRong === 'number' || typeof neiRong === 'boolean') return String(neiRong)
  if (Array.isArray(neiRong)) return neiRong.map(zhuanHuanFuPanNeiRong).join('\n')
  if (typeof neiRong === 'object') {
    try {
      return JSON.stringify(neiRong, null, 2)
    } catch {
      return String(neiRong)
    }
  }
  return String(neiRong)
}

function zhuangTaiWenBen(jieGuoLeiXing: string | undefined): string {
  if (!jieGuoLeiXing || jieGuoLeiXing === 'jinxing_zhong')
    return huoQuFanYi('zhanJi', 'zhuangTaiJinXingZhong')
  if (jieGuoLeiXing.startsWith('sheng_li')) return huoQuFanYi('zhanJi', 'zhuangTaiShengLi')
  return huoQuFanYi('zhanJi', 'zhuangTaiShiBai')
}

function zhuangTaiYangShi(jieGuoLeiXing: string | undefined): string {
  if (!jieGuoLeiXing || jieGuoLeiXing === 'jinxing_zhong') return 'jinxingzhong'
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

function qieHuanXuanZe(dangAn: 档案详情, event: Event) {
  if (!dangAn.id) return
  const muBiao = event.target as HTMLInputElement
  if (muBiao.checked) {
    xuanZhongIds.value.add(dangAn.id)
  } else {
    xuanZhongIds.value.delete(dangAn.id)
  }
}

async function shanChuZhanJi(dangAn: 档案详情) {
  if (!dangAn.id || !confirm(huoQuFanYi('zhanJi', 'queRenShanChu'))) return
  try {
    await shanChuDangAn(dangAn.id)
    dangAnLieBiao.value = dangAnLieBiao.value.filter((item) => item.id !== dangAn.id)
    xuanZhongIds.value.delete(dangAn.id)
  } catch (cuoWu) {
    console.error('删除战绩失败', cuoWu)
  }
}

async function piLiangShanChu() {
  if (xuanZhongIds.value.size === 0) return
  const queRenXinXi = huoQuFanYi('zhanJi', 'queRenPiLiangShanChu').replace(
    '{条}',
    String(xuanZhongIds.value.size),
  )
  if (!confirm(queRenXinXi)) return
  try {
    const ids = Array.from(xuanZhongIds.value)
    const jieGuo = await piLiangShanChuDangAn(ids)
    if (jieGuo.cheng_gong) {
      const shanChuSet = new Set(jieGuo.shan_chu_ids)
      dangAnLieBiao.value = dangAnLieBiao.value.filter((item) => !shanChuSet.has(item.id))
      xuanZhongIds.value.clear()
    }
  } catch (cuoWu) {
    console.error('批量删除战绩失败', cuoWu)
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
  try {
    let fuPanShuJu = await huoQuFuPan(dangAn.id)
    junShiZhiDaoJiLu.value = fuPanShuJu.jun_shi_zhi_dao_ji_lu || []
    if (!fuPanShuJu.jia_zai_zhong) {
      fuPanNeiRong.value = fuPanShuJu.fu_pan_nei_rong
      fuPanShiJianXian.value = fuPanShuJu.fu_pan_shi_jian_xian || []
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
          junShiZhiDaoJiLu.value = fuPanShuJu.jun_shi_zhi_dao_ji_lu || []
        } catch (e) {
          console.warn('轮询复盘数据失败', e)
        }
        if (fuPanShuJu.fu_pan_nei_rong || !fuPanShuJu.jia_zai_zhong) {
          fuPanNeiRong.value = fuPanShuJu.fu_pan_nei_rong
          fuPanShiJianXian.value = fuPanShuJu.fu_pan_shi_jian_xian || []
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
}

function kaiShiTuoZhuai(event: DragEvent, dangAn: 档案详情, fenLei: FenLeiZhuangTai) {
  if (!dangAn.id || !event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify({ id: dangAn.id, fenLei }))
  tuoZhuaiId.value = dangAn.id
}

function tuoZhuaiJingGuo(event: DragEvent, dangAn: 档案详情, fenLei: FenLeiZhuangTai) {
  event.preventDefault()
  if (!dangAn.id || dangAn.id === tuoZhuaiId.value) return
  if (!event.dataTransfer) return
  const yuanShuJu = event.dataTransfer.getData('text/plain')
  if (!yuanShuJu) return
  try {
    const { fenLei: yuanFenLei } = JSON.parse(yuanShuJu) as { fenLei: FenLeiZhuangTai }
    if (yuanFenLei !== fenLei) return
  } catch {
    return
  }
  event.dataTransfer.dropEffect = 'move'
  tuoZhuaiMuBiaoId.value = dangAn.id
}

function jieShouTuoZhuai(event: DragEvent, dangAn: 档案详情, fenLei: FenLeiZhuangTai) {
  event.preventDefault()
  if (!event.dataTransfer || !dangAn.id) return
  const yuanShuJu = event.dataTransfer.getData('text/plain')
  if (!yuanShuJu) return
  let tuoZhuaiShuJu: { id: string; fenLei: FenLeiZhuangTai }
  try {
    tuoZhuaiShuJu = JSON.parse(yuanShuJu) as { id: string; fenLei: FenLeiZhuangTai }
  } catch {
    return
  }
  if (tuoZhuaiShuJu.fenLei !== fenLei) return
  const yuanId = tuoZhuaiShuJu.id
  if (yuanId === dangAn.id) return
  const map = huoQuPaiXuMap()
  const dangQianPaiXu = map[fenLei]
  const xinPaiXu = [...dangQianPaiXu]
  const yuanWeiZhi = xinPaiXu.indexOf(yuanId)
  const muBiaoWeiZhi = xinPaiXu.indexOf(dangAn.id)
  if (yuanWeiZhi > -1) xinPaiXu.splice(yuanWeiZhi, 1)
  const chaRuWeiZhi = muBiaoWeiZhi > -1 ? muBiaoWeiZhi : xinPaiXu.length
  xinPaiXu.splice(chaRuWeiZhi, 0, yuanId)
  map[fenLei] = xinPaiXu
  baoCunPaiXuMap(map)
}

function jieShuTuoZhuai() {
  tuoZhuaiId.value = null
  tuoZhuaiMuBiaoId.value = null
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
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-beijing) transparent;
}

.zhanji-liebiao::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.zhanji-liebiao::-webkit-scrollbar-track {
  background: transparent;
}

.zhanji-liebiao::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 3px;
}

.zhanji-liebiao::-webkit-scrollbar-thumb:hover {
  background: var(--gundong-tiao-hover);
}

.jiazai-zhuangtai,
.kong-zhuangtai {
  text-align: center;
  padding: 48px 16px;
  color: var(--wenben-ciuse);
  font-size: 14px;
}

.piliang-gongju-lan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 14px;
  margin-bottom: 4px;
}

.xuan-ze-shu-liang {
  font-size: 14px;
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.piliang-shanchu-anniu {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background: var(--biao-qian-shibai-beijing);
  color: var(--biao-qian-shibai-wenben);
  transition: all 0.2s ease;
}

.piliang-shanchu-anniu:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.zhanji-fenlei-zu {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zhanji-fenlei-biaoti {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  padding: 8px 4px;
  position: sticky;
  top: 0;
  background: linear-gradient(
    135deg,
    var(--beijing-jianbian-1),
    var(--beijing-jianbian-2),
    var(--beijing-jianbian-3),
    var(--beijing-jianbian-4)
  );
  background-size: 300% 300%;
  z-index: 10;
}

.fenlei-tubiao {
  font-size: 18px;
}

.fenlei-shu-liang {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--wenben-ciuse);
  margin-left: auto;
}

.fenlei-kong-zhuangtai {
  text-align: center;
  padding: 24px 16px;
  color: var(--wenben-ciuse);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
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
  cursor: grab;
}

.zhanji-kapian.xuanZhong {
  background: rgba(107, 140, 166, 0.18);
  border: 1px solid rgba(107, 140, 166, 0.4);
}

.zhanji-kapian.tuoZhuaiZhong {
  opacity: 0.6;
}

.zhanji-kapian:active {
  cursor: grabbing;
}

.xuan-ze-kuang {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.xuan-ze-kuang input {
  width: 18px;
  height: 18px;
  accent-color: var(--nuanhui-lan);
  cursor: pointer;
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

.zhanji-fu-jia-xin-xi {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.liaotian-tianshu {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.zui-hou-xiao-xi-shi-jian {
  font-size: 12px;
  color: var(--wenben-ciuse);
}

.zhanji-you {
  flex-shrink: 0;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
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

.caozuo-anniu.fupan {
  background: linear-gradient(135deg, var(--yanse-zhanji), var(--yanse-zhanji-qian));
  color: #ffffff;
}

.caozuo-anniu.fupan:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.caozuo-anniu.shanchu {
  background: transparent;
  color: var(--wenben-ciuse);
  border: 1px solid var(--biankuang-qianse);
  padding: 6px 12px;
  font-size: 12px;
}

.caozuo-anniu.shanchu:hover {
  background: var(--biao-qian-shibai-beijing);
  color: var(--biao-qian-shibai-wenben);
  border-color: transparent;
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
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-beijing) transparent;
}

.fupan-neirong::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.fupan-neirong::-webkit-scrollbar-track {
  background: transparent;
}

.fupan-neirong::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 3px;
}

.fupan-neirong::-webkit-scrollbar-thumb:hover {
  background: var(--gundong-tiao-hover);
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
</style>
