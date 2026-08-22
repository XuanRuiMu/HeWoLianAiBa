<template>
  <div class="liaotian-yemian">
    <main ref="xiaoxiQuYuRef" class="xiaoxi-quyu weixin-beijing" @scroll="chuLiGunDong">
      <div v-if="聊天仓库.haiYouGengDuo && !fuPanMoShi" class="jiazaigengduo-qu">
        <button
          class="jiazaigengduo-anniu"
          :disabled="聊天仓库.jiaZaiGengDuoZhong"
          @click="jiaZaiGengDuo"
        >
          {{
            聊天仓库.jiaZaiGengDuoZhong
              ? huoQuFanYi('liaoTian', 'jiaZaiZhong')
              : huoQuFanYi('liaoTian', 'jiaZaiGengDuo')
          }}
        </button>
      </div>
      <TransitionGroup name="xiaoxi-guodu" tag="div" class="xiaoxi-liebiao">
        <template v-for="(zu, suoYin) in xiaoXiFenZu" :key="'zu-' + suoYin">
          <div class="shijian-biaoqian">
            {{ zu.shiJian }}
          </div>
          <template v-for="xiaoXi in zu.xiaoXiLieBiao" :key="xiaoXi.ke_hu_duan_id || xiaoXi.id">
            <div
              v-if="xiaoXi.lei_xing !== 'neiXinHuoDong'"
              class="xiaoxi-xiangmu"
              :class="{
                'yonghu-xiaoxi': xiaoXi.fa_song_zhe_lei_xing === 'yonghu',
                'jiaose-xiaoxi':
                  xiaoXi.fa_song_zhe_lei_xing === 'jiaose' && !shiXiTongXiaoXi(xiaoXi),
                'xitong-xiaoxi': shiXiTongXiaoXi(xiaoXi),
                'chehui-xiaoxi': xiaoXi.yi_che_hui,
              }"
              @contextmenu.prevent="fuPanMoShi ? null : daKaiCaiDan(xiaoXi, $event)"
              @touchstart="fuPanMoShi ? null : chuMoKaiShi(xiaoXi)"
              @touchend="chuMoJieShu"
              @touchmove="chuMoJieShu"
            >
              <template v-if="xiaoXi.yi_che_hui">
                <div class="chehui-tishi">
                  {{ xiaoXi.nei_rong }}
                </div>
              </template>
              <template v-else-if="shiXiTongXiaoXi(xiaoXi)">
                <div class="xitong-neirong">
                  {{ xiaoXi.nei_rong }}
                </div>
              </template>
              <template v-else>
                <div
                  v-if="xiaoXi.fa_song_zhe_lei_xing === 'jiaose'"
                  class="xiaoxi-touxiang jiaose-touxiang-xiaoxi"
                >
                  <img
                    v-if="shiTuPianDiZhi(聊天仓库.jiaoSeXinXi?.tou_xiang)"
                    :src="聊天仓库.jiaoSeXinXi?.tou_xiang || undefined"
                    class="touxiang-tu"
                    alt=""
                  />
                  <span v-else class="touxiang-moren-xiaoxi">{{
                    聊天仓库.jiaoSeXinXi?.tou_xiang || '👤'
                  }}</span>
                </div>
                <div
                  v-if="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'"
                  class="xiaoxi-touxiang yonghu-touxiang-xiaoxi"
                >
                  <img
                    v-if="shiTuPianDiZhi(用户仓库.dangQianYongHu?.tou_xiang)"
                    :src="用户仓库.dangQianYongHu?.tou_xiang || undefined"
                    class="touxiang-tu"
                    alt=""
                  />
                  <span v-else class="touxiang-moren-xiaoxi">{{
                    用户仓库.dangQianYongHu?.tou_xiang || '🧑'
                  }}</span>
                </div>
                <button
                  v-if="!fuPanMoShi && xianShiCheHuiAnNiu(xiaoXi)"
                  class="chehui-anniu"
                  @click.stop="zhiXingCheHuiXiaoXi(xiaoXi)"
                >
                  {{ huoQuFanYi('liaoTian', 'cheHui') }}
                </button>
                <div v-if="xiaoXi.lei_xing === 'tuPian'" class="qipao-waike tupian-waike">
                  <button
                    class="tupian-qipao"
                    :aria-label="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
                    @click.stop="daKaiTuPianYuLan(xiaoXi)"
                  >
                    <span v-if="!shiTuPianYiJiaZai(xiaoXi)" class="tupian-gujia" />
                    <img
                      class="tupian-xianshi"
                      :class="{ 'yincang-tu': !shiTuPianYiJiaZai(xiaoXi) }"
                      :src="huoQuXiaoXiMeiTiURL(xiaoXi)"
                      alt=""
                      @load="biaoJiTuPianYiJiaZai(xiaoXi)"
                    />
                  </button>
                </div>
                <div
                  v-else-if="xiaoXi.lei_xing === 'biaoQingBao'"
                  class="qipao-waike biaoqingbao-waike"
                >
                  <img class="biaoqingbao-tu" :src="huoQuXiaoXiMeiTiURL(xiaoXi)" alt="" />
                </div>
                <div v-else-if="xiaoXi.lei_xing === 'yuYin'" class="qipao-waike yuyin-waike">
                  <button
                    class="yuyin-qipao"
                    :class="{ bofangzhong: shiYuYinBoFangZhong(xiaoXi) }"
                    :style="yuYinKuanYangShi(xiaoXi)"
                    :aria-label="
                      shiYuYinBoFangZhong(xiaoXi)
                        ? huoQuFanYi('duoMeiTi', 'zanTingYuYin')
                        : huoQuFanYi('duoMeiTi', 'boFangYuYin')
                    "
                    @click.stop="qieHuanYuYinBoFang(xiaoXi)"
                  >
                    <span class="boxing-zu" aria-hidden="true">
                      <span
                        v-for="tiao in YU_YIN_BO_XING_TIAO_SHU"
                        :key="tiao"
                        class="boxing-tiao"
                      />
                    </span>
                    <span class="yuyin-shichang">{{ geShiHuaYuYinShiChang(xiaoXi) }}</span>
                  </button>
                </div>
                <div v-else-if="xiaoXi.lei_xing === 'wenJian'" class="qipao-waike wenjian-waike">
                  <div class="wenjian-qipao">
                    <span class="wenjian-tubiao" aria-hidden="true">
                      <svg
                        v-if="huoQuWenJianTuBiaoLeiXing(xiaoXi) === 'pdf'"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <text
                          x="12"
                          y="17"
                          text-anchor="middle"
                          font-size="6"
                          stroke="none"
                          fill="currentColor"
                        >
                          PDF
                        </text>
                      </svg>
                      <svg
                        v-else-if="huoQuWenJianTuBiaoLeiXing(xiaoXi) === 'yasuo'"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M21 8v13H3V8" />
                        <path d="M1 3h22v5H1z" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                      </svg>
                      <svg
                        v-else-if="huoQuWenJianTuBiaoLeiXing(xiaoXi) === 'yinshipin'"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      <svg
                        v-else
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                    </span>
                    <span class="wenjian-xinxi">
                      <span class="wenjian-ming">{{ geShiHuaWenJianMing(xiaoXi) }}</span>
                      <span v-if="huoQuWenJianDaXiaoWenBen(xiaoXi)" class="wenjian-daxiao">{{
                        huoQuWenJianDaXiaoWenBen(xiaoXi)
                      }}</span>
                    </span>
                    <a
                      class="wenjian-xiazai"
                      :href="huoQuXiaoXiMeiTiURL(xiaoXi)"
                      :download="huoQuWenJianMing(xiaoXi)"
                      :aria-label="huoQuFanYi('duoMeiTi', 'xiaZaiWenJian')"
                      :title="huoQuFanYi('duoMeiTi', 'xiaZaiWenJian')"
                      @click.stop
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
                <div v-else class="qipao-waike">
                  <div class="qipao-neirong">
                    {{ xiaoXi.nei_rong }}
                  </div>
                </div>
                <div
                  v-if="
                    !fuPanMoShi && xiaoXi.fa_song_zhong && xiaoXi.fa_song_zhe_lei_xing === 'yonghu'
                  "
                  class="fasong-zhuangtai"
                  :aria-label="huoQuFaSongZhuangTaiTiShi(xiaoXi)"
                >
                  <span class="fasong-zhuangtai-zhuanquan" />
                </div>
              </template>
            </div>
            <template
              v-for="piZhuXiang in [huoQuPiZhuByXiaoXiId(xiaoXi.ke_hu_duan_id || xiaoXi.id)]"
              :key="'pizhu-' + (piZhuXiang?.xu_hao ?? '')"
            >
              <div
                v-if="
                  fuPanMoShi && piZhuXiang && !xiaoXi.yi_che_hui && xiaoXi.lei_xing !== 'xitong'
                "
                class="fupan-pizhu-xiangmu"
                :class="{
                  'yonghu-pizhu': xiaoXi.fa_song_zhe_lei_xing === 'yonghu',
                  'jiaose-pizhu': xiaoXi.fa_song_zhe_lei_xing === 'jiaose',
                  'pizhu-positive': huoQuQingGanLeiXing(piZhuXiang.qing_gan) === 'positive',
                  'pizhu-negative': huoQuQingGanLeiXing(piZhuXiang.qing_gan) === 'negative',
                  'pizhu-neutral': huoQuQingGanLeiXing(piZhuXiang.qing_gan) === 'neutral',
                }"
              >
                <div class="fupan-pizhu-qipao">
                  <span class="fupan-pizhu-biaoqian">{{
                    huoQuFanYi('zhanJi', 'fuPanPiZhuBiaoQian')
                  }}</span>
                  <span class="fupan-pizhu-neirong">{{ piZhuXiang.nei_rong }}</span>
                </div>
              </div>
            </template>
          </template>
        </template>
      </TransitionGroup>
      <div v-if="fuPanMoShi && fuPanJiaZaiZhong" class="fupan-jiazai-qu">
        <div class="fupan-jiazai-tishi">
          <span class="fupan-jiazai-zhuanquan" />
          <span>{{ huoQuFanYi('zhanJi', 'fuPanShengChengZhong') }}</span>
        </div>
      </div>
      <div
        v-if="fuPanMoShi && !fuPanJiaZaiZhong && fuPanZongJie"
        class="fupan-zongjie-qu"
        :class="{ 'you-fen-kuai': fuPanZongJieFenKuai }"
      >
        <div class="fupan-zongjie-biaoti">{{ huoQuFanYi('zhanJi', 'fuPanZongJie') }}</div>
        <template v-if="fuPanZongJieFenKuai">
          <div
            v-for="(fenKuai, suoYin) in fuPanZongJieFenKuai"
            :key="'zongjie-' + suoYin"
            class="fupan-zongjie-fenkuai"
            :class="{ 'jinggao-fenkuai': fenKuai.jingGao }"
          >
            <div class="fupan-zongjie-fenkuai-biaoti">
              <span v-if="fenKuai.jingGao" class="jinggao-tubiao">⚠</span>
              <span>{{ fenKuai.biaoTi }}</span>
            </div>
            <div class="fupan-zongjie-fenkuai-neirong">{{ fenKuai.neiRong }}</div>
          </div>
          <div v-if="fuPanZongJieFenKuai[0]?.jingGao" class="fupan-zongjie-jinggao-tishi">
            {{ huoQuFanYi('zhanJi', 'zhaXingJingGao') }}
          </div>
        </template>
        <div v-else class="fupan-zongjie-neirong">{{ fuPanZongJie }}</div>
      </div>
    </main>

    <footer class="shuru-quyu weixin-shuru">
      <div v-if="fuPanMoShi" class="fupan-dibu-lan">
        <button class="fupan-tuichu-anniu" @click="tuiChuFuPan">
          {{ huoQuFanYi('zhanJi', 'tuiChuFuPan') }}
        </button>
      </div>
      <div v-else-if="liaoTianSuoDing" class="suoding-tishi">
        {{ huoQuFanYi('liaoTian', 'youXiYiJieShu') }}
      </div>
      <div v-else class="shuru-rongqi">
        <button
          class="yuyin-anniu"
          :class="{ huoyue: luYinMoShi }"
          :title="huoQuFanYi('liaoTian', 'yuYin')"
          :aria-label="huoQuFanYi('liaoTian', 'yuYin')"
          @click="qieHuanLuYinMoShi"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        <button
          class="gengduo-plus-anniu"
          :class="{ huoyue: gengDuoMianBanZhanKai }"
          :title="huoQuFanYi('duoMeiTi', 'gengDuo')"
          :aria-label="huoQuFanYi('duoMeiTi', 'gengDuo')"
          @click.stop="qieHuanGengDuoMianBan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <div class="shuru-kuang-waike">
          <textarea
            ref="shuruKuangRef"
            v-model="shuRuNeiRong"
            class="shuru-kuang"
            :class="{ 'zhan-kai': shuRuKuangZhanKai }"
            :style="shuRuKuangYangShi"
            :placeholder="huoQuFanYi('liaoTian', 'shuRuXiaoXi')"
            :maxlength="XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu"
            rows="1"
            @keydown.enter="chuLiShuRuKuangAnJian"
            @focus="chuLiShuRuKuangJuJiao"
            @input="chuLiShuRuBianHua"
          />
        </div>
        <div class="shuru-dibu-hang">
          <span
            class="zifu-jishu"
            :class="{ 'zifu-chaochu': shuRuNeiRong.length > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu }"
          >
            {{ shuRuNeiRong.length }}/{{ XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu }}
          </span>
          <button
            class="zhan-kai-anniu"
            :class="{ 'zhan-kai': shuRuKuangZhanKai }"
            :disabled="!zhanKaiAnNiuKeYong"
            :title="
              shuRuKuangZhanKai
                ? huoQuFanYi('liaoTian', 'zheDie')
                : huoQuFanYi('liaoTian', 'zhanKai')
            "
            :aria-label="
              shuRuKuangZhanKai
                ? huoQuFanYi('liaoTian', 'zheDie')
                : huoQuFanYi('liaoTian', 'zhanKai')
            "
            @click="qieHuanShuRuKuangZhanKai"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        <button
          class="biaoqing-anniu emoji-anniu"
          :class="{ huoyue: emojiMianBanZhanKai }"
          :title="huoQuFanYi('liaoTian', 'biaoQing')"
          :aria-label="huoQuFanYi('liaoTian', 'biaoQing')"
          @click="qieHuanEmojiMianBan"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
        <button
          v-show="!keYiFaSong"
          class="gengduo-gongneng-anniu gaobai-anniu"
          :title="huoQuFanYi('liaoTian', 'gaoBai')"
          :aria-label="huoQuFanYi('liaoTian', 'gaoBai')"
          @click="zhiXingGaoBai"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
        <button v-show="keYiFaSong" class="fasong-anniu" :disabled="!keYiFaSong" @click="faSong">
          {{ huoQuFanYi('liaoTian', 'faSong') }}
        </button>
      </div>
      <div v-if="!fuPanMoShi && 聊天仓库.cuoWuXinXi" class="shuru-fu-zhu">
        <span class="fasong-cuowu">{{ 聊天仓库.cuoWuXinXi }}</span>
      </div>
      <Transition name="emoji-zhankai">
        <div v-show="!fuPanMoShi && emojiMianBanZhanKai" class="emoji-mianban">
          <div class="mianban-tab-hang">
            <button
              class="mianban-tab"
              :class="{ huoyue: emojiTab === 'emoji' }"
              @click.stop="qieHuanEmojiTab('emoji')"
            >
              {{ huoQuFanYi('duoMeiTi', 'emojiBiaoQian') }}
            </button>
            <button
              class="mianban-tab"
              :class="{ huoyue: emojiTab === 'biaoqingbao' }"
              @click.stop="qieHuanEmojiTab('biaoqingbao')"
            >
              {{ huoQuFanYi('duoMeiTi', 'biaoQingBaoBiaoQian') }}
            </button>
          </div>
          <div v-show="emojiTab === 'emoji'" class="emoji-wangge">
            <button
              v-for="emoji in changYongEmoji"
              :key="emoji"
              class="emoji-xiangmu"
              @click="chaRuEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
          <div v-show="emojiTab === 'biaoqingbao'" class="biaoqingbao-wangge">
            <button
              v-for="tieZhi in BIAO_QING_BAO_LIE_BIAO"
              :key="tieZhi.id"
              class="biaoqingbao-xiangmu"
              @click="faSongTieZhi(tieZhi)"
            >
              <span class="biaoqingbao-emoji">{{ tieZhi.emoji }}</span>
              <span class="biaoqingbao-wenzi">{{ tieZhi.wenZi }}</span>
            </button>
          </div>
        </div>
      </Transition>

      <Transition name="emoji-zhankai">
        <div v-show="!fuPanMoShi && gengDuoMianBanZhanKai" class="gengduo-mianban">
          <button class="gengduo-rukou" @click="daKaiXiangCe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>{{ huoQuFanYi('duoMeiTi', 'xiangCe') }}</span>
          </button>
          <button class="gengduo-rukou" @click="daKaiWenJianXuanZe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <span>{{ huoQuFanYi('duoMeiTi', 'wenJian') }}</span>
          </button>
          <button class="gengduo-rukou" @click="faQiGengDuoTongHua('yuYin')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
              />
            </svg>
            <span>{{ huoQuFanYi('duoMeiTi', 'yuYinTongHua') }}</span>
          </button>
          <button class="gengduo-rukou" @click="faQiGengDuoTongHua('shiPin')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>{{ huoQuFanYi('duoMeiTi', 'shiPinTongHua') }}</span>
          </button>
        </div>
      </Transition>

      <input
        ref="xiangCeInputRef"
        class="yincang-wenjian-shuru"
        type="file"
        accept="image/*"
        @change="chuLiXiangCeXuanZe"
      />
      <input
        ref="wenJianInputRef"
        class="yincang-wenjian-shuru"
        type="file"
        :accept="WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN"
        @change="chuLiWenJianXuanZe"
      />
    </footer>

    <Teleport to="body">
      <Transition name="youce-huadong">
        <JunShiZhiDao
          v-if="junShiZhanKai && !fuPanMoShi"
          :jiao-se-id="聊天仓库.jiaoSeXinXi?.id || ''"
          @guan-bi="junShiZhanKai = false"
        />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div
          v-if="youXiShiJianZhanKai"
          class="youxi-zhezhao"
          @click.self="youXiShiJianZhanKai = false"
        >
          <div class="youxi-tanchuang" :class="youXiShiJianLeiXing">
            <div class="youxi-tubiao">
              {{ youXiShiJianLeiXing === 'shengli' ? '🎉' : '💔' }}
            </div>
            <h2 class="youxi-biaoti">
              {{
                youXiShiJianLeiXing === 'shengli'
                  ? huoQuFanYi('liaoTian', 'gongXiTongGuan')
                  : huoQuFanYi('liaoTian', 'gongLueShiBai')
              }}
            </h2>
            <p class="youxi-miaoshu">
              {{ youXiShiJianNeiRong }}
            </p>
            <div class="youxi-anniu-zu">
              <button class="youxi-anniu fanhui" @click="fanhuiShouYe">
                {{ huoQuFanYi('liaoTian', 'fanHuiShouYe') }}
              </button>
              <button class="youxi-anniu chakan" @click="chakanZhanJi">
                {{ huoQuFanYi('liaoTian', 'chaKanZhanJi') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div v-if="cheHuiCaiDanZhanKai" class="chehui-zhezhao" @click="cheHuiCaiDanZhanKai = false">
          <div class="chehui-caidan" :style="cheHuiCaiDanYangShi">
            <button class="chehui-xiangmu" @click="zhiXingCheHui">
              {{ huoQuFanYi('liaoTian', 'cheHui') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <GuanLiJianKong v-if="guanLiJianKongZhanKai" @close="guanLiJianKongZhanKai = false" />
    </Teleport>

    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div v-if="tuPianYuLanURL" class="tupian-yulan-zhezhao" @click.self="guanBiTuPianYuLan">
          <img class="tupian-yulan-da-tu" :src="tuPianYuLanURL" alt="" />
          <button
            class="tupian-yulan-guanbi"
            :aria-label="huoQuFanYi('duoMeiTi', 'guanBiYuLan')"
            @click="guanBiTuPianYuLan"
          >
            ×
          </button>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div v-if="luYinMoShi" class="luyin-zhezhao">
        <div class="luyin-mianban">
          <button
            class="luyin-anzhu-an"
            :class="{ 'zhengzai-luyin': luYinZhong, 'yao-quxiao': luYinShangHuaQuXiao }"
            @pointerdown.prevent="kaiShiLuYin"
            @pointermove="chuLiLuYinYiDong"
            @pointerup.prevent="songKaiLuYin"
            @pointercancel="quXiaoLuYin"
            @touchstart.prevent="kaiShiLuYin"
            @touchmove.prevent
            @touchend.prevent="songKaiLuYin"
            @touchcancel="quXiaoLuYin"
          >
            <span v-if="!luYinZhong">{{ huoQuFanYi('duoMeiTi', 'anZhuShuoHua') }}</span>
            <span v-else-if="luYinShangHuaQuXiao">{{
              huoQuFanYi('duoMeiTi', 'shangHuaQuXiao')
            }}</span>
            <span v-else>{{ huoQuFanYi('duoMeiTi', 'songKaiFaSong') }}</span>
          </button>
          <div v-if="luYinZhong" class="luyin-zhuangtai-hang">
            <span class="boxing-zu luyin-boxing-zu" aria-hidden="true">
              <span
                v-for="tiao in YU_YIN_BO_XING_TIAO_SHU"
                :key="tiao"
                class="boxing-tiao bo-xing-huo"
              />
            </span>
            <span class="luyin-jishi">{{ luYinMiao }}s</span>
          </div>
          <p v-else class="luyin-tishi-wen">{{ huoQuFanYi('duoMeiTi', 'luYinZhong') }}</p>
          <button v-if="!luYinZhong" class="luyin-guanbi-anniu" @click="guanBiLuYinMoShi">
            {{ huoQuFanYi('caidan', 'guanBi') }}
          </button>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <TongHuaJieMian v-if="通话仓库.zhuangTai !== 'kongXian'" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  nextTick,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用通话仓库 } from '@/stores/通话'

import { huoQuFanYi } from '@/config/translations'
import {
  XIAO_XI_PEI_ZHI,
  DUO_MEI_TI_PEI_ZHI,
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
} from '@/config/消息配置'
import { shiTuPianDiZhi } from '@/utils/头像'
import { yaSuoTuPiang } from '@/utils/图片压缩'
import {
  xuanRanBiaoQingBao,
  BIAO_QING_BAO_LIE_BIAO,
  type BiaoQingBaoDingYi,
} from '@/utils/表情包库'
import type { 消息 } from '@/types'
import JunShiZhiDao from '@/components/军师指导.vue'
import GuanLiJianKong from '@/components/管理员监控.vue'
import TongHuaJieMian from '@/components/通话界面.vue'
import { huoQuFuPan, type 复盘批注项 } from '@/api/聊天'

defineOptions({
  name: 'liaoTian',
})

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const 用户仓库 = 使用用户仓库()
const 通话仓库 = 使用通话仓库()

const shuRuNeiRong = ref('')
const faSongZhong = ref(false)
const gaoBaiJinXingZhong = ref(false)
const junShiZhanKai = ref(false)
const youXiShiJianZhanKai = ref(false)
const youXiShiJianLeiXing = ref<'shengli' | 'shibai'>('shengli')
const youXiShiJianNeiRong = ref('')
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const shuruKuangRef = ref<HTMLTextAreaElement | null>(null)
const shuRuKuangZhanKai = ref(false)
const neiRongGaoDu = ref(0)
const danXingGaoDu = ref(32)
const shiKouGaoDu = ref(typeof window !== 'undefined' ? window.innerHeight : 0)
const shuRuKuangKeZhanKai = computed(() => neiRongGaoDu.value > danXingGaoDu.value + 1)
const emojiMianBanZhanKai = ref(false)
const guanLiJianKongZhanKai = ref(false)
const dangQianShiJian = ref(Date.now())
let shiJianGengXinQi: ReturnType<typeof setInterval> | null = null
let yiTongGuoMountedChuShiHua = false

type EmojiTabLeiXing = 'emoji' | 'biaoqingbao'
const emojiTab = ref<EmojiTabLeiXing>('emoji')
const gengDuoMianBanZhanKai = ref(false)
const xiangCeInputRef = ref<HTMLInputElement | null>(null)
const wenJianInputRef = ref<HTMLInputElement | null>(null)
const tuPianJiaZaiJiHe = ref(new Set<string>())
const tuPianYuLanURL = ref<string | null>(null)

const YU_YIN_BO_XING_TIAO_SHU = 12
const LU_YIN_SHANG_HUA_QU_XIAO_JU_LI = 80
const boFangZhongXiaoXiKey = ref<string | null>(null)
let dangQianYinPin: HTMLAudioElement | null = null

const luYinMoShi = ref(false)
const luYinZhong = ref(false)
const luYinMiao = ref(0)
const luYinShangHuaQuXiao = ref(false)
let meiTiLuYinQi: MediaRecorder | null = null
let luYinLiuPian: MediaStream | null = null
let luYinKuaiLieBiao: Blob[] = []
let luYinJiShiQi: ReturnType<typeof setInterval> | null = null
let luYinKaiShiHaoMiao = 0
let luYinQiDianY: number | null = null
let luYinQiBuChuLiZhong = false

const fuPanMoShi = ref(false)
const fuPanPiZhu = ref<复盘批注项[] | null>(null)
const fuPanZongJie = ref<string | null>(null)
const fuPanJiaZaiZhong = ref(false)
const fuPanDangAnId = ref<string | null>(null)
let fuPanQingQiuId = 0

const changYongEmoji = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '🤣',
  '😂',
  '🙂',
  '😊',
  '😇',
  '🥰',
  '😍',
  '🤩',
  '😘',
  '😗',
  '😚',
  '😙',
  '🥲',
  '😋',
  '😛',
  '😜',
  '🤪',
  '😝',
  '🤗',
  '🤭',
  '🤫',
  '🤔',
  '🫡',
  '🤐',
  '🤨',
  '😐',
  '😑',
  '😶',
  '🫥',
  '😏',
  '😒',
  '🙄',
  '😬',
  '😮‍💨',
  '🤥',
  '😌',
  '😔',
  '😪',
  '🤤',
  '😴',
  '😷',
  '🤒',
  '🤕',
  '🤢',
  '🤮',
  '🥵',
  '🥶',
  '🥴',
  '😵',
  '🤯',
  '🤠',
  '🥳',
  '🥸',
  '😎',
  '🤓',
  '🧐',
  '😕',
  '🫤',
  '😟',
  '🙁',
  '☹️',
  '😮',
  '😯',
  '😲',
  '😳',
  '🥺',
  '🥹',
  '😦',
  '😧',
  '😨',
  '😰',
  '😥',
  '😢',
  '😭',
  '😱',
  '😖',
  '😣',
  '😞',
  '😓',
  '😩',
  '😫',
  '🥱',
  '😤',
  '😡',
  '😠',
  '🤬',
  '😈',
  '👿',
  '💀',
  '☠️',
  '💩',
  '🤡',
  '👹',
  '👺',
  '👻',
  '👽',
  '👾',
  '🤖',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '💔',
  '❤️‍🔥',
  '💕',
  '💞',
  '💓',
  '💗',
  '💖',
  '💘',
  '💝',
  '💟',
  '♥️',
  '🫶',
  '👍',
  '👎',
  '👊',
  '✊',
  '🤞',
  '✌️',
  '🤟',
  '🤘',
  '👌',
  '🤌',
  '🤏',
  '👈',
  '👉',
  '👆',
  '👇',
  '☝️',
  '✋',
  '🤚',
  '🖐️',
  '🖖',
  '👋',
  '🤙',
  '💪',
  '🦾',
  '🙏',
  '✍️',
  '💅',
  '🤳',
  '🔥',
  '⭐',
  '🌟',
  '💫',
  '✨',
  '⚡',
  '💥',
  '🎉',
  '🎊',
  '🎈',
  '🎁',
  '🏆',
  '🥇',
  '🎯',
  '🎮',
  '🎲',
]

// 表情面板展开/收起会改变「聊天区 + 输入区」的 grid 行高（行 2 = auto）。
// 若不补偿，面板会直接吃掉聊天区底部约 200px、把底部消息裁掉（表现为「覆盖」）。
// 用 ResizeObserver 监听面板实际高度变化，按「高度增量」同步把聊天区向上滚动相同距离，
// 使面板无论处于何种滚动位置都「顶起」聊天内容而非覆盖；收起时反向恢复原位。
let shangYiEmojiGaoDu = 0
let emojiMianBanGuanChaQi: ResizeObserver | null = null

function chuShiHuaEmojiGunDongBuChang() {
  const mianBan = document.querySelector('.emoji-mianban') as HTMLElement | null
  if (!mianBan) return
  shangYiEmojiGaoDu = mianBan.offsetHeight
  emojiMianBanGuanChaQi = new ResizeObserver(() => {
    const qu = xiaoxiQuYuRef.value
    const ban = document.querySelector('.emoji-mianban') as HTMLElement | null
    if (!qu || !ban) return
    const xinGao = ban.offsetHeight
    const cha = xinGao - shangYiEmojiGaoDu
    if (cha !== 0) qu.scrollTop += cha
    shangYiEmojiGaoDu = xinGao
  })
  emojiMianBanGuanChaQi.observe(mianBan)
}

function qieHuanEmojiMianBan() {
  emojiMianBanZhanKai.value = !emojiMianBanZhanKai.value
}

function chaRuEmoji(emoji: string) {
  shuRuNeiRong.value += emoji
}

function qieHuanEmojiTab(tab: EmojiTabLeiXing) {
  emojiTab.value = tab
}

function xiaoXiKey(xiaoXi: 消息): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

// 系统消息判定：本地事件与通话记录均为 发送者='xitong'（lei_xing 可为 xitong 或 wenben）
function shiXiTongXiaoXi(xiaoXi: 消息): boolean {
  return xiaoXi.lei_xing === 'xitong' || xiaoXi.fa_song_zhe_lei_xing === 'xitong'
}

function huoQuXiaoXiMeiTiURL(xiaoXi: 消息): string | undefined {
  return (xiaoXi.mei_ti_url || xiaoXi.ben_di_yu_lan_url || undefined) as string | undefined
}

function shiTuPianYiJiaZai(xiaoXi: 消息): boolean {
  return tuPianJiaZaiJiHe.value.has(xiaoXiKey(xiaoXi))
}

function biaoJiTuPianYiJiaZai(xiaoXi: 消息) {
  tuPianJiaZaiJiHe.value.add(xiaoXiKey(xiaoXi))
}

function daKaiTuPianYuLan(xiaoXi: 消息) {
  const diZhi = huoQuXiaoXiMeiTiURL(xiaoXi)
  if (!diZhi) return
  tuPianYuLanURL.value = diZhi
}

function guanBiTuPianYuLan() {
  tuPianYuLanURL.value = null
}

const MEI_TI_XIAO_XI_JI_HE = new Set<string>(['tuPian', 'biaoQingBao', 'yuYin', 'wenJian'])

function huoQuFaSongZhuangTaiTiShi(xiaoXi: 消息): string {
  if (MEI_TI_XIAO_XI_JI_HE.has(xiaoXi.lei_xing)) {
    return huoQuFanYi('duoMeiTi', 'shangChuanZhong')
  }
  return huoQuFanYi('liaoTian', 'faSongZhong')
}

function qieHuanGengDuoMianBan() {
  gengDuoMianBanZhanKai.value = !gengDuoMianBanZhanKai.value
  if (gengDuoMianBanZhanKai.value) emojiMianBanZhanKai.value = false
}

function guanBiGengDuoMianBan() {
  gengDuoMianBanZhanKai.value = false
}

async function faQiGengDuoTongHua(leiXing: 'yuYin' | 'shiPin') {
  guanBiGengDuoMianBan()
  const jiaoSeId = 聊天仓库.jiaoSeXinXi?.id
  if (!jiaoSeId) return
  await 通话仓库.faQiTongHua(jiaoSeId, leiXing)
}

function daKaiXiangCe() {
  guanBiGengDuoMianBan()
  xiangCeInputRef.value?.click()
}

function daKaiWenJianXuanZe() {
  guanBiGengDuoMianBan()
  wenJianInputRef.value?.click()
}

async function faSongYaSuoTuPian(wenJian: File | Blob, yuanWenJianMing?: string) {
  if (!聊天仓库.dangQianHuiHuaId) return
  try {
    const yaSuoBlob = await yaSuoTuPiang(wenJian)
    await 聊天仓库.faSongMeiTiXiaoXi('tuPian', yaSuoBlob, {
      wenJianMing: yuanWenJianMing || (wenJian instanceof File ? wenJian.name : ''),
    })
    gunDongDaoDiBu()
  } catch (cuoWu: unknown) {
    聊天仓库.sheZhiCuoWu(
      cuoWu instanceof Error && cuoWu.message
        ? cuoWu.message
        : huoQuFanYi('duoMeiTi', 'yaSuoShiBai'),
    )
  }
}

async function chuLiXiangCeXuanZe(event: Event) {
  const shuRu = event.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  await faSongYaSuoTuPian(wenJian)
}

async function chuLiWenJianXuanZe(event: Event) {
  const shuRu = event.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian || !聊天仓库.dangQianHuiHuaId) return
  await 聊天仓库.faSongMeiTiXiaoXi('wenJian', wenJian)
  gunDongDaoDiBu()
}

async function faSongTieZhi(tieZhi: BiaoQingBaoDingYi) {
  if (!聊天仓库.dangQianHuiHuaId) return
  emojiMianBanZhanKai.value = false
  try {
    const blob = await xuanRanBiaoQingBao(tieZhi.emoji, tieZhi.wenZi)
    await 聊天仓库.faSongMeiTiXiaoXi('biaoQingBao', blob, { wenJianMing: `${tieZhi.id}.png` })
    gunDongDaoDiBu()
  } catch (cuoWu: unknown) {
    聊天仓库.sheZhiCuoWu(
      cuoWu instanceof Error && cuoWu.message
        ? cuoWu.message
        : huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'),
    )
  }
}

function geShiHuaYuYinShiChang(xiaoXi: 消息): string {
  const miao = Math.max(1, Math.round((xiaoXi.mei_ti_shi_chang_hao_miao ?? 0) / 1000))
  return `${miao}″`
}

function yuYinShiChangMiao(xiaoXi: 消息): number {
  return Math.min(
    DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao,
    Math.max(
      DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao,
      Math.round((xiaoXi.mei_ti_shi_chang_hao_miao ?? 0) / 1000),
    ),
  )
}

function shiYuYinBoFangZhong(xiaoXi: 消息): boolean {
  return boFangZhongXiaoXiKey.value === xiaoXiKey(xiaoXi)
}

function yuYinKuanYangShi(xiaoXi: 消息) {
  const { yuYinZuiDuanKuanPx, yuYinZuiChangKuanPx, yuYinZuiDaMiao, yuYinZuiDuanMiao } =
    DUO_MEI_TI_PEI_ZHI
  const miao = yuYinShiChangMiao(xiaoXi)
  const biLi = (miao - yuYinZuiDuanMiao) / Math.max(1, yuYinZuiDaMiao - yuYinZuiDuanMiao)
  const kuanDu = Math.round(yuYinZuiDuanKuanPx + biLi * (yuYinZuiChangKuanPx - yuYinZuiDuanKuanPx))
  return { width: `${kuanDu}px` }
}

function tingZhiYinPinBoFang() {
  if (dangQianYinPin) {
    dangQianYinPin.pause()
    dangQianYinPin.src = ''
    dangQianYinPin = null
  }
  boFangZhongXiaoXiKey.value = null
}

function qieHuanYuYinBoFang(xiaoXi: 消息) {
  const diZhi = huoQuXiaoXiMeiTiURL(xiaoXi)
  if (!diZhi) return
  const jian = xiaoXiKey(xiaoXi)
  if (boFangZhongXiaoXiKey.value === jian) {
    tingZhiYinPinBoFang()
    return
  }
  tingZhiYinPinBoFang()
  const yinPin = new Audio(diZhi)
  yinPin.addEventListener('ended', () => {
    if (dangQianYinPin === yinPin) tingZhiYinPinBoFang()
  })
  dangQianYinPin = yinPin
  boFangZhongXiaoXiKey.value = jian
  Promise.resolve(yinPin.play()).catch(() => {})
}

const WEN_JIAN_KUO_ZHAN_TU_BIAO: Array<{ kuoZhan: string[]; leiXing: string }> = [
  { kuoZhan: ['pdf'], leiXing: 'pdf' },
  { kuoZhan: ['zip', 'rar', '7z'], leiXing: 'yasuo' },
  { kuoZhan: ['mp4', 'mov'], leiXing: 'yinshipin' },
]

function huoQuKuoZhanMing(mingZi?: string | null): string {
  if (!mingZi) return ''
  const dian = mingZi.lastIndexOf('.')
  return dian === -1 ? '' : mingZi.slice(dian + 1).toLowerCase()
}

function huoQuWenJianMing(xiaoXi: 消息): string {
  return (
    xiaoXi.mei_ti_yuan_shi_wen_jian_ming || xiaoXi.nei_rong || huoQuFanYi('duoMeiTi', 'wenJian')
  )
}

function geShiHuaWenJianMing(xiaoXi: 消息): string {
  const ming = huoQuWenJianMing(xiaoXi)
  if (ming.length <= DUO_MEI_TI_PEI_ZHI.wenJianMingZuiDaXianShiZiFu) return ming
  return `${ming.slice(0, DUO_MEI_TI_PEI_ZHI.wenJianMingZuiDaXianShiZiFu)}...`
}

function huoQuWenJianDaXiaoWenBen(xiaoXi: 消息): string {
  const ziJie = xiaoXi.ben_di_da_xiao_zi_jie
  if (!ziJie || ziJie <= 0) return ''
  const MB = 1024 * 1024
  if (ziJie >= MB) return `${(ziJie / MB).toFixed(1)}MB`
  return `${Math.max(1, Math.round(ziJie / 1024))}KB`
}

function huoQuWenJianTuBiaoLeiXing(xiaoXi: 消息): string {
  const kuoZhan = huoQuKuoZhanMing(huoQuWenJianMing(xiaoXi))
  for (const tiaoMu of WEN_JIAN_KUO_ZHAN_TU_BIAO) {
    if (tiaoMu.kuoZhan.includes(kuoZhan)) return tiaoMu.leiXing
  }
  return 'qita'
}

function qieHuanLuYinMoShi() {
  if (luYinZhong.value) return
  luYinMoShi.value = !luYinMoShi.value
}

function guanBiLuYinMoShi() {
  if (luYinZhong.value) return
  luYinMoShi.value = false
}

function qingLiLuYinZiYuan() {
  if (luYinJiShiQi) {
    clearInterval(luYinJiShiQi)
    luYinJiShiQi = null
  }
  meiTiLuYinQi = null
  if (luYinLiuPian) {
    luYinLiuPian.getTracks().forEach((guiDao) => guiDao.stop())
    luYinLiuPian = null
  }
  luYinZhong.value = false
  luYinShangHuaQuXiao.value = false
  luYinQiDianY = null
}

async function wanChengLuYin(faSong: boolean) {
  const luYinQi = meiTiLuYinQi
  if (!luYinQi) {
    qingLiLuYinZiYuan()
    return
  }
  const yongShiHaoMiao = Date.now() - luYinKaiShiHaoMiao
  await new Promise<void>((jieJue) => {
    luYinQi.addEventListener(
      'stop',
      () => {
        jieJue()
      },
      { once: true },
    )
    if (luYinQi.state !== 'inactive') luYinQi.stop()
    else jieJue()
  })
  const kuaiLieBiao = luYinKuaiLieBiao
  const mime = meiTiLuYinQi?.mimeType || luYinQi.mimeType || 'audio/webm'
  qingLiLuYinZiYuan()

  if (!faSong) return
  if (!luYinMoShi.value) luYinMoShi.value = true

  if (yongShiHaoMiao < DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao * 1000) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shuoHuaTaiDuan'))
    luYinMoShi.value = false
    return
  }
  luYinMoShi.value = false
  if (kuaiLieBiao.length === 0) return
  const blob = new Blob(kuaiLieBiao, { type: mime })
  await 聊天仓库.faSongMeiTiXiaoXi('yuYin', blob, {
    shiChangHaoMiao: Math.round(yongShiHaoMiao),
    wenJianMing: `yuyin-${Date.now()}.webm`,
  })
  gunDongDaoDiBu()
}

