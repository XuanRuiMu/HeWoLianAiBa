<template>
  <div ref="yeGen" class="hao-you-ye" data-testid="hao-you-ye" :style="{ '--hao-you-ding-bu-gao': `${dingBuGao}px` }">
    <header ref="dingBu" class="hao-you-ding-bu">
      <div class="biao-ti-hang">
        <h1 class="ye-biao-ti">{{ huoQuFanYi('haoYou', 'yeMianBiaoTi') }}</h1>
        <p class="ji-shu">{{ zongShuWenZi }}</p>
        <button
          class="shua-xin-anniu"
          type="button"
          :aria-label="huoQuFanYi('haoYou', 'shuaXinHaoYou')"
          :disabled="shuaXinZhong"
          @click="shuaXinLieBiao"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.4-5.7" />
            <path d="M20 4v5h-5" />
          </svg>
        </button>
      </div>

      <div class="hao-you-sou-suo">
        <span class="hao-you-sou-suo-tu" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.6-3.6" />
          </svg>
        </span>
        <input
          ref="souSuoShuRu"
          v-model="guanJianZi"
          class="hao-you-sou-suo-shu-ru"
          type="search"
          maxlength="50"
          data-testid="hao-you-sou-suo"
          :placeholder="huoQuFanYi('haoYou', 'zhaoRenZhanWei')"
          :aria-label="huoQuFanYi('haoYou', 'zhaoRenZhanWei')"
          @keydown.enter="zhiXingQuanZhanSouSuo"
        />
        <button
          v-if="guanJianZi"
          class="hao-you-sou-suo-qing"
          type="button"
          :aria-label="huoQuFanYi('haoYou', 'qingKongSouSuo')"
          @click="qingKongGuanJianZi"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
      </div>
    </header>

    <div v-if="zhengZaiChuShiHua" class="jia-zai" role="status" aria-live="polite">
      {{ huoQuFanYi('haoYou', 'jiaZaiZhong') }}
    </div>

    <template v-else>
      <RequestError
        v-if="qianTaiCuoWuZhi"
        :cuo-wu="qianTaiCuoWuZhi"
        :zhong-zai="qianTaiZhuangTai === 'loading'"
        @chong-shi="chongShi"
      />

      <p v-if="caoZuoTiShi" class="cao-zuo-ti-shi" role="status">{{ caoZuoTiShi }}</p>

      <nav class="ru-kou-qu" :aria-label="huoQuFanYi('haoYou', 'haoYouZongLan')">
        <button
          class="ru-kou-ka"
          type="button"
          data-testid="hao-you-xin-de-peng-you"
          @click="qieHuanMianBan('shenQing')"
        >
          <span class="ru-kou-tu" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span class="ru-kou-wen-zi">
            <span class="ru-kou-biao-ti">{{ huoQuFanYi('haoYou', 'xinDePengYouRuKou') }}</span>
            <span class="ru-kou-shuo-ming">{{ xinPengYouShuoMing }}</span>
          </span>
          <span v-if="shouDaoLieBiao.length" class="hong-dian" aria-hidden="true">{{ hongDianShu }}</span>
        </button>

        <button
          class="ru-kou-ka"
          type="button"
          data-testid="hao-you-tong-zhi-ru-kou"
          @click="jinRuTongZhi"
        >
          <span class="ru-kou-tu" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </span>
          <span class="ru-kou-wen-zi">
            <span class="ru-kou-biao-ti">{{ huoQuFanYi('haoYou', 'haoYouTongZhiRuKou') }}</span>
            <span class="ru-kou-shuo-ming">{{ tongZhiShuoMing }}</span>
          </span>
          <span v-if="通知仓库.weiDuShu > 0" class="hong-dian" aria-hidden="true">{{ tongZhiHongDian }}</span>
        </button>
      </nav>

      <section v-if="zhengZaiSouSuo" class="mian-ban" data-testid="hao-you-sou-suo-mian-ban">
        <h2 class="fen-ku-biao-ti">{{ huoQuFanYi('haoYou', 'souSuoJieGuoBiaoJi') }}</h2>

        <ul v-if="benDiJieGuo.length" class="lie-biao">
          <HaoYouTiao
            v-for="haoYou in benDiJieGuo"
            :key="haoYou.id"
            :hao-you-id="haoYou.id"
            :ming-cheng="xianShiMing(haoYou)"
            :tou-xiang="haoYou.tou_xiang"
            :qian-ming="qianMingWen(haoYou)"
            :bei-zhu="beiZhuWen(haoYou)"
            :huo-yue-tai="huoYueTai(haoYou.id)"
            :huo-yue-wen-zi="huoYueWenZi(haoYou.id)"
            :zui-jin-zhai-yao="zuiJinZhaiYao(haoYou.id)"
            :zui-jin-shi-jian="zuiJinShiJian(haoYou.id)"
            @jin-ru="jinRuLiaoTian"
            @da-kai-zi-liao="daKaiZiLiaoKa"
            @bao-cun-bei-zhu="baoCunBeiZhu"
            @shan-chu="shanChu"
          />
        </ul>
        <p v-else class="wu-jie-guo">{{ huoQuFanYi('haoYou', 'benDiWuPiPei') }}</p>

        <button class="quan-zhan-anniu" type="button" :disabled="souSuoZhong" @click="zhiXingQuanZhanSouSuo">
          {{ souSuoZhong ? huoQuFanYi('haoYou', 'quanZhanSouSuoZhong') : huoQuFanYi('haoYou', 'quanZhanSouSuo') }}
        </button>

        <p v-if="souSuoWuJieGuo" class="wu-jie-guo">{{ huoQuFanYi('haoYou', 'quanZhanWuJieGuo') }}</p>

        <ul v-if="souSuoJieGuo.length" class="jie-guo-lie-biao" :aria-label="huoQuFanYi('haoYou', 'quanZhanJieGuoBiaoJi')">
          <li v-for="yongHu in souSuoJieGuo" :key="yongHu.id" class="jie-guo-tiao">
            <button class="zhi-liao-anniu" type="button" :aria-label="huoQuFanYi('haoYou', 'ziLiaoKa')" @click="daKaiZiLiaoKa(yongHu.id)">
              <span class="zhi-liao-tou-xiang">
                <TouXiang :tou-xiang="yongHu.tou_xiang" :mo-ren-zi="(yongHu.ni_cheng || yongHu.yong_hu_ming || '?').slice(0, 1)" />
              </span>
            </button>
            <span class="jie-guo-wen-zi">
              <span class="jie-guo-ming">{{ yongHu.ni_cheng || yongHu.yong_hu_ming || yongHu.shou_ji_hao }}</span>
              <span class="jie-guo-fu">{{ yongHu.qian_ming || huoQuFanYi('haoYou', 'zanWuQianMing') }}</span>
            </span>
            <button
              class="zhu-anniu"
              type="button"
              :disabled="yongHu.shi_hao_you || zhengZaiShenQing === yongHu.id"
              @click="faSongShenQing(yongHu)"
            >
              {{ yongHu.shi_hao_you ? huoQuFanYi('haoYou', 'yiShiHaoYou') : huoQuFanYi('haoYou', 'tianJiaHaoYou') }}
            </button>
          </li>
        </ul>
      </section>

      <section v-else-if="dangQianMianBan === 'shenQing'" class="mian-ban" data-testid="hao-you-shen-qing-mian-ban">
        <div class="mian-ban-tou">
          <button class="fan-hui-anniu" type="button" @click="qieHuanMianBan('haoYou')">
            <span aria-hidden="true">←</span>
            <span>{{ huoQuFanYi('haoYou', 'fanHuiHaoYouLieBiao') }}</span>
          </button>
          <h2 class="mian-ban-biao-ti">{{ huoQuFanYi('haoYou', 'xinDePengYouRuKou') }}</h2>
        </div>

        <h3 class="fen-ku-biao-ti">{{ huoQuFanYi('haoYou', 'shouDaoShenQing') }}</h3>
        <p v-if="haoYouCangKu.shenQingCuoWu" class="cuo-wu-ti-shi" role="status">
          {{ huoQuFanYi('haoYou', 'shenQingJiaZaiShiBai') }}
        </p>
        <HaoYouKongTai
          v-else-if="!shouDaoLieBiao.length"
          :biao-ti="huoQuFanYi('haoYou', 'zanWuShenQing')"
          :ti-shi="huoQuFanYi('haoYou', 'zanWuShenQingTiShi')"
        />
        <ul v-else class="shen-qing-lie-biao">
          <li v-for="shenQing in shouDaoLieBiao" :key="shenQing.id" class="shen-qing-tiao">
            <button class="zhi-liao-anniu" type="button" :aria-label="huoQuFanYi('haoYou', 'ziLiaoKa')" @click="daKaiZiLiaoKa(shenQing.shen_qing_zhe_id || shenQing.id)">
              <span class="zhi-liao-tou-xiang">
                <TouXiang :tou-xiang="shenQing.tou_xiang" :mo-ren-zi="(shenQing.ni_cheng || shenQing.yong_hu_ming || '?').slice(0, 1)" />
              </span>
            </button>
            <span class="jie-guo-wen-zi">
              <span class="jie-guo-ming">{{ shenQing.ni_cheng || shenQing.yong_hu_ming || huoQuFanYi('haoYou', 'weiMingMing') }}</span>
              <span class="jie-guo-fu">{{ huoQuFanYi('haoYou', 'shenQingDaiChuLi') }}</span>
            </span>
            <span class="shen-qing-anniu-zu">
              <button class="zhu-anniu" type="button" @click="jieShou(shenQing.id)">{{ huoQuFanYi('haoYou', 'jieShou') }}</button>
              <button class="ci-anniu" type="button" @click="juJue(shenQing.id)">{{ huoQuFanYi('haoYou', 'juJue') }}</button>
            </span>
          </li>
        </ul>

        <h3 class="fen-ku-biao-ti">{{ huoQuFanYi('haoYou', 'faChuShenQing') }}</h3>
        <p v-if="haoYouCangKu.shenQingCuoWu" class="cuo-wu-ti-shi" role="status">
          {{ huoQuFanYi('haoYou', 'shenQingJiaZaiShiBai') }}
        </p>
        <HaoYouKongTai
          v-else-if="!faChuLieBiao.length"
          :biao-ti="huoQuFanYi('haoYou', 'zanWuFaChuShenQing')"
          :ti-shi="huoQuFanYi('haoYou', 'zanWuFaChuShenQingTiShi')"
        />
        <ul v-else class="shen-qing-lie-biao">
          <li v-for="shenQing in faChuLieBiao" :key="shenQing.id" class="shen-qing-tiao">
            <button class="zhi-liao-anniu" type="button" :aria-label="huoQuFanYi('haoYou', 'ziLiaoKa')" @click="daKaiZiLiaoKa(shenQing.jie_shou_zhe_id || shenQing.id)">
              <span class="zhi-liao-tou-xiang">
                <TouXiang :tou-xiang="shenQing.tou_xiang" :mo-ren-zi="(shenQing.ni_cheng || shenQing.yong_hu_ming || '?').slice(0, 1)" />
              </span>
            </button>
            <span class="jie-guo-wen-zi">
              <span class="jie-guo-ming">{{ shenQing.ni_cheng || shenQing.yong_hu_ming || huoQuFanYi('haoYou', 'weiMingMing') }}</span>
              <span class="jie-guo-fu">{{ huoQuFanYi('haoYou', 'yiFaSongDengDai') }}</span>
            </span>
          </li>
        </ul>
      </section>

      <section v-else class="mian-ban" data-testid="hao-you-ming-ce">
        <p v-if="haoYouCangKu.haoYouCuoWu" class="cuo-wu-ti-shi" role="status">
          {{ huoQuFanYi('haoYou', 'haoYouJiaZaiShiBai') }}
        </p>

        <nav v-if="fenZuLieBiao.length > 1" class="zi-mu-lan" :aria-label="huoQuFanYi('haoYou', 'ziMuSuoYin')">
          <button
            v-for="fenZu in fenZuLieBiao"
            :key="'zi-mu-' + fenZu.shouZiMu"
            class="zi-mu-anniu"
            type="button"
            :aria-label="`${huoQuFanYi('haoYou', 'tiaoDaoFenZu')} ${fenZu.shouZiMu}`"
            @click="tiaoDaoFenZu(fenZu.shouZiMu)"
          >
            {{ fenZu.shouZiMu }}
          </button>
        </nav>

        <template v-if="haoYouLieBiao.length">
          <section v-if="zuiJinLianXiLieBiao.length" class="fen-zu">
            <h2 class="fen-zu-biao-ti">
              <span class="fen-zu-zi">{{ huoQuFanYi('haoYou', 'zuiJinLianXi') }}</span>
              <span class="fen-zu-xian" aria-hidden="true"></span>
            </h2>
            <ul class="lie-biao">
              <HaoYouTiao
                v-for="haoYou in zuiJinLianXiLieBiao"
                :key="'zui-jin-' + haoYou.id"
                :hao-you-id="haoYou.id"
                :ming-cheng="xianShiMing(haoYou)"
                :tou-xiang="haoYou.tou_xiang"
                :qian-ming="qianMingWen(haoYou)"
                :bei-zhu="beiZhuWen(haoYou)"
                :huo-yue-tai="huoYueTai(haoYou.id)"
                :huo-yue-wen-zi="huoYueWenZi(haoYou.id)"
                :zui-jin-zhai-yao="zuiJinZhaiYao(haoYou.id)"
                :zui-jin-shi-jian="zuiJinShiJian(haoYou.id)"
                @jin-ru="jinRuLiaoTian"
                @da-kai-zi-liao="daKaiZiLiaoKa"
                @bao-cun-bei-zhu="baoCunBeiZhu"
                @shan-chu="shanChu"
              />
            </ul>
          </section>

          <section v-for="fenZu in fenZuLieBiao" :key="fenZu.shouZiMu" class="fen-zu" :data-fen-zu="fenZu.shouZiMu">
            <h2 class="fen-zu-biao-ti">
              <span class="fen-zu-zi">{{ fenZu.shouZiMu }}</span>
              <span class="fen-zu-shu">{{ fenZu.lieBiao.length }}</span>
              <span class="fen-zu-xian" aria-hidden="true"></span>
            </h2>
            <ul class="lie-biao">
              <HaoYouTiao
                v-for="haoYou in fenZu.lieBiao"
                :key="haoYou.id"
                :hao-you-id="haoYou.id"
                :ming-cheng="xianShiMing(haoYou)"
                :tou-xiang="haoYou.tou_xiang"
                :qian-ming="qianMingWen(haoYou)"
                :bei-zhu="beiZhuWen(haoYou)"
                :huo-yue-tai="huoYueTai(haoYou.id)"
                :huo-yue-wen-zi="huoYueWenZi(haoYou.id)"
                :zui-jin-zhai-yao="zuiJinZhaiYao(haoYou.id)"
                :zui-jin-shi-jian="zuiJinShiJian(haoYou.id)"
                @jin-ru="jinRuLiaoTian"
                @da-kai-zi-liao="daKaiZiLiaoKa"
                @bao-cun-bei-zhu="baoCunBeiZhu"
                @shan-chu="shanChu"
              />
            </ul>
          </section>
        </template>

        <HaoYouKongTai
          v-else
          :biao-ti="huoQuFanYi('haoYou', 'zanWuHaoYou')"
          :ti-shi="huoQuFanYi('haoYou', 'zanWuHaoYouTiShi')"
          :anniu-wen-zi="huoQuFanYi('haoYou', 'quTianJiaHaoYou')"
          @dian-ji="juJiaoSouSuo"
        />

        <p class="tong-ji">{{ jiShuWenZi }}</p>
      </section>
    </template>

    <Teleport to="body">
      <YongHuZiLiaoKa
        v-if="ziLiaoKaYongHuId"
        :yong-hu-id="ziLiaoKaYongHuId"
        @guan-bi="guanBiZiLiaoKa"
        @fa-xiao-xi="jinRuLiaoTian"
        @tian-jia="chuLiZiLiaoKaTianJia"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/翻译表'
