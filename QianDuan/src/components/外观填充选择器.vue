<template>
  <div class="tian-chong-xuan-ze" role="group" :aria-label="zuWenAn">
    <button
      v-for="xiang in xuanXiang"
      :key="xiang.zhi"
      type="button"
      class="tian-chong-ka"
      :class="{ 'tian-chong-ka--xuan': xiang.xuan }"
      :aria-pressed="xiang.xuan"
      @click="xuanZe(xiang.zhi)"
    >
      {{ huoQuFanYi('sheZhi', xiang.wenJian) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import { WAI_GUAN_LA_SHEN_MO_SHI_LIE_BIAO, type WaiGuanLaShenMoShi } from '@/config/外观自定义'
import { 使用用户设置仓库 } from '@/stores/用户设置'

const props = defineProps<{
  leiXing: 'beiJing' | 'qiPao'
}>()

const sheZhi = 使用用户设置仓库()

type TianChongWenJian =
  | 'caiJianYuLanTianChongDengBi'
  | 'caiJianYuLanTianChongHenXiang'
  | 'caiJianYuLanTianChongZongXiang'
  | 'caiJianYuLanTianChongQuanBu'

const WEN_JIAN_JI: Record<WaiGuanLaShenMoShi, TianChongWenJian> = {
  dengBi: 'caiJianYuLanTianChongDengBi',
  henXiang: 'caiJianYuLanTianChongHenXiang',
  zongXiang: 'caiJianYuLanTianChongZongXiang',
  quanBu: 'caiJianYuLanTianChongQuanBu',
}

const zuWenAn = huoQuFanYi('sheZhi', 'caiJianYuLanTianChongZu')

const dangQianMoShi = computed(() => (props.leiXing === 'qiPao' ? sheZhi.qiPaoLaShenMoShi : sheZhi.beiJingLaShenMoShi))

const xuanXiang = computed(() =>
  WAI_GUAN_LA_SHEN_MO_SHI_LIE_BIAO.map((zhi) => ({
    zhi,
    wenJian: WEN_JIAN_JI[zhi],
    xuan: zhi === dangQianMoShi.value,
  })),
)

function xuanZe(zhi: WaiGuanLaShenMoShi): void {
  sheZhi.shiYongLaShenMoShi(props.leiXing, zhi)
}
</script>

<style scoped>
.tian-chong-xuan-ze {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--jiange-6);
  min-width: 0;
}

.tian-chong-ka {
  padding: var(--jiange-4) var(--jiange-10);
  border: 1.5px solid var(--tian-chong-xian, var(--biankuang-yanse));
  border-radius: 999px;
  background: transparent;
  color: var(--tian-chong-wenben, var(--wenben-ciuse));
  font-family: inherit;
  font-size: var(--ziti-xiao);
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.tian-chong-ka:hover {
  border-color: var(--tian-chong-zhuse, var(--zhuse));
  color: var(--tian-chong-zhuse, var(--zhuse));
}

.tian-chong-ka:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.tian-chong-ka--xuan {
  border-color: var(--tian-chong-zhuse, var(--zhuse));
  color: var(--tian-chong-zhuse, var(--zhuse));
  background: var(--tian-chong-xuan-beijing, color-mix(in srgb, var(--zhuse) 12%, transparent));
}

@media (prefers-reduced-motion: reduce) {
  .tian-chong-ka {
    transition: none;
  }
}
</style>
