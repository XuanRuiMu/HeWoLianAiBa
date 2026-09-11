<template>
  <div
    ref="浮窗"
    class="guanli-jiankong-fuchuang"
    :class="{ 'zui-xiao-hua': 最小化状态 }"
    :style="位移样式"
    role="dialog"
    aria-label="管理员实时监控"
  >
    <header class="jiankong-biaoti-lan" @pointerdown="开始拖动">
      <div class="jiankong-biaoti">
        <span class="jiankong-dian" />
        {{ huoQuFanYi('guanLiJianKong', 'biaoTi') }}
        <span v-if="事件总数 > 0" class="jiankong-jishu">{{ 事件总数 }}</span>
      </div>
      <div class="jiankong-caoZuo">
        <button
          v-if="!最小化状态"
          class="jiankong-paixu"
          type="button"
          :title="huoQuFanYi('guanLiJianKong', 'paiXuFangShi')"
          @pointerdown.stop
          @click.stop="切换排序"
        >
          {{ 排序方式 === 'jiang' ? huoQuFanYi('guanLiJianKong', 'shiJianJiangXu') : huoQuFanYi('guanLiJianKong', 'shiJianShengXu') }}
        </button>
        <button class="jiankong-zuiXiao" type="button" @pointerdown.stop @click.stop="切换最小化">
          {{ 最小化状态 ? huoQuFanYi('guanLiJianKong', 'zhanKai') : huoQuFanYi('guanLiJianKong', 'zuiXiaoHua') }}
        </button>
        <button class="jiankong-guanbi" type="button" @pointerdown.stop @click.stop="关闭">
          {{ huoQuFanYi('guanLiJianKong', 'guanBi') }}
        </button>
      </div>
    </header>

    <div v-if="!最小化状态" class="jiankong-wangge">
      <section class="jiankong-fenqu jiankong-renshe">
        <h3 class="fenqu-biaoti" @click="切换分区('renShe')">
          {{ huoQuFanYi('guanLiJianKong', 'jiaoSeRenShe') }}
          <span class="fenqu-zheDie" :class="{ 'shou-qi': 分区折叠.renShe }">{{ 分区折叠.renShe ? '▶' : '▼' }}</span>
        </h3>
        <div v-if="!分区折叠.renShe" class="fenqu-neirong">
          <div v-if="聊天仓库.jiaoSeXinXi" class="renshe-xinxi">
            <div class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'mingZi') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.ming_zi }}</span>
            </div>
            <div class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'xingBie') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.xing_bie === 'nan' ? huoQuFanYi('guanLiJianKong', 'nanXing') : huoQuFanYi('guanLiJianKong', 'nvXing') }}</span>
            </div>
            <div class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'nianLing') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.nian_ling }}</span>
            </div>
            <div class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'xingGe') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.xing_ge }}</span>
            </div>
            <div v-if="聊天仓库.jiaoSeXinXi.zhi_ye" class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'zhiYe') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.zhi_ye }}</span>
            </div>
            <div v-if="聊天仓库.jiaoSeXinXi.cheng_shi" class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'chengShi') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.cheng_shi }}</span>
            </div>
            <div v-if="聊天仓库.jiaoSeXinXi.mbti_lei_xing" class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'mbti') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.mbti_lei_xing }}</span>
            </div>
            <div class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'yanYuFengGe') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.yan_yu_feng_ge }}</span>
            </div>
            <div class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'beiJingGuShi') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.bei_jing_gu_shi }}</span>
            </div>
            <div v-if="聊天仓库.jiaoSeXinXi.xi_hao && 聊天仓库.jiaoSeXinXi.xi_hao.length" class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'xiHao') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.xi_hao.join('、') }}</span>
            </div>
            <div v-if="聊天仓库.jiaoSeXinXi.biao_qian && 聊天仓库.jiaoSeXinXi.biao_qian.length" class="renshe-xiang">
              <span class="renshe-biaoqian">{{ huoQuFanYi('guanLiJianKong', 'biaoQian') }}:</span>
              <span class="renshe-zhi">{{ 聊天仓库.jiaoSeXinXi.biao_qian.join('、') }}</span>
            </div>
          </div>
          <div v-else class="fenqu-kong">{{ huoQuFanYi('guanLiJianKong', 'kongZhuangTai') }}</div>
        </div>
      </section>

      <section class="jiankong-fenqu jiankong-lunci">
        <h3 class="fenqu-biaoti" @click="切换分区('lunCi')">
          {{ huoQuFanYi('guanLiJianKong', 'lunCiBiaoTi') }}
          <span class="fenqu-zheDie" :class="{ 'shou-qi': 分区折叠.lunCi }">{{ 分区折叠.lunCi ? '▶' : '▼' }}</span>
        </h3>
        <div v-if="!分区折叠.lunCi" class="fenqu-neirong">
          <div v-if="轮次卡片列表.length" class="lunci-liebiao">
            <article v-for="卡片 in 轮次卡片列表" :key="'lc-' + 卡片.轮次" class="lunci-kapian">
              <header class="lunci-biaoti">
                <span class="lunci-ming">{{ huoQuFanYi('guanLiJianKong', 'lunCiBiaoTi') }}{{ 卡片.轮次 }}</span>
                <span class="lunci-shijian">{{ 格式化时间(卡片.开始时间) }}</span>
              </header>
              <div v-if="卡片.思考.length" class="lunci-kuai">
                <p class="lunci-xiao-biaoti">{{ huoQuFanYi('guanLiJianKong', 'shenDuSiKao') }}</p>
                <div v-for="(项, 索引) in 卡片.思考" :key="'sk-' + 索引" class="shendusikao-xiang">
                  <span class="yincang-biaoqian">{{ 项.来源 }}</span>
                  <div class="shendusikao-neirong">{{ 项.内容 }}</div>
                </div>
              </div>
              <div v-if="卡片.构建.length" class="lunci-kuai">
                <p class="lunci-xiao-biaoti">{{ huoQuFanYi('guanLiJianKong', 'gouJianSiLu') }}</p>
                <ul class="shijian-xian">
                  <li v-for="(项, 索引) in 卡片.构建" :key="'gj-' + 索引" class="shijian-xian-xiang">
                    <span class="shijian-xian-dian" />
                    <div class="shijian-xian-zhuti">
                      <div class="shijian-xian-jieduan">{{ 项.阶段 }}</div>
                      <div class="shijian-xian-shuoming">{{ 项.说明 }}</div>
                    </div>
                  </li>
                </ul>
              </div>
              <div v-if="卡片.回复.length" class="lunci-kuai">
                <p class="lunci-xiao-biaoti">{{ huoQuFanYi('guanLiJianKong', 'huiFuNeiRong') }}</p>
                <p v-for="(条, 索引) in 卡片.回复" :key="'hf-' + 索引" class="lunci-huifu">{{ 条 }}</p>
              </div>
              <div v-if="卡片.评分.length" class="lunci-kuai">
                <p class="lunci-xiao-biaoti">{{ huoQuFanYi('guanLiJianKong', 'haoGanDuBianHua') }}</p>
                <div v-for="(项, 索引) in 卡片.评分" :key="'pf-' + 索引" class="haogandu-xiang">
                  <div class="haogandu-bianhua">
                    <span
                      v-for="维度 in 变化数组(项.变化)"
                      :key="'wd-' + 维度.维度键"
                      class="haogandu-shuzhi"
                      :class="维度.维度值 >= 0 ? 'zheng-xiang' : 'fu-xiang'"
                    >
                      {{ 维度.维度键 }}{{ 维度.维度值 >= 0 ? '+' : '' }}{{ 维度.维度值 }}
                    </span>
                  </div>
                </div>
                <p v-for="(项, 索引) in 卡片.理由" :key="'ly-' + 索引" class="lunci-liyou">
                  {{ huoQuFanYi('guanLiJianKong', 'pingFenLiYou') }}：{{ 项.内容 }}
                </p>
              </div>
              <div v-if="卡片.隐藏.length" class="lunci-kuai">
                <p class="lunci-xiao-biaoti">{{ huoQuFanYi('guanLiJianKong', 'yinCangXinXi') }}</p>
                <div v-for="(项, 索引) in 卡片.隐藏" :key="'yc-' + 索引" class="yincang-xiang">
                  <span class="yincang-biaoqian">{{ 项.类型 }}</span>
                  <span class="yincang-neirong">{{ 项.内容 }}</span>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="fenqu-kong">{{ huoQuFanYi('guanLiJianKong', 'zanWuLunCi') }}</div>
        </div>
      </section>

    </div>
    <div
      v-if="!最小化状态"
      class="jiankong-shouBing jiankong-shouBing-you"
      @pointerdown="开始缩放($event, 'you')"
    />
    <div
      v-if="!最小化状态"
      class="jiankong-shouBing jiankong-shouBing-xia"
      @pointerdown="开始缩放($event, 'xia')"
    />
    <div
      v-if="!最小化状态"
      class="jiankong-shouBing jiankong-shouBing-youXia"
      @pointerdown="开始缩放($event, 'youXia')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onBeforeUnmount } from 'vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { huoQuFanYi } from '@/config/translations'

