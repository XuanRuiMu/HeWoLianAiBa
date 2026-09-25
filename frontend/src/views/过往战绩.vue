<template>
  <div class="zhanji-yemian">
    <main class="zhanji-liebiao" :class="{ 'tuo-zhuai-zhong': tuoZhuaiZhong }">
      <ZhanJiFenLeiGuanLi
        :fen-lei-lie-biao="zhanKu.fenLeiLieBiao"
        :dang-qian-fen-lei-id="zhanKu.dangQianFenLeiId"
        :cao-zuo-zhong="zhanKu.caoZuoZhong"
        @qie-huan="qieHuanFenLei"
        @chuang-jian="chuangJianFenLei"
        @geng-ming="gengMingFenLei"
        @shan-chu="shanChuFenLei"
      />
      <div v-if="zhanKu.qianTaiCuoWu && dangAnLieBiao.length > 0" class="zhanji-tishi">
        <RequestError
          :cuo-wu="zhanKu.qianTaiCuoWu"
          :zhong-zai="zhanKu.jiaZaiZhong || zhanKu.jiLuJiaZaiZhong"
          @chong-shi="zhongXinJiaZai"
        />
      </div>
      <div v-else-if="zhanJiXianShiTiShi" class="zhanji-tishi" role="status" aria-live="polite">
        <span>{{ zhanJiXianShiTiShi }}</span>
      </div>
      <div v-if="fenXiangCuoWu" class="zhanji-tishi">
        <RequestError
          :cuo-wu="fenXiangCuoWu"
          :zhong-zai="fenXiangZhong"
          @chong-shi="chongShiFenXiang"
        />
      </div>
      <div
        v-if="zhanKu.jiaZaiZhong || zhanKu.jiLuJiaZaiZhong"
        class="jiazai-zhuangtai"
        role="status"
        aria-live="polite"
      >
        <div class="kong-tubiao" aria-hidden="true">⏳</div>
        <div>{{ huoQuFanYi('zhanJi', 'jiaZaiZhong') }}</div>
      </div>
      <div
        v-else-if="zhanKu.qianTaiCuoWu && dangAnLieBiao.length === 0"
        class="kong-zhuangtai jiaZai-cuoWu-zhuangtai"
      >
        <RequestError
          :cuo-wu="zhanKu.qianTaiCuoWu"
          :zhong-zai="zhanKu.jiaZaiZhong || zhanKu.jiLuJiaZaiZhong"
          @chong-shi="zhongXinJiaZai"
        />
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
              :disabled="xuanZhongIds.size === 0 || jiLuCaoZuoZhong"
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
        <div class="zhanji-fenlei-zu">
          <h2 class="zhanji-fenlei-biaoti">
            <span class="fenlei-ming-cheng">{{ zhanKu.dangQianFenLei?.name }}</span>
            <span class="fenlei-shu-liang">{{ zhanKu.dangAnLieBiao.length }}</span>
            <span class="fenlei-fen-ye">
              <button class="fen-ye-anniu" :disabled="fenLeiYeMa <= 1" @click="qieHuanFenLeiYe(-1)">
                ‹
              </button>
              <span class="fen-ye-wen-ben">{{ fenLeiYeMa }}/{{ zongYeShu }}</span>
              <button class="fen-ye-anniu" :disabled="fenLeiYeMa >= zongYeShu" @click="qieHuanFenLeiYe(1)">
                ›
              </button>
            </span>
            <button class="fenlei-quan-xuan-anniu" @click="qieHuanFenLeiQuanXuan">
              {{
                huoQuFanYi(
                  'zhanJi',
                  fenLeiQuanXuanZhuangTai ? 'quXiaoQuanXuan' : 'quanXuanGaiFenLei',
                )
              }}
            </button>
          </h2>
          <VueDraggable
            :model-value="xianShiDangAnLieBiao"
            :disabled="!shiFouShouDongPaiXu || zhanKu.paiXuZhong || zhanKu.caoZuoZhong"
            :animation="0"
            :filter="'.gouxuan-anniu, .caozuo-anniu, .yi-dong-fenlei, .paiXu-cao-zuo'"
            :prevent-on-filter="false"
            ghost-class="sortable-ghost"
            chosen-class="sortable-chosen"
            drag-class="sortable-drag"
            fallback-class="sortable-drag"
            :force-fallback="true"
            :fallback-on-body="true"
            class="zhanji-liebiao-neirong"
            @start="onTuoZhuaiKaiShi"
            @update:model-value="onTuoZhuaiGengXin"
            @end="onTuoZhuaiJieShu"
          >
            <div
              v-for="dangAn in xianShiDangAnLieBiao"
              :key="dangAn.id"
              class="zhanji-kapian"
              :class="{ xuanZhong: xuanZhongIds.has(dangAn.id) }"
              :data-id="dangAn.id"
              tabindex="0"
              @keydown.up.self.prevent="yidongJiLu(dangAn.id, -1)"
              @keydown.down.self.prevent="yidongJiLu(dangAn.id, 1)"
            >
              <div class="zhanji-kapian-nei">
                <button
                  class="gouxuan-anniu gouxuan-anniu--kapian"
                  :class="{ 'gouxuan-anniu--xuanzhong': xuanZhongIds.has(dangAn.id) }"
                  role="checkbox"
                  :aria-checked="xuanZhongIds.has(dangAn.id) ? 'true' : 'false'"
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
                    <div class="jiaose-mingcheng">{{ dangAn.jiao_se_ming_zi }}</div>
                    <div class="zhanji-biaoqian-zu">
                      <span v-if="dangAn.mbti_lei_xing" class="mbti-biaoqian">
                        {{ dangAn.mbti_lei_xing }}
                      </span>
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
                  <select
                    class="yi-dong-fenlei"
                    :value="zhanKu.dangQianFenLeiId"
                    :disabled="zhanKu.caoZuoZhong"
                    :aria-label="`${dangAn.jiao_se_ming_zi} ${huoQuFanYi('zhanJi', 'quanXuanGaiFenLei')}`"
                    @change="yiDongDangAn(dangAn.id, $event)"
                  >
                    <option
                      v-for="fenLei in zhanKu.fenLeiLieBiao"
                      :key="fenLei.id"
                      :value="fenLei.id"
                      :disabled="fenLei.id === zhanKu.dangQianFenLeiId"
                    >
                      {{ fenLei.name }}
                    </option>
                  </select>
                  <div class="paiXu-cao-zuo">
                    <button
                      type="button"
                      class="paiXu-anniu shang-yi"
                      :disabled="!shiFouShouDongPaiXu || zhanKu.paiXuZhong || zhanKu.caoZuoZhong"
                      :aria-label="huoQuFanYi('duoMeiTi', 'qianYiBiaoQing')"
                      @click.stop="yidongJiLu(dangAn.id, -1)"
                      @keydown.enter.prevent.stop="yidongJiLu(dangAn.id, -1)"
                      @keydown.space.prevent.stop="yidongJiLu(dangAn.id, -1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="paiXu-anniu xia-yi"
                      :disabled="!shiFouShouDongPaiXu || zhanKu.paiXuZhong || zhanKu.caoZuoZhong"
                      :aria-label="huoQuFanYi('duoMeiTi', 'houYiBiaoQing')"
                      @click.stop="yidongJiLu(dangAn.id, 1)"
                      @keydown.enter.prevent.stop="yidongJiLu(dangAn.id, 1)"
                      @keydown.space.prevent.stop="yidongJiLu(dangAn.id, 1)"
                    >
                      ↓
                    </button>
                  </div>
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
                    :disabled="jiLuCaoZuoZhong"
                    @click.stop="shanChuZhanJi(dangAn)"
                  >
                    {{ huoQuFanYi('zhanJi', 'shanChu') }}
                  </button>
                </div>
              </div>
            </div>
          </VueDraggable>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { piLiangShanChuDangAn, shanChuDangAn } from '@/api/聊天'
