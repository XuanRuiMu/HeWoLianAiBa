<template>
  <div class="zhanji-yemian">
    <main class="zhanji-liebiao" :class="{ 'tuo-zhuai-zhong': tuoZhuaiZhong }">
      <div v-if="jiaZaiZhong" class="jiazai-zhuangtai">
        {{ huoQuFanYi('zhanJi', 'jiaZaiZhong') }}
      </div>
      <div v-else-if="dangAnLieBiao.length === 0" class="kong-zhuangtai">
        {{ huoQuFanYi('zhanJi', 'zanWuZhanJi') }}
      </div>
      <template v-else>
        <div
          class="piliang-gongju-lan"
          :class="{ 'piliang-gongju-lan--kong': xuanZhongIds.size === 0 }"
        >
          <div class="quanju-gouxuan-zu">
            <button
              class="gouxuan-anniu gouxuan-anniu--quanju"
              :class="{
                'gouxuan-anniu--xuanzhong': quanJuGouXuanZhuangTai === 'checked',
                'gouxuan-anniu--bufen': quanJuGouXuanZhuangTai === 'indeterminate',
              }"
              role="checkbox"
              :aria-checked="
                quanJuGouXuanZhuangTai === 'checked'
                  ? 'true'
                  : quanJuGouXuanZhuangTai === 'indeterminate'
                    ? 'mixed'
                    : 'false'
              "
              :aria-label="huoQuFanYi('zhanJi', 'quanXuan')"
              tabindex="0"
              @click="qieHuanQuanXuan"
              @keydown.space.prevent="qieHuanQuanXuan"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <span
              class="xuan-ze-shu-liang"
              :class="{ 'xuan-ze-shu-liang--kong': xuanZhongIds.size === 0 }"
            >
              {{ huoQuFanYi('zhanJi', 'yiXuanZe').replace('{条}', String(xuanZhongIds.size)) }}
            </span>
          </div>
          <div class="piliang-anniu-zu">
            <button class="quan-xuan-anniu" @click="quanBuXuanZe">
              {{ huoQuFanYi('zhanJi', 'quanXuan') }}
            </button>
            <button
              class="quxiao-quanxuan-anniu"
              :disabled="xuanZhongIds.size === 0"
              @click="qingKongXuanZe"
            >
              {{ huoQuFanYi('zhanJi', 'quXiaoQuanXuan') }}
            </button>
            <button
              class="piliang-shanchu-anniu"
              :disabled="xuanZhongIds.size === 0"
              @click="piLiangShanChu"
            >
              {{ huoQuFanYi('zhanJi', 'piLiangShanChu') }}
            </button>
          </div>
        </div>
        <div class="paixu-gongju-lan">
          <span class="paixu-biaoqian">{{ huoQuFanYi('zhanJi', 'paiXuBiaoQian') }}</span>
          <div class="paixu-weidu-zu">
            <button
              v-for="xuanXiang in paiXuXuanXiangList"
              :key="xuanXiang.zhi"
              class="paixu-weidu-anniu"
              :class="{ 'paixu-weidu-anniu--jihuo': paiXuWeiDu === xuanXiang.zhi }"
              :aria-pressed="paiXuWeiDu === xuanXiang.zhi ? 'true' : 'false'"
              @click="qieHuanPaiXuWeiDu(xuanXiang.zhi)"
            >
              {{ xuanXiang.biaoTi }}
            </button>
          </div>
          <button
            class="paixu-fangxiang-anniu"
            :disabled="shiFouShouDongPaiXu"
            @click="qieHuanPaiXuFangXiang"
          >
            {{
              paiXuFangXiang === 'jiangXu'
                ? huoQuFanYi('zhanJi', 'paiXuJiangXu')
                : huoQuFanYi('zhanJi', 'paiXuShengXu')
            }}
          </button>
        </div>
        <div v-for="fenLei in fenLeiXinXiList" :key="fenLei.zhuangTai" class="zhanji-fenlei-zu">
          <h2 class="zhanji-fenlei-biaoti">
            <span class="fenlei-tubiao">{{ fenLei.tuBiao }}</span>
            {{ fenLei.biaoTi }}
            <span class="fenlei-shu-liang">{{ xianShiFenLeiZu[fenLei.zhuangTai].length }}</span>
            <button
              v-if="xianShiFenLeiZu[fenLei.zhuangTai].length > 0"
              class="fenlei-quan-xuan-anniu"
              @click="qieHuanFenLeiQuanXuan(fenLei.zhuangTai)"
            >
              {{
                huoQuFanYi(
                  'zhanJi',
                  fenLeiQuanXuanZhuangTai(fenLei.zhuangTai)
                    ? 'quXiaoQuanXuan'
                    : 'quanXuanGaiFenLei',
                )
              }}
            </button>
          </h2>
          <VueDraggable
            v-if="xianShiFenLeiZu[fenLei.zhuangTai].length > 0"
            v-model="fenLeiZu[fenLei.zhuangTai]"
            :disabled="!shiFouShouDongPaiXu"
            :animation="200"
            :filter="'.gouxuan-anniu, .caozuo-anniu'"
            :prevent-on-filter="false"
            ghost-class="sortable-ghost"
            chosen-class="sortable-chosen"
            drag-class="sortable-drag"
            fallback-class="sortable-drag"
            :force-fallback="true"
            :fallback-on-body="true"
            :on-move="() => false"
            :custom-update="onTuoZhuaiGengXin"
            :group="{ name: fenLei.zhuangTai, pull: false, put: false }"
            class="zhanji-liebiao-neirong"
            @start="onTuoZhuaiKaiShi(fenLei.zhuangTai, $event)"
            @end="onTuoZhuaiJieShu(fenLei.zhuangTai, $event)"
          >
            <TransitionGroup name="zhanji-kapian">
              <div
                v-for="(dangAn, suoYin) in xianShiFenLeiZu[fenLei.zhuangTai]"
                :key="dangAn.id ?? `zhanji-${fenLei.zhuangTai}-${suoYin}`"
                class="zhanji-kapian"
                :class="{ xuanZhong: dangAn.id && xuanZhongIds.has(dangAn.id) }"
                :data-id="dangAn.id"
              >
                <button
                  class="gouxuan-anniu gouxuan-anniu--kapian"
                  :class="{
                    'gouxuan-anniu--xuanzhong': dangAn.id && xuanZhongIds.has(dangAn.id),
                  }"
                  role="checkbox"
                  :aria-checked="dangAn.id && xuanZhongIds.has(dangAn.id) ? 'true' : 'false'"
                  :aria-label="
                    huoQuFanYi('zhanJi', 'gouXuan').replace('{名字}', dangAn.jiao_se_ming_zi ?? '')
                  "
                  tabindex="0"
                  @click.stop="qieHuanXuanZe(dangAn, $event)"
                  @keydown.space.prevent.stop="qieHuanXuanZe(dangAn, $event)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
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
          </VueDraggable>
          <div v-else class="fenlei-kong-zhuangtai">
            {{ fenLei.kongWenBen }}
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { jiSuanMuBiaoSuoYin, jiSuanYuLanShunXu } from '@/utils/paixuYuLan'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { huoQuDangAnLieBiao, shanChuDangAn, piLiangShanChuDangAn } from '@/api/聊天'
import type { 档案详情 } from '@/types'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'