const emit = defineEmits<{ close: [] }>()

const 聊天仓库 = 使用聊天仓库()

const 最小化状态 = ref(false)
const 排序方式 = ref<'jiang' | 'sheng'>('jiang')

const 分区折叠 = reactive({
  renShe: false,
  lunCi: false,
})

const 偏好存储键 = 'guanli-jiankong:pian-hao'
const 浮窗最小宽 = 280
const 浮窗最小高 = 200
const 浮窗默认宽 = 420
const 浮窗停靠边距 = 24
const 浮窗宽 = ref<number | null>(null)
const 浮窗高 = ref<number | null>(null)
function 钳制尺寸(宽: number, 高: number): { 宽: number; 高: number } {
  const 视宽 = typeof window === 'undefined' ? 1024 : window.innerWidth
  const 视高 = typeof window === 'undefined' ? 768 : window.innerHeight
  return {
    宽: 限制(宽, 浮窗最小宽, Math.max(浮窗最小宽, 视宽 - 浮窗停靠边距 * 2)),
    高: 限制(高, 浮窗最小高, Math.max(浮窗最小高, 视高 - 浮窗停靠边距 * 2)),
  }
}
try {
  const 原文 = localStorage.getItem(偏好存储键)
  if (原文) {
    const 偏好 = JSON.parse(原文) as { 最小化?: boolean; 排序?: 'jiang' | 'sheng'; 宽?: number; 高?: number }
    if (typeof 偏好.最小化 === 'boolean') 最小化状态.value = 偏好.最小化
    if (偏好.排序 === 'sheng' || 偏好.排序 === 'jiang') 排序方式.value = 偏好.排序
    if (typeof 偏好.宽 === 'number' && typeof 偏好.高 === 'number') {
      const 已钳制 = 钳制尺寸(偏好.宽, 偏好.高)
      浮窗宽.value = 已钳制.宽
      浮窗高.value = 已钳制.高
    }
  }
} catch {
  // 无历史偏好时用默认展开+降序
}

