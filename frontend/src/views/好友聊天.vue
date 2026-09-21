<template>
  <div class="liaotian-yemian">
    <div class="haoyou-dingbu">
      <button class="haoyou-fanhui" @click="fanHui">
        <span class="haoyou-fanhui-jiantou" aria-hidden="true" />
        {{ huoQuFanYi('caidan', 'fanHui') }}
      </button>
      <span v-if="haoYouMing" class="haoyou-dingbu-ming">{{ haoYouMing }}</span>
    </div>
    <KongTai
      v-if="feiHaoYou"
      :biao-ti="huoQuFanYi('haoYou', 'feiHaoYou')"
      :chong-shi-wen-zi="huoQuFanYi('haoYou', 'fanHuiHaoYouLieBiao')"
      @chong-shi="fanHuiLieBiao"
    />
    <KongTai
      v-else-if="jiaZaiShiBai"
      :biao-ti="huoQuFanYi('haoYou', 'xiaoXiJiaZaiShiBai')"
      :chong-shi-wen-zi="huoQuFanYi('liaoTian', 'chongShi')"
      @chong-shi="chongShiJiaZai"
    />
    <template v-else>
    <main ref="xiaoxiQuYuRef" class="xiaoxi-quyu" :class="beiJingLeiMing" :style="[beiJingYangShi, qiPaoYangShi]" role="log" aria-live="polite" :aria-label="huoQuFanYi('liaoTian', 'xiaoXiLieBiao')">
      <div v-for="xiaoXi in xiaoXiLieBiao" :key="xiaoXi.id" class="xiaoxi-xiangmu" :class="xiaoXi.fa_song_zhe_id === woDeId ? 'yonghu-xiaoxi' : 'jiaose-xiaoxi'" @contextmenu.prevent="daKaiTuPianCaiDan(xiaoXi, $event)" @touchstart="chuMoKaiShiTuPian(xiaoXi)" @touchend="chuMoJieShuTuPian" @touchmove="chuMoJieShuTuPian">
        <div class="xiaoxi-touxiang">
          <img
            v-if="xianShiTouXiang(xiaoXi)"
            :src="xianShiTouXiang(xiaoXi) || undefined"
            class="touxiang-tu"
            loading="lazy"
            :alt="huoQuFanYi('haoYou', 'touXiang')"
          />
          <span v-else class="touxiang-moren" aria-hidden="true">{{ touXiangMoRenZi(xiaoXi) }}</span>
        </div>
        <div v-if="shiMeiTiXiaoXi(xiaoXi)" class="qipao-waike" :class="meiTiWaiKeLeiMing(xiaoXi)">
          <img
            v-if="shiTuPianXiaoXi(xiaoXi)"
            class="tupian-qipao"
            :src="xiaoXi.mei_ti_url || undefined"
            loading="lazy"
            :alt="huoQuFanYi('duoMeiTi', 'tuPianYuLan')"
            @error="chuLiMeiTiShiXiao(xiaoXi)"
          />
          <div v-else class="wenjian-qipao">
            <span class="wenjian-ming">{{ xiaoXi.mei_ti_yuan_shi_wen_jian_ming || huoQuFanYi('haoYou', 'weiMingMing') }}</span>
            <span v-if="huoQuWenJianDaXiao(xiaoXi)" class="wenjian-daxiao">{{ huoQuWenJianDaXiao(xiaoXi) }}</span>
            <a
              class="wenjian-xiazai"
              :href="xiaoXi.mei_ti_url || undefined"
              :download="xiaoXi.mei_ti_yuan_shi_wen_jian_ming || undefined"
              >{{ huoQuFanYi('duoMeiTi', 'xiaZaiWenJian') }}</a
            >
          </div>
        </div>
        <div v-else class="qipao-waike">
          <div class="qipao-neirong">{{ xiaoXi.yi_che_hui ? cheHuiWenBen : xiaoXi.nei_rong }}</div>
        </div>
        <button v-if="keCheHui(xiaoXi)" class="chehui-xiao-anniu" @click="cheHui(xiaoXi.id)">
          {{ huoQuFanYi('liaoTian', 'cheHui') }}
        </button>
      </div>
    </main>
    <footer class="shuru-quyu">
      <div class="shuru-rongqi">
        <button
          class="meiti-rukou"
          type="button"
          :title="huoQuFanYi('duoMeiTi', 'xiangCe')"
          :aria-label="huoQuFanYi('duoMeiTi', 'xiangCe')"
          @click="daKaiXiangCe"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <button
          class="meiti-rukou"
          type="button"
          :title="huoQuFanYi('duoMeiTi', 'wenJian')"
          :aria-label="huoQuFanYi('duoMeiTi', 'wenJian')"
          @click="daKaiWenJianXuanZe"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </button>
        <div class="shuru-kuang-waike">
          <textarea
            v-model="shuRuNeiRong"
            class="shuru-kuang"
            rows="1"
            :placeholder="huoQuFanYi('haoYou', 'shuRuXiaoXi')"
            maxlength="500"
            @paste="chuLiZhanTie"
            @keydown.enter="chuLiHuiChe"
          />
        </div>
        <button
          class="fasong-anniu"
          :disabled="!shuRuNeiRong.trim() || faSongZhong"
          :aria-disabled="!shuRuNeiRong.trim() || faSongZhong"
          @click="faSong"
        >
          {{ huoQuFanYi('haoYou', 'faSong') }}
        </button>
      </div>
      <p v-if="faSongTiShi" class="fasong-tishi" role="status">{{ faSongTiShi }}</p>
      <p v-if="caoGaoYiHuiFu" class="fasong-tishi" role="status">{{ huoQuFanYi('tongYong', 'caoGaoYiHuiFu') }}</p>
      <!-- FP-20 契约：与聊天页同一条「添加到表情」反馈口径（成功/已在库两句可区分），不复用红色错误行 -->
      <div v-if="biaoQingTiShi" class="shuru-fu-zhu" role="status">
        <span class="biaoqing-tishi">{{ biaoQingTiShi }}</span>
      </div>
      <input ref="xiangCeInputRef" class="yincang-wenjian-shuru" type="file" accept="image/*" @change="chuLiXiangCeXuanZe" />
      <input
        ref="wenJianInputRef"
        class="yincang-wenjian-shuru"
        type="file"
        :accept="WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN"
        @change="chuLiWenJianXuanZe"
      />
    </footer>
    <!-- FP-20/FP-21：图片气泡右键/长按菜单，与聊天页同一份 use长按菜单 状态机与 .chehui-* 样式 -->
    <Teleport to="body">
      <Transition name="zhezhao-xianshi">
        <div
          v-if="tuPianCaiDanZhanKai"
          class="chehui-zhezhao"
          @click="guanBiTuPianCaiDan"
        >
          <div class="chehui-caidan" :style="tuPianCaiDanYangShi">
            <button
              v-for="xiang in huoQuTuPianCaiDanXiang()"
              :key="xiang"
              class="chehui-xiangmu"
              @click="zhiXingTuPianCaiDanXiang(xiang)"
            >
              {{ huoQuFanYi('liaoTian', xiang) }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <DuoMeiTiShouQuanDanChuang :xian-shi="shouQuanDanChuangXianShi" @que-ren="shouQuanQueRen" @ju-jue="shouQuanJuJue" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import {
  huoQuHaoYouXiaoXi,
  faSongHaoYouXiaoXi,
  cheHuiHaoYouXiaoXi,
  biaoJiHaoYouYiDu,
  huoQuHaoYouLieBiao,
  shangChuanHaoYouMeiTi,
  type HaoYouShangChuanLeiBie,
  type HaoYouXiaoXi,
} from '@/api/社交'
import { huoQuMingPian } from '@/api/资料'
import { guiYiHuaQiPao, huoQuQiPaoCSSBianLiang } from '@/config/气泡主题'
import { huoQuCuoWuXiangYing } from '@/api/请求'
import { shiTuPianDiZhi } from '@/utils/头像'
import { yaSuoTuPiang } from '@/utils/图片压缩'
import { use粘贴图片 } from '@/composables/use粘贴图片'
import { use图片授权门 } from '@/composables/use图片授权门'
import { use长按菜单 } from '@/composables/use长按菜单'
import { use添加到表情 } from '@/composables/use添加到表情'
import { use表情提交 } from '@/composables/use表情提交'
import { use表情提示条 } from '@/composables/use表情提示条'
import {
  WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN,
  MEI_TI_XIAO_XI_LEI_XING,
  TU_PIAN_XIAO_XI_LEI_XING,
} from '@/config/消息配置'
import { CAO_GAO_JIAN, useCaoGao } from '@/composables/use草稿'
import KongTai from '@/components/空态.vue'
import DuoMeiTiShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'

const route = useRoute()
const router = useRouter()
const 用户仓库 = 使用用户仓库()
const 设置仓库 = 使用用户设置仓库()
const haoYouId = String(route.params.haoYouId || '')
const woDeId = 用户仓库.dangQianYongHu?.id || ''
const xiaoXiLieBiao = ref<HaoYouXiaoXi[]>([])
const shuRuNeiRong = ref('')
const { huiFuCaoGao, qingChuCaoGao } = useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian(haoYouId), shuRuNeiRong)
const caoGaoYiHuiFu = ref(false)
const faSongZhong = ref(false)
const xiaoxiQuYuRef = ref<HTMLElement | null>(null)
const beiJingLeiMing = computed(() => (设置仓库.shiYuShe ? `beijing-${设置仓库.liaoTianBeiJing || 'moRen'}` : 'beijing-ziDingYi'))
const beiJingYangShi = computed(() => 设置仓库.beiJingNeiLianYangShi)
const cheHuiWenBen = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
const feiHaoYou = ref(false)
const jiaZaiShiBai = ref(false)
const faSongTiShi = ref('')
const haoYouTouXiang = ref<string | null>(null)
const haoYouMing = ref('')
const haoYouQiPao = ref<string | null>(null)
const lunXunDingShi = ref<number | null>(null)
const qiPaoYangShi = computed(() =>
  huoQuQiPaoCSSBianLiang(设置仓库.qiPaoZiJi, guiYiHuaQiPao(haoYouQiPao.value, 设置仓库.qiPaoAI)),
)

