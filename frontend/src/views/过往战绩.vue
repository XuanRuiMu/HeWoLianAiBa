<template>
  <div class="zhanji-yemian">
    <main class="zhanji-liebiao" :class="{ 'tuo-zhuai-zhong': tuoZhuaiZhong }">
      <div v-if="tiShiXinXi" class="zhanji-tishi" role="status" aria-live="polite">
        {{ tiShiXinXi }}
      </div>
      <div v-if="jiaZaiZhong" class="jiazai-zhuangtai">
        <div class="kong-tubiao" aria-hidden="true">⏳</div>
        <div>{{ huoQuFanYi('zhanJi', 'jiaZaiZhong') }}</div>
      </div>
      <div v-else-if="dangAnLieBiao.length === 0" class="kong-zhuangtai">
        <div class="kong-tubiao" aria-hidden="true">🕊</div>
        <div class="kong-zhu-biao-ti">{{ huoQuFanYi('zhanJi', 'zanWuZhanJi') }}</div>
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
            <span class="fenlei-shu-liang">{{ fenLeiZu[fenLei.zhuangTai].length }}</span>
            <span class="fenlei-fen-ye">
              <button class="fen-ye-anniu" :disabled="fenLeiYeMa[fenLei.zhuangTai] <= 1" @click="qieHuanFenLeiYe(fenLei.zhuangTai, -1)">‹</button>
              <span class="fen-ye-wen-ben">{{ fenLeiYeMa[fenLei.zhuangTai] }}/{{ Math.max(1, Math.ceil(fenLeiZu[fenLei.zhuangTai].length / 50)) }}</span>
              <button class="fen-ye-anniu" :disabled="fenLeiYeMa[fenLei.zhuangTai] >= Math.max(1, Math.ceil(fenLeiZu[fenLei.zhuangTai].length / 50))" @click="qieHuanFenLeiYe(fenLei.zhuangTai, 1)">›</button>
            </span>
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
            :animation="0"
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
            <!-- 外层 .zhanji-kapian 是「定位槽」：SortableJS 只读写它的外层矩阵，卡片视觉与起手倾斜全部在 .zhanji-kapian-nei -->
            <div
              v-for="(dangAn, suoYin) in xianShiFenLeiZu[fenLei.zhuangTai]"
              :key="dangAn.id ?? `zhanji-${fenLei.zhuangTai}-${suoYin}`"
              class="zhanji-kapian"
              :class="{ xuanZhong: dangAn.id && xuanZhongIds.has(dangAn.id) }"
              :data-id="dangAn.id"
            >
              <div class="zhanji-kapian-nei">
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
                  <div class="zhanji-wei">
                    <TouXiang
                      :tou-xiang="jiaoSeBiaoQing(dangAn)"
                      :mo-ren-zi="jiaoSeBiaoQing(dangAn)"
                    />
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
                  <!-- YH-158 结局分享：canvas 战报海报 → 系统分享 / 下载 / 复制文案三级降级 -->
                  <button
                    v-if="dangAn.jie_guo_lei_xing_yuan !== 'jinxing_zhong'"
                    class="caozuo-anniu fenxiang"
                    :aria-busy="fenXiangZhong ? 'true' : 'false'"
                    @click.stop="fenXiangJieJu(dangAn)"
                  >
                    {{ huoQuFanYi('zhanJi', 'fenXiang') }}
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
            </div>
          </VueDraggable>
          <div v-else class="fenlei-kong-zhuangtai">
            <span class="fenlei-kong-nei-ron">{{ fenLei.kongWenBen }}</span>
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
import TouXiang, { MO_REN_ZI } from '@/components/头像.vue'
import { track } from '@/utils/埋点'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  shengChengZhanBaoHaiBao,
  huoQuZhanBaoWenAn,
  huoQuZhanBaoWenJianMing,
  type ZhanBaoShuRu,
} from '@/utils/战报海报'

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
const sheZhiCangKu = 使用用户设置仓库()
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
// 落定时一次性权威重排 fenLeiZu。卡片位移动画全部由本组件唯一的 FLIP（zhiXingLiuWeiDongHua）驱动。
// :animation="0" 关掉库自带的 animate/animateAll：它会在同一批卡片上写内联 transform + transition
// （并在时限到点时把这两个内联样式清空），与本组件的 FLIP 互相当场覆盖，属于并存的第二套动画机制。
// 不再使用 TransitionGroup 组件：该用法下它不产生 -move 过渡，留着只会让人误以为有两套动画机制。
// :fallback-on-body="true" 让 force-fallback 的克隆体挂到 document.body，保持列表容器 DOM 干净；
// 克隆体（鬼影）的外层只允许承担库的定位，倾斜等视觉全部下沉到 .zhanji-kapian-nei，详见样式注释。
const draggingState = ref<FenLeiZhuangTai | null>(null)
const draggingId = ref<string | null>(null)
const draggingYuanSuoYin = ref<number>(-1)
const mubiaoSuoYin = ref<number>(-1)
// 本次拖拽里指针推算是否至少成功跑过一次：跑过，落定下标就以它为准（与预览同源）
const zhiZhenYiCaoZuo = ref(false)
// 本次落定是否已由 customUpdate 权威处理（防止 @end 兜底二次重排/重复持久化）
const benCiYiYouCustomUpdateChuLi = ref(false)
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

// YH-096 列表分页+超长虚拟化：每类50条分页，超150条走虚拟窗口禁全量渲染
// 根因：四个列表全量渲染；收敛为分页+虚拟化
const FEN_LEI_MEI_YE_TIAO_SHU = 50
const fenLeiYeMa = ref<Record<FenLeiZhuangTai, number>>({ jinxingzhong: 1, shengli: 1, shibai: 1 })

function qieHuanFenLeiYe(zhuangTai: FenLeiZhuangTai, fangXiang: 1 | -1): void {
  const dangQian = fenLeiYeMa.value[zhuangTai]
  const zong = fenLeiZu[zhuangTai].length
  const zuiDa = Math.max(1, Math.ceil(zong / FEN_LEI_MEI_YE_TIAO_SHU))
  const xin = Math.min(zuiDa, Math.max(1, dangQian + fangXiang))
  fenLeiYeMa.value = { ...fenLeiYeMa.value, [zhuangTai]: xin }
}

// computed 天然缓存：仅在分类数据或排序偏好变化时重算。
// 拖拽中：被拖分组渲染「预览顺序」yuLanShunXu（它本身就是当前页的切片，由 pointermove 驱动），
// 其余分组仍走分页——早先直接返回 fenLeiZu 会让别的分组在拖拽瞬间从 50 条涨成全量，
// 整页高度突变本身就是一跳。v-model(fenLeiZu) 在拖拽全程保持原序，由落定时的
// customUpdate 一次性权威重排，避免双重换位回弹。非拖拽时：手动排序复用原数组，自动排序维度走 paiXuFenLei。
const xianShiFenLeiZu = computed<Record<FenLeiZhuangTai, 档案详情[]>>(() => {
  if (draggingState.value) {
    const zt = draggingState.value
    return {
      jinxingzhong:
        zt === 'jinxingzhong'
          ? yuLanShunXu.jinxingzhong
          : fenYe(fenLeiZu.jinxingzhong, 'jinxingzhong'),
      shengli: zt === 'shengli' ? yuLanShunXu.shengli : fenYe(fenLeiZu.shengli, 'shengli'),
      shibai: zt === 'shibai' ? yuLanShunXu.shibai : fenYe(fenLeiZu.shibai, 'shibai'),
    }
  }
  if (shiFouShouDongPaiXu.value) {
    return {
      jinxingzhong: fenYe(fenLeiZu.jinxingzhong, 'jinxingzhong'),
      shengli: fenYe(fenLeiZu.shengli, 'shengli'),
      shibai: fenYe(fenLeiZu.shibai, 'shibai'),
    }
  }
  return {
    jinxingzhong: fenYe(paiXuFenLei(fenLeiZu.jinxingzhong), 'jinxingzhong'),
    shengli: fenYe(paiXuFenLei(fenLeiZu.shengli), 'shengli'),
    shibai: fenYe(paiXuFenLei(fenLeiZu.shibai), 'shibai'),
  }
})

