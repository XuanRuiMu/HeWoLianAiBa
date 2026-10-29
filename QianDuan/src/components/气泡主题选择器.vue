<template>
  <section class="qipao-zhuTi-xuanZeQi" :aria-label="biaoTi" :style="sheZhi.qiPaoCSSBianLiang">
    <div class="qi-pao-liang-lan">
      <section v-for="zu in fenZu" :key="zu.jian" class="qi-pao-ce">
        <h3 class="qi-pao-ce-ti">{{ zu.biaoTi }}</h3>

        <div class="qi-pao-qun" role="radiogroup" :aria-label="zu.biaoTi">
          <button
            v-for="yuShe in QI_PAO_YU_SHE_XUAN_XIANG"
            :key="'yu-she-' + yuShe"
            type="button"
            class="qi-pao-xuan-xiang qi-pao-xuan-xiang--ka"
            :class="{
              'qi-pao-xuan-xiang--xuan': shiXuanZhongYuShe(zu.jian, yuShe),
              'qi-pao-ka--ziJi': zu.jian === 'ziJi',
              'qi-pao-ka--ai': zu.jian === 'ai',
            }"
            role="radio"
            :aria-checked="shiXuanZhongYuShe(zu.jian, yuShe)"
            :data-yu-she="yuShe"
            :data-ming-cheng="shiXianYuShe(zu.jian, yuShe)"
            :style="xuanXiangYangShi(zu.jian, yuShe)"
            @click="xuanZeYuShe(zu.jian, yuShe)"
          >
            <span class="qi-pao-xuan-xiang-wen" data-wai-guan-gai-ming @dblclick.stop="daKaiYuSheBianJi(yuShe)">
              <span class="qi-pao-xuan-xiang-wen-nei" :title="shiXianYuShe(zu.jian, yuShe)">{{
                shiXianYuShe(zu.jian, yuShe)
              }}</span>
            </span>
            <span v-if="shiXuanZhongYuShe(zu.jian, yuShe)" class="qi-pao-gou" aria-hidden="true">✓</span>
            <span
              role="button"
              tabindex="-1"
              class="qi-pao-ka-kong-zhi"
              :aria-label="bianJiMingChengWenAn + '：' + shiXianYuShe(zu.jian, yuShe)"
              data-wai-guan-gai-ming
              @click.stop="daKaiYuSheBianJi(yuShe)"
              @dblclick.stop="daKaiYuSheBianJi(yuShe)"
            >
              <svg
                class="qi-pao-ka-kong-zhi-tu-biao"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </span>
            <QiPaoWeiBa :ce="zu.jian === 'ziJi' ? 'you' : 'zuo'" />
          </button>

          <VueDraggable
            class="qi-pao-tuo-qu"
            :model-value="sheZhi.waiGuan.qiPao"
            :disabled="上传中 || 删除中"
            :direction="tuoZhuaiFangXiang"
            :animation="TUO_ZHUAI_HAO_MIAO"
            :delay="300"
            :delay-on-touch-only="true"
            :filter="'.qi-pao-ka-kong-zhi'"
            :prevent-on-filter="false"
            ghost-class="sortable-ghost"
            chosen-class="sortable-chosen"
            drag-class="sortable-drag"
            fallback-class="sortable-drag"
            :force-fallback="true"
            :fallback-on-body="true"
            @update:model-value="tuoZhuaiGengXinQiPao"
          >
            <div
              v-for="tiaoMu in sheZhi.waiGuan.qiPao"
              :key="tiaoMu.id"
              class="qi-pao-zi-ding-yi-wei"
              :data-id="tiaoMu.id"
            >
              <button
                type="button"
                class="qi-pao-xuan-xiang qi-pao-xuan-xiang--ka qi-pao-zi-ding-yi"
                :class="{
                  'qi-pao-xuan-xiang--xuan': zu.xuanZhongZiDingYi === tiaoMu.id,
                  'qi-pao-ka--ziJi': zu.jian === 'ziJi',
                  'qi-pao-ka--ai': zu.jian === 'ai',
                }"
                role="radio"
                :aria-checked="zu.xuanZhongZiDingYi === tiaoMu.id"
                :data-ming-cheng="shiXianTiaoMu(zu.jian, tiaoMu)"
                :style="ziDingYiYangShi(zu.jian, tiaoMu)"
                @click="xuanZeZiDingYi(zu.jian, tiaoMu.id)"
              >
                <span class="qi-pao-xuan-xiang-wen" data-wai-guan-gai-ming @dblclick.stop="daKaiBianJi(tiaoMu)">
                  <span class="qi-pao-xuan-xiang-wen-nei" :title="shiXianTiaoMu(zu.jian, tiaoMu)">{{
                    shiXianTiaoMu(zu.jian, tiaoMu)
                  }}</span>
                </span>
                <span v-if="zu.xuanZhongZiDingYi === tiaoMu.id" class="qi-pao-gou" aria-hidden="true">✓</span>
                <span
                  role="button"
                  tabindex="-1"
                  class="qi-pao-ka-kong-zhi"
                  :aria-label="bianJiMingChengWenAn + '：' + tiaoMu.mingCheng"
                  data-wai-guan-gai-ming
                  @click.stop="daKaiBianJi(tiaoMu)"
                  @dblclick.stop="daKaiBianJi(tiaoMu)"
                >
                  <svg
                    class="qi-pao-ka-kong-zhi-tu-biao"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </span>
                <span
                  role="button"
                  tabindex="-1"
                  class="qi-pao-ka-kong-zhi qi-pao-ka-kong-zhi--shan-chu"
                  :aria-label="shanChuWenAn + '：' + tiaoMu.mingCheng"
                  @click.stop="zhunBeiShanChu(tiaoMu)"
                  @dblclick.stop
                >
                  <svg
                    class="qi-pao-ka-kong-zhi-tu-biao"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </span>
                <QiPaoWeiBa :ce="zu.jian === 'ziJi' ? 'you' : 'zuo'" />
              </button>
            </div>
          </VueDraggable>

          <button
            type="button"
            class="qi-pao-shang-chuan"
            :disabled="上传中"
            :aria-label="shangChuanWenAn"
            @click="daKaiShangChuan(zu.jian)"
          >
            <span class="qi-pao-shang-chuan-jia" aria-hidden="true">＋</span>
            <span>{{ 上传中 ? shangChuanZhongWenAn : shangChuanWenAn }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-if="编辑目标" class="qi-pao-bian-ji-wei">
      <WaiGuanJiuDiBianJi
        :key="编辑目标.键"
        :biao-ti="bianJiBiaoTi"
        :ming-cheng="编辑目标.名称"
        :wen-zi-yan-se="编辑目标.文字颜色"
        :zui-da-zi-fu="WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU"
        lei-bie="qiPao"
        :cuo-wu-wen-an="编辑错误"
        :cao-zuo-zhong="编辑保存中"
        :ju-jiao-xu-hao="外观编辑.聚焦序号"
        @tijiao="保存编辑"
        @huan-yuan="还原编辑"
        @qu-xiao="结束编辑"
        @yu-lan="更新预览"
      />
    </div>

    <p v-if="tiShiWenAn" class="qi-pao-ti-shi" :class="{ 'qi-pao-ti-shi--cuo-wu': tiShiShiBai }" role="status">
      {{ tiShiWenAn }}
    </p>

    <input
      ref="wenJianShuRu"
      class="qi-pao-wen-jian-shu-ru"
      type="file"
      :accept="tuPianMime"
      :aria-label="shangChuanWenAn"
      @change="chuLiWenJianXuanZe"
    />

    <ShangChuanShuoMing
      :xian-shi="显示上传说明"
      lei-bie="qiPao"
      @que-ren="queRenShangChuan"
      @qu-xiao="显示上传说明 = false"
    />

    <Teleport to="body">
      <TuPianCaiJian
        v-if="caiJianXianShi"
        :tu-yuan="caiJianTuYuan"
        :yuan-mime="caiJianYuanMIME"
        :biao-ti="huoQuFanYi('sheZhi', 'caiJianQiPao')"
        :ti-shi="huoQuFanYi('sheZhi', 'tuPianCaiJianTiShi')"
        :kuan-gao-bi="2"
        :wen-jian-ming="'qipao'"
        yu-lan-lei-xing="qiPao"
        :yu-lan-ce-zhong="shangChuanFang"
        @que-ren="queRenCaiJian"
        @qu-xiao="guanBiCaiJian"
      />
    </Teleport>

    <div class="qi-pao-xing-zhuang" role="group" :aria-label="xingZhuangBiaoTiWen">
      <h3 class="qi-pao-xing-zhuang-ti">{{ xingZhuangBiaoTiWen }}</h3>
      <div class="qi-pao-xing-zhuang-hang">
        <span class="qi-pao-xing-zhuang-ming">{{ weiBaDaXiaoWen }}</span>
        <div class="qi-pao-dang-wei-qun" role="radiogroup" :aria-label="weiBaDaXiaoWen">
          <button
            v-for="xiang in weiBaMoShiXuanXiang"
            :key="'wei-ba-mo-shi-' + xiang.zhi"
            type="button"
            class="qi-pao-dang-wei-ka"
            :class="{ 'qi-pao-dang-wei-ka--xuan': xiang.xuan }"
            role="radio"
            :aria-checked="xiang.xuan"
            @click="sheZhi.shiYongQiPaoXingZhuang({ weiBaMoShi: xiang.zhi })"
          >
            {{ xiang.wen }}
          </button>
        </div>
      </div>
      <div class="qi-pao-xing-zhuang-hang">
        <span class="qi-pao-xing-zhuang-ming">{{ weiBaWeiZhiWen }}</span>
        <div class="qi-pao-dang-wei-qun" role="radiogroup" :aria-label="weiBaWeiZhiWen">
          <button
            v-for="xiang in weiBaWeiZhiXuanXiang"
            :key="'wei-ba-wei-zhi-' + xiang.zhi"
            type="button"
            class="qi-pao-dang-wei-ka"
            :class="{ 'qi-pao-dang-wei-ka--xuan': xiang.xuan }"
            role="radio"
            :aria-checked="xiang.xuan"
            @click="sheZhi.shiYongQiPaoXingZhuang({ weiBaWeiZhi: xiang.zhi })"
          >
            {{ xiang.wen }}
          </button>
        </div>
      </div>
      <div class="qi-pao-xing-zhuang-hang">
        <span class="qi-pao-xing-zhuang-ming">{{ yuanJiaoWen }}</span>
        <div class="qi-pao-dang-wei-qun" role="radiogroup" :aria-label="yuanJiaoWen">
          <button
            v-for="xiang in yuanJiaoXuanXiang"
            :key="'yuan-jiao-' + xiang.zhi"
            type="button"
            class="qi-pao-dang-wei-ka"
            :class="{ 'qi-pao-dang-wei-ka--xuan': xiang.xuan }"
            role="radio"
            :aria-checked="xiang.xuan"
            @click="sheZhi.shiYongQiPaoXingZhuang({ yuanJiaoDangWei: xiang.zhi })"
          >
            {{ xiang.wen }}
          </button>
        </div>
      </div>
      <div class="qi-pao-xing-zhuang-hang">
        <span class="qi-pao-xing-zhuang-ming">{{ miaoBianWen }}</span>
        <div class="qi-pao-dang-wei-qun" role="radiogroup" :aria-label="miaoBianWen">
          <button
            type="button"
            class="qi-pao-dang-wei-ka"
            :class="{ 'qi-pao-dang-wei-ka--xuan': !sheZhi.qiPaoMiaoBianKaiQi }"
            role="radio"
            :aria-checked="!sheZhi.qiPaoMiaoBianKaiQi"
            @click="sheZhi.shiYongQiPaoXingZhuang({ miaoBianKaiQi: false })"
          >
            {{ miaoBianGuanWen }}
          </button>
          <button
            type="button"
            class="qi-pao-dang-wei-ka"
            :class="{ 'qi-pao-dang-wei-ka--xuan': sheZhi.qiPaoMiaoBianKaiQi }"
            role="radio"
            :aria-checked="sheZhi.qiPaoMiaoBianKaiQi"
            @click="sheZhi.shiYongQiPaoXingZhuang({ miaoBianKaiQi: true })"
          >
            {{ miaoBianKaiWen }}
          </button>
        </div>
        <div v-if="sheZhi.qiPaoMiaoBianKaiQi" class="qi-pao-miao-bian-se" role="group" :aria-label="miaoBianSeWen">
          <button
            v-for="yanSe in QI_PAO_MIAO_BIAN_SE_XUAN_XIANG"
            :key="'miao-bian-' + yanSe"
            type="button"
            class="qi-pao-miao-bian-se-kuai"
            :class="{ 'qi-pao-miao-bian-se-kuai--xuan': sheZhi.qiPaoMiaoBianYanSe === yanSe }"
            :style="{ background: yanSe }"
            :aria-label="yanSe"
            :aria-pressed="sheZhi.qiPaoMiaoBianYanSe === yanSe"
            @click="sheZhi.shiYongQiPaoXingZhuang({ miaoBianYanSe: yanSe })"
          />
          <label class="qi-pao-miao-bian-zi-ding-yi" :class="{ 'qi-pao-miao-bian-zi-ding-yi--xuan': shiZiDingYiMiaoBianSe }">
            <input
              type="color"
              :value="sheZhi.qiPaoMiaoBianYanSe"
              :aria-label="miaoBianSeWen"
              @input="chuLiMiaoBianSeShuRu"
            />
            <span aria-hidden="true">＋</span>
          </label>
        </div>
      </div>
    </div>

    <QueRenDuiHuaKuang
      :xian-shi="显示删除确认"
      :biao-ti="shanChuBiaoTi"
      :miao-shu="shanChuMiaoShu"
      :que-ren-wen-an="删除中 ? shanChuZhongWenAn : shanChuWenAn"
      :qu-xiao-wen-an="quXiaoWenAn"
      :cao-zuo-zhong="删除中"
      @que-ren="queRenShanChu"
      @qu-xiao="guanBiShanChuQueRen"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用外观编辑仓库, type 气泡编辑目标 } from '@/stores/外观编辑'
