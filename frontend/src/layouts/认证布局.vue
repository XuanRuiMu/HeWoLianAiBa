<template>
  <div class="yemian-rongqi" :class="{ 'quanping-rongqi': shiQuanPing }">
    <div
      class="yemian-buju"
      :class="{ 'zhujiemian-moshi': shiZhuJieMian, 'quanping-moshi': shiQuanPing }"
    >
      <router-view v-slot="{ Component, route: dangQianLuYou }">
        <Transition :name="qieHuanDongHua || 'yemian-nei-guodu'" mode="out-in">
          <component
            :is="Component"
            v-if="Component"
            :key="dangQianLuYou.path"
            @deng-lu-cheng-gong="chuLiDengLuChengGong"
            @geng-xin-moshi="gengXinMoShi"
          />
        </Transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 使用认证表单仓库 } from '@/stores/认证表单'

const bd = 使用认证表单仓库()
const route = useRoute()

type MoShiLeiXing = 'dengLu' | 'zhuCe'
const dangQianMoShi = ref<MoShiLeiXing>(bd.moShi)

provide('denglu-moshi', dangQianMoShi)

const qieHuanDongHua = ref('')

const shiZhuJieMian = computed(() => route.name === 'zhuJieMian')
const shiQuanPing = computed(() => {
  const quanPingLuYou = ['liaoTian', 'tianJiaWeiXin', 'guoWangZhanJi']
  return quanPingLuYou.includes(route.name as string)
})

function gengXinMoShi(moshi: MoShiLeiXing) {
  dangQianMoShi.value = moshi
}

function chuLiDengLuChengGong() {
  qieHuanDongHua.value = 'huadong-qiehuan'
  setTimeout(() => {
    qieHuanDongHua.value = ''
  }, 1200)
}
</script>

<style scoped>
.yemian-rongqi {
  width: 100%;
  min-height: calc(100vh - 52px);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.yemian-rongqi.quanping-rongqi {
  min-height: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
}

.yemian-buju {
  width: 100%;
  min-height: calc(100vh - 52px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  padding: 5vh 0;
  flex: 1;
}

.yemian-buju.zhujiemian-moshi {
  padding: 0;
}

.yemian-buju.quanping-moshi {
  min-height: 0;
  padding: 0;
  overflow-y: auto;
  align-items: stretch;
  justify-content: flex-start;
}

.huadong-qiehuan-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.huadong-qiehuan-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
}

.huadong-qiehuan-leave-to {
  transform: translateX(80px);
  opacity: 0;
}

.huadong-qiehuan-enter-from {
  transform: translateX(80px);
  opacity: 0;
  scale: 0.95;
}

.yemian-nei-guodu-enter-active {
  transition:
    opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.yemian-nei-guodu-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.yemian-nei-guodu-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.yemian-nei-guodu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.yemian-buju:not(.quanping-moshi)::-webkit-scrollbar {
  width: 4px;
}

.yemian-buju:not(.quanping-moshi)::-webkit-scrollbar-track {
  background: transparent;
}

.yemian-buju:not(.quanping-moshi)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .huadong-qiehuan-leave-active,
  .huadong-qiehuan-enter-active,
  .yemian-nei-guodu-leave-active,
  .yemian-nei-guodu-enter-active {
    transition: none;
  }
}

@media (max-width: 767px) {
  .yemian-rongqi:not(.quanping-rongqi) {
    min-height: calc(100vh - 48px);
  }

  .yemian-buju:not(.quanping-moshi) {
    min-height: calc(100vh - 48px);
  }

  .yemian-buju:not(.zhujiemian-moshi):not(.quanping-moshi) {
    padding: var(--jiange-da) 0;
  }
}
</style>
