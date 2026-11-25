<template>
  <div class="yinyong-tiao" role="status">
    <span class="yinyong-tiao-zhaiyao">
      <template v-if="faSongZheMing">{{ faSongZheMing }}: </template>{{ zhaiYao }}
    </span>
    <button
      type="button"
      class="yinyong-tiao-guanbi"
      :aria-label="huoQuFanYi('liaoTian', 'quXiaoYinYong')"
      @click="emit('guanBi')"
      @keydown.esc.prevent.stop="emit('guanBi')"
    >
      <svg
        class="yinyong-tiao-guanbi-tu"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M2.5 2.5l7 7" />
        <path d="M9.5 2.5l-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

defineProps<{
  zhaiYao: string
  faSongZheMing?: string
}>()

const emit = defineEmits<{ guanBi: [] }>()

function chuLiAnJian(shiJian: KeyboardEvent): void {
  if (shiJian.key !== 'Escape') return
  emit('guanBi')
}

onMounted(() => document.addEventListener('keydown', chuLiAnJian))
onBeforeUnmount(() => document.removeEventListener('keydown', chuLiAnJian))
</script>

<style scoped>

.yinyong-tiao {
  box-sizing: border-box;
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: var(--yinyong-guanbi-neidian);
  min-width: 0;
  max-width: 100%;
  padding: var(--yinyong-kuang-neidian);
  border-radius: var(--yinyong-kuang-yuanjiao);
  background: var(--beijing-qianse);
  font-size: var(--yinyong-kuang-zihao);
  line-height: var(--yinyong-tiao-hangao);
}

.yinyong-tiao-zhaiyao {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--yinyong-hang-shu);
  max-height: var(--yinyong-tiao-zuida-gao-du);
  word-break: break-all;
  color: var(--wen-zi-ci-se);
}

.yinyong-tiao-guanbi {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--yinyong-guanbi-neidian);
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--wenben-tishi);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.yinyong-tiao-guanbi:hover {
  background: color-mix(in srgb, var(--wenben-zhuse) 8%, transparent);
  color: var(--wenben-zhuse);
}

.yinyong-tiao-guanbi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}


.yinyong-tiao-guanbi::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}


.yinyong-tiao-guanbi-tu {
  width: var(--yinyong-guanbi-chicun);
  height: var(--yinyong-guanbi-chicun);
}
</style>
