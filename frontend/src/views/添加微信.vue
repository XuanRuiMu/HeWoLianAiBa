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
      <div class="jinDu-tiao">
        <div class="jinDu-wanCheng" :style="{ width: jinDu + '%' }" />
      </div>
      <p class="tianjia-tiShi">{{ dangQianBuZhouWenAn }}</p>
      <p v-if="cuoWuXinXi" class="tianjia-cuowu">{{ cuoWuXinXi }}</p>
      <button v-if="cuoWuXinXi" class="tianjia-fan-hui" @click="fanHui">
        {{ huoQuFanYi('tianJiaWeiXin', 'fanHui') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { chuangJianHuiHua, queRenJiaoSe, shengChengJiaoSe } from '@/api/聊天'
import { huoQuFanYi } from '@/config/translations'
import { shiTuPianDiZhi } from '@/utils/头像'
import type { ShengChengJiaoSeJieGuo } from '@/types'

const router = useRouter()

const jiaoSeXinXi = ref<ShengChengJiaoSeJieGuo | null>(null)
const dangQianBuZhouWenAn = ref('')
const jinDu = ref(0)
const cuoWuXinXi = ref('')

let buZhouDingShiQi: ReturnType<typeof setInterval> | null = null

const 步骤文案键 = [
  'zhengZaiDaKaiShouJi',
  'zhengZaiTaoLunShuiSaoShui',
  'zhengZaiKuoQuan',
  'zhengZaiShengChengRenShe',
  'zhengZaiShengChengKaiChangBai',
] as const

const 步骤进度 = [20, 40, 60, 80, 100]

const weiXinMingCheng = computed(() => {
  return jiaoSeXinXi.value?.wei_xin_ming || jiaoSeXinXi.value?.ming_zi || ''
})

const moRenTouXiang = computed(() => {
  return jiaoSeXinXi.value?.xing_bie === 'nv' ? '👩' : '👨'
})

function qingChuDingShiQi() {
  if (buZhouDingShiQi) {
    clearInterval(buZhouDingShiQi)
    buZhouDingShiQi = null
  }
}

function gengXinBuZhou(suoYin: number) {
  dangQianBuZhouWenAn.value = huoQuFanYi('tianJiaWeiXin', 步骤文案键[suoYin])
  jinDu.value = 步骤进度[suoYin]
}

interface LinShiZiLiao {
  xingBie?: string | null
  muBiaoXingBie?: string | null
  xingGeXuanZe?: string | null
  yunXuZhaNanZhaNv?: boolean
  随机性格标记?: boolean
}

function fanHui() {
  router.push({ name: 'ziLiaoSheZhi' })
}

async function zhiXingShengChengLiuCheng(ziLiao: LinShiZiLiao) {
  let suoYin = 0
  gengXinBuZhou(suoYin) // 正在打开手机… 20%

  // 前置趣味文案随真实等待推进（打开手机 → 讨论谁扫谁 → 扩圈），封顶 60%，
  // 真实“生成人设”请求发出后由真实响应接管，避免纯假进度
  buZhouDingShiQi = setInterval(() => {
    if (suoYin < 2) {
      suoYin++
      gengXinBuZhou(suoYin)
    }
  }, 800)

  try {
    const jiaoSe = await shengChengJiaoSe(
      ziLiao.muBiaoXingBie || 'female',
      ziLiao.xingGeXuanZe || 'INFP',
      ziLiao.yunXuZhaNanZhaNv ?? false,
      ziLiao.随机性格标记 ?? false,
      ziLiao.xingBie || undefined,
    )
    jiaoSeXinXi.value = jiaoSe
    qingChuDingShiQi()

    suoYin = 3
    gengXinBuZhou(suoYin) // 正在生成人设… 80%
    const queRenHouJiaoSe = await queRenJiaoSe(jiaoSe)
    const jiaoSeId = queRenHouJiaoSe.id || queRenHouJiaoSe.jiao_se_id || ''
    if (!jiaoSeId) throw new Error('缺少角色ID')

    // 真实末阶段：收到完成信号立即进入完成态（禁止继续演动画）
    suoYin = 4
    gengXinBuZhou(suoYin) // 正在生成开场白… 100%
    const huiHua = await chuangJianHuiHua(jiaoSeId)
    router.replace(`/chat/${huiHua.id}`)
  } catch (cuoWu) {
    qingChuDingShiQi()
    console.error('生成角色失败', cuoWu)
    cuoWuXinXi.value = huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai')
  }
}

onMounted(() => {
  // 资料由资料设置向导通过 sessionStorage 透传（尚未生成角色，无 jiaoSeId）
  const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
  sessionStorage.removeItem('ziLiaoSheZhiLinShi')
  if (!linShi) {
    router.replace('/')
    return
  }

  let ziLiao: LinShiZiLiao
  try {
    ziLiao = JSON.parse(linShi) as LinShiZiLiao
  } catch {
    router.replace('/')
    return
  }

  zhiXingShengChengLiuCheng(ziLiao)
})

onBeforeUnmount(() => {
  qingChuDingShiQi()
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

.tianjia-cuowu {
  font-size: 13px;
  color: #ff6b6b;
  margin: 0;
  padding: 8px 12px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 10px;
}

.tianjia-fan-hui {
  margin-top: 4px;
  padding: 10px 24px;
  background: transparent;
  color: #ffffff;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tianjia-fan-hui:hover {
  background: rgba(255, 255, 255, 0.08);
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
