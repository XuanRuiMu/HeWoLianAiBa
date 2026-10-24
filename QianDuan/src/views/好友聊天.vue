<template>
  <div class="liaotian-yemian" data-chat-scope="true">
    <KongTai
      v-if="feiHaoYou"
      :biao-ti="huoQuFanYi('haoYou', 'feiHaoYou')"
      :chong-shi-wen-zi="huoQuFanYi('haoYou', 'fanHuiHaoYouLieBiao')"
      @chong-shi="fanHuiLieBiao"
    />
    <KongTai
      v-else-if="qianTaiCuoWu"
      :biao-ti="huoQuFanYi('haoYou', 'xiaoXiJiaZaiShiBai')"
      :chong-shi-wen-zi="qianTaiCuoWu.retryable ? huoQuFanYi('liaoTian', 'chongShi') : undefined"
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
    <LiaoTianMianBan
      ref="mianBanJiaGou"
      yuan-su="main"
      class="xiaoxi-quyu"
      :qi-pao-yang-shi="qiPaoYangShi"
      role="log"
      aria-live="polite"
      :aria-label="huoQuFanYi('liaoTian', 'xiaoXiLieBiao')"
      @scroll.passive="chuLiXiaoXiGunDong"
    >
      <div v-if="zaiJiaGengZao" class="gujia-gengzao" aria-hidden="true">
        <div v-for="(xing, xiaBiao) in 3" :key="`gujia-${xing}`" class="gujia-hang" :class="{ fanxiang: xiaBiao === 1 }">
          <span class="gujia-touxiang"></span>
          <span class="gujia-qiPao" :class="`gujia-qiPao-${xiaBiao}`"></span>
        </div>
      </div>
      <template v-for="zu in xiaoXiFenZu" :key="'zu-' + zu.shiJianChuo">
      <ShiJianTiao :shi-jian="zu.shiJian" :shi-jian-chuo="zu.shiJianChuo" />
      <XiaoXiHang
        v-for="xiaoXi in zu.xiaoXiLieBiao"
        :id="yinYongXiangId(xiaoXi)"
        :key="xiaoXi.id"
        :shi-ben-ren="xiaoXi.fa_song_zhe_id === woDeId"
        :lei-ming="{ 'chehui-xiaoxi': xiaoXi.yi_che_hui }"
        :xian-shi-tou-xiang="!xiaoXi.yi_che_hui"
        :tou-xiang="xianShiTouXiang(xiaoXi)"
        :mo-ren-zi="touXiangMoRenZi(xiaoXi)"
        :wu-wai-ke="xiaoXi.yi_che_hui"
        :wai-ke-lei-ming="qiPaoWaiKeLeiMing(xiaoXi)"
        @contextmenu.prevent="chuLiYouJianCaiDan(xiaoXi, $event)"
        @touchstart="chuLiChuMoKaiShi(xiaoXi, $event)"
        @touchend="chuLiChuMoJieShu"
        @touchmove="chuLiChuMoJieShu"
      >
        <template v-if="xiaoXi.yi_che_hui">
          <div class="chehui-tishi">{{ cheHuiTiShi(xiaoXi) }}</div>
        </template>
        <template v-else-if="xiaoXi.lei_xing === 'yuYin'">
          <YuYinQiPao
            :xiao-xi="(xiaoXi as unknown as { mei_ti_shi_chang_hao_miao?: number | null })"
            :bo-fang-zhong="shiYuYinBoFangZhong(xiaoXi as unknown as 消息)"
            :xuan-zhong="shiYuYinXuanZhong(xiaoXi as unknown as 消息)"
            :jin-du-miao="huoQuBoFangJinDu(xiaoXi as unknown as 消息)"
            :zong-miao="huoQuBoFangZongMiao(xiaoXi as unknown as 消息)"
            :shi-ben-ren="xiaoXi.fa_song_zhe_id === woDeId"
            @qie-huan="chuLiYuYinDianJi(xiaoXi as unknown as 消息)"
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
        </template>
        <template v-else-if="shiMeiTiXiaoXi(xiaoXi) && !shiXuYaoKuaiXuanRan(xiaoXi as unknown as 消息)">
          <img
            v-if="shiTuPianXiaoXi(xiaoXi)"
            class="tupian-qipao"
            :src="xiaoXi.mei_ti_url || undefined"
            loading="lazy"
            :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
            @click.stop="daKaiTuPianYuLan(xiaoXi.mei_ti_url)"
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
        </template>
        <template v-else>
          <QiPaoRongQi :shi-ben-ren="xiaoXi.fa_song_zhe_id === woDeId">
            <template v-if="shiXuYaoKuaiXuanRan(xiaoXi as unknown as 消息)">
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
                  @click.stop="daKaiTuPianYuLan(kuai.mei_ti_url || xiaoXi.mei_ti_url)"
                  @error="chuLiMeiTiShiXiao(xiaoXi)"
                />
                <template v-else>{{ kuai.nei_rong }}</template>
              </span>
            </template>
            <template v-else>{{ xiaoXi.nei_rong }}</template>
          </QiPaoRongQi>
          <YinYongQiPaoKuai
            v-if="xiaoXi.bei_yong_xiao_xi_id"
            :bei-yong-xiao-xi-id="xiaoXi.bei_yong_xiao_xi_id"
            :lie-biao="xiaoXiLieBiao"
            :gun-dong-rong-qi="huoQuXiaoXiGunDongRongQi"
            :fa-song-zhe-ming="yinYongFaSongZheMing"
          />
          <FanYiJieGuo
            v-if="
              shiFanYiZhong(xiaoXi) ||
              shiFanYiZhanKai(xiaoXi) ||
              shiFanYiChuCuo(xiaoXi) ||
              shiFanYiKong(xiaoXi)
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
        </template>
        <template #wei-jiao>
          <button
            v-if="shiFaSongShiBai(xiaoXi)"
            type="button"
            class="fasong-shibai-jiaobiao"
            :title="huoQuFanYi('liaoTian', 'chongXinFaSong')"
            :aria-label="huoQuFanYi('liaoTian', 'chongXinFaSong')"
            @click.stop="chongXinFaSong(xiaoXi.id)"
          >
            !
          </button>
        </template>
      </XiaoXiHang>
      </template>
    </LiaoTianMianBan>
    <button
      v-if="weiDuXinShu > 0"
      type="button"
      class="xin-xiaoxi-fubiao"
      :aria-label="`${weiDuXinShu}${huoQuFanYi('haoYou', 'weiDuTiao')}`"
      @click="dianJiXinXiaoXi"
    >
      {{ weiDuXinShu }}{{ huoQuFanYi('haoYou', 'weiDuTiao') }}
    </button>
    <footer class="shuru-quyu">
      <div class="shuru-rongqi">
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
          type="button"
          class="meiti-rukou"
          :class="{ huoyue: biaoQingMianBanZhanKai }"
          :title="huoQuFanYi('duoMeiTi', 'biaoQingMianBan')"
          :aria-label="huoQuFanYi('duoMeiTi', 'biaoQingMianBan')"
          :aria-expanded="biaoQingMianBanZhanKai"
          @click="qieHuanBiaoQingMianBan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
            <path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.4" />
          </svg>
        </button>
        <button
          v-if="youKeFaSong"
          class="fasong-anniu"
          @click="faSong"
        >
          {{ huoQuFanYi('haoYou', 'faSong') }}
        </button>
        <button
          v-else
          type="button"
          class="meiti-rukou"
          :class="{ huoyue: gengDuoMianBanZhanKai }"
          :title="huoQuFanYi('duoMeiTi', 'gengDuo')"
          :aria-label="huoQuFanYi('duoMeiTi', 'gengDuo')"
          :aria-expanded="gengDuoMianBanZhanKai"
          @click="qieHuanGengDuoMianBan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <BiaoQingMianBan
        :zhan-kai="biaoQingMianBanZhanKai"
        :rong-qi="biaoQingMianBanRongQi"
        :que-ren-shou-quan="queRenTuPianShouQuan"
        @guan-bi="biaoQingMianBanZhanKai = false"
        @fa-song-biao-qing-bao="faSongBiaoQingBao"
        @jia-ru-tie-zhi="jiaRuDaiFaTieZhi"
        @she-zhi-cuo-wu="jiuDiTiShi"
      />
      <Transition name="mianban-zhankai">
        <div v-show="gengDuoMianBanZhanKai" class="gengduo-mianban">
          <button type="button" class="gengduo-rukou" @click="daKaiXiangCe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>{{ huoQuFanYi('duoMeiTi', 'xiangCe') }}</span>
          </button>
          <button type="button" class="gengduo-rukou" @click="daKaiWenJianXuanZe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <span>{{ huoQuFanYi('duoMeiTi', 'wenJian') }}</span>
          </button>
        </div>
      </Transition>
      <p v-if="faSongTiShi" class="fasong-tishi" role="status">{{ faSongTiShi }}</p>
      <p v-if="caoGaoYiHuiFu" class="fasong-tishi" role="status">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</p>
      
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
    <TuPianYuLan
      :tu="yuLanTuPianLieBiao"
      :xia-biao="yuLanXiaBiao"
      @guan-bi="guanBiTuPianYuLan"
      @geng-xin-xia-biao="yuLanXiaBiao = $event"
    />
    <DuoMeiTiShouQuanDanChuang :xian-shi="shouQuanDanChuangXianShi" @que-ren="shouQuanQueRen" @ju-jue="shouQuanJuJue" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/翻译表'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用会话标题仓库 } from '@/stores/会话标题'
