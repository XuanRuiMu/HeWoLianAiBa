<template>
  <div class="liaotian-yemian" data-chat-scope="true">
    <TiShiDai :cuo-wu="fuPanMoShi ? null : 聊天仓库.cuoWuXinXi" />
    <div v-if="聊天仓库.jiaoSeQianTaiCuoWu">
      <RequestError
        :cuo-wu="聊天仓库.jiaoSeQianTaiCuoWu"
        mi-xi
        @chong-shi="chongShiJiaZai"
      />
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
          <span v-if="!qiPao.shiYouCe" class="gujia-wei" />
          <span class="gujia-qipao" :style="{ width: qiPao.kuanDu }" />
          <span v-if="qiPao.shiYouCe" class="gujia-wei" />
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
        <div class="shibai-tishi">
          <RequestError
            :cuo-wu="聊天仓库.shouPingQianTaiCuoWu"
            mi-xi
            @chong-shi="chongShiJiaZai"
          />
        </div>
      </div>
      <KongTai
        v-if="!聊天仓库.shouPingJiaZaiZhong && !聊天仓库.jiaZaiShiBai && xiaoXiZongShu === 0"
        :biao-ti="huoQuFanYi('liaoTian', 'haiMeiKaiKou').replace('{mingZi}', jiaoSeMingZi)"
        :ti-shi="huoQuFanYi('liaoTian', 'haiMeiKaiKouTiShi')"
      />
      <TransitionGroup name="xiaoxi-guodu" tag="div" class="xiaoxi-liebiao">
        <template v-for="(zu, suoYin) in xiaoXiFenZu" :key="'zu-' + suoYin">
          <ShiJianTiao :shi-jian="zu.shiJian" :shi-jian-chuo="zu.shiJianChuo" />
          <template v-for="xiaoXi in zu.xiaoXiLieBiao" :key="xiaoXi.ke_hu_duan_id || xiaoXi.id">
            <div
              v-if="xiaoXi.lei_xing !== 'neiXinHuoDong'"
              :id="yinYongXiangId(xiaoXi)"
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
                <div v-if="xiaoXi.fa_song_zhe_lei_xing === 'jiaose'" class="xiaoxi-wei">
                  <TouXiang
                    :tou-xiang="聊天仓库.jiaoSeXinXi?.tou_xiang"
                    :mo-ren-zi="聊天仓库.jiaoSeXinXi?.tou_xiang"
                    shen-fen="jiaose"
                  />
                </div>
                <div v-if="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'" class="xiaoxi-wei">
                  <TouXiang
                    :tou-xiang="用户仓库.dangQianYongHu?.tou_xiang"
                    :mo-ren-zi="用户仓库.dangQianYongHu?.tou_xiang"
                    shen-fen="yonghu"
                  />
                </div>
                <button
                  v-if="!fuPanMoShi && xianShiCheHuiAnNiu(xiaoXi)"
                  class="chehui-anniu"
                  @click.stop="zhiXingCheHuiXiaoXi(xiaoXi)"
                >
                  {{ huoQuFanYi('liaoTian', 'cheHui') }}
                </button>
                
                <div
                  v-if="xiaoXi.lei_xing === 'tuPian' && !shiXuYaoKuaiXuanRan(xiaoXi)"
                  class="qipao-waike tupian-waike"
                >
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
                  v-else-if="xiaoXi.lei_xing === 'biaoQingBao' && !shiXuYaoKuaiXuanRan(xiaoXi)"
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
                  <YuYinQiPao
                    :xiao-xi="xiaoXi"
                    :bo-fang-zhong="shiYuYinBoFangZhong(xiaoXi)"
                    :xuan-zhong="shiYuYinXuanZhong(xiaoXi)"
                    :jin-du-miao="huoQuBoFangJinDu(xiaoXi)"
                    :zong-miao="huoQuBoFangZongMiao(xiaoXi)"
                    :shi-ben-ren="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'"
                    @qie-huan="chuLiYuYinDianJi(xiaoXi)"
                    @tiao-zhuan="tiaoZhuanYuYinJinDu(xiaoXi, $event)"
                  />
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
                  <WenJianQiPao
                    :shi-ben-ren="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'"
                    :ming-cheng="huoQuWenJianMing(xiaoXi)"
                    :da-xiao="huoQuWenJianDaXiaoWenBen(xiaoXi)"
                    :xia-zai-di-zhi="huoQuXiaoXiMeiTiURL(xiaoXi)"
                    :xia-zai-ming="huoQuWenJianMing(xiaoXi)"
                  />
                </div>
                <div v-else class="qipao-waike">
                  <QiPaoRongQi :shi-ben-ren="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'">
                    
                    <template v-if="shiXuYaoKuaiXuanRan(xiaoXi)">
                      <span
                        v-for="(kuai, kuaiSuoYin) in huoQuXianShiKuai(xiaoXi)"
                        :key="`${xiaoXiKey(xiaoXi)}-${kuaiSuoYin}`"
                        class="tuwen-kuai"
                        :class="kuai.lei_xing === 'tupian' ? 'tuwen-kuai--tu' : 'tuwen-kuai--wen'"
                      >
                        <img
                          v-if="kuai.lei_xing === 'tupian'"
                          class="tuwen-kuai-tu"
                          :class="{ 'tuwen-kuai-tu--biaoqingbao': shiBiaoQingBaoKuai(kuai) }"
                          :src="kuai.mei_ti_url || huoQuXiaoXiMeiTiURL(xiaoXi)"
                          :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
                          loading="lazy"
                          decoding="async"
                          @click.stop="daKaiTuPianYuLan(xiaoXi, kuai.mei_ti_url)"
                          @error="shuaXinMeiTiURL(xiaoXi, $event)"
                        />
                        <template v-else>{{ kuai.nei_rong }}</template>
                      </span>
                    </template>
                    <template v-else>{{ xiaoXi.nei_rong }}</template>
                  </QiPaoRongQi>
                  
                  <YinYongQiPaoKuai
                    v-if="xiaoXi.bei_yong_xiao_xi_id"
                    :bei-yong-xiao-xi-id="xiaoXi.bei_yong_xiao_xi_id"
                    :lie-biao="聊天仓库.xiaoXiLieBiao"
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
        
        <YinYongTiao
          v-if="yinYongXiaoXi"
          :zhai-yao="huoQuYinYongZhaiYao(yinYongXiaoXi)"
          :fa-song-zhe-ming="yinYongFaSongZheMing(yinYongXiaoXi)"
          @guan-bi="quXiaoYinYong"
        />
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
        
        <TuWenShuRuQu
          ref="shuruQuRef"
          :kuai-lie-biao="daiFaKuai"
          :wen-ben="shuRuNeiRong"
          :guang-biao="daiFaGuangBiao"
          :zhan-wei-fu="huoQuFanYi('liaoTian', 'shuRuXiaoXi')"
          :zui-da-chang-du="XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu"
          :zhan-kai="shuRuKuangZhanKai"
          @geng-xin-guang-biao="daiFaGengXinGuangBiao"
          @bian-ji="chuLiShuRuQuBianJi"
          @cha-ru-wen-ben="chaRuShuRuQuWenBen"
          @fa-song="faSong"
          @ju-jiao="chuLiShuRuKuangJuJiao"
          @zhan-tie="chuLiZhanTie"
          @tuo-fang="chuLiTuoFang"
          @shan-chu="shanChuDaiFaKuai"
          @yi-dong="yiDongDaiFaKuai"
        />
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
          class="fasong-anniu"
          :disabled="!keYiFaSong"
          :aria-disabled="!keYiFaSong"
          @click="faSong"
        >
          {{ huoQuFanYi('liaoTian', 'faSong') }}
        </button>
      </div>
      <div v-if="caoGaoYiHuiFu" class="shuru-fu-zhu" role="status">
        <span class="fasong-cuowu">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</span>
      </div>
      
      <div v-if="biaoQingCaoZuoTiShi" class="shuru-fu-zhu" role="status">
        <span class="biaoqing-tishi">{{ biaoQingCaoZuoTiShi }}</span>
      </div>
      <Transition name="emoji-zhankai">
        <div
          v-show="!fuPanMoShi && emojiMianBanZhanKai"
          ref="emojiMianBanRef"
          class="emoji-mianban"
        >
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
          <div v-show="emojiTab === 'biaoqingbao'" class="biaoqingbao-quyu">
            <section class="biaoqingbao-fenqu">
              <div class="fenqu-biaoti-hang">
                <span class="fenqu-biaoti">{{ huoQuFanYi('duoMeiTi', 'woDeBiaoQing') }}</span>
                <button
                  v-if="表情仓库.woDeBiaoQing.length > 1"
                  class="fenqu-guanli"
                  @click.stop="qieHuanBiaoQingGuanLi"
                >
                  {{
                    biaoQingGuanLiMoShi
                      ? huoQuFanYi('duoMeiTi', 'wanChengGuanLi')
                      : huoQuFanYi('duoMeiTi', 'guanLiBiaoQing')
                  }}
                </button>
              </div>
              <div class="biaoqingbao-wangge" :class="{ guanli: biaoQingGuanLiMoShi }">
                <div
                  v-for="(biaoQing, xiaBiao) in 表情仓库.woDeBiaoQing"
                  :key="biaoQing.id"
                  class="biaoqingbao-ge"
                >
                  <button
                    class="biaoqingbao-xiangmu wo-de"
                    :title="biaoQing.duan_ming"
                    @click="faSongBiaoQing(biaoQing)"
                  >
                    <img
                      class="biaoqingbao-tupian"
                      :src="biaoQing.mei_ti_url"
                      :alt="biaoQing.duan_ming"
                      @error="qingQiuBiaoQingZhongLa"
                    />
                  </button>
                  <div v-if="biaoQingGuanLiMoShi" class="ge-caoZuo-zu">
                    <button
                      class="ge-caoZuo qian-yi"
                      :disabled="xiaBiao === 0"
                      :title="huoQuFanYi('duoMeiTi', 'qianYiBiaoQing')"
                      :aria-label="huoQuFanYi('duoMeiTi', 'qianYiBiaoQing')"
                      @click.stop="yiDongBiaoQing('qian', biaoQing.id)"
                    >
                      ‹
                    </button>
                    <button
                      class="ge-caoZuo hou-yi"
                      :disabled="xiaBiao === 表情仓库.woDeBiaoQing.length - 1"
                      :title="huoQuFanYi('duoMeiTi', 'houYiBiaoQing')"
                      :aria-label="huoQuFanYi('duoMeiTi', 'houYiBiaoQing')"
                      @click.stop="yiDongBiaoQing('hou', biaoQing.id)"
                    >
                      ›
                    </button>
                    <button
                      class="ge-caoZuo shan-chu"
                      :title="huoQuFanYi('duoMeiTi', 'shanChuBiaoQing')"
                      :aria-label="huoQuFanYi('duoMeiTi', 'shanChuBiaoQing')"
                      @click.stop="shanChuBiaoQing(biaoQing.id)"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <button
                  class="biaoqingbao-xiangmu tian-jia"
                  :disabled="表情仓库.tianJiaZhong"
                  :title="huoQuFanYi('duoMeiTi', 'congBenDiTianJia')"
                  :aria-label="huoQuFanYi('duoMeiTi', 'congBenDiTianJia')"
                  @click="daKaiBiaoQingXuanZe"
                >
                  <span class="tian-jia-jia">＋</span>
                  <span class="biaoqingbao-wenzi">
                    {{
                      表情仓库.tianJiaZhong
                        ? huoQuFanYi('duoMeiTi', 'biaoQingZhengZaiTianJia')
                        : huoQuFanYi('duoMeiTi', 'congBenDiTianJia')
                    }}
                  </span>
                </button>
              </div>
            </section>
            <section class="biaoqingbao-fenqu">
              <div class="fenqu-biaoti-hang">
                <span class="fenqu-biaoti">{{ huoQuFanYi('duoMeiTi', 'neiZhiBiaoQing') }}</span>
              </div>
              <div class="biaoqingbao-wangge">
                <button
                  v-for="tieZhi in BIAO_QING_BAO_LIE_BIAO"
                  :key="tieZhi.id"
                  class="biaoqingbao-xiangmu"
                  @click="jiaRuDaiFaTieZhi(tieZhi)"
                >
                  <span class="biaoqingbao-emoji">{{ tieZhi.emoji }}</span>
                  <span class="biaoqingbao-wenzi">{{ tieZhi.wenZi }}</span>
                </button>
              </div>
            </section>
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
      <input
        ref="biaoQingInputRef"
        class="yincang-wenjian-shuru"
        type="file"
        :accept="BIAO_QING_TIAN_JIA_PEI_ZHI.wenJianJieShou"
        @change="chuLiBiaoQingXuanZe"
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

    <Teleport to="body">
      <GuanLiJianKong
        v-if="guanLiJianKongZhanKai && 用户仓库.keGuanLiZhiDu"
        @close="guanLiJianKongZhanKai = false"
      />
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
            <span class="luyin-dianping-zu" aria-hidden="true">
              <span
                v-for="(qiangDu, xuHao) in luYinBoXing"
                :key="xuHao"
                class="luyin-dianping-tiao"
                :style="{ height: yinBoGaoDu(qiangDu) }"
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
import { 使用聊天仓库, type MeiTiFuJia } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用表情仓库 } from '@/stores/表情'

