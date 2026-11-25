<template>
  <div class="xiaoxi-xuanze-mianban">
    <div class="xuanze-dingbu">
      <button type="button" class="xuanze-fanhui" data-testid="fankui-xuanze-fanhui" @click="faChu('fan-hui')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {{ huoQuFanYi('yiJianFanKui', 'fuJianXuanZeQiFanHui') }}
      </button>
      <span class="xuanze-biaoti">{{ huoQuFanYi('yiJianFanKui', 'fuJianXuanZeQiBiaoTi') }}</span>
      <span class="xuanze-jishu">{{ yiXuanWenAn }}</span>
    </div>
    <div class="xuanze-guolv">
      <button
        type="button"
        class="guolv-an"
        :class="{ 'guolv-an--huo': guoLvYuYin }"
        data-testid="fankui-guolv-yuyin"
        @click="guoLvYuYin = true"
      >
        {{ huoQuFanYi('yiJianFanKui', 'fuJianGuoLvYuYin') }}
      </button>
      <button
        type="button"
        class="guolv-an"
        :class="{ 'guolv-an--huo': !guoLvYuYin }"
        data-testid="fankui-guolv-quanbu"
        @click="guoLvYuYin = false"
      >
        {{ huoQuFanYi('yiJianFanKui', 'fuJianGuoLvQuanBu') }}
      </button>
    </div>
    <p v-if="shangXianCuoWu" class="xuanze-cuowu" role="alert" data-testid="fankui-fujian-shangxian">
      {{ shangXianCuoWu }}
    </p>
    <div class="xuanze-liebiao" role="listbox" :aria-label="huoQuFanYi('yiJianFanKui', 'fuJianXuanZeQiBiaoTi')">
      <button
        v-for="xiang in keXuanLieBiao"
        :key="xiang.id"
        type="button"
        role="option"
        class="xuanze-hang"
        :class="{ 'xuanze-hang--yi-xuan': fanKuiCangKu.shiFuJianXiaoXi(xiang.id) }"
        :aria-selected="fanKuiCangKu.shiFuJianXiaoXi(xiang.id)"
        :data-testid="`fankui-xuanze-xiang-${xiang.id}`"
        @click="qieHuanXuanZe(xiang)"
      >
        <span class="hang-gouxuan" aria-hidden="true">
          <svg v-if="fanKuiCangKu.shiFuJianXiaoXi(xiang.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <img
          v-if="xianShiSuoLueTu(xiang)"
          class="hang-suolue"
          :src="xianShiSuoLueTu(xiang) || undefined"
          alt=""
        />
        <span class="hang-leixing" aria-hidden="true">{{ leiXingWenAn(xiang) }}</span>
        <span class="hang-zhaiyao">{{ zhaiYaoWenAn(xiang) }}</span>
        <span class="hang-shijian">{{ shiJianWenAn(xiang.shi_jian_chuo) }}</span>
      </button>
      <div v-if="keXuanLieBiao.length === 0" class="xuanze-kong" role="status">
        <p class="kong-biaoti">{{ huoQuFanYi('yiJianFanKui', 'fuJianXiaoXiKong') }}</p>
        <p class="kong-fuwen">{{ huoQuFanYi('yiJianFanKui', 'fuJianXiaoXiKongTiShi') }}</p>
      </div>
    </div>
    <button
      v-if="!waiBuLaiYuan && 聊天仓库.haiYouGengDuo && keXuanLieBiao.length > 0"
      type="button"
      class="xuanze-gengzao"
      data-testid="fankui-jiazai-gengzao"
      :disabled="聊天仓库.jiaZaiGengDuoZhong"
      @click="jiaZaiGengZao"
    >
      {{ 聊天仓库.jiaZaiGengDuoZhong ? huoQuFanYi('liaoTian', 'jiaZaiZhong') : huoQuFanYi('yiJianFanKui', 'fuJianJiaZaiGengZao') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用反馈仓库, FuJianXiaoXiShangXian, chuangJianXiaoXiKuaiZhao, type FanKuiKeXuanXiaoXi } from '@/stores/反馈'
import { huoQuFanYi } from '@/config/翻译表'
import { shiBenDiLinShiXiaoXi } from '@/utils/消息内容块'

const props = withDefaults(
  defineProps<{
    moRenYuYinGuoLv?: boolean
  }>(),
  { moRenYuYinGuoLv: false },
)

const faChu = defineEmits<{
  (shiJian: 'fan-hui'): void
}>()

const 聊天仓库 = 使用聊天仓库()
const fanKuiCangKu = 使用反馈仓库()

const guoLvYuYin = ref(props.moRenYuYinGuoLv)
const shangXianCuoWu = ref('')

const yiXuanWenAn = computed(() =>
  huoQuFanYi('yiJianFanKui', 'fuJianYiXuanXiaoXi').replace(
    '{shu}',
    String(fanKuiCangKu.fuJianXiaoXi.length),
  ),
)

const waiBuLaiYuan = computed(() => fanKuiCangKu.waiBuXiaoXiLaiYuan)

const keXuanLieBiao = computed<FanKuiKeXuanXiaoXi[]>(() => {
  const huoQu = waiBuLaiYuan.value
  const lieBiao = huoQu ? huoQu() : 聊天仓库.xiaoXiLieBiao
  const anQuanLieBiao = Array.isArray(lieBiao) ? lieBiao : []
  return [...anQuanLieBiao]
    .reverse()
    .filter(
      (xiaoXi) =>
        !xiaoXi.yi_che_hui &&
        !shiBenDiLinShiXiaoXi(xiaoXi) &&
        xiaoXi.fa_song_zhe_lei_xing !== 'xitong' &&
        (!guoLvYuYin.value || xiaoXi.lei_xing === 'yuYin'),
    )
})

function qieHuanXuanZe(xiaoXi: FanKuiKeXuanXiaoXi): void {
  const jieGuo = fanKuiCangKu.qieHuanFuJian(xiaoXi)
  if (jieGuo === 'yiMan') {
    shangXianCuoWu.value = huoQuFanYi('yiJianFanKui', 'fuJianShangXianTiShi').replace(
      '{shu}',
      String(FuJianXiaoXiShangXian),
    )
    return
  }
  shangXianCuoWu.value = ''
}

function leiXingWenAn(xiaoXi: FanKuiKeXuanXiaoXi): string {
  if (xiaoXi.lei_xing === 'tuPian') return huoQuFanYi('yiJianFanKui', 'fuJianLeiXingTuPian')
  if (xiaoXi.lei_xing === 'biaoQingBao') return huoQuFanYi('yiJianFanKui', 'fuJianLeiXingBiaoQingBao')
  if (xiaoXi.lei_xing === 'yuYin') return huoQuFanYi('yiJianFanKui', 'fuJianLeiXingYuYin')
  if (xiaoXi.lei_xing === 'wenJian') return huoQuFanYi('yiJianFanKui', 'fuJianLeiXingWenJian')
  if (xiaoXi.lei_xing === 'xitong' || xiaoXi.lei_xing === 'neiXinHuoDong')
    return huoQuFanYi('yiJianFanKui', 'fuJianLeiXingXiTong')
  return huoQuFanYi('yiJianFanKui', 'fuJianLeiXingWenBen')
}

function zhaiYaoWenAn(xiaoXi: FanKuiKeXuanXiaoXi): string {
  const kuaiZhao = chuangJianXiaoXiKuaiZhao(xiaoXi)
  return kuaiZhao?.zhai_yao || ''
}

function xianShiSuoLueTu(xiaoXi: FanKuiKeXuanXiaoXi): string | null {
  if (xiaoXi.lei_xing !== 'tuPian' && xiaoXi.lei_xing !== 'biaoQingBao') return null
  const diZhi = xiaoXi.mei_ti_url || xiaoXi.ben_di_yu_lan_url || ''
  return diZhi || null
}

function shiJianWenAn(shiJianChuo: number): string {
  if (!shiJianChuo) return ''
  const riQi = new Date(shiJianChuo)
  const shi = String(riQi.getHours()).padStart(2, '0')
  const fen = String(riQi.getMinutes()).padStart(2, '0')
  return `${shi}:${fen}`
}

async function jiaZaiGengZao(): Promise<void> {
  await 聊天仓库.jiaZaiGengDuoXiaoXi()
}
</script>

<style scoped>
.xiaoxi-xuanze-mianban {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  min-height: 0;
}

.xuanze-dingbu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
}