import { 使用好友仓库 } from '@/stores/好友'
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
import { baoCunMeiTiXiaoXi } from '@/utils/多模态'
import { heBingXiaoXi, tongJiDuiFangXinXiaoXi } from '@/utils/消息合并'
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
import type { 消息, XiaoXiKuaiChuCan } from '@/types/类型定义'
import { fanYiWenBen as fanYiWenBenApi, zhuanXieYuYin } from '@/api/聊天'
import {
  huoQuXianShiKuai,
  shiBiaoQingBaoKuai,
  shiXuYaoKuaiXuanRan,
  kuaiDaoZhengWen,
  kuaiDaoXiaoXiLeiXing,
  keTiJiaoKuai,
  BIAO_QING_BAO_MEI_TI_LEI_BIE,
} from '@/utils/消息内容块'
import { xuanRanBiaoQingBao, type BiaoQingBaoDingYi } from '@/utils/表情包库'
import type { BiaoQingXiang } from '@/api/表情'
import { use语音转文字 } from '@/composables/use语音转文字'
import { use语音播放 } from '@/composables/use语音播放'
import {
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
  MEI_TI_XIAO_XI_LEI_XING,
  TU_PIAN_XIAO_XI_LEI_XING,
  XIAO_XI_PEI_ZHI,
  YIN_YONG_DING_WEI_PEI_ZHI,
  duQuHeChengYinLiang,
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
import QiPaoRongQi from '@/components/聊天/气泡容器.vue'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import WenJianQiPao from '@/components/聊天/文件气泡.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'
import LiaoTianMianBan from '@/components/聊天/聊天面板.vue'
import XiaoXiHang from '@/components/聊天/消息行.vue'
import BiaoQingMianBan from '@/components/聊天/表情面板.vue'
import TuPianYuLan from '@/components/聊天/图片预览.vue'
import TouXiang from '@/components/头像.vue'

const route = useRoute()
const router = useRouter()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const 会话标题 = 使用会话标题仓库()
const 好友仓库 = 使用好友仓库()
const haoYouId = String(route.params.haoYouId || '')
const woDeId = 用户仓库.dangQianYongHu?.id || ''
const xiaoXiLieBiao = ref<HaoYouXiaoXi[]>([])
const xiaoXiFenZu = computed(() => fenZuXiaoXiAnShiJian(xiaoXiLieBiao.value))
const shuRuNeiRong = ref('')
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian(haoYouId), shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const mianBanJiaGou = ref<{ $el?: HTMLElement } | null>(null)
const xiaoxiQuYuRef = computed(() => mianBanJiaGou.value?.$el ?? null)
const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, yunXing, chongShi } = use前台错误()
const feiHaoYou = ref(false)
const faSongTiShi = ref('')
const haoYouTouXiang = ref<string | null>(null)
const haoYouMing = ref('')
const haoYouQiPao = ref<string | null>(null)
const lunXunDingShi = ref<number | null>(null)
const LE_GUAN_QIAN_ZHUI = 'le-guan-'
const faSongZhuangTai = ref(new Map<string, 'fa_song_zhong' | 'shi_bai'>())
const daiChongShiFa = new Map<string, () => Promise<void>>()
const weiDuXinShu = ref(0)
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