async function kaiShiLuYin() {
  if (luYinZhong.value || luYinQiBuChuLiZhong) return
  luYinQiBuChuLiZhong = true
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
    luYinQiBuChuLiZhong = false
    return
  }
  let liuPian: MediaStream
  try {
    liuPian = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
    luYinQiBuChuLiZhong = false
    return
  }

  const houXuanMime = ['audio/webm;codecs=opus', 'audio/webm']
  const zhiChiMime =
    houXuanMime.find((mime) => {
      try {
        return MediaRecorder.isTypeSupported(mime)
      } catch {
        return false
      }
    }) || ''

  let luYinQi: MediaRecorder
  try {
    luYinQi = zhiChiMime
      ? new MediaRecorder(liuPian, { mimeType: zhiChiMime })
      : new MediaRecorder(liuPian)
  } catch {
    liuPian.getTracks().forEach((guiDao) => guiDao.stop())
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
    luYinQiBuChuLiZhong = false
    return
  }
  luYinQiBuChuLiZhong = false

  luYinLiuPian = liuPian
  meiTiLuYinQi = luYinQi
  luYinKuaiLieBiao = []
  luYinQi.ondataavailable = (shiJian) => {
    if (shiJian.data && shiJian.data.size > 0) luYinKuaiLieBiao.push(shiJian.data)
  }
  luYinQi.onerror = () => {
    void wanChengLuYin(false).then(() => {
      luYinMoShi.value = false
      聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
    })
  }

  luYinKaiShiHaoMiao = Date.now()
  luYinMiao.value = 0
  luYinZhong.value = true
  luYinShangHuaQuXiao.value = false
  luYinQi.start()

  luYinJiShiQi = setInterval(() => {
    luYinMiao.value = Math.floor((Date.now() - luYinKaiShiHaoMiao) / 1000)
    if (luYinMiao.value >= DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao) {
      songKaiLuYin()
    }
  }, 1000)
}

