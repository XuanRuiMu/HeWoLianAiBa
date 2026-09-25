<template>
  <div class="yemian-rongqi" :class="{ 'quanping-rongqi': shiQuanPing }">
    <div
      class="yemian-buju"
      :class="{
        'zhujiemian-moshi': shiZhuJieMian,
        'quanping-moshi': shiQuanPing,
        'denglu-moshi': shiDengLu,
      }"
    >
      <div v-if="keYiChongShiHuiFu">
        <RequestError class="renzheng-huifu-zhuangtai" :cuo-wu="huiFuQianTaiCuoWu" @chong-shi="chongShiHuiFu" />
      </div>
      <div v-else-if="zhengZaiHuiFu" class="renzheng-huifu-zhuangtai" role="status" aria-live="polite">
        {{ huoQuFanYi('tongZhi', 'jiaZaiZhong') }}
      </div>
      <router-view v-slot="{ Component, route: dangQianLuYou }">
        <Transition :name="qieHuanDongHua || 'yemian-nei-guodu'" mode="out-in">
          <component
            :is="Component"
            v-if="Component && keXuJinLuYou"
            :key="dangQianLuYou.path"
            @deng-lu-cheng-gong="chuLiDengLuChengGong"
            @geng-xin-moshi="gengXinMoShi"
          />
        </Transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import RequestError from '@/components/请求错误.vue'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'

const bd = 使用认证表单仓库()
const user = 使用用户仓库()
const route = useRoute()
const router = useRouter()

type MoShiLeiXing = 'dengLu' | 'zhuCe'
const dangQianMoShi = ref<MoShiLeiXing>(bd.moShi)

provide('denglu-moshi', dangQianMoShi)

const qieHuanDongHua = ref('')

const shiZhuJieMian = computed(() => route.name === 'zhuJieMian')
const shiDengLu = computed(() => route.name === 'dengLu')
const xuYaoDengLu = computed(() => route.meta.xuYaoDengLu === true)
const zhengZaiHuiFu = computed(
  () =>
    Boolean(user.令牌) &&
    (user.认证状态 === '冷启动' || user.认证状态 === '恢复中' || user.认证状态 === '恢复失败可重试'),
)
const keYiChongShiHuiFu = computed(() => user.认证状态 === '恢复失败可重试')
const huiFuQianTaiCuoWu = computed(
  () => user.恢复错误 || chuangJianQianTaiCuoWu({ retryable: true }),
)
const keXuJinLuYou = computed(
  () => !xuYaoDengLu.value || shiDengLu.value || user.认证状态 === '已认证',
)
const shiQuanPing = computed(() => {
  const quanPingLuYou = ['liaoTian', 'tianJiaWeiXin', 'guoWangZhanJi']
  return quanPingLuYou.includes(route.name as string)
})

function gengXinMoShi(moshi: MoShiLeiXing) {
  dangQianMoShi.value = moshi
}

function chongShiHuiFu(): void {
  void user.queBaoShenFenJiuXu(true)
}

let qieHuanJiShi: ReturnType<typeof setTimeout> | null = null

function chuLiDengLuChengGong() {
  qieHuanDongHua.value = 'huadong-qiehuan'
  if (qieHuanJiShi !== null) clearTimeout(qieHuanJiShi)
  qieHuanJiShi = setTimeout(() => {
    qieHuanJiShi = null
    qieHuanDongHua.value = ''
  }, 1200)
}

watch(
  [() => user.认证状态, () => route.name],
  ([zhuangTai, luYouMingCheng]) => {
    if (luYouMingCheng === 'dengLu' && zhuangTai === '已认证' && bd.ziDongDengLu) {
      void router.replace({ name: 'zhuJieMian' })
      return
    }
    if (route.meta.xuYaoDengLu === true && zhuangTai === '匿名') {
      void router.replace({ name: 'dengLu' })
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (qieHuanJiShi !== null) {
    clearTimeout(qieHuanJiShi)
    qieHuanJiShi = null
  }
})
</script>

<style scoped>
.yemian-rongqi {
  width: 100%;
  /* 高度锁定为可用区（App 主体已按视口/软键盘算出确定高度并 overflow:hidden）：
     原先写 min-height: calc(100vh - 52px) 会让本容器被内容撑高、溢出被上层裁掉，
     滚动条永远不出现。min-height:0 同时压掉 global.css 的 .yemian-rongqi{min-height:100vh} */
  height: 100%;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.yemian-rongqi.quanping-rongqi {
  min-height: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
}

.yemian-buju {
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 内容超高时顶部可达：flex 居中会裁掉顶部溢出，改用子元素 margin auto 居中，
     内容不足时居中、超出时顶部可滚动到达 */
  justify-content: flex-start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  padding: 5vh 0;
  flex: 1;
}

.yemian-buju.denglu-moshi {
  overflow-y: hidden;
}

.renzheng-huifu-zhuangtai {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-xiao);
  padding: var(--jiange-xiao) var(--jiange-zhong);
  color: var(--gundong-tiao-huakuai);
  font-size: var(--ziti-xiao);
}

.renzheng-huifu-chongshi {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: var(--jiange-xiao) var(--jiange-xiao);
}

.yemian-buju > * {
  margin-top: auto;
  margin-bottom: auto;
}

.yemian-buju.quanping-moshi > * {
  margin-top: 0;
  margin-bottom: 0;
}

.yemian-buju.zhujiemian-moshi {
  padding: 0;
}

.yemian-buju.quanping-moshi {
  min-height: 0;
  padding: 0;
  overflow-y: auto;
  align-items: stretch;
  justify-content: flex-start;
}

.huadong-qiehuan-leave-active {
  transition: all 0.5s var(--quxian-biao-zhun);
}

.huadong-qiehuan-enter-active {
  transition: all 0.6s var(--quxian-tan-chu) 0.15s;
}

.huadong-qiehuan-leave-to {
  transform: translateX(80px);
  opacity: 0;
}

.huadong-qiehuan-enter-from {
  transform: translateX(80px);
  opacity: 0;
  scale: 0.95;
}

.yemian-nei-guodu-enter-active {
  transition:
    opacity 0.3s var(--quxian-tan-chu),
    transform 0.3s var(--quxian-tan-chu);
}

.yemian-nei-guodu-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.yemian-nei-guodu-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.yemian-nei-guodu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .huadong-qiehuan-leave-active,
  .huadong-qiehuan-enter-active,
  .yemian-nei-guodu-leave-active,
  .yemian-nei-guodu-enter-active {
    transition: none;
  }
}

@media (max-width: 767px) {
  .yemian-buju:not(.zhujiemian-moshi):not(.quanping-moshi) {
    padding: var(--jiange-da) 0;
  }

  .yemian-buju.denglu-moshi :deep(.denglu-neirong) {
    padding-left: var(--jiange-zhong);
    padding-right: var(--jiange-zhong);
  }

  .yemian-buju.denglu-moshi :deep(.biaodan-rongqi) {
    padding-left: var(--jiange-zhong);
    padding-right: var(--jiange-zhong);
  }
}
</style>