function cheHuiTiShi(xiaoXi: HaoYouXiaoXi): string {
  return xiaoXi.fa_song_zhe_id === woDeId
    ? huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi')
    : huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
}

function gunDongDaoDiBu() {
  requestAnimationFrame(() => {
    if (xiaoxiQuYuRef.value) xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
  })
}

function shiZaiDiBu(): boolean {
  const rongQi = xiaoxiQuYuRef.value
  if (!rongQi) return true
  return rongQi.scrollHeight - rongQi.scrollTop - rongQi.clientHeight <= XIAO_XI_PEI_ZHI.diBuYuZhiXiangSu
}

function heBingXiaoXiLieBiao(fuWuQi: HaoYouXiaoXi[], laiYuan: HaoYouXiaoXi[]): HaoYouXiaoXi[] {
  return heBingXiaoXi(
    fuWuQi,
    laiYuan,
    (xiaoXi) => xiaoXi.id.startsWith(LE_GUAN_QIAN_ZHUI) && faSongZhuangTai.value.has(xiaoXi.id),
  )
}

function biaoJiFaSongZhong(leGuanId: string): void {
  faSongZhuangTai.value.set(leGuanId, 'fa_song_zhong')
}

function biaoJiFaSongShiBai(leGuanId: string): void {
  faSongZhuangTai.value.set(leGuanId, 'shi_bai')
}

function qingChuFaSongZhuangTai(leGuanId: string): void {
  faSongZhuangTai.value.delete(leGuanId)
}

function shiFaSongShiBai(xiaoXi: HaoYouXiaoXi): boolean {
  return faSongZhuangTai.value.get(xiaoXi.id) === 'shi_bai'
}

async function chongXinFaSong(leGuanId: string): Promise<void> {
  if (faSongZhuangTai.value.get(leGuanId) !== 'shi_bai') return
  const chongShi = daiChongShiFa.get(leGuanId)
  if (!chongShi) return
  faSongZhuangTai.value.set(leGuanId, 'fa_song_zhong')
  await chongShi()
}