type FenLeiZhuangTai = 'jinxingzhong' | 'shengli' | 'shibai'

// 手动排序 = 拖拽结果；其余为自动排序维度，选中自动维度时拖拽暂时停用，切回手动即恢复原有拖拽顺序
type PaiXuWeiDu = 'shouDong' | 'chuangJianShiJian' | 'zuiHouDuiHuaShiJian' | 'mingCheng' | 'xingGe'
type PaiXuFangXiang = 'jiangXu' | 'shengXu'

interface FenLeiXinXi {
  zhuangTai: FenLeiZhuangTai
  tuBiao: string
  biaoTi: string
  kongWenBen: string
}

interface PaiXuXuanXiang {
  zhi: PaiXuWeiDu
  biaoTi: string
}

// 未登录时的兜底键；身份就绪后会迁移到 `<键>_<用户id>`
const HOU_BEI_PAI_XU_JIAN = 'zhanJiPaiXu'
const HOU_BEI_PIAN_HAO_JIAN = 'zhanJiPaiXuPianHao'
const PAI_XU_WEI_DU_JI_HE: PaiXuWeiDu[] = [
  'shouDong',
  'chuangJianShiJian',
  'zuiHouDuiHuaShiJian',
  'mingCheng',
  'xingGe',
]

const router = useRouter()
const yongHuCangKu = 使用用户仓库()
const jiaZaiZhong = ref(true)
const tuoZhuaiZhong = ref(false)
// 拖拽前各分组的 id 顺序快照。最终顺序以拖拽事件携带的 oldIndex→newIndex 为准，
// 快照用于在 onEnd 时按索引从拖拽前顺序重排出最终顺序，从根因上消除
// 「拖了不动 / 回弹 / 刷新后不保持」。
const tuoZhuaiQianIdShunXu = ref<Record<FenLeiZhuangTai, string[]>>({
  jinxingzhong: [],
  shengli: [],
  shibai: [],
})

// 实时预览所需的拖拽态：拖拽中由 pointermove 主动重排「预览数组 yuLanShunXu」触发 FLIP 滑动，
// 而 v-model 源 fenLeiZu 保持原始顺序不动，二者彻底解耦。
// 关键：<VueDraggable> 上 :on-move="() => false" 已禁用 SortableJS 原生的「拖拽中移动真实卡片」逻辑；
// :custom-update 钩子接管库内部 onUpdate 的「默认 DOM 移动(Ke/Tt) + 模型二次换位(St)」，改为本组件
// 落定时一次性权威重排 fenLeiZu。兄弟卡片的滑动动画由本组件自行实现的「手动 FLIP」
// （buZhuoFlipJiuWeiZhi + yingYongFlip）驱动，而非 <TransitionGroup>。
// 原因：vue-draggable-plus 会把 <TransitionGroup> 拍平，卡片直接成为容器子节点，
// TransitionGroup 的 -move 类 / FLIP 动画因此完全失效（实测 带move类=0），必须手工 FLIP。
// :fallback-on-body="true" 让 force-fallback 的克隆体挂到 document.body，保持列表容器 DOM 干净。
const draggingState = ref<FenLeiZhuangTai | null>(null)
const draggingId = ref<string | null>(null)
const draggingYuanSuoYin = ref<number>(-1)
const mubiaoSuoYin = ref<number>(-1)
const tuoZhuaiRongQi = ref<HTMLElement | null>(null)
const yuanXinZuoBiao = ref<number[]>([])
const xuanZhongIds = ref<Set<string>>(new Set())
const zuiHouDianJiSuoYin = ref<number | null>(null)
const paiXuWeiDu = ref<PaiXuWeiDu>('shouDong')
const paiXuFangXiang = ref<PaiXuFangXiang>('jiangXu')
const fenLeiZu = reactive<Record<FenLeiZhuangTai, 档案详情[]>>({
  jinxingzhong: [],
  shengli: [],
  shibai: [],
})

// 实时预览数组：与 v-model 源 fenLeiZu 完全解耦。拖拽过程中仅由本组件的指针推算驱动
// yuLanShunXu（驱动 v-for 与手动 FLIP 兄弟卡片滑动），fenLeiZu 在拖拽全程保持「原始顺序」不动。
// 落定时由 customUpdate 以「原始顺序 + 落定索引」对 fenLeiZu 一次性权威重排，
// 从根本上消除「预览改写 v-model → 库内部 onUpdate 二次换位」的双重换位回弹（实测 @end 回弹根因）。
const yuLanShunXu = reactive<Record<FenLeiZhuangTai, 档案详情[]>>({
  jinxingzhong: [],
  shengli: [],
  shibai: [],
})

