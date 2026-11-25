<template>
  <div class="biaoqing-xuanze-wangge">
    <p class="wangge-jishu" :class="{ 'wangge-jishu--cuo': !!shangXianCuoWu }" role="status">
      {{ shangXianCuoWu || yiXuanWenAn }}
    </p>
    <div v-if="表情仓库.jiaZaiZhong" class="wangge-dengdai">
      {{ huoQuFanYi('yiJianFanKui', 'fuJianBiaoQingJiaZaiZhong') }}
    </div>
    <div v-else-if="keXuanLieBiao.length === 0" class="wangge-kong" role="status">
      <p class="kong-biaoti">{{ huoQuFanYi('yiJianFanKui', 'fuJianBiaoQingKong') }}</p>
      <p class="kong-fuwen">{{ huoQuFanYi('yiJianFanKui', 'fuJianBiaoQingKongTiShi') }}</p>
    </div>
    <div v-else class="wangge-mian" role="listbox" :aria-label="huoQuFanYi('yiJianFanKui', 'fuJianCongBiaoQingXuanZe')">
      <button
        v-for="xiang in keXuanLieBiao"
        :key="xiang.id"
        type="button"
        role="option"
        class="wangge-ge"
        :class="{ 'wangge-ge--yi-xuan': fanKuiCangKu.shiBiaoQingXuanZe(xiang.mei_ti_id) }"
        :aria-selected="fanKuiCangKu.shiBiaoQingXuanZe(xiang.mei_ti_id)"
        :data-testid="`fankui-biaoqing-xiang-${xiang.mei_ti_id}`"
        @click="qieHuanXuanZe(xiang)"
      >
        <img class="ge-tu" :src="xiang.mei_ti_url" :alt="xiang.duan_ming || ''" />
        <span v-if="fanKuiCangKu.shiBiaoQingXuanZe(xiang.mei_ti_id)" class="ge-gouxuan" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { 使用表情仓库 } from '@/stores/表情'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用反馈仓库, BiaoQingXuanZeShangXian } from '@/stores/反馈'
import { huoQuFanYi } from '@/config/翻译表'
import type { BiaoQingXiang } from '@/api/表情'

const 表情仓库 = 使用表情仓库()
const 用户仓库 = 使用用户仓库()
const fanKuiCangKu = 使用反馈仓库()

const shangXianCuoWu = ref('')

const yiXuanWenAn = computed(() =>
  huoQuFanYi('yiJianFanKui', 'fuJianYiXuanBiaoQing').replace(
    '{shu}',
    String(fanKuiCangKu.biaoQingXuanZe.length),
  ),
)

const keXuanLieBiao = computed(() => 表情仓库.woDeBiaoQing)

onMounted(() => {
  const yongHuId = 用户仓库.dangQianYongHu?.id
  if (yongHuId && 表情仓库.woDeBiaoQing.length === 0) {
    void 表情仓库.jiaZai(yongHuId)
  }
})

function qieHuanXuanZe(biaoQing: BiaoQingXiang): void {
  if (fanKuiCangKu.shiBiaoQingXuanZe(biaoQing.mei_ti_id)) {
    fanKuiCangKu.yiChuBiaoQing(biaoQing.mei_ti_id)
    shangXianCuoWu.value = ''
    return
  }
  const chengGong = fanKuiCangKu.tianJiaBiaoQing(biaoQing)
  if (!chengGong) {
    shangXianCuoWu.value = huoQuFanYi('yiJianFanKui', 'fuJianBiaoQingShangXianTiShi').replace(
      '{shu}',
      String(BiaoQingXuanZeShangXian),
    )
    return
  }
  shangXianCuoWu.value = ''
}
</script>

<style scoped>
.biaoqing-xuanze-wangge {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  min-height: 0;
}

.wangge-jishu {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-ciuse);
}

.wangge-jishu--cuo {
  color: var(--cuowu-yanse);
}

.wangge-mian {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: var(--jiange-xiao);
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.wangge-ge {
  position: relative;
  aspect-ratio: 1;
  padding: var(--jiange-2);
  border: 1.5px solid transparent;
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  cursor: pointer;
}

.wangge-ge:hover {
  background: var(--tanchuang-fanhui-beijing);
}

.wangge-ge--yi-xuan {
  border-color: var(--zhuse);
  background: color-mix(in srgb, var(--zhuse) 10%, transparent);
}

.ge-tu {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.ge-gouxuan {
  position: absolute;
  top: calc(var(--jiange-1) * -1);
  right: calc(var(--jiange-1) * -1);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ge-gouxuan svg {
  width: 11px;
  height: 11px;
}

.wangge-dengdai {
  padding: var(--jiange-da) 0;
  text-align: center;
  color: var(--wenben-ciuse);
  font-size: var(--ziti-zhong);
}

.wangge-kong {
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
</style>
