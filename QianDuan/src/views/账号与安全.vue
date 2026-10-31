<template>
  <div class="zhang-hao-an-quan">
    <div class="sou-suo-hang">
      <ChangFangShuRuKuang
        标识="she-zhi-sou-suo"
        :模型值="搜索关键词"
        类型="search"
        :占位文字="huoQuFanYi('sheZhi', 'souSuoZhanWei')"
        @geng-xin="搜索关键词 = $event"
      />
      <button v-if="搜索中" class="anniu-fu-zhu sou-suo-qing-kong" @click="搜索关键词 = ''">
        {{ huoQuFanYi('sheZhi', 'qingKongSouSuo') }}
      </button>
    </div>

    <div v-if="无匹配" class="sou-suo-kong-tai" role="status">
      <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'souSuoKongTai') }}</p>
      <button class="anniu-fu-zhu" @click="搜索关键词 = ''">
        {{ huoQuFanYi('sheZhi', 'qingKongSouSuo') }}
      </button>
    </div>

    <RequestError
      v-if="dingCengCuoWu"
      :cuo-wu="dingCengCuoWu"
      @chong-shi="chongShiDingCeng"
    />

    <section class="ming-pian" :aria-label="huoQuFanYi('sheZhi', 'geRenSheZhiBiaoTi')">
      <div class="ming-pian-nei">
        <div class="blob-tou">
          <TouXiang :tou-xiang="dangQianTouXiang" :mo-ren-zi="touXiangShouZi" />
        </div>
        <div class="ming-pian-wen">
          <h1 class="xing-ming">{{ dangQianMingCheng }}</h1>
          <p class="qian-ming-dan">{{ 设置仓库.qianMing || huoQuFanYi('haoYou', 'zanWuQianMing') }}</p>
          <div class="uid-hang">
            <span class="uid-wenben">
              {{ 设置仓库.yongHuBianHao || 用户编号 || huoQuFanYi('sheZhi', 'uidWeiZaiFuZhouZhong') }}
            </span>
            <button class="anniu-fu-zhu uid-fu-zhi" @click="fuZhiYongHuBianHao">
              {{ huoQuFanYi('sheZhi', 'fuZhiBianHao') }}
            </button>
          </div>
          <div class="shu-zu">
            <div>
              <b>{{ 好友数 }}</b
              ><span>{{ huoQuFanYi('sheZhi', 'haoYouJiShu') }}</span>
            </div>
            <div>
              <b>{{ qianMingZiShu }}</b
              ><span>{{ huoQuFanYi('sheZhi', 'qianMingJiShu') }}</span>
            </div>
            <div>
              <b>{{ 完成百分比 }}%</b
              ><span>{{ huoQuFanYi('sheZhi', 'ziLiaoWanChengDu') }}</span>
            </div>
          </div>
          <div class="wan-cheng">
            <div class="wan-cheng-wen">
              <span>{{ huoQuFanYi('sheZhi', 'ziLiaoWanChengDu') }}</span
              ><span>{{ 完成数 }}/{{ 完成总数 }}·{{ 完成百分比 }}%</span>
            </div>
            <div
              class="jin-du-cao"
              role="progressbar"
              :aria-valuenow="完成百分比"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="huoQuFanYi('sheZhi', 'ziLiaoWanChengDu')"
            >
              <div class="jin-du-tiao" :style="{ width: 完成百分比 + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <nav class="biao-qian-lan" role="tablist" :aria-label="huoQuFanYi('sheZhi', 'biaoQianLanBiaoTi')">
      <button
        v-for="标签 in 标签列表"
        :id="`biao-qian-${标签.键}`"
        :key="标签.键"
        role="tab"
        :aria-selected="当前标签 === 标签.值"
        :aria-controls="`mian-ban-${标签.键}`"
        :tabindex="当前标签 === 标签.值 ? 0 : -1"
        :class="{ 'biao-qian-huo-yue': 当前标签 === 标签.值 }"
        @click="切换标签(标签.值)"
        @keydown="标签键盘"
      >
        {{ 标签.文案 }}
      </button>
    </nav>

    <section
      v-show="!搜索中 ? 当前标签 === '形象' : 形象有命中"
      id="mian-ban-xingXiang"
      role="tabpanel"
      aria-labelledby="biao-qian-xingXiang"
    >
      <div
        v-show="命中搜索(touXiangSouSuoWenBen)"
        id="tou-xiang"
        class="zhi-wu-ka-pian mao-dian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(touXiangSouSuoWenBen) }"
      >
        <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'touXiangBiaoTi') }}</h2>
        <div class="yulan-hang">
          <div class="yulan-wei">
            <TouXiang :tou-xiang="dangQianTouXiang" :mo-ren-zi="touXiangShouZi" />
          </div>
          <button class="anniu-fu-zhu xiao-anniu" :disabled="touXiangShangChuanZhong" @click="daKaiTouXiangXuanZe">
            {{ touXiangShangChuanZhong ? huoQuFanYi('sheZhi', 'shangChuanZhong') : huoQuFanYi('sheZhi', 'gengHuanTouXiang') }}
          </button>
        </div>
        <RequestError
          v-if="fenQuanCuoWu.touXiang"
          :cuo-wu="fenQuanCuoWu.touXiang || undefined"
          :zhong-zai="touXiangShangChuanZhong"
          @chong-shi="chongShiFenQuan('touXiang')"
        />
        <p v-if="touXiangTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': touXiangShiBai }">
          {{ touXiangTiShi }}
        </p>
        <input ref="touXiangInputRef" class="yincang-wenjian-shuru" type="file" accept="image/*" @change="chuLiTouXiangXuanZe" />
      </div>

      <div
        v-show="命中搜索(qianMingSouSuoWenBen)"
        id="qian-ming"
        class="zhi-wu-ka-pian mao-dian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(qianMingSouSuoWenBen) }"
      >
        <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'qianMingBiaoTi') }}</h2>
        <ChangFangShuRuKuang
          :模型值="qianMingCaoGao"
          :多行="true"
          :行数="3"
          :占位文字="huoQuFanYi('sheZhi', 'qianMingZhanWei')"
          :最大长度="QIAN_MING_ZUI_DA_ZI_FU"
          :错误提示文字="fenQuanCuoWu.qianMing?.lianAiWenAn || ''"
          @geng-xin="qianMingCaoGao = $event"
        />
        <p class="zi-fu-ji-shu">{{ qianMingZiShu }}/{{ QIAN_MING_ZUI_DA_ZI_FU }}</p>
        <p v-if="qianMingCaoGaoYiHuiFu" class="ti-shi-wen" role="status">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</p>
        <label class="ke-jian-xing-hang">
          <span>{{ huoQuFanYi('sheZhi', 'keJianXingBiaoTi') }}</span>
          <TongYongXiaLa
            mo-shi="keJianXing"
            :aria-biao-qian="huoQuFanYi('sheZhi', 'keJianXingBiaoTi')"
            :xuan-xiang="keJianXingXuanXiang"
            :mo-xing-zhi="qianMingKeJianXing"
            @geng-xin="qianMingKeJianXing = $event as KeJianXing"
          />
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

      <div class="shuang-lie">
      <div
        v-show="命中搜索(yongHuMingSouSuoWenBen)"
        id="yong-hu-ming"
        class="zhi-wu-ka-pian mao-dian yongHuMingDuZhan"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(yongHuMingSouSuoWenBen) }"
      >
        <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'xiuGaiYongHuMing') }}</h2>
        <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'yongHuMingMiaoShu') }}</p>
          <ChangFangShuRuKuang
            :模型值="yongHuMingCaoGao"
            :占位文字="huoQuFanYi('ui', 'xinYongHuMing')"
            :最大长度="30"
            :错误提示文字="fenQuanCuoWu.yongHuMing?.lianAiWenAn || ''"
            @geng-xin="yongHuMingCaoGao = $event"
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

        <div
          v-show="命中搜索(moRenXingBieSouSuoWenBen)"
          id="mo-ren-xing-bie"
          class="zhi-wu-ka-pian mao-dian xingbie-she-zhi-ka"
          :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(moRenXingBieSouSuoWenBen) }"
        >
          <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'sheZhiMoRenXingBie') }}</h2>
          <p class="kapian-miao-shu">{{ huoQuFanYi('caidan', 'moRenXingBieMiaoShu') }}</p>
          <div
            class="xingbie-wangge"
            role="radiogroup"
            :aria-label="huoQuFanYi('caidan', 'sheZhiMoRenXingBie')"
          >
            <button
              class="xingbie-kapian"
              data-xuan-xing-bie="nan"
              role="radio"
              :aria-checked="moRenXingBieXuanZhong === 'male'"
              :class="{ beiXuanZhong: moRenXingBieXuanZhong === 'male' }"
              @click="moRenXingBieXuanZhong = 'male'"
            >
              {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNan') }}
            </button>
            <button
              class="xingbie-kapian"
              data-xuan-xing-bie="nv"
              role="radio"
              :aria-checked="moRenXingBieXuanZhong === 'female'"
              :class="{ beiXuanZhong: moRenXingBieXuanZhong === 'female' }"
              @click="moRenXingBieXuanZhong = 'female'"
            >
              {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}
            </button>
          </div>
        </div>

        <div
          v-show="命中搜索(moRenDuiXiangSouSuoWenBen)"
          id="mo-ren-dui-xiang-xing-bie"
          class="zhi-wu-ka-pian mao-dian xingbie-she-zhi-ka"
          :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(moRenDuiXiangSouSuoWenBen) }"
        >
          <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'sheZhiMoRenDuiXiangXingBie') }}</h2>
          <p class="kapian-miao-shu">{{ huoQuFanYi('caidan', 'moRenDuiXiangMiaoShu') }}</p>
          <div
            class="xingbie-wangge"
            role="radiogroup"
            :aria-label="huoQuFanYi('caidan', 'sheZhiMoRenDuiXiangXingBie')"
          >
            <button
              class="xingbie-kapian"
              data-xuan-xing-bie="nan"
              role="radio"
              :aria-checked="moRenDuiXiangXuanZhong === 'male'"
              :class="{ beiXuanZhong: moRenDuiXiangXuanZhong === 'male' }"
              @click="moRenDuiXiangXuanZhong = 'male'"
            >
              {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNan') }}
            </button>
            <button
              class="xingbie-kapian"
              data-xuan-xing-bie="nv"
              role="radio"
              :aria-checked="moRenDuiXiangXuanZhong === 'female'"
              :class="{ beiXuanZhong: moRenDuiXiangXuanZhong === 'female' }"
              @click="moRenDuiXiangXuanZhong = 'female'"
            >
              {{ huoQuFanYi('ziLiaoSheZhi', 'xingBieNv') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section
      v-show="!搜索中 ? 当前标签 === '账号' : 账号有命中"
      id="mian-ban-zhangHao"
      role="tabpanel"
      aria-labelledby="biao-qian-zhangHao"
    >
      <div class="shuang-lie">
        <div
          v-show="命中搜索(miMaSouSuoWenBen)"
          id="mi-ma"
          class="zhi-wu-ka-pian mao-dian"
          :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(miMaSouSuoWenBen) }"
        >
          <h2 class="kapian-biao-ti">{{ huoQuFanYi('caidan', 'xiuGaiMiMa') }}</h2>
          <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'miMaMiaoShu') }}</p>
          <ChangFangShuRuKuang
            :模型值="jiuMiMa"
            类型="password"
            自动完成="current-password"
            :占位文字="huoQuFanYi('ui', 'jiuMiMa')"
            @geng-xin="jiuMiMa = $event"
          />
          <ChangFangShuRuKuang
            :模型值="xinMiMa"
            类型="password"
            自动完成="new-password"
            :占位文字="huoQuFanYi('ui', 'xinMiMa')"
            @geng-xin="xinMiMa = $event"
          />
          <ChangFangShuRuKuang
            :模型值="queRenXinMiMa"
            类型="password"
            自动完成="new-password"
            :占位文字="huoQuFanYi('ui', 'queRenXinMiMa')"
            :错误提示文字="fenQuanCuoWu.miMa?.lianAiWenAn || ''"
            @geng-xin="queRenXinMiMa = $event"
          />
          <div class="yanzhengma-hang">
            <ChangFangShuRuKuang
              :模型值="miMaYanZhengMa"
              类型="tel"
              自动完成="one-time-code"
              :最大长度="6"
              :占位文字="huoQuFanYi('ui', 'yanZhengMa')"
              @geng-xin="miMaYanZhengMa = $event"
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

        <div
          v-show="命中搜索(bangDingSouSuoWenBen)"
          id="bang-ding-qu"
          class="zhi-wu-ka-pian"
          :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(bangDingSouSuoWenBen) }"
        >
          <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'bangDingBiaoTi') }}</h2>
          <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'shouJiHaoYiBangDing') }}：{{ 脱敏手机号 }}</p>
          <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'youXiangBangDing') }}：{{ huoQuFanYi('sheZhi', 'zanWeiKaiFang') }}</p>
          <p class="kapian-miao-shu">{{ huoQuFanYi('sheZhi', 'douYinBangDing') }}：{{ huoQuFanYi('sheZhi', 'zanWeiKaiFang') }}</p>
        </div>
      </div>

      <div
        v-if="fengJinXianShi"
        v-show="命中搜索(fengJinSouSuoWenBen)"
        id="feng-jin-qu"
        class="zhi-wu-ka-pian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(fengJinSouSuoWenBen) }"
      >
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
            <ChangFangShuRuKuang
              :模型值="shenSuLiYou"
              :多行="true"
              :行数="2"
              :占位文字="huoQuFanYi('sheZhi', 'shenSuZhanWei')"
              :最大长度="500"
              :错误提示文字="fenQuanCuoWu.shenSu?.lianAiWenAn || ''"
              @geng-xin="shenSuLiYou = $event"
            />
            <button class="anniu-fu-zhu xiao-anniu" :disabled="shenSuTiJiaoZhong" @click="tiJiaoShenSu">
              {{ huoQuFanYi('sheZhi', 'tiJiaoShenSu') }}
            </button>
            <p v-if="shenSuCaoGaoYiHuiFu" class="ti-shi-wen" role="status">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</p>
          </template>
        </template>
        <p v-if="shenSuTiShi" class="ti-shi-wen" :class="{ 'ti-shi-cuowu': shenSuShiBai }">
          {{ shenSuTiShi }}
        </p>
      </div>

      <div
        v-show="命中搜索(uidSouSuoWenBen)"
        id="uid-qu"
        class="zhi-wu-ka-pian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(uidSouSuoWenBen) }"
      >
        <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'uidBiaoTi') }}</h2>
        <p class="kapian-miao-shu uid-wenben">
          {{ 设置仓库.yongHuBianHao || 用户编号 || huoQuFanYi('sheZhi', 'uidWeiZaiFuZhouZhong') }}
        </p>
        <button class="anniu-fu-zhu xiao-anniu" @click="fuZhiYongHuBianHao">{{ huoQuFanYi('sheZhi', 'fuZhiUID') }}</button>
      </div>

      <div
        v-show="命中搜索(zhuXiaoSouSuoWenBen)"
        id="zhu-xiao-qu"
        class="zhi-wu-ka-pian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(zhuXiaoSouSuoWenBen) }"
      >
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
    </section>

    <section
      v-show="!搜索中 ? 当前标签 === '隐私' : 隐私有命中"
      id="mian-ban-yinSi"
      role="tabpanel"
      aria-labelledby="biao-qian-yinSi"
    >
      <div
        v-show="命中搜索(yinSiSouSuoWenBen)"
        id="yin-si-qu"
        class="zhi-wu-ka-pian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(yinSiSouSuoWenBen) }"
      >
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

      <div
        v-show="命中搜索(tuPianSouSuoWenBen)"
        id="tu-pian-qu"
        class="zhi-wu-ka-pian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(tuPianSouSuoWenBen) }"
      >
        <h2 class="kapian-biao-ti">{{ huoQuFanYi('duoMeiTi', 'sheZhiTuPianShouQuan') }}</h2>
        <p class="kapian-miao-shu">
          {{ huoQuFanYi('duoMeiTi', 'zhangHaoAnQuanMiaoShu') }}
        </p>
        <label class="kai-guan-rongqi">
          <input type="checkbox" :checked="tuPianShouQuan" @change="qieHuanTuPianShouQuan" />
          <span class="kai-guan-hua-dong"></span>
        </label>
      </div>

      <div
        v-show="命中搜索(paiWeiSouSuoWenBen)"
        id="pai-wei-qu"
        class="zhi-wu-ka-pian"
        :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(paiWeiSouSuoWenBen) }"
      >
        <h2 class="kapian-biao-ti">{{ huoQuFanYi('sheZhi', 'paiWeiBiaoTi') }}</h2>
        <button class="anniu-fu-zhu xiao-anniu" @click="xianShiQingKongQueRen = true">
          {{ huoQuFanYi('sheZhi', 'qingKongPaiWei') }}
        </button>
      </div>
    </section>

    <section
      v-show="!搜索中 ? 当前标签 === '外观' : 外观有命中"
      id="mian-ban-waiGuan"
      role="tabpanel"
      aria-labelledby="biao-qian-waiGuan"
    >
      <div
        v-show="!搜索中 || 外观有命中"
        id="wai-guan-da-kuang"
        class="zhi-wu-ka-pian mao-dian wai-guan-da-kuang"
      >
        <div
          v-show="命中搜索(beiJingSouSuoWenBen)"
          id="liao-tian-bei-jing"
          class="wai-guan-fen-duan"
          :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(beiJingSouSuoWenBen) }"
        >
          <LiaoTianBeiJingSheZhi />
        </div>

        <div
          v-show="命中搜索(qiPaoSouSuoWenBen)"
          id="qi-pao-xuan-ze"
          class="wai-guan-fen-duan"
          :class="{ 'sou-zhong-gao-liang': 搜索中 && 命中搜索(qiPaoSouSuoWenBen) }"
        >
          <h2 class="kapian-biao-ti">{{ QI_PAO_WEN_AN.biaoTi }}</h2>
          <QiPaoXuanZeQi />
        </div>

        <div id="liao-tian-yu-lan" class="wai-guan-fen-duan">
          <LiaoTianYuLan
            :biao-ti="huoQuFanYi('sheZhi', 'liaoTianYuLan')"
            :dang-qian-ming="设置仓库.dangQianBeiJingBiaoShu"
          />
        </div>
      </div>
    </section>

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
      <TuPianCaiJian
        v-if="caiJianXianShi"
        :tu-yuan="caiJianTuYuan"
        :yuan-mime="caiJianYuanMIME"
        :biao-ti="huoQuFanYi('sheZhi', 'touXiangCaiJian')"
        :ti-shi="huoQuFanYi('sheZhi', 'tuPianCaiJianTiShi')"
        :wen-jian-ming="'touxiang'"
        @que-ren="queRenCaiJian"
        @qu-xiao="guanBiCaiJian"
      />
    </Teleport>
    <RenJiYanZheng
      ref="renJiZuJian"
      :xian-shi="renJiXianShi"
      :yong-tu="YAN_ZHENG_MA_YONG_TU.chongZhiMiMa"
      :deng-dai-zhong="miMaFaSongZhong"
      @guan-bi="renJiXianShi = false"
      @ti-jiao="tiJiaoRenJi"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'