import {
  faSongHaoYouShenQing,
  jieShouHaoYouShenQing,
  juJueHaoYouShenQing,
  shanChuHaoYou,
  type HaoYouSouSuoXiang,
  type HaoYouXiang,
} from '@/api/社交'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { 归一前台错误 } from '@/utils/前台错误'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'
import { geShiHuaHaoYouShiJian, use好友概览, type 好友活跃态 } from '@/composables/use好友概览'
import TouXiang from '@/components/头像.vue'
import YongHuZiLiaoKa from '@/components/用户资料卡.vue'
import HaoYouTiao from '@/components/好友/好友条目.vue'
import HaoYouKongTai from '@/components/好友/好友空态.vue'
import { 使用好友仓库 } from '@/stores/好友'
import { 使用通知仓库 } from '@/stores/通知'

const router = useRouter()
const haoYouCangKu = 使用好友仓库()
const 通知仓库 = 使用通知仓库()
const gaiLan = use好友概览()

const guanJianZi = ref('')
const souSuoZhong = ref(false)
const souSuoJieGuo = ref<HaoYouSouSuoXiang[]>([])
const souSuoWuJieGuo = ref(false)
const caoZuoTiShi = ref('')
const zhengZaiShenQing = ref<string | null>(null)
const ziLiaoKaYongHuId = ref<string | null>(null)
const dangQianMianBan = ref<'haoYou' | 'shenQing'>('haoYou')
const beiZhuBanBen = ref(0)
const shuaXinZhong = ref(false)
const yeGen = ref<HTMLElement | null>(null)
const dingBu = ref<HTMLElement | null>(null)
const dingBuGao = ref(0)
const souSuoShuRu = ref<HTMLInputElement | null>(null)
let dingBuGuanCha: ResizeObserver | null = null

