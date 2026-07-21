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
          <div class="piliang-anniu-zu">
            <button class="quan-xuan-anniu" @click="qieHuanQuanXuan">
              {{ huoQuFanYi('zhanJi', suoYouQuanXuan ? 'quXiaoQuanXuan' : 'quanXuan') }}
            </button>
            <button class="piliang-shanchu-anniu" @click="piLiangShanChu">
              {{ huoQuFanYi('zhanJi', 'piLiangShanChu') }}
            </button>
          </div>
        </div>
        <div v-for="fenLei in fenLeiLieBiao" :key="fenLei.zhuangTai" class="zhanji-fenlei-zu">
          <h2 class="zhanji-fenlei-biaoti">
            <span class="fenlei-tubiao">{{ fenLei.tuBiao }}</span>
            {{ fenLei.biaoTi }}
            <span class="fenlei-shu-liang">{{ fenLei.dangAn.length }}</span>
            <button
              v-if="fenLei.dangAn.length > 0"
              class="fenlei-quan-xuan-anniu"
              @click="qieHuanFenLeiQuanXuan(fenLei)"
            >
              {{
                huoQuFanYi(
                  'zhanJi',
                  fenLeiQuanXuanZhuangTai(fenLei) ? 'quXiaoQuanXuan' : 'quanXuanGaiFenLei',
                )
              }}
            </button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuDangAnLieBiao, shanChuDangAn, piLiangShanChuDangAn } from '@/api/聊天'
import type { 档案详情 } from '@/types'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'

const router = useRouter()
const yongHuCangKu = 使用用户仓库()
const dangAnLieBiao = ref<档案详情[]>([])
const jiaZaiZhong = ref(true)
const xuanZhongIds = ref<Set<string>>(new Set())
const tuoZhuaiId = ref<string | null>(null)
const tuoZhuaiMuBiaoId = ref<string | null>(null)
const paiXuMap = ref<Record<FenLeiZhuangTai, string[]>>({
  jinxingzhong: [],
  shengli: [],
  shibai: [],
})

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
  paiXuMap.value = { ...map }
  try {
    localStorage.setItem(paiXuCunChuJian.value, JSON.stringify(map))
  } catch {
    // 忽略存储失败
  }
}

function yingYongPaiXuLieBiao(lieBiao: 档案详情[], paiXuIds: string[]): 档案详情[] {
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

const suoYouQuanXuan = computed(() => {
  const keXuanIds = dangAnLieBiao.value.map((item) => item.id).filter((id): id is string => !!id)
  return keXuanIds.length > 0 && keXuanIds.every((id) => xuanZhongIds.value.has(id))
})

const fenLeiLieBiao = computed<FenLeiXinXi[]>(() => {
  const map = paiXuMap.value
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

function geShiHuaRiQiShiJian(shiJian: string): string {
  if (!shiJian) return ''
  try {
    const date = new Date(shiJian)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
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

function qieHuanQuanXuan() {
  if (suoYouQuanXuan.value) {
    xuanZhongIds.value.clear()
  } else {
    for (const item of dangAnLieBiao.value) {
      if (item.id) xuanZhongIds.value.add(item.id)
    }
  }
}

function fenLeiQuanXuanZhuangTai(fenLei: FenLeiXinXi): boolean {
  const fenLeiIds = fenLei.dangAn.map((item) => item.id).filter((id): id is string => !!id)
  return fenLeiIds.length > 0 && fenLeiIds.every((id) => xuanZhongIds.value.has(id))
}

function qieHuanFenLeiQuanXuan(fenLei: FenLeiXinXi) {
  const fenLeiIds = fenLei.dangAn.map((item) => item.id).filter((id): id is string => !!id)
  if (fenLeiIds.length === 0) return
  if (fenLeiQuanXuanZhuangTai(fenLei)) {
    for (const id of fenLeiIds) {
      xuanZhongIds.value.delete(id)
    }
  } else {
    for (const id of fenLeiIds) {
      xuanZhongIds.value.add(id)
    }
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

function daKaiFuPan(dangAn: 档案详情) {
  if (!dangAn.id || !dangAn.jiao_se_id) return
  router.push({
    path: `/chat/${dangAn.jiao_se_id}`,
    query: { fuPan: '1', dangAnId: dangAn.id },
  })
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
  paiXuMap.value = huoQuPaiXuMap()
  jiaZaiShuJu()
})

watch(paiXuCunChuJian, () => {
  paiXuMap.value = huoQuPaiXuMap()
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

.piliang-anniu-zu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quan-xuan-anniu {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  color: var(--wenben-zhuse);
  transition: all 0.2s ease;
}

.quan-xuan-anniu:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
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

.fenlei-quan-xuan-anniu {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(107, 140, 166, 0.2);
  color: var(--wenben-zhuse);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.fenlei-quan-xuan-anniu:hover {
  background: rgba(107, 140, 166, 0.35);
  transform: translateY(-1px);
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
</style>
