<template>
  <div
    ref="浮窗"
    class="guanli-jiankong-fuchuang"
    :class="{ 'zui-xiao-hua': 最小化, 'jiankong-tuodong': 拖动中 }"
    :style="浮窗样式"
    role="dialog"
    :aria-label="huoQuFanYi('guanLiJianKong', 'biaoTi')"
  >
    <header class="jiankong-biaoti-lan" @pointerdown="开始拖动">
      <div class="jiankong-biaoti">
        <span class="jiankong-dian" />
        {{ huoQuFanYi('guanLiJianKong', 'biaoTi') }}
        <span v-if="事件总数 > 0" class="jiankong-jishu">{{ 事件总数 }}</span>
      </div>
      <div class="jiankong-caoZuo">
        <button
          v-if="!最小化"
          class="jiankong-paixu"
          type="button"
          :title="huoQuFanYi('guanLiJianKong', 'paiXuFangShi')"
          @pointerdown.stop
          @click.stop="切换排序"
        >
          {{ 排序方式 === 'jiang' ? huoQuFanYi('guanLiJianKong', 'shiJianJiangXu') : huoQuFanYi('guanLiJianKong', 'shiJianShengXu') }}
        </button>
        <button class="jiankong-zuiXiao" type="button" @pointerdown.stop @click.stop="切换最小化">
          {{ 最小化 ? huoQuFanYi('guanLiJianKong', 'zhanKai') : huoQuFanYi('guanLiJianKong', 'zuiXiaoHua') }}
        </button>
        <button class="jiankong-guanbi" type="button" @pointerdown.stop @click.stop="关闭">
          {{ huoQuFanYi('guanLiJianKong', 'guanBi') }}
        </button>
      </div>
    </header>

    <div class="jiankong-wangge" :style="内容区样式">
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
              <span class="renshe-zhi">{{ 人设性别文案 }}</span>
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
      v-if="!最小化"
      class="jiankong-shouBing jiankong-shouBing-you"
      @pointerdown="开始缩放($event, 'you')"
    />
    <div
      v-if="!最小化"
      class="jiankong-shouBing jiankong-shouBing-xia"
      @pointerdown="开始缩放($event, 'xia')"
    />
    <div
      v-if="!最小化"
      class="jiankong-shouBing jiankong-shouBing-youXia"
      @pointerdown="开始缩放($event, 'youXia')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { use可拖动浮窗 } from '@/composables/use可拖动浮窗'
import { huoQuFanYi } from '@/config/translations'
import { guiYiXingBie } from '@/utils/输入验证'

const emit = defineEmits<{ close: [] }>()

const 聊天仓库 = 使用聊天仓库()

const 排序方式 = ref<'jiang' | 'sheng'>('jiang')

const 分区折叠 = reactive({
  renShe: false,
  lunCi: false,
})

const 人设性别文案 = computed(() => {
  const 内部形态 = guiYiXingBie(聊天仓库.jiaoSeXinXi?.xing_bie)
  if (内部形态 === 'nan') return huoQuFanYi('guanLiJianKong', 'nanXing')
  if (内部形态 === 'nv') return huoQuFanYi('guanLiJianKong', 'nvXing')
  return huoQuFanYi('guanLiJianKong', 'weiZhiXingBie')
})

const 浮窗 = ref<HTMLElement | null>(null)
const 浮窗标题栏高 = 56
const { 最小化, 拖动中, 浮窗样式, 内容区样式, 开始拖动, 开始缩放, 切换最小化 } = use可拖动浮窗({
  元素: 浮窗,
  存储键: 'guanli-jiankong:fu-chuang',
  默认宽: 420,
  默认高占比: 0.55,
  标题栏高: 浮窗标题栏高,
})

const 偏好存储键 = 'guanli-jiankong:pian-hao'
try {
  const 原文 = localStorage.getItem(偏好存储键)
  if (原文) {
    const 偏好 = JSON.parse(原文) as { 排序?: 'jiang' | 'sheng'; 宽?: unknown; 高?: unknown; 最小化?: unknown }
    if (偏好.排序 === 'sheng' || 偏好.排序 === 'jiang') 排序方式.value = 偏好.排序
    // 旧版把 宽/高/最小化 混存在本键里，尺寸与最小化已归 use可拖动浮窗 的独立键，这里一次性抹掉残留
    if ('宽' in 偏好 || '高' in 偏好 || '最小化' in 偏好) {
      localStorage.setItem(偏好存储键, JSON.stringify({ 排序: 排序方式.value }))
    }
  }
} catch {
  // 无历史偏好时用默认降序
}

