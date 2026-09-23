<template>
  <div class="wenjian-qipao" :class="shiBenRen ? 'wenjian-qipao--benren' : 'wenjian-qipao--duifang'">
    <span class="wenjian-tubiao" aria-hidden="true">
      <svg
        v-if="tuBiaoLeiXing === 'pdf'"
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
    <a
      class="wenjian-xiazai"
      :href="xiaZaiDiZhi || undefined"
      :download="xiaZaiMing || undefined"
      :aria-label="huoQuFanYi('duoMeiTi', 'xiaZaiWenJian')"
      :title="huoQuFanYi('duoMeiTi', 'xiaZaiWenJian')"
      @click.stop
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

/**
 * 文件气泡（FP-12b）：AI 聊天页与好友页共用的唯一文件卡片实现。
 * 结构（图标 / 文件名 / 大小 / 下载链）、扩展名→图标映射与文件名截断都只住在本组件；
 * 页面只解析「显示名、大小文本、下载地址」三样数据后传入，不得再内联第二份 .wenjian-* 卡片。
 * 气泡主题色按 FP-03 跟随 --qipao-*（本人/对方两档），与文本气泡同一真源。
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
  { kuoZhan: ['pdf'], leiXing: 'pdf' },
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
.wenjian-qipao {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: var(--yuanjiao-xiao);
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
}

.wenjian-tubiao svg {
  width: 34px;
  height: 34px;
}

.wenjian-xinxi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.wenjian-ming {
  font-size: 14px;
  word-break: break-all;
  line-height: 1.3;
}

.wenjian-daxiao {
  font-size: 12px;
  opacity: 0.7;
}

.wenjian-xiazai {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-left: 0.5px solid currentColor;
  padding-left: 8px;
  margin-left: 2px;
  color: inherit;
  opacity: 0.75;
}

.wenjian-xiazai:hover {
  opacity: 1;
}

.wenjian-xiazai svg {
  width: 20px;
  height: 20px;
}
</style>
