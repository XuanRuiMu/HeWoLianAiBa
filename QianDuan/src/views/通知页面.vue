<template>
  <div class="tongzhi-yemian">
    <div class="tongzhi-rongqi">
      <header class="tongzhi-dingbu">
        <div class="tongzhi-biaoti-zu">
          <h1 class="tongzhi-biaoti">{{ huoQuFanYi('yeMianBiaoTi', 'tongZhi') }}</h1>
          <span v-if="通知仓库.weiDuShu > 0" class="weidu-jiaochi">
            {{ huoQuFanYi('tongZhi', 'weiDuJiaoChi').replace('{shu}', jiaoChiShu) }}
          </span>
        </div>
        <button
          v-if="通知仓库.weiDuShu > 0"
          class="quanbu-anniu"
          :disabled="caoZuoZhong"
          @click="biaoJiQuanBuYiDu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {{ huoQuFanYi('tongZhi', 'quanBuYiDu') }}
        </button>
      </header>

      <div v-if="qianTaiCuoWu">
        <RequestError
          :cuo-wu="qianTaiCuoWu"
          :zhong-zai="qianTaiZhuangTai === 'loading'"
          @chong-shi="chongShi"
        />
      </div>

      <div
        v-else-if="qianTaiZhuangTai === 'loading'"
        class="tongzhi-gujia"
        role="status"
        :aria-label="huoQuFanYi('tongZhi', 'jiaZaiZhong')"
      >
        <span class="ping-mu-wai">{{ huoQuFanYi('tongZhi', 'jiaZaiZhong') }}</span>
        <div v-for="序 in 5" :key="序" class="gujia-xiang" aria-hidden="true">
          <span class="gujia-kuai gujia-kuai--duan" />
          <span class="gujia-kuai gujia-kuai--chang" />
          <span class="gujia-kuai gujia-kuai--zhong" />
        </div>
      </div>

      <div v-else-if="通知仓库.tongZhiLieBiao.length === 0" class="tongzhi-kong">
        <span class="kong-tubiao" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>
        </span>
        <p class="kong-wenben">{{ huoQuFanYi('tongZhi', 'zanWuTongZhi') }}</p>
        <p class="kong-fuwen">{{ huoQuFanYi('tongZhi', 'xinXiTiShi') }}</p>
      </div>

      <TransitionGroup v-else name="liebiao-guodu" tag="div" class="tongzhi-liebiao">
        <article
          v-for="tongZhi in 通知仓库.tongZhiLieBiao"
          :key="tongZhi.id"
          class="tongzhi-xiang"
          :class="{ weidu: !tongZhi.yi_du }"
          :data-testid="`tongzhi-xiang-${tongZhi.id}`"
          :role="tongZhi.yi_du ? undefined : 'button'"
          :tabindex="tongZhi.yi_du ? undefined : 0"
          @click="biaoJiYiDu(tongZhi.id)"
          @keydown.enter.prevent="biaoJiYiDu(tongZhi.id)"
          @keydown.space.prevent="biaoJiYiDu(tongZhi.id)"
        >
          <span v-if="!tongZhi.yi_du" class="weidu-yuandian" aria-hidden="true" />
          <div class="tongzhi-xiang-shen">
            <div class="tongzhi-xiang-dingbu">
              <span class="tongzhi-xiang-biaoti">{{ tongZhi.biao_ti }}</span>
              <span class="tongzhi-shijian">{{ geShiHuaShiJian(tongZhi.chuang_jian_shi_jian) }}</span>
            </div>
            <p class="tongzhi-neirong">
              {{ tongZhi.nei_rong }}
            </p>
            <div v-if="!tongZhi.yi_du" class="tongzhi-xiang-cao">
              <button
                class="yidu-anniu"
                type="button"
                :aria-label="`${huoQuFanYi('tongZhi', 'biaoWeiYiDu')}：${tongZhi.biao_ti}`"
                @click.stop="biaoJiYiDu(tongZhi.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {{ huoQuFanYi('tongZhi', 'biaoWeiYiDu') }}
              </button>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { 使用通知仓库 } from '@/stores/通知'
import { huoQuFanYi } from '@/config/翻译表'
import { weiDuFengDing } from '@/utils/未读封顶'
import RequestError from '@/components/请求错误.vue'
import { use前台错误 } from '@/composables/use前台错误'