function 持久化偏好() {
  try {
    localStorage.setItem(
      偏好存储键,
      JSON.stringify({ 最小化: 最小化状态.value, 排序: 排序方式.value, 宽: 浮窗宽.value, 高: 浮窗高.value }),
    )
  } catch {
    // 偏好写失败不影响监控本身
  }
}

function 切换最小化() {
  最小化状态.value = !最小化状态.value
  持久化偏好()
}

function 切换排序() {
  排序方式.value = 排序方式.value === 'jiang' ? 'sheng' : 'jiang'
  持久化偏好()
}

function 切换分区(分区: keyof typeof 分区折叠) {
  分区折叠[分区] = !分区折叠[分区]
}

interface 思考项 { 来源: string; 内容: string; 时间: number; 轮次?: number }
interface 构建项 { 阶段: string; 说明: string; 内容?: string; 时间: number; 轮次?: number }
interface 评分项 { 变化: Record<string, number>; 时间: number; 轮次?: number }
interface 隐藏项 { 类型: string; 内容: string; 时间: number; 轮次?: number }

const 深度思考合并 = computed<思考项[]>(() => [...聊天仓库.shenDuSiKaoLieBiao])

interface 轮次卡片 {
  轮次: number
  开始时间: number
  思考: 思考项[]
  构建: 构建项[]
  回复: string[]
  评分: 评分项[]
  理由: 隐藏项[]
  隐藏: 隐藏项[]
}

const 好感度理由类型 = '好感度评判理由'
const 输出回复阶段 = '输出回复'
const 未分组轮次号 = 0