import { huoQuFanYi } from '@/config/翻译表'
import KongTai from '@/components/空态.vue'
import {
  XIAO_XI_PEI_ZHI,
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
  MEI_TI_XIAO_XI_LEI_XING,
  YIN_YONG_DING_WEI_PEI_ZHI,
  huoQuMeiTiYinYongZhanWei,
  duQuHeChengYinLiang,
} from '@/config/消息配置'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { yaSuoTuPiang } from '@/utils/图片压缩'
import { queDingMiDengJian } from '@/utils/发件箱'
import {
  xuanRanBiaoQingBao,
  BIAO_QING_BAO_LIE_BIAO,
  type BiaoQingBaoDingYi,
} from '@/utils/表情包库'
import type { BiaoQingXiang } from '@/api/表情'
import type { 消息, DuoMeiTiLeiXing } from '@/types/类型定义'
import JunShiZhiDao from '@/components/军师指导.vue'
import GuanLiJianKong from '@/components/管理员监控.vue'
import DuoMeiTiShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import YinYongTiao from '@/components/聊天/引用条.vue'
import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'
import FanYiJieGuo from '@/components/聊天/翻译结果框.vue'
import QiPaoRongQi from '@/components/聊天/气泡容器.vue'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import WenJianQiPao from '@/components/聊天/文件气泡.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'
import TiShiDai from '@/components/提示带.vue'
import RequestError from '@/components/请求错误.vue'
import TouXiang from '@/components/头像.vue'
import { chongQianMeiTiURL, fanYiWenBen as fanYiWenBenApi, zhuanXieYuYin } from '@/api/聊天'
import { shiShiPinXiaoXi } from '@/utils/多模态'
import { use复盘 } from '@/composables/use复盘'
import { fuZhiWenBen, use长按菜单, type CaiDanXiaoXi } from '@/composables/use长按菜单'
import { use添加到表情 } from '@/composables/use添加到表情'
import { use表情提交 } from '@/composables/use表情提交'
import { use表情提示条 } from '@/composables/use表情提示条'
import { use图片授权门 } from '@/composables/use图片授权门'
import { use语音转文字 } from '@/composables/use语音转文字'
import { use录音 } from '@/composables/use录音'
import { use虚拟窗口 } from '@/composables/use虚拟窗口'
import { use表情面板 } from '@/composables/use表情面板'
import { use语音播放 } from '@/composables/use语音播放'
import { use粘贴图片 } from '@/composables/use粘贴图片'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { use输入区展开档 } from '@/composables/use输入区展开档'
import {
  BIAO_QING_BAO_MEI_TI_LEI_BIE,
  huoQuXianShiKuai,
  shiBiaoQingBaoKuai,
  shiXuYaoKuaiXuanRan,
} from '@/utils/消息内容块'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'