import { QI_PAO_YU_SHE_XUAN_XIANG, huoQuQiPaoDingYi, type QiPaoYuShe } from '@/config/气泡主题'
import { QI_PAO_WEN_AN, huoQuQiPaoMingCheng } from '@/config/气泡主题文案'
import { huoQuFanYi } from '@/config/翻译表'
import { jianShaoDongXiaoGuo } from '@/utils/动效偏好'
import { tiQuCuoWuWenBen } from '@/utils/前台错误'
import { baoCunWaiGuan } from '@/api/社交'
import {
  WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU,
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_TU_PIAN_MIME,
  WAI_GUAN_QI_PAO_YAN_SE_XUAN_XIANG,
  QI_PAO_WEI_BA_MO_SHI_LIE_BIAO,
  QI_PAO_WEI_BA_WEI_ZHI_LIE_BIAO,
  QI_PAO_YUAN_JIAO_DANG_WEI_LIE_BIAO,
  guiYiWaiGuanChuCan,
  huoQuQiPaoBeiJingZhi,
  zhongPaiWaiGuanTiaoMu,
  type QiPaoWeiBaMoShi,
  type QiPaoWeiBaWeiZhi,
  type QiPaoYuanJiaoDangWei,
  type WaiGuanLaShenMoShi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'
import ShangChuanShuoMing from '@/components/上传说明层.vue'
import QueRenDuiHuaKuang from '@/components/确认对话框.vue'
import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'

const TuPianCaiJian = defineAsyncComponent(() => import('@/components/图片裁剪.vue'))

const TUO_ZHUAI_HAO_MIAO = jianShaoDongXiaoGuo() ? 0 : 200
function tuoZhuaiFangXiang(_shiJian: unknown, muBiao: unknown, tuoDongXiang: unknown): 'vertical' | 'horizontal' {
  const a = tuoDongXiang instanceof Element ? tuoDongXiang.getBoundingClientRect() : null
  const b = muBiao instanceof Element ? muBiao.getBoundingClientRect() : null
  if (!a || !b) return 'vertical'
  return Math.abs(b.top - a.top) <= Math.abs(b.left - a.left) ? 'horizontal' : 'vertical'
}

const biaoTi = QI_PAO_WEN_AN.biaoTi
const sheZhi = 使用用户设置仓库()

const shanChuWenAn = huoQuFanYi('sheZhi', 'waiGuanShanChuQiPao')
const shanChuBiaoTi = huoQuFanYi('sheZhi', 'shanChuZiDingYiQiPao')
const shangChuanWenAn = huoQuFanYi('sheZhi', 'ziDingYiShangChuan')
const shangChuanZhongWenAn = huoQuFanYi('sheZhi', 'shangChuanZhongWenAn')
const bianJiBiaoTi = huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')
const bianJiMingChengWenAn = huoQuFanYi('sheZhi', 'waiGuanBianJiMingCheng')
const quXiaoWenAn = huoQuFanYi('sheZhi', 'waiGuanQuXiao')
const shanChuZhongWenAn = huoQuFanYi('sheZhi', 'shanChuZhongWenAn')
const 保存成功文案 = huoQuFanYi('sheZhi', 'waiGuanShangChuanChengGong')
const 还原成功文案 = huoQuFanYi('sheZhi', 'waiGuanYiHuiFuMoRen')
const 失败文案 = huoQuFanYi('sheZhi', 'waiGuanBaoCunShiBai')
const tuPianMime = WAI_GUAN_TU_PIAN_MIME.join(',')

const xingZhuangBiaoTiWen = huoQuFanYi('qiPao', 'xingZhuangBiaoTi')
const weiBaDaXiaoWen = huoQuFanYi('qiPao', 'weiBaDaXiao')
const weiBaWeiZhiWen = huoQuFanYi('qiPao', 'weiBaWeiZhi')
const yuanJiaoWen = huoQuFanYi('qiPao', 'yuanJiaoDangWei')
const miaoBianWen = huoQuFanYi('qiPao', 'miaoBianBiaoTi')
const miaoBianKaiWen = huoQuFanYi('qiPao', 'miaoBianKai')
const miaoBianGuanWen = huoQuFanYi('qiPao', 'miaoBianGuan')
const miaoBianSeWen = huoQuFanYi('qiPao', 'miaoBianYanSe')
const QI_PAO_MIAO_BIAN_SE_XUAN_XIANG = WAI_GUAN_QI_PAO_YAN_SE_XUAN_XIANG

const WEI_BA_MO_SHI_WEN_JIAN: Record<QiPaoWeiBaMoShi, 'weiBaMoRen' | 'weiBaDa' | 'weiBaXiao' | 'weiBaWu'> = {
  moRen: 'weiBaMoRen',
  da: 'weiBaDa',
  xiao: 'weiBaXiao',
  wu: 'weiBaWu',
}
const WEI_BA_WEI_ZHI_WEN_JIAN: Record<QiPaoWeiBaWeiZhi, 'weiBaShang' | 'weiBaZhong' | 'weiBaXia'> = {
  shang: 'weiBaShang',
  zhong: 'weiBaZhong',
  xia: 'weiBaXia',
}
const YUAN_JIAO_WEN_JIAN: Record<QiPaoYuanJiaoDangWei, 'yuanJiaoXiao' | 'yuanJiaoZhong' | 'yuanJiaoDa'> = {
  xiao: 'yuanJiaoXiao',
  zhong: 'yuanJiaoZhong',
  da: 'yuanJiaoDa',
}

const weiBaMoShiXuanXiang = computed(() =>
  QI_PAO_WEI_BA_MO_SHI_LIE_BIAO.map((zhi) => ({
    zhi,
    wen: huoQuFanYi('qiPao', WEI_BA_MO_SHI_WEN_JIAN[zhi]),
    xuan: sheZhi.qiPaoWeiBaMoShi === zhi,
  })),
)
const weiBaWeiZhiXuanXiang = computed(() =>
  QI_PAO_WEI_BA_WEI_ZHI_LIE_BIAO.map((zhi) => ({
    zhi,
    wen: huoQuFanYi('qiPao', WEI_BA_WEI_ZHI_WEN_JIAN[zhi]),
    xuan: sheZhi.qiPaoWeiBaWeiZhi === zhi,
  })),
)
const yuanJiaoXuanXiang = computed(() =>
  QI_PAO_YUAN_JIAO_DANG_WEI_LIE_BIAO.map((zhi) => ({
    zhi,
    wen: huoQuFanYi('qiPao', YUAN_JIAO_WEN_JIAN[zhi]),
    xuan: sheZhi.qiPaoYuanJiaoDangWei === zhi,
  })),
)

const shiZiDingYiMiaoBianSe = computed(
  () => !QI_PAO_MIAO_BIAN_SE_XUAN_XIANG.includes(sheZhi.qiPaoMiaoBianYanSe as (typeof QI_PAO_MIAO_BIAN_SE_XUAN_XIANG)[number]),
)

function chuLiMiaoBianSeShuRu(shiJian: Event): void {
  const muBiao = shiJian.target as HTMLInputElement | null
  const zhi = (muBiao?.value || '').trim()
  if (zhi) sheZhi.shiYongQiPaoXingZhuang({ miaoBianYanSe: zhi })
}

const fenZu = computed(() => [
  {
    jian: 'ai' as const,
    biaoTi: QI_PAO_WEN_AN.aiBiaoTi,
    xuanZhongZiDingYi: sheZhi.waiGuan.dangQianQiPao.ai,
  },
  {
    jian: 'ziJi' as const,
    biaoTi: QI_PAO_WEN_AN.ziJiBiaoTi,
    xuanZhongZiDingYi: sheZhi.waiGuan.dangQianQiPao.ziJi,
  },
])

const 外观编辑 = 使用外观编辑仓库()
const 编辑目标 = computed(() => (外观编辑.当前目标?.区 === 'qiPao' ? 外观编辑.当前目标 : null))
const 编辑预览 = computed(() => (编辑目标.value ? 外观编辑.预览值 : null))
const 编辑错误 = computed(() => (编辑目标.value ? 外观编辑.错误文案 : ''))
const 编辑保存中 = computed(() => 外观编辑.保存中)
const tiShiWenAn = ref('')
const tiShiShiBai = ref(false)
const wenJianShuRu = ref<HTMLInputElement | null>(null)
const shangChuanFang = ref<'ziJi' | 'ai'>('ziJi')
const 显示上传说明 = ref(false)
const 上传中 = ref(false)
const caiJianXianShi = ref(false)
const caiJianTuYuan = ref('')
const caiJianYuanMIME = ref('image/png')
const caiJianQianWenJian = ref<File | null>(null)
const 待删除 = ref<WaiGuanTiaoMu | null>(null)
const 显示删除确认 = ref(false)
const 删除中 = ref(false)

onBeforeUnmount(() => {
  if (编辑目标.value) 外观编辑.关闭(编辑目标.value)
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
})

const shanChuMiaoShu = computed(() =>
  待删除.value
    ? huoQuFanYi('sheZhi', 'shanChuQiPaoMing').replace('{name}', 待删除.value.mingCheng)
    : '',
)

function shiXianYuShe(_buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): string {
  const muBiao = 编辑目标.value
  if (muBiao?.类型 === 'yuShe' && muBiao.标识 === yuShe && 编辑预览.value) return 编辑预览.value.mingCheng
  return sheZhi.quQiPaoYuSheMing(yuShe)
}

function shiXianTiaoMu(_buWei: 'ziJi' | 'ai', tiaoMu: WaiGuanTiaoMu): string {
  const muBiao = 编辑目标.value
  if (muBiao?.类型 === 'ziDingYi' && muBiao.标识 === tiaoMu.id && 编辑预览.value) return 编辑预览.value.mingCheng
  return tiaoMu.mingCheng
}

function kaWeiBaBianLiangMing(buWei: 'ziJi' | 'ai'): string {
  return buWei === 'ziJi' ? '--qipao-ziJi-beiJing' : '--qipao-duiFang-beiJing'
}

function xuanXiangYangShi(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Record<string, string> {
  const dingYi = huoQuQiPaoDingYi(yuShe)
  const muBiao = 编辑目标.value
  const yuLanSe = muBiao?.类型 === 'yuShe' && muBiao.标识 === yuShe ? 编辑预览.value?.wenZiYanSe : ''
  if (yuLanSe) {
    return { background: dingYi.beiJing, color: yuLanSe, [kaWeiBaBianLiangMing(buWei)]: dingYi.beiJing }
  }
  return {
    background: dingYi.beiJing,
    color: sheZhi.quQiPaoYuSheYanSe(yuShe) || dingYi.wenBen,
    [kaWeiBaBianLiangMing(buWei)]: dingYi.beiJing,
  }
}

function ziDingYiYangShi(buWei: 'ziJi' | 'ai', tiaoMu: WaiGuanTiaoMu): Record<string, string> {
  const muBiao = 编辑目标.value
  const yuLanSe = muBiao?.类型 === 'ziDingYi' && muBiao.标识 === tiaoMu.id ? 编辑预览.value?.wenZiYanSe : ''
  const yanSe = yuLanSe || tiaoMu.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
  const laShenMoShi: WaiGuanLaShenMoShi = sheZhi.qiPaoLaShenMoShi
  const beiJing = huoQuQiPaoBeiJingZhi(tiaoMu.tuDiZhi, yanSe, laShenMoShi)
  return {
    background: beiJing,
    color: yanSe,
    [kaWeiBaBianLiangMing(buWei)]: beiJing,
  }
}

function shiXuanZhongYuShe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): boolean {
  if (sheZhi.waiGuan.dangQianQiPao[buWei]) return false
  return (buWei === 'ziJi' ? sheZhi.qiPaoZiJi : sheZhi.qiPaoAI) === yuShe
}

function quCuoWuWenBen(cuoWu: unknown): string {
  return tiQuCuoWuWenBen(cuoWu, 失败文案)
}

function qingChuTiShi(): void {
  tiShiWenAn.value = ''
  tiShiShiBai.value = false
}

async function xuanZeYuShe(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
  qingChuTiShi()
  try {
    await sheZhi.xuanZeYuSheQiPao(buWei, yuShe)
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

async function xuanZeZiDingYi(buWei: 'ziJi' | 'ai', id: string): Promise<void> {
  qingChuTiShi()
  try {
    await sheZhi.xuanZeZiDingYiQiPao(buWei, id)
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

function daKaiYuSheBianJi(yuShe: QiPaoYuShe): void {
  qingChuTiShi()
  外观编辑.打开({
    区: 'qiPao',
    键: 'yu-she:' + yuShe,
    类型: 'yuShe',
    标识: yuShe,
    名称: sheZhi.quQiPaoYuSheMing(yuShe),
    文字颜色: sheZhi.quQiPaoYuSheYanSe(yuShe) || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  })
}

function daKaiBianJi(tiaoMu: WaiGuanTiaoMu): void {
  qingChuTiShi()
  外观编辑.打开({
    区: 'qiPao',
    键: 'zi-ding-yi:' + tiaoMu.id,
    类型: 'ziDingYi',
    标识: tiaoMu.id,
    名称: tiaoMu.mingCheng,
    文字颜色: tiaoMu.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  })
}

function 结束编辑(): void {
  if (编辑目标.value) 外观编辑.关闭(编辑目标.value)
}

function 更新预览(zhi: { mingCheng: string; wenZiYanSe: string }): void {
  外观编辑.更新预览(zhi)
}

function 记录错误(muBiao: 气泡编辑目标, cuoWu: unknown): void {
  const wenAn = quCuoWuWenBen(cuoWu)
  if (编辑目标.value?.键 === muBiao.键) {
    外观编辑.记下错误(wenAn)
    return
  }
  tiShiShiBai.value = true
  tiShiWenAn.value = wenAn
}

async function 保存编辑(zhi: { mingCheng: string; wenZiYanSe: string }): Promise<void> {
  const muBiao = 编辑目标.value
  if (!muBiao) return
  外观编辑.保存中 = true
  外观编辑.记下错误('')
  try {
    if (muBiao.类型 === 'yuShe') {
      await sheZhi.gengXinQiPaoYuShe(muBiao.标识, zhi)
    } else {
      await sheZhi.gengXinWaiGuanTiaoMu('qiPao', muBiao.标识, zhi)
    }
    外观编辑.关闭(muBiao)
    tiShiShiBai.value = false
    tiShiWenAn.value = 保存成功文案
  } catch (cuoWu: unknown) {
    记录错误(muBiao, cuoWu)
  } finally {
    外观编辑.保存中 = false
  }
}

async function 还原编辑(): Promise<void> {
  const muBiao = 编辑目标.value
  if (!muBiao) return
  外观编辑.保存中 = true
  外观编辑.记下错误('')
  try {
    await sheZhi.huanYuanWaiGuanXiang('qiPao', { jian: muBiao.标识, leiXing: muBiao.类型 })
    外观编辑.关闭(muBiao)
    tiShiShiBai.value = false
    tiShiWenAn.value = 还原成功文案
  } catch (cuoWu: unknown) {
    记录错误(muBiao, cuoWu)
  } finally {
    外观编辑.保存中 = false
  }
}

function daKaiShangChuan(buWei: 'ziJi' | 'ai'): void {
  if (上传中.value) return
  shangChuanFang.value = buWei
  qingChuTiShi()
  显示上传说明.value = true
}

function queRenShangChuan(): void {
  显示上传说明.value = false
  wenJianShuRu.value?.click()
}

async function chuLiWenJianXuanZe(): Promise<void> {
  const wenJian = wenJianShuRu.value?.files?.[0]
  if (wenJianShuRu.value) wenJianShuRu.value.value = ''
  if (!wenJian) return
  qingChuTiShi()
  if (!wenJian.type.startsWith('image/')) {
    tiShiShiBai.value = true
    tiShiWenAn.value = huoQuFanYi('tongYong', 'feiTuPianTiShi')
    return
  }
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianQianWenJian.value = wenJian
  caiJianTuYuan.value = URL.createObjectURL(wenJian)
  caiJianYuanMIME.value = wenJian.type || 'image/png'
  caiJianXianShi.value = true
}

function guanBiCaiJian(): void {
  caiJianXianShi.value = false
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianTuYuan.value = ''
  caiJianQianWenJian.value = null
}

async function queRenCaiJian(wenJian: Blob): Promise<void> {
  const shangChuanWenJian = new File([wenJian], caiJianQianWenJian.value?.name || 'qipao.jpg', {
    type: wenJian.type || 'image/jpeg',
  })
  guanBiCaiJian()
  上传中.value = true
  tiShiWenAn.value = shangChuanZhongWenAn
  try {
    const tiaoMu = await sheZhi.shangChuanWaiGuan('qiPao', shangChuanWenJian)
    await sheZhi.xuanZeZiDingYiQiPao(shangChuanFang.value, tiaoMu.id)
    tiShiShiBai.value = false
    tiShiWenAn.value = 保存成功文案
  } catch (cuoWu: unknown) {
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    上传中.value = false
  }
}

function zhunBeiShanChu(tiaoMu: WaiGuanTiaoMu): void {
  if (删除中.value) return
  qingChuTiShi()
  待删除.value = tiaoMu
  显示删除确认.value = true
}

async function tuoZhuaiGengXinQiPao(xinLieBiao: WaiGuanTiaoMu[]): Promise<void> {
  const jiuLieBiao = [...sheZhi.waiGuan.qiPao]
  const zhongPai = zhongPaiWaiGuanTiaoMu(jiuLieBiao, xinLieBiao.map((xiang) => xiang.id))
  if (!zhongPai) return
  sheZhi.waiGuan.qiPao = zhongPai
  try {
    const chuCan = await baoCunWaiGuan(sheZhi.waiGuan)
    sheZhi.waiGuan = guiYiWaiGuanChuCan(chuCan)
  } catch (cuoWu: unknown) {
    sheZhi.waiGuan.qiPao = jiuLieBiao
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  }
}

defineExpose({ tuoZhuaiGengXinQiPao })

function guanBiShanChuQueRen(): void {
  if (删除中.value) return
  显示删除确认.value = false
  待删除.value = null
}

async function queRenShanChu(): Promise<void> {
  const tiaoMu = 待删除.value
  if (!tiaoMu || 删除中.value) return
  删除中.value = true
  try {
    await sheZhi.shanChuWaiGuan('qiPao', tiaoMu.id)
    if (编辑目标.value?.类型 === 'ziDingYi' && 编辑目标.value.标识 === tiaoMu.id) 结束编辑()
    显示删除确认.value = false
    待删除.value = null
    tiShiShiBai.value = false
    tiShiWenAn.value = ''
  } catch (cuoWu: unknown) {
    显示删除确认.value = false
    待删除.value = null
    tiShiShiBai.value = true
    tiShiWenAn.value = quCuoWuWenBen(cuoWu)
  } finally {
    删除中.value = false
  }
}
</script>

<style scoped>
.qipao-zhuTi-xuanZeQi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.qi-pao-liang-lan {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--jiange-12);
  min-width: 0;
}

.qi-pao-ce {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  min-width: 0;
  padding: var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: var(--beijing-ciuse);
}

.qi-pao-ce-ti {
  margin: 0;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.qi-pao-qun {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: max(var(--jiange-xiao), calc(var(--qipao-weiba-kuan) + var(--jiange-2)));
  row-gap: var(--jiange-xiao);
  min-width: 0;
}

.qi-pao-xuan-xiang {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-4);
  min-height: var(--wai-guan-re-ku);
  max-width: 100%;
  padding: var(--jiange-10) var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  line-height: 1.35;
  cursor: pointer;
}

.qi-pao-xuan-xiang--ka {
  --qipao-weiba-shang-bu-ju: var(--jiange-10);

  position: relative;
  padding: var(--jiange-10) var(--jiange-12);
  border: none;
  border-radius: var(--qipao-yuanjiao);
  font-size: var(--qipao-zihao);
  line-height: var(--qipao-hangao);
  box-shadow: var(--qipao-miaoBian-yangShi, none);
}

.qi-pao-xuan-xiang--ka::before {
  content: attr(data-ming-cheng);
  height: 0;
  overflow: hidden;
  visibility: hidden;
  white-space: nowrap;
}

.qi-pao-ka--ziJi {
  --qipao-weiba-tian-chong: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
}

.qi-pao-ka--ai {
  --qipao-weiba-tian-chong: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
}

.qi-pao-xuan-xiang--xuan {
  border-color: var(--zhuse);
  box-shadow: var(--qipao-miaoBian-yangShi, none), 0 0 0 2px var(--zhuse);
}

.qi-pao-xuan-xiang:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-xuan-xiang-wen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 var(--jiange-12);
  pointer-events: auto;
}

.qi-pao-xuan-xiang-wen-nei {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qi-pao-gou {
  position: absolute;
  top: var(--jiange-2);
  right: var(--jiange-2);
  flex: none;
  font-size: var(--ziti-xiao);
  font-weight: 900;
}

.qi-pao-tuo-qu {
  display: contents;
}

.qi-pao-zi-ding-yi-wei {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-6);
  max-width: 100%;
  min-width: 0;
}

.qi-pao-zi-ding-yi {
  max-width: 220px;
}

.qi-pao-ka-kong-zhi {
  --qi-pao-kong-zhi-re-qu: 24px;

  position: absolute;
  right: var(--jiange-2);
  bottom: var(--jiange-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--qi-pao-kong-zhi-re-qu);
  height: var(--qi-pao-kong-zhi-re-qu);
  color: inherit;
  opacity: 0.62;
  cursor: pointer;
}

.qi-pao-ka-kong-zhi--shan-chu {
  right: calc(var(--jiange-2) + var(--qi-pao-kong-zhi-re-qu));
}

.qi-pao-ka-kong-zhi:hover,
.qi-pao-ka-kong-zhi:focus-visible {
  opacity: 1;
}

.qi-pao-ka-kong-zhi-tu-biao {
  width: var(--ziti-xiao);
  height: var(--ziti-xiao);
  pointer-events: none;
}

.qi-pao-shang-chuan {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-4);
  min-height: var(--wai-guan-re-ku);
  padding: var(--jiange-10) var(--jiange-12);
  border: 1.5px dashed var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: transparent;
  color: var(--wenben-ciuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.qi-pao-shang-chuan:hover:not(:disabled) {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.qi-pao-shang-chuan:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-shang-chuan:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.qi-pao-shang-chuan-jia {
  font-size: var(--ziti-zhong);
  line-height: 1;
}

.qi-pao-bian-ji-wei {
  min-width: 0;
}

.qi-pao-ti-shi {
  margin: 0;
  min-height: var(--ziti-zhong);
  font-size: var(--ziti-xiao);
  color: var(--chenggong-yanse);
}

.qi-pao-ti-shi--cuo-wu {
  color: var(--cuowu-yanse);
}

.qi-pao-wen-jian-shu-ru {
  display: none;
}

.qi-pao-zi-ding-yi-wei.sortable-ghost {
  opacity: 0.45;
}

.qi-pao-zi-ding-yi-wei.sortable-chosen {
  cursor: grabbing;
}

.qi-pao-zi-ding-yi-wei.sortable-drag {
  transition: none !important;
  transform: scale(1.04) rotate(1.2deg);
  cursor: grabbing;
}

.qi-pao-zi-ding-yi-wei.sortable-drag > .qi-pao-xuan-xiang {
  border: 2px solid var(--zhuse);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.32),
    5px 5px 0 rgba(7, 193, 96, 0.22);
}

@media (prefers-reduced-motion: reduce) {
  .qi-pao-zi-ding-yi-wei.sortable-drag {
    transform: none;
  }
}

@media (max-width: 520px) {
  .qi-pao-zi-ding-yi {
    max-width: 160px;
  }
}

.qi-pao-xing-zhuang {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  padding: var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background: var(--beijing-ciuse);
}

.qi-pao-xing-zhuang-ti {
  margin: 0;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.qi-pao-xing-zhuang-hang {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-10);
}

.qi-pao-xing-zhuang-ming {
  flex: none;
  min-width: 4.5em;
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}

.qi-pao-dang-wei-qun {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-6);
}

.qi-pao-dang-wei-ka {
  padding: var(--jiange-4) var(--jiange-10);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 999px;
  background: transparent;
  color: var(--wenben-ciuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  line-height: 1.4;
  cursor: pointer;
}

.qi-pao-dang-wei-ka:hover {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.qi-pao-dang-wei-ka--xuan {
  border-color: var(--zhuse);
  color: var(--zhuse);
  background: color-mix(in srgb, var(--zhuse) 12%, transparent);
}

.qi-pao-dang-wei-ka:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-miao-bian-se {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--jiange-6);
}

.qi-pao-miao-bian-se-kuai {
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 50%;
  cursor: pointer;
}

.qi-pao-miao-bian-se-kuai--xuan {
  border-color: var(--zhuse);
  box-shadow: 0 0 0 2px var(--zhuse);
}

.qi-pao-miao-bian-se-kuai:focus-visible,
.qi-pao-miao-bian-zi-ding-yi:focus-within {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.qi-pao-miao-bian-zi-ding-yi {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1.5px dashed var(--biankuang-yanse);
  border-radius: 50%;
  background: var(--beijing-kaopian);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.qi-pao-miao-bian-zi-ding-yi--xuan {
  border-style: solid;
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.qi-pao-miao-bian-zi-ding-yi input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>
