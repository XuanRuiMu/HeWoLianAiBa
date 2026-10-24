<template>
  <div class="shuru-kuang-waike">
    <div
      ref="bianJiQiRef"
      class="shuru-kuang"
      :class="{ 'zhan-kai': zhanKai, 'wei-kong': buYouNeiRong && !zuHeiZhong, 'zu-he-zhong': zuHeiZhong }"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'
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
  kuaiLieBiao: DaiFaKuai[]
  wenBen: string
  guangBiao: DaiFaGuangBiao
  zhanWeiFu: string
  zuiDaChangDu: number
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
const zuHeiZhong = ref(false)
let yiXuanRanQianMing = ''
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

function shiKuaiYuanSu(jieDian: Node): boolean {
  const ming = jieDian.nodeName
  return ming === 'DIV' || ming === 'P' || ming === 'LI' || ming === 'BLOCKQUOTE'
}

function shiTuKuaiYuanSu(jieDian: Node | null): boolean {
  if (!jieDian || jieDian.nodeType !== Node.ELEMENT_NODE) return false
  const ele = jieDian as HTMLElement
  return !!ele.classList && ele.classList.contains('dai-fa-kuai--tu') && shuXing(ele, 'data-kuai-id') !== ''
}

function kuaiWenBenChangDu(fu: Node): number {
  let chang = 0
  for (const zi of Array.from(fu.childNodes)) {
    if (keWenBen(zi)) chang += quKongHangShou(zi.textContent ?? '').length
    else if (zi.nodeName === 'BR') chang += 1
    else if (zi.nodeType === Node.ELEMENT_NODE && !shiTuKuaiYuanSu(zi)) chang += kuaiWenBenChangDu(zi)
  }
  return chang
}

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

function duanWenBen(duan: BianJiQiDuan[]): string {
  let wen = ''
  for (const xiang of duan) {
    if (xiang.leiXing === 'wenzi') wen += xiang.neiRong ?? ''
  }
  return wen
}

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
  if (yuJieGuan) fuYuanGuangBiao(keYongGuangBiao(cao, xianCha))
}

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
  yiXuanRanQianMing = qianMing(duanWenBen(duan))
  if (!jieGouXiangDeng(duan)) xuanRan()
  else yiXuanRanKuaiIds = props.kuaiLieBiao.map((kuai) => kuai.id)
}

function chuLiQianZhiShuRu(shiJian: Event): void {
  if (zuHeiZhong.value) return
  const leiXing = (shiJian as InputEvent).inputType
  if (typeof leiXing !== 'string' || !leiXing.startsWith('insert') || leiXing.includes('Composition')) return
  const yaoCha = (shiJian as InputEvent).data
  if (typeof yaoCha !== 'string' || yaoCha === '') return
  if (props.wenBen.length + yaoCha.length > props.zuiDaChangDu) shiJian.preventDefault()
}

function chuLiJianPan(shiJian: KeyboardEvent): void {
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
  const { guangBiao: caiJi } = xuLieHua()
  emit('geng-xin-guang-biao', caiJi)
  emit('zhan-tie', shiJian)
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
  tuoZhanKuaiId = yuanSu && shiTuKuaiYuanSu(yuanSu) ? shuXing(yuanSu, 'data-kuai-id') : ''
}

function jieShuKuaiTuoZhan(): void {
  tuoZhanKuaiId = ''
}

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
  void nextTick(() => {
    if (qianMing() !== yiXuanRanQianMing) xuanRan()
  })
})

onBeforeUnmount(() => {
  tuoZhanKuaiId = ''
})

defineExpose({
  focus: () => bianJiQiRef.value?.focus?.(),
  huoQuYuansu: () => bianJiQiRef.value,
})
</script>

<style scoped>

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
  position: relative;
  
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow-y: auto;
}

.shuru-kuang.wei-kong {
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: var(--wenben-zhuse);
}

.shuru-kuang.zu-he-zhong {
  color: var(--wenben-zhuse);
  -webkit-text-fill-color: var(--wenben-zhuse);
}
.shuru-kuang.zu-he-zhong::before {
  content: none;
}
.shuru-kuang::selection,
.shuru-kuang *::selection {
  background: color-mix(in srgb, var(--jujiao-huan-yanse) 32%, transparent);
  color: inherit;
}

.shuru-kuang.zhan-kai {
  max-height: var(--shuru-zhan-kai-gao-du);
}


.shuru-kuang.wei-kong::before {
  content: attr(data-zhan-wei);
  color: var(--shuru-zhanwei-se);
  position: absolute;
  left: var(--shuru-kuang-zuo-you-neidian);
  top: var(--shuru-kuang-shang-xia-neidian);
  pointer-events: none;
}
</style>

<style>

.dai-fa-kuai {
  position: relative;
}

.dai-fa-kuai--tu {
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
  cursor: grab;
  margin: 0 var(--daifa-kuai-tu-jiange);
}

.dai-fa-kuai-tu {
  display: block;
  width: var(--daifa-kuai-tu-kuan);
  height: var(--daifa-kuai-tu-gao);
  object-fit: cover;
  border-radius: var(--daifa-kuai-tu-yuanjiao);
}


.dai-fa-kuai-tu--biaoqingbao {
  object-fit: contain;
}

.dai-fa-kuai-shanchu {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0 var(--jiange-xiao);
  border: none;
  background: var(--beijing-kaopian);
  color: var(--wenben-ciuse);
  font-size: var(--ziti-xiao);
  line-height: var(--shuru-kuang-hangao);
  cursor: pointer;
}
</style>