function songKaiLuYin() {
  if (!luYinZhong.value) return
  void wanChengLuYin(!luYinShangHuaQuXiao.value)
}

function quXiaoLuYin() {
  if (!luYinZhong.value) return
  void wanChengLuYin(false)
}

function chuLiLuYinYiDong(event: PointerEvent) {
  if (!luYinZhong.value) return
  if (luYinQiDianY === null) {
    luYinQiDianY = event.clientY
    return
  }
  luYinShangHuaQuXiao.value = luYinQiDianY - event.clientY > LU_YIN_SHANG_HUA_QU_XIAO_JU_LI
}

// 表情面板展开时，点击页面任意「非表情面板、非表情按钮」区域即收起；更多面板同理
function chuLiWenDangDianJi(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (emojiMianBanZhanKai.value) {
    if (target.closest('.emoji-mianban') || target.closest('.biaoqing-anniu')) return
    emojiMianBanZhanKai.value = false
  }
  if (gengDuoMianBanZhanKai.value) {
    if (target.closest('.gengduo-mianban') || target.closest('.gengduo-plus-anniu')) return
    gengDuoMianBanZhanKai.value = false
  }
}

const cheHuiCaiDanZhanKai = ref(false)
const cheHuiCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
const xuanZhongXiaoXi = ref<消息 | null>(null)
let changAnDingShiQi: ReturnType<typeof setTimeout> | null = null

