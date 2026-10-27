<template>
  <section class="bei-jing-she-zhi" :aria-labelledby="biaoTiBiaoShi">
    <div class="bei-jing-she-zhi-tou">
      <div class="bei-jing-she-zhi-wen">
        <h2 :id="biaoTiBiaoShi" class="kapian-biao-ti">{{ biaoTi }}</h2>
      </div>
      <span class="bei-jing-ji-shu">{{ yiYongWenAn }}</span>
    </div>

    <div v-for="模式 in 模式列表" :key="模式.键" class="bei-jing-mo-shi">
      <div class="bei-jing-mo-shi-tou">
        <h3 class="bei-jing-mo-shi-ti">{{ 模式.标题 }}</h3>
        <button
          type="button"
          class="bei-jing-ci-yao"
          :disabled="同步中 !== '' || 上传中"
          @click="同步背景(模式.键)"
        >
          {{ 同步中 === 模式.键 ? 同步中文案 : 模式.同步文案 }}
        </button>
      </div>

      <div class="bei-jing-wang-ge" role="group" :aria-label="模式.标题">
        <div
          v-for="项 in 预设项(模式.键)"
          :key="键(模式.键, 项)"
          class="bei-jing-ka"
          :class="[
            'bei-jing-ka--' + 项.jian,
            { 'bei-jing-ka--xuan': 是否当前(模式.键, 项) },
          ]"
          :style="背景项样式(模式.键, 项)"
        >
          <button
            type="button"
            class="bei-jing-ka-xuan"
            :aria-pressed="是否当前(模式.键, 项)"
            :aria-label="显示名(模式.键, 项)"
            @click="选择背景(模式.键, 项)"
          >
            <span class="bei-jing-ka-ming" :title="显示名(模式.键, 项)" @dblclick.stop="开始编辑(模式.键, 项)">
              {{ 显示名(模式.键, 项) }}
            </span>
            <span v-if="是否当前(模式.键, 项)" class="bei-jing-ka-dang-qian">{{ dangQianWenAn }}</span>
          </button>
          <button
            type="button"
            class="bei-jing-ka-kong-zhi"
            :aria-label="bianJiMingChengWenAn + '：' + 项.mingCheng"
            @click.stop="开始编辑(模式.键, 项)"
          >
            <svg
              class="bei-jing-ka-kong-zhi-tu-biao"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        </div>
        <VueDraggable
          class="bei-jing-tuo-qu"
          :model-value="设置仓库.waiGuan.beiJing"
          :disabled="上传中 || 删除中 || 同步中 !== '' || 编辑保存中"
          :direction="tuoZhuaiFangXiang"
            :animation="TUO_ZHUAI_HAO_MIAO"
          :delay="300"
          :delay-on-touch-only="true"
          :filter="'.bei-jing-ka-kong-zhi'"
          :prevent-on-filter="false"
          ghost-class="sortable-ghost"
          chosen-class="sortable-chosen"
          drag-class="sortable-drag"
          fallback-class="sortable-drag"
          :force-fallback="true"
          :fallback-on-body="true"
          @update:model-value="tuoZhuaiGengXinBeiJing"
        >
          <div
            v-for="项 in 自定义项(模式.键)"
            :key="键(模式.键, 项)"
            class="bei-jing-ka bei-jing-ka--tu"
            :class="{ 'bei-jing-ka--xuan': 是否当前(模式.键, 项) }"
            :style="背景项样式(模式.键, 项)"
            :data-id="项.jian"
          >
            <button
              type="button"
              class="bei-jing-ka-xuan"
              :aria-pressed="是否当前(模式.键, 项)"
              :aria-label="显示名(模式.键, 项)"
              @click="选择背景(模式.键, 项)"
            >
              <span class="bei-jing-ka-ming" :title="显示名(模式.键, 项)" @dblclick.stop="开始编辑(模式.键, 项)">
                {{ 显示名(模式.键, 项) }}
              </span>
              <span v-if="是否当前(模式.键, 项)" class="bei-jing-ka-dang-qian">{{ dangQianWenAn }}</span>
            </button>
            <button
              type="button"
              class="bei-jing-ka-kong-zhi"
              :aria-label="bianJiMingChengWenAn + '：' + 项.mingCheng"
              @click.stop="开始编辑(模式.键, 项)"
            >
              <svg
                class="bei-jing-ka-kong-zhi-tu-biao"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
            <button
              type="button"
              class="bei-jing-ka-kong-zhi bei-jing-ka-kong-zhi--shan-chu"
              :aria-label="shanChuBeiJingWenAn + '：' + 项.mingCheng"
              :disabled="删除中"
              @click.stop="请求删除(项)"
            >
              <svg
                class="bei-jing-ka-kong-zhi-tu-biao"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </VueDraggable>
        <button
          type="button"
          class="bei-jing-ka bei-jing-ka--shang-chuan"
          :disabled="上传中"
          @click="打开上传说明(模式.键)"
        >
          <span class="bei-jing-ka-jia" aria-hidden="true">＋</span>
          <span class="bei-jing-ka-shang-chuan-wen">{{ 上传中 ? shangChuanZhongWenAn : shangChuanWenAn }}</span>
        </button>
      </div>

      <div v-if="编辑模式 === 模式.键" class="bei-jing-bian-ji-wei">
        <WaiGuanJiuDiBianJi
          :biao-ti="bianJiBiaoTi"
          :ming-cheng="编辑项?.mingCheng || ''"
          :wen-zi-yan-se="编辑初始颜色"
          :zui-da-zi-fu="mingChengZuiDaZiFu"
          lei-bie="beiJing"
          :cuo-wu-wen-an="编辑错误"
          :cao-zuo-zhong="编辑保存中"
          @tijiao="保存编辑"
          @huan-yuan="还原编辑"
          @qu-xiao="结束编辑"
          @yu-lan="更新预览"
        />
      </div>
    </div>

    <p v-if="提示" class="bei-jing-ti-shi" :class="{ 'bei-jing-ti-shi--cuo-wu': 提示失败 }" role="status">
      {{ 提示 }}
    </p>

    <input
      ref="文件输入"
      class="bei-jing-wen-jian-shu-ru"
      type="file"
      :accept="tuPianMime"
      :aria-label="shangChuanWenAn"
      @change="处理文件选择"
    />

    <ShangChuanShuoMing
      :xian-shi="显示上传说明"
      lei-bie="beiJing"
      @que-ren="确认上传说明"
      @qu-xiao="显示上传说明 = false"
    />

    <QueRenDuiHuaKuang
      :xian-shi="显示删除确认"
      :biao-ti="shanChuBiaoTi"
      :miao-shu="删除说明"
      :que-ren-wen-an="删除中 ? shanChuZhongWenAn : shanChuBeiJingWenAn"
      :qu-xiao-wen-an="quXiaoWenAn"
      :cao-zuo-zhong="删除中"
      @que-ren="确认删除"
      @qu-xiao="取消删除"
    />

    <Teleport to="body">
      <TuPianCaiJian
        v-if="caiJianXianShi"
        :tu-yuan="caiJianTuYuan"
        :yuan-mime="caiJianYuanMIME"
        :biao-ti="huoQuFanYi('sheZhi', 'caiJianBeiJing')"
        :ti-shi="huoQuFanYi('sheZhi', 'tuPianCaiJianTiShi')"
        :kuan-gao-bi="0.75"
        :wen-jian-ming="'beijing'"
        yu-lan-lei-xing="beiJing"
        @que-ren="queRenCaiJian"
        @qu-xiao="guanBiCaiJian"
      />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { huoQuFanYi } from '@/config/翻译表'