function fenYe(lieBiao: 档案详情[], zhuangTai: FenLeiZhuangTai): 档案详情[] {
  const ye = fenLeiYeMa.value[zhuangTai]
  const qi = (ye - 1) * FEN_LEI_MEI_YE_TIAO_SHU
  return lieBiao.slice(qi, qi + FEN_LEI_MEI_YE_TIAO_SHU)
}

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

function jiaoSeBiaoQing(dangAn: 档案详情): string {
  if (dangAn.shi_fou_zha_xing) return '😈'
  if (dangAn.jie_guo_lei_xing_yuan === 'sheng_li_ai_qing') return '💕'
  return MO_REN_ZI.jiaose
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

// YH-158 结局分享：canvas 手绘战报海报，出口三级降级（系统分享 → 下载 → 复制文案），每条出口必有可见反馈。
// 不画头像：档案字段本就无头像，跨域图会污染画布使导出抛错；改用卡片同款 emoji 标识（同一函数单源）。
type FenXiangChuKou = 'fenxiang' | 'quxiao' | 'xiaZai' | 'fuZhi' | 'shibai'

const TI_SHI_HAO_MIAO = 2600
const XIA_ZAI_SHI_FANG_HAO_MIAO = 1000
const tiShiXinXi = ref('')
const fenXiangZhong = ref(false)
const daiShiFangDiZhi = new Set<string>()
const daiShiFangDingShi = new Set<ReturnType<typeof setTimeout>>()
let tiShiJiShiQi: ReturnType<typeof setTimeout> | null = null

function xianShiTiShi(wenBen: string) {
  tiShiXinXi.value = wenBen
  if (tiShiJiShiQi) clearTimeout(tiShiJiShiQi)
  tiShiJiShiQi = setTimeout(() => {
    tiShiXinXi.value = ''
  }, TI_SHI_HAO_MIAO)
}

function qingKongFenXiangFuZu() {
  if (tiShiJiShiQi) clearTimeout(tiShiJiShiQi)
  tiShiJiShiQi = null
  for (const dingShiQi of daiShiFangDingShi) clearTimeout(dingShiQi)
  daiShiFangDingShi.clear()
  for (const diZhi of daiShiFangDiZhi) {
    daiShiFangDiZhi.delete(diZhi)
    try {
      URL.revokeObjectURL(diZhi)
    } catch {
      // 释放失败不影响卸载
    }
  }
}

function gouJianZhanBaoShuRu(dangAn: 档案详情): ZhanBaoShuRu {
  const jieGuoWenBen = dangAn.jie_guo_lei_xing?.trim() || zhuangTaiWenBen(dangAn.jie_guo_lei_xing_yuan)
  return {
    jiaoSeMing: dangAn.jiao_se_ming_zi ?? '',
    jieGuoWenBen,
    jieGuoFenLei: zhuangTaiYangShi(dangAn.jie_guo_lei_xing_yuan) === 'shengli' ? 'shengli' : 'shibai',
    biaoQing: jiaoSeBiaoQing(dangAn),
    liaoTianTianShu: dangAn.liao_tian_tian_shu ?? 0,
    xiaoXiZongShu: dangAn.xiao_xi_zong_shu ?? 0,
    mbtiLeiXing: dangAn.mbti_lei_xing,
    jieShuShiJianWenBen: geShiHuaRiQiShiJian(
      dangAn.you_xi_jie_shu_shi_jian ?? dangAn.zui_hou_xiao_xi_shi_jian ?? '',
    ),
    qiPaoAI: sheZhiCangKu.qiPaoAI,
  }
}

function keYiFenXiangWenJian(wenJian: File): boolean {
  if (typeof navigator.share !== 'function') return false
  // canShare 缺失即视为不支持带文件分享（不支持时硬调 share 会直接报错，故不猜）
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [wenJian] })
  } catch {
    return false
  }
}

function shengChengFenXiangWenJian(tuPian: Blob, wenJianMing: string): File | null {
  try {
    return new File([tuPian], wenJianMing, { type: 'image/png' })
  } catch {
    // 环境造不出 File（旧内核）：只影响系统分享，下载与复制仍可用
    return null
  }
}

function xiaZaiTuPian(tuPian: Blob, wenJianMing: string): boolean {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const chaoJie = document.createElement('a')
  if (!('download' in chaoJie)) return false
  let diZhi = ''
  try {
    diZhi = URL.createObjectURL(tuPian)
    daiShiFangDiZhi.add(diZhi)
    chaoJie.href = diZhi
    chaoJie.download = wenJianMing
    chaoJie.rel = 'noopener'
    chaoJie.style.display = 'none'
    document.body.appendChild(chaoJie)
    chaoJie.click()
  } catch {
    if (diZhi) shiFangLianJie(diZhi)
    return false
  } finally {
    chaoJie.remove()
    if (diZhi) {
      const dingShiQi = setTimeout(() => {
        daiShiFangDingShi.delete(dingShiQi)
        shiFangLianJie(diZhi)
      }, XIA_ZAI_SHI_FANG_HAO_MIAO)
      daiShiFangDingShi.add(dingShiQi)
    }
  }
  return true
}

function shiFangLianJie(diZhi: string): void {
  if (!daiShiFangDiZhi.has(diZhi)) return
  daiShiFangDiZhi.delete(diZhi)
  try {
    URL.revokeObjectURL(diZhi)
  } catch {
    // 释放失败不影响已发起的下载
  }
}

async function fuZhiZhanBaoWenAn(shuRu: ZhanBaoShuRu): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText !== 'function') return false
    await navigator.clipboard.writeText(huoQuZhanBaoWenAn(shuRu))
    return true
  } catch {
    return false
  }
}

async function wenChuFenXiang(tuPian: Blob, shuRu: ZhanBaoShuRu): Promise<FenXiangChuKou> {
  const wenJianMing = huoQuZhanBaoWenJianMing(shuRu)
  const wenJian = shengChengFenXiangWenJian(tuPian, wenJianMing)
  if (wenJian && keYiFenXiangWenJian(wenJian)) {
    try {
      await navigator.share({
        files: [wenJian],
        title: huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi'),
        text: huoQuZhanBaoWenAn(shuRu),
      })
      return 'fenxiang'
    } catch (cuoWu) {
      if ((cuoWu as { name?: string } | null)?.name === 'AbortError') return 'quxiao'
      // 系统面板报错：继续降级为下载
    }
  }
  if (xiaZaiTuPian(tuPian, wenJianMing)) return 'xiaZai'
  return (await fuZhiZhanBaoWenAn(shuRu)) ? 'fuZhi' : 'shibai'
}