async function shuaXin(shouCi = false): Promise<void> {
  await yunXing(
    async () => {
      feiHaoYou.value = false
      const zaiDiBu = shiZaiDiBu()
      const yiCunId = new Set(xiaoXiLieBiao.value.map((xiaoXi) => xiaoXi.id))
      const { lieBiao: fuWuQi, haiYouGengDuo } = await huoQuHaoYouXiaoXi(
        haoYouId,
        XIAO_XI_PEI_ZHI.haoYouXiaoXiZuiDaTiaoShu,
      )
      haiYouGengDuoShi.value = haiYouGengDuo
      const heBing = heBingXiaoXiLieBiao(fuWuQi, xiaoXiLieBiao.value)
      const duiFangXinShu = tongJiDuiFangXinXiaoXi(heBing, yiCunId, woDeId)
      xiaoXiLieBiao.value = heBing
      if (shouCi || zaiDiBu) {
        gunDongDaoDiBu()
        weiDuXinShu.value = 0
      } else if (duiFangXinShu > 0) {
        weiDuXinShu.value += duiFangXinShu
      }
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

function fanHuiLieBiao() {
  router.replace('/hao-you')
}

interface LeGuanBuCan {
  lei_xing: string
  nei_rong: string
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
  mei_ti_da_xiao_zi_jie?: number | null
  nei_rong_kuai?: XiaoXiKuaiChuCan[] | null
  bei_yong_xiao_xi_id?: string | null
}

function chuangJianLeGuanXiaoXi(jian: string, bu: LeGuanBuCan): HaoYouXiaoXi {
  return {
    id: `${LE_GUAN_QIAN_ZHUI}${jian}`,
    fa_song_zhe_id: woDeId,
    fa_song_zhe_lei_xing: 'yonghu',
    jie_shou_zhe_id: haoYouId,
    nei_rong: bu.nei_rong,
    lei_xing: bu.lei_xing,
    mei_ti_id: bu.mei_ti_id ?? null,
    mei_ti_url: bu.mei_ti_url ?? null,
    mei_ti_lei_bie: bu.mei_ti_lei_bie ?? null,
    mei_ti_yuan_shi_wen_jian_ming: bu.mei_ti_yuan_shi_wen_jian_ming ?? null,
    mei_ti_da_xiao_zi_jie: bu.mei_ti_da_xiao_zi_jie ?? null,
    yi_du: false,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
    nei_rong_kuai: bu.nei_rong_kuai ?? null,
    bei_yong_xiao_xi_id: bu.bei_yong_xiao_xi_id ?? yinYongXiaoXi.value?.id ?? null,
  } as HaoYouXiaoXi
}

function zhanShiLeGuanQiPao(leGuanXiaoXi: HaoYouXiaoXi): void {
  biaoJiFaSongZhong(leGuanXiaoXi.id)
  xiaoXiLieBiao.value = [
    ...xiaoXiLieBiao.value.filter((xiaoXi) => xiaoXi.id !== leGuanXiaoXi.id),
    leGuanXiaoXi,
  ]
  gunDongDaoDiBu()
}

async function zhiXingFaSong(
  leGuanXiaoXi: HaoYouXiaoXi,
  qingQiu: () => Promise<void>,
): Promise<boolean> {
  const leGuanId = leGuanXiaoXi.id
  daiChongShiFa.set(leGuanId, async () => {
    await zhiXingFaSong(leGuanXiaoXi, qingQiu)
  })
  faSongTiShi.value = ''
  zhanShiLeGuanQiPao(leGuanXiaoXi)
  try {
    await qingQiu()
    qingChuFaSongZhuangTai(leGuanId)
    daiChongShiFa.delete(leGuanId)
    await shuaXin()
    return true
  } catch (cuoWu: unknown) {
    biaoJiFaSongShiBai(leGuanId)
    faSongTiShi.value = duQuTiShi(cuoWu)
    return false
  }
}

async function faSongYiDuanWenBen(wenBen: string, miDengJian: string): Promise<boolean> {
  const yinYongId = yinYongXiaoXi.value?.id ?? null
  return zhiXingFaSong(
    chuangJianLeGuanXiaoXi(miDengJian, { lei_xing: 'wenben', nei_rong: wenBen, bei_yong_xiao_xi_id: yinYongId }),
    async () => {
      await faSongHaoYouXiaoXi(haoYouId, wenBen, miDengJian, undefined, {
        beiYongXiaoXiId: yinYongId,
      })
      quXiaoYinYong()
    },
  )
}

function xinShengWenBenJian(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

async function faSong() {
  const wenBen = shuRuNeiRong.value.trim()
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

async function faSongDaiFaTuWen(): Promise<void> {
  if (daiFaKuaiChaoXian()) {
    faSongTiShi.value = huoQuFanYi('duoMeiTi', 'kuaiChaoXian')
    return
  }
  if (faSongZhong.value) return
  faSongZhong.value = true
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
        xiang.mei_ti_lei_bie === BIAO_QING_BAO_MEI_TI_LEI_BIE ? 'biaoqingshu' : 'tupian',
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
  const leGuanXiaoXi = chuangJianLeGuanXiaoXi(benCiJian, {
    lei_xing: leiXing,
    nei_rong: zhengWen,
    mei_ti_id: shouTuKuai?.mei_ti_id ?? null,
    mei_ti_url: shouTuKuai?.mei_ti_url ?? null,
    mei_ti_lei_bie: shouTuKuai?.mei_ti_lei_bie ?? null,
    nei_rong_kuai: chuCanKuai,
    bei_yong_xiao_xi_id: yinYongId,
  })
  zhanShiLeGuanQiPao(leGuanXiaoXi)
  qingKongDaiFaKuai()
  shuRuNeiRong.value = ''
  qingChuCaoGao()
  shouQiZhanKaiDang()
  quXiaoYinYong()
  try {
    await zhiXingFaSong(leGuanXiaoXi, async () => {
      await faSongHaoYouXiaoXi(
        haoYouId,
        zhengWen,
        benCiJian,
        shouTuKuai?.mei_ti_id ? { leiXing, meiTiId: shouTuKuai.mei_ti_id } : undefined,
        { neiRongKuai: tiJiaoKuai, beiYongXiaoXiId: yinYongId },
      )
    })
  } finally {
    faSongZhong.value = false
  }
}

function duQuTiShi(cuoWu: unknown): string {
  return 归一前台错误(cuoWu).lianAiWenAn
}

const MEI_TI_LEI_XING = new Set<string>(MEI_TI_XIAO_XI_LEI_XING)
const TU_PIAN_LEI_XING = new Set<string>(TU_PIAN_XIAO_XI_LEI_XING)
const xiangCeInputRef = ref<HTMLInputElement | null>(null)
const wenJianInputRef = ref<HTMLInputElement | null>(null)
const yuLanURLJi = new Set<string>()
const meiTiChongLaiYiFa = new Set<string>()
let meiTiShiXiaoZaiTu: Promise<void> | null = null

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

function qiPaoWaiKeLeiMing(xiaoXi: HaoYouXiaoXi): string | undefined {
  if (xiaoXi.yi_che_hui) return undefined
  if (xiaoXi.lei_xing === 'yuYin') return 'yuyin-waike'
  if (shiMeiTiXiaoXi(xiaoXi) && !shiXuYaoKuaiXuanRan(xiaoXi as unknown as 消息)) {
    return meiTiWaiKeLeiMing(xiaoXi)
  }
  return undefined
}

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

function huiShouYuLanDiZhi(diZhi: string | null): void {
  if (!diZhi) return
  const rengBeiYinYong = xiaoXiLieBiao.value.some(
    (xiaoXi) =>
      xiaoXi.mei_ti_url === diZhi ||
      (xiaoXi.nei_rong_kuai ?? []).some((kuai) => kuai.mei_ti_url === diZhi),
  )
  if (rengBeiYinYong) return
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(diZhi)
  }
  yuLanURLJi.delete(diZhi)
}

function huiShouYuLanURL(): void {
  for (const diZhi of yuLanURLJi) {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(diZhi)
  }
  yuLanURLJi.clear()
}

function chuLiMeiTiShiXiao(xiaoXi: HaoYouXiaoXi): void {
  if (meiTiChongLaiYiFa.has(xiaoXi.id)) return
  meiTiChongLaiYiFa.add(xiaoXi.id)
  if (meiTiShiXiaoZaiTu) return
  meiTiShiXiaoZaiTu = shuaXin().finally(() => {
    meiTiShiXiaoZaiTu = null
  })
}

const yuLanTuPianLieBiao = ref<string[]>([])
const yuLanXiaBiao = ref<number | null>(null)
const zaiJiaGengZao = ref(false)
const haiYouGengDuoShi = ref(false)

const quanBuTuPianDiZhi = computed(() => {
  const diZhi: string[] = []
  for (const xiaoXi of xiaoXiLieBiao.value) {
    if (xiaoXi.yi_che_hui) continue
    for (const kuai of xiaoXi.nei_rong_kuai ?? []) {
      if (kuai.lei_xing === 'tupian' && kuai.mei_ti_url) diZhi.push(kuai.mei_ti_url)
    }
    if (shiTuPianXiaoXi(xiaoXi) && xiaoXi.mei_ti_url) diZhi.push(xiaoXi.mei_ti_url)
  }
  return diZhi
})

function daKaiTuPianYuLan(diZhi?: string | null): void {
  if (!diZhi) return
  const quanBu = quanBuTuPianDiZhi.value
  const suoYin = quanBu.indexOf(diZhi)
  yuLanTuPianLieBiao.value = suoYin >= 0 ? quanBu : [diZhi]
  yuLanXiaBiao.value = suoYin >= 0 ? suoYin : 0
}

function guanBiTuPianYuLan(): void {
  yuLanXiaBiao.value = null
}

const biaoQingMianBanZhanKai = ref(false)
const gengDuoMianBanZhanKai = ref(false)
const dingZaiDiBu = ref(true)
const biaoQingMianBanRongQi = { shuRuNeiRong, xiaoxiQuYuRef, dingZaiDiBu }
const youKeFaSong = computed(
  () => (shuRuNeiRong.value.trim().length > 0 || daiFaYouTuPian.value) && !faSongZhong.value,
)

function qieHuanBiaoQingMianBan(): void {
  biaoQingMianBanZhanKai.value = !biaoQingMianBanZhanKai.value
  if (biaoQingMianBanZhanKai.value) gengDuoMianBanZhanKai.value = false
}

function qieHuanGengDuoMianBan(): void {
  gengDuoMianBanZhanKai.value = !gengDuoMianBanZhanKai.value
  if (gengDuoMianBanZhanKai.value) biaoQingMianBanZhanKai.value = false
}

async function faSongBiaoQingBao(biaoQing: BiaoQingXiang): Promise<void> {
  biaoQingMianBanZhanKai.value = false
  if (!(await queRenTuPianShouQuan())) {
    jiuDiTiShi(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
    return
  }
  const benCiJian = xinShengWenBenJian()
  await zhiXingFaSong(
    chuangJianLeGuanXiaoXi(benCiJian, {
      lei_xing: 'biaoQingBao',
      nei_rong: '',
      mei_ti_id: biaoQing.mei_ti_id,
      mei_ti_url: biaoQing.mei_ti_url,
      mei_ti_lei_bie: BIAO_QING_BAO_MEI_TI_LEI_BIE,
      mei_ti_yuan_shi_wen_jian_ming: biaoQing.duan_ming || null,
    }),
    async () => {
      await faSongHaoYouXiaoXi(haoYouId, '', benCiJian, {
        leiXing: 'biaoQingBao',
        meiTiId: biaoQing.mei_ti_id,
      })
    },
  )
}

async function jiaRuDaiFaTieZhi(tieZhi: BiaoQingBaoDingYi): Promise<void> {
  biaoQingMianBanZhanKai.value = false
  gengDuoMianBanZhanKai.value = false
  try {
    const blob = await xuanRanBiaoQingBao(tieZhi.emoji, tieZhi.wenZi)
    const wenJian = new File([blob], `${tieZhi.id}.png`, { type: blob.type || 'image/png' })
    const jieGuo = chaRuDaiFaTuPian(wenJian, BIAO_QING_BAO_MEI_TI_LEI_BIE)
    if (jieGuo.yuanYin === 'chao_xian') jiuDiTiShi(huoQuFanYi('duoMeiTi', 'kuaiChaoXian'))
  } catch {
    jiuDiTiShi(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'))
  }
}

function chuLiXiaoXiGunDong(): void {
  dingZaiDiBu.value = shiZaiDiBu()
  if (weiDuXinShu.value > 0 && dingZaiDiBu.value) weiDuXinShu.value = 0
  if (xiaoxiQuYuRef.value && xiaoxiQuYuRef.value.scrollTop <= XIAO_XI_PEI_ZHI.dingBuYuZhiXiangSu) {
    void jiaZaiGengZao()
  }
}

async function jiaZaiGengZao(): Promise<void> {
  if (zaiJiaGengZao.value || !haiYouGengDuoShi.value) return
  const rongQi = xiaoxiQuYuRef.value
  if (!rongQi) return
  const zuiZao = xiaoXiLieBiao.value.find((xiaoXi) => !xiaoXi.id.startsWith(LE_GUAN_QIAN_ZHUI))
  if (!zuiZao) return
  zaiJiaGengZao.value = true
  const juDiDiBu = rongQi.scrollHeight - rongQi.scrollTop
  try {
    const ye = await huoQuHaoYouXiaoXi(haoYouId, XIAO_XI_PEI_ZHI.haoYouXiaoXiZuiDaTiaoShu, {
      shi_jian_chuo: zuiZao.shi_jian_chuo,
      id: zuiZao.id,
    })
    const yiCunId = new Set(xiaoXiLieBiao.value.map((xiaoXi) => xiaoXi.id))
    const xinZeng = ye.lieBiao.filter((xiaoXi) => !yiCunId.has(xiaoXi.id))
    if (xinZeng.length > 0) {
      xiaoXiLieBiao.value = [...xinZeng, ...xiaoXiLieBiao.value]
      await nextTick()
      rongQi.scrollTop = Math.max(0, rongQi.scrollHeight - juDiDiBu)
    }
    haiYouGengDuoShi.value = ye.haiYouGengDuo
  } catch {
    /* 加载更早失败保留当前列表，下次滚到顶再试 */
  } finally {
    zaiJiaGengZao.value = false
  }
}

function dianJiXinXiaoXi(): void {
  weiDuXinShu.value = 0
  gunDongDaoDiBu()
}

async function faSongHaoYouMeiTiXiaoXi(
  leiXing: string,
  leiBie: HaoYouShangChuanLeiBie,
  wenJian: File | Blob,
  wenJianMing: string,
  miDengJian?: string,
  yiYouYuLanURL?: string | null,
): Promise<boolean> {
  faSongTiShi.value = ''
  const yunXu = await queRenTuPianShouQuan()
  if (!yunXu) {
    faSongTiShi.value = huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi')
    return false
  }
  const benCiJian = miDengJian || xinShengWenBenJian()
  const benDiYuLan = yiYouYuLanURL ?? chuangJianYuLanURL(wenJian)
  const yinYongId = yinYongXiaoXi.value?.id ?? null
  const leGuanXiaoXi = chuangJianLeGuanXiaoXi(`mei-ti-${benCiJian}`, {
    lei_xing: leiXing,
    nei_rong: '',
    mei_ti_url: benDiYuLan,
    mei_ti_lei_bie: leiBie,
    mei_ti_yuan_shi_wen_jian_ming: wenJianMing || null,
    mei_ti_da_xiao_zi_jie: typeof wenJian.size === 'number' ? wenJian.size : null,
    bei_yong_xiao_xi_id: yinYongId,
  })
  return zhiXingFaSong(leGuanXiaoXi, async () => {
    const shangChuan = await shangChuanHaoYouMeiTi(haoYouId, wenJian, leiBie)
    await faSongHaoYouXiaoXi(
      haoYouId,
      '',
      benCiJian,
      { leiXing, meiTiId: shangChuan.mediaId },
      { beiYongXiaoXiId: yinYongId },
    )
    quXiaoYinYong()
  })
}

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

const { shuRuKuangZhanKai, shouQiZhanKaiDang } = use输入区展开档({
  shuRuNeiRong,
  youTuPianKuai: daiFaYouTuPian,
})

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

function jiuDiTiShi(xinXi: string): void {
  faSongTiShi.value = xinXi
}

async function chongQianLieBiaoMeiTiURL(xiaoXi: HaoYouXiaoXi): Promise<string | null> {
  await shuaXin()
  const xinXiang = xiaoXiLieBiao.value.find((yiXiang) => yiXiang.id === xiaoXi.id)
  return xinXiang?.mei_ti_url || null
}

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
  baoCunMeiTi: async (xiaoXi) => {
    if (!baoCunMeiTiXiaoXi(xiaoXi)) jiuDiTiShi(huoQuFanYi('liaoTian', 'baoCunTuPianShiBai'))
  },
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

function duQuShengYinYinLiang(): number | null {
  try {
    return duQuHeChengYinLiang()
  } catch {
    return null
  }
}
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
  huoQuYinLiang: duQuShengYinYinLiang,
})
const {
  shiYuYinBoFangZhong,
  shiYuYinXuanZhong,
  tingZhiYinPinBoFang,
  chuLiYuYinDianJi,
  huoQuBoFangJinDu,
  huoQuBoFangZongMiao,
  tiaoZhuanYuYinJinDu,
} = use语音播放({
  huoQuDiZhi: (xiaoXi) => (xiaoXi as unknown as HaoYouXiaoXi).mei_ti_url || undefined,
  huoQuYinLiang: duQuShengYinYinLiang,
})

function yinYongXiangId(xiaoXi: HaoYouXiaoXi): string {
  return `${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}${xiaoXi.id}`
}

function huoQuXiaoXiGunDongRongQi(): HTMLElement | null {
  return xiaoxiQuYuRef.value
}

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

function huoQuYinYongZhaiYao(muBiao: CaiDanXiaoXi): string {
  return huoQuMeiTiYinYongZhanWei(muBiao.lei_xing) ?? zhengWenZhaiYaoChuKou(muBiao)
}

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

function chuLiChuMoKaiShi(xiaoXi: HaoYouXiaoXi, shiJian: TouchEvent) {
  if (xiaoXi.id.startsWith('le-guan-')) return
  if (xiaoXi.lei_xing === 'yuYin') {
    chuMoKaiShiYuYin(xiaoXi, shiJian)
    return
  }
  if (xiaoXi.lei_xing === 'wenben') {
    chuMoKaiShiWenBen(xiaoXi, shiJian)
    return
  }
  if (shiTuPianXiaoXi(xiaoXi)) {
    chuMoKaiShiTuPian(xiaoXi, shiJian)
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
      haoYouMing.value = 好友仓库.huoQuXianShiMing(haoYou)
      会话标题.sheZhi(haoYouMing.value)
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
  await shuaXin(true)
  lunXunDingShi.value = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    void shuaXin()
  }, XIAO_XI_PEI_ZHI.haoYouLunXunJianGeHaoMiao)
})

onBeforeUnmount(() => {
  会话标题.qingKong()
  if (lunXunDingShi.value !== null) {
    window.clearInterval(lunXunDingShi.value)
    lunXunDingShi.value = null
  }
  tingZhiYinPinBoFang()
  huiShouYuLanURL()
  yinXiaBiaoQingTiShi()
})
</script>

<style scoped>
.liaotian-yemian {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--beijing-zhuse);
}

.xiaoxi-quyu {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 0;
}
.xiaoxi-xiangmu.chehui-xiaoxi {
  align-self: center;
  justify-content: center;
  width: 100%;
}
.chehui-tishi {
  font-size: 12px;
  color: var(--wenben-tishi);
  text-align: center;
  padding: var(--jiange-4) 0;
}
.fasong-shibai-jiaobiao {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--cuowu-yanse);
  color: var(--fasong-anniu-wenben);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.gujia-gengzao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  padding-bottom: var(--jiange-zhong);
}
.gujia-hang {
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-xiao);
}
.gujia-hang.fanxiang {
  flex-direction: row-reverse;
}
.gujia-touxiang {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--touxiang-beijing-moren);
  animation: haoYouGujiaShanshuo 1.2s ease-in-out infinite;
}
.gujia-qiPao {
  height: 44px;
  border-radius: 8px;
  background: var(--touxiang-beijing-moren);
  animation: haoYouGujiaShanshuo 1.2s ease-in-out infinite;
}
.gujia-qiPao-0 { width: 46%; }
.gujia-qiPao-1 { width: 32%; }
.gujia-qiPao-2 { width: 54%; }
@keyframes haoYouGujiaShanshuo {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
.xin-xiaoxi-fubiao {
  position: absolute;
  right: var(--jiange-zhong);
  bottom: calc(var(--jiange-da) + var(--anquan-quyu-xia));
  z-index: var(--ceng-caidan);
  padding: var(--jiange-6) var(--jiange-12);
  border: 0.5px solid var(--biankuang-yanse);
  border-radius: 999px;
  background: var(--daohanglan-beijing);
  color: var(--zhuse);
  font-size: 12px;
  box-shadow: 0 2px 8px var(--yinying-yanse);
  cursor: pointer;
}
.shuru-quyu {
  background: var(--shuru-quyu-beijing);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  padding: var(--jiange-xiao) var(--jiange-10);
  padding-bottom: calc(var(--jiange-xiao) + var(--anquan-quyu-xia));
}
.shuru-rongqi {
  
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}

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
.meiti-rukou.huoyue {
  color: var(--zhuse);
  border-color: var(--zhuse);
}
.gengduo-mianban {
  display: flex;
  gap: var(--jiange-xiao);
  padding: var(--jiange-xiao) var(--jiange-zhong);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  background: var(--beijing-ciuse);
}
.gengduo-rukou {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-4);
  width: 76px;
  padding: var(--jiange-xiao) var(--jiange-6);
  border: 1px solid var(--biankuang-yanse);
  border-radius: 8px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  cursor: pointer;
}
.gengduo-rukou svg {
  width: var(--shuru-tubiao-glyph-chicun);
  height: var(--shuru-tubiao-glyph-chicun);
}
.mianban-zhankai-enter-active,
.mianban-zhankai-leave-active {
  transition: max-height 0.2s var(--quxian-biao-zhun), opacity 0.2s var(--quxian-biao-zhun);
  overflow: hidden;
}
.mianban-zhankai-enter-from,
.mianban-zhankai-leave-to {
  max-height: 0;
  opacity: 0;
}

