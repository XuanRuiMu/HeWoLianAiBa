<template>
  <div class="liaotian-yemian">
    <div class="aitishi-tiao" role="note">
      {{ huoQuFanYi('tongYong', 'aiTiShiTiao') }}
    </div>
    <main ref="xiaoxiQuYuRef" class="xiaoxi-quyu weixin-beijing" :class="liaoTianBeiJingLeiMing" :style="[liaoTianBeiJingYangShi, qiPaoYangShi]" role="log" aria-live="polite" :aria-label="huoQuFanYi('liaoTian', 'xiaoXiLieBiao')" @scroll="chuLiGunDong">
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
      <div v-if="聊天仓库.shouPingJiaZaiZhong" class="gujia-liebiao" aria-hidden="true">
        <div
          v-for="(qiPao, guJiaSuoYin) in GU_JIA_QI_PAO_PEI_ZHI"
          :key="'gujia-' + guJiaSuoYin"
          class="gujia-xiangmu"
          :class="qiPao.shiYouCe ? 'gujia-youce' : 'gujia-zuoce'"
        >
          <span v-if="!qiPao.shiYouCe" class="gujia-touxiang" />
          <span class="gujia-qipao" :style="{ width: qiPao.kuanDu }" />
          <span v-if="qiPao.shiYouCe" class="gujia-touxiang" />
        </div>
      </div>
      <div v-else-if="聊天仓库.jiaZaiShiBai" class="jiazai-shibai-qu">
        <svg class="shibai-chahua" viewBox="0 0 72 48" fill="none" aria-hidden="true">
          <circle cx="34" cy="24" r="16" fill="currentColor" />
          <circle cx="28" cy="20" r="4.5" fill="var(--liaotian-beijing)" opacity="0.35" />
          <circle cx="39" cy="28" r="3" fill="var(--liaotian-beijing)" opacity="0.35" />
          <path
            d="M58 10l1.8 3.6L63.5 15l-3.7 1.4L58 20l-1.8-3.6L52.5 15l3.7-1.4z"
            fill="currentColor"
            opacity="0.55"
          />
        </svg>
        <p class="shibai-biaoti">{{ huoQuFanYi('liaoTian', 'jiaZaiShiBai') }}</p>
        <p class="shibai-tishi">{{ huoQuFanYi('liaoTian', 'jiaZaiShiBaiTiShi') }}</p>
        <button class="chongshi-anniu" @click="chongShiJiaZai">
          {{ huoQuFanYi('liaoTian', 'chongShi') }}
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
              @contextmenu.prevent="fuPanMoShi ? null : chuLiYouJianCaiDan(xiaoXi, $event)"
              @touchstart="fuPanMoShi ? null : chuLiChuMoKaiShi(xiaoXi)"
              @touchend="chuLiChuMoJieShu"
              @touchmove="chuLiChuMoJieShu"
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
                    loading="lazy"
                    decoding="async"
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
                    loading="lazy"
                    decoding="async"
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
                      @error="shuaXinMeiTiURL(xiaoXi, $event)"
                    />
                  </button>
                </div>
                <div
                  v-else-if="xiaoXi.lei_xing === 'biaoQingBao'"
                  class="qipao-waike biaoqingbao-waike"
                >
                  <img
                    class="biaoqingbao-tu"
                    :src="huoQuXiaoXiMeiTiURL(xiaoXi)"
                    alt=""
                    @error="shuaXinMeiTiURL(xiaoXi, $event)"
                  />
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
                    <svg
                      v-if="!shiYuYinBoFangZhong(xiaoXi)"
                      class="yuyin-shengyin-tubiao"
                      :class="{
                        'tubiao-youce': xiaoXi.fa_song_zhe_lei_xing === 'yonghu',
                      }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d="M11 5 6 9H3v6h3l5 4z"
                        fill="currentColor"
                        stroke="none"
                      />
                      <path d="M15 9a4 4 0 0 1 0 6" />
                      <path d="M17.5 6.5a8 8 0 0 1 0 11" opacity="0.6" />
                    </svg>
                    <span v-else class="yuyin-jindu-qu">
                      <input
                        class="yuyin-jindu-tiao"
                        type="range"
                        :min="0"
                        :max="huoQuBoFangZongMiao(xiaoXi)"
                        :step="0.1"
                        :value="huoQuBoFangJinDu(xiaoXi)"
                        :aria-label="huoQuFanYi('duoMeiTi', 'boFangYuYin')"
                        @click.stop
                        @input.stop="tiaoZhuanYuYinJinDu(xiaoXi, ($event.target as HTMLInputElement).valueAsNumber)"
                      />
                      <span class="yuyin-jindu-wenben"
                        >{{ geShiHuaBoFangJinDu(xiaoXi) }} / {{ geShiHuaYuYinShiChang(xiaoXi) }}</span
                      >
                    </span>
                    <span class="boxing-zu" aria-hidden="true">
                      <span
                        v-for="tiao in YU_YIN_BO_XING_TIAO_SHU"
                        :key="tiao"
                        class="boxing-tiao"
                      />
                    </span>
                    <span class="yuyin-shichang">{{ geShiHuaYuYinShiChang(xiaoXi) }}</span>
                  </button>
                  <div
                    v-if="shiYuYinZhuanXieZhong(xiaoXi)"
                    class="yuyin-zhuanwenzi-zhuangtai"
                  >
                    {{ huoQuFanYi('liaoTian', 'yuYinZhuanWenZiZhong') }}
                  </div>
                  <button
                    v-else-if="shiZhuanWenZiZhanKai(xiaoXi)"
                    type="button"
                    class="yuyin-zhuanwenzi"
                    :aria-label="huoQuFanYi('liaoTian', 'zheDie')"
                    :title="huoQuFanYi('liaoTian', 'zheDie')"
                    @click.stop="qieHuanZhuanWenZiXianShi(xiaoXi)"
                  >
                    {{ huoQuZhuanWenZi(xiaoXi) }}
                  </button>
                  <span
                    v-else-if="shiZhuanWenZiShiBai(xiaoXi)"
                    class="yuyin-zhuanwenzi yuyin-zhuanwenzi-shibai"
                  >
                    {{ huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai') }}
                  </span>
                </div>
                <div v-else-if="xiaoXi.lei_xing === 'wenJian'" class="qipao-waike wenjian-waike">
                  <video
                    v-if="shiShiPinXiaoXi(xiaoXi)"
                    class="shipin-xianshi"
                    :src="huoQuXiaoXiMeiTiURL(xiaoXi)"
                    controls
                    preload="metadata"
                    :aria-label="huoQuFanYi('duoMeiTi', 'boFangShiPin')"
                    @error="shuaXinMeiTiURL(xiaoXi, $event)"
                  />
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
                  <div
                    v-if="shiFanYiZhong(xiaoXi) || shiFanYiZhanKai(xiaoXi)"
                    class="fanyi-yuyan-hang"
                  >
                    <label class="fanyi-yuyan-xiang">
                      <span>{{ huoQuFanYi('liaoTian', 'fanYiYuanYu') }}</span>
                      <select
                        v-model="fanYiYuanYu"
                        class="fanyi-yuyan-xiala"
                        @change="chongXinFanYi(xiaoXi)"
                      >
                        <option value="auto">{{ huoQuFanYi('liaoTian', 'fanYiZiDong') }}</option>
                        <option value="zh">{{ huoQuFanYi('liaoTian', 'fanYiYuYanZh') }}</option>
                        <option value="en">{{ huoQuFanYi('liaoTian', 'fanYiYuYanEn') }}</option>
                        <option value="ja">{{ huoQuFanYi('liaoTian', 'fanYiYuYanJa') }}</option>
                        <option value="ko">{{ huoQuFanYi('liaoTian', 'fanYiYuYanKo') }}</option>
                        <option value="fr">{{ huoQuFanYi('liaoTian', 'fanYiYuYanFr') }}</option>
                        <option value="de">{{ huoQuFanYi('liaoTian', 'fanYiYuYanDe') }}</option>
                        <option value="es">{{ huoQuFanYi('liaoTian', 'fanYiYuYanEs') }}</option>
                        <option value="ru">{{ huoQuFanYi('liaoTian', 'fanYiYuYanRu') }}</option>
                      </select>
                    </label>
                    <label class="fanyi-yuyan-xiang">
                      <span>{{ huoQuFanYi('liaoTian', 'fanYiMuBiaoYu') }}</span>
                      <select
                        v-model="fanYiMuBiaoYu"
                        class="fanyi-yuyan-xiala"
                        @change="chongXinFanYi(xiaoXi)"
                      >
                        <option value="zh">{{ huoQuFanYi('liaoTian', 'fanYiYuYanZh') }}</option>
                        <option value="en">{{ huoQuFanYi('liaoTian', 'fanYiYuYanEn') }}</option>
                        <option value="ja">{{ huoQuFanYi('liaoTian', 'fanYiYuYanJa') }}</option>
                        <option value="ko">{{ huoQuFanYi('liaoTian', 'fanYiYuYanKo') }}</option>
                        <option value="fr">{{ huoQuFanYi('liaoTian', 'fanYiYuYanFr') }}</option>
                        <option value="de">{{ huoQuFanYi('liaoTian', 'fanYiYuYanDe') }}</option>
                        <option value="es">{{ huoQuFanYi('liaoTian', 'fanYiYuYanEs') }}</option>
                        <option value="ru">{{ huoQuFanYi('liaoTian', 'fanYiYuYanRu') }}</option>
                      </select>
                    </label>
                  </div>
                  <div v-if="shiFanYiZhong(xiaoXi)" class="yuyin-zhuanwenzi-zhuangtai">
                    {{ huoQuFanYi('liaoTian', 'fanYiZhong') }}
                  </div>
                  <div v-else-if="shiFanYiZhanKai(xiaoXi)" class="yuyin-zhuanwenzi">
                    {{ huoQuFanYiJieGuo(xiaoXi) }}
                  </div>
                </div>
                <div
                  v-if="
                    !fuPanMoShi &&
                    xiaoXi.fa_song_zhe_lei_xing === 'yonghu' &&
                    (xiaoXi.fa_song_zhong || shiFaSongShiBai(xiaoXi))
                  "
                  class="fasong-zhuangtai"
                  :aria-label="huoQuFaSongZhuangTaiTiShi(xiaoXi)"
                >
                  <span v-if="xiaoXi.fa_song_zhong" class="fasong-zhuangtai-zhuanquan" />
                  <button
                    v-else
                    class="fasong-shibai-jiaobiao"
                    :title="huoQuFanYi('liaoTian', 'chongXinFaSong')"
                    :aria-label="huoQuFanYi('liaoTian', 'chongXinFaSong')"
                    @click.stop="chongShiFaSongXiaoXi(xiaoXi)"
                  >
                    !
                  </button>
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

    <div
      v-if="聊天仓库.weiJiGanYu"
      class="wei-ji-tan-chuang"
      role="alertdialog"
      aria-modal="true"
      :aria-label="huoQuFanYi('liaoTian', 'weiJiGanYuBiaoTi')"
      data-testid="wei-ji-tan-chuang"
    >
      <div class="wei-ji-nei">
        <h2>{{ huoQuFanYi('liaoTian', 'weiJiGanYuBiaoTi') }}</h2>
        <p>{{ 聊天仓库.weiJiGanYu.ganYuTiShi }}</p>
        <p class="wei-ji-re-xian">{{ 聊天仓库.weiJiGanYu.yuanZhuReXian }}</p>
        <div class="wei-ji-an-niu-zu">
          <a
            class="wei-ji-bo-da"
            :href="`tel:${String(聊天仓库.weiJiGanYu.yuanZhuReXian).split(',')[0]}`"
            data-testid="wei-ji-bo-da"
          >{{ huoQuFanYi('liaoTian', 'weiJiBoDaReXian') }}</a>
          <button
            type="button"
            class="wei-ji-guan-bi"
            data-testid="wei-ji-guan-bi"
            @click="聊天仓库.guanBiWeiJiGanYu()"
          >
            {{ huoQuFanYi('liaoTian', 'weiJiZhiXiao') }}
          </button>
        </div>
      </div>
    </div>

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
        <div v-if="yinYongXiaoXi" class="yinyong-yulan">
          <span class="yinyong-biaoqian">{{ huoQuFanYi('liaoTian', 'yinYong') }}</span>
          <span class="yinyong-zhaiyao">{{ huoQuYinYongZhaiYao(yinYongXiaoXi) }}</span>
          <button
            class="yinyong-quxiao"
            :aria-label="huoQuFanYi('liaoTian', 'quXiaoYinYong')"
            @click="quXiaoYinYong"
          >
            ×
          </button>
        </div>
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
            v-if="shuRuNeiRong.length >= XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi"
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
      <div v-if="caoGaoYiHuiFu" class="shuru-fu-zhu" role="status">
        <span class="fasong-cuowu">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</span>
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
          <!-- FP-05 YH-036/YH-037：用户手动生图/生视频按钮已删除（图片与视频由AI对象在合适时主动发起）；通话入口已砍，仅保留TTS语音推送 -->
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
      <Transition name="zhezhao-xianshi">
        <div
          v-if="yuYinCaiDanZhanKai"
          class="chehui-zhezhao"
          @click="guanBiYuYinCaiDan"
        >
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
        <div
          v-if="wenBenCaiDanZhanKai"
          class="chehui-zhezhao"
          @click="guanBiWenBenCaiDan"
        >
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

    <!-- FP-05 YH-037：通话实时链路界面已砍（预留 provider 插槽填 KEY 即用）；TTS 合成经 socket 推 mediaId 语音消息照常 -->

    <!-- C4 首次多媒体授权弹窗：图片/表情包外发视觉理解前单独征得同意 -->
    <DuoMeiTiShouQuanDanChuang
      :xian-shi="shouQuanDanChuangXianShi"
      @que-ren="shouQuanQueRen"
      @ju-jue="shouQuanJuJue"
    />
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
import { 使用用户设置仓库 } from '@/stores/用户设置'

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
import DuoMeiTiShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'
import { chongQianMeiTiURL, fanYiWenBen as fanYiWenBenApi, zhuanXieYuYin } from '@/api/聊天'
import { shiShiPinXiaoXi } from '@/utils/多模态'
import { use复盘 } from '@/composables/use复盘'
import { use长按菜单 } from '@/composables/use长按菜单'
import { use语音转文字 } from '@/composables/use语音转文字'
import { use录音 } from '@/composables/use录音'
import { use虚拟窗口 } from '@/composables/use虚拟窗口'
import { use表情面板 } from '@/composables/use表情面板'
import { use语音播放 } from '@/composables/use语音播放'
import { use输入框 } from '@/composables/use输入框'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'

defineOptions({
  name: 'liaoTian',
})

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const liaoTianBeiJingLeiMing = computed(() => (设置仓库.shiYuShe ? `beijing-${设置仓库.liaoTianBeiJing}` : 'beijing-ziDingYi'))
const liaoTianBeiJingYangShi = computed(() => 设置仓库.beiJingNeiLianYangShi)
const qiPaoYangShi = computed(() => 设置仓库.ziJiQiPaoCSSBianLiang)

const shuRuNeiRong = ref('')
const caoGaoJian = computed(() => {
  const huiHuaId = typeof route.params.huiHuaId === 'string' ? route.params.huiHuaId : ''
  return huiHuaId ? CAO_GAO_JIAN.aiLiaoTian(huiHuaId) : ''
})
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(caoGaoJian, shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const gaoBaiJinXingZhong = ref(false)
const junShiZhanKai = ref(false)
const youXiShiJianZhanKai = ref(false)
const youXiShiJianLeiXing = ref<'shengli' | 'shibai'>('shengli')
const youXiShiJianNeiRong = ref('')
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const shuruKuangRef = ref<HTMLTextAreaElement | null>(null)
const guanLiJianKongZhanKai = ref(false)
const dangQianShiJian = ref(Date.now())
let cheHuiFanZhuanDingShiQi: ReturnType<typeof setTimeout> | null = null
const CHE_HUI_FAN_ZHUAN_HUAN_CHONG_HAO_MIAO = 1000
let yiTongGuoMountedChuShiHua = false

function jiSuanXiaYiCheHuiDaoQiShiKe(): number | null {
  const lieBiao = Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao : []
  let zuiZaoDaoQi: number | null = null
  for (const xiaoXi of lieBiao) {
    if (!xiaoXi || xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') continue
    if (xiaoXi.yi_che_hui) continue
    const chuo = xiaoXi.shi_jian_chuo
    if (typeof chuo !== 'number' || !Number.isFinite(chuo)) continue
    const daoQiShiKe = chuo + XIAO_XI_PEI_ZHI.cheHuiShiXian
    if (daoQiShiKe <= Date.now()) continue
    if (zuiZaoDaoQi === null || daoQiShiKe < zuiZaoDaoQi) zuiZaoDaoQi = daoQiShiKe
  }
  return zuiZaoDaoQi
}

function anPaiCheHuiFanZhuan() {
  if (cheHuiFanZhuanDingShiQi) {
    clearTimeout(cheHuiFanZhuanDingShiQi)
    cheHuiFanZhuanDingShiQi = null
  }
  const xiaYiDaoQiShiKe = jiSuanXiaYiCheHuiDaoQiShiKe()
  if (xiaYiDaoQiShiKe === null) return
  cheHuiFanZhuanDingShiQi = setTimeout(
    () => {
      cheHuiFanZhuanDingShiQi = null
      dangQianShiJian.value = Date.now()
      anPaiCheHuiFanZhuan()
    },
    Math.max(0, xiaYiDaoQiShiKe + CHE_HUI_FAN_ZHUAN_HUAN_CHONG_HAO_MIAO - Date.now()),
  )
}

function tingZhiCheHuiFanZhuan() {
  if (cheHuiFanZhuanDingShiQi) {
    clearTimeout(cheHuiFanZhuanDingShiQi)
    cheHuiFanZhuanDingShiQi = null
  }
}

const {
  huoQuZhuanWenZi,
  shiYuYinZhuanXieZhong,
  shiZhuanWenZiZhanKai,
  shiZhuanWenZiShiBai,
  qieHuanZhuanWenZiXianShi,
} = use语音转文字({
  huoQuYuYinDiZhi: huoQuXiaoXiMeiTiURL,
  zhuanXieQingQiu: async (xiaoXi) => zhuanXieYuYin(xiaoXi.mei_ti_id || ''),
})

const {
  cheHuiCaiDanZhanKai,
  cheHuiCaiDanYangShi,
  daKaiCaiDan,
  chuMoKaiShi,
  chuMoJieShu,
  zhiXingCheHui,
  xianShiCheHuiAnNiu,
  zhiXingCheHuiXiaoXi,
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
  huoQuFanYiJieGuo,
  shiFanYiZhong,
  shiFanYiZhanKai,
  qiangZhiFanYi,
  fanYiYuanYu,
  fanYiMuBiaoYu,
  yinYongXiaoXi,
  quXiaoYinYong,
  huoQuYinYongZhaiYao,
} = use长按菜单({
  dangQianShiJian,
  cheHuiXiaoXi: (xiaoXiId) => 聊天仓库.cheHuiXiaoXi(xiaoXiId),
  qieHuanYuYinZhuanWenZi: (xiaoXi) => qieHuanZhuanWenZiXianShi(xiaoXi),
  fanYiQingQiu: (wenBen, yuanYu, muBiaoYu) => fanYiWenBenApi(wenBen, yuanYu, muBiaoYu),
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
})

function chongXinFanYi(xiaoXi: 消息) {
  void qiangZhiFanYi(xiaoXi)
}

function chuLiYouJianCaiDan(xiaoXi: 消息, shiJian: MouseEvent) {
  if (xiaoXi.lei_xing === 'yuYin') {
    daKaiYuYinCaiDan(xiaoXi, shiJian)
    return
  }
  if (xiaoXi.lei_xing === 'wenben') {
    daKaiWenBenCaiDan(xiaoXi, shiJian)
    return
  }
  daKaiCaiDan(xiaoXi, shiJian)
}

function chuLiChuMoKaiShi(xiaoXi: 消息) {
  if (xiaoXi.lei_xing === 'yuYin') {
    chuMoKaiShiYuYin(xiaoXi)
    return
  }
  if (xiaoXi.lei_xing === 'wenben') {
    chuMoKaiShiWenBen(xiaoXi)
    return
  }
  chuMoKaiShi(xiaoXi)
}

function chuLiChuMoJieShu() {
  chuMoJieShu()
  chuMoJieShuYuYin()
  chuMoJieShuWenBen()
}

const {
  emojiTab,
  emojiMianBanZhanKai,
  changYongEmoji,
  chuShiHuaEmojiGunDongBuChang,
  chongZhiEmojiBuChangJiXian,
  qieHuanEmojiMianBan,
  chaRuEmoji,
  qieHuanEmojiTab,
  yuZaiEmojiZiXing,
  qingLiEmojiZiYuan,
} = use表情面板({
  shuRuNeiRong,
  xiaoxiQuYuRef,
})

const gengDuoMianBanZhanKai = ref(false)
const xiangCeInputRef = ref<HTMLInputElement | null>(null)
const wenJianInputRef = ref<HTMLInputElement | null>(null)
const tuPianJiaZaiJiHe = ref(new Set<string>())
const tuPianYuLanURL = ref<string | null>(null)

// C4 首次多媒体授权：未开启 tuPianShouQuan 时，发送图片/表情包前弹窗征得同意
const shouQuanDanChuangXianShi = ref(false)
let shouQuanDaiQueRenHuiDiao: ((yunXu: boolean) => void) | null = null

function queRenTuPianShouQuan(): Promise<boolean> {
  if (用户仓库.tuPianShouQuan) return Promise.resolve(true)
  return new Promise((jieJue) => {
    shouQuanDaiQueRenHuiDiao = jieJue
    shouQuanDanChuangXianShi.value = true
  })
}

function shouQuanQueRen() {
  用户仓库.sheZhiTuPianShouQuan(true)
  shouQuanDanChuangXianShi.value = false
  shouQuanDaiQueRenHuiDiao?.(true)
  shouQuanDaiQueRenHuiDiao = null
}

function shouQuanJuJue() {
  shouQuanDanChuangXianShi.value = false
  shouQuanDaiQueRenHuiDiao?.(false)
  shouQuanDaiQueRenHuiDiao = null
}

// FP-05 YH-036/YH-037：用户手动生图/生视频与通话相关状态已删除（图片与视频由AI对象在合适时主动发起）

async function benDiZhuanXieYuYinBlob(blob: Blob): Promise<string> {
  try {
    const chuangKou = window as unknown as Record<string, unknown>
    const GouZao = (chuangKou['SpeechRecognition'] ?? chuangKou['webkitSpeechRecognition']) as (new () => {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
      start(): void
      stop(): void
    }) | undefined
    if (!GouZao || typeof Audio === 'undefined') return ''
    const diZhi = URL.createObjectURL(blob)
    try {
      return await new Promise<string>((jieJue) => {
        const shiBieQi = new GouZao()
        shiBieQi.lang = 'zh-CN'
        shiBieQi.interimResults = false
        shiBieQi.maxAlternatives = 1
        const duanLuo: string[] = []
        let yiJieSuan = false
        const jieSuan = (zhi: string) => {
          if (yiJieSuan) return
          yiJieSuan = true
          jieJue(zhi)
        }
        const chaoShi = setTimeout(() => jieSuan(duanLuo.join('').trim().slice(0, 500)), 6000)
        const yinPin = new Audio(diZhi)
        shiBieQi.onresult = (e) => {
          for (let i = 0; i < e.results.length; i++) {
            const jieGuo = e.results[i]
            if (jieGuo && jieGuo.isFinal && jieGuo[0] && jieGuo[0].transcript) duanLuo.push(jieGuo[0].transcript)
          }
        }
        shiBieQi.onerror = () => {
          clearTimeout(chaoShi)
          jieSuan('')
        }
        shiBieQi.onend = () => {
          clearTimeout(chaoShi)
          jieSuan(duanLuo.join('').trim().slice(0, 500))
        }
        yinPin.onended = () => {
          try {
            shiBieQi.stop()
          } catch {
            clearTimeout(chaoShi)
            jieSuan(duanLuo.join('').trim().slice(0, 500))
          }
        }
        yinPin.onerror = () => {
          clearTimeout(chaoShi)
          jieSuan('')
        }
        try {
          shiBieQi.start()
        } catch {
          clearTimeout(chaoShi)
          jieSuan('')
          return
        }
        Promise.resolve(yinPin.play()).catch(() => {
          clearTimeout(chaoShi)
          jieSuan('')
        })
      })
    } finally {
      URL.revokeObjectURL(diZhi)
    }
  } catch {
    return ''
  }
}

const {
  luYinMoShi,
  luYinZhong,
  luYinMiao,
  luYinShangHuaQuXiao,
  qieHuanLuYinMoShi,
  guanBiLuYinMoShi,
  qingLiLuYinZiYuan,
  wanChengLuYin,
  kaiShiLuYin,
  songKaiLuYin,
  quXiaoLuYin,
  chuLiLuYinYiDong,
} = use录音({
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
  faSongYuYin: async (blob, fuJia) => {
    const zhuanXie = await benDiZhuanXieYuYinBlob(blob)
    await 聊天仓库.faSongMeiTiXiaoXi('yuYin', blob, { ...fuJia, zhuanXieWenBen: zhuanXie })
  },
  gunDongDaoDiBu: () => gunDongDaoDiBu(),
})

const {
  YU_YIN_BO_XING_TIAO_SHU,
  shiYuYinBoFangZhong,
  yuYinKuanYangShi,
  geShiHuaYuYinShiChang,
  tingZhiYinPinBoFang,
  qieHuanYuYinBoFang,
  huoQuBoFangJinDu,
  huoQuBoFangZongMiao,
  tiaoZhuanYuYinJinDu,
} = use语音播放({
  huoQuDiZhi: huoQuXiaoXiMeiTiURL,
})

function geShiHuaBoFangJinDu(xiaoXi: 消息): string {
  const miao = Math.max(0, Math.floor(huoQuBoFangJinDu(xiaoXi)))
  return `${miao}″`
}

const {
  shuRuKuangZhanKai,
  zhanKaiAnNiuKeYong,
  shuRuKuangYangShi,
  ceLiangShuRuKuang,
  qieHuanShuRuKuangZhanKai,
  chongSuanShuRuKuangGaoDu,
} = use输入框({
  shuruKuangRef,
  shuRuNeiRong,
})

const {
  fuPanMoShi,
  fuPanDangAnId,
  huoQuPiZhuByXiaoXiId,
  huoQuQingGanLeiXing,
  fuPanZongJie,
  fuPanZongJieFenKuai,
  fuPanJiaZaiZhong,
  jiaZaiFuPanShuJu,
  tuiChuFuPan,
} = use复盘({
  luYou: router,
  huoQuXiaoXiLieBiao: () => 聊天仓库.xiaoXiLieBiao,
  qingKongZhuangTai: () => 聊天仓库.qingKongZhuangTai(),
})

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

// V8：签名 URL 过期（3600s）导致历史图片 403 时，@error 触发后端重签并原地替换 src；
// 每条消息最多重试一次，避免失效媒体造成循环请求
const meiTiChongQianJiLu = new Set<string>()
async function shuaXinMeiTiURL(xiaoXi: 消息, shiJian?: Event): Promise<void> {
  const jian = xiaoXiKey(xiaoXi)
  if (!xiaoXi.mei_ti_id || meiTiChongQianJiLu.has(jian)) return
  meiTiChongQianJiLu.add(jian)
  const huiHuaId = 聊天仓库.jiaoSeXinXi?.id || (route.params.huiHuaId as string) || ''
  if (!huiHuaId) return
  const xinURL = await chongQianMeiTiURL(huiHuaId, xiaoXi.mei_ti_id)
  if (xinURL && shiJian?.target instanceof HTMLImageElement) {
    shiJian.target.src = xinURL
    xiaoXi.mei_ti_url = xinURL
  }
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
  if (!xiaoXi.fa_song_zhong && shiFaSongShiBai(xiaoXi)) {
    return huoQuFanYi('liaoTian', 'chongXinFaSong')
  }
  if (MEI_TI_XIAO_XI_JI_HE.has(xiaoXi.lei_xing)) {
    return huoQuFanYi('duoMeiTi', 'shangChuanZhong')
  }
  return huoQuFanYi('liaoTian', 'faSongZhong')
}

// 首屏骨架屏配置：模拟对话左右交替的灰色气泡（微信加载视觉）
const GU_JIA_QI_PAO_PEI_ZHI = [
  { kuanDu: '150px', shiYouCe: true },
  { kuanDu: '200px', shiYouCe: false },
  { kuanDu: '120px', shiYouCe: true },
  { kuanDu: '220px', shiYouCe: false },
  { kuanDu: '170px', shiYouCe: true },
  { kuanDu: '110px', shiYouCe: false },
]

function shiFaSongShiBai(xiaoXi: 消息): boolean {
  return 聊天仓库.faSongShiBaiJiHe.has(xiaoXiKey(xiaoXi))
}

async function chongShiFaSongXiaoXi(xiaoXi: 消息) {
  await 聊天仓库.chongShiFaSongXiaoXi(xiaoXiKey(xiaoXi))
}

async function chongShiJiaZai() {
  if (聊天仓库.shouPingJiaZaiZhong) return
  await chuShiHuaLiaoTian()
}

function qieHuanGengDuoMianBan() {
  gengDuoMianBanZhanKai.value = !gengDuoMianBanZhanKai.value
  if (gengDuoMianBanZhanKai.value) emojiMianBanZhanKai.value = false
}

function guanBiGengDuoMianBan() {
  gengDuoMianBanZhanKai.value = false
}

// FP-05 YH-037：通话实时链路入口已砍（预留 provider 插槽），不再发起语音/视频通话

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
  // C4：图片外发视觉理解前需单独授权，拒绝则给出翻译占位提示且不发送
  const yunXu = await queRenTuPianShouQuan()
  if (!yunXu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
    return
  }
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
  // C4：表情包同样外发视觉理解，需单独授权
  const yunXu = await queRenTuPianShouQuan()
  emojiMianBanZhanKai.value = false
  if (!yunXu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
    return
  }
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

const liaoTianSuoDing = computed(() => {
  return 聊天仓库.youXiYiJieShu && !聊天仓库.keJiXuLiaoTian
})

const keYiFaSong = computed(() => {
  const neiRong = shuRuNeiRong.value.trim()
  return neiRong.length > 0 && neiRong.length <= XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu
})

const {
  xuNiQiSuoYin,
  xuNiXinHao,
  chongZhiXuNiChuangKou,
  xuNiYinCangQianDiaoShu,
  kuaiSuKuoZhanXiangShang,
  xiaoXiFenZu,
} = use虚拟窗口({
  huoQuXiaoXiLieBiao: () => 聊天仓库.xiaoXiLieBiao,
  xiaoxiQuYuRef,
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
    anPaiCheHuiFanZhuan()
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

function chuLiShuRuBianHua() {
  if (聊天仓库.cuoWuXinXi) {
    聊天仓库.qingChuCuoWu()
  }
}

function chuLiShuRuKuangAnJian(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  faSong()
}

const 管理员调试指令 = 'greedisgood'

async function faSong() {
  const neiRong = shuRuNeiRong.value.trim()
  if (neiRong === 管理员调试指令) {
    guanLiJianKongZhanKai.value = true
    shuRuNeiRong.value = ''
    return
  }
  if (!keYiFaSong.value) return
  if (neiRong.length > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    return
  }
  // FP-05 YH-036：用户手动 /生图 /视频 指令已删除，改为普通文本发送（图片与视频由AI对象在合适时主动发起）
  shuRuNeiRong.value = ''
  qingChuCaoGao()
  shuRuKuangZhanKai.value = false
  faSongZhong.value = true
  try {
    const jieGuo = await 聊天仓库.faSongXiaoXi(neiRong)
    if (jieGuo) {
      quXiaoYinYong()
      if (yiDingZaiDiBu.value) {
        gunDongDaoDiBu()
      }
    }
  } finally {
    faSongZhong.value = false
  }
}

async function jiaZaiGengDuo() {
  if (!聊天仓库.haiYouGengDuo || 聊天仓库.jiaZaiGengDuoZhong) return
  const yuanGaoDu = xiaoxiQuYuRef.value ? xiaoxiQuYuRef.value.scrollHeight : 0
  const zhiQianZongShu = Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao.length : 0
  const jieGuo = await 聊天仓库.jiaZaiGengDuoXiaoXi()
  if (jieGuo && xiaoxiQuYuRef.value) {
    // M5：头部插入使绝对索引整体右移，显式窗口需同步平移以保持当前渲染内容不变；
    // 自动尾部窗口（null）天然按「最新N条」取值，无需调整。更早消息由用户上滑时渐进揭示。
    const xinZengTiaoShu =
      (Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao.length : zhiQianZongShu) -
      zhiQianZongShu
    if (xinZengTiaoShu > 0 && xuNiQiSuoYin.value !== null) {
      xuNiQiSuoYin.value += xinZengTiaoShu
      xuNiXinHao.value++
    }
    await nextTick()
    const xinGaoDu = xiaoxiQuYuRef.value.scrollHeight
    xiaoxiQuYuRef.value.scrollTop = xinGaoDu - yuanGaoDu
  }
}

function chuLiGunDong() {
  // 先更新钉底状态，再判断是否触发加载更多（向上滚时不应被强制拽回底部）
  gengXinDingBuZhuangTai()
  if (!xiaoxiQuYuRef.value) return
  if (xiaoxiQuYuRef.value.scrollTop <= 20) {
    if (聊天仓库.haiYouGengDuo && !聊天仓库.jiaZaiGengDuoZhong) {
      jiaZaiGengDuo()
    }
    // M5：无论是否还有服务端分页，窗口外已加载消息都随上滑渐进揭示
    if (xuNiYinCangQianDiaoShu.value > 0) {
      kuaiSuKuoZhanXiangShang()
    }
  }
}

async function zhiXingGaoBai() {
  if (!聊天仓库.dangQianHuiHuaId || gaoBaiJinXingZhong.value) return
  gaoBaiJinXingZhong.value = true
  try {
    await 聊天仓库.faSongXiaoXi(huoQuFanYi('liaoTian', 'gaoBaiChengGong'))
  } finally {
    gaoBaiJinXingZhong.value = false
  }
}

function fanhuiShouYe() {
  youXiShiJianZhanKai.value = false
  聊天仓库.qingKongZhuangTai()
  router.push('/')
}

// FP-05 YH-036：用户手动生图/生视频点击入口已删除（图片与视频由AI对象在合适时主动发起）

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
  guanBiYuYinCaiDan()
  shuRuKuangZhanKai.value = false
  gengDuoMianBanZhanKai.value = false
  guanBiTuPianYuLan()
  if (luYinZhong.value) {
    void wanChengLuYin(false)
  }
  luYinMoShi.value = false
  tingZhiYinPinBoFang()
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
    // M5：会话数据载入完成后重置虚拟渲染窗口
    chongZhiXuNiChuangKou()
    gunDongDaoDiBu()
    void jiaZaiFuPanShuJu(queryDangAnId)
    return
  }
  fuPanMoShi.value = false
  聊天仓库.meiYeTiaoShu = 50
  await 聊天仓库.jiaZaiXiaoXi(huiHuaId)
  // M5：会话数据载入完成后重置虚拟渲染窗口
  chongZhiXuNiChuangKou()
  聊天仓库.lianJieSocket(huiHuaId)
  gunDongDaoDiBu()
}

onMounted(async () => {
  void 设置仓库.jiaZai()
  caoGaoYiHuiFu.value = huiFuCaoGao()
  window.addEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', chuLiShiJiaoKouBianHua)
    window.visualViewport.addEventListener('scroll', chuLiShiJiaoKouBianHua)
  }
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
  chongZhiEmojiBuChangJiXian()
  anPaiCheHuiFanZhuan()
  nextTick(() => ceLiangShuRuKuang())
  if (!yiTongGuoMountedChuShiHua) {
    return
  }
  await chuShiHuaLiaoTian()
})

onDeactivated(() => {
  tingZhiCheHuiFanZhuan()
  qingLiUIMianBan()
})

onBeforeUnmount(() => {
  qingLiEmojiZiYuan()
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
  tingZhiCheHuiFanZhuan()
  qingLiUIMianBan()
  聊天仓库.qingKongZhuangTai()
})
</script>

<style scoped>
.liaotian-yemian {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--beijing-zhuse);
  font-family:
    -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Arial,
    sans-serif;
}

.aitishi-tiao {
  pointer-events: none;
  user-select: none;
  flex-shrink: 0;
  padding: 3px 12px;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  color: var(--wenben-ciuse);
  background: var(--beijing-ciuse);
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

.xiaoxi-quyu.beijing-miWuSenLin {
  background: linear-gradient(135deg, #1a2f1a, #2d4a2d);
}

.xiaoxi-quyu.beijing-haiYangZhiLan {
  background: linear-gradient(135deg, #1a3a5c, #2d6a9f);
}

.xiaoxi-quyu.beijing-fenSeMengJing {
  background: linear-gradient(135deg, #f7d6e0, #f2a7c3);
}

.xiaoxi-quyu.beijing-yeKongXingHe {
  background: linear-gradient(135deg, #0a0a23, #1a1a4d);
}

.xiaoxi-quyu.beijing-miSeTianYuan {
  background: linear-gradient(135deg, #f5f0e1, #e8dcc3);
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
  border-radius: 6px;
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
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
  border-radius: 6px;
}

.yonghu-xiaoxi .qipao-neirong::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 13px;
  width: 0;
  height: 0;
  border-left: 6px solid var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.jiaose-xiaoxi .qipao-neirong {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
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
  border-right: 6px solid var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
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

.fasong-shibai-jiaobiao {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--cuowu-yanse);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.gujia-liebiao {
  display: flex;
  flex-direction: column;
  margin-top: auto;
}

.gujia-xiangmu {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.gujia-xiangmu.gujia-zuoce {
  flex-direction: row;
  align-self: flex-start;
}

.gujia-xiangmu.gujia-youce {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.gujia-touxiang {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--shijian-biaoqian-beijing);
  flex-shrink: 0;
}

.gujia-zuoce .gujia-touxiang {
  margin-right: 10px;
}

.gujia-youce .gujia-touxiang {
  margin-left: 10px;
}

.gujia-qipao {
  display: inline-block;
  height: 38px;
  border-radius: 6px;
  background: var(--shijian-biaoqian-beijing);
}

.jiazai-shibai-qu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  padding: 24px 16px;
}

.shibai-chahua {
  width: 72px;
  height: 48px;
  margin-bottom: 12px;
  color: var(--wenben-tishi);
  opacity: 0.8;
}

.shibai-biaoti {
  margin: 0 0 4px;
  font-size: 15px;
  color: var(--wenben-ciuse);
}

.shibai-tishi {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--wenben-tishi);
}

.chongshi-anniu {
  padding: 7px 28px;
  border: none;
  border-radius: 6px;
  background: var(--shijian-biaoqian-beijing);
  color: var(--wenben-zhuse);
  font-size: 14px;
  cursor: pointer;
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
  flex-wrap: wrap;
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
  width: 44px;
  height: 44px;
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
  padding: 10px 14px;
  min-height: 44px;
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
  width: 44px;
  height: 44px;
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
  transition: transform 0.25s var(--quxian-tan-chu);
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
  transition: transform 0.3s var(--quxian-tan-chu);
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
  transition: all 0.25s var(--quxian-biao-zhun);
}

.xiaoxi-guodu-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.emoji-zhankai-enter-active {
  transition: all 0.25s var(--quxian-tan-chu);
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.yuyin-qipao {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--xiaoxi-yonghu-wenben);
  background: var(--xiaoxi-yonghu-beijing);
  min-height: 38px;
  position: relative;
}

.yonghu-xiaoxi .yuyin-qipao {
  flex-direction: row-reverse;
}

.yonghu-xiaoxi .yuyin-qipao::after {
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

.jiaose-xiaoxi .yuyin-qipao {
  background: var(--xiaoxi-jiaose-beijing);
  color: var(--xiaoxi-jiaose-wenben);
}

.jiaose-xiaoxi .yuyin-qipao::after {
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

.yuyin-shengyin-tubiao {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  opacity: 0.9;
}

.yuyin-shengyin-tubiao.tubiao-youce {
  transform: scaleX(-1);
}

.yuyin-jindu-qu {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.yuyin-jindu-tiao {
  flex: 1;
  min-width: 60px;
  accent-color: currentColor;
}

.yuyin-jindu-wenben {
  font-size: 11px;
  opacity: 0.85;
  white-space: nowrap;
}

.yuyin-zhuanwenzi {
  margin-top: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: var(--xiaoxi-jiaose-beijing);
  color: var(--xiaoxi-jiaose-wenben);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  text-align: left;
}

button.yuyin-zhuanwenzi {
  cursor: pointer;
}

.yonghu-xiaoxi .yuyin-zhuanwenzi {
  background: var(--xiaoxi-yonghu-beijing);
  color: var(--xiaoxi-yonghu-wenben);
}

.yuyin-zhuanwenzi-shibai {
  color: var(--cuowu-wenben);
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.yonghu-xiaoxi .yuyin-zhuanwenzi-shibai,
.jiaose-xiaoxi .yuyin-zhuanwenzi-shibai {
  color: var(--cuowu-wenben);
}

span.yuyin-zhuanwenzi {
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
}

.yonghu-xiaoxi .yuyin-waike {
  align-items: flex-end;
}

.yuyin-zhuanwenzi-zhuangtai {
  margin-top: 6px;
  font-size: 12px;
  color: var(--wenben-tishi);
}

.fanyi-yuyan-hang {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--wenben-tishi);
}

.fanyi-yuyan-xiang {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fanyi-yuyan-xiala {
  font-size: 12px;
  color: inherit;
  background: transparent;
  border: 1px solid var(--biankuang-yanse);
  border-radius: 4px;
  padding: 2px 4px;
}

.yinyong-yulan {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--beijing-ciuse);
  border-left: 3px solid var(--zhuse);
  font-size: 13px;
}

.yinyong-biaoqian {
  color: var(--zhuse);
  font-weight: 600;
  flex-shrink: 0;
}

.yinyong-zhaiyao {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--wenben-ciuse);
}

.yinyong-quxiao {
  border: none;
  background: transparent;
  color: var(--wenben-tishi);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

/* ─── 多媒体消息：文件卡片气泡 ─── */
.wenjian-waike {
  max-width: min(calc(100vw - 126px), 320px);
}

.shipin-xianshi {
  width: 100%;
  max-width: min(calc(100vw - 126px), 320px);
  max-height: 240px;
  border-radius: var(--yuanjiao-xiao);
  background: #000;
  margin-bottom: 6px;
}

/* FP-05 YH-036/YH-037：用户手动生图/生视频按钮已删除，残留样式一并清理 */

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
  background: rgba(20, 20, 22, 0.92);
  border: 0.5px solid rgba(255, 255, 255, 0.12);
  box-shadow: var(--tanchuang-yinying);
  color: #f5f5f7;
}

.luyin-mianban .luyin-tishi-wen,
.luyin-mianban .luyin-jishi {
  color: rgba(245, 245, 247, 0.85);
}

.luyin-mianban .luyin-guanbi-anniu {
  background: rgba(255, 255, 255, 0.12);
  color: #f5f5f7;
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

/* FP-03 气泡主题单源：派生气泡（语音/文件/转写）统一跟随 --qipao-*；
   置于样式末尾，以同权后胜覆盖上方各派生规则，文本气泡基规则已在原位直引变量 */
.yonghu-xiaoxi .yuyin-qipao,
.yonghu-xiaoxi .wenjian-qipao,
.yonghu-xiaoxi .yuyin-zhuanwenzi {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}
.jiaose-xiaoxi .yuyin-qipao,
.jiaose-xiaoxi .wenjian-qipao,
.jiaose-xiaoxi .yuyin-zhuanwenzi,
.yuyin-zhuanwenzi {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
}
.yonghu-xiaoxi .yuyin-qipao::after {
  border-left: 6px solid var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}
.jiaose-xiaoxi .yuyin-qipao::after {
  border-right: 6px solid var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
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