defineOptions({
  name: 'liaoTian',
})

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const 表情仓库 = 使用表情仓库()
const liaoTianBeiJingLeiMing = computed(() => (设置仓库.shiYuShe ? `beijing-${设置仓库.liaoTianBeiJing}` : 'beijing-ziDingYi'))
const liaoTianBeiJingYangShi = computed(() => 设置仓库.beiJingNeiLianYangShi)
const qiPaoYangShi = computed(() => 设置仓库.ziJiQiPaoCSSBianLiang)

function duQuShengYinYinLiang(): number | null {
  try {
    return duQuHeChengYinLiang()
  } catch {
    return null
  }
}

function yinBoGaoDu(qiangDu: number): string {
  const biLi = Math.max(0.08, Math.min(1, Number(qiangDu) || 0))
  return `${Math.round(biLi * 100)}%`
}

const shuRuNeiRong = ref('')
const caoGaoJian = computed(() => {
  const huiHuaId = typeof route.params.huiHuaId === 'string' ? route.params.huiHuaId : ''
  return huiHuaId ? CAO_GAO_JIAN.aiLiaoTian(huiHuaId) : ''
})
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(caoGaoJian, shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const daiFaTouDiZhong = ref(false)
const junShiZhanKai = ref(false)
const youXiShiJianZhanKai = ref(false)
const youXiShiJianLeiXing = ref<'shengli' | 'shibai'>('shengli')
const youXiShiJianNeiRong = ref('')
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const shuruQuRef = ref<InstanceType<typeof TuWenShuRuQu> | null>(null)
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
  jiLuZhuanXie,
} = use语音转文字({
  huoQuYuYinDiZhi: huoQuXiaoXiMeiTiURL,
  zhuanXieQingQiu: async (xiaoXi) => zhuanXieYuYin(xiaoXi.mei_ti_id || ''),
  huoQuYinLiang: duQuShengYinYinLiang,
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
  yinYongXiaoXi,
  quXiaoYinYong,
  huoQuYinYongZhaiYao: zhengWenZhaiYaoChuKou,
} = use长按菜单({
  dangQianShiJian,
  zhiChiTuPianYinYong: true,
  cheHuiXiaoXi: (xiaoXiId) => 聊天仓库.cheHuiXiaoXi(xiaoXiId),
  qieHuanYuYinZhuanWenZi: (xiaoXi) => qieHuanZhuanWenZiXianShi(xiaoXi),
  fanYiQingQiu: (wenBen, yuanYu, muBiaoYu) => fanYiWenBenApi(wenBen, yuanYu, muBiaoYu),
  tianJiaDaoBiaoQing: (xiaoXi) => tianJiaTuPianDaoBiaoQing(xiaoXi),
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
})

const { tianJiaTuPianDaoBiaoQing } = use添加到表情({
  huoQuMeiTiURL: (xiaoXi) => huoQuXiaoXiMeiTiURL(xiaoXi),
  huoQuWenJianMing: (xiaoXi) => xiaoXi.mei_ti_yuan_shi_wen_jian_ming || undefined,
  chongQianMeiTiURL: (xiaoXi) => chongQianXiaoXiMeiTiURL(xiaoXi),
  tiJiaoWenJian: (wenJian) => tiJiaoBiaoQingWenJian(wenJian),
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
  sheZhiTiShi: (xinXi) => xianShiBiaoQingTiShi(xinXi),
})

function huoQuFanYiZhuangTai(xiaoXi: 消息): 'loading' | 'success' | 'empty' | 'error' {
  if (shiFanYiZhong(xiaoXi)) return 'loading'
  if (shiFanYiChuCuo(xiaoXi)) return 'error'
  if (shiFanYiKong(xiaoXi) || !huoQuFanYiJieGuo(xiaoXi)?.trim()) return 'empty'
  return 'success'
}

function gaiFanYiYuanYu(zhi: string, xiaoXi: 消息): void {
  fanYiYuanYu.value = zhi
  chongXinFanYi(xiaoXi)
}

function gaiFanYiMuBiaoYu(zhi: string, xiaoXi: 消息): void {
  fanYiMuBiaoYu.value = zhi
  chongXinFanYi(xiaoXi)
}

function chongXinFanYi(xiaoXi: 消息) {
  void qiangZhiFanYi(xiaoXi)
}

function yinYongXiangId(xiaoXi: 消息): string {
  return `${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}${xiaoXi.id}`
}

function huoQuXiaoXiGunDongRongQi(): HTMLElement | null {
  return xiaoxiQuYuRef.value
}

function yinYongFaSongZheMing(muBiao: CaiDanXiaoXi): string {
  if (muBiao.fa_song_zhe_lei_xing === 'yonghu') {
    return 用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  }
  return 聊天仓库.jiaoSeXinXi?.ming_zi || ''
}

function huoQuYinYongZhaiYao(muBiao: CaiDanXiaoXi): string {
  return huoQuMeiTiYinYongZhanWei(muBiao.lei_xing) ?? zhengWenZhaiYaoChuKou(muBiao)
}


const zaiTuZhiFaMeiTiId = new Set<string>()
const zaiTuZhiFaWenJian = new Set<Blob>()

async function faSongMeiTiZhiFa(
  leiXing: DuoMeiTiLeiXing,
  wenJian: File | Blob | null,
  fuJia?: MeiTiFuJia,
): Promise<消息 | null> {
  const yiYouMeiTiId = fuJia?.yiYouMeiTi?.meiTiId ?? ''
  const zaiTu = yiYouMeiTiId
    ? zaiTuZhiFaMeiTiId.has(yiYouMeiTiId)
    : !!wenJian && zaiTuZhiFaWenJian.has(wenJian)
  if (zaiTu) return null
  if (yiYouMeiTiId) zaiTuZhiFaMeiTiId.add(yiYouMeiTiId)
  else if (wenJian) zaiTuZhiFaWenJian.add(wenJian)
  try {
    const jieGuo = await 聊天仓库.faSongMeiTiXiaoXi(
      leiXing,
      wenJian,
      fuJia ?? {},
      yinYongXiaoXi.value?.id ?? null,
    )
    if (jieGuo) quXiaoYinYong()
    return jieGuo
  } finally {
    if (yiYouMeiTiId) zaiTuZhiFaMeiTiId.delete(yiYouMeiTiId)
    else if (wenJian) zaiTuZhiFaWenJian.delete(wenJian)
  }
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
  if (xiaoXi.lei_xing === 'tuPian') {
    daKaiTuPianCaiDan(xiaoXi, shiJian)
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
  if (xiaoXi.lei_xing === 'tuPian') {
    chuMoKaiShiTuPian(xiaoXi)
    return
  }
  chuMoKaiShi(xiaoXi)
}

function chuLiChuMoJieShu() {
  chuMoJieShu()
  chuMoJieShuYuYin()
  chuMoJieShuWenBen()
  chuMoJieShuTuPian()
}

const yiDingZaiDiBu = ref(true)
const DING_BUYu_Zhi_PX = 40

const {
  emojiTab,
  emojiMianBanZhanKai,
  emojiMianBanRef,
  changYongEmoji,
  qieHuanEmojiMianBan,
  chaRuEmoji,
  qieHuanEmojiTab,
  yuZaiEmojiZiXing,
  qingLiEmojiZiYuan,
} = use表情面板({
  shuRuNeiRong,
  xiaoxiQuYuRef,
  dingZaiDiBu: yiDingZaiDiBu,
})

const gengDuoMianBanZhanKai = ref(false)
const xiangCeInputRef = ref<HTMLInputElement | null>(null)
const wenJianInputRef = ref<HTMLInputElement | null>(null)
const biaoQingInputRef = ref<HTMLInputElement | null>(null)
const biaoQingGuanLiMoShi = ref(false)
const tuPianJiaZaiJiHe = ref(new Set<string>())
const tuPianYuLanURL = ref<string | null>(null)

const {
  xianShi: shouQuanDanChuangXianShi,
  queRenTuPianShouQuan,
  shouQuanQueRen,
  shouQuanJuJue,
} = use图片授权门({
  huoQuYiShouQuan: () => 用户仓库.tuPianShouQuan,
  sheZhiYiShouQuan: (yunXu) => 用户仓库.sheZhiTuPianShouQuan(yunXu),
})


const {
  luYinMoShi,
  luYinZhong,
  luYinMiao,
  luYinShangHuaQuXiao,
  luYinBoXing,
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
    const xiaoXi = await faSongMeiTiZhiFa('yuYin', blob, fuJia)
    if (xiaoXi?.mei_ti_id) {
      void zhuanXieYuYin(xiaoXi.mei_ti_id).then((wenBen) => {
        if (!wenBen) return
        xiaoXi.nei_rong = wenBen.trim().slice(0, 500)
        jiLuZhuanXie(xiaoXi, wenBen)
      })
    }
  },
  gunDongDaoDiBu: () => gunDongDaoDiBu(),
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
  huoQuDiZhi: huoQuXiaoXiMeiTiURL,
  huoQuYinLiang: duQuShengYinYinLiang,
})

