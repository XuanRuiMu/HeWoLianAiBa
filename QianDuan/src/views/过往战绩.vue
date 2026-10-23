<template>
  <div class="zhanji-yemian">
    <main class="zhanji-liebiao" :class="{ 'tuo-zhuai-zhong': tuoZhuaiZhong }">
      <ZhanJiFenLeiGuanLi
        v-if="zhanKu.fenLeiKeYong"
        :fen-lei-lie-biao="zhanKu.fenLeiLieBiao"
        :dang-qian-fen-lei-id="zhanKu.dangQianFenLeiId"
        :cao-zuo-zhong="zhanKu.caoZuoZhong"
        @qie-huan="qieHuanFenLei"
        @chuang-jian="chuangJianFenLei"
        @geng-ming="gengMingFenLei"
        @shan-chu="shanChuFenLei"
        @she-zhi-mo-ren="sheZhiMoRenFenLei"
        @pai-xu="paiXuFenLeiPaiXu"
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
        <div class="fen-lei-da-kuan">
        <div
          class="piliang-gongju-lan"
          :class="{ 'piliang-gongju-lan--kong': xuanZhongIds.size === 0 }"
        >
          <div class="quanju-gouxuan-zu">
            <button
              class="gouxuan-anniu gouxuan-anniu--quanju dian-ji-qu-44"
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
            <span class="fenlei-shu-liang">{{ zhanKu.dangAnLieBiao.length }}</span>
            <span class="fen-ye-zu">
              <button
                class="fen-ye-anniu dian-ji-qu-44"
                :disabled="fenLeiYeMa <= 1"
                :aria-label="huoQuFanYi('zhanJi', 'shangYiYe')"
                @click="qieHuanFenLeiYe(-1)"
              >
                ‹
              </button>
              <span class="fen-ye-wen-ben">{{ fenLeiYeMa }}/{{ zongYeShu }}</span>
              <button
                class="fen-ye-anniu dian-ji-qu-44"
                :disabled="fenLeiYeMa >= zongYeShu"
                :aria-label="huoQuFanYi('zhanJi', 'xiaYiYe')"
                @click="qieHuanFenLeiYe(1)"
              >
                ›
              </button>
            </span>
          </div>
          <div class="piliang-anniu-zu">
            <button class="quan-xuan-anniu dian-ji-qu-44" @click="quanBuXuanZe">
              {{ huoQuFanYi('zhanJi', 'quanXuan') }}
            </button>
            <button
              class="quxiao-quanxuan-anniu dian-ji-qu-44"
              :disabled="xuanZhongIds.size === 0"
              @click="qingKongXuanZe"
            >
              {{ huoQuFanYi('zhanJi', 'quXiaoQuanXuan') }}
            </button>
            <button
              class="piliang-shanchu-anniu dian-ji-qu-44"
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
              class="paixu-weidu-anniu dian-ji-qu-44"
              :class="{ 'paixu-weidu-anniu--jihuo': paiXuWeiDu === xuanXiang.zhi }"
              :aria-pressed="paiXuWeiDu === xuanXiang.zhi ? 'true' : 'false'"
              @click="qieHuanPaiXuWeiDu(xuanXiang.zhi)"
            >
              {{ xuanXiang.biaoTi }}
            </button>
          </div>
          <button
            class="paixu-fangxiang-anniu dian-ji-qu-44"
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
          <VueDraggable
            ref="luoWeiJuBing"
            :model-value="xianShiDangAnLieBiao"
            :disabled="!shiFouShouDongPaiXu || zhanKu.paiXuZhong || zhanKu.caoZuoZhong"
            :animation="ZHAN_JI_LUO_WEI.tuoZhuaiHaoMiao"
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
                  class="gouxuan-anniu gouxuan-anniu--kapian dian-ji-qu-44"
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
                    <div v-if="xingGeWenBen(dangAn)" class="xinxi-hang">
                      <span class="xinxi-biaoqian">{{
                        huoQuFanYi('zhanJi', 'haiBaoXingGeBiaoQian')
                      }}</span>
                      <span class="xinxi-zhi">{{ xingGeWenBen(dangAn) }}</span>
                    </div>
                    <div class="xinxi-hang">
                      <span
                        class="zhuangtai-biaoqian"
                        :class="zhuangTaiYangShi(dangAn.jie_guo_lei_xing_yuan)"
                      >
                        {{ zhuangTaiWenBen(dangAn.jie_guo_lei_xing_yuan) }}
                      </span>
                    </div>
                    <div class="xinxi-hang">
                      <span class="xinxi-zhi liaotian-tianshu">
                        {{
                          huoQuFanYi('zhanJi', 'liaoTianTianShu').replace(
                            '{天}',
                            String(dangAn.liao_tian_tian_shu ?? 0),
                          )
                        }}
                      </span>
                    </div>
                    <div v-if="zuiHouXiaoXi(dangAn).length > 0" class="zuihou-xiao-xi">
                      <div
                        v-for="(tiao, suoYin) in zuiHouXiaoXi(dangAn)"
                        :key="`${tiao.shi_jian}-${tiao.fa_song_zhe}-${suoYin}`"
                        class="zuihou-xiao-xi-tiao"
                      >
                        <span class="zuihou-shi-jian">{{
                          geShiHuaRiQiShiJian(tiao.shi_jian)
                        }}</span>
                        <span class="zuihou-nei-rong">
                          {{ tiao.fa_song_zhe === 'yonghu' ? huoQuFanYi('zhanJi', 'ni') : huoQuFanYi('zhanJi', 'ta') }}：{{ tiao.zhai_yao }}
                        </span>
                      </div>
                    </div>
                    <div v-else-if="xianShiShiJian(dangAn)" class="zuihou-xiao-xi-shi-jian">
                      {{ xianShiShiJian(dangAn) }}
                    </div>
                  </div>
                </div>
                <div class="zhanji-you">
                  <TongYongXiaLa
                    mo-shi="zhanJi"
                    :xuan-xiang="fenLeiXiaLaXuanXiang"
                    :mo-xing-zhi="zhanKu.dangQianFenLeiId"
                    :jin-yong="zhanKu.caoZuoZhong"
                    :aria-biao-qian="`${dangAn.jiao_se_ming_zi} ${huoQuFanYi('zhanJi', 'quanXuanGaiFenLei')}`"
                    @geng-xin="yiDongDangAnXuanXiang(dangAn.id, $event)"
                  />
                  <div class="paiXu-cao-zuo">
                    <button
                      type="button"
                      class="paiXu-anniu shang-yi dian-ji-qu-44"
                      :class="{ 'paiXu-anniu--shouWei': shiShouWeiJinYong(dangAn.id, -1) }"
                      :disabled="shiShouWeiJinYong(dangAn.id, -1)"
                      :aria-disabled="shiShouWeiJinYong(dangAn.id, -1) ? 'true' : 'false'"
                      :aria-label="huoQuFanYi('duoMeiTi', 'qianYiBiaoQing')"
                      @click.stop="yidongJiLu(dangAn.id, -1)"
                      @keydown.enter.prevent.stop="yidongJiLu(dangAn.id, -1)"
                      @keydown.space.prevent.stop="yidongJiLu(dangAn.id, -1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="paiXu-anniu xia-yi dian-ji-qu-44"
                      :class="{ 'paiXu-anniu--shouWei': shiShouWeiJinYong(dangAn.id, 1) }"
                      :disabled="shiShouWeiJinYong(dangAn.id, 1)"
                      :aria-disabled="shiShouWeiJinYong(dangAn.id, 1) ? 'true' : 'false'"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { piLiangShanChuDangAn, shanChuDangAn } from '@/api/聊天'