import TouXiang from '@/components/头像.vue'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import RequestError from '@/components/请求错误.vue'
import { 用户形态 } from '@/utils/性别'
import {
  chuangJianQianTaiCuoWu,
  归一前台错误,
  type QianTaiCuoWu,
} from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { gengGaiYongHuMing, gengGaiMiMa, gengGaiMoRenXingBie, gengGaiMoRenDuiXiangXingBie, faSongMa, YAN_ZHENG_MA_YONG_TU, type 人机验证答案 } from '@/api/认证'
import RenJiYanZheng from '@/components/认证/人机测试.vue'
import { shiRenJiYanZhengShiBai, type 人机测试实例 } from '@/utils/人机验证'
import type { XingBie } from '@/types/类型定义'
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
import { yaSuoTuPiang } from '@/utils/图片压缩'
const TuPianCaiJian = defineAsyncComponent(() => import('@/components/图片裁剪.vue'))
import TongYongXiaLa from '@/components/通用菜单.vue'
import QiPaoXuanZeQi from '@/components/气泡主题选择器.vue'
import LiaoTianBeiJingSheZhi from '@/components/聊天背景设置.vue'
import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'
import { QI_PAO_WEN_AN, QI_PAO_MING_CHENG_WEN_AN } from '@/config/气泡主题文案'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'

