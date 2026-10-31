<template>
  <div class="hao-you-kong-tai" role="status">
    <svg class="kong-tai-cha-hua" viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <circle cx="80" cy="58" r="48" fill="var(--zhuse)" opacity="0.12" />
      <rect x="26" y="26" width="66" height="44" rx="15" fill="var(--zhuse)" opacity="0.9" />
      <path d="M42 70 L42 84 L58 70 Z" fill="var(--zhuse)" opacity="0.9" />
      <circle cx="46" cy="48" r="4" fill="#ffffff" opacity="0.92" />
      <circle cx="60" cy="48" r="4" fill="#ffffff" opacity="0.92" />
      <circle cx="74" cy="48" r="4" fill="#ffffff" opacity="0.92" />
      <rect x="74" y="52" width="58" height="38" rx="13" fill="var(--nuanhui-lan)" opacity="0.92" />
      <path d="M118 90 L118 101 L106 90 Z" fill="var(--nuanhui-lan)" opacity="0.92" />
      <path
        d="M95 66.5c-2.6-2.6-6.8-2.6-9.4 0s-2.6 6.8 0 9.4l9.4 9.4 9.4-9.4c2.6-2.6 2.6-6.8 0-9.4s-6.8-2.6-9.4 0z"
        fill="var(--yanse-biaobai)"
      />
      <circle cx="132" cy="30" r="3" fill="var(--zhuse)" opacity="0.5" />
      <circle cx="24" cy="88" r="2.4" fill="var(--nuanhui-lan)" opacity="0.6" />
      <circle cx="140" cy="76" r="2" fill="var(--zhuse)" opacity="0.4" />
    </svg>
    <p class="kong-tai-biao-ti">{{ biaoTi }}</p>
    <p v-if="tiShi" class="kong-tai-ti-shi">{{ tiShi }}</p>
    <button v-if="anniuWenZi" class="kong-tai-anniu" type="button" @click="emit('dian-ji')">
      {{ anniuWenZi }}
    </button>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  biaoTi: string
  tiShi?: string
  anniuWenZi?: string
}>()

const emit = defineEmits<{
  (e: 'dian-ji'): void
}>()
</script>

<style scoped>
.hao-you-kong-tai {
  --kong-tai-wen-ben: #ffffff;
  --kong-tai-ci-wen-ben: #d8d8de;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-da) var(--jiange-zhong);
  border-radius: var(--yuanjiao-da);
  background: rgba(30, 30, 34, 0.92);
  border: 1px dashed rgba(255, 255, 255, 0.16);
  text-align: center;
}

:root[data-theme='light'] .hao-you-kong-tai {
  --kong-tai-wen-ben: #14161a;
  --kong-tai-ci-wen-ben: #3f434a;
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(20, 22, 26, 0.14);
}

.kong-tai-cha-hua {
  width: 152px;
  height: 114px;
}

.kong-tai-biao-ti {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--kong-tai-wen-ben);
}

.kong-tai-ti-shi {
  margin: 0;
  max-width: 20em;
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-line;
  color: var(--kong-tai-ci-wen-ben);
}

.kong-tai-anniu {
  min-height: 44px;
  margin-top: var(--jiange-4);
  padding: var(--jiange-xiao) var(--jiange-da);
  border-radius: 999px;
  background-color: #e8bb55;
  background-image: linear-gradient(135deg, #f7d27a, #d9a441);
  color: #2a1d05;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s var(--quxian-biao-zhun), transform 0.2s var(--quxian-tan-chu);
}

.kong-tai-anniu:hover {
  filter: brightness(1.06);
}

.kong-tai-anniu:active {
  transform: scale(0.97);
}
</style>