const { chuLiZhanTie, chuLiTuoLuo } = use粘贴图片({
  fanJiaTuPian: (wenJian) => jiaruDaiFaTuPian(wenJian),
  fanJiaWenZi: (wenBen) => chaRuShuRuQuWenBen(wenBen),
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
})

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
  chuangJianYuLan: (wenJian) => URL.createObjectURL(wenJian),
  huiShouYuLan: (diZhi) => {
    if (diZhi) URL.revokeObjectURL(diZhi)
  },
})

const daiFaTouDiZaiTi: { mi_deng_jian?: string | null } = { mi_deng_jian: null }
const daiFaQianMing = computed(() =>
  [
    shouJiDaiFaKuai()
      .map((kuai) => `${kuai.id}\u0001${kuai.nei_rong}\u0001${kuai.mei_ti_id ?? ''}`)
      .join('\u0002'),
    shuRuNeiRong.value,
    yinYongXiaoXi.value?.id ?? '',
  ].join('\u0003'),
)
watch(
  daiFaQianMing,
  () => {
    daiFaTouDiZaiTi.mi_deng_jian = null
  },
  { flush: 'sync' },
)

const { shuRuKuangZhanKai, qieHuanZhanKaiDang, shouQiZhanKaiDang } = use输入区展开档({
  shuRuNeiRong,
  youTuPianKuai: daiFaYouTuPian,
})

function qieHuanShuRuKuangZhanKai(): void {
  qieHuanZhanKaiDang()
  void nextTick(() => {
    shuruQuRef.value?.focus()
  })
}

function chuLiShuRuQuBianJi(duan: BianJiQiDuan[], xianShiXuanRanIds: string[]): void {
  daiFaTongBuCongBianJiQi(duan, xianShiXuanRanIds)
  chuLiShuRuBianHua()
}

function chaRuShuRuQuWenBen(wenBen: string, guangBiao?: DaiFaGuangBiao | null): void {
  const shengYu = XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu - shuRuNeiRong.value.length
  if (shengYu <= 0) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    return
  }
  daiFaChaRuWenZi(wenBen.slice(0, shengYu), guangBiao ?? null)
}

function chuLiTuoFang(shiJian: DragEvent): void {
  chuLiTuoLuo(shiJian)
}


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

function shiXiTongXiaoXi(xiaoXi: 消息): boolean {
  return xiaoXi.lei_xing === 'xitong' || xiaoXi.fa_song_zhe_lei_xing === 'xitong'
}

function huoQuXiaoXiMeiTiURL(xiaoXi: 消息): string | undefined {
  return (xiaoXi.mei_ti_url || xiaoXi.ben_di_yu_lan_url || undefined) as string | undefined
}

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

async function chongQianXiaoXiMeiTiURL(xiaoXi: 消息): Promise<string | null> {
  if (!xiaoXi.mei_ti_id) return null
  const huiHuaId = 聊天仓库.jiaoSeXinXi?.id || (route.params.huiHuaId as string) || ''
  if (!huiHuaId) return null
  const xinURL = await chongQianMeiTiURL(huiHuaId, xiaoXi.mei_ti_id)
  if (xinURL) xiaoXi.mei_ti_url = xinURL
  return xinURL
}

function shiTuPianYiJiaZai(xiaoXi: 消息): boolean {
  return tuPianJiaZaiJiHe.value.has(xiaoXiKey(xiaoXi))
}

function biaoJiTuPianYiJiaZai(xiaoXi: 消息) {
  tuPianJiaZaiJiHe.value.add(xiaoXiKey(xiaoXi))
}