const QIAN_MING_ZUI_DA_ZI_FU = 500

const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const router = useRouter()

type BiaoQianZhi = '形象' | '账号' | '隐私' | '外观'
const 搜索关键词 = ref('')
const 当前标签 = ref<BiaoQianZhi>('形象')

function 切换标签(标签: BiaoQianZhi) {
  当前标签.value = 标签
}

function 标签键盘(事件: KeyboardEvent) {
  const 顺序: BiaoQianZhi[] = ['形象', '账号', '隐私', '外观']
  const 下标 = 顺序.indexOf(当前标签.value)
  if (事件.key === 'ArrowRight') {
    const 下一个 = 顺序[(下标 + 1) % 顺序.length]
    切换标签(下一个)
    document.getElementById(`biao-qian-${标签键(下一个)}`)?.focus()
  }
  if (事件.key === 'ArrowLeft') {
    const 上一个 = 顺序[(下标 + 顺序.length - 1) % 顺序.length]
    切换标签(上一个)
    document.getElementById(`biao-qian-${标签键(上一个)}`)?.focus()
  }
}

function 标签键(标签: BiaoQianZhi): string {
  if (标签 === '形象') return 'xingXiang'
  if (标签 === '账号') return 'zhangHao'
  if (标签 === '隐私') return 'yinSi'
  return 'waiGuan'
}

const 标签列表 = computed(() => [
  {
    值: '形象' as BiaoQianZhi,
    键: 'xingXiang',
    文案: huoQuFanYi('sheZhi', 'xingXiangFenZu'),
  },
  {
    值: '账号' as BiaoQianZhi,
    键: 'zhangHao',
    文案: huoQuFanYi('sheZhi', 'zhangHaoFenZu'),
  },
  {
    值: '隐私' as BiaoQianZhi,
    键: 'yinSi',
    文案: huoQuFanYi('sheZhi', 'yinSiFenZu'),
  },
  {
    值: '外观' as BiaoQianZhi,
    键: 'waiGuan',
    文案: huoQuFanYi('sheZhi', 'waiGuanFenZu'),
  },
])

const xianShiQueRen = ref(false)
const xianShiQingKongQueRen = ref(false)

const 用户编号 = computed(() => 用户仓库.dangQianYongHu?.id || '')
async function fuZhiYongHuBianHao(): Promise<void> {
  const wenBen = 设置仓库.yongHuBianHao || 用户编号.value
  if (!wenBen) return
  try {
    await navigator.clipboard.writeText(wenBen)
  } catch {
    jieShouBenDiQingQiuCuoWu('uid', huoQuFanYi('sheZhi', 'fuZhiShiBai'))
  }
}

const 脱敏手机号 = computed(() => {
  const hao = 设置仓库.shouJiHao || 用户仓库.dangQianYongHu?.shou_ji_hao || ''
  if (/^1[3-9]\d{9}$/.test(hao)) return `${hao.slice(0, 3)}****${hao.slice(7)}`
  if (hao.length > 7) return `${hao.slice(0, 3)}****${hao.slice(-4)}`
  return '—'
})

async function qieHuanGongKai(xiang: 'gongKaiZhangHao' | 'gongKaiShouJiHao' | 'gongKaiYouXiang') {
  qingFenQuanCuoWu('gongKai')
  if (xiang === 'gongKaiZhangHao') await 设置仓库.baoCunYinSi({ gongKaiZhangHao: !设置仓库.gongKaiZhangHao })
  if (xiang === 'gongKaiShouJiHao') await 设置仓库.baoCunYinSi({ gongKaiShouJiHao: !设置仓库.gongKaiShouJiHao })
  if (xiang === 'gongKaiYouXiang') await 设置仓库.baoCunYinSi({ gongKaiYouXiang: !设置仓库.gongKaiYouXiang })
}

async function zhiXingQingKongPaiWei() {
  xianShiQingKongQueRen.value = false
  qingFenQuanCuoWu('paiWei')
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
  qingFenQuanCuoWu('touXiang')
  touXiangInputRef.value?.click()
}