const 轮次卡片列表 = computed<轮次卡片[]>(() => {
  const 卡片表 = new Map<number, 轮次卡片>()
  function 取卡片(轮次: number, 时间: number): 轮次卡片 {
    let 卡片 = 卡片表.get(轮次)
    if (!卡片) {
      卡片 = { 轮次, 开始时间: 时间, 思考: [], 构建: [], 回复: [], 评分: [], 理由: [], 隐藏: [] }
      卡片表.set(轮次, 卡片)
    }
    if (时间 < 卡片.开始时间) 卡片.开始时间 = 时间
    return 卡片
  }
  const 未分组思考: 思考项[] = []
  const 未分组构建: 构建项[] = []
  const 未分组回复: string[] = []
  const 未分组回复时间: number[] = []
  const 未分组评分: 评分项[] = []
  const 未分组理由: 隐藏项[] = []
  const 未分组隐藏: 隐藏项[] = []
  for (const 项 of 深度思考合并.value) {
    if (typeof 项.轮次 !== 'number') {
      未分组思考.push(项)
      continue
    }
    取卡片(项.轮次, 项.时间).思考.push(项)
  }
  for (const 项 of 聊天仓库.gouJianGuoChengLieBiao) {
    if (typeof 项.轮次 !== 'number') {
      if (项.阶段 === 输出回复阶段 && 项.内容) {
        未分组回复.push(项.内容)
        未分组回复时间.push(项.时间)
      } else 未分组构建.push(项)
      continue
    }
    const 卡片 = 取卡片(项.轮次, 项.时间)
    if (项.阶段 === 输出回复阶段 && 项.内容) 卡片.回复.push(项.内容)
    else 卡片.构建.push(项)
  }
  for (const 项 of 聊天仓库.haoGanDuBianHuaLieBiao) {
    if (typeof 项.轮次 !== 'number') {
      未分组评分.push(项)
      continue
    }
    取卡片(项.轮次, 项.时间).评分.push(项)
  }
  for (const 项 of 聊天仓库.yinCangXinXiLieBiao) {
    if (typeof 项.轮次 !== 'number') {
      if (项.类型 === 好感度理由类型) 未分组理由.push(项)
      else 未分组隐藏.push(项)
      continue
    }
    const 卡片 = 取卡片(项.轮次, 项.时间)
    if (项.类型 === 好感度理由类型) 卡片.理由.push(项)
    else 卡片.隐藏.push(项)
  }
  const 列表 = [...卡片表.values()]
  if (未分组思考.length || 未分组构建.length || 未分组回复.length || 未分组评分.length || 未分组理由.length || 未分组隐藏.length) {
    const 全部时间 = [
      ...未分组思考.map((项) => 项.时间),
      ...未分组构建.map((项) => 项.时间),
      ...未分组回复时间,
      ...未分组评分.map((项) => 项.时间),
      ...未分组理由.map((项) => 项.时间),
      ...未分组隐藏.map((项) => 项.时间),
    ]
    列表.push({
      轮次: 未分组轮次号,
      开始时间: Math.min(...全部时间),
      思考: 未分组思考,
      构建: 未分组构建,
      回复: 未分组回复,
      评分: 未分组评分,
      理由: 未分组理由,
      隐藏: 未分组隐藏,
    })
  }
  列表.sort((甲, 乙) => (排序方式.value === 'jiang' ? 乙.开始时间 - 甲.开始时间 : 甲.开始时间 - 乙.开始时间))
  return 列表
})

const 事件总数 = computed(
  () =>
    深度思考合并.value.length +
    聊天仓库.gouJianGuoChengLieBiao.length +
    聊天仓库.haoGanDuBianHuaLieBiao.length +
    聊天仓库.yinCangXinXiLieBiao.length,
)

function 变化数组(变化: Record<string, number>): { 维度键: string; 维度值: number }[] {
  return Object.entries(变化).map(([维度键, 维度值]) => ({ 维度键, 维度值 }))
}

const 浮窗 = ref<HTMLElement | null>(null)
// 拖动位移（相对默认停靠位置的 translate 值）
const 拖动位移 = ref({ x: 0, y: 0 })

let 已按下 = false
let 正在拖动 = false
let 起始X = 0
let 起始Y = 0
let 起始位移X = 0
let 起始位移Y = 0
let 框宽 = 0
let 框高 = 0
// 点击与拖动的位移阈值：阈值内松开视为点击（按钮正常响应），超出才进入拖动
const 拖动阈值像素 = 5

function 限制(值: number, 最小: number, 最大: number): number {
  return Math.min(最大, Math.max(最小, 值))
}

