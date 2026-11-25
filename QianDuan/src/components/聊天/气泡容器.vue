<template>
  <component
    :is="keDianJi ? 'button' : 'div'"
    class="qipao-neirong"
    :class="{
      'qipao-neirong--benren': shiBenRen,
      'qipao-neirong--jiaose': !shiBenRen,
      'qipao-neirong--wen-zi-nei-ju': wenZiNeiJu,
    }"
    :type="keDianJi ? 'button' : null"
  >
    <slot />
    <QiPaoWeiBa :ce="shiBenRen ? 'you' : 'zuo'" />
  </component>
</template>

<script setup lang="ts">
import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'

withDefaults(
  defineProps<{
    shiBenRen?: boolean
    keDianJi?: boolean
    wenZiNeiJu?: boolean
  }>(),
  {
    shiBenRen: false,
    keDianJi: false,
    wenZiNeiJu: true,
  },
)
</script>

<style scoped>
.qipao-neirong {
  --qipao-nei-rong-bei-jing: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  --qipao-weiba-shang-bu-ju: var(--jiange-9);
  --qipao-weiba-tian-chong: var(--qipao-nei-rong-bei-jing);

  position: relative;
  display: inline-block;
  box-sizing: border-box;
  max-width: 100%;
  padding: var(--jiange-9) var(--jiange-13);
  border: none;
  border-radius: var(--qipao-yuanjiao);
  background: var(--qipao-nei-rong-bei-jing);
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
  font-family: inherit;
  font-size: var(--qipao-zihao);
  font-weight: var(--qipao-xuan-zhong-zi-zhong);
  line-height: var(--qipao-hangao);
  text-align: left;
  word-break: break-word;
  box-shadow: var(--qipao-miaoBian-yangShi, none);
}

.qipao-neirong--benren {
  --qipao-nei-rong-bei-jing: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));

  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}

.qipao-neirong--wen-zi-nei-ju {
  --qipao-weiba-shang-bu-ju: var(--qipao-nei-ju-shang);

  padding-block: var(--qipao-nei-ju-shang) var(--qipao-nei-ju-xia);
}

@media (max-width: 480px) {
  .qipao-neirong {
    font-size: var(--qipao-zihao-zhai);
  }

  .qipao-neirong--wen-zi-nei-ju {
    --qipao-weiba-shang-bu-ju: var(--jiange-9);

    padding-block: var(--jiange-9);
  }
}
</style>