function chuLiTouXiangXuanZe() {
  const wenJian = touXiangInputRef.value?.files?.[0]
  if (touXiangInputRef.value) touXiangInputRef.value.value = ''
  if (!wenJian) return
  if (!wenJian.type.startsWith('image/')) {
    touXiangShiBai.value = true
    touXiangTiShi.value = ''
    jieShouBenDiQingQiuCuoWu('touXiang', huoQuFanYi('sheZhi', 'touXiangLeiXingBuZhichi'))
    return
  }
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianTuYuan.value = URL.createObjectURL(wenJian)
  caiJianYuanMIME.value = wenJian.type || 'image/png'
  caiJianXianShi.value = true
}

function guanBiCaiJian() {
  caiJianXianShi.value = false
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianTuYuan.value = ''
  caiJianYuanMIME.value = 'image/png'
}

async function queRenCaiJian(wenJian: Blob) {
  caiJianXianShi.value = false
  touXiangShangChuanZhong.value = true
  touXiangShiBai.value = false
  touXiangTiShi.value = ''
  qingFenQuanCuoWu('touXiang')
  try {
    const diZhi = await shangChuanTouXiang(wenJian)
    设置仓库.touXiang = diZhi
    用户仓库.tongBuZiLiao({ tou_xiang: diZhi })
    touXiangTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    touXiangShiBai.value = true
    jieShouFenQuanCuoWu('touXiang', cuoWu, daKaiTouXiangXuanZe)
  } finally {
    touXiangShangChuanZhong.value = false
  }
}

const qianMingCaoGao = ref('')
const { huiFuCaoGao: huiFuQianMingCaoGao, qingChuCaoGao: qingChuQianMingCaoGao } = useCaoGao(CAO_GAO_JIAN.qianMing, qianMingCaoGao)
const qianMingCaoGaoYiHuiFu = ref(false)
const qianMingKeJianXing = ref<KeJianXing>('gong_kai')
const qianMingBaiMingDan = ref<string[]>([])
const qianMingBaoCunZhong = ref(false)
const qianMingTiShi = ref('')
const qianMingShiBai = ref(false)
const haoYouKeXuan = ref<HaoYouXiang[]>([])

const qianMingZiShu = computed(() => qianMingCaoGao.value.length)

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

const fenQuanCuoWu = ref<Record<string, QianTaiCuoWu | null>>({})
const fenQuanChongShi: Record<string, (() => unknown) | undefined> = {}

function jieShouFenQuanCuoWu(fenQuan: string, cuoWu: unknown, chongShi?: () => unknown): void {
  const zhengChangHua = 归一前台错误(cuoWu)
  if (!zhengChangHua.xianShi) return
  fenQuanCuoWu.value = { ...fenQuanCuoWu.value, [fenQuan]: zhengChangHua }
  fenQuanChongShi[fenQuan] = chongShi
}

function jieShouBenDiQingQiuCuoWu(fenQuan: string, yingXiang: string): void {
  jieShouFenQuanCuoWu(fenQuan, chuangJianQianTaiCuoWu({
    code: QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID,
    retryable: false,
    yingXiang,
    xiaYiBu: huoQuFanYi('tongYong', 'qingQiuWenTiXiaYiBu'),
  }))
}

function chongShiFenQuan(fenQuan: string): void {
  const daiZhi = fenQuanChongShi[fenQuan]
  if (!daiZhi) return
  fenQuanCuoWu.value = { ...fenQuanCuoWu.value, [fenQuan]: null }
  void daiZhi()
}

function qingFenQuanCuoWu(fenQuan: string): void {
  fenQuanCuoWu.value = { ...fenQuanCuoWu.value, [fenQuan]: null }
  delete fenQuanChongShi[fenQuan]
}

const BANG_FEN_QUAN = ['uid', 'fengJin', 'paiWei', 'gongKai', 'zhuXiao', 'beiJing', 'touXiang', 'qianMing', 'yongHuMing', 'miMa', 'shenSu'] as const

function tongYiShiBai(cuoWu: QianTaiCuoWu | null | undefined, lingYi: QianTaiCuoWu | null | undefined): boolean {
  if (!cuoWu || !lingYi) return false
  return cuoWu.lianAiMa === lingYi.lianAiMa && cuoWu.code === lingYi.code
}

const dingCengCuoWu = computed<QianTaiCuoWu | null>(() => {
  const quanJu = 设置仓库.caoZuoCuoWu
  for (const fenQuan of BANG_FEN_QUAN) {
    const cuoWu = fenQuanCuoWu.value[fenQuan]
    if (!cuoWu) continue
    if (quanJu && tongYiShiBai(quanJu, cuoWu)) continue
    return cuoWu
  }
  return quanJu
})

function chongShiDingCeng(): void {
  const quanJu = 设置仓库.caoZuoCuoWu
  const xianZai = BANG_FEN_QUAN.find((fenQuan) => fenQuanCuoWu.value[fenQuan])
  if (!xianZai) {
    void 设置仓库.chongShi()
    return
  }
  const benDi = fenQuanCuoWu.value[xianZai]
  if (quanJu && benDi && tongYiShiBai(quanJu, benDi)) {
    void 设置仓库.chongShi()
    chongShiFenQuan(xianZai)
    return
  }
  chongShiFenQuan(xianZai)
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
  qingFenQuanCuoWu('qianMing')
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
    qingChuQianMingCaoGao()
    qianMingTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    qianMingShiBai.value = true
    jieShouFenQuanCuoWu('qianMing', cuoWu, baoCunQianMing)
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
const renJiXianShi = ref(false)
const renJiZuJian = ref<人机测试实例 | null>(null)
let miMaDaoJiShiQi: ReturnType<typeof setInterval> | null = null

const moRenXingBieXuanZhong = ref<XingBie | null>(null)
const moRenDuiXiangXuanZhong = ref<XingBie | null>(null)
const xingBieFuWuQiKuaiZhao = { moRenXingBie: null as XingBie | null, moRenDuiXiang: null as XingBie | null }
let xingBieJingMoBaoCunZhong = false

function xingBieYouWeiBaoCun(): boolean {
  return (
    (moRenXingBieXuanZhong.value !== null && moRenXingBieXuanZhong.value !== xingBieFuWuQiKuaiZhao.moRenXingBie) ||
    (moRenDuiXiangXuanZhong.value !== null && moRenDuiXiangXuanZhong.value !== xingBieFuWuQiKuaiZhao.moRenDuiXiang)
  )
}

async function jingMoBaoCunXingBie(): Promise<void> {
  if (xingBieJingMoBaoCunZhong) return
  const xinXingBie = moRenXingBieXuanZhong.value
  const xinDuiXiang = moRenDuiXiangXuanZhong.value
  const gengXingBie = xinXingBie !== null && xinXingBie !== xingBieFuWuQiKuaiZhao.moRenXingBie
  const gengDuiXiang = xinDuiXiang !== null && xinDuiXiang !== xingBieFuWuQiKuaiZhao.moRenDuiXiang
  if (!gengXingBie && !gengDuiXiang) return
  xingBieJingMoBaoCunZhong = true
  try {
    if (gengXingBie) {
      const xinXi = await gengGaiMoRenXingBie(xinXingBie)
      用户仓库.tongBuZiLiao({ mo_ren_xing_bie: xinXi.mo_ren_xing_bie })
      xingBieFuWuQiKuaiZhao.moRenXingBie = 用户形态(xinXi.mo_ren_xing_bie)
    }
    if (gengDuiXiang) {
      const xinXi = await gengGaiMoRenDuiXiangXingBie(xinDuiXiang)
      用户仓库.tongBuZiLiao({ mu_biao_xing_bie: xinXi.mu_biao_xing_bie })
      xingBieFuWuQiKuaiZhao.moRenDuiXiang = 用户形态(xinXi.mu_biao_xing_bie)
    }
  } catch (cuoWu: unknown) {
    console.error('离页保存性别设置失败', cuoWu)
  } finally {
    xingBieJingMoBaoCunZhong = false
  }
}

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
  qingFenQuanCuoWu('yongHuMing')
  try {
    await gengGaiYongHuMing(yongHuMingCaoGao.value.trim())
    await 用户仓库.jiaZaiYongHu()
    yongHuMingTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    yongHuMingShiBai.value = true
    jieShouFenQuanCuoWu('yongHuMing', cuoWu, baoCunYongHuMing)
  } finally {
    yongHuMingBaoCunZhong.value = false
  }
}

