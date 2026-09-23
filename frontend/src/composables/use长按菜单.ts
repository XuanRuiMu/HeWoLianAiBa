import { ref, shallowRef, type Ref } from 'vue'
import { XIAO_XI_PEI_ZHI, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'
import type { TuPianCaiDanXiang, WenBenCaiDanXiang, YuYinCaiDanXiang } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import { shiBenDiLinShiXiaoXi } from '@/utils/消息内容块'
import type { 消息 } from '@/types'

/**
 * 菜单状态机真正消费的消息形状（AI 聊天页的 `消息` 与好友页的 `HaoYouXiaoXi` 都满足它）。
 * 好友消息没有 `fa_song_zhe_lei_xing`，故 `keXianShiCheHui` 恒 false —— 好友页的图片菜单
 * 只有「添加到表情」，撤回仍由该页既有的行内按钮承担。
 */
export interface CaiDanXiaoXi {
  id: string
  nei_rong: string
  lei_xing: string
  shi_jian_chuo: number
  yi_che_hui?: boolean
  fa_song_zhe_lei_xing?: string
  ke_hu_duan_id?: string
}

interface Use长按菜单依赖<T> {
  dangQianShiJian: Ref<number>
  cheHuiXiaoXi: (xiaoXiId: string) => Promise<void>
  qieHuanYuYinZhuanWenZi?: (xiaoXi: T) => Promise<void>
  fuZhiWenBen?: (wenBen: string) => Promise<boolean>
  fanYiQingQiu?: (wenBen: string, yuanYu?: string, muBiaoYu?: string) => Promise<string>
  tianJiaDaoBiaoQing?: (xiaoXi: T) => Promise<void>
  sheZhiCuoWu?: (xinXi: string) => void
  /**
   * FP-08d（需求 #5）：该页的图片菜单是否接「引用」。引用要真能发出去，页面必须同时具备
   * 引用条与被引用槽（AI 聊天页有；好友页的 `好友消息` 至今无该列，挂载归 FP-21）——
   * 没接线就不给入口，免得点下去要么静默无效、要么误落到「添加到表情」。
   */
  zhiChiTuPianYinYong?: boolean
}

function shiYuYinXiaoXi(xiaoXi: CaiDanXiaoXi): boolean {
  return xiaoXi.lei_xing === 'yuYin' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
}

function shiWenBenXiaoXi(xiaoXi: CaiDanXiaoXi): boolean {
  return xiaoXi.lei_xing === 'wenben' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
}

// FP-20：图片气泡判定只看 lei_xing（与 FP-06b「相册/粘贴发的=图片、面板里加出去的=表情包」同一真源），
// 故表情包/语音/文件/系统/已撤回一律不出现「添加到表情」，AI 发来的图与自己发的图一律同权。
function shiTuPianXiaoXi(xiaoXi: CaiDanXiaoXi): boolean {
  return (
    xiaoXi.lei_xing === 'tuPian' && !xiaoXi.yi_che_hui && xiaoXi.fa_song_zhe_lei_xing !== 'xitong'
  )
}

/**
 * 引用目标的准入门（与撤回项的 `keXianShiCheHui` 同一位置的菜单项判定）。
 * 只挡一件事：**还没落库的本地乐观气泡**——它的 `id` 是 store 自己造的临时串，服务端把它当被引用消息
 * 主键用必然判非法（`backend/src/services/消息.ts` ⇒ 400 `yinYongXiaoXiFeiFa`），于是「引用我刚发出的
 * 那句话」恒失败。判定本体在 `utils/消息内容块.ts::shiBenDiLinShiXiaoXi`（全仓一份），这里不重述规则。
 */
function keYinYongXiaoXi(xiaoXi: CaiDanXiaoXi | null | undefined): boolean {
  return !!xiaoXi && !shiBenDiLinShiXiaoXi(xiaoXi)
}

function wenBenJian(xiaoXi: CaiDanXiaoXi): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

async function moRenFuZhi(wenBen: string): Promise<boolean> {
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
      const jieGuo = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
      document.body.removeChild(wenBenYu)
      return !!jieGuo
    }
    return false
  } catch {
    return false
  }
}

