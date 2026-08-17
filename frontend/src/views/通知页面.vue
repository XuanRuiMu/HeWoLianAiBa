<template>
  <div class="tongzhi-yemian">
    <div class="tongzhi-rongqi">
      <div class="tongzhi-dingbu">
        <h1 class="tongzhi-biaoti">{{ huoQuFanYi('yeMianBiaoTi', 'tongZhi') }}</h1>
        <button
          v-if="通知仓库.weiDuShu > 0"
          class="quanbu-anniu"
          :disabled="caoZuoZhong"
          @click="biaoJiQuanBuYiDu"
        >
          {{ huoQuFanYi('tongZhi', 'quanBuYiDu') }}
        </button>
      </div>

      <div v-if="通知仓库.jiaZaiZhong" class="tongzhi-zhuangtai">
        {{ huoQuFanYi('tongZhi', 'jiaZaiZhong') }}
      </div>

      <div v-else-if="通知仓库.tongZhiLieBiao.length === 0" class="tongzhi-kong">
        <span class="kong-tubiao">🔔</span>
        <p class="kong-wenben">{{ huoQuFanYi('tongZhi', 'zanWuTongZhi') }}</p>
        <p class="kong-fuwen">{{ huoQuFanYi('tongZhi', 'xinXiTiShi') }}</p>
      </div>

      <TransitionGroup v-else name="liebiao-guodu" tag="div" class="tongzhi-liebiao">
        <article
          v-for="tongZhi in 通知仓库.tongZhiLieBiao"
          :key="tongZhi.id"
          class="tongzhi-xiang"
          :class="{ weidu: !tongZhi.yi_du }"
          @click="biaoJiYiDu(tongZhi.id)"
        >
          <div class="tongzhi-xiang-dingbu">
            <span class="tongzhi-xiang-biaoti">{{ tongZhi.biao_ti }}</span>
            <span class="tongzhi-shijian">{{ geShiHuaShiJian(tongZhi.chuang_jian_shi_jian) }}</span>
          </div>
          <p class="tongzhi-neirong">
            {{ tongZhi.nei_rong }}
          </p>
        </article>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { 使用通知仓库 } from '@/stores/通知'
import { huoQuFanYi } from '@/config/translations'

const 通知仓库 = 使用通知仓库()
const caoZuoZhong = ref(false)

function geShiHuaShiJian(shiJian: string) {
  const riQi = new Date(shiJian)
  if (Number.isNaN(riQi.getTime())) return ''
  const jinTian = new Date()
  const shi = String(riQi.getHours()).padStart(2, '0')
  const fen = String(riQi.getMinutes()).padStart(2, '0')
  if (riQi.toDateString() === jinTian.toDateString()) return `${shi}:${fen}`
  return `${riQi.getMonth() + 1}/${riQi.getDate()} ${shi}:${fen}`
}

async function biaoJiYiDu(tongZhiId: string) {
  try {
    await 通知仓库.biaoJiYiDu(tongZhiId)
  } catch (e) {
    console.warn('标记已读失败', e)
  }
}

async function biaoJiQuanBuYiDu() {
  caoZuoZhong.value = true
  try {
    await 通知仓库.biaoJiQuanBuYiDu()
  } catch (e) {
    console.warn('标记全部已读失败', e)
  } finally {
    caoZuoZhong.value = false
  }
}

onMounted(() => {
  通知仓库.jiaZaiTongZhi()
  通知仓库.lianJieSocket()
})
</script>

<style scoped>
.tongzhi-yemian {
  width: 100%;
  min-height: calc(100vh - 52px);
  padding: 24px;
  background: transparent;
}

.tongzhi-rongqi {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.tongzhi-dingbu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.tongzhi-biaoti {
  font-size: 22px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin: 0;
}

.quanbu-anniu {
  padding: 8px 14px;
  border-radius: 10px;
  background: var(--boli-beijing-shen);
  color: var(--wenben-zhuse);
  border: 1px solid var(--boli-biankuang);
  font-size: 13px;
  font-weight: 600;
}

.quanbu-anniu:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tongzhi-zhuangtai {
  text-align: center;
  padding: 48px 16px;
  color: var(--wenben-ciuse);
  font-size: 14px;
}

.tongzhi-kong {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 24px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

:root[data-theme='浅色'] .tongzhi-kong {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.kong-tubiao {
  font-size: 48px;
  opacity: 0.6;
}

.kong-wenben {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

:root[data-theme='浅色'] .kong-wenben {
  color: rgba(0, 0, 0, 0.6);
}

.kong-fuwen {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

:root[data-theme='浅色'] .kong-fuwen {
  color: rgba(0, 0, 0, 0.35);
}

.tongzhi-liebiao {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tongzhi-xiang {
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition:
    background 0.18s ease,
    transform 0.18s ease;
}

.tongzhi-xiang:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.12);
}

.tongzhi-xiang.weidu {
  border-color: rgba(255, 107, 157, 0.35);
  background: rgba(255, 107, 157, 0.1);
}

:root[data-theme='浅色'] .tongzhi-xiang {
  background: rgba(255, 255, 255, 0.74);
  border-color: rgba(0, 0, 0, 0.06);
}

:root[data-theme='浅色'] .tongzhi-xiang.weidu {
  background: rgba(255, 107, 157, 0.08);
  border-color: rgba(255, 107, 157, 0.22);
}

.tongzhi-xiang-dingbu {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.tongzhi-xiang-biaoti {
  color: var(--wenben-zhuse);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}

.tongzhi-shijian {
  flex-shrink: 0;
  color: var(--wenben-ciuse);
  font-size: 12px;
  line-height: 1.5;
}

.tongzhi-neirong {
  margin: 0;
  color: var(--wenben-ciuse);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.liebiao-guodu-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.liebiao-guodu-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.liebiao-guodu-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.liebiao-guodu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.liebiao-guodu-move {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
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
