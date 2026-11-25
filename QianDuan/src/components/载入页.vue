<template>
  <div class="zairu-chaosong" aria-hidden="true">
    <Teleport :to="guaZaiMuBiao">
      <div
        class="zairu-yemian"
        role="status"
        aria-live="polite"
        :aria-busy="cuoWu ? 'false' : 'true'"
        :data-chang-jing="changJing"
      >
        <div class="zairu-kaPian">
          <div class="zairu-touxiang-wei">
            <TouXiang :tou-xiang="touXiang" :mo-ren-zi="moRenZi" />
          </div>
          <div class="zairu-mingcheng-wei">
            <h2 class="zairu-biaoti">{{ biaoTi }}</h2>
          </div>
          <div class="zairu-zhuangtai">
            <div
              class="zairu-jindu-tiao"
              role="progressbar"
              :aria-valuenow="jinDu"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="jinDuBiaoQian"
            >
              <div class="zairu-jindu-wancheng" :style="{ width: jinDu + '%' }" />
            </div>
            <p class="zairu-tishi">
              <span class="zairu-tishi-wen">{{ quWeiYu }}</span>
            </p>
          </div>
          <div v-if="cuoWu" class="zairu-cuowu-ceng" role="alert">
            <p class="zairu-cuowu">{{ cuoWu }}</p>
            <div class="zairu-cuowu-anniu">
              <button
                v-if="chongShiKeYong"
                type="button"
                class="zairu-chongshi"
                @click="emit('zhongShi')"
              >
                {{ chongShiWenAn }}
              </button>
              <button type="button" class="zairu-fanhui" @click="emit('fanHui')">
                {{ fanHuiWenAn }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import TouXiang from '@/components/头像.vue'
import { huoQuFanYi } from '@/config/翻译表'
import type { 进入聊天场景 } from '@/composables/use进入聊天加载'

defineProps<{
  changJing: 进入聊天场景
  touXiang?: string | null
  moRenZi?: string
  biaoTi?: string
  quWeiYu?: string
  jinDu: number
  cuoWu?: string
  chongShiKeYong?: boolean
}>()

const emit = defineEmits<{ fanHui: []; zhongShi: [] }>()

const guaZaiMuBiao =
  (typeof document !== 'undefined' && document.querySelector('.app-rongqi')) || document.body
const fanHuiWenAn = huoQuFanYi('zaiRuLiaoTian', 'fanHui')
const chongShiWenAn = huoQuFanYi('tongYong', 'qianTaiCuoWuChongShi')
const jinDuBiaoQian = huoQuFanYi('zaiRuLiaoTian', 'jinDuBiaoQian')
</script>

<style scoped>
.zairu-chaosong {
  display: contents;
}

.zairu-yemian {
  position: fixed;
  inset: var(--daohanglan-gao-du) 0 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  padding: var(--jiange-da);
  overflow-y: auto;
  background: transparent;
  animation: zairu-xianru var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu) both;
}

.zairu-kaPian {
  position: relative;
  flex: none;
  margin: auto 0;
  width: 100%;
  max-width: 360px;
  padding: calc(var(--jiange-da) + var(--jiange-zhong)) calc(var(--jiange-da) + var(--jiange-4));
  background: var(--beijing-kaopian);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid var(--boli-biankuang);
  box-shadow: var(--boli-yinying);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--jiange-zhong);
}

.zairu-touxiang-wei {
  width: 88px;
  height: 88px;
  flex: none;
  border-radius: 20px;
  overflow: hidden;
  background: var(--touxiang-touming-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--touxiang-yinying);
  font-size: 48px;
  line-height: 1;
}

.zairu-mingcheng-wei {
  width: 100%;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-4);
}

.zairu-biaoti {
  font-size: 22px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin: 0;
  width: 100%;
  height: 29px;
  line-height: 29px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: none;
}

.zairu-zhuangtai {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-zhong);
  flex: none;
}

.zairu-jindu-tiao {
  width: 100%;
  height: 4px;
  flex: none;
  background: var(--biankuang-yanse);
  border-radius: 2px;
  overflow: hidden;
}

.zairu-jindu-wancheng {
  height: 100%;
  background: linear-gradient(90deg, var(--nuanhui-lan), var(--roufen-zi));
  border-radius: 2px;
  transition: width 0.25s linear;
}

.zairu-tishi {
  width: 100%;
  height: calc(var(--jiange-da) + var(--jiange-12));
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 13px;
  color: var(--wenben-ciuse);
}

.zairu-tishi-wen {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-height: calc(var(--jiange-da) + var(--jiange-12));
  overflow: hidden;
  overflow-wrap: anywhere;
  line-height: calc(var(--jiange-zhong) + var(--jiange-2));
}

.zairu-cuowu-ceng {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-zhong);
  padding: calc(var(--jiange-da) + var(--jiange-zhong)) calc(var(--jiange-da) + var(--jiange-4));
  background: var(--beijing-kaopian);
  border-radius: inherit;
  text-align: center;
  overflow-y: auto;
}

.zairu-cuowu {
  max-width: 100%;
  margin: 0;
  padding: var(--jiange-xiao) var(--jiange-12);
  font-size: 13px;
  line-height: calc(var(--jiange-zhong) + var(--jiange-2));
  color: var(--cuowu-wenben);
  background: var(--cuowu-touming-beijing);
  border: 1px solid var(--cuowu-touming-biankuang);
  border-radius: 10px;
  overflow-wrap: anywhere;
}

.zairu-cuowu-anniu {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--jiange-12);
}

.zairu-chongshi,
.zairu-fanhui {
  padding: var(--jiange-10) var(--jiange-da);
  background: transparent;
  color: var(--wenben-zhuse);
  border: 1.5px solid var(--boli-biankuang);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.zairu-chongshi {
  background: color-mix(in srgb, var(--nuanhui-lan) 55%, #101018);
  border-color: transparent;
  color: var(--fasong-anniu-wenben);
}

.zairu-chongshi:hover,
.zairu-fanhui:hover {
  background: var(--touxiang-touming-beijing);
}

.zairu-chongshi:hover {
  background: color-mix(in srgb, var(--roufen-zi) 50%, #101018);
}

@keyframes zairu-xianru {
  from {
    opacity: 0;
  }
}

@media (max-width: 480px) {
  .zairu-kaPian {
    padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-da);
  }
}

@media (max-width: 767px) {
  .zairu-yemian {
    top: var(--daohanglan-gao-du-zhai);
  }
}

@media (max-height: 420px) {
  .zairu-yemian {
    padding: var(--jiange-zhong);
  }

  .zairu-kaPian {
    padding: var(--jiange-zhong) var(--jiange-da);
    gap: var(--jiange-xiao);
  }

  .zairu-touxiang-wei {
    width: 56px;
    height: 56px;
    font-size: 32px;
  }

  .zairu-mingcheng-wei {
    gap: var(--jiange-2);
  }

  .zairu-biaoti {
    font-size: 18px;
    height: 24px;
    line-height: 24px;
  }

  .zairu-zhuangtai {
    gap: var(--jiange-xiao);
  }

  .zairu-cuowu-ceng {
    padding: var(--jiange-zhong) var(--jiange-da);
    gap: var(--jiange-xiao);
  }
}

@media (prefers-reduced-motion: reduce) {
  .zairu-yemian {
    animation: none;
  }

  .zairu-jindu-wancheng {
    transition: none;
  }
}
</style>
