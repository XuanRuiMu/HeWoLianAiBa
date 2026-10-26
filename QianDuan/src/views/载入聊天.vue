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
import { 使用用户设置仓库 } from '@/stores/用户设置'

const ZUI_DUAN_ZHAN_SHI_HAO_MIAO = 1000
const TI_SHI_ZHOU_QI_HAO_MIAO = 3000

const route = useRoute()
const router = useRouter()
const 聊天仓库 = 使用聊天仓库()
const 设置仓库 = 使用用户设置仓库()

const jinDu = ref(8)
const cuoWu = ref('')
const tiShiXuHao = ref(0)

let lunHuanDingShiQi: ReturnType<typeof setInterval> | null = null
let yiTiaoZhuan = false

const biaoTi = computed(
  () => 聊天仓库.jiaoSeXinXi?.ming_zi || huoQuFanYi('zaiRuLiaoTian', 'zhengZaiZhaoHui'),
)
const touXiang = computed(() => 聊天仓库.jiaoSeXinXi?.tou_xiang ?? null)
const moRenZi = computed(() => (聊天仓库.jiaoSeXinXi?.xing_bie === 'nv' ? '👩' : '👨'))
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
  const jiaoSeId = String(route.params.jiaoSeId || '')
  if (!jiaoSeId) {
    cuoWu.value = huoQuFanYi('zaiRuLiaoTian', 'jiaZaiShiBai')
    return
  }
  const kaiShiShiJian = Date.now()
  try {
    await Promise.all([
      (async () => {
        await 聊天仓库.jiaZaiXiaoXi(jiaoSeId, (jieDuan) => {
          tiShengJinDu(jieDuan === 'xiaoXi' ? 58 : 82)
        })
        if (聊天仓库.jiaZaiShiBai) throw new Error('首屏消息加载失败')
      })(),
      (async () => {
        await 设置仓库.jiaZai().catch(() => undefined)
        tiShengJinDu(94)
      })(),
    ])
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
  聊天仓库.biaoJiYuZai(jiaoSeId)
  await router.replace(`/chat/${jiaoSeId}`)
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
