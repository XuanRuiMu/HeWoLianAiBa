<template>
  <div class="liao-tian-yu-lan">
    <p class="yu-lan-biao-ti">{{ biaoTi }}</p>
    <LiaoTianMianBan class="yu-lan-xiao-xi-qu" :aria-label="biaoTi">
      <template v-for="zu in xiaoXiFenZu" :key="'zu-' + zu.shiJianChuo">
        <ShiJianTiao :shi-jian="zu.shiJian" :shi-jian-chuo="zu.shiJianChuo" />
        <XiaoXiHang
          v-for="(yuLan, suoYin) in zu.xiaoXiLieBiao"
          :key="'yu-lan-' + suoYin"
          :shi-ben-ren="yuLan.shiBenRen"
          :tou-xiang="yuLan.touXiang"
          :shen-fen="yuLan.shenFen"
        >
          <template v-if="!yuLan.shiBenRen" #tou-xiang-jiao>
            <button
              type="button"
              class="yu-lan-huan-tou-xiang"
              :aria-label="huanTouXiangWenAn"
              :title="huanTouXiangWenAn"
              :disabled="shangChuanZhong"
              @click="daKaiTouXiangXuanZe"
            >
              <span aria-hidden="true">＋</span>
            </button>
          </template>
          <QiPaoRongQi :shi-ben-ren="yuLan.shiBenRen">{{ yuLan.neiRong }}</QiPaoRongQi>
        </XiaoXiHang>
      </template>
      <input
        ref="touXiangShuRu"
        class="yu-lan-wen-jian-shu-ru"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        :aria-label="huanTouXiangWenAn"
        @change="chuLiTouXiangXuanZe"
      />
    </LiaoTianMianBan>
    <p v-if="tiShiWenBen" class="yu-lan-ti-shi" :class="{ 'yu-lan-ti-shi--cuo-wu': tiShiCuoWu }" role="status">
      {{ tiShiWenBen }}
    </p>
    <p v-if="dangQianMing" class="yu-lan-dang-qian">{{ dangQianTi }}：{{ dangQianMing }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'
import { tiQuCuoWuWenBen } from '@/utils/前台错误'
import { fenZuXiaoXiAnShiJian } from '@/utils/消息时间分组'
import LiaoTianMianBan from '@/components/聊天/聊天面板.vue'
import XiaoXiHang from '@/components/聊天/消息行.vue'
import QiPaoRongQi from '@/components/聊天/气泡容器.vue'
import ShiJianTiao from '@/components/聊天/时间条.vue'

interface YuLanXiaoXi {
  shi_jian_chuo: number
  shiBenRen: boolean
  neiRong: string
  touXiang: string | null
  shenFen: 'jiaose' | 'yonghu'
}

const props = defineProps<{
  biaoTi: string
  dangQianMing?: string
  dangQianTi?: string
}>()

const YU_LAN_LAI_XI_JIAN_GE = 3 * 60 * 1000
const YU_LAN_HUI_FU_JIAN_GE = 1 * 60 * 1000

const sheZhi = 使用用户设置仓库()
const laiWen = huoQuFanYi('sheZhi', 'yuLanQiPaoLai')
const quWen = huoQuFanYi('sheZhi', 'yuLanQiPaoQu')
const dangQianTi = props.dangQianTi || huoQuFanYi('sheZhi', 'dangQianBeiJing')
const huanTouXiangWenAn = huoQuFanYi('sheZhi', 'huanDuiXiangTouXiang')
const shangChuanZhongWenBen = huoQuFanYi('sheZhi', 'shangChuanZhongWenAn')

const yuLanXiaoXiLieBiao = computed<YuLanXiaoXi[]>(() => {
  const xianZai = Date.now()
  return [
    {
      shi_jian_chuo: xianZai - YU_LAN_LAI_XI_JIAN_GE,
      shiBenRen: false,
      neiRong: laiWen,
      touXiang: sheZhi.duiXiangTouXiang,
      shenFen: 'jiaose',
    },
    {
      shi_jian_chuo: xianZai - YU_LAN_HUI_FU_JIAN_GE,
      shiBenRen: true,
      neiRong: quWen,
      touXiang: sheZhi.touXiang,
      shenFen: 'yonghu',
    },
  ]
})

const xiaoXiFenZu = computed(() => fenZuXiaoXiAnShiJian<YuLanXiaoXi>(yuLanXiaoXiLieBiao.value))

const touXiangShuRu = ref<HTMLInputElement | null>(null)
const shangChuanZhong = ref(false)
const tiShiWenBen = ref('')
const tiShiCuoWu = ref(false)

function quCuoWuWenBen(cuoWu: unknown): string {
  return tiQuCuoWuWenBen(cuoWu, huoQuFanYi('sheZhi', 'duiXiangTouXiangShangChuanShiBai'))
}

function daKaiTouXiangXuanZe(): void {
  if (shangChuanZhong.value) return
  touXiangShuRu.value?.click()
}

async function chuLiTouXiangXuanZe(shiJian: Event): Promise<void> {
  const yuanSu = shiJian.target as HTMLInputElement | null
  const wenJian = yuanSu?.files?.[0]
  if (yuanSu) yuanSu.value = ''
  if (!wenJian) return
  shangChuanZhong.value = true
  tiShiCuoWu.value = false
  tiShiWenBen.value = shangChuanZhongWenBen
  try {
    await sheZhi.shangChuanDuiXiangTouXiang(wenJian)
    tiShiCuoWu.value = false
    tiShiWenBen.value = huoQuFanYi('sheZhi', 'duiXiangTouXiangGengXin')
  } catch (cuoWu: unknown) {
    tiShiCuoWu.value = true
    tiShiWenBen.value = quCuoWuWenBen(cuoWu)
  } finally {
    shangChuanZhong.value = false
  }
}
</script>

<style scoped>
.liao-tian-yu-lan {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-xiao);
  margin-top: var(--jiange-4);
  min-width: 0;
}

.yu-lan-biao-ti {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

.yu-lan-xiao-xi-qu {
  position: relative;
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-da);
  overflow: hidden;
  min-height: 220px;
}

.yu-lan-huan-tou-xiang {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--biankuang-yanse);
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.yu-lan-huan-tou-xiang:disabled {
  opacity: 0.6;
  cursor: progress;
}

.yu-lan-wen-jian-shu-ru {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.yu-lan-ti-shi {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}

.yu-lan-ti-shi--cuo-wu {
  color: var(--cuowu-wenben);
}

.yu-lan-dang-qian {
  margin: 0;
  font-size: var(--ziti-xiao);
  color: var(--wenben-tishi);
}
</style>
