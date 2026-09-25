<template>
  <div class="liaotian-yemian" data-chat-scope="true">
    <div class="haoyou-dingbu">
      <button class="haoyou-fanhui" @click="fanHui">
        <span class="haoyou-fanhui-jiantou" aria-hidden="true" />
        {{ huoQuFanYi('caidan', 'fanHui') }}
      </button>
      <span v-if="haoYouMing" class="haoyou-dingbu-ming">{{ haoYouMing }}</span>
    </div>
    <KongTai
      v-if="feiHaoYou"
      :biao-ti="huoQuFanYi('haoYou', 'feiHaoYou')"
      :chong-shi-wen-zi="huoQuFanYi('haoYou', 'fanHuiHaoYouLieBiao')"
      @chong-shi="fanHuiLieBiao"
    />
    <KongTai
      v-else-if="qianTaiCuoWu"
      :biao-ti="huoQuFanYi('haoYou', 'xiaoXiJiaZaiShiBai')"
      :ti-shi="qianTaiCuoWu.yingXiang"
      :chong-shi-wen-zi="huoQuFanYi('liaoTian', 'chongShi')"
      @chong-shi="chongShi"
    >
      <RequestError
        :cuo-wu="qianTaiCuoWu"
        :xian-shi-chong-shi="false"
        mi-xi
        @chong-shi="chongShi"
      />
    </KongTai>
    <template v-else>
    <main ref="xiaoxiQuYuRef" class="xiaoxi-quyu" :class="beiJingLeiMing" :style="[beiJingYangShi, qiPaoYangShi]" role="log" aria-live="polite" :aria-label="huoQuFanYi('liaoTian', 'xiaoXiLieBiao')">
      <template v-for="zu in xiaoXiFenZu" :key="'zu-' + zu.shiJianChuo">
      <ShiJianTiao :shi-jian="zu.shiJian" :shi-jian-chuo="zu.shiJianChuo" />
      <div v-for="xiaoXi in zu.xiaoXiLieBiao" :id="yinYongXiangId(xiaoXi)" :key="xiaoXi.id" class="xiaoxi-xiangmu" :class="xiaoXi.fa_song_zhe_id === woDeId ? 'yonghu-xiaoxi' : 'jiaose-xiaoxi'" @contextmenu.prevent="chuLiYouJianCaiDan(xiaoXi, $event)" @touchstart="chuLiChuMoKaiShi(xiaoXi)" @touchend="chuLiChuMoJieShu" @touchmove="chuLiChuMoJieShu">
        <div class="xiaoxi-wei">
          <TouXiang :tou-xiang="xianShiTouXiang(xiaoXi)" :mo-ren-zi="touXiangMoRenZi(xiaoXi)" />
        </div>
        <!-- FP-11：语音支必须先于媒体支（MEI_TI_XIAO_XI_LEI_XING 含 yuyin，否则会掉进文件泡）。
             HaoYouXiaoXi 无时长字段（后端出参无此列）⇒ 气泡按最短 1s 宽兜底，属已知限制。 -->
        <div v-if="xiaoXi.lei_xing === 'yuYin'" class="qipao-waike yuyin-waike">
          <!-- HaoYouXiaoXi 无时长列 ⇒ 按 YuYinShiChangZaiTi（可选毫秒字段）兜底 1s 宽，cast 是类型桥非数据造假 -->
          <YuYinQiPao
            :xiao-xi="(xiaoXi as unknown as { mei_ti_shi_chang_hao_miao?: number | null })"
            :bo-fang-zhong="shiYuYinBoFangZhong(xiaoXi as unknown as 消息)"
            :jin-du-miao="huoQuBoFangJinDu(xiaoXi as unknown as 消息)"
            :zong-miao="huoQuBoFangZongMiao(xiaoXi as unknown as 消息)"
            :shi-ben-ren="xiaoXi.fa_song_zhe_id === woDeId"
            @qie-huan="qieHuanYuYinBoFang(xiaoXi as unknown as 消息)"
            @tiao-zhuan="tiaoZhuanYuYinJinDu(xiaoXi as unknown as 消息, $event)"
          />
          <div
            v-if="shiYuYinZhuanXieZhong(xiaoXi as unknown as 消息)"
            class="yuyin-zhuanwenzi-zhuangtai"
          >
            {{ huoQuFanYi('liaoTian', 'yuYinZhuanWenZiZhong') }}
          </div>
          <button
            v-else-if="shiZhuanWenZiZhanKai(xiaoXi as unknown as 消息)"
            type="button"
            class="yuyin-zhuanwenzi"
            :aria-label="huoQuFanYi('liaoTian', 'zheDie')"
            :title="huoQuFanYi('liaoTian', 'zheDie')"
            @click.stop="qieHuanZhuanWenZiXianShi(xiaoXi as unknown as 消息)"
          >
            {{ huoQuZhuanWenZi(xiaoXi as unknown as 消息) }}
          </button>
          <span
            v-else-if="shiZhuanWenZiShiBai(xiaoXi as unknown as 消息)"
            class="yuyin-zhuanwenzi yuyin-zhuanwenzi-shibai"
          >
            {{ huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai') }}
          </span>
        </div>
        <!-- FP-10a 反转同构：媒体支只接住「反构不出图片块」的脏行；含图片块走下方块渲染 -->
        <div v-else-if="shiMeiTiXiaoXi(xiaoXi) && !shiXuYaoKuaiXuanRan(xiaoXi as unknown as 消息)" class="qipao-waike" :class="meiTiWaiKeLeiMing(xiaoXi)">
          <img
            v-if="shiTuPianXiaoXi(xiaoXi)"
            class="tupian-qipao"
            :src="xiaoXi.mei_ti_url || undefined"
            loading="lazy"
            :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
            @error="chuLiMeiTiShiXiao(xiaoXi)"
          />
          <WenJianQiPao
            v-else
            :shi-ben-ren="xiaoXi.fa_song_zhe_id === woDeId"
            :ming-cheng="xiaoXi.mei_ti_yuan_shi_wen_jian_ming || huoQuFanYi('haoYou', 'weiMingMing')"
            :da-xiao="huoQuWenJianDaXiao(xiaoXi)"
            :xia-zai-di-zhi="xiaoXi.mei_ti_url"
            :xia-zai-ming="xiaoXi.mei_ti_yuan_shi_wen_jian_ming"
          />
        </div>
        <div v-else class="qipao-waike">
          <div class="qipao-neirong">
            <template v-if="!xiaoXi.yi_che_hui && shiXuYaoKuaiXuanRan(xiaoXi as unknown as 消息)">
              <span
                v-for="(kuai, kuaiSuoYin) in huoQuXianShiKuai(xiaoXi as unknown as 消息)"
                :key="`${xiaoXi.id}-${kuaiSuoYin}`"
                class="tuwen-kuai"
                :class="kuai.lei_xing === 'tupian' ? 'tuwen-kuai--tu' : 'tuwen-kuai--wen'"
              >
                <img
                  v-if="kuai.lei_xing === 'tupian'"
                  class="tuwen-kuai-tu"
                  :class="{ 'tuwen-kuai-tu--biaoqingbao': shiBiaoQingBaoKuai(kuai) }"
                  :src="kuai.mei_ti_url || xiaoXi.mei_ti_url || undefined"
                  :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
                  loading="lazy"
                  decoding="async"
                  @error="chuLiMeiTiShiXiao(xiaoXi)"
                />
                <template v-else>{{ kuai.nei_rong }}</template>
              </span>
            </template>
            <template v-else>{{ xiaoXi.yi_che_hui ? cheHuiWenBen : xiaoXi.nei_rong }}</template>
          </div>
          <YinYongQiPaoKuai
            v-if="xiaoXi.bei_yong_xiao_xi_id"
            :bei-yong-xiao-xi-id="xiaoXi.bei_yong_xiao_xi_id"
            :lie-biao="xiaoXiLieBiao"
            :gun-dong-rong-qi="huoQuXiaoXiGunDongRongQi"
            :fa-song-zhe-ming="yinYongFaSongZheMing"
          />
          <FanYiJieGuo
            v-if="
              !xiaoXi.yi_che_hui &&
              (shiFanYiZhong(xiaoXi) ||
                shiFanYiZhanKai(xiaoXi) ||
                shiFanYiChuCuo(xiaoXi) ||
                shiFanYiKong(xiaoXi))
            "
            :zhuang-tai="huoQuFanYiZhuangTai(xiaoXi)"
            :jie-guo="huoQuFanYiJieGuo(xiaoXi) || ''"
            :cuo-wu="huoQuFanYiCuoWu(xiaoXi)"
            :yuan-yu="fanYiYuanYu"
            :mu-biao-yu="fanYiMuBiaoYu"
            :fu-zhi-wen-ben="fuZhiWenBen"
            @geng-xin-yuan-yu="gaiFanYiYuanYu($event, xiaoXi)"
            @geng-xin-mu-biao-yu="gaiFanYiMuBiaoYu($event, xiaoXi)"
            @chong-shi="chongXinFanYi(xiaoXi)"
          />
        </div>
        <button v-if="keCheHui(xiaoXi)" class="chehui-xiao-anniu" @click="cheHui(xiaoXi.id)">
          {{ huoQuFanYi('liaoTian', 'cheHui') }}
        </button>
      </div>
      </template>
    </main>
    <footer class="shuru-quyu">
      <div class="shuru-rongqi">
        <!-- 图文真内联输入区（FP-10c）：与 AI 聊天页共用同一份 components/聊天/图文输入区.vue，
             文字段与图片/贴纸块在同一条 contenteditable 流里，块插在光标处。
             改造前本页的待发序列是 `.shuru-rongqi` 的整宽行子元素（AI 页自 FP-10b 第二刀起在
             .shuru-kuang-waike 盒内、编辑器之前），两页共用的只是序列组件那一份实现、版面不同；
             本单一落地，两页连版面一起同构（序列槽位随真内联一起消失）；引用落库（FP-09/08a）与
             内容块落库（迁移 036 + routes/好友.ts）已同树落地，不再挂 FP-21 -->
        <button
          class="meiti-rukou"
          type="button"
          :title="huoQuFanYi('duoMeiTi', 'xiangCe')"
          :aria-label="huoQuFanYi('duoMeiTi', 'xiangCe')"
          @click="daKaiXiangCe"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <button
          class="meiti-rukou"
          type="button"
          :title="huoQuFanYi('duoMeiTi', 'wenJian')"
          :aria-label="huoQuFanYi('duoMeiTi', 'wenJian')"
          @click="daKaiWenJianXuanZe"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </button>
        <YinYongTiao
          v-if="yinYongXiaoXi"
          :zhai-yao="huoQuYinYongZhaiYao(yinYongXiaoXi)"
          :fa-song-zhe-ming="yinYongFaSongZheMing(yinYongXiaoXi)"
          @guan-bi="quXiaoYinYong"
        />
        <TuWenShuRuQu
          :kuai-lie-biao="daiFaKuai"
          :wen-ben="shuRuNeiRong"
          :guang-biao="daiFaGuangBiao"
          :zhan-kai="shuRuKuangZhanKai"
          :zhan-wei-fu="huoQuFanYi('haoYou', 'shuRuXiaoXi')"
          :zui-da-chang-du="XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu"
          @geng-xin-guang-biao="daiFaGengXinGuangBiao"
          @bian-ji="chuLiShuRuQuBianJi"
          @cha-ru-wen-ben="chaRuShuRuQuWenBen"
          @fa-song="faSong"
          @zhan-tie="chuLiZhanTie"
          @tuo-fang="chuLiTuoFang"
          @shan-chu="shanChuDaiFaKuai"
          @yi-dong="yiDongDaiFaKuai"
        />
        <button
          class="fasong-anniu"
          :disabled="(!shuRuNeiRong.trim() && !daiFaYouTuPian) || faSongZhong"
          :aria-disabled="(!shuRuNeiRong.trim() && !daiFaYouTuPian) || faSongZhong"
          @click="faSong"
        >
          {{ huoQuFanYi('haoYou', 'faSong') }}
        </button>
      </div>
      <p v-if="faSongTiShi" class="fasong-tishi" role="status">{{ faSongTiShi }}</p>
      <p v-if="caoGaoYiHuiFu" class="fasong-tishi" role="status">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</p>
      <!-- FP-20 契约：与聊天页同一条「添加到表情」反馈口径（成功/已在库两句可区分），不复用红色错误行 -->
      <div v-if="biaoQingTiShi" class="shuru-fu-zhu" role="status">
        <span class="biaoqing-tishi">{{ biaoQingTiShi }}</span>
      </div>
      <input ref="xiangCeInputRef" class="yincang-wenjian-shuru" type="file" accept="image/*" @change="chuLiXiangCeXuanZe" />
      <input
        ref="wenJianInputRef"
        class="yincang-wenjian-shuru"
        type="file"
        :accept="WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN"
        @change="chuLiWenJianXuanZe"
      />
    </footer>
    <!-- FP-09/FP-21：发送前引用条已内联在 .shuru-rongqi 首子元素；此处为三个菜单浮层 -->
    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div v-if="yuYinCaiDanZhanKai" class="chehui-zhezhao" @click="guanBiYuYinCaiDan">
          <div class="chehui-caidan" :style="yuYinCaiDanYangShi">
            <button
              v-for="xiang in huoQuYuYinCaiDanXiang()"
              :key="xiang"
              class="chehui-xiangmu"
              @click="zhiXingYuYinCaiDanXiang(xiang)"
            >
              {{ huoQuFanYi('liaoTian', xiang) }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div v-if="wenBenCaiDanZhanKai" class="chehui-zhezhao" @click="guanBiWenBenCaiDan">
          <div class="chehui-caidan" :style="wenBenCaiDanYangShi">
            <button
              v-for="xiang in huoQuWenBenCaiDanXiang()"
              :key="xiang"
              class="chehui-xiangmu"
              @click="zhiXingWenBenCaiDanXiang(xiang)"
            >
              {{ huoQuFanYi('liaoTian', xiang) }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- FP-20/FP-21：图片气泡右键/长按菜单，与聊天页同一份 use长按菜单 状态机与 .chehui-* 样式 -->
    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div
          v-if="tuPianCaiDanZhanKai"
          class="chehui-zhezhao"
          @click="guanBiTuPianCaiDan"
        >
          <div class="chehui-caidan" :style="tuPianCaiDanYangShi">
            <button
              v-for="xiang in huoQuTuPianCaiDanXiang()"
              :key="xiang"
              class="chehui-xiangmu"
              @click="zhiXingTuPianCaiDanXiang(xiang)"
            >
              {{ huoQuFanYi('liaoTian', xiang) }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <DuoMeiTiShouQuanDanChuang :xian-shi="shouQuanDanChuangXianShi" @que-ren="shouQuanQueRen" @ju-jue="shouQuanJuJue" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  huoQuHaoYouXiaoXi,
  faSongHaoYouXiaoXi,
  cheHuiHaoYouXiaoXi,
  biaoJiHaoYouYiDu,
  huoQuHaoYouLieBiao,
  shangChuanHaoYouMeiTi,
  type HaoYouShangChuanLeiBie,
  type HaoYouXiaoXi,
} from '@/api/社交'
import { huoQuMingPian } from '@/api/资料'
import { guiYiHuaQiPao, huoQuQiPaoCSSBianLiang } from '@/config/气泡主题'
import { 归一前台错误 } from '@/utils/前台错误'
import { shiTuPianDiZhi } from '@/utils/头像'
import { fenZuXiaoXiAnShiJian } from '@/utils/消息时间分组'
import { yaSuoTuPiang } from '@/utils/图片压缩'
import { use粘贴图片 } from '@/composables/use粘贴图片'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { use输入区展开档 } from '@/composables/use输入区展开档'
import { use图片授权门 } from '@/composables/use图片授权门'
import { fuZhiWenBen, use长按菜单, type CaiDanXiaoXi } from '@/composables/use长按菜单'
import { use添加到表情 } from '@/composables/use添加到表情'
import { use表情提交 } from '@/composables/use表情提交'
import { use表情提示条 } from '@/composables/use表情提示条'
import type { 消息, XiaoXiKuaiChuCan } from '@/types'
import { fanYiWenBen as fanYiWenBenApi, zhuanXieYuYin } from '@/api/聊天'
import {
  huoQuXianShiKuai,
  shiBiaoQingBaoKuai,
  shiXuYaoKuaiXuanRan,
  kuaiDaoZhengWen,
  kuaiDaoXiaoXiLeiXing,
  keTiJiaoKuai,
} from '@/utils/消息内容块'
import { use语音转文字 } from '@/composables/use语音转文字'
import { use语音播放 } from '@/composables/use语音播放'
import {
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
  MEI_TI_XIAO_XI_LEI_XING,
  TU_PIAN_XIAO_XI_LEI_XING,
  XIAO_XI_PEI_ZHI,
  YIN_YONG_DING_WEI_PEI_ZHI,
  huoQuMeiTiYinYongZhanWei,
} from '@/config/消息配置'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'
import RequestError from '@/components/请求错误.vue'
import KongTai from '@/components/空态.vue'
import { use前台错误 } from '@/composables/use前台错误'
import DuoMeiTiShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import YinYongTiao from '@/components/聊天/引用条.vue'
import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'
import FanYiJieGuo from '@/components/聊天/翻译结果框.vue'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import WenJianQiPao from '@/components/聊天/文件气泡.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'
import TouXiang from '@/components/头像.vue'

const route = useRoute()
const router = useRouter()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const haoYouId = String(route.params.haoYouId || '')
const woDeId = 用户仓库.dangQianYongHu?.id || ''
const xiaoXiLieBiao = ref<HaoYouXiaoXi[]>([])
/* 时间条（FP-11 验收点 B）：与聊天页共用 utils/消息时间分组.ts 的唯一分档实现与
   components/聊天/时间条.vue 的唯一呈现，本页不再自己拼时间文本 */
const xiaoXiFenZu = computed(() => fenZuXiaoXiAnShiJian(xiaoXiLieBiao.value))
const shuRuNeiRong = ref('')
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian(haoYouId), shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const beiJingLeiMing = computed(() => (设置仓库.shiYuShe ? `beijing-${设置仓库.liaoTianBeiJing || 'moRen'}` : 'beijing-ziDingYi'))
const beiJingYangShi = computed(() => 设置仓库.beiJingNeiLianYangShi)
const cheHuiWenBen = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, yunXing, chongShi } = use前台错误()
const feiHaoYou = ref(false)
const faSongTiShi = ref('')
const haoYouTouXiang = ref<string | null>(null)
const haoYouMing = ref('')
const haoYouQiPao = ref<string | null>(null)
const lunXunDingShi = ref<number | null>(null)
const qiPaoYangShi = computed(() =>
  huoQuQiPaoCSSBianLiang(设置仓库.qiPaoZiJi, guiYiHuaQiPao(haoYouQiPao.value, 设置仓库.qiPaoAI)),
)

function xianShiTouXiang(xiaoXi: HaoYouXiaoXi): string | null {
  const diZhi = xiaoXi.fa_song_zhe_id === woDeId ? 用户仓库.dangQianYongHu?.tou_xiang : haoYouTouXiang.value
  return diZhi && shiTuPianDiZhi(diZhi) ? diZhi : null
}

function touXiangMoRenZi(xiaoXi: HaoYouXiaoXi): string {
  if (xiaoXi.fa_song_zhe_id === woDeId) {
    return (用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || '我').slice(0, 1)
  }
  return (haoYouMing.value || '友').slice(0, 1)
}

function keCheHui(xiaoXi: HaoYouXiaoXi): boolean {
  if (xiaoXi.fa_song_zhe_id !== woDeId || xiaoXi.yi_che_hui) return false
  return Date.now() - xiaoXi.shi_jian_chuo <= 2 * 60 * 1000
}

function gunDongDaoDiBu() {
  requestAnimationFrame(() => {
    if (xiaoxiQuYuRef.value) xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
  })
}

async function shuaXin(youBiao?: { xu_hao: number | null; shi_jian: number; id: string }) {
  await yunXing(
    async () => {
      feiHaoYou.value = false
      const xinLieBiao = await huoQuHaoYouXiaoXi(haoYouId, 50, youBiao)
      if (youBiao) {
        if (xinLieBiao.length > 0) {
          const yiCunId = new Set(xiaoXiLieBiao.value.map((x) => x.id))
          const zengLiang = xinLieBiao.filter((x) => !yiCunId.has(x.id))
          xiaoXiLieBiao.value = [...zengLiang, ...xiaoXiLieBiao.value]
        }
      } else {
        xiaoXiLieBiao.value = xinLieBiao
      }
      gunDongDaoDiBu()
      try {
        await biaoJiHaoYouYiDu(haoYouId)
      } catch {
        /* 已读回执失败不打断消息展示 */
      }
    },
    {
      chongShi: () => shuaXin(),
      chuLiCuoWu: (zhengChangHua) => {
        feiHaoYou.value = zhengChangHua.httpStatus === 403
      },
    },
  )
}

function fanHui() {
  // 单次返回直达上一页：历史栈见底（如直链进入）时替换到好友列表，避免点击无反应
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace('/hao-you')
}

function fanHuiLieBiao() {
  // 空态返回用替换而非推入：避免“返回又回来”导致多点一次
  router.replace('/hao-you')
}

async function faSongYiDuanWenBen(wenBen: string, miDengJian: string): Promise<boolean> {
  // YH-087 发送乐观更新：先本地落一条再调接口，失败回滚禁全量刷新
  const leGuanId = `le-guan-${miDengJian}`
  const yinYongId = yinYongXiaoXi.value?.id ?? null
  const leGuanXiaoXi = {
    id: leGuanId,
    jie_shou_zhe_id: haoYouId,
    fa_song_zhe_id: woDeId,
    nei_rong: wenBen,
    lei_xing: 'wenben',
    mei_ti_id: null,
    mei_ti_url: null,
    mei_ti_lei_bie: null,
    mei_ti_yuan_shi_wen_jian_ming: null,
    mei_ti_da_xiao_zi_jie: null,
    yi_du: false,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
    bei_yong_xiao_xi_id: yinYongId,
  } as HaoYouXiaoXi
  try {
    xiaoXiLieBiao.value = [...xiaoXiLieBiao.value, leGuanXiaoXi]
    gunDongDaoDiBu()
    await faSongHaoYouXiaoXi(haoYouId, wenBen, miDengJian, undefined, {
      beiYongXiaoXiId: yinYongId,
    })
    quXiaoYinYong()
    await shuaXin()
    return true
  } catch (cuoWu: unknown) {
    // 发送失败（含账号封禁403）就地提示，不抛到全局；引用态保留（失败不清）
    xiaoXiLieBiao.value = xiaoXiLieBiao.value.filter((x) => x.id !== leGuanId)
    faSongTiShi.value = duQuTiShi(cuoWu)
    return false
  }
}

function xinShengWenBenJian(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

async function faSong() {
  const wenBen = shuRuNeiRong.value.trim()
  // FP-10b（缺陷9）：待发区里有图片 ⇒ 走图文混排发送（粘贴不再直发，顺序由用户排）
  if (daiFaYouTuPian.value) {
    await faSongDaiFaTuWen()
    return
  }
  if (!wenBen) return
  if (faSongZhong.value) return
  faSongZhong.value = true
  faSongTiShi.value = ''
  const miDengJian = xinShengWenBenJian()
  shuRuNeiRong.value = ''
  qingChuCaoGao()
  shouQiZhanKaiDang()
  const chengGong = await faSongYiDuanWenBen(wenBen, miDengJian)
  if (!chengGong) shuRuNeiRong.value = wenBen
  faSongZhong.value = false
}

/**
 * FP-21 单次提交：好友侧图文混排把用户排的块序列**合成一条消息**发出（不再逐条拆发）。
 * 文字块与图片块串行上传后一起进 body 的 `neiRongKuai`；兼容投影正文由 `kuaiDaoZhengWen` 派生。
 * 幂等键（FP-09b）**只在 AI 链路真正生效**：`消息` 表有 "幂等键" 列 + 唯一约束（迁移 032），
 * 服务层按它 ON CONFLICT 去重；好友链路两头都没有落点——`routes/好友.ts` 的 INSERT
 * 只有七列（发送者/接收者/内容/类型/媒体ID/内容块/被引用消息ID），后端也没有任何 Idempotency 头的读点。
 * ⇒ 这里带键只起两个作用：本地乐观气泡的 id（le-guan-*）与请求头 Idempotency-Key（无人读）。
 * 所以「同一次编辑重发不多出一条」在好友页**不成立**；单次提交后整批一起清，上传中途失败
 * 则整单保留待发（不回滚已上传的媒体——服务端地址可复用），不把半批块拆成多条。
 * 该事实与后端 INSERT 列清单的双向一致性由 __tests__/FP21b好友侧幂等键事实一致.test.ts 把守。
 */
async function faSongDaiFaTuWen(): Promise<void> {
  if (daiFaKuaiChaoXian()) {
    faSongTiShi.value = huoQuFanYi('duoMeiTi', 'kuaiChaoXian')
    return
  }
  if (faSongZhong.value) return
  faSongZhong.value = true
  // 压缩在后台跑，块里可能还压着原图：先等在途压缩落回块，再取待发序列（与聊天页同口径）
  await dengDaiDaiFaYaSuoWanCheng()
  const kuai = shouJiDaiFaKuai()
  if (kuai.length === 0) {
    faSongZhong.value = false
    return
  }
  faSongTiShi.value = ''
  const yunXu = await queRenTuPianShouQuan()
  if (!yunXu) {
    faSongTiShi.value = huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi')
    faSongZhong.value = false
    return
  }
  const benCiJian = xinShengWenBenJian()
  const chuCanKuai: XiaoXiKuaiChuCan[] = []
  for (const xiang of kuai) {
    if (xiang.lei_xing === 'wenzi') {
      const wenBen = xiang.nei_rong.trim()
      if (wenBen === '') continue
      chuCanKuai.push({ lei_xing: 'wenzi', nei_rong: wenBen })
      continue
    }
    if (!xiang.wen_jian) continue
    try {
      const shangChuan = await shangChuanHaoYouMeiTi(
        haoYouId,
        xiang.wen_jian,
        'tupian',
      )
      chuCanKuai.push({
        lei_xing: 'tupian',
        mei_ti_id: shangChuan.mediaId,
        mei_ti_url: xiang.yu_lan_url || undefined,
        mei_ti_lei_bie: shangChuan.leiBie || undefined,
      })
    } catch (cuoWu: unknown) {
      faSongTiShi.value = duQuTiShi(cuoWu)
      faSongZhong.value = false
      return
    }
  }
  const tiJiaoKuai = keTiJiaoKuai(chuCanKuai)
  if (tiJiaoKuai.length === 0) {
    faSongZhong.value = false
    return
  }
  const yinYongId = yinYongXiaoXi.value?.id ?? null
  const shouTuKuai = chuCanKuai.find((x) => x.lei_xing === 'tupian')
  const leiXing = kuaiDaoXiaoXiLeiXing(chuCanKuai)
  const zhengWen = kuaiDaoZhengWen(tiJiaoKuai, {
    leiBieOf: (meiTiId) =>
      chuCanKuai.find((x) => x.mei_ti_id === meiTiId)?.mei_ti_lei_bie ?? undefined,
  })
  const leGuanId = `le-guan-${benCiJian}`
  const leGuanXiaoXi: HaoYouXiaoXi = {
    id: leGuanId,
    jie_shou_zhe_id: haoYouId,
    fa_song_zhe_id: woDeId,
    nei_rong: zhengWen,
    lei_xing: leiXing,
    mei_ti_id: shouTuKuai?.mei_ti_id ?? null,
    mei_ti_url: shouTuKuai?.mei_ti_url ?? null,
    mei_ti_lei_bie: shouTuKuai?.mei_ti_lei_bie ?? null,
    mei_ti_yuan_shi_wen_jian_ming: null,
    mei_ti_da_xiao_zi_jie: null,
    yi_du: false,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
    nei_rong_kuai: chuCanKuai,
    bei_yong_xiao_xi_id: yinYongId,
  }
  xiaoXiLieBiao.value = [...xiaoXiLieBiao.value, leGuanXiaoXi]
  gunDongDaoDiBu()
  try {
    await faSongHaoYouXiaoXi(
      haoYouId,
      zhengWen,
      benCiJian,
      shouTuKuai?.mei_ti_id ? { leiXing, meiTiId: shouTuKuai.mei_ti_id } : undefined,
      { neiRongKuai: tiJiaoKuai, beiYongXiaoXiId: yinYongId },
    )
    qingKongDaiFaKuai()
    shuRuNeiRong.value = ''
    qingChuCaoGao()
    shouQiZhanKaiDang()
    quXiaoYinYong()
    await shuaXin()
  } catch (cuoWu: unknown) {
    xiaoXiLieBiao.value = xiaoXiLieBiao.value.filter((x) => x.id !== leGuanId)
    faSongTiShi.value = duQuTiShi(cuoWu)
  } finally {
    faSongZhong.value = false
  }
}

function duQuTiShi(cuoWu: unknown): string {
  return 归一前台错误(cuoWu).yingXiang
}

// ---------------------------------------------------------------------------
// FP-21 好友媒体（图片 / 文件）。上传走 /api/好友/媒体（归属＝好友关系 + 双方用户编号），
// 气泡地址来自列表接口的签名 URL；粘贴复用 FP-06a 的唯一实现 use粘贴图片，零第二套剪贴板读取。
// 压缩与粘贴预检同样复用聊天页那一份（yaSuoTuPiang / ZHAN_TIE_TU_PIAN_PEI_ZHI），
// 媒体类型码只引用 config/消息配置 的唯一清单；服务端白名单才是最终边界，
// 失败即就地显示后端文案（不整页崩、不静默丢图）。
// ---------------------------------------------------------------------------
const MEI_TI_LEI_XING = new Set<string>(MEI_TI_XIAO_XI_LEI_XING)
const TU_PIAN_LEI_XING = new Set<string>(TU_PIAN_XIAO_XI_LEI_XING)
const xiangCeInputRef = ref<HTMLInputElement | null>(null)
const wenJianInputRef = ref<HTMLInputElement | null>(null)
const yuLanURLJi = new Set<string>()
const meiTiChongLaiYiFa = new Set<string>()
let meiTiShiXiaoZaiTu: Promise<void> | null = null

// C4 授权门的唯一实现是 use图片授权门（待确认队列即 L-23 的正解，聊天页那份单变量已删）；
// 本页只交出开关读写，未决等待者的离页结算由 composable 自己挂 onBeforeUnmount 兜住。
const {
  xianShi: shouQuanDanChuangXianShi,
  queRenTuPianShouQuan,
  shouQuanQueRen,
  shouQuanJuJue,
} = use图片授权门({
  huoQuYiShouQuan: () => 用户仓库.tuPianShouQuan,
  sheZhiYiShouQuan: (yunXu) => 用户仓库.sheZhiTuPianShouQuan(yunXu),
})

function shiTuPianXiaoXi(xiaoXi: HaoYouXiaoXi): boolean {
  return TU_PIAN_LEI_XING.has(xiaoXi.lei_xing)
}

function shiMeiTiXiaoXi(xiaoXi: HaoYouXiaoXi): boolean {
  return MEI_TI_LEI_XING.has(xiaoXi.lei_xing) && !!xiaoXi.mei_ti_url
}

function meiTiWaiKeLeiMing(xiaoXi: HaoYouXiaoXi): string {
  return shiTuPianXiaoXi(xiaoXi) ? 'tupian-waike' : 'wenjian-waike'
}

/** 与聊天页 huoQuWenJianDaXiaoWenBen 同口径的字节显示（不足 1MB 走 KB） */
function huoQuWenJianDaXiao(xiaoXi: HaoYouXiaoXi): string {
  const ziJie = xiaoXi.mei_ti_da_xiao_zi_jie
  if (typeof ziJie !== 'number' || ziJie <= 0) return ''
  if (ziJie >= 1024 * 1024) return `${(ziJie / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(ziJie / 1024))}KB`
}

function chuangJianYuLanURL(neiRong: Blob): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null
  const diZhi = URL.createObjectURL(neiRong)
  yuLanURLJi.add(diZhi)
  return diZhi
}

/** 单个地址的回收：FP-10b 一次发送会连带送出多个块，逐块回收才不误伤其它待发块的缩略图 */
function huiShouYuLanDiZhi(diZhi: string | null): void {
  if (!diZhi) return
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(diZhi)
  }
  yuLanURLJi.delete(diZhi)
}

/** 列表全量刷新后本地预览地址即失效（服务端签名地址接管），统一回收防泄漏 */
function huiShouYuLanURL(): void {
  for (const diZhi of yuLanURLJi) {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(diZhi)
  }
  yuLanURLJi.clear()
}

/**
 * 签名 URL 过期（默认 1 小时）⇒ 重拉一次列表拿新鲜地址。
 * 一屏可能同时有几十张过期图各自触发 @error：整个页面只允许**一条在途**的补救重拉，
 * 其余失效图挂在这同一轮结果上（旧实现按消息条数各发一次整表重拉，50 张图=50 次列表请求，
 * 属自我放大）。每条消息在一次页面生命周期内只登记一次，故坏图不会变成轮询。
 */
function chuLiMeiTiShiXiao(xiaoXi: HaoYouXiaoXi): void {
  if (meiTiChongLaiYiFa.has(xiaoXi.id)) return
  meiTiChongLaiYiFa.add(xiaoXi.id)
  if (meiTiShiXiaoZaiTu) return
  meiTiShiXiaoZaiTu = shuaXin().finally(() => {
    meiTiShiXiaoZaiTu = null
  })
}

async function faSongHaoYouMeiTiXiaoXi(
  leiXing: string,
  leiBie: HaoYouShangChuanLeiBie,
  wenJian: File | Blob,
  wenJianMing: string,
  /** FP-10b：待发块自带的稳定幂等键（重发不换键）；不传则按老口径现造一把 */
  miDengJian?: string,
  /**
   * FP-10b：乐观气泡复用它处已登记的预览地址（待发块的那张缩略图），
   * 一张图只允许一个 blob 地址——再 createObjectURL 一次就是第二条泄漏源头。
   * 不传（文件入口）时才就地新建一个。
   */
  yiYouYuLanURL?: string | null,
): Promise<boolean> {
  faSongTiShi.value = ''
  const yunXu = await queRenTuPianShouQuan()
  if (!yunXu) {
    faSongTiShi.value = huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi')
    return false
  }
  const benCiJian = miDengJian || xinShengWenBenJian()
  const leGuanId = `le-guan-mei-ti-${benCiJian}`
  const benDiYuLan = yiYouYuLanURL ?? chuangJianYuLanURL(wenJian)
  // 复用待发块的预览地址时本函数不认领它的回收：那条地址归编辑区所有，整批发完后由
  // qingKong 统一回收。在这里抢着回收会让同批还没发完的图在编辑区当场裂成碎图标。
  const YuLanGuiBenHuiShou = yiYouYuLanURL == null
  const leGuanXiaoXi: HaoYouXiaoXi = {
    id: leGuanId,
    fa_song_zhe_id: woDeId,
    jie_shou_zhe_id: haoYouId,
    nei_rong: '',
    lei_xing: leiXing,
    mei_ti_id: null,
    mei_ti_url: benDiYuLan,
    mei_ti_lei_bie: leiBie,
    mei_ti_yuan_shi_wen_jian_ming: wenJianMing || null,
    mei_ti_da_xiao_zi_jie: typeof wenJian.size === 'number' ? wenJian.size : null,
    yi_du: false,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  }
  xiaoXiLieBiao.value = [...xiaoXiLieBiao.value, leGuanXiaoXi]
  gunDongDaoDiBu()
  try {
    const shangChuan = await shangChuanHaoYouMeiTi(haoYouId, wenJian, leiBie)
    const yinYongId = yinYongXiaoXi.value?.id ?? null
    leGuanXiaoXi.bei_yong_xiao_xi_id = yinYongId
    await faSongHaoYouXiaoXi(haoYouId, '', benCiJian, { leiXing, meiTiId: shangChuan.mediaId }, {
      beiYongXiaoXiId: yinYongId,
    })
    quXiaoYinYong()
    await shuaXin()
    // 只回收这一条气泡自己的预览地址：服务端签名地址已接管。批量图文时其它待发块的
    // 缩略图还在编辑区里等着发，整台账回收（旧口径）会把它们一起抹掉。
    huiShouYuLanDiZhi(benDiYuLan)
    return true
  } catch (cuoWu: unknown) {
    xiaoXiLieBiao.value = xiaoXiLieBiao.value.filter((x) => x.id !== leGuanId)
    faSongTiShi.value = duQuTiShi(cuoWu)
    return false
  }
}

/**
 * 粘贴/相册/拖入的图片**不再直发**，先进本条消息的待发块序列（一次可贴多张，块可拖序/单块删除）。
 * 与 AI 聊天页共用同一个 `use待发图文` 真源与同一份图文输入区组件（FP-10c）：本页不再有
 * 「huoQuGuangBiao 恒返回 null ⇒ 图片只能追加到末尾」那条限制，图片就插在用户真正的光标处。
 * 压缩在后台做，完成后换回块里的文件。
 */
function jiaruDaiFaTuPian(wenJian: File | Blob): void {
  const jieGuo = chaRuDaiFaTuPian(wenJian, 'tupian')
  if (jieGuo.yuanYin === 'chao_xian') faSongTiShi.value = huoQuFanYi('duoMeiTi', 'kuaiChaoXian')
  const zaiTu = yaSuoTuPiang(wenJian)
    .then((daiFa) => {
      daiHuanDaiFaKuaiWenJian(jieGuo.kuaiId, daiFa)
    })
    .catch((cuoWu: unknown) => {
      faSongTiShi.value = duQuTiShi(cuoWu)
    })
  dengJiDaiFaYaSuo(zaiTu)
}

/** 图文同存的一次粘贴：文字先落光标处，图片随后插在文字之后 ⇒ 顺序就是用户看到的顺序 */
function chaRuShuRuQuWenBen(wenBen: string, guangBiao?: DaiFaGuangBiao | null): void {
  const shangXian = XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu
  const shengYu = shangXian - shuRuNeiRong.value.length
  if (shengYu <= 0) return
  daiFaChaRuWenZi(wenBen.slice(0, shengYu), guangBiao ?? null)
}

const {
  kuaiLieBiao: daiFaKuai,
  guangBiao: daiFaGuangBiao,
  youTuPianKuai: daiFaYouTuPian,
  chaRuTuPian: chaRuDaiFaTuPian,
  chaRuWenZi: daiFaChaRuWenZi,
  gengXinGuangBiao: daiFaGengXinGuangBiao,
  tongBuCongBianJiQi: daiFaTongBuCongBianJiQi,
  daiHuanKuaiWenJian: daiHuanDaiFaKuaiWenJian,
  dengJiYaSuo: dengJiDaiFaYaSuo,
  dengDaiYaSuoWanCheng: dengDaiDaiFaYaSuoWanCheng,
  shanChuKuai: shanChuDaiFaKuai,
  yiDongKuai: yiDongDaiFaKuai,
  daiFaKuaiLieBiao: shouJiDaiFaKuai,
  chaoXianYuJian: daiFaKuaiChaoXian,
  qingKong: qingKongDaiFaKuai,
} = use待发图文({
  shuRuNeiRong,
  chuangJianYuLan: (wenJian) => chuangJianYuLanURL(wenJian),
  huiShouYuLan: huiShouYuLanDiZhi,
})

// FP-10c-⑥：本页无手动展开按钮，只吃真源自动置位（有图进展开档、无图回单行档回落）
const { shuRuKuangZhanKai, shouQiZhanKaiDang } = use输入区展开档({
  shuRuNeiRong,
  youTuPianKuai: daiFaYouTuPian,
})

/** 编辑器 DOM → 真源：这是唯一的写回口（合并相邻文字段、退化回纯文本态都住在 composable 里） */
function chuLiShuRuQuBianJi(duan: BianJiQiDuan[], xianShiXuanRanIds: string[]): void {
  daiFaTongBuCongBianJiQi(duan, xianShiXuanRanIds)
}

function chuLiTuoFang(shiJian: DragEvent): void {
  chuLiTuoLuo(shiJian)
}

const { chuLiZhanTie, chuLiTuoLuo } = use粘贴图片({
  fanJiaTuPian: (wenJian) => jiaruDaiFaTuPian(wenJian),
  fanJiaWenZi: (wenBen) => chaRuShuRuQuWenBen(wenBen),
  sheZhiCuoWu: (xinXi) => {
    faSongTiShi.value = xinXi
  },
})

/** 表情链路的错误一律就地显示在本页提示行，不串到 AI 聊天页的横幅上 */
function jiuDiTiShi(xinXi: string): void {
  faSongTiShi.value = xinXi
}

/**
 * 签名过期时不开第二套签名口径：好友页的新鲜地址只由列表接口现签，
 * 故整表重拉一次（与 @error 的合并重拉同一个 `shuaXin` 入口）后按 id 取新地址。
 */
async function chongQianLieBiaoMeiTiURL(xiaoXi: HaoYouXiaoXi): Promise<string | null> {
  await shuaXin()
  const xinXiang = xiaoXiLieBiao.value.find((yiXiang) => yiXiang.id === xiaoXi.id)
  return xinXiang?.mei_ti_url || null
}

// FP-20 契约：图片气泡的「添加到表情」与聊天页共用同一份取图段（use添加到表情）、同一个
// 提交口（use表情提交）与同一份状态条（use表情提示条），本页零取图/上传实现。
const { tiShi: biaoQingTiShi, xianShi: xianShiBiaoQingTiShi, yinXia: yinXiaBiaoQingTiShi } =
  use表情提示条()
const { tiJiaoBiaoQingWenJian } = use表情提交({
  queRenTuPianShouQuan,
  sheZhiCuoWu: jiuDiTiShi,
})
const { tianJiaTuPianDaoBiaoQing } = use添加到表情<HaoYouXiaoXi>({
  huoQuMeiTiURL: (xiaoXi) => xiaoXi.mei_ti_url || undefined,
  huoQuWenJianMing: (xiaoXi) => xiaoXi.mei_ti_yuan_shi_wen_jian_ming || undefined,
  chongQianMeiTiURL: (xiaoXi) => chongQianLieBiaoMeiTiURL(xiaoXi),
  tiJiaoWenJian: (wenJian) => tiJiaoBiaoQingWenJian(wenJian),
  sheZhiCuoWu: jiuDiTiShi,
  sheZhiTiShi: (xinXi) => xianShiBiaoQingTiShi(xinXi),
})
// 撤回窗口判定所需的时钟：好友消息没有 fa_song_zhe_lei_xing ⇒ keXianShiCheHui 恒 false，
// 菜单里恒无撤回项（撤回仍是本页既有的行内按钮），故此处只作占位读数，不随秒刷新。
const dangQianShiJian = ref(Date.now())
const {
  chuMoJieShu,
  yuYinCaiDanZhanKai,
  yuYinCaiDanYangShi,
  daKaiYuYinCaiDan,
  chuMoKaiShiYuYin,
  chuMoJieShuYuYin,
  guanBiYuYinCaiDan,
  huoQuYuYinCaiDanXiang,
  zhiXingYuYinCaiDanXiang,
  wenBenCaiDanZhanKai,
  wenBenCaiDanYangShi,
  daKaiWenBenCaiDan,
  chuMoKaiShiWenBen,
  chuMoJieShuWenBen,
  guanBiWenBenCaiDan,
  huoQuWenBenCaiDanXiang,
  zhiXingWenBenCaiDanXiang,
  tuPianCaiDanZhanKai,
  tuPianCaiDanYangShi,
  daKaiTuPianCaiDan,
  chuMoKaiShiTuPian,
  chuMoJieShuTuPian,
  guanBiTuPianCaiDan,
  huoQuTuPianCaiDanXiang,
  zhiXingTuPianCaiDanXiang,
  huoQuFanYiJieGuo,
  huoQuFanYiCuoWu,
  shiFanYiZhong,
  shiFanYiZhanKai,
  shiFanYiChuCuo,
  shiFanYiKong,
  qiangZhiFanYi,
  fanYiYuanYu,
  fanYiMuBiaoYu,
  huoQuYinYongZhaiYao: zhengWenZhaiYaoChuKou,
  yinYongXiaoXi,
  quXiaoYinYong,
} = use长按菜单<HaoYouXiaoXi>({
  dangQianShiJian,
  zhiChiTuPianYinYong: true,
  cheHuiXiaoXi: (xiaoXiId) => cheHui(xiaoXiId),
  qieHuanYuYinZhuanWenZi: (xiaoXi) => qieHuanZhuanWenZiXianShi(xiaoXi as unknown as 消息),
  fanYiQingQiu: (wenBen, yuanYu, muBiaoYu) => fanYiWenBenApi(wenBen, yuanYu, muBiaoYu),
  tianJiaDaoBiaoQing: (xiaoXi) => tianJiaTuPianDaoBiaoQing(xiaoXi),
  sheZhiCuoWu: jiuDiTiShi,
})

function huoQuFanYiZhuangTai(xiaoXi: HaoYouXiaoXi): 'loading' | 'success' | 'empty' | 'error' {
  if (shiFanYiZhong(xiaoXi)) return 'loading'
  if (shiFanYiChuCuo(xiaoXi)) return 'error'
  if (shiFanYiKong(xiaoXi) || !huoQuFanYiJieGuo(xiaoXi)?.trim()) return 'empty'
  return 'success'
}

function gaiFanYiYuanYu(zhi: string, xiaoXi: HaoYouXiaoXi): void {
  fanYiYuanYu.value = zhi
  chongXinFanYi(xiaoXi)
}

function gaiFanYiMuBiaoYu(zhi: string, xiaoXi: HaoYouXiaoXi): void {
  fanYiMuBiaoYu.value = zhi
  chongXinFanYi(xiaoXi)
}

function chongXinFanYi(xiaoXi: HaoYouXiaoXi): void {
  void qiangZhiFanYi(xiaoXi)
}

// FP-11：好友页语音播放与转写（转写菜单项 yuYinZhuanWenZi 在 yuYinCaiDanXiang 里恒在，
// 不接 qieHuanZhuanWenZiXianShi 则菜单点下去无效）。地址源用 mei_ti_url；转写 API 与 AI 页同源。
const {
  huoQuZhuanWenZi,
  shiYuYinZhuanXieZhong,
  shiZhuanWenZiZhanKai,
  shiZhuanWenZiShiBai,
  qieHuanZhuanWenZiXianShi,
} = use语音转文字({
  huoQuYuYinDiZhi: (xiaoXi) => (xiaoXi as unknown as HaoYouXiaoXi).mei_ti_url || undefined,
  zhuanXieQingQiu: async (xiaoXi) =>
    zhuanXieYuYin((xiaoXi as unknown as HaoYouXiaoXi).mei_ti_id || ''),
})
const {
  shiYuYinBoFangZhong,
  tingZhiYinPinBoFang,
  qieHuanYuYinBoFang,
  huoQuBoFangJinDu,
  huoQuBoFangZongMiao,
  tiaoZhuanYuYinJinDu,
} = use语音播放({
  huoQuDiZhi: (xiaoXi) => (xiaoXi as unknown as HaoYouXiaoXi).mei_ti_url || undefined,
})

/**
 * FP-09：引用两件套接线点。定位锚前缀与组件同源（YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui），
 * 滚动容器就是消息列表那个 `<main>`。
 */
function yinYongXiangId(xiaoXi: HaoYouXiaoXi): string {
  return `${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}${xiaoXi.id}`
}

function huoQuXiaoXiGunDongRongQi(): HTMLElement | null {
  return xiaoxiQuYuRef.value
}

/** 被引用那条的发送者展示名：好友消息无 fa_song_zhe_lei_xing，按发送者 id 对上本会话双方取名 */
function yinYongFaSongZheMing(muBiao: CaiDanXiaoXi): string {
  if (muBiao.id === woDeId) {
    return 用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  }
  const xiang = xiaoXiLieBiao.value.find((x) => x.id === muBiao.id)
  if (xiang?.fa_song_zhe_id === woDeId) {
    return 用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  }
  return haoYouMing.value || ''
}

/** 发送前引用条摘要：媒体占位走 config/消息配置 单源映射，其余走 use长按菜单 唯一截断出口 */
function huoQuYinYongZhaiYao(muBiao: CaiDanXiaoXi): string {
  return huoQuMeiTiYinYongZhanWei(muBiao.lei_xing) ?? zhengWenZhaiYaoChuKou(muBiao)
}

/**
 * FP-21：右键/长按统一分流（与 AI 页同构）。
 * 禁写图片类型比较字面量（FP-20 全库仅两文件允许该写法）：图片判定走本地
 * shiTuPianXiaoXi（TU_PIAN_LEI_XING 集合）。乐观气泡 id 是 le-guan-* 非 UUID ⇒ 一律拒开
 * 菜单（引用会 400）。
 */
function chuLiYouJianCaiDan(xiaoXi: HaoYouXiaoXi, shiJian: MouseEvent) {
  if (xiaoXi.id.startsWith('le-guan-')) return
  if (xiaoXi.lei_xing === 'yuYin') {
    daKaiYuYinCaiDan(xiaoXi, shiJian)
    return
  }
  if (xiaoXi.lei_xing === 'wenben') {
    daKaiWenBenCaiDan(xiaoXi, shiJian)
    return
  }
  if (shiTuPianXiaoXi(xiaoXi)) {
    daKaiTuPianCaiDan(xiaoXi, shiJian)
    return
  }
}

function chuLiChuMoKaiShi(xiaoXi: HaoYouXiaoXi) {
  if (xiaoXi.id.startsWith('le-guan-')) return
  if (xiaoXi.lei_xing === 'yuYin') {
    chuMoKaiShiYuYin(xiaoXi)
    return
  }
  if (xiaoXi.lei_xing === 'wenben') {
    chuMoKaiShiWenBen(xiaoXi)
    return
  }
  if (shiTuPianXiaoXi(xiaoXi)) {
    chuMoKaiShiTuPian(xiaoXi)
    return
  }
}

function chuLiChuMoJieShu() {
  chuMoJieShu()
  chuMoJieShuYuYin()
  chuMoJieShuWenBen()
  chuMoJieShuTuPian()
}

function daKaiXiangCe(): void {
  xiangCeInputRef.value?.click()
}

function daKaiWenJianXuanZe(): void {
  wenJianInputRef.value?.click()
}

async function chuLiXiangCeXuanZe(shiJian: Event): Promise<void> {
  const shuRu = shiJian.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  jiaruDaiFaTuPian(wenJian)
}

async function chuLiWenJianXuanZe(shiJian: Event): Promise<void> {
  const shuRu = shiJian.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  await faSongHaoYouMeiTiXiaoXi('wenJian', 'wenjian', wenJian, wenJian.name || '')
}

async function cheHui(xiaoXiId: string) {
  await cheHuiHaoYouXiaoXi(xiaoXiId)
  await shuaXin()
}

onMounted(async () => {
  await 设置仓库.jiaZai()
  caoGaoYiHuiFu.value = huiFuCaoGao()
  try {
    const lieBiao = await huoQuHaoYouLieBiao()
    const haoYou = lieBiao.find((xiang) => xiang.id === haoYouId)
    if (haoYou) {
      haoYouTouXiang.value = haoYou.tou_xiang
      haoYouMing.value = haoYou.ni_cheng || haoYou.yong_hu_ming || ''
    }
  } catch {
    /* 好友信息加载失败时仅用默认头像 */
  }
  try {
    const mingPian = await huoQuMingPian(haoYouId)
    haoYouQiPao.value = typeof mingPian.qi_pao_zi_ji === 'string' ? mingPian.qi_pao_zi_ji : null
  } catch {
    /* 对方气泡偏好不可用时回退到自身AI气泡 */
  }
  await shuaXin()
  // YH-087 轮询增量：socket缺席时30s轮询兜底，禁固定50全量
  lunXunDingShi.value = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    const zuiXin = xiaoXiLieBiao.value[xiaoXiLieBiao.value.length - 1]
    void shuaXin(zuiXin ? { xu_hao: null, shi_jian: zuiXin.shi_jian_chuo, id: zuiXin.id } : undefined)
  }, 30000)
})