.xuanze-fanhui {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-2);
  border: none;
  background: transparent;
  color: var(--zhuse);
  font-size: var(--ziti-zhong);
  font-weight: 600;
  cursor: pointer;
  padding: var(--jiange-4) var(--jiange-6);
  border-radius: var(--yuanjiao-xiao);
}

.xuanze-fanhui:hover {
  background: var(--tanchuang-fanhui-beijing);
}

.xuanze-fanhui svg {
  width: 16px;
  height: 16px;
}

.xuanze-biaoti {
  flex: 1;
  min-width: 0;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xuanze-jishu {
  flex: none;
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}

.xuanze-guolv {
  display: flex;
  gap: var(--jiange-xiao);
}

.guolv-an {
  flex: 1;
  padding: var(--jiange-6) var(--jiange-10);
  border: 1px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  font-weight: 600;
  cursor: pointer;
}

.guolv-an--huo {
  color: var(--zhuse);
  border-color: var(--zhuse);
  background: color-mix(in srgb, var(--zhuse) 10%, transparent);
}

.xuanze-cuowu {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--cuowu-yanse);
}

.xuanze-liebiao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
  min-height: 160px;
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.xuanze-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  width: 100%;
  padding: var(--jiange-6) var(--jiange-10);
  border: 1px solid transparent;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-zhuse);
  font-size: var(--ziti-xiao);
  text-align: left;
  cursor: pointer;
}