const 位移样式 = computed(() => {
  const 样式: Record<string, string> = {
    transform: `translate(${拖动位移.value.x}px, ${拖动位移.value.y}px)`,
  }
  if (!最小化状态.value) {
    if (浮窗宽.value !== null) 样式.width = `${浮窗宽.value}px`
    if (浮窗高.value !== null) 样式.height = `${浮窗高.value}px`
  }
  return 样式
})

function 开始拖动(e: PointerEvent) {
  // 标题栏内任何按钮都不触发拖动（最小化/排序/关闭点击直达）
  if ((e.target as HTMLElement).closest('button')) return
  const 元素 = 浮窗.value
  if (!元素) return
  已按下 = true
  正在拖动 = false
  起始X = e.clientX
  起始Y = e.clientY
  起始位移X = 拖动位移.value.x
  起始位移Y = 拖动位移.value.y
  const 矩形 = 元素.getBoundingClientRect()
  框宽 = 矩形.width
  框高 = 矩形.height
  window.addEventListener('pointermove', 处理拖动)
  window.addEventListener('pointerup', 结束拖动)
  window.addEventListener('pointercancel', 结束拖动)
}

function 处理拖动(e: PointerEvent) {
  if (!已按下) return
  const 偏移X = e.clientX - 起始X
  const 偏移Y = e.clientY - 起始Y
  if (!正在拖动) {
    if (Math.hypot(偏移X, 偏移Y) < 拖动阈值像素) return
    正在拖动 = true
    const 元素 = 浮窗.value
    if (元素) {
      try {
        元素.setPointerCapture(e.pointerId)
      } catch {
        // 捕获失败仍可拖动
      }
      元素.classList.add('jiankong-tuodong')
    }
  }
  const 新X = 起始位移X + 偏移X
  const 新Y = 起始位移Y + 偏移Y
  const 视宽 = window.innerWidth
  const 视高 = window.innerHeight
  // 默认停靠在右下角（距视口右/下各 24px），限制浮窗完整停留在视口内
  const 最小X = 框宽 + 24 - 视宽
  const 最大X = 24
  const 最小Y = 框高 + 24 - 视高
  const 最大Y = 24
  拖动位移.value = {
    x: 限制(新X, 最小X, 最大X),
    y: 限制(新Y, 最小Y, 最大Y),
  }
}

function 结束拖动(e: PointerEvent) {
  if (!已按下) return
  已按下 = false
  const 元素 = 浮窗.value
  if (正在拖动) {
    正在拖动 = false
    if (元素) {
      try {
        if (元素.hasPointerCapture(e.pointerId)) 元素.releasePointerCapture(e.pointerId)
      } catch {
        // 忽略释放异常
      }
      元素.classList.remove('jiankong-tuodong')
    }
  }
  window.removeEventListener('pointermove', 处理拖动)
  window.removeEventListener('pointerup', 结束拖动)
  window.removeEventListener('pointercancel', 结束拖动)
}

let 正在缩放 = false
let 缩放方向: 'you' | 'xia' | 'youXia' = 'youXia'
let 缩放起始X = 0
let 缩放起始Y = 0
let 缩放起始宽 = 0
let 缩放起始高 = 0

function 开始缩放(e: PointerEvent, 方向: 'you' | 'xia' | 'youXia') {
  if (最小化状态.value) return
  e.stopPropagation()
  e.preventDefault()
  const 元素 = 浮窗.value
  if (!元素) return
  const 矩形 = 元素.getBoundingClientRect()
  缩放起始宽 = 浮窗宽.value ?? (矩形.width >= 浮窗最小宽 ? 矩形.width : 浮窗默认宽)
  缩放起始高 =
    浮窗高.value ?? (矩形.height >= 浮窗最小高 ? 矩形.height : Math.round(window.innerHeight * 0.55))
  正在缩放 = true
  缩放方向 = 方向
  缩放起始X = e.clientX
  缩放起始Y = e.clientY
  try {
    元素.setPointerCapture(e.pointerId)
  } catch {
    // 捕获失败仍可缩放
  }
  元素.classList.add('jiankong-suoFang')
  window.addEventListener('pointermove', 处理缩放)
  window.addEventListener('pointerup', 结束缩放)
  window.addEventListener('pointercancel', 结束缩放)
}

function 处理缩放(e: PointerEvent) {
  if (!正在缩放) return
  const 增宽 = 缩放方向 === 'you' || 缩放方向 === 'youXia' ? e.clientX - 缩放起始X : 0
  const 增高 = 缩放方向 === 'xia' || 缩放方向 === 'youXia' ? e.clientY - 缩放起始Y : 0
  const 已钳制 = 钳制尺寸(缩放起始宽 + 增宽, 缩放起始高 + 增高)
  浮窗宽.value = 已钳制.宽
  浮窗高.value = 已钳制.高
}