const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, jieShou: jieShouQianTai, chongShi, qingLi } = use前台错误()
const qianTaiCuoWuZhi = computed(() => qianTaiCuoWu.value)

const zhengZaiChuShiHua = computed(() => !haoYouCangKu.yiChuShiHua)
const shouDaoLieBiao = computed(() => haoYouCangKu.shouDaoLieBiao ?? [])
const faChuLieBiao = computed(() => haoYouCangKu.faChuLieBiao ?? [])
const haoYouLieBiao = computed(() => haoYouCangKu.haoYouLieBiao ?? [])
const fenZuLieBiao = computed(() => haoYouCangKu.haoYouFenQu)
const guanJianZiQing = computed(() => guanJianZi.value.trim())
const zhengZaiSouSuo = computed(() => guanJianZiQing.value.length > 0)

const zongShuWenZi = computed(
  () =>
    `${haoYouLieBiao.value.length}${huoQuFanYi('haoYou', 'haoYouZongShu')} · ${shouDaoLieBiao.value.length}${huoQuFanYi('haoYou', 'daiChuLiTiao')}`,
)
const jiShuWenZi = computed(
  () =>
    `${huoQuFanYi('haoYou', 'quanBuHaoYou')} ${haoYouLieBiao.value.length} · ${huoQuFanYi('haoYou', 'shouDaoShenQing')} ${shouDaoLieBiao.value.length}`,
)
const xinPengYouShuoMing = computed(() =>
  shouDaoLieBiao.value.length
    ? `${shouDaoLieBiao.value.length}${huoQuFanYi('haoYou', 'daiChuLiTiao')}`
    : huoQuFanYi('haoYou', 'zanWuDaiChuLi'),
)
const tongZhiShuoMing = computed(() =>
  通知仓库.weiDuShu > 0
    ? `${通知仓库.weiDuShu}${huoQuFanYi('haoYou', 'weiDuTiao')}`
    : huoQuFanYi('haoYou', 'zanWuWeiDuTongZhi'),
)
const hongDianShu = computed(() => (shouDaoLieBiao.value.length > 99 ? '99+' : String(shouDaoLieBiao.value.length)))
const tongZhiHongDian = computed(() => (通知仓库.weiDuShu > 99 ? '99+' : String(通知仓库.weiDuShu)))

