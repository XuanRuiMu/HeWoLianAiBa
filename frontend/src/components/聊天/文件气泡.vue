<template>
  <a
    class="wenjian-qipao"
    :class="shiBenRen ? 'wenjian-qipao--benren' : 'wenjian-qipao--duifang'"
    :href="xiaZaiDiZhi || undefined"
    :download="xiaZaiMing || undefined"
    :aria-label="huoQuFanYi('duoMeiTi', 'xiaZaiWenJian')"
    :title="huoQuFanYi('duoMeiTi', 'xiaZaiWenJian')"
  >
    <span
      class="wenjian-tubiao"
      :class="`wenjian-tubiao--${tuBiaoLeiXing}`"
      aria-hidden="true"
    >
      <svg
        v-if="tuBiaoLeiXing === 'word'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text x="12" y="17" text-anchor="middle" font-size="6" stroke="none" fill="currentColor">
          W
        </text>
      </svg>
      <svg
        v-else-if="tuBiaoLeiXing === 'excel'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text x="12" y="17" text-anchor="middle" font-size="6" stroke="none" fill="currentColor">
          X
        </text>
      </svg>
      <svg
        v-else-if="tuBiaoLeiXing === 'ppt'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text x="12" y="17" text-anchor="middle" font-size="6" stroke="none" fill="currentColor">
          P
        </text>
      </svg>
      <svg
        v-else-if="tuBiaoLeiXing === 'pdf'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text x="12" y="17" text-anchor="middle" font-size="6" stroke="none" fill="currentColor">
          PDF
        </text>
      </svg>
      <svg
        v-else-if="tuBiaoLeiXing === 'txt'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <text x="12" y="17" text-anchor="middle" font-size="5" stroke="none" fill="currentColor">
          TXT
        </text>
      </svg>
      <svg
        v-else-if="tuBiaoLeiXing === 'yasuo'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 8v13H3V8" />
        <path d="M1 3h22v5H1z" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
      <svg
        v-else-if="tuBiaoLeiXing === 'yinshipin'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
    </span>
    <span class="wenjian-xinxi">
      <span class="wenjian-ming">{{ xianShiMing }}</span>
      <span v-if="daXiao" class="wenjian-daxiao">{{ daXiao }}</span>
    </span>
    <span class="wenjian-xiazai" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </span>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

/**
 * 文件气泡（FP-12b / FP-K4b 需求 #18/#20）：AI 聊天页与好友页共用的唯一文件卡片实现。
 * 对齐腾讯 chat-uikit-vue message-file.vue 与 QQ/微信文件卡片风格：
 * ① 整卡可点下载（根元素即 <a href download>，不再只有右侧箭头可点）；
 * ② min-width 保证卡片在窄消息列中不塌缩；
 * ③ 文件类型图标细分 word/excel/ppt/pdf/txt（+归档/音视频/兜底）。
 * 必改三处（对齐语音条移植口径）：摘除腾讯引擎消息模型耦合（本组件零外部 IM 依赖）；
 * 配色吃 --qipao-* 主题变量（本人/对方两档）；禁止硬编码色值/像素（几何吃 --wenjian-* 令牌）。
 * 结构（图标 / 文件名 / 大小 / 下载箭头）、扩展名→图标映射与文件名截断都只住在本组件；
 * 页面只解析「显示名、大小文本、下载地址」三样数据后传入，不得再内联第二份 .wenjian-* 卡片。
 */
const props = defineProps<{
  /** 原始文件名（未截断）；缺名时由调用方传各自页面的占位文案 */
  mingCheng: string
  /** 已格式化的大小文本（空串 ⇒ 不渲染大小行） */
  daXiao?: string | null
  /** 下载地址（签名 URL）；空 ⇒ href 缺省 */
  xiaZaiDiZhi?: string | null
  /** download 属性用的原始文件名；空 ⇒ 不带 download */
  xiaZaiMing?: string | null
  /** 是否本人发出（气泡主题：--qipao-ziJi-* / --qipao-duiFang-*） */
  shiBenRen: boolean
}>()

