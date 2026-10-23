<template>
  <div class="tianjia-yemian">
    <div class="tianjia-kaPian">
      <div class="jiaose-wei">
        <TouXiang
          :tou-xiang="仓库.jiaoSeXinXi?.tou_xiang"
          :mo-ren-zi="仓库.jiaoSeXinXi?.tou_xiang || moRenTouXiang"
        />
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
import { huoQuFanYi } from '@/config/翻译表'
import TouXiang from '@/components/头像.vue'
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

<style scoped>
.tianjia-yemian {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  padding: var(--jiange-da);
  background: transparent;
}

.tianjia-kaPian {
  width: 100%;
  max-width: 360px;
  padding: calc(var(--jiange-da) + var(--jiange-zhong)) calc(var(--jiange-da) + var(--jiange-4));
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
  gap: var(--jiange-zhong);
}

.jiaose-wei {
  width: 88px;
  height: 88px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--touxiang-touming-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--touxiang-yinying);
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
  padding: var(--jiange-xiao) var(--jiange-12);
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 10px;
}

.tianjia-fan-hui {
  margin-top: var(--jiange-4);
  padding: var(--jiange-10) var(--jiange-da);
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

@media (max-width: 480px) {
  .tianjia-kaPian {
    padding: calc(var(--jiange-da) + var(--jiange-xiao)) var(--jiange-da);
  }
}
</style>