const 通知仓库 = 使用通知仓库()
const caoZuoZhong = ref(false)
const { cuoWu: qianTaiCuoWu, zhuangTai: qianTaiZhuangTai, yunXing, chongShi } = use前台错误()

const jiaoChiShu = computed(() => weiDuFengDing(通知仓库.weiDuShu))

function geShiHuaShiJian(shiJian: string) {
  const riQi = new Date(shiJian)
  if (Number.isNaN(riQi.getTime())) return ''
  const jinTian = new Date()
  const shi = String(riQi.getHours()).padStart(2, '0')
  const fen = String(riQi.getMinutes()).padStart(2, '0')
  if (riQi.toDateString() === jinTian.toDateString()) return `${shi}:${fen}`
  if (riQi.getFullYear() === jinTian.getFullYear())
    return `${riQi.getMonth() + 1}/${riQi.getDate()} ${shi}:${fen}`
  return `${riQi.getFullYear()}/${riQi.getMonth() + 1}/${riQi.getDate()}`
}

async function jiaZaiTongZhi() {
  await yunXing(() => 通知仓库.jiaZaiTongZhi(), { chongShi: jiaZaiTongZhi })
}

async function biaoJiYiDu(tongZhiId: string) {
  await yunXing(() => 通知仓库.biaoJiYiDu(tongZhiId), {
    xianShiJiaZai: false,
    chongShi: () => biaoJiYiDu(tongZhiId),
  })
}

async function biaoJiQuanBuYiDu() {
  caoZuoZhong.value = true
  await yunXing(() => 通知仓库.biaoJiQuanBuYiDu(), {
    xianShiJiaZai: false,
    chongShi: biaoJiQuanBuYiDu,
  })
  caoZuoZhong.value = false
}

onMounted(() => {
  void jiaZaiTongZhi()
  通知仓库.lianJieSocket()
})
</script>

<style scoped>
.tongzhi-yemian {
  width: 100%;
  min-height: calc(100vh - 52px);
  padding: var(--jiange-da);
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
  gap: var(--jiange-12);
  margin-bottom: var(--jiange-zhong);
  flex-wrap: wrap;
}

.tongzhi-biaoti-zu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
}

.tongzhi-biaoti {
  font-size: 22px;
  font-weight: 700;
  color: var(--wenben-zhuse);
  margin: 0;
}

.weidu-jiaochi {
  flex-shrink: 0;
  padding: var(--jiange-2) var(--jiange-xiao);
  border-radius: 999px;
  background: color-mix(in srgb, var(--yanse-biaobai) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--yanse-biaobai) 30%, transparent);
  color: #ff8fac;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}

:root[data-theme='light'] .weidu-jiaochi {
  background: color-mix(in srgb, var(--yanse-biaobai) 10%, transparent);
  border-color: color-mix(in srgb, var(--yanse-biaobai) 24%, transparent);
  color: #c4385f;
}

.quanbu-anniu {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-6);
  padding: var(--jiange-xiao) calc(var(--jiange-12) + var(--jiange-2));
  border-radius: 10px;
  background: var(--boli-beijing-shen);
  color: var(--wenben-zhuse);
  border: 1px solid var(--boli-biankuang);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.quanbu-anniu svg {
  width: 14px;
  height: 14px;
}

.quanbu-anniu:hover:not(:disabled) {
  filter: brightness(1.08);
}

.quanbu-anniu:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ping-mu-wai {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.tongzhi-gujia {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
}

.gujia-xiang {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
  padding: var(--jiange-zhong);
  border-radius: var(--yuanjiao-zhong);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

:root[data-theme='light'] .gujia-xiang {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(0, 0, 0, 0.05);
}

.gujia-kuai {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(
    100deg,
    rgba(255, 255, 255, 0.08) 40%,
    rgba(255, 255, 255, 0.18) 50%,
    rgba(255, 255, 255, 0.08) 60%
  );
  background-size: 200% 100%;
  animation: gujia-liuguang 1.4s ease-in-out infinite;
}

:root[data-theme='light'] .gujia-kuai {
  background: linear-gradient(
    100deg,
    rgba(0, 0, 0, 0.06) 40%,
    rgba(0, 0, 0, 0.12) 50%,
    rgba(0, 0, 0, 0.06) 60%
  );
  background-size: 200% 100%;
}

.gujia-kuai--duan {
  width: 32%;
}

.gujia-kuai--chang {
  width: 88%;
}

.gujia-kuai--zhong {
  width: 62%;
}

@keyframes gujia-liuguang {
  from {
    background-position: 180% 0;
  }

  to {
    background-position: -80% 0;
  }
}

.tongzhi-kong {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--jiange-12);
  padding: calc(var(--jiange-da) * 2 + var(--jiange-12)) var(--jiange-da);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--yuanjiao-da);
}