import type { 档案详情 } from '@/types'
import { huoQuFanYi } from '@/config/translations'
import TouXiang, { MO_REN_ZI } from '@/components/头像.vue'
import RequestError from '@/components/请求错误.vue'
import {
  chuangJianQianTaiCuoWu,
  归一前台错误,
  type QianTaiCuoWu,
} from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import ZhanJiFenLeiGuanLi from '@/components/战绩分类管理.vue'
import { track } from '@/utils/埋点'
import { 使用战绩仓库, type ZhanJiCunKuanJieGuo } from '@/stores/战绩'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  shengChengZhanBaoHaiBao,
  huoQuZhanBaoWenAn,
  huoQuZhanBaoWenJianMing,
  type ZhanBaoShuRu,
} from '@/utils/战报海报'

type PaiXuWeiDu = 'shouDong' | 'chuangJianShiJian' | 'zuiHouDuiHuaShiJian' | 'mingCheng' | 'xingGe'
type PaiXuFangXiang = 'jiangXu' | 'shengXu'

interface PaiXuXuanXiang {
  zhi: PaiXuWeiDu
  biaoTi: string
}

const FEN_LEI_MEI_YE_TIAO_SHU = 50
const router = useRouter()
const zhanKu = 使用战绩仓库()
const sheZhiCangKu = 使用用户设置仓库()
const xuanZhongIds = ref<Set<string>>(new Set())
const zuiHouDianJiSuoYin = ref<number | null>(null)
const paiXuWeiDu = ref<PaiXuWeiDu>('shouDong')
const paiXuFangXiang = ref<PaiXuFangXiang>('jiangXu')
const fenLeiYeMa = ref(1)
const tuoZhuaiZhong = ref(false)
const tuoZhuaiQianIdShunXu = ref<string[]>([])
const yuLanShunXu = ref<档案详情[]>([])
const jiLuCaoZuoZhong = ref(false)
const tiShiXinXi = ref('')