function xianShiTouXiang(xiaoXi: HaoYouXiaoXi): string | null {
  const diZhi = xiaoXi.fa_song_zhe_id === woDeId ? 用户仓库.dangQianYongHu?.tou_xiang : haoYouTouXiang.value
  return diZhi && shiTuPianDiZhi(diZhi) ? diZhi : null
}

function touXiangMoRenZi(xiaoXi: HaoYouXiaoXi): string {
  if (xiaoXi.fa_song_zhe_id === woDeId) {
    return (用户仓库.dangQianYongHu?.ni_cheng || 用户仓库.dangQianYongHu?.yong_hu_ming || '我').slice(0, 1)
  }
  return (haoYouMing.value || '友').slice(0, 1)
}

function keCheHui(xiaoXi: HaoYouXiaoXi): boolean {
  if (xiaoXi.fa_song_zhe_id !== woDeId || xiaoXi.yi_che_hui) return false
  return Date.now() - xiaoXi.shi_jian_chuo <= 2 * 60 * 1000
}

function gunDongDaoDiBu() {
  requestAnimationFrame(() => {
    if (xiaoxiQuYuRef.value) xiaoxiQuYuRef.value.scrollTop = xiaoxiQuYuRef.value.scrollHeight
  })
}

async function shuaXin(youBiao?: { xu_hao: number | null; shi_jian: number; id: string }) {
  try {
    // YH-087 好友聊天实时分页：游标分页+轮询增量，发送乐观更新禁全量刷新
    const xinLieBiao = await huoQuHaoYouXiaoXi(haoYouId, 50, youBiao)
    if (youBiao) {
      if (xinLieBiao.length > 0) {
        const yiCunId = new Set(xiaoXiLieBiao.value.map((x) => x.id))
        const zengLiang = xinLieBiao.filter((x) => !yiCunId.has(x.id))
        xiaoXiLieBiao.value = [...zengLiang, ...xiaoXiLieBiao.value]
      }
    } else {
      xiaoXiLieBiao.value = xinLieBiao
    }
    jiaZaiShiBai.value = false
  } catch (cuoWu: unknown) {
    // 非好友或加载失败都走空态，不让整页崩进错误边界
    if (huoQuCuoWuXiangYing(cuoWu)?.status === 403) {
      feiHaoYou.value = true
    } else {
      jiaZaiShiBai.value = true
    }
    return
  }
  gunDongDaoDiBu()
  void biaoJiHaoYouYiDu(haoYouId)
}