onBeforeUnmount(() => {
  if (lunXunDingShi.value !== null) {
    window.clearInterval(lunXunDingShi.value)
    lunXunDingShi.value = null
  }
  tingZhiYinPinBoFang()
  // 离页即回收本地预览地址：blob: 地址只在本页消费。未决授权 Promise 由 use图片授权门
  // 自己的 onBeforeUnmount 结算，不在页面里重复一份（重复即第二处真源）。
  huiShouYuLanURL()
  yinXiaBiaoQingTiShi()
})
</script>

<style scoped>
.liaotian-yemian {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--beijing-zhuse);
}
/* 好友聊天顶栏：显式返回按钮，单次点击直达上一页 */
.haoyou-dingbu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--dingbu-lan-beijing);
  border-bottom: 0.5px solid var(--biankuang-yanse);
  flex: none;
}
.haoyou-fanhui {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--wenben-zhuse);
  font-size: 15px;
  padding: 6px 8px 6px 2px;
  cursor: pointer;
}
.haoyou-fanhui-jiantou {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 7px solid currentcolor;
}
.haoyou-dingbu-ming {
  font-size: 15px;
  font-weight: 600;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.xiaoxi-quyu {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  background: var(--liaotian-beijing);
}
.beijing-miWuSenLin { background: linear-gradient(135deg, #1a2f1a, #2d4a2d); }
.beijing-haiYangZhiLan { background: linear-gradient(135deg, #1a3a5c, #2d6a9f); }
.beijing-fenSeMengJing { background: linear-gradient(135deg, #f7d6e0, #f2a7c3); }
.beijing-yeKongXingHe { background: linear-gradient(135deg, #0a0a23, #1a1a4d); }
.beijing-miSeTianYuan { background: linear-gradient(135deg, #f5f0e1, #e8dcc3); }
.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  max-width: 100%;
}
.yonghu-xiaoxi { flex-direction: row-reverse; align-self: flex-end; }
.jiaose-xiaoxi { flex-direction: row; align-self: flex-start; }
.xiaoxi-wei {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-beijing-moren);
  flex-shrink: 0;
  font-size: 18px;
  color: var(--wenben-zhuse);
}
.yonghu-xiaoxi .xiaoxi-wei { margin-left: 10px; }
.jiaose-xiaoxi .xiaoxi-wei { margin-right: 10px; }
.qipao-waike { max-width: min(calc(100vw - 126px), 520px); }
.qipao-neirong {
  padding: 9px 13px;
  border-radius: 6px;
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
  position: relative;
  display: inline-block;
}
.yonghu-xiaoxi .qipao-neirong { background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing)); color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben)); }
.jiaose-xiaoxi .qipao-neirong { background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing)); color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben)); }
.chehui-xiao-anniu {
  font-size: 12px;
  color: var(--wenben-tishi);
  padding: 4px 8px;
  /* YH-101 触屏目标：最小24px推荐44px，12px点不到收敛为最小可点 */
  min-width: 24px;
  min-height: 24px;
}
.shuru-quyu {
  background: var(--shuru-quyu-beijing);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  padding: 8px 10px;
  padding-bottom: calc(8px + var(--anquan-quyu-xia));
}
.shuru-rongqi {
  /* 缺陷5 同源几何：与聊天页同一套输入区度量令牌，两页高度必须由同一来源构造。
     FP-22c：令牌住在 styles/variables.css 的共用 :root 块，本页不再局部抄一份。
     FP-10c：图文真内联后本页与 AI 页共用 components/聊天/图文输入区.vue，输入区外壳与编辑器的
     模板/CSS 都在那一份里（含 --shuru-kuang-* 的取值与折叠/展开两档高度），本页只排行不排盒；
     flex-wrap 保留给「窄屏下发送按钮与媒体入口换行」，不再服务于待发序列的整行槽位 */
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
/* FP-21 媒体入口：与聊天页同用「相册/文件」语义，但好友页无「更多」面板，故恒常驻两个图标按钮。
   FP-23 起可见盒与聊天页三主图标同吃 --shuru-tubiao-chicun（= 输入框折叠态单行高），
   YH-101 的 44px 触屏命中区改由 ::before 外扩承担，不再靠撑盒子兑换。色值只取明暗两套均有定义的令牌。 */
.meiti-rukou {
  position: relative;
  flex: none;
  width: var(--shuru-tubiao-chicun);
  height: var(--shuru-tubiao-chicun);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0.5px solid var(--biankuang-yanse);
  border-radius: 6px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  cursor: pointer;
}
.meiti-rukou::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}
/* 字形与聊天页同枚令牌，宽高同值 ⇒ 方形 viewBox 下恒等比；原 20px 是好友页独有的第二套度量 */
.meiti-rukou svg { width: var(--shuru-tubiao-glyph-chicun); height: var(--shuru-tubiao-glyph-chicun); }
.yincang-wenjian-shuru { display: none; }
/* 图片与表情包不带文字气泡底色（与聊天页同一口径：表情包无气泡） */
.tupian-waike { max-width: min(calc(100vw - 126px), 260px); }
.tupian-qipao {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  object-fit: cover;
  background: var(--beijing-kaopian);
}
/* FP-10c：输入区外壳 .shuru-kuang-waike 与编辑器 .shuru-kuang 的 CSS 随 components/聊天/图文输入区.vue
   一起唯一化（改造前两页各抄一份且已漂移）。本页此前没有展开档（无 .zhan-kai-anniu），
   折叠态高度与 AI 页同吃 --shuru-danxing-gao-du；滚动条仍只有 styles/global.css 一处真源。
   FP-10c-⑥：本页接真源 use输入区展开档 —— 待发图文块出现自动进展开档（64px > 35px 不裁图）、
   删块自动回落；无手动展开按钮（保持「无第二份 .zhan-kai 类绑定」契约）。
   FP-12b：文件卡片 .wenjian-* 样式随 components/聊天/文件气泡.vue 一起唯一化，本页不再内联一份。 */
.fasong-anniu {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 与输入框外壳同一套量：同上下内边距 + 同行高基准 + 同宽透明边框 ⇒ 两盒等高 */
  padding: var(--shuru-kuang-shang-xia-neidian) 14px;
  border: var(--shuru-kuang-biankuang) solid transparent;
  min-width: var(--shuru-anniu-re-ku);
  line-height: var(--shuru-kuang-hangxing-gao);
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}
.fasong-anniu::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}
.fasong-anniu:disabled { background: var(--fasong-anniu-jinyong-beijing); cursor: not-allowed; }
.fasong-tishi {
  margin: 6px 2px 0;
  font-size: 12px;
  color: var(--cuowu-yanse, #ff6b6b);
}
/* 气泡内的图文块（FP-10b/FP-24a，与 AI 页同源度量）：图片独占一行、文字保持气泡文本形态。
   --biaoqingbao 必须排 .tuwen-kuai-tu 之后（FP24a 源码序用例钉住）。 */
.tuwen-kuai--tu { display: block; }
.tuwen-kuai-tu {
  display: block;
  max-width: var(--tuwen-tu-zuidakuan);
  max-height: var(--tuwen-tu-zuida-gao);
  border-radius: 6px;
  object-fit: cover;
}
.tuwen-kuai-tu--biaoqingbao {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  max-width: var(--duomeiti-biaoqingbao-chicun);
  max-height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
}
.yuyin-waike { max-width: min(calc(100vw - 126px), 520px); }
.yuyin-zhuanwenzi {
  display: block;
  margin-top: 4px;
  padding: 6px 8px;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  word-break: break-word;
  border: none;
  border-radius: 6px;
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: inherit;
  cursor: pointer;
}
.yonghu-xiaoxi .yuyin-zhuanwenzi {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
}
.yuyin-zhuanwenzi-shibai { cursor: default; opacity: 0.7; }
.yuyin-zhuanwenzi-zhuangtai {
  margin-top: 4px;
  font-size: 12px;
  color: var(--wenben-tishi);
}
/* 图片菜单的淡入淡出与聊天页同一条时间曲线。刻意留在本页 scoped 块里：全局化会让同名
   过渡溢到结算弹窗（它也叫 zhezhao-xianshi，但走自己的 keyframes）。 */
.zhezhao-xianshi-enter-active { transition: opacity 0.25s ease; }
.zhezhao-xianshi-leave-active { transition: opacity 0.15s ease; }
.zhezhao-xianshi-enter-from,
.zhezhao-xianshi-leave-to { opacity: 0; }
</style>
