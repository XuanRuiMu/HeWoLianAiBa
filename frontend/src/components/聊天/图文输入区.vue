<template>
  <div class="shuru-kuang-waike">
    <div
      ref="bianJiQiRef"
      class="shuru-kuang"
      :class="{ 'zhan-kai': zhanKai, 'wei-kong': buYouNeiRong }"
      contenteditable="true"
      data-chat-input="true"
      spellcheck="false"
      role="textbox"
      aria-multiline="true"
      :aria-label="zhanWeiFu"
      :data-zhan-wei="zhanWeiFu"
      data-testid="tuwen-shuruqu"
      @focus="emit('ju-jiao')"
      @input="chuLiBianJi"
      @beforeinput="chuLiQianZhiShuRu"
      @keydown="chuLiJianPan"
      @paste="chuLiZhanTie"
      @drop.prevent="chuLiDuoLuo"
      @dragover="chuLiTuoHangGuo"
      @dragstart="chuLiKuaiTuoZhan"
      @dragend="jieShuKuaiTuoZhan"
      @click="chuLiDianJi"
      @keyup="shangBaoGuangBiao"
      @compositionstart="kaiShiZuHe"
      @compositionend="jieShuZuHe"
    />
  </div>
</template>

<script setup lang="ts">
// FP-10c（需求 #6 终态）图文真内联输入区的**唯一实现**：AI 聊天页与好友页共用本组件。
// contenteditable 承载「文字段 + 图片/贴纸块」同一条流：块插在光标处、随文字排版、整块一次退格删除、
// 块仍可拖拽改序与单块删除。状态真源仍是 composables/use待发图文.ts —— 本组件只是呈现层：
// DOM ⇄ 块数组用 data-kuai-id 对齐，合并相邻文字段、无图片块退回纯文本态等结构规则全在真源侧，
// 组件内零第二份块状态（既不 splice 也不 push 块数组，只读它）。
// 渲染口径＝「签名比对 → 必要时重建 → 光标按（块 id, 偏移）恢复」；IME 组合期不回写 DOM。
// 旧的多行文本域载体与 composables/use输入框.ts 的 JS 量高链已彻底删除：折叠/展开是纯 CSS 的
// min-height/max-height，
// 折叠档吃 --shuru-danxing-gao-du（与图标盒 --shuru-tubiao-chicun 同值，收 FP-20⑦ 的 0.61px 差），
// 展开档上限吃 --shuru-zhan-kai-gao-du。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/translations'
import { keYiJieGuanXuanQu } from '@/composables/use长按菜单'
import {
  quKongHangShou,
  shiBiaoQingBaoKuai,
  shiXuanGuaMoWeiHuanXing,
  SHU_RU_KONG_HANG_SHOU,
  XIAO_XI_KUAI_LEI_XING,
  yingSheChuDuanPianYi,
  yingSheHuiDuanPianYi,
} from '@/utils/消息内容块'
import type { BianJiQiDuan, DaiFaGuangBiao, DaiFaKuai } from '@/composables/use待发图文'

const props = defineProps<{
  /** 块序列真源（use待发图文 的那一份引用；组件只读，数组的增删合并在真源侧） */
  kuaiLieBiao: DaiFaKuai[]
  /** 整条流的文字投影（= 页面的 shuRuNeiRong）：未物化态下它是唯一文字真源 */
  wenBen: string
  /** 光标真源（块 id + 块内偏移）：重建 DOM 后按它恢复选区 */
  guangBiao: DaiFaGuangBiao
  /** placeholder 文本：由页面用既有翻译键取好传入，组件内零文案 */
  zhanWeiFu: string
  /** 最大消息长度：沿用既有口径（XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu） */
  zuiDaChangDu: number
  /** 展开态：纯 CSS 类的唯一开关，由页面持有（不再有 JS 量高门控） */
  zhanKai?: boolean
}>()

const emit = defineEmits<{
  (e: 'bian-ji', duan: BianJiQiDuan[], xianShiXuanRanIds: string[]): void
  (e: 'geng-xin-guang-biao', guangBiao: DaiFaGuangBiao): void
  (e: 'cha-ru-wen-ben', wenBen: string, guangBiao: DaiFaGuangBiao): void
  (e: 'fa-song'): void
  (e: 'ju-jiao'): void
  (e: 'zhan-tie', shiJian: ClipboardEvent): void
  (e: 'tuo-fang', shiJian: DragEvent): void
  (e: 'shan-chu', kuaiId: string): void
  (e: 'yi-dong', congId: string, daoXiaBiao: number): void
}>()