function fanHui() {
  // 单次返回直达上一页：历史栈见底（如直链进入）时替换到好友列表，避免点击无反应
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace('/hao-you')
}

function fanHuiLieBiao() {
  // 空态返回用替换而非推入：避免“返回又回来”导致多点一次
  router.replace('/hao-you')
}

async function chongShiJiaZai() {
  jiaZaiShiBai.value = false
  await shuaXin()
}

async function faSong() {
  const wenBen = shuRuNeiRong.value.trim()
  if (!wenBen) return
  if (faSongZhong.value) return
  faSongZhong.value = true
  faSongTiShi.value = ''
  const miDengJian = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  // YH-087 发送乐观更新：先本地落一条再调接口，失败回滚禁全量刷新
  const leGuanId = `le-guan-${miDengJian}`
  const leGuanXiaoXi = { id: leGuanId, nei_rong: wenBen, fa_song_zhe_id: woDeId, shi_jian_chuo: Date.now(), yi_che_hui: false } as HaoYouXiaoXi
  try {
    shuRuNeiRong.value = ''
    qingChuCaoGao()
    xiaoXiLieBiao.value = [...xiaoXiLieBiao.value, leGuanXiaoXi]
    gunDongDaoDiBu()
    await faSongHaoYouXiaoXi(haoYouId, wenBen, miDengJian)
    await shuaXin()
  } catch (cuoWu: unknown) {
    // 发送失败（含账号封禁403）就地提示，不抛到全局
    xiaoXiLieBiao.value = xiaoXiLieBiao.value.filter((x) => x.id !== leGuanId)
    shuRuNeiRong.value = wenBen
    faSongTiShi.value = duQuTiShi(cuoWu)
  } finally {
    faSongZhong.value = false
  }
}

