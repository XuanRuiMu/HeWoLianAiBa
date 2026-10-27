<template>
  <component
    :is="keDianJi ? 'button' : 'div'"
    class="qipao-neirong"
    :class="{ 'qipao-neirong--benren': shiBenRen, 'qipao-neirong--jiaose': !shiBenRen }"
    :type="keDianJi ? 'button' : null"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    shiBenRen?: boolean
    keDianJi?: boolean
  }>(),
  {
    shiBenRen: false,
    keDianJi: false,
  },
)
</script>

<style scoped>
.qipao-neirong {
  position: relative;
  display: inline-block;
  box-sizing: border-box;
  max-width: 100%;
  padding: var(--jiange-9) var(--jiange-13);
  border: none;
  border-radius: var(--qipao-yuanjiao);
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
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
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}

.qipao-neirong::after {
  content: '';
  position: absolute;
  top: var(--qipao-weiba-shang);
  width: 0;
  height: 0;
  border-top: var(--qipao-weiba-ban) solid transparent;
  border-bottom: var(--qipao-weiba-ban) solid transparent;
}

.qipao-neirong--benren::after {
  right: calc(var(--qipao-weiba-pian) * -1);
  border-left: var(--qipao-weiba-kuan) solid
    var(--qipao-ziJi-weiBa, var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing)));
}

.qipao-neirong--jiaose::after {
  left: calc(var(--qipao-weiba-pian) * -1);
  border-right: var(--qipao-weiba-kuan) solid
    var(--qipao-duiFang-weiBa, var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing)));
}

@media (max-width: 480px) {
  .qipao-neirong {
    font-size: var(--qipao-zihao-zhai);
  }
}
</style>
