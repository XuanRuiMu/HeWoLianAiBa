








































































































































































































































































































































            :disabled="反馈列表加载中"
            data-testid="guanli-fankui-gengduo"
            @click="jiaZaiFanKuiLieBiao(false)"
          >
            {{ 反馈列表加载中 ? huoQuFanYi('yiJianFanKui', 'guanLiJiaZaiZhong') : huoQuFanYi('yiJianFanKui', 'guanLiJiaZaiGengDuo') }}
          </button>
        </div>
      </section>

    </div>
    <template v-if="!最小化">
      <div
        v-for="方向 in 缩放方向清单"
        :key="方向"
        class="jiankong-shouBing"
        :class="`jiankong-shouBing-${方向}`"
        @pointerdown="开始缩放($event, 方向)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { use可拖动浮窗, 缩放方向清单 } from '@/composables/use可拖动浮窗'
import { huoQuFanYi, type FanYiZiJian } from '@/config/翻译表'
import { guiYiXingBie } from '@/utils/输入验证'
import {
  gengXinFanKuiZhuangTai,
  huoQuFanKuiGuanLiLieBiao,
  huoQuFanKuiTongJi,
} from '@/api/意见反馈'
import type {
  FanKuiGuanLiXiang,
  FanKuiLeiBie,
  FanKuiTongJi,
  FanKuiZhuangTai,
} from '@/types/类型定义'
import FanKuiZhuangTaiHuiZhang from '@/components/意见反馈/反馈状态徽章.vue'

const emit = defineEmits<{ close: [] }>()

const 聊天仓库 = 使用聊天仓库()

const 排序方式 = ref<'jiang' | 'sheng'>('jiang')

const 分区折叠 = reactive({
  renShe: false,
  lunCi: false,
  fanKui: true,
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
    if ('宽' in 偏好 || '高' in 偏好 || '最小化' in 偏好) {
      localStorage.setItem(偏好存储键, JSON.stringify({ 排序: 排序方式.value }))
    }
  }