function duQuTiShi(cuoWu: unknown): string {
  if (typeof cuoWu === 'object' && cuoWu !== null && 'response' in cuoWu) {
    return huoQuCuoWuXiangYing(cuoWu)?.data?.ti_shi || huoQuFanYi('tongYong', 'caoZuoShiBai')
  }
  return cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('tongYong', 'caoZuoShiBai')
}

// ---------------------------------------------------------------------------
// FP-21 好友媒体（图片 / 文件）。上传走 /api/好友/媒体（归属＝好友关系 + 双方用户编号），
// 气泡地址来自列表接口的签名 URL；粘贴复用 FP-06a 的唯一实现 use粘贴图片，零第二套剪贴板读取。
// 压缩与粘贴预检同样复用聊天页那一份（yaSuoTuPiang / ZHAN_TIE_TU_PIAN_PEI_ZHI），
// 媒体类型码只引用 config/消息配置 的唯一清单；服务端白名单才是最终边界，
// 失败即就地显示后端文案（不整页崩、不静默丢图）。
// ---------------------------------------------------------------------------
const MEI_TI_LEI_XING = new Set<string>(MEI_TI_XIAO_XI_LEI_XING)
const TU_PIAN_LEI_XING = new Set<string>(TU_PIAN_XIAO_XI_LEI_XING)
const xiangCeInputRef = ref<HTMLInputElement | null>(null)
const wenJianInputRef = ref<HTMLInputElement | null>(null)
const yuLanURLJi = new Set<string>()
const meiTiChongLaiYiFa = new Set<string>()
let meiTiShiXiaoZaiTu: Promise<void> | null = null

// C4 授权门的唯一实现是 use图片授权门（待确认队列即 L-23 的正解，聊天页那份单变量已删）；
// 本页只交出开关读写，未决等待者的离页结算由 composable 自己挂 onBeforeUnmount 兜住。
const {
  xianShi: shouQuanDanChuangXianShi,
  queRenTuPianShouQuan,
  shouQuanQueRen,
  shouQuanJuJue,
} = use图片授权门({
  huoQuYiShouQuan: () => 用户仓库.tuPianShouQuan,
  sheZhiYiShouQuan: (yunXu) => 用户仓库.sheZhiTuPianShouQuan(yunXu),
})

function shiTuPianXiaoXi(xiaoXi: HaoYouXiaoXi): boolean {
  return TU_PIAN_LEI_XING.has(xiaoXi.lei_xing)
}

function shiMeiTiXiaoXi(xiaoXi: HaoYouXiaoXi): boolean {
  return MEI_TI_LEI_XING.has(xiaoXi.lei_xing) && !!xiaoXi.mei_ti_url
}

function meiTiWaiKeLeiMing(xiaoXi: HaoYouXiaoXi): string {
  return shiTuPianXiaoXi(xiaoXi) ? 'tupian-waike' : 'wenjian-waike'
}