const liaoTianSuoDing = computed(() => {
  return 聊天仓库.youXiYiJieShu && !聊天仓库.keJiXuLiaoTian
})

const keYiFaSong = computed(() => {
  const neiRong = shuRuNeiRong.value.trim()
  return neiRong.length > 0 && neiRong.length <= XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu
})

// 展开态必须始终保留收起出口：只按「内容是否超过单行」禁用按钮会让状态机变成只进不出
const zhanKaiAnNiuKeYong = computed(() => shuRuKuangZhanKai.value || shuRuKuangKeZhanKai.value)

interface XiaoXiFenZuXiang {
  shiJian: string
  xiaoXiLieBiao: 消息[]
}

const xiaoXiFenZu = computed<XiaoXiFenZuXiang[]>(() => {
  const lieBiao = 聊天仓库.xiaoXiLieBiao
  if (!Array.isArray(lieBiao)) return []

  function zhuanBeiJing(shiJianChuo: number): Date {
    const riQi = new Date(shiJianChuo)
    const utc = riQi.getTime() + riQi.getTimezoneOffset() * 60000
    return new Date(utc + 8 * 3600000)
  }

  function geShiHuaShiJian(beiJing: Date): string {
    const xianZai = zhuanBeiJing(Date.now())
    const shi = String(beiJing.getHours()).padStart(2, '0')
    const fen = String(beiJing.getMinutes()).padStart(2, '0')
    const shiJianBuFen = `${shi}:${fen}`

    const shiFouTongYiTian =
      beiJing.getFullYear() === xianZai.getFullYear() &&
      beiJing.getMonth() === xianZai.getMonth() &&
      beiJing.getDate() === xianZai.getDate()

    if (shiFouTongYiTian) {
      return shiJianBuFen
    }

    const zuoTian = new Date(xianZai.getTime() - 24 * 3600000)
    const shiFouZuoTian =
      beiJing.getFullYear() === zuoTian.getFullYear() &&
      beiJing.getMonth() === zuoTian.getMonth() &&
      beiJing.getDate() === zuoTian.getDate()

    if (shiFouZuoTian) {
      return `${huoQuFanYi('shiJian', 'zuoTian')} ${shiJianBuFen}`
    }

    const benZhouKaiShi = new Date(xianZai.getTime())
    benZhouKaiShi.setDate(xianZai.getDate() - xianZai.getDay() + 1)
    benZhouKaiShi.setHours(0, 0, 0, 0)
    const zaiBenZhou = beiJing.getTime() >= benZhouKaiShi.getTime()

    if (zaiBenZhou) {
      const xingQiLieBiao = [
        huoQuFanYi('shiJian', 'xingQiRi'),
        huoQuFanYi('shiJian', 'xingQiYi'),
        huoQuFanYi('shiJian', 'xingQiEr'),
        huoQuFanYi('shiJian', 'xingQiSan'),
        huoQuFanYi('shiJian', 'xingQiSi'),
        huoQuFanYi('shiJian', 'xingQiWu'),
        huoQuFanYi('shiJian', 'xingQiLiu'),
      ]
      return `${xingQiLieBiao[beiJing.getDay()]} ${shiJianBuFen}`
    }

    if (beiJing.getFullYear() === xianZai.getFullYear()) {
      const yue = String(beiJing.getMonth() + 1).padStart(2, '0')
      const ri = String(beiJing.getDate()).padStart(2, '0')
      return `${yue}-${ri} ${shiJianBuFen}`
    }

    const nian = beiJing.getFullYear()
    const yue = String(beiJing.getMonth() + 1).padStart(2, '0')
    const ri = String(beiJing.getDate()).padStart(2, '0')
    return `${nian}-${yue}-${ri} ${shiJianBuFen}`
  }

  const jieGuo: XiaoXiFenZuXiang[] = []
  let shangYiGeShiJianChuo: number | null = null

  for (const xiaoXi of lieBiao) {
    const beiJing = zhuanBeiJing(xiaoXi.shi_jian_chuo)
    const xuYaoXinBiaoQian =
      shangYiGeShiJianChuo === null ||
      xiaoXi.shi_jian_chuo - shangYiGeShiJianChuo > XIAO_XI_PEI_ZHI.heBingShiJianYuZhi

    if (xuYaoXinBiaoQian) {
      jieGuo.push({
        shiJian: geShiHuaShiJian(beiJing),
        xiaoXiLieBiao: [xiaoXi],
      })
      shangYiGeShiJianChuo = xiaoXi.shi_jian_chuo
    } else {
      jieGuo[jieGuo.length - 1].xiaoXiLieBiao.push(xiaoXi)
    }
  }

  return jieGuo
})

const xiaoXiDaoXuHaoMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  if (!fuPanMoShi.value) return map
  const lieBiao = 聊天仓库.xiaoXiLieBiao
  if (!Array.isArray(lieBiao)) return map
  let xuHao = 0
  for (const xiaoXi of lieBiao) {
    if (xiaoXi.fa_song_zhe_lei_xing === 'xitong' || xiaoXi.lei_xing === 'xitong') continue
    xuHao += 1
    const key = xiaoXi.ke_hu_duan_id || xiaoXi.id
    if (key) map.set(key, xuHao)
  }
  return map
})

const piZhuMap = computed<Map<number, PiZhuXiang>>(() => {
  const map = new Map<number, PiZhuXiang>()
  if (!fuPanPiZhu.value) return map
  for (const xiang of fuPanPiZhu.value) {
    if (typeof xiang.xu_hao === 'number' && typeof xiang.ping_lun === 'string') {
      map.set(xiang.xu_hao, {
        xu_hao: xiang.xu_hao,
        nei_rong: xiang.ping_lun,
        qing_gan: typeof xiang.qing_gan === 'string' ? xiang.qing_gan : undefined,
      })
    }
  }
  return map
})

function huoQuPiZhuByXiaoXiId(xiaoXiId: string): PiZhuXiang | null {
  const xuHao = xiaoXiDaoXuHaoMap.value.get(xiaoXiId)
  if (!xuHao) return null
  return piZhuMap.value.get(xuHao) || null
}

interface PiZhuXiang {
  xu_hao: number
  nei_rong: string
  qing_gan?: string
}

interface ZongJieFenKuai {
  biaoTi: string
  neiRong: string
  jingGao: boolean
}

function huoQuQingGanLeiXing(qingGan?: string): 'positive' | 'negative' | 'neutral' {
  if (!qingGan) return 'neutral'
  const zhi = qingGan.trim().toLowerCase()
  if (zhi === 'positive' || zhi === '积极') return 'positive'
  if (zhi === 'negative' || zhi === '消极') return 'negative'
  return 'neutral'
}

const fuPanZongJieFenKuai = computed<ZongJieFenKuai[] | null>(() => {
  if (!fuPanZongJie.value) return null
  const wenBen = fuPanZongJie.value.trim()
  if (!wenBen) return null

  const ziDuanMingChen = [
    huoQuFanYi('zhanJi', 'duiXiangLeiXing'),
    huoQuFanYi('zhanJi', 'yongHuBiaoXian'),
    huoQuFanYi('zhanJi', 'guanJianZhuanZheDian'),
    huoQuFanYi('zhanJi', 'gaiJinJianYi'),
  ]

  const youZiDuan = ziDuanMingChen.some(
    (ming) => wenBen.includes(ming + '：') || wenBen.includes(ming + ':'),
  )
  if (!youZiDuan) return null

  const hangLie = wenBen
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
  const jieGuo: ZongJieFenKuai[] = []
  let dangQianBiaoTi = ''
  let dangQianNeiRong = ''

  function yaRuDangQian(): void {
    if (!dangQianBiaoTi) return
    jieGuo.push({
      biaoTi: dangQianBiaoTi,
      neiRong: dangQianNeiRong.trim(),
      jingGao:
        dangQianBiaoTi === huoQuFanYi('zhanJi', 'duiXiangLeiXing') &&
        dangQianNeiRong.includes(huoQuFanYi('zhanJi', 'zhaXing')),
    })
  }

  for (const hang of hangLie) {
    const piPeiMing = ziDuanMingChen.find(
      (ming) => hang.startsWith(ming + '：') || hang.startsWith(ming + ':'),
    )
    if (piPeiMing) {
      yaRuDangQian()
      dangQianBiaoTi = piPeiMing
      const qianZhui = hang.startsWith(piPeiMing + '：') ? piPeiMing + '：' : piPeiMing + ':'
      dangQianNeiRong = hang.slice(qianZhui.length).trim()
    } else if (dangQianBiaoTi) {
      dangQianNeiRong += '\n' + hang
    }
  }
  yaRuDangQian()

  return jieGuo.length > 0 ? jieGuo : null
})

// 用户是否停留在消息区底部：向上浏览时取消跟随，回到底部附近才恢复
const yiDingZaiDiBu = ref(true)
const DING_BUYu_Zhi_PX = 40

function gengXinDingBuZhuangTai() {
  const el = xiaoxiQuYuRef.value
  if (!el) return
  const juDiJuLi = el.scrollHeight - el.scrollTop - el.clientHeight
  yiDingZaiDiBu.value = juDiJuLi < DING_BUYu_Zhi_PX
}

function gunDongDaoDiBu() {
  nextTick(() => {
    if (xiaoxiQuYuRef.value) {
      xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
    }
  })
}

function huaDongShuRuLanKeJian() {
  nextTick(() => {
    setTimeout(() => {
      if (xiaoxiQuYuRef.value) {
        xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
      }
    }, 50)
  })
}

function chuLiShiJiaoKouBianHua() {
  if (!window.visualViewport) return
  const shiJiaoKouGaoDu = window.visualViewport.height
  const buJuGaoDu = window.innerHeight
  const jianPanPianYi = Math.max(0, buJuGaoDu - shiJiaoKouGaoDu)
  // 仅当用户原本就在底部附近时才把最新消息顶入视口；用户正在阅读历史时，
  // 软键盘弹出或切后台回前台带来的视口高度变化都不得强制拽回底部（保留查看位置）
  if (jianPanPianYi > 80 && yiDingZaiDiBu.value) {
    huaDongShuRuLanKeJian()
  }
}

// 切后台再回前台：仅按真实滚动位置刷新「是否钉在底部」标志，绝不主动回底，保留用户查看位置
// 录音中切后台/离开页面：立即丢弃录音并释放麦克风（避免后台持续占用与误发送）
function chuLiYeMianKeJianXing() {
  if (document.visibilityState === 'visible') {
    gengXinDingBuZhuangTai()
    return
  }
  if (luYinZhong.value) {
    void wanChengLuYin(false).then(() => {
      luYinMoShi.value = false
    })
  }
}

function chuLiShuRuKuangJuJiao() {
  emojiMianBanZhanKai.value = false
  // 仅在用户原本就在底部附近时跟随到底；切后台回前台后输入框恢复焦点（触发 focus）若强行回底会丢失历史查看位置
  if (yiDingZaiDiBu.value) huaDongShuRuLanKeJian()
}

watch(
  () => (Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao.length : 0),
  () => {
    // 仅当用户停留在底部时才跟随滚动；向上浏览历史时保持当前位置
    if (yiDingZaiDiBu.value) gunDongDaoDiBu()
  },
)

watch(
  () => 聊天仓库.youXiShiJian,
  (shiJian) => {
    if (!shiJian) return
    const shengLiLeiXing = [
      'shengLi',
      'biaoBaiChengGong',
      'aiZhuDongBiaoBai',
      'huShanShengLi',
      'zhaXingTaoTuo',
      'taoTuo',
      'sheng_li_ai_qing',
      'sheng_li_hu_shan_sheng_li',
      'sheng_li_shi_po',
    ]
    if (shengLiLeiXing.includes(shiJian.lei_xing)) {
      youXiShiJianLeiXing.value = 'shengli'
    } else {
      youXiShiJianLeiXing.value = 'shibai'
    }
    youXiShiJianNeiRong.value = shiJian.xiao_xi
    youXiShiJianZhanKai.value = true
  },
)

watch(() => shuRuNeiRong.value, ceLiangShuRuKuang, { flush: 'post' })

// 内容高度回落到单行后展开态已失去依据，必须自动退出，否则展开态只能靠发送/离开页面才能解除。
// neiRongGaoDu 由 height:auto 实测得到，与展开态无关；展开态仅改变滚动条样式且此时不溢出，
// 故该判据不会被自身状态反馈影响，配合 danXingGaoDu + 1 的 1px 容差不会在临界高度横跳
watch(shuRuKuangKeZhanKai, (keZhanKai) => {
  if (!keZhanKai) shuRuKuangZhanKai.value = false
})

function jiSuanDanXingGaoDu(el: HTMLTextAreaElement): number {
  const cs = getComputedStyle(el)
  const lineHeight = parseFloat(cs.lineHeight)
  const fontSize = parseFloat(cs.fontSize)
  const xingGao = Number.isFinite(lineHeight)
    ? lineHeight
    : Number.isFinite(fontSize)
      ? fontSize * 1.4
      : 0
  const padShang = parseFloat(cs.paddingTop) || 0
  const padXia = parseFloat(cs.paddingBottom) || 0
  const bianKuang = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0)
  const jiSuanZhi = xingGao + padShang + padXia + bianKuang
  // 折叠态精确单行高度：行高 + 上下内边距 + 上下边框，使占位符"输入消息..."完美契合单行
  // 无布局环境（jsdom 等）下 getComputedStyle 不可靠，降级为 clientHeight（单元测试已 mock）
  if (!Number.isFinite(jiSuanZhi) || jiSuanZhi <= 0) {
    return el.clientHeight || 0
  }
  return Math.ceil(jiSuanZhi)
}

const shuRuKuangYangShi = computed(() => {
  if (shuRuKuangZhanKai.value) {
    const zhanKaiShangXian = Math.round(shiKouGaoDu.value * 0.5)
    const muBiaoGaoDu = Math.min(neiRongGaoDu.value, zhanKaiShangXian)
    return {
      height: `${muBiaoGaoDu}px`,
      maxHeight: `${zhanKaiShangXian}px`,
    }
  }
  return {
    maxHeight: `${danXingGaoDu.value}px`,
  }
})

function ceLiangShuRuKuang() {
  const el = shuruKuangRef.value
  if (!el) return
  // 测量前临时将高度置为 auto，读取自然内容高度，使「加字增高、删字缩行」均成立；
  // 读取后立即还原，最终应用高度仍完全由 computed :style 派生，此处绝不写最终高度
  const yuanShiGaoDu = el.style.height
  el.style.height = 'auto'
  neiRongGaoDu.value = el.scrollHeight
  el.style.height = yuanShiGaoDu
  danXingGaoDu.value = jiSuanDanXingGaoDu(el)
}

function chuLiShuRuBianHua() {
  if (聊天仓库.cuoWuXinXi) {
    聊天仓库.qingChuCuoWu()
  }
}

function qieHuanShuRuKuangZhanKai() {
  shuRuKuangZhanKai.value = !shuRuKuangZhanKai.value
  ceLiangShuRuKuang()
  nextTick(() => {
    shuruKuangRef.value?.focus()
  })
}

// 视口尺寸变化（如软键盘收起、旋转）时同步视口高度并重测内容；折叠态重测为精确单行，展开态重测 50vh 封顶
function chongSuanShuRuKuangGaoDu() {
  shiKouGaoDu.value = typeof window !== 'undefined' ? window.innerHeight : 0
  ceLiangShuRuKuang()
}

function chuLiShuRuKuangAnJian(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  faSong()
}

const 管理员调试指令 = 'greedisgood'

async function faSong() {
  const neiRong = shuRuNeiRong.value.trim()
  // 管理员调试入口：仅输入管理员调试指令时，管理员打开实时监控面板（非管理员不发送、不打开）
  if (neiRong === 管理员调试指令) {
    if (用户仓库.shiFouGuanLiYuan) guanLiJianKongZhanKai.value = true
    shuRuNeiRong.value = ''
    return
  }
  if (!keYiFaSong.value) return
  if (neiRong.length > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    return
  }
  shuRuNeiRong.value = ''
  shuRuKuangZhanKai.value = false
  faSongZhong.value = true
  try {
    const jieGuo = await 聊天仓库.faSongXiaoXi(neiRong)
    if (jieGuo && yiDingZaiDiBu.value) {
      gunDongDaoDiBu()
    }
  } finally {
    faSongZhong.value = false
  }
}

async function jiaZaiGengDuo() {
  if (!聊天仓库.haiYouGengDuo || 聊天仓库.jiaZaiGengDuoZhong) return
  const yuanGaoDu = xiaoxiQuYuRef.value ? xiaoxiQuYuRef.value.scrollHeight : 0
  const jieGuo = await 聊天仓库.jiaZaiGengDuoXiaoXi()
  if (jieGuo && xiaoxiQuYuRef.value) {
    await nextTick()
    const xinGaoDu = xiaoxiQuYuRef.value.scrollHeight
    xiaoxiQuYuRef.value.scrollTop = xinGaoDu - yuanGaoDu
  }
}