import { jianShaoDongXiaoGuo } from '@/utils/动效偏好'
import {
  WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU,
  WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU,
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_TU_PIAN_MIME,
  guiYiWaiGuanChuCan,
  huoQuBeiJingMengCengZhi,
  huoQuBeiJingYuSheDingYi,
  huoQuLaShenChiCunZhi,
  zhongPaiWaiGuanTiaoMu,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import { baoCunWaiGuan } from '@/api/社交'
import { 使用用户设置仓库, type BeiJingXiangMu } from '@/stores/用户设置'
import { tiQuCuoWuWenBen } from '@/utils/前台错误'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'
import ShangChuanShuoMing from '@/components/上传说明层.vue'
import QueRenDuiHuaKuang from '@/components/确认对话框.vue'

const TuPianCaiJian = defineAsyncComponent(() => import('@/components/图片裁剪.vue'))

const TUO_ZHUAI_HAO_MIAO = jianShaoDongXiaoGuo() ? 0 : 200
function tuoZhuaiFangXiang(_shiJian: unknown, muBiao: unknown, tuoDongXiang: unknown): 'vertical' | 'horizontal' {
  const a = tuoDongXiang instanceof Element ? tuoDongXiang.getBoundingClientRect() : null
  const b = muBiao instanceof Element ? muBiao.getBoundingClientRect() : null
  if (!a || !b) return 'vertical'
  return Math.abs(b.top - a.top) <= Math.abs(b.left - a.left) ? 'horizontal' : 'vertical'
}

const 设置仓库 = 使用用户设置仓库()

const biaoTiBiaoShi = 'bei-jing-she-zhi-biao-ti'
const biaoTi = huoQuFanYi('sheZhi', 'liaoTianBeiJing')
const bianJiBiaoTi = huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')
const bianJiMingChengWenAn = huoQuFanYi('sheZhi', 'waiGuanBianJiMingCheng')
const shanChuBeiJingWenAn = huoQuFanYi('sheZhi', 'waiGuanShanChuBeiJing')
const shanChuBiaoTi = huoQuFanYi('sheZhi', 'shanChuZiDingYiBeiJing')
const dangQianWenAn = huoQuFanYi('sheZhi', 'waiGuanDangQian')
const shangChuanWenAn = huoQuFanYi('sheZhi', 'ziDingYiShangChuan')
const shangChuanZhongWenAn = huoQuFanYi('sheZhi', 'shangChuanZhongWenAn')
const 同步中文案 = huoQuFanYi('sheZhi', 'tongBuZhongWenAn')
const shanChuZhongWenAn = huoQuFanYi('sheZhi', 'shanChuZhongWenAn')
const quXiaoWenAn = huoQuFanYi('sheZhi', 'waiGuanQuXiao')
const 保存成功文案 = huoQuFanYi('sheZhi', 'waiGuanShangChuanChengGong')
const 还原成功文案 = huoQuFanYi('sheZhi', 'waiGuanYiHuiFuMoRen')
const 删除成功文案 = huoQuFanYi('sheZhi', 'beiJingYiShanChu')
const 同步成功文案 = huoQuFanYi('sheZhi', 'beiJingYiTongBu')
const 失败文案 = huoQuFanYi('sheZhi', 'waiGuanBaoCunShiBai')
const tuPianMime = WAI_GUAN_TU_PIAN_MIME.join(',')
const mingChengZuiDaZiFu = WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU
const yiYongWenAn = computed(() =>
  huoQuFanYi('sheZhi', 'beiJingYiYongJiShu')
    .replace('{n}', String(设置仓库.waiGuan.beiJing.length))
    .replace('{zuiDa}', String(WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU)),
)

const 模式列表 = [
  {
    键: 'qian' as const,
    标题: huoQuFanYi('sheZhi', 'qianSeMoShiBeiJing'),
    同步文案: huoQuFanYi('sheZhi', 'tongBuDaoShenSeMoShi'),
  },
  {
    键: 'shen' as const,
    标题: huoQuFanYi('sheZhi', 'shenSeMoShiBeiJing'),
    同步文案: huoQuFanYi('sheZhi', 'tongBuDaoQianSeMoShi'),
  },
]

const 编辑模式 = ref<'qian' | 'shen' | null>(null)
const 编辑项 = ref<BeiJingXiangMu | null>(null)
const 编辑错误 = ref('')
const 编辑保存中 = ref(false)
const 预览值 = ref<{ mingCheng: string; wenZiYanSe: string } | null>(null)
const 上传中 = ref(false)
const 同步中 = ref<'' | 'qian' | 'shen'>('')
const 显示上传说明 = ref(false)
const 上传模式 = ref<'qian' | 'shen'>('qian')
const caiJianXianShi = ref(false)
const caiJianTuYuan = ref('')
const caiJianYuanMIME = ref('image/png')
const caiJianQianWenJian = ref<File | null>(null)
const 显示删除确认 = ref(false)
const 删除中 = ref(false)
const 待删除 = ref<BeiJingXiangMu | null>(null)
const 提示 = ref('')
const 提示失败 = ref(false)
const 文件输入 = ref<HTMLInputElement | null>(null)

onBeforeUnmount(() => {
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
})

const 编辑键 = computed(() => (编辑项.value && 编辑模式.value ? 键(编辑模式.value, 编辑项.value) : ''))
const 编辑初始颜色 = computed(() => {
  if (!编辑项.value) return ''
  if (编辑项.value.wenZiYanSe) return 编辑项.value.wenZiYanSe
  if (编辑项.value.leiXing === 'ziDingYi' || 编辑项.value.jian !== 'moRen') return WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
  return ''
})
const 删除说明 = computed(() =>
  待删除.value
    ? huoQuFanYi('sheZhi', 'shanChuBeiJingMing').replace('{name}', 待删除.value.mingCheng)
    : '',
)

function 键(模式: 'qian' | 'shen', 项: BeiJingXiangMu): string {
  return 模式 + ':' + (项.leiXing === 'yuShe' ? 'yu-she' : 'zi-ding-yi') + ':' + 项.jian
}

function 预设项(模式: 'qian' | 'shen'): BeiJingXiangMu[] {
  return 设置仓库.beiJingXiangMuLieBiao(模式).filter((项) => 项.leiXing === 'yuShe')
}

function 自定义项(模式: 'qian' | 'shen'): BeiJingXiangMu[] {
  return 设置仓库.beiJingXiangMuLieBiao(模式).filter((项) => 项.leiXing === 'ziDingYi')
}

function 是否当前(模式: 'qian' | 'shen', 项: BeiJingXiangMu): boolean {
  return 设置仓库.shiDangQianBeiJing(模式, 项)
}

function shiYuLanZhong(模式: 'qian' | 'shen', 项: BeiJingXiangMu): boolean {
  return 编辑模式.value === 模式 && 编辑项.value !== null && 键(模式, 编辑项.value) === 键(模式, 项)
}

function 显示名(模式: 'qian' | 'shen', 项: BeiJingXiangMu): string {
  if (shiYuLanZhong(模式, 项) && 预览值.value) return 预览值.value.mingCheng
  return 项.mingCheng
}

function 背景项样式(模式: 'qian' | 'shen', 项: BeiJingXiangMu): Record<string, string> {
  const yuLanSe = shiYuLanZhong(模式, 项) && 预览值.value ? 预览值.value.wenZiYanSe : ''
  const yanSe = yuLanSe || 项.wenZiYanSe || (项.leiXing === 'ziDingYi' || 项.jian !== 'moRen' ? WAI_GUAN_MO_REN_WEN_ZI_YAN_SE : '')
  const yangShi: Record<string, string> = {}
  if (yanSe) yangShi.color = yanSe
  if (项.leiXing === 'ziDingYi') {
    yangShi['--wai-guan-meng-ceng'] = huoQuBeiJingMengCengZhi(yanSe)
    yangShi.backgroundImage = 'url("' + 项.tuDiZhi.replace(/["\\\n\r]/g, '') + '")'
    yangShi.backgroundSize = huoQuLaShenChiCunZhi(设置仓库.beiJingLaShenMoShi)
    yangShi.backgroundPosition = 'center'
    yangShi.backgroundRepeat = 'no-repeat'
  } else {
    const dingYi = huoQuBeiJingYuSheDingYi(项.jian)
    yangShi['--wai-guan-meng-ceng'] = dingYi.mengCeng
    yangShi.background = dingYi.beiJing
  }
  return yangShi
}

function 清空提示(): void {
  提示.value = ''
  提示失败.value = false
}

function 显示提示(wenAn: string, shiBai = false): void {
  提示.value = wenAn
  提示失败.value = shiBai
}

function 错误文案(cuoWu: unknown): string {
  return tiQuCuoWuWenBen(cuoWu, 失败文案)
}

async function 选择背景(模式: 'qian' | 'shen', 项: BeiJingXiangMu): Promise<void> {
  if (编辑保存中.value) return
  const zhi = 项.leiXing === 'ziDingYi' ? 项.tuDiZhi : 项.jian
  清空提示()
  await 设置仓库.qieHuanBeiJing(zhi, 模式)
}

async function 同步背景(模式: 'qian' | 'shen'): Promise<void> {
  if (同步中.value) return
  清空提示()
  同步中.value = 模式
  try {
    await 设置仓库.tongBuBeiJing(模式)
    显示提示(同步成功文案)
  } finally {
    同步中.value = ''
  }
}

function 开始编辑(模式: 'qian' | 'shen', 项: BeiJingXiangMu): void {
  if (编辑保存中.value) return
  if (编辑键.value && 编辑键.value !== 键(模式, 项)) return
  编辑模式.value = 模式
  编辑项.value = { ...项 }
  编辑错误.value = ''
  预览值.value = null
  清空提示()
}

function 结束编辑(): void {
  编辑模式.value = null
  编辑项.value = null
  编辑错误.value = ''
  预览值.value = null
}

function 更新预览(zhi: { mingCheng: string; wenZiYanSe: string }): void {
  预览值.value = zhi
}

async function 保存编辑(zhi: { mingCheng: string; wenZiYanSe: string }): Promise<void> {
  if (!编辑项.value) return
  编辑保存中.value = true
  编辑错误.value = ''
  try {
    if (编辑项.value.leiXing === 'yuShe') {
      await 设置仓库.gengXinBeiJingYuShe(编辑项.value.jian, zhi)
    } else {
      await 设置仓库.gengXinWaiGuanTiaoMu('beiJing', 编辑项.value.jian, zhi)
    }
    结束编辑()
    显示提示(保存成功文案)
  } catch (cuoWu: unknown) {
    编辑错误.value = 错误文案(cuoWu)
  } finally {
    编辑保存中.value = false
  }
}

async function 还原编辑(): Promise<void> {
  if (!编辑项.value) return
  编辑保存中.value = true
  编辑错误.value = ''
  try {
    await 设置仓库.huanYuanWaiGuanXiang('beiJing', 编辑项.value)
    结束编辑()
    显示提示(还原成功文案)
  } catch (cuoWu: unknown) {
    编辑错误.value = 错误文案(cuoWu)
  } finally {
    编辑保存中.value = false
  }
}

function 打开上传说明(模式: 'qian' | 'shen'): void {
  if (上传中.value) return
  上传模式.value = 模式
  清空提示()
  显示上传说明.value = true
}

function 确认上传说明(): void {
  显示上传说明.value = false
  文件输入.value?.click()
}

async function 处理文件选择(shiJian: Event): Promise<void> {
  const shuRu = shiJian.target as HTMLInputElement | null
  const wenJian = shuRu?.files?.[0]
  if (shuRu) shuRu.value = ''
  if (!wenJian) return
  清空提示()
  if (!wenJian.type.startsWith('image/')) {
    显示提示(huoQuFanYi('tongYong', 'feiTuPianTiShi'), true)
    return
  }
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianQianWenJian.value = wenJian
  caiJianTuYuan.value = URL.createObjectURL(wenJian)
  caiJianYuanMIME.value = wenJian.type || 'image/png'
  caiJianXianShi.value = true
}

function guanBiCaiJian(): void {
  caiJianXianShi.value = false
  if (caiJianTuYuan.value) URL.revokeObjectURL(caiJianTuYuan.value)
  caiJianTuYuan.value = ''
  caiJianQianWenJian.value = null
}

async function queRenCaiJian(wenJian: Blob): Promise<void> {
  const shangChuanWenJian = new File([wenJian], caiJianQianWenJian.value?.name || 'beijing.jpg', {
    type: wenJian.type || 'image/jpeg',
  })
  guanBiCaiJian()
  上传中.value = true
  显示提示(shangChuanZhongWenAn)
  try {
    const tiaoMu = await 设置仓库.shangChuanWaiGuan('beiJing', shangChuanWenJian)
    await 设置仓库.qieHuanBeiJing(tiaoMu.tuDiZhi, 上传模式.value)
    显示提示(保存成功文案)
  } catch (cuoWu: unknown) {
    显示提示(错误文案(cuoWu), true)
  } finally {
    上传中.value = false
  }
}

function 请求删除(项: BeiJingXiangMu): void {
  清空提示()
  待删除.value = 项
  显示删除确认.value = true
}

async function tuoZhuaiGengXinBeiJing(xinLieBiao: WaiGuanTiaoMu[]): Promise<void> {
  const jiuLieBiao = [...设置仓库.waiGuan.beiJing]
  const zhongPai = zhongPaiWaiGuanTiaoMu(jiuLieBiao, xinLieBiao.map((项) => 项.id))
  if (!zhongPai) return
  设置仓库.waiGuan.beiJing = zhongPai
  try {
    const chuCan = await baoCunWaiGuan(设置仓库.waiGuan)
    设置仓库.waiGuan = guiYiWaiGuanChuCan(chuCan)
  } catch (cuoWu: unknown) {
    设置仓库.waiGuan.beiJing = jiuLieBiao
    显示提示(错误文案(cuoWu), true)
  }
}

defineExpose({ tuoZhuaiGengXinBeiJing })

function 取消删除(): void {
  if (删除中.value) return
  显示删除确认.value = false
  待删除.value = null
}

async function 确认删除(): Promise<void> {
  const 项 = 待删除.value
  if (!项 || 删除中.value) return
  删除中.value = true
  try {
    await 设置仓库.shanChuWaiGuan('beiJing', 项.jian)
    if (编辑项.value?.jian === 项.jian) 结束编辑()
    显示删除确认.value = false
    待删除.value = null
    显示提示(删除成功文案)
  } catch (cuoWu: unknown) {
    显示删除确认.value = false
    待删除.value = null
    显示提示(错误文案(cuoWu), true)
  } finally {
    删除中.value = false
  }
}

</script>

<style scoped>
.bei-jing-she-zhi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-12);
  min-width: 0;
}

