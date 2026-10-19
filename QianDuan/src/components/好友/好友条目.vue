<template>
  <li class="hao-you-tiao">
    <div class="hao-you-tiao-hang">
      <button class="hao-you-zhu-anniu" type="button" @click="jinRu">
        <span class="tou-xiang-qu">
          <span class="tou-xiang-nei">
            <TouXiang :tou-xiang="touXiang" :mo-ren-zi="moRenZi" />
          </span>
          <span
            class="huo-yue-dian"
            :class="`huo-yue-dian--${huoYueTai}`"
            :data-testid="`hao-you-huo-yue-dian-${haoYouId}`"
            aria-hidden="true"
          />
        </span>
        <span class="wen-zi-qu">
          <span class="ming-cheng-hang">
            <span class="ming-cheng">{{ mingCheng }}</span>
            <span v-if="zuiJinShiJian" class="shi-jian">{{ zuiJinShiJian }}</span>
          </span>
          <span class="fu-hang">
            <span class="huo-yue-wen-zi">{{ huoYueWenZi }}</span>
            <span v-if="qianMing" class="qian-ming">{{ qianMing }}</span>
          </span>
          <span class="zui-jin-xiao-xi">{{ zuiJinZhaiYao }}</span>
        </span>
      </button>
      <button
        class="geng-duo-anniu"
        type="button"
        :aria-label="caoZuoZhanKai ? huoQuFanYi('haoYou', 'shouQiCaoZuo') : huoQuFanYi('haoYou', 'gengDuoCaoZuo')"
        :aria-expanded="caoZuoZhanKai"
        @click="caoZuoZhanKai = !caoZuoZhanKai"
      >
        <span class="geng-duo-dian" aria-hidden="true"></span>
        <span class="geng-duo-dian" aria-hidden="true"></span>
        <span class="geng-duo-dian" aria-hidden="true"></span>
      </button>
    </div>

    <div v-if="caoZuoZhanKai" class="cao-zuo-qu">
      <button class="cao-zuo-anniu" type="button" @click="kaiShiBeiZhu">
        {{ huoQuFanYi('haoYou', 'beiZhu') }}
      </button>
      <button class="cao-zuo-anniu" type="button" @click="emit('da-kai-zi-liao', haoYouId)">
        {{ huoQuFanYi('haoYou', 'ziLiaoKa') }}
      </button>
      <button class="cao-zuo-anniu cao-zuo-anniu--wei-xian" type="button" @click="emit('shan-chu', haoYouId)">
        {{ huoQuFanYi('haoYou', 'shanChuHaoYou') }}
      </button>
    </div>

    <div v-if="beiZhuBianJi" class="bei-zhu-hang">
      <ChangFangShuRuKuang
        ref="beiZhuShuRu"
        :mo-xing-zhi="beiZhuCaoGao"
        :zui-da-chang-du="30"
        :biao-qian="huoQuFanYi('haoYou', 'beiZhu')"
        :zhan-wei-wen-zi="huoQuFanYi('haoYou', 'beiZhuZhanWei')"
        @geng-xin="beiZhuCaoGao = $event"
        @keydown.enter="baoCunBeiZhu"
        @keydown.esc="quXiaoBeiZhu"
      />
      <button class="cao-zuo-anniu cao-zuo-anniu--zhu" type="button" @click="baoCunBeiZhu">
        {{ huoQuFanYi('haoYou', 'baoCunBeiZhu') }}
      </button>
      <button class="cao-zuo-anniu" type="button" @click="quXiaoBeiZhu">
        {{ huoQuFanYi('tongYong', 'quXiao') }}
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import TouXiang from '@/components/头像.vue'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import { huoQuFanYi } from '@/config/翻译表'
import type { 好友活跃态 } from '@/composables/use好友概览'

const props = defineProps<{
  haoYouId: string
  mingCheng: string
  touXiang: string | null
  qianMing: string
  beiZhu: string
  huoYueTai: 好友活跃态
  huoYueWenZi: string
  zuiJinZhaiYao: string
  zuiJinShiJian: string
}>()

const emit = defineEmits<{
  (e: 'jin-ru', haoYouId: string): void
  (e: 'da-kai-zi-liao', haoYouId: string): void
  (e: 'bao-cun-bei-zhu', haoYouId: string, beiZhu: string): void
  (e: 'shan-chu', haoYouId: string): void
}>()

const caoZuoZhanKai = ref(false)
const beiZhuBianJi = ref(false)
const beiZhuCaoGao = ref('')
const beiZhuShuRu = ref<{ jiaoDian: () => void } | null>(null)

const moRenZi = computed(() => (props.mingCheng || '?').slice(0, 1))

function jinRu(): void {
  emit('jin-ru', props.haoYouId)
}

async function kaiShiBeiZhu(): Promise<void> {
  beiZhuBianJi.value = true
  beiZhuCaoGao.value = props.beiZhu
  await nextTick()
  beiZhuShuRu.value?.jiaoDian()
}