.meiti-rukou svg { width: var(--shuru-tubiao-glyph-chicun); height: var(--shuru-tubiao-glyph-chicun); }
.yincang-wenjian-shuru { display: none; }

.tupian-qipao {
  display: block;
  width: 100%;
  max-height: var(--tuwen-tu-zuida-gao);
  border-radius: 6px;
  object-fit: cover;
  background: var(--beijing-kaopian);
  cursor: zoom-in;
}

.fasong-anniu {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: var(--shuru-kuang-shang-xia-neidian) calc(var(--jiange-12) + var(--jiange-2));
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
  margin: var(--jiange-6) var(--jiange-2) 0;
  font-size: 12px;
  color: var(--cuowu-yanse, #ff6b6b);
}

.tuwen-kuai--tu { display: block; }
.tuwen-kuai-tu {
  display: block;
  max-width: var(--tuwen-tu-zuidakuan);
  max-height: var(--tuwen-tu-zuida-gao);
  border-radius: 6px;
  object-fit: cover;
  cursor: zoom-in;
}
.tuwen-kuai-tu--biaoqingbao {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  max-width: var(--duomeiti-biaoqingbao-chicun);
  max-height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
}
.yuyin-zhuanwenzi {
  display: block;
  margin-top: var(--jiange-4);
  padding: var(--jiange-6) var(--jiange-xiao);
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
.yuyin-zhuanwenzi-shibai {
  background: transparent;
  color: var(--cuowu-wenben);
  cursor: default;
}
.yonghu-xiaoxi .yuyin-zhuanwenzi-shibai,
.jiaose-xiaoxi .yuyin-zhuanwenzi-shibai {
  background: transparent;
  color: var(--cuowu-wenben);
}
.yuyin-zhuanwenzi-zhuangtai {
  margin-top: var(--jiange-4);
  font-size: 12px;
  color: var(--wenben-tishi);
}

.zhezhao-xianshi-enter-active { transition: opacity 0.25s ease; }
.zhezhao-xianshi-leave-active { transition: opacity 0.15s ease; }
.zhezhao-xianshi-enter-from,
.zhezhao-xianshi-leave-to { opacity: 0; }
</style>