const WEN_JIAN_KUO_ZHAN_TU_BIAO: Array<{ kuoZhan: string[]; leiXing: string }> = [
  { kuoZhan: ['doc', 'docx'], leiXing: 'word' },
  { kuoZhan: ['xls', 'xlsx', 'csv'], leiXing: 'excel' },
  { kuoZhan: ['ppt', 'pptx'], leiXing: 'ppt' },
  { kuoZhan: ['pdf'], leiXing: 'pdf' },
  { kuoZhan: ['txt', 'md', 'markdown', 'json', 'html', 'htm'], leiXing: 'txt' },
  { kuoZhan: ['zip', 'rar', '7z'], leiXing: 'yasuo' },
  { kuoZhan: ['mp4', 'mov'], leiXing: 'yinshipin' },
]

function huoQuKuoZhanMing(mingZi: string): string {
  if (!mingZi) return ''
  const dian = mingZi.lastIndexOf('.')
  return dian === -1 ? '' : mingZi.slice(dian + 1).toLowerCase()
}

const tuBiaoLeiXing = computed(() => {
  const kuoZhan = huoQuKuoZhanMing(props.mingCheng)
  for (const tiaoMu of WEN_JIAN_KUO_ZHAN_TU_BIAO) {
    if (tiaoMu.kuoZhan.includes(kuoZhan)) return tiaoMu.leiXing
  }
  return 'qita'
})

const xianShiMing = computed(() => {
  const xian = DUO_MEI_TI_PEI_ZHI.wenJianMingZuiDaXianShiZiFu
  if (props.mingCheng.length <= xian) return props.mingCheng
  return `${props.mingCheng.slice(0, xian)}...`
})
</script>

<style scoped>
/* 整卡可点：根元素即下载链（对齐 message-file.vue 的 @click="download" 整卡热区） */
.wenjian-qipao {
  display: flex;
  align-items: center;
  gap: var(--jiange-10);
  padding: var(--jiange-12);
  border-radius: var(--yuanjiao-xiao);
  min-width: var(--wenjian-ka-zui-xiao-kuan);
  max-width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.wenjian-qipao--benren {
  background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing));
  color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben));
}

.wenjian-qipao--duifang {
  background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing));
  color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben));
}

.wenjian-tubiao {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--wenjian-tubiao-chicun);
  height: var(--wenjian-tubiao-chicun);
  color: inherit;
}

.wenjian-tubiao svg {
  width: 100%;
  height: 100%;
}

/* 文件类型身份色（深浅恒等，非主题色） */
.wenjian-tubiao--word {
  color: var(--wenjian-se-word);
}

.wenjian-tubiao--excel {
  color: var(--wenjian-se-excel);
}

.wenjian-tubiao--ppt {
  color: var(--wenjian-se-ppt);
}

.wenjian-tubiao--pdf {
  color: var(--wenjian-se-pdf);
}

.wenjian-tubiao--txt {
  color: var(--wenjian-se-txt);
}

.wenjian-tubiao--yasuo {
  color: var(--wenjian-se-yasuo);
}

.wenjian-tubiao--yinshipin {
  color: var(--wenjian-se-yinshipin);
}

.wenjian-xinxi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-4);
  min-width: 0;
  flex: 1;
}

.wenjian-ming {
  font-size: var(--ziti-zhong);
  word-break: break-all;
  line-height: 1.3;
}

.wenjian-daxiao {
  font-size: var(--ziti-xiao);
  opacity: 0.7;
}

/* 下载箭头为装饰性视觉提示，热区由整卡承担 */
.wenjian-xiazai {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--wenjian-xiazai-he-chicun);
  height: var(--wenjian-xiazai-he-chicun);
  border-left: var(--wenjian-fengexi-kuan) solid currentColor;
  padding-left: var(--jiange-xiao);
  margin-left: var(--jiange-2);
  color: inherit;
  opacity: 0.75;
}

.wenjian-qipao:hover .wenjian-xiazai {
  opacity: 1;
}

.wenjian-xiazai svg {
  width: var(--wenjian-xiazai-glyph-chicun);
  height: var(--wenjian-xiazai-glyph-chicun);
}
</style>
