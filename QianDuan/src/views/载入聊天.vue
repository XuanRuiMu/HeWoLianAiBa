<template>
  <ZaiRuYe
    chang-jing="huiYi"
    :tou-xiang="touXiang"
    :mo-ren-zi="moRenZi"
    :dui-xiang-id="jiaoSeId"
    :biao-ti="biaoTi"
    :qu-wei-yu="当前趣味语"
    :jin-du="进度"
    :cuo-wu="错误"
    :chong-shi-ke-yong="可重试"
    @fan-hui="fanHui"
    @zhong-shi="重试"
  />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ZaiRuYe from '@/components/载入页.vue'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 预加载聊天页 } from '@/composables/use聊天预加载'
import { 使用进入聊天加载 } from '@/composables/use进入聊天加载'

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const jiaoSeId = computed(() => String(route.params.jiaoSeId || ''))

const dangQianJiaoSe = computed(() => {
  const xinXi = 聊天仓库.jiaoSeXinXi
  return xinXi && xinXi.id === jiaoSeId.value ? xinXi : null
})
const biaoTi = computed(
  () => dangQianJiaoSe.value?.wei_xin_ming || huoQuFanYi('zaiRuLiaoTian', 'zhengZaiZhaoHui'),
)
const touXiang = computed(() => dangQianJiaoSe.value?.tou_xiang ?? null)
const moRenZi = computed(() =>
  dangQianJiaoSe.value ? (dangQianJiaoSe.value.xing_bie === 'nv' ? '👩' : '👨') : '💬',
)

const { 进度, 当前趣味语, 错误, 可重试, 开始, 重试 } = 使用进入聊天加载({
  场景: () => 'huiYi',
  趣味语列表: () => fanYi.zaiRuLiaoTian.quWeiYu.huiYi,
  错误文案: () => huoQuFanYi('zaiRuLiaoTian', 'jiaZaiShiBai'),
  执行: async ({ 上报进度 }) => {
    const benCiJiaoSeId = jiaoSeId.value
    if (!benCiJiaoSeId) throw new Error('缺少角色ID')
    const yuJiaZaiChengGong = await 预加载聊天页(benCiJiaoSeId, (baiFenShu) => {
      上报进度(8 + Math.round(baiFenShu * 0.86))
    })
    if (!yuJiaZaiChengGong) throw new Error('聊天页预加载失败')
  },
  完成: () => router.replace(`/chat/${jiaoSeId.value}`),
})

function fanHui() {
  void router.replace({ name: 'guoWangZhanJi' })
}

onMounted(开始)
</script>