const shiFouShouDongPaiXu = computed(() => paiXuWeiDu.value === 'shouDong')

const paiXuXuanXiangList = computed<PaiXuXuanXiang[]>(() => [
  { zhi: 'shouDong', biaoTi: huoQuFanYi('zhanJi', 'tuoDongPaiXu') },
  { zhi: 'chuangJianShiJian', biaoTi: huoQuFanYi('zhanJi', 'paiXuChuangJianShiJian') },
  { zhi: 'zuiHouDuiHuaShiJian', biaoTi: huoQuFanYi('zhanJi', 'paiXuZuiHouDuiHuaShiJian') },
  { zhi: 'mingCheng', biaoTi: huoQuFanYi('zhanJi', 'paiXuMingCheng') },
  { zhi: 'xingGe', biaoTi: huoQuFanYi('zhanJi', 'paiXuXingGe') },
])

const zhanJiXianShiTiShi = computed(() => zhanKu.cuoWuXinXi || tiShiXinXi.value)

const zongYeShu = computed(() =>
  Math.max(1, Math.ceil(zhanKu.dangAnLieBiao.length / FEN_LEI_MEI_YE_TIAO_SHU)),
)

function qieHuanFenLeiYe(fangXiang: 1 | -1): void {
  fenLeiYeMa.value = Math.min(zongYeShu.value, Math.max(1, fenLeiYeMa.value + fangXiang))
}

function huoQuShiJianChuo(zhi: string | null | undefined): number | null {
  if (!zhi) return null
  const shiJianChuo = new Date(zhi).getTime()
  return Number.isNaN(shiJianChuo) ? null : shiJianChuo
}

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

