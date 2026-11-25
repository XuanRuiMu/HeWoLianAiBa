import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  chuangJianZhanJiFenLei as chuangJianZhanJiFenLeiQingQiu,
  gengMingZhanJiFenLei,
  huoQuDangAnLieBiao,
  huoQuZhanJiFenLeiLieBiao,
  paiXuFenLeiNeiZhanJi,
  shanChuZhanJiFenLei,
  sheZhiMoRenZhanJiFenLei,
  baoCunZhanJiFenLeiPaiXu,
  yiDongDangAnDaoFenLei,
} from '@/api/聊天'
import { huoQuFanYi } from '@/config/翻译表'
import { chuangJianQianTaiCuoWu, 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import { QianTaiDaiMa } from '@/config/前台错误码'
import type { DangAnXiangQing, ZhanJiFenLei } from '@/types/类型定义'

export type ZhanJiCunKuanJieGuoLeiXing =
  | 'success'
  | 'default-protected'
  | 'invalid'
  | 'conflict'
  | 'failed'
  | 'busy'

export interface ZhanJiCunKuanJieGuo {
  ok: boolean
  kind: ZhanJiCunKuanJieGuoLeiXing
  tiShiWenBen: string
  movedRecordCount?: number
  fallbackCategoryId?: string
}

function shiChengGong(jieGuo: Omit<ZhanJiCunKuanJieGuo, 'ok' | 'kind' | 'tiShiWenBen'> = {}): ZhanJiCunKuanJieGuo {
  return {
    ok: true,
    kind: 'success',
    tiShiWenBen: '',
    ...jieGuo,
  }
}

function shiBaoHuJieGuo(kind: ZhanJiCunKuanJieGuoLeiXing, tiShiWenBen: string): ZhanJiCunKuanJieGuo {
  return { ok: false, kind, tiShiWenBen }
}

function shiChongTu(cuoWu: unknown): boolean {
  const daiMa = 归一前台错误(cuoWu).code
  return daiMa === QianTaiDaiMa.ZHAN_JI_FEN_LEI_BIAN_GENG || daiMa === QianTaiDaiMa.RESOURCE_CONFLICT
}

function paiXuZiDuanDengYu(ids: string[]): boolean {
  return ids.length === new Set(ids).size
}

export const 使用战绩仓库 = defineStore('战绩', () => {
  const fenLeiLieBiao = ref<ZhanJiFenLei[]>([])
  const moRenFenLeiId = ref('')
  const dangQianFenLeiId = ref('')
  const dangAnLieBiao = ref<DangAnXiangQing[]>([])
  const jiaZaiZhong = ref(false)
  const jiLuJiaZaiZhong = ref(false)
  const caoZuoZhong = ref(false)
  const paiXuZhong = ref(false)
  const yiDongZhongId = ref<string | null>(null)
  const cuoWuXinXi = ref('')
  const qianTaiCuoWu = ref<QianTaiCuoWu | null>(null)
  const fenLeiZhuangTai = ref<'weiKaiShi' | 'chengGong' | 'shiBai'>('weiKaiShi')
  const jiLuXianShiPaiXu = ref<string[] | null>(null)
  let shenFenFu = 0

  function sheZhiQianTaiCuoWu(zhengChangHua: QianTaiCuoWu, keChongShi = false): void {
    if (!zhengChangHua.xianShi) return
    const keYong = keChongShi
      ? chuangJianQianTaiCuoWu({
          code: zhengChangHua.code,
          retryable: true,
          traceId: zhengChangHua.traceId,
          retryAfterMs: zhengChangHua.retryAfterMs,
          yingXiang: zhengChangHua.yingXiang,
          xiaYiBu: zhengChangHua.xiaYiBu,
        })
      : zhengChangHua
    qianTaiCuoWu.value = keYong
    cuoWuXinXi.value = keYong.yingXiang
  }

  function jiLuCuoWu(cuoWu: unknown): QianTaiCuoWu {
    const zhengChangHua = 归一前台错误(cuoWu)
    sheZhiQianTaiCuoWu(zhengChangHua)
    return zhengChangHua
  }

  function qingCuoWu(): void {
    qianTaiCuoWu.value = null
    cuoWuXinXi.value = ''
  }

  const fenLeiKeYong = computed(() => fenLeiZhuangTai.value === 'chengGong')

  const dangQianFenLei = computed(
    () => fenLeiLieBiao.value.find((item) => item.id === dangQianFenLeiId.value) ?? null,
  )

  async function duQuFenLeiLieBiao(): Promise<{
    moRenFenLeiId: string
    fenLeiLieBiao: ZhanJiFenLei[]
  }> {
    const jieGuo = await huoQuZhanJiFenLeiLieBiao()
    fenLeiLieBiao.value = jieGuo.fenLeiLieBiao
    moRenFenLeiId.value = jieGuo.moRenFenLeiId
    return jieGuo
  }

  async function jiaZaiDangQianFenLei(categoryId: string): Promise<boolean> {
    const shenFen = ++shenFenFu
    dangQianFenLeiId.value = categoryId
    jiLuXianShiPaiXu.value = null
    jiLuJiaZaiZhong.value = true
    qingCuoWu()
    try {
      const lieBiao = await huoQuDangAnLieBiao(categoryId)
      if (shenFen !== shenFenFu || categoryId !== dangQianFenLeiId.value) return false
      dangAnLieBiao.value = lieBiao
      return true
    } catch (cuoWu) {
      if (shenFen === shenFenFu && categoryId === dangQianFenLeiId.value) {
        jiLuCuoWu(cuoWu)
      }
      return false
    } finally {
      if (shenFen === shenFenFu) jiLuJiaZaiZhong.value = false
    }
  }

  async function jiaZai(): Promise<void> {
    jiaZaiZhong.value = true
    qingCuoWu()
    try {
      const jieGuo = await duQuFenLeiLieBiao()
      fenLeiZhuangTai.value = 'chengGong'
      const xianYou = fenLeiLieBiao.value.some((item) => item.id === dangQianFenLeiId.value)
      const mubiao = xianYou
        ? dangQianFenLeiId.value
        : fenLeiLieBiao.value.some((item) => item.id === jieGuo.moRenFenLeiId)
          ? jieGuo.moRenFenLeiId
          : (fenLeiLieBiao.value[0]?.id ?? '')
      if (mubiao) await jiaZaiDangQianFenLei(mubiao)
    } catch (cuoWu) {
      fenLeiZhuangTai.value = 'shiBai'
      jiLuCuoWu(cuoWu)
    } finally {
      jiaZaiZhong.value = false
    }
  }

  async function qieHuanFenLei(categoryId: string): Promise<boolean> {
    if (caoZuoZhong.value) return false
    if (!fenLeiLieBiao.value.some((item) => item.id === categoryId)) return false
    if (categoryId === dangQianFenLeiId.value && !jiLuJiaZaiZhong.value) return true
    return jiaZaiDangQianFenLei(categoryId)
  }

  async function chongXinJiaZai(): Promise<void> {
    if (caoZuoZhong.value) return
    await jiaZai()
  }

  async function chuangJian(mingCheng: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const jingZhengMingCheng = mingCheng.trim()
    if (!jingZhengMingCheng) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'canShuBuHeFa'))
    caoZuoZhong.value = true
    qingCuoWu()
    try {
      const xinFenLei = await chuangJianZhanJiFenLeiQingQiu(jingZhengMingCheng)
      await duQuFenLeiLieBiao()
      if (fenLeiLieBiao.value.some((item) => item.id === xinFenLei.id)) {
        await jiaZaiDangQianFenLei(xinFenLei.id)
      }
      return shiChengGong()
    } catch (cuoWu) {
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const tiShiWenBen = zhengChangHua.lianAiWenAn
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', tiShiWenBen)
      }
      return shiBaoHuJieGuo('failed', tiShiWenBen)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function gengMing(categoryId: string, mingCheng: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const fenLei = fenLeiLieBiao.value.find((item) => item.id === categoryId)
    if (!fenLei) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    const jingZhengMingCheng = mingCheng.trim()
    if (!jingZhengMingCheng) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'canShuBuHeFa'))
    caoZuoZhong.value = true
    qingCuoWu()
    try {
      const jieGuo = await gengMingZhanJiFenLei(categoryId, jingZhengMingCheng, fenLei.version)
      fenLeiLieBiao.value = fenLeiLieBiao.value.map((item) => item.id === categoryId ? jieGuo : item)
      return shiChengGong()
    } catch (cuoWu) {
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const tiShiWenBen = zhengChangHua.lianAiWenAn
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', tiShiWenBen)
      }
      return shiBaoHuJieGuo('failed', tiShiWenBen)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function shanChu(categoryId: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const fenLei = fenLeiLieBiao.value.find((item) => item.id === categoryId)
    if (!fenLei) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    if (fenLei.is_default) {
      const tiShiWenBen = huoQuFanYi('tongYong', 'canShuBuHeFa')
      cuoWuXinXi.value = tiShiWenBen
      return shiBaoHuJieGuo('default-protected', tiShiWenBen)
    }
    caoZuoZhong.value = true
    qingCuoWu()
    try {
      const jieGuo = await shanChuZhanJiFenLei(categoryId, fenLei.version)
      if (categoryId === dangQianFenLeiId.value) {
        dangQianFenLeiId.value = jieGuo.fallback_category_id
      }
      await duQuFenLeiLieBiao()
      if (dangQianFenLeiId.value && fenLeiLieBiao.value.some((item) => item.id === dangQianFenLeiId.value)) {
        await jiaZaiDangQianFenLei(dangQianFenLeiId.value)
      } else {
        dangQianFenLeiId.value = moRenFenLeiId.value
        if (moRenFenLeiId.value) await jiaZaiDangQianFenLei(moRenFenLeiId.value)
      }
      return shiChengGong({
        movedRecordCount: jieGuo.moved_record_count,
        fallbackCategoryId: jieGuo.fallback_category_id,
      })
    } catch (cuoWu) {
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const tiShiWenBen = zhengChangHua.lianAiWenAn
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', tiShiWenBen)
      }
      return shiBaoHuJieGuo('failed', tiShiWenBen)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function sheZhiMoRen(categoryId: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const fenLei = fenLeiLieBiao.value.find((item) => item.id === categoryId)
    if (!fenLei) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    if (fenLei.is_default) return shiChengGong()
    caoZuoZhong.value = true
    qingCuoWu()
    try {
      const jieGuo = await sheZhiMoRenZhanJiFenLei(categoryId, fenLei.version)
      fenLeiLieBiao.value = fenLeiLieBiao.value.map((item) => {
        if (item.id === categoryId) return jieGuo
        if (item.is_default) return { ...item, is_default: false, version: item.version + 1 }
        return item
      })
      moRenFenLeiId.value = categoryId
      return shiChengGong()
    } catch (cuoWu) {
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const tiShiWenBen = zhengChangHua.lianAiWenAn
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', tiShiWenBen)
      }
      return shiBaoHuJieGuo('failed', tiShiWenBen)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function baoCunFenLeiPaiXu(fenLeiIds: string[]): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    if (
      !Array.isArray(fenLeiIds) ||
      fenLeiIds.length !== fenLeiLieBiao.value.length ||
      !paiXuZiDuanDengYu(fenLeiIds) ||
      !fenLeiIds.every((id) => fenLeiLieBiao.value.some((item) => item.id === id))
    ) {
      return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    caoZuoZhong.value = true
    qingCuoWu()
    const beiFen = fenLeiLieBiao.value
    const xiangPaiXu = new Map(fenLeiIds.map((id, yin) => [id, yin]))
    fenLeiLieBiao.value = [...beiFen].sort((a, b) => (xiangPaiXu.get(a.id) ?? 0) - (xiangPaiXu.get(b.id) ?? 0))
    try {
      const jieGuo = await baoCunZhanJiFenLeiPaiXu(fenLeiIds)
      fenLeiLieBiao.value = jieGuo.fenLeiLieBiao
      moRenFenLeiId.value = jieGuo.moRenFenLeiId
      return shiChengGong()
    } catch (cuoWu) {
      fenLeiLieBiao.value = beiFen
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const tiShiWenBen = zhengChangHua.lianAiWenAn
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', tiShiWenBen)
      }
      return shiBaoHuJieGuo('failed', tiShiWenBen)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function yiDongDangAn(recordId: string, targetCategoryId: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const yuanFenLei = dangQianFenLei.value
    const muBiaoFenLei = fenLeiLieBiao.value.find((item) => item.id === targetCategoryId)
    const dangAnJiLu = dangAnLieBiao                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    