/** 与聊天页 huoQuWenJianDaXiaoWenBen 同口径的字节显示（不足 1MB 走 KB） */
function huoQuWenJianDaXiao(xiaoXi: HaoYouXiaoXi): string {
  const ziJie = xiaoXi.mei_ti_da_xiao_zi_jie
  if (typeof ziJie !== 'number' || ziJie <= 0) return ''
  if (ziJie >= 1024 * 1024) return `${(ziJie / (1024 * 1024)).toFixed(1)}MB`
  return `${Math.max(1, Math.round(ziJie / 1024))}KB`
}

function chuangJianYuLanURL(neiRong: Blob): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null
  const diZhi = URL.createObjectURL(neiRong)
  yuLanURLJi.add(diZhi)
  return diZhi
}

/** 列表全量刷新后本地预览地址即失效（服务端签名地址接管），统一回收防泄漏 */
function huiShouYuLanURL(): void {
  for (const diZhi of yuLanURLJi) {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(diZhi)
  }
  yuLanURLJi.clear()
}

/**
 * 签名 URL 过期（默认 1 小时）⇒ 重拉一次列表拿新鲜地址。
 * 一屏可能同时有几十张过期图各自触发 @error：整个页面只允许**一条在途**的补救重拉，
 * 其余失效图挂在这同一轮结果上（旧实现按消息条数各发一次整表重拉，50 张图=50 次列表请求，
 * 属自我放大）。每条消息在一次页面生命周期内只登记一次，故坏图不会变成轮询。
 */
function chuLiMeiTiShiXiao(xiaoXi: HaoYouXiaoXi): void {
  if (meiTiChongLaiYiFa.has(xiaoXi.id)) return
  meiTiChongLaiYiFa.add(xiaoXi.id)
  if (meiTiShiXiaoZaiTu) return
  meiTiShiXiaoZaiTu = shuaXin().finally(() => {
    meiTiShiXiaoZaiTu = null
  })
}

async function faSongHaoYouMeiTiXiaoXi(
  leiXing: string,
  leiBie: HaoYouShangChuanLeiBie,
  wenJian: File | Blob,
  wenJianMing: string,
): Promise<void> {
  faSongTiShi.value = ''
  const yunXu = await queRenTuPianShouQuan()
  if (!yunXu) {
    faSongTiShi.value = huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi')
    return
  }
  const miDengJian = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const leGuanId = `le-guan-mei-ti-${miDengJian}`
  const leGuanXiaoXi: HaoYouXiaoXi = {
    id: leGuanId,
    fa_song_zhe_id: woDeId,
    jie_shou_zhe_id: haoYouId,
    nei_rong: '',
    lei_xing: leiXing,
    mei_ti_id: null,
    mei_ti_url: chuangJianYuLanURL(wenJian),
    mei_ti_lei_bie: leiBie,
    mei_ti_yuan_shi_wen_jian_ming: wenJianMing || null,
    mei_ti_da_xiao_zi_jie: typeof wenJian.size === 'number' ? wenJian.size : null,
    yi_du: false,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
  }
  xiaoXiLieBiao.value = [...xiaoXiLieBiao.value, leGuanXiaoXi]
  gunDongDaoDiBu()
  try {
    const shangChuan = await shangChuanHaoYouMeiTi(haoYouId, wenJian, leiBie)
    await faSongHaoYouXiaoXi(haoYouId, '', miDengJian, { leiXing, meiTiId: shangChuan.mediaId })
    await shuaXin()
    huiShouYuLanURL()
  } catch (cuoWu: unknown) {
    xiaoXiLieBiao.value = xiaoXiLieBiao.value.filter((x) => x.id !== leGuanId)
    faSongTiShi.value = duQuTiShi(cuoWu)
  }
}

async function faSongTuPianXiaoXi(wenJian: File, yuanWenJianMing?: string): Promise<void> {
  let ming = yuanWenJianMing || wenJian.name || ''
  try {
    const daiFa = await yaSuoTuPiang(wenJian)
    if (!(daiFa instanceof File) && !/\.(png|jpe?g|gif|webp)$/i.test(ming)) ming = 'tupian.jpg'
    await faSongHaoYouMeiTiXiaoXi('tuPian', 'tupian', daiFa, ming)
  } catch (cuoWu: unknown) {
    faSongTiShi.value = duQuTiShi(cuoWu)
  }
}

const { chuLiZhanTie } = use粘贴图片({
  faSongTuPian: (wenJian) => faSongTuPianXiaoXi(wenJian),
  sheZhiCuoWu: (xinXi) => {
    faSongTiShi.value = xinXi
  },
})