function paiXuFenLei(lieBiao: 档案详情[]): 档案详情[] {
  const weiDu = paiXuWeiDu.value
  const fangXiang = paiXuFangXiang.value === 'jiangXu' ? -1 : 1
  return lieBiao
    .map((item, suoYin) => ({
      item,
      suoYin,
      chuangJian: huoQuShiJianChuo(item.chuang_jian_shi_jian),
      shuZi:
        weiDu === 'chuangJianShiJian'
          ? huoQuShiJianChuo(item.chuang_jian_shi_jian)
          : weiDu === 'zuiHouDuiHuaShiJian'
            ? huoQuShiJianChuo(item.zui_hou_xiao_xi_shi_jian)
            : null,
      wenBen:
        weiDu === 'mingCheng'
          ? (item.jiao_se_ming_zi || item.id || '').trim()
          : weiDu === 'xingGe'
            ? (item.mbti_lei_xing || '').trim()
            : '',
    }))
    .sort((zuo, you) => {
      const zhuJieGuo = weiDu === 'mingCheng' || weiDu === 'xingGe'
        ? biJiaoWenBen(zuo.wenBen, you.wenBen, fangXiang)
        : biJiaoShuZi(zuo.shuZi, you.shuZi, fangXiang)
      if (zhuJieGuo !== 0) return zhuJieGuo
      const ciJieGuo = biJiaoShuZi(zuo.chuangJian, you.chuangJian, -1)
      return ciJieGuo !== 0 ? ciJieGuo : zuo.suoYin - you.suoYin
    })
    .map((tiao) => tiao.item)
}

const xianShiDangAnLieBiao = computed<档案详情[]>(() => {
  if (tuoZhuaiZhong.value && yuLanShunXu.value.length > 0) return yuLanShunXu.value
  let lieBiao = zhanKu.dangAnLieBiao
  if (zhanKu.jiLuXianShiPaiXu) {
    const idDaoJiLu = new Map(lieBiao.map((item) => [item.id, item]))
    lieBiao = zhanKu.jiLuXianShiPaiXu
      .map((id) => idDaoJiLu.get(id))
      .filter((item): item is 档案详情 => !!item)
  } else if (!shiFouShouDongPaiXu.value) {
    lieBiao = paiXuFenLei(lieBiao)
  }
  const qi = (fenLeiYeMa.value - 1) * FEN_LEI_MEI_YE_TIAO_SHU
  return lieBiao.slice(qi, qi + FEN_LEI_MEI_YE_TIAO_SHU)
})

const dangAnLieBiao = computed(() => xianShiDangAnLieBiao.value)

function qieHuanPaiXuWeiDu(weiDu: PaiXuWeiDu): void {
  paiXuWeiDu.value = weiDu
}

function qieHuanPaiXuFangXiang(): void {
  if (shiFouShouDongPaiXu.value) return
  paiXuFangXiang.value = paiXuFangXiang.value === 'jiangXu' ? 'shengXu' : 'jiangXu'
}

function xianShiCunKuanJieGuo(jieGuo: ZhanJiCunKuanJieGuo, fuBuWenBen = ''): void {
  tiShiXinXi.value = [jieGuo.message, fuBuWenBen].filter(Boolean).join(' · ')
}

async function qieHuanFenLei(fenLeiId: string): Promise<void> {
  await zhanKu.qieHuanFenLei(fenLeiId)
}

async function chuangJianFenLei(mingCheng: string): Promise<void> {
  const jieGuo = await zhanKu.chuangJian(mingCheng)
  xianShiCunKuanJieGuo(jieGuo)
}

async function gengMingFenLei(fenLeiId: string, mingCheng: string): Promise<void> {
  const jieGuo = await zhanKu.gengMing(fenLeiId, mingCheng)
  xianShiCunKuanJieGuo(jieGuo)
}