const bianJiQiRef = ref<HTMLDivElement | null>(null)
/** IME 组合中：组合期内既不读也不写 DOM，否则半截候选字会被写进真源（且重建会打断输入） */
const zuHeiZhong = ref(false)
let yiXuanRanQianMing = ''
/** 上一次真画进 DOM 的块 id：组合期冻结呈现，此刻插进来的块「不在 DOM 里」不等于「被用户删掉」 */
let yiXuanRanKuaiIds: string[] = []
let tuoZhanKuaiId = ''

const buYouNeiRong = computed(
  () => props.kuaiLieBiao.length === 0 && props.wenBen === '',
)

function keWenBen(jieDian: Node | null | undefined): boolean {
  return !!jieDian && jieDian.nodeType === Node.TEXT_NODE
}

function shuXing(jieDian: Node | null, ming: string): string {
  if (!jieDian || jieDian.nodeType !== Node.ELEMENT_NODE) return ''
  return (jieDian as HTMLElement).getAttribute?.(ming) ?? ''
}

/** 块级元素：浏览器在整段替换/组合输入时会造出 <div>，换行语义要按块边界还原 */
function shiKuaiYuanSu(jieDian: Node): boolean {
  const ming = jieDian.nodeName
  return ming === 'DIV' || ming === 'P' || ming === 'LI' || ming === 'BLOCKQUOTE'
}

function shiTuKuaiYuanSu(jieDian: Node | null): boolean {
  if (!jieDian || jieDian.nodeType !== Node.ELEMENT_NODE) return false
  const ele = jieDian as HTMLElement
  return !!ele.classList && ele.classList.contains('dai-fa-kuai--tu') && shuXing(ele, 'data-kuai-id') !== ''
}

/** 一个文字块宿主的真源正文长度（<br> 计一个换行、哨兵不计数）：容器级光标贴到块右缘时用 */
function kuaiWenBenChangDu(fu: Node): number {
  let chang = 0
  for (const zi of Array.from(fu.childNodes)) {
    if (keWenBen(zi)) chang += quKongHangShou(zi.textContent ?? '').length
    else if (zi.nodeName === 'BR') chang += 1
    else if (zi.nodeType === Node.ELEMENT_NODE && !shiTuKuaiYuanSu(zi)) chang += kuaiWenBenChangDu(zi)
  }
  return chang
}

/**
 * DOM → 段序列 + 光标（块 id, 块内偏移），一次遍历同时产出。
 * 文字累计成段（段归属＝所在 [data-kuai-id] 文字块；纯文本态下没有归属块 ⇒ 空串），
 * <br> 与块边界各算一个换行；图片块单独成段且不递归进去（它是原子块，退格一次整块消失）。
 * 空白/换行折叠判定全部走 utils/消息内容块.ts 的单一出口（FP-10c-12）：
 *  - 光标哨兵（零宽空格）从文本与偏移里同时摘除（渲染层在「末尾换行后 / 空文字块内」补它）；
 *  - 悬空的末尾 <br>（其后整区再无任何内容）是空态/末行的结构占位，不算用户换行 ——
 *    取代旧「编辑器只有单 <br> 才算空」特判：Blink 打字后留下的 `[文字, br]` 尾缀同样被判掉，
 *    这正是真机取证里 `第一行短第二行短\n`（换行丢失、假换行滞留末尾）的形态。
 * 光标锚在容器本身（点原子块左右缘时 Blink 给的就是 anchorNode=容器 + 子节点下标）：
 * 先按兄弟节点解析成「文字块端点」，两侧都没有文字块才退化成「贴图片块锚点」上报，
 * 由真源（use待发图文）决定插在块左/块右 —— 不再退到 {kuaiId:''} 被判「块 id 失效 ⇒ 追加末尾」。
 * 段序列用 `duan[duan.length] =` 而不是 push：组件不得对块序列施加任何数组改写手段，
 * 这条由 __tests__/FP22b待发块序列合一.test.ts 以源码正则钉住。
 */
