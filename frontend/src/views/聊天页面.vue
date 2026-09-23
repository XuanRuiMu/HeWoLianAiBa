<template>
  <div class="liaotian-yemian">
    <TiShiDai :cuo-wu="fuPanMoShi ? null : 聊天仓库.cuoWuXinXi" />
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
        <p class="shibai-tishi">{{ huoQuFanYi('liaoTian', 'jiaZaiShiBaiTiShi') }}</p>
        <button class="chongshi-anniu" @click="chongShiJiaZai">
          {{ huoQuFanYi('liaoTian', 'chongShi') }}
        </button>
      </div>
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
                <!-- FP-10a 反转后这两支（图片 / 表情包媒体气泡）只接住"反构不出图片块"的脏行：
                     旧服务端行缺 nei_rong_kuai 且 mei_ti_id 为空/非法时判据为 false，仍由这里按
                     消息级地址兜底画，不至于空气泡。正常行一律改走下面的块渲染，勿当死分支删除 -->
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
                    :jin-du-miao="huoQuBoFangJinDu(xiaoXi)"
                    :zong-miao="huoQuBoFangZongMiao(xiaoXi)"
                    :shi-ben-ren="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'"
                    @qie-huan="qieHuanYuYinBoFang(xiaoXi)"
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
                  <div class="qipao-neirong">
                    <!-- FP-10b（缺陷9）：服务端回读的块数组按原序渲染，刷新后与发送时同序；
                         FP-10a 反转判据后「含图片块」即走这里（纯图/纯贴纸单块行也不例外），
                         纯文本行与反构不出图片块的脏行仍走 v-else / 上面的媒体分支兜底 -->
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
                  </div>
                  <!-- FP-09（需求 #5 表现层）气泡内引用块：摘要按 bei_yong_xiao_xi_id 在会话列表里现取，
                       点它滚动定位原消息并高亮；已撤回/取不到一律走既有撤回占位文案，不空白也不抛错 -->
                  <YinYongQiPaoKuai
                    v-if="xiaoXi.bei_yong_xiao_xi_id"
                    :bei-yong-xiao-xi-id="xiaoXi.bei_yong_xiao_xi_id"
                    :lie-biao="聊天仓库.xiaoXiLieBiao"
                    :gun-dong-rong-qi="huoQuXiaoXiGunDongRongQi"
                    :fa-song-zhe-ming="yinYongFaSongZheMing"
                  />
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
        <!-- FP-09（需求 #5 表现层）发送前引用条：落在编辑器上方的同一 flex 槽位（输入区几何一字未动），
             摘要两行溢出省略，关闭钮是原生 button ⇒ 键盘可达可激活；形态与数值全部由组件唯一实现承载 -->
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
        <!-- FP-10c（需求 #6 终态）图文真内联：文字段与图片/贴纸块在同一条 contenteditable 文字流里，
             块插在光标处、随文字排版、整块一次退格删除、块可拖拽改序与单块删除。
             本区唯一的输入区实现就是 components/聊天/图文输入区.vue（好友页共用同一份），
             页面只持有「展开档」这一个布尔量与真源出口，不再有 JS 量高、不再有第二份块状态。
             引用条（FP-09）仍是输入区上方的整行槽位，与本盒互不顶开；
             FP-05 的等高构造、FP-23 的图标等高与 FP-04a 的滚动口机制一字未动。 -->
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
      <!-- FP-20：「添加到表情」的成功/已在库反馈走状态条（role=status），与红色错误行分道，不把幂等命中报成错误 -->
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

    <!-- FP-20：图片气泡（含 AI 发来的图）长按/右键菜单，唯一新增项是「添加到表情」，可撤回时并列撤回 -->
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
                v-for="tiao in LU_YIN_PEI_ZHI.dianPingTiaoShu"
                :key="tiao"
                class="luyin-dianping-tiao luyin-dianping-huo"
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
import { 使用聊天仓库, type MeiTiFuJia } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用表情仓库 } from '@/stores/表情'

