































































































































































































































































































































































































































































































































































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

    <XiaoXiCaoZuoCaiDan
      :kai-qi="caiDanZhengDaKai"
      :ji-dian="dangQianJiDian"
      :cai-dan-xiang="dangQianCaiDanXiang"
      @guan-bi="guanBiCaiDan"
      @xuan-zhong="zhiXingCaiDanXiang"
    />

    <Teleport to="body">
      <GuanLiJianKong
        v-if="guanLiJianKongZhanKai && 用户仓库.keGuanLiZhiDu"
        @close="guanLiJianKongZhanKai = false"
      />
    </Teleport>

    <TuPianYuLan
      :tu="yuLanTuPianLieBiao"
      :xia-biao="yuLanXiaBiao"
      @guan-bi="guanBiTuPianYuLan"
      @geng-xin-xia-biao="yuLanXiaBiao = $event"
    />

    <YuYinLuYinTiao
      :lu-yin-mo-shi="luYinMoShi"
      :lu-yin-zhong="luYinZhong"
      :lu-yin-shang-hua-qu-xiao="luYinShangHuaQuXiao"
      :lu-yin-bo-xing="luYinBoXing"
