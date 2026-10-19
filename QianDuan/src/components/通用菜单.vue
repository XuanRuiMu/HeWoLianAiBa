<template>
  <div class="tongyong-xiala-biao" :class="`tongyong-xiala-biao--${moShi}`">
    <span v-if="biaoQian && moShi !== 'keJianXing'" class="tongyong-xiala-wen">{{ biaoQian }}</span>
    <button
      ref="chuFaQiYuanSu"
      type="button"
      class="tongyong-xiala"
      :class="[`tongyong-xiala--${moShi}`, { 'tongyong-xiala--zhanKai': zhanKai }]"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="zhanKai"
      :aria-controls="lieBiaoId"
      :aria-activedescendant="zhanKai && huoDongId ? huoDongId : undefined"
      :aria-label="lieBiaoMing"
      :disabled="jinYong"
      @click="qieHuanXiaLa"
      @keydown="chuLiJianPan"
    >
      <span class="tongyong-xiala-zhi">{{ xianShiWenZi }}</span>
      <span class="tongyong-xiala-jiantou" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <Transition name="tongyong-xiala-guodu" :duration="{ enter: 200, leave: 160 }">
        <div
          v-if="zhanKai"
          ref="fuCengYuanSu"
          class="tongyong-fuceng"
          :class="`tongyong-fuceng--${moShi}`"
          :data-fangxiang="weiZhi.fangXiang"
          :style="fuCengYangShi"
          @pointerdown.stop
        >
          <div v-if="fuCengBiaoTi" class="tongyong-fuceng-tou" aria-hidden="true">
            {{ fuCengBiaoTi }}
          </div>
          <div :id="lieBiaoId" class="tongyong-liebiao" role="listbox" :aria-label="lieBiaoMing">
            <button
              v-for="(xuanXiang, suoYin) in xuanXiang"
              :id="xuanXiangId(suoYin)"
              :key="xuanXiang.zhi"
              type="button"
              class="tongyong-xuanxiang"
              :class="{
                'tongyong-xuanxiang--huoDong': suoYin === huoDongSuoYin,
                'tongyong-xuanxiang--xuanZhong': xuanXiang.zhi === moXingZhi,
                'tongyong-xuanxiang--jinYong': xuanXiang.jinYong,
              }"
              role="option"
              :aria-selected="xuanXiang.zhi === moXingZhi"
              :aria-disabled="xuanXiang.jinYong || undefined"
              tabindex="-1"
              @pointerenter="huoDongSuoYin = suoYin"
              @mousedown.prevent
              @click="xuanZeXuanXiang(xuanXiang)"
            >
              <span class="tongyong-xuanxiang-wen">{{ xuanXiang.wenZi }}</span>
              <span class="tongyong-xuanxiang-gou" aria-hidden="true">✓</span>
            </button>
          </div>
          <div v-if="!xuanXiang.length" class="tongyong-fuceng-kong">
            {{ huoQuFanYi('tongYong', 'wuKeXuanXiang') }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface TongYongXiaLaXuanXiang {
  zhi: string
  wenZi: string
  jinYong?: boolean
}

export interface 浮层位置 {
  top: number
  left: number
  kuanDu: number
  zuiDaGaoDu: number
  fangXiang: 'xia' | 'shang'
}

export interface 浮层定位选项 {
  duiQi?: 'zuo' | 'you' | 'juZhong'
  jianGe?: number
  bianJu?: number
  zuiDaGaoDu?: number
  zuiXiaoKuanDu?: number
  zuiDaKuanDu?: number
}

let xiaLaXuHao = 0

export function 使用浮层定位(
  chuFaQi: Ref<HTMLElement | null>,
  fuCeng: Ref<HTMLElement | null>,
  xuanXiang: 浮层定位选项 = {},
) {
  const 位置 = ref<浮层位置>({ top: 0, left: 0, kuanDu: 0, zuiDaGaoDu: 0, fangXiang: 'xia' })
  let 跟踪中 = false
  let 帧号 = 0
  const 间距 = xuanXiang.jianGe ?? 8
  const 边距 = xuanXiang.bianJu ?? 8
  const 对齐 = xuanXiang.duiQi ?? 'zuo'
  const 高度上限 = xuanXiang.zuiDaGaoDu ?? 420

  function 传递继承变量(): void {
    const 触发 = chuFaQi.value
    const 浮层 = fuCeng.value
    if (!触发 || !浮层) return
    const 样式 = getComputedStyle(触发)
    for (const 名 of 继承变量) {
      const 值 = 样式.getPropertyValue(名).trim()
      if (值) 浮层.style.setProperty(名, 值)
    }
  }

  function 计算(): void {
    const 触发 = chuFaQi.value
    const 浮层 = fuCeng.value
    if (!触发 || !浮层) return
    传递继承变量()
    const 触发盒 = 触发.getBoundingClientRect()
    const 视口宽 = document.documentElement.clientWidth
    const 视口高 = document.documentElement.clientHeight
    浮层.style.width = 'max-content'
    浮层.style.maxWidth = `${Math.max(160, 视口宽 - 边距 * 2)}px`
    const 自然宽 = 浮层.getBoundingClientRect().width
    const 宽度 = Math.min(
      Math.max(触发盒.width, 自然宽, xuanXiang.zuiXiaoKuanDu ?? 0),
      xuanXiang.zuiDaKuanDu ?? 视口宽 - 边距 * 2,
      视口宽 - 边距 * 2,
    )
    const 原最大高度 = 浮层.style.maxHeight
    浮层.style.maxHeight = 'none'
    const 自然高 = 浮层.scrollHeight
    浮层.style.maxHeight = 原最大高度
    const 下方空间 = 视口高 - 触发盒.bottom - 边距 - 间距
    const 上方空间 = 触发盒.top - 边距 - 间距
    const 向下 = 下方空间 >= Math.min(自然高, 高度上限) || 下方空间 >= 上方空间
    const 可用高 = Math.max(120, Math.min(自然高, 向下 ? 下方空间 : 上方空间, 高度上限))
    let 左 = 触发盒.left
    if (对齐 === 'you') 左 = 触发盒.right - 宽度
    if (对齐 === 'juZhong') 左 = 触发盒.left + 触发盒.width / 2 - 宽度 / 2
    左 = Math.min(Math.max(左, 边距), Math.max(边距, 视口宽 - 边距 - 宽度))
    const 上 = 向下
      ? 触发盒.bottom + 间距
      : Math.max(边距, 触发盒.top - 间距 - Math.min(自然高, 可用高))
    位置.value = {
      top: 上,
      left: 左,
      kuanDu: 宽度,
      zuiDaGaoDu: 可用高,
      fangXiang: 向下 ? 'xia' : 'shang',
    }
  }

  function 刷新(): void {
    if (帧号) return
    帧号 = requestAnimationFrame(() => {
      帧号 = 0
      if (跟踪中) 计算()
    })
  }

  function 开始跟踪(): void {
    if (跟踪中) return
    跟踪中 = true
    window.addEventListener('scroll', 刷新, true)
    window.addEventListener('resize', 刷新)
  }

  function 结束跟踪(): void {
    if (!跟踪中) return
    跟踪中 = false
    window.removeEventListener('scroll', 刷新, true)
    window.removeEventListener('resize', 刷新)
    if (帧号) {
      cancelAnimationFrame(帧号)
      帧号 = 0
    }
  }

  onBeforeUnmount(结束跟踪)

  return { 位置, 计算, 开始跟踪, 结束跟踪 }
}

export function 使用浮层关闭(
  浮层: Ref<HTMLElement | null>,
  触发器: Ref<HTMLElement | null>,
  已打开: () => boolean,
  关闭: (返回焦点: boolean) => void,
) {
  function 指针按下(事件: PointerEvent): void {
    if (!已打开()) return
    const 目标 = 事件.target as Node | null
    if (!目标) return
    if (浮层.value?.contains(目标) || 触发器.value?.contains(目标)) return
    关闭(false)
  }

  function 按键按下(事件: KeyboardEvent): void {
    if (事件.key !== 'Escape' || !已打开()) return
    事件.stopPropagation()
    关闭(true)
  }

  onMounted(() => {
    document.addEventListener('pointerdown', 指针按下, true)
    document.addEventListener('keydown', 按键按下)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', 指针按下, true)
    document.removeEventListener('keydown', 按键按下)
  })
}

const 继承变量: string[] = ['--kaPian', '--bianKuang', '--moSe', '--yeLv', '--huiSe']
</script>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

const props = withDefaults(
  defineProps<{
    moShi: 'zhanJi' | 'fanYi' | 'keJianXing' | 'quanJu'
    xuanXiang: TongYongXiaLaXuanXiang[]
    moXingZhi: string
    biaoQian?: string
    ariaBiaoQian?: string
    jinYong?: boolean
  }>(),
  { biaoQian: '', ariaBiaoQian: '', jinYong: false },
)

const emit = defineEmits<{
  (e: 'geng-xin', zhi: string): void
}>()

xiaLaXuHao += 1
const benCiHao = xiaLaXuHao
const lieBiaoId = `tongyong-xiala-liebiao-${benCiHao}`
const zhanKai = ref(false)
const huoDongSuoYin = ref(-1)
const chuFaQiYuanSu = ref<HTMLButtonElement | null>(null)
const fuCengYuanSu = ref<HTMLElement | null>(null)

const { 位置: weiZhi, 计算, 开始跟踪, 结束跟踪 } = 使用浮层定位(chuFaQiYuanSu, fuCengYuanSu, {
  duiQi: 'zuo',
  jianGe: 6,
  zuiXiaoKuanDu: 180,
  zuiDaKuanDu: 320,
})

const xuanZhongSuoYin = computed(() =>
  props.xuanXiang.findIndex((xiang) => xiang.zhi === props.moXingZhi),
)

const xianShiWenZi = computed(
  () => xuanZhongSuoYin.value >= 0
    ? props.xuanXiang[xuanZhongSuoYin.value].wenZi
    : props.xuanXiang[0]?.wenZi ?? '',
)

const lieBiaoMing = computed(
  () => props.ariaBiaoQian || props.biaoQian || huoQuFanYi('tongYong', 'xuanXiangLieBiao'),
)

const fuCengBiaoTi = computed(() => {
  if (props.biaoQian) return props.biaoQian
  if (props.moShi === 'zhanJi') return huoQuFanYi('zhanJi', 'xuanZeFenLei')
  if (props.moShi === 'quanJu') return huoQuFanYi('tongYong', 'xuanXiangLieBiao')
  return ''
})

const huoDongId = computed(() =>
  huoDongSuoYin.value >= 0 ? xuanXiangId(huoDongSuoYin.value) : '',
)

const fuCengYangShi = computed(() => ({
  top: `${weiZhi.value.top}px`,
  left: `${weiZhi.value.left}px`,
  width: `${weiZhi.value.kuanDu}px`,
  maxHeight: `${weiZhi.value.zuiDaGaoDu}px`,
}))

function xuanXiangId(suoYin: number): string {
  return `tongyong-xiala-xuanxiang-${benCiHao}-${suoYin}`
}

function 首个KeYongSuoYin(): number {
  return props.xuanXiang.findIndex((xiang) => !xiang.jinYong)
}

let 焦点补偿定时: ReturnType<typeof setTimeout> | null = null

function 恢复焦点(次数 = 0): void {
  const 触发器 = chuFaQiYuanSu.value
  if (!触发器) return
  if (触发器.disabled && 次数 < 12) {
    焦点补偿定时 = setTimeout(() => 恢复焦点(次数 + 1), 120)
    return
  }
  焦点补偿定时 = null
  触发器.focus()
}

onBeforeUnmount(() => {
  if (焦点补偿定时) clearTimeout(焦点补偿定时)
})

function 打开(xuanZhongSuoYinZhi?: number): void {
  if (props.jinYong || zhanKai.value) return
  if (焦点补偿定时) {
    clearTimeout(焦点补偿定时)
    焦点补偿定时 = null
  }
  zhanKai.value = true
  huoDongSuoYin.value = xuanZhongSuoYinZhi !== undefined
    ? xuanZhongSuoYinZhi
    : xuanZhongSuoYin.value >= 0
      ? xuanZhongSuoYin.value
      : 首个KeYongSuoYin()
  void nextTick(() => {
    计算()
    开始跟踪()
    确保HuoDongKeJian()
  })
}

function 关闭(返回焦点: boolean): void {
  if (!zhanKai.value) return
  zhanKai.value = false
  结束跟踪()
  if (返回焦点) void nextTick(() => 恢复焦点())
}

function 确保HuoDongKeJian(): void {
  const 浮层 = fuCengYuanSu.value
  if (!浮层) return
  const 目标 = 浮层.querySelector<HTMLElement>('.tongyong-xuanxiang--huoDong')
  目标?.scrollIntoView({ block: 'nearest' })
}

function 移动HuoDong(步进: number): void {
  const 总数 = props.xuanXiang.length
  if (!总数) return
  let 索引 = huoDongSuoYin.value
  for (let 次数 = 0; 次数 < 总数; 次数++) {
    索引 = (索引 + 步进 + 总数) % 总数
    if (!props.xuanXiang[索引].jinYong) {
      huoDongSuoYin.value = 索引
      break
    }
  }
  void nextTick(确保HuoDongKeJian)
}

function 移到端点(到开头: boolean): void {
  const 候选 = 到开头 ? props.xuanXiang : [...props.xuanXiang].reverse()
  const 位置 = 候选.find((xiang) => !xiang.jinYong)
  if (!位置) return
  const 索引 = props.xuanXiang.indexOf(位置)
  if (索引 >= 0) {
    huoDongSuoYin.value = 索引
    void nextTick(确保HuoDongKeJian)
  }
}

function qieHuanXiaLa(): void {
  if (props.jinYong) return
  if (zhanKai.value) 关闭(true)
  else 打开()
}

function xuanZeXuanXiang(xuanXiang: TongYongXiaLaXuanXiang): void {
  if (xuanXiang.jinYong) return
  if (xuanXiang.zhi !== props.moXingZhi) emit('geng-xin', xuanXiang.zhi)
  关闭(true)
}

function chuLiJianPan(事件: KeyboardEvent): void {
  if (props.jinYong) return
  switch (事件.key) {
    case 'ArrowDown':
      事件.preventDefault()
      if (!zhanKai.value) 打开()
      else 移动HuoDong(1)
      break
    case 'ArrowUp':
      事件.preventDefault()
      if (!zhanKai.value) 打开()
      else 移动HuoDong(-1)
      break
    case 'Home':
      if (!zhanKai.value) return
      事件.preventDefault()
      移到端点(true)
      break
    case 'End':
      if (!zhanKai.value) return
      事件.preventDefault()
      移到端点(false)
      break
    case 'Enter':
      事件.preventDefault()
      if (!zhanKai.value) {
        打开()
      } else {
        const xuanXiang = props.xuanXiang[huoDongSuoYin.value]
        if (xuanXiang) xuanZeXuanXiang(xuanXiang)
      }
      break
    case ' ':
      事件.preventDefault()
      if (!zhanKai.value) 打开()
      else {
        const xuanXiang = props.xuanXiang[huoDongSuoYin.value]
        if (xuanXiang) xuanZeXuanXiang(xuanXiang)
      }
      break
    case 'Escape':
      if (!zhanKai.value) return
      事件.preventDefault()
      关闭(true)
      break
    case 'Tab':
      if (zhanKai.value) 关闭(false)
      break
    default:
      break
  }
}

watch(
  () => props.jinYong,
  (jinYong) => {
    if (jinYong && zhanKai.value) 关闭(false)
  },
)

watch(
  () => props.moXingZhi,
  () => {
    if (!zhanKai.value) return
    huoDongSuoYin.value = xuanZhongSuoYin.value >= 0 ? xuanZhongSuoYin.value : 首个KeYongSuoYin()
  },
)

使用浮层关闭(fuCengYuanSu, chuFaQiYuanSu, () => zhanKai.value, 关闭)
</script>

<style scoped>
.tongyong-xiala-biao {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
  min-width: 0;
  font-size: var(--ziti-xiao);
}

.tongyong-xiala-wen {
  color: var(--wenben-ciuse);
  font-size: 11px;
  line-height: 1.3;
}

.tongyong-xiala {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-xiao);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  font: inherit;
  text-align: left;
  color: var(--wenben-zhuse);
  cursor: pointer;
  transition:
    border-color var(--quxian-biao-zhun),
    background-color var(--quxian-biao-zhun),
    box-shadow var(--quxian-biao-zhun),
    color var(--quxian-biao-zhun);
}