const paiXuCunChuJian = computed(() => {
  const yongHuId = yongHuCangKu.dangQianYongHu?.id
  return yongHuId ? `${HOU_BEI_PAI_XU_JIAN}_${yongHuId}` : HOU_BEI_PAI_XU_JIAN
})

const pianHaoCunChuJian = computed(() => {
  const yongHuId = yongHuCangKu.dangQianYongHu?.id
  return yongHuId ? `${HOU_BEI_PIAN_HAO_JIAN}_${yongHuId}` : HOU_BEI_PIAN_HAO_JIAN
})

const shiFouShouDongPaiXu = computed(() => paiXuWeiDu.value === 'shouDong')

const paiXuXuanXiangList = computed<PaiXuXuanXiang[]>(() => [
  { zhi: 'shouDong', biaoTi: huoQuFanYi('zhanJi', 'tuoDongPaiXu') },
  { zhi: 'chuangJianShiJian', biaoTi: huoQuFanYi('zhanJi', 'paiXuChuangJianShiJian') },
  { zhi: 'zuiHouDuiHuaShiJian', biaoTi: huoQuFanYi('zhanJi', 'paiXuZuiHouDuiHuaShiJian') },
  { zhi: 'mingCheng', biaoTi: huoQuFanYi('zhanJi', 'paiXuMingCheng') },
  { zhi: 'xingGe', biaoTi: huoQuFanYi('zhanJi', 'paiXuXingGe') },
])

const fenLeiXinXiList = computed<FenLeiXinXi[]>(() => [
  {
    zhuangTai: 'jinxingzhong',
    tuBiao: '⏳',
    biaoTi: huoQuFanYi('zhanJi', 'fenLeiJinXingZhong'),
    kongWenBen: huoQuFanYi('zhanJi', 'zanWuJinXingZhong'),
  },
  {
    zhuangTai: 'shengli',
    tuBiao: '🏆',
    biaoTi: huoQuFanYi('zhanJi', 'fenLeiShengLi'),
    kongWenBen: huoQuFanYi('zhanJi', 'zanWuShengLi'),
  },
  {
    zhuangTai: 'shibai',
    tuBiao: '💔',
    biaoTi: huoQuFanYi('zhanJi', 'fenLeiShiBai'),
    kongWenBen: huoQuFanYi('zhanJi', 'zanWuShiBai'),
  },
])

function huoQuShiJianChuo(zhi: string | null | undefined): number | null {
  if (!zhi) return null
  const shiJianChuo = new Date(zhi).getTime()
  return Number.isNaN(shiJianChuo) ? null : shiJianChuo
}

// 未知值（空时间、空名称、空性格）恒定沉底，不随升降序翻转，保证「未知」档始终可见且位置稳定
function biJiaoShuZi(zuo: number | null, you: number | null, fangXiang: number): number {
  if (zuo === null && you === null) return 0
  if (zuo === null) return 1
  if (you === null) return -1
  if (zuo === you) return 0
  return (zuo < you ? -1 : 1) * fangXiang
}

function biJiaoWenBen(zuo: string, you: string, fangXiang: number): number {
  if (!zuo && !you) return 0
  if (!zuo) return 1
  if (!you) return -1
  return zuo.localeCompare(you, 'zh-CN') * fangXiang
}

function huoQuMingChengJian(item: 档案详情): string {
  return (item.jiao_se_ming_zi || item.id || '').trim()
}

// 先一次性抽取排序键再比较，避免比较器内重复解析时间字符串（数百条时降到 O(n) 次解析）
function paiXuFenLei(lieBiao: 档案详情[]): 档案详情[] {
  const weiDu = paiXuWeiDu.value
  const fangXiang = paiXuFangXiang.value === 'jiangXu' ? -1 : 1
  const shiFouWenBenWeiDu = weiDu === 'mingCheng' || weiDu === 'xingGe'
  const zhuangShiXiang = lieBiao.map((item, suoYin) => ({
    item,
    suoYin,
    chuangJianJian: huoQuShiJianChuo(item.chuang_jian_shi_jian),
    shuZiJian:
      weiDu === 'chuangJianShiJian'
        ? huoQuShiJianChuo(item.chuang_jian_shi_jian)
        : weiDu === 'zuiHouDuiHuaShiJian'
          ? huoQuShiJianChuo(item.zui_hou_xiao_xi_shi_jian)
          : null,
    wenBenJian:
      weiDu === 'mingCheng'
        ? huoQuMingChengJian(item)
        : weiDu === 'xingGe'
          ? (item.mbti_lei_xing || '').trim()
          : '',
  }))
  zhuangShiXiang.sort((zuo, you) => {
    const zhuJieGuo = shiFouWenBenWeiDu
      ? biJiaoWenBen(zuo.wenBenJian, you.wenBenJian, fangXiang)
      : biJiaoShuZi(zuo.shuZiJian, you.shuZiJian, fangXiang)
    if (zhuJieGuo !== 0) return zhuJieGuo
    const ciJieGuo = biJiaoShuZi(zuo.chuangJianJian, you.chuangJianJian, -1)
    if (ciJieGuo !== 0) return ciJieGuo
    return zuo.suoYin - you.suoYin
  })
  return zhuangShiXiang.map((tiao) => tiao.item)
}

