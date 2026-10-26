<template>
  <div class="zairu-yemian" role="status" aria-live="polite" :aria-busy="cuoWu ? 'false' : 'true'">
    <div class="zairu-kaPian">
      <div class="zairu-touxiang-wei">
        <TouXiang :tou-xiang="touXiang" :mo-ren-zi="moRenZi" />
      </div>
      <h2 class="zairu-biaoti">{{ biaoTi }}</h2>
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
      <p class="zairu-tishi">{{ tiShi }}</p>
      <p v-if="cuoWu" class="zairu-cuowu">{{ cuoWu }}</p>
      <button v-if="cuoWu" type="button" class="zairu-fanhui" @click="emit('fanHui')">
        {{ fanHuiWenAn }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import TouXiang from '@/components/头像.vue'

defineProps<{
  touXiang?: string | null
  moRenZi?: string
  biaoTi?: string
  jinDu: number
  tiShi?: string
  cuoWu?: string
  fanHuiWenAn?: string
  jinDuBiaoQian?: string
}>()

const emit = defineEmits<{ fanHui: [] }>()
</script>

<style scoped>
.zairu-yemian {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  background: transparent;
}

.zairu-kaPian {
  width: 100%;
  max-width: 360px;
  max-height: 100%;
  overflow-y: auto;
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

.zairu-biaoti {
  font-size: 22px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.zairu-jindu-tiao {
  width: 100%;
  height: 4px;
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
  font-size: 13px;
  color: var(--wenben-ciuse);
  margin: 0;
  min-height: 18px;
  overflow-wrap: anywhere;
}

.zairu-cuowu {
  font-size: 13px;
  color: #ff6b6b;
  margin: 0;
  padding: var(--jiange-xiao) var(--jiange-12);
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 10px;
}

.zairu-fanhui {
  margin-top: var(--jiange-4);
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

.zairu-fanhui:hover {
  background: var(--touxiang-touming-beijing);
}

@media (max-width: 480px) {
  .zairu-kaPian {
    padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-da);
  }
}

@media (max-height: 420px) {
  .zairu-kaPian {
    padding: var(--jiange-zhong) var(--jiange-da);
    gap: var(--jiange-xiao);
  }

  .zairu-touxiang-wei {
    width: 56px;
    height: 56px;
    font-size: 32px;
  }

  .zairu-biaoti {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zairu-jindu-wancheng {
    transition: none;
  }
}
</style>