import type { 档案详情 } from '@/types/类型定义'
import { huoQuFanYi } from '@/config/翻译表'
import { quXian, ZHAN_JI_LUO_WEI } from '@/config/设计令牌'
import TouXiang, { MO_REN_ZI } from '@/components/头像.vue'
import RequestError from '@/components/请求错误.vue'
import {
  chuangJianQianTaiCuoWu,
  归一前台错误,
  type QianTaiCuoWu,
} from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import ZhanJiFenLeiGuanLi from '@/components/战绩分类管理.vue'
import TongYongXiaLa from '@/components/通用菜单.vue'
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
const luoWeiJuBing = ref<HTMLElement | null>(null)

function shiFouJianDongXiao(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function duQuKaPianWeiZhi(): Map<string, number> {
  const jieGuo = new Map<string, number>()
  const gen = luoWeiJuBing.value as unknown as { $el?: unknown } | HTMLElement | null
  const benTi = gen instanceof HTMLElement
    ? gen
    : gen && typeof gen === 'object' && '$el' in gen && gen.$el instanceof HTMLElement
      ? gen.$el
      : null
  if (!benTi) return jieGuo
  for (const jieDian of benTi.querySelectorAll<HTMLElement>('.zhanji-kapian')) {
    const id = jieDian.getAttribute('data-id')
    if (!id || jieGuo.has(id)) continue
    jieGuo.set(id, jieDian.getBoundingClientRect().top)
  }
  return jieGuo
}

async function boFangLuoWeiDongHua(qianWeiZhi: Map<string, number>): Promise<void> {
  if (qianWeiZhi.size === 0 || shiFouJianDongXiao()) return
  await nextTick()
  const gen = luoWeiJuBing.value as unknown as { $el?: unknown } | HTMLElement | null
  const benTi = gen instanceof HTMLElement
    ? gen
    : gen && typeof gen === 'object' && '$el' in gen && gen.$el instanceof HTMLElement
      ? gen.$el
      : null
  if (!benTi) return
  const dongHua: Animation[] = []
  for (const jieDian of benTi.querySelectorAll<HTMLElement>('.zhanji-kapian')) {
    const id = jieDian.getAttribute('data-id')
    if (!id) continue
    const qianTop = qianWeiZhi.get(id)
    if (qianTop === undefined) continue
    const houTop = jieDian.getBoundingClientRect().top
    const pianYi = qianTop - houTop
    if (pianYi === 0 || !Number.isFinite(pianYi)) continue
    const neiKa = jieDian.querySelector<HTMLElement>('.zhanji-kapian-nei')
    if (!neiKa) continue
    try {
      dongHua.push(
        neiKa.animate(
          [
            { transform: `translateY(${pianYi}px)` },
            { transform: 'translateY(0px)' },
          ],
          { duration: ZHAN_JI_LUO_WEI.shiChangHaoMiao, easing: quXian.huanYing },
        ),
      )
    } catch {
      continue
    }
  }
  if (dongHua.length === 0) return
  try {
    await Promise.all(dongHua.map((dangAnXiang) => dangAnXiang.finished.catch(() => undefined)))
  } catch {
    return
  } finally {
    for (const dangAnXiang of dongHua) {
      try {
        dangAnXiang.cancel()
      } catch {
        continue
      }
    }
  }
}

const shiFouShouDongPaiXu = computed(() => paiXuWeiDu.value === 'shouDong')

const paiXuXuanXiangList = computed<PaiXuXuanXiang[]>(() => [
  { zhi: 'shouDong', biaoTi: huoQuFanYi('zhanJi', 'tuoDongPaiXu') },
  { zhi: 'chuangJianShiJian', biaoTi: huoQuFanYi('zhanJi', 'paiXuChuangJianShiJian') },
  { zhi: 'zuiHouDuiHuaShiJian', biaoTi: huoQuFanYi('zhanJi', 'paiXuZuiHouDuiHuaShiJian') },
  { zhi: 'mingCheng', biaoTi: huoQuFanYi('zhanJi', 'paiXuMingCheng') },
  { zhi: 'xingGe', biaoTi: huoQuFanYi('zhanJi', 'paiXuXingGe') },
])

const zhanJiXianShiTiShi = computed(() => tiShiXinXi.value)

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
    .map((dangAnXiang, suoYin) => ({
      dangAnXiang,
      suoYin,
      chuangJian: huoQuShiJianChuo(dangAnXiang.chuang_jian_shi_jian),
      shuZi:
        weiDu === 'chuangJianShiJian'
          ? huoQuShiJianChuo(dangAnXiang.chuang_jian_shi_jian)
          : weiDu === 'zuiHouDuiHuaShiJian'
            ? huoQuShiJianChuo(dangAnXiang.zui_hou_xiao_xi_shi_jian)
            : null,
      wenBen:
        weiDu === 'mingCheng'
          ? (dangAnXiang.jiao_se_ming_zi || dangAnXiang.id || '').trim()
          : weiDu === 'xingGe'
            ? (dangAnXiang.mbti_lei_xing || '').trim()
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
    .map((tiao) => tiao.dangAnXiang)
}

const xianShiDangAnLieBiao = computed<档案详情[]>(() => {
  if (tuoZhuaiZhong.value && yuLanShunXu.value.length > 0) return yuLanShunXu.value
  let lieBiao = zhanKu.dangAnLieBiao
  if (zhanKu.jiLuXianShiPaiXu) {
    const idDaoJiLu = new Map(lieBiao.map((dangAnXiang) => [dangAnXiang.id, dangAnXiang]))
    lieBiao = zhanKu.jiLuXianShiPaiXu
      .map((id) => idDaoJiLu.get(id))
      .filter((dangAnXiang): dangAnXiang is 档案详情 => !!dangAnXiang)
  } else if (!shiFouShouDongPaiXu.value) {
    lieBiao = paiXuFenLei(lieBiao)
  }
  const qi = (fenLeiYeMa.value - 1) * FEN_LEI_MEI_YE_TIAO_SHU
  return lieBiao.slice(qi, qi + FEN_LEI_MEI_YE_TIAO_SHU)
})

const dangAnLieBiao = computed(() => xianShiDangAnLieBiao.value)

function qieHuanPaiXuWeiDu(weiDu: PaiXuWeiDu): void {
  if (paiXuWeiDu.value === weiDu) return
  const qianWeiZhi = duQuKaPianWeiZhi()
  paiXuWeiDu.value = weiDu
  void boFangLuoWeiDongHua(qianWeiZhi)
}

function qieHuanPaiXuFangXiang(): void {
  if (shiFouShouDongPaiXu.value) return
  const qianWeiZhi = duQuKaPianWeiZhi()
  paiXuFangXiang.value = paiXuFangXiang.value === 'jiangXu' ? 'shengXu' : 'jiangXu'
  void boFangLuoWeiDongHua(qianWeiZhi)
}

function xianShiCunKuanJieGuo(jieGuo: ZhanJiCunKuanJieGuo, fuBuWenBen = ''): void {
  tiShiXinXi.value = [jieGuo.tiShiWenBen, fuBuWenBen].filter(Boolean).join(' · ')
}

async function qieHuanFenLei(fenLeiId: string): Promise<void> {
  if (fenLeiId === zhanKu.dangQianFenLeiId) return
  const qianWeiZhi = duQuKaPianWeiZhi()
  await zhanKu.qieHuanFenLei(fenLeiId)
  await boFangLuoWeiDongHua(qianWeiZhi)
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
  const luoDiFenLei = zhanKu.fenLeiLieBiao.find((dangAnXiang) => dangAnXiang.id === jieGuo.fallbackCategoryId)
  const fuBuWenBen =
    jieGuo.kind === 'success' && jieGuo.movedRecordCount !== undefined && luoDiFenLei
      ? `${jieGuo.movedRecordCount} → ${luoDiFenLei.name}`
      : ''
  xianShiCunKuanJieGuo(jieGuo, fuBuWenBen)
}

async function sheZhiMoRenFenLei(fenLeiId: string): Promise<void> {
  const jieGuo = await zhanKu.sheZhiMoRen(fenLeiId)
  xianShiCunKuanJieGuo(jieGuo)
}

async function paiXuFenLeiPaiXu(fenLeiIds: string[]): Promise<void> {
  const jieGuo = await zhanKu.baoCunFenLeiPaiXu(fenLeiIds)
  xianShiCunKuanJieGuo(jieGuo)
}

async function yiDongDangAn(recordId: string, shiJian: Event): Promise<void> {
  const targetCategoryId = (shiJian.target as HTMLSelectElement).value
  await yiDongDangAnXuanXiang(recordId, targetCategoryId)
}

async function yiDongDangAnXuanXiang(recordId: string, targetCategoryId: string): Promise<void> {
  const jieGuo = await zhanKu.yiDongDangAn(recordId, targetCategoryId)
  xianShiCunKuanJieGuo(jieGuo)
}

const fenLeiXiaLaXuanXiang = computed(() =>
  zhanKu.fenLeiLieBiao.map((fenLei) => ({
    zhi: fenLei.id,
    wenZi: fenLei.name,
    jinYong: fenLei.id === zhanKu.dangQianFenLeiId,
  })),
)

function huoQuQuanJuWeiZhi(dangAnId: string | undefined): number {
  if (!dangAnId) return -1
  return zhanKu.dangAnLieBiao.findIndex((dangAnXiang) => dangAnXiang.id === dangAnId)
}

function shiShouWeiJinYong(dangAnId: string | undefined, fangXiang: -1 | 1): boolean {
  if (!shiFouShouDongPaiXu.value || zhanKu.paiXuZhong || zhanKu.caoZuoZhong) return true
  const weiZhi = huoQuQuanJuWeiZhi(dangAnId)
  if (weiZhi < 0) return true
  const muBiao = weiZhi + fangXiang
  return muBiao < 0 || muBiao >= zhanKu.dangAnLieBiao.length
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
  const keXuanIds = dangAnLieBiao.value.map((dangAnXiang) => dangAnXiang.id).filter((id): id is string => !!id)
  return keXuanIds.length > 0 && keXuanIds.every((id) => xuanZhongIds.value.has(id))
})

const buFenXuanZe = computed(() => {
  const zongShu = dangAnLieBiao.value.filter((dangAnXiang) => dangAnXiang.id).length
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
    const riQiDuiXiang = new Date(shiJian)
    if (Number.isNaN(riQiDuiXiang.getTime())) return ''
    return riQiDuiXiang.toLocaleString('zh-CN', {
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

function jieGuoShiFouJieShu(dangAn: 档案详情): boolean {
  return !!dangAn.jie_guo_lei_xing_yuan && dangAn.jie_guo_lei_xing_yuan !== 'jinxing_zhong'
}

function xingGeWenBen(dangAn: 档案详情): string | null {
  if (dangAn.sui_ji_xing_ge === true) {
    if (jieGuoShiFouJieShu(dangAn)) {
      const mbti = dangAn.mbti_lei_xing?.trim()
      return mbti
        ? `${huoQuFanYi('ziLiaoSheZhi', 'suiJi')}：${mbti}`
        : huoQuFanYi('ziLiaoSheZhi', 'suiJi')
    }
    return huoQuFanYi('ziLiaoSheZhi', 'suiJi')
  }
  return dangAn.mbti_lei_xing?.trim() || null
}

function zuiHouXiaoXi(dangAn: 档案详情) {
  const lieBiao = dangAn.zui_hou_liang_tiao
  if (!Array.isArray(lieBiao) || lieBiao.length === 0) return []
  return lieBiao
    .filter(
      (tiao) =>
        tiao !== null &&
        typeof tiao === 'object' &&
        typeof tiao.shi_jian === 'string' &&
        typeof tiao.zhai_yao === 'string' &&
        tiao.zhai_yao.trim() !== '',
    )
    .slice(-2)
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
  if (dangAn.tou_xiang_biao_ji === 'zha') return '😈'
  if (dangAn.tou_xiang_biao_ji === 'ai') return '💕'
  return MO_REN_ZI.jiaose
}

function huoQuDangAnQuanJuSuoYin(dangAnId: string | undefined): number {
  if (!dangAnId) return -1
  return dangAnLieBiao.value.findIndex((dangAnXiang) => dangAnXiang.id === dangAnId)
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
      const dangAnXiang = dangAnLieBiao.value[i]
      if (dangAnXiang?.id) xuanZhongIds.value.add(dangAnXiang.id)
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
    for (const dangAnXiang of dangAnLieBiao.value) {
      if (dangAnXiang.id) xuanZhongIds.value.add(dangAnXiang.id)
    }
  }
}

function quanBuXuanZe() {
  for (const dangAnXiang of dangAnLieBiao.value) {
    if (dangAnXiang.id) xuanZhongIds.value.add(dangAnXiang.id)
  }
}

function qingKongXuanZe() {
  xuanZhongIds.value.clear()
}

async function shanChuZhanJi(dangAn: 档案详情): Promise<void> {
  if (!dangAn.id || jiLuCaoZuoZhong.value) return
  if (!window.confirm(huoQuFanYi('zhanJi', 'queRenShanChu'))) return
  jiLuCaoZuoZhong.value = true
  try {
    await shanChuDangAn(dangAn.id)
    xuanZhongIds.value.delete(dangAn.id)
    await zhanKu.chongXinJiaZai()
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
    })
    xianShiTiShi('')
  } finally {
    fenXiangZhong.value = false
  }
}


interface TuoZhuaiJieShuShiJian {
  jiuSuoYin?: number
  xinSuoYin?: number
  oldDraggableIndex?: number
  newDraggableIndex?: number
}

let tuoZhuaiXuanZhongBuDi: number | null = null

function buTiFuZhiTuoZhuaiXuanZhong(): void {
  const keShi = document.querySelector<HTMLSelectElement>('.sortable-drag .yi-dong-fenlei')
  if (keShi && keShi.value !== zhanKu.dangQianFenLeiId) {
    keShi.value = zhanKu.dangQianFenLeiId
  }
}

function qiDongTuoZhuaiXuanZhongBuDi(): void {
  if (tuoZhuaiXuanZhongBuDi !== null) return
  const diBu = () => {
    if (!tuoZhuaiZhong.value) {
      tuoZhuaiXuanZhongBuDi = null
      return
    }
    buTiFuZhiTuoZhuaiXuanZhong()
    tuoZhuaiXuanZhongBuDi = requestAnimationFrame(diBu)
  }
  tuoZhuaiXuanZhongBuDi = requestAnimationFrame(diBu)
}

function onTuoZhuaiKaiShi(): void {
  if (!shiFouShouDongPaiXu.value || zhanKu.paiXuZhong || zhanKu.caoZuoZhong) return
  tuoZhuaiZhong.value = true
  tuoZhuaiQianIdShunXu.value = xianShiDangAnLieBiao.value.map((dangAnXiang) => dangAnXiang.id)
  yuLanShunXu.value = [...xianShiDangAnLieBiao.value]
  qiDongTuoZhuaiXuanZhongBuDi()
}

function onTuoZhuaiGengXin(lieBiao: 档案详情[]): void {
  if (!tuoZhuaiZhong.value || !shiFouShouDongPaiXu.value) return
  const qianIds = tuoZhuaiQianIdShunXu.value
  const xinIds = lieBiao.map((dangAnXiang) => dangAnXiang.id)
  if (xinIds.length !== qianIds.length || new Set(xinIds).size !== qianIds.length) return
  if (xinIds.some((id) => !qianIds.includes(id))) return
  yuLanShunXu.value = [...lieBiao]
}

function zhuanHuanDangQianYe(ids: string[]): string[] {
  const quanBu = zhanKu.dangAnLieBiao.map((dangAnXiang) => dangAnXiang.id)
  const qi = (fenLeiYeMa.value - 1) * FEN_LEI_MEI_YE_TIAO_SHU
  const fuBu = [...quanBu]
  fuBu.splice(qi, ids.length, ...ids)
  return fuBu
}

async function tiJiaoWanZhengPaiXu(recordIds: string[]): Promise<void> {
  if (recordIds.join('|') === zhanKu.dangAnLieBiao.map((dangAnXiang) => dangAnXiang.id).join('|')) return
  const qianWeiZhi = duQuKaPianWeiZhi()
  const jieGuo = await zhanKu.baoCunPaiXu(recordIds)
  xianShiCunKuanJieGuo(jieGuo)
  await boFangLuoWeiDongHua(qianWeiZhi)
}

function onTuoZhuaiJieShu(shiJian?: TuoZhuaiJieShuShiJian): void {
  let yeIds = yuLanShunXu.value.map((dangAnXiang) => dangAnXiang.id)
  const yuanIds = [...tuoZhuaiQianIdShunXu.value]
  if (yeIds.join('|') === yuanIds.join('|')) {
    const jiuSuoYin = shiJian?.oldDraggableIndex ?? shiJian?.jiuSuoYin
    const xinSuoYin = shiJian?.newDraggableIndex ?? shiJian?.xinSuoYin
    if (
      typeof jiuSuoYin === 'number' &&
      typeof xinSuoYin === 'number' &&
      jiuSuoYin >= 0 &&
      xinSuoYin >= 0 &&
      jiuSuoYin !== xinSuoYin &&
      Math.max(jiuSuoYin, xinSuoYin) < yuanIds.length
    ) {
      const [moved] = yuanIds.splice(jiuSuoYin, 1)
      yuanIds.splice(xinSuoYin, 0, moved)
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
  const ids = zhanKu.dangAnLieBiao.map((dangAnXiang) => dangAnXiang.id)
  const dangQianSuoYin = ids.indexOf(recordId)
  const target = dangQianSuoYin + fangXiang
  if (dangQianSuoYin < 0 || target < 0 || target >= ids.length) return
  const tiYiShunXu = [...ids]
  const [moved] = tiYiShunXu.splice(dangQianSuoYin, 1)
  tiYiShunXu.splice(target, 0, moved)
  await tiJiaoWanZhengPaiXu(tiYiShunXu)
}

onMounted(() => {
  void zhanKu.jiaZai()
})

onUnmounted(() => {
  qingKongFenXiangFuZu()
  zhanKu.qingKong()
  tuoZhuaiZhong.value = false
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
  boFangLuoWeiDongHua,
  duQuKaPianWeiZhi,
  shiFouJianDongXiao,
})
</script>

<style scoped>
.zhanji-yemian {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  
  background: var(--yemian-di-beijing);
  
  --zhanji-yi-dong-zuo-kuan: 74px;
}

.zhanji-liebiao {
  flex: 1;
  
  margin-top: var(--jiange-zhong);
  padding: 0 var(--jiange-zhong) var(--jiange-zhong);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-huakuai) transparent;
}


.zhanji-liebiao::-webkit-scrollbar-track {
  background: transparent;
}

.zhanji-liebiao.tuo-zhuai-zhong {
  user-select: none;
  -webkit-user-select: none;
}

.jiazai-zhuangtai,
.kong-zhuangtai {
  
  margin: 0 var(--jiange-4);
  padding: calc(var(--jiange-da) + var(--jiange-zhong)) var(--jiange-da);
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
  margin-bottom: var(--jiange-10);
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


.zhanji-tishi {
  position: sticky;
  top: 0;
  align-self: center;
  z-index: 11;
  max-width: 100%;
  padding: var(--jiange-10) calc(var(--jiange-zhong) + var(--jiange-2));
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
  padding: var(--jiange-12) calc(var(--jiange-xiao) + var(--jiange-6));
  background: rgba(27, 27, 36, 0.88);
  border: 1.5px solid rgba(242, 242, 237, 0.4);
  border-radius: 16px;
  margin-top: var(--jiange-12);
  margin-bottom: var(--jiange-4);
  gap: var(--jiange-12);
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
  gap: var(--jiange-12);
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
  gap: var(--jiange-xiao);
}

.piliang-shanchu-anniu {
  padding: var(--jiange-xiao) var(--jiange-zhong);
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
  padding: var(--jiange-xiao) var(--jiange-zhong);
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
  padding: var(--jiange-xiao) var(--jiange-zhong);
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
  gap: var(--jiange-xiao);
  padding: var(--jiange-10) calc(var(--jiange-xiao) + var(--jiange-6));
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
  gap: var(--jiange-6);
  flex: 1;
  min-width: 0;
}

.paixu-weidu-anniu {
  font-size: 12px;
  font-weight: 700;
  padding: var(--jiange-4) var(--jiange-10);
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
  padding: var(--jiange-4) var(--jiange-10);
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

.fenlei-shu-liang {
  font-size: 12px;
  font-weight: 800;
  padding: var(--jiange-2) var(--jiange-xiao);
  border-radius: 8px;
  background: #ffd500;
  color: #14141a;
  border: 2px solid #14141a;
}

.fen-lei-da-kuan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  padding: var(--jiange-12);
  background: rgba(27, 27, 36, 0.88);
  border: 1.5px solid rgba(242, 242, 237, 0.4);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.fen-lei-da-kuan .piliang-gongju-lan,
.fen-lei-da-kuan .paixu-gongju-lan {
  background: transparent;
  border: none;
  box-shadow: none;
  margin-top: 0;
  margin-bottom: 0;
  padding: var(--jiange-4) 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

:root[data-theme='light'] .fen-lei-da-kuan {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(20, 20, 26, 0.85);
  box-shadow: 3px 3px 0 rgba(20, 20, 26, 0.1);
}

.fen-ye-zu {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-6);
}

.xinxi-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-6);
  flex-wrap: wrap;
  min-width: 0;
}

.xinxi-biaoqian {
  font-size: 11px;
  font-weight: 700;
  color: #b9b9c4;
  flex-shrink: 0;
}

.xinxi-zhi {
  font-size: 12px;
  color: #d6d6de;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zuihou-xiao-xi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  min-width: 0;
}

.zuihou-xiao-xi-tiao {
  display: flex;
  align-items: baseline;
  gap: var(--jiange-6);
  flex-wrap: wrap;
  font-size: 12px;
  color: #b9b9c4;
}

.zuihou-shi-jian {
  flex-shrink: 0;
  color: #8b8b98;
  font-variant-numeric: tabular-nums;
}

.zuihou-nei-rong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

:root[data-theme='light'] .xinxi-biaoqian,
:root[data-theme='light'] .zuihou-xiao-xi-tiao {
  color: #5a5a66;
}

:root[data-theme='light'] .xinxi-zhi {
  color: #3a3a46;
}

:root[data-theme='light'] .zuihou-shi-jian {
  color: #8b8b98;
}


.zhanji-kapian {
  display: block;
  cursor: grab;
}

.zhanji-kapian-nei {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--jiange-xiao) + var(--jiange-6));
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
  margin-right: var(--jiange-12);
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
  margin-right: var(--jiange-12);
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
  gap: var(--jiange-12);
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
  gap: var(--jiange-4);
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

.zhuangtai-biaoqian {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-4);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: var(--jiange-2) var(--jiange-10);
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
  margin-left: var(--jiange-12);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--jiange-xiao);
}

.caozuo-anniu {
  padding: var(--jiange-xiao) var(--jiange-zhong);
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
  padding: var(--jiange-6) var(--jiange-12);
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
  gap: var(--jiange-12);
}

.zhanji-kapian.sortable-ghost {
  
  background: rgba(255, 45, 149, 0.06) !important;
  outline: var(--jujiao-huan-kuan-du) dashed var(--jujiao-huan-yanse);
  border-radius: 16px;
  box-shadow:
    0 0 0 4px var(--xuanzhong-guangyun-yanse),
    0 10px 26px rgba(255, 45, 149, 0.2) !important;
  pointer-events: none;
  
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


.zhanji-kapian.sortable-drag {
  transition: none !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  opacity: 1 !important;
  cursor: grabbing !important;
  
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


.fen-ye-anniu {
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  padding: var(--jiange-2) var(--jiange-10);
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
  gap: var(--jiange-10);
}

.zhanji-tishi-chong-shi {
  flex: 0 0 auto;
  padding: var(--jiange-2) var(--jiange-xiao);
  border: 1px solid currentColor;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.paiXu-cao-zuo {
  display: flex;
  gap: var(--jiange-6);
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

.paiXu-anniu--shouWei:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: var(--pai-xu-shou-wei-jin-yong-bian-kuang);
  background: var(--pai-xu-shou-wei-jin-yong-bei-jing);
  color: var(--pai-xu-shou-wei-jin-yong-wen-ben);
  box-shadow: none;
}

.paiXu-anniu--shouWei:disabled:hover {
  border-color: var(--pai-xu-shou-wei-jin-yong-bian-kuang);
  color: var(--pai-xu-shou-wei-jin-yong-wen-ben);
  box-shadow: none;
}

.zhanji-kapian:focus-visible > .zhanji-kapian-nei {
  border-color: var(--jujiao-huan-yanse);
}


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
:root[data-theme='light'] .kong-zhuangtai {
  color: #3a3a46;
}

:root[data-theme='light'] .quan-xuan-anniu,
:root[data-theme='light'] .quxiao-quanxuan-anniu,
:root[data-theme='light'] .paixu-fangxiang-anniu {
  color: #14141a;
  border-color: #14141a;
}

:root[data-theme='light'] .quan-xuan-anniu:hover,
:root[data-theme='light'] .quxiao-quanxuan-anniu:hover:not(:disabled),
:root[data-theme='light'] .paixu-fangxiang-anniu:hover:not(:disabled) {
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
  border-color: var(--biankuang-yanse);
  background-color: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
}

:root[data-theme='light'] .paiXu-anniu:hover:not(:disabled) {
  border-color: var(--beijing-zhuse);
  background: var(--yanse-zhanji);
  color: var(--beijing-zhuse);
}

:root[data-theme='light'] .zhanji-kapian.sortable-ghost {
  background: rgba(255, 45, 149, 0.05) !important;
}

@media (max-width: 767px) {
  .piliang-gongju-lan {
    row-gap: var(--jiange-zhong);
  }

  .paixu-weidu-zu {
    row-gap: var(--jiange-da);
  }

  .paiXu-cao-zuo {
    column-gap: var(--jiange-10);
  }
}

@media (max-width: 640px) {
  .zhanji-liebiao {
    padding-inline: var(--jiange-10);
  }

  .zhanji-kapian-nei {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--jiange-10);
  }

  .zhanji-zuo {
    flex-basis: calc(100% - var(--zhanji-yi-dong-zuo-kuan));
  }

  .zhanji-you {
    width: 100%;
    margin-left: var(--zhanji-yi-dong-zuo-kuan);
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
  
  .zhanji-kapian.sortable-drag > .zhanji-kapian-nei {
    animation: none !important;
    transform: none !important;
  }
  .zhanji-kapian.sortable-ghost {
    box-shadow: none !important;
  }
}
</style>
