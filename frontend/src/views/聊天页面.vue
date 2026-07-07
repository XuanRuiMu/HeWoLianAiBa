<template>
  <div class="liaotian-yemian">
    <main ref="xiaoxiQuYuRef" class="xiaoxi-quyu">
      <TransitionGroup name="xiaoxi-guodu" tag="div">
        <template v-for="(zu, suoYin) in xiaoXiFenZu" :key="'zu-' + suoYin">
          <div class="shijian-biaoqian">
            {{ zu.shiJian }}
          </div>
          <template v-for="xiaoXi in zu.xiaoXiLieBiao" :key="xiaoXi.id">
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
              @contextmenu.prevent="daKaiCaiDan(xiaoXi, $event)"
              @touchstart="chuMoKaiShi(xiaoXi)"
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
                    v-if="聊天仓库.jiaoSeXinXi?.tou_xiang"
                    :src="聊天仓库.jiaoSeXinXi.tou_xiang"
                    class="touxiang-tu"
                    alt=""
                  />
                  <span v-else class="touxiang-moren-xiaoxi">👤</span>
                </div>
                <div class="qipao-neirong">
                  {{ xiaoXi.nei_rong }}
                  <span v-if="xiaoXi.fa_song_zhong" class="fasong-zhong-biaoji">⏳</span>
                </div>
                <div
                  v-if="xiaoXi.fa_song_zhe_lei_xing === 'yonghu'"
                  class="xiaoxi-touxiang yonghu-touxiang-xiaoxi"
                >
                  <img
                    v-if="用户仓库.dangQianYongHu?.tou_xiang"
                    :src="用户仓库.dangQianYongHu.tou_xiang"
                    class="touxiang-tu"
                    alt=""
                  />
                  <span v-else class="touxiang-moren-xiaoxi">🧑</span>
                </div>
              </template>
            </div>
          </template>
        </template>
      </TransitionGroup>

      <div v-if="聊天仓库.zhengZaiShuRu" class="dazi-tishi">
        <span class="dazi-dian" />
        <span class="dazi-dian" />
        <span class="dazi-dian" />
        <span class="dazi-wenben">对方正在输入...</span>
      </div>
    </main>

    <footer class="shuru-quyu">
      <div v-if="liaoTianSuoDing" class="suoding-tishi">本局游戏已结束，无法继续发送消息</div>
      <div v-else class="shuru-rongqi">
        <button
          class="emoji-anniu"
          :class="{ huoyue: emojiMianBanZhanKai }"
          title="表情"
          @click="qieHuanEmojiMianBan"
        >
          😊
        </button>
        <input
          v-model="shuRuNeiRong"
          type="text"
          class="shuru-kuang"
          placeholder="输入消息..."
          :disabled="faSongZhong"
          @keydown.enter="faSong"
          @focus="emojiMianBanZhanKai = false"
        />
        <button
          class="gaobai-anniu"
          :disabled="gaoBaiJinXingZhong"
          title="告白"
          @click="zhiXingGaoBai"
        >
          💕
        </button>
        <button
          class="fasong-anniu"
          :disabled="!shuRuNeiRong.trim() || faSongZhong"
          @click="faSong"
        >
          发送
        </button>
      </div>
      <Transition name="emoji-zhankai">
        <div v-if="emojiMianBanZhanKai" class="emoji-mianban">
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
              {{ youXiShiJianLeiXing === 'shengli' ? '恭喜通关！' : '攻略失败' }}
            </h2>
            <p class="youxi-miaoshu">
              {{ youXiShiJianNeiRong }}
            </p>
            <div class="youxi-anniu-zu">
              <button class="youxi-anniu fanhui" @click="fanhuiShouYe">返回首页</button>
              <button class="youxi-anniu chakan" @click="chakanZhanJi">查看战绩</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div v-if="cheHuiCaiDanZhanKai" class="chehui-zhezhao" @click="cheHuiCaiDanZhanKai = false">
          <div class="chehui-caidan" :style="cheHuiCaiDanYangShi">
            <button class="chehui-xiangmu" @click="zhiXingCheHui">撤回</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { faSongKaiChangBai, chuLiGaoBai } from '@/api/聊天'