.bei-jing-she-zhi-tou {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--jiange-12);
}

.bei-jing-she-zhi-wen {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-6);
  min-width: 0;
}

.bei-jing-ji-shu {
  flex: none;
  padding: var(--jiange-4) var(--jiange-10);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: 999px;
  background: var(--beijing-ciuse);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  white-space: nowrap;
}

.bei-jing-mo-shi {
  display: flex;
  flex-direction: column;
  gap: var(--jiange-10);
  padding-top: var(--jiange-12);
  border-top: 1px solid var(--biankuang-yanse);
  min-width: 0;
}

.bei-jing-mo-shi-tou {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--jiange-12);
}

.bei-jing-mo-shi-ti {
  margin: 0;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  color: var(--wenben-zhuse);
}

.bei-jing-ci-yao {
  min-height: var(--wai-guan-re-ku);
  padding: var(--jiange-10) var(--jiange-12);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-xiao);
  background: transparent;
  color: var(--wenben-zhuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.bei-jing-ci-yao:hover:not(:disabled) {
  background: var(--beijing-ciuse);
}

.bei-jing-ci-yao:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.bei-jing-ci-yao:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.bei-jing-wang-ge {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: var(--jiange-10);
  min-width: 0;
}

.bei-jing-bian-ji-wei {
  grid-column: 1 / -1;
  min-width: 0;
}

.bei-jing-ka {
  position: relative;
  min-height: calc(var(--wai-guan-re-ku) * 2);
  border: 1.5px solid var(--biankuang-yanse);
  border-radius: var(--yuanjiao-zhong);
  background-color: var(--beijing-zhuse);
  overflow: hidden;
  isolation: isolate;
}

.bei-jing-ka::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--wai-guan-meng-ceng, transparent);
  pointer-events: none;
}