/**
 * 引用摘要的唯一出口（FP-09 起模块级公开）：发送前引用条与气泡内引用块都调它，
 * 页面不再各抄一份截断规则。上限住在 LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu，
 * 语音目标的占位走翻译文件，禁在调用方补第二份口径。
 */
export function huoQuYinYongZhaiYao(xiaoXi: CaiDanXiaoXi): string {
  if (xiaoXi.lei_xing === 'yuYin') return huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei')
  const neiRong = xiaoXi.nei_rong || ''
  const shangXian = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu
  if (neiRong.length <= shangXian) return neiRong
  return `${neiRong.slice(0, shangXian)}...`
}

/**
 * 文档选区接管的唯一前置判定（FP-10c M-2 的共用出口；聊天组件谁要清选区都从这里取，不再各写一份）。
 *
 * `removeAllRanges()` 动的是**整份文档**的选区，不是编辑区自己的：用户在页面别处（会话气泡、跨元素
 * 整段拖选、另一个输入框）选中了文字时，输入区一次重建就把那份选区拆成光标。于是判据只有两条，
 * 任一成立才认为「这块选区本来就是我的」：
 *  ①焦点落在编辑器内部（含编辑器自身）；
 *  ②当前选区的首尾端点都落在编辑器内部（拖选整段在自己的文字流里）。
 * 判定放在**改写 DOM 之前**：先把文字节点摘掉、再看选区是否还在编辑器内，得到的永远是「不在」。
 */
export function keYiJieGuanXuanQu(cao: Node | null | undefined, xuanQu?: Selection | null): boolean {
  if (!cao || typeof document === 'undefined') return false
  const huoYue = document.activeElement
  if (huoYue && cao.contains(huoYue)) return true
  if (!xuanQu || xuanQu.rangeCount === 0) return false
  return cao.contains(xuanQu.anchorNode) && cao.contains(xuanQu.focusNode)
}