function 结束缩放(e: PointerEvent) {
  if (!正在缩放) return
  正在缩放 = false
  const 元素 = 浮窗.value
  if (元素) {
    try {
      if (元素.hasPointerCapture(e.pointerId)) 元素.releasePointerCapture(e.pointerId)
    } catch {
      // 忽略释放异常
    }
    元素.classList.remove('jiankong-suoFang')
  }
  window.removeEventListener('pointermove', 处理缩放)
  window.removeEventListener('pointerup', 结束缩放)
  window.removeEventListener('pointercancel', 结束缩放)
  持久化偏好()
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', 处理拖动)
  window.removeEventListener('pointerup', 结束拖动)
  window.removeEventListener('pointercancel', 结束拖动)
  window.removeEventListener('pointermove', 处理缩放)
  window.removeEventListener('pointerup', 结束缩放)
  window.removeEventListener('pointercancel', 结束缩放)
})

function 关闭() {
  emit('close')
}

function 格式化时间(时间: number): string {
  const 日期 = new Date(时间)
  const 补 = (n: number) => String(n).padStart(2, '0')
  return `${补(日期.getHours())}:${补(日期.getMinutes())}:${补(日期.getSeconds())}`
}
</script>

<style scoped>
.guanli-jiankong-fuchuang {
  /* 浮窗尺寸与停靠位置均提为 CSS 变量，禁止散落魔法数字 */
  --jiankong-kuan: 420px;
  --jiankong-gao: 55vh;
  --jiankong-ju-xiabian: 24px;
  --jiankong-ju-youbian: 24px;
  --jiankong-z-index: 1100;

  position: fixed;
  right: var(--jiankong-ju-youbian);
  bottom: var(--jiankong-ju-xiabian);
  width: var(--jiankong-kuan);
  height: var(--jiankong-gao);
  z-index: var(--jiankong-z-index);
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #0c1322 0%, #0a0f1c 100%);
  transition: height 0.3s ease;
  border: 1px solid rgba(99, 179, 237, 0.25);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(99, 179, 237, 0.08),
    0 18px 60px rgba(0, 0, 0, 0.55),
    0 0 36px rgba(99, 179, 237, 0.14);
  overflow: hidden;
  will-change: transform;
}

.guanli-jiankong-fuchuang:not(.zui-xiao-hua) {
  resize: both;
  min-width: 280px;
  min-height: 200px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 48px);
}

/* 最小化：缩成右下角一条 slim 长条，只留标题+计数+展开/关闭 */
.guanli-jiankong-fuchuang.zui-xiao-hua {
  width: auto;
  min-width: 250px;
  max-width: min(78vw, 360px);
  height: auto;
}

.zui-xiao-hua .jiankong-biaoti-lan {
  padding: 8px 10px 8px 12px;
  border-bottom: none;
}

.zui-xiao-hua .jiankong-biaoti {
  font-size: 13px;
}

.zui-xiao-hua .jiankong-zuiXiao,
.zui-xiao-hua .jiankong-guanbi,
.zui-xiao-hua .jiankong-paixu {
  padding: 4px 10px;
  font-size: 12px;
}

.jiankong-caoZuo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.jiankong-paixu {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #cdd7e6;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.jiankong-paixu:hover {
  background: rgba(99, 179, 237, 0.18);
  border-color: rgba(99, 179, 237, 0.4);
}

.jiankong-zuiXiao {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #cdd7e6;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.jiankong-zuiXiao:hover {
  background: rgba(99, 179, 237, 0.18);
  border-color: rgba(99, 179, 237, 0.4);
}

.jiankong-biaoti-lan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(99, 179, 237, 0.18);
  background: rgba(99, 179, 237, 0.06);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.jiankong-tuodong {
  cursor: grabbing;
}

.jiankong-suoFang {
  transition: none;
}

.jiankong-shouBing {
  position: absolute;
  z-index: 2;
  touch-action: none;
}

.jiankong-shouBing-you {
  top: 0;
  right: 0;
  width: 10px;
  height: 100%;
  cursor: ew-resize;
}