const benDiJieGuo = computed<HaoYouXiang[]>(() => {
  const wenBen = guanJianZiQing.value.toLowerCase()
  if (!wenBen) return []
  void beiZhuBanBen.value
  return haoYouLieBiao.value.filter((haoYou) =>
    [xianShiMing(haoYou), beiZhuWen(haoYou), haoYou.yong_hu_ming ?? '', haoYou.qian_ming ?? ''].some((zhi) =>
      zhi.toLowerCase().includes(wenBen),
    ),
  )
})

const zuiJinLianXiLieBiao = computed<HaoYouXiang[]>(() =>
  haoYouLieBiao.value
    .map((haoYou) => ({ haoYou, dongTai: gaiLan.huoQuZuiJin(haoYou.id) }))
    .filter((xiang) => xiang.dongTai !== null)
    .sort((a, b) => (b.dongTai?.shiJianChuo ?? 0) - (a.dongTai?.shiJianChuo ?? 0))
    .slice(0, 5)
    .map((xiang) => xiang.haoYou),
)

function xianShiMing(haoYou: HaoYouXiang): string {
  return haoYouCangKu.huoQuXianShiMing(haoYou) || huoQuFanYi('haoYou', 'weiMingMing')
}

function beiZhuWen(haoYou: HaoYouXiang): string {
  void beiZhuBanBen.value
  return haoYouCangKu.huoQuBeiZhu(haoYou.id)
}

