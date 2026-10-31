<template>
  <div class="qu-hao-xuan-ze-qi">
    <button
      ref="触发行"
      type="button"
      class="qu-hao-chu"
      :aria-label="按钮文案"
      :aria-expanded="展开 ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click.stop="qieHuan"
    >
      <span class="qu-hao-chu-hao">+{{ 模型值 }}</span>
      <svg class="qu-hao-chu-jian" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path
          d="M2.5 4.5 6 8l3.5-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="展开" class="qu-hao-zhe-zhao" @click="guanBi" />
      <div
        v-if="展开"
        ref="浮层"
        class="qu-hao-lie-biao renzheng-ka-pei-se"
        role="listbox"
        :aria-label="huoQuFanYi('ui', 'quHaoLieBiao')"
        :style="浮层样式"
        @keydown="处理按键"
      >
        <label class="qu-hao-sou-suo">
          <input
            ref="搜索框"
            v-model="搜索词"
            type="text"
            class="qu-hao-sou-suo-shu-ru"
            data-kuang-ti="fangkuang"
            :placeholder="huoQuFanYi('ui', 'quHaoSouSuoZhanWei')"
            :aria-label="huoQuFanYi('ui', 'quHaoSouSuoZhanWei')"
            autocomplete="off"
          />
        </label>
        <div class="qu-hao-lun-ti">
          <button
            v-for="(项, 序) in 候选"
            :key="项.quHao + '-' + 项.guoJia"
            type="button"
            class="qu-hao-tiao"
            :class="{ 'qu-hao-tiao--xuan': 项.quHao === 模型值 }"
            role="option"
            :aria-selected="项.quHao === 模型值 ? 'true' : 'false'"
            @click="xuanZe(项)"
            @pointerenter="高亮序 = 序"
          >
            <span class="qu-hao-tiao-hao">+{{ 项.quHao }}</span>
            <span class="qu-hao-tiao-ming">{{ quHaoWenAn(项) }}</span>
          </button>
          <p v-if="候选.length === 0" class="qu-hao-kong" role="status">
            {{ huoQuFanYi('ui', 'quHaoWuPiPei') }}
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
import { QU_HAO_XUAN_XIANG, quHaoWenAn, type QuHaoXuanXiang } from '@/utils/手机号'

const 属性 = withDefaults(defineProps<{ 模型值: string; 禁用?: boolean; 排除区号?: string[] }>(), {
  禁用: false,
  排除区号: () => [],
})

const 发出 = defineEmits<{
  (时间: 'geng-xin', 值: string): void
  (时间: 'update:模型值', 值: string): void
}>()

const 触发行 = ref<HTMLButtonElement | null>(null)
const 浮层 = ref<HTMLElement | null>(null)
const 搜索框 = ref<HTMLInputElement | null>(null)
const 展开 = ref(false)
const 搜索词 = ref('')
const 高亮序 = ref(0)
const 浮层样式 = ref<Record<string, string>>({})

const 按钮文案 = computed(() => huoQuFanYi('ui', 'xuanZeQuHao') + '：+' + 属性.模型值)

function guiYiSouSuoCi(词: string): string {
  return 词.trim().toLowerCase().replace(/[\s+]/g, '')
}

const 可选区号 = computed<QuHaoXuanXiang[]>(() => {
  const 排除 = new Set(属性.排除区号.map((码) => 码.replace(/\D/g, '')))
  return 排除.size === 0 ? QU_HAO_XUAN_XIANG : QU_HAO_XUAN_XIANG.filter((项) => !排除.has(项.quHao))
})

const 候选 = computed<QuHaoXuanXiang[]>(() => {
  const 词 = guiYiSouSuoCi(搜索词.value)
  if (词 === '') return 可选区号.value
  return 可选区号.value.filter((项) => {
    if (项.quHao.includes(词)) return true
    if (guiYiSouSuoCi(quHaoWenAn(项)).includes(词)) return true
    if (项.guoJia.toLowerCase().includes(词)) return true
    return guiYiSouSuoCi(项.yingWenMing).includes(词)
  })
})