async function shanChuFenLei(fenLeiId: string): Promise<void> {
  const jieGuo = await zhanKu.shanChu(fenLeiId)
  const luoDiFenLei = zhanKu.fenLeiLieBiao.find((item) => item.id === jieGuo.fallbackCategoryId)
  const fuBuWenBen =
    jieGuo.kind === 'success' && jieGuo.movedRecordCount !== undefined && luoDiFenLei
      ? `${jieGuo.movedRecordCount} → ${luoDiFenLei.name}`
      : ''
  xianShiCunKuanJieGuo(jieGuo, fuBuWenBen)
}

async function yiDongDangAn(recordId: string, shiJian: Event): Promise<void> {
  const targetCategoryId = (shiJian.target as HTMLSelectElement).value
  const jieGuo = await zhanKu.yiDongDangAn(recordId, targetCategoryId)
  xianShiCunKuanJieGuo(jieGuo)
}

async function zhongXinJiaZai(): Promise<void> {
  await zhanKu.chongXinJiaZai()
}

watch(
  () => zhanKu.dangQianFenLeiId,
  () => {
    fenLeiYeMa.value = 1
    xuanZhongIds.value.clear()
    zuiHouDianJiSuoYin.value = null
    tuoZhuaiZhong.value = false
    yuLanShunXu.value = []
  },
)

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

const fenLeiQuanXuanZhuangTai = computed(
  () => dangAnLieBiao.value.length > 0 && dangAnLieBiao.value.every((item) => xuanZhongIds.value.has(item.id)),
)

function qieHuanFenLeiQuanXuan(): void {
  const ids = dangAnLieBiao.value.map((item) => item.id)
  if (fenLeiQuanXuanZhuangTai.value) {
    for (const id of ids) xuanZhongIds.value.delete(id)
    return
  }
  for (const id of ids) xuanZhongIds.value.add(id)
}

async function shanChuZhanJi(dangAn: 档案详情): Promise<void> {
  if (!dangAn.id || jiLuCaoZuoZhong.value) return
  if (!window.confirm(huoQuFanYi('zhanJi', 'queRenShanChu'))) return
  jiLuCaoZuoZhong.value = true
  try {
    await shanChuDangAn(dangAn.id)
    xuanZhongIds.value.delete(dangAn.id)
    await zhanKu.chongXinJiaZai()
    tiShiXinXi.value = huoQuFanYi('tongYong', 'caoZuoChengGong')
  } catch {
    tiShiXinXi.value = huoQuFanYi('tongYong', 'caoZuoShiBai')
  } finally {
    jiLuCaoZuoZhong.value = false
  }
}

async function piLiangShanChu(): Promise<void> {
  if (xuanZhongIds.value.size === 0 || jiLuCaoZuoZhong.value) return
  const queRenXinXi = huoQuFanYi('zhanJi', 'queRenPiLiangShanChu').replace(
    '{条}',
    String(xuanZhongIds.value.size),
  )
  if (!window.confirm(queRenXinXi)) return
  jiLuCaoZuoZhong.value = true
  try {
    const ids = Array.from(xuanZhongIds.value)
    const jieGuo = await piLiangShanChuDangAn(ids)
    if (jieGuo.cheng_gong) {
      await zhanKu.chongXinJiaZai()
      xuanZhongIds.value.clear()
      tiShiXinXi.value = huoQuFanYi('tongYong', 'caoZuoChengGong')
    }
  } catch {
    tiShiXinXi.value = huoQuFanYi('tongYong', 'caoZuoShiBai')
  } finally {
    jiLuCaoZuoZhong.value = false
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
const fenXiangZhong = ref(false)
const fenXiangCuoWu = ref<QianTaiCuoWu | null>(null)
const fenXiangZhongJiLu = ref<档案详情 | null>(null)

function chongShiFenXiang(): void {
  const dangAn = fenXiangZhongJiLu.value
  if (!dangAn) return
  void fenXiangJieJu(dangAn)
}
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
    } catch (cuoWu: unknown) {
      if (归一前台错误(cuoWu).code === QIAN_TAI_DAI_MA.QU_XIAO) return 'quxiao'
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
  fenXiangZhongJiLu.value = dangAn
  fenXiangCuoWu.value = null
  xianShiTiShi(huoQuFanYi('zhanJi', 'fenXiangZhengZaiShengCheng'))
  const shuRu = gouJianZhanBaoShuRu(dangAn)
  let tuPian: Blob
  try {
    tuPian = await shengChengZhanBaoHaiBao(shuRu)
  } catch {
    fenXiangCuoWu.value = chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.WEI_ZHI,
      retryable: true,
      yingXiang: huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'),
    })
    xianShiTiShi('')
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
  } catch {
    fenXiangCuoWu.value = chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.WEI_ZHI,
      retryable: true,
      yingXiang: huoQuFanYi('zhanJi', 'fenXiangShiBai'),
    })
    xianShiTiShi('')
  } finally {
    fenXiangZhong.value = false
  }
}