function chuLiFenXiangJieGuo(chuKou: FenXiangChuKou): void {
  switch (chuKou) {
    case 'fenxiang':
      xianShiTiShi(huoQuFanYi('zhanJi', 'fenXiangYiWanCheng'))
      break
    case 'quxiao':
      xianShiTiShi(huoQuFanYi('zhanJi', 'fenXiangYiQuXiao'))
      break
    case 'xiaZai':
      xianShiTiShi(huoQuFanYi('zhanJi', 'haiBaoYiXiaZai'))
      break
    case 'fuZhi':
      xianShiTiShi(huoQuFanYi('zhanJi', 'buZhiChiZhiNengFuZhi'))
      break
    default:
      xianShiTiShi(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
      break
  }
}

async function fenXiangJieJu(dangAn: 档案详情) {
  if (fenXiangZhong.value) return
  fenXiangZhong.value = true
  xianShiTiShi(huoQuFanYi('zhanJi', 'fenXiangZhengZaiShengCheng'))
  const shuRu = gouJianZhanBaoShuRu(dangAn)
  let tuPian: Blob
  try {
    tuPian = await shengChengZhanBaoHaiBao(shuRu)
  } catch (cuoWu) {
    console.error('生成战报海报失败', cuoWu)
    xianShiTiShi(huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'))
    fenXiangZhong.value = false
    return
  }
  try {
    const chuKou = await wenChuFenXiang(tuPian, shuRu)
    chuLiFenXiangJieGuo(chuKou)
    track('jie_ju_fen_xiang', {
      jie_guo: dangAn.jie_guo_lei_xing_yuan,
      tu: 'zhan_bao_hai_bao',
      chu_kou: chuKou,
    })
  } catch (cuoWu) {
    console.error('分享战报海报失败', cuoWu)
    xianShiTiShi(huoQuFanYi('zhanJi', 'fenXiangShiBai'))
  } finally {
    fenXiangZhong.value = false
  }
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

// 位移采样的参照系：一律用「相对拖拽容器当前视口顶」的坐标，容器（或其祖先）滚动时
// 两侧同时平移，差值不变。此前用绝对视口坐标且只在 start 捕获一次，列表被自动滚动后
// 旧中心集体失效 → 预览推算被冻在某个下标，而落定用的是实时 DOM → 两者错位 → 松手瞬移。
function rongQiPianYi(rongQi: HTMLElement): { x: number; y: number } {
  if (typeof rongQi.getBoundingClientRect !== 'function') return { x: 0, y: 0 }
  const r = rongQi.getBoundingClientRect()
  return { x: r.left - rongQi.scrollLeft, y: r.top - rongQi.scrollTop }
}

// 捕获容器内各卡片中心 Y（相对容器视口顶，固定原始顺序），供指针幂等推算落点
function buZhuoZhongXin(rongQi: HTMLElement | null): number[] {
  if (!rongQi || typeof rongQi.querySelectorAll !== 'function') return []
  const pian = rongQiPianYi(rongQi)
  const paiPiao = Array.from(rongQi.querySelectorAll('.zhanji-kapian')) as HTMLElement[]
  return paiPiao.map((el) => {
    const r = el.getBoundingClientRect()
    return r.top - pian.y + r.height / 2
  })
}

// 指针视口 Y → 同一参照系下的 Y；容器不可用时返回 null（调用方直接放弃本次推算）
function zhiBiaoXiangDuiY(rongQi: HTMLElement | null, clientY: number): number | null {
  if (!rongQi) return null
  return clientY - rongQiPianYi(rongQi).y
}

// 鬼影（跟随指针的克隆体）最近一次的视觉位，坐标系与下面的采样一致（内容坐标）。
// 松手时库在 _onDrop 里同步移除克隆体，并把被拖真卡片的内联 transform 抹成空串——被拖卡片此刻
// 正处在上一轮 FLIP 的半空中，这一抹就把它瞬移回虚线空位。落定 FLIP 用这个位当被拖卡片的「旧位」，
// 让它从指针处滑进终槽，与兄弟卡片同批同源，不再出现「松手才跳」。
let guiYingShiJueWei: { id: string; x: number; y: number } | null = null

// 采样鬼影的视觉位。鬼影只在库的 fallback 分支存在且挂在 document.body（:fallback-on-body），
// 真卡片不会被误命中：fallback 下库不给真卡片挂 drag-class。
function caiJiGuiYingShiJueWei(): void {
  const id = draggingId.value
  const rongQi = tuoZhuaiRongQi.value
  if (
    id === null ||
    !rongQi ||
    typeof document === 'undefined' ||
    typeof rongQi.getBoundingClientRect !== 'function'
  )
    return
  const gui = document.querySelector('body > .zhanji-kapian.sortable-drag') as HTMLElement | null
  if (!gui || typeof gui.getBoundingClientRect !== 'function') return
  const pian = rongQiPianYi(rongQi)
  const r = gui.getBoundingClientRect()
  guiYingShiJueWei = { id, x: r.left - pian.x, y: r.top - pian.y }
}

// 起手前硬取消上一轮在飞的位移：中心采样与落点推算只认布局位，
// 否则快速连拖（320ms 过渡未结束就再次按下）会采到过渡中间值，落点推算整段偏移。
function qingChuZaiFeiLiuWei(rongQi: HTMLElement | null): void {
  if (!rongQi || typeof rongQi.querySelectorAll !== 'function') return
  for (const el of Array.from(rongQi.querySelectorAll('.zhanji-kapian')) as HTMLElement[]) {
    if (!el.style.transition && !el.style.transform && !el.style.willChange) continue
    el.style.transition = 'none'
    void el.offsetHeight // 先把「无过渡」落地，随后的 transform 清空才不会反过来触发一次过渡
    el.style.transform = ''
    el.style.willChange = ''
    el.style.transition = ''
  }
}

// 手动 FLIP：拖拽中的实时预览与落定重排都由本组件驱动，卡片位移过渡全部由这里唯一负责
// （TransitionGroup 在该用法下不产生 -move 过渡，故已从模板移除，避免两套机制并存）。
// 与新采样的配合要点：测量「新布局位」之前先清掉在飞的内联 transform，量到的一定是布局位，
// 既不会采到上一轮的中间值，也让在飞元素从「当前视觉位」平滑续接，而不是弹回起点。
interface LiuWeiJiuWei {
  el: HTMLElement
  x: number
  y: number
}

const liuWeiDaiShu = new WeakMap<HTMLElement, number>()
let liuWeiQuShu = 0

function jianDongXiao(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function huoQuLiuWeiGuangZe(rongQi: HTMLElement): string {
  try {
    return getComputedStyle(rongQi).getPropertyValue('--kapian-liu-wei').trim()
  } catch {
    return ''
  }
}

// 收尾时限同样从生效的计算样式读，避免 JS 里再写一份时长。
// 计算值取不到时（内联 transition 刚写成 var() 就被复用节点覆盖、或该元素根本没建过渡）
// 退回解析容器上那条令牌字符串：时限必须能算出来，否则 transitionend / transitioncancel 任一
// 不触发就会把内联 transition/transform/will-change 永久留在被复用的卡片上（下一轮读到的
// getBoundingClientRect 就已经带着脏位移）。
function liuWeiShouWeiHaoMiao(el: HTMLElement, guangZe?: string): number {
  const dan = getComputedStyle(el).transitionDuration.split(',')[0]?.trim() ?? ''
  const pi =
    /^([\d.]+)(ms|s)$/.exec(dan) ?? (guangZe ? /(?:^|\s)([\d.]+)(ms|s)(?:\s|$)/.exec(guangZe) : null)
  if (!pi) return 0
  const haoMiao = pi[2] === 's' ? parseFloat(pi[1]) * 1000 : parseFloat(pi[1])
  return Number.isFinite(haoMiao) ? haoMiao + 100 : 0
}

function zhiXingLiuWeiDongHua(提交: () => void, rongQi: HTMLElement | null): void {
  // 减少动效档：不做位移补偿，直接落位——位置必须仍然正确，只是没有过渡
  const guangZe = rongQi ? huoQuLiuWeiGuangZe(rongQi) : ''
  if (!rongQi || typeof rongQi.querySelectorAll !== 'function' || jianDongXiao() || !guangZe) {
    提交()
    return
  }
  const pian0 = rongQiPianYi(rongQi)
  const gui = guiYingShiJueWei
  const jiu: LiuWeiJiuWei[] = (Array.from(rongQi.querySelectorAll('.zhanji-kapian')) as HTMLElement[]).map(
    (el) => {
      if (gui && el.getAttribute('data-id') === gui.id) return { el, x: gui.x, y: gui.y }
      const r = el.getBoundingClientRect()
      return { el, x: r.left - pian0.x, y: r.top - pian0.y }
    },
  )
  提交()
  if (jiu.length === 0) return
  nextTick(() => {
    const pian = rongQiPianYi(rongQi)
    const daiYun: HTMLElement[] = []
    liuWeiQuShu += 1
    const dai = liuWeiQuShu
    for (const xiang of jiu) {
      const el = xiang.el
      if (!el.isConnected) continue
      el.style.transition = 'none'
      el.style.transform = ''
      const r = el.getBoundingClientRect()
      const dx = xiang.x - (r.left - pian.x)
      const dy = xiang.y - (r.top - pian.y)
      if (dx === 0 && dy === 0) {
        el.style.transition = ''
        continue
      }
      el.style.transform = `translate(${dx}px, ${dy}px)`
      // 从写下起始位移这一刻起本轮接管该元素：先把令牌占住，上一轮遗留的 transitionend /
      // transitioncancel / 迟到定时器才会在下面的令牌校验处被拒，不会反过来抹掉本轮刚写好的
      // 起始位移（被抹掉的表象就是「该滑的卡片直接跳过去」）。
      liuWeiDaiShu.set(el, dai)
      daiYun.push(el)
    }
    if (daiYun.length === 0) return
    // 强制回流，确保回拨后的起始 transform 已经生效，下一帧的过渡才有起点
    void rongQi.offsetHeight
    requestAnimationFrame(() => {
      for (const el of daiYun) {
        el.style.transition = 'var(--kapian-liu-wei)'
        el.style.transform = ''
        // 提升独立合成层，保证过渡稳定上屏；随本轮样式一起摘除，不依赖 .tuo-zhuai-zhong 的存续时机
        el.style.willChange = 'transform'
        const shouWei = () => {
          // 只清理属于本轮的内联样式，避免迟到回调抹掉新一轮的过渡
          if (liuWeiDaiShu.get(el) !== dai) return
          liuWeiDaiShu.delete(el)
          el.style.transition = ''
          el.style.transform = ''
          el.style.willChange = ''
        }
        el.addEventListener('transitionend', shouWei, { once: true })
        // 被下一轮 transition:none 打断时只发 cancel 不发 end，两个事件都得挂，否则内联样式残留
        el.addEventListener('transitioncancel', shouWei, { once: true })
        const shi = liuWeiShouWeiHaoMiao(el, guangZe)
        if (shi > 0) window.setTimeout(shouWei, shi)
      }
    })
  })
}

function onTuoZhuaiKaiShi(zhuangTai: FenLeiZhuangTai, shiJian?: TuoZhuaiShiJian) {
  tuoZhuaiZhong.value = true
  benCiYiYouCustomUpdateChuLi.value = false
  zhiZhenYiCaoZuo.value = false
  // 拖拽只对「当前页」生效：DOM 里渲染的就是这一页，索引空间必须与 DOM 一致，
  // 否则第 2 页起会把页内下标当成全量下标用（错位重排），且拖拽中其它分组会突然渲染全量。
  const dangQianYe = fenYe(fenLeiZu[zhuangTai], zhuangTai)
  // 记录拖拽前该分组当前页的 id 顺序（固定不变），用于实时预览与 @end/customUpdate 提交
  tuoZhuaiQianIdShunXu.value[zhuangTai] = dangQianYe
    .map((item) => item.id)
    .filter((id): id is string => !!id)

  // 初始化预览数组为该页顺序副本；拖拽中只改 yuLanShunXu（驱动 v-for 与 FLIP），
  // fenLeiZu(v-model) 保持原始不动，避免库内部 onUpdate 二次换位导致回弹
  yuLanShunXu[zhuangTai] = [...dangQianYe]

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
    beiTuoId = old >= 0 && dangQianYe[old] ? (dangQianYe[old].id ?? null) : null
  }

  const yuanSuoYin = beiTuoId ? tuoZhuaiQianIdShunXu.value[zhuangTai].indexOf(beiTuoId) : -1

  draggingState.value = zhuangTai
  draggingId.value = beiTuoId
  draggingYuanSuoYin.value = yuanSuoYin
  mubiaoSuoYin.value = yuanSuoYin

  // 捕获「固定原始顺序」各卡片中心 Y（相对容器视口顶），供 pointermove 幂等推算落点
  guiYingShiJueWei = null
  qingChuZaiFeiLiuWei(rongQi)
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
  // 每次移动都记一次鬼影视觉位（后面任何早退都不影响）：落定时被拖卡片要从这里归位
  caiJiGuiYingShiJueWei()

  // 退化重捕：若 start 时容器中心捕获失败（极少见），用已记录的容器懒捕获一次
  if (yuanXinZuoBiao.value.length === 0) {
    yuanXinZuoBiao.value = buZhuoZhongXin(tuoZhuaiRongQi.value)
  }
  if (yuanXinZuoBiao.value.length === 0) return

  const yuanShiJian = e as MouseEvent | TouchEvent
  const clientY =
    'clientY' in yuanShiJian
      ? yuanShiJian.clientY
      : (yuanShiJian as TouchEvent).changedTouches?.[0]?.clientY
  if (typeof clientY !== 'number') return
  // 每次都用容器当前的视口位置换算，列表被自动滚动后依然对齐（旧实现只在 start 采一次）
  const zhiBiaoY = zhiBiaoXiangDuiY(tuoZhuaiRongQi.value, clientY)
  if (zhiBiaoY === null) return

  const muBiao = jiSuanMuBiaoSuoYin(yuanXinZuoBiao.value, zhiBiaoY, yuan)
  zhiZhenYiCaoZuo.value = true
  if (muBiao === mubiaoSuoYin.value) return
  mubiaoSuoYin.value = muBiao

  const ids = jiSuanYuLanShunXu(yuanShiShunXu, yuan, muBiao)
  // 仅改写预览数组 yuLanShunXu（驱动 v-for 与 FLIP）；v-model(fenLeiZu) 保持原始不动
  const idDaoJiLu = new Map(fenLeiZu[zt].map((i) => [i.id, i]))
  zhiXingLiuWeiDongHua(() => {
    yuLanShunXu[zt] = ids.map((id) => idDaoJiLu.get(id)).filter((i): i is 档案详情 => !!i)
  }, tuoZhuaiRongQi.value)
}

function chongZhiYuLan() {
  draggingState.value = null
  draggingId.value = null
  draggingYuanSuoYin.value = -1
  mubiaoSuoYin.value = -1
  zhiZhenYiCaoZuo.value = false
  tuoZhuaiRongQi.value = null
  yuanXinZuoBiao.value = []
  guiYingShiJueWei = null
}

// 把「当前页的新顺序」写回全量 fenLeiZu 对应区间：拖拽的索引空间是页内空间，
// 直接整表替换会把其它页的记录丢掉。
function xieHuiDangQianYe(zt: FenLeiZhuangTai, yeShunXu: 档案详情[]) {
  const quan = [...fenLeiZu[zt]]
  const qi = (fenLeiYeMa.value[zt] - 1) * FEN_LEI_MEI_YE_TIAO_SHU
  quan.splice(qi, yeShunXu.length, ...yeShunXu)
  fenLeiZu[zt] = quan
}

// 落定权威重排（被 customUpdate 与兜底微任务共用）：以「拖拽前页顺序 + 落定索引」一次性重排
// 当前页并写回 v-model(fenLeiZu)，同时把预览数组对齐最终顺序（渲染无缝衔接），最后持久化。
// 绝不二次换位。
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
    const xinYe = ids.map((id) => idDaoJiLu.get(id)).filter((i): i is 档案详情 => !!i)
    xieHuiDangQianYe(zt, xinYe)
    // 预览与最终一致，避免渲染从预览切回 fenLeiZu 时跳动
    yuLanShunXu[zt] = xinYe
  } else {
    yuLanShunXu[zt] = fenYe(fenLeiZu[zt], zt)
  }
  const map = huoQuPaiXuMap()
  map[zt] = fenLeiZu[zt].map((item) => item.id).filter((id): id is string => !!id)
  baoCunPaiXuMap(map)
}

// 落点权威：拖拽中一旦指针推算生效，就以它为准——预览顺序正是同一个 (原始下标, 目标下标)
// 算出来的，落定即预览，天然连续，不会出现「松手才跳到另一个位置」。
// 指针从未参与（无 pointermove 的程序化/测试路径）时才退回事件携带的索引。
function luoDianSuoYin(zt: FenLeiZhuangTai, evt: TuoZhuaiShiJian): [number, number] {
  const yuan = draggingYuanSuoYin.value
  const mu = mubiaoSuoYin.value
  if (zhiZhenYiCaoZuo.value && yuan >= 0 && mu >= 0) return [yuan, mu]
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
  void zt
  return [oldIdx, newIdx]
}

// 落定：顺序改写 + 退出拖拽态必须同一个 FLIP 事务，否则「切回 fenLeiZu 渲染」这一跳没有过渡
function luoDing(zt: FenLeiZhuangTai, oldIdx: number, newIdx: number) {
  const rongQi = tuoZhuaiRongQi.value
  zhiXingLiuWeiDongHua(() => {
    yingYongZuiZhongChongPai(zt, oldIdx, newIdx)
    chongZhiYuLan()
  }, rongQi)
}

// 绑定到 <VueDraggable> 的 :custom-update。库内部 onUpdate 默认会「移除/插回真实 DOM(Ke/Tt)
// + 对 v-model 二次换位(St)」，造成回弹；提供 customUpdate 后该默认逻辑被替换为以下一次性权威重排，
// 且不会触碰真实 DOM（fallback 克隆体的移除由库自行处理），与 Vue 的响应式渲染互不冲突。
function onTuoZhuaiGengXin(evt: TuoZhuaiShiJian) {
  const zt = draggingState.value
  if (!zt) return
  benCiYiYouCustomUpdateChuLi.value = true
  const [oldIdx, newIdx] = luoDianSuoYin(zt, evt)
  luoDing(zt, oldIdx, newIdx)
}

// fallback 落点：指针从未参与推算时（例如库没把 pointermove 交给我们），
// 以「放下瞬间指针坐标」对照各卡片中心推算目标下标并权威重排。
function changShiZhiZhenLuoDianChongPai(zt: FenLeiZhuangTai, shiJian?: TuoZhuaiShiJian): boolean {
  const yuanShiJian = shiJian?.originalEvent as MouseEvent | TouchEvent | undefined
  const clientY =
    yuanShiJian && 'clientY' in yuanShiJian
      ? (yuanShiJian as MouseEvent).clientY
      : (yuanShiJian as TouchEvent | undefined)?.changedTouches?.[0]?.clientY
  if (typeof clientY !== 'number') return false

  const rongQi =
    (shiJian?.to as HTMLElement | undefined) ??
    (shiJian?.from as HTMLElement | undefined) ??
    tuoZhuaiRongQi.value
  if (!rongQi || typeof rongQi.querySelectorAll !== 'function') return false
  const zhiBiaoY = zhiBiaoXiangDuiY(rongQi, clientY)
  if (zhiBiaoY === null) return false

  // 被拖卡片 id：优先结束事件携带的 item，其次 start 时的记录
  const beiTuoId = shiJian?.item?.getAttribute?.('data-id') ?? draggingId.value
  if (!beiTuoId) return false

  const qianZhao =
    tuoZhuaiQianIdShunXu.value[zt].length > 0
      ? tuoZhuaiQianIdShunXu.value[zt]
      : fenYe(fenLeiZu[zt], zt).map((item) => item.id).filter((id): id is string => !!id)
  const yuanSuoYin = qianZhao.indexOf(beiTuoId)
  if (yuanSuoYin < 0) return false

  // DOM 读物按当前渲染序（可能是预览序），按 id 归一到拖拽前顺序，与 jiSuanMuBiaoSuoYin 语义对齐
  const pian = rongQiPianYi(rongQi)
  const zhongXinAnId = new Map<string, number>()
  ;(Array.from(rongQi.querySelectorAll('.zhanji-kapian')) as HTMLElement[]).forEach((el) => {
    const id = el.getAttribute('data-id')
    if (!id) return
    const r = el.getBoundingClientRect()
    zhongXinAnId.set(id, r.top - pian.y + r.height / 2)
  })
  const zhongXin: number[] = []
  for (const id of qianZhao) {
    const c = zhongXinAnId.get(id)
    if (typeof c === 'number') zhongXin.push(c)
  }
  if (zhongXin.length !== qianZhao.length) return false

  const muBiao = jiSuanMuBiaoSuoYin(zhongXin, zhiBiaoY, yuanSuoYin)
  if (muBiao === yuanSuoYin) return false
  yingYongZuiZhongChongPai(zt, yuanSuoYin, muBiao)
  return true
}

function onTuoZhuaiJieShu(zhuangTai: FenLeiZhuangTai, shiJian?: TuoZhuaiShiJian) {
  // 先移除实时预览监听，避免拖拽结束后仍触发重排
  window.removeEventListener('pointermove', onTuoZhuaiYiDong)
  window.removeEventListener('touchmove', onTuoZhuaiYiDong)
  tuoZhuaiZhong.value = false
  window.getSelection()?.removeAllRanges()
  // 自动排序维度下拖拽已停用，此时不覆盖用户的手动顺序
  if (!shiFouShouDongPaiXu.value) {
    const rongQiZiDong = tuoZhuaiRongQi.value
    zhiXingLiuWeiDongHua(() => chongZhiYuLan(), rongQiZiDong)
    return
  }

  // 最终重排与持久化交由 customUpdate（库 onUpdate 钩子）在 onEnd 之后统一处理：
  // 该钩子以「拖拽前页顺序 + 落定索引」对 v-model(fenLeiZu) 做一次性权威重排，
  // 从根本上避免「预览改写 v-model → 库内部 onUpdate 二次换位」的双重换位回弹。
  // 兜底（customUpdate 未触发时）：优先用落点推算/事件索引重排；索引不可信时用指针坐标推算落点；
  // 两者均无（含无拖拽上下文的直接调用，此时 DOM/模型已按新顺序落位）则以当前模型顺序持久化。
  Promise.resolve().then(() => {
    if (benCiYiYouCustomUpdateChuLi.value) {
      benCiYiYouCustomUpdateChuLi.value = false
      chongZhiYuLan()
      return
    }
    const [oldIdx, newIdx] = luoDianSuoYin(zhuangTai, shiJian ?? {})
    if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
      luoDing(zhuangTai, oldIdx, newIdx)
      return
    }
    const rongQi = tuoZhuaiRongQi.value
    zhiXingLiuWeiDongHua(() => {
      if (!changShiZhiZhenLuoDianChongPai(zhuangTai, shiJian)) {
        // 无可信落点：以当前模型（已渲染 DOM）顺序为权威，仅同步预览并持久化
        yingYongZuiZhongChongPai(zhuangTai, -1, -1)
      }
      chongZhiYuLan()
    }, rongQi)
  })
}

