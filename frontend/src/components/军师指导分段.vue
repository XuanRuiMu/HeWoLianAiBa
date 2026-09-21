<template>
  <div v-if="youFenDuan && fenDuan" class="junshi-fenduan">
    <section class="junshi-duan junshi-duan-zhidian" data-duan="xiaYiBuZenMeHui">
      <h4 class="duan-biaoti">{{ huoQuFanYi('junShi', 'xiaYiBuZenMeHui') }}</h4>
      <p class="duan-neirong zhidian-neirong">{{ fenDuan.xiaYiBuZenMeHui }}</p>
      <div class="duan-caozuo">
        <button
          v-if="fenDuan.xiaYiBuZenMeHui"
          class="fuzhi-anniu"
          type="button"
          @click="fuZhiZheJuHua"
        >
          {{ huoQuFanYi('junShi', 'fuZhiZheJuHua') }}
        </button>
        <span v-if="fuZhiTiShi" class="fuzhi-tishi" role="status">{{ fuZhiTiShi }}</span>
      </div>
    </section>
    <section
      v-for="duan in ciYaoDuan"
      :key="duan.ziDuan"
      class="junshi-duan junshi-duan-canyao"
      :data-duan="duan.ziDuan"
    >
      <h4 class="duan-biaoti">{{ huoQuFanYi('junShi', duan.fanYiJian) }}</h4>
      <p class="duan-neirong">{{ duan.neiRong }}</p>
    </section>
  </div>
  <p v-else class="jieguo-neirong">{{ zhengDuan }}</p>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import type { FanYiZiJian } from '@/config/translations'
import type { JunShiZhiDaoFenDuan } from '@/types'

const props = defineProps<{
  fenDuan: JunShiZhiDaoFenDuan | null
  zhengDuan: string
}>()

const FU_ZHI_TI_SHI_HAO_MIAO = 2000

type JunShiCiYaoJian = FanYiZiJian<'junShi'>

const CI_YAO_DUAN: Array<{ ziDuan: keyof JunShiZhiDaoFenDuan; fanYiJian: JunShiCiYaoJian }> = [
  { ziDuan: 'dangQianJuMian', fanYiJian: 'dangQianJuMian' },
  { ziDuan: 'weiShenMeZheMeLiao', fanYiJian: 'weiShenMeZheMeLiao' },
  { ziDuan: 'guLi', fanYiJian: 'guLi' },
]

const ciYaoDuan = computed(() =>
  CI_YAO_DUAN.map((duan) => ({
    ziDuan: duan.ziDuan,
    fanYiJian: duan.fanYiJian,
    neiRong: (props.fenDuan?.[duan.ziDuan] || '').trim(),
  })).filter((duan) => duan.neiRong.length > 0),
)

const youFenDuan = computed(
  () =>
    !!props.fenDuan &&
    ((props.fenDuan.xiaYiBuZenMeHui || '').trim().length > 0 || ciYaoDuan.value.length > 0),
)

const fuZhiTiShi = ref('')
let fuZhiJiShiQi: ReturnType<typeof setTimeout> | null = null

function xianShiTiShi(tiShi: string) {
  fuZhiTiShi.value = tiShi
  if (fuZhiJiShiQi) clearTimeout(fuZhiJiShiQi)
  fuZhiJiShiQi = setTimeout(() => {
    fuZhiTiShi.value = ''
  }, FU_ZHI_TI_SHI_HAO_MIAO)
}

async function keFuZhi(wenBen: string): Promise<boolean> {
  try {
    const daoHang = globalThis.navigator as Navigator & {
      clipboard?: { writeText: (wenBen: string) => Promise<void> }
    }
    if (daoHang?.clipboard?.writeText) {
      await daoHang.clipboard.writeText(wenBen)
      return true
    }
    if (typeof document !== 'undefined') {
      const wenBenYu = document.createElement('textarea')
      wenBenYu.value = wenBen
      wenBenYu.style.position = 'fixed'
      wenBenYu.style.opacity = '0'
      document.body.appendChild(wenBenYu)
      wenBenYu.select()
      const jieGuo =
        typeof document.execCommand === 'function' ? document.execCommand('copy') : false
      document.body.removeChild(wenBenYu)
      return !!jieGuo
    }
    return false
  } catch {
    return false
  }
}

async function fuZhiZheJuHua() {
  const huaShu = (props.fenDuan?.xiaYiBuZenMeHui || '').trim()
  if (!huaShu) return
  const chengGong = await keFuZhi(huaShu)
  xianShiTiShi(
    chengGong ? huoQuFanYi('junShi', 'yiFuZhi') : huoQuFanYi('junShi', 'fuZhiShiBai'),
  )
}

onUnmounted(() => {
  if (fuZhiJiShiQi) clearTimeout(fuZhiJiShiQi)
})
</script>

<style scoped>
.junshi-fenduan {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.junshi-duan {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.junshi-duan-zhidian {
  padding: 12px;
  background: var(--beijing-kaopian);
  border: 1px solid var(--junshi-zhuse);
  border-radius: 12px;
}

.duan-biaoti {
  font-size: 12px;
  font-weight: 700;
  color: var(--junshi-zhuse);
  margin: 0;
}

.duan-neirong {
  font-size: 13px;
  color: var(--wenben-ciuse);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.zhidian-neirong {
  font-size: 16px;
  font-weight: 600;
  color: var(--wenben-zhuse);
  line-height: 1.6;
}

.duan-caozuo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.fuzhi-anniu {
  padding: 6px 12px;
  background: var(--junshi-zhuse);
  color: #ffffff;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.fuzhi-anniu:hover {
  opacity: 0.9;
}

.fuzhi-tishi {
  font-size: 12px;
  color: var(--junshi-jinggao-wenben);
}

.jieguo-neirong {
  font-size: 14px;
  color: var(--wenben-zhuse);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