interface TuoZhuaiJieShuShiJian {
  oldIndex?: number
  newIndex?: number
  oldDraggableIndex?: number
  newDraggableIndex?: number
}

function onTuoZhuaiKaiShi(): void {
  if (!shiFouShouDongPaiXu.value || zhanKu.paiXuZhong || zhanKu.caoZuoZhong) return
  tuoZhuaiZhong.value = true
  tuoZhuaiQianIdShunXu.value = xianShiDangAnLieBiao.value.map((item) => item.id)
  yuLanShunXu.value = [...xianShiDangAnLieBiao.value]
}

function onTuoZhuaiGengXin(lieBiao: 档案详情[]): void {
  if (!tuoZhuaiZhong.value || !shiFouShouDongPaiXu.value) return
  const qianIds = tuoZhuaiQianIdShunXu.value
  const xinIds = lieBiao.map((item) => item.id)
  if (xinIds.length !== qianIds.length || new Set(xinIds).size !== qianIds.length) return
  if (xinIds.some((id) => !qianIds.includes(id))) return
  yuLanShunXu.value = [...lieBiao]
}

function zhuanHuanDangQianYe(ids: string[]): string[] {
  const quanBu = zhanKu.dangAnLieBiao.map((item) => item.id)
  const qi = (fenLeiYeMa.value - 1) * FEN_LEI_MEI_YE_TIAO_SHU
  const fuBu = [...quanBu]
  fuBu.splice(qi, ids.length, ...ids)
  return fuBu
}

async function tiJiaoWanZhengPaiXu(recordIds: string[]): Promise<void> {
  if (recordIds.join('|') === zhanKu.dangAnLieBiao.map((item) => item.id).join('|')) return
  const jieGuo = await zhanKu.baoCunPaiXu(recordIds)
  xianShiCunKuanJieGuo(jieGuo)
}

function onTuoZhuaiJieShu(shiJian?: TuoZhuaiJieShuShiJian): void {
  let yeIds = yuLanShunXu.value.map((item) => item.id)
  const yuanIds = [...tuoZhuaiQianIdShunXu.value]
  if (yeIds.join('|') === yuanIds.join('|')) {
    const oldIndex = shiJian?.oldDraggableIndex ?? shiJian?.oldIndex
    const newIndex = shiJian?.newDraggableIndex ?? shiJian?.newIndex
    if (
      typeof oldIndex === 'number' &&
      typeof newIndex === 'number' &&
      oldIndex >= 0 &&
      newIndex >= 0 &&
      oldIndex !== newIndex &&
      Math.max(oldIndex, newIndex) < yuanIds.length
    ) {
      const [moved] = yuanIds.splice(oldIndex, 1)
      yuanIds.splice(newIndex, 0, moved)
      yeIds = yuanIds
    }
  }
  tuoZhuaiZhong.value = false
  window.getSelection()?.removeAllRanges()
  const quanBuIds = zhuanHuanDangQianYe(yeIds)
  void tiJiaoWanZhengPaiXu(quanBuIds).finally(() => {
    yuLanShunXu.value = []
  })
}