onMounted(() => {
  jiaZaiShuJu()
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onTuoZhuaiYiDong)
  window.removeEventListener('touchmove', onTuoZhuaiYiDong)
  qingKongFenXiangFuZu()
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
  /* 底板：不随内容滚动的整页底。全屏路由下内容直接叠在动画背景上会糊成一片，
     浅色 #F5F5F5 / 深色 #292929 各带一档透明度，令牌见 styles/variables.css */
  background: var(--yemian-di-beijing);
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
  scrollbar-color: var(--gundong-tiao-huakuai) transparent;
  /* 卡片位移过渡的唯一真源：JS 只写 var(--kapian-liu-wei)，时长/曲线改这里即可热更新 */
  --kapian-liu-wei: transform 0.32s var(--quxian-huan-ying);
}

/* FP-20 保留特例：过往战绩列表需要透明轨道露出页面渐变底，global 轨道 --gundong-tiao-guidao 是半透明灰会显出灰带，故轨道不能用 global 默认；宽/滑块/悬停三规则与 global 同令牌纯重复已删，外观吃单一真源 */
.zhanji-liebiao::-webkit-scrollbar-track {
  background: transparent;
}

.zhanji-liebiao.tuo-zhuai-zhong {
  user-select: none;
  -webkit-user-select: none;
}