/** 表情链路的错误一律就地显示在本页提示行，不串到 AI 聊天页的横幅上 */
function jiuDiTiShi(xinXi: string): void {
  faSongTiShi.value = xinXi
}

/**
 * 签名过期时不开第二套签名口径：好友页的新鲜地址只由列表接口现签，
 * 故整表重拉一次（与 @error 的合并重拉同一个 `shuaXin` 入口）后按 id 取新地址。
 */
async function chongQianLieBiaoMeiTiURL(xiaoXi: HaoYouXiaoXi): Promise<string | null> {
  await shuaXin()
  const xinXiang = xiaoXiLieBiao.value.find((yiXiang) => yiXiang.id === xiaoXi.id)
  return xinXiang?.mei_ti_url || null
}

// FP-20 契约：图片气泡的「添加到表情」与聊天页共用同一份取图段（use添加到表情）、同一个
// 提交口（use表情提交）与同一份状态条（use表情提示条），本页零取图/上传实现。
const { tiShi: biaoQingTiShi, xianShi: xianShiBiaoQingTiShi, yinXia: yinXiaBiaoQingTiShi } =
  use表情提示条()
const { tiJiaoBiaoQingWenJian } = use表情提交({
  queRenTuPianShouQuan,
  sheZhiCuoWu: jiuDiTiShi,
})
const { tianJiaTuPianDaoBiaoQing } = use添加到表情<HaoYouXiaoXi>({
  huoQuMeiTiURL: (xiaoXi) => xiaoXi.mei_ti_url || undefined,
  huoQuWenJianMing: (xiaoXi) => xiaoXi.mei_ti_yuan_shi_wen_jian_ming || undefined,
  chongQianMeiTiURL: (xiaoXi) => chongQianLieBiaoMeiTiURL(xiaoXi),
  tiJiaoWenJian: (wenJian) => tiJiaoBiaoQingWenJian(wenJian),
  sheZhiCuoWu: jiuDiTiShi,
  sheZhiTiShi: (xinXi) => xianShiBiaoQingTiShi(xinXi),
})
// 撤回窗口判定所需的时钟：好友消息没有 fa_song_zhe_lei_xing，菜单里恒无撤回项
// （撤回仍是本页既有的行内按钮），故此处只作占位读数，不随秒刷新。
const dangQianShiJian = ref(Date.now())
const {
  tuPianCaiDanZhanKai,
  tuPianCaiDanYangShi,
  daKaiTuPianCaiDan,
  chuMoKaiShiTuPian,
  chuMoJieShuTuPian,
  guanBiTuPianCaiDan,
  huoQuTuPianCaiDanXiang,
  zhiXingTuPianCaiDanXiang,
} = use长按菜单<HaoYouXiaoXi>({
  dangQianShiJian,
  cheHuiXiaoXi: (xiaoXiId) => cheHui(xiaoXiId),
  tianJiaDaoBiaoQing: (xiaoXi) => tianJiaTuPianDaoBiaoQing(xiaoXi),
  sheZhiCuoWu: jiuDiTiShi,
})

function daKaiXiangCe(): void {
  xiangCeInputRef.value?.click()
}

function daKaiWenJianXuanZe(): void {
  wenJianInputRef.value?.click()
}

async function chuLiXiangCeXuanZe(shiJian: Event): Promise<void> {
  const shuRu = shiJian.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  await faSongTuPianXiaoXi(wenJian)
}

async function chuLiWenJianXuanZe(shiJian: Event): Promise<void> {
  const shuRu = shiJian.target as HTMLInputElement
  const wenJian = shuRu.files?.[0]
  shuRu.value = ''
  if (!wenJian) return
  await faSongHaoYouMeiTiXiaoXi('wenJian', 'wenjian', wenJian, wenJian.name || '')
}

function chuLiHuiChe(shijian: KeyboardEvent) {
  if (shijian.shiftKey) return
  shijian.preventDefault()
  void faSong()
}

async function cheHui(xiaoXiId: string) {
  await cheHuiHaoYouXiaoXi(xiaoXiId)
  await shuaXin()
}

