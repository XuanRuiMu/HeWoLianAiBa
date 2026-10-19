<template>
  <section class="fenlei-guan-li-lan" :aria-busy="caoZuoZhong ? 'true' : 'false'">
    <div class="fenlei-biao-qian-lan">
      <VueDraggable
        :model-value="fenLeiBiaoFuBen"
        :disabled="caoZuoZhong"
        :animation="200"
        direction="horizontal"
        :filter="'.fenlei-tu-biao-anniu'"
        :prevent-on-filter="false"
        ghost-class="fenlei-sortable-ghost"
        chosen-class="fenlei-sortable-chosen"
        drag-class="fenlei-sortable-drag"
        fallback-class="fenlei-sortable-drag"
        :force-fallback="true"
        :fallback-on-body="true"
        class="fenlei-tuoyuan-zu"
        role="tablist"
        aria-orientation="horizontal"
        :aria-label="huoQuFanYi('zhanJi', 'fenLeiFenZu')"
        @update:model-value="onPaiXuGengXin"
      >
        <div
          v-for="(fenLei, suoYin) in fenLeiBiaoFuBen"
          :key="fenLei.id"
          class="fenlei-biao-qian"
          :class="{ 'fenlei-biao-qian--jihuo': fenLei.id === dangQianFenLeiId }"
          :data-id="fenLei.id"
          @click="qieHuan(fenLei.id)"
        >
          <button
            type="button"
            class="fenlei-biao-qian-an-niu"
            role="tab"
            :aria-selected="fenLei.id === dangQianFenLeiId"
            :tabindex="fenLei.id === dangQianFenLeiId ? 0 : -1"
            :disabled="caoZuoZhong"
            @click.stop="qieHuan(fenLei.id)"
            @keydown="chuLiBiaoQianJianPan($event, suoYin)"
          >
            <span class="fenlei-ming-cheng">{{ fenLei.name }}</span>
            <span class="fenlei-ji-shu">{{ fenLei.record_count }}</span>
          </button>
          <button
            type="button"
            class="fenlei-tu-biao-anniu gengMing-fenlei-anniu"
            :aria-label="`${huoQuFanYi('zhanJi', 'gengMing')}: ${fenLei.name}`"
            :disabled="caoZuoZhong"
            @click.stop="kaiShiGengMing(fenLei)"
          >
            ✎
          </button>
          <button
            v-if="!fenLei.is_default"
            type="button"
            class="fenlei-tu-biao-anniu shanChu-fenlei-anniu"
            :aria-label="`${huoQuFanYi('zhanJi', 'shanChu')}: ${fenLei.name}`"
            :disabled="caoZuoZhong"
            @click.stop="queRenShanChu(fenLei)"
          >
            ×
          </button>
          <button
            v-if="!fenLei.is_default"
            type="button"
            class="fenlei-tu-biao-anniu she-zhi-mo-ren-anniu"
            :aria-label="huoQuFanYi('zhanJi', 'sheZhiMoRenFenLei') + ': ' + fenLei.name"
            :disabled="caoZuoZhong"
            @click.stop="sheZhiMoRen(fenLei)"
          >
            ★
          </button>
        </div>
      </VueDraggable>
      <button
        type="button"
        class="chuangJian-fenlei-anniu"
        :aria-label="huoQuFanYi('zhanJi', 'chuangJianFenLei')"
        :disabled="caoZuoZhong"
        @click="kaiShiChuangJian"
      >
        +
      </button>
    </div>
    <form v-if="bianJiMoShi" class="fenlei-bian-ji" @submit.prevent="tiJiaoBianJi">
      <ChangFangShuRuKuang
        ref="mingChengShuRuKuang"
        :mo-xing-zhi="bianJiMingCheng"
        :zui-da-chang-du="20"
        :biao-qian="dangQianFenLei ? `${huoQuFanYi('zhanJi', 'gengMingFenLeiMingCheng')}: ${dangQianFenLei.name}` : huoQuFanYi('zhanJi', 'chuangJianFenLeiMingCheng')"
        :jin-yong="caoZuoZhong"
        @geng-xin="bianJiMingCheng = $event"
        @keydown.esc="guanBiBianJi"
      />
      <button
        type="submit"
        class="fenlei-bao-cun"
        :aria-label="huoQuFanYi('zhanJi', 'baoCun')"
        :disabled="caoZuoZhong || !bianJiMingCheng.trim()"
      >
        ✓
      </button>
      <button
        type="button"
        class="fenlei-qu-xiao"
        :aria-label="huoQuFanYi('tongYong', 'quXiao')"
        :disabled="caoZuoZhong"
        @click="guanBiBianJi"
      >
        ×
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { huoQuFanYi } from '@/config/翻译表'
import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'
import type { ZhanJiFenLei } from '@/types/类型定义'