export function use长按菜单<T extends CaiDanXiaoXi = 消息>(yiLai: Use长按菜单依赖<T>) {
  const cheHuiCaiDanZhanKai = ref(false)
  const cheHuiCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongXiaoXi = shallowRef<T | null>(null)
  const yuYinCaiDanZhanKai = ref(false)
  const yuYinCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongYuYin = shallowRef<T | null>(null)
  const yinYongXiaoXi = shallowRef<T | null>(null)
  const wenBenCaiDanZhanKai = ref(false)
  const wenBenCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongWenBen = shallowRef<T | null>(null)
  const tuPianCaiDanZhanKai = ref(false)
  const tuPianCaiDanYangShi = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
  const xuanZhongTuPian = shallowRef<T | null>(null)
  const fanYiJieGuoJiLu = ref(new Map<string, string>())
  const fanYiZhongJiHe = ref(new Set<string>())
  const fanYiZhanKaiJiHe = ref(new Set<string>())
  const fanYiYuanYu = ref('auto')
  const fanYiMuBiaoYu = ref('zh')
  let changAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let yuYinChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let wenBenChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null
  let tuPianChangAnDingShiQi: ReturnType<typeof setTimeout> | null = null

  function daKaiCaiDan(xiaoXi: T, shiJian: MouseEvent) {
    if (shiYuYinXiaoXi(xiaoXi)) return
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
    if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
    xuanZhongXiaoXi.value = xiaoXi
    cheHuiCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    cheHuiCaiDanZhanKai.value = true
  }

  function chuMoKaiShi(xiaoXi: T) {
    if (shiYuYinXiaoXi(xiaoXi)) return
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu' || xiaoXi.yi_che_hui) return
    if (Date.now() - xiaoXi.shi_jian_chuo > XIAO_XI_PEI_ZHI.cheHuiShiXian) return
    changAnDingShiQi = setTimeout(() => {
      xuanZhongXiaoXi.value = xiaoXi
      cheHuiCaiDanZhanKai.value = true
    }, 500)
  }

  function chuMoJieShu() {
    if (changAnDingShiQi) {
      clearTimeout(changAnDingShiQi)
      changAnDingShiQi = null
    }
  }

  function daKaiYuYinCaiDan(xiaoXi: T, shiJian: MouseEvent) {
    if (!shiYuYinXiaoXi(xiaoXi)) return
    xuanZhongYuYin.value = xiaoXi
    yuYinCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    yuYinCaiDanZhanKai.value = true
  }

  function chuMoKaiShiYuYin(xiaoXi: T) {
    if (!shiYuYinXiaoXi(xiaoXi)) return
    yuYinChangAnDingShiQi = setTimeout(() => {
      xuanZhongYuYin.value = xiaoXi
      yuYinCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShuYuYin() {
    if (yuYinChangAnDingShiQi) {
      clearTimeout(yuYinChangAnDingShiQi)
      yuYinChangAnDingShiQi = null
    }
  }

  function guanBiYuYinCaiDan() {
    yuYinCaiDanZhanKai.value = false
    xuanZhongYuYin.value = null
  }

  function huoQuYuYinCaiDanXiang(xiaoXi?: T): YuYinCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongYuYin.value
    const quanBu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang]
    // 与文本/图片菜单同一条准入：在途的乐观气泡没有「引用」这项（点了也只会换来一句服务端 400）
    if (muBiao && !keYinYongXiaoXi(muBiao)) return quanBu.filter((xiang) => xiang !== 'yinYong')
    return quanBu
  }

  /**
   * 引用槽的**唯一出口**（FP-10c M-3）：三个菜单执行口与页面的 `sheZhiYinYong` 全走这里。
   * 槽是 `shallowRef` 且存的是**那个对象本身**，服务端确认后 `jiaRuXiaoXi` 只替换列表元素、不会回头
   * 改槽里的旧对象 ⇒ 脏 id 一旦进来就不会自愈，所以只能在入口拒。拒绝对象只有本地临时气泡。
   */
  function sheZhiYinYongMuBiao(muBiao: T): boolean {
    if (!keYinYongXiaoXi(muBiao)) return false
    yinYongXiaoXi.value = muBiao
    return true
  }

  async function zhiXingYuYinCaiDanXiang(xiang: YuYinCaiDanXiang) {
    const muBiao = xuanZhongYuYin.value
    guanBiYuYinCaiDan()
    if (!muBiao) return
    if (xiang === 'yinYong') {
      sheZhiYinYongMuBiao(muBiao)
      return
    }
    await yiLai.qieHuanYuYinZhuanWenZi?.(muBiao)
  }

  function daKaiWenBenCaiDan(xiaoXi: T, shiJian: MouseEvent) {
    if (!shiWenBenXiaoXi(xiaoXi)) return
    xuanZhongWenBen.value = xiaoXi
    wenBenCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    wenBenCaiDanZhanKai.value = true
  }

  function chuMoKaiShiWenBen(xiaoXi: T) {
    if (!shiWenBenXiaoXi(xiaoXi)) return
    wenBenChangAnDingShiQi = setTimeout(() => {
      xuanZhongWenBen.value = xiaoXi
      wenBenCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShuWenBen() {
    if (wenBenChangAnDingShiQi) {
      clearTimeout(wenBenChangAnDingShiQi)
      wenBenChangAnDingShiQi = null
    }
  }

  function guanBiWenBenCaiDan() {
    wenBenCaiDanZhanKai.value = false
    xuanZhongWenBen.value = null
  }

  function keXianShiCheHui(xiaoXi: T): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  function huoQuWenBenCaiDanXiang(xiaoXi?: T): WenBenCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongWenBen.value
    const quanBu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang]
    if (!muBiao) return quanBu
    const kejian = keYinYongXiaoXi(muBiao) ? quanBu : quanBu.filter((xiang) => xiang !== 'yinYong')
    if (keXianShiCheHui(muBiao)) return kejian
    return kejian.filter((xiang) => xiang !== 'cheHui')
  }

  function huoQuFanYiJieGuo(xiaoXi: T): string | undefined {
    return fanYiJieGuoJiLu.value.get(wenBenJian(xiaoXi))
  }

  function shiFanYiZhong(xiaoXi: T): boolean {
    return fanYiZhongJiHe.value.has(wenBenJian(xiaoXi))
  }

  function shiFanYiZhanKai(xiaoXi: T): boolean {
    return fanYiZhanKaiJiHe.value.has(wenBenJian(xiaoXi))
  }

  async function qiangZhiFanYi(xiaoXi: T): Promise<string | null> {
    const jian = wenBenJian(xiaoXi)
    fanYiJieGuoJiLu.value.delete(jian)
    fanYiZhanKaiJiHe.value.delete(jian)
    return qingQiuWenBenFanYi(xiaoXi)
  }

  async function qingQiuWenBenFanYi(xiaoXi: T): Promise<string | null> {
    const jian = wenBenJian(xiaoXi)
    if (fanYiZhanKaiJiHe.value.has(jian)) {
      fanYiZhanKaiJiHe.value.delete(jian)
      return fanYiJieGuoJiLu.value.get(jian) ?? null
    }
    const yiCun = fanYiJieGuoJiLu.value.get(jian)
    if (yiCun) {
      fanYiZhanKaiJiHe.value.add(jian)
      return yiCun
    }
    if (fanYiZhongJiHe.value.has(jian)) return null
    const yuanWen = (xiaoXi.nei_rong || '').trim()
    if (!yuanWen) {
      yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
      return null
    }
    fanYiZhongJiHe.value.add(jian)
    try {
      if (!yiLai.fanYiQingQiu) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
        return null
      }
      const jieGuo = await yiLai.fanYiQingQiu(yuanWen, fanYiYuanYu.value, fanYiMuBiaoYu.value)
      const qingLi = (jieGuo || '').trim()
      if (!qingLi) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
        return null
      }
      fanYiJieGuoJiLu.value.set(jian, qingLi)
      fanYiZhanKaiJiHe.value.add(jian)
      return qingLi
    } catch {
      yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fanYiShiBai'))
      return null
    } finally {
      fanYiZhongJiHe.value.delete(jian)
    }
  }

  async function zhiXingWenBenCaiDanXiang(xiang: WenBenCaiDanXiang) {
    const muBiao = xuanZhongWenBen.value
    guanBiWenBenCaiDan()
    if (!muBiao) return
    if (xiang === 'yinYong') {
      sheZhiYinYongMuBiao(muBiao)
      return
    }
    if (xiang === 'cheHui') {
      await yiLai.cheHuiXiaoXi(muBiao.id)
      return
    }
    if (xiang === 'fuZhi') {
      const fuZhiHanShu = yiLai.fuZhiWenBen ?? moRenFuZhi
      const chengGong = await fuZhiHanShu(muBiao.nei_rong || '')
      if (!chengGong) {
        yiLai.sheZhiCuoWu?.(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
      }
      return
    }
    await qingQiuWenBenFanYi(muBiao)
  }

  function daKaiTuPianCaiDan(xiaoXi: T, shiJian: MouseEvent) {
    if (!shiTuPianXiaoXi(xiaoXi)) return
    xuanZhongTuPian.value = xiaoXi
    tuPianCaiDanYangShi.value = {
      top: `${shiJian.clientY}px`,
      left: `${shiJian.clientX}px`,
    }
    tuPianCaiDanZhanKai.value = true
  }

  function chuMoKaiShiTuPian(xiaoXi: T) {
    if (!shiTuPianXiaoXi(xiaoXi)) return
    tuPianChangAnDingShiQi = setTimeout(() => {
      xuanZhongTuPian.value = xiaoXi
      tuPianCaiDanZhanKai.value = true
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
  }

  function chuMoJieShuTuPian() {
    if (tuPianChangAnDingShiQi) {
      clearTimeout(tuPianChangAnDingShiQi)
      tuPianChangAnDingShiQi = null
    }
  }

  function guanBiTuPianCaiDan() {
    tuPianCaiDanZhanKai.value = false
    xuanZhongTuPian.value = null
  }

  function huoQuTuPianCaiDanXiang(xiaoXi?: T): TuPianCaiDanXiang[] {
    const muBiao = xiaoXi ?? xuanZhongTuPian.value
    const quanBu = (
      yiLai.zhiChiTuPianYinYong
        ? [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang]
        : LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang.filter(
            (xiang) => xiang !== 'yinYong',
          )
    ) as TuPianCaiDanXiang[]
    // 引用项与文本/语音菜单同一条准入：在途的乐观气泡不给入口
    const kejian = muBiao && !keYinYongXiaoXi(muBiao) ? quanBu.filter((xiang) => xiang !== 'yinYong') : quanBu
    // 撤回项与文本菜单同一判定：自己发的且在窗口内才有，AI 发来的图只有「添加到表情」
    if (muBiao && !keXianShiCheHui(muBiao)) {
      return kejian.filter((xiang) => xiang !== 'cheHui')
    }
    return kejian
  }

  async function zhiXingTuPianCaiDanXiang(xiang: TuPianCaiDanXiang) {
    const muBiao = xuanZhongTuPian.value
    guanBiTuPianCaiDan()
    if (!muBiao) return
    if (xiang === 'cheHui') {
      await yiLai.cheHuiXiaoXi(muBiao.id)
      return
    }
    if (xiang === 'yinYong') {
      // FP-08d：与文本 / 语音菜单同一个真源、同一个落点（引用态只此一份，页面不再各接一次）
      sheZhiYinYongMuBiao(muBiao)
      return
    }
    await yiLai.tianJiaDaoBiaoQing?.(muBiao)
  }

  function sheZhiYinYong(xiaoXi: T) {
    sheZhiYinYongMuBiao(xiaoXi)
    guanBiYuYinCaiDan()
    guanBiWenBenCaiDan()
  }

  function quXiaoYinYong() {
    yinYongXiaoXi.value = null
  }

  async function zhiXingCheHui() {
    cheHuiCaiDanZhanKai.value = false
    if (!xuanZhongXiaoXi.value) return
    await yiLai.cheHuiXiaoXi(xuanZhongXiaoXi.value.id)
    xuanZhongXiaoXi.value = null
  }

  function xianShiCheHuiAnNiu(xiaoXi: T): boolean {
    if (xiaoXi.fa_song_zhe_lei_xing !== 'yonghu') return false
    if (xiaoXi.yi_che_hui) return false
    if (!xiaoXi.shi_jian_chuo) return false
    return yiLai.dangQianShiJian.value - xiaoXi.shi_jian_chuo <= XIAO_XI_PEI_ZHI.cheHuiShiXian
  }

  async function zhiXingCheHuiXiaoXi(xiaoXi: T) {
    await yiLai.cheHuiXiaoXi(xiaoXi.id)
  }

  return {
    cheHuiCaiDanZhanKai,
    cheHuiCaiDanYangShi,
    daKaiCaiDan,
    chuMoKaiShi,
    chuMoJieShu,
    zhiXingCheHui,
    xianShiCheHuiAnNiu,
    zhiXingCheHuiXiaoXi,
    yuYinCaiDanZhanKai,
    yuYinCaiDanYangShi,
    daKaiYuYinCaiDan,
    chuMoKaiShiYuYin,
    chuMoJieShuYuYin,
    guanBiYuYinCaiDan,
    huoQuYuYinCaiDanXiang,
    zhiXingYuYinCaiDanXiang,
    wenBenCaiDanZhanKai,
    wenBenCaiDanYangShi,
    daKaiWenBenCaiDan,
    chuMoKaiShiWenBen,
    chuMoJieShuWenBen,
    guanBiWenBenCaiDan,
    huoQuWenBenCaiDanXiang,
    zhiXingWenBenCaiDanXiang,
    tuPianCaiDanZhanKai,
    tuPianCaiDanYangShi,
    daKaiTuPianCaiDan,
    chuMoKaiShiTuPian,
    chuMoJieShuTuPian,
    guanBiTuPianCaiDan,
    huoQuTuPianCaiDanXiang,
    zhiXingTuPianCaiDanXiang,
    huoQuFanYiJieGuo,
    shiFanYiZhong,
    shiFanYiZhanKai,
    qingQiuWenBenFanYi,
    qiangZhiFanYi,
    fanYiYuanYu,
    fanYiMuBiaoYu,
    yinYongXiaoXi,
    sheZhiYinYong,
    quXiaoYinYong,
    huoQuYinYongZhaiYao,
  }
}
