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
                  xiaoXi.fa_song_zhe_lei_xing === 'jiaose' && xiaoXi.lei_xing !== 'xitong',
                'xitong-xiaoxi': xiaoXi.lei_xing === 'xitong',
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
              <template v-else-if="xiaoXi.lei_xing === 'xitong'">
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
                <div class="qipao-waike">
                  <div class="qipao-neirong">
                    {{ xiaoXi.nei_rong }}
                  </div>
                </div>
                <div
                  v-if="
                    !fuPanMoShi && xiaoXi.fa_song_zhong && xiaoXi.fa_song_zhe_lei_xing === 'yonghu'
                  "
                  class="fasong-zhuangtai"
                  :aria-label="huoQuFanYi('liaoTian', 'faSongZhong')"
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
          :title="huoQuFanYi('liaoTian', 'yuYin')"
          :aria-label="huoQuFanYi('liaoTian', 'yuYin')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
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
      <Transition name="emoji-zhankai" @after-enter="gunDongDaoDiBu" @after-leave="gunDongDaoDiBu">
        <div v-if="!fuPanMoShi && emojiMianBanZhanKai" class="emoji-mianban">
          <button
            v-for="emoji in changYongEmoji"
            :key="emoji"
            class="emoji-xiangmu"
            @click="chaRuEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </Transition>
    </footer>

    <Teleport to="body">
      <Transition name="youce-huadong">
        <JunShiZhiDao
          v-if="junShiZhanKai"
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

import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { shiTuPianDiZhi } from '@/utils/头像'
import type { 消息 } from '@/types'
import JunShiZhiDao from '@/components/军师指导.vue'
import GuanLiJianKong from '@/components/管理员监控.vue'
import { huoQuFuPan, type 复盘批注项 } from '@/api/聊天'

defineOptions({
  name: 'liaoTian',
})

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const 用户仓库 = 使用用户仓库()

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

// 面板高度在过渡结束时才定型，重新贴底交由 Transition 的 after-enter / after-leave 触发；
// 在此处按 nextTick 贴底会早于过渡完成，最后一条消息仍会被涨起来的面板顶出视口
function qieHuanEmojiMianBan() {
  emojiMianBanZhanKai.value = !emojiMianBanZhanKai.value
}

function chaRuEmoji(emoji: string) {
  shuRuNeiRong.value += emoji
}

// 表情面板展开时，点击页面任意「非表情面板、非表情按钮」区域即收起
function chuLiWenDangDianJi(event: MouseEvent) {
  if (!emojiMianBanZhanKai.value) return
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('.emoji-mianban') || target.closest('.biaoqing-anniu')) return
  emojiMianBanZhanKai.value = false
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
  if (jianPanPianYi > 80) {
    huaDongShuRuLanKeJian()
  }
}

function chuLiShuRuKuangJuJiao() {
  emojiMianBanZhanKai.value = false
  huaDongShuRuLanKeJian()
}

watch(
  () => (Array.isArray(聊天仓库.xiaoXiLieBiao) ? 聊天仓库.xiaoXiLieBiao.length : 0),
  () => {
    gunDongDaoDiBu()
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
    if (jieGuo) {
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
  junShiZhanKai.value = true
}

function qingLiUIMianBan() {
  emojiMianBanZhanKai.value = false
  junShiZhanKai.value = false
  cheHuiCaiDanZhanKai.value = false
  shuRuKuangZhanKai.value = false
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

onMounted(async () => {
  window.addEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', chuLiShiJiaoKouBianHua)
    window.visualViewport.addEventListener('scroll', chuLiShiJiaoKouBianHua)
  }
  qiDongShiJianGengXinQi()
  window.addEventListener('resize', chongSuanShuRuKuangGaoDu)
  document.addEventListener('click', chuLiWenDangDianJi, true)
  nextTick(() => ceLiangShuRuKuang())
  await chuShiHuaLiaoTian()
  yiTongGuoMountedChuShiHua = true
})

onActivated(async () => {
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
  window.removeEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)
  window.removeEventListener('resize', chongSuanShuRuKuangGaoDu)
  document.removeEventListener('click', chuLiWenDangDianJi, true)
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
  padding: 12px 16px;
  padding-bottom: 20px;
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
.gengduo-gongneng-anniu {
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
.gengduo-gongneng-anniu svg {
  width: 28px;
  height: 28px;
}

.biaoqing-anniu.huoyue {
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
  overflow: hidden;
}

.emoji-zhankai-enter-to,
.emoji-zhankai-leave-from {
  /* 必须匹配静态态 .emoji-mianban{max-height:200px}，否则进入→静止、静止→收起交接瞬间 220px 与 200px 不一致产生跳变 */
  max-height: 200px;
}

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
