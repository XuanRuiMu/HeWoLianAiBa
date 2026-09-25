import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  chuangJianZhanJiFenLei as chuangJianZhanJiFenLeiQingQiu,
  gengMingZhanJiFenLei,
  huoQuDangAnLieBiao,
  huoQuZhanJiFenLeiLieBiao,
  paiXuFenLeiNeiZhanJi,
  shanChuZhanJiFenLei,
  yiDongDangAnDaoFenLei,
} from '@/api/聊天'
import { huoQuFanYi } from '@/config/translations'
import { chuangJianQianTaiCuoWu, 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import type { DangAnXiangQing, ZhanJiFenLei } from '@/types'

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
  message: string
  movedRecordCount?: number
  fallbackCategoryId?: string
}

function shiChengGong(jieGuo: Omit<ZhanJiCunKuanJieGuo, 'ok' | 'kind' | 'message'> = {}): ZhanJiCunKuanJieGuo {
  return {
    ok: true,
    kind: 'success',
    message: huoQuFanYi('tongYong', 'caoZuoChengGong'),
    ...jieGuo,
  }
}

function shiBaoHuJieGuo(kind: ZhanJiCunKuanJieGuoLeiXing, message: string): ZhanJiCunKuanJieGuo {
  return { ok: false, kind, message }
}