function qianMingWen(haoYou: HaoYouXiang): string {
  return haoYou.qian_ming || huoQuFanYi('haoYou', 'zanWuQianMing')
}

function huoYueTai(haoYouId: string): 好友活跃态 {
  return gaiLan.huoQuHuoYueTai(haoYouId)
}

function huoYueWenZi(haoYouId: string): string {
  return gaiLan.huoQuHuoYueWenZi(haoYouId)
}

function zuiJinZhaiYao(haoYouId: string): string {
  const dongTai = gaiLan.huoQuZuiJin(haoYouId)
  return dongTai ? dongTai.zhaiYao : huoQuFanYi('haoYou', 'zanWuZuiJinXiaoXi')
}

function zuiJinShiJian(haoYouId: string): string {
  const dongTai = gaiLan.huoQuZuiJin(haoYouId)
  return dongTai ? geShiHuaHaoYouShiJian(dongTai.shiJianChuo) : ''
}

function gengXinDingBuGao(): void {
  dingBuGao.value = dingBu.value ? dingBu.value.offsetHeight : 0
}

async function shuaXinLieBiao(): Promise<void> {
  if (shuaXinZhong.value) return
  shuaXinZhong.value = true
  qingLi()
  caoZuoTiShi.value = ''
  try {
    await haoYouCangKu.chuShiHua()
    await gaiLan.jiaZai(haoYouCangKu.haoYouLieBiao)
  } finally {
    shuaXinZhong.value = false
  }
}

function qieHuanMianBan(mianBan: 'haoYou' | 'shenQing'): void {
  dangQianMianBan.value = mianBan
  caoZuoTiShi.value = ''
  yeGen.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function qingKongGuanJianZi(): void {
  guanJianZi.value = ''
  souSuoJieGuo.value = []
  souSuoWuJieGuo.value = false
}

async function juJiaoSouSuo(): Promise<void> {
  qieHuanMianBan('haoYou')
  await nextTick()
  souSuoShuRu.value?.focus()
}

async function zhiXingQuanZhanSouSuo(): Promise<void> {
  const wenBen = guanJianZiQing.value
  if (!wenBen || souSuoZhong.value) return
  souSuoZhong.value = true
  souSuoWuJieGuo.value = false
  qingLi()
  try {
    souSuoJieGuo.value = await haoYouCangKu.souSuo(wenBen)
    if (!souSuoJieGuo.value.length) souSuoWuJieGuo.value = true
  } catch (cuoWu: unknown) {
    if (归一前台错误(cuoWu).code === QIAN_TAI_DAI_MA.RESOURCE_NOT_FOUND) {
      souSuoWuJieGuo.value = true
    } else {
      jieShouQianTai(cuoWu, zhiXingQuanZhanSouSuo)
    }
    souSuoJieGuo.value = []
  } finally {
    souSuoZhong.value = false
  }
}

async function faSongShenQing(yongHu: HaoYouSouSuoXiang): Promise<void> {
  if (yongHu.shi_hao_you) {
    jinRuLiaoTian(yongHu.id)
    return
  }
  if (zhengZaiShenQing.value) return
  zhengZaiShenQing.value = yongHu.id
  caoZuoTiShi.value = ''
  qingLi()
  try {
    await faSongHaoYouShenQing(yongHu.id)
    caoZuoTiShi.value = huoQuFanYi('haoYou', 'shenQingYiFaSong')
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => faSongShenQing(yongHu))
  } finally {
    zhengZaiShenQing.value = null
  }
}

async function jieShou(shenQingId: string): Promise<void> {
  qingLi()
  try {
    await jieShouHaoYouShenQing(shenQingId)
    await haoYouCangKu.shuaXinShenQing()
    await haoYouCangKu.shuaXinHaoYou()
    await gaiLan.jiaZai(haoYouCangKu.haoYouLieBiao)
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => jieShou(shenQingId))
  }
}

async function juJue(shenQingId: string): Promise<void> {
  qingLi()
  try {
    await juJueHaoYouShenQing(shenQingId)
    await haoYouCangKu.shuaXinShenQing()
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => juJue(shenQingId))
  }
}

async function shanChu(haoYouId: string): Promise<void> {
  if (!window.confirm(huoQuFanYi('haoYou', 'queRenShanChuHaoYou'))) return
  qingLi()
  try {
    await shanChuHaoYou(haoYouId)
    await haoYouCangKu.shuaXinHaoYou()
    await gaiLan.jiaZai(haoYouCangKu.haoYouLieBiao)
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => shanChu(haoYouId))
  }
}