// computed 天然缓存：仅在分类数据或排序偏好变化时重算。
// 拖拽中：被拖分组渲染「预览顺序」yuLanShunXu（仅它由 pointermove 驱动），其余分组保持原顺序，
// 以保证兄弟卡片 FLIP 实时滑动，同时 v-model(fenLeiZu) 保持原始顺序，由落定时的
// customUpdate 一次性权威重排，避免双重换位回弹。非拖拽时：手动排序复用原数组，自动排序维度走 paiXuFenLei。
const xianShiFenLeiZu = computed<Record<FenLeiZhuangTai, 档案详情[]>>(() => {
  if (draggingState.value) {
    const zt = draggingState.value
    return {
      jinxingzhong: zt === 'jinxingzhong' ? yuLanShunXu.jinxingzhong : fenLeiZu.jinxingzhong,
      shengli: zt === 'shengli' ? yuLanShunXu.shengli : fenLeiZu.shengli,
      shibai: zt === 'shibai' ? yuLanShunXu.shibai : fenLeiZu.shibai,
    }
  }
  if (shiFouShouDongPaiXu.value) {
    return {
      jinxingzhong: fenLeiZu.jinxingzhong,
      shengli: fenLeiZu.shengli,
      shibai: fenLeiZu.shibai,
    }
  }
  return {
    jinxingzhong: paiXuFenLei(fenLeiZu.jinxingzhong),
    shengli: paiXuFenLei(fenLeiZu.shengli),
    shibai: paiXuFenLei(fenLeiZu.shibai),
  }
})

const dangAnLieBiao = computed<档案详情[]>(() => [
  ...xianShiFenLeiZu.value.jinxingzhong,
  ...xianShiFenLeiZu.value.shengli,
  ...xianShiFenLeiZu.value.shibai,
])

// 身份就绪前读到的是兜底键，就绪后把兜底键的历史数据迁移到真实键，避免读写键错配导致顺序丢失
function qianYiHouBeiJian(houBeiJian: string, shiJiJian: string) {
  if (shiJiJian === houBeiJian) return
  try {
    const houBeiZhi = localStorage.getItem(houBeiJian)
    if (houBeiZhi === null) return
    if (localStorage.getItem(shiJiJian) === null) {
      localStorage.setItem(shiJiJian, houBeiZhi)
    }
    localStorage.removeItem(houBeiJian)
  } catch {
    // 忽略存储失败
  }
}

function huiFuPaiXuPianHao() {
  try {
    const yuan = localStorage.getItem(pianHaoCunChuJian.value)
    if (!yuan) return
    const jieXi = JSON.parse(yuan)
    if (PAI_XU_WEI_DU_JI_HE.includes(jieXi?.weiDu)) paiXuWeiDu.value = jieXi.weiDu
    if (jieXi?.fangXiang === 'jiangXu' || jieXi?.fangXiang === 'shengXu') {
      paiXuFangXiang.value = jieXi.fangXiang
    }
  } catch {
    // 解析失败时沿用默认偏好
  }
}

function baoCunPaiXuPianHao() {
  try {
    localStorage.setItem(
      pianHaoCunChuJian.value,
      JSON.stringify({ weiDu: paiXuWeiDu.value, fangXiang: paiXuFangXiang.value }),
    )
  } catch {
    // 忽略存储失败
  }
}

function qieHuanPaiXuWeiDu(weiDu: PaiXuWeiDu) {
  if (paiXuWeiDu.value === weiDu) return
  paiXuWeiDu.value = weiDu
  baoCunPaiXuPianHao()
}