function chuLiGunDong() {
  // 先更新钉底状态，再判断是否触发加载更多（向上滚时不应被强制拽回底部）
  gengXinDingBuZhuangTai()
  if (!xiaoxiQuYuRef.value || !聊天仓库.haiYouGengDuo || 聊天仓库.jiaZaiGengDuoZhong) return
  if (xiaoxiQuYuRef.value.scrollTop <= 20) {
    jiaZaiGengDuo()
  }
}

async function zhiXingGaoBai() {
  if (!聊天仓库.dangQianHuiHuaId || gaoBaiJinXingZhong.value) return
  gaoBaiJinXingZhong.value = true
  try {
    await 聊天仓库.faSongXiaoXi('我们正式交往吧')
  } finally {
    gaoBaiJinXingZhong.value = false
  }
}

function daKaiCaiDan(xiaoXi: 消息, shiJian: MouseEvent) {
  if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
  if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
  xuanZhongXiaoXi.value = xiaoXi
  cheHuiCaiDanYangShi.value = {
    top: `${shiJian.clientY}px`,
    left: `${shiJian.clientX}px`,
  }
  cheHuiCaiDanZhanKai.value = true
}

function chuMoKaiShi(xiaoXi: 消息) {
  if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
  if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
  changAnDingShiQi = setTimeout(() => {
    xuanZhongXiaoXi.value = xiaoXi
    cheHuiCaiDanZhanKai.value = true
  }, 500)
}

function chuMoJieShu() {
  if (changAnDingShiQi) {
    clearTimeout(changAnDingShiQi)
    changAnDingShiQi = null
  }
}

async function zhiXingCheHui() {
  cheHuiCaiDanZhanKai.value = false
  if (!xuanZhongXiaoXi.value) return
  await 聊天仓库.cheHuiXiaoXi(xuanZhongXiaoXi.value.id)
  xuanZhongXiaoXi.value = null
}

function xianShiCheHuiAnNiu(xiaoXi: 消息): boolean {
  if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
  if (xiaoXi.yi_che_hui) return false
  if (!xiaoXi.shi_jian_chuo) return false
  return dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
}

async function zhiXingCheHuiXiaoXi(xiaoXi: 消息) {
  await 聊天仓库.cheHuiXiaoXi(xiaoXi.id)
}

function fanhuiShouYe() {
  youXiShiJianZhanKai.value = false
  聊天仓库.qingKongZhuangTai()
  router.push('/')
}

function chakanZhanJi() {
  youXiShiJianZhanKai.value = false
  router.push('/guo-wang-zhan-ji')
}

function junShiZhanKaiJianTingQi() {
  if (fuPanMoShi.value) return
  junShiZhanKai.value = true
}

function qingLiUIMianBan() {
  emojiMianBanZhanKai.value = false
  junShiZhanKai.value = false
  cheHuiCaiDanZhanKai.value = false
  shuRuKuangZhanKai.value = false
  gengDuoMianBanZhanKai.value = false
  guanBiTuPianYuLan()
  if (luYinZhong.value) {
    void wanChengLuYin(false)
  }
  luYinMoShi.value = false
  tingZhiYinPinBoFang()
}

async function jiaZaiFuPanShuJu(dangAnId: string) {
  const benCiId = ++fuPanQingQiuId
  fuPanJiaZaiZhong.value = true
  fuPanPiZhu.value = null
  fuPanZongJie.value = null
  try {
    let fuPanShuJu = await huoQuFuPan(dangAnId)
    if (!fuPanShuJu.jia_zai_zhong && fuPanShuJu.fu_pan_nei_rong) {
      fuPanPiZhu.value = fuPanShuJu.fu_pan_pi_zhu
      fuPanZongJie.value = fuPanShuJu.fu_pan_nei_rong
      fuPanJiaZaiZhong.value = false
      return
    }
    let changShiCiShu = 0
    while (!fuPanShuJu.fu_pan_nei_rong && changShiCiShu < 20 && fuPanQingQiuId === benCiId) {
      await new Promise((jieJue) => setTimeout(jieJue, 3000))
      changShiCiShu++
      if (fuPanQingQiuId !== benCiId) return
      try {
        fuPanShuJu = await huoQuFuPan(dangAnId)
      } catch (e) {
        console.warn('轮询复盘数据失败', e)
      }
      if (fuPanShuJu.fu_pan_nei_rong || !fuPanShuJu.jia_zai_zhong) {
        fuPanPiZhu.value = fuPanShuJu.fu_pan_pi_zhu
        fuPanZongJie.value = fuPanShuJu.fu_pan_nei_rong
        fuPanJiaZaiZhong.value = false
        break
      }
    }
  } finally {
    if (fuPanQingQiuId === benCiId) {
      fuPanJiaZaiZhong.value = false
    }
  }
}

function tuiChuFuPan() {
  fuPanMoShi.value = false
  fuPanPiZhu.value = null
  fuPanZongJie.value = null
  fuPanJiaZaiZhong.value = false
  fuPanDangAnId.value = null
  fuPanQingQiuId++
  聊天仓库.qingKongZhuangTai()
  router.push('/guo-wang-zhan-ji')
}

async function chuShiHuaLiaoTian() {
  const huiHuaId = route.params.huiHuaId as string
  if (!huiHuaId) return
  const queryFuPan = route.query.fuPan
  const queryDangAnId = route.query.dangAnId
  if (queryFuPan === '1' && typeof queryDangAnId === 'string' && queryDangAnId) {
    fuPanMoShi.value = true
    fuPanDangAnId.value = queryDangAnId
    聊天仓库.meiYeTiaoShu = 999
    await 聊天仓库.jiaZaiXiaoXi(huiHuaId)
    gunDongDaoDiBu()
    void jiaZaiFuPanShuJu(queryDangAnId)
    return
  }
  fuPanMoShi.value = false
  聊天仓库.meiYeTiaoShu = 50
  await 聊天仓库.jiaZaiXiaoXi(huiHuaId)
  聊天仓库.lianJieSocket(huiHuaId)
  gunDongDaoDiBu()
}

function qiDongShiJianGengXinQi() {
  if (shiJianGengXinQi) return
  shiJianGengXinQi = setInterval(() => {
    dangQianShiJian.value = Date.now()
  }, 1000)
}

function tingZhiShiJianGengXinQi() {
  if (shiJianGengXinQi) {
    clearInterval(shiJianGengXinQi)
    shiJianGengXinQi = null
  }
}

let yuZaiEmojiLinShi: HTMLElement | null = null
function yuZaiEmojiZiXing() {
  if (typeof document === 'undefined') return
  const yuanSheng = document.querySelector('.emoji-mianban')
  if (!yuanSheng) return
  const linShi = yuanSheng.cloneNode(true) as HTMLElement
  // 关键修正：用 opacity:0（而非 visibility:hidden）强制浏览器真正「绘制」该克隆层，
  // 从而把约 170 个 emoji 系统字形一次性 rasterize 并缓存；置于视口内、最底层、禁命中，
  // 既触发合成绘制又不可见、不挡交互。原 visibility:hidden 方案浏览器会跳过字形绘制，
  // 导致首次真实展开（v-show display:none→block）时仍需当场 rasterize → 明显的「第一次点开卡顿」。
  linShi.style.cssText =
    'position:fixed;inset:0;opacity:0;pointer-events:none;z-index:-1;display:grid;overflow:hidden;'
  document.body.appendChild(linShi)
  yuZaiEmojiLinShi = linShi
  // 强制同步布局
  void linShi.offsetWidth
  void linShi.getBoundingClientRect()
  // 再强制两帧真实绘制（opacity:0 合成层需提交到合成线程才算 rasterize 完成），随后移除
  const qingLi = () => {
    if (yuZaiEmojiLinShi && yuZaiEmojiLinShi.parentNode) {
      yuZaiEmojiLinShi.parentNode.removeChild(yuZaiEmojiLinShi)
    }
    yuZaiEmojiLinShi = null
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(qingLi))
  } else {
    qingLi()
  }
}

onMounted(async () => {
  window.addEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', chuLiShiJiaoKouBianHua)
    window.visualViewport.addEventListener('scroll', chuLiShiJiaoKouBianHua)
  }
  qiDongShiJianGengXinQi()
  window.addEventListener('resize', chongSuanShuRuKuangGaoDu)
  document.addEventListener('click', chuLiWenDangDianJi, true)
  document.addEventListener('visibilitychange', chuLiYeMianKeJianXing)
  nextTick(() => ceLiangShuRuKuang())
  // 进入聊天页即把表情面板离屏克隆并以 opacity:0 真实绘制，强制浏览器一次性
  // rasterize 全部 emoji 系统字形并缓存；这样首次点开表情面板（v-show display:none→block）不再卡顿。
  // 该预加载不触发任何滚动；表情面板展开时对聊天区的「顶起」滚动补偿由
  // ResizeObserver（chuShiHuaEmojiGunDongBuChang）单独处理，与字形预渲染无关。
  yuZaiEmojiZiXing()
  chuShiHuaEmojiGunDongBuChang()
  await chuShiHuaLiaoTian()
  yiTongGuoMountedChuShiHua = true
})

onActivated(async () => {
  // 重新进入时面板必然处于闭合态，把滚动补偿基线归零，避免 keep-alive 复用时
  // ResizeObserver 首帧以旧高度（200）误判为「收起」而把聊天区向下甩。
  shangYiEmojiGaoDu = 0
  qiDongShiJianGengXinQi()
  nextTick(() => ceLiangShuRuKuang())
  if (!yiTongGuoMountedChuShiHua) {
    return
  }
  await chuShiHuaLiaoTian()
})

onDeactivated(() => {
  tingZhiShiJianGengXinQi()
  qingLiUIMianBan()
})

onBeforeUnmount(() => {
  if (emojiMianBanGuanChaQi) {
    emojiMianBanGuanChaQi.disconnect()
    emojiMianBanGuanChaQi = null
  }
  if (yuZaiEmojiLinShi && yuZaiEmojiLinShi.parentNode) {
    yuZaiEmojiLinShi.parentNode.removeChild(yuZaiEmojiLinShi)
    yuZaiEmojiLinShi = null
  }
  tingZhiYinPinBoFang()
  qingLiLuYinZiYuan()
  window.removeEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)
  window.removeEventListener('resize', chongSuanShuRuKuangGaoDu)
  document.removeEventListener('click', chuLiWenDangDianJi, true)
  document.removeEventListener('visibilitychange', chuLiYeMianKeJianXing)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', chuLiShiJiaoKouBianHua)
    window.visualViewport.removeEventListener('scroll', chuLiShiJiaoKouBianHua)
  }
  tingZhiShiJianGengXinQi()
  qingLiUIMianBan()
  聊天仓库.qingKongZhuangTai()
})
</script>

<style scoped>
.liaotian-yemian {
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--beijing-zhuse);
  font-family:
    -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Arial,
    sans-serif;
}

.xiaoxi-quyu {
  /* 聊天区滚动条：独立可见色，避免标准属性覆盖 WebKit 自定义样式 */
  --liaotian-gundong-tiao: rgba(110, 110, 110, 0.85);
  --liaotian-gundong-tiao-hover: rgba(80, 80, 80, 0.95);
  --liaotian-gundong-tiao-track: rgba(140, 140, 140, 0.16);
  overflow-y: auto;
  min-height: 0;
  /* 纵向节奏由消息自身 margin 唯一掌管（单一起源原则）：
     此处内边距必须归零。若再声明非零 padding-bottom，就会与最后一条
     消息的 margin-bottom(16px) 叠加出 36px 的失真底部空隙，
     使底部边界空隙永远无法与消息间空隙(16px)保持一致。 */
  padding: 12px 16px;
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--liaotian-beijing);
  background-size: 18px 18px;
  -webkit-overflow-scrolling: touch;
  /* 注意：此处不声明 scrollbar-width / scrollbar-color，否则会覆盖下方 ::-webkit-scrollbar 自定义样式 */
  scroll-padding-bottom: 20px;
  /* 常驻滚动条槽位：否则滚动条出现/消失会改变内容宽度，导致气泡与时间标签横向抖动 */
  scrollbar-gutter: stable;
}