function xuLieHua(): { duan: BianJiQiDuan[]; guangBiao: DaiFaGuangBiao } {
  const cao = bianJiQiRef.value
  const duan: BianJiQiDuan[] = []
  if (!cao) return { duan, guangBiao: { kuaiId: '', pianYi: 0 } }
  const xuanQu = typeof window !== 'undefined' && typeof window.getSelection === 'function'
    ? window.getSelection()
    : null
  const guangJieDian = xuanQu && xuanQu.rangeCount > 0 ? xuanQu.anchorNode : null
  const guangZaiJia = xuanQu && xuanQu.rangeCount > 0 ? xuanQu.anchorOffset : 0
  let wen = ''
  let guiShu = ''
  let yiDingWei = false
  let guang: DaiFaGuangBiao = { kuaiId: '', pianYi: 0 }

  const jiangDuan = (): void => {
    if (guiShu !== '' || wen !== '') duan[duan.length] = { leiXing: 'wenzi', kuaiId: guiShu, neiRong: wen }
    wen = ''
    guiShu = ''
  }
  const jiLuGuangBiao = (pianYi: number): void => {
    if (yiDingWei) return
    yiDingWei = true
    guang = { kuaiId: guiShu, pianYi }
  }
  const jiLuGuangBiaoZai = (kuaiId: string, pianYi: number): void => {
    if (yiDingWei) return
    yiDingWei = true
    guang = { kuaiId, pianYi }
  }
  /** 容器级光标落位：按被点到的子节点下标解析左右兄弟，优先贴文字块端点，其次贴图片块边界 */
  const luoDingRongQi = (ziList: Node[], xiaBiao: number): void => {
    const qian = xiaBiao > 0 ? ziList[xiaBiao - 1] : null
    const hou = xiaBiao < ziList.length ? ziList[xiaBiao] : null
    if (qian && (keWenBen(qian) || qian.nodeName === 'BR')) {
      jiLuGuangBiao(wen.length)
      return
    }
    if (qian && qian.nodeType === Node.ELEMENT_NODE && !shiTuKuaiYuanSu(qian)) {
      const id = shuXing(qian, 'data-kuai-id')
      if (id !== '') {
        jiLuGuangBiaoZai(id, kuaiWenBenChangDu(qian))
        return
      }
    }
    if (hou && hou.nodeType === Node.ELEMENT_NODE && !shiTuKuaiYuanSu(hou)) {
      const id = shuXing(hou, 'data-kuai-id')
      if (id !== '') {
        jiLuGuangBiaoZai(id, 0)
        return
      }
    }
    if (hou && keWenBen(hou)) {
      jiLuGuangBiao(wen.length)
      return
    }
    if (qian && shiTuKuaiYuanSu(qian)) {
      jiLuGuangBiaoZai(shuXing(qian, 'data-kuai-id'), 1)
      return
    }
    if (hou && shiTuKuaiYuanSu(hou)) {
      jiLuGuangBiaoZai(shuXing(hou, 'data-kuai-id'), 0)
      return
    }
    jiLuGuangBiao(wen.length)
  }
  const bianLi = (fu: Node): void => {
    const ziList = Array.from(fu.childNodes)
    ziList.forEach((zi, xiaBiao) => {
      if (!yiDingWei && fu === guangJieDian && xiaBiao === guangZaiJia) luoDingRongQi(ziList, xiaBiao)
      if (keWenBen(zi)) {
        const yuan = zi.textContent ?? ''
        if (!yiDingWei && zi === guangJieDian) jiLuGuangBiao(wen.length + yingSheChuDuanPianYi(yuan, guangZaiJia))
        wen += quKongHangShou(yuan)
        return
      }
      if (zi.nodeName === 'BR') {
        if (!shiXuanGuaMoWeiHuanXing(cao, zi)) wen += '\n'
        return
      }
      if (zi.nodeType !== Node.ELEMENT_NODE) return
      if (shiTuKuaiYuanSu(zi)) {
        jiangDuan()
        duan[duan.length] = { leiXing: 'tupian', kuaiId: shuXing(zi, 'data-kuai-id') }
        return
      }
      const xinGuiShu = shuXing(zi, 'data-kuai-id')
      if (xinGuiShu !== '' && xinGuiShu !== guiShu) jiangDuan()
      if (shiKuaiYuanSu(zi) && wen !== '') wen += '\n'
      if (xinGuiShu !== '') guiShu = xinGuiShu
      bianLi(zi)
      if (xinGuiShu !== '' && xinGuiShu === guiShu) jiangDuan()
    })
    if (!yiDingWei && fu === guangJieDian && guangZaiJia === ziList.length) luoDingRongQi(ziList, ziList.length)
  }
  bianLi(cao)
  jiangDuan()
  if (!yiDingWei) guang = { kuaiId: guiShu, pianYi: wen.length }
  return { duan, guangBiao: guang }
}

