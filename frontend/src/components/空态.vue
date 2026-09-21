<template>
  <div class="kong-tai" role="status">
    <svg class="kong-tai-chahua" viewBox="0 0 72 48" fill="none" aria-hidden="true">
      <circle cx="34" cy="24" r="16" fill="currentColor" />
      <circle cx="28" cy="20" r="4.5" fill="var(--liaotian-beijing, #ededed)" opacity="0.35" />
      <circle cx="39" cy="28" r="3" fill="var(--liaotian-beijing, #ededed)" opacity="0.35" />
    </svg>
    <p class="kong-tai-biaoti">{{ biaoTi }}</p>
    <p v-if="tiShi" class="kong-tai-tishi">{{ tiShi }}</p>
    <button v-if="chongShiWenZi" class="kong-tai-anniu" @click="chuLiChongShi">
      {{ chongShiWenZi }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  biaoTi: string
  tiShi?: string
  chongShiWenZi?: string
}>()

const emit = defineEmits<{
  (e: 'chong-shi'): void
}>()

function chuLiChongShi() {
  emit('chong-shi')
}
</script>

<style scoped>
.kong-tai {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--wenben-tishi);
  text-align: center;
}

.kong-tai-chahua {
  width: 72px;
  height: 48px;
  opacity: 0.6;
}

.kong-tai-biaoti {
  font-size: 14px;
  font-weight: 600;
  color: var(--wenben-ciuse);
  margin: 0;
}

.kong-tai-tishi {
  font-size: 12px;
  margin: 0;
}

.kong-tai-anniu {
  margin-top: 4px;
  padding: 8px 20px;
  border-radius: 8px;
  background: var(--zhuse);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
</style>