function shiChongTu(cuoWu: unknown): boolean {
  const daiMa = 归一前台错误(cuoWu).code
  return daiMa === QIAN_TAI_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG || daiMa === QIAN_TAI_DAI_MA.RESOURCE_CONFLICT
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
    dangAnLieBiao.value = []
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
      const xianYou = fenLeiLieBiao.value.some((item) => item.id === dangQianFenLeiId.value)
      const mubiao = xianYou
        ? dangQianFenLeiId.value
        : fenLeiLieBiao.value.some((item) => item.id === jieGuo.moRenFenLeiId)
          ? jieGuo.moRenFenLeiId
          : (fenLeiLieBiao.value[0]?.id ?? '')
      if (mubiao) await jiaZaiDangQianFenLei(mubiao)
    } catch (cuoWu) {
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
      const message = zhengChangHua.yingXiang
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', message)
      }
      return shiBaoHuJieGuo('failed', message)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function gengMing(categoryId: string, mingCheng: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const fenLei = fenLeiLieBiao.value.find((item) => item.id === categoryId)
    if (!fenLei) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    if (fenLei.is_default) {
      const message = huoQuFanYi('tongYong', 'canShuBuHeFa')
      cuoWuXinXi.value = message
      return shiBaoHuJieGuo('default-protected', message)
    }
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
      const message = zhengChangHua.yingXiang
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', message)
      }
      return shiBaoHuJieGuo('failed', message)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function shanChu(categoryId: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const fenLei = fenLeiLieBiao.value.find((item) => item.id === categoryId)
    if (!fenLei) return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    if (fenLei.is_default) {
      const message = huoQuFanYi('tongYong', 'canShuBuHeFa')
      cuoWuXinXi.value = message
      return shiBaoHuJieGuo('default-protected', message)
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
      const message = zhengChangHua.yingXiang
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', message)
      }
      return shiBaoHuJieGuo('failed', message)
    } finally {
      caoZuoZhong.value = false
    }
  }

  async function yiDongDangAn(recordId: string, targetCategoryId: string): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const source = dangQianFenLei.value
    const target = fenLeiLieBiao.value.find((item) => item.id === targetCategoryId)
    const record = dangAnLieBiao.value.find((item) => item.id === recordId)
    if (!source || !target || !record) {
      return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    if (source.id === target.id) {
      return shiBaoHuJieGuo('invalid', huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    caoZuoZhong.value = true
    yiDongZhongId.value = recordId
    qingCuoWu()
    try {
      const jieGuo = await yiDongDangAnDaoFenLei(source.id, recordId, target.id, source.version)
      dangAnLieBiao.value = dangAnLieBiao.value.filter((item) => item.id !== recordId)
      fenLeiLieBiao.value = fenLeiLieBiao.value.map((item) => {
        if (item.id === jieGuo.source_category_id) {
          return {
            ...item,
            version: jieGuo.source_version,
            record_count: Math.max(0, item.record_count - 1),
          }
        }
        if (item.id === jieGuo.category_id) {
          return {
            ...item,
            version: jieGuo.target_version,
            record_count: item.record_count + 1,
          }
        }
        return item
      })
      return shiChengGong()
    } catch (cuoWu) {
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const message = zhengChangHua.yingXiang
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        return shiBaoHuJieGuo('conflict', message)
      }
      return shiBaoHuJieGuo('failed', message)
    } finally {
      yiDongZhongId.value = null
      caoZuoZhong.value = false
    }
  }

  async function baoCunPaiXu(recordIds: string[]): Promise<ZhanJiCunKuanJieGuo> {
    if (caoZuoZhong.value) return shiBaoHuJieGuo('busy', huoQuFanYi('tongYong', 'caoZuoPinFan'))
    const category = dangQianFenLei.value
    const xianYouIds = dangAnLieBiao.value.map((item) => item.id)
    const tiJiaoZiDuan = paiXuZiDuanDengYu(recordIds)
    const tiJiaoWanZheng =
      tiJiaoZiDuan &&
      recordIds.length === xianYouIds.length &&
      recordIds.every((id) => xianYouIds.includes(id))
    if (!category || !tiJiaoWanZheng) {
      const message = huoQuFanYi('tongYong', 'canShuBuHeFa')
      cuoWuXinXi.value = message
      return shiBaoHuJieGuo('invalid', message)
    }
    caoZuoZhong.value = true
    paiXuZhong.value = true
    jiLuXianShiPaiXu.value = [...recordIds]
    qingCuoWu()
    try {
      const jieGuo = await paiXuFenLeiNeiZhanJi(category.id, recordIds, category.version)
      const fuWuIdMap = new Map(dangAnLieBiao.value.map((item) => [item.id, item]))
      const fuWuIds = jieGuo.record_ids
      const fuWuZiDuan = paiXuZiDuanDengYu(fuWuIds)
      const fuWuWanZheng =
        jieGuo.category_id === category.id &&
        fuWuZiDuan &&
        fuWuIds.length === recordIds.length &&
        fuWuIds.every((id) => fuWuIdMap.has(id))
      if (!fuWuWanZheng) {
        const message = huoQuFanYi('tongYong', 'canShuBuHeFa')
        cuoWuXinXi.value = message
        return shiBaoHuJieGuo('failed', message)
      }
      dangAnLieBiao.value = fuWuIds.map((id, index) => ({
        ...fuWuIdMap.get(id) as DangAnXiangQing,
        category_id: jieGuo.category_id,
        sort_order: index,
      }))
      fenLeiLieBiao.value = fenLeiLieBiao.value.map((item) =>
        item.id === jieGuo.category_id ? { ...item, version: jieGuo.version } : item,
      )
      jiLuXianShiPaiXu.value = null
      return shiChengGong()
    } catch (cuoWu) {
      const zhengChangHua = jiLuCuoWu(cuoWu)
      const message = zhengChangHua.yingXiang
      if (shiChongTu(cuoWu)) {
        await jiaZai()
        sheZhiQianTaiCuoWu(zhengChangHua, true)
        jiLuXianShiPaiXu.value = null
        return shiBaoHuJieGuo('conflict', message)
      }
      cuoWuXinXi.value = message
      jiLuXianShiPaiXu.value = null
      return shiBaoHuJieGuo('failed', message)
    } finally {
      paiXuZhong.value = false
      caoZuoZhong.value = false
    }
  }

  function qingKong(): void {
    shenFenFu += 1
    fenLeiLieBiao.value = []
    moRenFenLeiId.value = ''
    dangQianFenLeiId.value = ''
    dangAnLieBiao.value = []
    jiaZaiZhong.value = false
    jiLuJiaZaiZhong.value = false
    caoZuoZhong.value = false
    paiXuZhong.value = false
    yiDongZhongId.value = null
    qingCuoWu()
    jiLuXianShiPaiXu.value = null
  }

  return {
    fenLeiLieBiao,
    moRenFenLeiId,
    dangQianFenLeiId,
    dangQianFenLei,
    dangAnLieBiao,
    jiaZaiZhong,
    jiLuJiaZaiZhong,
    caoZuoZhong,
    paiXuZhong,
    yiDongZhongId,
    cuoWuXinXi,
    qianTaiCuoWu,
    jiLuXianShiPaiXu,
    jiaZai,
    qieHuanFenLei,
    chongXinJiaZai,
    chuangJian,
    gengMing,
    shanChu,
    yiDongDangAn,
    baoCunPaiXu,
    qingKong,
  }
})