/** 段序列里的文字（纯文本态下「这一刻 DOM 呈现的文字」）：图片段不贡献字符 */
function duanWenBen(duan: BianJiQiDuan[]): string {
  let wen = ''
  for (const xiang of duan) {
    if (xiang.leiXing === 'wenzi') wen += xiang.neiRong ?? ''
  }
  return wen
}

/**
 * 签名：块 id / 类型 / 正文 / 预览地址 / 贴纸档的唯一指纹；纯文本态只指纹那一段文字。
 *
 * `weiBenCiBianJiWenBen` 是给 `chuLiBianJi` 用的：编辑由 DOM 发起，那一刻真源（`shuRuNeiRong`）已经
 * 同步改完，但 **字符串型 prop 要到父组件重渲染才更新**——use待发图文 的「原地改写」纪律覆盖不到 string
 * （数组/光标能原地改，字符串只能换新值），所以此处若读 `props.wenBen` 拿到的一定是上一轮的旧文字，
 * 「已渲染签名」被钉成旧值 ⇒ 下面那条 post-flush watch 每次按键都判为签名变化 ⇒ 纯文本态每键全量拆
 * 重建 + 抢选区（物化态读的是原地改过的数组，反而不触发）。传它进来即「DOM 现在是什么就记什么」。
 */
function qianMing(weiBenCiBianJiWenBen?: string): string {
  if (props.kuaiLieBiao.length === 0) return `w:${weiBenCiBianJiWenBen ?? props.wenBen}`
  return props.kuaiLieBiao
    .map((kuai) => {
      if (kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
        return `i:${kuai.id}:${kuai.yu_lan_url ?? kuai.mei_ti_id ?? ''}:${shiBiaoQingBaoKuai(kuai) ? 1 : 0}`
      }
      return `t:${kuai.id}:${kuai.nei_rong}`
    })
    .join('|')
}

/**
 * 真源文字 → DOM。每一枚 `<br>` 都是真换行；末尾换行与空文本之后补一枚光标哨兵
 * （utils/消息内容块.ts::SHU_RU_KONG_HANG_SHOU），给 Blink 一个可归一化的插入点——
 * 真机取证：裸 `<br>` 收尾时打字会被归一化回 `<br>` 之前（换行被并回上一行），
 * 空文字块宽 0 时图后打的字不进文字流。读回侧同一出口摘除（xuLieHua / 输入区夹具共用）。
 */
function xieRuWenBen(rongQi: HTMLElement, wenBen: string): void {
  wenBen.split('\n').forEach((yiDuan, xiaBiao) => {
    if (xiaBiao > 0) rongQi.appendChild(document.createElement('br'))
    if (yiDuan !== '') rongQi.appendChild(document.createTextNode(yiDuan))
  })
  if (wenBen === '' || wenBen.endsWith('\n')) {
    rongQi.appendChild(document.createTextNode(SHU_RU_KONG_HANG_SHOU))
  }
}

function zaoWenZiKuai(kuai: DaiFaKuai): HTMLElement {
  const xiang = document.createElement('span')
  xiang.className = 'dai-fa-kuai dai-fa-kuai--wen'
  xiang.setAttribute('data-kuai-id', kuai.id)
  xieRuWenBen(xiang, kuai.nei_rong)
  return xiang
}

function zaoTuPianKuai(kuai: DaiFaKuai): HTMLElement {
  const xiang = document.createElement('span')
  xiang.className = 'dai-fa-kuai dai-fa-kuai--tu'
  xiang.setAttribute('data-kuai-id', kuai.id)
  // 原子块：contenteditable=false ⇒ 一次退格整块删除，浏览器不会把半块留在文字流里
  xiang.setAttribute('contenteditable', 'false')
  xiang.setAttribute('draggable', 'true')
  const tu = document.createElement('img')
  tu.className = shiBiaoQingBaoKuai(kuai)
    ? 'dai-fa-kuai-tu dai-fa-kuai-tu--biaoqingbao'
    : 'dai-fa-kuai-tu'
  if (kuai.yu_lan_url) tu.setAttribute('src', kuai.yu_lan_url)
  tu.setAttribute('alt', huoQuFanYi('duoMeiTi', 'tuPianYuLan'))
  tu.setAttribute('draggable', 'false')
  const shanChu = document.createElement('button')
  shanChu.className = 'dai-fa-kuai-shanchu'
  shanChu.setAttribute('type', 'button')
  shanChu.setAttribute('aria-label', huoQuFanYi('duoMeiTi', 'kuaiShanChu'))
  shanChu.textContent = '×'
  xiang.appendChild(tu)
  xiang.appendChild(shanChu)
  return xiang
}