function 切换排序() {
  排序方式.value = 排序方式.value === 'jiang' ? 'sheng' : 'jiang'
  try {
    localStorage.setItem(偏好存储键, JSON.stringify({ 排序: 排序方式.value }))
  } catch {
    // 偏好写失败不影响监控本身
  }
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
  /* 宽高、位移与停靠边距一律由 use可拖动浮窗 以 px 下发；此处只留层级与主题令牌，禁止写死色值与尺寸 */
  --jiankong-z-index: var(--ceng-tiaoshi-mianban);

  /* 星夜琉璃 · Starlit Glass：色值全部走 --liuli-* 令牌（variables.css 明暗两套均有定义）。
     浮窗为可拖动元素，架构约束禁用背景模糊滤镜（拖动时全屏重绘卡顿），
     玻璃感由较高不透明度底色 + 棱线高光 + 玫瑰金强调共同表达。 */
  --jiankong-beijing: var(--liuli-fuchuang-beijing);
  --jiankong-biankuang: var(--liuli-fuchuang-biankuang);
  --jiankong-yinying: var(--liuli-fuchuang-yinying);
  --jiankong-wenben: var(--wenben-zhuse);
  --jiankong-ciwenben: var(--wenben-ciuse);
  --jiankong-tishi: var(--wenben-tishi);
  --jiankong-qiangtiao: var(--liuli-qiangdiao);
  --jiankong-jishu-di: var(--liuli-jishu-di);
  --jiankong-jishu-wenben: var(--liuli-jishu-wenben);
  --jiankong-neirong-beijing: var(--liuli-neirong-beijing);
  --jiankong-kuai-beijing: var(--liuli-kuai-beijing);
  --jiankong-kuai-biankuang: var(--liuli-kuai-biankuang);
  --jiankong-anniu-beijing: var(--liuli-anniu-beijing);
  --jiankong-anniu-biankuang: var(--liuli-anniu-biankuang);
  --jiankong-anniu-wenben: var(--liuli-anniu-wenben);
  --jiankong-anniu-hover: var(--liuli-anniu-hover);
  --jiankong-lengxian: var(--liuli-lengxian);

  position: fixed;
  right: var(--fu-chuang-ting-kao-bian-jv);
  bottom: var(--fu-chuang-ting-kao-bian-jv);
  z-index: var(--jiankong-z-index);
  display: flex;
  flex-direction: column;
  background: var(--jiankong-beijing);
  transition: height 0.3s var(--quxian-biao-zhun);
  border-radius: 18px;
  box-shadow:
    inset 0 0 0 1px var(--jiankong-biankuang),
    var(--jiankong-yinying);
  overflow: hidden;
  touch-action: none;
  will-change: transform;
}

/* 顶部棱线高光（宝石切面感），随卡片宽度伸缩 */
.guanli-jiankong-fuchuang::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: var(--jiankong-lengxian);
  pointer-events: none;
}