const props = defineProps<{
  fenLeiLieBiao: ZhanJiFenLei[]
  dangQianFenLeiId: string
  caoZuoZhong: boolean
}>()

const emit = defineEmits<{
  qieHuan: [fenLeiId: string]
  chuangJian: [mingCheng: string]
  gengMing: [fenLeiId: string, mingCheng: string]
  shanChu: [fenLeiId: string]
  sheZhiMoRen: [fenLeiId: string]
  paiXu: [fenLeiIds: string[]]
}>()

const bianJiMoShi = ref<'chuangJian' | 'gengMing' | null>(null)
const bianJiFenLeiId = ref('')
const bianJiMingCheng = ref('')
const mingChengShuRuKuang = ref<{ jiaoDian: () => void } | null>(null)
const dangQianFenLei = computed(() =>
  props.fenLeiLieBiao.find((item) => item.id === props.dangQianFenLeiId),
)
const fenLeiBiaoFuBen = computed(() => [...props.fenLeiLieBiao])

function qieHuan(fenLeiId: string): void {
  if (props.caoZuoZhong) return
  emit('qieHuan', fenLeiId)
}

async function kaiShiChuangJian(): Promise<void> {
  bianJiMoShi.value = 'chuangJian'
  bianJiFenLeiId.value = ''
  bianJiMingCheng.value = ''
  await nextTick()
  mingChengShuRuKuang.value?.jiaoDian()
}

async function kaiShiGengMing(fenLei: ZhanJiFenLei): Promise<void> {
  bianJiMoShi.value = 'gengMing'
  bianJiFenLeiId.value = fenLei.id
  bianJiMingCheng.value = fenLei.name
  await nextTick()
  mingChengShuRuKuang.value?.jiaoDian()
}

function guanBiBianJi(): void {
  bianJiMoShi.value = null
  bianJiFenLeiId.value = ''
  bianJiMingCheng.value = ''
}

function tiJiaoBianJi(): void {
  const mingCheng = bianJiMingCheng.value.trim()
  if (!mingCheng || props.caoZuoZhong) return
  if (bianJiMoShi.value === 'gengMing') emit('gengMing', bianJiFenLeiId.value, mingCheng)
  else emit('chuangJian', mingCheng)
  guanBiBianJi()
}

function queRenShanChu(fenLei: ZhanJiFenLei): void {
  if (props.caoZuoZhong) return
  const queRenWenBen = `${huoQuFanYi('zhanJi', 'shanChu')}: ${fenLei.name}`
  if (window.confirm(queRenWenBen)) emit('shanChu', fenLei.id)
}

function chuLiBiaoQianJianPan(shiJian: KeyboardEvent, suoYin: number): void {
  if (props.caoZuoZhong) return
  const zongShu = fenLeiBiaoFuBen.value.length
  if (!zongShu) return
  const xiaYiGe =
    shiJian.key === 'ArrowRight' || shiJian.key === 'ArrowDown'
      ? (suoYin + 1) % zongShu
      : shiJian.key === 'ArrowLeft' || shiJian.key === 'ArrowUp'
        ? (suoYin - 1 + zongShu) % zongShu
        : shiJian.key === 'Home'
          ? 0
          : shiJian.key === 'End'
            ? zongShu - 1
            : -1
  if (xiaYiGe < 0) return
  shiJian.preventDefault()
  const muBiao = fenLeiBiaoFuBen.value[xiaYiGe]
  if (!muBiao) return
  qieHuan(muBiao.id)
  const lan = (shiJian.currentTarget as HTMLElement).closest('.fenlei-biao-qian-lan')
  const anNiuMen = Array.from(lan?.querySelectorAll<HTMLButtonElement>('.fenlei-biao-qian-an-niu') ?? [])
  anNiuMen[xiaYiGe]?.focus()
}

function sheZhiMoRen(fenLei: ZhanJiFenLei): void {
  if (props.caoZuoZhong) return
  emit('sheZhiMoRen', fenLei.id)
}

function onPaiXuGengXin(xinLieBiao: ZhanJiFenLei[]): void {
  if (props.caoZuoZhong) return
  const ids = xinLieBiao.map((item) => item.id)
  const paiXuZiDuan = ids.length === new Set(ids).size && ids.length === props.fenLeiLieBiao.length
  if (!paiXuZiDuan) return
  emit('paiXu', ids)
}
</script>

