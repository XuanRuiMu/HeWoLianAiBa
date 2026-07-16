<template>
  <div class="app-rongqi">
    <QuanJuCaiDan />
    <div class="app-zhuti">
      <router-view v-slot="{ Component, route }">
        <Transition name="yemian-guodu" mode="out-in">
          <KeepAlive :include="['liaoTian']">
            <component :is="Component" v-if="Component" :key="route.path" />
          </KeepAlive>
        </Transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用用户仓库 } from '@/stores/用户'

const 用户仓库 = 使用用户仓库()

onMounted(() => {
  if (用户仓库.令牌 && !用户仓库.dangQianYongHu) {
    用户仓库.jiaZaiYongHu()
  }
})
</script>

<style scoped>
.app-rongqi {
  width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-zhuti {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: calc(52px + var(--anquan-quyu-shang));
  overflow: hidden;
  min-height: 0;
}

@media (max-width: 767px) {
  .app-zhuti {
    margin-top: calc(48px + var(--anquan-quyu-shang));
  }
}

.yemian-guodu-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.yemian-guodu-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.yemian-guodu-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.yemian-guodu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