function zhiXingFaSongMiMaMa() {
  if (!keYiFaSongMiMaMa.value || miMaFaSongZhong.value || renJiXianShi.value) return
  renJiXianShi.value = true
}

async function tiJiaoRenJi(yanZheng: 人机验证答案) {
  if (miMaFaSongZhong.value) return
  miMaFaSongZhong.value = true
  miMaShiBai.value = false
  miMaTiShi.value = ''
  qingFenQuanCuoWu('miMa')
  try {
    await faSongMa(用户仓库.dangQianYongHu!.shou_ji_hao, YAN_ZHENG_MA_YONG_TU.chongZhiMiMa, undefined, yanZheng)
    renJiXianShi.value = false
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
    if (shiRenJiYanZhengShiBai(cuoWu)) {
      renJiZuJian.value?.biaoShiYanZhengShiBai()
      return
    }
    renJiXianShi.value = false
    miMaShiBai.value = true
    jieShouFenQuanCuoWu('miMa', cuoWu, zhiXingFaSongMiMaMa)
  } finally {
    miMaFaSongZhong.value = false
  }
}

async function baoCunMiMa() {
  if (!keYiBaoCunMiMa.value) return
  if (xinMiMa.value !== queRenXinMiMa.value) {
    miMaShiBai.value = true
    miMaTiShi.value = ''
    jieShouBenDiQingQiuCuoWu('miMa', huoQuFanYi('renZheng', 'miMaBuYiZhi'))
    return
  }
  miMaBaoCunZhong.value = true
  miMaShiBai.value = false
  miMaTiShi.value = ''
  qingFenQuanCuoWu('miMa')
  try {
    await gengGaiMiMa(jiuMiMa.value, xinMiMa.value, queRenXinMiMa.value, miMaYanZhengMa.value)
    jiuMiMa.value = ''
    xinMiMa.value = ''
    queRenXinMiMa.value = ''
    miMaYanZhengMa.value = ''
    miMaTiShi.value = huoQuFanYi('sheZhi', 'baoCunChengGong')
  } catch (cuoWu: unknown) {
    miMaShiBai.value = true
    jieShouFenQuanCuoWu('miMa', cuoWu, baoCunMiMa)
  } finally {
    miMaBaoCunZhong.value = false
  }
}

const 完成总数 = 6
const 头像完成 = computed(() => !!dangQianTouXiang.value)
const 签名完成 = computed(() => !!(设置仓库.qianMing?.trim() || qianMingCaoGao.value.trim()))
const 用户名完成 = computed(() => !!dangQianMingCheng.value.trim())
const 密码完成 = computed(() => !!用户仓库.dangQianYongHu)
const 性别完成 = computed(() => !!(moRenXingBieXuanZhong.value || 用户仓库.dangQianYongHu?.mo_ren_xing_bie))
const 背景完成 = computed(() => !!设置仓库.liaoTianBeiJing)
const 完成数 = computed(
  () =>
    (头像完成.value ? 1 : 0) +
    (签名完成.value ? 1 : 0) +
    (用户名完成.value ? 1 : 0) +
    (密码完成.value ? 1 : 0) +
    (性别完成.value ? 1 : 0) +
    (背景完成.value ? 1 : 0),
)
const 完成百分比 = computed(() => Math.round((完成数.value / 完成总数) * 100))
const 好友数 = computed(() => haoYouKeXuan.value.length)
const 搜索中 = computed(() => 搜索关键词.value.trim().length > 0)

function 命中搜索(文本: string): boolean {
  if (!搜索中.value) return true
  return 文本.toLowerCase().includes(搜索关键词.value.trim().toLowerCase())
}

const touXiangSouSuoWenBen = computed(
  () => `${huoQuFanYi('sheZhi', 'touXiangBiaoTi')} ${huoQuFanYi('sheZhi', 'gengHuanTouXiang')}`,
)
const qianMingSouSuoWenBen = computed(
  () =>
    `${huoQuFanYi('sheZhi', 'qianMingBiaoTi')} ${huoQuFanYi('sheZhi', 'keJianXingBiaoTi')} ${huoQuFanYi('sheZhi', 'baoCunQianMing')}`,
)
const yongHuMingSouSuoWenBen = computed(
  () =>
    `${huoQuFanYi('caidan', 'xiuGaiYongHuMing')} ${huoQuFanYi('sheZhi', 'yongHuMingMiaoShu')}`,
)
const moRenXingBieSouSuoWenBen = computed(
  () =>
    `${huoQuFanYi('caidan', 'sheZhiMoRenXingBie')} ${huoQuFanYi('caidan', 'moRenXingBieMiaoShu')} ${huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')} ${huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')}`,
)
const moRenDuiXiangSouSuoWenBen = computed(
  () =>
    `${huoQuFanYi('caidan', 'sheZhiMoRenDuiXiangXingBie')} ${huoQuFanYi('caidan', 'moRenDuiXiangMiaoShu')} ${huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')} ${huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')}`,
)
const miMaSouSuoWenBen = computed(
  () => `${huoQuFanYi('caidan', 'xiuGaiMiMa')} ${huoQuFanYi('sheZhi', 'miMaMiaoShu')}`,
)
const fengJinSouSuoWenBen = computed(
  () => `${huoQuFanYi('sheZhi', 'fengJinBiaoTi')} ${huoQuFanYi('sheZhi', 'shenSuBiaoTi')}`,
)
const uidSouSuoWenBen = computed(
  () => `${huoQuFanYi('sheZhi', 'uidBiaoTi')} ${huoQuFanYi('sheZhi', 'fuZhiUID')} ${设置仓库.yongHuBianHao || ''}`,
)
const bangDingSouSuoWenBen = computed(
  () =>
    `${huoQuFanYi('sheZhi', 'bangDingBiaoTi')} ${huoQuFanYi('sheZhi', 'shouJiHaoYiBangDing')} ${huoQuFanYi('sheZhi', 'youXiangBangDing')} ${huoQuFanYi('sheZhi', 'douYinBangDing')}`,
)
const yinSiSouSuoWenBen = computed(
  () =>
    `${huoQuFanYi('sheZhi', 'yinSiBiaoTi')} ${huoQuFanYi('sheZhi', 'gongKaiZhangHao')} ${huoQuFanYi('sheZhi', 'gongKaiShouJiHao')} ${huoQuFanYi('sheZhi', 'gongKaiYouXiang')}`,
)
const beiJingSouSuoWenBen = computed(() => {
  const yuSheMing = 设置仓库
    .beiJingXiangMuLieBiao('qian')
    .filter((xiang) => xiang.leiXing === 'yuShe')
    .map((xiang) => xiang.mingCheng)
    .join(' ')
  return `${huoQuFanYi('sheZhi', 'liaoTianBeiJing')} ${huoQuFanYi('sheZhi', 'liaoTianYuLan')} ${huoQuFanYi('sheZhi', 'dangQianBeiJing')} ${huoQuFanYi('sheZhi', 'ziDingYiShangChuan')} ${huoQuFanYi('sheZhi', 'shanChuZiDingYiBeiJing')} ${设置仓库.dangQianBeiJingBiaoShu} ${yuSheMing} ${设置仓库.waiGuan.beiJing.map((xiang) => xiang.mingCheng).join(' ')}`
})
const qiPaoSouSuoWenBen = computed(
  () =>
    `${QI_PAO_WEN_AN.biaoTi} ${QI_PAO_WEN_AN.ziJiBiaoTi} ${QI_PAO_WEN_AN.aiBiaoTi} ${Object.values(QI_PAO_MING_CHENG_WEN_AN).join(' ')} ${huoQuFanYi('sheZhi', 'qiPaoMingCheng')} ${huoQuFanYi('sheZhi', 'shangChuanZiDingYiQiPao')} ${huoQuFanYi('sheZhi', 'shanChuZiDingYiQiPao')} ${设置仓库.waiGuan.qiPao.map((xiang) => xiang.mingCheng).join(' ')}`,
)
const paiWeiSouSuoWenBen = computed(
  () => `${huoQuFanYi('sheZhi', 'paiWeiBiaoTi')} ${huoQuFanYi('sheZhi', 'qingKongPaiWei')}`,
)
const tuPianSouSuoWenBen = computed(() => `${huoQuFanYi('duoMeiTi', 'sheZhiTuPianShouQuan')}`)
const zhuXiaoSouSuoWenBen = computed(
  () => `${huoQuFanYi('renZheng', 'zhuXiaoBiaoTi')} ${huoQuFanYi('renZheng', 'zhuXiaoMiaoShu')}`,
)