function daKaiTuPianYuLan(xiaoXi: 消息, kuaiDiZhi?: string | null) {
  if (tuPianCaiDanZhanKai.value) return
  const diZhi = kuaiDiZhi || huoQuXiaoXiMeiTiURL(xiaoXi)
  if (!diZhi) return
  tuPianYuLanURL.value = diZhi
}

function guanBiTuPianYuLan() {
  tuPianYuLanURL.value = null
}

const MEI_TI_XIAO_XI_JI_HE = new Set<string>(MEI_TI_XIAO_XI_LEI_XING)

function huoQuFaSongZhuangTaiTiShi(xiaoXi: 消息): string {
  if (!xiaoXi.fa_song_zhong && shiFaSongShiBai(xiaoXi)) {
    return huoQuFanYi('liaoTian', 'chongXinFaSong')
  }
  if (MEI_TI_XIAO_XI_JI_HE.has(xiaoXi.lei_xing)) {
    return huoQuFanYi('duoMeiTi', 'shangChuanZhong')
  }
  return huoQuFanYi('liaoTian', 'faSongZhong')
}

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


function daKaiXiangCe() {
  guanBiGengDuoMianBan()
  xiangCeInputRef.value?.click()
}

function daKaiWenJianXuanZe() {
  guanBiGengDuoMianBan()
  wenJianInputRef.value?.click()
}

function jiaruDaiFaTuPian(wenJian: File | Blob): void {
  if (!聊天仓库.dangQianHuiHuaId) return
  const jieGuo = chaRuDaiFaTuPian(wenJian, 'tupian')
  if (jieGuo.yuanYin === 'chao_xian') {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'kuaiChaoXian'))
  }
  const zaiTu = yaSuoTuPiang(wenJian)
    .then((yaSuoBlob) => {
      daiHuanDaiFaKuaiWenJian(jieGuo.kuaiId, yaSuoBlob)
    })
    .catch(() => {
      聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'yaSuoShiBai'))
    })
  dengJiDaiFaYaSuo(zaiTu)
}

async function chuLiXiangCeXuanZe(event: Event) {
  const shuRu = event.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  jiaruDaiFaTuPian(wenJian)
}

async function chuLiWenJianXuanZe(event: Event) {
  const shuRu = event.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian || !聊天仓库.dangQianHuiHuaId) return
  await faSongMeiTiZhiFa('wenJian', wenJian)
  gunDongDaoDiBu()
}

async function jiaRuDaiFaTieZhi(tieZhi: BiaoQingBaoDingYi) {
  if (!聊天仓库.dangQianHuiHuaId) return
  emojiMianBanZhanKai.value = false
  try {
    const blob = await xuanRanBiaoQingBao(tieZhi.emoji, tieZhi.wenZi)
    const wenJian = new File([blob], `${tieZhi.id}.png`, { type: blob.type || 'image/png' })
    const jieGuo = chaRuDaiFaTuPian(wenJian, BIAO_QING_BAO_MEI_TI_LEI_BIE)
    if (jieGuo.yuanYin === 'chao_xian') {
      聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'kuaiChaoXian'))
    }
  } catch {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'))
  }
}

const biaoQingZhongLaYiFa = ref(false)
const {
  tiShi: biaoQingCaoZuoTiShi,
  xianShi: xianShiBiaoQingTiShi,
  yinXia: tingZhiBiaoQingTiShi,
} = use表情提示条()
const { tiJiaoBiaoQingWenJian } = use表情提交({
  queRenTuPianShouQuan,
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
})

function daKaiBiaoQingXuanZe() {
  biaoQingInputRef.value?.click()
}

async function chuLiBiaoQingXuanZe(event: Event) {
  const shuRu = event.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  await tiJiaoBiaoQingWenJian(wenJian)
}

async function faSongBiaoQing(biaoQing: BiaoQingXiang) {
  if (!聊天仓库.dangQianHuiHuaId) return
  const yunXu = await queRenTuPianShouQuan()
  emojiMianBanZhanKai.value = false
  if (!yunXu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
    return
  }
  await faSongMeiTiZhiFa('biaoQingBao', null, {
    yiYouMeiTi: { meiTiId: biaoQing.mei_ti_id, meiTiUrl: biaoQing.mei_ti_url },
    wenJianMing: biaoQing.duan_ming || undefined,
  })
  gunDongDaoDiBu()
}

async function shanChuBiaoQing(id: string) {
  const chengGong = await 表情仓库.shanChu(id)
  if (!chengGong && 表情仓库.cuoWuXinXi) 聊天仓库.sheZhiCuoWu(表情仓库.cuoWuXinXi)
}

async function yiDongBiaoQing(fangXiang: 'qian' | 'hou', id: string) {
  await 表情仓库.yiDong(fangXiang, id)
  if (表情仓库.cuoWuXinXi) 聊天仓库.sheZhiCuoWu(表情仓库.cuoWuXinXi)
}

function qieHuanBiaoQingGuanLi() {
  biaoQingGuanLiMoShi.value = !biaoQingGuanLiMoShi.value
}

function qingQiuBiaoQingZhongLa() {
  if (biaoQingZhongLaYiFa.value) return
  biaoQingZhongLaYiFa.value = true
  void 表情仓库.chongXinJiaZai()
}

watch(emojiMianBanZhanKai, (zhanKai) => {
  if (!zhanKai) {
    biaoQingGuanLiMoShi.value = false
    return
  }
  biaoQingZhongLaYiFa.value = false
  const yongHuId = 用户仓库.dangQianYongHu?.id || ''
  if (yongHuId) void 表情仓库.jiaZai(yongHuId)
})

function huoQuWenJianMing(xiaoXi: 消息): string {
  return (
    xiaoXi.mei_ti_yuan_shi_wen_jian_ming || xiaoXi.nei_rong || huoQuFanYi('duoMeiTi', 'wenJian')
  )
}

function huoQuWenJianDaXiaoWenBen(xiaoXi: 消息): string {
  const ziJie = xiaoXi.ben_di_da_xiao_zi_jie
  if (!ziJie || ziJie <= 0) return ''
  const MB = 1024 * 1024
  if (ziJie >= MB) return `${(ziJie / MB).toFixed(1)}MB`
  return `${Math.max(1, Math.round(ziJie / 1024))}KB`
}

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
  if (daiFaTouDiZhong.value) return false
  const neiRong = shuRuNeiRong.value.trim()
  if (neiRong.length > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) return false
  return neiRong.length > 0 || daiFaYouTuPian.value
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
  if (jianPanPianYi > 80 && yiDingZaiDiBu.value) {
    huaDongShuRuLanKeJian()
  }
}

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
  if (yiDingZaiDiBu.value) huaDongShuRuLanKeJian()
}

const xiaoXiZongShu = computed(() => (Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao.length : 0))

const jiaoSeMingZi = computed(() => {
  const mingZi = 聊天仓库.jiaoSeXinXi?.wei_xin_ming
  return typeof mingZi === 'string' && mingZi.trim() ? mingZi.trim() : huoQuFanYi('liaoTian', 'duiFang')
})

watch(
  () => (Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao.length : 0),
  () => {
    if (yiDingZaiDiBu.value) gunDongDaoDiBu()
    anPaiCheHuiFanZhuan()
  },
)