function baoCunBeiZhu(haoYouId: string, beiZhu: string): void {
  haoYouCangKu.baoCunBeiZhu(haoYouId, beiZhu)
  beiZhuBanBen.value += 1
}

function jinRuLiaoTian(haoYouId: string): void {
  ziLiaoKaYongHuId.value = null
  void router.push(`/hao-you/${haoYouId}`)
}

function jinRuTongZhi(): void {
  void router.push('/tong-zhi')
}

function daKaiZiLiaoKa(yongHuId: string): void {
  ziLiaoKaYongHuId.value = yongHuId
}

function guanBiZiLiaoKa(): void {
  ziLiaoKaYongHuId.value = null
}

async function chuLiZiLiaoKaTianJia(yongHuId: string): Promise<void> {
  guanBiZiLiaoKa()
  if (zhengZaiShenQing.value) return
  zhengZaiShenQing.value = yongHuId
  caoZuoTiShi.value = ''
  qingLi()
  try {
    await faSongHaoYouShenQing(yongHuId)
    caoZuoTiShi.value = huoQuFanYi('haoYou', 'shenQingYiFaSong')
  } catch (cuoWu: unknown) {
    jieShouQianTai(cuoWu, () => chuLiZiLiaoKaTianJia(yongHuId))
  } finally {
    zhengZaiShenQing.value = null
  }
}

function tiaoDaoFenZu(shouZiMu: string): void {
  const gen = yeGen.value
  if (!gen) return
  const muBiao = gen.querySelector<HTMLElement>(`[data-fen-zu="${shouZiMu}"]`)
  if (!muBiao) return
  gen.scrollTo({ top: Math.max(0, muBiao.offsetTop - dingBuGao.value - 4), behavior: 'smooth' })
}

watch(
  () => haoYouCangKu.haoYouLieBiao,
  (lieBiao) => {
    void gaiLan.jiaZai(lieBiao ?? [])
  },
  { immediate: true },
)

onMounted(() => {
  void haoYouCangKu.chuShiHua()
  gengXinDingBuGao()
  window.addEventListener('resize', gengXinDingBuGao)
  if (typeof ResizeObserver !== 'undefined' && dingBu.value) {
    dingBuGuanCha = new ResizeObserver(gengXinDingBuGao)
    dingBuGuanCha.observe(dingBu.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', gengXinDingBuGao)
  dingBuGuanCha?.disconnect()
  dingBuGuanCha = null
  haoYouCangKu.qingKong()
  gaiLan.qingKong()
})

defineExpose({ dangQianMianBan, guanJianZi, benDiJieGuo, haoYouLieBiao })
</script>

<style scoped>
.hao-you-ye {
  --hao-you-ye-mian: rgba(18, 18, 20, 0.86);
  --hao-you-ye-bian: rgba(255, 255, 255, 0.1);
  --hao-you-ye-wen-ben: #ffffff;
  --hao-you-ye-ci-wen-ben: #d8d8de;
  --hao-you-ye-ruo-wen-ben: #b4b4bb;
  --hao-you-ka-mian: rgba(32, 32, 37, 0.92);
  --hao-you-ka-bian: rgba(255, 255, 255, 0.12);
  --hao-you-ding-bu-mian: rgba(18, 18, 20, 0.94);
  --hao-you-jin: #f0c86a;
  --hao-you-jin-mian: rgba(240, 200, 106, 0.14);
  --hao-you-ding-bu-gao: 0px;
  position: relative;
  width: 100%;
  max-width: 720px;
  height: 100%;
  margin: 0 auto;
  padding: var(--jiange-zhong);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  border-radius: var(--yuanjiao-da);
  border: 1px solid var(--hao-you-ye-bian);
  background: var(--hao-you-ye-mian);
  color: var(--hao-you-ye-wen-ben);
  scrollbar-width: thin;
  scrollbar-color: var(--gundong-tiao-huakuai) transparent;
}

:root[data-theme='light'] .hao-you-ye {
  --hao-you-ye-mian: rgba(255, 255, 255, 0.88);
  --hao-you-ye-bian: rgba(20, 22, 26, 0.1);
  --hao-you-ye-wen-ben: #14161a;
  --hao-you-ye-ci-wen-ben: #3f434a;
  --hao-you-ye-ruo-wen-ben: #55595f;
  --hao-you-ka-mian: rgba(255, 255, 255, 0.94);
  --hao-you-ka-bian: rgba(20, 22, 26, 0.1);
  --hao-you-ding-bu-mian: rgba(255, 255, 255, 0.96);
  --hao-you-jin: #6f4a06;
  --hao-you-jin-mian: rgba(154, 107, 18, 0.12);
}

.hao-you-ye::-webkit-scrollbar {
  width: var(--gundong-tiao-kuan-du);
}

.hao-you-ye::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--gundong-tiao-huakuai);
}

.hao-you-ye::-webkit-scrollbar-track {
  background: transparent;
}

.hao-you-ding-bu {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  padding-bottom: var(--jiange-12);
  background: var(--hao-you-ding-bu-mian);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--hao-you-ye-bian);
}