const 形象有命中 = computed(
  () =>
    命中搜索(touXiangSouSuoWenBen.value) ||
    命中搜索(qianMingSouSuoWenBen.value) ||
    命中搜索(yongHuMingSouSuoWenBen.value) ||
    命中搜索(moRenXingBieSouSuoWenBen.value) ||
    命中搜索(moRenDuiXiangSouSuoWenBen.value),
)
const 账号有命中 = computed(
  () =>
    命中搜索(miMaSouSuoWenBen.value) ||
    命中搜索(fengJinSouSuoWenBen.value) ||
    命中搜索(uidSouSuoWenBen.value) ||
    命中搜索(bangDingSouSuoWenBen.value) ||
    命中搜索(zhuXiaoSouSuoWenBen.value),
)
const 隐私有命中 = computed(
  () =>
    命中搜索(yinSiSouSuoWenBen.value) ||
    命中搜索(tuPianSouSuoWenBen.value) ||
    命中搜索(paiWeiSouSuoWenBen.value),
)
const 外观有命中 = computed(() => 命中搜索(beiJingSouSuoWenBen.value) || 命中搜索(qiPaoSouSuoWenBen.value))
const 无匹配 = computed(
  () => 搜索中.value && !形象有命中.value && !账号有命中.value && !隐私有命中.value && !外观有命中.value,
)

onMounted(() => {
  shenSuCaoGaoYiHuiFu.value = huiFuShenSuCaoGao()
  void 设置仓库.jiaZai().then(() => {
    if (!qianMingCaoGao.value) qianMingCaoGao.value = 设置仓库.qianMing || ''
    qianMingCaoGaoYiHuiFu.value = huiFuQianMingCaoGao()
    if (shiHeFaKeJianXing(设置仓库.qianMingKeJianXing)) {
      qianMingKeJianXing.value = 设置仓库.qianMingKeJianXing
    }
    qianMingBaiMingDan.value = [...设置仓库.qianMingBaiMingDan]
    if (设置仓库.qianMingKeJianXing === 'jin_bu_fen_ren') void jiaZaiHaoYouKeXuan()
  })
  yongHuMingCaoGao.value = 用户仓库.dangQianYongHu?.yong_hu_ming || ''
  moRenXingBieXuanZhong.value = 用户形态(用户仓库.dangQianYongHu?.mo_ren_xing_bie)
  moRenDuiXiangXuanZhong.value = 用户形态(用户仓库.dangQianYongHu?.mu_biao_xing_bie)
  xingBieFuWuQiKuaiZhao.moRenXingBie = moRenXingBieXuanZhong.value
  xingBieFuWuQiKuaiZhao.moRenDuiXiang = moRenDuiXiangXuanZhong.value
  void jiaZaiFengJinZhuangTai()
  void jiaZaiHaoYouKeXuan()
})

onBeforeUnmount(() => {
  if (miMaDaoJiShiQi) {
    clearInterval(miMaDaoJiShiQi)
    miMaDaoJiShiQi = null
  }
  void jingMoBaoCunXingBie()
})

onBeforeRouteLeave(() => {
  void jingMoBaoCunXingBie()
})

const fengJinZhuangTai = ref<FengJinZhuangTai | null>(null)
const shenSuLiYou = ref('')
const { huiFuCaoGao: huiFuShenSuCaoGao, qingChuCaoGao: qingChuShenSuCaoGao } = useCaoGao(CAO_GAO_JIAN.shenSu, shenSuLiYou)
const shenSuCaoGaoYiHuiFu = ref(false)
const shenSuTiJiaoZhong = ref(false)
const shenSuTiShi = ref('')
const shenSuShiBai = ref(false)

async function jiaZaiFengJinZhuangTai() {
  try {
    fengJinZhuangTai.value = await huoQuFengJinZhuangTai()
    qingFenQuanCuoWu('fengJin')
  } catch (cuoWu: unknown) {
    fengJinZhuangTai.value = null
    jieShouFenQuanCuoWu('fengJin', cuoWu, jiaZaiFengJinZhuangTai)
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
    shenSuTiShi.value = ''
    jieShouBenDiQingQiuCuoWu('shenSu', huoQuFanYi('sheZhi', 'shenSuLiYouWeiXie'))
    return
  }
  shenSuTiJiaoZhong.value = true
  shenSuShiBai.value = false
  shenSuTiShi.value = ''
  qingFenQuanCuoWu('shenSu')
  try {
    await tiJiaoShenSuApi(shenSuLiYou.value.trim())
    shenSuLiYou.value = ''
    qingChuShenSuCaoGao()
    await jiaZaiFengJinZhuangTai()
  } catch (cuoWu: unknown) {
    shenSuShiBai.value = true
    jieShouFenQuanCuoWu('shenSu', cuoWu, tiJiaoShenSu)
  } finally {
    shenSuTiJiaoZhong.value = false
  }
}

watch(qianMingKeJianXing, (xinZhi) => {
  if (xinZhi === 'jin_bu_fen_ren' && !haoYouKeXuan.value.length) void jiaZaiHaoYouKeXuan()
})

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
  qingFenQuanCuoWu('zhuXiao')
  try {
    await 用户仓库.zhiXingZhuXiao()
    router.push('/login')
  } catch (cuoWu: unknown) {
    jieShouFenQuanCuoWu('zhuXiao', cuoWu, () => {
      xianShiQueRen.value = true
    })
  }
}
</script>

<style scoped>
.zhang-hao-an-quan {
  --miZhi: #f6f1e7;
  --kaPian: #fffdf7;
  --bianKuang: #e7dcc8;
  --taoTu: #d97757;
  --taoTuShen: #b85a3e;
  --yeLv: #5b8c5a;
  --yeLvShen: #3e6b3e;
  --moSe: #2e2a24;
  --huiSe: #6f695e;
  --danLv: #eaf2e8;
  --weiXian: #a83a2e;
  --yuanJiao: 20px;
  --biaoTiZi: 'Noto Serif SC', 'Songti SC', 'SimSun', Georgia, serif;
  --zhengWenZi: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  
  padding: 5vh var(--jiange-zhong) calc(var(--jiange-da) * 2 + var(--jiange-zhong));
  display: flex;
  flex-direction: column;
  gap: var(--jiange-zhong);
  min-width: 0;
  background-color: var(--miZhi);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0 0.28 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  color: var(--moSe);
  font-family: var(--zhengWenZi);
}


:root[data-theme='dark'] .zhang-hao-an-quan,
:root:not([data-theme]) .zhang-hao-an-quan {
  --miZhi: #1e1b16;
  --kaPian: #2a251e;
  --bianKuang: #4a4238;
  --taoTu: #e89572;
  --taoTuShen: #e89572;
  --yeLv: #7baf7a;
  --yeLvShen: #7baf7a;
  --moSe: #f3ede0;
  --huiSe: #a79e8e;
  --danLv: #2e3a2e;
  
  --weiXian: #ef8577;
}

.sou-suo-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  margin-top: calc(var(--jiange-zhong) + var(--jiange-4));
  flex-wrap: wrap;
}

.sou-suo-qing-kong {
  flex: none;
}

.sou-suo-kong-tai {
  background-color: var(--kaPian);
  border: 1.5px solid var(--bianKuang);
  border-radius: var(--yuanJiao);
  padding: calc(var(--jiange-zhong) + var(--jiange-4)) calc(var(--jiange-zhong) + var(--jiange-2));
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  align-items: center;
}

.ming-pian {
  margin-top: var(--jiange-4);
  background-color: var(--kaPian);
  border: 1.5px solid var(--bianKuang);
  border-radius: var(--yuanJiao);
  padding: var(--jiange-da) calc(var(--jiange-zhong) + var(--jiange-6));
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(46, 42, 36, 0.08);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0 0.28 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}

.ming-pian-nei {
  display: flex;
  gap: calc(var(--jiange-zhong) + var(--jiange-4));
  align-items: center;
  min-width: 0;
}

