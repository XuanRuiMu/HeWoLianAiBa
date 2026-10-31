<template>
  <div class="shuru-rongqi">
    <slot name="yin-yong" />
    <button
      type="button"
      class="yuyin-anniu"
      :class="{ huoyue: luYinHuoyue }"
      :title="luYinBiaoTi"
      :aria-label="luYinBiaoTi"
      :aria-pressed="luYinHuoyue"
      @click="emit('dian-ji-lu-yin')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
    <slot />
    <button
      type="button"
      class="biaoqing-anniu"
      :class="{ huoyue: biaoQingHuoyue }"
      :title="biaoQingBiaoTi"
      :aria-label="biaoQingBiaoTi"
      :aria-expanded="biaoQingHuoyue"
      @click="emit('dian-ji-biao-qing')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    </button>
    <button
      v-if="keFaSong"
      type="button"
      class="fasong-anniu"
      @click="emit('fa-song')"
    >
      {{ faSongWenZi }}
    </button>
    <button
      v-else
      type="button"
      class="gengduo-plus-anniu"
      :class="{ huoyue: gengDuoHuoyue }"
      :title="gengDuoBiaoTi"
      :aria-label="gengDuoBiaoTi"
      :aria-expanded="gengDuoHuoyue"
      @click.stop="emit('dian-ji-geng-duo')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    keFaSong?: boolean
    faSongWenZi: string
    luYinBiaoTi: string
    biaoQingBiaoTi: string
    gengDuoBiaoTi: string
    luYinHuoyue?: boolean
    biaoQingHuoyue?: boolean
    gengDuoHuoyue?: boolean
  }>(),
  {
    keFaSong: false,
    luYinHuoyue: false,
    biaoQingHuoyue: false,
    gengDuoHuoyue: false,
  },
)

const emit = defineEmits<{
  (e: 'dian-ji-lu-yin'): void
  (e: 'dian-ji-biao-qing'): void
  (e: 'dian-ji-geng-duo'): void
  (e: 'fa-song'): void
}>()
</script>

<style scoped>
.shuru-rongqi {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--jiange-xiao);
}

.yuyin-anniu,
.biaoqing-anniu,
.gengduo-plus-anniu {
  position: relative;
  width: var(--shuru-tubiao-chicun);
  height: var(--shuru-tubiao-chicun);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--shuru-fu-anniu-se);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.yuyin-anniu svg,
.biaoqing-anniu svg,
.gengduo-plus-anniu svg {
  width: var(--shuru-tubiao-glyph-chicun);
  height: var(--shuru-tubiao-glyph-chicun);
}

.yuyin-anniu::before,
.biaoqing-anniu::before,
.gengduo-plus-anniu::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.yuyin-anniu.huoyue,
.biaoqing-anniu.huoyue,
.gengduo-plus-anniu.huoyue {
  color: var(--zhuse);
}

.fasong-anniu {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--shuru-kuang-shang-xia-neidian) calc(var(--jiange-12) + var(--jiange-2));
  border: var(--shuru-kuang-biankuang) solid transparent;
  min-width: var(--shuru-anniu-re-ku);
  line-height: var(--shuru-kuang-hangxing-gao);
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.fasong-anniu::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

.fasong-anniu:hover {
  opacity: 0.85;
}

.fasong-anniu:disabled {
  background: var(--fasong-anniu-jinyong-beijing);
  cursor: not-allowed;
}
</style>