import type { 消息 } from '@/types'
import JunShiZhiDao from '@/components/军师指导.vue'

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
const emojiMianBanZhanKai = ref(false)

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
  '🎵',
  '🎶',
  '🎤',
  '🎧',
  '🎸',
  '🎹',
  '🥁',
  '🎺',
]

function qieHuanEmojiMianBan() {
  emojiMianBanZhanKai.value = !emojiMianBanZhanKai.value
}

function chaRuEmoji(emoji: string) {
  shuRuNeiRong.value += emoji
}

const cheHuiCaiDanZhanKai = ref(false)
const cheHuiCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
const xuanZhongXiaoXi = ref<消息 | null>(null)
let changAnDingShiQi: ReturnType<typeof setTimeout> | null = null

const liaoTianSuoDing = computed(() => {
  return 聊天仓库.youXiYiJieShu && !聊天仓库.keJiXuLiaoTian
})

interface XiaoXiFenZuXiang {
  shiJian: string
  xiaoXiLieBiao: 消息[]
}

const xiaoXiFenZu = computed<XiaoXiFenZuXiang[]>(() => {
  const lieBiao = 聊天仓库.xiaoXiLieBiao
  if (!Array.isArray(lieBiao)) return []
  const zuMap = new Map<string, 消息[]>()
  for (const xiaoXi of lieBiao) {
    const riQi = new Date(xiaoXi.shi_jian_chuo)
    const utc = riQi.getTime() + riQi.getTimezoneOffset() * 60000
    const beiJing = new Date(utc + 8 * 3600000)
    const shi = String(beiJing.getHours()).padStart(2, '0')
    const fen = String(beiJing.getMinutes()).padStart(2, '0')
    const fenZuJian = `${shi}:${fen}`
    if (!zuMap.has(fenZuJian)) {
      zuMap.set(fenZuJian, [])
    }
    zuMap.get(fenZuJian)!.push(xiaoXi)
  }
  const jieGuo: XiaoXiFenZuXiang[] = []
  zuMap.forEach((xiaoXiLieBiao, shiJian) => {
    jieGuo.push({ shiJian, xiaoXiLieBiao })
  })
  return jieGuo
})

function gunDongDaoDiBu() {
  nextTick(() => {
    if (xiaoxiQuYuRef.value) {
      xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
    }
  })
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

async function faSong() {
  if (!shuRuNeiRong.value.trim() || faSongZhong.value) return
  faSongZhong.value = true
  try {
    await 聊天仓库.faSongXiaoXi(shuRuNeiRong.value.trim())
    shuRuNeiRong.value = ''
    gunDongDaoDiBu()
  } finally {
    faSongZhong.value = false
  }
}

async function zhiXingGaoBai() {
  if (!聊天仓库.jiaoSeXinXi?.id || gaoBaiJinXingZhong.value) return
  gaoBaiJinXingZhong.value = true
  try {
    await chuLiGaoBai(聊天仓库.jiaoSeXinXi.id, '我们正式交往吧')
  } catch (e) {
    console.warn('告白失败', e)
  } finally {
    gaoBaiJinXingZhong.value = false
  }
}

function daKaiCaiDan(xiaoXi: 消息, shiJian: MouseEvent) {
  if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
  const liangFenZhong = 2 * 60 * 1000
  if (Date.now() - xiaoXi.shi_jian_chuo > liangFenZhong) return
  xuanZhongXiaoXi.value = xiaoXi
  cheHuiCaiDanYangShi.value = {
    top: `${shiJian.clientY}px`,
    left: `${shiJian.clientX}px`,
  }
  cheHuiCaiDanZhanKai.value = true
}

function chuMoKaiShi(xiaoXi: 消息) {
  if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
  const liangFenZhong = 2 * 60 * 1000
  if (Date.now() - xiaoXi.shi_jian_chuo > liangFenZhong) return
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
  if (!聊天仓库.youXiYiJieShu) {
    junShiZhanKai.value = true
  }
}

onMounted(async () => {
  window.addEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)

  const huiHuaId = route.params.huiHuaId as string
  if (huiHuaId) {
    await 聊天仓库.jiaZaiXiaoXi(huiHuaId)
    聊天仓库.lianJieSocket(huiHuaId)
    gunDongDaoDiBu()

    if (聊天仓库.xiaoXiLieBiao.length === 0 && 聊天仓库.jiaoSeXinXi?.id) {
      try {
        await faSongKaiChangBai(聊天仓库.jiaoSeXinXi.id)
        await 聊天仓库.jiaZaiXiaoXi(huiHuaId)
        gunDongDaoDiBu()
      } catch (e) {
        console.warn('发送开场白失败', e)
      }
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('junshi-zhankai', junShiZhanKaiJianTingQi)
  聊天仓库.qingKongZhuangTai()
})
</script>

<style scoped>
.liaotian-yemian {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 52px);
  width: 100%;
  background: linear-gradient(
    135deg,
    var(--beijing-jianbian-1),
    var(--beijing-jianbian-2),
    var(--beijing-jianbian-3),
    var(--beijing-jianbian-4)
  );
  background-size: 300% 300%;
  animation: jianbian-liudong 12s ease infinite;
}

.xiaoxi-quyu {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  -webkit-overflow-scrolling: touch;
}

.xiaoxi-quyu::-webkit-scrollbar {
  width: 4px;
}

.xiaoxi-quyu::-webkit-scrollbar-track {
  background: transparent;
}

.xiaoxi-quyu::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 2px;
}

