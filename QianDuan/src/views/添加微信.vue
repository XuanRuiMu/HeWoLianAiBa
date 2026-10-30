<template>
  <ZaiRuYe
    :chang-jing="场景"
    :tou-xiang="仓库.jiaoSeXinXi?.tou_xiang ?? null"
    :mo-ren-zi="moRenTouXiang"
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import ZaiRuYe from '@/components/载入页.vue'
import { 使用进入聊天加载, type 进入聊天场景 } from '@/composables/use进入聊天加载'
import type { 生成流程资料 } from '@/stores/角色生成'

const router = useRouter()
const 仓库 = 使用角色生成仓库()

const 临时原文 = sessionStorage.getItem('ziLiaoSheZhiLinShi')
if (临时原文) sessionStorage.removeItem('ziLiaoSheZhiLinShi')
let 临时解析失败 = false
let 临时资料: 生成流程资料 | null = null
if (临时原文) {
  try {
    const 解析值 = JSON.parse(临时原文) as unknown
    if (typeof 解析值 === 'object' && 解析值 !== null && !Array.isArray(解析值)) {
      临时资料 = 解析值 as 生成流程资料
    } else {
      临时解析失败 = true
    }
  } catch {
    临时解析失败 = true
  }
}
const 本次资料 = ref<生成流程资料 | null>(临时资料)

const 场景 = computed<进入聊天场景>(() =>
  (本次资料.value ?? 仓库.dangQianZiLiao)?.moshi === 'tiaozhan' ? 'paiWei' : 'puTong',
)
const 回退标题 = computed(() =>
  场景.value === 'paiWei'
    ? huoQuFanYi('zaiRuLiaoTian', 'zhengZaiZhunBei')
    : huoQuFanYi('zaiRuLiaoTian', 'zhengZaiTianJia'),
)
const biaoTi = computed(() => 仓库.jiaoSeXinXi?.wei_xin_ming || 回退标题.value)
const moRenTouXiang = computed(() => {
  const xingBie = 仓库.jiaoSeXinXi?.xing_bie
  if (xingBie === 'nv') return '👩'
  if (xingBie === 'nan') return '👨'
  return '💬'
})

const { 进度, 当前趣味语, 错误, 可重试, 开始, 重试 } = 使用进入聊天加载({
  场景: () => 场景.value,
  趣味语列表: () => fanYi.zaiRuLiaoTian.quWeiYu[场景.value],
  覆盖趣味语: () => (仓库.touRenTiShi ? huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen') : ''),
  错误文案: () => 仓库.cuoWuXinXi || huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai'),
  执行: async ({ 上报进度 }) => {
    const 当前状态 = () => 仓库.zhuangTai
    if (当前状态() === 'yi_wan_cheng') {
      上报进度(100)
      return
    }
    if (当前状态() !== 'jin_xing_zhong') {
      const 资料 = 本次资料.value ?? 仓库.dangQianZiLiao
      if (!资料) throw new Error('缺少生成资料')
      本次资料.value = 资料
      仓库.kaiShiLiuCheng(资料)
    }
    const 停止监听 = watch(
      () => 仓库.jinDu,
      (值) => 上报进度(值),
      { immediate: true },
    )
    try {
      await 仓库.等待完成()
    } finally {
      停止监听()
    }
    if (当前状态() !== 'yi_wan_cheng') throw new Error('角色生成失败')
  },
  完成: () => {
    const huiHuaId = 仓库.huiHuaId
    if (!huiHuaId) throw new Error('缺少会话ID')
    return router.replace(`/chat/${huiHuaId}`)
  },
})

function fanHui() {
  router.push({ name: 'ziLiaoSheZhi' })
}

onMounted(() => {
  if (临时解析失败) {
    router.replace('/')
    return
  }
  if (!本次资料.value && 仓库.zhuangTai !== 'jin_xing_zhong' && 仓库.zhuangTai !== 'yi_wan_cheng') {
    router.replace('/')
    return
  }
  仓库.zhuCeJiaZaiYe()
  开始()
})

onBeforeUnmount(() => {
  仓库.xiaoZhuJiaZaiYe()
})
</script>