const 浮层边距 = 8
const 浮层间隙 = 6
const 浮层最小高 = 120

function 量取浮层(): void {
  const 按钮 = 触发行.value
  if (!按钮) return
  const 框 = 按钮.getBoundingClientRect()
  const 宽 = Math.max(框.width, 184)
  const 左 = Math.min(框.left, Math.max(浮层边距, window.innerWidth - 宽 - 浮层边距))
  const 可用下 = window.innerHeight - 框.bottom - 浮层间隙 - 浮层边距
  const 可用上 = 框.top - 浮层间隙 - 浮层边距
  const 向上 = 可用下 < 浮层最小高 && 可用上 > 可用下
  const 可用 = Math.max(浮层最小高, 向上 ? 可用上 : 可用下)
  浮层样式.value = {
    position: 'fixed',
    left: String(Math.max(浮层边距, 左)) + 'px',
    top: 向上 ? 'auto' : String(框.bottom + 浮层间隙) + 'px',
    bottom: 向上 ? String(window.innerHeight - 框.top + 浮层间隙) + 'px' : 'auto',
    width: String(宽) + 'px',
    maxHeight: String(可用) + 'px',
  }
}

function 卸载监听(): void {
  window.removeEventListener('resize', 量取浮层)
  window.removeEventListener('scroll', 量取浮层, true)
  document.removeEventListener('pointerdown', 处理外部点击, true)
}

function guanBi(): void {
  展开.value = false
  搜索词.value = ''
  高亮序.value = 0
  卸载监听()
}

function 处理外部点击(事件: Event): void {
  const 目标 = 事件.target as Node | null
  if (!目标) return
  if (浮层.value?.contains(目标)) return
  if (触发行.value?.contains(目标)) return
  guanBi()
}

function qieHuan(): void {
  if (属性.禁用) return
  if (展开.value) {
    guanBi()
    return
  }
  展开.value = true
  nextTick(() => {
    量取浮层()
    搜索框.value?.focus({ preventScroll: true })
    window.addEventListener('resize', 量取浮层)
    window.addEventListener('scroll', 量取浮层, true)
    document.addEventListener('pointerdown', 处理外部点击, true)
  })
}

function xuanZe(项: QuHaoXuanXiang): void {
  if (项.quHao !== 属性.模型值) {
    发出('geng-xin', 项.quHao)
    发出('update:模型值', 项.quHao)
  }
  guanBi()
  触发行.value?.focus({ preventScroll: true })
}

function 处理按键(事件: KeyboardEvent): void {
  if (事件.key === 'Escape') {
    事件.stopPropagation()
    guanBi()
    触发行.value?.focus({ preventScroll: true })
    return
  }
  if (事件.key === 'ArrowDown' || 事件.key === 'ArrowUp') {
    事件.preventDefault()
    const 步 = 事件.key === 'ArrowDown' ? 1 : -1
    const 总 = 候选.value.length
    if (总 === 0) return
    高亮序.value = (高亮序.value + 步 + 总) % 总
    nextTick(() => {
      const 节点 = 浮层.value?.querySelectorAll<HTMLElement>('.qu-hao-tiao')[高亮序.value]
      节点?.focus()
    })
    return
  }
  if (事件.key === 'Enter') {
    const 项 = 候选.value[高亮序.value]
    if (项) {
      事件.preventDefault()
      xuanZe(项)
    }
  }
}

watch(展开, (开) => {
  if (开) return
  卸载监听()
})

onBeforeUnmount(卸载监听)
</script>

<style scoped>
.qu-hao-xuan-ze-qi {
  flex: none;
}

.qu-hao-chu {
  display: inline-flex;
  align-self: stretch;
  align-items: center;
  gap: var(--jiange-4);
  padding: calc(var(--jiange-zhong) + var(--jiange-2)) 0 var(--jiange-10);
  background: transparent;
  border: none;
  color: var(--ka-ci-wen, var(--wenben-ciuse));
  font-family: inherit;
  font-size: var(--shuru-kuang-zihao);
  line-height: normal;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: color 0.2s var(--quxian-biao-zhun);
}