.shijian-biaoqian {
  text-align: center;
  font-size: 12px;
  color: var(--wenben-ciuse);
  background: var(--shijian-biaoqian-beijing);
  padding: 2px 8px;
  border-radius: 4px;
  align-self: center;
  margin: 8px 0;
}

.xiaoxi-xiangmu {
  max-width: 70%;
  position: relative;
  display: flex;
}

.xiaoxi-xiangmu.yonghu-xiaoxi {
  align-self: flex-end;
  flex-direction: row;
  gap: 8px;
}

.xiaoxi-xiangmu.jiaose-xiaoxi {
  align-self: flex-start;
  flex-direction: row;
  gap: 8px;
}

.xiaoxi-xiangmu.xitong-xiaoxi {
  align-self: center;
  max-width: 90%;
}

.xiaoxi-xiangmu.chehui-xiaoxi {
  align-self: center;
}

.xiaoxi-touxiang {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-touming-beijing);
  flex-shrink: 0;
}

.touxiang-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.touxiang-moren-xiaoxi {
  font-size: 16px;
}

.qipao-neirong {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  box-shadow: var(--qipao-yinying);
}

.yonghu-xiaoxi .qipao-neirong {
  background: linear-gradient(135deg, var(--yonghu-qipao-1), var(--yonghu-qipao-2));
  color: var(--wenzi-baise);
  border-bottom-right-radius: 4px;
}