async function yidongJiLu(recordId: string, fangXiang: -1 | 1): Promise<void> {
  if (!shiFouShouDongPaiXu.value || zhanKu.paiXuZhong || zhanKu.caoZuoZhong) return
  const ids = zhanKu.dangAnLieBiao.map((item) => item.id)
  const current = ids.indexOf(recordId)
  const target = current + fangXiang
  if (current < 0 || target < 0 || target >= ids.length) return
  const proposed = [...ids]
  const [moved] = proposed.splice(current, 1)
  proposed.splice(target, 0, moved)
  await tiJiaoWanZhengPaiXu(proposed)
}

onMounted(() => {
  void zhanKu.jiaZai()
})

onUnmounted(() => {
  qingKongFenXiangFuZu()
  zhanKu.qingKong()
})

defineExpose({
  dangAnLieBiao,
  xianShiDangAnLieBiao,
  paiXuWeiDu,
  paiXuFangXiang,
  qieHuanPaiXuWeiDu,
  qieHuanPaiXuFangXiang,
  tuoZhuaiZhong,
  onTuoZhuaiKaiShi,
  onTuoZhuaiGengXin,
  onTuoZhuaiJieShu,
  yidongJiLu,
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

.zhanji-tishi {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.zhanji-tishi-chong-shi {
  flex: 0 0 auto;
  padding: 3px 9px;
  border: 1px solid currentColor;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.yi-dong-fenlei {
  width: 100%;
  min-width: 0;
  max-width: 180px;
  min-height: 36px;
  padding: 5px 8px;
  border: 2px solid var(--biankuang-yanse);
  border-radius: 9px;
  background: var(--beijing-zhuse);
  color: var(--wenben-zhuse);
  font: inherit;
  font-size: 12px;
}

.paiXu-cao-zuo {
  display: flex;
  gap: 6px;
}

.paiXu-anniu {
  width: 36px;
  min-height: 36px;
  padding: 0;
  border: 2px solid var(--biankuang-yanse);
  border-radius: 9px;
  background: transparent;
  color: var(--wenben-zhuse);
  cursor: pointer;
  font-size: 18px;
  font-weight: 900;
}

.paiXu-anniu:hover:not(:disabled) {
  border-color: var(--yanse-zhanji);
  color: var(--yanse-zhanji);
}

.paiXu-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zhanji-kapian:focus-visible > .zhanji-kapian-nei {
  border-color: var(--jujiao-huan-yanse);
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

:root[data-theme='light'] .yi-dong-fenlei,
:root[data-theme='light'] .paiXu-anniu {
  border-color: var(--beijing-zhuse);
  background: var(--beijing-kaopian);
  color: var(--beijing-zhuse);
}

:root[data-theme='light'] .paiXu-anniu:hover:not(:disabled) {
  border-color: var(--beijing-zhuse);
  background: var(--yanse-zhanji);
  color: var(--beijing-zhuse);
}

:root[data-theme='light'] .zhanji-kapian.sortable-ghost {
  background: rgba(255, 45, 149, 0.05) !important;
}

@media (max-width: 640px) {
  .zhanji-liebiao {
    padding-inline: 10px;
  }

  .zhanji-kapian-nei {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
  }

  .zhanji-zuo {
    flex-basis: calc(100% - 74px);
  }

  .zhanji-you {
    width: 100%;
    margin-left: 74px;
    align-items: stretch;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .yi-dong-fenlei {
    flex: 1 1 150px;
    max-width: none;
  }

  .caozuo-anniu {
    flex: 1 1 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zhanji-kapian-nei,
  .gouxuan-anniu,
  .gouxuan-anniu svg,
  .paiXu-anniu,
  .zhanji-tishi-chong-shi {
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