import { huoQuFanYi } from '@/config/translations'
import {
  XIAO_XI_PEI_ZHI,
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
  MEI_TI_XIAO_XI_LEI_XING,
  YIN_YONG_DING_WEI_PEI_ZHI,
  huoQuMeiTiYinYongZhanWei,
  LU_YIN_PEI_ZHI,
} from '@/config/消息配置'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { yaSuoTuPiang } from '@/utils/图片压缩'
import {
  xuanRanBiaoQingBao,
  BIAO_QING_BAO_LIE_BIAO,
  type BiaoQingBaoDingYi,
} from '@/utils/表情包库'
import type { BiaoQingXiang } from '@/api/表情'
import type { 消息, DuoMeiTiLeiXing } from '@/types'
import JunShiZhiDao from '@/components/军师指导.vue'
import GuanLiJianKong from '@/components/管理员监控.vue'
import DuoMeiTiShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import YinYongTiao from '@/components/聊天/引用条.vue'
import YinYongQiPaoKuai from '@/components/聊天/引用气泡块.vue'
import YuYinQiPao from '@/components/聊天/语音气泡.vue'
import WenJianQiPao from '@/components/聊天/文件气泡.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'
import TiShiDai from '@/components/提示带.vue'
import TouXiang from '@/components/头像.vue'
import { chongQianMeiTiURL, fanYiWenBen as fanYiWenBenApi, zhuanXieYuYin } from '@/api/聊天'
import { shiShiPinXiaoXi } from '@/utils/多模态'
import { use复盘 } from '@/composables/use复盘'
import { use长按菜单, type CaiDanXiaoXi } from '@/composables/use长按菜单'
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