.biao-ti-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.ye-biao-ti {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: var(--hao-you-ye-wen-ben);
}

.ji-shu {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 12px;
  color: var(--hao-you-ye-ci-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shua-xin-anniu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  border: 1px solid transparent;
  color: var(--hao-you-ye-ci-wen-ben);
  cursor: pointer;
  transition: border-color 0.2s var(--quxian-biao-zhun), color 0.2s var(--quxian-biao-zhun);
}

.shua-xin-anniu svg {
  width: 18px;
  height: 18px;
}

.shua-xin-anniu:hover:not(:disabled) {
  border-color: var(--hao-you-jin);
  color: var(--hao-you-jin);
}

.shua-xin-anniu:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.hao-you-sou-suo {
  --hao-you-sou-suo-yuan-jiao: 999px;
  --hao-you-sou-suo-gao: 44px;
  --hao-you-sou-suo-tu-kou: 18px;
  --hao-you-sou-suo-qing-kou: 44px;
  --hao-you-sou-suo-qing-tu: 16px;
  --hao-you-sou-suo-di: rgba(255, 255, 255, 0.08);
  --hao-you-sou-suo-bian: rgba(255, 255, 255, 0.12);
  --hao-you-sou-suo-tu-se: var(--hao-you-ye-ruo-wen-ben);
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-height: var(--hao-you-sou-suo-gao);
  padding: 0 var(--jiange-4) 0 var(--jiange-12);
  border-radius: var(--hao-you-sou-suo-yuan-jiao);
  background: var(--hao-you-sou-suo-di);
  border: 1px solid var(--hao-you-sou-suo-bian);
  transition: border-color 0.2s var(--quxian-biao-zhun);
}

:root[data-theme='light'] .hao-you-sou-suo {
  --hao-you-sou-suo-di: rgba(20, 22, 26, 0.05);
  --hao-you-sou-suo-bian: rgba(20, 22, 26, 0.1);
}

.hao-you-sou-suo:focus-within {
  border-color: var(--hao-you-jin);
}

.hao-you-sou-suo-tu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--hao-you-sou-suo-tu-kou);
  height: var(--hao-you-sou-suo-tu-kou);
  color: var(--hao-you-sou-suo-tu-se);
}

.hao-you-sou-suo-tu svg {
  width: 100%;
  height: 100%;
}

.hao-you-ye .hao-you-sou-suo .hao-you-sou-suo-shu-ru {
  flex: 1;
  min-width: 0;
  min-height: var(--hao-you-sou-suo-gao);
  padding: 0;
  background-color: transparent;
  color: var(--hao-you-ye-wen-ben);
  font-size: var(--ziti-zhong);
  appearance: none;
}

#app .hao-you-sou-suo .hao-you-sou-suo-shu-ru,
#app .hao-you-sou-suo .hao-you-sou-suo-shu-ru:focus,
#app .hao-you-sou-suo .hao-you-sou-suo-shu-ru:read-only {
  border: 0 !important;
  border-bottom: 0 !important;
  background-image: none !important;
  background-size: auto !important;
  transition: none !important;
}

.hao-you-ye .hao-you-sou-suo .hao-you-sou-suo-shu-ru::placeholder {
  color: var(--hao-you-sou-suo-tu-se);
}

.hao-you-ye .hao-you-sou-suo .hao-you-sou-suo-shu-ru:focus,
.hao-you-ye .hao-you-sou-suo .hao-you-sou-suo-shu-ru:focus-visible {
  outline: none;
}

.hao-you-ye .hao-you-sou-suo .hao-you-sou-suo-shu-ru::-webkit-search-cancel-button {
  display: none;
}

.hao-you-sou-suo-qing {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--hao-you-sou-suo-qing-kou);
  height: var(--hao-you-sou-suo-qing-kou);
  padding: 0;
  border-radius: var(--hao-you-sou-suo-yuan-jiao);
  color: var(--hao-you-sou-suo-tu-se);
  cursor: pointer;
  transition: color 0.2s var(--quxian-biao-zhun);
}

.hao-you-sou-suo-qing svg {
  width: var(--hao-you-sou-suo-qing-tu);
  height: var(--hao-you-sou-suo-qing-tu);
}

.hao-you-sou-suo-qing:hover {
  color: var(--hao-you-jin);
}

.jia-zai {
  padding: var(--jiange-da) var(--jiange-zhong);
  text-align: center;
  font-size: 14px;
  color: var(--hao-you-ye-ci-wen-ben);
}

.cao-zuo-ti-shi {
  margin: 0;
  font-size: 13px;
  color: var(--hao-you-jin);
}

.ru-kou-qu {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--jiange-xiao);
}

.ru-kou-ka {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  min-height: 64px;
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  background: var(--hao-you-ka-mian);
  border: 1px solid var(--hao-you-ka-bian);
  text-align: left;
  color: var(--hao-you-ye-wen-ben);
  cursor: pointer;
  transition: border-color 0.2s var(--quxian-biao-zhun), transform 0.2s var(--quxian-tan-chu);
}

.ru-kou-ka:hover {
  border-color: var(--hao-you-jin);
}

.ru-kou-ka:active {
  transform: scale(0.985);
}