.bei-jing-ka--xuan {
  border-color: var(--zhuse);
  box-shadow: 0 0 0 2px var(--zhuse);
}

.bei-jing-ka-xuan {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--jiange-6) var(--jiange-12);
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: var(--ziti-zhong);
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  cursor: pointer;
}

.bei-jing-ka-xuan:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: calc(var(--jujiao-huan-pian-yi) * -1);
}

.bei-jing-ka-ming {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.bei-jing-ka-dang-qian {
  position: absolute;
  left: var(--jiange-6);
  bottom: var(--jiange-6);
  padding: var(--jiange-2) var(--jiange-6);
  border-radius: 999px;
  background: var(--zhezhao-beijing);
  color: var(--fasong-anniu-wenben);
  font-size: var(--ziti-xiao);
  font-weight: 400;
  line-height: 1.4;
}

.bei-jing-ka-kong-zhi {
  --wai-guan-kong-zhi-re-qu: 28px;

  position: absolute;
  right: var(--jiange-4);
  bottom: var(--jiange-2);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--wai-guan-kong-zhi-re-qu);
  height: var(--wai-guan-kong-zhi-re-qu);
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.62;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
}

.bei-jing-ka-kong-zhi-tu-biao {
  width: var(--ziti-xiao);
  height: var(--ziti-xiao);
  pointer-events: none;
}