function qieHuanPaiXuFangXiang() {
  if (shiFouShouDongPaiXu.value) return
  paiXuFangXiang.value = paiXuFangXiang.value === 'jiangXu' ? 'shengXu' : 'jiangXu'
  baoCunPaiXuPianHao()
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
  // 未出现在已存顺序里的都是新建对话，按创建时间倒序置顶
  const xinJianJiLu = Array.from(idDaoJiLu.values()).sort((zuo, you) =>
    biJiaoShuZi(
      huoQuShiJianChuo(zuo.chuang_jian_shi_jian),
      huoQuShiJianChuo(you.chuang_jian_shi_jian),
      -1,
    ),
  )
  return [...xinJianJiLu, ...paiXuHou, ...wuIdJiLu]
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

const buFenXuanZe = computed(() => {
  const zongShu = dangAnLieBiao.value.filter((item) => item.id).length
  return xuanZhongIds.value.size > 0 && xuanZhongIds.value.size < zongShu
})

const quanJuGouXuanZhuangTai = computed<'unchecked' | 'indeterminate' | 'checked'>(() => {
  if (suoYouQuanXuan.value) return 'checked'
  if (buFenXuanZe.value) return 'indeterminate'
  return 'unchecked'
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
  // 排序存储键依赖用户 id，而身份是异步解析的。先等身份就绪门，
  // 否则首屏会用兜底键读顺序、拖拽后又写入带 id 的键，读写错配导致刷新后顺序丢失
  try {
    await yongHuCangKu.queBaoShenFenJiuXu()
  } catch {
    // 身份加载失败时退回兜底键，不阻断战绩渲染
  }
  qianYiHouBeiJian(HOU_BEI_PAI_XU_JIAN, paiXuCunChuJian.value)
  qianYiHouBeiJian(HOU_BEI_PIAN_HAO_JIAN, pianHaoCunChuJian.value)
  huiFuPaiXuPianHao()
  try {
    const list = await huoQuDangAnLieBiao()
    const map = huoQuPaiXuMap()
    const jinXingZhong: 档案详情[] = []
    const shengLi: 档案详情[] = []
    const shiBai: 档案详情[] = []
    for (const item of list) {
      const fenLei = huoQuFenLeiZhuangTai(item)
      if (fenLei === 'jinxingzhong') jinXingZhong.push(item)
      else if (fenLei === 'shengli') shengLi.push(item)
      else shiBai.push(item)
    }
    fenLeiZu.jinxingzhong = yingYongPaiXuLieBiao(jinXingZhong, map.jinxingzhong)
    fenLeiZu.shengli = yingYongPaiXuLieBiao(shengLi, map.shengli)
    fenLeiZu.shibai = yingYongPaiXuLieBiao(shiBai, map.shibai)
  } catch {
    fenLeiZu.jinxingzhong = []
    fenLeiZu.shengli = []
    fenLeiZu.shibai = []
  } finally {
    jiaZaiZhong.value = false
  }
}

function huoQuDangAnQuanJuSuoYin(dangAnId: string | undefined): number {
  if (!dangAnId) return -1
  return dangAnLieBiao.value.findIndex((item) => item.id === dangAnId)
}

function qieHuanXuanZe(dangAn: 档案详情, shiJian?: { shiftKey?: boolean }) {
  if (!dangAn.id) return
  const dangQianSuoYin = huoQuDangAnQuanJuSuoYin(dangAn.id)
  if (
    shiJian?.shiftKey &&
    zuiHouDianJiSuoYin.value !== null &&
    zuiHouDianJiSuoYin.value >= 0 &&
    dangQianSuoYin >= 0
  ) {
    const qiShi = Math.min(zuiHouDianJiSuoYin.value, dangQianSuoYin)
    const jieShu = Math.max(zuiHouDianJiSuoYin.value, dangQianSuoYin)
    for (let i = qiShi; i <= jieShu; i++) {
      const item = dangAnLieBiao.value[i]
      if (item?.id) xuanZhongIds.value.add(item.id)
    }
    zuiHouDianJiSuoYin.value = dangQianSuoYin
  } else {
    if (xuanZhongIds.value.has(dangAn.id)) {
      xuanZhongIds.value.delete(dangAn.id)
    } else {
      xuanZhongIds.value.add(dangAn.id)
    }
    zuiHouDianJiSuoYin.value = dangQianSuoYin
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

function quanBuXuanZe() {
  for (const item of dangAnLieBiao.value) {
    if (item.id) xuanZhongIds.value.add(item.id)
  }
}

function qingKongXuanZe() {
  xuanZhongIds.value.clear()
}

function fenLeiQuanXuanZhuangTai(zhuangTai: FenLeiZhuangTai): boolean {
  const fenLeiIds = fenLeiZu[zhuangTai].map((item) => item.id).filter((id): id is string => !!id)
  return fenLeiIds.length > 0 && fenLeiIds.every((id) => xuanZhongIds.value.has(id))
}

function qieHuanFenLeiQuanXuan(zhuangTai: FenLeiZhuangTai) {
  const fenLeiIds = fenLeiZu[zhuangTai].map((item) => item.id).filter((id): id is string => !!id)
  if (fenLeiIds.length === 0) return
  if (fenLeiQuanXuanZhuangTai(zhuangTai)) {
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
    const fenLei = huoQuFenLeiZhuangTai(dangAn)
    fenLeiZu[fenLei] = fenLeiZu[fenLei].filter((item) => item.id !== dangAn.id)
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
      fenLeiZu.jinxingzhong = fenLeiZu.jinxingzhong.filter((item) => !shanChuSet.has(item.id))
      fenLeiZu.shengli = fenLeiZu.shengli.filter((item) => !shanChuSet.has(item.id))
      fenLeiZu.shibai = fenLeiZu.shibai.filter((item) => !shanChuSet.has(item.id))
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

interface TuoZhuaiShiJian {
  oldIndex?: number
  newIndex?: number
  oldDraggableIndex?: number
  newDraggableIndex?: number
  to?: HTMLElement
  from?: HTMLElement
  item?: HTMLElement
  originalEvent?: Event
}

// 捕获容器内各卡片中心 Y 坐标（固定原始顺序），供 pointermove 幂等推算落点
function buZhuoZhongXin(rongQi: HTMLElement | null): number[] {
  if (!rongQi || typeof rongQi.querySelectorAll !== 'function') return []
  const paiPiao = Array.from(rongQi.querySelectorAll('.zhanji-kapian')) as HTMLElement[]
  return paiPiao.map((el) => {
    const r = el.getBoundingClientRect()
    return r.top + r.height / 2
  })
}

// 手动 FLIP：vue-draggable-plus 会把 <TransitionGroup> 拍平，导致卡片直接成为容器子节点，
// TransitionGroup 的 -move 类 / FLIP 动画根本不生效（实测 带move类=0）。因此自行实现 FLIP：
// 重排前记录各卡片旧位置，重排后(nextTick)测量新位置，对位移>0 的卡片施加反向 transform，
// 再在下一帧过渡回自然位置，从而实现拖拽中兄弟卡片实时滑动。
const flipJiuWeiZhi = new Map<string, { left: number; top: number }>()

function buZhuoFlipJiuWeiZhi() {
  flipJiuWeiZhi.clear()
  const r = tuoZhuaiRongQi.value
  if (!r || typeof r.querySelectorAll !== 'function') return
  const cards = Array.from(r.querySelectorAll('.zhanji-kapian')) as HTMLElement[]
  cards.forEach((c) => {
    const id = c.getAttribute('data-id')
    if (!id) return
    const rect = c.getBoundingClientRect()
    flipJiuWeiZhi.set(id, { left: rect.left, top: rect.top })
  })
}

function yingYongFlip() {
  const r = tuoZhuaiRongQi.value
  if (!r || typeof r.querySelectorAll !== 'function') return
  const cards = Array.from(r.querySelectorAll('.zhanji-kapian')) as HTMLElement[]
  const pending: HTMLElement[] = []
  cards.forEach((c) => {
    const id = c.getAttribute('data-id')
    if (!id) return
    const jiu = flipJiuWeiZhi.get(id)
    if (!jiu) return
    const rect = c.getBoundingClientRect()
    const dx = jiu.left - rect.left
    const dy = jiu.top - rect.top
    if (dx === 0 && dy === 0) return
    // 先置回旧位置（无过渡），下一帧过渡到自然位置
    c.style.transition = 'none'
    c.style.transform = `translate(${dx}px, ${dy}px)`
    pending.push(c)
  })
  if (pending.length === 0) return
  // 强制重排，确保起始 transform 已生效
  void r.offsetHeight
  requestAnimationFrame(() => {
    for (const c of pending) {
      c.style.transition = 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
      c.style.transform = ''
      const onEnd = () => {
        c.style.transition = ''
        c.style.transform = ''
        c.removeEventListener('transitionend', onEnd)
      }
      c.addEventListener('transitionend', onEnd)
    }
  })
}

function onTuoZhuaiKaiShi(zhuangTai: FenLeiZhuangTai, shiJian?: TuoZhuaiShiJian) {
  tuoZhuaiZhong.value = true
  // 记录拖拽前该分组的 id 顺序（固定原始顺序），用于实时预览与 @end/customUpdate 提交
  tuoZhuaiQianIdShunXu.value[zhuangTai] = fenLeiZu[zhuangTai]
    .map((item) => item.id)
    .filter((id): id is string => !!id)

  // 初始化预览数组为原始顺序副本；拖拽中只改 yuLanShunXu（驱动 v-for 与 FLIP），
  // fenLeiZu(v-model) 保持原始不动，避免库内部 onUpdate 二次换位导致回弹
  yuLanShunXu[zhuangTai] = [...fenLeiZu[zhuangTai]]

  // 源卡片：SortableJS 的 start 事件携带 from，且已给被拖真实卡片挂上 sortable-ghost 类，
  // 其 data-id 即源 id，是真实浏览器下唯一可靠的源。
  const rongQi = (shiJian?.from as HTMLElement | undefined) ?? null
  tuoZhuaiRongQi.value = rongQi
  let beiTuoId: string | null = null
  if (rongQi && typeof rongQi.querySelector === 'function') {
    const beiTuoEl =
      (rongQi.querySelector('.sortable-ghost') as HTMLElement | null) ??
      (rongQi.querySelector('.sortable-chosen') as HTMLElement | null)
    beiTuoId = beiTuoEl?.getAttribute('data-id') ?? null
  }
  // 退化：个别环境 start 仍未带 ghost 类时，退回 oldIndex/oldDraggableIndex
  if (!beiTuoId) {
    const old =
      typeof shiJian?.oldDraggableIndex === 'number'
        ? shiJian.oldDraggableIndex
        : typeof shiJian?.oldIndex === 'number'
          ? shiJian.oldIndex
          : -1
    beiTuoId = old >= 0 && fenLeiZu[zhuangTai][old] ? (fenLeiZu[zhuangTai][old].id ?? null) : null
  }

  const yuanSuoYin = beiTuoId ? tuoZhuaiQianIdShunXu.value[zhuangTai].indexOf(beiTuoId) : -1

  draggingState.value = zhuangTai
  draggingId.value = beiTuoId
  draggingYuanSuoYin.value = yuanSuoYin
  mubiaoSuoYin.value = yuanSuoYin

  // 捕获「固定原始顺序」各卡片中心 Y，供 pointermove 幂等推算落点
  yuanXinZuoBiao.value = buZhuoZhongXin(rongQi)

  // 实时预览：监听指针移动，按落点重排预览顺序（其余卡片由手动 FLIP 做滑动动画）
  window.addEventListener('pointermove', onTuoZhuaiYiDong, { passive: true })
  window.addEventListener('touchmove', onTuoZhuaiYiDong, { passive: true })
}

// 指针移动时，由固定原始顺序幂等重算预览顺序（避免基于已变化的预览顺序叠加导致抖动）
function onTuoZhuaiYiDong(e: Event) {
  const zt = draggingState.value
  const yuanId = draggingId.value
  const yuan = draggingYuanSuoYin.value
  if (zt === null || yuanId === null || yuan < 0) return
  const yuanShiShunXu = tuoZhuaiQianIdShunXu.value[zt]
  if (!yuanShiShunXu.includes(yuanId)) return

  // 退化重捕：若 start 时容器中心捕获失败（极少见），用已记录的容器懒捕获一次
  if (yuanXinZuoBiao.value.length === 0) {
    yuanXinZuoBiao.value = buZhuoZhongXin(tuoZhuaiRongQi.value)
  }
  if (yuanXinZuoBiao.value.length === 0) return

  const yuanShiJian = e as MouseEvent | TouchEvent
  const zhiBiaoY =
    'clientY' in yuanShiJian
      ? yuanShiJian.clientY
      : (yuanShiJian as TouchEvent).changedTouches?.[0]?.clientY
  if (typeof zhiBiaoY !== 'number') return

  const muBiao = jiSuanMuBiaoSuoYin(yuanXinZuoBiao.value, zhiBiaoY, yuan)
  if (muBiao === mubiaoSuoYin.value) return
  mubiaoSuoYin.value = muBiao

  const ids = jiSuanYuLanShunXu(yuanShiShunXu, yuan, muBiao)
  // 重排前先捕获各卡片旧位置（同步、DOM 尚未更新），供手动 FLIP 计算位移
  buZhuoFlipJiuWeiZhi()
  // 仅改写预览数组 yuLanShunXu（驱动 v-for 与 FLIP）；v-model(fenLeiZu) 保持原始不动
  const idDaoJiLu = new Map(fenLeiZu[zt].map((i) => [i.id, i]))
  yuLanShunXu[zt] = ids.map((id) => idDaoJiLu.get(id)).filter((i): i is 档案详情 => !!i)
  // 重排后(nextTick)由手动 FLIP 让兄弟卡片滑动到新位置
  nextTick(yingYongFlip)
}

function chongZhiYuLan() {
  draggingState.value = null
  draggingId.value = null
  draggingYuanSuoYin.value = -1
  mubiaoSuoYin.value = -1
  tuoZhuaiRongQi.value = null
  yuanXinZuoBiao.value = []
}

// 落定权威重排（被 customUpdate 与兜底微任务共用）：以「原始顺序 + 落定索引」一次性重排 v-model(fenLeiZu)，
// 并将预览数组同步为最终顺序（渲染无缝衔接），最后持久化。绝不二次换位。
function yingYongZuiZhongChongPai(zt: FenLeiZhuangTai, oldIdx: number, newIdx: number) {
  const qianZhao = tuoZhuaiQianIdShunXu.value[zt]
  if (
    oldIdx >= 0 &&
    newIdx >= 0 &&
    oldIdx !== newIdx &&
    qianZhao.length > Math.max(oldIdx, newIdx)
  ) {
    const ids = jiSuanYuLanShunXu(qianZhao, oldIdx, newIdx)
    const idDaoJiLu = new Map<string, 档案详情>(fenLeiZu[zt].map((i) => [i.id, i]))
    fenLeiZu[zt] = ids.map((id) => idDaoJiLu.get(id)).filter((i): i is 档案详情 => !!i)
  }
  // 预览与最终一致，避免渲染从预览切回 fenLeiZu 时跳动
  yuLanShunXu[zt] = [...fenLeiZu[zt]]
  const map = huoQuPaiXuMap()
  map[zt] = fenLeiZu[zt].map((item) => item.id).filter((id): id is string => !!id)
  baoCunPaiXuMap(map)
}

// 绑定到 <VueDraggable> 的 :custom-update。库内部 onUpdate 默认会「移除/插回真实 DOM(Ke/Tt)
// + 对 v-model 二次换位(St)」，造成回弹；提供 customUpdate 后该默认逻辑被替换为以下一次性权威重排，
// 且不会触碰真实 DOM（fallback 克隆体的移除由库自行处理），与 Vue 的响应式渲染互不冲突。
function onTuoZhuaiGengXin(evt: TuoZhuaiShiJian) {
  const zt = draggingState.value
  if (!zt) return
  const oldIdx =
    typeof evt.oldDraggableIndex === 'number'
      ? evt.oldDraggableIndex
      : typeof evt.oldIndex === 'number'
        ? evt.oldIndex
        : -1
  const newIdx =
    typeof evt.newDraggableIndex === 'number'
      ? evt.newDraggableIndex
      : typeof evt.newIndex === 'number'
        ? evt.newIndex
        : -1
  yingYongZuiZhongChongPai(zt, oldIdx, newIdx)
  chongZhiYuLan()
}

function onTuoZhuaiJieShu(zhuangTai: FenLeiZhuangTai, shiJian?: TuoZhuaiShiJian) {
  // 先移除实时预览监听，避免拖拽结束后仍触发重排
  window.removeEventListener('pointermove', onTuoZhuaiYiDong)
  window.removeEventListener('touchmove', onTuoZhuaiYiDong)
  tuoZhuaiZhong.value = false
  window.getSelection()?.removeAllRanges()
  // 自动排序维度下拖拽已停用，此时不覆盖用户的手动顺序
  if (!shiFouShouDongPaiXu.value) {
    chongZhiYuLan()
    return
  }

  // 最终重排与持久化交由 customUpdate（库 onUpdate 钩子）在 onEnd 之后统一处理：
  // 该钩子以「原始顺序 + 落定索引」对 v-model(fenLeiZu) 做一次性权威重排，
  // 从根本上避免「预览改写 v-model → 库内部 onUpdate 二次换位」的双重换位回弹。
  // 若本次为原地释放（无重排，customUpdate 不会触发），用微任务兜底复位预览与拖拽态。
  // 兜底：若 customUpdate 因故未触发（极少见），用落定事件索引重排，避免拖拽失效
  Promise.resolve().then(() => {
    if (draggingState.value !== zhuangTai) return
    const oldIdx =
      typeof shiJian?.oldDraggableIndex === 'number'
        ? shiJian.oldDraggableIndex
        : typeof shiJian?.oldIndex === 'number'
          ? shiJian.oldIndex
          : -1
    const newIdx =
      typeof shiJian?.newDraggableIndex === 'number'
        ? shiJian.newDraggableIndex
        : typeof shiJian?.newIndex === 'number'
          ? shiJian.newIndex
          : -1
    yingYongZuiZhongChongPai(zhuangTai, oldIdx, newIdx)
    chongZhiYuLan()
  })
}

onMounted(() => {
  jiaZaiShuJu()
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onTuoZhuaiYiDong)
  window.removeEventListener('touchmove', onTuoZhuaiYiDong)
})

defineExpose({
  fenLeiZu,
  xianShiFenLeiZu,
  paiXuWeiDu,
  paiXuFangXiang,
  qieHuanPaiXuWeiDu,
  qieHuanPaiXuFangXiang,
  tuoZhuaiZhong,
  onTuoZhuaiKaiShi,
  onTuoZhuaiJieShu,
  qieHuanXuanZe,
  qingKongXuanZe,
  quanBuXuanZe,
})
</script>

<style scoped>
.zhanji-yemian {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: transparent;
}

.zhanji-liebiao {
  flex: 1;
  padding: 0 16px 16px;
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

.zhanji-liebiao.tuo-zhuai-zhong {
  user-select: none;
  -webkit-user-select: none;
}

/* 拖拽中：强制卡片提升到独立合成层，确保 TransitionGroup 在「两卡片相邻互换」时
   也能稳定播放 transform FLIP 过渡（避免浏览器合成策略把单槽位移的过渡优化掉）。 */
.zhanji-liebiao.tuo-zhuai-zhong .zhanji-kapian {
  will-change: transform;
  backface-visibility: hidden;
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
  margin-top: 12px;
  margin-bottom: 4px;
  gap: 12px;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.piliang-gongju-lan:not(.piliang-gongju-lan--kong) {
  background: rgba(255, 107, 157, 0.1);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.15);
}

.piliang-gongju-lan--kong {
  opacity: 0.7;
}

.quanju-gouxuan-zu {
  display: flex;
  align-items: center;
  gap: 12px;
}

.xuan-ze-shu-liang {
  font-size: 14px;
  font-weight: 600;
  color: var(--an-niu-bei-jing, #ff6b9d);
}

.xuan-ze-shu-liang--kong {
  color: var(--wenben-ciuse);
  font-weight: 500;
}

.piliang-anniu-zu {
  display: flex;
  align-items: center;
  gap: 8px;
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

.piliang-shanchu-anniu:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.piliang-shanchu-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.quxiao-quanxuan-anniu {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  color: var(--wenben-zhuse);
  transition: all 0.2s ease;
}

.quxiao-quanxuan-anniu:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.quxiao-quanxuan-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.paixu-gongju-lan {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 14px;
}

.paixu-biaoqian {
  font-size: 12px;
  font-weight: 600;
  color: var(--wenben-ciuse);
  flex-shrink: 0;
}

.paixu-weidu-zu {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.paixu-weidu-anniu {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--wenben-ciuse);
  transition: all 0.2s ease;
}

.paixu-weidu-anniu:hover {
  background: rgba(255, 255, 255, 0.16);
  color: var(--wenben-zhuse);
}

.paixu-weidu-anniu--jihuo {
  background: var(--yanse-zhanji-beijing, rgba(255, 107, 157, 0.12));
  color: var(--an-niu-bei-jing, #ff6b9d);
  box-shadow: inset 0 0 0 1px rgba(255, 107, 157, 0.4);
}

.paixu-fangxiang-anniu {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(107, 140, 166, 0.2);
  color: var(--wenben-zhuse);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.paixu-fangxiang-anniu:hover:not(:disabled) {
  background: rgba(107, 140, 166, 0.35);
  transform: translateY(-1px);
}

.paixu-fangxiang-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  cursor: grab;
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.zhanji-kapian.xuanZhong {
  background: var(--yanse-zhanji-beijing, rgba(255, 107, 157, 0.08));
  box-shadow:
    inset 0 0 0 1px rgba(255, 107, 157, 0.4),
    inset 3px 0 0 0 var(--yanse-zhanji, #ff6b9d);
}

.gouxuan-anniu {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1.5px solid var(--biankuang-qianse, #2a3242);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  position: relative;
  padding: 0;
  margin-right: 12px;
}

.gouxuan-anniu:hover {
  border-color: var(--an-niu-bei-jing, #ff6b9d);
  background: rgba(255, 107, 157, 0.06);
}

.gouxuan-anniu:focus-visible {
  outline: 2px solid var(--an-niu-bei-jing, #ff6b9d);
  outline-offset: 2px;
}

.gouxuan-anniu svg {
  width: 14px;
  height: 14px;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.15s ease;
}

.gouxuan-anniu--xuanzhong {
  background: var(--an-niu-bei-jing, #ff6b9d);
  border-color: var(--an-niu-bei-jing, #ff6b9d);
}

.gouxuan-anniu--xuanzhong svg {
  opacity: 1;
  transform: scale(1);
}

.gouxuan-anniu--bufen {
  border-color: var(--an-niu-bei-jing, #ff6b9d);
  background: transparent;
}

.gouxuan-anniu--bufen::after {
  content: '';
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: var(--an-niu-bei-jing, #ff6b9d);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.gouxuan-anniu--bufen svg {
  opacity: 0;
}

.gouxuan-anniu--kapian {
  margin-right: 12px;
  opacity: 0.6;
}

.zhanji-kapian:hover .gouxuan-anniu--kapian,
.gouxuan-anniu--kapian:focus-visible,
.gouxuan-anniu--kapian.gouxuan-anniu--xuanzhong {
  opacity: 1;
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

.zhanji-kapian.sortable-ghost {
  /* 实时预览：被拖卡片的「落点空位」——霓虹虚线轮廓，隐藏卡片内容，仅作落点提示 */
  background: rgba(255, 107, 157, 0.06) !important;
  border: 1.5px dashed rgba(255, 107, 157, 0.75) !important;
  box-shadow:
    0 0 0 4px rgba(255, 107, 157, 0.1),
    0 10px 26px rgba(255, 107, 157, 0.2) !important;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease !important;
  pointer-events: none;
  /* Req1：拖拽预览空位同样禁止选中文字 */
  user-select: none;
  -webkit-user-select: none;
}

.zhanji-kapian.sortable-ghost > * {
  opacity: 0 !important;
}

.zhanji-kapian.sortable-chosen {
  cursor: grabbing;
  user-select: none;
  -webkit-user-select: none;
}

/* 实时预览：TransitionGroup 在模型重排时给移动的卡片加 .zhanji-kapian-move，
   这里用 transform 过渡实现「其它卡片实时滑动让位」的 FLIP 动画（force-fallback 下库自身不提供）。 */
.zhanji-kapian-move {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.zhanji-kapian.sortable-drag {
  background: rgba(255, 255, 255, 0.14) !important;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 107, 157, 0.4) !important;
  transform: rotate(2deg) scale(1.02);
  opacity: 1 !important;
  cursor: grabbing !important;
  border-radius: 16px;
  /* Req1：拖拽过程中禁止选中文字 */
  user-select: none;
  -webkit-user-select: none;
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

@media (prefers-reduced-motion: reduce) {
  .zhanji-kapian,
  .gouxuan-anniu,
  .gouxuan-anniu svg {
    transition-duration: 0.01ms !important;
  }
  .zhanji-kapian.sortable-drag {
    transform: none !important;
  }
  .zhanji-kapian.sortable-ghost {
    transform: none !important;
    box-shadow: none !important;
  }
  .zhanji-kapian-move {
    transition: none !important;
  }
}
</style>