function zhaoKuaiYuanShu(fu: Node, kuaiId: string): HTMLElement | null {
  if (kuaiId === '') return null
  for (const zi of Array.from(fu.childNodes)) {
    if (zi.nodeType !== Node.ELEMENT_NODE) continue
    if (shiTuKuaiYuanSu(zi)) continue
    if (shuXing(zi, 'data-kuai-id') === kuaiId) return zi as HTMLElement
    const xia = zhaoKuaiYuanShu(zi, kuaiId)
    if (xia) return xia
  }
  return null
}

/** 在指定子树里数出第 pianYi 个字符（<br> 计一个换行、哨兵零贡献）落在哪个 (节点, 偏移) 上 */
function dingWeiPianYi(fanWei: Node, pianYi: number): { jieDian: Node; pianYi: number } | null {
  if (pianYi < 0) return null
  if (keWenBen(fanWei)) {
    const yuan = fanWei.textContent ?? ''
    const chang = quKongHangShou(yuan).length
    return pianYi <= chang ? { jieDian: fanWei, pianYi: yingSheHuiDuanPianYi(yuan, pianYi) } : null
  }
  let shengYu = pianYi
  const ziList = Array.from(fanWei.childNodes)
  for (const zi of ziList) {
    if (keWenBen(zi)) {
      const yuan = zi.textContent ?? ''
      const chang = quKongHangShou(yuan).length
      if (shengYu <= chang) return { jieDian: zi, pianYi: yingSheHuiDuanPianYi(yuan, shengYu) }
      shengYu -= chang
      continue
    }
    if (zi.nodeName === 'BR') {
      if (shengYu === 0) return { jieDian: fanWei, pianYi: ziList.indexOf(zi) }
      shengYu -= 1
      continue
    }
    if (zi.nodeType !== Node.ELEMENT_NODE) continue
    const nei = dingWeiPianYi(zi, shengYu)
    if (nei) return nei
    shengYu -= Math.max(1, quKongHangShou(zi.textContent ?? '').length)
  }
  // 偏移走到「<br>（或其容器）之后仍为整容器末尾」：返回容器尾位——真机取证（缺陷③）里
  // 这里返回 null 会让 fuYuanGuangBiao 退到 selectNodeContents 末尾、Blink 把插入点归一化到
  // <br> 之前，刚敲的回车被并回上一行；容器尾位才是「第二行开头」的合法落点。
  if (shengYu === 0) return { jieDian: fanWei, pianYi: ziList.length }
  const moWei = ziList[ziList.length - 1]
  if (keWenBen(moWei)) return { jieDian: moWei, pianYi: (moWei.textContent ?? '').length }
  if (ziList.length === 0) return { jieDian: fanWei, pianYi: 0 }
  return null
}

function huoQuXuanQu(): Selection | null {
  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return null
  if (typeof document.createRange !== 'function') return null
  return window.getSelection()
}

/** 按（块 id, 偏移）把选区放回 DOM：块已不存在则落到文字流末尾，绝不把光标丢给页面别处 */
function fuYuanGuangBiao(weiZhi: DaiFaGuangBiao | null): void {
  const cao = bianJiQiRef.value
  const xuanQu = huoQuXuanQu()
  if (!cao || !xuanQu) return
  const miaoShu = weiZhi
    ? dingWeiPianYi(weiZhi.kuaiId === '' ? cao : (zhaoKuaiYuanShu(cao, weiZhi.kuaiId) ?? cao), weiZhi.pianYi)
    : null
  const fanWei = document.createRange()
  if (miaoShu) {
    fanWei.setStart(miaoShu.jieDian, miaoShu.pianYi)
    fanWei.collapse(true)
  } else {
    fanWei.selectNodeContents(cao)
    fanWei.collapse(false)
  }
  xuanQu.removeAllRanges()
  xuanQu.addRange(fanWei)
}

/** 真源光标可用就用它（插块/插字方法已把它推进到插入点之后），否则退回重建前采集到的 DOM 光标 */
function keYongGuangBiao(cao: Node, xianCha: DaiFaGuangBiao): DaiFaGuangBiao {
  const caiJi = props.guangBiao
  if (!caiJi) return xianCha
  if (caiJi.kuaiId === '') return props.kuaiLieBiao.length === 0 ? caiJi : xianCha
  return zhaoKuaiYuanShu(cao, caiJi.kuaiId) ? caiJi : xianCha
}

