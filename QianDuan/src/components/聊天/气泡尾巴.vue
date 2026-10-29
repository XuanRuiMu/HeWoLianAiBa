<template>
  <span class="qipao-weiba" :class="'qipao-weiba--' + ce" aria-hidden="true" />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    ce?: 'zuo' | 'you'
  }>(),
  {
    ce: 'you',
  },
)
</script>

<style scoped>
.qipao-weiba {
  --qipao-weiba-bian: var(--qipao-weiba-miao-bian-kuan);

  position: absolute;
  top: 0;
  bottom: 0;
  display: var(--qipao-weiba-xian-shi, block);
  background: var(--qipao-weiba-miao-bian, transparent);
  pointer-events: none;
  z-index: 0;
}

.qipao-weiba::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--qipao-weiba-tian-chong, transparent);
}

.qipao-weiba--you {
  right: calc((var(--qipao-weiba-kuan) + var(--qipao-weiba-bian)) * -1);
  left: 0;
  clip-path: polygon(
    calc(100% - var(--qipao-weiba-kuan) - var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) - var(--qipao-weiba-bian)),
    100% calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban)),
    calc(100% - var(--qipao-weiba-kuan) - var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2 + var(--qipao-weiba-bian))
  );
}

.qipao-weiba--you::after {
  left: 0;
  width: calc(100% - var(--qipao-weiba-bian));
  clip-path: polygon(
    calc(100% - var(--qipao-weiba-kuan)) var(--qipao-weiba-shang),
    100% calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban)),
    calc(100% - var(--qipao-weiba-kuan)) calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2)
  );
}

.qipao-weiba--zuo {
  right: 0;
  left: calc((var(--qipao-weiba-kuan) + var(--qipao-weiba-bian)) * -1);
  clip-path: polygon(
    calc(var(--qipao-weiba-kuan) + var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) - var(--qipao-weiba-bian)),
    0 calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban)),
    calc(var(--qipao-weiba-kuan) + var(--qipao-weiba-bian))
      calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2 + var(--qipao-weiba-bian))
  );
}

.qipao-weiba--zuo::after {
  left: var(--qipao-weiba-bian);
  width: calc(100% - var(--qipao-weiba-bian));
  clip-path: polygon(
    var(--qipao-weiba-kuan) var(--qipao-weiba-shang),
    0 calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban)),
    var(--qipao-weiba-kuan) calc(var(--qipao-weiba-shang) + var(--qipao-weiba-ban) * 2)
  );
}
</style>