.jiankong-biaoti-lan {
  flex: none;
  height: var(--fu-chuang-biaoti-lan-gao);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px;
  border-bottom: 1px solid var(--jiankong-biankuang);
  background: var(--jiankong-kuai-beijing);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.jiankong-tuodong {
  cursor: grabbing;
}

.jiankong-caoZuo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.jiankong-paixu,
.jiankong-zuiXiao,
.jiankong-guanbi {
  border: 1px solid var(--jiankong-anniu-biankuang);
  background: var(--jiankong-anniu-beijing);
  color: var(--jiankong-anniu-wenben);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.jiankong-guanbi {
  padding: 6px 16px;
}

.jiankong-paixu:hover,
.jiankong-zuiXiao:hover {
  background: var(--jiankong-anniu-hover);
}

.jiankong-guanbi:hover {
  background: var(--cuowu-touming-beijing);
  border-color: var(--cuowu-touming-biankuang);
}

.jiankong-wangge {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--jiankong-biankuang);
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* 最小化只裁外层：内容区保持展开高布局，滚动位置不被 clientHeight 变化夹走 */
.zui-xiao-hua .jiankong-wangge {
  visibility: hidden;
}

.zui-xiao-hua .jiankong-biaoti-lan {
  border-bottom: none;
}

.jiankong-shouBing {
  position: absolute;
  touch-action: none;
}

/* 右缘手柄自标题栏下沿起算，不压标题栏按钮命中区；尺寸通道只有这一个，CSS resize 已移除 */
.jiankong-shouBing-you {
  top: var(--fu-chuang-biaoti-lan-gao);
  right: 0;
  width: 10px;
  height: calc(100% - var(--fu-chuang-biaoti-lan-gao));
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
  color: var(--jiankong-wenben);
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
}

.jiankong-jishu {
  font-size: 11px;
  font-weight: 700;
  color: var(--jiankong-jishu-wenben);
  background: var(--jiankong-jishu-di);
  border-radius: 999px;
  padding: 1px 8px;
  flex: none;
}

.jiankong-dian {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--chenggong-yanse);
  box-shadow: 0 0 10px var(--chenggong-yanse);
  animation: jiankong-mao 1.4s ease-in-out infinite;
  flex: none;
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

.jiankong-fenqu {
  display: flex;
  flex-direction: column;
  background: var(--jiankong-neirong-beijing);
}

.fenqu-biaoti {
  margin: 0;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--jiankong-qiangtiao);
  border-bottom: 1px solid var(--jiankong-kuai-biankuang);
  background: var(--jiankong-kuai-beijing);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.fenqu-zheDie {
  font-size: 10px;
  color: var(--jiankong-tishi);
  transition: transform 0.2s ease;
  flex: none;
}

.fenqu-zheDie.shou-qi {
  transform: rotate(-90deg);
}

.fenqu-neirong {
  padding: 12px 16px;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.fenqu-kong {
  color: var(--jiankong-tishi);
  font-size: 13px;
  text-align: center;
  padding-top: 32px;
}

.renshe-xinxi {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.renshe-xiang {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--jiankong-kuai-biankuang);
  min-width: 0;
}

.renshe-biaoqian {
  color: var(--jiankong-ciwenben);
  font-size: 12px;
  font-weight: 600;
  min-width: 80px;
  flex: none;
}

.renshe-zhi {
  color: var(--wenben-zhuse);
  font-size: 12px;
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* 按回复轮次聚合卡片：一轮回复的思考/构建/回复/评分/隐藏收拢在一处 */
.lunci-liebiao {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.lunci-kapian {
  border: 1px solid var(--jiankong-kuai-biankuang);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--jiankong-kuai-beijing);
  min-width: 0;
}

.lunci-biaoti {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  min-width: 0;
}

.lunci-ming {
  font-size: 13px;
  font-weight: 700;
  color: var(--wenben-zhuse);
}

.lunci-shijian {
  font-size: 11px;
  color: var(--jiankong-tishi);
  flex: none;
}

.lunci-kuai {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--jiankong-kuai-biankuang);
  min-width: 0;
}

.lunci-xiao-biaoti {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--jiankong-ciwenben);
}

.lunci-huifu {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--wenben-zhuse);
  background: var(--jiankong-kuai-beijing);
  border-radius: 8px;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.lunci-liyou {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--jiankong-ciwenben);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.shendusikao-xiang {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--silu-beijing);
  border: 1px solid var(--silu-biankuang);
  min-width: 0;
}

.shendusikao-neirong {
  color: var(--silu-wenben);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  margin-top: 6px;
}

.shijian-xian {
  list-style: none;
  margin: 0;
  padding: 0 0 0 12px;
  border-left: 1px solid var(--jiankong-kuai-biankuang);
  min-width: 0;
}

.shijian-xian-xiang {
  position: relative;
  padding: 0 0 14px 16px;
  min-width: 0;
}

.shijian-xian-dian {
  position: absolute;
  left: -18px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--jiankong-qiangtiao);
  box-shadow: 0 0 8px var(--nuanhui-lan-touming-yinying);
}

.shijian-xian-zhuti {
  min-width: 0;
}

.shijian-xian-jieduan {
  color: var(--wenben-zhuse);
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.shijian-xian-shuoming {
  color: var(--jiankong-ciwenben);
  font-size: 12px;
  margin-top: 2px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.haogandu-xiang {
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--jiankong-kuai-beijing);
  border: 1px solid var(--jiankong-kuai-biankuang);
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
  color: var(--gandu-zheng-se);
  background: var(--biao-qian-chenggong-beijing);
}

.fu-xiang {
  color: var(--gandu-fu-se);
  background: var(--biao-qian-shibai-beijing);
}

.yincang-xiang {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--biao-qian-jinggao-beijing);
  border: 1px solid var(--jiankong-kuai-biankuang);
  min-width: 0;
}

.yincang-biaoqian {
  font-size: 11px;
  font-weight: 600;
  color: var(--biao-qian-jinggao-wenben);
  padding: 2px 8px;
  border-radius: 6px;
  flex: none;
}

.yincang-neirong {
  color: var(--wenben-zhuse);
  font-size: 13px;
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

</style>
