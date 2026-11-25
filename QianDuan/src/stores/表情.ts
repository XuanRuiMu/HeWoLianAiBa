import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  baoCunBiaoQingPaiXu,
  huoQuWoDeBiaoQing,
  shanChuBiaoQing as shanChuBiaoQingQingQiu,
  tianJiaBiaoQing,
  type BiaoQingXiang,
} from '@/api/表情'
import { huoQuFanYi } from '@/config/翻译表'

export const 使用表情仓库 = defineStore('表情', () => {
  const woDeBiaoQing = ref<BiaoQingXiang[]>([])
  const dangQianYongHuId = ref<string | null>(null)
  const jiaZaiZhong = ref(false)
  const tianJiaZhong = ref(false)
  const cuoWuXinXi = ref<string | null>(null)

  async function jiaZai(yongHuId: string, qiangZhi = false): Promise<void> {
    if (!yongHuId) return
    if (dangQianYongHuId.value !== yongHuId) {
      woDeBiaoQing.value = []
      dangQianYongHuId.value = null
    }
    if (!qiangZhi && dangQianYongHuId.value === yongHuId && !jiaZaiZhong.value) return
    jiaZaiZhong.value = true
    cuoWuXinXi.value = null
    try {
      const jieGuo = await huoQuWoDeBiaoQing()
      woDeBiaoQing.value = jieGuo.lie_biao
      dangQianYongHuId.value = yongHuId
    } catch {
      cuoWuXinXi.value = huoQuFanYi('duoMeiTi', 'biaoQingJiaZaiShiBai')
    } finally {
      jiaZaiZhong.value = false
    }
  }

  async function tianJia(
    wenJian: File | Blob,
    wenJianMing?: string,
  ): Promise<{ xiang: BiaoQingXiang; yiCunZai: boolean } | null> {
    tianJiaZhong.value = true
    cuoWuXinXi.value = null
    try {
      const { xiang, yiCunZai } = await tianJiaBiaoQing(wenJian, wenJianMing)
      if (!woDeBiaoQing.value.some((yi) => yi.id === xiang.id)) woDeBiaoQing.value.push(xiang)
      return { xiang, yiCunZai }
    } catch (cuoWu: unknown) {
      cuoWuXinXi.value = quCuoWuWenBen(cuoWu, huoQuFanYi('duoMeiTi', 'biaoQingTianJiaShiBai'))
      return null
    } finally {
      tianJiaZhong.value = false
    }
  }

  async function shanChu(id: string): Promise<boolean> {
    cuoWuXinXi.value = null
    try {
      await shanChuBiaoQingQingQiu(id)
      woDeBiaoQing.value = woDeBiaoQing.value.filter((xiang) => xiang.id !== id)
      return true
    } catch (cuoWu: unknown) {
      cuoWuXinXi.value = quCuoWuWenBen(cuoWu, huoQuFanYi('duoMeiTi', 'biaoQingShanChuShiBai'))
      return false
    }
  }

  async function yiDong(duanMing: 'qian' | 'hou', id: string): Promise<void> {
    const suoYin = woDeBiaoQing.value.findIndex((xiang) => xiang.id === id)
    if (suoYin === -1) return
    const muBiaoXiaBiao = duanMing === 'qian' ? suoYin - 1 : suoYin + 1
    const lieBiao = [...woDeBiaoQing.value]
    if (muBiaoXiaBiao < 0 || muBiaoXiaBiao >= lieBiao.length) return
    const liuDong = lieBiao[muBiaoXiaBiao]
    lieBiao[muBiaoXiaBiao] = lieBiao[suoYin]
    lieBiao[suoYin] = liuDong
    woDeBiaoQing.value = lieBiao
    cuoWuXinXi.value = null
    try {
      const jieGuo = await baoCunBiaoQingPaiXu(lieBiao.map((xiang) => xiang.id))
      woDeBiaoQing.value = jieGuo.lie_biao
    } catch (cuoWu: unknown) {
      const wenBen = quCuoWuWenBen(cuoWu, huoQuFanYi('duoMeiTi', 'biaoQingPaiXuShiBai'))
      await chongXinJiaZai()
      cuoWuXinXi.value = wenBen
    }
  }

  async function chongXinJiaZai(): Promise<void> {
    if (dangQianYongHuId.value) await jiaZai(dangQianYongHuId.value, true)
  }

  function qingKong(): void {
    woDeBiaoQing.value = []
    dangQianYongHuId.value = null
    jiaZaiZhong.value = false
    tianJiaZhong.value = false
    cuoWuXinXi.value = null
  }

  return {
    woDeBiaoQing,
    dangQianYongHuId,
    jiaZaiZhong,
    tianJiaZhong,
    cuoWuXinXi,
    jiaZai,
    tianJia,
    shanChu,
    yiDong,
    chongXinJiaZai,
    qingKong,
  }
})

function duQuKeXianShiWenBen(wenBen: unknown): string | null {
  if (typeof wenBen !== 'string') return null
  const jieGuo = wenBen.trim()
  if (jieGuo === '' || jieGuo.length > 200) return null
  if (!/[\u4e00-\u9fff]/.test(jieGuo)) return null
  if (/[A-Za-z]/.test(jieGuo)) return null
  return jieGuo
}

function quCuoWuWenBen(cuoWu: unknown, moRen: string): string {
  const cuoWuTi = cuoWu as { response?: { data?: { ti_shi?: unknown } } }
  return duQuKeXianShiWenBen(cuoWuTi?.response?.data?.ti_shi) ?? moRen
}
