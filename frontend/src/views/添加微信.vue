<template>
  <div class="tianjia-yemian">
    <div class="tianjia-kaPian">
      <div class="touxiang-wrap">
        <img
          v-if="shiTuPianDiZhi(仓库.jiaoSeXinXi?.tou_xiang)"
          :src="仓库.jiaoSeXinXi?.tou_xiang"
          class="jiaoSe-touxiang"
          alt=""
        />
        <span v-else class="jiaoSe-touxiang-more">{{
          仓库.jiaoSeXinXi?.tou_xiang || moRenTouXiang
        }}</span>
      </div>
      <h2 class="weiXin-mingCheng">{{ weiXinMingCheng }}</h2>
      <div class="jinDu-tiao">
        <div class="jinDu-wanCheng" :style="{ width: 仓库.jinDu + '%' }" />
      </div>
      <p class="tianjia-tiShi">{{ 仓库.dangQianWenAn }}</p>
      <p v-if="仓库.cuoWuXinXi" class="tianjia-cuowu">{{ 仓库.cuoWuXinXi }}</p>
      <button v-if="仓库.cuoWuXinXi" class="tianjia-fan-hui" @click="fanHui">
        {{ huoQuFanYi('tianJiaWeiXin', 'fanHui') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import { huoQuFanYi } from '@/config/translations'
import { shiTuPianDiZhi } from '@/utils/头像'
import type { 生成流程资料 } from '@/stores/角色生成'

const router = useRouter()
const 仓库 = 使用角色生成仓库()

const weiXinMingCheng = computed(
  () => 仓库.jiaoSeXinXi?.wei_xin_ming || 仓库.jiaoSeXinXi?.ming_zi || '',
)
const moRenTouXiang = computed(() => (仓库.jiaoSeXinXi?.xing_bie === 'nv' ? '👩' : '👨'))

function fanHui() {
  // 返回资料设置；生成流程托管在 store，仍在后台继续跑，不会中断
  router.push({ name: 'ziLiaoSheZhi' })
}

// 完成时导航裁决：仅当用户仍停留在加载页（zaiJiaZaiYe 为真）才跳转聊天页；
// 若已离开，则保持静默、不去打扰，会话自然进入「过往战绩」的“进行中”分组。
watch(
  () => 仓库.zhuangTai,
  (zhuangTai) => {
    if (zhuangTai === 'yi_wan_cheng' && 仓库.huiHuaId && 仓库.zaiJiaZaiYe) {
      router.replace(`/chat/${仓库.huiHuaId}`)
    }
  },
)

onMounted(() => {
  // 资料由资料设置向导通过 sessionStorage 透传（尚未生成角色，无 jiaoSeId）
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
    // 标记加载页活跃，发起（或接管）后台生成流程
    仓库.zhuCeJiaZaiYe()
    仓库.kaiShiLiuCheng(ziLiao)
  } else if (仓库.zhuangTai === 'jin_xing_zhong' || 仓库.zhuangTai === 'yi_wan_cheng') {
    // 无透传资料但后台流程进行中/已完成：重入加载页，接管进度并重新标记活跃
    仓库.zhuCeJiaZaiYe()
    // 若已完成且持有会话，立即跳转聊天页（照旧跳转聊天页面）
    if (仓库.zhuangTai === 'yi_wan_cheng' && 仓库.huiHuaId) {
      router.replace(`/chat/${仓库.huiHuaId}`)
    }
  } else {
    // 无待处理资料且未在后台跑流程 → 回主页
    router.replace('/')
  }
})

onBeforeUnmount(() => {
  // 离开加载页：仅注销活跃标记，绝不取消后台流程（离开≠取消）
  仓库.xiaoZhuJiaZaiYe()
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
  background: transparent;
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
