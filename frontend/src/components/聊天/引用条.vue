<template>
  <div class="yinyong-tiao" role="status">
    <span class="yinyong-tiao-biaoti">{{ huoQuFanYi('liaoTian', 'yinYong') }}</span>
    <span class="yinyong-tiao-zhaiyao">
      <template v-if="faSongZheMing">{{ faSongZheMing }}: </template>{{ zhaiYao }}
    </span>
    <button
      type="button"
      class="yinyong-tiao-guanbi"
      :aria-label="huoQuFanYi('liaoTian', 'quXiaoYinYong')"
      @click="emit('guanBi')"
    >
      <svg
        class="yinyong-tiao-guanbi-tu"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M2.5 2.5l7 7" />
        <path d="M9.5 2.5l-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { huoQuFanYi } from '@/config/translations'

defineProps<{
  zhaiYao: string
  faSongZheMing?: string
}>()

const emit = defineEmits<{ guanBi: [] }>()
</script>

<style scoped>
/* FP-09（需求 #5 表现层）发送前引用条。数值真源 = .agents/evidence/references/FP-13-引用条-20260921.md
   §1.1（条本体 padding/border-radius/font-size/line-height、单行省略的 min-width:0 + flex:0 1 auto、
   关闭钮图标 11×11 + padding 5）与 §4（引用条在编辑器上方、标题与取消钮分列两端）。
   本仓取值一律经 styles/variables.css 的共用 :root 令牌，颜色一律吃既有令牌。 */
.yinyong-tiao {
  box-sizing: border-box;
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: var(--yinyong-guanbi-neidian);
  min-width: 0;
  max-width: 100%;
  padding: var(--yinyong-kuang-neidian);
  border-radius: var(--yinyong-kuang-yuanjiao);
  background: var(--beijing-qianse);
  font-size: var(--yinyong-kuang-zihao);
  line-height: var(--yinyong-tiao-hangao);
}

.yinyong-tiao-biaoti {
  flex-shrink: 0;
  color: var(--zhuse);
  font-weight: 600;
}

/* 摘要最多两行溢出省略（用户裁决：引用条与气泡内引用块一律彩两行） */
.yinyong-tiao-zhaiyao {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--yinyong-hang-shu);
  max-height: var(--yinyong-tiao-zuida-gao-du);
  word-break: break-all;
  color: var(--wen-zi-ci-se);
}

.yinyong-tiao-guanbi {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--yinyong-guanbi-neidian);
  border: none;
  background: transparent;
  color: var(--wenben-tishi);
  cursor: pointer;
}

/* 可见盒维持 11×11 图标 + 5px 内边距（取证 §1.1 命中约 21×21 偏小，§4 明令本项目放大命中区不改外观）：
   与输入区图标同法用 ::before 以 --shuru-anniu-re-ku 外扩，不撑大可见盒 */
.yinyong-tiao-guanbi::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--shuru-anniu-re-ku);
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}

/* 字形两轴同吃一枚令牌 ⇒ 方形 viewBox 下不可能非等比缩放 */
.yinyong-tiao-guanbi-tu {
  width: var(--yinyong-guanbi-chicun);
  height: var(--yinyong-guanbi-chicun);
}
</style>