const shuRuNeiRong = ref('')
const caoGaoJian = computed(() => {
  const huiHuaId = typeof route.params.huiHuaId === 'string' ? route.params.huiHuaId : ''
  return huiHuaId ? CAO_GAO_JIAN.aiLiaoTian(huiHuaId) : ''
})
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(caoGaoJian, shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const junShiZhanKai = ref(false)
const youXiShiJianZhanKai = ref(false)
const youXiShiJianLeiXing = ref<'shengli' | 'shibai'>('shengli')
const youXiShiJianNeiRong = ref('')
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const shuruQuRef = ref<InstanceType<typeof TuWenShuRuQu> | null>(null)
// FP-10c：展开档只剩一个布尔量（纯 CSS 的 .zhan-kai 类），JS 量高链已随 use输入框.ts 一起删除；
// 因此展开按钮不再按「内容是否超一行」禁用。FP-10c⑤ 缺陷1：这个布尔量的**置位与复位判定**
// 全部住在 composables/use输入区展开档.ts（全库唯一真源），本页只取出口、不再自己写值。
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
  tuPianCaiDanZhanKai,
  tuPianCaiDanYangShi,
  daKaiTuPianCaiDan,
  chuMoKaiShiTuPian,
  chuMoJieShuTuPian,
  guanBiTuPianCaiDan,
  huoQuTuPianCaiDanXiang,
  zhiXingTuPianCaiDanXiang,
  huoQuFanYiJieGuo,
  shiFanYiZhong,
  shiFanYiZhanKai,
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

// FP-20：图片气泡「添加到表情」。取图段只做「签名 URL → File」，提交仍走页面唯一写入口
// （判定 → C4 授权 → 表情仓库.tianJia → /api/表情/我的），鉴权头一律由 api/请求.ts 单源承载。
const { tianJiaTuPianDaoBiaoQing } = use添加到表情({
  huoQuMeiTiURL: (xiaoXi) => huoQuXiaoXiMeiTiURL(xiaoXi),
  huoQuWenJianMing: (xiaoXi) => xiaoXi.mei_ti_yuan_shi_wen_jian_ming || undefined,
  chongQianMeiTiURL: (xiaoXi) => chongQianXiaoXiMeiTiURL(xiaoXi),
  tiJiaoWenJian: (wenJian) => tiJiaoBiaoQingWenJian(wenJian),
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
  sheZhiTiShi: (xinXi) => xianShiBiaoQingTiShi(xinXi),
})

function chongXinFanYi(xiaoXi: 消息) {
  void qiangZhiFanYi(xiaoXi)
}

/**
 * FP-09（需求 #5 表现层）引用两件套的接线点。定位锚的 DOM id 前缀与被定位的组件同源
 * （`YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui`），滚动容器就是消息列表那个 `<main>`。
 */
function yinYongXiangId(xiaoXi: 消息): string {
  return `${YIN_YONG_DING_WEI_PEI_ZHI.domQianZhui}${xiaoXi.id}`
}

function huoQuXiaoXiGunDongRongQi(): HTMLElement | null {
  return xiaoxiQuYuRef.value
}

/** 被引用那条的发送者展示名：只取真实角色名/昵称，取不到就不渲染前缀（取证 §3：author 存在才渲染） */
function yinYongFaSongZheMing(muBiao: CaiDanXiaoXi): string {
  if (muBiao.fa_song_zhe_lei_xing === 'yonghu') {
    return 用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  }
  return 聊天仓库.jiaoSeXinXi?.ming_zi || ''
}

/**
 * FP-08d（需求 #5）发送前引用条的摘要口径：被引用那条是**媒体消息**时先取它自己的占位
 * （`config/消息配置.ts::huoQuMeiTiYinYongZhanWei` 单源映射，语音仍归截断出口），
 * 其余一律交给唯一截断出口 `use长按菜单.ts::huoQuYinYongZhaiYao`（改名接进本作用域）。
 * `引用气泡块.vue` 内是同一行组合式；两条呈现路径（引用条 / 气泡内引用块）解析值必须相同，
 * 由 `__tests__/FP08d媒体引用与直发.test.ts` 断言把守，防的就是两处各写一份占位。
 */
function huoQuYinYongZhaiYao(muBiao: CaiDanXiaoXi): string {
  return huoQuMeiTiYinYongZhanWei(muBiao.lei_xing) ?? zhengWenZhaiYaoChuKou(muBiao)
}

// FP-08d（需求 #5）：图片菜单的「引用」与文本 / 语音菜单同一个状态机、同一个引用态真源
// （`use长按菜单.ts`），本页面已接引用条与被引用槽 ⇒ 用 zhiChiTuPianYinYong 开这一项。

/**
 * FP-08d（需求 #5）媒体直发的页面侧唯一出口：把「发送那一刻」的引用态交进 store，
 * 成功后清引用条 —— 与文本 / 图文混排的「成功必清、失败不清」同一口径。
 * 旧形态既不带引用也不清引用态 ⇒ 引用条在直发一条语音后残留悬挂，
 * 用户接着敲的文字还会继承上一条的引用（新 bug），三方案里选「补引用参数 + 成功必清」。
 */
async function faSongMeiTiZhiFa(
  leiXing: DuoMeiTiLeiXing,
  wenJian: File | Blob | null,
  fuJia?: MeiTiFuJia,
): Promise<消息 | null> {
  const jieGuo = await 聊天仓库.faSongMeiTiXiaoXi(
    leiXing,
    wenJian,
    fuJia ?? {},
    yinYongXiaoXi.value?.id ?? null,
  )
  if (jieGuo) quXiaoYinYong()
  return jieGuo
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
  // FP-20：图片气泡走自己的菜单（含撤回项时与文本菜单同一判定），不得落到通用撤回菜单
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

// 用户是否停留在消息区底部：向上浏览时取消跟随，回到底部附近才恢复。
// 表情面板的开合补偿（use表情面板）也以它为唯一依据，故必须先于该 composable 声明。
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

// C4 首次多媒体授权：未开启 tuPianShouQuan 时，发送图片/表情包前弹窗征得同意。
// 实现收在 use图片授权门（待确认队列的唯一真源，L-23），本页只提供开关读写与弹窗可见态。
const {
  xianShi: shouQuanDanChuangXianShi,
  queRenTuPianShouQuan,
  shouQuanQueRen,
  shouQuanJuJue,
} = use图片授权门({
  huoQuYiShouQuan: () => 用户仓库.tuPianShouQuan,
  sheZhiYiShouQuan: (yunXu) => 用户仓库.sheZhiTuPianShouQuan(yunXu),
})

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
    await faSongMeiTiZhiFa('yuYin', blob, { ...fuJia, zhuanXieWenBen: zhuanXie })
  },
  gunDongDaoDiBu: () => gunDongDaoDiBu(),
})

const {
  shiYuYinBoFangZhong,
  tingZhiYinPinBoFang,
  qieHuanYuYinBoFang,
  huoQuBoFangJinDu,
  huoQuBoFangZongMiao,
  tiaoZhuanYuYinJinDu,
} = use语音播放({
  huoQuDiZhi: huoQuXiaoXiMeiTiURL,
})