.bei-jing-ka-kong-zhi--shan-chu {
  right: calc(var(--jiange-4) + var(--wai-guan-kong-zhi-re-qu));
}

.bei-jing-ka-kong-zhi:hover:not(:disabled),
.bei-jing-ka-kong-zhi:focus-visible {
  opacity: 1;
}

.bei-jing-ka-kong-zhi:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.bei-jing-ka-kong-zhi:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.bei-jing-ka--shang-chuan {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--jiange-2);
  padding: var(--jiange-10);
  border-style: dashed;
  background: var(--beijing-ciuse);
  color: var(--wenben-ciuse);
  font-family: inherit;
  font-size: var(--ziti-xiao);
  cursor: pointer;
}

.bei-jing-ka--shang-chuan:hover:not(:disabled) {
  border-color: var(--zhuse);
  color: var(--zhuse);
}

.bei-jing-ka--shang-chuan:focus-visible {
  outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);
  outline-offset: var(--jujiao-huan-pian-yi);
}

.bei-jing-ka--shang-chuan:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.bei-jing-ka-jia {
  font-size: var(--ziti-da);
  line-height: 1;
}

.bei-jing-ka-shang-chuan-wen {
  line-height: 1.4;
}

.bei-jing-ti-shi {
  margin: 0;
  min-height: var(--ziti-zhong);
  font-size: var(--ziti-xiao);
  color: var(--chenggong-yanse);
}

.bei-jing-ti-shi--cuo-wu {
  color: var(--cuowu-yanse);
}

.bei-jing-wen-jian-shu-ru {
  display: none;
}

.bei-jing-tuo-qu {
  display: contents;
}

.bei-jing-ka--tu.sortable-ghost {
  opacity: 0.45;
}

.bei-jing-ka--tu.sortable-chosen {
  cursor: grabbing;
}

.bei-jing-ka--tu.sortable-drag {
  transition: none !important;
  transform: scale(1.03) rotate(1deg);
  cursor: grabbing;
  z-index: 10;
  border: 2px solid var(--zhuse);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.32),
    5px 5px 0 rgba(7, 193, 96, 0.22);
}

@media (prefers-reduced-motion: reduce) {
  .bei-jing-ka--tu.sortable-drag {
    transform: none;
  }
}

@media (max-width: 520px) {
  .bei-jing-she-zhi-tou {
    flex-direction: column;
  }

  .bei-jing-mo-shi-tou {
    align-items: flex-start;
    flex-direction: column;
  }

  .bei-jing-wang-ge {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