.xuanze-hang:hover {
  background: var(--tanchuang-fanhui-beijing);
}

.xuanze-hang--yi-xuan {
  border-color: var(--zhuse);
  background: color-mix(in srgb, var(--zhuse) 10%, transparent);
}

.hang-gouxuan {
  flex: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--fasong-anniu-wenben);
  background: transparent;
}

.xuanze-hang--yi-xuan .hang-gouxuan {
  border-color: var(--zhuse);
  background: var(--zhuse);
}

.hang-gouxuan svg {
  width: 12px;
  height: 12px;
}

.hang-suolue {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--biankuang-yanse);
}

.hang-leixing {
  flex: none;
  font-size: 11px;
  color: var(--wenben-ciuse);
  border: 1px solid var(--biankuang-yanse);
  border-radius: 6px;
  padding: 0 var(--jiange-4);
  line-height: 1.6;
}

.hang-zhaiyao {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hang-shijian {
  flex: none;
  font-size: 11px;
  color: var(--wenben-tishi);
}

.xuanze-kong {
  padding: var(--jiange-da) var(--jiange-zhong);
  text-align: center;
}

.kong-biaoti {
  margin: 0;
  font-size: var(--ziti-zhong);
  color: var(--wenben-ciuse);
}

.kong-fuwen {
  margin: var(--jiange-4) 0 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

.xuanze-gengzao {
  align-self: center;
  border: 1px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  padding: var(--jiange-6) var(--jiange-zhong);
  cursor: pointer;
}

.xuanze-gengzao:not(:disabled):hover {
  color: var(--zhuse);
  border-color: var(--zhuse);
}

.xuanze-gengzao:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
