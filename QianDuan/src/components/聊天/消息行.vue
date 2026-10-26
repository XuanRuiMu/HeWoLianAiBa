<template>
  <div class="xiaoxi-xiangmu" :class="[shiBenRen ? 'yonghu-xiaoxi' : 'jiaose-xiaoxi', leiMing]">
    <div v-if="xianShiTouXiang" class="xiaoxi-wei">
      <TouXiang :tou-xiang="touXiang" :mo-ren-zi="moRenZi" :shen-fen="shenFen" />
      <slot name="tou-xiang-jiao" />
    </div>
    <div v-if="cheHuiWenBen" class="chehui-tishi">{{ cheHuiWenBen }}</div>
    <template v-else>
      <div
        v-if="!wuWaiKe"
        class="qipao-waike"
        :class="[waiKeLeiMing, { 'qipao-fasong-zhong': faSongZhong }]"
      >
        <slot />
      </div>
      <slot v-else />
    </template>
    <div v-if="faSongZhong || faSongShiBai" class="fasong-zhuangtai" :aria-label="faSongTiShi">
      <span v-if="faSongZhong" class="fasong-zhuangtai-zhuanquan" />
      <button
        v-else
        type="button"
        class="fasong-shibai-jiaobiao"
        :title="faSongTiShi"
        :aria-label="faSongTiShi"
        @click.stop="emit('chongXinFaSong')"
      >
        !
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import TouXiang from '@/components/头像.vue'

type LeiMing = string | Record<string, boolean> | Array<string | Record<string, boolean>> | undefined

withDefaults(
  defineProps<{
    shiBenRen?: boolean
    leiMing?: LeiMing
    waiKeLeiMing?: LeiMing
    wuWaiKe?: boolean
    xianShiTouXiang?: boolean
    touXiang?: string | null
    moRenZi?: string
    shenFen?: 'jiaose' | 'yonghu' | 'duiju'
    faSongZhong?: boolean
    faSongShiBai?: boolean
    faSongTiShi?: string | null
    cheHuiWenBen?: string
  }>(),
  {
    shiBenRen: false,
    leiMing: undefined,
    waiKeLeiMing: undefined,
    wuWaiKe: false,
    xianShiTouXiang: true,
    touXiang: null,
    moRenZi: undefined,
    shenFen: undefined,
    faSongZhong: false,
    faSongShiBai: false,
    faSongTiShi: null,
    cheHuiWenBen: '',
  },
)

const emit = defineEmits<{
  (e: 'chongXinFaSong'): void
}>()
</script>

<style scoped>
.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  position: relative;
  max-width: 100%;
  margin-bottom: var(--jiange-zhong);
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
}

.xiaoxi-wei {
  position: relative;
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
  margin-left: var(--jiange-10);
}

.jiaose-xiaoxi .xiaoxi-wei {
  margin-right: var(--jiange-10);
}

.qipao-waike {
  position: relative;
  max-width: min(calc(100vw - 126px), 520px);
}

@media (max-width: 480px) {
  .qipao-waike {
    max-width: min(calc(100vw - 120px), 420px);
  }
}

.qipao-waike.tupian-waike {
  max-width: min(calc(100vw - 126px), 260px);
}

.qipao-waike.wenjian-waike {
  max-width: min(calc(100vw - 126px), 320px);
}

.qipao-waike.yuyin-waike {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.yonghu-xiaoxi .qipao-waike.yuyin-waike {
  align-items: flex-end;
}

.qipao-waike.biaoqingbao-waike {
  background: transparent;
}

.qipao-waike.qipao-fasong-zhong {
  filter: grayscale(1);
  opacity: 0.68;
}

.chehui-tishi {
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
  text-align: center;
  padding: var(--jiange-4) 0;
}

.fasong-zhuangtai {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  align-self: center;
  padding: 0 var(--jiange-4);
}

.fasong-shibai-jiaobiao {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  width: var(--jiaobiao-chicun);
  height: var(--jiaobiao-chicun);
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--cuowu-yanse);
  color: var(--fasong-anniu-wenben);
  font-family: inherit;
  font-size: var(--jiaobiao-zihao);
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.fasong-zhuangtai-zhuanquan {
  display: inline-block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: var(--jiaobiao-chicun);
  height: var(--jiaobiao-chicun);
  border: var(--jiaobiao-biankuang) solid var(--wenben-tishi);
  border-top-color: transparent;
  border-radius: 50%;
  animation: xiaoxiHangFasongXuanzhuan 1s linear infinite;
  opacity: 0.9;
}

@keyframes xiaoxiHangFasongXuanzhuan {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fasong-zhuangtai-zhuanquan {
    animation: none;
    border-top-color: var(--wenben-tishi);
  }
}
</style>