const { chuLiZhanTie, chuLiTuoLuo } = use粘贴图片({
  // FP-10b（缺陷9）：粘贴不再直发，图片按出现顺序进本条消息的待发块序列，文字回到输入区
  fanJiaTuPian: (wenJian) => jiaruDaiFaTuPian(wenJian),
  fanJiaWenZi: (wenBen) => chaRuShuRuQuWenBen(wenBen),
  sheZhiCuoWu: (xinXi) => 聊天仓库.sheZhiCuoWu(xinXi),
})

/**
 * FP-10c 图文真内联编辑区：文字段与图片/贴纸块在同一条 contenteditable 流里，块插在光标处。
 * 块序列与光标的真源都在 use待发图文 这一份里，图文输入区.vue 只是呈现层（DOM ⇄ data-kuai-id 对齐）；
 * 没插过图片时块列表恒为空 ⇒ 纯文字链路逐字照旧。
 * 这里整体解构：模板要吃的都是顶层 ref（Vue 只自动解构顶层，嵌套在对象里的 ref 不解包）。
 */
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

/**
 * 输入区展开档：布尔量与「内容回到单行档 ⇒ 回落」这条复位判定都住在 composables/use输入区展开档
 * 这一份里（FP-10c⑤ 缺陷1 的根因就是那条复位触发源随 JS 量高链一起被删没了）。
 * 本页只取出口：按钮翻转走 qieHuanZhanKaiDang，发送/清面板走 shouQiZhanKaiDang。
 * FP-10c-⑥：待发图文块出现由真源自动置位（64px 块会被 35px 折叠裁掉），删块自动回落。
 */
const { shuRuKuangZhanKai, qieHuanZhanKaiDang, shouQiZhanKaiDang } = use输入区展开档({
  shuRuNeiRong,
  youTuPianKuai: daiFaYouTuPian,
})

/**
 * 展开/折叠：只向真源要一次翻转，高度由图文输入区的纯 CSS min-/max-height 决定
 * （FP-10c 删掉 use输入框.ts 的 JS 量高链后，这里不再有测量、视口监听与「内容超一行才可点」的门控）。
 */
function qieHuanShuRuKuangZhanKai(): void {
  qieHuanZhanKaiDang()
  void nextTick(() => {
    shuruQuRef.value?.focus()
  })
}

/** 编辑器 DOM → 真源：这是唯一的写回口（合并相邻文字段、退化回纯文本态都住在 composable 里） */
function chuLiShuRuQuBianJi(duan: BianJiQiDuan[], xianShiXuanRanIds: string[]): void {
  daiFaTongBuCongBianJiQi(duan, xianShiXuanRanIds)
  chuLiShuRuBianHua()
}

/**
 * 纯文本插入（粘贴文本 / Shift+Enter 换行）：沿用既有超限口径 —— 只塞得下多少塞多少，
 * 一个字符都塞不下才提示，绝不像改造前那样把整段文字丢弃。
 */
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

/** 「添加到表情」取图撞到过期签名时按同一 V8 入口重签一次（不建第二套签名口径） */
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
  // 触屏长按已弹出图片菜单后，浏览器还会补发一次 click：此时只当收起菜单，不得再叠一层预览
  if (tuPianCaiDanZhanKai.value) return
  // FP-10b：图文混排气泡按块预览那一张；不传块地址就仍是改造前的消息级单图口径
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

/**
 * FP-10b（缺陷9）：相册与粘贴的图片统一**进本条消息的待发块序列**，不再直接发出去。
 * 压缩在后台做，完成后换回块里的文件；压缩失败保留原图并提示 —— 图片不该因为压缩挂了
 * 就从用户眼前消失（C4 图片授权门也随之后移到「发送」那一刻：粘贴只是留在本地）。
 */
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
    .catch((cuoWu: unknown) => {
      聊天仓库.sheZhiCuoWu(
        cuoWu instanceof Error && cuoWu.message
          ? cuoWu.message
          : huoQuFanYi('duoMeiTi', 'yaSuoShiBai'),
      )
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

/**
 * FP-10a（需求 #6）：表情面板选中的内置贴纸**进本条消息的待发块序列**，不再直发 —— 与图片走
 * 同一条插入链路（同一插入序语义、同一上限预检、同样可拖拽改序），于是待发缩略图能按贴纸档
 * （`contain` + 方形）画。贴纸类别取值只经 `utils/消息内容块.ts` 的唯一出口
 * `BIAO_QING_BAO_MEI_TI_LEI_BIE`，页内不留那个存量码的字面量（FP24a 的守门连注释一起扫）。
 * canvas 渲染只发生在本地，故 C4 图片授权门与粘贴/相册的口径一致：后移到「发送」那一刻
 * （`faSongDaiFaTuWen` 内的 `queRenTuPianShouQuan`），不进待发就不该索要授权。
 */
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
  } catch (cuoWu: unknown) {
    聊天仓库.sheZhiCuoWu(
      cuoWu instanceof Error && cuoWu.message
        ? cuoWu.message
        : huoQuFanYi('duoMeiTi', 'biaoQingBaoXuanRanShiBai'),
    )
  }
}

