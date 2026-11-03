<template>
  <Transition name="guodu">
    <div v-if="guoDuZhuangTai.jinXingZhong" class="guodu-fugai" role="status" aria-live="polite">
      <div class="guodu-kapian">
        <div class="guodu-jindu" aria-hidden="true">
          <div class="guodu-jindu-hua" />
        </div>
        <p class="guodu-wenben" aria-hidden="true">{{ guoDuZhuangTai.wenAn }}</p>
      </div>
      <span class="ping-mu-wai">{{ guoDuZhuangTai.wenAn }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { guoDuZhuangTai } from '@/router/预取'
</script>

<style scoped>
.guodu-fugai {
  position: fixed;
  inset: var(--daohanglan-gao-du) 0 0;
  z-index: var(--ceng-guodu);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--jiange-da);
  background: transparent;
}

.guodu-kapian {
  width: 100%;
  max-width: 320px;
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

.guodu-jindu {
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: var(--biankuang-yanse);
  overflow: hidden;
}

.guodu-jindu-hua {
  width: 40%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--nuanhui-lan), var(--roufen-zi));
  animation: guodu-liudong 1.2s var(--quxian-biao-zhun) infinite;
}

.guodu-wenben {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--wenben-ciuse);
  overflow-wrap: anywhere;
}

.ping-mu-wai {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.guodu-enter-active,
.guodu-leave-active {
  transition: opacity var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun);
}

.guodu-enter-from,
.guodu-leave-to {
  opacity: 0;
}

@keyframes guodu-liudong {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(250%);
  }
}

@media (max-width: 767px) {
  .guodu-fugai {
    top: var(--daohanglan-gao-du-zhai);
  }
}

@media (max-height: 420px) {
  .guodu-kapian {
    padding: var(--jiange-zhong) var(--jiange-da);
    gap: var(--jiange-xiao);
  }
}

@media (prefers-reduced-motion: reduce) {
  .guodu-enter-active,
  .guodu-leave-active {
    transition: none;
  }

  .guodu-jindu-hua {
    animation: none;
    transform: translateX(75%);
  }
}
</style>