onMounted(async () => {
  await 设置仓库.jiaZai()
  caoGaoYiHuiFu.value = huiFuCaoGao()
  try {
    const lieBiao = await huoQuHaoYouLieBiao()
    const haoYou = lieBiao.find((xiang) => xiang.id === haoYouId)
    if (haoYou) {
      haoYouTouXiang.value = haoYou.tou_xiang
      haoYouMing.value = haoYou.ni_cheng || haoYou.yong_hu_ming || ''
    }
  } catch {
    /* 好友信息加载失败时仅用默认头像 */
  }
  try {
    const mingPian = await huoQuMingPian(haoYouId)
    haoYouQiPao.value = typeof mingPian.qi_pao_zi_ji === 'string' ? mingPian.qi_pao_zi_ji : null
  } catch {
    /* 对方气泡偏好不可用时回退到自身AI气泡 */
  }
  await shuaXin()
  // YH-087 轮询增量：socket缺席时30s轮询兜底，禁固定50全量
  lunXunDingShi.value = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    const zuiXin = xiaoXiLieBiao.value[xiaoXiLieBiao.value.length - 1]
    void shuaXin(zuiXin ? { xu_hao: null, shi_jian: zuiXin.shi_jian_chuo, id: zuiXin.id } : undefined)
  }, 30000)
})

onBeforeUnmount(() => {
  if (lunXunDingShi.value !== null) {
    window.clearInterval(lunXunDingShi.value)
    lunXunDingShi.value = null
  }
  // 离页即回收本地预览地址：blob: 地址只在本页消费。未决授权 Promise 由 use图片授权门
  // 自己的 onBeforeUnmount 结算，不在页面里重复一份（重复即第二处真源）。
  huiShouYuLanURL()
  yinXiaBiaoQingTiShi()
})
</script>