// FP-06b 我的表情：添加/发送/删除/排序。「本地文件 → 我的表情」的判定→授权→上传序列收在
// use表情提交（全库唯一一处），本页只交出自己的错误横幅出口与授权门，不新建第二套上传。
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

/** 签名 URL 失效时整表重拉一次（每次打开面板只重试一次，避免 403 循环刷接口） */
function qingQiuBiaoQingZhongLa() {
  if (biaoQingZhongLaYiFa.value) return
  biaoQingZhongLaYiFa.value = true
  void 表情仓库.chongXinJiaZai()
}

// 打开面板时按账号拉取（用户铁律：所有端一致 —— 列表与排序都在服务端，随账号走）
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
  if (neiRong.length > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) return false
  // FP-10b：待发区里有图片 ⇒ 没有文字也能发（QQ 口径：纯图片消息是合法形态）
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

// 用户是否停留在消息区底部：向上浏览时取消跟随，回到底部附近才恢复
// （状态与阈值声明在表情面板 composable 之前，见上方 yiDingZaiDiBu）
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
    // FP-07（缺陷4）：通关/失败分组与趣味文案都改吃服务端结算下发的那两份真源
    // （分组 = translations.jieGuoTongGuanChi 的键集合，判定口 utils/结局.是否通关结局）。
    // 前端原来硬编码的白名单漏了 sheng_li_shen_jing_bing，神经病胜利会被渲染成失败弹窗。
    // 这里的结构性读取是临时接缝：聊天仓库.youXiShiJian 的窄类型归 FP-09 所有，
    // 待其在 stores/聊天.ts 里声明这两个字段后可去掉断言。
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

/**
 * FP-10b：把待发块序列按**用户排的顺序**发出去（一次一条消息，图文同条）。
 * C4 图片授权门从「粘贴时」后移到「发送时」——粘贴只是把图留在本地，不发就不该要授权。
 * 发送失败时待发区保持原样，用户可以直接再点一次发送（气泡上的重试走同一把幂等键）。
 */
async function faSongDaiFaTuWen(): Promise<void> {
  if (daiFaKuaiChaoXian()) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'kuaiChaoXian'))
    return
  }
  const yunXu = await queRenTuPianShouQuan()
  if (!yunXu) {
    聊天仓库.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
    return
  }
  // 压缩在后台跑，块里可能还压着原图：先等在途压缩全部落回块，再取待发序列
  faSongZhong.value = true
  await dengDaiDaiFaYaSuoWanCheng()
  const daiFa = shouJiDaiFaKuai()
  if (daiFa.length === 0) {
    faSongZhong.value = false
    return
  }
  try {
    // FP-08b：引用态（真源只在此处的 `yinYongXiaoXi`）必须在发送这一刻进 store，
    // 否则会像改前那样停在 UI 死胡同里（需求 #5 的"严重 bug"本体）。
    const jieGuo = await 聊天仓库.faSongTuWenXiaoXi(daiFa, yinYongXiaoXi.value?.id ?? null)
    if (jieGuo) {
      qingKongDaiFaKuai()
      qingChuCaoGao()
      shouQiZhanKaiDang()
      quXiaoYinYong()
      if (yiDingZaiDiBu.value) gunDongDaoDiBu()
    }
  } finally {
    faSongZhong.value = false
  }
}