<style scoped>
.fenlei-guan-li-lan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.fenlei-biao-qian-lan {
  display: flex;
  align-items: stretch;
  gap: var(--jiange-xiao);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* overflow-x:auto 会把激活标签的 3px 偏移阴影与 2px 边框裁掉，故留一档底部内边距让阴影出画；
     该值计入"默认分类"框下间距预算（滚动容器上内边距 = 此值 + 列表 gap + 空态卡上 margin） */
  padding-bottom: var(--jiange-4);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
}

.fenlei-biao-qian,
.chuangJian-fenlei-anniu {
  flex: 0 0 auto;
  min-height: 42px;
  border: 2px solid var(--biankuang-yanse);
  border-radius: 12px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
}

.fenlei-tuoyuan-zu {
  display: flex;
  align-items: stretch;
  gap: var(--jiange-xiao);
  min-width: 0;
  flex-wrap: nowrap;
}

.fenlei-sortable-ghost {
  opacity: 0.4;
}

.fenlei-sortable-drag {
  opacity: 0.95;
}

.fenlei-biao-qian {
  display: flex;
  align-items: stretch;
  max-width: min(360px, calc(100vw - 96px));
  overflow: hidden;
}

.fenlei-biao-qian--jihuo {
  border-color: var(--yanse-zhanji);
  background: color-mix(in srgb, var(--yanse-zhanji) 12%, var(--beijing-kaopian));
  box-shadow: 3px 3px 0 var(--xuanzhong-qiangdiao-yinying);
}

.fenlei-biao-qian:not(.fenlei-biao-qian--jihuo):hover {
  border-color: var(--yanse-zhanji-qian);
  background: color-mix(in srgb, var(--yanse-zhanji) 6%, var(--beijing-kaopian));
}

.fenlei-tu-biao-anniu:hover:not(:disabled) {
  background: color-mix(in srgb, var(--yanse-zhanji) 10%, transparent);
}

.fenlei-biao-qian-an-niu,
.fenlei-tu-biao-anniu,
.chuangJian-fenlei-anniu {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.fenlei-biao-qian-an-niu {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  min-width: 0;
  padding: var(--jiange-6) var(--jiange-10);
  font: inherit;
  font-weight: 800;
}

.fenlei-ming-cheng {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fenlei-ji-shu {
  flex: 0 0 auto;
  min-width: 24px;
  padding: var(--jiange-2) var(--jiange-6);
  border-radius: 999px;
  background: var(--yanse-zhanji);
  color: var(--beijing-zhuse);
  text-align: center;
  font-size: 11px;
}

.fenlei-tu-biao-anniu {
  width: 34px;
  padding: 0;
  border-left: 1px solid var(--biankuang-yanse);
  font-size: 18px;
  font-weight: 900;
}

.shanChu-fenlei-anniu:hover:not(:disabled) {
  background: transparent;
  color: var(--yanse-weixian);
}

.chuangJian-fenlei-anniu {
  width: 42px;
  font-size: 24px;
  font-weight: 900;
}

.fenlei-bian-ji {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--jiange-xiao);
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.fenlei-bao-cun,
.fenlei-qu-xiao {
  min-height: 42px;
  border: 2px solid var(--biankuang-yanse);
  border-radius: var(--juxing-shuru-yuanjiao);
  font: inherit;
  width: 42px;
  padding: 0;
  background: var(--yanse-zhanji);
  color: var(--beijing-zhuse);
  cursor: pointer;
  font-size: 18px;
  font-weight: 900;
}

button:focus-visible,
.fenlei-bao-cun:focus-visible,
.fenlei-qu-xiao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

:root[data-theme='light'] .fenlei-biao-qian,
:root[data-theme='light'] .chuangJian-fenlei-anniu {
  border-color: var(--beijing-zhuse);
  background: var(--beijing-kaopian);
  color: var(--beijing-zhuse);
}

:root[data-theme='light'] .fenlei-biao-qian--jihuo {
  background: color-mix(in srgb, var(--yanse-zhanji) 8%, var(--beijing-kaopian));
}

:root[data-theme='light'] .fenlei-tu-biao-anniu {
  border-left-color: var(--beijing-zhuse);
}

@media (max-width: 767px) {
  .fenlei-biao-qian,
  .chuangJian-fenlei-anniu,
  .fenlei-biao-qian-an-niu,
  .fenlei-tu-biao-anniu {
    min-height: 44px;
  }

  .fenlei-tu-biao-anniu,
  .chuangJian-fenlei-anniu,
  .fenlei-bao-cun,
  .fenlei-qu-xiao {
    min-width: 44px;
    min-height: 44px;
  }
}

@media (max-width: 640px) {
  .fenlei-biao-qian {
    max-width: calc(100vw - 74px);
  }

  .fenlei-bian-ji {
    gap: var(--jiange-6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fenlei-guan-li-lan *,
  .fenlei-guan-li-lan *::before,
  .fenlei-guan-li-lan *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