:root[data-theme='light'] .tongzhi-kong {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.kong-tubiao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--yuanjiao-zhong);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
}

:root[data-theme='light'] .kong-tubiao {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.45);
}

.kong-tubiao svg {
  width: 36px;
  height: 36px;
}

.kong-wenben {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

:root[data-theme='light'] .kong-wenben {
  color: rgba(0, 0, 0, 0.6);
}

.kong-fuwen {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

:root[data-theme='light'] .kong-fuwen {
  color: rgba(0, 0, 0, 0.35);
}

.tongzhi-liebiao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
}

.tongzhi-xiang {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--jiange-xiao);
  padding: var(--jiange-zhong);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--yuanjiao-zhong);
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.tongzhi-xiang:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.12);
}

.tongzhi-xiang.weidu {
  border-color: color-mix(in srgb, var(--yanse-biaobai) 35%, transparent);
  background: color-mix(in srgb, var(--yanse-biaobai) 10%, transparent);
}

:root[data-theme='light'] .tongzhi-xiang {
  background: rgba(255, 255, 255, 0.74);
  border-color: rgba(0, 0, 0, 0.06);
}

:root[data-theme='light'] .tongzhi-xiang.weidu {
  background: color-mix(in srgb, var(--yanse-biaobai) 8%, transparent);
  border-color: color-mix(in srgb, var(--yanse-biaobai) 22%, transparent);
}

.weidu-yuandian {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: var(--jiange-6);
  border-radius: 999px;
  background: var(--yanse-biaobai);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--yanse-biaobai) 18%, transparent);
}

.tongzhi-xiang-shen {
  flex: 1 1 0%;
  min-width: 0;
}

.tongzhi-xiang-dingbu {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-12);
  margin-bottom: var(--jiange-xiao);
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
  font-variant-numeric: tabular-nums;
}

.tongzhi-neirong {
  margin: 0;
  color: var(--wenben-ciuse);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.tongzhi-xiang-cao {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--jiange-xiao);
}

.yidu-anniu {
  display: inline-flex;
  align-items: center;
  gap: var(--jiange-6);
  padding: var(--jiange-4) var(--jiange-12);
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--yanse-biaobai) 30%, transparent);
  background: color-mix(in srgb, var(--yanse-biaobai) 12%, transparent);
  color: #ff8fac;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.18s ease, transform 0.18s ease;
}

:root[data-theme='light'] .yidu-anniu {
  border-color: rgba(196, 56, 95, 0.26);
  background: color-mix(in srgb, var(--yanse-biaobai) 10%, transparent);
  color: #c4385f;
}

.yidu-anniu:hover {
  background: color-mix(in srgb, var(--yanse-biaobai) 20%, transparent);
  transform: translateY(-1px);
}

.yidu-anniu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: calc(var(--jujiao-huan-pian-yi) * -1);
}

.yidu-anniu svg {
  width: 13px;
  height: 13px;
}

.liebiao-guodu-enter-active {
  transition: all 0.35s var(--quxian-biao-zhun);
}

.liebiao-guodu-leave-active {
  transition: all 0.25s var(--quxian-biao-zhun);
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
  transition: transform 0.35s var(--quxian-biao-zhun);
}

@media (max-width: 480px) {
  .tongzhi-yemian {
    padding: var(--jiange-zhong);
  }

  .tongzhi-biaoti {
    font-size: 19px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tongzhi-xiang,
  .tongzhi-xiang:hover,
  .quanbu-anniu,
  .yidu-anniu,
  .yidu-anniu:hover {
    transition: none;
    transform: none;
  }

  .gujia-kuai {
    animation: none;
  }

  .liebiao-guodu-enter-active,
  .liebiao-guodu-leave-active,
  .liebiao-guodu-move {
    transition: none;
  }
}
</style>