.xiaoxi-quyu::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.xiaoxi-quyu::-webkit-scrollbar-track {
  background: var(--liaotian-gundong-tiao-track);
}

.xiaoxi-quyu::-webkit-scrollbar-thumb {
  background: var(--liaotian-gundong-tiao);
  border-radius: 4px;
}

.xiaoxi-quyu::-webkit-scrollbar-thumb:hover {
  background: var(--liaotian-gundong-tiao-hover);
}

.xiaoxi-liebiao {
  display: flex;
  flex-direction: column;
  /* 贴底只能靠自动外边距吸收父级剩余空间。
     原写法 flex:1（basis:0）+ min-height:100% 会把本列表钉死为「恰好一屏高」，
     消息多于一屏时内容被 justify-content:flex-end 挤出列表顶部；而滚动容器的可滚动区域
     在 block-start 边被裁到 padding 边，溢出到上方的历史消息因此永远滚不到 —— 这才是滚动条异常的根因。
     复盘模式下同一机制还会在消息与总结之间留出整屏空白。 */
  margin-top: auto;
}

.jiazaigengduo-qu {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
}

.jiazaigengduo-anniu {
  padding: 5px 14px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: var(--wenben-tishi);
  font-size: 12px;
  cursor: pointer;
}

.jiazaigengduo-anniu:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.shijian-biaoqian {
  display: inline-block;
  align-self: center;
  padding: 2px 6px;
  margin: 16px 0 12px;
  border-radius: 4px;
  background: var(--shijian-biaoqian-beijing);
  color: var(--wenben-tishi);
  font-size: 12px;
  line-height: 1.4;
}

.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  max-width: 100%;
  margin-bottom: 16px;
  position: relative;
}

.xiaoxi-xiangmu:first-of-type {
  margin-top: 4px;
}

.xiaoxi-xiangmu.yonghu-xiaoxi {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.xiaoxi-xiangmu.jiaose-xiaoxi {
  flex-direction: row;
  align-self: flex-start;
}

.xiaoxi-xiangmu.xitong-xiaoxi,
.xiaoxi-xiangmu.chehui-xiaoxi {
  align-self: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 10px;
}

.xiaoxi-touxiang {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-beijing-moren);
  flex-shrink: 0;
}

.yonghu-xiaoxi .xiaoxi-touxiang {
  margin-left: 10px;
}

.jiaose-xiaoxi .xiaoxi-touxiang {
  margin-right: 10px;
}

.touxiang-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.touxiang-moren-xiaoxi {
  font-size: 18px;
  color: var(--wenben-zhuse);
}

.qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}

.qipao-neirong {
  padding: 9px 13px;
  border-radius: 6px;
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
  position: relative;
  display: inline-block;
}

.yonghu-xiaoxi .qipao-neirong {
  background: var(--xiaoxi-yonghu-beijing);
  color: var(--xiaoxi-yonghu-wenben);
  border-radius: 6px;
}

.yonghu-xiaoxi .qipao-neirong::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 13px;
  width: 0;
  height: 0;
  border-left: 6px solid var(--xiaoxi-yonghu-beijing);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.jiaose-xiaoxi .qipao-neirong {
  background: var(--xiaoxi-jiaose-beijing);
  color: var(--xiaoxi-jiaose-wenben);
  border: none;
  border-radius: 6px;
}

.jiaose-xiaoxi .qipao-neirong::after {
  content: '';
  position: absolute;
  left: -5px;
  top: 13px;
  width: 0;
  height: 0;
  border-right: 6px solid var(--xiaoxi-jiaose-beijing);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.fasong-zhuangtai {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 6px;
}

.fasong-zhuangtai-zhuanquan {
  display: inline-block;
  /* 直径约等于一行气泡高度：以相对气泡字体的 em 设定，禁止硬编码 px */
  width: 1.4em;
  height: 1.4em;
  border: 0.16em solid var(--wenben-tishi);
  border-top-color: transparent;
  border-radius: 50%;
  animation: fasong-xuanzhuan 1s linear infinite;
  opacity: 0.9;
}

@keyframes fasong-xuanzhuan {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.xitong-neirong {
  font-size: 12px;
  color: var(--wenben-tishi);
  text-align: center;
  padding: 4px 0;
}

.chehui-tishi {
  font-size: 12px;
  color: var(--wenben-tishi);
  text-align: center;
  padding: 4px 0;
}

.chehui-anniu {
  display: none;
}

.weixin-shuru {
  background: var(--shuru-quyu-beijing);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  padding: 8px 10px;
  padding-bottom: calc(8px + var(--anquan-quyu-xia));
}

.shuru-rongqi {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.suoding-tishi {
  text-align: center;
  font-size: 13px;
  color: var(--wenben-ciuse);
  padding: 10px 0;
  opacity: 0.8;
}

.yuyin-anniu,
.biaoqing-anniu,
.gengduo-gongneng-anniu,
.gengduo-plus-anniu {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--shuru-fu-anniu-se);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.yuyin-anniu svg,
.biaoqing-anniu svg,
.gengduo-gongneng-anniu svg,
.gengduo-plus-anniu svg {
  width: 28px;
  height: 28px;
}

.biaoqing-anniu.huoyue,
.gengduo-plus-anniu.huoyue,
.yuyin-anniu.huoyue {
  color: var(--zhuse);
}

.shuru-kuang-waike {
  flex: 1;
  min-width: 0;
  background: var(--beijing-kaopian);
  border-radius: 6px;
  display: block;
  border: 0.5px solid var(--shuru-quyu-biankuang);
}

.shuru-kuang {
  width: 100%;
  min-width: 0;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--wenben-zhuse);
  line-height: 1.4;
  outline: none;
  border-radius: 6px;
  box-sizing: border-box;
  /* 改为块级，消除 textarea 作为 inline-block 时在父容器中产生的基线对齐下方空隙，
     使 placeholder 在折叠态视觉上垂直居中 */
  display: block;
  resize: none;
  overflow-y: auto;
  /* 折叠态：彻底隐藏滚动条，但保留鼠标滚轮上下滚动，绝不可出现可见滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.shuru-kuang::placeholder {
  color: var(--shuru-zhanwei-se);
}

.shuru-kuang.zhan-kai {
  overflow-y: auto;
  /* 展开态：覆盖折叠态的 scrollbar-width:none，恢复 WebKit 自定义滚动条（可见） */
  scrollbar-width: auto;
  -ms-overflow-style: auto;
  /* 独立可见色变量，避免沿用近乎不可见的 --gundong-tiao-beijing */
  --shuru-kuang-gundong-tiao: rgba(110, 110, 110, 0.85);
  --shuru-kuang-gundong-tiao-hover: rgba(80, 80, 80, 0.95);
}

/* 折叠态：彻底隐藏滚动条（保留滚轮滚动） */
.shuru-kuang::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

/* 展开态：出现可见滚动条 */
.shuru-kuang.zhan-kai::-webkit-scrollbar {
  width: 6px;
  height: 6px;
  display: block;
}

.shuru-kuang.zhan-kai::-webkit-scrollbar-track {
  background: transparent;
}

.shuru-kuang.zhan-kai::-webkit-scrollbar-thumb {
  background: var(--shuru-kuang-gundong-tiao);
  border-radius: 3px;
}

.shuru-kuang.zhan-kai::-webkit-scrollbar-thumb:hover {
  background: var(--shuru-kuang-gundong-tiao-hover);
}

.fasong-anniu {
  padding: 6px 14px;
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}

.fasong-anniu:hover:not(:disabled) {
  opacity: 0.85;
}

.fasong-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.shuru-fu-zhu {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 18px;
  padding: 0 4px;
  margin-top: 4px;
}

.fasong-cuowu {
  font-size: 12px;
  color: var(--cuowu-yanse);
}

.shuru-dibu-hang {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 0;
}

.zifu-jishu {
  white-space: nowrap;
  font-size: 11px;
  line-height: 16px;
  color: var(--wenben-tishi);
}

.zifu-chaochu {
  color: var(--cuowu-yanse);
}

.zhan-kai-anniu {
  width: 20px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--shuru-fu-anniu-se);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  margin-right: 4px;
}

.zhan-kai-anniu svg {
  width: 14px;
  height: 14px;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.zhan-kai-anniu.zhan-kai svg {
  transform: rotate(180deg);
}

.zhan-kai-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.emoji-mianban {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 8px;
  background: var(--beijing-ciuse);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  max-height: 200px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 常驻滚动条槽位：静止态内容溢出会显示滚动条，而展开/折叠态(max-height:0)无滚动条；
     若不预留，三态内容宽度不一致，滚动条出现瞬间 emoji 网格会横向偏移（动画跳变）。
     与聊天区一致，预留槽位使 打开/静态/折叠 三态宽度恒等，消除居中偏差 */
  scrollbar-gutter: stable;
  /* 不声明标准 scrollbar-width / scrollbar-color，否则会覆盖下方 ::-webkit-scrollbar 自定义样式 */
  /* 独立可见色变量，避免沿用近乎不可见的 --gundong-tiao-beijing */
  --emoji-mianban-gundong-tiao: rgba(110, 110, 110, 0.85);
  --emoji-mianban-gundong-tiao-hover: rgba(80, 80, 80, 0.95);
}

.emoji-mianban::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.emoji-mianban::-webkit-scrollbar-track {
  background: transparent;
}

.emoji-mianban::-webkit-scrollbar-thumb {
  background: var(--emoji-mianban-gundong-tiao);
  border-radius: 3px;
}

.emoji-mianban::-webkit-scrollbar-thumb:hover {
  background: var(--emoji-mianban-gundong-tiao-hover);
}

.emoji-xiangmu {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.15s ease;
  padding: 0;
}

.emoji-xiangmu:hover {
  background: var(--emoji-xiangmu-hover);
}

.emoji-xiangmu:active {
  transform: scale(0.95);
}

.youxi-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--zhezhao-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.youxi-tanchuang {
  width: 100%;
  max-width: 300px;
  padding: 24px 20px;
  background: var(--tanchuang-beijing);
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--tanchuang-yinying);
  border: 0.5px solid var(--tanchuang-biankuang);
}

.youxi-tubiao {
  font-size: 48px;
  margin-bottom: 12px;
}

.youxi-biaoti {
  font-size: 18px;
  font-weight: 600;
  color: var(--tanchuang-biaoti);
  margin-bottom: 8px;
}

.youxi-miaoshu {
  font-size: 14px;
  color: var(--wenben-ciuse);
  margin-bottom: 20px;
  line-height: 1.5;
}

.youxi-anniu-zu {
  display: flex;
  gap: 12px;
}

.youxi-anniu {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.youxi-anniu.fanhui {
  background: var(--tanchuang-fanhui-beijing);
  color: var(--wenben-zhuse);
}

.youxi-anniu.chakan {
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
}

.chehui-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
}

.chehui-caidan {
  position: fixed;
  background: var(--chehui-caidan-beijing);
  border-radius: 8px;
  padding: 4px 0;
  min-width: 90px;
  box-shadow: var(--caidan-yinying);
  overflow: hidden;
}

.chehui-xiangmu {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--chehui-caidan-wenben);
  background: transparent;
  border: none;
  cursor: pointer;
}

.chehui-xiangmu:hover {
  background: var(--chehui-caidan-hover);
}

.youce-huadong-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.youce-huadong-leave-active {
  transition: transform 0.2s ease;
}

.youce-huadong-enter-from,
.youce-huadong-leave-to {
  transform: translateX(100%);
}

.zhezhao-xianshi-enter-active {
  transition: opacity 0.25s ease;
}

.zhezhao-xianshi-leave-active {
  transition: opacity 0.15s ease;
}

.zhezhao-xianshi-enter-from,
.zhezhao-xianshi-leave-to {
  opacity: 0;
}

.xiaoxi-guodu-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.xiaoxi-guodu-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.emoji-zhankai-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.emoji-zhankai-leave-active {
  transition: all 0.15s ease;
}

.emoji-zhankai-enter-from,
.emoji-zhankai-leave-to {
  opacity: 0;
  max-height: 0;
  padding: 0 8px;
  /* 与静止态 .emoji-mianban 的 overflow-y:auto 保持一致，确保 scrollbar-gutter:stable 预留的滚动条槽位在
     打开/静态/折叠三态恒等，消除滚动条出现/消失导致的 emoji 网格横向偏移（尾帧=首帧=静止态） */
  overflow-y: auto;
}