watch(
  () => 聊天仓库.youXiShiJian,
  (shiJian) => {
    if (!shiJian) return
    const jieSuanShiJian = shiJian as {
      xiao_xi: string
      jie_guo_wen_an?: string
      shi_fou_tong_guan?: boolean
    }
    youXiShiJianLeiXing.value = jieSuanShiJian.shi_fou_tong_guan === true ? 'shengli' : 'shibai'
    youXiShiJianNeiRong.value = jieSuanShiJian.jie_guo_wen_an?.trim() || shiJian.xiao_xi
    youXiShiJianZhanKai.value = true
  },
)

function chuLiShuRuBianHua() {
  if (聊天仓库.cuoWuXinXi) {
    聊天仓库.qingChuCuoWu()
  }
}

const 管理员调试指令 = 'greedisgood'

async function faSongDaiFaTuWen(): Promise<void> {
  if (daiFaTouDiZhong.value) return
  if (daiFaKuaiChaoXian()) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'kuaiChaoXian'))
    return
  }
  daiFaTouDiZhong.value = true
  try {
    const yunXu = await queRenTuPianShouQuan()
    if (!yunXu) {
      聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
      return
    }
    await dengDaiDaiFaYaSuoWanCheng()
    const daiFa = shouJiDaiFaKuai()
    if (daiFa.length === 0) return
    const faChuQianMing = daiFaQianMing.value
    const faChuMiDengJian = queDingMiDengJian(daiFaTouDiZaiTi)
    const jieGuo = await 聊天仓库.faSongTuWenXiaoXi(
      daiFa,
      yinYongXiaoXi.value?.id ?? null,
      faChuMiDengJian,
    )
    if (jieGuo) {
      if (daiFaQianMing.value === faChuQianMing) {
        qingKongDaiFaKuai()
        qingChuCaoGao()
        shouQiZhanKaiDang()
        quXiaoYinYong()
      }
      if (yiDingZaiDiBu.value) gunDongDaoDiBu()
    }
  } finally {
    daiFaTouDiZhong.value = false
  }
}

async function faSong() {
  const neiRong = shuRuNeiRong.value.trim()
  if (neiRong === 管理员调试指令) {
    await 用户仓库.queBaoShenFenJiuXu()
    if (!用户仓库.keGuanLiZhiDu) {
      await 用户仓库.queBaoShenFenJiuXu(true)
    }
    if (用户仓库.keGuanLiZhiDu) {
      guanLiJianKongZhanKai.value = true
      聊天仓库.queBaoJianKongDingYue()
    } else {
      聊天仓库.sheZhiCuoWu(huoQuFanYi('liaoTian', 'guanLiMianBanWuQuanXian'))
    }
    shuRuNeiRong.value = ''
    return
  }
  if (!keYiFaSong.value) return
  if (neiRong.length > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    return
  }
  if (daiFaYouTuPian.value) {
    await faSongDaiFaTuWen()
    return
  }
  shuRuNeiRong.value = ''
  qingChuCaoGao()
  shouQiZhanKaiDang()
  faSongZhong.value = true
  try {
    const jieGuo = await 聊天仓库.faSongXiaoXi(neiRong, yinYongXiaoXi.value?.id ?? null)
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
  gengXinDingBuZhuangTai()
  if (!xiaoxiQuYuRef.value) return
  if (xiaoxiQuYuRef.value.scrollTop <= 20) {
    if (聊天仓库.haiYouGengDuo && !聊天仓库.jiaZaiGengDuoZhong) {
      jiaZaiGengDuo()
    }
    if (xuNiYinCangQianDiaoShu.value > 0) {
      kuaiSuKuoZhanXiangShang()
    }
  }
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
  guanBiYuYinCaiDan()
  guanBiTuPianCaiDan()
  tingZhiBiaoQingTiShi()
  shouQiZhanKaiDang()
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
    chongZhiXuNiChuangKou()
    gunDongDaoDiBu()
    void jiaZaiFuPanShuJu(queryDangAnId)
    return
  }
  fuPanMoShi.value = false
  聊天仓库.meiYeTiaoShu = 50
  await 聊天仓库.jiaZaiXiaoXi(huiHuaId)
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
  document.addEventListener('click', chuLiWenDangDianJi, true)
  document.addEventListener('visibilitychange', chuLiYeMianKeJianXing)
  yuZaiEmojiZiXing()
  await chuShiHuaLiaoTian()
  yiTongGuoMountedChuShiHua = true
})

onActivated(async () => {
  anPaiCheHuiFanZhuan()
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

.xiaoxi-quyu {
  
  --liaotian-gundong-tiao: rgba(110, 110, 110, 0.85);
  --liaotian-gundong-tiao-hover: rgba(80, 80, 80, 0.95);
  --liaotian-gundong-tiao-track: rgba(140, 140, 140, 0.16);
  overflow-y: auto;
  min-height: 0;
  
  padding: var(--jiange-12) var(--jiange-zhong);
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--liaotian-beijing);
  background-size: 18px 18px;
  -webkit-overflow-scrolling: touch;
  
  scroll-padding-bottom: calc(var(--jiange-zhong) + var(--jiange-4));
  
  scrollbar-gutter: stable;
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
  background: var(--liaotian-beijing-miWuSenLin);
}

.xiaoxi-quyu.beijing-haiYangZhiLan {
  background: var(--liaotian-beijing-haiYangZhiLan);
}

.xiaoxi-quyu.beijing-fenSeMengJing {
  background: var(--liaotian-beijing-fenSeMengJing);
}

.xiaoxi-quyu.beijing-yeKongXingHe {
  background: var(--liaotian-beijing-yeKongXingHe);
}

.xiaoxi-quyu.beijing-miSeTianYuan {
  background: var(--liaotian-beijing-miSeTianYuan);
}

.xiaoxi-quyu.beijing-chenWuQing {
  background: var(--liaotian-beijing-chenWuQing);
}

.xiaoxi-quyu.beijing-muZiXingYe {
  background: var(--liaotian-beijing-muZiXingYe);
}

.xiaoxi-liebiao {
  display: flex;
  flex-direction: column;
  
  margin-top: auto;
}

.jiazaigengduo-qu {
  display: flex;
  justify-content: center;
  padding: var(--jiange-10) 0 var(--jiange-6);
}

.jiazaigengduo-anniu {
  padding: var(--jiange-5) calc(var(--jiange-12) + var(--jiange-2));
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

.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  max-width: 100%;
  margin-bottom: var(--jiange-zhong);
  position: relative;
}

.xiaoxi-xiangmu:first-of-type {
  margin-top: var(--jiange-4);
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
  margin-bottom: var(--jiange-10);
}

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

.yonghu-xiaoxi .xiaoxi-wei {
  margin-left: var(--jiange-10);
}

.jiaose-xiaoxi .xiaoxi-wei {
  margin-right: var(--jiange-10);
}

.qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}

.fasong-zhuangtai {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  
  padding: 0 var(--jiange-4);
}

.fasong-zhuangtai-zhuanquan {
  display: inline-block;
  
  width: 1.25em;
  height: 1.25em;
  border: 0.15em solid var(--wenben-tishi);
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
  
  width: 1.25em;
  height: 1.25em;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--cuowu-yanse);
  color: #ffffff;
  font-size: 0.8em;
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
  margin-bottom: var(--jiange-zhong);
}

