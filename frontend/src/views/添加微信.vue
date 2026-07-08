<template>
  <div class="tianjia-yemian">
    <div class="tianjia-kaPian">
      <div class="touxiang-wrap">
        <img
          v-if="shiTuPianDiZhi(jiaoSeXinXi?.tou_xiang)"
          :src="jiaoSeXinXi?.tou_xiang"
          class="jiaoSe-touxiang"
          alt=""
        />
        <span v-else class="jiaoSe-touxiang-more">{{
          jiaoSeXinXi?.tou_xiang || moRenTouXiang
        }}</span>
      </div>
      <h2 class="weiXin-mingCheng">{{ weiXinMingCheng }}</h2>
      <div class="kaiChangBai-qu">
        <span class="kaiChangBai-biaoQian">{{ huoQuFanYi('tianJiaWeiXin', 'kaiChangBai') }}</span>
        <p class="kaiChangBai-neiRong">{{ kaiChangBaiWenBen }}</p>
      </div>
      <div class="jinDu-tiao">
        <div class="jinDu-wanCheng" :style="{ width: jinDu + '%' }" />
      </div>
      <p class="tianjia-tiShi">{{ huoQuFanYi('tianJiaWeiXin', 'kaiShiLiaoTian') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chuangJianHuiHua, huoQuJiaoSeXiangQing } from '@/api/聊天'
import { huoQuFanYi } from '@/config/translations'
import { shiTuPianDiZhi } from '@/utils/头像'
import type { 角色 } from '@/types'

const route = useRoute()
const router = useRouter()

const jiaoSeXinXi = ref<角色 | null>(null)
const jiaZaiZhong = ref(true)
const cuoWuXinXi = ref('')
const jinDu = ref(0)

let jinDuDingShiQi: ReturnType<typeof setInterval> | null = null
let tiaoZhuanDingShiQi: ReturnType<typeof setTimeout> | null = null
let qingChuDingShiQi: ReturnType<typeof setTimeout> | null = null

const guoDuShiJian = 1500

const weiXinMingCheng = computed(() => {
  return jiaoSeXinXi.value?.wei_xin_ming || jiaoSeXinXi.value?.ming_zi || ''
})

const kaiChangBaiWenBen = computed(() => {
  if (!jiaoSeXinXi.value?.kai_chang_bai) return ''
  if (Array.isArray(jiaoSeXinXi.value.kai_chang_bai)) {
    return jiaoSeXinXi.value.kai_chang_bai.join('\n')
  }
  return String(jiaoSeXinXi.value.kai_chang_bai)
})

const moRenTouXiang = computed(() => {
  return jiaoSeXinXi.value?.xing_bie === 'nv' ? '👩' : '👨'
})

function qingChuDingShiQiAnQuan(dingShiQi: ReturnType<typeof setTimeout> | null) {
  if (dingShiQi) {
    clearTimeout(dingShiQi)
  }
}

function qingChuJianGeDingShiQiAnQuan(dingShiQi: ReturnType<typeof setInterval> | null) {
  if (dingShiQi) {
    clearInterval(dingShiQi)
  }
}

async function jiaZaiJiaoSeXinXi() {
  const jiaoSeId = route.query.jiaoSeId as string
  if (!jiaoSeId) {
    router.replace('/')
    return
  }

  try {
    const { jiao_se } = await huoQuJiaoSeXiangQing(jiaoSeId)
    jiaoSeXinXi.value = jiao_se
    jiaZaiZhong.value = false
    qiDongTiaoZhuan(jiaoSeId)
  } catch {
    cuoWuXinXi.value = huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu')
    jiaZaiZhong.value = false
    qingChuDingShiQiAnQuan(tiaoZhuanDingShiQi)
  }
}

function qiDongTiaoZhuan(jiaoSeId: string) {
  const kaiShiShiJian = Date.now()
  jinDu.value = 0

  jinDuDingShiQi = setInterval(() => {
    const yiGuo = Date.now() - kaiShiShiJian
    const biLi = Math.min((yiGuo / guoDuShiJian) * 100, 100)
    jinDu.value = biLi
    if (biLi >= 100) {
      qingChuJianGeDingShiQiAnQuan(jinDuDingShiQi)
    }
  }, 50)

  tiaoZhuanDingShiQi = setTimeout(async () => {
    try {
      const huiHua = await chuangJianHuiHua(jiaoSeId)
      router.replace(`/chat/${huiHua.id}`)
    } catch {
      router.replace('/')
    }
  }, guoDuShiJian)

  qingChuDingShiQi = setTimeout(() => {
    qingChuJianGeDingShiQiAnQuan(jinDuDingShiQi)
  }, guoDuShiJian + 200)
}

onMounted(() => {
  jiaZaiJiaoSeXinXi()
})

onBeforeUnmount(() => {
  qingChuDingShiQiAnQuan(tiaoZhuanDingShiQi)
  qingChuDingShiQiAnQuan(qingChuDingShiQi)
  qingChuJianGeDingShiQiAnQuan(jinDuDingShiQi)
})
</script>

<style scoped>
.tianjia-yemian {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  padding: 24px;
  background: linear-gradient(
    135deg,
    var(--beijing-jianbian-1),
    var(--beijing-jianbian-2),
    var(--beijing-jianbian-3),
    var(--beijing-jianbian-4)
  );
  background-size: 300% 300%;
  animation: jianbian-liudong 12s ease infinite;
}

.tianjia-kaPian {
  width: 100%;
  max-width: 360px;
  padding: 40px 28px;
  background: var(--beijing-kaopian);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid var(--boli-biankuang);
  box-shadow: var(--boli-yinying);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.touxiang-wrap {
  width: 88px;
  height: 88px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--touxiang-touming-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--touxiang-yinying);
}

.jiaoSe-touxiang {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.jiaoSe-touxiang-more {
  font-size: 48px;
  line-height: 1;
}

.weiXin-mingCheng {
  font-size: 22px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin: 0;
}

.kaiChangBai-qu {
  width: 100%;
  padding: 16px;
  background: var(--boli-beijing-qian);
  border-radius: 16px;
  border: 1px solid var(--boli-biankuang);
  text-align: left;
}

.kaiChangBai-biaoQian {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--yanse-qiangdiao);
  margin-bottom: 8px;
}

.kaiChangBai-neiRong {
  font-size: 14px;
  line-height: 1.6;
  color: var(--wenben-zhuse);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.jinDu-tiao {
  width: 100%;
  height: 4px;
  background: var(--biankuang-yanse);
  border-radius: 2px;
  overflow: hidden;
}

.jinDu-wanCheng {
  height: 100%;
  background: linear-gradient(90deg, var(--nuanhui-lan), var(--roufen-zi));
  border-radius: 2px;
  transition: width 0.05s linear;
}

.tianjia-tiShi {
  font-size: 13px;
  color: var(--wenben-ciuse);
  margin: 0;
}

@keyframes jianbian-liudong {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@media (max-width: 480px) {
  .tianjia-kaPian {
    padding: 32px 24px;
  }
}
</style>
