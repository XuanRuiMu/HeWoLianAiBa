<template>
  <ZaiRuYe
    :tou-xiang="touXiang"
    :mo-ren-zi="moRenZi"
    :biao-ti="biaoTi"
    :jin-du="jinDu"
    :ti-shi="dangQianTiShi"
    :cuo-wu="cuoWu"
    :fan-hui-wen-an="huoQuFanYi('zaiRuLiaoTian', 'fanHui')"
    :jin-du-biao-qian="huoQuFanYi('zaiRuLiaoTian', 'jinDuBiaoQian')"
    @fan-hui="fanHui"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ZaiRuYe from '@/components/载入页.vue'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 预加载聊天页 } from '@/composables/use聊天预加载'

const ZUI_DUAN_ZHAN_SHI_HAO_MIAO = 1000
const TI_SHI_ZHOU_QI_HAO_MIAO = 3000

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const jiaoSeId = computed(() => String(route.params.jiaoSeId || ''))

const jinDu = ref(8)
const cuoWu = ref('')
const tiShiXuHao = ref(0)

let lunHuanDingShiQi: ReturnType<typeof setInterval> | null = null
let yiTiaoZhuan = false

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
const dangQianTiShi = computed(() => {
  const lieBiao = fanYi.zaiRuLiaoTian.dengDaiYuLieBiao
  return lieBiao[tiShiXuHao.value % lieBiao.length] ?? ''
})

function tiShengJinDu(zhi: number) {
  if (zhi > jinDu.value) jinDu.value = zhi
}

function tingZhiLunHuan() {
  if (lunHuanDingShiQi !== null) {
    clearInterval(lunHuanDingShiQi)
    lunHuanDingShiQi = null
  }
}

function fanHui() {
  void router.replace({ name: 'guoWangZhanJi' })
}

async function zhiXingYuZai() {
  const benCiJiaoSeId = jiaoSeId.value
  if (!benCiJiaoSeId) {
    cuoWu.value = huoQuFanYi('zaiRuLiaoTian', 'jiaZaiShiBai')
    return
  }
  const kaiShiShiJian = Date.now()
  try {
    const yuJiaZaiChengGong = await 预加载聊天页(benCiJiaoSeId, (baiFenShu) => {
      tiShengJinDu(8 + Math.round(baiFenShu * 0.86))
    })
    if (!yuJiaZaiChengGong) throw new Error('聊天页预加载失败')
  } catch {
    if (yiTiaoZhuan) return
    tingZhiLunHuan()
    jinDu.value = 0
    cuoWu.value = huoQuFanYi('zaiRuLiaoTian', 'jiaZaiShiBai')
    return
  }
  const shengYuHaoMiao = ZUI_DUAN_ZHAN_SHI_HAO_MIAO - (Date.now() - kaiShiShiJian)
  if (shengYuHaoMiao > 0) {
    await new Promise((jieShu) => setTimeout(jieShu, shengYuHaoMiao))
  }
  if (yiTiaoZhuan) return
  yiTiaoZhuan = true
  tiShengJinDu(100)
  await router.replace(`/chat/${benCiJiaoSeId}`)
}

onMounted(() => {
  const lieBiao = fanYi.zaiRuLiaoTian.dengDaiYuLieBiao
  tiShiXuHao.value = Math.floor(Math.random() * lieBiao.length)
  lunHuanDingShiQi = setInterval(() => {
    tiShiXuHao.value += 1
  }, TI_SHI_ZHOU_QI_HAO_MIAO)
  void zhiXingYuZai()
})

onBeforeUnmount(() => {
  tingZhiLunHuan()
})
</script>
