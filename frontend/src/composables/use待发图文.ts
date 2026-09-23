import { computed, ref, watch, type Ref } from 'vue'
import type { XiaoXiKuaiLeiXing } from '@/types'
import { panDingKuaiChaoXian, XIAO_XI_KUAI_LEI_XING } from '@/utils/消息内容块'
import { queDingMiDengJian } from '@/utils/发件箱'

/**
 * FP-10c（需求 #6 终态）待发图文的**唯一状态真源**：一条有序块序列，文字块与图片/贴纸块同序列，
 * 由 components/聊天/图文输入区.vue 以 contenteditable 呈现为同一条文字流。
 *
 * 与改造前（FP-10b）的三处结构性差别：
 *  ①不再有「活动文字块」：文字是一条流，不再由旧的多行文本域只承载其中一段，故 huoYueKuaiId /
 *    qieHuanHuoDong / qianYiKuai / houYiKuai 一并作废（改序由原生光标定位与块拖拽承担）；
 *  ②光标成为状态的一部分（`guangBiao`，按（块 id, 偏移）表达）：呈现层把 DOM 光标写进来，
 *    插块/插字方法把它推进到插入点之后，重建 DOM 后按它恢复 —— 光标位置只有一处真源；
 *  ③`shuRuNeiRong` 从「活动块正文」升级为「整条流的文字投影」：物化态下恒等于各文字块正文之和
 *    （草稿、字数统计、纯文本发送口都继续读它，口径不变），未物化态下它本身就是唯一真源。
 *
 * 兼容性铁律（FP-10b 起由 __tests__/FP10b图文混排.test.ts 与 __tests__/FP10c真内联输入区.test.ts
 * 共同钉住）：**没插过图片时 `kuaiLieBiao` 恒为空数组**，纯文字链路一行行为都没变；
 * 删掉最后一个图片块同样回落到该空态。
 *
 * 两条改写纪律（呈现层正确性的前提，别改回整体替换）：块数组与光标对象都**原地改写**、不换对象，
 * 否则图文输入区.vue 的 prop 要到下一轮渲染才更新，同一次编辑里就会出现「真源已改、签名仍是旧的」
 * 的假同构 ⇒ 漏重建。
 */
export interface DaiFaKuai {
  id: string
  lei_xing: XiaoXiKuaiLeiXing
  /** 文字块正文；图片块为空串 */
  nei_rong: string
  /** 图片块尚未上传时的本地文件 */
  wen_jian: File | Blob | null
  /** 图片块已上传后的媒体 ID；未上传为 null */
  mei_ti_id: string | null
  /** 图片块的媒体类别（tupian / biaoqingshu），仅用于派生兼容投影 */
  mei_ti_lei_bie: string | null
  /** 本地预览地址（blob:），提交成功后由服务端签名地址替换 */
  yu_lan_url: string | null
  /** FP-09b：图片块自带的稳定幂等键（好友链路逐条发送时复用，重发不换键） */
  mi_deng_jian: string
}

/**
 * 编辑器光标：`kuaiId` 非空且指向文字块 ⇒ 光标在该文字块内，`pianYi` 是块内偏移；
 * `kuaiId` 非空且指向**图片块**（FP-10c-12）⇒ 光标贴在该图片块的边界：`pianYi===0` 在块左、
 * `pianYi≥1` 在块右（真机实测：点原子块左右缘时 anchorNode 是编辑器/更外层的容器，
 * 呈现层把它解析成「贴块锚点」上报，插块/插字据此落在点击的那一侧，不再退到末尾）。
 * `kuaiId` 为空串 ⇒ 块序列尚未物化（纯文本态），`pianYi` 是整段文字的偏移。
 */
export interface DaiFaGuangBiao {
  kuaiId: string
  pianYi: number
}

/** 呈现层从 DOM 解析出来的一段：文字段带归属块 id（纯文本态为空串）与正文，图片段只带块 id */
export interface BianJiQiDuan {
  leiXing: 'wenzi' | 'tupian'
  kuaiId: string
  neiRong?: string
}