async function faSong() {
  const neiRong = shuRuNeiRong.value.trim()
  if (neiRong === 管理员调试指令) {
    // 面板载有角色人设/轮次/好感度变化/AI 思维链等运营侧数据，必须确认服务端下发的
    // cha_kan（只读运营数据）能力后才开启；无该能力不把指令发给 AI，并给出明确「无权限」提示
    await 用户仓库.queBaoShenFenJiuXu()
    if (!用户仓库.keGuanLiZhiDu) {
      // 就绪门只保证身份「解析过一次」，不保证新鲜：本会话内刚被提升的账号在此重取一次能力位
      await 用户仓库.jiaZaiYongHu()
    }
    if (用户仓库.keGuanLiZhiDu) {
      guanLiJianKongZhanKai.value = true
      // FP-19：身份此时才就绪，补挂 管理员_* 监听（幂等；建连时已是管理员则早已挂上）
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
  // FP-05 YH-036：用户手动 /生图 /视频 指令已删除，改为普通文本发送（图片与视频由AI对象在合适时主动发起）
  if (daiFaYouTuPian.value) {
    await faSongDaiFaTuWen()
    return
  }
  shuRuNeiRong.value = ''
  qingChuCaoGao()
  shouQiZhanKaiDang()
  faSongZhong.value = true
  try {
    // FP-08b（需求 #5）：把右键引用态随这条文本一起交给 store ⇒ 进 HTTP body。
    // 引用态的唯一真源仍是 `use长按菜单.ts::yinYongXiaoXi`，这里只在发送瞬间读一次。
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
  document.addEventListener('click', chuLiWenDangDianJi, true)
  document.addEventListener('visibilitychange', chuLiYeMianKeJianXing)
  // FP-10c：输入区高度改由 CSS 承担（min-/max-height 吃令牌），挂载后不再测量、也不再挂 resize 重算
  // 进入聊天页即把表情面板离屏克隆并以 opacity:0 真实绘制，强制浏览器一次性
  // rasterize 全部 emoji 系统字形并缓存；这样首次点开表情面板（v-show display:none→block）不再卡顿。
  // 该预加载不触发任何滚动；面板开合对聊天区的滚动补偿由 use表情面板 自行挂载
  // （观测模板 ref 拿到的面板实例，无需在此显式初始化）。
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

/* FP-20 保留特例：消息区滑块/轨道/悬停钉在 --liaotian-gundong-tiao* 局部量名族（聊天界面.test 钉死）；宽高 8px 与 global --gundong-tiao-kuan-du 同值纯重复已删，宽度吃单一真源 */
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
  margin-left: 10px;
}

.jiaose-xiaoxi .xiaoxi-wei {
  margin-right: 10px;
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

.gujia-wei {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--shijian-biaoqian-beijing);
  flex-shrink: 0;
}

.gujia-zuoce .gujia-wei {
  margin-right: 10px;
}

.gujia-youce .gujia-wei {
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
  /* 缺陷5 同源几何：输入框外壳与发送按钮吃同一套度量（字号/行高/上下内边距/边框宽），
     两盒高度由同一来源构造，禁止在任一侧再补一个高度字面值。
     FP-22c：这组度量住在 styles/variables.css 的共用 :root 块，本容器一律不再局部声明 */
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

/* FP-23（需求 #9）：语音/表情/加号三枚主图标盒与输入框折叠态单行等高。两轴同吃
   --shuru-tubiao-chicun（它的定义就是 var(--shuru-danxing-gao-du)），不再留 44/35 两套高度。
   触控热区不让位：与 .fasong-anniu 同用 --shuru-anniu-re-ku 的 ::before 外扩；差别在发送按钮靠
   min-width 已达热区宽、只需纵向补，图标盒两轴都只有单行高，故横纵两轴一并扩 */
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

/* 字形宽高引用同一枚令牌 ⇒ 方形 viewBox 下不可能出现非等比缩放（原 28×28 等比收到 22×22） */
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

/* FP-10c：输入区本体（外壳 .shuru-kuang-waike 与编辑器 .shuru-kuang）的模板与 CSS 已随
   components/聊天/图文输入区.vue 一起唯一化，本页不再持有第二份度量；折叠/展开两档高度都在组件里
   吃 --shuru-danxing-gao-du / --shuru-zhan-kai-gao-du，滚动条仍只有 styles/global.css 一处真源。 */

.fasong-anniu {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 与输入框外壳同一套量：同上下内边距 + 同行高基准 + 同宽透明边框。
     浏览器对 <1px 边框的取整两边一致，所以两盒必然等高，8px 差值不再堆到按钮上方。
     视觉高度让位给输入框，44×44 触控热区改由 ::before 向外扩，不再靠撑大盒子换可达性 */
  padding: var(--shuru-kuang-shang-xia-neidian) 14px;
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

/* FP-23：展开/折叠按钮同样收进 --shuru-tubiao-chicun。它此前写死 44px，经 .shuru-dibu-hang
   传到 .shuru-rongqi 那条 align-items: flex-end 的行上，把整行顶到 44 高 —— 输入框侧辛苦构造的
   单行等高被这一个按钮破坏。字形保留 14×14（两轴同值 ⇒ 等比）：chevron 是二级指示符，
   刻意小于主 glyph，全站仅此一处，不构成第二真源。热区仍由 ::before 扩到热区令牌 */
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
  margin-right: 4px;
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

/* FP-10c：:disabled 态随那条门控一起删除——展开按钮不再按「内容是否超一行」禁用，
   它只切换 CSS 的 .zhan-kai 类，任何时刻都可用（折叠/展开是纯 CSS 两档，没有 JS 量高可判） */

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
  /* FP-06：面板私有滚动条色字面量（原 rgba(110,110,110,.85)，只适配浅色档）改为代理 FP-01 的
     --gundong-tiao-* 真源，深色档才拿得到深色档自己的可见滑块色；局部量名保留是因为既有单测钉的是它 */
  --emoji-mianban-gundong-tiao: var(--gundong-tiao-huakuai);
  --emoji-mianban-gundong-tiao-hover: var(--gundong-tiao-huakuai-hover);
}

/* FP-20 保留特例：表情面板需要 6px 窄条+透明轨道（global 为 8px+半透明灰轨道），--emoji-mianban-gundong-tiao* 局部量名被 我的表情/聊天界面 测试钉死（值已代理 --gundong-tiao-*），整块保留 */
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

/* FP-06：原 --emoji-xiangmu-hover 深色档是 rgba(0,0,0,.06)（黑压黑，悬停恒不可见），
   改吃 --caidan-active：浅色档比面板更深、深色档比面板更亮，两档都真的看得见反馈 */
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
  /* FP-20：iOS 长按默认弹系统「存储图像/查询」菜单，会把应用内长按菜单顶掉 */
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

/* ─── 多媒体消息：表情包气泡（透明背景大图） ─── */
.biaoqingbao-waike {
  background: transparent !important;
}

.biaoqingbao-tu {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
  display: block;
}

/* ─── 多媒体消息：语音条 ───
   气泡本体（3 格喇叭 / 波形采样 / 进度轨道 / 全部几何）只有 components/聊天/语音气泡.vue 一份，
   本页只留外层容器与语音转写行。改前的 .yuyin-qipao / .boxing-* / .yuyin-jindu-* 内联实现
   与本页 12 条波形常量已随 FP-11 全删，不得在此复活第二份。 */
.yuyin-waike {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 录音浮层的电平计（FP-11 起改名自 .boxing-*：它与语音条只是长得像，共名才会被再读成
   同一条「波形条数」需求；条宽改前住在 .yuyin-waike 上，而浮层 Teleport 在 body 下取不到 ⇒
   一直是失效值，现在住在电平计自己的盒上） */
.luyin-dianping-zu {
  --luyin-dianping-tiaokuan: 3px;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
  flex-shrink: 0;
}

.luyin-dianping-tiao {
  width: var(--luyin-dianping-tiaokuan);
  height: 100%;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.85;
  transform-origin: center;
  animation: luyin-dianping-baidong 1s ease-in-out infinite;
}

.luyin-dianping-tiao:nth-child(2n) {
  animation-delay: -0.15s;
}

.luyin-dianping-tiao:nth-child(3n) {
  animation-delay: -0.35s;
  height: 65%;
}

.luyin-dianping-tiao:nth-child(4n) {
  height: 40%;
}

.luyin-dianping-tiao:nth-child(5n) {
  animation-delay: -0.55s;
}

@keyframes luyin-dianping-baidong {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}

.luyin-dianping-huo {
  animation-duration: 0.7s;
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

/* 气泡内的图文块：图片独占一行、文字保持原有气泡文本形态（FP-22b：尺寸上收为全局令牌） */
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

/* 块渲染里的贴纸（FP-24a）：表情包类别不许按照片画 —— cover + 180×200 会裁掉贴纸边缘的透明区，
   故与媒体分支的 .biaoqingbao-tu 同吃 --duomeiti-biaoqingbao-chicun + contain。
   与基础类同为 (0,1,0)，只能靠源码序压制 ⇒ 本块必须排在 .tuwen-kuai-tu 之后（FP24a 用例钉住这一点） */
.tuwen-kuai-tu--biaoqingbao {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  max-width: var(--duomeiti-biaoqingbao-chicun);
  max-height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
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
  /* FP-06：容器（.biaoqingbao-quyu）此前零规则、宽度由子元素 min-content 顶出来，
     固定 4 列在桌面档只有 218px 宽。改 auto-fill 后格子随面板宽度自适应密度，两档视口都铺满 */
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 6px;
}

.biaoqingbao-wangge.guanli {
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.biaoqingbao-xiangmu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 6px 2px;
  /* FP-06：表情格要有"格子"的样子——卡面 + 发丝边框；--yuanjiao-xiao 是 light-only 令牌
     （深色档按 F23 同族塌陷为 0），故此处用字面圆角，保证两档一致 */
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
  padding: 5px;
}

.biaoqingbao-emoji {
  font-size: 34px;
  line-height: 1.2;
}

.biaoqingbao-wenzi {
  font-size: 11px;
  /* FP-06：格子自己有卡面（--beijing-kaopian）后，浅色档次级灰压浅卡只有 3.3:1、深色档 4.27:1，
     均不到 AA；贴纸名是可点击控件的一部分，改用主文字令牌（两档 ≥12:1） */
  color: var(--wenben-zhuse);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── FP-06 表情面板分区 / 管理态角标 / 添加槽位（缺陷10 深色档根治 + 重新设计UI） ─── */
/* 下列类名改前在全库零 CSS 规则：既无 color 也无边界，只靠 FP-01 给 button reset 补
   color: inherit 勉强"看得见"，谈不上可点击外观。一律吃 variables.css 既有深浅成对令牌，
   不新造任何色值；也不写 :root[data-theme=...] 覆写（F24 特异性坑按 FP-03 口径从构造上绕开）。 */
.biaoqingbao-quyu {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
}

.biaoqingbao-fenqu {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  gap: 6px;
}

.fenqu-biaoti {
  font-size: var(--ziti-xiao);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.fenqu-guanli {
  flex-shrink: 0;
  min-height: 24px;
  padding: 3px 10px;
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
  gap: 4px;
  min-width: 0;
}

/* 我的表情图：改前连尺寸规则都没有，用户传多大就撑多大（面板被顶开）；此处钉成等高格 */
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
  gap: 4px;
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

/* 禁用件不吃 opacity（那会把对比度一起压没）：改为"褪去卡面 + 细边框"，字形仍留在可读档，
   按 WCAG 1.4.3 inactive 例外允许降到 3:1，取证数值两档均 ≥3.3:1 */
.ge-caoZuo:disabled {
  background: var(--beijing-ciuse);
  border-color: var(--biankuang-qianse);
  color: var(--wenben-ciuse);
  cursor: not-allowed;
}

.biaoqingbao-xiangmu.tian-jia {
  gap: 6px;
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

/* 触屏没有 :hover：添加槽的按下反馈必须单独给，否则手机上点它毫无回应
   （通用的 .biaoqingbao-xiangmu:active 会被下面这条更晚声明的 .tian-jia 静态规则盖掉） */
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

/* FP-03 气泡主题单源：转写统一跟随 --qipao-*；文件气泡的同源色自 FP-12b 起住在
   components/聊天/文件气泡.vue 内（按 shiBenRen 取同一串令牌），本页不再插手（FP-11）
   置于样式末尾，以同权后胜覆盖上方各派生规则，文本气泡基规则已在原位直引变量 */
.yonghu-xiaoxi .yuyin-zhuanwenzi {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}
.jiaose-xiaoxi .yuyin-zhuanwenzi,
.yuyin-zhuanwenzi {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
}

.luyin-zhuangtai-hang {
  display: flex;
  align-items: center;
  gap: 10px;
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
