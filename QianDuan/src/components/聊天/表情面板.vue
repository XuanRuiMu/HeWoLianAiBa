<template>
  <Transition name="biaoqing-mianban">
    <div
      v-show="shuRu.zhanKai"
      ref="mianBanRef"
      class="emoji-mianban"
      role="group"
      :aria-label="huoQuFanYi('duoMeiTi', 'biaoQingMianBan')"
      @click.stop
    >
      <div class="mianban-tab-hang">
        <button
          class="mianban-tab"
          :class="{ huoyue: emojiTab === 'emoji' }"
          :aria-pressed="emojiTab === 'emoji'"
          @click="qieHuanEmojiTab('emoji')"
        >
          {{ huoQuFanYi('duoMeiTi', 'emojiBiaoQian') }}
        </button>
        <button
          class="mianban-tab"
          :class="{ huoyue: emojiTab === 'biaoqingbao' }"
          :aria-pressed="emojiTab === 'biaoqingbao'"
          @click="qieHuanEmojiTab('biaoqingbao')"
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
              @click="qieHuanBiaoQingGuanLi"
            >
              {{
                guanLiMoShi
                  ? huoQuFanYi('duoMeiTi', 'wanChengGuanLi')
                  : huoQuFanYi('duoMeiTi', 'guanLiBiaoQing')
              }}
            </button>
          </div>
          <div class="biaoqingbao-wangge" :class="{ guanli: guanLiMoShi }">
            <div v-for="(biaoQing, xiaBiao) in 表情仓库.woDeBiaoQing" :key="biaoQing.id" class="biaoqingbao-ge">
              <button
                class="biaoqingbao-xiangmu wo-de"
                :title="biaoQing.duan_ming"
                @click="faChu('fa-song-biao-qing-bao', biaoQing)"
              >
                <img
                  class="biaoqingbao-tupian"
                  :src="biaoQing.mei_ti_url"
                  :alt="biaoQing.duan_ming"
                  @error="qingQiuBiaoQingZhongLa"
                />
              </button>
              <div v-if="guanLiMoShi" class="ge-caoZuo-zu">
                <button
                  class="ge-caoZuo qian-yi"
                  :disabled="xiaBiao === 0"
                  :title="huoQuFanYi('duoMeiTi', 'qianYiBiaoQing')"
                  :aria-label="huoQuFanYi('duoMeiTi', 'qianYiBiaoQing')"
                  @click="yiDongBiaoQing('qian', biaoQing.id)"
                >
                  ‹
                </button>
                <button
                  class="ge-caoZuo hou-yi"
                  :disabled="xiaBiao === 表情仓库.woDeBiaoQing.length - 1"
                  :title="huoQuFanYi('duoMeiTi', 'houYiBiaoQing')"
                  :aria-label="huoQuFanYi('duoMeiTi', 'houYiBiaoQing')"
                  @click="yiDongBiaoQing('hou', biaoQing.id)"
                >
                  ›
                </button>
                <button
                  class="ge-caoZuo shan-chu"
                  :title="huoQuFanYi('duoMeiTi', 'shanChuBiaoQing')"
                  :aria-label="huoQuFanYi('duoMeiTi', 'shanChuBiaoQing')"
                  @click="shanChuBiaoQing(biaoQing.id)"
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
              @click="wenJianShuRuRef?.click()"
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
              @click="faChu('jia-ru-tie-zhi', tieZhi)"
            >
              <span class="biaoqingbao-emoji">{{ tieZhi.emoji }}</span>
              <span class="biaoqingbao-wenzi">{{ tieZhi.wenZi }}</span>
            </button>
          </div>
        </section>
      </div>

      <input
        ref="wenJianShuRuRef"
        class="yincang-wenjian-shuru"
        type="file"
        accept="image/*"
        @change="chuLiWenJianXuanZe"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import { 使用表情仓库 } from '@/stores/表情'
import { 使用用户仓库 } from '@/stores/用户'
import { use表情面板 } from '@/composables/use表情面板'
import { use表情提交 } from '@/composables/use表情提交'
import { BIAO_QING_BAO_LIE_BIAO, type BiaoQingBaoDingYi } from '@/utils/表情包库'
import type { BiaoQingXiang } from '@/api/表情'

export interface BiaoQingMianBanRongQi {
  shuRuNeiRong: Ref<string>
  xiaoxiQuYuRef: Ref<HTMLElement | null>
  dingZaiDiBu: Ref<boolean>
}

const shuRu = defineProps<{
  zhanKai: boolean
  rongQi: BiaoQingMianBanRongQi
  queRenShouQuan: () => Promise<boolean>
}>()

const faChu = defineEmits<{
  'guan-bi': []
  'fa-song-biao-qing-bao': [biaoQing: BiaoQingXiang]
  'jia-ru-tie-zhi': [tieZhi: BiaoQingBaoDingYi]
  'she-zhi-cuo-wu': [xinXi: string]
}>()