.gujia-xiangmu.gujia-zuoce {
  flex-direction: row;
  align-self: flex-start;
}

.gujia-xiangmu.gujia-youce {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.gujia-wei {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--shijian-biaoqian-beijing);
  flex-shrink: 0;
}

.gujia-zuoce .gujia-wei {
  margin-right: var(--jiange-10);
}

.gujia-youce .gujia-wei {
  margin-left: var(--jiange-10);
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
  padding: var(--jiange-da) var(--jiange-zhong);
}

.shibai-chahua {
  width: 72px;
  height: 48px;
  margin-bottom: var(--jiange-12);
  color: var(--wenben-tishi);
  opacity: 0.8;
}

.shibai-biaoti {
  margin: 0 0 var(--jiange-4);
  font-size: 15px;
  color: var(--wenben-ciuse);
}

.shibai-tishi {
  margin: 0 0 var(--jiange-zhong);
  font-size: 13px;
  color: var(--wenben-tishi);
  max-width: 420px;
}

.chongshi-anniu {
  padding: var(--jiange-7) calc(var(--jiange-da) + var(--jiange-4));
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
  padding: var(--jiange-4) 0;
}

.chehui-tishi {
  font-size: 12px;
  color: var(--wenben-tishi);
  text-align: center;
  padding: var(--jiange-4) 0;
}

.chehui-anniu {
  display: none;
}

.weixin-shuru {
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

.suoding-tishi {
  text-align: center;
  font-size: 13px;
  color: var(--wenben-ciuse);
  padding: var(--jiange-10) 0;
  opacity: 0.8;
}


.yuyin-anniu,
.biaoqing-anniu,
.gengduo-plus-anniu {
  position: relative;
  width: var(--shuru-tubiao-chicun);
  height: var(--shuru-tubiao-chicun);
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
.gengduo-plus-anniu svg {
  width: var(--shuru-tubiao-glyph-chicun);
  height: var(--shuru-tubiao-glyph-chicun);
}

.yuyin-anniu::before,
.biaoqing-anniu::before,
.gengduo-plus-anniu::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.biaoqing-anniu.huoyue,
.gengduo-plus-anniu.huoyue,
.yuyin-anniu.huoyue {
  color: var(--zhuse);
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
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease, background-color 0.15s ease;
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

.fasong-anniu:hover:not(:disabled) {
  opacity: 0.85;
}

.fasong-anniu:disabled {
  background: var(--fasong-anniu-jinyong-beijing);
  cursor: not-allowed;
}

.fasong-cuowu {
  font-size: 12px;
  color: var(--cuowu-yanse);
}

.shuru-dibu-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-4);
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
  position: relative;
  width: var(--shuru-tubiao-chicun);
  height: var(--shuru-tubiao-chicun);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--shuru-fu-anniu-se);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  margin-right: var(--jiange-4);
}

.zhan-kai-anniu::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.zhan-kai-anniu svg {
  width: 14px;
  height: 14px;
  transition: transform 0.25s var(--quxian-tan-chu);
}

.zhan-kai-anniu.zhan-kai svg {
  transform: rotate(180deg);
}



.emoji-mianban {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--jiange-2);
  padding: var(--jiange-xiao);
  background: var(--beijing-ciuse);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  max-height: 200px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  
  scrollbar-gutter: stable;
  
  
  --emoji-mianban-gundong-tiao: var(--gundong-tiao-huakuai);
  --emoji-mianban-gundong-tiao-hover: var(--gundong-tiao-huakuai-hover);
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
  color: var(--wenben-zhuse);
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.15s var(--quxian-biao-zhun);
  padding: 0;
}


@media (hover: hover) {
  .emoji-xiangmu:hover {
    background: var(--caidan-active);
  }
}

.emoji-xiangmu:active {
  background: var(--caidan-active);
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
  padding: var(--jiange-da);
}

.youxi-tanchuang {
  width: 100%;
  max-width: 300px;
  padding: var(--jiange-da) calc(var(--jiange-zhong) + var(--jiange-4));
  background: var(--tanchuang-beijing);
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--tanchuang-yinying);
  border: 0.5px solid var(--tanchuang-biankuang);
}

.youxi-tubiao {
  font-size: 48px;
  margin-bottom: var(--jiange-12);
}

.youxi-biaoti {
  font-size: 18px;
  font-weight: 600;
  color: var(--tanchuang-biaoti);
  margin-bottom: var(--jiange-xiao);
}

.youxi-miaoshu {
  font-size: 14px;
  color: var(--wenben-ciuse);
  margin-bottom: calc(var(--jiange-zhong) + var(--jiange-4));
  line-height: 1.5;
}

.youxi-anniu-zu {
  display: flex;
  gap: var(--jiange-12);
}

.youxi-anniu {
  flex: 1;
  padding: var(--jiange-10);
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
  padding: 0 var(--jiange-xiao);
  
  overflow-y: auto;
}



.fupan-pizhu-xiangmu {
  display: flex;
  margin-bottom: var(--jiange-12);
  margin-top: calc(var(--jiange-xiao) * -1);
  padding: 0 calc(var(--jiange-da) * 2 + var(--jiange-2));
}

.fupan-pizhu-xiangmu.yonghu-pizhu {
  justify-content: flex-end;
}

.fupan-pizhu-xiangmu.jiaose-pizhu {
  justify-content: flex-start;
}

.fupan-pizhu-qipao {
  max-width: min(calc(100vw - 126px), 520px);
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: 8px;
  background: rgba(108, 92, 231, 0.12);
  border: 1px solid rgba(108, 92, 231, 0.25);
  border-left-width: 3px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
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
  padding: var(--jiange-da) var(--jiange-zhong) var(--jiange-zhong);
}

.fupan-jiazai-tishi {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-xiao) var(--jiange-zhong);
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
  margin: calc(var(--jiange-zhong) + var(--jiange-4)) var(--jiange-zhong) var(--jiange-da);
  padding: var(--jiange-zhong);
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
  margin-bottom: var(--jiange-10);
}

