<template>
  <ZaiRuYe
    :tou-xiang="仓库.jiaoSeXinXi?.tou_xiang"
    :mo-ren-zi="仓库.jiaoSeXinXi?.tou_xiang || moRenTouXiang"
    :biao-ti="weiXinMingCheng"
    :jin-du="仓库.jinDu"
    :ti-shi="仓库.dangQianWenAn"
    :cuo-wu="仓库.cuoWuXinXi"
    :fan-hui-wen-an="huoQuFanYi('tianJiaWeiXin', 'fanHui')"
    :jin-du-biao-qian="huoQuFanYi('tianJiaWeiXin', 'jinDuBiaoQian')"
    @fan-hui="fanHui"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import { huoQuFanYi } from '@/config/翻译表'
import ZaiRuYe from '@/components/载入页.vue'
import type { 生成流程资料 } from '@/stores/角色生成'

const router = useRouter()
const 仓库 = 使用角色生成仓库()

const weiXinMingCheng = computed(
  () => 仓库.jiaoSeXinXi?.wei_xin_ming || 仓库.jiaoSeXinXi?.ming_zi || '',
)
const moRenTouXiang = computed(() => (仓库.jiaoSeXinXi?.xing_bie === 'nv' ? '👩' : '👨'))

function fanHui() {
  router.push({ name: 'ziLiaoSheZhi' })
}

watch(
  () => 仓库.zhuangTai,
  (zhuangTai) => {
    if (zhuangTai === 'yi_wan_cheng' && 仓库.huiHuaId && 仓库.zaiJiaZaiYe) {
      router.replace(`/chat/${仓库.huiHuaId}`)
    }
  },
)

onMounted(() => {
  const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
  if (linShi) {
    sessionStorage.removeItem('ziLiaoSheZhiLinShi')
    let ziLiao: 生成流程资料
    try {
      ziLiao = JSON.parse(linShi) as 生成流程资料
    } catch {
      router.replace('/')
      return
    }
    仓库.zhuCeJiaZaiYe()
    仓库.kaiShiLiuCheng(ziLiao)
  } else if (仓库.zhuangTai === 'jin_xing_zhong' || 仓库.zhuangTai === 'yi_wan_cheng') {
    仓库.zhuCeJiaZaiYe()
    if (仓库.zhuangTai === 'yi_wan_cheng' && 仓库.huiHuaId) {
      router.replace(`/chat/${仓库.huiHuaId}`)
    }
  } else {
    router.replace('/')
  }
})

onBeforeUnmount(() => {
  仓库.xiaoZhuJiaZaiYe()
})
</script>
