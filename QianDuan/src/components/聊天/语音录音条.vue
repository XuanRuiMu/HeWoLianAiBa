<template>
  <Teleport to="body">
    <div v-if="luYinMoShi" class="luyin-zhezhao">
      <div class="luyin-mianban">
        <button
          class="luyin-anzhu-an"
          :class="{ 'zhengzai-luyin': luYinZhong, 'yao-quxiao': luYinShangHuaQuXiao }"
          @pointerdown.prevent="emit('kaiShi')"
          @pointermove="emit('yiDong', $event)"
          @pointerup.prevent="emit('songKai')"
          @pointercancel="emit('quXiao')"
          @touchstart.prevent="emit('kaiShi')"
          @touchmove.prevent
          @touchend.prevent="emit('songKai')"
          @touchcancel="emit('quXiao')"
        >
          <span v-if="!luYinZhong">{{ huoQuFanYi('duoMeiTi', 'anZhuShuoHua') }}</span>
          <span v-else-if="luYinShangHuaQuXiao">{{
            huoQuFanYi('duoMeiTi', 'shangHuaQuXiao')
          }}</span>
          <span v-else>{{ huoQuFanYi('duoMeiTi', 'songKaiFaSong') }}</span>
        </button>
        <div v-if="luYinZhong" class="luyin-zhuangtai-hang">
          <span class="luyin-dianping-zu" aria-hidden="true">
            <span
              v-for="(qiangDu, xuHao) in luYinBoXing"
              :key="xuHao"
              class="luyin-dianping-tiao"
              :style="{ height: yinBoGaoDu(qiangDu) }"
            />
          </span>
          <span class="luyin-jishi">{{ luYinMiao }}s</span>
        </div>
        <p v-else class="luyin-tishi-wen">{{ huoQuFanYi('duoMeiTi', 'luYinZhong') }}</p>
        <button v-if="!luYinZhong" class="luyin-guanbi-anniu" @click="emit('guanBi')">
          {{ huoQuFanYi('caidan', 'guanBi') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/翻译表'

defineProps<{
  luYinMoShi: boolean
  luYinZhong: boolean
  luYinShangHuaQuXiao: boolean
  luYinBoXing: number[]
  luYinMiao: number
}>()

const emit = defineEmits<{
  (e: 'kaiShi'): void
  (e: 'yiDong', shiJian: PointerEvent): void
  (e: 'songKai'): void
  (e: 'quXiao'): void
  (e: 'guanBi'): void
}>()

function yinBoGaoDu(qiangDu: number): string {
  const biLi = Math.max(0.08, Math.min(1, Number(qiangDu) || 0))
  return `${Math.round(biLi * 100)}%`
}
</script>

<style scoped>
.luyin-zhezhao {
  position: fixed;
  inset: 0;
  z-index: 2400;
  background: var(--zhezhao-beijing);
  display: flex;
  align-items: center;
  justify-content: center;
}

.luyin-mianban {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-zhong);
  padding: calc(var(--jiange-da) + var(--jiange-4)) calc(var(--jiange-da) + var(--jiange-xiao));
  border-radius: var(--yuanjiao-da);
  background: var(--tanchuang-beijing);
  border: 0.5px solid var(--tanchuang-biankuang);
  box-shadow: var(--tanchuang-yinying);
  color: var(--tanchuang-biaoti);
}

.luyin-mianban .luyin-tishi-wen,
.luyin-mianban .luyin-jishi {
  color: var(--tanchuang-biaoti);
  opacity: 0.85;
}

.luyin-mianban .luyin-guanbi-anniu {
  background: var(--tanchuang-biankuang);
  color: var(--tanchuang-biaoti);
}

.luyin-anzhu-an {
  width: 200px;
  min-height: 64px;
  border: none;
  border-radius: 32px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.luyin-anzhu-an.zhengzai-luyin {
  background: var(--xiaoxi-yonghu-beijing);
  color: var(--xiaoxi-yonghu-wenben);
  transform: scale(1.04);
}

.luyin-anzhu-an.yao-quxiao {
  background: var(--cuowu-yanse);
  color: var(--fasong-anniu-wenben);
}

.luyin-dianping-zu {
  --luyin-dianping-tiaokuan: 3px;
  display: flex;
  align-items: center;
  gap: var(--jiange-2);
  height: 20px;
  flex-shrink: 0;
}

.luyin-dianping-tiao {
  width: var(--luyin-dianping-tiaokuan);
  height: 100%;
  border-radius: 2px;
  background: currentColor;
  opacity: 0.85;
  transition: height 0.08s linear;
}

.luyin-zhuangtai-hang {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
}

.luyin-jishi {
  font-size: 15px;
  color: var(--cuowu-yanse);
  min-width: 34px;
  text-align: right;
}

.luyin-tishi-wen {
  margin: 0;
  font-size: 13px;
  color: var(--wenben-ciuse);
}

.luyin-guanbi-anniu {
  padding: var(--jiange-6) calc(var(--jiange-zhong) + var(--jiange-6));
  border: none;
  border-radius: var(--yuanjiao-xiao);
  background: var(--guanbi-anniu-beijing);
  color: var(--wenben-zhuse);
  font-size: 13px;
  cursor: pointer;
}

.luyin-guanbi-anniu:hover {
  background: var(--guanbi-anniu-hover);
}
</style>
