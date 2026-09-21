<template>
  <Teleport to="body">
    <Transition name="motaikuang">
      <div v-if="xianShi" class="shouquan-zhezhao" @click.self="juJue">
        <div class="shouquan-tanchuang">
          <h2 class="shouquan-biaoti">{{ huoQuFanYi('duoMeiTi', 'shouQuanBiaoTi') }}</h2>
          <p class="shouquan-zhengwen">
            {{ huoQuFanYi('duoMeiTi', 'shouQuanZhengWen') }}
          </p>
          <p class="shouquan-tishi">
            {{ huoQuFanYi('duoMeiTi', 'shouQuanKeCheHui') }}
          </p>
          <div class="shouquan-anNiuZu">
            <button class="cixiao-anniu" data-testid="shouquan-jujue" @click="juJue">
              {{ huoQuFanYi('duoMeiTi', 'zanBuKaiQi') }}
            </button>
            <button class="zhuyao-anniu" data-testid="shouquan-queren" @click="queRen">
              {{ huoQuFanYi('duoMeiTi', 'tongYiKaiQi') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// C4 首次多媒体授权弹窗：图片/表情包外发视觉理解前单独征得同意；
// 同意结果写入 tuPianShouQuan（可在「账号与安全」页随时撤回）
import { huoQuFanYi } from '@/config/translations'

defineProps<{
  xianShi: boolean
}>()

const emit = defineEmits<{
  (e: 'queRen'): void
  (e: 'juJue'): void
}>()

function queRen() {
  emit('queRen')
}

function juJue() {
  emit('juJue')
}
</script>

<style scoped>
.shouquan-zhezhao {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--ceng-shouquan);
  padding: 24px;
}

.shouquan-tanchuang {
  width: 100%;
  max-width: 400px;
  background: rgba(20, 24, 40, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  padding: 24px;
}

.shouquan-biaoti {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px;
}

.shouquan-zhengwen {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 10px;
}

.shouquan-tishi {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 20px;
}

.shouquan-anNiuZu {
  display: flex;
  gap: 12px;
}

.cixiao-anniu,
.zhuyao-anniu {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
}

.cixiao-anniu {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.cixiao-anniu:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.zhuyao-anniu {
  background: linear-gradient(135deg, var(--nuanhui-lan), var(--roufen-zi));
  color: #ffffff;
}

.zhuyao-anniu:hover {
  box-shadow: 0 4px 20px rgba(107, 140, 166, 0.35);
  transform: translateY(-1px);
}

.motaikuang-enter-active {
  transition: opacity 0.3s ease;
}

.motaikuang-enter-active .shouquan-tanchuang {
  transition:
    transform 0.3s var(--quxian-tan-chu),
    opacity 0.3s ease;
}

.motaikuang-leave-active {
  transition: opacity 0.2s ease;
}

.motaikuang-enter-from {
  opacity: 0;
}

.motaikuang-enter-from .shouquan-tanchuang {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

.motaikuang-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .shouquan-zhezhao {
    padding: 16px;
  }
}

:root[data-theme='light'] .shouquan-zhezhao {
  background: rgba(0, 0, 0, 0.25);
}

:root[data-theme='light'] .shouquan-tanchuang {
  background: rgba(255, 255, 255, 0.97);
  border-color: rgba(0, 0, 0, 0.08);
}

:root[data-theme='light'] .shouquan-biaoti {
  color: #1a1a2e;
}

:root[data-theme='light'] .shouquan-zhengwen {
  color: rgba(0, 0, 0, 0.75);
}

:root[data-theme='light'] .shouquan-tishi {
  color: rgba(0, 0, 0, 0.5);
}
</style>