function xuanRan(): void {
  const cao = bianJiQiRef.value
  if (!cao) return
  const xianCha = xuLieHua().guangBiao
  // 选区归属必须在**摘节点之前**问：先把文字节点摘掉、再看选区还在不在编辑器里，得到的永远是「不在」。
  // 判据本体住在 composables/use长按菜单.ts::keYiJieGuanXuanQu（全仓只此一份，聊天组件要清选区都从它取）。
  const yuJieGuan = keYiJieGuanXuanQu(cao, huoQuXuanQu())
  while (cao.firstChild) cao.removeChild(cao.firstChild)
  if (props.kuaiLieBiao.length === 0) {
    xieRuWenBen(cao, props.wenBen)
    // 空流的可选点＝末尾哨兵文本节点（xieRuWenBen 负责补），占位符靠 .wei-kong 类，不依赖 :empty
  } else {
    props.kuaiLieBiao.forEach((kuai) => {
      cao.appendChild(kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian ? zaoTuPianKuai(kuai) : zaoWenZiKuai(kuai))
    })
  }
  yiXuanRanQianMing = qianMing()
  yiXuanRanKuaiIds = props.kuaiLieBiao.map((kuai) => kuai.id)
  // 编辑器既不持有焦点也不持有选区 ⇒ 页面别处正拖着选，重建照做、选区不动
  if (yuJieGuan) fuYuanGuangBiao(keYongGuangBiao(cao, xianCha))
}

/**
 * DOM 的块 id 序列与真源块序列是否一一对应。不对应就必须重建：删掉一个块、真源把相邻文字段
 * 并成一段、序列退化回纯文本态，这三种情况都会让 DOM 与真源的 id 序列分叉。
 */
function jieGouXiangDeng(duan: BianJiQiDuan[]): boolean {
  if (props.kuaiLieBiao.length === 0) return !duan.some((xiang) => xiang.leiXing === 'tupian')
  if (duan.length !== props.kuaiLieBiao.length) return false
  return duan.every((xiang, xiaBiao) => xiang.kuaiId === props.kuaiLieBiao[xiaBiao].id)
}

function chuLiBianJi(): void {
  if (zuHeiZhong.value) return
  if (!bianJiQiRef.value) return
  const { duan, guangBiao: caiJi } = xuLieHua()
  emit('geng-xin-guang-biao', caiJi)
  emit('bian-ji', duan, yiXuanRanKuaiIds)
  // 编辑由 DOM 发起：真源改完后的签名已与 DOM 一致时不重建（重建会把原生选区整掉、IME 打断）。
  // 纯文本态的签名只能用刚读出来的那段文字，不能用 props.wenBen——它还是上一轮的旧值（理由见 qianMing）。
  yiXuanRanQianMing = qianMing(duanWenBen(duan))
  if (!jieGouXiangDeng(duan)) xuanRan()
  else yiXuanRanKuaiIds = props.kuaiLieBiao.map((kuai) => kuai.id)
}

/** 上限口径沿用既有那份：只拦「再插就超」的纯文本插入；组合输入交回 IME，否则候选字被吞 */
function chuLiQianZhiShuRu(shiJian: Event): void {
  if (zuHeiZhong.value) return
  const leiXing = (shiJian as InputEvent).inputType
  if (typeof leiXing !== 'string' || !leiXing.startsWith('insert') || leiXing.includes('Composition')) return
  const yaoCha = (shiJian as InputEvent).data
  if (typeof yaoCha !== 'string' || yaoCha === '') return
  if (props.wenBen.length + yaoCha.length > props.zuiDaChangDu) shiJian.preventDefault()
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
  // 改造前这里是模板上的 `@keydown.enter`，Vue 把 event.key 小写连字符化后再比对
  // （hyphenate('Enter') === 'enter'）。手写判定必须保留同一层归一，否则判定比 Vue 自己的
  // 修饰符更严格，等于把"键名大小写不敏感"这条既有语义悄悄收窄。
  if (shiJian.key?.toLowerCase() !== 'enter' || zuHeiZhong.value || shiJian.isComposing) return
  if (shiJian.shiftKey) {
    shiJian.preventDefault()
    const { guangBiao: caiJi } = xuLieHua()
    emit('cha-ru-wen-ben', '\n', caiJi)
    return
  }
  shiJian.preventDefault()
  emit('fa-song')
}

