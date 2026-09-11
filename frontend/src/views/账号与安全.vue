<template>
  <div class="zhang-hao-an-quan">
    <div class="ge-ren-she-zhi-tou">
      <div class="she-zhi-touxiang-da">
        <img
          v-if="shiTuPianDiZhi(dangQianTouXiang)"
          :src="dangQianTouXiang || undefined"
          class="she-zhi-touxiang-da-tu"
          alt=""
        />
        <span v-else class="she-zhi-touxiang-da-moren">{{ touXiangShouZi }}</span>
      </div>
      <div class="she-zhi-tou-wenzi">
        <h1 class="she-zhi-biao-ti">{{ huoQuFanYi('sheZhi', 'geRenSheZhiBiaoTi') }}</h1>
        <p class="she-zhi-fu-biao-ti">{{ huoQuFanYi('sheZhi', 'geRenSheZhiFuBiaoTi') }}</p>
        <p class="she-zhi-dang-qian-ming">{{ dangQianMingCheng }}</p>
      </div>
    </div>
    <div id="tou-xiang" class="zhang-hao-kapian mao-dian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'touXiangBiaoTi') }}</h2>
      <div class="touxiang-hang">
        <img
          v-if="shiTuPianDiZhi(dangQianTouXiang)"
          :src="dangQianTouXiang || undefined"
          class="touxiang-yulan"
          alt=""
        />
        <span v-else class="touxiang-yulan-moren">{{ touXiangShouZi }}</span>
        <button class="anniu-fu-zhu xiao-anniu" :disabled="touXiangShangChuanZhong" @click="daKaiTouXiangXuanZe">
          {{ touXiangShangChuanZhong ? huoQuFanYi('sheZhi', 'shangChuanZhong') : huoQuFanYi('sheZhi', 'gengHuanTouXiang') }}
        </button>
      </div>
      <p v-if="touXiangTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': touXiangShiBai }">
        {{ touXiangTiShi }}
      </p>
      <input ref="touXiangInputRef" class="yincang-wenjian-shuru" type="file" accept="image/*" @change="chuLiTouXiangXuanZe" />
    </div>

    <div id="qian-ming" class="zhang-hao-kapian mao-dian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'qianMingBiaoTi') }}</h2>
      <textarea
        v-model="qianMingCaoGao"
        class="qianming-shuru"
        :placeholder="huoQuFanYi('sheZhi', 'qianMingZhanWei')"
        :maxlength="QIAN_MING_ZUI_DA_ZI_FU"
        rows="3"
      />
      <p class="zi-fu-ji-shu">{{ qianMingZiShu }}/{{ QIAN_MING_ZUI_DA_ZI_FU }}</p>
      <label class="ke-jian-xing-hang">
        <span>{{ huoQuFanYi('sheZhi', 'keJianXingBiaoTi') }}</span>
        <select v-model="qianMingKeJianXing" class="ke-jian-xing-xiala">
          <option v-for="xuanXiang in keJianXingXuanXiang" :key="xuanXiang.zhi" :value="xuanXiang.zhi">
            {{ xuanXiang.wenZi }}
          </option>
        </select>
      </label>
      <div v-if="qianMingKeJianXing === 'jin_bu_fen_ren'" class="bai-ming-dan-qu">
        <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'baiMingDanTiShi') }}</p>
        <p v-if="!haoYouKeXuan.length" class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'zanWuHaoYouKeXuan') }}</p>
        <label v-for="haoYou in haoYouKeXuan" :key="haoYou.id" class="bai-ming-dan-xiang">
          <input v-model="qianMingBaiMingDan" type="checkbox" :value="haoYou.id" />
          <span>{{ haoYou.ni_cheng || haoYou.yong_hu_ming }}</span>
        </label>
      </div>
      <button class="anniu-fu-zhu xiao-anniu" :disabled="qianMingBaoCunZhong" @click="baoCunQianMing">
        {{ qianMingBaoCunZhong ? huoQuFanYi('sheZhi', 'baoCunZhong') : huoQuFanYi('sheZhi', 'baoCunQianMing') }}
      </button>
      <p v-if="qianMingTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': qianMingShiBai }">
        {{ qianMingTiShi }}
      </p>
    </div>

    <div id="yong-hu-ming" class="zhang-hao-kapian mao-dian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'xiuGaiYongHuMing') }}</h2>
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'yongHuMingMiaoShu') }}</p>
      <input
        v-model="yongHuMingCaoGao"
        type="text"
        class="she-zhi-shuru yonghuming-shuru"
        :placeholder="huoQuFanYi('ui', 'xinYongHuMing')"
        maxlength="30"
      />
      <button
        class="anniu-fu-zhu xiao-anniu yonghuming-baocun"
        :disabled="yongHuMingBaoCunZhong || !yongHuMingCaoGao.trim()"
        @click="baoCunYongHuMing"
      >
        {{ yongHuMingBaoCunZhong ? huoQuFanYi('sheZhi', 'baoCunZhong') : huoQuFanYi('renZheng', 'queRen') }}
      </button>
      <p v-if="yongHuMingTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': yongHuMingShiBai }">
        {{ yongHuMingTiShi }}
      </p>
    </div>

    <div id="mi-ma" class="zhang-hao-kapian mao-dian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'xiuGaiMiMa') }}</h2>
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'miMaMiaoShu') }}</p>
      <input
        v-model="jiuMiMa"
        type="password"
        class="she-zhi-shuru mima-jiu"
        :placeholder="huoQuFanYi('ui', 'jiuMiMa')"
      />
      <input
        v-model="xinMiMa"
        type="password"
        class="she-zhi-shuru mima-xin"
        :placeholder="huoQuFanYi('ui', 'xinMiMa')"
      />
      <input
        v-model="queRenXinMiMa"
        type="password"
        class="she-zhi-shuru mima-queren"
        :placeholder="huoQuFanYi('ui', 'queRenXinMiMa')"
      />
      <div class="yanzhengma-hang">
        <input
          v-model="miMaYanZhengMa"
          type="tel"
          maxlength="6"
          class="she-zhi-shuru mima-yanzhengma"
          :placeholder="huoQuFanYi('ui', 'yanZhengMa')"
        />
        <button
          type="button"
          class="anniu-fu-zhu xiao-anniu mima-fasong"
          :disabled="!keYiFaSongMiMaMa || miMaFaSongZhong"
          @click="zhiXingFaSongMiMaMa"
        >
          {{ miMaFaSongWenBen }}
        </button>
      </div>
      <button
        class="anniu-fu-zhu xiao-anniu mima-baocun"
        :disabled="miMaBaoCunZhong || !keYiBaoCunMiMa"
        @click="baoCunMiMa"
      >
        {{ miMaBaoCunZhong ? huoQuFanYi('sheZhi', 'baoCunZhong') : huoQuFanYi('renZheng', 'queRen') }}
      </button>
      <p v-if="miMaTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': miMaShiBai }">
        {{ miMaTiShi }}
      </p>
    </div>

    <div id="mo-ren-xing-bie" class="zhang-hao-kapian mao-dian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'sheZhiMoRenXingBie') }}</h2>
      <p class="kapian-miao-shu">{{ huoQuFanYi('caidan', 'moRenXingBieMiaoShu') }}</p>
      <div class="xingbie-wangge">
        <button
          class="xingbie-kapian xingbie-nan"
          :class="{ beiXuanZhong: moRenXingBieXuanZhong === 'male' }"
          @click="moRenXingBieXuanZhong = 'male'"
        >
          {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNan') }}
        </button>
        <button
          class="xingbie-kapian xingbie-nv"
          :class="{ beiXuanZhong: moRenXingBieXuanZhong === 'female' }"
          @click="moRenXingBieXuanZhong = 'female'"
        >
          {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}
        </button>
      </div>
      <button
        class="anniu-fu-zhu xiao-anniu xingbie-baocun"
        :disabled="moRenXingBieBaoCunZhong || !moRenXingBieXuanZhong"
        @click="baoCunMoRenXingBie"
      >
        {{ moRenXingBieBaoCunZhong ? huoQuFanYi('sheZhi', 'baoCunZhong') : huoQuFanYi('renZheng', 'queRen') }}
      </button>
      <p v-if="moRenXingBieTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': moRenXingBieShiBai }">
        {{ moRenXingBieTiShi }}
      </p>
    </div>

    <div v-if="fengJinXianShi" class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'fengJinBiaoTi') }}</h2>
      <p class="kapian-miao-shu">{{ fengJinWenAn }}</p>
      <p v-if="fengJinZhuangTai?.jie_feng_shi_jian" class="kapian-miao-shu">
        {{ huoQuFanYi('sheZhi', 'fengJinJieFengShiJian') }}：{{ geShiHuaJieFengShiJian }}
      </p>
      <p class="kapian-miao-shu">
        {{ huoQuFanYi('sheZhi', 'fengJinWeiGuiCiShu') }}{{ fengJinZhuangTai?.wei_gui_ci_shu || 0 }}{{ huoQuFanYi('sheZhi', 'fengJinCi') }}
      </p>
      <template v-if="fengJinZhuangTai?.bei_feng_jin">
        <p class="kapian-miao-shu">{{ shenSuWenAn }}</p>
        <template v-if="keTiJiaoShenSu">
          <textarea
            v-model="shenSuLiYou"
            class="qianming-shuru"
            :placeholder="huoQuFanYi('sheZhi', 'shenSuZhanWei')"
            :maxlength="500"
            rows="2"
          />
          <button class="anniu-fu-zhu xiao-anniu" :disabled="shenSuTiJiaoZhong" @click="tiJiaoShenSu">
            {{ huoQuFanYi('sheZhi', 'tiJiaoShenSu') }}
          </button>
        </template>
      </template>
      <p v-if="shenSuTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': shenSuShiBai }">
        {{ shenSuTiShi }}
      </p>
    </div>

    <div class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'uidBiaoTi') }}</h2>      <p class="kapian-miao-shu uid-wenben">{{ 设置仓库.uid || 用戶ID }}</p>
      <button class="anniu-fu-zhu xiao-anniu" @click="fuZhiUID">{{ huoQuFanYi('sheZhi', 'fuZhiUID') }}</button>
    </div>

    <div class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'bangDingBiaoTi') }}</h2>
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'shouJiHaoYiBangDing') }}：{{ 脱敏手机号 }}</p>
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'youXiangBangDing') }}：{{ huoQuFanYi('sheZhi', 'zanWeiKaiFang') }}</p>
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'douYinBangDing') }}：{{ huoQuFanYi('sheZhi', 'zanWeiKaiFang') }}</p>
    </div>

    <div class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'yinSiBiaoTi') }}</h2>
      <label class="kai-guan-hang">
        <span>{{ huoQuFanYi('sheZhi', 'gongKaiZhangHao') }}</span>
        <input type="checkbox" :checked="设置仓库.gongKaiZhangHao" @change="qieHuanGongKai('gongKaiZhangHao')" />
      </label>
      <label class="kai-guan-hang">
        <span>{{ huoQuFanYi('sheZhi', 'gongKaiShouJiHao') }}</span>
        <input type="checkbox" :checked="设置仓库.gongKaiShouJiHao" @change="qieHuanGongKai('gongKaiShouJiHao')" />
      </label>
      <label class="kai-guan-hang">
        <span>{{ huoQuFanYi('sheZhi', 'gongKaiYouXiang') }}</span>
        <input type="checkbox" :checked="设置仓库.gongKaiYouXiang" @change="qieHuanGongKai('gongKaiYouXiang')" />
      </label>
    </div>

    <div id="liao-tian-bei-jing" class="zhang-hao-kapian mao-dian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'liaoTianBeiJing') }}</h2>
      <div class="beijing-wangge">
        <button
          v-for="xuanXiang in beiJingXuanXiang"
          :key="xuanXiang.zhi"
          class="beijing-xiangmu"
          :class="[`beijing-${xuanXiang.zhi}`, { beiXuanZhong: 设置仓库.liaoTianBeiJing === xuanXiang.zhi }]"
          @click="xuanZeBeiJing(xuanXiang.zhi)"
        >
          {{ xuanXiang.wenZi }}
        </button>
      </div>
    </div>

    <div class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'paiWeiBiaoTi') }}</h2>
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'paiWeiShuoMing') }}</p>
      <button class="anniu-fu-zhu xiao-anniu" @click="xianShiQingKongQueRen = true">
        {{ huoQuFanYi('sheZhi', 'qingKongPaiWei') }}
      </button>
    </div>

    <div class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('duoMeiTi', 'sheZhiTuPianShouQuan') }}</h2>
      <p class="kapian-miao-shu">
        {{ huoQuFanYi('duoMeiTi', 'zhangHaoAnQuanMiaoShu') }}
      </p>

      <label class="kai-guan-rongqi">
        <input type="checkbox" :checked="tuPianShouQuan" @change="qieHuanTuPianShouQuan" />
        <span class="kai-guan-hua-dong"></span>
      </label>
    </div>

    <div class="zhang-hao-kapian">
      <h2 class="kapian-biao-ti">{{ huoQuFanYi('renZheng', 'zhuXiaoBiaoTi') }}</h2>
      <p class="kapian-miao-shu">{{ huoQuFanYi('renZheng', 'zhuXiaoMiaoShu') }}</p>

      <button
        class="anniu-zhu-yao zhu-xiao-an-niu"
        :disabled="zhuangTai.deng_lu_zhong"
        @click="xianShiQueRen = true"
      >
        {{
          zhuangTai.deng_lu_zhong
            ? huoQuFanYi('renZheng', 'zhuXiaoZhong')
            : huoQuFanYi('renZheng', 'zhuXiao')
        }}
      </button>
    </div>

    <Teleport to="body">
      <Transition name="tan-chuang">
        <div v-if="xianShiQueRen" class="tan-chuang-bei-jing" @click.self="xianShiQueRen = false">
          <div class="tan-chuang-rong-qi">
            <h3 class="tan-chuang-biao-ti">{{ huoQuFanYi('renZheng', 'zhuXiaoQueRen') }}</h3>
            <p class="tan-chuang-miao-shu">{{ huoQuFanYi('renZheng', 'zhuXiaoMiaoShu') }}</p>
            <div class="tan-chuang-an-niu-qun">
              <button class="anniu-fu-zhu" @click="xianShiQueRen = false">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button
                class="anniu-zhu-yao anniu-wei-xian"
                :disabled="zhuangTai.deng_lu_zhong"
                @click="zhiXingZhuXiao"
              >
                {{
                  zhuangTai.deng_lu_zhong
                    ? huoQuFanYi('renZheng', 'zhuXiaoZhong')
                    : huoQuFanYi('renZheng', 'queRen')
                }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="tan-chuang">
        <div v-if="xianShiQingKongQueRen" class="tan-chuang-bei-jing" @click.self="xianShiQingKongQueRen = false">
          <div class="tan-chuang-rong-qi">
            <h3 class="tan-chuang-biao-ti">{{ huoQuFanYi('sheZhi', 'qingKongPaiWei') }}</h3>
            <p class="tan-chuang-miao-shu">{{ huoQuFanYi('sheZhi', 'queRenQingKongPaiWei') }}</p>
            <div class="tan-chuang-an-niu-qun">
              <button class="anniu-fu-zhu" @click="xianShiQingKongQueRen = false">
                {{ huoQuFanYi('renZheng', 'quXiao') }}
              </button>
              <button class="anniu-zhu-yao anniu-wei-xian" @click="zhiXingQingKongPaiWei">
                {{ huoQuFanYi('renZheng', 'queRen') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <Teleport to="body">
      <TouXiangCaiJian
        v-if="caiJianXianShi"
        :tu-yuan="caiJianTuYuan"
        :yuan-mime="caiJianYuanMIME"
        @que-ren="queRenCaiJian"
        @qu-xiao="guanBiCaiJian"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库, type LiaoTianBeiJing } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/translations'
import { shiTuPianDiZhi } from '@/utils/头像'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { gengGaiYongHuMing, gengGaiMiMa, gengGaiMoRenXingBie, faSongMa } from '@/api/认证'
import type { XingBie } from '@/types'
import {
  baoCunQianMing as baoCunQianMingApi,
  shangChuanTouXiang,
  huoQuFengJinZhuangTai,
  tiJiaoShenSu as tiJiaoShenSuApi,
  KE_JIAN_XING_LIE_BIAO,
  shiHeFaKeJianXing,
  type KeJianXing,
  type FengJinZhuangTai,
} from '@/api/资料'
import { huoQuHaoYouLieBiao, type HaoYouXiang } from '@/api/社交'
import TouXiangCaiJian from '@/components/头像裁剪.vue'

const QIAN_MING_ZUI_DA_ZI_FU = 500

const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const router = useRouter()
const route = useRoute()

// 从全局菜单快捷入口带锚点进入时，平滑滚动到对应设置卡片
function gunDongDaoMaoDian() {
  const 锚点 = route.hash.replace('#', '')
  if (!锚点) return
  nextTick(() => {
    document.getElementById(锚点)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const xianShiQueRen = ref(false)
const xianShiQingKongQueRen = ref(false)

const 用戶ID = computed(() => 用户仓库.dangQianYongHu?.id || '')
const 脱敏手机号 = computed(() => {
  const hao = 设置仓库.shouJiHao || 用户仓库.dangQianYongHu?.shou_ji_hao || ''
  if (/^1[3-9]\d{9}$/.test(hao)) return `${hao.slice(0, 3)}****${hao.slice(7)}`
  return hao || '—'
})

const beiJingXuanXiang: Array<{ zhi: LiaoTianBeiJing; wenZi: string }> = [
  { zhi: 'moRen', wenZi: huoQuFanYi('sheZhi', 'beiJingMoRen') },
  { zhi: 'miWuSenLin', wenZi: huoQuFanYi('sheZhi', 'beiJingSenLin') },
  { zhi: 'haiYangZhiLan', wenZi: huoQuFanYi('sheZhi', 'beiJingHaiYang') },
  { zhi: 'fenSeMengJing', wenZi: huoQuFanYi('sheZhi', 'beiJingFenSe') },
  { zhi: 'yeKongXingHe', wenZi: huoQuFanYi('sheZhi', 'beiJingYeKong') },
  { zhi: 'miSeTianYuan', wenZi: huoQuFanYi('sheZhi', 'beiJingTianYuan') },
]

async function fuZhiUID() {
  const wenBen = 设置仓库.uid || 用戶ID.value
  if (!wenBen) return
  try {
    await navigator.clipboard.writeText(wenBen)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

async function xuanZeBeiJing(zhi: LiaoTianBeiJing) {
  await 设置仓库.qieHuanBeiJing(zhi)
}

async function qieHuanGongKai(xiang: 'gongKaiZhangHao' | 'gongKaiShouJiHao' | 'gongKaiYouXiang') {
  if (xiang === 'gongKaiZhangHao') await 设置仓库.baoCunYinSi({ gongKaiZhangHao: !设置仓库.gongKaiZhangHao })
  if (xiang === 'gongKaiShouJiHao') await 设置仓库.baoCunYinSi({ gongKaiShouJiHao: !设置仓库.gongKaiShouJiHao })
  if (xiang === 'gongKaiYouXiang') await 设置仓库.baoCunYinSi({ gongKaiYouXiang: !设置仓库.gongKaiYouXiang })
}

async function zhiXingQingKongPaiWei() {
  xianShiQingKongQueRen.value = false
  await 设置仓库.qingKongPaiWei()
}

const dangQianTouXiang = computed(() => 设置仓库.touXiang || 用户仓库.dangQianYongHu?.tou_xiang || null)
const touXiangShouZi = computed(() => {
  const ming = 用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || '我'
  return ming.trim().slice(0, 1)
})
const touXiangInputRef = ref<HTMLInputElement | null>(null)
const touXiangShangChuanZhong = ref(false)
const touXiangTiShi = ref('')
const touXiangShiBai = ref(false)
const caiJianTuYuan = ref('')
const caiJianYuanMIME = ref('image/png')
const caiJianXianShi = ref(false)

function daKaiTouXiangXuanZe() {
  touXiangTiShi.value = ''
  touXiangInputRef.value?.click()
}

function chuLiTouXiangXuanZe() {
  const wenJian = touXiangInputRef.value?.files?.[0]
  if (touXiangInputRef.value) touXiangInputRef.value.value = ''
  if (!wenJian) return
  if (!wenJian.type.startsWith('image/')) {
    touXiangShiBai.value = true
    touXiangTiShi.value = huoQuFanYi('sheZhi', 'touXiangCaiJianTiShi')
    return
  }
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianTuYuan.value = URL.createObjectURL(wenJian)
  caiJianYuanMIME.value = wenJian.type || 'image/png'
  caiJianXianShi.value = true
}

function guanBiCaiJian() {
  caiJianXianShi.value = false
}

async function queRenCaiJian(wenJian: Blob) {
  caiJianXianShi.value = false
  touXiangShangChuanZhong.value = true
  touXiangShiBai.value = false
  touXiangTiShi.value = ''
  try {
    const diZhi = await shangChuanTouXiang(wenJian)
    设置仓库.touXiang = diZhi
    用户仓库.tongBuZiLiao({ tou_xiang: diZhi })
    touXiangTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    touXiangShiBai.value = true
    touXiangTiShi.value = duQuTiShi(cuoWu)
  } finally {
    touXiangShangChuanZhong.value = false
  }
}

const qianMingCaoGao = ref('')
const qianMingKeJianXing = ref<KeJianXing>('gong_kai')
const qianMingBaiMingDan = ref<string[]>([])
const qianMingBaoCunZhong = ref(false)
const qianMingTiShi = ref('')
const qianMingShiBai = ref(false)
const haoYouKeXuan = ref<HaoYouXiang[]>([])

const qianMingZiShu = computed(() => Array.from(qianMingCaoGao.value).length)

const keJianXingXuanXiang = computed(() =>
  (KE_JIAN_XING_LIE_BIAO as readonly KeJianXing[]).map((zhi) => ({
    zhi,
    wenZi: keJianXingWenZi(zhi),
  })),
)

function keJianXingWenZi(zhi: KeJianXing): string {
  switch (zhi) {
    case 'gong_kai':
      return huoQuFanYi('sheZhi', 'keJianXingGongKai')
    case 'jin_hao_you':
      return huoQuFanYi('sheZhi', 'keJianXingJinHaoYou')
    case 'jin_bu_fen_ren':
      return huoQuFanYi('sheZhi', 'keJianXingJinBuFenRen')
    case 'bu_ke_jian':
      return huoQuFanYi('sheZhi', 'keJianXingBuKeJian')
    default:
      return huoQuFanYi('sheZhi', 'keJianXingJinZiJi')
  }
}

function duQuTiShi(cuoWu: unknown): string {
  if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
    return huoQuCuoWuXiangYing(cuoWu)?.data?.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai')
  }
  return cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('tongYong', 'caoZuoShiBai')
}

async function jiaZaiHaoYouKeXuan() {
  try {
    haoYouKeXuan.value = await huoQuHaoYouLieBiao()
  } catch {
    haoYouKeXuan.value = []
  }
}

async function baoCunQianMing() {
  qianMingBaoCunZhong.value = true
  qianMingShiBai.value = false
  qianMingTiShi.value = ''
  try {
    await baoCunQianMingApi({
      qianMing: qianMingCaoGao.value.trim(),
      keJianXing: qianMingKeJianXing.value,
      baiMingDan: qianMingKeJianXing.value === 'jin_bu_fen_ren' ? qianMingBaiMingDan.value : [],
    })
    设置仓库.qianMing = qianMingCaoGao.value.trim() || null
    设置仓库.qianMingKeJianXing = qianMingKeJianXing.value
    设置仓库.qianMingBaiMingDan = [...qianMingBaiMingDan.value]
    用户仓库.tongBuZiLiao({ qian_ming: qianMingCaoGao.value.trim() || null })
    qianMingTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    qianMingShiBai.value = true
    qianMingTiShi.value = duQuTiShi(cuoWu)
  } finally {
    qianMingBaoCunZhong.value = false
  }
}

const dangQianMingCheng = computed(
  () => 用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || '',
)

const yongHuMingCaoGao = ref('')
const yongHuMingBaoCunZhong = ref(false)
const yongHuMingTiShi = ref('')
const yongHuMingShiBai = ref(false)

const jiuMiMa = ref('')
const xinMiMa = ref('')
const queRenXinMiMa = ref('')
const miMaYanZhengMa = ref('')
const miMaBaoCunZhong = ref(false)
const miMaTiShi = ref('')
const miMaShiBai = ref(false)
const miMaFaSongZhong = ref(false)
const miMaDaoJiShi = ref(0)
let miMaDaoJiShiQi: ReturnType<typeof setInterval> | null = null

const moRenXingBieXuanZhong = ref<XingBie | null>(null)
const moRenXingBieBaoCunZhong = ref(false)
const moRenXingBieTiShi = ref('')
const moRenXingBieShiBai = ref(false)

const keYiBaoCunMiMa = computed(
  () =>
    jiuMiMa.value.length > 0 &&
    xinMiMa.value.length > 0 &&
    queRenXinMiMa.value.length > 0 &&
    /^\d{6}$/.test(miMaYanZhengMa.value),
)

const keYiFaSongMiMaMa = computed(
  () => /^1[3-9]\d{9}$/.test(用户仓库.dangQianYongHu?.shou_ji_hao || '') && miMaDaoJiShi.value === 0,
)

const miMaFaSongWenBen = computed(() => {
  if (miMaFaSongZhong.value) return huoQuFanYi('renZheng', 'faSongZhong')
  if (miMaDaoJiShi.value > 0) return `${miMaDaoJiShi.value}s`
  return huoQuFanYi('renZheng', 'huoQuYanZhengMa')
})

async function baoCunYongHuMing() {
  if (!yongHuMingCaoGao.value.trim()) return
  yongHuMingBaoCunZhong.value = true
  yongHuMingShiBai.value = false
  yongHuMingTiShi.value = ''
  try {
    await gengGaiYongHuMing(yongHuMingCaoGao.value.trim())
    await 用户仓库.jiaZaiYongHu()
    yongHuMingTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    yongHuMingShiBai.value = true
    yongHuMingTiShi.value = duQuTiShi(cuoWu)
  } finally {
    yongHuMingBaoCunZhong.value = false
  }
}

async function zhiXingFaSongMiMaMa() {
  if (!keYiFaSongMiMaMa.value) return
  miMaFaSongZhong.value = true
  miMaShiBai.value = false
  miMaTiShi.value = ''
  try {
    await faSongMa(用户仓库.dangQianYongHu!.shou_ji_hao)
    miMaDaoJiShi.value = 60
    if (miMaDaoJiShiQi) clearInterval(miMaDaoJiShiQi)
    miMaDaoJiShiQi = setInterval(() => {
      miMaDaoJiShi.value--
      if (miMaDaoJiShi.value <= 0) {
        miMaDaoJiShi.value = 0
        if (miMaDaoJiShiQi) {
          clearInterval(miMaDaoJiShiQi)
          miMaDaoJiShiQi = null
        }
      }
    }, 1000)
  } catch (cuoWu: unknown) {
    miMaShiBai.value = true
    miMaTiShi.value = duQuTiShi(cuoWu)
  } finally {
    miMaFaSongZhong.value = false
  }
}

async function baoCunMiMa() {
  if (!keYiBaoCunMiMa.value) return
  if (xinMiMa.value !== queRenXinMiMa.value) {
    miMaShiBai.value = true
    miMaTiShi.value = huoQuFanYi('renZheng', 'miMaBuYiZhi')
    return
  }
  miMaBaoCunZhong.value = true
  miMaShiBai.value = false
  miMaTiShi.value = ''
  try {
    await gengGaiMiMa(jiuMiMa.value, xinMiMa.value, queRenXinMiMa.value, miMaYanZhengMa.value)
    jiuMiMa.value = ''
    xinMiMa.value = ''
    queRenXinMiMa.value = ''
    miMaYanZhengMa.value = ''
    miMaTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    miMaShiBai.value = true
    miMaTiShi.value = duQuTiShi(cuoWu)
  } finally {
    miMaBaoCunZhong.value = false
  }
}

async function baoCunMoRenXingBie() {
  if (!moRenXingBieXuanZhong.value) return
  moRenXingBieBaoCunZhong.value = true
  moRenXingBieShiBai.value = false
  moRenXingBieTiShi.value = ''
  try {
    await gengGaiMoRenXingBie(moRenXingBieXuanZhong.value)
    await 用户仓库.jiaZaiYongHu()
    moRenXingBieTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    moRenXingBieShiBai.value = true
    moRenXingBieTiShi.value = duQuTiShi(cuoWu)
  } finally {
    moRenXingBieBaoCunZhong.value = false
  }
}

onMounted(() => {
  void 设置仓库.jiaZai().then(() => {
    qianMingCaoGao.value = 设置仓库.qianMing || ''
    if (shiHeFaKeJianXing(设置仓库.qianMingKeJianXing)) {
      qianMingKeJianXing.value = 设置仓库.qianMingKeJianXing
    }
    qianMingBaiMingDan.value = [...设置仓库.qianMingBaiMingDan]
    if (设置仓库.qianMingKeJianXing === 'jin_bu_fen_ren') void jiaZaiHaoYouKeXuan()
  })
  yongHuMingCaoGao.value = 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  moRenXingBieXuanZhong.value = 用户仓库.dangQianYongHu?.mo_ren_xing_bie || null
  void jiaZaiFengJinZhuangTai()
  gunDongDaoMaoDian()
})

onBeforeUnmount(() => {
  if (miMaDaoJiShiQi) {
    clearInterval(miMaDaoJiShiQi)
    miMaDaoJiShiQi = null
  }
})

const fengJinZhuangTai = ref<FengJinZhuangTai | null>(null)
const shenSuLiYou = ref('')
const shenSuTiJiaoZhong = ref(false)
const shenSuTiShi = ref('')
const shenSuShiBai = ref(false)

async function jiaZaiFengJinZhuangTai() {
  try {
    fengJinZhuangTai.value = await huoQuFengJinZhuangTai()
  } catch {
    fengJinZhuangTai.value = null
  }
}

const fengJinXianShi = computed(() => {
  const zhuangTai = fengJinZhuangTai.value
  if (!zhuangTai) return false
  return zhuangTai.bei_feng_jin || zhuangTai.wei_gui_ci_shu > 0
})

const fengJinWenAn = computed(() => {
  const zhuangTai = fengJinZhuangTai.value
  if (!zhuangTai || !zhuangTai.bei_feng_jin) {
    return huoQuFanYi('sheZhi', 'fengJinZhengChang')
  }
  if (zhuangTai.ji_bie === 'feng_jin_1_fen') return huoQuFanYi('sheZhi', 'fengJinYiFen')
  if (zhuangTai.ji_bie === 'feng_jin_1_tian') return huoQuFanYi('sheZhi', 'fengJinYiTian')
  return huoQuFanYi('sheZhi', 'fengJinYongJiu')
})

const geShiHuaJieFengShiJian = computed(() => {
  const shiJian = fengJinZhuangTai.value?.jie_feng_shi_jian
  if (!shiJian) return ''
  const riQi = new Date(shiJian)
  return Number.isNaN(riQi.getTime()) ? '' : riQi.toLocaleString()
})

const shenSuWenAn = computed(() => {
  const zhuangTai = fengJinZhuangTai.value?.shen_su_zhuang_tai
  if (zhuangTai === 'shen_su_zhong') return huoQuFanYi('sheZhi', 'shenSuZhong')
  if (zhuangTai === 'yi_jie_chu') return huoQuFanYi('sheZhi', 'shenSuYiJieChu')
  if (zhuangTai === 'bo_hui') return huoQuFanYi('sheZhi', 'shenSuBoHui')
  return huoQuFanYi('sheZhi', 'shenSuBiaoTi')
})

const keTiJiaoShenSu = computed(() => {
  const zhuangTai = fengJinZhuangTai.value?.shen_su_zhuang_tai
  return zhuangTai !== 'shen_su_zhong' && zhuangTai !== 'yi_jie_chu'
})

async function tiJiaoShenSu() {
  if (!shenSuLiYou.value.trim()) {
    shenSuShiBai.value = true
    shenSuTiShi.value = huoQuFanYi('tongYong', 'queShaoCanShu')
    return
  }
  shenSuTiJiaoZhong.value = true
  shenSuShiBai.value = false
  shenSuTiShi.value = ''
  try {
    await tiJiaoShenSuApi(shenSuLiYou.value.trim())
    shenSuLiYou.value = ''
    await jiaZaiFengJinZhuangTai()
  } catch (cuoWu: unknown) {
    shenSuShiBai.value = true
    shenSuTiShi.value = duQuTiShi(cuoWu)
  } finally {
    shenSuTiJiaoZhong.value = false
  }
}

watch(qianMingKeJianXing, (xinZhi) => {
  if (xinZhi === 'jin_bu_fen_ren' && !haoYouKeXuan.value.length) void jiaZaiHaoYouKeXuan()
})

watch(
  () => route.hash,
  () => gunDongDaoMaoDian(),
)

const zhuangTai = computed(() => 用户仓库.zhuangTai)

const tuPianShouQuan = computed({
  get: () => 用户仓库.tuPianShouQuan,
  set: (val) => {
    用户仓库.sheZhiTuPianShouQuan(val)
  },
})

async function qieHuanTuPianShouQuan() {
  tuPianShouQuan.value = !tuPianShouQuan.value
}

async function zhiXingZhuXiao() {
  xianShiQueRen.value = false
  try {
    await 用户仓库.zhiXingZhuXiao()
    router.push('/login')
  } catch {
    // 错误已在仓库中处理
  }
}
</script>

<style scoped>
.zhang-hao-an-quan {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 0 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ─── 个人设置页头（profile hero：头像+标题+副标题+当前名）─── */
.ge-ren-she-zhi-tou {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 4px 0;
  text-align: left;
}

.she-zhi-touxiang-da {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  overflow: hidden;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #07c160, #0a8a44);
}

.she-zhi-touxiang-da-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.she-zhi-tou-wenzi {
  min-width: 0;
}

.she-zhi-biao-ti {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.she-zhi-fu-biao-ti {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0;
}

.she-zhi-dang-qian-ming {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── 账号表单输入 ─── */
.she-zhi-shuru {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
}

.she-zhi-shuru::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.she-zhi-shuru:focus {
  border-color: #07c160;
  outline: none;
}

.yanzhengma-hang {
  display: flex;
  gap: 10px;
}

.yanzhengma-hang .she-zhi-shuru {
  flex: 1;
  min-width: 0;
}

.yanzhengma-hang .xiao-anniu {
  flex: none;
}

.xingbie-wangge {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.xingbie-kapian {
  flex: 1;
  max-width: 160px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
}

.xingbie-kapian.beiXuanZhong {
  border-color: #07c160;
  background: linear-gradient(135deg, rgba(7, 193, 96, 0.25), rgba(10, 138, 68, 0.25));
  box-shadow: 0 0 16px rgba(7, 193, 96, 0.3);
}

@media (min-width: 900px) {
  .zhang-hao-an-quan {
    max-width: 880px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  .ge-ren-she-zhi-tou {
    grid-column: 1 / -1;
  }
}

.zhang-hao-kapian {
  scroll-margin-top: 64px;
  background: rgba(20, 24, 40, 0.6);  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  text-align: center;
}

.kapian-biao-ti {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.kapian-miao-shu {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0;
}

.zhu-xiao-an-niu {
  margin-top: 8px;
}

.uid-wenben {
  word-break: break-all;
  user-select: text;
  -webkit-user-select: text;
}

/* ─── 头像与签名 ─── */
.touxiang-hang {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.touxiang-yulan {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: cover;
  flex: none;
}

.touxiang-yulan-moren {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #07c160, #0a8a44);
}

.ti-shi-wen {
  font-size: 13px;
  color: #07c160;
  margin: 0;
}

.ti-shi-cuowu {
  color: #ff6b6b;
}

.yincang-wenjian-shuru {
  display: none;
}

.qianming-shuru {
  width: 100%;
  min-height: 72px;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.qianming-shuru::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.zi-fu-ji-shu {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  text-align: right;
}

.ke-jian-xing-hang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.ke-jian-xing-xiala {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 13px;
}

.ke-jian-xing-xiala option {
  color: #111;
}

.bai-ming-dan-qu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  text-align: left;
}

.bai-ming-dan-xiang {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.bai-ming-dan-xiang input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #07c160;
}

.xiao-anniu {
  max-width: 200px;
  padding: 10px 20px;
  font-size: 13px;
}

.kai-guan-hang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.kai-guan-hang input[type='checkbox'] {
  width: 44px;
  height: 24px;
  accent-color: #07c160;
}

.beijing-wangge {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.beijing-xiangmu {
  padding: 16px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: #fff;
  border: 2px solid transparent;
}

.beijing-xiangmu.beiXuanZhong {
  border-color: #07c160;
}

.beijing-moRen {
  background: #ededed;
  color: #333;
}

.beijing-miWuSenLin {
  background: linear-gradient(135deg, #1a2f1a, #2d4a2d);
}

.beijing-haiYangZhiLan {
  background: linear-gradient(135deg, #1a3a5c, #2d6a9f);
}

.beijing-fenSeMengJing {
  background: linear-gradient(135deg, #f7d6e0, #f2a7c3);
}

.beijing-yeKongXingHe {
  background: linear-gradient(135deg, #0a0a23, #1a1a4d);
}

.beijing-miSeTianYuan {
  background: linear-gradient(135deg, #f5f0e1, #e8dcc3);
  color: #333;
}

.anniu-zhu-yao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  background: linear-gradient(135deg, #ff4444, #cc0000);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.35s var(--quxian-biao-zhun);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(255, 68, 68, 0.3);
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.anniu-zhu-yao::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  transition: left 0.5s ease;
}

.anniu-zhu-yao:hover:not(:disabled)::before {
  left: 100%;
}

.anniu-zhu-yao:hover:not(:disabled) {
  box-shadow:
    0 6px 28px rgba(255, 68, 68, 0.4),
    0 0 48px rgba(204, 0, 0, 0.15);
  transform: translateY(-2px);
}

.anniu-zhu-yao:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
}

.anniu-zhu-yao:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.anniu-fu-zhu {
  padding: 13px 28px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.anniu-fu-zhu:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
}

.tan-chuang-bei-jing {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
}

.tan-chuang-rong-qi {
  background: rgba(20, 24, 40, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 28px 24px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.tan-chuang-biao-ti {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px;
}

.tan-chuang-miao-shu {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 24px;
}

.tan-chuang-an-niu-qun {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.tan-chuang-an-niu-qun .anniu-zhu-yao {
  background: linear-gradient(135deg, #ff4444, #cc0000);
  max-width: 140px;
  flex: 1;
}

.anniu-wei-xian {
  background: linear-gradient(135deg, #ff4444, #cc0000) !important;
}

.tan-chuang-enter-active,
.tan-chuang-leave-active {
  transition: opacity 0.25s ease;
}

.tan-chuang-enter-from,
.tan-chuang-leave-to {
  opacity: 0;
}

.tan-chuang-enter-from .tan-chuang-rong-qi,
.tan-chuang-leave-to .tan-chuang-rong-qi {
  transform: scale(0.95);
}

@media (max-width: 480px) {
  .tan-chuang-an-niu-qun {
    flex-direction: column-reverse;
  }

  .tan-chuang-an-niu-qun .anniu-zhu-yao,
  .tan-chuang-an-niu-qun .anniu-fu-zhu {
    width: 100%;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .anniu-zhu-yao,
  .anniu-fu-zhu,
  .tan-chuang-enter-active,
  .tan-chuang-leave-active {
    transition: none !important;
  }
}

/* ─── 多媒体授权开关 ─── */
.kai-guan-rongqi {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}

.kai-guan-rongqi input[type='checkbox'] {
  appearance: none;
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: var(--guanbi-anniu-beijing);
  border: 1.5px solid var(--tanchuang-biankuang);
  position: relative;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.kai-guan-rongqi input[type='checkbox']:checked {
  background: linear-gradient(135deg, #00c853, #00e676);
  border-color: #00c853;
}

.kai-guan-rongqi input[type='checkbox']::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s var(--quxian-biao-zhun);
}

.kai-guan-rongqi input[type='checkbox']:checked::before {
  transform: translateX(24px);
}

.kai-guan-rongqi input[type='checkbox']:focus-visible {
  outline: 2px solid var(--xiaoxi-yonghu-beijing);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .anniu-zhu-yao,
  .anniu-fu-zhu,
  .tan-chuang-enter-active,
  .tan-chuang-leave-active,
  .kai-guan-rongqi input[type='checkbox'] {
    transition: none !important;
  }
}
</style>