/* 进入→静止、静止→收起的交接态不再重复声明 max-height，
   隐式等于唯一静止态 .emoji-mianban{max-height:200px; padding:8px}，
   彻底消除相位错位跳变 */

.fupan-pizhu-xiangmu {
  display: flex;
  margin-bottom: 12px;
  margin-top: -8px;
  padding: 0 50px;
}

.fupan-pizhu-xiangmu.yonghu-pizhu {
  justify-content: flex-end;
}

.fupan-pizhu-xiangmu.jiaose-pizhu {
  justify-content: flex-start;
}

.fupan-pizhu-qipao {
  max-width: min(calc(100vw - 126px), 520px);
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(108, 92, 231, 0.12);
  border: 1px solid rgba(108, 92, 231, 0.25);
  border-left-width: 3px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fupan-pizhu-xiangmu.pizhu-positive .fupan-pizhu-qipao {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
  border-left-color: #4caf50;
}

.fupan-pizhu-xiangmu.pizhu-positive .fupan-pizhu-biaoqian {
  color: #4caf50;
}

.fupan-pizhu-xiangmu.pizhu-negative .fupan-pizhu-qipao {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.3);
  border-left-color: #f44336;
}

.fupan-pizhu-xiangmu.pizhu-negative .fupan-pizhu-biaoqian {
  color: #f44336;
}

.fupan-pizhu-xiangmu.pizhu-neutral .fupan-pizhu-qipao {
  background: rgba(158, 158, 158, 0.1);
  border-color: rgba(158, 158, 158, 0.3);
  border-left-color: #9e9e9e;
}

.fupan-pizhu-xiangmu.pizhu-neutral .fupan-pizhu-biaoqian {
  color: #757575;
}

.fupan-pizhu-biaoqian {
  font-size: 11px;
  font-weight: 700;
  color: var(--yanse-zhanji, #6c5ce7);
  flex-shrink: 0;
}

.fupan-pizhu-neirong {
  color: var(--wenben-zhuse);
  white-space: pre-wrap;
}

.fupan-jiazai-qu {
  display: flex;
  justify-content: center;
  padding: 24px 16px 16px;
}

.fupan-jiazai-tishi {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--shijian-biaoqian-beijing);
  color: var(--wenben-tishi);
  font-size: 13px;
}

.fupan-jiazai-zhuanquan {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--wenben-tishi);
  border-top-color: transparent;
  border-radius: 50%;
  animation: fasong-xuanzhuan 1s linear infinite;
  opacity: 0.6;
}

.fupan-zongjie-qu {
  margin: 20px 16px 24px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(108, 92, 231, 0.08);
  border: 1px solid rgba(108, 92, 231, 0.2);
}

.fupan-zongjie-qu.you-fen-kuai {
  background: rgba(108, 92, 231, 0.05);
}

.fupan-zongjie-biaoti {
  font-size: 15px;
  font-weight: 700;
  color: var(--yanse-zhanji, #6c5ce7);
  margin-bottom: 10px;
}

.fupan-zongjie-neirong {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.fupan-zongjie-fenkuai {
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--beijing-kaopian, rgba(255, 255, 255, 0.5));
  border: 0.5px solid var(--shuru-quyu-biankuang, rgba(0, 0, 0, 0.08));
}

.fupan-zongjie-fenkuai:last-of-type {
  margin-bottom: 0;
}

.fupan-zongjie-fenkuai.jinggao-fenkuai {
  background: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.4);
  border-left-width: 3px;
  border-left-color: #f44336;
}

.fupan-zongjie-fenkuai-biaoti {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--yanse-zhanji, #6c5ce7);
  margin-bottom: 4px;
}

.fupan-zongjie-fenkuai.jinggao-fenkuai .fupan-zongjie-fenkuai-biaoti {
  color: #f44336;
}

.jinggao-tubiao {
  font-size: 14px;
  line-height: 1;
}

.fupan-zongjie-fenkuai-neirong {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.fupan-zongjie-jinggao-tishi {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #f44336;
  font-size: 12px;
  color: #f44336;
  line-height: 1.5;
}

.fupan-dibu-lan {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

.fupan-tuichu-anniu {
  padding: 8px 24px;
  border-radius: 8px;
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.fupan-tuichu-anniu:hover {
  opacity: 0.85;
}

/* ─── 多媒体消息：图片气泡 ─── */
.tupian-waike {
  --duomeiti-tupian-zuidakuan: 180px;
  --duomeiti-tupian-morenkuan: 160px;
  max-width: min(calc(100vw - 126px), 520px);
}

.tupian-qipao {
  position: relative;
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  line-height: 0;
}

.tupian-xianshi {
  display: block;
  max-width: var(--duomeiti-tupian-zuidakuan);
  border-radius: var(--yuanjiao-xiao);
}

.yincang-tu {
  visibility: hidden;
  max-width: var(--duomeiti-tupian-morenkuan);
}

.tupian-gujia {
  display: block;
  width: var(--duomeiti-tupian-morenkuan);
  aspect-ratio: 4 / 3;
  border-radius: var(--yuanjiao-xiao);
  background: var(--touxiang-beijing-moren);
  animation: gujia-shanshuo 1.2s ease-in-out infinite;
}

@keyframes gujia-shanshuo {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* ─── 多媒体消息：表情包气泡（透明背景大图） ─── */
.biaoqingbao-waike {
  background: transparent !important;
}

.biaoqingbao-tu {
  width: var(--duomeiti-biaoqingbao-chicun, 120px);
  height: var(--duomeiti-biaoqingbao-chicun, 120px);
  object-fit: contain;
  display: block;
}

/* ─── 多媒体消息：语音条胶囊气泡 ─── */
.yuyin-waike {
  --duomeiti-boxing-tiaokuan: 3px;
}

.yuyin-qipao {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  color: var(--xiaoxi-yonghu-wenben);
  background: var(--xiaoxi-yonghu-beijing);
  min-height: 36px;
}

.jiaose-xiaoxi .yuyin-qipao {
  background: var(--xiaoxi-jiaose-beijing);
  color: var(--xiaoxi-jiaose-wenben);
}

.yuyin-qipao.bofangzhong {
  box-shadow: var(--qipao-yinying);
}

.boxing-zu {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 16px;
  flex-shrink: 0;
}

.boxing-tiao {
  width: var(--duomeiti-boxing-tiaokuan);
  height: 100%;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.85;
  transform-origin: center;
  animation: boxing-baidong 1s ease-in-out infinite;
}

.boxing-tiao:nth-child(2n) {
  animation-delay: -0.15s;
}

.boxing-tiao:nth-child(3n) {
  animation-delay: -0.35s;
  height: 65%;
}

.boxing-tiao:nth-child(4n) {
  height: 40%;
}

.boxing-tiao:nth-child(5n) {
  animation-delay: -0.55s;
}

@keyframes boxing-baidong {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}

.yuyin-qipao.bofangzhong .boxing-tiao {
  animation-duration: 0.45s;
}

.yuyin-shichang {
  font-size: 14px;
  white-space: nowrap;
}

/* ─── 多媒体消息：文件卡片气泡 ─── */
.wenjian-waike {
  max-width: min(calc(100vw - 126px), 320px);
}

.wenjian-qipao {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: var(--yuanjiao-xiao);
}

.yonghu-xiaoxi .wenjian-qipao {
  background: var(--xiaoxi-yonghu-beijing);
  color: var(--xiaoxi-yonghu-wenben);
}

.jiaose-xiaoxi .wenjian-qipao {
  background: var(--xiaoxi-jiaose-beijing);
  color: var(--xiaoxi-jiaose-wenben);
}

.wenjian-tubiao {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wenjian-tubiao svg {
  width: 34px;
  height: 34px;
}

.wenjian-xinxi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.wenjian-ming {
  font-size: 14px;
  word-break: break-all;
  line-height: 1.3;
}

.wenjian-daxiao {
  font-size: 12px;
  opacity: 0.7;
}

.wenjian-xiazai {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-left: 0.5px solid currentColor;
  padding-left: 8px;
  margin-left: 2px;
  color: inherit;
  opacity: 0.75;
}

.wenjian-xiazai:hover {
  opacity: 1;
}

.wenjian-xiazai svg {
  width: 20px;
  height: 20px;
}

/* ─── 图片全屏预览 ─── */
.tupian-yulan-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: var(--zhezhao-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.tupian-yulan-da-tu {
  max-width: 92vw;
  max-height: 92vh;
  object-fit: contain;
  border-radius: var(--yuanjiao-xiao);
}

.tupian-yulan-guanbi {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--chehui-caidan-beijing);
  color: var(--chehui-caidan-wenben);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

/* ─── 表情面板双 Tab ─── */
.mianban-tab-hang {
  grid-column: 1 / -1;
  display: flex;
  gap: 4px;
  padding-bottom: 6px;
  border-bottom: 0.5px solid var(--shuru-quyu-biankuang);
}

.mianban-tab {
  flex: 1;
  padding: 5px 0;
  border: none;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-ciuse);
  font-size: 13px;
  cursor: pointer;
}

.mianban-tab.huoyue {
  background: var(--emoji-huoyue-beijing);
  color: var(--wenben-zhuse);
  font-weight: 600;
}

.emoji-wangge {
  display: contents;
}

.biaoqingbao-wangge {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.biaoqingbao-xiangmu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  border: none;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
}

.biaoqingbao-xiangmu:hover {
  background: var(--emoji-xiangmu-hover);
}

.biaoqingbao-emoji {
  font-size: 34px;
  line-height: 1.2;
}

.biaoqingbao-wenzi {
  font-size: 11px;
  color: var(--wenben-ciuse);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── "+" 更多面板（2×2 网格） ─── */
.gengduo-mianban {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 8px;
  padding: 10px;
  background: var(--beijing-ciuse);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  border-radius: var(--yuanjiao-zhong);
}

.gengduo-rukou {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border: none;
  border-radius: var(--yuanjiao-xiao);
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.gengduo-rukou:hover {
  background: var(--caidan-hover);
}

.gengduo-rukou svg {
  width: 26px;
  height: 26px;
}

/* ─── 隐藏文件选择输入 ─── */
.yincang-wenjian-shuru {
  display: none;
}

/* ─── 录音覆盖层 ─── */
.luyin-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 2400;
  background: var(--zhezhao-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
}

.luyin-mianban {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 28px 32px;
  border-radius: var(--yuanjiao-da);
  background: var(--tanchuang-beijing);
  border: 0.5px solid var(--tanchuang-biankuang);
  box-shadow: var(--tanchuang-yinying);
}

.luyin-anzhu-an {
  width: 200px;
  min-height: 64px;
  border: none;
  border-radius: 32px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.luyin-anzhu-an.zhengzai-luyin {
  background: var(--xiaoxi-yonghu-beijing);
  color: var(--xiaoxi-yonghu-wenben);
  transform: scale(1.04);
}

.luyin-anzhu-an.yao-quxiao {
  background: var(--cuowu-yanse);
  color: var(--fasong-anniu-wenben);
}

.luyin-zhuangtai-hang {
  display: flex;
  align-items: center;
  gap: 10px;
}

.luyin-boxing-zu {
  height: 20px;
}

.bo-xing-huo {
  animation-duration: 0.7s;
}

.luyin-jishi {
  font-size: 15px;
  color: var(--cuowu-yanse);
  min-width: 34px;
  text-align: right;
}

.luyin-tishi-wen {
  margin: 0;
  font-size: 13px;
  color: var(--wenben-ciuse);
}

.luyin-guanbi-anniu {
  padding: 6px 22px;
  border: none;
  border-radius: var(--yuanjiao-xiao);
  background: var(--guanbi-anniu-beijing);
  color: var(--wenben-zhuse);
  font-size: 13px;
  cursor: pointer;
}

.luyin-guanbi-anniu:hover {
  background: var(--guanbi-anniu-hover);
}

@media (max-width: 480px) {
  .qipao-waike {
    max-width: min(calc(100vw - 120px), 420px);
  }

  .qipao-neirong {
    font-size: 15px;
  }

  .xiaoxi-quyu {
    padding: 10px 12px;
  }

  .fupan-pizhu-qipao {
    max-width: min(calc(100vw - 120px), 420px);
  }
}
</style>