function chuLiZhanTie(shiJian: ClipboardEvent): void {
  // 先把此刻的 DOM 光标推进真源：页面的粘贴处理链（文字 → 图片）要在「用户真正停着的光标」处插块
  const { guangBiao: caiJi } = xuLieHua()
  emit('geng-xin-guang-biao', caiJi)
  emit('zhan-tie', shiJian)
  // 含图粘贴由页面的 use粘贴图片 拦截并交块；这里兜住纯文本：一律按纯文本插入，绝不让浏览器塞富文本
  if (shiJian.defaultPrevented) return
  const wenBen = shiJian.clipboardData?.getData('text/plain') ?? ''
  shiJian.preventDefault()
  if (wenBen === '') return
  emit('cha-ru-wen-ben', wenBen.replace(/\r\n/g, '\n'), caiJi)
}

function shiWenJianTuoFang(shiJian: DragEvent): boolean {
  const leiXing = shiJian.dataTransfer?.types
  if (!leiXing) return false
  for (let xiaBiao = 0; xiaBiao < leiXing.length; xiaBiao++) {
    if (leiXing[xiaBiao] === 'Files') return true
  }
  return false
}

function chuLiDuoLuo(shiJian: DragEvent): void {
  if (shiWenJianTuoFang(shiJian)) {
    emit('tuo-fang', shiJian)
    return
  }
  const cong = tuoZhanKuaiId
  tuoZhanKuaiId = ''
  if (!cong) return
  const luoDian = zuiJinKuaiId(shiJian.target as Node | null)
  if (!luoDian || luoDian === cong) return
  const muBiao = props.kuaiLieBiao.findIndex((kuai) => kuai.id === luoDian)
  if (muBiao !== -1) emit('yi-dong', cong, muBiao)
}

function chuLiTuoHangGuo(shiJian: DragEvent): void {
  if (tuoZhanKuaiId || shiWenJianTuoFang(shiJian)) shiJian.preventDefault()
}

function chuLiKuaiTuoZhan(shiJian: DragEvent): void {
  const yuanSu = zuiJinKuaiYuanSu(shiJian.target as Node | null)
  // 只有图片块可被拖：文字是一条流，拖它等于凭空改序
  tuoZhanKuaiId = yuanSu && shiTuKuaiYuanSu(yuanSu) ? shuXing(yuanSu, 'data-kuai-id') : ''
}

function jieShuKuaiTuoZhan(): void {
  tuoZhanKuaiId = ''
}

/** 往上找到最近的那个块宿主（文字段与图片块都算：drop 的落点可能就是文字段） */
function zuiJinKuaiYuanSu(jieDian: Node | null): HTMLElement | null {
  let dangQian: Node | null = jieDian
  while (keWenBen(dangQian)) dangQian = dangQian!.parentNode
  while (dangQian && dangQian !== bianJiQiRef.value) {
    if (shuXing(dangQian, 'data-kuai-id') !== '') return dangQian as HTMLElement
    dangQian = dangQian.parentNode
  }
  return null
}

function zuiJinKuaiId(jieDian: Node | null): string {
  const yuanSu = zuiJinKuaiYuanSu(jieDian)
  return yuanSu ? shuXing(yuanSu, 'data-kuai-id') : ''
}

function chuLiDianJi(shiJian: MouseEvent): void {
  const mubiao = shiJian.target as HTMLElement | null
  if (mubiao?.classList?.contains('dai-fa-kuai-shanchu')) {
    const kuaiId = zuiJinKuaiId(mubiao)
    shiJian.preventDefault()
    shiJian.stopPropagation()
    if (kuaiId) emit('shan-chu', kuaiId)
    return
  }
  shangBaoGuangBiao()
}

/** 只移动光标（点选、方向键）不产生 input 事件，但插块要按这一刻的光标落位 ⇒ 单独上报一次 */
function shangBaoGuangBiao(): void {
  if (zuHeiZhong.value) return
  emit('geng-xin-guang-biao', xuLieHua().guangBiao)
}

function kaiShiZuHe(): void {
  zuHeiZhong.value = true
}

function jieShuZuHe(): void {
  zuHeiZhong.value = false
  chuLiBianJi()
}

watch(
  () => qianMing(),
  (xin) => {
    if (zuHeiZhong.value) return
    if (xin === yiXuanRanQianMing) return
    xuanRan()
  },
  { flush: 'post' },
)

onMounted(() => {
  xuanRan()
  // 草稿恢复等外部写入可能发生在同一轮挂载里：再比一次签名，必要时补一次重建
  void nextTick(() => {
    if (qianMing() !== yiXuanRanQianMing) xuanRan()
  })
})

onBeforeUnmount(() => {
  tuoZhanKuaiId = ''
})