.ru-kou-tu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--hao-you-jin-mian);
  color: var(--hao-you-jin);
}

.ru-kou-tu svg {
  width: 20px;
  height: 20px;
}

.ru-kou-wen-zi {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
}

.ru-kou-biao-ti {
  font-size: 14px;
  font-weight: 600;
  color: var(--hao-you-ye-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ru-kou-shuo-ming {
  font-size: 12px;
  color: var(--hao-you-ye-ci-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hong-dian {
  flex: none;
  min-width: 20px;
  padding: 0 var(--jiange-6);
  border-radius: 999px;
  background-color: #c81e1e;
  color: #ffffff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.mian-ban {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.mian-ban-tou {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.fan-hui-anniu {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-6);
  min-height: 44px;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: var(--yuanjiao-xiao);
  background: var(--hao-you-ka-mian);
  border: 1px solid var(--hao-you-ka-bian);
  color: var(--hao-you-ye-ci-wen-ben);
  font-size: 13px;
  cursor: pointer;
}

.fan-hui-anniu:hover {
  border-color: var(--hao-you-jin);
  color: var(--hao-you-jin);
}

.mian-ban-biao-ti {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--hao-you-ye-wen-ben);
}

.fen-ku-biao-ti {
  margin: var(--jiange-xiao) 0 0;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--hao-you-ye-ci-wen-ben);
}

.zi-mu-lan {
  display: flex;
  flex-wrap: wrap;
  gap: var(--jiange-4);
  padding-bottom: var(--jiange-4);
}

.zi-mu-anniu {
  flex: none;
  min-width: 44px;
  min-height: 44px;
  padding: 0 var(--jiange-6);
  border-radius: var(--yuanjiao-xiao);
  background: var(--hao-you-ka-mian);
  border: 1px solid var(--hao-you-ka-bian);
  color: var(--hao-you-ye-ci-wen-ben);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s var(--quxian-biao-zhun), color 0.2s var(--quxian-biao-zhun);
}

.zi-mu-anniu:hover {
  border-color: var(--hao-you-jin);
  color: var(--hao-you-jin);
}

.fen-zu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
}

.fen-zu-biao-ti {
  position: sticky;
  top: var(--hao-you-ding-bu-gao);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  margin: 0;
  padding: var(--jiange-6) 0;
  background: var(--hao-you-ye-mian);
  font-size: 12px;
  font-weight: 600;
  color: var(--hao-you-ye-ci-wen-ben);
}

.fen-zu-zi {
  color: var(--hao-you-jin);
}

.fen-zu-shu {
  font-size: 11px;
  color: var(--hao-you-ye-ruo-wen-ben);
}

.fen-zu-xian {
  flex: 1;
  height: 1px;
  background: var(--hao-you-ye-bian);
}

.lie-biao,
.shen-qing-lie-biao,
.jie-guo-lie-biao {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
}

.shen-qing-tiao,
.jie-guo-tiao {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  min-height: 60px;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  background: var(--hao-you-ka-mian);
  border: 1px solid var(--hao-you-ka-bian);
}

.zhi-liao-anniu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
}

.zhi-liao-tou-xiang {
  display: block;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--zhuse);
  font-size: 17px;
  color: #ffffff;
}

.jie-guo-wen-zi {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
}

.jie-guo-ming {
  font-size: 14px;
  font-weight: 600;
  color: var(--hao-you-ye-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jie-guo-fu {
  font-size: 12px;
  color: var(--hao-you-ye-ci-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zhu-anniu,
.ci-anniu,
.quan-zhan-anniu {
  flex: none;
  min-height: 44px;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: var(--yuanjiao-xiao);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s var(--quxian-biao-zhun);
}

.zhu-anniu,
.quan-zhan-anniu {
  border: 1px solid transparent;
  background-color: #e8bb55;
  background-image: linear-gradient(135deg, #f7d27a, #d9a441);
  color: #2a1d05;
}

.zhu-anniu:hover:not(:disabled),
.quan-zhan-anniu:hover:not(:disabled) {
  filter: brightness(1.06);
}

.zhu-anniu:disabled,
.quan-zhan-anniu:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ci-anniu {
  background: transparent;
  border: 1px solid var(--hao-you-ka-bian);
  color: var(--hao-you-ye-ci-wen-ben);
}

.ci-anniu:hover {
  border-color: var(--cuowu-yanse);
  color: var(--cuowu-yanse);
}

.shen-qing-anniu-zu {
  display: flex;
  gap: var(--jiange-6);
}

.quan-zhan-anniu {
  align-self: flex-start;
  margin-top: var(--jiange-4);
}

.wu-jie-guo {
  margin: 0;
  font-size: 13px;
  color: var(--hao-you-ye-ci-wen-ben);
}

.cuo-wu-ti-shi {
  margin: 0;
  font-size: 13px;
  color: var(--cuowu-yanse);
}

.tong-ji {
  margin: var(--jiange-xiao) 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--hao-you-ye-ruo-wen-ben);
}

@media (max-width: 420px) {
  .ru-kou-qu {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .hao-you-ye {
    padding: var(--jiange-12);
    border-radius: 0;
  }

  .ye-biao-ti {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ru-kou-ka,
  .zi-mu-anniu,
  .shua-xin-anniu {
    transition: none;
  }
}
</style>