const 表情仓库 = 使用表情仓库()
const 用户仓库 = 使用用户仓库()
const guanLiMoShi = ref(false)
const zhongLaYiFa = ref(false)
const wenJianShuRuRef = ref<HTMLInputElement | null>(null)

const {
  emojiTab,
  emojiMianBanZhanKai,
  emojiMianBanRef,
  changYongEmoji,
  chaRuEmoji,
  qieHuanEmojiTab,
  yuZaiEmojiZiXing,
  qingLiEmojiZiYuan,
} = use表情面板({
  shuRuNeiRong: shuRu.rongQi.shuRuNeiRong,
  xiaoxiQuYuRef: shuRu.rongQi.xiaoxiQuYuRef,
  dingZaiDiBu: shuRu.rongQi.dingZaiDiBu,
})

const mianBanRef = emojiMianBanRef

const { tiJiaoBiaoQingWenJian } = use表情提交({
  queRenTuPianShouQuan: () => shuRu.queRenShouQuan(),
  sheZhiCuoWu: (xinXi) => faChu('she-zhi-cuo-wu', xinXi),
})

watch(
  () => shuRu.zhanKai,
  async (zhanKai) => {
    emojiMianBanZhanKai.value = zhanKai
    if (!zhanKai) {
      guanLiMoShi.value = false
      return
    }
    const yongHuId = 用户仓库.dangQianYongHu?.id
    if (yongHuId) void 表情仓库.jiaZai(yongHuId)
    await nextTick()
    yuZaiEmojiZiXing()
  },
)

function qieHuanBiaoQingGuanLi(): void {
  guanLiMoShi.value = !guanLiMoShi.value
}

async function shanChuBiaoQing(id: string): Promise<void> {
  const chengGong = await 表情仓库.shanChu(id)
  if (!chengGong && 表情仓库.cuoWuXinXi) faChu('she-zhi-cuo-wu', 表情仓库.cuoWuXinXi)
}

async function yiDongBiaoQing(fangXiang: 'qian' | 'hou', id: string): Promise<void> {
  await 表情仓库.yiDong(fangXiang, id)
  if (表情仓库.cuoWuXinXi) faChu('she-zhi-cuo-wu', 表情仓库.cuoWuXinXi)
}

function qingQiuBiaoQingZhongLa(): void {
  if (zhongLaYiFa.value) return
  zhongLaYiFa.value = true
  void 表情仓库.chongXinJiaZai()
}

async function chuLiWenJianXuanZe(shiJian: Event): Promise<void> {
  const shuRuYuan = shiJian.target as HTMLInputElement
  const wenJian = shuRuYuan.files?.[0]
  shuRuYuan.value = ''
  if (!wenJian) return
  await tiJiaoBiaoQingWenJian(wenJian)
}

onBeforeUnmount(qingLiEmojiZiYuan)
</script>

<style scoped>
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
}

.emoji-xiangmu:hover {
  background: var(--caidan-hover);
}

.emoji-xiangmu:active {
  background: var(--caidan-active);
  transform: scale(0.95);
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
  border: none;
  background: transparent;
  color: var(--yanse-qiangdiao);
  font-size: var(--ziti-xiao);
  cursor: pointer;
  padding: var(--jiange-2) var(--jiange-4);
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

.biaoqingbao-ge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-2);
  min-width: 0;
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
  transition:
    background-color 0.15s var(--quxian-biao-zhun),
    border-color 0.15s var(--quxian-biao-zhun);
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

.biaoqingbao-tupian {
  width: var(--duomeiti-biaoqingbao-chicun);
  height: var(--duomeiti-biaoqingbao-chicun);
  object-fit: contain;
  display: block;
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

.ge-caoZuo-zu {
  display: flex;
  gap: var(--jiange-2);
}

.ge-caoZuo {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--biankuang-yanse);
  border-radius: 6px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.ge-caoZuo:active:not(:disabled) {
  background: var(--caidan-active);
}

.ge-caoZuo:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ge-caoZuo.shan-chu {
  color: var(--yanse-weixian);
}

.biaoqingbao-xiangmu.tian-jia {
  border-style: dashed;
  background: transparent;
}

.biaoqingbao-xiangmu.tian-jia:disabled {
  cursor: default;
  opacity: 0.6;
}

.tian-jia-jia {
  font-size: 22px;
  line-height: 1;
  color: var(--wenben-ciuse);
}

.yincang-wenjian-shuru {
  position: fixed;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  border: 0;
}

.biaoqing-mianban-enter-active,
.biaoqing-mianban-leave-active {
  transition: max-height 0.2s var(--quxian-biao-zhun), opacity 0.2s var(--quxian-biao-zhun);
  overflow: hidden;
}

.biaoqing-mianban-enter-from,
.biaoqing-mianban-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .biaoqing-mianban-enter-active,
  .biaoqing-mianban-leave-active,
  .emoji-xiangmu,
  .biaoqingbao-xiangmu {
    transition: none;
  }
}
</style>
