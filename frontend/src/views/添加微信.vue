<template>
  <div class="tianjia-yemian">
    <Transition name="buzhou-qiehuan" mode="out-in">
      <div v-if="dangQianBuZhou === 0" key="sousuo" class="buzhou-neirong">
        <div class="sousuo-tubiao">
          <span class="xuanzhuan-tubiao">🔍</span>
        </div>
        <p class="buzhou-wenben">正在搜索...</p>
      </div>

      <div v-else-if="dangQianBuZhou === 1" key="fasong" class="buzhou-neirong">
        <div class="fasong-tubiao">📤</div>
        <p class="buzhou-wenben">找到用户，正在发送好友请求...</p>
      </div>

      <div v-else-if="dangQianBuZhou === 2" key="dengdai" class="buzhou-neirong">
        <div class="dengdai-tubiao">
          <div class="xuanzhuan-yuan">
            <div class="xuanzhuan-huan" />
          </div>
        </div>
        <p class="buzhou-wenben">等待对方验证...</p>
      </div>

      <div v-else-if="dangQianBuZhou === 3" key="chenggong" class="buzhou-neirong">
        <div class="chenggong-tubiao">
          <svg class="gou-tubiao" viewBox="0 0 52 52">
            <circle class="gou-yuan" cx="26" cy="26" r="25" fill="none" />
            <path class="gou-xian" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <p class="buzhou-wenben chenggong-wenben">验证通过！</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { chuangJianHuiHua } from '@/api/聊天'

const route = useRoute()
const router = useRouter()
const dangQianBuZhou = ref(0)
let dingShiQi: ReturnType<typeof setTimeout> | null = null

const buZhouShiJian = [500, 1000, 1500, 500]

async function qiDongDongHua() {
  for (let i = 0; i < buZhouShiJian.length; i++) {
    await new Promise<void>((jieJue) => {
      dingShiQi = setTimeout(jieJue, buZhouShiJian[i])
    })
    dangQianBuZhou.value = i + 1
  }

  const jiaoSeId = route.query.jiaoSeId as string
  if (!jiaoSeId) {
    router.replace('/')
    return
  }

  try {
    const huiHua = await chuangJianHuiHua(jiaoSeId)
    router.replace(`/chat/${huiHua.id}`)
  } catch {
    router.replace('/')
  }
}

onMounted(() => {
  qiDongDongHua()
})

onBeforeUnmount(() => {
  if (dingShiQi) {
    clearTimeout(dingShiQi)
  }
})
</script>

<style scoped>
.tianjia-yemian {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
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

.buzhou-neirong {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.sousuo-tubiao,
.fasong-tubiao {
  font-size: 48px;
  line-height: 1;
}

.xuanzhuan-tubiao {
  display: inline-block;
  animation: xuanzhuan 1.5s linear infinite;
}

@keyframes xuanzhuan {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.dengdai-tubiao {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.xuanzhuan-yuan {
  width: 36px;
  height: 36px;
  position: relative;
}

.xuanzhuan-huan {
  width: 100%;
  height: 100%;
  border: 3px solid var(--biankuang-yanse);
  border-top-color: var(--zhuse);
  border-radius: 50%;
  animation: xuanzhuan 0.8s linear infinite;
}

.chenggong-tubiao {
  width: 56px;
  height: 56px;
}

.gou-tubiao {
  width: 56px;
  height: 56px;
}

.gou-yuan {
  stroke: #07c160;
  stroke-width: 2;
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  animation: gou-yuan-hua 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.gou-xian {
  stroke: #07c160;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: gou-xian-hua 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
}

@keyframes gou-yuan-hua {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes gou-xian-hua {
  to {
    stroke-dashoffset: 0;
  }
}

.buzhou-wenben {
  font-size: 16px;
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.chenggong-wenben {
  color: #07c160;
}

.buzhou-qiehuan-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.buzhou-qiehuan-leave-active {
  transition: all 0.2s ease;
}

.buzhou-qiehuan-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.buzhou-qiehuan-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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
</style>