<style scoped>
.liaotian-yemian {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--beijing-zhuse);
}
/* 好友聊天顶栏：显式返回按钮，单次点击直达上一页 */
.haoyou-dingbu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--dingbu-lan-beijing);
  border-bottom: 0.5px solid var(--biankuang-yanse);
  flex: none;
}
.haoyou-fanhui {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--wenben-zhuse);
  font-size: 15px;
  padding: 6px 8px 6px 2px;
  cursor: pointer;
}
.haoyou-fanhui-jiantou {
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 7px solid currentcolor;
}
.haoyou-dingbu-ming {
  font-size: 15px;
  font-weight: 600;
  color: var(--wenben-zhuse);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.xiaoxi-quyu {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  background: var(--liaotian-beijing);
}
.beijing-miWuSenLin { background: linear-gradient(135deg, #1a2f1a, #2d4a2d); }
.beijing-haiYangZhiLan { background: linear-gradient(135deg, #1a3a5c, #2d6a9f); }
.beijing-fenSeMengJing { background: linear-gradient(135deg, #f7d6e0, #f2a7c3); }
.beijing-yeKongXingHe { background: linear-gradient(135deg, #0a0a23, #1a1a4d); }
.beijing-miSeTianYuan { background: linear-gradient(135deg, #f5f0e1, #e8dcc3); }
.xiaoxi-xiangmu {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  max-width: 100%;
}
.yonghu-xiaoxi { flex-direction: row-reverse; align-self: flex-end; }
.jiaose-xiaoxi { flex-direction: row; align-self: flex-start; }
.xiaoxi-touxiang {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--touxiang-beijing-moren);
  flex-shrink: 0;
  font-size: 18px;
  color: var(--wenben-zhuse);
}
.yonghu-xiaoxi .xiaoxi-touxiang { margin-left: 10px; }
.jiaose-xiaoxi .xiaoxi-touxiang { margin-right: 10px; }
.touxiang-tu { width: 100%; height: 100%; object-fit: cover; }
.qipao-waike { max-width: min(calc(100vw - 126px), 520px); }
.qipao-neirong {
  padding: 9px 13px;
  border-radius: 6px;
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
  position: relative;
  display: inline-block;
}
.yonghu-xiaoxi .qipao-neirong { background: var(--qipao-ziJi-beiJing, var(--xiaoxi-yonghu-beijing)); color: var(--qipao-ziJi-wenBen, var(--xiaoxi-yonghu-wenben)); }
.jiaose-xiaoxi .qipao-neirong { background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing)); color: var(--qipao-duiFang-wenBen, var(--xiaoxi-jiaose-wenben)); }
.chehui-xiao-anniu {
  font-size: 12px;
  color: var(--wenben-tishi);
  padding: 4px 8px;
  /* YH-101 触屏目标：最小24px推荐44px，12px点不到收敛为最小可点 */
  min-width: 24px;
  min-height: 24px;
}
.shuru-quyu {
  background: var(--shuru-quyu-beijing);
  border-top: 0.5px solid var(--shuru-quyu-biankuang);
  padding: 8px 10px;
  padding-bottom: calc(8px + var(--anquan-quyu-xia));
}
.shuru-rongqi {
  /* 缺陷5 同源几何：与聊天页同一套输入区度量令牌，两页高度必须由同一来源构造 */
  --shuru-kuang-zihao: 16px;
  --shuru-kuang-hangao: 1.4;
  --shuru-kuang-hangxing-gao: calc(var(--shuru-kuang-zihao) * var(--shuru-kuang-hangao));
  --shuru-kuang-shang-xia-neidian: 6px;
  --shuru-kuang-zuo-you-neidian: 12px;
  --shuru-kuang-biankuang: 0.5px;
  --shuru-anniu-re-ku: 44px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
/* FP-21 媒体入口：与聊天页同用「相册/文件」语义，但好友页无「更多」面板，故恒常驻两个图标按钮。
   命中区按 YH-101 触屏口径给到 44px，色值只取明暗两套均有定义的令牌。 */
.meiti-rukou {
  flex: none;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0.5px solid var(--biankuang-yanse);
  border-radius: 6px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  cursor: pointer;
}
.meiti-rukou svg { width: 20px; height: 20px; }
.yincang-wenjian-shuru { display: none; }
/* 图片与表情包不带文字气泡底色（与聊天页同一口径：表情包无气泡） */
.tupian-waike { max-width: min(calc(100vw - 126px), 260px); }
.tupian-qipao {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  object-fit: cover;
  background: var(--beijing-kaopian);
}
.wenjian-qipao {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 13px;
  border: 0.5px solid var(--biankuang-yanse);
  border-radius: 6px;
  background: var(--beijing-kaopian);
  color: var(--wenben-zhuse);
  font-size: 14px;
}
.wenjian-ming { word-break: break-all; }
.wenjian-daxiao { font-size: 12px; color: var(--wenben-tishi); }
.wenjian-xiazai {
  align-self: flex-start;
  min-height: 24px;
  font-size: 13px;
  color: var(--zhuse);
  text-decoration: none;
}
.shuru-kuang-waike {
  flex: 1;
  min-width: 0;
  background: var(--beijing-kaopian);
  border-radius: 6px;
  display: block;
  border: var(--shuru-kuang-biankuang) solid var(--shuru-quyu-biankuang);
}
.shuru-kuang {
  width: 100%;
  min-width: 0;
  padding: var(--shuru-kuang-shang-xia-neidian) var(--shuru-kuang-zuo-you-neidian);
  border: none;
  background: transparent;
  font-size: var(--shuru-kuang-zihao);
  color: var(--wenben-zhuse);
  line-height: var(--shuru-kuang-hangao);
  border-radius: 6px;
  box-sizing: border-box;
  display: block;
  resize: none;
  /* 缺陷6：与聊天页一致走 --gundong-tiao-* 全局基线，超一行即出现可见可拖滚动条 */
  overflow-y: auto;
}
.fasong-anniu {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 与输入框外壳同一套量：同上下内边距 + 同行高基准 + 同宽透明边框 ⇒ 两盒等高 */
  padding: var(--shuru-kuang-shang-xia-neidian) 14px;
  border: var(--shuru-kuang-biankuang) solid transparent;
  min-width: var(--shuru-anniu-re-ku);
  line-height: var(--shuru-kuang-hangxing-gao);
  background: var(--zhuse);
  color: var(--fasong-anniu-wenben);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}
.fasong-anniu::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: var(--shuru-anniu-re-ku);
  transform: translate(-50%, -50%);
}
.fasong-anniu:disabled { background: var(--fasong-anniu-jinyong-beijing); cursor: not-allowed; }
.fasong-tishi {
  margin: 6px 2px 0;
  font-size: 12px;
  color: var(--cuowu-yanse, #ff6b6b);
}
/* 图片菜单的淡入淡出与聊天页同一条时间曲线。刻意留在本页 scoped 块里：全局化会让同名
   过渡溢到结算弹窗（它也叫 zhezhao-xianshi，但走自己的 keyframes）。 */
.zhezhao-xianshi-enter-active { transition: opacity 0.25s ease; }
.zhezhao-xianshi-leave-active { transition: opacity 0.15s ease; }
.zhezhao-xianshi-enter-from,
.zhezhao-xianshi-leave-to { opacity: 0; }
</style>