.blob-tou {
  width: 104px;
  height: 104px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--biaoTiZi);
  font-size: 42px;
  color: var(--kaPian);
  background-color: var(--taoTu);
  border-radius: 6px;
  overflow: hidden;
}

.ming-pian-wen {
  min-width: 0;
  flex: 1;
}

.xing-ming {
  font-family: var(--biaoTiZi);
  font-size: 28px;
  margin: var(--jiange-4) 0 0;
  color: var(--moSe);
}

.qian-ming-dan {
  font-size: 14px;
  color: var(--huiSe);
  margin: var(--jiange-6) 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uid-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-xiao);
  font-size: 13px;
  color: var(--huiSe);
  flex-wrap: wrap;
}

.shu-zu {
  display: flex;
  gap: calc(var(--jiange-zhong) + var(--jiange-6));
  margin-top: calc(var(--jiange-xiao) + var(--jiange-6));
}

.shu-zu div b {
  font-family: var(--biaoTiZi);
  font-size: 20px;
  display: block;
  color: var(--moSe);
}

.shu-zu div span {
  font-size: 12px;
  color: var(--huiSe);
}

.wan-cheng {
  margin-top: calc(var(--jiange-xiao) + var(--jiange-6));
}

.wan-cheng-wen {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--huiSe);
  margin-bottom: var(--jiange-6);
}

.jin-du-cao {
  height: 10px;
  border-radius: 999px;
  background: var(--bianKuang);
  overflow: hidden;
  border: 1px solid var(--bianKuang);
}

.jin-du-tiao {
  height: 100%;
  background-color: var(--yeLv);
  border-radius: 999px;
}

.biao-qian-lan {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--miZhi);
  border: 1.5px solid var(--bianKuang);
  border-radius: var(--yuanJiao);
  padding: var(--jiange-6);
  display: flex;
  gap: var(--jiange-4);
}

.biao-qian-lan button {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--biaoTiZi);
  font-size: 16px;
  color: var(--huiSe);
  padding: var(--jiange-12) var(--jiange-4);
  border-radius: 14px;
  cursor: pointer;
  min-width: 0;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}

.biao-qian-lan button.biao-qian-huo-yue {
  color: var(--taoTuShen);
  background-color: var(--kaPian);
  border-bottom-color: var(--taoTu);
}

.biao-qian-lan button:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.zhi-wu-ka-pian {
  scroll-margin-top: var(--biaoqian-lan-gao-du);
  background-color: var(--kaPian);
  border: 1.5px solid var(--bianKuang);
  border-radius: var(--yuanJiao);
  padding: calc(var(--jiange-zhong) + var(--jiange-4)) calc(var(--jiange-zhong) + var(--jiange-2));
  margin-bottom: calc(var(--jiange-xiao) + var(--jiange-6));
  box-shadow: 0 4px 14px rgba(46, 42, 36, 0.06);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0 0.28 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.zhi-wu-ka-pian.sou-zhong-gao-liang {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.wai-guan-da-kuang {
  gap: 0;
}

.wai-guan-fen-duan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.wai-guan-fen-duan + .wai-guan-fen-duan {
  margin-top: var(--jiange-da);
  padding-top: var(--jiange-da);
  border-top: 1px solid var(--bianKuang);
}

.wai-guan-fen-duan.sou-zhong-gao-liang {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
  border-radius: var(--yuanjiao-xiao);
}

.kapian-biao-ti {
  font-family: var(--biaoTiZi);
  font-size: 19px;
  color: var(--moSe);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.kapian-biao-ti::before {
  content: '';
  width: 8px;
  height: 22px;
  border-radius: 4px;
  background-color: var(--taoTu);
  flex: none;
}

.kapian-miao-shu {
  font-size: 14px;
  color: var(--huiSe);
  line-height: 1.6;
  margin: 0;
}

.yanzhengma-hang {
  display: flex;
  gap: var(--jiange-10);
}

.yanzhengma-hang .xiao-anniu {
  flex: none;
}

.xingbie-wangge {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--jiange-10);
  min-width: 0;
}

.xingbie-kapian {
  padding: calc(var(--jiange-xiao) + var(--jiange-6));
  border-radius: 16px;
  border: 2px solid var(--bianKuang);
  background-color: var(--kaPian);
  font-family: var(--biaoTiZi);
  font-size: 16px;
  cursor: pointer;
  color: var(--moSe);
  min-width: 0;
}

.xingbie-kapian.beiXuanZhong[data-xuan-xing-bie='nan'] {
  background-color: var(--xingbie-nan-tan-beijing);
  border-color: var(--xingbie-nan-shen-biankuang);
  color: var(--xingbie-nan-tan-wenben);
  font-weight: 600;
  box-shadow: inset 0 0 0 var(--kuang-huan-kuan) var(--xingbie-nan-xuan-huan);
}

.xingbie-kapian.beiXuanZhong[data-xuan-xing-bie='nv'] {
  background-color: var(--xingbie-nv-tan-beijing);
  border-color: var(--xingbie-nv-shen-biankuang);
  color: var(--xingbie-nv-tan-wenben);
  font-weight: 600;
  box-shadow: inset 0 0 0 var(--kuang-huan-kuan) var(--xingbie-nv-xuan-huan);
}

.shuang-lie {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}


.yongHuMingDuZhan {
  grid-column: 1 / -1;
}

.yulan-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-zhong);
  flex-wrap: wrap;
}

.yulan-wei {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-family: var(--biaoTiZi);
  color: var(--kaPian);
  background-color: var(--taoTu);
}

.ti-shi-wen {
  font-size: 13px;
  color: var(--yeLvShen);
  margin: 0;
  min-height: 18px;
}

.ti-shi-cuowu {
  color: var(--weiXian);
}

.yincang-wenjian-shuru {
  display: none;
}

.zi-fu-ji-shu {
  font-size: 12px;
  color: var(--huiSe);
  margin: 0;
  text-align: right;
}

.ke-jian-xing-hang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-12);
  font-size: 14px;
  color: var(--moSe);
  flex-wrap: wrap;
}

.ke-jian-xing-hang :deep(.tongyong-xiala-biao--keJianXing) {
  flex: 1;
  min-width: 160px;
}

.bai-ming-dan-qu {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  max-height: 180px;
  overflow-y: auto;
  border: 1.5px dashed var(--yeLv);
  border-radius: 14px;
  padding: var(--jiange-12);
}

.bai-ming-dan-xiang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  font-size: 14px;
  color: var(--moSe);
  cursor: pointer;
}

.bai-ming-dan-xiang input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--yeLv);
}

.xiao-anniu {
  padding: var(--jiange-12) calc(var(--jiange-zhong) + var(--jiange-6));
  font-size: 14px;
  align-self: flex-start;
}

.kai-guan-hang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-12);
  padding: var(--jiange-12) var(--jiange-2);
  border-bottom: 1px solid var(--bianKuang);
  font-size: 14px;
  color: var(--moSe);
}

.kai-guan-hang:last-of-type {
  border-bottom: none;
}

.kai-guan-hang input[type='checkbox'] {
  position: relative;
  width: 52px;
  height: 28px;
  flex: none;
  appearance: none;
  cursor: pointer;
  background: var(--bianKuang);
  border-radius: 999px;
  border: 1px solid var(--bianKuang);
}

.kai-guan-hang input[type='checkbox']::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--kaPian);
}

.kai-guan-hang input[type='checkbox']:checked {
  background-color: var(--yeLv);
  border-color: var(--yeLv);
}

.kai-guan-hang input[type='checkbox']:checked::before {
  left: 24px;
}

.kai-guan-hang input[type='checkbox']:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}




.uid-wenben {
  word-break: break-all;
}

.uid-fu-zhi {
  padding: var(--jiange-4) var(--jiange-12);
  font-size: 12px;
  border-radius: 999px;
}

.anniu-zhu-yao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--jiange-xiao) + var(--jiange-6)) calc(var(--jiange-da) + var(--jiange-xiao));
  background-color: var(--weiXian);
  color: var(--kaPian);
  border: 1.5px solid var(--weiXian);
  border-radius: 14px;
  font-size: 15px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  cursor: pointer;
  letter-spacing: 0.5px;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.anniu-zhu-yao:active:not(:disabled) {
  background-color: var(--taoTuShen);
}