defineExpose({
  /** 页面把焦点还给输入区（改造前由页面直接持有那个多行文本域的 ref） */
  focus: () => bianJiQiRef.value?.focus?.(),
  huoQuYuansu: () => bianJiQiRef.value,
})
</script>

<style scoped>
/* 输入区几何的唯一真源住在 styles/variables.css 的共用 :root 块：.shuru-kuang-waike 的边框、
   .shuru-kuang 的字号/行高/内缩一律 var() 吃令牌，组件内零像素零色值（FP-22c/FP-23 同一条口径）。
   折叠态高度＝--shuru-danxing-gao-du（min 与 max 同值 ⇒ 盒高严格等于那枚令牌，FP-20⑦ 的 0.61px 差
   来自折叠高走 JS maxHeight 而非令牌）；展开态只放开 max-height，高度仍由内容驱动，
   与改造前 use输入框.ts 算出的「min(内容高, 50vh)」逐值等价，但没有第二处量高实现。
   滚动条不在此处声明：styles/global.css 的 --gundong-tiao-* 基线是全库唯一真源。 */
.shuru-kuang-waike {
  flex: 1;
  min-width: 0;
  background: var(--beijing-kaopian);
  border-radius: var(--shuru-kuang-yuanjiao);
  display: block;
  border: var(--shuru-kuang-biankuang) solid var(--shuru-quyu-biankuang);
}

.shuru-kuang {
  width: 100%;
  min-width: 0;
  min-height: var(--shuru-danxing-gao-du);
  max-height: var(--shuru-danxing-gao-du);
  padding: var(--shuru-kuang-shang-xia-neidian) var(--shuru-kuang-zuo-you-neidian);
  border: none;
  background: transparent;
  font-size: var(--shuru-kuang-zihao);
  color: var(--wenben-zhuse);
  line-height: var(--shuru-kuang-hangao);
  border-radius: var(--shuru-kuang-yuanjiao);
  box-sizing: border-box;
  display: block;
  /* 图文同一条流：块随文字换行排版；长词与 URL 在窄屏（375/320）断行而非顶出横向溢出 */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow-y: auto;
}

.shuru-kuang.zhan-kai {
  max-height: var(--shuru-zhan-kai-gao-du);
}

/* contenteditable 没有 ::placeholder：占位文本仍走既有翻译键（页面传 prop），只是渲染载体换成 data 属性 */
.shuru-kuang.wei-kong::before {
  content: attr(data-zhan-wei);
  color: var(--shuru-zhanwei-se);
}
</style>

<style>
/* 待发块样式【非 scoped · FP-10c-12 根因修】：块宿主与其内部 img/button 全部由
   zaoWenZiKuai/zaoTuPianKuai 用 document.createElement 命令式创建——Vue 的 scoped 只给
   模板节点打 data-v-*，JS 创建的节点拿不到 ⇒ 这些规则放在 scoped 段里时真机永不命中，
   64px 盒与 object-fit: cover 全丢、图被按原图尺寸铺满整行独占一列（不像 QQ）。
   逐节点手工 setAttribute('data-v-…') 是把框架细节焊进代码，禁止；根因级修法＝把命令式
   节点的规则搬进普通样式层。类名契约（dai-fa-kuai 家族，自 FP-10b 待发序列组件逐字沿用、
   FP-22b「一处实现」）与全部数值（吃 --daifa-kuai-tu-* 令牌；FP-24a 贴纸 contain、
   FP-10a 贴纸有真实生产者 判定语义）一字未动。dai-fa-kuai 家族类名全库只出现在本组件
   （FP22b / FP10c① 双钉），非 scoped 不外溢。 */
.dai-fa-kuai {
  position: relative;
}

.dai-fa-kuai--tu {
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
  cursor: grab;
}

.dai-fa-kuai-tu {
  display: block;
  width: var(--daifa-kuai-tu-kuan);
  height: var(--daifa-kuai-tu-gao);
  object-fit: cover;
  border-radius: var(--daifa-kuai-tu-yuanjiao);
}

/* 贴纸块的缩略图不许 cover 裁切（FP-24a）：几何仍吃 --daifa-kuai-tu-*，只把裁切换成完整显示。
   类别判定来自 utils/消息内容块.ts::shiBiaoQingBaoKuai，本组件不建第二份 */
.dai-fa-kuai-tu--biaoqingbao {
  object-fit: contain;
}

.dai-fa-kuai-shanchu {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0 var(--jiange-xiao);
  border: none;
  background: var(--beijing-kaopian);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  line-height: var(--shuru-kuang-hangao);
  cursor: pointer;
}
</style>