export interface Use待发图文依赖 {
  /** 整条文字流的纯文本投影（未物化态下即唯一真源）；草稿/字数统计/纯文本发送口共读这一份 */
  shuRuNeiRong: Ref<string>
  /** 预览地址生成/回收，交给调用方（聊天页要进 store 的 objectURL 台账） */
  chuangJianYuLan?: (wenJian: File | Blob) => string | null
  huiShouYuLan?: (diZhi: string | null) => void
  shengChengJian?: () => string
}

interface ChaRuJieGuo {
  chengGong: boolean
  yuanYin: '' | 'chao_xian'
  /** 新插入的图片块 ID（异步压缩完成后按它换回文件） */
  kuaiId: string
  /** 插入后的光标（呈现层按它恢复选区）：图片块之后那个文字段的起点 */
  guangBiao: DaiFaGuangBiao
}

function moRenJian(): string {
  return `kuai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function qiaJia(zhi: number, shangXian: number): number {
  if (typeof zhi !== 'number' || !Number.isFinite(zhi) || zhi < 0) return 0
  return Math.min(zhi, shangXian)
}

export function use待发图文(yiLai: Use待发图文依赖) {
  const kuaiLieBiao = ref<DaiFaKuai[]>([])
  const guangBiao = ref<DaiFaGuangBiao>({ kuaiId: '', pianYi: 0 })
  let biaoHao = 0

  function xinJianId(): string {
    biaoHao += 1
    return yiLai.shengChengJian ? yiLai.shengChengJian() : `${moRenJian()}-${biaoHao}`
  }

  function wenZiKuai(neiRong: string): DaiFaKuai {
    const kuai: DaiFaKuai = {
      id: xinJianId(),
      lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi,
      nei_rong: neiRong,
      wen_jian: null,
      mei_ti_id: null,
      mei_ti_lei_bie: null,
      yu_lan_url: null,
      mi_deng_jian: '',
    }
    // 好友链路把块序列逐条发出，文字块同样需要一把不换的键（FP-09b）
    queDingMiDengJian(kuai)
    return kuai
  }

  function huoQuKuai(id: string): DaiFaKuai | undefined {
    return kuaiLieBiao.value.find((xiang) => xiang.id === id)
  }

  function huoQuXiaBiao(id: string): number {
    return kuaiLieBiao.value.findIndex((xiang) => xiang.id === id)
  }

  function shiWenZiKuai(kuai: DaiFaKuai | undefined | null): kuai is DaiFaKuai {
    return !!kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi
  }

  function shiTuPianKuai(kuai: DaiFaKuai): boolean {
    return kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian
  }

  /** 块数组原地改写（不换对象）：见本文件顶部「两条改写纪律」 */
  function luoXieKuaiXuLie(lieBiao: DaiFaKuai[]): void {
    const muBiao = kuaiLieBiao.value
    muBiao.length = 0
    for (const xiang of lieBiao) muBiao.push(xiang)
  }

  /** 光标对象原地改写（不换对象）：同上 */
  function xieGuangBiao(weiZhi: DaiFaGuangBiao): void {
    guangBiao.value.kuaiId = weiZhi.kuaiId
    guangBiao.value.pianYi = weiZhi.pianYi
  }

  /** 块序列的文字投影：所有文字块正文按序拼接（图片块不贡献字符） */
  function touYingWenBen(): string {
    return kuaiLieBiao.value.reduce((he, xiang) => (shiWenZiKuai(xiang) ? he + xiang.nei_rong : he), '')
  }

  /** 物化态下维持「投影 === 各文字块正文之和」这条不变式（外部只读 shuRuNeiRong，不必知道块的存在） */
  function baoChiTouYing(): void {
    if (kuaiLieBiao.value.length === 0) return
    const zhi = touYingWenBen()
    if (yiLai.shuRuNeiRong.value !== zhi) yiLai.shuRuNeiRong.value = zhi
  }

  /** 最后一个文字块；一个都没有时返回 null（此时只能新起一段） */
  function moWeiWenZiKuai(): DaiFaKuai | null {
    for (let xiaBiao = kuaiLieBiao.value.length - 1; xiaBiao >= 0; xiaBiao--) {
      if (shiWenZiKuai(kuaiLieBiao.value[xiaBiao])) return kuaiLieBiao.value[xiaBiao]
    }
    return null
  }

  /** 块内偏移换成「整条投影里的绝对偏移」，供回落纯文本态后光标继续可用 */
  function guangBiaoDaoJueDuiPianYi(weiZhi: DaiFaGuangBiao, wenBen: string): number {
    if (weiZhi.kuaiId === '') return qiaJia(weiZhi.pianYi, wenBen.length)
    let jiLei = 0
    for (const xiang of kuaiLieBiao.value) {
      if (!shiWenZiKuai(xiang)) continue
      if (xiang.id === weiZhi.kuaiId) return jiLei + qiaJia(weiZhi.pianYi, xiang.nei_rong.length)
      jiLei += xiang.nei_rong.length
    }
    return jiLei
  }

  /** 相邻文字段并一段（DOM 同步 / 删块 / 拖动后都可能造出相邻两段）；并段后取前一块的 id 与幂等键 */
  function bingLianXuWenZiKuai(lieBiao: DaiFaKuai[]): DaiFaKuai[] {
    const paiSheng: DaiFaKuai[] = []
    for (const xiang of lieBiao) {
      const qian = paiSheng[paiSheng.length - 1]
      if (shiWenZiKuai(xiang) && shiWenZiKuai(qian)) {
        qian.nei_rong = `${qian.nei_rong}${xiang.nei_rong}`
        continue
      }
      paiSheng.push(xiang)
    }
    return paiSheng
  }

  /**
   * 序列里没有图片块 ⇒ 退回纯文本态：块数组清空、投影文字成为唯一真源。
   * 「没插过图片时行为与改造前逐字一致」这条铁律的实现点（插入后又被删空同理）。
   */
  function shouLiuChunWenBenTai(): boolean {
    if (kuaiLieBiao.value.some((xiang) => shiTuPianKuai(xiang))) return false
    const wenBen = touYingWenBen()
    const jueDui = qiaJia(guangBiaoDaoJueDuiPianYi(guangBiao.value, wenBen), wenBen.length)
    luoXieKuaiXuLie([])
    xieGuangBiao({ kuaiId: '', pianYi: jueDui })
    if (yiLai.shuRuNeiRong.value !== wenBen) yiLai.shuRuNeiRong.value = wenBen
    return true
  }

  /**
   * FP-09b：图片块自带稳定 UUID 幂等键，上传成功但投递重试时不换键（服务端唯一约束才压得住重放）。
   * 在光标处插块：光标所在文字段被劈成「光标前 / 光标后」两段，图片排在中间；
   * 未物化态先按当前投影物化，用户已打的字不丢。
   */
  function chaRuTuPian(
    wenJian: File | Blob,
    meiTiLeiBie: string | null = null,
    weiZhi?: DaiFaGuangBiao | null,
  ): ChaRuJieGuo {
    const yuLan = yiLai.chuangJianYuLan ? yiLai.chuangJianYuLan(wenJian) : null
    const tuKuai: DaiFaKuai = {
      id: xinJianId(),
      lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
      nei_rong: '',
      wen_jian: wenJian,
      mei_ti_id: null,
      mei_ti_lei_bie: meiTiLeiBie,
      yu_lan_url: yuLan,
      mi_deng_jian: '',
    }
    queDingMiDengJian(tuKuai)
    const dangQian = weiZhi ?? guangBiao.value
    let hou: DaiFaGuangBiao
    if (kuaiLieBiao.value.length === 0) {
      const yuanWen = yiLai.shuRuNeiRong.value
      const pian = qiaJia(dangQian.kuaiId === '' ? dangQian.pianYi : yuanWen.length, yuanWen.length)
      const qianKuai = pian === 0 ? null : wenZiKuai(yuanWen.slice(0, pian))
      const houKuai = wenZiKuai(yuanWen.slice(pian))
      luoXieKuaiXuLie(qianKuai ? [qianKuai, tuKuai, houKuai] : [tuKuai, houKuai])
      hou = { kuaiId: houKuai.id, pianYi: 0 }
    } else {
      const kuai = dangQian.kuaiId === '' ? null : huoQuKuai(dangQian.kuaiId)
      if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
        const pian = qiaJia(dangQian.pianYi, kuai.nei_rong.length)
        const xinWen = wenZiKuai(kuai.nei_rong.slice(pian))
        kuai.nei_rong = kuai.nei_rong.slice(0, pian)
        const xiaBiao = huoQuXiaBiao(kuai.id)
        const xinXu: DaiFaKuai[] = []
        for (let suoYin = 0; suoYin < kuaiLieBiao.value.length; suoYin++) {
          xinXu.push(kuaiLieBiao.value[suoYin])
          if (suoYin === xiaBiao) xinXu.push(tuKuai, xinWen)
        }
        luoXieKuaiXuLie(xinXu)
        hou = { kuaiId: xinWen.id, pianYi: 0 }
      } else if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
        // 光标贴在某个图片块的边界（呈现层解析的「贴块锚点」）：块左 ⇒ 插在该块之前，块右 ⇒ 之后
        const chaWei = dangQian.pianYi > 0 ? huoQuXiaBiao(kuai.id) + 1 : huoQuXiaBiao(kuai.id)
        const qianDuan = kuaiLieBiao.value.slice(0, chaWei)
        const houDuan = kuaiLieBiao.value.slice(chaWei)
        const jie: DaiFaKuai[] = [...qianDuan, tuKuai]
        const jieShou = houDuan.length > 0 && shiWenZiKuai(houDuan[0]) ? (houDuan[0] as DaiFaKuai) : null
        const xinWen = jieShou ?? wenZiKuai('')
        if (!jieShou) jie.push(xinWen)
        jie.push(...houDuan)
        luoXieKuaiXuLie(jie)
        hou = { kuaiId: xinWen.id, pianYi: 0 }
      } else {
        // 光标落点不在任何块里（块 id 确已失效）：追加到末尾，并补一个可继续打字的文字段
        const xinWen = wenZiKuai('')
        luoXieKuaiXuLie([...kuaiLieBiao.value, tuKuai, xinWen])
        hou = { kuaiId: xinWen.id, pianYi: 0 }
      }
    }
    xieGuangBiao(hou)
    baoChiTouYing()
    return {
      chengGong: true,
      kuaiId: tuKuai.id,
      yuanYin: chaoXianYuJian() ? 'chao_xian' : '',
      guangBiao: hou,
    }
  }

  /** 纯文本插入（粘贴文本 / Shift+Enter 换行 / 表情面板追加）：一律落在光标处，不追加到末尾 */
  function chaRuWenZi(wenBen: string, weiZhi?: DaiFaGuangBiao | null): boolean {
    if (wenBen === '') return false
    const dangQian = weiZhi ?? guangBiao.value
    if (kuaiLieBiao.value.length === 0) {
      const yuanWen = yiLai.shuRuNeiRong.value
      const pian = qiaJia(dangQian.pianYi, yuanWen.length)
      yiLai.shuRuNeiRong.value = `${yuanWen.slice(0, pian)}${wenBen}${yuanWen.slice(pian)}`
      xieGuangBiao({ kuaiId: '', pianYi: pian + wenBen.length })
      return true
    }
    const kuai = dangQian.kuaiId === '' ? null : huoQuKuai(dangQian.kuaiId)
    if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
      const pian = qiaJia(dangQian.pianYi, kuai.nei_rong.length)
      kuai.nei_rong = `${kuai.nei_rong.slice(0, pian)}${wenBen}${kuai.nei_rong.slice(pian)}`
      xieGuangBiao({ kuaiId: kuai.id, pianYi: pian + wenBen.length })
    } else if (kuai && kuai.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      // 贴块锚点上插字（表情/粘贴走这条链）：块左且左邻是文字块 ⇒ 并进左邻末尾；
      // 否则在该边界新起一个文字块，顺序不再被抹到末尾（FP-10c-12）
      const chaWei = dangQian.pianYi > 0 ? huoQuXiaBiao(kuai.id) + 1 : huoQuXiaBiao(kuai.id)
      const zuoLin = kuaiLieBiao.value[chaWei - 1]
      if (dangQian.pianYi === 0 && shiWenZiKuai(zuoLin)) {
        zuoLin.nei_rong += wenBen
        xieGuangBiao({ kuaiId: zuoLin.id, pianYi: zuoLin.nei_rong.length })
      } else {
        const xin = wenZiKuai(wenBen)
        luoXieKuaiXuLie([
          ...kuaiLieBiao.value.slice(0, chaWei),
          xin,
          ...kuaiLieBiao.value.slice(chaWei),
        ])
        xieGuangBiao({ kuaiId: xin.id, pianYi: wenBen.length })
      }
    } else {
      const moWei = moWeiWenZiKuai()
      if (moWei) {
        moWei.nei_rong += wenBen
        xieGuangBiao({ kuaiId: moWei.id, pianYi: moWei.nei_rong.length })
      } else {
        const xin = wenZiKuai(wenBen)
        luoXieKuaiXuLie([...kuaiLieBiao.value, xin])
        xieGuangBiao({ kuaiId: xin.id, pianYi: wenBen.length })
      }
    }
    baoChiTouYing()
    return true
  }

  /**
   * 呈现层上报此刻的真实光标（块 id + 块内偏移）。
   * 这里绝不按 `shuRuNeiRong` 的长度夹取：上报发生在「DOM → 真源」之前，那一刻投影还是**旧值**，
   * 按旧值夹会把空编辑框里第 2 个字的位置压成 0 ⇒ 插块永远落到句首（真机同现，非仅测试）。
   */
  function gengXinGuangBiao(weiZhi: DaiFaGuangBiao): void {
    xieGuangBiao({ kuaiId: weiZhi.kuaiId, pianYi: qiaJia(weiZhi.pianYi, Number.MAX_SAFE_INTEGER) })
  }

  /**
   * 呈现层（contenteditable）解析出的段序列 ⇦ 唯一写回口。
   * 结构规则全部留在真源侧，组件不复制第二份：相邻文字段并一段、认不出的图片段丢弃
   * （浏览器自己插进来的 img 永远不进发送序列）、序列里没有图片块就退回纯文本态。
   *
   * `xianShiXuanRanIds` 是呈现层「上一次真正画进 DOM 的块 id」：IME 组合期呈现层冻结，
   * 那一刻插进来的块本来就还没出现在 DOM 里，不能按「用户删掉了它」处理（否则组合结束的
   * 那一次同步会把刚插的块吞掉）。只有**渲染过、却在 DOM 里消失**的块才算被删。
   */
  function tongBuCongBianJiQi(duan: BianJiQiDuan[], xianShiXuanRanIds?: string[]): void {
    const zaiDu = new Set<string>()
    for (const xiang of duan) zaiDu.add(xiang.kuaiId)
    const xuanRanJi = new Set(xianShiXuanRanIds ?? kuaiLieBiao.value.map((xiang) => xiang.id))
    const xianZhuang = [...kuaiLieBiao.value]
    const buHuiRou: Array<{ xiaBiao: number; kuai: DaiFaKuai }> = []
    for (let xiaBiao = 0; xiaBiao < xianZhuang.length; xiaBiao++) {
      const xiang = xianZhuang[xiaBiao]
      if (!shiTuPianKuai(xiang) || zaiDu.has(xiang.id)) continue
      if (!xuanRanJi.has(xiang.id)) {
        buHuiRou.push({ xiaBiao, kuai: xiang })
        continue
      }
      // 被用户在 DOM 里整块删掉的图片块：预览地址（blob:）必须在这里回收，漏一次就是永久泄漏
      if (xiang.yu_lan_url) yiLai.huiShouYuLan?.(xiang.yu_lan_url)
    }
    const zhengHe: DaiFaKuai[] = []
    for (const xiang of duan) {
      if (xiang.leiXing === 'tupian') {
        const yuan = huoQuKuai(xiang.kuaiId)
        if (yuan && shiTuPianKuai(yuan)) zhengHe.push(yuan)
        continue
      }
      const wenBen = xiang.neiRong ?? ''
      const qian = zhengHe[zhengHe.length - 1]
      if (shiWenZiKuai(qian)) {
        qian.nei_rong = `${qian.nei_rong}${wenBen}`
        continue
      }
      const yuan = xiang.kuaiId === '' ? undefined : huoQuKuai(xiang.kuaiId)
      if (shiWenZiKuai(yuan)) zhengHe.push({ ...yuan, nei_rong: wenBen })
      else if (wenBen !== '') zhengHe.push(wenZiKuai(wenBen))
    }
    luoXieKuaiXuLie(bingLianXuWenZiKuai(buHuiRouZhiHui(zhengHe, buHuiRou)))
    if (shouLiuChunWenBenTai()) return
    baoChiTouYing()
  }

  /** 把「进过真源但还没被呈现层画过」的图片块按它原来的下标塞回（IME 冻结期的插入不丢） */
  function buHuiRouZhiHui(zhengHe: DaiFaKuai[], buHuiRou: Array<{ xiaBiao: number; kuai: DaiFaKuai }>): DaiFaKuai[] {
    if (buHuiRou.length === 0) return zhengHe
    const jieGuo = [...zhengHe]
    for (const xiang of buHuiRou) jieGuo.splice(Math.min(jieGuo.length, xiang.xiaBiao), 0, xiang.kuai)
    return jieGuo
  }

  /** 异步压缩完成后换回块里的文件（缩略图与预览地址不变，用户不会看到块被重建） */
  function daiHuanKuaiWenJian(id: string, wenJian: File | Blob): boolean {
    const xiang = huoQuKuai(id)
    if (!xiang || !shiTuPianKuai(xiang)) return false
    xiang.wen_jian = wenJian
    return true
  }

  /**
   * 在途压缩台账：压缩在后台跑（不阻塞输入），但**发送前必须等它把压缩后的文件换回块里**——
   * 改造前是「await 压缩 → 再发」，这条保证不能因为图文混排就退化（否则粘贴后立刻点发送
   * 会把未压缩的原图传上去）。页面只登记自己那条已 catch 过的 Promise，永不 reject。
   */
  const zaiTuYaSuo = new Set<Promise<unknown>>()

  function dengJiYaSuo(chengGuo: Promise<unknown>): void {
    zaiTuYaSuo.add(chengGuo)
    const yiWanCheng = () => {
      zaiTuYaSuo.delete(chengGuo)
    }
    void chengGuo.then(yiWanCheng, yiWanCheng)
  }

  async function dengDaiYaSuoWanCheng(): Promise<void> {
    while (zaiTuYaSuo.size > 0) await Promise.allSettled([...zaiTuYaSuo])
  }

  function shanChuKuai(id: string): void {
    const xiaBiao = huoQuXiaBiao(id)
    if (xiaBiao === -1) return
    const xiang = kuaiLieBiao.value[xiaBiao]
    yiLai.huiShouYuLan?.(xiang.yu_lan_url)
    const xinXu = kuaiLieBiao.value.filter((_, suoYin) => suoYin !== xiaBiao)
    luoXieKuaiXuLie(bingLianXuWenZiKuai(xinXu))
    if (guangBiao.value.kuaiId === id) xieGuangBiao({ kuaiId: '', pianYi: 0 })
    if (shouLiuChunWenBenTai()) return
    baoChiTouYing()
  }

  /** 拖拽改序：把 fromId 那块挪到下标 daoXiaBiao（0..len，含末尾）。图片块与文字块同一条序列 */
  function yiDongKuai(fromId: string, daoXiaBiao: number): boolean {
    const cong = huoQuXiaBiao(fromId)
    if (cong === -1) return false
    const muBiao = Math.max(0, Math.min(daoXiaBiao, kuaiLieBiao.value.length - 1))
    if (muBiao === cong) return true
    const xuLie = [...kuaiLieBiao.value]
    const [yiDong] = xuLie.splice(cong, 1)
    xuLie.splice(muBiao, 0, yiDong)
    luoXieKuaiXuLie(bingLianXuWenZiKuai(xuLie))
    baoChiTouYing()
    return true
  }

  /**
   * 交给发送链路的待发块：**原序**导出（空文字块剔除，图片块带着 File/预览/幂等键）。
   * 不在这里做 keTiJiaoKuai —— 未上传的图片块还没有 UUID 媒体 ID，剔除规则由 store 上传完成后统一执行。
   */
  function daiFaKuaiLieBiao(): DaiFaKuai[] {
    return kuaiLieBiao.value
      .filter((xiang) => shiTuPianKuai(xiang) || (xiang.nei_rong ?? '').trim() !== '')
      .map((xiang) => ({ ...xiang }))
  }

  /** 编辑期上限预检（块数 / 图片数 / 文字合计），最终裁定在服务端 */
  function chaoXianYuJian(): boolean {
    return panDingKuaiChaoXian(
      kuaiLieBiao.value.map((xiang) => ({
        lei_xing: xiang.lei_xing,
        nei_rong: xiang.nei_rong,
        mei_ti_id: xiang.mei_ti_id,
      })),
    ).chaoXian
  }

  function qingKong(): void {
    for (const xiang of kuaiLieBiao.value) yiLai.huiShouYuLan?.(xiang.yu_lan_url)
    luoXieKuaiXuLie([])
    xieGuangBiao({ kuaiId: '', pianYi: 0 })
    yiLai.shuRuNeiRong.value = ''
  }

  function meiTiShangChuanWanCheng(id: string, meiTiId: string): void {
    const xiang = huoQuKuai(id)
    if (!xiang) return
    xiang.mei_ti_id = meiTiId
    xiang.wen_jian = null
  }

  /**
   * 外部对投影的写入（表情面板追加、草稿恢复、页面直接赋值）吸进块序列：
   * 后缀增量 ⇒ 追加到最后一个文字块；整体替换 ⇒ 文字并回一个文字块，图片块原位保留。
   * 编辑器自身的写入走 `tongBuCongBianJiQi`，那一刻投影已与块序列一致 ⇒ 这里直接跳过，
   * 于是「块内文字被就地改」不会被误判成整体替换而把图文顺序抹平。
   */
  watch(
    () => yiLai.shuRuNeiRong.value,
    (zhi) => {
      if (kuaiLieBiao.value.length === 0) return
      const xianZai = touYingWenBen()
      if (zhi === xianZai) return
      if (zhi.length > xianZai.length && zhi.startsWith(xianZai)) {
        const moWei = moWeiWenZiKuai()
        chaRuWenZi(
          zhi.slice(xianZai.length),
          moWei ? { kuaiId: moWei.id, pianYi: moWei.nei_rong.length } : null,
        )
        return
      }
      const tuKuai = kuaiLieBiao.value.filter((xiang) => shiTuPianKuai(xiang))
      luoXieKuaiXuLie(zhi === '' ? [] : [wenZiKuai(zhi), ...tuKuai])
      if (zhi === '') {
        yiLai.shuRuNeiRong.value = ''
        xieGuangBiao({ kuaiId: '', pianYi: 0 })
        return
      }
      baoChiTouYing()
    },
  )

  const youTuPianKuai = computed(() => kuaiLieBiao.value.some((xiang) => shiTuPianKuai(xiang)))
  const tuPianShu = computed(() => kuaiLieBiao.value.filter((xiang) => shiTuPianKuai(xiang)).length)

  return {
    kuaiLieBiao,
    guangBiao,
    youTuPianKuai,
    tuPianShu,
    chaRuTuPian,
    chaRuWenZi,
    gengXinGuangBiao,
    tongBuCongBianJiQi,
    daiHuanKuaiWenJian,
    dengJiYaSuo,
    dengDaiYaSuoWanCheng,
    shanChuKuai,
    yiDongKuai,
    daiFaKuaiLieBiao,
    chaoXianYuJian,
    qingKong,
    meiTiShangChuanWanCheng,
    touYingWenBen,
  }
}

export type DaiFaTuWen = ReturnType<typeof use待发图文>