.qu-hao-chu:hover {
  color: var(--ka-zhu-wen, var(--wenben-zhuse));
}

.qu-hao-chu:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
  border-radius: var(--jiange-4);
}

.qu-hao-chu-hao {
  font-variant-numeric: tabular-nums;
}

.qu-hao-chu-jian {
  width: var(--shuru-qu-hao-jian-tou-chi-cun);
  height: var(--shuru-qu-hao-jian-tou-chi-cun);
  flex: none;
  transition: transform 0.2s var(--quxian-biao-zhun);
}

.qu-hao-chu[aria-expanded='true'] .qu-hao-chu-jian {
  transform: rotate(180deg);
}

.qu-hao-zhe-zhao {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: transparent;
}

.qu-hao-lie-biao {
  z-index: 1201;
  min-width: var(--shuru-qu-hao-lie-biao-kuan);
  max-height: var(--shuru-qu-hao-lie-biao-gao);
  padding: var(--jiange-6);
  background: var(--renzheng-mian-se, var(--beijing-kaopian));
  border: var(--renzheng-ka-bian-kuan) solid var(--ka-jin-xian, var(--biankuang-yanse));
  border-radius: var(--yuanjiao-xiao);
  box-shadow: var(--caidan-yinying);
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  overflow: hidden;
}

.qu-hao-sou-suo {
  display: block;
  flex: none;
}

.qu-hao-sou-suo-shu-ru {
  box-sizing: border-box;
  width: 100%;
  padding: var(--jiange-6) var(--jiange-xiao);
  background: var(--touxiang-touming-beijing, transparent);
  border: var(--renzheng-ka-bian-kuan) solid var(--ka-jin-xian, var(--biankuang-yanse));
  border-radius: var(--shuru-kuang-yuanjiao);
  color: var(--ka-zhu-wen, var(--wenben-zhuse));
  font-family: inherit;
  font-size: var(--ziti-xiao);
  line-height: normal;
  outline: none;
}

.qu-hao-sou-suo-shu-ru:focus,
.qu-hao-sou-suo-shu-ru:focus-visible {
  border-color: var(--ka-jin, var(--zhuse));
  outline: none;
}

.qu-hao-lun-ti {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: var(--jiange-2);
}

.qu-hao-tiao {
  display: flex;
  align-items: center;
  gap: var(--jiange-xiao);
  width: 100%;
  padding: var(--jiange-6) var(--jiange-xiao);
  background: transparent;
  border: none;
  border-radius: var(--jiange-4);
  color: var(--ka-zhu-wen, var(--wenben-zhuse));
  font-family: inherit;
  font-size: var(--ziti-xiao);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.16s var(--quxian-biao-zhun);
}

.qu-hao-tiao:hover,
.qu-hao-tiao:focus-visible {
  background: var(--ka-jin-mian, var(--touxiang-touming-beijing));
  outline: none;
}

.qu-hao-tiao--xuan {
  background: var(--ka-jin-mian, var(--touxiang-touming-beijing));
  font-weight: 600;
}

.qu-hao-tiao-hao {
  flex: none;
  min-width: var(--shuru-qu-hao-hao-kuan);
  font-variant-numeric: tabular-nums;
}

.qu-hao-tiao-ming {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ka-ci-wen, var(--wenben-ciuse));
}

.qu-hao-tiao--xuan .qu-hao-tiao-ming {
  color: var(--ka-zhu-wen, var(--wenben-zhuse));
}

.qu-hao-kong {
  margin: 0;
  padding: var(--jiange-12) var(--jiange-xiao);
  font-size: var(--ziti-xiao);
  color: var(--ka-ci-wen, var(--wenben-ciuse));
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .qu-hao-chu,
  .qu-hao-chu-jian,
  .qu-hao-tiao {
    transition: none;
  }
}
</style>