.jiaose-xiaoxi .qipao-neirong {
  background: var(--xiaoxi-jiaose-beijing);
  color: var(--xiaoxi-jiaose-wenben);
  border-bottom-left-radius: 4px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.xitong-neirong {
  font-size: 12px;
  color: var(--wenben-ciuse);
  text-align: center;
  padding: 4px 0;
}

.chehui-tishi {
  font-size: 12px;
  color: var(--chexiao-wenben);
  text-align: center;
  padding: 4px 0;
}

.fasong-zhong-biaoji {
  display: inline-block;
  margin-left: 4px;
  font-size: 10px;
  animation: fasong-xuanzhuan 1s linear infinite;
  opacity: 0.6;
}

@keyframes fasong-xuanzhuan {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.dazi-tishi {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: var(--xiaoxi-jiaose-beijing);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  align-self: flex-start;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.dazi-dian {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dazi-dian-se);
  animation: dazi-tiaodong 1.4s infinite ease-in-out;
}

.dazi-dian:nth-child(2) {
  animation-delay: 0.2s;
}

.dazi-dian:nth-child(3) {
  animation-delay: 0.4s;
}

.dazi-wenben {
  font-size: 12px;
  color: var(--wenben-ciuse);
  margin-left: 4px;
}

@keyframes dazi-tiaodong {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.shuru-quyu {
  padding: 8px 12px;
  padding-bottom: calc(8px + var(--anquan-quyu-xia));
  background: var(--shuru-quyu-beijing);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shuru-rongqi {
  display: flex;
  align-items: center;
  gap: 8px;
}

.suoding-tishi {
  text-align: center;
  font-size: 13px;
  color: var(--wenben-ciuse);
  padding: 10px 0;
  opacity: 0.7;
}

.shuru-kuang {
  flex: 1;
  padding: 10px 14px;
  background: var(--shu-ru-bei-jing);
  border: 1px solid var(--shu-ru-bian-kuang);
  border-radius: 20px;
  color: var(--wenben-zhuse);
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.shuru-kuang:focus {
  border-color: var(--nuanhui-lan);
}

.shuru-kuang::placeholder {
  color: var(--shuru-zhanwei-se);
}

.fasong-anniu {
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--fasong-anniu-1), var(--fasong-anniu-2));
  color: var(--wenzi-baise);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.fasong-anniu:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--roufen-touming);
}

.fasong-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gaobai-anniu {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: var(--roufen-qian-touming);
  border: none;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.gaobai-anniu:hover:not(:disabled) {
  background: var(--roufen-touming);
  transform: scale(1.05);
}

.gaobai-anniu:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.emoji-anniu {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: var(--emoji-anniu-beijing);
  border: none;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.emoji-anniu.huoyue {
  background: var(--emoji-huoyue-beijing);
}

.emoji-anniu:hover {
  background: var(--emoji-hover-beijing);
  transform: scale(1.05);
}

.emoji-mianban {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 8px;
  background: var(--beijing-kaopian);
  border-radius: 12px;
  max-height: 200px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.emoji-mianban::-webkit-scrollbar {
  width: 3px;
}

.emoji-mianban::-webkit-scrollbar-thumb {
  background: var(--gundong-tiao-beijing);
  border-radius: 2px;
}

.emoji-xiangmu {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.emoji-xiangmu:hover {
  background: var(--emoji-xiangmu-hover);
  transform: scale(1.2);
}

.emoji-xiangmu:active {
  transform: scale(0.95);
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
  max-height: 220px;
}

.youxi-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--zhezhao-beijing);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.youxi-tanchuang {
  width: 100%;
  max-width: 360px;
  padding: 32px 24px;
  background: var(--beijing-kaopian);
  border-radius: 24px;
  box-shadow: var(--chuangkou-yinying);
  text-align: center;
}

.youxi-tanchuang.shengli {
  border: 2px solid var(--shengli-touming-biankuang);
}

.youxi-tanchuang.shibai {
  border: 2px solid var(--shibai-touming-biankuang);
}

.youxi-tubiao {
  font-size: 56px;
  margin-bottom: 16px;
}

.youxi-biaoti {
  font-size: 24px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin-bottom: 8px;
}

.youxi-miaoshu {
  font-size: 14px;
  color: var(--wenben-ciuse);
  margin-bottom: 24px;
  line-height: 1.5;
}

.youxi-anniu-zu {
  display: flex;
  gap: 12px;
}

.youxi-anniu {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.youxi-anniu.fanhui {
  background: var(--beijing-ciuse);
  color: var(--wenben-zhuse);
}

.youxi-anniu.fanhui:hover {
  background: var(--caidan-hover);
}

.youxi-anniu.chakan {
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: var(--wenzi-baise);
}

.youxi-anniu.chakan:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--nuanhui-lan-touming-yinying);
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
  background: var(--beijing-kaopian);
  border-radius: 8px;
  box-shadow: var(--caidan-yinying);
  padding: 4px;
  min-width: 80px;
}

.chehui-xiangmu {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--chexiao-wenben);
  border-radius: 6px;
  transition: background 0.15s ease;
}

.chehui-xiangmu:hover {
  background: var(--caidan-hover);
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.xiaoxi-guodu-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.xiaoxi-guodu-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes jianbian-liudong {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@media (max-width: 480px) {
  .liaotian-yemian {
    height: calc(100dvh - 48px);
  }

  .xiaoxi-xiangmu {
    max-width: 85%;
  }
}
</style>