.anniu-zhu-yao:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anniu-fu-zhu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-12) calc(var(--jiange-da) + var(--jiange-4));
  background: transparent;
  color: var(--yeLvShen);
  border: 1.5px solid var(--yeLv);
  border-radius: 14px;
  font-size: 14px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  cursor: pointer;
  font-family: inherit;
}

.anniu-fu-zhu:active:not(:disabled) {
  background-color: var(--danLv);
}

.anniu-fu-zhu:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


.zhu-xiao-an-niu {
  margin-top: var(--jiange-xiao);
}

.anniu-wei-xian {
  background-color: var(--weiXian);
  border-color: var(--weiXian);
  color: var(--kaPian);
}

.tan-chuang-bei-jing {
  position: fixed;
  inset: 0;
  background: rgba(46, 42, 36, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  z-index: 1000;
}

.tan-chuang-rong-qi {
  background-color: var(--kaPian);
  border: 1.5px solid var(--bianKuang);
  border-radius: var(--yuanJiao);
  padding: calc(var(--jiange-da) + var(--jiange-4)) var(--jiange-da);
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 24px rgba(46, 42, 36, 0.08);
}

.tan-chuang-biao-ti {
  font-family: var(--biaoTiZi);
  font-size: 20px;
  color: var(--moSe);
  margin: 0 0 var(--jiange-12);
}

.tan-chuang-miao-shu {
  font-size: 14px;
  color: var(--huiSe);
  line-height: 1.6;
  margin: 0 0 var(--jiange-da);
}

.tan-chuang-an-niu-qun {
  display: flex;
  gap: var(--jiange-12);
  justify-content: center;
}

.tan-chuang-an-niu-qun .anniu-zhu-yao {
  max-width: 140px;
  flex: 1;
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

.kai-guan-rongqi {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--jiange-xiao);
}

.kai-guan-rongqi input[type='checkbox'] {
  appearance: none;
  width: 52px;
  height: 28px;
  border-radius: 999px;
  background: var(--bianKuang);
  border: 1.5px solid var(--bianKuang);
  position: relative;
  cursor: pointer;
}

.kai-guan-rongqi input[type='checkbox']:checked {
  background-color: var(--yeLv);
  border-color: var(--yeLv);
}

.kai-guan-rongqi input[type='checkbox']::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--kaPian);
}

.kai-guan-rongqi input[type='checkbox']:checked::before {
  transform: translateX(24px);
}

.kai-guan-rongqi input[type='checkbox']:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

@media (min-width: 768px) {
  .zhang-hao-an-quan {
    padding: 5vh var(--jiange-da) calc(var(--jiange-da) * 3);
  }

  .shuang-lie {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--jiange-xiao) + var(--jiange-6));
  }

  .shuang-lie .zhi-wu-ka-pian {
    margin-bottom: calc(var(--jiange-xiao) + var(--jiange-6));
  }

  .biao-qian-lan button {
    font-size: 17px;
  }
}

@media (min-width: 1280px) {
  .zhang-hao-an-quan {
    max-width: 1020px;
  }

  .ming-pian-nei {
    gap: calc(var(--jiange-da) + var(--jiange-4));
  }
}

@media (max-width: 767px) {
  .zhang-hao-an-quan {
    padding-top: var(--jiange-da);
  }
}

@media (max-width: 480px) {
  .ming-pian-nei {
    flex-direction: column;
    text-align: center;
  }

  .ming-pian-wen {
    width: 100%;
  }

  .qian-ming-dan {
    white-space: normal;
  }

  .uid-hang,
  .shu-zu {
    justify-content: center;
  }

  .yanzhengma-hang {
    flex-direction: column;
  }

  .yanzhengma-hang .xiao-anniu {
    width: 100%;
  }

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
  .tan-chuang-leave-active,
  .xingbie-kapian,
  .kai-guan-rongqi input[type='checkbox'] {
    transition: none !important;
  }
}




@keyframes fp03-ru-chang {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.zhang-hao-an-quan .ming-pian {
  animation: fp03-ru-chang 0.5s ease-out both;
}

.zhang-hao-an-quan .biao-qian-lan {
  animation: fp03-ru-chang 0.5s 0.08s ease-out both;
}

.zhang-hao-an-quan section[role='tabpanel'] .zhi-wu-ka-pian {
  animation: fp03-ru-chang 0.45s ease-out both;
}

.zhang-hao-an-quan section[role='tabpanel'] .shuang-lie .zhi-wu-ka-pian {
  animation-delay: 0.1s;
}

.zhang-hao-an-quan section[role='tabpanel'] {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  transition-behavior: allow-discrete;
}

@starting-style {
  .zhang-hao-an-quan section[role='tabpanel'] {
    opacity: 0;
    transform: translateY(8px);
  }
}

.zhang-hao-an-quan .anniu-fu-zhu,
.zhang-hao-an-quan .anniu-zhu-yao,
.zhang-hao-an-quan .xingbie-kapian,
.zhang-hao-an-quan .biao-qian-lan button {
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (hover: hover) {
  .zhang-hao-an-quan .anniu-fu-zhu:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--yeLvShen);
  }

  .zhang-hao-an-quan .anniu-zhu-yao:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .zhang-hao-an-quan .xingbie-kapian:hover {
    transform: translateY(-1px);
  }

  .zhang-hao-an-quan .biao-qian-lan button:hover {
    color: var(--moSe);
  }
}

.zhang-hao-an-quan .anniu-fu-zhu:active:not(:disabled),
.zhang-hao-an-quan .anniu-zhu-yao:active:not(:disabled),
.zhang-hao-an-quan .xingbie-kapian:active {
  transform: scale(0.98);
}

.zhang-hao-an-quan .jin-du-tiao {
  transition: width 0.3s ease;
}

.zhang-hao-an-quan .kai-guan-hang input[type='checkbox']::before {
  transition: left 0.18s ease;
}

.zhang-hao-an-quan .kai-guan-rongqi input[type='checkbox']::before {
  transition: transform 0.18s ease;
}

.zhang-hao-an-quan .mao-dian:target {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.zhang-hao-an-quan .biao-qian-lan button.biao-qian-huo-yue {
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}


.zhang-hao-an-quan .biao-qian-lan {
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 767px) {
  .zhang-hao-an-quan {
    --zhanghao-biaoqian-lan-gao: 124px;
  }

  .zhang-hao-an-quan .zhi-wu-ka-pian {
    scroll-margin-top: var(--zhanghao-biaoqian-lan-gao);
  }

  .zhang-hao-an-quan .biao-qian-lan {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--jiange-4);
    overflow-x: visible;
  }

  .zhang-hao-an-quan .biao-qian-lan button {
    flex: none;
    overflow: visible;
    text-overflow: clip;
    font-size: var(--ziti-zhong);
    padding: var(--jiange-10) var(--jiange-4);
  }
}

.zhang-hao-an-quan .xing-ming {
  overflow-wrap: anywhere;
  min-width: 0;
}

.zhang-hao-an-quan .shu-zu {
  flex-wrap: wrap;
  min-width: 0;
}

.zhang-hao-an-quan .wan-cheng-wen {
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}

.zhang-hao-an-quan .kapian-miao-shu {
  overflow-wrap: anywhere;
  min-width: 0;
}

.zhang-hao-an-quan img {
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .zhang-hao-an-quan .ming-pian,
  .zhang-hao-an-quan .biao-qian-lan,
  .zhang-hao-an-quan section[role='tabpanel'] .zhi-wu-ka-pian {
    animation: none !important;
  }

  .zhang-hao-an-quan section[role='tabpanel'],
  .zhang-hao-an-quan .anniu-fu-zhu,
  .zhang-hao-an-quan .anniu-zhu-yao,
  .zhang-hao-an-quan .xingbie-kapian,
  .zhang-hao-an-quan .biao-qian-lan button,
  .zhang-hao-an-quan .jin-du-tiao,
  .zhang-hao-an-quan .kai-guan-hang input[type='checkbox']::before,
  .zhang-hao-an-quan .kai-guan-rongqi input[type='checkbox']::before {
    transition: none !important;
  }

  .zhang-hao-an-quan .mao-dian:target {
    outline-width: var(--jujiao-huan-kuan-du-wenben);
  }
}
</style>