function baoCunBeiZhu(): void {
  emit('bao-cun-bei-zhu', props.haoYouId, beiZhuCaoGao.value)
  beiZhuBianJi.value = false
  beiZhuCaoGao.value = ''
}

function quXiaoBeiZhu(): void {
  beiZhuBianJi.value = false
  beiZhuCaoGao.value = ''
}
</script>

<style scoped>
.hao-you-tiao {
  --hao-you-tiao-mian: rgba(30, 30, 34, 0.92);
  --hao-you-tiao-bian: rgba(255, 255, 255, 0.12);
  --hao-you-tiao-wen-ben: #ffffff;
  --hao-you-tiao-ci-wen-ben: #d8d8de;
  --hao-you-tiao-ruo-wen-ben: #b6b6bd;
  --hao-you-tiao-hover: rgba(255, 255, 255, 0.08);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: var(--yuanjiao-zhong);
  background: var(--hao-you-tiao-mian);
  border: 1px solid var(--hao-you-tiao-bian);
  transition: background 0.2s var(--quxian-biao-zhun), border-color 0.2s var(--quxian-biao-zhun);
}

.hao-you-tiao:hover {
  border-color: var(--zhuse);
}

:root[data-theme='light'] .hao-you-tiao {
  --hao-you-tiao-mian: rgba(255, 255, 255, 0.92);
  --hao-you-tiao-bian: rgba(20, 22, 26, 0.1);
  --hao-you-tiao-wen-ben: #14161a;
  --hao-you-tiao-ci-wen-ben: #3f434a;
  --hao-you-tiao-ruo-wen-ben: #55595f;
  --hao-you-tiao-hover: rgba(20, 22, 26, 0.05);
}

.hao-you-tiao-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.hao-you-zhu-anniu {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--jiange-12);
  padding: var(--jiange-4) var(--jiange-2);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  text-align: left;
  color: var(--hao-you-tiao-wen-ben);
  cursor: pointer;
  transition: background 0.2s var(--quxian-biao-zhun);
}

.hao-you-zhu-anniu:hover {
  background: var(--hao-you-tiao-hover);
}

.tou-xiang-qu {
  position: relative;
  flex: none;
  display: block;
  width: 46px;
  height: 46px;
}

.tou-xiang-nei {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: var(--zhuse);
  font-size: 18px;
  color: #ffffff;
}

.huo-yue-dian {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--hao-you-tiao-mian);
  background: var(--wenben-tishi);
}

.huo-yue-dian--zaiXian {
  background: var(--chenggong-yanse);
  box-shadow: 0 0 0 3px rgba(48, 209, 88, 0.22);
}

.huo-yue-dian--jinRi {
  background: var(--jinggao-yanse);
}

.huo-yue-dian--zuiJin {
  background: var(--nuanhui-lan);
}

.huo-yue-dian--liXian,
.huo-yue-dian--weiZhi {
  background: var(--wenben-tishi);
}

.wen-zi-qu {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
}

.ming-cheng-hang {
  display: flex;
  align-items: baseline;
  gap: var(--jiange-xiao);
}

.ming-cheng {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  color: var(--hao-you-tiao-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shi-jian {
  flex: none;
  font-size: 11px;
  color: var(--hao-you-tiao-ruo-wen-ben);
}

.fu-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-6);
  min-width: 0;
}

.huo-yue-wen-zi {
  flex: none;
  padding: 0 var(--jiange-6);
  border-radius: 999px;
  background: var(--hao-you-tiao-hover);
  font-size: 11px;
  line-height: 18px;
  color: var(--hao-you-tiao-ci-wen-ben);
}

.qian-ming {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--hao-you-tiao-ci-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zui-jin-xiao-xi {
  font-size: 12px;
  color: var(--hao-you-tiao-ruo-wen-ben);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.geng-duo-anniu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-2);
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  cursor: pointer;
}

.geng-duo-anniu:hover {
  background: var(--hao-you-tiao-hover);
}

.geng-duo-dian {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--hao-you-tiao-ci-wen-ben);
}

.cao-zuo-qu {
  display: flex;
  flex-wrap: wrap;
  gap: var(--jiange-6);
  padding-top: var(--jiange-6);
  border-top: 1px solid var(--hao-you-tiao-bian);
}

.cao-zuo-anniu {
  min-height: 44px;
  padding: var(--jiange-xiao) var(--jiange-12);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  border: 1px solid var(--hao-you-tiao-bian);
  color: var(--hao-you-tiao-ci-wen-ben);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s var(--quxian-biao-zhun), color 0.2s var(--quxian-biao-zhun);
}

.cao-zuo-anniu:hover {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.cao-zuo-anniu--zhu {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.cao-zuo-anniu--wei-xian:hover {
  border-color: var(--cuowu-yanse);
  color: var(--cuowu-yanse);
}

.bei-zhu-hang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--jiange-6);
}

</style>