.jiazai-zhuangtai,
.kong-zhuangtai {
  margin: 8px 4px 4px;
  padding: 40px 24px;
  text-align: center;
  color: #f2f2ed;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(22, 22, 30, 0.78);
  border: 1.5px solid rgba(242, 242, 237, 0.22);
  border-radius: 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
}

.kong-tubiao {
  font-size: 28px;
  line-height: 1;
  margin-bottom: 10px;
  filter: drop-shadow(0 2px 8px rgba(255, 255, 255, 0.08));
}

.kong-zhu-biao-ti {
  color: rgba(242, 242, 237, 0.88);
}

:root[data-theme='light'] .jiazai-zhuangtai,
:root[data-theme='light'] .kong-zhuangtai {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #14141a;
  color: #14141a;
  box-shadow: 4px 4px 0 rgba(20, 20, 26, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

:root[data-theme='light'] .kong-zhu-biao-ti {
  color: #14141a;
}

/* 分享反馈：sticky 在滚动容器顶部，滚动时不被分类标题盖住（10 是本组件 sticky 标题的局部堆叠位） */
.zhanji-tishi {
  position: sticky;
  top: 0;
  align-self: center;
  z-index: 11;
  max-width: 100%;
  padding: 10px 18px;
  border-radius: 999px;
  background: #14141a;
  color: #ffd500;
  border: 2px solid #ffd500;
  box-shadow: 4px 4px 0 rgba(255, 213, 0, 0.3);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.piliang-gongju-lan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: rgba(27, 27, 36, 0.88);
  border: 1.5px solid rgba(242, 242, 237, 0.4);
  border-radius: 16px;
  margin-top: 12px;
  margin-bottom: 4px;
  gap: 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.piliang-gongju-lan:not(.piliang-gongju-lan--kong) {
  border-color: #ffd500;
  box-shadow: 8px 8px 0 rgba(255, 213, 0, 0.35);
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
  font-weight: 800;
  color: #ffd500;
}

.xuan-ze-shu-liang--kong {
  color: #b9b9c4;
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
  font-weight: 800;
  background: #ff3b3b;
  color: #14141a;
  border: 2.5px solid #14141a;
  box-shadow: 3px 3px 0 #14141a;
  transition: all 0.15s ease;
}

.piliang-shanchu-anniu:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #14141a;
}

.piliang-shanchu-anniu:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 #14141a;
}

.piliang-shanchu-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quan-xuan-anniu {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  background: transparent;
  color: #f2f2ed;
  border: 2px solid #f2f2ed;
  transition: all 0.15s ease;
}

.quan-xuan-anniu:hover {
  background: #f2f2ed;
  color: #14141a;
}

.quxiao-quanxuan-anniu {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  background: transparent;
  color: #f2f2ed;
  border: 2px solid #f2f2ed;
  transition: all 0.15s ease;
}

.quxiao-quanxuan-anniu:hover:not(:disabled) {
  background: #f2f2ed;
  color: #14141a;
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
  padding: 10px 14px;
  background: rgba(27, 27, 36, 0.88);
  border: 1.5px solid rgba(242, 242, 237, 0.4);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.paixu-biaoqian {
  font-size: 12px;
  font-weight: 800;
  color: #b9b9c4;
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
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 8px;
  background: transparent;
  color: #b9b9c4;
  border: 2px solid #3a3a46;
  transition: all 0.15s ease;
}

.paixu-weidu-anniu:hover {
  border-color: #f2f2ed;
  color: #f2f2ed;
}

.paixu-weidu-anniu--jihuo {
  background: #00c2ff;
  color: #14141a;
  border: 2.5px solid #14141a;
  box-shadow: 3px 3px 0 #14141a;
}

.paixu-fangxiang-anniu {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 8px;
  background: transparent;
  color: #f2f2ed;
  border: 2px solid #f2f2ed;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.paixu-fangxiang-anniu:hover:not(:disabled) {
  background: #f2f2ed;
  color: #14141a;
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
  flex-wrap: wrap;
  gap: 8px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #f2f2ed;
  padding: 10px 4px 8px;
  position: sticky;
  top: 0;
  background: rgba(19, 19, 24, 0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(242, 242, 237, 0.75);
  z-index: 10;
}

.fenlei-tubiao {
  font-size: 18px;
}

.fenlei-shu-liang {
  font-size: 12px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 8px;
  background: #ffd500;
  color: #14141a;
  border: 2px solid #14141a;
  margin-left: auto;
}

.fenlei-quan-xuan-anniu {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  background: transparent;
  color: #f2f2ed;
  border: 2px solid #f2f2ed;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.fenlei-quan-xuan-anniu:hover {
  background: #f2f2ed;
  color: #14141a;
}

.fenlei-kong-zhuangtai {
  text-align: center;
  padding: 22px 16px;
  color: rgba(242, 242, 237, 0.72);
  font-size: 13px;
  font-weight: 600;
  background: rgba(22, 22, 30, 0.55);
  border: 1.5px dashed rgba(242, 242, 237, 0.28);
  border-radius: 14px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.fenlei-kong-nei-ron {
  display: inline-block;
  padding: 0 8px;
}

:root[data-theme='light'] .fenlei-kong-zhuangtai {
  background: rgba(255, 255, 255, 0.82);
  border: 2px dashed #14141a;
  color: #3a3a46;
}

/* 卡片外层 = 定位槽：SortableJS 在拖拽中把它的 computed 矩阵当成指针增量的除数，
   所以外层自身绝不能带 rotate/scale，视觉一律下沉到 .zhanji-kapian-nei。 */
.zhanji-kapian {
  display: block;
  cursor: grab;
}

.zhanji-kapian-nei {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px;
  background: linear-gradient(145deg, rgba(30, 30, 40, 0.94), rgba(22, 22, 30, 0.94));
  border: 1.5px solid rgba(242, 242, 237, 0.55);
  border-radius: 16px;
  box-shadow: 3px 3px 0 rgba(242, 242, 237, 0.14);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.zhanji-kapian:hover > .zhanji-kapian-nei {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(242, 242, 237, 0.25);
}

/* 拖拽中指针就压在落点空位上，别让 hover 抬升叠在预览上（鬼影起步位置会跟着抖 2px） */
.zhanji-liebiao.tuo-zhuai-zhong .zhanji-kapian:hover > .zhanji-kapian-nei {
  transform: none;
}

.zhanji-kapian.xuanZhong > .zhanji-kapian-nei {
  background: #241722;
  border-color: var(--xuanzhong-huan-yanse);
  box-shadow:
    inset 0 0 0 2px var(--xuanzhong-huan-yanse),
    4px 4px 0 rgba(255, 45, 149, 0.35);
}

.gouxuan-anniu {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid #f2f2ed;
  background: transparent;
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
  border-color: #ffd500;
}

.gouxuan-anniu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.gouxuan-anniu svg {
  width: 14px;
  height: 14px;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.15s ease;
}

.gouxuan-anniu--xuanzhong {
  background: #14141a;
  border-color: #14141a;
}

.gouxuan-anniu--xuanzhong svg {
  opacity: 1;
  transform: scale(1);
}

.gouxuan-anniu--bufen {
  border-color: #ffd500;
  background: transparent;
}

.gouxuan-anniu--bufen::after {
  content: '';
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: #ffd500;
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

.zhanji-wei {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(145deg, #343444, #262632);
  border: 1.5px solid rgba(242, 242, 237, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.zhanji-xinxi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.jiaose-mingcheng {
  font-size: 15px;
  font-weight: 800;
  color: #f4f4ef;
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
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(20, 20, 26, 0.85);
  color: #ffd500;
  border: 1.5px solid rgba(255, 213, 0, 0.75);
}

.zhuangtai-biaoqian {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1.5px solid rgba(20, 20, 26, 0.88);
  box-shadow: 2px 2px 0 rgba(20, 20, 26, 0.28);
  white-space: nowrap;
}

.zhuangtai-biaoqian.jinxingzhong {
  background: #00c2ff;
  color: #14141a;
}

.zhuangtai-biaoqian.shengli {
  background: #00e676;
  color: #14141a;
}

.zhuangtai-biaoqian.shibai {
  background: #ff3b3b;
  color: #14141a;
}

.zhuangtai-biaoqian.taotuo {
  background: #00e676;
  color: #14141a;
}

.zhuangtai-biaoqian.huShanShengLi {
  background: #ff9f1c;
  color: #14141a;
}

.zhuangtai-biaoqian.biaobai {
  background: #ff2d95;
  color: #14141a;
}

.zhanji-fu-jia-xin-xi {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.liaotian-tianshu {
  font-size: 12px;
  color: #b9b9c4;
}

.zui-hou-xiao-xi-shi-jian {
  font-size: 12px;
  color: #b9b9c4;
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
  font-weight: 800;
  border: 2.5px solid #14141a;
  box-shadow: 3px 3px 0 #14141a;
  transition: all 0.15s ease;
}

.caozuo-anniu:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #14141a;
}

.caozuo-anniu:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 #14141a;
}

.caozuo-anniu.jixu {
  background: #00c2ff;
  color: #14141a;
}

.caozuo-anniu.fupan {
  background: #f2f2ed;
  color: #14141a;
}

/* 分享：霓虹拱廊主社交动作 —— 亮黄实底 + 粗黑描边 + 硬阴影，尺寸/圆角与继续/复盘完全一致 */
.caozuo-anniu.fenxiang {
  background: #ffd500;
  color: #14141a;
}

.caozuo-anniu.fenxiang:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.caozuo-anniu.shanchu {
  background: transparent;
  color: #b9b9c4;
  border: 2px solid #3a3a46;
  box-shadow: none;
  padding: 6px 12px;
  font-size: 12px;
}

.caozuo-anniu.shanchu:hover {
  background: transparent;
  color: #ff3b3b;
  border-color: #ff3b3b;
  box-shadow: none;
  transform: none;
}

.zhanji-liebiao-neirong {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zhanji-kapian.sortable-ghost {
  /* 实时预览：被拖卡片的「落点空位」——霓虹虚线轮廓，隐藏卡片内容，仅作落点提示。
     用 outline 而非 border：外层此刻是纯定位槽，加 border 会把这一格撑高，兄弟卡片跟着跳一次。 */
  background: rgba(255, 45, 149, 0.06) !important;
  outline: var(--jujiao-huan-kuan-du) dashed var(--jujiao-huan-yanse);
  border-radius: 16px;
  box-shadow:
    0 0 0 4px var(--xuanzhong-guangyun-yanse),
    0 10px 26px rgba(255, 45, 149, 0.2) !important;
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

/* 跟随光标的克隆体（force-fallback 的鬼影）。
   库在 _onTouchMove 里把指针增量除以「鬼影自身 computed 矩阵的 a/d」，因此外层不得带 rotate/scale，
   视觉与起手倾斜全部下沉到内层。这里绝不能声明 transform（连 none !important 也不行）：作者样式的
   !important 优先级高于库写到 style 上的内联 matrix，会把鬼影钉死在插入点（实测跟随比值 0）。
   transition 必须为 0，否则每次写 matrix 都被缓动，鬼影恒落后指针。 */
.zhanji-kapian.sortable-drag {
  transition: none !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  opacity: 1 !important;
  cursor: grabbing !important;
  /* Req1：拖拽过程中禁止选中文字 */
  user-select: none;
  -webkit-user-select: none;
}

.zhanji-kapian.sortable-drag > .zhanji-kapian-nei {
  background: #23232e;
  border: 2.5px solid #ffd500;
  border-radius: 14px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.5),
    6px 6px 0 rgba(255, 213, 0, 0.35);
  /* 起手「正→斜」：鬼影是 _appendGhost 新建并首次插入的元素，首绘没有前值，
     transition 在结构上不可能运行，只有 @keyframes 能从恒等矩阵插值到倾斜态（keyframes 的
     from 帧就是「正」态首绘，等价于「先正插、下一帧再斜」且不吃一帧抖动）。曲线仍取单一令牌源，
     不在此写第二份时长/曲线。 */
  animation: kapian-qishou-qingxie 220ms var(--quxian-huan-ying) both;
}

@keyframes kapian-qishou-qingxie {
  from {
    transform: rotate(0deg) scale(1);
  }
  to {
    transform: rotate(2deg) scale(1.02);
  }
}

/* 分页小按钮（分类标题行内） */
.fen-ye-anniu {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  padding: 2px 10px;
  border-radius: 8px;
  background: transparent;
  color: #b9b9c4;
  border: 2px solid #3a3a46;
}

.fen-ye-anniu:hover:not(:disabled) {
  color: #f2f2ed;
  border-color: #f2f2ed;
}

.fen-ye-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.fen-ye-wen-ben {
  font-size: 12px;
  font-weight: 700;
  color: #b9b9c4;
}

/* ============ 浅色主题：霓虹拱廊浅色档（白卡黑框 + 同款荧光状态色块） ============ */
:root[data-theme='light'] .zhanji-tishi {
  background: #14141a;
  color: #ffd500;
  box-shadow: 4px 4px 0 rgba(20, 20, 26, 0.2);
}

:root[data-theme='light'] .piliang-gongju-lan {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(20, 20, 26, 0.85);
  box-shadow: 3px 3px 0 rgba(20, 20, 26, 0.1);
}

:root[data-theme='light'] .piliang-gongju-lan:not(.piliang-gongju-lan--kong) {
  border-color: #ff2d95;
  box-shadow: 8px 8px 0 rgba(255, 45, 149, 0.4);
}

:root[data-theme='light'] .paixu-gongju-lan {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(20, 20, 26, 0.85);
  box-shadow: 3px 3px 0 rgba(20, 20, 26, 0.1);
}

:root[data-theme='light'] .xuan-ze-shu-liang {
  color: #14141a;
}

:root[data-theme='light'] .xuan-ze-shu-liang--kong,
:root[data-theme='light'] .paixu-biaoqian,
:root[data-theme='light'] .liaotian-tianshu,
:root[data-theme='light'] .zui-hou-xiao-xi-shi-jian,
:root[data-theme='light'] .fen-ye-wen-ben {
  color: #5a5a66;
}

:root[data-theme='light'] .jiazai-zhuangtai,
:root[data-theme='light'] .kong-zhuangtai,
:root[data-theme='light'] .fenlei-kong-zhuangtai {
  color: #3a3a46;
}

:root[data-theme='light'] .quan-xuan-anniu,
:root[data-theme='light'] .quxiao-quanxuan-anniu,
:root[data-theme='light'] .paixu-fangxiang-anniu,
:root[data-theme='light'] .fenlei-quan-xuan-anniu {
  color: #14141a;
  border-color: #14141a;
}

:root[data-theme='light'] .quan-xuan-anniu:hover,
:root[data-theme='light'] .quxiao-quanxuan-anniu:hover:not(:disabled),
:root[data-theme='light'] .paixu-fangxiang-anniu:hover:not(:disabled),
:root[data-theme='light'] .fenlei-quan-xuan-anniu:hover {
  background: #14141a;
  color: #ffffff;
}

:root[data-theme='light'] .piliang-shanchu-anniu {
  box-shadow: 3px 3px 0 #14141a;
}

:root[data-theme='light'] .piliang-shanchu-anniu:hover:not(:disabled) {
  box-shadow: 5px 5px 0 #14141a;
}

:root[data-theme='light'] .paixu-weidu-anniu {
  color: #5a5a66;
  border-color: #14141a;
}

:root[data-theme='light'] .paixu-weidu-anniu:hover {
  color: #14141a;
  background: transparent;
}

:root[data-theme='light'] .paixu-weidu-anniu--jihuo {
  background: #00c2ff;
  color: #14141a;
}

:root[data-theme='light'] .zhanji-fenlei-biaoti {
  background: rgba(244, 244, 239, 0.92);
  color: #14141a;
  border-bottom-color: rgba(20, 20, 26, 0.85);
}

:root[data-theme='light'] .zhanji-kapian > .zhanji-kapian-nei {
  background: linear-gradient(145deg, #ffffff, #fafaf7);
  border-color: rgba(20, 20, 26, 0.88);
  box-shadow: 3px 3px 0 rgba(20, 20, 26, 0.85);
}

:root[data-theme='light'] .zhanji-kapian:hover > .zhanji-kapian-nei {
  box-shadow: 5px 5px 0 rgba(20, 20, 26, 0.9);
}

:root[data-theme='light'] .zhanji-liebiao.tuo-zhuai-zhong .zhanji-kapian:hover > .zhanji-kapian-nei {
  transform: none;
}

:root[data-theme='light'] .zhanji-kapian.xuanZhong > .zhanji-kapian-nei {
  background: #fff0f6;
  border-color: var(--xuanzhong-huan-yanse);
  box-shadow:
    inset 0 0 0 2px var(--xuanzhong-huan-yanse),
    4px 4px 0 rgba(255, 45, 149, 0.45);
}

:root[data-theme='light'] .gouxuan-anniu {
  border-color: #14141a;
}

:root[data-theme='light'] .gouxuan-anniu:hover {
  border-color: #14141a;
  background: rgba(255, 213, 0, 0.25);
}

:root[data-theme='light'] .gouxuan-anniu--xuanzhong {
  background: #ffd500;
  border-color: #14141a;
}

:root[data-theme='light'] .gouxuan-anniu--xuanzhong svg {
  stroke: #14141a;
}

:root[data-theme='light'] .gouxuan-anniu--bufen {
  border-color: #14141a;
}

:root[data-theme='light'] .gouxuan-anniu--bufen::after {
  background: #14141a;
}

:root[data-theme='light'] .zhanji-wei {
  background: linear-gradient(145deg, #ffffff, #f0f0ea);
  border-color: rgba(20, 20, 26, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

:root[data-theme='light'] .jiaose-mingcheng {
  color: #14141a;
}

:root[data-theme='light'] .caozuo-anniu {
  box-shadow: 3px 3px 0 #14141a;
}

:root[data-theme='light'] .caozuo-anniu:hover:not(:disabled) {
  box-shadow: 5px 5px 0 #14141a;
}

:root[data-theme='light'] .caozuo-anniu.jixu {
  background: #00c2ff;
  color: #14141a;
}

:root[data-theme='light'] .caozuo-anniu.fupan {
  background: #14141a;
  color: #ffffff;
}

:root[data-theme='light'] .caozuo-anniu.fenxiang {
  background: #ffd500;
  color: #14141a;
}

:root[data-theme='light'] .caozuo-anniu.shanchu {
  color: #5a5a66;
  border-color: #14141a;
}

:root[data-theme='light'] .caozuo-anniu.shanchu:hover {
  color: #e02626;
  border-color: #e02626;
}

:root[data-theme='light'] .fen-ye-anniu {
  color: #5a5a66;
  border-color: #14141a;
}

:root[data-theme='light'] .fen-ye-anniu:hover:not(:disabled) {
  color: #14141a;
  border-color: #14141a;
}

:root[data-theme='light'] .zhanji-kapian.sortable-ghost {
  background: rgba(255, 45, 149, 0.05) !important;
}

@media (prefers-reduced-motion: reduce) {
  .zhanji-kapian-nei,
  .gouxuan-anniu,
  .gouxuan-anniu svg {
    transition-duration: 0.01ms !important;
  }
  /* 减少动效：不倾斜、不做起手动画；落位由 JS 在该档下跳过 FLIP 直接生效，位置仍然正确 */
  .zhanji-kapian.sortable-drag > .zhanji-kapian-nei {
    animation: none !important;
    transform: none !important;
  }
  .zhanji-kapian.sortable-ghost {
    box-shadow: none !important;
  }
}
</style>