.tongyong-xiala-zhi {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tongyong-xiala-jiantou {
  flex: none;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  opacity: 0.7;
  transform: rotate(45deg);
  transition: transform var(--quxian-biao-zhun);
}

.tongyong-xiala--zhanKai .tongyong-xiala-jiantou {
  transform: rotate(225deg);
}

.tongyong-xiala--zhanJi {
  min-height: 34px;
  max-width: 180px;
  padding: var(--jiange-6) var(--jiange-10);
  border: 1.5px solid var(--yanse-zhanji-qian);
  border-radius: 10px;
  background: var(--beijing-kaopian);
  font-size: 12px;
  font-weight: 700;
}

.tongyong-xiala--zhanJi:hover:not(:disabled) {
  border-color: var(--yanse-zhanji);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--yanse-zhanji) 28%, transparent);
}

.tongyong-xiala--fanYi {
  padding: var(--jiange-6) var(--jiange-10);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 10px;
  background: var(--beijing-ciuse);
  font-size: 12px;
}

.tongyong-xiala--fanYi:hover:not(:disabled) {
  border-color: var(--zhuse);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--zhuse) 22%, transparent);
}

.tongyong-xiala--keJianXing {
  padding: var(--jiange-10) var(--jiange-12);
  border: 1px solid var(--bianKuang, var(--biankuang-yanse));
  border-radius: 10px;
  background: var(--kaPian, var(--beijing-kaopian));
  color: var(--moSe, var(--wenben-zhuse));
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.tongyong-xiala--keJianXing:hover:not(:disabled) {
  border-color: var(--yeLv, var(--zhuse));
}

.tongyong-xiala--quanJu {
  min-width: 160px;
  padding: var(--jiange-10) var(--jiange-12);
  border: 1px solid var(--xiala-biankuang);
  border-radius: 9px;
  background: var(--xiala-beijing);
  color: var(--xiala-wenben);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.tongyong-xiala--quanJu:hover:not(:disabled) {
  background-color: var(--xiala-hover-beijing);
  color: var(--xiala-hover-wenben);
}

.tongyong-xiala:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.tongyong-xiala:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.tongyong-xiala-biao--keJianXing .tongyong-xiala:focus-visible {
  outline: var(--jujiao-huan-kuan-du-wenben) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi-wenben);
}

.tongyong-fuceng {
  --tongyong-fuceng-ceng: var(--ceng-caidan);
  position: fixed;
  z-index: var(--tongyong-fuceng-ceng);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  transform-origin: top center;
}

.tongyong-fuceng[data-fangxiang='shang'] {
  transform-origin: bottom center;
}

.tongyong-fuceng-tou {
  flex: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tongyong-liebiao {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--jiange-2);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.tongyong-xuanxiang {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--jiange-xiao);
  width: 100%;
  min-height: 36px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.tongyong-xuanxiang-wen {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tongyong-xuanxiang-gou {
  flex: none;
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.tongyong-xuanxiang--xuanZhong .tongyong-xuanxiang-gou {
  opacity: 1;
  transform: scale(1);
}

.tongyong-xuanxiang--jinYong {
  opacity: 0.4;
  cursor: not-allowed;
}

.tongyong-fuceng-kong {
  padding: var(--jiange-10) var(--jiange-12);
  color: var(--wenben-tishi);
  font-size: 12px;
  text-align: center;
}

.tongyong-fuceng--zhanJi {
  padding: var(--jiange-6);
  border: 2px solid var(--yanse-zhanji-qian);
  border-radius: 12px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  box-shadow:
    var(--xiala-yinying),
    4px 4px 0 color-mix(in srgb, var(--yanse-zhanji) 32%, transparent);
}

.tongyong-fuceng--zhanJi .tongyong-fuceng-tou {
  padding: var(--jiange-6) var(--jiange-10) var(--jiange-4);
  margin-bottom: var(--jiange-4);
  border-bottom: 1px solid color-mix(in srgb, var(--yanse-zhanji-qian) 55%, transparent);
  color: var(--yanse-zhanji);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.tongyong-fuceng--zhanJi .tongyong-xuanxiang {
  padding: var(--jiange-6) var(--jiange-10);
  border-radius: 8px;
  color: var(--wenben-zhuse);
  font-size: 12.5px;
  font-weight: 700;
}

.tongyong-fuceng--zhanJi .tongyong-xuanxiang:hover {
  background: color-mix(in srgb, var(--yanse-zhanji) 9%, transparent);
}

.tongyong-fuceng--zhanJi .tongyong-xuanxiang--huoDong {
  background: color-mix(in srgb, var(--yanse-zhanji) 12%, transparent);
  box-shadow: inset 0 0 0 2px var(--yanse-zhanji);
}

.tongyong-fuceng--zhanJi .tongyong-xuanxiang--xuanZhong {
  background: color-mix(in srgb, var(--yanse-zhanji) 16%, transparent);
  box-shadow: inset 3px 0 0 var(--yanse-zhanji);
}

.tongyong-fuceng--zhanJi .tongyong-xuanxiang--huoDong.tongyong-xuanxiang--xuanZhong {
  box-shadow:
    inset 3px 0 0 var(--yanse-zhanji),
    inset 0 0 0 2px var(--yanse-zhanji);
}

.tongyong-fuceng--zhanJi .tongyong-xuanxiang-gou {
  color: var(--yanse-zhanji);
  font-weight: 900;
}

.tongyong-fuceng--fanYi {
  padding: var(--jiange-6);
  border: 1px solid var(--biankuang-yanse);
  border-radius: 12px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  box-shadow: var(--xiala-yinying);
}

.tongyong-fuceng--fanYi .tongyong-fuceng-tou {
  padding: var(--jiange-6) var(--jiange-10) var(--jiange-4);
  margin-bottom: var(--jiange-4);
  border-bottom: 1px solid var(--biankuang-yanse);
  color: var(--wenben-ciuse);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.tongyong-fuceng--fanYi .tongyong-xuanxiang {
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: 8px;
  color: var(--wenben-zhuse);
  font-size: 13px;
}

.tongyong-fuceng--fanYi .tongyong-xuanxiang:hover {
  background: var(--beijing-ciuse);
}

.tongyong-fuceng--fanYi .tongyong-xuanxiang--huoDong {
  background: var(--beijing-ciuse);
  box-shadow: inset 0 0 0 1.5px var(--zhuse);
}

.tongyong-fuceng--fanYi .tongyong-xuanxiang--xuanZhong {
  background: color-mix(in srgb, var(--zhuse) 13%, transparent);
  color: var(--wenben-zhuse);
  font-weight: 600;
}

.tongyong-fuceng--fanYi .tongyong-xuanxiang-gou {
  color: var(--zhuse);
  font-weight: 900;
}

.tongyong-fuceng--keJianXing {
  padding: var(--jiange-4);
  border: 1px solid var(--bianKuang, var(--biankuang-yanse));
  border-radius: 10px;
  background: var(--kaPian, var(--beijing-kaopian));
  color: var(--moSe, var(--wenben-zhuse));
  box-shadow: var(--xiala-yinying);
}

.tongyong-fuceng--keJianXing .tongyong-fuceng-tou {
  padding: var(--jiange-6) var(--jiange-xiao) var(--jiange-4);
  margin-bottom: var(--jiange-2);
  border-bottom: 1px dashed var(--bianKuang, var(--biankuang-yanse));
  color: var(--huiSe, var(--wenben-ciuse));
  font-size: 11px;
  letter-spacing: 0.06em;
}

.tongyong-fuceng--keJianXing .tongyong-xuanxiang {
  padding: var(--jiange-6) var(--jiange-xiao);
  border-radius: 6px;
  color: var(--moSe, var(--wenben-zhuse));
  font-size: 13px;
}

.tongyong-fuceng--keJianXing .tongyong-xuanxiang:hover {
  background: color-mix(in srgb, var(--yeLv, var(--zhuse)) 10%, transparent);
}

.tongyong-fuceng--keJianXing .tongyong-xuanxiang--huoDong {
  background: color-mix(in srgb, var(--yeLv, var(--zhuse)) 12%, transparent);
  box-shadow: inset 0 0 0 1.5px var(--yeLv, var(--zhuse));
}

.tongyong-fuceng--keJianXing .tongyong-xuanxiang--xuanZhong {
  background: color-mix(in srgb, var(--yeLv, var(--zhuse)) 14%, transparent);
  box-shadow: inset 2px 0 0 var(--yeLv, var(--zhuse));
}

.tongyong-fuceng--keJianXing .tongyong-xuanxiang-gou {
  color: var(--yeLv, var(--zhuse));
  font-weight: 900;
}

.tongyong-fuceng--quanJu {
  padding: var(--jiange-6);
  border: 1px solid var(--xiala-biankuang);
  border-radius: 12px;
  background: var(--xiala-beijing);
  color: var(--xiala-wenben);
  box-shadow: var(--xiala-yinying);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.tongyong-fuceng--quanJu .tongyong-fuceng-tou {
  padding: var(--jiange-4) var(--jiange-10) var(--jiange-6);
  color: var(--xiala-wenben);
  font-size: 11px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.tongyong-fuceng--quanJu .tongyong-xuanxiang {
  padding: var(--jiange-10) var(--jiange-12);
  border-radius: 9px;
  color: var(--xiala-wenben);
  font-size: 13px;
}

.tongyong-fuceng--quanJu .tongyong-xuanxiang:hover {
  background: var(--xiala-hover-beijing);
  color: var(--xiala-hover-wenben);
}

.tongyong-fuceng--quanJu .tongyong-xuanxiang--huoDong {
  background: var(--xiala-hover-beijing);
  box-shadow: inset 0 0 0 1.5px var(--xiala-hover-wenben);
}

.tongyong-fuceng--quanJu .tongyong-xuanxiang--xuanZhong {
  background: var(--xiala-hover-beijing);
  color: var(--xiala-hover-wenben);
  font-weight: 600;
}

.tongyong-fuceng--quanJu .tongyong-xuanxiang-gou {
  color: var(--zhuse);
}

.tongyong-xiala-guodu-enter-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s var(--quxian-tan-chu);
}

.tongyong-xiala-guodu-leave-active {
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.tongyong-xiala-guodu-enter-from {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

.tongyong-xiala-guodu-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}

@media (max-width: 767px) {
  .tongyong-xuanxiang {
    min-height: 44px;
  }

  .tongyong-xiala--zhanJi,
  .tongyong-xiala--fanYi,
  .tongyong-xiala--keJianXing,
  .tongyong-xiala--quanJu {
    min-height: 44px;
  }

  .tongyong-xiala--zhanJi {
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tongyong-xiala,
  .tongyong-xiala-jiantou,
  .tongyong-xuanxiang,
  .tongyong-xuanxiang-gou,
  .tongyong-xiala-guodu-enter-active,
  .tongyong-xiala-guodu-leave-active {
    transition: none;
  }
}
</style>