.fupan-zongjie-neirong {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.fupan-zongjie-fenkuai {
  padding: var(--jiange-10) var(--jiange-12);
  margin-bottom: var(--jiange-xiao);
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
  gap: var(--jiange-4);
  font-size: 13px;
  font-weight: 700;
  color: var(--yanse-zhanji, #6c5ce7);
  margin-bottom: var(--jiange-4);
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
  margin-top: var(--jiange-10);
  padding: var(--jiange-xiao) var(--jiange-12);
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
  padding: var(--jiange-10) 0;
}

.fupan-tuichu-anniu {
  padding: var(--jiange-xiao) var(--jiange-da);
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
  
  -webkit-touch-callout: none;
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


.biaoqingbao-waike {
  background: transparent !important;
}

.biaoqingbao-tu {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
  display: block;
}


.yuyin-waike {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}


.luyin-dianping-zu {
  --luyin-dianping-tiaokuan: 3px;
  display: flex;
  align-items: center;
  gap: var(--jiange-2);
  height: 20px;
  flex-shrink: 0;
}

.luyin-dianping-tiao {
  width: var(--luyin-dianping-tiaokuan);
  height: 100%;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.85;
  transition: height 0.08s linear;
}

.yuyin-zhuanwenzi {
  margin-top: var(--jiange-6);
  padding: var(--jiange-xiao) var(--jiange-12);
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
  background: transparent;
  color: var(--cuowu-wenben);
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
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
  margin-top: var(--jiange-6);
  font-size: 12px;
  color: var(--wenben-tishi);
}


.tuwen-kuai--tu {
  display: block;
}

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


.wenjian-waike {
  max-width: min(calc(100vw - 126px), 320px);
}

.shipin-xianshi {
  width: 100%;
  max-width: min(calc(100vw - 126px), 320px);
  max-height: 240px;
  border-radius: var(--yuanjiao-xiao);
  background: #000;
  margin-bottom: var(--jiange-6);
}




.tupian-yulan-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: var(--zhezhao-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
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


.mianban-tab-hang {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--jiange-4);
  padding-bottom: var(--jiange-6);
  border-bottom: 0.5px solid var(--shuru-quyu-biankuang);
}

.mianban-tab {
  flex: 1;
  padding: var(--jiange-5) 0;
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
  
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: var(--jiange-6);
}

.biaoqingbao-wangge.guanli {
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.biaoqingbao-xiangmu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-2);
  min-width: 0;
  padding: var(--jiange-6) var(--jiange-2);
  
  border: 1px solid var(--biankuang-yanse);
  border-radius: 6px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  cursor: pointer;
  transition: background-color 0.15s var(--quxian-biao-zhun), border-color 0.15s var(--quxian-biao-zhun);
}

@media (hover: hover) {
  .biaoqingbao-xiangmu:hover {
    background: var(--caidan-active);
    border-color: var(--biankuang-zhongjian);
  }
}

.biaoqingbao-xiangmu:active {
  background: var(--caidan-active);
}

.biaoqingbao-xiangmu.wo-de {
  padding: var(--jiange-5);
}

.biaoqingbao-emoji {
  font-size: 34px;
  line-height: 1.2;
}

.biaoqingbao-wenzi {
  font-size: 11px;
  
  color: var(--wenben-zhuse);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}



.biaoqingbao-quyu {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.biaoqingbao-fenqu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  min-width: 0;
}

.biaoqingbao-fenqu + .biaoqingbao-fenqu {
  padding-top: var(--jiange-xiao);
  border-top: 0.5px solid var(--biankuang-fenqu);
}

.fenqu-biaoti-hang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-6);
}

.fenqu-biaoti {
  font-size: var(--ziti-xiao);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.fenqu-guanli {
  flex-shrink: 0;
  min-height: 24px;
  padding: var(--jiange-3) var(--jiange-10);
  border: 1px solid var(--biankuang-zhongjian);
  border-radius: 6px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.15s var(--quxian-biao-zhun), border-color 0.15s var(--quxian-biao-zhun);
}

@media (hover: hover) {
  .fenqu-guanli:hover {
    background: var(--caidan-active);
    border-color: var(--wenben-ciuse);
  }
}

.fenqu-guanli:active {
  background: var(--caidan-active);
}

.biaoqingbao-ge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-4);
  min-width: 0;
}


.biaoqingbao-tupian {
  display: block;
  width: 100%;
  max-width: 72px;
  height: 56px;
  object-fit: contain;
}

.ge-caoZuo-zu {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--jiange-4);
}

.ge-caoZuo {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--biankuang-zhongjian);
  border-radius: 50%;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: var(--ziti-da);
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s var(--quxian-biao-zhun), border-color 0.15s var(--quxian-biao-zhun);
}

@media (hover: hover) {
  .ge-caoZuo:hover:not(:disabled) {
    background: var(--caidan-active);
    border-color: var(--wenben-ciuse);
  }
}

.ge-caoZuo:active:not(:disabled) {
  background: var(--caidan-active);
}


.ge-caoZuo:disabled {
  background: var(--beijing-ciuse);
  border-color: var(--biankuang-qianse);
  color: var(--wenben-ciuse);
  cursor: not-allowed;
}

.biaoqingbao-xiangmu.tian-jia {
  gap: var(--jiange-6);
  min-height: 70px;
  border-style: dashed;
  border-color: var(--biankuang-zhongjian);
  background: transparent;
  color: var(--wenben-zhuse);
}

.biaoqingbao-xiangmu.tian-jia:disabled .biaoqingbao-wenzi {
  color: var(--wenben-ciuse);
}

.tian-jia-jia {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--biankuang-zhongjian);
  border-radius: 50%;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: var(--ziti-da);
  line-height: 1;
}

@media (hover: hover) {
  .biaoqingbao-xiangmu.tian-jia:hover:not(:disabled) {
    background: var(--caidan-active);
    border-color: var(--wenben-ciuse);
  }

  .biaoqingbao-xiangmu.tian-jia:hover:not(:disabled) .tian-jia-jia {
    border-color: var(--wenben-ciuse);
  }
}


.biaoqingbao-xiangmu.tian-jia:active:not(:disabled) {
  background: var(--caidan-active);
}

.biaoqingbao-xiangmu.tian-jia:disabled {
  border-color: var(--biankuang-qianse);
  color: var(--wenben-ciuse);
  cursor: not-allowed;
}

.biaoqingbao-xiangmu.tian-jia:disabled .tian-jia-jia {
  background: transparent;
  border-color: var(--biankuang-qianse);
  color: var(--wenben-ciuse);
}


.gengduo-mianban {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-xiao);
  padding: var(--jiange-10);
  background: var(--beijing-ciuse);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  border-radius: var(--yuanjiao-zhong);
}

.gengduo-rukou {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-6);
  padding: var(--jiange-12) var(--jiange-4);
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


.yincang-wenjian-shuru {
  display: none;
}


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
  gap: var(--jiange-zhong);
  padding: calc(var(--jiange-da) + var(--jiange-4)) calc(var(--jiange-da) + var(--jiange-xiao));
  border-radius: var(--yuanjiao-da);
  background: var(--tanchuang-beijing);
  border: 0.5px solid var(--tanchuang-biankuang);
  box-shadow: var(--tanchuang-yinying);
  color: var(--tanchuang-biaoti);
}

.luyin-mianban .luyin-tishi-wen,
.luyin-mianban .luyin-jishi {
  color: var(--tanchuang-biaoti);
  opacity: 0.85;
}

.luyin-mianban .luyin-guanbi-anniu {
  background: var(--tanchuang-biankuang);
  color: var(--tanchuang-biaoti);
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


.yonghu-xiaoxi .yuyin-zhuanwenzi {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}
.jiaose-xiaoxi .yuyin-zhuanwenzi,
.yuyin-zhuanwenzi {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
}

.yonghu-xiaoxi .yuyin-zhuanwenzi-shibai,
.yuyin-waike .yuyin-zhuanwenzi-shibai {
  background: transparent;
  color: var(--cuowu-wenben);
}

.luyin-zhuangtai-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
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
  padding: var(--jiange-6) calc(var(--jiange-zhong) + var(--jiange-6));
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

  .xiaoxi-quyu {
    padding: var(--jiange-10) var(--jiange-12);
  }

  .fupan-pizhu-qipao {
    max-width: min(calc(100vw - 120px), 420px);
  }
}
</style>