.jiankong-shouBing-xia {
  left: 0;
  bottom: 0;
  width: 100%;
  height: 10px;
  cursor: ns-resize;
}

.jiankong-shouBing-youXia {
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
}

.jiankong-biaoti {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #d6e6ff;
  white-space: nowrap;
  min-width: 0;
}

.jiankong-jishu {
  font-size: 11px;
  font-weight: 700;
  color: #0a0f1c;
  background: #63b3ed;
  border-radius: 999px;
  padding: 1px 8px;
}

.jiankong-dian {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px #4ade80;
  animation: jiankong-mao 1.4s ease-in-out infinite;
}

@keyframes jiankong-mao {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.jiankong-guanbi {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #cdd7e6;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.jiankong-guanbi:hover {
  background: rgba(255, 107, 107, 0.18);
  border-color: rgba(255, 107, 107, 0.4);
}

.jiankong-wangge {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(99, 179, 237, 0.18);
  overflow-y: auto;
  min-height: 0;
}

.jiankong-fenqu {
  display: flex;
  flex-direction: column;
  background: #0a0f1c;
}

.fenqu-biaoti {
  margin: 0;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #8fb6e8;
  border-bottom: 1px solid rgba(99, 179, 237, 0.14);
  background: rgba(99, 179, 237, 0.05);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fenqu-zheDie {
  font-size: 10px;
  color: #5b6b82;
  transition: transform 0.2s ease;
}

.fenqu-zheDie.shou-qi {
  transform: rotate(-90deg);
}

.fenqu-neirong {
  flex: 1;
  overflow: visible;
  padding: 12px 16px;
  min-height: 0;
}

.fenqu-kong {
  color: #5b6b82;
  font-size: 13px;
  text-align: center;
  padding-top: 32px;
}

.renshe-xinxi {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.renshe-xiang {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(99, 179, 237, 0.08);
}

.renshe-biaoqian {
  color: #8fb6e8;
  font-size: 12px;
  font-weight: 600;
  min-width: 80px;
}

.renshe-zhi {
  color: #cdd7e6;
  font-size: 12px;
  flex: 1;
  line-height: 1.5;
}

/* 按回复轮次聚合卡片：一轮回复的思考/构建/回复/评分/隐藏收拢在一处 */
.lunci-liebiao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lunci-kapian {
  border: 1px solid rgba(99, 179, 237, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(99, 179, 237, 0.04);
}

.lunci-biaoti {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.lunci-ming {
  font-size: 13px;
  font-weight: 700;
  color: #e3eeff;
}

.lunci-shijian {
  font-size: 11px;
  color: #5b6b82;
}

.lunci-kuai {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(99, 179, 237, 0.15);
}

.lunci-xiao-biaoti {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: #8fb6e8;
}

.lunci-huifu {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #d6e6ff;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

.lunci-liyou {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #9fb0c6;
}

.shendusikao-xiang {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(167, 139, 250, 0.08);
  border: 1px solid rgba(167, 139, 250, 0.2);
}

.shendusikao-neirong {
  color: #d6c6ff;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 6px;
}

.shijian-xian {
  list-style: none;
  margin: 0;
  padding: 0 0 0 12px;
  border-left: 1px solid rgba(99, 179, 237, 0.2);
}

.shijian-xian-xiang {
  position: relative;
  padding: 0 0 14px 16px;
}

.shijian-xian-dian {
  position: absolute;
  left: -18px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #63b3ed;
  box-shadow: 0 0 8px rgba(99, 179, 237, 0.8);
}

.shijian-xian-jieduan {
  color: #e3eeff;
  font-size: 13px;
  font-weight: 600;
}

.shijian-xian-shuoming {
  color: #9fb0c6;
  font-size: 12px;
  margin-top: 2px;
  line-height: 1.5;
}

.haogandu-xiang {
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(99, 179, 237, 0.12);
}

.haogandu-bianhua {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.haogandu-shuzhi {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.zheng-xiang {
  color: #ff9a6c;
  background: rgba(255, 138, 76, 0.12);
}

.fu-xiang {
  color: #6ab0f0;
  background: rgba(106, 176, 240, 0.12);
}

.yincang-xiang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 138, 76, 0.18);
}

.yincang-biaoqian {
  font-size: 11px;
  font-weight: 600;
  color: #ffb38a;
  background: rgba(255, 138, 76, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
}

.yincang-neirong {
  color: #cdd7e6;
  font-size: 13px;
  flex: 1;
}
</style>
